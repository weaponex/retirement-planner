// The reference plan (design file 58): the engine must match every cell of
// expected-rows.csv, built by a separate session from the design alone. Money
// cells match within $1; every other cell (year, age, alive, splitShare)
// exactly, as written with 2 decimal places.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, rebaseConfig } from '../../src/engine/config/load';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import type { PlanInputs, YearRow } from '../../src/engine/types';
import { normalizeInputs } from '../../src/engine/units';

const DIR = join(import.meta.dirname, '..', 'fixtures', 'reference-plan');
const MONEY_TOLERANCE = 1;
const EXACT = new Set(['year', 'age', 'alive', 'splitShare']);

/** Flattens rows into the design's CSV columns (design: Data contracts, Reference file). */
export function flatten(rows: YearRow[]): { header: string[]; cells: (string | number)[][] } {
  const ids = [
    ...new Set(rows.flatMap((r) => [...Object.keys(r.accounts), ...Object.keys(r.balancesEndNom)])),
  ].sort();
  const header: string[] = ['year'];
  const spouseFields = Object.keys(rows[0]!.spouse[0]);
  const accountFields = Object.keys(Object.values(rows[0]!.accounts)[0]!);
  const estateFields = Object.keys(rows[0]!.estate);
  for (const i of [0, 1]) {
    for (const f of spouseFields) {
      if (f === 'withdrawals') ids.forEach((id) => header.push(`spouse.${i}.withdrawals.${id}`));
      else header.push(`spouse.${i}.${f}`);
    }
  }
  ids.forEach((id) => accountFields.forEach((f) => header.push(`accounts.${id}.${f}`)));
  ids.forEach((id) => header.push(`balancesEndNom.${id}`));
  header.push('cashYieldNom', 'spendNeedNom', 'afterTaxCashNom', 'surplusNom', 'shortfallNom');
  estateFields.forEach((f) => header.push(`estate.${f}`));

  const cells = rows.map((r) =>
    header.map((h) => {
      const parts = h.split('.');
      let v: unknown = r;
      for (const part of parts) v = (v as Record<string, unknown> | undefined)?.[part];
      if (typeof v === 'boolean') return String(v);
      return typeof v === 'number' ? v : 0;
    }),
  );
  return { header, cells };
}

function readCsv(path: string): { header: string[]; rows: string[][] } {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  return { header: lines[0]!.split(','), rows: lines.slice(1).map((l) => l.split(',')) };
}

function engineRows(): YearRow[] {
  const plan = JSON.parse(readFileSync(join(DIR, 'inputs.json'), 'utf8')) as PlanInputs;
  const cfg = rebaseConfig(loadConfig(), plan.planStartYear);
  const inputs = normalizeInputs(plan, cfg);
  const variant = {
    id: 'reference',
    strategyId: plan.withdrawal.strategyId,
    presetId: plan.investing.presetId,
  };
  return runPath(inputs, cfg, ontario, variant, 'full').rows;
}

/** Every cell that differs: column, year, expected, engine. */
export function differences(): {
  column: string;
  year: string;
  expected: string;
  engine: string;
}[] {
  const expected = readCsv(join(DIR, 'expected-rows.csv'));
  const { header, cells } = flatten(engineRows());
  const out: { column: string; year: string; expected: string; engine: string }[] = [];
  if (header.join(',') !== expected.header.join(',')) {
    out.push({
      column: '(header)',
      year: '',
      expected: expected.header.join(','),
      engine: header.join(','),
    });
    return out;
  }
  expected.rows.forEach((row, r) => {
    row.forEach((want, c) => {
      const got = cells[r]?.[c];
      const column = header[c]!;
      const field = column.split('.').at(-1)!;
      const engine = typeof got === 'number' ? got.toFixed(2) : String(got);
      const same = EXACT.has(field)
        ? engine === want || (typeof got === 'number' && Number(want) === Number(engine))
        : typeof got === 'number' && Math.abs(got - Number(want)) <= MONEY_TOLERANCE;
      if (!same) out.push({ column, year: row[0]!, expected: want, engine });
    });
  });
  if (cells.length !== expected.rows.length) {
    out.push({
      column: '(rows)',
      year: '',
      expected: String(expected.rows.length),
      engine: String(cells.length),
    });
  }
  return out;
}

describe('reference plan', () => {
  it('matches every cell of expected-rows.csv (money within $1)', () => {
    const diffs = differences();
    expect(diffs.slice(0, 20)).toEqual([]);
  });
});
