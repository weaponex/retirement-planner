# ui

## Overview

The screens (design files 45–50; [Screens](../../docs/designs/retirement-planner.md#screens)):
the app shell, six tabs, Settings, the result views and charts. Screens read the plan store with
`usePlan` and write through its actions; money is shown in today's dollars.

## Interface

- `App.tsx`: the header (the household's names, the tax-year chip, Load sample plan, Import,
  Export, which downloads the plan as a file (AR2-X1), Import with its replace and refusal
  dialog (AR2-X2), and Settings; on Settings its own header with Back to plan), the config notice, the tab
  bar with the Results badge, the welcome screen for an empty plan, the footer disclaimer and the
  first-run dialog. `TABS`.
- `tabs/`: `HouseholdTab`, `SavingsTab`, `SpendingTab`, `WithdrawalsTab`, `EstateTab`, `ResultsTab`.
- `settings/SettingsScreen.tsx`: every rule value by section, credits and returns as tables;
  single values can be changed (Enter or leaving the field applies). `settings/names.ts`:
  `RULE_NAMES`, `ruleName` (plain names, never config keys).
- `results/`: `MissingSections` (what is missing, by tab, AR-W4), `Goals`, `UpdatingState` and
  `StatusLine`, `ResultsBadge`, `ChangeSummaryLine`,
  `WarningsList` (empty until stage 6), `ConfigNotice` and `TaxYearChip`, `IntegrityError`.
- `charts/`: `YearSlider` (a slider inset to a chart's x axis, AR-W5; `INCOME_INSET`,
  `AREA_INSET`), `charts.tsx` (balances, tax, estate in recharts), `IncomeChart.tsx` (the income
  chart in SVG, shared by Withdrawals and Results), `data.ts` (chart rows in today's dollars),
  `ChartTable`.
- `inputs/`: `Field`, `TextInput`, `CurrencyInput`, `PercentInput`, `AgeInput`, `SegmentedChoice`.
- `content/`: `glossary.ts`, `explanations.ts`, `disclaimer.ts`. `common.tsx`: `Section`,
  `Strip`, `useRule`, `RuleValue`, `useSpouseName`, `CLASS_COLOURS`, `SOURCE_COLOURS`.
- `styles.css`: the mockups' look (design: Look and feel). Fonts are bundled through
  `@fontsource` and imported in `main.tsx`. `config.ts`, `rules.ts`, `hooks.ts`: rule values and conversions.

## Invariants

- Wording is conditional and never "you should" (design: Advice wording).
- `[inputs/Field.tsx]` An empty field shows its message only after it is edited or linked to.
- `[tabs/WithdrawalsTab.tsx]` The options row has a fixed height and the Updating label overlays
  the content, so switching strategy never moves the chart or the breakdown.
- `[tabs/WithdrawalsTab.tsx:Difference]` Only the after-tax legacy difference is coloured, and not
  when tax and legacy move in opposite directions.

## Side Effects

- `App.tsx` reads and writes `rp.disclaimer.seen` in localStorage (failures are ignored) and
  focuses the input a link points to.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/ui.test.tsx`; journeys: `tests/e2e/*.spec.ts`
