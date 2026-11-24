import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/project/initialState';
import { solveYear, UnsupportedStrategyError } from '../../src/engine/solver/yearSolve';
import type { PlanInputs, Variant } from '../../src/engine/types';
import { couplePlan, normalized, planConfig, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const variant: Variant = {
  id: 'test',
  strategyId: 'registered_last',
  presetId: 'bonds_sheltered_first',
};

function firstYear(plan: PlanInputs, v: Variant = variant) {
  const inputs = normalized(plan);
  return solveYear(initialState(inputs, ctx, v), inputs, ctx, v);
}

const spending = (monthly: number) =>
  couplePlan({ spending: { ...couplePlan().spending, monthlyTotalToday: monthly } });

describe('solveYear', () => {
  it('converges for spending of $0, $60,000 and $200,000 a year', () => {
    for (const yearly of [0, 60_000, 200_000]) {
      const { row } = firstYear(spending(yearly / 12));
      expect(row.spendNeedNom).toBeCloseTo(yearly, 6);
      expect(row.shortfallNom).toBe(0);
      expect(row.afterTaxCashNom).toBeGreaterThanOrEqual(yearly - 0.05);
      // Within the solver's precision: no more than a cent of extra withdrawal.
      if (yearly > 0) expect(row.surplusNom).toBeLessThan(0.05);
    }
  });

  it('records a shortfall when everything available is not enough', () => {
    const { row } = firstYear(spending(500_000));
    expect(row.shortfallNom).toBeGreaterThan(0);
    expect(row.afterTaxCashNom + row.shortfallNom).toBeCloseTo(row.spendNeedNom, 6);
  });

  it('a spouse still working counts after-tax pay and is taxed at their rate (C2)', () => {
    const base = couplePlan();
    const plan: PlanInputs = {
      ...base,
      spouses: [
        base.spouses[0],
        {
          ...base.spouses[1],
          retirementYear: 2028,
          afterTaxPayToday: 30_000,
          workingMarginalRate: 0.4,
        },
      ],
    };
    const { row } = firstYear(plan);
    expect(row.spouse[1].payNom).toBeCloseTo(30_000, 6);
    expect(row.spouse[1].splitShare).toBe(0);
    expect(row.spouse[0].splitShare).toBe(0);
    // Spouse 2's taxable income (their non-registered share is nil here) is taxed at 40%.
    expect(row.spouse[1].taxNom).toBeCloseTo(row.spouse[1].taxableIncomeNom * 0.4, 6);
  });

  it('runs the two-pass split and carries the chosen split to next year', () => {
    const base = couplePlan();
    const plan: PlanInputs = {
      ...base,
      dbPensions: [
        { owner: 0, lifetimeAnnualToday: 80_000, startAge: 60, indexing: 'full', survivorPct: 60 },
      ],
    };
    const inputs = normalized(plan);
    const start = {
      ...initialState(inputs, ctx, variant),
      splitShare: { from: 1 as const, share: 0 },
    };
    const { nextState, row } = solveYear(start, inputs, ctx, variant);
    // A large DB pension for spouse 1: the search moves income to spouse 2.
    expect(nextState.splitShare.from).toBe(0);
    expect(nextState.splitShare.share).toBeGreaterThan(0);
    expect(row.spouse[0].splitShare).toBe(nextState.splitShare.share);
  });

  it('rejects planner_pick until stage 4', () => {
    expect(() => firstYear(couplePlan(), { ...variant, strategyId: 'planner_pick' })).toThrow(
      UnsupportedStrategyError,
    );
  });
});
