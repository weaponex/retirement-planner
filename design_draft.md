# Canadian Retirement Planner (Ontario Couple, Version 1)

*   **Author:** weaponex
*   **Status:** Draft
*   **Date:** 2026-11-17

--------------------------------------------------------------------------------

## Overview

A free retirement planner that runs entirely in a desktop web browser. It helps a Canadian couple see how three groups of decisions affect each other:

1.  **Spending:** what the couple plans to spend in three phases of retirement (active early years, slower middle years, late years), what the survivor spends after the first death, and how much the couple wants to leave to their children after tax.
2.  **Investing with taxes in mind:** which kinds of investments to hold in which accounts (RRSP/RRIF, TFSA, non-registered, workplace pension accounts), and how to shift from growth toward safer investments as retirement goes on.
3.  **Withdrawals:** which accounts to draw from and in what order, when each spouse starts CPP and OAS, RRIF minimum withdrawals, pension income splitting, the OAS clawback, and the tax due at each death.

The three areas are tabs over one shared plan. The user can change anything on any tab, then press **Recalculate** to rerun the whole plan. Market returns vary from year to year in the model, so the user sees the risk of a bad market early in retirement and what safer investments do about it. After each run, the app warns when something is at or near a known threshold and says which inputs affect it. It also shows what each tax-related choice is worth: lifetime tax paired with after-tax money left.

The tool teaches. It does not give personal advice and never moves money. Nothing the user enters leaves the browser.

Version 1 is for the author and a few trusted friends and family, modelled as Ontario couples. The long-term intent is to release it free to all Canadians.

## The Problem

**What retirees face.** A Canadian couple planning retirement makes dozens of decisions that interact through the tax system:

*   Spending more in the early years means drawing more from savings, which raises taxable income, which can trigger the OAS clawback.
*   Holding growth investments in the RRSP makes it larger, which raises RRIF minimum withdrawals later and the tax bill when the second spouse dies.
*   Delaying CPP and OAS to 70 raises lifetime government income but means drawing down savings faster in the meantime.
*   When one spouse dies, the survivor is taxed as a single person, often at higher rates, on much of the same income.

Each decision looks reasonable alone. Its effect is only visible when everything is calculated together, year by year, with tax.

**Why existing options fall short for this audience:**

*   **The Government of Canada's Canadian Retirement Income Calculator** estimates CPP, OAS and savings income, but treats each separately. It uses one spending figure and does not model withdrawal order, tax by account type, account placement, or what happens at each death.
*   **Paid planning tools** (for example Optiml, ProjectionLab) do much of this, but cost money, store the user's financial details on a company's servers, and are built to produce a plan rather than to explain why one choice beats another.
*   **Spreadsheets** can do anything in principle, but getting Canadian tax, RRIF rules, OAS clawback and death taxation right in a spreadsheet takes expertise most people don't have.

**What went wrong last time.** The author built a single-file prototype that went through about 30 rounds of patches. It failed for three reasons, recorded in `retirement-planner-context.md`:

*   it mixed today's dollars and future dollars in the same calculation;
*   tax was dropped from withdrawals during a rewrite and never restored;
*   nothing was ever run as a test; it was only checked by reading the code.

Its tax constants were also wrong or out of date (the lowest federal rate entered as 0%, an older year's OAS clawback threshold, an incorrect RRIF table). This design is a clean rewrite. The prototype's code is discarded; only its decision log carries over as history.

**What this design does about it:**

*   one calculation engine that works in future (nominal) dollars throughout, converting from and to today's dollars only at input and display;
*   every rule value (tax rates, benefit amounts, RRIF tables) stored in a versioned config file with its source, never written into code or supplied from an AI agent's memory;
*   tests that run automatically against answers from outside sources, plus accounting checks the engine runs on every recalculation and refuses to show a result that fails them.

## Goals

### Product goals

*   **G1. Linked planning.** The user can change inputs on any of the three tabs, recalculate, and see the effect on all three. After each recalculation, the app lists what changed since the previous run (for example "chance of success 78% → 84%; after-tax legacy −$62k; clawback years 3 → 7").
*   **G2. Tax-aware results for an Ontario couple.** Each year of the plan computes federal and Ontario tax for each spouse separately, including credits, the OAS clawback, and pension income splitting, based on actual taxable income by account type.
*   **G3. Both deaths modelled.** Each spouse has an editable life expectancy target. The plan handles the first death (rollovers, survivor benefits, single-filer tax, survivor spending) and the second death (final-return tax on the RRIF, investments taxed as if sold, Ontario probate) and reports the after-tax legacy.
*   **G4. Variable returns with repeatable results.** The plan runs on many simulated market histories. Results are the same every time for the same inputs, because the random seed is stored in the plan.
*   **G5. Show what placement and the growth-to-safety shift are worth.** For the user's choices, the app shows lifetime tax paired with after-tax money left, compared against a simple baseline on the same simulated markets, in the typical case and in the worst 10% of markets.
*   **G6. Threshold warnings.** After each recalculation, the app shows warnings when a defined threshold is near or crossed, each with the inputs that affect it. The list starts with 9 warnings and grows through use.
*   **G7. Private and durable.** No user data leaves the browser. The plan saves automatically in the browser, and can be exported to a file and imported again, including into a newer version of the app.
*   **G8. Defined-benefit pensions.** Either spouse can enter a DB pension from their pension statement, and the engine includes it in tax, splitting and survivor calculations.

### Correctness goals

*   **G9. Sourced rule values.** Every rule value lives in a config file, one per tax year, with its unit, inflation indexing, source link, date fetched and validation status. The app shows which tax year it is using and flags any unvalidated or outdated value.
*   **G10. Verified engine.** Tax results match outside tax calculators on a fixed set of test cases. The full year-by-year loop matches a reference plan built independently. The engine's accounting checks pass on every run in production, and a run that fails them shows an error instead of results.

### Success criteria for version 1

*   The author and two friends each complete a full plan for their household without help.
*   Each of them changes something on one tab, recalculates, and correctly describes the effect on the other tabs without help.
*   Each of them can explain at least one tax-efficient investing idea they did not know before, using the numbers from their own plan.
*   Recalculation with the default number of simulated market paths finishes in under a target time on a mid-range laptop (target set in the Technical Plan).

## Non-Goals

*   **Other provinces and Quebec.** Version 1 is Ontario only. No Ontario-specific values are hard-coded in the engine, so other provinces can be added later; Quebec (QPP, separate tax system) is not part of that promise.
*   **Single people.** Version 1 models couples. (Open question O16 asks whether singles are needed for the test group.)
*   **Child-related planning other than legacy.** No RESP, no Canada Child Benefit.
*   **Personal advice or optimization.** The app shows results of choices the user makes and compares them with simple baselines. It does not recommend, does not search for an "optimal" plan, and never says "you should". Trades and money movement are out of scope.
*   **Accounts, sync, servers.** No sign-in, no cloud storage, no sharing except by exporting a file.
*   **Fetching rule values while running.** Values are fetched at build time and bundled with the app.
*   **Mobile layout, colour themes, PDF export.**
*   **Commuted value of DB pensions** (taking a lump sum instead of the pension).
*   **Tax features:** alternative minimum tax, GIS, tax-loss harvesting, spousal RRSP attribution rules, CPP pension sharing.
*   **Other life events:** annuity purchases, random lifespans, long-term care cost shocks, one-time events such as selling a home or receiving an inheritance.

## Open Questions

The brief's open questions O1–O21 were resolved in the Technical Plan (decisions marked "author" were chosen by the author; the rest are mechanical defaults the author can override in review), except the ones below.

*   **O16.** Check the test friends' situations: are single people needed? Is a general "other income" stream (for example part-time work) needed? If either is needed, version 1 scope changes before implementation.
*   **O20.** Disclaimer wording and placement, and a check against Ontario FSRA expectations before any release beyond family.
*   **O22.** Source for the volatility and correlation figures used by the return generator. FP Canada's guidelines publish expected returns and inflation, not volatilities or correlations. A published long-run Canadian source must be identified and recorded in the config.
*   **O23.** The defaults chosen for probate (see Technical Plan, "Death and estate") need the author's confirmation: registered accounts and TFSAs are assumed to have named beneficiaries and skip probate; the home is optional.

## Critical User Journeys (CUJs)

### CUJ 1: First plan

*   **Given**: A couple opens the app for the first time. No plan is saved in the browser.
*   **When**: They enter their ages, life expectancy targets, accounts and balances, CPP and OAS start ages, DB pension (if any), spending for each phase, survivor spending percentage and legacy goal, then press Recalculate.
*   **Then**: The app shows, in today's dollars, year-by-year income by source, account balances, tax by spouse, the chance that spending is covered every year, the after-tax legacy, and any warnings. The plan is saved in the browser automatically.

### CUJ 2: Change one tab, see the others

*   **Given**: A recalculated plan with a warning that the OAS clawback starts at 72.
*   **When**: The user opens the Withdrawals tab, changes the strategy to draw the RRSP down earlier, and presses Recalculate.
*   **Then**: Results on every tab update. The change summary lists the effect on lifetime tax, after-tax legacy, chance of success and clawback years. Before Recalculate is pressed, every result on every tab is marked as out of date.

### CUJ 3: Learn what placement is worth

*   **Given**: A recalculated plan.
*   **When**: The user opens the Investing tab and chooses a different account placement for bonds and stocks, then presses Recalculate.
*   **Then**: The app shows lifetime tax and after-tax money left for the chosen placement compared with a same-mix-everywhere baseline, run on identical simulated markets, for the typical case and the worst 10% of markets, with a short plain-English explanation of why the difference arises.

### CUJ 4: First death

*   **Given**: A plan where one spouse's life expectancy target is 78 and the other's is 94, with a DB pension that pays 60% to the survivor.
*   **When**: The user recalculates and looks at the years after 78.
*   **Then**: The deceased spouse's accounts move to the survivor without tax, the deceased's OAS stops, the CPP survivor benefit and the DB survivor share start, the survivor is taxed as a single person, and spending drops to the survivor percentage. Any jump in tax is visible and explained.

### CUJ 5: Resume on another day

*   **Given**: A user built a plan last week and exported it to a file.
*   **When**: The browser storage has since been cleared, and the user imports the file into a newer version of the app.
*   **Then**: The plan loads with all inputs intact, after any needed upgrade to the newer format. Results are recalculated with the current config, and the app shows which tax year's values are in use.

### CUJ 6: Admin updates the yearly values

*   **Given**: A new tax year has started.
*   **When**: The admin runs the value-fetching step, reviews any values where the two independent fetches disagree, and marks the new config as validated.
*   **Then**: The new config ships with the next build. Until it is validated, the app shows a notice that some values are unvalidated or from the previous year.

## Technical Plan (Architecture)

### Decisions made for this plan

| Topic | Decision | Chosen by |
|---|---|---|
| Variable returns (O3) | Generated returns from a statistical model, with FP Canada averages, plus 2–3 named stress paths | Author |
| Inflation (O1) | One fixed rate for every path and year, from FP Canada guidelines, in the config | Author |
| Account placement (O4) | 2–3 named presets compared with a "same mix everywhere" baseline | Author |
| How the overall mix is counted (O4) | Face value (balances as on statements), with an after-tax stock share shown next to each comparison | Author (readout added by design) |
| Withdrawal strategies (O7) | Two named strategies, compared on the same markets | Author |
| Growth-to-safety shift (O5) | 2–3 named shapes with fixed percentages from the config | Author |
| Warning tips (O14) | Computed by nudging related inputs on a single fixed-return path | Author |
| Screen framework | React | Author |
| Recalculation (O18) | Button only, no live preview | Author (brainstorm) |
| Everything else in this section | Mechanical defaults listed where they appear | Design; author may override in review |

### Components and data flow

```text
 ┌──────────────────────── Browser (nothing leaves it) ─────────────────────────┐
 │                                                                              │
 │  React screens                         Plan store (one source of truth)      │
 │  ┌─────────────┐ edits ──────────────▶ ┌──────────────────────────────┐      │
 │  │ Household   │                       │ PlanInputs (versioned)        │      │
 │  │ Spending    │ ◀── reads ─────────── │ lastResult + its inputHash    │      │
 │  │ Investing   │                       │ previousResult (for the diff) │      │
 │  │ Withdrawals │                       └───────┬──────────────▲────────┘      │
 │  │ Results/    │                               │ autosave     │ Result        │
 │  │ warnings    │                               ▼              │               │
 │  └─────┬───────┘                    localStorage (inputs only, │               │
 │        │ Recalculate                 10 rolling snapshots)     │               │
 │        ▼                                                       │               │
 │  ┌──────────── Web Worker ───────────────────────────────────────────────┐    │
 │  │  Engine (pure TypeScript, no screen code)                             │    │
 │  │   config loader ─▶ market generator (seeded) ─▶ N paths + stress paths │    │
 │  │        │                                   │                          │    │
 │  │        ▼                                   ▼                          │    │
 │  │   jurisdiction (federal + Ontario)   variant runner: user plan,       │    │
 │  │   tax, benefits, accounts            placement baseline, Steady       │    │
 │  │        │                             shape, other withdrawal strategy │    │
 │  │        └──────▶ year solver ◀────────────┘   (same paths for each)    │    │
 │  │                     │                                                 │    │
 │  │                     ▼                                                 │    │
 │  │   invariant checks ─▶ aggregation ─▶ warnings ─▶ nudges ─▶ Result     │    │
 │  └───────────────────────────────────────────────────────────────────────┘    │
 │                                                                              │
 │  Bundled config (per tax year, read-only at run time)                         │
 └──────────────────────────────────────────────────────────────────────────────┘

 Build time only:  value-fetch tool (two independent fetches) ─▶ candidate config
                   ─▶ admin review ─▶ validated config committed to the repo
```

**Screens.** Five areas: **Household** (people, accounts, balances, contributions, pensions), **Spending**, **Investing**, **Withdrawals**, and a **Results** panel visible on every tab (key numbers, warnings, change summary, Recalculate button). The brief named three planning areas; Household is added because ages, accounts and pensions feed all three and belong to none of them.

**One store.** The plan lives in one store (Zustand, mechanical choice). Screens read from it and write inputs straight to it. No component keeps its own copy of a plan value.

**Stale results and the change summary.** Each result carries a hash of the inputs it was computed from. When the current inputs' hash differs, every result on every tab is dimmed and labelled "Inputs changed — press Recalculate". After a run, the previous result is kept in memory, and the change summary lists differences in the headline numbers (chance of success, after-tax legacy, lifetime tax, clawback years, first shortfall year, warnings added or cleared). The previous result is not saved across browser sessions.

**Worker.** All calculation runs in a Web Worker so the screen stays responsive, with a progress bar and a Cancel button.

### Units and conventions

*   **Engine unit: future (nominal) dollars throughout.** Today's-dollar inputs (spending, legacy goal, thresholds the user enters) are converted on the way in, and results are converted back for display. Separate TypeScript types for today's dollars and future dollars make mixing them a compile error.
*   **Valuation date:** January 1 of the plan's start year (an input, defaulting to the current year). The inflation factor for year *t* after the start is (1 + inflation)^t, with fixed inflation.
*   **Rows:** one per calendar year, from the start year to the year the second spouse reaches their life expectancy target. Each spouse's age in a row is the age they reach during that year (author). This matches CRA's end-of-year age rules for the age amount, the pension income credit and pension splitting. The RRIF minimum uses the age at the start of the year (row age − 1). CPP, OAS and DB payments start for the full year in which the start age is reached. That slightly overstates the first year's payment and is noted in the user-facing help text.
*   **Timing within a year:** withdrawals and pension income are taken at the start of the year; returns apply to what remains; contributions during working years land at the end of the year. Tax is settled in the same year.
*   **Deaths** happen at the end of the year the spouse reaches their target. The first-death transfers apply from the following year.
*   **Indexing:** each config value says whether it rises with inflation. Indexed values grow at the fixed rate; non-indexed values (for example Ontario's $150k and $220k bracket thresholds, the $50k probate threshold) stay fixed in future dollars.

### Config (rule values)

*   One set of files per tax year: federal tax and benefits, Ontario tax and rules, market assumptions, and planning defaults (life expectancy targets by sex, survivor spending percentage, placement presets, growth-to-safety shapes, warning thresholds, nudge steps).
*   Every entry records: value, unit, tax year, indexed (yes/no), source URL, where on the page the value appears, date fetched, and validation status (who validated it and when).
*   Loaded and checked against a schema at startup. The app shows the tax year in use and a notice if any value is unvalidated or from an earlier tax year.
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
    *   Ontario surtax, Health Premium and Tax Reduction;
    *   OAS recovery tax (clawback), calculated inside the tax function from actual net income.
*   **Out:** non-eligible dividends, foreign withholding tax (foreign dividends are taxed as ordinary income), alternative minimum tax, GIS, other credits.

### Accounts

Every account has an owner (spouse 1 or spouse 2). Types:

*   **RRSP**, converting to a **RRIF** at an age the user sets (no later than the end of the year the owner turns 71). RRIF minimums use the CRA factor for the owner's age at the start of the year.
*   **LIRA**, converting to a **LIF** at a user-set age, with Ontario's yearly minimum and maximum. The one-time 50% unlock is an optional choice at conversion; if chosen, half moves to the owner's RRSP/RRIF (O9).
*   **TFSA**, with contribution room tracked from a user-entered starting room plus the yearly limit from the config.
*   **Non-registered**, holding pooled positions per asset class with their original cost (adjusted cost base). Each year's interest, dividends and realized gains are taxed by type.
*   **DB pension** (income stream, not a balance): lifetime amount and start age, optional bridge amount until an end age, indexing (full, fixed percentage or none), survivor percentage.

CPP and OAS: the user enters each spouse's CPP estimate at 65 and start age, and years of Canadian residence for OAS. A help note explains that an estimate from My Service Canada assumes contributions continue to 65, and links to Service Canada's explanation of adjusting for years without contributions (O10). CPP and OAS age adjustments, the OAS 75+ increase, the CPP survivor benefit cap and the death benefit come from the config.

### Asset classes and returns (O3)

*   **Three asset classes:** Canadian stocks, global stocks, bonds. Each has a config entry for expected return (FP Canada), volatility and correlations (O22), the split of its return into interest, eligible dividends, foreign dividends and capital gains, and a default yearly fee that the user can edit.
*   **Return overrides (author):** the user can override the expected return for each asset class. The config default is shown next to each override, and the override is saved in the plan. Volatility, correlations and the income-type split always come from the config. An override above the config's limit for that class (FP Canada's guideline plus a margin, both in the config) triggers the "optimistic returns" warning.
*   **Generator:** each year's returns for the three classes are drawn together from a correlated lognormal model, using a seeded random number generator (xoshiro128**, mechanical choice). The seed is stored in the plan. Pressing Recalculate with no changes gives the same results. A "new seed" button exists for users who want to see a different set of markets.
*   **Named stress paths:** 2–3 fixed sequences defined in the config, for example a large stock drop in the first retirement year followed by a slow recovery. They run alongside the random paths and are reported separately.
*   **Default number of paths:** 1,000. The user can choose 250, 1,000 or 5,000.

### Placement and the growth-to-safety shift (O4, O5)

*   **Growth-to-safety shape:** one of 2–3 named shapes ("Steady", "Gradual shift", "Safety first, then regrow"). Each defines the overall stock share by years before or after the first spouse's retirement. Percentages come from the config. The stock share is split between Canadian and global stocks by a config ratio.
*   **Placement preset:** one of 2–3 named presets that say, for each asset class, which account types to fill first. For example, "Bonds sheltered first" puts bonds in RRSP/RRIF/LIF first, Canadian stocks in non-registered first, and global stocks in the TFSA first. The baseline "Same mix everywhere" holds the overall mix in every account.
*   **Yearly rebalance:** at the end of each year, the engine works out each account's target holdings from the shape's overall mix and the preset's fill order, counting balances at face value. Moves inside registered accounts and the TFSA are tax-free. Sales in the non-registered account realize gains, and that tax is added to the next year's income (avoiding a second loop within the year).
*   **After-tax stock share readout:** next to each placement comparison, the app shows the stock share of the chosen placement and of the baseline after reducing registered balances by the plan's average withdrawal tax rate. That way any extra hidden risk is visible.

### Withdrawal strategies (O7, O8)

*   **"Registered last":** after required RRIF and LIF minimums, draw from non-registered, then RRSP/RRIF and LIF (in proportion to their balances, with LIF draws capped at the LIF maximum), then TFSA.
*   **"Fill lower brackets first":** each spouse draws from RRSP/RRIF (then LIF) up to a target taxable income the user sets for that spouse, entered in today's dollars. Beyond that, the "registered last" order applies. The input shows the current OAS clawback threshold and bracket thresholds for reference.
*   **Surplus:** money forced out by minimums or the bracket target beyond what spending needs goes into the owner's TFSA up to available room, then into their non-registered account.
*   **Pension income splitting:** each year, the engine tries splitting 0% to 50% of each spouse's eligible pension income (DB payments at any age; RRIF and LIF payments if the transferring spouse is 65 or older) in 5% steps. It keeps the split with the lowest household tax. This matches what tax software does at filing time; it is not presented as a recommendation.

### The year solver

Each year, for each path and variant, in this order:

```text
1.  Set ages and who is alive. If the first death happened last year, apply the
    first-death transfers:
      - RRSP/RRIF/LIRA/LIF and non-registered positions move to the survivor
        (non-registered at their original cost);
      - the TFSA moves to the survivor without using room;
      - the deceased's CPP, OAS and DB stop;
      - the CPP survivor benefit (capped) and the DB survivor share start;
      - the $2,500 death benefit is paid;
      - spending switches to the survivor percentage.
2.  Fixed income for each spouse: CPP, OAS (with the 75+ increase), DB lifetime
    and bridge amounts, survivor benefits.
3.  Spending need in future dollars: phase amount × inflation factor
    (× survivor percentage after the first death).
4.  Required withdrawals: RRIF and LIF minimums; non-registered interest and
    dividends (paid out as cash); last year's realized gains from rebalancing.
5.  Solve for the extra gross withdrawal W >= 0 so that after-tax cash equals
    the spending need:
      - withdrawals beyond the minimums are spread across accounts by the
        chosen strategy;
      - tax for each spouse is computed with the best pension split;
      - find W by bisection between 0 and everything available; this always
        works because after-tax cash rises when W rises (no one pays more than
        100% tax on an extra dollar);
      - tolerance $1, at most 60 steps;
      - if even everything available is short, record the shortfall.
6.  Put any surplus into the TFSA (within room), then non-registered.
7.  Apply the year's returns, net of fees, to what remains. Update the original
    cost of non-registered positions.
8.  Rebalance to the year-end target holdings. Record realized gains for next
    year.
9.  If this is the second death year, file the final return:
      - the full RRIF/LIF balance counts as income;
      - non-registered positions are taxed as if sold;
      - TFSA balances pass tax-free;
      - Ontario probate applies to estate assets (O23);
      - the result is the after-tax legacy.
10. Run invariant checks (see Verification).
```

Working years before retirement use the same loop, with contributions instead of withdrawals and no spending need. Non-registered income in those years is taxed at a marginal rate the user enters, because employment income is not modelled.

### Death and estate (O12, O23)

*   **Probate defaults:** RRSP/RRIF/LIF and TFSA accounts are assumed to name a beneficiary (the spouse, then the children), so they skip probate. Non-registered accounts pass through the estate and pay probate.
*   **The home:** an optional home value. If entered, it counts toward the legacy and probate, is exempt from capital gains tax, and grows at the fixed inflation rate.
*   These defaults are open question O23.

### Results, success and representative paths (O13)

*   **Success:** spending is fully covered in every year of the plan. The chance of success is the share of random paths that succeed. Meeting the legacy goal is reported as its own probability and does not count toward success.
*   **Typical and bad:** the 50th and 10th percentiles of after-tax legacy across paths.
*   **Representative paths:** the paths whose legacy is closest to the 50th and 10th percentiles are kept in full detail (every row, every account) for the year-by-year table and charts. All other paths return only summary numbers, to save memory.
*   **Comparisons:** each run also computes three variants on the same paths:
    *   the placement baseline;
    *   the "Steady" shape;
    *   the other withdrawal strategy.

    Each comparison reports lifetime tax (including final-return tax and probate) paired with after-tax money left, as a difference per path, summarized at the 50th and 10th percentiles. A fixed-return run of the same comparison is shown beside it as a teaching example. When lifetime tax and money left move in opposite directions, the app says so and explains why.

### Warnings (O14)

*   **Registry:** each warning is a config entry. It declares:
    *   what it measures (the typical representative path, the share of all paths, or both);
    *   which years it covers;
    *   whether it applies per spouse or per household;
    *   its unit;
    *   its trigger levels;
    *   its severity;
    *   its related inputs and the nudge step for each.

    Each warning's check is a pure function of the result. Repeated years collapse into one line ("first at 72, for 6 years").
*   **Starting set (9):**
    *   money runs out (or will within 5 years of the plan's end);
    *   low chance of success (below 85% warns, below 70% alerts);
    *   OAS clawback near or crossed;
    *   RRIF minimum forces income more than $5k above the need;
    *   large RRIF/LIF balance at the second death;
    *   legacy goal missed in the typical or bad case;
    *   savings run out before CPP and OAS start (the bridge years);
    *   the survivor's tax jumps after the first death;
    *   optimistic returns: a user's expected-return override for an asset class is above the limit in the config.

    "Next tax bracket", "unbalanced incomes", "contribution room exceeded" and "high early withdrawal rate" are dropped for version 1. The first three are covered by the bracket-filling strategy and comparisons; the last fired for intentional bridge-year draw-downs.
*   **Computed tips:** for each warning that fires, the engine reruns a single fixed-return path with each related input nudged by its configured step (up and down). It ranks the inputs by how much they move the warning and shows the top three with the size of the effect. Wording is always conditional: "Under these assumptions, delaying OAS by 2 years removes 4 of 6 clawback years."

### Persistence

*   The plan's inputs (never results) autosave to localStorage. Each save holds a schema version, the inputs, and metadata.
*   The last 10 autosaves are kept as rolling snapshots. The app asks the browser to keep the data (persistent storage). If saving fails (storage full, private window), the app tells the user and prompts an export.
*   Export and import use the same JSON format. On load, the data is checked against the schema and upgraded through a chain of migrations, one per version step. The original is kept until the upgrade succeeds. Newer versions than the app understands are refused with a clear message.
*   A "Load sample plan" button fills a made-up couple's data; the app otherwise starts empty (O15). All test fixtures use made-up households. The author's real numbers never enter the repository (see Hosting).

### Hosting and repository (author)

*   **Public GitHub repository, served by GitHub Pages.** GitHub Actions runs lint, type checks and all tests on every push and pull request. Only a green build of the `main` branch is deployed.
*   **No personal data in the repository.** Fixtures and the sample plan use made-up couples. The original `retirement-planner-context.md` contains the author's real figures (§6). It moves to a `private/` folder that git ignores, and a copy with personal figures removed becomes the project's history documents. The author tests with real numbers by importing their own exported plan file locally. That file lives in `private/` and is never committed.
*   **Security policy by meta tag.** GitHub Pages can't set response headers, so the content security policy goes in a `<meta>` tag in `index.html`. It allows scripts, styles, workers and fonts only from the site itself, and blocks all network connections from the page (`connect-src 'none'`). This is weaker than a header (it can't block framing of the page), but it enforces "nothing leaves the browser" for the app's own code.
*   **No service worker, no analytics, no CDN.** All dependencies are bundled at build time. Built files carry content hashes, so a rollback is a revert commit followed by a redeploy.

### Performance

Target: a full recalculation finishes in **under 5 seconds** on a mid-range laptop. That covers 1,000 paths, the user's plan plus three comparison variants, stress paths, and tip nudges. This is measured by a benchmark test. If the target is missed, the first fix is reducing work inside the year solver, not lowering the default number of paths.

### Verification (G10)

*   **Runtime invariants, checked every year of every path:**
    *   after-tax cash equals the spending need, or a shortfall is recorded;
    *   money is conserved across accounts;
    *   no balance or original cost is negative;
    *   RRIF and LIF draws respect their minimums and maximums;
    *   TFSA contributions stay within room.

    If any check fails, the app shows an "engine integrity" error and no results.
*   **Tests** (detailed in the implementation plan):
    *   tax fixtures from outside calculators;
    *   rule-value tests against the config;
    *   a full reference plan built by a separate AI session that never saw the engine code;
    *   property tests: the same seed gives the same result; higher spending never raises the chance of success; with zero volatility every path equals the fixed-return run;
    *   the performance benchmark.

### Wording and spending details

*   **Advice language:** all result text is conditional and comparative. Strategy, shape and preset names are descriptive, not "best" or "optimal". The disclaimer appears on first run, in the footer, and in every export (O20 for exact wording).
*   **Spending categories (O17):** deferred. Each phase is a single after-tax amount in today's dollars. The input shows the estimated gross amount needed before tax for that phase, from the last run.

## Alternatives Considered

### Product scope (decided during the brainstorm)

#### Alternative A: Phases that feed one into the next in one direction only

*   **Pros**: Simpler mental model (fill in Spending, then Investing, then Withdrawals); fewer stale-result states.
*   **Cons**: A warning in Withdrawals sends the user back two steps to guess at a fix; the effect of one area on another is hidden.
*   **Reason for Rejection**: Rejected by author: the point of the product is to change any area and see the effect on the others.

#### Alternative B: Live recalculation on every change, or a live fixed-return preview next to the button

*   **Pros**: Immediate feedback; supports the "see the effect" goal without a button press.
*   **Cons**: Variable-return runs take seconds and would make inputs sluggish; a live fixed-return preview would show a number that differs from the button result and needs separate labelling.
*   **Reason for Rejection**: Rejected by author: the user edits inputs and presses Recalculate when ready. Stale-result marking and the change summary cover the feedback gap.

#### Alternative C: Fixed returns only

*   **Pros**: Simple, fast, easy to test and explain.
*   **Cons**: With a fixed return every year, moving to safer investments only lowers returns, so the growth-to-safety strategy always looks worse; sequence-of-returns risk can't be shown.
*   **Reason for Rejection**: Rejected by author: the growth-to-safety lesson can't be shown honestly without variable returns.

#### Alternative D: Explain tax-efficient investing in text only

*   **Pros**: No tax-by-income-type engine needed; far less to build and test.
*   **Cons**: Generic advice the user can read anywhere; doesn't show what it's worth for their plan.
*   **Reason for Rejection**: Rejected by author: the app must calculate the dollar effect on the user's own plan.

#### Alternative E: Server storage, user accounts, multi-user plans

*   **Pros**: Both spouses can open the same plan on different devices; no data lost to browser cleanup.
*   **Cons**: Holding other people's financial data brings security, privacy and legal obligations, and a server to run and pay for.
*   **Reason for Rejection**: Deferred by author: nothing leaves the browser in version 1. Export and import cover moving a plan.

#### Alternative F: Export file as the only way to resume

*   **Pros**: Simplest storage; one format.
*   **Cons**: Closing the tab without exporting loses the work.
*   **Reason for Rejection**: Rejected by author in favour of autosave in the browser, with export as backup.

#### Alternative G: RESP and Canada Child Benefit planning

*   **Pros**: Covers families with young children.
*   **Cons**: Pre-retirement family finance, not retirement planning; widens scope.
*   **Reason for Rejection**: Rejected by author: children matter only for legacy planning.

#### Alternative H: All provinces (and Quebec) in version 1

*   **Pros**: Usable by all Canadians from the start.
*   **Cons**: 13 tax systems, plus Quebec's separate pension and tax rules, to source, validate and test every year before the engine is proven.
*   **Reason for Rejection**: Rejected by author: start with an Ontario couple. The jurisdiction module leaves room for other provinces.

#### Alternative I: Reuse the prototype code

*   **Pros**: Existing screens, charts and input handling.
*   **Cons**: Mixed units, tax dropped from withdrawals, wrong constants; never executed or tested.
*   **Reason for Rejection**: Rejected by author: clean rewrite; only the context document carries over.

#### Alternative J: Hand-built reference spreadsheet for verifying the yearly loop

*   **Pros**: The most independent check of the whole calculation.
*   **Cons**: Requires the author to build and understand every rule by hand; likely to stall the project.
*   **Reason for Rejection**: Rejected by author. Rule values come from published sources in a config the admin validates. The loop is checked by runtime invariants, a reference plan built by a separate AI session, and a rough comparison with a paid tool. A rule both AI sessions misunderstand can slip through.

#### Alternative K: DB pension commuted value (lump sum instead of pension)

*   **Pros**: Covers a real decision some members face.
*   **Cons**: Depends on plan funding, indexing and health; a comparison reads as advice; adds a new comparison type.
*   **Reason for Rejection**: Rejected by author for version 1.

### Architecture (decided during drafting)

#### Alternative L: Resampled blocks of real Canadian history for returns

*   **Pros**: Real crash patterns, extreme years and inflation-return links.
*   **Cons**: Needs a Canadian dataset that can be redistributed; only about 100 years of data; historical averages don't match FP Canada's forward-looking guidelines.
*   **Reason for Rejection**: Rejected by author in favour of generated returns plus named stress paths.

#### Alternative M: Historical starting-year windows ("if you retired in 1966")

*   **Pros**: Easiest for lay users to understand; no random seed.
*   **Cons**: Same dataset problem; few independent windows for a 35–40-year plan; can't use forward-looking assumptions.
*   **Reason for Rejection**: Rejected by author.

#### Alternative N: Random inflation on each path, or fixed inflation plus a high-inflation stress test

*   **Pros**: Shows inflation risk to unindexed income, such as some DB pensions, and to non-indexed thresholds.
*   **Cons**: More figures to source and test; per-path conversion to today's dollars; harder to explain.
*   **Reason for Rejection**: Rejected by author: one fixed rate. The chance of success does not reflect inflation risk.

#### Alternative O: Placement by an editable priority list, or by a mix entered for each account

*   **Pros**: Lets users describe their real holdings or test their own ideas.
*   **Cons**: Harder screens and testing; drifts toward hand-optimizing. A per-account mix also lets the overall mix drift against the growth-to-safety shift.
*   **Reason for Rejection**: Rejected by author in favour of 2–3 named presets compared with a baseline.

#### Alternative P: Count the overall mix after tax

*   **Pros**: A fair placement comparison: the difference reflects tax only, not hidden extra risk.
*   **Cons**: The mix won't match statements; needs an expected tax rate assumption and an explanation.
*   **Reason for Rejection**: Rejected by author in favour of face value. The design adds an after-tax stock share readout so any risk difference is visible.

#### Alternative Q: One fixed withdrawal order, or a user-defined order

*   **Pros**: Fixed: simplest. User-defined: most flexible.
*   **Cons**: Fixed: nothing to compare, and it handles early retirement with deferred CPP/OAS badly. User-defined: many combinations to test, and odd orders silently cost tax.
*   **Reason for Rejection**: Rejected by author in favour of two named strategies compared on the same markets.

#### Alternative R: User-set points for the growth-to-safety shift

*   **Pros**: Can match the user's real mix.
*   **Cons**: More to explain and test; extreme shapes allowed.
*   **Reason for Rejection**: Rejected by author in favour of 2–3 named shapes. Results describe a named shape, not the user's actual portfolio, and the screens say so.

#### Alternative S: Hand-written warning tips

*   **Pros**: No extra runs; predictable, reviewable wording.
*   **Cons**: Same tips for every plan; a tip can point at an input that does little in this plan.
*   **Reason for Rejection**: Rejected by author in favour of computed nudges on a single fixed-return path.

#### Alternative T: Svelte, or no framework

*   **Pros**: Svelte: less code, simple stores. No framework: no dependency churn.
*   **Cons**: Svelte: AI agents are less familiar with it, and its versions get mixed. No framework: much more hand-written screen code, which is where the prototype's layout and input bugs came from.
*   **Reason for Rejection**: Rejected by author in favour of React.

#### Alternative U: Fixed-point iteration for the yearly tax solve

*   **Pros**: Simple to write; the prototype used it.
*   **Cons**: Not guaranteed to converge near the clawback and credit phase-out cliffs. The prototype used a damped version with 15 iterations and no defined failure behaviour.
*   **Reason for Rejection**: Rejected in design. Bisection always converges here, because after-tax cash rises with the gross withdrawal.

#### Alternative V: Equalize-incomes rule for pension splitting

*   **Pros**: One calculation, no search.
*   **Cons**: Ignores the clawback, age-amount reduction and Health Premium steps, so it can pick a split that costs more tax.
*   **Reason for Rejection**: Rejected in design in favour of trying 0–50% in 5% steps, at the cost of about 11 tax calculations per year per path.

#### Alternative W: Cloudflare Pages / Netlify, or a downloadable file

*   **Pros**: Cloudflare/Netlify: free with a private repository, real security headers, preview builds. Downloadable file: no server at all.
*   **Cons**: Cloudflare/Netlify: a second service account. Downloadable file: no automatic updates, and browsers restrict Web Workers and storage for pages opened from a local file.
*   **Reason for Rejection**: Rejected by author in favour of GitHub Pages with a public repository. Personal data is kept out of the repository instead.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Privacy and security:**
    *   No user data leaves the browser.
    *   The content security policy blocks all network connections from the page.
    *   There is no analytics, no third-party script, and no CDN.
    *   Imported files are validated against the schema before use, and invalid files are rejected with a message.
    *   The public repository never contains real household data.
*   **Correctness:**
    *   Runtime invariants are checked on every run, and a failure blocks results.
    *   Rule values come only from the validated config.
    *   The tax year in use and the validation status are visible on screen.
*   **Performance:**
    *   A full recalculation at the default 1,000 paths takes under 5 seconds on a mid-range laptop, checked by a benchmark in CI on a fixed reference plan. CI hardware differs from a laptop, so CI fails only if the benchmark slows by more than 25% against its recorded baseline.
    *   The screen stays responsive during a run, with progress shown and Cancel available.
*   **Durability:**
    *   Autosave keeps 10 rolling snapshots, and the app asks the browser for persistent storage.
    *   Saved and exported plans carry a schema version, and every older version has a tested migration.
*   **Rollout and rollback:**
    *   Only green builds of `main` deploy.
    *   Rollback is a revert and redeploy.
    *   Because there is no service worker, users get the new version on their next page load.
*   **Accessibility:**
    *   All inputs, including segmented choices, work by keyboard and have visible labels.
    *   Every chart has a table view with the same data.
*   **Legal posture:**
    *   The app gives educational projections, not advice, and all wording is conditional.
    *   The disclaimer appears on first run, in the footer, and in exports.
    *   An FSRA check (O20) happens before any release beyond family.

--------------------------------------------------------------------------------

### Additional Resources

*   `concepts_brief.md`: the brainstorm brief this design implements.
*   `retirement-planner-context.md` (moving to `private/`): the prototype's decision log and defect list, history only.
*   Government of Canada Canadian Retirement Income Calculator: the reference for input vocabulary.
*   FP Canada Projection Assumption Guidelines: return, inflation and life expectancy assumptions.
*   CRA, Service Canada, Ontario Ministry of Finance, FSRA: sources for rule values.

### Future Improvements

*   **Other provinces:** new jurisdiction modules and config files; Quebec needs separate pension and tax handling.
*   **Single people and a general "other income" stream:** pending O16.
*   **Spending categories:** per-category amounts summing to each phase, with per-category survivor percentages.
*   **Random inflation:** per-path inflation linked to returns, to show inflation risk to unindexed income.
*   **Editable placement and growth-to-safety settings:** priority lists and user-set points, once the presets have been tested.
*   **DB commuted value comparison, sync between devices, mobile layout, PDF export.**

--------------------------------------------------------------------------------

## Detailed Implementation Plan

The work is built in stages. Each stage ends with its tests passing in CI and a git tag (`stage-0` … `stage-8`). No screen work starts before stage 2 is green. Agents rewrite whole functions rather than patching them, and never change validated config values, fixtures, or `tests/fixtures/CHECKSUMS.sha256`.

**Stage order:**

| Stage | Content |
|---|---|
| 0 | Repository setup, conventions documents, config schema and 2026 values, fixtures |
| 1 | Tax for one person |
| 2 | Couple engine with fixed returns: accounts, benefits, withdrawal strategies, pension splitting, year solver |
| 3 | Deaths and estate |
| 4 | Market generator, simulation, comparison variants, Worker, benchmark |
| 5 | Store, screens, stale marking, change summary |
| 6 | Warnings and computed tips |
| 7 | Saving, export/import, migrations, sample plan |
| 8 | Testing with the author and two friends |

### Target Files to Create/Modify

#### Repository and build (stage 0)

##### 1. `./.gitignore` (Create)

*   **Type / Scope**: Git configuration.
*   **Proposed Changes**: Ignore `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, and **`private/`**, which holds the original context document and the author's exported plan files.

##### 2. `./private/retirement-planner-context.md` (Move from `./retirement-planner-context.md`)

*   **Type / Scope**: Private history, not committed.
*   **Proposed Changes**: Move the original file here before the first commit so the author's real figures never enter git history.

##### 3. `./package.json` (Create)

*   **Type / Scope**: Build configuration.
*   **Proposed Changes**: Runtime dependencies:
    *   React 18 and React DOM;
    *   Zustand (store);
    *   Zod (schema validation);
    *   Recharts (charts).

    Development dependencies:
    *   Vite with the React plugin;
    *   TypeScript;
    *   Vitest and its coverage tool;
    *   fast-check (property tests);
    *   Playwright (end-to-end tests);
    *   ESLint with TypeScript and React rules;
    *   Prettier.

    Exact versions are pinned. Scripts:
    *   `dev`, `build`, `preview`;
    *   `typecheck` (`tsc --noEmit`);
    *   `lint`;
    *   `test` (Vitest run);
    *   `test:e2e`;
    *   `bench`;
    *   `config:check` (validates all config files against the schema);
    *   `config:compare` (compares two candidate config files);
    *   `fixtures:verify` (checks fixture checksums).

##### 4. `./tsconfig.json` (Create)

*   **Type / Scope**: TypeScript configuration.
*   **Proposed Changes**: Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Path alias `@engine/*` for `src/engine/*`.

##### 5. `./vite.config.ts` (Create)

*   **Type / Scope**: Build configuration.
*   **Proposed Changes**:
    *   Use the React plugin.
    *   Set the `base` path to the GitHub Pages repository name.
    *   Build the Worker as an ES module.
    *   Name output files with content hashes.
    *   Read config JSON from `./config/` at build time.

##### 6. `./vitest.config.ts` (Create)

*   **Type / Scope**: Test configuration.
*   **Proposed Changes**:
    *   Unit, property and reference tests run under Node.
    *   Coverage thresholds: `src/engine/**` 90% of branches, other source 70%.

##### 7. `./playwright.config.ts` (Create)

*   **Type / Scope**: End-to-end test configuration.
*   **Proposed Changes**: Chromium and Firefox, run against `vite preview`.

##### 8. `./eslint.config.js` and `./.prettierrc` (Create)

*   **Type / Scope**: Lint and formatting.
*   **Proposed Changes**:
    *   Lint rule: no numeric literals in `src/engine/**` other than 0, 1, −1 and 100. Rule values must come from the config, and documented exceptions are listed in the rule.
    *   Lint rule: no imports from `src/ui` or `src/state` inside `src/engine`.

##### 9. `./index.html` (Create)

*   **Type / Scope**: App entry page.
*   **Proposed Changes**: The content security policy meta tag:

    ```text
    default-src 'self'; script-src 'self'; style-src 'self'; worker-src 'self';
    img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none';
    base-uri 'self'; form-action 'none'
    ```

    The page also holds a root element and a `<noscript>` message.

##### 10. `./.github/workflows/ci.yml` (Create)

*   **Type / Scope**: CI pipeline.
*   **Proposed Changes**: On every push and pull request, run in order:
    1. install (`npm ci`);
    2. `fixtures:verify`;
    3. `config:check`;
    4. `typecheck`;
    5. `lint`;
    6. `test` with coverage;
    7. `bench`, comparing against `tests/bench/baseline.json`;
    8. `build`;
    9. `test:e2e`.

    The pipeline fails on any error.

##### 11. `./.github/workflows/deploy.yml` (Create)

*   **Type / Scope**: Deployment.
*   **Proposed Changes**: On push to `main`, after CI passes, build and deploy `dist/` to GitHub Pages using the official Pages actions.

##### 12. `./LICENSE` (Create)

*   **Type / Scope**: Licence.
*   **Proposed Changes**: MIT licence (a mechanical default for a free public tool; the author may choose another before the first public commit).

##### 13. `./AGENTS.md` and `./CLAUDE.md` (Create)

*   **Type / Scope**: Instructions for AI coding agents. `CLAUDE.md` contains one line pointing to `AGENTS.md`.
*   **Proposed Changes**: Rules:
    *   **Values:** never supply a rule value from memory; every value comes from `config/`.
    *   **Protected files:** never edit validated config entries, `tests/fixtures/**`, or the checksum file.
    *   **Code changes:** rewrite whole functions rather than patching them.
    *   **Units:** keep today's-dollar and future-dollar types separate.
    *   **Engine boundary:** no screen code in `src/engine`.
    *   **Personal data:** never put real household data in the repository.
    *   **Wording:** all user-facing text stays conditional ("under these assumptions…").
    *   **Before finishing:** run `npm run typecheck && npm run lint && npm test` before declaring work done.
    *   **Stages:** follow the stage order and tag each green stage.

##### 14. `./README.md` (Create)

*   **Type / Scope**: Project documentation.
*   **Proposed Changes**:
    *   what the app is;
    *   the disclaimer;
    *   how to run it locally;
    *   how tests work;
    *   how the config is updated each year (link to the admin guide);
    *   the rule that no personal data is committed.

#### Documentation (stage 0)

##### 15. `./docs/designs/retirement-planner.md` (Create)

*   **Type / Scope**: The finalized version of this design document.
*   **Proposed Changes**: Copied from `design_draft.md` at finalization.

##### 16. `./docs/units-and-conventions.md` (Create)

*   **Type / Scope**: Normative reference for engine authors.
*   **Proposed Changes**:
    *   the today's-dollars and future-dollars rule;
    *   valuation date;
    *   inflation factor;
    *   row and age conventions;
    *   timing within a year;
    *   death timing;
    *   indexing rules.

    Worked examples of converting values between today's and future dollars.

##### 17. `./docs/history/decision-log.md` and `./docs/history/prototype-postmortem.md` (Create)

*   **Type / Scope**: Project history.
*   **Proposed Changes**:
    *   The decision log comes from the context document §§1–3 and 5–7, with personal figures removed.
    *   The post-mortem comes from §§9 and 11: what went wrong and why.

    Both carry a note that the prototype's §4 calculations are superseded by this design.

##### 18. `./docs/admin-config-guide.md` (Create)

*   **Type / Scope**: Admin procedure.
*   **Proposed Changes**: The yearly (January) and quarterly (OAS) update steps:
    1. Two separate agent sessions each fetch every value from the source list into a candidate file.
    2. Run `config:compare` on the two candidates.
    3. The admin resolves each disagreement against the source page.
    4. The admin sets each entry's validation status, name and date.
    5. Run `config:check`.
    6. Commit.

##### 19. `./config/SOURCES.md` (Create)

*   **Type / Scope**: Source list.
*   **Proposed Changes**: For every config key, the official page URL and where on the page the value appears. This is what the fetching sessions use.

#### Config (stage 0)

##### 20. `./config/2026/federal.json` (Create)

*   **Type / Scope**: Rule values.
*   **Proposed Changes**:
    *   federal brackets and rates;
    *   basic personal amount;
    *   age amount and its reduction threshold and rate;
    *   pension income amount;
    *   eligible dividend gross-up and credit rate;
    *   capital gains inclusion rate;
    *   OAS amount at 65, deferral rate, 75+ increase, recovery tax threshold and rate;
    *   CPP adjustment rates before and after 65, maximum pension, survivor benefit rules and cap, death benefit;
    *   RRIF minimum factors and the formula for ages below 71;
    *   the latest RRIF conversion age;
    *   TFSA yearly limit;
    *   pension splitting rules (maximum share, eligibility ages).

    Each entry follows the schema in file 25.

##### 21. `./config/2026/ontario.json` (Create)

*   **Type / Scope**: Rule values.
*   **Proposed Changes**:
    *   Ontario brackets and rates;
    *   basic personal amount;
    *   age amount;
    *   pension credit;
    *   dividend credit;
    *   surtax thresholds and rates;
    *   Health Premium schedule;
    *   Tax Reduction amounts;
    *   probate threshold and rate;
    *   LIF minimum and maximum rules and the 50% unlock rule.

##### 22. `./config/2026/market.json` (Create)

*   **Type / Scope**: Market assumptions.
*   **Proposed Changes**:
    *   **Expected returns and inflation:** from FP Canada's guidelines.
    *   **Volatility and correlations:** source per O22, recorded as unvalidated until resolved.
    *   **Return split by income type:** for each asset class.
    *   **Default fees:** for each asset class.
    *   **Return override limit:** for each asset class, the expected return above which the "optimistic returns" warning fires, with its source and margin.
    *   **Canadian/global split** of the stock share.
    *   **Stress paths:** 2–3, each a fixed sequence of yearly returns by asset class with a name and a description.

##### 23. `./config/2026/planning.json` (Create)

*   **Type / Scope**: Planning defaults and presets.
*   **Proposed Changes**:
    *   life expectancy targets by sex (FP Canada, 25% survival);
    *   survivor spending percentage (70%, with the square-root scale source);
    *   placement presets (fill order per asset class);
    *   growth-to-safety shapes (stock share by years from retirement);
    *   the pension split search step (5%);
    *   the default number of paths and the choices offered (250 / 1,000 / 5,000);
    *   the solver tolerance ($1) and step limit (60).

##### 24. `./config/2026/warnings.json` (Create)

*   **Type / Scope**: Warning registry.
*   **Proposed Changes**: The 9 warnings. Each entry has:
    *   id;
    *   basis (representative path, share of paths, or both);
    *   window;
    *   scope (per spouse or per household);
    *   unit;
    *   trigger levels;
    *   severity;
    *   explanation text;
    *   related input paths, each with its nudge step.

#### Engine (stages 1–4, 6)

##### 25. `./src/engine/config/schema.ts` and `./src/engine/config/load.ts` (Create)

*   **Type / Scope**: Config schema and loader.
*   **Proposed Changes**:
    *   The schema is a Zod definition of an entry: `{ value, unit: 'CAD/yr' | 'CAD/mo' | 'rate' | 'age' | …, taxYear, indexed: boolean, source: { url, locator }, fetchedOn, validation: { status: 'validated' | 'unvalidated', by?, on? } }`, plus schemas for each file.
    *   `loadConfig(taxYear): Config` validates every file and returns typed values with entry metadata.
    *   `configStatus(): { taxYear, unvalidatedKeys[], outOfDate: boolean }` feeds the on-screen notice.
    *   `indexValue(entry, yearsFromStart, inflation)` grows indexed values and leaves non-indexed ones fixed.

##### 26. `./src/engine/units.ts` (Create)

*   **Type / Scope**: Unit types.
*   **Proposed Changes**: Branded types `TodayDollars` and `FutureDollars`. The only conversion functions are `toFuture(amount: TodayDollars, yearIndex): FutureDollars` and `toToday(amount: FutureDollars, yearIndex): TodayDollars`. Arithmetic helpers accept only matching types.

##### 27. `./src/engine/types.ts` (Create)

*   **Type / Scope**: Shared data types.
*   **Proposed Changes**:
    *   **`PlanInputs`:**
        *   household (two spouses: birth year, sex at birth, retirement year, life expectancy target, CPP estimate at 65, CPP and OAS start ages, years of Canadian residence, working-years marginal rate);
        *   accounts (each with owner, type, balance, contributions, conversion age, original cost for non-registered positions, TFSA starting room);
        *   DB pensions;
        *   spending phases (amount, start and end ages);
        *   survivor percentage;
        *   legacy goal;
        *   home value (optional);
        *   placement preset id, shape id, strategy id and target incomes;
        *   optional expected-return and fee overrides for each asset class;
        *   seed;
        *   number of paths;
        *   plan start year.
    *   **`YearRow`:** every per-year value, by spouse and account, in future dollars.
    *   **`PathSummary`:** success flag, first shortfall year, lifetime tax, after-tax legacy, clawback years, and the per-warning facts needed by the warning checks.
    *   **`Result`:** aggregates, representative paths, stress paths, comparisons, warnings with tips, config status, input hash, engine version, seed.

##### 28. `./src/engine/jurisdiction/types.ts`, `./federal.ts`, `./ontario.ts` (Create)

*   **Type / Scope**: Tax and rules by government.
*   **Proposed Changes**:
    *   The `Jurisdiction` interface: `provincialTax(income: TaxableIncome, age, cfg): FutureDollars`, `probate(estateAssets, cfg)`, `lifLimits(balance, age, cfg): { min, max }`, `unlockRule(cfg)`.
    *   `federal.ts` computes federal tax with credits and the OAS recovery tax.
    *   `ontario.ts` implements `Jurisdiction` for Ontario: brackets, credits, surtax, Health Premium, Tax Reduction, probate and LIF rules.

##### 29. `./src/engine/tax/personalTax.ts` and `./src/engine/tax/split.ts` (Create)

*   **Type / Scope**: Per-person tax and pension splitting.
*   **Proposed Changes**:
    *   `personalTax(income: TaxableIncome, age, jurisdiction, cfg): TaxBreakdown`. `TaxableIncome` separates pension-eligible income, other ordinary income, eligible dividends, foreign dividends and taxable capital gains. It returns federal tax, provincial tax, clawback and total.
    *   `bestSplit(spouseA, spouseB, cfg): { fraction, householdTax }` tries 0–50% in configured steps, respecting eligibility rules.

##### 30. `./src/engine/benefits/cpp.ts`, `./oas.ts`, `./db.ts`, `./survivor.ts` (Create)

*   **Type / Scope**: Benefit income.
*   **Proposed Changes**:
    *   `cppAt(estimateAt65, startAge, cfg)`;
    *   `oasAt(residenceYears, startAge, age, cfg)`, including the 75+ increase;
    *   `dbPayment(db, age, yearIndex, alive)`: lifetime amount, bridge amount until its end age, indexing;
    *   `survivorBenefits(deceased, survivor, cfg)`: the CPP survivor benefit capped at the combined maximum, the DB survivor share, and the death benefit.

##### 31. `./src/engine/accounts/rrspRrif.ts`, `./liraLif.ts`, `./tfsa.ts`, `./nonRegistered.ts` (Create)

*   **Type / Scope**: Account rules.
*   **Proposed Changes**: Pure functions that take an account state and return a new state:
    *   **RRSP/RRIF:** conversion; minimum from the CRA factor at the start-of-year age.
    *   **LIRA/LIF:** conversion, minimum and maximum from the jurisdiction, optional unlock.
    *   **TFSA:** room tracking and contributions within room.
    *   **Non-registered:** pooled positions per asset class with original cost; sales return realized gains; yearly income split by type.

##### 32. `./src/engine/market/prng.ts`, `./generator.ts`, `./stress.ts` (Create)

*   **Type / Scope**: Market paths.
*   **Proposed Changes**:
    *   A seeded xoshiro128** generator.
    *   `generatePaths(seed, nPaths, nYears, cfg): Float64Array` produces correlated lognormal yearly returns for the three asset classes, using a Cholesky factor of the correlation matrix.
    *   `stressPaths(cfg)` returns the named fixed sequences.

##### 33. `./src/engine/invest/glide.ts`, `./placement.ts`, `./rebalance.ts` (Create)

*   **Type / Scope**: Growth-to-safety shift and placement.
*   **Proposed Changes**:
    *   `stockShare(shapeId, yearsFromRetirement, cfg)`.
    *   `targetHoldings(accounts, overallMix, presetId, cfg)` fills accounts by the preset's order at face value. The "same mix everywhere" baseline applies the overall mix to each account.
    *   `rebalance(accounts, targets)` returns new holdings and the realized gains from non-registered sales.
    *   `afterTaxStockShare(accounts, avgWithdrawalRate)` produces the readout.

##### 34. `./src/engine/withdraw/registeredLast.ts`, `./fillBrackets.ts`, `./strategy.ts` (Create)

*   **Type / Scope**: Withdrawal strategies.
*   **Proposed Changes**:
    *   **`WithdrawalStrategy` interface:** `allocate(extraGross, accounts, spouses, minimums, targets): Draws`.
    *   **"Registered last":** non-registered, then RRSP/RRIF and LIF in proportion to their balances (LIF capped at its maximum), then TFSA.
    *   **"Fill lower brackets first":** each spouse draws from RRSP/RRIF, then LIF, up to their target taxable income (converted to future dollars), then the "registered last" order for the rest.
    *   **`placeSurplus(surplus, accounts)`:** surplus goes to the TFSA within room, then non-registered.

##### 35. `./src/engine/solver/bisect.ts` and `./src/engine/solver/yearSolve.ts` (Create)

*   **Type / Scope**: The yearly calculation.
*   **Proposed Changes**:
    *   `bisect(f, lo, hi, tol, maxSteps): { x, converged }`.
    *   `solveYear(state, marketYear, inputs, cfg, variant): { nextState, row }` implements the ten steps in the Technical Plan in that order. Non-convergence or an invariant failure throws `EngineIntegrityError` with the year, path and failed check.

##### 36. `./src/engine/project/runPath.ts` and `./src/engine/project/death.ts` (Create)

*   **Type / Scope**: One full plan on one market path.
*   **Proposed Changes**:
    *   `runPath(inputs, cfg, marketPath, variant, detail: 'full' | 'summary')` loops `solveYear` from the start year to the second death and returns rows (if full) and a `PathSummary`.
    *   `death.ts` holds the first-death transfer, `finalReturn(state, cfg)` (RRIF income inclusion, deemed sale of non-registered positions, tax), and `estate(state, cfg)` (probate, home, after-tax legacy).

##### 37. `./src/engine/simulate/variants.ts` and `./src/engine/simulate/simulate.ts` (Create)

*   **Type / Scope**: Paths × variants.
*   **Proposed Changes**:
    *   `variants(inputs)` returns the user's plan plus three comparison variants: placement baseline, "Steady" shape, other strategy.
    *   `simulate(inputs, cfg, onProgress, isCancelled)`:
        *   generates paths once and runs every variant on every path (summary detail);
        *   runs the stress paths and a fixed-return path for each variant;
        *   selects the representative paths and reruns them in full detail;
        *   reports progress every 50 paths and checks for cancellation.

##### 38. `./src/engine/results/aggregate.ts`, `./compare.ts`, `./representative.ts` (Create)

*   **Type / Scope**: Result summaries.
*   **Proposed Changes**:
    *   **Aggregates:** chance of success, chance of meeting the legacy goal, and 50th and 10th percentiles of legacy and lifetime tax.
    *   **`compare(userSummaries, variantSummaries)`:** differences per path in lifetime tax and after-tax money left, summarized at the 50th and 10th percentiles. A flag is set when the two differences have opposite signs.
    *   **Representative paths:** the paths nearest the 50th and 10th percentiles of legacy.

##### 39. `./src/engine/invariants.ts` (Create)

*   **Type / Scope**: Runtime checks.
*   **Proposed Changes**: `checkYear(prev, next, row, cfg)` checks after-tax cash = need or shortfall recorded, conservation of money, non-negative balances and original cost, RRIF/LIF minimum and maximum, and TFSA room. It is called by `solveYear` every year.

##### 40. `./src/engine/warnings/evaluate.ts` and `./src/engine/warnings/nudges.ts` (Create)

*   **Type / Scope**: Warnings and tips (stage 6).
*   **Proposed Changes**:
    *   `evaluateWarnings(result, registry)` runs each registry entry's check, implemented as a named pure function keyed by warning id, and collapses repeated years.
    *   `computeTips(inputs, cfg, firedWarnings)`:
        *   for each fired warning and each related input, runs the fixed-return path with the input nudged up and down;
        *   measures the change in the warning's metric;
        *   returns the top three inputs with effect sizes, and conditional wording from templates.

##### 41. `./src/engine/hash.ts` and `./src/engine/index.ts` (Create)

*   **Type / Scope**: Input hash and public engine interface.
*   **Proposed Changes**:
    *   `inputHash(inputs)` serializes the inputs with stable key order and computes SHA-256 via Web Crypto (a small JS implementation in Node tests).
    *   `index.ts` exports `runPlan(inputs, cfg, hooks): Result`, `loadConfig` and `configStatus` only.

#### Worker (stage 4)

##### 42. `./src/worker/engine.worker.ts` and `./src/worker/client.ts` (Create)

*   **Type / Scope**: Background calculation.
*   **Proposed Changes**: The Worker receives `{ type: 'run', inputs }` and posts `progress`, `result` or `error` (including `EngineIntegrityError` details). Cancellation uses a shared flag checked every 50 paths. The client exposes `run(inputs): { promise, cancel }`.

#### State and persistence (stages 5, 7)

##### 43. `./src/state/store.ts` (Create)

*   **Type / Scope**: The plan store.
*   **Proposed Changes**:
    *   Zustand store holding `inputs`, `result`, `previousResult`, `status` (idle / running / error) and `progress`.
    *   Actions: `setInput(path, value)`, `recalculate()`, `cancel()`, `loadPlan(inputs)`, `newSeed()`.
    *   Selector `isStale = result?.inputHash !== inputHash(inputs)`.

##### 44. `./src/state/changeSummary.ts` (Create)

*   **Type / Scope**: The after-run diff.
*   **Proposed Changes**: `changeSummary(previous, current)` lists changes in chance of success, after-tax legacy, lifetime tax, clawback years, first shortfall year, and warnings added or cleared.

##### 45. `./src/state/persistence/planSchema.ts`, `./migrations.ts`, `./storage.ts`, `./exportImport.ts` (Create)

*   **Type / Scope**: Saving and loading.
*   **Proposed Changes**:
    *   **`planSchema.ts`:** Zod schema for the saved envelope `{ schemaVersion, inputs, meta: { savedAt, appVersion } }`.
    *   **`migrations.ts`:** an ordered list of pure functions from version *n* to *n + 1*.
    *   **`storage.ts`:**
        *   autosaves to localStorage on input change (debounced 1 second);
        *   keeps 10 rolling snapshots;
        *   calls `navigator.storage.persist()`;
        *   handles a full or unavailable store by showing a prompt to export.
    *   **`exportImport.ts`:**
        *   export downloads a JSON file with the disclaimer in `meta`;
        *   import validates the file, migrates it, keeps the original until migration succeeds, and refuses newer versions with a message.

##### 46. `./src/state/samplePlan.ts` (Create)

*   **Type / Scope**: Made-up sample couple.
*   **Proposed Changes**: A fictional Ontario couple with an RRSP, TFSA, non-registered account, one DB pension and one LIRA. It is used by "Load sample plan" and the end-to-end tests.

#### Screens (stage 5, warnings in 6)

##### 47. `./src/main.tsx`, `./src/ui/App.tsx`, `./src/ui/styles.css` (Create)

*   **Type / Scope**: App shell.
*   **Proposed Changes**:
    *   Mount the app.
    *   Tab bar for Household, Spending, Investing and Withdrawals, with the Results panel always visible.
    *   Header shows the tax year and the config status notice.
    *   Footer shows the disclaimer.
    *   First-run disclaimer dialog.

##### 48. `./src/ui/tabs/HouseholdTab.tsx`, `./SpendingTab.tsx`, `./InvestingTab.tsx`, `./WithdrawalsTab.tsx` (Create)

*   **Type / Scope**: Input screens.
*   **Proposed Changes**:
    *   **Household:** spouses, accounts, DB pensions, CPP estimates and residence.
    *   **Spending:** three phases, survivor percentage, legacy goal, home value. Each phase shows the estimated gross amount from the last run.
    *   **Investing:**
        *   shape and placement preset choices, each with an explanation;
        *   fees and optional expected-return overrides for each asset class, each showing the config default;
        *   the placement and shape comparisons (lifetime tax paired with money left, typical and bad cases, fixed-return example, after-tax stock share readout);
        *   a note that results describe the named shape, not the user's actual holdings.
    *   **Withdrawals:**
        *   strategy choice and target incomes per spouse, with reference thresholds;
        *   RRIF and LIF conversion ages and the unlock choice;
        *   CPP and OAS start ages;
        *   the strategy comparison.

##### 49. `./src/ui/results/ResultsPanel.tsx`, `./RecalcButton.tsx`, `./StaleOverlay.tsx`, `./ChangeSummary.tsx`, `./WarningsList.tsx`, `./ConfigNotice.tsx`, `./IntegrityError.tsx` (Create)

*   **Type / Scope**: Results and status.
*   **Proposed Changes**:
    *   **Headline numbers:** chance of success, legacy (typical and bad), lifetime tax.
    *   **Recalculate:** button with progress and Cancel.
    *   **Stale state:** results dim with a message when the inputs no longer match.
    *   **After each run:** the change summary.
    *   **Warnings:** each with explanation, tips and links that focus the related input field.
    *   **Notices:** a config notice when values are unvalidated or out of date, and an integrity error screen.

##### 50. `./src/ui/charts/BalancesChart.tsx`, `./IncomeChart.tsx`, `./TaxChart.tsx`, `./EstateWaterfall.tsx`, `./YearTable.tsx` (Create)

*   **Type / Scope**: Charts in today's dollars.
*   **Proposed Changes**: Charts for the selected representative or stress path:
    *   balances by account over time;
    *   income by source;
    *   tax by spouse, with clawback;
    *   the estate step-down from assets to after-tax legacy.

    Every chart has a table view, and labels state "today's dollars".

##### 51. `./src/ui/inputs/Field.tsx`, `./CurrencyInput.tsx`, `./PercentInput.tsx`, `./AgeInput.tsx`, `./SegmentedChoice.tsx` (Create)

*   **Type / Scope**: Input controls.
*   **Proposed Changes**:
    *   **Layout:** each label sits above its input, with a glossary tooltip.
    *   **Currency fields:** comma formatting that preserves the cursor position.
    *   **Segmented choices:** built from real radio inputs so they work by keyboard.
    *   **Validation:** inline messages that don't shift the layout.

##### 52. `./src/ui/content/glossary.ts` and `./src/ui/content/explanations.ts` (Create)

*   **Type / Scope**: Plain-English text.
*   **Proposed Changes**:
    *   **`glossary.ts`:** one glossary that feeds all tooltips (RRIF, LIF, original cost, deemed sale, probate, clawback, sequence risk, percentile, asset location versus allocation, and so on).
    *   **`explanations.ts`:** an explanation for each preset, shape and strategy, and "why this matters" text for each comparison, all conditional in wording.

#### Tests and fixtures (every stage)

##### 53. `./tests/fixtures/tax-cases.json` (Create, stage 0)

*   **Type / Scope**: External tax answers.
*   **Proposed Changes**: At least 20 cases, each with inputs (age, income by type) and the federal and Ontario tax from a named outside calculator, plus the date it was checked. The cases include:
    *   the death-year return;
    *   a clawback case;
    *   a high-dividend case;
    *   a pension-split pair.

##### 54. `./tests/fixtures/reference-plan/inputs.json` and `./tests/fixtures/reference-plan/expected-rows.csv` (Create, stage 2–3)

*   **Type / Scope**: Independent reference plan.
*   **Proposed Changes**: A made-up couple with fixed returns. A separate AI session builds the expected rows from `docs/units-and-conventions.md`, this design and the config, without seeing any engine code. The engine must match every row within $1.

##### 55. `./tests/fixtures/saved-plans/v1.json` (Create, stage 7)

*   **Type / Scope**: Frozen saved plan.
*   **Proposed Changes**: A version-1 export, used to test every future migration.

##### 56. `./tests/fixtures/CHECKSUMS.sha256` and `./tools/verifyFixtures.ts` (Create)

*   **Type / Scope**: Fixture protection.
*   **Proposed Changes**: Checksums of every fixture file. CI fails if a fixture changes without the checksum file changing, and changes to the checksum file are reviewed by the author.

##### 57. `./tools/configCheck.ts` and `./tools/configCompare.ts` (Create)

*   **Type / Scope**: Admin tools.
*   **Proposed Changes**:
    *   `configCheck` validates all config files against the schema and lists unvalidated entries.
    *   `configCompare a.json b.json` lists every key whose value, unit, year or indexed flag differs between two candidate files.

##### 58. `./tests/unit/**/*.test.ts` (Create, stages 1–7)

*   **Type / Scope**: Unit tests, one file per engine module and per state module.
*   **Proposed Changes**:
    *   **Tax:** every case in `tax-cases.json` matches within $1. Split search finds the minimum on hand-checked pairs. Eligibility rules hold (no RRIF splitting under 65, DB splitting at any age).
    *   **Benefits:** CPP at 60/65/70, OAS deferral and 75+ increase, survivor cap, DB bridge stop.
    *   **Accounts:** RRIF minimum against the config table, LIF min/max, TFSA room, original-cost tracking on partial sales.
    *   **Solver:** bisection converges for every tax case, shortfall is recorded when funds run out, surplus goes to the TFSA within room.
    *   **Death:** rollovers at original cost, final-return inclusion, probate.
    *   **Persistence:** round trip, migration from the frozen v1 file, refusal of a newer version.

##### 59. `./tests/property/*.test.ts` (Create, stages 2–4)

*   **Type / Scope**: Property tests with fast-check.
*   **Proposed Changes**:
    *   the same seed gives the same result;
    *   higher spending never raises the chance of success;
    *   zero volatility makes every path equal the fixed-return run;
    *   with zero returns and positive withdrawals, balances never rise;
    *   invariants hold on random valid inputs.

##### 60. `./tests/reference/referencePlan.test.ts` (Create, stage 3)

*   **Type / Scope**: Reference plan test.
*   **Proposed Changes**: Runs the reference inputs at fixed returns and compares every row and column to `expected-rows.csv` within $1.

##### 61. `./tests/bench/recalc.bench.ts` and `./tests/bench/baseline.json` (Create, stage 4)

*   **Type / Scope**: Performance benchmark.
*   **Proposed Changes**: Runs the sample plan at 1,000 paths with all variants and tips. It records the time and fails if it is more than 25% slower than the baseline.

##### 62. `./tests/e2e/*.spec.ts` (Create, stages 5–7)

*   **Type / Scope**: End-to-end tests with Playwright, one per CUJ.
*   **Proposed Changes**:
    *   **First plan:** with the sample plan, results appear.
    *   **Change one tab, see the others:** editing a Withdrawals input marks every tab stale, and after Recalculate the change summary appears.
    *   **Placement comparison:** shows both numbers.
    *   **First death:** the survivor rows appear.
    *   **Resume:** export, clear storage, import restores the inputs.
    *   **Config notice:** appears with an unvalidated test config.
    *   **No network:** no network request is made during a full session.

##### 62a. `./tests/fixtures/paid-tool-comparison.md` (Create, before stage 8)

*   **Type / Scope**: Manual check record.
*   **Proposed Changes**: The record of the paid-tool comparison. It holds:
    *   the tool name and version, and the date of the run;
    *   the sample couple's inputs as entered in that tool;
    *   the tool's headline results (chance of success, legacy, lifetime tax where shown) next to this app's results at fixed returns;
    *   for each difference, the assumption that explains it (for example, a different tax treatment or withdrawal order), or "unexplained — investigated in issue X".

    The record is covered by the fixture checksums.

#### Existing files

##### 63. `./concepts_brief.md` and `./design_draft.md` (Keep)

*   **Type / Scope**: Planning documents.
*   **Proposed Changes**: Kept at the repository root until the design is finalized. `design_draft.md` is then deleted after its contents are saved to `docs/designs/retirement-planner.md`. Neither contains personal figures.

### Verification Plan

*   **Compilation/Build**: `npm run typecheck` and `npm run build` succeed.
*   **Unit Tests**: `npm test` passes, including every tax fixture, the reference plan and the property tests.
*   **Static Analysis & Linting**: `npm run lint` passes, including the no-numeric-literals rule in `src/engine/**` and the engine-boundary rule. `npm run config:check` and `npm run fixtures:verify` pass.
*   **Test Coverage Requirement**: 90% branch coverage for `src/engine/**`, 70% elsewhere.
*   **E2E/Integration**: `npm run test:e2e` passes in Chromium and Firefox, including the no-network test.
*   **Performance**: `npm run bench` stays within 25% of baseline. A manual check on a mid-range laptop confirms the full recalculation takes under 5 seconds before stage 8.
*   **Paid-tool comparison (manual, before stage 8)**: the author or an agent enters the sample couple into one paid planning tool. The results and an explanation of each difference go into `tests/fixtures/paid-tool-comparison.md`. Differences that the tools' different assumptions don't explain are investigated before stage 8.
*   **Stage 8 (people)**: the author and two friends each complete a full plan, describe a cross-tab effect without help, and explain one tax-efficient investing idea from their own numbers.
