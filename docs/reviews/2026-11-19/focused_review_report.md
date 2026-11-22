# Focused Review Report: Changes of 2026-11-19 (SR-1)

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md`. Only the 2026-11-19 revision is in scope: commits `3e205d4` (screens redesigned from the mockups), `3ba35b6` (Travel category group), `4429399` (Results tab reordered around the two goals) and `dcfc61a` (O16 and O30 resolved), read as `git diff aea9a1a..dcfc61a`. The config sync in `40ed1ac` (`keys.ts`, `schema.ts`, `SOURCES.md`, `planning.json`, `market.json`) is in scope where it touches the design's key tree.
**Date:** 2026-11-19
**Previous report:** `docs/reviews/2026-11-18/focused_review_report.md` (rating "Ready with fixes"). Settled decisions, including fixed returns, live recalculation, the six classes, the four strategies and user-editable rule values, were not re-opened. Findings already open in the design's Known gaps table are not repeated, except where this revision changes them.
**Line numbers** refer to the design at `dcfc61a`.

## Reviewer Status

| Reviewer | Status | Verdict |
| --- | --- | --- |
| Focused design review (one session) | completed | Ready with fixes |

One reviewer read the whole design at `dcfc61a`, the revision diff, `keys.ts`, `schema.ts`, `SOURCES.md`, the five 2026 config files and `docs/admin-config-guide.md`, and ran `tools/configCheck.ts` ("75 keys, schema OK, SOURCES.md matches"). No sub-reviewers were used, so there are no severity disagreements to report.

## Summary

- **Overall rating: Ready with fixes.** The revision was carried through the design with care. The screens, CUJs, goals, data contracts, file plan, e2e specs and stage table all describe six tabs, live recalculation, six classes, one fee level and four strategies. No text still describes a Recalculate button, a results panel, three asset classes, a fee per class, two strategies, a year-by-year table or a per-spouse bracket target as current behaviour. The key tree, `keys.ts` and `SOURCES.md` list the same 75 keys.
- **The main problems are:**
  - three validated config entries still hold values in the old design's shape (SR1-M1);
  - several new rules are not yet precise enough to implement or test: the Worker's cancelling of stale runs, Early RRSP drawdown, the planner's search, the bracket levels, shapes on the user's mix, and rule overrides (SR1-M2 to SR1-M7, SR1-M9);
  - the performance target is measured from two different points, and tips under "Let the planner pick" would multiply the run count (SR1-M3);
  - the new risks (user-changed values, the planner read as advice, no yearly refresh) have only partial mitigations (SR1-M10, SR1-M12);
  - several undecided items have no open question or gate (SR1-M13).
- **Findings:** 0 Blocker, 13 Major, 20 Nit.
- **Gating:**
  - SR1-M1 before the `stage-0` tag (it is the remaining part of SR-2).
  - Nothing in this report blocks stage 1 (tax for one person). SR-1 can be closed once this report's findings are entered in the Known gaps table.
  - Before stage 2: M3 (measurement point), M4, M6, M7, M9, M10.
  - Before stage 4: M2 (Worker part), M3 (tips rule), M5, M11.
  - Before stage 5: M2 (store part), M8, M12, M13.

## Answers to the Review Focus Questions

1. **Internal consistency, and leftover text from the old design.**
   - **Old design:** no leftovers describe the old behaviour as current. "Recalculate", "results panel", "three classes", "fee per class" and "year-by-year table" appear only in decision records and alternatives that say they were replaced. The remaining old wording is small: "global stocks" in Tax scope (SR1-N2), Alternative B's cons (SR1-N3), and the admin guide's "each January" (SR1-N14).
   - **Config:** the key tree, `keys.ts` and `SOURCES.md` agree, and `config:check` passes. But three validated entries still have values in the old shape (SR1-M1).
   - **Contracts:**
     - `configStatus` has two signatures (310 and 1320).
     - Stage 2 lists "all four strategies", but the planner's search lives in a stage-4 file.
     - "Rule overrides" are in stage 2 but have no file (SR1-M9, SR1-N11).
     - The `Result` type is still undefined; the new Results tab and strategy cards add fields to it (SR1-M11).
     - The 1-second target is measured from different points in three places (SR1-M3).
2. **Whether each new rule can be implemented and tested.**
   - **Precise enough:**
     - the six classes and their income types;
     - the fee formula (subtracted from the total return, 368);
     - the placement fill order;
     - the 11-row breakdown;
     - the strategy cards;
     - the spending-need formula (617).
   - **Not yet precise enough:**
     - live recalculation: how the Worker sees a newer edit mid-run, incomplete inputs, and tips for an old revision (M2);
     - Early RRSP drawdown: where the draw-down years end, the spouse choice, and a death during those years (M4);
     - the planner's search: dollar levels that the user cannot select, shortfalls, ties, and the $5,000 gap (M5);
     - the bracket levels: which income is topped up, before or after splitting (M6);
     - shapes on the user's mix: the reference year and clamping (M7);
     - spending: category ids, phase years, and the meaning of the nudge (M8);
     - rule overrides: which keys, ranges and units (M9);
     - the goals: the denominator, and a missing legacy goal (M11).
3. **Performance against run counts.** About 22 runs in under 1 second (about 45 ms a run) is plausible but untested. About 100 tip runs in under 2 seconds is tighter (about 20 ms a run). The tip count is only right if tips do not rerun the planner's search. With "Let the planner pick" chosen, each nudge would rerun 17 options, about 1,700 runs (SR1-M3).
4. **Risks the revision adds.**
   - **User-changed values:** covered for typing errors only (SR1-M9, SR1-M10).
   - **The planner read as advice:** partly covered. The default strategy, the O20 scope and the card colours are unaddressed (SR1-M12).
   - **No yearly refresh:**
     - indexing from the defaults' tax year to the plan's start year is undefined;
     - overrides can freeze old values;
     - the out-of-date notice hands sourcing to users (SR1-M10).
5. **Open questions and gates.** O24-O31 cover the placeholder values. They do not cover the semantics this report finds undecided (SR1-M13). O29's proposal is already written into file 31 as if decided (SR1-N12). The stage-1 gate cannot be met literally while the O24-O31 entries are null (SR1-N13).

## Prioritized Findings

There are no Blockers.

### Major

#### SR1-M1. Three validated config entries still hold values in the old design's shape
- **Severity:** Major. **Section:** Design values (482-498, 522-530); `config/2026/planning.json` (`planning.shapes`), `warnings.json` (`warnings.nudge_steps`), `market.json` (the yields); `src/engine/config/schema.ts` 39-64.
- **Problem:**
  - **Shapes:** the design now defines shapes as changes to the user's stock share, in percentage points, which can be negative (482: "−10 at retirement"). But the validated `planning.shapes` still holds absolute shares (`stockShare: 0.6`, `0.7`, `0.4`). `schema.ts` also requires `stockShare` to be between 0 and 1, so the new shape values would fail `config:check`. The values are open (O26); the *kind* of value is not, and it is wrong now.
  - **Nudge steps:** the nudge table (528) says the bracket level steps to "the other level". The validated `warnings.nudge_steps` still has `bracket_target_today: 5000`, the old per-spouse dollar target.
  - **Yields:** O30 made the yields author decisions (313). But `market.cad_equity.yield` and `market.bonds.yield` still have BlackRock factsheet URLs as their `source.url`, and status `unvalidated`, as if fetched. `SOURCES.md` correctly says "author decision". The design's entry rule (287) says author decisions are sourced as `"author decision, <date>"`.
  - The commit message of `40ed1ac` says "keys … list the same keys". That is true, but SR-2 also asks for the config files to follow the tree, and these values do not.
  - `AGENTS.md` forbids agents from changing validated entries.
- **Fix:**
  - The author edits the two validated entries:
    - `planning.shapes` becomes `points: [{ yearsFromRetirement, stockChange }]` with the placeholder values from 487-488, left `unvalidated` until O26 closes;
    - in `warnings.nudge_steps`, `bracket_target_today` is removed or replaced by a flag for "other level".
  - Then change the `planning.shapes` schema to allow changes from −1 to +1.
  - Set the six yields' `source.url` to `"author decision, 2026-11-19"`, keep the factsheet as the locator's reference, and let the author validate them.
  - Keep SR-2 open until this is done.

#### SR1-M2. Live recalculation: cancelling, revisions, tips and incomplete inputs are underspecified
- **Severity:** Major. **Section:** Components and data flow (268, 270), Performance (643), file 41 (1448), file 42 (1456-1458), CUJ 1 (148).
- **Problem:**
  - **Cancelling:**
    - "The Worker checks for a newer revision between runs" (643, 1448) cannot work as written. A Worker processes its message queue only when its current task returns, so a synchronous loop over 22 runs never sees the newer message.
    - The design rules out shared memory (270), so a shared flag is not available either.
  - **Revisions:**
    - `inputsRevision` rises on "every input edit and plan load" (268). It does not say that `setRule` and `resetRule` also raise it, although `ruleOverrides` live in the inputs.
    - Only results are dropped by revision. Nothing says that `tips` for an older revision are dropped, or what the warnings list shows between the result and its tips (old tips, none, or "Finding tips…").
  - **Change summary:**
    - `lastEdit` holds one path and time.
    - One run often covers a burst of edits (typing a number is several edits), so "naming the edit" is ambiguous.
    - Nothing says whether a plan load or import produces a change summary.
  - **Incomplete inputs:**
    - "Results appear as soon as there is enough to calculate" (148) is undefined.
    - With live runs, half-typed values (a birth year of "19", a mix not yet at 100%) reach the Worker. Nothing says whether the store validates first, or what the Results tab shows for an incomplete plan.
    - The engine's schema errors would otherwise surface as integrity errors.
- **Fix:**
  - **Worker:** choose one mechanism:
    - (a) the run loop is `async` and yields to the event loop between runs (for example `await new Promise(r => setTimeout(r))`), then checks the latest revision received; or
    - (b) the client terminates the Worker and starts a new one when a newer revision is sent during a run.
  - **Store:** state that every store action that changes `inputs`, including `setRule`, `resetRule` and `loadPlan`, raises the revision.
  - **Tips:**
    - Drop tips whose revision is not the latest.
    - Show "Finding tips…" under each warning until they arrive.
  - **Change summary:**
    - Make `lastEdit` a list of the paths edited since the last result: "3 changes: …", or the single path when there is one.
    - Show no summary after a load.
  - **Incomplete inputs:**
    - Define a `readyToRun(inputs)` check in `src/state` (the required fields, and the mix summing to 100).
    - While it fails, the store sends nothing, the Results tab shows "Enter … to see results", and the badge reads "Incomplete".
    - Add rows to `store.test.ts`.

#### SR1-M3. The performance target is measured from different points, and tips under "Let the planner pick" break the run count
- **Severity:** Major. **Section:** Success Criteria (88), Performance (640-644), Non-Functional Requirements (913), Verification Plan (1628), Warnings (476), Withdrawal strategies (384).
- **Problem:**
  - **Measurement point:**
    - Lines 88 and 913 say "within 1 second of the last edit".
    - Line 640 measures "from the end of the 500 ms pause", so the user waits up to 1.5 s for results and 2.5 s for tips.
    - The tester criterion and the manual check would judge different things.
  - **Budgets:**
    - About 22 runs in under 1 s allows about 45 ms per 30-45-year run.
    - About 100 tip runs in under 2 s allows about 20 ms per run, so tips have a tighter budget per run than results.
    - Each solved year makes up to about 64 bisection tax evaluations per pass plus an 11-step split search, so neither budget is obviously met. With no benchmark (file 59 removed), the first measurement comes before stage 8.
  - **Tips under "Let the planner pick":**
    - The design does not say how a tip rerun handles a plan whose strategy is "Let the planner pick".
    - If each nudged rerun redoes the search, tips become about 100 × 17 runs.
    - If it does not, the tip can describe a plan the planner would not pick.
    - The "bracket level" nudge (528) also has no meaning under the planner's dollar levels.
  - **Run count:** the 22 includes duplicates. The planner's options "Registered last" and "Early RRSP drawdown" are the same runs as two strategy cards. The design does not say that they are reused.
- **Fix:**
  - Use one measurement point everywhere. "From the end of the 500 ms pause" is the measurable one; restate lines 88, 913 and 1628 to match.
  - State that tip reruns hold the planner's pick fixed: they run the picked option with the nudged input, and the tip says so.
  - State that planner options identical to a strategy card reuse that run (about 20 runs).
  - Add a rough per-run timing to `yearSolve.test.ts` or a stage-2 note (for example, log the time of one 40-year run in CI), so a budget miss shows up before stage 8.

#### SR1-M4. Early RRSP drawdown cannot be implemented as written
- **Severity:** Major. **Section:** Withdrawal strategies (383), year solver step 5 (417-418), file 32 (1386), unit tests (1588).
- **Problem:**
  - **Draw-down years:** "until both spouses have started both CPP and OAS" does not say whether the year in which the last benefit starts is included. Benefits start the month after the birthday (277), so that year usually has only a few months of benefit.
  - **Death:** if a spouse dies before their CPP or OAS starts, the condition is never met. Nothing ends the draw-down years.
  - **Spouse choice:** "from whichever spouse has the lower taxable income so far that year" does not say:
    - whether all of W comes from that spouse, or W is shared so that the two incomes end up equal;
    - what happens when that spouse's RRSP/RRIF and LIF run out, or reach the LIF maximum;
    - whether income is measured before or after pension splitting;
    - which spouse goes first when incomes are equal.
  - **Monotonic solve:** bisection needs W → draws to be a fixed, monotonic function. "Lower income so far" changes as W grows, unless it is defined as a fill-up rule.
  - **Edge cases not covered:**
    - a still-working spouse in the draw-down years;
    - a plan with no draw-down years (benefits at retirement), which makes this strategy identical to "Registered last".
- **Fix:**
  - **Draw-down years:** the years from the first retirement year up to and including the last year in which any living spouse's CPP or OAS has not yet started. They end at the first death for the deceased's benefits.
  - **Spouse rule:** state it as a fill-up. Draw from the spouse with the lower taxable income (before splitting, after steps 3-4) until the two are equal, then from both equally. Within a spouse, draw RRSP/RRIF and LIF in proportion to their balances, with LIF capped at its maximum. When one spouse's registered money runs out, draw from the other spouse. If incomes are equal, start with spouse 1.
  - **No draw-down years:** the options row says "No draw-down years with these start ages; same as Registered last".
  - **Tests:** add rows to `earlyRrsp.test.ts` for equal incomes, one spouse exhausted, a death during the draw-down years, and zero draw-down years.

#### SR1-M5. "Let the planner pick": its options, ranking and tie rule are undefined
- **Severity:** Major. **Section:** Non-Goals (95), Withdrawal strategies (382, 384), Design values (498), O31 (140), file 36 (1413), unit tests (1592).
- **Problem:**
  - **Levels the user cannot choose:**
    - The search tries "Fill lower brackets first" at dollar levels from $40,000 to $110,000.
    - The strategy the user can choose has only two levels, "Top of the first bracket" and "Just under the OAS clawback" (382).
    - If the planner picks "Fill brackets at $75,000", no card or option can reproduce it. "Use this strategy" in the dialog has no meaning for that pick.
    - Non-Goals (95) says the search tries "the other named withdrawal strategies, at a fixed list of levels". The dollar levels are not named levels.
  - **Ranking ignores the spending goal:**
    - "Most left after tax" and "Least lifetime tax" rank options on one number.
    - An option that runs short of money earlier, or for longer, can still win. Under "Least lifetime tax" this is likely, because drawing less money pays less tax.
    - The planner would then pick a plan that misses Goal 1.
  - **Ties:** O31 leaves the tie rule open, but ties are common. "Early RRSP drawdown" with no draw-down years equals "Registered last". Every level below the couple's fixed income gives the same result as "Registered last".
  - **The $5,000 gap:** the "small changes could swap them" threshold (384) is a number in the design text. It is in neither the config nor `constants.ts`.
  - **The pick can change:** the pick can change with any edit, but the change summary (1460) does not report a change of pick.
- **Fix:**
  - **Levels:** either:
    - (a) search only the user-selectable options (Registered last, Early RRSP drawdown, Fill lower brackets at its two named levels); or
    - (b) make the level a dollar amount the user can also enter, and add `bracketLevelToday` to `PlanInputs`.

    Record the choice in O31 and fix line 95.
  - **Ranking:** rank first by whether spending is covered every year (then by a later first shortfall year, then by a smaller total shortfall), and only then by the chosen goal.
  - **Ties:** compare in today's dollars rounded to $1. On a tie, take the option that comes first in `planning.planner_search`, with Registered last first.
  - **Gap threshold:** move the $5,000 into `planning.planner_search`, for example as `closeGapToday`.
  - **Change summary:** add "planner's pick changed from X to Y".
  - **Tests:** add `plannerSearch.test.ts` rows for an option with a shortfall and for a three-way tie.

#### SR1-M6. The two bracket levels do not say which income is topped up
- **Severity:** Major. **Section:** Withdrawal strategies (382), year solver step 4 (409-412), file 32 (1385).
- **Problem:**
  - **Clawback level:** the top-up is measured on "taxable income (before splitting)". But the OAS clawback is based on net income after the pension split. Topping each spouse up to the threshold before splitting can push the receiving spouse over it, so "Just under the OAS clawback" can create clawback.
  - **Which income:** "taxable income" does not say whether it includes grossed-up eligible dividends (net income does) and taxable capital gains.
  - **Ordering:**
    - Step 4 lists the top-up before the non-registered cash yield. The top-up needs the yield to know how far income already is from the level.
    - Gains realized later, in the withdrawal solve, push income above the level. This is not stated as accepted.
  - **"Just under":** no margin is given (exactly at the threshold, or a set amount below it).
  - **Indexing:** the level is read from a threshold that is indexed. Nothing says whether it is indexed from the tax year or from the plan start (see SR1-M10).
- **Fix:**
  - Define the topped-up income as net income in the sense of the `TaxableIncome` components: eligible dividends grossed up, gains at the inclusion rate, before splitting. State that splitting and the solve's own realized gains can move it above the level; this is accepted.
  - For the clawback level, top up to the threshold itself (no margin). Note that the split search keeps the household tax lowest, which includes any clawback.
  - Reorder step 4: minimums, then the non-registered cash yield, then the top-up.
  - Add a `fillBrackets.test.ts` row with dividends and realized gains.

#### SR1-M7. Shapes applied to the user's mix have no reference year, and clamping has no fallback
- **Severity:** Major. **Section:** Placement and growth-to-safety (373), Design values (482-488), file 31 (1375), O26 (135).
- **Problem:**
  - **Reference year:**
    - The shapes have points before retirement ("+10 at −10 years", "0 at −5 years").
    - The user sets "today's mix", which applies at the plan start. The plan start can be 12 years before retirement, or 3 years after it.
    - The design does not say whether the change at year *t* is `shape(t)` or `shape(t) − shape(planStart)`.
    - Under the first reading, a user 10 years from retirement on "Get safer gradually" jumps from 60% to 70% stocks in year one, which contradicts "today's mix".
  - **Clamping:** "the points … go to or come from bonds and cash in the user's proportions" fails when the user holds no bonds and no cash (100% stocks), or no stocks. There are no proportions to use.
  - **Whole numbers:** `mix` holds whole numbers summing to 100. Shape output and redistribution give fractions, and nothing says whether the engine rounds them.
  - **O26:** O26 asks for the values only. These are semantic choices, not values.
- **Fix:**
  - State that the change in year *t* is `shape(t) − shape(t₀)`, where *t₀* is the plan start in years from the first retirement. Then year one always equals today's mix.
  - When bonds and cash are both 0%, points taken from stocks go to bonds. When stocks are 0%, points added go to the user's stock classes in the proportions of the chosen starting mix, or to Canadian stocks for "Custom".
  - State that the engine works with fractions; whole numbers are a screen rule.
  - Add `glide.test.ts` rows for plan starts before and after retirement and for 100%-stock and 0%-stock mixes.

#### SR1-M8. Spending inputs: category ids, phase years and the spending nudge are not defined
- **Severity:** Major. **Section:** Spending inputs (668-686), Config contract persisted ids (305), Data contracts (548-557, 617), nudge steps (526), O27 (136, 496).
- **Problem:**
  - **Category ids:**
    - Line 305 points to Spending inputs for the persisted category ids. That section lists only display names, plus a rule that Travel ids carry a `travel_` prefix.
    - Ids are permanent once plans are saved (682), and the sample plan and e2e tests will fix them in place at stage 7.
  - **Phase years:**
    - Nothing says whether `fromYear` counts the first retirement year as 0 or 1 ("from year 10").
    - Nothing requires the later phase to start after the slower one, or limits `fromYear`.
    - O28 covers amounts, not years.
  - **Mode switching:**
    - Nothing says what happens to category amounts and overrides when the user switches to "One total", and back.
    - Nothing says whether `monthlyTotalToday` starts from the category sum.
  - **The nudge:** "Spending phases ±5%" no longer fits:
    - phases are now a start year and a `keepPct` share;
    - active spending is a sum of categories.

    A tip cannot be computed until the nudged input path is named.
  - **Indexing:** mortgage and auto payments are usually fixed in nominal terms. The design inflates every category. This is not stated as an accepted simplification (see SR1-N10).
- **Fix:**
  - List every category id in Spending inputs, for example `home_mortgage_rent` … `other`, and `travel_transport` … `travel_shopping`.
  - **Phase years:** state that year 0 is the first retirement year, so "from year 10" means the first retirement year + 10. Validate that `0 < slower.fromYear < later.fromYear ≤ plan length`.
  - **Mode switching:** state that switching modes keeps both sets of values, and that "One total" starts from the category sum the first time.
  - **Nudge:** define it as "active-years spending × (1 ± 5%), applied to every category and to the one total". Name its input path.
  - Add a `spending.test.ts` (or `units.test.ts`) row covering overrides, phases and the survivor percentage.

#### SR1-M9. Rule overrides: which keys can be changed, and the validation, units and import rules
- **Severity:** Major. **Section:** Config contract (307, 310), Decisions (192, 204), Asset classes (362, 367, 369), Settings (726), file 24 (1320), file 40 (1439), stage 2 (1043), unit tests (1594-1595).
- **Problem:**
  - **Which keys** — the design contradicts itself:
    - **Fee levels:** "can be changed in Settings" (192, 367, 726). But line 307 says planning choices are not overridable and that fee levels "have inputs of their own". `PlanInputs` holds only `feeLevel` and `customFee`, so an edited "Index ETFs" value has nowhere to be stored.
    - **Yields:** "editable in Settings" (204, 362) and in the key tree, so they are overridable. But line 369 says "Yields and income types always come from the config".
    - **Returns:** both a rule-value key (`market.<class>.geometric_return`) and `investing.returnOverride`. Settings lists "returns" (726). Nothing says which input wins, or whether Settings writes to `returnOverride`.
    - **Life expectancy tables:** sourced planning values, and not mentioned.
  - **Validation:**
    - "A sanity range" is not defined for any key, and `keys.ts` has no range field.
    - Structural rules are missing for tables:
      - bracket `from` rising, with the first row at 0;
      - age tables with no gaps;
      - `phaseIn` caps that never fall;
      - surtax thresholds and rates of equal length.
    - Cross-key rules are missing, for example CPP earliest < latest, and OAS minimum residence ≤ full residence.
  - **Units:**
    - Nothing says whether a `CAD_per_month` override (OAS) is entered per month and converted ×12 like the default.
    - Nothing says whether a dollar override is in tax-year dollars, indexed like the default.
  - **Import:** a plan from another app version can hold an override for a key that no longer exists, or that has a different kind. CUJ 5 imports into a newer app, and nothing says what happens.
  - **Contracts:**
    - `configStatus` takes `overrides` at 310 but not in file 24 (1320).
    - `applyRuleOverrides` is exported (1439), but no file entry defines it, although stage 2 builds "rule overrides".
    - No test covers override validation.
- **Fix:**
  - **Which keys:** state one rule: Settings writes `ruleOverrides` for every key in the key tree, rule values and planning values alike, except `warnings.*`.
    - Fee levels stay planning choices, but their values can be overridden. Correct 307.
    - Yields are overridable. Delete "always come from the config" at 369, or reword it to "default from the config".
    - Returns are edited only through `returnOverride`, and Settings links to it. Exclude `market.<class>.geometric_return` from `ruleOverrides`.
  - **Validation:**
    - Add a range to each `KeySpec` (or a range per unit: rate 0-1, age 40-110, CAD ≥ 0).
    - Add the structural and cross-key checks as `validateOverride(key, value, cfg)` in `src/engine/config/overrides.ts`, which also holds `applyRuleOverrides`.
  - **Units:** state that overrides are entered in the key's published unit and in tax-year dollars, and go through the same loader conversion and indexing.
  - **Import:** on import, drop an override whose key is unknown or whose value fails validation, and list each dropped override in a message.
  - **Contracts:** fix the file 24 signature.
  - **Tests:** add `overrides.test.ts` rows (range, structure, cross-key, ×12, unknown key on import).

#### SR1-M10. With no yearly refresh, indexing from the defaults' year and stale overrides are undefined
- **Severity:** Major. **Section:** G9 (77), CUJ 6 (178), Units and conventions (275, 281), Config contract (310), Risks (945, 947), file 19 (1256), `docs/admin-config-guide.md` line 3.
- **Problem:**
  - **Indexing from the tax year:**
    - `planStartYear` may be up to 5 years after the current year (544).
    - Once refreshing is optional, the defaults' tax year can be several years before the plan start.
    - Line 281 says indexed values "grow at the fixed rate". It does not say from which year: the config's tax year, or the plan start.
    - If the engine treats a 2026 threshold as a 2029 value, every indexed threshold is understated by about three years of inflation. That is a systematic tax error with no warning.
  - **Stale overrides:**
    - An override set against the 2026 default stays in the plan when the defaults are later refreshed to 2027.
    - The user then keeps an old value, still marked "changed", and is never told that the default moved.
  - **Sourcing moves to users:**
    - The out-of-date notice "points to Settings rather than asking for an admin update" (310). In practice, users are asked to source rule values themselves.
    - The risk row (947) does not mention this.
  - **Stale claims:**
    - G9's title still promises "Sourced rule values".
    - The admin guide still opens with "Run this each January".
- **Fix:**
  - Add to Units and conventions: an indexed value from tax year *Y* is multiplied by (1 + inflation)^(year − *Y*), counting from *Y*, not from the plan start. Add a `units.test.ts` row with `planStartYear = taxYear + 3`.
  - Store the default's tax year with each override (`{ value, defaultTaxYear }`). When the bundled tax year differs, mark the override "set against 2026 defaults" in Settings and in the header chip.
  - In Settings, show each source as a link, so a user who updates a value can check it.
  - Extend the risk row: "values in use can be several years old; the notice names the year; changed values say which year's default they replaced".
  - Change the admin guide's opening to match file 19.

#### SR1-M11. The Results tab and strategy cards need fields that the `Result` contract does not have
- **Severity:** Major (extends r2 M1). **Section:** Result definitions (457-460), Data contracts (605-613), Results tab (714-720), Withdrawals tab (705), files 37 and 47 (1418-1421, 1505).
- **Problem:**
  - **Goal 1:**
    - It shows "the number of years covered out of the plan's years". Rows start at the plan start, and years before the first retirement have a spending need of zero, so they are trivially "covered".
    - The denominator is not defined.
  - **Goal 2:**
    - It shows "Met" or "Missed" against `legacyGoalToday`.
    - Nothing says what the card shows when the user has set no goal (0 or empty), which would otherwise read "Met".
  - **Missing fields:**
    - `PlanSummary` has no `legacyGoalMet`, `yearsCovered` or `yearsInPlan`.
    - The estate waterfall needs balances at death, final-return tax, tax on gains, probate and the home. `YearRow` has none of these (r2 M1, still open).
    - `Result` itself, the `tips` message type and the planner's fields at `Result` level are still undefined.
  - **Card figure:** the strategy cards show "clawback years", which is in `PlanSummary`. They also show "the amount moved to the TFSA", but `savedToTfsaNom` is not defined against surplus that goes to non-registered accounts (SR1-N4).
- **Fix:**
  - Define Goal 1 over the years from the first retirement to the second death.
  - With no legacy goal, Goal 2 reads "No goal set", with the projected legacy only.
  - Restate r2 M1 to include:
    - `Result = { revision, configStatus, plan: { rows, summary, estate }, strategies: StrategyResult[], placement: { summary, baselineSummary, afterTaxStockShare }, warnings }` and `Tips = { revision, byWarning }`;
    - `PlanSummary` gaining `legacyGoalMet`, `yearsCovered`, `yearsInPlan`;
    - an `EstateBreakdown` type for the waterfall.

    Close it at stage 3, as listed.

#### SR1-M12. "Let the planner pick" read as advice: the mitigations leave three gaps
- **Severity:** Major. **Section:** Risks (946), Non-Goals (95), Withdrawals tab (705), file 42 `defaults.ts` (1459), O20 (129).
- **Problem:**
  - **Default strategy:** the default strategy is not stated. If `defaults.ts` or the sample plan starts on "Let the planner pick", every new user sees a pick before choosing anything, which is closer to a recommendation than a comparison.
  - **Card colours:** the cards colour the difference from "Registered last" green or red (705). Colour is a judgement. It is also undefined when tax and money left move in opposite directions, which is the case the design most wants explained.
  - **O20:** the planner is the one feature most likely to be read as advice, and O20's FSRA check does not mention it.
- **Fix:**
  - State that the default strategy (`defaults.ts`, the sample plan) is "Registered last".
  - Colour only the money-left difference (green for more). Show the tax difference in neutral text. When the two move in opposite directions, show both in neutral text with the "opposite directions" note.
  - Add to O20: "including whether 'Let the planner pick' needs different wording or must be removed before public release".

#### SR1-M13. Several undecided items have no open question or gate
- **Severity:** Major. **Section:** Open Questions (104-141), stage table (1039-1049), Known gaps (993-1033).
- **Problem:** O24-O31 cover the placeholder values. These undecided points, found above, have no question or gap row, so no stage gate makes sure they are settled:
  - the shape reference year and clamping fallback (M7);
  - the planner's search options, ranking with shortfalls, and ties (M5; O31 covers the range, step and tie rule only);
  - the Early RRSP drawdown spouse rule and the end of the draw-down years (M4);
  - which keys can be overridden, and their ranges (M9);
  - indexing from the defaults' tax year (M10);
  - the Worker cancel mechanism and the incomplete-plan state (M2);
  - the category ids (M8);
  - the default strategy (M12).
- **Fix:**
  - Add Known gaps rows `SR1-M1` … `SR1-M13`, each with its "close before" stage as in this report's Summary.
  - Either widen O31 to "options, ranking and tie rule", or add O32 for the planner's ranking.
  - Mark SR-1 closed by this report.

### Nit

| ID | Section | Problem and suggested fix |
| --- | --- | --- |
| SR1-N1 | Status (6) | The status still says the 2026-11-19 revision "has not been reviewed". Name this report, and say its findings are prefixed `SR1-`. |
| SR1-N2 | Tax scope (333) | "the foreign-dividend yield of global stocks" uses the old three-class term. Say "of U.S., international and emerging-market stocks". |
| SR1-N3 | Alternative B (743) | The cons ("about a second and would make inputs sluggish") describe the old run. Reword them as risks the chosen design handles: work on every edit, and results that move while the user types. |
| SR1-N4 | Withdrawals tab (705, 707), StrategyResult (611) | The green band "money not needed (moved to the TFSA)" and the card's "amount moved to the TFSA" leave out surplus that goes to non-registered accounts when TFSA room runs out. Label it "Saved (TFSA, then non-registered)", or show the two parts separately. |
| SR1-N5 | Results badge (259, 722, 1507) | The badge can show the warning count, "Updating", "Short from <year>" or "Error". The order of precedence when several apply is not stated. Suggested order: Error, Updating, Short from, warning count. |
| SR1-N6 | Live recalculation (268) | Runs that finish in under about 200 ms would make the faded "Updating…" state flicker on every edit. Fade only after a short delay (a UI constant). |
| SR1-N7 | Placement (375, 500-505) | The fill order inside the global stocks column (emerging, then international, then U.S.) is not explained. It decides which class sits in the TFSA, where foreign withholding is lost. Nothing says how accounts of the same type are filled across spouses (pro rata by balance?). State the reason and the rule. |
| SR1-N8 | e2e CUJ 2 and CUJ 4 (1613, 1615) | CUJ 4 checks "the rows after 78", but there is no year table any more; name the Balances chart's table view. CUJ 2 should check that the income chart switches as soon as a card is clicked, before the rerun, as line 470 promises. |
| SR1-N9 | Unit tests (1581-1597) | There are no rows for: the mix sliders (moving other classes in proportion, whole-number rounding, a class at 0% staying at 0%), and no file owns this rule; the spending need (see SR1-M8); Worker cancelling (SR1-M2); override validation (SR1-M9). Add them and name the owning files. |
| SR1-N10 | Spending inputs (675-676) | Mortgage and auto payments are usually fixed in nominal terms, but the engine inflates every category. Say this is accepted, and point to "Different later?" as a rough adjustment. |
| SR1-N11 | Stage table (1043), file 32 (1381) | Stage 2 says "withdraw/* (all four strategies)", but "Let the planner pick" is a search in file 36 at stage 4. Say "three strategies" at stage 2. "Rule overrides" at stage 2 has no file (SR1-M9). |
| SR1-N12 | File 31 (1377) | "Rebalancing off (O29) skips `rebalance` after the plan start" states O29's proposal as decided. Add "(pending O29)". |
| SR1-N13 | Stage gate 1 (1042) | "Stage 0 config validated" cannot be met while `planning.mixes`, `fee_levels`, `spending_phases` and `planner_search` are null until O24-O31 close. Narrow it to "`federal.json` and `ontario.json` validated". |
| SR1-N14 | `docs/admin-config-guide.md` line 3 | "Run this each January for the new tax year" contradicts file 19 ("optional"). Match file 19. Covered by SR1-M10's fix. |
| SR1-N15 | Known gaps FR-M5 (1012); `market.json` | FR-M5 was a likely problem. Now it is a fact: the committed `market.bonds.yield` is 0.0347, above the bond return of 0.032, so the bond price return is negative every year. Say so in the row. |
| SR1-N16 | Withdrawal strategies (386) | The "In your plan" line compares against "Fill lower brackets first" without saying at which level. Say "at the level selected in the options row". |
| SR1-N17 | Glossary (950-968) | New terms are missing: draw-down years, the planner's pick, changed value (rule override), fee level, starting mix, the spending phases (active, slower, later) and Settings. Add them. |
| SR1-N18 | Data contracts (559-560) | Nothing says whether `mixId` becomes `custom` when the user moves a slider after choosing a named mix. State it. |
| SR1-N19 | Known gaps SR-3 (1032) | FR-M6 has partly closed: the fee formula is chosen (368, "subtracted from the total return"), the override limit is before fees (507), and the global base is gone because each class has its own FP Canada figure. Restate SR-3 as what remains: the file that owns each class's yearly return, the yield and price split, and the citation for the 0.5-point margin. |
| SR1-N20 | CUJ 2 (154) | "Results on every tab follow within a second" uses the old measurement point. Align it with SR1-M3. |

## Effect on Earlier Findings

| ID | Status after this revision | Notes |
| --- | --- | --- |
| SR-1 | Closed by this report | Replace it with the SR1- rows (SR1-M13). |
| SR-2 | Mostly done | The key lists match (75 keys, `config:check` passes). The values of `planning.shapes` and `warnings.nudge_steps`, and the yields' sources, still follow the old design (SR1-M1). |
| SR-3 / FR-M6 | Partly closed | See SR1-N19. |
| FR-M1, FR-M3, FR-M19 (list kind) | Closed | The key tree now lists every key, grouped. `stress_paths` and `low_success` are gone. The `list` kind is in the Config contract. |
| FR-M5 | Open, now confirmed | See SR1-N15. |
| FR-M16 | Open, sharper | With a user-set mix and six classes, presets move more stock into the TFSA. The readout's purpose (377) still says "hidden risk". |
| FR-M17 | Open, sharper | Goal 1 now shows a "Met" badge, which adds to the false assurance under steady returns. Close it at stage 4, together with the Goal 1 card. |
| FR-M18 | Open | "Steady average returns" still appears at 19, 361, 457, 715 and 939. |
| r2 M1 | Open, grows | See SR1-M11. |
| r2 M2 | Likely moot | CUJ 6 is now a user change in Settings. Withdraw it, or move its notice check into `settings.spec.ts` as file 60 suggests. |
