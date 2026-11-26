# Canadian Retirement Planner (Ontario Couple, Version 1)

*   **Author:** weaponex
*   **Status:** Proposed
*   **Date:** 2026-11-17
*   **Last revised:** 2026-11-26 (the Assets amendment: Stage A, decided with the author; see [Assets](#assets-stage-a) in each section)
*   **Reviews:** one folder per date under [docs/reviews/](../reviews/). Findings still open are in [Known gaps from review](#known-gaps-from-review), which explains their id prefixes. Decisions the author made while the engine was built are recorded in [docs/history/build-decisions.md](../history/build-decisions.md); this document states the rules that resulted.
*   **Brief:** [concepts_brief.md](../../concepts_brief.md). Open questions O1–O21 come from it; [Open Questions](#open-questions) lists the rest.

## Overview

A free retirement planner that runs entirely in a desktop web browser. It helps a Canadian couple see how three groups of decisions affect each other:

1.  **Spending:** what the couple plans to spend each month, after tax, by category, in three phases of retirement (active years, slower years, later years). What the survivor spends after the first death and how much the couple wants to leave to their children after tax are set on the Estate tab.
2.  **Savings and investing with taxes in mind:** the couple's accounts and workplace pensions, their overall investment mix, which kinds of investments to hold in which accounts (RRSP/RRIF, TFSA, non-registered, workplace pension accounts), and whether to shift toward safer investments as retirement goes on.
3.  **Withdrawals:** which accounts to draw from and in what order, when each spouse starts CPP and OAS, RRIF minimum withdrawals, pension income splitting, the OAS clawback, and the tax due at each death.

The app has six input tabs (Household, Savings, Assets, Spending, Withdrawals, Estate) and a Results tab, all over one shared plan, plus a Settings screen where every tax and benefit rule value can be changed from its default. The user can change anything on any tab, and the whole plan recalculates as they edit. Each asset class earns the same compound return every year (FP Canada's long-run estimates by default, editable), so every result can be traced and repeated. The app warns when something is at or near a known threshold and says which inputs affect it. For two choices, account placement and the withdrawal strategy, it shows what the choice is worth: lifetime tax paired with the after-tax legacy, against a same-mix-everywhere baseline for placement, and for all three strategies side by side.

The tool shows the effect of choices the user makes and explains why they differ. It does not give personal advice and never moves money. The app's security policy blocks it from sending network requests, so what the user enters stays in their browser; [Hosting](#hosting-and-repository-author) states the limits of that protection.

Version 1 is for the author and two friends, modelled as Ontario couples. The long-term intent is to release it free to all Canadians.

**Assets (Stage A, 2026-11-26).** A sixth input tab, **Assets**, holds what the couple owns besides savings accounts and workplace pensions: the home, cottages or second homes, rental properties, vehicles, and a generic "other asset". Each asset changes in value every year, may cost money to keep, may carry a mortgage, may earn rent, and may be bought or sold in a chosen year. The plan counts all of that in each year's cash, in each spouse's tax, and in the estate at the second death.

The home moves from the Estate tab to Assets and stays free of capital gains tax as the couple's principal residence. Today the home is one number that grows with inflation and counts only in the estate.

Building this also gives the years before the first retirement a real cash flow (AD15): pay after tax, living costs while working, asset costs and the account savings the user sets. Today the plan assumes pay covers everything until retirement.

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

### What the plan leaves out today (Assets, Stage A)

For many Ontario couples, the largest things they own are not in an RRSP or a TFSA. The plan currently ignores them, or handles them wrongly:

*   **Property tied up in the estate.** The home is one value counted at the second death. A cottage, a rental or anything else the couple owns can't be entered at all, so the after-tax legacy leaves it out. A cottage bought for $120,000 and worth $800,000 at the second death carries a capital gains tax bill of roughly $150,000, which the plan never shows.
*   **Downsizing, the most common late-life money move.** Selling the family home at 75 and buying a smaller one frees hundreds of thousands of dollars for spending or the TFSA. The design lists "selling a home" as a non-goal, so the plan can't show it.
*   **Rental income.** A rental's net rent pays part of each year's spending and is taxed as income. It can also push a spouse into the OAS clawback. None of this is modelled.
*   **Mortgages in retirement.** A mortgage payment is a fixed amount, not a cost that rises with inflation. The only place to enter it today is a Spending category, which grows with inflation, shrinks in the slower phases and drops to the survivor percentage, all of which is wrong for a mortgage.
*   **Working years.** Before the first retirement, the plan has no spending need and no cash flow. It can't pay a mortgage or a purchase, or receive rent, and it can't tell whether a still-working couple is saving more or less than the yearly amounts they entered.

The effect: for a couple with a cottage, a rental or a mortgage, both headline results are wrong. Their spending-covered result and their after-tax legacy can't be trusted, which is exactly what the tool is meant to get right.

## Goals

### Product goals

*   **G1. Linked planning.** The user can change inputs on any of the six input tabs (Assets added by Stage A) and see the effect everywhere, without pressing a button: the plan recalculates as they edit. The Results tab lists what the last change did (for example "first shortfall year 2041 → none; after-tax legacy −$62k; clawback years 3 → 7").
*   **G2. Tax-aware results for an Ontario couple.** Each year of the plan computes federal and Ontario tax for each spouse separately, including credits, the OAS clawback, and pension income splitting, based on actual taxable income by account type.
*   **G3. Both deaths modelled.** Each spouse has an editable life expectancy target. The plan handles the first death (rollovers, survivor benefits, single-filer tax, survivor spending) and the second death (final-return tax on the RRIF, investments taxed as if sold, Ontario probate) and reports the after-tax legacy.
*   **G4. Steady, traceable returns.** Each asset class earns one fixed compound return every year, from FP Canada's guidelines by default, and the user can override it. The same inputs and config always give the same results. Year-to-year market swings are not modelled in version 1 (see [Risks](#risks--mitigations)).
*   **G5. Show what placement and the withdrawal strategy are worth.** For placement, the app shows lifetime tax paired with the after-tax legacy against a same-mix-everywhere baseline at the same returns. For withdrawals, it shows those two numbers for all three strategies side by side, and a year-by-year chart of where the money comes from under the selected one (see [Result definitions](#result-definitions)).
*   **G6. Threshold warnings.** On every result, the app shows warnings when a defined threshold is near or crossed, each with the inputs that affect it. The list starts with 8 warnings; the author adds more after tester sessions.
*   **G7. Private, with a file to keep.** The app's page cannot send network requests, so plan data is not sent anywhere (limits in [Hosting](#hosting-and-repository-author)). The plan saves automatically in the browser, but browsers can clear that storage, so the export file is the copy to keep. Exports can be imported again, including into a newer version of the app. Export files are not encrypted.
*   **G8. Defined-benefit pensions.** Either spouse can enter a DB pension from their pension statement, and the engine includes it in tax, splitting and survivor calculations.
*   **G11. Assets in the plan.** The user can enter a home, cottages or second homes, rentals, vehicles and "other assets". Each asset's value, costs, mortgage, rent, purchase and sale flow into the right year's cash, the owner's tax, and the estate.
*   **G12. Correct tax on assets.**
    *   Net rent is taxed as the owner's income; a rental loss reduces their other income (AD19).
    *   A sale, and the deemed sale at the second death, are taxed as capital gains on the original cost. The home is exempt as the principal residence (AD20), and a loss on personal-use property counts as zero.
    *   Ontario probate deducts only mortgages on real property (AD22).
    *   Every tax figure comes from the config or from a cited rule.
*   **G13. Downsizing and purchases.** A sale and a purchase in the same year model a downsize; sale money pays that year's needs first, then is saved (AD16). A purchase always happens, and any money missing shows as a labelled purchase shortfall (AD17).
*   **G14. A cash flow in the working years** (when living costs while working are entered; A8). A short working year counts in Goal 1 (A9). Each year before the first retirement computes:
    *   pay after tax;
    *   less living costs while working;
    *   less asset costs and mortgage payments;
    *   less the yearly account savings the user set;
    *   plus net rent and sale money.

    What's left is saved to the TFSA, then non-registered savings; a gap is drawn from non-registered savings, then the TFSA (AD15).
*   **G15. Saved plans keep working.** A version 1 plan file imports into version 2 with identical results; its home value becomes a home asset (AD11).

### Correctness goals

*   **G9. Sourced rule values, editable by the user.** Every default rule value lives in a config file, one per tax year, with its unit, inflation indexing, source link, date fetched and validation status. The app shows which tax year its defaults come from and flags any unvalidated default. The user can change any rule value in Settings; a changed value is marked as changed, shows the default next to it, and is saved with the plan. Refreshing the defaults every year is optional, not a required yearly task.
*   **G10. Verified engine.** Tax results match an outside tax calculator within $1 per return on a fixed set of test cases. The full year-by-year loop matches, within $1 per cell, a reference plan built by a separate AI session from the written design; that session can share the design's misreadings (see [Risks](#risks--mitigations)). (Stage A) A second reference plan with assets, built by a separate session from this amended design, matches the engine within $1 per cell. The existing reference plan keeps passing unchanged (AR3). The engine's accounting checks pass on every run in production, and a run that fails them shows an error instead of results.

## Non-Goals

*   **Other provinces and Quebec.** Version 1 is Ontario only. No Ontario-specific values are hard-coded in the engine, so other provinces can be added later; Quebec (QPP, separate tax system) is not part of that promise.
*   **Single people.** Version 1 models couples; all three test households are couples (O16).
*   **Child-related planning other than legacy.** No RESP, no Canada Child Benefit.
*   **Personal advice or open-ended optimization.** The app shows results of choices the user makes and compares them with simple baselines and with each other. It never says "you should", and it does not search for or pick a strategy.
*   **Accounts, sync, servers.** No sign-in, no cloud storage, no sharing except by exporting a file.
*   **Fetching rule values while running.** Default values are fetched at build time and bundled with the app; the user can change them in Settings.
*   **Colour themes, PDF export.** A responsive phone layout for every tab, Assets included, is one of the last stages (AD10); until then the tabs are built for desktop.
*   **Commuted value of DB pensions** (taking a lump sum instead of the pension).
*   **Tax features:** alternative minimum tax, GIS, tax-loss harvesting, spousal RRSP attribution rules, CPP pension sharing, the CPP death benefit, using the younger spouse's age for RRIF minimums.
*   **Employment income detail.** Payroll deductions are modelled from gross pay (item AR-H5 of the stage 5 review), and working years have a cash flow when living costs while working are entered (G14). RRSP deductions for contributions are not modelled.
*   **Other life events:** annuity purchases, random lifespans, long-term care cost shocks, an inheritance. (Selling and buying a home or other asset is in scope since Stage A.)

**Added by the Assets amendment (Stage A):**

*   **Asset kinds with their own tax rules:** businesses (shares, the lifetime capital gains exemption), collectibles (listed personal property) and prescribed annuities. The generic "other asset" uses ordinary income and capital gains rules only.
*   **Capital cost allowance (depreciation) on rentals, and its recapture.** Net rent is taxed without it; Known gaps says so.
*   **Default growth rates for assets from the config.** The user enters each asset's growth, choosing among "with inflation", "inflation plus or minus X%" and "fixed X% a year" (AD13).
*   **Choosing which property is the principal residence.** The home is always the principal residence, and a cottage is always taxable. The "plus one" year formula and splitting the exemption across properties are not modelled. The Estate tab only shows, for comparison, the tax if the cottage were designated instead (AD20).
*   **Probate at the first death,** and probate or tax on property outside Ontario.
*   **Transaction costs:** land transfer tax, HST on new homes, real estate commissions and legal fees on a sale or purchase.
*   **Shared ownership other than 50/50,** and owners outside the couple.
*   **Borrowing against property:** a HELOC, a reverse mortgage, or refinancing; a mortgage keeps its payment until paid off, with no renewal changes (AD18).

## Success Criteria for Version 1

The author judges each tester. A tester passes when, without help, they:

*   complete a full plan for their household;
*   change one input and name one effect on another tab;
*   state one tax-placement idea, with a dollar figure from their own results.

Separately, the headline results and the withdrawal-strategy comparison update within 1 second, and warning tips within 2 seconds, measured from the end of the 500 ms pause after the last edit, on the reference machine (see [Performance](#performance)).

## Open Questions

O1–O21 come from [concepts_brief.md](../../concepts_brief.md); O22–O23 arose while drafting; O24–O31 arose from the screen mockups of 2026-11-19; OA1–OA7 arose with the Assets amendment (Stage A, 2026-11-26). A "mechanical default" is a choice the design made without asking the author, because the design's other rules left little room; the author may override it. "Needed before stage N" refers to the build stages in the [stage order](#detailed-implementation-plan).

| ID | Topic | Status |
|---|---|---|
| O1 | Inflation model | Resolved: one fixed rate ([Decisions](#decisions-made-for-this-plan)) |
| O2 | Calendar conventions | Resolved: [Units and conventions](#units-and-conventions) |
| O3 | Return method and asset classes | Resolved: six classes, fixed returns ([Asset classes and returns](#asset-classes-and-returns-o3)) |
| O4 | Placement model and mix counting | Resolved: presets, face value |
| O5 | Growth-to-safety settings | Resolved: the user sets today's mix; a named shape changes the stock share over time ([Design values](#design-values-version-1)) |
| O6 | Foreign withholding tax | Resolved: one config rate ([Tax scope](#tax-scope-o11)) |
| O7 | Withdrawal strategies | Resolved: three strategies ([Withdrawal strategies](#withdrawal-strategies-o7-o8)) |
| O8 | Pension splitting | Resolved: a split search in both directions, repeated while the best split changes ([Withdrawal strategies](#withdrawal-strategies-o7-o8)) |
| O9 | DC pension as LIF | Resolved: LIF with optional 50% unlock |
| O10 | CPP estimate for early retirees | Resolved: user estimate plus help note |
| O11 | Tax items in or out | Resolved: [Tax scope](#tax-scope-o11) |
| O12 | Probate and home | Resolved: [Death and estate](#death-and-estate-o12-o23) |
| O13 | Success, typical, bad | Resolved: with fixed returns, one result: whether spending is covered every year ([Result definitions](#result-definitions)) |
| O14 | Warnings and tips | Resolved: [Warnings](#warnings-o14) |
| O15 | Empty start, sample plan | Resolved: [Persistence](#persistence) |
| O16 | Test friends' situations | Resolved 2026-11-19 (author): all three test households are couples, and none needs a general "other income" stream; scope unchanged |
| O17 | Spending categories | Resolved 2026-11-19: monthly after-tax amounts by category, or one total ([Spending tab](#spending-tab)) |
| O18 | Recalculation mode | Resolved 2026-11-19: live, as the user edits ([Components and data flow](#components-and-data-flow)) |
| O19 | Placement lesson in first release | Resolved: yes, built in stage 4 |
| **O20** | **Disclaimer and FSRA check** | **Open.** Must be resolved before the URL is shared beyond testers ([Hosting](#hosting-and-repository-author)). |
| O21 | Splitting the context document | Resolved: `docs/history/` ([file 18](#18-docshistorydecision-logmd-and-docshistoryprototype-postmortemmd-exists-stage-0)) |
| O22 | Volatility and correlation source | Withdrawn on 2026-11-18: version 1 uses fixed returns, so no volatility or correlation is needed ([Asset classes and returns](#asset-classes-and-returns-o3)) |
| O23 | Probate defaults | Resolved: confirmed by the author on 2026-11-17 ([Death and estate](#death-and-estate-o12-o23)) |
| O24 | Starting mixes | Resolved 2026-11-24 (author): 40%, 60% and 80% stocks ([Design values](#design-values-version-1)) |
| O25 | Fee levels | Resolved 2026-11-19 (author): 0.20%, 0.60% and 2.00% ([Design values](#design-values-version-1)) |
| O26 | Shapes relative to the user's mix | Resolved 2026-11-19 (author): the values in [Design values](#design-values-version-1), measured from the plan start |
| O27 | Spending phase defaults | Resolved 2026-11-24 (author): slower years from year 15 at 70%, later years from year 25 at 60% ([Design values](#design-values-version-1)) |
| O28 | Later spending above slower spending | Resolved 2026-11-24 (author): allowed, with a note ([Spending tab](#spending-tab)) |
| O29 | Rebalancing switched off | Resolved 2026-11-19 (author): holdings drift, no shape, placement at the plan start only ([Placement](#placement-and-the-growth-to-safety-shift-o4-o5)) |
| O30 | Yields for the asset classes | Resolved 2026-11-19 (author): yields are author decisions, not fetched rule values ([Asset classes and returns](#asset-classes-and-returns-o3)) |
| O31 | What "Let the planner pick" tries | Withdrawn 2026-11-24: the planner is cut from version 1 ([Future Improvements](#future-improvements)) |
| OA1 | Which test household has a cottage, a rental, a mortgage in retirement, a planned downsize or a vehicle that matters, for the second reference plan and the tester sessions | Resolved 2026-11-26 (author): a made-up couple built to exercise every feature once (a rental with a mortgage and a loss year, a cottage sold mid-plan, a joint home downsized, a vehicle replaced twice, living costs while working); real numbers never enter the repository |
| OA2 | Architecture: how the engine handles assets (AR2) | Resolved 2026-11-26 (author): a stepped module ([Decisions for the Assets stage](#decisions-for-the-assets-stage-2026-11-26)) |
| OA3 | Downsizing shortcut and "sell at the first death" (AR7) | Resolved 2026-11-26 (author): both |
| OA4 | Cap on the number of assets, for speed (AR6) | Resolved 2026-11-26 (author): 6 |
| OA5 | Spending group amounts and one-total mode, which can't be held at $0 per category when an asset carries the cost (AD14) | Resolved 2026-11-26 (author): a notice and a confirming tick |
| OA6 | Screen look: a mockup for the Assets tab, or the Savings layout as stated (AR8) | Resolved 2026-11-26 (author): the mockup [Assets.html](mockups/Assets.html), approved by the author the same day |
| OA7 | Working-year living costs: whether the phases and the survivor percentage apply before retirement, and how they meet the retirement spending at the first retirement | Resolved 2026-11-26 (author): one flat amount, switching at the first retirement |

## Critical User Journeys (CUJs)

### CUJ 1: First plan

*   **Given**: A couple opens the app for the first time. No plan is saved in the browser.
*   **When**: They enter, tab by tab: on Household, birth years and months, retirement years and life expectancy targets; on Savings, accounts, balances, DB pension (if any) and their investment mix; on Spending, monthly spending by category or as one total; on Withdrawals, CPP and OAS start ages and a strategy; on Estate, the survivor spending percentage and legacy goal. Any value they don't enter keeps its default.
*   **Then**: Results appear as soon as the plan passes the readiness check (every required field set and the mix at 100%; until then the Results tab lists what is missing), and update as they go. The Results tab shows, in today's dollars, their two goals first (whether spending is covered every year, and the first year it isn't; whether the after-tax legacy meets their goal), then any warnings, then charts of balances, income by source, tax by spouse and the estate. The plan is saved in the browser automatically.

### CUJ 2: Change one tab, see the others

*   **Given**: A plan with a warning that the OAS clawback starts at 72.
*   **When**: The user opens the Withdrawals tab and clicks through the three strategy cards, then picks "Early RRSP drawdown".
*   **Then**: Each card already shows its lifetime tax, after-tax legacy and difference from "Registered last", so the strategies can be compared without selecting each one. Selecting a card redraws the income chart below it; the cards, chart and year breakdown stay in place, so only the numbers and shapes change. Results on every tab follow within 1 second of the end of the 500 ms pause after the click. The Results tab's "What your last change did" lists the effect on lifetime tax, after-tax legacy, the first shortfall year and clawback years. While a calculation is running, the previous figures stay visible, faded, with "Updating…".

### CUJ 3: Change one account's mix

*   **Given**: A plan with results.
*   **When**: The user opens an account on the Savings tab and chooses a different mix for it (for example Conservative for an RRSP).
*   **Then**: The account shows its new mix, and the Results tab says the last change was that account's mix and what it did to lifetime tax and the after-tax legacy. (The author's review, AR-S3, replaced the placement comparison this journey used to cover.)

### CUJ 4: First death

*   **Given**: A plan where one spouse's life expectancy target is 78 and the other's is 94, with a DB pension that pays 60% to the survivor.
*   **When**: The user looks at the years after 78 on the Withdrawals chart and the Results tab.
*   **Then**: The deceased spouse's accounts move to the survivor without tax, the deceased's OAS stops, the CPP survivor benefit and the DB survivor share start, the survivor is taxed as a single person, and spending drops to the survivor percentage. The yearly charts mark the first death, so a jump in tax shows on the Tax by spouse chart, and the "Survivor tax jump" warning explains it when it passes its trigger.

### CUJ 5: Resume on another day

*   **Given**: A user built a plan last week and exported it to a file.
*   **When**: The browser storage has since been cleared, and the user imports the file into a newer version of the app.
*   **Then**: The plan loads with all inputs intact, including any rule values changed in Settings. A file with a newer schema version is refused with a message naming both versions. Results are recalculated with the current defaults plus the plan's own changes, and the app shows which tax year the defaults come from.

### CUJ 6: A rule value changes, or the user wants to test one

*   **Given**: A plan, and a rule value the user wants different from the app's default: for example, a new year's OAS clawback threshold, or a "what if the threshold were $100,000" test.
*   **When**: The user opens Settings from the header, finds the value (each section lists the rules it holds, with the default and its source), and types a new value. A threshold shown on another screen (for example the TFSA yearly limit under Accounts on the Savings tab) has an Edit link that opens Settings at that value.
*   **Then**: The value is marked "changed", shows the default next to it with a "Reset" link, and the plan recalculates. The header chip reads "Tax year 2026 · 1 value changed" instead of "default values". The change is saved with the plan and in exports.

### CUJ 7: Downsize and see it everywhere (Stage A)

*   **Given**: A plan with a home on the Assets tab.
*   **When**: The user sets "downsize in 2041 to $600,000" on the home.
*   **Then**: The 2041 breakdown on Withdrawals shows the sale, the purchase and the money saved; the Balances chart shows the property band drop; and the after-tax legacy changes on Results.

## Technical Plan (Architecture)

### Decisions made for this plan

| Topic | Decision | Chosen by |
|---|---|---|
| Returns (O3) | One fixed compound return per asset class every year, from FP Canada, editable; no random markets or stress paths | Author, 2026-11-18 |
| Inflation (O1) | One fixed rate for every year, from FP Canada guidelines, in the config | Author, 2026-11-17 |
| Account placement (O4) | Two named presets compared with a "same mix everywhere" baseline | Author, 2026-11-17 |
| How the overall mix is counted (O4) | Face value (balances as on statements); one sentence in the placement text explains the effect | Author, 2026-11-24 |
| Asset classes (O3) | Six: Canadian, U.S., international developed and emerging-market stocks, bonds, cash and GICs, each with FP Canada's return | Author, 2026-11-19 |
| Investment mix | The user sets today's mix across the six classes, starting from a named mix or their own; sliders keep the total at 100% | Author, 2026-11-19 |
| Fees | One yearly fee for all investments, chosen from named levels (index ETFs, robo-advisor, mutual funds with an advisor) or entered; the levels' values are in Settings (O25) | Author, 2026-11-19 |
| Withdrawal strategies (O7) | Three: Registered last, Fill lower brackets first, Early RRSP drawdown; all three shown side by side | Author, 2026-11-19 and 2026-11-24 |
| Growth-to-safety shape (O5) | Three named shapes that change the user's own stock share over time (O26) | Author, 2026-11-19 |
| Warning tips (O14) | Computed by nudging related inputs and rerunning the plan | Author, 2026-11-17 |
| Screen framework | React | Author, 2026-11-17 |
| Recalculation (O18) | Live: the plan recalculates shortly after each edit; no Recalculate button | Author, 2026-11-19 |
| Screens | Tabs in this order: Household, Savings, Spending, Withdrawals, Estate, Results; Settings from the header | Author, 2026-11-19 |
| Rule values | Defaults from the config; the user can change single values in Settings, saved with the plan; no required yearly refresh | Author, 2026-11-19 and 2026-11-24 |
| Spending (O17) | Monthly, after tax, by category or as one total; three phases set as a share of active-years spending | Author, 2026-11-19 |
| Retirement timing | A retirement year for each spouse; household spending starts at the first; a still-working spouse enters after-tax pay | Author, 2026-11-17 |
| Foreign withholding tax | One config rate on foreign dividends in the TFSA and registered accounts | Author, 2026-11-17 |
| Fetch checks | Tax and benefit rules fetched twice and compared; market assumptions fetched once and spot-checked | Author, 2026-11-18 |
| Cash yields | One yield per class, an author decision editable in Settings; each class pays one income type | Author, 2026-11-19 |
| LIF minimum and conversion deadline | The federal RRIF minimum and age-71 rule, which Ontario applies to LIFs and LIRAs; no Ontario keys of their own | Author, 2026-11-18 |
| First-year benefits | Birth month for each spouse; first year pro-rated | Author, 2026-11-17 |
| The final return | One return for the second death year; the extra tax is paid by the estate before probate | Author, 2026-11-24 |
| Design values | As listed in [Design values](#design-values-version-1) | Author, 2026-11-17 to 2026-11-19 |
| Public URL | Unlisted, `noindex`, shared only with testers until O20 | Author, 2026-11-17 |
| Repository name | `retirement-planner` | Author, 2026-11-17 |
| Points settled while building the engine | Stated in the sections they belong to | Author, 2026-11-24 |
| Everything else in this section | Mechanical defaults listed where they appear | Design; the author may override them |

Decisions of 2026-11-17 are recorded in [concepts_brief.md](../../concepts_brief.md) and the first review ([docs/reviews/2026-11-17/](../reviews/2026-11-17/)); those of 2026-11-18 and 2026-11-19 in the review folders of those dates; those of 2026-11-24 in [build-decisions.md](../history/build-decisions.md).

#### Decisions for the Assets stage (2026-11-26)

| ID | Decision |
|---|---|
| A2 | **Stepped asset module.** Asset state is kept in the yearly plan state (for deaths, rollovers and costs), but only `src/engine/assets/` changes it. Both the retired-year solver and the working-year path call it at fixed points each year, and it returns that year's amounts. The solver never reads an asset's fields directly. |
| A3 | **Two shortcuts:** "downsize in year Y to $X" on the home, and "sell at the first death" on any asset. Both compile to a plain sale and purchase. |
| A4 | **At most 6 assets** per plan. A vehicle replaced every N years stays one asset. |
| A5 | **Spending overlap with a group amount or "One total":** Spending shows a notice naming the asset costs that may be inside the amount. The user lowers the amount and ticks "Asset costs are not included" to clear it. |
| A7 | **Living costs while working:** one monthly amount, rising with inflation every working year. At the first retirement, spending switches to the retirement amounts. Phases apply only from retirement; a death while working applies the survivor percentage to this amount. |
| A8 | **Mechanical rule:** when "living costs while working" is empty, which it is in every migrated version 1 plan, working years keep the current rule: pay covers living costs and only the account savings the user set are saved. This keeps G15 (identical results) and the protected reference plan unchanged. A new plan shows the field empty with that rule stated beside it. Confirmed by the author at the brief check, amending AD15. |
| A9 | **Goal 1 includes working years** when living costs while working are entered: a short working year marks the strip, and the years count from the plan start. A purchase shortfall stays apart (AD17). Decided by the author at the brief check. |
| A10 | **The shared "Home and auto insurance" category** is held at $0 only when the home and every vehicle carry their insurance on Assets; until then it stays editable, with a notice naming the insurance already on Assets. Decided by the author at the brief check. |

### Components and data flow

```text
+---------------------------- Browser (app page) ------------------------------+
|                                                                              |
|  React screens                       Plan store (one source of truth)        |
|  +--------------+  edits --------->  +---------------------------------+     |
|  | Household    |                    | inputs + ruleOverrides          |     |
|  | Savings      |  <------ reads --  |   + inputsRevision              |     |
|  | Spending     |                    | result (+ revision it came from)|     |
|  | Withdrawals  |                    | previousResult (for the diff)   |     |
|  | Estate       |                    +-------+-------------------^-----+     |
|  | Results      |                            | autosave          | Result    |
|  | Settings     |                            v                   |           |
|  +------+-------+                   localStorage (inputs only)   |           |
|         | 500 ms after the last edit                             |           |
|         v                                                        |           |
|  +------------------------------ Web Worker ---------------------+-------+   |
|  |  Engine (pure TypeScript, future dollars only)                        |   |
|  |   normalizeInputs --> fixed returns (config or user overrides)        |   |
|  |        |                                   |                          |   |
|  |        v                                   v                          |   |
|  |   jurisdiction (federal + Ontario)   variants: user plan, placement   |   |
|  |   tax, benefits, accounts            baseline, the other strategies   |   |
|  |        |                                   |                          |   |
|  |        +--------> year solver <------------+                          |   |
|  |                       |                                               |   |
|  |                       v                                               |   |
|  |   invariants --> summaries --> warnings --> tips --> Result           |   |
|  +-----------------------------------------------------------------------+   |
|                                                                              |
|  Bundled default config (one tax year) + the plan's ruleOverrides            |
+------------------------------------------------------------------------------+

 Build time only: two AI fetch sessions --> candidate configs --> config:compare
                  --> admin review --> validated config committed to the repo
                  (done for 2026; repeating it in later years is optional)
```

The screens are described in [Screens](#screens).

**One store.** The plan lives in one store (Zustand, mechanical choice). Screens read from it and write inputs straight to it. No component keeps its own copy of a plan value.

**Live recalculation and the change summary.**

*   The store keeps an `inputsRevision` counter, increased by every input edit and plan load.
*   500 ms after the last edit, the store sends the inputs and the revision to the Worker.
*   A Worker can't read a new message in the middle of a run, so when a newer revision is sent while a run is in progress, `client.ts` terminates the Worker and starts a new one.
*   Each result records the revision it was computed from; a result for an older revision is dropped.
*   While a run is in progress, the previous figures stay on screen, faded, with "Updating…", so nothing jumps; the Results tab badge reads "Updating".
*   Before replacing the result, the store keeps the one it replaces. "What your last change did" on the Results tab lists the differences in the headline numbers (whether spending is covered, after-tax legacy, lifetime tax, clawback years, first shortfall year, warnings added or cleared), naming the edit and when it was made. The previous result is not saved across browser sessions.

**Worker.** All calculation runs in a Web Worker so the screen stays responsive while the user types. The Worker is created from a `blob:` URL of the bundled Worker code, so it runs under the page's security policy. A run happens in two parts: first the user's plan, the placement baseline and the other two withdrawal strategies (what the screens need), then the warning tips, which follow in a second message. A failure in any of the first part's runs blocks the results and shows the error; a tip rerun that fails is dropped and logged, and the other tips are shown. No shared memory, streamed partial results or cache between runs are used.

#### Assets (Stage A)

```text
 Assets tab ──► store (state/) ──► readiness ──► PlanInputs v2 ──► Worker ──► engine
   │                 ▲                                              │
   │      migrate v1→v2 (persistence/migrate.ts)                    ▼
   │      on import and on load                          normalizeInputs
   │                                                     (assets: today → plan start)
   ▼                                                              │
 Spending tab: "Counted on Assets" holds,                         ▼
 overlap notice, living costs while working        initialState: PlanState.realAssets
                                                                  │
                    ┌─────────────────── each year ───────────────┘
                    ▼
     assets/step.ts (the only code that changes asset state)
       startOfYear(state, ctx)  → sales, purchases, downsizes, first-death handover
       income(state, ctx)       → per spouse: net rent (taxable, may be < 0),
                                  realized gains (taxable), cash in, cash out
       endOfYear(state, ctx)    → growth, mortgage amortization, vehicle replacement
       atSecondDeath(state)     → deemed gains, estate value, probate base
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
  solver/yearSolve.ts      project/workingYear.ts
  (retired years)          (working years, with the new cash flow)
        │                        │
        └──────► YearRow.realAssets (a new record) ──► results/ ──► screens
```

*   **New engine folder `src/engine/assets/`:** `kinds.ts` (one table of the five kinds and their flags), `mortgage.ts` (amortization), `ownership.ts` (owner shares), `step.ts` (the four calls above) and `tax.ts` (the gain, loss and principal residence rules). No other module changes an asset's state.
*   **Code name `realAssets`,** so it doesn't clash with the existing "asset class" (stocks, bonds, cash). The tab is still labelled "Assets".
*   **The ordinary account machinery never sees an asset:** placement, rebalancing, the mix tiles, the variants, `available()` and the Balances account bands all leave assets out.

### Units and conventions

*   **Engine unit: future (nominal) dollars only.** Every money input is entered in today's dollars. `normalizeInputs(inputs, cfg)` converts all of them once, as the engine receives them, using a deflator built from the config's fixed inflation rate. `toDisplay(rows, deflator)` converts results back for the screens: a year's flows with that year's deflator, and its year-end balances with the next year's, since a balance at the end of a year is in the dollars of the next year's start (AR2-R1; the Balances chart does the same). The estate figures stay in the dollars of the second death year, like the tax rules and the home value they use. The today's-dollar type is never imported inside the engine's year-by-year code (`src/engine/solver`, `project` and, from stage 4, `simulate`; enforced by lint). The only today's-dollar values worked out inside it are the lifetime sums in `PlanSummary` (see [Result definitions](#result-definitions)), which `runPath` adds up as plain numbers.
*   **Valuation date:** January 1 of the plan's start year, which is the year the values are entered: `planStartYear` is set to the current year when the plan is made, stored with it, and not rechecked when a saved plan is loaded. Today's dollars are that year's dollars. The inflation factor for year *t* after the start is (1 + inflation)^t, with fixed inflation.
*   **Rows:** one per calendar year, from the start year to the year the second spouse reaches their life expectancy target; the plan ends at the later of the two deaths. Each spouse's age in a row is the age they reach during that year. This matches CRA's end-of-year age rules for the age amount, the pension income credit and pension splitting. The RRIF minimum uses the age at the start of the year (row age − 1).
*   **First year of benefits:** each spouse has a birth month. CPP, OAS and DB payments start the month after the start birthday, so the first year pays only those months. The OAS 75+ increase is pro-rated the same way.
*   **Retirement:** each spouse has a retirement year. Household spending starts in the first spouse's retirement year. A spouse still working after that enters their after-tax pay in today's dollars, counted as cash income until they retire. Their other taxable income, such as CPP or OAS collected while working, is taxed at the working marginal rate they enter (see [the year solver](#the-year-solver)). Spending phases and growth-to-safety shapes are measured in years from the first retirement.
*   **Timing within a year:** on January 1, the first-death transfers, then conversions and the new TFSA room; then the rebalance, fixed income, required withdrawals and the withdrawal solve. After the withdrawals, the sheltered accounts' yields are added, then deposits are made, then the year's price returns apply to everything. Contributions during working years land at the end of the year, after the price returns. Tax is settled in the same year.
*   **Deaths** happen at the end of the year the spouse reaches their target. The first-death transfers apply from the following year. If both spouses die in the same year, the first-death rollover is applied and then the survivor's final return is filed, in that year.
*   **Indexing:** each config value says whether it rises with inflation.
    *   Indexed values grow at the fixed rate **counting from the defaults' tax year, not from the plan start**: an indexed value from tax year *Y* is worth value × (1 + inflation)^(year − *Y*) in calendar year *year*. A 2026 threshold used in a plan starting in 2029 has already grown by three years of inflation in its first row.
    *   This is done once per run: `rebaseConfig(cfg, planStartYear)` multiplies by (1 + inflation)^(planStartYear − the entry's `taxYear`), then sets the entry's `taxYear` to `planStartYear`. By value kind: a `number` entry marked `indexed`; each `brackets` row whose own flag (or the entry's) is indexed, on its `from` only; every number in an indexed `list`; the `from` and `cap` of every row of an indexed `phaseIn`. `ageTable` and `object` values are never rebased (they hold rates and structures). After that, every indexed read uses the display deflator, which counts from the plan start.
    *   An override is rebased the same way, from the tax year of the default it replaced.
    *   Non-indexed values (for example Ontario's $150k and $220k bracket thresholds, the $50k probate threshold) stay fixed in future dollars. Benefit amounts (OAS, the CPP maximum and the CPP survivor amounts) are indexed to inflation by law and are marked `indexed: true`.
    *   **Bracket thresholds never fall:** after indexing, each bracket row's `from` is at least the previous row's. Ontario's top two thresholds are not indexed, so in later years (from about 2042 with the 2026 values) the indexed third threshold passes $150,000; that row's band then shrinks to nothing, and rates never step down. This applies to every bracket table (`brackets` in `read.ts`).

#### Assets (Stage A) units

*   **Values and prices** (`valueToday`, a purchase's `priceToday`, a downsize's `toPriceToday`, a rental's rent and costs) are in today's dollars and converted at the plan start like every other `…Today` field. A purchase price is grown to its purchase year by the deflator, like any future amount entered in today's dollars. The asset's own growth rate applies only to an asset already owned.
*   **Original cost** (`originalCostPaid`) is in the dollars actually paid, never adjusted for inflation. It is a new kind of amount: neither `…Today` nor `…Nom`, and never divided by a deflator. A future purchase's cost is its nominal purchase price.
*   **Mortgages** (`balanceAtStart`, `paymentMonthly`, `ratePct`) are as on the statement at the plan start: nominal amounts that are never indexed and never deflated. They have no `…Today` suffix.
*   **Growth modes** turn into one nominal rate a year in `normalizeInputs`:
    *   "with inflation" = `market.inflation` (including a Settings override);
    *   "inflation plus or minus X%" = (1 + inflation) × (1 + X) − 1;
    *   "fixed X%" = X.

    X may be negative, and a value never falls below $0.
*   **Rent and costs** rise with inflation, whatever the asset's growth rate. The help text says so: property tax doesn't follow the assessed value in this plan.

### Config contract

*   **Two kinds of config, one set of files per tax year:**
    *   **Rule values** (`federal.json`, `ontario.json`, `market.json`): sourced from official or published pages and validated by the admin (the author, for now).
    *   **Planning choices** (`planning.json`, `warnings.json`): the author's design values. Their source is recorded as `"author decision, <date>"` and the author validates them. One exception: `planning.life_expectancy.female` and `.male` are sourced from FP Canada's guidelines and fetched like market assumptions.
*   **Entry shape:** `{ value, unit, taxYear, indexed, source: { url, locator }, fetchedOn, validation: { status, by, on } }`.
    *   `value` is one of: a number; a bracket table `[{ from, rate, indexed? }]` (a row's `indexed` overrides the entry flag for that threshold, because Ontario's top two thresholds are not indexed); an age-keyed table `{ "71": 0.0528, … }`; a phase-in schedule `[{ from, rate, cap }]`, where within a band the amount is the previous row's `cap`, or 0 for the first row, plus `rate` × (income − `from`), up to this row's `cap`; a list of numbers `[n, …]` (the Ontario surtax thresholds and rates, in matching order); or, for planning choices only, a structured object (presets, shapes, weights, warning triggers).
    *   `unit` is one of `CAD` (a one-time amount, such as the probate threshold), `CAD_per_year`, `CAD_per_month`, `rate`, `age`, `years`, `count`, `none`.
*   **Keys:** dotted names, grouped by file:
    *   `federal.*`: federal tax brackets and credits, dividends and capital gains, OAS, CPP, RRIF, TFSA and pension splitting;
    *   `ontario.*`: Ontario tax brackets and credits, surtax, Health Premium, Tax Reduction, probate, and the LIF maximum table and unlock share;
    *   `market.*`: `market.<class>.geometric_return` and `market.<class>.yield` for each of the six asset-class ids below, `market.inflation` and `market.foreign_withholding_rate`;
    *   `planning.*`: the author's planning choices (`planning.shapes`, `planning.presets`, `planning.mixes`, `planning.fee_levels`, `planning.spending_phases`, `planning.survivor_spending`, `planning.override_margin`), plus FP Canada's life-expectancy tables, `planning.life_expectancy.female` and `.male`;
    *   `warnings.*`: `warnings.triggers` and `warnings.nudge_steps`.

    `src/engine/config/keys.ts` is the authoritative list of keys. [config/SOURCES.md](../../config/SOURCES.md) gives each key's unit, source page and where on the page the value appears, and `config:check` fails unless the two list exactly the same keys. A new key is added to both together. This document names a key only where a rule uses it.
*   **Persisted ids** (permanent once version 1 saves plans):
    *   asset classes: `cad_equity`, `us_equity`, `intl_equity`, `em_equity`, `bonds`, `cash`;
    *   starting mixes: `conservative`, `balanced`, `growth`, `custom`;
    *   fee levels: `index_etf`, `robo`, `advisor`, `custom`;
    *   shapes: `steady`, `gradual_shift`, `safety_first_regrow`;
    *   presets: `bonds_sheltered_first`, `growth_tax_free_first` (the baseline `same_mix` is internal and never saved);
    *   strategies: `registered_last`, `fill_brackets`, `early_rrsp`;
    *   bracket levels: `first_bracket`, `oas_threshold`;
    *   spending categories: to be listed on the [Spending tab](#spending-tab) (Known gaps SR1-M8);
    *   account ids: `<type>-<owner>-<n>`, for example `rrsp-0-1`, assigned once when the account is created and never reused.
*   **User changes to rule values:** a plan may hold `ruleOverrides: RuleOverrides`, where `RuleOverrides = Record<string, { value: unknown; defaultTaxYear: number }>`, keyed by a config key. Overrides are never written to the config files.
    *   **Which keys:** only single values (`number` keys) that have a Settings row. Tables (brackets, age tables, phase-in, lists), presets, shapes, mixes, the life-expectancy tables, `warnings.*`, `market.<class>.geometric_return` and the CPP and OAS age-limit keys (`federal.cpp.start.earliest`, `federal.cpp.start.latest`, `federal.oas.deferral.max_months`), whose input ranges are fixed in the Data contracts, are shown read-only. The table-structure checks below stay in `overrides.ts` for a later release that may open tables to overrides; until then only the range and cross-key checks can reject a value. Returns are changed only through `investing.returnOverride` on the Savings tab; the Settings row for returns links there. Fee levels stay planning choices, but their values can be overridden in Settings like any other key; the plan's `feeLevel` still picks which level applies. Yields are overridable.
    *   **Units:** an override is entered in the key's published unit (OAS per month, like the config) and in the defaults' tax-year dollars. It goes through the same loader conversion and the same indexing as the default. Because a loaded `Config` holds yearly amounts, each loaded entry keeps `publishedUnit` (set by `toAnnual` to `CAD_per_month` for the four monthly keys); `applyRuleOverrides` multiplies an override by `MONTHS_PER_YEAR` when its key's `publishedUnit` is `CAD_per_month`.
    *   **Validation:** `validateOverride(key, value, overrides, cfg): string[]` in `src/engine/config/overrides.ts` checks, in order:
        *   the value kind's schema (`checkValue(spec: KeySpec, value): string[]`, exported from `schema.ts`; it uses the kind's schema, or the key's `objectSchemas` entry for an `object` key, like `checkEntry`);
        *   a range by unit: `rate` 0 to 1, `age` 40 to 110, `years` and `count` 0 to 100, `CAD_*` 0 or more; the life-expectancy tables 60 to 110;
        *   structure: bracket and phase-in `from` values rise, the first bracket row starts at 0; phase-in caps never fall; `federal.rrif.min_factor` and `ontario.lif.max_factor` have no gaps between their first and last ages (the life-expectancy tables, with a row every 5 years, are exempt); the surtax threshold and rate lists have the same length;
        *   cross-key rules, using the override set as a whole: `federal.cpp.start.earliest` < `federal.cpp.start.latest`; `federal.oas.residence.min_years` ≤ `federal.oas.residence.full_years`; `federal.credits.basic_min` ≤ `federal.credits.basic`.

        A failing override is rejected in Settings with the rule it broke.
    *   **Stale overrides:** each override stores the tax year of the default it replaced. When the bundled tax year differs, Settings marks it "set against <year> defaults" and shows the new default beside it; the header chip counts it as changed. The value is not changed automatically.
    *   **Import:** an override whose key is unknown to this app version, or whose value fails validation, is dropped on import, and a message lists each dropped key and its value.
    *   `applyRuleOverrides(cfg, overrides)` (same file) returns a new `Config` with the valid overrides applied, each given the `taxYear` of its `defaultTaxYear`; the engine reads only that.
    *   **Order per run:** `applyRuleOverrides`, then `rebaseConfig`, then `normalizeInputs`. An override of `market.inflation` therefore changes both the rebase and the deflator.
*   **Engine settings** (solver tolerance and step cap, split-search step and passes, invariant tolerance) are not config. They live in `src/engine/constants.ts`, along with `MONTHS_PER_YEAR` and `BENEFIT_REFERENCE_AGE` (65, the age the CPP estimate and the OAS base refer to). It is the one engine file exempt from the no-magic-numbers lint rule.
*   **Loading:** config files are JSON, imported directly. `config/CURRENT_YEAR` names the tax year; a generated module, `src/engine/config/bundle.ts`, imports every file for that year. The Worker, the Vitest tests and the `tsx` tools all import that one module. Config is never fetched at run time.
*   **Status:** `configStatus(config, overrides, today)` returns the tax year, the lists of unfetched and unvalidated keys, the lists of overridden keys and of stale overrides (`staleOverrideKeys`, set against an older tax year), and `outOfDate = today's year > taxYear`. The header chip shows the tax year and "default values" or "N values changed". A notice appears when a default is unvalidated; when the defaults are out of date, the notice says which year they come from and points to Settings, rather than asking for an admin update.
*   **Monthly amounts:** amounts the sources publish monthly (OAS, the CPP maximum, the CPP survivor flat rate and combined maximum) are stored as `CAD_per_month` exactly as published, using the January figure, and updated once a year. The loader converts them to `CAD_per_year` (× 12; an unfetched null stays null). OAS changes each quarter, so January × 12 slightly understates a full year; this is an accepted approximation.
*   **Fetch checks:** tax and benefit rules (`federal.json`, `ontario.json`) are fetched twice, independently, and compared, because an error there gives a wrong tax or benefit amount in every plan. Market assumptions (`market.json`) and the FP Canada life-expectancy tables are estimates, so one fetch and a spot-check by the admin are enough.
*   **Market yields** are author decisions (O30): sourced "author decision, <date>", validated by the author, not fetched or refreshed. They keep their `market.<class>.yield` keys.
*   The engine never contains a rule value as a number in code.

### Jurisdiction

The engine calls a jurisdiction module for provincial tax and credits, the Ontario surtax and Health Premium, the Ontario Tax Reduction, probate, and LIF rules. Ontario is the only implementation. Federal rules are a separate module. No Ontario-specific value or rule appears outside the Ontario module, so another province can be added as a new module. Quebec is not part of this promise.

### Tax scope (O11)

*   **In:**
    *   federal and Ontario brackets;
    *   basic personal amount, including the federal amount's reduction at high income;
    *   age amount and its income-based reduction;
    *   pension income credit;
    *   eligible dividend gross-up and credit;
    *   capital gains at 50% inclusion;
    *   Ontario surtax: the first rate on Ontario basic tax above the first threshold, plus the second rate on Ontario basic tax above the second threshold (additive, and applied to Ontario tax, not to income);
    *   Ontario Health Premium, phased in by income band up to each band's cap (`phaseIn` shape);
    *   Ontario Tax Reduction, basic amount only (no dependants are modelled);
    *   OAS recovery tax (clawback), calculated inside the tax function from actual net income.
*   **Foreign withholding tax:** one config rate applies to the foreign-dividend yield of U.S., international and emerging-market stocks held in the TFSA and in RRSP/RRIF/LIRA/LIF, where it can't be recovered. In non-registered accounts it is treated as recovered through the foreign tax credit, which is not modelled in detail. The rate assumes Canadian-listed funds.
*   **Out:** non-eligible dividends, alternative minimum tax, GIS, the CPP death benefit, other credits. Foreign dividends in non-registered accounts are taxed as ordinary income.
*   **Income, net income and the clawback (follows the T1 return).** Total income is the sum of the `TaxableIncome` fields, with eligible dividends grossed up by `federal.dividend.eligible.gross_up` and capital gains multiplied by `federal.capital_gains.inclusion_rate`. The OAS recovery tax = min(OAS received, `federal.oas.recovery.rate` × max(0, total income − `federal.oas.recovery.threshold`)). It is also a deduction (line 23500): net income and taxable income are total income minus the recovery tax. The age amount's reduction and the Health Premium use that net or taxable income.
*   **Order of the Ontario calculation (follows Form ON428 Part C, checked against the 2025 form).** All amounts are for one person's return, after any pension split.
    1.  **Bracket tax:** `ontario.tax.brackets` applied to taxable income.
    2.  **Non-refundable credits:** the basic, age (after its income-based reduction) and pension amounts, added together and multiplied by the rate of the first row of `ontario.tax.brackets`.
    3.  **Basic Ontario tax** (line 53) = max(0, bracket tax − non-refundable credits).
    4.  **Surtax** (line 68) = the first rate × max(0, basic Ontario tax − the first threshold) + the second rate × max(0, basic Ontario tax − the second threshold), reading `ontario.surtax.rates` and `ontario.surtax.thresholds` in matching order. The surtax is worked out before the dividend tax credit.
    5.  **After the dividend tax credit** (line 71) = max(0, basic Ontario tax + surtax − `ontario.dividend.eligible.credit_rate` × the grossed-up eligible dividends).
    6.  **Tax Reduction** (line 80) = max(0, 2 × `ontario.tax_reduction.basic` − the step 5 amount). The tax after it (line 81) = max(0, step 5 − Tax Reduction).
    7.  **Health Premium** (line 89): `ontario.health_premium.schedule` (`phaseIn` shape) applied to taxable income. It is added last and is never reduced.
    8.  **Ontario tax** (line 90) = step 6 + Health Premium. This is what `provincialTax` returns and what `tax-cases.json` calls `ontarioTax`.

    The Low-income individuals and families tax (LIFT) credit (line 85) falls between steps 6 and 7. It is out of scope; it can be non-zero only in a year with employment income.
*   **The federal calculation.**
    *   **Basic personal amount:** `federal.credits.basic` up to taxable income equal to the `from` of the fourth row of `federal.tax.brackets`, `federal.credits.basic_min` at or above the fifth row's `from`, and a straight line between them.
    *   **Federal tax** (line 42000) = max(0, federal bracket tax − federal non-refundable credits × the first-row rate of `federal.tax.brackets` − `federal.dividend.eligible.credit_rate` × the grossed-up eligible dividends). The OAS recovery tax is reported separately as `clawback`; it is not part of `federalTax`.
*   **Checked:** with the 2026 config, these rules match all 21 cases in `tests/fixtures/tax-cases.json` (from the [TaxTips.ca](https://www.taxtips.ca/) Ontario calculator) within $1 per return; `personalTax.test.ts` checks this on every build.

### Accounts

Every account has an owner (spouse 1 or spouse 2). Types:

*   **RRSP**, converting to a **RRIF** at an age the user sets (no later than the end of the year the owner turns 71). An RRSP that has not been converted can still be drawn (a lump-sum withdrawal, taxed as `otherOrdinary`). RRIF minimums use the CRA factor for the owner's age at the start of the year. No minimum applies in the year the RRIF opens.
    *   **Minimum factor:** for a start-of-year age in `federal.rrif.min_factor` (71 to 95), the table's factor; above its last age, the last age's factor (the table's 95 means "95 or older"); below its first age, 1 ÷ (`federal.rrif.min_factor_base_age` − age), CRA's rule for ages 70 and under. The minimum is the factor × the balance at the start of the year.
    *   An RRSP or LIRA whose owner is already past its conversion age at the plan start starts converted, as if opened the year before, so its minimum applies from the first year.
*   **LIRA**, converting to a **LIF** at a user-set age, no later than the end of the year the owner turns 71 (a validation rule), with a yearly minimum and maximum. No minimum applies in the year the LIF opens. A LIRA is never drawn before conversion. Money in a former employer's DC pension, including a plan still held by the employer (at its current value), is entered as a LIRA.
    *   **The maximum is Ontario's:** max = the greater of `ontario.lif.max_factor`[start-of-year age] × the start-of-year balance, and the LIF's investment earnings in the previous year (its yield plus price return, after fees). Conversion is modelled at January 1 of the conversion year, so the opening year is a full year and needs no pro-rating; in that year the maximum is the table factor alone, because the LIF has no previous year's earnings. Ages above the table's last age (90) use its last factor (100%). The table applies while the long-term Government of Canada bond rate that sets it (Statistics Canada series V122487, formerly CANSIM) is 6% or less. The engine assumes it is; this was confirmed for 2026 and is not rechecked unless the admin refreshes the defaults.
    *   The minimum is the federal RRIF minimum (`federal.rrif.min_factor`). Ontario sets no table of its own; FSRA policy L200-303 says the LIF minimum is the Income Tax Regulations' RRIF minimum.
    *   The age-71 deadline is the federal RRSP rule, because a LIRA is an RRSP; it uses `federal.rrif.latest_conversion_age`. The one-time 50% unlock is an optional choice at conversion; if chosen, half moves to the owner's RRSP/RRIF (O9). An owner with no RRSP or RRIF gets a new RRIF that year (id `rrsp-<owner>-<n>`), with no minimum in its first year.
*   **TFSA**, with contribution room per spouse, shared by all their TFSAs. Room starts from the user-entered room, which is today's available room as CRA's My Account shows it, so no yearly limit is added in the plan's first year. From the second year, the yearly limit from the config (`federal.tfsa.annual_limit`, indexed; the rounding of the published limit is not modelled, an accepted approximation) is added each January 1, with the previous year's withdrawals.
*   **Non-registered**, holding pooled positions per asset class with their original cost (adjusted cost base, the amount paid). Each year's interest, dividends and realized gains are taxed by type. Sales are spread across positions in proportion, at average cost. A spouse with no non-registered account gets an empty one at the plan start, so a surplus always has somewhere to go.
*   **DB pension** (income stream, not a balance): lifetime amount and start age, optional bridge amount (a temporary top-up paid until an end age, usually when CPP or OAS starts), indexing (full, fixed percentage or none), survivor percentage.
    *   **Amounts and indexing:** with `full`, the lifetime and bridge amounts are today's dollars and grow with the deflator. With `fixed` or `none`, they are the nominal amounts on the pension statement at the start age; `fixed` then grows by `indexRate` each year after the start, and `none` stays flat. `normalizeInputs` converts only the `full` amounts.
    *   **The bridge's last year** pays up to the birthday month of its end age (birth month ÷ 12 of a year).
    *   **Survivor share:** paid from the year after the member's death, also when the member dies before the pension's start age (then as the survivor percentage of the lifetime amount).

CPP and OAS: the user enters each spouse's CPP estimate at 65 and start age, and years of Canadian residence for OAS. A help note explains that an estimate from My Service Canada assumes contributions continue to 65, and links to Service Canada's explanation of adjusting for years without contributions (O10). All coefficients below come from the config:

*   **CPP:** the estimate at 65, adjusted per month before or after 65 (start between the earliest and latest ages).
*   **OAS:** zero below the minimum residence years; otherwise `min(years, full_years) / full_years` × base × (1 + per-month deferral rate × deferral months, capped at the maximum), plus the 75+ increase.
*   **CPP survivor benefit:** for a survivor 65 or older, a percentage of the deceased's pension; for a survivor under 65, a flat amount plus a percentage. In both cases the survivor's own pension plus the survivor benefit is capped at `federal.cpp.survivor.max_combined`, the published maximum for a combined survivor's and retirement pension, read from Service Canada's payment-amounts table. (The survivor page's wording, "the maximum retirement pension", would use `federal.cpp.max_at_65` instead; the author chose the published combined maximum.)

### Asset classes and returns (O3)

*   **Six asset classes:** Canadian stocks, U.S. stocks, international developed stocks, emerging-market stocks, bonds, and cash and GICs. These match FP Canada's published classes, so no blend is needed. Each has config entries for:
    *   expected compound (geometric) return, from FP Canada (cash uses FP Canada's short-term rate);
    *   a fixed yearly cash yield (`market.<class>.yield`), an author decision (below).
*   **The user's mix:** the Savings tab sets today's share of each class across all accounts. The user starts from a named mix (Conservative, Balanced, Growth; O24) or enters their own ("Custom"). Each class has a slider and a number box. Moving one class's share moves the others in proportion to their current shares, so the total stays at 100%; a class at 0% stays at 0% until the user sets it. The tab shows the mix as a coloured bar, the stock/bond/cash totals, and the expected return before and after fees.
*   **Fixed returns:** every year, each class earns its fixed compound return (or the user's override), less fees. There are no random markets and no stress paths, so results show the plan with the same return every year. They do not show sequence risk, the damage a bad market early in retirement can do, and a safer growth-to-safety shape shows only its lower return ([Alternative C](#alternative-c-random-returns-and-stress-paths)).
*   **Wording:** this document says "fixed compound return". The screens say "the same return every year (FP Canada's long-run estimate)" and never "average", which lay readers take to mean the arithmetic mean.
*   **Cash yields (O30):** each class pays one income type. A yield is an assumption like a return, not a tax rule, so the author sets each one rather than fetching it every year. It is shown with the returns under investing assumptions in Settings, where the user can change it. Starting values may be taken once from the factsheets below; after that they are not refreshed.
    *   Canadian stocks: eligible dividends; reference, the "Distribution Yield" on the factsheet of the iShares Core S&P/TSX Capped Composite Index ETF (XIC).
    *   U.S., international developed and emerging-market stocks: foreign dividends; reference, the "Div Yld (%)" on MSCI's USA, EAFE and Emerging Markets index factsheets.
    *   Bonds: interest; reference, the "Weighted Average Coupon" on the factsheet of the iShares Core Canadian Universe Bond Index ETF (XBB). The coupon is used rather than the yield to maturity because the yield here is the cash paid out.
    *   Cash and GICs: interest; the whole return is paid as interest, so its yield equals its return.
*   **Fees:** one yearly fee applies to all investments. The user picks a named level, "Index ETFs", "Robo-advisor", "Mutual funds with an advisor", or "Custom" with their own figure. The levels' values are planning choices (`planning.fee_levels`, O25) and can be changed in Settings.
*   **Each class's yearly return:** `classReturns(cfg, investing)` in `src/engine/invest/returns.ts` is the only place returns are worked out. For each class it returns `{ total, yield, price, incomeType }`:
    *   gross return = `investing.returnOverride[class]` if set, otherwise `market.<class>.geometric_return`; an override is entered before fees, like the FP Canada figure;
    *   total = gross return − the plan's fee (the level's value from `planning.fee_levels`, or `customFee`), a simple subtraction;
    *   yield = `market.<class>.yield` (or its override); price = total − yield;
    *   `incomeType` is eligible dividends (Canadian stocks), foreign dividends (U.S., international and emerging-market stocks) or interest (bonds, cash).

    It is computed once per run; returns are the same every year.
*   **Income and price:** the cash yield is worked out on the January 1 balance. The price return can be negative; the yield can't. `config:check` warns (does not fail) when a class's yield is above its gross return, because its price would then fall every year.
*   **Yields inside sheltered accounts:** in RRSP, RRIF, LIRA, LIF and TFSA accounts the yield stays in the account. It is worked out on the January 1 balance but added to the account after the year's withdrawals, in the same class, so it never enlarges the balance the RRIF and LIF limits use. Foreign dividends there lose `market.foreign_withholding_rate` first, because the tax can't be recovered. In non-registered accounts the yield is paid out as taxable cash (step 4 of the year solver) and the withholding is treated as recovered.
*   **Capital losses:** a sale in a non-registered account can realize a loss. Net realized losses offset taxable gains in the same year; any remainder carries forward, per spouse, against future gains only, never against other income. At the final return, a carried-forward loss offsets the deemed gains. (Tax law also lets net capital losses reduce other income in the year of death; that is not modelled.)
*   **Return overrides:** the user can override the expected return for each asset class, in the mix table on the Savings tab. The config default is shown next to each override, and the override is saved in the plan. Yields and income types default from the config; yields can be changed in Settings. An override more than `planning.override_margin` (0.5 percentage point) above FP Canada's figure for that class triggers the "optimistic returns" warning. With six classes, each class has its own FP Canada figure, so the limit always has a base. Inflation is shown on the Savings tab with an Edit link to Settings.

### Placement and the growth-to-safety shift (O4, O5)

*   **Growth-to-safety shape:** one of three named shapes, shown on the Savings tab under "As you get older" with a small line drawing each: "Keep my mix" (`steady`), "Get safer gradually" (`gradual_shift`) and "Safer around retirement" (`safety_first_regrow`). Each changes the user's own stock share by years from the first retirement, by the points in [Design values](#design-values-version-1) (O26). Within stocks, and within bonds and cash, the user's proportions are kept.
    *   **Reference year:** the change in year *t* is shape(*t*) − shape(*t₀*), where *t₀* is the plan start in years from the first retirement. The first year therefore always uses today's mix exactly.
    *   **Clamping:** the stock share stays between 0% and 100%. Points taken from stocks go to bonds and cash in the user's proportions; if the user holds neither, they go to bonds. Points added to stocks come from bonds and cash in the user's proportions; if the user holds no stocks, they go to the stock classes in the proportions of the named starting mix chosen last, or to Canadian stocks for "Custom".
    *   **Fractions:** the engine works with fractional shares. Whole numbers summing to 100 are a screen rule for what the user types.
*   **Each account's own mix (AR-S3, the default from the author's stage 5 review):** with the `own_mix` preset, every account holds its own mix (a starting mix or custom shares), moved along the household's growth-to-safety shape. An account the engine opens itself (a non-registered account for a surplus) holds the household mix; a RRIF opened by the LIRA unlock keeps the LIRA's mix. There is no placement baseline in this mode: the baseline run is the plan itself, so the Result's placement comparison is zero.
*   **Placement preset:** one of two named presets that say, for each asset class, which account types to fill first. "Same mix everywhere" is the baseline only, not a selectable preset; it holds the overall mix in every account. The presets stay in the engine (the reference plan uses one) but are no longer offered on the screens.
*   **Filling accounts:** asset classes are placed in this order: cash, bonds, then emerging-market, international, U.S. and Canadian stocks. Each class fills accounts in its preset order until its target share is reached. Within a group of accounts (for example both spouses' TFSAs), the amount is split in proportion to each account's room not yet assigned to another class. Balances are counted at face value.
*   **Yearly rebalance:** a "Rebalance once a year" choice on the Savings tab, on by default. When on, at the start of each year, after any first-death transfers, the engine rebalances every account to its target holdings. Moves inside registered accounts and the TFSA are tax-free. Sales in non-registered accounts realize gains, which are taxed in the same year inside the withdrawal solve. A full rebalance every year, in both the user's plan and the baseline, is an accepted assumption (see [Risks](#risks--mitigations)).
*   **Rebalancing off (O29):** holdings are placed by the preset at the plan start only, then drift with returns, withdrawals and deposits. The shape is not applied, because nothing moves money between classes, so the Savings tab disables the shape choice and says why. Withdrawals and surplus deposits within an account follow its current holdings in proportion.
*   **Face value and hidden risk:** because the mix is counted at face value, part of a placement's benefit can come from holding more stocks once tax on registered withdrawals is taken into account; the placement text says so in one sentence.

### Withdrawal strategies (O7, O8)

*   **"Registered last":** after required RRIF and LIF minimums, draw from non-registered, then RRSP/RRIF and LIF, then TFSA.
    *   **Registered draws between spouses:** pro rata across both spouses' RRSP, RRIF and LIF balances together. A LIF's share is capped at its remaining room under the LIF maximum; anything over the cap comes from the same owner's RRSP/RRIF, and if that is empty, from the other spouse's registered accounts. A LIRA is never drawn.
*   **"Fill lower brackets first":** a required draw, taken before the withdrawal solve. Each spouse's taxable income (before splitting) is topped up from their RRSP/RRIF, then LIF, to a level, even if spending doesn't need the money. Whatever is still needed then follows the "registered last" order. After a death, the survivor keeps the same level.
    *   **Level:** the user picks one level for both spouses, either "Top of the first bracket" (the top of the lowest federal bracket, from `federal.tax.brackets`) or "Just under the OAS clawback" (`federal.oas.recovery.threshold`). Both are read from the rule values in use, so a change in Settings moves them; an "Edit thresholds" link opens Settings.
    *   **Which income is topped up:** each spouse's net income before pension splitting, as `incomeTotals` defines it (eligible dividends grossed up, gains at the inclusion rate), counting fixed income, minimums, the non-registered cash yield and gains already realized by the rebalance. The top-up stops exactly at the level, with no margin. Splitting and gains realized later in the withdrawal solve can move income above the level; this is accepted, and the split search keeps household tax (which includes any clawback) lowest.
    *   **Indexing:** the level grows with its threshold, counting from the defaults' tax year (see [Units and conventions](#units-and-conventions)).
*   **"Early RRSP drawdown":** in the "draw-down years", the spending need is drawn from RRSP/RRIF and LIF first, before non-registered savings and the TFSA. After the draw-down years, it follows "registered last".
    *   **Draw-down years:** from the first retirement year up to and including the last year in which a living spouse has a CPP or OAS pension that has not yet started. A spouse's unstarted benefits stop counting at their death. With no such years (benefits start at or before retirement), the strategy is the same as "Registered last", and the option row says "No draw-down years with these start ages; same as Registered last".
    *   **Which spouse (a fill-up rule, so the solve stays monotonic):** draw from the spouse whose net income before splitting (after fixed income, minimums and the cash yield) is lower, until the two are equal; then from both equally. If incomes are equal at the start, begin with spouse 1. Within a spouse, RRSP/RRIF and LIF are drawn in proportion to their balances, LIF capped at its maximum. When one spouse's registered money runs out (or is at the LIF cap), the rest comes from the other spouse.
    *   **A spouse still working** in the draw-down years is not drawn from; see [the year solver](#the-year-solver).
    *   The strategy is designed to pair with delaying CPP and OAS; the option row shows the draw-down years and where the ages are set.
*   **All three are always run:** every run computes all three strategies at the same returns, because the Withdrawals tab shows each strategy's lifetime tax, after-tax legacy, amount moved to the TFSA and clawback years on its card, with the difference from "Registered last".
*   **Explanations:** each strategy has a "Learn more" dialog with fixed text: what it does, its effect on income, taxes and savings, pros, cons, when it makes sense, and an "In your plan" line with this plan's figures against "Registered last" (or, for "Registered last", against "Fill lower brackets first"). The dialog has "Use this strategy" and "Close".
*   **Between spouses:** non-registered and TFSA draws come from each spouse in proportion to their balances.
*   **Surplus:** money forced out by minimums or the bracket level beyond what spending needs is split between the spouses in proportion to their share of the forced draws that caused it. With no forced draws, it is split by each living spouse's CPP, OAS, DB and pay, or equally if those are zero. Each share goes into that spouse's TFSA up to available room, then into their non-registered account: the first TFSA and the first non-registered account by id, also for a survivor who has inherited accounts.
*   **Pension income splitting:** eligible pension income is DB payments at any age, and RRIF and LIF payments if the transferring spouse is at least `federal.split.min_age_rrif`.
    *   **The search** tries 0 up to `federal.split.max_share` of the transferring spouse's eligible pension income, in `SPLIT_STEP` steps, **in both directions**: spouse 1 transferring to spouse 2, and spouse 2 to spouse 1. With the 2026 values (50% in 5% steps) that is 21 points (0% counted once). It keeps the split with the lowest household tax.
    *   **Ties:** two splits whose household tax differs by less than `SPLIT_TIE_TOLERANCE` ($0.000001) are a tie, so rounding noise never picks the split. A tie goes to the smaller transfer, then to spouse 1 transferring.
    *   **Passes:** the year is first solved with the previous year's split (no split in the plan's first year), then the search runs at that answer, and the year is solved again while the best split changes, up to `MAX_SPLIT_PASSES` (3) passes. Over 1,054 test plans, 3 passes matched a full search exactly.
    *   This approximates the split tax software finds at filing time; it is not presented as a recommendation.

### The year solver

Each year, for each variant, in this order:

```text
0.  Start of year, on January 1:
      a. If the first death happened last year, apply the first-death
         transfers (project/death.ts, firstDeathTransfer), before anything
         else, so the survivor's age decides when an inherited RRSP or LIRA
         converts:
           - every RRSP/RRIF/LIRA/LIF, TFSA and non-registered account keeps
             its id and type and changes owner (non-registered at original
             cost; the TFSA as successor holder, without using the survivor's
             room);
           - from then on the survivor's age drives minimums, maximums and
             conversion; openedYear and lifPrevEarningsNom are kept; the
             deceased's carried-forward loss is dropped (losses on the
             first-death return are not modelled);
           - the deceased's CPP, OAS and DB stop;
           - the CPP survivor benefit (capped) and the DB survivor share start;
           - spending switches to the survivor percentage.
      b. (solver/startOfYear.ts) Convert an RRSP to a RRIF, or a LIRA to a LIF
         (applying the optional 50% unlock), in the year the owner reaches
         their conversion age, and no later than the year they turn
         federal.rrif.latest_conversion_age; set openedYear. Add the yearly
         TFSA limit (not in the plan's first year) and last year's TFSA
         withdrawals to each spouse's room.
1.  Set ages and who is alive.
2.  Rebalance every account to this year's target holdings (at the plan start
    only, when rebalancing is off). Record the gains realized in
    non-registered accounts as this year's taxable income.
3.  Fixed income for each spouse: CPP, OAS (with the 75+ increase), DB lifetime
    and bridge amounts, survivor benefits (first year pro-rated by birth month),
    and after-tax pay for a spouse still working.
4.  Required draws, in this order: RRIF and LIF minimums; the non-registered
    cash yield (interest and dividends on the January 1 balance); then the
    "fill lower brackets first" top-up, if that strategy uses it.
5.  Solve for the extra gross withdrawal W >= 0 so that after-tax cash equals
    the spending need (the phase's yearly amount from Spending x inflation
    factor, x survivor percentage after the first death; zero before the first
    retirement):
      - W follows the "registered last" order, except in "Early RRSP
        drawdown"'s draw-down years, where RRSP/RRIF and LIF come first;
      - tax for each spouse uses the current pension split, re-solved while
        the best split changes (see Pension income splitting);
      - find W by bisection between 0 and everything available; this
        converges because after-tax cash rises when W rises (no one pays more
        than 100% tax on an extra dollar; tests/property/solver.test.ts
        checks this);
      - precision $0.01 on W, at most SOLVER_MAX_STEPS (40) steps;
      - if even everything available is short, record the shortfall.
6.  Settle the accounts, in this order: take the draws; add the sheltered
    accounts' yields (worked out on the January 1 balance, net of foreign
    withholding); then deposit any surplus, into the TFSA within room, then
    non-registered. Each deposit is bought at the account's weights at that
    point.
7.  Apply the year's price returns (total return after fees, minus the
    yield) to everything. Update the original cost of non-registered
    positions and each spouse's carried-forward capital loss. Record each
    LIF's investment earnings (lifPrevEarningsNom) and each spouse's TFSA
    withdrawals for next year.
8.  If this is the second death year, file the final return and settle the
    estate (see Death and estate): registered balances, converted or not,
    count as income; non-registered positions are taxed as if sold; TFSA
    balances pass tax-free; Ontario probate applies to estate assets; the
    result is the after-tax legacy.
9.  Run invariant checks (see Verification).
```

Years before the first retirement run in `project/workingYear.ts` instead, in this order:

1.  Start of year and ages, as in steps 0 and 1 above.
2.  Rebalance and apply the shape, as in retired years. Gains the rebalance realizes are taxed at the owner's working marginal rate.
3.  RRIF and LIF minimums are taken, as in retired years.
4.  The non-registered cash yield, the rebalance gains, the minimums and any CPP, OAS and DB collected while working are taxed at each owner's `workingMarginalRate`. The tax on the minimums and benefits is paid from them. The tax on the yield and the rebalance gains is paid from the yield; if that tax is larger than the yield, the rest is sold from the same non-registered account. That sale realizes a gain or loss at average cost, which counts in the year's realized gains and in the netting with the carried-forward loss, but is not taxed again that year.
5.  Settle the accounts: the draws; the sheltered yields; then the yield left after tax is reinvested in the owner's non-registered account, and the minimums and benefits left after tax go to the owner's TFSA within room, then to non-registered.
6.  Apply price returns.
7.  Contributions (entered in today's dollars and indexed) land at the end of the year, after the price returns: TFSA within room, any excess to non-registered. A contribution set for an RRSP or LIRA that has already converted goes to the owner's non-registered account. RRSP deductions are not modelled.
8.  Run invariant checks.

A working year's row shows `afterTaxCashNom` and `surplusNom` of 0: what is saved appears as deposits.

**The working marginal rate** applies to taxable amounts: every `TaxableIncome` field, with capital gains at `federal.capital_gains.inclusion_rate` (after losses and the carried-forward loss) and eligible dividends as the cash received; the tax is never below 0. It is used in working years and for a spouse still working in a retired-household year.

**A spouse still working in a retired-household year:** their after-tax pay counts as cash. All their other taxable income (CPP, OAS, DB, registered draws and their share of non-registered income) is taxed at their `workingMarginalRate`, not through `personalTax`. Until they retire, they are left out of pension splitting, the "fill lower brackets first" top-up and Early RRSP draws.

#### Assets in the year (Stage A)

```text
0.  a. First-death transfers, plus: each asset the deceased owned alone, or
       jointly, passes to the survivor at its cost (no deemed sale, no probate);
       ownerShares becomes the survivor's. An asset marked "sell at the first
       death" is sold on this January 1 by the survivor.
    c. (new) Asset events on January 1, in this order: sales (including
       downsizes and vehicle replacements: the old vehicle is sold for its
       value), then purchases. A sale pays off the mortgage; the gain is
       value − cost (0 for the home; floored at 0 for personal-use property;
       a rental's or investment "other" loss carries forward like other
       capital losses). A purchase sets value = cost = the price grown to that
       year, and starts any new mortgage.
3.  Fixed income, plus per owner share: net rent (rent − costs − other
    expenses − mortgage interest; a negative amount reduces the owner's
    other income, AD19) as taxable otherOrdinary; the sale gains as
    realized capital gains. Rent is not pension income: it is never split,
    and it counts toward the OAS clawback.
5.  The solve target becomes spending need + asset cash out (costs and
    mortgage payments for every asset, plus this year's purchases), and
    after-tax cash includes asset cash in (rent and what the sales leave after
    paying off mortgages). Sale money therefore pays the sale's tax and the
    year's needs first (AD16). If everything available is short, the
    shortfall is put on the purchases first (purchaseShortfallNom, AD17), then
    on spending (shortfallNom, which Goal 1 reads). Asset costs never shrink
    with the spending phases or the survivor percentage.
6.  The surplus is deposited as today. The share of it that came from sale
    money goes to the selling owner (half each for a joint asset); the rest
    follows the existing shares. Both use one placeSurplus call, so they share
    TFSA room.
7.  (new, after price returns) Each held asset grows at its rate (never below
    $0), and each mortgage runs 12 monthly payments: interest at the monthly
    rate equivalent to the yearly rate compounded twice a year (AD18), the last
    payment capped at the remaining balance. Rent and costs for next year rise
    with inflation.
8.  At the second death: each asset the deceased holds is deemed sold at its
    end-of-year value. The gain follows the step 0c rules and is added to the
    final return. The estate adds asset values less mortgages. The probate
    base adds the assets that pass through the estate, less mortgages on real
    property only (AD22); a vehicle's loan is not deducted.
```

**Working years** (`project/workingYear.ts`) change only when "living costs while working" is entered (A8):

1.  Steps 0–4 as today, plus the asset events and asset income of steps 0c and 3.
2.  **Cash in:** pay after tax (from gross pay), asset cash in, and the after-tax yield, minimums and benefits that today go straight to savings.
3.  **Cash out:** living costs while working × the inflation factor (× the survivor percentage after a death), asset cash out including purchases, and the account savings the user set.
4.  **What's left** is deposited to the TFSA within room, then non-registered. **A gap** is drawn from non-registered savings, then the TFSA. Anything still short is a shortfall: purchases first, then living costs. A living-cost shortfall is recorded in `shortfallNom` and counts in Goal 1 (A9); a purchase shortfall stays apart, as in retired years.
5.  Tax on rent and gains uses each owner's working marginal rate, as for other income while working.

### Death and estate (O12, O23)

*   **Probate defaults:** RRSP/RRIF/LIF and TFSA accounts are assumed to name a beneficiary (the spouse, then the children), so they skip probate. Non-registered accounts pass through the estate and pay probate.
*   **The home:** before Stage A, an optional home value that counts toward the legacy and probate, is exempt from capital gains tax, and grows at the fixed inflation rate. A version 1 plan still runs this way through the migration; from Stage A the home is an asset (below).
*   These defaults were confirmed by the author (O23). Jointly held accounts are not modelled; every account has one owner.
*   **The final return and the estate.** In the second death year, after step 7, so on end-of-year balances. The spouse who dies last is "the deceased"; if both die in the same year, the first-death rollover moves the other spouse's accounts to them first (spouse 1 counts as dying first on a tie), so the final return covers every account.
    1.  **Deemed income:** every RRSP, RRIF, LIRA and LIF balance, converted or not, as `otherOrdinary` (it gets no pension credit); and the deemed sale of every non-registered position: value − original cost, summed over positions. Deemed gains are reduced by the deceased's carried-forward loss (after this year's update); a net deemed loss is not used. TFSA balances and the home are not income.
    2.  **One return:** the deceased's income for the year, after that year's pension split, plus the deemed income, taxed once with `personalTax` (the clawback recomputed on the full return). **Final-return tax** = that tax − the tax step 5 already settled for the deceased that year. A deceased spouse whose income was taxed at `workingMarginalRate` that year is taxed with `personalTax` on the full return instead.
    3.  **The home:** `estate.homeValueToday` × the year's deflator, if entered.
    4.  **Probate:** the estate pays the final-return tax first. Probate base = non-registered balances + the home − the final-return tax, not below 0. Probate = 0 if the base is at or below `ontario.probate.threshold`, else `ontario.probate.rate` × (base − threshold). The rounding up to each $1,000 in the Act is not modelled. Registered accounts and TFSAs skip probate (beneficiaries named).
    5.  **After-tax legacy** = all account balances + the home − final-return tax − probate.

    Final-return tax and probate are part of lifetime tax. They are paid from the estate, not from the year's cash, so the year's spending, deposits and the household identity are unchanged. The inputs for this section are on the [Estate tab](#estate-tab).

#### Assets at death (Stage A)

*   **"The home"** bullet is replaced. The home is a `realAssets` entry of kind `home`. It is the principal residence, so its gain is never taxed. At most one home is held at any time, and a sale and purchase in the same year (a downsize) are allowed.
*   **Joint assets** pass to the survivor at the first death outside the estate. Assets owned alone by the deceased roll over to the survivor at cost. Probate at the first death is not modelled.
*   **Final return:** deemed gains add every asset except the home. Each gain is floored at 0 for personal-use property; losses on a rental or an investment "other" reduce the gains, then the carried-forward loss applies as today.
*   **Probate base** = non-registered balances + asset values − mortgages on real property − the final-return tax, not below 0. A vehicle loan is not deducted. Source: the Ontario Estate Administration Tax Act, 1998, s. 1, which deducts only encumbrances on real property. The design states this rule in words; the config values `ontario.probate.*` don't change.
*   **The cottage comparison (AD20).** If a cottage is held at the second death, the final return is computed again with the cottage exempt and the home taxable. `cottageDesignation.finalReturnTaxDiffToday` is the difference, shown on the Estate tab.
*   **Sources for the rules without numbers,** to be read from the source pages when this amendment is built and cited in `config/SOURCES.md`'s rules section:
    *   the principal residence exemption (Income Tax Act s. 40(2)(b));
    *   the denial of losses on personal-use property (s. 40(2)(g)(iii));
    *   the deduction of interest on money borrowed to earn rent (s. 20(1)(c));
    *   rental losses against other income (CRA guide T4036);
    *   semi-annual compounding on mortgages (the federal Interest Act, s. 6).

    No numeric value comes from memory; the inclusion rate stays `federal.capital_gains.inclusion_rate`.

### Results and comparisons (O13)

#### Result definitions

*   **Spending covered:** whether after-tax cash meets the spending need in every year of the plan. If not, the result shows the first shortfall year and the total shortfall. It is labelled "assuming deaths at the target ages and the same return every year", followed by one sentence: "Real markets go up and down, and many sequences of returns would leave you with less than this." Whether the legacy goal is met is reported separately. A plan whose spending is covered only narrowly is flagged by the "Money runs out" near-miss warning ([Design values](#design-values-version-1)).
*   **Lifetime tax:** federal and Ontario income tax, the OAS clawback, final-return tax and probate, summed in today's dollars: each year's amount is divided by that year's display deflator before it is added. `runPath` adds up both sums, `lifetimeTaxNom` and `lifetimeTaxToday`, as plain numbers; this is the one place inside `project/` that uses the deflator, and it does not import the `TodayDollars` type. `totalShortfall` follows the same rule.
*   **After-tax legacy:** what the estate passes on after the second death, after final-return tax and probate (see [Death and estate](#death-and-estate-o12-o23)), in today's dollars. The strategy cards label it "Money left"; this document always calls it the after-tax legacy.
*   **Clawback years:** household years in which either spouse pays any clawback.

#### Comparisons

*   **Variants:** each run also computes, at the same returns:
    *   the placement baseline;
    *   the withdrawal strategies the user did not choose (see [Withdrawal strategies](#withdrawal-strategies-o7-o8)).

    A variant identical to the user's choice reuses the user's result. Each comparison reports lifetime tax paired with the after-tax legacy. When the two move in opposite directions, the app says so and explains why. Explanations are fixed templates, not generated text. The strategy comparison is shown on the strategy cards, against "Registered last"; there is no separate comparison box.
*   **The first year's sale:** the first rebalance sells some of the user's own non-registered positions to reach the preset's holdings. The tax on that year-one sale is shown as a separate line, and the placement comparison leaves it out, so the comparison shows only what the placement is worth from then on.
*   **No shape comparison:** with steady returns a safer growth-to-safety shape only lowers returns, so a comparison would always favour more stocks. The Savings tab says so instead of showing one.
*   **Detail:** the user's plan returns every row and every account, for the charts and their table views. The other strategies return summary numbers plus, per year, income by source, tax, amount moved to the TFSA and the spending need, so the Withdrawals chart can switch strategy without a rerun. The placement baseline returns summary numbers only.

#### Advice wording

All result text is conditional and comparative. Strategy, shape and preset names are descriptive, not "best" or "optimal". The disclaimer appears on first run, in the footer, and in every export; placeholder text is in `src/ui/content/disclaimer.ts` until O20 sets the final wording.

### Warnings (O14)

*   **Definitions:** each warning is one code object in `src/engine/warnings/definitions.ts`, holding its check (a pure function of the result), explanation, basis (the plan's results, or inputs), years covered, scope (per spouse or household), unit and related inputs. `warnings.json` holds only the numeric triggers and nudge steps. Repeated years collapse into one line ("first at 72, for 6 years").
*   **Starting set (8):** listed with their triggers in [Design values](#design-values-version-1). Not in version 1: "low chance of success" (it needs variable returns), "next tax bracket", "unbalanced incomes" and "contribution room exceeded" (covered by the bracket-filling strategy and the comparisons), and "high early withdrawal rate" (it would fire for intentional bridge-year draw-downs).
*   **Computed tips:** for a warning measured on the plan's results, the engine reruns the plan once with each related input nudged up and once nudged down by its configured step. It ranks the inputs by how much they move the warning and shows the top three with the size of the effect. Wording is always conditional: "Under these assumptions, delaying OAS by 2 years removes 4 of 6 clawback years."

### Design values (version 1)

The author's planning choices, stored in `planning.json` and `warnings.json`, each sourced as "author decision" with the date it was made.

**Growth-to-safety shapes (O26).** Change to the user's stock share, in percentage points, by years from the first retirement, joined by straight lines and held flat beyond the end points. The change is measured from the plan start, and clamping follows [Placement and the growth-to-safety shift](#placement-and-the-growth-to-safety-shift-o4-o5). Values:

| Shape (screen name) | Points |
|---|---|
| Keep my mix (`steady`) | 0 throughout |
| Get safer gradually (`gradual_shift`) | +10 at −10 years, −10 at retirement, −20 at +15 years |
| Safer around retirement (`safety_first_regrow`) | 0 at −5 years, −20 at retirement, 0 at +15 years |

**Starting mixes (O24).** Whole-percent share of each class, in the order Canadian, U.S., international, emerging, bonds, cash; the split within stocks is the same in all three:

| Mix | Shares | Stocks |
|---|---|---|
| Conservative (`conservative`) | 13/17/7/3/50/10 | 40% |
| Balanced (`balanced`) | 20/25/10/5/35/5 | 60% |
| Growth (`growth`) | 27/33/13/7/17/3 | 80% |

**Fee levels (O25).** Yearly fee, as a rate subtracted from each class's gross return: "Index ETFs" 0.20%, "Robo-advisor" 0.60%, "Mutual funds with an advisor" 2.00%. These are rough starting points the author accepted, not sourced figures; the user can pick "Custom" or change a level in Settings.

**Spending phases (O27).** Slower years from year 15 after the first retirement at 70% of active spending; later years from year 25 at 60%.

**Placement presets.** Fill order for each asset class (registered means RRSP/RRIF/LIRA/LIF). Cash follows the bonds column; U.S., international and emerging-market stocks follow the global stocks column:

| Preset | Bonds (and cash) | Global stocks (U.S., international, emerging) | Canadian stocks |
|---|---|---|---|
| Bonds sheltered first | Registered, TFSA, non-registered | TFSA, registered, non-registered | Non-registered, TFSA, registered |
| Growth tax-free first | Registered, non-registered, TFSA | TFSA, non-registered, registered | Non-registered, registered, TFSA |

**Optimistic-return limit:** FP Canada's guideline for the class + 0.5 percentage point (compound return, before fees), matching the deviation margin FP Canada allows planners (FP Canada Projection Assumption Guidelines 2026, section 3 d, as cited in the `planning.override_margin` entry). The engine calculates the limit from `planning.override_margin`; it is not a config value of its own.

**Warning triggers** (dollar amounts in today's dollars):

| Warning | Fires when | Measured on |
|---|---|---|
| Money runs out (near miss) | Spending is covered every year, but at the end of some year before the second death year the household's account balances (not the home) are less than 3 years of that year's spending need. It does not fire when spending is short, because Goal 1 already shows that | Plan |
| OAS clawback | A spouse's net income within $5,000 of the threshold, or above it | Plan |
| RRIF minimum forces extra income | Forced income more than $5,000 above need | Plan |
| Large registered balance at second death | More than $250,000 | Plan |
| Legacy goal missed | Below goal | Plan |
| Bridge years | Shortfall before both spouses' CPP and OAS have started | Plan |
| Survivor tax jump | Survivor's average tax rate up more than 5 points vs the last year as a couple | Plan |
| Money locked in a LIRA (AR2-L1) | Spending is short in a year while a LIRA (or a DC pension held as one) has not yet become a LIF. The warning names the account, the locked balance and the latest conversion age that would cover the shortfall. The 71 default stays (AR-S4) | Plan |
| Optimistic returns | Any override above its limit | Inputs |

**Nudge steps:**

| Input | Step |
|---|---|
| Active-years spending (every category's monthly amount, or the one total; input path `spending.active`) | ±5% (at stage 6 the `spending_phase_pct` nudge step becomes `spending_active_pct`) |
| Expected returns (for "Money runs out" only) | every class's return lowered by `planning.override_margin` (0.5 point); down only, since a higher return would be the optimistic case |
| CPP/OAS start age | ±1 year |
| Bracket level (when "Fill lower brackets first" is chosen) | the other level |
| Retirement year | ±1 |
| Survivor percentage | ±5 points |

**Other defaults:**

*   **Life expectancy target:** the age a person of that sex has a 25% chance of reaching, from FP Canada's Projection Assumption Guidelines. The guidelines give this by current age (rows every 5 years from 20 to 100), so `planning.life_expectancy.female` and `.male` are age tables. The default for each spouse uses the row at or below their current age (for example, age 63 uses the 60 row). A note next to the input says a lower target raises the risk of outliving the plan.
    *   **Filling the default:** `defaultLifeExpectancy(sex, age, cfg)` in `src/state/defaults.ts`, with age = `planStartYear` − birth year. The store fills a spouse's target once, when both birth year and sex are set and the target is still empty; it never replaces a value the user typed, and a later change of birth year or sex does not change it. Above the table's last row (100) the last row applies; the default is never below the current age + 1.
*   **Survivor spending:** 70%. A single person needs about 1/√2 ≈ 71% of a couple's spending to keep the same standard of living, according to the square-root household equivalence scale. The Estate tab gives this reason in one line.

### Data contracts

Definitions in a TypeScript-like notation; `src/engine/types.ts` is the code form. Money fields ending in `Today` are in today's dollars and fields ending in `Nom` are in future dollars. The fields are plain numbers named by that suffix; the branded types `TodayDollars` and `FutureDollars` in `src/engine/units.ts` mark the two sides of the conversions, and the lint rule in [Units and conventions](#units-and-conventions) keeps `TodayDollars` out of the year-by-year code. Validation ranges are in brackets.

```text
PlanInputs {
  schemaVersion: 1
  planStartYear: number [current year]                 // the year the values are entered; stored, not rechecked on load
  spouses: [SpouseInput, SpouseInput]
  accounts: AccountInput[]                  // at most 8 per spouse
  dbPensions: DbPensionInput[]              // at most 2 per spouse
  spending: {
    mode: 'by_category' | 'one_total',
    monthlyTotalToday,                       // used when mode = 'one_total'
    categories: { [categoryId]: {
      monthlyToday,                          // active years
      laterOverrideToday?: [slower: number | null, later: number | null] } },
    phases: [{ fromYear: number, keepPct: [0..100] }] x2   // slower, later;
                                             // fromYear counts from the first
                                             // retirement year (year 0);
                                             // 0 < slower.fromYear < later.fromYear;
                                             // keepPct of active
  }
  estate: { survivorPct [40..100], legacyGoalToday, homeValueToday? }
  investing: { mixId: 'conservative' | 'balanced' | 'growth' | 'custom',
               mix: { [assetClass]: pct },   // whole numbers summing to 100
               shapeId: 'steady' | 'gradual_shift' | 'safety_first_regrow',
               presetId: 'bonds_sheltered_first' | 'growth_tax_free_first',
               rebalance: boolean,
               returnOverride?: { [assetClass]: rate },
               feeLevel: 'index_etf' | 'robo' | 'advisor' | 'custom',
               customFee?: rate,
               mixFromAccount?: string }  // the account every mix follows (AR2-S1); screens only:
                                          // the store copies its mix into each account
  withdrawal: { strategyId: 'registered_last' | 'fill_brackets' | 'early_rrsp',
                bracketLevel: 'first_bracket' | 'oas_threshold' }
  ruleOverrides?: RuleOverrides             // from Settings: { [ruleKey]: { value, defaultTaxYear } }
}
SpouseInput {
  name: string,               // shown on the Household tab
  birthYear [1930..2000], birthMonth [1..12], sexAtBirth: 'F' | 'M',
  retirementYear, lifeExpectancyTarget [60..105],
  cppAt65Today?,             // monthly estimate at 65, as My Service Canada shows it
  cppAtStartToday?,          // or the estimate at cppStartAge (AR-H2); one of the two is required;
                             // an empty screen field uses federal.cpp.average_at_65
  cppStartAge [60..70], oasStartAge [65..70],     // both 70 in a new plan (AR-W2)
  yearsInCanadaAt65? [0..47],
  arrivedInCanadaYear?,      // or the year of arrival (AR-H4): years after
                             // federal.oas.residence.from_age by 65; neither means born in Canada
  workingMarginalRate? [0..0.6], afterTaxPayToday?,
  grossPayToday?             // or gross pay (AR-H5), which replaces both: the marginal rate on the
                             // next dollar and pay after income tax, CPP, CPP2 and EI
                             // (tax/payroll.ts); required while still working
}
assetClass = 'cad_equity' | 'us_equity' | 'intl_equity' | 'em_equity' | 'bonds' | 'cash'
AccountInput {
  id: string,                // '<type>-<owner>-<n>', e.g. 'rrsp-0-1'
  owner: 0 | 1, type: 'rrsp' | 'lira' | 'tfsa' | 'nonreg',   // DC pension money is a 'lira'
  balanceToday,              // rrsp, lira, tfsa; holdings are set by the preset
  annualContributionToday,
  positions?: { [assetClass]: { valueToday, originalCostToday } },
                             // nonreg only: needed because the first rebalance
                             // sells positions and realizes gains
  originalCostToday?,        // nonreg without positions: the cost of the whole balance (AR-S2)
  tfsaRoomToday?,            // TFSA only
  conversionAge?,            // RRSP->RRIF, LIRA->LIF [55..71]; 71 in a new account (AR-S4)
  lifUnlock50?: boolean,     // LIRA only
  mixId?, mix?,              // the account's own mix, with the own_mix preset (AR-S3)
  dcPension?: boolean        // a LIRA holding a defined contribution pension (AR-S6)
}
DbPensionInput {
  owner, lifetimeAnnualToday, startAge, bridgeAnnualToday?, bridgeEndAge?,
  indexing: 'full' | 'fixed' | 'none', indexRate?, survivorPct [0..100]
}
YearRow {
  year, spouse[0..1]: { age, alive, cppNom, oasNom, dbNom, payNom,
    withdrawals: { [accountId]: Nom }, forcedDrawsNom, realizedGainsNom,
    taxableIncomeNom, taxNom, clawbackNom, splitShare },
  accounts: { [accountId]: { startNom, contributionsNom, depositsNom,
    reinvestedYieldNom, withholdingNom, priceReturnNom, drawsNom, endNom } },
  balancesEndNom: { [accountId]: Nom },      // equals accounts[id].endNom
  cashYieldNom,                              // non-registered yield paid out as cash
  spendNeedNom, afterTaxCashNom, surplusNom, shortfallNom,
  estate: { deemedRegisteredNom, deemedGainsNom, finalReturnTaxNom, homeNom,
    probateNom, afterTaxLegacyNom }          // all 0 except in the second death year
}
// taxableIncomeNom is always the return's taxable income (line 26000), also for
// a spouse taxed at the working rate. In a working year, afterTaxCashNom and
// surplusNom are 0: what is saved appears as deposits.
PlanSummary { spendingCovered, firstShortfallYear?, totalShortfallNom, totalShortfallToday,
  lifetimeTaxNom, lifetimeTaxToday, afterTaxLegacyNom, legacyIsPreTax, clawbackYears,
  savedToTfsaNom, warningFacts }             // warningFacts is {} until stage 6;
                                             // legacyIsPreTax is false from stage 3;
                                             // lifetime tax includes final-return tax and probate
StrategyResult {                             // one per strategy, every run
  strategyId, summary: PlanSummary,
  rows: [{ year, incomeBySourceNom: { work, db, cpp, oas, registered,
           nonreg, tfsa }, taxNom, clawbackNom, savedToTfsaNom,
           spendNeedNom }]                   // for the Withdrawals chart
}
```

**Results for the screens.** `runPlan` returns a `Result`, the Worker's first message; `runTips` returns `Tips`, its second. Fields ending in `Today` are already divided by each year's deflator (`src/engine/results/`, outside the year-by-year code).

```text
Result {
  revision, appVersion,
  configStatus: ConfigStatus,                // as returned by configStatus(...)
  plan: { variantId, summary: PlanSummary, rows: YearRow[] },   // the user's plan, full detail
  goals: {
    spending: { met: boolean,
      yearsCovered, yearsTotal,              // counted from the first retirement year
                                             // to the second death year, both included
      shortYears: number[],                  // calendar years with a shortfall
      firstShortfallYear?, totalShortfallToday },
    legacy: { status: 'met' | 'missed' | 'no_goal',   // 'no_goal' when legacyGoalToday is 0
      afterTaxLegacyToday, goalToday,
      differenceToday }                      // legacy − goal; 0 with no goal
  },
  strategies: [StrategyResult & { vsRegisteredLast: Comparison }] x3,
                                             // in the order registered_last, fill_brackets,
                                             // early_rrsp; the chosen one reuses `plan`
  placement: { baseline: PlanSummary,
    vsBaseline: Comparison },                // each side's lifetime tax leaves out its own
                                             // year-one sale tax
  yearOneSale: { gainsNom, taxNom, taxToday },   // the user's plan; its own line on Savings
  estate: { year,                            // the second death year
    balancesToday, homeToday,                // at the end of that year
    deemedRegisteredToday, deemedGainsToday, // notes on the tax bar
    finalReturnTaxToday, probateToday, afterTaxLegacyToday },
  warnings: Warning[]                        // [] until stage 6 (Known gaps M1, warningFacts)
}
Comparison {                                 // this variant − the other
  lifetimeTaxDiffToday, legacyDiffToday,
  oppositeDirections: boolean }              // one better, the other worse: lower tax but a
                                             // smaller legacy, or the reverse (under $1 ignored)
Tips { revision,
  byWarning: { [warningCode]: Tip[] } }      // at most 3 per warning; filled in stage 6
Tip { inputPath, change: string,             // for example "+2 years"
  effect: number, text: string }             // conditional wording ([Advice wording](#advice-wording))
EngineError { revision, appVersion,
  kind: 'integrity' | 'unexpected',
  year?, variantId?, check?,                 // from EngineIntegrityError
  message }                                  // shown with "Copy details"
```

*   **The year-one sale tax:** the first year of the plan is solved a second time with the gains realized by its rebalance set to zero; `taxNom` is the difference in household tax (income tax and clawback) between the two solves. This is done for the user's plan and for the placement baseline. The placement comparison subtracts each one's sale tax from its lifetime tax; the after-tax legacy is left as computed.
*   **Goal 1** counts only the years from the first retirement to the second death; working years have no spending need.

**Engine state.** The year solver reads and returns one `PlanState` per year:

```text
PositionState { valueNom, costNom }            // costNom used for non-registered only
AccountState {
  id, owner: 0 | 1, type: 'rrsp' | 'rrif' | 'lira' | 'lif' | 'tfsa' | 'nonreg',
  holdings: { [assetClass]: PositionState },
  openedYear?,                                 // RRIF/LIF: the year it opened (no minimum)
  lifPrevEarningsNom?                          // LIF: last year's investment earnings
}
SpouseYearState { alive, age, working, carriedLossNom,
  tfsaRoomNom,                                 // room belongs to the person, shared by
                                               // all their TFSAs
  tfsaWithdrawnThisYearNom }                   // added back to room next January 1
PlanState { year, yearIndex, spouses: [SpouseYearState, SpouseYearState],
  accounts: AccountState[], splitShare: { from: 0 | 1, share }, firstDeathYear? }
Draw { accountId, amountNom, incomeType: 'pensionEligible' | 'otherOrdinary' | 'tfsa'
  | 'nonregPrincipal', realizedGainNom }
Variant { id, strategyId, presetId: PresetId | 'same_mix' }
NormalizedInputs                               // PlanInputs with every …Today field
                                               // replaced by …Nom at the plan start
EngineIntegrityError { year, variantId, check, before: PlanState, after: PlanState }
RuleOverrides = { [ruleKey]: { value, defaultTaxYear } }
YearInProgress { state: PlanState, inputs: NormalizedInputs,
  incomeSoFar: [TaxableIncome, TaxableIncome],   // each spouse's income so far this year
  drawsSoFar: Draw[] }                           // draws already taken this year
Death { spouse: 0 | 1, year }
```

*   **Input paths:** dotted text such as `spouses.0.cppStartAge` or `accounts.<id>.balanceToday`, used by `setInput` and by warning definitions.
*   **Spending need:** the active-years yearly need is 12 × the monthly total (the sum of categories, or the one total). For the slower and later phases, each category's amount is its override if set, otherwise its active amount × `keepPct`; in "one total" mode, the total × `keepPct`.
*   **Empty plan:** the defaults in `src/state/defaults.ts`, with life expectancy and survivor percentage from the config.
*   **Reference file:** `expected-rows.csv` has one row per `YearRow`, and its header is the `YearRow` fields flattened in the order above, with dotted names:
    *   `year`; then `spouse.0.<field>` for every `SpouseYear` field, then `spouse.1.<field>`;
    *   a record keyed by account id becomes one column per account id, sorted by id: `spouse.0.withdrawals.<id>`, `accounts.<id>.<field>` (each `AccountYear` field in order, all fields of one account before the next account) and `balancesEndNom.<id>`;
    *   the account ids are every id that appears in any row; a cell for an account with no entry that year is 0;
    *   then `cashYieldNom`, `spendNeedNom`, `afterTaxCashNom`, `surplusNom`, `shortfallNom` and `estate.<field>`;
    *   booleans are `true` or `false`; numbers are plain decimals with at least 2 places, no thousands separators. A test matches each money cell within $1, and every other cell exactly.

#### Assets (Stage A) data contracts

```text
PlanInputs {
  schemaVersion: 2                              // was 1; v1 files migrate on import and load
  ...every v1 field, except estate.homeValueToday, which moves to realAssets
  realAssets: RealAssetInput[]                  // at most 6 (A4)
  spending: { ...v1 fields,
    workingMonthlyToday?,                       // living costs while working (A7); empty = A8 rule
    assetCostsExcluded?: boolean,               // the A5 tick, for group amounts and one total
    heldForAssets?: { [categoryId]: number } }  // AD14: the amount kept while held at $0
}
RealAssetInput {
  id: string,                                   // '<kind>-<n>', e.g. 'cottage-1'
  kind: 'home' | 'cottage' | 'rental' | 'vehicle' | 'other',
  name: string,                                 // shown in lists and results
  owner: 0 | 1 | 'joint',                       // joint = 50/50 (AD6)
  owned: 'now' | { purchaseYear, priceToday },  // AD2: owned today, or bought later
  valueToday?,                                  // required when owned now
  originalCostPaid?,                            // required except for the home (AD12)
  growth: { mode: 'inflation' | 'inflation_plus' | 'fixed', pct? },   // AD13
  costs: { propertyTaxYearToday?, insuranceYearToday?,
           maintenanceYearToday?, utilitiesYearToday? },   // all optional; rise with inflation
  mortgage?: { balanceAtStart, ratePct, paymentMonthly },  // AD18; for a purchase: at purchase
  rent?: { monthlyToday, otherExpensesYearToday? },        // rental only
  sale?: { year } | { atFirstDeath: true },                // AD2, A3
  downsize?: { year, toPriceToday, newMortgage? },         // home only (A3)
  replaceEveryYears?,                                      // vehicle only (AD21)
  otherUse?: 'personal' | 'investment'                     // 'other' only (AD19)
}
PlanState { ...v1 fields, realAssets: RealAssetState[] }
RealAssetState { id, kind, ownerShares: [number, number],  // [1,0], [0,1] or [0.5,0.5]
  valueNom, costNom, held: boolean,
  mortgageBalanceNom, rateMonthly, paymentMonthlyNom,
  nextReplaceYear? }
YearRow { ...every v1 field unchanged,
  realAssets: {                                 // new record; the existing reference test ignores it
    [assetId]: { startNom, purchaseNom, growthNom, saleNom, endNom,
      costsNom, mortgageInterestNom, mortgagePrincipalNom, mortgageEndNom,
      rentNetNom, gainNom, ownerShares } },
  assetCashInNom, assetCashOutNom, purchaseShortfallNom }
IncomeBySourceNom { ...v1 fields, rent }        // net rent, for the Withdrawals chart
Result.estate { ...v1 fields, propertyToday, mortgagesToday,
  cottageDesignation?: { assetId, finalReturnTaxDiffToday } }   // AD20 comparison
```

*   **The engine still reads `estate.homeValueNom`** for the protected reference plan. Its normalized input keeps that field, and `estate.homeNom` keeps its meaning (the home value × the year's deflator). A v2 plan never sets it: its home is a `realAssets` entry with mode "with inflation", which produces the same numbers.
*   **Goal 1 (A9):** `Result.goals.spending` counts from the plan start, not the first retirement, when living costs while working are entered; the master design's "Goal 1 counts only the years from the first retirement" becomes conditional.
*   **Input paths:** `realAssets.<id>.<field>` (for example `realAssets.cottage-1.sale.year`), used by `setInput`, readiness messages and the change summary.

### Persistence

*   The plan's inputs (never results) autosave to localStorage under the key `rp.plan.v1`, one second after the last edit. Each save holds the schema version, the inputs, and metadata (saved time, app version). On startup the app loads that key if present.
*   **Two open tabs:** when another tab saves the plan (the browser's `storage` event), the app offers "Reload it, or keep this version". Otherwise the last save wins (see [Risks](#risks--mitigations)). There are no rolling backups: the export file is the lasting copy.
*   The app asks the browser to keep the data (persistent storage). If the browser refuses, or saving fails (storage full, private window), the app says so and prompts an export.
*   Export and import use the same JSON format, saved as `retirement-plan-<date>.json`, with the disclaimer in its metadata. On import, the file is checked against the schema. A file with a newer schema version is refused with a message naming the file's version and the app's version.
*   Version 2 arrives with Stage A. It saves under a new key (`rp.plan.v2`) and leaves the version 1 save in place, so rolling back the app never strands a plan.
*   **Schema version 2.** `src/state/persistence/migrate.ts` has one pure function, `migrateV1toV2`, run by Import, and by autosave when it arrives (stage 7), before the shape check. It:
    *   turns a `homeValueToday` above $0 into one home asset: owner joint, growth "with inflation", no costs, mortgage, sale or downsize;
    *   sets `realAssets` to `[]` otherwise;
    *   leaves `workingMonthlyToday` empty (A8);
    *   never fails on an unfinished draft.
*   **Import** accepts versions 1 and 2 and refuses anything newer, as today.
*   **Autosave** keys stay as designed: v2 saves under `rp.plan.v2`, and the v1 save is left in place.
*   **Acceptance test:** for every v1 test plan, the migrated plan gives a `Result` equal to the v1 result, apart from the new zero fields.
*   A "Load sample plan" button fills a made-up couple's data; the app otherwise starts empty (O15). All test fixtures use made-up households. The author's real numbers never enter the repository (see [Hosting](#hosting-and-repository-author)).

### Hosting and repository (author)

*   **Public GitHub repository `retirement-planner`, served by GitHub Pages.** GitHub Actions runs lint, type checks and all tests on every push and pull request. Only a green build of the `main` branch is deployed.
*   **The unlisted URL is the family release.** The page carries a `noindex` tag, and the URL is shared only with testers. Before it is shared any wider, O20 (disclaimer and FSRA check) must be resolved, `npm run config:check -- --strict` must pass (no unfetched or unvalidated default), and the app must move to its own origin (see [Risks](#risks--mitigations)). The strict check is a release gate, not a CI step; the engine already refuses to run with a missing rule value.
*   **No personal data in the repository.** Fixtures and the sample plan use made-up couples. The original prototype context document contains the author's real household figures, so it lives in `private/`, which git ignores. Copies with personal figures removed become the history documents in `docs/history/` (file 18). The author tests with real numbers by importing their own exported plan file locally; that file also lives in `private/`.
*   **Security policy by meta tag, in the built app only.** GitHub Pages can't set response headers, so the content security policy is added as a `<meta>` tag at build time by a small Vite plugin; local development runs without it. The app's page then cannot make network requests (fetch, XHR, WebSocket, form submissions). The Worker is created from a `blob:` URL, so it inherits the page's policy (`worker-src` allows `blob:`). What the policy does not cover:
    *   **navigation:** the policy cannot stop the page from navigating to another site; only the app's own bundled code runs, and it never does;
    *   **the shared origin:** other GitHub Pages sites under the same account share the `github.io` origin and can read the saved plan.

    Both are recorded in [Risks](#risks--mitigations).
*   **Supply chain:** `package-lock.json` is committed and CI installs with `npm ci`, so every build uses the reviewed dependency versions. `npm audit` runs in CI as a report-only step.
*   **No service worker, no analytics, no CDN.** All dependencies are bundled at build time. Built files carry content hashes, so a rollback is a revert commit followed by a redeploy.

### Performance

*   **Targets:** on the reference machine (the author's desktop with current Chrome; its CPU, cores and RAM are recorded in `README.md`), measured from the end of the 500 ms pause after the last edit:
    *   **under 1 second** for the first message: the user's plan, the placement baseline, and the two other strategies (4 runs of 30–45 years);
    *   **under 2 seconds** for the second message: the warning tips (about 100 more runs).
*   **Typing stays smooth:** a new edit cancels any run still in progress (the client terminates the Worker and starts a new one), so results never lag behind a burst of edits. Measured as: no main-thread task over 50 ms while a run is in progress, checked in the Chrome DevTools Performance panel.
*   **Early warning:** `runPath.test.ts` logs the time of one 40-year couple run in CI. Above 45 ms (the budget per run for about 22 runs in 1 second), the log says so; it does not fail the build.
*   **How it's checked:** timed by hand on the reference machine at the start of stage 4 and again before stage 8. If a target is missed, reduce work inside the year solver first, then run the other strategies with summary detail only. No streamed partial results or per-variant cache are built unless the speed check fails.
*   **Stage 4 check (2026-11-24),** the stage 3 engine timed in Node on the reference machine, middle value of repeated runs:

    | Plan | One run | First message (4 runs) | 100 tip runs |
    |---|---|---|---|
    | Reference plan, 34 years | 22 ms | 110 ms | 1.86 s |
    | Same plan, 45 years | 26 ms | 133 ms | 2.55 s |

    The first message meets its target easily. The tips miss theirs on the longest plans if there are 100 reruns; the author accepted this for now, because the real number of reruns depends on the warnings built in stage 6. The check is repeated before stage 8 with the real count, and the year solver is made faster then if the target is still missed.

### Verification (G10)

*   **Runtime invariants, checked every year of every run:**
    *   after-tax cash equals the spending need, or a shortfall is recorded;
    *   money is conserved, using the `YearRow` fields:
        *   for each account: start + contributions + deposits + reinvested yield − withholding + price return − draws = end;
        *   for the household in a retired year: draws + fixed income (including a working spouse's after-tax pay) + non-registered cash yield − tax − deposits = spending need − shortfall;
        *   for the household in a working year: CPP, OAS and DB collected + non-registered cash yield − tax = deposits (contributions come from outside the plan and appear only in the account identity);
    *   no balance or original cost is negative;
    *   RRIF and LIF draws respect their minimums and maximums;
    *   TFSA contributions stay within room.

    Checks compare within $0.05 (`INVARIANT_TOLERANCE` in `constants.ts`). If any check fails, the app shows an "engine integrity" error and no results. The error screen shows the app version, year, variant and failed check, with a "Copy details" button; with the user's exported plan, that is enough to reproduce the failure.
*   **Tests** (detailed in the implementation plan):
    *   tax fixtures from an outside calculator, matched within $1 per return;
    *   rule-value tests against the config;
    *   a full reference plan built by a separate AI session from the written design without seeing the engine code, matched within $1 per cell;
    *   property tests:
        *   the same inputs give the same result;
        *   higher spending never raises the after-tax legacy;
        *   swapping the spouses gives the same household totals, within 0.1% because surplus deposits after a death go to the survivor's first account by id (plans where the two spouses' inputs are identical are skipped, because the tie rules favour spouse 1);
        *   with zero tax the loop matches the closed-form annuity;
        *   moving money between two accounts of the same type and owner changes nothing;
        *   the chosen split never gives more tax than a 0% split;
        *   after-tax cash rises when the withdrawal rises;
        *   the split passes' household tax is never below the full nested search's, and stays within 1% of it (a test setting, not a rule value);
    *   the manual paid-tool comparison before stage 8;
    *   the manual speed check.

#### Assets (Stage A) verification

*   **New invariant checks, every year:**
    *   for each asset, start + purchase + growth − sale = end;
    *   for each mortgage, start + interest − payments − payoff = end, and the balance is never below 0;
    *   a sold asset holds $0;
    *   the household identity adds asset cash in and out, and the working-year identity uses the new cash flow when A8 doesn't apply.
*   **New property tests:**
    *   an asset that is only held (no costs, rent, mortgage or events) changes only the estate;
    *   swapping the spouses together with their sole-owned assets leaves the totals unchanged;
    *   the home never adds a taxable gain;
    *   after-tax cash still rises with W in a sale year (the bisection stays valid);
    *   a migrated v1 plan gives the v1 result.
*   **A second reference plan,** `tests/fixtures/reference-plan-assets/`, built by a separate session from this amended design (G10). It covers:
    *   a rental with a mortgage and one loss year;
    *   a cottage sold mid-plan;
    *   a joint asset across the first death;
    *   a downsize;
    *   a vehicle replaced twice;
    *   living costs while working.

    The household is made up to exercise every feature once (OA1).
*   **New tax cases:** a rental loss against pension income, and a sale-year gain that triggers the OAS clawback.
*   **Timing:** a speed case with 6 assets; the 1-second results and 2-second tips targets still hold.

### Screens

Six tabs, in this order, plus Settings: Household, Savings, Spending, Withdrawals, Estate and Results. The brief named three planning areas. Household is added because ages feed all three; accounts and pensions are on Savings, and death and legacy inputs on Estate, because the author expects users to look for them there. There is no results panel on the input tabs: each input tab shows the results that belong to it (the strategy cards and income chart on Withdrawals, the placement comparison on Savings), and the full results are one tab away. The layouts were settled with the author from clickable mockups on 2026-11-19.

**The mockups are part of this design.** The author's canvas "Retirement planner screens" (claude.ai artifact `TFyh6PGvTggAELyaKXqF88`) is copied into [docs/designs/mockups/](mockups/): one `.dc.html` file per screen (Household `Main`, Savings `Investing`, `Spending`, `Withdrawals`, `Estate`, `Results`, `Settings`, `FirstRun`, `States`) and `canvas.json`. They are normative for the look (colours, type, spacing, controls) and for each screen's content and wording, except where a later decision in this document overrides them (see [Where the mockups are overridden](#where-the-mockups-are-overridden)). Their numbers are illustrative, not engine output.

#### Look and feel

From the mockups, for every screen:

*   **Type:** Inter for text (14 px body, 12 px labels and notes), Space Grotesk 600 for the app name and page titles. The fonts are bundled with the app (the security policy blocks font services).
*   **Colours:** page `#F6F5F2`; cards and bars white with `#E3E1DC` borders; text `#1C1C1A`, labels `#5C5A55`, notes `#6B6964`; input borders `#CFCCC5`; links `#1D4ED8`; rule strips and quiet panels `#F3F2EE`; the tax-year chip `#EAF0FB` on `#1E3A8A`; the Results badge `#FDF3E1` on `#7A4100`; primary buttons `#1C1C1A` with white text.
*   **Shapes:** cards with 12 px corners and 20–24 px padding; inputs and buttons 8 px corners and at least 40 px tall; pill-shaped segmented choices on `#F3F2EE` with the chosen one white and bold; the chosen strategy card has a 2 px near-black border.
*   **Layout:** a white header (app name, the household's names, the tax-year chip, then Load sample plan, Import, Export and Settings as bordered buttons) and a white tab bar whose current tab is underlined in near-black and bold; content in a centred column up to 1280 px; fields in pairs on a two-column grid; the disclaimer in a white footer.
*   **Asset-class colours:** Canadian `#1E40AF`, U.S. `#3B6FD8`, international `#7FA3EA`, emerging `#B9CDF4`, bonds `#0F766E`, cash `#A8A59C`. **Income sources:** work `#C9C6BE`, workplace pension `#7C3AED`, CPP `#0F766E`, OAS `#5EBFB3`, RRSP/RRIF/LIF `#1E40AF`, non-registered `#D97706`, TFSA `#16A34A`.

#### Where the mockups are overridden

Later decisions win over the mockups: "Let the planner pick" (its card and its options row) is cut; the after-tax stock-share figure in the placement comparison is cut; the spouse's death age is labelled "Life expectancy target", not "Plan to age"; the screens say "the same return every year", not "steady average returns"; the fee levels show their values (0.20%, 0.60%, 2.00%), not "[fee]"; the LIF maximum table is the FSRA table now in the config; the warnings on Results arrive in stage 6, and Load sample plan, Import, Export and the saving and import messages in stage 7. The strategy cards colour only the after-tax legacy difference, and not when tax and legacy move in opposite directions (SR1-M12); the mockup coloured both. The mockups' "[Mockup: …]" notes are not part of the app.

**Defaults shown where they apply.** A rule value that matters to a screen is shown on that screen as a grey strip with the value and an "Edit" link to Settings (for example the CPP and OAS adjustment rates under the start ages, the TFSA yearly limit under Accounts, the bracket and clawback thresholds beside the Fill lower brackets levels, the probate rate on Estate).

#### Household tab

The profile of each spouse only: name, birth year and month, sex at birth, the age they retire at (AR-H1; the plan keeps the year), life expectancy target (with the note that a lower target raises the risk of outliving the plan), the CPP estimate at the start age set on Withdrawals (AR-H2; it starts at Service Canada's average CPP at 65 moved to that age, and the user replaces it with their own), the year they arrived in Canada (AR-H4; empty for someone born here), and gross yearly pay while working (AR-H5), with the marginal rate and take-home pay worked out from it.

#### Savings tab

*   Four sections that open and close, each with a one-line summary beside its title when closed; all of them start closed, Accounts included (AR2-S6, which replaces AR-S1):
    *   **Accounts:** a new plan has an RRSP, TFSA, LIRA and non-registered account for each spouse at $0 (AR-S2). The table takes each balance directly and shows each account's mix; Edit opens its yearly saving, conversion age (71 by default), unlock, TFSA room, original cost for a non-registered account, and its mix: Conservative, Balanced (default), Growth or Custom shares (AR-S3). "Add account", below the table (AR2-S2), adds another; each row has Edit and Remove, so an account can be removed without opening it (AR2-S3). Each account's mix has a toggle, "Use this mix for every account, workplace DC pensions included" (AR2-S1): turned on, every account (and any added later) takes that mix and follows it; changing another account's mix turns it off; turned off, each account keeps the mix it has. No TFSA-limit strip (AR-S5). Summary: total, by type, yearly saving.
    *   **Workplace pensions:** "Add pension" with a type, defined benefit or defined contribution (AR-S6), and an owner. A DC pension is a value, yearly contributions until retiring, a LIF conversion age, the unlock and a mix; it is held as a LIRA. Summary: who, how much, from what age, bridge, survivor share.
    *   **Returns and fees:** each class's expected return (editable), tiles for the expected return of the whole portfolio before and after fees (each account's balance and mix with each class's return, AR2-S4; while every balance is $0 the tiles and the summary say a balance is needed) and for inflation, the fee level with the custom fee box on the same row as the choices (AR2-S5), and "Rebalance once a year". Summary: expected return, fee, rebalancing.
    *   **As you get older:** the three shapes, each with a small line drawing; the shape moves every account's mix. With rebalancing off, the choice is disabled with the reason beside it. Summary: the chosen shape.
*   "Which account holds what" and its comparison are removed (AR-S3). A screen that waits for a complete plan names the sections still to fill in, never only "when the plan is complete" (AR-S7, AR-W4).
*   A note says each class earns the same return every year (FP Canada's long-run estimate), so a shape shows only its effect on returns, not on protection from a bad market; there is no shape comparison.

#### Spending tab

*   **Monthly and after tax:** the user enters what they would spend in a typical month early in retirement, after tax, in today's dollars, because that is how the author expects people to think about spending. Yearly totals are shown beside each phase.
*   **A group's own amount (AR-P1):** each group takes one monthly amount for the whole group. Entering it clears the group's categories; entering a category clears it, so the group's total is then the sum of its categories. A group amount follows the phases' usual change.
*   **Two ways to enter it:** "By category" (default) or "One total" (a single monthly amount). Switching keeps both sets of values, so switching back restores them. The first time the user switches to "One total", it starts from the sum of the categories.
*   **Categories (O17), in six groups that open and close, all closed at first (AR2-S6).** The ids are persisted and must not change once plans are saved:

    | Group | Categories (id) |
    |---|---|
    | Home and utilities | Mortgage and rent (`mortgage_rent`), Property tax (`property_tax`), Hydro (`hydro`), Gas and fuel (`gas_fuel`), Internet (`internet`), Mobile phone (`mobile_phone`) |
    | Getting around | Auto payment (`auto_payment`), Auto gas (`auto_gas`), Public transportation (`public_transit`) |
    | Insurance and banking | Home and auto insurance (`home_auto_insurance`), Life insurance (`life_insurance`), Disability insurance (`disability_insurance`), Bank fees (`bank_fees`) |
    | Food and drink | Groceries (`groceries`), Restaurants (`restaurants`), Fast food (`fast_food`), Alcohol and bars (`alcohol_bars`) |
    | Travel | Transportation (`travel_transport`), Accommodations (`travel_accommodation`), Food and drink (`travel_food_drink`), Activities (`travel_activities`), Travel insurance (`travel_insurance`), Gear (`travel_gear`), Shopping (`travel_shopping`) |
    | Everyday and other | Shopping (`shopping`), Pharmacy (`pharmacy`), Gifts and donations (`gifts_donations`), Cash (`cash`), Other (`other`) |

    Travel ids carry a `travel_` prefix, so travel shopping and everyday shopping stay separate. Every category is indexed to inflation, including fixed payments such as a mortgage; that is an accepted simplification, and "Different later?" covers a payment that ends.
*   **Three phases:** active years from the first retirement, which is year 0; slower years and later years each start at a year the user sets (counted from the first retirement, so "from year 15" means the first retirement year + 15; 0 < slower start < later start) and keep a share of active-years spending set by a slider from 0% to 100% in 5% steps. The slider is full at 100% ("Same as active years") and the user slides left to spend less; the label shows one number, for example "90% of active years". Defaults: O27.
*   **A different amount later for one category:** each category shows what it becomes in the slower and later years. "Different later?" opens two fields to enter those amounts instead (for example, an auto payment that ends, or pharmacy costs that rise); "Use the usual change" removes them. A group's header notes when any category in it has a different later amount ("Auto payment differs later", or "2 differ later").
*   **Later spending above slower spending (O28):** allowed (for example, for care costs). When the later share, or a category's later amount, is above the slower one, the Spending tab shows a one-line note saying so, so it is not mistaken for a typo.
*   Survivor spending and the legacy goal are on the Estate tab.

#### Withdrawals tab

*   **Setup sections, closed by default (AR-W1), with summaries; CPP and OAS start at 70 and conversions at 71 by default (AR-W2, AR-W3):** "When to start CPP and OAS" (each spouse's ages, with the adjustment rates as strips), "Converting RRSP and LIRA" (conversion ages and the 50% unlock). Pension income splitting is automatic and has no section here; its values are in Settings (AR2-W1). They come first because they are set once.
*   **"Which accounts pay for your spending"**, laid out to fit one laptop screen:
    *   three strategy cards in one row; the selected card has a dark border (no radio mark). Each card has the title and a "Learn more" button on its first line, a short description, and at the bottom, in bold, lifetime tax and the after-tax legacy (labelled "Money left"), then the difference from "Registered last" and the amount moved to the TFSA and clawback years. Only the after-tax legacy difference is coloured (green for more, red for less); the tax difference is neutral text. When the two move in opposite directions (lower tax but a smaller legacy, or the reverse), both are neutral text with a short note saying so;
    *   one options row of fixed height under the cards: the bracket level for "Fill lower brackets first", the draw-down years for "Early RRSP drawdown", or "No settings" for "Registered last";
    *   below, two columns: on the left, a stacked area chart of each year's money by source (before tax, today's dollars), with the spending need as a dashed line, spending need plus tax as a red line above it (the band above that is money not needed, saved to the TFSA or non-registered savings), and the source names in a legend below; a line of text under the chart explains how to read it. A year slider under the chart spans exactly the chart's x axis, from its first year to its last, so its handle's centre sits on the chart's year line (AR-W5). Until the plan is complete, the chart area lists the missing details by tab, each a link (AR-W4). On the right, that year's breakdown: always the same 11 rows in the same order (each of the seven sources, tax, OAS clawback, moved to the TFSA, spending need), with a dash for zero, so nothing moves when the strategy or year changes.
*   **Fixed layout:** switching strategy changes only numbers and chart shapes; nothing below the cards moves, so the user can click between strategies and compare.

#### Estate tab

*   "When one of you dies": the survivor spending percentage (default 70%, with the reason in one line), the first death assumed at the earlier life expectancy target, and a list of what changes at the first death (accounts roll over, OAS stops, CPP survivor benefit and DB survivor share start, single-person tax).
*   "What you leave behind": the after-tax legacy goal, the home (from Stage A, a pointer to the home on the Assets tab), the probate rate as a strip with an Edit link to Settings, the beneficiary assumption from [Death and estate](#death-and-estate-o12-o23), and a note on the final return.

#### Results tab

Three sections, in this order; there is no year-by-year table.

*   **Your goals.** Two cards side by side, each with a "Met" or "Missed" badge:
    *   **Goal 1, spending covered every year:** the number of years covered out of the plan's years, a strip with one block per year (red for a short year), the first shortfall year and total shortfall if any, the "assuming deaths at the target ages and the same return every year" label with its sentence on real markets, and a link to Spending.
    *   **Goal 2, the legacy goal:** the projected after-tax legacy (including the home, after final-return tax and probate) against the goal set on Estate, the amount above or below it, a bar with the goal marked, and a link to Estate.

    Below the cards, one line: lifetime tax, OAS clawback years, and what the last change did (for example "switched to 'Fill lower brackets first' · tax 6,000 lower · legacy 1,000 higher").
*   **Warnings,** each with its computed tips and links to the related input.
*   **Charts,** one at a time, chosen with buttons: **Balances** (stacked areas by account type: RRSP/RRIF, LIRA/LIF, workplace DC pension, non-registered, TFSA; LIRA and LIF have their own band so money locked until a LIRA becomes a LIF shows apart, AR2-R3; a DC pension, held as a LIRA, has its own band, and a band with no money in any year is left out, AR2-R4; a DB pension has no balance and shows only as income), **Income by source** (the Withdrawals chart for the chosen strategy, with the spending need), **Tax by spouse** (a stacked bar per year for each spouse, income tax including any clawback, after splitting), and **Estate** (a waterfall from balances and the home at the second death, less final-return tax as one bar, with the deemed registered income and deemed gains as notes on it, less probate, to the after-tax legacy, with the legacy goal marked). The yearly charts mark the first death. Balances and Income by source have a year slider under the x axis and a line with that year's values (AR-R1); the Estate chart shows each bar's value on the bar (AR-R2) and has no tooltip (AR2-R2). Each chart has a "View as table" option with the same data, for screen readers.

A status line reads "Up to date · updates as you edit", "Updating…", or, for a plan that is not ready to run, "Enter the missing details to see results" above the list of what is missing. The badge on the tab label shows the warning count, "Incomplete", "Updating", "Short from <year>" or "Error".

#### Assets tab and the changes to other tabs (Stage A)

*   **Assets tab** (between Savings and Spending), laid out like the Savings Accounts list, as drawn in the approved mockup [Assets.html](mockups/Assets.html) (OA6, 2026-11-26):
    *   one section, closed at first (AR2-S6);
    *   a table of assets (name, kind, owner, value, mortgage, and a line saying what happens: "Sold 2041", "Replaced every 10 years");
    *   Edit and Remove on each row, and "Add asset" below, with a kind menu.
    *   The editor shows only the fields of the chosen kind, driven by `assets/kinds.ts`, with growth's three modes and the plan's inflation rate beside them.
    *   Each asset card says it is sold only in the year set, never to cover a shortfall.
    *   A seventh asset can't be added (A4).
*   **Spending tab:**
    *   **Category holds:** a category whose cost an asset now carries shows "Counted on Assets: <asset names>", held at $0, with its old amount kept (AD14). The holds are mortgage and rent (a home mortgage), property tax, and auto payment (a vehicle loan). "Home and auto insurance" is held only when the home and every vehicle carry their insurance on Assets; until then it stays editable, with a notice naming the insurance already on Assets (A10).
    *   **Overlap notice:** a group amount or "One total" shows the A5 notice and its tick box.
    *   **New field:** "Living costs while working (monthly)", with the A8 rule stated while it's empty.
*   **Estate tab:**
    *   the home field becomes a line pointing to Assets;
    *   "What you leave behind" adds property and mortgages, and the cottage comparison line.
*   **Withdrawals breakdown:** grows from 11 to 14 rows (AD23): rent (net), asset costs and mortgage payments, and sales and purchases. The chart gains a "Rent" source.
*   **Results:**
    *   Balances gains a "Property less mortgages" band.
    *   The Estate waterfall gains a property bar and a mortgages bar.
    *   Goal 1 counts every year with a need: retirement years, and working years when living costs while working are entered (A9). Its strip marks a year short on spending or living costs. A purchase shortfall shows as its own line under the goals.

#### Settings

*   Opened from the header, not a tab. Laid out by the author's review (AR2-T1, 2026-11-26):
    *   **A section list** on the left shows one section at a time; on a phone it becomes a menu above the section. Each entry has badges counting its changed values and its values not yet checked against the source. Sections, grouped by what they affect: Income tax (brackets, credits, surtax, tax reduction, Health Premium), Payroll deductions (CPP, CPP2 and EI while working), Canada Pension Plan (amounts, start age, survivor), Old Age Security (amount, years in Canada, clawback), RRSP, RRIF, LIRA and LIF (conversion, the RRIF minimum and LIF maximum tables, pension splitting, the TFSA limit), Investments (returns and yields, inflation, withholding, fee levels), Estate (probate), and Planner defaults (read-only reference; the placement presets are not shown).
    *   **Filters and search** across all sections: "All", "Changed" and "Not checked yet", with counts, and a search by name. A filter or a search lists the matching values grouped by section. The config notice's "See Settings" opens the "Not checked yet" list; an Edit link on another tab opens the section holding its value.
    *   **One row per value:** its plain name (never a config key), the value, then the default if changed, "Grows with inflation", the source and a "Not checked yet" badge, and Reset when changed. Single values can be changed; tables and the other keys listed in the [Config contract](#config-contract) are shown read-only. Wide tables scroll inside their section.


## Alternatives Considered

Each entry is an option that was rejected. "By author" means the document's author decided; where each decision is recorded is listed under [Decisions made for this plan](#decisions-made-for-this-plan). "In design" means the design chose without asking the author.

### Product scope (decided during the brainstorm)

#### Alternative A: Phases that feed one into the next in one direction only

*   **Pros**: Simpler mental model (fill in Spending, then Investing, then Withdrawals); fewer stale-result states.
*   **Cons**: A warning in Withdrawals sends the user back two steps to guess at a fix; the effect of one area on another is hidden.
*   **Decision**: Rejected by author: the point of the product is to change any area and see the effect on the others.

#### Alternative B: A Recalculate button

*   **Pros**: No runs while the user is still typing; results change only when the user asks, so they are easy to follow.
*   **Cons**: The main use of the Withdrawals tab is clicking between strategies and comparing, which a button press after each click would interrupt; results can be out of date without the user noticing.
*   **Decision**: Rejected by author in favour of live recalculation. With fixed returns a run is fast enough. The risks of live results are handled by a 500 ms pause after the last edit, cancelling runs that a newer edit makes stale, keeping the old figures on screen (faded) while a run is in progress, and sending the warning tips in a second message.

#### Alternative C: Random returns and stress paths

*   **Pros**: Shows sequence risk, a chance of success, and what the growth-to-safety shift protects against, which steady returns can't.
*   **Cons**: Needs volatility and correlation figures to source and validate, generated paths, named stress paths and percentiles; results are harder to trace, test and explain.
*   **Decision**: Rejected by author for version 1 in favour of one fixed return per class. The cost is stated on screen: results use the same return every year, and a safer shape shows only its lower return (see [Risks](#risks--mitigations)). Variable returns are a [future improvement](#future-improvements).

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
*   **Cons**: Requires the author to build and understand every rule by hand, which the author judged likely to stall the project.
*   **Decision**: Rejected by author. Rule values come from published sources in a config the admin validates. The loop is checked by runtime invariants, a reference plan built by a separate AI session, and a rough comparison with a paid tool. A rule both AI sessions misunderstand can slip through.

#### Alternative K: DB pension commuted value (lump sum instead of pension)

*   **Pros**: Covers a real decision some members face.
*   **Cons**: Depends on plan funding, indexing and health; a comparison reads as advice; adds a new comparison type.
*   **Decision**: Rejected by author for version 1: too little teaching value for the risk of reading as advice. Listed under [Future Improvements](#future-improvements).

### Architecture (decided during drafting)


#### Alternative L: Random inflation on each path, or fixed inflation plus a high-inflation stress test

*   **Pros**: Shows inflation risk to unindexed income, such as some DB pensions, and to non-indexed thresholds.
*   **Cons**: More figures to source and test; per-path conversion to today's dollars; harder to explain.
*   **Decision**: Rejected by author in favour of one fixed rate, which is simpler to test and explain; the cost is that results do not reflect inflation risk (see [Risks](#risks--mitigations)).

#### Alternative M: Placement by an editable priority list, or by a mix entered for each account

*   **Pros**: Lets users describe their real holdings or test their own ideas.
*   **Cons**: Harder screens and testing; drifts toward hand-optimizing. A per-account mix also lets the overall mix drift against the growth-to-safety shift.
*   **Decision**: First rejected by author in favour of two named presets compared with a baseline. Reversed by the author's stage 5 review (AR-S3, 2026-11-25): each account has its own mix, so the plan describes real holdings; the presets and the placement comparison leave the screens. The growth-to-safety shape moves each account's mix.

#### Alternative N: Count the overall mix after tax

*   **Pros**: A fair placement comparison: the difference reflects tax only, not hidden extra risk.
*   **Cons**: The mix won't match statements; needs an expected tax rate assumption and an explanation.
*   **Decision**: Rejected by author in favour of face value. The placement text explains in one sentence that part of a benefit can come from holding more stocks after tax.

#### Alternative O: One fixed withdrawal order, or a user-defined order

*   **Pros**: Fixed: simplest. User-defined: most flexible.
*   **Cons**: Fixed: nothing to compare, and it handles early retirement with deferred CPP/OAS badly. User-defined: many combinations to test, and odd orders silently cost tax.
*   **Decision**: Rejected by author in favour of three named strategies compared at the same returns, including "Early RRSP drawdown" to show the early-retirement lesson directly.

#### Alternative P: User-set points for the growth-to-safety shift

*   **Pros**: Can match the user's real mix.
*   **Cons**: More to explain and test; extreme shapes allowed.
*   **Decision**: Rejected by author in favour of three named shapes, consistent with the placement presets and simpler to test. The user sets today's mix, so results start from their actual portfolio, and the shapes change that mix over time.

#### Alternative Q: Hand-written warning tips

*   **Pros**: No extra runs; predictable, reviewable wording.
*   **Cons**: Same tips for every plan; a tip can point at an input that does little in this plan.
*   **Decision**: Rejected by author in favour of computed nudges, which fit each plan. Each nudge reruns the plan once.

#### Alternative R: Svelte, or no framework

*   **Pros**: Svelte: less code, simple stores. No framework: no dependency churn.
*   **Cons**: Svelte: in the author's experience AI agents know it less well and mix Svelte 4 and Svelte 5 syntax. No framework: much more hand-written screen code to keep consistent as the screens grow.
*   **Decision**: Rejected by author in favour of React, where the author expects AI agents to write the most conventional, fixable code; that matters more here than bundle size.

#### Alternative S: Fixed-point iteration for the yearly tax solve

*   **Pros**: Simple to write; the prototype used it.
*   **Cons**: Not guaranteed to converge near the clawback and credit phase-out cliffs. The prototype used a damped version with 15 iterations and no defined failure behaviour.
*   **Decision**: Rejected in design. Bisection converges here as long as after-tax cash rises with the gross withdrawal, which a property test checks.

#### Alternative T: Equalize-incomes rule for pension splitting

*   **Pros**: One calculation, no search.
*   **Cons**: Ignores the clawback, age-amount reduction and Health Premium steps, so it can pick a split that costs more tax.
*   **Decision**: Rejected in design in favour of trying 0–50% in 5% steps in both directions, re-solving the year while the best split changes (see [Withdrawal strategies](#withdrawal-strategies-o7-o8)).

#### Alternative U: Cloudflare Pages / Netlify, or a downloadable file

*   **Pros**: Cloudflare/Netlify: free with a private repository, real security headers, preview builds. Downloadable file: no server at all.
*   **Cons**: Cloudflare/Netlify: a second service account. Downloadable file: no automatic updates, and browsers restrict Web Workers and storage for pages opened from a local file.
*   **Decision**: Rejected by author in favour of GitHub Pages with a public repository: one free service for code, tests and hosting. Personal data is kept out of the repository, and the header and origin gaps are recorded in Risks.

#### Alternative V: IndexedDB instead of localStorage

*   **Pros**: Larger storage limits; asynchronous access doesn't block the page.
*   **Cons**: More code and an extra library or wrapper for a plan under 100 KB.
*   **Decision**: Rejected in design: localStorage's synchronous access is simpler and the plan is small. Both are cleared by the same browser rules, so neither is more durable.

### Screens and settings (decided from the mockups)

#### Alternative W: Results panel beside every tab

*   **Pros**: Headline numbers always in view while editing.
*   **Cons**: Takes a quarter of the width on every tab; repeats numbers each tab already shows where they matter (strategy cards, placement comparison).
*   **Decision**: Rejected by author in favour of a Results tab, last in the row, with a badge for warnings and status.

#### Alternative X: Yearly admin refresh of every rule value as the only way values change

*   **Pros**: Every value in use is sourced and validated.
*   **Cons**: A recurring task for the admin; users can't test "what if" values or correct a value themselves.
*   **Decision**: Rejected by author: defaults ship with the app, and the user can change any rule value in Settings. Changed values are marked and saved with the plan; a refresh of the defaults is optional.

#### Alternative Y: A fee for each asset class

*   **Pros**: Matches fund-by-fund portfolios.
*   **Cons**: Users rarely know a fee per class; the total fee level matters far more than how it splits.
*   **Decision**: Rejected by author in favour of one fee from named levels, set in Settings.

### Assets (decided 2026-11-26, Stage A)

#### Alternative Z: Build Assets in three slices

*   **Pros**: Slice 1 (properties counted only at the second death, with value, original cost and growth) needs no change to the withdrawal solve, Spending or the strategies, and only an additive schema change. Slice 2 adds sales and downsizing; slice 3 adds rent, mortgages, purchases, joint ownership and vehicles. Each slice is small enough to test fully before the next.
*   **Cons**: The schema, the reference plan and the screens change three times, and the plan stays partly wrong (no rent, no mortgage) until the last slice.
*   **Decision**: Rejected by author: everything is built in one stage (AD8), so the plan file, the second reference plan and the tab are designed once.

#### Alternative AA: Compile assets into yearly amounts before the run

*   **Pros**: One pure function turns every asset into per-year need, money in, taxable income and estate amounts, and the solver reads only those. It is the simplest to test, and asset kinds become presets over a few flags.
*   **Cons**: It fails as soon as a rule must react to the plan's state, for example a later rule to sell an asset when money runs out. It also works out deaths and their handovers a second time outside the solver; deaths are at fixed ages today, so the two would agree, but only while that stays true.
*   **Decision**: Rejected by author in favour of a stepped module (A2): asset state lives in the yearly state, and only `src/engine/assets/` changes it.

#### Alternative AB: Assets stepped by the year solver itself

*   **Pros**: Any rule can react to the plan's state; no separate module boundary.
*   **Cons**: Every solver step learns asset rules, both the working-year and retired-year paths need the same code, and tests have to go through the whole solver.
*   **Decision**: Rejected by author in favour of a stepped module (A2), which keeps asset rules in one folder that both paths call.

#### Alternative AC: A full tax treatment for every asset kind

*   **Pros**: Businesses (selling shares and the lifetime capital gains exemption), collectibles (the listed personal property rules) and prescribed annuities would each be taxed correctly.
*   **Cons**: Each kind needs its own rules, its own sourced config values and its own tests, for kinds no test household has named.
*   **Decision**: Rejected by author in favour of one generic "other asset" with ordinary income and capital gains rules only, and a switch for personal-use or investment (AD19).

#### Alternative AD: Capital cost allowance on rentals

*   **Pros**: It matches what landlords claim on their T776: lower tax each year, with the claimed amount taxed back on a sale or at death.
*   **Cons**: It needs the building's cost apart from the land, a class rate and a recapture rule, and it moves tax between years rather than changing totals much.
*   **Decision**: Rejected by author: net rent is taxed without it, and Known gaps says so.

#### Alternative AE: Default growth rates from the config

*   **Pros**: A sensible run with fewer numbers to enter.
*   **Cons**: Every default must come from a published source (AGENTS.md), and no single source covers homes, cottages, rentals and vehicles in Ontario.
*   **Decision**: Rejected by author: the user enters each asset's growth, choosing "with inflation", "inflation plus or minus X%" or "fixed X% a year" (AD13).

#### Alternative AF: Pay covers asset costs while working

*   **Pros**: No change to the working-year path; asset costs and mortgage payments before retirement are assumed paid from pay, as living costs are today.
*   **Cons**: The plan can't show a couple who can't afford a purchase or a mortgage while working, and leftover pay is never saved.
*   **Decision**: Rejected by author: working years get a full cash flow (AD15) with one flat amount for living costs (A7). An empty amount keeps the old rule (A8).

#### Alternative AG: Living costs while working by category, or as a percentage of retirement spending

*   **Pros**: By category matches how retirement spending is entered; a percentage needs no new amount.
*   **Cons**: By category doubles the Spending screen; a percentage ties working-year costs to a guess about retirement.
*   **Decision**: Rejected by author in favour of one monthly amount that switches to the retirement amounts at the first retirement (A7).

#### Alternative AH: Leave Spending as it is, or move amounts on migration

*   **Pros**: Leaving it needs no code; moving amounts would clear double counting without the user doing anything.
*   **Cons**: Leaving it double-counts every asset cost already in Spending. Moving amounts guesses wrongly when a category mixes asset and living costs ("Mortgage and rent", "Home and auto insurance") and can't split a group amount or a one-total plan.
*   **Decision**: Rejected by author in favour of holding a matching category at $0 with its amount kept (AD14), and a notice with a confirming tick for group amounts and one total (A5).

#### Alternative AI: Sale money saved in full, or used only for the sale's tax

*   **Pros**: Simpler cash flow in the sale year.
*   **Cons**: The plan would draw taxable RRIF money for the year's spending while depositing the sale money to the TFSA, raising lifetime tax for no reason.
*   **Decision**: Rejected by author: sale money pays the sale's tax and the year's needs first, and the rest is saved (AD16).

#### Alternative AJ: Skip or refuse a purchase that savings can't cover

*   **Pros**: No shortfall line for purchases.
*   **Cons**: Skipping hides the problem; refusing blocks the whole plan over one year.
*   **Decision**: Rejected by author: the purchase always happens, funded through the withdrawal strategy, and any money missing shows as a labelled purchase shortfall (AD17).

#### Alternative AK: Simpler mortgages

*   **Pros**: Monthly compounding, or only a payment and an end year, needs fewer inputs.
*   **Cons**: Monthly compounding overstates interest on a Canadian mortgage, and a payment-only mortgage gives no balance to pay off on a sale or at death.
*   **Decision**: Rejected by author in favour of the statement's balance, rate and fixed payment, with interest compounded twice a year (AD18).

#### Alternative AL: Rental losses floored at zero

*   **Pros**: Net rent is never negative, so the tax code never sees negative income.
*   **Cons**: It overstates tax for a rental with a large mortgage, which is the usual case in its first years.
*   **Decision**: Rejected by author: a rental loss reduces the owner's other income (AD19).

#### Alternative AM: The user picks the principal residence

*   **Pros**: A couple with a cottage that gained more than the home could designate it.
*   **Cons**: The real choice is made year by year with a formula. A plain switch would let a user mark a property that doesn't qualify.
*   **Decision**: Rejected by author in favour of the home always being the principal residence, with the cottage designation shown as a comparison on the Estate tab (AD20).

#### Alternative AN: Vehicles as falling value only, or no vehicles

*   **Pros**: Far less code: a vehicle almost never has a taxable gain.
*   **Cons**: Its real cost, replacing it every few years, would stay invisible.
*   **Decision**: Rejected by author: a vehicle is replaced every N years, each replacement a purchase net of the old vehicle's value (AD21).

#### Alternative AO: Probate on gross values, or with every loan deducted

*   **Pros**: One rule for every asset kind.
*   **Cons**: Gross values overstate probate when there's a mortgage; deducting every loan understates it, because Ontario deducts only debts secured on real property.
*   **Decision**: Rejected by author in favour of Ontario's rule (AD22).

#### Alternative AP: A larger cap, or a cap per kind

*   **Pros**: Room for more property and vehicles.
*   **Cons**: Each asset adds work every year of every run, and the 100 tip runs are already near the 2-second target.
*   **Decision**: Rejected by author in favour of 6 assets in all (A4).

#### Alternative AQ: Additive version 1 schema, or changing version 1 before release

*   **Pros**: No migration code.
*   **Cons**: An additive change leaves two places for the home; changing version 1 strands exports already made.
*   **Decision**: Rejected by author in favour of version 2 with a migration that gives identical results (AD11).

## Non-Functional Requirements

*   **Privacy and security:**
    *   The app's page cannot make network requests (see [Hosting](#hosting-and-repository-author) for what this covers and doesn't).
    *   There is no analytics, no third-party script, and no CDN.
    *   Imported files are validated against the schema before use, and invalid files are rejected with a message.
    *   The public repository never contains real household data.
*   **Correctness:**
    *   Runtime invariants are checked on every run, and a failure blocks results.
    *   Rule values come from the config, whose validation status is shown, or from the user's own changes in Settings, which are marked as changed wherever they appear. Before the URL is shared beyond testers, every default must be validated (the strict config check in [Hosting](#hosting-and-repository-author)).
    *   The tax year of the defaults, the validation status and the number of changed values are visible on screen.
*   **Performance:** results within 1 second and tips within 2 seconds of the end of the 500 ms pause after the last edit, on the reference machine (see [Performance](#performance)). Typing stays smooth while runs are in progress.
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

## Risks & Mitigations

| Risk | Impact | Mitigation or acceptance |
|---|---|---|
| Security policy set by meta tag only | Doesn't cover navigation | Accepted. The Worker inherits the policy through its `blob:` URL; only bundled code runs, and the page can't make requests ([Hosting](#hosting-and-repository-author)) |
| Compromised npm dependency | Could send data out from bundled code | Lockfile, `npm ci`, `npm audit` report; few runtime dependencies |
| Shared github.io origin | Other Pages sites under the same account can read saved plans | Accepted for the family release. Before public release: dedicated GitHub account or organization, or a custom domain |
| Browser storage cleared | Lost plan | Export is the durable copy; app prompts export when persistence is refused |
| Export files unencrypted | Financial data readable by anyone with the file | Accepted; stated in G7 and next to the export button |
| Two tabs open on the same plan | The last save wins, and one tab's edits can be lost | When another tab saves, the app offers to reload that version or keep its own; otherwise accepted ([Persistence](#persistence)) |
| AI reference plan shares the engine's misreading of a rule | Wrong numbers pass tests | Outside tax fixtures, property tests, paid-tool comparison; admin-validated config |
| Fixed inflation | Results ignore inflation risk, notably for unindexed DB pensions | Accepted ([Alternative L](#alternative-l-random-inflation-on-each-path-or-fixed-inflation-plus-a-high-inflation-stress-test)) |
| Fixed death ages | Results ignore longevity risk | Accepted; 25%-survival default and "assuming deaths at the target ages" label |
| Fixed returns | Sequence risk is not shown: a bad market early in retirement can do lasting damage the plan doesn't reveal, and a safer shape shows only its lower return | Accepted for version 1 ([Alternative C](#alternative-c-random-returns-and-stress-paths)); screens say each class earns the same return every year; variable returns are a future improvement |
| Full rebalance every year | Realizes gains real investors might avoid | Accepted; applied equally to the user's plan and baselines |
| Foreign withholding simplified | Single rate assumes Canadian-listed funds | Accepted; stated in the placement explanation |
| Face-value mix counting | Placement benefit may include hidden extra risk | One sentence in the placement text says so |
| Public URL reachable before O20 | Release beyond family before the FSRA check | `noindex`, URL shared only with testers; O20 before wider sharing |
| 1-second target missed | Live results lag behind edits | Cancel stale runs; at most 3 split passes; reduce work in the year solver; summary-only rows for the other strategies |
| User-changed rule values | A mistyped value in Settings gives wrong results that look official | Range checks on each override; "changed" marks, the default beside each change, and the "N values changed" header chip; Reset per value |
| Defaults not refreshed each year | Values in use drift from current rules, and can be several years old; users are in effect asked to source changed values themselves | The header shows the defaults' tax year and the notice names it; indexed values grow from that year, not the plan start; changed values say which year's default they replaced; Settings shows each value's source as a link; refreshing stays possible with the admin procedure |
| Schema change after a rollback | Saved plans unreadable | New schema saves under a new key; old save kept |
| Open question O20 | The disclaimer and the FSRA check may change wording or scope | Closed before the URL is shared beyond testers ([Open Questions](#open-questions)) |

## Glossary

The terms users see in the app; `src/ui/content/glossary.ts` uses them for tooltips. Terms used only in this document are defined where they first appear.

| Term | Meaning |
|---|---|
| After-tax legacy ("money left") | What the estate passes on after the second death, after the final return's tax and probate, in today's dollars |
| Bridge (DB pension) | A temporary top-up some DB pensions pay until an end age, usually when CPP or OAS starts |
| Clawback (OAS recovery tax) | OAS repaid at the recovery rate (15% in 2026) on income above a yearly threshold, measured before the clawback itself is deducted |
| Compound return | The yearly return that, earned every year, gives the same growth as the long-run estimate; the app uses the same return every year |
| CPP / OAS | Canada Pension Plan / Old Age Security, the two federal retirement benefits |
| DB pension | Defined-benefit workplace pension, paying a set amount for life |
| DC pension | Defined-contribution workplace pension; its money is entered as a LIRA |
| Draw-down years | Under "Early RRSP drawdown", the years from the first retirement until both spouses' CPP and OAS have started |
| Final return | The tax return filed for the year of the second death, which taxes registered accounts in full and investments as if sold |
| Health Premium | Ontario's health charge, collected with income tax |
| Life expectancy target | The age the plan assumes a spouse lives to; by default, the age a person of that sex has a 25% chance of reaching |
| Lifetime tax | Income tax, the OAS clawback, the final return's tax and probate over the whole plan, in today's dollars |
| LIRA / LIF | Locked-in retirement account / life income fund: locked-in pension money, with yearly minimum and maximum withdrawals once it's a LIF |
| Mix | The share of the household's investments in each asset class, across all accounts |
| Original cost (adjusted cost base) | What was paid for investments in a non-registered account; gains are measured from it |
| Pension income splitting | Moving up to half of eligible pension income to the other spouse's tax return |
| Placement | Which account holds each kind of investment |
| Probate (Estate Administration Tax) | Ontario's tax on assets passing through a will |
| RRSP / RRIF | Registered retirement savings plan / registered retirement income fund (an RRSP after conversion, with yearly minimum withdrawals) |
| Sequence risk | The risk that bad returns early in retirement do lasting damage (not shown in version 1) |
| TFSA | Tax-free savings account |
| Today's dollars | Amounts in the money of the year the plan is made, with inflation taken out |

## Additional Resources

*   [concepts_brief.md](../../concepts_brief.md): the brainstorm brief this design implements.
*   `private/retirement-planner-context.md` (not committed): the prototype's decision log and defect list, history only; summarized without personal figures in [docs/history/](../history/).
*   [Canadian Retirement Income Calculator](https://www.canada.ca/en/services/benefits/publicpensions/cpp/retirement-income-calculator.html) (Government of Canada): the reference for input vocabulary.
*   [FP Canada Projection Assumption Guidelines](https://www.fpcanada.ca/planners/projection-assumption-guidelines): the return, inflation and life expectancy assumptions planners in Canada use.
*   [config/SOURCES.md](../../config/SOURCES.md): the source page for every rule value (CRA, Service Canada, Ontario, FSRA), and [docs/admin-config-guide.md](../admin-config-guide.md): how the defaults are fetched and validated.

## Future Improvements

*   **Variable returns:** random markets and named stress paths, to show sequence risk, a chance of success, and the value of the growth-to-safety shift.
*   **Other provinces:** new jurisdiction modules and config files; Quebec needs separate pension and tax handling.
*   **Single people and a general "other income" stream:** not needed by the test group (O16); for a public release.
*   **Per-category survivor percentages:** survivor spending by category instead of one percentage.
*   **Random inflation:** inflation that varies by year, linked to returns, to show inflation risk to unindexed income.
*   **Editable placement and growth-to-safety settings:** priority lists and user-set points, once the presets have been tested.
*   **Narrow screens:** the three strategy cards and the chart beside the year breakdown need a stacked layout below desktop width.
*   **"Let the planner pick":** a search across strategies and bracket levels that picks the one best meeting a goal.
*   **"Bad start" variant:** one extra run with low returns in the years after retirement and high returns later, same compound return, to show sequence risk.
*   **DB commuted value comparison, sync between devices, mobile layout, PDF export.**

## Detailed Implementation Plan

### Known gaps from review

Findings from the design reviews that are still open. Each id's prefix names its review, all under [docs/reviews/](../reviews/):

*   no prefix: the implementation-readiness re-run of the first full review ([2026-11-17/implementation_readiness_report_r2.md](../reviews/2026-11-17/implementation_readiness_report_r2.md));
*   `FR-`: the focused review of the fixed-returns revision ([2026-11-18/](../reviews/2026-11-18/focused_review_report.md));
*   `SR1-`: the focused review of the screen revision ([2026-11-19/focused_review_report.md](../reviews/2026-11-19/focused_review_report.md));
*   `SR-`: items raised by the screen revision itself (2026-11-19);
*   `B5-`: found while building stage 5 (2026-11-24).

The second full review (2026-11-19) was triaged with the author on 2026-11-24; its decisions are in [build-decisions.md](../history/build-decisions.md). Closed and withdrawn rows are in [closed-known-gaps.md](../reviews/2026-11-24/closed-known-gaps.md).

**Rule:** each open Major is closed in this document before the stage in its "Close before" cell starts. Nits are fixed when their file is built.

| Finding | Gap | Close before |
|---|---|---|
| M1 | `NormalizedInputs`, the engine state, the `YearRow` fields, the reference CSV columns and the `Result` contract are defined in [Data contracts](#data-contracts). Still open: the `warningFacts` content and the `Warning` type | Stage 6 |
| B5-1 | The Config contract says fee levels can be changed in Settings, but only single-value (`number`) keys can be overridden, and `planning.fee_levels` is one structured value, so Settings shows it read-only. The Custom fee covers other fees. Decide: split it into three number keys, or keep it read-only and change the contract's wording | Stage 7 |
| B5-3 | Closed 2026-11-26. The author's stage 5 review is built, and the ten config keys it added are validated with the other twelve unvalidated entries (all 86 are now validated). The tax treatment of payroll contributions is sourced: CRA's list of deductions and credits puts lines 30800 (base CPP) and 31200 (EI premiums) under federal non-refundable tax credits and line 22215 (enhanced CPP, CPP2) under net income as a deduction. The author then moved `federal.oas.base_at_65` to the October–December 2026 amount ($762.50, was $742.31 for January–March); the reference test holds the fixture's build-time value (`AS_BUILT` in `referencePlan.test.ts`), since fixture files are not rebuilt without the author | Done |
| B5-4 | The author's second stage 5 review (2026-11-25) is built (every item in [stage5-review-2.md](../reviews/2026-11-25/stage5-review-2.md)). The hand check behind AR2-R1 found two engine conventions the author may want to look at: foreign dividends in sheltered accounts lose withholding tax (about 0.2% a year with an equity-heavy mix), and each year's yield is credited before the price return, so it compounds within the year (about +0.04% a year) | Author review, before `stage-5` |
| B5-5 | Decided by the author (2026-11-26, AR2-L1): a LIRA set to become a LIF at 71 cannot pay for spending until then; the 71 default stays, and stage 6 adds the "Money locked in a LIRA" warning (Warning triggers) | Stage 6 |
| BA-1 | No capital cost allowance or recapture on rentals; tax on a rental differs from a T776 that claims it | Future improvement |
| BA-2 | The home is always the principal residence and a cottage always taxable; the "plus one" year formula and designating by year are not modelled (the Estate tab shows only the cottage comparison) | Future improvement |
| BA-3 | No probate at the first death; no property outside Ontario | Future improvement |
| BA-4 | No land transfer tax, HST, commissions or legal fees on sales and purchases | Future improvement |
| BA-5 | Joint ownership is 50/50 only; no owners outside the couple | Future improvement |
| BA-6 | Mortgages keep their payment to the end: no renewals, HELOCs, reverse mortgages or refinancing | Future improvement |
| BA-7 | The rule citations in Death and estate were written from memory while drafting; each is read from its source page and recorded in `config/SOURCES.md` before step 5 is built | Stage A, step 1 |
| SR-4 | Open question O20 (O24, O27 and O28 resolved 2026-11-24; O31 withdrawn) | Before the URL is shared beyond testers |

The work is built in stages. Each stage ends with its tests passing in CI and a git tag (`stage-0` … `stage-8`, and `stage-assets` for Stage A); stages 0 to 3 are done. The working rules for agents (whole-function rewrites, protected files, units) are in [file 13](#13-agentsmd-and-claudemd-exists-stage-0), `AGENTS.md`.

**Stage order:**

| Stage | Content | Gate before starting |
|---|---|---|
| 0 | Repository setup, conventions documents, config contract and 2026 values, tax fixtures, placeholder app | O16 checked with the test friends (done 2026-11-19) |
| 1 | Tax for one person (`jurisdiction/*`, `tax/personalTax.ts`) | `federal.json` and `ontario.json` validated |
| 2 | Couple engine with fixed returns: `units`, `accounts/*`, `benefits/*`, `withdraw/*` (the three strategies), `tax/split.ts`, `solver/*`, `project/workingYear.ts`, `project/runPath.ts`, the first-death transfer in `project/death.ts`, `invest/*`, rule overrides, invariants. See the [stage 2 file boundary](#stage-2-file-boundary) | O25, O26, O29 (all resolved); the author enters and validates `market.us_equity.yield`, `market.intl_equity.yield`, `market.em_equity.yield`, `market.cash.yield` (author decisions, O30) and `market.cash.geometric_return` (FP Canada) |
| 3 | Deaths and estate (`project/death.ts`); reference plan test | — |
| 4 | Variants, the strategy runs, comparisons, results, Worker | Speed check of the stage 3 engine on the reference machine (done 2026-11-24; [Performance](#performance)) |
| 5 | Store, screens (six tabs and Settings), live recalculation, change summary; the plan schema from file 43, which the readiness check uses | O24, O27, O28 (resolved 2026-11-24) |
| A | Assets (the Assets amendment; [Stage A files](#stage-a-assets-files)) | `stage-5` tagged (done 2026-11-26); the Assets tab mockup approved (OA6, done 2026-11-26); BA-7 rule sources read |
| 6 | Warnings and computed tips | — |
| 7 | Saving, export/import, sample plan | — |
| 8 | Testing with the author and two friends | Paid-tool comparison done; speed check passed |

Every gate also includes the [Known gaps](#known-gaps-from-review) rows whose "Close before" cell names that stage. A row marked "(during)" is closed by code, tests or config built within that stage, and closes by the stage's tag.

### Target Files to Create/Modify

#### Stage 2 file boundary

The files stage 2 may create or change. Anything not listed here is out of bounds for stage 2.

*   **Create:**
    *   `src/engine/units.ts`;
    *   `src/engine/accounts/rrspRrif.ts`, `liraLif.ts`, `tfsa.ts`, `nonRegistered.ts`;
    *   `src/engine/benefits/cpp.ts`, `oas.ts`, `db.ts`, `survivor.ts`;
    *   `src/engine/withdraw/registeredLast.ts`, `fillBrackets.ts`, `earlyRrsp.ts`, `surplus.ts`;
    *   `src/engine/tax/split.ts`;
    *   `src/engine/solver/bisect.ts`, `yearSolve.ts`, `startOfYear.ts`, `incomeAssembly.ts`;
    *   `src/engine/project/initialState.ts`, `spendingNeed.ts`, `workingYear.ts`, `runPath.ts`, and `death.ts` with `firstDeathTransfer` only;
    *   `src/engine/invest/returns.ts`, `glide.ts`, `placement.ts`, `rebalance.ts`;
    *   `src/engine/config/overrides.ts`;
    *   `src/engine/invariants.ts`;
    *   a `README.md` in each new folder (`accounts`, `benefits`, `withdraw`, `solver`, `project`, `invest`);
    *   `tests/unit/helpers/couplePlan.ts`, the unit test files whose Stage column says 2, `tests/property/helpers/zeroTax.ts` and the stage 2 property test files (file 57).
*   **Modify:**
    *   `src/engine/constants.ts` (`SOLVER_MAX_STEPS`), `types.ts` (engine state, `YearContext.jurisdiction`, `PlanSummary` totals, `RuleOverrides`);
    *   `src/engine/config/read.ts` (`ageTable`, `planValue`), `load.ts` (`rebaseConfig`, `configStatus` with overrides), `schema.ts` (`checkValue` export, `planning.fee_levels` schema), `keys.ts` (comments only);
    *   `src/engine/jurisdiction/types.ts` (`lifMaxFactor`, `unlockShare`; its comment about `lifLimits` is replaced) and `ontario.ts`;
    *   `tools/configCheck.ts` (passes `{}` for overrides; prints `yieldWarnings`) and `tools/lib.ts` (adds `yieldWarnings(bundle): string[]`, so the warning can be tested without running the script);
    *   `tests/unit/taxContext.ts` (adds `jurisdiction`), `tests/unit/config.test.ts` (the three-argument `configStatus`, passing `{}`);
    *   `.github/workflows/ci.yml` (`ENFORCE_COVERAGE`) and `vitest.config.ts` (the non-engine glob);
    *   `config/2026/planning.json` (`planning.fee_levels` values from O25, recorded as "author decision, 2026-11-19", validated by the author) and `config/2026/market.json` (only the values the author enters for the stage 2 gate);
    *   `docs/units-and-conventions.md` (a worked `rebaseConfig` example);
    *   `src/engine/README.md`, `src/engine/config/README.md`, `src/engine/jurisdiction/README.md` (LIF values only; rules in `accounts/liraLif.ts`), `src/engine/tax/README.md` (`split.ts`) and `tools/README.md` (`configStatus` with overrides; `yieldWarnings`).

#### Repository and build (stage 0)

##### 1. `./.gitignore` (Exists, stage 0)

*   **Type / Scope**: Git configuration.
*   **Proposed Changes**: None. It ignores `private/`, `node_modules/`, `dist/`, `coverage/`, `playwright-report/` and `test-results/`.

##### 2. `./.gitattributes`, `./LICENSE`, `./private/retirement-planner-context.md` (Exists, stage 0)

*   **Type / Scope**: Line endings (LF), MIT licence, private history (not committed).
*   **Proposed Changes**: None. The licence stays MIT unless the author chooses another before the repository is made public.

##### 3. `./package.json` and `./package-lock.json` (Exists, stage 0)

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
    | happy-dom, @testing-library/react, @testing-library/user-event | current majors at stage 5 | dev (added at stage 5) |
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

##### 4. `./.nvmrc` (Exists, stage 0)

*   **Proposed Changes**: `22`.

##### 5. `./tsconfig.json`, `./tsconfig.base.json`, `./tsconfig.app.json`, `./tsconfig.worker.json`, `./tsconfig.node.json` (Exists, stage 0)

*   **Type / Scope**: TypeScript configuration as project references.
*   **Proposed Changes**: `tsconfig.base.json` holds the shared options: all strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and the path alias `@engine/*` → `src/engine/*`. The others extend it.
    *   `app`: `lib: ["ES2022", "DOM"]`, includes `src` except `src/worker`.
    *   `worker`: `lib: ["ES2022", "WebWorker"]`, includes `src/worker` and `src/engine`.
    *   `node`: includes `tools`, `tests`, `src/engine`, `src/worker/protocol.ts` and `src/worker/client.ts` (so the tests can import them), and the config files. `worker` also loads the `vite/client` types, for the inline Worker import.
    *   Add `src/vite-env.d.ts`.

##### 6. `./vite.config.ts` (Exists, stage 0)

*   **Type / Scope**: Build configuration.
*   **Proposed Changes**:
    *   Plugins: React, `vite-tsconfig-paths`, and a small CSP plugin (`transformIndexHtml`, `apply: 'build'`) that inserts the CSP and `noindex` meta tags into the built `index.html`.
    *   `base: '/retirement-planner/'`.
    *   Worker format `es`; output files named with content hashes.

    CSP content:

    ```text
    default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self' blob:;
    img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none';
    base-uri 'none'; object-src 'none'
    ```

##### 7. `./vitest.config.ts` (Exists, stage 0; changed at stage 2)

*   **Type / Scope**: Test configuration.
*   **Proposed Changes**:
    *   Include `tests/{unit,property,reference}/**/*.test.ts`; exclude `tests/e2e/**`.
    *   Coverage with v8, enforced when `ENFORCE_COVERAGE=true` (set in `ci.yml` by the last commit of stage 2): 90% branches for `src/engine/**`; 70% for `src/{state,ui,worker}/**` From the stage 5 preparation (2026-11-24): 90% for `src/engine/**`, 80% for `src/{state,worker}/**` and 70% for `src/ui/**`; the globs do not overlap. Tests include `*.test.tsx`, for the screen tests.

##### 8. `./playwright.config.ts` (Exists, stage 0)

*   **Type / Scope**: End-to-end test configuration.
*   **Proposed Changes**:
    *   Chromium only; `testDir: 'tests/e2e'`.
    *   `webServer`: `npm run build && npm run preview -- --port 4173`.
    *   `baseURL: 'http://localhost:4173/retirement-planner/'`.

##### 9. `./eslint.config.js`, `./.prettierrc`, `./.prettierignore` (Exists, stage 0)

*   **Type / Scope**: Lint and formatting.
*   **Proposed Changes**:
    *   `.prettierignore` lists `docs/`, `*.md`, `package-lock.json`, `config/**/*.json`, `src/engine/config/bundle.ts`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`. Markdown and config JSON keep their hand-written layout; Prettier formats code only.
    *   `@typescript-eslint/no-magic-numbers` in `src/engine/**`, ignoring `[0, 1, -1, 2, 100]`, with `ignoreNumericLiteralTypes: true` (so types such as `schemaVersion: 1` pass), `ignoreEnums: true`, `ignoreReadonlyClassProperties: true` and `ignoreArrayIndexes: true` (which `federalBasicAmount` relies on). The only exempt file is `src/engine/constants.ts`, which also holds `MONTHS_PER_YEAR = 12`.
    *   `ignores`: `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `private/`, `src/engine/config/bundle.ts`.
    *   `no-restricted-imports`:
        *   `src/engine/**` may not import `src/ui/**` or `src/state/**`;
        *   `src/engine/{solver,project,simulate}/**` may not import the `TodayDollars` type.
    *   `react-hooks` rules for `src/ui/**`.

##### 10. `./index.html` and `./src/main.tsx` (Exists, stage 0; replaced at stage 5)

*   **Type / Scope**: App entry.
*   **Proposed Changes**:
    *   `index.html`: a root element, a `<noscript>` message, and a module script pointing to `src/main.tsx`. It contains no CSP; the build plugin adds it.
    *   `src/main.tsx` at stage 0 renders "Under construction"; stage 5 replaces it.

##### 11. `./.github/workflows/ci.yml` (Exists, stage 0; changed at stage 2)

*   **Type / Scope**: CI pipeline.
*   **Proposed Changes**: Runs on every push and pull request, on `ubuntu-latest`, in this order:
    1.  `actions/checkout`;
    2.  `actions/setup-node` with `node-version-file: .nvmrc` and npm cache;
    3.  `npm ci`;
    4.  `npx playwright install --with-deps chromium`;
    5.  `npm run config:check`, `typecheck`, `lint`, `format:check`;
    6.  `npm test -- --coverage`. The last commit of stage 2 (the one tagged `stage-2`) adds `env: { ENFORCE_COVERAGE: 'true' }` to this step, so coverage is enforced from that commit on and never while stage 2 is half built;
    7.  `npm run build`;
    8.  `npm run test:e2e`;
    9.  `npm audit --omit=dev`, with `continue-on-error: true` (report only).

##### 12. `./.github/workflows/deploy.yml` (Exists, stage 0)

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

##### 13. `./AGENTS.md` and `./CLAUDE.md` (Exists, stage 0)

*   **Type / Scope**: Instructions for AI coding agents. `CLAUDE.md` contains one line pointing to `AGENTS.md`.
*   **Proposed Changes**: None. The rules are as committed in `AGENTS.md`, in these sections: Values, Protected files, Code, Personal data, Before finishing, Stages. Change that file, not this entry.

##### 14. `./README.md` (Exists, stage 0)

*   **Type / Scope**: Project documentation.
*   **Proposed Changes**:
    *   what the app is, and the disclaimer;
    *   how to run it locally;
    *   how tests work;
    *   the reference machine's CPU, cores and RAM;
    *   how the config is updated each year (link to the admin guide);
    *   the rule that no personal data is committed.

#### Documentation (stage 0)

##### 15. `./docs/designs/retirement-planner.md` (Exists, stage 0)

*   **Proposed Changes**: This document. Updated when a decision changes.

##### 16. `./docs/reviews/` (Exists, stage 0)

*   **Type / Scope**: Review history.
*   **Proposed Changes**: None. One folder per review date:
    *   `2026-11-17/`: the first full review (zoom-out, comprehension, critic, intermediate zoom-out and implementation-readiness reports, the readiness re-run `implementation_readiness_report_r2.md`, and `goldfish_review_report.md` with the author's resolutions);
    *   `2026-11-18/`: the focused review of the fixed-returns revision;
    *   `2026-11-19/`: the focused review of the screen revision, the drift report, and the second full review (the same report set as 2026-11-17);
    *   `2026-11-24/`: the stage 2 decisions with their options, and the Known gaps rows closed that day.

    `concepts_brief.md` stays at the root.

##### 17. `./docs/units-and-conventions.md` (Exists, stage 0; changed at stage 2)

*   **Type / Scope**: Normative reference for engine authors.
*   **Proposed Changes**: The rules from [Units and conventions](#units-and-conventions) with worked examples:
    *   converting a today's-dollar input with `normalizeInputs`;
    *   first-year pro-rating by birth month;
    *   the RRIF start-of-year age;
    *   mixed working/retired years;
    *   same-year deaths.

##### 18. `./docs/history/decision-log.md` and `./docs/history/prototype-postmortem.md` (Exists, stage 0)

*   **Type / Scope**: Project history, written from `private/retirement-planner-context.md` with personal figures removed.
*   **Proposed Changes**:
    *   The decision log covers the prototype's product summary, reference material, feature set, architecture choices and UX rules.
    *   The post-mortem covers what went wrong (the patch cycles, mixed units, missing tax, untested code) and the defect list.

    Both carry a note that the prototype's calculation model is superseded by this design. `docs/history/build-decisions.md` (added 2026-11-24) records the decisions made while stages 2 and 3 were built.

##### 19. `./docs/admin-config-guide.md` (Exists, stage 0)

*   **Type / Scope**: Admin procedure for fetching or refreshing the default values. Done for 2026; repeating it in later years is optional, since users can change rule values in Settings.
*   **Proposed Changes**:
    1.  Two separate AI sessions each fetch every tax and benefit rule (`federal.json`, `ontario.json`) listed in `config/SOURCES.md` into a candidate file. One of them also fetches the market assumptions (`market.json`) and the life-expectancy tables (`planning.life_expectancy.*`). fsrao.ca pages are fetched with curl. The admin reads Ontario probate from the Estate Administration Tax Act.
    2.  Run `npm run config:compare` on the two tax and benefit candidates (`federal.json`, `ontario.json`).
    3.  The admin resolves each disagreement against the source page, and spot-checks the values fetched once against the source pages.
    4.  The admin sets each entry's validation status, name and date, and updates `config/CURRENT_YEAR`.
    5.  Run `npm run config:bundle` and `npm run config:check -- --strict`.
    6.  Commit.

    Planning choices other than life expectancy are reviewed in the same pass but not fetched.

##### 20. `./config/SOURCES.md` (Exists, stage 0)

*   **Type / Scope**: Key list and sources.
*   **Proposed Changes**: Exactly the keys in `src/engine/config/keys.ts` (see the [Config contract](#config-contract)), each with its unit, its official page URL and where on the page the value appears. Planning-choice keys are marked "author decision". `config:check` fails if this file and `keys.ts` disagree.

#### Config (stage 0)

##### 21. `./config/CURRENT_YEAR` and `./config/2026/{federal,ontario,market}.json` (Exists, stage 0; `market.json` changed at stage 2)

*   **Type / Scope**: Rule values, following the [Config contract](#config-contract).
*   **Proposed Changes**: Every key in `SOURCES.md`, fetched and validated per the admin guide. `market.json` holds:
    *   FP Canada returns for the six classes and inflation;
    *   one cash yield per class (author decisions, O30);
    *   the foreign withholding rate.

##### 22. `./config/2026/planning.json` and `./config/2026/warnings.json` (Exists, stage 0; `planning.json` changed at stage 2)

*   **Type / Scope**: The author's planning choices, plus FP Canada's life-expectancy tables.
*   **Proposed Changes**: The values in [Design values](#design-values-version-1):
    *   `planning.shapes` and `planning.presets`;
    *   `planning.mixes` (O24), `planning.fee_levels` (O25, values set at stage 2), `planning.spending_phases` (O27);
    *   `planning.override_margin`;
    *   `planning.survivor_spending`;
    *   `warnings.triggers` and `warnings.nudge_steps`;
    *   `warnings.triggers` and `warnings.nudge_steps`. At stage 6, `warnings.triggers.money_runs_out` changes from `final_years: 5` to the near-miss trigger (3 years of spending) and `warnings.nudge_steps` gains the returns step ([Design values](#design-values-version-1)). `warnings.triggers` is validated, so the author makes that change;

    Each author value is sourced as "author decision" with the date of the decision.

#### Engine (stages noted per file)

##### 23. `./src/engine/constants.ts` (Exists, stage 0; changed at stage 2)

*   **Proposed Changes**:
    *   `MONTHS_PER_YEAR = 12`
    *   `SOLVER_PRECISION = 0.01`
    *   `SOLVER_MAX_STEPS = 40` (enough to narrow $10 billion to $0.01)
    *   `SPLIT_STEP = 0.05`
    *   `MAX_SPLIT_PASSES = 3`
    *   `SPLIT_TIE_TOLERANCE = 1e-6`
    *   `BENEFIT_REFERENCE_AGE = 65`
    *   `INVARIANT_TOLERANCE = 0.05`
    *   `WEIGHT_SUM_TOLERANCE = 1e-9` (planning weights must sum to 1)
    *   `CONFIG_YEAR_MIN = 2000`, `CONFIG_YEAR_MAX = 2100` (sanity range for a config entry's tax year)
    *   `MAX_FEE = 0.05` (the highest fee level the `planning.fee_levels` schema accepts)
    *   `OVERRIDE_RANGES` (the override ranges by unit, from the [Config contract](#config-contract))

##### 24. `./src/engine/config/keys.ts`, `./schema.ts`, `./load.ts`, `./bundle.ts`, `./read.ts`, `./overrides.ts` (Exists, stages 0–2)

*   **Proposed Changes**:
    *   `keys.ts`: the code copy of the [Config contract](#config-contract)'s key list. Each key has its file, value kind and whether it is an author decision.
    *   `schema.ts`: Zod schemas for the entry shape, each value kind and each structured planning value. Stage 2 exports `checkValue(spec: KeySpec, value): string[]` for reuse by `overrides.ts`, and adds the `planning.fee_levels` schema, `Record<'index_etf' | 'robo' | 'advisor', rate 0..0.05>`.
    *   `bundle.ts`: generated by `tools/configBundle.ts`. It imports the JSON files for `CURRENT_YEAR`.
    *   `load.ts`:
        *   `checkBundle(bundle)`, which lists missing, unknown and malformed keys;
        *   `loadConfig(): Config`, which validates the bundle and returns the entries, converting `CAD_per_month` amounts to `CAD_per_year` (× 12; a null value stays null);
        *   `rebaseConfig(cfg, planStartYear): Config`, rebasing by value kind as in [Units and conventions](#units-and-conventions);
        *   `toAnnual` also records `publishedUnit` on each loaded entry, so overrides of monthly keys can be converted;
        *   `configStatus(config, overrides: RuleOverrides, today): { taxYear, unfetchedKeys: string[], unvalidatedKeys: string[], overriddenKeys: string[], staleOverrideKeys: string[], outOfDate: boolean }` (`tools/configCheck.ts` passes `{}`);
        *   `configDefaults()`, which returns the values shown next to user overrides (stage 4).
    *   `overrides.ts`: `validateOverride(key, value, overrides, cfg): string[]` (kind via `checkValue`, unit range, structure and cross-key checks, per the [Config contract](#config-contract)), `applyRuleOverrides(cfg, overrides): Config` (reuses `toAnnual`), and `dropInvalidOverrides(overrides, cfg): { kept: RuleOverrides, dropped: { key, value, reasons: string[] }[] }` for import.
    *   `read.ts`: the typed reads (`plain`, `amount`, `list`, `brackets` with the never-falling thresholds, `phaseIn`), `ageTable(ctx, key, age): number | undefined` for age tables (rates, never indexed; an age between two rows uses the row at or below it; an age above the last row uses the last row; an age below the first row returns `undefined` so the caller applies its own rule); and `planValue(cfg, key): number` for unindexed values read once per plan (`market.inflation`, yields, returns), used by `makeDeflator` and `classReturns`. Indexed reads keep using `ctx.deflator`, because `rebaseConfig` has already moved every indexed value to the plan start.

##### 25. `./src/engine/units.ts` (Exists, stage 2)

*   **Proposed Changes**:
    *   Branded types `TodayDollars` and `FutureDollars`.
    *   `makeDeflator(cfg)` returns `factor(yearIndex)`, counting from the plan start (display).
    *   `normalizeInputs(inputs, cfg): NormalizedInputs` converts every `…Today` field once, except DB amounts with `fixed` or `none` indexing, which are nominal. It runs after `applyRuleOverrides` and `rebaseConfig`.
    *   `toDisplay(rows, deflator)` converts results back.

##### 26. `./src/engine/types.ts` (Exists, stage 1; changed at stage 2)

*   **Proposed Changes**: The definitions in [Data contracts](#data-contracts), plus:
    *   `YearContext { yearIndex, deflator, cfg, jurisdiction }`, passed to every engine function that needs indexing (`jurisdiction` added at stage 2; `runPath` builds one per year);
    *   the engine state types in [Data contracts](#data-contracts) (`PlanState`, `AccountState`, `SpouseYearState`, `Draw`, `Variant`, `NormalizedInputs`, `EngineIntegrityError`, `RuleOverrides`, `YearInProgress`, `Death`), the new `YearRow` fields and `PlanSummary` totals, added at stage 2; `PlanInputs.ruleOverrides` changes from `Record<string, unknown>` to `RuleOverrides`;
    *   `TaxableIncome { pensionEligible, oas, cpp, otherOrdinary, eligibleDividends, foreignDividends, capitalGains }`. `eligibleDividends` is the cash amount received (the tax code grosses it up) and `capitalGains` is the full realized gain (the tax code applies the inclusion rate), matching what the TaxTips.ca calculator asks for.

    Filling rule for `pensionEligible`: DB payments at any age, and RRIF/LIF payments when the owner is at least `federal.credits.pension.min_age_rrif`. RRSP and LIRA withdrawals, RRIF/LIF below that age, and interest go to `otherOrdinary`. Splitting eligibility reads `federal.split.min_age_rrif` separately. `solver/incomeAssembly.ts` (stage 2) builds each spouse's `TaxableIncome` with this rule: `assembleIncome(spouse, fixedIncome, draws, cashYield, realizedGains, ctx): TaxableIncome`.

##### 27. `./src/engine/jurisdiction/types.ts`, `./federal.ts`, `./ontario.ts` (Exists, stage 1; changed at stages 2 and 3)

*   **Proposed Changes**:
    *   `federalTax(income: TaxableIncome, age, ctx): { tax, clawback }`, covering brackets, credits, dividend credit and OAS recovery tax.
    *   The `Jurisdiction` interface:
        *   `provincialTax(income, age, ctx): number`, covering brackets, credits, surtax, Health Premium and Tax Reduction;
        *   `id: string` (exists);
        *   `lifMaxFactor(ageAtStartOfYear, ctx): number` (stage 2): the `ontario.lif.max_factor` row, the last row above 90;
        *   `unlockShare(ctx): number` (stage 2);
        *   `probate(estateAssets: number, ctx): number` (stage 3).
    *   `ontario.ts` implements `Jurisdiction`. The LIF rules themselves (minimum, the earnings floor, the opening year) live in `accounts/liraLif.ts`; the jurisdiction supplies only Ontario's values.

##### 28. `./src/engine/tax/personalTax.ts`, `./tables.ts`, `./split.ts` (Exists, stages 1–2)

*   **Proposed Changes**:
    *   `personalTax(income, age, jurisdiction, ctx): { federal, provincial, clawback, total }`.
    *   `bestSplit(a: { income: TaxableIncome; age: number }, b: same, ctx): { from, share, householdTax }` calls `personalTax` with `ctx.jurisdiction`. It tries 0 to `federal.split.max_share` in `SPLIT_STEP` steps in both directions, 2 × (max_share ÷ `SPLIT_STEP`) + 1 points, respecting eligibility (`federal.split.min_age_rrif`); a spouse who is working or not alive is left out; ties go to the smaller transfer, then spouse 1 transferring.

##### 29. `./src/engine/benefits/cpp.ts`, `./oas.ts`, `./db.ts`, `./survivor.ts` (Exists, stage 2)

*   **Proposed Changes**: Each uses the formulas in [Accounts](#accounts), with coefficients from config. The first year is pro-rated by birth month (months after the start birthday ÷ 12), and the OAS 75+ increase is pro-rated the same way.
    *   `cppAt(estimateAt65, startAge, age, birthMonth, ctx)`
    *   `oasAt(residenceYears, startAge, age, birthMonth, ctx)`
    *   `dbPayment(db, age, birthMonth, ctx, alive)`, covering the lifetime amount, the bridge until its end age, and indexing per [Accounts](#accounts): `full` grows with the deflator; `fixed` is nominal at the start age and grows by `indexRate` from then; `none` is nominal and flat
    *   `survivorBenefits(deceased, survivor, ctx)`

##### 30. `./src/engine/accounts/rrspRrif.ts`, `./liraLif.ts`, `./tfsa.ts`, `./nonRegistered.ts` (Exists, stage 2)

*   **Proposed Changes**: Pure functions on account state:
    *   **RRSP/RRIF:** conversion; the minimum uses the start-of-year age and is zero in the opening year; `minFactor(age, ctx)` uses the table, the last row above 95, and 1 ÷ (`federal.rrif.min_factor_base_age` − age) below the table's first age (when `ageTable` returns `undefined`).
    *   **LIRA/LIF:** conversion (validated by 71) and the optional unlock (`ctx.jurisdiction.unlockShare`) to the owner's RRSP/RRIF. `lifLimits(account, ageAtStartOfYear, isOpeningYear, ctx): { min, max }`: min = 0 in the opening year, else `minFactor(age, ctx)` × balance; max = the greater of `ctx.jurisdiction.lifMaxFactor(age, ctx)` × balance and `lifPrevEarningsNom` (the factor alone in the opening year). A LIRA is never drawn.
    *   **TFSA:** room is per spouse (`SpouseYearState.tfsaRoomNom`), shared by all their TFSAs: the indexed yearly limit, unrounded, plus last year's withdrawals, added on January 1. Contributions and deposits within room go to the spouse's first TFSA by id. Successor transfer uses no room.
    *   **Non-registered:** pooled positions with original cost; `sellProRata(account, amount)` returns cash and realized gain or loss; `cashYield(account, returns)` returns income by type; `netGains(realized, carriedLoss)` returns the taxable gain and the new carried-forward loss.
    *   **Sheltered yield:** `reinvestYield(account, returns, ctx)` adds each class's yield back to the account, net of `market.foreign_withholding_rate` on foreign dividends.

##### 31. `./src/engine/invest/returns.ts`, `./glide.ts`, `./placement.ts`, `./rebalance.ts` (Exists, stage 2)

*   **Proposed Changes**:
    *   `returns.ts`: `classReturns(cfg, investing): Record<AssetClass, { total, yield, price, incomeType }>`, per [Asset classes and returns](#asset-classes-and-returns-o3).
    *   `glide.ts`: `mixForYear(userMix, startingMixId, shapeId, yearsFromFirstRetirement, planStartYearsFromRetirement, cfg)` applies shape(*t*) − shape(*t₀*) to the user's stock share, keeping proportions within stocks and within bonds and cash, with the clamping fallbacks. It returns fractions. `startingMixId` is `investing.mixId`; until `planning.mixes` has values (O24), the 0%-stock fallback puts the points in Canadian stocks.
    *   `placement.ts`: `targetHoldings(accounts, overallMix, presetId, cfg)` works at face value. For each class in the fill order (cash, bonds, then emerging-market, international, U.S. and Canadian stocks), the target is its share × the household total. It fills the account groups in the preset's order; within a group, the amount is split across the group's accounts (both spouses) in proportion to each account's room not yet assigned; whatever doesn't fit continues into the next group. Cash follows the preset's `bonds` column; U.S., international and emerging-market stocks follow its `global_equity` column. The baseline puts the same mix in every account.
    *   `rebalance.ts`: `rebalance(accounts, targets)` returns new holdings and the realized gains for the year by owner (`YearRow.spouse[i].realizedGainsNom`). With rebalancing off (O29), `rebalance` and the shape are skipped after the plan start; draws and deposits follow current holdings.

##### 32. `./src/engine/withdraw/registeredLast.ts`, `./fillBrackets.ts`, `./earlyRrsp.ts`, `./surplus.ts` (Exists, stage 2)

*   **Proposed Changes**:
    *   All four take `year: YearInProgress` (state, inputs, each spouse's income so far, draws already taken) and return `Draw[]`. Income is measured with `incomeTotals` from `jurisdiction/federal.ts`.
    *   `registeredLast(W, year, ctx)` draws non-registered first (pro rata across spouses), then RRSP/RRIF and LIF pro rata across both spouses (each LIF capped at its `lifLimits` maximum less the draws already taken from it; overflow to the owner's RRSP/RRIF, then the other spouse; never a LIRA), then TFSA (pro rata).
    *   `bracketTopUp(year, level: BracketLevel, ctx)` returns the required draws. `level` resolves to a dollar amount from the rule values in use: `first_bracket` is the second row's `from` of `brackets(ctx, 'federal.tax.brackets')`; `oas_threshold` is `amount(ctx, 'federal.oas.recovery.threshold')`. It tops up net income before splitting, counting fixed income, minimums, the non-registered cash yield and gains already realized by the rebalance. A spouse still working is skipped.
    *   `drawDownYears(inputs: NormalizedInputs, deaths: Death[]): number[]` returns the draw-down years from each spouse's CPP and OAS start ages and birth months. `earlyRrsp(W, year, drawDown: number[], ctx)` uses the fill-up rule in those years (a spouse still working is skipped) and calls `registeredLast` otherwise.
    *   `placeSurplus(surplus, year): { accountId, amountNom }[]` splits the surplus by each spouse's share of the forced draws (`YearRow.spouse[i].forcedDrawsNom`), then puts each share in that spouse's TFSA within room, then their non-registered account.

##### 33. `./src/engine/solver/bisect.ts`, `./yearSolve.ts`, `./startOfYear.ts`, `./incomeAssembly.ts` (Exists, stage 2)

*   **Proposed Changes**:
    *   `bisect(f, lo, hi): { x, converged }` uses `SOLVER_PRECISION` (on *x*, the withdrawal) and `SOLVER_MAX_STEPS`.
    *   `startOfYear(state, inputs, ctx): PlanState` does step 0 of the year solver (conversions, the unlock, TFSA room).
    *   `assembleIncome(...)` builds each spouse's `TaxableIncome` (file 26's filling rule).
    *   `solveYear(state: PlanState, inputs: NormalizedInputs, ctx: YearContext, variant: Variant, options?: { fixedSplit }): SolvedYear` (`{ nextState, row, endState, taxed }`; `endState` and `taxed` feed the final return) implements the [year solver](#the-year-solver) steps in order, with the split passes (up to `MAX_SPLIT_PASSES`). Non-convergence or an invariant failure throws `EngineIntegrityError { year, variantId, check, before, after }` (types in [Data contracts](#data-contracts)).

##### 34. `./src/engine/project/initialState.ts`, `./spendingNeed.ts`, `./workingYear.ts`, `./runPath.ts`, `./death.ts` (Exists, stages 2–3)

*   **Proposed Changes**:
    *   `initialState(inputs: NormalizedInputs, ctx, variant): PlanState` builds the first year's state: RRSP, LIRA and TFSA balances placed by `targetHoldings` (non-registered from its entered positions and costs); each spouse's TFSA room from the sum of their `tfsaRoomToday`; an account whose owner is already past its conversion age starts converted, with `openedYear` = plan start − 1, so its minimum applies from the first year.
    *   `spendingNeed(inputs, state, ctx): number` returns the year's need from the phases, category overrides and `keepPct` ([Data contracts](#data-contracts), Spending need), × the survivor percentage after the first death, zero before the first retirement.
    *   `workingYear(state, inputs, ctx, variant): SolvedYear` runs years before the first retirement, following the numbered working-year steps in [The year solver](#the-year-solver); `variant` gives the preset for the rebalance.
    *   `runPath(inputs: NormalizedInputs, cfg, jurisdiction, variant, detail: 'full' | 'summary')` builds one `YearContext` per year, runs the plan at fixed returns and returns rows and a `PlanSummary`. It adds up `lifetimeTaxNom`, `lifetimeTaxToday` (both including final-return tax and probate), `totalShortfallNom` and `totalShortfallToday`. In the second death year it fills the row's `estate` fields with `secondDeath`, and `afterTaxLegacyNom` comes from them (`legacyIsPreTax` is `false`).
    *   `death.ts` holds:
        *   `deaths(inputs): [Death, Death]`, the two deaths in year order (spouse 1 first on the same year);
        *   `transferAccounts(state, from, to)` and `firstDeathTransfer(state): PlanState`, used by solver step 0a, following its rules: accounts keep id and type and change owner, the survivor's age drives minimums and conversion, the deceased's carried loss is dropped;
        *   `finalReturn(deceased, endState, yearIncome, yearTax, ctx)`: the deemed income (registered balances converted or not, the deemed sale) and the final-return tax over what the year already paid;
        *   `estate(endState, finalReturnTaxNom, inputs, ctx)`: the home, probate per O23, and the after-tax legacy;
        *   `secondDeath(endState, taxed, inputs, ctx): EstateYear`, which handles same-year deaths and returns the row's `estate` fields, following [Death and estate](#death-and-estate-o12-o23).

##### 35. (Removed: no market generator or stress paths with fixed returns)

##### 36. `./src/engine/simulate/variants.ts` and `./simulate.ts` (Exists, stage 4)

*   **Proposed Changes**:
    *   `variants(inputs)` returns the user's plan, the placement baseline, and one variant per withdrawal strategy, reusing the user's run for the chosen one.
    *   `simulate(inputs, cfg, jurisdiction)` runs the user's plan in full detail, the strategies with chart rows (`StrategyResult`, from `chartRows`), and the placement baseline as a summary.

##### 37. `./src/engine/results/compare.ts` (Exists, stage 4)

*   **Proposed Changes**: Implement the [Result definitions](#result-definitions) and build the `Result` fields in [Data contracts](#data-contracts):
    *   `goals(rows, summary, inputs, deflator)`: whether spending is covered over the years from the first retirement to the second death, and the legacy status, including `no_goal`;
    *   `compare(a, b): Comparison`: the differences in lifetime tax and the after-tax legacy, with the opposite-direction flag;
    *   `yearOneSaleTax(inputs, cfg, jurisdiction, deflator, variant)`: the second solve of year one with the rebalance gains set to zero (`solveYear` and `workingYear` take `ignoreRebalanceGains`);
    *   `estateSummary(rows, inputs, deflator)`: the Estate chart's figures from the second death year's row.

##### 38. `./src/engine/invariants.ts` (Exists, stage 2)

*   **Proposed Changes**: `checkYear(prev: PlanState, next: PlanState, row: YearRow, ctx)` applies the [Verification](#verification-g10) checks within `INVARIANT_TOLERANCE`, including the account and household conservation identities stated there.

##### 39. `./src/engine/warnings/definitions.ts`, `./evaluate.ts`, `./tips.ts` (Create, stage 6)

*   **Proposed Changes**:
    *   **`definitions.ts`:** one object per warning, holding its check, explanation, basis, years, scope, unit and related input paths.
    *   **`evaluate.ts`:** evaluates the warnings and collapses repeated years.
    *   **`tips.ts`:**
        *   reruns the plan with each related input nudged up and down by its configured step, and returns the top three inputs by effect with conditional wording;
        *   a rerun that fails is dropped and logged, and the other tips are still returned.

##### 40. `./src/engine/index.ts` (Exists, stage 4)

*   **Proposed Changes**: Exports:
    *   `runPlan(inputs, { revision, appVersion, today }): Result` (main results and strategies), `runTips(inputs, result): Tips` and `engineError(error, revision, appVersion): EngineError`
    *   `loadConfig`, `applyRuleOverrides`, `configStatus`, `configDefaults`
    *   `normalizeInputs`, `toDisplay`
    *   the types `PlanInputs`, `Result`, `Tips`, `EngineError`, `YearRow`, `PlanSummary`

#### Worker (stage 4)

##### 41. `./src/worker/engine.worker.ts`, `./protocol.ts`, `./createWorker.ts`, `./client.ts` (Exists, stage 4)

*   **Proposed Changes**:
    *   `createWorker.ts` imports the Worker with Vite's `?worker&inline`, so its bundle is inlined and started from a `blob:` URL and runs under the page's security policy.
    *   `protocol.ts`: the Worker receives `{ type: 'run', inputs, revision, appVersion }` and `handleRun` posts `result` (with `revision`), then `tips` (with `revision`), or `error` (an `EngineError`, with `EngineIntegrityError` details). `engine.worker.ts` only passes messages to it.
    *   `client.ts`: `createEngineClient(makeWorker, appVersion, callbacks)` exposes `run(inputs, revision)` and `dispose()`, with callbacks for the result, the tips and errors. It runs one revision at a time; when a newer revision is sent during a run, it terminates the Worker and starts a new one, and it drops replies for older revisions.

#### State and persistence (stages 5, 7)

##### 42. `./src/state/store.ts`, `./src/state/defaults.ts`, `./src/state/changeSummary.ts` (Exists, stage 5)

*   Built with them in `src/state`: `draft.ts` (the editable plan, `PlanDraft`, and input paths), `readiness.ts` (`readyToRun`), `labels.ts` (plain names for input paths), `categories.ts` (the category ids), `mix.ts` (the mix sliders), `format.ts` and `react.ts` (the store context and `usePlan`).

*   **Proposed Changes**:
    *   **Store (Zustand):** holds `inputs` (including `ruleOverrides`), `inputsRevision`, `result`, `tips`, `previousResult`, `edits` (the input paths edited since the last result, with the time of the last) and `status` (incomplete / up to date / updating / error).
        *   Actions: `setInput(path, value)`, `setRule(key, value)`, `resetRule(key)`, `loadPlan(inputs)`. Every one of them raises `inputsRevision`.
        *   **Readiness:** `readyToRun(inputs): { ready: true } | { ready: false, missing: { path, message }[] }` checks the inputs against the plan schema (file 43) and that the mix sums to 100. While it fails, the store sends nothing to the Worker, `status` is `incomplete`, the Results tab's badge reads "Incomplete", and the Results tab lists what is missing, each with a link that focuses the input.
        *   Every edit of a ready plan schedules a run 500 ms later; a result or tips whose revision is not the latest is dropped. `isUpdating = result?.revision !== inputsRevision`. Between a new result and its tips, each warning shows "Finding tips…".
        *   **Life expectancy:** after `setInput` on a spouse's birth year or sex, the store fills that spouse's empty target with `defaultLifeExpectancy` ([Design values](#design-values-version-1)); a typed target is never replaced.
    *   **`defaults.ts`:** the empty-plan values: the Balanced mix, the Index ETFs fee level, the spending phases from `planning.spending_phases`, the category list, the strategy "Registered last" and the bracket level "Top of the first bracket"; and `defaultLifeExpectancy(sex, age, cfg)`.
    *   **`changeSummary(previous, current, edits)`:** lists changes in whether spending is covered, after-tax legacy, lifetime tax, clawback years and first shortfall year, plus warnings added or cleared. It names the edit when there is one ("Retirement year, Alex"), or counts them ("3 changes: …"). A plan load or import shows no change summary.

##### 43. `./src/state/persistence/planSchema.ts`, `./storage.ts`, `./exportImport.ts` (`planSchema.ts` exists, stage 5; the others stage 7)

*   `planSchema.ts` is built in stage 5, for the readiness check; the other two in stage 7.

*   **Proposed Changes**: Implement [Persistence](#persistence):
    *   the Zod envelope `{ schemaVersion: 1, inputs, meta }`;
    *   the `rp.plan.v1` key and the debounced autosave;
    *   `navigator.storage.persist()`, with the export prompt on refusal or save failure;
    *   export file naming and the newer-version refusal message;
    *   the `storage` event: when another tab saves the plan, offer "Reload it, or keep this version".

##### 44. `./src/state/samplePlan.ts` (Create, stage 7)

*   **Proposed Changes**: A fictional Ontario couple (the mockups used "Alex and Sam"):
    *   spouses born in different years, one retiring two years before the other;
    *   an RRSP, a TFSA and a non-registered account;
    *   spending by category, with one category that differs later;
    *   one DB pension with a bridge;
    *   one LIRA.

    Used by "Load sample plan" and the end-to-end tests.

#### Screens (stage 5; warnings in stage 6)

##### 45. `./src/ui/App.tsx` and `./src/ui/styles.css` (Exists, stage 5)

*   Export and Import were built ahead of stage 7 at the author's request (AR2-X1, AR2-X2, `exportImport.ts`). Export downloads the plan in the envelope `{ schemaVersion: 1, inputs, meta }` as `retirement-plan-<date>.json`. Import (in the header and on the welcome screen) reads such a file: a file that is not JSON, not a plan, or from a newer plan version is refused with a message naming the file (and both versions); a plan may be unfinished, so the check is of its shape, and the readiness check lists what is missing. A plan already open is replaced only after "Replace the plan" in a dialog, which says the open plan is not saved anywhere else. Stage 7 adds autosave in the browser and the sample plan.

*   **Proposed Changes**:
    *   Tab bar for Household, Savings, Spending, Withdrawals, Estate and Results (with its badge); no results panel on the input tabs.
    *   Header shows the tax-year chip ("default values" or "N values changed"), the config notice, Import, Export and a link to Settings.
    *   Footer shows the disclaimer.
    *   First-run disclaimer dialog.

##### 46. `./src/ui/tabs/HouseholdTab.tsx`, `./SavingsTab.tsx`, `./SpendingTab.tsx`, `./WithdrawalsTab.tsx`, `./EstateTab.tsx`, `./ResultsTab.tsx`, and `./src/ui/settings/SettingsScreen.tsx` (Exists, stage 5)

*   **Proposed Changes**: Laid out as in [Screens](#screens).
    *   **Household:** spouses only: birth year and month, sex at birth, retirement year, life expectancy target with the 25%-survival note, CPP estimate, residence years, working marginal rate, after-tax pay.
    *   **Savings:** collapsible sections with summaries: accounts, DB pensions, the investment mix (sliders that keep the total at 100%, return overrides, fee level, rebalance), "As you get older" shapes, and placement with its comparison and the face-value note; a note that returns are the same every year, so a shape shows only its effect on returns, not on protection from a bad market.
    *   **Spending:** "By category" or "One total"; category groups with "Different later?" overrides and group notes; the three phases with "from year" fields and keep-share sliders.
    *   **Withdrawals:** the three setup sections (closed by default, with summaries); the three strategy cards with "Learn more" dialogs; the options row; the income chart with its year slider and the fixed 11-row breakdown.
    *   **Estate:** survivor percentage, legacy goal, home value, probate strip, beneficiary assumption.
    *   **Results:** status line, the two goal cards with the summary line, warnings, and the four charts.
    *   **Settings:** every rule value by section, with default, source, "changed" mark and Reset; deep links from Edit strips on other screens.

##### 47. `./src/ui/results/Goals.tsx`, `./UpdatingState.tsx`, `./ResultsBadge.tsx`, `./ChangeSummary.tsx`, `./WarningsList.tsx`, `./ConfigNotice.tsx`, `./IntegrityError.tsx` (Exists, stage 5; warnings in stage 6)

*   **Proposed Changes**:
    *   **Goals:** Goal 1, whether spending is covered every year (with its label, the year strip, and the first shortfall year if not); Goal 2, the after-tax legacy against the goal; then one line with lifetime tax, clawback years and the change summary.
    *   **Updating state:** while a run is in progress, the previous figures stay, faded, under "Updating…"; no Recalculate button.
    *   **Results badge:** on the tab label: warning count, "Incomplete", "Updating", "Short from <year>" or "Error".
    *   **Change summary:** what the last change did, naming the edit, on the line under the goals.
    *   **Warnings:** each with tips and links that focus the related input.
    *   **Config notice:** shown when values are unvalidated or out of date.
    *   **Integrity error:** shows the details with a "Copy details" button.

##### 48. `./src/ui/charts/charts.tsx`, `./data.ts`, `./ChartTable.tsx` (Exists, stage 5)

*   **Proposed Changes**: Charts in today's dollars for the user's plan, as described in [Results tab](#results-tab). `charts.tsx` holds `BalancesChart`, `IncomeChart`, `TaxChart` and `EstateWaterfall`; `data.ts` turns the engine's future-dollar rows into chart rows. Every chart has a table view (`ChartTable`), and labels say "today's dollars". There is no separate year-by-year table. `IncomeChart` is the Withdrawals tab's stacked area chart (sources in a legend, the spending-need line, the spending-need-plus-tax line, the year marker driven by the year slider); it draws any strategy's rows from `StrategyResult` without a rerun. The yearly charts mark the first death; animation is off, so switching strategy only redraws.

##### 49. `./src/ui/inputs/Field.tsx`, `./CurrencyInput.tsx`, `./PercentInput.tsx`, `./AgeInput.tsx`, `./SegmentedChoice.tsx` (Exists, stage 5)

*   **Proposed Changes**:
    *   Labels sit above inputs, with glossary tooltips.
    *   Currency fields use comma formatting that keeps the cursor position.
    *   Segmented choices are built from real radio inputs, so they work by keyboard.
    *   Inline validation messages don't shift the layout.

##### 50. `./src/ui/content/glossary.ts`, `./explanations.ts`, `./disclaimer.ts` (Exists, stage 5)

*   **Proposed Changes**:
    *   **`glossary.ts`:** the terms in the [Glossary](#glossary), which lists only terms users see.
    *   **`explanations.ts`:** fixed templates for each preset, shape, strategy and comparison, all in conditional wording. Each strategy's "Learn more" text has: what it does; effect on income, taxes and savings; pros; cons; when it makes sense; and, for "Fill lower brackets first" and "Early RRSP drawdown", a note on choosing the level or the ages.
    *   **`disclaimer.ts`:** placeholder text: "This tool shows projections under the assumptions you enter. It uses the same return every year; real markets go up and down, and many sequences of returns would leave you with less. It is not financial, tax or legal advice." It is replaced when O20 is resolved.

#### Tools (stage 0)

##### 51. `./tools/configBundle.ts`, `./tools/configCheck.ts`, `./tools/configCompare.ts`, `./tools/lib.ts` (Exists, stage 0; `configCheck` changed at stage 2)

*   **Proposed Changes**:
    *   **`configBundle`:** generates `src/engine/config/bundle.ts` for `CURRENT_YEAR`.
    *   **`configCheck`:** validates every config file against the schema, checks that `SOURCES.md` and `keys.ts` list exactly the same keys (both directions), and prints the number of unfetched and unvalidated entries (with `--strict`, it lists them and fails). It exits non-zero on schema or key-list errors. From stage 2 it also prints a warning, without failing, for each class whose yield is above its gross return; the 2026 bond values trigger it.
    *   **`configCompare a b`:** lists every key whose value, unit, year or indexed flag differs.
    *   **`lib.ts`:** shared helpers: reading `CURRENT_YEAR`, reading a year's config files, and reading the key column of `SOURCES.md`.

#### Tests and fixtures

##### 52. `./tests/fixtures/tax-cases.json` (Exists, stage 0)

*   **Proposed Changes**: 21 cases (at least 20 for any later version) in the format `{ id, pairId?, age, income: TaxableIncome, federalTax, ontarioTax, clawback, source: "TaxTips.ca Ontario calculator", checkedOn }`.
    *   `federalTax` excludes the OAS recovery tax, which goes in `clawback`, matching how TaxTips.ca reports it.
    *   `income` is after any pension split.
    *   The two spouses of a split case share a `pairId`.

    The cases include:
    *   a death-year return;
    *   a clawback case;
    *   a high-dividend case;
    *   a pension-split pair.

    Federal tax, Ontario tax and the clawback must each match within $1.

    **How the cases were made:** an agent entered the 21 cases in `private/tax-cases-checklist.md` into the TaxTips.ca calculator (2026, Ontario, single) and recorded its results; the author re-ran 3 cases by hand (`65-rrif-99k`, `65-high-dividends`, `split-a`), all matching to the dollar, before the file was committed. TaxTips' "Ontario tax" is line 42800, which includes the Health Premium; its federal tax is line 42000, without the clawback.

##### 53. `./tests/fixtures/reference-plan/inputs.json` and `./expected-rows.csv` (Exists, stage 3)

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

##### 56. `./tests/unit/` (Exists, stages 0–3; files below by stage)

*   **Proposed Changes**: Test files and their cases. Shared stage 2 helper: `tests/unit/helpers/couplePlan.ts`, a minimal two-spouse `PlanInputs` and a `yearContext(yearIndex)` built from the bundle, with test-only values (never rule values) for entries still unfetched.

    | File | Stage | Test cases |
    |---|---|---|
    | `personalTax.test.ts` | 1 | Every `tax-cases.json` case within $1 |
    | `ontario.test.ts`, `federal.test.ts` | 1 | Each step of the [Ontario calculation order](#tax-scope-o11), checked separately. Health Premium at each band's start, $1 above it and at the income where it reaches the cap. Surtax at, $1 below and $1 above each threshold, and above both. Tax Reduction: full (tax brought to zero), partial, and zero at high tax; the Health Premium is never reduced. Dividend credit and other credits can't make basic tax negative. Bracket indexing in a later year: rows marked `indexed: false` keep their threshold while the rest grow with `ctx.deflator`. Expected values are worked out in the test from the config entries in use, not typed in as numbers |
    | `split.test.ts` | 2 | Eligibility (no RRIF splitting under 65; DB at any age); hand-checked pairs; both directions; the tie rule |
    | `cpp.test.ts`, `oas.test.ts`, `db.test.ts`, `survivor.test.ts` | 2 | Start ages 60/65/70; birth-month pro-rating; OAS residence and the 75+ increase; DB bridge stop; DB indexing for `full`, `fixed` (nominal at start, then `indexRate`) and `none` (nominal, flat); survivor cap, both age bands |
    | `rrspRrif.test.ts`, `liraLif.test.ts`, `tfsa.test.ts`, `nonRegistered.test.ts` | 2 | TFSA room: unrounded indexed limit, withdrawals added back next January 1; minimums against the config table; the minimum at ages 60 and 70 from the base age, and above 95; zero minimum in the opening year; LIF maximum from the table and from last year's earnings, and above age 90; a LIRA is never drawn; unlock; TFSA room and successor; original cost on partial sales; a realized loss offsets same-year gains and carries forward, never against other income; sheltered yield reinvested, net of withholding on foreign dividends |
    | `returns.test.ts` | 2 | Override before the fee; the fee subtracted; price = total − yield; one row per class; the optimistic-return limit at +0.5 and +0.51 points |
    | `overrides.test.ts` | 2 | Unit ranges; table structure (rising `from`, no age gaps, caps never fall, equal surtax lengths); cross-key rules; a monthly override × 12 through `publishedUnit`; an override of a 5-year life-expectancy table is accepted; an object override (`planning.shapes`) checked by `checkValue`; an unknown or invalid key dropped on import with a message; a stale override marked |
    | `glide.test.ts`, `placement.test.ts`, `rebalance.test.ts` | 2 | Shape interpolation and end points applied to the user's mix, measured from the plan start (plan starts before and after retirement give today's mix in year one); clamped at 0% and 100%, with 100%-stock and 0%-stock mixes; fill order for six classes; baseline mix; realized gains; rebalancing off (no shape, drift with returns) |
    | `registeredLast.test.ts`, `fillBrackets.test.ts`, `earlyRrsp.test.ts`, `surplus.test.ts` | 2 | Draw order; pro rata between spouses; LIF cap overflow; bracket top-up creates surplus; top-up with dividends and realized gains in income; both levels follow a changed rule value; survivor keeps the level; draw-down years from the start ages, including the last start year, a death before benefits start and zero draw-down years; the fill-up rule with equal incomes and with one spouse exhausted; surplus to TFSA within room |
    | `yearSolve.test.ts` | 2 | Converges for the helper couple at spending of $0, $60,000 and $200,000 today; shortfall recorded; a working spouse in a retired-household year; the split passes |
    | `bisect.test.ts` | 2 | Converges; precision on *x*; reports non-convergence |
    | `workingYear.test.ts` | 2 | Each step of the working-years list: yield taxed at the marginal rate, benefits while working, TFSA overflow to non-registered, contributions at year end |
    | `runPath.test.ts` | 2 | Logs the time of one 40-year couple run (no assertion). Row span from the start year to the second death year; `full` and `summary` detail; `PlanSummary` totals, including lifetime tax and shortfall in today's dollars summed year by year, with final-return tax and probate in lifetime tax |
    | `invariants.test.ts` | 2 | Each conservation identity holds on a normal year and fails on a broken account |
    | `read.test.ts` | 2 | `ageTable` above the last row and below the first; `planValue` |
    | `death.test.ts` | 2 (first-death transfer); 3 (the rest) | Stage 2: accounts keep id and type and change owner; the survivor's age drives minimums; the deceased's carried loss is dropped; the TFSA transfer uses no room. Stage 3: rollover at original cost; same-year deaths; final return includes unconverted RRSP/LIRA; probate |
    | `units.test.ts` | 2 | `normalizeInputs` and `toDisplay` round trip; DB `fixed` and `none` amounts left nominal; `rebaseConfig` with `planStartYear = taxYear + 3` for each value kind (number, bracket rows by their flags, list, phase-in `from` and `cap`; age tables untouched), including a stale override rebased from its own year |
    | `compare.test.ts` | 4 | Spending-covered and legacy-goal flags (including `no_goal`), Goal 1 counted from the first retirement; differences against a baseline; opposite-direction flag; the year-one sale tax (gain, loss, working year); the estate figures add up |
    | `simulate.test.ts`, `engineIndex.test.ts` | 4 | Variants and reuse of the chosen strategy; chart rows by source; `runPlan` on the reference plan (strategy comparisons, placement comparison without the year-one sale tax, overrides applied); `engineError`; `configDefaults` in published units |
    | `worker.test.ts` | 4 | `handleRun` posts result then tips, only an error on failure, empty tips when tips fail; the client drops older revisions, terminates a busy Worker, reuses an idle one, reports a crash |
    | `warnings.test.ts`, `tips.test.ts` | 6 | Each trigger at and around its threshold; collapsed years; tips ranked by effect |
    | `planState.test.ts` (draft paths, readiness, labels, the mix sliders, formats, the change summary), `store.test.ts` (the store and the defaults; plain Node, as it needs no DOM) | 5 | Diff fields; the single named edit and "N changes"; no summary after a load; a run scheduled 500 ms after the last edit; every action raises the revision; an older revision's result and tips dropped; rule overrides set and reset; `readyToRun` with a half-typed birth year and a mix not at 100 (nothing sent, "Incomplete", the missing list) |
    | `store.test.ts` (defaults) | 5 | `defaultLifeExpectancy` for each sex at a table row, between rows, above 100 and never below age + 1; the store fills an empty target once and never replaces a typed one; the empty plan's defaults (Balanced, Index ETFs, Registered last) |
    | `ui.test.tsx` (React Testing Library, happy-dom; the real engine behind a synchronous fake Worker, `helpers/renderApp.tsx`) | 5 | Each tab renders from the store and writes through `setInput`; the Spending mode switch keeps both sets of values; the O28 note; card colours (legacy only, neutral when opposite); the Incomplete list's links |
    | `persistence.test.ts` | 7 | Round trip including rule overrides; newer-version refusal; the frozen v1 file loads |
    | `config.test.ts` (exists from stage 0) | 0 (changed at 2) | Key list has no duplicates and matches `SOURCES.md`; entry shape by value kind; structured planning values; missing, unknown and wrong-year keys; unfetched and out-of-date status; monthly amounts × 12 on load; the committed config passes; `configCompare` differences |
    | `configCheck.test.ts` | 2 | `yieldWarnings` (from `tools/lib.ts`) flags a class whose yield is above its gross return |

##### 57. `./tests/property/` (Exists, stages 2–3)

*   **Proposed Changes**: The property tests listed in [Verification](#verification-g10). They use fast-check. The zero-tax config is built in `tests/property/helpers/zeroTax.ts` from the bundle with `applyRuleOverrides`, setting to 0: every rate in `federal.tax.brackets` and `ontario.tax.brackets`, both `ontario.surtax.rates`, every `rate` and `cap` in `ontario.health_premium.schedule`, and `federal.oas.recovery.rate`. Plans used with it have `workingMarginalRate = 0` for both spouses. It is never part of the validated config.

    | File | Properties | Stage |
    |---|---|---|
    | `tests/property/determinism.test.ts` | The same inputs give the same result | 2 |
    | `tests/property/solver.test.ts` | After-tax cash rises when the withdrawal rises; the chosen split never gives more tax than a 0% split; the split passes are never below the full search and within 1% of it | 2 |
    | `tests/property/symmetry.test.ts` | Swapping the spouses gives the same totals (identical spouses skipped); moving money between two accounts of the same type and owner changes nothing | 2 |
    | `tests/property/zeroTax.test.ts` | With zero tax, the loop matches the closed-form annuity | 2 |
    | `tests/property/legacy.test.ts` | Higher spending never raises the after-tax legacy (needs the final return) | 3 |

##### 58. `./tests/reference/referencePlan.test.ts` (Exists, stage 3)

*   **Proposed Changes**: Runs the reference inputs at fixed returns and compares every cell with `expected-rows.csv`, within $1.

##### 59. (Removed: no benchmark script; the speed check is manual)

##### 60. `./tests/e2e/*.spec.ts` (Exists, stage 5; more at stage 7)

*   **Proposed Changes**: One spec per CUJ, plus one check. Stage 5 built CUJ 2, 3, 4 and 6 (without export and import) and the no-network check; they enter a made-up couple through the screens (`helpers.ts`). CUJ 1 and 5 need the sample plan and export, in stage 7. Locally, `PW_CHANNEL=msedge` runs them in an installed Edge.
    *   **CUJ 1 (`first-plan.spec.ts`):** load the sample plan; results appear without a button press. Both goal cards show their result, the lifetime tax is shown, each yearly chart's table view has one row per year, and the plan survives a page reload.
    *   **CUJ 2 (`cross-tab.spec.ts`):** click each strategy card on Withdrawals. The cards, chart and breakdown keep their positions; after selecting one, the Results tab shows "Updating" and then "What your last change did" with lifetime tax and clawback years.
    *   **CUJ 3 (`placement.spec.ts`):** change the preset. The comparison shows lifetime tax and the after-tax legacy for the preset and the baseline.
    *   **CUJ 4 (`first-death.spec.ts`):** with targets 78 and 94, the rows after 78 show one spouse not alive, the survivor benefits started, and the survivor percentage applied.
    *   **CUJ 5 (`resume.spec.ts`):** export, clear storage, import. The inputs are identical. A file with `schemaVersion: 3` is refused with both versions named (version 2 since Stage A; a version 1 file is migrated).
    *   **CUJ 6 (`settings.spec.ts`):** change the OAS clawback threshold in Settings. It is marked changed with the default beside it, the header reads "1 value changed", results update, the change survives export and import, and Reset restores the default. Once every bundled default is validated (2026-11-26), this journey checks that no config notice shows; the unit tests mark one default unchecked to test the notice and the Settings filter.
    *   **`no-network.spec.ts`:** a full session makes no request outside the app's own origin.

#### Stage A (Assets) files

##### Stage placement

*   The work is one stage, **Stage A (Assets)**, built after the `stage-5` tag and before stage 6 (warnings and tips). It is tagged `stage-assets`. Stages 6–8 keep their numbers, so the existing tags and references stay valid.
*   **Order inside the stage,** each step ending with `npm run typecheck && npm run lint && npm test` passing:
    1.  the design merge and the rule sources;
    2.  the plan file (v2 and the migration);
    3.  the engine asset module;
    4.  the solver and working-year changes;
    5.  death and estate;
    6.  results;
    7.  state;
    8.  screens;
    9.  the second reference plan and the tax cases;
    10. end-to-end tests and timing.
*   **Out of this stage:** stage 6 builds the "Money locked in a LIRA" warning (AR2-L1) and any asset warnings. Stage 7 builds autosave, which calls the migration from step 2.

##### Documentation and rules (step 1)

###### SA1. `./docs/designs/retirement-planner.md` (Modify)

*   **Type / Scope**: The master design.
*   **Proposed Changes**: Done on 2026-11-26: the Assets amendment was drafted with the author and merged into each section of this document (headings marked "Stage A"), with CUJ 7, the OA questions, decisions A2–A10, alternatives Z–AQ and Known gaps BA-1 to BA-7. Why: there is one master spec (author, 2026-11-26).

###### SA2. `./concepts_brief.md` (Modify)

*   **Type / Scope**: The master brief.
*   **Proposed Changes**: Mark the Assets recommendations AR1–AR9 as settled in the design, with the decision each became. Why: the brief and the design must not disagree.

###### SA3. `./config/SOURCES.md` (Modify)

*   **Type / Scope**: Source list.
*   **Proposed Changes**: A new "Rules without numbers" section. Each rule gets the URL and locator of the source page it was read from: the principal residence exemption, personal-use losses, interest on money borrowed to earn rent, rental losses against other income, mortgage compounding, and the probate deduction for encumbrances on real property. No config entries change. Why: BA-7, and the rule that nothing comes from memory.

###### SA4. `./docs/units-and-conventions.md` (Modify)

*   **Type / Scope**: Units document.
*   **Proposed Changes**: Add the three new amount kinds: original cost as paid (never deflated); mortgage amounts as on the statement (nominal at the plan start, never indexed); and growth modes resolved to one nominal rate. Why: the prototype failed on mixed units, so every new kind is written down before code.

###### SA5. `./AGENTS.md` (Modify)

*   **Type / Scope**: Agent rules.
*   **Proposed Changes**: One rule: only `src/engine/assets/` changes asset state, and asset kinds are defined only in `assets/kinds.ts`. Why: decision A2.

##### Plan file (step 2)

###### SA6. `./src/engine/types.ts` (Modify)

*   **Type / Scope**: Engine types.
*   **Proposed Changes**: Add `RealAssetInput`, `RealAssetState`, `RealAssetYear`, `PlanInputs.realAssets`, `schemaVersion: 1 | 2`, the new `spending` fields, `PlanState.realAssets`, the `YearRow.realAssets` record with `assetCashInNom`, `assetCashOutNom` and `purchaseShortfallNom`, `IncomeBySourceNom.rent`, and the new `Result.estate` fields. Normalized inputs keep `estate.homeValueNom` for v1-shaped inputs. Why: the Data contracts.

###### SA7. `./src/state/persistence/migrate.ts` (Create)

*   **Type / Scope**: Pure function.
*   **Proposed Changes**: `migrateV1toV2(draft: unknown): PlanDraftV2`, following the Persistence rules. It is idempotent on v2 input. Why: AD11, G15.

###### SA8. `./src/state/persistence/planSchema.ts`, `./exportImport.ts` (Modify)

*   **Type / Scope**: Zod schema, import and export.
*   **Proposed Changes**:
    *   The schema takes `schemaVersion: 2`, the `realAssets` array (at most 6) with each kind's required fields and ranges, and the new spending fields. Refinements: a sale year after the purchase year; a sale year no later than the second death year; at most one home held in any year; a mortgage payment above the first month's interest.
    *   `importPlan` runs the migration before the shape check, accepts versions 1 and 2, and refuses anything newer.
    *   `EXPORT_SCHEMA_VERSION` becomes 2.

    Why: Persistence.

###### SA9. `./src/state/draft.ts`, `./readiness.ts`, `./labels.ts`, `./changeSummary.ts`, `./defaults.ts` (Modify)

*   **Type / Scope**: State helpers.
*   **Proposed Changes**:
    *   `draft.ts`: `setAt` and `deleteAt` address `realAssets.<id>` by id, as they do accounts.
    *   `readiness.ts`: maps the new fields and the missing original cost to readable messages, and links each to the Assets tab.
    *   `labels.ts`: names every new path ("Cottage: sale year").
    *   `changeSummary.ts`: names asset edits.
    *   `defaults.ts`: an empty plan has `realAssets: []` and schema version 2.

    Why: these files route every input path.

##### Engine asset module (step 3)

###### SA10. `./src/engine/assets/kinds.ts`, `./mortgage.ts`, `./ownership.ts`, `./tax.ts`, `./step.ts`, `./README.md` (Create)

*   **Type / Scope**: Engine module.
*   **Proposed Changes**:
    *   `kinds.ts`: the five kinds, their flags (`principalResidence`, `personalUse`, `incomeProducing`, `depreciating`) and which fields each shows.
    *   `mortgage.ts`: `monthlyRate(ratePct)`, compounded twice a year; `runYear(balance, rateMonthly, payment)` returning interest, principal and the end balance, with the last payment capped.
    *   `ownership.ts`: `ownerShares(owner)` and `byOwner(amount, shares)`.
    *   `tax.ts`: `gainOnSale(asset, value)` with the home exempt, personal-use losses floored at zero, and rental and investment losses returned as negative gains.
    *   `step.ts`: `startOfYear` (events and the first-death handover), `income` (per-spouse taxable net rent and gains, and cash in and out), `endOfYear` (growth, mortgages, replacement scheduling) and `atSecondDeath` (deemed gains, estate value, probate base, the cottage comparison).

    Why: A2.

###### SA11. `./src/engine/units.ts`, `./project/initialState.ts` (Modify)

*   **Type / Scope**: Normalizing and the first state.
*   **Proposed Changes**: `normalizeInputs` converts asset values, prices, rent and costs to plan-start dollars, resolves growth modes to one rate (from the config's inflation and any override), and keeps the original cost and mortgage amounts as they are. `initialState` builds `PlanState.realAssets`. Why: Units and conventions.

##### Solver and working years (step 4)

###### SA12. `./src/engine/solver/startOfYear.ts`, `./yearSolve.ts`, `./incomeAssembly.ts` (Modify)

*   **Type / Scope**: Year solver.
*   **Proposed Changes**:
    *   `startOfYear.ts` calls `assets.startOfYear` after the first-death transfers.
    *   `incomeAssembly.ts` adds net rent (which may be negative) to `otherOrdinary`, and asset gains to realized gains, per owner share.
    *   `yearSolve.ts`: the solve target adds asset cash out; after-tax cash adds asset cash in; the shortfall goes to purchases first; sale money is deposited to its owner in the same `placeSurplus` call; `assets.endOfYear` runs after price returns.

    Why: the year solver amendment.

###### SA13. `./src/engine/withdraw/surplus.ts` (Modify)

*   **Type / Scope**: Deposits.
*   **Proposed Changes**: `placeSurplus` takes an optional list of `{ amount, shares }` parts, so sale money reaches its owner while all parts share TFSA room. Why: AD16, decision A2.

###### SA14. `./src/engine/project/workingYear.ts`, `./spendingNeed.ts` (Modify)

*   **Type / Scope**: Working years.
*   **Proposed Changes**: When `workingMonthlyToday` is set, the working-year cash flow from the Technical Plan applies; when it is empty, today's path runs unchanged (A8). `spendingNeed` returns the working-year need × the inflation factor (× the survivor percentage after a death) before the first retirement, and 0 when the amount is empty. Why: AD15, A7, A8.

###### SA15. `./src/engine/invariants.ts` (Modify)

*   **Type / Scope**: Accounting checks.
*   **Proposed Changes**: The asset, mortgage and sold-asset checks, and the household identities with asset cash and the working-year cash flow. Why: Verification.

##### Death, estate and results (steps 5–6)

###### SA16. `./src/engine/project/death.ts`, `./src/engine/jurisdiction/types.ts`, `./ontario.ts` (Modify)

*   **Type / Scope**: Death and estate.
*   **Proposed Changes**:
    *   `death.ts`: the first-death handover of assets; deemed asset gains on the final return; asset values less mortgages in the estate; the probate base from `assets.atSecondDeath`.
    *   `Jurisdiction.probate` takes a breakdown (non-registered, real property, real-property mortgages, other assets), so the deduction for encumbrances on real property lives in `ontario.ts`.

    Why: AD22, and the rule against Ontario-specific values in engine code.

###### SA17. `./src/engine/results/compare.ts`, `./src/engine/index.ts`, `./src/engine/simulate/simulate.ts` (Modify)

*   **Type / Scope**: Results.
*   **Proposed Changes**: `estateSummary` adds `propertyToday`, `mortgagesToday` and `cottageDesignation`. The rows' `incomeBySourceNom.rent` and `purchaseShortfallNom` reach the strategies and the `Result`. `goals()` counts working years with living costs entered (A9): `yearsTotal` and `yearsCovered` start at the plan start in that case, and Goal 1 still ignores `purchaseShortfallNom`. Why: Results.

##### State (step 7)

###### SA18. `./src/state/store.ts`, `./categories.ts` (Modify)

*   **Type / Scope**: Store and spending categories.
*   **Proposed Changes**:
    *   New actions: `addRealAsset(kind)`, `removeRealAsset(id)`, `setAssetCostHold()` (recomputes the AD14 holds from the assets' costs, keeping each category's amount in `heldForAssets`), and `confirmAssetCostsExcluded(on)`.
    *   `categories.ts` maps each asset cost line to its category: mortgage → `mortgage_rent`, property tax → `property_tax`, a vehicle loan → `auto_payment`, and insurance → `home_auto_insurance`, held only when the home and every vehicle carry insurance (A10).
    *   `TabId` gains `assets`.

    Why: AD14, A5.

##### Screens (step 8)

###### SA19. `./src/ui/tabs/AssetsTab.tsx` (Create)

*   **Type / Scope**: React tab.
*   **Proposed Changes**: The Assets list and editor described in Screens. Its fields are driven by `engine/assets/kinds.ts`. It has growth's three modes with the plan's inflation rate, the shortcuts, the sold-only-in-the-year-set note, and the 6-asset limit. Why: G11.

###### SA20. `./src/ui/App.tsx`, `./src/ui/tabs/SpendingTab.tsx`, `./EstateTab.tsx`, `./WithdrawalsTab.tsx`, `./ResultsTab.tsx` (Modify)

*   **Type / Scope**: Screens.
*   **Proposed Changes**:
    *   `App.tsx`: Assets in `TABS` between Savings and Spending.
    *   `SpendingTab.tsx`: the "Counted on Assets" holds, the A5 notice and tick, and "Living costs while working".
    *   `EstateTab.tsx`: the home field becomes a pointer to Assets; property, mortgages and the cottage comparison line.
    *   `WithdrawalsTab.tsx`: the breakdown's 14 rows and the "Rent" source.
    *   `ResultsTab.tsx`: the purchase-shortfall line, and `tabFor` sends `realAssets.*` paths to Assets.

    Why: Screens.

###### SA21. `./src/ui/charts/data.ts`, `./charts.tsx`, `./IncomeChart.tsx`, `./src/ui/results/MissingSections.tsx`, `./src/ui/common.tsx`, `./src/ui/styles.css` (Modify)

*   **Type / Scope**: Charts and shared UI.
*   **Proposed Changes**:
    *   `data.ts` and `charts.tsx`: the "Property less mortgages" band; the property and mortgages bars in the Estate waterfall.
    *   `IncomeChart.tsx`: the "Rent" source and its colour.
    *   `MissingSections.tsx`: Assets in `TAB_NAMES`.
    *   `common.tsx`: colour entries.
    *   `styles.css`: the asset table, which follows the Savings table.

    Why: Screens.

###### SA22. `./src/state/README.md`, `./src/engine/README.md`, `./src/engine/project/README.md`, `./src/engine/solver/README.md`, `./src/engine/results/README.md`, `./src/ui/README.md` (Modify)

*   **Type / Scope**: Folder READMEs.
*   **Proposed Changes**: Describe the new module, files and functions. Why: the folder README rule.

##### Tests (steps 2–10)

###### SA23. `./tests/unit/migrate.test.ts`, `./tests/unit/assetsMortgage.test.ts`, `./tests/unit/assetsStep.test.ts`, `./tests/unit/assetsTax.test.ts` (Create)

*   **Type / Scope**: Unit tests.
*   **Proposed Changes**:
    *   `migrate.test.ts`: v1 with and without a home; an unfinished draft; idempotence; a v1 test plan's `Result` equal after migration.
    *   `assetsMortgage.test.ts`: $100,000 at 6% with $1,000 a month, with first-month interest worked out by hand from the twice-a-year rule; the payoff year; the last payment capped; a payment at or below interest refused.
    *   `assetsStep.test.ts`: sales before purchases; a downsize; a vehicle replaced twice; "sell at the first death"; the joint handover.
    *   `assetsTax.test.ts`: the home exempt; personal-use losses at zero; a rental loss carried forward; an investment "other" loss allowed.

    Why: Verification.

###### SA24. `./tests/unit/yearSolve.test.ts`, `./workingYear.test.ts`, `./death.test.ts`, `./invariants.test.ts`, `./surplus.test.ts`, `./spendingNeed.test.ts`, `./compare.test.ts`, `./store.test.ts`, `./planState.test.ts`, `./exportImport.test.ts`, `./ui.test.tsx`, `./chartData.test.ts`, `./helpers/draftPlan.ts`, `./helpers/couplePlan.ts` (Modify)

*   **Type / Scope**: Unit tests.
*   **Proposed Changes**: Cases for:
    *   net rent in step 3, and a sale paying the year first;
    *   a purchase shortfall;
    *   the working-year cash flow, and the A8 rule unchanged;
    *   the probate base with a mortgage, and with a vehicle loan;
    *   the cottage comparison;
    *   the new invariants;
    *   sale money to its owner;
    *   the working-year need;
    *   the new estate fields;
    *   the store actions and holds;
    *   the v2 schema and refinements;
    *   import of v1 and v2;
    *   the Assets, Spending, Estate, Withdrawals and Results screens;
    *   the new band.

    The helpers gain an asset-holding plan. Why: coverage thresholds (engine 90%, state 80%, UI 70%).

###### SA25. `./tests/property/assets.test.ts` (Create)

*   **Type / Scope**: Property tests.
*   **Proposed Changes**: The five property tests listed in Verification. Why: G10.

###### SA26. `./tests/fixtures/reference-plan-assets/` (Create: `inputs.json`, `calculator/`, `expected-rows.csv`, `NOTES.md`)

*   **Type / Scope**: Protected fixture, new.
*   **Proposed Changes**: Built by a separate session from the amended master design only, as G10 requires. The household is made up to exercise every feature once (OA1). Once committed, the files are protected like every fixture. Why: G10 (extended).

###### SA27. `./tests/reference/referencePlanAssets.test.ts` (Create)

*   **Type / Scope**: Reference test.
*   **Proposed Changes**: Like `referencePlan.test.ts`, with the `realAssets` record flattened as `realAssets.<id>.<field>` after `estate.<field>`. The existing reference test is unchanged. Why: G10.

###### SA28. `./tests/fixtures/tax-cases-assets.json` (Create) and `./tests/unit/taxContext.ts` (Modify)

*   **Type / Scope**: Tax fixture, new.
*   **Proposed Changes**: A rental loss against pension income, and a sale-year gain that triggers the OAS clawback, each checked against an outside calculator within $1. The existing `tax-cases.json` is not changed. Why: G10.

###### SA29. `./tests/e2e/assets.spec.ts` (Create) and `./tests/e2e/helpers.ts` (Modify)

*   **Type / Scope**: Browser journey.
*   **Proposed Changes**: CUJ 7: add a home, downsize it, and see the Withdrawals breakdown, Balances and the legacy change. The helper gains `addAsset`. Why: the CUJ.

###### SA30. Performance check (by hand; no file)

*   **Type / Scope**: Timing, as the master design's Performance section prescribes (timed by hand on the reference machine, recorded in that section).
*   **Proposed Changes**: Time a plan with 6 assets: results within 1 second and the 100 tip runs within 2 seconds. Record the figures under Performance with the date. If a target is missed, apply that section's remedies. Why: A4.

##### Stage A verification

*   **Compilation/Build**: `npm run typecheck` and `npm run build`.
*   **Unit and property tests**: `npm test`, which includes both reference tests and both tax-case files.
*   **Static analysis and linting**: `npm run lint` and `npx prettier --check .`.
*   **Test coverage**: engine 90%, state and worker 80%, UI 70%, as configured.
*   **End-to-end**: `PW_CHANNEL=msedge npx playwright test`, all journeys including CUJ 7.
*   **Config**: `npm run config:check` stays at 86 keys, all validated (no new keys).
*   **Timing**: the SA30 check, timed by hand on the reference machine.
*   **Manual**: import the author's exported plan (in `private/`). It loads with its home as an asset and gives the same results as before. Then add a cottage and a mortgage and check one year's breakdown by hand.

### Verification Plan

*   **Compilation/Build**: `npm run typecheck` and `npm run build` succeed.
*   **Unit Tests**: `npm test` passes, including every tax fixture, the reference plan and the property tests.
*   **Static Analysis & Linting**: `npm run lint`, `npm run format:check` and `npm run config:check` pass.
*   **Test Coverage Requirement**: from the `stage-2` tag (CI sets `ENFORCE_COVERAGE`): 90% branches for `src/engine/**`; 80% for `src/state/**` and `src/worker/**`; 70% for `src/ui/**`, with screen tests written with React Testing Library in happy-dom.
*   **E2E/Integration**: `npm run test:e2e` passes in Chromium, including the no-network test.
*   **Fixtures**: before each stage tag, the author reviews `git diff tests/fixtures config`.
*   **Paid-tool comparison (manual, before stage 8)**: recorded in `tests/fixtures/paid-tool-comparison.md`. Any difference the tools' assumptions don't explain is investigated before stage 8.
*   **Performance (manual, before stage 8)**: results within 1 second and tips within 2 seconds of the end of the 500 ms pause after the last edit, on the reference machine; no main-thread task over 50 ms while a run is in progress (Chrome DevTools Performance panel).
*   **Stage 8 (people)**: the author judges each tester against the [Success Criteria](#success-criteria-for-version-1).

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
