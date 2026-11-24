// Runtime invariants, checked every year of every run (design: Verification,
// G10). Each compares within INVARIANT_TOLERANCE. A failure throws an
// EngineIntegrityError carrying the year, variant, check and both states.
import { INVARIANT_TOLERANCE } from './constants';
import { ASSET_CLASSES } from './config/keys';
import type { IntegrityFailure, PlanState, YearContext, YearRow } from './types';

export class EngineIntegrityError extends Error implements IntegrityFailure {
  readonly year: number;
  readonly variantId: string;
  readonly check: string;
  readonly before: PlanState;
  readonly after: PlanState;
  constructor(failure: IntegrityFailure) {
    super(
      `Engine integrity check failed in ${failure.year} (${failure.variantId}): ${failure.check}`,
    );
    this.name = 'EngineIntegrityError';
    this.year = failure.year;
    this.variantId = failure.variantId;
    this.check = failure.check;
    this.before = failure.before;
    this.after = failure.after;
  }
}

export interface YearChecks {
  variantId: string;
  /** 'retired' rows follow the retired household identity, 'working' rows the working one. */
  kind: 'retired' | 'working';
  /** Each RRIF/LIF's minimum and maximum this year. */
  limits: Record<string, { min: number; max: number }>;
  /** TFSA room at the start of the year (after the January 1 addition), by spouse. */
  tfsaRoomStart: [number, number];
  /** TFSA contributions and deposits this year, by spouse. */
  tfsaIn: [number, number];
  /** Draws taken to pay tax in a working year (no spending need). */
  workingDraws?: number;
}

const close = (a: number, b: number) => Math.abs(a - b) <= INVARIANT_TOLERANCE;

/** The checks that fail, by name (empty when the year is sound). */
export function failedChecks(next: PlanState, row: YearRow, checks: YearChecks): string[] {
  const failed: string[] = [];
  const tol = INVARIANT_TOLERANCE;

  // Spending: after-tax cash meets the need, or a shortfall is recorded.
  if (
    checks.kind === 'retired' &&
    row.afterTaxCashNom + row.shortfallNom < row.spendNeedNom - tol
  ) {
    failed.push('spending need');
  }

  // Each account: start + contributions + deposits + reinvested yield − withholding + price return − draws = end.
  for (const [id, a] of Object.entries(row.accounts)) {
    const end =
      a.startNom +
      a.contributionsNom +
      a.depositsNom +
      a.reinvestedYieldNom -
      a.withholdingNom +
      a.priceReturnNom -
      a.drawsNom;
    if (!close(end, a.endNom)) failed.push(`account identity ${id}`);
    if (!close(row.balancesEndNom[id] ?? NaN, a.endNom)) failed.push(`balancesEndNom ${id}`);
  }

  // The household.
  const fixed = row.spouse.reduce((s, p) => s + p.cppNom + p.oasNom + p.dbNom, 0);
  const pay = row.spouse.reduce((s, p) => s + p.payNom, 0);
  const tax = row.spouse.reduce((s, p) => s + p.taxNom, 0);
  const deposits = Object.values(row.accounts).reduce((s, a) => s + a.depositsNom, 0);
  const draws = Object.values(row.accounts).reduce((s, a) => s + a.drawsNom, 0);
  if (checks.kind === 'retired') {
    const lhs = draws + fixed + pay + row.cashYieldNom - tax - deposits;
    if (!close(lhs, row.spendNeedNom - row.shortfallNom)) failed.push('household identity');
  } else {
    const lhs = fixed + row.cashYieldNom - tax;
    if (!close(lhs, deposits - (checks.workingDraws ?? 0)))
      failed.push('working household identity');
  }

  // No negative balance or original cost.
  for (const a of next.accounts) {
    for (const cls of ASSET_CLASSES) {
      const p = a.holdings[cls];
      if (p.valueNom < -tol || p.costNom < -tol) failed.push(`negative holding ${a.id} ${cls}`);
    }
  }

  // RRIF and LIF draws within their minimums and maximums.
  for (const [id, { min, max }] of Object.entries(checks.limits)) {
    const drawn = row.accounts[id]?.drawsNom ?? 0;
    if (drawn < min - tol) failed.push(`minimum ${id}`);
    if (drawn > max + tol) failed.push(`maximum ${id}`);
  }

  // TFSA contributions within room.
  for (const i of [0, 1] as const) {
    if (checks.tfsaIn[i] > checks.tfsaRoomStart[i] + tol) failed.push(`TFSA room spouse ${i + 1}`);
  }
  return failed;
}

/** Throws EngineIntegrityError on the first failed check. */
export function checkYear(
  prev: PlanState,
  next: PlanState,
  row: YearRow,
  _ctx: YearContext,
  checks: YearChecks,
): void {
  const failed = failedChecks(next, row, checks);
  if (failed.length > 0) {
    throw new EngineIntegrityError({
      year: row.year,
      variantId: checks.variantId,
      check: failed.join('; '),
      before: prev,
      after: next,
    });
  }
}
