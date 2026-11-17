# Units and conventions

Normative rules for anyone writing engine code. The design's
[Units and conventions](designs/retirement-planner.md#units-and-conventions) section is the
source; this file adds worked examples.

## Dollars

- **Inputs are in today's dollars.** Field names end in `Today`.
- **The engine works in future (nominal) dollars only.** Field names end in `Nom`.
- `normalizeInputs(inputs, cfg)` converts every `…Today` input once, when the engine receives it.
  `toDisplay(rows, deflator)` converts results back for the screens. Nothing else converts.
- The solver, the yearly projection and the simulation never import the `TodayDollars` type
  (enforced by lint).

**Worked example** (illustrative numbers only; the real inflation rate comes from
`market.inflation`). Inflation is 2.1%. The plan starts in 2026 and the first retirement is in
2032 (6 years later). A spending phase of $90,000 today becomes, in 2032:

    90,000 × (1.021)^6 = 101,952.28 future dollars

A 2040 result of 120,000 future dollars displays as 120,000 / (1.021)^14 = 89,705.87 today.

## Valuation date and inflation

- The valuation date is January 1 of the plan's start year.
- The inflation factor for year *t* after the start is (1 + inflation)^t, using one fixed rate.

## Rows and ages

- One row per calendar year, from the start year to the year the second spouse reaches their
  life expectancy target.
- A spouse's age in a row is the age they reach during that year (year − birth year). This matches
  CRA's end-of-year rules for the age amount, the pension credit and pension splitting.
- **Exception:** the RRIF and LIF minimum uses the age at the start of the year, which is the
  row age − 1. No minimum applies in the year the account opens.

**Worked example.** A spouse born in 1961 is 65 in the 2026 row. RRIF income in 2026 qualifies for
the pension credit and splitting, because they are 65 by December 31. A RRIF opened in 2025 has a
2026 minimum using the factor for age 64.

## First year of benefits

CPP, OAS and DB payments start the month after the start birthday. The first year pays only those
months. The OAS 75+ increase is pro-rated the same way.

**Worked example.** Born in September, starting OAS at 65: payments run October to December, so
the first year pays 3/12 of the annual amount.

## Retirement and working years

- Each spouse has a retirement year. Household spending starts in the first spouse's retirement
  year. Years before that run in `project/workingYear.ts`.
- A spouse still working after the first retirement enters their after-tax pay, counted as cash
  income until they retire. CPP or OAS they collect while working is taxed at their working-years
  marginal rate.
- Spending phases and growth-to-safety shapes are measured in years from the first retirement.

## Timing within a year

In this order: first-death transfers (if any), rebalancing, fixed income, required draws, the
withdrawal solve, surplus placement, price returns, the final return (in a second-death year),
invariant checks. Contributions in working years land at the end of the year. Tax is settled in the
same year.

## Deaths

- A death happens at the end of the year the spouse reaches their target. First-death transfers
  apply from the following year.
- If both spouses die in the same year, apply the first-death rollover, then the survivor's final
  return, in that year.

## Indexing

Each config entry says whether it rises with inflation (`indexed`). Indexed values grow at the
fixed rate. Non-indexed values (for example Ontario's $150,000 and $220,000 bracket thresholds, and
the $50,000 probate threshold) stay fixed in future dollars.
