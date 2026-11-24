// One recalculation's runs (design file 36): the user's plan in full detail,
// the other two strategies with the rows the Withdrawals chart needs, and the
// placement baseline as a summary. Everything here is in future dollars.
import type { Config } from '../config/load';
import type { Jurisdiction } from '../jurisdiction/types';
import { runPath, type PathResult } from '../project/runPath';
import type {
  IncomeBySourceNom,
  NormalizedInputs,
  PlanSummary,
  StrategyResult,
  YearRow,
} from '../types';
import { variants } from './variants';

export interface Simulation {
  plan: PathResult & { variantId: string };
  /** One per strategy, in `STRATEGY_ORDER`. */
  strategies: StrategyResult[];
  baseline: PlanSummary;
}

/** Which source an account's withdrawals count under, from its id's type prefix. */
function sourceOf(accountId: string): 'registered' | 'nonreg' | 'tfsa' {
  const type = accountId.split('-')[0];
  if (type === 'tfsa') return 'tfsa';
  if (type === 'nonreg') return 'nonreg';
  return 'registered'; // rrsp (RRSP/RRIF) and lira (LIRA/LIF)
}

/** The Withdrawals chart's rows: money by source before tax, tax, and what went to the TFSA. */
export function chartRows(rows: YearRow[]): StrategyResult['rows'] {
  return rows.map((r) => {
    const income: IncomeBySourceNom = {
      work: 0,
      db: 0,
      cpp: 0,
      oas: 0,
      registered: 0,
      nonreg: r.cashYieldNom,
      tfsa: 0,
    };
    let taxNom = 0;
    let clawbackNom = 0;
    for (const sp of r.spouse) {
      income.work += sp.payNom;
      income.db += sp.dbNom;
      income.cpp += sp.cppNom;
      income.oas += sp.oasNom;
      for (const [id, amount] of Object.entries(sp.withdrawals)) income[sourceOf(id)] += amount;
      taxNom += sp.taxNom;
      clawbackNom += sp.clawbackNom;
    }
    let savedToTfsaNom = 0;
    for (const [id, a] of Object.entries(r.accounts)) {
      if (sourceOf(id) === 'tfsa') savedToTfsaNom += a.depositsNom;
    }
    return {
      year: r.year,
      incomeBySourceNom: income,
      taxNom,
      clawbackNom,
      savedToTfsaNom,
      spendNeedNom: r.spendNeedNom,
    };
  });
}

export function simulate(
  inputs: NormalizedInputs,
  cfg: Config,
  jurisdiction: Jurisdiction,
): Simulation {
  const v = variants(inputs);
  const plan = runPath(inputs, cfg, jurisdiction, v.user, 'full');
  const strategies = v.strategies.map((variant): StrategyResult => {
    const run = variant === v.user ? plan : runPath(inputs, cfg, jurisdiction, variant, 'full');
    return { strategyId: variant.strategyId, summary: run.summary, rows: chartRows(run.rows) };
  });
  const baseline = runPath(inputs, cfg, jurisdiction, v.baseline, 'summary').summary;
  return { plan: { ...plan, variantId: v.user.id }, strategies, baseline };
}
