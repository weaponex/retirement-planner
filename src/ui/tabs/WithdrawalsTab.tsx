// Withdrawals (design: Screens, Withdrawals tab): CPP and OAS start ages,
// conversions and splitting, then the three strategy cards, the options row,
// the income chart with its year slider and the fixed 11-row breakdown.
import { useMemo, useState } from 'react';
import { deaths } from '../../engine/project/death';
import type { BracketLevel, Comparison, StrategyId } from '../../engine/types';
import { normalizeInputs } from '../../engine/units';
import { drawDownYears } from '../../engine/withdraw/earlyRrsp';
import { rebaseConfig } from '../../engine/config/load';
import { money, moneyDiff } from '../../state/format';
import { usePlan } from '../../state/react';
import { readyToRun } from '../../state/readiness';
import { RuleStrip, Section, useSpouseName } from '../common';
import { planConfig } from '../config';
import { incomeRows, SOURCES, SOURCE_NAMES, firstDeathYear, type IncomeRow } from '../charts/data';
import { IncomeChart } from '../charts/charts';
import { OPPOSITE_DIRECTIONS, STRATEGIES } from '../content/explanations';
import { useToday } from '../hooks';
import { AgeInput } from '../inputs/AgeInput';
import { SegmentedChoice } from '../inputs/SegmentedChoice';
import { UpdatingState } from '../results/UpdatingState';
import { formatRuleKey } from '../rules';

const ORDER: StrategyId[] = ['registered_last', 'fill_brackets', 'early_rrsp'];

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

export function SetupSections() {
  const names = [useSpouseName(0), useSpouseName(1)];
  // Select the stable array, then filter: a selector must not build a new array.
  const allAccounts = usePlan((s) => s.inputs.accounts);
  const accounts = useMemo(
    () => allAccounts.filter((a) => a.type === 'rrsp' || a.type === 'lira'),
    [allAccounts],
  );
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const s0 = usePlan((s) => s.inputs.spouses);
  return (
    <>
      <Section
        title="When to start CPP and OAS"
        summary={s0
          .map((s, i) => `${names[i]}: CPP ${s.cppStartAge ?? '?'}, OAS ${s.oasStartAge ?? '?'}`)
          .join(' · ')}
      >
        <div className="columns">
          {([0, 1] as const).map((i) => (
            <div key={i} className="column">
              <h4>{names[i]}</h4>
              <AgeInput path={`spouses.${i}.cppStartAge`} label="CPP start age" min={60} max={70} />
              <AgeInput path={`spouses.${i}.oasStartAge`} label="OAS start age" min={65} max={70} />
            </div>
          ))}
        </div>
        <RuleStrip
          items={[
            { key: 'federal.cpp.adjust.early_per_month', label: 'CPP, each month before 65' },
            { key: 'federal.cpp.adjust.late_per_month', label: 'CPP, each month after 65' },
            { key: 'federal.oas.deferral.per_month', label: 'OAS, each month after 65' },
          ]}
        />
      </Section>
      <Section
        title="Converting RRSP and LIRA"
        summary={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
      >
        {accounts.length === 0 && (
          <p className="hint">No RRSP or LIRA accounts on the Savings tab.</p>
        )}
        {accounts.map((a) => (
          <AgeInput
            key={a.id}
            path={`accounts.${a.id}.conversionAge`}
            label={`${names[a.owner]}: ${a.type === 'rrsp' ? 'RRSP to RRIF' : 'LIRA to LIF'} at age`}
            min={55}
            max={71}
          />
        ))}
      </Section>
      <Section
        title="Pension income splitting"
        summary={`Automatic; up to ${formatRuleKey('federal.split.max_share', overrides)}, RRIF and LIF from ${formatRuleKey('federal.split.min_age_rrif', overrides)}`}
      >
        <p className="hint">
          Each year the plan tries splits of eligible pension income in both directions and keeps
          the one with the lowest household tax, as tax software would at filing time.
        </p>
      </Section>
    </>
  );
}

/** The difference from "Registered last": only the legacy is coloured, and not when the two move in opposite directions. */
export function Difference({ vs, isBase }: { vs: Comparison; isBase: boolean }) {
  const zero = Math.abs(vs.lifetimeTaxDiffToday) < 1 && Math.abs(vs.legacyDiffToday) < 1;
  if (zero) {
    return <div className="diff">{isBase ? 'The comparison base' : 'Same as Registered last'}</div>;
  }
  const legacyClass = vs.oppositeDirections ? 'neutral' : vs.legacyDiffToday >= 0 ? 'more' : 'less';
  return (
    <div className="diff">
      <span className={legacyClass}>
        Legacy {moneyDiff(vs.legacyDiffToday)} {vs.legacyDiffToday >= 0 ? 'higher' : 'lower'}
      </span>
      {' · '}
      <span className="neutral">
        tax {moneyDiff(vs.lifetimeTaxDiffToday)} {vs.lifetimeTaxDiffToday <= 0 ? 'lower' : 'higher'}
      </span>
      {vs.oppositeDirections && <div className="hint">{OPPOSITE_DIRECTIONS}</div>}
    </div>
  );
}

function LearnMore({ id, onClose, onUse }: { id: StrategyId; onClose(): void; onUse(): void }) {
  const t = STRATEGIES[id];
  return (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="learn-title" className="dialog">
        <h3 id="learn-title">{t.title}</h3>
        <p>{t.what}</p>
        <p>{t.effect}</p>
        <h4>Pros</h4>
        <ul>
          {t.pros.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <h4>Cons</h4>
        <ul>
          {t.cons.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p>{t.whenItFits}</p>
        {t.choosing && <p className="hint">{t.choosing}</p>}
        <div className="dialog-buttons">
          <button type="button" onClick={onUse}>
            Use this strategy
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const BREAKDOWN: { key: keyof IncomeRow; label: string }[] = [
  ...SOURCES.map((s) => ({ key: s as keyof IncomeRow, label: SOURCE_NAMES[s] })),
  { key: 'tax', label: 'Tax' },
  { key: 'clawback', label: 'of which OAS clawback' },
  { key: 'savedToTfsa', label: 'Moved to the TFSA' },
  { key: 'spendNeed', label: 'Spending need' },
];

export function Breakdown({ row }: { row: IncomeRow | undefined }) {
  return (
    <table className="breakdown">
      <caption>{row ? row.year : 'No year'}</caption>
      <tbody>
        {BREAKDOWN.map((b) => {
          const v = row ? (row[b.key] as number) : 0;
          return (
            <tr key={b.key}>
              <th scope="row">{b.label}</th>
              <td>{Math.abs(v) < 0.5 ? '–' : money(v)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function WithdrawalsTab() {
  const result = usePlan((s) => s.result);
  const withdrawal = usePlan((s) => s.inputs.withdrawal);
  const setInput = usePlan((s) => s.setInput);
  const toToday = useToday();
  const drawDown = useDrawDownYears();
  const [learn, setLearn] = useState<StrategyId | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const selected = result?.strategies.find((s) => s.strategyId === withdrawal.strategyId);
  const rows = useMemo(
    () => (selected ? incomeRows(selected.rows, toToday) : []),
    [selected, toToday],
  );
  const shownYear = year !== undefined && rows.some((r) => r.year === year) ? year : rows[0]?.year;
  const deathYear = result ? firstDeathYear(result.plan.rows) : undefined;
  const last = result?.plan.rows.at(-1)?.year;
  return (
    <div className="tab">
      <h2>Withdrawals</h2>
      <SetupSections />
      <h3>Which accounts pay for your spending</h3>
      <UpdatingState>
        <div className="cards" role="radiogroup" aria-label="Withdrawal strategy">
          {ORDER.map((id) => {
            const s = result?.strategies.find((x) => x.strategyId === id);
            const tfsa = s
              ? s.rows.reduce((sum, r) => sum + toToday(r.savedToTfsaNom, r.year), 0)
              : 0;
            const legacyToday =
              s && last !== undefined ? toToday(s.summary.afterTaxLegacyNom, last) : 0;
            return (
              <div
                key={id}
                role="radio"
                aria-label={STRATEGIES[id].title}
                aria-checked={withdrawal.strategyId === id}
                tabIndex={0}
                className={withdrawal.strategyId === id ? 'card selected' : 'card'}
                onClick={() => setInput('withdrawal.strategyId', id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setInput('withdrawal.strategyId', id);
                }}
              >
                <div className="card-head">
                  <strong>{STRATEGIES[id].title}</strong>
                  <button
                    type="button"
                    className="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLearn(id);
                    }}
                  >
                    Learn more
                  </button>
                </div>
                <p className="hint">{STRATEGIES[id].short}</p>
                {s ? (
                  <>
                    <p className="figures">
                      <b>Lifetime tax {money(s.summary.lifetimeTaxToday)}</b>
                      <br />
                      <b>Money left {money(legacyToday)}</b>
                    </p>
                    <Difference vs={s.vsRegisteredLast} isBase={id === 'registered_last'} />
                    <div className="hint">
                      Moved to the TFSA {money(tfsa)} · clawback years {s.summary.clawbackYears}
                    </div>
                  </>
                ) : (
                  <p className="hint">Results appear when the plan is complete.</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="options-row">
          {withdrawal.strategyId === 'fill_brackets' && (
            <>
              <SegmentedChoice<BracketLevel>
                legend="Level"
                options={[
                  { value: 'first_bracket', label: 'Top of the first bracket' },
                  { value: 'oas_threshold', label: 'Just under the OAS clawback' },
                ]}
                value={withdrawal.bracketLevel}
                onChange={(v) => setInput('withdrawal.bracketLevel', v)}
              />
              <RuleStrip
                items={[
                  { key: 'federal.tax.brackets', label: 'Federal brackets' },
                  { key: 'federal.oas.recovery.threshold', label: 'Clawback threshold' },
                ]}
              />
            </>
          )}
          {withdrawal.strategyId === 'early_rrsp' &&
            (drawDown && drawDown.length > 0 ? (
              <span>
                Draw-down years: {drawDown[0]}–{drawDown.at(-1)} (set by the CPP and OAS start ages
                above)
              </span>
            ) : (
              <span>No draw-down years with these start ages; same as Registered last</span>
            ))}
          {withdrawal.strategyId === 'registered_last' && <span className="hint">No settings</span>}
        </div>
        <div className="chart-and-breakdown">
          <div className="chart">
            <IncomeChart rows={rows} year={shownYear} deathYear={deathYear} />
            {rows.length > 0 && (
              <input
                type="range"
                className="year-slider"
                min={rows[0]!.year}
                max={rows.at(-1)!.year}
                value={shownYear}
                aria-label="Year"
                onChange={(e) => setYear(Number(e.target.value))}
              />
            )}
            <p className="hint">
              Each year’s money by source before tax, in today’s dollars. The dashed line is the
              spending need; the red line adds tax; anything above it was not needed and was saved.
            </p>
          </div>
          <Breakdown row={rows.find((r) => r.year === shownYear)} />
        </div>
      </UpdatingState>
      {learn && (
        <LearnMore
          id={learn}
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
