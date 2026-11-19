// Federal rules, with expected values worked out from the config entries in use.
import { describe, expect, it } from 'vitest';
import { brackets, amount } from '../../src/engine/config/read';
import {
  ageAmount,
  federalBasicAmount,
  federalTax,
  federalTaxParts,
  incomeTotals,
} from '../../src/engine/jurisdiction/federal';
import { context, income, raw } from './taxContext';

const ctx = context();
const rows = brackets(ctx, 'federal.tax.brackets');
const full = raw<number>('federal.credits.basic');
const min = raw<number>('federal.credits.basic_min');

describe('basic personal amount (TC-1)', () => {
  const start = rows[3]!.from;
  const end = rows[4]!.from;

  it('is the full amount up to the fourth row start', () => {
    expect(federalBasicAmount(start - 1, rows, ctx)).toBe(full);
    expect(federalBasicAmount(start, rows, ctx)).toBe(full);
  });

  it('falls in a straight line to the minimum at the fifth row start', () => {
    expect(federalBasicAmount((start + end) / 2, rows, ctx)).toBeCloseTo((full + min) / 2, 9);
    expect(federalBasicAmount(end, rows, ctx)).toBeCloseTo(min, 9);
    expect(federalBasicAmount(end + 100000, rows, ctx)).toBeCloseTo(min, 9);
  });
});

describe('age amount', () => {
  const keys = {
    amount: 'federal.credits.age.amount',
    threshold: 'federal.credits.age.reduction_threshold',
    rate: 'federal.credits.age.reduction_rate',
  };
  const minAge = raw<number>('federal.credits.age.min_age');
  const threshold = raw<number>(keys.threshold);
  const rate = raw<number>(keys.rate);
  const value = raw<number>(keys.amount);

  it('is 0 below the minimum age', () => {
    expect(ageAmount(minAge - 1, 0, ctx, keys)).toBe(0);
  });

  it('is full up to the threshold, then reduced, then 0', () => {
    expect(ageAmount(minAge, threshold, ctx, keys)).toBe(value);
    expect(ageAmount(minAge, threshold + 1000, ctx, keys)).toBeCloseTo(value - 1000 * rate, 9);
    expect(ageAmount(minAge, threshold + value / rate + 1, ctx, keys)).toBe(0);
  });
});

describe('OAS recovery tax', () => {
  const threshold = raw<number>('federal.oas.recovery.threshold');
  const rate = raw<number>('federal.oas.recovery.rate');

  it('is 0 at the threshold and the rate above it', () => {
    const oas = 9000;
    expect(incomeTotals(income({ oas, otherOrdinary: threshold - oas }), ctx).clawback).toBe(0);
    const t = incomeTotals(income({ oas, otherOrdinary: threshold - oas + 1000 }), ctx);
    expect(t.clawback).toBeCloseTo(1000 * rate, 9);
  });

  it('never exceeds the OAS received', () => {
    const t = incomeTotals(income({ oas: 9000, otherOrdinary: threshold * 3 }), ctx);
    expect(t.clawback).toBe(9000);
  });

  it('is deducted from net and taxable income', () => {
    const t = incomeTotals(income({ oas: 9000, otherOrdinary: threshold }), ctx);
    expect(t.netIncome).toBeCloseTo(t.totalIncome - t.clawback, 9);
    expect(t.taxableIncome).toBe(t.netIncome);
  });
});

describe('dividends and gains', () => {
  it('grosses up eligible dividends and includes part of capital gains', () => {
    const grossUp = raw<number>('federal.dividend.eligible.gross_up');
    const inclusion = raw<number>('federal.capital_gains.inclusion_rate');
    const t = incomeTotals(income({ eligibleDividends: 1000, capitalGains: 1000 }), ctx);
    expect(t.grossedUpDividends).toBeCloseTo(1000 * (1 + grossUp), 9);
    expect(t.includedGains).toBeCloseTo(1000 * inclusion, 9);
  });

  it('the dividend credit cannot make federal tax negative', () => {
    const parts = federalTaxParts(income({ eligibleDividends: 50000 }), 60, ctx);
    expect(parts.dividendCredit).toBeGreaterThan(parts.bracketTax - parts.credits);
    expect(parts.tax).toBe(0);
    expect(federalTax(income({ eligibleDividends: 50000 }), 60, ctx).tax).toBe(0);
  });
});

describe('indexing in a later year', () => {
  const later = context(3, 0.1);
  const factor = later.deflator(3);

  it('grows indexed amounts and leaves the others fixed', () => {
    for (const key of ['federal.credits.basic', 'federal.credits.pension.amount']) {
      const entry = ctx.cfg.entries.get(key)!;
      const expected = (entry.value as number) * (entry.indexed ? factor : 1);
      expect(amount(later, key)).toBeCloseTo(expected, 6);
    }
  });

  it('grows every federal bracket threshold', () => {
    const laterRows = brackets(later, 'federal.tax.brackets');
    laterRows.forEach((row, i) => expect(row.from).toBeCloseTo(rows[i]!.from * factor, 6));
  });
});
