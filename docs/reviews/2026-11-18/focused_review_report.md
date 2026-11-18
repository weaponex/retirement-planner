# Focused Review Report: Changes of 2026-11-18

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md`. Only the changes since the last full review (commit `eec78af`, 2026-11-17) are in scope, plus the changed parts of `config/SOURCES.md`, `docs/admin-config-guide.md` and `src/engine/config/keys.ts`.
**Date:** 2026-11-18
**Previous report:** `docs/reviews/2026-11-17/implementation_readiness_report_r2.md` (rating "Ready with fixes"). Settled decisions, including the author's switch to fixed returns, were not re-opened.

## Reviewer Status

| Reviewer | Status | Verdict |
| --- | --- | --- |
| `egm-implementation-readiness` | completed | Ready with fixes |
| `egm-codebase-details` | completed | Not ready |
| `egm-design` | completed | Ready with fixes |
| `egm-style` | completed | Ready with fixes |

All four reviewers ran on the first attempt, so none were retried. Some reviewers also read the committed `config/2026/*.json` files, `schema.ts`, `load.ts`, `tools/configCheck.ts` and `tests/unit/config.test.ts` to confirm their findings.

## Summary

- **Overall rating: Ready with fixes.** The fixed-returns switch was carried through cleanly. The goals, CUJs, `Result` and `PlanSummary`, warnings, stages, performance section, e2e assertions and file list all assume one run. No UI text, contract or test still uses paths, percentiles, typical or bad cases, seeds, volatility, progress or Cancel. The main problems are in the config layer:
  - the three key lists do not match;
  - life expectancy is a sourced value with no fetch step;
  - two Monte Carlo entries remain in validated config;
  - several of the new rules are underspecified (the LIF minimum below 71, the Ontario LIF maximum, the surtax base, and the per-class yield split).
- **Findings after deduplication:** 0 Blocker, 20 Major, 24 Nit.
- **Gating:** fix M1-M3, M8, M12, M14 and M15 before stage 0 is tagged, because they affect `config:check`, the stage-0 file list and the January admin run. Fix the rest before the stage that first uses them (stage 1 for the tax rules, stage 2 for the returns, yields and LIF, stage 4 for comparisons and warnings).
- **Severity disagreement:** `codebase-details` rated the key-list mismatch (M1) a Blocker. The other three reviewers rated it Major. It is a documentation fix, and `keys.ts` and `SOURCES.md` already agree with each other, so this report rates it Major.

## Answers to the Review Focus Questions

1. **Leftover Monte Carlo text.** Almost none remains in the design. The leftovers are:
   - "stress paths" at line 259;
   - `planning.stress_paths` in `keys.ts`, `schema.ts`, `SOURCES.md` and `planning.json`, and the `low_success` trigger in `warnings.json` (M3);
   - "the generator constants" at line 840;
   - stale wording in the Overview (line 16), Alternative B (599-603) and Alternative N (676), and the names `simulate/` and `runPath` (Nits).

   `pure-rand` remains only as a transitive dependency of `fast-check` in `package-lock.json`, which is fine. Files 35 and 59 are kept as "Removed" placeholders, so no file number shifted.
2. **Internal consistency of the changed sections.**
   - **Placement comparison and after-tax stock share:** both can be computed at fixed returns, but the readout's purpose has changed (M16).
   - **Warnings and tips:** all 8 have a defined trigger on one run. "Money runs out" now repeats the headline (M17).
   - **Per-class yields:** these make negative bond price returns and realized losses routine, and the design never says how losses are taxed (M5).
   - **Removed keys:** `ontario.lif.min_factor`, `ontario.lif.conversion.latest_age`, `log_volatility`, `market.correlation`, the per-type `yield.*` keys and `override_limit` appear nowhere outside `docs/reviews/`.
3. **Key lists.** `keys.ts`, `SOURCES.md` and the five JSON files match key for key: 34 federal, 15 Ontario, 14 market, 10 planning and 2 warnings keys. The design's key tree (line 261) lists only the 63 federal, Ontario and market keys and leaves out 12 keys (M1).
4. **Withdrawn gaps.**
   - **M11 and M14:** correctly withdrawn. No random number generator, paths or typical-path ranking remain.
   - **G3:** the substance is correct, because fixed returns use FP Canada's compound figures directly and need no arithmetic-mean add-back. But "G3" is not a finding ID in any 2026-11-17 report, and it collides with product goal G3 (M20).
   - **New gaps from the switch:** the generator was the only place that applied return overrides, so nothing now owns the yearly return per class (M6). Moving the LIF minimum onto the RRIF table exposes the missing under-71 formula (M4).
5. **Clarity of the new text.** The return terminology is inconsistent (M18). The admin guide and `SOURCES.md` still describe the old fetch-twice process in places (M14).

## Prioritized Findings

There are no Blockers.

### Major

#### M1. The design's key tree, `SOURCES.md` and `keys.ts` disagree on what "the complete list" is
- **Sources:** cd-B1, ir-F2, style-M-1, design-F4. **Severity:** Major (cd rated it Blocker).
- **Affected scope:** design 261, 837 (M9 row), 1089 (file 20); `SOURCES.md` 3-5; `AGENTS.md` 11-12; `tools/configCheck.ts`.
- **Problem:**
  - Line 261 calls its tree "the complete, authoritative list of rule-value keys" and says `SOURCES.md` "must list exactly these keys". `SOURCES.md` and `keys.ts` also list 12 keys that are not in the tree:
    - `planning.life_expectancy.female` and `.male`;
    - `planning.shapes`, `planning.presets` and `planning.stress_paths`;
    - `planning.comparison_bracket_target`, `planning.global_equity_weights`, `planning.stock_split.cad_share`, `planning.survivor_spending` and `planning.override_margin`;
    - `warnings.triggers` and `warnings.nudge_steps`.
  - Two of these, `planning.life_expectancy.*`, are sourced rule values (`authorDecision: false`), so the tree is incomplete even on its own terms.
  - The two keys added on 2026-11-18, `override_margin` and `global_equity_weights`, are named in the design text but missing from the tree.
  - `configCheck.ts` compares only `SOURCES.md` with `keys.ts` and never reads the design. Line 261 ("fails on any key missing from either side") and `SOURCES.md` 3-5 therefore overstate what the check does, and the "Fixed" status of M9 at line 837 is not quite true.
- **Fix:**
  - Extend line 261 to every config key, grouped as rule values and planning choices, with life expectancy flagged as sourced.
  - Name `keys.ts` as the code copy.
  - State that `config:check` compares `SOURCES.md` with `keys.ts` and that the design is kept in step by hand, or extend `configCheck` to parse the design.
  - Use the same scope phrase at 261, at 1089 and in `SOURCES.md` 3-5.

#### M2. Life expectancy is a sourced value, but no step fetches it
- **Sources:** ir-F2, cd-M1, style-M-2, design-F4. **Severity:** Major.
- **Affected scope:** design 257, 272, 1105-1112 (file 22); admin guide steps 1, 3 and 7 (lines 11-22, 34-35); `SOURCES.md` 120-121.
- **Problem:**
  - Line 257 and file 22 say every `planning.json` value is an "author decision".
  - Admin guide step 1 nulls every rule value, step 3 fetches only `federal`, `ontario` and `market`, and step 7 says `planning.json` is "not fetched".
  - The FP Canada life-expectancy tables would therefore be nulled each January and never refetched, and the app would ship them as unfetched.
- **Fix:** Either move both keys to `market.json`, or keep them in `planning.json` and:
  - mark them as sourced at 257 and in file 22;
  - put them under the market rule at 272 (fetch once, spot-check);
  - add them to admin guide step 3;
  - change step 7 to "Planning choices other than life expectancy are not fetched".

#### M3. Monte Carlo entries remain in validated config
- **Sources:** ir-F1, cd-M2, cd-M13, style-M-12, design-N3. **Severity:** Major.
- **Affected scope:** design 259 ("stress paths"), 1103-1112 (file 22); `keys.ts` 122/148; `schema.ts` 60-70; `SOURCES.md` 124; `planning.json` 174-226; `warnings.json` 7-10.
- **Problem:**
  - `planning.stress_paths` is still required by `KEY_SPECS`, so writing `planning.json` as file 22 describes fails `config:check`.
  - `warnings.triggers` has 9 entries, including `low_success`, but the design has 8 warnings.
  - Both entries are validated, and `AGENTS.md` forbids agents from changing validated entries.
  - File 22 also omits `global_equity_weights` and `override_margin`.
- **Fix:**
  - The author removes `low_success` and `planning.stress_paths`. Then remove the key from `keys.ts`, `schema.ts` and `SOURCES.md`.
  - Drop "stress paths" from line 259.
  - List all planning keys in file 22.

#### M4. The LIF minimum (and an early RRIF minimum) cannot be computed below age 71
- **Sources:** ir-F3, cd-M4. **Severity:** Major.
- **Affected scope:** design 246, 300, 303, 517 (`conversionAge [55..71]`), 1159, 1180-1181; `federal.json` 486-518; `SOURCES.md` 77.
- **Problem:**
  - `federal.rrif.min_factor` covers only ages 71-95. Its locator gives `1 / (90 − age)` for ages 70 and under, but no key holds the 90, and line 274 bans rule numbers in code.
  - The LIF minimum used to have its own key and now depends on this table, so every LIF opened at 55-70 has no minimum the engine may compute.
  - The "95 or older" clamp is also unstated.
- **Fix:**
  - Either store computed factors for ages 50-70 in the table (with the formula noted in the locator), or add a key such as `federal.rrif.min_factor_base_age` (value 90).
  - State the under-71 rule, the 95+ clamp and the start-of-year age at line 300.
  - Add a `liraLif.test.ts` case at age 60.

#### M5. Per-class yields make negative bond price returns routine, and capital losses are undefined
- **Sources:** ir-F4, cd-M10, design-F3; escalates r2 M15. **Severity:** Major.
- **Affected scope:** design 293, 306, 325, 327, 335, 1183; `SOURCES.md` 112; `market.json` (bonds 0.032).
- **Problem:**
  - The price return is the total return less fees less the yield. XBB's weighted-average coupon is typically above FP Canada's 3.2% bond return, so the bond price return would be negative every year.
  - Non-registered bonds would then realize a capital loss at every rebalance or sale. The design taxes only "realized gains" and never says whether losses offset gains in the same year, carry forward, or are floored at zero.
  - At fixed returns this becomes a steady yearly drift. It pushes the placement comparison, the headline of CUJ 3, for a modelling reason rather than a tax one.
  - r2 M15 (sheltered yields are not reinvested) and the undefined effect of the withholding haircut are now systematic, because every class has a yield. Without reinvestment, sheltered bonds earn roughly nothing.
- **Fix:**
  - State the loss rule. For example: "net realized losses offset same-year taxable gains; any remainder carries forward against future gains, never against other income, and offsets deemed gains at the final return".
  - Add a carry-forward field to the engine state.
  - Define how sheltered yields are reinvested, net of withholding on foreign dividends.
  - Add a `config:check` warning when a class's `yield` is greater than its `geometric_return`.
  - Add tests in `nonRegistered.test.ts` and `rebalance.test.ts`. Close this together with M15 and M6 before stage 2.

#### M6. No file owns the effective yearly return for each class
- **Sources:** ir-F5, cd-Nit (blend, fees), style-M-8, design-N6. **Severity:** Major.
- **Affected scope:** architecture diagram (around 213); 318, 321, 327-328, 450; file 24 `configDefaults` (1134); the removed file 35 (1218); the unit-test table (1399-1414).
- **Problem:** The removed `generatePaths` was the only function that took `overrides`. Nothing now says which function computes:
  - the global return from `components.*` × `planning.global_equity_weights`;
  - the substitution of user overrides;
  - the fee, including whether it is applied as `r − fee` or `(1 + r)(1 − fee) − 1`, and whether an override is before or after fees;
  - the split into yield and price.

  Other gaps:
  - Nothing says what `configDefaults()` returns for `global_equity`.
  - FP Canada publishes no single global figure, so the optimistic-return limit (328, 450, "FP Canada's figure for that class") has no base for global stocks. The claim that 0.5 pt "matches the deviation margin FP Canada allows planners" has no citation.
  - No test covers any of this.
- **Fix:**
  - Add a file such as `src/engine/invest/returns.ts` with `classReturns(cfg, overrides, fees)`. It returns `{ total, yield, price, incomeType }` for each class.
  - State the blend formula: a linear weighted sum, which is exact at fixed returns with yearly rebalancing (0.6 × 6.4 + 0.3 × 6.6 + 0.1 × 7.5 = 6.57%).
  - Choose the fee formula.
  - State that `configDefaults` and the optimistic-returns check both use the blended figure.
  - Cite the guideline section for the 0.5-point margin.
  - Add a `returns.test.ts` row that tests the limit at +0.5 and +0.51 points.

#### M7. The age-based life-expectancy default has no defined fill rule
- **Sources:** ir-F6, cd-Nit. **Severity:** Major.
- **Affected scope:** design 477, 536, 1269, 1304.
- **Problem:** The default is now an age-table lookup ("at or below their current age"). The design does not say:
  - which age is used (the age in `planStartYear`, or today's age);
  - when the target is filled, given that an empty plan has no birth year;
  - whether a later edit to the birth year or sex overwrites a value the user has edited;
  - what happens above the table's last row.
- **Fix:**
  - Specify the rule. For example: age = `planStartYear − birthYear`; fill the target when both birth year and sex are set and the target is empty; never overwrite a user edit; above the top row, use the top row.
  - Name the function, for example `defaultLifeExpectancy(sex, age, cfg)` in `state/defaults.ts`.
  - Test it at ages 63 and 60 and above 100.

#### M8. OAS and CPP amounts are marked `indexed: false`
- **Sources:** cd-M3 (confirmed by the synthesizer in `federal.json`). **Severity:** Major.
- **Affected scope:** `federal.json` 181 (`oas.base_at_65`), 363 (`cpp.max_at_65`), 391 (`cpp.survivor.flat_under_65`), 419 (`cpp.survivor.max_combined`); design 251, 271.
- **Problem:** Under line 251, non-indexed values "stay fixed in future dollars". These four amounts are indexed to CPI in law. Left as they are, OAS and the CPP survivor amounts would stay flat in nominal terms for 30-40 years, which badly understates income in later years.
- **Fix:** The author sets `indexed: true` on all four before validation. Add a sentence at 251 or 271 saying the benefit amounts are indexed.

#### M9. The Ontario LIF maximum is incomplete
- **Sources:** cd-M5. **Severity:** Major.
- **Affected scope:** design 302; `SOURCES.md` 97.
- **Problem:** Under Schedule 1.1 (new LIFs), the maximum is the greater of the FSRA table factor × the opening balance and the fund's investment earnings in the previous year. The maximum is also pro-rated by month in the first year. The table applies only while CANSIM V122487 stays at or below 6%, and that condition is recorded only in `SOURCES.md`. The design uses the table alone.
- **Fix:**
  - At 302, write `max = max(factor[age] × startBalance, previous year's investment earnings)`, and add the first-year pro-rating by months.
  - State that the engine assumes the 6% condition holds.
  - In `SOURCES.md` 97, turn the condition into a January check for the admin.

#### M10. The base and order of the Ontario surtax and Tax Reduction are undefined
- **Sources:** cd-M6. **Severity:** Major.
- **Affected scope:** design 289-291.
- **Problem:** "Ontario basic tax" is not defined. In T4127 it is the tax after non-refundable credits, and on the ON428 return it is also after the dividend tax credit. The design also does not give the order or the formula of the Tax Reduction: `max(0, 2 × basic − (basic tax + surtax))`, applied after the surtax, with the Health Premium added afterwards and not reduced.
- **Fix:** Define basic Ontario tax as bracket tax minus non-refundable credits minus the Ontario dividend tax credit. Give the reduction formula, and state the order: surtax, then reduction, then Health Premium.

#### M11. The CPP survivor cap is an open decision recorded only in `SOURCES.md`
- **Sources:** cd-M7. **Severity:** Major.
- **Affected scope:** design 313; `SOURCES.md` 72; `federal.json` 415-422.
- **Problem:**
  - The design caps the survivor benefit at "the maximum pension" (1507.65/month), but the config holds the combined maximum (1531.56/month).
  - `SOURCES.md` says "the author decides which applies".
  - The source URL in the JSON entry differs from the one in `SOURCES.md`.
- **Fix:** The author picks one cap. If it is the retirement maximum, delete `federal.cpp.survivor.max_combined` everywhere. Otherwise, change line 313 to name `max_combined`. Make the JSON URL match `SOURCES.md`.

#### M12. Existing config code differs from the design's file entries
- **Sources:** cd-M8, ir-Nit 5. **Severity:** Major.
- **Affected scope:** design 270, 1116-1134 (files 23-24), 1353-1358.
- **Problem:**
  - `src/engine/config/keys.ts`, `tools/lib.ts` and `tests/unit/config.test.ts` exist but are in no file entry, which breaks the write allowlist.
  - `constants.ts` also holds `WEIGHT_SUM_TOLERANCE`, `CONFIG_YEAR_MIN` and `CONFIG_YEAR_MAX`, which the design does not list.
  - The code's `configStatus(config, today)` also returns `unfetchedKeys`. The design shows `configStatus(today)` without it.
  - `configCheck` checks both directions and supports `--strict`, which the admin guide uses. Design 1357 says it checks one direction only.
  - The ×12 conversion in `load.ts` (`toAnnual`) is not mentioned in file 24.
  - Line 503 does not say whether `cppAt65Today` is a monthly or a yearly figure. My Service Canada shows the monthly one, so a wrong guess is a 12× error.
- **Fix:**
  - Add the three files to the file list, and list the extra constants.
  - Update the `configStatus` signature and the `configCheck` behaviour.
  - State in file 24 that the loader converts `CAD_per_month` to `CAD_per_year` (a null value stays null).
  - State the unit of `cppAt65Today`.

#### M13. The new rules have no tests
- **Sources:** cd-M11. **Severity:** Major.
- **Affected scope:** design 1399-1414.
- **Problem:** The test table has no rows for:
  - the Health Premium at each band edge;
  - the surtax at both thresholds;
  - bracket rows with their own `indexed` flag ($150k and $220k stay fixed);
  - the global blend and the override-margin limit at +0.5 and +0.51 points;
  - the life-expectancy row lookup;
  - the LIF minimum under 71;
  - the key-list match.

  The ×12 test exists in `config.test.ts` 117 but not in the plan.
- **Fix:** Add these rows to `personalTax.test.ts`, `liraLif.test.ts`, `returns.test.ts` (M6) and `config.test.ts`.

#### M14. The admin guide and `SOURCES.md` still describe fetching everything twice
- **Sources:** style-M-3, style-M-5, cd-Nit (admin guide). **Severity:** Major.
- **Affected scope:** admin guide 5-7, 16-22, 21, 23-29; `SOURCES.md` 7-8.
- **Problem:**
  - The admin guide's introduction (5-7) and `SOURCES.md` 7-8 ("Both fetch sessions … fetch each rule value") say every value is fetched twice.
  - Step 3 is headed "Fetch twice" and does not say which session fetches `market.json`.
  - Step 3 sends the spot-check to step 5, but step 5 covers only disagreements.
  - Step 4 says "each config file" when only `federal.json` and `ontario.json` are compared.
- **Fix:**
  - Introduction: "Tax and benefit rules are fetched twice, independently, and compared; market assumptions are fetched once and spot-checked."
  - Step 3: say that session A also fetches `market.json` and session B does not.
  - Give the spot-check its own step, or add it to step 5.
  - Step 4: name `federal.json` and `ontario.json`.

#### M15. `SOURCES.md` says the FP Canada URLs it lists return 404
- **Sources:** cd-M9, style-M-6. **Severity:** Major.
- **Affected scope:** `SOURCES.md` 36, 12-14, 103-114, 120-121.
- **Problem:** Line 36 says "FP Canada's own pages return 404; the guidelines … are on institutpf.org", but every FP Canada row points at `fpcanada.ca`. Lines 12-14 also say every URL was opened and checked. A fetch session gets either a 404 or an instruction that contradicts the row.
- **Fix:** Replace the URLs with the institutpf.org addresses, or narrow line 36 to the pages that actually fail. Then restate the claim at 12-14 to match what was checked.

#### M16. The placement dollar figure now mixes a tax effect with a hidden allocation effect
- **Sources:** design-F1. **Severity:** Major.
- **Affected scope:** design 86 (success criterion), 152 (CUJ 3), 336, 417, 689, 781.
- **Problem:**
  - The mix is counted at face value. A preset that puts stocks in the TFSA and bonds in the RRSP therefore holds more stock after tax.
  - At fixed returns, extra stock is pure gain with no downside. "Growth tax-free first" will win almost every time, and part of its edge is allocation, not tax.
  - Line 336 still says the readout "makes any extra hidden risk visible", but the results no longer contain any risk to make visible.
  - The success criterion will reward testers for quoting the mixed figure.
  - Corner solutions are not a concern, because there is no optimizer, only the fixed presets.
- **Fix:**
  - Rewrite line 336: the after-tax stock share is now the only sign that a placement changes the real mix.
  - Add a fixed template to `explanations.ts` (file 50) for when the two shares differ by more than a threshold: "Part of this difference comes from holding more stocks after tax. Steady returns reward that without showing its risk."
  - Update the risk row at 781.

#### M17. "Spending covered: Yes" at steady returns can give false assurance, and "Money runs out" repeats the headline
- **Sources:** design-F2. **Severity:** Major.
- **Affected scope:** design 406, 456, 469-473, 1349.
- **Problem:**
  - A steady compound-return path is close to a median outcome, so many real market sequences would do worse. The on-screen label says the returns are steady averages but not what that implies.
  - Rows end in the second death year, so "Money runs out … or within the last 5 years" fires exactly when spending is not covered. It adds nothing to the headline.
- **Fix (without re-opening fixed returns):**
  - Redefine "Money runs out" as a near miss. For example: investable balances fall below N years of spending before the second death, with N in `warnings.json`.
  - Optionally, add return overrides at ±`planning.override_margin` to the nudge steps, so a tip can say "if returns are 0.5 pt lower, spending runs short from 2039".
  - Add one sentence to the label and the disclaimer placeholder (file 50) saying that real markets vary and many sequences would do worse.

#### M18. The return terminology is inconsistent, and the on-screen label says "average"
- **Sources:** style-M-7. **Severity:** Major.
- **Affected scope:** design 19, 69, 321, 328, 406, 450, 778, 1313.
- **Problem:** The same idea appears as "steady average return", "fixed compound return", "expected compound return", "expected return", "FP Canada's figure", "guideline" and "steady averages". The values are geometric, and lay readers take "average" to mean the arithmetic mean. The label at 406 is user-facing.
- **Fix:**
  - Use "fixed compound return" throughout the design.
  - Use one plain phrase on screen, for example "the same return every year (FP Canada's long-run estimate)".
  - Add "Compound (geometric) return" to the Glossary.

#### M19. The `list` value kind used in `keys.ts` is missing from the design
- **Sources:** cd-M12, style-M-13, ir-Nit 4. **Severity:** Major (two of three reviewers).
- **Affected scope:** design 259; `keys.ts` 8-17, 91.
- **Problem:**
  - `ontario.surtax.thresholds` and `.rates` use a `list` kind (`[number, …]`) that the design's list of value shapes does not include.
  - No key uses `schedule`.
  - The `brackets` comment in `keys.ts` omits the per-row `indexed?`.
- **Fix:** Add "a list of numbers `[n, …]`" to line 259. Drop `schedule`, or mark it reserved. Add `indexed?` to the comment.

#### M20. The withdrawn gap "G3" is a phantom ID that collides with goal G3
- **Sources:** style-M-10, design-F5 (rated Nit). **Severity:** Major (because the question of withdrawing G3 was raised directly).
- **Affected scope:** design 848, 68.
- **Problem:** No 2026-11-17 report has a finding G3; the r2 report uses M1-M18 and N1-N21. The only G3 in the design is the product goal "Both deaths modelled" (68). The add-back idea came from round-1 F16 and goldfish Issue 17, and "arithmetic-mean add-back" is defined nowhere. The withdrawal itself is correct.
- **Fix:** Re-label the row with its real source (for example "F16 / goldfish 17") and explain the term in one clause, or delete the row.

### Nit

| ID | Sources | Location | Problem and recommendation |
| --- | --- | --- | --- |
| N1 | ir, design, style | design 840 | The M18 row still says `constants.ts` holds "the generator constants". Drop the phrase. |
| N2 | ir, design, style | design 830 | "18 Major … open" ignores the withdrawals. r2 N12 and N13 (benchmark) and N16 (`stressPaths`) are now moot. Say so next to the Known gaps table. |
| N3 | ir, style | design 425, 454-463 | The tip rule covers only warnings "measured on the plan's results". Say what the Inputs-based warning (optimistic returns) shows: its related inputs, with no rerun. Rename the column "Basis", with the values "Plan results" and "Inputs". |
| N4 | ir | design 240, 1266-1267, 1325 | With no Cancel, state that Recalculate is disabled while `status === 'running'`, and that edits made during a run make the arriving result stale (dimmed). |
| N5 | ir | design 570, 1205 | `EngineIntegrityError` cannot identify a failure inside a tip rerun. Add `nudge?: { inputPath, direction }`. |
| N6 | ir, style-M-9 (downgraded) | design 240, 558, 602 | "A run takes about a second" and "about 100 runs" are unmeasured, yet they justify dropping Cancel. Use "The target is under 2 seconds ([Performance](#performance))". Give the run count as 1 + 2 variants + 2 × related inputs. |
| N7 | ir | design 336, file 31 (1191) | The effective withdrawal tax rate behind the after-tax stock share is ambiguous. Pin four things: which plan's rate the baseline uses; what tax the numerator includes; whether the denominator includes deemed final-return income; and which year's balances it is applied to. A large DB pension could otherwise give a rate above 100%. |
| N8 | ir | `SOURCES.md` 109 | `market.global_equity.yield` bakes in the 60/30/10 weights at fetch time. Store the three component yields, or note that a change to `planning.global_equity_weights` requires a refetch. |
| N9 | ir, design | design 16 | The Overview still promises help with "how to shift from growth toward safer investments". Add "(in version 1, only its effect on average returns and tax)". Name the default shape in `defaults.ts`. |
| N10 | cd, style | design 271; admin guide 45-46 | The bullet is labelled "OAS" but covers CPP too; rename it "Monthly amounts". OAS is indexed quarterly, so the January quarter × 12 understates a full year by about 0.5-1%. State that this is an accepted approximation. The admin guide note should mention CPP and move into step 6. |
| N11 | cd | `SOURCES.md` 115; design 780 | The treaty withholding rate is applied to the whole 60/30/10 global yield. Note this under the accepted simplification at 780. |
| N12 | cd | design 304 | Ontario allows the 50% unlock from age 55, within 60 days of the transfer. State that the engine always applies the full `unlock_share`. |
| N13 | cd, style | `SOURCES.md` 91, 96 | `ontario.probate.threshold` is a lump sum but has the unit `CAD_per_year`, and the Health Premium mixes rates and dollar caps. Add a `CAD` unit, or explain the choice. |
| N14 | cd | design 259 | For the phase-in shape, state that income below the first row's `from` pays 0 and that "income" means taxable income. |
| N15 | cd, style | `SOURCES.md` 103 | The locator "Return assumption: cad_equity" uses the internal id. Use the page's section ("section 5 c: Canadian equities"). |
| N16 | cd, design, style | design 244, 673-676, 862, 1211, 1220 | The names `simulate/`, `simulate()` and `runPath`, and Alternative N's "per-path conversion", suggest Monte Carlo. Rename (for example `runVariant`, "per-year conversion"), or add one sentence saying the names are historical. |
| N17 | design, style | design 599-603 | Alternative B's title ("or a live fixed-return preview") and its cons are stale. Rewrite the cons around the tip reruns. The decision stands. |
| N18 | design | design 605-609, 661-671 | No alternative entry records the replaced approach (generated returns plus stress paths) with its pros and cons. Add one, so that Alternatives L and M have something to refer to. |
| N19 | design | design 69 | "Always give the same results" lost the qualifier "in the same browser". `Math.pow` and `Math.log` may round differently across engines. Restore it. |
| N20 | design | design 6 | The review status describes 2026-11-17. Add that the 2026-11-18 revision has had only this focused review. |
| N21 | style-M-11 (downgraded; extends r2 N9) | design 413, 1223-1224 | "Variants" and "baselines" again name the same runs, and the other withdrawal strategy is not a baseline. Use "variant" for all comparison runs and "baseline" only for `same_mix`. |
| N22 | style-M-4 (downgraded) | `SOURCES.md` 35-36, 91-92; admin guide step 3 | The admin guide never says that probate is read by hand or that the fsrao.ca pages need curl. Add a bullet to step 3. |
| N23 | style | design 786-804 | The Glossary has no entries for compound return, first shortfall year, clawback years, override margin, variant and baseline, cash yield, or spot-check. Add them. |
| N24 | style | design 122, 272, 321, 325, 424, 429, 1097-1100, 1112; `SOURCES.md` 10-38, 97; admin guide 14 | Wording fixes. Each item gives the place, then the change. **Line 122:** the O13 row has two colons; reword it. **Line 272:** "a wrong answer for certain" is vague; say why tax errors matter more than market errors. **Line 321:** use a parenthesis for "sequence risk (…)". **Line 325:** make "here" specific. **Line 424:** "was dropped when random returns were removed". **Lines 429 and 1112:** say "dated per entry", because the blend and the margin date from 2026-11-18. **File 21:** remove the overlapping "FP Canada returns" wording. **Blank lines:** add them before "## Glossary", before `SOURCES.md` "## Planning" and before "### Verification Plan". **`SOURCES.md` 10-38:** split into "Current status" and a dated change log, and fix the nested "except … except" at 12-14 and the wording at 19. **`SOURCES.md` 97:** turn the CANSIM note into a January action. **Admin guide step 2:** say that TO CHOOSE rows stay unfetched. |

## Effect on Earlier Findings

| ID (r2) | Status after this change | Notes |
| --- | --- | --- |
| M1 (`Result` contract) | Open, recommendation stale | The r2 recommendation asks for probabilities, typical and bad legacy, and stress-path rows, none of which exist now. Restate it, for example: `Result = { revision, configStatus, plan: { rows, summary }, comparisons: { placement, strategy } (each currentChoice or { taxDiff, legacyDiff, opposite }), afterTaxStockShare: { plan, baseline }, warnings, tips, grossPerPhase }`. `compare.ts` (1229) computes whether the legacy goal is met, but `PlanSummary` (531-532) has no `legacyGoalMet` field. Add one. |
| M5 (nominal lifetime tax) | Open | It now also covers `totalShortfallNom` (531), a new headline figure. Variants still return summaries only. |
| M9 (missing keys) | Mostly fixed | The source of the LIF minimum is resolved by line 303, apart from the gap below age 71 (this report's M4). The "Fixed" row at 837 overstates what `config:check` does (this report's M1). |
| M11 (RNG seeding) | Withdrawn, correctly | — |
| M14 (path population, typical) | Withdrawn, correctly | — |
| M15 (sheltered yields) | Open, now systematic | Close it with this report's M5 and M6 before stage 2. |
| "G3" (add-back) | Withdrawn, correct in substance | The ID is wrong (this report's M20). |
| N12, N13, N16 | Moot | Benchmark and `stressPaths` removed. |
