// A percent input (design file 49). `stored: 'fraction'` keeps 0.3 for 30%;
// `stored: 'percent'` keeps 30.
import { useState, type ReactNode } from 'react';
import { getAt } from '../../state/draft';
import { usePlan } from '../../state/react';
import { Field } from './Field';

const PERCENT = 100;

export function parsePercent(text: string, stored: 'fraction' | 'percent'): number | null {
  const cleaned = text.replace(/[%\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return stored === 'fraction' ? n / PERCENT : n;
}

export function shownPercent(value: number | null | undefined, stored: 'fraction' | 'percent') {
  if (value === null || value === undefined) return '';
  const p = stored === 'fraction' ? value * PERCENT : value;
  return String(Math.round(p * PERCENT) / PERCENT);
}

export interface PercentInputProps {
  path: string;
  label: string;
  stored: 'fraction' | 'percent';
  term?: string | undefined;
  hint?: ReactNode | undefined;
}

export function PercentInput({ path, label, stored, term, hint }: PercentInputProps) {
  const value = usePlan((s) => getAt(s.inputs, path) as number | null | undefined);
  const setInput = usePlan((s) => s.setInput);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Field label={label} term={term} hint={hint} path={path}>
      {(id) => (
        <span className="with-unit">
          <input
            id={id}
            inputMode="decimal"
            value={editing ?? shownPercent(value, stored)}
            onFocus={() => setEditing(shownPercent(value, stored))}
            onBlur={() => setEditing(null)}
            onChange={(e) => {
              setEditing(e.target.value);
              setInput(path, parsePercent(e.target.value, stored));
            }}
          />
          <span className="unit">%</span>
        </span>
      )}
    </Field>
  );
}
