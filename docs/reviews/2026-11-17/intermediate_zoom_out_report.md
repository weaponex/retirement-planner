# Goldfish Review Report: Stage 8, Intermediate Zoom Out Review

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md` (lines 1-1237, full file)
**Mode:** REVIEW
**Context read by the reviewer:** `zoom_out_report.md` (Stage 5), `comprehension_report.md` (Stage 6), `critic_report.md` (Stage 7). The author has not edited the document since Stage 5, so all Stage 5 findings are still open. They are referred to below as "Stage 5 #n" and are not repeated.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed (first attempt) |

Note: the persona file is `agents/zoom_out.md` (with an underscore). The reviewer found and used it.

## Summary

- **Blocker:** 0
- **Major:** 7
- **Nit:** 6

The main risk now is not any single fix. If every Stage 6 and Stage 7 recommendation were accepted as written, version 1 (built for three test households) would gain:
- birth-month pro-rating;
- rebalancing within tolerance bands;
- a model of foreign withholding-tax drag;
- a formula that works the tax calculation backwards (analytic tax inversion);
- a pool of several Web Workers;
- encrypted exports and a separate diagnostic export;
- rules for compatibility between schema versions;
- a long Risks essay.

Most of these concerns can be met with a one-line definition, a non-goal, an accepted-risk row, or by removing machinery. With the reductions recommended here, version 1 ends up smaller than the current design:
- **Removed:** the rebalancing carry-over to next year, the cancellation flag, the input hash module, quarterly OAS updates, the after-tax stock-share readout, the CPP death benefit, and probably the separate retirement year for each spouse.
- **Added:** about 6 config values or inputs and about 12 one-line definitions.

The core architecture is not affected by any accepted fix. That core is:
- a Web Worker that runs only the engine;
- pure functions, one per simulated year;
- one store;
- rule values kept only in config;
- full-detail reruns of the representative paths.

## Prioritized Findings (Blockers -> Major -> Nits)

### zoom-out-s8-1: Some fixes would grow the design in total - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 72-77 (goals G1-G10), 595-612 (scope). Relates to critic #1-#20, comprehension #1-#8, Stage 5 #9.
* **Discrepancy Description:** Stages 6 and 7 each propose new mechanisms for the same few root issues: solver cost, rebalancing gains, tips, and persistence. Each fix looks reasonable on its own. Together they add more scope than Stage 5 #9 already flagged as too much.
* **Rationale & Recommendation:** Use the verdict table at the end of this report. Rule of thumb: before adding a new input, module, state variable or CI step, check whether a definition, a non-goal or a deletion meets the same goal (G1-G10).

### zoom-out-s8-2: Rebalance at the start of the year so that no gains carry over - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 258, 286-287, 301-308, 982. Relates to Stage 5 #3, critic #4 and #20, comprehension #5.
* **Discrepancy Description:** The rule that rebalancing gains go on next year's tax return is a workaround, and it causes four problems:
  - gains realized in the year of the second death are never taxed;
  - the design does not say whose return the first spouse's pending gains go on;
  - the gains are labelled as "Required withdrawals";
  - it needs an extra state variable.

  The design already taxes gains in the same year for non-registered withdrawals inside the bisection (line 942).
* **Rationale & Recommendation:**
  - Rebalance to target at the start of the year (after step 1, before step 4), and add the taxable gains to the income that the step-5 solve sees.
  - This removes the carry-over, the death-year gap, and the separate first-death final-return step that Stage 5 #3 proposed. The deceased's death-year return becomes their normal return for that year, because rollovers to the spouse are tax-free.
  - Cut critic #4's tolerance bands and "use cash flows before selling". Record "full rebalance every year, in both the user's plan and the baseline" as an accepted assumption in the Risks table.

### zoom-out-s8-3: Run the comparison variants on a subset of the same paths - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 325-330, 374, 534, 988-993. Relates to Stage 5 #1, critic #2 and #3.
* **Discrepancy Description:** Three of the four variant runs are comparisons. They report differences on each path, using the same market paths. Differences vary much less than levels, so a fixed subset of paths (for example the first 250) would give stable 50th and 10th percentile differences at about a quarter of the cost.
* **Rationale & Recommendation:**
  - Combine the subset with Stage 5 #1's two-pass split and about 25 bisection steps. This is probably enough to meet the 5-second target.
  - Correct the "about 11 tax calculations" figure at line 534.
  - Cut critic #2's analytic tax inversion and multi-Worker pool, and the optional Worker pool in Stage 5 #1. Add them only if the benchmark still misses after these cheaper fixes.
  - Precomputing bracket tables once per run is optional.

### zoom-out-s8-4: Use one household retirement year instead of modelling mixed working/retired years - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 205, 256, 312, 895, 898. Relates to comprehension #1, critic #10, open question O16.
* **Discrepancy Description:** Modelling a year where one spouse works and the other is retired would need:
  - employment income;
  - a partial spending need;
  - tax rules for benefits received while still working.

  The three test households may not have this case at all.
* **Rationale & Recommendation:** Reduce scope without adding machinery:
  - (a) Replace the per-spouse retirement year with one household retirement year. State "both spouses retire in the same year" as a version 1 limitation, and add it to the O16 check.
  - (b) Measure spending phases in years from that household retirement, the same anchor the spending shapes use (line 256). This removes the "whose age?" question.
  - (c) If O16 shows that all test households are retired or close to it, consider starting the plan at retirement with balances as of that date. This would drop the working-years loop, contributions, the working marginal-rate input and TFSA room tracking before retirement. The cost is losing the "years before retirement" part of the shapes. The author should make this trade-off explicitly.

### zoom-out-s8-5: Treat "Fill lower brackets first" as a required withdrawal in step 4 - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 264-265, 286-291, 965-967. Relates to comprehension #2.
* **Discrepancy Description:** The point of this strategy is to withdraw up to a bracket target even when spending doesn't need the money. CUJ 2's "draw the RRSP down earlier" depends on it. Spreading the required withdrawal W across accounts can never do this, so the current design has two conflicting readings of the strategy.
* **Rationale & Recommendation:**
  - Make the bracket top-up a required withdrawal in step 4, sized against income before pension splitting. Any money left over goes to the step-6 surplus.
  - Remove the bracket-filling part of the `allocate` interface.
  - Add two one-line defaults:
    - after a death, the survivor keeps their own bracket target;
    - when the user chose "Registered last", the comparison variant uses a target from config, such as the top of the lowest federal bracket.
  - The result is less code than the current design.

### zoom-out-s8-6: One rule fixes both non-registered income timing and negative returns - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 241, 248, 286-287, 299-300. Relates to critic #6, comprehension #5.
* **Discrepancy Description:** The design doesn't say which year's return produces taxable interest and dividends in a non-registered account. It also doesn't say how a negative total return is split between income and price change. Both questions decide whether the engine passes or fails the $1 reference tolerance.
* **Rationale & Recommendation:** Accept, as one merged definition with no new module:
  - Non-registered interest and dividends are a fixed yield from config, applied to the balance at the start of the year and paid as cash in step 4.
  - The price return is the total return minus that yield, applied in step 7.

### zoom-out-s8-7: Make tips simpler instead of computing more effect sizes - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 63, 151, 334-356, 1013-1016. Relates to Stage 5 #2, critic #8, comprehension #3.
* **Discrepancy Description:** Goal G6 only promises tips "each with the inputs that affect it". It does not promise computed effect sizes. Critic #8 proposes re-running each nudge on the paths that triggered the warning. That multiplies run cost and adds a way to pick paths for every warning.
* **Rationale & Recommendation:** Take Stage 5 #2's simplest option:
  - Compute nudge effects only for warnings measured on a representative path, using that path's market returns (not the fixed-return path).
  - For warnings based on a share of paths, list the related inputs without effect sizes.
  - Cut critic #8's re-runs on the triggering paths.
  - Open question O14 (computed tips) is still met wherever an effect can be measured.

### zoom-out-s8-8: Cut the $2,500 CPP death benefit - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 244, 280, 813, 933. Relates to critic #31, comprehension #18.
* **Discrepancy Description:** The amount is written directly into the design, its tax treatment and recipient are not defined, and it makes no real difference over a 30-40 year projection.
* **Rationale & Recommendation:** Add one line under the tax non-goals declaring it out of scope. This removes a config entry, a step-1 line and an open tax question.

### zoom-out-s8-9: Skip a variant that is the same as the user's plan - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 325-328, 988. Relates to comprehension #6.
* **Discrepancy Description:** If the user's shape is Steady, or their withdrawal strategy matches the variant's, the comparison variant duplicates the user's own plan.
* **Rationale & Recommendation:**
  - Don't run that variant. Show "This is your current choice" instead.
  - Keep "Same mix everywhere" only as the baseline, not as one of the presets.
  - This saves compute and needs no new UI.

### zoom-out-s8-10: Remove the fixed-return example from most comparisons - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 330, 991, 1088.
* **Discrepancy Description:** Each comparison already shows:
  - the 50th and 10th percentiles;
  - a fixed-return example;
  - a note about effects in the opposite direction;
  - the after-tax stock share (until it is cut, see Stage 5 #9).

  If tips move to representative paths (zoom-out-s8-7), tips no longer need the fixed-return path either.
* **Rationale & Recommendation:** Keep the fixed-return run only where an explanation needs it (the Alternative C lesson). Consider showing it on request instead of in every comparison.

### zoom-out-s8-11: Some open Stage 5 Nits would add machinery - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Stage 5 #10, #11, #13; line 589.
* **Discrepancy Description:** Three open Stage 5 Nits add code that the goals don't need.
* **Rationale & Recommendation:**
  - **Stage 5 #10 (diagnostic export): reduce.** The integrity-error screen should show the year, path, variant and failed check, with a "copy details" button. The normal plan export already contains the inputs and seed, so cut the separate diagnostic export.
  - **Stage 5 #11 (`toFuture` takes an inflation series): cut.** Random inflation is a future improvement (line 589), so this change can wait until then.
  - **Stage 5 #13 (port of the fdlibm math library): cut.** Instead, narrow G4 to "same inputs, seed, config version and browser" (critic #25).

### zoom-out-s8-12: A revision counter is enough, with no hash and no config version - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 197, 1022, 1040. Relates to Stage 5 #5, critic #25, comprehension #9.
* **Discrepancy Description:** Critic #25 asks for the config version to be included in the input hash. Results are not saved (line 197) and the config is bundled with the app. A config change therefore always comes with a page reload, which clears the in-memory result.
* **Rationale & Recommendation:** Use Stage 5 #5's revision counter. The seed and path count are inputs, so editing them increments the counter anyway. Don't hash anything.

### zoom-out-s8-13: Write Risks & Mitigations as a table, not an essay - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** New section. Relates to critic #1.
* **Discrepancy Description:** The feature-spec standard requires this section, so it can't be cut. It should not, however, become a reason to add code.
* **Rationale & Recommendation:** Use one row per risk, with columns for risk, impact, and mitigation (or "accepted"). Link each row to the existing text. Suggested rows, most of them accepted risks:
  - limits of a CSP set in a meta tag;
  - supply chain: versions are pinned and `npm ci` is used; add `npm audit` as a report-only step;
  - other sites sharing the github.io origin;
  - browser storage eviction, and export files being unencrypted;
  - blind spots the AI-built reference plan may share with the engine;
  - fixed inflation;
  - fixed ages at death (longevity);
  - lognormal returns, which have thin tails;
  - full rebalancing every year (zoom-out-s8-2);
  - foreign withholding tax;
  - the public URL counting as a release (open question O20);
  - the performance budget;
  - rollback after a schema change.

  No row should need new code beyond the changes this report accepts.

## Verdicts on Stage 6 and Stage 7 Recommendations

Each recommendation gets one of three verdicts: **Accept** (as written), **Reduce** (accept a smaller version), or **Cut** (drop it, or declare a non-goal or accepted risk).

### Critic (Stage 7)

| Finding | Verdict | What to do |
| --- | --- | --- |
| #1 Risks & Mitigations | Reduce | Write it as a table (zoom-out-s8-13). It is required, so it can't be cut. |
| #2 Solver performance | Reduce | Use the two-pass split, about 25 bisection steps and a path subset for comparisons (zoom-out-s8-3). Fix the figure at line 534. Cut analytic tax inversion and multiple Workers. |
| #3 Measurable performance target | Reduce | State "5 s" at line 77. Use the author's laptop with current Chrome as the reference machine. Make CI benchmarking report-only (Stage 5 #8). Cut operation counts and median-of-several-runs measurement. |
| #4 Rebalancing distortion and death-year gains | Reduce | Fix the death-year gains by moving rebalancing to the start of the year (zoom-out-s8-2). Cut tolerance bands and "cash flows before selling". Add an assumption row. |
| #5 Foreign withholding tax | Reduce | Accept in a small form, because the "Bonds sheltered first" preset (line 257) puts global stocks in the TFSA, where withholding tax is lost. Ignoring it pushes the core placement lesson (G5) in the wrong direction. Add one config value: a withholding rate on the foreign-dividend part of global stock returns held in the TFSA and RRSP/RRIF/LIRA/LIF. Treat withholding in non-registered accounts as recovered, with no foreign tax credit model. Add one line to the placement explanation. Cut a full matrix of drag by account type. Fallback if even one value is too much: change the preset so global stocks don't fill the TFSA first, and add a risk row. |
| #6 Splitting a negative return into income and price change | Accept | Merge with comprehension #5 (zoom-out-s8-6). |
| #7 Return model convention and O22 | Reduce | Add one line saying config holds compound (geometric) means and how they convert to model parameters, plus one test. Settle O22 before stage 4 (the market generator) starts. Record thin tails as an accepted risk. Cut fat-tailed models. |
| #8 Which paths tips are computed on | Reduce | Simplify tips instead of extending them (zoom-out-s8-7). |
| #9 Longevity | Reduce | Add the label "assuming deaths at the target ages", a risk row, and the percentile at line 852. Random lifespans are already a non-goal (line 90). |
| #10 Mixed working/retired years | Cut | State it as a version 1 limitation, gated by O16 (zoom-out-s8-4). |
| #11 CSP and supply chain | Reduce | Reword "blocks all network connections" and "nothing leaves the browser" at lines 369 and 548. The CSP directive list already exists (lines 696-698); optionally set `base-uri 'none'`. Add `npm audit` as a report-only step. Cut any further supply-chain tooling. |
| #12 Shared github.io origin | Cut | Accept the risk for the family release, as one risk row. Before a public release, the fix is a dedicated GitHub organization or account (free, with its own origin) or a custom domain. No code. |
| #13 Storage durability | Reduce | Narrow "durable" in G7. Add a note that export files are unencrypted. Add a list of supported browsers. Prompting the user to export when `persist()` returns false is fine, because it reuses the existing prompt. Cut encryption. Rolling snapshots don't protect against eviction, which supports cutting them (Stage 5 #9). |
| #14 Rollback strands migrated plans | Cut | Version 1 has only one schema version, so nothing can be stranded yet. Add one line: "When schema v2 is introduced, write the upgraded autosave under a new key and leave the old one in place." Cut forward-compatibility rules. |
| #15 Public deploy vs the FSRA gate | Accept | Make a decision; no machinery is needed. Either treat the Pages URL as a release and resolve O20 before the first deploy, or keep `deploy.yml` disabled until then. A noindex meta tag is optional. |
| #16 Invariant tolerance | Accept | Use one tolerance value from config. Don't switch to integer cents, which would mean rewriting arithmetic across the engine. |
| #17 Independent verification | Accept | Wording only. Line 70 should describe the reference plan honestly and state the $1-per-return tolerance. Add the paid-tool check (already planned at line 1236) to Verification. Add Stage 5 #12's property tests. CRA worked examples are optional. |
| #18 First-year benefits are overstated | Reduce | Add one birth-month input and pro-rate only the first year of CPP, OAS and DB pension payments and the OAS increase at 75. A half-year convention avoids the new input. Cut wider monthly timing. Rewrite "slightly" at line 205. |
| #19 Ties in percentile ranking | Accept | Add a one-line tie-break (first shortfall year, then total shortfall) and a total-shortfall field in `PathSummary`. |
| #20 Death edge cases | Accept | Add two one-line rules. If both spouses die in the same year, apply the first-death rollover and then the survivor's final return in that year. The final return includes any RRSP or LIRA not yet converted. |
| #21 Rationale for alternatives | Reduce | Add only the localStorage vs IndexedDB alternative. |
| #22 Traceability of O-IDs | Reduce | Link `concepts_brief.md` and list the unresolved IDs. A full O1-O23 table is optional. |
| #23, #24, #26 | Accept | Wording or structure only. |
| #25 Repeatability (G4) | Reduce | Narrow the wording to same inputs, seed, config version and browser. Cut "attribute the change to the rule update in the change summary". Cut the fdlibm port. |
| #27-#54 (Nits) | Accept wording | #28: accept as one property test. #29: covered by zoom-out-s8-4(b). #30: add "no RRIF minimum in the year the account opens" and "LIRA must become a LIF by 71" as validation lines; declare "using the younger spouse's age for the RRIF minimum" a non-goal. #31: cut (zoom-out-s8-8). |

### Comprehension (Stage 6)

| Finding | Verdict | What to do |
| --- | --- | --- |
| #1 Mixed years and what spending phases are measured from | Cut / Reduce | zoom-out-s8-4. |
| #2 Meaning of bracket filling | Reduce | zoom-out-s8-5. |
| #3 Tips | Reduce | zoom-out-s8-7. |
| #4 "Worst 10% of markets" | Accept | Add a one-line definition. Either use the average per-path difference across the paths in the user plan's bottom 10% by legacy, or reword G5 and CUJ 3 to "10th percentile of the per-path difference". Say which tail of the tax difference counts as bad. |
| #5 Income timing | Accept | zoom-out-s8-6. |
| #6 Variant identical to the user's plan | Reduce | zoom-out-s8-9. |
| #7 Cancellation | Accept | Use Stage 5 #4 as written: `worker.terminate()`, then start a new Worker. This removes code: the `isCancelled` hook (line 989), the check every 50 paths (line 993) and the shared flag (line 1030). |
| #8 Quarterly OAS | Cut | Update OAS once a year (Stage 5 #18). |
| #9 Input hash | Reduce | Use Stage 5 #5's revision counter (zoom-out-s8-12). |
| #10 Average tax rate on withdrawals | Cut | Fixed by cutting the after-tax stock-share readout (Stage 5 #9). Line 148 shows the design added it; the author didn't ask for it. |
| #11-#20 | Accept wording | #15: a short glossary of acronyms is fine. #19: Stage 5 #17 recommends replacing checksums with review rules. |
