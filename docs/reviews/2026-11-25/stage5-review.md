# Stage 5 review by the author (2026-11-25)

The author reviewed the deployed stage 5 app. Every item is listed here with what it changes.
Every item is **Decided** by the author (the four open questions were answered the same day) and
overrides the mockups and earlier decisions in the design.
`[x]` marks a built item. All items were built on 2026-11-25 and checked in the browser; the ten new config keys they need wait for the author's validation (Known gaps B5-3). `stage-5` is tagged only when every item is built or moved to a later
stage by the author.

## Household

- [x] **AR-H1** Decided: "Retires in" is the age at which the spouse plans to retire, not a year.
  The plan keeps the retirement year; the screen converts from the birth date.
- [x] **AR-H2** Decided: the CPP estimate is entered for the age the spouse plans to start CPP (for
  example CPP at 70), not at 65; the engine converts it back to 65 with the config's adjustment
  rates. The field starts with a default from a new config entry, changeable in Settings: Service
  Canada's published average monthly CPP for new retirees, fetched from the source page and
  validated by the author (not the $1,200 first suggested, which was not sourced).
- [x] **AR-H3** Decided: OAS stays tied to age, not retirement (it is paid from 65, deferrable to
  70, whatever the work status). The default start is 70 for everyone (AR-W2).
- [x] **AR-H4** Decided: "Years in Canada by 65" becomes "Year you arrived in Canada" (empty for
  someone born here). The plan keeps years in Canada after 18 by 65.
- [x] **AR-H5** Decided: "Tax rate while working" and "After-tax pay (yearly)" become one field,
  gross yearly pay. The combined marginal rate comes from the federal and Ontario brackets
  (reference: TurboTax, "What is the marginal tax rate"). After-tax pay is gross pay less income
  tax and the employee's CPP, CPP2 and EI contributions; those 2026 rates and maximums are added
  to the config from CRA and Service Canada and validated by the author.

## Savings

- [x] **AR-S1** Decided: every section starts closed except Accounts (overrides the mockup, where
  the investment mix is open).
- [x] **AR-S2** Decided: a new plan has an RRSP, TFSA, LIRA and non-registered account for each
  spouse, each with a $0 balance, so entering a balance is the only step.
- [x] **AR-S3** Decided: each account has its own investment mix, starting at Balanced, with
  Conservative, Growth and Custom; the separate "Your investment mix" section goes away. Placement
  ("Which account holds what", its presets and its comparison) is dropped, since the accounts' own
  mixes decide what each holds. The "As you get older" shape applies to every account's mix. This
  reopens the stage 4 engine (one mix per account instead of a household mix and placement).
- [x] **AR-S4** Decided: RRSPs and LIRAs convert to a RRIF or LIF at 71 by default.
- [x] **AR-S5** Decided: no "New TFSA room each year" strip under Accounts (overrides the
  "defaults shown where they apply" list).
- [x] **AR-S6** Decided: Workplace pensions take a defined benefit or a defined contribution
  pension. A DC pension is held as a LIRA in the engine (O9), with yearly contributions while
  working.
- [x] **AR-S7** Withdrawn by AR-S3: the placement section is dropped. The rule it stated (name
  the sections still to fill in, never a bare "when the plan is complete") applies to every
  screen that waits for a complete plan (AR-W4).

## Spending

- [x] **AR-P1** Decided: each category group takes a monthly amount of its own. Entering it clears
  the group's items; entering an item makes the group's total the sum of its items.

## Withdrawals

- [x] **AR-W1** Decided: every section starts closed.
- [x] **AR-W2** Decided: CPP and OAS start at 70 by default for both spouses (was 65).
- [x] **AR-W3** Decided: the conversion ages match the 71 default (AR-S4).
- [x] **AR-W4** Decided: when the plan is not complete, the chart area names the sections still to
  fill in instead of showing nothing.
- [x] **AR-W5** Decided: the year slider spans exactly the chart's x axis, so its handle lines up
  with the year line.
- [x] **AR-W6** Checked, no change: the author expected about $12,000 of OAS a year per person.
  Full OAS at 65 is $742.31 a month (`federal.oas.base_at_65`, January 2026), $8,908 a year; at 70
  it is 36% higher, about $12,114. The engine matches; with AR-W2 the plan shows the age-70 amount.

## Results

- [x] **AR-R1** Decided: the Balances and Income by source charts get a year slider showing that
  year's values.
- [x] **AR-R2** Decided: the Estate chart shows its values on the chart, not only in a tooltip.
