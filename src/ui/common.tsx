// Small shared screen pieces: collapsible sections with a summary, and the
// grey strip that shows a rule value with an Edit link to Settings.
import type { ReactNode } from 'react';
import { usePlan } from '../state/react';
import { formatRuleKey } from './rules';

export function Section({
  title,
  summary,
  open,
  children,
}: {
  title: string;
  summary?: ReactNode | undefined;
  open?: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <details className="section" open={open}>
      <summary>
        <span className="section-title">{title}</span>
        {summary && <span className="section-summary">{summary}</span>}
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

/** "TFSA yearly limit: $7,000 · Edit": a rule value in use, with a link to it in Settings. */
export function RuleStrip({ items }: { items: { key: string; label: string }[] }) {
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setView = usePlan((s) => s.setView);
  return (
    <div className="strip">
      {items.map(({ key, label }) => (
        <span key={key} className="strip-item">
          {label}: {formatRuleKey(key, overrides)}
          {overrides?.[key] && <em> (changed)</em>}{' '}
          <button type="button" className="link" onClick={() => setView('settings', key)}>
            Edit
          </button>
        </span>
      ))}
    </div>
  );
}

/** A spouse's display name. */
export function useSpouseName(i: 0 | 1): string {
  return usePlan((s) => s.inputs.spouses[i].name?.trim() || `Spouse ${i + 1}`);
}
