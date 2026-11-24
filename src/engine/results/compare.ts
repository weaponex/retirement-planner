// The Result fields the screens read (design file 37; Result definitions and
// Data contracts, Results for the screens). Amounts in today's dollars are each
// year's future-dollar amount divided by that year's deflator.
import type { Config } from '../config/load';
import { classReturns } from '../invest/returns';
import type { Jurisdiction } from '../jurisdiction/types';
import { initialState } from '../project/initialState';
import { COVERED_TOLERANCE } from '../project/runPath';
import { workingYear } from '../project/workingYear';
import { firstRetirementYear } from '../solver/startOfYear';
import { prepareYear, solveYear, type SolveOptions } from '../solver/yearSolve';
import type {
  Comparison,
  NormalizedInputs,
  PlanSummary,
  Result,
  Variant,
  YearContext,
  YearRow,
} from '../types';
import type { Deflator } from '../units';

/** Differences smaller than this ($1, today's dollars) count as no difference. */
const DIFF_TOLERANCE = 1;

/** The two numbers a comparison looks at, in today's dollars. */
export interface Compared {
  lifetimeTaxToday: number;
  afterTaxLegacyToday: number;
}

/** `a` − `b`. Lower tax is better; a larger legacy is better. */
export function compare(a: Compared, b: Compared): Comparison {
  const lifetimeTaxDiffToday = a.lifetimeTaxToday - b.lifetimeTaxToday;
  const legacyDiffToday = a.afterTaxLegacyToday - b.afterTaxLegacyToday;
  const taxBetter = lifetimeTaxDiffToday < -DIFF_TOLERANCE;
  const taxWorse = lifetimeTaxDiffToday > DIFF_TOLERANCE;
  const legacyBetter = legacyDiffToday > DIFF_TOLERANCE;
  const legacyWorse = legacyDiffToday < -DIFF_TOLERANCE;
  return {
    lifetimeTaxDiffToday,
    legacyDiffToday,
    oppositeDirections: (taxBetter && legacyWorse) || (taxWorse && legacyBetter),
  };
}

/** The plan's last year index: the second death year, counted from the plan start. */
export function lastYearIndex(inputs: NormalizedInputs, rows: YearRow[]): number {
  return rows[rows.length - 1]!.year - inputs.planStartYear;
}

/** A summary's comparison figures; `lastIndex` is the second death year's index. */
export function compared(summary: PlanSummary, lastIndex: number, deflator: Deflator): Compared {
  return {
    lifetimeTaxToday: summary.lifetimeTaxToday,
    afterTaxLegacyToday: summary.afterTaxLegacyNom / deflator(lastIndex),
  };
}

/** Goal 1 over the years from the first retirement to the second death; Goal 2 against the legacy goal. */
export function goals(
  rows: YearRow[],
  summary: PlanSummary,
  inputs: NormalizedInputs,
  deflator: Deflator,
): Result['goals'] {
  const retire = firstRetirementYear(inputs);
  const retired = rows.filter((r) => r.year >= retire);
  const shortYears = retired.filter((r) => r.shortfallNom > COVERED_TOLERANCE).map((r) => r.year);
  const afterTaxLegacyToday = summary.afterTaxLegacyNom / deflator(lastYearIndex(inputs, rows));
  // The goal is entered in today's dollars; normalizeInputs keeps it at the plan start.
  const goalToday = inputs.estate.legacyGoalNom;
  const noGoal = goalToday <= 0;
  return {
    spending: {
      met: shortYears.length === 0,
      yearsCovered: retired.length - shortYears.length,
      yearsTotal: retired.length,
      shortYears,
      ...(summary.firstShortfallYear !== undefined && {
        firstShortfallYear: summary.firstShortfallYear,
      }),
      totalShortfallToday: summary.totalShortfallToday,
    },
    legacy: {
      status: noGoal ? 'no_goal' : afterTaxLegacyToday >= goalToday ? 'met' : 'missed',
      afterTaxLegacyToday,
      goalToday,
      differenceToday: noGoal ? 0 : afterTaxLegacyToday - goalToday,
    },
  };
}

/**
 * The tax on the first year's sale of the user's own non-registered positions:
 * year one solved again with the rebalance's gains set to zero, and the
 * difference in household tax (income tax and clawback) between the two.
 */
export function yearOneSaleTax(
  inputs: NormalizedInputs,
  cfg: Config,
  jurisdiction: Jurisdiction,
  deflator: Deflator,
  variant: Variant,
): { gainsNom: number; taxNom: number } {
  const ctx: YearContext = { yearIndex: 0, deflator, cfg, jurisdiction };
  const state = initialState(inputs, ctx, variant);
  const solve = (options: SolveOptions) =>
    state.year < firstRetirementYear(inputs)
      ? workingYear(state, inputs, ctx, variant, options)
      : solveYear(state, inputs, ctx, variant, options);
  const tax = (options: SolveOptions) =>
    solve(options).row.spouse.reduce((sum, sp) => sum + sp.taxNom, 0);
  const prepared = prepareYear(state, inputs, ctx, variant, classReturns(cfg, inputs.investing));
  return {
    gainsNom: prepared.rebalanceGains[0] + prepared.rebalanceGains[1],
    taxNom: tax({}) - tax({ ignoreRebalanceGains: true }),
  };
}

/** The Estate chart's figures, from the second death year's row. */
export function estateSummary(
  rows: YearRow[],
  inputs: NormalizedInputs,
  deflator: Deflator,
): Result['estate'] {
  const last = rows[rows.length - 1]!;
  const f = deflator(lastYearIndex(inputs, rows));
  const balancesNom = Object.values(last.balancesEndNom).reduce((a, b) => a + b, 0);
  return {
    year: last.year,
    balancesToday: balancesNom / f,
    homeToday: last.estate.homeNom / f,
    deemedRegisteredToday: last.estate.deemedRegisteredNom / f,
    deemedGainsToday: last.estate.deemedGainsNom / f,
    finalReturnTaxToday: last.estate.finalReturnTaxNom / f,
    probateToday: last.estate.probateNom / f,
    afterTaxLegacyToday: last.estate.afterTaxLegacyNom / f,
  };
}
