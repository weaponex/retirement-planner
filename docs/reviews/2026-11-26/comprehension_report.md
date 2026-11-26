# Comprehension report: Stage 6 (2026-11-26)

Target: [docs/designs/retirement-planner.md](../../designs/retirement-planner.md), FeatureRange 1–1655, DetailedRange 1656–2617, focused on the Stage A (Assets) amendment. One reviewer (`egm-comprehension`), reading the document alone, with no other files and no document standard.

## What this proposes

The amendment adds an Assets input tab. On it the couple can enter up to 6 assets: one home, cottages or second homes, rentals, vehicles and an "other" asset marked as personal-use or investment. Each asset has an owner (either spouse, or joint 50/50) and a value that grows by a rate the user picks. It can also have yearly costs, a mortgage with interest compounded twice a year, net rent, and a sale or purchase in a set year. There are two shortcuts: "downsize in year Y to $X" on the home, and "sell at the first death" on any asset.

These amounts flow into each year's cash and each spouse's tax:

- Net rent is taxed as ordinary income, and a rental loss reduces other income.
- Sales are taxed as capital gains on the original cost. The home is exempt, and personal-use losses count as zero.
- Sale money pays that year's needs first, and the rest is saved.
- A purchase always happens; money that is missing shows as a separate "purchase shortfall".

At the second death, every asset except the home is deemed sold. The estate counts asset values less mortgages, and Ontario probate deducts only mortgages on real property. If a cottage is held at the second death, the Estate tab shows the cottage-designation comparison.

If the user enters "living costs while working", the years before the first retirement get a real cash flow: pay after tax, less living costs, asset costs and set savings. A surplus goes to the TFSA and then non-registered savings, a gap is drawn from non-registered then the TFSA, and those years count in Goal 1. Spending categories that an asset now carries are held at $0. Version 1 plan files migrate to schema version 2 with identical results.

## How the existing system works, per this document

Today a browser-only React app recalculates live in a Web Worker. A pure TypeScript engine works in nominal dollars. Year by year, it solves each year's withdrawal by bisection so that after-tax cash meets the spending need, under three withdrawal strategies, with tax for each spouse and a pension-split search. It models both deaths and works out the after-tax legacy. The home is one optional Estate-tab value that grows with inflation and counts only in the estate and probate. Working years have no spending need, because pay is assumed to cover living costs.

The plan inserts one stage, Stage A (tag `stage-assets`), between stage 5 and stage 6, built in 10 ordered steps:

- **Rules:** the design merge and the rule sources read (SA1–SA5).
- **Plan file:** the v2 schema and the migration (SA6–SA9).
- **Asset module:** a new stepped module, `src/engine/assets/`, which is the only code that changes asset state. Both the retired-year solver and the working-year path call it four times a year (SA10–SA11).
- **Engine changes:** the solver, working years, invariants, death and estate, and results (SA12–SA17).
- **State and screens:** SA18–SA22.
- **Tests:** a second reference plan built by a separate AI session, new tax cases, end-to-end tests for CUJ 7, and a hand timing check with 6 assets (SA23–SA30).

## Findings

There are no Blockers: everything in the focus scope could be paraphrased. The main barrier for a reader with no other context is finding 1, because many Assets rules are given only as AD or AR ids that point to a brief the reader isn't given.

1. **Major. The id families AD, AR, OA, A and BA are never explained** (whole amendment; for example lines 28, 93–106, 111, 186–190, 282, 1031–1049, 1274, 1455–1557, 1679–1685, 2367).
   - **Issue:**
     - AD2–AD23 are cited dozens of times, but the document never says what "AD" is or where those decisions live.
     - "AR1–AR9" is explained only at line 2367, roughly 2,000 lines after first use.
     - The Known gaps prefix list (lines 1660–1666) doesn't include BA-.
     - The bare "AR2" (OA2, line 186) clashes with the stage 5 review's "AR2-S1", "AR2-L1", "AR2-R1" and with "AR-S3".
     - Several AD ids carry content the reader never sees: AD8, AD10, AD12, AD21, AD23.
   - **Fix:**
     - Define every family in one paragraph, near the Open Questions intro or in Known gaps.
     - Rename the bare Assets recommendations (for example "AAR2").
     - Wherever an AD id is the only explanation, state its content in a short phrase.
2. **Major. The cottage comparison needs the home's original cost, but the home doesn't require one** (lines 729, 1040, 1529–1533, SA10 `atSecondDeath`). A migrated home has no cost at all.
   - **Fix:** Require the home's cost when a cottage is held, or hide the comparison without it, or state a fallback.
3. **Major. Stage A builds on import and export code the stage plan says doesn't exist until stage 7** (lines 1078, 1083, 2154–2156, SA8, SA24, line 2601, G15). File 43 dates `exportImport.ts` to stage 7, yet SA8 modifies it, Persistence runs the migration from Import, and the manual check imports an exported plan.
   - **Fix:** Say whether Stage A only creates the migration (with stage 7 wiring it into Import and autosave), or correct file 43 to say export and import already exist.
4. **Major. "Rental loss" is used for two different losses** (G12 line 93, line 668, Alternative AL, SA10 `tax.ts`, SA23). It means a yearly operating loss (negative net rent) in one place and a capital loss on a sale in another.
   - **Fix:** Use "rental operating loss" and "capital loss on selling a rental" throughout.
5. **Major. Vehicle replacement and vehicle loans are underspecified** (lines 1048, 1262, 1268, 698, 728, 1539, SA18).
   - **Issue:**
     - No field holds a replacement vehicle's price, and nothing says how it is grown.
     - "A vehicle loan" is referred to but never defined as an input. If it is the `mortgage` field, mortgage compounding applies to a car loan without comment.
   - **Fix:** Name the replacement price rule and its field. Define the vehicle loan and its compounding.
6. **Major. Whether the migrated home gives identical results isn't shown** (lines 718, 1067, 1079, 689–694, G15). A v1 home is valued with the start-of-year deflator, while a v2 asset grows after price returns and is deemed sold at its end-of-year value. That looks like one more year of inflation. It is also unclear whether the protected reference plan runs through the migration.
   - **Fix:** State the home's valuation timing at the second death and show that it equals the v1 formula, or say which path the reference plan takes.
7. **Major. BA-7 has three different deadlines** (lines 1685, 1700, SA3): "before step 5", "before Stage A starts" and "step 1".
   - **Fix:** Pick one deadline and use it in all three places.
8. **Nit. Tab counts and lists were not updated:**
   - line 255 (the Decisions tab order);
   - the Components diagram (lines 293–299);
   - line 1174 ("Six tabs … Household, Savings, Spending, …");
   - the stage 5 row ("six tabs").

   These disagree with line 18's "six input tabs … and a Results tab".
9. **Nit. Line 980 still says Goal 1 counts only from the first retirement,** as does the `yearsCovered` comment at line 944. Both are overridden only at line 1068.
   - **Fix:** Add a pointer to A9.
10. **Nit. Decision ids A1 and A6 are missing from the A2–A10 table** (lines 275–284).
    - **Fix:** Say why, or renumber.
11. **Nit. "The brief check" (A8–A10) is undefined.**
    - **Fix:** Say what it is and when it happened.
12. **Nit. The Withdrawals breakdown and CUJ 7 don't match.** Line 1274 reads as one combined sales-and-purchases row; CUJ 7 shows the sale, the purchase and the money saved separately.
    - **Fix:** List the 14 rows exactly.
13. **Nit. The downsize details are thin** (line 1047). The shape of `newMortgage` isn't given. Nor is whether the new home inherits the old home's cost lines, or who owns it.
14. **Nit. The cottage comparison doesn't handle two cottages:** `cottageDesignation` holds one `assetId`.
    - **Fix:** State the rule.
15. **Nit. `RealAssetYear` (SA6) never appears in the Data contracts.**
    - **Fix:** Name the record type in the contract.
16. **Nit. "Version 1" and "version 2" are ambiguous** (G15, line 1077): they could mean the product release or the plan file schema.
    - **Fix:** Always say "schema version 1/2" for files.
17. **Nit. The "Money runs out" trigger doesn't say whether property other than the home counts** (line 806).
    - **Fix:** Add it now, or note it for stage 6.
18. **Nit. The phone layout statements conflict:** line 121 makes it a late stage, while Future Improvements (lines 1651, 1654) lists it as future work.
    - **Fix:** Make the two agree.
