import { describe, expect, it } from 'vitest';
import { splitEligible } from '../../src/engine/solver/incomeAssembly';
import { noFixedIncome } from '../../src/engine/solver/incomeAssembly';
import {
  bestSplit,
  householdTax,
  splitChoices,
  type SplitSpouse,
} from '../../src/engine/tax/split';
import { personalTax } from '../../src/engine/tax/personalTax';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { planConfig, valueOf, yearContext, zeroIncome } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const maxShare = valueOf<number>(cfg, 'federal.split.max_share');
const splitAge = valueOf<number>(cfg, 'federal.split.min_age_rrif');

const spouse = (pension: number, age = 70, extra: Partial<SplitSpouse> = {}): SplitSpouse => ({
  income: { ...zeroIncome(), pensionEligible: pension },
  age,
  eligible: pension,
  excluded: false,
  ...extra,
});

describe('eligibility', () => {
  const types = new Map([
    ['rrif-0-1', 'rrif'],
    ['rrsp-0-1', 'rrsp'],
  ]);
  const draws = [
    {
      accountId: 'rrif-0-1',
      amountNom: 10_000,
      incomeType: 'otherOrdinary' as const,
      realizedGainNom: 0,
    },
    {
      accountId: 'rrsp-0-1',
      amountNom: 5_000,
      incomeType: 'otherOrdinary' as const,
      realizedGainNom: 0,
    },
  ];

  it('no RRIF splitting under the split age; DB at any age', () => {
    const fixed = { ...noFixedIncome(), db: 20_000 };
    expect(splitEligible(fixed, draws, types, splitAge - 1, splitAge)).toBe(20_000);
    expect(splitEligible(fixed, draws, types, splitAge, splitAge)).toBe(30_000);
  });
});

describe('bestSplit', () => {
  it('searches 2 x (max / step) + 1 points', () => {
    expect(splitChoices(ctx)).toHaveLength(2 * Math.round(maxShare / 0.05) + 1);
  });

  it('moves income from the higher to the lower earner, in both directions', () => {
    const rich = spouse(120_000);
    const poor = spouse(0);
    const a = bestSplit(rich, poor, ctx);
    expect(a.from).toBe(0);
    expect(a.share).toBeCloseTo(maxShare, 12);
    const b = bestSplit(poor, rich, ctx);
    expect(b.from).toBe(1);
    expect(b.share).toBeCloseTo(maxShare, 12);
  });

  it('a hand-checked pair: the split household tax equals the two returns after the move', () => {
    const a = spouse(100_000);
    const b = spouse(10_000);
    const best = bestSplit(a, b, ctx);
    const moved = best.share * 100_000;
    const expected =
      personalTax({ ...zeroIncome(), pensionEligible: 100_000 - moved }, 70, ontario, ctx).total +
      personalTax({ ...zeroIncome(), pensionEligible: 10_000 + moved }, 70, ontario, ctx).total;
    expect(best.householdTax).toBeCloseTo(expected, 6);
    const none = householdTax(a, b, { from: 0, share: 0 }, ctx);
    expect(best.householdTax).toBeLessThan(none[0].total + none[1].total);
  });

  it('ties go to the smaller transfer, then spouse 1 transferring', () => {
    // Low equal incomes: every split gives the same (zero) tax.
    const same = bestSplit(spouse(10_000), spouse(10_000), ctx);
    expect(same.householdTax).toBe(0);
    expect(same.share).toBe(0);
    expect(same.from).toBe(0);
  });

  it('leaves out a working or dead spouse', () => {
    const working = bestSplit(spouse(120_000), spouse(0, 70, { excluded: true }), ctx);
    expect(working.share).toBe(0);
  });
});
