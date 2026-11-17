import { describe, expect, it } from 'vitest';
import { KEY_SPECS, ALL_KEYS } from '../../src/engine/config/keys';
import {
  buildConfig,
  checkBundle,
  configStatus,
  type RawBundle,
} from '../../src/engine/config/load';
import { checkEntry, SPEC_BY_KEY } from '../../src/engine/config/schema';
import { compareFiles } from '../../tools/configCompare';
import { readBundle, currentYear, sourcesKeys } from '../../tools/lib';

const validated = (value: unknown, unit = 'rate') => ({
  value,
  unit,
  taxYear: 2026,
  indexed: false,
  source: { url: 'https://example.test', locator: 'table 1' },
  fetchedOn: '2026-01-05',
  validation: { status: 'validated', by: 'tester', on: '2026-01-06' },
});

const unfetched = (unit = 'rate') => ({
  value: null,
  unit,
  taxYear: 2026,
  indexed: false,
  source: { url: 'see config/SOURCES.md', locator: 'to be fetched' },
  fetchedOn: null,
  validation: { status: 'unfetched' },
});

function skeleton(): RawBundle {
  const files: RawBundle['files'] = {};
  for (const s of KEY_SPECS) (files[s.file] ??= {})[s.key] = unfetched();
  return { taxYear: 2026, files };
}

describe('key list', () => {
  it('has no duplicate keys', () => {
    expect(new Set(ALL_KEYS).size).toBe(ALL_KEYS.length);
  });

  it('matches config/SOURCES.md exactly', () => {
    expect([...sourcesKeys()].sort()).toEqual([...ALL_KEYS].sort());
  });
});

describe('checkEntry', () => {
  const spec = (key: string) => SPEC_BY_KEY.get(key)!;

  it('accepts an unfetched entry with null value', () => {
    expect(checkEntry(spec('federal.capital_gains.inclusion_rate'), unfetched())).toEqual([]);
  });

  it('rejects an unfetched entry that has a value', () => {
    const e = { ...unfetched(), value: 0.5 };
    expect(checkEntry(spec('federal.capital_gains.inclusion_rate'), e)).toHaveLength(1);
  });

  it('checks value shape by kind', () => {
    const brackets = spec('federal.tax.brackets');
    expect(checkEntry(brackets, validated([{ from: 0, rate: 0.1 }], 'none'))).toEqual([]);
    expect(checkEntry(brackets, validated(0.1, 'none')).length).toBeGreaterThan(0);
    const table = spec('federal.rrif.min_factor');
    expect(checkEntry(table, validated({ '71': 0.05 }))).toEqual([]);
    expect(checkEntry(table, validated({ seventy: 0.05 })).length).toBeGreaterThan(0);
  });

  it('rejects an unknown unit and extra fields', () => {
    const key = spec('federal.capital_gains.inclusion_rate');
    expect(checkEntry(key, validated(0.5, 'percent')).length).toBeGreaterThan(0);
    expect(checkEntry(key, { ...validated(0.5), extra: 1 }).length).toBeGreaterThan(0);
  });

  it('requires who and when for a validated entry', () => {
    const e = { ...validated(0.5), validation: { status: 'validated' } };
    expect(checkEntry(spec('federal.capital_gains.inclusion_rate'), e).length).toBeGreaterThan(0);
  });

  it('validates structured planning values', () => {
    const shapes = spec('planning.shapes');
    const good = { steady: { points: [{ yearsFromRetirement: 0, stockShare: 0.6 }] } };
    expect(checkEntry(shapes, validated(good, 'none'))).toEqual([]);
    const bad = { steady: { points: [{ yearsFromRetirement: 0, stockShare: 1.6 }] } };
    expect(checkEntry(shapes, validated(bad, 'none')).length).toBeGreaterThan(0);
  });
});

describe('checkBundle and configStatus', () => {
  it('accepts a complete skeleton', () => {
    expect(checkBundle(skeleton())).toEqual([]);
  });

  it('reports a missing key and an unknown key', () => {
    const b = skeleton();
    delete b.files.federal!['federal.tax.brackets'];
    b.files.federal!['federal.made_up'] = unfetched();
    const problems = checkBundle(b);
    expect(problems.some((p) => p.startsWith('federal.tax.brackets: missing'))).toBe(true);
    expect(problems.some((p) => p.startsWith('federal.made_up: unknown'))).toBe(true);
  });

  it('reports a tax-year mismatch', () => {
    const b = skeleton();
    b.files.federal!['federal.tax.brackets'] = { ...unfetched(), taxYear: 2025 };
    expect(checkBundle(b).some((p) => p.includes('taxYear 2025'))).toBe(true);
  });

  it('flags unfetched keys and an out-of-date year', () => {
    const status = configStatus(buildConfig(skeleton()), new Date('2027-02-01'));
    expect(status.unfetchedKeys).toHaveLength(ALL_KEYS.length);
    expect(status.outOfDate).toBe(true);
    expect(configStatus(buildConfig(skeleton()), new Date('2026-06-01')).outOfDate).toBe(false);
  });

  it('accepts the committed config', () => {
    expect(checkBundle(readBundle(currentYear()))).toEqual([]);
  });
});

describe('compareFiles', () => {
  it('reports no differences for identical files', () => {
    const a = { k: validated(0.5) };
    expect(compareFiles(a, structuredClone(a))).toEqual([]);
  });

  it('detects value, unit, year and indexed differences, and one-sided keys', () => {
    const a = { k: validated(0.5), only_a: validated(1) };
    const b = {
      k: { ...validated(0.6, 'none'), taxYear: 2025, indexed: true },
      only_b: validated(1),
    };
    const diffs = compareFiles(a, b);
    expect(diffs).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^k\.value/),
        expect.stringMatching(/^k\.unit/),
        expect.stringMatching(/^k\.taxYear/),
        expect.stringMatching(/^k\.indexed/),
        'only_a: only in first file',
        'only_b: only in second file',
      ]),
    );
  });
});
