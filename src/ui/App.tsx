// The app shell (design file 45): header with the tax-year chip, the config
// notice and Settings; the tab bar with the Results badge; the footer
// disclaimer; and the first-run disclaimer dialog. No results panel on the
// input tabs.
import { useEffect, useState } from 'react';
import { usePlan } from '../state/react';
import type { TabId } from '../state/store';
import { DISCLAIMER } from './content/disclaimer';
import { ConfigNotice, TaxYearChip } from './results/ConfigNotice';
import { ResultsBadge } from './results/ResultsBadge';
import { SettingsScreen } from './settings/SettingsScreen';
import { EstateTab } from './tabs/EstateTab';
import { HouseholdTab } from './tabs/HouseholdTab';
import { ResultsTab } from './tabs/ResultsTab';
import { SavingsTab } from './tabs/SavingsTab';
import { SpendingTab } from './tabs/SpendingTab';
import { WithdrawalsTab } from './tabs/WithdrawalsTab';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'household', label: 'Household' },
  { id: 'savings', label: 'Savings' },
  { id: 'spending', label: 'Spending' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'estate', label: 'Estate' },
  { id: 'results', label: 'Results' },
];

const SEEN_KEY = 'rp.disclaimer.seen';

function seenDisclaimer(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function FirstRunDialog({ onClose }: { onClose(): void }) {
  return (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="first-run" className="dialog">
        <h2 id="first-run">Before you start</h2>
        <p>{DISCLAIMER}</p>
        <p>
          The app is blocked from sending what you enter over the network; the plan stays in this
          browser.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(SEEN_KEY, '1');
            } catch {
              // Private windows can refuse storage; the dialog shows again next time.
            }
            onClose();
          }}
        >
          I understand
        </button>
      </div>
    </div>
  );
}

function View() {
  const view = usePlan((s) => s.view);
  switch (view) {
    case 'household':
      return <HouseholdTab />;
    case 'savings':
      return <SavingsTab />;
    case 'spending':
      return <SpendingTab />;
    case 'withdrawals':
      return <WithdrawalsTab />;
    case 'estate':
      return <EstateTab />;
    case 'results':
      return <ResultsTab />;
    default:
      return <SettingsScreen />;
  }
}

export function App() {
  const view = usePlan((s) => s.view);
  const focus = usePlan((s) => s.focus);
  const setView = usePlan((s) => s.setView);
  const [firstRun, setFirstRun] = useState(() => !seenDisclaimer());

  // A link to an input opens its tab, then focuses the field and opens its section.
  useEffect(() => {
    if (!focus || view === 'settings') return;
    const el = document.querySelector<HTMLElement>(`[data-path="${focus}"]`);
    el?.closest('details')?.setAttribute('open', '');
    el?.scrollIntoView?.({ block: 'center' });
    el?.querySelector<HTMLElement>('input, select')?.focus();
  }, [view, focus]);

  return (
    <div className="app">
      <header className="header">
        <h1>Retirement Planner</h1>
        <TaxYearChip />
        <button type="button" className="link" onClick={() => setView('settings')}>
          Settings
        </button>
      </header>
      <ConfigNotice />
      <nav className="tabs" aria-label="Plan">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={view === t.id ? 'page' : undefined}
            className={view === t.id ? 'tab-button active' : 'tab-button'}
            onClick={() => setView(t.id)}
          >
            {t.label}
            {t.id === 'results' && <ResultsBadge />}
          </button>
        ))}
      </nav>
      <main>
        <View />
      </main>
      <footer className="footer">{DISCLAIMER}</footer>
      {firstRun && <FirstRunDialog onClose={() => setFirstRun(false)} />}
    </div>
  );
}
