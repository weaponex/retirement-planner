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
  - `solveYear(state, inputs, ctx, variant, options?)`: `{ nextState, row }`. Throws
    `UnsupportedStrategyError` for `planner_pick` (stage 4) and `EngineIntegrityError` if the solve
    does not converge or an invariant fails. `options.fixedSplit` solves once at that split (tests).
  - Shared with working years: `prepareYear`, `fixedIncome`, `fixedTotal`, `ownerCashYields`,
    `creditYields`, `applyPriceReturns`, `advance`.

## Invariants

- The order within a year is the design's, with two choices made here: the first-death transfer
  runs before the conversions, so the survivor's age drives them; and sheltered yields are worked
  out on the start-of-year balance but credited after the year's draws, so they never enlarge the
  balance the RRIF and LIF limits are measured on.
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
