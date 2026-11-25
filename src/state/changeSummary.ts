// "What your last change did" (design file 42; Components and data flow, Live
// recalculation): the differences in the headline numbers between the result
// a change replaced and the new one, and which edit caused them.
import type { Result } from '../engine/types';
import type { PlanDraft } from './draft';
import { moneyDiff } from './format';
import { fieldLabel } from './labels';

/** Differences under this many dollars are not reported. */
const NOTICEABLE = 1;

export interface ChangeSummary {
  /** "Retirement year, Alex", or "3 changes: …". */
  edit: string;
  /** One short phrase per headline number that changed. */
  changes: string[];
}

/** Names the edit, or counts the edits, behind a result. */
export function describeEdits(paths: string[], draft: PlanDraft): string {
  const labels = [...new Set(paths.map((p) => fieldLabel(p, draft)))];
  if (labels.length === 0) return 'No change';
  if (labels.length === 1) return labels[0]!;
  return `${labels.length} changes: ${labels.join(', ')}`;
}

function amount(name: string, before: number, after: number, higherIs: string, lowerIs: string) {
  const d = after - before;
  if (Math.abs(d) < NOTICEABLE) return undefined;
  return `${name} ${moneyDiff(d)} ${d > 0 ? higherIs : lowerIs}`;
}

export function changeSummary(
  previous: Result,
  current: Result,
  edits: string[],
  draft: PlanDraft,
): ChangeSummary {
  const changes: string[] = [];
  const a = previous.goals;
  const b = current.goals;
  if (a.spending.met !== b.spending.met) {
    changes.push(
      `spending covered: ${a.spending.met ? 'yes' : 'no'} → ${b.spending.met ? 'yes' : 'no'}`,
    );
  }
  if (a.spending.firstShortfallYear !== b.spending.firstShortfallYear) {
    changes.push(
      `first shortfall year ${a.spending.firstShortfallYear ?? 'none'} → ${b.spending.firstShortfallYear ?? 'none'}`,
    );
  }
  const legacy = amount(
    'legacy',
    a.legacy.afterTaxLegacyToday,
    b.legacy.afterTaxLegacyToday,
    'higher',
    'lower',
  );
  if (legacy) changes.push(legacy);
  const tax = amount(
    'tax',
    previous.plan.summary.lifetimeTaxToday,
    current.plan.summary.lifetimeTaxToday,
    'higher',
    'lower',
  );
  if (tax) changes.push(tax);
  const cb0 = previous.plan.summary.clawbackYears;
  const cb1 = current.plan.summary.clawbackYears;
  if (cb0 !== cb1) changes.push(`clawback years ${cb0} → ${cb1}`);
  // Warnings added or cleared join this list in stage 6, when warnings exist.
  return { edit: describeEdits(edits, draft), changes };
}
