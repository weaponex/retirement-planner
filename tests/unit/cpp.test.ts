import { describe, expect, it } from 'vitest';
import { cppAdjustment, cppAt, yearShare } from '../../src/engine/benefits/cpp';
import { MONTHS_PER_YEAR } from '../../src/engine/constants';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const early = valueOf<number>(cfg, 'federal.cpp.adjust.early_per_month');
const late = valueOf<number>(cfg, 'federal.cpp.adjust.late_per_month');
const ctx = yearContext(0, cfg);

describe('CPP start age', () => {
  it('reduces per month before 65 and raises per month after', () => {
    expect(cppAdjustment(60, ctx)).toBeCloseTo(1 - 60 * early, 12);
    expect(cppAdjustment(65, ctx)).toBe(1);
    expect(cppAdjustment(70, ctx)).toBeCloseTo(1 + 60 * late, 12);
  });

  it('pays the full year after the start year', () => {
    expect(cppAt(1000, 60, 62, 6, ctx)).toBeCloseTo(1000 * MONTHS_PER_YEAR * (1 - 60 * early), 6);
    expect(cppAt(1000, 70, 69, 6, ctx)).toBe(0);
  });
});

describe('first-year pro-rating', () => {
  it('pays the months after the birthday month', () => {
    expect(yearShare(65, 65, 9)).toBeCloseTo(3 / 12, 12);
    expect(yearShare(65, 65, 12)).toBe(0);
    expect(yearShare(65, 64, 1)).toBe(0);
    expect(cppAt(1000, 65, 65, 9, ctx)).toBeCloseTo(1000 * 3, 6);
  });

  it('grows with the deflator in later years', () => {
    const later = yearContext(5, cfg);
    expect(cppAt(1000, 65, 70, 9, later)).toBeCloseTo(
      1000 * MONTHS_PER_YEAR * later.deflator(5),
      6,
    );
  });
});
