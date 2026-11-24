// Old Age Security (design: Accounts, OAS). Zero below the minimum residence
// years; otherwise min(years, full) ÷ full × base × (1 + per-month deferral ×
// months deferred, capped), plus the increase from the increase age. The base
// is indexed. The first year, and the year the increase starts, are pro-rated
// by birth month.
import { BENEFIT_REFERENCE_AGE, MONTHS_PER_YEAR } from '../constants';
import { amount, plain } from '../config/read';
import type { YearContext } from '../types';
import { yearShare } from './cpp';

/** The full-year OAS once started, before the 75+ increase, in this year's dollars. */
export function oasFullYear(residenceYears: number, startAge: number, ctx: YearContext): number {
  if (residenceYears < plain(ctx, 'federal.oas.residence.min_years')) return 0;
  const full = plain(ctx, 'federal.oas.residence.full_years');
  const residence = Math.min(residenceYears, full) / full;
  const months = Math.min(
    Math.max(0, (startAge - BENEFIT_REFERENCE_AGE) * MONTHS_PER_YEAR),
    plain(ctx, 'federal.oas.deferral.max_months'),
  );
  const deferral = 1 + plain(ctx, 'federal.oas.deferral.per_month') * months;
  return amount(ctx, 'federal.oas.base_at_65') * residence * deferral;
}

/** OAS paid in this year, with the increase from the increase age, both pro-rated in their first year. */
export function oasAt(
  residenceYears: number,
  startAge: number,
  age: number,
  birthMonth: number,
  ctx: YearContext,
): number {
  const base = oasFullYear(residenceYears, startAge, ctx);
  const paid = yearShare(startAge, age, birthMonth);
  // The increase applies to the months paid at or after the increase age.
  const increaseShare = Math.min(
    paid,
    yearShare(plain(ctx, 'federal.oas.increase_age'), age, birthMonth),
  );
  return base * (paid + plain(ctx, 'federal.oas.increase_rate') * increaseShare);
}
