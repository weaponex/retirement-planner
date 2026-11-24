# accounts

## Overview

Pure functions on one account's state, following the design's
[Accounts](../../../docs/designs/retirement-planner.md#accounts): RRSP to RRIF conversion and
minimums, LIRA to LIF conversion and limits, TFSA room, and non-registered sales, yields and
capital losses. The year solver (`src/engine/solver/`) calls them; they never decide how much to
withdraw.

## Interface

- `rrspRrif.ts`
  - `minFactor(ageAtStartOfYear, ctx)`: the `federal.rrif.min_factor` row; the last row above the
    table; 1 ÷ (`federal.rrif.min_factor_base_age` − age) below it (FR-M4).
  - `conversionAgeFor(account, ctx)`: the chosen conversion age, capped at
    `federal.rrif.latest_conversion_age`.
  - `convertRrsp(account, ownerAge, year, ctx)`: RRSP to RRIF in the year the owner reaches that
    age (the age in the row); sets `openedYear`.
  - `isOpeningYear(account, year)`, `rrifMinimum(account, ageAtStartOfYear, year, ctx)`: 0 for an
    RRSP or in the opening year.
- `liraLif.ts`
  - `convertLira(account, ownerAge, year, ctx): { account, unlocked }`: LIRA to LIF; with
    `lifUnlock50`, `ctx.jurisdiction.unlockShare` of the balance leaves (the caller places it).
  - `lifLimits(account, ageAtStartOfYear, year, ctx): { min, max }`: min = 0 in the opening year,
    else the RRIF minimum; max = the greater of `ctx.jurisdiction.lifMaxFactor` × balance and
    `lifPrevEarningsNom` (the factor alone in the opening year), never below min or above the
    balance. A LIRA returns `{ 0, 0 }`.
- `tfsa.ts`: `addYearlyRoom(spouse, ctx)` (nothing in year index 0), `fitsInRoom`, `firstTfsa`,
  `useRoom`, `recordWithdrawal`.
- `nonRegistered.ts`: `sellProRata(account, amount)`, `cashYield(account, returns)` (by income
  type), `netGains(realized, carriedLoss)`, `reinvestYield(account, returns, ctx)` (sheltered
  accounts, net of `market.foreign_withholding_rate` on foreign dividends).

## Invariants

- Minimums and maximums use the owner's age at the start of the year (the row age − 1).
- `[liraLif.ts]` A LIRA is never drawn; only a LIF has room.
- `[tfsa.ts]` Room belongs to the person and is shared by all their TFSAs; a withdrawal returns to
  room the next January 1 (C3). The first year starts from the room the user entered.
- `[nonRegistered.ts:netGains]` A loss offsets same-year gains, then carries forward against
  later gains only, never other income (FR-M5).
- Every rule value comes from config through `src/engine/config/read.ts` or the jurisdiction.

## Side Effects

- None. Every function returns new state.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{rrspRrif,liraLif,tfsa,nonRegistered}.test.ts`.
