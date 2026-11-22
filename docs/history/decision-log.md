# Prototype decision log

Decisions made while building the single-file prototype, kept as background. Personal figures are
left out. **Superseded:** where this log and [the design](../designs/retirement-planner.md)
disagree, the design wins. See also the [post-mortem](prototype-postmortem.md).

## Product

-   A browser-based retirement projection for Canadians. The user enters savings, pensions,
    government benefit assumptions and a spending plan; the tool projects year-by-year income by
    source and balances to life expectancy, and shows where money runs out.
-   The input vocabulary came from the Government of Canada's Canadian Retirement Income
    Calculator. Its *concepts* were used, but not its values as defaults.
-   **Three spending phases** (active, slower, late) instead of one flat amount. Kept in the
    rewrite.
-   **No fields that calculations don't use.** Kept.
-   **Inputs in the order of the mental model:** who you are, what you have, what you'll get, what
    you'll spend, assumptions, run. Kept, as the Household tab plus three planning tabs.
-   **Charts:** stacked balances over time (the top line is the total portfolio), income by source
    against the spending target, and a guaranteed-income view. Carried into the rewrite as the
    balances, income and tax charts.

## Collaboration preferences

-   Plain explanations that keep the nuance.
-   Blunt, objective critique; no flattery.

## UX decisions

-   Labels directly above their inputs, aligned on a shared grid. Kept.
-   Currency inputs with live comma formatting that keeps the cursor position. Kept.
-   Segmented controls for choices. Kept, built from real radio inputs for keyboard access.
-   Inline warnings that don't shift the layout. Kept.
-   Five colour themes and mobile-first layout. **Dropped** for version 1.
-   Couple mode as the default. Superseded: version 1 is couples only.

## Architecture decisions (prototype)

-   Single HTML file with Chart.js from a CDN. **Replaced** by a bundled Vite/React build with no
    CDN.
-   Capture inputs, then a pure projection, then rendering. **Kept** as the engine/store/screens
    split.
-   Constants as named objects in code. **Replaced** by the sourced config.
-   Scenarios stored as input snapshots and recomputed on demand. Replaced by "compare to last
    run" and the built-in comparison variants.

## Calculation decisions (all superseded)

The prototype used a shared CPP/OAS start age, a 50/50 couple tax split, a fixed withdrawal order,
fixed returns, inflation measured from retirement, and approximate brackets without credits. Every
one of these is replaced in the design.
