# solver

## Overview

One retired-household year, following the design's
[year solver](../../../docs/designs/retirement-planner.md#the-year-solver): the first-death
transfer, the start-of-year step, the rebalance, fixed income, required draws, the withdrawal
solve with the two-pass pension split, the surplus, price returns, and the invariants. Everything
here is in future dollars; the `TodayDollars` type may not be imported (lint).

## Interface

- `bisect.ts`: `bisect(f, lo, hi): { x, converged }` for a rising `f`; returns the feasible end.
- `startOfYear.ts`: `startOfYear(state, ctx)` (conversions, the LIRA unlock, TFSA room);
  `deathYear`, `firstRetirementYear`, `lastYear`, `spouseForYear`, `nextAccountId`.
- `incomeAssembly.ts`: `FixedIncome`; `assembleIncome(spouse, fixed, draws, cashYield,
  realizedGains)`; `splitEligible(...)`; `noFixedIncome`, `noCashYield`.
- `yearSolve.ts`
  - `solveYear(state, inputs, ctx, variant, options?)`: a `SolvedYear`, `{ nextState, row,
    endState, taxed }`: the end-of-year state and each spouse's income after the split with the tax
    settled on it, which the final return reads. `noEstate()` fills `row.estate`. Throws
    `EngineIntegrityError` if the solve does not converge or an invariant fails. `options.fixedSplit` solves once at that split (tests).
  - Shared with working years: `prepareYear`, `fixedIncome`, `fixedTotal`, `ownerCashYields`,
    `creditYields`, `applyPriceReturns`, `advance`.

## Invariants

- The order within a year is the design's, with two choices made here: the first-death transfer
  runs before the conversions, so the survivor's age drives them; and sheltered yields are worked
  out on the start-of-year balance but credited after the year's draws and before any deposit, so
  they never enlarge the balance the RRIF and LIF limits are measured on (stage 3 decision S6).
- Two splits whose household tax differs by less than `SPLIT_TIE_TOLERANCE` are a tie, settled by
  the tie rule (stage 3 decision S5).
- A RRIF has no maximum; a LIF's limits are fixed at the start of the year.
- W is found by bisection between 0 and everything available, to `SOLVER_PRECISION` in at most
  `SOLVER_MAX_STEPS` steps. If everything is not enough, everything is drawn and the shortfall
  recorded.
- The split is solved at last year's choice (no split in the first year), then searched and
  re-solved while the best split changes, up to `MAX_SPLIT_PASSES` (3) solves.
- A spouse still working is taxed at their `workingMarginalRate` and left out of splitting (C2).

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{bisect,yearSolve,startOfYear}.test.ts`; `tests/property/solver.test.ts`.
