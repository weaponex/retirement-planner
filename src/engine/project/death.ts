// Deaths (design: The year solver, step 1; Death and estate). Stage 2 holds the
// first-death transfer only; the final return, same-year deaths and the estate
// arrive in stage 3.
import type { Death, NormalizedInputs, Owner, PlanState } from '../types';
import { deathYear } from '../solver/startOfYear';

/** Each spouse's death, in year order (the first death first; spouse 1 first on the same year). */
export function deaths(inputs: NormalizedInputs): Death[] {
  return ([0, 1] as Owner[])
    .map((spouse) => ({ spouse, year: deathYear(inputs, spouse) }))
    .sort((a, b) => a.year - b.year || a.spouse - b.spouse);
}

/**
 * Applied the year after the first death: every RRSP/RRIF/LIRA/LIF, TFSA and
 * non-registered account keeps its id and type and changes owner (the
 * non-registered account at its original cost; the TFSA as successor holder,
 * using none of the survivor's room). From then on the survivor's age drives
 * minimums, maximums and conversion; `openedYear` and `lifPrevEarningsNom` are
 * kept. The deceased's carried-forward loss is dropped. Their CPP, OAS and DB
 * stop and the survivor benefits start because the deceased is no longer alive.
 */
export function firstDeathTransfer(state: PlanState): PlanState {
  const deceased = ([0, 1] as Owner[]).find((o) => !state.spouses[o].alive);
  if (deceased === undefined) return state;
  const survivor: Owner = deceased === 0 ? 1 : 0;
  const spouses = state.spouses.map((s, i) =>
    i === deceased ? { ...s, carriedLossNom: 0 } : s,
  ) as PlanState['spouses'];
  return {
    ...state,
    spouses,
    accounts: state.accounts.map((a) => (a.owner === deceased ? { ...a, owner: survivor } : a)),
  };
}
