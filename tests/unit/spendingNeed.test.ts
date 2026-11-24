import { describe, expect, it } from 'vitest';
import { MONTHS_PER_YEAR } from '../../src/engine/constants';
import { monthlyNeed, phaseIndex, spendingNeed } from '../../src/engine/project/spendingNeed';
import type { PlanInputs, PlanState } from '../../src/engine/types';
import { spouseState } from './helpers/accounts';
import { couplePlan, normalized, planConfig, yearContext } from './helpers/couplePlan';

const ctx = (t: number) => yearContext(t, planConfig());
const base = couplePlan();
const byCategory: PlanInputs = {
  ...base,
  spending: {
    mode: 'by_category',
    monthlyTotalToday: 0,
    categories: {
      groceries: { monthlyToday: 1_000 },
      auto_payment: { monthlyToday: 500, laterOverrideToday: [0, null] },
    },
    phases: [
      { fromYear: 10, keepPct: 90 },
      { fromYear: 20, keepPct: 80 },
    ],
  },
};
const state = (year: number, firstDeathYear?: number): PlanState => ({
  year,
  yearIndex: year - 2026,
  spouses: [spouseState(), spouseState()],
  accounts: [],
  splitShare: { from: 0, share: 0 },
  ...(firstDeathYear !== undefined && { firstDeathYear }),
});

describe('spending need', () => {
  const inputs = normalized(byCategory);

  it('phases count from the first retirement', () => {
    expect(phaseIndex(inputs, 2035)).toBe(0);
    expect(phaseIndex(inputs, 2036)).toBe(1);
    expect(phaseIndex(inputs, 2046)).toBe(2);
  });

  it('uses a category own later amount, else keepPct of its active amount', () => {
    expect(monthlyNeed(inputs, 0)).toBe(1_500);
    expect(monthlyNeed(inputs, 1)).toBeCloseTo(1_000 * 0.9 + 0, 9);
    expect(monthlyNeed(inputs, 2)).toBeCloseTo(1_000 * 0.8 + 500 * 0.8, 9);
  });

  it('is yearly, indexed, zero before retirement, and x survivor percentage after a death', () => {
    expect(spendingNeed(inputs, state(2026), ctx(0))).toBe(1_500 * MONTHS_PER_YEAR);
    expect(spendingNeed(inputs, state(2028), ctx(2))).toBeCloseTo(
      1_500 * MONTHS_PER_YEAR * ctx(2).deflator(2),
      6,
    );
    expect(spendingNeed(inputs, state(2030, 2029), ctx(4))).toBeCloseTo(
      1_500 * MONTHS_PER_YEAR * ctx(4).deflator(4) * 0.7,
      6,
    );
    const later = normalized({
      ...byCategory,
      spouses: [
        { ...base.spouses[0], retirementYear: 2030 },
        { ...base.spouses[1], retirementYear: 2031 },
      ],
    });
    expect(spendingNeed(later, state(2029), ctx(3))).toBe(0);
  });
});
