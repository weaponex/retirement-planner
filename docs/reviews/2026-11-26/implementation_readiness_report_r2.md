# Goldfish Review Report: Stage 9 (Implementation Readiness Test), re-audit

**Target:** `docs/designs/retirement-planner.md` (lines 1668-2536; DetailedRange only, with the Stage A feature sections read for definitions)
**Focus:** the Stage A (Assets) plan: Known gaps BA-1 to BA-9, row A of the stage table, and "Stage A (Assets) files" (Stage placement, SA1-SA31, Stage A verification).
**Question tested:** can an agent build Stage A from this plan alone without making impactful decisions, and does every file, function and line reference match the codebase?
**Date:** 2026-11-26. This is the one permitted re-audit of [implementation_readiness_report.md](implementation_readiness_report.md). The author's decisions are in [goldfish_review_report.md](goldfish_review_report.md). Decisions A1-A11 were not re-argued; they were only checked for being specified well enough to build.

## Reviewer Status

| Reviewer | Standard | Status |
| --- | --- | --- |
| `egm-implementation-readiness` | `resources/document_standards/implementation-readiness-standard.md` | completed |
| `egm-codebase-details` | `resources/document_standards/implementation-readiness-standard.md` | completed |
| `egm-style` | its persona's audit vectors, plus `AGENTS.md` | completed |

**Verdict:** still not ready, but much closer. Of the first report's 24 Majors, 11 are closed and 13 are partly closed. None is fully open. CB1 (no migration; the schema stays version 1) made the version-type and migration parts of M1, M2 and M12 moot.

What still stops an agent:
- The step order still cannot stay green. Step 3 also breaks the protected reference test, and `AGENTS.md` forbids fixing that until step 6.
- Some engine mechanics are still left to the implementer: the working-spouse tax when there is no gross pay, contributions in working years, the non-capital loss, purchase debt, the downsize, and whether estate property is gross or net of mortgages.
- Several data paths and types are unnamed.

**Counts after deduplication:** 1 Blocker, 19 Major, 24 Nit. Before deduplication the reviewers reported 1 Blocker, 42 Majors and 43 Nits (implementation readiness 1/13/14, codebase details 0/12/11, style 0/15/18 plus the earlier-Nit status table).

**What the synthesizer checked itself:**
- `src/engine/results/compare.ts:9` imports `workingYear`, and line 110 calls it. SA11 deletes that file in step 3, but SA15 changes `compare.ts` only in step 5 (B1).
- `yearSolve.ts:560` writes `contributionsNom: 0` (MJ2).
- `tests/e2e/cross-tab.spec.ts:26` still expects 11 breakdown rows (B1, MJ16).
- Line 2359 says each step "passes `npm run typecheck && npm run lint && npm test`" (B1).

---

## Status of the first report's Majors

| # | First report's finding | Status | Evidence / what remains |
| --- | --- | --- | --- |
| M1 | Step order cannot stay green | **Partly closed** | Closed: the engine comes first and the plan file and screens change in one push (2359, 2366); `TabId` and `TAB_NAMES` are both in step 7 (SA22, SA25); the tab links moved to `tabFor` (SA24); the half-wired migration is moot (CB1). Open: the type, test and CI breaks between steps (B1). |
| M2 | Input types and `NormalizedInputs` | **Partly closed** | Moot: the version union and the `Draft` literal (A7, lines 963, 1038). Closed: a missing `ownedAssets` counts as `[]` (1027, SA8). Open: the normalized asset type, the event list and `workingMonthlyNom` (MJ5). |
| M3 | Hook and signatures | **Partly closed** | Closed: the hook is in `prepareYear` (356, 647, SA9); the signatures are given (SA7, 2404); not-yet-bought assets use `held` (987, 1106). Open: the signatures do not pass the events or the death output on (MJ6). |
| M4 | Asset gains and the carried loss | **Partly closed** | "through `gainsBy`" is stated (648, SA9). But `gainsBy` exists only after the solve (yearSolve.ts:547-552), so the in-year tax would miss the gain (MJ3). |
| M5 | Working-year growth | **Closed** | Every year runs through `solveYear` (A5, SA11). The contributions this leaves behind are new (MJ2). |
| M6 | "Plan-start dollars" and price growth | **Partly closed** | One growth rule (391). Open: no function is named as the one that grows prices, and the new mortgage payment's unit is missing (MJ7). |
| M7 | × 12 on the monthly field | **Closed** | 649, 654, 2423. The field SA11 uses, `workingMonthlyNom`, is a new gap (MJ5). |
| M8 | Cash and identity equations | **Partly closed** | Cash in and cash out are defined (996-998); the household identity is an equation (1107). Open: other rental expenses (MJ13) and the mortgage identity (MJ14). |
| M9 | Rental loss larger than other income | **Partly closed** | The rule is decided (A8: carried forward). The mechanics are not specified (MJ4). |
| M10 | Field table per kind, defaults | **Closed** | Field table (1008-1025), id rule (972). The `addOwnedAsset` defaults remain a Nit (N13). |
| M11 | Readiness and optional fields | **Partly closed** | Paths by id (1028, SA21). Open: the "empty means not used" rules (MJ12). |
| M12 | Import shape check, version numbers | **Partly closed** | The version-number part is moot (CB1). Open: how Import recognises a file from before Stage A (MJ15). |
| M13 | End-of-plan property, CSV keys | **Closed** | `EstateYear` (1000-1002), the legacy formula (666), deemed gains (674), the CSV layout (1030), the fixture rebuild (A7, SA16). A new contradiction at 664 is MJ8. |
| M14 | Same-year deaths | **Closed** | Line 647; an `assetsStep.test.ts` case (SA7). The placement wording is Nit N20. |
| M15 | Probate signature and formula | **Closed** | 675, SA14. Remainders are in Nit N7 and MJ16 (the README). |
| M16 | Shortfall and breakdown data paths | **Partly closed** | Fields at 994-1005; SA15; the Rent and Sales sources are in `data.ts` (SA25); `runPath` is in SA11. Open: rent and cost definitions, the `chartRows` formulas, the spending-need line (MJ13), and purchase debt (MJ9). |
| M17 | Negative net rent in the chart | **Closed** | Line 1204. Where the clamp lives is Nit N18. |
| M18 | `case 'assets'` in `View()` | **Closed** | SA24. |
| M19 | Tax-case runner | **Partly closed** | `taxCasesAssets.test.ts` (SA19); `taxContext.ts` dropped. Open: the calculator, the OAS basis and the carry-forward case (Nit N8). |
| M20 | Write allowlist | **Partly closed** | `runPath.ts`, `glossary.ts`, `AGENTS.md`, `cross-tab.spec.ts`, `units.test.ts` and `simulate.test.ts` are now listed. Gaps remain (MJ16). |
| M21 | Unnamed tests | **Partly closed** | `units.test.ts` cases are named. Others are still unnamed (Nit N12). |
| M22 | SA24 case-to-file pairing | **Closed** | Each SA entry names its tests. |
| M23 | SA30 timing check | **Closed** | SA31 gives the plan, the method and a pass rule that respects the tips deferral. A fixture-count mismatch is Nit N9. |
| M24 | The gate cannot catch open findings | **Closed** | Row A's gate names the resolved review (1715). BA-7 closes at step 1 (1698), though the gate wording now deadlocks (Nit N16). |

Of the first report's Nits, N6, N8 (moot), N9, N11 (moot) and N13 are closed. The others still open are folded into the Nits below.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### Blockers

### B1. The steps cannot each pass typecheck and test, and step 3 breaks a protected fixture the agent may not change until step 6 - Severity: Blocker
* **Reviewer Lens:** `egm-implementation-readiness` (Blocker), `egm-codebase-details`, `egm-style` (Major); confirmed by the synthesizer
* **Affected Scope:** Stage placement (lines 2359-2367); SA6, SA9, SA11, SA14-SA16, SA24, SA27, SA28; Stage A verification (line 2517)
* **Discrepancy Description**:
  * **The protected reference test goes red at step 3, and the agent may not fix it.** From step 3, SA11 sends the reference plan's working years (2026-2027 in `inputs.json`, which has a `workingMarginalRate` and no gross pay) through `solveYear` with the A8 tax. At step 4, SA14 values the home as an asset. `expected-rows.csv` is rebuilt only in step 6 (SA16), and `AGENTS.md` says "Never modify an existing file under `tests/fixtures/`". So the agent stops at step 3.
  * **Step 2 breaks the typecheck.** SA6 makes every type change in step 2:
    * required fields: `YearRow.ownedAssets`, `assetCashInNom`, `assetCashOutNom`, `purchaseShortfallNom`, `IncomeBySourceNom.rent` and `sales`, `StrategyResult.rows[].assetCostsNom` and `purchasesNom`, `SpouseYearState.nonCapitalLossNom`;
    * removals: `EstateYear.homeNom` and `Result.estate.homeToday`.

    Their writers and readers change later: the row literals at yearSolve.ts:598 and workingYear.ts:242, and `noEstate()` at yearSolve.ts:329-336 (step 3); `estate()` at death.ts:105-116 (step 4); compare.ts:133 and simulate.ts:34-42 (step 5); data.ts:142-146 (step 7); and the test helpers `tests/unit/helpers/accounts.ts:27-37` and `helpers/yearInProgress.ts:18-24`, which no SA lists. Only `ownedAssets` on `PlanInputs` is said to be optional.
  * **Step 3 breaks the build.** SA11 deletes `workingYear.ts`, but `compare.ts:9,110` (`yearOneSaleTax`) imports it, and SA15 changes `compare.ts` only in step 5.
  * **The deployed app fails in steps 3-6.** The living-costs field becomes required only with the schema in step 7. Until then `workingMonthlyNom` is undefined, and 12 × undefined gives NaN in every plan with working years. Every green push deploys (AGENTS.md:47).
  * **Step 7 is red in CI.** The breakdown grows to 15 rows in step 7 (SA24), but `cross-tab.spec.ts:26` (`toHaveCount(11)`) changes only in step 8 (SA28).
  * **A test runs before it exists.** Line 2517 runs "both reference plans … at every step", but the second plan is created in step 6.
  * **Step 7 edits step-2 files.** Removing `homeValueToday` in step 7 changes `types.ts` and `units.ts`, which are filed under SA6 and SA8 (step 2).
* **Rationale & Recommendation**: The rule at line 2359 fails at steps 2, 3, 4, 5 and 7, and the fixture ban makes step 3 a hard stop. Without new instructions an agent either stubs, reorders or stalls.
  * Rebuild the reference fixture in the same push as the working-year and estate changes, with the author approving the diff then (merge SA16 and SA17 into step 3, or make steps 3-6 one push). Or keep the old working-year path while `workingMonthlyNom === undefined` until step 6.
  * Make each new type field optional until the step that fills it, or move each type change into that step.
  * Move the `compare.ts` `yearOneSaleTax` change into SA11, and the `cross-tab.spec.ts` change into step 7.
  * State the step 3-6 value of a missing living-costs amount (for example 0).
  * Write "from step 6, both reference plans" at line 2517. List the step-7 edits to `types.ts` and `units.ts`.

### Major

### MJ1. The working-spouse tax (A8) has no input for plans without gross pay, and its details are undecided - Severity: Major
* **Reviewer Lens:** all three
* **Affected Scope:** A8 (line 284), lines 379, 641, 654, 663, 821-824, 2206, 2327; SA12 (lines 2425-2427); SA16, SA20
* **Discrepancy Description**:
  * The schema still accepts `workingMarginalRate` plus `afterTaxPayToday` instead of `grossPayToday` (planSchema.ts:31-33, 171). So do the protected reference plan (inputs.json:16-17, 30-31), `couplePlan.ts:33-34, 47-48`, `zeroTax.test.ts` and `yearSolve.test.ts`. A8's `personalTax(pay + income) − personalTax(pay)` has no input for such a spouse.
  * `NormalizedSpouse` (types.ts:189-202) has no gross pay, and `normalizeInputs` drops it (units.ts:42-62). SA12 says gross pay is "carried through `units.ts`", but SA8 does not list that change.
  * Still undecided:
    * whether "personalTax(gross pay)" is `payroll.ts`'s `incomeTax(gross, ctx, extra)` (payroll.ts:53-70; with the enhanced-CPP deduction and the CPP and EI credits) or bare `personalTax`;
    * which age it uses (`WORKING_AGE` or the real age);
    * whether the clawback difference fills `clawbackNom`;
    * whether `taxableIncomeNom` includes pay.
  * Lines 379 and 663 still describe the old marginal-rate rule. SA12 lists a `death.ts` change but does not say what it is.
* **Rationale & Recommendation**: The implementer would have to decide the input model and the tax function.
  * Decide this, for example: remove `workingMarginalRate` and `afterTaxPayToday`, require `grossPayToday` while working, and rebuild the reference plan with gross pay.
  * State it in SA6, SA8, SA12 and SA20, and list `planSchema.ts`, `labels.ts`, `HouseholdTab.tsx` and the affected tests.
  * Name `payroll.ts` `incomeTax` as the function to reuse.
  * Rewrite lines 379, 663, 2206 and 2327, and say what `death.ts` gains.

### MJ2. Working-year contributions have no home once `workingYear.ts` is deleted - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`; confirmed by the synthesizer
* **Affected Scope:** SA9, SA11; lines 380, 654, 1107
* **Discrepancy Description**:
  * The end-of-year contribution logic lives only in workingYear.ts:171-201: indexing, TFSA room with the overflow to non-registered, and nothing into a RRIF or LIF.
  * `solveYear` writes `contributionsNom: 0` (yearSolve.ts:560) and has no contribution step.
  * Line 654 counts after-tax pay as cash and places the surplus (pay − living costs) through `placeSurplus`, yet also says "contributions still land at the end of the year". Nothing says whether contributions come out of pay (part of the solve target) or from outside. If they come from outside, the same pay is saved twice.
* **Rationale & Recommendation**:
  * State that `solveYear` gains workingYear.ts:171-201 after the price returns (yearSolve.ts:535), for each spouse still working, and that `tfsaIn` (yearSolve.ts:612-616) counts it.
  * State whether Σ contributions is added to the step-5 target, and add the term to the identity at 1107 or say why it stays out.
  * Name the `yearSolve.test.ts` cases that replace the "TFSA overflow" and "contributions at year end" cases of `workingYear.test.ts`.

### MJ3. Asset gains and operating income are not wired into the in-year tax - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`, `egm-style`
* **Affected Scope:** SA9 ("adds operating income and asset gains through `gainsBy`"); line 648
* **Discrepancy Description**:
  * `assembleIncome(spouse, fixed, draws, cashYield, realizedGains)` (incomeAssembly.ts:45-51) has no operating-income argument.
  * The in-year gain comes from `setup.rebalanceGains` (yearSolve.ts:245, 457). `gainsBy` is built only after the solve (yearSolve.ts:547-552).
  * So "through `gainsBy`" alone updates the carried loss but leaves the gain untaxed in its own year. SA9's sentence also reads as if operating income goes through `gainsBy`, but line 648 makes it `otherOrdinary`.
* **Rationale & Recommendation**: State that asset gains are added to `setup.rebalanceGains[owner]` (the `realizedGains` argument) and to `gainsBy`, and that operating income enters `assembleIncome` as a new argument and becomes `otherOrdinary`. Name a test: a sale gain is taxed in its own year and uses up a carried loss.

### MJ4. The non-capital loss (A8) has no mechanics - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** line 648, SA9, data contract line 990
* **Discrepancy Description**: None of these is defined:
  * the "other income" the loss is measured against (before or after the split; with or without grossed-up dividends; with or without pay under A8);
  * where the carried loss is applied. Under Canadian rules it is a deduction from taxable income (line 25200), so it does not lower net income or the OAS clawback. `TaxableIncome` has no deduction field, and a negative `otherOrdinary` would wrongly lower the clawback, or be floored silently by the bracket code;
  * when `nonCapitalLossNom` is updated (by analogy with yearSolve.ts:549-552);
  * what happens to it at the first death (`transferAccounts` zeroes only `carriedLossNom`, death.ts:32-34) and on the final return.
* **Rationale & Recommendation**: Write the algorithm as equations: add a `TaxableIncome.lossDeductionNom` (or similar) applied after net income, and give the update point and the death and final-return rules. Add unit and tax cases.

### MJ5. The normalized inputs, the event list and `workingMonthlyNom` have no types, and the need formula can double-count inflation - Severity: Major
* **Reviewer Lens:** all three
* **Affected Scope:** SA6 ("and the normalized forms", line 2396), SA8, SA11 (line 2423); data contract lines 960-1006; line 654
* **Discrepancy Description**:
  * `NormalizedInputs` (types.ts:235-254) has no slot for normalized assets (resolved rate, `valueNom`, `costNom`, `priceNom`, mortgage), for the A2 event list (element type, sort key, where it lives) or for `spending.workingMonthlyNom`. The contract shows none of them.
  * `workingMonthlyNom` appears only in SA11; the contract has only `workingMonthlyToday`. If it is nominal, "× the inflation factor" applies inflation twice. Line 654 applies the factor to the today's-dollar field inside the engine, but `AGENTS.md` keeps today's-dollar conversion in `normalizeInputs`. A bare `12` would also fail the no-magic-numbers lint (line 1849).
* **Rationale & Recommendation**: This is the core of the first report's M2. Add `NormalizedOwnedAsset`, `AssetEvent`, `NormalizedInputs.ownedAssets`, `NormalizedInputs.assetEvents`, `spending.workingMonthlyNom` (plan-start nominal) and `NormalizedSpouse.grossPayNom` (MJ1) to the contract, and list them in SA6 and SA8. Write "need = `MONTHS_PER_YEAR` × `workingMonthlyNom` × inflation factor(t)" in both places.

### MJ6. The asset calls' results have no path to the solver or to the final return - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** SA7 `step.ts` signatures (line 2404), SA9, SA14; lines 356-363, 652, 674, 987-993
* **Discrepancy Description**:
  * `PreparedYear` (yearSolve.ts:74-90) has no field for the `events` that `assets.startOfYear` returns.
  * `income(state, ctx)` receives no events, and `OwnedAssetState.thisYear` holds only the mortgage schedule (989). So it cannot compute sale proceeds, gains or the purchase cash out.
  * `endOfYear(state, ctx, secondDeath?) → { state, atDeath? }` returns `atDeath` inside `solveYear`, but `SolvedYear` (yearSolve.ts:320-326) has no field for it. `secondDeath(endState, taxed, inputs, ctx)` (death.ts:123-128, called from runPath.ts:57) and `finalReturn` (death.ts:69-93) have no parameter for deemed asset gains, property or mortgages.
  * `saleShares` and `atDeath` have no types, and no entry says who builds `OwnedAssetYear` (`step.ts` or `yearSolve.ts`).
* **Rationale & Recommendation**: Add `PreparedYear.assets: { events, … }`, change the call to `income(state, events, ctx)` (or store the events on the state), and add `SolvedYear.atDeath` with the new `secondDeath` and `finalReturn` parameter. Alternatively, state that `secondDeath` recomputes these from `endState.ownedAssets` and name the `assets/` function that does it. Write the missing types.

### MJ7. No function is named as the one that grows prices, and the new mortgage payment has no unit rule - Severity: Major
* **Reviewer Lens:** `egm-style` (Major), `egm-implementation-readiness`, `egm-codebase-details` (Nit)
* **Affected Scope:** diagram line 349, line 391, SA8 (line 2409); lines 976, 983
* **Discrepancy Description**:
  * Line 376 defines today's dollars as plan-start dollars, so "converted to plan-start dollars" still reads as a no-op.
  * "Grown to their year by the deflator" has no actor: `normalizeInputs` or `assets.startOfYear` could grow a purchase price, and the same question applies to rent and costs each year.
  * The new mortgage's `paymentMonthlyToday` is missing from the units list, and nothing says whether it is fixed in nominal dollars after the purchase.
* **Rationale & Recommendation**: SA4 itself warns about this mixed-units defect. Write, for example: "`normalizeInputs` converts each `…Today` amount to nominal dollars: plan-start values at factor 1; a purchase or downsize price, and its new mortgage balance and payment, at the purchase year's factor, after which the payment is fixed; rent and costs as plan-start nominal amounts that `assets.startOfYear` multiplies by the year's inflation factor." Add the rule to SA4.

### MJ8. Estate property is defined as both net and gross of mortgages - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-style`
* **Affected Scope:** line 664 against lines 666, 675 and 1001; SA14
* **Discrepancy Description**:
  * Line 664 values each asset "at its end-of-year value, less its mortgage".
  * Line 666's legacy formula then subtracts "all mortgages" again, and `EstateYear` keeps `propertyNom` and `mortgagesNom` separate.
  * Probate's `propertyNom` (675) must be gross, because the mortgages are deducted separately.
* **Rationale & Recommendation**: Read literally, the mortgages are subtracted twice. Define `propertyNom` as the gross end-of-year value at line 664 and in the contract.

### MJ9. Purchase debt has no accumulation rule and no state field - Severity: Major
* **Reviewer Lens:** all three
* **Affected Scope:** A9 (line 285), lines 649, 666, 1001, 1005; SA9, SA14
* **Discrepancy Description**:
  * Nothing says whether `purchaseDebtNom` is the nominal sum of past `purchaseShortfallNom`, whether it bears interest or grows, or whether later surpluses repay it.
  * `PlanState` (types.ts:300-307) has no field to carry it, and `secondDeath` sees only `endState` (death.ts:123-128), not the rows.
* **Rationale & Recommendation**: Each reading gives a different legacy. Add `PlanState.purchaseDebtNom`, updated in `solveYear` step 5, with its rule (for example "the running nominal sum of shortfalls; no interest; never repaid").

### MJ10. How a downsize is represented is undefined - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** A2, A9; line 983; SA7; CSV columns (line 1030)
* **Discrepancy Description**:
  * Not said whether the new home keeps the old asset's id (a same-year sale and purchase on one `OwnedAssetYear`) or gets a new id. That decides the CSV columns the separate reference-plan session must produce.
  * Not said what the new home's `costNom` and growth are.
  * A9's "costs carried over unless edited" has no input field: `downsize` holds only `year`, `toPriceToday` and `mortgage`.
* **Rationale & Recommendation**: State, for example, "same id; cost reset to the price; growth and costs carried over". Then drop "unless edited", or add the field.

### MJ11. The surplus share from sale money has no formula, and SA10 hedges on a settled fact - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`, `egm-style` (Nit)
* **Affected Scope:** line 650; SA10 (line 2419); line 648
* **Discrepancy Description**:
  * "The share of the surplus that came from sale money" is undefined (for example `min(surplus, net sale proceeds after tax)`, allocated by `ownerShares`, taken pro rata or first).
  * SA10 says `placeSurplus` "keeps its signature if it already takes shares". It does: `placeSurplus(surplus, year, shares)` (surplus.ts:47-51). The caller blends the shares (yearSolve.ts:527-531), so the entry does not say what changes in `surplus.ts`.
  * Line 648 counts rent in the fallback weights, which today are `fixedTotal` (yearSolve.ts:530).
* **Rationale & Recommendation**: Write the formula. State that `surplus.ts` is unchanged (drop it from Modify) and that `yearSolve.ts` computes the blended shares, rent included. Move the `surplus.test.ts` case to `yearSolve.test.ts`.

### MJ12. Readiness will still reject empty optional asset and spending fields - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** SA21; lines 967-969, 1008-1028
* **Discrepancy Description**:
  * `Draft<T>` turns optional numbers into `null` (draft.ts:9-10), and `planSchema`'s `.optional()` rejects `null`.
  * `fillUnused` and `EMPTY_MEANS_NONE` (readiness.ts:21-66) cover none of these:
    * the cost lines;
    * `rent.otherExpensesYearToday`;
    * a blank mortgage or sale;
    * `growth.rate` in "with inflation" mode;
    * `valueToday` or `originalCostPaidNom` for a future purchase;
    * `workingMonthlyToday` when nobody works.
  * Each such plan stays "Incomplete" for ever.
* **Rationale & Recommendation**: List the fields where empty means "not used", with the rule for each (for example "removed when null; `workingMonthlyToday` removed when no spouse retires after the plan start year"). Add `planState.test.ts` cases.

### MJ13. "Rent", the asset-cost fields and the breakdown rows are open to two readings, and cash out leaves out other rental expenses - Severity: Major
* **Reviewer Lens:** all three
* **Affected Scope:** lines 648, 996-1004, 1204; SA15 (line 2443), SA25
* **Discrepancy Description**:
  * **Rent in three forms.** `IncomeBySourceNom.rent` "may be negative" (net), the cash-in figure uses gross rent, and the breakdown shows "rent (net)" beside "asset costs and mortgage payments". Read as operating income, the costs and interest are counted twice.
  * **Cash leak.** Operating income subtracts other expenses, but `assetCashOutNom` (costs + mortgage payments + purchase cash out + vehicle replacement) does not, so other expenses never leave the household's cash.
  * **Undefined fields.** `assetCostsNom` is not defined: does it include mortgage payments or the vehicle replacement? The vehicle cost has no row.
  * **No `chartRows` formulas.** `chartRows` (simulate.ts:32-67) cannot derive "purchases" or "sales": `OwnedAssetYear.purchaseNom` is the price, not the cash out net of the new mortgage, and the payoff at a sale is not in the row.
  * **Spending-need line.** It is still undecided whether `spendNeedNom` (the dashed line) includes `assetCashOutNom`.
  * **Monthly rent.** Rent and costs never say × 12 for a monthly rent (648, 996).
* **Rationale & Recommendation**: Define each field as an equation (for example `rent` = gross rent − other expenses; `assetCostsNom` = costs + mortgage payments + vehicle replacement). Put other expenses in `assetCashOutNom`. Map each of the 15 rows to one field, give the `chartRows` formulas, and state the spending-need-line rule.

### MJ14. The mortgage invariant fails in any purchase year with a new mortgage, and cannot be checked from the row - Severity: Major
* **Reviewer Lens:** all three
* **Affected Scope:** line 1105; `OwnedAssetYear` (lines 991-993); SA13 (line 2431)
* **Discrepancy Description**:
  * "start + interest − payments − payoff = end" has no term for a new mortgage (A9).
  * `OwnedAssetYear` has no start, new-mortgage, payment or payoff fields, and `failedChecks(next, row, checks)` (invariants.ts:44) reads only the row.
  * A downsize or purchase with a mortgage would therefore raise an engine-integrity error.
* **Rationale & Recommendation**: Add "+ new" to the identity, and add `mortgageStartNom`, `mortgageNewNom`, `mortgagePaymentsNom`, `mortgagePayoffNom` (and `replacementNom`, `purchaseCashNom` for MJ13) to `OwnedAssetYear`. Alternatively, say which state values supply each term.

### MJ15. Import has no rule for recognising a file from before Stage A - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** SA20; lines 283 (A7), 1038; CUJ 5 (line 2350)
* **Discrepancy Description**: The schema version stays 1, so `version > EXPORT_SCHEMA_VERSION` (exportImport.ts:86) never fires. `draftShape` is `passthrough` with no `ownedAssets` key (exportImport.ts:38-66), so an old file passes and reaches a store and screens that expect `draft.ownedAssets`.
* **Rationale & Recommendation**: In SA20, make `ownedAssets` a required array in `draftShape`. State the rule, for example: "a file whose `inputs` has no `ownedAssets` key, or has `estate.homeValueToday`, is refused with the earlier-pre-release message". Give the message text and add the case to `exportImport.test.ts`.

### MJ16. The write allowlist is still incomplete - Severity: Major
* **Reviewer Lens:** all three
* **Affected Scope:** line 2368 ("Every file this stage changes is listed"); SA1-SA31
* **Discrepancy Description**: These paths must change or will break, but no SA entry lists them:
  * **READMEs:** `src/engine/jurisdiction/README.md:22` (the `probate` signature, SA14); `src/engine/simulate/README.md:15` (`chartRows`, SA15); `src/engine/withdraw/README.md:22` if `surplus.ts` stays in SA10.
  * **Engine:** `src/engine/results/compare.ts` in step 3 (B1).
  * **UI:** `src/ui/results/Goals.tsx`. Line 137 says "including the home", and file 47 says this file renders the goals, so the purchase-shortfall line and Goal 1's years land here, not in `ResultsTab.tsx`. SA25 also places the property band colour in `common.tsx`, but `BALANCE_COLOURS` is in `src/ui/charts/charts.tsx:28`.
  * **Tests:**
    * `tests/property/legacy.test.ts:13` (`homeValueToday`);
    * `tests/unit/helpers/accounts.ts` and `tests/unit/helpers/yearInProgress.ts` (new required state fields);
    * `tests/unit/startOfYear.test.ts` (if SA9 changes `startOfYear`);
    * `tests/e2e/no-network.spec.ts:17` (its tab list leaves out Assets).
  * **`AGENTS.md`:** SA5 adds neither `stage-assets` to the Stages section (lines 38-41) nor the A7 exception to "Never modify an existing file under `tests/fixtures/`".
  * **Step 7 edits** to `types.ts` and `units.ts` (B1).
* **Rationale & Recommendation**: The standard requires an exact allowlist, and the plan tells the agent to ask before touching anything else. Add each path to its SA entry.

### MJ17. The reference-plan rebuild instructions conflict - Severity: Major
* **Reviewer Lens:** `egm-style`; the fixture-permission point is also raised by `egm-implementation-readiness`
* **Affected Scope:** SA5 (line 2390), SA16 (line 2449), SA17 (line 2453), SA18 (line 2457); line 1109
* **Discrepancy Description**:
  * **Inputs.** SA18 says the session works "from this design only". The first session also read `docs/units-and-conventions.md`, `config/2026/*.json`, `SOURCES.md` and the tax fixture (`tests/fixtures/reference-plan/NOTES.md:7`), and `AGENTS.md` forbids rule values from memory.
  * **Who.** No entry says who starts the session or how it is kept from seeing the engine code.
  * **Permission.** `AGENTS.md` still forbids modifying fixtures, so the step-6 instruction "stop and ask the author" stalls the agent.
  * **OAS value.** SA17 keeps the `AS_BUILT` pin (referencePlan.test.ts:24) while SA16 regenerates the fixture. Which OAS value do the regenerated rows use?
  * **Coverage.** "Every feature once" (line 1109) overclaims: the six listed cases leave out the `other` kind, a purchase with a new mortgage, "sell at the first death" and a purchase shortfall.
* **Rationale & Recommendation**: List the session's input files. Say the author starts the session and the implementer waits for the committed fixture. Add the fixture exception to SA5. State the OAS basis. Write "covers these six cases", or add the missing cases.

### MJ18. Older file entries in the range contradict Stage A, and `AGENTS.md` sends agents to read them - Severity: Major
* **Reviewer Lens:** `egm-style` (Major), `egm-implementation-readiness` (Nit)
* **Affected Scope:** lines 2098-2099, 2105, 2119, 2121, 2198, 2209-2210, 2308; `AGENTS.md:4`
* **Discrepancy Description**: These entries still describe the behaviour before Stage A:
  * file 34: `spendingNeed` is "zero before the first retirement"; the `workingYear` bullet; `estate()` uses "the home";
  * file 37: `goals()` counts from the first retirement (against A6); `yearOneSaleTax` uses `workingYear`;
  * file 45: six tabs;
  * file 46: an 11-row breakdown and the Estate tab's "home value";
  * file 56: the `workingYear.test.ts` row.

  `AGENTS.md` tells agents to read a file's section before changing it, so they meet the old rule first.
* **Rationale & Recommendation**: Edit those entries in place, or add one sentence at the top of "Stage A (Assets) files": "Where an SA entry and an earlier file entry differ, the SA entry wins."

### MJ19. The normative mockup contradicts A4 and A10, and the override list does not say so - Severity: Major
* **Reviewer Lens:** `egm-style` (Major), `egm-implementation-readiness` (Nit)
* **Affected Scope:** `docs/designs/mockups/Assets.html:77, 102`; lines 1117, 1131; SA23 (line 2479)
* **Discrepancy Description**:
  * The mockup shows "On Spending, 'Property tax' now shows 'Counted on Assets'", the category hold that A4 removed.
  * It also shows a vehicle loan, which A10 removed.
  * SA23 says to build "the tab in the mockup", and line 1117 makes mockup wording normative unless it is listed at line 1131.
* **Rationale & Recommendation**: Add both points to "Where the mockups are overridden", or to SA23.

### Nits

### N1. The stage status at line 1703 is still out of date - Severity: Nit
* **Reviewer Lens:** all three
* **Affected Scope:** line 1703 against line 1715
* **Discrepancy Description**: The line says "stages 0 to 3 are done", but row A's gate relies on `stage-5` being tagged.
* **Rationale & Recommendation**: Write "0 to 5".

### N2. Stale Known gaps rows - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`, `egm-style`
* **Affected Scope:** lines 1689-1690
* **Discrepancy Description**: B5-3 reads "Done" but is still in the open table. B5-4 says "before `stage-5`", which is tagged.
* **Rationale & Recommendation**: Close or move both rows.

### N3. SA3's source list and format - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA3 (line 2382); lines 675-676
* **Discrepancy Description**: SA3 says "each rule listed in BA-7", but BA-7 lists none. Line 675 sends the probate Act to BA-7, but the list at line 676 leaves it out. The format of the new SOURCES.md section is still unstated (`config:check` risk, first report N3).
* **Rationale & Recommendation**: Point SA3 to line 676, add the Act to that list, and state the format (a bullet list, or a table whose first column is not backticked).

### N4. SA9's "passing the death year through" - Severity: Nit
* **Reviewer Lens:** all three
* **Affected Scope:** SA9 (line 2415)
* **Discrepancy Description**: `startOfYear(state, ctx)` (startOfYear.ts:102) takes no death year, and the asset call lives in `assets/step.ts`.
* **Rationale & Recommendation**: Delete the clause, or say what is passed and why.

### N5. SA7 signature details - Severity: Nit
* **Reviewer Lens:** `egm-style`, `egm-implementation-readiness`
* **Affected Scope:** SA7 (line 2404); diagram line 361
* **Discrepancy Description**:
  * `x2` is not TypeScript.
  * The diagram's `death?` differs from SA7's `secondDeath?`.
  * `gainOnSale(asset, proceeds)` is described as "value − cost" where it means proceeds − cost.
  * `startOfYear` collides with `solver/startOfYear.ts`, and `assets/tax.ts` with the `tax/` folder. The `assets.` import style is implied but never stated.
* **Rationale & Recommendation**: Fix the types and wording, and state the namespace import.

### N6. The `KINDS` flag values are not tabulated - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-style`
* **Affected Scope:** SA5, SA7; line 973
* **Discrepancy Description**:
  * The flag values per kind are not shown: cottage personal-use, and `other` depending on `otherUse`.
  * SA5 says kinds are defined "only in `kinds.ts`", but the `kind` union is in `types.ts` and the schema enum is in SA20.
* **Rationale & Recommendation**: Tabulate the flags, and state that both the union and the enum derive from `KINDS`.

### N7. Probate signature leftovers - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-codebase-details`
* **Affected Scope:** line 675
* **Discrepancy Description**:
  * The stated signature drops `ctx`; the code has `probate(estateAssets, ctx)` (types.ts:19).
  * Nothing says whether a mortgage larger than its property's value is capped, or what happens when a sale does not cover its mortgage.
* **Rationale & Recommendation**: Keep `ctx` and state both rules.

### N8. SA19's outside check - Severity: Nit
* **Reviewer Lens:** all three (`egm-style` rated it Major)
* **Affected Scope:** SA19 (line 2461); line 1110
* **Discrepancy Description**:
  * The calculator is unnamed; file 52 uses TaxTips.ca 2026 Ontario, with `source` and `checkedOn`.
  * The OAS basis is unstated.
  * A carry-forward case spans two returns, so it cannot be checked "within $1" on a one-year calculator.
* **Rationale & Recommendation**: Name the calculator and the format, state the OAS value, and check the carry-forward case as two single-year returns, with the carried amount worked out by hand.

### N9. SA31's timing plan does not match its fixture - Severity: Nit
* **Reviewer Lens:** all three (`egm-style` rated it Major)
* **Affected Scope:** SA31 (line 2513); lines 1066-1069, 1109
* **Discrepancy Description**:
  * SA31 says the second reference plan has 6 assets, but line 1109 lists about four.
  * "The stage 4 figure for the same plan length" exists only for 34 and 45 years.
* **Rationale & Recommendation**: Require 6 assets in SA18, or time a stated 6-asset variant. Name the comparison row.

### N10. The Results purchase-shortfall line has no stated content - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`, `egm-style`
* **Affected Scope:** SA24 (line 2483); line 1205
* **Discrepancy Description**: Nothing says what the line shows (a total in today's dollars, or the years) or which field it reads. MJ16 covers where it renders (`Goals.tsx`).
* **Rationale & Recommendation**: State the content and the source field.

### N11. SA9 and SA12 wording - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA9 (line 2415), SA12 (line 2425)
* **Discrepancy Description**:
  * "The shortfall goes to purchases first" lacks the field names that line 649 gives.
  * SA12's "(working-spouse tax only)" on `death.ts` does not say what changes (see MJ1).
* **Rationale & Recommendation**: Use the field names, and state the `death.ts` change.

### N12. Tests still unnamed - Severity: Nit
* **Reviewer Lens:** all three
* **Affected Scope:** line 2368 ("Each entry names its tests"); SA7, SA8, SA13, SA15, SA20, SA21
* **Discrepancy Description**:
  * SA1-SA5, SA16, SA17 and SA30 name no tests. SA13, SA15, SA20 and SA21 name files but no cases.
  * The `assetsTax.test.ts` cases are unnamed.
  * These cases are missing:
    * a missing `ownedAssets` counts as `[]`;
    * a growth mode under a Settings inflation override;
    * `initialState` building `ownedAssets` (no `initialState.test.ts` exists);
    * the Rent and Sales sources in `chartRows` (simulate.test.ts:62-90);
    * an asset capital loss carried to a later year.
* **Rationale & Recommendation**: Name the cases, or soften line 2368.

### N13. `addOwnedAsset(kind)` defaults - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** SA22
* **Discrepancy Description**: The defaults are not stated: `owned: 'now'`, the default name, the vehicle growth rate.
* **Rationale & Recommendation**: List them.

### N14. No mapping from asset cost lines to category ids for the A4 notice - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** SA21
* **Discrepancy Description**: Each asset cost line needs a spending category id so the A4 notice can name the overlap. The plan gives none.
* **Rationale & Recommendation**: Add the mapping (for example, property tax maps to the `housing` category).

### N15. The verification commands differ from the project's - Severity: Nit
* **Reviewer Lens:** all three
* **Affected Scope:** Stage A verification (lines 2517-2520)
* **Discrepancy Description**:
  * `npx prettier --check .` should be `npm run format:check`.
  * `PW_CHANNEL=msedge` is the local-only setting (line 2345); CI runs Chromium.
  * "All validated" needs `config:check -- --strict` (line 2250).
  * The coverage line leaves out branches and `ENFORCE_COVERAGE`.
  * The manual check names no actor and no pass criterion.
* **Rationale & Recommendation**: Use the npm scripts and flags, and state the actor and the criterion.

### N16. The Known gaps rules and the BA rows - Severity: Nit
* **Reviewer Lens:** `egm-style` (it rated the BA-7 gate point Major)
* **Affected Scope:** lines 1683, 1698, 1720; BA-3, BA-8, BA-9
* **Discrepancy Description**:
  * Line 1720 puts every row whose "Close before" names a stage into that stage's start gate. So BA-7 ("Stage A, step 1") would have to close before Stage A starts, although it is scheduled inside step 1.
  * BA-8's "After the production release" does not fit a "Close before" column.
  * BA-9's "almost always" is a hedge.
  * BA-3 still reads two ways.
* **Rationale & Recommendation**:
  * Write "Stage A (during), step 1", and add the step-level form to the rule.
  * Mark BA-8 as an accepted limitation.
  * Rewrite BA-9 as "a vehicle's gain is not taxed; a sale above cost would owe tax the plan leaves out".

### N17. SA2's status and stale brief lines - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** SA2 (line 2378); `concepts_brief.md:405, 407, 419-426`
* **Discrepancy Description**: SA2 reads as pending, although the brief already records the reversals. SA2's list also leaves out Decision 15. Brief line 405 says "BA-1 to BA-7", and line 407 ("Keep the protected reference plan unchanged. Adopted") contradicts A7.
* **Rationale & Recommendation**: Mark what is done, and list the remaining brief lines.

### N18. Where the negative-rent clamp lives, and `IncomeRow` fields - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** line 1204; SA25
* **Discrepancy Description**:
  * The clamp must be in `IncomeChart`'s `cum` and `gross` (IncomeChart.tsx:31, 65), not in `incomeRows`, or the breakdown loses the signed value.
  * The new breakdown rows need `IncomeRow` fields, because `BREAKDOWN` is keyed by `keyof IncomeRow` (WithdrawalsTab.tsx:305).
  * No `chartData.test.ts` case is named.
* **Rationale & Recommendation**: State the clamp's location and the new `IncomeRow` fields, and name the test case.

### N19. The contract says `ownedAssets` is required, then "missing = []" - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** line 965; step 2 (line 2361)
* **Discrepancy Description**: Step 2 makes `ownedAssets` optional, and no later step makes it required.
* **Rationale & Recommendation**: State when it becomes required (step 7, with the schema).

### N20. Same-year deaths are filed under "Start of year" - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** line 647
* **Discrepancy Description**: Same-year deaths are settled in `secondDeath` (death.ts:129-131), which A1 forbids from changing asset state.
* **Rationale & Recommendation**: Name `endOfYear(…, secondDeath)` as the place where this happens.

### N21. Year-end conversion of the asset fields - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA8; line 397
* **Discrepancy Description**: `toDisplay` converts only `balancesEndNom` and `accounts[*].endNom` with the next year's deflator (units.ts:168-175).
* **Rationale & Recommendation**: List the `toDisplay` change for `ownedAssets[*].endNom` and `mortgageEndNom`, with a `units.test.ts` case.

### N22. CSV flattening of `ownerShares` - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** line 1030
* **Discrepancy Description**: `flatten` turns any non-number into 0 (referencePlan.test.ts:55), so the `ownerShares` array would be lost. Nothing says whether every asset has a row entry every year, with zeros before purchase and after sale.
* **Rationale & Recommendation**: State `ownerShares.0` and `.1` as cells (or leave the field out), and state the every-year rule.

### N23. Small wording points - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** row A (line 1715), SA4 (line 2386), SA21 (line 2471), SA26 (line 2491)
* **Discrepancy Description**:
  * Row A's content cell is only "Assets" plus a link.
  * SA4 leaves out the today's-dollar rule for values and prices (MJ7).
  * The label "Cottage: sale year" could come from the asset's name or its kind.
  * "Following the Savings table" could mean styled like it or placed after it.
* **Rationale & Recommendation**: List row A's scope. Add the rule to SA4. Write "the asset's name". Write "styled like the Savings table".

### N24. Existing code to reuse is still unnamed - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** SA8, SA10, SA12, SA22, SA23
* **Discrepancy Description**: These existing pieces fit the new work, but the plan does not name them:
  * `Section` (common.tsx:8) for the tab layout;
  * the `nextAccountId` pattern (store.ts:175) for `<kind>-<n>` ids;
  * a `MAX_OWNED_ASSETS` constant beside `MAX_ACCOUNTS_PER_SPOUSE` (planSchema.ts:10);
  * `netGains` (nonRegistered.ts) for asset losses;
  * `payroll.ts` `incomeTax` (MJ1).
* **Rationale & Recommendation**: Name each in its SA entry.

---

## Relation to the first report

| This report | Carries forward |
| --- | --- |
| B1 | M1 (remainder), plus the new fixture and CI breaks |
| MJ3 | M4 (remainder) |
| MJ4 | M9 (mechanics) |
| MJ5 | M2 (remainder) and M7 (the new field) |
| MJ6 | M3 (remainder) |
| MJ7 | M6 (remainder) |
| MJ12 | M11 (remainder) |
| MJ13 | M8 and M16 (remainders) |
| MJ14 | M8 (mortgage identity) |
| MJ15 | M12 (remainder after CB1) |
| MJ16 | M20 (remainder) |
| N8 | M19 (remainder) |
| N12 | M21 (remainder) |
| N9 | M23 (fixture mismatch) |

New since the first report: MJ1, MJ2, MJ8, MJ9, MJ10, MJ11, MJ17, MJ18 and MJ19. Most come from the A5, A8 and A9 revisions.
