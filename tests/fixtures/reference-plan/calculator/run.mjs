// Entry point: reads ../inputs.json and config/<CURRENT_YEAR>/*.json, runs the independent
// calculator and writes ../expected-rows.csv (design: Data contracts, "Reference file (M1)").
// Run from anywhere: node tests/fixtures/reference-plan/calculator/run.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, rebaseConfig } from './config.mjs';
import { runPlan } from './plan.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, '..');
const root = join(here, '..', '..', '..', '..');

const inputs = JSON.parse(readFileSync(join(fixtureDir, 'inputs.json'), 'utf8'));
if (inputs.ruleOverrides && Object.keys(inputs.ruleOverrides).length > 0)
  throw new Error('this calculator does not apply rule overrides');
const cfg = rebaseConfig(loadConfig(root), inputs.planStartYear);
const rows = runPlan(inputs, cfg);

const SPOUSE_FIELDS = ['age', 'alive', 'cppNom', 'oasNom', 'dbNom', 'payNom'];
const SPOUSE_FIELDS_AFTER = [
  'forcedDrawsNom',
  'realizedGainsNom',
  'taxableIncomeNom',
  'taxNom',
  'clawbackNom',
  'splitShare',
];
const ACCOUNT_FIELDS = [
  'startNom',
  'contributionsNom',
  'depositsNom',
  'reinvestedYieldNom',
  'withholdingNom',
  'priceReturnNom',
  'drawsNom',
  'endNom',
];
const ESTATE_FIELDS = [
  'deemedRegisteredNom',
  'deemedGainsNom',
  'finalReturnTaxNom',
  'homeNom',
  'probateNom',
  'afterTaxLegacyNom',
];

const ids = [...new Set(rows.flatMap((r) => Object.keys(r.accounts)))].sort();

const header = ['year'];
for (const s of [0, 1]) {
  for (const f of SPOUSE_FIELDS) header.push(`spouse.${s}.${f}`);
  for (const id of ids) header.push(`spouse.${s}.withdrawals.${id}`);
  for (const f of SPOUSE_FIELDS_AFTER) header.push(`spouse.${s}.${f}`);
}
for (const id of ids) for (const f of ACCOUNT_FIELDS) header.push(`accounts.${id}.${f}`);
for (const id of ids) header.push(`balancesEndNom.${id}`);
header.push('cashYieldNom', 'spendNeedNom', 'afterTaxCashNom', 'surplusNom', 'shortfallNom');
for (const f of ESTATE_FIELDS) header.push(`estate.${f}`);

// Numbers: plain decimals with 2 places (no thousands separators); -0.00 is written 0.00.
const num = (x) => {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`bad number ${x}`);
  const s = x.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
};
const cell = (x) => (typeof x === 'boolean' ? String(x) : num(x ?? 0));

const lines = [header.join(',')];
for (const r of rows) {
  const out = [cell(r.year)];
  for (const s of [0, 1]) {
    const sp = r.spouse[s];
    for (const f of SPOUSE_FIELDS) out.push(cell(sp[f]));
    for (const id of ids) out.push(cell(sp.withdrawals[id] ?? 0));
    for (const f of SPOUSE_FIELDS_AFTER) out.push(cell(sp[f]));
  }
  for (const id of ids) for (const f of ACCOUNT_FIELDS) out.push(cell(r.accounts[id]?.[f] ?? 0));
  for (const id of ids) out.push(cell(r.balancesEndNom[id] ?? 0));
  for (const f of ['cashYieldNom', 'spendNeedNom', 'afterTaxCashNom', 'surplusNom', 'shortfallNom'])
    out.push(cell(r[f]));
  for (const f of ESTATE_FIELDS) out.push(cell(r.estate[f]));
  lines.push(out.join(','));
}
writeFileSync(join(fixtureDir, 'expected-rows.csv'), lines.join('\n') + '\n');

if (process.argv.includes('--summary')) {
  for (const r of rows) {
    const s = r.spouse;
    const tot = Object.values(r.balancesEndNom).reduce((a, b) => a + b, 0);
    console.log(
      r.year,
      s
        .map(
          (x) =>
            `${x.alive ? 'A' : '-'}${x.age} tax ${x.taxNom.toFixed(0)} split ${x.splitShare.toFixed(2)}`,
        )
        .join(' | '),
      `need ${r.spendNeedNom.toFixed(0)} cash ${r.afterTaxCashNom.toFixed(0)} sur ${r.surplusNom.toFixed(0)} short ${r.shortfallNom.toFixed(0)} total ${tot.toFixed(0)}`,
      JSON.stringify(r._types),
    );
  }
  console.log(rows[rows.length - 1].estate);
}
console.log(`wrote ${rows.length} rows, ${header.length} columns`);
