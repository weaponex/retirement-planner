import { describe, expect, it } from 'vitest';
import { SOLVER_PRECISION } from '../../src/engine/constants';
import { bisect } from '../../src/engine/solver/bisect';

describe('bisect', () => {
  it('converges to the root within the precision, from the feasible side', () => {
    const r = bisect((x) => 0.7 * x - 12_345.67, 0, 1_000_000);
    expect(r.converged).toBe(true);
    expect(r.x).toBeGreaterThanOrEqual(12_345.67 / 0.7);
    expect(r.x - 12_345.67 / 0.7).toBeLessThanOrEqual(SOLVER_PRECISION);
  });

  it('returns lo when it already meets the target', () => {
    expect(bisect((x) => x + 1, 0, 10)).toEqual({ x: 0, converged: true });
  });

  it('narrows $10 billion to a cent', () => {
    expect(bisect((x) => x - 9_999_999_999.5, 0, 1e10).converged).toBe(true);
  });

  it('reports non-convergence', () => {
    expect(bisect((x) => x - 1e14, 0, 1e15).converged).toBe(false);
  });
});
