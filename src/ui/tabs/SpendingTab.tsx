// Spending (design: Screens, Spending tab): monthly after-tax spending by
// category or as one total, and the three phases.
import { CATEGORY_GROUPS } from '../../state/categories';
import type { PlanDraft } from '../../state/draft';
import { money } from '../../state/format';
import { usePlan } from '../../state/react';
import { Section } from '../common';
import { AgeInput } from '../inputs/AgeInput';
import { CurrencyInput, parseMoney } from '../inputs/CurrencyInput';
import { SegmentedChoice } from '../inputs/SegmentedChoice';

const MONTHS = 12;
type Spending = PlanDraft['spending'];

/** Active-years monthly spending: the category sum, or the one total. */
export function activeMonthly(sp: Spending): number {
  if (sp.mode === 'one_total') return sp.monthlyTotalToday ?? 0;
  return Object.values(sp.categories).reduce((s, c) => s + (c.monthlyToday ?? 0), 0);
}

/** A phase's monthly spending (phase 0 slower, 1 later), with each category's override if set. */
export function phaseMonthly(sp: Spending, phase: 0 | 1): number {
  const keep = (sp.phases[phase].keepPct ?? 100) / 100;
  if (sp.mode === 'one_total') return (sp.monthlyTotalToday ?? 0) * keep;
  return Object.values(sp.categories).reduce((s, c) => {
    const o = c.laterOverrideToday?.[phase];
    return s + (o === null || o === undefined ? (c.monthlyToday ?? 0) * keep : o);
  }, 0);
}

/** True when later-years spending is above slower-years spending (O28): allowed, with a note. */
export function laterAboveSlower(sp: Spending): boolean {
  return phaseMonthly(sp, 1) > phaseMonthly(sp, 0) + 0.5;
}

function CategoryRow({ id, name }: { id: string; name: string }) {
  const c = usePlan((s) => s.inputs.spending.categories[id]);
  const phases = usePlan((s) => s.inputs.spending.phases);
  const setInput = usePlan((s) => s.setInput);
  const clearInput = usePlan((s) => s.clearInput);
  const p = `spending.categories.${id}`;
  const later = c?.laterOverrideToday;
  const base = c?.monthlyToday ?? 0;
  const usual = (i: 0 | 1) => base * ((phases[i].keepPct ?? 100) / 100);
  return (
    <div className="category">
      <CurrencyInput path={`${p}.monthlyToday`} label={name} suffix="/ month" />
      {later ? (
        <div className="later">
          {(['Slower years', 'Later years'] as const).map((label, i) => (
            <label key={label}>
              {label}
              <input
                inputMode="decimal"
                value={later[i] ?? ''}
                onChange={(e) => {
                  const next: [number | null, number | null] = [later[0] ?? null, later[1] ?? null];
                  next[i] = parseMoney(e.target.value);
                  setInput(`${p}.laterOverrideToday`, next);
                }}
              />
            </label>
          ))}
          <button
            type="button"
            className="link"
            onClick={() => clearInput(`${p}.laterOverrideToday`)}
          >
            Use the usual change
          </button>
        </div>
      ) : (
        <div className="later hint">
          Later: {money(usual(0))} then {money(usual(1))} a month{' '}
          <button
            type="button"
            className="link"
            onClick={() => setInput(`${p}.laterOverrideToday`, [usual(0), usual(1)])}
          >
            Different later?
          </button>
        </div>
      )}
    </div>
  );
}

function groupNote(
  categories: Spending['categories'],
  ids: string[],
  names: Record<string, string>,
) {
  const differ = ids.filter((id) => categories[id]?.laterOverrideToday);
  if (differ.length === 0) return undefined;
  return differ.length === 1
    ? `${names[differ[0]!]} differs later`
    : `${differ.length} differ later`;
}

export function SpendingTab() {
  const sp = usePlan((s) => s.inputs.spending);
  const setInput = usePlan((s) => s.setInput);
  const setSpendingMode = usePlan((s) => s.setSpendingMode);
  const active = activeMonthly(sp);
  return (
    <div className="tab">
      <h2>Spending</h2>
      <p className="hint">
        What you would spend in a typical month early in retirement, after tax, in today’s dollars.
      </p>
      <SegmentedChoice
        legend="Enter it"
        options={[
          { value: 'by_category', label: 'By category' },
          { value: 'one_total', label: 'One total' },
        ]}
        value={sp.mode}
        onChange={setSpendingMode}
      />
      {sp.mode === 'one_total' ? (
        <CurrencyInput
          path="spending.monthlyTotalToday"
          label="Monthly spending"
          suffix="/ month"
        />
      ) : (
        CATEGORY_GROUPS.map((g) => {
          const names = Object.fromEntries(g.categories.map((c) => [c.id, c.name]));
          const total = g.categories.reduce(
            (s, c) => s + (sp.categories[c.id]?.monthlyToday ?? 0),
            0,
          );
          const note = groupNote(
            sp.categories,
            g.categories.map((c) => c.id),
            names,
          );
          return (
            <Section
              key={g.id}
              title={g.name}
              summary={`${money(total)} a month${note ? ` · ${note}` : ''}`}
            >
              {g.categories.map((c) => (
                <CategoryRow key={c.id} id={c.id} name={c.name} />
              ))}
            </Section>
          );
        })
      )}
      <h3>Phases</h3>
      <div className="phases">
        <div className="phase">
          <strong>Active years</strong> from the first retirement: {money(active)} a month ·{' '}
          {money(active * MONTHS)} a year
        </div>
        {(['Slower years', 'Later years'] as const).map((label, i) => {
          const phase = sp.phases[i as 0 | 1];
          const monthly = phaseMonthly(sp, i as 0 | 1);
          return (
            <div key={label} className="phase">
              <strong>{label}</strong>
              <AgeInput
                path={`spending.phases.${i}.fromYear`}
                label="From year"
                hint="Years after the first retirement."
              />
              <label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={phase.keepPct ?? 100}
                  aria-label={`${label} share of active years`}
                  onChange={(e) => setInput(`spending.phases.${i}.keepPct`, Number(e.target.value))}
                />{' '}
                {phase.keepPct === 100
                  ? 'Same as active years'
                  : `${phase.keepPct ?? 100}% of active years`}
              </label>
              <div>
                {money(monthly)} a month · {money(monthly * MONTHS)} a year
              </div>
            </div>
          );
        })}
      </div>
      {laterAboveSlower(sp) && (
        <p className="note" role="note">
          Later-years spending is above slower-years spending. That is allowed, for example for care
          costs.
        </p>
      )}
      <p className="hint">Survivor spending and the legacy goal are on the Estate tab.</p>
    </div>
  );
}
