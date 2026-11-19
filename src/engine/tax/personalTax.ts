// One person's tax for one year: federal, provincial and the OAS recovery tax.
import { federalTax } from '../jurisdiction/federal';
import type { Jurisdiction } from '../jurisdiction/types';
import type { TaxableIncome, YearContext } from '../types';

export interface PersonalTax {
  /** Line 42000, without the clawback. */
  federal: number;
  /** Line 42800, including any provincial premium. */
  provincial: number;
  /** OAS recovery tax (line 42200). */
  clawback: number;
  total: number;
}

export function personalTax(
  income: TaxableIncome,
  age: number,
  jurisdiction: Jurisdiction,
  ctx: YearContext,
): PersonalTax {
  const fed = federalTax(income, age, ctx);
  const provincial = jurisdiction.provincialTax(income, age, ctx);
  return {
    federal: fed.tax,
    provincial,
    clawback: fed.clawback,
    total: fed.tax + provincial + fed.clawback,
  };
}
