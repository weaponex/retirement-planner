// User changes to rule values from Settings (design: Config contract, User
// changes to rule values; SR1-M9). An override is entered in the key's
// published unit and in its default's tax-year dollars.
import { MONTHS_PER_YEAR, OVERRIDE_RANGES } from '../constants';
import type { RuleOverrides } from '../types';
import type { KeySpec } from './keys';
import type { Config, LoadedEntry } from './load';
import { SPEC_BY_KEY, checkValue } from './schema';

/** Keys whose rows must cover every age from the first to the last. */
const GAP_FREE_TABLES = new Set(['federal.rrif.min_factor', 'ontario.lif.max_factor']);
const LIFE_EXPECTANCY_PREFIX = 'planning.life_expectancy.';

/** Every key in the key tree, except `warnings.*` and the per-class returns (changed on the Savings tab). */
export function isOverridable(key: string): boolean {
  return SPEC_BY_KEY.has(key) && !key.startsWith('warnings.') && !key.endsWith('.geometric_return');
}

interface Range {
  min: number;
  max: number;
}

/** The allowed range of the numbers in a value, by the key's published unit. */
function rangeFor(key: string, entry: LoadedEntry): Range | undefined {
  if (key.startsWith(LIFE_EXPECTANCY_PREFIX)) return OVERRIDE_RANGES.lifeExpectancy;
  switch (entry.publishedUnit) {
    case 'rate':
      return OVERRIDE_RANGES.rate;
    case 'age':
      return OVERRIDE_RANGES.age;
    case 'years':
      return OVERRIDE_RANGES.years;
    case 'count':
      return OVERRIDE_RANGES.count;
    case 'CAD_per_year':
    case 'CAD_per_month':
      return { min: 0, max: Infinity };
    default:
      return undefined;
  }
}

function outside(n: number, r: Range): boolean {
  return n < r.min || n > r.max;
}

function rangeProblems(spec: KeySpec, value: unknown, entry: LoadedEntry): string[] {
  const range = rangeFor(spec.key, entry);
  const problems: string[] = [];
  const say = (what: string, r: Range) =>
    problems.push(`${spec.key}: ${what} must be between ${r.min} and ${r.max}`);
  switch (spec.kind) {
    case 'number':
      if (range && outside(value as number, range)) say('the value', range);
      break;
    case 'list':
      if (range && (value as number[]).some((n) => outside(n, range))) say('every number', range);
      break;
    case 'ageTable':
      if (range && Object.values(value as Record<string, number>).some((n) => outside(n, range)))
        say('every value', range);
      break;
    case 'brackets':
      if ((value as { rate: number }[]).some((r) => outside(r.rate, OVERRIDE_RANGES.rate)))
        say('every rate', OVERRIDE_RANGES.rate);
      break;
    case 'phaseIn':
      if ((value as { rate: number }[]).some((r) => outside(r.rate, OVERRIDE_RANGES.rate)))
        say('every rate', OVERRIDE_RANGES.rate);
      if ((value as { cap: number }[]).some((r) => r.cap < 0))
        problems.push(`${spec.key}: every cap must be 0 or more`);
      break;
    default:
      break;
  }
  return problems;
}

function rising(numbers: number[]): boolean {
  return numbers.every((n, i) => i === 0 || n > numbers[i - 1]!);
}

function structureProblems(spec: KeySpec, value: unknown): string[] {
  const problems: string[] = [];
  if (spec.kind === 'brackets') {
    const rows = value as { from: number }[];
    if (rows[0]?.from !== 0) problems.push(`${spec.key}: the first bracket must start at 0`);
    if (!rising(rows.map((r) => r.from)))
      problems.push(`${spec.key}: bracket starts must rise from row to row`);
  }
  if (spec.kind === 'phaseIn') {
    const rows = value as { from: number; cap: number }[];
    if (!rising(rows.map((r) => r.from)))
      problems.push(`${spec.key}: band starts must rise from row to row`);
    if (rows.some((r, i) => i > 0 && r.cap < rows[i - 1]!.cap))
      problems.push(`${spec.key}: caps must never fall`);
  }
  if (GAP_FREE_TABLES.has(spec.key)) {
    const ages = Object.keys(value as Record<string, number>)
      .map(Number)
      .sort((a, b) => a - b);
    if (ages.some((age, i) => i > 0 && age !== ages[i - 1]! + 1))
      problems.push(`${spec.key}: every age from the first row to the last needs a row`);
  }
  return problems;
}

/** A key's value in its published unit: the override if set, else the default. */
function publishedValue(key: string, overrides: RuleOverrides, cfg: Config): unknown {
  if (key in overrides) return overrides[key]!.value;
  const entry = cfg.entries.get(key);
  if (!entry) return undefined;
  return entry.publishedUnit === 'CAD_per_month' && typeof entry.value === 'number'
    ? entry.value / MONTHS_PER_YEAR
    : entry.value;
}

/** Rules between keys, checked on the override set as a whole. */
function crossKeyProblems(overrides: RuleOverrides, cfg: Config): string[] {
  const v = (key: string) => publishedValue(key, overrides, cfg);
  const problems: string[] = [];
  const pair = (lowKey: string, highKey: string, strict: boolean, rule: string) => {
    const low = v(lowKey);
    const high = v(highKey);
    if (typeof low !== 'number' || typeof high !== 'number') return;
    if (strict ? low >= high : low > high) problems.push(rule);
  };
  pair(
    'federal.cpp.start.earliest',
    'federal.cpp.start.latest',
    true,
    'federal.cpp.start.earliest must be below federal.cpp.start.latest',
  );
  pair(
    'federal.oas.residence.min_years',
    'federal.oas.residence.full_years',
    false,
    'federal.oas.residence.min_years must not be above federal.oas.residence.full_years',
  );
  pair(
    'federal.credits.basic_min',
    'federal.credits.basic',
    false,
    'federal.credits.basic_min must not be above federal.credits.basic',
  );
  const thresholds = v('ontario.surtax.thresholds');
  const rates = v('ontario.surtax.rates');
  if (Array.isArray(thresholds) && Array.isArray(rates) && thresholds.length !== rates.length) {
    problems.push('ontario.surtax.thresholds and ontario.surtax.rates must have the same length');
  }
  return problems;
}

/**
 * Checks one override, in order: the value kind's schema, the range for the
 * key's unit, the table structure, then the rules between keys with this
 * override added to the others. Returns the rules it breaks (empty if valid).
 */
export function validateOverride(
  key: string,
  value: unknown,
  overrides: RuleOverrides,
  cfg: Config,
): string[] {
  const spec = SPEC_BY_KEY.get(key);
  const entry = cfg.entries.get(key);
  if (!spec || !entry) return [`${key}: not a known rule value`];
  if (!isOverridable(key)) return [`${key}: cannot be changed in Settings`];
  const kind = checkValue(spec, value);
  if (kind.length > 0) return kind;
  const shape = [...rangeProblems(spec, value, entry), ...structureProblems(spec, value)];
  if (shape.length > 0) return shape;
  const defaultTaxYear = overrides[key]?.defaultTaxYear ?? cfg.taxYear;
  return crossKeyProblems({ ...overrides, [key]: { value, defaultTaxYear } }, cfg);
}

/**
 * A new `Config` with each valid override applied. An override of a monthly
 * key is multiplied by `MONTHS_PER_YEAR`, like its default; the entry takes the
 * override's `defaultTaxYear`, so `rebaseConfig` indexes it from there.
 */
export function applyRuleOverrides(cfg: Config, overrides: RuleOverrides): Config {
  const { kept } = dropInvalidOverrides(overrides, cfg);
  const entries = new Map(cfg.entries);
  for (const [key, { value, defaultTaxYear }] of Object.entries(kept)) {
    const entry = cfg.entries.get(key)!;
    const yearly =
      entry.publishedUnit === 'CAD_per_month' && typeof value === 'number'
        ? value * MONTHS_PER_YEAR
        : value;
    entries.set(key, { ...entry, value: yearly, taxYear: defaultTaxYear });
  }
  return { taxYear: cfg.taxYear, entries };
}

export interface DroppedOverride {
  key: string;
  value: unknown;
  reasons: string[];
}

/** Splits overrides into the valid ones and the ones to drop (unknown key or failing validation), for import. */
export function dropInvalidOverrides(
  overrides: RuleOverrides,
  cfg: Config,
): { kept: RuleOverrides; dropped: DroppedOverride[] } {
  const kept: RuleOverrides = {};
  const dropped: DroppedOverride[] = [];
  for (const [key, override] of Object.entries(overrides)) {
    const reasons = validateOverride(key, override.value, overrides, cfg);
    if (reasons.length === 0) kept[key] = override;
    else dropped.push({ key, value: override.value, reasons });
  }
  return { kept, dropped };
}
