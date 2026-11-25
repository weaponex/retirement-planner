// The Results tab's badge (design file 47; mockups Main, States): the warning
// count in amber, "Updating" or "Incomplete" in grey, "Short from <year>" and
// "Error" in red.
import { usePlan } from '../../state/react';
import { useStatus } from '../hooks';

export function badgeText(
  status: string,
  firstShortfallYear: number | undefined,
  warnings: number,
): { text: string; kind: string } | undefined {
  if (status === 'incomplete') return { text: 'Incomplete', kind: 'incomplete' };
  if (status === 'updating') return { text: 'Updating', kind: 'updating' };
  if (status === 'error') return { text: 'Error', kind: 'error' };
  if (firstShortfallYear !== undefined)
    return { text: `Short from ${firstShortfallYear}`, kind: 'short' };
  return warnings > 0 ? { text: String(warnings), kind: 'warnings' } : undefined;
}

export function ResultsBadge() {
  const status = useStatus();
  const short = usePlan((s) => s.result?.goals.spending.firstShortfallYear);
  const warnings = usePlan((s) => s.result?.warnings.length ?? 0);
  const b = badgeText(status, short, warnings);
  if (!b) return null;
  return (
    <span className={`badge badge-${b.kind}`}>
      {b.kind === 'updating' && <span className="dot" aria-hidden="true" />}
      {b.text}
    </span>
  );
}
