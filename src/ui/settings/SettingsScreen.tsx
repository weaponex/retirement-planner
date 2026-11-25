// Settings (design: Screens, Settings; Config contract, User changes to rule
// values): every rule value with its default and source. Single values can be
// changed; tables and the other keys the contract lists are read-only.
import { useEffect, useRef, useState } from 'react';
import { ALL_KEYS } from '../../engine/config/keys';
import { isOverridable, validateOverride } from '../../engine/config/overrides';
import type { ConfigDefault } from '../../engine/config/load';
import { usePlan } from '../../state/react';
import { bundledConfig, defaultsByKey } from '../config';
import { formatRule } from '../rules';

const PERCENT = 100;

interface SectionDef {
  title: string;
  match(key: string): boolean;
}

export const SETTINGS_SECTIONS: SectionDef[] = [
  {
    title: 'Income tax',
    match: (k) =>
      /^federal\.(tax|credits\.(basic|age)|dividend|capital_gains)/.test(k) ||
      /^ontario\.(tax|credits|surtax|tax_reduction|health_premium|dividend)/.test(k),
  },
  { title: 'OAS', match: (k) => k.startsWith('federal.oas.') },
  { title: 'CPP', match: (k) => k.startsWith('federal.cpp.') },
  {
    title: 'Investing assumptions',
    match: (k) =>
      k.startsWith('market.') || k === 'planning.fee_levels' || k === 'planning.override_margin',
  },
  {
    title: 'Accounts and pensions',
    match: (k) =>
      /^federal\.(tfsa|rrif|split|credits\.pension)/.test(k) || /^ontario\.(probate|lif)/.test(k),
  },
  { title: 'Planning values', match: () => true },
];

/** Groups every key under the first section that matches it. */
export function keysBySection(keys: readonly string[] = ALL_KEYS): Map<string, string[]> {
  const out = new Map<string, string[]>(SETTINGS_SECTIONS.map((s) => [s.title, []]));
  for (const k of keys) out.get(SETTINGS_SECTIONS.find((s) => s.match(k))!.title)!.push(k);
  return out;
}

/** What the user types, in the key's published unit; rates are typed in percent. */
export function parseRuleInput(text: string, unit: string): number | null {
  const n = Number(text.replace(/[$,%\s]/g, ''));
  if (text.trim() === '' || !Number.isFinite(n)) return null;
  return unit === 'rate' ? n / PERCENT : n;
}

function RuleRow({ ruleKey, d }: { ruleKey: string; d: ConfigDefault }) {
  const override = usePlan((s) => s.inputs.ruleOverrides?.[ruleKey]);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const focus = usePlan((s) => s.focus);
  const setRule = usePlan((s) => s.setRule);
  const resetRule = usePlan((s) => s.resetRule);
  const setView = usePlan((s) => s.setView);
  const [text, setText] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const editable = isOverridable(ruleKey);
  const stale = override && override.defaultTaxYear !== bundledConfig().taxYear;
  useEffect(() => {
    if (focus === ruleKey) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [focus, ruleKey]);
  const apply = () => {
    const value = parseRuleInput(text, d.unit);
    if (value === null) {
      setProblems(['Enter a number']);
      return;
    }
    const found = validateOverride(ruleKey, value, overrides ?? {}, bundledConfig());
    setProblems(found);
    if (found.length === 0) {
      setRule(ruleKey, value);
      setText('');
    }
  };
  const url = /^https?:/.test(d.source.url) ? d.source.url : undefined;
  return (
    <div ref={ref} className={focus === ruleKey ? 'rule focused' : 'rule'} data-key={ruleKey}>
      <div className="rule-name">
        <code>{ruleKey}</code>
        {override && <span className="changed"> changed</span>}
        {stale && <span className="hint"> set against {override!.defaultTaxYear} defaults</span>}
      </div>
      <div className="rule-value">
        {override ? (
          <>
            {formatRule(override.value, d.unit)}{' '}
            <span className="hint">(default {formatRule(d.value, d.unit)})</span>{' '}
            <button type="button" className="link" onClick={() => resetRule(ruleKey)}>
              Reset
            </button>
          </>
        ) : (
          formatRule(d.value, d.unit)
        )}
      </div>
      {editable && (
        <div className="rule-edit">
          <input
            aria-label={`New value for ${ruleKey}${d.unit === 'rate' ? ', percent' : ''}`}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply();
            }}
          />
          <button type="button" onClick={apply}>
            Change
          </button>
          {problems.map((p) => (
            <div key={p} className="message" role="alert">
              {p}
            </div>
          ))}
        </div>
      )}
      {ruleKey.endsWith('.geometric_return') && (
        <button type="button" className="link" onClick={() => setView('savings')}>
          Change returns on the Savings tab
        </button>
      )}
      <div className="hint">
        {url ? <a href={url}>{url}</a> : d.source.url}
        {d.source.locator ? ` · ${d.source.locator}` : ''} · {d.validation.status}
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const setView = usePlan((s) => s.setView);
  const defaults = defaultsByKey();
  return (
    <div className="tab settings">
      <h2>Settings</h2>
      <p className="hint">
        Every rule value with its default and source. A changed value is marked, shows its default,
        and is saved with the plan. Tables are shown read-only.
      </p>
      <button type="button" onClick={() => setView('household')}>
        Back to the plan
      </button>
      {[...keysBySection()].map(([title, keys]) => (
        <section key={title} aria-labelledby={`set-${title}`}>
          <h3 id={`set-${title}`}>{title}</h3>
          {keys.map((k) => (
            <RuleRow key={k} ruleKey={k} d={defaults[k]!} />
          ))}
        </section>
      ))}
    </div>
  );
}
