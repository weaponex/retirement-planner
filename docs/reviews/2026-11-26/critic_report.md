# Goldfish Review Report: Stage 7 (Critic Review)

**Target:** `E:\Documents\Projects\retirement-planner\docs\designs\retirement-planner.md` (lines 1-1655)

**Focus:** the Stage A (Assets) amendment: headings with "Stage A" or "Assets", goals G11-G15, the Assets non-goals, OA1-OA7, CUJ 7, decisions A2-A10, and alternatives Z-AQ. The rest of the range was read as the existing system.

**Standards:**
- `egm-design` and `egm-structural` used `C:\Users\charlie\.claude\plugins\cache\egm\egm\0.1.1\resources\document_standards\feature-spec-standard.md`.
- `egm-style` used its persona's own audit vectors, because no style standard was supplied.

**Not repeated:** findings already in `zoom_out_report.md` (B1, M1-M7, N1-N9) and `comprehension_report.md` (#1-#18) from 2026-11-26. If a finding sharpens one of them, it says so.

## Reviewer Status

| Reviewer | Status | Raw findings |
| --- | --- | --- |
| `egm-design` | completed | 7 Major, 7 Nit |
| `egm-structural` | completed | 5 Major, 9 Nit |
| `egm-style` | completed | 8 Major, 11 Nit (21 items; 20 is one Nit with two parts, both merged elsewhere) |

**After merging and removing duplicates:** 0 Blocker, 17 Major, 19 Nit.

**Notes on the merge:**
- Where two lenses gave the same issue different severities, the higher one is kept (Glossary, decision traceability).
- Style #19 ("machinery", line 371) is merged into M4, which covers the same sentence.
- **One conflict between reviewers:** `egm-design` lists "the semi-annual compounding rule and its source are stated" under what holds up. `egm-style` (M14) says the source does not support the rule as worded. M14 is kept, because it makes a specific legal point that can be checked. The style reviewer says it relied on its own knowledge of the Interest Act, so check it against the statute.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### Blockers

None.

### Major

### M1. A purchase's financing is undefined, and a future mortgage uses different dollars from the price - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 391-393 (units), 670-671 (step 0c), 677-680 (step 5), 1038, 1044, 1047 (`owned`, `mortgage`, `downsize.newMortgage`). Mockup Assets.html lines 80 and 90.
* **Discrepancy Description**:
  - Step 5 counts "this year's purchases" as asset cash out, and step 0c "starts any new mortgage". The design never says:
    - whether the cash out is the full price or the price less the mortgage;
    - whether the mortgage's proceeds count as cash in.
  - One reading charges the buyer twice: once for the full price, and again through the payments.
  - The price is entered in today's dollars and grown. The mortgage is a nominal amount "at purchase" that is never indexed. Example: a downsize priced at $600,000 today, in 2041, grows to about $810,000. A "$300,000" mortgage typed in the same dollars as the price ends up smaller than intended.
  - The mockup labels the new mortgage "Balance today".
  - Nothing stops a mortgage from being larger than the price.
* **Rationale & Recommendation**: G13 and CUJ 7 rest on purchases and downsizes. SA26 needs a reference plan built "from this amended design only", and these gaps leave that work to guesswork.
  - State the ledger: cash out = the grown price − the new mortgage's principal. Payments then start at step 7.
  - Enter a future mortgage in today's dollars (grown with the price) or as a percentage of the price. Keep the nominal statement form only for mortgages that exist at the plan start.
  - Add the rule mortgage ≤ price.

### M2. The brief's asset validation rules never reached the data contract - Severity: Major
* **Reviewer Lens:** `egm-design`, `egm-style`
* **Affected Scope:** `RealAssetInput`, lines 1033-1050 (the only input in Data contracts with no bracketed ranges). Line 1044 cites AD18. The rule appears only in the test plan (line 2535). Brief lines 164, 181 and 382.
* **Discrepancy Description**: These rules decided in the brief are missing from the contract:
  - a payment at or below the interest is refused;
  - the sale year comes after the purchase year;
  - no sale after the second death;
  - a sale in the second-death year replaces the deemed sale.

  Also missing:
  - ranges for `growth.pct`, `ratePct` and `replaceEveryYears`;
  - purchase and sale years inside the plan's years;
  - a downsize year after any planned purchase of the home;
  - what happens when a sale is underwater (the mortgage is larger than the sale value), so that "what the sales leave" (line 680) is negative.
* **Rationale & Recommendation**: A mortgage that never pays off grows for ever. The invariant at line 1151 still passes, while the legacy is silently eaten. The step 7 cap on the last payment never fires. Import checking (line 1564) has no schema to check these fields against.
  - Add bracketed ranges and cross-field rules to `RealAssetInput`.
  - Say which rules block the readiness check and which are rejected on import.
  - Define an underwater sale: the shortfall is cash out that year, funded like a purchase.

### M3. A rental loss in a working year gives no tax relief - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 654 (the tax is never below 0), line 707 (working years step 5), G12 (line 93), Alternative AL (lines 1523-1527).
* **Discrepancy Description**:
  - In working years, asset income is taxed at the flat working marginal rate, with a floor of $0.
  - Pay is entered after tax and is not part of `TaxableIncome`.
  - So a negative net rent reduces nothing. Alternative AL rejected flooring rental losses because the large-mortgage early years are "the usual case". Those years are mostly working years, so the rejected option returns for working owners.
  - This is separate from zoom-out M3, which covers large positive income.
* **Rationale & Recommendation**: Two options:
  - When gross pay is known, tax the year as `personalTax(pay + asset income) − personalTax(pay)`.
  - Otherwise, allow negative tax at the marginal rate on a net rental operating loss.

  Either way, add a working-year test case for a rental loss.

### M4. "The variants leave assets out" can be read as comparing strategies without assets - Severity: Major
* **Reviewer Lens:** `egm-design` (with `egm-style` #19)
* **Affected Scope:** Line 371. Comparisons (lines 750-757). G5.
* **Discrepancy Description**:
  - Line 371 lists "the variants" among the "machinery" that never sees an asset.
  - Read literally, the other strategies and the placement baseline would run with no rent, sales, mortgages or purchases. They would then be compared with a plan that has assets.
  - "Machinery" is also vague.
* **Rationale & Recommendation**:
  - Reword: "every variant carries the same `realAssets` and asset events; only the withdrawal strategy or the placement differs".
  - Replace "machinery" with the specific account code (placement, rebalancing, and so on).
  - Add a property test: with a strategy that matches the user's choice, the asset rows are identical in every variant.

### M5. The strategies' income bases don't say whether rent and asset gains count - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 555 (Fill lower brackets: which income is topped up), line 559 (Early RRSP: which spouse), line 565 (surplus split).
* **Discrepancy Description**:
  - The top-up base does not list net rent or realized sale gains.
  - In a cottage-sale year, "Fill lower brackets first" could top up RRSP money to the bracket level on top of a gain of about $340,000 included. That money would be taxed at the top rate and possibly clawed back.
  - The comparison would then penalize the strategy for what is really a gap in the rules.
  - Early RRSP's "lower net income" test and the surplus split have the same gap for rent.
* **Rationale & Recommendation**:
  - State that net rent (negative amounts included) and realized asset gains (at the inclusion rate) are part of the top-up base and the Early RRSP test.
  - State that rent is part of the surplus split.
  - Add a test case for a sale year under fill_brackets.

### M6. Mortgage interest is needed at step 3 but worked out at step 7 - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 356-358 (`income()` and `endOfYear()`), 672-676 (step 3), 689-693 (step 7).
* **Discrepancy Description**:
  - Net rent subtracts the year's mortgage interest before the solve. The payments that produce that interest run only at step 7.
  - So `income()` must either re-run the amortization or read a value that doesn't exist yet. The step 5 cash out needs the year's payments too, which are capped in the payoff year.
  - It is not said whether the payments use the balance after a January 1 sale or purchase (step 0c).
* **Rationale & Recommendation**: This ordering is where the A2 module boundary would leak.
  - State that `startOfYear` runs the year's amortization once, after the 0c events, and stores the interest, principal and payments.
  - `income()` and the cash out read those values. `endOfYear` only applies growth and posts the balance.
  - The schedule is fixed, so the bisection is unaffected.

### M7. Risks & Mitigations has no Stage A rows, and asset growth has no "optimistic" warning - Severity: Major
* **Reviewer Lens:** `egm-design`, `egm-structural`, `egm-style`
* **Affected Scope:** Risks table (lines 1582-1604; only "Schema change after a rollback", line 1603, comes near Stage A). Warnings (lines 802-814). Alternative AE (lines 1481-1485). BA-1 to BA-6 (lines 1679-1684).
* **Discrepancy Description**: The standard requires the spec to name its failure modes and mitigations. None is recorded for Stage A. Unrecorded risks include:
  - User-entered growth rates drive both headline goals, with no limit check. Returns get an "Optimistic returns" warning; property does not, though for many couples it is worth more than all their accounts.
  - Double counting between Spending and Assets when the A5 tick is wrong.
  - The reference-plan risk ("the AI shares the misreading") for the asset rules.
  - The A8 two-path working year.
  - Property is excluded from "Money runs out".
  - The accepted approximations:
    - no transaction costs (BA-4);
    - no capital cost allowance (BA-1);
    - no mortgage renewal (BA-6);
    - the always-principal-residence rule (BA-2);
    - a flat working marginal rate;
    - property tax indexed to inflation.
  - Original cost is entered by hand and goes straight into the final-return tax.
  - The migration must give the same results as version 1 (zoom-out B1).
  - The 6-asset cap is tied to speed (zoom-out N2).

  BA-1 to BA-6 sit in Known gaps with no impact or mitigation. Alternative AE rules out config defaults, but it does not rule out a warning based on the user's inputs.
* **Rationale & Recommendation**:
  - Add one risk row per item, giving the impact and the mitigation or acceptance, and link the BA-n id where one exists.
  - Add an "optimistic asset growth" warning, based on inputs, that fires when nominal growth is above inflation + a margin. Use an author-decision trigger in `warnings.json` and list it for stage 6.

### M8. The merge left superseded text in the base sections, so the document gives two answers - Severity: Major
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:** This sharpens comprehension #8 and #9 and zoom-out N7 and N8: the same pattern runs through the whole amendment. Places not reported yet:
  - line 26;
  - line 198 (CUJ 1 skips Assets);
  - lines 612 and 652 (no qualification for A8);
  - line 712 against line 1079;
  - lines 717-719 (the probate and legacy formulas still use "the home"; the legacy formula is never restated);
  - line 725 ("is replaced");
  - line 838 (`schemaVersion: 1`) and line 1025 ("was 1");
  - line 960 (`homeToday` against `propertyToday`);
  - line 1068 ("the master design's");
  - line 1073 (`rp.plan.v1` against `rp.plan.v2`);
  - lines 1124-1125 (the household identities have no asset cash; line 1153 amends them only in words);
  - line 1176 (the mockup list has no Assets.html, which is also not `.dc.html`);
  - line 1186 (no colour for Rent or the "Property less mortgages" band);
  - line 1236 ("11 rows" and "seven sources", against 14 at line 1274);
  - lines 1242 and 1272 (the Estate tab is described twice);
  - line 1250 (Goal 2 "including the home");
  - line 1254 (the Balances band list);
  - the "(new)" markers at lines 665 and 689.
* **Discrepancy Description**: The base passages were never edited, and "(Stage A)" subsections were added on top of them. An implementer who reads lines 717-719 or 1124-1125 builds the wrong estate and the wrong invariants.
* **Rationale & Recommendation**:
  - Rewrite the base text in place: Death and estate steps 3-5, the v1 `PlanInputs` block, the household identities, the Results and Estate tab text, and the mockup list and colour list.
  - Remove "is replaced", "becomes", "was", "(new)" and "the master design's".
  - If history matters, add one "Changed by Stage A" note per section, or a "Superseded by ..." link at each stale passage.

### M9. The author's Assets decisions and rejections can't be traced to a record - Severity: Major
* **Reviewer Lens:** `egm-structural`, `egm-design`, `egm-style`
* **Affected Scope:** Line 271 (the record locations stop at 2026-11-24). Lines 275-284 (the A table). Line 282 (A8). Line 1290. Alternatives Z-AQ.
* **Discrepancy Description**:
  - Line 1290 says each "By author" rejection is recorded where the Decisions section says. Line 271 has no entry for 2026-11-26, so the 18 author rejections in Z-AQ have no linked record.
  - The A table has no "Chosen by" column. A2-A7 have no attribution; A8-A10 put it inside the cell text.
  - A8 is labelled "Mechanical rule", yet it was confirmed by the author. Line 150 defines "mechanical" as chosen without asking the author.
  - "This keeps G15 ... unchanged" should read "keeps G15 met".
  - This sharpens zoom-out M6 and comprehension #11, against the standard's Alternatives Rule.
* **Rationale & Recommendation**:
  - Add a 2026-11-26 sentence to line 271 linking the brief section "Assets tab (amendment, 2026-11-26)", the RFC and the review folder.
  - Add a "Chosen by" column with a date and source for each row.
  - Drop "Mechanical" from A8.
  - Define "the brief check" once, with a link.

### M10. Several Assets decisions have no alternatives entry - Severity: Major
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Lines 279-284 and 400. Line 694 (valuation timing). BA-5. Alternatives Z-AQ.
* **Discrepancy Description**: These decisions record no rejected options:
  - A8 (an empty field keeps the old rule): against a required field, or one pipeline.
  - A9 (Goal 1 includes working years): against a separate working-years result, or retirement years only.
  - A10 (insurance category): against splitting the category, or holding it once any asset has insurance.
  - A4 (a replaced vehicle stays one asset).
  - Rent and costs always rise with inflation: against following the asset's growth.
  - Deemed-sale valuation at the end-of-year value: against the start-of-year value (ties to zoom-out B1).
  - 50/50 as the only joint share.
  - A5's tick box: against a notice only, or a per-group split.
* **Rationale & Recommendation**: Add short Pros / Cons / Decision entries with a concrete trade-off, at least for A8, A9, A10 and the valuation timing.

### M11. The Glossary was not updated for the terms users see on the Assets tab - Severity: Major
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:** Lines 1606-1633. Line 1608 (the Glossary feeds the `glossary.ts` tooltips). Line 1626.
* **Discrepancy Description**:
  - No entries exist for: principal residence, personal-use property, deemed sale, net rent, rental operating loss, purchase shortfall, downsize, living costs while working, cottage designation, and "Property less mortgages".
  - "Original cost (adjusted cost base)" still covers non-registered investments only.
  - "Probate ... on assets passing through a will" now collides with the tab's meaning of "asset".
* **Rationale & Recommendation**:
  - Add the terms, using the rental-loss names that settle comprehension #4.
  - Widen "Original cost" to cover assets, and say that a home's cost is optional.
  - Reword probate as "property passing through a will".

### M12. The money-unit convention breaks, and `originalCostPaid` is wrongly called "a new kind of amount" - Severity: Major
* **Reviewer Lens:** `egm-style`, `egm-structural`
* **Affected Scope:** Lines 392-393 and 835. Lines 893 and 896 (`originalCostToday`). Line 500 (DB nominal amounts).
* **Discrepancy Description**:
  - Non-registered accounts already hold cost paid (`originalCostToday`), and DB `fixed` amounts are already nominal statement amounts. So "a new kind of amount" is wrong.
  - Line 835 says every money field ends in `Today` or `Nom`. Stage A adds `Paid`, plus fields with no suffix (`balanceAtStart`, `paymentMonthly`).
* **Rationale & Recommendation**:
  - Drop "a new kind of amount".
  - State one convention for statement-nominal amounts, which are never deflated, and list every field it covers, the existing ones included.
  - Either suffix the mortgage fields `...Nom`, or name them as exceptions at line 835.

### M13. The unit of `ratePct`, `growth.pct` and "X" is not stated, and the formula needs a fraction - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 393-399, 1041 and 1044. Compare line 433 (`rate` 0 to 1), line 882 (`[0..0.6]`) and `keepPct [0..100]`.
* **Discrepancy Description**: The names suggest percentages. Line 396's "(1 + inflation) × (1 + X) − 1" only works if X is a fraction.
* **Rationale & Recommendation**: State the unit and range in the contract (for example `pct [-20..20], percent`) and write X ÷ 100. Or rename the fields to a 0-1 `rate`.

### M14. The mortgage-compounding claims go beyond the cited source - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 691 (via AD18), line 735, line 1520, brief line 382. Lines 728-735 against line 730.
* **Discrepancy Description**:
  - Interest Act s. 6 requires a blended-payment mortgage to state its rate "calculated yearly or half-yearly, not in advance". It does not require semi-annual compounding, and variable-rate mortgages commonly compound monthly.
  - Line 730 says the sources are "to be read ... when this amendment is built". Yet lines 728 and 731-735 already state their content as fact.
  - `egm-design` lists the rule under what holds up. This finding contests that; check it against the statute.
* **Rationale & Recommendation**:
  - Line 735: "fixed-rate Canadian mortgages are quoted with half-yearly compounding (s. 6 requires the rate to be stated yearly or half-yearly)".
  - Line 1520: "...overstates interest on a fixed-rate mortgage quoted half-yearly".
  - Note variable-rate mortgages as a known gap.
  - Mark the unread sources "to be confirmed in SA-n".

### M15. The Timing claims contradict the design's own measurements - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 1170 ("the 2-second tips target still holds") and line 1550 ("already near the 2-second target"), against line 1116 (tips take 2.55 s on 45-year plans).
* **Discrepancy Description**: The design states as fact a target that its own measurements show is already missed. This sharpens zoom-out N2 (how the cap is justified): here the issue is the factual contradiction.
* **Rationale & Recommendation**:
  - Line 1170: "measured against the 1-second and 2-second targets; tips already exceed 2 s on 45-year plans (line 1116)".
  - Line 1550: "already exceed the 2-second target on 45-year plans".

### M16. "Today" means both a unit and "version 1 behaviour" - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 26, 28, 67, 74, 282 ("current rule"), 685, 703, 704, 727 and 1083. Line 376 defines "today's dollars".
* **Discrepancy Description**: Line 704, "the after-tax yield ... that today go straight to savings", reads like a statement about units. Once merged, "today" also goes stale.
* **Rationale & Recommendation**: Use "in version 1", "before Stage A" or "as in retired years". Keep "today" for the unit only.

### M17. "Real" clashes with "real dollars" and "real property", and `realAssets` holds vehicles - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 28 ("a real cash flow"). Line 370 (`realAssets`). Line 728 ("mortgages on real property only"). Line 1532 ("the real choice") and line 1538 ("its real cost"). Probate rule AD22 (lines 698 and 728).
* **Discrepancy Description**:
  - In finance, "real" means inflation-adjusted, the opposite of "nominal".
  - `realAssets` includes vehicles, but the probate deduction depends on the real-property distinction. An implementer could deduct every `realAssets` mortgage.
* **Rationale & Recommendation**:
  - Rename the code name (for example `ownedAssets`), or add one sentence: "`realAssets` includes vehicles; 'real property' means home, cottage, rental and real-estate 'other' only".
  - Replace "real cash flow", "real choice" and "real cost" with "full" or "actual".

### Nits

### N1. The reference-file CSV layout doesn't cover the Stage A fields - Severity: Nit
* **Reviewer Lens:** `egm-design`, `egm-structural`
* **Affected Scope:** Lines 1014-1019, 1056-1061 and 1069. SA27 (line 2575).
* **Discrepancy Description**:
  - SA27 adds only "realAssets.<id>.<field> after estate.<field>".
  - Nothing places `assetCashInNom`, `assetCashOutNom` or `purchaseShortfallNom`.
  - No cell format is given for the `ownerShares` array.
  - Nothing says whether the "0 when absent" rule applies to asset ids.
  - The CSV name `realAssets.<id>.<field>` is the same as the input path but means something else.

  G10 requires the second reference plan to match within $1 per cell, so two sessions could disagree on the format rather than the numbers.
* **Rationale & Recommendation**: Add these rules to Data contracts, and use a separate prefix for the columns (for example `realAssetsYear.<id>.<field>`).

### N2. Whether `estate.homeValue*` exists in v2 normalized inputs is unclear - Severity: Nit
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Lines 717, 1001, 1026 and 1067.
* **Discrepancy Description**: Line 1026 removes `homeValueToday` from v2, and line 1001 derives each `...Nom` field from a `...Today` field. Yet line 1067 says the engine still reads `estate.homeValueNom`. This sharpens zoom-out B1 and comprehension #6.
* **Rationale & Recommendation**: State whether the field exists in v2 `NormalizedInputs`, and fix line 717 to match.

### N3. Which part of the surplus "came from sale money" is undefined - Severity: Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 685-688. This sharpens zoom-out N3.
* **Discrepancy Description**: Money is fungible, so the split needs a stated rule.
* **Rationale & Recommendation**: For example: the sale part = min(surplus, the sale's net cash after its own tax), split by the seller's ownership shares.

### N4. The brief and the design disagree on how a purchase price grows - Severity: Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 391 (the design uses the deflator). Brief line 155 (the asset's own rate).
* **Discrepancy Description**: No decision explains the change from the brief.
* **Rationale & Recommendation**: Add one sentence stating the choice and the reason.

### N5. Mortgage edge cases are missing from the non-goals - Severity: Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 134-136 and 393.
* **Discrepancy Description**:
  - Prepayment penalties on a sale's payoff are not listed.
  - A January 1 balance is often entered from a statement dated later in the year.
  - Interest on a loan for an investment "other" asset (s. 20(1)(c)) has no deduction path.
* **Rationale & Recommendation**: List each one as not modelled, or as help text.

### N6. The success criteria have nothing for Stage A - Severity: Nit
* **Reviewer Lens:** `egm-design`, `egm-structural`
* **Affected Scope:** Lines 138-146. Line 1170.
* **Discrepancy Description**: G11-G15 have no tester or speed criterion, although OA1 plans tester sessions.
* **Rationale & Recommendation**: Add, for example, "enter one asset and name its effect on the legacy". Point the speed criterion at the 6-asset case, or say that the version 1 criteria are unchanged on purpose.

### N7. The mockup and the contract disagree - Severity: Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Assets.html lines 72-76, 80 and 90. `costs.utilitiesYearToday`.
* **Discrepancy Description**: The home editor has no Utilities field. The mortgage is labelled "Balance today", but the amount is nominal.
* **Rationale & Recommendation**: List both under "Where the mockups are overridden", or fix the mockup.

### N8. The goals are out of order and in the wrong group - Severity: Nit
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Lines 81-111.
* **Discrepancy Description**:
  - The order reads G1-G8, G11-G15, then G9-G10.
  - G12 and G15 are correctness goals but sit under Product goals.
  - G10 has a "(Stage A)" sentence added inline.
* **Rationale & Recommendation**: Regroup or renumber, and give every Stage A addition the same style.

### N9. Stage A headings are inconsistent, and the line 6 anchor reaches only one of them - Severity: Nit
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:**
  - Line 6.
  - Headings at lines 67, 273, 340, 389, 658, 723, 1021, 1147, 1258 and 1449.
  - Line 127 (a bold pseudo-heading).
* **Discrepancy Description**:
  - About nine heading patterns are in use.
  - The Problem subsection (line 67) comes after "What this design does about it" (line 61).
  - The Assets tab subsection comes after Results, although the tab sits between Savings and Spending.
  - `#assets-stage-a` resolves only to line 340.
* **Rationale & Recommendation**:
  - Use one pattern, for example "Assets (Stage A): <topic>".
  - Reorder the two subsections to match the document and the app.
  - Make line 6 plain text or a list of links.

### N10. The id "AD" names both an alternative and a decision family - Severity: Nit
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Line 1475 (Alternative AD). Line 1485 (AE cites AD13). This sharpens zoom-out M6 and comprehension #1.
* **Discrepancy Description**: A reader may look for an "Alternative AD13". Alternatives from AR onward would also clash with the AR ids.
* **Rationale & Recommendation**: Give the Assets alternatives their own prefix, or rename the decision family as part of the M6 legend fix.

### N11. The OA rows are inconsistent - Severity: Nit
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:** Lines 185-191.
* **Discrepancy Description**:
  - OA1, OA5 and OA7 put full questions in the Topic cell.
  - OA1, OA3, OA4, OA5 and OA7 have no link to the decision that settles them.
  - OA7's answer leaves out the survivor percentage, which is in A7.
  - OA6 repeats "(author)" and the date.
* **Rationale & Recommendation**:
  - Shorten the topics.
  - Add links to A3, A4, A5, A7 and Verification.
  - Mention the survivor percentage in OA7, and trim OA6.

### N12. CUJ coverage for Assets is thin, and CUJ 7 is less exact than the others - Severity: Nit
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:** Lines 193-235 (CUJ 1 at line 198, CUJ 5, and CUJ 7 at lines 233-235). Line 1276.
* **Discrepancy Description**:
  - CUJ 7:
    - It gives no home value or mortgage.
    - "The after-tax legacy changes" has no direction.
    - "Property band" does not match the band name "Property less mortgages".
    - "Money saved" matches no row in the breakdown.
    - It has no timing clause and no change-summary line.
  - CUJ 1 skips the Assets tab.
  - CUJ 5 doesn't mention the v1-to-v2 migration.

  This sharpens comprehension #12.
* **Rationale & Recommendation**:
  - Make CUJ 7 exact: values, band and row names, the change-summary line, and the 1-second timing.
  - Add Assets to CUJ 1, and the migration to CUJ 5.
  - Consider adding a journey for a rental loss or a working-year purchase.

### N13. Future Improvements doesn't list the deferred Assets items - Severity: Nit
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:** Lines 1643-1654. BA-1 to BA-6 (lines 1679-1684). Alternative AA.
* **Discrepancy Description**: BA-1 to BA-6 are classed "Future improvement" but are not listed. Also missing: HELOC, reverse mortgage, capital cost allowance, and selling an asset when money runs out.
* **Rationale & Recommendation**: Add one bullet linking BA-1 to BA-6, plus the deferred items.

### N14. Cross-references lack links, and there is a stray blank line - Severity: Nit
* **Reviewer Lens:** `egm-structural`, `egm-style`
* **Affected Scope:** Lines 130 and 1479 ("Known gaps says so"). Line 1484 (AGENTS.md). Line 1068 ("the master design"). Line 1286 (a double blank line).
* **Discrepancy Description**: These references have no link and no id.
* **Rationale & Recommendation**: Link `#known-gaps-from-review` with the BA-n id, link AGENTS.md, name the section line 1068 refers to, and remove the blank line.

### N15. "Short" reads as "partial year" - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** G14 (line 98), A9 (line 283) and line 1278. Compare the pro-rating of the first year at line 378.
* **Discrepancy Description**: The design already has partial years, so "a short working year" is ambiguous.
* **Rationale & Recommendation**: Use "a working year with a living-cost shortfall".

### N16. Problem and Overview claims have no source or calibration - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 69, 71, 72 and 77. Compare line 1224.
* **Discrepancy Description**:
  - "For many Ontario couples" has no source.
  - "Roughly $150,000" gives none of its assumptions.
  - "The most common late-life money move" has no source.
  - "Hundreds of thousands" is unquantified.
  - "Both headline results are wrong" conflicts with line 1224, which calls the same approach "an accepted simplification".
* **Rationale & Recommendation**:
  - Cite a source or drop "many" and "most common".
  - State the tax assumptions behind the $150,000.
  - Use the CUJ 7 figures instead of "hundreds of thousands".
  - Say "can be materially off", and drop the rhetorical closing clause.

### N17. "Asset card" doesn't match the surrounding terms - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 1265 against lines 1262-1264.
* **Discrepancy Description**: The surrounding text uses table, row and editor. In the mockup, the note sits in the editor.
* **Rationale & Recommendation**: Use "The asset editor says ...".

### N18. Some alternatives use subjective or rhetorical wording - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Alternatives AA, AE, AI, AL and AN.
* **Discrepancy Description**:
  - AE: "sensible", and "no single source covers".
  - AI: "for no reason".
  - AL: "tax code", and the unsourced "usual case in its first years".
  - AN: "Far less code: ..." joins two unrelated points.
  - AA: "fails as soon as".
* **Rationale & Recommendation**: Calibrate or drop each one. For example: "the author found no single source", "with no offsetting benefit", "the tax function", and "cannot express a rule that reacts to the plan's state".

### N19. The FP Canada link is dead - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 1640. Line 800 cites "section 3 d".
* **Discrepancy Description**: The link returned 404 on 2026-11-26.
* **Rationale & Recommendation**: Replace it with the URL of the 2026 Projection Assumption Guidelines. Check the line 800 citation against the 2026 PDF (`private/review-sources/fpcanada-2026-projection-assumption-guidelines.pdf`); no reviewer checked it.

---

## Coverage notes

- `egm-design` read the persona, the standard, lines 1-1655, both earlier reports, Assets.html and the Assets lines of the brief.
- `egm-structural` read the same, plus lines 1656-1707 and SA27.
- `egm-style` read the range, both reports, and the brief and mockup by search.
- No reviewer opened SOURCES.md, admin-config-guide.md, build-decisions.md, the earlier review folders or the two HTML review sources. Each said that none of its findings depended on them.
- No reviewer checked any figure against the FP Canada 2026 PDF.
- M14 relies on the style reviewer's knowledge of Interest Act s. 6, not on the statute text.
