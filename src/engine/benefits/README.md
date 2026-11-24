# benefits

## Overview

Government and workplace pension payments for one spouse and one year: CPP, OAS, defined-benefit
pensions, and the survivor benefits that start after the first death. Formulas follow the
design's [Accounts](../../../docs/designs/retirement-planner.md#accounts) section; every
coefficient comes from config.

## Interface

- `cpp.ts`
  - `yearShare(startAge, age, birthMonth)`: 0 before the start year, (12 − birth month) ÷ 12 in
    it, 1 after. Shared by every benefit.
  - `cppAdjustment(startAge, ctx)`: lower per month before 65 (`federal.cpp.adjust.early_per_month`),
    higher per month after (`late_per_month`); the start age is clamped to
    `federal.cpp.start.earliest..latest`.
  - `cppFullYear(estimateAt65, startAge, ctx)`, `cppAt(estimateAt65, startAge, age, birthMonth, ctx)`.
- `oas.ts`: `oasFullYear(residenceYears, startAge, ctx)`, `oasAt(residenceYears, startAge, age,
  birthMonth, ctx)`, including the increase from `federal.oas.increase_age`, pro-rated in its
  first year.
- `db.ts`: `dbPayment(db, age, birthMonth, ctx, alive): { lifetime, bridge, total }`.
- `survivor.ts`: `survivorBenefits(deceased, survivor, ctx): { cpp, db }`.

## Invariants

- `[constants.ts:BENEFIT_REFERENCE_AGE]` The CPP estimate and the OAS base refer to age 65, set
  by the design's input and key definitions; start-age adjustments count months from there.
- Payments start the month after the start birthday; the first year is pro-rated.
- CPP and OAS grow with the deflator. A DB pension with `full` indexing grows with the deflator;
  `fixed` grows by `indexRate` from its start age; `none` stays flat.
- The DB bridge pays until the end-age birthday month (the end year pays birth month ÷ 12).
- `[survivor.ts]` The survivor's own CPP plus the survivor benefit never exceeds
  `federal.cpp.survivor.max_combined` (FR-M11).

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{cpp,oas,db,survivor}.test.ts`.
