// Shared screen pieces (design: Screens; docs/designs/mockups/): sections that
// open and close with a summary beside the title, the grey strips that state
// a rule value with an Edit link to Settings, and the spouse names.
import { useState, type ReactNode } from 'react';
import { usePlan } from '../state/react';
import { formatRuleKey } from './rules';

export function Section({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** The parts of the line beside the title. */
  summary?: ReactNode[] | undefined;
  defaultOpen?: boolean | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="section">
      <button
        type="button"
        className="section-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="chev" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="title">{title}</span>
        <span className="summary">
          {summary?.map((part, i) => (
            <span key={i}>{part}</span>
          ))}
        </span>
        <span className="open-label">{open ? 'Close' : 'Open'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

/** A grey strip with a sentence about rule values and, when `editKey` is set, an Edit link to it in Settings. */
export function Strip({
  children,
  editKey,
  editLabel = 'Edit',
}: {
  children: ReactNode;
  editKey?: string | undefined;
  editLabel?: string | undefined;
}) {
  const setView = usePlan((s) => s.setView);
  return (
    <div className="strip">
      <span>{children}</span>
      {editKey && (
        <button type="button" className="link edit" onClick={() => setView('settings', editKey)}>
          {editLabel}
        </button>
      )}
    </div>
  );
}

/** A rule value in use, formatted, with "(changed)" when the plan overrides it. */
export function useRule(key: string): { text: string; changed: boolean } {
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  return { text: formatRuleKey(key, overrides), changed: Boolean(overrides?.[key]) };
}

/** A rule value in bold, as the strips show it. */
export function RuleValue({ ruleKey }: { ruleKey: string }) {
  const r = useRule(ruleKey);
  return (
    <b>
      {r.text}
      {r.changed ? ' (changed)' : ''}
    </b>
  );
}

/** A spouse's display name. */
export function useSpouseName(i: 0 | 1): string {
  return usePlan((s) => s.inputs.spouses[i].name?.trim() || `Spouse ${i + 1}`);
}

export const CLASS_COLOURS: Record<string, string> = {
  cad_equity: '#1E40AF',
  us_equity: '#3B6FD8',
  intl_equity: '#7FA3EA',
  em_equity: '#B9CDF4',
  bonds: '#0F766E',
  cash: '#A8A59C',
};

export const SOURCE_COLOURS: Record<string, string> = {
  work: '#C9C6BE',
  db: '#7C3AED',
  cpp: '#0F766E',
  oas: '#5EBFB3',
  registered: '#1E40AF',
  nonreg: '#D97706',
  tfsa: '#16A34A',
};
