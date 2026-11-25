// The four result charts (design file 48; Screens, Results tab), in today's
// dollars. Each takes ready-made rows and draws one chart; `ChartTable` gives
// the same data as a table.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money, moneyShort } from '../../state/format';
import {
  SOURCES,
  SOURCE_NAMES,
  type BalanceRow,
  type IncomeRow,
  type TaxRow,
  type WaterfallStep,
} from './data';

const HEIGHT = 280;
export const COLOURS: Record<string, string> = {
  work: '#7b6fb0',
  db: '#9c6b3f',
  cpp: '#2f7d6d',
  oas: '#4fa38f',
  registered: '#3a6ea5',
  nonreg: '#d08c2f',
  tfsa: '#5b9e47',
  tax: '#c0392b',
};

const axisMoney = (v: number) => moneyShort(v);
const tip = (v: number) => money(v);

function DeathMarker({ year }: { year: number | undefined }) {
  return year ? (
    <ReferenceLine
      x={year}
      stroke="#666"
      strokeDasharray="4 3"
      label={{ value: 'First death', fontSize: 11, position: 'top' }}
    />
  ) : null;
}

export function BalancesChart({
  rows,
  deathYear,
}: {
  rows: BalanceRow[];
  deathYear?: number | undefined;
}) {
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <AreaChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={axisMoney} width={70} />
        <Tooltip formatter={tip} />
        <Legend />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="registered"
          name="RRSP / RRIF / LIF"
          stackId="1"
          stroke={COLOURS.registered}
          fill={COLOURS.registered}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="nonreg"
          name="Non-registered"
          stackId="1"
          stroke={COLOURS.nonreg}
          fill={COLOURS.nonreg}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="tfsa"
          name="TFSA"
          stackId="1"
          stroke={COLOURS.tfsa}
          fill={COLOURS.tfsa}
        />
        <DeathMarker year={deathYear} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Money by source before tax, stacked, with the spending need as a dashed line
 * and spending plus tax as a red line above it; the band above that is what
 * went to the TFSA or savings. `year` draws the year marker.
 */
export function IncomeChart({
  rows,
  year,
  deathYear,
}: {
  rows: IncomeRow[];
  year?: number | undefined;
  deathYear?: number | undefined;
}) {
  const data = rows.map((r) => ({ ...r, needPlusTax: r.spendNeed + r.tax }));
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={axisMoney} width={70} />
        <Tooltip formatter={tip} />
        <Legend />
        {SOURCES.map((s) => (
          <Area
            isAnimationActive={false}
            key={s}
            type="monotone"
            dataKey={s}
            name={SOURCE_NAMES[s]}
            stackId="src"
            stroke={COLOURS[s]}
            fill={COLOURS[s]}
          />
        ))}
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="spendNeed"
          name="Spending need"
          stroke="#222"
          strokeDasharray="6 4"
          dot={false}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="needPlusTax"
          name="Spending need + tax"
          stroke={COLOURS.tax}
          dot={false}
        />
        {year !== undefined && <ReferenceLine x={year} stroke="#000" />}
        <DeathMarker year={deathYear} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TaxChart({
  rows,
  names,
  deathYear,
}: {
  rows: TaxRow[];
  names: [string, string];
  deathYear?: number | undefined;
}) {
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={axisMoney} width={70} />
        <Tooltip formatter={tip} />
        <Legend />
        <Bar
          isAnimationActive={false}
          dataKey="spouse0"
          name={names[0]}
          stackId="tax"
          fill="#3a6ea5"
        />
        <Bar
          isAnimationActive={false}
          dataKey="spouse1"
          name={names[1]}
          stackId="tax"
          fill="#d08c2f"
        />
        <DeathMarker year={deathYear} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EstateWaterfall({ steps, goal }: { steps: WaterfallStep[]; goal: number }) {
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <BarChart data={steps}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={axisMoney} width={70} />
        <Tooltip formatter={tip} />
        <Bar
          dataKey="base"
          stackId="w"
          fill="transparent"
          isAnimationActive={false}
          legendType="none"
        />
        <Bar isAnimationActive={false} dataKey="value" name="Amount" stackId="w">
          {steps.map((s) => (
            <Cell
              key={s.name}
              fill={s.kind === 'less' ? COLOURS.tax : s.kind === 'add' ? COLOURS.tfsa : '#3a6ea5'}
            />
          ))}
        </Bar>
        {goal > 0 && (
          <ReferenceLine
            y={goal}
            stroke="#000"
            strokeDasharray="4 3"
            label={{ value: 'Legacy goal', fontSize: 11, position: 'right' }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
