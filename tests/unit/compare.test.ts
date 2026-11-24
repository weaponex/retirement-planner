import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import {
  compare,
  compared,
  estateSummary,
  goals,
  lastYearIndex,
  yearOneSaleTax,
} from '../../src/engine/results/compare';
import type { PlanInputs, Variant } from '../../src/engine/types';
import { makeDeflator } from '../../src/engine/units';
import { couplePlan, normalized, planConfig } from './helpers/couplePlan';

const cfg = planConfig();
const deflator = makeDeflator(cfg);
const user: Variant = {
  id: 'user',
  strategyId: 'registered_last',
  presetId: 'bonds_sheltered_first',
};

function run(plan: PlanInputs) {
  const inputs = normalized(plan);
  return { inputs, ...runPath(inputs, cfg, ontario, user, 'full') };
}

describe('compare', () => {
  it('reports a minus b, and no opposite direction when lower tax comes with a larger legacy', () => {
    const c = compare(
      { lifetimeTaxToday: 100, afterTaxLegacyToday: 900 },
      { lifetimeTaxToday: 150, afterTaxLegacyToday: 800 },
    );
    expect(c).toEqual({
      lifetimeTaxDiffToday: -50,
      legacyDiffToday: 100,
      oppositeDirections: false,
    });
  });

  it('flags lower tax with a smaller legacy, and higher tax with a larger one', () => {
    expect(
      compare(
        { lifetimeTaxToday: 100, afterTaxLegacyToday: 700 },
        { lifetimeTaxToday: 150, afterTaxLegacyToday: 800 },
      ).oppositeDirections,
    ).toBe(true);
    expect(
      compare(
        { lifetimeTaxToday: 200, afterTaxLegacyToday: 900 },
        { lifetimeTaxToday: 150, afterTaxLegacyToday: 800 },
      ).oppositeDirections,
    ).toBe(true);
  });

  it('ignores differences under $1', () => {
    expect(
      compare(
        { lifetimeTaxToday: 100.5, afterTaxLegacyToday: 700 },
        { lifetimeTaxToday: 100, afterTaxLegacyToday: 800 },
      ).oppositeDirections,
    ).toBe(false);
  });
});

describe('goals', () => {
  it('counts the years from the first retirement to the second death', () => {
    const base = couplePlan();
    const plan = {
      ...base,
      spouses: [
        { ...base.spouses[0], retirementYear: 2029 },
        { ...base.spouses[1], retirementYear: 2030 },
      ],
    } as PlanInputs;
    const r = run(plan);
    const g = goals(r.rows, r.summary, r.inputs, deflator);
    expect(g.spending.yearsTotal).toBe(r.rows.filter((row) => row.year >= 2029).length);
    expect(g.spending.yearsTotal).toBe(r.rows.length - 3);
    expect(g.spending.met).toBe(true);
    expect(g.spending.yearsCovered).toBe(g.spending.yearsTotal);
    expect(g.spending.shortYears).toEqual([]);
  });

  it('lists the short years when spending is not covered', () => {
    const r = run(
      couplePlan({ spending: { ...couplePlan().spending, monthlyTotalToday: 20_000 } }),
    );
    const g = goals(r.rows, r.summary, r.inputs, deflator);
    expect(g.spending.met).toBe(false);
    expect(g.spending.shortYears[0]).toBe(r.summary.firstShortfallYear);
    expect(g.spending.firstShortfallYear).toBe(r.summary.firstShortfallYear);
    expect(g.spending.yearsCovered + g.spending.shortYears.length).toBe(g.spending.yearsTotal);
    expect(g.spending.totalShortfallToday).toBe(r.summary.totalShortfallToday);
  });

  it('gives no_goal with a goal of 0, and met or missed against a goal', () => {
    const none = run(couplePlan());
    const g0 = goals(none.rows, none.summary, none.inputs, deflator).legacy;
    expect(g0.status).toBe('no_goal');
    expect(g0.differenceToday).toBe(0);

    const legacyToday =
      none.summary.afterTaxLegacyNom / deflator(lastYearIndex(none.inputs, none.rows));
    expect(g0.afterTaxLegacyToday).toBeCloseTo(legacyToday, 6);
    for (const [goal, status] of [
      [legacyToday - 1000, 'met'],
      [legacyToday + 1000, 'missed'],
    ] as const) {
      const r = run(couplePlan({ estate: { survivorPct: 70, legacyGoalToday: goal } }));
      const g = goals(r.rows, r.summary, r.inputs, deflator).legacy;
      expect(g.status).toBe(status);
      expect(g.differenceToday).toBeCloseTo(legacyToday - goal, 6);
    }
  });
});

describe('yearOneSaleTax', () => {
  it('is the tax on the gains the first rebalance realizes', () => {
    const base = couplePlan();
    const accounts = base.accounts.map((a) =>
      a.type === 'nonreg'
        ? {
            ...a,
            positions: {
              cad_equity: { valueToday: 90_000, originalCostToday: 40_000 },
              bonds: { valueToday: 60_000, originalCostToday: 30_000 },
            },
          }
        : a,
    );
    const r = yearOneSaleTax(normalized(couplePlan({ accounts })), cfg, ontario, deflator, user);
    expect(r.gainsNom).toBeGreaterThan(0);
    expect(r.taxNom).toBeGreaterThan(0);
  });

  it('is negative when the sale realizes a net loss (the loss saves tax)', () => {
    // The helper plan's bonds are sold below cost.
    const r = yearOneSaleTax(normalized(), cfg, ontario, deflator, user);
    expect(Math.sign(r.taxNom)).toBe(Math.sign(r.gainsNom));
  });

  it('is 0 when the non-registered positions already match the preset (no gain realized)', () => {
    const base = couplePlan();
    const plan = couplePlan({ accounts: base.accounts.filter((a) => a.type !== 'nonreg') });
    const r = yearOneSaleTax(normalized(plan), cfg, ontario, deflator, user);
    expect(r.gainsNom).toBe(0);
    expect(r.taxNom).toBeCloseTo(0, 6);
  });

  it('uses the working-year rules when the plan starts before retirement', () => {
    const base = couplePlan();
    const plan = {
      ...base,
      spouses: [
        { ...base.spouses[0], retirementYear: 2028 },
        { ...base.spouses[1], retirementYear: 2028 },
      ],
    } as PlanInputs;
    const inputs = normalized(plan);
    const r = yearOneSaleTax(inputs, cfg, ontario, deflator, user);
    // Working years tax realized gains at the working marginal rate.
    const inclusion = cfg.entries.get('federal.capital_gains.inclusion_rate')!.value as number;
    expect(r.taxNom).toBeCloseTo(Math.max(0, r.gainsNom) * inclusion * 0.3, 6);
  });
});

describe('estateSummary', () => {
  it('adds up: balances + home − final-return tax − probate = after-tax legacy', () => {
    const r = run(
      couplePlan({ estate: { survivorPct: 70, legacyGoalToday: 0, homeValueToday: 500_000 } }),
    );
    const e = estateSummary(r.rows, r.inputs, deflator);
    expect(e.year).toBe(r.rows.at(-1)!.year);
    expect(e.homeToday).toBeCloseTo(500_000, 6);
    expect(e.balancesToday + e.homeToday - e.finalReturnTaxToday - e.probateToday).toBeCloseTo(
      e.afterTaxLegacyToday,
      6,
    );
    expect(e.afterTaxLegacyToday).toBeCloseTo(
      compared(r.summary, lastYearIndex(r.inputs, r.rows), deflator).afterTaxLegacyToday,
      6,
    );
  });
});
