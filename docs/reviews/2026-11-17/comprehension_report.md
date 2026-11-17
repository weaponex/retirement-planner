# Goldfish Review Report: Stage 6, Comprehension Test

*   **Target:** `docs/designs/retirement-planner.md` (FeatureRange 1..594, DetailedRange 595..1237)
*   **Reviewer:** egm-comprehension. It read its persona file and the whole target. No standard and no Goldfish context were supplied.
*   **Result:** 0 Blockers, 8 Major, 12 Nits.

## What the feature spec says (lines 1..594)

The spec describes a free retirement planner for an Ontario couple. It runs only in the browser, gives no advice and sends no data anywhere. It has four input tabs (Household, Spending, Investing, Withdrawals) and a Results panel that shows on every tab. The user edits inputs and presses Recalculate.

A pure TypeScript engine runs in a Web Worker. It works in future (nominal) dollars throughout and converts from today's dollars only at input and display. For each year it computes, per spouse:

*   benefits (CPP, OAS, DB pension);
*   forced withdrawals (RRIF and LIF minimums);
*   a bisection solve for the extra withdrawal needed to cover spending after federal and Ontario tax, using the best pension-income split;
*   surplus placement, returns and rebalancing;
*   the first death (rollovers, survivor benefits) and the second death (final return, probate, after-tax legacy).

It runs on 1,000 seeded, correlated lognormal market paths plus named stress paths. Three comparison variants run on the same paths: the placement baseline, the "Steady" shape, and the other withdrawal strategy. The output covers chance of success, 50th and 10th percentile legacy, lifetime tax paired with money left, 9 config-driven warnings with computed tips, and a change summary.

Every rule value comes from a per-tax-year config. Each config entry carries its source and validation status. Config values are fetched at build time by two independent fetches and reviewed by an admin. Correctness rests on runtime invariants (a failure blocks results), outside tax fixtures, and a reference plan built by a separate AI session. Persistence is localStorage autosave, export/import and schema migrations. The app is hosted on GitHub Pages, and a CSP meta tag blocks all network connections.

Per the document, there is no existing system. The prototype (about 30 patch rounds, mixed units, missing tax, never tested) is discarded. Only its decision log survives, as history.

## What the implementation plan says (lines 595..1237)

The work is built in nine tagged stages:

| Stage | Content |
|---|---|
| 0 | Repository, config, fixtures |
| 1 | One-person tax |
| 2 | Couple engine at fixed returns |
| 3 | Deaths |
| 4 | Market generator, simulation, Worker, benchmark |
| 5 | Store and screens |
| 6 | Warnings and tips |
| 7 | Persistence |
| 8 | User testing |

Each of the 63 files is listed with its role. They cover:

*   tooling: Vite, React 18, Zustand, Zod, Recharts, Vitest, fast-check, Playwright;
*   lint rules banning numeric literals and UI imports in `src/engine`;
*   the CSP;
*   the CI pipeline: fixture checksums, config check, typecheck, lint, tests with coverage, a benchmark within 25% of baseline, build, e2e;
*   AI-agent rules in AGENTS.md;
*   config JSON per year with SOURCES.md and an admin guide;
*   engine modules mapped one-to-one onto the Technical Plan's concepts;
*   the Worker client with cancellation;
*   the Zustand store with a hash-based stale selector;
*   persistence and migrations;
*   screens, charts and the glossary;
*   fixtures and tests: unit, property, reference plan within $1, benchmark, one e2e test per CUJ including no-network, and a manual comparison with a paid tool.

Both halves paraphrase cleanly. No section is unreadable, so there are no Blockers. The findings below are places where the parts don't connect or where a newcomer could not work out what is meant.

## Findings

### 1. Mixed working/retired years, and whose age sets the spending phases. Severity: Major

**Lines:** 312, 895, 898, 256.

Each spouse has their own retirement year (895). The loop says "Working years before retirement use the same loop, with contributions instead of withdrawals and no spending need" (312). That doesn't cover a year when one spouse has retired and the other still works:

*   Is there a spending need?
*   Do withdrawals happen?
*   Is CPP/OAS received while still working taxed at the user-entered marginal rate?

Spending phases have "start and end ages" (898), but the document never says whose age. The growth-to-safety shape is anchored to "the first spouse's retirement" (256), but the spending phases and the survivor phase have no stated anchor.

A reference-plan author (file 54) could not build expected rows for such a couple without guessing.

### 2. Is "Fill lower brackets first" a forced draw or a way to allocate W? Severity: Major

**Lines:** 264, 265, 288-291, 965-967.

Line 265 says money "forced out by ... the bracket target beyond what spending needs" becomes surplus. That treats bracket filling as a forced draw, like a RRIF minimum, which would belong in step 4.

Lines 289-291 and 965-967 instead describe the strategy as how the extra amount W is spread. Spread that way, it only spends up to the need, so it could never create surplus. The two readings give different results.

Two more things are undefined:

*   what target applies to the survivor after the first death;
*   what target the "other withdrawal strategy" comparison variant uses (325-328, 988) when the user chose "Registered last" and so never entered a target income.

### 3. Tips for share-of-paths warnings. Severity: Major

**Lines:** 335, 346, 356, 1013-1016.

Tips are computed by nudging inputs on "a single fixed-return path" and measuring "the change in the warning's metric". Some warnings measure "the share of all paths", for example low chance of success (346).

A single fixed-return path has no chance of success. The document doesn't say how a tip for that kind of warning is computed or worded.

### 4. What "worst 10% of markets" actually means. Severity: Major

**Lines:** 62, 119, 323, 330, 1000.

The feature spec promises comparisons in "the typical case and in the worst 10% of markets" (62, 119). The Technical Plan instead computes "a difference per path, summarized at the 50th and 10th percentiles" (330, 1000).

Those are not the same thing:

*   The 10th percentile of a per-path difference is not the difference in the worst markets.
*   For a tax difference, the low tail is the favourable outcome.
*   Elsewhere, "bad" is defined as the 10th percentile of legacy (323).

A reader can't tell which statistic is meant, or which tail of the tax difference counts as "bad".

### 5. Timing of non-registered income and of realized gains. Severity: Major

**Lines:** 206, 286-287, 299-302, 258.

Step 4 lists "non-registered interest and dividends (paid out as cash)" before returns are applied in step 7. The document never says which year's return produces those dividends.

Step 4 also lists "last year's realized gains from rebalancing" under "Required withdrawals". Line 258 says those gains are taxable income only, not cash withdrawn, so a reader could implement them as a cash draw by mistake.

With a $1 reference-plan tolerance (1148), this ambiguity decides pass or fail.

### 6. A comparison variant may be identical to the user's plan. Severity: Major

**Lines:** 256-257, 325-328, 988.

Nothing says what is shown when the user has already chosen "Steady" or "Same mix everywhere", so the comparison variant is identical to their plan.

It is also unclear whether "Same mix everywhere" is one of the 2-3 presets or a separate baseline (148 vs 257). Steady's stock share is never described, beyond the fact that its percentages are in the config.

### 7. Worker cancellation needs headers the host can't set. Severity: Major

**Lines:** 199, 369, 1030.

The design says "Cancellation uses a shared flag checked every 50 paths." A busy Worker can't receive messages, so a shared flag implies SharedArrayBuffer. SharedArrayBuffer requires cross-origin isolation response headers, and the document itself says GitHub Pages can't set headers (369).

The mechanism is unexplained, and as written it conflicts with the hosting choice. A reader would need outside knowledge to spot this, or to pick an alternative such as terminating the Worker.

### 8. Quarterly OAS updates versus one config per tax year. Severity: Major

**Lines:** 9, 69, 212, 787.

The admin guide has "yearly (January) and quarterly (OAS) update steps". But the config model is "one set of files per tax year", and each entry has a single value.

Nothing says:

*   how a quarterly OAS amount is stored;
*   which quarter's amount the engine uses;
*   whether a quarterly update makes the year's config "unvalidated".

### 9. The input hash is synchronous in one place and asynchronous in practice. Severity: Nit

**Lines:** 1022, 1040.

`isStale = result?.inputHash !== inputHash(inputs)` reads as a synchronous selector. But `inputHash` is said to use Web Crypto SHA-256, which is asynchronous.

The note "a small JS implementation in Node tests" is also unclear, because Node has Web Crypto too.

### 10. "Plan's average withdrawal tax rate" is undefined. Severity: Nit

**Lines:** 259, 959.

The after-tax stock share readout depends on this rate. The document doesn't say whether it comes from the representative path or from all paths, or over which years.

### 11. "Square-root scale source" and "25% survival" are unexplained. Severity: Nit

**Line:** 852.

"70%, with the square-root scale source" is jargon for a household equivalence scale, which a newcomer won't know. It is also unclear what source URL should be recorded.

"FP Canada, 25% survival" is likewise unexplained. Both sit behind important defaults.

### 12. "Admin" and the "value-fetching step" are unexplained in the feature spec. Severity: Nit

**Lines:** 136, 189-190.

The feature spec doesn't explain who the "admin" is (is it the author?) or what the "value-fetching step" is. Only the implementation plan (788) reveals that the "two independent fetches" are two AI agent sessions.

### 13. Open-question labels point to an outside document. Severity: Nit

**Lines:** 94, 145-153, and the inline tags (O3, O4, O9-O15, O17, O18).

The labels refer to questions in `concepts_brief.md`, which is not included. The decisions themselves are stated inline, so this is only a cross-reference gap. It does stop a reader from checking that each original question was actually answered.

### 14. Section references into a private file. Severity: Nit

**Lines:** 368, 779-782.

"§6", "§§1-3 and 5-7", "§§9 and 11" and "§4" point into `retirement-planner-context.md`. That file will become private and is not summarized here, so a reader can't tell what those sections contain or check that the split is right.

### 15. Canadian-finance acronyms are never expanded. Severity: Nit

**Lines:** throughout.

These are used without expansion:

*   LIRA, LIF, GIS, FSRA, DB;
*   adjusted cost base / "original cost";
*   RRSP, RRIF, TFSA, CPP and OAS.

A glossary is planned for the UI (1131), but the design itself has none. A developer who is new to Canada would need outside knowledge. A short glossary section would fix this.

### 16. "After-tax money left" vs "after-tax legacy". Severity: Nit

**Lines:** 17, 62, 330, 1000.

The two terms are used interchangeably but never stated to be the same thing.

### 17. "Clawback years" is ambiguous. Severity: Nit

**Lines:** 58, 197, 908.

When both spouses are clawed back in the same year, it is unclear whether that counts as one household year or as two spouse-years.

### 18. The $2,500 death benefit. Severity: Nit

**Line:** 280.

It is written as a literal in the design, while every other value comes from the config. Its recipient (survivor or estate) and its tax treatment are not stated.

### 19. Who produces the protected fixtures. Severity: Nit

**Lines:** 597, 1139, 1158.

The tax-case fixtures need runs of a "named outside calculator". The document doesn't say who runs them or which calculator.

Agents may not edit fixtures, and checksum changes are "reviewed by the author". The document doesn't say how that review is enforced.

### 20. The document creates itself. Severity: Nit

**Lines:** 756-759, 1223-1226.

File 15 "creates" `docs/designs/retirement-planner.md` by copying `design_draft.md`, which is the file under review. That is confusing without the explanation in file 63.

## Verdict

There are no Blockers. Findings 1-8 are Major: they are places where a new implementer, or the independent reference-plan author, would have to guess the intended behaviour. The rest are Nits.

*Note from the main session:* findings 3 and 7 repeat Stage 5 findings 2 and 4 (`zoom_out_report.md`). Two reviewers reaching the same conclusion independently makes them more likely to be real.
