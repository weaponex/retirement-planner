import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import type { AccountInput, PlanInputs, StrategyId } from '../../src/engine/types';
import { couplePlan, normalized, planConfig } from '../unit/helpers/couplePlan';

const run = (plan: PlanInputs, strategyId: StrategyId) =>
  runPath(
    normalized(plan),
    planConfig(),
    ontario,
    { id: 'v', strategyId, presetId: 'bonds_sheltered_first' },
    'summary',
  ).summary;

/** The same household with the spouses' places swapped. */
function swapped(plan: PlanInputs): PlanInputs {
  const flip = (o: 0 | 1) => (o === 0 ? 1 : 0) as 0 | 1;
  return {
    ...plan,
    spouses: [plan.spouses[1], plan.spouses[0]],
    accounts: plan.accounts.map((a) => ({
      ...a,
      owner: flip(a.owner),
      id: a.id.replace(/-(\d)-/, (_, o) => `-${1 - Number(o)}-`),
    })),
    dbPensions: plan.dbPensions.map((d) => ({ ...d, owner: flip(d.owner) })),
  };
}

const close = (a: number, b: number, rel = 1e-6) =>
  Math.abs(a - b) <= Math.max(1, Math.abs(a) * rel);

/**
 * After the first death the survivor owns both spouses' accounts, and deposits go to
 * the first TFSA or non-registered account by id (design: Surplus). Swapping the
 * spouses swaps the ids, so the deposit can land in an account with a different
 * mix: a tie rule like the spouse-1 ties, worth a few hundredths of a percent.
 */
const SWAP_TOLERANCE = 0.001;

describe('symmetry', () => {
  it('swapping the spouses gives the same totals', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3_000, max: 9_000 }),
        fc.integer({ min: 300, max: 1_300 }),
        fc.constantFrom<StrategyId>('registered_last', 'fill_brackets', 'early_rrsp'),
        (monthly, cpp2, strategyId) => {
          const base = couplePlan();
          const plan: PlanInputs = {
            ...base,
            spouses: [base.spouses[0], { ...base.spouses[1], cppAt65Today: cpp2 }],
            spending: { ...base.spending, monthlyTotalToday: monthly },
          };
          // Identical spouses are skipped: the tie rules favour spouse 1.
          fc.pre(JSON.stringify(plan.spouses[0]) !== JSON.stringify(plan.spouses[1]));
          const a = run(plan, strategyId);
          const b = run(swapped(plan), strategyId);
          expect(close(a.lifetimeTaxNom, b.lifetimeTaxNom, SWAP_TOLERANCE)).toBe(true);
          expect(close(a.afterTaxLegacyNom, b.afterTaxLegacyNom, SWAP_TOLERANCE)).toBe(true);
          expect(a.spendingCovered).toBe(b.spendingCovered);
        },
      ),
      { numRuns: 8 },
    );
  });

  it('moving money between two accounts of the same type and owner changes nothing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 399 }),
        fc.constantFrom<StrategyId>('registered_last', 'fill_brackets', 'early_rrsp'),
        (thousands, strategyId) => {
          const base = couplePlan();
          const rrsp = base.accounts.find((a) => a.id === 'rrsp-0-1')!;
          const split: AccountInput[] = [
            ...base.accounts.filter((a) => a.id !== 'rrsp-0-1'),
            { ...rrsp, balanceToday: thousands * 1_000 },
            { ...rrsp, id: 'rrsp-0-2', balanceToday: rrsp.balanceToday - thousands * 1_000 },
          ];
          const a = run(base, strategyId);
          const b = run({ ...base, accounts: split }, strategyId);
          expect(close(a.lifetimeTaxNom, b.lifetimeTaxNom)).toBe(true);
          expect(close(a.afterTaxLegacyNom, b.afterTaxLegacyNom)).toBe(true);
        },
      ),
      { numRuns: 6 },
    );
  });
});
