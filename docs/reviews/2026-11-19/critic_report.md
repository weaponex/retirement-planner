# Goldfish Review Report: Critic Review (Stage 7, round 1)

**Target:** `docs/designs/retirement-planner.md` (lines 1-1040, everything above "## Detailed Implementation Plan")

**Date:** 2026-11-19

## Reviewer Status

| Reviewer | Standard | Status |
| --- | --- | --- |
| `egm-design` | feature-spec-standard.md | completed |
| `egm-structural` | feature-spec-standard.md | completed |
| `egm-style` | its own persona rules | completed |

All three reviewers read the whole scope and the baseline context on their first attempt. None needed a retry.

## Summary

- Blockers: 0
- Major: 23
- Nit: 28

The reviewers raised 59 findings in total: 22 from design, 15 from structural and 22 from style. After merging overlaps, 51 remain. Every original id is kept, so each one can be traced to the finding it was merged into.

All three reviewers give the same verdict: the required sections are all present (Problem, Goals and Non-Goals, Architecture, Alternatives, Risks) and nothing blocks the design. The Majors fall into three groups:

- **Design logic** (design lens): cancelling a stale Worker run, the Worker's exposure under the security policy, the "today's dollars" base year, a working spouse's salary, the final return, the stock-share readout, the planner's ranking, and two open tabs.
- **Contracts and structure**: the data contracts disagree with the prose; the screen description is split across four places; chosen options sit under Alternatives; author decisions have no record.
- **Calibration** (style lens): some claims go further than the evidence, the history is mixed into the rules, and some things have two names.

**Duplicates of earlier stages.** These are marked on each finding:
- `ZO-n` means finding n in `zoom_out_report.md`.
- `CR-n` means finding n in `comprehension_report.md`.
- `SR1-` ids refer to the focused review (`focused_review_report.md`). They are noted when a reviewer said the reviewed text still has the problem.

**One conflict, resolved.** The design reviewer said decisions marked "author" are traced to `concepts_brief.md`. The structural reviewer said the 2026-11-19 decisions are not recorded there. I checked the brief. Its lines 147-148 record the *opposite* decisions: live recalculation and a fixed-return-only model are both "Rejected by author". So the structural finding stands (finding 13).

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. The Worker cannot cancel a stale run as described - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-1). Overlaps SR1-M2. Not raised in earlier stages of this review.
* **Affected Scope:** Lines 268, 270, 692, 963; Risks row 994; CUJ 1 (148).
* **Discrepancy Description**:
  - Line 692 says the Worker "checks for a newer revision between runs".
  - A Worker only handles new messages after its current task returns. A synchronous loop over about 22 runs, plus about 100 tip runs, never sees the newer revision.
  - Shared memory is ruled out (270). It would also need COOP/COEP headers, which GitHub Pages cannot set.
  - So the "typing stays smooth" claim and the 1-second mitigation rest on a mechanism that does not work.
  - "As soon as there is enough to calculate" (148) is undefined.
* **Rationale & Recommendation**: Choose one of these and write it in Components and data flow:
  - (a) an async run loop that yields between runs and then compares the revision; or
  - (b) the store terminates the Worker and starts a new one when a newer revision arrives.

  Also add a `readyToRun` gate, with an "Incomplete" badge state for inputs that are not finished.

### 2. The privacy claims are absolute, but the security policy does not cover the Worker - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-2), `egm-style` (style-1-3)
* **Affected Scope:** Lines 21, 72 (G7), 683, 955; Risks rows 981-983.
* **Discrepancy Description**:
  - Lines 21 and 72 say no user data leaves the browser. Line 955 says the page "cannot make network requests".
  - Line 683 itself says the meta-tag policy does not cover navigation or the Worker.
  - Row 981 accepts the Worker gap because the Worker "runs only bundled code". But row 982's threat, a compromised npm dependency, is bundled code, and the Worker holds the full plan.
  - Images, fonts and prefetch requests are not mentioned either.
  - Row 983 adds another route: other github.io sites can read saved plans.
* **Rationale & Recommendation**:
  - Create the Worker from a `blob:` URL so it inherits the page's policy (CSP3). Add an e2e test that a `fetch` from inside the Worker is blocked.
  - Spell out the exact directives.
  - Reword lines 21, 72 and 955 so they describe what is actually enforced, and name the limits.

### 3. The data contracts disagree with the prose - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-3), `egm-structural` (structural-1-3). Duplicates ZO-3 (override shape) and CR-5.
* **Affected Scope:** Lines 307 and 620; 254 and 622-629; 507 and 654-655; `src/engine/types.ts`.
* **Discrepancy Description**:
  - **Override shape.** Line 307 gives each `ruleOverrides` entry as `{ value, defaultTaxYear }`, and line 316 relies on `defaultTaxYear`. Line 620 and `types.ts` hold a bare value. This data is persisted, and version 1 has no migrations (675), so the first shape to ship is permanent.
  - **Spouse name.** The Household tab has a name for each spouse (254), but `SpouseInput` has no name field.
  - **Missing totals.** `runPath` produces `lifetimeTaxToday` (507), but `PlanSummary` has only `lifetimeTaxNom`.
* **Rationale & Recommendation**:
  - Change line 620 to `{ [ruleKey]: { value, defaultTaxYear } }`, and update `types.ts` before any plan is saved.
  - Add `name` to `SpouseInput`.
  - Add the `...Today` totals to `PlanSummary`, or say where they live.

### 4. The result contract between the Worker and the store is not defined - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-11), `egm-structural` (part of structural-1-3)
* **Affected Scope:** Lines 221, 224, 241, 268-270, 519, 586-663, 765-770.
* **Discrepancy Description**:
  - `Result` and the separate tips message are used, but neither is defined in Data contracts.
  - The Results tab needs fields that `YearRow` and `PlanSummary` do not have:
    - the denominator for Goal 1's "years covered";
    - whether the legacy goal is met, including the case where no goal is set;
    - the inputs for the estate waterfall.
  - There is no error message type. For example, `read.ts` throws `MissingRuleValueError` for the null config values that exist today.
  - Agents will invent this seam.
* **Rationale & Recommendation**:
  - Add `Result { revision, configStatus, plan { rows, summary, estate }, strategies, placement { summary, baselineSummary, afterTaxStockShare }, warnings }`, `Tips { revision, byWarning }` and `EngineError { revision, kind, detail }`.
  - Define Goal 1 over the years from the first retirement to the second death.

### 5. "Today's dollars" has no fixed year when the plan starts after this year - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-4). Related to ZO-8 (two inflation clocks), but this is a different defect.
* **Affected Scope:** Lines 274-275, 281, 593, 634, 644.
* **Discrepancy Description**:
  - The input and display deflator counts from the plan start. Rule values count from the defaults' tax year.
  - With `planStartYear` 2031, a "$6,000 a month today" entered in 2026 is treated as 2031 dollars. Spending then comes out about 11% low against thresholds that have been inflated from 2026.
  - Balances entered today are not grown over the years before the plan starts.
  - DB statement amounts, which are often nominal amounts at the pension's start, are inflated as if they were today's dollars.
* **Rationale & Recommendation**:
  - Fix "today" to one calendar year, and count the deflator from that year.
  - Either restrict `planStartYear` to the current year, or label every input "in <year> dollars" and explain how balances are carried to the start.
  - Add a today's-or-future-dollars flag for DB amounts, or state the assumption.
  - Add a `units.test.ts` row.

### 6. A spouse who is still working has a salary the tax calculation cannot see - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-5)
* **Affected Scope:** Lines 101, 278, 424-425, 430, 455.
* **Discrepancy Description**:
  - Pay is entered after tax, so it is not part of `TaxableIncome`.
  - "Early RRSP drawdown" draws from a working spouse "like a retired spouse" (430). "Fill lower brackets first" tops up without counting the salary (425).
  - Both therefore tax those RRSP/RRIF draws at bottom-bracket rates. They also understate the clawback and the age-amount reduction.
  - The result is a bias in favour of those two strategies, which "Let the planner pick" may then choose.
  - No Risks row covers this.
* **Rationale & Recommendation**: Choose one:
  - leave a working spouse out of discretionary draws until they retire;
  - tax that spouse's registered draws at `workingMarginalRate`, as line 278 already does for CPP and OAS; or
  - add a gross-pay field used only as the tax base.

  Add a Risks row either way.

### 7. How the final return relates to that year's ordinary return is undefined - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-6)
* **Affected Scope:** Lines 280, 477-482, 507.
* **Discrepancy Description**:
  - Step 8 files the final return after step 5 has already taxed that year's income.
  - If the deemed income is taxed as a separate return, the brackets, credits and basic amount apply twice, and tax on a large RRIF balance is understated.
  - Nothing says whether the death-year clawback is recomputed, or who pays the extra tax.
* **Rationale & Recommendation**:
  - The final return is one return: that year's income plus deemed income, taxed once with `personalTax`.
  - The extra tax is the full return's tax minus the tax already settled in step 5. The clawback is recomputed on the full return.
  - The extra tax is paid from the estate before probate.
  - Add a `death.test.ts` row that checks this.

### 8. The after-tax stock share readout can go above 100% - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-7). Related to ZO-16 (drop the readout) and style-1-11 (finding 43).
* **Affected Scope:** Line 418; Risks row 992; Alternative P (880).
* **Discrepancy Description**:
  - The rate divides lifetime income tax, which includes tax on DB, CPP, OAS and non-registered income, by registered withdrawals only.
  - A household with a large DB pension and a small RRSP gets a rate above 1. The readout is the only mitigation for counting the mix at face value.
* **Rationale & Recommendation**:
  - Use a rate tied to registered money: an incremental rate, the final-return rate, or tax over total income.
  - Clamp the result to [0, 1], and define it in Result definitions.
  - Alternatively, drop the readout, as ZO-16 suggests.

### 9. The two-pass pension split is tested as if it were exact - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-8). Duplicates ZO-7.
* **Affected Scope:** Lines 436, 710; Alternative V (916).
* **Discrepancy Description**:
  - Line 436 calls the two-pass split an approximation, but the property test at 710 requires an exact match with the full nested search.
  - "Never more tax than a 0% split" is also not guaranteed once W is re-solved.
* **Rationale & Recommendation**:
  - Restate both properties with a tolerance and a scope, for example "within $X of the nested search on the fixture households".
  - Alternatively, prove the split is exact and say so at line 436.

### 10. "Let the planner pick" can choose a plan that runs short, or a level the user cannot select - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-9), `egm-style` (style-1-19). Duplicates CR-2 (the levels part); related to ZO-1 (move the planner out of version 1).
* **Affected Scope:** Lines 95, 424, 431, 433, 525, 547, 690-691; O31 (140).
* **Discrepancy Description**:
  - **Ranking.** Picks are ranked only on "Most left" or "Least lifetime tax". Under the second, an option with a shortfall can win.
  - **Levels.** The search tries $40,000 to $110,000, but the user can select only two named levels. So "Use this strategy" cannot reproduce a $75,000 pick.
  - **Tips.** Nothing says whether tip reruns repeat the 17-option search, which would mean about 1,700 runs.
  - **Wording.** Non-Goals line 95 says the search tries "the other" strategies "at a fixed list of levels", which does not match lines 431 and 547.
* **Rationale & Recommendation**:
  - Rank first on whether spending is covered (then the first shortfall year, then the total shortfall), and only then on the chosen goal.
  - Restrict the search to levels the user can select, or add `bracketLevelToday`.
  - Hold the pick fixed during tip reruns.
  - Fix the wording at line 95, and widen O31.

### 11. Two open tabs overwrite each other's plan, and there are no rolling backups - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-10). Duplicates ZO-18 (the two-tab part; rated Nit there). The backups part is new.
* **Affected Scope:** Lines 672-676; Risks row 984; CUJ 5.
* **Discrepancy Description**:
  - Autosave writes one key one second after each edit, so the last tab to save wins.
  - The brief named both "two tabs overwrite each other" and "keep the last several autosaves" (concepts_brief.md line 82). The design addresses neither, in Alternatives or in Risks.
* **Rationale & Recommendation**:
  - Listen for `storage` events, and offer "reload / keep mine" when another tab saves.
  - Keep the last N saves, with a way to restore them.
  - Add a Risks row.

### 12. The keys Settings can change disagree with the Settings screen and with the planner's limits - Severity: Major
* **Reviewer Lens:** `egm-design` (design-1-12). Related to ZO-2 (limit overrides to a short list).
* **Affected Scope:** Lines 95, 308, 776; Risks row 996.
* **Discrepancy Description**:
  - Line 308 lets the user override nearly every key, including presets, shapes, mixes, spending phases, life-expectancy tables and `planning.planner_search`.
  - The Settings sections at line 776 have no editors for these.
  - An editable `planner_search` also undoes the "fixed list of levels" that line 95 and row 996 rely on.
* **Rationale & Recommendation**:
  - Define the overridable keys as exactly the keys that have a Settings row.
  - Exclude `planner_search`, presets and shapes.
  - Make lines 308 and 776 agree.

### 13. Decisions credited to the author have no linked record - Severity: Major
* **Reviewer Lens:** `egm-structural` (structural-1-1). I checked this against the design reviewer's opposite reading; see Summary.
* **Affected Scope:** Line 780; Alternatives B (794), C (800), Q (886), R (892), Y (936), Z (942), AA (948).
* **Discrepancy Description**:
  - Line 780 says author decisions are recorded in `concepts_brief.md`.
  - The 2026-11-19 decisions are not there. The brief records the opposite decisions for B and C (brief lines 147-148).
  - The standard does not allow a rejection to be credited to a maintainer without a linked record.
* **Rationale & Recommendation**:
  - Link each 2026-11-19 decision to `focused_review_report.md` or to a `docs/history/decision-log.md` entry.
  - Reword line 780.

### 14. The chosen design is listed as an "Alternative" - Severity: Major
* **Reviewer Lens:** `egm-structural` (structural-1-2). Duplicates CR-4 (the alternatives part).
* **Affected Scope:** Alternatives B (790-794), C (796-800), L (856), M (862).
* **Discrepancy Description**:
  - B (live recalculation) and C (fixed returns) end "Chosen by author". The options actually rejected, the Recalculate button and generated returns, have no entry of their own.
  - L and M are marked "No longer applicable" but stay in the main list.
* **Rationale & Recommendation**:
  - Add entries for "Recalculate button only" and "Generated returns with stress paths".
  - Move B, C, L and M under a "Superseded decisions" H3.

### 15. The federal tax rules sit inside the Ontario calculation bullet - Severity: Major
* **Reviewer Lens:** `egm-structural` (structural-1-4)
* **Affected Scope:** Tax scope (O11), lines 347-363.
* **Discrepancy Description**: Lines 357-363 are indented as continuation lines of "Order of the Ontario calculation". So the federal basic personal amount rule (359) and the federal tax formula (361) render inside the Ontario bullet, and there is no federal entry of its own.
* **Rationale & Recommendation**: Move lines 359 and 361 into their own "Federal calculation" bullet, parallel to the Ontario one.

### 16. The screen description is split across four places that repeat each other - Severity: Major
* **Reviewer Lens:** `egm-structural` (structural-1-5)
* **Affected Scope:** Lines 19, 198, 252-264, 714, 718-736, 738-776.
* **Discrepancy Description**:
  - The tab list and the tab contents appear at lines 19, 198, 252-260 and 742-776. Copies like this drift apart.
  - "Spending inputs" and "Advice wording" come after Verification, away from the sections they belong with.
  - The H3 at line 738 is named by a date rather than by its topic.
* **Rationale & Recommendation**:
  - Merge everything into one "### Screens" H3 with an H4 for each tab, and fold Spending inputs in.
  - Cut lines 252-260 down to a pointer.
  - Move Advice wording next to Results and comparisons.

### 17. The Review header is overloaded, and "stage" means two things - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-1). Duplicates CR-11 and CR-6 (both rated Nit there).
* **Affected Scope:** Line 6.
* **Discrepancy Description**:
  - One bullet of about 170 words covers three review rounds, the report paths, the id prefixes and a summary of the revision.
  - It also uses "Stages 5-9" for review stages and "before the stage each affects" for build stages.
* **Rationale & Recommendation**:
  - Replace the bullet with a review-history table: date, scope, report, verdict, prefix.
  - Always say "EGM review stage" for review stages.
  - Drop the summary of the revision.

### 18. Review ids and change notes run through the rules - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-2, style-1-9, style-1-10), `egm-structural` (structural-1-13). Duplicates ZO-5 and CR-4.
* **Affected Scope:** For example lines 66, 77, 178, 252, 268, 281, 295, 307, 324, 359, 370-372, 383, 392, 397-398, 405-406, 411-412, 423-431, 436, 456, 460, 498, 507, 531.
* **Discrepancy Description**:
  - Rule text carries notes such as "(author, 2026-11-19)", "revised ... replacing" and "Made precise for SR1-M4".
  - Bare ids such as M5, M6, M13, M15, SR-3 and TC-1 cannot be traced, because line 6 explains only the `FR-` and `SR1-` prefixes.
  - CUJ 6 puts a revision note inside an acceptance criterion.
  - Line 295 holds a "Changed 2026-11-19" note, and `keys.ts` already reflects that change.
  - Lines 370 and 383 use history words ("a new key", "now names").
* **Rationale & Recommendation**:
  - Keep provenance only in the Decisions table and the Known gaps table.
  - Where an id has to stay, use its full prefixed form.
  - Explain every prefix in one place.
  - Move the note at line 295 to Known gaps.

### 19. "Nothing in today's dollars to mix up" is contradicted at line 507 - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-4)
* **Affected Scope:** Lines 274 and 507.
* **Discrepancy Description**: `runPath`, inside `project/`, divides by the deflator to produce `lifetimeTaxToday` and the other summary values. The lint rule enforces a boundary on the type, not the absence of today's-dollar values.
* **Rationale & Recommendation**: Reword line 274 to name the summary sums as the only today's-dollar values inside the engine.

### 20. The Overview promises more than the goals deliver - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-5)
* **Affected Scope:** Line 19, compared with G5 (70) and lines 513-518.
* **Discrepancy Description**: The Overview says the app shows "what each tax-related choice is worth". Only the placement preset and the withdrawal strategy are valued. Start ages, conversion ages and splitting are not, and line 518 rules out a shape comparison.
* **Rationale & Recommendation**: Name the two choices that are compared and what they are compared against.

### 21. The tax verification claim names no evidence and no tolerance - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-6)
* **Affected Scope:** Line 363.
* **Discrepancy Description**: "Reproduce all 21 TaxTips.ca cases to the dollar" cites no test, fixture or commit. "To the dollar" is ambiguous next to G10's $1 tolerance (78).
* **Rationale & Recommendation**: Cite the test file, the fixture and the commit, and use G10's wording. If none can be cited, label the claim as the author's manual check.

### 22. Each spouse's death age has two names - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-7), `egm-structural` (part of structural-1-14). Duplicates CR-9 (rated Nit there).
* **Affected Scope:**
  - "plan-to age": lines 254 and 499;
  - "life expectancy target": lines 68, 147, 164, 276, 280, 583;
  - "target ages": lines 506 and 765;
  - the field `lifeExpectancyTarget`: line 624.
* **Discrepancy Description**: Two of the "plan-to age" uses are user-facing labels, and a reader can take "plan-to age" for a separate input.
* **Rationale & Recommendation**: Use one term throughout. Say once that the plan ends at the later of the two deaths.

### 23. The glossary's clawback definition contradicts Tax scope - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-8)
* **Affected Scope:** Line 1006, compared with line 346.
* **Discrepancy Description**:
  - The glossary says the clawback is measured on "net income". Line 346 and `federal.ts` measure it on income before the recovery deduction.
  - The glossary also hard-codes 15%, while the body reads the rate from `federal.oas.recovery.rate`.
* **Rationale & Recommendation**: "OAS repaid at the recovery rate (15% in 2026) on income above a yearly threshold, measured before the clawback itself is deducted."

### 24. The version refusal rule is inconsistent - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-13)
* **Affected Scope:** Lines 172 and 674.
* **Discrepancy Description**: CUJ 5 refuses a file from a newer app version. Persistence refuses a newer schema version.
* **Rationale & Recommendation**: Align line 172 with line 674: refuse only a newer schema.

### 25. The open-questions Risks row lists closed questions - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-14), `egm-structural` (structural-1-10)
* **Affected Scope:** Risks row 999; lines 129-140.
* **Discrepancy Description**: O25, O26, O29 and O30 are resolved. O20 names an event, not a stage.
* **Rationale & Recommendation**: List O20, O24, O27, O28 and O31, and give O20's trigger separately.

### 26. The design values' dates and the fee levels are out of step with config - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-15). Duplicates ZO-6 (the fee-level part).
* **Affected Scope:** Lines 134, 529, 543; `config/2026/planning.json`.
* **Discrepancy Description**:
  - Line 529 says "author decision, 2026-11-17", but the entries carry 11-18 and 11-19.
  - `planning.fee_levels` is still null and marked unfetched, although O25 is resolved.
* **Rationale & Recommendation**: Fix the date, and either say the values are waiting to be entered in config or enter them.

### 27. The persisted spending category ids are not listed - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-16). Overlaps SR1-M8; related to ZO-4.
* **Affected Scope:** Lines 305, 724-732.
* **Discrepancy Description**: Line 305 points to Spending inputs for the persisted ids, but that section gives only display names. The ids are permanent once saved.
* **Rationale & Recommendation**: List the ids.

### 28. The structural override checks are missing two rules - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-17)
* **Affected Scope:** Lines 313, 359; `src/engine/jurisdiction/federal.ts`.
* **Discrepancy Description**: `federalBasicAmount` needs at least five bracket rows and throws otherwise. Nothing requires the bracket `from` values to increase strictly. An override that breaks either rule surfaces as an engine exception, not a Settings rejection.
* **Rationale & Recommendation**: Add both rules to `validateOverride`.

### 29. The fixed input ranges conflict with overridable config - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-18)
* **Affected Scope:** Lines 308, 626.
* **Discrepancy Description**: The CPP, OAS and conversion age ranges are fixed in the contracts, but the matching config keys can be overridden. An override of the latest CPP start age to 72 would then be blocked by input validation.
* **Rationale & Recommendation**: Derive the ranges from the rule values in use, or make those keys non-overridable.

### 30. The lint rule needs a type that the Data contracts never name - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-19)
* **Affected Scope:** Lines 274, 588-663.
* **Discrepancy Description**: The branded `TodayDollars` and `FutureDollars` types appear only in the implementation plan, so in the contracts the lint rule has nothing to enforce.
* **Rationale & Recommendation**: State in Data contracts that `...Today` and `...Nom` fields use these types.

### 31. Input counts have no caps - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-20)
* **Affected Scope:** Lines 595-596, 693.
* **Discrepancy Description**: `accounts` and `dbPensions` are unbounded, but the 45 ms-per-run budget assumes a typical household.
* **Rationale & Recommendation**: Set caps, for example 8 accounts per spouse and 2 DB pensions each.

### 32. Turning rebalancing off leaves the shape selector active, and the fill-order split is unstated - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-21). The fill-order part is SR1-N7; related to ZO-17.
* **Affected Scope:** Lines 416-417.
* **Discrepancy Description**: With rebalancing off, the shape has no effect, but the selector is still available. Nothing says how a preset's fill order splits a class across both spouses' accounts of the same type.
* **Rationale & Recommendation**: Disable the shape selector and say why. State the split rule, for example pro rata by balance.

### 33. Two small consistency fixes in units and release rules - Severity: Nit
* **Reviewer Lens:** `egm-design` (design-1-22, except its CUJ 2 point, which is merged into finding 41)
* **Affected Scope:** Lines 77, 290, 321, 961.
* **Discrepancy Description**:
  - `ontario.probate.threshold` is a one-time amount, but it must use the unit `CAD_per_year`.
  - Line 961 says rule values "come from the validated config", but G9 and line 321 allow unvalidated defaults. Several keys the engine reads are null today.
* **Rationale & Recommendation**: Add a `CAD` unit. State the release rule: CI fails on any unfetched key the engine reads.

### 34. No blank line before the Glossary, and the horizontal rules are used unevenly - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-6), `egm-style` (part of style-1-21)
* **Affected Scope:** Lines 999-1000; the rules at 9, 950, 975, 1039.
* **Discrepancy Description**:
  - "## Glossary" directly follows the last table row, which stricter renderers may read as part of the table.
  - Only some H2 headings have a rule before them.
* **Rationale & Recommendation**: Add the blank line, and either put a rule before every H2 or drop the rules.

### 35. The architecture diagram's borders are misaligned - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-7)
* **Affected Scope:** Lines 228, 244.
* **Discrepancy Description**: The bar on line 228 is one column right of its position on lines 224-227. Line 244 is one character short of the others.
* **Rationale & Recommendation**: Realign the bar on line 228 and pad line 244.

### 36. Two lines render inside the wrong list item - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-8)
* **Affected Scope:** Lines 315, 403.
* **Discrepancy Description**: Each line follows a nested list with no blank line, so it renders as part of the last sub-item instead of the parent bullet.
* **Rationale & Recommendation**: Add a blank line before each, at the parent bullet's indent.

### 37. Two lines disagree about where O1-O23 come from - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-9)
* **Affected Scope:** Lines 7, 106.
* **Discrepancy Description**: Line 7 says all of O1-O23 come from the brief. Line 106 says only O1-O21 do.
* **Rationale & Recommendation**: Change line 7 to "O1-O21" and point to line 106 for the rest.

### 38. Some cross-references are plain text instead of links - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-11)
* **Affected Scope:** Lines 417, 676, 681, 683, 868.
* **Discrepancy Description**: These say "see Risks" or "see Hosting" in plain text, while the rest of the document uses anchor links.
* **Rationale & Recommendation**: Turn them into anchor links.

### 39. Additional Resources has no URLs - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-12). Duplicates CR-8.
* **Affected Scope:** Lines 6, 48, 1024-1026.
* **Discrepancy Description**:
  - The external sources have no URLs.
  - `config/SOURCES.md` and `docs/admin-config-guide.md` are not linked.
  - Review paths are written as code spans, not links.
* **Rationale & Recommendation**: Add the URLs, and turn the file references into relative links.

### 40. The Glossary is out of order and missing terms - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-14), `egm-style` (style-1-21). Partly duplicates CR-9.
* **Affected Scope:** Lines 1000-1018.
* **Discrepancy Description**:
  - The entries are not in alphabetical order.
  - These terms are missing: variant, preset, shape, deflator, draw-down years, Health Premium, FP Canada, the planner's pick, rule override, fee level, starting mix, spending phases.
  - "Asset location vs allocation" defines words the body does not use; the body says "placement" and "mix".
* **Rationale & Recommendation**: Sort the entries, add the missing terms, and rename the entry to "Placement (asset location) / mix (asset allocation)".

### 41. Some CUJ outcomes cannot be tested as written - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-15), `egm-design` (part of design-1-22). Overlaps SR1-M2 and SR1-N20.
* **Affected Scope:** Lines 148, 154, 166.
* **Discrepancy Description**:
  - "Enough to calculate" (148) is undefined.
  - "Within a second" (154) has a different measurement point from lines 88 and 963.
  - "Visible and explained" (166) does not say where or how.
* **Rationale & Recommendation**:
  - Line 154: "within 1 second of the end of the 500 ms pause".
  - Line 166: name the mechanism, such as the warning and chart marker that show the jump.
  - Line 148: refer to the readiness gate from finding 1.

### 42. Minor layout points - Severity: Nit
* **Reviewer Lens:** `egm-structural` (structural-1-15)
* **Affected Scope:** Lines 5, 6, 48, 80, 588-603.
* **Discrepancy Description**:
  - Success Criteria (80) sits between Goals and Non-Goals.
  - The header has no "Last revised" date.
  - Data contracts is described as "TypeScript-style" but is fenced as `text`, and its notation is uneven.
  - Line 48 names the postmortem as the decision log.
* **Rationale & Recommendation**:
  - Move Success Criteria after Non-Goals.
  - Add a "Last revised" field.
  - Use one notation in Data contracts.
  - Name the correct decision-log file.

### 43. "Any extra hidden risk" overclaims - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-11)
* **Affected Scope:** Line 418.
* **Discrepancy Description**: The readout shows one figure, so "makes any extra hidden risk visible" claims too much.
* **Rationale & Recommendation**: "It shows how much of the placement benefit may come from holding more stocks after tax." See also finding 8.

### 44. Some rationale claims have no stated basis - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-12)
* **Affected Scope:** Lines 40-43, 262, 436, 841, 903, 904.
* **Discrepancy Description**: These include judgements of competing tools, "users look for them there", "likely to stall the project", "its versions get mixed" and "the most conventional" React code.
* **Rationale & Recommendation**: Tie each claim to its source, or reword it as the author's expectation. Say exactly what goes wrong at line 903: Svelte 4 and 5 syntax get mixed.

### 45. Planned checks are described in the present tense - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-13)
* **Affected Scope:** Lines 470, 910.
* **Discrepancy Description**: "A property test checks this" and "always converges" describe tests that are still planned.
* **Rationale & Recommendation**: Use the future tense, and tie "always" to its stated condition.

### 46. The LIF table check contradicts itself - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-14)
* **Affected Scope:** Line 372.
* **Discrepancy Description**: "Yearly check, when a refresh is done" is contradictory. In a year with no refresh, the condition is never checked.
* **Rationale & Recommendation**: "Confirmed for 2026 on <date>; not rechecked unless the admin refreshes the defaults."

### 47. G6's "grows through use" is vague - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-16)
* **Affected Scope:** Line 71.
* **Discrepancy Description**: The goal does not say who adds warnings or when.
* **Rationale & Recommendation**: Say who adds them and when, for example "the author adds warnings after tester sessions".

### 48. Near-synonyms are used for the same things - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-17)
* **Affected Scope:** Lines 15, 461-464, 506, 508, 603, 666, 733, 757, 765, 799.
* **Discrepancy Description**: These pairs name the same thing:
  - "after-tax legacy" and "money left";
  - "spending need" and "spending target";
  - "growth-to-safety strategy" and "shape";
  - "late years" and "later years".
* **Rationale & Recommendation**: Use one engine term per concept, and keep any UI label as a label only.

### 49. A leftover "global stocks" in Tax scope - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-18). This is SR1-N2, still present.
* **Affected Scope:** Line 344.
* **Discrepancy Description**: "Global stocks" is no longer an asset class.
* **Rationale & Recommendation**: Say "U.S., international and emerging-market stocks".

### 50. Some single blocks are very long - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-20)
* **Affected Scope:** Lines 268, 289, 292, 757.
* **Discrepancy Description**:
  - Line 268 is a paragraph of about 150 words.
  - Line 292 runs about 55 keys together in one comma-separated list.
  - Line 289 has nested parentheses inside a parenthetical.
  - Line 757 is a bullet of about 140 words.
* **Rationale & Recommendation**: Split each one into a list or a table. Group the key list by file.

### 51. Small wording fixes - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-22). The "file 18" part duplicates CR-7.
* **Affected Scope:** Lines 60, 106, 130, 682, 705, 848, 868.
* **Discrepancy Description**:
  - Line 60: the subject does not match its verbs.
  - Line 106: "one sensible answer" is a judgement.
  - Line 868: "Simplicity and testability won" is informal.
  - Line 848: the Decision repeats the Cons.
  - Line 705: the app version is missing from what is needed to reproduce a failure.
  - Lines 130 and 682: "file 18" is not linked.
* **Rationale & Recommendation**: Apply the rewordings each reviewer proposed, and link "file 18" to its heading.

## Id Index

| Original id | Merged into finding |
| --- | --- |
| design-1-1 to design-1-12 | 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 4, 12 |
| design-1-13 to design-1-22 | 24, 25, 26, 27, 28, 29, 30, 31, 32, 33 and 41 |
| structural-1-1 to structural-1-5 | 13, 14, 3 and 4, 15, 16 |
| structural-1-6 to structural-1-15 | 34, 35, 36, 37, 25, 38, 39, 18, 40 and 22, 42 |
| style-1-1 to style-1-8 | 17, 18, 2, 19, 20, 21, 22, 23 |
| style-1-9 to style-1-22 | 18, 18, 43, 44, 45, 46, 41, 47, 48, 49, 10, 50, 40 and 34, 51 |
