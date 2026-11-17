# Implementation Readiness Report, Round 2 (re-audit after fixes)

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md`, the "Detailed Implementation Plan" section (lines 816-1423)
**Stage:** 9, Implementation Readiness Test, round 2
**Date:** 2026-11-17
**Round-1 report:** `implementation_readiness_report.md`. **Settled decisions:** `goldfish_review_report.md`. No settled decision was re-opened.

## Reviewer Status

| Reviewer | Status | Verdict |
| --- | --- | --- |
| `egm-implementation-readiness` | completed | Ready with fixes |
| `egm-codebase-details` | completed | Ready with fixes |
| `egm-style` | completed | Ready with fixes |

All three reviewers ran on the first attempt, so none were retried.

## Summary

- **Overall verdict: Ready with fixes.** All four round-1 Blockers are fixed or reduced to small, bounded gaps. Stages 0 and 1 can start once the stage-0 Majors are fixed: M8 (deploy trigger), M10 (format and lint checks fail at stage 0) and M12 (stale file 16). The other Majors must be closed before the stage they affect.
- **New findings after deduplication:** 0 Blocker, 18 Major, 21 Nit.
- **Round-1 findings:** 26 Fixed, 15 Partly fixed, 0 Still open.

Where reviewers disagreed about a round-1 status, this report uses the most cautious one. Ids follow the pattern `<reviewer>-r2-<n>`, where `n` is the number the reviewer gave the finding (N0, N1, and so on). The codebase-details reviewer started counting at N0. `ir` stands for implementation-readiness and `cd` for codebase-details.

## Round-1 Findings Status

| ID | Status | Notes (current lines) |
| --- | --- | --- |
| F1 | Partly fixed | Now defined: the entry shape, the closed `unit` enum, loading through `bundle.ts`, and `configStatus(today)` (255-261, 1087-1095). Still open: the key tree is only examples with wildcards (258). Item 20 (1048) says `SOURCES.md` lists every key "from the Config contract", while the Config contract leaves the full list to `SOURCES.md`, so each points to the other. Several rule values have no key (see M9). `planning.json` and `warnings.json` have no key names. `market.correlation` fits none of the allowed `value` shapes (256). |
| F2 | Fixed | Design values are given (411-468) and wired to config (1063-1072). |
| F3 | Partly fixed | `PlanInputs`, `YearRow` and `PathSummary` are defined (470-523). Still undefined: `Result`, `NormalizedInputs`, `warningFacts`, and how the CSV flattens fields (see M1). |
| F4 | Fixed | Cancel calls `terminate()` and creates a new Worker (237, 1231). |
| F5 | Partly fixed | Items 1, 2 and 15 are correct. Item 16 (1000-1011) is stale (see M12). |
| F6 | Fixed | The checksums are removed. There is one fixture rule (974, 1414), and the line between what the agent drafts and what the author commits is clear (1359). |
| F7 | Partly fixed | Stage-0 tests can now pass: pass-with-no-tests flags (878-879), a placeholder `main.tsx` (944), and a report-only bench (958). However, `format:check` fails at stage 0 (M10), and the bench input conflicts between 1260 and 1393 (N13). |
| F8 | Fixed | The CSP plugin runs at build time only (902), and the Worker gap is recorded (538). |
| F9 | Fixed | A `revision` counter replaces the hash (235, 1238-1240). |
| F10 | Partly fixed | The export list is given (1219-1223). Still missing: the `EngineIntegrityError` and `Cancelled` types, the return shape of `configDefaults()`, and a way for the UI to get a `deflator` for `toDisplay`, because `makeDeflator` is not exported and `Result` does not carry one. |
| F11 | Fixed | A version table, `.nvmrc`, `engines` and `tsx` are given (848-887). The missing DOM test environment is a new finding (M4). |
| F12 | Fixed | Each script has an exact command (872-883). |
| F13 | Partly fixed | `vite-tsconfig-paths` and the tsconfig split are given (889-904). `vitest.config.ts` does not list the plugin (N3), and the `tsc -b` emit settings are missing (N4). |
| F14 | Fixed | The include and exclude globs and the branch-coverage metric are given (918-919). The coverage scope problem is new (M3). |
| F15 | Partly fixed | The rule is named and the ignore list is ASCII (933). Line 259 contradicts the exemption for `generator.ts`, and the literal `12` and the numeric literal types are not handled (see M18). |
| F16 | Partly fixed | The return convention, the Box-Muller sampler, the generator layout and the fees are given (306-308, 1182). The per-path seeding and the construction of the uniform double are unsafe or unspecified (M11). |
| F17 | Fixed | $0.01 bisection and $1 per cell (357, 1345, 1389). |
| F18 | Fixed | `makeDeflator` and `YearContext` (1101-1108). |
| F19 | Partly fixed | Most signatures are typed (1105-1127). Still not typed: the `state` and `nextState` in `solveYear`, `NormalizedInputs`, and the parameters of `bestSplit` and `survivorBenefits`. The parameters of `workingYear(...)` are elided (1171). |
| F20 | Fixed | The CPP, OAS and survivor formulas are given (295-297), and the death benefit moved to non-goals. |
| F21 | Partly fixed | The draw order, the bracket fill and the pro-rata rule for non-registered and TFSA draws are set (322-325). How registered draws are split between spouses is still undefined (M6). |
| F22 | Partly fixed | `workingYear.ts` exists (1168-1171). Still undefined: whether a spouse still working after the first retirement keeps contributing, whether working years rebalance, and where tax on non-registered income comes from in working years. The mixed-year marginal-rate rule (245) has no function that owns it. |
| F23 | Partly fixed | Result definitions are given (386-403). Lifetime tax "in today's dollars" conflicts with the units rule (M5). The ranking metric behind "typical" is not named (M14). |
| F24 | Partly fixed | There is now a per-module test table (1361-1381), and the e2e assertions are concrete (1395-1405). Still no tests for `bisect`, `invariants`, `variants` (including skipping variants identical to the user's choice), `simulate`, `runPath`, pre-retirement `workingYear`, `load.ts`/`configStatus`, `configBundle`, the worker client's cancel, or `afterTaxStockShare`. The CUJ 6 config-injection test cannot be built as described (M2). |
| F25 | Fixed | The snapshots are cut, and the storage key, startup rule and filename are given (527-530, 1247-1250). The date format in the filename is a Nit (N21). |
| F26 | Fixed | The deploy workflow is specified (960-967). Its trigger is unsafe, which is a new finding (M8). |
| F27 | Fixed | 950-953. |
| F28 | Fixed | The reference machine is defined (544) and recorded in the README (990, 1416). |
| F29 | Fixed | The author is the judge, with concrete criteria (82-86, 1417). |
| F30 | Fixed | The items are numbered 1-60 with no gaps. |
| F31 | Partly fixed | The glossary has a minimum ("at least the terms in the Glossary", 1318). The style reviewer notes that the content of `explanations.ts` (1319) is still left to the implementer and is not marked as supplied by the author. |
| F32 | Partly fixed | The path format and the seed are defined (478, 521). The default values of an empty plan are not listed: line 522 points to the file that is still to be created. |
| F33 | Fixed | 1320. |
| F34 | Fixed | Each file has a stage (1076-1217). Small slips are recorded in N2 and N20. |
| F35 | Fixed | 877, 954, 1411. |
| F36 | Fixed | The redundant sentence is removed. |
| F37 | Fixed | The test file names are listed (1365-1381). |
| F38 | Fixed | 846. |
| F39 | Fixed | 980. |
| F40 | Fixed | The rule is stated once (975) and referenced from 818. |
| F41 | Fixed | 468. |

**Totals:** 26 Fixed, 15 Partly fixed, 0 Still open.

## Prioritized Findings

There are no Blockers.

### Major

#### M1. The engine-to-UI result contracts are incomplete
- **Sources:** ir-r2-1, cd-r2-1. **Severity:** Major.
- **Lines:** 470-523, 1102, 1105-1111, 1189-1223, 1292-1305, 1343-1345.
- **Problem:** `Result` has no field list, although `runPlan` returns it, the Worker posts it, and the store, the change summary and every results component read it. Related gaps:
  - `PathSummary.warningFacts` is untyped.
  - `NormalizedInputs` is undefined, including what `…Today` means when `planStartYear` is later than the current year.
  - `YearRow` has no fields for minimum or forced draws, the bracket top-up, TFSA and non-registered contributions, the cash yield by type, final-return tax, probate, or the estate breakdown. `EstateWaterfall`, the warnings and lifetime tax need these.
  - The CSV header rule does not say how nested fields and fields keyed by `[accountId]` are named. The engine author and the separate reference session will therefore produce different headers.
- **Recommendation:** Define `Result`. It needs at least:
  - `revision` and `configStatus`;
  - the probabilities of success and of meeting the legacy goal;
  - the typical and bad legacy and lifetime tax;
  - the rows for the typical, bad, stress and fixed-return paths;
  - the comparison objects, including the "current choice" and opposite-direction flags;
  - the after-tax stock shares;
  - the warnings and tips;
  - the estimated gross amount for each phase.

  Also define `warningFacts`, `NormalizedInputs`, the missing `YearRow` fields, and a CSV naming scheme such as `spouse.0.withdrawals.<id>`.

#### M2. The CUJ 6 test config cannot be injected as described
- **Sources:** ir-r2-2, cd-r2-2, style-r2-5. **Severity:** Major.
- **Lines:** 921-927, 1087-1095, 1324-1327, 1403.
- **Problem:** `VITE_CONFIG_SET=test` and "a test config with one unvalidated key" appear only at 1403.
  - `bundle.ts` is generated with static imports for `CURRENT_YEAR`, so nothing reads the variable.
  - The plan does not say where the test config lives.
  - Playwright has a single `webServer` that runs the normal build.
  - The plan does not say whether `bundle.ts` is committed or regenerated, and neither `build` nor CI runs `config:bundle`.
  - If `bundle.ts` reads `import.meta.env`, it breaks under `tsx` and plain Node.
- **Recommendation:**
  - Commit `bundle.ts`.
  - Name the path of the test config, for example `tests/e2e/config/`.
  - Choose a switch, such as a Vite `resolve.alias` applied in a dedicated mode.
  - Add a second Playwright project or `webServer` on another port.
  - Consider adding `parseConfig(json)` so that tests can validate other configs.

#### M3. The coverage gate cannot pass, and its start is unclear
- **Sources:** ir-r2-3, cd-r2-4, ir-r2-11, style-r2-3. **Severity:** Major.
- **Lines:** 919, 1412, 1361-1381.
- **Problem:** The threshold of 70% branch coverage for "other `src/**`" counts `src/ui/**`, `src/worker/**`, `main.tsx` and the generated `bundle.ts`. None of these has Vitest tests, and Playwright does not feed v8 coverage, so CI fails from stage 5. The two lines also disagree about when enforcement starts:
  - line 919 says "from the `stage-2` tag onward", which means stage 3;
  - line 1412 says "from stage 2".

  Neither line says how the gate is turned on.
- **Recommendation:** Limit the 70% gate to `src/state/**` and exclude `src/ui/**`, `src/worker/**`, `src/main.tsx` and `bundle.ts`, or add component tests and their dependencies. State the start once, for example "add `coverage.thresholds` to `vitest.config.ts` in the stage-2 commit".

#### M4. The store and persistence tests have no DOM environment
- **Sources:** cd-r2-5. **Severity:** Major.
- **Lines:** 853-868, 918, 1379-1380.
- **Problem:** `persistence.test.ts` and `store.test.ts` exercise `localStorage`, `navigator.storage.persist()` and the debounced autosave. The default Vitest environment is Node, which has none of these. No `jsdom` or `happy-dom` package is listed, and the dependency rule forbids adding one ad hoc.
- **Recommendation:** Add `happy-dom` (or `jsdom`) to the version table, and set the environment for these files, either with a `// @vitest-environment` comment in each file or with a glob in `vitest.config.ts`.

#### M5. Lifetime tax "in today's dollars" conflicts with the units rule
- **Sources:** ir-r2-4. **Severity:** Major.
- **Lines:** 318, 391, 517, 936, 1198-1202.
- **Problem:** A nominal sum over 30-45 years cannot be converted to today's dollars afterwards. Paths that keep only a summary have no rows to re-deflate, and the `TodayDollars` lint rule bans deflating inside `project/`. The same problem affects the average withdrawal tax rate and `totalShortfallNom`.
- **Recommendation:** Decide where the per-year deflation happens. For example, `runPath` could add up `lifetimeTaxToday` with a named lint exemption. Alternatively, define lifetime tax as nominal. Then update `PathSummary`.

#### M6. The split of registered draws between spouses is undefined
- **Sources:** ir-r2-5. **Severity:** Major.
- **Lines:** 322-324, 1157-1158.
- **Problem:** "RRSP/RRIF and LIF in proportion (LIF capped)" does not say:
  - whether the proportion runs across both spouses' accounts or within each spouse in some order;
  - where the shortfall goes when the LIF cap binds;
  - whether an RRSP that has not been converted can be drawn;
  - that a LIRA cannot be drawn.

  `bracketTopUp` also has no types for its parameters. These choices change the tax result in every year.
- **Recommendation:** State the rule, for example "pro rata across both spouses' RRSP/RRIF/LIF balances; any amount over the LIF cap comes from the same owner's RRSP/RRIF; a LIRA is never drawn before conversion".

#### M7. Persisted identifiers are undefined
- **Sources:** ir-r2-6. **Severity:** Major.
- **Lines:** 258, 415-430, 485-500.
- **Problem:** The string values of the asset classes, `shapeId`, `presetId` and the account `id` are never given, yet they become permanent when `saved-plans/v1.json` is frozen. `AccountInput.holdings` has no stated use: the placement presets and the yearly rebalance set holdings, and Alternative O rejects per-account mixes.
- **Recommendation:** Define these enums and the account-ID format. Either remove `holdings` or state its use. Do both before v1 is frozen.

#### M8. The deploy trigger can publish code from a fork
- **Sources:** cd-r2-0. **Severity:** Major.
- **Lines:** 964-965.
- **Problem:** `workflow_run` with `branches: [main]` matches the head branch *name* of the run that triggered it. A pull request from a fork whose branch is named `main` runs CI. If that run succeeds, deploy checks out the fork's commit and publishes it with `pages: write`. The repository is public.
- **Recommendation:** Add `github.event.workflow_run.event == 'push'` and `github.event.workflow_run.head_repository.full_name == github.repository` to the job condition. Pin the major versions of the Pages actions.

#### M9. Rule values the engine needs have no config key
- **Sources:** cd-r2-3, plus the F1 residue from ir. **Severity:** Major.
- **Lines:** 258, 263, 973, 1048, 1111, 1132.
- **Problem:** No key exists for:
  - the capital-gains inclusion rate;
  - the pension income credit (its amount and age);
  - the age-65 eligibility for pension splitting and the pension credit;
  - the OAS 75+ age;
  - the age-amount reduction rate;
  - the source of the LIF minimums.

  Rule values are banned in code (263) and may not be supplied from memory (973). The implementer must therefore invent key names, and the two separate fetch sessions will not agree on them. The circular reference between the Config contract and `SOURCES.md` (1048) makes this worse.
- **Recommendation:** Put the complete key list in the design, or make item 20 an author-supplied full list.

#### M10. `prettier --check .` and the lint step fail at stage 0
- **Sources:** cd-r2-6. **Severity:** Major.
- **Lines:** 877, 929, 954.
- **Problem:**
  - Prettier will check the existing Markdown (the design, `concepts_brief.md`, `docs/reviews/**`), which uses `*   ` list markers that it rewrites. It will also check `package-lock.json`, the config JSON and the generated `bundle.ts`.
  - The ESLint 9 flat config does not ignore `dist/`, `coverage/` or `playwright-report/` by default.
  - An ESM `eslint.config.js` needs `"type": "module"` in `package.json`.
- **Recommendation:** Add `.prettierignore` to the file list (covering `docs/`, `*.md` or a decision to reformat, `package-lock.json` and `bundle.ts`). Give `ignores` in `eslint.config.js`, and set `"type": "module"`.

#### M11. The random-number seeding is unsafe and incompletely specified
- **Sources:** cd-r2-7, ir-r2-13 (partly). **Severity:** Major.
- **Lines:** 308, 1182.
- **Problem:**
  - `pure-rand` xoroshiro128+ seeded with `seed + k` gives neighbouring paths nearly identical seeds. This generator does not mix its seed well, so the early outputs of neighbouring paths are correlated. Those are the first-year returns, which matter most for sequence risk.
  - `seed + k` can overflow uint32, and the plan does not say whether it wraps.
  - The plan does not say how a uniform double is built so that Box-Muller avoids `log(0)`.
  - It does not say whether both Box-Muller normals are used, or whether `next` or `unsafeNext` is called.
- **Recommendation:** Create path k by calling `jump()` k times on the base generator, or seed it with a splitmix32 hash of `(seed, k)`. Specify the 53-bit double construction, use `1 - u` inside the log, and state whether both normals are used.

#### M12. File 16 is stale
- **Sources:** style-r2-1, cd-r2-8, ir-r2-10 (rated Nit). **Severity:** Major (two of three reviewers).
- **Lines:** 1000-1011.
- **Problem:** File 16 says "Create by moving files … from the repository root". All six reports are already in `docs/reviews/2026-11-17/`, so this is the same stale-status problem as F5. This round adds a seventh file, `implementation_readiness_report_r2.md`, which the list also omits.
- **Recommendation:** Mark the folder "Exists, keep" and list everything it contains.

#### M13. `bestSplit` does not say who transfers income to whom
- **Sources:** cd-r2-9. **Severity:** Major.
- **Lines:** 326, 545, 1128.
- **Problem:** The search tries splits of 0-50% but does not say which spouse transfers eligible income. Either spouse can. The budget of 11 points implies one direction, and the choice changes the tax result.
- **Recommendation:** State the direction rule, or search both directions (21 points) and update the performance budget.

#### M14. The path population behind comparisons and "typical" is undefined
- **Sources:** cd-r2-11, ir-r2-12 (partly). **Severity:** Major.
- **Lines:** 389, 403, 1191, 1201.
- **Problem:** Baselines run only on the first 250 paths (`COMPARISON_PATHS`). "The user plan's bottom 10% by legacy" and the median per-path difference are therefore undefined for user paths 251-1000. Separately, the plan does not name the metric used to rank paths when it picks the "typical" path.
- **Recommendation:** State that `compare` ranks and averages over the first 250 paths only (the bottom 25 by user legacy). Name the ranking metric for "typical", for example after-tax legacy with the existing tie-break.

#### M15. Sheltered accounts lose their cash yield
- **Sources:** cd-r2-12. **Severity:** Major.
- **Lines:** 280, 306, 346-360, 1144.
- **Problem:** The price return is the total return minus the yield. Step 4 pays out only the non-registered yield, and step 7 applies only price returns. Nothing reinvests the yield inside RRSP, RRIF, LIRA, LIF and TFSA accounts, and nothing applies the foreign-withholding haircut that `market.foreign_withholding_rate` exists for.
- **Recommendation:** Add a function that reinvests the yield, net of withholding, in sheltered accounts, and give it a unit test.

#### M16. The tax fixture format is ambiguous
- **Sources:** cd-r2-13. **Severity:** Major.
- **Lines:** 1335-1341.
- **Problem:** The fixture does not say whether `federalTax` includes the OAS recovery tax. TaxTips reports that tax separately, and `personalTax` returns `clawback` separately, so a mismatch fails by thousands of dollars against a $1 tolerance. A single-person record also cannot express the "pension-split pair".
- **Recommendation:** Add a `clawback` field and a `pairId`, and state that `income` is the amount after the split.

#### M17. File-number cross-references broke when the files were renumbered
- **Sources:** style-r2-2. **Severity:** Major.
- **Lines:** 130 and 537, outside the range but broken by the renumbering inside it.
- **Problem:** Both lines point to "file 17" for the history documents. File 17 is now `docs/units-and-conventions.md`; the history documents are file 18 (1023).
- **Recommendation:** Change both to file 18, or refer to files by path rather than by number.

#### M18. The no-magic-numbers exemptions contradict each other and are incomplete
- **Sources:** style-r2-4, plus the F15 residue from cd and ir. **Severity:** Major.
- **Lines:** 259, 933, 1076-1085, 1132.
- **Problem:**
  - Line 259 says `constants.ts` is "the one engine file exempt" from the rule, but line 933 also exempts `market/generator.ts`.
  - The months divisor `12` is in neither the ignore list nor `constants.ts`.
  - The literal types `250 | 1000` and `schemaVersion: 1` will be flagged unless `ignoreNumericLiteralTypes: true` is set.
- **Recommendation:** Reconcile line 259 with line 933, or move the Box-Muller constants into `constants.ts`. Add a `MONTHS_PER_YEAR` constant and set `ignoreNumericLiteralTypes`.

### Nit

| ID | Sources | Lines | Problem and recommendation |
| --- | --- | --- | --- |
| N1 | ir-r2-7, style-r2-8 | 371-376, 1165, 1171 | `workingYear(...)` is the only function whose parameters are elided. The types of the engine `state` and `nextState` are undefined. Contributions and rebalancing in working years after the first retirement are not specified. Give the signature and the rules. |
| N2 | ir-r2-8 | 1097-1108 | `types.ts` (stage 1) uses `deflator`, and stage-1 tax needs indexed brackets, but `makeDeflator` is in `units.ts`, a stage-2 file. Move it to stage 1. |
| N3 | ir-r2-9 | 914-919 | A standalone `vitest.config.ts` does not inherit `vite-tsconfig-paths`, so `@engine/*` imports fail in tests. Add the plugin, or use `mergeConfig`. |
| N4 | ir-r2-14, cd-r2-10 | 874-875, 889-896 | The `tsc -b` emit settings are unstated (`noEmit`, `tsBuildInfoFile`, `resolveJsonModule`). As written, the build emits files into the source tree. Mirror the Vite react-ts template. |
| N5 | style-r2-6 | 773, 824 | O16 is a gate "before starting" stage 0 at 824 but is "checked before stage 0 ends" at 773. Pick one. Write "the two testers" instead of "the test friends". |
| N6 | style-r2-7 | 1363 | "One file per module" does not match the table: some files cover several modules, and several modules have no test file (see F24). Rephrase the sentence, or add the missing rows. |
| N7 | style-r2-9 | 1079-1085 | `SOLVER_PRECISION`, `SPLIT_STEP` and `INVARIANT_TOLERANCE` have no units. Add them. |
| N8 | style-r2-10 | 851, 868, 874 | "Majors are pinned" should read "Major versions are pinned". "Matching" on 868 does not say what the versions match. Split the three scripts on 874 into three rows. |
| N9 | style-r2-11 | 398, 1158, 1188 | The terms are inconsistent: `bracketTopUp` lives in `fillBrackets.ts`, and the same runs are called "baselines" in one place and "variants" in another. Use one name for each concept. |
| N10 | style-r2-12 | 1142, 1150, 1157, 1279, 1341, 1401 | Opaque phrases: "validated by 71", "at face value", "in proportion", "estimated gross amount from the last run", "Answers must match", "targets 78 and 94". Define each one. |
| N11 | style-r2-13 | 538, 902 | "A small CSP plugin": "small" is filler. Delete it. |
| N12 | style-r2-14 | 880, 958, 1391 | CI runs `npm run bench` from stage 0, but the bench file is created at stage 4. Say "from stage 4". |
| N13 | cd-r2-14 | 1260, 1393 | Line 1260 says the benchmark uses the sample plan, while 1393 says it uses `tests/bench/benchPlan.json`. Drop the claim on 1260, and add `benchPlan.json` as its own file entry. |
| N14 | style-r2-15 | 1087, 1113, 1130 | The headings mix root-relative paths with paths relative to the previous file. State the convention, or write each path in full. |
| N15 | cd-r2-15, ir-r2-12 (partly) | 323, 446, 1069, 1211 | The comparison's default bracket target has two definitions (1069 and 323). "Warns" and "alerts" imply a severity level that the warning object does not carry. |
| N16 | cd-r2-16, ir-r2-13 (partly) | 432, 1183 | `stressPaths(cfg, nYears)` has no index for the first retirement year, so it cannot place its sequences. The single "Stocks" figure should say that it applies to both stock classes and whether it is a total return. |
| N17 | cd-r2-17 | 1142, 1159 | Two fallbacks are unspecified: `placeSurplus` when the owner has no TFSA room and no non-registered account, and a LIF unlock when the owner has no RRSP or RRIF. |
| N18 | cd-r2-18 | 927, 1398 | With a base-path `baseURL`, specs must call `page.goto('./')`, not `page.goto('/')`. State the Vite pattern for creating the Worker (`new Worker(new URL(...), { type: 'module' })`). CI builds twice, once in the build step and again in the e2e `webServer`; use `reuseExistingServer` or a single build. |
| N19 | cd-r2-19 | 1036, 1328-1329 | The input formats of the tools are undefined: the `SOURCES.md` table that `configCheck` parses, and the shape of the candidate file for `configCompare` when the config is split into three files. |
| N20 | cd (F34 residue) | 825 | The stage table omits `constants.ts` and `types.ts` from stage 1. |
| N21 | ir (F25 residue) | 1247-1250 | The date format in `retirement-plan-<date>.json` is unspecified. |
