// Step 0 of the year solver (design: The year solver): on January 1, convert
// an RRSP to a RRIF or a LIRA to a LIF in the year the owner reaches their
// conversion age (applying the optional unlock), and add the yearly TFSA limit
// and last year's TFSA withdrawals to each spouse's room. Also the yearly
// bookkeeping of ages and who is alive.
import { convertLira } from '../accounts/liraLif';
import { convertRrsp } from '../accounts/rrspRrif';
import { addYearlyRoom } from '../accounts/tfsa';
import { buy, currentWeights, emptyHoldings, type Weights } from '../invest/rebalance';
import type {
  AccountState,
  NormalizedInputs,
  Owner,
  PlanState,
  SpouseYearState,
  YearContext,
} from '../types';

const ALL_CASH: Weights = {
  cad_equity: 0,
  us_equity: 0,
  intl_equity: 0,
  em_equity: 0,
  bonds: 0,
  cash: 1,
};

/** The year a spouse dies: the end of the year they reach their target age. */
export function deathYear(inputs: NormalizedInputs, spouse: Owner): number {
  const s = inputs.spouses[spouse];
  return s.birthYear + s.lifeExpectancyTarget;
}

/** The first retirement year: household spending starts here. */
export function firstRetirementYear(inputs: NormalizedInputs): number {
  return Math.min(inputs.spouses[0].retirementYear, inputs.spouses[1].retirementYear);
}

/** The last year of the plan: the second death. */
export function lastYear(inputs: NormalizedInputs): number {
  return Math.max(deathYear(inputs, 0), deathYear(inputs, 1));
}

/** A spouse's state for `year`: age reached that year, alive through their death year, working before retirement. */
export function spouseForYear(
  prev: SpouseYearState,
  inputs: NormalizedInputs,
  owner: Owner,
  year: number,
): SpouseYearState {
  const s = inputs.spouses[owner];
  return {
    ...prev,
    age: year - s.birthYear,
    alive: year <= deathYear(inputs, owner),
    working: year < s.retirementYear,
  };
}

/** The next id for a new account of `type` owned by `owner`: `<type>-<owner>-<n>`. */
export function nextAccountId(accounts: AccountState[], type: string, owner: Owner): string {
  const prefix = `${type}-${owner}-`;
  const used = accounts
    .map((a) => a.id)
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

/** Moves an unlocked amount into the owner's first RRSP/RRIF, or a new RRIF opened this year. */
function placeUnlocked(
  accounts: AccountState[],
  owner: Owner,
  unlocked: number,
  weights: Weights,
  year: number,
): AccountState[] {
  const target = accounts
    .filter((a) => a.owner === owner && (a.type === 'rrsp' || a.type === 'rrif'))
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (target) {
    return accounts.map((a) =>
      a.id === target.id
        ? { ...a, holdings: buy(a.holdings, unlocked, currentWeights(a.holdings, weights)) }
        : a,
    );
  }
  const created: AccountState = {
    id: nextAccountId(accounts, 'rrsp', owner),
    owner,
    type: 'rrif',
    holdings: buy(emptyHoldings(), unlocked, weights),
    openedYear: year,
  };
  return [...accounts, created];
}

export function startOfYear(state: PlanState, ctx: YearContext): PlanState {
  let accounts: AccountState[] = [];
  const unlocks: { owner: Owner; amount: number; weights: Weights }[] = [];
  for (const a of state.accounts) {
    const age = state.spouses[a.owner].age;
    if (a.type === 'rrsp') {
      accounts.push(convertRrsp(a, age, state.year, ctx));
    } else if (a.type === 'lira') {
      // A LIRA that unlocks holds money, so its own weights always apply.
      const weights = currentWeights(a.holdings, ALL_CASH);
      const { account, unlocked } = convertLira(a, age, state.year, ctx);
      accounts.push(account);
      if (unlocked > 0) unlocks.push({ owner: a.owner, amount: unlocked, weights });
    } else {
      accounts.push(a);
    }
  }
  for (const u of unlocks)
    accounts = placeUnlocked(accounts, u.owner, u.amount, u.weights, state.year);
  const spouses = state.spouses.map((s) =>
    s.alive ? addYearlyRoom(s, ctx) : s,
  ) as PlanState['spouses'];
  return { ...state, accounts, spouses };
}
