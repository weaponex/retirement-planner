// A money input in today's dollars (design file 49): plain digits while the
// field has focus, comma formatting otherwise, so the cursor never jumps.
import { useState, type ReactNode } from 'react';
import { getAt } from '../../state/draft';
import { usePlan } from '../../state/react';
import { Field } from './Field';

const commas = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 });

/** Parses typed money: digits, commas, a dot and a leading minus are allowed; empty is null. */
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface CurrencyInputProps {
  path: string;
  label: string;
  term?: string | undefined;
  hint?: ReactNode | undefined;
  /** Shown after the input, for example "/ month". */
  suffix?: string | undefined;
}

export function CurrencyInput({ path, label, term, hint, suffix }: CurrencyInputProps) {
  const value = usePlan((s) => getAt(s.inputs, path) as number | null | undefined);
  const setInput = usePlan((s) => s.setInput);
  const [editing, setEditing] = useState<string | null>(null);
  const shown = editing ?? (value === null || value === undefined ? '' : commas.format(value));
  return (
    <Field label={label} term={term} hint={hint} path={path}>
      {(id) => (
        <span className="with-unit">
          <span className="unit">$</span>
          <input
            id={id}
            inputMode="decimal"
            value={shown}
            onFocus={() => setEditing(value === null || value === undefined ? '' : String(value))}
            onBlur={() => setEditing(null)}
            onChange={(e) => {
              setEditing(e.target.value);
              setInput(path, parseMoney(e.target.value));
            }}
          />
          {suffix && <span className="unit">{suffix}</span>}
        </span>
      )}
    </Field>
  );
}
