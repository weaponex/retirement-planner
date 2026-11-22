// Engine settings. These are not rule values (those come from config/) and
// have no outside source. This is the only engine file exempt from the
// no-magic-numbers lint rule.

export const MONTHS_PER_YEAR = 12;

/** Bisection stops when the withdrawal is known to within one cent. */
export const SOLVER_PRECISION = 0.01;
export const SOLVER_MAX_STEPS = 32;

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
