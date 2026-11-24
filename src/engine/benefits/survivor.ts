// Benefits that start for the survivor the year after the first death
// (design: Accounts, CPP survivor benefit; the year solver, step 1).
import { BENEFIT_REFERENCE_AGE } from '../constants';
import { amount, plain } from '../config/read';
import type { YearContext } from '../types';

export interface SurvivorInputs {
  /** The deceased's CPP pension for a full year, in this year's dollars. */
  deceasedCppFullYear: number;
  /** The deceased's DB lifetime payments for a full year, each with its survivor percentage. */
  deceasedDb: { lifetimeFullYear: number; survivorPct: number }[];
}

export interface SurvivorBenefits {
  cpp: number;
  db: number;
}

/**
 * The CPP survivor benefit and the DB survivor shares, for a full year.
 *
 * - CPP, survivor 65 or older: `pct_65_plus` × the deceased's pension.
 * - CPP, survivor under 65: `flat_under_65` + `pct_under_65` × the deceased's pension.
 * - Either way the survivor's own CPP plus the benefit is capped at
 *   `federal.cpp.survivor.max_combined` (FR-M11).
 * - DB: each pension's survivor percentage of its lifetime amount.
 */
export function survivorBenefits(
  deceased: SurvivorInputs,
  survivor: { age: number; ownCpp: number },
  ctx: YearContext,
): SurvivorBenefits {
  const pension = deceased.deceasedCppFullYear;
  const raw =
    survivor.age >= BENEFIT_REFERENCE_AGE
      ? plain(ctx, 'federal.cpp.survivor.pct_65_plus') * pension
      : amount(ctx, 'federal.cpp.survivor.flat_under_65') +
        plain(ctx, 'federal.cpp.survivor.pct_under_65') * pension;
  const room = Math.max(0, amount(ctx, 'federal.cpp.survivor.max_combined') - survivor.ownCpp);
  const cpp = pension > 0 ? Math.min(raw, room) : 0;
  const db = deceased.deceasedDb.reduce(
    (sum, d) => sum + d.lifetimeFullYear * (d.survivorPct / 100),
    0,
  );
  return { cpp, db };
}
