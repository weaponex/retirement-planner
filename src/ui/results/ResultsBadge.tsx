// The Results tab's badge (design file 47): "Incomplete", "Updating",
// "Error", "Short from <year>" or the warning count.
import { usePlan } from '../../state/react';
import { useStatus } from '../hooks';

export function badgeText(
  status: string,
  firstShortfallYear: number | undefined,
  warnings: number,
): string | undefined {
  if (status === 'incomplete') return 'Incomplete';
  if (status === 'updating') return 'Updating';
  if (status === 'error') return 'Error';
  if (firstShortfallYear !== undefined) return `Short from ${firstShortfallYear}`;
  return warnings > 0 ? String(warnings) : undefined;
}

export function ResultsBadge() {
  const status = useStatus();
  const short = usePlan((s) => s.result?.goals.spending.firstShortfallYear);
  const warnings = usePlan((s) => s.result?.warnings.length ?? 0);
  const text = badgeText(status, short, warnings);
  return text ? <span className={`badge badge-${status}`}>{text}</span> : null;
}
