import { BUNDLE } from './bundle';
import { KEY_SPECS } from './keys';
import { checkEntry, type ConfigEntry } from './schema';

export interface RawBundle {
  taxYear: number;
  files: Record<string, Record<string, unknown>>;
}

export interface Config {
  taxYear: number;
  entries: ReadonlyMap<string, ConfigEntry>;
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
      if (!seen.has(key) && !KEY_SPECS.some((s) => s.key === key)) {
        problems.push(`${key}: unknown key in ${fileName}.json`);
      }
    }
  }
  return problems;
}

export function buildConfig(bundle: RawBundle): Config {
  const problems = checkBundle(bundle);
  if (problems.length > 0) throw new ConfigError(problems);
  const entries = new Map<string, ConfigEntry>();
  for (const spec of KEY_SPECS) {
    entries.set(spec.key, bundle.files[spec.file]![spec.key] as ConfigEntry);
  }
  return { taxYear: bundle.taxYear, entries };
}

/** Validates the bundled config for the current tax year. */
export function loadConfig(): Config {
  return buildConfig(BUNDLE);
}

export interface ConfigStatus {
  taxYear: number;
  unfetchedKeys: string[];
  unvalidatedKeys: string[];
  outOfDate: boolean;
}

export function configStatus(config: Config, today: Date): ConfigStatus {
  const unfetchedKeys: string[] = [];
  const unvalidatedKeys: string[] = [];
  for (const [key, entry] of config.entries) {
    if (entry.validation.status === 'unfetched') unfetchedKeys.push(key);
    else if (entry.validation.status === 'unvalidated') unvalidatedKeys.push(key);
  }
  return {
    taxYear: config.taxYear,
    unfetchedKeys,
    unvalidatedKeys,
    outOfDate: today.getFullYear() > config.taxYear,
  };
}
