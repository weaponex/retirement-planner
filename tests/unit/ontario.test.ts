// FR-M13: each step of the Ontario calculation, with expected values worked out
// from the config entries in use.
import { describe, expect, it } from 'vitest';
import { brackets } from '../../src/engine/config/read';
import {
  ontarioHealthPremium,
  ontarioSurtax,
  ontarioTaxParts,
  ontarioTaxReduction,
} from '../../src/engine/jurisdiction/ontario';
import { context, income, raw } from './taxContext';

const ctx = context();

describe('Health Premium', () => {
  const rows = raw<{ from: number; rate: number; cap: number }[]>(
    'ontario.health_premium.schedule',
  );

  it('is 0 at and below the first band start', () => {
    const first = rows[0]!;
    expect(ontarioHealthPremium(first.from, ctx)).toBe(0);
    expect(ontarioHealthPremium(first.from - 1, ctx)).toBe(0);
  });

  it.each(rows.map((r, i) => ({ ...r, prevCap: i === 0 ? 0 : rows[i - 1]!.cap, i })))(
    'band $i: at its start, one dollar above and where it reaches its cap',
    ({ from, rate, cap, prevCap }) => {
      expect(ontarioHealthPremium(from, ctx)).toBeCloseTo(prevCap, 9);
      expect(ontarioHealthPremium(from + 1, ctx)).toBeCloseTo(prevCap + rate, 9);
      const capIncome = from + (cap - prevCap) / rate;
      expect(ontarioHealthPremium(capIncome, ctx)).toBeCloseTo(cap, 9);
      expect(ontarioHealthPremium(capIncome + 1, ctx)).toBeCloseTo(cap, 9);
    },
  );
});

describe('surtax', () => {
  const [t1, t2] = raw<number[]>('ontario.surtax.thresholds') as [number, number];
  const [r1, r2] = raw<number[]>('ontario.surtax.rates') as [number, number];

  it('is 0 at and one dollar below the first threshold', () => {
    expect(ontarioSurtax(t1 - 1, ctx)).toBe(0);
    expect(ontarioSurtax(t1, ctx)).toBe(0);
  });

  it('applies the first rate one dollar above the first threshold', () => {
    expect(ontarioSurtax(t1 + 1, ctx)).toBeCloseTo(r1, 9);
  });

  it('adds the second rate only above the second threshold', () => {
    expect(ontarioSurtax(t2 - 1, ctx)).toBeCloseTo(r1 * (t2 - 1 - t1), 9);
    expect(ontarioSurtax(t2, ctx)).toBeCloseTo(r1 * (t2 - t1), 9);
    expect(ontarioSurtax(t2 + 1, ctx)).toBeCloseTo(r1 * (t2 + 1 - t1) + r2, 9);
  });
});

describe('Tax Reduction', () => {
  const basic = raw<number>('ontario.tax_reduction.basic');

  it('is 2 x the basic amount minus the tax, never below 0', () => {
    expect(ontarioTaxReduction(0, ctx)).toBeCloseTo(2 * basic, 9);
    expect(ontarioTaxReduction(basic, ctx)).toBeCloseTo(basic, 9);
    expect(ontarioTaxReduction(2 * basic, ctx)).toBe(0);
    expect(ontarioTaxReduction(3 * basic, ctx)).toBe(0);
  });

  it('can bring the tax to zero but never reduces the Health Premium', () => {
    // A 67-year-old with a pension: step up from the first Health Premium band
    // to the first income where some Ontario tax is left before the reduction.
    const firstBand = raw<{ from: number }[]>('ontario.health_premium.schedule')[0]!.from;
    let pension = firstBand;
    let parts = ontarioTaxParts(income({ pensionEligible: pension }), 67, ctx);
    while (parts.afterDividendCredit === 0) {
      pension += 100;
      parts = ontarioTaxParts(income({ pensionEligible: pension }), 67, ctx);
    }
    expect(parts.afterDividendCredit).toBeGreaterThan(0);
    expect(parts.afterDividendCredit).toBeLessThanOrEqual(basic);
    expect(parts.afterReduction).toBe(0);
    expect(parts.healthPremium).toBeGreaterThan(0);
    expect(parts.total).toBeCloseTo(parts.healthPremium, 9);
  });

  it('is partial between the basic amount and twice it', () => {
    const tax = 1.5 * basic;
    const reduction = ontarioTaxReduction(tax, ctx);
    expect(reduction).toBeGreaterThan(0);
    expect(tax - reduction).toBeGreaterThan(0);
  });
});

describe('credits and the dividend credit', () => {
  it('credits cannot make basic tax negative', () => {
    const parts = ontarioTaxParts(income({ otherOrdinary: 5000 }), 60, ctx);
    expect(parts.credits).toBeGreaterThan(parts.bracketTax);
    expect(parts.basicTax).toBe(0);
  });

  it('works out the surtax before the dividend credit, and floors at 0', () => {
    const parts = ontarioTaxParts(income({ eligibleDividends: 400000 }), 60, ctx);
    expect(parts.surtax).toBeGreaterThan(0);
    const expected = Math.max(0, parts.basicTax + parts.surtax - parts.dividendCredit);
    expect(parts.afterDividendCredit).toBeCloseTo(expected, 9);
    const small = ontarioTaxParts(income({ eligibleDividends: 50000 }), 60, ctx);
    expect(small.dividendCredit).toBeGreaterThan(small.basicTax + small.surtax);
    expect(small.afterDividendCredit).toBe(0);
  });
});

describe('bracket indexing in a later year', () => {
  it('keeps rows marked indexed: false and grows the rest', () => {
    const later = context(3, 0.1);
    const factor = later.deflator(3);
    const rawRows = raw<{ from: number; indexed?: boolean }[]>('ontario.tax.brackets');
    const entryIndexed = cfg_indexed('ontario.tax.brackets');
    const rows = brackets(later, 'ontario.tax.brackets');
    expect(rawRows.some((r) => r.indexed === false)).toBe(true);
    rows.forEach((row, i) => {
      const r = rawRows[i]!;
      const indexed = r.indexed ?? entryIndexed;
      expect(row.from).toBeCloseTo(indexed ? r.from * factor : r.from, 6);
    });
  });
});

function cfg_indexed(key: string): boolean {
  return ctx.cfg.entries.get(key)!.indexed;
}
