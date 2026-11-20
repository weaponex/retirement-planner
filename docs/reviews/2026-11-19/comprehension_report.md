# Comprehension Report (Stage 6)

**Target:** `docs/designs/retirement-planner.md` (FeatureRange 1-1040, DetailedRange 1041-1709)
**Date:** 2026-11-19
**Reviewer:** `egm-comprehension` (completed). The reviewer read the document alone: no
document standard and no context files.

## What this proposes

The document proposes a free retirement planner for an Ontario couple. It runs entirely in a
desktop browser, and nothing the user enters leaves the browser. The user fills in five input tabs:
Household, Savings, Spending, Withdrawals and Estate. A TypeScript engine in a Web Worker then
recalculates the whole plan 500 ms after each edit. It works year by year, in future dollars, at
fixed returns for each asset class (FP Canada figures by default). It computes federal and Ontario
tax for each spouse, pension splitting, the OAS clawback, RRIF and LIF rules, both deaths and
probate.

Results come back in today's dollars against two goals: is spending covered every year, and is the
after-tax legacy goal met. The results also include threshold warnings with computed "nudge" tips,
and comparisons that pair lifetime tax with money left. Those comparisons cover a placement preset
against a same-mix-everywhere baseline, and all four withdrawal strategies side by side. One of the
four, "Let the planner pick", searches a fixed list of options.

Every rule value lives in a sourced, versioned config file per tax year. The user can override any
value in Settings, and overrides are saved with the plan. Correctness rests on outside tax
fixtures, a reference plan built by a separate AI session, property tests and runtime invariants
that block results when they fail. The build runs in stages 0-8, ending with tests by the author
and two friends.

## How the existing system works, per this document

There is no working system. An earlier single-file prototype failed: it mixed today's and future
dollars, lost tax on withdrawals, was never tested and had wrong constants. It is being discarded,
and only its decision log is kept as history in `docs/history/`. Other options fall short: the
government calculator treats CPP, OAS and savings separately, paid tools store data on servers and
don't explain trade-offs, and spreadsheets need specialist knowledge. The repository already has
the gitignore, licence, review history and private context file. The Known-gaps table and the stage
table suggest stage 0 (config and tax fixtures) is done and stage 1 tax work has started, but the
document never says which stage is current.

## Findings

No Blockers, 5 Majors, 6 Nits. The reviewer could paraphrase every section, and the overall
proposal and its reasons can be understood from the document alone.

### 1. Major: open review findings can't be understood without the external reports

- **Where:** Known gaps from review, lines 1065-1097, especially SR1-M12 (1094), SR1-M13 (1095),
  FR-M16 (1070), FR-M17 (1071), FR-M18 (1072), M1 (1074), M3 (1078), M2 (1080) and SR1-M2 (1084).
- **Problem:** many open rows name a gap without saying what it is:
  - SR1-M12: "Three gaps in the mitigations" (which three?);
  - SR1-M13: "Undecided items with no open question or gate" (which items?);
  - FR-M18: "Return terminology ('compound' vs 'average'); the on-screen label" (what is the
    problem?);
  - M2 cites `VITE_CONFIG_SET=test`, which appears nowhere else in the document.
- **Why it matters:** the table says each Major "must be fixed in this document before the stage
  named below starts". A reader with only this document can't tell what needs fixing, or whether a
  later edit has already fixed it.
- **Fix:** give each open row a self-contained statement of the gap.

### 2. Major: the planner's dollar levels don't match the two named bracket levels

- **Where:** lines 424, 431, 547, 616-619 and 140 (O31).
- **Problem:** "Fill lower brackets first" now has only two levels, "Top of the first bracket" and
  "Just under the OAS clawback". Line 424 says this "replaces a dollar target per spouse", and the
  data contract allows only `'first_bracket' | 'oas_threshold'`. But "Let the planner pick" runs
  that strategy "at each level in `planning.planner_search`", with a placeholder of $40,000 to
  $110,000 in $5,000 steps (line 547). The document doesn't explain:
  - how a dollar level relates to the two named levels;
  - how a pick such as "$75,000" is shown on the cards or in "Learn more";
  - what "Use this strategy" stores when the pick is a dollar level that `bracketLevel` can't hold.
- O31 is open on range and step. This mismatch is a separate question that O31 doesn't cover.

### 3. Major: where a DC pension or "workplace pension account" goes is unclear

- **Where:** line 16 (Overview), the Accounts section at lines 367-377, glossary line 1008, and O9
  at line 118.
- **Problem:** the Overview lists "workplace pension accounts" as an account kind next to
  RRSP/RRIF, TFSA and non-registered. But the Accounts types are RRSP, LIRA, TFSA, non-registered
  and DB pension, and the Savings tab's "Workplace pensions" section holds DB pensions only. The DC
  route is spread across three places:
  - the glossary says a DC pension "becomes a LIRA when the member leaves";
  - O9 says "DC pension as LIF";
  - the Accounts section never says how to enter one.
- A reader, or a tester with a DC plan still held by an employer, can't tell where that money goes.
- **Fix:** say explicitly that DC money is entered as a LIRA, and what happens to a DC plan still
  held by the employer.

### 4. Major: change history and review IDs make the design text hard to follow

- **Where:** throughout lines 1-1040, for example line 6, line 88 ("(SR1-M3)"), line 281
  ("(SR1-M10)"), line 347 ("FR-M10"), line 359 ("TC-1"), lines 370-372 ("FR-M4", "FR-M9"), line
  383 ("FR-M11"), line 405 ("M15, FR-M5") and line 412 ("SR1-M7").
- **Problem:**
  - **Undefined IDs.** Review IDs (M#, FR-M#, SR1-M#, SR-#, TC-1, R1-F16) appear inline from the
    Success Criteria onward. They are explained only in the Detailed range's Known-gaps table, one
    line each, and the scheme behind them is never defined.
  - **Changelog clauses.** Most decisions carry phrases like "(revised 2026-11-19, author,
    replacing …)". The reader has to keep the old design in mind to read the current one.
  - **Alternatives that were chosen.** Alternatives B and C (lines 790-800) were in fact chosen, but
    they sit under "Alternatives Considered". Their Cons still argue against the current design, for
    example "would make inputs sluggish".
  - **Retired concepts.** Alternative L (line 856) still refers to removed concepts: "generated
    returns plus named stress paths".
- Nothing here is undefinable. But the current design is hard to tell apart from its history.
- **Fix:** move the provenance tags into a single change-log section or a footnote convention. Put
  the chosen options (B, C) in the design itself rather than among the alternatives.

### 5. Major: data contracts and test specs contradict the stated rules

- **Override shape:** line 307 says a `ruleOverrides` entry is `{ value, defaultTaxYear }`, but the
  data contract at line 620 says `ruleOverrides?: { [ruleKey]: value }`.
- **Indexing in tests:** lines 281 and 1394 say indexed rule values grow with `ruleFactor(year)`,
  counted from the defaults' tax year and "separate from the display deflator". But the
  `ontario.test.ts` spec at line 1655 says indexed bracket rows "grow with `ctx.deflator`".
- **`YearContext`:** line 1401 defines it as `{ yearIndex, deflator, cfg }` without `ruleFactor`,
  although line 1394 says "`YearContext` gains `ruleFactor`".
- A reader can't tell which version is authoritative. The test spec in particular would test the
  indexing rule that SR1-M10 replaced.

### 6. Nit: "stage" means two different things

- **Where:** line 6 and line 1045 versus lines 129-140 and 1101-1113.
- "Stages 5-9" and "Stage 9 re-run" refer to EGM review stages. "Needed before stage 5", "built in
  stage 4" and so on refer to build stages 0-8.
- EGM and "goldfish" are never defined.
- In the Open Questions, stage gates appear before the stage table (line 1101) defines them, and
  there is no link to it.

### 7. Nit: forward references to things defined later

- Line 130, line 682 ("file 18"), line 1099 ("file 13") and line 1049 ("file 12") point to the
  numbered file list in the Detailed range.
- Line 274 names the `src/engine/solver`, `project` and `simulate` folders before any module layout
  has been given.
- Line 1387 adds `read.ts`, which is never introduced.
- The file headings at lines 1375 and 1440 leave out files their bodies define (`overrides.ts`,
  `read.ts`, `returns.ts`).

### 8. Nit: undefined or unlinked outside references

- "CANSIM V122487 rate" (line 372) is never explained.
- "FP Canada" and "FP Canada Projection Assumption Guidelines" (lines 19 and 556, and the Additional
  Resources list at line 1025) have no link and no one-line description.
- "TaxTips.ca" (lines 363 and 1615) has no link.
- FSRA policy "L200-303" (line 373) has no link.
- The Additional Resources list (lines 1022-1026) names sources but gives no URLs, apart from the
  brief.

### 9. Nit: undefined or mismatched terms

- "Plan-to age" (lines 254 and 499) is used as a synonym for "life expectancy target" without
  saying so.
- The DB "bridge" amount (line 377) is never explained: a temporary top-up paid until CPP or OAS
  starts.
- The glossary defines "Asset location vs allocation", but the document's own word is "placement"
  (lines 409-418).

### 10. Nit: small internal inconsistencies

- The Decisions table says "2-3 named presets" (line 188), but the design has two (lines 415 and
  551-554).
- `makeRuleFactor(cfg, planStartYear)` (line 1394) takes `planStartYear`, but its formula never
  uses it.

### 11. Nit: the Review header paragraph is overloaded

- **Where:** line 6.
- The paragraph packs three review rounds, three report paths, prefix conventions and a summary of
  the redesign into one sentence chain. A new reader learns more from the Overview.
- **Fix:** a short status line plus a link to Known gaps.
