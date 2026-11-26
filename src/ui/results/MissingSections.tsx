// What still needs filling in before a chart or comparison can show (AR-W4,
// AR-S7): the missing details grouped by the tab they are on, each a link.
import { useMemo } from 'react';
import { usePlan } from '../../state/react';
import type { TabId } from '../../state/store';
import { tabFor } from '../tabs/ResultsTab';

const TAB_NAMES: Record<TabId, string> = {
  household: 'Household',
  savings: 'Savings',
  spending: 'Spending',
  withdrawals: 'Withdrawals',
  estate: 'Estate',
  results: 'Results',
};

export function MissingSections({ what }: { what: string }) {
  const missing = usePlan((s) => s.missing);
  const setView = usePlan((s) => s.setView);
  const byTab = useMemo(() => {
    const groups = new Map<TabId, typeof missing>();
    for (const m of missing) {
      const t = tabFor(m.path);
      groups.set(t, [...(groups.get(t) ?? []), m]);
    }
    return [...groups.entries()];
  }, [missing]);
  if (byTab.length === 0) return <p className="note">Working out the plan…</p>;
  return (
    <div className="missing-sections" role="note">
      <p style={{ fontWeight: 600 }}>{what} once these are filled in:</p>
      <ul>
        {byTab.map(([tab, items]) => (
          <li key={tab}>
            <b>{TAB_NAMES[tab]}</b>:{' '}
            {items.map((m, k) => (
              <span key={m.path}>
                {k > 0 && ', '}
                <button type="button" className="link" onClick={() => setView(tab, m.path)}>
                  {m.message.replace(/: not entered yet$/, '')}
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
