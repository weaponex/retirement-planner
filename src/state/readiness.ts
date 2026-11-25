// Whether a draft plan can run (design file 42, Readiness): it must pass the
// plan schema and its mix must sum to 100. While it fails, the store sends
// nothing to the Worker and the Results tab lists what is missing.
import type { PlanInputs } from '../engine/types';
import { getAt, setAt, type PlanDraft } from './draft';
import { fieldLabel } from './labels';
import { planSchema } from './persistence/planSchema';

export interface Missing {
  /** The input path to focus. */
  path: string;
  message: string;
}

export type Readiness = { ready: true; inputs: PlanInputs } | { ready: false; missing: Missing[] };

/** Fields that only matter in some plans get a neutral value when they are empty and unused. */
function fillUnused(draft: PlanDraft): PlanDraft {
  let d = draft;
  draft.spouses.forEach((s, i) => {
    const working = s.retirementYear !== null && s.retirementYear > draft.planStartYear!;
    if (!working && s.workingMarginalRate === null) {
      d = setAt(d, `spouses.${i}.workingMarginalRate`, 0);
    }
  });
  if (draft.spending.mode === 'by_category' && draft.spending.monthlyTotalToday === null) {
    d = setAt(d, 'spending.monthlyTotalToday', 0);
  }
  return d;
}

/** Turns a zod issue path into an input path: account indexes become account ids. */
function inputPath(draft: PlanDraft, path: (string | number)[]): string {
  if (path[0] === 'accounts' && typeof path[1] === 'number') {
    const id = getAt(draft, `accounts.${path[1]}.id`);
    if (typeof id === 'string') return ['accounts', id, ...path.slice(2)].join('.');
  }
  return path.join('.');
}

export function readyToRun(draft: PlanDraft): Readiness {
  const filled = fillUnused(draft);
  const parsed = planSchema.safeParse(filled);
  if (parsed.success) return { ready: true, inputs: parsed.data as PlanInputs };
  const seen = new Set<string>();
  const missing: Missing[] = [];
  for (const issue of parsed.error.issues) {
    const path = inputPath(filled, issue.path);
    if (seen.has(path)) continue;
    seen.add(path);
    const label = fieldLabel(path, filled);
    const empty = getAt(filled, path) === null;
    missing.push({
      path,
      message: empty ? `${label}: not entered yet` : `${label}: ${issue.message}`,
    });
  }
  return { ready: false, missing };
}
