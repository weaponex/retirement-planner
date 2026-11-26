// Pay while working, from gross pay (AR-H5; design: Household). The working
// marginal rate is the combined federal and Ontario rate on the next dollar of
// pay; after-tax pay is gross pay less income tax and the employee's CPP, CPP2
// and EI contributions. The enhanced CPP part (the first additional rate and
// CPP2) is deducted from income (line 22215); the base CPP part and EI premiums
// earn credits at the lowest federal and Ontario rates (lines 30800 and 31200).
// Those credits are taken off after the Ontario surtax, so the surtax is
// slightly overstated for high earners.
import type { Config } from '../config/load';
import { planValue } from '../config/read';
import { lowestRate } from './tables';
import { brackets } from '../config/read';
import { ontario } from '../jurisdiction/ontario';
import { personalTax } from './personalTax';
import { makeDeflator } from '../units';
import type { TaxableIncome, YearContext } from '../types';

/** A working age for the tax: no age amount, no pension credit. */
const WORKING_AGE = 50;
/** The step for the marginal rate. */
const STEP = 100;

export interface Payroll {
  cpp: number;
  cpp2: number;
  ei: number;
  /** The part of the CPP and CPP2 contributions deducted from income. */
  enhancedDeduction: number;
  /** The part that earns a credit (base CPP plus EI). */
  creditAmount: number;
}

/** The employee's CPP, CPP2 and EI contributions on a year's gross pay, in plan-start dollars. */
export function payroll(gross: number, cfg: Config): Payroll {
  const v = (k: string) => planValue(cfg, k);
  const ympe = v('federal.payroll.cpp.ympe');
  const pensionable = Math.max(0, Math.min(gross, ympe) - v('federal.payroll.cpp.basic_exemption'));
  const rate = v('federal.payroll.cpp.rate');
  const baseRate = v('federal.payroll.cpp.base_rate');
  const cpp = pensionable * rate;
  const cpp2 =
    Math.max(0, Math.min(gross, v('federal.payroll.cpp2.ceiling')) - ympe) *
    v('federal.payroll.cpp2.rate');
  const ei = Math.min(gross, v('federal.payroll.ei.max_insurable')) * v('federal.payroll.ei.rate');
  const baseCpp = pensionable * baseRate;
  return { cpp, cpp2, ei, enhancedDeduction: cpp - baseCpp + cpp2, creditAmount: baseCpp + ei };
}

function startContext(cfg: Config): YearContext {
  return { yearIndex: 0, deflator: makeDeflator(cfg), cfg, jurisdiction: ontario };
}

function incomeTax(gross: number, ctx: YearContext, extra = 0): number {
  const p = payroll(gross, ctx.cfg);
  const income: TaxableIncome = {
    pensionEligible: 0,
    oas: 0,
    cpp: 0,
    otherOrdinary: Math.max(0, gross - p.enhancedDeduction) + extra,
    eligibleDividends: 0,
    foreignDividends: 0,
    capitalGains: 0,
  };
  const tax = personalTax(income, WORKING_AGE, ctx.jurisdiction, ctx).total;
  const credit =
    p.creditAmount *
    (lowestRate(brackets(ctx, 'federal.tax.brackets')) +
      lowestRate(brackets(ctx, 'ontario.tax.brackets')));
  return Math.max(0, tax - credit);
}

/** The working marginal rate and after-tax pay from a year's gross pay (plan-start dollars). */
export function payFromGross(
  gross: number,
  cfg: Config,
): { marginalRate: number; afterTax: number } {
  const ctx = startContext(cfg);
  const tax = incomeTax(gross, ctx);
  const p = payroll(gross, cfg);
  // On the next dollar of taxable income, payroll held as it is (the rate an RRSP
  // deduction saves, as in the TurboTax reference).
  const marginalRate = (incomeTax(gross, ctx, STEP) - tax) / STEP;
  return {
    marginalRate: Math.min(1, Math.max(0, marginalRate)),
    afterTax: Math.max(0, gross - tax - p.cpp - p.cpp2 - p.ei),
  };
}
