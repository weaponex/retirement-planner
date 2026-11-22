// Validates the config for config/CURRENT_YEAR and checks that config/SOURCES.md
// lists exactly the keys in src/engine/config/keys.ts.
//
//   npm run config:check              schema and key-list errors fail
//   npm run config:check -- --strict  also fail on unfetched or unvalidated values
import { buildConfig, checkBundle, configStatus } from '../src/engine/config/load';
import { ALL_KEYS } from '../src/engine/config/keys';
import { currentYear, readBundle, sourcesKeys } from './lib';

const strict = process.argv.includes('--strict');
const year = currentYear();
const problems = checkBundle(readBundle(year));

const listed = new Set(sourcesKeys());
const expected = new Set(ALL_KEYS);
for (const key of expected) if (!listed.has(key)) problems.push(`${key}: missing from SOURCES.md`);
for (const key of listed)
  if (!expected.has(key)) problems.push(`${key}: in SOURCES.md but not a known key`);

if (problems.length > 0) {
  console.error(`config ${year}: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const status = configStatus(buildConfig(readBundle(year)), new Date());
console.log(`config ${year}: ${ALL_KEYS.length} keys, schema OK, SOURCES.md matches.`);
console.log(`  unfetched:   ${status.unfetchedKeys.length}`);
console.log(`  unvalidated: ${status.unvalidatedKeys.length}`);
if (status.outOfDate) console.log(`  out of date: the current year is later than ${year}`);

if (strict && (status.unfetchedKeys.length > 0 || status.unvalidatedKeys.length > 0)) {
  console.error('strict: every value must be fetched and validated.');
  for (const k of [...status.unfetchedKeys, ...status.unvalidatedKeys]) console.error(`  ${k}`);
  process.exit(1);
}
