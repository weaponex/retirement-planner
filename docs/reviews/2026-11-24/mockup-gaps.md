# Stage 5 against the mockups

The stage 5 screens were built from the design's written descriptions without the author's
mockup canvas ([docs/designs/mockups/](../../designs/mockups/)). This list compares every mockup
screen with the built app, content and look, so each difference is closed before `stage-5` is
tagged (Known gaps B5-2). Items the design overrides are listed in the design's
[Where the mockups are overridden](../../designs/retirement-planner.md#where-the-mockups-are-overridden)
and are not repeated here. `[x]` marks a closed item.

All items closed 2026-11-24: each screen was rebuilt from its mockup and checked side by side in the browser; the screen tests and the five journeys pass against the new screens.

## Every screen

- [x] Look and feel: fonts, colours, cards, inputs, buttons, pills (design: Look and feel).
- [x] Header: app name; the household's names ("Alex and Sam"); the tax-year chip; Load sample plan, Import, Export (disabled until stage 7) and Settings as bordered buttons.
- [x] Tab bar: white, current tab underlined and bold; the Results badge amber.
- [x] Content in a centred column up to 1280 px; white footer with the disclaimer.

## First run (`FirstRun`)

- [x] An empty plan opens on a welcome screen: "Plan your retirement as a couple in Ontario", one paragraph on what the planner does, and Start your plan, Load sample plan, Import a saved plan (the last two in stage 7), with "Your plan stays in this browser… Export it to keep a copy."
- [x] The dialog: "Before you start", the disclaimer, "Tax and benefit amounts start at 2026 values. You can change them in Settings.", a dark "I understand" button.

## Household (`Main`)

- [x] One card per spouse, titled Spouse 1 and Spouse 2.
- [x] Fields in pairs: birth (month and year) with sex at birth (a select); retires in with life expectancy target; CPP at 65 (monthly estimate) with years in Canada by 65; tax rate while working with after-tax pay (yearly).
- [x] The note under the target: "Default: the age a man of 63 has a 25% chance of reaching (FP Canada 2026). A lower age raises the risk of outliving the plan."
- [x] The note under CPP: "From My Service Canada. That estimate assumes you keep contributing to 65. How to adjust it. Full OAS needs [full years] years after age 18", the years read from the config.

## Savings (`Investing`)

- [x] Intro: "Open a section to change it. The line beside each title sums up what's inside."
- [x] Section headers: a chevron, the title, a summary in several parts, and "Open" or "Close".
- [x] Accounts as one table (type, owner, balance, yearly saving, details such as "Becomes a RRIF at 71", Edit) with one "Add account" button; Edit opens the account's fields.
- [x] The strip "New TFSA room each year: $7,000 (2026) · Edit".
- [x] Pensions: "Add pension"; fields owner (select), yearly pension, starts at age, bridge, bridge until, indexing (select), survivor gets.
- [x] Mix: the explanation paragraph; "Start from" as a pill choice; the coloured bar with stock, bond and cash totals; rows grouped "Stocks" and "Bonds and cash" with a colour dot; each row's return in an input showing its value; the note on FP Canada's returns; tiles Total, Expected return before fees, After fees, Inflation (with Edit).
- [x] Fees: title, "What you pay in fund fees and advice… Fees compound like returns, so this matters.", choices showing each level's value, the note linking Settings.
- [x] Rebalance: "Rebalance once a year back to this mix. Without it, the mix drifts toward whatever grew fastest."
- [x] Shapes as three cards with a line drawing (dashed line at retirement), name and one line; the note under them.
- [x] Placement as two radio cards with a description; the comparison box "Compared with the same mix in every account" with the legacy difference large, the tax difference under it, and "Why".

## Spending (`Spending`)

- [x] One card titled "Monthly spending, after tax" with its explanation, and the pill choice By category / One total on the right.
- [x] One total: a large input with "Not sure? Switch to By category to add it up."
- [x] Category groups as rows that open one at a time: name, "N of M used", the group total, Edit or Done; a pill when a category differs later.
- [x] Each category: amount "/mo" right-aligned; "Slower $x · Later $y · Different later?" or the two override inputs with "Use the usual change".
- [x] Phases as three cards: Active years (dark border), Slower years and Later years with "From year" inputs and the slider, a large monthly figure and the yearly one.
- [x] Strip "Spending grows with inflation of 2.1% a year (FP Canada 2026) · Edit".

## Withdrawals (`Withdrawals`)

- [x] CPP and OAS start ages as selects, with strips stating the ranges and adjustments and the full OAS amount.
- [x] Converting: one field per RRSP and LIRA, the unlock checkbox, and the strip on the latest conversion and the RRIF minimum at 71 with "See table".
- [x] Splitting: one paragraph with the share and age from the config.
- [x] A card titled "Which accounts pay for your spending" with its line of explanation.
- [x] Strategy cards: name, description, "Lifetime tax", "Left after tax", the differences, "To TFSA · Clawback years"; "Learn more" as its own button.
- [x] Options row: for Fill lower brackets first, two pressed-style buttons with each level's amount and Edit; for Early RRSP drawdown, the years and whose benefits end them.
- [x] The income chart as drawn: coloured source bands with their names on them, the dashed spending line, the hatched red tax band and hatched green TFSA band; the "i" button with its explanation and "Got it"; "Drag to look at a year" under the slider.
- [x] The breakdown titled "year · ages a / b", each row with its colour swatch.
- [x] The Learn more dialog: name and tagline, the blocks, pros and cons side by side, "When it makes sense" as a list, the note, "In your plan: …" with this plan's numbers, Close and Use this strategy.

## Estate (`Estate`)

- [x] Card "When one of you dies": the line naming who dies first and when; the survivor share with its note; the grey box "What the plan does at the first death" with its four points.
- [x] Card "What you leave behind" with "Measured after the second death, after all taxes and probate, in today's dollars"; legacy goal and home value side by side with their notes.
- [x] Strips: "Ontario probate: $15 per $1,000 of estate value above $50,000 · Edit", beneficiaries, the final return.

## Results (`Results`)

- [x] The top line "All amounts in today's dollars, assuming deaths at the target ages (Alex 94, Sam 96) and the same return every year" with the status as a pill.
- [x] "Your goals" heading; each goal card with "GOAL 1"/"GOAL 2", a ✓ Met or Missed pill, a title ("Spending covered every year"; "Leave $400,000 after tax"), the sentence with years and names, the year strip with first and last year under it, the legacy bar with $0, goal and value labels, and the links "Change spending" and "Change goal".
- [x] The summary row: lifetime tax, clawback years, "Last change: …".
- [x] Charts card: "Today's dollars · [strategy]", the chart tabs as a pill group, a legend, and a caption under each chart summing it up.
- [x] Money runs out: a banner "Money runs out at [name]'s age [n], before the second death."
- [x] Error: "The calculation failed a safety check", "No results are shown because they could be wrong. This is a bug in the planner, not in your plan.", the details, Copy details and Export plan (stage 7).

## Settings (`Settings`)

- [x] Its own header: app name, "Settings", "Back to plan".
- [x] Title "Tax and benefit rules", the introduction, and "Reset all to 2026 defaults".
- [x] "You've changed N values from their defaults: [names]. Reset."
- [x] Plain names for every value, never config keys; sources as a link per value.
- [x] Income tax: the federal and Ontario brackets as two small tables; credits and rules as one table with Federal and Ontario columns.
- [x] OAS, CPP, and Accounts and pensions as labelled fields in a grid, with notes such as "January 2026 · grows with inflation" and "Changed · default $95,323".
- [x] Savings assumptions: returns and inflation as a table, the fee levels as a table.
- [x] The RRIF minimum table as a grid of "age · rate"; the LIF maximum and unlock.

## Updating and error states (`States`)

- [x] "Updating…" as a pill with a dot; faded old figures.
- [x] The Results badge "Updating", "Short from [year]" and "Error" as in the mockup.
