// Checks tax.mjs against tests/fixtures/tax-cases.json (each figure within $1).
// Run: node tests/fixtures/reference-plan/calculator/check-tax.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, rebaseConfig, makeCtx } from './config.mjs';
import { personalTax } from './tax.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const cfg = loadConfig(root);
const year = Number(readFileSync(join(root, 'config', 'CURRENT_YEAR'), 'utf8').trim());
const ctx = makeCtx(rebaseConfig(cfg, year), 0);
const cases = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'tax-cases.json'), 'utf8'));

let failed = 0;
for (const c of cases) {
  const r = personalTax(c.income, c.age, ctx);
  const diffs = [
    ['federalTax', r.federal, c.federalTax],
    ['ontarioTax', r.provincial, c.ontarioTax],
    ['clawback', r.clawback, c.clawback],
  ];
  const bad = diffs.filter(([, got, want]) => Math.abs(got - want) > 1);
  if (bad.length) failed++;
  const cells = diffs.map(([n, got, want]) => `${n} ${got.toFixed(2)} (want ${want})`).join(', ');
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${c.id}: ${cells}`);
}
console.log(`${cases.length - failed}/${cases.length} cases within $1`);
process.exit(failed ? 1 : 0);
