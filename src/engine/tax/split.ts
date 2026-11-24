// Pension income splitting (design: Withdrawal strategies, Pension income
// splitting; M13, C2). Eligible pension income is DB payments at any age, and
// RRIF and LIF payments when the transferring spouse is at least
// `federal.split.min_age_rrif`. The search tries 0 up to
// `federal.split.max_share` in `SPLIT_STEP` steps, in both directions, and keeps
// the lowest household tax; ties go to the smaller transfer, then to spouse 1
// transferring.
import { SPLIT_STEP } from '../constants';
import { plain } from '../config/read';
import type { Owner, SplitChoice, TaxableIncome, YearContext } from '../types';
import { incomeTotals } from '../jurisdiction/federal';
import { personalTax } from './personalTax';

export interface SplitSpouse {
  income: TaxableIncome;
  age: number;
  /** Eligible pension income this spouse could transfer. */
  eligible: number;
  /** A spouse who is working or not alive is left out of splitting. */
  excluded: boolean;
  /** Tax for a spouse outside `personalTax` (a working spouse); undefined uses `personalTax`. */
  flatRate?: number;
}

/** Moves `amount` of eligible pension income from one return to the other. */
export function transfer(
  from: TaxableIncome,
  to: TaxableIncome,
  amount: number,
): [TaxableIncome, TaxableIncome] {
  const fromPension = Math.min(amount, from.pensionEligible);
  const fromOther = amount - fromPension;
  return [
    {
      ...from,
      pensionEligible: from.pensionEligible - fromPension,
      otherOrdinary: from.otherOrdinary - fromOther,
    },
    { ...to, pensionEligible: to.pensionEligible + amount },
  ];
}

/** Income taxed at a flat rate: every amount received, with gains at the inclusion rate. */
export function flatTaxable(income: TaxableIncome, ctx: YearContext): number {
  return Math.max(
    0,
    income.pensionEligible +
      income.oas +
      income.cpp +
      income.otherOrdinary +
      income.eligibleDividends +
      income.foreignDividends +
      income.capitalGains * plain(ctx, 'federal.capital_gains.inclusion_rate'),
  );
}

export interface SpouseTax {
  total: number;
  clawback: number;
  taxableIncome: number;
}

/** One spouse's tax: at a flat rate for a working spouse, else `personalTax`. */
export function spouseTax(s: SplitSpouse, income: TaxableIncome, ctx: YearContext): SpouseTax {
  if (s.flatRate !== undefined) {
    const taxableIncome = flatTaxable(income, ctx);
    return { total: taxableIncome * s.flatRate, clawback: 0, taxableIncome };
  }
  const t = personalTax(income, s.age, ctx.jurisdiction, ctx);
  return {
    total: t.total,
    clawback: t.clawback,
    taxableIncome: incomeTotals(income, ctx).taxableIncome,
  };
}

/** Both spouses' incomes after applying a split choice. */
export function applySplit(
  a: SplitSpouse,
  b: SplitSpouse,
  choice: SplitChoice,
): [TaxableIncome, TaxableIncome] {
  const spouses = [a, b];
  const from = spouses[choice.from]!;
  const to = spouses[1 - choice.from]!;
  if (choice.share <= 0 || from.excluded || to.excluded) return [a.income, b.income];
  const [fromIncome, toIncome] = transfer(from.income, to.income, choice.share * from.eligible);
  return choice.from === 0 ? [fromIncome, toIncome] : [toIncome, fromIncome];
}

export function householdTax(
  a: SplitSpouse,
  b: SplitSpouse,
  choice: SplitChoice,
  ctx: YearContext,
): [SpouseTax, SpouseTax] {
  const [ia, ib] = applySplit(a, b, choice);
  return [spouseTax(a, ia, ctx), spouseTax(b, ib, ctx)];
}

/** The split choices searched, in tie-break order: 0, then each step for spouse 1 then spouse 2. */
export function splitChoices(ctx: YearContext): SplitChoice[] {
  const max = plain(ctx, 'federal.split.max_share');
  const steps = Math.round(max / SPLIT_STEP);
  const out: SplitChoice[] = [{ from: 0, share: 0 }];
  for (let k = 1; k <= steps; k++) {
    for (const from of [0, 1] as Owner[]) out.push({ from, share: k * SPLIT_STEP });
  }
  return out;
}

export interface BestSplit extends SplitChoice {
  householdTax: number;
}

/** The split with the lowest household tax (2 × (max ÷ step) + 1 points). */
export function bestSplit(a: SplitSpouse, b: SplitSpouse, ctx: YearContext): BestSplit {
  let best: BestSplit = { from: 0, share: 0, householdTax: Infinity };
  for (const choice of splitChoices(ctx)) {
    const spouses = [a, b];
    const from = spouses[choice.from]!;
    if (
      choice.share > 0 &&
      (from.excluded || spouses[1 - choice.from]!.excluded || from.eligible <= 0)
    )
      continue;
    const [ta, tb] = householdTax(a, b, choice, ctx);
    const total = ta.total + tb.total;
    if (total < best.householdTax) best = { ...choice, householdTax: total };
  }
  return best;
}
