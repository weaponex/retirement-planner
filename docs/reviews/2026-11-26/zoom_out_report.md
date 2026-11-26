# Goldfish Review Report: Stage 5, Initial Zoom Out Review (Stage A, Assets)

**Target:** `E:\Documents\Projects\retirement-planner\docs\designs\retirement-planner.md` (lines 1-2617; FeatureRange 1-1655, DetailedRange 1656-2617)

**Standard:** `C:\Users\charlie\.claude\plugins\cache\egm\egm\0.1.1\resources\document_standards\zoom-out-standard.md`

**Focus:** the Stage A (Assets) amendment: G11-G15, the Assets non-goals, OA1-OA7, CUJ 7, A2-A10, alternatives Z-AQ, BA-1 to BA-7, and SA1-SA30.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed (1 Blocker, 4 Major, 6 Nit, plus 2 minor notes) |
| `egm-inventive-catalyst` | completed (6 Major, 1 Nit) |

Both reviewers passed the context check: the objective and its reasons are clear (lines 24-28, 67-77, G11-G15). Both found the stepped asset module (A2, line 277) a sound resolution of the compile-versus-solver choice (Alternatives AA and AB).

**Merged totals after deduplication:** 1 Blocker, 7 Major, 9 Nit (17 findings).

Where the two reviewers raised the same issue, the findings are merged below and the higher severity is kept. One reviewer premise was checked against the code and corrected (see N1).

## Prioritized Findings (Blockers -> Major -> Nits)

### B1. The migrated home does not reproduce the v1 numbers, so G15 and the "same numbers" claim fail - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out` (Blocker), `egm-inventive-catalyst` (F4, Major; F3, adapter idea)
* **Affected Scope:** G15 (line 106); Data contracts note on `estate.homeValueNom` (line 1067); Assets in the year, steps 7-8 (lines 689-698); Death and estate step 3 (line 717); Units (lines 375, 391); Persistence acceptance test (line 1085); property test (line 1159); SA6, SA7, SA23 `migrate.test.ts` (line 2534).
* **Discrepancy Description**:
  * In v1, `src/engine/project/death.ts:106` values the home as `homeValueNom x deflator(yearIndex)`, which is (1+i)^t in the second-death year t.
  * Under Stage A, each asset starts at `valueToday` on January 1, grows at step 7 every year (including the first), and is deemed sold at its end-of-year value at step 8. That is (1+i)^(t+1), one more year of inflation (about 2%) in the estate, probate and legacy.
  * The protected reference plan has a $650,000 home (`tests/fixtures/reference-plan/inputs.json:124`). So the acceptance test "a migrated v1 plan gives a `Result` equal to the v1 result" (line 1085), the matching property test, and G15's "identical results" will all fail.
  * The engine is also asked to keep two permanent home models (the v1 `homeValueNom` path and `realAssets`) and accept `schemaVersion: 1 | 2`, justified by this equivalence. "Keep two paths and assert they match" has no single source of truth.
* **Rationale & Recommendation**: This contradiction will stop the build at step 2, so the author must decide before then. Options:
  1. Accept the one-year difference. Restate G15 as "identical apart from the home's value at the second death", drop `estate.homeValueNom` from the engine so there is one home path, and record the expected difference in the reference test (the fixture stays unchanged).
  2. Keep v1 numbers by construction: add one adapter in `normalizeInputs` (engine-side, not `state/persistence/migrate.ts`, to respect the layer boundary) that turns a legacy home value into a `realAssets` entry. Pick a timing convention for it (start-of-death-year value, or growth from the end of year 0) that gives equality, and say whether it applies to all assets. Keep it consistent with the AR2-R1 rule that year-end balances use the next year's deflator (line 375).
  3. Value every deemed sale at its start-of-year value. This keeps v1 numbers but disagrees with how year-end balances are shown.

  Whatever is chosen, delete the "produces the same numbers" sentence at line 1067 and state whether the engine keeps one home model or two. Build the second reference plan against the chosen convention.

### M1. A8 forks the working-year cash flow, and an empty field leaves asset flows undefined (bringing back rejected Alternative AF) - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`, `egm-inventive-catalyst` (F1)
* **Affected Scope:** G14 (lines 98-105); A8 (line 282); A9 (line 283); still-working spouse (line 656); Working years (lines 701-707); Goal 1 (lines 980, 1068, 1278); invariants (line 1153); Alternative AF (lines 1487-1491); SA14.
* **Discrepancy Description**:
  * `workingYear.ts` gets two permanent branches, chosen by whether "living costs while working" (`workingMonthlyToday`) is empty. The still-working-spouse rule in a retired-household year is a third rule.
  * Line 701 says working years change only when that field is entered. New v2 plans start with it empty (A8), so for a new user with assets, nothing defines what happens in working years to mortgage payments, asset costs, purchases, rent or sale money. By the text, "pay covers" them: that is Alternative AF, rejected at line 1491. Rent and sale money may be dropped altogether.
  * Goal 1's meaning depends on the same optional field. Typing one amount moves the start of `yearsTotal` from the first retirement to the plan start, and the change summary reports a change of definition as a change of result. Line 980 still says Goal 1 counts only from the first retirement, while line 1068 makes it conditional.
  * A working-year gap is drawn only from non-registered savings and then the TFSA (line 706), never the RRSP. A couple with a large RRSP and empty other accounts shows a purchase shortfall that the retired-year solver would have funded.
* **Rationale & Recommendation**: A compatibility shim for G15 has become permanent product behaviour with an unspecified case in the middle. Two options:
  1. Narrow: apply the old rule only when the plan has no asset flows before the first retirement (true of every migrated v1 plan), and make "living costs while working" required by readiness once any asset has costs, a mortgage, rent, a sale or a purchase in a working year.
  2. Better: one year cash-flow pipeline with a pluggable living-cost source: `explicit(amount)` or `residual` (pay after tax less set savings is consumed, today's rule). Asset flows always go through the pipeline, and gaps are funded by the same strategy-ordered draw the retired solver uses, with the working tax function passed in. Keep the v1 routing of the after-tax yield to non-registered in `residual` mode and gate the protected reference plan on it. Reconcile the timing of user contributions (old rule: year end, after price returns; new flow: unstated). Give Goal 1 one definition.

  Cost of option 2: a larger refactor of `project/workingYear.ts` inside Stage A, with regression risk to the reference plan, and some bisection cost in working rows.

### M2. A purchase shortfall puts unpaid-for property into the legacy and probate base - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst` (F2)
* **Affected Scope:** G13 (line 97); year-solver step 5 (lines 681-684); working years step 4 (line 706); `purchaseShortfallNom` (line 1061); Results (line 1278); Alternative AJ (lines 1511-1515).
* **Discrepancy Description**: The purchase always happens and the gap is labelled. But the asset enters state at full value, the shortfall is charged to purchases first (so spending can show as covered that year), and the unfunded amount is never repaid. The after-tax legacy (Goal 2) and the probate base therefore include property no money paid for. Both headline goals lean optimistic in exactly the case the user most needs to see, and the invariants pass only because the shortfall is defined as a balancing item.
* **Rationale & Recommendation**: Record the unfunded part as a "purchase gap" liability on the asset (interest-free or at the asset's mortgage rate). Repay it first from that asset's sale proceeds and deduct it from the estate at the second death. It is not a legal encumbrance, so it must not reduce the AD22 probate base. At minimum, deduct the cumulative purchase shortfall from the after-tax legacy. Cover it in the reference-plan-assets fixture and add an invariant.

### M3. Large asset income in working years is taxed at one flat marginal rate - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst` (F5)
* **Affected Scope:** working marginal rate (lines 654-656); Working years step 5 (line 707); G12 (lines 92-96); gross pay AR-H5 (lines 883-885, 1196); new tax cases (line 1169); SA28.
* **Discrepancy Description**: The flat `workingMarginalRate` was accepted for small amounts (yield, rebalance gains). Stage A pushes cottage or rental sale gains, rent and rental losses through it. The design's own example has a ~$680k gain (~$340k included), which crosses several brackets, the surtax and, after 65, the OAS clawback. G12 ("correct tax on assets") then holds only in retired years, and the clawback tax case at line 1169 tests only that path.
* **Rationale & Recommendation**: Reuse the with-and-without pattern the engine already uses for the final return (line 716) and the year-one sale (line 979): tax = `personalTax(pay + asset income + other) - personalTax(pay + other)`. The income is fixed, so there is no bisection, just two extra calls per working year with assets. Keep the flat rate for spouses who entered a marginal rate instead of gross pay, gate the switch on asset income so the reference plan keeps its path, and add a working-year tax fixture.

### M4. The asset shortcuts are said to "compile to a plain sale and purchase", but nothing compiles them - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** A3 (line 278); `RealAssetInput` (lines 1038-1048: `owned`, `sale`, `downsize`, `replaceEveryYears`); step 0a (lines 663-664); step 0c (lines 665-671); SA10 `step.ts` endOfYear replacement scheduling; `RealAssetState.nextReplaceYear`.
* **Discrepancy Description**: No component is named as doing the compiling. The contract keeps four separate event inputs, and the run handles each in its own step (0a for first-death sales, 0c for sales, downsizes and replacements, endOfYear for replacement scheduling). It is not said whether a downsize's new home keeps the same asset id (value, cost and mortgage reset) or is a second asset that counts toward the cap of 6; the mockup shows one row. Every event year is known before the run (fixed death ages, input intervals), the same argument the design accepts in Alternative AA.
* **Rationale & Recommendation**: Each trigger adds a path through `step.ts` and a test matrix. State that `normalizeInputs` turns each asset's inputs into one ordered list, `events: { year, kind: 'sale' | 'purchase', priceNom, mortgage? }[]`, covering purchase, sale, sale at the first death, downsize and each vehicle replacement. `startOfYear` then applies this year's events, `nextReplaceYear` leaves the state, and a downsize keeps one id and one row.

### M5. The Spending holds store derived state in the plan file - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`, `egm-inventive-catalyst` (F6)
* **Affected Scope:** "One store" principle (line 327); A5 (line 280); A10 (line 284); `heldForAssets` and `assetCostsExcluded` (lines 1029-1031, citing AD14); Spending tab holds (lines 1268-1269); SA18 `setAssetCostHold()`.
* **Discrepancy Description**: The store writes $0 into categories, copies the old amounts into a new persisted field, and recomputes through an explicit action when assets change. Whether a category is held is a pure function of the assets' cost fields. Storing it invites silent desyncs on asset edits, removal, undo, import and migration, and the A5 tick has no link to the cost lines it vouched for, so it stays on after new costs are added. The spending need feeds both headline goals.
* **Rationale & Recommendation**: Never change the user's category amounts. Derive "held" categories in one pure function (for example `effectiveSpending(inputs)`) in the existing draft-to-`PlanInputs` step (`readyToRun` already returns `r.inputs`, `src/state/store.ts:116-122`), using one category-to-cost mapping table that includes A10's insurance rule. Put the mapping in an engine module that the state layer imports. The Spending tab shows "entered" against "counted" from the same derivation. Drop `heldForAssets` and `setAssetCostHold()`. Store the A5 tick with a fingerprint of the covered cost lines so it clears itself when they change. Have the change summary name a hold when one changes the need.

### M6. The amendment's decision ids cannot be resolved from the design - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** the amendment as a whole: "AD" appears 51 times (AD2-AD23) in G12-G15, A8, units and alternatives; AR1-AR9 in OA2-OA6, G10 ("AR3") and SA2; prefix legend (lines 1660-1666); decision table starting at A2.
* **Discrepancy Description**: AD1-AD23 exist only as the numbered list at `concepts_brief.md` lines 365-401, which never calls them "AD", and the design never defines the prefix. "AR2" in OA2 means brainstorm recommendation 2, while "AR2-S1", "AR2-L1" and similar mean the author's second stage 5 review. The legend does not cover A, AD, AR, OA, BA or SA. A1 and A6 are missing from the decision table without explanation.
* **Rationale & Recommendation**: The design calls itself the one master spec (SA1), and SA26 requires a separate session to build the second reference plan "from this amended design only". Key rationale (AD15, AD16, AD17, AD20, AD22) cannot be followed by that reader. Add the prefixes to the legend (for example "AD*n* = Assets decision *n* in concepts_brief.md, 'Assets tab (amendment)'"), rename the brainstorm recommendations (for example "BR*n*") so they don't clash with "AR2-", fold the AD rules the design depends on into the A table or link each one, and note why A1 and A6 are absent.

### M7. Working-year purchase gaps never draw on the RRSP - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst` (part of F1, split out here because it stands even if A8 stays)
* **Affected Scope:** Working years step 4 (line 706).
* **Discrepancy Description**: A working-year gap is funded only from non-registered savings, then the TFSA. A working couple with a large RRSP and empty other accounts gets a purchase shortfall the retired-year solver would have funded, which then flows into M2.
* **Rationale & Recommendation**: Either fund working-year gaps with the strategy-ordered draw (with the working tax function, as in M3), or state the restriction as a deliberate rule, explain it on the Results screen, and add it to the Known gaps (BA list).

### N1. Kept v1 save, `rp.plan.v2` key and migrate-on-load protect saves that cannot exist yet - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out` (Nit), `egm-inventive-catalyst` (F3, Major)
* **Affected Scope:** Persistence (lines 1071-1085; lines 1077 and 1084 say the same thing twice); risk row "Schema change after a rollback" (line 1603); Alternative AQ (lines 1553-1557); stage order (line 1701); file 43 (lines 2154-2160); SA7, SA8; Stage A manual verification (line 2601).
* **Discrepancy Description**: Autosave (`src/state/persistence/storage.ts`) is a stage 7 file built after Stage A, so no `rp.plan.v1` save has ever been written and there is nothing to keep or migrate on load.
  * Synthesizer check: the inventive-catalyst reviewer also said export and import do not exist yet, so no v1 plan file can exist. That part is wrong. `src/state/persistence/exportImport.ts` exists with `EXPORT_SCHEMA_VERSION = 1` and is used by `src/ui/App.tsx`. v1 exports can therefore exist, and migration on import is justified. This is why the merged severity is Nit, not Major.
* **Rationale & Recommendation**: State that autosave starts at v2 under one key and that the migration runs on import only. Delete the duplicate bullet. Keep the rollback-key rule as a general rule for later schema changes if wanted. Check that AQ's rationale and the line 2601 manual check describe the import path that exists today.

### N2. The cap of 6 assets is justified by an unmeasured speed cost - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`, `egm-inventive-catalyst` (F7)
* **Affected Scope:** A4 (line 279); asset card note (line 1265); Alternative AA cons (line 1460); Alternative AP (lines 1547-1551); Performance (lines 1113, 1116); SA30 (lines 2587-2590).
* **Discrepancy Description**: Stepping six assets is a few arithmetic steps per year, outside the bisection. The split search, the 40 bisection steps and the tip count drive the 22-26 ms runs, and the tips already exceed 2 s for 45-year plans before assets. AA was also rejected mainly over a "sell an asset when money runs out" rule that the design itself rules out (line 1265).
* **Rationale & Recommendation**: Justify 6 as a screen-layout and test-scope limit, and leave speed to the SA30 measurement. If speed is short later, memoize the asset timeline per run behind A2's unchanged API (key on asset inputs, death years, inflation), but not before SA30 shows a need.

### N3. SA13 changes `placeSurplus` when the existing signature already covers the need - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** SA13; step 6 (lines 685-688).
* **Discrepancy Description**: `src/engine/withdraw/surplus.ts:47` already takes `shares: [number, number]` and places each owner's share against that owner's TFSA room. Sale money to the seller plus the rest by usual shares is just per-owner totals.
* **Rationale & Recommendation**: Drop the "optional list of parts". Compute blended shares in `yearSolve.ts` and pass them in one call.

### N4. Unclear which module owns the asset handover at the first death - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** A2 (line 277); SA5; SA10; SA16.
* **Discrepancy Description**: SA10 puts the first-death handover in `assets/step.ts startOfYear`; SA16 lists it under `death.ts`. A2 and the new AGENTS.md rule (SA5) say only `src/engine/assets/` changes asset state.
* **Rationale & Recommendation**: State that `death.ts` calls `assets.startOfYear` or `assets.atSecondDeath` and never changes `realAssets` itself.

### N5. Parts of the `assets/` breakdown are code-level or speculative - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** SA10.
* **Discrepancy Description**: `ownership.ts` holds two one-line helpers (`ownerShares`, `byOwner`). The `depreciating` flag in `kinds.ts` has no reader: growth is always user-entered and a vehicle just uses negative growth.
* **Rationale & Recommendation**: Fold the helpers into `kinds.ts` or `step.ts`, and drop `depreciating` until a rule reads it.

### N6. The cottage designation comparison assumes a single cottage - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** line 729; `Result.estate.cottageDesignation?: { assetId, ... }` (line 1064); non-goal at line 132.
* **Discrepancy Description**: The comparison reruns the final return, but the result is undefined with two cottages or a taxable "other" property. It is also a what-if inside a feature whose non-goal excludes choosing the principal residence.
* **Rationale & Recommendation**: Define it for the cottage with the largest gain (or the first by id), or limit it to plans with exactly one cottage, and say so on the Estate line.

### N7. Goal 1's year range is stated two ways - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** line 980 versus line 1068.
* **Discrepancy Description**: Line 980 still says Goal 1 counts only from the first retirement; line 1068 makes the range depend on the living-costs field.
* **Rationale & Recommendation**: Align line 980 with whatever M1 settles.

### N8. The screens decision omits the Assets tab - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** line 264.
* **Discrepancy Description**: The screens decision lists the old six screens without Assets.
* **Rationale & Recommendation**: Add the Assets tab and its position in the tab order.

### N9. Duplicate persistence bullet - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** lines 1077 and 1084.
* **Discrepancy Description**: The two bullets state the same rule about the v1 save and the new key.
* **Rationale & Recommendation**: Keep one (folded into the N1 fix).

## What holds up (both reviewers)

* A2's stepped asset module resolves the compile-versus-solver choice well, and Alternative AB (stepping assets inside the year solver) was rightly rejected.
* The `realAssets` code name keeps property apart from the existing asset classes (stocks, bonds, cash).
* Assets stay out of placement, the mix and `available()`.
* Moving the encumbrance deduction into the Ontario jurisdiction module (SA16) puts it in the right layer.
* No config keys are added.
