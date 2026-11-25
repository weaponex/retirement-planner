// Chart rows in today's dollars, from the engine's future-dollar rows.
import type { Result, StrategyResult, YearRow } from '../../engine/types';

export type ToToday = (nominal: number, year: number) => number;

export const SOURCES = ['work', 'db', 'cpp', 'oas', 'registered', 'nonreg', 'tfsa'] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_NAMES: Record<Source, string> = {
  work: 'Pay',
  db: 'Workplace pension',
  cpp: 'CPP',
  oas: 'OAS',
  registered: 'RRSP / RRIF / LIF',
  nonreg: 'Non-registered',
  tfsa: 'TFSA',
};

export interface IncomeRow extends Record<Source, number> {
  year: number;
  tax: number;
  clawback: number;
  savedToTfsa: number;
  spendNeed: number;
}

export function incomeRows(rows: StrategyResult['rows'], toToday: ToToday): IncomeRow[] {
  return rows.map((r) => {
    const t = (n: number) => toToday(n, r.year);
    return {
      year: r.year,
      work: t(r.incomeBySourceNom.work),
      db: t(r.incomeBySourceNom.db),
      cpp: t(r.incomeBySourceNom.cpp),
      oas: t(r.incomeBySourceNom.oas),
      registered: t(r.incomeBySourceNom.registered),
      nonreg: t(r.incomeBySourceNom.nonreg),
      tfsa: t(r.incomeBySourceNom.tfsa),
      tax: t(r.taxNom),
      clawback: t(r.clawbackNom),
      savedToTfsa: t(r.savedToTfsaNom),
      spendNeed: t(r.spendNeedNom),
    };
  });
}

export interface BalanceRow {
  year: number;
  registered: number;
  nonreg: number;
  tfsa: number;
}

/** End-of-year balances by account type: the id's type prefix decides the group. */
export function balanceRows(rows: YearRow[], toToday: ToToday): BalanceRow[] {
  return rows.map((r) => {
    const out: BalanceRow = { year: r.year, registered: 0, nonreg: 0, tfsa: 0 };
    for (const [id, v] of Object.entries(r.balancesEndNom)) {
      const type = id.split('-')[0];
      const group = type === 'tfsa' ? 'tfsa' : type === 'nonreg' ? 'nonreg' : 'registered';
      out[group] += toToday(v, r.year);
    }
    return out;
  });
}

export interface TaxRow {
  year: number;
  spouse0: number;
  spouse1: number;
}

export function taxRows(rows: YearRow[], toToday: ToToday): TaxRow[] {
  return rows.map((r) => ({
    year: r.year,
    spouse0: toToday(r.spouse[0].taxNom, r.year),
    spouse1: toToday(r.spouse[1].taxNom, r.year),
  }));
}

/** The first year a spouse is no longer alive, for the charts' marker. */
export function firstDeathYear(rows: YearRow[]): number | undefined {
  return rows.find((r) => !r.spouse[0].alive || !r.spouse[1].alive)?.year;
}

export interface WaterfallStep {
  name: string;
  /** Where the bar starts and its height; negative steps go down from the running total. */
  base: number;
  value: number;
  kind: 'total' | 'add' | 'less';
}

export function estateSteps(estate: Result['estate']): WaterfallStep[] {
  const start = estate.balancesToday;
  const withHome = start + estate.homeToday;
  const afterTax = withHome - estate.finalReturnTaxToday;
  return [
    { name: 'Balances', base: 0, value: start, kind: 'total' },
    { name: 'Home', base: start, value: estate.homeToday, kind: 'add' },
    { name: 'Final-return tax', base: afterTax, value: estate.finalReturnTaxToday, kind: 'less' },
    {
      name: 'Probate',
      base: afterTax - estate.probateToday,
      value: estate.probateToday,
      kind: 'less',
    },
    { name: 'After-tax legacy', base: 0, value: estate.afterTaxLegacyToday, kind: 'total' },
  ];
}
