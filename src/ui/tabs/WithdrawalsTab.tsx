// Withdrawals (design: Screens, Withdrawals tab; mockup Withdrawals): CPP and
// OAS start ages, conversions and splitting, then the strategy cards, the
// options row, the income chart with its year slider and the breakdown.
import { useMemo, useState } from 'react';
import { rebaseConfig } from '../../engine/config/load';
import { ageTable } from '../../engine/config/read';
import { deaths } from '../../engine/project/death';
import type { BracketLevel, Comparison, StrategyId } from '../../engine/types';
import { normalizeInputs } from '../../engine/units';
import { drawDownYears } from '../../engine/withdraw/earlyRrsp';
import { money, moneyShort, percent } from '../../state/format';
import { usePlan } from '../../state/react';
import { readyToRun } from '../../state/readiness';
import { RuleValue, Section, SOURCE_COLOURS, Strip, useSpouseName } from '../common';
import { bundledConfig, planConfig } from '../config';
import { firstDeathYear, incomeRows, type IncomeRow } from '../charts/data';
import { gross, IncomeChart } from '../charts/IncomeChart';
import { OPPOSITE_DIRECTIONS, STRATEGIES } from '../content/explanations';
import { useToday } from '../hooks';
import { UpdatingState } from '../results/UpdatingState';
import { ruleValue } from '../rules';

const ORDER: StrategyId[] = ['registered_last', 'fill_brackets', 'early_rrsp'];
const MONTHS = 12;
/** OAS cannot start before 65; later starts are limited by the deferral keys. */
const OAS_FROM = 65;

/** The draw-down years of "Early RRSP drawdown" for a ready plan, or undefined. */
function useDrawDownYears(): number[] | undefined {
  const inputs = usePlan((s) => s.inputs);
  return useMemo(() => {
    const r = readyToRun(inputs);
    if (!r.ready) return undefined;
    const cfg = rebaseConfig(planConfig(r.inputs.ruleOverrides), r.inputs.planStartYear);
    const n = normalizeInputs(r.inputs, cfg);
    return drawDownYears(n, deaths(n));
  }, [inputs]);
}

function AgeSelect({
  i,
  field,
  label,
  from,
  to,
}: {
  i: 0 | 1;
  field: 'cppStartAge' | 'oasStartAge';
  label: string;
  from: number;
  to: number;
}) {
  const value = usePlan((s) => s.inputs.spouses[i][field]);
  const setInput = usePlan((s) => s.setInput);
  const path = `spouses.${i}.${field}`;
  const id = `sel-${i}-${field}`;
  return (
    <div className="field" data-path={path}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value ?? ''} onChange={(e) => setInput(path, Number(e.target.value))}>
        {Array.from({ length: to - from + 1 }, (_, k) => from + k).map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}

function SetupSections() {
  const names = [useSpouseName(0), useSpouseName(1)];
  const spouses = usePlan((s) => s.inputs.spouses);
  const allAccounts = usePlan((s) => s.inputs.accounts);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const accounts = useMemo(
    () => allAccounts.filter((a) => a.type === 'rrsp' || a.type === 'lira'),
    [allAccounts],
  );
  const num = (k: string) => Number(ruleValue(k, overrides));
  const cppFrom = num('federal.cpp.start.earliest');
  const cppTo = num('federal.cpp.start.latest');
  const oasTo = OAS_FROM + num('federal.oas.deferral.max_months') / MONTHS;
  const latest = num('federal.rrif.latest_conversion_age');
  const minAtLatest = ageTable(
    {
      yearIndex: 0,
      deflator: () => 1,
      cfg: planConfig(overrides),
      jurisdiction: undefined as never,
    },
    'federal.rrif.min_factor',
    latest,
  );
  const conv = (o: 0 | 1) =>
    accounts
      .filter((a) => a.owner === o)
      .map((a) =>
        a.type === 'rrsp'
          ? `RRIF at ${a.conversionAge ?? '?'}`
          : `LIF at ${a.conversionAge ?? '?'}${a.lifUnlock50 ? ', 50% unlocked' : ''}`,
      )
      .join(' · ');
  const owners = ([0, 1] as const).filter((o) => conv(o));
  return (
    <>
      <Section
        title="When to start CPP and OAS"
        summary={spouses.map((s, i) => (
          <>
            {names[i]}: CPP at <b>{s.cppStartAge ?? '?'}</b> · OAS at <b>{s.oasStartAge ?? '?'}</b>
          </>
        ))}
      >
        <p className="intro">Starting later means bigger payments for life.</p>
        <div className="grid-auto">
          {([0, 1] as const).flatMap((i) => [
            <AgeSelect
              key={`c${i}`}
              i={i}
              field="cppStartAge"
              label={`${names[i]}: CPP at`}
              from={cppFrom}
              to={cppTo}
            />,
            <AgeSelect
              key={`o${i}`}
              i={i}
              field="oasStartAge"
              label={`${names[i]}: OAS at`}
              from={OAS_FROM}
              to={oasTo}
            />,
          ])}
        </div>
        <Strip editKey="federal.cpp.adjust.early_per_month">
          CPP can start from <b>{cppFrom}</b> to <b>{cppTo}</b>:{' '}
          <b>−{percent(num('federal.cpp.adjust.early_per_month'), 1)}</b> for each month before 65,{' '}
          <b>+{percent(num('federal.cpp.adjust.late_per_month'), 1)}</b> for each month after.
        </Strip>
        <Strip editKey="federal.oas.deferral.per_month">
          OAS can start from <b>{OAS_FROM}</b> to <b>{oasTo}</b>:{' '}
          <b>+{percent(num('federal.oas.deferral.per_month'), 1)}</b> for each month after 65, and{' '}
          <b>+{percent(num('federal.oas.increase_rate'))}</b> from age{' '}
          <b>{num('federal.oas.increase_age')}</b>. Full OAS is{' '}
          <RuleValue ruleKey="federal.oas.base_at_65" /> (January {bundledConfig().taxYear}).
        </Strip>
      </Section>
      <Section
        title="Converting RRSP and LIRA"
        summary={
          owners.length === 0
            ? ['No RRSP or LIRA yet']
            : owners.map((o) => `${names[o]}: ${conv(o)}`)
        }
      >
        <p className="intro">Minimum withdrawals start the year after conversion.</p>
        {accounts.length === 0 && <p className="note">Add an RRSP or LIRA on the Savings tab.</p>}
        <div className="grid-auto">
          {accounts.map((a) => (
            <div key={a.id} className="field" data-path={`accounts.${a.id}.conversionAge`}>
              <label htmlFor={`conv-${a.id}`}>
                {names[a.owner]}: {a.type === 'rrsp' ? 'RRSP to RRIF at' : 'LIRA to LIF at'}
              </label>
              <input
                id={`conv-${a.id}`}
                inputMode="numeric"
                value={a.conversionAge ?? ''}
                onChange={(e) =>
                  setInput(
                    `accounts.${a.id}.conversionAge`,
                    e.target.value.trim() === '' ? null : Number(e.target.value) || null,
                  )
                }
              />
            </div>
          ))}
        </div>
        {accounts
          .filter((a) => a.type === 'lira')
          .map((a) => (
            <label key={a.id} className="check">
              <input
                type="checkbox"
                checked={a.lifUnlock50 ?? false}
                onChange={(e) => setInput(`accounts.${a.id}.lifUnlock50`, e.target.checked)}
              />
              Unlock 50% of {names[a.owner]}’s LIRA into the RRSP when it becomes a LIF
            </label>
          ))}
        <Strip editKey="federal.rrif.min_factor" editLabel="See table">
          Latest conversion: the end of the year you turn <b>{latest}</b>. RRIF minimum at {latest}{' '}
          is <b>{minAtLatest !== undefined ? percent(minAtLatest, 2) : '—'}</b>, rising each year.
        </Strip>
      </Section>
      <Section
        title="Pension income splitting"
        summary={[
          <b key="a">Automatic</b>,
          `Up to ${percent(num('federal.split.max_share'))} · RRIF and LIF from ${num('federal.split.min_age_rrif')}`,
        ]}
      >
        <p className="intro">
          Done for you each year: up to <b>{percent(num('federal.split.max_share'))}</b> of eligible
          pension income moves to the spouse where it lowers the household’s tax. RRIF and LIF
          income counts from age <b>{num('federal.split.min_age_rrif')}</b>; workplace pensions at
          any age.
        </p>
      </Section>
    </>
  );
}

/** "$37k less tax · $50k more left": only the legacy is coloured, and not when the two move in opposite directions. */
export function Difference({ vs, isBase }: { vs: Comparison; isBase: boolean }) {
  if (isBase) return <p className="diff note">The others compare to this</p>;
  const zero = Math.abs(vs.lifetimeTaxDiffToday) < 1 && Math.abs(vs.legacyDiffToday) < 1;
  if (zero) return <p className="diff note">Same as Registered last for this plan</p>;
  const legacyClass = vs.oppositeDirections ? undefined : vs.legacyDiffToday >= 0 ? 'more' : 'less';
  return (
    <span className="diff">
      <span>
        {moneyShort(Math.abs(vs.lifetimeTaxDiffToday))}{' '}
        {vs.lifetimeTaxDiffToday <= 0 ? 'less' : 'more'} tax
      </span>
      {' · '}
      <span className={legacyClass}>
        {moneyShort(Math.abs(vs.legacyDiffToday))} {vs.legacyDiffToday >= 0 ? 'more' : 'less'} left
      </span>
      {vs.oppositeDirections && <span className="note"> {OPPOSITE_DIRECTIONS}</span>}
    </span>
  );
}

function LearnMore({
  id,
  inPlan,
  note,
  current,
  onClose,
  onUse,
}: {
  id: StrategyId;
  inPlan: string | undefined;
  note: string | undefined;
  current: boolean;
  onClose(): void;
  onUse(): void;
}) {
  const t = STRATEGIES[id];
  return (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="learn-title" className="dialog">
        <div className="dialog-head">
          <div>
            <h3 id="learn-title">{t.title}</h3>
            <p className="note">{t.tagline}</p>
          </div>
          <button type="button" className="btn close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="blocks">
          {t.blocks.map((b) => (
            <div key={b.h}>
              <p className="block-h">{b.h}</p>
              <p style={{ fontSize: 13 }}>{b.t}</p>
            </div>
          ))}
        </div>
        <div className="blocks">
          <div>
            <p className="block-h">Pros</p>
            <ul>
              {t.pros.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="block-h">Cons</p>
            <ul>
              {t.cons.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <p className="block-h">When it makes sense</p>
          <ul>
            {t.when.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        {note && <p className="note">{note}</p>}
        {inPlan && (
          <div className="in-plan">
            <b>In your plan:</b> {inPlan}
          </div>
        )}
        <div className="dialog-buttons">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={onUse}>
            {current ? 'Keep this strategy' : 'Use this strategy'}
          </button>
        </div>
      </div>
    </div>
  );
}

const BREAKDOWN: { key: keyof IncomeRow; label: string; colour?: string | undefined }[] = [
  { key: 'work', label: 'Work', colour: SOURCE_COLOURS.work },
  { key: 'db', label: 'Workplace pension', colour: SOURCE_COLOURS.db },
  { key: 'cpp', label: 'CPP', colour: SOURCE_COLOURS.cpp },
  { key: 'oas', label: 'OAS', colour: SOURCE_COLOURS.oas },
  { key: 'registered', label: 'RRSP / RRIF / LIF', colour: SOURCE_COLOURS.registered },
  { key: 'nonreg', label: 'Non-registered', colour: SOURCE_COLOURS.nonreg },
  { key: 'tfsa', label: 'TFSA', colour: SOURCE_COLOURS.tfsa },
  { key: 'tax', label: 'Tax', colour: '#DC2626' },
  { key: 'clawback', label: 'of which OAS clawback' },
  { key: 'savedToTfsa', label: 'Moved to the TFSA', colour: '#15803D' },
  { key: 'spendNeed', label: 'Spending need' },
];

/** The chosen year's 11 rows, always in the same order, a dash for zero. */
export function Breakdown({ row, ages }: { row: IncomeRow | undefined; ages: string }) {
  return (
    <div className="breakdown">
      <p className="breakdown-title">
        {row ? row.year : '—'} · ages {ages}
      </p>
      <table className="breakdown-table" aria-label={row ? `${row.year} breakdown` : 'Breakdown'}>
        <tbody>
          {BREAKDOWN.map((b) => {
            const v = row ? (row[b.key] as number) : 0;
            const zero = Math.abs(v) < 0.5;
            return (
              <tr key={b.key}>
                <td style={{ width: 14 }}>
                  <span className="swatch" style={{ background: b.colour ?? 'transparent' }} />
                </td>
                <th scope="row">{b.label}</th>
                <td className="num" style={{ color: zero ? '#A8A59C' : undefined }}>
                  {zero ? '—' : money(v)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditThresholds() {
  const setView = usePlan((s) => s.setView);
  return (
    <button
      type="button"
      className="link"
      onClick={() => setView('settings', 'federal.oas.recovery.threshold')}
    >
      Edit
    </button>
  );
}

export function WithdrawalsTab() {
  const result = usePlan((s) => s.result);
  const withdrawal = usePlan((s) => s.inputs.withdrawal);
  const spouses = usePlan((s) => s.inputs.spouses);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const toToday = useToday();
  const drawDown = useDrawDownYears();
  const [learn, setLearn] = useState<StrategyId | undefined>();
  const [info, setInfo] = useState(false);
  const [year, setYear] = useState<number | undefined>();
  const last = result?.plan.rows.at(-1)?.year;
  const all = useMemo(
    () =>
      result
        ? result.strategies.map((s) => ({ id: s.strategyId, rows: incomeRows(s.rows, toToday) }))
        : [],
    [result, toToday],
  );
  const rows = all.find((s) => s.id === withdrawal.strategyId)?.rows ?? [];
  // One scale for all three strategies, so switching changes only the shapes.
  const top = Math.max(0, ...all.flatMap((s) => s.rows.map(gross)));
  const shownYear = year !== undefined && rows.some((r) => r.year === year) ? year : rows[0]?.year;
  const death = result ? firstDeathYear(result.plan.rows) : undefined;
  const brackets = ruleValue('federal.tax.brackets', overrides) as { from: number }[] | undefined;
  const firstBracket = brackets?.[1]?.from ?? 0;
  const oasThreshold = Number(ruleValue('federal.oas.recovery.threshold', overrides));
  const ages =
    shownYear !== undefined
      ? spouses.map((s) => (s.birthYear !== null ? shownYear - s.birthYear : '?')).join(' / ')
      : '—';
  const figures = (id: StrategyId) => {
    const s = result?.strategies.find((x) => x.strategyId === id);
    if (!s || last === undefined) return undefined;
    return {
      s,
      tfsa: s.rows.reduce((sum, r) => sum + toToday(r.savedToTfsaNom, r.year), 0),
      left: toToday(s.summary.afterTaxLegacyNom, last),
    };
  };
  const inPlan = (id: StrategyId) => {
    const f = figures(id);
    if (!f) return undefined;
    if (id === 'registered_last') {
      return `Registered last gives lifetime tax of ${money(f.s.summary.lifetimeTaxToday)} and leaves ${money(f.left)} after tax. The other strategies are compared with it.`;
    }
    const v = f.s.vsRegisteredLast;
    return `${STRATEGIES[id].title} gives lifetime tax of ${money(f.s.summary.lifetimeTaxToday)}, ${money(Math.abs(v.lifetimeTaxDiffToday))} ${v.lifetimeTaxDiffToday <= 0 ? 'less' : 'more'} than Registered last, and leaves ${money(f.left)} after tax, ${money(Math.abs(v.legacyDiffToday))} ${v.legacyDiffToday >= 0 ? 'more' : 'less'}.`;
  };
  const note = (id: StrategyId) =>
    STRATEGIES[id].note
      ?.replace('{firstBracket}', money(firstBracket))
      .replace('{oasThreshold}', money(oasThreshold));
  return (
    <div className="content">
      <SetupSections />
      <section className="card">
        <div>
          <h2 className="card-title">Which accounts pay for your spending</h2>
          <p className="card-sub">
            Pick a strategy to see where each year’s money comes from and what it costs in tax.
          </p>
        </div>
        <UpdatingState>
          <div className="strategy-cards" role="radiogroup" aria-label="Withdrawal strategy">
            {ORDER.map((id) => {
              const f = figures(id);
              return (
                <div key={id} className="strategy">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={withdrawal.strategyId === id}
                    aria-label={STRATEGIES[id].title}
                    className="strategy-card"
                    onClick={() => setInput('withdrawal.strategyId', id)}
                  >
                    <span className="name">{STRATEGIES[id].title}</span>
                    <span className="desc">{STRATEGIES[id].short}</span>
                    {f ? (
                      <>
                        <span className="figure-big num">
                          Lifetime tax {money(f.s.summary.lifetimeTaxToday)}
                        </span>
                        <span className="figure-big num">Left after tax {money(f.left)}</span>
                        <Difference vs={f.s.vsRegisteredLast} isBase={id === 'registered_last'} />
                        <span className="note">
                          To TFSA {money(f.tfsa)} · Clawback years {f.s.summary.clawbackYears}
                        </span>
                      </>
                    ) : (
                      <span className="note">Results appear when the plan is complete.</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="link learn"
                    aria-label={`Learn more about ${STRATEGIES[id].title}`}
                    onClick={() => setLearn(id)}
                  >
                    Learn more
                  </button>
                </div>
              );
            })}
          </div>
          <div className="options-row" aria-live="polite">
            {withdrawal.strategyId === 'registered_last' && (
              <span>No settings for this strategy.</span>
            )}
            {withdrawal.strategyId === 'fill_brackets' && (
              <>
                <span>Draw each of you up to</span>
                {(
                  [
                    ['first_bracket', 'Top of first bracket', firstBracket],
                    ['oas_threshold', 'Under OAS clawback', oasThreshold],
                  ] as [BracketLevel, string, number][]
                ).map(([level, label, amount]) => (
                  <button
                    key={level}
                    type="button"
                    className="press"
                    aria-pressed={withdrawal.bracketLevel === level}
                    onClick={() => setInput('withdrawal.bracketLevel', level)}
                  >
                    {label} · <b>{money(amount)}</b>
                  </button>
                ))}
                <EditThresholds />
              </>
            )}
            {withdrawal.strategyId === 'early_rrsp' &&
              (drawDown && drawDown.length > 0 ? (
                <span>
                  Draw-down years{' '}
                  <b>
                    {drawDown[0]} to {drawDown.at(-1)}
                  </b>
                  , until both of you receive CPP and OAS. The ages are set in{' '}
                  <b>When to start CPP and OAS</b>.
                </span>
              ) : (
                <span>No draw-down years with these start ages; same as Registered last.</span>
              ))}
          </div>
          <div className="chart-and-breakdown">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="chart-head">
                <p style={{ fontWeight: 600 }}>Where each year’s money comes from</p>
                <p className="note">Before tax · today’s dollars</p>
                <button
                  type="button"
                  className="info-button"
                  aria-expanded={info}
                  aria-label="How to read this chart"
                  onClick={() => setInfo(!info)}
                >
                  i
                </button>
              </div>
              {info && (
                <div className="info-panel" role="note">
                  <p>
                    Each year the plan covers the spending you set on the Spending tab, after tax.
                    The strategy decides which account the money comes from. Required RRIF and LIF
                    minimums always come out first.
                  </p>
                  <p>
                    The coloured stack is all the money coming in. Up to the <b>dashed line</b> pays
                    for spending. The <b style={{ color: '#B91C1C' }}>red hatched band</b> above it
                    is tax. Anything above that wasn’t needed that year and goes to the <b>TFSA</b>{' '}
                    (green hatching).
                  </p>
                  <button type="button" className="btn" onClick={() => setInfo(false)}>
                    Got it
                  </button>
                </div>
              )}
              <IncomeChart
                rows={rows}
                year={shownYear}
                max={top}
                markers={death ? [{ year: death, label: 'survivor' }] : []}
                label={`Yearly money by source under ${STRATEGIES[withdrawal.strategyId].title}`}
              />
              {rows.length > 0 && (
                <div className="field">
                  <input
                    id="year-slider"
                    type="range"
                    min={rows[0]!.year}
                    max={rows.at(-1)!.year}
                    value={shownYear}
                    aria-label="Year"
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                  <label htmlFor="year-slider" className="note">
                    Drag to look at a year
                  </label>
                </div>
              )}
            </div>
            <Breakdown row={rows.find((r) => r.year === shownYear)} ages={ages} />
          </div>
        </UpdatingState>
      </section>
      {learn && (
        <LearnMore
          id={learn}
          inPlan={inPlan(learn)}
          note={note(learn)}
          current={learn === withdrawal.strategyId}
          onClose={() => setLearn(undefined)}
          onUse={() => {
            setInput('withdrawal.strategyId', learn);
            setLearn(undefined);
          }}
        />
      )}
    </div>
  );
}
