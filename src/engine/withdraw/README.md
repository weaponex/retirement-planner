# withdraw

## Overview

The withdrawal strategies, from the design's
[Withdrawal strategies](../../../docs/designs/retirement-planner.md#withdrawal-strategies-o7-o8).
Each takes the year in progress (`YearInProgress`: the state, the inputs, each spouse's income so
far and the draws already taken) and returns `Draw[]`. The solver chooses how much; these modules
choose where it comes from.

## Interface

- `registeredLast.ts`
  - `registeredLast(W, year, ctx)`: non-registered first (pro rata), then RRSP/RRIF and LIF pro
    rata across both spouses (LIF capped; overflow to the same owner's RRSP/RRIF, then the other
    spouse), then the TFSA (pro rata).
  - Shared helpers: `remaining`, `startOfYearAge`, `lifRoom`, `registeredDraw`, `nonregDraw`,
    `proRata`, `drawNonreg`, `drawRegistered`, `drawTfsa`, `available`, `withDraws`.
- `fillBrackets.ts`: `bracketLevelAmount(level, ctx)`; `bracketTopUp(year, level, ctx)`.
- `earlyRrsp.ts`: `drawDownYears(inputs, deaths)`; `fillUp(W, year, ctx)`; `earlyRrsp(W, year,
  drawDown, ctx)`; `noDrawDownYears`.
- `surplus.ts`: `surplusShares(year, forcedByOwner, fallbackWeights)`; `placeSurplus(surplus,
  year, shares)`.

## Invariants

- A LIRA is never drawn (M6).
- `[registeredDraw]` RRIF and LIF draws count as `pensionEligible` from
  `federal.credits.pension.min_age_rrif`; RRSP draws and earlier RRIF/LIF draws are
  `otherOrdinary`.
- `[nonregDraw]` A non-registered sale's gain is amount × (value − cost) ÷ value (average cost).
- `[fillBrackets.ts]` The level comes from the rule values in use; the top-up stops exactly at it.
  At or below the level there is no clawback, so the top-up is the level minus net income.
- `[earlyRrsp.ts]` A spouse still working, or not alive, is not drawn from (C2). The draw-down
  years include the year a benefit starts.
- `[surplus.ts]` A surplus goes to the TFSA within room, then the first non-registered account.
  With no forced draws it follows fixed income, then equal shares, among living spouses.

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{registeredLast,fillBrackets,earlyRrsp,surplus}.test.ts`.
