// Deaths and the estate (design: The year solver, steps 1 and 8; Death and
// estate). The first-death transfer applies the year after the first death; in
// the second death year the final return and the estate are worked out on the
// end-of-year balances.
import { ASSET_CLASSES } from '../config/keys';
import { accountValue } from '../invest/rebalance';
import { personalTax } from '../tax/personalTax';
import type {
  Death,
  EstateYear,
  NormalizedInputs,
  Owner,
  PlanState,
  TaxableIncome,
  YearContext,
} from '../types';
import { deathYear } from '../solver/startOfYear';

/** Each spouse's death, in year order (the first death first; spouse 1 first on the same year). */
export function deaths(inputs: NormalizedInputs): [Death, Death] {
  return ([0, 1] as Owner[])
    .map((spouse) => ({ spouse, year: deathYear(inputs, spouse) }))
    .sort((a, b) => a.year - b.year || a.spouse - b.spouse) as [Death, Death];
}

/**
 * Every account of `from` keeps its id and type and passes to `to` (the
 * non-registered account at its original cost; the TFSA as successor holder,
 * using none of `to`'s room). `from`'s carried-forward loss is dropped.
 */
export function transferAccounts(state: PlanState, from: Owner, to: Owner): PlanState {
  const spouses = state.spouses.map((s, i) =>
    i === from ? { ...s, carriedLossNom: 0 } : s,
  ) as PlanState['spouses'];
  return {
    ...state,
    spouses,
    accounts: state.accounts.map((a) => (a.owner === from ? { ...a, owner: to } : a)),
  };
}

/**
 * Applied the year after the first death. From then on the survivor's age
 * drives minimums, maximums and conversion; `openedYear` and
 * `lifPrevEarningsNom` are kept. The deceased's CPP, OAS and DB stop and the
 * survivor benefits start because the deceased is no longer alive.
 */
export function firstDeathTransfer(state: PlanState): PlanState {
  const deceased = ([0, 1] as Owner[]).find((o) => !state.spouses[o].alive);
  if (deceased === undefined) return state;
  return transferAccounts(state, deceased, deceased === 0 ? 1 : 0);
}

const REGISTERED = new Set(['rrsp', 'rrif', 'lira', 'lif']);

export type FinalReturn = Pick<
  EstateYear,
  'deemedRegisteredNom' | 'deemedGainsNom' | 'finalReturnTaxNom'
>;

/**
 * The final return (T10): the deceased's income for the year (after any split)
 * plus the deemed income, taxed once with `personalTax`, the clawback
 * recomputed. Deemed income is every RRSP, RRIF, LIRA and LIF balance, as
 * `otherOrdinary`, and the deemed sale of every non-registered position, after
 * the carried-forward loss (a net deemed loss is not used). The final-return
 * tax is that tax minus the tax the year already settled for the deceased.
 */
export function finalReturn(
  deceased: Owner,
  endState: PlanState,
  yearIncome: TaxableIncome,
  yearTax: number,
  ctx: YearContext,
): FinalReturn {
  let deemedRegisteredNom = 0;
  let rawGains = 0;
  for (const a of endState.accounts) {
    if (REGISTERED.has(a.type)) deemedRegisteredNom += accountValue(a);
    if (a.type === 'nonreg') {
      for (const cls of ASSET_CLASSES)
        rawGains += a.holdings[cls].valueNom - a.holdings[cls].costNom;
    }
  }
  const deemedGainsNom = Math.max(0, rawGains - endState.spouses[deceased].carriedLossNom);
  const full: TaxableIncome = {
    ...yearIncome,
    otherOrdinary: yearIncome.otherOrdinary + deemedRegisteredNom,
    capitalGains: yearIncome.capitalGains + deemedGainsNom,
  };
  const total = personalTax(full, endState.spouses[deceased].age, ctx.jurisdiction, ctx).total;
  return { deemedRegisteredNom, deemedGainsNom, finalReturnTaxNom: total - yearTax };
}

/**
 * The estate (O23): the final-return tax is paid first; probate applies to the
 * non-registered balances and the home (registered accounts and TFSAs name a
 * beneficiary); the after-tax legacy is every balance plus the home, less both.
 */
export function estate(
  endState: PlanState,
  finalReturnTaxNom: number,
  inputs: NormalizedInputs,
  ctx: YearContext,
): Pick<EstateYear, 'homeNom' | 'probateNom' | 'afterTaxLegacyNom'> {
  const homeNom = (inputs.estate.homeValueNom ?? 0) * ctx.deflator(ctx.yearIndex);
  let all = 0;
  let nonreg = 0;
  for (const a of endState.accounts) {
    const v = accountValue(a);
    all += v;
    if (a.type === 'nonreg') nonreg += v;
  }
  const base = Math.max(0, nonreg + homeNom - finalReturnTaxNom);
  const probateNom = ctx.jurisdiction.probate(base, ctx);
  return { homeNom, probateNom, afterTaxLegacyNom: all + homeNom - finalReturnTaxNom - probateNom };
}

/**
 * The second death year's estate fields. If both spouses die that year, the
 * first-death rollover moves the first one's accounts to the other first.
 */
export function secondDeath(
  endState: PlanState,
  taxed: [{ income: TaxableIncome; tax: number }, { income: TaxableIncome; tax: number }],
  inputs: NormalizedInputs,
  ctx: YearContext,
): EstateYear {
  const [first, second] = deaths(inputs);
  const state =
    first.year === second.year ? transferAccounts(endState, first.spouse, second.spouse) : endState;
  const deceased = second.spouse;
  const fr = finalReturn(deceased, state, taxed[deceased].income, taxed[deceased].tax, ctx);
  return { ...fr, ...estate(state, fr.finalReturnTaxNom, inputs, ctx) };
}
