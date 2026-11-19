# Engine

## Overview

The calculation engine: pure TypeScript with no screen or store code. This folder holds the
engine-wide settings (`constants.ts`) and the data contracts (`types.ts`) from the design's
[Data contracts](../../docs/designs/retirement-planner.md#data-contracts). The subfolders
load the rule values and compute tax. Later stages add accounts, benefits, withdrawals, the solver
and the projection (design: Target Files to Create/Modify).

## Interface

- `constants.ts`: engine settings, not rule values:
  - `MONTHS_PER_YEAR`, `SOLVER_PRECISION`, `SOLVER_MAX_STEPS`;
  - `SPLIT_STEP`, `MAX_SPLIT_PASSES`;
  - `INVARIANT_TOLERANCE`, `WEIGHT_SUM_TOLERANCE`;
  - `CONFIG_YEAR_MIN`, `CONFIG_YEAR_MAX`.
- `types.ts`:
  - `YearContext { yearIndex, deflator, cfg }`, passed to every function that reads or indexes
    rule values;
  - `TaxableIncome { pensionEligible, oas, cpp, otherOrdinary, eligibleDividends,
    foreignDividends, capitalGains }`;
  - the plan contracts: `PlanInputs`, `SpouseInput`, `AccountInput`, `PositionInput`,
    `DbPensionInput`, `SpendingCategoryInput`, `SpendingPhase`;
  - the result contracts: `YearRow`, `SpouseYear`, `PlanSummary`, `IncomeBySourceNom`,
    `StrategyResult`;
  - the id unions: `Owner`, `StrategyId`, `BracketLevel`, `PlannerGoal`, `MixId`, `ShapeId`,
    `PresetId`, `FeeLevel`, `AccountType`, and `AssetClass` (re-exported from
    `config/keys.ts`).
- Subfolders:
  - [config](./config/README.md): the key list, the schema, loading, and typed, indexed reads
    of rule values.
  - [jurisdiction](./jurisdiction/README.md): federal tax and the `Jurisdiction` interface,
    with Ontario as its only implementation.
  - [tax](./tax/README.md): `personalTax` and the shared table arithmetic.

## Invariants

- `[constants.ts header]` This is the only engine file exempt from the no-magic-numbers lint
  rule. Rule values never appear here; they come from `config/`.
- `[types.ts header]` Money fields ending in `Today` are in today's dollars; fields ending in
  `Nom` are in future dollars.
- `[types.ts:YearContext]` `yearIndex` is 0 in the plan's start year. `deflator(t)` is
  (1 + inflation)^t.
- `[types.ts:TaxableIncome]` One person's income after any pension split, in future dollars.
  - `pensionEligible`: DB at any age, RRIF/LIF at 65 or older.
  - `eligibleDividends`: the cash amount.
  - `capitalGains`: the full gain.
- `[types.ts:AccountInput.id]` Has the form `<type>-<owner>-<n>`.
- `[types.ts:PlanInputs.investing.mix]` Whole numbers summing to 100.
- `types.ts` declares shapes only. The validation ranges in the design's Data contracts (for
  example `birthYear [1930..2000]`) are not enforced here; they are planned for
  `src/state/persistence/planSchema.ts` (stage 7).
- `[eslint.config.js]` No file under `src/engine` may import from `ui/` or `state/`.

## Side Effects

- None. `constants.ts` and `types.ts` declare values and types only.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
