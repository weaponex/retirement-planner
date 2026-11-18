# Canadian Retirement Planner (Ontario Couple, Version 1)

*   **Author:** weaponex
*   **Status:** Proposed
*   **Date:** 2026-11-17
*   **Review:** EGM interactive review (Stages 5–9) on 2026-11-17. Round-1 findings were resolved with the author in `docs/reviews/2026-11-17/goldfish_review_report.md`. Stage 9 was re-run once (`implementation_readiness_report_r2.md`): all three reviewers rated the plan "Ready with fixes", with no Blockers. The author concluded the review with the round-2 findings open; they are listed in [Known gaps from review](#known-gaps-from-review) and must be closed before the stage each affects.
*   **Brief:** [concepts_brief.md](../../concepts_brief.md). Open-question numbers (O1–O23) refer to it; see [Open Questions](#open-questions).

--------------------------------------------------------------------------------

## Overview

A free retirement planner that runs entirely in a desktop web browser. It helps a Canadian couple see how three groups of decisions affect each other:

1.  **Spending:** what the couple plans to spend in three phases of retirement (active early years, slower middle years, late years), what the survivor spends after the first death, and how much the couple wants to leave to their children after tax.
2.  **Investing with taxes in mind:** which kinds of investments to hold in which accounts (RRSP/RRIF, TFSA, non-registered, workplace pension accounts), and how to shift from growth toward safer investments as retirement goes on.
3.  **Withdrawals:** which accounts to draw from and in what order, when each spouse starts CPP and OAS, RRIF minimum withdrawals, pension income splitting, the OAS clawback, and the tax due at each death.

The app has four input tabs (Household, plus one for each of the three areas) and a Results panel shown on every tab, all over one shared plan. The user can change anything on any tab, then press **Recalculate** to rerun the whole plan. Each asset class earns a steady average return every year (FP Canada's figures by default, editable), so every result can be traced and repeated. After each run, the app warns when something is at or near a known threshold and says which inputs affect it. It also shows what each tax-related choice is worth: lifetime tax paired with after-tax money left.

The tool shows the effect of choices the user makes and explains why they differ. It does not give personal advice and never moves money. Nothing the user enters leaves the browser.

Version 1 is for the author and two friends, modelled as Ontario couples. The long-term intent is to release it free to all Canadians.

## The Problem

### What retirees face

A Canadian couple planning retirement makes many decisions that interact through the tax system:

*   Spending more in the early years means drawing more from savings, which raises taxable income, which can trigger the OAS clawback.
*   Holding growth investments in the RRSP makes it larger, which raises RRIF minimum withdrawals later and the tax bill when the second spouse dies.
*   Delaying CPP and OAS to 70 raises lifetime government income but means drawing down savings faster in the meantime.
*   When one spouse dies, the survivor is taxed as a single person on much of the same income, which can push them into higher brackets.

Each decision looks reasonable alone. Its effect is only visible when everything is calculated together, year by year, with tax.

### Why existing options fall short for this audience

As reviewed in November 2026:

*   **The Government of Canada's Canadian Retirement Income Calculator** estimates CPP, OAS and savings income, but treats each separately. It uses one spending figure and does not model withdrawal order, tax by account type, account placement, or what happens at each death.
*   **Paid planning tools** (for example Optiml, ProjectionLab) do much of this, but cost money, store the user's financial details on a company's servers, and are built to produce a plan rather than to explain why one choice beats another.
*   **Spreadsheets** can do anything in principle, but getting Canadian tax, RRIF rules, OAS clawback and death taxation right in a spreadsheet takes specialist knowledge.

### What went wrong last time

The author built a single-file prototype that went through about 30 rounds of patches. It failed for three reasons, recorded in the prototype's decision log (`docs/history/prototype-postmortem.md`):

*   it mixed today's dollars and future dollars in the same calculation;
*   tax was dropped from withdrawals during a rewrite and never restored;
*   nothing was ever run as a test; it was only checked by reading the code.

Its tax constants were also wrong or out of date (the lowest federal rate entered as 0%, an older year's OAS clawback threshold, an incorrect RRIF table). This design is a clean rewrite. The prototype's code is discarded; only its decision log carries over as history.

### What this design does about it

*   one calculation engine that works in future (nominal) dollars throughout, converting from and to today's dollars only at input and display;
*   every rule value (tax rates, benefit amounts, RRIF tables) stored in a versioned config file with its source, never written into code or supplied from an AI agent's memory;
*   tests that run automatically against answers from outside sources, plus accounting checks the engine runs on every recalculation and refuses to show a result that fails them.

## Goals

### Product goals

*   **G1. Linked planning.** The user can change inputs on any of the four tabs, recalculate, and see the effect on all three. After each recalculation, the app lists what changed since the previous run (for example "first shortfall year 2041 → none; after-tax legacy −$62k; clawback years 3 → 7").
*   **G2. Tax-aware results for an Ontario couple.** Each year of the plan computes federal and Ontario tax for each spouse separately, including credits, the OAS clawback, and pension income splitting, based on actual taxable income by account type.
*   **G3. Both deaths modelled.** Each spouse has an editable life expectancy target. The plan handles the first death (rollovers, survivor benefits, single-filer tax, survivor spending) and the second death (final-return tax on the RRIF, investments taxed as if sold, Ontario probate) and reports the after-tax legacy.
*   **G4. Steady, traceable returns.** Each asset class earns one fixed compound return every year, from FP Canada's guidelines by default, and the user can override it. The same inputs and config always give the same results. Year-to-year market swings are not modelled in version 1 (see [Risks](#risks--mitigations)).
*   **G5. Show what placement and the withdrawal strategy are worth.** For the user's choices, the app shows lifetime tax paired with after-tax money left, compared against a simple baseline at the same returns (see [Result definitions](#result-definitions)).
*   **G6. Threshold warnings.** After each recalculation, the app shows warnings when a defined threshold is near or crossed, each with the inputs that affect it. The list starts with 8 warnings and grows through use.
*   **G7. Private, with a file to keep.** No user data leaves the app's page. The plan saves automatically in the browser, but browsers can clear that storage, so the export file is the copy to keep. Exports can be imported again, including into a newer version of the app. Export files are not encrypted.
*   **G8. Defined-benefit pensions.** Either spouse can enter a DB pension from their pension statement, and the engine includes it in tax, splitting and survivor calculations.

### Correctness goals

*   **G9. Sourced rule values.** Every rule value lives in a config file, one per tax year, with its unit, inflation indexing, source link, date fetched and validation status. The app shows which tax year it is using and flags any unvalidated or outdated value.
*   **G10. Verified engine.** Tax results match an outside tax calculator within $1 per return on a fixed set of test cases. The full year-by-year loop matches, within $1 per cell, a reference plan built by a separate AI session from the written design; that session can share the design's misreadings (see [Risks](#risks--mitigations)). The engine's accounting checks pass on every run in production, and a run that fails them shows an error instead of results.

## Success Criteria for Version 1

The author judges each tester. A tester passes when, without help, they:

*   complete a full plan for their household;
*   change one input, recalculate, and name one effect on another tab;
*   state one tax-placement idea, with a dollar figure from their own results.

Separately, a full recalculation finishes in under 2 seconds on the reference machine (see [Performance](#performance)).

## Non-Goals

*   **Other provinces and Quebec.** Version 1 is Ontario only. No Ontario-specific values are hard-coded in the engine, so other provinces can be added later; Quebec (QPP, separate tax system) is not part of that promise.
*   **Single people.** Version 1 models couples. (Open question O16 asks whether singles are needed for the test group.)
*   **Child-related planning other than legacy.** No RESP, no Canada Child Benefit.
*   **Personal advice or optimization.** The app shows results of choices the user makes and compares them with simple baselines. It does not recommend, does not search for an "optimal" plan, and never says "you should". Trades and money movement are out of scope.
*   **Accounts, sync, servers.** No sign-in, no cloud storage, no sharing except by exporting a file.
*   **Fetching rule values while running.** Values are fetched at build time and bundled with the app.
*   **Mobile layout, colour themes, PDF export.**
*   **Commuted value of DB pensions** (taking a lump sum instead of the pension).
*   **Tax features:** alternative minimum tax, GIS, tax-loss harvesting, spousal RRSP attribution rules, CPP pension sharing, the CPP death benefit, using the younger spouse's age for RRIF minimums.
*   **Employment income detail.** A still-working spouse's pay is entered as one after-tax amount; payroll taxes and RRSP deductions are not modelled.
*   **Other life events:** annuity purchases, random lifespans, long-term care cost shocks, one-time events such as selling a home or receiving an inheritance.

## Open Questions

O1–O21 come from [concepts_brief.md](../../concepts_brief.md); O22–O23 arose while drafting. A "mechanical default" is a choice with one sensible answer, made in design; the author may override it.

| ID | Topic | Status |
|---|---|---|
| O1 | Inflation model | Resolved: one fixed rate ([Decisions](#decisions-made-for-this-plan)) |
| O2 | Calendar conventions | Resolved: [Units and conventions](#units-and-conventions) |
| O3 | Return method and asset classes | Resolved: [Asset classes and returns](#asset-classes-and-returns-o3) |
| O4 | Placement model and mix counting | Resolved: presets, face value |
| O5 | Growth-to-safety settings | Resolved: named shapes ([Design values](#design-values-version-1)) |
| O6 | Foreign withholding tax | Resolved: one config rate ([Tax scope](#tax-scope-o11)) |
| O7 | Withdrawal strategies | Resolved: [Withdrawal strategies](#withdrawal-strategies-o7-o8) |
| O8 | Pension splitting | Resolved: two-pass split search |
| O9 | DC pension as LIF | Resolved: LIF with optional 50% unlock |
| O10 | CPP estimate for early retirees | Resolved: user estimate plus help note |
| O11 | Tax items in or out | Resolved: [Tax scope](#tax-scope-o11) |
| O12 | Probate and home | Resolved: [Death and estate](#death-and-estate-o12-o23) |
| O13 | Success, typical, bad | Resolved: with fixed returns, one result: whether spending is covered every year ([Result definitions](#result-definitions)) |
| O14 | Warnings and tips | Resolved: [Warnings](#warnings-o14) |
| O15 | Empty start, sample plan | Resolved: [Persistence](#persistence) |
| **O16** | **Test friends' situations** | **Open.** Are single people, or a general "other income" stream, needed? If yes, scope changes before implementation. |
| O17 | Spending categories | Resolved: deferred |
| O18 | Recalculation mode | Resolved: button only |
| O19 | Placement lesson in first release | Resolved: yes, built in stage 4 |
| **O20** | **Disclaimer and FSRA check** | **Open.** Must be resolved before the URL is shared beyond testers ([Hosting](#hosting-and-repository-author)). |
| O21 | Splitting the context document | Resolved: `docs/history/` (file 18) |
| O22 | Volatility and correlation source | Withdrawn on 2026-11-18: version 1 uses fixed returns, so no volatility or correlation is needed ([Asset classes and returns](#asset-classes-and-returns-o3)) |
| O23 | Probate defaults | Resolved: confirmed by the author on 2026-11-17 ([Death and estate](#death-and-estate-o12-o23)) |

## Critical User Journeys (CUJs)

### CUJ 1: First plan

*   **Given**: A couple opens the app for the first time. No plan is saved in the browser.
*   **When**: They enter their birth years and months, retirement years, life expectancy targets, accounts and balances, CPP and OAS start ages, DB pension (if any), spending for each phase, survivor spending percentage and legacy goal, then press Recalculate.
*   **Then**: The app shows, in today's dollars, year-by-year income by source, account balances, tax by spouse, whether spending is covered every year (and the first year it isn't), the after-tax legacy, and any warnings. The plan is saved in the browser automatically.

### CUJ 2: Change one tab, see the others

*   **Given**: A recalculated plan with a warning that the OAS clawback starts at 72.
*   **When**: The user opens the Withdrawals tab, changes the strategy to draw the RRSP down earlier, and presses Recalculate.
*   **Then**: Results on every tab update. The change summary lists the effect on lifetime tax, after-tax legacy, the first shortfall year and clawback years. Before Recalculate is pressed, every result on every tab is marked as out of date.

### CUJ 3: Learn what placement is worth

*   **Given**: A recalculated plan.
*   **When**: The user opens the Investing tab and chooses a different account placement for bonds and stocks, then presses Recalculate.
*   **Then**: The app shows lifetime tax and after-tax money left for the chosen placement compared with a same-mix-everywhere baseline at the same returns, with a short plain-English explanation of why the difference arises.

### CUJ 4: First death

*   **Given**: A plan where one spouse's life expectancy target is 78 and the other's is 94, with a DB pension that pays 60% to the survivor.
*   **When**: The user recalculates and looks at the years after 78.
*   **Then**: The deceased spouse's accounts move to the survivor without tax, the deceased's OAS stops, the CPP survivor benefit and the DB survivor share start, the survivor is taxed as a single person, and spending drops to the survivor percentage. Any jump in tax is visible and explained.

### CUJ 5: Resume on another day

*   **Given**: A user built a plan last week and exported it to a file.
*   **When**: The browser storage has since been cleared, and the user imports the file into a newer version of the app.
*   **Then**: The plan loads with all inputs intact. A file from a newer app version is refused with a message naming both versions. Results are recalculated with the current config, and the app shows which tax year's values are in use.

### CUJ 6: Admin updates the yearly values

*   **Given**: A new tax year has started.
*   **When**: The admin (the author, for now) has two separate AI sessions fetch every tax and benefit rule from the official sources and reviews any values where the two disagree; one session fetches the market assumptions, which the admin spot-checks. The admin then marks the new config as validated.
*   **Then**: The new config ships with the next build. Until it is validated, the app shows a notice that some values are unvalidated or from the previous year.

## Technical Plan (Architecture)

### Decisions made for this plan

| Topic | Decision | Chosen by |
|---|---|---|
| Returns (O3) | One fixed compound return per asset class every year, from FP Canada, editable; no random markets or stress paths (revised 2026-11-18, replacing generated returns) | Author |
| Inflation (O1) | One fixed rate for every year, from FP Canada guidelines, in the config | Author |
| Account placement (O4) | 2–3 named presets compared with a "same mix everywhere" baseline | Author |
| How the overall mix is counted (O4) | Face value (balances as on statements), with an after-tax stock share shown next to each comparison | Author (readout added by design) |
| Withdrawal strategies (O7) | Two named strategies, compared at the same returns | Author |
| Growth-to-safety shift (O5) | 2–3 named shapes with fixed percentages from the config | Author |
| Warning tips (O14) | Computed by nudging related inputs and rerunning the plan | Author (narrowed in review) |
| Screen framework | React | Author |
| Recalculation (O18) | Button only, no live preview | Author (brainstorm) |
| Retirement timing | A retirement year for each spouse; household spending starts at the first; a still-working spouse enters after-tax pay | Author (review) |
| Foreign withholding tax | One config rate on foreign dividends in the TFSA and registered accounts | Author (review) |
| Fetch checks | Tax and benefit rules fetched twice and compared; market assumptions fetched once and spot-checked | Author (2026-11-18) |
| Cash yields | One yield per class, read from index and fund factsheets; each class pays one income type | Author (2026-11-18) |
| LIF minimum and conversion deadline | The federal RRIF minimum and age-71 rule, which Ontario applies to LIFs and LIRAs; no Ontario keys of their own | Author (2026-11-18) |
| First-year benefits | Birth month for each spouse; first year pro-rated | Author (review) |
| Design values | As listed in [Design values](#design-values-version-1) | Author (review) |
| Public URL | Unlisted, `noindex`, shared only with testers until O20 | Author (review) |
| Repository name | `retirement-planner` | Author (review) |
| Everything else in this section | Mechanical defaults listed where they appear | Design; author may override in review |

### Components and data flow

```text
+---------------------------- Browser (app page) ------------------------------+
|                                                                              |
|  React screens                       Plan store (one source of truth)        |
|  +--------------+  edits --------->  +---------------------------------+     |
|  | Household    |                    | inputs + inputsRevision         |     |
|  | Spending     |  <------ reads --  | result (+ revision it came from)|     |
|  | Investing    |                    | previousResult (for the diff)   |     |
|  | Withdrawals  |                    +-------+-------------------^-----+     |
|  | Results panel|                            | autosave          | Result    |
|  +------+-------+                            v                   |           |
|         | Recalculate               localStorage (inputs only)    |          |
|         v                                                         |          |
|  +------------------------------ Web Worker ---------------------+-------+   |
|  |  Engine (pure TypeScript, future dollars only)                        |   |
|  |   normalizeInputs --> fixed returns (config or user overrides)        |   |
|  |        |                                   |                          |   |
|  |        v                                   v                          |   |
|  |   jurisdiction (federal + Ontario)   variants: user plan, placement   |   |
|  |   tax, benefits, accounts            baseline, other strategy         |   |
|  |        |                                   |                          |   |
|  |        +--------> year solver <------------+                          |   |
|  |                       |                                               |   |
|  |                       v                                               |   |
|  |   invariants --> summaries --> warnings --> tips --> Result           |   |
|  +-----------------------------------------------------------------------+   |
|                                                                              |
|  Bundled config (one tax year, read-only at run time)                        |
+------------------------------------------------------------------------------+

 Build time only: two AI fetch sessions --> candidate configs --> config:compare
                  --> admin review --> validated config committed to the repo
```

**Screens.** Five areas: **Household** (people, accounts, balances, contributions, pensions), **Spending**, **Investing**, **Withdrawals**, and a **Results** panel visible on every tab (key numbers, warnings, change summary, Recalculate button). The brief named three planning areas; Household is added because ages, accounts and pensions feed all three and belong to none of them.

**One store.** The plan lives in one store (Zustand, mechanical choice). Screens read from it and write inputs straight to it. No component keeps its own copy of a plan value.

**Stale results and the change summary.** The store keeps an `inputsRevision` counter, increased by every input edit and plan load. Each result records the revision it was computed from. When the two differ, every result on every tab is dimmed and labelled "Inputs changed — press Recalculate". After a run, the previous result is kept in memory, and the change summary lists differences in the headline numbers (whether spending is covered, after-tax legacy, lifetime tax, clawback years, first shortfall year, warnings added or cleared). The previous result is not saved across browser sessions.

**Worker.** All calculation runs in a Web Worker so the screen stays responsive; the button shows "Calculating…" while it runs. A run takes about a second, so there is no progress bar or Cancel. No shared memory or special headers are needed.

### Units and conventions

*   **Engine unit: future (nominal) dollars only.** Every money input is entered in today's dollars. `normalizeInputs(inputs, cfg)` converts all of them once, as the engine receives them, using a deflator built from the config's fixed inflation rate. `toDisplay(rows, deflator)` converts results back for the screens. The today's-dollar type is never imported inside `src/engine/solver`, `project` or `simulate` (enforced by lint), so the calculation has nothing in today's dollars to mix up.
*   **Valuation date:** January 1 of the plan's start year (an input, defaulting to the current year). The inflation factor for year *t* after the start is (1 + inflation)^t, with fixed inflation.
*   **Rows:** one per calendar year, from the start year to the year the second spouse reaches their life expectancy target. Each spouse's age in a row is the age they reach during that year (author). This matches CRA's end-of-year age rules for the age amount, the pension income credit and pension splitting. The RRIF minimum uses the age at the start of the year (row age − 1).
*   **First year of benefits (author):** each spouse has a birth month. CPP, OAS and DB payments start the month after the start birthday, so the first year pays only those months. The OAS 75+ increase is pro-rated the same way.
*   **Retirement (author):** each spouse has a retirement year. Household spending starts in the first spouse's retirement year. A spouse still working after that enters their after-tax pay in today's dollars, counted as cash income until they retire. CPP or OAS they collect while working is taxed at the working-years marginal rate they enter. Spending phases and growth-to-safety shapes are measured in years from the first retirement.
*   **Timing within a year:** rebalancing happens first, then fixed income and required withdrawals, then the withdrawal solve, all at the start of the year; returns apply to what remains; contributions during working years land at the end of the year. Tax is settled in the same year.
*   **Deaths** happen at the end of the year the spouse reaches their target. The first-death transfers apply from the following year. If both spouses die in the same year, the first-death rollover is applied and then the survivor's final return is filed, in that year.
*   **Indexing:** each config value says whether it rises with inflation. Indexed values grow at the fixed rate; non-indexed values (for example Ontario's $150k and $220k bracket thresholds, the $50k probate threshold) stay fixed in future dollars.

### Config contract

*   **Two kinds of config, one set of files per tax year:**
    *   **Rule values** (`federal.json`, `ontario.json`, `market.json`): sourced from official or published pages and validated by the admin (the author, for now).
    *   **Planning choices** (`planning.json`, `warnings.json`): the author's design values. Their source is recorded as `"author decision, <date>"` and the author validates them.
*   **Entry shape:** `{ value, unit, taxYear, indexed, source: { url, locator }, fetchedOn, validation: { status, by, on } }`.
    *   `value` is one of: a number; a bracket table `[{ from, rate, indexed? }]` (a row's `indexed` overrides the entry flag for that threshold, because Ontario's top two thresholds are not indexed); an age-keyed table `{ "71": 0.0528, … }`; a step schedule `[{ from, amount }]`; a phase-in schedule `[{ from, rate, cap }]` (within a band the amount is the previous row's `cap` (0 for the first row) plus `rate` × (income − `from`), up to this row's `cap`); or, for planning choices only, a structured object (presets, shapes, stress paths).
    *   `unit` is one of `CAD_per_year`, `CAD_per_month`, `rate`, `age`, `years`, `count`, `none`.
*   **Key tree:** the dotted keys below are the complete, authoritative list of rule-value keys. `config/SOURCES.md` adds each key's unit, source page and location on the page, and must list exactly these keys; `config:check` fails on any key missing from either side. Adding a key means editing this list first. Keys: `federal.tax.brackets`, `federal.credits.basic`, `federal.credits.age.amount`, `federal.credits.age.min_age`, `federal.credits.age.reduction_threshold`, `federal.credits.age.reduction_rate`, `federal.credits.pension.amount`, `federal.credits.pension.min_age_rrif`, `federal.capital_gains.inclusion_rate`, `federal.dividend.eligible.gross_up`, `federal.dividend.eligible.credit_rate`, `federal.oas.base_at_65`, `federal.oas.residence.min_years`, `federal.oas.residence.full_years`, `federal.oas.deferral.per_month`, `federal.oas.deferral.max_months`, `federal.oas.increase_age`, `federal.oas.increase_rate`, `federal.oas.recovery.threshold`, `federal.oas.recovery.rate`, `federal.cpp.start.earliest`, `federal.cpp.start.latest`, `federal.cpp.adjust.early_per_month`, `federal.cpp.adjust.late_per_month`, `federal.cpp.max_at_65`, `federal.cpp.survivor.pct_65_plus`, `federal.cpp.survivor.flat_under_65`, `federal.cpp.survivor.pct_under_65`, `federal.cpp.survivor.max_combined`, `federal.rrif.min_factor`, `federal.rrif.latest_conversion_age`, `federal.tfsa.annual_limit`, `federal.split.max_share`, `federal.split.min_age_rrif`, `ontario.tax.brackets`, `ontario.credits.basic`, `ontario.credits.age.amount`, `ontario.credits.age.reduction_threshold`, `ontario.credits.age.reduction_rate`, `ontario.credits.pension.amount`, `ontario.dividend.eligible.credit_rate`, `ontario.surtax.thresholds`, `ontario.surtax.rates`, `ontario.health_premium.schedule`, `ontario.tax_reduction.basic`, `ontario.probate.threshold`, `ontario.probate.rate`, `ontario.lif.max_factor`, `ontario.lif.unlock_share`, `market.cad_equity.geometric_return`, `market.bonds.geometric_return`, `market.global_equity.components.{us,intl_developed,emerging}`, `market.<class>.yield`, `market.<class>.fee`, `market.inflation`, `market.foreign_withholding_rate`. Here `<class>` is one of the asset-class ids below.
*   **Persisted ids** (permanent once version 1 saves plans):
    *   asset classes: `cad_equity`, `global_equity`, `bonds`;
    *   shapes: `steady`, `gradual_shift`, `safety_first_regrow`;
    *   presets: `bonds_sheltered_first`, `growth_tax_free_first` (the baseline `same_mix` is internal and never saved);
    *   strategies: `registered_last`, `fill_brackets`;
    *   account ids: `<type>-<owner>-<n>`, for example `rrsp-0-1`, assigned once when the account is created and never reused.
*   **Engine settings** (solver tolerance and step cap, split-search step, invariant tolerance) are not config. They live in `src/engine/constants.ts`, along with `MONTHS_PER_YEAR`. It is the one engine file exempt from the no-magic-numbers lint rule.
*   **Loading:** config files are JSON, imported directly. `config/CURRENT_YEAR` names the tax year; a generated module, `src/engine/config/bundle.ts`, imports every file for that year. The Worker, the Vitest tests and the `tsx` tools all import that one module. Config is never fetched at run time.
*   **Status:** `configStatus(today)` returns the tax year, the list of unvalidated keys, and `outOfDate = today's year > taxYear`. The app shows the tax year and a notice when anything is unvalidated or out of date.
*   **OAS** is updated once a year with the other values. Amounts the sources publish monthly (OAS, CPP maximum, CPP survivor flat rate and combined maximum) are stored as `CAD_per_month` exactly as published; the loader multiplies by 12. The OAS figure is the January quarter's.
*   **Fetch checks (author):** tax and benefit rules (`federal.json`, `ontario.json`) are fetched twice, independently, and compared, because an error there gives a wrong answer for certain. Market assumptions (`market.json`) are estimates of the future, so one fetch and a spot-check by the admin are enough.
*   **Market yields** are read from index and fund factsheets, which change monthly; each locator records the factsheet's as-of date.
*   The engine never contains a rule value as a number in code.

### Jurisdiction

The engine calls a jurisdiction module for provincial tax and credits, the Ontario surtax and Health Premium, the Ontario Tax Reduction, probate, and LIF rules. Ontario is the only implementation. Federal rules are a separate module. No Ontario-specific value or rule appears outside the Ontario module, so another province can be added as a new module. Quebec is not part of this promise.

### Tax scope (O11)

*   **In:**
    *   federal and Ontario brackets;
    *   basic personal amount;
    *   age amount and its income-based reduction;
    *   pension income credit;
    *   eligible dividend gross-up and credit;
    *   capital gains at 50% inclusion;
    *   Ontario surtax: the first rate on Ontario basic tax above the first threshold, plus the second rate on Ontario basic tax above the second threshold (additive, and applied to Ontario tax, not to income);
    *   Ontario Health Premium, phased in by income band up to each band's cap (`phaseIn` shape);
    *   Ontario Tax Reduction, basic amount only (no dependants are modelled);
    *   OAS recovery tax (clawback), calculated inside the tax function from actual net income.
*   **Foreign withholding tax (author):** one config rate applies to the foreign-dividend yield of global stocks held in the TFSA and in RRSP/RRIF/LIRA/LIF, where it can't be recovered. In non-registered accounts it is treated as recovered through the foreign tax credit, which is not modelled in detail. The rate assumes Canadian-listed funds.
*   **Out:** non-eligible dividends, alternative minimum tax, GIS, the CPP death benefit, other credits. Foreign dividends in non-registered accounts are taxed as ordinary income.

### Accounts

Every account has an owner (spouse 1 or spouse 2). Types:

*   **RRSP**, converting to a **RRIF** at an age the user sets (no later than the end of the year the owner turns 71). RRIF minimums use the CRA factor for the owner's age at the start of the year. No minimum applies in the year the RRIF opens.
*   **LIRA**, converting to a **LIF** at a user-set age, no later than the end of the year the owner turns 71 (a validation rule), with a yearly minimum and maximum. No minimum applies in the year the LIF opens.
    *   The maximum is Ontario's: FSRA's table of percentages by age (`ontario.lif.max_factor`).
    *   The minimum is the federal RRIF minimum (`federal.rrif.min_factor`). Ontario sets no table of its own; FSRA policy L200-303 says the LIF minimum is the Income Tax Regulations' RRIF minimum.
    *   The age-71 deadline is the federal RRSP rule, because a LIRA is an RRSP; it uses `federal.rrif.latest_conversion_age`. The one-time 50% unlock is an optional choice at conversion; if chosen, half moves to the owner's RRSP/RRIF (O9).
*   **TFSA**, with contribution room tracked from a user-entered starting room plus the yearly limit from the config.
*   **Non-registered**, holding pooled positions per asset class with their original cost (adjusted cost base, the amount paid). Each year's interest, dividends and realized gains are taxed by type. Sales are spread across positions in proportion, at average cost.
*   **DB pension** (income stream, not a balance): lifetime amount and start age, optional bridge amount until an end age, indexing (full, fixed percentage or none), survivor percentage.

CPP and OAS: the user enters each spouse's CPP estimate at 65 and start age, and years of Canadian residence for OAS. A help note explains that an estimate from My Service Canada assumes contributions continue to 65, and links to Service Canada's explanation of adjusting for years without contributions (O10). All coefficients below come from the config:

*   **CPP:** the estimate at 65, adjusted per month before or after 65 (start between the earliest and latest ages).
*   **OAS:** zero below the minimum residence years; otherwise `min(years, full_years) / full_years` × base × (1 + per-month deferral rate × deferral months, capped at the maximum), plus the 75+ increase.
*   **CPP survivor benefit:** for a survivor 65 or older, a percentage of the deceased's pension; for a survivor under 65, a flat amount plus a percentage. In both cases the survivor's own pension plus the survivor benefit is capped at the maximum pension.

### Asset classes and returns (O3)

*   **Three asset classes:** Canadian stocks, global stocks, bonds. Each has config entries for:
    *   expected compound (geometric) return, from FP Canada. FP Canada publishes no single "global" return, so `global_equity` is a blend of its U.S., international developed and emerging-market returns, weighted by `planning.global_equity_weights` (author: 60/30/10);
    *   a fixed yearly cash yield (`market.<class>.yield`, sources below);
    *   a default yearly fee that the user can edit.
*   **Fixed returns (author, 2026-11-18):** every year, each class earns its expected compound return (or the user's override), less fees. There are no random markets and no stress paths, so results show the plan under steady average markets. They do not show sequence risk, the damage a bad market early in retirement can do, and a safer growth-to-safety shape shows only its lower return ([Alternative C](#alternative-c-fixed-returns-only)). The screens say returns are steady averages.
*   **Cash yields (author):** each class pays one income type.
    *   Canadian stocks: eligible dividends, at the "Distribution Yield" on the factsheet of the iShares Core S&P/TSX Capped Composite Index ETF (XIC).
    *   Global stocks: foreign dividends, at the 60/30/10 blend of the "Div Yld (%)" on MSCI's USA, EAFE and Emerging Markets index factsheets.
    *   Bonds: interest, at the "Weighted Average Coupon" on the factsheet of the iShares Core Canadian Universe Bond Index ETF (XBB). The coupon is used rather than the yield to maturity because the yield here is the cash paid out.
    *   Yields are snapshots on the fetch date and are refreshed each year with the other values.
*   **Income and price:** the cash yield is applied to the start-of-year balance and paid as cash. The price return is the year's total return minus that yield; it can be negative, the yield can't. Fees are subtracted from the total return.
*   **Return overrides (author):** the user can override the expected return for each asset class. The config default is shown next to each override, and the override is saved in the plan. Yields and income types always come from the config. An override more than `planning.override_margin` (0.5 percentage point) above FP Canada's figure for that class triggers the "optimistic returns" warning.

### Placement and the growth-to-safety shift (O4, O5)

*   **Growth-to-safety shape:** one of three named shapes, defined in [Design values](#design-values-version-1). Each sets the overall stock share by years from the first retirement. The stock share is split between Canadian and global stocks by a config ratio.
*   **Placement preset:** one of two named presets that say, for each asset class, which account types to fill first. "Same mix everywhere" is the baseline only, not a selectable preset; it holds the overall mix in every account.
*   **Filling accounts:** asset classes are placed in this order: bonds, then global stocks, then Canadian stocks. Each class fills accounts in its preset order until its target share is reached. Balances are counted at face value.
*   **Yearly rebalance:** at the start of each year, after any first-death transfers, the engine rebalances every account to its target holdings. Moves inside registered accounts and the TFSA are tax-free. Sales in non-registered accounts realize gains, which are taxed in the same year inside the withdrawal solve. A full rebalance every year, in both the user's plan and the baseline, is an accepted assumption (see Risks).
*   **After-tax stock share readout:** next to each placement comparison, the app shows the stock share of the chosen placement and of the baseline after reducing registered balances by an average withdrawal tax rate. That rate is the plan's lifetime income tax divided by its lifetime registered withdrawals. It makes any extra hidden risk visible.

### Withdrawal strategies (O7, O8)

*   **"Registered last":** after required RRIF and LIF minimums, draw from non-registered, then RRSP/RRIF and LIF (in proportion to their balances, with LIF draws capped at the LIF maximum), then TFSA.
*   **"Fill lower brackets first":** a required draw, taken before the withdrawal solve. Each spouse's taxable income (before splitting) is topped up from their RRSP/RRIF, then LIF, to a target the user sets for that spouse in today's dollars, even if spending doesn't need the money. Whatever is still needed then follows the "registered last" order. The input shows the current OAS clawback threshold and bracket thresholds for reference. After a death, the survivor keeps their own target. When the user chose "Registered last", the comparison variant uses a config default target: the top of the lowest federal bracket.
*   **Between spouses:** non-registered and TFSA draws come from each spouse in proportion to their balances.
*   **Surplus:** money forced out by minimums or the bracket target beyond what spending needs goes into the owner's TFSA up to available room, then into their non-registered account.
*   **Pension income splitting:** eligible pension income is DB payments at any age, and RRIF and LIF payments if the transferring spouse is 65 or older. The split search tries 0% to 50% in 5% steps and keeps the split with the lowest household tax. This approximates the split tax software finds at filing time; it is not presented as a recommendation. To keep it fast, the year is first solved with the previous year's split (50/50 in the first year), then the search runs once at that answer, and the year is solved again only if the best split changed (at most 2 passes).

### The year solver

Each year, for each variant, in this order:

```text
1.  Set ages and who is alive. If the first death happened last year, apply the
    first-death transfers:
      - RRSP/RRIF/LIRA/LIF and non-registered positions move to the survivor
        (non-registered at their original cost);
      - the TFSA moves to the survivor without using room;
      - the deceased's CPP, OAS and DB stop;
      - the CPP survivor benefit (capped) and the DB survivor share start;
      - spending switches to the survivor percentage.
2.  Rebalance every account to this year's target holdings. Record the gains
    realized in non-registered accounts as this year's taxable income.
3.  Fixed income for each spouse: CPP, OAS (with the 75+ increase), DB lifetime
    and bridge amounts, survivor benefits (first year pro-rated by birth month),
    and after-tax pay for a spouse still working.
4.  Required draws: RRIF and LIF minimums; the "fill lower brackets first"
    top-up, if that strategy is chosen; the non-registered cash yield
    (interest and dividends on the start-of-year balance).
5.  Solve for the extra gross withdrawal W >= 0 so that after-tax cash equals
    the spending need (phase amount x inflation factor, x survivor percentage
    after the first death; zero before the first retirement):
      - W follows the "registered last" order;
      - tax for each spouse uses the current pension split (two-pass rule);
      - find W by bisection between 0 and everything available; this always
        works because after-tax cash rises when W rises (no one pays more than
        100% tax on an extra dollar; a property test checks this);
      - precision $0.01, at most 32 steps;
      - if even everything available is short, record the shortfall.
6.  Put any surplus into the TFSA (within room), then non-registered.
7.  Apply the year's price returns, net of fees, to what remains. Update the
    original cost of non-registered positions.
8.  If this is the second death year, file the final return:
      - the full RRSP/RRIF/LIRA/LIF balance counts as income, converted or not;
      - non-registered positions are taxed as if sold;
      - TFSA balances pass tax-free;
      - Ontario probate applies to estate assets (O23);
      - the result is the after-tax legacy.
9.  Run invariant checks (see Verification).
```

Years before the first retirement run in `project/workingYear.ts` instead:

*   contributions are entered in today's dollars and indexed;
*   RRSP deductions are not modelled;
*   TFSA room grows by the yearly limit;
*   non-registered income is taxed at the working-years marginal rate the user enters.

### Death and estate (O12, O23)

*   **Probate defaults:** RRSP/RRIF/LIF and TFSA accounts are assumed to name a beneficiary (the spouse, then the children), so they skip probate. Non-registered accounts pass through the estate and pay probate.
*   **The home:** an optional home value. If entered, it counts toward the legacy and probate, is exempt from capital gains tax, and grows at the fixed inflation rate.
*   The author confirmed these defaults on 2026-11-17 (O23). Jointly held accounts are not modelled; every account has one owner.

### Results and comparisons (O13)

#### Result definitions

*   **Spending covered:** whether after-tax cash meets the spending need in every year of the plan. If not, the result shows the first shortfall year and the total shortfall. It is labelled "assuming deaths at the target ages and steady average returns". Whether the legacy goal is met is reported separately.
*   **Lifetime tax:** federal and Ontario income tax, the OAS clawback, final-return tax and probate, summed in today's dollars.
*   **After-tax money left:** the after-tax legacy at the second death, in today's dollars. This document uses "after-tax legacy" and "money left" for the same number.
*   **Clawback years:** household years in which either spouse pays any clawback.

#### Comparisons

*   **Variants:** each run also computes up to two variants at the same returns:
    *   the placement baseline;
    *   the other withdrawal strategy.

    A variant identical to the user's choice is not run; the comparison shows "This is your current choice". Each comparison reports lifetime tax paired with after-tax money left. When the two move in opposite directions, the app says so and explains why. Explanations are fixed templates, not generated text.
*   **No shape comparison:** with steady returns a safer growth-to-safety shape only lowers returns, so a comparison would always favour more stocks. The Investing tab says so instead of showing one.
*   **Detail:** the user's plan returns every row and every account for the year-by-year table and charts; variants return summary numbers only.

### Warnings (O14)

*   **Definitions:** each warning is one code object in `src/engine/warnings/definitions.ts`, holding its check (a pure function of the result), explanation, basis (the plan's results, or inputs), years covered, scope (per spouse or household), unit and related inputs. `warnings.json` holds only the numeric triggers and nudge steps. Repeated years collapse into one line ("first at 72, for 6 years").
*   **Starting set (8):** listed with their triggers in [Design values](#design-values-version-1). "Low chance of success" was dropped with random returns (2026-11-18). "Next tax bracket", "unbalanced incomes", "contribution room exceeded" and "high early withdrawal rate" are dropped for version 1. The first three are covered by the bracket-filling strategy and comparisons; the last fired for intentional bridge-year draw-downs.
*   **Computed tips:** for a warning measured on the plan's results, the engine reruns the plan once with each related input nudged up and once nudged down by its configured step. It ranks the inputs by how much they move the warning and shows the top three with the size of the effect. Wording is always conditional: "Under these assumptions, delaying OAS by 2 years removes 4 of 6 clawback years."

### Design values (version 1)

The author's planning choices, stored in `planning.json` and `warnings.json` as "author decision, 2026-11-17".

**Growth-to-safety shapes.** Stock share by years from the first retirement, joined by straight lines and held flat beyond the end points:

| Shape | Points |
|---|---|
| Steady | 60% throughout |
| Gradual shift | 70% at −10 years, 50% at retirement, 40% at +15 years |
| Safety first, then regrow | 60% at −5 years, 40% at retirement, 60% at +15 years |

**Stock split:** 30% Canadian, 70% global.

**Global stock blend (author):** 60% U.S., 30% international developed, 10% emerging markets, applied to FP Canada's three published returns. A planning choice, not a sourced weight.

**Placement presets.** Fill order for each asset class (registered means RRSP/RRIF/LIRA/LIF):

| Preset | Bonds | Global stocks | Canadian stocks |
|---|---|---|---|
| Bonds sheltered first | Registered, TFSA, non-registered | TFSA, registered, non-registered | Non-registered, TFSA, registered |
| Growth tax-free first | Registered, non-registered, TFSA | TFSA, non-registered, registered | Non-registered, registered, TFSA |

**Optimistic-return limit (author):** FP Canada's guideline for the class + 0.5 percentage point (compound return, before fees), matching the deviation margin FP Canada allows planners. The engine calculates the limit from `planning.override_margin`; it is not a config value of its own.

**Warning triggers** (dollar amounts in today's dollars):

| Warning | Fires when | Measured on |
|---|---|---|
| Money runs out | First shortfall before the second death, or within the last 5 years | Plan |
| OAS clawback | A spouse's net income within $5,000 of the threshold, or above it | Plan |
| RRIF minimum forces extra income | Forced income more than $5,000 above need | Plan |
| Large registered balance at second death | More than $250,000 | Plan |
| Legacy goal missed | Below goal | Plan |
| Bridge years | Shortfall before both spouses' CPP and OAS have started | Plan |
| Survivor tax jump | Survivor's average tax rate up more than 5 points vs the last year as a couple | Plan |
| Optimistic returns | Any override above its limit | Inputs |

**Nudge steps:**

| Input | Step |
|---|---|
| Spending phases | ±5% |
| CPP/OAS start age | ±1 year |
| Bracket target | ±$5,000 |
| Retirement year | ±1 |
| Survivor percentage | ±5 points |

**Other defaults:**

*   **Life expectancy target (author):** the age a person of that sex has a 25% chance of reaching, from FP Canada's Projection Assumption Guidelines. The guidelines give this by current age (rows every 5 years from 20 to 100), so `planning.life_expectancy.female` and `.male` are age tables. The default for each spouse uses the row at or below their current age (for example, age 63 uses the 60 row). A note next to the input says a lower target raises the risk of outliving the plan.
*   **Survivor spending:** 70%. A single person needs about 1/√2 ≈ 71% of a couple's spending to keep the same standard of living, according to the square-root household equivalence scale.

### Data contracts

TypeScript-style definitions. Money fields ending in `Today` are in today's dollars; fields ending in `Nom` are in future dollars. Validation ranges are in brackets.

```text
PlanInputs {
  schemaVersion: 1
  planStartYear: number [current year .. +5]
  spouses: [SpouseInput, SpouseInput]
  accounts: AccountInput[]
  dbPensions: DbPensionInput[]
  spending: { phases: [{ yearsFromRetirement: number, annualSpendToday }] x3,
              survivorPct [40..100], legacyGoalToday, homeValueToday? }
  investing: { shapeId: 'steady' | 'gradual_shift' | 'safety_first_regrow',
               presetId: 'bonds_sheltered_first' | 'growth_tax_free_first',
               returnOverride?: { [assetClass]: rate },
               feeOverride?:    { [assetClass]: rate } }
  withdrawal: { strategyId: 'registered_last' | 'fill_brackets',
                bracketTargetToday: [number, number] }
}
SpouseInput {
  birthYear [1930..2000], birthMonth [1..12], sexAtBirth: 'F' | 'M',
  retirementYear, lifeExpectancyTarget [60..105],
  cppAt65Today, cppStartAge [60..70], oasStartAge [65..70],
  yearsInCanadaAt65 [0..47], workingMarginalRate [0..0.6],
  afterTaxPayToday           // used while still working after the first retirement
}
assetClass = 'cad_equity' | 'global_equity' | 'bonds'
AccountInput {
  id: string,                // '<type>-<owner>-<n>', e.g. 'rrsp-0-1'
  owner: 0 | 1, type: 'rrsp' | 'lira' | 'tfsa' | 'nonreg',
  balanceToday,              // rrsp, lira, tfsa; holdings are set by the preset
  annualContributionToday,
  positions?: { [assetClass]: { valueToday, originalCostToday } },
                             // nonreg only: needed because the first rebalance
                             // sells positions and realizes gains
  tfsaRoomToday?,            // TFSA only
  conversionAge?,            // RRSP->RRIF, LIRA->LIF [55..71]
  lifUnlock50?: boolean      // LIRA only
}
DbPensionInput {
  owner, lifetimeAnnualToday, startAge, bridgeAnnualToday?, bridgeEndAge?,
  indexing: 'full' | 'fixed' | 'none', indexRate?, survivorPct [0..100]
}
YearRow {
  year, spouse[0..1]: { age, alive, cppNom, oasNom, dbNom, payNom,
    withdrawals: { [accountId]: Nom }, taxableIncomeNom, taxNom, clawbackNom,
    splitShare },
  balancesEndNom: { [accountId]: Nom }, realizedGainsNom,
  spendNeedNom, afterTaxCashNom, surplusNom, shortfallNom
}
PlanSummary { spendingCovered, firstShortfallYear?, totalShortfallNom, lifetimeTaxNom,
  afterTaxLegacyNom, clawbackYears, warningFacts }
```

*   **Input paths:** dotted text such as `spouses.0.cppStartAge` or `accounts.<id>.balanceToday`, used by `setInput` and by warning definitions.
*   **Empty plan:** the defaults in `src/state/defaults.ts`, with life expectancy and survivor percentage from the config.
*   **Reference file:** the column header of `expected-rows.csv` is the `YearRow` field list, flattened in this order.

### Persistence

*   The plan's inputs (never results) autosave to localStorage under the key `rp.plan.v1`, one second after the last edit. Each save holds the schema version, the inputs, and metadata (saved time, app version). On startup the app loads that key if present.
*   The app asks the browser to keep the data (persistent storage). If the browser refuses, or saving fails (storage full, private window), the app says so and prompts an export.
*   Export and import use the same JSON format, saved as `retirement-plan-<date>.json`, with the disclaimer in its metadata. On import, the file is checked against the schema. A file with a newer schema version is refused with a message naming the file's version and the app's version.
*   Version 1 has one schema version, so there are no migrations yet. When version 2 arrives, it saves under a new key (`rp.plan.v2`) and leaves the version 1 save in place, so rolling back the app never strands a plan.
*   A "Load sample plan" button fills a made-up couple's data; the app otherwise starts empty (O15). All test fixtures use made-up households. The author's real numbers never enter the repository (see Hosting).

### Hosting and repository (author)

*   **Public GitHub repository `retirement-planner`, served by GitHub Pages.** GitHub Actions runs lint, type checks and all tests on every push and pull request. Only a green build of the `main` branch is deployed.
*   **The unlisted URL is the family release (author).** The page carries a `noindex` tag, and the URL is shared only with testers. Before it is shared any wider, O20 (disclaimer and FSRA check) must be resolved and the app moved to its own origin (see Risks).
*   **No personal data in the repository.** Fixtures and the sample plan use made-up couples. The original prototype context document contains the author's real household figures, so it lives in `private/`, which git ignores. Copies with personal figures removed become the history documents in `docs/history/` (file 18). The author tests with real numbers by importing their own exported plan file locally; that file also lives in `private/`.
*   **Security policy by meta tag, in the built app only.** GitHub Pages can't set response headers, so the content security policy is added as a `<meta>` tag at build time by a small Vite plugin; local development runs without it. The app's page then cannot make network requests (fetch, XHR, WebSocket, form submissions). This does not cover navigation, and it does not cover the Worker, which takes its policy from response headers; the Worker runs only bundled app code. Both gaps are recorded in Risks.
*   **Supply chain:** `package-lock.json` is committed and CI installs with `npm ci`, so every build uses the reviewed dependency versions. `npm audit` runs in CI as a report-only step.
*   **No service worker, no analytics, no CDN.** All dependencies are bundled at build time. Built files carry content hashes, so a rollback is a revert commit followed by a redeploy.

### Performance

*   **Target:** a full recalculation finishes in **under 2 seconds** on the reference machine: the author's laptop with current Chrome, whose CPU, cores and RAM are recorded in `README.md` at stage 4. A run covers the user's plan, up to two comparison variants, and the tip reruns (about 100 runs of 30–45 years).
*   **How it's checked:** timed by hand on the reference machine before stage 8. If it is missed, reduce work inside the year solver first.

### Verification (G10)

*   **Runtime invariants, checked every year of every run:**
    *   after-tax cash equals the spending need, or a shortfall is recorded;
    *   money is conserved across accounts;
    *   no balance or original cost is negative;
    *   RRIF and LIF draws respect their minimums and maximums;
    *   TFSA contributions stay within room.

    Checks compare within $0.05 (`INVARIANT_TOLERANCE` in `constants.ts`). If any check fails, the app shows an "engine integrity" error and no results. The error screen shows the year, variant and failed check, with a "Copy details" button; with the user's exported plan, that is enough to reproduce the failure.
*   **Tests** (detailed in the implementation plan):
    *   tax fixtures from an outside calculator, matched within $1 per return;
    *   rule-value tests against the config;
    *   a full reference plan built by a separate AI session from the written design without seeing the engine code, matched within $1 per cell;
    *   property tests: the same inputs give the same result; higher spending never raises the after-tax legacy; swapping the spouses gives the same household totals; with zero tax the loop matches the closed-form annuity; moving money between two accounts of the same type and owner changes nothing; the chosen split never gives more tax than a 0% split; after-tax cash rises when the withdrawal rises; the two-pass split matches the full nested search;
    *   the manual paid-tool comparison before stage 8;
    *   the manual speed check.

### Advice wording

All result text is conditional and comparative. Strategy, shape and preset names are descriptive, not "best" or "optimal". The disclaimer appears on first run, in the footer, and in every export; placeholder text is in `src/ui/content/disclaimer.ts` until O20 sets the final wording.

### Spending inputs

*   **Spending categories (O17):** deferred. Each phase is a single after-tax amount in today's dollars. The input shows the estimated gross amount needed before tax for that phase, from the last run.

## Alternatives Considered

Decisions marked "author" were made by the document's author and are recorded in [concepts_brief.md](../../concepts_brief.md) and in [Decisions made for this plan](#decisions-made-for-this-plan).

### Product scope (decided during the brainstorm)

#### Alternative A: Phases that feed one into the next in one direction only

*   **Pros**: Simpler mental model (fill in Spending, then Investing, then Withdrawals); fewer stale-result states.
*   **Cons**: A warning in Withdrawals sends the user back two steps to guess at a fix; the effect of one area on another is hidden.
*   **Decision**: Rejected by author: the point of the product is to change any area and see the effect on the others.

#### Alternative B: Live recalculation on every change, or a live fixed-return preview next to the button

*   **Pros**: Immediate feedback; supports the "see the effect" goal without a button press.
*   **Cons**: A full run with comparisons and tip reruns takes about a second and would make inputs sluggish; results changing while the user types are hard to follow.
*   **Decision**: Rejected by author: the user edits inputs and presses Recalculate when ready. Stale-result marking and the change summary cover the feedback gap.

#### Alternative C: Fixed returns only

*   **Pros**: Simple, fast, easy to test and explain.
*   **Cons**: With a fixed return every year, moving to safer investments only lowers returns, so the growth-to-safety strategy always looks worse; sequence-of-returns risk can't be shown.
*   **Decision**: First rejected by author, because the growth-to-safety lesson can't be shown honestly without variable returns. **Chosen by author on 2026-11-18**: random markets added more machinery and sourced data (volatility, correlations, stress paths, percentiles) than the tool's purpose justified. The cons are accepted and stated on screen; variable returns are a [future improvement](#future-improvements).

#### Alternative D: Explain tax-efficient investing in text only

*   **Pros**: No tax-by-income-type engine needed; far less to build and test.
*   **Cons**: Generic advice the user can read anywhere; doesn't show what it's worth for their plan.
*   **Decision**: Rejected by author: the app must calculate the dollar effect on the user's own plan.

#### Alternative E: Server storage, user accounts, multi-user plans

*   **Pros**: Both spouses can open the same plan on different devices; no data lost to browser cleanup.
*   **Cons**: Holding other people's financial data brings security, privacy and legal obligations, and a server to run and pay for.
*   **Decision**: Deferred by author: nothing leaves the browser in version 1. Export and import cover moving a plan.

#### Alternative F: Export file as the only way to resume

*   **Pros**: Simplest storage; one format.
*   **Cons**: Closing the tab without exporting loses the work.
*   **Decision**: Rejected by author in favour of autosave in the browser, with export as backup.

#### Alternative G: RESP and Canada Child Benefit planning

*   **Pros**: Covers families with young children.
*   **Cons**: Pre-retirement family finance, not retirement planning; widens scope.
*   **Decision**: Rejected by author: children matter only for legacy planning.

#### Alternative H: All provinces (and Quebec) in version 1

*   **Pros**: Usable by all Canadians from the start.
*   **Cons**: 13 tax systems, plus Quebec's separate pension and tax rules, to source, validate and test every year before the engine is proven.
*   **Decision**: Rejected by author: start with an Ontario couple. The jurisdiction module leaves room for other provinces.

#### Alternative I: Reuse the prototype code

*   **Pros**: Existing screens, charts and input handling.
*   **Cons**: Mixed units, tax dropped from withdrawals, wrong constants; never executed or tested.
*   **Decision**: Rejected by author: clean rewrite; only the context document carries over.

#### Alternative J: Hand-built reference spreadsheet for verifying the yearly loop

*   **Pros**: The most independent check of the whole calculation.
*   **Cons**: Requires the author to build and understand every rule by hand; likely to stall the project.
*   **Decision**: Rejected by author. Rule values come from published sources in a config the admin validates. The loop is checked by runtime invariants, a reference plan built by a separate AI session, and a rough comparison with a paid tool. A rule both AI sessions misunderstand can slip through.

#### Alternative K: DB pension commuted value (lump sum instead of pension)

*   **Pros**: Covers a real decision some members face.
*   **Cons**: Depends on plan funding, indexing and health; a comparison reads as advice; adds a new comparison type.
*   **Decision**: Rejected by author for version 1: the comparison's answer depends on facts the app can't know (plan funding, health), so it would read as advice for little teaching value.

### Architecture (decided during drafting)

#### Alternative L: Resampled blocks of real Canadian history for returns

*   **Pros**: Real crash patterns, extreme years and inflation-return links.
*   **Cons**: Needs a Canadian dataset that can be redistributed; only about 100 years of data; historical averages don't match FP Canada's forward-looking guidelines.
*   **Decision**: Rejected by author in favour of generated returns plus named stress paths. No longer applicable: version 1 uses fixed returns (2026-11-18, [Alternative C](#alternative-c-fixed-returns-only)).

#### Alternative M: Historical starting-year windows ("if you retired in 1966")

*   **Pros**: Easiest for lay users to understand; no random seed.
*   **Cons**: Same dataset problem; few independent windows for a 35–40-year plan; can't use forward-looking assumptions.
*   **Decision**: Rejected by author: a "chance of success" built on a few dozen overlapping windows has little meaning for a plan this long. No longer applicable: version 1 uses fixed returns.

#### Alternative N: Random inflation on each path, or fixed inflation plus a high-inflation stress test

*   **Pros**: Shows inflation risk to unindexed income, such as some DB pensions, and to non-indexed thresholds.
*   **Cons**: More figures to source and test; per-path conversion to today's dollars; harder to explain.
*   **Decision**: Rejected by author: one fixed rate. Simplicity and testability won; the cost is that results do not reflect inflation risk (see Risks).

#### Alternative O: Placement by an editable priority list, or by a mix entered for each account

*   **Pros**: Lets users describe their real holdings or test their own ideas.
*   **Cons**: Harder screens and testing; drifts toward hand-optimizing. A per-account mix also lets the overall mix drift against the growth-to-safety shift.
*   **Decision**: Rejected by author in favour of two named presets compared with a baseline: a clear, testable comparison that stays on the "teach, don't advise" side, at the cost of not describing users' real holdings.

#### Alternative P: Count the overall mix after tax

*   **Pros**: A fair placement comparison: the difference reflects tax only, not hidden extra risk.
*   **Cons**: The mix won't match statements; needs an expected tax rate assumption and an explanation.
*   **Decision**: Rejected by author in favour of face value. The design adds an after-tax stock share readout so any risk difference is visible.

#### Alternative Q: One fixed withdrawal order, or a user-defined order

*   **Pros**: Fixed: simplest. User-defined: most flexible.
*   **Cons**: Fixed: nothing to compare, and it handles early retirement with deferred CPP/OAS badly. User-defined: many combinations to test, and odd orders silently cost tax.
*   **Decision**: Rejected by author in favour of two named strategies compared at the same returns: it teaches the early-retirement lesson with only two algorithms to test.

#### Alternative R: User-set points for the growth-to-safety shift

*   **Pros**: Can match the user's real mix.
*   **Cons**: More to explain and test; extreme shapes allowed.
*   **Decision**: Rejected by author in favour of three named shapes, consistent with the placement presets and simpler to test. Results describe a named shape, not the user's actual portfolio, and the screens say so.

#### Alternative S: Hand-written warning tips

*   **Pros**: No extra runs; predictable, reviewable wording.
*   **Cons**: Same tips for every plan; a tip can point at an input that does little in this plan.
*   **Decision**: Rejected by author in favour of computed nudges, which fit each plan. Each nudge reruns the plan once.

#### Alternative T: Svelte, or no framework

*   **Pros**: Svelte: less code, simple stores. No framework: no dependency churn.
*   **Cons**: Svelte: AI agents are less familiar with it, and its versions get mixed. No framework: much more hand-written screen code to keep consistent as the screens grow.
*   **Decision**: Rejected by author in favour of React: AI agents produce the most conventional, fixable React code, which matters more here than bundle size.

#### Alternative U: Fixed-point iteration for the yearly tax solve

*   **Pros**: Simple to write; the prototype used it.
*   **Cons**: Not guaranteed to converge near the clawback and credit phase-out cliffs. The prototype used a damped version with 15 iterations and no defined failure behaviour.
*   **Decision**: Rejected in design. Bisection always converges here, because after-tax cash rises with the gross withdrawal.

#### Alternative V: Equalize-incomes rule for pension splitting

*   **Pros**: One calculation, no search.
*   **Cons**: Ignores the clawback, age-amount reduction and Health Premium steps, so it can pick a split that costs more tax.
*   **Decision**: Rejected in design in favour of trying 0–50% in 5% steps, once per year at the solved withdrawal (two-pass rule; see [Performance](#performance) for the cost).

#### Alternative W: Cloudflare Pages / Netlify, or a downloadable file

*   **Pros**: Cloudflare/Netlify: free with a private repository, real security headers, preview builds. Downloadable file: no server at all.
*   **Cons**: Cloudflare/Netlify: a second service account. Downloadable file: no automatic updates, and browsers restrict Web Workers and storage for pages opened from a local file.
*   **Decision**: Rejected by author in favour of GitHub Pages with a public repository: one free service for code, tests and hosting. Personal data is kept out of the repository, and the header and origin gaps are recorded in Risks.

#### Alternative X: IndexedDB instead of localStorage

*   **Pros**: Larger storage limits; asynchronous access doesn't block the page.
*   **Cons**: More code and an extra library or wrapper for a plan under 100 KB.
*   **Decision**: Rejected in design: localStorage's synchronous access is simpler and the plan is small. Both are cleared by the same browser rules, so neither is more durable.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Privacy and security:**
    *   The app's page cannot make network requests (see [Hosting](#hosting-and-repository-author) for what this covers and doesn't).
    *   There is no analytics, no third-party script, and no CDN.
    *   Imported files are validated against the schema before use, and invalid files are rejected with a message.
    *   The public repository never contains real household data.
*   **Correctness:**
    *   Runtime invariants are checked on every run, and a failure blocks results.
    *   Rule values come only from the validated config.
    *   The tax year in use and the validation status are visible on screen.
*   **Performance:** under 2 seconds on the reference machine (see [Performance](#performance)). The screen stays responsive during a run.
*   **Durability:** see [Persistence](#persistence). The export file is the durable copy; browser storage can be cleared.
*   **Supported browsers:** current desktop Chrome and Edge. Other browsers may work but are not tested.
*   **Rollout and rollback:**
    *   Only green builds of `main` deploy.
    *   Rollback is a revert and redeploy.
    *   Because there is no service worker, users get the new version on their next page load after the browser cache expires (about 10 minutes on GitHub Pages).
*   **Accessibility:**
    *   All inputs, including segmented choices, work by keyboard and have visible labels.
    *   Every chart has a table view with the same data.
*   **Legal posture:** see [Advice wording](#advice-wording) and O20.

--------------------------------------------------------------------------------

## Risks & Mitigations

| Risk | Impact | Mitigation or acceptance |
|---|---|---|
| Security policy set by meta tag only | Doesn't cover navigation or the Worker | Accepted. The Worker runs only bundled code; the page can't make requests ([Hosting](#hosting-and-repository-author)) |
| Compromised npm dependency | Could send data out from bundled code | Lockfile, `npm ci`, `npm audit` report; few runtime dependencies |
| Shared github.io origin | Other Pages sites under the same account can read saved plans | Accepted for the family release. Before public release: dedicated GitHub account or organization, or a custom domain |
| Browser storage cleared | Lost plan | Export is the durable copy; app prompts export when persistence is refused |
| Export files unencrypted | Financial data readable by anyone with the file | Accepted; stated in G7 and next to the export button |
| AI reference plan shares the engine's misreading of a rule | Wrong numbers pass tests | Outside tax fixtures, property tests, paid-tool comparison; admin-validated config |
| Fixed inflation | Results ignore inflation risk, notably for unindexed DB pensions | Accepted ([Alternative N](#alternative-n-random-inflation-on-each-path-or-fixed-inflation-plus-a-high-inflation-stress-test)) |
| Fixed death ages | Results ignore longevity risk | Accepted; 25%-survival default and "assuming deaths at the target ages" label |
| Fixed returns | Sequence risk is not shown: a bad market early in retirement can do lasting damage the plan doesn't reveal, and a safer shape shows only its lower return | Accepted for version 1 ([Alternative C](#alternative-c-fixed-returns-only)); screens say returns are steady averages; variable returns are a future improvement |
| Full rebalance every year | Realizes gains real investors might avoid | Accepted; applied equally to the user's plan and baselines |
| Foreign withholding simplified | Single rate assumes Canadian-listed funds | Accepted; stated in the placement explanation |
| Face-value mix counting | Placement benefit may include hidden extra risk | After-tax stock share readout |
| Public URL reachable before O20 | Release beyond family before the FSRA check | `noindex`, URL shared only with testers; O20 before wider sharing |
| 2-second target missed | Slow recalculation | Two-pass split; reduce work in the year solver |
| Schema change after a rollback | Saved plans unreadable | New schema saves under a new key; old save kept |
| Open questions O16, O20 | Scope or numbers may change | O16 checked before stage 0 ends; O20 before wider sharing |
## Glossary

| Term | Meaning |
|---|---|
| Admin | The person who validates config values each year; the author, for now |
| CPP / OAS | Canada Pension Plan / Old Age Security, the two federal retirement benefits |
| Clawback (OAS recovery tax) | OAS repaid at 15% of net income above a yearly threshold |
| DB pension | Defined-benefit workplace pension, paying a set amount for life |
| DC pension | Defined-contribution workplace pension; becomes a LIRA when the member leaves |
| FSRA | Financial Services Regulatory Authority of Ontario |
| GIS | Guaranteed Income Supplement (out of scope) |
| LIRA / LIF | Locked-in retirement account / life income fund: locked-in pension money, with yearly minimum and maximum withdrawals once it's a LIF |
| Original cost (adjusted cost base) | What was paid for investments in a non-registered account; gains are measured from it |
| Deemed disposition | Investments treated as sold at death, so their gains are taxed |
| Probate (Estate Administration Tax) | Ontario's tax on assets passing through a will |
| RRSP / RRIF | Registered retirement savings plan / registered retirement income fund (an RRSP after conversion, with yearly minimum withdrawals) |
| TFSA | Tax-free savings account |
| Asset location vs allocation | Which account holds each investment vs the overall mix of investments |
| Sequence risk | The risk that bad returns early in retirement do lasting damage (not modelled in version 1) |

## Additional Resources

*   [concepts_brief.md](../../concepts_brief.md): the brainstorm brief this design implements.
*   `private/retirement-planner-context.md` (not committed): the prototype's decision log and defect list, history only; summarized without personal figures in `docs/history/`.
*   Government of Canada Canadian Retirement Income Calculator: the reference for input vocabulary.
*   FP Canada Projection Assumption Guidelines: return, inflation and life expectancy assumptions.
*   CRA, Service Canada, Ontario Ministry of Finance, FSRA: sources for rule values.

## Future Improvements

*   **Variable returns:** random markets and named stress paths, to show sequence risk, a chance of success, and the value of the growth-to-safety shift.
*   **Other provinces:** new jurisdiction modules and config files; Quebec needs separate pension and tax handling.
*   **Single people and a general "other income" stream:** pending O16.
*   **Spending categories:** per-category amounts summing to each phase, with per-category survivor percentages.
*   **Random inflation:** inflation that varies by year, linked to returns, to show inflation risk to unindexed income.
*   **Editable placement and growth-to-safety settings:** priority lists and user-set points, once the presets have been tested.
*   **DB commuted value comparison, sync between devices, mobile layout, PDF export.**

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Known gaps from review

The Stage 9 re-run (`docs/reviews/2026-11-17/implementation_readiness_report_r2.md`) left 18 Major and 21 Nit findings open. Each Major must be fixed in this document before the stage named below starts. Nits are fixed when their file is built.

| Finding | Gap | Close before |
|---|---|---|
| ~~M8~~ | Fixed: deploy requires a push event from this repository (file 12) | — |
| ~~M10~~ | Fixed: `.prettierignore`, ESLint `ignores`, `"type": "module"` (files 3, 9) | — |
| ~~M12~~ | Fixed: file 16 marked "Exists — keep" with the full list | — |
| ~~M9~~ | Fixed: the Config contract's key tree is the complete list; `SOURCES.md` must match it | — |
| ~~M7~~ | Fixed: persisted ids defined; `holdings` replaced by non-registered `positions` | — |
| ~~M17~~ | Fixed: cross-references now name `docs/history/` (file 18) | — |
| ~~M18~~ | Fixed: `constants.ts` is the only exempt file and holds `MONTHS_PER_YEAR` and the generator constants; `ignoreNumericLiteralTypes` set (files 9, 23) | — |
| ~~M16~~ | Fixed: `clawback` and `pairId` fields; `income` is after the split (file 52) | — |
| M5 | Lifetime tax units ("today's dollars" vs `lifetimeTaxNom`) | Stage 2 |
| M6 | Registered draws between spouses; LIF-cap overflow; LIRA rules | Stage 2 |
| M13 | `bestSplit`: which spouse transfers income | Stage 2 |
| M15 | Cash yield inside sheltered accounts is never reinvested | Stage 2 |
| M1 | `Result`, `NormalizedInputs`, `warningFacts` fields; `YearRow` estate, forced-draw and contribution fields; CSV column naming | Stage 3 |
| ~~M11~~ | Withdrawn: no random generator (fixed returns, 2026-11-18) | — |
| ~~G3~~ | Withdrawn: the arithmetic-mean add-back applies only to simulations; fixed returns use FP Canada's compound figures directly | — |
| ~~M14~~ | Withdrawn: no paths or typical-path ranking | — |
| M3 | 70% coverage target for non-engine code is unreachable without UI tests; gate start date disagrees (lines in Vitest config vs Verification Plan) | Stage 5 |
| M4 | Store and persistence tests need a browser-like test environment (jsdom or happy-dom) | Stage 5 |
| M2 | CUJ 6 test-config build: how `VITE_CONFIG_SET=test` reaches a statically imported bundle | Stage 5 |

The work is built in stages. Each stage ends with its tests passing in CI and a git tag (`stage-0` … `stage-8`). The working rules for agents (whole-function rewrites, protected files, units) are in file 13, `AGENTS.md`.

**Stage order:**

| Stage | Content | Gate before starting |
|---|---|---|
| 0 | Repository setup, conventions documents, config contract and 2026 values, tax fixtures, placeholder app | O16 checked with the test friends |
| 1 | Tax for one person (`jurisdiction/*`, `tax/personalTax.ts`) | Stage 0 config validated |
| 2 | Couple engine with fixed returns: `units`, `accounts/*`, `benefits/*`, `withdraw/*`, `tax/split.ts`, `solver/*`, `project/workingYear.ts`, `project/runPath.ts`, `invest/*`, invariants | — |
| 3 | Deaths and estate (`project/death.ts`); reference plan test | — |
| 4 | Variants, comparisons, results, Worker | — |
| 5 | Store, screens, stale marking, change summary | — |
| 6 | Warnings and computed tips | — |
| 7 | Saving, export/import, sample plan | — |
| 8 | Testing with the author and two friends | Paid-tool comparison done; speed check passed |

### Target Files to Create/Modify

#### Repository and build (stage 0)

##### 1. `./.gitignore` (Exists — modify)

*   **Type / Scope**: Git configuration.
*   **Proposed Changes**: Already ignores `private/`, `node_modules/`, `dist/`, `coverage/`, `playwright-report/`. Add `test-results/`.

##### 2. `./.gitattributes`, `./LICENSE`, `./private/retirement-planner-context.md` (Exist — keep)

*   **Type / Scope**: Line endings (LF), MIT licence, private history (not committed).
*   **Proposed Changes**: None. The licence stays MIT unless the author chooses another before the repository is made public.

##### 3. `./package.json` and `./package-lock.json` (Create)

*   **Type / Scope**: Build configuration and lockfile.
*   **Proposed Changes**: Majors are pinned as below; exact versions are resolved at stage 0 and frozen by the committed lockfile.

    | Package | Major | Kind |
    |---|---|---|
    | react, react-dom | 18 | runtime |
    | zustand | 5 | runtime |
    | zod | 3 | runtime |
    | recharts | 2 | runtime |
    | typescript | 5 | dev |
    | vite, @vitejs/plugin-react, vite-tsconfig-paths | 6, 4, 5 | dev |
    | vitest, @vitest/coverage-v8 | 3 | dev |
    | fast-check | 3 | dev |
    | @playwright/test | 1 | dev |
    | eslint, typescript-eslint, eslint-plugin-react-hooks | 9, 8, 5 | dev |
    | prettier | 3 | dev |
    | tsx | 4 | dev |
    | @types/react, @types/react-dom, @types/node | matching | dev |

    `"type": "module"` and `"engines": { "node": ">=22" }`. Scripts:

    | Script | Command |
    |---|---|
    | `dev` / `build` / `preview` | `vite` / `tsc -b && vite build` / `vite preview` |
    | `typecheck` | `tsc -b --noEmit` |
    | `lint` | `eslint .` |
    | `format:check` | `prettier --check .` |
    | `test` | `vitest run --passWithNoTests` |
    | `test:e2e` | `playwright test --pass-with-no-tests` |
    | `config:bundle` | `tsx tools/configBundle.ts` (generates `src/engine/config/bundle.ts`) |
    | `config:check` | `tsx tools/configCheck.ts` |
    | `config:compare` | `tsx tools/configCompare.ts <a.json> <b.json>` |

##### 4. `./.nvmrc` (Create)

*   **Proposed Changes**: `22`.

##### 5. `./tsconfig.json`, `./tsconfig.app.json`, `./tsconfig.worker.json`, `./tsconfig.node.json` (Create)

*   **Type / Scope**: TypeScript configuration as project references.
*   **Proposed Changes**: All strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and path alias `@engine/*` → `src/engine/*`.
    *   `app`: `lib: ["ES2022", "DOM"]`, includes `src` except `src/worker`.
    *   `worker`: `lib: ["ES2022", "WebWorker"]`, includes `src/worker` and `src/engine`.
    *   `node`: includes `tools`, `tests`, and the config files.
    *   Add `src/vite-env.d.ts`.

##### 6. `./vite.config.ts` (Create)

*   **Type / Scope**: Build configuration.
*   **Proposed Changes**:
    *   Plugins: React, `vite-tsconfig-paths`, and a small CSP plugin (`transformIndexHtml`, `apply: 'build'`) that inserts the CSP and `noindex` meta tags into the built `index.html`.
    *   `base: '/retirement-planner/'`.
    *   Worker format `es`; output files named with content hashes.

    CSP content:

    ```text
    default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self';
    img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none';
    base-uri 'none'; object-src 'none'
    ```

##### 7. `./vitest.config.ts` (Create)

*   **Type / Scope**: Test configuration.
*   **Proposed Changes**:
    *   Include `tests/{unit,property,reference}/**/*.test.ts`; exclude `tests/e2e/**`.
    *   Coverage with v8: branch coverage of 90% for `src/engine/**` and 70% for other `src/**`, enforced from the `stage-2` tag onward.

##### 8. `./playwright.config.ts` (Create)

*   **Type / Scope**: End-to-end test configuration.
*   **Proposed Changes**:
    *   Chromium only; `testDir: 'tests/e2e'`.
    *   `webServer`: `npm run build && npm run preview -- --port 4173`.
    *   `baseURL: 'http://localhost:4173/retirement-planner/'`.

##### 9. `./eslint.config.js`, `./.prettierrc`, `./.prettierignore` (Create)

*   **Type / Scope**: Lint and formatting.
*   **Proposed Changes**:
    *   `.prettierignore` lists `docs/`, `*.md`, `package-lock.json`, `config/**/*.json`, `src/engine/config/bundle.ts`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`. Markdown and config JSON keep their hand-written layout; Prettier formats code only.
    *   `@typescript-eslint/no-magic-numbers` in `src/engine/**`, ignoring `[0, 1, -1, 2, 100]`, with `ignoreNumericLiteralTypes: true` (so types such as `schemaVersion: 1` pass) and `ignoreEnums: true`. The only exempt file is `src/engine/constants.ts`, which also holds `MONTHS_PER_YEAR = 12`.
    *   `ignores`: `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `src/engine/config/bundle.ts`.
    *   `no-restricted-imports`:
        *   `src/engine/**` may not import `src/ui/**` or `src/state/**`;
        *   `src/engine/{solver,project,simulate}/**` may not import the `TodayDollars` type.
    *   `react-hooks` rules for `src/ui/**`.

##### 10. `./index.html` and `./src/main.tsx` (Create)

*   **Type / Scope**: App entry.
*   **Proposed Changes**:
    *   `index.html`: a root element, a `<noscript>` message, and a module script pointing to `src/main.tsx`. It contains no CSP; the build plugin adds it.
    *   `src/main.tsx` at stage 0 renders "Under construction"; stage 5 replaces it.

##### 11. `./.github/workflows/ci.yml` (Create)

*   **Type / Scope**: CI pipeline.
*   **Proposed Changes**: Runs on every push and pull request, on `ubuntu-latest`, in this order:
    1.  `actions/checkout`;
    2.  `actions/setup-node` with `node-version-file: .nvmrc` and npm cache;
    3.  `npm ci`;
    4.  `npx playwright install --with-deps chromium`;
    5.  `npm run config:check`, `typecheck`, `lint`, `format:check`;
    6.  `npm test -- --coverage`;
    7.  `npm run build`;
    8.  `npm run test:e2e`;
    9.  `npm audit --omit=dev`, with `continue-on-error: true` (report only).

##### 12. `./.github/workflows/deploy.yml` (Create)

*   **Type / Scope**: Deployment.
*   **Proposed Changes**:
    *   **Trigger:** `workflow_run` on CI, `types: [completed]`, `branches: [main]`. The job runs only when all three hold, so a fork's branch named `main` can never deploy:
        *   `github.event.workflow_run.conclusion == 'success'`;
        *   `github.event.workflow_run.event == 'push'`;
        *   `github.event.workflow_run.head_repository.full_name == github.repository`.
    *   **Action versions:** pinned by major version: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`.
    *   **Steps:** checkout the triggering commit, setup-node, `npm ci`, `npm run build`, then `actions/configure-pages`, `actions/upload-pages-artifact` (path `dist`) and `actions/deploy-pages`.
    *   **Permissions:** `pages: write`, `id-token: write`, `contents: read`; environment `github-pages`.
    *   **Repository setting:** Pages source is "GitHub Actions".

##### 13. `./AGENTS.md` and `./CLAUDE.md` (Create)

*   **Type / Scope**: Instructions for AI coding agents. `CLAUDE.md` contains one line pointing to `AGENTS.md`.
*   **Proposed Changes**: Rules:
    *   **Values:** never supply a rule value from memory; every value comes from `config/`, and every engine setting from `src/engine/constants.ts`.
    *   **Protected files:** never modify a validated config entry or an existing file under `tests/fixtures/`. Create a fixture file only where the current stage's plan calls for one. The author reviews `git diff tests/fixtures config` before tagging each stage.
    *   **Code changes:** rewrite whole functions rather than patching them.
    *   **Units:** the engine works in future dollars only; conversion happens only in `normalizeInputs` and `toDisplay`.
    *   **Engine boundary:** no screen or store code in `src/engine`.
    *   **Personal data:** never put real household data in the repository.
    *   **Wording:** all user-facing text stays conditional ("under these assumptions…").
    *   **Before finishing:** run `npm run typecheck && npm run lint && npm test`.
    *   **Stages:** follow the stage order and its gates, and tag each green stage.

##### 14. `./README.md` (Create)

*   **Type / Scope**: Project documentation.
*   **Proposed Changes**:
    *   what the app is, and the disclaimer;
    *   how to run it locally;
    *   how tests work;
    *   the reference machine's CPU, cores and RAM (added at stage 4);
    *   how the config is updated each year (link to the admin guide);
    *   the rule that no personal data is committed.

#### Documentation (stage 0)

##### 15. `./docs/designs/retirement-planner.md` (Exists — keep)

*   **Proposed Changes**: This document. Updated when a decision changes.

##### 16. `./docs/reviews/2026-11-17/` (Exists — keep)

*   **Type / Scope**: Review history, already committed.
*   **Proposed Changes**: None. The folder holds:
    *   `zoom_out_report.md`
    *   `comprehension_report.md`
    *   `critic_report.md`
    *   `intermediate_zoom_out_report.md`
    *   `implementation_readiness_report.md`
    *   `implementation_readiness_report_r2.md`
    *   `goldfish_review_report.md`

    `concepts_brief.md` stays at the root.

##### 17. `./docs/units-and-conventions.md` (Create)

*   **Type / Scope**: Normative reference for engine authors.
*   **Proposed Changes**: The rules from [Units and conventions](#units-and-conventions) with worked examples:
    *   converting a today's-dollar input with `normalizeInputs`;
    *   first-year pro-rating by birth month;
    *   the RRIF start-of-year age;
    *   mixed working/retired years;
    *   same-year deaths.

##### 18. `./docs/history/decision-log.md` and `./docs/history/prototype-postmortem.md` (Create)

*   **Type / Scope**: Project history, written from `private/retirement-planner-context.md` with personal figures removed.
*   **Proposed Changes**:
    *   The decision log covers the prototype's product summary, reference material, feature set, architecture choices and UX rules.
    *   The post-mortem covers what went wrong (the patch cycles, mixed units, missing tax, untested code) and the defect list.

    Both carry a note that the prototype's calculation model is superseded by this design.

##### 19. `./docs/admin-config-guide.md` (Create)

*   **Type / Scope**: Admin procedure, run each January.
*   **Proposed Changes**:
    1.  Two separate AI sessions each fetch every tax and benefit rule (`federal.json`, `ontario.json`) listed in `config/SOURCES.md` into a candidate file. One session fetches the market assumptions (`market.json`).
    2.  Run `npm run config:compare` on the two tax and benefit candidates.
    3.  The admin resolves each disagreement against the source page, and spot-checks the market values against theirs.
    4.  The admin sets each entry's validation status, name and date, and updates `config/CURRENT_YEAR`.
    5.  Run `npm run config:bundle` and `npm run config:check`.
    6.  Commit.

    Planning choices are reviewed in the same pass but not fetched.

##### 20. `./config/SOURCES.md` (Create)

*   **Type / Scope**: Key list and sources.
*   **Proposed Changes**: Exactly the dotted keys in the [Config contract](#config-contract)'s key tree, each with its unit, its official page URL and where on the page the value appears. Planning-choice keys are marked "author decision". `config:check` fails if this file and the key tree disagree.

#### Config (stage 0)

##### 21. `./config/CURRENT_YEAR` and `./config/2026/{federal,ontario,market}.json` (Create)

*   **Type / Scope**: Rule values, following the [Config contract](#config-contract).
*   **Proposed Changes**: Every key in `SOURCES.md`, fetched and validated per the admin guide. `market.json` holds:
    *   FP Canada returns and inflation;
    *   one cash yield per class;
    *   fees;
    *   the three FP Canada component returns for global stocks;
    *   the foreign withholding rate.

##### 22. `./config/2026/planning.json` and `./config/2026/warnings.json` (Create)

*   **Type / Scope**: The author's planning choices.
*   **Proposed Changes**: The values in [Design values](#design-values-version-1):
    *   shapes, presets and the stock split;
    *   the life expectancy defaults by sex and the survivor percentage;
    *   the default bracket target for the comparison variant;
    *   warning triggers and nudge steps.

    Each value is sourced as "author decision, 2026-11-17".

#### Engine (stages noted per file)

##### 23. `./src/engine/constants.ts` (Create, stage 1)

*   **Proposed Changes**:
    *   `MONTHS_PER_YEAR = 12`
    *   `SOLVER_PRECISION = 0.01`
    *   `SOLVER_MAX_STEPS = 32`
    *   `SPLIT_STEP = 0.05`
    *   `MAX_SPLIT_PASSES = 2`
    *   `INVARIANT_TOLERANCE = 0.05`

##### 24. `./src/engine/config/schema.ts`, `./load.ts`, `./bundle.ts` (Create, stage 0)

*   **Proposed Changes**:
    *   `schema.ts`: Zod schemas for the entry shape and for each file's key tree.
    *   `bundle.ts`: generated by `tools/configBundle.ts`. It imports the JSON files for `CURRENT_YEAR`.
    *   `load.ts`:
        *   `loadConfig(): Config`, which validates the bundle and returns typed values;
        *   `configStatus(today: Date): { taxYear, unvalidatedKeys: string[], outOfDate: boolean }`;
        *   `configDefaults()`, which returns the values shown next to user overrides.

##### 25. `./src/engine/units.ts` (Create, stage 2)

*   **Proposed Changes**:
    *   Branded types `TodayDollars` and `FutureDollars`.
    *   `makeDeflator(cfg)` returns `factor(yearIndex)`.
    *   `normalizeInputs(inputs, cfg): NormalizedInputs` converts every `…Today` field once.
    *   `toDisplay(rows, deflator)` converts results back.

##### 26. `./src/engine/types.ts` (Create, stage 1)

*   **Proposed Changes**: The definitions in [Data contracts](#data-contracts), plus:
    *   `YearContext { yearIndex, deflator, cfg }`, passed to every engine function that needs indexing;
    *   `TaxableIncome { pensionEligible, oas, cpp, otherOrdinary, eligibleDividends, foreignDividends, taxableGains }`.

    Filling rule for `pensionEligible`: DB payments at any age, and RRIF/LIF payments when the owner is 65 or older. RRSP and LIRA withdrawals, and RRIF/LIF before 65, go to `otherOrdinary`.

##### 27. `./src/engine/jurisdiction/types.ts`, `./federal.ts`, `./ontario.ts` (Create, stage 1)

*   **Proposed Changes**:
    *   `federalTax(income: TaxableIncome, age, ctx): { tax, clawback }`, covering brackets, credits, dividend credit and OAS recovery tax.
    *   The `Jurisdiction` interface:
        *   `provincialTax(income, age, ctx): number`, covering brackets, credits, surtax, Health Premium and Tax Reduction;
        *   `probate(estateAssets: number, ctx): number`;
        *   `lifLimits(balance, ageAtStartOfYear, ctx): { min, max }` (Ontario's minimum reads `federal.rrif.min_factor`, as FSRA requires);
        *   `unlockShare(ctx): number`.
    *   `ontario.ts` implements `Jurisdiction`.

##### 28. `./src/engine/tax/personalTax.ts` (stage 1) and `./src/engine/tax/split.ts` (stage 2) (Create)

*   **Proposed Changes**:
    *   `personalTax(income, age, jurisdiction, ctx): { federal, provincial, clawback, total }`.
    *   `bestSplit(a, b, ctx): { share, householdTax }` tries 0–50% in `SPLIT_STEP` steps, respecting eligibility.

##### 29. `./src/engine/benefits/cpp.ts`, `./oas.ts`, `./db.ts`, `./survivor.ts` (Create, stage 2)

*   **Proposed Changes**: Each uses the formulas in [Accounts](#accounts), with coefficients from config. The first year is pro-rated by birth month (months after the start birthday ÷ 12), and the OAS 75+ increase is pro-rated the same way.
    *   `cppAt(estimateAt65, startAge, age, birthMonth, ctx)`
    *   `oasAt(residenceYears, startAge, age, birthMonth, ctx)`
    *   `dbPayment(db, age, birthMonth, ctx, alive)`, covering the lifetime amount, the bridge until its end age, and indexing (full uses the deflator; fixed uses `indexRate`)
    *   `survivorBenefits(deceased, survivor, ctx)`

##### 30. `./src/engine/accounts/rrspRrif.ts`, `./liraLif.ts`, `./tfsa.ts`, `./nonRegistered.ts` (Create, stage 2)

*   **Proposed Changes**: Pure functions on account state:
    *   **RRSP/RRIF:** conversion; the minimum uses the start-of-year age and is zero in the opening year.
    *   **LIRA/LIF:** conversion (validated by 71), minimum and maximum from the jurisdiction (zero minimum in the opening year), and the optional unlock to the owner's RRSP/RRIF.
    *   **TFSA:** room tracking, contributions within room, and successor transfer without using room.
    *   **Non-registered:** pooled positions with original cost; `sellProRata(amount)` returns cash and realized gain; `cashYield(ctx)` returns income by type.

##### 31. `./src/engine/invest/glide.ts`, `./placement.ts`, `./rebalance.ts` (Create, stage 2)

*   **Proposed Changes**:
    *   `stockShare(shapeId, yearsFromFirstRetirement, cfg)`.
    *   `targetHoldings(accounts, overallMix, presetId, cfg)` fills bonds, then global stocks, then Canadian stocks, each in its preset's account order, at face value. The baseline puts the same mix in every account.
    *   `rebalance(accounts, targets)` returns new holdings and the realized gains for the year.
    *   `afterTaxStockShare(accounts, avgWithdrawalRate)`.

##### 32. `./src/engine/withdraw/registeredLast.ts`, `./fillBrackets.ts`, `./surplus.ts` (Create, stage 2)

*   **Proposed Changes**:
    *   `registeredLast(W, accounts, ctx)` draws non-registered first (pro rata across spouses), then RRSP/RRIF and LIF in proportion (LIF capped at its maximum), then TFSA (pro rata).
    *   `bracketTopUp(spouses, accounts, targets, ctx)` returns the required draws.
    *   `placeSurplus(surplus, accounts)` puts surplus in the owner's TFSA within room, then their non-registered account.

##### 33. `./src/engine/solver/bisect.ts` and `./src/engine/solver/yearSolve.ts` (Create, stage 2)

*   **Proposed Changes**:
    *   `bisect(f, lo, hi): { x, converged }` uses `SOLVER_PRECISION` and `SOLVER_MAX_STEPS`.
    *   `solveYear(state, inputs, ctx, variant): { nextState, row }` implements the [year solver](#the-year-solver) steps in order, with the two-pass split.
    *   Non-convergence or an invariant failure throws `EngineIntegrityError { year, variant, check, before, after }`.

##### 34. `./src/engine/project/workingYear.ts` (stage 2), `./runPath.ts` (stage 2), `./death.ts` (stage 3) (Create)

*   **Proposed Changes**:
    *   `workingYear(...)` runs years before the first retirement, per [The year solver](#the-year-solver).
    *   `runPath(inputs, ctx, variant, detail: 'full' | 'summary')` runs the plan at fixed returns and returns rows and a `PlanSummary`.
    *   `death.ts` holds:
        *   the first-death transfer;
        *   same-year death handling;
        *   `finalReturn` (registered balances converted or not, deemed sale, tax);
        *   `estate` (probate per O23, optional home, after-tax legacy).

##### 35. (Removed 2026-11-18: no market generator or stress paths with fixed returns)

##### 36. `./src/engine/simulate/variants.ts` and `./src/engine/simulate/simulate.ts` (Create, stage 4)

*   **Proposed Changes**:
    *   `variants(inputs)` returns the user's plan plus up to two baselines (placement, other strategy), skipping any identical to the user's choice.
    *   `simulate(inputs, cfg)` runs the user's plan in full detail and each baseline as a summary.

##### 37. `./src/engine/results/compare.ts` (Create, stage 4)

*   **Proposed Changes**: Implement the [Result definitions](#result-definitions):
    *   whether spending is covered and whether the legacy goal is met;
    *   `compare` returns the differences in lifetime tax and money left between the plan and a baseline, with an opposite-direction flag;
    *   the average withdrawal tax rate for the readout.

##### 38. `./src/engine/invariants.ts` (Create, stage 2)

*   **Proposed Changes**: `checkYear(prev, next, row, ctx)` applies the [Verification](#verification-g10) checks within `INVARIANT_TOLERANCE`.

##### 39. `./src/engine/warnings/definitions.ts`, `./evaluate.ts`, `./tips.ts` (Create, stage 6)

*   **Proposed Changes**:
    *   **`definitions.ts`:** one object per warning, holding its check, explanation, basis, years, scope, unit and related input paths.
    *   **`evaluate.ts`:** evaluates the warnings and collapses repeated years.
    *   **`tips.ts`:**
        *   reruns the plan with each related input nudged up and down by its configured step, and returns the top three inputs by effect with conditional wording.

##### 40. `./src/engine/index.ts` (Create, stage 4)

*   **Proposed Changes**: Exports:
    *   `runPlan(inputs): Result`
    *   `loadConfig`, `configStatus`, `configDefaults`
    *   `normalizeInputs`, `toDisplay`
    *   the types `PlanInputs`, `Result`, `YearRow`, `PlanSummary`

#### Worker (stage 4)

##### 41. `./src/worker/engine.worker.ts` and `./src/worker/client.ts` (Create)

*   **Proposed Changes**:
    *   The Worker receives `{ type: 'run', inputs, revision }` and posts `result` (with `revision`) or `error` (including `EngineIntegrityError` details).
    *   The client exposes `run(inputs, revision): Promise<Result>`.

#### State and persistence (stages 5, 7)

##### 42. `./src/state/store.ts`, `./src/state/defaults.ts`, `./src/state/changeSummary.ts` (Create, stage 5)

*   **Proposed Changes**:
    *   **Store (Zustand):** holds `inputs`, `inputsRevision`, `result`, `previousResult` and `status` (idle / running / error).
        *   Actions: `setInput(path, value)`, `loadPlan(inputs)`, `recalculate()`.
        *   `isStale = result?.revision !== inputsRevision`.
    *   **`defaults.ts`:** the empty-plan values.
    *   **`changeSummary(previous, current)`:** lists changes in whether spending is covered, after-tax legacy, lifetime tax, clawback years and first shortfall year, plus warnings added or cleared.

##### 43. `./src/state/persistence/planSchema.ts`, `./storage.ts`, `./exportImport.ts` (Create, stage 7)

*   **Proposed Changes**: Implement [Persistence](#persistence):
    *   the Zod envelope `{ schemaVersion: 1, inputs, meta }`;
    *   the `rp.plan.v1` key and the debounced autosave;
    *   `navigator.storage.persist()`, with the export prompt on refusal or save failure;
    *   export file naming and the newer-version refusal message.

##### 44. `./src/state/samplePlan.ts` (Create, stage 7)

*   **Proposed Changes**: A fictional Ontario couple:
    *   spouses born in different years, one retiring two years before the other;
    *   an RRSP, a TFSA and a non-registered account;
    *   one DB pension with a bridge;
    *   one LIRA.

    Used by "Load sample plan" and the end-to-end tests.

#### Screens (stage 5; warnings in stage 6)

##### 45. `./src/ui/App.tsx` and `./src/ui/styles.css` (Create)

*   **Proposed Changes**:
    *   Tab bar for Household, Spending, Investing and Withdrawals, with the Results panel always visible.
    *   Header shows the tax year and the config notice.
    *   Footer shows the disclaimer.
    *   First-run disclaimer dialog.

##### 46. `./src/ui/tabs/HouseholdTab.tsx`, `./SpendingTab.tsx`, `./InvestingTab.tsx`, `./WithdrawalsTab.tsx` (Create)

*   **Proposed Changes**:
    *   **Household:**
        *   spouses: birth year and month, sex at birth, retirement year, life expectancy target with the 25%-survival note, CPP estimate, residence years, working marginal rate, after-tax pay;
        *   accounts and DB pensions.
    *   **Spending:**
        *   three phases with the estimated gross amount from the last run;
        *   survivor percentage, legacy goal, home value.
    *   **Investing:**
        *   shape and preset choices with explanations;
        *   fees and return overrides showing config defaults;
        *   the placement comparison, with the after-tax stock share readout;
        *   a note that returns are steady averages, so a shape shows only its effect on average returns, not on protection from a bad market;
        *   a note that results describe the named shape, not the user's actual holdings.
    *   **Withdrawals:**
        *   strategy choice and bracket targets with reference thresholds;
        *   conversion ages and the unlock choice;
        *   CPP and OAS start ages;
        *   the strategy comparison.

##### 47. `./src/ui/results/ResultsPanel.tsx`, `./RecalcButton.tsx`, `./StaleOverlay.tsx`, `./ChangeSummary.tsx`, `./WarningsList.tsx`, `./ConfigNotice.tsx`, `./IntegrityError.tsx` (Create)

*   **Proposed Changes**:
    *   **Headline numbers:** whether spending is covered every year (with its label, and the first shortfall year if not), after-tax legacy, lifetime tax.
    *   **Recalculate:** button that shows "Calculating…" while running.
    *   **Stale overlay:** dims results when inputs have changed since the last run.
    *   **Change summary:** shown after each run.
    *   **Warnings:** each with tips and links that focus the related input.
    *   **Config notice:** shown when values are unvalidated or out of date.
    *   **Integrity error:** shows the details with a "Copy details" button.

##### 48. `./src/ui/charts/BalancesChart.tsx`, `./IncomeChart.tsx`, `./TaxChart.tsx`, `./EstateWaterfall.tsx`, `./YearTable.tsx` (Create)

*   **Proposed Changes**: Charts in today's dollars for the user's plan. Every chart has a table view, and labels say "today's dollars".

##### 49. `./src/ui/inputs/Field.tsx`, `./CurrencyInput.tsx`, `./PercentInput.tsx`, `./AgeInput.tsx`, `./SegmentedChoice.tsx` (Create)

*   **Proposed Changes**:
    *   Labels sit above inputs, with glossary tooltips.
    *   Currency fields use comma formatting that keeps the cursor position.
    *   Segmented choices are built from real radio inputs, so they work by keyboard.
    *   Inline validation messages don't shift the layout.

##### 50. `./src/ui/content/glossary.ts`, `./explanations.ts`, `./disclaimer.ts` (Create)

*   **Proposed Changes**:
    *   **`glossary.ts`:** at least the terms in the [Glossary](#glossary).
    *   **`explanations.ts`:** fixed templates for each preset, shape, strategy and comparison, all in conditional wording.
    *   **`disclaimer.ts`:** placeholder text: "This tool shows projections under the assumptions you enter. It is not financial, tax or legal advice." It is replaced when O20 is resolved.

#### Tools (stage 0)

##### 51. `./tools/configBundle.ts`, `./tools/configCheck.ts`, `./tools/configCompare.ts` (Create)

*   **Proposed Changes**:
    *   **`configBundle`:** generates `src/engine/config/bundle.ts` for `CURRENT_YEAR`.
    *   **`configCheck`:** validates every config file against the schema, checks that every key in `SOURCES.md` exists, and lists unvalidated entries. It exits non-zero on schema errors.
    *   **`configCompare a b`:** lists every key whose value, unit, year or indexed flag differs.

#### Tests and fixtures

##### 52. `./tests/fixtures/tax-cases.json` (Create, stage 0, by the author)

*   **Proposed Changes**: At least 20 cases in the format `{ id, pairId?, age, income: TaxableIncome, federalTax, ontarioTax, clawback, source: "TaxTips.ca Ontario calculator", checkedOn }`.
    *   `federalTax` excludes the OAS recovery tax, which goes in `clawback`, matching how TaxTips.ca reports it.
    *   `income` is after any pension split.
    *   The two spouses of a split case share a `pairId`.

    The cases include:
    *   a death-year return;
    *   a clawback case;
    *   a high-dividend case;
    *   a pension-split pair.

    Answers must match within $1 per return.

##### 53. `./tests/fixtures/reference-plan/inputs.json` and `./expected-rows.csv` (Create, stage 3)

*   **Proposed Changes**: A made-up couple at fixed returns. The expected rows are built by a separate AI session from this design, `docs/units-and-conventions.md` and the config, without seeing engine code. Columns follow `YearRow`. The engine must match within $1 per cell.

##### 54. `./tests/fixtures/saved-plans/v1.json` (Create, stage 7)

*   **Proposed Changes**: A version 1 export, frozen for future schema tests.

##### 55. `./tests/fixtures/paid-tool-comparison.md` (Create, before stage 8)

*   **Proposed Changes**: The manual comparison record:
    *   the tool, its version and the date;
    *   the sample couple's inputs as entered in that tool;
    *   headline results from both tools, side by side;
    *   for each difference, the assumption that explains it, or "unexplained — investigated".

    An agent may draft it; the author completes and commits it.

##### 56. `./tests/unit/` (Create, stages 1–7)

*   **Proposed Changes**: One file per module.

    | File | Test cases |
    |---|---|
    | `personalTax.test.ts` | Every `tax-cases.json` case within $1 |
    | `split.test.ts` | Eligibility (no RRIF splitting under 65; DB at any age); hand-checked pairs |
    | `cpp.test.ts`, `oas.test.ts`, `db.test.ts`, `survivor.test.ts` | Start ages 60/65/70; birth-month pro-rating; OAS residence and the 75+ increase; DB bridge stop and indexing; survivor cap, both age bands |
    | `rrspRrif.test.ts`, `liraLif.test.ts`, `tfsa.test.ts`, `nonRegistered.test.ts` | Minimums against the config table; zero minimum in the opening year; LIF min/max and unlock; TFSA room and successor; original cost on partial sales |
    | `glide.test.ts`, `placement.test.ts`, `rebalance.test.ts` | Shape interpolation and end points; fill order; baseline mix; realized gains |
    | `registeredLast.test.ts`, `fillBrackets.test.ts`, `surplus.test.ts` | Draw order; pro rata between spouses; bracket top-up creates surplus; survivor target; surplus to TFSA within room |
    | `yearSolve.test.ts` | Convergence for every tax case; shortfall recorded; mixed working/retired year; two-pass split |
    | `death.test.ts` | Rollover at original cost; same-year deaths; final return includes unconverted RRSP/LIRA; probate |
    | `units.test.ts` | `normalizeInputs` and `toDisplay` round trip |
    | `compare.test.ts` | Spending-covered and legacy-goal flags; differences against a baseline; opposite-direction flag |
    | `warnings.test.ts`, `tips.test.ts` | Each trigger at and around its threshold; collapsed years; tips ranked by effect |
    | `changeSummary.test.ts`, `store.test.ts` | Diff fields; stale flag on edit and load |
    | `persistence.test.ts` | Round trip; newer-version refusal; the frozen v1 file loads |
    | `configCompare.test.ts`, `configCheck.test.ts` | Detects value, unit, year and indexed-flag differences; rejects a malformed file |

##### 57. `./tests/property/*.test.ts` (Create, stages 2–4)

*   **Proposed Changes**: The property tests listed in [Verification](#verification-g10). They use fast-check, plus a test-only config under `tests/property/configs/` (zero tax) that is never part of the validated config.

##### 58. `./tests/reference/referencePlan.test.ts` (Create, stage 3)

*   **Proposed Changes**: Runs the reference inputs at fixed returns and compares every cell with `expected-rows.csv`, within $1.

##### 59. (Removed 2026-11-18: no benchmark script; the speed check is manual)

##### 60. `./tests/e2e/*.spec.ts` (Create, stages 5–7)

*   **Proposed Changes**: One spec per CUJ, plus two checks.
    *   **CUJ 1 (`first-plan.spec.ts`):** load the sample plan and recalculate. The spending-covered result, after-tax legacy and lifetime tax are shown, the year table has one row per year, and the plan survives a page reload.
    *   **CUJ 2 (`cross-tab.spec.ts`):** change the strategy on Withdrawals. Every tab shows the stale overlay; after recalculating, the change summary lists lifetime tax and clawback years.
    *   **CUJ 3 (`placement.spec.ts`):** change the preset. The comparison shows lifetime tax and money left for the preset and the baseline.
    *   **CUJ 4 (`first-death.spec.ts`):** with targets 78 and 94, the rows after 78 show one spouse not alive, the survivor benefits started, and the survivor percentage applied.
    *   **CUJ 5 (`resume.spec.ts`):** export, clear storage, import. The inputs are identical. A file with `schemaVersion: 2` is refused with both versions named.
    *   **CUJ 6 (`config-notice.spec.ts`):** a build with `VITE_CONFIG_SET=test` (a test config with one unvalidated key) shows the config notice.
    *   **`no-network.spec.ts`:** a full session makes no request outside the app's own origin.
### Verification Plan

*   **Compilation/Build**: `npm run typecheck` and `npm run build` succeed.
*   **Unit Tests**: `npm test` passes, including every tax fixture, the reference plan and the property tests.
*   **Static Analysis & Linting**: `npm run lint`, `npm run format:check` and `npm run config:check` pass.
*   **Test Coverage Requirement**: 90% branch coverage for `src/engine/**` and 70% branch coverage elsewhere, from stage 2.
*   **E2E/Integration**: `npm run test:e2e` passes in Chromium, including the no-network test.
*   **Fixtures**: before each stage tag, the author reviews `git diff tests/fixtures config`.
*   **Paid-tool comparison (manual, before stage 8)**: recorded in `tests/fixtures/paid-tool-comparison.md`. Any difference the tools' assumptions don't explain is investigated before stage 8.
*   **Performance (manual, before stage 8)**: a full recalculation takes under 2 seconds on the reference machine.
*   **Stage 8 (people)**: the author judges each tester against the [Success Criteria](#success-criteria-for-version-1).

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
