import { describe, expect, it } from 'vitest';
import { ageTable, brackets, planValue, MissingRuleValueError } from '../../src/engine/config/read';
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
    const entries = new Map(cfg.entries);
    entries.set('planning.mixes', { ...entries.get('planning.mixes')!, value: null });
    expect(() => planValue({ ...cfg, entries }, 'planning.mixes')).toThrow(MissingRuleValueError);
  });
});

describe('brackets (stage 3 decision S1)', () => {
  it('a threshold never falls below the one before it', () => {
    const later = yearContext(33, cfg);
    const rows = brackets(later, 'ontario.tax.brackets');
    rows.forEach((r, i) => {
      if (i > 0) expect(r.from).toBeGreaterThanOrEqual(rows[i - 1]!.from);
    });
    // By then the indexed third threshold has passed the fixed fourth, whose band starts there.
    const raw = valueOf<{ from: number; indexed?: boolean }[]>(cfg, 'ontario.tax.brackets');
    const third = raw[2]!.from * later.deflator(33);
    expect(third).toBeGreaterThan(raw[3]!.from);
    expect(rows[3]!.from).toBeCloseTo(third, 6);
  });

  it('leaves an ordered table as it is', () => {
    const rows = brackets(ctx, 'ontario.tax.brackets');
    const raw = valueOf<{ from: number }[]>(cfg, 'ontario.tax.brackets');
    rows.forEach((r, i) => expect(r.from).toBeCloseTo(raw[i]!.from, 6));
  });
});
