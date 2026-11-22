// A province's tax rules. Ontario is the only implementation; no Ontario value
// or rule appears outside its module (design: Jurisdiction).
import type { TaxableIncome, YearContext } from '../types';

export interface Jurisdiction {
  id: string;
  /** Provincial tax for one return, including surtax, credits and premiums. */
  provincialTax(income: TaxableIncome, age: number, ctx: YearContext): number;
  // Added in later stages (design file 27): probate (stage 3), lifLimits and
  // unlockShare (stage 2).
}
