# Goldfish Annotated Review Report

**Status: resolved (2026-11-17).**

**Author decisions:**

*   **Issues 1–9, 11–14, 17–20, 22, 23, 25:** proposed fixes accepted one by one in the interactive breakdown.
*   **Issue 3:** design values accepted as written.
*   **Issue 10:** Option B (a retirement year for each spouse; after-tax pay for a still-working spouse).
*   **Issue 15:** cuts accepted; after-tax stock-share readout kept.
*   **Issue 16:** Option A (one withholding rate).
*   **Issue 21:** Option A (unlisted URL with `noindex` as the family release).
*   **Issue 24:** Option A (birth month, first year pro-rated).
*   **Issues 26–39, 41:** "accept the rest". All proposed fixes applied. Contested sub-points (19, 27, 28) stand, with no change for those points.
*   **Issue 34:** repository name `retirement-planner`.
*   **Issues 40, 42, and the code-level-details part of 41:** declined, no change.

All edits are applied to `docs/designs/retirement-planner.md`. The design has not been re-reviewed since.

**Target:** `docs/designs/retirement-planner.md` (full file, lines 1–1252)

**Sources:**

| Report | Stage | Findings |
|---|---|---|
| `zoom_out_report.md` | 5 | 20 |
| `comprehension_report.md` | 6 | 20 |
| `critic_report.md` | 7 | 54 |
| `intermediate_zoom_out_report.md` | 8 | 13 + verdict table |
| `implementation_readiness_report.md` | 9 | 41 |

The ids used below come from those reports:

| Prefix | Report |
|---|---|
| S5# | `zoom_out_report.md` |
| C# | `comprehension_report.md` |
| CR# | `critic_report.md` |
| s8- | `intermediate_zoom_out_report.md` |
| F# | `implementation_readiness_report.md` |

About 148 findings group into the 42 issues below. Where reviewers disagree on a fix, Stage 8's smaller fix is preferred unless noted.

**How to read the suggestions:**

| Suggestion | Meaning |
|---|---|
| PROPOSE FIX | Edit the design as described. |
| PROPOSE FIX — AUTHOR DECIDES | The fix needs a choice from the author between the options listed. Nothing is applied until the author picks. |
| CONTEST | The finding is wrong; evidence is cited from the document. |
| DECLINE | Nit recorded, no change. |

**Author decisions needed:**

| Issue | Decision |
|---|---|
| 3 | Design values (I propose numbers) |
| 10 | Mixed working/retired years |
| 15 | Scope cuts, including the after-tax stock-share readout |
| 16 | Foreign withholding tax |
| 21 | Public deploy vs FSRA gate |
| 24 | First-year benefit timing |
| 34 | GitHub repository name |

---

## Prioritized Findings & AI Suggestions

### [Issue 1] [`egm-design`, `egm-structural`] - Severity: Blocker — No Risks & Mitigations section
*   **Affected Scope:** whole feature spec; scattered mentions at lines 98, 205, 361, 369, 374, 460, 486
*   **Discrepancy Description:** The feature-spec standard requires a section naming failure modes, security implications, limits and mitigations. None exists. (CR#1, s8-13)
*   **Rationale:** Risks are scattered or missing (supply chain, shared origin, storage eviction, longevity, performance, public release before FSRA).
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid and required by the standard. Use Stage 8's table form so it adds no code.
*   ***Proposed Edit:***
    *   Location: new `## Risks & Mitigations` section after Non-Functional Requirements.
    *   Change: one table with one row per risk, giving the risk, its impact, and the mitigation or "Accepted" with a link to the existing text. Rows:
        *   CSP set by meta tag only, and the Worker not covered;
        *   npm supply chain;
        *   shared github.io origin;
        *   browser storage eviction, and export files being unencrypted;
        *   AI reference plan sharing the engine's blind spots;
        *   fixed inflation;
        *   fixed death ages (longevity);
        *   thin tails of the lognormal model;
        *   full rebalancing every year;
        *   foreign withholding (per Issue 16);
        *   public URL counting as a release (per Issue 21);
        *   performance budget;
        *   schema change after rollback;
        *   pending open questions O16, O20, O22, O23.

### [Issue 2] [`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`] - Severity: Blocker — Config data model and loading undefined
*   **Affected Scope:** Lines 669, 787, 802–883
*   **Discrepancy Description:** The config has no key tree, no value shapes and no closed `unit` enum. Table values don't fit a scalar entry, some values are missing, and there is no loading mechanism for the Worker, Node tests and tools. `configStatus` is undefined. (F1, S5#14, C#8)
*   **Rationale:** Every engine value must come from config, and the two independent fetch sessions must agree on key names.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. This is the contract stage 0 builds.
*   ***Proposed Edit:***
    *   Location: new subsection "Config contract" under the Technical Plan's Config section, plus a rewrite of file entries 20–25.
    *   Change:
        1.  **Entry shape:** `{ value, unit, taxYear, indexed, source: { url, locator }, fetchedOn, validation }`. `value` may be a number, a bracket table (`[{ from, rate }]`), an age-keyed table (`{ "71": 0.0528, … }`) or a step schedule. The `unit` enum is closed: `CAD_per_year | CAD_per_month | rate | age | years | count`.
        2.  **Key tree:** the full dotted key list for `federal.json` and `ontario.json` (for example `federal.tax.brackets`, `federal.credits.age.amount`, `federal.oas.recovery.threshold`, `cpp.adjust.early_per_month`, `rrif.min_factor`, `ontario.surtax.thresholds`, `ontario.lif.max_factor`). It adds the missing keys: OAS residence minimum and full years, maximum deferral, 75+ increase; CPP earliest and latest start; LIF conversion limits; dividend gross-up and credit split by government.
        3.  **Two kinds of config:**
            *   Rule values: `federal`, `ontario`, `market`. These are sourced and validated.
            *   Design values: `planning.json`, `warnings.json`. Their `source` is `"author decision, <date>"`, with validation by the author. This resolves S5#14 without inventing sources.
        4.  **Engine settings** (solver tolerance, step cap, split step, progress interval) move out of config into `src/engine/constants.ts`. That file is exempt from the numeric-literal rule.
        5.  **Loading:**
            *   Config is JSON imported statically. A generated `src/engine/config/bundle.ts` imports every file for the tax year in `config/CURRENT_YEAR`.
            *   The Worker, Vitest and the `tsx` tools all import that same module.
            *   `configStatus(today: Date)` returns `outOfDate = today.getFullYear() > taxYear` and the list of unvalidated keys.
        6.  OAS is updated once a year only (see Issue 22).

### [Issue 3] [`egm-implementation-readiness`, `egm-style`] - Severity: Blocker — Design values never given
*   **Affected Scope:** Lines 836–872
*   **Discrepancy Description:** The plan never gives numbers for:
    *   the presets, shapes and stress paths;
    *   the override margin;
    *   the Canadian/global stock ratio;
    *   warning triggers, windows and scopes;
    *   nudge steps.

    (F2)
*   **Rationale:** Without these values, the implementer invents them.
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES
*   ***Justification:*** Valid. These are the author's planning choices. The numbers below are my proposals for the author to accept or change. They go into `planning.json` and `warnings.json` marked "author decision".
*   ***Proposed Edit:*** new subsection "Design values (version 1)" containing:
    *   **Growth-to-safety shapes:** stock share by years from household retirement, joined by straight lines, constant beyond the end points.
        | Shape | Stock share |
        |---|---|
        | Steady | 60% throughout |
        | Gradual shift | 70% at −10, 50% at 0, 40% at +15 |
        | Safety first, then regrow | 60% at −5, 40% at 0, 60% at +15 |
    *   **Canadian / global split of stocks:** 30 / 70.
    *   **Placement presets** (fill order per asset class; "Same mix everywhere" is the baseline only, not a preset):
        | Preset | Bonds | Global stocks | Canadian stocks |
        |---|---|---|---|
        | Bonds sheltered first | RRSP/RRIF/LIRA/LIF, then TFSA, then non-registered | TFSA, then registered, then non-registered | non-registered, then TFSA, then registered |
        | Growth tax-free first | registered, then non-registered, then TFSA | TFSA, then non-registered, then registered | non-registered, then registered, then TFSA |
    *   **Stress paths:** each is a 5-year sequence; after it ends, the path continues at expected returns.
        | Stress path | Stocks | Bonds |
        |---|---|---|
        | Early crash | −35%, +5%, +10%, +10%, +10% | +3% each year |
        | Lost decade lite | −15%, −10%, −5%, +5%, +5% | +1% each year |
    *   **Return override margin:** an override counts as optimistic if it exceeds FP Canada's guideline + 1.0 percentage point (geometric, before fees).
    *   **Warnings:**
        | Warning | Trigger | Measured on |
        |---|---|---|
        | Money runs out | First shortfall before the second death, or within the final 5 years | Typical path |
        | Low chance of success | Below 85% warns; below 70% alerts | All paths |
        | OAS clawback | A spouse's net income within $5,000 (today's dollars) of the threshold, or above it, in any year | Typical path |
        | RRIF minimum forces extra income | Forced income > $5,000 above need | Typical path |
        | Large registered balance at second death | > $250,000 (today's dollars) | Typical path |
        | Legacy goal missed | Below goal on the typical path or the bad path | Typical and bad paths |
        | Bridge years | Shortfall before both spouses' CPP and OAS start | Typical path |
        | Survivor tax jump | Survivor's average tax rate rises by > 5 percentage points vs the last couple year | Typical path |
        | Optimistic returns | Any override above its limit | Inputs |
    *   **Nudge steps:**
        | Input | Step |
        |---|---|
        | Spending phases | ±5% |
        | CPP/OAS start age | ±1 year |
        | Bracket target | ±$5,000 |
        | Retirement year | ±1 |
        | Survivor % | ±5 percentage points |

### [Issue 4] [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Blocker — No field-level schema for PlanInputs, YearRow, PathSummary, CSV
*   **Affected Scope:** Lines 894–909, 1145–1153, 1188–1191
*   **Discrepancy Description:** The persisted v1 inputs have no field names, types or units. The LIF unlock, account holdings and DB fields are missing. `YearRow` and the reference CSV have no columns, and the input-path format is undefined. (F3, F32, CR#29)
*   **Rationale:** Field names become permanent once v1 is saved, and the independent reference plan needs a column list.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:*** new subsection "Data contracts" containing TypeScript-style definitions of `PlanInputs`, `AccountInput`, `DbPensionInput`, `YearRow`, `PathSummary` and `Result`.
    *   **Units:** every money input is in today's dollars and ends in `Today`, for example `annualSpendToday`. Every `YearRow` money field is in future dollars and ends in `Nom`.
    *   **Fields:** each has a validation range.
    *   **Seed:** an unsigned 32-bit integer, chosen at random when a plan is created.
    *   **Input paths:** dotted strings such as `spouses.0.cppStartAge` or `accounts.<id>.balanceToday`.
    *   **Spending phases:** measured in years from household retirement (per Issue 10), contiguous, with no gaps.
    *   **Defaults:** default values for an empty plan.
    *   **Reference CSV:** its header equals the `YearRow` field list in a fixed order.

### [Issue 5] [`egm-zoom-out`, `egm-comprehension`, `egm-codebase-details`, `egm-implementation-readiness`, `egm-style`] - Severity: Blocker — Cancellation by shared flag can't work on GitHub Pages
*   **Affected Scope:** Lines 199, 989, 993, 1030
*   **Discrepancy Description:** A shared flag needs SharedArrayBuffer and COOP/COEP headers, which GitHub Pages can't set. (F4, S5#4, C#7)
*   **Rationale:** All four stages raised this independently.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. The fix removes code.
*   ***Proposed Edit:***
    *   On Cancel, the client calls `worker.terminate()` and creates a new Worker.
    *   Remove `isCancelled` from `simulate()`, the 50-path check, and the "shared flag" text.
    *   Progress messages are kept.

### [Issue 6] [`egm-zoom-out`, `egm-inventive-catalyst`, `egm-design`, `egm-style`] - Severity: Major — Nested split search makes the 5-second target unreachable
*   **Affected Scope:** Lines 266, 288–297, 374, 534, 924, 988–993
*   **Discrepancy Description:** `bestSplit` runs inside every bisection step: roughly 80–200 million tax calls per run. Line 534's "11 tax calculations" is wrong. (S5#1, CR#2, s8-3)
*   **Rationale:** The cost is predictable now.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. I take Stage 8's reduced fix.
*   ***Proposed Edit:***
    1.  Bisect with the previous year's split (50/50 in the first year). Then run `bestSplit` once at the solved withdrawal, and solve again if the split changed (at most 2 passes).
    2.  Cap bisection at 32 steps with tolerance $0.01, which is enough for any balance up to $40M.
    3.  Run comparison variants on the first 250 paths only. The user's plan runs on all paths.
    4.  Add a property test showing the two-pass split equals the full nested search on random cases.
    5.  Correct line 534 to give the real cost.
    6.  Drop the 5,000-path option (Issue 15).
    7.  Parallel Workers and analytic tax inversion are listed under Future Improvements, used only if the benchmark misses.

### [Issue 7] [`egm-style`, `egm-zoom-out`, `egm-codebase-details`] - Severity: Major — Performance target can't be measured; CI bench will be flaky
*   **Affected Scope:** Lines 77, 374, 557, 713, 1193–1196, 1235
*   **Discrepancy Description:** "Mid-range laptop" is undefined. The CI 25% gate is unreliable on shared runners, and `vitest bench` can't fail on regressions. The baseline has no owner. (CR#3, S5#8, F12, F28)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   State "under 5 seconds" at line 77.
    *   The reference machine is the author's laptop with current Chrome. Its CPU, cores and RAM are recorded in `README.md` at stage 4.
    *   `npm run bench` runs locally and prints the time. In CI it runs as a report-only step that can't fail the build.
    *   Remove `baseline.json` and the 25% rule.
    *   The 5-second check is the manual step before stage 8, on the reference machine.

### [Issue 8] [`egm-inventive-catalyst`, `egm-design`, `egm-zoom-out`] - Severity: Major — Rebalancing gains carried to "next year" are untaxed at death
*   **Affected Scope:** Lines 258, 286–308, 982
*   **Discrepancy Description:** Gains realized in the second-death year are never taxed. The design doesn't say whose return carries the first spouse's pending gains, and gains are listed under "Required withdrawals". (S5#3, CR#4, s8-2, C#5 part)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid correctness gap. Stage 8's fix removes the problem instead of patching it.
*   ***Proposed Edit:***
    *   Move rebalancing to the start of the year, as a new step 2 after the first-death transfers. Gains realized in non-registered accounts are taxable in the same year and enter the step-5 tax calculation.
    *   Remove the carry-over to next year and the "last year's realized gains" line in step 4.
    *   A full rebalance every year, in both the user's plan and the baseline, is recorded as an accepted assumption in the Risks table.

### [Issue 9] [`egm-design`, `egm-comprehension`, `egm-codebase-details`] - Severity: Major — Non-registered income timing and negative returns undefined
*   **Affected Scope:** Lines 241, 248, 286–287, 299–302
*   **Discrepancy Description:** The design doesn't say which year's return pays dividends. Applying income fractions to a negative return gives negative dividends. (CR#6, C#5, s8-6, F16 part)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. One rule settles both questions.
*   ***Proposed Edit:***
    *   Each asset class has a fixed yearly cash yield from config, split by income type: interest, eligible dividends, foreign dividends. It is applied to the start-of-year balance and paid as cash in step 4.
    *   The price return equals the total return minus that yield, and is applied in step 7. The price return can be negative; the yield can't.

### [Issue 10] [`egm-comprehension`, `egm-design`, `egm-zoom-out`, `egm-implementation-readiness`] - Severity: Major — Mixed working/retired years and whose age sets spending phases
*   **Affected Scope:** Lines 205, 256, 312, 895–898, 975
*   **Discrepancy Description:** The design doesn't cover a year when one spouse is retired and the other works, or whose age the spending phases use. No module implements working years. (C#1, CR#10, s8-4, F22)
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES
*   ***Justification:*** Valid. Both options below are defensible:
    *   **Option A (Stage 8):** one household retirement year. "Both spouses retire in the same year" becomes a stated limitation, checked against O16. It is the smallest change, but it can't model spouses retiring at different times, which is common.
    *   **Option B (mine):** keep a retirement year for each spouse.
        *   Household spending need starts in the first spouse's retirement year.
        *   The still-working spouse enters an after-tax salary in today's dollars, treated as fixed cash income in those years.
        *   Their CPP/OAS while working is taxed at the working-years marginal rate they enter.
        *   This adds one input and one rule.
*   ***Proposed Edit:*** under either option:
    *   Spending phases and growth-to-safety shapes are measured in years from household retirement (A) or the first retirement (B).
    *   Working years get a module, `project/workingYear.ts`, covering:
        *   contributions in today's dollars, indexed;
        *   RRSP deductions not modelled;
        *   TFSA room grows by the yearly limit;
        *   non-registered income taxed at the entered marginal rate.

### [Issue 11] [`egm-comprehension`, `egm-design`, `egm-zoom-out`, `egm-implementation-readiness`] - Severity: Major — "Fill lower brackets first": forced draw or allocation?
*   **Affected Scope:** Lines 264–265, 286–291, 965–967
*   **Discrepancy Description:** The strategy is described both as a forced draw that creates surplus and as a way to spread W, which can't create surplus. Three things are also undefined:
    *   the survivor's target;
    *   the comparison variant's target;
    *   ordering between spouses.

    (C#2, s8-5, F21)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. Stage 8's reading matches the strategy's purpose (CUJ 2).
*   ***Proposed Edit:***
    *   Bracket filling becomes a required draw in step 4. It tops each spouse's taxable income (before splitting) up to their target. Any surplus goes to step 6.
    *   The `allocate` step then applies "Registered last" to whatever W is still needed.
    *   The survivor keeps their own target.
    *   When the user chose "Registered last", the comparison variant uses a config default target: the top of the lowest federal bracket.
    *   **Between spouses:**
        *   non-registered and TFSA draws are pro rata to balances;
        *   sales inside an account are pro rata across positions at average cost;
        *   `targetHoldings` fills asset classes in this order: bonds, global stocks, Canadian stocks.

### [Issue 12] [`egm-zoom-out`, `egm-inventive-catalyst`, `egm-comprehension`, `egm-design`] - Severity: Major — Tips computed on a path that can't measure the warning
*   **Affected Scope:** Lines 151, 334–356, 512–516, 1013–1016
*   **Discrepancy Description:** Share-of-paths warnings can't be measured on one fixed-return path. A warning that fires on the bad path may not fire on the fixed path. (S5#2, C#3, CR#8, s8-7)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. It narrows the author's computed-tips choice (Alternative S) without reversing it.
*   ***Proposed Edit:***
    *   Nudge effects are computed only for warnings measured on a representative path, using that path's own market returns.
    *   Share-of-paths warnings (low chance of success) list their related inputs without effect sizes.
    *   Remove the fixed-return tip path.
    *   Alternative S's rejection text is unchanged.

### [Issue 13] [`egm-zoom-out`, `egm-comprehension`, `egm-codebase-details`, `egm-implementation-readiness`, `egm-style`] - Severity: Major — Async input hash in a synchronous selector
*   **Affected Scope:** Lines 164, 197, 1022, 1040
*   **Discrepancy Description:** `crypto.subtle.digest` is async, but `isStale` uses it synchronously, and there are two hash implementations. (S5#5, C#9, F9, s8-12, CR#25 part)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. The fix removes code.
*   ***Proposed Edit:***
    *   The store keeps an `inputsRevision` counter, incremented by `setInput`, `loadPlan` and `newSeed`.
    *   A result records the revision it was computed from, and `isStale = result.revision !== inputsRevision`.
    *   Remove `hash.ts` and every hash reference.

### [Issue 14] [`egm-zoom-out`, `egm-design`, `egm-codebase-details`] - Severity: Major — Unit guarantee has a hole; conversion functions lack inflation input
*   **Affected Scope:** Lines 203, 883–888
*   **Discrepancy Description:** Branded number types still allow `a + b` across brands, and `toFuture`/`toToday` take no inflation input. (S5#6, CR#27, F18)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. Mixed units caused the prototype's failure.
*   ***Proposed Edit:***
    *   The engine works only in future dollars.
    *   `normalizeInputs(inputs, cfg)` converts every `…Today` input once, using a deflator built from the config's inflation rate.
    *   `toDisplay(rows, deflator)` converts back for screens.
    *   `TodayDollars` never appears inside `src/engine/solver`, `project` or `simulate`. This is enforced by a lint rule (`no-restricted-imports` of the today type in those folders).
    *   Line 203 is reworded to state exactly this guarantee.

### [Issue 15] [`egm-zoom-out`] - Severity: Major — Version 1 is very large for 3 households
*   **Affected Scope:** Lines 72–77, 595–1226; specific items at 170, 252, 259, 361–362, 681, 959, 1055
*   **Discrepancy Description:** The following can be deferred without affecting any goal:
    *   rolling snapshots;
    *   the migration chain;
    *   Firefox in end-to-end tests;
    *   the 5,000-path option;
    *   the after-tax stock-share readout.

    (S5#9, s8-1, CR#14, F25, C#10)
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES (readout only)
*   ***Justification:*** Valid.
    *   **Cut:**
        *   Rolling snapshots. One autosave plus export; this also settles F25.
        *   The migration chain. Keep `schemaVersion` and refuse files from newer versions. When v2 arrives, write it under a new key and leave the old one in place; this settles CR#14.
        *   Firefox in end-to-end tests.
        *   The 5,000-path option.
    *   **The readout:** the design added it as the mitigation for the author's face-value choice (Alternative P), and it needs an undefined average tax rate (C#10). The author decides:
        *   keep it, defined as the representative path's lifetime income tax ÷ lifetime registered withdrawals;
        *   or cut it, and record the face-value risk in the Risks table instead.
*   ***Proposed Edit:*** remove the four items from the Technical Plan, persistence, path choices and test configuration, and apply the author's choice on the readout.

### [Issue 16] [`egm-design`] - Severity: Major — Foreign withholding ignored while a preset puts global stocks in the TFSA
*   **Affected Scope:** Lines 232, 257
*   **Discrepancy Description:** US dividends in a TFSA lose about 15% to withholding tax that can't be recovered, so the placement lesson points the wrong way. (CR#5)
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES
*   ***Justification:*** Valid. Both options are small:
    *   **Option A:** add one config rate, applied to the foreign-dividend yield of global stocks in the TFSA and in RRSP/RRIF/LIRA/LIF. In non-registered accounts it is treated as recovered through the foreign tax credit, which is not modelled. Add one line of explanation to the placement text.
    *   **Option B:** keep withholding out of scope. Change "Bonds sheltered first" so global stocks fill registered accounts before the TFSA, and add a Risks row.
*   ***Proposed Edit:*** apply the chosen option. Under Option A, remove "foreign withholding tax" from the tax-scope "Out" list.

### [Issue 17] [`egm-design`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major — Return model convention and generator details open; O22 unresolved
*   **Affected Scope:** Lines 98, 248–250, 944–950
*   **Discrepancy Description:** The design doesn't say whether means are arithmetic or geometric. The sampler, the seed initialization, the array layout and how fees apply are open, the model's tails are thin, and O22 blocks the generator. (CR#7, F16, S5#16)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   **Means:** the config holds geometric (compound) means g and standard deviations s of log returns. The model draws ln(1 + R) ~ Normal(ln(1 + g), s²), correlated through a Cholesky factor.
    *   **Sampler:** Box–Muller normals from `pure-rand`'s xoroshiro128+, seeded with the plan's uint32 seed. Path k uses `seed + k` (replacing the hand-written `prng.ts`).
    *   **Array layout:** `[path][year][assetClass]`.
    *   **Fees:** subtracted from the total return each year.
    *   **Test:** the simulated median compound return matches the config within 0.1 percentage points over 10,000 paths.
    *   **O22:** must be settled before stage 4 starts.
    *   **Thin tails:** an accepted risk.

### [Issue 18] [`egm-design`] - Severity: Major — Fixed life expectancy limits what "chance of success" means
*   **Affected Scope:** Lines 60, 90, 212, 322, 852
*   **Discrepancy Description:** Success assumes deaths at the target ages. (CR#9)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. The fix is wording only.
*   ***Proposed Edit:***
    *   Label the result "chance of success, assuming deaths at the target ages".
    *   State that the default is the age with a 25% chance of survival, from FP Canada's Projection Assumption Guidelines.
    *   Add a longevity row to the Risks table.

### [Issue 19] [`egm-design`, `egm-style`, `egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major — CSP claim overstated; breaks dev; doesn't cover Worker; no supply-chain controls
*   **Affected Scope:** Lines 214, 369–370, 546–549, 646, 690–699
*   **Discrepancy Description:**
    *   `connect-src 'none'` doesn't block navigation.
    *   The meta tag breaks `npm run dev`.
    *   The Worker takes its CSP from headers, not from the page.
    *   There is no lockfile or audit policy.

    (CR#11, F8)
*   ***AI Suggestion:*** PROPOSE FIX, with one sub-point CONTESTED
*   ***Justification:***
    *   **Valid:** everything except the claim that the CSP "would also block any runtime fetch of the config".
    *   **Contested:** the design already says config is "bundled with the app" (Hosting section) and "never fetches values while running" (Non-Goals), so there is no runtime fetch to block.
*   ***Proposed Edit:***
    *   Inject the CSP meta tag only at build time, through a Vite `transformIndexHtml` plugin with `apply: 'build'`.
    *   Reword the claims to: "the app's page cannot make network requests (fetch, XHR, WebSocket, forms); this does not cover navigation or the Worker".
    *   Add both gaps to the Risks table.
    *   Add `package-lock.json`, `npm ci`, and `npm audit --omit=dev` as a report-only CI step.

### [Issue 20] [`egm-design`] - Severity: Major — Shared github.io origin exposes saved plans
*   **Affected Scope:** Lines 360, 367
*   **Discrepancy Description:** All of an account's Pages project sites share one localStorage. (CR#12)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:*** add a Risks row: "Accepted for the family release. Before any public release, host under a dedicated GitHub account or organization, or a custom domain." Add the same item to the O20 release checklist.

### [Issue 21] [`egm-design`] - Severity: Major — Public deploy goes live before the FSRA/disclaimer gate
*   **Affected Scope:** Lines 21, 97, 367, 572
*   **Discrepancy Description:** The first green build of `main` is publicly reachable. (CR#15)
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES
*   ***Justification:*** Valid.
    *   **Option A:** treat the unlisted Pages URL as the family release. Add a `noindex` meta tag, share the URL only with testers, and require O20 before the URL is shared any wider.
    *   **Option B:** keep `deploy.yml` manual-only (`workflow_dispatch`) until O20 is resolved. Testers then run the app locally.
*   ***Proposed Edit:*** apply the chosen option to the Hosting section and to `deploy.yml`.

### [Issue 22] [`egm-zoom-out`, `egm-comprehension`] - Severity: Major — Quarterly OAS updates vs one config per tax year
*   **Affected Scope:** Lines 69, 212, 787
*   **Discrepancy Description:** The admin guide has quarterly OAS updates, but the config holds one value per year. (C#8, S5#18)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. A yearly value indexed by inflation is enough for a 30–40-year projection.
*   ***Proposed Edit:*** OAS is updated yearly, with the January amount annualized. Remove "quarterly" everywhere.

### [Issue 23] [`egm-design`] - Severity: Major — Runtime invariants have no tolerance
*   **Affected Scope:** Lines 296, 378–385
*   **Discrepancy Description:** Exact comparisons will raise false integrity errors. (CR#16)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   Invariants compare within $0.05 per check (`INVARIANT_TOLERANCE` in `constants.ts`).
    *   The integrity screen shows the year, path, variant and failed check, with a "Copy details" button. This is the reduced S5#10; the separate diagnostic export is cut.

### [Issue 24] [`egm-design`, `egm-style`] - Severity: Major — First-year benefit overstatement isn't "slight"
*   **Affected Scope:** Line 205
*   **Discrepancy Description:** The first year can be overstated by up to 11 months of payments. (CR#18)
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES
*   ***Justification:*** Valid.
    *   **Option A:** add a birth month for each spouse. Pro-rate the first year of CPP, OAS and DB, and the OAS 75+ increase.
    *   **Option B:** no new input. Pay half a year in the start year (a half-year convention), which makes the error at most ±6 months.
*   ***Proposed Edit:*** apply the chosen option and remove the word "slightly".

### [Issue 25] [`egm-comprehension`, `egm-design`, `egm-implementation-readiness`, `egm-style`] - Severity: Major — Result metrics, "worst 10%", and percentile ties undefined
*   **Affected Scope:** Lines 62, 119, 323–330, 959, 995–1001, 1088, 1100
*   **Discrepancy Description:**
    *   The design doesn't say whether "worst 10%" means the 10th percentile of the difference or of the markets, nor which tail is bad.
    *   "Lifetime tax" and "money left" are undefined.
    *   Ties among failed paths are not handled.
    *   "Typical/bad" and "50th/10th" labels are used inconsistently.

    (C#4, CR#19, F23, C#16, C#17)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:*** new "Result definitions" list:
    *   **Typical:** the median across paths. **Bad:** the 10th percentile of after-tax legacy, using the nearest-rank method. Ties are broken by first shortfall year, then by total shortfall.
    *   **Lifetime tax:** federal and Ontario income tax, the OAS clawback, final-return tax and probate, summed in today's dollars.
    *   **After-tax money left:** the same thing as after-tax legacy, in today's dollars. Use one term throughout.
    *   **Comparison "in the worst 10% of markets":** the average per-path difference across the paths in the user plan's bottom 10% by legacy.
    *   **Clawback years:** household years in which either spouse pays any clawback.
    *   `PathSummary` gains a `totalShortfallNom` field.

### [Issue 26] [`egm-design`] - Severity: Major — Death edge cases
*   **Affected Scope:** Lines 207, 273–281, 303–308
*   **Discrepancy Description:** Both spouses dying in the same year is undefined, and an RRSP or LIRA not yet converted at death is omitted. (CR#20, s8-8, CR#31, C#18)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   If both spouses die in the same year, apply the first-death rollover and then the survivor's final return in that year.
    *   The final return includes unconverted RRSP and LIRA balances.
    *   Remove the $2,500 CPP death benefit and list it under tax non-goals. It is taxable, goes to the estate, and has no material effect.

### [Issue 27] [`egm-design`, `egm-style`] - Severity: Major — Verification independence overstated; tolerances undefined
*   **Affected Scope:** Lines 52, 70, 386–391, 460, 1148, 1191
*   **Discrepancy Description:**
    *   The AI reference plan may share the engine's misreadings.
    *   There is no tax-fixture tolerance.
    *   The $1 reference tolerance can't be met while bisection stops at $1.
    *   Paid-tool comparison missing from Verification (the claim contested below).

    (CR#17, F17, S5#12)
*   ***AI Suggestion:*** PROPOSE FIX, with the paid-tool sub-point CONTESTED
*   ***Justification:***
    *   **Valid:** the wording and the tolerances.
    *   **Contested:** the paid-tool comparison is already in the Verification Plan (line 1236, "Paid-tool comparison (manual, before stage 8)") and in file 62a. The Stage 7 reviewers only saw lines 1–594.
*   ***Proposed Edit:***
    *   G10 and line 70 say the reference plan is "built by a separate AI session from the written design; it can share the design's misreadings".
    *   Tax fixtures must match within $1 per return.
    *   Bisection solves to $0.01 (Issue 6). Reference rows must match within $1 per cell.
    *   Add S5#12's property tests:
        *   swapping the spouses gives the same household totals;
        *   with zero tax and zero volatility, the loop matches the closed-form annuity;
        *   moving money between two accounts of the same type changes nothing;
        *   the chosen split never gives more tax than a 0% split.
    *   Add one test for the bisection argument: after-tax cash rises when W rises (CR#28).

### [Issue 28] [`egm-design`, `egm-structural`] - Severity: Major — Rejection rationales attributed without links; some lack trade-offs
*   **Affected Scope:** Lines 402–540
*   **Discrepancy Description:** "Rejected by author" has no link. K and M give no reason. Several choices have no alternatives entry. (CR#21, CR#51)
*   ***AI Suggestion:*** PROPOSE FIX, with the attribution sub-point CONTESTED
*   ***Justification:***
    *   **Contested:** the standard forbids attributing a rejection to a *maintainer* without a link. The author is the document's author, and the decisions are recorded in this document (the "Decisions made for this plan" table) and in `concepts_brief.md`.
    *   **Valid:** the missing trade-offs and the missing entries.
*   ***Proposed Edit:***
    *   Link `concepts_brief.md` once at the top of Alternatives.
    *   Give K and M a one-line trade-off.
    *   Add the deciding trade-off to L, N, O, Q, R, S, T and W.
    *   Add "localStorage vs IndexedDB" as an alternative: localStorage chosen because the plan is under 100 KB and synchronous access is simpler.
    *   Shorten the label to "Decision:".

### [Issue 29] [`egm-structural`, `egm-design`, `egm-comprehension`] - Severity: Major — Open-question IDs can't be traced
*   **Affected Scope:** Line 94 and O-tags throughout
*   **Discrepancy Description:** O2, O6, O19 and O21 appear nowhere, and the brief isn't linked. (CR#22, C#13)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   Link `concepts_brief.md`.
    *   Replace line 94 with a table listing O1–O23, a short title for each, and its resolution with a section link, or "open".

### [Issue 30] [`egm-structural`, `egm-style`] - Severity: Major — Heading levels, tab count, G4 scope, "matches tax software"
*   **Affected Scope:** Lines 17, 58, 61, 193, 266, 576, 584
*   **Discrepancy Description:** (CR#23, CR#24, CR#25, CR#26, S5#13)
    *   Additional Resources and Future Improvements are at the wrong heading level.
    *   The text says "three tabs" but defines four tabs plus a panel.
    *   G4 is broader than the design supports.
    *   "Matches tax software" overstates a search in 5% steps.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. Wording and structure only.
*   ***Proposed Edit:***
    *   Promote the two headings to H2.
    *   Say "four input tabs and a Results panel" consistently.
    *   G4 reads "same inputs, seed, config version and browser".
    *   Line 266 reads "approximates the split tax software finds, in 5% steps".

### [Issue 31] [`egm-comprehension`, `egm-zoom-out`] - Severity: Major — Comparison variant can equal the user's plan; "Same mix everywhere" role unclear
*   **Affected Scope:** Lines 148, 256–257, 325–328, 988
*   **Discrepancy Description:** (C#6, s8-9)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   If a variant equals the user's choice, it is not run, and the comparison shows "This is your current choice".
    *   "Same mix everywhere" is the baseline only, not a selectable preset.

### [Issue 32] [`egm-zoom-out`] - Severity: Major — Each warning lives in both config and code
*   **Affected Scope:** Lines 63, 334–343, 860–872, 1012
*   **Discrepancy Description:** (S5#7)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   Each warning is one code object, `src/engine/warnings/definitions.ts`, holding its check function, explanation, basis, window, scope and related inputs.
    *   `warnings.json` keeps only the numeric triggers and nudge steps (Issue 3).

### [Issue 33] [`egm-zoom-out`, `egm-implementation-readiness`, `egm-codebase-details`, `egm-style`] - Severity: Major — File list doesn't match the repository
*   **Affected Scope:** Lines 617–625, 724–727, 756–759, 1221–1226
*   **Discrepancy Description:**
    *   `.gitignore`, `LICENSE` and the moved context file are listed as Create.
    *   The design file "creates itself".
    *   `design_draft.md` is referenced but gone.
    *   `.gitattributes` and the report files are not listed.

    (S5#20, F5, C#20)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   Mark `.gitignore`, `LICENSE`, `.gitattributes`, the design and `private/…` as "Exists".
    *   Remove every `design_draft.md` reference.
    *   The review reports and this file move to `docs/reviews/2026-11-17/` and are committed as review history.

### [Issue 34] [`egm-codebase-details`, `egm-implementation-readiness`] - Severity: Major — CI, deploy, tooling and versions underspecified
*   **Affected Scope:** Lines 597, 603, 627–722, 1069, 1193–1198
*   **Discrepancy Description:** (F7, F11, F12, F13, F14, F15, F26, F27, F35, S5#15)
    *   CI can't pass at stage 0.
    *   There are no versions, lockfile, Node version or tool runner.
    *   The `@engine` alias isn't resolved by Vite.
    *   Vitest picks up the Playwright specs.
    *   The lint rules are unnamed and use a Unicode minus.
    *   The deploy trigger and actions are unnamed.
    *   There is no setup-node step and no Playwright install.
    *   Prettier is never checked.
*   ***AI Suggestion:*** PROPOSE FIX — AUTHOR DECIDES (repository name only)
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   **Version table, by major version.** Exact versions are resolved at stage 0 and frozen by `package-lock.json`.
        | Component | Version |
        |---|---|
        | Node | 22 LTS (`.nvmrc`) |
        | TypeScript | 5 |
        | React | 18 |
        | Zustand | 5 |
        | Zod | 3 |
        | Recharts | 2 |
        | Vite | 6 |
        | Vitest | 3, with `@vitest/coverage-v8` |
        | Playwright | 1 (Chromium only) |
        | ESLint | 9 (flat config), with typescript-eslint 8, `eslint-plugin-react-hooks` |
        | Prettier | 3 |
        | tsx | 4 |
        | fast-check | 3 |
        | pure-rand | 6 |
        | `vite-tsconfig-paths` | — |
    *   **tsconfig:** three files, `tsconfig.app.json` (DOM), `tsconfig.worker.json` (WebWorker) and `tsconfig.node.json`. Add `src/vite-env.d.ts`.
    *   **Lint:**
        *   `@typescript-eslint/no-magic-numbers` with ignore `[0, 1, -1, 2, 100]`, written in ASCII;
        *   `src/engine/constants.ts` and the generator are exempt;
        *   `no-restricted-imports` for the engine boundary.
    *   **Scripts:** `config:check` runs `tsx tools/configCheck.ts`, and the other tool scripts work the same way. Add `format:check` (`prettier --check .`).
    *   **CI order:**
        1.  setup-node 22, `npm ci`;
        2.  `npx playwright install --with-deps chromium`;
        3.  `config:check`, `typecheck`, `lint`, `format:check`;
        4.  `test --passWithNoTests`;
        5.  `build`, `test:e2e --pass-with-no-tests`;
        6.  `bench` and `npm audit`, report-only.

        Coverage thresholds apply from stage 2 onward.
    *   **Stage 0 placeholder:** `src/main.tsx`, rendering "Under construction".
    *   **Test globs:** Vitest includes `tests/{unit,property,reference}/**/*.test.ts`. Playwright uses `tests/e2e`.
    *   **Deploy:** `deploy.yml` runs on `workflow_run` of CI, completed with success on `main`. It uses `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`, with permissions `pages: write` and `id-token: write`, in the `github-pages` environment.
    *   **Repository name:** the author must supply it. It sets Vite's `base`. Proposed: `retirement-planner`.

### [Issue 35] [`egm-codebase-details`, `egm-implementation-readiness`, `egm-style`] - Severity: Major — Engine public API and signatures incomplete; benefit formulas unspecified
*   **Affected Scope:** Lines 915–933, 1018–1023
*   **Discrepancy Description:** (F10, F19, F20)
    *   `index.ts` exports less than the UI needs.
    *   The tax functions have no year or inflation context.
    *   `TaxableIncome` has no OAS field.
    *   The CPP survivor, OAS residence and deferral formulas are unspecified.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid. The formulas stay as sourced config values. The plan states their structure.
*   ***Proposed Edit:***
    *   **Context object:** every engine function takes a `YearContext { yearIndex, deflator, cfg }`.
    *   **`TaxableIncome`:** `{ pensionEligible, oas, cpp, otherOrdinary, eligibleDividends, foreignDividends, taxableGains }`, with a rule saying which sources fill each field.
    *   **`federal.ts`:** exports `federalTax(income, age, ctx)`. Ontario implements `Jurisdiction`.
    *   **Public exports from `index.ts`:**
        *   `runPlan`, `loadConfig`, `configStatus`, `normalizeInputs`, `toDisplay`;
        *   the types `PlanInputs`, `Result`, `YearRow`;
        *   `configDefaults`, for the override hints.
    *   **Formula structure, coefficients from config:**
        *   **OAS:** zero under the minimum residence years; otherwise `min(years, full) / full` × base × (1 + monthly rate × deferral months, capped).
        *   **CPP survivor benefit, survivor 65+:** a percentage of the deceased's pension, with the survivor's own pension plus the survivor benefit capped at the maximum.
        *   **CPP survivor benefit, survivor under 65:** a flat amount plus a percentage, with the same cap.

### [Issue 36] [`egm-implementation-readiness`, `egm-style`, `egm-codebase-details`] - Severity: Major — Test plan gaps; vague end-to-end assertions; subjective stage 8 criteria; fixture rules contradict
*   **Affected Scope:** Lines 597, 734, 1136–1237
*   **Discrepancy Description:** (F24, F29, F37, F6, S5#17, C#19)
    *   Many modules have no test cases.
    *   End-to-end assertions are vague, and the CUJ mapping is wrong.
    *   There is no way to inject a test config.
    *   The outside calculator is unnamed.
    *   "Without help" has no judge.
    *   "Agents never change fixtures" conflicts with fixtures added in later stages.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid.
*   ***Proposed Edit:***
    *   **Module tests:** a list of test cases for each module, with file names under `tests/unit/`.
    *   **End-to-end tests:** concrete assertions, one test per CUJ 1–6, plus a no-network test. The config notice is tested with a build where `VITE_CONFIG_SET=test`.
    *   **Tax fixtures:** produced by the author with TaxTips.ca's Ontario calculator, in the format `{ id, inputs, federalTax, ontarioTax, source, checkedOn }`.
    *   **Fixture rule:**
        *   Agents may create a fixture file only where a stage calls for one, and never modify an existing fixture.
        *   The author reviews `git diff tests/fixtures` before tagging each stage.
        *   Remove `CHECKSUMS.sha256` and `verifyFixtures.ts`.
    *   **Stage 8:** the author judges. A tester passes if, unaided, they complete a plan, name one cross-tab effect after changing one input, and state one tax-placement idea with a dollar figure from their own results.

### [Issue 37] [`egm-design`] - Severity: Nit — RRIF and LIF rules not mentioned
*   **Affected Scope:** Line 238
*   **Discrepancy Description:** The design doesn't mention three rules: no minimum in the year a RRIF opens, the younger-spouse age option, and the LIRA-to-LIF deadline at 71. (CR#30)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Worth a line each.
*   ***Proposed Edit:***
    *   No RRIF or LIF minimum applies in the year the account opens.
    *   A LIRA must convert by the end of the year the owner turns 71; this is a validation rule.
    *   Using the younger spouse's age for the minimum is a non-goal.

### [Issue 38] [`egm-comprehension`, `egm-style`] - Severity: Nit — Jargon and private references
*   **Affected Scope:** Lines 136, 189–190, 368, 779–782, 852–853; acronyms throughout
*   **Discrepancy Description:** (C#11, C#12, C#14, C#15, F41)
    *   Acronyms are never expanded.
    *   "Admin" is never defined.
    *   "Square-root scale" and "25% survival" are opaque.
    *   "§" references point into a private file.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** A human reader needs these.
*   ***Proposed Edit:***
    *   Add a short `## Glossary` that expands every acronym and defines "admin" (the author, for now).
    *   Spell out the two defaults.
    *   Replace "§" references with one-line summaries.

### [Issue 39] [`egm-style`, `egm-structural`] - Severity: Nit — Wording and calibration
*   **Affected Scope:** various
*   **Discrepancy Description:** (CR#32, CR#36–CR#50, CR#52–CR#54, F30, F31, F33, F34, F36, F38–F40)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** These are cheap clarity fixes.
*   ***Proposed Edit:***
    *   Use one test-group definition: "the author and two friends".
    *   Change "three reasons" to the correct count.
    *   Calibrate unverifiable claims.
    *   Date the claims about named products ("as of November 2026").
    *   Define "mechanical default" once.
    *   Remove the duplicate of O23.
    *   Say that explanations are fixed templates.
    *   Say what the refusal message for a newer file contains.
    *   Add "after the browser cache expires" to the rollout wording.
    *   Renumber 62a.
    *   Give the minimum glossary term list.
    *   Add placeholder disclaimer text, in `src/ui/content/disclaimer.ts`.
    *   Give the stage for each engine file.
    *   Drop the redundant "before stage 2" sentence.
    *   Use the licence wording from F38.
    *   Remove the duplicated rules.
    *   Split the heading that combines advice wording and spending categories.

### [Issue 40] [`egm-structural`] - Severity: Nit — Heading names, Open Questions placement, horizontal rules, Problem section format
*   **Affected Scope:** Lines 7, 23–48, 92, 139, 542, 574, 593
*   **Discrepancy Description:** (CR#34, CR#35, CR#36 partly)
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** The layout, including Open Questions after Non-Goals and the horizontal rules, follows the EGM design template the document was drafted from. Changing it gives no benefit to a reader.

### [Issue 41] [`egm-structural`, `egm-zoom-out`] - Severity: Nit — Diagram alignment, duplicated statements, code-level details
*   **Affected Scope:** Lines 158–191, 296, 360–395, 1054, 1122–1125
*   **Discrepancy Description:** (CR#33, CR#38, S5#19)
*   ***AI Suggestion:*** PROPOSE FIX (diagram, duplicates); DECLINE (code-level details)
*   ***Justification:*** The details at those lines (debounce, comma formatting) help an implementer, and the implementation plan is where they belong. The diagram and duplicates are cheap fixes.
*   ***Proposed Edit:***
    *   Realign the ASCII diagram.
    *   State the performance target, persistence rules, CSP and disclaimer placement once each, and cross-reference them elsewhere.

### [Issue 42] [`egm-inventive-catalyst`] - Severity: Nit — Unit conversion assumes fixed inflation; cross-browser floating-point differences
*   **Affected Scope:** Lines 61, 204, 589, 675
*   **Discrepancy Description:** (S5#11, S5#13)
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** Random inflation is a future improvement, and the deflator in Issue 14 already isolates it. G4 is narrowed to one browser (Issue 30), so a port of fdlibm isn't needed.

---

## Counts

| Suggestion | Count | Issues |
|---|---|---|
| PROPOSE FIX | 33 | |
| PROPOSE FIX — AUTHOR DECIDES | 7 | 3, 10, 15, 16, 21, 24, 34 |
| CONTEST | 3 sub-points | 19, 27, 28 |
| DECLINE | 3 | 40, 42, and part of 41 |
