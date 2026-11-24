import { describe, expect, it } from 'vitest';
import { survivorBenefits } from '../../src/engine/benefits/survivor';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const pct65 = valueOf<number>(cfg, 'federal.cpp.survivor.pct_65_plus');
const flat = valueOf<number>(cfg, 'federal.cpp.survivor.flat_under_65');
const pctUnder = valueOf<number>(cfg, 'federal.cpp.survivor.pct_under_65');
const maxCombined = valueOf<number>(cfg, 'federal.cpp.survivor.max_combined');

const deceased = (cpp: number) => ({ deceasedCppFullYear: cpp, deceasedDb: [] });

describe('CPP survivor benefit', () => {
  it('pays a percentage to a survivor 65 or older', () => {
    expect(survivorBenefits(deceased(10_000), { age: 70, ownCpp: 0 }, ctx).cpp).toBeCloseTo(
      pct65 * 10_000,
      6,
    );
  });

  it('pays a flat amount plus a percentage under 65', () => {
    expect(survivorBenefits(deceased(10_000), { age: 60, ownCpp: 0 }, ctx).cpp).toBeCloseTo(
      flat + pctUnder * 10_000,
      6,
    );
  });

  it('caps own plus survivor CPP at the combined maximum, in both age bands', () => {
    const own = maxCombined - 1_000;
    expect(survivorBenefits(deceased(15_000), { age: 70, ownCpp: own }, ctx).cpp).toBeCloseTo(
      1_000,
      6,
    );
    expect(survivorBenefits(deceased(15_000), { age: 60, ownCpp: own }, ctx).cpp).toBeCloseTo(
      1_000,
      6,
    );
    expect(survivorBenefits(deceased(15_000), { age: 70, ownCpp: maxCombined }, ctx).cpp).toBe(0);
  });
});

describe('DB survivor share', () => {
  it('pays each pension survivor percentage of the lifetime amount', () => {
    const b = survivorBenefits(
      { deceasedCppFullYear: 0, deceasedDb: [{ lifetimeFullYear: 20_000, survivorPct: 60 }] },
      { age: 70, ownCpp: 0 },
      ctx,
    );
    expect(b.db).toBeCloseTo(12_000, 6);
    expect(b.cpp).toBe(0);
  });
});
