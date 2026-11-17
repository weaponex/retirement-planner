# Goldfish Review Report: Stage 5, Initial Zoom Out Review

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md` (lines 1-1237; FeatureRange 1-594, DetailedRange 595-1237)
**Mode:** REVIEW
**GoldfishContext:** none supplied

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |
| `egm-inventive-catalyst` | completed |

## Summary

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 9 |
| Nit | 11 |

Neither reviewer found a Blocker. Both reviewers raised two of the issues independently: the cost of the nested pension-split search, and tips computed on a single fixed-return path. Those two are merged below and credited to both lenses. The Major findings fall into three groups:

- Mechanisms that can't work as written: cancellation, the input hash, and untaxed death-year gains.
- Performance risk to the 5-second target.
- Scope that is larger than three households need.

Spot checks against the target confirmed the quoted text at lines 203, 258, 369, 924, 1022, 1030 and 1040.

**What works well (both lenses):**
- The Worker holds only the engine.
- Year functions are pure.
- There is a single store.
- Rule values come only from config.
- Representative paths are rerun in full detail.
- Moving from fixed-point iteration to bisection (Alt U) is sound.

The three root problems from the prototype (lines 25-52) are each addressed directly by the architecture.

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Nested pension-split search inside the bisection puts the 5-second target at risk - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`, `egm-inventive-catalyst` (found independently)
* **Affected Scope:** Lines 266, 288-297 (year solver step 5), 374 (Performance), 534 (Alt V), 924 (`bestSplit`), 199 (Worker)
* **Discrepancy Description:** `bestSplit` tries about 11 splits and computes tax for 2 spouses at each split. It runs inside every bisection step, and the bisection is capped at 60 steps. Across 4 variants × 1,000 paths × 40-60 years, the two reviewers estimate between 80 and 200 million `personalTax` calls per run, before stress paths and tips. Alt V puts the cost at "about 11 tax calculations per year per path", which understates it. Line 374 already expects a performance problem but names no fix.
* **Rationale & Recommendation:** This cost can be predicted now, so fix it in the design rather than finding it at build time. Options, which can be combined:
  - Bisect W with a fixed split (last year's, or 50/50). Then run `bestSplit` once at the solved W, and re-solve if the split changed. This usually takes 1-2 passes.
  - Use about 25 bisection steps, which is enough for $1 tolerance over any realistic range, instead of 60.
  - Precompute each year's indexed tax parameters once per run. Inflation is fixed, so they are the same for every path.
  - Optionally, split the paths across a pool of Workers, giving each path its own random stream so results don't depend on how many Workers run.

  Add a property test that compares the two-pass split with the full nested search.

### 2. Tips are computed on a fixed-return path that can't measure share-of-paths warnings - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`, `egm-inventive-catalyst` (found independently)
* **Affected Scope:** Lines 151, 334-356 (Warnings, computed tips), 512-516 (Alt S), 1013-1016 (`computeTips`)
* **Discrepancy Description:** Tips nudge inputs on one fixed-return path (line 356). Warnings whose basis is "share of all paths" (line 335), such as low chance of success (line 346), can't be measured on one path, because a fixed path either succeeds or fails. Warnings that fire only on the 10th-percentile path may not fire on the fixed path at all. The resulting effect sizes look precise but carry no real information.
* **Rationale & Recommendation:** There are two options:
  - **Simplest:** compute tips only for warnings measured on the representative path. For share-of-paths warnings, show the related inputs without effect sizes.
  - **More capable:** nudge on the same simulated markets, as the comparison variants already do. Use each warning's own representative sequence, or a fixed subset of the generated paths such as the first 100. Show effect sizes as approximate. This adds to the compute budget in finding 1.

### 3. Rebalancing gains deferred to "next year" go untaxed in death years - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Line 258 (yearly rebalance), lines 273-308 (year solver steps 1, 4, 8, 9), line 982 (`death.ts`)
* **Discrepancy Description:** Gains realized by rebalancing are added to the following year's income. In the second-death year there is no following year. The deemed sale in step 9 taxes only the gains left in remaining positions, so gains realized that year are never taxed. In the first-death year, the deceased's pending gains come due after the account has passed to the survivor. The design doesn't say whose return they go on, and it has no step for the first death's final return.
* **Rationale & Recommendation:** This is a correctness gap in tax handling.
  - Add pending gains to the final return in step 9 (`finalReturn`).
  - Add an explicit step that taxes the first spouse's pending gains on their final return, before the rollover.
  - Add a check that pending gains are zero after any death.
  - Add a `tax-cases.json` fixture for the first-death final return.

### 4. Cancellation with a "shared flag" can't work on GitHub Pages - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 199, 989, 993, 1030; conflicts with line 369
* **Discrepancy Description:** Line 1030 says "Cancellation uses a shared flag checked every 50 paths". A busy synchronous Worker loop can only read a flag in the middle of a run through `SharedArrayBuffer`. That requires COOP and COEP response headers, which line 369 says GitHub Pages can't set. A flag sent by `postMessage` isn't seen until the loop gives up control, so that doesn't work either.
* **Rationale & Recommendation:** On Cancel, call `worker.terminate()` and start a new Worker. Remove the `isCancelled` hook from `simulate()` (line 989) and the check every 50 paths. Progress messages can stay as they are.

### 5. The input hash is over-built and can't be used as the design describes - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 164, 197, 1022, 1040
* **Discrepancy Description:** Line 1040 calls `inputHash(inputs)` synchronously inside a Zustand selector. But line 1022 computes the hash with Web Crypto SHA-256, and `crypto.subtle.digest` is async, so the two can't work together. The "small JS implementation in Node tests" isn't needed either, because current Node versions provide `globalThis.crypto.subtle`. A cryptographic hash isn't needed to answer "have the inputs changed?"
* **Rationale & Recommendation:** Replace the hash with one of these:
  - A revision counter that `setInput` and `loadPlan` increment, stored on the Result.
  - A direct comparison of the inputs serialized with stable key order.

  Either way, remove `hash.ts`.

### 6. The guarantee against mixing dollar units has a hole - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 203, 888 (`units.ts`)
* **Discrepancy Description:** Line 203 says mixing today's and future dollars is "a compile error". With TypeScript branded number types, `a + b` across the two brands still compiles and produces a plain `number`. Only code that remembers to use the helpers is protected. Mixed dollar units were the prototype's main failure (lines 25-52).
* **Rationale & Recommendation:** Have the engine accept only future dollars. Convert in one input-normalization function and convert back only for display, so `TodayDollars` never exists inside the solver. If both types must exist in the engine, add a lint rule that bans raw arithmetic operators on branded values. In either case, rewrite line 203 to state the guarantee accurately.

### 7. Each warning is split between config and code, with no current need for that - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 63, 334-343, 860-872 (`warnings.json`), 1012
* **Discrepancy Description:** Each warning's basis, window, scope, unit, trigger levels, severity, explanation and nudge inputs are declared in config. But each check is still a named function in code (line 1012). So every warning lives in two places that must agree. The only stated justification is that the list "grows through use" (line 63), which is speculative for 9 warnings and 3 households.
* **Rationale & Recommendation:** Define each warning in code as one object containing its check, explanation and related inputs. Keep only the numeric thresholds and nudge steps in config.

### 8. The CI benchmark that blocks deployment will be flaky - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 367, 557, 713, 1193-1196, 1235
* **Discrepancy Description:** The benchmark fails on a 25% slowdown. Shared CI runners routinely vary by more than 25% between runs. `bench` is a required step, and only green builds deploy, so a slow runner can block a release. The real target (under 5 seconds on a laptop) is already covered by the manual check at line 1235.
* **Rationale & Recommendation:** Run `bench` locally, or as a CI step that only reports and can't fail the build. Remove `baseline.json` until there is evidence of performance regressions.

### 9. Version 1 is very large for 3 households - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 21, 72-77, 595-1226
* **Discrepancy Description:** Version 1 includes more than 60 files, 8 stages, two browser engines in end-to-end tests, a migration-chain framework, 10 rolling snapshots, three path-count choices, a stress-path report, an after-tax stock-share readout, fixture checksums and more. Each is defensible alone. Together they push the success criteria (lines 74-76) back by several stages.
* **Rationale & Recommendation:** These can be deferred without affecting any goal or user journey:
  - Rolling snapshots (lines 170, 361, 560, 1055). One autosave plus export covers G7 and CUJ 5.
  - The migration chain (lines 362, 1052, 1150). Keep `schemaVersion` and refuse files from newer versions.
  - Firefox in end-to-end tests (lines 681, 1234).
  - The 5,000-path option (line 252).
  - The after-tax stock-share readout (lines 148, 259, 959), which the design added and the author didn't ask for.

### 10. A failure on one path discards the whole run and keeps no diagnostic - Severity: Nit
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Lines 385, 975, 1030; `IntegrityError.tsx`
* **Discrepancy Description:** An `EngineIntegrityError` in one year of one path ends the run with only an error message. Nothing is kept that would let someone reproduce the failure.
* **Rationale & Recommendation:** Keep refusing to show results. Also offer a user-started "export diagnostic" action. It would save the inputs, seed, path index, variant, year, the failed check, and the year's state before and after, through the same flow as a normal export, so the case can become a regression fixture. The file contains financial inputs, so label it clearly.

### 11. The unit-conversion API assumes fixed inflation - Severity: Nit
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Lines 204, 208, 251, 482-486 (Alt N), 589, 888
* **Discrepancy Description:** `toFuture(amount, yearIndex)` assumes a single global inflation series. Adding "Random inflation" later (line 589) would mean changing every caller. The design is also exposed to inflation risk through non-indexed DB pensions and fixed Ontario thresholds.
* **Rationale & Recommendation:** Pass an inflation series in: `toFuture(amount, deflator, yearIndex)`. Optionally add one high-inflation stress path using the existing stress-path code. The headline chance of success can stay on fixed inflation.

### 12. The second AI-built reference plan is the main test oracle - Severity: Nit
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Lines 460 (Alt J), 1148, 1178-1186
* **Discrepancy Description:** The design accepts that a rule both AI sessions misunderstand can slip through. The only alternative it considers is a hand-built spreadsheet.
* **Rationale & Recommendation:** Add property tests that check relationships the results must satisfy, so no outside answers are needed:
  - Swapping the spouses gives the same household totals.
  - With zero tax and zero volatility in a test config, the loop matches the closed-form annuity.
  - Moving money between two accounts of the same type and owner changes nothing.
  - The split chosen by `bestSplit` never gives more household tax than the 0% split.

  Keep test-only configs out of the validated config.

### 13. Results may differ slightly between browsers - Severity: Nit
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Lines 61 (G4), 675
* **Discrepancy Description:** G4 promises the same results for the same inputs. But `Math.exp`, `Math.log` and `Math.sqrt` can differ in the last bit between Chromium and Firefox, and the determinism test runs only under Node. A plan exported from one browser and imported into another could show a slightly different chance of success.
* **Rationale & Recommendation:** Either narrow G4 to the same browser, or ship deterministic exp and log functions (for example a port of fdlibm) for the random-number generator.

### 14. Engine settings sit in a config that requires a source for every value - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 213, 856-858, 880
* **Discrepancy Description:** The schema requires a source URL, page location and validation status for every entry. Solver tolerance, the step limit, the split-search step and the path-count choices have no outside source.
* **Rationale & Recommendation:** Either relax the schema for `planning.json` or make these values engine constants. Otherwise `config:check` forces made-up sources.

### 15. A custom "no numeric literals" lint rule duplicates a built-in rule - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Line 687
* **Discrepancy Description:** The design plans a custom lint rule for the same job as an existing rule.
* **Rationale & Recommendation:** Use `@typescript-eslint/no-magic-numbers` with an ignore list instead of writing and maintaining a custom rule.

### 16. A hand-written random-number generator where a library exists - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 250, 948
* **Discrepancy Description:** `prng.ts` reimplements seeded generators that `pure-rand` already provides and tests. `pure-rand` is already present as a dependency of fast-check.
* **Rationale & Recommendation:** Use `pure-rand` and remove `prng.ts` and its tests. It would become a runtime dependency.

### 17. Fixture checksums add little over reviewing changes in git - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 597, 1155-1158, 1219
* **Discrepancy Description:** An agent that can edit a fixture can also edit `CHECKSUMS.sha256`. The real protection is the author reviewing the change, which git already shows.
* **Rationale & Recommendation:** Remove `verifyFixtures.ts`, or replace it with a CODEOWNERS rule or a pre-commit hook on `tests/fixtures/**`.

### 18. Quarterly OAS updates are more often than needed - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Line 787
* **Discrepancy Description:** The engine uses one value per tax year with inflation indexing. Quarterly updates add work without meaningfully changing a 30-to-40-year projection.
* **Rationale & Recommendation:** Update annually.

### 19. Code-level details in the architecture - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 296, 1054, 1122-1125
* **Discrepancy Description:** The 1-second debounce, cursor-preserving comma formatting and the "60 steps" cap are code-level details placed in the architecture.
* **Rationale & Recommendation:** Move them to the code or the implementation notes.

### 20. The file list is out of date relative to the repository - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 617, 622, 724, 756-759, 1223-1226
* **Discrepancy Description:**
  - `.gitignore` and `LICENSE` already exist but are listed as "Create".
  - `private/retirement-planner-context.md` has already been moved.
  - This design file is itself listed as "Create".
  - `design_draft.md` is referenced at lines 759 and 1223-1226 but doesn't exist in the repository.
* **Rationale & Recommendation:** Mark these entries as Modify or Done, or remove them.
