import { describe, expect, it } from 'vitest';
import { ASSET_CLASSES, type AssetClass } from '../../src/engine/config/keys';
import { targetHoldings } from '../../src/engine/invest/placement';
import type { Weights } from '../../src/engine/invest/rebalance';
import { account } from './helpers/accounts';
import { planConfig } from './helpers/couplePlan';

const cfg = planConfig();
const mix: Weights = {
  cad_equity: 0.2,
  us_equity: 0.25,
  intl_equity: 0.1,
  em_equity: 0.05,
  bonds: 0.35,
  cash: 0.05,
};
const accounts = [
  account('rrsp-0-1', 'rrsp', 0, { cash: 200_000 }),
  account('rrsp-1-1', 'rrsp', 1, { cash: 100_000 }),
  account('tfsa-0-1', 'tfsa', 0, { cash: 100_000 }),
  account('nonreg-0-1', 'nonreg', 0, { cash: 600_000 }),
];
const sumClass = (t: Record<string, Record<AssetClass, number>>, c: AssetClass) =>
  Object.values(t).reduce((s, a) => s + a[c], 0);
const sumAccount = (t: Record<AssetClass, number>) => ASSET_CLASSES.reduce((s, c) => s + t[c], 0);

describe('targetHoldings', () => {
  it('keeps each account total and each class share of the household', () => {
    for (const preset of ['bonds_sheltered_first', 'growth_tax_free_first', 'same_mix'] as const) {
      const t = targetHoldings(accounts, mix, preset, cfg);
      expect(sumAccount(t['tfsa-0-1']!)).toBeCloseTo(100_000, 6);
      expect(sumAccount(t['rrsp-0-1']!)).toBeCloseTo(200_000, 6);
      expect(sumAccount(t['nonreg-0-1']!)).toBeCloseTo(600_000, 6);
      for (const c of ASSET_CLASSES) expect(sumClass(t, c)).toBeCloseTo(mix[c] * 1_000_000, 6);
    }
  });

  it('bonds sheltered first: cash and bonds fill registered accounts first, split by room', () => {
    const t = targetHoldings(accounts, mix, 'bonds_sheltered_first', cfg);
    // Cash (50k) then bonds (350k) fill the 300k registered group first, 2:1 by room.
    expect(t['rrsp-0-1']!.cash).toBeCloseTo(50_000 * (2 / 3), 6);
    expect(t['rrsp-1-1']!.cash).toBeCloseTo(50_000 * (1 / 3), 6);
    expect(t['rrsp-0-1']!.bonds + t['rrsp-1-1']!.bonds).toBeCloseTo(250_000, 6);
    // The rest of the bonds go to the TFSA next.
    expect(t['tfsa-0-1']!.bonds).toBeCloseTo(100_000, 6);
    // Canadian stocks go to non-registered first.
    expect(t['nonreg-0-1']!.cad_equity).toBeCloseTo(200_000, 6);
  });

  it('the baseline puts the same mix in every account', () => {
    const t = targetHoldings(accounts, mix, 'same_mix', cfg);
    for (const c of ASSET_CLASSES) expect(t['tfsa-0-1']![c]).toBeCloseTo(100_000 * mix[c], 6);
  });
});
