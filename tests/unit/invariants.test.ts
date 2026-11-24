import { describe, expect, it } from 'vitest';
import { checkYear, EngineIntegrityError, failedChecks } from '../../src/engine/invariants';
import { initialState } from '../../src/engine/project/initialState';
import { solveYear } from '../../src/engine/solver/yearSolve';
import type { PlanState, Variant, YearRow } from '../../src/engine/types';
import { couplePlan, normalized, planConfig, yearContext } from './helpers/couplePlan';

const ctx = yearContext(0, planConfig());
const variant: Variant = {
  id: 'v',
  strategyId: 'registered_last',
  presetId: 'bonds_sheltered_first',
};
const inputs = normalized(couplePlan());
const start = initialState(inputs, ctx, variant);
const { row, nextState } = solveYear(start, inputs, ctx, variant);
const checks = {
  variantId: 'v',
  kind: 'retired' as const,
  limits: {},
  tfsaRoomStart: [1e9, 1e9] as [number, number],
  tfsaIn: [0, 0] as [number, number],
};
const clone = <T>(x: T): T => structuredClone(x);

describe('invariants', () => {
  it('hold on a normal year', () => {
    expect(failedChecks(nextState, row, checks)).toEqual([]);
  });

  it('fail on a broken account identity', () => {
    const broken: YearRow = clone(row);
    broken.accounts['rrsp-0-1']!.endNom += 1;
    broken.balancesEndNom['rrsp-0-1']! += 1;
    expect(failedChecks(nextState, broken, checks)).toContain('account identity rrsp-0-1');
  });

  it('fail when the household identity does not balance', () => {
    const broken: YearRow = clone(row);
    broken.spouse[0].taxNom += 10;
    expect(failedChecks(nextState, broken, checks)).toContain('household identity');
  });

  it('fail when spending is not met and no shortfall is recorded', () => {
    const broken: YearRow = clone(row);
    broken.afterTaxCashNom -= 100;
    expect(failedChecks(nextState, broken, checks)).toContain('spending need');
  });

  it('fail on a negative balance', () => {
    const broken: PlanState = clone(nextState);
    broken.accounts[0]!.holdings.cash.valueNom = -1;
    expect(failedChecks(broken, row, checks).some((f) => f.startsWith('negative holding'))).toBe(
      true,
    );
  });

  it('fail when a RRIF draw is below its minimum or a LIF above its maximum', () => {
    const limits = { 'rrsp-0-1': { min: 1e9, max: Infinity }, 'tfsa-0-1': { min: 0, max: -1 } };
    const failed = failedChecks(nextState, row, { ...checks, limits });
    expect(failed).toContain('minimum rrsp-0-1');
  });

  it('fail when TFSA deposits exceed room', () => {
    const failed = failedChecks(nextState, row, {
      ...checks,
      tfsaRoomStart: [100, 0],
      tfsaIn: [200, 0],
    });
    expect(failed).toContain('TFSA room spouse 1');
  });

  it('checkYear throws an EngineIntegrityError with the year, variant and check', () => {
    const broken: YearRow = clone(row);
    broken.spouse[0].taxNom += 10;
    try {
      checkYear(start, nextState, broken, ctx, checks);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EngineIntegrityError);
      const err = e as EngineIntegrityError;
      expect(err.year).toBe(row.year);
      expect(err.variantId).toBe('v');
      expect(err.check).toContain('household identity');
    }
  });
});
