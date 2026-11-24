// Ontario tax for one person's return, following Form ON428 Part C
// (design: Order of the Ontario calculation), and Ontario's LIF values.
import { ageTable, amount, brackets, list, phaseIn, plain } from '../config/read';
import { bracketTax, lowestRate, phaseInAmount } from '../tax/tables';
import type { TaxableIncome, YearContext } from '../types';
import { ageAmount, incomeTotals } from './federal';
import type { Jurisdiction } from './types';

/** Step 4 (line 68): the first rate above the first threshold plus the second above the second. */
export function ontarioSurtax(basicTax: number, ctx: YearContext): number {
  const thresholds = list(ctx, 'ontario.surtax.thresholds');
  const rates = list(ctx, 'ontario.surtax.rates');
  if (thresholds.length !== rates.length) {
    throw new Error('ontario.surtax.thresholds and .rates must have the same length');
  }
  return thresholds.reduce((sum, t, i) => sum + Math.max(0, basicTax - t) * (rates[i] ?? 0), 0);
}

/** Step 6 (line 80): 2 x the basic reduction minus the tax so far, never below 0. */
export function ontarioTaxReduction(taxSoFar: number, ctx: YearContext): number {
  return Math.max(0, 2 * amount(ctx, 'ontario.tax_reduction.basic') - taxSoFar);
}

/** Step 7 (line 89): the Health Premium on taxable income. */
export function ontarioHealthPremium(taxableIncome: number, ctx: YearContext): number {
  return phaseInAmount(phaseIn(ctx, 'ontario.health_premium.schedule'), taxableIncome);
}

export interface OntarioParts {
  bracketTax: number;
  credits: number;
  basicTax: number;
  surtax: number;
  dividendCredit: number;
  afterDividendCredit: number;
  taxReduction: number;
  afterReduction: number;
  healthPremium: number;
  total: number;
}

export function ontarioTaxParts(
  income: TaxableIncome,
  age: number,
  ctx: YearContext,
): OntarioParts {
  const totals = incomeTotals(income, ctx);
  const rows = brackets(ctx, 'ontario.tax.brackets');
  const gross = bracketTax(rows, totals.taxableIncome);
  const creditAmounts =
    amount(ctx, 'ontario.credits.basic') +
    ageAmount(age, totals.netIncome, ctx, {
      amount: 'ontario.credits.age.amount',
      threshold: 'ontario.credits.age.reduction_threshold',
      rate: 'ontario.credits.age.reduction_rate',
    }) +
    Math.min(income.pensionEligible, amount(ctx, 'ontario.credits.pension.amount'));
  const credits = creditAmounts * lowestRate(rows);
  const basicTax = Math.max(0, gross - credits);
  const surtax = ontarioSurtax(basicTax, ctx);
  const dividendCredit =
    totals.grossedUpDividends * plain(ctx, 'ontario.dividend.eligible.credit_rate');
  const afterDividendCredit = Math.max(0, basicTax + surtax - dividendCredit);
  const taxReduction = ontarioTaxReduction(afterDividendCredit, ctx);
  const afterReduction = Math.max(0, afterDividendCredit - taxReduction);
  const healthPremium = ontarioHealthPremium(totals.taxableIncome, ctx);
  return {
    bracketTax: gross,
    credits,
    basicTax,
    surtax,
    dividendCredit,
    afterDividendCredit,
    taxReduction,
    afterReduction,
    healthPremium,
    total: afterReduction + healthPremium,
  };
}

/**
 * The LIF maximum factor (FR-M9): the `ontario.lif.max_factor` row at or below
 * the start-of-year age, the last row (90, 100%) above it. Ages below the
 * table's first row have no Ontario maximum and are an error.
 */
export function ontarioLifMaxFactor(ageAtStartOfYear: number, ctx: YearContext): number {
  const factor = ageTable(ctx, 'ontario.lif.max_factor', ageAtStartOfYear);
  if (factor === undefined) {
    throw new Error(`ontario.lif.max_factor has no row at or below age ${ageAtStartOfYear}`);
  }
  return factor;
}

/**
 * Ontario's Estate Administration Tax: nothing if the estate is at or below
 * `ontario.probate.threshold`, else `ontario.probate.rate` × the value above
 * it. The Act rounds up to each $1,000; that is not modelled.
 */
export function ontarioProbate(estateAssets: number, ctx: YearContext): number {
  const threshold = amount(ctx, 'ontario.probate.threshold');
  if (estateAssets <= threshold) return 0;
  return plain(ctx, 'ontario.probate.rate') * (estateAssets - threshold);
}

export const ontario: Jurisdiction = {
  id: 'ON',
  provincialTax: (income, age, ctx) => ontarioTaxParts(income, age, ctx).total,
  lifMaxFactor: ontarioLifMaxFactor,
  unlockShare: (ctx) => plain(ctx, 'ontario.lif.unlock_share'),
  probate: ontarioProbate,
};
