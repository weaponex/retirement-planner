// Ontario tax for one person's return, following Form ON428 Part C
// (design: Order of the Ontario calculation).
import { amount, brackets, list, phaseIn, plain } from '../config/read';
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

export const ontario: Jurisdiction = {
  id: 'ON',
  provincialTax: (income, age, ctx) => ontarioTaxParts(income, age, ctx).total,
};
