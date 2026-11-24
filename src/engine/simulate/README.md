# simulate

## Overview

The runs behind one recalculation (design file 36; [Comparisons](../../../docs/designs/retirement-planner.md#comparisons)):
the user's plan in full detail, one run per withdrawal strategy at the user's preset, and the
placement baseline (`same_mix`) as a summary. Nothing is simulated in the random-returns sense;
the name is kept from the design. Future dollars only.

## Interface

- `variants.ts`: `STRATEGY_ORDER` (`registered_last`, `fill_brackets`, `early_rrsp`);
  `variants(inputs): { user, strategies, baseline }`.
- `simulate.ts`: `simulate(inputs, cfg, jurisdiction): { plan, strategies, baseline }`;
  `chartRows(rows)`: the Withdrawals chart's rows (money by source before tax, tax, clawback,
  deposits to the TFSA, spending need).

## Invariants

- `[variants.ts]` The strategy the user chose is the `user` variant itself, so it is run once and
  its summary is shared.
- `[simulate.ts:sourceOf]` An account's source comes from its id's type prefix: `rrsp` and `lira`
  (including converted RRIFs and LIFs) count as registered. The non-registered source includes
  the cash yield paid out.
- `[eslint.config.js]` No `TodayDollars` import here.

## Side Effects

- None.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/simulate.test.ts`
