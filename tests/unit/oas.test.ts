import { describe, expect, it } from 'vitest';
import { oasAt, oasFullYear } from '../../src/engine/benefits/oas';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const base = valueOf<number>(cfg, 'federal.oas.base_at_65');
const minYears = valueOf<number>(cfg, 'federal.oas.residence.min_years');
const fullYears = valueOf<number>(cfg, 'federal.oas.residence.full_years');
const perMonth = valueOf<number>(cfg, 'federal.oas.deferral.per_month');
const maxMonths = valueOf<number>(cfg, 'federal.oas.deferral.max_months');
const increaseAge = valueOf<number>(cfg, 'federal.oas.increase_age');
const increase = valueOf<number>(cfg, 'federal.oas.increase_rate');

describe('OAS residence', () => {
  it('pays nothing below the minimum years', () => {
    expect(oasFullYear(minYears - 1, 65, ctx)).toBe(0);
  });

  it('pays in proportion to years up to the full years', () => {
    expect(oasFullYear(20, 65, ctx)).toBeCloseTo((base * 20) / fullYears, 6);
    expect(oasFullYear(fullYears + 5, 65, ctx)).toBeCloseTo(base, 6);
  });
});

describe('OAS deferral', () => {
  it('adds per month deferred, capped', () => {
    expect(oasFullYear(fullYears, 70, ctx)).toBeCloseTo(base * (1 + perMonth * 60), 6);
    expect(oasFullYear(fullYears, 75, ctx)).toBeCloseTo(base * (1 + perMonth * maxMonths), 6);
  });
});

describe('OAS by year', () => {
  it('pro-rates the first year by birth month', () => {
    expect(oasAt(fullYears, 65, 65, 3, ctx)).toBeCloseTo((base * 9) / 12, 6);
    expect(oasAt(fullYears, 65, 64, 3, ctx)).toBe(0);
  });

  it('adds the increase from the increase age, pro-rated in its first year', () => {
    expect(oasAt(fullYears, 65, increaseAge + 1, 3, ctx)).toBeCloseTo(base * (1 + increase), 6);
    expect(oasAt(fullYears, 65, increaseAge, 3, ctx)).toBeCloseTo(
      base * (1 + (increase * 9) / 12),
      6,
    );
  });

  it('is indexed', () => {
    const later = yearContext(4, cfg);
    expect(oasAt(fullYears, 65, 70, 3, later)).toBeCloseTo(base * later.deflator(4), 6);
  });
});
