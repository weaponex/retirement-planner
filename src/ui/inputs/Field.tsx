// A labelled field (design file 49): the label sits above the input, with an
// optional glossary tooltip and hint; the message line keeps its height, so a
// message never shifts the layout.
import { useId, type ReactNode } from 'react';
import { GLOSSARY } from '../content/glossary';
import { getAt } from '../../state/draft';
import { usePlan } from '../../state/react';

export interface FieldProps {
  label: string;
  /** A glossary term shown as a tooltip on the label. */
  term?: string | undefined;
  hint?: ReactNode | undefined;
  /** The input path, to show the readiness message for it. */
  path?: string | undefined;
  children: (id: string) => ReactNode;
}

export function Field({ label, term, hint, path, children }: FieldProps) {
  const id = useId();
  // An empty field shows its message only once it was edited or linked to;
  // a value that breaks a rule shows it at once.
  const message = usePlan((s) => {
    if (!path) return undefined;
    const m = s.missing.find((x) => x.path === path);
    if (!m) return undefined;
    const empty = getAt(s.inputs, path) === null;
    return !empty || s.focus === path || s.edits.includes(path) ? m.message : undefined;
  });
  const tip = term ? GLOSSARY[term] : undefined;
  return (
    <div className="field" data-path={path}>
      <label htmlFor={id} title={tip}>
        {label}
        {tip && (
          <span className="term" aria-hidden="true">
            {' '}
            ⓘ
          </span>
        )}
      </label>
      {children(id)}
      {hint && <div className="hint">{hint}</div>}
      <div className="message" role={message ? 'alert' : undefined}>
        {message ?? ''}
      </div>
    </div>
  );
}

/** A bound text input. */
export function TextInput({ path, label }: { path: string; label: string }) {
  const value = usePlan((s) => {
    const parts = path.split('.');
    let node: unknown = s.inputs;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    return typeof node === 'string' ? node : '';
  });
  const setInput = usePlan((s) => s.setInput);
  return (
    <Field label={label} path={path}>
      {(id) => (
        <input id={id} type="text" value={value} onChange={(e) => setInput(path, e.target.value)} />
      )}
    </Field>
  );
}
