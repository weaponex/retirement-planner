# Goldfish Review Report: Implementation Readiness Test (Stage 9, round 1)

**Target:** `docs/designs/retirement-planner.md` (lines 1041-1709, "Detailed Implementation Plan" to the end)

The next build stage is stage 2 (the couple engine). Stages 0 and 1 are built, and the plan was checked against their code in `src/engine/`.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-implementation-readiness` | completed (1 Blocker, 15 Major, 5 Nit as reported) |
| `egm-codebase-details` | completed (3 contradictions, 15 Major, 12 Nit as reported) |
| `egm-style` | completed (0 Blocker, 10 Major, 23 Nit as reported) |

Every reviewer ran on the first attempt, so none was retried.

## Summary

All three reviewers say the plan is not ready for stage 2. The plan is consistent with the stage 0 and stage 1 code. Stage 2 work is blocked or open to guessing for five reasons:

- **The shared engine state is undefined.** Types such as `SpouseYearState`, `AccountState`, `Draw`, `Variant` and `NormalizedInputs` are used in stage 2 signatures but defined nowhere.
- **The indexing contract contradicts itself.** `ruleFactor`, `YearContext` and `read.ts` disagree.
- **Config values are missing.** Values that stage 2 reads are still null, and one of them has no schema.
- **There is no list of files that stage 2 creates or modifies.**
- **Several stage 2 behaviours are unspecified.** These are working years, deaths, DB pension indexing, TFSA room and surplus, and placement fill.

After deduplication there are **1 Blocker, 26 Major and 13 Nit** findings. Duplicates of earlier stages are marked ZO-n (initial zoom out), CR-n (comprehension), Critic-n (critic) and IZO-n (intermediate zoom out).

Two severities were changed during triage:

- The codebase-details lens rates any contradiction with the code a Blocker. Finding 12 (the Jurisdiction interface) is rated Major here because the fix is small. Finding 39 (the stale SR1-M1 row) is rated Nit.
- Style's "plus two checks" finding is rated Nit because it is fixed with a one-word edit.

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. The engine's state model and stage 2 types are defined nowhere - Severity: Blocker
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-1, -1-17), `egm-codebase-details` (codebase-details-1-11). The `lifetimeTaxToday` part duplicates Critic-3. The `NormalizedInputs` gating duplicates Known gaps M1.
* **Affected Scope:** Lines 1395, 1452-1456, 1462-1463, 1469, 1494, 1074. Code: `src/engine/types.ts` (none of these types exist; `PlanSummary` has only `lifetimeTaxNom` at lines 171-180).
* **Discrepancy Description**:
  - Stage 2 signatures use these types, which have no definition and no owning file:
    - `SpouseYearState[]`, `AccountState[]` and `Draw[]` (`bracketTopUp`);
    - `state` and `variant` (`solveYear`);
    - `EngineIntegrityError { year, variant, check, before, after }`;
    - `prev` and `next` (`checkYear`);
    - `NormalizedInputs`.
  - The state has to hold the following. About a dozen stage 2 files share this structure, so the implementer would end up designing it.
    - Holdings and original cost, by account and by asset class.
    - Whether each RRSP or LIRA has converted, and the year it opened.
    - The LIF's earnings for the previous year (FR-M9).
    - TFSA room.
    - Each spouse's carried-forward loss (FR-M5).
    - The current pension split.
    - The death flags.
  - `runPath` sums `lifetimeTaxToday`, but `PlanSummary` has no such field. It also has no `totalShortfallToday`.
  - `warningFacts` has no stage 2 content.
  - Known gaps M1 covers `NormalizedInputs` and the forced-draw and contribution `YearRow` fields. It closes before stage 3, but `normalizeInputs`, `solveYear` and `runPath` are built in stage 2.
* **Rationale & Recommendation**:
  - Add the following to Data contracts, and list them under file 26 as stage 2 additions:
    - `PlanState`;
    - `AccountState`, with holdings by class and cost, `converted`, `openedYear`, `lifPrevEarningsNom` and `tfsaRoomNom`;
    - `SpouseYearState`;
    - `Draw { accountId, amountNom, incomeType, realizedGainNom }`;
    - `Variant`;
    - `NormalizedInputs`;
    - the `before` and `after` types of `EngineIntegrityError`.
  - Add `lifetimeTaxToday` (and any other `...Today` totals) to `PlanSummary`.
  - State that `warningFacts` is `{}` until stage 6.
  - Change M1's `NormalizedInputs` and `YearRow` parts to close before stage 2.

### 2. `ruleFactor`, `YearContext`, `read.ts` and the tests disagree on indexing - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-3), `egm-codebase-details` (codebase-details-1-5), `egm-style` (style-1-3). Duplicates ZO-8, CR-5 and IZO-2.
* **Affected Scope:** Lines 1387, 1394, 1401, 1655. Code: `types.ts:9-15`, `read.ts:32-34`, `schema.ts:84`.
* **Discrepancy Description**:
  - `makeRuleFactor(cfg, planStartYear)` gives `ruleFactor(year) = (1+inflation)^(year - cfg.taxYear)`. The formula never uses `planStartYear`.
  - `read.ts` calls `ctx.ruleFactor(year)`, but `YearContext` has no calendar `year`.
  - File 26 still defines `YearContext { yearIndex, deflator, cfg }`.
  - Stale overrides must be indexed from their own default's tax year, which a single `cfg.taxYear` base cannot express. The plan chooses neither available option: rescaling in `applyRuleOverrides`, or indexing each entry from its own `taxYear`.
  - Line 1655 still says thresholds "grow with `ctx.deflator`".
* **Rationale & Recommendation**:
  - IZO-2 offers an alternative: rebase the config once and drop `ruleFactor`. If you do that, these points go away.
  - Otherwise make these changes:
    - Pick `ruleFactor(yearIndex)`, or add `year` to `YearContext`.
    - Drop or use `planStartYear`.
    - Index each entry from `entry.taxYear`, with `applyRuleOverrides` setting that field to `defaultTaxYear`.
    - Update file 26 and line 1655.

### 3. There is no Create/Modify file boundary for stage 2, and existing files are labelled "Create" - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-4), `egm-codebase-details` (codebase-details-1-4, -1-15, -1-16, -1-22), `egm-style` (style-1-7)
* **Affected Scope:** Lines 1115-1692. In particular, files 1-14, 17-28, 51, 52 and 56, and lines 1299-1307, 1361-1373, 1375, 1398, 1406, 1417.
* **Discrepancy Description**:
  - Many files that already exist are labelled "Create", for example `constants.ts`, `config/*`, `types.ts`, `jurisdiction/*` and `tax/personalTax.ts`. Every constant listed under file 23 already exists.
  - Stage 2 has to modify these files, and none of them is listed:
    - `types.ts`;
    - `config/read.ts`, `config/load.ts` and `config/schema.ts`;
    - `jurisdiction/types.ts` and `jurisdiction/ontario.ts`;
    - `tools/configCheck.ts`;
    - `tests/unit/config.test.ts`, `federal.test.ts`, `ontario.test.ts` and `taxContext.ts`;
    - `.github/workflows/ci.yml`;
    - `docs/units-and-conventions.md`, which lacks the tax-year indexing rule that the file 53 reference rows depend on;
    - the existing READMEs.
  - The new stage 2 folders have no README entries: `accounts`, `benefits`, `withdraw`, `solver`, `project` and `invest`.
  - Line 1373's phrase "the three config constants" is ambiguous.
  - The standard requires an explicit create/modify list that can serve as a write allowlist.
* **Rationale & Recommendation**:
  - Relabel each file "Exists (stage 0/1)", with "modify at stage N" where it changes.
  - Add a "Stage 2 file boundary" list of exact paths. Mark each path Create or Modify, and give the change for each.
  - Add a worked tax-year indexing example to file 17.

### 4. Stage 2 changes break existing callers and test helpers that the plan does not mention - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-6, -1-7)
* **Affected Scope:** Lines 1384, 1648-1671, 1655. Code: `tests/unit/taxContext.ts:8-10`, `federal.test.ts:96-111`, `ontario.test.ts:113-114`, `load.ts:80-100`, `tools/configCheck.ts:26`, `config.test.ts:111,114`.
* **Discrepancy Description**:
  - A required `ruleFactor` breaks the type check of every existing tax test, because `taxContext.ts` builds a `YearContext` without it.
  - Expectations that use `deflator` lose their meaning once `read.ts` switches.
  - The new `configStatus(config, overrides, today)` signature breaks `configCheck.ts` and `config.test.ts`.
  - The type of `overrides` is not stated.
  - No shared stage 2 test helper is defined.
* **Rationale & Recommendation**:
  - List these files as Modify.
  - Say what `configCheck` passes for `overrides` (for example `{}`), and give the type.
  - Name a shared couple-plan and context helper, with its file and its contents.

### 5. `PlanInputs.ruleOverrides` has three different shapes - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-6), `egm-codebase-details` (codebase-details-1-8). Duplicates ZO-3 and Critic-3.
* **Affected Scope:** Lines 1386, 1400, 1092. Code: `types.ts:142-143`, `schema.ts:17,102`, `load.ts:59-73`.
* **Discrepancy Description**:
  - The three shapes are:
    - Data contracts: `{ [ruleKey]: value }`;
    - Config contract: `{ value, defaultTaxYear }`;
    - `types.ts`: `Record<string, unknown>`.
  - `validateOverride(key, value, cfg)` sees one value, but the cross-key rules need the whole set.
  - `valueSchemas` is not exported, so "the same zod schema" cannot be reached.
  - `dropInvalidOverrides` returns an untyped `{ kept, dropped }`.
  - The plan does not say whether `applyRuleOverrides` runs before `normalizeInputs`. It must, because an override of `inflation` changes the deflator.
* **Rationale & Recommendation**:
  - Use `Record<string, { value: unknown; defaultTaxYear: number }>` everywhere.
  - Change the signature to `validateOverride(key, value, overrides, cfg)`.
  - Export a value-kind validator from `schema.ts`.
  - Type `dropped` as `{ key, value, reasons: string[] }[]`.
  - Name `toAnnual` and `checkEntry` for reuse.
  - State the call order.

### 6. Config values that stage 2 reads are null, and `planning.fee_levels` has no schema - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-2, -1-8), `egm-codebase-details` (codebase-details-1-10). Duplicates ZO-6 (part), Critic-26 and Critic-33/IZO-10 (unfetched keys).
* **Affected Scope:** Lines 1107, 1110, 1346-1357, 1443-1444. Code: `market.json:44-57, 72-85, 100-113, 142-169`, `planning.json:174-201`, `schema.ts:45-64`, `read.ts:24-29`.
* **Discrepancy Description**:
  - These values are null and `unfetched`:
    - the yields for U.S., international and emerging-market stocks;
    - the cash return and the cash yield;
    - `planning.fee_levels`, although O25 is resolved.
  - `read.ts` throws `MissingRuleValueError` on a null value. `classReturns` therefore fails, and no `runPath` can run on the committed bundle.
  - `fee_levels` and `mixes` have no `objectSchemas` entry.
  - `mixForYear`'s fallback for a 0%-stock mix needs `planning.mixes`. That value depends on O24, which is gated at stage 5.
  - `PlanInputs` has no field for "chosen last".
  - The stage 2 gate (O25, O26, O29) does not require any of these values.
  - Nothing says who enters these values, given `AGENTS.md`'s "never supply a value" rule.
* **Rationale & Recommendation**:
  - Add a stage 2 gate: the author enters the five market values and `planning.fee_levels`.
  - Specify the `fee_levels` schema, for example `Record<'index_etf'|'robo'|'advisor', rate>`.
  - Either move O24 into the stage 2 gate, or state a stage 2 fallback.
  - Define "chosen last" as `investing.mixId`.
  - Say whether stage 2 unit tests use the bundle or fixture configs.

### 7. `read.ts` has no age-table reader, and helpers that take only a `Config` cannot use it - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-9)
* **Affected Scope:** Lines 1393, 1413, 1434-1435, 1443. Code: `read.ts:37-73`.
* **Discrepancy Description**:
  - Three lookups read `ageTable` entries, and `read.ts` has no reader for them: `minFactor`, `ontario.lif.max_factor` and life expectancy.
  - Every reader needs a `YearContext`, so `makeDeflator(cfg)` and `classReturns(cfg, ...)` cannot call them.
* **Rationale & Recommendation**:
  - Add `ageTable` or `ageFactor(ctx, key, age)`, and say how it handles ages outside the table.
  - Add a reader that takes a `Config`, or pass a context to these helpers.
  - Mark `read.ts` as Modify.

### 8. Nothing says how a jurisdiction reaches the split, solver and projection code - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-12, -1-23, -1-24), `egm-implementation-readiness` (implementation-readiness-1-15)
* **Affected Scope:** Lines 1404, 1421, 1462, 1469. Code: `personalTax.ts:16-21`, `types.ts:9-15`, `keys.ts:56`.
* **Discrepancy Description**:
  - `bestSplit(a, b, ctx)`, `solveYear` and `runPath` take no `Jurisdiction`, so none of them can call `personalTax`.
  - The types of `a` and `b` are not given. They need income and age.
  - `runPath` takes one context, but `YearContext` is per year, and nothing says who builds each year's context.
  - The filling rule hard-codes age 65 instead of reading `federal.credits.pension.min_age_rrif` and `federal.split.min_age_rrif`.
  - The "0-50%" range and "21 points" should come from `federal.split.max_share`.
* **Rationale & Recommendation**:
  - Add `jurisdiction` to `YearContext`, or define a plan-level context.
  - Use `bestSplit(a: {income, age}, b: {income, age}, jurisdiction, ctx)`.
  - State that `runPath` builds one context per year.
  - Read the ages and the maximum share from the keys, and derive the number of points as `max_share / SPLIT_STEP`.

### 9. The LIF rules have two owners and a signature too narrow to apply them - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-5), `egm-codebase-details` (codebase-details-1-13)
* **Affected Scope:** Lines 1413, 1435. Config: `federal.json:567-594`, `ontario.json:277-328`.
* **Discrepancy Description**:
  - `lifLimits(balance, ageAtStartOfYear, ctx)` has no input for last year's earnings, which the FR-M9 maximum needs. It also has no input for the opening year, which has a zero minimum.
  - File 30 puts the same rules in `liraLif.ts`.
  - The phrase "reads `federal.rrif.min_factor`" leaves out the under-71 formula (FR-M4). That formula is needed for LIFs opened between ages 55 and 70.
* **Rationale & Recommendation**:
  - Choose one owner.
  - Use `lifLimits(balance, age, lastYearEarnings, isOpeningYear, ctx)` and have it call `minFactor`. Then state that the jurisdiction module may import from the accounts module.
  - Alternatively, have `ontario.ts` return only the table maximum and `liraLif.ts` apply the earnings floor.

### 10. Account placement fill and per-owner realized gains are underspecified - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-7). Duplicates Critic-32 (SR1-N7, which is still open).
* **Affected Scope:** Lines 1445, 1447.
* **Discrepancy Description**:
  - "Each in its preset's account order" does not say how a group spread across several accounts and both spouses is filled. Examples are registered accounts across both spouses, or the two TFSAs.
  - It does not say what happens when a class only partly fits a group.
  - `rebalance` returns the year's realized gains, but tax is per spouse.
* **Rationale & Recommendation**:
  - Specify the algorithm:
    1. For each class in order, set the target to share × household total.
    2. Fill the groups in preset order.
    3. Within a group, split by the accounts' remaining capacity.
  - Make `rebalance` return realized gains by owner.

### 11. `workingYear` and years with mixed working and retired spouses are not specified - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-11). The working-spouse tax part duplicates Critic-6.
* **Affected Scope:** Lines 1468, 1663.
* **Discrepancy Description**:
  - `workingYear(...)` has no signature.
  - The plan does not say:
    - whether working years rebalance and apply the shape;
    - which account pays tax on non-registered income;
    - where CPP and OAS cash drawn while working goes;
    - whether contributions above TFSA room spill over;
    - how the registered draws of a spouse who is still working are taxed in a retired-household year: through `personalTax`, or at `workingMarginalRate`.
* **Rationale & Recommendation**:
  - Give `workingYear(state, inputs, ctx): { nextState, row }` with a numbered step list, like the one for the year solver.
  - Define how a working spouse is taxed in a retired-household year.

### 12. File 27 describes the whole Jurisdiction interface as stage 1, but most of it does not exist - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-1; rated Blocker under that lens's contradiction rule)
* **Affected Scope:** Lines 1406-1415. Code: `jurisdiction/types.ts:5-11`, `ontario.ts:81-84`.
* **Discrepancy Description**:
  - The interface has only `id` and `provincialTax`. Its code comment defers `lifLimits` and `unlockShare` to stage 2 and `probate` to stage 3.
  - File 27 omits `id` and gives no stage for each method.
* **Rationale & Recommendation**:
  - Mark file 27 "Exists - modify (stage 2)" and list `id`.
  - Give a stage for each method: `lifLimits` and `unlockShare` in stage 2, and `probate` in stage 3.

### 13. Known gaps row FR-M5 says a `config:check` warning exists, but it does not - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-3)
* **Affected Scope:** Lines 1062, 1607. Code: `tools/configCheck.ts:1-36`, `market.json:114-141`.
* **Discrepancy Description**:
  - The row is marked fixed, including "a `config:check` warning when a yield is above its return".
  - File 51 does not list the warning, and the tool does not have it.
  - The committed values would trigger it today: the bond yield is 0.0347 and the bond return is 0.032.
* **Rationale & Recommendation**: Add the warning to file 51 and give it a stage, or mark FR-M5 as partly open.

### 14. The timing of spending-phase `fromYear` is needed in stage 2 but gated at stage 5 - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-9)
* **Affected Scope:** Lines 1090, 1462.
* **Discrepancy Description**:
  - Solver step 5 needs the spending phases.
  - Two parts of SR1-M8 are still open: whether `fromYear` counts the first retirement year as 0 or 1, and the ordering checks.
  - SR1-M8 closes only before stage 5.
* **Rationale & Recommendation**:
  - Split SR1-M8.
  - Close the phase-year rule before stage 2: year 0 is the first retirement year, and `0 < slower < later`.
  - Leave the category ids and the nudge for stage 5.

### 15. What stage 2 does when a spouse dies is undefined - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-10)
* **Affected Scope:** Lines 1107-1108, 1429, 1465-1474, 1662.
* **Discrepancy Description**:
  - Stage 2 builds `survivor.ts` and solver step 1.
  - Its tests include "survivor keeps the level" and "a death before benefits start".
  - First-death transfers and same-year deaths belong to `death.ts`, which is built in stage 3.
  - Nothing says what `runPath` does at a spouse's target age in stage 2.
* **Rationale & Recommendation**: Pick one:
  - state the stage 2 behaviour, for example "step 1's transfers are applied inline; `death.ts` adds `finalReturn`, `estate` and same-year deaths"; or
  - move those test rows to stage 3.

### 16. Normalizing DB pensions with `none` or `fixed` indexing is undefined - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-12). Duplicates Critic-5 (the DB statement amounts part).
* **Affected Scope:** Lines 1395, 1428.
* **Discrepancy Description**:
  - A statement amount for a non-indexed pension, or one with a fixed index rate, is a nominal promise.
  - Converting every `...Today` field by inflation overstates these pensions.
  - The plan does not say when `indexRate` starts, or how bridge benefits are treated.
* **Rationale & Recommendation**:
  - State the rule, for example:
    - `full` is inflated by the deflator from the plan start;
    - `fixed` and `none` are nominal at the start age;
    - `fixed` grows at `indexRate` from the start age.
  - Add matching `db.test.ts` rows.

### 17. TFSA room, surplus ownership and the conservation identity are not defined - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-13), `egm-codebase-details` (codebase-details-1-26)
* **Affected Scope:** Lines 1436-1437, 1456, 1494, 1658. Config: `federal.json:526`.
* **Discrepancy Description**:
  - TFSA room has two open rules: whether withdrawals are re-credited the next year, and whether the indexed limit is rounded to $500 steps.
  - `placeSurplus` sends money to "the owner's TFSA", but household surplus has no single owner.
  - The invariant "money is conserved" has no stated identity.
* **Rationale & Recommendation**:
  - Decide the TFSA rules.
  - Allocate surplus by each spouse's share of the forced draws, or to spouse 1 first.
  - Write the identity in file 38 (start + contributions + returns - withholding - draws + deposits = end), and add an `invariants.test.ts` row for it.

### 18. Two property tests contradict the design, and the zero-tax test config is undefined - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-14), `egm-codebase-details` (codebase-details-1-17). The two-pass part duplicates ZO-7 and Critic-9.
* **Affected Scope:** Lines 1673-1675. Code: `load.ts:65-73`.
* **Discrepancy Description**:
  - "The two-pass split matches the full nested search" is not guaranteed, because the two-pass split is a heuristic.
  - "Swapping spouses gives the same totals" fails on ties, because the tie rules prefer spouse 1.
  - The construction of the zero-tax config is not given. `buildConfig` requires every key with a matching `taxYear`.
* **Rationale & Recommendation**:
  - Give the two-pass test a tolerance or bound.
  - Exclude ties from the swap test.
  - Say how the zero-tax config is built: either from the committed bundle with the rate entries set to 0, or with `applyRuleOverrides`. Name its helper file.
  - List the property tests by stage.

### 19. Test plan rows are missing for stage 2 modules - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-16)
* **Affected Scope:** Lines 1648-1671.
* **Discrepancy Description**:
  - There are no rows for:
    - `invariants.test.ts`;
    - `bisect.test.ts`;
    - `workingYear`;
    - `runPath` (row span, `detail` modes, `PlanSummary` totals);
    - `read.ts` with `ruleFactor` and stale overrides.
  - "Convergence for every tax case" makes no sense, because the tax cases are single returns, not plans.
  - The M5 row sits in `units.test.ts`, but the summing it tests happens in `runPath`.
* **Rationale & Recommendation**:
  - Add these rows.
  - Restate the `yearSolve` convergence row in terms of concrete plan inputs.

### 20. Coverage enforcement has no switch, and its start is worded two ways - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-14), `egm-implementation-readiness` (implementation-readiness-1-18), `egm-style` (style-1-10). Related to Known gaps M3.
* **Affected Scope:** Lines 1078, 1198, 1698. Code: `vitest.config.ts:6,18-23`, `ci.yml:37-38`.
* **Discrepancy Description**:
  - Thresholds apply only when `ENFORCE_COVERAGE=true`, and CI never sets it. Enforcement "from the stage-2 tag" therefore never happens.
  - Line 1198 says "from the `stage-2` tag" and line 1698 says "from stage 2".
  - Both lines state the 70% target as settled, although M3 says it cannot be reached.
  - The `src/**` threshold also covers `src/engine/**`.
* **Rationale & Recommendation**:
  - List `ci.yml` as Modify, and set the flag on the unit-test step.
  - Use the same wording in both places, with "(70% target pending M3)".
  - Say whether the two thresholds overlap on purpose.

### 21. The plan does not name existing functions for stage 2 to reuse - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-18). Duplicates ZO-15 (the `tax/tables.ts` part).
* **Affected Scope:** Lines 1386, 1421, 1454-1455. Code: `federal.ts:23-49` (`incomeTotals`), `personalTax.ts:16-30`, `read.ts:55` (`brackets`), `load.ts:59` (`toAnnual`), `schema.ts:102` (`checkEntry`), `tax/tables.ts`.
* **Discrepancy Description**:
  - The design names `incomeTotals` at line 425, but files 24, 28 and 32 do not.
  - Without a pointer, an implementer could write a second calculation of net income or of the first-bracket level.
* **Rationale & Recommendation**: Name these functions in files 24, 28 and 32.

### 22. File headings leave out modules their bodies define - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-8), `egm-implementation-readiness` (part of implementation-readiness-1-4), `egm-codebase-details` (codebase-details-1-27)
* **Affected Scope:** Lines 1375, 1440, 1478, compared with lines 1650 and 1666.
* **Discrepancy Description**:
  - File 24 omits `overrides.ts` and `read.ts`.
  - File 31 omits `returns.ts`, and does not say which file owns `mixForYear` or `afterTaxStockShare`.
  - File 36 defines `plannerSearch` without naming its file.
* **Rationale & Recommendation**: List every file in each heading, and name the owning file for each function.

### 23. File 41 states the Worker's cancel mechanism as settled - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-4), `egm-implementation-readiness` (part of implementation-readiness-1-20). Duplicates Critic-1 and IZO-6.
* **Affected Scope:** Line 1517, compared with line 1084.
* **Discrepancy Description**:
  - File 41 says "Between runs it checks for a newer revision and abandons the old one."
  - The open row SR1-M2 says a synchronous Worker never sees a newer revision during a run.
* **Rationale & Recommendation**:
  - Write the mechanism that was chosen. IZO-6 recommends that the client stops the Worker and starts a new one.
  - Alternatively, mark the line "open (SR1-M2, close before stage 4)".

### 24. File 13's `AGENTS.md` spec disagrees with the committed `AGENTS.md` - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-6)
* **Affected Scope:** Lines 1254-1266, 1099.
* **Discrepancy Description**:
  - File 13 leaves out several committed rules:
    - "Never invent a config key";
    - "Read the section for the file you are changing";
    - "Where this file and the design disagree, stop and ask";
    - "Never 'you should'".
  - It words the rule on protected files more loosely than the committed file.
  - Line 1099 sends readers to file 13 for the working rules.
* **Rationale & Recommendation**:
  - Bring file 13 in line with the committed file.
  - Alternatively, say "as committed in `AGENTS.md`" and list only its section names.

### 25. The Known gaps intro's closing rule and counts are wrong - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-2). Related to CR-1.
* **Affected Scope:** Line 1045.
* **Discrepancy Description**:
  - "Each Major must be fixed in this document" is wrong for rows that code, tests or config close: FR-M13, M3 and M4.
  - The totals for round 2 are out of date.
  - It is unclear whether the rule covers the SR1- rows.
  - The `TC-` prefix is not explained.
* **Rationale & Recommendation**:
  - Split the intro into a "Sources" part and a "Rule" part.
  - Write the rule as: "Each open Major is closed (in this document, or by the code, test or config the row names) before its stage."
  - Drop the stale totals, or give the current open count.
  - Explain `TC-`.

### 26. The TC-1 row says the entry is unvalidated, but it is validated - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-1), `egm-implementation-readiness` (implementation-readiness-1-21)
* **Affected Scope:** Line 1067. Config: `federal.json` (`federal.credits.basic_min` was validated on 2026-11-19).
* **Discrepancy Description**:
  - The row says the entry "stays unvalidated until the author checks it".
  - It is not struck through, and its gate is stage 1, which is already built.
* **Rationale & Recommendation**: Strike the row through, write "validated by the author 2026-11-19", and set its "Close before" cell to "—".

### 27. "Typing stays smooth during runs" cannot be measured - Severity: Major
* **Reviewer Lens:** `egm-style` (style-1-9)
* **Affected Scope:** Line 1702.
* **Discrepancy Description**: This subjective criterion sits next to measurable ones.
* **Rationale & Recommendation**: Give a threshold, for example "no main-thread task over 50 ms while a run is in progress". Otherwise, name who judges it.

### 28. The `bisect` precision cannot be reached as specified - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness` (part of implementation-readiness-1-20)
* **Affected Scope:** Line 1454.
* **Discrepancy Description**:
  - The plan does not say whether the precision applies to *x* or to *f*.
  - With an upper bound of $50M, 32 steps cannot reach $0.01.
* **Rationale & Recommendation**: Decide this before stage 2: either put the precision on *x*, or cap `hi`.

### 29. Small stage 2 precision gaps - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-20), `egm-codebase-details` (codebase-details-1-25). The `WEIGHT_SUM_TOLERANCE` point duplicates ZO-15.
* **Affected Scope:** Lines 1370, 1426, 1437, 1461, 1675.
* **Discrepancy Description**:
  - The comment on `WEIGHT_SUM_TOLERANCE` still says "blend weights", which were removed.
  - The `first_bracket` level does not name its row, `rows[1].from`.
  - `sellProRata(amount)` has no account parameter.
  - `cppAt65Today` is monthly, and the plan does not say where the ×`MONTHS_PER_YEAR` happens.
  - File 57 uses a glob for hand-written test files.
* **Rationale & Recommendation**: Fix each point when its file is built.

### 30. Stage 2 says "all four strategies", but the planner is built at stage 4 - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness` (implementation-readiness-1-19), `egm-codebase-details` (codebase-details-1-28), `egm-style` (style-1-15). This is SR1-N11, which is unfixed; related to ZO-1.
* **Affected Scope:** Line 1107.
* **Rationale & Recommendation**: Say "three strategies". Also say whether `solveYear` must accept `planner_pick` in stage 2.

### 31. "Plus two checks", but only one extra check is listed - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-5; rated Major by that lens)
* **Affected Scope:** Lines 1685-1693.
* **Rationale & Recommendation**: Say "plus one check" (`no-network.spec.ts`). Add a blank line before `### Verification Plan`.

### 32. Stale facts about the tooling and config - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-19, -1-21, -1-29, -1-30)
* **Affected Scope:** Lines 1122, 1213, 1607, 1671.
* **Discrepancy Description**:
  - `.gitignore` already has `test-results/`.
  - The ESLint config also sets `ignoreReadonlyClassProperties` and `ignoreArrayIndexes`, and `federalBasicAmount` relies on the second.
  - `configCheck` prints only counts, and lists keys only with `--strict`.
  - The `configCompare` tests are already in `config.test.ts:135-159`, and there is no `configCheck` test.
* **Rationale & Recommendation**: Update the text to match the code, and remove the "may be folded" choice.

### 33. Stage gates and pending decisions are stated as met or decided - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-16, -1-20, -1-26, -1-30)
* **Affected Scope:** Lines 1080, 1106, 1446, 1564, 1691.
* **Discrepancy Description**:
  - "Stage 0 config validated" cannot hold while some planning entries stay null (SR1-N13).
  - The M2 hedges "may be moot" and "if M2 is resolved" leave the decision open.
  - The O29 rebalance-off behaviour is stated as decided.
  - "Returns are steady averages" is the wording FR-M18 flags, and that sentence runs over 60 words.
* **Rationale & Recommendation**:
  - Say "`federal.json` and `ontario.json` validated".
  - Withdraw M2, or state the CUJ 6 check outright.
  - Add "(pending O29)" and "(wording pending FR-M18)", and split the long sentence.

### 34. Known gaps table: unclear status wording and history - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-17, -1-18, -1-19, -1-21). Related to CR-4 and Critic-18.
* **Affected Scope:** Lines 1047-1097, in particular 1057, 1063, 1064, 1069, 1076, 1085.
* **Discrepancy Description**:
  - Some cells end with a bare "author" or "(author)".
  - "6% condition assumed" does not name the condition.
  - "(draft 2026-11-19)" does not say whether the work is done.
  - The R1-F16 row carries label history.
  - Open and closed rows are mixed together, and the dates are inconsistent.
* **Rationale & Recommendation**:
  - Write "decided by the author".
  - Name the 6% condition.
  - Replace "(draft ...)" with a clear status, such as "added 2026-11-19, not yet reviewed".
  - Drop the history.
  - Put the open rows first, and date every fix the same way.

### 35. Review history and admin guide wording - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-22, -1-23, -1-24)
* **Affected Scope:** Lines 1285-1297, 1320-1323, 1351.
* **Discrepancy Description**:
  - File 16 lists only the 2026-11-17 reviews folder.
  - "Users can change any value" overclaims, because `warnings.*` and the return keys are not overridable.
  - "Ontario probate is read by the admin" is passive.
  - "theirs" has an unclear antecedent.
  - The four keys at line 1351 are not mapped to their questions (O24, O25, O27, O31).
* **Rationale & Recommendation**:
  - Add the 2026-11-18 and 2026-11-19 folders to file 16.
  - Change "any value" to "rule values".
  - Rewrite the passive sentence and the unclear antecedent.
  - Put each question next to its key.

### 36. Signatures and readouts are specified unevenly - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-25, -1-27, -1-28, -1-29)
* **Affected Scope:** Lines 1450-1456, 1468, 1490, 1501-1502, 1525-1527.
* **Discrepancy Description**:
  - Only `bracketTopUp` has full parameter types.
  - "Top three inputs by effect" does not define the effect.
  - "The readout" at line 1490 is not named.
  - `status` and `isUpdating` overlap.
* **Rationale & Recommendation**:
  - Type every signature to the same level of detail.
  - Name the measured effect.
  - Name the readout.
  - Derive `status` from the revisions, or drop one of the two fields.

### 37. The tax fixture and test table wording - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-32, -1-33)
* **Affected Scope:** Lines 1613-1628, 1644, 1650, 1670-1671, 1707-1709.
* **Discrepancy Description**:
  - The authorship of the fixture is contradictory: the heading says "by the author", but line 1628 says an agent entered the cases.
  - The size of the hand-checked sample is not given.
  - The phrase "within $1 per return" is vague.
  - The clawback exclusion is stated twice.
  - "Unexplained — investigated" gives no outcome.
  - "One file per module" is not true of the table.
  - The provenance comment and the footer repeat each other.
* **Rationale & Recommendation**:
  - Write "(stage 0; entered by an agent, checked by the author)".
  - Give the number of cases that were re-run.
  - Say that federal tax, Ontario tax and clawback each match within $1.
  - Remove the duplicates.
  - Record the outcome of the investigation.
  - Rename the table "Test files and their cases".

### 38. Word choice and absolute claims - Severity: Nit
* **Reviewer Lens:** `egm-style` (style-1-11, -1-12, -1-13, -1-14, -1-31)
* **Affected Scope:** Lines 1105, 1112-1113, 1132, 1181, 1245, 1575, 1584.
* **Discrepancy Description**:
  - "Majors are pinned" could be read as Major findings rather than major versions.
  - "a small CSP plugin" uses a subjective size word.
  - "a fork's branch named `main` can never deploy" is absolute.
  - "Test friends" is informal, and the speed check has two names.
  - Specs carry dated removal notes, such as "no Recalculate button (2026-11-19)".
* **Rationale & Recommendation**:
  - Write "major versions".
  - Drop "small".
  - Write "runs triggered from a fork or a pull request do not deploy".
  - Write "testers", and use one name for the speed check.
  - Move the removal notes to the decision log.

### 39. Known gaps row SR1-M1 is wrong about `planning.shapes` - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-2; rated Blocker under that lens's contradiction rule)
* **Affected Scope:** Line 1083. Config: `planning.json:113-121`.
* **Discrepancy Description**:
  - The row says the shapes are "placeholders, unvalidated until O26".
  - The entry was validated on 2026-11-19, and O26 is resolved.
* **Rationale & Recommendation**: Reword the row to "validated 2026-11-19 (O26 resolved)".

### 40. `tsconfig.base.json` is missing from the file plan - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details` (codebase-details-1-20)
* **Affected Scope:** Lines 1168-1175.
* **Discrepancy Description**: `tsconfig.base.json` holds the strict options and the path alias, but the file plan does not list it.
* **Rationale & Recommendation**: Add it to the plan.

## Severity Breakdown

| Severity | Count |
| --- | --- |
| Blocker | 1 |
| Major | 26 |
| Nit | 13 |
