import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import { makeDeflator } from '../../src/engine/units';
import type { PlanInputs, Variant } from '../../src/engine/types';
import { couplePlan, normalized, planConfig } from './helpers/couplePlan';

const cfg = planConfig();
const variant: Variant = {
  id: 'user',
  strategyId: 'registered_last',
  presetId: 'bonds_sheltered_first',
};
const run = (plan: PlanInputs = couplePlan(), detail: 'full' | 'summary' = 'full') =>
  runPath(normalized(plan), cfg, ontario, variant, detail);

/** The per-run budget for about 22 runs in 1 second (SR1-M3): a log, not an assertion. */
const BUDGET_MS = 45;

describe('runPath', () => {
  it('logs the time of one 40-year couple run', () => {
    const base = couplePlan();
    const plan: PlanInputs = {
      ...base,
      spouses: [
        { ...base.spouses[0], lifeExpectancyTarget: 100 },
        { ...base.spouses[1], lifeExpectancyTarget: 103 },
      ],
    };
    run(plan); // warm up
    const t = performance.now();
    const r = run(plan);
    const ms = performance.now() - t;
    expect(r.rows.length).toBe(41);
    console.log(
      `runPath: ${r.rows.length}-year couple run took ${ms.toFixed(1)} ms` +
        (ms > BUDGET_MS ? ` (above the ${BUDGET_MS} ms budget per run)` : ''),
    );
  });

  it('spans the start year to the second death year', () => {
    const plan = couplePlan();
    const r = run(plan);
    const last = Math.max(...plan.spouses.map((s) => s.birthYear + s.lifeExpectancyTarget));
    expect(r.rows[0]!.year).toBe(plan.planStartYear);
    expect(r.rows.at(-1)!.year).toBe(last);
  });

  it('summary detail returns the same summary without rows', () => {
    const full = run();
    const summary = run(couplePlan(), 'summary');
    expect(summary.rows).toEqual([]);
    expect(summary.summary).toEqual(full.summary);
  });

  it('adds lifetime tax, final-return tax and probate in today dollars year by year (M5)', () => {
    const r = run();
    const deflator = makeDeflator(cfg);
    const yearTax = (row: (typeof r.rows)[number]) =>
      row.spouse[0].taxNom +
      row.spouse[1].taxNom +
      row.estate.finalReturnTaxNom +
      row.estate.probateNom;
    const nominal = r.rows.reduce((s, row) => s + yearTax(row), 0);
    const today = r.rows.reduce((s, row, i) => s + yearTax(row) / deflator(i), 0);
    expect(r.rows.at(-1)!.estate.finalReturnTaxNom).toBeGreaterThan(0);
    expect(r.summary.lifetimeTaxNom).toBeCloseTo(nominal, 6);
    expect(r.summary.lifetimeTaxToday).toBeCloseTo(today, 6);
    expect(r.summary.lifetimeTaxToday).toBeLessThan(r.summary.lifetimeTaxNom);
  });

  it('adds shortfalls in both units and reports the first shortfall year', () => {
    const plan = couplePlan({
      spending: { ...couplePlan().spending, monthlyTotalToday: 15_000 },
    });
    const r = run(plan);
    const deflator = makeDeflator(cfg);
    const short = r.rows.filter((row) => row.shortfallNom > 0.01);
    expect(r.summary.spendingCovered).toBe(false);
    expect(r.summary.firstShortfallYear).toBe(short[0]!.year);
    expect(r.summary.totalShortfallNom).toBeCloseTo(
      short.reduce((s, row) => s + row.shortfallNom, 0),
      6,
    );
    expect(r.summary.totalShortfallToday).toBeCloseTo(
      short.reduce((s, row) => s + row.shortfallNom / deflator(row.year - plan.planStartYear), 0),
      6,
    );
  });

  it('the legacy is after the final return and probate, from the last row', () => {
    const r = run();
    const last = r.rows.at(-1)!;
    const balances = Object.values(last.balancesEndNom).reduce((s, v) => s + v, 0);
    expect(r.summary.legacyIsPreTax).toBe(false);
    expect(r.summary.afterTaxLegacyNom).toBe(last.estate.afterTaxLegacyNom);
    expect(r.summary.afterTaxLegacyNom).toBeCloseTo(
      balances + last.estate.homeNom - last.estate.finalReturnTaxNom - last.estate.probateNom,
      6,
    );
    // Only the second death year has estate fields.
    expect(r.rows.slice(0, -1).every((row) => row.estate.afterTaxLegacyNom === 0)).toBe(true);
  });
});
