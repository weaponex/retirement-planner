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

/** The focus value that opens Settings on the values not yet checked. */
export const FILTER_UNCHECKED = 'filter:unchecked';

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
    <span className="rule-value">
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
    </span>
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

        {url && (
          <>
            {override || indexed ? ' · ' : ''}
            <a href={url} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </>
        )}
        {d.validation.status !== 'validated' && (
          <span className="badge-unchecked" title="Not yet checked against the source">
            Not checked yet
          </span>
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

const pick = (prefix: string) => ALL_KEYS.filter((k) => k.startsWith(prefix));

const INCOME_TAX = [
  'federal.tax.brackets',
  'ontario.tax.brackets',
  ...CREDITS.flatMap((r) => [r.fed, r.ont]).flatMap((c) =>
    Array.isArray(c) ? c.map(([k]) => k) : [],
  ),
  'ontario.surtax.thresholds',
  'ontario.surtax.rates',
  'ontario.health_premium.schedule',
];
const PAYROLL = pick('federal.payroll.');
const CPP_AMOUNTS = ['federal.cpp.average_at_65', 'federal.cpp.max_at_65'];
const CPP_START = [
  'federal.cpp.start.earliest',
  'federal.cpp.start.latest',
  'federal.cpp.adjust.early_per_month',
  'federal.cpp.adjust.late_per_month',
];
const CPP_SURVIVOR = pick('federal.cpp.survivor.');
const OAS_AMOUNT = [
  'federal.oas.base_at_65',
  'federal.oas.deferral.per_month',
  'federal.oas.deferral.max_months',
  'federal.oas.increase_age',
  'federal.oas.increase_rate',
];
const OAS_RESIDENCE = pick('federal.oas.residence.');
const OAS_CLAWBACK = pick('federal.oas.recovery.');
const CONVERSION = [
  'federal.rrif.latest_conversion_age',
  'federal.rrif.min_factor_base_age',
  'ontario.lif.unlock_share',
];
const SPLITTING = pick('federal.split.');
const MARKET_TABLE = pick('market.').filter((k) => k !== 'market.foreign_withholding_rate');
const INVESTMENT_FIELDS = ['market.foreign_withholding_rate', 'planning.override_margin'];
const ESTATE = ['ontario.probate.threshold', 'ontario.probate.rate'];
/** Not shown: the placement presets left the screens with AR-S3. */
export const HIDDEN = ['planning.presets'];

type SectionId =
  'tax' | 'payroll' | 'cpp' | 'oas' | 'registered' | 'investments' | 'estate' | 'planner';

interface SectionDef {
  id: SectionId;
  title: string;
  intro: string;
  keys: string[];
}

const PLACED = [
  ...INCOME_TAX,
  ...PAYROLL,
  ...CPP_AMOUNTS,
  ...CPP_START,
  ...CPP_SURVIVOR,
  ...OAS_AMOUNT,
  ...OAS_RESIDENCE,
  ...OAS_CLAWBACK,
  ...CONVERSION,
  'federal.rrif.min_factor',
  'ontario.lif.max_factor',
  ...SPLITTING,
  'federal.tfsa.annual_limit',
  ...MARKET_TABLE,
  ...INVESTMENT_FIELDS,
  'planning.fee_levels',
  ...ESTATE,
  ...HIDDEN,
];
/** Everything not placed in another section: the planner's own design values. */
export const PLANNER = ALL_KEYS.filter((k) => !PLACED.includes(k));

/** The sections in the order the list shows them (AR2-T1). */
export const SECTIONS: SectionDef[] = [
  {
    id: 'tax',
    title: 'Income tax',
    intro: 'Federal and Ontario brackets, credits, the Ontario surtax and health premium.',
    keys: INCOME_TAX,
  },
  {
    id: 'payroll',
    title: 'Payroll deductions',
    intro: 'CPP, CPP2 and EI taken from pay while working, for take-home pay and the tax rate.',
    keys: PAYROLL,
  },
  {
    id: 'cpp',
    title: 'Canada Pension Plan',
    intro: 'How much CPP pays, when it can start, and what a survivor gets.',
    keys: [...CPP_AMOUNTS, ...CPP_START, ...CPP_SURVIVOR],
  },
  {
    id: 'oas',
    title: 'Old Age Security',
    intro: 'The amount, delaying it, years in Canada, and the clawback.',
    keys: [...OAS_AMOUNT, ...OAS_RESIDENCE, ...OAS_CLAWBACK],
  },
  {
    id: 'registered',
    title: 'RRSP, RRIF, LIRA and LIF',
    intro: 'Conversion, minimum and maximum withdrawals, pension splitting and the TFSA limit.',
    keys: [
      ...CONVERSION,
      'federal.rrif.min_factor',
      'ontario.lif.max_factor',
      ...SPLITTING,
      'federal.tfsa.annual_limit',
    ],
  },
  {
    id: 'investments',
    title: 'Investments',
    intro: 'Starting returns and yields by asset class, inflation, withholding and fee levels.',
    keys: [...MARKET_TABLE, ...INVESTMENT_FIELDS, 'planning.fee_levels'],
  },
  {
    id: 'estate',
    title: 'Estate',
    intro: 'Ontario probate (the estate administration tax).',
    keys: ESTATE,
  },
  {
    id: 'planner',
    title: 'Planner defaults',
    intro: 'The planner’s own starting choices, shown for reference; they cannot be changed here.',
    keys: PLANNER.filter((k) => !HIDDEN.includes(k)),
  },
];

const sectionOf = (k: string) => SECTIONS.find((s) => s.keys.includes(k))?.id;

type Filter = 'all' | 'changed' | 'unchecked';

const unchecked = (k: string) => defaultsByKey()[k]?.validation.status !== 'validated';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rule-group">
      <h3 className="rule-group-title">{title}</h3>
      <div className="rule-list">{children}</div>
    </div>
  );
}

function tableText(k: string): string {
  if (k === 'ontario.surtax.thresholds' || k === 'ontario.surtax.rates') return surtaxText();
  if (k === 'ontario.health_premium.schedule') return healthPremiumText();
  return 'A table; open its section to see it';
}

/** A key on its own row: its field, or a one-line summary for a table. */
function KeyRow({ k }: { k: string }) {
  if (typeof defaultsByKey()[k]?.value === 'number' || isOverridable(k)) {
    return <RuleField k={k} />;
  }
  return <ReadOnly k={k} text={tableText(k)} />;
}

function FeeLevels() {
  const fees = (defaultsByKey()['planning.fee_levels']?.value ?? {}) as Record<string, number>;
  return (
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
  );
}

function SectionBody({ id }: { id: SectionId }) {
  const setView = usePlan((s) => s.setView);
  const rows = (keys: string[]) => keys.map((k) => <KeyRow key={k} k={k} />);
  switch (id) {
    case 'tax':
      return (
        <>
          <p className="note">Bracket starts grow with inflation.</p>
          <div className="scroll-x">
            <div className="grid-2">
              <BracketTable k="federal.tax.brackets" />
              <BracketTable k="ontario.tax.brackets" />
            </div>
          </div>
          <div className="scroll-x">
            <CreditsTable />
          </div>
        </>
      );
    case 'payroll':
      return <Group title="Contributions while working">{rows(PAYROLL)}</Group>;
    case 'cpp':
      return (
        <>
          <Group title="Amounts">{rows(CPP_AMOUNTS)}</Group>
          <Group title="Start age">{rows(CPP_START)}</Group>
          <Group title="Survivor">{rows(CPP_SURVIVOR)}</Group>
        </>
      );
    case 'oas':
      return (
        <>
          <Group title="Amount">{rows(OAS_AMOUNT)}</Group>
          <Group title="Years in Canada">{rows(OAS_RESIDENCE)}</Group>
          <Group title="Clawback">{rows(OAS_CLAWBACK)}</Group>
        </>
      );
    case 'registered':
      return (
        <>
          <Group title="Conversion">{rows(CONVERSION)}</Group>
          <div className="scroll-x">
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
          </div>
          <Group title="Pension income splitting">{rows(SPLITTING)}</Group>
          <Group title="TFSA">{rows(['federal.tfsa.annual_limit'])}</Group>
        </>
      );
    case 'investments':
      return (
        <>
          <p className="note">
            Starting values for the Savings tab (FP Canada {bundledConfig().taxYear}). Changing them
            here changes the default; your own entries on the Savings tab still win.{' '}
            <button type="button" className="link" onClick={() => setView('savings')}>
              Change returns on the Savings tab
            </button>
          </p>
          <div className="scroll-x">
            <ReturnsTable />
          </div>
          <Group title="Other">{rows(INVESTMENT_FIELDS)}</Group>
          <FeeLevels />
        </>
      );
    case 'estate':
      return <Group title="Probate">{rows(ESTATE)}</Group>;
    default:
      return (
        <Group title="Reference">
          {SECTIONS.at(-1)!.keys.map((k) =>
            isOverridable(k) ? (
              <RuleField key={k} k={k} />
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
        </Group>
      );
  }
}

function Counts({ changed, notChecked }: { changed: number; notChecked: number }) {
  return (
    <span className="nav-counts">
      {changed > 0 && (
        <span className="badge-changed" title={`${changed} changed`}>
          {changed}
        </span>
      )}
      {notChecked > 0 && (
        <span className="badge-unchecked" title={`${notChecked} not checked yet`}>
          {notChecked}
        </span>
      )}
    </span>
  );
}

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['changed', 'Changed'],
  ['unchecked', 'Not checked yet'],
];

export function SettingsScreen() {
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const resetAllRules = usePlan((s) => s.resetAllRules);
  const focus = usePlan((s) => s.focus);
  const year = bundledConfig().taxYear;
  const changed = Object.keys(overrides ?? {});
  const [section, setSection] = useState<SectionId>('tax');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  // A link to a rule opens its section; the config notice opens the unchecked values.
  useEffect(() => {
    if (!focus) return;
    if (focus === FILTER_UNCHECKED) {
      setFilter('unchecked');
      return;
    }
    const s = sectionOf(focus);
    if (s) {
      setSection(s);
      setFilter('all');
      setQuery('');
    }
  }, [focus]);

  const open = (id: SectionId) => {
    setSection(id);
    setFilter('all');
    setQuery('');
  };
  const isChanged = (k: string) => changed.includes(k);
  const q = query.trim().toLowerCase();
  const matches = (s: SectionDef, k: string) =>
    (filter === 'all' || (filter === 'changed' ? isChanged(k) : unchecked(k))) &&
    (q === '' || ruleName(k).toLowerCase().includes(q) || s.title.toLowerCase().includes(q));
  const listing = filter !== 'all' || q !== '';
  const counts: Record<Filter, number | undefined> = {
    all: undefined,
    changed: changed.length,
    unchecked: SECTIONS.flatMap((s) => s.keys).filter(unchecked).length,
  };
  const current = SECTIONS.find((s) => s.id === section)!;
  const found = SECTIONS.map((s) => ({ s, keys: s.keys.filter((k) => matches(s, k)) })).filter(
    (x) => x.keys.length > 0,
  );

  return (
    <div className="content settings">
      <div className="settings-head">
        <div style={{ flex: '1 1 480px' }}>
          <h1 className="display">Tax and benefit rules</h1>
          <p className="intro" style={{ marginTop: 6 }}>
            These start at {year} values from CRA, Service Canada and Ontario. Change any of them to
            try a different assumption; your changes are saved with your plan. In later years,
            amounts marked “Grows with inflation” rise at your inflation rate.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          disabled={changed.length === 0}
          onClick={resetAllRules}
        >
          Reset all to {year} defaults
        </button>
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
      <div className="settings-filters">
        <span className="note">Show</span>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filter === id ? 'chip on' : 'chip'}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
            {counts[id] !== undefined && ` · ${counts[id]}`}
          </button>
        ))}
        <span className="spacer" />
        <input
          type="search"
          className="settings-search"
          placeholder="Search rules"
          aria-label="Search rules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="settings-body">
        <nav className="settings-nav" aria-label="Rule sections">
          <select
            aria-label="Section"
            value={section}
            onChange={(e) => open(e.target.value as SectionId)}
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={!listing && section === s.id ? 'page' : undefined}
                  onClick={() => open(s.id)}
                >
                  <span>{s.title}</span>
                  <Counts
                    changed={s.keys.filter(isChanged).length}
                    notChecked={s.keys.filter(unchecked).length}
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="note nav-key">
            <span className="badge-changed">n</span> changed{' '}
            <span className="badge-unchecked">n</span> not checked yet
          </p>
        </nav>
        <div className="settings-main">
          {listing ? (
            <>
              {found.map(({ s, keys }) => (
                <section key={s.id} className="card" aria-label={s.title}>
                  <h2 className="card-title">{s.title}</h2>
                  <div className="rule-list">
                    {keys.map((k) => (
                      <KeyRow key={k} k={k} />
                    ))}
                  </div>
                </section>
              ))}
              {found.length === 0 && <p className="note">No rule matches.</p>}
            </>
          ) : (
            <section className="card" aria-labelledby="settings-section-title">
              <h2 className="card-title" id="settings-section-title">
                {current.title}
              </h2>
              <p className="intro">{current.intro}</p>
              <SectionBody id={current.id} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
