import { describe, expect, it } from 'vitest';
import { lifLimits } from '../../src/engine/accounts/liraLif';
import { deaths, firstDeathTransfer } from '../../src/engine/project/death';
import type { PlanState } from '../../src/engine/types';
import { account, spouseState } from './helpers/accounts';
import { normalized, planConfig, yearContext } from './helpers/couplePlan';

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
