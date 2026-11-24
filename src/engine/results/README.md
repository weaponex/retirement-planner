# results

## Overview

The `Result` fields the screens read (design file 37; [Result definitions](../../../docs/designs/retirement-planner.md#result-definitions)
and Data contracts, Results for the screens): the two goals, the comparisons, the year-one sale
tax and the Estate chart's figures. Amounts in today's dollars are each year's future-dollar
amount divided by that year's deflator.

## Interface

- `compare.ts`:
  - `compare(a, b): Comparison`: `a` − `b` in lifetime tax and after-tax legacy, and
    `oppositeDirections` (lower tax with a smaller legacy, or the reverse; differences under $1
    ignored);
  - `compared(summary, lastIndex, deflator)`, `lastYearIndex(inputs, rows)`;
  - `goals(rows, summary, inputs, deflator)`: Goal 1 over the years from the first retirement
    to the second death; Goal 2 as `met`, `missed` or `no_goal` (a goal of 0);
  - `yearOneSaleTax(inputs, cfg, jurisdiction, deflator, variant): { gainsNom, taxNom }`;
  - `estateSummary(rows, inputs, deflator)`.

## Invariants

- `[compare.ts:yearOneSaleTax]` Year one is solved twice, the second time with the rebalance's
  gains set to zero (`ignoreRebalanceGains`); the sale's tax is the difference in household
  tax. It is negative when the sale realizes a net loss. Working-year rules apply when the plan
  starts before the first retirement.
- `[compare.ts:estateSummary]` balances + home − final-return tax − probate = after-tax legacy.

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/compare.test.ts`, `tests/unit/engineIndex.test.ts`
