# Config sources

The complete list of config keys. It must match `src/engine/config/keys.ts` and the
Config contract in `docs/designs/retirement-planner.md` exactly; `npm run config:check`
fails on any difference.

For each rule value, the two fetch sessions (see `docs/admin-config-guide.md`) fill in
the **Source URL** and **Where on the page** columns before fetching. Author decisions are
not fetched.

## Federal (CRA, Service Canada)

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `federal.tax.brackets` | none |  |  |
| `federal.credits.basic` | CAD_per_year |  |  |
| `federal.credits.age.amount` | CAD_per_year |  |  |
| `federal.credits.age.min_age` | age |  |  |
| `federal.credits.age.reduction_threshold` | CAD_per_year |  |  |
| `federal.credits.age.reduction_rate` | rate |  |  |
| `federal.credits.pension.amount` | CAD_per_year |  |  |
| `federal.credits.pension.min_age_rrif` | age |  |  |
| `federal.capital_gains.inclusion_rate` | rate |  |  |
| `federal.dividend.eligible.gross_up` | rate |  |  |
| `federal.dividend.eligible.credit_rate` | rate |  |  |
| `federal.oas.base_at_65` | CAD_per_year |  |  |
| `federal.oas.residence.min_years` | years |  |  |
| `federal.oas.residence.full_years` | years |  |  |
| `federal.oas.deferral.per_month` | rate |  |  |
| `federal.oas.deferral.max_months` | count |  |  |
| `federal.oas.increase_age` | age |  |  |
| `federal.oas.increase_rate` | rate |  |  |
| `federal.oas.recovery.threshold` | CAD_per_year |  |  |
| `federal.oas.recovery.rate` | rate |  |  |
| `federal.cpp.start.earliest` | age |  |  |
| `federal.cpp.start.latest` | age |  |  |
| `federal.cpp.adjust.early_per_month` | rate |  |  |
| `federal.cpp.adjust.late_per_month` | rate |  |  |
| `federal.cpp.max_at_65` | CAD_per_year |  |  |
| `federal.cpp.survivor.pct_65_plus` | rate |  |  |
| `federal.cpp.survivor.flat_under_65` | CAD_per_year |  |  |
| `federal.cpp.survivor.pct_under_65` | rate |  |  |
| `federal.cpp.survivor.max_combined` | CAD_per_year |  |  |
| `federal.rrif.latest_conversion_age` | age |  |  |
| `federal.tfsa.annual_limit` | CAD_per_year |  |  |
| `federal.split.max_share` | rate |  |  |
| `federal.split.min_age_rrif` | age |  |  |
| `federal.rrif.min_factor` | rate |  |  |

## Ontario (Ontario Ministry of Finance, CRA, FSRA)

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `ontario.tax.brackets` | none |  |  |
| `ontario.credits.basic` | CAD_per_year |  |  |
| `ontario.credits.age.amount` | CAD_per_year |  |  |
| `ontario.credits.age.reduction_threshold` | CAD_per_year |  |  |
| `ontario.credits.age.reduction_rate` | rate |  |  |
| `ontario.credits.pension.amount` | CAD_per_year |  |  |
| `ontario.dividend.eligible.credit_rate` | rate |  |  |
| `ontario.tax_reduction.basic` | CAD_per_year |  |  |
| `ontario.probate.threshold` | CAD_per_year |  |  |
| `ontario.probate.rate` | rate |  |  |
| `ontario.lif.conversion.latest_age` | age |  |  |
| `ontario.lif.unlock_share` | rate |  |  |
| `ontario.surtax.thresholds` | none |  |  |
| `ontario.surtax.rates` | none |  |  |
| `ontario.health_premium.schedule` | none |  |  |
| `ontario.lif.min_factor` | rate |  |  |
| `ontario.lif.max_factor` | rate |  |  |

## Market assumptions (FP Canada; O22 for volatility and correlation)

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `market.cad_equity.geometric_return` | rate |  |  |
| `market.cad_equity.log_volatility` | rate |  |  |
| `market.cad_equity.yield.interest` | rate |  |  |
| `market.cad_equity.yield.eligible_dividends` | rate |  |  |
| `market.cad_equity.yield.foreign_dividends` | rate |  |  |
| `market.cad_equity.fee` | rate |  |  |
| `market.cad_equity.override_limit` | rate |  |  |
| `market.global_equity.geometric_return` | rate |  |  |
| `market.global_equity.log_volatility` | rate |  |  |
| `market.global_equity.yield.interest` | rate |  |  |
| `market.global_equity.yield.eligible_dividends` | rate |  |  |
| `market.global_equity.yield.foreign_dividends` | rate |  |  |
| `market.global_equity.fee` | rate |  |  |
| `market.global_equity.override_limit` | rate |  |  |
| `market.bonds.geometric_return` | rate |  |  |
| `market.bonds.log_volatility` | rate |  |  |
| `market.bonds.yield.interest` | rate |  |  |
| `market.bonds.yield.eligible_dividends` | rate |  |  |
| `market.bonds.yield.foreign_dividends` | rate |  |  |
| `market.bonds.fee` | rate |  |  |
| `market.bonds.override_limit` | rate |  |  |
| `market.inflation` | rate |  |  |
| `market.foreign_withholding_rate` | rate |  |  |
| `market.correlation` | none |  |  |

## Planning

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `planning.life_expectancy.female` | age |  |  |
| `planning.life_expectancy.male` | age |  |  |
| `planning.shapes` | none | author decision | Design values (version 1) |
| `planning.presets` | none | author decision | Design values (version 1) |
| `planning.stress_paths` | none | author decision | Design values (version 1) |
| `planning.comparison_bracket_target` | none | author decision | Design values (version 1) |
| `planning.stock_split.cad_share` | rate | author decision | Design values (version 1) |
| `planning.survivor_spending` | rate | author decision | Design values (version 1) |
| `planning.override_margin` | rate | author decision | Design values (version 1) |

## Warnings

| Key | Unit | Source URL | Where on the page |
|---|---|---|---|
| `warnings.triggers` | none | author decision | Design values (version 1) |
| `warnings.nudge_steps` | none | author decision | Design values (version 1) |

