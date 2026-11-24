import { describe, expect, it } from 'vitest';
import { rebalance } from '../../src/engine/invest/rebalance';
import { account } from './helpers/accounts';

describe('rebalance', () => {
  it('realizes gains on non-registered sales at average cost, by owner', () => {
    const accounts = [
      account(
        'nonreg-1-1',
        'nonreg',
        1,
        { cad_equity: 80_000, bonds: 20_000 },
        {
          cad_equity: 40_000,
          bonds: 20_000,
        },
      ),
      account('rrsp-0-1', 'rrsp', 0, { cad_equity: 100_000 }, { cad_equity: 10 }),
    ];
    const { accounts: next, realizedGains } = rebalance(accounts, {
      'nonreg-1-1': {
        cad_equity: 50_000,
        us_equity: 0,
        intl_equity: 0,
        em_equity: 0,
        bonds: 50_000,
        cash: 0,
      },
      'rrsp-0-1': {
        cad_equity: 0,
        us_equity: 0,
        intl_equity: 0,
        em_equity: 0,
        bonds: 100_000,
        cash: 0,
      },
    });
    // 30k of Canadian stocks sold, cost share 3/8 of 40k = 15k: gain 15k.
    expect(realizedGains[1]).toBeCloseTo(15_000, 6);
    // Moves inside registered accounts are tax-free.
    expect(realizedGains[0]).toBe(0);
    const nonreg = next.find((a) => a.id === 'nonreg-1-1')!;
    expect(nonreg.holdings.cad_equity).toEqual({ valueNom: 50_000, costNom: 25_000 });
    expect(nonreg.holdings.bonds).toEqual({ valueNom: 50_000, costNom: 50_000 });
  });

  it('leaves an account without a target as it is', () => {
    const a = account('tfsa-0-1', 'tfsa', 0, { cash: 5 });
    expect(rebalance([a], {}).accounts[0]).toBe(a);
  });
});
