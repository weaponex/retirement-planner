# Closed and withdrawn Known gaps

Moved out of the design's [Known gaps from review](../../designs/retirement-planner.md#known-gaps-from-review) table on 2026-11-24, when it was cut down to open rows only. Rows closed that day: FR-M5 (`yieldWarnings` built in stage 2), FR-M16 (the readout was cut), SR1-M3 and SR1-M5 (the planner was cut), and FR2 (the second full review, triaged with the author). FR2-E and FR2-N were closed later the same day by the editorial pass.

| Finding | Gap | Close before |
|---|---|---|
| ~~M8~~ | Fixed: deploy requires a push event from this repository (file 12) | — |
| ~~M10~~ | Fixed: `.prettierignore`, ESLint `ignores`, `"type": "module"` (files 3, 9) | — |
| ~~M12~~ | Fixed: file 16 marked "Exists — keep" with the full list | — |
| ~~M9~~ | Fixed: the Config contract's key tree is the complete list; `config:check` makes `SOURCES.md` match `keys.ts`, and the design is kept in step by hand | — |
| ~~M7~~ | Fixed: persisted ids defined; `holdings` replaced by non-registered `positions` | — |
| ~~M17~~ | Fixed: cross-references now name `docs/history/` (file 18) | — |
| ~~M18~~ | Fixed: `constants.ts` is the only exempt file and holds `MONTHS_PER_YEAR`; `ignoreNumericLiteralTypes` set (files 9, 23) | — |
| ~~M16~~ | Fixed: `clawback` and `pairId` fields; `income` is after the split (file 52) | — |
| ~~M5~~ | Fixed 2026-11-19: lifetime tax summed year by year in today's dollars, alongside the nominal sum ([Result definitions](../../designs/retirement-planner.md#result-definitions)); decided by the author | — |
| ~~M6~~ | Fixed 2026-11-19: pro rata across both spouses, LIF cap overflow to the owner's RRSP/RRIF then the other spouse, unconverted RRSP drawable, LIRA never drawn | — |
| ~~M13~~ | Fixed 2026-11-19: both directions, 21 points, tie rule | — |
| ~~M15~~ | Fixed 2026-11-19: sheltered yields reinvested, net of foreign withholding (year solver step 4, `reinvestYield`) | — |
| ~~FR-M4~~ | Fixed 2026-11-19: new key `federal.rrif.min_factor_base_age`; last row used above 95; tests at 60 and 70 | — |
| FR-M5 | The capital-loss rule and carry-forward are in the design (loss rule decided by the author). The `config:check` warning for a yield above its return (`yieldWarnings`, file 51) is built in stage 2; the 2026 bond values trigger it | Stage 2 (during) |
| ~~FR-M6~~ | Fixed 2026-11-19: `invest/returns.ts` `classReturns`; override before fees; fee subtracted (decided by the author); 0.5-point margin cited (PAG 2026 section 3 d) | — |
| ~~FR-M9~~ | Fixed 2026-11-19: greater of table × start balance and last year's earnings; no pro-rating (conversion at January 1); last row above 90; assumes the CANSIM V122487 rate is 6% or less | — |
| ~~FR-M10~~ | Fixed 2026-11-19: basic Ontario tax and the order of surtax, dividend credit, Tax Reduction and Health Premium are in [Tax scope](../../designs/retirement-planner.md#tax-scope-o11), checked against Form ON428 and the 21 TaxTips.ca cases | — |
| ~~TC-1~~ | Fixed 2026-11-19: the basic personal amount's reduction at high income uses `federal.credits.basic_min`, validated by the author 2026-11-19 | — |
| ~~FR-M11~~ | Fixed 2026-11-19: cap at `federal.cpp.survivor.max_combined` (decided by the author); `SOURCES.md` URL now matches the JSON entry | — |
| FR-M16 | The placement figure mixes a tax effect with holding more stock after tax; the stock-share readout's purpose and the risk row need rewording | Stage 4 |
| ~~FR-M19~~ | Fixed 2026-11-19: the unused `schedule` kind is removed from the design, `keys.ts` and `schema.ts`; the `brackets` comment shows `indexed?`; the `list` kind is in the Config contract | — |
| ~~M11~~ | Withdrawn: no random generator (fixed returns, 2026-11-18) | — |
| ~~R1-F16~~ | Withdrawn (round-1 finding F16, goldfish issue 17; mislabelled "G3" until FR-M20): FP Canada's guidelines lower equity returns by 0.5 point and tell simulations to add it back when converting to an arithmetic mean. Fixed returns use the compound figures directly, so nothing is added back | — |
| ~~M14~~ | Withdrawn: no paths or typical-path ranking | — |
| ~~SR-1~~ | Fixed: focused review done (`docs/reviews/2026-11-19/focused_review_report.md`, "Ready with fixes"); its open findings are below, prefixed `SR1-` | — |
| ~~SR-2~~ | Fixed: `keys.ts`, `SOURCES.md` and the 2026 config follow the key tree, including the shape, nudge-step and yield entries (SR1-M1). The fetch candidates in `private/` still use the old keys | — |
| ~~SR1-M1~~ | Fixed: `planning.shapes` holds stock changes (validated 2026-11-19; O26 resolved); the bracket-target nudge step is removed; the six yields are sourced as author decisions | — |
| SR1-M3 | Measurement point fixed 2026-11-19: from the end of the 500 ms pause everywhere, and a per-run timing log from stage 2. Still open: tips under "Let the planner pick", and reuse of identical planner runs | Stage 4 |
| ~~SR1-M4~~ | Fixed 2026-11-19: draw-down years, fill-up spouse rule, no-draw-down case, working spouse | — |
| SR1-M5 | "Let the planner pick": options, ranking, tie rule (with O31) | Stage 4 |
| ~~SR1-M6~~ | Fixed 2026-11-19: net income before splitting, no margin, step 4 reordered, indexing from the tax year | — |
| ~~SR1-M7~~ | Fixed 2026-11-19: change measured from the plan start; clamping fallbacks; fractions in the engine | — |
| ~~SR1-M9~~ | Fixed 2026-11-19: which keys, units, validation (`overrides.ts`), stale and imported overrides | — |
| ~~SR1-M10~~ | Fixed 2026-11-19: indexed values are rebased once from their tax year to the plan start (`rebaseConfig`); overrides store their default's tax year; risk row and admin guide updated | — |
| ~~SR-3~~ | Fixed 2026-11-19: covered by the FR-M6 fix | — |
| FR2 | The second full review (2026-11-19, `docs/reviews/2026-11-19/`) left its feature-spec findings unresolved: `zoom_out_report.md` (12 Major), `comprehension_report.md` (5 Major), `critic_report.md` (23 Major) and `intermediate_zoom_out_report.md` (7 Major), overlapping. Those touching stage 2 were folded into the implementation-plan fixes; the rest, including how the final return relates to that year's ordinary return, the stock-share readout above 100%, the Worker's security policy, two open tabs, and the scope cuts (planner, override scope, readout), are to be triaged | Stage 3 |
| ~~FR2-E~~ | Fixed 2026-11-24 in the editorial pass after stage 3: The editorial pass from the second full review (T16): history and review ids out of the rules; Alternatives B and C rewritten as the options actually rejected, L and M deleted; one Screens section; one name per concept (for example "life expectancy target", "after-tax legacy"); the glossary (terms users see only); and the wording, layout and link Nits in `docs/reviews/2026-11-19/` | — |
| ~~FR2-N~~ | Fixed 2026-11-24 in the editorial pass after stage 3: Implementation-readiness round 2 Nits left for the editorial pass: define the C1-C4 decision tags; reword "the Stage 9 re-run" in the Known gaps sources; the M3 wording; one form for file-header labels | — |
| ~~FR-M17~~ | Fixed 2026-11-24 (author): "Money runs out" becomes a near-miss warning (balances below 3 years of spending before the second death, while spending is covered); a "returns 0.5 point lower" nudge for its tips; one sentence on real markets added to the Goal 1 label and the disclaimer placeholder | — |
| ~~SR1-M11~~ | Fixed 2026-11-24 (author): the `Result`, `Tips` and `EngineError` contracts in Data contracts; Goal 1 from the first retirement to the second death; legacy status with `no_goal`; the Estate chart with one final-return tax bar; the year-one sale tax measured by re-solving year one and left out of the placement comparison | — |
| ~~M1 (Result part)~~ | Fixed 2026-11-24: the `Result` contract is defined; `warningFacts` stays open for stage 6 | — |
| ~~FR-M7~~ | Fixed 2026-11-24 (author), stage 5 preparation: the life expectancy default is filled once, from planStartYear − birth year, never over a typed value; the last row above 100 (Design values) | — |
| ~~FR-M13~~ | Fixed 2026-11-24 (author), stage 5 preparation: the life-expectancy lookup test is planned in defaults.test.ts (file 56) | — |
| ~~FR-M18~~ | Fixed 2026-11-24 (author), stage 5 preparation: "fixed compound return" in the design; "the same return every year (FP Canada's long-run estimate)" on screen; "Compound return" in the Glossary | — |
| ~~M2~~ | Fixed 2026-11-24 (author), stage 5 preparation: closed without a test config build; the e2e config-notice check uses the bundled config | — |
| ~~M3~~ | Fixed 2026-11-24 (author), stage 5 preparation: coverage targets: 80% branches for src/state and src/worker, 70% for src/ui with React Testing Library | — |
| ~~M4~~ | Fixed 2026-11-24 (author), stage 5 preparation: happy-dom for the store, save and screen tests | — |
| ~~SR1-M2~~ | Fixed 2026-11-24 (author), stage 5 preparation: readyToRun in the store, the "Incomplete" badge and missing list, every action raises the revision, older tips dropped, "Finding tips…", edits named or counted, no summary after a load | — |
| ~~SR1-M8~~ | Fixed 2026-11-24 (author), stage 5 preparation: category ids listed on the Spending tab; mode switching keeps both sets; year 0 is the first retirement; the spending.active ±5% nudge | — |
| ~~SR1-M12~~ | Fixed 2026-11-24 (author), stage 5 preparation: "Registered last" is the default; only the legacy difference is coloured, neutral when the two move in opposite directions | — |
| ~~SR1-M13~~ | Fixed 2026-11-24 (author), stage 5 preparation: its remaining items (SR1-M2, SR1-M8, SR1-M12) are closed | — |
