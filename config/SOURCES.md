# Config sources

The complete list of config keys. It must match `src/engine/config/keys.ts` and the
Config contract in `docs/designs/retirement-planner.md` exactly; `npm run config:check`
fails on any difference.

Both fetch sessions (see `docs/admin-config-guide.md`) fetch each rule value from the page
listed here, from the place described. Author decisions are not fetched.

**Status of this list (2026-11-17):**

- Every URL below except those marked **TO CHOOSE** was opened and checked to exist on
  2026-11-17, and the named section was found, except rows whose note says "verify": there the
  page exists but the exact place still needs finding. Values were not read or recorded.
- Ontario 2026 amounts come from the CRA payroll formulas (T4127, January 2026 edition, Ontario
  chapter), because the 2026 Ontario tax forms (ON428) are not published until early 2027. The
  2025 ON428 is listed only where a rate is not in T4127; check the 2026 edition when it appears.
- **TO CHOOSE:** the FSRA LIF pages (not located yet), the treaty withholding rate, default fees,
  and the volatility, correlation and income-yield figures (open question O22). These stay
  unfetched until the admin picks a source.
- The federal basic personal amount phases down for high incomes; the design models one amount.
  Flagged for the stage 1 tax work.

## Federal (CRA, Service Canada, Justice Laws)

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `federal.tax.brackets` | none | https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html | Federal rate for 2026 (table) |
| `federal.credits.basic` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html | Basic personal amount rows (note: amount phases down at high income) |
| `federal.credits.age.amount` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html | Age amount |
| `federal.credits.age.min_age` | age | https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html | Age amount (qualifying age, 65) |
| `federal.credits.age.reduction_threshold` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html | Net income threshold for age amount |
| `federal.credits.age.reduction_rate` | rate | https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html | Age amount: reduction rate on income above the threshold (verify on page or Schedule 1) |
| `federal.credits.pension.amount` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31400-pension-income-amount.html | Maximum pension income amount |
| `federal.credits.pension.min_age_rrif` | age | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31400-pension-income-amount.html | Eligible pension income: age 65 or older at end of year |
| `federal.capital_gains.inclusion_rate` | rate | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains.html | Inclusion rate |
| `federal.dividend.eligible.gross_up` | rate | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40425-federal-dividend-tax-credit.html | Eligible dividends: gross-up |
| `federal.dividend.eligible.credit_rate` | rate | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40425-federal-dividend-tax-credit.html | Eligible dividends: credit rate on taxable amount |
| `federal.oas.base_at_65` | CAD_per_month | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/payments.html | Age 65 to 74: maximum monthly payment, January 2026 quarter |
| `federal.oas.residence.min_years` | years | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/eligibility.html | Lived in Canada at least 10 years since age 18 |
| `federal.oas.residence.full_years` | years | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/eligibility.html | Full pension: 40 years in Canada after age 18 |
| `federal.oas.deferral.per_month` | rate | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html | Increase per month of delay |
| `federal.oas.deferral.max_months` | count | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html | Maximum months of delay (to age 70) |
| `federal.oas.increase_age` | age | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/payments.html | Age 75 and over |
| `federal.oas.increase_rate` | rate | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/payments.html | Age 75 and over increase (%) |
| `federal.oas.recovery.threshold` | CAD_per_year | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/recovery-tax.html | Minimum income threshold for 2026 |
| `federal.oas.recovery.rate` | rate | https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/recovery-tax.html | Repayment rate (15%) |
| `federal.cpp.start.earliest` | age | https://www.canada.ca/en/services/benefits/publicpensions/cpp/when-start.html | Earliest start age |
| `federal.cpp.start.latest` | age | https://www.canada.ca/en/services/benefits/publicpensions/cpp/when-start.html | Latest start age |
| `federal.cpp.adjust.early_per_month` | rate | https://www.canada.ca/en/services/benefits/publicpensions/cpp/when-start.html | Decrease per month before 65 |
| `federal.cpp.adjust.late_per_month` | rate | https://www.canada.ca/en/services/benefits/publicpensions/cpp/when-start.html | Increase per month after 65 (0.7%) |
| `federal.cpp.max_at_65` | CAD_per_month | https://www.canada.ca/en/services/benefits/publicpensions/cpp/payment-amounts.html | Retirement pension at 65: maximum monthly payment amount (2026) |
| `federal.cpp.survivor.pct_65_plus` | rate | https://laws-lois.justice.gc.ca/eng/acts/C-8/section-58.html | Survivor 65 or older: 60% of contributor retirement pension |
| `federal.cpp.survivor.flat_under_65` | CAD_per_month | https://www.canada.ca/en/services/benefits/publicpensions/cpp/payment-amounts.html | Survivor pension under 65: flat-rate portion (2026) |
| `federal.cpp.survivor.pct_under_65` | rate | https://laws-lois.justice.gc.ca/eng/acts/C-8/section-58.html | Survivor under 65: 37.5% of contributor retirement pension |
| `federal.cpp.survivor.max_combined` | CAD_per_month | https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-survivor-pension.html | Step 2: combined retirement and survivor benefit limit (verify amount on payment-amounts page) |
| `federal.rrif.latest_conversion_age` | age | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html | RRSP must mature by end of year you turn 71 (verify page) |
| `federal.tfsa.annual_limit` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html | Tax-free savings account (TFSA) annual limit |
| `federal.split.max_share` | rate | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/pension-income-splitting.html | Allocate up to 50% |
| `federal.split.min_age_rrif` | age | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31400-pension-income-amount.html | Eligible pension income (65 or older) vs less than 65 |
| `federal.rrif.min_factor` | rate | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html | Chart of prescribed factors (age 71 and over); formula 1/(90-age) below 71 |

## Ontario (CRA, Ontario, FSRA)

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `ontario.tax.brackets` | none | https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html | Ontario rate: 2026 (table) |
| `ontario.credits.basic` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: basic personal amount |
| `ontario.credits.age.amount` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: age amount (or Form ON428, 2026 edition when published) |
| `ontario.credits.age.reduction_threshold` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: age amount income threshold |
| `ontario.credits.age.reduction_rate` | rate | https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/5006-c.html | Age amount reduction rate (2025 form; check 2026 edition) |
| `ontario.credits.pension.amount` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: pension income amount |
| `ontario.dividend.eligible.credit_rate` | rate | https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/5006-c.html | Ontario dividend tax credit, eligible dividends (2025 form; check 2026 edition) |
| `ontario.tax_reduction.basic` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: Ontario tax reduction basic amount |
| `ontario.probate.threshold` | CAD_per_year | https://www.ontario.ca/page/calculating-estate-administration-tax | Estates of $50,000 or less |
| `ontario.probate.rate` | rate | https://www.ontario.ca/page/calculating-estate-administration-tax | Rate on value above $50,000 |
| `ontario.lif.conversion.latest_age` | age | **TO CHOOSE** | FSRA: latest age to convert a LIRA (page not yet located) |
| `ontario.lif.unlock_share` | rate | **TO CHOOSE** | FSRA: one-time 50% unlocking on transfer to a LIF (page not yet located) |
| `ontario.surtax.thresholds` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: surtax thresholds |
| `ontario.surtax.rates` | rate | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: surtax rates |
| `ontario.health_premium.schedule` | CAD_per_year | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html | Ontario chapter: Ontario Health Premium schedule |
| `ontario.lif.min_factor` | rate | **TO CHOOSE** | FSRA: Ontario LIF minimum table (page not yet located) |
| `ontario.lif.max_factor` | rate | **TO CHOOSE** | FSRA: Ontario LIF maximum annual payment table (page not yet located) |

## Market assumptions (FP Canada; O22 for volatility, correlation and yields)

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `market.cad_equity.geometric_return` | rate | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Return assumption: cad_equity (compound, before fees) |
| `market.cad_equity.log_volatility` | rate | **TO CHOOSE** | O22: volatility source not yet chosen |
| `market.cad_equity.yield.interest` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.cad_equity.yield.eligible_dividends` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.cad_equity.yield.foreign_dividends` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.cad_equity.fee` | rate | **TO CHOOSE** | Default fee source not yet chosen |
| `market.global_equity.components.us` | rate | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Return assumptions, section 5 c: U.S. equities (compound, before fees) |
| `market.global_equity.components.intl_developed` | rate | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Return assumptions, section 5 c: International developed-market equities (compound, before fees) |
| `market.global_equity.components.emerging` | rate | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Return assumptions, section 5 c: Emerging-market equities (compound, before fees) |
| `market.global_equity.log_volatility` | rate | **TO CHOOSE** | O22: volatility source not yet chosen |
| `market.global_equity.yield.interest` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.global_equity.yield.eligible_dividends` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.global_equity.yield.foreign_dividends` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.global_equity.fee` | rate | **TO CHOOSE** | Default fee source not yet chosen |
| `market.bonds.geometric_return` | rate | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Return assumption: bonds (compound, before fees) |
| `market.bonds.log_volatility` | rate | **TO CHOOSE** | O22: volatility source not yet chosen |
| `market.bonds.yield.interest` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.bonds.yield.eligible_dividends` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.bonds.yield.foreign_dividends` | rate | **TO CHOOSE** | O22: income-yield source not yet chosen |
| `market.bonds.fee` | rate | **TO CHOOSE** | Default fee source not yet chosen |
| `market.inflation` | rate | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Inflation rate assumption |
| `market.foreign_withholding_rate` | rate | **TO CHOOSE** | Canada-U.S. tax treaty, Article X: dividend withholding rate |
| `market.correlation` | none | **TO CHOOSE** | O22: correlation source not yet chosen |

## Planning

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `planning.life_expectancy.female` | age | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Probability-of-survival table, 25% column, female, one entry per current age row (20, 25, … 100) |
| `planning.life_expectancy.male` | age | https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf | Probability-of-survival table, 25% column, male, one entry per current age row (20, 25, … 100) |
| `planning.shapes` | none | author decision | Design values (version 1) |
| `planning.presets` | none | author decision | Design values (version 1) |
| `planning.stress_paths` | none | author decision | Design values (version 1) |
| `planning.comparison_bracket_target` | none | author decision | Design values (version 1) |
| `planning.global_equity_weights` | none | author decision | Design values (version 1) |
| `planning.stock_split.cad_share` | rate | author decision | Design values (version 1) |
| `planning.survivor_spending` | rate | author decision | Design values (version 1) |
| `planning.override_margin` | rate | author decision | Design values (version 1) |

## Warnings

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `warnings.triggers` | none | author decision | Design values (version 1) |
| `warnings.nudge_steps` | none | author decision | Design values (version 1) |

