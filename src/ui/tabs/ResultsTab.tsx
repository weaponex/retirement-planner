// Results (design: Screens, Results tab): the two goals, warnings with tips,
// and four charts, one at a time, each with a table view.
import { useMemo, useState } from 'react';
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
import { BalancesChart, EstateWaterfall, IncomeChart, TaxChart } from '../charts/charts';
import { ChartTable } from '../charts/ChartTable';
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
    <ul className="missing">
      {missing.map((m) => (
        <li key={m.path}>
          <button type="button" className="link" onClick={() => setView(tabFor(m.path), m.path)}>
            {m.message}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Charts() {
  const result = usePlan((s) => s.result)!;
  const strategyId = usePlan((s) => s.inputs.withdrawal.strategyId);
  const names: [string, string] = [useSpouseName(0), useSpouseName(1)];
  const toToday = useToday();
  const [chart, setChart] = useState<ChartId>('balances');
  const [table, setTable] = useState(false);
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
  const incomeColumns = [
    { label: 'Year', value: (r: IncomeRow) => r.year },
    ...SOURCES.map((s) => ({ label: SOURCE_NAMES[s], value: (r: IncomeRow) => money(r[s]) })),
    { label: 'Tax', value: (r: IncomeRow) => money(r.tax) },
    { label: 'Spending need', value: (r: IncomeRow) => money(r.spendNeed) },
  ];
  return (
    <section aria-labelledby="charts-h">
      <h3 id="charts-h">Charts, in today’s dollars</h3>
      <div className="chart-buttons" role="tablist">
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
        <label className="check">
          <input type="checkbox" checked={table} onChange={(e) => setTable(e.target.checked)} />{' '}
          View as table
        </label>
      </div>
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
          <BalancesChart rows={data.balances} deathYear={death} />
        ))}
      {chart === 'income' &&
        (table ? (
          <ChartTable
            caption="Income by source before tax"
            rows={data.income}
            columns={incomeColumns}
          />
        ) : (
          <IncomeChart rows={data.income} deathYear={death} />
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
          <TaxChart rows={data.tax} names={names} deathYear={death} />
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
            <p className="hint">
              The final return’s tax covers {money(result.estate.deemedRegisteredToday)} of
              registered balances and {money(result.estate.deemedGainsToday)} of deemed gains.
            </p>
          </>
        ))}
    </section>
  );
}

export function ResultsTab() {
  const status = useStatus();
  const result = usePlan((s) => s.result);
  const error = usePlan((s) => s.error);
  return (
    <div className="tab">
      <h2>Results</h2>
      <StatusLine />
      {status === 'incomplete' && <MissingList />}
      {status === 'error' && error && <IntegrityError error={error} />}
      {status !== 'incomplete' && status !== 'error' && result && (
        <UpdatingState>
          <Goals result={result} />
          <WarningsList />
          <Charts />
        </UpdatingState>
      )}
    </div>
  );
}
