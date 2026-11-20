# Goldfish Annotated Review Report

**Status: resolved** (2026-11-19, "auto accept": all PROPOSE FIX items applied to the design; S1-S3 kept as drafted; C1-C4 applied as proposed; the CONTEST and DECLINE items not applied).

**Target:** `docs/designs/retirement-planner.md` (lines 1041-1709, DetailedRange)
**Findings:** the 40 findings in `implementation_readiness_report.md` (Stage 9, round 1).
**Date:** 2026-11-19

Summary of suggestions: 37 PROPOSE FIX (four of them partial: 33, 34, 37 and part of 30), 1 CONTEST
(the O29 part of 33), 0 ESCALATE, 3 DECLINE in full (29, 36, 38: Nits fixed when their file is
built or in the editorial pass). Every Blocker and Major is valid as reported; the evidence is below.

## Decisions needed before the fixes

The fixes depend on three scope questions from Stages 5, 7 and 8, and on four choices inside
them. Stages 5-8 found these in the feature spec; this pass resolves only the Stage 9 findings, but
the Detailed Implementation Plan changes with the answers.

**Scope (from ZO-1, ZO-2, ZO-16, IZO-1, IZO-3, IZO-4):**

- **S1. "Let the planner pick".** Keep it in version 1, or move it to Future Improvements. Cutting
  it removes `plannerSearch` (file 36), `planning.planner_search`, O31, SR1-M5, most of SR1-M12,
  the open part of SR1-M3, and findings 22 (part) and 30 below.
- **S2. Which values Settings can change.** Every key in the key tree (as drafted), or only
  single-value keys that have a Settings row (no tables). The narrow version removes the
  table-structure checks from `validateOverride` (finding 5).
- **S3. After-tax stock-share readout.** Keep it, or cut it. Cutting it removes
  `afterTaxStockShare` (file 31) and closes FR-M16.

**Choices inside the proposed fixes (one answer each is proposed; say if you want another):**

- **C1. Indexing (finding 2).** Rebase the config once to plan-start dollars (`rebaseConfig`), and
  drop `ruleFactor`. The existing `read.ts`, `ctx.deflator` and stage 1 tests stay as they are.
- **C2. A spouse still working in a retired-household year (finding 11).** All of that spouse's
  taxable income other than pay (CPP, OAS, DB, registered draws, their share of non-registered
  income) is taxed at their `workingMarginalRate`, not through `personalTax`. That spouse is left
  out of pension splitting, the bracket top-up and Early RRSP draws until they retire.
- **C3. TFSA (finding 17).** Withdrawals are re-credited as room on January 1 of the next year. The
  indexed yearly limit is not rounded (an accepted approximation; rounding would need a new key).
  Surplus is split between spouses by their share of the forced draws that caused it.
- **C4. Worker cancelling (finding 23).** When a newer revision arrives, the client terminates the
  Worker and starts a new one. This closes the Worker part of SR1-M2.

## Prioritized Findings & AI Suggestions

### [Issue 1] The engine's state model and stage 2 types are defined nowhere [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Blocker
*   **Affected Scope:** [Lines 1395, 1452-1456, 1462-1463, 1469, 1494, 1074](../../designs/retirement-planner.md#L1395) (files 25, 32-34, 38; Known gaps M1)
*   **Discrepancy Description:** `SpouseYearState`, `AccountState`, `Draw`, `Variant`, `NormalizedInputs`, `EngineIntegrityError`, `state`, `prev`/`next` are used in stage 2 signatures and defined nowhere. `PlanSummary` lacks `lifetimeTaxToday`. M1 closes before stage 3, one stage late.
*   **Rationale:** about a dozen stage 2 files share this state; without it the implementer designs it.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified: `src/engine/types.ts` has none of these types.
*   ***Proposed Edit:***
    *   Location: Data contracts (after `StrategyResult`), file 26, Known gaps M1.
    *   Change: add an "Engine state (stage 2)" block:
        *   `PositionState { valueNom, costNom }`;
        *   `AccountState { id, owner, type: 'rrsp'|'rrif'|'lira'|'lif'|'tfsa'|'nonreg', holdings: Record<AssetClass, PositionState>, openedYear?, lifPrevEarningsNom?, tfsaRoomNom? }` (`costNom` used for non-registered only);
        *   `SpouseYearState { alive, age, working, carriedLossNom, tfsaWithdrawnLastYearNom }`;
        *   `PlanState { year, yearIndex, spouses: [SpouseYearState, SpouseYearState], accounts: AccountState[], splitShare: { from: 0|1, share }, firstDeathYear? }`;
        *   `Draw { accountId, amountNom, incomeType: 'pensionEligible'|'otherOrdinary'|'tfsa'|'nonregPrincipal', realizedGainNom }`;
        *   `Variant { id, strategyId, presetId: PresetId | 'same_mix' }`;
        *   `NormalizedInputs`: `PlanInputs` with every `…Today` field replaced by its `…Nom` value at the plan start, plus `deflator`;
        *   `EngineIntegrityError { year, variantId, check, before: PlanState, after: PlanState }`.
        Add `lifetimeTaxToday` and `totalShortfallToday` to `PlanSummary`; `warningFacts` is `{}` until stage 6. File 26 lists these as stage 2 additions. Split M1: the `NormalizedInputs` and `YearRow` forced-draw and contribution fields close before stage 2; `Result` stays at stage 4.

### [Issue 2] `ruleFactor`, `YearContext`, `read.ts` and the tests disagree on indexing [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`] - Severity: Major
*   **Affected Scope:** [Lines 1387, 1394, 1401, 1655](../../designs/retirement-planner.md#L1387); Units and conventions (Indexing)
*   **Discrepancy Description:** `makeRuleFactor` ignores `planStartYear`; `read.ts` would need a calendar year that `YearContext` lacks; file 26 still lists the old `YearContext`; stale overrides need their own base year; line 1655 says `ctx.deflator`.
*   **Rationale:** the indexing contract contradicts itself.
*   ***AI Suggestion:*** PROPOSE FIX (choice C1)
*   ***Justification:*** Verified; these are gaps from the 2026-11-19 stage 2 draft.
*   ***Proposed Edit:***
    *   Location: Units and conventions (Indexing), Config contract (User changes), files 24, 25, 26.
    *   Change: replace `ruleFactor` with `rebaseConfig(cfg, planStartYear): Config` in `config/load.ts`. It multiplies each indexed amount (and each indexed bracket row) by (1 + inflation)^(planStartYear − entry.taxYear), then sets that entry's `taxYear` to `planStartYear`. `applyRuleOverrides` runs first and gives each override the `taxYear` of its `defaultTaxYear`, so a stale override is rebased from its own year. After the rebase, the existing `ctx.deflator(yearIndex)` indexing in `read.ts` is right, and `YearContext` and line 1655 stay as they are. Delete `makeRuleFactor` and every mention of `ruleFactor`.

### [Issue 3] There is no Create/Modify file boundary for stage 2, and existing files are labelled "Create" [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`] - Severity: Major
*   **Affected Scope:** [Lines 1115-1692](../../designs/retirement-planner.md#L1115) (file headings)
*   **Discrepancy Description:** built files are still "Create"; stage 2 modifies files the plan doesn't list; new folders have no README entries; "the three config constants" is ambiguous.
*   **Rationale:** the standard asks for an explicit write list.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified against the repository.
*   ***Proposed Edit:***
    *   Location: each file heading 1-28, 51, 52, 56; new subsection "Stage 2 file boundary" at the start of Target Files.
    *   Change: relabel built files "(Exists, stage N)" and add "modify at stage 2" where they change. Add the stage 2 list: **Create** `units.ts`, `accounts/*`, `benefits/*`, `withdraw/*` (three strategies), `tax/split.ts`, `solver/*`, `project/workingYear.ts`, `project/runPath.ts`, `project/death.ts` (first-death transfer only), `invest/returns.ts`, `invest/glide.ts`, `invest/placement.ts`, `invest/rebalance.ts`, `config/overrides.ts`, `invariants.ts`, a README per new folder, `tests/unit/helpers/couplePlan.ts`, the stage 2 test files; **Modify** `types.ts`, `config/read.ts`, `config/load.ts`, `config/schema.ts`, `config/keys.ts`, `jurisdiction/types.ts`, `jurisdiction/ontario.ts`, `tools/configCheck.ts`, `tests/unit/taxContext.ts`, `tests/unit/config.test.ts`, `.github/workflows/ci.yml`, `config/2026/planning.json`, `config/2026/market.json` (author values only), `docs/units-and-conventions.md` (rebase example), `src/engine/README.md` and `src/engine/config/README.md`. Replace "the three config constants" with their names.

### [Issue 4] Stage 2 changes break existing callers and test helpers [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1384, 1648-1671, 1655](../../designs/retirement-planner.md#L1384)
*   **Discrepancy Description:** a required `ruleFactor` breaks `taxContext.ts`; the new `configStatus` signature breaks `configCheck.ts` and `config.test.ts`; `overrides` has no type; no shared test helper.
*   **Rationale:** stage 2 would break stage 1's green tests without a plan for it.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`taxContext.ts:8-10`, `configCheck.ts:26`). C1 removes the `ruleFactor` part.
*   ***Proposed Edit:***
    *   Location: files 24, 51, 56.
    *   Change: `configStatus(config, overrides: RuleOverrides, today)`; `configCheck.ts` passes `{}`; `config.test.ts` and `taxContext.ts` listed as Modify (the context gains `jurisdiction`, finding 8). Name `tests/unit/helpers/couplePlan.ts`: a minimal two-spouse `PlanInputs`, and `yearContext(year)` built from the bundle with test-only values for unfetched entries.

### [Issue 5] `PlanInputs.ruleOverrides` has three different shapes [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1386, 1400, 1092](../../designs/retirement-planner.md#L1386); Data contracts
*   **Discrepancy Description:** three shapes; `validateOverride` can't see the whole set; `valueSchemas` isn't exported; `dropped` untyped; call order unstated.
*   **Rationale:** an implementer must pick one.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`types.ts:142-143`, `schema.ts:17`).
*   ***Proposed Edit:***
    *   Location: Data contracts, Config contract, file 24.
    *   Change: `type RuleOverrides = Record<string, { value: unknown; defaultTaxYear: number }>` everywhere (`PlanInputs.ruleOverrides?: RuleOverrides`). `validateOverride(key, value, overrides, cfg): string[]`. `schema.ts` exports `checkValue(kind, value): string[]`, reused with `toAnnual`. `dropInvalidOverrides` returns `{ kept: RuleOverrides, dropped: { key, value, reasons: string[] }[] }`. Order: `applyRuleOverrides` → `rebaseConfig` → `normalizeInputs`.

### [Issue 6] Config values that stage 2 reads are null, and `planning.fee_levels` has no schema [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1107, 1110, 1346-1357, 1443-1444](../../designs/retirement-planner.md#L1107)
*   **Discrepancy Description:** three foreign yields, the cash return and cash yield, and `planning.fee_levels` are null; `read.ts` throws on null; `fee_levels` and `mixes` have no schema; the 0%-stock fallback needs `planning.mixes` (O24, stage 5); "chosen last" has no field; nobody is named to enter the values.
*   **Rationale:** no `runPath` can run on the committed bundle.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified in `market.json` and `planning.json`.
*   ***Proposed Edit:***
    *   Location: stage table (stage 2 gate), file 22, file 31, `glide` text.
    *   Change: stage 2 gate adds "the author enters and validates `market.us_equity.yield`, `market.intl_equity.yield`, `market.em_equity.yield`, `market.cash.yield` (author decisions, O30) and `market.cash.geometric_return` (FP Canada)". Stage 2's first task adds a schema `planning.fee_levels: Record<'index_etf'|'robo'|'advisor', rate 0..0.05>` and writes the O25 values. Until O24, the 0%-stock fallback puts the points in Canadian stocks. "Chosen last" is `investing.mixId`. Unit tests use the bundle through the helper in finding 4; engine code never reads test values.

### [Issue 7] `read.ts` has no age-table reader, and helpers that take only a `Config` cannot use it [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1393, 1413, 1434-1435, 1443](../../designs/retirement-planner.md#L1393)
*   **Discrepancy Description:** `minFactor`, the LIF maximum and life expectancy read age tables; every reader needs a `YearContext`.
*   **Rationale:** stage 2 can't read these tables.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`read.ts:37-73`).
*   ***Proposed Edit:***
    *   Location: file 24 (`read.ts`, Modify).
    *   Change: add `ageTable(ctx, key, age): number` (rates, never indexed; ages below the first row return `undefined` so the caller applies its own rule, ages above the last row use the last row), and `planValue(cfg, key): number` for unindexed values read once per plan (`market.inflation`, yields, returns), used by `makeDeflator` and `classReturns`.

### [Issue 8] Nothing says how a jurisdiction reaches the split, solver and projection code [`egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1404, 1421, 1462, 1469](../../designs/retirement-planner.md#L1404); file 26 filling rule
*   **Discrepancy Description:** `bestSplit`, `solveYear`, `runPath` take no `Jurisdiction`; `a`/`b` untyped; who builds each year's context; the filling rule hard-codes 65; "0-50%" and "21 points" should come from `federal.split.max_share`.
*   **Rationale:** these functions can't call `personalTax`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`personalTax.ts:16-21`).
*   ***Proposed Edit:***
    *   Location: files 26, 28, 33, 34; Withdrawal strategies (splitting).
    *   Change: `YearContext` gains `jurisdiction: Jurisdiction` (stage 2). `bestSplit(a: { income: TaxableIncome; age: number }, b: same, ctx)`. `runPath` builds one `YearContext` per year. The filling rule reads `federal.credits.pension.min_age_rrif`; split eligibility reads `federal.split.min_age_rrif`; the search runs to `federal.split.max_share` in `SPLIT_STEP` steps, giving 2 × (max_share / SPLIT_STEP) + 1 points.

### [Issue 9] The LIF rules have two owners and a signature too narrow to apply them [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1413, 1435](../../designs/retirement-planner.md#L1413)
*   **Discrepancy Description:** `lifLimits` lacks last year's earnings and the opening year; `liraLif.ts` holds the same rules; the under-71 formula is left out.
*   **Rationale:** the FR-M9 and FR-M4 rules can't be applied as specified.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: files 27 and 30; Accounts (LIRA).
    *   Change: the jurisdiction returns Ontario values only: `lifMaxFactor(ageAtStartOfYear, ctx): number` (table, last row above 90) and `unlockShare(ctx)`. `liraLif.ts` owns the rules: `lifLimits(account, age, isOpeningYear, ctx): { min, max }`, with min = 0 in the opening year, else `minFactor(age, ctx)` (from `rrspRrif.ts`) × balance; max = the greater of `lifMaxFactor` × balance and `lifPrevEarningsNom` (table alone in the opening year).

### [Issue 10] Account placement fill and per-owner realized gains are underspecified [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1445, 1447](../../designs/retirement-planner.md#L1445)
*   **Discrepancy Description:** how a group spread over accounts and spouses is filled; partial fit; realized gains not by owner.
*   **Rationale:** tax is per spouse.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified; duplicates the still-open SR1-N7.
*   ***Proposed Edit:***
    *   Location: file 31 (`targetHoldings`, `rebalance`).
    *   Change: for each class in fill order, target = share × household total; fill the account groups in preset order; within a group, split the amount across its accounts in proportion to each account's remaining room (balance not yet assigned); a class that only partly fits a group continues into the next group. `rebalance` returns `realizedGainsNom: [number, number]` by owner.

### [Issue 11] `workingYear` and years with mixed working and retired spouses are not specified [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1468, 1663](../../designs/retirement-planner.md#L1468); The year solver (working years)
*   **Discrepancy Description:** no signature or steps; rebalance and shape; tax on non-registered income; CPP/OAS while working; TFSA overflow; how a working spouse is taxed in a retired-household year.
*   **Rationale:** stage 2 builds `workingYear`.
*   ***AI Suggestion:*** PROPOSE FIX (choice C2)
*   ***Justification:*** Verified; overlaps Critic-6 (pay invisible to tax favours two strategies).
*   ***Proposed Edit:***
    *   Location: The year solver (working years), file 34.
    *   Change: `workingYear(state, inputs, ctx): { nextState, row }`, steps: (1) ages; (2) rebalance and the shape, as in retired years; (3) the non-registered yield is taxed at each owner's `workingMarginalRate`, the tax is paid from the yield, the rest is reinvested; (4) CPP, OAS and DB collected while working are taxed at that rate and the net goes to the owner's TFSA within room, then non-registered; (5) contributions land at the end of the year, TFSA within room, the excess to non-registered; (6) price returns; (7) invariants. In a retired-household year, choice C2 applies to a spouse who is still working.

### [Issue 12] File 27 describes the whole Jurisdiction interface as stage 1 [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1406-1415](../../designs/retirement-planner.md#L1406)
*   **Discrepancy Description:** the code has only `id` and `provincialTax`.
*   **Rationale:** the file plan contradicts the code.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`jurisdiction/types.ts:5-11`).
*   ***Proposed Edit:***
    *   Location: file 27.
    *   Change: "(Exists, stage 1; modify at stages 2 and 3)"; list `id`; `lifMaxFactor` and `unlockShare` at stage 2 (finding 9), `probate` at stage 3.

### [Issue 13] Known gaps row FR-M5 says a `config:check` warning exists, but it does not [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1062, 1607](../../designs/retirement-planner.md#L1062)
*   **Discrepancy Description:** the warning is in neither file 51 nor the tool; the bond values would trigger it today.
*   **Rationale:** the row overstates what is done.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`tools/configCheck.ts`; bonds yield 0.0347 vs return 0.032).
*   ***Proposed Edit:***
    *   Location: file 51; FR-M5 row.
    *   Change: file 51 adds "`configCheck` prints a warning (exit 0) for each class whose yield is above its gross return (stage 2)". The FR-M5 row says the rule is in the design and the warning is built in stage 2; it notes that the bond class triggers it with the 2026 values.

### [Issue 14] The timing of spending-phase `fromYear` is needed in stage 2 but gated at stage 5 [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1090, 1462](../../designs/retirement-planner.md#L1090)
*   **Discrepancy Description:** step 5 needs the phases; SR1-M8 closes at stage 5.
*   **Rationale:** the solver can't compute the spending need.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: Spending inputs; Known gaps SR1-M8.
    *   Change: add "Phase years count from the first retirement year, which is year 0. Validation: 0 < slower `fromYear` < later `fromYear`." Split SR1-M8: phase years closed now; category ids and the spending nudge stay at stage 5.

### [Issue 15] What stage 2 does when a spouse dies is undefined [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1107-1108, 1429, 1465-1474, 1662](../../designs/retirement-planner.md#L1107)
*   **Discrepancy Description:** stage 2 builds `survivor.ts` and step 1 and tests deaths, but `death.ts` is stage 3.
*   **Rationale:** `runPath` behaviour at a target age is unknown in stage 2.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: file 34; stage table.
    *   Change: stage 2 creates `project/death.ts` with `firstDeathTransfer` only, used by step 1. Stage 3 adds same-year deaths, `finalReturn` and `estate`. In stage 2, `runPath` stops after the second death year without a final return, and `afterTaxLegacyNom` is the pre-tax balance total, marked "stage 2: no final return".

### [Issue 16] Normalizing DB pensions with `none` or `fixed` indexing is undefined [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1395, 1428](../../designs/retirement-planner.md#L1395)
*   **Discrepancy Description:** a non-indexed or fixed-rate pension statement amount is nominal; inflating it overstates it.
*   **Rationale:** systematic overstatement of DB income.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified; duplicates part of Critic-5.
*   ***Proposed Edit:***
    *   Location: Accounts (DB), files 25 and 29, test table.
    *   Change: `full`: `lifetimeAnnualToday` and the bridge are today's dollars, inflated by the deflator. `fixed` and `none`: the amounts are nominal, as on the statement, at the start age; `fixed` then grows by `indexRate` each year after the start; `none` stays flat. `normalizeInputs` skips them. Add `db.test.ts` rows for all three.

### [Issue 17] TFSA room, surplus ownership and the conservation identity are not defined [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1436-1437, 1456, 1494, 1658](../../designs/retirement-planner.md#L1436)
*   **Discrepancy Description:** TFSA re-credit and rounding; surplus has no owner; no stated identity.
*   **Rationale:** room and invariants can't be built.
*   ***AI Suggestion:*** PROPOSE FIX (choice C3)
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: Accounts (TFSA), files 30, 32, 38, test table.
    *   Change: apply C3. File 38 states the identity per account and year: start + contributions + yield reinvested − withholding + price return − draws + deposits = end (within `INVARIANT_TOLERANCE`), and for the household: draws + fixed income − tax = spending + deposits − shortfall. Add an `invariants.test.ts` row.

### [Issue 18] Two property tests contradict the design, and the zero-tax test config is undefined [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1673-1675](../../designs/retirement-planner.md#L1673)
*   **Discrepancy Description:** the two-pass split isn't exact; the swap test fails on ties; the zero-tax config can't be built as stated.
*   **Rationale:** CI would fail for design reasons.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified; duplicates ZO-7 and Critic-9.
*   ***Proposed Edit:***
    *   Location: file 57.
    *   Change: the two-pass test asserts that the two-pass household tax is never below the full search's, and that the gap stays within 1% of household tax (a test setting, not a rule value). The swap test skips plans where the two spouses' inputs are identical. The zero-tax config is the bundle with `applyRuleOverrides` setting every bracket rate, surtax rate and Health Premium rate to 0, built in `tests/property/helpers/zeroTax.ts`. List property tests by stage.

### [Issue 19] Test plan rows are missing for stage 2 modules [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 1648-1671](../../designs/retirement-planner.md#L1648)
*   **Discrepancy Description:** no rows for invariants, bisect, workingYear, runPath, read.ts; "convergence for every tax case" is meaningless; the M5 row is in the wrong file.
*   **Rationale:** stage 2 has untested modules.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: file 56 table.
    *   Change: add `invariants.test.ts` (each identity, a broken account), `bisect.test.ts` (converges, reports non-convergence, precision on W), `workingYear.test.ts` (the steps in finding 11), `runPath.test.ts` (row span, `detail` modes, `PlanSummary` totals including M5), `read.test.ts` (`ageTable` ends, `planValue`, rebased values). Change the `yearSolve` row to "converges for the helper couple at spending of $0, $60,000 and $200,000 today"; move the M5 part from `units.test.ts` to `runPath.test.ts`.

### [Issue 20] Coverage enforcement has no switch, and its start is worded two ways [`egm-codebase-details`, `egm-implementation-readiness`, `egm-style`] - Severity: Major
*   **Affected Scope:** [Lines 1078, 1198, 1698](../../designs/retirement-planner.md#L1078)
*   **Discrepancy Description:** CI never sets `ENFORCE_COVERAGE`; two wordings; 70% stated as settled; overlapping globs.
*   **Rationale:** the gate never runs.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`ci.yml:38` runs `npm test -- --coverage` without the flag).
*   ***Proposed Edit:***
    *   Location: files 7 and 11; Verification Plan.
    *   Change: `ci.yml` (Modify, stage 2) sets `ENFORCE_COVERAGE: true` on the unit-test step from the stage 2 tag. Both places say "from the `stage-2` tag: 90% branches for `src/engine/**`; 70% for the rest of `src/` (target pending M3)". The 70% glob becomes `src/{state,ui,worker}/**` so the two don't overlap.

### [Issue 21] The plan does not name existing functions for stage 2 to reuse [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1386, 1421, 1454-1455](../../designs/retirement-planner.md#L1386)
*   **Discrepancy Description:** `incomeTotals`, `personalTax`, `brackets`, `toAnnual`, `checkEntry`, `tax/tables.ts` aren't named in files 24, 28, 32.
*   **Rationale:** risk of a second net-income calculation.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: files 24, 28, 32.
    *   Change: file 28: `bestSplit` calls `personalTax`. File 32: `bracketTopUp` and `earlyRrsp` measure income with `incomeTotals`; the `first_bracket` level is `brackets(ctx, 'federal.tax.brackets')[1].from`. File 24: `overrides.ts` reuses `checkValue` and `toAnnual`.

### [Issue 22] File headings leave out modules their bodies define [`egm-style`, `egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 1375, 1440, 1478](../../designs/retirement-planner.md#L1375)
*   **Discrepancy Description:** files 24, 31 and 36 headings omit files their bodies define.
*   **Rationale:** the file list can't be used as a write list.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: headings of files 24, 31, 36.
    *   Change: file 24 adds `./read.ts` and `./overrides.ts`; file 31 adds `./returns.ts` and names `glide.ts` for `mixForYear` and `placement.ts` for `afterTaxStockShare` (unless S3 cuts it); file 36 names `simulate/plannerSearch.ts` (unless S1 cuts it).

### [Issue 23] File 41 states the Worker's cancel mechanism as settled [`egm-style`, `egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Line 1517](../../designs/retirement-planner.md#L1517), compared with line 1084
*   **Discrepancy Description:** "between runs it checks for a newer revision", but SR1-M2 says a synchronous Worker can't see one mid-run.
*   **Rationale:** the plan states an open question as settled.
*   ***AI Suggestion:*** PROPOSE FIX (choice C4)
*   ***Justification:*** Verified; duplicates Critic-1 and IZO-6.
*   ***Proposed Edit:***
    *   Location: file 41; Components and data flow (live recalculation); Performance; SR1-M2 row.
    *   Change: "When a newer revision is sent, `client.ts` terminates the Worker and starts a new one; results carry their revision, and the store keeps only the latest." The SR1-M2 row keeps only the store part (stage 5).

### [Issue 24] File 13's `AGENTS.md` spec disagrees with the committed `AGENTS.md` [`egm-style`] - Severity: Major
*   **Affected Scope:** [Lines 1254-1266, 1099](../../designs/retirement-planner.md#L1254)
*   **Discrepancy Description:** file 13 omits four committed rules and words the protected-files rule more loosely.
*   **Rationale:** two sources of truth.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified against `AGENTS.md`.
*   ***Proposed Edit:***
    *   Location: file 13.
    *   Change: "(Exists.) The rules are as committed in `AGENTS.md`, in these sections: Values, Protected files, Code, Personal data, Before finishing, Stages. Change that file, not this entry."

### [Issue 25] The Known gaps intro's closing rule and counts are wrong [`egm-style`] - Severity: Major
*   **Affected Scope:** [Line 1045](../../designs/retirement-planner.md#L1045)
*   **Discrepancy Description:** some rows are closed by code or tests, not the document; stale totals; SR1- coverage unclear; `TC-` unexplained.
*   **Rationale:** the gating rule is wrong as written.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:***
    *   Location: Known gaps intro.
    *   Change: "Sources: Stage 9 re-run (2026-11-17, no prefix), focused review 2026-11-18 (`FR-`), focused review 2026-11-19 (`SR1-`), the screen revision (`SR-`), and the tax-case check (`TC-`), all under `docs/reviews/`. Rule: each open Major is closed, in this document or by the code, test or config the row names, before its stage starts." Drop the round totals.

### [Issue 26] The TC-1 row says the entry is unvalidated, but it is validated [`egm-style`, `egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Line 1067](../../designs/retirement-planner.md#L1067)
*   **Discrepancy Description:** stale status and gate.
*   **Rationale:** the row is open for a closed item.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified (`federal.credits.basic_min` validated 2026-11-19).
*   ***Proposed Edit:***
    *   Location: TC-1 row.
    *   Change: `| ~~TC-1~~ | Fixed 2026-11-19: the basic personal amount's reduction at high income uses `federal.credits.basic_min`, validated by the author 2026-11-19 | — |`

### [Issue 27] "Typing stays smooth during runs" cannot be measured [`egm-style`] - Severity: Major
*   **Affected Scope:** [Line 1702](../../designs/retirement-planner.md#L1702)
*   **Discrepancy Description:** subjective criterion next to measured ones.
*   **Rationale:** can't be checked.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. The engine runs in a Worker, so the main thread should not block.
*   ***Proposed Edit:***
    *   Location: Verification Plan (Performance) and Performance section.
    *   Change: "typing stays smooth: no main-thread task over 50 ms while a run is in progress, checked in the Chrome DevTools Performance panel."

### [Issue 28] The `bisect` precision cannot be reached as specified [`egm-implementation-readiness`] - Severity: Nit
*   **Affected Scope:** [Line 1454](../../designs/retirement-planner.md#L1454)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** 32 halvings of $50M leave about $0.012.
*   ***Proposed Edit:*** Location: file 33 and the year solver step 5. Change: "the precision applies to W; `SOLVER_MAX_STEPS` = 40 (enough for $10 billion to $0.01)". `constants.ts` is listed as Modify.

### [Issue 29] Small stage 2 precision gaps [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Nit
*   **Affected Scope:** [Lines 1370, 1426, 1437, 1461, 1675](../../designs/retirement-planner.md#L1370)
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** the reviewer's own recommendation is to fix each point when its file is built; the `first_bracket` row is covered by finding 21.

### [Issue 30] Stage 2 says "all four strategies", but the planner is built at stage 4 [all three] - Severity: Nit
*   **Affected Scope:** [Line 1107](../../designs/retirement-planner.md#L1107)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Verified.
*   ***Proposed Edit:*** Location: stage table, stage 2 row. Change: "`withdraw/*` (the three fixed strategies; `solveYear` rejects `planner_pick` until stage 4)". Moot if S1 cuts the planner (then "three strategies").

### [Issue 31] "Plus two checks", but only one extra check is listed [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1685-1693](../../designs/retirement-planner.md#L1685)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Change "plus two checks" to "plus one check"; add a blank line before `### Verification Plan`.

### [Issue 32] Stale facts about the tooling and config [`egm-codebase-details`] - Severity: Nit
*   **Affected Scope:** [Lines 1122, 1213, 1607, 1671](../../designs/retirement-planner.md#L1122)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** File 1: `.gitignore` already has `test-results/`. File 9: list `ignoreReadonlyClassProperties` and `ignoreArrayIndexes`. File 51: `configCheck` prints counts, and lists keys only with `--strict`. Test table: `configCompare` tests are in `config.test.ts`; drop "may be folded"; add a `configCheck` test row (warning for yield above return).

### [Issue 33] Stage gates and pending decisions are stated as met or decided [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1080, 1106, 1446, 1564, 1691](../../designs/retirement-planner.md#L1080)
*   ***AI Suggestion:*** PROPOSE FIX (stage 1 gate wording); CONTEST (O29); DECLINE (M2, FR-M18)
*   ***Justification:*** Stage 1 gate: say "`federal.json` and `ontario.json` validated", which is what was checked. O29 is decided: the Open Questions table records "Resolved 2026-11-19 (author)" for O29, so "(pending O29)" would be wrong. M2 and FR-M18 have their own gates (stage 5).
*   ***Proposed Edit:*** Stage table, stage 1 gate: "`federal.json` and `ontario.json` validated".

### [Issue 34] Known gaps table: unclear status wording and history [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1047-1097](../../designs/retirement-planner.md#L1047)
*   ***AI Suggestion:*** PROPOSE FIX (part)
*   ***Justification:*** Cheap parts only: the FR-M13 row still says "(draft 2026-11-19)"; the 6% condition is unnamed. Reordering open rows first is part of the editorial pass the Stage 8 report proposes (IZO-5), not this pass.
*   ***Proposed Edit:*** FR-M13: "added 2026-11-19". FR-M9: "the CANSIM V122487 rate is 6% or less (assumed)". Bare "(author)" cells: "decided by the author".

### [Issue 35] Review history and admin guide wording [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1285-1297, 1320-1323, 1351](../../designs/retirement-planner.md#L1285)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** File 16 lists `docs/reviews/2026-11-17/`, `2026-11-18/` and `2026-11-19/`. File 19: "users can change any rule value". Rewrite the probate sentence: "The admin reads Ontario probate from the Estate Administration Tax Act." Put O24, O25, O27 and O31 beside their keys at line 1351.

### [Issue 36] Signatures and readouts are specified unevenly [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1450-1456, 1468, 1490, 1501-1502, 1525-1527](../../designs/retirement-planner.md#L1450)
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** the stage 2 signatures are typed by findings 1, 8, 9 and 11; the rest belongs to stages 4-6 and is fixed when those files are built.

### [Issue 37] The tax fixture and test table wording [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1613-1628, 1644, 1650, 1670-1671, 1707-1709](../../designs/retirement-planner.md#L1613)
*   ***AI Suggestion:*** PROPOSE FIX (part)
*   ***Proposed Edit:*** File 52 heading: "(Exists, stage 0; entered by an agent from TaxTips.ca, spot-checked by the author)". The "How the cases were made" note: "the author re-ran 3 cases by hand (`65-rrif-99k`, `65-high-dividends`, `split-a`), all matching to the dollar". Say "federal tax, Ontario tax and clawback each match within $1". Rename the test table "Test files and their cases". The rest: DECLINE.

### [Issue 38] Word choice and absolute claims [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 1105, 1112-1113, 1132, 1181, 1245, 1575, 1584](../../designs/retirement-planner.md#L1105)
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** wording only; part of the editorial pass (IZO-5).

### [Issue 39] Known gaps row SR1-M1 is wrong about `planning.shapes` [`egm-codebase-details`] - Severity: Nit
*   **Affected Scope:** [Line 1083](../../designs/retirement-planner.md#L1083)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Change "(placeholders, unvalidated until O26)" to "(validated 2026-11-19; O26 resolved)".

### [Issue 40] `tsconfig.base.json` is missing from the file plan [`egm-codebase-details`] - Severity: Nit
*   **Affected Scope:** [Lines 1168-1175](../../designs/retirement-planner.md#L1168)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** File 5 adds `./tsconfig.base.json` (strict options and the `@engine/*` path alias).

## Round 2 (past the re-audit cap, author's choice)

`implementation_readiness_report_r2.md` found 1 Blocker and 14 Majors (new or reopened). The author
chose to continue past the cap without a third review. All 15 were fixed in the design on
2026-11-19, with 22 of the 26 Nits. Nits 1, 2, 19 and 21 are recorded as Known gaps row FR2-N. The
unresolved feature-spec findings of stages 5-8 are recorded as row FR2 (close before stage 3).
