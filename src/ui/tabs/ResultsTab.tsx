// Results (design: Screens, Results tab; mockups Results, States): the goals,
// warnings and four charts, one at a time, each with a legend, a caption and a
// table view.
import { useMemo, useState } from 'react';
import type { Result } from '../../engine/types';
import { money } from '../../state/format';
import { usePlan } from '../../state/react';
import type { TabId } from '../../state/store';
import { useSpouseName } from '../common';
import {
  balanceRows,
  estateSteps,
  firstDeathYear,
  incomeRows,
  SOURCES,
  SOURCE_NAMES,
  taxRows,
  type IncomeRow,
} from '../charts/data';
import {
  BALANCE_COLOURS,
  AREA_INSET,
  BalancesChart,
  EstateWaterfall,
  SPOUSE_COLOURS,
  TaxChart,
} from '../charts/charts';
import { ChartTable } from '../charts/ChartTable';
import { INCOME_INSET, IncomeChart, IncomeLegend } from '../charts/IncomeChart';
import { YearSlider } from '../charts/YearSlider';
import { STRATEGIES } from '../content/explanations';
import { useStatus, useToday } from '../hooks';
import { Goals } from '../results/Goals';
import { IntegrityError } from '../results/IntegrityError';
import { StatusLine, UpdatingState } from '../results/UpdatingState';
import { WarningsList } from '../results/WarningsList';

type ChartId = 'balances' | 'income' | 'tax' | 'estate';
const CHARTS: { id: ChartId; label: string }[] = [
  { id: 'balances', label: 'Balances' },
  { id: 'income', label: 'Income by source' },
  { id: 'tax', label: 'Tax by spouse' },
  { id: 'estate', label: 'Estate' },
];

/** The tab an input path is on. */
export function tabFor(path: string): TabId {
  if (path.startsWith('spouses')) return 'household';
  if (
    path.startsWith('accounts') ||
    path.startsWith('dbPensions') ||
    path.startsWith('investing')
  ) {
    return 'savings';
  }
  if (path.startsWith('spending')) return 'spending';
  if (path.startsWith('estate')) return 'estate';
  return 'withdrawals';
}

function MissingList() {
  const missing = usePlan((s) => s.missing);
  const setView = usePlan((s) => s.setView);
  return (
    <section className="card">
      <h2 className="card-title">A few details are missing</h2>
      <ul className="missing">
        {missing.map((m) => (
          <li key={m.path}>
            <button type="button" className="link" onClick={() => setView(tabFor(m.path), m.path)}>
              {m.message}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend">
      {items.map(([name, colour]) => (
        <span key={name}>
          <span className="swatch" style={{ background: colour }} />
          {name}
        </span>
      ))}
    </div>
  );
}

/** "Money runs out at Sam's age 92, before the second death." */
function useShortfallBanner(result: Result): string | undefined {
  const spouses = usePlan((s) => s.inputs.spouses);
  const names = [useSpouseName(0), useSpouseName(1)];
  const year = result.goals.spending.firstShortfallYear;
  if (year === undefined) return undefined;
  const row = result.plan.rows.find((r) => r.year === year);
  const alive = ([0, 1] as const).filter((i) => row?.spouse[i].alive);
  const i = alive.length === 1 ? alive[0]! : 1;
  const age = year - (spouses[i].birthYear ?? year);
  return `Money runs out at ${names[i]}’s age ${age}, in ${year}, before the second death.`;
}

function Charts({ result }: { result: Result }) {
  const strategyId = usePlan((s) => s.inputs.withdrawal.strategyId);
  const names: [string, string] = [useSpouseName(0), useSpouseName(1)];
  const toToday = useToday();
  const [chart, setChart] = useState<ChartId>('balances');
  const [table, setTable] = useState(false);
  const [year, setYear] = useState<number | undefined>();
  const death = firstDeathYear(result.plan.rows);
  const data = useMemo(() => {
    const strategy =
      result.strategies.find((s) => s.strategyId === strategyId) ?? result.strategies[0]!;
    return {
      balances: balanceRows(result.plan.rows, toToday),
      income: incomeRows(strategy.rows, toToday),
      tax: taxRows(result.plan.rows, toToday),
      estate: estateSteps(result.estate),
    };
  }, [result, strategyId, toToday]);
  const total = (r: { registered: number; nonreg: number; tfsa: number } | undefined) =>
    r ? r.registered + r.nonreg + r.tfsa : 0;
  const incomeTax = data.tax.reduce((s, r) => s + r.spouse0 + r.spouse1, 0);
  const first = data.balances[0]?.year ?? 0;
  const last = data.balances.at(-1)?.year ?? first;
  const shown = year !== undefined && year >= first && year <= last ? year : first;
  const balanceAt = data.balances.find((r) => r.year === shown);
  const incomeAt = data.income.find((r) => r.year === shown);
  const lastSurvivor = result.plan.rows.at(-1)?.spouse[0].alive ? names[0] : names[1];
  const incomeColumns = [
    { label: 'Year', value: (r: IncomeRow) => r.year },
    ...SOURCES.map((s) => ({ label: SOURCE_NAMES[s], value: (r: IncomeRow) => money(r[s]) })),
    { label: 'Tax', value: (r: IncomeRow) => money(r.tax) },
    { label: 'Spending need', value: (r: IncomeRow) => money(r.spendNeed) },
  ];
  return (
    <section className="card">
      <div className="row" style={{ gap: 12 }}>
        <h2 className="card-title">Charts</h2>
        <span className="note">Today’s dollars · “{STRATEGIES[strategyId].title}”</span>
        <span className="spacer" />
        <div className="chart-tabs" role="tablist" aria-label="Chart">
          {CHARTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={chart === c.id}
              onClick={() => setChart(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chart === 'balances' &&
          (table ? (
            <ChartTable
              caption="Balances at the end of each year"
              rows={data.balances}
              columns={[
                { label: 'Year', value: (r) => r.year },
                { label: 'RRSP / RRIF / LIF', value: (r) => money(r.registered) },
                { label: 'Non-registered', value: (r) => money(r.nonreg) },
                { label: 'TFSA', value: (r) => money(r.tfsa) },
              ]}
            />
          ) : (
            <>
              <BalancesChart rows={data.balances} deathYear={death} year={shown} />
              <YearSlider
                id="balances-year"
                first={first}
                last={last}
                value={shown}
                onChange={setYear}
                {...AREA_INSET}
              />
              {balanceAt && (
                <p className="year-readout" aria-live="polite">
                  <b>{shown}</b> · RRSP / RRIF / LIF {money(balanceAt.registered)} · Non-registered{' '}
                  {money(balanceAt.nonreg)} · TFSA {money(balanceAt.tfsa)} · Total{' '}
                  <b>{money(total(balanceAt))}</b>
                </p>
              )}
              <Legend
                items={[
                  ['RRSP / RRIF / LIF', BALANCE_COLOURS.registered],
                  ['Non-registered', BALANCE_COLOURS.nonreg],
                  ['TFSA', BALANCE_COLOURS.tfsa],
                ]}
              />
              <p className="note">
                Balances at the end of each year. Total {money(total(data.balances[0]))} at the end
                of {data.balances[0]?.year} and {money(total(data.balances.at(-1)))} at the second
                death.
              </p>
            </>
          ))}
        {chart === 'income' &&
          (table ? (
            <ChartTable
              caption="Income by source before tax"
              rows={data.income}
              columns={incomeColumns}
            />
          ) : (
            <>
              <IncomeChart
                rows={data.income}
                year={incomeAt ? shown : undefined}
                markers={death ? [{ year: death, label: 'survivor' }] : []}
                label={`Yearly money by source under ${STRATEGIES[strategyId].title}`}
              />
              {data.income.length > 0 && (
                <YearSlider
                  id="income-year"
                  first={data.income[0]!.year}
                  last={data.income.at(-1)!.year}
                  value={incomeAt ? shown : data.income[0]!.year}
                  onChange={setYear}
                  {...INCOME_INSET}
                />
              )}
              {incomeAt && (
                <p className="year-readout" aria-live="polite">
                  <b>{shown}</b>
                  {SOURCES.filter((s) => incomeAt[s] > 0).map((s) => (
                    <span key={s}>
                      {' '}
                      · {SOURCE_NAMES[s]} {money(incomeAt[s])}
                    </span>
                  ))}{' '}
                  · Tax {money(incomeAt.tax)} · Spending need {money(incomeAt.spendNeed)}
                </p>
              )}
              <IncomeLegend />
              <p className="note">
                Before tax. The same chart as on the Withdrawals tab, for the strategy you chose;
                there you can compare strategies and look at one year.
              </p>
            </>
          ))}
        {chart === 'tax' &&
          (table ? (
            <ChartTable
              caption="Tax by spouse, including any clawback, after splitting"
              rows={data.tax}
              columns={[
                { label: 'Year', value: (r) => r.year },
                { label: names[0], value: (r) => money(r.spouse0) },
                { label: names[1], value: (r) => money(r.spouse1) },
              ]}
            />
          ) : (
            <>
              <TaxChart rows={data.tax} names={names} deathYear={death} />
              <Legend
                items={[
                  [names[0], SPOUSE_COLOURS[0]],
                  [names[1], SPOUSE_COLOURS[1]],
                ]}
              />
              <p className="note">
                Federal and Ontario income tax, including any OAS clawback, after pension splitting.
                Tax on the final return and probate are on the Estate chart. Income tax over the
                plan: {money(incomeTax)}.
              </p>
            </>
          ))}
        {chart === 'estate' &&
          (table ? (
            <ChartTable
              caption={`The estate in ${result.estate.year}`}
              rows={data.estate}
              columns={[
                { label: 'Step', value: (r) => r.name },
                {
                  label: 'Amount',
                  value: (r) => (r.kind === 'less' ? `−${money(r.value)}` : money(r.value)),
                },
              ]}
            />
          ) : (
            <>
              <EstateWaterfall steps={data.estate} goal={result.goals.legacy.goalToday} />
              <p className="note">
                At {lastSurvivor}’s death in {result.estate.year}, in today’s dollars. The final
                return’s tax covers {money(result.estate.deemedRegisteredToday)} of registered
                balances and {money(result.estate.deemedGainsToday)} of deemed gains. Registered
                accounts and the TFSA name a beneficiary, so they skip probate; non-registered
                savings and the home pass through the estate. The home is exempt from capital gains
                tax.
              </p>
            </>
          ))}
        <label className="check">
          <input type="checkbox" checked={table} onChange={(e) => setTable(e.target.checked)} />
          View as table
        </label>
      </div>
    </section>
  );
}

function ResultsBody({ result }: { result: Result }) {
  const banner = useShortfallBanner(result);
  return (
    <UpdatingState>
      {banner && <div className="banner-bad">{banner}</div>}
      <Goals result={result} />
      <WarningsList />
      <Charts result={result} />
    </UpdatingState>
  );
}

export function ResultsTab() {
  const status = useStatus();
  const result = usePlan((s) => s.result);
  const error = usePlan((s) => s.error);
  const spouses = usePlan((s) => s.inputs.spouses);
  const names = [useSpouseName(0), useSpouseName(1)];
  const targets = spouses
    .map((s, i) => (s.lifeExpectancyTarget !== null ? `${names[i]} ${s.lifeExpectancyTarget}` : ''))
    .filter(Boolean)
    .join(', ');
  return (
    <div className="content">
      <div className="results-top">
        <p>
          All amounts in today’s dollars, assuming deaths at the target ages
          {targets ? ` (${targets})` : ''} and the same return every year.
        </p>
        <StatusLine />
      </div>
      {status === 'incomplete' && <MissingList />}
      {status === 'error' && error && <IntegrityError error={error} />}
      {status !== 'incomplete' && status !== 'error' && result && <ResultsBody result={result} />}
    </div>
  );
}
