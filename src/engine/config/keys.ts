// The complete list of config keys: the code copy of the Config contract's key
// list in docs/designs/retirement-planner.md. Change the design first, then
// this list. `npm run config:check` fails unless config/SOURCES.md lists exactly
// these keys; the design is kept in step by hand.

// Persisted ids (design: Config contract). These match FP Canada's published classes.
export const ASSET_CLASSES = [
  'cad_equity',
  'us_equity',
  'intl_equity',
  'em_equity',
  'bonds',
  'cash',
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

/** Shape of a key's `value`. */
export type ValueKind =
  | 'number' // a single number
  | 'brackets' // [{ from, rate, indexed? }]: a row's indexed overrides the entry flag
  | 'ageTable' // { "71": 0.0528, ... }
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

  // Market assumptions. Returns are fixed (no volatility or correlation).
  // Each class has FP Canada's compound return and one cash yield; its income
  // type is set by the design: Canadian stocks eligible dividends; U.S.,
  // international and emerging-market stocks foreign dividends; bonds and cash
  // interest. Fees are not market values: see planning.fee_levels.
  ...rule('market', 'number', perClass(['geometric_return', 'yield'])),
  ...rule('market', 'number', ['market.inflation', 'market.foreign_withholding_rate']),

  // Planning: FP Canada life expectancy is sourced; the rest are author decisions.
  // Life expectancy is a table by current age (age with a 25% chance of survival).
  ...rule('planning', 'ageTable', [
    'planning.life_expectancy.female',
    'planning.life_expectancy.male',
  ]),
  ...author('planning', 'object', [
    'planning.shapes',
    'planning.presets',
    'planning.mixes',
    'planning.fee_levels',
    'planning.spending_phases',
    'planning.planner_search',
  ]),
  ...author('planning', 'number', ['planning.survivor_spending', 'planning.override_margin']),

  // Warnings
  ...author('warnings', 'object', ['warnings.triggers', 'warnings.nudge_steps']),
];

export const ALL_KEYS: readonly string[] = KEY_SPECS.map((s) => s.key);
