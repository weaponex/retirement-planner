// A whole-number input for ages, years and counts (design file 49).
import type { ReactNode } from 'react';
import { getAt } from '../../state/draft';
import { usePlan } from '../../state/react';
import { Field } from './Field';

export function parseWhole(text: string): number | null {
  const cleaned = text.trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isInteger(n) ? n : null;
}

export interface AgeInputProps {
  path: string;
  label: string;
  term?: string | undefined;
  hint?: ReactNode | undefined;
  min?: number | undefined;
  max?: number | undefined;
}

export function AgeInput({ path, label, term, hint, min, max }: AgeInputProps) {
  const value = usePlan((s) => getAt(s.inputs, path) as number | null | undefined);
  const setInput = usePlan((s) => s.setInput);
  return (
    <Field label={label} term={term} hint={hint} path={path}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(e) => setInput(path, parseWhole(e.target.value))}
        />
      )}
    </Field>
  );
}
