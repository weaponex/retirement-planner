# Stage 2: decisions for the author

Stage 2 had to settle some points the design doesn't spell out. Each is already in the code as
described under "Now". For each one you can keep it as it is or pick another option. Every item
has a recommendation, and none of the choices changes a rule value.

Once you've decided, the choices go into the design (a "Stage 2 implementation decisions" note)
and, where you pick a change, into the code.

**Decided by the author on 2026-11-24** and recorded in the design; since the editorial pass the table is in docs/history/build-decisions.md. Three changed the code: 8 (start from no split), 13b (the survivor share from the year after the death) and 15 (up to 3 passes, which matched the full search exactly over 1,054 plans; 2 passes missed by up to $157).

| # | Topic | Recommendation | Decided |
|---|---|---|---|
| 4 | When sheltered yields are added | Keep | Keep |
| 5 | Inherited RRSP conversion timing | Keep | Keep |
| 6 | Where "age 65" lives | Keep | Keep |
| 7 | TFSA room in the first year | Keep | Keep |
| 8 | Starting pension split | Keep | B (no split) |
| 9a | Tax on rebalancing gains before retirement | Keep | Keep |
| 9b | Contributions to a converted account | Keep | Keep |
| 10 | Surplus with no forced withdrawals | Keep | Keep |
| 11 | LIRA unlock with no RRSP | Keep | Keep |
| 12 | Empty savings account per spouse | Keep | Keep |
| 13a | Last year of a DB bridge | Keep | Keep |
| 13b | DB survivor pension before the pension starts | B | B |
| 14 | "First account by id" after a death | Keep | Keep |
| 15 | Two-pass split accuracy (the 1% rule) | B | B (3 passes) |

---

## 4. When TFSA and RRSP yields are added to the account

**Now.** Interest and dividends earned inside a TFSA, RRSP, RRIF, LIRA or LIF are worked out on
the January 1 balance, but added to the account *after* that year's withdrawals.

**Why it came up.** The design says yields are reinvested "at the start-of-year step". Adding them
before withdrawals made the account look bigger when the LIF maximum was measured, so a LIF could
pay out more than Ontario allows. The invariant checks caught this.

**Options.**
- **Keep (recommended).** The LIF maximum and RRIF minimum use the true January 1 balance. The
  yield still earns that year's price return.
- **B. Add yields first, but measure the limits before.** Gives the same dollars and needs more
  code. No visible difference.

**What changes for you.** Nothing either way. This is about getting the LIF limit right.

## 5. When an inherited RRSP converts

**Now.** In the year after the first death, the accounts move to the survivor *before* the
January 1 conversions. So the survivor's age decides when an inherited RRSP or LIRA converts.

**Example.** Spouse 1 (74) dies with an RRSP they hadn't converted. Spouse 2 is 69. The RRSP now
converts on spouse 2's schedule, not at once.

**Options.**
- **Keep (recommended).** Matches the design's rule that "the survivor's age drives minimums,
  maximums and conversion" from the transfer on.
- **B. Conversions first, then the transfer.** The deceased's age would apply for one more
  January 1. That's odd, because the deceased no longer owns anything.

## 6. Where "age 65" lives

**Now.** The CPP estimate and the OAS base are amounts at 65 (the input `cppAt65Today` and the key
`federal.oas.base_at_65`). The start-age adjustments count months from 65, so the code needs the
number 65. It lives in `src/engine/constants.ts` as `BENEFIT_REFERENCE_AGE`.

**Options.**
- **Keep (recommended).** 65 is fixed by how the inputs and keys are named. If it ever changed,
  those names would change too.
- **B. Add a config key** (for example `federal.cpp.reference_age`). It could then be changed in
  Settings, though changing it would make no sense without renaming the inputs. It also adds a
  key to fetch and validate.

## 7. TFSA room in the plan's first year

**Now.** On January 1 of each year after the first, the yearly TFSA limit is added to each
spouse's room. Nothing is added in the first year: the room the user types in is taken to be
today's available room, which already includes this year's limit.

**Options.**
- **Keep (recommended).** Matches what CRA's My Account shows as "contribution room available".
- **B. Add the limit in the first year too.** That's only right if users type in last year's
  room. It would double-count for most people.

**What changes for you.** The Savings tab's help text (stage 5) should say "your TFSA room today,
as My Account shows it".

## 8. The pension split the first year starts from

**Now.** Each year is first solved with last year's pension split, then checked (item 15). The
first year has no "last year", so it starts from spouse 1 moving 50% to spouse 2. The design says
"50/50".

**Options.**
- **Keep (recommended).** This is only a starting guess. The search corrects it, so it changes
  speed, not results (except through item 15).
- **B. Start from no split.** Same results. Possibly a little slower in the first year.

## 9a. Tax on rebalancing gains before retirement

**Now.** Before the first retirement, rebalancing a non-registered account can realize capital
gains. Those gains are taxed at the owner's working marginal rate (like the yield), and the tax is
paid from the yield. If the tax is more than the yield, the rest is sold from the same account.
The gain on that small sale isn't taxed again.

**Example.** $100k of stocks bought for $40k is rebalanced in a working year, realizing $15k of
gains. At a 30% rate and a 50% inclusion rate that's $2,250 of tax, paid from the year's
dividends.

**Options.**
- **Keep (recommended).** Simple, and the untaxed sliver is a few dollars.
- **B. Don't tax rebalancing gains before retirement.** Simpler, but it understates tax, wrongly.
- **C. Repeat until the sale's own gain is taxed too.** Exact, but adds a small loop for a few
  dollars.

## 9b. Contributions to an account that has become a RRIF or LIF

**Now.** If a planned contribution is set for an RRSP or LIRA that has already converted (the
owner passed the conversion age while still working), the money goes to that spouse's
non-registered account instead. Neither account type can take contributions.

**Options.**
- **Keep (recommended).**
- **B. Drop the contribution.** Loses money the household would have saved.
- **C. Refuse the plan.** The Savings tab (stage 5) would then have to warn about it.

## 10. A surplus when nothing was forced out

**Now.** The design splits a surplus "in proportion to each spouse's share of the forced
withdrawals" (RRIF and LIF minimums, the bracket top-up). If there were none, for example when a
big DB pension alone covers spending, each spouse's share follows their CPP, OAS, DB and pay. If
that's zero too, it's split equally.

**Options.**
- **Keep (recommended).** The money goes to the spouse whose income produced it, so it fills
  their TFSA room first.
- **B. Always split equally** when there are no forced withdrawals. Simpler, but it can fill the
  TFSA of a spouse with no income while the other's surplus spills into taxable savings.

**What changes for you.** Which TFSA fills first, which affects the amount moved to the TFSA and,
slightly, lifetime tax.

## 11. A LIRA unlock when the owner has no RRSP

**Now.** When a LIRA converts with the 50% unlock, the unlocked half goes into the owner's first
RRSP or RRIF. If they have none, a new RRIF is created that year (id `rrsp-<owner>-<n>`, so
numbering stays one series). It has no minimum in its first year.

**Options.**
- **Keep (recommended).** In real life the unlocked money must go to an RRSP or RRIF, and opening
  a RRIF is the usual route.
- **B. Create an RRSP instead.** It would convert on the general rule (by 71). That's more
  flexible, but the owner then has to set a conversion age the screens don't ask for.

## 12. An empty non-registered account for each spouse

**Now.** If a spouse has no non-registered account, the engine creates an empty one at the plan
start, so a surplus always has somewhere to go. It shows in the year rows, for example as
`nonreg-1-1` with $0 until a surplus lands there.

**Options.**
- **Keep (recommended).** The screens (stage 5) can hide accounts that stay at $0.
- **B. Create it only when first needed.** Cleaner rows, but an account would appear mid-plan,
  which complicates the charts and the reference file (stage 3).

## 13a. The last year of a DB bridge

**Now.** A DB bridge pays from the month after the start birthday until the birthday month of the
end age. So the end year pays (birth month ÷ 12) of a year.

**Example.** Bridge ends at 65 and the birthday is in March: the year they turn 65 pays 3 months.

**Options.**
- **Keep (recommended).** Matches how bridges usually stop "at 65", and mirrors the first-year
  rule.
- **B. Pay the whole end year.** Simpler, but up to 11 months too much.
- **C. Stop on January 1 of the end year.** Up to 11 months too little.

## 13b. DB survivor pension when the member dies before the pension starts

**Now.** The survivor gets the survivor percentage of what the deceased's pension would pay that
year. If the deceased dies before the pension's start age, that's $0 until the year they would
have reached it, and then it starts.

**Example.** A DB pension starting at 65 with a 60% survivor share. The member dies at 62. The
survivor gets nothing for three years, then 60% of the pension.

**Options.**
- **A. Keep.** Simple, and correct when the plan defers the survivor pension to the member's
  start date.
- **B. Pay the survivor share from the year after the death (recommended).** Most plans pay a
  pre-retirement survivor benefit, often a lump sum or an immediate pension. Paying the survivor
  percentage at once is the closer simple model.
- **C. Treat it as a lump sum.** Truer to many plans, but needs a commuted-value input, and the
  design ruled commuted values out (Alternative K).

**What changes for you.** Only plans where a DB member dies before their pension starts. With B,
the survivor has more income in those years.

## 14. "First account by id" after a death

**Now (found while testing).** After the first death the survivor owns both spouses' TFSAs and
non-registered accounts. The design puts a surplus in "the first TFSA by id", then "the first
non-registered account". Which account is "first" depends on the ids (`tfsa-0-1` comes before
`tfsa-1-1`). The accounts can hold different investment mixes, so the result depends very
slightly on which spouse was spouse 1.

**How big.** In a test case, lifetime tax differed by $10 and the legacy by $688 on about $4
million (0.02%).

**Options.**
- **Keep (recommended).** Effects are a few hundredths of a percent. It's a tie rule, like the
  existing "spouse 1 first" ties.
- **B. Spread deposits across all of the survivor's accounts of that type, by balance.** Removes
  the effect, and complicates the TFSA room bookkeeping a little.

**What changes for you.** Nothing visible. The symmetry test now allows a 0.1% difference for
this.

## 15. How close the quick pension split must be to the best one

**Now (found while testing).** Each year the engine solves with last year's split, searches once
for the best split, and re-solves if it changed: at most two passes (design: "within 1% of the
full search"). A full search would solve the year 21 times, once per split.

**Measured over 1,054 plans:** the two-pass result was never better than the full search (as
required). It was within 1% in all but 2 cases: $25 over on $337 of tax (7.5%) and $28 over on
$1,262 (2.2%). The largest gap in dollars anywhere was $59, on $11,516 of tax (0.5%).

**Options.**
- **A. Keep two passes and change the rule to "within 1% or $60".** No code change. Gaps stay
  under $60 a year.
- **B. Allow a third pass when the second changes the split (recommended).** Likely closes the
  gaps, at some cost in speed, and speed is already over the early-warning budget (gap 2). I'd
  measure both before committing it.
- **C. Always run the full search.** Exact, but about 10 times slower per year. It would blow the
  1-second target in stage 4.

**What changes for you.** At most tens of dollars of tax a year in rare plans. The test currently
accepts within 1% or $60, marked as pending this decision.
