import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import type { StrategyId } from '../../src/engine/types';
import { couplePlan, normalized, planConfig } from '../unit/helpers/couplePlan';

const legacy = (monthly: number, strategyId: StrategyId) =>
  runPath(
    normalized(
      couplePlan({
        spending: { ...couplePlan().spending, monthlyTotalToday: monthly },
        estate: { survivorPct: 70, legacyGoalToday: 0, homeValueToday: 400_000 },
        withdrawal: { strategyId, bracketLevel: 'first_bracket' },
      }),
    ),
    planConfig(),
    ontario,
    { id: 'v', strategyId, presetId: 'bonds_sheltered_first' },
    'summary',
  ).summary.afterTaxLegacyNom;

describe('legacy (needs the final return)', () => {
  it('higher spending never raises the after-tax legacy', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12_000 }),
        fc.integer({ min: 1, max: 3_000 }),
        fc.constantFrom<StrategyId>('registered_last', 'fill_brackets', 'early_rrsp'),
        (monthly, more, strategyId) => {
          // Within a dollar: the solver works to the cent each year.
          expect(legacy(monthly + more, strategyId)).toBeLessThanOrEqual(
            legacy(monthly, strategyId) + 1,
          );
        },
      ),
      { numRuns: 8 },
    );
  });
});
