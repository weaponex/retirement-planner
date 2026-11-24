import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { classReturns } from '../../src/engine/invest/returns';
import { runPath } from '../../src/engine/project/runPath';
import type { PlanInputs } from '../../src/engine/types';
import { MONTHS_PER_YEAR } from '../../src/engine/constants';
import { couplePlan, normalized } from '../unit/helpers/couplePlan';
import { zeroTaxConfig } from './helpers/zeroTax';

describe('zero tax', () => {
  it('with zero tax the loop matches the closed-form annuity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 3_000 }),
        fc.integer({ min: 1_000, max: 6_000 }),
        (thousands, monthly) => {
          const base = couplePlan();
          // One TFSA in cash and GICs (no foreign withholding), no CPP, OAS or
          // DB, survivors keep spending the same, both working rates 0.
          const plan: PlanInputs = {
            ...base,
            spouses: [
              { ...base.spouses[0], cppAt65Today: 0, yearsInCanadaAt65: 0, workingMarginalRate: 0 },
              { ...base.spouses[1], cppAt65Today: 0, yearsInCanadaAt65: 0, workingMarginalRate: 0 },
            ],
            accounts: [
              {
                id: 'tfsa-0-1',
                owner: 0,
                type: 'tfsa',
                balanceToday: thousands * 1_000,
                annualContributionToday: 0,
                tfsaRoomToday: 0,
              },
            ],
            spending: {
              ...base.spending,
              monthlyTotalToday: monthly,
              phases: [
                { fromYear: 99, keepPct: 100 },
                { fromYear: 100, keepPct: 100 },
              ],
            },
            estate: { ...base.estate, survivorPct: 100 },
            investing: {
              ...base.investing,
              mix: {
                cad_equity: 0,
                us_equity: 0,
                intl_equity: 0,
                em_equity: 0,
                bonds: 0,
                cash: 100,
              },
            },
          };
          const cfg = zeroTaxConfig(plan.planStartYear);
          const r = runPath(
            normalized(plan),
            cfg,
            ontario,
            { id: 'z', strategyId: 'registered_last', presetId: 'bonds_sheltered_first' },
            'full',
          );
          const inflation = cfg.entries.get('market.inflation')!.value as number;
          const cash = classReturns(cfg, plan.investing).cash;
          // Yield on the start-of-year balance, the draw at the start of the
          // year, then the price return on what remains (design: Timing).
          let balance = thousands * 1_000;
          for (let t = 0; t < r.rows.length; t++) {
            const need = monthly * MONTHS_PER_YEAR * (1 + inflation) ** t;
            const draw = Math.min(need, balance);
            balance = (balance * (1 + cash.yield) - draw) * (1 + cash.price);
            const row = r.rows[t]!;
            expect(row.spouse[0].taxNom + row.spouse[1].taxNom).toBeCloseTo(0, 6);
            if (need > draw) return; // a shortfall: the closed form stops here
            expect(Math.abs(row.balancesEndNom['tfsa-0-1']! - balance)).toBeLessThan(1);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
