# Engine

## Overview

The calculation engine: pure TypeScript with no screen or store code. This folder holds the
engine-wide settings (`constants.ts`), the data contracts (`types.ts`) from the design's
[Data contracts](../../docs/designs/retirement-planner.md#data-contracts), the dollar conversions
(`units.ts`) and the runtime invariants (`invariants.ts`). The subfolders load the rule values,
compute tax, model accounts, benefits and investments, choose withdrawals, solve each year and run
a whole plan. Stage 4 adds the variants, the comparisons and the `index.ts` entry point.

## Interface

- `constants.ts`: engine settings, not rule values:
  - `MONTHS_PER_YEAR`, `SOLVER_PRECISION`, `SOLVER_MAX_STEPS` (40: enough to narrow $10 billion
    to $0.01);
  - `SPLIT_STEP`, `MAX_SPLIT_PASSES`;
  - `INVARIANT_TOLERANCE`, `WEIGHT_SUM_TOLERANCE`;
  - `CONFIG_YEAR_MIN`, `CONFIG_YEAR_MAX`, `MAX_FEE` (fee-level schema bound), `OVERRIDE_RANGES`
    (rule-override ranges by unit);
  - `BENEFIT_REFERENCE_AGE` (65: the age the CPP estimate and OAS base refer to).
- `types.ts`:
  - `YearContext { yearIndex, deflator, cfg, jurisdiction }`, passed to every function that reads
    or indexes rule values;
  - `TaxableIncome`; the plan contracts (`PlanInputs` and its parts, `RuleOverrides`);
    `NormalizedInputs` (every `…Today` field as `…Nom`);
  - the engine state: `PlanState`, `AccountState`, `PositionState`, `SpouseYearState`,
    `SplitChoice`, `Draw`, `Variant`, `Death`, `YearInProgress`, `IntegrityFailure`;
  - the results: `YearRow` (with `AccountYear` and `SpouseYear`), `PlanSummary`,
    `StrategyResult`;
  - the id unions, including `EngineAccountType` (adds `rrif` and `lif`).
- `units.ts`: `TodayDollars` and `FutureDollars` (branded), `makeDeflator(cfg)`,
  `normalizeInputs(inputs, cfg)`, `toDisplay(rows, deflator)`.
- `invariants.ts`: `EngineIntegrityError`, `failedChecks(next, row, checks)`,
  `checkYear(prev, next, row, ctx, checks)`.
- Subfolders:
  - [config](./config/README.md): the key list, schema, loading, rebasing, rule overrides and
    typed reads of rule values.
  - [jurisdiction](./jurisdiction/README.md): federal tax and the `Jurisdiction` interface
    (Ontario tax and LIF values).
  - [tax](./tax/README.md): `personalTax`, table arithmetic and pension splitting.
  - [benefits](./benefits/README.md): CPP, OAS, DB and survivor benefits.
  - [accounts](./accounts/README.md): RRSP/RRIF, LIRA/LIF, TFSA and non-registered rules.
  - [invest](./invest/README.md): returns, the growth-to-safety shape, placement and rebalancing.
  - [withdraw](./withdraw/README.md): the withdrawal strategies and the surplus.
  - [solver](./solver/README.md): one retired-household year.
  - [project](./project/README.md): a whole plan (`runPath`).

## Invariants

- `[constants.ts header]` This is the only engine file exempt from the no-magic-numbers lint
  rule. Rule values never appear here; they come from `config/`.
- `[types.ts header]` Money fields ending in `Today` are in today's dollars; fields ending in
  `Nom` are in future dollars.
- `[types.ts:YearContext]` `yearIndex` is 0 in the plan's start year. `deflator(t)` is
  (1 + inflation)^t. `cfg` has rule overrides applied and is rebased to the plan start.
- `[units.ts]` Today's dollars are valued at January 1 of the plan's start year, so
  `normalizeInputs` changes names, not amounts; indexing happens later through the deflator. DB
  amounts with `fixed` or `none` indexing are nominal already.
- `[units.ts:toDisplay]` Row *i* is year index *i*; every `…Nom` field (and the per-account
  `withdrawals`) is divided by `deflator(i)` and renamed `…Today`.
- Run order (design: Config contract): `applyRuleOverrides`, then `rebaseConfig`, then
  `normalizeInputs`.
- `[invariants.ts]` Every year of every run is checked within `INVARIANT_TOLERANCE`: spending met
  or a shortfall recorded (retired years), each account's identity, the household identity
  (retired or working), no negative holding, RRIF/LIF limits, and TFSA room.
- `[types.ts:AccountInput.id]` Has the form `<type>-<owner>-<n>`; ids are kept when an RRSP
  converts or an account changes owner.
- `types.ts` declares shapes only. The validation ranges in the design's Data contracts are
  planned for `src/state/persistence/planSchema.ts` (stage 7).
- `[eslint.config.js]` No file under `src/engine` may import from `ui/` or `state/`, and
  `solver/`, `project/` and `simulate/` may not import `TodayDollars`.

## Side Effects

- None. `invariants.ts` throws `EngineIntegrityError` on a failed check; nothing else has effects.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{units,invariants}.test.ts`; the property tests in `tests/property/`.
