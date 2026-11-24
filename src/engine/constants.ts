// Engine settings. These are not rule values (those come from config/) and
// have no outside source. This is the only engine file exempt from the
// no-magic-numbers lint rule.

export const MONTHS_PER_YEAR = 12;

/** Bisection stops when the withdrawal is known to within one cent. */
export const SOLVER_PRECISION = 0.01;
/** Enough steps to narrow $10 billion to $0.01. */
export const SOLVER_MAX_STEPS = 40;

/** Pension-split search: 0% to 50% in 5% steps. */
export const SPLIT_STEP = 0.05;
export const MAX_SPLIT_PASSES = 2;

/** Accounting checks compare within five cents. */
export const INVARIANT_TOLERANCE = 0.05;

/** Blend weights must sum to 1 within this tolerance. */
export const WEIGHT_SUM_TOLERANCE = 1e-9;

/** Sanity range for a config entry's tax year. */
export const CONFIG_YEAR_MIN = 2000;
export const CONFIG_YEAR_MAX = 2100;

/**
 * The age the CPP estimate (`cppAt65Today`) and the OAS base (`federal.oas.base_at_65`)
 * refer to. Fixed by the design's input and key definitions, not a rule value
 * of its own: start-age adjustments count months from here.
 */
export const BENEFIT_REFERENCE_AGE = 65;

/** Upper bound for a fee level in `planning.fee_levels` (5% a year). */
export const MAX_FEE = 0.05;

/**
 * Ranges a rule override must fall in, by the key's unit (design: Config
 * contract, User changes to rule values). Dollar amounts must be 0 or more.
 */
export const OVERRIDE_RANGES = {
  rate: { min: 0, max: 1 },
  age: { min: 40, max: 110 },
  years: { min: 0, max: 100 },
  count: { min: 0, max: 100 },
  /** The life-expectancy tables (`planning.life_expectancy.*`). */
  lifeExpectancy: { min: 60, max: 110 },
} as const;
