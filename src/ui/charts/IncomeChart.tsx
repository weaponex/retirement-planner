// "Where each year's money comes from" (mockup Withdrawals): the sources
// stacked as coloured bands with their names on them, the spending need as a
// dashed line, tax as a red hatched band above it, and money not needed (saved)
// as a green hatched band on top. Drawn as plain SVG, in today's dollars.
import { SOURCE_COLOURS } from '../common';
import type { IncomeRow, Source } from './data';
import { SOURCES } from './data';

const W0 = 44;
/** Drawn at about the width it shows in, so its text stays 11 px. */
const WIDTH = 860;
const W1 = WIDTH - 4;
const H0 = 270;
const HT = 10;
const THOUSAND = 1000;
/** A band's name shows only where it is at least this tall. */
const MIN_LABEL_HEIGHT = 15;
const CHAR_WIDTH = 6.4;

const SHORT: Record<Source, string> = {
  work: 'Work',
  db: 'Pension',
  cpp: 'CPP',
  oas: 'OAS',
  registered: 'RRSP / RRIF',
  nonreg: 'Non-reg.',
  tfsa: 'TFSA',
};
const DARK_TEXT: Partial<Record<Source, string>> = { work: '#1C1C1A', oas: '#0B3B36' };

export const gross = (r: IncomeRow) => SOURCES.reduce((t, s) => t + r[s], 0);
const kfmt = (v: number) => `$${Math.round(v / THOUSAND).toLocaleString('en-CA')}k`;

/** Where the first and last year sit, from the chart's edges (for `YearSlider`). */
export const INCOME_INSET = {
  left: `${((W0 / WIDTH) * 100).toFixed(3)}%`,
  right: `${(((WIDTH - W1) / WIDTH) * 100).toFixed(3)}%`,
};

export interface IncomeChartProps {
  rows: IncomeRow[];
  /** The year marker. */
  year?: number | undefined;
  /** The top of the scale, so several strategies share one scale. */
  max?: number | undefined;
  /** Years named under the axis, for example the first death. */
  markers?: { year: number; label: string }[] | undefined;
  label: string;
}

export function IncomeChart({ rows, year, max, markers = [], label }: IncomeChartProps) {
  if (rows.length === 0) return null;
  const first = rows[0]!.year;
  const last = rows.at(-1)!.year;
  const top = Math.max(max ?? 0, ...rows.map(gross), 1);
  const xOf = (y: number) => W0 + ((y - first) / Math.max(last - first, 1)) * (W1 - W0);
  const yOf = (v: number) => H0 - (v / top) * (H0 - HT);
  const band = (lo: (r: IncomeRow) => number, hi: (r: IncomeRow) => number) => {
    const upper = rows.map((r) => `${xOf(r.year).toFixed(1)},${yOf(hi(r)).toFixed(1)}`);
    const lower = [...rows]
      .reverse()
      .map((r) => `${xOf(r.year).toFixed(1)},${yOf(lo(r)).toFixed(1)}`);
    return `M${upper.join(' L')} L${lower.join(' L')} Z`;
  };
  const cum = (r: IncomeRow, n: number) => SOURCES.slice(0, n).reduce((t, s) => t + r[s], 0);
  const need = (r: IncomeRow) => Math.min(r.spendNeed, gross(r));
  const needTax = (r: IncomeRow) => Math.min(r.spendNeed + r.tax, gross(r));
  const line = `M${rows.map((r) => `${xOf(r.year).toFixed(1)},${yOf(need(r)).toFixed(1)}`).join(' L')}`;
  const grid = [1, 2, 3].map((k) => (top * k) / 3);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} 300`}
      width="100%"
      role="img"
      aria-label={label}
      style={{ display: 'block' }}
    >
      <defs>
        <pattern
          id="hTax"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#DC2626" fillOpacity="0.35" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#B91C1C" strokeWidth="2.5" />
        </pattern>
        <pattern
          id="hSave"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <rect width="6" height="6" fill="#FFFFFF" fillOpacity="0.55" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#15803D" strokeWidth="2" />
        </pattern>
      </defs>
      {grid.map((v) => (
        <g key={v}>
          <line x1={W0} x2={W1} y1={yOf(v)} y2={yOf(v)} stroke="#EFEDE8" />
          <text
            x="38"
            y={yOf(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="11"
            fill="#6B6964"
          >
            {kfmt(v)}
          </text>
        </g>
      ))}
      <text
        x="38"
        y={yOf(0)}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize="11"
        fill="#6B6964"
      >
        $0
      </text>
      {SOURCES.map((s, i) => (
        <path
          key={s}
          d={band(
            (r) => cum(r, i),
            (r) => cum(r, i + 1),
          )}
          fill={SOURCE_COLOURS[s]}
        />
      ))}
      <path d={band(need, needTax)} fill="url(#hTax)" />
      <path d={band(needTax, gross)} fill="url(#hSave)" />
      <path d={line} fill="none" stroke="#1C1C1A" strokeWidth="2" strokeDasharray="6 4" />
      {SOURCES.map((s, i) => {
        const best = rows.reduce((b, r) => (r[s] > b[s] ? r : b), rows[0]!);
        const h = (best[s] / top) * (H0 - HT);
        if (h < MIN_LABEL_HEIGHT) return null;
        const w = SHORT[s].length * CHAR_WIDTH + 8;
        const x = Math.max(W0 + w / 2 + 4, Math.min(W1 - w / 2 - 4, xOf(best.year)));
        return (
          <text
            key={s}
            x={x}
            y={yOf(cum(best, i) + best[s] / 2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill={DARK_TEXT[s] ?? '#FFFFFF'}
            pointerEvents="none"
          >
            {SHORT[s]}
          </text>
        );
      })}
      <line x1={W0} x2={W1} y1={yOf(0)} y2={yOf(0)} stroke="#CFCCC5" />
      {year !== undefined && (
        <line x1={xOf(year)} x2={xOf(year)} y1="8" y2={yOf(0)} stroke="#1C1C1A" strokeWidth="1.5" />
      )}
      <text x={xOf(first)} y="290" textAnchor="start" fontSize="11" fill="#6B6964">
        {first}
      </text>
      {markers
        .filter((m) => m.year > first + 2 && m.year < last - 3)
        .map((m) => (
          <text
            key={m.label}
            x={xOf(m.year)}
            y="290"
            textAnchor="middle"
            fontSize="11"
            fill="#6B6964"
          >
            {m.year} {m.label}
          </text>
        ))}
      <text x={xOf(last)} y="290" textAnchor="end" fontSize="11" fill="#6B6964">
        {last}
      </text>
    </svg>
  );
}

/** The chart's legend. */
export function IncomeLegend() {
  const names: Record<Source, string> = {
    work: 'Work',
    db: 'Workplace pension',
    cpp: 'CPP',
    oas: 'OAS',
    registered: 'RRSP / RRIF / LIF',
    nonreg: 'Non-registered',
    tfsa: 'TFSA',
  };
  return (
    <div className="legend">
      {SOURCES.map((s) => (
        <span key={s}>
          <span className="swatch" style={{ background: SOURCE_COLOURS[s] }} />
          {names[s]}
        </span>
      ))}
      <span>
        <svg width="18" height="6" aria-hidden="true">
          <line
            x1="0"
            y1="3"
            x2="18"
            y2="3"
            stroke="#1C1C1A"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
        Spending need, after tax
      </span>
    </div>
  );
}
