// TFSA room (design: Accounts; C3). Room belongs to the person and is shared by
// all their TFSAs. On January 1 it grows by the yearly limit (indexed,
// unrounded) plus last year's withdrawals. A successor transfer uses no room.
import { amount } from '../config/read';
import type { AccountState, Owner, SpouseYearState, YearContext } from '../types';

/**
 * Adds the yearly limit and last year's withdrawals to the room, on January 1.
 * The plan's first year starts from the room the user entered, which already
 * includes that year's limit, so nothing is added in year index 0.
 */
export function addYearlyRoom(spouse: SpouseYearState, ctx: YearContext): SpouseYearState {
  if (ctx.yearIndex === 0) return spouse;
  return {
    ...spouse,
    tfsaRoomNom:
      spouse.tfsaRoomNom +
      amount(ctx, 'federal.tfsa.annual_limit') +
      spouse.tfsaWithdrawnThisYearNom,
    tfsaWithdrawnThisYearNom: 0,
  };
}

/** How much of `wanted` fits in the spouse's room. */
export function fitsInRoom(spouse: SpouseYearState, wanted: number): number {
  return Math.max(0, Math.min(wanted, spouse.tfsaRoomNom));
}

/** The spouse's first TFSA by id, where contributions and deposits go. */
export function firstTfsa(accounts: AccountState[], owner: Owner): AccountState | undefined {
  return accounts
    .filter((a) => a.type === 'tfsa' && a.owner === owner)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

/** Records a contribution or deposit: room falls by the amount. */
export function useRoom(spouse: SpouseYearState, amountNom: number): SpouseYearState {
  return { ...spouse, tfsaRoomNom: spouse.tfsaRoomNom - amountNom };
}

/** Records a withdrawal: it returns to room next January 1. */
export function recordWithdrawal(spouse: SpouseYearState, amountNom: number): SpouseYearState {
  return { ...spouse, tfsaWithdrawnThisYearNom: spouse.tfsaWithdrawnThisYearNom + amountNom };
}
