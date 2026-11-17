# Canadian Retirement Planner (Ontario Couple, Version 1)

* **Author:** weaponex
* **Date:** 2026-11-17

## Overview

A free retirement planner that runs entirely in a desktop web browser. It is for Canadians who want to see how three groups of decisions affect each other:

1. **Spending:** how much a couple plans to spend in three retirement phases (active early years, slower middle years, late years), plus how much they want to leave to their children after tax.
2. **Investing with taxes in mind:** which kinds of investments to hold in which accounts (RRSP/RRIF, TFSA, non-registered, workplace defined-contribution pension), and how to shift from growth investments toward safer ones as retirement nears and progresses.
3. **Withdrawals:** which accounts to draw from and in what order, when to start CPP and OAS, required RRIF minimum withdrawals, splitting pension income between spouses, the OAS clawback, and the tax bill when the second spouse dies.

The user can move freely among the three areas, change any input, then press **Recalculate** to rerun the whole plan. Market returns vary from year to year in the model, so the user can see the risk of a bad market early in retirement and what moving to safer investments does about it. After each run, the app warns when something is at or near a known threshold (for example, the OAS clawback or running out of money), and says which inputs affect that warning.

The tool teaches. It does not give personal advice and never moves money. Nothing the user types leaves the browser. Plans save automatically in the browser and can be exported to a file and imported again.

**First users:** the author and a few trusted friends and family, all modelled as an Ontario couple. **Long-term intent:** share it free with all Canadians.

**Why build it when paid tools exist:** the goal is not to beat paid tools. It is to offer a free, private tool that calculates, in after-tax dollars on the user's own plan, what tax-aware investing and withdrawal choices are worth.

**Starting point:** a clean rewrite built with AI coding agents. Only `retirement-planner-context.md` carries over, and only as a record of decisions and past defects. Its "intended spec" section (§4) conflicts with this brief in several places and must not be treated as the specification (see Analysis, item 10).

## Analysis

Seven independent reviewers looked at this concept, each from a different angle. They agree that the idea holds up, but it is not ready to hand to coding agents. The three things that broke the prototype are still unresolved in the concept: units were never defined, the yearly calculation was never written down step by step, and nothing was ever actually run as a test. The scope also bundles three hard products into one: a full Canadian tax calculator, a variable-return simulator, and a tool that teaches which investments to hold in which account.

**Caveat:** the reviewers' tax and benefit figures come from model memory and were not checked against CRA or Service Canada. They show that the old figures are wrong. They are not replacement values.

### Blocking problems

1. **Today's dollars versus future dollars is still undefined.** Some amounts are naturally in future (nominal) dollars: the original purchase cost of investments (used to compute capital gains), RRIF minimums, probate, and tax brackets that rise with inflation each year. Spending, the legacy goal and the warning thresholds are entered in today's dollars. If the engine works only in today's dollars, it cannot tax capital gains correctly, because inflation alone creates taxable gains. The old document also adjusts for inflation starting from retirement instead of from today.
   **Fix the reviewers agree on:** the engine calculates everything in future dollars. Today's-dollar inputs are converted once on the way in, and results are converted back once for display, measured from today. Each tax constant records whether it rises with inflation. (Ontario's $150k and $220k bracket thresholds, the surtax structure and the $50k probate threshold do not.) The code should use separate types for "today's dollars" and "future dollars" so mixing them fails to compile. Every chart and warning is labelled with its unit.

2. **Each year's tax and withdrawal calculation depends on itself.** How much you withdraw sets your taxable income. Taxable income sets tax, the OAS clawback and how pension income is split. Those in turn set how much you have to withdraw to cover spending. The prototype dropped tax at exactly this point.
   **Fix:** one isolated function solves each year, in a written order: fixed income and required minimums first, then extra withdrawals in the chosen order. It finds the right gross withdrawal by repeatedly halving the search range (bisection), which always converges here because no one pays more than 100% tax at the margin. It has a tolerance, an iteration limit and a defined behaviour on failure. Any money forced out by a RRIF minimum beyond what's needed is reinvested (TFSA if there's room, otherwise non-registered), never lost. The step order within a year is written as pseudocode before any code: contributions, returns, minimums, needed withdrawals, rebalancing, tax. Ages are counted at January 1 and rows are calendar years.

3. **What happens at each death is missing, so the legacy figure would be invented.**
   * **First death:** registered accounts and non-registered investments (at their original cost) roll over to the spouse; the TFSA passes to the spouse as successor holder. The deceased's OAS stops. The survivor gets the CPP survivor benefit (capped) and the $2,500 death benefit, files as a single person with no more income splitting (often a large tax jump), and usually spends 60–75% of what the couple spent.
   * **Second death:** the whole RRIF counts as income on the final return, non-registered investments are taxed as if sold, and Ontario's probate tax applies to assets that pass through the estate.
   * **Fix:** a set death age for each spouse (or run both orders), a survivor spending percentage, and a "plan to age" input instead of "life expectancy". Planning to the average life expectancy means roughly a 50% chance of living longer than the plan.

4. **The tax model needs credits and Ontario-specific items, and the old figures are wrong.** Required: basic personal amount, age amount and its income-based reduction, pension income credit, dividend gross-up and credit (federal and Ontario), Ontario surtax, Ontario Health Premium, and the OAS recovery tax. Reviewers found errors in the old document: the bottom federal rate (it is not 15% for 2025 or 2026), the federal bracket thresholds, the year of the OAS clawback threshold, the RRIF table, stale CPP and OAS amounts, and a risk that agents will "remember" the cancelled two-thirds capital gains inclusion rate.
   **Fix:** agents never supply constants from memory. Each constant is stored with its value, tax year, source link, date retrieved, and whether it rises with inflation. The UI shows the tax year.

5. **There is no independent check on the numbers.** Tests written by the same agent that writes the engine only confirm what that agent believes.
   **Fix:**
   * Check tax against outside calculators (for example TaxTips.ca and CRA tables) at 20 or more income levels with mixed income types, including a year of death.
   * The author builds a year-by-year spreadsheet for one couple with fixed returns, and the engine must match it within $1 per row.
   * Agents can't edit these reference files.
   * Tests run automatically on every change.
   * Basic rules are checked on every run, for example:
     * after-tax money is conserved;
     * original cost is never negative;
     * the same random seed gives the same result;
     * higher spending never raises the chance of success.

6. **A manual Recalculate button means tabs will show stale results.** That directly threatens the second success criterion ("see the effect in other areas"). **Fix:** one shared plan behind all three tabs. Results are tagged with the inputs they came from. When inputs change, every result on every tab dims and says "Inputs changed — Recalculate". The button appears on every tab. After each run, the app shows what changed, for example "Success 78% → 84%; legacy −$62k; clawback years 3 → 7".

7. **Random results must repeat, and comparisons must use the same market history.** Without a fixed random seed, pressing Recalculate twice with no changes gives different answers. The benefit of putting investments in the right accounts is often only a few percent of the estate, which is smaller than the random noise. If the two choices are compared on different random markets, a user could learn the wrong lesson. **Fix:** store the seed in the plan, run every comparison on identical market paths, and report the difference path by path (the typical case and the bad case).

8. **"Success", "typical" and "bad markets" are undefined.** **Fix:** success means every year's spending is covered. The legacy goal is reported as a separate probability. "Bad" is a named percentile (for example, the worst 10% of outcomes). Each warning states what it is measuring and over which years.

9. **Saved plans have no version number or upgrade path.** Agents will change the data format often, and users will hold exported files. **Fix:** a version number on every save, tested upgrade steps from each older version, validation on load, a backup kept before any upgrade, and only inputs saved (never results).

10. **The CPP input is wrong for someone who stops working at 55.** "Average" and "Maximum" assume contributions continue to 65. Retiring at 55 adds about 10 years with no contributions, and the newer CPP enhancement has no rule to drop low years. **Fix:** start from the user's Statement of Contributions estimate and reduce it for the years without contributions.

### Major problems

* **Too much to build at once with agents.** Build in stages, each one tested before the next starts (see Key Decisions).
* **The growth-to-safety shift and account placement pull against each other.** The shift changes the investment mix over time, but placement wants each kind of investment to stay in a particular account. RRIF minimums also shrink the account holding the bonds, and rebalancing in a non-registered account triggers capital gains. With no written rules, agents will make them up. See contradiction C3 below.
* **A fixed withdrawal order is too narrow, and the old "tax-optimal" label is wrong.** Retiring at 55 and starting CPP and OAS at 70 is the classic case where drawing the RRSP down early, while income is low, wins. Ship two named withdrawal strategies and show the dollar difference between them.
* **A workplace DC pension is not a freely drawable pot.** In Ontario it becomes a LIRA and then a LIF, which has a *maximum* yearly withdrawal as well as a minimum, plus a one-time option to unlock 50%. Pension income splitting only applies to RRIF and LIF income at 65 or older; regular RRSP withdrawals, CPP and OAS don't qualify. So the model must treat the RRSP and the RRIF as separate, with the conversion age as an input.
* **Investment fees are missing.** Fees often cost more than most tax tweaks save.
* **The ">7% real return" warning is too loose.** FP Canada's planning guidelines imply roughly 5% above inflation for stocks and 2% for bonds.
* **Speed.** One thousand simulated market paths may take 1–20 seconds depending on design. Set a target (for example, under 3 seconds on a mid-range laptop), run it off the main screen thread with a progress bar and cancel, and let the user choose the number of paths.
* **Warnings will fire constantly and contradict each other.** The old test plan would trigger five of the eleven at once. Drawing the RRSP early (to shrink the tax bill at death) works against avoiding the OAS clawback. The "high early withdrawal" warning always fires for someone intentionally drawing down savings before CPP and OAS start. "Near the next tax bracket" should instead measure where the real jumps in tax per extra $1,000 occur (surtax, age-amount reduction, clawback, health premium). Additions worth considering: running out of money before CPP and OAS start, the survivor's tax jump, the LIF maximum limiting withdrawals, and the non-registered account running out of original cost.
* **The context document mixes spec, history and defects.** Its §4 contradicts this concept: it splits a couple's tax 50/50, fixes the withdrawal order, uses one CPP/OAS age for both, mixes units, and treats variable returns as optional. Its §6 default values are the author's personal finances and must not ship as defaults. Turn them into a test case or a "load sample plan" option.
* **Jargon.** Most users won't know RRIF, cost base, deemed disposition, glide path, sequence risk or percentile, and will confuse "asset location" (which account holds what) with "asset allocation" (the overall mix). One glossary should feed all tooltips. Label the spending input as after-tax, with a line showing the tax added on top. Show the estate as a step-down chart from total assets to what the children receive.
* **The test friends may not fit the scope.** Defined-benefit pensions (OMERS, HOOPP, teachers' plans) and single people are common. If a test friend has one, they can't finish a plan. A simple "other income from age X to Y" input is cheap.
* **Leaving out the home makes the legacy warning misleading.** The home is often the largest asset left to children. It's exempt from capital gains tax but subject to probate.
* **Browser storage can disappear.** It can be lost to browser cleanup (Safari can clear it after 7 days without a visit), in private windows, or when two tabs overwrite each other. Keep the last several autosaves, ask the browser to keep the data, remind the user to export, and handle running out of storage space.
* **Advice-sounding language.** Use only conditional, comparative wording ("under these assumptions, X left $Y more"), never "you should". Show the disclaimer on first run, in the footer and in exports. Check Ontario's FSRA expectations before any release beyond family.

### Built-in trade-offs and how to remove them

* **C1. Today's dollars versus future dollars.** The engine uses future dollars only. Today's dollars exist only at input and display, enforced by the compiler. *Ideal result:* code that mixes the two can't be written.
* **C2. Random returns versus a precise placement effect.** Generate one set of random markets per recalculation. Run the user's plan and a simple comparison case (for example, "same mix in every account") on those same markets automatically, and show the difference along with a fixed-return version for teaching. *Ideal result:* every recalculation shows "what this placement is worth to you" with no extra steps.
* **C3. Shifting the mix over time versus keeping each investment in its best account.** Placement becomes a yearly rule, not a fixed setup. The user picks a placement approach. Each year the engine works out what each account holds, rebalancing inside registered accounts first and the non-registered account last (realizing gains when it does), and shows the result. *Ideal result:* the user states intent, and the engine keeps both goals consistent and shows the tax cost.
* **C4. Free movement between tabs versus a manual Recalculate.** One shared plan, stale results dimmed everywhere, and a summary of changes after each run. *Optional:* the fast fixed-return projection updates live while the slow random-return run waits for the button. The two would be labelled, since they will differ.
* **C5. Tax accuracy versus speed.** Exact tax schedules or bisection for each year; a simple rule for pension splitting (equalize incomes, capped at 50%); run off the main thread. *Ideal result:* one exact pass per year, with "after-tax income equals spending" checked every time, so tax can never be silently dropped again.
* **C6. Specific warnings versus a plan with random outcomes.** Each warning is a rule written down as data. It names:
  * what it measures (one representative path, or the share of all paths);
  * which years it covers;
  * whether it applies to each spouse or the household;
  * its units and its trigger levels;
  * how serious it is;
  * which input fields it links to.

  Repeated years collapse into one line ("first at age 72, 6 years"). Tips can be computed by nudging each input and seeing which ones move the warning.
* **C7. Realistic market history versus enough data.** Either resample chunks of real history (realistic, but there are few long Canadian windows and the data may carry licensing limits), or use generated returns plus 2–3 named historical stress tests (no licensing issue, easy to explain). Reviewers split.
* **C8. Large scope versus agent-written code.** Small modules (about 300 lines each) with reference tests written first. The engine checks its own accounting at runtime and refuses to show a broken result. Always rewrite whole functions rather than patching them. Tag every passing milestone.
* **C9. Ontario now versus other provinces later.** No Ontario-specific values hard-coded in the engine. Whether a full province interface is worth building yet is disputed.
* **C10. Browser-only privacy versus durability.** Version numbers, upgrade steps, rolling backups and export reminders.

**Trade-offs to leave visible, not "solve":** spending more now versus leaving more; higher expected returns versus lower downside risk; starting CPP/OAS early versus late; drawing the RRIF early versus paying more tax and clawback while alive. Presenting one "optimal" answer would also read as advice.

**Ideal final result:** one engine working in future dollars, driven by one versioned plan file. Each Recalculate generates one seeded set of markets, runs the plan and its comparison cases on those same markets, computes tax exactly, checks its own accounting, and returns one result. The three tabs are views of that result. They show when they're stale and what changed after each run. Warnings carry a computed likelihood and the inputs that drive them. The plan explains what each tax decision is worth, and the engine, not the user, catches wrong numbers.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * A correct, tested, tax-aware yearly engine for an Ontario couple, with each spouse modelled separately:
    * each spouse owns their own accounts, and has their own CPP and OAS start ages, retirement age and RRIF conversion age;
    * the RRSP and the RRIF are modelled separately;
    * DC pension handled as a LIRA/LIF with minimums and maximums;
    * DB pension for either spouse, entered from the pension statement (lifetime amount, bridge benefit, indexing, survivor percentage);
    * TFSA, and a non-registered account with original-cost tracking;
    * full federal and Ontario tax with credits;
    * OAS clawback based on actual taxable income;
    * pension splitting by a simple rule;
    * first and second death, and Ontario probate.
  * Variable returns with a stored random seed, showing the risk of a bad early market and the benefit of moving to safer investments.
  * The after-tax dollar value of putting investments in the right accounts, shown as a difference on identical markets. This is the core lesson.
  * Three tabs (spending, investing, withdrawals) over one shared plan, an explicit Recalculate button, a "results are stale" indicator, and a summary of what changed since the last run.
  * Threshold warnings with tips on which inputs affect them. Start with about 7–8 and grow the list through use.
  * Automatic saving in the browser plus file export and import, with version numbers and upgrade steps.
  * Reference tests that actually run, and accounting checks on every run.
  * Educational wording and a visible disclaimer.
* **Out-of-Scope Non-Goals (version 1):**
  * Quebec/QPP and other provinces (the design leaves room for them).
  * RESP, Canada Child Benefit, or any child-related planning other than legacy.
  * Personal advice, automatic optimizers, or executing trades.
  * Accounts, sync, or sharing a plan between devices other than by file.
  * Mobile layout, colour themes, PDF export.
  * Alternative minimum tax, GIS, tax-loss harvesting.
  * Annuities, spousal RRSP attribution rules, CPP pension sharing.
  * Random lifespans, long-term-care cost shocks, one-time events (home sale, inheritance).
  * DB pension commuted value (taking a lump sum instead of the pension).
  * Still disputed (see Key Decisions): foreign dividend withholding tax, general "other income", random inflation, basing the RRIF minimum on the younger spouse's age.

## Alternatives Weighed

**Rejected during ideation:**

* **Phases that feed one into the next in one direction only.** Rejected by author: the point is to change any area and see the effect on the others.
* **Live recalculation on every change.** Rejected by author: the user edits inputs and presses Recalculate when ready. Reviewers suggest reconsidering a live fixed-return preview next to the button-driven random-return run (open below).
* **A fixed-return-only model.** Rejected by author: with fixed returns, moving to safer investments always looks worse, so the growth-to-safety strategy can't be shown honestly.
* **Explaining tax-efficient investing in text only.** Rejected by author: the app must calculate the dollar effect on the user's own plan.
* **Server storage, user accounts, multi-user plans.** Deferred by author: nothing leaves the browser in version 1.
* **RESP and Canada Child Benefit planning.** Rejected by author: children matter only for legacy planning.
* **Reusing the prototype code.** Rejected by author: clean rewrite; only the context document carries over.
* **Trying to beat paid tools on features.** Rejected by author: the aim is a free, private tool that teaches.
* **Planning for all provinces in version 1.** Rejected by author: start with an Ontario couple.
* **Export as the only way to resume.** Replaced by author agreement: automatic saving in the browser, with export as backup.

**Raised by reviewers, still open:**

* Generated random returns with named stress tests, versus resampled real history, versus "if you had retired in 1966" historical windows.
* Placement as 2–3 preset approaches compared with a baseline, versus a priority list the user edits, versus an automatic optimizer. The optimizer is heavy and reads as advice.
* A fixed withdrawal order, versus two named strategies including drawing the RRSP down early in low-income years.
* A full province interface now, versus only a rule against Ontario-specific values in engine code.
* Running the simulation off the main thread from day one, versus only after measuring.
* Hand-written warning tips linked to input fields, versus tips computed by nudging inputs.
* Which number measures the placement effect: after-tax legacy, lifetime tax, or sustainable spending.
* Using Optiml, ProjectionLab, TaxTips.ca and the Government of Canada calculator to check results, not as replacements.

## Key Decisions & Staging for Next Steps

**Settled:**

* Free, desktop-first, browser-only; nothing leaves the browser.
* Version 1 audience is the author and a few trusted people; long-term intent is broad free release.
* Version 1 models an Ontario couple. Children matter only for legacy.
* Three linked tabs with free movement and an explicit Recalculate button.
* Variable returns are required.
* The app calculates, not just explains, tax-efficient placement and the growth-to-safety shift.
* Warnings flag thresholds that are near or crossed, with tips; the list grows through use. Starter list: running out of money, low chance of success, OAS clawback, tax jumps, unbalanced spouse incomes, RRIF minimum forcing extra income, large RRIF balance at second death, legacy target missed, high early withdrawal rate, contribution room exceeded, optimistic return assumptions.
* Automatic saving in the browser plus export and import.
* Built by the author with AI coding agents as a clean rewrite.
* **Rule values live in a config file, not in code (resolves objection 1).** Every value that calculations depend on (tax rates and brackets, credits, dividend gross-up and credit, capital gains inclusion rate, OAS and CPP amounts and age adjustments, clawback threshold, RRIF and LIF tables, probate rate, TFSA limit) is stored in a config file, one file per tax year. Each entry records: value, unit (yearly or monthly, dollars or percent), tax year, whether it rises with inflation, source link, where on the page it came from, date fetched, and validation status (who validated it and when).
  * Values are fetched from official sources (CRA, Service Canada, Ontario, FSRA) at build time, never from agent memory. A second, independent fetch must agree before a value is accepted. Disagreements go to the admin.
  * The app never fetches values while running. The config is bundled with the app, and the tax year in use is shown on screen.
  * An "admin" (the author for now) validates the config periodically. The minimum is once each January for the new tax year, plus each quarter for OAS amounts. The app shows a notice when any value in use is unvalidated or from an older tax year.
  * Coding agents may read the config but not change validated values. Changes go through the admin.
  * The app's users never check figures.
* **Death and survivorship (resolves objection 2; confirmed by author).** Each spouse has a life expectancy target that the user can edit. It is the age at which that spouse dies in the plan. Who dies first follows from the two targets and birth years, so no separate swap switch is needed. At the first death the plan models:
  * the rollover of registered and non-registered assets to the survivor;
  * TFSA successor holder;
  * the deceased's OAS ending;
  * the CPP survivor benefit (capped) and the $2,500 death benefit;
  * the survivor taxed as a single filer with no pension splitting;
  * survivor spending as an editable percentage of the couple's.

  At the second death it models:
  * the full RRIF counted as income on the final return;
  * non-registered assets taxed as if sold;
  * Ontario probate.

  The legacy is measured after the second death, after tax and probate.
  * Default life expectancy target: the age with a 25% chance of survival from FP Canada's Projection Assumption Guidelines. This requires a sex-at-birth input for each spouse. The value is stored in the config with its source.
  * Default survivor spending: 70%. It is based on the square-root household equivalence scale (a single person needs about 1/√2 ≈ 71% of a couple's income), which Statistics Canada uses for its low-income measure. It is a general household scale, not a retiree study, and is stored in the config with its source.
* **How placement value is measured and shown (resolves objection 3; confirmed by author).**
  * Each recalculation uses a random seed stored in the plan, so the same inputs always give the same answer.
  * The user's placement and a simple comparison case (the same mix in every account) run on the identical set of simulated markets. The difference is reported path by path: the typical case and the worst 10% of markets. A fixed-return version sits next to it as a simple teaching example.
  * The headline is **lifetime tax paired with after-tax money left**. Lifetime tax includes the tax on the final return at the second death and probate. Example: "This placement pays $62k less tax over your lifetime and leaves $48k more after tax." When the two move in opposite directions, the app says so and explains why (for example, less tax because the money grew less). Lifetime tax is never shown alone, because the slowest-growing placement would always "win."
  * The comparison states whether the asset mix is counted in before-tax or after-tax dollars (an RRSP dollar is partly owed in tax, a TFSA dollar is not). The return assumptions that drive the result live in the config with sources.
* **Defined-benefit (DB) pensions are in version 1 (confirmed by author).**
  * Either spouse can have one, entered from their annual pension statement rather than calculated from plan rules. The app can't maintain a separate rulebook for each plan (OMERS, HOOPP, the Ontario teachers' plan, and so on).
  * Inputs:
    * lifetime pension amount and start age;
    * any bridge benefit and the age it ends (often 65);
    * indexing as full inflation, a fixed percentage, or none, with a note that conditional indexing is not guaranteed;
    * survivor percentage (often 60–66⅔%).
  * The engine treats DB payments as taxable pension income. They qualify for pension income splitting and the pension income credit at any age (unlike RRIF income, which qualifies at 65 or older). The survivor share continues after the first death.
  * While working, a DB pension reduces RRSP room, which matters to the contribution-room warning.
  * Out of scope for version 1: the commuted-value choice (leaving the plan with a lump sum instead of a pension).
* **Checking calculated results.** Tax results are checked against online tax calculators at fixed test cases, with the expected answers stored as test fixtures. Nothing published online can check the full year-by-year loop. It is checked by accounting checks the engine runs on every recalculation, a reference plan built by a separate AI session that never sees the engine code, and a rough comparison with one paid tool. This is weaker than a hand-built spreadsheet. A rule both AI sessions misunderstand can slip through. (Confirmed by author.)
* Success means the author and two friends each complete a full plan, change one area and see the effect on the others without help, and learn at least one tax-efficient investing idea they didn't know.

**Suggested build stages** (no screen work until stage 2 passes):

* **Stage 0:**
  * a short "Units and Conventions" document;
  * the saved-plan format;
  * 2026 constants with sources;
  * reference tax test cases from outside calculators;
  * the author's year-by-year reference spreadsheet.
* **Stage 1:** tax for one person.
* **Stage 2:** couple engine with fixed returns.
* **Stage 3:** deaths and estate.
* **Stage 4:** variable returns, within the speed target.
* **Stage 5:** tabs, stale indicator and change summary.
* **Stage 6:** warnings.
* **Stage 7:** saving, export and upgrades.
* **Stage 8:** test with the author and two friends.

**Open decisions for `/egm-draft`:**

* **Units and timing**
  1. Confirm the engine works in future dollars and converts from today's dollars. Fixed or random inflation? Are thresholds indexed to each path's inflation?
  2. Ages counted at January 1, one row per calendar year, when returns land within the year, and when tax is paid.
* **Returns and investing**
  3. Return method, asset classes (3–4), where the assumptions come from, the income-type split for each class, fees, and defaults (FP Canada guidelines suggested).
  4. Placement model (presets or a priority list), and whether the asset mix is counted in before-tax or after-tax dollars.
  5. Growth-to-safety settings: presets or 2–3 points, which spouse's age drives them, how often to rebalance, and whether rebalancing the non-registered account triggers capital gains (reviewers say yes).
  6. Foreign dividends and withholding tax: in or out.
* **Withdrawals, tax and benefits**
  7. Which withdrawal strategies ship and exactly how each one works; where extra money from RRIF minimums goes.
  8. Pension splitting rule; RRSP-to-RRIF conversion age as an input.
  9. DC pension as an Ontario LIF with minimum, maximum and the 50% unlock (automatic, optional or left out).
  10. How to estimate CPP for someone who stops working at 55.
  11. Which tax items are in or out. Also the config file format and the list of official source pages for each value.
* **Death and estate**
  12. Death ages for each spouse, who dies first (or both orders), survivor spending percentage.
  13. Probate assumptions (named beneficiaries, joint ownership) and whether the home counts toward legacy and probate.
* **Results and warnings**
  14. Definition of success, whether the legacy goal counts toward it, which percentiles mean "typical" and "bad".
  15. For each warning: what it measures, over which years, per spouse or household, trigger levels, priority, and how to show conflicting tips. Rework or drop "next tax bracket", "unbalanced incomes" and "contribution room". Change "high early withdrawal" so it doesn't fire for an intentional draw-down before CPP and OAS start.
* **Product and audience**
  16. Check the two test friends' situations first: couple only, or singles too? A general "other income" stream (for example part-time work) in or out? (DB pensions are now in scope.)
  17. Empty start with a "load sample plan" button. The author's personal numbers never ship as defaults.
  18. Spending categories: a simple adding aid, or deferred.
  19. Button-only, or a live fixed-return preview plus the button. Speed target and default number of simulated paths.
  20. Whether the placement lesson must ship in the first release or can follow once the engine is trusted.
* **Release and documents**
  21. Disclaimer wording and placement, neutral strategy names, and an FSRA check before any release beyond family.
  22. Split `retirement-planner-context.md` into a concept document, a design document, a decision log, a prototype post-mortem, a defect list, a constants registry and test fixtures. Do not carry its §4 forward as the spec.
