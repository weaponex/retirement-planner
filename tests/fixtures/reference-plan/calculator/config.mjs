// Loads config/<CURRENT_YEAR>/*.json, converts monthly amounts to yearly, rebases indexed
// values to the plan start (rebaseConfig) and reads values for a given year index.
// Written from the design only (docs/designs/retirement-planner.md, Config contract and
// Units and conventions); no engine code was consulted.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MONTHS_PER_YEAR = 12;
const FILES = ['federal', 'ontario', 'market', 'planning', 'warnings'];

export function loadConfig(repoRoot) {
  const year = readFileSync(join(repoRoot, 'config', 'CURRENT_YEAR'), 'utf8').trim();
  const entries = {};
  for (const f of FILES) {
    const json = JSON.parse(readFileSync(join(repoRoot, 'config', year, `${f}.json`), 'utf8'));
    for (const [key, entry] of Object.entries(json)) {
      const e = structuredClone(entry);
      e.publishedUnit = e.unit;
      if (e.unit === 'CAD_per_month' && typeof e.value === 'number') {
        e.value = e.value * MONTHS_PER_YEAR;
        e.unit = 'CAD_per_year';
      }
      entries[key] = e;
    }
  }
  return entries;
}

function kindOf(value) {
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'number') return 'list';
    if (value.length > 0 && typeof value[0] === 'object' && 'cap' in value[0]) return 'phaseIn';
    if (value.length > 0 && typeof value[0] === 'object' && 'from' in value[0]) return 'brackets';
    return 'list';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) return 'ageTable';
    return 'object';
  }
  return 'none';
}

// rebaseConfig(cfg, planStartYear): indexed values are multiplied by
// (1 + inflation)^(planStartYear - taxYear); taxYear becomes planStartYear.
export function rebaseConfig(entries, planStartYear) {
  const inflation = entries['market.inflation'].value;
  const out = {};
  for (const [key, e0] of Object.entries(entries)) {
    const e = structuredClone(e0);
    const f = Math.pow(1 + inflation, planStartYear - e.taxYear);
    const kind = kindOf(e.value);
    if (kind === 'number' && e.indexed) e.value = e.value * f;
    if (kind === 'brackets')
      e.value = e.value.map((r) => ((r.indexed ?? e.indexed) ? { ...r, from: r.from * f } : r));
    if (kind === 'list' && e.indexed) e.value = e.value.map((n) => n * f);
    if (kind === 'phaseIn' && e.indexed)
      e.value = e.value.map((r) => ({ ...r, from: r.from * f, cap: r.cap * f }));
    e.taxYear = planStartYear;
    out[key] = e;
  }
  return out;
}

// A year context: every indexed read grows with the deflator counted from the plan start.
export function makeCtx(entries, yearIndex) {
  const inflation = entries['market.inflation'].value;
  const d = Math.pow(1 + inflation, yearIndex);
  const get = (key) => {
    const e = entries[key];
    if (!e) throw new Error(`missing config key ${key}`);
    if (e.value === null || e.value === undefined)
      throw new Error(`config key ${key} has no value`);
    return e;
  };
  return {
    yearIndex,
    deflator: d,
    num(key) {
      const e = get(key);
      return e.indexed ? e.value * d : e.value;
    },
    plain(key) {
      return get(key).value;
    },
    brackets(key) {
      // Author's decision (2026-11-24): after indexing, a row's threshold is never below the
      // previous row's, so a band whose unindexed upper threshold is overtaken shrinks to 0.
      const e = get(key);
      let prev = -Infinity;
      return e.value.map((r) => {
        const from = Math.max(prev, (r.indexed ?? e.indexed) ? r.from * d : r.from);
        prev = from;
        return { from, rate: r.rate };
      });
    },
    list(key) {
      const e = get(key);
      return e.value.map((n) => (e.indexed ? n * d : n));
    },
    phaseIn(key) {
      const e = get(key);
      return e.value.map((r) => ({
        from: e.indexed ? r.from * d : r.from,
        rate: r.rate,
        cap: e.indexed ? r.cap * d : r.cap,
      }));
    },
    // ageTable: an age between rows uses the row at or below it; above the last row the
    // last row; below the first row undefined (the caller applies its own rule).
    ageTable(key, age) {
      const t = get(key).value;
      const ages = Object.keys(t)
        .map(Number)
        .sort((a, b) => a - b);
      if (age < ages[0]) return undefined;
      let pick = ages[0];
      for (const a of ages) if (a <= age) pick = a;
      return t[String(pick)];
    },
  };
}
