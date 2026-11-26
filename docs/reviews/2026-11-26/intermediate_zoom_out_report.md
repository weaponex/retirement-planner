# Goldfish Review Report: Stage 8 (Intermediate Zoom Out Review)

**Target:** `E:\Documents\Projects\retirement-planner\docs\designs\retirement-planner.md` (lines 1-2617; not edited since Stage 5)

**Focus:** the Stage A (Assets) amendment: G11-G15, OA1-OA7, CUJ 7, A2-A10, alternatives Z-AQ, BA-1 to BA-7, SA1-SA30.

**Standard:** `C:\Users\charlie\.claude\plugins\cache\egm\egm\0.1.1\resources\document_standards\zoom-out-standard.md`

**Earlier reports read first (their findings are not repeated here):** `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md` (all in `docs\reviews\2026-11-26\`).

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |

**Severity breakdown:** 0 Blocker, 5 Major, 1 Nit.

## Overall verdict

The core of the amendment is the right size and shape. That core is:

- the A2 stepped module;
- `realAssets` kept apart from the account code;
- the sale, purchase, mortgage and rent model;
- valuation at the second death;
- the probate rule in `ontario.ts`;
- no new config keys.

The amendment is too big at its edges. The three earlier stages raised 1 Blocker, 24 Majors and 46 Nits between them, and most of those findings come from four features attached to the core:

1. The working-year cash flow (A7, A8, A9, AD15).
2. The automatic Spending holds (AD14, A5, A10).
3. Vehicle replacement and vehicle loans (AD21).
4. The cottage-designation comparison (AD20).

Each of these features creates edge cases, and the earlier stages mostly propose patches that add more surface. If these four are simplified or cut, about a dozen earlier findings close with less code, not more. G15's "identical results" goal (zoom-out B1) is the other source of complexity, because it keeps two home models in the engine.

The reviewer checked the reuse claims against the code. The files checked were `src/engine/solver/yearSolve.ts`, `project/runPath.ts`, `project/workingYear.ts`, `tax/split.ts`, `units.ts`, `project/death.ts` and `state/persistence/exportImport.ts`.

## Prioritized Findings (Blockers -> Major -> Nits)

### F1. Working years with living costs can reuse the existing year solver instead of a new cash flow - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** G14 (lines 98-105); A8 (line 282); "Working years" (lines 701-707); line 656; SA14 (lines 2454-2457); SA15. Related: zoom-out M1, M3, M7; critic M3.
* **Discrepancy Description**: The design adds a second, hand-built cash flow to `workingYear.ts`. It has its own surplus and gap rules (non-registered, then TFSA, never the RRSP), its own shortfall order and a new working-year invariant. Zoom-out M1 option 2 goes further and refactors `workingYear.ts` into a pipeline with a pluggable living-cost source. The retired-year solver already handles a working spouse:
  * after-tax pay counts as cash (`yearSolve.ts:172`);
  * their income is taxed at a flat `workingMarginalRate` (`yearSolve.ts:260-261`, `split.ts:63`);
  * they are left out of splitting (`yearSolve.ts:273`), bracket filling (`fillBrackets.ts:65`) and early RRSP draws (`earlyRrsp.ts:48`).

  The solver is gated only by `householdRetired` and the dispatch at `runPath.ts:49-52`.
* **Rationale & Recommendation**: A pre-retirement year with living costs entered is a solver year in which both spouses work. The need is the living costs plus the savings set. Running those years through `solveYear` gives all of the following with no new code:
  * purchases and sale money;
  * the shortfall order and `placeSurplus`;
  * the household identity;
  * gap funding in the strategy's order.

  This closes zoom-out M7 (the RRSP is never drawn) without a new rule, and it removes the new working-year identity from SA15. When the field is empty, today's `workingYear.ts` path is unchanged, so the reference plan is safe.

  Recommended changes:
  1. Replace lines 701-707 with: "when living costs while working are entered, years before the first retirement run through the year solver with both spouses working; the need is living costs plus the account savings set, placed as deposits".
  2. Keep A8 for the case where the field is empty.
  3. Close M1's undefined middle case with M1 option 1: readiness requires the field once any asset has a flow before the first retirement.

  Two things to check: contribution timing (contributions land at year end today) and the year-one sale rerun (`compare.ts:110`).

### F2. Fix the working-spouse tax once, in `split.ts` - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** line 654; line 707; G12. Related: zoom-out M3; critic M3; `units.ts:42-62`.
* **Discrepancy Description**: Zoom-out M3 (large gains taxed at a flat rate) and critic M3 (no relief for a rental loss) describe one defect. Critic M3 offers a second mechanism, a negative tax at the flat rate, which would add a second tax path. There is also a missing input: `normalizeInputs` drops gross pay once it has derived the marginal rate (`units.ts:61-62`). As a result, the "tax with the income minus tax without it" method has no input today.
* **Rationale & Recommendation**: After F1 there is a single place where a working spouse is taxed. Recommended changes:
  1. Carry `grossPayNom` into `NormalizedInputs`.
  2. When gross pay is present, tax a working spouse as `personalTax(gross + other) − personalTax(gross)` in the one working-spouse branch of `split.ts`. This covers working years and the still-working spouse in a retired household.
  3. When only a marginal rate was entered, keep the flat rate, floored at 0.
  4. Record "no rental-loss relief without gross pay" as a BA gap.

  Do not adopt critic M3's negative-flat-rate option.

### F3. Cut the cottage-designation comparison - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** non-goal (line 132); line 729; `cottageDesignation` (line 1064); Estate tab (line 1273); SA10 `atSecondDeath` (line 2428); SA24 (line 2549); Alternative AM (lines 1529-1533); BA-2 (line 1680).
* **Discrepancy Description**: The comparison is a what-if inside a non-goal ("choosing the principal residence"), and it needs a second final-return run. The earlier stages found three holes in it:
  * the home's cost is optional, and a migrated home has none (comprehension #2);
  * it is undefined when there are two cottages (comprehension #14, zoom-out N6);
  * it is undefined for an "other" property.

  Their fixes add a readiness rule, a selection rule and a fallback.
* **Rationale & Recommendation**: The output answers a question the user cannot act on in the tool. The feature costs a contract field, a rerun path, an Estate-tab line and tests, and it weakens the "home cost optional" simplification. Remove it from line 729, line 1064, line 1273, SA10, SA17 and SA24. Record it under BA-2 or Future Improvements. Alternative AM's decision then becomes "home always the principal residence (BA-2)".

### F4. Collapse the Spending holds into one notice - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** A5 (line 280); A10 (line 284); lines 1029-1031; lines 1268-1269; SA18 (lines 2486-2487); Alternative AH (lines 1499-1503). Related: zoom-out M5; critic M7 (double counting).
* **Discrepancy Description**: The design has three ways of handling costs that appear on both Spending and Assets:
  * automatic $0 holds with stored amounts (AD14);
  * a notice plus a tick in group or one-total mode (A5);
  * a special rule for insurance (A10).

  Zoom-out M5 is right to derive the holds rather than store them, but it then adds a fingerprint on the A5 tick, which is another persisted mechanism. The hold rules also depend on vehicle loans (`auto_payment`), which are undefined (comprehension #5).
* **Rationale & Recommendation**: Use A5's notice in every mode:
  * Spending lists the asset costs entered on Assets that commonly overlap. It finds them with the same category mapping, as a pure function.
  * The user edits their own amounts, and one tick clears the notice.
  * Drop `heldForAssets`, `setAssetCostHold()`, the A10 rule and "Counted on Assets".

  If the author keeps the holds, adopt M5's derivation without the fingerprint. The tick then clears itself whenever the derived list changes, which needs a comparison but no stored hash.

### F5. Make vehicle replacement a yearly cost and drop vehicle loans - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** `replaceEveryYears` (line 1048); `nextReplaceYear` (line 1055); step 0c (line 666); line 1262; line 1268 (`auto_payment`); SA10 `endOfYear`; SA18 (line 2487); Alternative AN (lines 1535-1539); reference plan "a vehicle replaced twice" (line 1165). Related: comprehension #5; zoom-out M4.
* **Discrepancy Description**: Vehicle replacement brings in:
  * an event kind;
  * a replacement price and growth that are not defined;
  * a loan that is not defined and would reuse half-yearly mortgage compounding;
  * a scheduling field in state;
  * a Spending hold;
  * a reference-plan feature.

  All of this is for an asset that, as AN itself notes, almost never has a taxable gain.
* **Rationale & Recommendation**: Model a vehicle as value, growth and costs, plus an optional "replacement cost per year (today's dollars)" that rises with inflation like other costs. Drop the events and the loan; the auto payment stays in Spending and is handled under F4. The author rejected AN, so offer this as a cheaper way to reach the same aim. Comprehension #5 and zoom-out M4 show what the current form costs.

### F6. The asset module needs three calls, not four - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** lines 354-359; A2; SA10 (line 2428); line 1054 (`RealAssetState`). Related: critic M6; zoom-out M4.
* **Discrepancy Description**: Take two earlier proposals together: zoom-out M4 (one event list from `normalizeInputs`) and critic M6 (amortize once in `startOfYear`). With both adopted, every asset flow for a year is fixed at `startOfYear`, and `income()` only reads stored values. The rate and payment held in `RealAssetState` are inputs, not state.
* **Rationale & Recommendation**: Use three calls:
  1. `startOfYear(state, ctx) → RealAssetYear`, which returns the year's events, amortization, rent, costs and gains.
  2. `endOfYear`, for growth only.
  3. `atSecondDeath`.

  This adopts M4 and critic M6 together, and Alternative AA does not need to be reopened.

## Earlier findings and mitigations recommended NOT for adoption

- **Zoom-out B1, options 2 and 3 (a timing adapter, or deemed sales at the start of the year):** each adds a second valuation convention. Adopt option 1 instead:
  1. Keep one home model.
  2. Drop `estate.homeValueNom` (line 1067; SA6, line 2389).
  3. Restate G15.

  The cost is a one-time, author-approved update to the estate cells of the protected reference plan. That is better than keeping two paths permanently.
- **Zoom-out M1, option 2 (pipeline refactor of `workingYear.ts`):** F1 reaches the same result by reusing `solveYear`.
- **Zoom-out M2's per-asset "purchase gap" liability (interest, repaid from the sale, excluded from probate):** this adds new state and a new invariant. Adopt its minimum form instead: subtract the cumulative purchase shortfall from the after-tax legacy, as one line in `estateSummary`.
- **Zoom-out M5's A5 fingerprint:** see F4.
- **Zoom-out M7's first option (a strategy-ordered draw built into `workingYear.ts`):** F1 provides this at no extra cost. If F1 is not adopted, take M7's second option and state the restriction.
- **Comprehension #2, #14 and zoom-out N6 (patches to the cottage comparison):** cut the feature instead (F3).
- **Critic M3's negative flat-rate tax:** see F2.
- **Critic M7's one risk row per item, and its new "optimistic asset growth" warning:** each risk row duplicates a BA entry. The warning would need a new `warnings.json` trigger, but Stage A promises "86 keys, no new keys" (line 2599). Instead, add one risk row for "accepted asset approximations" that links BA-1 to BA-7. Leave asset warnings to stage 6, where line 2355 already puts them.
- **Critic M10 (alternatives for eight more decisions):** add alternatives only for A8 and for the timing of deemed-sale valuation. The other decisions are low-stakes, and writing alternatives for them would be documentation for its own sake.
- **Critic N12's extra end-to-end journeys (a rental loss, a purchase during working years):** the second reference plan already covers both. Keep CUJ 7 as the one end-to-end test.
- **Critic M2's ranges, also written into the data contract:** keep the rules in one place, the Zod schema in SA8 (line 2400 already has four of them). Have the contract point to the schema, so the rules are not kept in three places.

## Earlier findings that point to a simpler design (recommended for adoption)

- **Zoom-out N1 and comprehension #3:** autosave does not exist yet, so drop the `rp.plan.v2` key and the kept v1 save (lines 1077 and 1084). The reviewer confirmed that `exportImport.ts` exists with `EXPORT_SCHEMA_VERSION = 1`, so the migration only has to run on import.
- **Zoom-out M4:** build one event list in `normalizeInputs`. F5 makes it smaller still.
- **Zoom-out N2, N3 and N5:**
  * the cap on asset count is justified by layout, not speed;
  * `placeSurplus` gets blended shares rather than a new signature;
  * fold `ownership.ts` into another file and drop the `depreciating` flag.
- **Critic M1:** cash out = price − new mortgage principal. For a future purchase, enter the mortgage as a percentage of the price. This also removes the separate "mortgage ≤ price" rule.
- **Critic M6:** amortize once in `startOfYear` (see F6).
- **Critic M8 and N9:** rewrite the base text in place instead of stacking "(Stage A)" overlays on it. This removes the outdated second answers at lines 255, 712, 717-719, 980, 1073, 1124-1125 and 1174.
- **Critic M5:** this probably resolves itself in SA12 once rent goes into `otherOrdinary`. Add one sentence and one sale-year `fill_brackets` test, not new rules.
- **Zoom-out M6, comprehension #1 and critic N10:** add one legend for the ID prefixes, and rename the AR and AD families, which clash.

## Code references verified by the reviewer

- `src/engine/solver/yearSolve.ts` (lines 154-172, 260-273)
- `src/engine/project/runPath.ts` (lines 49-52)
- `src/engine/tax/split.ts` (line 63)
- `src/engine/units.ts` (lines 42-62)
- `src/engine/project/death.ts` (line 106)
- `src/state/persistence/exportImport.ts` (line 10)
