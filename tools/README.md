# tools

## Overview

Command-line scripts for the yearly rule config under `config/`. They run with `tsx` through
the `config:*` npm scripts. `lib.ts` holds the shared file readers. The other three files are
entry points: one generates the engine's static config bundle, one validates the current
year's config, and one compares two candidate config files from separate fetch sessions.

## Interface

- `lib.ts`
  - `ROOT`: the repository root (the parent of `tools/`).
  - `CONFIG_DIR`: `ROOT/config`.
  - `currentYear(): number`: reads `config/CURRENT_YEAR`. Throws if the trimmed text is not an
    integer.
  - `configFiles(year): string[]`: the sorted `*.json` file names in `config/<year>/`. Throws if
    the directory does not exist.
  - `readBundle(year): RawBundle`: parses every config file for `year` into
    `{ taxYear, files }`, keyed by file name without `.json`. `RawBundle` comes from
    `src/engine/config/load.ts`.
  - `sourcesKeys(): string[]`: the backticked keys in the first column of the tables in
    `config/SOURCES.md` (pattern `` ^\|\s*`([a-z0-9_.]+)`\s*\| ``).
  - `yieldWarnings(bundle): string[]`: one warning per asset class whose
    `market.<class>.yield` is above its `market.<class>.geometric_return`, because its price
    would then fall every year (FR-M5). The 2026 bond values trigger it.
- `configBundle.ts` (`npm run config:bundle`): writes `src/engine/config/bundle.ts`, which
  statically imports every `config/<CURRENT_YEAR>/*.json` file and exports
  `BUNDLE: RawBundle`. Run it after changing `config/CURRENT_YEAR` or adding a config file.
- `configCheck.ts` (`npm run config:check [-- --strict]`): runs `checkBundle` from
  `src/engine/config/load.ts` on the current year's bundle. It also checks that
  `config/SOURCES.md` lists exactly the keys in `ALL_KEYS` (`src/engine/config/keys.ts`).
  Then it prints the unfetched and unvalidated key counts from `configStatus`.
- `configCompare.ts` (`npm run config:compare -- <a.json> <b.json>`)
  - `compareFiles(a, b): string[]`: exported (used by `tests/unit/config.test.ts`). Lists
    every key, in sorted order, whose `value`, `unit`, `taxYear` or `indexed` differs
    (compared by `JSON.stringify`), and every key present in only one file.
  - The CLI body runs only when `process.argv[1]` ends with `configCompare.ts`, so importing
    the module has no side effects.

## Invariants

- `src/engine/config/bundle.ts` is generated. Do not edit it by hand. Regenerate it with
  `npm run config:bundle`, which also writes the file's "Do not edit" header.
- The config key list in `config/SOURCES.md` must match `ALL_KEYS` in
  `src/engine/config/keys.ts`. `config:check` fails on a key missing from either one.
- The bundle file order and the `configCompare` output order are sorted, so the output is
  deterministic.
- In `configBundle.ts`, each config file's base name becomes a TypeScript identifier and
  object key, so config file names must be valid identifiers (for example `federal.json`).
- `configCheck --strict` fails unless every key is both fetched and validated.

## Side Effects

- `configBundle.ts` reads `config/CURRENT_YEAR` and lists `config/<year>/` (through
  `currentYear` and `configFiles`), then overwrites `src/engine/config/bundle.ts`
  (`writeFileSync`) and logs the year and file count.
- `lib.ts`, `configCheck.ts` and `configCompare.ts` only read files: `config/CURRENT_YEAR`,
  `config/<year>/*.json`, `config/SOURCES.md`, and the two compared paths.
- Exit codes: `configCheck` exits 1 on schema or key-list problems, and in `--strict` mode on
  unfetched or unvalidated keys. `configCompare` exits 1 if anything differs and 2 on missing
  arguments.
- `configCheck` passes `{}` (no rule overrides) and `new Date()` to `configStatus`. When the
  current year is later than the config year, it prints an extra line, "out of date: the
  current year is later than <year>" (it does not fail). It then prints each `yieldWarnings`
  line as a warning, without failing.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`. `tests/unit/config.test.ts` covers
  `compareFiles`, `readBundle`, `currentYear` and `sourcesKeys`; `tests/unit/configCheck.test.ts`
  covers `yieldWarnings`.
- Run the tools: `npm run config:check`, `npm run config:bundle` (then review the
  `src/engine/config/bundle.ts` diff), and `npm run config:compare -- <a.json> <b.json>`.
