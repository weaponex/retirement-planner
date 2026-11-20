# Goldfish Review Report: Intermediate Zoom Out (Stage 8)

**Target:** `docs/designs/retirement-planner.md` (lines 1-1709)

This review looks at the fixes that Stages 6 and 7 proposed and asks one question about each: would applying it pull the design too low (too much detail) or too wide (too much scope)? It is based on these reports:

- Stage 5: `zoom_out_report.md`
- Stage 6: `comprehension_report.md`
- Stage 7: `critic_report.md`

The author has not applied any fixes from Stages 5-7 yet, so the design is the same one Stage 5 reviewed.

Finding IDs used below:

- **ZO-n:** Stage 5 findings.
- **CR-n:** Stage 6 findings.
- **Critic-n:** Stage 7 findings.
- **FR-** and **SR1-:** earlier focused-review IDs that the design already cites.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |

## Verdict

**Ready with fixes.** Stages 6 and 7 found real defects. But about a third of their fixes add rules to three features that Stage 5 already proposed cutting:

- the planner
- the ability to override every config value
- the after-tax stock-share readout

Several other fixes describe the same problem in three to five slightly different ways. If the author applies them one at a time, the document will get longer and the scope will grow.

**Suggested order of work:**

1. **Make the scope decisions first.** These are the Stage 5 findings ZO-1 (planner), ZO-2 (overrides), ZO-4 (spending), ZO-16 (readout), ZO-17 (rebalance-off switch), and ZO-10 and ZO-13 (performance).
2. **Apply the correctness rules** in findings 2, 6 and 7 below.
3. **Define the contracts.**
4. **Do one editorial pass.**

After step 1, many of the Stage 6 and 7 findings no longer apply.

**Severity breakdown:** 0 Blockers, 7 Majors, 8 Nits.

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. The planner fixes patch a feature Stage 5 proposed cutting - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 95 (Non-Goals), 140 (O31), 193 (Decisions), 302-304 (planner persisted ids), 431 (Withdrawal strategies), 547 (Design values), 616-619 (`withdrawal` contract), 996 (Risks), 1109 (stage 4 gate), 1478-1483 (file 36). These findings are affected: CR-2, Critic-10, the `planner_search` part of Critic-12, the planner fields in Critic-4, and ZO-1.
* **Discrepancy Description**: Critic-10 alone adds four rules:
  - rank by shortfall first, then by the goal
  - restrict the bracket levels, or add a `bracketLevelToday` input
  - keep the pick fixed during tip reruns
  - reword line 95

  CR-2 adds a fifth: how a dollar-level pick is shown and stored.

  The `bracketLevelToday` option adds a new saved input, which widens scope. The other option is to search only the levels a user can select. That leaves four candidates, and all four already run for the strategy cards. The "search" then just picks the best of numbers already on screen, which is the passive marker ZO-1 proposed. Both routes end in the same place.
* **Rationale & Recommendation**: Cut the planner, as ZO-1 proposes. If the author wants a pointer, add one rule: "mark the card that covers spending (first by whether it covers every year, then by first shortfall year) and, among those, leaves the most."
  - This closes CR-2, Critic-10, SR1-M3 (tips part), SR1-M5, SR1-M12 and O31.
  - It also removes `planner_search` from Critic-12 and the planner fields from the `Result` that Critic-4 proposes.
  - Do not add `bracketLevelToday`.

### 2. One narrow fix covers the "today" base year, the two inflation clocks and the indexing contradictions - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 274-275 and 281 (Units and conventions), 593 (`planStartYear` range), 643-646 (`DbPensionInput`), 1387, 1394 and 1401 (files 24-26), 1655 (`ontario.test.ts` row), 1665 (`units.test.ts` row), and `src/engine/config/read.ts` line 33. These findings are affected: Critic-5, ZO-8, CR-5 (indexing), and CR-10 (unused `planStartYear` parameter).
* **Discrepancy Description**: Each finding proposes its own fix:
  - **Critic-5:** fix "today" to one year. Then either restrict the start year, or label every input "in <year> dollars", carry balances forward to the start year, and add a DB dollar-basis flag.
  - **ZO-8:** either rebase the config or keep `ruleFactor`.
  - **CR-5 and CR-10:** fix the contradictions in the contract.

  The labelling-and-carry-forward option is too wide. It needs a growth projection that runs before the plan starts, plus a new DB input.
* **Rationale & Recommendation**: Use the narrow version.
  - Restrict `planStartYear` to the year the plan's values are entered (drop "+5"). Store it, and do not check it against the clock again when a plan is loaded.
  - State in one line that DB statement amounts are taken as today's dollars.
  - Adopt ZO-8's `rebaseConfig(cfg, planStartYear)`, run once after overrides are applied. `ctx.deflator` then stays the only clock, and `read.ts` needs no change.
  - This removes `ruleFactor` and `makeRuleFactor`, which settles CR-10 and the indexing contradictions in CR-5. Keep one `units.test.ts` row.
  - Cut the labelling, carry-forward and DB-flag options.

### 3. The Stage 7 override fixes grow the validation that ZO-2 shrinks - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 307-318 (Config contract), 626 (input ranges), 776 (Settings), 1386 (file 24 `overrides.ts`), 1660 (`overrides.test.ts`). These findings are affected: Critic-12, Critic-28, Critic-29, Critic-3 (override shape), ZO-2 and ZO-3.
* **Discrepancy Description**: The findings pull in opposite directions:
  - **Critic-28** adds two more structure checks: at least five bracket rows, and bracket starts that strictly rise.
  - **Critic-29** adds input ranges that depend on overridden values.
  - **Critic-12** goes the other way: only keys with a Settings row can be overridden. That agrees with ZO-2's short list of single values.
* **Rationale & Recommendation**: Adopt Critic-12 and ZO-2 as one rule: a key can be overridden only if it is a single value with a Settings row. These cannot be overridden:
  - tables
  - presets
  - shapes
  - the life-expectancy tables
  - the CPP and OAS age-limit keys

  With that rule, Critic-28 and Critic-29 are not needed. Cut them. Keep Critic-3's `{ value, defaultTaxYear }` shape, and change `types.ts` before any plan is saved. Keep ZO-3's single route for returns.

### 4. The stock-share readout fixes patch a feature Stage 5 proposed dropping - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 189 (Decisions), 418 (Placement), 749 (Savings tab), 880 (Alternative P), 992 (Risks), 1448 and 1490 (files 31 and 37), 1564 (file 46). These findings are affected: Critic-8 (a rate above 100%), Critic-43 (overclaim), FR-M16 and ZO-16.
* **Discrepancy Description**: Three findings propose a new rate definition, a clamp, a new `Result` field and new wording. All of that rescues one figure, and that figure exists only to make up for counting the asset mix at face value.
* **Rationale & Recommendation**: Cut the readout, as ZO-16 proposes, or replace it with one sentence of explanation.
  - This closes Critic-8, Critic-43 and FR-M16.
  - It also removes `afterTaxStockShare` from Critic-4's `Result` and the `afterTaxStockShare()` function from file 31.

### 5. Five fixes for where the history goes conflict, and most would make the document longer - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Line 6 (header), line 780, lines 790-800, 856 and 862 (Alternatives B, C, L and M), lines 1043-1097 (Known gaps), and review IDs throughout. These findings are affected: CR-1, CR-4, Critic-13, Critic-14, Critic-17, Critic-18 and ZO-5.
* **Discrepancy Description**: Each finding puts the history in a different place:
  - **CR-4:** a change-log section.
  - **Critic-17:** a review-history table in the header.
  - **Critic-14:** two new Alternatives entries and a "Superseded decisions" heading.
  - **Critic-13:** entries in `docs/history/decision-log.md`. But file 18 (lines 1309-1316) defines that file as the prototype's history, so current decisions would be mixed into the prototype's record.
  - **ZO-5:** move the history out of the design.

  Most of these add sections to a 1,709-line document. Its main problem is already that it mixes the spec with its history (brief line 78).
* **Rationale & Recommendation**: Apply one rule:
  - The Decisions table, with its date and "Chosen by" columns, is the record. Reword line 780 to say so. The brief covers the earlier decisions.
  - Rewrite Alternatives B and C in place as the options that were actually rejected: a Recalculate button only, and generated returns. Delete L and M. Do not add a "Superseded" heading.
  - Make the header one status line and a link (CR-11), not a table.
  - Keep a table of open gaps only, with each row understandable on its own (CR-1). Move the closed rows and the review narrative to `docs/reviews/`.
  - Rewrite that table after the scope cuts, because many of its open rows (SR1-M3, M5, M12, FR-M16) will disappear.

### 6. Three stages reshape the Worker and result design, and two of their fixes conflict - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 268-270 (Live recalculation), 689-694 (Performance), 705 (Verification), 994 (Risks), 1507 (file 40), 1514-1518 (file 41), 1525-1527 (file 42). These findings are affected: Critic-1, Critic-4, Critic-41 (line 148), ZO-9, ZO-10, ZO-13, SR1-M2 and SR1-M11.
* **Discrepancy Description**:
  - **Conflict:** Critic-1 offers either an async loop that pauses between runs, or stopping the Worker. Stopping the Worker throws away the per-variant cache that ZO-10 puts inside it.
  - **Overlap:** Critic-4 fixes one `Result` shape. ZO-10 splits results into messages sent in priority order, and ZO-9 adds an error state for each variant.
  - **Too much together:** adopting all of them gives more message types, a cache, partly filled cards and error screens for each variant. Once the planner is cut, each edit needs only about five runs, and none of that machinery is needed.
* **Rationale & Recommendation**:
  - **Keep** Critic-1 option (b): when a newer revision arrives, the client stops the Worker and starts a new one. This is one sentence and needs no async code in the engine.
  - **Keep** `readyToRun` and the "Incomplete" badge. Build `readyToRun` from the plan's zod schema (file 43 `planSchema.ts`) plus the check that the asset mix adds up. Do not write a second validator.
  - **Keep** the current two messages (result and tips), and add Critic-4's `EngineError`.
  - **Define** `Result` and `Tips` as field lists after the scope cuts. Include SR1-M11's Goal 1 rule ("first retirement to second death").
  - **Cut** ZO-10's cache and streamed results.
  - **Shrink** ZO-9 to one rule: "a failing tip rerun is dropped and logged; a failure in any main run blocks results."
  - **Defer** ZO-13 (lazy tips) unless the speed check fails.

### 7. Correctness fixes that are needed and right-sized - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Several sections, listed with each fix below.
* **Discrepancy Description**: These Stage 6 and 7 fixes close real defects without widening scope. Where a finding offers options, the simplest one is enough.
* **Rationale & Recommendation**:
  - **Critic-6, working spouse's salary** (lines 101, 278, 425, 430): **keep option 1.** A spouse who is still working takes no optional withdrawals and no bracket top-ups until they retire.
    - Option 2 adds a second tax path, because it puts a flat marginal rate inside the tax function the bisection search uses.
    - Option 3, a gross-pay field, contradicts Non-Goal 101.
    - With option 1, a Risks row is optional.
  - **Critic-7, final return** (lines 477-482): **keep as proposed.** One return, taxed once, with the clawback recomputed. The extra tax is paid from the estate before probate. Add one `death.test.ts` row.
  - **Critic-9 and ZO-7, the income-split test** (lines 436, 710): **keep, but simpler.**
    - Delete the test that the result "matches the full nested search". Comparing a shortcut with an exact search is a benchmark, not a test the code must always pass.
    - Keep the test "never more tax than a 0% split" only if the final pass also tries 0% at the final withdrawal and keeps the lower tax. Otherwise drop it too.
    - No tolerance constant is needed.
  - **Critic-3, data contracts** (lines 620, 622-629, 654): **keep** the override shape, the spouse `name` field and the `...Today` totals.
  - **Critic-2, privacy claims** (lines 21, 72, 955): **keep the rewording.**
    - The Content Security Policy rules Critic-2 asks to spell out are already in file 6 (lines 1186-1191). Link to them.
    - The Worker loads from a `blob:` URL, so `worker-src` must allow `blob:`. Add that in one line, or defer it to the public release along with the origin move in Risks row 983.
    - Add no new end-to-end test.
  - **Keep these one-line fixes:** Critic-15 (federal bullet), Critic-19 (line 274), Critic-20 (Overview), Critic-23 (the clawback glossary entry) and CR-3 (DC money is entered as a LIRA).
  - **Critic-16, one "Screens" section:** **keep.** It shortens the document. It also fits ZO-4: once spending categories leave the engine, the Spending inputs belong with the screens.

### 8. Rolling backups widen the save design; the two-tab problem needs only one line - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 672-676 (Persistence), 984 (Risks). These findings are affected: Critic-11 (Stage 7 rated it Major) and ZO-18.
* **Discrepancy Description**: The design already makes the export file the lasting copy (G7, Alternative X). Keeping the last N saves would need a restore screen and a rule for choosing N. That is a lot of scope for three households who are already prompted to export.
* **Rationale & Recommendation**: Add a Risks row: "two tabs: last save wins; accepted for version 1." Optionally, show a notice when the browser's `storage` event fires (a few lines of code). Defer rolling backups, and add a one-line Alternatives entry recording that the brief's request was rejected.

### 9. Caps on the number of accounts are premature - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 595-596 (Data contracts). This affects Critic-31.
* **Discrepancy Description**: The caps add validation and screen limits to protect a speed budget nobody has measured yet. The three test households are already known.
* **Rationale & Recommendation**: Cut them. Revisit only if the stage-8 speed check fails.

### 10. The rule "CI fails on any unfetched key the engine reads" needs new tooling - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 321 (Status), 961 (NFR Correctness). This affects Critic-33.
* **Discrepancy Description**: To enforce the rule, CI would need to know which keys the engine reads. That means a code-analysis step or a registry of key usage.
* **Rationale & Recommendation**: Run `config:check --strict` in the deploy workflow, and let `MissingRuleValueError` reach the user through the `EngineError` from finding 6. Keep the new `CAD` unit, which is small.

### 11. Citing a commit for the tax check is too much detail for a design - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Line 363. This affects Critic-21.
* **Discrepancy Description**: Commit hashes go out of date as the code changes.
* **Rationale & Recommendation**: Name `tests/fixtures/tax-cases.json` and `personalTax.test.ts`, and use G10's wording, "$1 per return". Leave out commit hashes.

### 12. Add only words users see to the glossary - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 1000-1018 (Glossary), 1597 (file 50). These findings are affected: Critic-40, CR-9 and Critic-22.
* **Discrepancy Description**: File 50 uses the glossary for tooltips in the app, so engine terms such as "variant" and "deflator" would show up in the app. Terms such as "the planner's pick" and "rule override" may not survive the scope cuts.
* **Rationale & Recommendation**: Add only terms users see, and only after the cuts. Critic-22 (one name for each spouse's death age) is just a rename, so rate it Nit, not Major.

### 13. Disabling the shape selector is moot if the rebalance-off switch is deferred - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 416-417. These findings are affected: Critic-32 and ZO-17.
* **Discrepancy Description**: The first half of Critic-32 only matters if the rebalance-off switch is built.
* **Rationale & Recommendation**: Defer the switch (ZO-17), which removes the first half of Critic-32. Keep the one-line rule for splitting an asset class between spouses (in proportion to their balances). That rule is needed either way.

### 14. The category ID list belongs with the Spending screen, not the engine contract - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 305 and 724-732. These findings are affected: Critic-27 and ZO-4.
* **Discrepancy Description**: Under ZO-4, spending category IDs never reach `src/engine`, so the engine contract should not list them.
* **Rationale & Recommendation**: List the IDs in the Spending screen section, as IDs saved by the app's data store.

### 15. Stage 7 rated several wording findings Major - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Critic-17, 18, 20, 21, 22 and 23.
* **Discrepancy Description**: The Known gaps rule (line 1045) says every Major must be fixed before its stage starts. Rating wording and labels as Major would make them hold up build stages.
* **Rationale & Recommendation**: Rate them Nit. The exception is Critic-23, which is a contradiction between rules that agents could copy. Fix all of them in the single editorial pass from finding 5.

## What goes away after the step-1 scope decisions

- **Cutting the planner closes:** CR-2, Critic-10, the `planner_search` part of Critic-12, SR1-M3 (tips part), SR1-M5, SR1-M12, O31, Risks row 996 and the exception at Non-Goals line 95.
- **Cutting the readout closes:** Critic-8, Critic-43 and FR-M16.
- **Limiting overrides to single values closes:** Critic-28, Critic-29, and most of the structure and cross-key checks (the SR1-M9 rows).
- **Deferring the rebalance-off switch closes:** the first half of Critic-32.
- **The narrow start-year and inflation fix closes:** CR-10, and the indexing parts of CR-5 and ZO-8.
