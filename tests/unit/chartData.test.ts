import { describe, expect, it } from 'vitest';
import type { YearRow } from '../../src/engine/types';
import { balanceRows, usedGroups } from '../../src/ui/charts/data';

describe('balanceRows (AR2-R1)', () => {
  it('converts a year-end balance with the next year’s deflator', () => {
    const row = (year: number) =>
      ({
        year,
        balancesEndNom: {
          'rrsp-0-1': 1000,
          'lira-0-1': 300,
          'lira-0-2': 400,
          'tfsa-0-1': 500,
          'nonreg-1-1': 200,
        },
      }) as unknown as YearRow;
    // 2% a year from 2026.
    const toToday = (n: number, year: number) => n / 1.02 ** (year - 2026);
    const [first, second] = balanceRows([row(2026), row(2027)], toToday, new Set(['lira-0-2']));
    expect(first!.registered).toBeCloseTo(1000 / 1.02, 9);
    expect(first!.tfsa).toBeCloseTo(500 / 1.02, 9);
    // LIRA and LIF have their own band (AR2-R3).
    expect(first!.locked).toBeCloseTo(300 / 1.02, 9);
    expect(second!.nonreg).toBeCloseTo(200 / 1.02 ** 2, 9);
  });
  it('puts a workplace DC pension in its own band and leaves out empty bands (AR2-R4)', () => {
    const rows = balanceRows(
      [{ year: 2026, balancesEndNom: { 'lira-0-2': 400, 'rrsp-0-1': 100 } } as unknown as YearRow],
      (n) => n,
      new Set(['lira-0-2']),
    );
    expect(rows[0]).toMatchObject({ pension: 400, locked: 0, registered: 100 });
    expect(usedGroups(rows).map((g) => g.id)).toEqual(['registered', 'pension']);
  });
});
