# Consolidated review: the Assets amendment (Stage A), 2026-11-26

* **Target:** [docs/designs/retirement-planner.md](../../designs/retirement-planner.md), lines 1–2617 (FeatureRange 1–1655, DetailedRange 1656–2617). The focus was the Stage A (Assets) amendment merged on 2026-11-26.
* **Mode:** consolidated: all five stages ran in sequence without stopping. Each reviewer started with no conversation history.
* **Reading list given to the reviewers:**
  * the files the design links to inside the project;
  * saved copies of its three web links, in `private/review-sources/`. The FP Canada page returned 404, so its 2026 guidelines PDF stands in for it.
* **Stage reports** (this folder):

| Stage | Report | Reviewers | Blocker | Major | Nit |
|---|---|---|---|---|---|
| 5. Initial zoom out | [zoom_out_report.md](zoom_out_report.md) | zoom-out, inventive catalyst | 1 | 7 | 9 |
| 6. Comprehension | [comprehension_report.md](comprehension_report.md) | comprehension | 0 | 7 | 11 |
| 7. Critic | [critic_report.md](critic_report.md) | design, structural, style | 0 | 17 | 19 |
| 8. Intermediate zoom out | [intermediate_zoom_out_report.md](intermediate_zoom_out_report.md) | zoom-out | 0 | 5 | 1 |
| 9. Implementation readiness | [implementation_readiness_report.md](implementation_readiness_report.md) | implementation readiness, codebase details, style | 0 | 24 | 20 |
| **Total (raw)** | | | **1** | **60** | **60** |

The raw findings come down to **1 Blocker and 16 Major action items**, plus the Nits grouped at the end. The matrix at the end maps every raw Blocker and Major to its action item.

## Verdict

**Stage A can't be built from this design yet.** Stage 9 found that an agent would have to make many impactful decisions on its own.

The core of the design holds up. All reviewers who judged scope agreed on that core:
- the stepped asset module (A2);
- asset state kept apart from the account code;
- the sale, purchase, mortgage and rent model;
- valuation at the second death;
- the probate rule in `ontario.ts`;
- no new config keys.

The trouble is at the edges. Stage 8 traced most findings to four features attached to the core:
1. the working-year cash flow;
2. the automatic Spending holds;
3. vehicle replacement and vehicle loans;
4. the cottage-designation comparison.

The goal of identical results after migration (G15) is the fifth, because it keeps two home models in the engine. Simplifying these closes about a dozen findings with less code, not more.

The merge itself also left work undone. The old base text still sits beside the new Stage A text in about 18 places. The decision ids (AD, AR, A, OA, BA) are never defined in the design. And the implementation plan's step order can't stay green, while every green push deploys.

## 🔴 Blocker

### CB1. The migrated home doesn't reproduce the version 1 numbers

* **Raised by:** ZO B1, Comp 6, IZO (option advice).
* **Issue:** Version 1 values the home at the second death with that year's start-of-year factor, (1+i)^t. A Stage A asset grows each year after price returns and is deemed sold at its end-of-year value, (1+i)^(t+1). That's one extra year of inflation. It breaks:
  * G15 (identical results after migration);
  * the design's statement that the two paths "produce the same numbers";
  * the migration acceptance test;
  * the protected reference plan, which has a $650,000 home.
* **Options:**
  1. One home model. Drop `estate.homeValueNom`, accept the small difference, and update the protected reference plan once, with the author's approval.
  2. An engine-side adapter that times the migrated home the old way.
  3. Value every deemed sale at its start-of-year value.

  Stage 8 recommends option 1 and advises against 2 and 3, which keep two home models.
* **Decision needed from the author** before build step 2.

## 🟡 Major action items

### C1. Working-year cash flow: reuse the year solver

* **Raised by:** ZO M1, ZO M7, IZO F1, IR M5, IR M7.
* **Issue:**
  * When "living costs while working" is empty (A8), the design never says how mortgages, asset costs, purchases, rent or sale money work in working years. That quietly brings back the rejected Alternative AF.
  * When the amount is entered, gaps never draw on the RRSP.
  * Held assets don't grow or amortize in working years.
  * The monthly field is used as a yearly need, with no × 12.
* **Fix (Stage 8, checked against the code):** run working years that have living costs through the existing `solveYear`, with both spouses working, rather than a new hand-built cash flow in `workingYear.ts`. Asset steps then run in every year, and the RRSP draw follows the strategy. With the field empty, the old path and the reference plan stay as they are. The ×12 and the growth gap close with it.

### C2. Tax on asset income while working

* **Raised by:** ZO M3, Critic M3, IZO F2, IR M9.
* **Issue:**
  * Large sale gains in working years are taxed at one flat marginal rate.
  * A rental loss in a working year gives no tax relief, because tax is floored at $0 and pay isn't in taxable income.
  * No rule covers a rental loss larger than the owner's other income.
* **Fix:** carry `grossPayNom` through `units.ts`. Tax a working spouse's extra income as `personalTax(pay + income) − personalTax(pay)`, worked out once, in `split.ts`. Stage 8 advises against a negative flat rate. Then state the rule for a loss larger than other income: it carries forward, or it's lost.

### C3. Purchases: financing, shortfall and price growth

* **Raised by:** Critic M1, ZO M2, Critic N4, IR M6, Comp 13.
* **Issue:**
  * The design doesn't say whether a purchase's cash out is the full price or the price less a new mortgage. One reading charges the buyer twice.
  * A future mortgage is nominal while the price is in today's dollars, grown to the purchase year.
  * The mockup labels it "Balance today".
  * Nothing stops a mortgage from exceeding the price.
  * An unfunded purchase still puts the asset into the legacy and probate at full value.
  * The brief and the design disagree on how the price grows, and the growth may be applied twice.
  * The downsize's new mortgage and the new home's owner and costs are undefined.
* **Fix:**
  * Cash out = price − the new mortgage.
  * The new mortgage is entered in today's dollars, as a share or amount of the price, and capped at the price.
  * Use one growth rule for prices.
  * Show the unfunded amount as a debt line in `estateSummary` (Stage 8's minimum form, not a full liability).
  * Define the downsize fields.

### C4. Asset events and the module interface

* **Raised by:** ZO M4, ZO N4, ZO N5, Critic M6, IZO F6, IR M3, IR M14, IR N10.
* **Issue:**
  * Nothing turns the shortcuts and vehicle replacements into plain sales and purchases.
  * The module's four calls have no usable signatures.
  * `startOfYear` never sees the first-death transfer.
  * Mortgage interest is needed at step 3 but worked out at step 7.
  * Assets aren't handed over when both spouses die in the same year.
  * Some names collide with existing ones.
* **Fix:**
  * Build one ordered event list in `normalizeInputs`.
  * Hook the asset calls into `prepareYear` (yearSolve.ts:100), after the death transfers.
  * Work out the year's amortization once at the start of the year and store it.
  * Use three calls: start of year, income, and end of year with the second death.
  * Write their signatures.
  * Cover the same-year death order.

### C5. Spending overlap: one mechanism

* **Raised by:** ZO M5, IZO F4, IR N11.
* **Issue:** three mechanisms do one job:
  * the category holds (AD14), which store derived amounts (`heldForAssets`);
  * the notice for group amounts and one total (A5);
  * the special insurance rule (A10).
* **Fix (Stage 8):** show A5's notice in every spending mode, and drop the holds and the insurance rule. This reverses AD14 and A10, so it needs the author.

### C6. Vehicles

* **Raised by:** Comp 5, IZO F5.
* **Issue:** no field holds a replacement's price or how it grows. A "vehicle loan" is used but never defined, and if it reuses the mortgage field, mortgage compounding would apply to a car loan.
* **Fix (Stage 8):** model replacement as a yearly cost that rises with inflation, and drop vehicle loans. This reverses part of AD21, so it needs the author. Otherwise, define the price field and the loan.

### C7. The cottage comparison

* **Raised by:** Comp 2, Comp 14, ZO N6, IZO F3.
* **Issue:** the comparison taxes the home, which has no original cost, and it handles only one cottage.
* **Fix (Stage 8):** cut it, and list it under BA-2 or Future Improvements. This reverses part of AD20, so it needs the author. Otherwise, require the home's cost when a cottage is held, and state a rule for two cottages.

### C8. The input contract, types and validation

* **Raised by:** Critic M2, Critic M12, Critic M13, IR M2, IR M10, IR M11, IR M12, Comp 15, Critic N2, Critic N7.
* **Issue:**
  * The brief's validation rules (a payment above the interest, sale after purchase, ranges, a sale that doesn't cover the mortgage) never reached `RealAssetInput`.
  * `PlanInputs` across schema versions is undecided, and `NormalizedInputs` has no asset type. The reference test and `couplePlan` pass version 1 inputs, so a missing `realAssets` must count as `[]`.
  * There's no field table or defaults per kind.
  * Readiness would reject the new optional fields, and its paths point at array indexes.
  * Import's own shape check is left out.
  * The units of `ratePct` and `pct` are unstated.
  * The money-unit naming convention breaks.
  * `RealAssetYear` is never shown.
* **Fix:**
  * Put a field table per kind into the Data contracts, with ranges, defaults and the validation rules.
  * Give rates as fractions.
  * Define the version 1 and version 2 types and `PlanDraftV2`.
  * Say which version number decides the import path.

### C9. Tax and estate details

* **Raised by:** IR M4, Comp 4, Critic M4, Critic M5, IR M15, Critic M14, IR M13.
* **Issue:**
  * Asset gains never update the carried-forward capital loss.
  * "Rental loss" means two different losses.
  * It's unclear whether the other strategies run with assets.
  * It's unclear whether rent and gains count in "fill lower brackets", Early RRSP and the surplus split.
  * The probate signature and formula are incomplete.
  * The mortgage-compounding claim goes beyond Interest Act s. 6.
  * End-of-plan property, mortgages and gains have no home in the year row that keeps the protected reference test intact.
* **Fix:**
  * Route asset gains through `gainsBy`.
  * Name the two losses: "rental operating loss" and "capital loss on selling a rental".
  * State that every strategy runs with assets.
  * State the income each strategy counts.
  * Write the probate formula and signature.
  * Reword the compounding source (check the statute text: BA-7).
  * Keep new figures in the `realAssets` record.

### C10. Results and screens: data paths

* **Raised by:** IR M16, IR M17, IR M18, Comp 12, Critic N1, IR N17.
* **Issue:**
  * The purchase shortfall and the three new breakdown rows have no field carrying their data.
  * SA21 puts the Rent source in the wrong file.
  * The stacked income chart can't draw negative net rent.
  * The new tab would open Settings, because `View()` has no `case 'assets'` (App.tsx:220–221).
  * The 14 breakdown rows aren't listed.
  * The reference CSV layout and the year-end conversion of the asset rows aren't stated.
* **Fix:** name every new field and where it's displayed; list the 14 rows; draw a negative rent as a separate line; add the tab case; state the CSV layout and the conversion.

### C11. Persistence and Import

* **Raised by:** Comp 3, ZO N1, IR M12.
* **Issue:** file 43 still dates Import and Export to stage 7, though both exist since 2026-11-26. The kept version 1 save and the `rp.plan.v2` key protect saves that can't exist until autosave arrives.
* **Fix:**
  * Correct file 43.
  * Wire the migration into Import in Stage A.
  * Drop the two-key rule until autosave exists (Stage 8 recommends this).

### C12. The merge: superseded text and tab lists

* **Raised by:** Critic M8, Comp 8, Comp 9, Comp 16, Comp 18, ZO N7, ZO N8, ZO N9.
* **Issue:** about 18 places still give the pre-Stage A answer beside the new one, including:
  * the legacy formula, the household identities, the autosave key and `schemaVersion`;
  * the Results and Estate tab text;
  * "Goal 1 counts only from the first retirement";
  * the tab lists and counts;
  * the phone layout in Future Improvements;
  * a duplicated persistence bullet;
  * "version 1" and "version 2" without "schema".
* **Fix:** edit the base text in place, rather than adding Stage A text beside it.

### C13. Decision ids and traceability

* **Raised by:** ZO M6, Comp 1, Comp 10, Comp 11, Critic M9, Critic M10, Critic N10, Critic N11.
* **Issue:**
  * AD, AR, OA, A and BA are never defined in the design.
  * The bare "AR2" clashes with the stage 5 review's AR2-S1.
  * "AD" is also an alternative's letter.
  * A1 and A6 are missing.
  * "The brief check" is undefined.
  * The 2026-11-26 decisions have no record link and no "chosen by" column.
  * A8–A10 and the valuation timing have no alternatives entry.
* **Fix:**
  * Define the families in one paragraph.
  * Rename the Assets recommendations (for example AAR) and decisions (for example AD → BD) where they clash.
  * State the content wherever an id is the only explanation.
  * Record the 2026-11-26 decisions in `docs/history/build-decisions.md` or this review folder.
  * Add the missing alternatives.

### C14. The build plan: step order, file lists, tests and gate

* **Raised by:** IR M1, IR M19, IR M20, IR M21, IR M22, IR M24, Comp 7, IR N3, IR N4, IR N5, IR N16.
* **Issue:**
  * The typecheck fails at steps 2 and 7.
  * Step 2 makes the migration and version 2 export live before the engine reads assets. An imported home would drop out of the legacy, and every green push deploys.
  * No test reads the new tax-case fixture.
  * The file lists miss these, among others:
    * `runPath.ts`;
    * `glossary.ts`;
    * three READMEs;
    * `AGENTS.md`;
    * `cross-tab.spec.ts`, which expects 11 breakdown rows.
  * Several SA changes have no named test.
  * The gate ignores today's findings.
  * BA-7 has three deadlines.
* **Fix:**
  * Reorder so each step compiles and nothing half-wired deploys: engine first, then schema and Import last, or behind one switch.
  * Make the file list a complete write list.
  * Name a test for every change.
  * Make the gate include this report's open items.
  * Give BA-7 one deadline.

### C15. Speed

* **Raised by:** ZO N2, Critic M15, IR M23.
* **Issue:**
  * The cap of 6 assets isn't backed by a measurement.
  * The claim that "the 1-second and 2-second targets still hold" contradicts the measured 2.55 s for tips.
  * The SA30 check is underspecified.
* **Fix:** time a 6-asset plan before fixing the cap. State the timing check's plan, machine and pass rule, consistent with the accepted deferral of the tips target.

### C16. Risks, glossary and wording

* **Raised by:** Critic M7, Critic M11, Critic M16, Critic M17.
* **Issue:**
  * The Risks table has no Stage A rows.
  * The Glossary has none of the Assets terms.
  * "Today" means both a unit and "version 1 behaviour".
  * "Real" clashes with "real dollars" and "real property", and `realAssets` holds vehicles while the probate rule depends on real property.
* **Fix:**
  * Add Stage A risks as one row group, not per item (Stage 8 advises against a new "optimistic growth" warning, which would need a config key).
  * Add the Glossary terms.
  * Rename `realAssets` (for example `ownedAssets`).
  * Use "today's dollars" only as a unit.

## 🟢 Nits (grouped)

* **Wording and naming:** Critic N15 ("short"), N16 (unsourced problem claims), N17 ("asset card"), N18 (subjective wording); IR N6, N7, N8, N9 ("Why" lines that give no reason), N12, N15, N18, N20.
* **Structure:**
  * Critic N6 (no Stage A success criteria), N8 (goal order), N9 (inconsistent "Stage A" headings and a broken anchor), N12 (thin CUJ coverage), N13 (Future Improvements), N14 (links), N19 (the dead FP Canada link);
  * IR N1 (stage status at line 1688), N2 (stale Known gaps rows).
* **Engine detail:** ZO N3 (the `placeSurplus` signature already fits), Critic N3 (which surplus came from a sale), Critic N5 (mortgage edge cases), IR N13 (which layer refuses a low payment), IR N14 (SA26 overclaims coverage), IR N19 (name existing code to reuse).
* **Data and display:** Comp 17 (whether "Money runs out" counts other property).

## Traceability matrix

| Raw finding | Action |
|---|---|
| ZO B1 · Comp 6 | CB1 |
| ZO M1 · ZO M7 · IZO F1 · IR M5 · IR M7 | C1 |
| ZO M3 · Critic M3 · IZO F2 · IR M9 | C2 |
| ZO M2 · Critic M1 · Critic N4 · IR M6 · Comp 13 | C3 |
| ZO M4 · ZO N4 · ZO N5 · Critic M6 · IZO F6 · IR M3 · IR M14 · IR N10 | C4 |
| ZO M5 · IZO F4 · IR N11 | C5 |
| Comp 5 · IZO F5 | C6 |
| Comp 2 · Comp 14 · ZO N6 · IZO F3 | C7 |
| Critic M2 · M12 · M13 · N2 · N7 · IR M2 · M10 · M11 · M12 · Comp 15 | C8 |
| IR M4 · M13 · M15 · Comp 4 · Critic M4 · M5 · M14 | C9 |
| IR M16 · M17 · M18 · N17 · Comp 12 · Critic N1 | C10 |
| Comp 3 · ZO N1 · IR M12 | C11 |
| Critic M8 · Comp 8 · 9 · 16 · 18 · ZO N7 · N8 · N9 | C12 |
| ZO M6 · Comp 1 · 10 · 11 · Critic M9 · M10 · N10 · N11 | C13 |
| IR M1 · M19 · M20 · M21 · M22 · M24 · N3 · N4 · N5 · N16 · Comp 7 | C14 |
| ZO N2 · Critic M15 · IR M23 | C15 |
| Critic M7 · M11 · M16 · M17 | C16 |

ZO = Stage 5, Comp = Stage 6, Critic = Stage 7, IZO = Stage 8, IR = Stage 9.

## What needs the author

Four action items reverse or change a decision the author made, so they can't be fixed without the author:
* **CB1:** which home model.
* **C5:** drop the category holds (AD14, A10).
* **C6:** vehicles as a yearly cost (AD21).
* **C7:** cut the cottage comparison (AD20).

C1 also changes the working-year design (A8). The rest are fixes to the document that need no new decision.
