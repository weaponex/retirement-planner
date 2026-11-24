// "Registered last" (design: Withdrawal strategies, M6): after the required
// minimums, draw non-registered first (pro rata across spouses), then RRSP/RRIF
// and LIF pro rata across both spouses' balances, then the TFSA (pro rata).
// A LIF's share is capped at its room under the LIF maximum; anything over the
// cap comes from the same owner's RRSP/RRIF, then the other spouse's registered
// accounts. A LIRA is never drawn. The helpers here are shared by every strategy.
import { lifLimits } from '../accounts/liraLif';
import { plain } from '../config/read';
import { accountValue, holdingsValue } from '../invest/rebalance';
import type { AccountState, Draw, Owner, YearContext, YearInProgress } from '../types';

/** What is left in an account after this year's draws so far. */
export function remaining(year: YearInProgress, account: AccountState): number {
  const drawn = year.drawsSoFar
    .filter((d) => d.accountId === account.id)
    .reduce((s, d) => s + d.amountNom, 0);
  return Math.max(0, accountValue(account) - drawn);
}

/** The owner's age at the start of the year (the row age − 1), used for RRIF and LIF limits. */
export function startOfYearAge(year: YearInProgress, owner: Owner): number {
  return year.state.spouses[owner].age - 1;
}

/** How much more a LIF may pay this year under its maximum. */
export function lifRoom(year: YearInProgress, account: AccountState, ctx: YearContext): number {
  const { max } = lifLimits(account, startOfYearAge(year, account.owner), year.state.year, ctx);
  const drawn = year.drawsSoFar
    .filter((d) => d.accountId === account.id)
    .reduce((s, d) => s + d.amountNom, 0);
  return Math.max(0, Math.min(max - drawn, remaining(year, account)));
}

/** A draw from a registered account, typed for the pension credit by the owner's age. */
export function registeredDraw(
  year: YearInProgress,
  account: AccountState,
  amountNom: number,
  ctx: YearContext,
): Draw {
  const pensionAge = plain(ctx, 'federal.credits.pension.min_age_rrif');
  const eligible =
    (account.type === 'rrif' || account.type === 'lif') &&
    year.state.spouses[account.owner].age >= pensionAge;
  return {
    accountId: account.id,
    amountNom,
    incomeType: eligible ? 'pensionEligible' : 'otherOrdinary',
    realizedGainNom: 0,
  };
}

/** A non-registered sale at average cost: the gain is amount × (value − cost) ÷ value. */
export function nonregDraw(account: AccountState, amountNom: number): Draw {
  const value = holdingsValue(account.holdings);
  const cost = Object.values(account.holdings).reduce((s, p) => s + p.costNom, 0);
  const gain = value > 0 ? amountNom * ((value - cost) / value) : 0;
  return { accountId: account.id, amountNom, incomeType: 'nonregPrincipal', realizedGainNom: gain };
}

function tfsaDraw(account: AccountState, amountNom: number): Draw {
  return { accountId: account.id, amountNom, incomeType: 'tfsa', realizedGainNom: 0 };
}

/**
 * Spreads `amount` over accounts in proportion to their weights, never above
 * each account's capacity; what doesn't fit is spread again over the accounts
 * with room left. Returns the amount given to each account and what is left over.
 */
export function proRata(
  amount: number,
  items: { id: string; weight: number; capacity: number }[],
): { given: Map<string, number>; left: number } {
  const given = new Map(items.map((i) => [i.id, 0]));
  let left = amount;
  let open = items.filter((i) => i.capacity > 0);
  while (left > 0 && open.length > 0) {
    const weightSum = open.reduce((s, i) => s + (i.weight > 0 ? i.weight : 0), 0);
    const share = (i: (typeof open)[number]) =>
      weightSum > 0 ? (left * Math.max(0, i.weight)) / weightSum : left / open.length;
    let placed = 0;
    const next: typeof open = [];
    for (const i of open) {
      const room = i.capacity - given.get(i.id)!;
      const want = share(i);
      const put = Math.min(want, room);
      given.set(i.id, given.get(i.id)! + put);
      placed += put;
      if (want < room) next.push(i);
    }
    left -= placed;
    if (next.length === open.length || placed <= 0) break;
    open = next;
  }
  return { given, left: Math.max(0, left) };
}

const isRegistered = (a: AccountState) =>
  a.type === 'rrsp' || a.type === 'rrif' || a.type === 'lif';

/** Draws from non-registered accounts pro rata by balance. Returns the draws and what is still needed. */
export function drawNonreg(amount: number, year: YearInProgress): { draws: Draw[]; left: number } {
  const accounts = year.state.accounts.filter((a) => a.type === 'nonreg');
  const { given, left } = proRata(
    amount,
    accounts.map((a) => ({ id: a.id, weight: remaining(year, a), capacity: remaining(year, a) })),
  );
  const draws = accounts
    .filter((a) => given.get(a.id)! > 0)
    .map((a) => nonregDraw(a, given.get(a.id)!));
  return { draws, left };
}

/** Draws from TFSAs pro rata by balance. */
export function drawTfsa(amount: number, year: YearInProgress): { draws: Draw[]; left: number } {
  const accounts = year.state.accounts.filter((a) => a.type === 'tfsa');
  const { given, left } = proRata(
    amount,
    accounts.map((a) => ({ id: a.id, weight: remaining(year, a), capacity: remaining(year, a) })),
  );
  const draws = accounts
    .filter((a) => given.get(a.id)! > 0)
    .map((a) => tfsaDraw(a, given.get(a.id)!));
  return { draws, left };
}

/**
 * Draws from the given owners' RRSP/RRIF and LIF accounts pro rata by balance,
 * each LIF capped at its room; a capped LIF's overflow goes first to the same
 * owner's RRSP/RRIF, then to every other registered account in `owners`.
 */
export function drawRegistered(
  amount: number,
  year: YearInProgress,
  ctx: YearContext,
  owners: Owner[] = [0, 1],
): { draws: Draw[]; left: number } {
  const accounts = year.state.accounts.filter((a) => isRegistered(a) && owners.includes(a.owner));
  const capacity = (a: AccountState) =>
    a.type === 'lif' ? lifRoom(year, a, ctx) : remaining(year, a);
  const total = new Map(accounts.map((a) => [a.id, 0]));
  const add = (given: Map<string, number>) => {
    for (const [id, v] of given) total.set(id, total.get(id)! + v);
  };
  const open = (a: AccountState) => capacity(a) - total.get(a.id)!;

  // Pro rata across all, by balance, each capped at its capacity.
  const first = new Map<string, number>();
  const overflow = new Map<Owner, number>();
  const balanceSum = accounts.reduce((s, a) => s + remaining(year, a), 0);
  let left = amount;
  for (const a of accounts) {
    const want = balanceSum > 0 ? (amount * remaining(year, a)) / balanceSum : 0;
    const put = Math.min(want, capacity(a));
    first.set(a.id, put);
    left -= put;
    if (want > put) overflow.set(a.owner, (overflow.get(a.owner) ?? 0) + want - put);
  }
  add(first);
  // Overflow: same owner's RRSP/RRIF first.
  let unplaced = Math.max(0, left - [...overflow.values()].reduce((s, v) => s + v, 0));
  for (const [owner, extra] of overflow) {
    const own = accounts.filter((a) => a.owner === owner && a.type !== 'lif');
    const r = proRata(
      extra,
      own.map((a) => ({ id: a.id, weight: open(a), capacity: open(a) })),
    );
    add(r.given);
    unplaced += r.left;
  }
  // Then any registered account with room left.
  const rest = proRata(
    unplaced,
    accounts.map((a) => ({ id: a.id, weight: open(a), capacity: open(a) })),
  );
  add(rest.given);
  const draws = accounts
    .filter((a) => total.get(a.id)! > 0)
    .map((a) => registeredDraw(year, a, total.get(a.id)!, ctx));
  return { draws, left: rest.left };
}

/** Everything that can still be drawn this year (LIRAs never; LIFs up to their room). */
export function available(year: YearInProgress, ctx: YearContext): number {
  return year.state.accounts.reduce((sum, a) => {
    if (a.type === 'lira') return sum;
    if (a.type === 'lif') return sum + lifRoom(year, a, ctx);
    return sum + remaining(year, a);
  }, 0);
}

/** Adds draws to the year in progress. */
export function withDraws(year: YearInProgress, draws: Draw[]): YearInProgress {
  return { ...year, drawsSoFar: [...year.drawsSoFar, ...draws] };
}

/** The extra withdrawal W in "registered last" order. */
export function registeredLast(W: number, year: YearInProgress, ctx: YearContext): Draw[] {
  const nonreg = drawNonreg(W, year);
  const afterNonreg = withDraws(year, nonreg.draws);
  const reg = drawRegistered(nonreg.left, afterNonreg, ctx);
  const tfsa = drawTfsa(reg.left, withDraws(afterNonreg, reg.draws));
  return [...nonreg.draws, ...reg.draws, ...tfsa.draws];
}
