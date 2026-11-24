import { describe, expect, it } from 'vitest';
import { dbPayment } from '../../src/engine/benefits/db';
import type { NormalizedDbPension } from '../../src/engine/types';
import { planConfig, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const base: NormalizedDbPension = {
  owner: 0,
  lifetimeAnnualNom: 30_000,
  startAge: 60,
  bridgeAnnualNom: 6_000,
  bridgeEndAge: 65,
  indexing: 'none',
  survivorPct: 60,
};

describe('DB pension', () => {
  it('pays nothing before the start age or when not alive', () => {
    expect(dbPayment(base, 59, 6, yearContext(0, cfg), true).total).toBe(0);
    expect(dbPayment(base, 62, 6, yearContext(0, cfg), false).total).toBe(0);
  });

  it('pro-rates the first year by birth month', () => {
    const p = dbPayment(base, 60, 6, yearContext(0, cfg), true);
    expect(p.lifetime).toBeCloseTo(15_000, 6);
    expect(p.bridge).toBeCloseTo(3_000, 6);
  });

  it('stops the bridge at its end age', () => {
    expect(dbPayment(base, 64, 6, yearContext(0, cfg), true).bridge).toBeCloseTo(6_000, 6);
    expect(dbPayment(base, 65, 6, yearContext(0, cfg), true).bridge).toBeCloseTo(3_000, 6);
    expect(dbPayment(base, 66, 6, yearContext(0, cfg), true).bridge).toBe(0);
  });

  it('none: nominal and flat', () => {
    expect(dbPayment(base, 70, 6, yearContext(10, cfg), true).lifetime).toBe(30_000);
  });

  it('fixed: nominal at the start age, then grows by indexRate', () => {
    const fixed = { ...base, indexing: 'fixed' as const, indexRate: 0.02 };
    expect(dbPayment(fixed, 63, 6, yearContext(3, cfg), true).lifetime).toBeCloseTo(
      30_000 * 1.02 ** 3,
      6,
    );
  });

  it('full: grows with the deflator', () => {
    const full = { ...base, indexing: 'full' as const };
    const ctx = yearContext(7, cfg);
    expect(dbPayment(full, 70, 6, ctx, true).lifetime).toBeCloseTo(30_000 * ctx.deflator(7), 6);
  });
});
