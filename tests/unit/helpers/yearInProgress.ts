// Builds a YearInProgress for withdrawal tests. Not a test file.
import type {
  AccountState,
  PlanState,
  SpouseYearState,
  TaxableIncome,
  YearInProgress,
} from '../../../src/engine/types';
import { spouseState } from './accounts';
import { normalized, zeroIncome } from './couplePlan';

export function yearInProgress(
  accounts: AccountState[],
  spouses: [Partial<SpouseYearState>, Partial<SpouseYearState>] = [{}, {}],
  incomes: [Partial<TaxableIncome>, Partial<TaxableIncome>] = [{}, {}],
  year = 2030,
): YearInProgress {
  const state: PlanState = {
    year,
    yearIndex: year - 2026,
    spouses: [spouseState(spouses[0]), spouseState(spouses[1])],
    accounts,
    splitShare: { from: 0, share: 0 },
  };
  return {
    state,
    inputs: normalized(),
    incomeSoFar: [
      { ...zeroIncome(), ...incomes[0] },
      { ...zeroIncome(), ...incomes[1] },
    ],
    drawsSoFar: [],
  };
}

export const total = (draws: { amountNom: number }[]) => draws.reduce((s, d) => s + d.amountNom, 0);
export const byAccount = (draws: { accountId: string; amountNom: number }[]) =>
  draws.reduce<Record<string, number>>((m, d) => {
    m[d.accountId] = (m[d.accountId] ?? 0) + d.amountNom;
    return m;
  }, {});
