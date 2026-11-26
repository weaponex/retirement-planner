// The engine changes from the author's stage 5 review (AR-H2, AR-H4, AR-H5,
// AR-S2, AR-S3, AR-P1): gross pay, the CPP estimate at its start age, the year
// of arrival, each account's own mix and group spending amounts.
import { describe, expect, it } from 'vitest';
import { ASSET_CLASSES } from '../../src/engine/config/keys';
import { loadConfig } from '../../src/engine/config/load';
import { planValue } from '../../src/engine/config/read';
import {
  cppAt65FromStart,
  cppAtStartFrom65,
  residenceYears,
} from '../../src/engine/benefits/residence';
import { runPlan } from '../../src/engine/index';
import { targetHoldings } from '../../src/engine/invest/placement';
import { holdingsAt, type Weights } from '../../src/engine/invest/rebalance';
import { monthlyNeed } from '../../src/engine/project/spendingNeed';
import { payFromGross, payroll } from '../../src/engine/tax/payroll';
import type { AccountState, PlanInputs } from '../../src/engine/types';
import { normalizeInputs } from '../../src/engine/units';
import { couplePlan } from './helpers/couplePlan';

const cfg = loadConfig();

/** A copy without the given keys. */
function without<T extends object, K extends keyof T>(o: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...o };
  for (const k of keys) delete copy[k];
  return copy;
}
const v = (k: string) => planValue(cfg, k);
const options = { revision: 1, appVersion: 't', today: new Date(2026, 10, 24) };

describe('payroll and pay from gross (AR-H5)', () => {
  it('takes CPP above the exemption up to the YMPE, CPP2 up to its ceiling, and EI up to its maximum', () => {
    const low = payroll(50_000, cfg);
    expect(low.cpp).toBeCloseTo(
      (50_000 - v('federal.payroll.cpp.basic_exemption')) * v('federal.payroll.cpp.rate'),
    );
    expect(low.cpp2).toBe(0);
    expect(low.ei).toBeCloseTo(50_000 * v('federal.payroll.ei.rate'));
    const high = payroll(200_000, cfg);
    const ympe = v('federal.payroll.cpp.ympe');
    expect(high.cpp).toBeCloseTo(
      (ympe - v('federal.payroll.cpp.basic_exemption')) * v('federal.payroll.cpp.rate'),
    );
    expect(high.cpp2).toBeCloseTo(
      (v('federal.payroll.cpp2.ceiling') - ympe) * v('federal.payroll.cpp2.rate'),
    );
    expect(high.ei).toBeCloseTo(
      v('federal.payroll.ei.max_insurable') * v('federal.payroll.ei.rate'),
    );
    expect(high.enhancedDeduction + high.creditAmount).toBeCloseTo(high.cpp + high.cpp2 + high.ei);
    expect(payroll(0, cfg)).toMatchObject({ cpp: 0, cpp2: 0, ei: 0 });
  });

  it('gives the combined marginal rate on the next dollar and take-home pay', () => {
    const fedLow = (cfg.entries.get('federal.tax.brackets')!.value as { rate: number }[])[0]!.rate;
    const onLow = (cfg.entries.get('ontario.tax.brackets')!.value as { rate: number }[])[0]!.rate;
    // In the lowest brackets, the next dollar is taxed at the two lowest rates.
    expect(payFromGross(30_000, cfg).marginalRate).toBeCloseTo(fedLow + onLow, 3);
    const mid = payFromGross(100_000, cfg);
    const high = payFromGross(300_000, cfg);
    expect(high.marginalRate).toBeGreaterThan(mid.marginalRate);
    expect(mid.afterTax).toBeLessThan(100_000);
    expect(mid.afterTax).toBeGreaterThan(60_000);
    expect(payFromGross(0, cfg)).toEqual({ marginalRate: expect.any(Number), afterTax: 0 });
  });

  it('replaces the rate and take-home pay in the plan when gross pay is given', () => {
    const p = couplePlan();
    const rest = without(p.spouses[0], 'workingMarginalRate', 'afterTaxPayToday');
    const plan: PlanInputs = { ...p, spouses: [{ ...rest, grossPayToday: 100_000 }, p.spouses[1]] };
    const n = normalizeInputs(plan, cfg).spouses[0];
    const expected = payFromGross(100_000, cfg);
    expect(n.workingMarginalRate).toBeCloseTo(expected.marginalRate);
    expect(n.afterTaxPayNom).toBeCloseTo(expected.afterTax);
    const bare = without(p.spouses[1], 'workingMarginalRate', 'afterTaxPayToday');
    const none = normalizeInputs({ ...p, spouses: [p.spouses[0], bare] }, cfg).spouses[1];
    expect(none).toMatchObject({ workingMarginalRate: 0, afterTaxPayNom: 0 });
  });
});

describe('CPP at its start age and the year of arrival (AR-H2, AR-H4)', () => {
  it('converts an estimate at the start age back to 65 and forward again', () => {
    const at65 = cppAt65FromStart(1200, 70, cfg);
    expect(at65).toBeLessThan(1200);
    expect(cppAtStartFrom65(at65, 70, cfg)).toBeCloseTo(1200);
    expect(cppAt65FromStart(1000, 65, cfg)).toBeCloseTo(1000);
    const p = couplePlan();
    const rest = without(p.spouses[0], 'cppAt65Today');
    const plan: PlanInputs = {
      ...p,
      spouses: [{ ...rest, cppAtStartToday: 1200, cppStartAge: 70 }, p.spouses[1]],
    };
    expect(normalizeInputs(plan, cfg).spouses[0].cppAt65Nom).toBeCloseTo(at65);
    const none = without(p.spouses[1], 'cppAt65Today');
    expect(
      normalizeInputs({ ...p, spouses: [p.spouses[0], none] }, cfg).spouses[1].cppAt65Nom,
    ).toBe(0);
  });

  it('counts residence from the later of 18 and arrival, capped at the full years', () => {
    const full = v('federal.oas.residence.full_years');
    expect(residenceYears(1961, undefined, cfg)).toBe(full);
    expect(residenceYears(1961, 1990, cfg)).toBe(65 - 29);
    expect(residenceYears(1961, 2030, cfg)).toBe(0);
    const p = couplePlan();
    const rest = without(p.spouses[0], 'yearsInCanadaAt65');
    const plan: PlanInputs = {
      ...p,
      spouses: [{ ...rest, arrivedInCanadaYear: p.spouses[0].birthYear + 40 }, p.spouses[1]],
    };
    expect(normalizeInputs(plan, cfg).spouses[0].yearsInCanadaAt65).toBe(25);
  });
});

describe('each account its own mix (AR-S3)', () => {
  const allBonds = Object.fromEntries(ASSET_CLASSES.map((c) => [c, c === 'bonds' ? 100 : 0]));
  const allCad = Object.fromEntries(ASSET_CLASSES.map((c) => [c, c === 'cad_equity' ? 100 : 0]));

  it('targets each account at its own mix', () => {
    const w = (c: string) =>
      Object.fromEntries(ASSET_CLASSES.map((k) => [k, k === c ? 1 : 0])) as Weights;
    const half = Object.fromEntries(ASSET_CLASSES.map((k) => [k, 1 / 6])) as Weights;
    const accounts: AccountState[] = [
      {
        id: 'rrsp-0-1',
        owner: 0,
        type: 'rrsp',
        holdings: holdingsAt(100, half),
        mix: allBonds as never,
      },
      { id: 'tfsa-0-1', owner: 0, type: 'tfsa', holdings: holdingsAt(50, half) },
    ];
    const t = targetHoldings(accounts, w('cash'), 'own_mix', cfg, (a) =>
      a.mix ? w('bonds') : w('cash'),
    );
    expect(t['rrsp-0-1']!.bonds).toBeCloseTo(100);
    expect(t['tfsa-0-1']!.cash).toBeCloseTo(50);
  });

  it('runs a plan whose accounts hold their own mixes, with no placement baseline run', () => {
    const p = couplePlan();
    const accounts = p.accounts.map((a, i) => ({
      ...a,
      mixId: 'custom' as const,
      mix: (i % 2 === 0 ? allBonds : allCad) as PlanInputs['investing']['mix'],
    }));
    const plan: PlanInputs = {
      ...p,
      accounts,
      investing: { ...p.investing, presetId: 'own_mix', shapeId: 'steady' },
    };
    const r = runPlan(plan, options);
    expect(r.placement.baseline).toEqual(r.plan.summary);
    expect(r.placement.vsBaseline.legacyDiffToday).toBe(0);
    const other = runPlan({ ...plan, accounts: p.accounts }, options);
    expect(other.plan.summary).not.toEqual(r.plan.summary);
  });

  it('holds a non-registered balance at its original cost in its mix', () => {
    const p = couplePlan();
    const plan: PlanInputs = {
      ...p,
      accounts: [
        ...p.accounts.filter((a) => a.type !== 'nonreg'),
        {
          id: 'nonreg-0-1',
          owner: 0,
          type: 'nonreg',
          balanceToday: 100_000,
          annualContributionToday: 0,
          originalCostToday: 40_000,
          mixId: 'custom',
          mix: allCad as PlanInputs['investing']['mix'],
        },
      ],
      investing: { ...p.investing, presetId: 'own_mix' },
    };
    expect(normalizeInputs(plan, cfg).accounts.at(-1)!.originalCostNom).toBe(40_000);
    expect(() => runPlan(plan, options)).not.toThrow();
  });
});

describe('group spending amounts (AR-P1)', () => {
  it('adds a group amount to the categories and keeps the phase share', () => {
    const p = couplePlan();
    const plan: PlanInputs = {
      ...p,
      spending: {
        ...p.spending,
        mode: 'by_category',
        categories: {},
        groupsMonthlyToday: { home: 2000 },
      },
    };
    const n = normalizeInputs(plan, cfg);
    expect(monthlyNeed(n, 0)).toBe(2000);
    expect(monthlyNeed(n, 1)).toBeCloseTo((2000 * plan.spending.phases[0].keepPct) / 100);
  });
});
