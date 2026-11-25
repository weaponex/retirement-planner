# Stage 5 against the mockups

The stage 5 screens were built from the design's written descriptions without the author's
mockup canvas ([docs/designs/mockups/](../../designs/mockups/)). This list compares every mockup
screen with the built app, content and look, so each difference is closed before `stage-5` is
tagged (Known gaps B5-2). Items the design overrides are listed in the design's
[Where the mockups are overridden](../../designs/retirement-planner.md#where-the-mockups-are-overridden)
and are not repeated here. `[x]` marks a closed item.

## Every screen

- [ ] Look and feel: fonts, colours, cards, inputs, buttons, pills (design: Look and feel).
- [ ] Header: app name; the household's names ("Alex and Sam"); the tax-year chip; Load sample plan, Import, Export (disabled until stage 7) and Settings as bordered buttons.
- [ ] Tab bar: white, current tab underlined and bold; the Results badge amber.
- [ ] Content in a centred column up to 1280 px; white footer with the disclaimer.

## First run (`FirstRun`)

- [ ] An empty plan opens on a welcome screen: "Plan your retirement as a couple in Ontario", one paragraph on what the planner does, and Start your plan, Load sample plan, Import a saved plan (the last two in stage 7), with "Your plan stays in this browser… Export it to keep a copy."
- [ ] The dialog: "Before you start", the disclaimer, "Tax and benefit amounts start at 2026 values. You can change them in Settings.", a dark "I understand" button.

## Household (`Main`)

- [ ] One card per spouse, titled Spouse 1 and Spouse 2.
- [ ] Fields in pairs: birth (month and year) with sex at birth (a select); retires in with life expectancy target; CPP at 65 (monthly estimate) with years in Canada by 65; tax rate while working with after-tax pay (yearly).
- [ ] The note under the target: "Default: the age a man of 63 has a 25% chance of reaching (FP Canada 2026). A lower age raises the risk of outliving the plan."
- [ ] The note under CPP: "From My Service Canada. That estimate assumes you keep contributing to 65. How to adjust it. Full OAS needs [full years] years after age 18", the years read from the config.

## Savings (`Investing`)

- [ ] Intro: "Open a section to change it. The line beside each title sums up what's inside."
- [ ] Section headers: a chevron, the title, a summary in several parts, and "Open" or "Close".
- [ ] Accounts as one table (type, owner, balance, yearly saving, details such as "Becomes a RRIF at 71", Edit) with one "Add account" button; Edit opens the account's fields.
- [ ] The strip "New TFSA room each year: $7,000 (2026) · Edit".
- [ ] Pensions: "Add pension"; fields owner (select), yearly pension, starts at age, bridge, bridge until, indexing (select), survivor gets.
- [ ] Mix: the explanation paragraph; "Start from" as a pill choice; the coloured bar with stock, bond and cash totals; rows grouped "Stocks" and "Bonds and cash" with a colour dot; each row's return in an input showing its value; the note on FP Canada's returns; tiles Total, Expected return before fees, After fees, Inflation (with Edit).
- [ ] Fees: title, "What you pay in fund fees and advice… Fees compound like returns, so this matters.", choices showing each level's value, the note linking Settings.
- [ ] Rebalance: "Rebalance once a year back to this mix. Without it, the mix drifts toward whatever grew fastest."
- [ ] Shapes as three cards with a line drawing (dashed line at retirement), name and one line; the note under them.
- [ ] Placement as two radio cards with a description; the comparison box "Compared with the same mix in every account" with the legacy difference large, the tax difference under it, and "Why".

## Spending (`Spending`)

- [ ] One card titled "Monthly spending, after tax" with its explanation, and the pill choice By category / One total on the right.
- [ ] One total: a large input with "Not sure? Switch to By category to add it up."
- [ ] Category groups as rows that open one at a time: name, "N of M used", the group total, Edit or Done; a pill when a category differs later.
- [ ] Each category: amount "/mo" right-aligned; "Slower $x · Later $y · Different later?" or the two override inputs with "Use the usual change".
- [ ] Phases as three cards: Active years (dark border), Slower years and Later years with "From year" inputs and the slider, a large monthly figure and the yearly one.
- [ ] Strip "Spending grows with inflation of 2.1% a year (FP Canada 2026) · Edit".

## Withdrawals (`Withdrawals`)

- [ ] CPP and OAS start ages as selects, with strips stating the ranges and adjustments and the full OAS amount.
- [ ] Converting: one field per RRSP and LIRA, the unlock checkbox, and the strip on the latest conversion and the RRIF minimum at 71 with "See table".
- [ ] Splitting: one paragraph with the share and age from the config.
- [ ] A card titled "Which accounts pay for your spending" with its line of explanation.
- [ ] Strategy cards: name, description, "Lifetime tax", "Left after tax", the differences, "To TFSA · Clawback years"; "Learn more" as its own button.
- [ ] Options row: for Fill lower brackets first, two pressed-style buttons with each level's amount and Edit; for Early RRSP drawdown, the years and whose benefits end them.
- [ ] The income chart as drawn: coloured source bands with their names on them, the dashed spending line, the hatched red tax band and hatched green TFSA band; the "i" button with its explanation and "Got it"; "Drag to look at a year" under the slider.
- [ ] The breakdown titled "year · ages a / b", each row with its colour swatch.
- [ ] The Learn more dialog: name and tagline, the blocks, pros and cons side by side, "When it makes sense" as a list, the note, "In your plan: …" with this plan's numbers, Close and Use this strategy.

## Estate (`Estate`)

- [ ] Card "When one of you dies": the line naming who dies first and when; the survivor share with its note; the grey box "What the plan does at the first death" with its four points.
- [ ] Card "What you leave behind" with "Measured after the second death, after all taxes and probate, in today's dollars"; legacy goal and home value side by side with their notes.
- [ ] Strips: "Ontario probate: $15 per $1,000 of estate value above $50,000 · Edit", beneficiaries, the final return.

## Results (`Results`)

- [ ] The top line "All amounts in today's dollars, assuming deaths at the target ages (Alex 94, Sam 96) and the same return every year" with the status as a pill.
- [ ] "Your goals" heading; each goal card with "GOAL 1"/"GOAL 2", a ✓ Met or Missed pill, a title ("Spending covered every year"; "Leave $400,000 after tax"), the sentence with years and names, the year strip with first and last year under it, the legacy bar with $0, goal and value labels, and the links "Change spending" and "Change goal".
- [ ] The summary row: lifetime tax, clawback years, "Last change: …".
- [ ] Charts card: "Today's dollars · [strategy]", the chart tabs as a pill group, a legend, and a caption under each chart summing it up.
- [ ] Money runs out: a banner "Money runs out at [name]'s age [n], before the second death."
- [ ] Error: "The calculation failed a safety check", "No results are shown because they could be wrong. This is a bug in the planner, not in your plan.", the details, Copy details and Export plan (stage 7).

## Settings (`Settings`)

- [ ] Its own header: app name, "Settings", "Back to plan".
- [ ] Title "Tax and benefit rules", the introduction, and "Reset all to 2026 defaults".
- [ ] "You've changed N values from their defaults: [names]. Reset."
- [ ] Plain names for every value, never config keys; sources as a link per value.
- [ ] Income tax: the federal and Ontario brackets as two small tables; credits and rules as one table with Federal and Ontario columns.
- [ ] OAS, CPP, and Accounts and pensions as labelled fields in a grid, with notes such as "January 2026 · grows with inflation" and "Changed · default $95,323".
- [ ] Savings assumptions: returns and inflation as a table, the fee levels as a table.
- [ ] The RRIF minimum table as a grid of "age · rate"; the LIF maximum and unlock.

## Updating and error states (`States`)

- [ ] "Updating…" as a pill with a dot; faded old figures.
- [ ] The Results badge "Updating", "Short from [year]" and "Error" as in the mockup.
