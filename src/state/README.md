# state

## Overview

The plan store and everything the screens need to edit a plan (design file 42;
[Components and data flow](../../docs/designs/retirement-planner.md#components-and-data-flow)).
The store holds the plan being edited, raises a revision on every change, and 500 ms after the
last change sends a ready plan to the engine Worker. A reply for an older revision is dropped.

## Interface

- `draft.ts`: `PlanDraft` (`PlanInputs` with empty numbers allowed while typing); `getAt`,
  `setAt`, `deleteAt` by input path (accounts are addressed by id: `accounts.rrsp-0-1.balanceToday`).
- `readiness.ts`: `readyToRun(draft, cfg?)`: the plan schema plus the mix sum; fills a working tax rate of
  0 for a spouse not working and a one total of 0 in category mode; otherwise the `missing` list.
- `store.ts`: `createPlanStore({ cfg, connect, now?, initial? })`; `statusOf(state)`
  (`incomplete`, `updating`, `up_to_date`, `error`); `RUN_DELAY_MS`; `inputAt`.
  Actions: `setInput`, `clearInput`, `setRule`, `resetRule`, `resetAllRules`, `loadPlan`, `chooseMix`,
  `addDcPension`, `chooseAccountMix`, `shareAccountMix` (one mix for every account, AR2-S1),
  `setGroupAmount`,
  `setSpendingMode`, `addAccount`, `removeAccount`, `addDbPension`, `removeDbPension`, `setView`.
- `defaults.ts`: `emptyPlan(cfg, today)` (eight $0 accounts, CPP and OAS at 70),
  `newAccount`, `STARTING_ACCOUNT_TYPES`, `defaultLifeExpectancy(sex, age, cfg)`, `startingMix`.
- `changeSummary.ts`: `changeSummary(previous, current, edits, draft)`, `describeEdits`.
- `labels.ts`: `fieldLabel(path, draft)`. `categories.ts`: the 29 persisted category ids, the group ids and `groupOf`.
- `mix.ts`: `setMixShare` (the sliders), `mixTotal`. `format.ts`: money and percent formats.
- `persistence/planSchema.ts`: the zod schema with the input ranges and the caps.
- `persistence/exportImport.ts`: `exportPlan(inputs, meta)` and `importPlan(text, fileName)`, the
  export file and its check (AR2-X1, AR2-X2, ahead of stage 7).
- `react.ts`: `PlanStoreContext`, `usePlan(selector)`.

## Invariants

- `[store.ts]` Every action that changes `inputs` raises `inputsRevision`; a result, tips or
  error whose revision is not the latest is ignored.
- `[store.ts:fillLifeExpectancy]` An empty target is filled once, when birth year and sex are both
  set; a typed target is never replaced.
- `[store.ts:setSpendingMode]` Both sets of spending values are kept; "One total" starts from the
  category sum only while it is empty.
- `[store.ts:onResult]` A plan load produces no change summary.
- `[react.ts]` A selector passed to `usePlan` must return stored values, not new arrays or objects,
  or React re-renders forever.

## Side Effects

- `store.ts` schedules runs with `setTimeout` and calls the engine client passed to it.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/planState.test.ts`, `tests/unit/store.test.ts`
