# tax

## Overview

Tax arithmetic for one person and one year. `personalTax.ts` combines the
federal tax, the provincial tax from a `Jurisdiction`, and the OAS recovery tax
(clawback) into one result. `tables.ts` holds the shared table arithmetic
(bracket tax, phase-in amounts, the lowest bracket rate) that the federal and
Ontario rules in `src/engine/jurisdiction/` use. No rule values live here: the
tables arrive as `BracketRow[]` / `PhaseInRow[]` read from config by
`src/engine/config/read.ts`.

## Interface

- `personalTax.ts`
  - `interface PersonalTax { federal; provincial; clawback; total }`: `federal`
    is line 42000 without the clawback; `provincial` is line 42800 including any
    provincial premium; `clawback` is the OAS recovery tax (line 42200).
  - `personalTax(income: TaxableIncome, age: number, jurisdiction: Jurisdiction, ctx: YearContext): PersonalTax`:
    calls `federalTax` (`src/engine/jurisdiction/federal.ts`) and
    `jurisdiction.provincialTax` (`src/engine/jurisdiction/types.ts`).
- `tables.ts`
  - `bracketTax(rows: BracketRow[], income: number): number`: each row's
    `rate` applies from its `from` up to the next row's `from` (the last row
    is open-ended).
  - `phaseInAmount(rows: PhaseInRow[], income: number): number`: within a
    band, the previous row's `cap` (0 for the first row) plus
    `rate x (income - from)`, capped at this row's `cap`; 0 below the first
    band.
  - `lowestRate(rows: BracketRow[]): number`: the first row's rate, used to
    value non-refundable credits.
- Consumers: `src/engine/jurisdiction/federal.ts` (`bracketTax`, `lowestRate`)
  and `src/engine/jurisdiction/ontario.ts` (`bracketTax`, `lowestRate`,
  `phaseInAmount`).

## Invariants

- `PersonalTax.total` equals `federal + provincial + clawback`
  (`personalTax.ts:personalTax`).
- `federal` excludes the clawback; the clawback is reported separately from
  `federalTax(...).clawback` (`personalTax.ts:PersonalTax`).
- Bracket rows must be in ascending `from` order. `bracketTax` adds
  `max(0, min(income, nextFrom) - from) x rate` for each row, so an
  out-of-order row would add the wrong amount (`tables.ts:bracketTax`).
- `lowestRate` throws `Error('A bracket table needs at least one row')` on an
  empty table (`tables.ts:lowestRate`).
- Provincial rules are reached only through the `Jurisdiction` interface; this
  module names no province (`personalTax.ts:personalTax`).
- Rule values (rates, thresholds, caps) come from config, never from this
  module (AGENTS.md "Values").

## Side Effects

- None. All functions are pure computations over their arguments.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/personalTax.test.ts` (the table functions are also
  exercised through `tests/unit/federal.test.ts` and
  `tests/unit/ontario.test.ts`).
