// RRSP and RRIF rules (design: Accounts). An RRSP converts to a RRIF on January
// 1 of the year the owner reaches the conversion age they chose, and no later
// than the year they turn `federal.rrif.latest_conversion_age`. RRIF minimums
// use the owner's age at the start of the year; none applies in the opening year.
import { ageTable, plain } from '../config/read';
import { accountValue } from '../invest/rebalance';
import type { AccountState, YearContext } from '../types';

/**
 * The minimum factor (FR-M4): the table's factor for the start-of-year age;
 * the last row above the table; below its first age, 1 ÷ (base age − age).
 */
export function minFactor(ageAtStartOfYear: number, ctx: YearContext): number {
  const fromTable = ageTable(ctx, 'federal.rrif.min_factor', ageAtStartOfYear);
  if (fromTable !== undefined) return fromTable;
  const base = plain(ctx, 'federal.rrif.min_factor_base_age');
  return ageAtStartOfYear < base ? 1 / (base - ageAtStartOfYear) : 1;
}

/** The year an account converts: the chosen age, capped at the latest conversion age. */
export function conversionAgeFor(account: AccountState, ctx: YearContext): number {
  const latest = plain(ctx, 'federal.rrif.latest_conversion_age');
  return Math.min(account.conversionAge ?? latest, latest);
}

/** Converts an RRSP to a RRIF in the year the owner reaches the conversion age (age in the row). */
export function convertRrsp(
  account: AccountState,
  ownerAge: number,
  year: number,
  ctx: YearContext,
): AccountState {
  if (account.type !== 'rrsp' || ownerAge < conversionAgeFor(account, ctx)) return account;
  return { ...account, type: 'rrif', openedYear: year };
}

/** True in the year a RRIF or LIF opened: no minimum applies. */
export function isOpeningYear(account: AccountState, year: number): boolean {
  return account.openedYear === year;
}

/** The RRIF minimum on the start-of-year balance; 0 for an RRSP or in the opening year. */
export function rrifMinimum(
  account: AccountState,
  ageAtStartOfYear: number,
  year: number,
  ctx: YearContext,
): number {
  if (account.type !== 'rrif' || isOpeningYear(account, year)) return 0;
  return minFactor(ageAtStartOfYear, ctx) * accountValue(account);
}
