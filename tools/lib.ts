import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { RawBundle } from '../src/engine/config/load';

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
