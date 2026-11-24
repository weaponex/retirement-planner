# invest

## Overview

Returns, the investment mix over time, and where each asset class is held. Follows the design's
[Asset classes and returns](../../../docs/designs/retirement-planner.md#asset-classes-and-returns-o3)
and [Placement and the growth-to-safety shift](../../../docs/designs/retirement-planner.md#placement-and-the-growth-to-safety-shift-o4-o5).

## Interface

- `returns.ts`: `classReturns(cfg, investing)` (the only place returns are worked out:
  `{ total, yield, price, incomeType }` per class); `planFee`; `optimisticLimit` and
  `isOptimistic` (FP Canada's figure + `planning.override_margin`); `INCOME_TYPE`,
  `STOCK_CLASSES`, `SAFE_CLASSES`.
- `glide.ts`: `shapeAt(points, t)`; `mixForYear(userMix, startingMixId, shapeId,
  yearsFromFirstRetirement, planStartYearsFromRetirement, cfg)`, returning fractions.
- `placement.ts`: `FILL_ORDER`; `targetHoldings(accounts, overallMix, presetId, cfg)` (or
  `'same_mix'` for the baseline).
- `rebalance.ts`: holdings arithmetic (`emptyHoldings`, `holdingsValue`, `accountValue`,
  `currentWeights`, `holdingsAt`, `buy`, `sellProRataHoldings`), `rebalanceAccount` and
  `rebalance(accounts, targets)`, which returns the realized gains by owner.

## Invariants

- `[returns.ts]` total = gross − fee; an override replaces the gross return before the fee;
  price = total − yield.
- `[glide.ts]` The change in year *t* is shape(*t*) − shape(*t₀*), so the first year uses
  today's mix (SR1-M7). The stock share is clamped to 0..1; proportions within stocks and within
  bonds and cash are kept; the fallbacks follow the design.
- `[placement.ts]` Balances are counted at face value. Each account's targets add up to its
  balance, and each class's targets add up to its share of the household.
- `[rebalance.ts]` Only non-registered sales realize gains, at average cost.

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Tests: `tests/unit/{returns,glide,placement,rebalance,startOfYear}.test.ts`.
