// LIRA and LIF rules (design: Accounts; FR-M4, FR-M9). A LIRA converts to a
// LIF on January 1 of the year the owner reaches their conversion age, no later
// than the federal RRSP deadline. A LIRA is never drawn. The LIF minimum is the
// federal RRIF minimum; the maximum is the jurisdiction's factor × the
// start-of-year balance, or last year's investment earnings if greater.
import { accountValue, sellProRataHoldings } from '../invest/rebalance';
import type { AccountState, YearContext } from '../types';
import { conversionAgeFor, isOpeningYear, minFactor } from './rrspRrif';

export interface LiraConversion {
  account: AccountState;
  /** The amount moved to the owner's RRSP/RRIF by the optional one-time unlock. */
  unlocked: number;
}

/**
 * Converts a LIRA to a LIF in the year the owner reaches the conversion age.
 * With `lifUnlock50`, the jurisdiction's unlock share of the balance leaves the
 * LIF; the caller places it in the owner's RRSP/RRIF (O9).
 */
export function convertLira(
  account: AccountState,
  ownerAge: number,
  year: number,
  ctx: YearContext,
): LiraConversion {
  if (account.type !== 'lira' || ownerAge < conversionAgeFor(account, ctx)) {
    return { account, unlocked: 0 };
  }
  const lif: AccountState = { ...account, type: 'lif', openedYear: year };
  delete lif.lifPrevEarningsNom;
  if (!account.lifUnlock50) return { account: lif, unlocked: 0 };
  const unlocked = accountValue(account) * ctx.jurisdiction.unlockShare(ctx);
  const { holdings } = sellProRataHoldings(account.holdings, unlocked);
  return { account: { ...lif, holdings }, unlocked };
}

export interface LifLimits {
  min: number;
  max: number;
}

/**
 * The LIF's yearly minimum and maximum on the start-of-year balance. In the
 * opening year the minimum is 0 and the maximum is the factor alone; after
 * that the maximum is the greater of the factor × balance and last year's
 * earnings. The maximum is never below the minimum. A LIRA has no room (0, 0).
 */
export function lifLimits(
  account: AccountState,
  ageAtStartOfYear: number,
  year: number,
  ctx: YearContext,
): LifLimits {
  if (account.type !== 'lif') return { min: 0, max: 0 };
  const balance = accountValue(account);
  const opening = isOpeningYear(account, year);
  const min = opening ? 0 : minFactor(ageAtStartOfYear, ctx) * balance;
  const byFactor = ctx.jurisdiction.lifMaxFactor(ageAtStartOfYear, ctx) * balance;
  const byEarnings = opening ? 0 : (account.lifPrevEarningsNom ?? 0);
  const max = Math.min(balance, Math.max(min, byFactor, byEarnings));
  return { min, max };
}
