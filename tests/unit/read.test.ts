import { describe, expect, it } from 'vitest';
import { ageTable, planValue, MissingRuleValueError } from '../../src/engine/config/read';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const minFactor = valueOf<Record<string, number>>(cfg, 'federal.rrif.min_factor');
const ages = Object.keys(minFactor).map(Number);
const first = Math.min(...ages);
const last = Math.max(...ages);

describe('ageTable', () => {
  it('reads the row for an age in the table', () => {
    expect(ageTable(ctx, 'federal.rrif.min_factor', first + 1)).toBe(minFactor[first + 1]);
  });

  it('uses the last row above the last age', () => {
    expect(ageTable(ctx, 'federal.rrif.min_factor', last + 7)).toBe(minFactor[last]);
  });

  it('returns undefined below the first row', () => {
    expect(ageTable(ctx, 'federal.rrif.min_factor', first - 1)).toBeUndefined();
  });

  it('uses the row at or below an age between rows', () => {
    const table = valueOf<Record<string, number>>(cfg, 'planning.life_expectancy.female');
    expect(ageTable(ctx, 'planning.life_expectancy.female', 63)).toBe(table['60']);
  });

  it('is never indexed', () => {
    const later = yearContext(10, cfg);
    expect(ageTable(later, 'federal.rrif.min_factor', first)).toBe(minFactor[first]);
  });
});

describe('planValue', () => {
  it('reads an unindexed plan value', () => {
    expect(planValue(cfg, 'market.inflation')).toBe(valueOf(cfg, 'market.inflation'));
  });

  it('throws for a key with no value yet', () => {
    expect(() => planValue(cfg, 'ontario.probate.rate')).toThrow(MissingRuleValueError);
  });
});
