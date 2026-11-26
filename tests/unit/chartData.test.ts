import { describe, expect, it } from 'vitest';
import type { YearRow } from '../../src/engine/types';
import { balanceRows } from '../../src/ui/charts/data';

describe('balanceRows (AR2-R1)', () => {
  it('converts a year-end balance with the next year’s deflator', () => {
    const row = (year: number) =>
      ({
        year,
        balancesEndNom: { 'rrsp-0-1': 1000, 'tfsa-0-1': 500, 'nonreg-1-1': 200 },
      }) as unknown as YearRow;
    // 2% a year from 2026.
    const toToday = (n: number, year: number) => n / 1.02 ** (year - 2026);
    const [first, second] = balanceRows([row(2026), row(2027)], toToday);
    expect(first!.registered).toBeCloseTo(1000 / 1.02, 9);
    expect(first!.tfsa).toBeCloseTo(500 / 1.02, 9);
    expect(second!.nonreg).toBeCloseTo(200 / 1.02 ** 2, 9);
  });
});
