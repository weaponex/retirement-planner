// The year's spending need (design: Data contracts, Spending need; Spending
// inputs). The active-years need is 12 × the monthly total; the slower and later
// phases keep `keepPct` of it, or use a category's own later amount. Zero before
// the first retirement; × the survivor percentage after the first death.
import { MONTHS_PER_YEAR } from '../constants';
import type { NormalizedInputs, PlanState, YearContext } from '../types';
import { firstRetirementYear } from '../solver/startOfYear';

/** 0 = active years, 1 = slower years, 2 = later years. */
export function phaseIndex(inputs: NormalizedInputs, year: number): 0 | 1 | 2 {
  const t = year - firstRetirementYear(inputs);
  const [slower, later] = inputs.spending.phases;
  if (t >= later.fromYear) return 2;
  if (t >= slower.fromYear) return 1;
  return 0;
}

/** The monthly need for a phase, in plan-start dollars. */
export function monthlyNeed(inputs: NormalizedInputs, phase: 0 | 1 | 2): number {
  const s = inputs.spending;
  const keep = phase === 0 ? 1 : s.phases[phase - 1]!.keepPct / 100;
  if (s.mode === 'one_total') return s.monthlyTotalNom * keep;
  return Object.values(s.categories).reduce((sum, c) => {
    const own = phase === 0 ? null : (c.laterOverrideNom?.[phase - 1] ?? null);
    return sum + (own ?? c.monthlyNom * keep);
  }, 0);
}

export function spendingNeed(inputs: NormalizedInputs, state: PlanState, ctx: YearContext): number {
  if (state.year < firstRetirementYear(inputs)) return 0;
  const yearly =
    MONTHS_PER_YEAR *
    monthlyNeed(inputs, phaseIndex(inputs, state.year)) *
    ctx.deflator(ctx.yearIndex);
  const afterDeath =
    state.firstDeathYear !== undefined && state.year > state.firstDeathYear
      ? inputs.estate.survivorPct / 100
      : 1;
  return yearly * afterDeath;
}
