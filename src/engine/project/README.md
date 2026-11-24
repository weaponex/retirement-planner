# project

## Overview

Runs a whole plan at fixed returns: the first year's state, the spending need, working years
before the first retirement, the first-death transfer, and `runPath`, which loops the years and
adds up the summary. Future dollars only, except `runPath`'s today's-dollar totals, which divide
by the deflator as plain numbers (M5).

## Interface

- `initialState.ts`: `initialState(inputs, ctx, variant)`; `yearMix(inputs, year, ctx)`.
- `spendingNeed.ts`: `phaseIndex`, `monthlyNeed`, `spendingNeed(inputs, state, ctx)`.
- `workingYear.ts`: `workingYear(state, inputs, ctx, variant, options?)`: a `SolvedYear`, like `solveYear`, with the same `ignoreRebalanceGains` option.
- `death.ts`: `deaths(inputs)` (first death first); `transferAccounts(state, from, to)`;
  `firstDeathTransfer(state)`; `finalReturn(deceased, endState, yearIncome, yearTax, ctx)`;
  `estate(endState, finalReturnTaxNom, inputs, ctx)`; `secondDeath(endState, taxed, inputs, ctx)`,
  which applies the same-year rollover when both die in one year and returns the row's `estate`.
- `runPath.ts`: `runPath(inputs, cfg, jurisdiction, variant, detail): { rows, summary }`.

## Invariants

- `[initialState.ts]` Registered accounts and TFSAs are placed by the preset; non-registered
  accounts keep their entered positions until the first rebalance. Every spouse gets a
  non-registered account, so a surplus always has a home. An account already past its conversion
  age starts converted, opened the year before.
- `[workingYear.ts]` The yield, gains and benefits are taxed at each owner's marginal rate.
  Contributions land after the price return. RRIF and LIF minimums are taken in working years
  too, taxed at the marginal rate and saved like the benefits.
- `[runPath.ts]` Rows run from the plan start to the second death. The second death year's row
  carries the final return and the estate (`row.estate`, all 0 in other years); lifetime tax
  includes the final-return tax and probate; `afterTaxLegacyNom` is the estate's, and
  `legacyIsPreTax` is `false`.
- `[death.ts]` The final return is one return (T10): the deceased's income after the split plus
  every RRSP, RRIF, LIRA and LIF balance and the deemed non-registered gains (after the carried
  loss), taxed once; the year's tax is subtracted. The estate pays it before probate, which
  applies to non-registered balances and the home.
- `[workingYear.ts]` `taxableIncomeNom` is the tax-return figure and `afterTaxCashNom` and
  `surplusNom` are 0 (stage 3 decision S3).
- `[death.ts]` Accounts keep their id and type and change owner; the deceased's carried loss is
  dropped; the TFSA transfer uses no room.

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{workingYear,runPath,death,spendingNeed}.test.ts`;
  `tests/property/{determinism,symmetry,zeroTax}.test.ts`. `runPath.test.ts` logs the time of a
  40-year run against the 45 ms budget (SR1-M3).
