// Federal tax for one person's return (design: Tax scope). Federal rules live
// here; provincial rules live in the jurisdiction modules.
import { amount, brackets, plain, type BracketRow } from '../config/read';
import { bracketTax, lowestRate } from '../tax/tables';
import type { TaxableIncome, YearContext } from '../types';

export interface IncomeTotals {
  /** Eligible dividends after the gross-up. */
  grossedUpDividends: number;
  /** Capital gains after the inclusion rate. */
  includedGains: number;
  /** Line 15000; also the base for the OAS recovery tax (line 23400). */
  totalIncome: number;
  /** OAS recovery tax: also deducted at line 23500. */
  clawback: number;
  /** Line 23600: total income minus the clawback. */
  netIncome: number;
  /** Line 26000: the same as net income in this model. */
  taxableIncome: number;
}

/** Income, net income and the clawback (design: Income, net income and the clawback). */
export function incomeTotals(income: TaxableIncome, ctx: YearContext): IncomeTotals {
  const grossedUpDividends =
    income.eligibleDividends * (1 + plain(ctx, 'federal.dividend.eligible.gross_up'));
  const includedGains = income.capitalGains * plain(ctx, 'federal.capital_gains.inclusion_rate');
  const totalIncome =
    income.pensionEligible +
    income.oas +
    income.cpp +
    income.otherOrdinary +
    income.foreignDividends +
    grossedUpDividends +
    includedGains;
  const clawback = Math.min(
    income.oas,
    plain(ctx, 'federal.oas.recovery.rate') *
      Math.max(0, totalIncome - amount(ctx, 'federal.oas.recovery.threshold')),
  );
  const netIncome = totalIncome - clawback;
  return {
    grossedUpDividends,
    includedGains,
    totalIncome,
    clawback,
    netIncome,
    taxableIncome: netIncome,
  };
}

/** The age amount after its income-based reduction; 0 below the minimum age. */
export function ageAmount(
  age: number,
  netIncome: number,
  ctx: YearContext,
  keys: { amount: string; threshold: string; rate: string },
): number {
  if (age < plain(ctx, 'federal.credits.age.min_age')) return 0;
  const reduction = Math.max(0, netIncome - amount(ctx, keys.threshold)) * plain(ctx, keys.rate);
  return Math.max(0, amount(ctx, keys.amount) - reduction);
}

/**
 * The federal basic personal amount (TC-1): the full amount up to the fourth
 * bracket row's start, the minimum at or above the fifth row's start, and a
 * straight line in between.
 */
export function federalBasicAmount(taxableIncome: number, rows: BracketRow[], ctx: YearContext) {
  const full = amount(ctx, 'federal.credits.basic');
  const min = amount(ctx, 'federal.credits.basic_min');
  const start = rows[3]?.from;
  const end = rows[4]?.from;
  if (start === undefined || end === undefined) {
    throw new Error('federal.tax.brackets needs five rows for the basic amount reduction');
  }
  const share = Math.min(1, Math.max(0, (taxableIncome - start) / (end - start)));
  return full - (full - min) * share;
}

export interface FederalParts {
  totals: IncomeTotals;
  bracketTax: number;
  credits: number;
  dividendCredit: number;
  tax: number;
}

export function federalTaxParts(income: TaxableIncome, age: number, ctx: YearContext) {
  const totals = incomeTotals(income, ctx);
  const rows = brackets(ctx, 'federal.tax.brackets');
  const creditAmounts =
    federalBasicAmount(totals.taxableIncome, rows, ctx) +
    ageAmount(age, totals.netIncome, ctx, {
      amount: 'federal.credits.age.amount',
      threshold: 'federal.credits.age.reduction_threshold',
      rate: 'federal.credits.age.reduction_rate',
    }) +
    Math.min(income.pensionEligible, amount(ctx, 'federal.credits.pension.amount'));
  const gross = bracketTax(rows, totals.taxableIncome);
  const credits = creditAmounts * lowestRate(rows);
  const dividendCredit =
    totals.grossedUpDividends * plain(ctx, 'federal.dividend.eligible.credit_rate');
  const parts: FederalParts = {
    totals,
    bracketTax: gross,
    credits,
    dividendCredit,
    tax: Math.max(0, gross - credits - dividendCredit),
  };
  return parts;
}

/** Federal tax (line 42000, without the clawback) and the OAS recovery tax. */
export function federalTax(
  income: TaxableIncome,
  age: number,
  ctx: YearContext,
): { tax: number; clawback: number } {
  const parts = federalTaxParts(income, age, ctx);
  return { tax: parts.tax, clawback: parts.totals.clawback };
}
