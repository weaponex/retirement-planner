import { describe, expect, it } from 'vitest';
import { accountValue } from '../../src/engine/invest/rebalance';
import { nextAccountId, startOfYear } from '../../src/engine/solver/startOfYear';
import type { PlanState } from '../../src/engine/types';
import { account, spouseState } from './helpers/accounts';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(3, cfg);
const unlock = valueOf<number>(cfg, 'ontario.lif.unlock_share');

const state = (accounts: PlanState['accounts']): PlanState => ({
  year: 2029,
  yearIndex: 3,
  spouses: [spouseState({ age: 65 }), spouseState({ age: 63, alive: false })],
  accounts,
  splitShare: { from: 0, share: 0 },
});

describe('startOfYear', () => {
  it('places an unlocked LIRA share in a new RRIF when the owner has no RRSP', () => {
    const lira = account(
      'lira-0-1',
      'lira',
      0,
      { bonds: 80_000, cad_equity: 20_000 },
      {},
      {
        conversionAge: 65,
        lifUnlock50: true,
      },
    );
    const after = startOfYear(state([lira]), ctx);
    const rrif = after.accounts.find((a) => a.id === 'rrsp-0-1')!;
    expect(rrif.type).toBe('rrif');
    expect(rrif.openedYear).toBe(2029);
    expect(accountValue(rrif)).toBeCloseTo(100_000 * unlock, 6);
    expect(rrif.holdings.bonds.valueNom / accountValue(rrif)).toBeCloseTo(0.8, 9);
  });

  it('places it in the owner first RRSP/RRIF when there is one', () => {
    const lira = account(
      'lira-0-1',
      'lira',
      0,
      { bonds: 100_000 },
      {},
      {
        conversionAge: 65,
        lifUnlock50: true,
      },
    );
    const rrsp = account('rrsp-0-1', 'rrsp', 0, { cash: 10_000 }, {}, { conversionAge: 71 });
    const after = startOfYear(state([lira, rrsp]), ctx);
    expect(after.accounts).toHaveLength(2);
    expect(accountValue(after.accounts.find((a) => a.id === 'rrsp-0-1')!)).toBeCloseTo(
      10_000 + 100_000 * unlock,
      6,
    );
  });

  it('adds TFSA room only for a living spouse', () => {
    const after = startOfYear(state([]), ctx);
    expect(after.spouses[0].tfsaRoomNom).toBeGreaterThan(0);
    expect(after.spouses[1].tfsaRoomNom).toBe(0);
  });

  it('numbers new accounts after the highest in use', () => {
    const accounts = [
      account('nonreg-1-1', 'nonreg', 1, {}),
      account('nonreg-1-3', 'nonreg', 1, {}),
    ];
    expect(nextAccountId(accounts, 'nonreg', 1)).toBe('nonreg-1-4');
    expect(nextAccountId(accounts, 'nonreg', 0)).toBe('nonreg-0-1');
  });
});
