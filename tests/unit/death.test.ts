import { describe, expect, it } from 'vitest';
import { lifLimits } from '../../src/engine/accounts/liraLif';
import {
  deaths,
  estate,
  finalReturn,
  firstDeathTransfer,
  secondDeath,
} from '../../src/engine/project/death';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { personalTax } from '../../src/engine/tax/personalTax';
import type { PlanState } from '../../src/engine/types';
import { account, spouseState } from './helpers/accounts';
import {
  couplePlan,
  normalized,
  planConfig,
  valueOf,
  yearContext,
  zeroIncome,
} from './helpers/couplePlan';

const ctx = yearContext(0, planConfig());

function stateAfterDeath(): PlanState {
  return {
    year: 2040,
    yearIndex: 14,
    spouses: [
      spouseState({ alive: false, age: 80, carriedLossNom: 5_000, tfsaRoomNom: 7_000 }),
      spouseState({ alive: true, age: 72, carriedLossNom: 1_000, tfsaRoomNom: 3_000 }),
    ],
    accounts: [
      account('rrsp-0-1', 'rrif', 0, { bonds: 100_000 }, {}, { openedYear: 2030 }),
      account(
        'lira-0-1',
        'lif',
        0,
        { bonds: 50_000 },
        {},
        { openedYear: 2030, lifPrevEarningsNom: 2_000 },
      ),
      account('tfsa-0-1', 'tfsa', 0, { cash: 40_000 }),
      account('nonreg-0-1', 'nonreg', 0, { cad_equity: 30_000 }, { cad_equity: 10_000 }),
      account('rrsp-1-1', 'rrif', 1, { bonds: 60_000 }, {}, { openedYear: 2033 }),
    ],
    splitShare: { from: 0, share: 0 },
    firstDeathYear: 2039,
  };
}

describe('firstDeathTransfer', () => {
  it('accounts keep id and type and change owner, at original cost', () => {
    const after = firstDeathTransfer(stateAfterDeath());
    expect(after.accounts.map((a) => [a.id, a.type, a.owner])).toEqual([
      ['rrsp-0-1', 'rrif', 1],
      ['lira-0-1', 'lif', 1],
      ['tfsa-0-1', 'tfsa', 1],
      ['nonreg-0-1', 'nonreg', 1],
      ['rrsp-1-1', 'rrif', 1],
    ]);
    const nonreg = after.accounts.find((a) => a.id === 'nonreg-0-1')!;
    expect(nonreg.holdings.cad_equity.costNom).toBe(10_000);
    const lif = after.accounts.find((a) => a.id === 'lira-0-1')!;
    expect(lif.openedYear).toBe(2030);
    expect(lif.lifPrevEarningsNom).toBe(2_000);
  });

  it('the survivor age then drives minimums and maximums', () => {
    const after = firstDeathTransfer(stateAfterDeath());
    const lif = after.accounts.find((a) => a.id === 'lira-0-1')!;
    const survivorStartAge = after.spouses[lif.owner].age - 1;
    expect(survivorStartAge).toBe(71);
    expect(lifLimits(lif, survivorStartAge, 2040, ctx).min).toBeGreaterThan(0);
  });

  it('drops the deceased carried loss and uses none of the survivor TFSA room', () => {
    const after = firstDeathTransfer(stateAfterDeath());
    expect(after.spouses[0].carriedLossNom).toBe(0);
    expect(after.spouses[1].carriedLossNom).toBe(1_000);
    expect(after.spouses[1].tfsaRoomNom).toBe(3_000);
  });

  it('does nothing while both are alive', () => {
    const s = stateAfterDeath();
    s.spouses[0] = { ...s.spouses[0], alive: true };
    expect(firstDeathTransfer(s)).toBe(s);
  });
});

describe('deaths', () => {
  it('lists each death at the end of the target year, first death first', () => {
    const inputs = normalized();
    const list = deaths(inputs);
    expect(list.map((d) => d.year)).toEqual(
      inputs.spouses.map((s) => s.birthYear + s.lifeExpectancyTarget).sort((a, b) => a - b),
    );
  });
});

describe('the final return (stage 3, T10)', () => {
  const cfg = planConfig();
  const ctx3 = yearContext(10, cfg);
  const yearIncome = { ...zeroIncome(), cpp: 15_000, oas: 9_000, pensionEligible: 20_000 };
  const yearTax = personalTax(yearIncome, 88, ontario, ctx3).total;
  const end: PlanState = {
    year: 2036,
    yearIndex: 10,
    spouses: [
      spouseState({ alive: true, age: 88, carriedLossNom: 2_000 }),
      spouseState({ alive: false, age: 86 }),
    ],
    accounts: [
      account('rrsp-0-1', 'rrsp', 0, { bonds: 50_000 }),
      account('lira-0-1', 'lira', 0, { bonds: 30_000 }),
      account('rrif-0-2', 'rrif', 0, { bonds: 100_000 }),
      account('tfsa-0-1', 'tfsa', 0, { cash: 40_000 }),
      account('nonreg-0-1', 'nonreg', 0, { cad_equity: 60_000 }, { cad_equity: 40_000 }),
    ],
    splitShare: { from: 0, share: 0 },
    firstDeathYear: 2030,
  };

  it('counts every registered balance, converted or not, and deemed gains after the carried loss', () => {
    const fr = finalReturn(0, end, yearIncome, yearTax, ctx3);
    expect(fr.deemedRegisteredNom).toBeCloseTo(180_000, 6);
    expect(fr.deemedGainsNom).toBeCloseTo(20_000 - 2_000, 6);
    const full = { ...yearIncome, otherOrdinary: 180_000, capitalGains: 18_000 };
    expect(fr.finalReturnTaxNom).toBeCloseTo(
      personalTax(full, 88, ontario, ctx3).total - yearTax,
      6,
    );
  });

  it('pays the final tax first, then probate on non-registered assets and the home', () => {
    const inputs = normalized(
      couplePlan({ estate: { survivorPct: 70, legacyGoalToday: 0, homeValueToday: 500_000 } }),
    );
    const finalTax = 70_000;
    const e = estate(end, finalTax, inputs, ctx3);
    expect(e.homeNom).toBeCloseTo(500_000 * ctx3.deflator(10), 6);
    const base = 60_000 + e.homeNom - finalTax;
    expect(e.probateNom).toBeCloseTo(ontario.probate(base, ctx3), 6);
    expect(e.afterTaxLegacyNom).toBeCloseTo(280_000 + e.homeNom - finalTax - e.probateNom, 6);
  });

  it('probate is 0 at or below the threshold, the rate on the excess above it', () => {
    const threshold = valueOf<number>(cfg, 'ontario.probate.threshold');
    const rate = valueOf<number>(cfg, 'ontario.probate.rate');
    expect(ontario.probate(threshold, ctx3)).toBe(0);
    expect(ontario.probate(threshold + 10_000, ctx3)).toBeCloseTo(rate * 10_000, 6);
  });

  it('same-year deaths: the first rollover, then one final return covering every account', () => {
    const base = couplePlan();
    const plan = couplePlan({
      spouses: [
        { ...base.spouses[0], lifeExpectancyTarget: 85 },
        { ...base.spouses[1], lifeExpectancyTarget: 83 },
      ],
    });
    const inputs = normalized(plan);
    const both: PlanState = {
      ...end,
      spouses: [spouseState({ age: 85 }), spouseState({ age: 83, carriedLossNom: 9_000 })],
      accounts: [
        account('rrif-0-1', 'rrif', 0, { bonds: 100_000 }),
        account('rrif-1-1', 'rrif', 1, { bonds: 70_000 }),
        account('nonreg-1-1', 'nonreg', 1, { cash: 10_000 }),
      ],
    };
    expect(deaths(inputs)[0].year).toBe(deaths(inputs)[1].year);
    const taxed: [
      { income: typeof yearIncome; tax: number },
      { income: typeof yearIncome; tax: number },
    ] = [
      { income: yearIncome, tax: yearTax },
      { income: zeroIncome(), tax: 0 },
    ];
    const e = secondDeath(both, taxed, inputs, ctx3);
    // Spouse 1 (index 0) counts as dying first; the final return is spouse 2's and covers both RRIFs.
    expect(e.deemedRegisteredNom).toBeCloseTo(170_000, 6);
    expect(e.finalReturnTaxNom).toBeCloseTo(
      personalTax({ ...zeroIncome(), otherOrdinary: 170_000 }, 83, ontario, ctx3).total,
      6,
    );
  });
});
