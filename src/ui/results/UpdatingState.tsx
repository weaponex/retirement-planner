// While a run is in progress the previous figures stay, faded, with an
// "Updating…" pill on top, so nothing moves (design file 47; mockup States).
import type { ReactNode } from 'react';
import { useStatus } from '../hooks';

export function UpdatingState({ children }: { children: ReactNode }) {
  const status = useStatus();
  const updating = status === 'updating';
  return (
    <div className={updating ? 'updating-wrap updating' : 'updating-wrap'} aria-busy={updating}>
      {updating && (
        <span className="updating-label status-pill updating">
          <span className="dot" aria-hidden="true" />
          Updating…
        </span>
      )}
      {children}
    </div>
  );
}

const STATUS_TEXT: Record<string, string> = {
  incomplete: 'Enter the missing details to see results',
  updating: 'Updating…',
  error: 'The calculation stopped',
  up_to_date: 'Up to date · updates as you edit',
};

/** The status pill on the Results tab. */
export function StatusLine() {
  const status = useStatus();
  return (
    <span className={`status-pill ${status}`} role="status">
      <span className="dot" aria-hidden="true" />
      {STATUS_TEXT[status]}
    </span>
  );
}
