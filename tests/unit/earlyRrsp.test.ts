import { describe, expect, it } from 'vitest';
import {
  drawDownYears,
  earlyRrsp,
  fillUp,
  noDrawDownYears,
} from '../../src/engine/withdraw/earlyRrsp';
import { account } from './helpers/accounts';
import { couplePlan, normalized, planConfig, yearContext } from './helpers/couplePlan';
import { byAccount, yearInProgress } from './helpers/yearInProgress';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const plan = couplePlan();

const withAges = (cpp: [number, number], oas: [number, number]) =>
  normalized({
    ...plan,
    spouses: [
      { ...plan.spouses[0], cppStartAge: cpp[0], oasStartAge: oas[0] },
      { ...plan.spouses[1], cppStartAge: cpp[1], oasStartAge: oas[1] },
    ],
  });

describe('drawDownYears (SR1-M4)', () => {
  it('runs from the first retirement through the last start year', () => {
    const inputs = withAges([70, 65], [70, 68]);
    // Spouse 1 born 1961 starts both at 70 (2031); spouse 2 born 1963 starts OAS at 68 (2031).
    const years = drawDownYears(inputs, []);
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(2031);
  });

  it('stops counting a spouse after their death', () => {
    const inputs = withAges([70, 65], [70, 65]);
    expect(drawDownYears(inputs, [{ spouse: 0, year: 2028 }]).at(-1)).toBe(2028);
  });

  it('has no draw-down years when benefits start at or before retirement', () => {
    const inputs = normalized({
      ...plan,
      spouses: [
        // Both start CPP and OAS at 65 (2026 and 2028) and retire in 2029.
        { ...plan.spouses[0], retirementYear: 2029 },
        { ...plan.spouses[1], retirementYear: 2029, cppStartAge: 65, oasStartAge: 65 },
      ],
    });
    expect(drawDownYears(inputs, [])).toEqual([]);
    expect(noDrawDownYears(inputs, [])).toBe(true);
  });
});

describe('fillUp', () => {
  const accounts = () => [
    account('rrif-0-1', 'rrif', 0, { bonds: 300_000 }, {}, { openedYear: 2020 }),
    account('rrsp-1-1', 'rrsp', 1, { bonds: 300_000 }),
    account('nonreg-0-1', 'nonreg', 0, { cash: 100_000 }),
  ];

  it('draws from the lower-income spouse until equal, then both equally', () => {
    const year = yearInProgress(accounts(), [{}, {}], [{ cpp: 20_000 }, { cpp: 5_000 }]);
    expect(fillUp(10_000, year, ctx)).toEqual([0, 10_000]);
    const [a, b] = fillUp(25_000, year, ctx);
    expect(b).toBeCloseTo(15_000 + 5_000, 6);
    expect(a).toBeCloseTo(5_000, 6);
  });

  it('starts with spouse 1 when incomes are equal', () => {
    const year = yearInProgress(accounts(), [{}, {}], [{ cpp: 5_000 }, { cpp: 5_000 }]);
    expect(fillUp(10_000, year, ctx)).toEqual([5_000, 5_000]);
  });

  it('takes the rest from the other spouse when one is exhausted', () => {
    const small = [
      account('rrif-0-1', 'rrif', 0, { bonds: 300_000 }, {}, { openedYear: 2020 }),
      account('rrsp-1-1', 'rrsp', 1, { bonds: 4_000 }),
    ];
    const year = yearInProgress(small, [{}, {}], [{ cpp: 20_000 }, { cpp: 5_000 }]);
    const [a, b] = fillUp(30_000, year, ctx);
    expect(b).toBeCloseTo(4_000, 6);
    expect(a).toBeCloseTo(26_000, 6);
  });

  it('skips a spouse still working (C2)', () => {
    const year = yearInProgress(accounts(), [{}, { working: true }], [{ cpp: 20_000 }, {}]);
    expect(fillUp(10_000, year, ctx)).toEqual([10_000, 0]);
  });
});

describe('earlyRrsp', () => {
  const accounts = () => [
    account('rrif-0-1', 'rrif', 0, { bonds: 300_000 }, {}, { openedYear: 2020 }),
    account('nonreg-0-1', 'nonreg', 0, { cash: 100_000 }),
  ];

  it('draws registered first in draw-down years, registered last otherwise', () => {
    const year = yearInProgress(accounts(), [{}, {}], [{}, {}], 2028);
    expect(Object.keys(byAccount(earlyRrsp(10_000, year, [2028], ctx)))).toEqual(['rrif-0-1']);
    expect(Object.keys(byAccount(earlyRrsp(10_000, year, [2027], ctx)))).toEqual(['nonreg-0-1']);
  });
});
