# Assets tab

* **Author:** weaponex
* **Date:** 2026-11-26

## Overview

A new Assets tab in the Ontario retirement planner, for things the couple owns besides their savings accounts. It holds:

- the home, moved from the Estate tab and still free of capital gains tax as a principal residence;
- cottages or second homes;
- rental properties;
- vehicles;
- a generic "other asset" (a value, a growth rate and optional income, with no special tax rules).

Each asset has:

- an owner: spouse 1, spouse 2, or both;
- a value today and a yearly rise or fall that the user enters;
- an optional mortgage, paid from cash flow;
- its own yearly costs, which move off the Spending tab so nothing is counted twice;
- an optional purchase year and sale year.

Rentals: rent less expenses and mortgage interest is taxed as the owner's income each year and adds to each year's cash. On a sale, the mortgage is paid off, tax is worked out, and what is left goes into savings: TFSA room first, then non-registered. At the second death, every asset except the home is taxed as if sold. Businesses, collectibles and annuities, each with its own tax rules, are left for later.

The value for the user: the plan finally sees money tied up in property, income from it, and the tax on it, including the most common late-life move, which is selling or downsizing the home.

## Analysis

Seven review lenses read the idea, the design and the code with no knowledge of this conversation. They agreed on the main problems, listed here from most to least serious.

### Problems that block building as stated

1. **It reverses written decisions.** The design's Non-Goals exclude "one-time events such as selling a home"; decision O16 defers any "other income" stream, which a rental or an income-producing "other asset" is; mobile layout is a Non-Goal; and goal G1 says five input tabs. AGENTS.md makes an agent stop when the code and the design disagree, so these need a dated decision from the author, and a place in the stage plan (before stage 6 warnings, which read the home, or after stage 8).

2. **There is no original cost, so capital gains can't be worked out.** With only today's value, a cottage bought in 1995 for $120,000 and worth $800,000 today shows almost no gain, which understates the tax at death by six figures. Every taxable asset needs "what you paid, plus major improvements". The non-registered accounts already track value and cost; assets can reuse that.

3. **The protected reference test must keep passing.** The reference plan's inputs include `estate.homeValueToday`, and its expected rows include the home in the estate. The test builds its column list from the engine's row types. Removing the home field, or adding columns to those row types, breaks files AGENTS.md forbids editing. Asset detail has to live in a new part of the year row that the reference test ignores, and the engine has to keep reading the old home field. A second reference plan with assets would need to be built separately from the design, as the first one was.

4. **Saved plans need a migration.** Plan files are version 1, with a strict shape, so an exported plan with a home value would no longer load once the field moves. Options: a version 2 with a migration that turns the home value into a home asset; an optional asset list added to version 1; or folding everything into version 1 before any tester has saved a plan. A migrated plan must give the same results as before.

5. **Moving costs off Spending clashes with the spending categories.** Category ids must never change once plans are saved. Several categories mix asset costs with living costs: "Mortgage and rent" covers both a mortgage and a renter's rent, "Home and auto insurance" covers both, "Auto payment" is a car loan, and a group amount or one-total mode can't be split at all. The reviewers agreed on keeping every category, never moving amounts automatically, and showing the overlap. One option: a category whose cost is now on an asset shows "Counted on Assets", held at $0, with the old amount kept for switching back.

6. **Years before retirement have no cash-flow model.** Before the first retirement the plan has no spending need and no withdrawals; pay is assumed to cover living costs. Nothing there pays a mortgage, asset costs or a purchase, or receives rent or sale money. Suggested rule: pay covers asset costs and mortgage payments while working, as it does living costs; net rent and sale gains are taxed at the working rate and saved; and purchases are allowed only from the first retirement year, or drawn from non-registered savings and then the TFSA.

7. **"A yearly rise you enter" is ambiguous, and leaving it empty quietly changes the home.** Today the home rises with inflation, including any change made in Settings. Is the rate before or after inflation? An empty rate either blocks the plan or freezes the home's price, so it loses about 2% a year in today's dollars and the legacy drops with no explanation. Suggested: a choice of "with inflation", "inflation plus or minus X%", or "fixed X% a year". Following inflation is a convention, not a rule value, so it doesn't break the config rule. A migrated home would use "with inflation".

### Problems to settle in the design

- **Where asset events fall within a year.** A suggested order: the first-death handover; sales before purchases, so downsizing works; rent and sale gains counted as fixed income before the withdrawal search; asset costs added to what the year must pay; sale money saved; values and mortgages moved forward; the deemed sale at the second death. Open question: does sale money pay that year's needs and the sale's own tax first? If it is only saved, the plan draws taxable RRIF money while depositing to the TFSA, which raises tax.
- **Asset costs are not spending.** If they joined the spending need, the slower-spending phases and the survivor percentage would also shrink property tax and mortgage payments. They need their own amount, outside Goal 1's spending need and outside the dashed line on the Withdrawals chart.
- **Purchases.** "Paid from savings" doesn't say which account. Suggested: draw through the chosen withdrawal strategy, so tax and the OAS clawback are counted; the purchase always happens; any money missing is shown as a labelled shortfall, apart from Goal 1. The purchase price grows to the purchase year at the asset's own rate.
- **Who gets sale money.** Today's routine that saves a surplus splits it by the year's income shares, not by owner. Sale money must go to the owner (or 50/50 for joint), sharing TFSA room with that year's other surplus.
- **Joint ownership.** Accounts have one owner. Assets need an ownership share per spouse. A joint asset passes to the survivor directly at the first death: no probate and no deemed sale.
- **Tax rules needing a decision:**
  - Can a rental loss reduce other income, as Canadian rules allow, or is it floored at zero?
  - A loss on a vehicle or cottage must not offset later investment gains; it should be floored at zero before it reaches the plan's gains.
  - A loss on selling a rental is allowed and carries forward.
  - Is the generic "other asset" personal-use or an investment?
  - Rent is not pension income, so it can't be split, but it counts toward the OAS clawback.
- **Mortgages are fixed contracts.** Unlike spending, a mortgage payment doesn't rise with inflation. Balance, rate and payment are entered as they are; interest is worked out monthly; a payment at or below the first month's interest is refused; the payoff year shows on the card. Check case: $100,000 at 6% with $1,000 a month has $500.00 of interest in the first month.
- **One principal residence per couple per year.** At most one home at a time, with a sell-then-buy downsize allowed. The home is fully exempt and a cottage fully taxable, a simplification to state openly. Optional: show what tax at death would be if the cottage were the one designated.
- **Death, estate and probate.** The final return adds asset gains (home exempt, personal-use losses at zero); the estate adds asset values less mortgages; and Ontario probate deducts only debts secured on real property, which is a rule for the Ontario module. Is a vehicle loan deducted? Probate stays at the second death only; property outside Ontario is out of scope.
- **Assets are not accounts.** They must not be placed, rebalanced or counted in the investment mix. They need their own state, and a code name that doesn't clash with "asset class", for example `realAssets`, while the tab stays "Assets".
- **Results and warnings.**
  - The Withdrawals breakdown has a fixed 11 rows and needs a rent row; the author must approve changing it.
  - Should Balances show property less mortgages?
  - "Money runs out" ignores assets, and each asset card says it is only sold in the year set, never to cover a shortfall.
  - The Estate chart gets property and mortgage bars.
- **Screen.** One list like Savings' Accounts: an Add menu by kind, Edit and Remove on each row, closed at first, fields driven by one table of kinds. Tab position: after Savings, before Spending. The Estate tab's home field becomes a pointer to Assets. No mockup exists yet.
- **Checks and speed.** New balance checks for assets and mortgages, and new property tests: an asset that is only held changes only the estate; swapping the spouses along with their assets changes no totals; the home never pays capital gains tax. The 100 tip runs already take about 2 seconds, so cap the number of assets (for example 6) and add a timing case.
- **Vehicles and "other asset" earn little.** A vehicle almost never has a gain, so its tax path would never run. The real cost is replacing it every few years, which one purchase year can't express, and its running costs already sit in Spending. Options: drop vehicles, count only their falling value in the estate, or model a purchase every N years. "Other asset" invites entering a business or collectibles, whose rules it doesn't follow.

### Smaller points

- No new config values are needed if land transfer tax, HST, selling commissions and property outside Ontario are declared out of scope. The capital gains inclusion rate already in the config is reused at 50% for every gain size. Rules with no number, such as the principal residence exemption and the personal-use loss rule, need written sources in the design.
- Rent and costs rise with inflation while the value follows its own rate; the help text says so.
- Edge rules: the sale year must come after the purchase year; no sale after the second death; a sale in the second-death year replaces the deemed sale; a vehicle's value never goes below $0; rent stops in the sale year.

### The ideal final result (inventive lens)

The tab is a thin list of presets over one general asset model with a few tax flags: whether it's a principal residence, whether it's for personal use, whether it earns income, and whether it loses value. One function turns every asset into yearly amounts: extra money needed, money coming in per owner, taxable income per spouse, and estate value, probate base and gain at death. The year solver reads those amounts through the paths it already has and never learns what a cottage is. A version 1 plan loads with identical results. A plan with no assets keeps every test file identical. Every simplification is listed in Known gaps instead of hidden.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  - an Assets tab with the home (moved from Estate), cottages or second homes, rentals, vehicles and a generic "other asset";
  - an owner per asset (one spouse or joint);
  - a value, a yearly change and an optional mortgage per asset;
  - asset costs on Assets, not Spending;
  - optional purchase and sale years, with vehicles replaced every N years;
  - a full cash flow in the working years, with living costs while working;
  - net rent taxed as income and added to cash flow;
  - capital gains tax on sales and at the second death, with none on the home.
* **Out-of-Scope Non-Goals:**
  - capital cost allowance and recapture on rentals;
  - businesses, collectibles and annuities with their own tax rules;
  - default growth rates from the config;
  - a responsive phone layout (a later stage, for every tab);
  - (proposed by the reviewers, not yet decided) land transfer tax, HST, commissions, property outside Ontario, probate at the first death, tenants-in-common shares other than 50/50, a HELOC or reverse mortgage.

## Alternatives Weighed

- **A smaller first slice (zoom-out lens).** Slice 1 is a property list with each property's value, original cost and growth ("with inflation" by default), counted only at the second death through the existing final-return and probate code: no change to the withdrawal solve, Spending or strategies, and an additive schema change. Slice 2 adds a sale year or downsizing, with costs that stop at the sale. Slice 3 adds net rental income for one owner. Vehicles, "other", general purchases, mortgage amortization and joint ownership wait. Rejected by author: build everything in one stage.
- **Assets as streams of yearly amounts (inventive lens).** One function turns assets into yearly need, income, tax and estate amounts, so the solver gains no asset logic, and asset kinds are presets over flags. Carried into the draft as a recommendation.
- **Downsizing as one field.** "Downsize in year Y to $X" becomes a sale plus a purchase, with only the difference moving into or out of savings. Not yet decided; general purchase years stay either way, so this would be a shortcut on top.
- **A sale tied to an event,** such as "sell the cottage at the first death" or N years after it. Not yet decided.
- **Each asset kind's full tax rules in version one** (business shares and the lifetime capital gains exemption, collectibles, prescribed annuities). Rejected by author: replaced by one generic "other asset".
- **Capital cost allowance on rentals.** Rejected by author: net rent only; to be listed as a known gap.
- **Config defaults for growth rates.** Rejected by author: the user enters each rate, with "with inflation" as one of three modes.
- **Pay covers asset costs while working** (no cash flow before retirement). Rejected by author: working years get a full cash flow.
- **Vehicles as value only, or no vehicles.** Rejected by author: vehicles are replaced every N years.

## Key Decisions & Staging for Next Steps

Decided by the author during ideation:

1. The kinds are the home, cottage or second home, rental, vehicle, and a generic "other asset".
2. Any asset can have a sale year and a purchase year.
3. Any asset can carry a mortgage.
4. Rentals: net rent taxed as income, no capital cost allowance.
5. Growth rates are entered by the user; there are no config defaults.
6. Owner: spouse 1, spouse 2, or joint.
7. Asset costs move from Spending to Assets.
8. Build everything at once, in one stage, not in slices (2026-11-26).
9. Assets is a new stage right after stage 5, before stage 6 (warnings and tips), so warnings cover assets from the start. Stage 5 is tagged as it is first (2026-11-26).
10. Mobile: a responsive layout for every tab is one of the last stages. Assets is built for desktop now, like the other input tabs, and gets its phone layout in that stage (2026-11-26).
11. Plan files become version 2. Importing a version 1 file runs a migration that turns its home value into a home asset (joint, growing with inflation, no costs, mortgage or events), with identical results; version 1 exports keep loading (2026-11-26).
12. Original cost (price paid plus major improvements) is required for every asset except the home, entered in the dollars actually paid and never adjusted for inflation; the plan doesn't run until it is entered. A future purchase's cost is its purchase price (2026-11-26).
13. Growth has three modes: "with inflation", "inflation plus or minus X%", or "fixed X% a year" (negative allowed, for vehicles). A migrated home uses "with inflation", and the field shows the plan's inflation rate beside it (2026-11-26).
14. Spending overlap: when an asset carries a cost, the matching Spending category shows "Counted on Assets", held at $0, and keeps its old amount for switching back. Every category id stays; "Mortgage and rent" stays for renters (2026-11-26). Still to define in the draft: a group's own amount, or one-total mode, can't be held at $0 per category, so those cases show a notice instead.
15. Working years get a full cash flow (2026-11-26): pay, living costs and asset flows (costs, mortgage payments, rent, sale money, purchases) are all modelled before the first retirement, replacing "pay covers living costs". This goes beyond Assets: the plan needs living costs for the working years, and the yearly savings per account would interact with what is left over. Decided with it (2026-11-26): Spending gets its own monthly "living costs while working". Each working year, pay after tax less living costs, asset costs and the account savings you set is saved (TFSA room first, then non-registered); a shortfall is drawn from non-registered, then the TFSA. This replaces the working-year rule in the design's year solver and changes the reference plan's working years (a second reference plan is needed).
16. Sale money (after paying off the mortgage) first pays the sale's own tax and that year's needs; the rest is saved, TFSA room first, then non-registered (2026-11-26).
17. A purchase always happens. It is funded through the chosen withdrawal strategy, so its tax and any clawback are counted, and any money missing shows as a labelled "purchase" shortfall, apart from the spending goal (2026-11-26).
18. Mortgages use the balance, rate and fixed monthly payment from the statement, with interest compounded semi-annually (the Canadian rule) and no renewal changes. A purchase can carry a new mortgage. A payment at or below the interest is refused (2026-11-26).
19. Losses follow the tax rules (2026-11-26):
    - a rental's yearly loss reduces the owner's other income;
    - a loss on selling a rental carries forward like other capital losses;
    - a loss on personal-use property (a vehicle or cottage) counts as zero;
    - the "other asset" has a switch for personal-use or investment.
20. Principal residence (2026-11-26):
    - the home is the principal residence and fully tax-free;
    - a cottage is fully taxable;
    - at most one home at a time, with a sell-then-buy downsize allowed;
    - the Estate tab shows what tax at death would be if the cottage were designated instead.
21. Vehicles have a price, a yearly loss in value and a "replace every N years" setting. Each replacement is a purchase, net of the old vehicle's value, funded like any purchase. There is no tax, since a loss on personal-use property counts as zero (2026-11-26).
22. Probate at the second death uses Ontario's rule: property and accounts that pass through the estate, less mortgages on real property only, so a vehicle loan isn't deducted. The rule is cited from the Estate Administration Tax Act in the design (2026-11-26).

23. Screens and results (2026-11-26):
    - the Assets tab sits between Savings and Spending, laid out like the Savings Accounts list: an Add menu by kind, Edit and Remove on each row, closed at first;
    - the Withdrawals year breakdown gains rows for rent, asset costs, mortgage payments and sales or purchases;
    - Balances gains a "property less mortgages" band;
    - the Estate chart gains property and mortgage bars;
    - the Estate tab's home field becomes a pointer to Assets.

Carried into `/egm-draft` as recommendations, not yet decided by the author:

1. **Amend the design together:** Non-Goals (selling a home, mobile wording), O16 (other income), G1 (tab count), Success Criteria, and Known gaps (CCA, probate only at the second death, Ontario property only, one principal residence without the "plus one" year formula).
2. **Build the engine part as one function** that turns assets into yearly amounts: need, money in per owner, taxable income per spouse, estate value, probate base and gain at death. Asset kinds become presets over four flags, and the year solver reads only those amounts.
3. **Keep the protected reference plan unchanged.** The engine still reads the old home field, and asset detail lives in a new part of the year row. A second reference plan with assets is built blind from the amended design, with tax cases for a rental loss and for a sale-year gain that triggers the clawback.
4. **Keep asset costs out of the spending need,** so phases, the survivor percentage and Goal 1 don't apply to them. They get their own lane in the year solve and in the household balance check.
5. **Sale money goes to its owner** (50/50 for a joint asset) and shares TFSA room with that year's other surplus. A joint asset passes to the survivor at the first death with no probate and no deemed sale.
6. **Cap the number of assets** (for example at 6) and add a timing case. The 100 tip runs are already near the 2-second target.
7. **Consider two shortcuts:** "downsize in year Y to $X" (a sale and a purchase together) and "sell at the first death".
8. **Settle the screen's look:** a mockup for the Assets tab, or a statement that the Savings layout applies.
9. **Declare out of scope:** land transfer tax, HST, commissions, property outside Ontario, tenants-in-common shares other than 50/50, and HELOCs and reverse mortgages.
