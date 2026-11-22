# Goldfish Review Report: Implementation Readiness Test (Stage 9, round 2)

**Target:** `docs/designs/retirement-planner.md` (lines 1073-1769, "Detailed Implementation Plan" to the end)

This is the one allowed re-audit, run after the round 1 fixes were applied. The next build stage is stage 2 (the couple engine). Stages 0 and 1 are built in `src/engine/`, and the codebase-details reviewer checked the plan against that code. A planned change that the code does not have yet was not counted as a contradiction when the plan marks it as a stage 2 change.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-implementation-readiness` | completed (1 Blocker, 10 Major, 9 Nit as reported) |
| `egm-codebase-details` | completed (0 Blocker, 8 Major, 10 Nit as reported) |
| `egm-style` | completed (0 Blocker, 6 Major, 14 Nit as reported) |

All three reviewers ran on the first attempt, so none was retried.

## Summary

All three reviewers say the plan is not yet ready for stage 2. The codebase-details reviewer found that the plan describes the existing stage 0 and stage 1 code correctly: signatures, constants, lint and build settings, config keys and existing tests. The remaining problems are in the new stage 2 design:

- **The year row still cannot hold what the invariants check.** The round 1 fix split Known gaps M1 so that the `YearRow` forced-draw and contribution fields close before stage 2. Those fields were never added. By the plan's own rule, stage 2 cannot start.
- **Several new stage 2 functions do not get the inputs they need.** This affects the `withdraw/*` functions, `workingYear` and `firstDeathTransfer`. Some stage 2 work has no owning function at all, such as building the initial state and the start-of-year bookkeeping.
- **The new override and rebase functions do not fit the config code.** A loaded `Config` no longer records which keys were monthly. `checkValue(kind, value)` cannot check object values. The no-gaps check rejects the shipped life-expectancy tables. `rebaseConfig` does not say which value kinds it rebases.
- **Three round 1 fixes did not work.** The zero-tax property config still produces tax. The stage 2 file boundary still leaves out READMEs and exact test file names. The coverage switch still has no stated mechanism.

After deduplication there are **1 Blocker, 14 Major and 26 Nit** findings that are NEW or REOPENED, plus 9 repeats of settled round 1 items, which are not counted.

**Classification.** Each finding is marked:

- **NEW:** not raised in round 1.
- **REOPENED:** a round 1 PROPOSE FIX whose fix did not work or was undone; same scope, same issue.
- **SETTLED:** a repeat of a round 1 item that was contested or declined.

The caller named these as settled: the O29 part of finding 33, and findings 29, 36 and 38. The round 1 resolution (`goldfish_review_report.md`) also declines some parts of findings 33, 34 and 37. These are the M2 and FR-M18 parts of 33, the reordering, history and date-format parts of 34, and the rest of 37. Repeats of those parts are also listed as SETTLED. If the caller disagrees, the affected items are listed in the Settled section.

**Severity changes during triage:**

- `style-2-1` (C1-C4 tags) is rated Nit, not Major. Each place that uses a tag also states its rule in full, so the tag is only a citation.
- `style-2-5` ("Stage 9" wording) and `style-2-6` (duplicate function entries) are rated Nit, not Major. Each is a small edit, and two other lenses rated the duplicates Nit.
- `codebase-details-2-5` (`configCheck` test) is rated Nit, not Major, which matches the implementation-readiness lens. `tools/configCheck.ts` is already in the boundary, and `tools/configCompare.ts` shows the guard pattern.
- `implementation-readiness-2-1` stays a Blocker, although codebase-details rated the same problem Major. The plan's own gating rule (line 1077) stops stage 2 while it is open.

**Is this round clean?** **No.** There is 1 REOPENED Blocker, 3 REOPENED Majors and 11 NEW Majors.

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. `YearRow` cannot carry what the invariants check, so stage 2 is blocked by the plan's own rule - Severity: Blocker - REOPENED (round 1 finding 1; also the identity added for finding 17)
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-1), `egm-codebase-details` (codebase-details-2-7)
* **Affected Scope:** Lines 1077, 1106 (M1), 1167, 1509, 1548, 1721. Data contracts lines 655-661 and Verification line 732.
* **Discrepancy Description**:
  - Line 1077: each open Major closes before its stage starts. Row M1 (line 1106) is still open for stage 2: "`YearRow` forced-draw and contribution fields". Neither Data contracts nor the file 26 Modify entry (line 1167) defines them.
  - `checkYear(prev, next, row, ctx)` (line 1548) must check, for each account, start + contributions + reinvested yield − withholding + price return − draws + deposits = end. `YearRow` has only per-spouse `withdrawals` and `balancesEndNom`. Neither `YearRow` nor `PlanState` has contributions, deposits, reinvested yield, withholding or price return per account.
  - The household identity (line 732) leaves out two things: the non-registered cash yield, which is a cash source in step 4, and working-year contributions from outside the plan. In working years it fails by design.
  - `placeSurplus` needs `forcedDrawsBySpouse` (line 1509), and no row field supplies it.
* **Rationale & Recommendation**:
  - The round 1 fix split M1 but did not add the fields, so the identity it introduced cannot be coded.
  - Add the fields to `YearRow` (or a per-account row) in Data contracts:
    - per account: `contributionsNom`, `depositsNom`, `reinvestedYieldNom`, `withholdingNom`, `priceReturnNom`;
    - per spouse: `forcedDrawsNom`;
    - for the household: `cashYieldNom`.
  - Restate both identities with those terms, and give working years their own household identity.
  - List the fields under file 26, and close the stage 2 part of M1.

### 2. The zero-tax property config does not give zero tax - Severity: Major - REOPENED (round 1 finding 18)
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-2-1), `egm-implementation-readiness` (implementation-readiness-2-9)
* **Affected Scope:** Line 1734 (file 57); Verification line 742. Code: `src/engine/tax/tables.ts:19-29` (`phaseInAmount`), `config/2026/ontario.json:235-255`.
* **Discrepancy Description**:
  - The fix sets "every bracket rate, surtax rate and Health Premium rate to 0". `phaseInAmount` returns `min(row.cap, previousCap + rate × (income − from))`. With a rate of 0, every band after the first still returns the previous band's cap. This was checked in the code. The Health Premium stays at $300 to $750 above $36,000.
  - The OAS recovery tax (`federal.oas.recovery.rate`) is not zeroed.
  - A spouse who is still working is taxed at `workingMarginalRate`, which is an input.
  - So the "zero tax matches the closed-form annuity" property would fail for reasons unrelated to the loop.
* **Rationale & Recommendation**:
  - List every override that `zeroTax.ts` sets: all bracket rates, surtax rates, Health Premium rates and caps, and `federal.oas.recovery.rate`.
  - Require the property's inputs to use `workingMarginalRate = 0`, or to have no working years.

### 3. The `withdraw/*` signatures lack the inputs their rules need - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-2), `egm-codebase-details` (codebase-details-2-12, part)
* **Affected Scope:** Lines 1506-1509; Data contracts line 685.
* **Discrepancy Description**:
  - `bracketTopUp(spouses: SpouseYearState[], …)` and the `earlyRrsp` fill-up rule measure "net income before splitting … after minimums and the cash yield". `SpouseYearState` holds no income.
  - `drawDownYears(spouses, deaths)` needs the CPP and OAS start ages and birth months, which `SpouseYearState` does not hold. `deaths` has no type.
  - `registeredLast(W, accounts, ctx)` caps each LIF at its room left after this year's minimum and top-up. It has no parameter for draws already taken, and no ages for `lifLimits`.
  - `incomeTotals` is named, but its file (`jurisdiction/federal.ts`, line 23) is not, and file 27 lists only `federalTax`.
* **Rationale & Recommendation**:
  - Give each function the inputs its rule reads:
    - each spouse's `TaxableIncome` so far;
    - the draws already taken;
    - the start ages and birth months from `NormalizedInputs`;
    - a typed `deaths`.
  - Name `jurisdiction/federal.ts` as the source of `incomeTotals`.
  - The missing return types repeat settled round 1 finding 36, so they are listed below and not counted here.

### 4. `workingYear` has no `variant`, so the placement baseline cannot run its working years - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-3)
* **Affected Scope:** Lines 1521-1523.
* **Discrepancy Description**:
  - Working-year step 2 rebalances by the preset. The baseline uses `same_mix`, and only `Variant` carries that.
  - `workingYear(state, inputs, ctx)` has no `variant` parameter, while `solveYear` and `runPath` both take one.
* **Rationale & Recommendation**: Use `workingYear(state, inputs, ctx, variant): { nextState, row }`. The duplicate line 1521 is covered in Nit 3.

### 5. Some stage 2 logic has no owning file or function - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-4)
* **Affected Scope:** Lines 1513-1528; year solver lines 441-497; Data contracts line 698.
* **Discrepancy Description**: Nothing says where these live:
  - **Initial state.** Something must build the first `PlanState` from `NormalizedInputs`. This includes starting holdings for RRSP, LIRA and TFSA, which matter when rebalancing is off, because only a balance is entered. It also includes TFSA room, and `openedYear` for accounts already past their conversion age.
  - **Start-of-year bookkeeping.** None of the numbered solver steps covers these:
    - RRSP to RRIF and LIRA to LIF conversion "at January 1", and which age triggers it;
    - the 50% unlock;
    - the TFSA room increase and add-back;
    - updating `lifPrevEarningsNom` and `tfsaWithdrawnLastYearNom`.
  - **Spending need.** Something must compute the year's spending need from line 698: phases, overrides and the survivor percentage.
  - **Taxable income.** Something must assemble each spouse's `TaxableIncome` from fixed income and draws, using the filling rule at line 1456.
* **Rationale & Recommendation**:
  - Name a function and file for each item, for example `project/initialState.ts`, `project/spendingNeed.ts` and `solver/incomeAssembly.ts`.
  - Add those files to the stage 2 boundary.
  - Add a numbered "start of year" step to the year solver that lists the bookkeeping in order.

### 6. `firstDeathTransfer(state, ctx)` leaves the transfer rules undecided - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-5)
* **Affected Scope:** Lines 1525, 1723.
* **Discrepancy Description**:
  - Accounts: the plan does not say whether a deceased spouse's RRSP, RRIF, LIF or LIRA keeps its id and type and only changes `owner`, or merges into the survivor's account of the same type.
  - Ages: it does not say which age then drives the RRIF and LIF minimums and the LIF maximum, or whether an unconverted RRSP or LIRA follows the survivor's conversion age.
  - State fields: it does not say what happens to `openedYear`, `lifPrevEarningsNom` and the deceased spouse's `carriedLossNom`, or how a transferred TFSA's room is stored.
  - Inputs: the signature has no `inputs`, which hold the survivor DB share and the survivor spending percentage.
* **Rationale & Recommendation**:
  - State each rule.
  - Use `firstDeathTransfer(state, inputs, ctx): PlanState`.
  - Add a `death.test.ts` row for each rule.

### 7. TFSA room is stored per account, but contribution room belongs to the person - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-6)
* **Affected Scope:** Lines 1489, 1509; Data contracts lines 683 and 685.
* **Discrepancy Description**:
  - `AccountState.tfsaRoomNom` is per account, while `tfsaWithdrawnLastYearNom` is per spouse.
  - Account ids allow several TFSAs per spouse (`tfsa-0-1`, `tfsa-0-2`).
  - `placeSurplus` and the working-year contribution rule ("within room") cannot be coded without first choosing where room lives.
* **Rationale & Recommendation**: Move room to `SpouseYearState.tfsaRoomNom`, or allow one TFSA per spouse and validate that.

### 8. The override structure check rejects the shipped life-expectancy tables - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-7)
* **Affected Scope:** Lines 1438, 1439, 1714; Config contract lines 308 and 313; Design values line 589.
* **Discrepancy Description**:
  - `validateOverride` and `overrides.test.ts` require age tables to have "no age gaps".
  - `planning.life_expectancy.female` and `.male` have a row every 5 years (`planning.json`), and they are overridable. Any override of them fails, and `dropInvalidOverrides` would drop them on import.
  - `ageTable` does not say how it looks up an age between two rows. The life-expectancy default needs the row at or below the age.
* **Rationale & Recommendation**:
  - Limit the no-gaps rule to `federal.rrif.min_factor` and `ontario.lif.max_factor`, or define it as "evenly spaced".
  - State the lookup between rows: "the row at or below the age".
  - Add a test row for overriding a life-expectancy table.

### 9. `rebaseConfig` does not say which value kinds it rebases - Severity: Major - NEW
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-2-10)
* **Affected Scope:** Line 1435 (pointing to Units and conventions line 281); line 1724.
* **Discrepancy Description**:
  - The rule covers "each indexed amount (and each indexed bracket row)".
  - `ontario.surtax.thresholds` is a `list` entry with `indexed: true` (`ontario.json` line 204). `read.ts`'s `list()` and `phaseIn()` both index.
  - The implementer has to decide whether lists and phase-in schedules (`from` and `cap`) are rebased. They also have to confirm that `ageTable` and `object` values never are.
* **Rationale & Recommendation**: State the rule for each value kind, in the `rebaseConfig` rule and in the `units.test.ts` row.

### 10. `applyRuleOverrides` "reuses `toAnnual`", but a loaded `Config` no longer knows which keys were monthly - Severity: Major - NEW
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-2-2)
* **Affected Scope:** Lines 1438, 1714 ("a monthly override × 12"). Code: `src/engine/config/load.ts:59-72`, `src/engine/config/keys.ts:28-34`.
* **Discrepancy Description**:
  - `buildConfig` already turns every `CAD_per_month` entry into `CAD_per_year`, and `KeySpec` has no unit field.
  - An override in the published monthly unit (Config contract line 309) therefore cannot be identified as monthly, and calling `toAnnual` on the Config entry does nothing.
* **Rationale & Recommendation**:
  - Say where the published unit comes from. Options: a `publishedUnit` on each Config entry, a `unit` on `KeySpec`, or reading the raw `BUNDLE` entry.
  - Then apply `toAnnual` to the override entry built with that unit.

### 11. `checkValue(kind, value)` cannot check `object` values, and object values are overridable - Severity: Major - NEW
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-2-3)
* **Affected Scope:** Lines 1430, 1438; Config contract lines 308 and 311. Code: `src/engine/config/schema.ts:45-64, 115-116`.
* **Discrepancy Description**:
  - Object schemas are looked up by key (`objectSchemas[spec.key]`), not by kind.
  - `planning.shapes`, `planning.presets`, `planning.fee_levels` and the other planning objects are overridable. A check that takes only a kind cannot validate them.
* **Rationale & Recommendation**: Export `checkValue(spec: KeySpec, value): string[]` (or take a key), mirroring `checkEntry`. Update lines 1430 and 311 together.

### 12. The stage 2 file boundary still leaves out READMEs and exact test file names - Severity: Major - REOPENED (round 1 findings 3 and 18)
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-2-4, -2-6), `egm-implementation-readiness` (implementation-readiness-2-11, part)
* **Affected Scope:** Lines 1164-1165, 1175, 1706-1734. Code: `src/engine/jurisdiction/README.md:18`, `src/engine/jurisdiction/types.ts:9-10`, `src/engine/tax/README.md`, `tools/README.md:27-30, 60-62`.
* **Discrepancy Description**:
  - **READMEs.** Round 1 finding 3 asked for the existing READMEs to be listed as Modify. Only `src/engine/README.md` and `src/engine/config/README.md` were added.
    - `jurisdiction/README.md` and the `jurisdiction/types.ts` comment still say `lifLimits` goes on `Jurisdiction`, but the plan moves it to `accounts/liraLif.ts`.
    - `tax/README.md` lacks `split.ts`.
    - `tools/README.md` describes the old `configStatus(config, new Date())`.
  - **Unit tests.** "The stage 2 rows of the unit test table" (line 1165) is not a file list, because the table has no stage column. Some rows also mix stages:
    - `death.test.ts` covers the stage 2 rollover and the stage 3 final return and probate;
    - `compare.test.ts` and `plannerSearch.test.ts` are stage 4.
  - **Property tests.** The fix for finding 18 said "list property tests by stage", but file 57 still has only `tests/property/*.test.ts`. Which properties "need deaths" is left to the implementer. For example, "higher spending never raises the after-tax legacy" depends on the stage 3 final return.
* **Rationale & Recommendation**:
  - Add `src/engine/jurisdiction/README.md`, `src/engine/tax/README.md` and `tools/README.md` to the Modify list, and say that the `jurisdiction/types.ts` comment is replaced.
  - Add a Stage column to the unit test table, and split `death.test.ts` by stage.
  - List each property test file, with its properties and its stage.
  - The use of a glob for hand-written files repeats settled finding 29. What is reopened here is the stage list that the round 1 fix promised.

### 13. The coverage switch still has no stated mechanism - Severity: Major - REOPENED (round 1 finding 20)
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-2-8, part), `egm-implementation-readiness` (implementation-readiness-2-11, part)
* **Affected Scope:** Lines 1172, 1258, 1296, 1758. Code: `.github/workflows/ci.yml:37-38`, `vitest.config.ts:6, 18-23`.
* **Discrepancy Description**:
  - "CI sets `ENFORCE_COVERAGE` from the `stage-2` tag" could mean a tag-based condition, which needs full fetch depth. It could also mean a literal `ENFORCE_COVERAGE: 'true'` committed at the tag.
  - If the flag is added partway through stage 2, CI fails while the engine is half built.
  - The `vitest.config.ts` change for "the non-engine glob" is not written out.
* **Rationale & Recommendation**:
  - Give the exact `ci.yml` YAML and the `vitest.config.ts` change.
  - Say which commit adds the flag, for example the last commit of stage 2, which is the commit that gets tagged.

### 14. The stage gate column and Known gaps disagree about what gates a stage - Severity: Major - NEW
* **Reviewer Lens:** `egm-style` (style-2-3), `egm-implementation-readiness` (implementation-readiness-2-12)
* **Affected Scope:** Lines 1077, 1094, 1135-1145.
* **Discrepancy Description**:
  - Line 1077 says every open Major closes before its stage starts, but the gate column lists only open questions.
  - Stage 4's gate is "O31" alone, yet FR-M16, FR-M17, SR1-M3, SR1-M5, SR1-M11 and part of M1 close before stage 4.
  - Stage 5's gate leaves out these rows that close before it: M2, M3, M4, FR-M7, FR-M13, FR-M18, SR1-M2, SR1-M8, SR1-M12 and SR1-M13.
  - FR-M5 (line 1094) breaks the rule: its warning "is built in stage 2", but the row closes before "Stage 2 (warning)".
* **Rationale & Recommendation**:
  - Add "and the Known gaps rows marked for this stage" to each gate cell, or add a column that names those rows.
  - State that rows closed by code are closed during their stage, and mark FR-M5 that way.

### 15. Two open Known gaps rows do not say what is open - Severity: Major - NEW
* **Reviewer Lens:** `egm-style` (style-2-4, part)
* **Affected Scope:** Lines 1126 (SR1-M12), 1127 (SR1-M13).
* **Discrepancy Description**:
  - "Three gaps in the mitigations…" and "Undecided items with no open question or gate" do not list the gaps or the items. A reader has to open the review report to learn what must close before stage 5.
  - Some SR1-M13 items have since been decided: Worker cancelling, the shape reference year and the draw-down years. So the row may overstate what is open.
* **Rationale & Recommendation**: List each remaining item, as SR1-M8 and SR1-M2 already do with "Still open:". These rows gate stage 5, not stage 2. The M2 part of this finding is settled (see below).

### Nits

| # | Ids | Lines | Class | Problem and fix |
| --- | --- | --- | --- | --- |
| 1 | style-2-1 | 1116, 1435, 1489, 1507-1509, 1571, 1717 | NEW | The decision tags C1-C4 are never defined in the design, and `concepts_brief.md` uses C1-C10 for something else: its C3 is a different trade-off. Define the series once (for example "author decisions of 2026-11-19") or rename it. |
| 2 | style-2-5 | 1077 | NEW | "the Stage 9 re-run" uses "Stage", which this section uses for build stages 0-8. Say "the readiness re-run (r2)". Split the dense paragraph into a sources list and the rule. Either give the second full review of 2026-11-19 a prefix or drop the sentence. |
| 3 | style-2-6, implementation-readiness-2-14, codebase-details-2-13, implementation-readiness-2-3 (part) | 1515-1516, 1521-1522, 1498/1501 | NEW | `solveYear` and `workingYear` are each listed twice, and `placement.ts` has two bullets with the O29 rebalancing rule between them. Merge each pair, and move the O29 rule under `rebalance.ts`. |
| 4 | codebase-details-2-5, implementation-readiness-2-19 | 1170, 1661, 1730 | NEW | `configCheck.test.ts` cannot import `tools/configCheck.ts`, which calls `process.exit` at top level. Name an exported function, for example `yieldWarnings(cfg): string[]`, and say where it lives: add an argv guard like `configCompare.ts`, or use `tools/lib.ts` and add it to the boundary. |
| 5 | codebase-details-2-9 | 1436 vs 322 | NEW | `configStatus` returns `staleOverrideKeys`, but the Config contract lists only `overriddenKeys`. Make them match. |
| 6 | codebase-details-2-10 | 1167 | NEW | Say that `PlanInputs.ruleOverrides` changes from `Record<string, unknown>` (`types.ts:143`) to `RuleOverrides`. |
| 7 | codebase-details-2-11, implementation-readiness-2-18 | 1500 vs 659 | NEW | `rebalance` returns `realizedGainsNom: [number, number]` by owner, but `YearRow.realizedGainsNom` is one number. Use one shape; tax needs the per-owner one. |
| 8 | codebase-details-2-12 (part) | 1507 | NEW | The top-up income leaves out the gains already realized by the rebalance, which design line 426 includes. |
| 9 | codebase-details-2-14, implementation-readiness-2-15 | 1523 | NEW | `afterTaxLegacyNom` is "marked 'stage 2: no final return'", but `PlanSummary` has no field for the mark. Add one, for example `legacyIsPreTax`, or drop the mark. |
| 10 | codebase-details-2-15, implementation-readiness-2-21 | 1456, 1474 | NEW | The filling rule leaves out interest, which `types.ts:23` puts in `otherOrdinary`. Line 1474 does not say that a spouse who is working or not alive is left out of `bestSplit` (C2). One `pensionEligible` field serves both the pension credit and splitting, which read different age keys. |
| 11 | codebase-details-2-16 | 1171, 1722, 1724 | NEW | Say what changes in `config.test.ts` (the three-argument `configStatus`). Put the `rebaseConfig` tests in one file: `read.test.ts` or `units.test.ts`. |
| 12 | codebase-details-2-17 | 1173 | NEW | Writing the `planning.fee_levels` values: give the validation status, source and date to record ("author decision, 2026-11-19"). |
| 13 | codebase-details-2-18 | 1498 | NEW | State in file 31 that cash follows the preset's `bonds` column and the three foreign stock classes follow `global_equity`. Today this is only a comment in `schema.ts:38-41`. |
| 14 | implementation-readiness-2-13 | 1139, 1515 | NEW | "`solveYear` rejects `planner_pick`" does not say how. Name the error and add a test row. |
| 15 | implementation-readiness-2-16 | 1490 | NEW | `cashYield(ctx)` has no account or returns parameter. Use `cashYield(account, returns)`. |
| 16 | implementation-readiness-2-17 | 1487 | NEW | "below 71" is hard-coded. Say "below the table's first age (`ageTable` returns `undefined`)". |
| 17 | implementation-readiness-2-20 (part) | 1389, 1397 | REOPENED (finding 3) | Files 21 and 22 still say "(Create)" but exist, and file 22 changes at stage 2. Relabel them "Exists, stage 0; modify at stage 2". |
| 18 | implementation-readiness-2-20 (part), style-2-16 | 1717 | NEW | "logs the time of one 40-year run" asserts nothing, and a 40-year run is a `runPath` run, not one `solveYear` call. Mark it "no assertion" and put it in `runPath.test.ts`, or name the helper it times. |
| 19 | style-2-9 | 1110 | NEW | "unreachable without UI tests" states a prediction as fact. Write "cannot be met by unit tests alone; the UI code has no tests until stage 5". |
| 20 | style-2-10 | 1139 | NEW | "O25, O26, O29 (resolved)" is ambiguous. Write "(all resolved)". |
| 21 | style-2-11 | 1179-1667 | NEW | File header labels vary: "Exists" for plural headers, and both "Exists — keep" and "Exist — keep". Use one form. |
| 22 | style-2-12 | 1338-1339 | NEW | "Review history, already committed" goes further than the evidence: the 2026-11-19 review files are untracked. List the contents of each folder. |
| 23 | style-2-13 | 1424 | NEW | "The config constants are …" repeats line 1422. Drop it. |
| 24 | style-2-14 | 1375 | REOPENED (finding 35) | "against theirs" still has no clear antecedent. Write "against the source pages". |
| 25 | style-2-15 | 1669, 1682 | NEW | "At least 20 cases" against the 21 in the file. State 21, and keep "at least 20" only as the rule for later additions. |
| 26 | style-2-17 | 1730 | NEW | "`configCompare` is already tested in `config.test.ts`" is not a test case and repeats line 1729. Drop it. |

## Settled repeats (not counted)

These repeat round 1 items that were contested or declined:

- **style-2-2** (closed rows bury open rows; no order): the reordering part of finding 34, declined and left to the editorial pass.
- **style-2-7** (R1-F16 history): the history part of finding 34, declined.
- **style-2-8** ("Fixed" vs "Fixed <date>" vs "Withdrawn"): the dating part of finding 34, declined.
- **style-2-4 (M2 part)** and **style-2-18** (the "may be moot" and "if M2 is resolved" hedges): the M2 part of finding 33, declined.
- **style-2-19** ("investigated before stage 8" has no outcome): the rest of finding 37, declined.
- **style-2-20** (dated removal notes, and "steady averages"): finding 38, and the FR-M18 part of finding 33.
- **implementation-readiness-2-8** and **codebase-details-2-8 (part)** (where the monthly CPP estimate is multiplied by 12): finding 29. The spending fields' × 12 is already stated at Data contracts line 698.
- **implementation-readiness-2-2 (part)** (missing return types and uneven signature typing): finding 36.

The O29 part of finding 33 did not come up again.

## Severity Breakdown

| Severity | NEW | REOPENED | Total counted | SETTLED (not counted) |
| --- | --- | --- | --- | --- |
| Blocker | 0 | 1 | 1 | 0 |
| Major | 11 | 3 | 14 | 1 (style-2-2, rated Major by its lens) |
| Nit | 24 | 2 | 26 | 8 |

**Round clean:** No.
