// Compares two candidate config files produced by independent fetch sessions.
//   npm run config:compare -- <a.json> <b.json>
// Lists every key whose value, unit, tax year or indexed flag differs, and keys
// present in only one file. Exits 1 if anything differs.
import { readFileSync } from 'node:fs';

type Entry = { value?: unknown; unit?: unknown; taxYear?: unknown; indexed?: unknown };

export function compareFiles(a: Record<string, Entry>, b: Record<string, Entry>): string[] {
  const out: string[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of [...keys].sort()) {
    const x = a[key];
    const y = b[key];
    if (!x) {
      out.push(`${key}: only in second file`);
      continue;
    }
    if (!y) {
      out.push(`${key}: only in first file`);
      continue;
    }
    for (const field of ['value', 'unit', 'taxYear', 'indexed'] as const) {
      const vx = JSON.stringify(x[field]);
      const vy = JSON.stringify(y[field]);
      if (vx !== vy) out.push(`${key}.${field}: ${vx} vs ${vy}`);
    }
  }
  return out;
}

const isMain = process.argv[1]?.endsWith('configCompare.ts');
if (isMain) {
  const [pathA, pathB] = process.argv.slice(2);
  if (!pathA || !pathB) {
    console.error('usage: npm run config:compare -- <a.json> <b.json>');
    process.exit(2);
  }
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as Record<string, Entry>;
  const diffs = compareFiles(read(pathA), read(pathB));
  if (diffs.length === 0) {
    console.log('No differences.');
  } else {
    console.log(`${diffs.length} difference(s):`);
    for (const d of diffs) console.log(`  ${d}`);
    process.exit(1);
  }
}
