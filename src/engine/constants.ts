// Engine settings. These are not rule values (those come from config/) and
// have no outside source. This is the only engine file exempt from the
// no-magic-numbers lint rule.

export const MONTHS_PER_YEAR = 12;

/** Generator constants (see the design's "Asset classes and returns"). */
export const TWO_PI = 2 * Math.PI;
/** 2^-53: turns a 53-bit integer into a double in [0, 1). */
export const UINT53_SCALE = 1 / 2 ** 53;

/** Bisection stops when the withdrawal is known to within one cent. */
export const SOLVER_PRECISION = 0.01;
export const SOLVER_MAX_STEPS = 32;

/** Pension-split search: 0% to 50% in 5% steps. */
export const SPLIT_STEP = 0.05;
export const MAX_SPLIT_PASSES = 2;

/** Accounting checks compare within five cents. */
export const INVARIANT_TOLERANCE = 0.05;

export const PROGRESS_EVERY = 50;

/** Sanity range for a config entry's tax year. */
export const CONFIG_YEAR_MIN = 2000;
export const CONFIG_YEAR_MAX = 2100;
export const COMPARISON_PATHS = 250;
