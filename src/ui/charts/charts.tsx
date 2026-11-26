// The Results charts other than income (design file 48; mockup Results), in
// today's dollars, in the mockup's colours. Legends are drawn by the Results
// tab; animation is off, so a change only redraws.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from 'recharts';
import { money, moneyShort } from '../../state/format';
import type { BalanceRow, TaxRow, WaterfallStep } from './data';

const HEIGHT = 300;
export const BALANCE_COLOURS = { registered: '#1E40AF', nonreg: '#D97706', tfsa: '#16A34A' };
export const SPOUSE_COLOURS = ['#3B6FD8', '#E8A33D'] as const;
const GRID = '#EFEDE8';
const AXIS = { fontSize: 11, fill: '#6B6964' };
const MARGIN = { top: 16, right: 8, left: 0, bottom: 0 };
const Y_AXIS_WIDTH = 64;
/** Where the first and last year sit in an area chart, from its edges (for `YearSlider`). */
export const AREA_INSET = { left: `${MARGIN.left + Y_AXIS_WIDTH}px`, right: `${MARGIN.right}px` };

const axisMoney = (v: number) => moneyShort(v);
const tip = (v: number) => money(v);

function DeathMarker({ year }: { year: number | undefined }) {
  return year ? (
    <ReferenceLine
      x={year}
      stroke="#1C1C1A"
      strokeDasharray="4 3"
      label={{ value: 'First death', fontSize: 11, position: 'top', fill: '#3F3D39' }}
    />
  ) : null;
}

export function BalancesChart({
  rows,
  deathYear,
  year,
}: {
  rows: BalanceRow[];
  deathYear?: number | undefined;
  /** The year the slider points at. */
  year?: number | undefined;
}) {
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <AreaChart data={rows} margin={MARGIN}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: '#CFCCC5' }} />
        <YAxis
          tickFormatter={axisMoney}
          width={Y_AXIS_WIDTH}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip formatter={tip} />
        {(['registered', 'nonreg', 'tfsa'] as const).map((k) => (
          <Area
            key={k}
            isAnimationActive={false}
            type="linear"
            dataKey={k}
            stackId="1"
            stroke={BALANCE_COLOURS[k]}
            fill={BALANCE_COLOURS[k]}
            fillOpacity={0.9}
          />
        ))}
        <DeathMarker year={deathYear} />
        {year !== undefined && <ReferenceLine x={year} stroke="#1C1C1A" strokeWidth={1.5} />}
      </AreaChart>
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
      <BarChart data={rows} margin={MARGIN}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: '#CFCCC5' }} />
        <YAxis
          tickFormatter={axisMoney}
          width={Y_AXIS_WIDTH}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip formatter={tip} />
        <Bar
          isAnimationActive={false}
          dataKey="spouse0"
          name={names[0]}
          stackId="tax"
          fill={SPOUSE_COLOURS[0]}
        />
        <Bar
          isAnimationActive={false}
          dataKey="spouse1"
          name={names[1]}
          stackId="tax"
          fill={SPOUSE_COLOURS[1]}
        />
        <DeathMarker year={deathYear} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const STEP_COLOURS = { total: '#1E40AF', add: '#16A34A', less: '#DC2626' };

export function EstateWaterfall({ steps, goal }: { steps: WaterfallStep[]; goal: number }) {
  // Each bar's value on the chart (AR-R2); deductions with a minus sign.
  const labelled = steps.map((s) => ({
    ...s,
    label: `${s.kind === 'less' ? '−' : ''}${moneyShort(s.value)}`,
  }));
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <BarChart data={labelled} margin={{ ...MARGIN, top: 28 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: '#CFCCC5' }} />
        <YAxis
          tickFormatter={axisMoney}
          width={Y_AXIS_WIDTH}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
        />
        {/* No tooltip: each bar shows its value (AR2-R2). */}
        <Bar
          isAnimationActive={false}
          dataKey="base"
          stackId="w"
          fill="transparent"
          legendType="none"
        />
        <Bar isAnimationActive={false} dataKey="value" name="Amount" stackId="w">
          {steps.map((s) => (
            <Cell key={s.name} fill={STEP_COLOURS[s.kind]} />
          ))}
          <LabelList
            dataKey="label"
            position="top"
            style={{ fontSize: 12, fontWeight: 600, fill: '#1C1C1A' }}
          />
        </Bar>
        {goal > 0 && (
          <ReferenceLine
            y={goal}
            stroke="#1C1C1A"
            strokeDasharray="4 3"
            label={{ value: 'Legacy goal', fontSize: 11, position: 'right', fill: '#3F3D39' }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
