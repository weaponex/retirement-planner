import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import type { StrategyId } from '../../src/engine/types';
import { couplePlan, normalized, planConfig } from '../unit/helpers/couplePlan';

describe('determinism', () => {
  it('the same inputs give the same result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12_000 }),
        fc.constantFrom<StrategyId>('registered_last', 'fill_brackets', 'early_rrsp'),
        (monthly, strategyId) => {
          const plan = couplePlan({
            spending: { ...couplePlan().spending, monthlyTotalToday: monthly },
          });
          const variant = { id: 'v', strategyId, presetId: 'bonds_sheltered_first' as const };
          const a = runPath(normalized(plan), planConfig(), ontario, variant, 'full');
          const b = runPath(normalized(plan), planConfig(), ontario, variant, 'full');
          expect(b).toEqual(a);
        },
      ),
      { numRuns: 5 },
    );
  });
});
