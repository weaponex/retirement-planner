// Settings (design: Screens, Settings; Config contract, User changes to rule
// values; mockup Settings): every rule value by plain name, with its default
// and source. Single values can be changed; tables are shown read-only.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ALL_KEYS } from '../../engine/config/keys';
import { isOverridable, validateOverride } from '../../engine/config/overrides';
import { money } from '../../state/format';
import { usePlan } from '../../state/react';
import { bundledConfig, defaultsByKey } from '../config';
import { formatRule } from '../rules';
import { ruleName } from './names';

const PERCENT = 100;

/** What the user types, in the key's published unit; rates are typed in percent. */
export function parseRuleInput(text: string, unit: string): number | null {
  const n = Number(text.replace(/[$,%\s]/g, ''));
  if (text.trim() === '' || !Number.isFinite(n)) return null;
  return unit === 'rate' ? n / PERCENT : n;
}

function shown(value: unknown, unit: string): string {
  if (typeof value !== 'number') return '';
  if (unit === 'rate') return String(Number((value * PERCENT).toFixed(4)));
  return unit.startsWith('CAD') ? value.toLocaleString('en-CA') : String(value);
}

const pctOf = (v: unknown) => `${Number((Number(v) * PERCENT).toFixed(2))}%`;

/** The input for one single value: shows the value in use; Enter or leaving the field applies it. */
function RuleInput({ k, label }: { k: string; label: string }) {
  const d = defaultsByKey()[k]!;
  const override = usePlan((s) => s.inputs.ruleOverrides?.[k]);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setRule = usePlan((s) => s.setRule);
  const resetRule = usePlan((s) => s.resetRule);
  const current = override ? override.value : d.value;
  const [text, setText] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const apply = () => {
    if (text === null) return;
    const value = parseRuleInput(text, d.unit);
    setText(null);
    if (value === null) {
      setProblems(['Enter a number']);
      return;
    }
    if (typeof d.value === 'number' && Math.abs(value - d.value) < 1e-12) {
      setProblems([]);
      if (override) resetRule(k);
      return;
    }
    const found = validateOverride(k, value, overrides ?? {}, bundledConfig());
    setProblems(found);
    if (found.length === 0) setRule(k, value);
  };
  const unitText = d.unit === 'rate' ? '%' : d.unit === 'CAD_per_month' ? '/ month' : undefined;
  return (
    <>
      <span className="with-unit">
        {d.unit.startsWith('CAD') && <span className="unit">$</span>}
        <input
          className="num"
          inputMode="decimal"
          aria-label={`${label}${d.unit === 'rate' ? ', percent' : ''}`}
          value={text ?? shown(current, d.unit)}
          onChange={(e) => setText(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
          }}
        />
        {unitText && <span className="unit">{unitText}</span>}
      </span>
      {problems.map((p) => (
        <span key={p} className="message" role="alert">
          {p}
        </span>
      ))}
    </>
  );
}

/** One rule value: its name, value (editable when allowed), notes and source. */
export function RuleField({
  k,
  caption,
}: {
  k: string;
  /** Inside a table: a short label instead of the full name; '' shows none. */
  caption?: string | undefined;
}) {
  const d = defaultsByKey()[k]!;
  const override = usePlan((s) => s.inputs.ruleOverrides?.[k]);
  const focus = usePlan((s) => s.focus);
  const resetRule = usePlan((s) => s.resetRule);
  const ref = useRef<HTMLDivElement>(null);
  const name = ruleName(k);
  const stale = override && override.defaultTaxYear !== bundledConfig().taxYear;
  const indexed = bundledConfig().entries.get(k)?.indexed;
  useEffect(() => {
    if (focus === k) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [focus, k]);
  const url = /^https?:/.test(d.source.url) ? d.source.url : undefined;
  return (
    <div
      ref={ref}
      className={['rule', caption !== undefined && 'compact', focus === k && 'focused']
        .filter(Boolean)
        .join(' ')}
      data-key={k}
    >
      {caption !== '' && <span className="label">{caption ?? name}</span>}
      {isOverridable(k) ? (
        <RuleInput k={k} label={name} />
      ) : (
        <span className="num">{formatRule(override ? override.value : d.value, d.unit)}</span>
      )}
      <span className="note">
        {override ? (
          <>
            <span className="changed">Changed</span> · default {formatRule(d.value, d.unit)}
            {stale ? ` · set against ${override.defaultTaxYear} defaults` : ''} ·{' '}
            <button type="button" className="link" onClick={() => resetRule(k)}>
              Reset
            </button>
          </>
        ) : indexed ? (
          'Grows with inflation'
        ) : null}
        {d.validation.status !== 'validated' && <> · not yet checked against the source</>}
        {url && (
          <>
            {' · '}
            <a href={url} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </>
        )}
      </span>
    </div>
  );
}

function BracketTable({ k }: { k: string }) {
  const rows = (defaultsByKey()[k]?.value ?? []) as { from: number; rate: number }[];
  return (
    <div className="rule" data-key={k}>
      <span className="label">{ruleName(k)}</span>
      <table className="rule-table">
        <thead>
          <tr>
            <th>Income from</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.from}>
              <td>{money(r.from)}</td>
              <td>{pctOf(r.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgeGrid({ k, prefix }: { k: string; prefix: string }) {
  const table = (defaultsByKey()[k]?.value ?? {}) as Record<string, number>;
  const entries = Object.entries(table).sort((a, b) => Number(a[0]) - Number(b[0]));
  return (
    <div className="rule" data-key={k}>
      <span className="label">{ruleName(k)}</span>
      <span className="note">{prefix}</span>
      <div className="age-grid">
        {entries.map(([age, rate], i) => (
          <span key={age}>
            {age}
            {i === entries.length - 1 ? '+' : ''} · {pctOf(rate)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadOnly({ k, text }: { k: string; text: string }) {
  return (
    <div className="rule" data-key={k}>
      <span className="label">{ruleName(k)}</span>
      <span>{text}</span>
    </div>
  );
}

function Card({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string | undefined;
  children: ReactNode;
}) {
  const id = `set-${title.replace(/\s/g, '-')}`;
  return (
    <section className="card" aria-labelledby={id}>
      <h2 className="card-title" id={id}>
        {title}
      </h2>
      {intro && <p className="intro">{intro}</p>}
      {children}
    </section>
  );
}

function healthPremiumText(): string {
  const rows = (defaultsByKey()['ontario.health_premium.schedule']?.value ?? []) as {
    from: number;
    cap: number;
  }[];
  if (rows.length === 0) return '—';
  return `$0 up to ${money(rows[0]!.from)} of income, rising to ${money(rows.at(-1)!.cap)} above ${money(rows.at(-1)!.from)}`;
}

function surtaxText(): string {
  const t = (defaultsByKey()['ontario.surtax.thresholds']?.value ?? []) as number[];
  const r = (defaultsByKey()['ontario.surtax.rates']?.value ?? []) as number[];
  return t.map((x, i) => `${pctOf(r[i] ?? 0)} of Ontario tax above ${money(x)}`).join(', plus ');
}

type Cell = [key: string, caption: string][] | string;
const CREDITS: { label: string; fed: Cell; ont: Cell }[] = [
  {
    label: 'Basic personal amount',
    fed: [
      ['federal.credits.basic', ''],
      ['federal.credits.basic_min', 'At high incomes'],
    ],
    ont: [['ontario.credits.basic', '']],
  },
  {
    label: 'Age amount',
    fed: [
      ['federal.credits.age.amount', ''],
      ['federal.credits.age.min_age', 'From age'],
    ],
    ont: [['ontario.credits.age.amount', '']],
  },
  {
    label: 'Age amount shrinks above',
    fed: [
      ['federal.credits.age.reduction_threshold', ''],
      ['federal.credits.age.reduction_rate', 'By'],
    ],
    ont: [
      ['ontario.credits.age.reduction_threshold', ''],
      ['ontario.credits.age.reduction_rate', 'By'],
    ],
  },
  {
    label: 'Pension income amount',
    fed: [
      ['federal.credits.pension.amount', ''],
      ['federal.credits.pension.min_age_rrif', 'RRIF income counts from age'],
    ],
    ont: [['ontario.credits.pension.amount', '']],
  },
  {
    label: 'Eligible dividends',
    fed: [
      ['federal.dividend.eligible.gross_up', 'Grossed up'],
      ['federal.dividend.eligible.credit_rate', 'Credit'],
    ],
    ont: [['ontario.dividend.eligible.credit_rate', 'Credit']],
  },
  {
    label: 'Capital gains taxed',
    fed: [['federal.capital_gains.inclusion_rate', 'Share of the gain']],
    ont: 'Same',
  },
  { label: 'Ontario surtax', fed: '—', ont: 'surtax' },
  {
    label: 'Ontario tax reduction',
    fed: '—',
    ont: [['ontario.tax_reduction.basic', 'Basic amount']],
  },
  { label: 'Ontario Health Premium', fed: '—', ont: 'health' },
];

function CellContent({ cell }: { cell: Cell }) {
  if (cell === 'surtax') return <span data-key="ontario.surtax.thresholds">{surtaxText()}</span>;
  if (cell === 'health')
    return <span data-key="ontario.health_premium.schedule">{healthPremiumText()}</span>;
  if (typeof cell === 'string') return <span className="note">{cell}</span>;
  return (
    <div className="cell-rules">
      {cell.map(([k, caption]) => (
        <RuleField key={k} k={k} caption={caption} />
      ))}
    </div>
  );
}

function CreditsTable() {
  return (
    <table className="rule-table cells-table">
      <thead>
        <tr>
          <th>Credit or rule</th>
          <th>Federal</th>
          <th>Ontario</th>
        </tr>
      </thead>
      <tbody>
        {CREDITS.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>
              <CellContent cell={r.fed} />
            </td>
            <td>
              <CellContent cell={r.ont} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CLASSES: [id: string, name: string][] = [
  ['cad_equity', 'Canadian stocks'],
  ['us_equity', 'U.S. stocks'],
  ['intl_equity', 'International developed stocks'],
  ['em_equity', 'Emerging markets stocks'],
  ['bonds', 'Bonds'],
  ['cash', 'Cash and GICs'],
];

function ReturnsTable() {
  return (
    <table className="rule-table cells-table">
      <thead>
        <tr>
          <th>Asset class</th>
          <th>Expected return, before fees</th>
          <th>Paid out each year as dividends or interest</th>
        </tr>
      </thead>
      <tbody>
        {CLASSES.map(([id, name]) => (
          <tr key={id}>
            <th scope="row">{name}</th>
            <td>
              <RuleField k={'market.' + id + '.geometric_return'} caption="" />
            </td>
            <td>
              <RuleField k={'market.' + id + '.yield'} caption="" />
            </td>
          </tr>
        ))}
        <tr>
          <th scope="row">Inflation</th>
          <td colSpan={2}>
            <RuleField k="market.inflation" caption="" />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const INCOME_TAX = [
  'federal.credits.basic',
  'federal.credits.basic_min',
  'ontario.credits.basic',
  'federal.credits.age.amount',
  'ontario.credits.age.amount',
  'federal.credits.age.min_age',
  'federal.credits.age.reduction_threshold',
  'federal.credits.age.reduction_rate',
  'ontario.credits.age.reduction_threshold',
  'ontario.credits.age.reduction_rate',
  'federal.credits.pension.amount',
  'ontario.credits.pension.amount',
  'federal.credits.pension.min_age_rrif',
  'federal.dividend.eligible.gross_up',
  'federal.dividend.eligible.credit_rate',
  'ontario.dividend.eligible.credit_rate',
  'federal.capital_gains.inclusion_rate',
  'ontario.tax_reduction.basic',
];
const OAS = [
  'federal.oas.base_at_65',
  'federal.oas.recovery.threshold',
  'federal.oas.recovery.rate',
  'federal.oas.deferral.per_month',
  'federal.oas.deferral.max_months',
  'federal.oas.increase_age',
  'federal.oas.increase_rate',
  'federal.oas.residence.full_years',
  'federal.oas.residence.min_years',
];
const CPP = [
  'federal.cpp.max_at_65',
  'federal.cpp.start.earliest',
  'federal.cpp.start.latest',
  'federal.cpp.adjust.early_per_month',
  'federal.cpp.adjust.late_per_month',
  'federal.cpp.survivor.pct_65_plus',
  'federal.cpp.survivor.flat_under_65',
  'federal.cpp.survivor.pct_under_65',
  'federal.cpp.survivor.max_combined',
];
const SAVINGS = [...ALL_KEYS.filter((k) => k.startsWith('market.')), 'planning.override_margin'];
const SAVINGS_FIELDS = ['market.foreign_withholding_rate', 'planning.override_margin'];
const ACCOUNTS = [
  'federal.tfsa.annual_limit',
  'federal.rrif.latest_conversion_age',
  'federal.split.max_share',
  'federal.split.min_age_rrif',
  'ontario.probate.rate',
  'ontario.probate.threshold',
  'ontario.lif.unlock_share',
  'federal.rrif.min_factor_base_age',
];
const TABLES = [
  'federal.tax.brackets',
  'ontario.tax.brackets',
  'ontario.surtax.thresholds',
  'ontario.surtax.rates',
  'ontario.health_premium.schedule',
  'planning.fee_levels',
  'federal.rrif.min_factor',
  'ontario.lif.max_factor',
];
/** Everything not placed in a section above: the planner's own values. */
export const PLANNING = ALL_KEYS.filter(
  (k) => ![...INCOME_TAX, ...OAS, ...CPP, ...SAVINGS, ...ACCOUNTS, ...TABLES].includes(k),
);

export function SettingsScreen() {
  const setView = usePlan((s) => s.setView);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const resetAllRules = usePlan((s) => s.resetAllRules);
  const year = bundledConfig().taxYear;
  const changed = Object.keys(overrides ?? {});
  const fees = (defaultsByKey()['planning.fee_levels']?.value ?? {}) as Record<string, number>;
  const field = (k: string) => <RuleField key={k} k={k} />;
  return (
    <div className="content">
      <div className="settings-head">
        <div style={{ flex: '1 1 480px' }}>
          <h1 className="display">Tax and benefit rules</h1>
          <p className="intro" style={{ marginTop: 6 }}>
            These start at {year} values from CRA, Service Canada and Ontario. Change any of them to
            try a different assumption; your changes are saved with your plan. In later years,
            amounts marked “Grows with inflation” rise at your inflation rate.
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={changed.length === 0}
            onClick={resetAllRules}
          >
            Reset all to {year} defaults
          </button>
        </div>
      </div>
      {changed.length > 0 && (
        <p className="notice" style={{ margin: 0, maxWidth: 'none' }}>
          You’ve changed {changed.length} value{changed.length === 1 ? '' : 's'} from{' '}
          {changed.length === 1 ? 'its default' : 'their defaults'}:{' '}
          {changed.map(ruleName).join(', ')}.{' '}
          <button type="button" className="link" onClick={resetAllRules}>
            {changed.length === 1 ? 'Reset it' : 'Reset them'}
          </button>
        </p>
      )}
      <Card
        title="Income tax"
        intro="Bracket starts grow with inflation. Type a new value into any box to change it."
      >
        <div className="grid-2">
          <BracketTable k="federal.tax.brackets" />
          <BracketTable k="ontario.tax.brackets" />
        </div>
        <CreditsTable />
      </Card>
      <Card title="Old Age Security">
        <div className="rule-grid">{OAS.map(field)}</div>
      </Card>
      <Card title="Canada Pension Plan">
        <div className="rule-grid">{CPP.map(field)}</div>
      </Card>
      <Card
        title="Savings assumptions"
        intro={`Starting values for the Savings tab (FP Canada ${year}). Changing them here changes the default; your own entries on the Savings tab still win.`}
      >
        <ReturnsTable />
        <p className="note" style={{ margin: 0 }}>
          <button type="button" className="link" onClick={() => setView('savings')}>
            Change returns on the Savings tab
          </button>
        </p>
        <div className="rule-grid">{SAVINGS_FIELDS.map(field)}</div>
        <div className="rule" data-key="planning.fee_levels">
          <span className="label">{ruleName('planning.fee_levels')}</span>
          <table className="rule-table">
            <tbody>
              <tr>
                <td>Index ETFs (default)</td>
                <td>{pctOf(fees.index_etf ?? 0)}</td>
              </tr>
              <tr>
                <td>Robo-advisor</td>
                <td>{pctOf(fees.robo ?? 0)}</td>
              </tr>
              <tr>
                <td>Mutual funds with an advisor</td>
                <td>{pctOf(fees.advisor ?? 0)}</td>
              </tr>
            </tbody>
          </table>
          <span className="note">
            Shown read-only for now; “Custom” on the Savings tab takes any fee.
          </span>
        </div>
      </Card>
      <Card title="Accounts and pensions">
        <div className="rule-grid">{ACCOUNTS.map(field)}</div>
        <div className="grid-2">
          <AgeGrid
            k="federal.rrif.min_factor"
            prefix={`Under the table’s first age: 1 ÷ (${String(defaultsByKey()['federal.rrif.min_factor_base_age']?.value)} − age). From then:`}
          />
          <AgeGrid
            k="ontario.lif.max_factor"
            prefix={`By age at the start of the year. ${pctOf(defaultsByKey()['ontario.lif.unlock_share']?.value)} one-time unlock when a LIRA becomes a LIF.`}
          />
        </div>
      </Card>
      <Card
        title="Planning values"
        intro="The planner’s own starting choices, shown for reference."
      >
        <div className="rule-grid">
          {PLANNING.map((k) =>
            isOverridable(k) ? (
              field(k)
            ) : (
              <ReadOnly
                key={k}
                k={k}
                text={
                  typeof defaultsByKey()[k]?.value === 'number'
                    ? formatRule(defaultsByKey()[k]!.value, defaultsByKey()[k]!.unit)
                    : 'A table of the planner’s design values'
                }
              />
            ),
          )}
        </div>
      </Card>
    </div>
  );
}
