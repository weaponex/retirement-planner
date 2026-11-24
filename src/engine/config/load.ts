import { MONTHS_PER_YEAR } from '../constants';
import type { RuleOverrides } from '../types';
import { BUNDLE } from './bundle';
import { KEY_SPECS } from './keys';
import { SPEC_BY_KEY, checkEntry, type ConfigEntry, type Unit } from './schema';

export interface RawBundle {
  taxYear: number;
  files: Record<string, Record<string, unknown>>;
}

/** A loaded entry: yearly amounts, plus the unit the source published it in. */
export type LoadedEntry = ConfigEntry & { publishedUnit: Unit };

export interface Config {
  /** The defaults' tax year (the bundle's year). */
  taxYear: number;
  entries: ReadonlyMap<string, LoadedEntry>;
}

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Config is invalid:\n${problems.join('\n')}`);
    this.name = 'ConfigError';
  }
}

/** Lists every problem in a bundle: missing, unknown or malformed keys. */
export function checkBundle(bundle: RawBundle): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const spec of KEY_SPECS) {
    const file = bundle.files[spec.file];
    if (!file) {
      problems.push(`${spec.key}: file ${spec.file}.json is missing`);
      continue;
    }
    if (!(spec.key in file)) {
      problems.push(`${spec.key}: missing from ${spec.file}.json`);
      continue;
    }
    seen.add(spec.key);
    problems.push(...checkEntry(spec, file[spec.key]));
    const entry = file[spec.key] as { taxYear?: unknown };
    if (entry && entry.taxYear !== bundle.taxYear) {
      problems.push(`${spec.key}: taxYear ${String(entry.taxYear)} != bundle ${bundle.taxYear}`);
    }
  }
  for (const [fileName, file] of Object.entries(bundle.files)) {
    for (const key of Object.keys(file)) {
      if (!seen.has(key) && !SPEC_BY_KEY.has(key)) {
        problems.push(`${key}: unknown key in ${fileName}.json`);
      }
    }
  }
  return problems;
}

/**
 * Amounts published monthly are stored as `CAD_per_month` exactly as published.
 * The engine sees them only as `CAD_per_year`: value x 12. Unfetched entries
 * keep `value: null` but still take the yearly unit. Every loaded entry
 * records `publishedUnit`, so an override of a monthly key can be converted
 * the same way.
 */
export function toAnnual(entry: ConfigEntry): LoadedEntry {
  if (entry.unit !== 'CAD_per_month') return { ...entry, publishedUnit: entry.unit };
  const value = typeof entry.value === 'number' ? entry.value * MONTHS_PER_YEAR : entry.value;
  return { ...entry, value, unit: 'CAD_per_year', publishedUnit: 'CAD_per_month' };
}

export function buildConfig(bundle: RawBundle): Config {
  const problems = checkBundle(bundle);
  if (problems.length > 0) throw new ConfigError(problems);
  const entries = new Map<string, LoadedEntry>();
  for (const spec of KEY_SPECS) {
    entries.set(spec.key, toAnnual(bundle.files[spec.file]![spec.key] as ConfigEntry));
  }
  return { taxYear: bundle.taxYear, entries };
}

/** Validates the bundled config for the current tax year. */
export function loadConfig(): Config {
  return buildConfig(BUNDLE);
}

type BracketValue = { from: number; rate: number; indexed?: boolean }[];
type PhaseInValue = { from: number; rate: number; cap: number }[];

/** One entry's value moved forward by `factor`, by value kind (design: Units and conventions, Indexing). */
function rebaseValue(key: string, entry: LoadedEntry, factor: number): unknown {
  const kind = SPEC_BY_KEY.get(key)?.kind;
  const value = entry.value;
  if (value === null || value === undefined) return value;
  switch (kind) {
    case 'number':
      return entry.indexed ? (value as number) * factor : value;
    case 'brackets':
      return (value as BracketValue).map((row) =>
        (row.indexed ?? entry.indexed) ? { ...row, from: row.from * factor } : row,
      );
    case 'list':
      return entry.indexed ? (value as number[]).map((n) => n * factor) : value;
    case 'phaseIn':
      return entry.indexed
        ? (value as PhaseInValue).map((row) => ({
            ...row,
            from: row.from * factor,
            cap: row.cap * factor,
          }))
        : value;
    default:
      // Age tables and structured values hold rates and structures: never rebased.
      return value;
  }
}

/**
 * Moves every indexed value from its entry's tax year to the plan start, once
 * per run: value x (1 + inflation)^(planStartYear - taxYear), then sets the
 * entry's `taxYear` to `planStartYear`. Inflation is `market.inflation` in
 * `cfg` (after any override). Indexed reads then count from the plan start.
 */
export function rebaseConfig(cfg: Config, planStartYear: number): Config {
  const inflation = cfg.entries.get('market.inflation')?.value;
  if (typeof inflation !== 'number') throw new ConfigError(['market.inflation has no value']);
  const entries = new Map<string, LoadedEntry>();
  for (const [key, entry] of cfg.entries) {
    const factor = (1 + inflation) ** (planStartYear - entry.taxYear);
    entries.set(key, { ...entry, value: rebaseValue(key, entry, factor), taxYear: planStartYear });
  }
  return { taxYear: cfg.taxYear, entries };
}

export interface ConfigStatus {
  taxYear: number;
  unfetchedKeys: string[];
  unvalidatedKeys: string[];
  overriddenKeys: string[];
  /** Overrides set against an older tax year's defaults. */
  staleOverrideKeys: string[];
  outOfDate: boolean;
}

export function configStatus(config: Config, overrides: RuleOverrides, today: Date): ConfigStatus {
  const unfetchedKeys: string[] = [];
  const unvalidatedKeys: string[] = [];
  for (const [key, entry] of config.entries) {
    if (entry.validation.status === 'unfetched') unfetchedKeys.push(key);
    else if (entry.validation.status === 'unvalidated') unvalidatedKeys.push(key);
  }
  const overriddenKeys = Object.keys(overrides).filter((k) => config.entries.has(k));
  return {
    taxYear: config.taxYear,
    unfetchedKeys,
    unvalidatedKeys,
    overriddenKeys,
    staleOverrideKeys: overriddenKeys.filter(
      (k) => overrides[k]!.defaultTaxYear !== config.taxYear,
    ),
    outOfDate: today.getFullYear() > config.taxYear,
  };
}
