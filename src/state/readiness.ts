// Whether a draft plan can run (design file 42, Readiness): it must pass the
// plan schema and its mix must sum to 100. While it fails, the store sends
// nothing to the Worker and the Results tab lists what is missing.
import type { Config } from '../engine/config/load';
import { planValue } from '../engine/config/read';
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

/** Optional fields left empty, which mean "not used" rather than "missing". */
const EMPTY_MEANS_NONE = ['arrivedInCanadaYear', 'grossPayToday'] as const;

/** Fields that only matter in some plans get a neutral value when they are empty and unused. */
function fillUnused(draft: PlanDraft, cfg?: Config): PlanDraft {
  let d = draft;
  draft.spouses.forEach((s, i) => {
    const working = s.retirementYear !== null && s.retirementYear > draft.planStartYear!;
    if (!working && s.workingMarginalRate === null) {
      d = setAt(d, `spouses.${i}.workingMarginalRate`, 0);
    }
    const spouse = { ...d.spouses[i] } as Record<string, unknown>;
    let changed = false;
    for (const k of EMPTY_MEANS_NONE) {
      // Gross pay is missing, not unused, while the spouse still works.
      if (k === 'grossPayToday' && working) continue;
      if (k in spouse && spouse[k] === null) {
        delete spouse[k];
        changed = true;
      }
    }
    // An empty CPP estimate uses the default: the average at 65 (AR-H2).
    if (cfg && 'cppAtStartToday' in spouse && spouse.cppAtStartToday === null) {
      delete spouse.cppAtStartToday;
      spouse.cppAt65Today = planValue(cfg, 'federal.cpp.average_at_65');
      changed = true;
    }
    if (changed) {
      const spouses = [...d.spouses] as PlanDraft['spouses'];
      spouses[i] = spouse as PlanDraft['spouses'][number];
      d = { ...d, spouses };
    }
  });
  const groups = draft.spending.groupsMonthlyToday;
  if (groups && Object.values(groups).some((v) => v === null)) {
    d = setAt(
      d,
      'spending.groupsMonthlyToday',
      Object.fromEntries(Object.entries(groups).filter(([, v]) => v !== null)),
    );
  }
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

export function readyToRun(draft: PlanDraft, cfg?: Config): Readiness {
  const filled = fillUnused(draft, cfg);
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
