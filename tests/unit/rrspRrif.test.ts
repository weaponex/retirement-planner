import { describe, expect, it } from 'vitest';
import { convertRrsp, minFactor, rrifMinimum } from '../../src/engine/accounts/rrspRrif';
import { account } from './helpers/accounts';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const table = valueOf<Record<string, number>>(cfg, 'federal.rrif.min_factor');
const baseAge = valueOf<number>(cfg, 'federal.rrif.min_factor_base_age');
const latest = valueOf<number>(cfg, 'federal.rrif.latest_conversion_age');
const lastAge = Math.max(...Object.keys(table).map(Number));

describe('minFactor', () => {
  it('uses the config table', () => {
    expect(minFactor(75, ctx)).toBe(table['75']);
  });

  it('uses 1 / (base age - age) at 60 and 70 (FR-M4)', () => {
    expect(minFactor(60, ctx)).toBeCloseTo(1 / (baseAge - 60), 12);
    expect(minFactor(70, ctx)).toBeCloseTo(1 / (baseAge - 70), 12);
  });

  it('uses the last row above the table', () => {
    expect(minFactor(lastAge + 4, ctx)).toBe(table[String(lastAge)]);
  });
});

describe('RRSP conversion and the RRIF minimum', () => {
  const rrsp = account('rrsp-0-1', 'rrsp', 0, { bonds: 100_000 }, {}, { conversionAge: 68 });

  it('converts in the year the owner reaches the chosen age', () => {
    expect(convertRrsp(rrsp, 67, 2030, ctx).type).toBe('rrsp');
    const rrif = convertRrsp(rrsp, 68, 2031, ctx);
    expect(rrif.type).toBe('rrif');
    expect(rrif.openedYear).toBe(2031);
  });

  it('converts no later than the latest conversion age', () => {
    const late = { ...rrsp, conversionAge: latest + 3 };
    expect(convertRrsp(late, latest, 2040, ctx).type).toBe('rrif');
  });

  it('has no minimum in the opening year, or for an RRSP', () => {
    const rrif = convertRrsp(rrsp, 68, 2031, ctx);
    expect(rrifMinimum(rrif, 67, 2031, ctx)).toBe(0);
    expect(rrifMinimum(rrsp, 75, 2031, ctx)).toBe(0);
  });

  it('applies the factor for the start-of-year age to the balance', () => {
    const rrif = { ...rrsp, type: 'rrif' as const, openedYear: 2030 };
    expect(rrifMinimum(rrif, 75, 2035, ctx)).toBeCloseTo(table['75']! * 100_000, 6);
  });
});
