import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/project/initialState';
import { solveYear } from '../../src/engine/solver/yearSolve';
import {
  bestSplit,
  householdTax,
  splitChoices,
  type SplitSpouse,
} from '../../src/engine/tax/split';
import type { PlanInputs, TaxableIncome, Variant } from '../../src/engine/types';
import { couplePlan, normalized, planConfig, yearContext } from '../unit/helpers/couplePlan';

const ctx = yearContext(0, planConfig());

const income = fc.record({
  pensionEligible: fc.integer({ min: 0, max: 200_000 }),
  oas: fc.integer({ min: 0, max: 12_000 }),
  cpp: fc.integer({ min: 0, max: 20_000 }),
  otherOrdinary: fc.integer({ min: 0, max: 150_000 }),
  eligibleDividends: fc.integer({ min: 0, max: 40_000 }),
  foreignDividends: fc.integer({ min: 0, max: 10_000 }),
  capitalGains: fc.integer({ min: 0, max: 60_000 }),
});

const spouse = (inc: TaxableIncome, age: number): SplitSpouse => ({
  income: inc,
  age,
  eligible: inc.pensionEligible,
  excluded: false,
});

describe('solver properties', () => {
  it('after-tax cash rises when the withdrawal rises (no one pays 100% on an extra dollar)', () => {
    fc.assert(
      fc.property(
        income,
        income,
        fc.integer({ min: 1, max: 50_000 }),
        fc.integer({ min: 60, max: 95 }),
        (a, b, extra, age) => {
          const before = householdTax(spouse(a, age), spouse(b, age), { from: 0, share: 0 }, ctx);
          const more: TaxableIncome = { ...a, otherOrdinary: a.otherOrdinary + extra };
          const after = householdTax(spouse(more, age), spouse(b, age), { from: 0, share: 0 }, ctx);
          const extraTax = after[0].total - before[0].total;
          expect(extra - extraTax).toBeGreaterThan(0);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('the chosen split never gives more tax than a 0% split', () => {
    fc.assert(
      fc.property(income, income, fc.integer({ min: 65, max: 95 }), (a, b, age) => {
        const best = bestSplit(spouse(a, age), spouse(b, age), ctx);
        const none = householdTax(spouse(a, age), spouse(b, age), { from: 0, share: 0 }, ctx);
        expect(best.householdTax).toBeLessThanOrEqual(none[0].total + none[1].total + 1e-6);
      }),
      { numRuns: 200 },
    );
  });

  it('the split passes are never below the full search, and within 1% of it', () => {
    const variant: Variant = {
      id: 'v',
      strategyId: 'registered_last',
      presetId: 'bonds_sheltered_first',
    };
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 90_000 }),
        fc.integer({ min: 2_000, max: 10_000 }),
        fc.boolean(),
        (db, monthly, dbOwnerFirst) => {
          const base = couplePlan();
          const plan: PlanInputs = {
            ...base,
            dbPensions: [
              {
                owner: dbOwnerFirst ? 0 : 1,
                lifetimeAnnualToday: db,
                startAge: 60,
                indexing: 'full',
                survivorPct: 60,
              },
            ],
            spending: { ...base.spending, monthlyTotalToday: monthly },
          };
          const inputs = normalized(plan);
          const start = initialState(inputs, ctx, variant);
          const tax = (r: ReturnType<typeof solveYear>) =>
            r.row.spouse[0].taxNom + r.row.spouse[1].taxNom;
          const twoPass = tax(solveYear(start, inputs, ctx, variant));
          const full = Math.min(
            ...splitChoices(ctx).map((split) =>
              tax(solveYear(start, inputs, ctx, variant, { fixedSplit: split })),
            ),
          );
          expect(twoPass).toBeGreaterThanOrEqual(full - 0.05);
          expect(twoPass).toBeLessThanOrEqual(full * 1.01 + 0.05);
        },
      ),
      { numRuns: 15 },
    );
  });
});
