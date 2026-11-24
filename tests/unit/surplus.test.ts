import { describe, expect, it } from 'vitest';
import { placeSurplus, surplusShares } from '../../src/engine/withdraw/surplus';
import { account } from './helpers/accounts';
import { yearInProgress } from './helpers/yearInProgress';

const accounts = () => [
  account('tfsa-0-1', 'tfsa', 0, { cash: 1 }),
  account('nonreg-0-1', 'nonreg', 0, { cash: 1 }),
  account('nonreg-1-1', 'nonreg', 1, { cash: 1 }),
];

describe('surplus (C3)', () => {
  it('splits by each spouse share of the forced draws', () => {
    const year = yearInProgress(accounts());
    expect(surplusShares(year, [30_000, 10_000], [0, 0])).toEqual([0.75, 0.25]);
  });

  it('falls back to fixed income, then equal shares, among living spouses', () => {
    const year = yearInProgress(accounts());
    expect(surplusShares(year, [0, 0], [10_000, 30_000])).toEqual([0.25, 0.75]);
    expect(surplusShares(year, [0, 0], [0, 0])).toEqual([0.5, 0.5]);
    const widowed = yearInProgress(accounts(), [{ alive: false }, {}]);
    expect(surplusShares(widowed, [5_000, 0], [0, 0])).toEqual([0, 1]);
  });

  it('goes to the TFSA within room, then non-registered', () => {
    const year = yearInProgress(accounts(), [{ tfsaRoomNom: 4_000 }, { tfsaRoomNom: 9_000 }]);
    const deposits = placeSurplus(10_000, year, [1, 0]);
    expect(deposits).toEqual([
      { accountId: 'tfsa-0-1', amountNom: 4_000 },
      { accountId: 'nonreg-0-1', amountNom: 6_000 },
    ]);
    // Spouse 2 has room but no TFSA: straight to non-registered.
    expect(placeSurplus(1_000, year, [0, 1])).toEqual([
      { accountId: 'nonreg-1-1', amountNom: 1_000 },
    ]);
  });
});
