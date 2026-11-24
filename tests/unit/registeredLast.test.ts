import { describe, expect, it } from 'vitest';
import { lifLimits } from '../../src/engine/accounts/liraLif';
import { registeredLast } from '../../src/engine/withdraw/registeredLast';
import { account } from './helpers/accounts';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';
import { byAccount, total, yearInProgress } from './helpers/yearInProgress';

const cfg = planConfig();
const ctx = yearContext(4, cfg);
const pensionAge = valueOf<number>(cfg, 'federal.credits.pension.min_age_rrif');

const accounts = () => [
  account('nonreg-0-1', 'nonreg', 0, { cash: 30_000 }, { cash: 20_000 }),
  account('nonreg-1-1', 'nonreg', 1, { cash: 10_000 }),
  account('rrif-0-1', 'rrif', 0, { bonds: 300_000 }, {}, { openedYear: 2020 }),
  account('rrsp-1-1', 'rrsp', 1, { bonds: 100_000 }),
  account('lif-1-1', 'lif', 1, { bonds: 100_000 }, {}, { openedYear: 2020 }),
  account('lira-0-1', 'lira', 0, { bonds: 50_000 }),
  account('tfsa-0-1', 'tfsa', 0, { cash: 20_000 }),
  account('tfsa-1-1', 'tfsa', 1, { cash: 60_000 }),
];

describe('registeredLast', () => {
  it('draws non-registered first, pro rata between spouses, with gains at average cost', () => {
    const draws = registeredLast(20_000, yearInProgress(accounts()), ctx);
    const by = byAccount(draws);
    expect(by['nonreg-0-1']).toBeCloseTo(15_000, 6);
    expect(by['nonreg-1-1']).toBeCloseTo(5_000, 6);
    expect(draws.find((d) => d.accountId === 'nonreg-0-1')!.realizedGainNom).toBeCloseTo(5_000, 6);
    expect(total(draws)).toBeCloseTo(20_000, 6);
  });

  it('then registered accounts pro rata across both spouses, never a LIRA', () => {
    // Give the LIF plenty of room so nothing is capped here.
    const roomy = accounts().map((a) =>
      a.id === 'lif-1-1' ? { ...a, lifPrevEarningsNom: 100_000 } : a,
    );
    const draws = registeredLast(40_000 + 50_000, yearInProgress(roomy), ctx);
    const by = byAccount(draws);
    expect(by['lira-0-1']).toBeUndefined();
    expect(by['rrif-0-1']).toBeCloseTo(50_000 * (300 / 500), 6);
    expect(by['rrsp-1-1']).toBeCloseTo(50_000 * (100 / 500), 6);
    expect(by['lif-1-1']).toBeCloseTo(50_000 * (100 / 500), 6);
  });

  it('caps a LIF at its maximum and sends the overflow to the same owner first (M6)', () => {
    const year = yearInProgress(accounts(), [{ age: 75 }, { age: 75 }]);
    const lif = accounts().find((a) => a.id === 'lif-1-1')!;
    const max = lifLimits(lif, 74, 2030, ctx).max;
    const draws = registeredLast(40_000 + 300_000, year, ctx);
    const by = byAccount(draws);
    expect(by['lif-1-1']).toBeCloseTo(max, 6);
    // The LIF's pro rata share was 60k. What it couldn't pay went to spouse 2's
    // RRSP until it was empty, and the rest to spouse 1's RRIF.
    expect(by['rrsp-1-1']).toBeCloseTo(100_000, 6);
    expect(by['rrif-0-1']).toBeCloseTo(180_000 + (60_000 - max) - 40_000, 6);
    expect(total(draws)).toBeCloseTo(340_000, 6);
  });

  it('then the TFSA, pro rata', () => {
    const draws = registeredLast(
      40_000 + 500_000 + 40_000,
      yearInProgress(accounts(), [{ age: 60 }, { age: 60 }]),
      ctx,
    );
    const by = byAccount(draws);
    expect(by['tfsa-0-1']! / by['tfsa-1-1']!).toBeCloseTo(20 / 60, 6);
  });

  it('types RRIF and LIF draws for the pension credit by the owner age', () => {
    const draws = registeredLast(
      100_000,
      yearInProgress(accounts(), [{ age: pensionAge }, { age: pensionAge - 1 }]),
      ctx,
    );
    expect(draws.find((d) => d.accountId === 'rrif-0-1')!.incomeType).toBe('pensionEligible');
    expect(draws.find((d) => d.accountId === 'lif-1-1')!.incomeType).toBe('otherOrdinary');
    expect(draws.find((d) => d.accountId === 'rrsp-1-1')!.incomeType).toBe('otherOrdinary');
  });
});
