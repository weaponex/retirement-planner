// "Fill lower brackets first" (design: Withdrawal strategies; SR1-M6). A
// required draw taken before the withdrawal solve: each retired spouse's net
// income before splitting is topped up from their RRSP/RRIF, then LIF, to the
// chosen level, even if spending doesn't need the money. Whatever is still
// needed then follows "registered last". A spouse still working is skipped (C2).
import { amount, brackets } from '../config/read';
import { incomeTotals } from '../jurisdiction/federal';
import type { BracketLevel, Draw, Owner, YearContext, YearInProgress } from '../types';
import { lifRoom, proRata, registeredDraw, remaining, withDraws } from './registeredLast';

/**
 * The level in this year's dollars, from the rule values in use: the top of
 * the lowest federal bracket (the second row's `from`) or the OAS recovery
 * threshold. Both are indexed like their rule values.
 */
export function bracketLevelAmount(level: BracketLevel, ctx: YearContext): number {
  if (level === 'oas_threshold') return amount(ctx, 'federal.oas.recovery.threshold');
  const second = brackets(ctx, 'federal.tax.brackets')[1];
  if (!second)
    throw new Error('federal.tax.brackets needs a second row for the first-bracket level');
  return second.from;
}

/** One spouse's top-up: RRSP/RRIF first (pro rata), then LIF up to its room. */
function topUpSpouse(owner: Owner, want: number, year: YearInProgress, ctx: YearContext): Draw[] {
  const own = year.state.accounts.filter((a) => a.owner === owner);
  const rrsps = own.filter((a) => a.type === 'rrsp' || a.type === 'rrif');
  const first = proRata(
    want,
    rrsps.map((a) => ({ id: a.id, weight: remaining(year, a), capacity: remaining(year, a) })),
  );
  const draws = rrsps
    .filter((a) => first.given.get(a.id)! > 0)
    .map((a) => registeredDraw(year, a, first.given.get(a.id)!, ctx));
  const afterRrsp = withDraws(year, draws);
  const lifs = own.filter((a) => a.type === 'lif');
  const second = proRata(
    first.left,
    lifs.map((a) => ({
      id: a.id,
      weight: lifRoom(afterRrsp, a, ctx),
      capacity: lifRoom(afterRrsp, a, ctx),
    })),
  );
  for (const a of lifs) {
    const v = second.given.get(a.id)!;
    if (v > 0) draws.push(registeredDraw(afterRrsp, a, v, ctx));
  }
  return draws;
}

/**
 * The required top-up draws. Each spouse's income so far counts fixed income,
 * minimums, the non-registered cash yield and gains already realized by the
 * rebalance; the top-up stops exactly at the level. Registered draws add to
 * income dollar for dollar, and at or below the level there is no clawback, so
 * the top-up is the level minus net income.
 */
export function bracketTopUp(year: YearInProgress, level: BracketLevel, ctx: YearContext): Draw[] {
  const target = bracketLevelAmount(level, ctx);
  const draws: Draw[] = [];
  let progress = year;
  for (const owner of [0, 1] as Owner[]) {
    const s = year.state.spouses[owner];
    if (!s.alive || s.working) continue;
    const net = incomeTotals(year.incomeSoFar[owner], ctx).netIncome;
    const want = Math.max(0, target - net);
    if (want <= 0) continue;
    const d = topUpSpouse(owner, want, progress, ctx);
    draws.push(...d);
    progress = withDraws(progress, d);
  }
  return draws;
}
