import { describe, expect, it } from 'vitest';
import cases from '../fixtures/tax-cases.json';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { personalTax } from '../../src/engine/tax/personalTax';
import type { TaxableIncome } from '../../src/engine/types';
import { context } from './taxContext';

interface TaxCase {
  id: string;
  pairId?: string;
  age: number;
  income: TaxableIncome;
  federalTax: number;
  ontarioTax: number;
  clawback: number;
}

const TOLERANCE = 1;

describe('personalTax against tests/fixtures/tax-cases.json', () => {
  it('has at least 20 cases, including a pension-split pair', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
    const pairs = new Map<string, number>();
    for (const c of cases as TaxCase[]) {
      if (c.pairId) pairs.set(c.pairId, (pairs.get(c.pairId) ?? 0) + 1);
    }
    expect([...pairs.values()]).toContain(2);
  });

  it.each(cases as TaxCase[])('$id matches within one dollar', (c) => {
    const result = personalTax(c.income, c.age, ontario, context());
    expect(Math.abs(result.federal - c.federalTax)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(result.provincial - c.ontarioTax)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(result.clawback - c.clawback)).toBeLessThanOrEqual(TOLERANCE);
    expect(result.total).toBeCloseTo(result.federal + result.provincial + result.clawback, 9);
  });
});
