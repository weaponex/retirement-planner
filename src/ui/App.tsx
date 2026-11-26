// The app shell (design file 45; mockups Main, FirstRun): the header with the
// household's names, the tax-year chip and the plan buttons; the tab bar with
// the Results badge; the welcome screen for an empty plan; the footer
// disclaimer; and the first-run dialog.
import { useEffect, useRef, useState } from 'react';
import type { PlanDraft } from '../state/draft';
import { exportPlan, importPlan } from '../state/persistence/exportImport';
import { usePlan, usePlanStore } from '../state/react';
import type { TabId } from '../state/store';
import { bundledConfig } from './config';
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
const STAGE_7 = 'The sample plan arrives in a later version';

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
          Tax and benefit amounts start at {bundledConfig().taxYear} values. You can change them in
          Settings.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
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

type ImportState =
  | { kind: 'idle' }
  | { kind: 'refused'; message: string }
  | { kind: 'confirm'; name: string; inputs: PlanDraft };

/**
 * Loads an exported plan (AR2-X2). A plan already open is replaced only after
 * the user confirms, since it is not saved anywhere else.
 */
function ImportButton({
  label,
  className,
  onLoaded,
}: {
  label: string;
  className: string;
  onLoaded(): void;
}) {
  const loadPlan = usePlan((s) => s.loadPlan);
  const empty = useEmptyPlan();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ kind: 'idle' });
  const load = (inputs: PlanDraft) => {
    loadPlan(inputs);
    setState({ kind: 'idle' });
    onLoaded();
  };
  const close = () => setState({ kind: 'idle' });
  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Plan file to import"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const r = importPlan(await file.text(), file.name);
          if (!r.ok) setState({ kind: 'refused', message: r.message });
          else if (empty) load(r.inputs);
          else setState({ kind: 'confirm', name: file.name, inputs: r.inputs });
        }}
      />
      {state.kind !== 'idle' && (
        <div className="dialog-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="dialog">
            <h2 id="import-title">
              {state.kind === 'refused' ? 'The plan could not be imported' : 'Replace this plan?'}
            </h2>
            {state.kind === 'refused' ? (
              <p>{state.message}</p>
            ) : (
              <p>
                {state.name} replaces the plan open now. The plan open now is not saved anywhere
                else; Export it first to keep it.
              </p>
            )}
            <div className="row">
              {state.kind === 'confirm' && (
                <button type="button" className="btn-primary" onClick={() => load(state.inputs)}>
                  Replace the plan
                </button>
              )}
              <button type="button" className="btn" onClick={close}>
                {state.kind === 'confirm' ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Welcome({ onStart }: { onStart(): void }) {
  return (
    <div className="welcome">
      <h1 className="display">Plan your retirement as a couple in Ontario</h1>
      <p className="lead">
        Enter your ages, savings, pensions and spending. The planner works out, year by year, how
        much to withdraw from each account, the tax you pay, and what’s left at the end, in today’s
        dollars.
      </p>
      <div className="row">
        <button type="button" className="btn-primary" onClick={onStart}>
          Start your plan
        </button>
        <button type="button" className="btn btn-large" disabled title={STAGE_7}>
          Load sample plan
        </button>
        <ImportButton label="Import a saved plan" className="btn btn-large" onLoaded={onStart} />
      </div>
      <p className="note">
        The app cannot send what you enter over the network; your plan stays in this browser. It is
        not saved yet: Export it to keep a copy.
      </p>
    </div>
  );
}

/** Saves the plan as a file (AR2-X1): the browser downloads it; nothing is sent anywhere. */
function ExportButton() {
  const store = usePlanStore();
  return (
    <button
      type="button"
      className="btn"
      title="Save this plan as a file on this computer. The file is not encrypted."
      onClick={() => {
        const file = exportPlan(store.getState().inputs, {
          appVersion: __APP_VERSION__,
          disclaimer: DISCLAIMER,
          now: new Date(),
        });
        const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export
    </button>
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

/** True for a plan with nothing about the household yet. */
function useEmptyPlan(): boolean {
  return usePlan(
    (s) =>
      s.inputs.accounts.every((a) => !a.balanceToday) &&
      s.inputs.spouses.every((x) => x.birthYear === null),
  );
}

/** "Alex and Sam", once either spouse has a name of their own. */
function HouseholdNames() {
  const names = usePlan((s) => s.inputs.spouses.map((x) => x.name?.trim() ?? '').join('|'));
  const [a, b] = names.split('|');
  const own = (n: string | undefined, i: number) => Boolean(n) && n !== `Spouse ${i + 1}`;
  if (!own(a, 0) && !own(b, 1)) return null;
  return (
    <span className="household-names">{[a || 'Spouse 1', b || 'Spouse 2'].join(' and ')}</span>
  );
}

export function App() {
  const view = usePlan((s) => s.view);
  const focus = usePlan((s) => s.focus);
  const setView = usePlan((s) => s.setView);
  const empty = useEmptyPlan();
  const [started, setStarted] = useState(false);
  const [firstRun, setFirstRun] = useState(() => !seenDisclaimer());

  // A link to an input opens its tab, then focuses the field.
  useEffect(() => {
    if (!focus || view === 'settings') return;
    const el = document.querySelector<HTMLElement>(`[data-path="${focus}"]`);
    el?.scrollIntoView?.({ block: 'center' });
    el?.querySelector<HTMLElement>('input, select')?.focus();
  }, [view, focus]);

  const welcome = empty && !started && view !== 'settings';
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-name display">Retirement planner</span>
        {view === 'settings' ? (
          <>
            <span className="header-crumb">Settings</span>
            <span className="spacer" />
            <button type="button" className="btn" onClick={() => setView('household')}>
              Back to plan
            </button>
          </>
        ) : (
          <>
            <HouseholdNames />
            <TaxYearChip />
            <span className="spacer" />
            <button type="button" className="btn" disabled title={STAGE_7}>
              Load sample plan
            </button>
            <ImportButton label="Import" className="btn" onLoaded={() => setStarted(true)} />
            <ExportButton />
            <button type="button" className="btn" onClick={() => setView('settings')}>
              Settings
            </button>
          </>
        )}
      </header>
      {view !== 'settings' && !welcome && (
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
      )}
      <ConfigNotice />
      <main>{welcome ? <Welcome onStart={() => setStarted(true)} /> : <View />}</main>
      <footer className="app-footer">{DISCLAIMER}</footer>
      {firstRun && <FirstRunDialog onClose={() => setFirstRun(false)} />}
    </div>
  );
}
