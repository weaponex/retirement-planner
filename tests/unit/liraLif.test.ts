import { describe, expect, it } from 'vitest';
import { convertLira, lifLimits } from '../../src/engine/accounts/liraLif';
import { minFactor } from '../../src/engine/accounts/rrspRrif';
import { accountValue } from '../../src/engine/invest/rebalance';
import { account } from './helpers/accounts';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const maxTable = valueOf<Record<string, number>>(cfg, 'ontario.lif.max_factor');
const unlockShare = valueOf<number>(cfg, 'ontario.lif.unlock_share');
const lastMaxAge = Math.max(...Object.keys(maxTable).map(Number));

const lira = account(
  'lira-0-1',
  'lira',
  0,
  { bonds: 60_000, cad_equity: 40_000 },
  {},
  {
    conversionAge: 65,
  },
);
const lif = (extra = {}) => ({ ...lira, type: 'lif' as const, openedYear: 2030, ...extra });

describe('LIRA conversion', () => {
  it('converts in the year the owner reaches the conversion age', () => {
    expect(convertLira(lira, 64, 2030, ctx).account.type).toBe('lira');
    const { account: converted, unlocked } = convertLira(lira, 65, 2031, ctx);
    expect(converted.type).toBe('lif');
    expect(converted.openedYear).toBe(2031);
    expect(unlocked).toBe(0);
  });

  it('moves the unlock share out when chosen', () => {
    const { account: converted, unlocked } = convertLira(
      { ...lira, lifUnlock50: true },
      65,
      2031,
      ctx,
    );
    expect(unlocked).toBeCloseTo(100_000 * unlockShare, 6);
    expect(accountValue(converted)).toBeCloseTo(100_000 * (1 - unlockShare), 6);
  });

  it('a LIRA has no room to draw', () => {
    expect(lifLimits(lira, 60, 2030, ctx)).toEqual({ min: 0, max: 0 });
  });
});

describe('LIF limits', () => {
  it('opening year: no minimum, maximum from the table alone', () => {
    const l = lif({ lifPrevEarningsNom: 50_000 });
    const limits = lifLimits(l, 64, 2030, ctx);
    expect(limits.min).toBe(0);
    expect(limits.max).toBeCloseTo(maxTable['64']! * 100_000, 6);
  });

  it('later years: the RRIF minimum, including below 71 (FR-M13)', () => {
    const limits = lifLimits(lif(), 66, 2032, ctx);
    expect(limits.min).toBeCloseTo(minFactor(66, ctx) * 100_000, 6);
  });

  it('maximum is last year earnings when greater than the table (FR-M9)', () => {
    const fromTable = maxTable['66']! * 100_000;
    expect(lifLimits(lif({ lifPrevEarningsNom: fromTable + 500 }), 66, 2032, ctx).max).toBeCloseTo(
      fromTable + 500,
      6,
    );
    expect(lifLimits(lif({ lifPrevEarningsNom: 1 }), 66, 2032, ctx).max).toBeCloseTo(fromTable, 6);
  });

  it('uses the last row above the table', () => {
    const limits = lifLimits(lif(), lastMaxAge + 5, 2032, ctx);
    expect(limits.max).toBeCloseTo(Math.min(1, maxTable[String(lastMaxAge)]!) * 100_000, 6);
  });
});
