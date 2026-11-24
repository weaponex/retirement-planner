// Bisection for the withdrawal solve (design: The year solver, step 5).
import { SOLVER_MAX_STEPS, SOLVER_PRECISION } from '../constants';

export interface BisectResult {
  /** The smallest x found with f(x) >= 0, to within SOLVER_PRECISION. */
  x: number;
  converged: boolean;
}

/**
 * For f rising in x with f(lo) < 0 <= f(hi), narrows [lo, hi] until it is no
 * wider than `SOLVER_PRECISION`, in at most `SOLVER_MAX_STEPS` steps. Returns
 * the upper end, so f(x) >= 0. If f(lo) >= 0, returns lo.
 */
export function bisect(f: (x: number) => number, lo: number, hi: number): BisectResult {
  if (f(lo) >= 0) return { x: lo, converged: true };
  let a = lo;
  let b = hi;
  for (let step = 0; step < SOLVER_MAX_STEPS && b - a > SOLVER_PRECISION; step++) {
    const mid = (a + b) / 2;
    if (f(mid) >= 0) b = mid;
    else a = mid;
  }
  return { x: b, converged: b - a <= SOLVER_PRECISION };
}
