// CPP retirement pension (design: Accounts, CPP). The user's estimate at 65 is
// a monthly amount in plan-start dollars; CPP is indexed, so it grows with the
// deflator. Coefficients come from the config.
import { BENEFIT_REFERENCE_AGE, MONTHS_PER_YEAR } from '../constants';
import { plain } from '../config/read';
import type { YearContext } from '../types';

/**
 * The share of a year a benefit pays in the year the person reaches `startAge`:
 * payments start the month after the birthday, so (12 − birth month) ÷ 12.
 * 0 before that year, 1 after it.
 */
export function yearShare(startAge: number, age: number, birthMonth: number): number {
  if (age < startAge) return 0;
  if (age > startAge) return 1;
  return (MONTHS_PER_YEAR - birthMonth) / MONTHS_PER_YEAR;
}

/** The start-age adjustment: lower per month before 65, higher per month after. */
export function cppAdjustment(startAge: number, ctx: YearContext): number {
  const earliest = plain(ctx, 'federal.cpp.start.earliest');
  const latest = plain(ctx, 'federal.cpp.start.latest');
  const age = Math.min(latest, Math.max(earliest, startAge));
  const months = (age - BENEFIT_REFERENCE_AGE) * MONTHS_PER_YEAR;
  return months < 0
    ? 1 + months * plain(ctx, 'federal.cpp.adjust.early_per_month')
    : 1 + months * plain(ctx, 'federal.cpp.adjust.late_per_month');
}

/** The full-year pension once started, in this year's dollars. */
export function cppFullYear(estimateAt65: number, startAge: number, ctx: YearContext): number {
  return (
    estimateAt65 * MONTHS_PER_YEAR * cppAdjustment(startAge, ctx) * ctx.deflator(ctx.yearIndex)
  );
}

/** CPP paid in this year (the first year pro-rated by birth month). */
export function cppAt(
  estimateAt65: number,
  startAge: number,
  age: number,
  birthMonth: number,
  ctx: YearContext,
): number {
  return cppFullYear(estimateAt65, startAge, ctx) * yearShare(startAge, age, birthMonth);
}
