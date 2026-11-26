# Goldfish Review Report: Stage 9 (Implementation Readiness Test)

**Target:** `docs/designs/retirement-planner.md` (lines 1656-2617; DetailedRange only)
**Focus:** the Stage A (Assets) plan: Known gaps BA-1 to BA-7, row A of the stage table, and "Stage A (Assets) files" (Stage placement, SA1-SA30, Stage A verification).
**Question tested:** can an agent build Stage A from this plan alone without making impactful decisions, and does every file, function and line reference match the codebase?
**Date:** 2026-11-26

## Reviewer Status

| Reviewer | Standard | Status |
| --- | --- | --- |
| `egm-implementation-readiness` | `resources/document_standards/implementation-readiness-standard.md` | completed |
| `egm-codebase-details` | `resources/document_standards/implementation-readiness-standard.md` | completed |
| `egm-style` | its persona's audit vectors, plus `AGENTS.md` | completed |

**Verdict:** not ready. An implementing agent would have to decide several things itself:
- the normalized asset types;
- where asset events hook into the year;
- the carried-loss path;
- the probate formula;
- the result fields for the new breakdown rows;
- the readiness handling of the new optional fields.

The step order also cannot stay green from one step to the next. None of the three reviewers raised a new Blocker. The earlier Blocker B1 (zoom-out) and Majors zoom-out M1, critic M1 and M6, and intermediate F1 still stand and are not repeated here.

**Counts after deduplication:** 0 Blocker, 24 Major, 20 Nit. The reviewers reported 31 Majors and 32 Nits before deduplication (style 6/19, implementation readiness 11/4, codebase details 14/9).

**What the synthesizer checked itself:**
- `src/ui/App.tsx:220-221`: `default: return <SettingsScreen />` is there (finding M18).
- Line 2457 has no × 12 on `workingMonthlyToday` (finding M7).

**Claims in the plan that hold (codebase details):**
- Every file SA6-SA29 marks "Modify" exists at the path given.
- These names exist where the plan says: `TabId` (store.ts:18), `TABS` (App.tsx:22), `TAB_NAMES` (MissingSections.tsx:8), `tabFor` (ResultsTab.tsx:50), `EXPORT_SCHEMA_VERSION` (exportImport.ts:10), `IncomeBySourceNom` (types.ts:426), `estate.homeValueNom` (types.ts:251), the four category ids (categories.ts:15-36), `SOURCE_COLOURS` and `BALANCE_COLOURS`.
- The claim at line 1057 that the reference test ignores `YearRow.realAssets` is true.
- `stage-5` is tagged.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### Blockers

None new.

### Major

### M1. The step order cannot stay green, and half-wired builds deploy - Severity: Major
* **Reviewer Lens:** `egm-style`, `egm-implementation-readiness`
* **Affected Scope:** Stage placement, line 2344 (the "typecheck passes at the end of each step" rule) and lines 2344-2354; SA6, SA7, SA8, SA9 (step 2); SA18 (step 7); SA20, SA21 (step 8); SA23 (line 2534)
* **Discrepancy Description**:
  * **Typecheck breaks at step 2.** SA6 adds the required fields `PlanState.realAssets`, `YearRow.realAssets` and `assetCashInNom` in step 2. The `const row: YearRow = {` literals (yearSolve.ts:598, workingYear.ts:242) and `initialState` only fill them in steps 3-4.
  * **Typecheck breaks at step 7.** `TabId` gains `assets` in SA18 (step 7), but `TAB_NAMES: Record<TabId, string>` (MissingSections.tsx:8) gains its entry only in SA21 (step 8).
  * **Tab links are in the wrong file.** SA9 (step 2) says readiness "links each to the Assets tab", but `readiness.ts` has no tab links. Paths map to tabs in `tabFor` (ResultsTab.tsx:50), which is SA20 (step 8).
  * **A half-wired migration ships.** Step 2 wires the migration into Import, sets `EXPORT_SCHEMA_VERSION` to 2 and makes `defaults.ts` write v2. The engine reads `realAssets` only from steps 3-5, so in between, an imported v1 home is silently left out of the legacy and probate.
  * **A test cannot pass yet.** SA23's "a v1 test plan's `Result` equal after migration" cannot pass at step 2.
  * **Those builds go live.** `AGENTS.md` says every green push to `main` deploys, so these in-between builds reach the public site.
* **Rationale & Recommendation**: An agent that follows the order hits a red step it was told cannot happen, and either stubs fields or reorders the work without being told to.
  * Add the new fields as optional (or with stub values) until the step that fills them, or move each type change to the step that fills it.
  * Put `TabId` and `TAB_NAMES` in one step, and move the tab-link wording from SA9 to SA20.
  * In step 2, build only the types and a pure `migrateV1toV2` with structural tests. Wire Import and the v2 export after step 5, and move the `Result`-equality test there. Or state that pushes are held, or the feature is hidden, until `stage-assets`.

### M2. The input types across schema versions are undecided, and `NormalizedInputs` is not extended - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`, `egm-style`
* **Affected Scope:** SA6 (line 2389), SA7, SA11; Data contracts lines 1023-1067
* **Discrepancy Description**:
  * **The version type is stated three ways.** SA6 says `schemaVersion: 1 | 2`; the contract says `PlanInputs.schemaVersion: 2`, drops `estate.homeValueToday` and makes `realAssets` required; the code has `schemaVersion: 1` (types.ts:164).
  * **The protected fixture is v1 and skips the migration.** `tests/fixtures/reference-plan/inputs.json` is v1 with no `realAssets`. `referencePlan.test.ts:67-69` and `couplePlan.ts:17-130` (used by every property test) pass raw v1 inputs straight to `normalizeInputs`, so `inputs.realAssets.map(...)` would throw.
  * **Old tests still set the removed field.** `homeValueToday` is still set in `tests/property/legacy.test.ts:13`, `compare.test.ts:172` and `death.test.ts:137`.
  * **`NormalizedInputs` (types.ts:235-254) has no slot for the new data.** It has no `realAssets` and no normalized working-monthly field. The plan does not say where the resolved growth rate, `costNom` or the nominal mortgage fields live.
  * **One return type does not exist.** `PlanDraftV2` (SA7) is defined nowhere: `PlanDraft` is derived from `PlanInputs` (draft.ts:18). The `Draft` helper's literal branch (draft.ts:6-15) only keeps `1` non-empty.
* **Rationale & Recommendation**: The implementer would have to design the core input types. This builds on zoom-out B1, critic N2 and comprehension #6, which cover the numbers, not the types. It also answers comprehension #6: the protected plan does not run through the migration.
  * Choose either a tagged union `PlanInputsV1 | PlanInputsV2`, or one type with optional `realAssets` and `homeValueToday` plus a rule for when both are set.
  * Add a `NormalizedRealAsset` type (growth rate, `valueNom`, `costNom`, `priceNom`, mortgage) and `spending.workingMonthlyNom?` to the contract and SA6.
  * State that `normalizeInputs` treats a missing `realAssets` as `[]`.
  * Use `PlanDraft` (derived from the v2 type) and extend `Draft`'s literal branch to `1 | 2`.

### M3. SA12 hooks asset events into a function that cannot carry them, and the module calls have no usable signatures - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`, `egm-implementation-readiness`, `egm-style`
* **Affected Scope:** SA10 (line 2428), SA12 (line 2443); lines 355-359, 1051-1055
* **Discrepancy Description**:
  * **The hook is in the wrong function.** SA12 says `startOfYear.ts` calls `assets.startOfYear` "after the first-death transfers". But `startOfYear(state, ctx): PlanState` (solver/startOfYear.ts:102) takes no inputs, returns only a state and never sees the transfer. The transfer runs in `prepareYear` (yearSolve.ts:100-101), which `solveYear`, `workingYear` (workingYear.ts:80) and `yearOneSaleTax` (compare.ts:114) all share.
  * **The state holds no events.** `RealAssetState` has no sale year, purchase year, downsize or "sell at the first death", so `startOfYear(state, ctx)` cannot apply events.
  * **The types are missing.** `RealAssetYear` and the return types of `income`, `endOfYear` and `atSecondDeath` are undefined.
  * **Not-yet-bought assets are unrepresented.** The plan does not say whether such an asset is in `initialState`, or whether `YearRow.realAssets` has a zero entry before a purchase or after a sale. That decides which CSV columns exist.
  * **One call has no caller.** No entry says who calls `assets.income`.
* **Rationale & Recommendation**: Following SA12 forces an unplanned signature change and breaks `tests/unit/startOfYear.test.ts`, which is not listed. This builds on zoom-out N4 and M4, critic M6, intermediate F6 and comprehension #15, which cover module ownership; the code hook and the signatures are new.
  * Call `assets.startOfYear` in `prepareYear` right after line 100, add a `realAssetYear` field to `PreparedYear`, and state that `startOfYear.ts` is unchanged.
  * Give the TypeScript signatures, with an inputs or events argument, and both representation rules.
  * Name the caller of `assets.income`.

### M4. Asset gains never update the carried-forward capital loss - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA12, "`incomeAssembly.ts` adds … asset gains to realized gains"
* **Discrepancy Description**:
  * `assembleIncome` (incomeAssembly.ts:45-69) only computes the year's taxable gain.
  * The carried loss is updated separately, from `gainsBy` (rebalance plus draw gains): yearSolve.ts:547-552 and workingYear.ts:95, 203-206.
  * The same `gainsBy` feeds `realizedGainsNom` (yearSolve.ts:588, workingYear.ts:234), and `finalReturn` reads `carriedLossNom` (death.ts:85).
  * Asset gains added only in `incomeAssembly` therefore never use up a carried loss. An asset loss never carries forward, so the same loss offsets gains year after year.
* **Rationale & Recommendation**: The tax result is wrong, and the second reference plan's loss year would expose it.
  * State that asset gains are added to `gainsBy` in both files, and so to `realizedGainsNom`, and that `assembleIncome` receives them through its existing `realizedGains` argument.
  * Add a test: an asset loss in year t reduces a non-registered gain in year t+1.

### M5. Held assets do not grow or amortize in working years - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA12, SA14
* **Discrepancy Description**:
  * SA12 places `assets.endOfYear` only in `yearSolve.ts`.
  * `workingYear.ts` applies its own price returns (workingYear.ts:172), and SA14 says the empty-field path "runs unchanged".
  * So in every A8 plan, asset values and mortgages stay frozen until the first retirement.
* **Rationale & Recommendation**: This is a concrete code omission behind zoom-out M1: new detail, not a new issue. State that `workingYear.ts` calls `assets.endOfYear` after its price returns, in both paths.

### M6. SA11's "plan-start dollars" clashes with the defined units, and the price growth may be applied twice - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA11 (line 2435); diagram line 347; lines 376, 391, 670
* **Discrepancy Description**:
  * Line 376 defines today's dollars as the plan start year's dollars, so "converts … to plan-start dollars" reads as a no-op.
  * Lines 391 and 670 grow a purchase price to its purchase year, yet SA11 lists prices among the values converted to plan-start dollars.
  * So it is unclear whether `normalizeInputs` or `assets.startOfYear` grows the price, or whether both do (a double count).
* **Rationale & Recommendation**: SA4's own rationale is that the prototype failed on mixed units. Write: "converts every asset `…Today` field to nominal dollars of the year it applies to (plan-start values; a purchase or downsize price in its purchase year)". Name the one function that grows the price.

### M7. The monthly living-cost field is used as a yearly need with no × 12 - Severity: Major
* **Reviewer Lens:** `egm-style` (confirmed by the synthesizer at line 2457)
* **Affected Scope:** SA14 (line 2457); line 705
* **Discrepancy Description**:
  * The field is `workingMonthlyToday`, but SA14 says `spendingNeed` "returns the working-year need × the inflation factor", and line 705 says the same. Neither multiplies by `MONTHS_PER_YEAR`.
  * "0 when the amount is empty" does not name the amount.
* **Rationale & Recommendation**: Read literally, the need is one-twelfth of what it should be, the kind of units defect SA4 warns against. Write: "need = `workingMonthlyToday` × `MONTHS_PER_YEAR`, normalized and × the inflation factor (× the survivor percentage after a death); 0 when `workingMonthlyToday` is empty".

### M8. Asset cash in and out, and the new invariants, are not written as equations - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** step 5 (lines 677-680); SA15 (line 2462); checks at lines 1149-1153
* **Discrepancy Description**:
  * **Rent.** It is not said whether "rent" in cash in is gross or net of `otherExpensesYearToday`. One reading counts the expenses twice; the other leaves them out.
  * **The household identity.** It is stated in words only, and the sign of `purchaseShortfallNom` in it is not given.
  * **The mortgage identity.** "start + interest − payments − payoff = end" has no term for a new mortgage at a purchase or downsize.
  * **Row fields.** `YearRow.realAssets` has no start, new or payoff mortgage fields, so `checkYear` cannot evaluate the identity.
* **Rationale & Recommendation**: This partly overlaps critic M1 on purchase financing; the identity terms and row fields are new. Write cash in, cash out and both identities as equations, and add `mortgageStartNom`, `mortgageNewNom` and `mortgagePayoffNom`, or say how they are derived.

### M9. A rental loss larger than the owner's other income has no rule - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** lines 672-676; SA12 (line 2444); Known gaps
* **Discrepancy Description**:
  * In a retired year, negative net rent can make taxable income negative.
  * `bracketTax` floors each band at 0 (tax/tables.ts:9), so the excess is silently lost.
  * Nothing says whether that is intended or whether it becomes a non-capital loss carried forward, or how `bestSplit` treats negative income.
* **Rationale & Recommendation**: The separate session building the second reference plan could choose differently and fail the $1-per-cell match. Critic M3 covers working years only.
  * State the rule (for example, "the excess is lost; non-capital loss carry-forward is not modelled") and add it as a BA-8 row.
  * Add a unit test and a tax case.

### M10. There is no field table per asset kind, and no defaults for a new asset - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** SA8 ("each kind's required fields and ranges"), SA10 `kinds.ts`, SA18 `addRealAsset(kind)`, SA19
* **Discrepancy Description**:
  * Not said: which cost fields each kind has, whether a home or cottage can have rent, whether every kind can be bought later, and which fields readiness requires for each kind.
  * Not said: what `addRealAsset` fills in (owner, growth mode, `owned: 'now'`, default name) or the id rule. Accounts use the first free n (store.ts:175-180).
* **Rationale & Recommendation**: The schema, readiness, the editor and the second reference plan all depend on this. Comprehension #5 covers only the vehicle. Add a kind × field table (shown, required, allowed) and the defaults.

### M11. Readiness will reject the new optional fields, and its paths point at array indexes - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA9 (`readiness.ts`, `draft.ts` bullets)
* **Discrepancy Description**:
  * `Draft<T>` turns optional numbers into `number | null` (draft.ts:7-15), and `planSchema` `.optional()` rejects `null`.
  * Readiness clears such fields only through `fillUnused` and `EMPTY_MEANS_NONE` (readiness.ts:20-66). Without them, an empty `workingMonthlyToday` (the A8 default for every new and migrated plan) leaves the plan "Incomplete" for ever. So does a home with no `originalCostPaid`, or an asset with no mortgage or rent.
  * `inputPath` (readiness.ts:69-75) and `indexFor` (draft.ts:28-34) map ids for `accounts` only, so missing-detail labels would read `realAssets.0.…`.
* **Rationale & Recommendation**:
  * List the asset and spending fields where empty means "not used", and state how `fillUnused` clears them.
  * Extend `inputPath` and `indexFor` to `realAssets`.

### M12. SA8 leaves out Import's own shape check and does not say which version number decides - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`, `egm-implementation-readiness`
* **Affected Scope:** SA8 (lines 2400-2402)
* **Discrepancy Description**:
  * `importPlan` validates against its own `draftShape` with `schemaVersion: z.literal(1)` and no `realAssets` (exportImport.ts:38-66), separate from `planSchema`.
  * There are two version numbers: the envelope's (exportImport.ts:23, 85) and `inputs.schemaVersion`.
  * Also unstated: the migrated home's `id` and `name`, and whether `estate.homeValueToday` is deleted.
* **Rationale & Recommendation**: After the migration every import would fail `draftShape`. Zoom-out N1 and comprehension #3 cover whether Import exists, not this check.
  * Add `draftShape` to SA8, with `literal(2)` and a passthrough `realAssets` array.
  * State that the refusal of newer versions reads the envelope's number, that `migrateV1toV2` reads `inputs.schemaVersion`, and that export writes 2 in both places.
  * Give the migrated home's id and name (for example `home-1`, "Home").

### M13. The plan never says where end-of-plan property, mortgages and asset gains sit, and new keys would break the protected reference test - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** SA6, SA16, SA17 (lines 2389, 2470, 2478); SA27
* **Discrepancy Description**:
  * `estateSummary` reads only the last row's `estate` (compare.ts:122-139), yet `propertyToday` and `mortgagesToday` have no source field.
  * The reference CSV header is built from `Object.keys(rows[0].estate)` and `Object.keys(rows[0].spouse[0])` (referencePlan.test.ts:35-37, 47). Any new key on `EstateYear` or `SpouseYear` breaks the protected test, which SA27 says stays unchanged.
  * Also open:
    * whether deemed asset gains go into `deemedGainsNom`, documented today as non-registered only;
    * whether `homeToday` stays, and whether it is 0 for a v2 plan (otherwise the home may be counted twice);
    * the estate identity that replaces "balances + home − tax − probate = legacy" (compare.test.ts:177, `results/README.md`).
* **Rationale & Recommendation**:
  * State: "`EstateYear`, `SpouseYear` and `AccountYear` gain no keys; property and mortgages come from the last row's `realAssets[*].endNom` and `mortgageEndNom`". Otherwise, name the new fields and say how the reference test leaves them out.
  * State the new identity and the rules for `homeToday` and `deemedGainsNom`.

### M14. Assets are not handed over when both spouses die in the same year - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA10 `atSecondDeath`, SA16; step 8 (line 694)
* **Discrepancy Description**:
  * For same-year deaths, `secondDeath` calls `transferAccounts` (death.ts:129-131), which moves accounts only.
  * The first-dying spouse's sole assets, and their half of joint assets, therefore drop out of the deemed sale, the final return and probate.
  * Same-year deaths are already a tested case.
* **Rationale & Recommendation**: State that `secondDeath` applies the asset module's handover before `atSecondDeath` for same-year deaths, and add the case to SA24.

### M15. The probate change has no signature, and its formula is incomplete - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`, `egm-style`
* **Affected Scope:** SA16 (line 2471); SA3; line 728
* **Discrepancy Description**:
  * Today the final-return tax is subtracted, and the base floored at 0, before the call: `max(0, nonreg + homeNom − finalReturnTaxNom)` (death.ts:114-115). `ontarioProbate` takes one number (ontario.ts:99).
  * The new breakdown (non-registered, real property, real-property mortgages, other assets) has no field for the tax.
  * So these are all left open: the order of the mortgage deduction, the tax deduction and the floor; whether a mortgage is capped at its property's value; and how an `other` asset is marked as real property (`otherUse` says only personal or investment).
  * `death.test.ts:143, 150-151` calls `probate(number)`, and `jurisdiction/README.md:22` documents the old signature.
* **Rationale & Recommendation**: Each choice gives a different probate figure.
  * Give the signature, for example `probate({ nonRegisteredNom, realPropertyNom, realPropertyMortgagesNom, otherAssetsNom, finalReturnTaxNom }, ctx)`, and the exact formula.
  * Add an `isRealProperty` flag for `other` assets.
  * Add the mortgage cap to the SA3 source list.
  * List the affected tests and the README.

### M16. The purchase shortfall and the new breakdown rows have no data path, and SA21 puts the Rent source in the wrong file - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** SA6, SA17, SA20, SA21 (lines 2478, 2506-2507); lines 1274, 1278
* **Discrepancy Description**:
  * **No result field for the shortfall.** `Result.goals` has only `spending` and `legacy`, so the Results tab's purchase-shortfall line has nothing to read.
  * **No data for summary-mode variants.** They have no rows (runPath.ts:78), so per-strategy totals need a `PlanSummary` field. `runPath.ts` is in no SA list.
  * **No data for the new breakdown rows.** `StrategyResult['rows']` (types.ts:436-447) and `chartRows` (simulate.ts:32-67) carry only sources, tax, clawback, `savedToTfsaNom` and `spendNeedNom`. `BREAKDOWN` reads `keyof IncomeRow` (WithdrawalsTab.tsx:305-317). The rows "asset costs and mortgage payments" and "sales and purchases" have no data.
  * **The Rent source is in the wrong file.** `SOURCES`, `SOURCE_NAMES`, `IncomeRow` and `incomeRows` live in `data.ts` (data.ts:6-45), and `IncomeChart`'s `SHORT` and legend are `Record<Source, …>`. A Rent source added only in `IncomeChart.tsx`, as SA21 says, will not compile.
  * **The spending-need line.** It is undecided whether the dashed spending-need line includes asset cash out.
* **Rationale & Recommendation**: Comprehension #12 covers the row names; this finding is the missing data.
  * Name the fields, for example `Result.purchaseShortfall { years, totalToday }`, `PlanSummary.totalPurchaseShortfallNom/Today`, and row fields `assetCashOutNom`, `salesNom`, `purchasesNom`, `purchaseShortfallNom` through `chartRows` and `IncomeRow`.
  * Add `runPath.ts` to the file list.
  * Move the Rent source to the `data.ts` bullet.
  * State the spending-need-line rule.

### M17. The stacked income chart cannot draw negative net rent - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`, `egm-implementation-readiness`
* **Affected Scope:** line 1274 (the "Rent" source); line 672 (net rent may be below 0)
* **Discrepancy Description**:
  * `cum()`, `band()` and `gross()` (IncomeChart.tsx:31, 58-66, 125-134) assume every source is at least 0.
  * A loss year would draw an inverted band and lower the shared y scale (WithdrawalsTab.tsx:383).
* **Rationale & Recommendation**: The second reference plan includes a loss year. Decide the rule, for example: the chart stacks `max(0, rent)`, and the breakdown and tax show the signed value. Add the case to `chartData.test.ts`.

### M18. The new tab would silently open Settings - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (confirmed by the synthesizer)
* **Affected Scope:** SA20, "`App.tsx`: Assets in `TABS` between Savings and Spending"
* **Discrepancy Description**: `View()` ends with `default: return <SettingsScreen />` (App.tsx:220-221). Without a `case 'assets'`, clicking Assets shows Settings, and the type check does not catch it.
* **Rationale & Recommendation**: Add "`case 'assets': return <AssetsTab />` in `View()`" to SA20.

### M19. Nothing runs the new tax-case fixture, and SA28's change to taxContext.ts is not stated - Severity: Major
* **Reviewer Lens:** `egm-style`, `egm-codebase-details`, `egm-implementation-readiness`
* **Affected Scope:** SA28 (lines 2577-2580); Stage A verification line 2595 ("both tax-case files")
* **Discrepancy Description**:
  * Only `personalTax.test.ts` reads a tax fixture. It imports `tax-cases.json` (line 2) and asserts at least 20 cases (line 22).
  * SA28 modifies `tests/unit/taxContext.ts`, which loads no fixture (taxContext.ts:1-33), and gives no Proposed Change for it.
  * "An outside calculator" is unnamed. File 52 names TaxTips.ca 2026 Ontario, with `source` and `checkedOn` fields.
  * SA28 does not say which OAS value is used; the reference test pins `AS_BUILT`.
* **Rationale & Recommendation**: The verification line claims coverage the file list does not produce.
  * Add a second `describe` in `personalTax.test.ts` (without the 20-case check), or a new test file, that reads `tax-cases-assets.json`.
  * Drop `taxContext.ts` or state its change.
  * Name the calculator and format as in file 52, and state the OAS basis.

### M20. The Stage A file lists are not a complete write allowlist - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`, `egm-style`
* **Affected Scope:** SA1-SA30, especially SA5, SA20-SA24, SA29
* **Discrepancy Description**: These paths must change or will break, but no SA entry lists them.
  * **Engine:** `src/engine/project/runPath.ts`.
  * **UI:** `src/ui/content/glossary.ts`, where the new terms from critic M11 go.
  * **READMEs:** `src/engine/jurisdiction/README.md:22` (`probate`), `src/engine/withdraw/README.md:22` (`placeSurplus`), `src/engine/simulate/README.md:15` (`chartRows`).
  * **`AGENTS.md`:** its Stages section (lines 38-41) lists only `stage-0` … `stage-8`, and SA5 does not add `stage-assets`.
  * **Tests:**
    * `tests/e2e/cross-tab.spec.ts:26` expects 11 breakdown rows, which become 14;
    * `tests/property/legacy.test.ts:13` (`homeValueToday`);
    * `tests/unit/units.test.ts` (SA11);
    * `tests/unit/startOfYear.test.ts` (SA12, if M3 is not adopted);
    * `tests/unit/simulate.test.ts:62-90` and `engineIndex.test.ts` (SA17);
    * `tests/unit/runPath.test.ts`;
    * `tests/e2e/no-network.spec.ts:17`, which visits only the six old tabs.
* **Rationale & Recommendation**: The standard requires an exact allowlist, and as written Stage A cannot finish green inside its own boundary. Add these paths to the relevant SA entries.

### M21. Several SA changes have no named test - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA11, SA17, SA23-SA24
* **Discrepancy Description**: None of these has a listed case:
  * the growth-mode resolution, including a Settings inflation override;
  * `originalCostPaid` and the mortgage amounts left unconverted;
  * a missing `realAssets`;
  * the Rent source in `chartRows`;
  * `initialState` building `PlanState.realAssets`.
* **Rationale & Recommendation**: Add these cases to `units.test.ts` and `simulate.test.ts` in SA24.

### M22. SA24's case list does not say which file and step each case belongs to - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA24 (lines 2541-2560)
* **Discrepancy Description**:
  * SA24 names 14 files and 14 case bullets with no pairing. "The cottage comparison" could go in death.test.ts or compare.test.ts. "The v2 schema and refinements" could go in planState.test.ts or exportImport.test.ts.
  * "The helpers gain an asset-holding plan" does not say which of the two helpers.
  * The heading "Tests (steps 2-10)" never maps a case to a step.
* **Rationale & Recommendation**: Without the pairing, cases get duplicated or skipped, and the step gates in M1 cannot be checked. Make SA24 a File | Step | Cases table, as in file 56.

### M23. The SA30 timing check is underspecified and conflicts with an accepted deferral - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA30 (lines 2587-2590); Stage A verification line 2600; lines 1103, 1109, 1116
* **Discrepancy Description**:
  * "A plan with 6 assets" names no base plan, no plan length and no method. The stage 4 check timed in Node; the targets are browser timings.
  * "If a target is missed, apply that section's remedies" orders solver work now. But line 1116 records that the author accepted the tips miss until stage 8.
* **Rationale & Recommendation**: An agent could start optimizing the solver inside Stage A, against the author's decision. Critic M15 and zoom-out N2 cover other aspects. Write: "Time the reference plan at 34 and 45 years with 6 assets added, in Node as in the stage 4 check; add a row to the Performance table; if the first-message target is missed, apply the remedies; a tips miss is recorded only (line 1116)".

### M24. The Stage A gate cannot catch today's open findings - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** row A gate (line 1700); Known gaps rule (lines 1670, 1705)
* **Discrepancy Description**:
  * The gate counts only Known gaps rows whose "Close before" cell names Stage A, and only BA-7 does.
  * Blocker B1 and today's other open Majors are not rows, so the gate passes without them.
* **Rationale & Recommendation**: Add rows with a new prefix (for example `GA-`, with this review linked in the prefix legend) and "Close before: Stage A, step N" for each finding the author keeps.

### Nits

### N1. The stage status at line 1688 is out of date - Severity: Nit
* **Reviewer Lens:** all three
* **Affected Scope:** line 1688, against line 1700
* **Discrepancy Description**: The line says "stages 0 to 3 are done", but `stage-4` and `stage-5` are tagged, and row A's gate relies on `stage-5`.
* **Rationale & Recommendation**: Change it to "stages 0 to 5 are done".

### N2. Stale Known gaps rows cast doubt on the `stage-5` gate - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** lines 1676-1677
* **Discrepancy Description**: B5-3 reads "Done" but is still in the open table, against line 1668. B5-4 ("before `stage-5`") is still open, although `stage-5` is tagged.
* **Rationale & Recommendation**: Close or move both rows, or explain why they remain.

### N3. SA3's new SOURCES.md section could break `config:check` - Severity: Nit
* **Reviewer Lens:** all three
* **Affected Scope:** SA3 (line 2372); verification line 2599
* **Discrepancy Description**: `sourcesKeys()` (tools/lib.ts:56-65) treats any table row whose first cell is a backticked lowercase token as a config key. A "Rules without numbers" table written that way breaks "stays at 86 keys".
* **Rationale & Recommendation**: State the format: a bullet list, or a table whose first column is not backticked.

### N4. The Known gaps rule does not fit the BA rows - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** lines 1670, 1679-1685, 1705
* **Discrepancy Description**:
  * The rule talks about Majors and Nits, but the BA rows carry no severity.
  * "Future improvement" is not a stage, and "Stage A, step 1" fits neither allowed form.
  * BA-1 to BA-6 are accepted limitations that will never close.
  * BA-3 can be read two ways ("cannot be entered" or "treated as Ontario"), and BA-1's "it" is unclear.
* **Rationale & Recommendation**: Critic M7 and N13 cover the content of these rows; this finding is about the table's rules.
  * Mark BA-1 to BA-6 "Accepted limitation", or move them to Non-goals.
  * Phrase each as "X is not modelled; effect: Y".
  * Add the step-level form to the rule.

### N5. BA-7, SA3 and lines 728-735 list the rules to source differently - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** BA-7, SA3, lines 728-735
* **Discrepancy Description**:
  * BA-7 points to "Death and estate", but the citations are in "Assets at death (Stage A)".
  * The lists differ in count (five rules plus probate, against six) and in names (for example "mortgage compounding" against "semi-annual compounding").
* **Rationale & Recommendation**: Keep one list with fixed names, and link to it from SA3 and BA-7.

### N6. SA5 says "one rule" but gives two - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA5
* **Discrepancy Description**: SA5 states two rules: one for asset state and one for kinds.
* **Rationale & Recommendation**: Change it to "Two rules". The missing AGENTS.md Stages edit is covered in M20.

### N7. Two SA12 phrases are ambiguous - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA12; line 682
* **Discrepancy Description**: "The shortfall goes to purchases first" can mean purchases are funded first or charged first.
* **Rationale & Recommendation**: Write "A shortfall is charged to purchases (`purchaseShortfallNom`) before spending (`shortfallNom`)". The `assets.income` caller is in M3.

### N8. SA14 uses a vague reference and an undefined phrase - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA14 (line 2457)
* **Discrepancy Description**: "the working-year cash flow from the Technical Plan" points to a 1,400-line section, and "today's path" adds to critic M16's list.
* **Rationale & Recommendation**: Link "Working years" (line 701) and say "the stage 5 path".

### N9. Many "Why:" lines give no reason, and two cite rules that are written nowhere - Severity: Nit
* **Reviewer Lens:** `egm-style`, `egm-codebase-details`
* **Affected Scope:** SA6, SA8, SA15, SA16, SA17, SA20-SA23, SA29
* **Discrepancy Description**:
  * Lines such as "Why: Screens" name a section but give no reason.
  * "The folder README rule" (SA22) and "the rule against Ontario-specific values in engine code" (SA16) are in neither AGENTS.md nor this range.
* **Rationale & Recommendation**: Give a reason or a link in each "Why:" line, and cite where each rule is written, or state it.

### N10. SA10's names collide with existing ones, and its responsibility list differs from the diagram - Severity: Nit
* **Reviewer Lens:** `egm-style`, `egm-codebase-details`
* **Affected Scope:** SA10; lines 355-359
* **Discrepancy Description**:
  * `assets/step.ts startOfYear` shares its name with `solver/startOfYear.ts`, and `assets/tax.ts` with the `tax/` folder.
  * SA10 adds "the cottage comparison" to `atSecondDeath` and says "replacement scheduling" where the diagram says "vehicle replacement".
  * `kinds.ts` holding "which fields each shows" should be data, given AGENTS.md:26.
* **Rationale & Recommendation**: Name the import style (an `assets.` namespace), make one responsibility list, and describe `kinds.ts` as data.

### N11. SA18's insurance rule is ambiguous - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA18
* **Discrepancy Description**: "Carry insurance" is not defined, and the rule does not say whether a plan with no vehicle meets "every vehicle".
* **Rationale & Recommendation**: If the rule stays (intermediate F4 proposes dropping it), define both.

### N12. Some phrases in SA19 and SA21 are hard to parse - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA19, SA21
* **Discrepancy Description**: "the sold-only-in-the-year-set note", "growth's three modes with the plan's inflation rate", and "follows the Savings table" (styled like it, or placed after it).
* **Rationale & Recommendation**: Write "the note that an asset is sold only in the year set", "the three growth modes, showing the plan's inflation rate" and "styled like the Savings table".

### N13. SA23 does not say which layer refuses a low mortgage payment - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA23, SA8
* **Discrepancy Description**: The test sits in `assetsMortgage.test.ts`, but SA8 makes the refusal a schema refinement.
* **Rationale & Recommendation**: Name the layer that refuses it, and test it there.

### N14. SA26 overclaims its coverage and does not say how the second reference plan is built - Severity: Nit
* **Reviewer Lens:** `egm-style`, `egm-implementation-readiness`
* **Affected Scope:** SA26 (line 2570)
* **Discrepancy Description**:
  * "Every feature once" goes beyond the six cases at lines 1160-1166.
  * It does not say who starts the separate session, or what the implementer does at step 9.
  * The first reference plan's session read more than the design (see `tests/fixtures/reference-plan/NOTES.md`).
  * It does not say how the session is kept from seeing the engine code.
* **Rationale & Recommendation**: Write "covers the six cases", state that the author starts the session and the implementer waits for the committed fixture, and list the session's inputs.

### N15. SA9's example label does not say where its name comes from - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA9
* **Discrepancy Description**: The label "Cottage: sale year" could use the asset's `name` or its kind.
* **Rationale & Recommendation**: State which one.

### N16. The verification commands differ from the project's - Severity: Nit
* **Reviewer Lens:** `egm-style`, `egm-codebase-details`
* **Affected Scope:** Stage A verification
* **Discrepancy Description**:
  * It uses `npx prettier --check .` instead of `npm run format:check`.
  * It uses `PW_CHANNEL=msedge` for a required check, but Edge is local-only (line 2330) and CI runs Chromium.
  * The coverage thresholds apply only with `ENFORCE_COVERAGE=true` (vitest.config.ts:7, 20).
  * The manual check names no actor and gives no pass criterion.
* **Rationale & Recommendation**: Use the npm scripts, set the coverage flag or rely on CI, and state the actor and the criterion. Zoom-out N1 and comprehension #3 cover the import path, not this.

### N17. Year-end conversion of the asset rows is not stated - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA11, SA21
* **Discrepancy Description**: `toDisplay` uses the next year's deflator for `endNom` fields (units.ts:168-175), and `balanceRows` uses `r.year + 1` (data.ts:107).
* **Rationale & Recommendation**: State that `realAssets.<id>.endNom`, `mortgageEndNom` and the "Property less mortgages" band follow the same rule (AR2-R1).

### N18. SA9 lists `changeSummary.ts` for work done elsewhere - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA9
* **Discrepancy Description**: `describeEdits` already names edits through `fieldLabel` (changeSummary.ts:20-24), so naming asset edits only needs `labels.ts`.
* **Rationale & Recommendation**: Drop `changeSummary.ts` from SA9, or say what it adds.

### N19. The plan does not name existing code to reuse - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA8, SA18, SA19, SA10
* **Discrepancy Description**: These existing pieces fit the new work:
  * `Section` (common.tsx:8-43) for the Assets tab layout;
  * `nextAccountId` (store.ts:175-180) for `<kind>-<n>` ids;
  * a `MAX_REAL_ASSETS` constant next to `MAX_ACCOUNTS_PER_SPOUSE` (planSchema.ts:10-11);
  * `netGains` (nonRegistered.ts:47-54) for carrying asset losses forward.
* **Rationale & Recommendation**: Name them in the SA entries, so the implementer does not build parallel versions.

### N20. Small status and wording points - Severity: Nit
* **Reviewer Lens:** `egm-style`, `egm-implementation-readiness`
* **Affected Scope:** SA1, SA2, SA4, SA17, Stage placement, row A
* **Discrepancy Description**:
  * SA1 is labelled "(Modify)" but is done. SA2 also appears done (`concepts_brief.md` lines 403-419) but is not marked.
  * "The existing tags … stay valid": only `stage-0` to `stage-5` exist.
  * Row A's Content cell repeats its own name.
  * SA4's "three new amount kinds" counts growth modes, which are a rate (this extends critic M12).
  * SA17's "reach the strategies" is vague.
* **Rationale & Recommendation**:
  * Mark SA1 and SA2 "(Done 2026-11-26)".
  * Write "references to stages 6-8 stay valid".
  * List row A's scope as the other rows do.
  * Correct SA4's count.
  * Write "`StrategyResult` chart rows" in SA17.

---

## Relation to earlier reports today

Each finding is either new or a code-level sharpening of an earlier one:

| This report | Builds on |
| --- | --- |
| M2 | zoom-out B1, critic N2, comprehension #6 |
| M3 | zoom-out N4 and M4, critic M6, intermediate F6, comprehension #15 |
| M5 | zoom-out M1 |
| M8 | critic M1 |
| M12 | zoom-out N1, comprehension #3 |
| M16 | comprehension #12 |
| M23 | critic M15, zoom-out N2 |
| N4 | critic M7 and N13 |
| N5 | critic M14 |
| N8 | critic M16 |
| N11 | intermediate F4 |
| N16 | zoom-out N1, comprehension #3 |
| N20 | critic M12 |

No reviewer repeated:
- zoom-out B1, M1 or N3;
- critic M1, M5, M6 or M8;
- intermediate F1 or F2;
- comprehension #7 (BA-7's deadline).
