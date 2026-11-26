# Stage 5 review by the author, second round (2026-11-25)

The author reviewed the deployed app after the first round ([stage5-review.md](stage5-review.md))
was built. Every item is **Decided** by the author (the open questions were answered the same day)
and overrides the mockups and earlier decisions in the design. `[x]` marks a built item. All items were built on 2026-11-25.

## Savings

- [x] **AR2-S1** Decided: every account (DC pensions included) has a toggle, "Use this mix for
  every account". Turning it on gives every account that account's mix, and they follow it while it
  stays on. Changing another account's mix turns the toggle off (answer 1b). Turning it off leaves
  every account on the mix it has; each can then be changed on its own. One account at a time.
- [x] **AR2-S2** Decided: "Add account" sits below the list of accounts.
- [x] **AR2-S3** Decided: an account can be removed from its row, without opening it.
- [x] **AR2-S4** Decided: the expected return before fees is the whole portfolio's, from each
  account's balance and mix and each class's expected return. This was already so; when every
  balance is $0 the tiles say a balance is needed instead of falling back to another mix
  (answer 2b). The summary line stays as it is (answer 4b).
- [x] **AR2-S5** Decided: the custom yearly fee box sits on the same row as the fee choices
  (answer 3a).

## Withdrawals

- [x] **AR2-W1** Decided: the "Pension income splitting" section is removed; it only described
  what the engine does every year. Its two values stay in Settings.

## Results

- [x] **AR2-R1** Decided: re-test the balances (answer 5c: by hand, with a made-up plan that has
  the author's accounts and mix). Found from the author's screenshots: each year-end balance was
  converted with its own year's deflator, one year of inflation short. The first year (deflator 1)
  therefore grew at the nominal rate and every later year at the real rate, and every balance was
  about one year's inflation too high. Year-end balances are now shown
  in today's dollars at the end of their year. The hand check, with the author's balances and mix,
  steady shape, 1.50% fee and no spending: registered accounts grew 4.61% a year nominal (6.27%
  before fees, less the 1.50% fee, less about 0.20% of withholding on foreign dividends, plus about
  0.04% from the yield credited before the price return), 2.45% in today's dollars; the account
  identity (start + contributions + deposits + yield − withholding + price − draws = end) held every
  year (Known gaps B5-4).
- [x] **AR2-R2** Decided: the Estate chart has no tooltip (its values are on the bars, AR-R2).

## Asked during the review

- [x] **AR2-X1** Decided: Export is built now, ahead of stage 7, so the author can share a plan for
  debugging. It downloads the plan in the stage 7 envelope; Import still arrives with stage 7.
