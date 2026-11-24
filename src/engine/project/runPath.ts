// One run of the plan at fixed returns (design file 34; Result definitions).
// Builds one YearContext per year, runs working years then retired-household
// years to the second death, and adds up the summary. Stage 2 stops after the
// second death year without a final return: the legacy is the balances before tax.
import type { Config } from '../config/load';
import type { Jurisdiction } from '../jurisdiction/types';
import { accountValue } from '../invest/rebalance';
import type { NormalizedInputs, PlanSummary, Variant, YearContext, YearRow } from '../types';
import { makeDeflator } from '../units';
import { firstRetirementYear, lastYear } from '../solver/startOfYear';
import { solveYear } from '../solver/yearSolve';
import { initialState } from './initialState';
import { workingYear } from './workingYear';

export interface PathResult {
  /** Every year's row with `detail: 'full'`; empty with `'summary'`. */
  rows: YearRow[];
  summary: PlanSummary;
}

/** Years of the plan with a shortfall above this are counted as not covered. */
const COVERED_TOLERANCE = 0.01;

export function runPath(
  inputs: NormalizedInputs,
  cfg: Config,
  jurisdiction: Jurisdiction,
  variant: Variant,
  detail: 'full' | 'summary',
): PathResult {
  const deflator = makeDeflator(cfg);
  const ctxFor = (yearIndex: number): YearContext => ({ yearIndex, deflator, cfg, jurisdiction });
  const retire = firstRetirementYear(inputs);
  const end = lastYear(inputs);

  let state = initialState(inputs, ctxFor(0), variant);
  const rows: YearRow[] = [];
  let lifetimeTaxNom = 0;
  let lifetimeTaxToday = 0;
  let totalShortfallNom = 0;
  let totalShortfallToday = 0;
  let firstShortfallYear: number | undefined;
  let clawbackYears = 0;
  let savedToTfsaNom = 0;
  let lastRow: YearRow | undefined;

  while (state.year <= end) {
    const ctx = ctxFor(state.yearIndex);
    const { nextState, row } =
      state.year < retire
        ? workingYear(state, inputs, ctx, variant)
        : solveYear(state, inputs, ctx, variant);
    // Today's-dollar totals: each year's amount ÷ that year's deflator (M5).
    const f = deflator(state.yearIndex);
    const tax = row.spouse[0].taxNom + row.spouse[1].taxNom;
    lifetimeTaxNom += tax;
    lifetimeTaxToday += tax / f;
    if (row.shortfallNom > COVERED_TOLERANCE) {
      totalShortfallNom += row.shortfallNom;
      totalShortfallToday += row.shortfallNom / f;
      firstShortfallYear ??= row.year;
    }
    if (row.spouse[0].clawbackNom > 0 || row.spouse[1].clawbackNom > 0) clawbackYears += 1;
    for (const [id, a] of Object.entries(row.accounts)) {
      if (state.accounts.find((x) => x.id === id)?.type === 'tfsa') savedToTfsaNom += a.depositsNom;
    }
    if (detail === 'full') rows.push(row);
    lastRow = row;
    state = nextState;
  }

  const legacy = state.accounts.reduce((s, a) => s + accountValue(a), 0);
  return {
    rows,
    summary: {
      spendingCovered: firstShortfallYear === undefined,
      ...(firstShortfallYear !== undefined && { firstShortfallYear }),
      totalShortfallNom,
      totalShortfallToday,
      lifetimeTaxNom,
      lifetimeTaxToday,
      afterTaxLegacyNom: lastRow ? legacy : 0,
      legacyIsPreTax: true,
      clawbackYears,
      savedToTfsaNom,
      warningFacts: {},
    },
  };
}
