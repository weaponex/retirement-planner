# jurisdiction

## Overview

Federal and provincial income tax for one person's return. `federal.ts` holds
the federal rules: income totals, the OAS recovery tax (clawback), credits and
federal tax. `ontario.ts` holds the Ontario rules, following Form ON428 Part C,
and exports the `ontario` implementation of the `Jurisdiction` interface from
`types.ts`. `src/engine/tax/personalTax.ts` is the caller: it uses
`federalTax` and calls `Jurisdiction.provincialTax` without knowing which
province it has.

## Interface

- `types.ts`
  - `Jurisdiction`: `{ id: string; provincialTax(income: TaxableIncome, age: number, ctx: YearContext): number }`.
    Provincial tax for one return, including surtax, credits and premiums.
    Probate, `lifLimits` and `unlockShare` are planned for later stages and are
    not defined yet.
- `federal.ts`
  - `IncomeTotals`: `grossedUpDividends`, `includedGains`, `totalIncome` (line
    15000), `clawback`, `netIncome` (line 23600), `taxableIncome` (line 26000).
  - `incomeTotals(income, ctx): IncomeTotals`: eligible dividends grossed up,
    capital gains times the inclusion rate, and the clawback
    `min(oas, rate * max(0, totalIncome - threshold))`.
  - `ageAmount(age, netIncome, ctx, keys: { amount; threshold; rate }): number`:
    the age amount after its income-based reduction, or 0 below
    `federal.credits.age.min_age`. Ontario reuses it with its own amount, threshold
    and rate keys, but the minimum age is always the federal key: there is no Ontario
    key for it.
  - `federalBasicAmount(taxableIncome, rows: BracketRow[], ctx)`: the full
    basic amount up to `rows[3].from`, `federal.credits.basic_min` at or above
    `rows[4].from`, and a straight line in between.
  - `FederalParts`: `totals`, `bracketTax`, `credits`, `dividendCredit`, `tax`.
  - `federalTaxParts(income, age, ctx): FederalParts`: bracket tax minus
    (basic + age + pension credit amounts) times the lowest bracket rate, minus
    the eligible dividend credit.
  - `federalTax(income, age, ctx): { tax: number; clawback: number }`: federal
    tax (line 42000, without the clawback) and the OAS recovery tax.
- `ontario.ts`
  - `ontarioSurtax(basicTax, ctx)`: step 4 (line 68), summing
    `max(0, basicTax - threshold) * rate` over `ontario.surtax.thresholds` and
    `ontario.surtax.rates`.
  - `ontarioTaxReduction(taxSoFar, ctx)`: step 6 (line 80),
    `max(0, 2 * ontario.tax_reduction.basic - taxSoFar)`.
  - `ontarioHealthPremium(taxableIncome, ctx)`: step 7 (line 89), from the
    `ontario.health_premium.schedule` phase-in table.
  - `OntarioParts`: `bracketTax`, `credits`, `basicTax`, `surtax`,
    `dividendCredit`, `afterDividendCredit`, `taxReduction`, `afterReduction`,
    `healthPremium`, `total`.
  - `ontarioTaxParts(income, age, ctx): OntarioParts`: the ON428 steps in order.
  - `ontario: Jurisdiction`: `id: 'ON'`; `provincialTax` returns
    `ontarioTaxParts(...).total`.

## Invariants

- No Ontario value or rule appears outside `ontario.ts`. Federal rules stay in
  `federal.ts`, and provincial rules stay in the jurisdiction modules
  (`types.ts`, `federal.ts` header comments).
- Every rate, amount and table comes from the year's config through
  `src/engine/config/read.ts` (`plain`, `amount`, `list`, `brackets`,
  `phaseIn`). Nothing is hard-coded. A missing or null key throws
  `MissingRuleValueError`.
- `taxableIncome` equals `netIncome` in this model, and `netIncome` is
  `totalIncome - clawback`. The clawback is never larger than `income.oas`.
- `federalBasicAmount` needs at least five rows in `federal.tax.brackets` and
  throws otherwise.
- `ontarioSurtax` throws if `ontario.surtax.thresholds` and
  `ontario.surtax.rates` have different lengths.
- Credits are the credit amounts times `lowestRate(rows)` of the same bracket
  table. `FederalParts.tax`, `OntarioParts.basicTax`, `afterDividendCredit`,
  `afterReduction` and `ontarioTaxReduction` are each clamped at 0 or above.
- Ontario's calculation order is fixed: bracket tax, then credits, basic tax,
  surtax, dividend credit, tax reduction and Health Premium.
  `OntarioParts.total` is `afterReduction + healthPremium`.
- `federalTax` returns the clawback separately from `tax`, so line 42000 does
  not include it.

## Side Effects

- None. All functions are pure reads of `TaxableIncome` and `YearContext`.
  They throw only for missing config values or malformed tables (see
  Invariants).

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/federal.test.ts`, `tests/unit/ontario.test.ts`,
  `tests/unit/personalTax.test.ts`
