// Surplus placement (design: Withdrawal strategies, Surplus; C3). Money forced
// out by minimums or the bracket level beyond what spending needs is split
// between the spouses in proportion to their share of the forced draws; each
// share goes into that spouse's TFSA up to room, then their non-registered account.
import { firstTfsa, fitsInRoom } from '../accounts/tfsa';
import type { Owner, YearInProgress } from '../types';

export interface Deposit {
  accountId: string;
  amountNom: number;
}

/** The spouse's first non-registered account by id. */
function firstNonreg(year: YearInProgress, owner: Owner) {
  return year.state.accounts
    .filter((a) => a.type === 'nonreg' && a.owner === owner)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

/**
 * Each living spouse's share: their forced draws ÷ all forced draws. With no
 * forced draws (a surplus from fixed income alone), the shares follow each
 * living spouse's `fallbackWeights` (their fixed income), or are equal.
 */
export function surplusShares(
  year: YearInProgress,
  forcedByOwner: [number, number],
  fallbackWeights: [number, number],
): [number, number] {
  const alive = ([0, 1] as Owner[]).filter((o) => year.state.spouses[o].alive);
  const pick = (w: [number, number]) => {
    const sum = alive.reduce<number>((s, o) => s + w[o], 0);
    if (sum <= 0) return undefined;
    const out: [number, number] = [0, 0];
    for (const o of alive) out[o] = w[o] / sum;
    return out;
  };
  const equal: [number, number] = [0, 0];
  for (const o of alive) equal[o] = 1 / alive.length;
  return pick(forcedByOwner) ?? pick(fallbackWeights) ?? equal;
}

/**
 * Splits the surplus by the shares, then puts each share in that spouse's
 * first TFSA within room and the rest in their first non-registered account.
 */
export function placeSurplus(
  surplus: number,
  year: YearInProgress,
  shares: [number, number],
): Deposit[] {
  const deposits: Deposit[] = [];
  if (surplus <= 0) return deposits;
  for (const owner of [0, 1] as Owner[]) {
    let left = surplus * shares[owner];
    if (left <= 0) continue;
    const tfsa = firstTfsa(year.state.accounts, owner);
    if (tfsa) {
      const put = fitsInRoom(year.state.spouses[owner], left);
      if (put > 0) deposits.push({ accountId: tfsa.id, amountNom: put });
      left -= put;
    }
    if (left > 0) {
      const nonreg = firstNonreg(year, owner);
      if (!nonreg) throw new Error(`spouse ${owner} has no non-registered account for the surplus`);
      deposits.push({ accountId: nonreg.id, amountNom: left });
    }
  }
  return deposits;
}
