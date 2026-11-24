# Build decisions (2026-11-24)

Decisions the author made while stages 2 and 3 were built, and the triage of the second full design review. They were moved here from the design on 2026-11-24, in the editorial pass after stage 3, and the design now states each rule in the section it belongs to ([docs/designs/retirement-planner.md](../designs/retirement-planner.md)). The tables are kept as written at the time, so some links and wording refer to the design as it was then; where this record and the design disagree, the design wins.

## Stage 2 implementation decisions (author, 2026-11-24)

Points the stage 2 code had to settle, decided by the author from `docs/reviews/2026-11-24/stage-2-decisions.md`, which gives the options and examples for each.

| # | Decision |
|---|---|
| 4 | Sheltered yields are worked out on the January 1 balance and added to the account after the year's withdrawals, so they never enlarge the balance the RRIF and LIF limits use. |
| 5 | In the year after the first death, the accounts move to the survivor before the January 1 conversions, so the survivor's age decides when an inherited RRSP or LIRA converts. |
| 6 | The age the CPP estimate and OAS base refer to (65) is `BENEFIT_REFERENCE_AGE` in `constants.ts`, not a config key. |
| 7 | No TFSA limit is added in the plan's first year: the entered room is today's available room, as CRA's My Account shows it. |
| 8 | The first year's pension split starts from no split. |
| 9a | Before the first retirement, gains realized by the rebalance are taxed at the owner's working rate and paid from the yield; any excess is sold from the same account, and that sale's own gain is not taxed. |
| 9b | A contribution set for an RRSP or LIRA that has already converted goes to the owner's non-registered account. |
| 10 | A surplus with no forced withdrawals is shared by each living spouse's CPP, OAS, DB and pay, or equally if those are zero. |
| 11 | A LIRA unlock for an owner with no RRSP or RRIF opens a new RRIF that year (id `rrsp-<owner>-<n>`), with no minimum in its first year. |
| 12 | A spouse with no non-registered account gets an empty one at the plan start. |
| 13a | A DB bridge's last year pays up to the birthday month of its end age (birth month ÷ 12 of a year). |
| 13b | A DB survivor share is paid from the year after the member's death, even if the member died before the pension's start age. |
| 14 | After the first death, deposits keep going to the survivor's first TFSA, then first non-registered account, by id. |
| 15 | The pension split is re-solved while the best split changes, up to 3 passes (`MAX_SPLIT_PASSES`). Measured over 1,054 plans: 3 passes matched the full search exactly; 2 missed by up to $157 a year. A 40-year run costs about 12% more. |

Also from stage 2: RRIF and LIF minimums are taken in years before the first retirement, taxed at the owner's working rate and saved like CPP and OAS.

## Review triage decisions (author, 2026-11-24)

The author's decisions on the second full review (2026-11-19, `docs/reviews/2026-11-19/`: `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md` and `intermediate_zoom_out_report.md`). **Where this table and older text in this document disagree, this table wins** until the editorial pass (T16) folds it in.

Already settled before the triage, so not decided again: the split test (stage 2 decision 15), the two inflation clocks (`rebaseConfig`), the override shape `{ value, defaultTaxYear }`, a working spouse's taxes and draws (C2), the Worker cancel mechanism (C4) and the fee levels (O25, validated).

| # | Topic | Decision | Applies in |
|---|---|---|---|
| T1 | "Let the planner pick" | Cut from version 1, with no marker on the cards; listed under Future Improvements. `planner_pick`, `plannerGoal` and `planning.planner_search` are removed before any plan is saved. O31, SR1-M3 (its open part) and SR1-M5 close | Now (design, code, config) |
| T2 | Rule overrides | Only single values (`number` keys) that have a Settings row can be overridden. Tables, presets, shapes, mixes, life-expectancy tables and the CPP and OAS age-limit keys are shown read-only. The table checks already in `overrides.ts` stay for a later release | Now (code); Settings in stage 5 |
| T3 | Spending categories | Stay in the engine, as built in stage 2. SR1-M8 stays open: list the persisted category ids and define the spending nudge | Stage 5 |
| T4 | After-tax stock-share readout | Cut. One sentence in the placement text says that, with the mix counted at face value, part of a placement's benefit can come from holding more stocks after tax. FR-M16 closes | Now (design, code) |
| T5 | "Rebalance once a year" switch | Kept. When it is off, the Savings tab disables the shape choice and says why. A class split across both spouses' accounts in one group goes in proportion to each account's unassigned room (as built) | Stage 5 |
| T6 | Performance machinery | Minimal: no streamed results or per-variant cache; tips computed as designed. A failing tip rerun is dropped and logged; a failure in any main run blocks the results. Revisit only if the speed check fails | Stages 4–5 |
| T7 | "Bad start" variant | Not in version 1; listed under Future Improvements | — |
| T8 | Gains realized by the rebalance | Yearly rebalancing stays as it is. The tax on the year-one sale of the user's own positions is shown as a separate line that the placement comparison leaves out | Stage 4 (`Result`) |
| T9 | What "today's dollars" means | The plan starts in the year the values are entered (`planStartYear` is the current year; stored, not rechecked when a plan is loaded). Inputs are in that year's dollars | Now (design); schema in stage 7 |
| T10 | The final return | One return for the second death year: that year's income plus the deemed income, taxed once with `personalTax`, with the clawback recomputed. The extra tax over what that year already paid comes from the estate before probate. A `death.test.ts` row checks it | Stage 3 |
| T11 | Privacy claims | Reword the claims (Overview, G7, NFR) to what is enforced, naming the limits: navigation, and other sites on the same github.io origin. The Worker is created from a `blob:` URL so it inherits the page's policy, and `worker-src` allows `blob:`. No new end-to-end test | Stage 4 (Worker); wording in T16 |
| T12 | Two open tabs | When another tab saves the plan (the `storage` event), offer "Reload it, or keep this version". A Risks row accepts last-save-wins otherwise. Rolling backups are rejected: the export file is the lasting copy | Stage 7 |
| T13 | The config key list | `keys.ts` is the authoritative list; `config:check` keeps `SOURCES.md` in step with it. The design describes the key groups, naming and persisted ids and links to `SOURCES.md` (the full list here goes in T16) | Now; trimmed in T16 |
| T14 | Small contract fixes | `SpouseInput.name`; DC pension money (including a plan still with the employer, at its current value) is entered as a LIRA; a `CAD` unit for one-time amounts such as `ontario.probate.threshold`; caps of 8 accounts and 2 DB pensions per spouse | Now (types, unit); caps and DC wording in stages 5 and 7 |
| T15 | Strict config check | `config:check --strict` is a gate before the URL is shared beyond testers (with O20), not a CI step. The engine already throws on any missing value | Before wider sharing |
| T16 | The editorial clean-up | After stage 3 and before stage 4, one editorial pass (Known gaps FR2-E). The Known gaps table now lists open rows only | Before stage 4 |

## Stage 3 decisions (2026-11-24)

Settled while matching the engine against the reference plan (`tests/fixtures/reference-plan/`, whose `NOTES.md` lists every reading the separate session made). S1 to S4 were decided by the author; S5 and S6 are design choices made to match the reference (S5 applies the existing tie rule). Where these and older text disagree, these win.

| # | Topic | Decision |
|---|---|---|
| S1 | Bracket thresholds that cross | After indexing, each bracket row's `from` is at least the previous row's. Ontario's top two thresholds are not indexed, so from about 2042 the indexed third threshold passes $150,000: its band then shrinks to nothing and rates never step down. Applies to every bracket table (`read.ts` `brackets`) |
| S2 | The working marginal rate's base | The rate applies to taxable amounts: every `TaxableIncome` field, with capital gains at `federal.capital_gains.inclusion_rate` (after losses and the carried loss) and eligible dividends as the cash received; never below 0. For working years and a spouse still working (C2) |
| S3 | Two row fields | `taxableIncomeNom` is always the tax-return taxable income (line 26000), also for a spouse taxed at the working rate. Working years show `afterTaxCashNom` and `surplusNom` of 0: what is saved appears as deposits |
| S4 | A forced sale's gain | When a working year's tax exceeds the yield, the sale that pays it realizes a gain or loss at average cost. It counts in `realizedGainsNom` and in the year's netting with the carried-forward loss, but is not taxed again that year (decision 9a) |
| S5 | Split ties | Two splits whose household tax differs by less than `SPLIT_TIE_TOLERANCE` ($0.000001) are a tie, settled by the tie rule (the smaller transfer, then spouse 1 transferring), so floating-point noise never picks the split |
| S6 | Sheltered yields and deposits | Each year: the draws, then the sheltered yields are added, then the deposits (surplus, a working year's saved income, contributions after the price return), each bought at the account's weights at that point, then price returns on everything |
