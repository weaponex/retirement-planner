# Goldfish Review Report: Stage 7 Critic Review, Round 1

**Target:** `E:/Documents/Projects/RetirementPlanner/docs/designs/retirement-planner.md` (lines 1-594, the feature specification before "## Detailed Implementation Plan")
**Mode:** REVIEW
**GoldfishContext:** none

## Reviewer Status

| Reviewer | Status | Standard | Raw findings |
| --- | --- | --- | --- |
| `egm-design` | completed | feature-spec-standard.md | 1 Blocker, 19 Major, 8 Nit |
| `egm-structural` | completed | feature-spec-standard.md | 1 Blocker, 4 Major, 9 Nit |
| `egm-style` | completed | none (persona defaults) | 0 Blocker, 10 Major, 17 Nit |

The three reviewers sent 69 raw findings. After removing duplicates, 54 remain: **1 Blocker, 25 Major, 28 Nit**.

How to read this report:
- Each finding lists every source id it came from, in the form `<reviewer>-r1-<n>`.
- Raw ids are numbered in the order each reviewer reported them. egm-design: B1 = 1, M1-M19 = 2-20, N1-N8 = 21-28. egm-structural: 1-14 as reported. egm-style: M1-M10 = 1-10, N1-N17 = 11-27.
- When merged findings had different severities, the merged finding takes the highest one. This affects design-r1-22, design-r1-25, structural-r1-12 and style-r1-17, which were each raised as a Nit.
- Line numbers are the ones the reviewers gave. The synthesizer did not check them again.

---

## Blockers

### 1. No Risks & Mitigations section
- **Severity:** Blocker
- **Source ids:** egm-design-r1-1, egm-structural-r1-1
- **Lines:** whole range. There is no section between 396 and 544. Scattered risk material appears at 98, 205, 361, 369, 374, 460 and 486.
- **Problem:** The feature-spec standard requires the spec to name its own failure modes, security implications, scalability limits and how each will be mitigated. No section does this.
  - Some risks appear only in passing:
    - the CSP meta tag is weaker than a header;
    - a rule that both AI sessions misread could slip through;
    - the chance of success does not reflect inflation risk;
    - the first-year benefit overstatement;
    - storage-full failures;
    - the unknown volatility source (O22).
  - Other risks appear nowhere. These include supply-chain exfiltration, the shared github.io origin, browser storage eviction, rollback stranding saved plans, a public deploy before the FSRA review, longevity risk, invalid config values, memory use at 5,000 paths and the performance budget. Many of these are expanded in the Major findings below.
- **Recommendation:** Add a "## Risks & Mitigations" section. For each risk, give its failure mode, impact and mitigation, or mark it as an accepted limitation. Link to the places that already mention it.

---

## Major

### 2. The solver design cannot meet the 5-second performance target
- **Source ids:** egm-design-r1-2, egm-style-r1-8
- **Lines:** 288-296, 374, 534
- **Problem:** The pension-split search runs inside every bisection step, and bisection allows up to 60 steps. Line 534 says the solve needs "about 11 tax calculations per year per path", but that figure ignores the nesting.
  - The realistic count is hundreds of tax evaluations per year per path per variant.
  - Over a full run that is roughly 80-150 million evaluations, before stress paths and nudges.
  - That is well beyond 5 seconds. The 5,000-path option makes it five times worse.
  - Line 374 offers only "reduce work in the solver" as the fallback, and parallelism is not considered.
- **Recommendation:** Correct the estimate and add a rough performance budget. Add alternatives for the solve:
  - choose the split once at the solved withdrawal, then re-solve;
  - invert the tax function analytically;
  - spread paths across several workers;
  - precompute bracket tables.

### 3. The performance target cannot be measured, and the CI gate does not check it
- **Source ids:** egm-style-r1-4, egm-style-r1-5, egm-design-r1-2 (CI part)
- **Lines:** 77, 374, 557
- **Problem:**
  - "Mid-range laptop" names no CPU or browser.
  - Line 374 says a benchmark test measures the 5-second target. But CI (line 557) only fails when speed drops more than 25% against a baseline. Shared runners vary by about that much, and the spec does not say where the baseline is stored.
  - Line 77 defers the number to the Technical Plan instead of stating it.
- **Recommendation:**
  - Define a reference machine and browser, and say how and where the 5-second target is checked.
  - Make CI a regression guard only. Use operation counts or the median of several runs.
  - State "5 s" at line 77.

### 4. The rebalancing rule distorts the placement comparison
- **Source ids:** egm-design-r1-3
- **Lines:** 258, 286-287, 301-302, 309
- **Problem:** Each non-registered account is rebalanced to target every year. This realizes gains that real investors avoid, so part of the placement benefit G5 measures may come from the rebalancing rule.
  - The spec does not say how carried-over gains are handled in the first-death year or the second-death year.
  - Line 287 lists realized gains under "Required withdrawals", which is the wrong category.
- **Recommendation:** Rebalance inside registered accounts first, and use cash flows before selling in non-registered accounts. Consider tolerance bands. Define how gains are handled in both death years.

### 5. Foreign withholding tax is left out, but the preset puts global stocks in the TFSA first
- **Source ids:** egm-design-r1-4
- **Lines:** 232, 257
- **Problem:** About 15% of US dividends held in a TFSA is lost to withholding tax and cannot be recovered. Because the engine treats this as free, it would teach a placement lesson that points the wrong way.
- **Recommendation:** Model withholding as a drag that varies by account type, set in the config. Otherwise, change the preset and state the limitation on screen.

### 6. The income split is undefined when an asset's return is negative
- **Source ids:** egm-design-r1-5
- **Lines:** 241, 248, 286, 381
- **Problem:** Applying the income-type fractions to a negative random return produces negative dividends and interest. This breaks taxable income and may break the "no negative original cost" invariant.
- **Recommendation:** Set a fixed yield on the start-of-year balance, and make price return equal total return minus that yield.

### 7. The lognormal return model is underspecified, and O22 blocks the core feature
- **Source ids:** egm-design-r1-6
- **Lines:** 98, 248, 250
- **Problem:**
  - The spec does not say whether the config holds arithmetic or compound means. Mixing them up shifts stock returns by about 1-1.5% a year.
  - A lognormal model has thin tails, so it understates crash risk.
  - O22, the source for volatility and correlation, has no answer, and the return generator cannot be built without it.
- **Recommendation:**
  - State the convention and how it converts to model parameters.
  - Test that the simulated compound return matches the config.
  - Record thin tails as an accepted risk.
  - Make O22 a gate before the generator is built.

### 8. Warning tips are computed on a different path from the warning
- **Source ids:** egm-design-r1-7
- **Lines:** 151, 335, 356
- **Problem:** A warning fires on the representative path or on a share of all paths. Its tips nudge inputs on a fixed-return path. If the warning does not occur on that path, every nudge shows no effect, or the tips are ranked by an effect unrelated to the warning shown.
- **Recommendation:** Define what happens when the warning does not occur on the tip path, or nudge on the same path or seeded subset that fired the warning.

### 9. Fixed life-expectancy targets limit what "chance of success" means
- **Source ids:** egm-design-r1-8
- **Lines:** 60, 90, 212, 322
- **Problem:** If the default targets are median life expectancy, about half of users outlive the plan.
- **Recommendation:**
  - State which survival percentile the defaults represent.
  - Label success as "assuming deaths at the target ages".
  - Add longevity to the risk list.

### 10. A couple where one spouse is retired and the other works cannot be modelled
- **Source ids:** egm-design-r1-9
- **Lines:** 256, 312
- **Problem:** The yearly loop treats retirement as one household-wide switch, and employment income is not modelled. The spec does not say how spending and withdrawals work while only one spouse is retired. This interacts with O16.
- **Recommendation:** Define mixed years, or state "both spouses retire in the same year" as a version 1 limitation. Make O16 a gate.

### 11. The security policy (CSP) claim is overstated, and there are no supply-chain controls
- **Source ids:** egm-design-r1-10, egm-style-r1-9
- **Lines:** 369-370, 546-549 (also 214)
- **Problem:**
  - `connect-src 'none'` blocks fetch, XHR and WebSocket requests. It does not block navigation. It does not block image loads or form posts unless other directives are set. The page cannot use `frame-ancestors` from a meta tag. So "blocks all network connections" and "nothing leaves the browser" overstate it.
  - The realistic threat is a compromised npm dependency, and the spec has no lockfile, pinning or audit policy.
  - The policy would also block any runtime fetch of the config files.
- **Recommendation:**
  - List the exact directives, with `default-src 'none'`, `form-action 'none'` and `base-uri 'none'`.
  - Reword the claim to say what is actually blocked.
  - Add supply-chain controls.
  - State that the config is bundled into the app, not fetched.

### 12. The shared github.io origin exposes saved plans
- **Source ids:** egm-design-r1-11
- **Lines:** 360, 367
- **Problem:** All of an account's GitHub Pages project sites share one origin, and therefore one localStorage. Any other Pages project the author publishes can read the household's financial data.
- **Recommendation:** Use a custom domain or a dedicated origin, or record this as an accepted risk.

### 13. Browser storage is not durable, and export files are unencrypted
- **Source ids:** egm-design-r1-12, egm-style-r1-17
- **Lines:** 64, 360-362, 560
- **Problem:** G7 calls storage "durable", but browsers can clear it. Safari deletes script-written storage after 7 days without interaction, and `persist()` does not reliably prevent this. The real durability guarantee is the export file, which holds sensitive data in plain text.
- **Recommendation:**
  - Narrow the wording of G7.
  - Detect when persistence is denied and prompt the user to export.
  - Define the supported browsers.
  - Note that export files are unencrypted.

### 14. Rolling back the app strands plans that were already migrated
- **Source ids:** egm-design-r1-13
- **Lines:** 362, 370, 563-565
- **Problem:** After a rollback, the older app refuses autosaved plans already migrated to the newer schema. The pre-migration copy is kept only until the upgrade succeeds, so users lose access to those plans.
- **Recommendation:** Keep a snapshot in the original format, or require each schema to be readable by the previous app version for one release.

### 15. A public deploy contradicts the "FSRA check before release beyond family" gate
- **Source ids:** egm-design-r1-14
- **Lines:** 21, 97, 367, 572
- **Problem:** A public Pages site goes live with the first green build of `main`. Release beyond family therefore happens on day one, not later.
- **Recommendation:** Resolve O20 before the first deploy, or keep the site unlisted with noindex and say explicitly that the public URL counts as a release.

### 16. Runtime invariants have no tolerance
- **Source ids:** egm-design-r1-15
- **Lines:** 296, 378-385, 553
- **Problem:** Two invariants are checked every year of every path, and any failure blocks all results:
  - money is conserved;
  - after-tax cash equals the spending need.

  Bisection stops at $1, and floating-point rounding builds up over the years. Exact comparisons will therefore raise false "engine integrity" errors.
- **Recommendation:** Specify tolerances or use integer cents. Say what the user can do when a check fails.

### 17. Verification is less independent than the spec claims
- **Source ids:** egm-design-r1-16, egm-style-r1-3, egm-style-r1-10
- **Lines:** 52, 70, 386-391, 460
- **Problem:**
  - G10's "built independently" reference plan comes from another AI session, which can share the same misreadings. Alternative J admits this.
  - "Match outside tax calculators" gives no tolerance.
  - Alternative J cites "a rough comparison with a paid tool", but the Verification section does not include it.
- **Recommendation:**
  - State a tolerance, such as $1 per return.
  - Describe the reference plan accurately.
  - Add the paid-tool comparison and a few golden cases that can be checked by hand, such as CRA worked examples, to Verification.

### 18. The first-year benefit overstatement is far from "slight"
- **Source ids:** egm-design-r1-17, egm-style-r1-6
- **Lines:** 205
- **Problem:** CPP, OAS and DB pensions are paid for the whole year in which the start age is reached. That can overstate the first year by up to 11 months of payments, more than $20k for CPP plus OAS at 70. This can hide clawback or bridge-year problems, which warnings 3 and 7 are meant to catch.
- **Recommendation:** Collect birth month and pro-rate payments, including the OAS increase at 75. Otherwise, quantify the error and suppress the affected warnings in the start year.

### 19. Percentile ranking breaks down when many paths fail
- **Source ids:** egm-design-r1-18
- **Lines:** 323-324
- **Problem:** When the chance of success is at or below about 90%, many paths end with a $0 legacy. The 10th-percentile path is then picked arbitrarily from ties, and it shows nothing useful.
- **Recommendation:** Define a tie-break, such as the first shortfall year or the total shortfall. Report how large the shortfall is on failed paths.

### 20. The death logic leaves edge cases unhandled
- **Source ids:** egm-design-r1-19
- **Lines:** 207, 273-281, 303-308
- **Problem:**
  - Both spouses dying in the same year is not defined.
  - The final return names only RRIF/LIF. An RRSP or LIRA not yet converted at death must also count as income.
- **Recommendation:** Specify both cases.

### 21. Rejection rationales are attributed without links and lack concrete trade-offs
- **Source ids:** egm-design-r1-20, egm-structural-r1-2, egm-structural-r1-3, egm-structural-r1-12
- **Lines:** 402-540 (especially 466, 474, 480, 486, 492, 504, 516, 522), plus 195, 250, 360
- **Problem:** The standard's Alternatives Rule forbids attributing a rejection to a maintainer without a link, and requires concrete trade-offs.
  - Almost every rationale starts "Rejected by author" with no link.
  - Alternatives K and M give no reason at all.
  - L, N, O, Q, R, S, T and W only name what was chosen instead.
  - Several choices have no alternatives entry: localStorage vs. IndexedDB, Zustand, the PRNG/generator, and single vs. multiple workers.
- **Recommendation:**
  - Rewrite each rationale to name the trade-off that decided it.
  - Link each one to `concepts_brief.md` or a decision log.
  - Add the missing alternatives, at least localStorage vs. IndexedDB.

### 22. Open-question IDs cannot be traced
- **Source ids:** egm-structural-r1-4, egm-design-r1-25
- **Lines:** 94; IDs appear in headings at 145-153, 221, 238, 244, 246, 254, 261, 314, 320, 332, 363, 396
- **Problem:** Line 94 says O1-O21 were resolved in the Technical Plan. But O2, O6, O19 and O21 appear nowhere in the range, and the O-numbers are defined only in an external brief that the spec does not link.
- **Recommendation:** Add a table mapping each of O1-O23 to its resolution or status, and link the brief.

### 23. "Additional Resources" and "Future Improvements" are at the wrong heading level
- **Source ids:** egm-structural-r1-5
- **Lines:** 576, 584
- **Problem:** Both are H3s under "## Non-Functional Requirements", so the outline nests them under that section.
- **Recommendation:** Promote both to H2.

### 24. The number of tabs contradicts itself
- **Source ids:** egm-style-r1-1
- **Lines:** 17, 58, 193
- **Problem:** The Overview and G1 say "three tabs". Line 193 defines Household, Spending, Investing, Withdrawals and a Results panel.
- **Recommendation:** Describe the actual screen structure consistently.

### 25. The repeatability promise (G4) is broader than the design supports
- **Source ids:** egm-style-r1-2, egm-design-r1-22
- **Lines:** 61, 131, 197, 390
- **Problem:**
  - `Math.exp` and `Math.log` can differ slightly between browser engines.
  - Imported plans are recalculated with the current config, so the same inputs can give different results in a newer app version.
  - The input hash should include the seed, the path count and the config version.
- **Recommendation:** Narrow G4 to the same inputs, seed and config version in the same browser. When an import or config update changes results, have the change summary attribute the change to the rule update.

### 26. "Matches what tax software does" overstates the pension-split search
- **Source ids:** egm-style-r1-7
- **Lines:** 266
- **Problem:** Filing software optimizes the split to the dollar. The engine only tries 5% steps.
- **Recommendation:** Reword to "approximates the split tax software finds, using 5% steps".

---

## Nits

| # | Source ids | Lines | Problem | Recommendation |
| --- | --- | --- | --- | --- |
| 27 | egm-design-r1-21 | 203, 444 | Separate TypeScript types catch unit mixing only if they are branded. Plain `number` aliases mix freely. | Say "branded types". |
| 28 | egm-design-r1-23, egm-style-r1-22 | 293-295, 528 | "Always works" and "always converges" rest on after-tax cash rising whenever the withdrawal rises. The spec asserts this but never argues or tests it, and clawback phase-ins and the LIF cap complicate it. | State the argument once and add a property test. |
| 29 | egm-design-r1-24 | 13, 256 | The boundaries between the three spending phases are not defined. | Define them. |
| 30 | egm-design-r1-26 | 238 | The spec does not mention three RRIF/LIF rules: no RRIF minimum in the year the account opens, the option to use the younger spouse's age, and the deadline to convert a LIRA to a LIF at 71. | Address them or list them as out of scope. |
| 31 | egm-design-r1-27 | 280 | The CPP death benefit is modelled as tax-free, but it is taxable. | Note or fix. |
| 32 | egm-design-r1-28, egm-style-r1-12 | 21, 74-76 | The test group is described two ways ("a few trusted friends and family" vs. "the author and two friends"). Nobody is named to judge whether a tester "correctly describes" an effect. | Use one definition and say who judges. |
| 33 | egm-structural-r1-6 | 158-191 | The right-hand borders of the ASCII architecture diagram are misaligned. | Realign them. |
| 34 | egm-structural-r1-7 | 23, 92, 139 | The heading names differ from the standard's. Open Questions appears before the design content it refers to. | Rename the headings and move Open Questions to the end. |
| 35 | egm-structural-r1-8 | 7, 542, 574, 593 | Horizontal rules separate some sections but not others. | Use them consistently or remove them. |
| 36 | egm-structural-r1-9 | 25-48 | The Problem section uses bold labels where the rest of the document uses H3s. | Use H3s. |
| 37 | egm-structural-r1-10 | 40, 94, 368, 386, 578-582 | The internal docs and external sources have no links. "Implementation plan" has no anchor. | Add links and anchors. |
| 38 | egm-structural-r1-11 | 360-362/560-561, 369/548, 374/557, 395/571 | The performance target, persistence rules, CSP and disclaimer placement are each stated twice. The copies may drift apart. | State each once and cross-reference it. |
| 39 | egm-structural-r1-13 | 393 | One heading combines advice wording and spending categories. | Split it. |
| 40 | egm-structural-r1-14 | 72-77 | The Success criteria mix user outcomes with a deferred performance target. | Make it a separate H2, or keep only the user outcomes. |
| 41 | egm-style-r1-11 | 19 | "The tool teaches." is vague. | Make it concrete or remove it. |
| 42 | egm-style-r1-13 | 25, 30, 38 | Three claims cannot be checked: "dozens of decisions", "often at higher rates", "expertise most people don't have". | Calibrate them or drop the quantifiers. |
| 43 | egm-style-r1-14 | 36-37 | The claims about named products have no source or date. | Add "as reviewed on <date>" and a source. |
| 44 | egm-style-r1-15 | 40-46 | The text says "three reasons", then lists four problems. | Make the count consistent. |
| 45 | egm-style-r1-16 | 63 | "Grows through use" is vague. | State how warnings are added, or drop it. |
| 46 | egm-style-r1-18 | 81, 219 | The engine-boundary wording is duplicated and inconsistent. | Use one statement and refer to it from the other place. |
| 47 | egm-style-r1-19 | 94, 154, 195, 250 | "Mechanical default" is never defined. | Define it once. |
| 48 | egm-style-r1-20 | 318 | Repeats line 99 (O23). | Remove it. |
| 49 | egm-style-r1-21 | 119, 125, 330 | The source of the promised explanations is not stated (generated text or fixed templates). | State it. |
| 50 | egm-style-r1-23 | 362 | "A clear message" is subjective. | Say what the message contains. |
| 51 | egm-style-r1-24 | 406-540 | "Reason for Rejection: Rejected by author" says "rejected" twice. | Shorten the label. See also #21. |
| 52 | egm-style-r1-25 | 418, 459, 503, 521 | Subjective or speculative wording in the Alternatives. Line 521's claim about where the prototype's bugs came from does not match lines 42-44. | Calibrate or drop. |
| 53 | egm-style-r1-26 | 565 | "Next page load" ignores the HTTP cache (about 10 minutes on Pages). | Add "after the cache expires". |
| 54 | egm-style-r1-27 | 368 | In "a copy ... becomes the project's history documents", one copy becomes plural documents. | Reword. |
