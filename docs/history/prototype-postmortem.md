# Prototype post-mortem

The first version of this planner was a single-file HTML/JavaScript prototype, built and
patched in conversation with an AI assistant over about 30 rounds. This document records what went
wrong, so the rewrite doesn't repeat it. Personal figures from the original record are left out;
the full record is kept privately by the author.

**The prototype's calculation model is superseded** by
[the design](../designs/retirement-planner.md). Nothing in this document is a specification, and
none of the prototype's constants should be reused; several were wrong.

## What happened

1.  **Early versions:** a single input form, one chart and one spending figure; CPP and OAS for one
    person only.
2.  **Features added round by round:** an employer pension, a shared CPP/OAS start age, colour
    themes, test defaults, then a stacked balance chart and an income-by-source chart.
3.  **Two critique rounds:** inflation, after-tax gross-up, OAS clawback, RRIF minimums, depletion
    alerts, custom CPP, validation, scenarios, a real-return helper and a guaranteed-income chart.
4.  **Couple mode:** per-person government benefits and RRSPs, plus a combined RRSP readout.
5.  **A refactor:** named constants, pure functions, chart lifecycle handling, responsive grids.
6.  **Another round:** a couple tax split, a "funded to age" metric, an effective-tax readout,
    survivor mode, inline warnings.
7.  **Regression spiral.** Repeated in-place patches to the withdrawal loop produced duplicate
    statements, an undefined variable error, and charts that no longer matched the spending
    targets. Each time, the root cause was mixing today's dollars and future dollars in the same
    loop.
8.  **No way back.** A request to "reset to version 25" couldn't be met, because no version history
    existed. The loop was rewritten instead, and that rewrite dropped tax from withdrawals.

## Root causes

-   **Units were never defined.** Today's dollars and future dollars were mixed inside one loop.
-   **Patching instead of rewriting.** A numeric loop was edited in place, round after round.
-   **Nothing was ever run.** "Verification" was reading the code. No automated tests existed.
-   **Constants from memory.** Tax and benefit values were typed in from the assistant's memory and
    were wrong or out of date: the lowest federal rate entered as 0%, an older year's clawback
    threshold, an incorrect RRIF table.
-   **No version history.**

## Defects at the end (summary)

In order of impact:

1.  Tax effectively dropped from withdrawals, so savings needs were understated.
2.  A responsive-layout bug that crushed inputs on phones.
3.  The OAS clawback based on estimated, not actual, taxable income.
4.  No trustworthy baseline version; the final loop was never executed.
5.  An incorrect RRIF minimum table.
6.  "Today's dollars" exact only at the retirement date.
7.  Couple mode only half built (household pots for TFSA, non-registered and DC; minimal survivor
    handling).
8.  No OAS increase at 75.
9.  A 0% lowest federal tax bracket.
10. The DC pension modelled as a freely drawable pot instead of a LIRA/LIF.
11. No DB pension, other income or one-time events.
12. Simplified contribution timing and no contribution-room checks.
13. Fixed returns, so no sequence-of-returns risk.
14. Chart colours not adapted to the dark theme.
15. Accessibility gaps (hidden radio inputs, charts without text alternatives).
16. A hard-coded valuation year.
17. No disclaimer.

## How the rewrite addresses them

| Lesson | Where the design handles it |
|---|---|
| Define units | Future dollars only in the engine; conversion in one place; lint rule |
| Rewrite, don't patch | `AGENTS.md` rule |
| Run tests | Outside tax fixtures, reference plan, property tests, runtime invariants, CI |
| No constants from memory | Config with sources, fetched twice, validated by the admin |
| Keep history | Git, with a tag at each stage |
