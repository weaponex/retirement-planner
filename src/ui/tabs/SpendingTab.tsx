// Spending (design: Screens, Spending tab; mockup Spending): monthly after-tax
// spending by category or as one total, and the three phases.
import { useState } from 'react';
import { CATEGORY_GROUPS } from '../../state/categories';
import type { PlanDraft } from '../../state/draft';
import { money } from '../../state/format';
import { usePlan } from '../../state/react';
import { RuleValue, Strip } from '../common';
import { bundledConfig } from '../config';
import { parseMoney } from '../inputs/CurrencyInput';
import { SegmentedChoice } from '../inputs/SegmentedChoice';

const MONTHS = 12;
type Spending = PlanDraft['spending'];

/** The groups' own monthly amounts (AR-P1). */
function groupSum(sp: Spending): number {
  return Object.values(sp.groupsMonthlyToday ?? {}).reduce<number>((s, v) => s + (v ?? 0), 0);
}

/** Active-years monthly spending: the category and group sum, or the one total. */
export function activeMonthly(sp: Spending): number {
  if (sp.mode === 'one_total') return sp.monthlyTotalToday ?? 0;
  return Object.values(sp.categories).reduce((s, c) => s + (c.monthlyToday ?? 0), 0) + groupSum(sp);
}

/** A phase's monthly spending (phase 0 slower, 1 later), with each category's override if set. */
export function phaseMonthly(sp: Spending, phase: 0 | 1): number {
  const keep = (sp.phases[phase].keepPct ?? 100) / 100;
  if (sp.mode === 'one_total') return (sp.monthlyTotalToday ?? 0) * keep;
  return Object.values(sp.categories).reduce(
    (s, c) => {
      const o = c.laterOverrideToday?.[phase];
      return s + (o === null || o === undefined ? (c.monthlyToday ?? 0) * keep : o);
    },
    groupSum(sp) * keep,
  );
}

/** True when later-years spending is above slower-years spending (O28): allowed, with a note. */
export function laterAboveSlower(sp: Spending): boolean {
  return phaseMonthly(sp, 1) > phaseMonthly(sp, 0) + 0.5;
}

function MoneyBox({
  value,
  label,
  onChange,
  id,
}: {
  value: number | null | undefined;
  label: string;
  onChange(v: number | null): void;
  id?: string | undefined;
}) {
  return (
    <input
      id={id}
      className="num"
      inputMode="decimal"
      aria-label={id ? undefined : label}
      placeholder="0"
      value={value === null || value === undefined || value === 0 ? '' : value}
      onChange={(e) => onChange(parseMoney(e.target.value))}
    />
  );
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
  const inputId = `cat-${id}`;
  return (
    <div className="category" data-path={`${p}.monthlyToday`}>
      <div className="category-main">
        <label htmlFor={inputId}>{name}</label>
        <span className="with-unit">
          <span className="unit">$</span>
          <MoneyBox
            id={inputId}
            label={name}
            value={c?.monthlyToday}
            onChange={(v) => setInput(`${p}.monthlyToday`, v ?? 0)}
          />
          <span className="unit">/mo</span>
        </span>
      </div>
      {later ? (
        <div className="later-box">
          {(['Slower years', 'Later years'] as const).map((label, i) => (
            <label key={label}>
              {label} $
              <MoneyBox
                label={`${name}, ${label.toLowerCase()}, per month`}
                value={later[i]}
                onChange={(v) => {
                  const next: [number | null, number | null] = [later[0] ?? null, later[1] ?? null];
                  next[i] = v;
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
        <p className="note">
          {base > 0 ? `Slower ${money(usual(0))} · Later ${money(usual(1))}` : 'Not used'} ·{' '}
          <button
            type="button"
            className="link"
            onClick={() =>
              setInput(`${p}.laterOverrideToday`, [Math.round(usual(0)), Math.round(usual(1))])
            }
          >
            Different later?
          </button>
        </p>
      )}
    </div>
  );
}

/** One amount for a whole group (AR-P1): it clears the items; an item clears it. */
function GroupAmount({
  id,
  name,
  categoryIds,
}: {
  id: string;
  name: string;
  categoryIds: string[];
}) {
  const value = usePlan((s) => s.inputs.spending.groupsMonthlyToday?.[id]);
  const setGroupAmount = usePlan((s) => s.setGroupAmount);
  const inputId = `grp-${id}`;
  return (
    <div className="category group-amount" data-path={`spending.groupsMonthlyToday.${id}`}>
      <div className="category-main">
        <label htmlFor={inputId}>{name}, one amount for the group</label>
        <span className="with-unit">
          <span className="unit">$</span>
          <MoneyBox
            id={inputId}
            label={name}
            value={value}
            onChange={(v) => setGroupAmount(id, categoryIds, v === null || v === 0 ? null : v)}
          />
          <span className="unit">/mo</span>
        </span>
      </div>
      <p className="note">
        Enter one amount for the whole group, or fill in the items below. Entering one clears the
        other.
      </p>
    </div>
  );
}

function Groups({ sp }: { sp: Spending }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="groups">
      {CATEGORY_GROUPS.map((g) => {
        const isOpen = open === g.id;
        const amounts = g.categories.map((c) => sp.categories[c.id]?.monthlyToday ?? 0);
        const used = amounts.filter((a) => a > 0).length;
        const own = sp.groupsMonthlyToday?.[g.id] ?? null;
        const total = own ?? amounts.reduce((a, b) => a + b, 0);
        const differ = g.categories.filter((c) => sp.categories[c.id]?.laterOverrideToday);
        return (
          <div key={g.id} className="group">
            <button
              type="button"
              className={isOpen ? 'group-head open' : 'group-head'}
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : g.id)}
            >
              <span style={{ fontWeight: 600 }}>{g.name}</span>
              {differ.length > 0 && (
                <span className="pill">
                  {differ.length === 1
                    ? `${differ[0]!.name} differs later`
                    : `${differ.length} differ later`}
                </span>
              )}
              <span className="spacer" />
              <span className="note">
                {own !== null ? 'One amount' : `${used} of ${g.categories.length} used`}
              </span>
              <span className="num" style={{ fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                {money(total)}/mo
              </span>
              <span
                className="link"
                style={{ textDecoration: 'none', minWidth: 40, textAlign: 'right' }}
              >
                {isOpen ? 'Done' : 'Edit'}
              </span>
            </button>
            {isOpen && (
              <div className="group-body">
                <GroupAmount id={g.id} name={g.name} categoryIds={g.categories.map((c) => c.id)} />
                {g.categories.map((c) => (
                  <CategoryRow key={c.id} id={c.id} name={c.name} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhaseCard({ i, sp }: { i: 0 | 1; sp: Spending }) {
  const setInput = usePlan((s) => s.setInput);
  const label = i === 0 ? 'Slower years' : 'Later years';
  const phase = sp.phases[i];
  const keep = phase.keepPct ?? 100;
  const monthly = phaseMonthly(sp, i);
  return (
    <div className="phase-card" data-path={`spending.phases.${i}.fromYear`}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span className="from-year">
        From year
        <input
          inputMode="numeric"
          aria-label={`${label} start, years after retiring`}
          value={phase.fromYear ?? ''}
          onChange={(e) =>
            setInput(
              `spending.phases.${i}.fromYear`,
              e.target.value.trim() === '' ? null : Number(e.target.value) || null,
            )
          }
        />
      </span>
      <label className="note" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {keep === 100 ? 'Same as active years' : `${keep}% of active years`}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={keep}
          aria-label={`${label} share of active years`}
          onChange={(e) => setInput(`spending.phases.${i}.keepPct`, Number(e.target.value))}
        />
        <span className="range-scale">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </span>
      </label>
      <span className="amount num">
        {money(monthly)}
        <small> /mo</small>
      </span>
      <span className="note">{money(monthly * MONTHS)} a year</span>
    </div>
  );
}

export function SpendingTab() {
  const sp = usePlan((s) => s.inputs.spending);
  const setInput = usePlan((s) => s.setInput);
  const setSpendingMode = usePlan((s) => s.setSpendingMode);
  const active = activeMonthly(sp);
  return (
    <div className="content">
      <section className="card">
        <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
          <div style={{ flex: '999 1 320px' }}>
            <h2 className="card-title">Monthly spending, after tax</h2>
            <p className="card-sub">
              What you’d spend in a typical month early in retirement, in today’s dollars. Later
              stages are worked out from this.
            </p>
          </div>
          <SegmentedChoice
            legend="How to enter spending"
            hideLegend
            options={[
              { value: 'by_category', label: 'By category' },
              { value: 'one_total', label: 'One total' },
            ]}
            value={sp.mode}
            onChange={setSpendingMode}
          />
        </div>

        {sp.mode === 'one_total' ? (
          <div className="field" style={{ maxWidth: 360 }} data-path="spending.monthlyTotalToday">
            <label htmlFor="one-total">Monthly spending in the active years</label>
            <span className="with-unit">
              <span className="unit" style={{ fontSize: 20 }}>
                $
              </span>
              <input
                id="one-total"
                className="num"
                inputMode="decimal"
                style={{ fontSize: 20, minHeight: 48 }}
                value={sp.monthlyTotalToday ?? ''}
                onChange={(e) => setInput('spending.monthlyTotalToday', parseMoney(e.target.value))}
              />
            </span>
            <p className="note">Not sure? Switch to “By category” to add it up.</p>
          </div>
        ) : (
          <Groups sp={sp} />
        )}

        <div className="phase-cards">
          <div className="phase-card active">
            <span style={{ fontWeight: 600 }}>Active years</span>
            <span className="note">From first retirement</span>
            <span className="amount num">
              {money(active)}
              <small> /mo</small>
            </span>
            <span className="note">{money(active * MONTHS)} a year</span>
          </div>
          <PhaseCard i={0} sp={sp} />
          <PhaseCard i={1} sp={sp} />
        </div>
        <p className="note">
          Slide left to spend less than in the active years. Categories you set differently for
          later years keep your amounts.
        </p>
        {laterAboveSlower(sp) && (
          <p className="strip" role="note">
            Later-years spending is above slower-years spending. That is allowed, for example for
            care costs.
          </p>
        )}
        <Strip editKey="market.inflation">
          Spending grows with inflation of <RuleValue ruleKey="market.inflation" /> a year (FP
          Canada {bundledConfig().taxYear})
        </Strip>
        <p className="note">Survivor spending and the legacy goal are on the Estate tab.</p>
      </section>
    </div>
  );
}
