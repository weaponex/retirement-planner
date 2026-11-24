import { describe, expect, it } from 'vitest';
import { ASSET_CLASSES } from '../../src/engine/config/keys';
import { classReturns, isOptimistic, planFee } from '../../src/engine/invest/returns';
import { couplePlan, planConfig, valueOf } from './helpers/couplePlan';

const cfg = planConfig();
const investing = couplePlan().investing;
const fees = valueOf<Record<string, number>>(cfg, 'planning.fee_levels');
const margin = valueOf<number>(cfg, 'planning.override_margin');

describe('classReturns (FR-M6)', () => {
  it('has one row per class with the fee subtracted and price = total - yield', () => {
    const r = classReturns(cfg, investing);
    expect(Object.keys(r).sort()).toEqual([...ASSET_CLASSES].sort());
    for (const c of ASSET_CLASSES) {
      const gross = valueOf<number>(cfg, `market.${c}.geometric_return`);
      expect(r[c].total).toBeCloseTo(gross - fees.index_etf!, 12);
      expect(r[c].yield).toBe(valueOf(cfg, `market.${c}.yield`));
      expect(r[c].price).toBeCloseTo(r[c].total - r[c].yield, 12);
    }
  });

  it('applies an override before the fee', () => {
    const r = classReturns(cfg, { ...investing, returnOverride: { bonds: 0.05 } });
    expect(r.bonds.total).toBeCloseTo(0.05 - fees.index_etf!, 12);
  });

  it('uses a custom fee', () => {
    expect(planFee(cfg, { ...investing, feeLevel: 'custom', customFee: 0.011 })).toBe(0.011);
    expect(planFee(cfg, { ...investing, feeLevel: 'advisor' })).toBe(fees.advisor);
  });

  it('income types follow the class', () => {
    const r = classReturns(cfg, investing);
    expect(r.cad_equity.incomeType).toBe('eligibleDividends');
    expect(r.em_equity.incomeType).toBe('foreignDividends');
    expect(r.cash.incomeType).toBe('interest');
  });
});

describe('optimistic-return limit', () => {
  const fp = valueOf<number>(cfg, 'market.us_equity.geometric_return');

  it('is FP Canada + the margin: +0.5 points is not optimistic, +0.51 is', () => {
    expect(isOptimistic(cfg, 'us_equity', fp + margin)).toBe(false);
    expect(isOptimistic(cfg, 'us_equity', fp + margin + 0.0001)).toBe(true);
  });
});
