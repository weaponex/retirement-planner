// A province's tax and locked-in account rules. Ontario is the only
// implementation; no Ontario value or rule appears outside its module
// (design: Jurisdiction).
import type { TaxableIncome, YearContext } from '../types';

export interface Jurisdiction {
  id: string;
  /** Provincial tax for one return, including surtax, credits and premiums. */
  provincialTax(income: TaxableIncome, age: number, ctx: YearContext): number;
  /**
   * The LIF maximum factor for an age at the start of the year: the table's row
   * at or below the age, and the last row above it. The LIF rules themselves
   * (minimum, the earnings floor, the opening year) are in `accounts/liraLif.ts`.
   */
  lifMaxFactor(ageAtStartOfYear: number, ctx: YearContext): number;
  /** The share of a LIRA that may be moved to an RRSP/RRIF once, at conversion. */
  unlockShare(ctx: YearContext): number;
  /** Probate (estate administration tax) on the value passing through the estate. */
  probate(estateAssets: number, ctx: YearContext): number;
}
