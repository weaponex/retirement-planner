# Reference plan: notes on the design's ambiguities

This folder holds the stage 3 reference plan (design file 53):

- `inputs.json`: a made-up Ontario couple (`PlanInputs`, schema version 1, plan start 2026).
- `calculator/`: an independent calculator in plain Node 22 JavaScript, written from
  `docs/designs/retirement-planner.md`, `docs/units-and-conventions.md`, `config/2026/*.json`,
  `config/SOURCES.md`, `AGENTS.md` and `tests/fixtures/tax-cases.json` only. No engine code, engine
  tests, tools or git history were read.
  - `run.mjs` (entry point) writes `expected-rows.csv`:
    `node tests/fixtures/reference-plan/calculator/run.mjs` (add `--summary` for a per-year printout).
  - `check-tax.mjs` checks `tax.mjs` against `tests/fixtures/tax-cases.json`: all 21 cases match
    within $1 (`node tests/fixtures/reference-plan/calculator/check-tax.mjs`).
  - `plan.mjs` checks the account and household identities from the design's Verification
    section every year, to $0.05, and throws if one fails. They all pass.
- `expected-rows.csv`: one row per year, 2026 to 2059 (34 rows, 113 columns).

Where the design was unclear I took the most literal reading I could find and recorded it below.
Each note gives the reading used and, where it matters, the alternative. Code comments in
`plan.mjs` point here as `[Nxx]`. The notes marked **(high impact)** change cells by more than $1
if the engine reads them differently.

## The couple

| | Avery (spouse index 0) | Jordan (spouse index 1) |
|---|---|---|
| Born | February 1964 | August 1967 |
| Retires | 2028 (age 64): the first retirement | 2030 (age 63) |
| Life expectancy target | 85: dies at the end of 2049 (first death) | 92: dies at the end of 2059 (second death) |
| CPP | $1,050/month at 65, starts at 65 (2029) | $900/month at 65, deferred to 70 (2037) |
| OAS | deferred to 67 (2031), 40 years in Canada | starts at 65 (2032), 32 years in Canada (partial OAS) |
| Working marginal rate | 31.48% | 29.65% |
| After-tax pay while working | none | $52,000 (counted in 2028 and 2029) |
| Accounts | RRSP $380k (converts at 71, 2035), TFSA $95k, non-registered $190k (Canadian stocks with a $50k gain, bonds with a $1k loss, U.S. stocks with a $12k gain) | RRSP $310k (converts at 65, 2032), LIRA $150k (converts to a LIF at 66, 2033, with the 50% unlock), TFSA $80k, non-registered $40k |
| DB pension | $28,000 lifetime + $6,000 bridge to 65, from 64; `fixed` indexing at 1.5%; 60% to the survivor | none |

Household: spending in "one total" mode, $8,600 a month (phases at years 10 and 20 at 90% and 80%),
survivor spending 40%, home $650,000, a $500,000 legacy goal (not used by the rows). Investing: a
custom mix (20/20/10/5/35/10), `gradual_shift` shape, `bonds_sheltered_first` preset, rebalancing
on, index-ETF fees, one return override (U.S. stocks 6.6%, within the optimistic-return margin).
Withdrawal strategy `registered_last`.

What the rows exercise: two working years (2026, 2027) with contributions, a TFSA contribution, the
first rebalance realizing a gain and a loss, and a tax larger than the yield (a forced sale); two
mixed years (2028, 2029) with Jordan still working (C2); RRSP → RRIF (2032, 2035); LIRA → LIF with
the unlock into an existing RRIF (2033); an unconverted RRSP drawn as a lump sum (2034); the
non-registered accounts drawn down first (2028–2035); registered draws pro rata across both spouses
(2034–2037) with the LIF capped at its maximum (2035); RRIF and LIF minimums; the pension split in
both its eligibility cases (DB at 64–65, RRIF from 65); surpluses into the TFSA and, once room is
full, the non-registered account (2054–2059); the DB bridge and its last partial year; birth-month
pro-rating of CPP, OAS, DB and the OAS 75+ increase; the first death with the inherited RRIF, LIF,
TFSA and non-registered accounts, the capped CPP survivor benefit and the DB survivor share; the
final return with deemed registered income, deemed gains and a clawback recomputed on the full
return; probate with the home.

Not exercised: TFSA draws, shortfalls, the clawback in a living year, `fill_brackets`,
`early_rrsp`, rebalancing off, same-year deaths, stage 2 decisions 11 (unlock with no RRSP/RRIF) and
12 (a spouse with no non-registered account), spending categories, rule overrides, `full` and
`none` DB indexing, and a plan start later than the config's tax year (`rebaseConfig` is
implemented, but its factor is 1 here). The calculator throws rather than guess for decisions 11
and 12 and same-year deaths.

## Most important findings

1. **(high impact) Ties in the split search are decided by floating-point noise [N30].** In
   2042 and 2043, transferring 25% or 30% of Avery's pension income gives the same household tax
   (both spouses in the same bracket, all credits fully used); the difference is rounding noise.
   With an exact `<` comparison the calculator picks 30%; with a tie tolerance it picks 25% (the
   design's "on a tie, the smaller transfer"). Household tax is the same either way, but each
   spouse's `taxNom` and `taxableIncomeNom` move by about $826 and $3,175, and `splitShare` differs.
   The design needs a tie tolerance (the calculator uses $0.000001). Ties like this will be common:
   any year where both spouses face the same marginal rate.
2. **Tax at the working marginal rate [N06] — decided by the author on 2026-11-24.** The rate
   applies to taxable amounts (gains at the inclusion rate; eligible dividends at their cash amount,
   not grossed up), floored at 0. The first version used the full gain.
3. **(high impact) Contributions [N05].** "Land at the end of the year" conflicts with the working-
   year list, where contributions (step 5) come before price returns (step 6). The calculator adds
   them after price returns. Contributions also stop at the first retirement for both spouses,
   because only the working-year path has a contribution step, so Jordan's contributions in 2028
   and 2029 are dropped.
4. **(high impact) The working-year cash yield after tax [N07]:** recorded as a deposit (so the
   working-year household identity holds), not as `reinvestedYieldNom`.
5. **Sheltered yields in working years [N08]** are not listed in the working-year steps; the
   calculator reinvests them as in retired years (otherwise every RRSP would earn only its price
   return before retirement).
6. **Per-spouse columns the design names but doesn't define:** `splitShare` [N02],
   `realizedGainsNom` [N24], `taxableIncomeNom` [N25], `afterTaxCashNom` [N26], the dead spouse's
   `age` [N03], and whether survivor benefits go in `cppNom` and `dbNom` [N12, N14].
7. **The order of reinvested yield, surplus deposits and price returns [N21]**, and whether the
   unlocked LIRA half counts in the RRIF's minimum that year [N11].

## All notes

### CSV and columns

- **N01. Number format.** "Numbers are plain decimals with at least 2 places": every numeric cell
  is written with exactly 2 places, including `year`, `age` and `splitShare` (so `2026.00`,
  `62.00`, `0.25`). `-0.00` is written `0.00`. Booleans are `true`/`false`. Values are rounded to
  cents only when written; all intermediate values keep full precision.
- **N02. `splitShare` is per spouse.** The `YearRow` lists `splitShare` inside each spouse. The
  transferring spouse's cell holds the share (0 to 0.5) and the receiving spouse's cell holds 0. No
  split, a dead spouse or a working spouse gives 0 in both. The share is `k × SPLIT_STEP`, so it
  can be 0.15000000000000002 internally; written with 2 places it is exact. A test that compares
  this cell "exactly" should compare the written value.
- **N03. A dead spouse's columns.** `alive` is false and every money cell is 0. `age` keeps counting
  (year − birth year), because the design says the row age is "the age they reach during that year".
  Withdrawals from accounts the survivor inherited are in the survivor's `withdrawals.<id>` columns.
- **N04. Working years (before the first retirement).** `payNom` is 0 (pay is outside the plan until
  the first retirement). `spendNeedNom`, `afterTaxCashNom`, `surplusNom` and `shortfallNom` are 0,
  because the year has no spending need and the design defines no after-tax cash for it.
  `cashYieldNom` is the non-registered yield, as in retired years.

### Working years

- **N05. Contributions.** Added at the end of the year, after price returns, so they earn nothing in
  the year they land. Each account gets its own contribution (indexed by the deflator): an
  unconverted RRSP or LIRA keeps it, a converted one sends it to the owner's non-registered
  account (decision 9b), a TFSA takes it within room and sends the rest to the owner's first
  non-registered account by id, a non-registered account keeps it. All of these are
  `contributionsNom` of the account that receives them. Contributions happen only in working
  years (years before the first retirement), for both spouses: the retired-year solver has no
  contribution step. A still-working spouse's contributions after the first retirement are dropped.
- **N06. Tax at the working marginal rate — decided by the author on 2026-11-24.** The base is
  pension-eligible + OAS + CPP + other ordinary + eligible dividends (the cash amount, not grossed
  up) + foreign dividends + capital gains × `federal.capital_gains.inclusion_rate`, with the gains
  taken after the year's losses and the carried-forward loss are netted, and the base floored at 0
  (`workingBase` in `calculator/tax.mjs`). It applies in working years and to a spouse still
  working in a retired-household year (C2), whose income includes their share of non-registered
  income and draws. (The first version used the full gain; with the included half, 2026's tax no
  longer exceeds the yield, so no working year has a forced sale [N07].)
- **N07. The yield after tax in a working year.** Per spouse: tax = rate × the working base of
  (yield + net taxable gain) [N06]. If the yield covers it, the rest is a deposit (`depositsNom`)
  into that spouse's non-registered account, in proportion to its holdings, before price returns.
  If not, the shortfall is sold from the same account (`drawsNom`, and the spouse's
  `withdrawals.<id>`), at average cost. That sale's gain is not taxed that year (decision 9a), but
  it is realized: it is in `realizedGainsNom` and nets against the carried-forward loss [N24]. It is
  not in `taxableIncomeNom`, because it is not taxed. This plan no longer exercises the forced sale;
  a scratch run with the old full-gain base gives Avery 11,226.06 in 2026 (a $226.06 sale gain). Using `depositsNom` keeps the design's working-year
  household identity true; `reinvestedYieldNom` is kept for sheltered accounts.
- **N08. Sheltered yields in working years** are reinvested, net of foreign withholding, before
  price returns, as in retired years.
- **N09. TFSA room.** The yearly limit (indexed, unrounded) and last year's TFSA withdrawals are
  added on January 1 of every year after the first, in working and retired years alike (step 0),
  not at the end of a working year. No limit is added in 2026 (decision 7). Room is per spouse and
  shared by their TFSAs.
- **N10. Step 0 runs in working years too** (conversions can happen before the first retirement;
  the stage 2 note says minimums are taken then). An account converts on January 1 of the first
  year its owner's row age is at least min(conversion age, `federal.rrif.latest_conversion_age`).

### Accounts, conversion and minimums

- **N11. The LIRA unlock.** Half of each holding moves, at its value, to the owner's first RRSP or
  RRIF by id (here `rrsp-1-1`, a RRIF since 2032), on January 1, before that RRIF's minimum is
  measured. So the RRIF's 2033 minimum (and its `startNom`) includes the unlocked amount. Every
  account's `startNom` is its balance after the first-death transfer, conversions and the unlock.
- **N12. CPP survivor benefit.** "A percentage of the deceased's pension" is read as the deceased's
  own CPP as it would be paid in that year: the full-year amount at their start age, indexed. The
  survivor's own CPP for the year plus the benefit is capped at `federal.cpp.survivor.max_combined`
  (indexed). The benefit is paid for full years from the year after the death (not pro-rated) and
  is included in the survivor's `cppNom` (and taxed as CPP).
- **N13. DB `fixed` indexing.** The lifetime and bridge amounts are the statement amounts at the
  start age and grow by `indexRate` for each year of the member's age above the start age. The first
  year pays (12 − birth month)/12 of both. The bridge's last year (the year of `bridgeEndAge`) pays
  birth month/12 of the indexed bridge (decision 13a).
- **N14. DB survivor share.** `survivorPct` × the lifetime amount (no bridge) as it would be in that
  year had the member lived (for `fixed`, indexed by the member's would-be age). Paid in full from
  the year after the death, included in the survivor's `dbNom` and counted as pension-eligible
  income.
- **N15. OAS.** Base × residence fraction × (1 + deferral rate × deferral months) × first-year
  fraction × (1 + 10% × the 75+ fraction), where the 75+ fraction is 0 before 75,
  (12 − birth month)/12 in the year of 75, and 1 after. So the 75+ increase applies to the deferred,
  partial-residence amount.
- **N19. A LIF's previous-year earnings** (for next year's maximum) = its reinvested yield − foreign
  withholding + price return. The design says "yield plus price return, after fees"; withholding is
  subtracted because it is a real loss to the account.
- **N20. Registered draws, pro rata.** The pro-rata weights are the balances after the year's
  minimums. A LIF's capacity is its maximum minus its minimum. A LIF's excess over its cap goes to
  the same owner's RRSP/RRIFs (in proportion to balance, each capped at its balance), then to the
  other spouse's registered accounts (same rule). An unconverted RRSP is part of the pool (a lump
  sum taxed as `otherOrdinary`, as in 2034).
- **N22. Deposits into an account** (surplus, working-year net yield, contributions) follow its
  current holdings in proportion; an empty account takes the year's overall mix. With rebalancing on
  this only affects that year's price return.
- **N23. Rebalance mechanics.** Targets come from `targetHoldings` at face value: classes in the
  fill order (cash, bonds, emerging, international, U.S., Canadian), each class filling the preset's
  groups in order, split across a group's accounts in proportion to each account's room not yet
  assigned. In a non-registered account each class is sold or bought separately: a sale realizes
  value − proportional cost for that class (average cost within the class), a purchase adds its cost.
  So the 2026 rebalance sells Avery's bonds at a $1,000 loss and U.S. stocks at a $12,000 gain.
- **N39. Initial state.** A non-registered account's `positions` set its holdings and cost (its
  `balanceToday` is ignored; here it equals the positions' total). RRSP, LIRA and TFSA balances are
  placed by the first rebalance. Each spouse's room is the sum of their TFSAs' `tfsaRoomToday`.

### The retired-year solve

- **N16. Pension splitting.** Eligible income = DB payments (lifetime, bridge) plus RRIF and LIF
  draws (minimums and solved draws) when the transferring spouse's row age is at least
  `federal.split.min_age_rrif`. The transferred amount moves from the transferor's
  `pensionEligible` to the receiver's `pensionEligible`, so the receiver gets the pension credit on
  it whatever their age. The search runs only when both spouses are alive and neither is working.
- **N17. Search candidates.** A direction is skipped when the transferor has no eligible income.
  Candidates are tried in order: 0, then for each share 5%…50%, spouse index 0 transferring then
  spouse index 1; a candidate replaces the best only if its household tax is lower by more than the
  tie tolerance [N30]. That gives "the smaller transfer, then spouse 1 transferring" on a tie
  ("spouse 1" is read as the first spouse, index 0).
- **N18. Household tax** in the search is the sum of both spouses' tax including the clawback; a
  working spouse's working-rate tax is included but does not change with the split.
- **N21. Order after the solve:** the year's draws are taken, then the sheltered yields (worked out
  on the January 1 holdings, decision 4) are added, then the surplus is deposited, then price
  returns apply to everything, including the reinvested yield and the surplus.
- **N26. `afterTaxCashNom`** = fixed income (including pay) + all draws + the non-registered cash
  yield − tax, before surplus deposits. With a surplus it is the need plus the surplus.
- **N27. Bisection** on [0, everything available], halving while the bracket is wider than $0.01
  (at most 40 steps) and returning the upper end, so cash meets the need and exceeds it by under a
  cent. A surplus exists only when no extra withdrawal was needed (W = 0); otherwise `surplusNom` is
  0 and the sub-cent excess is not deposited.
- **N28. Spending need** = 12 × the monthly total × the phase's `keepPct` × the deflator; phases
  count from the first retirement (2028 = year 0); the survivor percentage applies from the year
  after the first death.
- **N29. Split passes.** Pass 1 solves with last year's split (none in the first retired year);
  the search runs at the solved draws; if the best split differs, the year is solved again with it,
  up to 3 solves. If the third solve's search still prefers another split, the third solve's split
  and results stand. The year's split carries to next year.
- **N30. Tie tolerance in the split search: $0.000001** (see finding 1). Without it, 2042 and 2043
  differ (an exact comparison picks 30%).
- **N31. A spouse still working** (C2) is not excluded from "registered last" draws: Jordan's
  non-registered account is drawn in 2028 and 2029, and its income is taxed at his working rate.
  His pay is `afterTaxPayToday` × the deflator.
- **N32. Surplus.** Split by each spouse's share of the year's RRIF and LIF minimums
  (`forcedDrawsNom`); with no minimums, by each living spouse's CPP, OAS, DB and pay (decision 10).
  Each share goes to that spouse's first TFSA by id within their room, then their first
  non-registered account by id. After the first death the survivor owns every account, so deposits go
  to `tfsa-0-1` first (decision 14).
- **N33. Forced draws** are the RRIF and LIF minimums only (the non-registered cash yield is not a
  draw).
- **N24. `realizedGainsNom`** = the year's net realized gain (gains − losses) from the rebalance and
  from sales, before the carried-forward loss is applied; it can be negative. Deemed gains at death
  are not in it. Decided by the author on 2026-11-24: a working-year forced sale's gain (the sale
  that pays tax above the yield) counts here and in the year's netting with the carried-forward
  loss, though it is not taxed again that year (decision 9a) [N07].
- **N25. `taxableIncomeNom`** = the T1 taxable income after the split: total income with dividends
  grossed up and gains at the inclusion rate, minus the OAS recovery tax. For a spouse taxed at the
  working rate it is the same T1 total (no clawback), even though their tax base is the working
  base [N06]. Confirmed by the author on 2026-11-24, as is N04 (working years have
  `afterTaxCashNom` and `surplusNom` of 0).
- **N34. Capital losses.** Each spouse's realized gains and losses for the year are netted first;
  a net gain is reduced by the carried-forward loss; a net loss adds to it. The update is made once,
  at the end of the year, with the final draws.

- **N46. Bracket thresholds never fall — decided by the author on 2026-11-24.** The top two
  Ontario thresholds are not indexed, so the indexed third threshold overtakes $150,000 in the 2040s
  and the table goes out of order (the first version then added a negative slice). After indexing,
  each row's `from` is at least the previous row's, in every bracket table (`makeCtx().brackets` in
  `calculator/config.mjs`). In this plan only the 2059 final return reaches those thresholds: the
  11.16% band is empty and 12.16% starts at the indexed third threshold, which lowers the final
  return tax by $998.35 compared with no floor.

### Deaths and the estate

- **N35. First-death transfer** happens on January 1 of the year after the death, before the
  conversions (decision 5). The deceased's carried loss is dropped; the survivor's TFSA room is
  unchanged; last year's split is reset to none.
- **N36. Final return.** On end-of-year balances: deemed registered income = every RRSP, RRIF, LIRA
  and LIF balance (`otherOrdinary`); deemed gains = max(0, Σ(value − cost) over non-registered
  positions − the carried-forward loss after this year's update); these are added to the deceased's
  income for the year (as taxed in step 5, after any split; here single) and taxed once with
  `personalTax` at the row age, the clawback recomputed. Final-return tax = that total (federal +
  Ontario + clawback) − the step 5 tax (also including the clawback). `deemedGainsNom` is the amount
  after the loss offset. The deceased's `taxNom` in that row is the step 5 tax only.
- **N37. Probate.** Base = end-of-year non-registered balances + the home (`homeValueToday` × the
  year's deflator) − final-return tax, not below 0. The threshold is not indexed (`CAD`,
  `indexed: false`). After-tax legacy = every account balance + the home − final-return tax −
  probate.

### Tax and config

- **N40. Tax.** Implemented exactly as the Tax scope section describes, including the federal basic
  amount phase-down between the fourth and fifth bracket starts, and the single
  `max(0, …)` around federal bracket tax − credits − dividend credit. The Ontario age amount uses
  `federal.credits.age.min_age`, because there is no Ontario key for it. The Health Premium schedule
  is not indexed (its entry says `indexed: false`); the surtax thresholds are. All 21 tax cases
  match within $1.
- **N41. Monthly config amounts** (OAS, CPP maximum, survivor flat rate, combined maximum) are
  multiplied by 12 on load; indexed values then grow with the deflator from the plan start.
- **N42. RRIF minimum** uses the row age − 1; below 71, 1 ÷ (`federal.rrif.min_factor_base_age` −
  age). No minimum in the opening year. A LIF's maximum uses the same start-of-year age; in its
  opening year it is the table factor alone.
- **N43. Returns.** Price return = gross return − fee − yield, so cash (2.4% return, 2.4% yield,
  0.2% fee) loses 0.2% a year in price, and bonds lose 0.47%. This is the literal formula.
- **N44. Shape.** The config stores `stockChange` as fractions (−0.1), not percentage points; the
  change is shape(t) − shape(t₀) with t₀ = 2026 − 2028 = −2, applied to the user's stock share and
  spread within stocks and within bonds and cash in the user's proportions.
- **N45. First-year fractions** for CPP, OAS, DB and the OAS 75+ increase are
  (12 − birth month)/12 ("start the month after the start birthday").
