// "What your last change did" (design file 47).
import { usePlan } from '../../state/react';

export function ChangeSummaryLine() {
  const summary = usePlan((s) => s.summary);
  if (!summary) return null;
  return (
    <span className="change-summary">
      {' · '}What your last change did: {summary.edit}
      {summary.changes.length > 0
        ? ` · ${summary.changes.join(' · ')}`
        : ' · no change to the headline numbers'}
    </span>
  );
}
