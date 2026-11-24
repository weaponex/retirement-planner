import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ASSET_CLASSES } from '../src/engine/config/keys';
import type { RawBundle } from '../src/engine/config/load';

/**
 * One warning per asset class whose cash yield is above its gross return
 * (FR-M5): its price return would then fall every year. A warning, not an error.
 */
export function yieldWarnings(bundle: RawBundle): string[] {
  const market = bundle.files.market ?? {};
  const valueOf = (key: string) => (market[key] as { value?: unknown } | undefined)?.value;
  const warnings: string[] = [];
  for (const cls of ASSET_CLASSES) {
    const yieldRate = valueOf(`market.${cls}.yield`);
    const gross = valueOf(`market.${cls}.geometric_return`);
    if (typeof yieldRate === 'number' && typeof gross === 'number' && yieldRate > gross) {
      warnings.push(
        `market.${cls}: yield ${yieldRate} is above the return ${gross}, so its price falls every year`,
      );
    }
  }
  return warnings;
}

export const ROOT = resolve(import.meta.dirname, '..');
export const CONFIG_DIR = join(ROOT, 'config');

export function currentYear(): number {
  const text = readFileSync(join(CONFIG_DIR, 'CURRENT_YEAR'), 'utf8').trim();
  const year = Number(text);
  if (!Number.isInteger(year)) throw new Error(`config/CURRENT_YEAR is not a year: "${text}"`);
  return year;
}

export function configFiles(year: number): string[] {
  const dir = join(CONFIG_DIR, String(year));
  if (!existsSync(dir)) throw new Error(`config/${year}/ does not exist`);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

export function readBundle(year: number): RawBundle {
  const files: RawBundle['files'] = {};
  for (const name of configFiles(year)) {
    const path = join(CONFIG_DIR, String(year), name);
    files[name.replace(/\.json$/, '')] = JSON.parse(readFileSync(path, 'utf8')) as Record<
      string,
      unknown
    >;
  }
  return { taxYear: year, files };
}

/** Keys listed in the first column of config/SOURCES.md's tables, in backticks. */
export function sourcesKeys(): string[] {
  const text = readFileSync(join(CONFIG_DIR, 'SOURCES.md'), 'utf8');
  const keys: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^\|\s*`([a-z0-9_.]+)`\s*\|/.exec(line);
    if (match?.[1]) keys.push(match[1]);
  }
  return keys;
}
