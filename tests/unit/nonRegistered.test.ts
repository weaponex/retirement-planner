import { describe, expect, it } from 'vitest';
import {
  cashYield,
  netGains,
  reinvestYield,
  sellProRata,
} from '../../src/engine/accounts/nonRegistered';
import { classReturns } from '../../src/engine/invest/returns';
import { account } from './helpers/accounts';
import { couplePlan, planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const returns = classReturns(cfg, couplePlan().investing);
const withholding = valueOf<number>(cfg, 'market.foreign_withholding_rate');

describe('sales at average cost', () => {
  const nonreg = account(
    'nonreg-0-1',
    'nonreg',
    0,
    { cad_equity: 60_000, bonds: 40_000 },
    { cad_equity: 30_000, bonds: 40_000 },
  );

  it('sells in proportion and keeps the original cost share', () => {
    const sale = sellProRata(nonreg, 25_000);
    expect(sale.account.holdings.cad_equity.valueNom).toBeCloseTo(45_000, 6);
    expect(sale.account.holdings.cad_equity.costNom).toBeCloseTo(22_500, 6);
    expect(sale.account.holdings.bonds.costNom).toBeCloseTo(30_000, 6);
    expect(sale.realizedGain).toBeCloseTo(7_500, 6);
  });

  it('can realize a loss', () => {
    const losing = account('nonreg-0-1', 'nonreg', 0, { bonds: 50_000 }, { bonds: 60_000 });
    expect(sellProRata(losing, 10_000).realizedGain).toBeCloseTo(-2_000, 6);
  });
});

describe('capital losses (FR-M5)', () => {
  it('a loss offsets same-year gains and the rest carries forward', () => {
    expect(netGains(-3_000, 0)).toEqual({ taxableGain: 0, carriedLoss: 3_000 });
  });

  it('a carried loss offsets later gains only', () => {
    expect(netGains(2_000, 3_000)).toEqual({ taxableGain: 0, carriedLoss: 1_000 });
    expect(netGains(5_000, 1_000)).toEqual({ taxableGain: 4_000, carriedLoss: 0 });
    expect(netGains(0, 1_000)).toEqual({ taxableGain: 0, carriedLoss: 1_000 });
  });
});

describe('yields', () => {
  it('pays the non-registered yield as cash by income type', () => {
    const a = account('nonreg-0-1', 'nonreg', 0, {
      cad_equity: 10_000,
      us_equity: 10_000,
      bonds: 10_000,
    });
    const y = cashYield(a, returns);
    expect(y.eligibleDividends).toBeCloseTo(10_000 * returns.cad_equity.yield, 6);
    expect(y.foreignDividends).toBeCloseTo(10_000 * returns.us_equity.yield, 6);
    expect(y.interest).toBeCloseTo(10_000 * returns.bonds.yield, 6);
  });

  it('reinvests a sheltered yield, net of withholding on foreign dividends (M15)', () => {
    const a = account('tfsa-0-1', 'tfsa', 0, { us_equity: 10_000, cad_equity: 10_000 });
    const r = reinvestYield(a, returns, ctx);
    const foreign = 10_000 * returns.us_equity.yield;
    expect(r.withholding).toBeCloseTo(foreign * withholding, 6);
    expect(r.account.holdings.us_equity.valueNom).toBeCloseTo(
      10_000 + foreign * (1 - withholding),
      6,
    );
    expect(r.account.holdings.cad_equity.valueNom).toBeCloseTo(
      10_000 * (1 + returns.cad_equity.yield),
      6,
    );
  });
});
