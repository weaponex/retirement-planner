// "Early RRSP drawdown" (design: Withdrawal strategies; SR1-M4, C2). In the
// draw-down years the spending need is drawn from RRSP/RRIF and LIF first,
// before non-registered savings and the TFSA; after them it follows
// "registered last".
import { incomeTotals } from '../jurisdiction/federal';
import type { Death, Draw, NormalizedInputs, Owner, YearContext, YearInProgress } from '../types';
import { drawRegistered, lifRoom, registeredLast, remaining, withDraws } from './registeredLast';

/**
 * The draw-down years: from the first retirement year up to and including the
 * last year in which a living spouse has a CPP or OAS pension not yet started.
 * A pension starts in the year of its start age (the month after the birthday),
 * so that year counts. A spouse's unstarted benefits stop counting at their death.
 */
export function drawDownYears(inputs: NormalizedInputs, deaths: Death[]): number[] {
  const firstRetirement = Math.min(...inputs.spouses.map((s) => s.retirementYear));
  let last = firstRetirement - 1;
  inputs.spouses.forEach((s, i) => {
    const lastStart = s.birthYear + Math.max(s.cppStartAge, s.oasStartAge);
    const death = deaths.find((d) => d.spouse === i)?.year ?? Infinity;
    last = Math.max(last, Math.min(lastStart, death));
  });
  const years: number[] = [];
  for (let y = firstRetirement; y <= last; y++) years.push(y);
  return years;
}

/** How much one spouse's RRSP/RRIF and LIF can still pay this year. */
function registeredCapacity(owner: Owner, year: YearInProgress, ctx: YearContext): number {
  return year.state.accounts
    .filter((a) => a.owner === owner)
    .reduce((s, a) => {
      if (a.type === 'rrsp' || a.type === 'rrif') return s + remaining(year, a);
      if (a.type === 'lif') return s + lifRoom(year, a, ctx);
      return s;
    }, 0);
}

/**
 * Splits W between the spouses by the fill-up rule: the spouse with the lower
 * net income before splitting first, until the two are equal; then both
 * equally (spouse 1 first when equal). A spouse at capacity passes the rest to
 * the other. A spouse still working or not alive is not drawn from.
 */
export function fillUp(W: number, year: YearInProgress, ctx: YearContext): [number, number] {
  const out: [number, number] = [0, 0];
  const eligible = ([0, 1] as Owner[]).filter(
    (o) => year.state.spouses[o].alive && !year.state.spouses[o].working,
  );
  const cap = (o: Owner) => registeredCapacity(o, year, ctx) - out[o];
  if (eligible.length === 0) return out;
  if (eligible.length === 1) {
    const o = eligible[0]!;
    out[o] = Math.min(W, cap(o));
    return out;
  }
  const net = eligible.map((o) => incomeTotals(year.incomeSoFar[o], ctx).netIncome);
  const low: Owner = net[1]! < net[0]! ? 1 : 0;
  const high: Owner = low === 0 ? 1 : 0;
  let left = W;
  const gap = Math.abs(net[0]! - net[1]!);
  const first = Math.min(left, gap, cap(low));
  out[low] += first;
  left -= first;
  // Then equally, spilling to the other when one is full.
  const half = left / 2;
  const toLow = Math.min(half, cap(low));
  const toHigh = Math.min(left - toLow, cap(high));
  out[low] += toLow;
  out[high] += toHigh;
  left -= toLow + toHigh;
  const extraLow = Math.min(left, cap(low));
  out[low] += extraLow;
  return out;
}

/** The extra withdrawal W: registered first by the fill-up rule in draw-down years, else "registered last". */
export function earlyRrsp(
  W: number,
  year: YearInProgress,
  drawDown: number[],
  ctx: YearContext,
): Draw[] {
  if (!drawDown.includes(year.state.year)) return registeredLast(W, year, ctx);
  const shares = fillUp(W, year, ctx);
  const draws: Draw[] = [];
  let progress = year;
  for (const owner of [0, 1] as Owner[]) {
    if (shares[owner] <= 0) continue;
    const d = drawRegistered(shares[owner], progress, ctx, [owner]).draws;
    draws.push(...d);
    progress = withDraws(progress, d);
  }
  const drawn = draws.reduce((s, d) => s + d.amountNom, 0);
  return [...draws, ...registeredLast(Math.max(0, W - drawn), progress, ctx)];
}

/** True when Early RRSP drawdown has no draw-down years and so is the same as "Registered last". */
export function noDrawDownYears(inputs: NormalizedInputs, deaths: Death[]): boolean {
  return drawDownYears(inputs, deaths).length === 0;
}
