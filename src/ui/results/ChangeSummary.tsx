// "Last change: …" in the summary row under the goals (design file 47; mockup
// Results).
import { usePlan } from '../../state/react';

export function ChangeSummaryLine() {
  const summary = usePlan((s) => s.summary);
  if (!summary) return null;
  return (
    <span className="change-summary">
      Last change: {summary.edit}
      {summary.changes.length > 0
        ? ` · ${summary.changes.join(' · ')}`
        : ' · no change to the headline numbers'}
    </span>
  );
}
