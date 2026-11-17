# Goldfish Review Report: Stage 9 (Implementation Readiness Test), Round 1

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md` (lines 595-1237, "## Detailed Implementation Plan")
**Mode:** REVIEW
**GoldfishContext:** none. This is a greenfield project with no source code yet.

## Reviewer Status

| Reviewer | Status | Standard |
| --- | --- | --- |
| `egm-implementation-readiness` | completed | implementation-readiness-standard.md |
| `egm-codebase-details` | completed | implementation-readiness-standard.md |
| `egm-style` | completed | none (persona defaults) |

Note: two reviewers said the persona files use underscores (`agents/implementation_readiness.md`, `agents/codebase_details.md`), and they read those files.

## Summary

- Verdicts: `egm-implementation-readiness` says the plan **fails** the standard. `egm-codebase-details` says it is **not ready**. `egm-style` found no Blockers.
- After merging duplicates there are **41 findings: 4 Blocker, 25 Major, 12 Nit.** The three reviewers raised 74 findings in total.
- A merged finding takes the highest severity any source gave it. Source ids use the form `<reviewer>-r1-<n>`, where `<n>` is the item's position in that reviewer's report.
- The reviewers agree on the main gaps. The data model is undefined: the config key tree and value shapes, and the `PlanInputs`, `YearRow` and CSV fields. Some mechanisms cannot work as written: cancellation through a shared flag, the async `inputHash` used in a synchronous selector, the CSP meta tag under `npm run dev`, and CI at stage 0. The file list does not match the repository.

---

## Blockers

### F1. The config data model is undefined, and so is how config gets loaded - Severity: Blocker
* **Source ids:** implementation-readiness-r1-1, codebase-details-r1-10, codebase-details-r1-11, codebase-details-r1-12, style-r1-6
* **Lines:** 669, 787, 802-883 (especially 806-834, 876-883, 880)
* **Problem:**
  * The plan names the topic each config file covers, but gives no keys, nesting or value shapes.
  * The entry schema's `unit` union ends in "…", and "plus schemas for each file" is never written.
  * Table-shaped values do not fit a scalar `{ value, unit }` entry. These include the tax brackets, the RRIF factor table, the LIF min/max tables, the Health Premium schedule, the correlation matrix, the stress paths, the presets and the shapes.
  * Some values are missing entirely:
    * OAS residence years, maximum deferral and the 75+ increase;
    * CPP earliest and latest start ages;
    * LIF conversion age limits;
    * the split of the dividend gross-up and credit between federal and Ontario;
    * the progress interval;
    * the fixed-return path definition.
  * Quarterly OAS values do not fit a file that holds one value per year.
  * Config must be loaded in three places: the Worker, the Vitest (Node) tests, and plain-Node tools. Line 669 says only "at build time".
  * `configStatus().outOfDate` takes no arguments, so it has nothing to compare against. Nothing says which tax year loads at startup.
* **Why it matters:**
  * Line 687 bans numeric literals in the engine, so every value has to come from config.
  * The two independent fetch sessions and `config:compare` only agree if they share key names.
  * Without a defined key tree, the implementer has to design the contract that every other part depends on.
* **Recommendation:**
  * Give the full key tree and value shapes for all five config files, and close the `unit` enum.
  * Choose a loading mechanism for each runtime: static JSON import, `import.meta.glob`, or a generated module.
  * Define `outOfDate` and the rule for picking the tax year.

### F2. Design values are left to config files, but nobody is told to supply them - Severity: Blocker
* **Source ids:** implementation-readiness-r1-2, style-r1-7, style-r1-12
* **Lines:** 836-872 (especially 844 and 846)
* **Problem:** Several values are design choices, not sourced rule values, and no numbers are given for them:
  * the 2-3 placement presets;
  * the stock shares for the three growth-to-safety shapes;
  * the 2-3 stress paths: no count, no names, and no rule for what happens when a plan runs longer than a sequence;
  * the return-override margin, which also has no unit;
  * the Canadian/global stock ratio;
  * the warning trigger levels ("near", "large", "tax jumps", "share of paths");
  * the paths and step sizes the nudges change;
  * the window, scope and unit for each of the 9 warnings.
* **Why it matters:** The implementer would have to invent every one of these values.
* **Recommendation:** Give the values in the plan, or name the artifact the author supplies and the stage that needs it.

### F3. `PlanInputs`, `YearRow` and the reference-plan CSV have no field-level schema - Severity: Blocker
* **Source ids:** implementation-readiness-r1-3, codebase-details-r1-16, codebase-details-r1-19
* **Lines:** 872, 894-909, 1039, 1145-1153, 1188-1191
* **Problem:**
  * `PlanInputs` becomes persisted schema v1, frozen by `saved-plans/v1.json`, yet its field names, types and units are not given.
  * Several inputs are missing or loosely defined:
    * the LIF 50% unlock choice is missing;
    * per-account holdings and asset class are missing;
    * the DB pension fields (lifetime amount, bridge and end age, indexing, survivor %) appear only as "DB pensions".
  * Open questions about the inputs:
    * Are amounts in today's dollars or future dollars?
    * Whose age do the spending phases use, and what happens with gaps or overlaps?
    * What is the seed type?
    * What are the validation ranges?
  * `YearRow` is described only as "every per-year value". The independent session must still produce `expected-rows.csv` matching "every row and column".
  * The path format shared by `setInput` and the warnings' "related input paths" is not defined.
* **Why it matters:**
  * The reference-plan test cannot be written independently without a column list.
  * Persisted field names are permanent once v1 is frozen.
* **Recommendation:** Give the exact TypeScript definitions of `PlanInputs`, `YearRow` and `PathSummary`, the CSV header, and the input-path format.

### F4. Cancelling through a "shared flag" cannot work on GitHub Pages - Severity: Blocker
* **Source ids:** codebase-details-r1-1, implementation-readiness-r1-7, style-r1-8
* **Lines:** 989, 993, 1030 (and 369, 722)
* **Problem:**
  * A flag the main thread can flip while the Worker runs a synchronous loop needs `SharedArrayBuffer`.
  * `SharedArrayBuffer` needs cross-origin isolation, which needs COOP/COEP response headers. GitHub Pages cannot set headers, and a `<meta>` tag cannot set them either.
  * A `postMessage` cancel is not handled until `simulate()` returns, so `isCancelled` never becomes true.
* **Recommendation:**
  * Choose one mechanism: `worker.terminate()` followed by a new Worker, or chunked execution that yields to the event loop.
  * Update the `isCancelled` parameter and the wording on line 1030 to match.

---

## Majors

### F5. The file list does not match the repository - Severity: Major
* **Source ids:** implementation-readiness-r1-4, codebase-details-r1-2, style-r1-2
* **Lines:** 617-625, 724-727, 756-759, 1221-1226
* **Problem:**
  * `.gitignore` and `LICENSE` (MIT) already exist but are marked Create.
  * `private/retirement-planner-context.md` has already been moved.
  * `docs/designs/retirement-planner.md` already exists (it is this file), yet it is marked "Create, copied from `design_draft.md`".
  * `design_draft.md` does not exist, but item 63 says to keep it.
  * `.gitattributes` is not listed.
  * The review reports at the root (`zoom_out_report.md`, `critic_report.md`, `comprehension_report.md`, `intermediate_zoom_out_report.md`, `concepts_brief.md`) have no Keep, Ignore or Delete entry.
* **Recommendation:**
  * Mark the existing files Keep or Done, and remove every reference to `design_draft.md`.
  * List `.gitattributes`, and say what happens to each report file.

### F6. The rules for protected fixtures and checksums contradict each other - Severity: Major
* **Source ids:** codebase-details-r1-15, style-r1-1, implementation-readiness-r1-21
* **Lines:** 597, 734, 1136-1158, 1210-1219, 1236
* **Problem:**
  * Agents may "never change" fixtures or `CHECKSUMS.sha256`.
  * Yet fixtures are added in later stages, and each new fixture needs a checksum line.
  * Line 1236 says "the author or an agent" writes `paid-tool-comparison.md`, a file the checksums cover.
  * The format of the hash file is not stated.
* **Recommendation:**
  * State one rule. For example: only the author changes fixtures and checksums, in a separate commit when a stage is accepted, and an agent may only draft the record.
  * Give the hash file format.

### F7. CI cannot pass at stage 0 or through the early stages - Severity: Major
* **Source ids:** codebase-details-r1-3, implementation-readiness-r1-6, implementation-readiness-r1-26
* **Lines:** 597, 603, 690-717, 1069, 1193-1198
* **Problem:** Stage 0 CI runs `test`, `bench`, `build` and `test:e2e`, but:
  * Vitest and Playwright exit non-zero when they find no tests;
  * `baseline.json` is not created until stage 4;
  * the sample plan the bench uses is a stage 7 file;
  * the bench runs tips, which arrive in stage 6;
  * `index.html` points at `src/main.tsx`, which is a stage 5 file, so `vite build` fails;
  * coverage thresholds apply from day one.
* **Recommendation:**
  * Say which CI steps are on at each stage, or use pass-with-no-tests flags.
  * Add a placeholder `main.tsx` in stage 0.
  * Give the bench a fixture that exists in stage 4.

### F8. The CSP meta tag breaks `npm run dev`, and it does not cover the Worker - Severity: Major
* **Source ids:** codebase-details-r1-4, implementation-readiness-r1-8
* **Lines:** 369, 548, 646, 690-699
* **Problem:**
  * In dev, the React Refresh inline script, the injected `<style>` tags and the HMR WebSocket are all blocked by `script-src 'self'`, `style-src 'self'` and `connect-src 'none'`.
  * A Worker takes its CSP from its own response headers, not from the page's meta tag. So the claim that the tag "blocks all network connections" does not hold for the engine Worker.
* **Recommendation:**
  * Inject the tag only at build time, for example with a `transformIndexHtml` plugin using `apply: 'build'`.
  * Correct the claim, or state that the Worker gap is accepted.

### F9. `inputHash` uses async Web Crypto but is called in a synchronous selector - Severity: Major
* **Source ids:** codebase-details-r1-5, implementation-readiness-r1-9, style-r1-17
* **Lines:** 1022-1023, 1040
* **Problem:**
  * `crypto.subtle.digest` returns a Promise, yet `isStale = result?.inputHash !== inputHash(inputs)` treats the result as synchronous.
  * `runPlan` is typed as returning `Result` synchronously.
  * "A small JS implementation in Node tests" means two hash implementations that could disagree, and Node 20+ already has Web Crypto.
* **Recommendation:**
  * Choose one named synchronous hash and use it everywhere.
  * Or, if the hash stays async, keep it in state and update it from a subscriber. Then make the signatures consistent.

### F10. `index.ts` exports less than the UI and store need - Severity: Major
* **Source ids:** codebase-details-r1-17, implementation-readiness-r1-9
* **Lines:** 1018-1023, 1040, 1084, 1110-1116
* **Problem:** `index.ts` is said to export "only" three functions. The UI and store also need:
  * `toToday`;
  * `inputHash`;
  * the `PlanInputs` and `Result` types;
  * the config defaults shown next to overrides.
* **Recommendation:** List the full public export surface.

### F11. Dependency versions, lockfile, Node version and tool runner are not given - Severity: Major
* **Source ids:** codebase-details-r1-6, implementation-readiness-r1-5
* **Lines:** 627-654, 703-717, 1022
* **Problem:**
  * The plan says "exact versions are pinned", but gives none except React 18. API changes across major versions matter for Zustand, Zod, ESLint 9, Vite, Vitest and Recharts.
  * These packages are not named:
    * the coverage provider;
    * the ESLint plugins;
    * the `tools/*.ts` runner (tsx or something else);
    * the `@types/*` packages;
    * the SHA-256 implementation.
  * These files and settings are not listed:
    * `package-lock.json` (which `npm ci` requires);
    * `.nvmrc` or `engines`;
    * the setup-node version;
    * `src/vite-env.d.ts`.
* **Why it matters:** The implementer would have to add dependencies on their own initiative, which the standard does not allow.
* **Recommendation:** Add a version table, the lockfile, a Node version file, and the missing devDependencies.

### F12. Script commands and the bench regression check have no mechanism - Severity: Major
* **Source ids:** codebase-details-r1-7, implementation-readiness-r1-6
* **Lines:** 652-654, 713, 1155-1166, 1196
* **Problem:**
  * `config:check`, `config:compare` and `fixtures:verify` run `.ts` files without a runner.
  * `vitest bench` does not fail on a 25% regression against a baseline. Its `--compare` only reports.
  * Nothing says who records `baseline.json`, or on which machine. A baseline recorded on a laptop and compared on shared CI runners is meaningless.
* **Recommendation:**
  * Give the exact command for each script.
  * Describe the compare-and-fail script.
  * Define how the baseline is recorded and updated.

### F13. Vite and Vitest will not resolve the `@engine/*` alias, and the tsconfig is incomplete - Severity: Major
* **Source ids:** codebase-details-r1-8
* **Lines:** 659-669
* **Problem:**
  * Vite does not read tsconfig `paths`. The plan does not mention `resolve.alias` or `vite-tsconfig-paths`.
  * The tsconfig does not state:
    * its `lib` setting, where the DOM and WebWorker typings conflict;
    * its `include` list;
    * whether it uses the split app/node layout.
* **Recommendation:** Specify the alias configuration and the full tsconfig, including how the Worker gets its typings.

### F14. Vitest will pick up the Playwright specs, and "other source 70%" names no metric - Severity: Major
* **Source ids:** codebase-details-r1-9, style-r1-18
* **Lines:** 671-676, 1198, 1233
* **Problem:**
  * Vitest's default include matches `tests/e2e/*.spec.ts`.
  * The coverage target for non-engine source does not say whether it means branches or lines.
* **Recommendation:** Give the exact include and exclude globs for tests, bench and coverage, and name the coverage metric.

### F15. The no-numeric-literals lint rule is not named and has no list of exceptions - Severity: Major
* **Source ids:** codebase-details-r1-13, implementation-readiness-r1-16, style-r1-21
* **Lines:** 687-688, 949, 993, 1232
* **Problem:**
  * The engine needs non-rule literals:
    * the xoshiro constants;
    * Box-Muller's 2 and π;
    * the bisection midpoint;
    * the SHA-256 constants;
    * the progress interval of 50.
  * The rule's implementation is not named (built-in `no-magic-numbers` or a custom rule), and neither is the engine-boundary rule.
  * The "−1" on line 687 uses a Unicode minus sign, so it cannot be copied into the rule as written.
* **Recommendation:**
  * Name both rules.
  * List the exceptions file by file.
  * Use ASCII `-1`.

### F16. Market generator parameters that change results are left open - Severity: Major
* **Source ids:** codebase-details-r1-14, implementation-readiness-r1-13
* **Lines:** 248, 944-950
* **Problem:** The plan does not say:
  * whether expected returns are arithmetic or geometric, or how they map to lognormal μ and σ;
  * which normal sampler is used;
  * how a seed initializes the xoshiro state, or the seed's type;
  * the `Float64Array` layout;
  * how the fee is applied;
  * how a negative return splits into interest, dividends and gains.
* **Why it matters:** Repeatable results (G4) and the tax on every non-registered row depend on these choices.
* **Recommendation:** Specify each one.

### F17. The reference plan's $1 tolerance cannot be met as specified - Severity: Major
* **Source ids:** implementation-readiness-r1-17, codebase-details-r1-16
* **Lines:** 296, 1148, 1191
* **Problem:**
  * Each side's bisection stops within $1, and the error compounds over 30-40 years. Two correct implementations can therefore differ by more than $1.
  * The plan does not say who runs the separate session, or when.
* **Recommendation:** Set an exact convergence target (for example, the lowest W rounded to the cent), or a tolerance that grows over the years.

### F18. `toFuture` and `toToday` take no inflation input - Severity: Major
* **Source ids:** codebase-details-r1-18
* **Lines:** 883-888
* **Problem:**
  * Both take only `(amount, yearIndex)`, while `indexValue` takes config.
  * The arithmetic helpers are not named.
* **Recommendation:** Define where the inflation rate comes from: a factory, a closure, or a parameter.

### F19. Engine function signatures lack inputs they need - Severity: Major
* **Source ids:** implementation-readiness-r1-10, codebase-details-r1-22, style-r1-19
* **Lines:** 915-933
* **Problem:**
  * `personalTax` and `provincialTax` take no `yearIndex` or inflation, so they cannot index brackets.
  * `TaxableIncome` has no separate OAS amount, which the recovery tax needs.
  * The federal module has no signature.
  * "Pension-eligible income" is one bucket, with no rule for what fills it.
  * `dbPayment` cannot do full indexing without an inflation input.
  * The plan does not say whether `federal.ts` implements `Jurisdiction`.
  * `probate` and `unlockRule` have no types.
* **Recommendation:** Give complete, typed signatures.

### F20. Benefit formulas are not specified - Severity: Major
* **Source ids:** implementation-readiness-r1-15, codebase-details-r1-22
* **Lines:** 926-933, 733
* **Problem:** The plan does not define how these are computed:
  * the CPP survivor benefit (under or over 65, flat-rate portion, combined cap);
  * OAS residence proration and the deferral factor;
  * the tax treatment of the death benefit, and who receives it.
* **Why it matters:** Line 733 forbids agents to supply rules from memory, so the implementer has neither the formula nor permission to write one.
* **Recommendation:** Specify the formulas, or point to sourced config entries that define them.

### F21. Withdrawal rules are ambiguous - Severity: Major
* **Source ids:** implementation-readiness-r1-11
* **Lines:** 265, 961-975
* **Problem:**
  * Is the bracket fill part of W, or a required withdrawal on top of it?
  * Between the spouses, the plan does not say:
    * which spouse's non-registered account is drawn first, or whether draws are pro rata;
    * how TFSA draws are ordered.
  * Which positions are sold?
  * Do realized gains enter the same year's tax inside the bisection?
  * How does `targetHoldings` choose when two asset classes compete for the same account?
* **Recommendation:** Define each rule.

### F22. Working years are not specified - Severity: Major
* **Source ids:** implementation-readiness-r1-12
* **Lines:** 312, 975
* **Problem:**
  * No file implements the pre-retirement branch.
  * The plan does not say when household spending starts if one spouse retires earlier.
  * Contribution units and indexing are not given.
  * It is not said whether RRSP deductions are modelled, or how TFSA room and marginal rates apply.
  * `solveYear` covers only the retirement steps.
* **Recommendation:** Add the module and its rules to the plan.

### F23. Result metrics are undefined, and percentile labels are inconsistent - Severity: Major
* **Source ids:** implementation-readiness-r1-14, style-r1-14
* **Lines:** 959, 995-1001, 1013-1016, 1088, 1100
* **Problem:**
  * "Lifetime tax" does not say whether it is nominal or in today's dollars, or whether it includes the clawback and probate.
  * "After-tax money left" is not defined.
  * The average withdrawal tax rate has no defined calculation.
  * The metric that tips rank by is not defined.
  * The percentile method is not given.
  * The comparison is undefined when the user's choice is already the baseline.
  * The screen text says "typical/bad", while the engine section says "50th/10th percentile".
* **Recommendation:** Define each metric, and map "typical" and "bad" to percentiles once.

### F24. The test plan leaves modules untested, and its assertions are vague - Severity: Major
* **Source ids:** implementation-readiness-r1-18, style-r1-3, style-r1-15
* **Lines:** 1139, 1167-1209
* **Problem:**
  * No test cases are given for these modules:
    * the market generator;
    * glide and placement;
    * the order each strategy withdraws in;
    * `placeSurplus`;
    * aggregation and percentiles;
    * `compare` and its opposite-sign flag;
    * representative-path selection;
    * warnings and tips;
    * `changeSummary`;
    * `inputHash`;
    * the unit conversions;
    * `configCompare`.
  * The e2e assertions are vague ("results appear", "shows both numbers").
  * The config-notice e2e test has no way to inject a test config into a built bundle.
  * The tax fixtures do not name the outside calculator, the fixture format, or who produces them.
  * "One per CUJ" is wrong: there are 7 tests and 6 CUJs, CUJ 6 has no test, and two of the tests are not CUJs.
* **Recommendation:**
  * Add a test case list for each module.
  * Make the e2e assertions concrete.
  * Choose a config-injection method.
  * Correct the CUJ mapping.

### F25. Autosave snapshots have no way to restore them - Severity: Major
* **Source ids:** implementation-readiness-r1-19, codebase-details-r1-24
* **Lines:** 1053-1057
* **Problem:**
  * Ten rolling snapshots are kept, but no action restores one.
  * The storage keys, rotation format, startup-load rule and export filename are not specified.
* **Recommendation:** Specify all of these.

### F26. `deploy.yml` is underspecified - Severity: Major
* **Source ids:** codebase-details-r1-20, implementation-readiness-r1-20
* **Lines:** 666, 681, 719-722
* **Problem:**
  * "After CI passes" has no mechanism: neither `workflow_run` with a success check nor `needs:`.
  * The Pages actions, permissions, environment and repository setting are not named.
  * The repository name that sets `base` is not given.
  * Playwright's `baseURL` and `webServer` must use that base.
* **Recommendation:** Specify the trigger, the actions, the permissions and the repository name.

### F27. `ci.yml` is missing setup steps - Severity: Major
* **Source ids:** codebase-details-r1-21
* **Lines:** 703-717
* **Problem:** `actions/setup-node` (with a version) and `npx playwright install --with-deps chromium firefox` are missing, so the e2e step fails.
* **Recommendation:** Add both steps.

### F28. "A mid-range laptop" cannot be measured - Severity: Major
* **Source ids:** style-r1-4
* **Lines:** 1235 (also 77, 374, 557)
* **Problem:** The manual performance check can neither pass nor fail.
* **Recommendation:** Name the reference machine (CPU, cores, RAM, browser).

### F29. The stage 8 pass criteria are subjective - Severity: Major
* **Source ids:** style-r1-5
* **Lines:** 1237
* **Problem:** The plan does not define "without help" or what counts as describing a cross-tab effect, and it does not say who judges.
* **Recommendation:** Name the judge and give concrete pass conditions.

---

## Nits

### F30. Line 1210: item "62a" breaks the numbering - Severity: Nit
* **Source ids:** style-r1-20, codebase-details-r1-26, implementation-readiness-r1-21
* **Recommendation:** Renumber.

### F31. The glossary and explanation text is open-ended - Severity: Nit
* **Source ids:** style-r1-16, implementation-readiness-r1-24
* **Lines:** 1127-1132
* **Problem:** "And so on" leaves the term list open. Apart from the conditional-wording rule, the content is left to the implementer.
* **Recommendation:** Give the minimum term list, or mark the content as supplied by the author.

### F32. `setInput` path type, seed source and default inputs are unspecified - Severity: Nit
* **Source ids:** implementation-readiness-r1-22
* **Lines:** 1039
* **Recommendation:** Specify the path type, where the initial seed comes from, and the default inputs for an empty plan.

### F33. The disclaimer text depends on O20 and has no placeholder - Severity: Nit
* **Source ids:** implementation-readiness-r1-23
* **Lines:** 1059, 1077
* **Recommendation:** Give placeholder text and say where it lives.

### F34. "Engine (stages 1-4, 6)" does not map files to stages - Severity: Nit
* **Source ids:** implementation-readiness-r1-25
* **Lines:** 874
* **Problem:** For example, it is unclear which stage builds `split.ts` and `hash.ts`.
* **Recommendation:** Give the stage for each engine file.

### F35. Prettier is installed but never checked - Severity: Nit
* **Source ids:** codebase-details-r1-23
* **Lines:** 683
* **Recommendation:** Add a format check to CI and the Verification Plan, or drop Prettier.

### F36. "No screen work starts before stage 2 is green" is redundant - Severity: Nit
* **Source ids:** codebase-details-r1-25
* **Lines:** 597, 601
* **Problem:** Screens are stage 5 work, so the sentence adds nothing.
* **Recommendation:** Drop it, or change it to stage 4.

### F37. Unit test file names are not given - Severity: Nit
* **Source ids:** codebase-details-r1-27
* **Lines:** 1168
* **Problem:** Without names, the write allowlist cannot be enforced.
* **Recommendation:** List the file names under `tests/unit/`.

### F38. The licence wording is vague - Severity: Nit
* **Source ids:** style-r1-9
* **Lines:** 727
* **Recommendation:** "MIT unless the author chooses another before the first public commit."

### F39. "Before finishing ... before declaring work done" repeats itself - Severity: Nit
* **Source ids:** style-r1-10
* **Lines:** 740
* **Recommendation:** Drop the trailing clause.

### F40. The "rewrite whole functions" rule is stated twice - Severity: Nit
* **Source ids:** style-r1-11
* **Lines:** 597, 735
* **Recommendation:** Keep it in one place and refer to it from the other.

### F41. "With the square-root scale source" is opaque - Severity: Nit
* **Source ids:** style-r1-13
* **Lines:** 853
* **Recommendation:** Write it out, for example "source: the square-root household equivalence scale".
