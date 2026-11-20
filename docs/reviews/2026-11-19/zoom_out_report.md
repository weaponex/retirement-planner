# Goldfish Review Report: Initial Zoom Out

**Target:** `docs/designs/retirement-planner.md` (lines 1-1709)

**Date:** 2026-11-19

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |
| `egm-inventive-catalyst` | completed |

## Summary

- Blockers: 0
- Major: 12
- Nit: 6

Both reviewers read the whole target. Neither repeated findings from the earlier focused review (SR1-M1 to M13, SR1-N1 to N20) unless it proposed a different fix. Where both reviewers raised the same point, this report merges them into one finding.

The zoom-out reviewer's verdict is "Ready with fixes". Its main concern is scope. The 2026-11-19 revision added several subsystems that are large for a version 1 with three households: the planner search, editing every rule value, two override channels, and spending categories inside the engine. Most of the open Majors from the focused review exist only because of those additions.

The inventive-catalyst reviewer found several places where the design accepts a trade-off it doesn't need to. Its findings are advisory.

The findings interact. Removing the planner (Major 1) takes out most of the roughly 22 runs per edit, which makes the performance and failure-containment findings (Majors 9 and 10) much smaller. Deciding those together would save rework.

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. "Let the planner pick" is more than version 1 needs - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Non-Goals (line 95); Decisions (193); Withdrawal strategies (431-432); Design values, Planner search (547); O31 (140); Performance (690); Risks (996); file 36 (1478-1483); stage 4 gate (1109).
* **Discrepancy Description**:
  - The other three strategies already run on every edit and appear side by side, with lifetime tax, money left and the difference from "Registered last". The user can already see which strategy leaves the most.
  - The planner adds a 17-option search, which is most of the roughly 22 runs per edit.
  - It brings its own open question (O31) and three open Majors: SR1-M5, SR1-M12, and the open part of SR1-M3.
  - It adds levels the user cannot select, a $5,000 "close gap" rule, a fourth card and options-row state.
  - It is the feature most likely to be read as advice. The concepts brief listed automatic optimizers as a non-goal, and line 95 needs a special exception to allow it.
  - None of the three test households needs it to meet the Success Criteria.
* **Rationale & Recommendation**:
  - Move the planner to Future Improvements.
  - If the author wants to point at a strategy, add a passive "leaves the most under these assumptions" marker to one of the three existing cards. That needs no search.
  - This closes O31, SR1-M5, most of SR1-M12 and the open part of SR1-M3. It also removes the stage-4 gate.
  - It removes `planner_pick`, `plannerGoal` and `planning.planner_search` before they become persisted ids.

### 2. Letting Settings override every rule value, tables included, is too much for version 1 - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** G9 (77); CUJ 6 (174-178); Config contract, "User changes to rule values" (307-318); Settings (774-776); Risks (995, 997); file 24 `overrides.ts` (1386); `overrides.test.ts` (1660).
* **Discrepancy Description**:
  - Version 1 serves three households, using a 2026 config that has been fully validated.
  - Letting the user edit every key needs a whole validation subsystem:
    - schema checks by value kind;
    - range checks by unit;
    - structural checks for bracket rows, gap-free age tables, phase-in caps and surtax list lengths;
    - rules that check keys against each other;
    - tracking of stale overrides through `defaultTaxYear`;
    - dropping overrides on import, with a message;
    - indexing from the default's tax year.
  - That subsystem is larger than some engine stages.
  - It also works against the design's own root fix (line 59): rule values come from sourced, validated config and are never typed in from memory.
* **Rationale & Recommendation**: Keep the author's decision (Alternative Z), but phase it.
  - In version 1, Settings shows every value with its default and source, read-only.
  - Allow overrides only for a short allowlist of scalar "what if" keys: for example the OAS recovery threshold, the TFSA limit, inflation, yields and fee levels.
  - Defer table overrides (brackets, age tables, phase-in) to the public release.
  - Most of the structural and cross-key validation then goes away. The range-by-unit check and `defaultTaxYear` stay, because they are cheap.

### 3. Two override channels for the same values, and an override shape that isn't consistent - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Config contract (308, 318); Asset classes, Fees and Return overrides (397, 399-400, 407); Data contracts (613-615, 620); `src/engine/types.ts` line 143.
* **Discrepancy Description**:
  - **Returns:** these are changed through `investing.returnOverride` on the Savings tab, while every other market key goes through `ruleOverrides`. That needs a special exclusion rule, plus a "links there" redirect in Settings.
  - **Fees:** a custom fee can be set two ways, by picking "Custom" (`customFee`) or by overriding a named level's value in Settings. Two paths lead to the same number, so the UI and the tests have to reconcile them.
  - **Shape:** line 307 says an override is `{ value, defaultTaxYear }`, line 620 says `{ [ruleKey]: value }`, and `types.ts` uses `Record<string, unknown>`.
* **Rationale & Recommendation**:
  - Store return overrides as `ruleOverrides['market.<class>.geometric_return']` and edit them inline on Savings with the existing grey-strip and Edit pattern (line 264). Drop `investing.returnOverride` and the exclusion rule.
  - For fees, keep `customFee` as the user's lever and make the level values non-overridable. Doing it the other way round is also fine, but not both.
  - Change line 620 to the `{ value, defaultTaxYear }` shape.

### 4. Spending categories leak into the engine contract - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Data contracts, `spending` (597-606) and Spending need (666); Spending inputs (718-736); persisted ids (305); nudge steps (575); SR1-M8 (open).
* **Discrepancy Description**:
  - The brief asked for categories as "a simple adding aid, or deferred" (O18).
  - The design instead puts into `PlanInputs`:
    - about 30 categories;
    - a choice between by-category and one-total modes;
    - per-category overrides for the slower and later years;
    - the phase `keepPct`.
  - The engine computes the spending need from them.
  - As a result, the engine, the reference-plan CSV, the property tests and the nudge definitions all depend on UI category ids. The open items in SR1-M8 follow from this.
* **Rationale & Recommendation**:
  - Treat categories as a screen and store concern. The state layer reduces them to three yearly amounts (active, slower and later, each with a start year), and those amounts are the engine's only input.
  - Category ids stay in the saved plan but never reach `src/engine`.
  - The spending nudge becomes plus or minus 5% on the active total.

### 5. The design mixes specification, review history and implementation detail - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:**
  - Status (line 6).
  - Review IDs inside rule text throughout (for example 281, 307, 370-372, 383, 398, 425, 456, 693).
  - The "Changed 2026-11-19" key history (295).
  - Known gaps (1043-1097), mostly struck-through rows.
  - Files 1-12.
  - Helper-level signatures and constant values.
* **Discrepancy Description**:
  - The brief named this as one of the prototype's failures: the context document mixed spec, history and defects (brief line 78).
  - At 1709 lines, the design repeats that failure. Coding agents read it as the spec, and much of what they read is review trail, or detail that already exists in the repository (config files, `constants.ts`, `tools/`).
  - Struck-through rows and inline review IDs make it hard to tell current rules from history.
  - Restating code constants in prose invites the two to drift apart.
* **Rationale & Recommendation**:
  - Move closed gaps and the review narrative to `docs/reviews/` or a decision log, and keep a short table of open gaps only.
  - Remove review IDs from rule sentences.
  - For files that already exist, describe what they are responsible for and their interfaces, then point to the file instead of restating its values.
  - Move the repository, CI and deploy detail (files 1-12) into those files and the README.

### 6. The key list is kept in step by hand, and nothing checks it - Severity: Major
* **Reviewer Lens:** `egm-zoom-out` (Major), `egm-inventive-catalyst` (Nit)
* **Affected Scope:** Config contract, key tree (291-295); file 20 (1331-1334); `src/engine/config/README.md` (line 61); Design values (543); `config/2026/planning.json`.
* **Discrepancy Description**:
  - The 75 keys are listed in four places: the design prose, `keys.ts`, `SOURCES.md` and the config README.
  - `config:check` compares only `keys.ts` with `SOURCES.md`. The design calls its list "complete, authoritative" but keeps it in step by hand.
  - Drift has already happened twice (SR-2, SR1-M1).
  - The design and the config already disagree on a value. Design values (line 543) records O25's fee levels as decided (0.20%, 0.60%, 2.00%), but `planning.json` still has `planning.fee_levels` as null, marked "unfetched (O25 open)".
  - This re-opens r2 M9, where the author made the design the complete list on purpose.
* **Rationale & Recommendation**:
  - Make `keys.ts` the single authoritative list, and check `SOURCES.md` against it (or generate its key column from it).
  - In the design, describe the key groups, the naming pattern and the persisted ids, and link to `SOURCES.md`.
  - If the author keeps the list in the design, extend `config:check` to parse it.
  - Either way, fill in the fee levels in `planning.json` or reopen O25.

### 7. The two-pass pension split is called an approximation but tested as if it were exact - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Withdrawal strategies, pension income splitting (436); Verification, property tests (710); file 28 `bestSplit` (1421); `MAX_SPLIT_PASSES = 2` (1368).
* **Discrepancy Description**:
  - Line 436 runs the split search once and re-solves the year at most once, and calls this an approximation.
  - Line 710 tests that "the two-pass split matches the full nested search".
  - After pass 2 the withdrawal amount has moved, so the best split can change. fast-check will find cases near the clawback, the age amount and the Health Premium steps. This is likely to break CI at stage 2.
* **Rationale & Recommendation**: Pick one of two fixes.
  - (a) Keep two passes and restate the property as a bound: household tax is at most $X above the nested search (with $X in `constants.ts`), and never above a 0% split.
  - (b) Loop until the split stops changing, with a step cap, a tie-break, and `EngineIntegrityError` when the cap is hit.
  - Costs: (a) needs a tolerance someone has to justify. (b) costs time against the 45 ms per-run budget.

### 8. Two inflation clocks in `YearContext`, and the contract hasn't caught up - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst` (Major), `egm-zoom-out` (Nit)
* **Affected Scope:** Units and conventions, Indexing (281); file 24 `read.ts` (1387); file 25 `makeRuleFactor` (1394); file 26 `YearContext` (1401); `ontario.test.ts` row (1655); `src/engine/types.ts` lines 9-15; `src/engine/config/read.ts` line 33; `src/engine/config/README.md` line 75.
* **Discrepancy Description**:
  - To fix SR1-M10, the design adds `ruleFactor(year)`, which counts from the tax year and takes a calendar year. It sits alongside `deflator(yearIndex)`, which counts from the plan start and takes a year index. Every engine function then has to pick the right one.
  - That brings back the prototype's first failure, mixing two dollar bases (line 50). The `TodayDollars` lint rule can't tell which factor a function used.
  - Separately, file 26 still defines `YearContext { yearIndex, deflator, cfg }`, the test row says indexed rows grow with `ctx.deflator`, and the stage-1 code indexes from the plan start. So the contract is out of date either way.
* **Rationale & Recommendation**:
  - Preferred (inventive catalyst): after `applyRuleOverrides`, rebase the config once with `rebaseConfig(cfg, planStartYear)`. It multiplies every indexed value and bracket row by (1 + inflation)^(planStartYear - taxYear). `ctx.deflator` then stays the only factor, and `ruleFactor` is never needed.
    - Add a `units.test.ts` row that checks the rebased value against the formula on line 281.
    - Costs: validate overrides before the rebase, and Settings must keep showing values in tax-year dollars.
  - Minimum (zoom out): if `ruleFactor` stays, update file 26 and the test row, and make the change in one place, the `factor()` function in `read.ts`.

### 9. One failed check hides every result, and live recalculation makes that frequent - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Verification, runtime invariants (698-705); G10 (78); NFR Correctness (960); year solver step 9 (483); file 33 (1463); computed tips (525); nudge steps (571-579).
* **Discrepancy Description**:
  - A single failed check, or a solver that doesn't converge, in any one of roughly 22 variants and about 100 tip reruns, removes the user's own plan from every tab, even when that plan passed its checks.
  - Nudges can also produce invalid inputs, and nothing says they are clamped or skipped:
    - CPP or OAS start age 70 + 1;
    - a retirement year 1 year before the plan start;
    - a survivor percentage of 100 + 5.
* **Rationale & Recommendation**:
  - Contain failures per variant:
    - A failure in the user's plan still blocks the results.
    - A failing strategy card, planner option or baseline shows a "couldn't compute" state with the error details and "Copy details".
    - A failing tip rerun is dropped and logged.
  - Clamp nudges to each input's valid range, and skip a direction that is already at its limit.
  - Optionally keep the last good result visible, clearly labelled "for your previous inputs".

### 10. Every edit waits for all 22 runs - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Performance (689-694); Worker (270); Risks, "1-second target missed" (994); "All four are always run" (432).
* **Discrepancy Description**:
  - The first Worker message arrives only after every run has finished, though the plan the user is looking at is just 1 of the 22.
  - If the target is missed, the only fallback the design offers is to cut detail.
* **Rationale & Recommendation**:
  - Send results back in priority order, each message tagged with the revision:
    1. the user's plan;
    2. the other strategy cards and the baseline;
    3. the planner search;
    4. tips.
  - The 1-second target then covers only step 1, about 45 ms of work.
  - Cache each variant's result under a hash of the normalized inputs, the config and the variant id. A change such as switching the selected strategy then costs no reruns.
    - The hash must cover `ruleOverrides` and the config's tax year.
  - Costs: more message types, cards that fill in one by one in the UI, and cache memory in the Worker.

### 11. Fixed returns are taken as the reason the growth-to-safety shapes can't show their value - Severity: Major (advisory; reopens a settled decision)
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** G4 (69); Asset classes, fixed returns (391); "No shape comparison" (518); Alternative C (796-800); Risks, Fixed returns (989); Known gaps FR-M17 (1071).
* **Discrepancy Description**:
  - The design keeps three shapes and a Savings section for them, but with fixed returns they can only lower returns, so they never look worthwhile.
  - Stress paths were dropped along with random markets, but an order-of-returns test needs neither random numbers nor volatility data.
* **Rationale & Recommendation**:
  - Add one named variant, "Bad start". It reorders each class's returns so the years after the first retirement are below its FP Canada compound return and the later years are above it, with the same compound return over the plan.
  - The shock size and the number of years N are author planning values (`planning.stress_order`), not data fetched from a source.
  - Show "Spending covered under a bad start" next to Goal 1.
  - Costs: one or two more runs per edit, wording that makes clear this is not a forecast, and more reference-plan cells.

### 12. Rebalancing each account to its own target realizes gains a real household would avoid, which skews the placement lesson - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Yearly rebalance (417); year solver step 2 (451-452); `positions` comment (636-638); Risks, "Full rebalance every year" (990); CUJ 3 and G5.
* **Discrepancy Description**:
  - Each non-registered account is rebalanced every year, which realizes taxable gains.
  - Year one also sells the user's actual positions into the preset's or the baseline's holdings. That one-time gain differs between the preset and the baseline, so part of the placement figure measures that day-one sale, not placement.
  - The Risks row's "applied equally" doesn't make the effect neutral, because the preset and the baseline hold different classes in non-registered accounts.
* **Rationale & Recommendation**:
  - Rebalance the household's overall mix: correct drift inside RRSP/RRIF, LIF and TFSA first, and sell in non-registered accounts only for what those accounts can't absorb.
  - For year one, either start from the positions as entered, or report the day-one gain as a separate line that the placement difference leaves out.
  - Costs: an account's holdings no longer match its preset exactly, and the rebalance and its tests become more complex.

### 13. Warning tips are computed on every edit, even when nobody can see them - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`, `egm-inventive-catalyst`
* **Affected Scope:** Worker (270); Computed tips (525); Performance (691); file 41 (1517).
* **Discrepancy Description**:
  - About 100 tip reruns follow every 500 ms pause, but tips appear only on the Results tab.
  - They are most of the engine work per edit. They make the cancel problem in SR1-M2 harder and drive the 2-second target.
* **Rationale & Recommendation**:
  - Compute tips only when the Results tab, or an expanded warning, is visible for the current revision, and cache them by revision.
  - Costs: a short "Finding tips..." delay when the tab opens, and the change summary can't mention tips that haven't been computed yet.

### 14. `simulate/` is a leftover name from random returns - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Units and conventions (274); lint rule (1217); file 36 (1478).
* **Discrepancy Description**: Nothing is simulated any more. The module builds variants and runs them.
* **Rationale & Recommendation**: Rename it `variants/`, or fold it into `project/`, and update the `TodayDollars` lint rule to match.

### 15. A leftover constant, and an existing module missing from the file plan - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** file 23 (1370); `src/engine/constants.ts` line 19; file 28 (1417).
* **Discrepancy Description**:
  - `WEIGHT_SUM_TOLERANCE` was for the removed global-stock blend, and nothing in `src` uses it.
  - `src/engine/tax/tables.ts` (`bracketTax`, `phaseInAmount`, `lowestRate`) exists and is shared by the federal and Ontario code, but the file plan doesn't list it.
* **Rationale & Recommendation**:
  - Remove the constant, or repurpose it for the mix sum and say so.
  - List `tax/tables.ts` under file 28, so later stages reuse it instead of writing new bracket arithmetic.

### 16. The after-tax stock share readout adds a concept just to make up for another choice - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Decisions (189); Placement (418); Risks (992); files 31 and 37; FR-M16 (open).
* **Discrepancy Description**:
  - The readout brings in an average withdrawal tax rate only to offset counting the mix at face value.
  - FR-M16 says its purpose still needs rewording.
  - Lifetime tax, shown with money left, already carries the placement lesson.
* **Rationale & Recommendation**: Drop the readout for version 1, or reduce it to one explanatory sentence in the placement text.

### 17. Turning rebalancing off creates a second holdings mode - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Placement, Yearly rebalance (417); file 31 (1446); `glide` and `rebalance` tests (1661).
* **Discrepancy Description**:
  - With rebalancing off (the author's O29 decision), there is no shape, holdings are placed only at the start, and draws and deposits follow current holdings.
  - Placement, withdrawals, surplus and the tests must then handle both modes.
  - This drift mode partly switches off the placement and shape lessons it sits next to.
* **Rationale & Recommendation**: This is the author's decision, so treat this as a note on its cost. Consider deferring the switch until a tester asks for it.

### 18. Two open browser tabs overwrite each other's saved plan without warning - Severity: Nit
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Persistence (672).
* **Discrepancy Description**: Autosave writes `rp.plan.v1` one second after each edit. With the app open in two tabs, the last tab to save silently replaces the other tab's edits.
* **Rationale & Recommendation**:
  - Listen for `storage` events on `rp.plan.v1`. When another tab saves, offer "Reload it, or keep this version".
  - Alternatively, store a per-tab writer id and warn when it changes.
