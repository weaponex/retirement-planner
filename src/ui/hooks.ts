// Hooks the screens share.
import { useMemo } from 'react';
import { usePlan } from '../state/react';
import { statusOf } from '../state/store';
import type { ToToday } from './charts/data';
import { todayIn } from './config';

/** Converts the result's future dollars to today's dollars for this plan. */
export function useToday(): ToToday {
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const start = usePlan((s) => s.result?.plan.rows[0]?.year ?? s.inputs.planStartYear ?? 0);
  return useMemo(() => todayIn(overrides, start), [overrides, start]);
}

export function useStatus() {
  return usePlan((s) => statusOf(s));
}
