// Builds one spouse's TaxableIncome for the year (design file 26's filling
// rule): DB at any age and RRIF/LIF payments from the pension-credit age go to
// `pensionEligible`; RRSP and LIRA withdrawals, RRIF/LIF below that age and
// interest go to `otherOrdinary`. Capital gains are the year's realized gains
// after same-year losses and any carried-forward loss.
import { netGains } from '../accounts/nonRegistered';
import type { CashYield } from '../accounts/nonRegistered';
import type { Draw, TaxableIncome } from '../types';

export interface FixedIncome {
  cpp: number;
  oas: number;
  /** DB lifetime and bridge payments. */
  db: number;
  /** CPP survivor benefit. */
  survivorCpp: number;
  /** DB survivor shares. */
  survivorDb: number;
  /** After-tax pay of a spouse still working: cash, not taxable income. */
  pay: number;
}

export const noFixedIncome = (): FixedIncome => ({
  cpp: 0,
  oas: 0,
  db: 0,
  survivorCpp: 0,
  survivorDb: 0,
  pay: 0,
});

export const noCashYield = (): CashYield => ({
  interest: 0,
  eligibleDividends: 0,
  foreignDividends: 0,
  total: 0,
});

/**
 * `draws` are this spouse's draws, already typed by the owner's age
 * (`registeredDraw`), so no rule value is read here;
 * `realizedGains` is the rebalance's realized gain for this spouse, to which
 * the draws' own gains are added before the carried-forward loss is applied.
 */
export function assembleIncome(
  spouse: { carriedLossNom: number },
  fixed: FixedIncome,
  draws: Draw[],
  cashYield: CashYield,
  realizedGains: number,
): TaxableIncome {
  let pensionEligible = fixed.db + fixed.survivorDb;
  let otherOrdinary = cashYield.interest;
  let gains = realizedGains;
  for (const d of draws) {
    if (d.incomeType === 'pensionEligible') pensionEligible += d.amountNom;
    else if (d.incomeType === 'otherOrdinary') otherOrdinary += d.amountNom;
    gains += d.realizedGainNom;
  }
  return {
    pensionEligible,
    oas: fixed.oas,
    cpp: fixed.cpp + fixed.survivorCpp,
    otherOrdinary,
    eligibleDividends: cashYield.eligibleDividends,
    foreignDividends: cashYield.foreignDividends,
    capitalGains: netGains(gains, spouse.carriedLossNom).taxableGain,
  };
}

/** Pension income this spouse could split: DB at any age, RRIF/LIF from the split age. */
export function splitEligible(
  fixed: FixedIncome,
  draws: Draw[],
  accountTypes: ReadonlyMap<string, string>,
  age: number,
  splitAge: number,
): number {
  const rrifLif =
    age >= splitAge
      ? draws
          .filter((d) => {
            const t = accountTypes.get(d.accountId);
            return t === 'rrif' || t === 'lif';
          })
          .reduce((s, d) => s + d.amountNom, 0)
      : 0;
  return fixed.db + fixed.survivorDb + rrifLif;
}
