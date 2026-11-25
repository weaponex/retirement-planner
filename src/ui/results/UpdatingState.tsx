// While a run is in progress the previous figures stay, faded, under
// "Updating…" (design file 47). There is no Recalculate button.
import type { ReactNode } from 'react';
import { useStatus } from '../hooks';

export function UpdatingState({ children }: { children: ReactNode }) {
  const status = useStatus();
  const updating = status === 'updating';
  return (
    <div className={updating ? 'updating-wrap updating' : 'updating-wrap'} aria-busy={updating}>
      {updating && <div className="updating-label">Updating…</div>}
      {children}
    </div>
  );
}

export function StatusLine() {
  const status = useStatus();
  const text =
    status === 'incomplete'
      ? 'Enter the missing details to see results'
      : status === 'updating'
        ? 'Updating…'
        : status === 'error'
          ? 'The calculation stopped with an error'
          : 'Up to date · updates as you edit';
  return (
    <p className="status-line" role="status">
      {text}
    </p>
  );
}
