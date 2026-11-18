// The complete list of config keys. It mirrors the Config contract's key tree
// in docs/designs/retirement-planner.md: change the design first, then this
// list. config/SOURCES.md must list exactly these keys (checked by
// `npm run config:check`).

export const ASSET_CLASSES = ['cad_equity', 'global_equity', 'bonds'] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

/** Shape of a key's `value`. */
export type ValueKind =
  | 'number' // a single number
  | 'brackets' // [{ from, rate }]
  | 'ageTable' // { "71": 0.0528, ... }
  | 'schedule' // [{ from, amount }]
  | 'phaseIn' // [{ from, rate, cap }]: previous row's cap + rate x (income - from), up to this cap
  | 'list' // [number, ...]
  | 'object'; // structured planning value, validated by its own schema

export type ConfigFile = 'federal' | 'ontario' | 'market' | 'planning' | 'warnings';

export interface KeySpec {
  key: string;
  file: ConfigFile;
  kind: ValueKind;
  /** true for the author's planning choices; false for sourced rule values. */
  authorDecision: boolean;
}

const rule = (file: ConfigFile, kind: ValueKind, keys: string[]): KeySpec[] =>
  keys.map((key) => ({ key, file, kind, authorDecision: false }));

const author = (file: ConfigFile, kind: ValueKind, keys: string[]): KeySpec[] =>
  keys.map((key) => ({ key, file, kind, authorDecision: true }));

const perClass = (suffixes: string[]): string[] =>
  ASSET_CLASSES.flatMap((c) => suffixes.map((s) => `market.${c}.${s}`));

export const KEY_SPECS: readonly KeySpec[] = [
  // Federal
  ...rule('federal', 'brackets', ['federal.tax.brackets']),
  ...rule('federal', 'number', [
    'federal.credits.basic',
    'federal.credits.age.amount',
    'federal.credits.age.min_age',
    'federal.credits.age.reduction_threshold',
    'federal.credits.age.reduction_rate',
    'federal.credits.pension.amount',
    'federal.credits.pension.min_age_rrif',
    'federal.capital_gains.inclusion_rate',
    'federal.dividend.eligible.gross_up',
    'federal.dividend.eligible.credit_rate',
    'federal.oas.base_at_65',
    'federal.oas.residence.min_years',
    'federal.oas.residence.full_years',
    'federal.oas.deferral.per_month',
    'federal.oas.deferral.max_months',
    'federal.oas.increase_age',
    'federal.oas.increase_rate',
    'federal.oas.recovery.threshold',
    'federal.oas.recovery.rate',
    'federal.cpp.start.earliest',
    'federal.cpp.start.latest',
    'federal.cpp.adjust.early_per_month',
    'federal.cpp.adjust.late_per_month',
    'federal.cpp.max_at_65',
    'federal.cpp.survivor.pct_65_plus',
    'federal.cpp.survivor.flat_under_65',
    'federal.cpp.survivor.pct_under_65',
    'federal.cpp.survivor.max_combined',
    'federal.rrif.latest_conversion_age',
    'federal.tfsa.annual_limit',
    'federal.split.max_share',
    'federal.split.min_age_rrif',
  ]),
  ...rule('federal', 'ageTable', ['federal.rrif.min_factor']),

  // Ontario
  ...rule('ontario', 'brackets', ['ontario.tax.brackets']),
  ...rule('ontario', 'number', [
    'ontario.credits.basic',
    'ontario.credits.age.amount',
    'ontario.credits.age.reduction_threshold',
    'ontario.credits.age.reduction_rate',
    'ontario.credits.pension.amount',
    'ontario.dividend.eligible.credit_rate',
    'ontario.tax_reduction.basic',
    'ontario.probate.threshold',
    'ontario.probate.rate',
    'ontario.lif.unlock_share',
  ]),
  ...rule('ontario', 'list', ['ontario.surtax.thresholds', 'ontario.surtax.rates']),
  // Health premium phases in: see the design's Tax scope for the full rule.
  ...rule('ontario', 'phaseIn', ['ontario.health_premium.schedule']),
  // The LIF minimum and the LIRA conversion deadline are the federal RRIF rules
  // (federal.rrif.min_factor, federal.rrif.latest_conversion_age); see the design's Accounts.
  ...rule('ontario', 'ageTable', ['ontario.lif.max_factor']),

  // Market assumptions. Volatility and correlation come from FP Canada's Addendum (O22).
  ...rule('market', 'number', perClass(['log_volatility', 'fee'])),
  // Each class pays one income type, read from a factsheet; the other two are
  // zero by the author's decision.
  ...rule('market', 'number', [
    'market.cad_equity.yield.eligible_dividends',
    'market.global_equity.yield.foreign_dividends',
    'market.bonds.yield.interest',
  ]),
  ...author('market', 'number', [
    'market.cad_equity.yield.interest',
    'market.cad_equity.yield.foreign_dividends',
    'market.global_equity.yield.interest',
    'market.global_equity.yield.eligible_dividends',
    'market.bonds.yield.eligible_dividends',
    'market.bonds.yield.foreign_dividends',
  ]),
  // Compound returns. FP Canada has no single "global" figure, so global equity
  // is a blend of three published returns using planning.global_equity_weights.
  ...rule('market', 'number', [
    'market.cad_equity.geometric_return',
    'market.bonds.geometric_return',
    'market.global_equity.components.us',
    'market.global_equity.components.intl_developed',
    'market.global_equity.components.emerging',
  ]),
  ...rule('market', 'number', ['market.inflation', 'market.foreign_withholding_rate']),
  ...rule('market', 'object', ['market.correlation']),

  // Planning: FP Canada life expectancy is sourced; the rest are author decisions.
  // Life expectancy is a table by current age (age with a 25% chance of survival).
  ...rule('planning', 'ageTable', [
    'planning.life_expectancy.female',
    'planning.life_expectancy.male',
  ]),
  ...author('planning', 'object', [
    'planning.shapes',
    'planning.presets',
    'planning.stress_paths',
    'planning.comparison_bracket_target',
    'planning.global_equity_weights',
  ]),
  ...author('planning', 'number', [
    'planning.stock_split.cad_share',
    'planning.survivor_spending',
    'planning.override_margin',
  ]),

  // Warnings
  ...author('warnings', 'object', ['warnings.triggers', 'warnings.nudge_steps']),
];

export const ALL_KEYS: readonly string[] = KEY_SPECS.map((s) => s.key);
