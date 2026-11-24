import { describe, expect, it } from 'vitest';
import { ASSET_CLASSES, type AssetClass } from '../../src/engine/config/keys';
import { mixForYear, shapeAt } from '../../src/engine/invest/glide';
import { couplePlan, planConfig, valueOf } from './helpers/couplePlan';

const cfg = planConfig();
const shapes = valueOf<
  Record<string, { points: { yearsFromRetirement: number; stockChange: number }[] }>
>(cfg, 'planning.shapes');
const gradual = shapes.gradual_shift!.points;
const userMix = couplePlan().investing.mix;
const stocks = (w: Record<AssetClass, number>) =>
  w.cad_equity + w.us_equity + w.intl_equity + w.em_equity;
const total = (w: Record<AssetClass, number>) => ASSET_CLASSES.reduce((s, c) => s + w[c], 0);
const userStock = stocks(userMix) / 100;

describe('shapeAt', () => {
  it('interpolates between points and is flat beyond the ends', () => {
    const [a, b] = [gradual[0]!, gradual[1]!];
    const mid = (a.yearsFromRetirement + b.yearsFromRetirement) / 2;
    expect(shapeAt(gradual, mid)).toBeCloseTo((a.stockChange + b.stockChange) / 2, 12);
    expect(shapeAt(gradual, a.yearsFromRetirement - 30)).toBe(a.stockChange);
    const last = gradual[gradual.length - 1]!;
    expect(shapeAt(gradual, last.yearsFromRetirement + 30)).toBe(last.stockChange);
  });
});

describe('mixForYear (SR1-M7)', () => {
  it('uses today mix in the first year, for plans starting before and after retirement', () => {
    for (const t0 of [-8, 0, 6]) {
      const w = mixForYear(userMix, 'balanced', 'gradual_shift', t0, t0, cfg);
      for (const c of ASSET_CLASSES) expect(w[c]).toBeCloseTo(userMix[c] / 100, 12);
    }
  });

  it('applies shape(t) - shape(t0) to the stock share, keeping proportions', () => {
    const t0 = -10;
    const t = 15;
    const w = mixForYear(userMix, 'balanced', 'gradual_shift', t, t0, cfg);
    const change = shapeAt(gradual, t) - shapeAt(gradual, t0);
    expect(stocks(w)).toBeCloseTo(userStock + change, 12);
    expect(total(w)).toBeCloseTo(1, 12);
    expect(w.us_equity / w.cad_equity).toBeCloseTo(userMix.us_equity / userMix.cad_equity, 12);
    expect(w.cash / w.bonds).toBeCloseTo(userMix.cash / userMix.bonds, 12);
  });

  it('steady keeps the mix', () => {
    const w = mixForYear(userMix, 'balanced', 'steady', 20, 0, cfg);
    expect(stocks(w)).toBeCloseTo(userStock, 12);
  });

  it('clamps at 100% stock', () => {
    const allStock = {
      cad_equity: 50,
      us_equity: 50,
      intl_equity: 0,
      em_equity: 0,
      bonds: 0,
      cash: 0,
    };
    const w = mixForYear(allStock, 'custom', 'gradual_shift', -10, 0, cfg);
    expect(stocks(w)).toBeCloseTo(1, 12);
    expect(total(w)).toBeCloseTo(1, 12);
  });

  it('puts points taken from a 100%-stock mix into bonds', () => {
    const allStock = {
      cad_equity: 50,
      us_equity: 50,
      intl_equity: 0,
      em_equity: 0,
      bonds: 0,
      cash: 0,
    };
    const w = mixForYear(allStock, 'custom', 'gradual_shift', 15, 0, cfg);
    const change = shapeAt(gradual, 15) - shapeAt(gradual, 0);
    expect(w.bonds).toBeCloseTo(-change, 12);
    expect(w.cash).toBe(0);
  });

  it('clamps at 0% stock and adds points to Canadian stocks for Custom', () => {
    const noStock = {
      cad_equity: 0,
      us_equity: 0,
      intl_equity: 0,
      em_equity: 0,
      bonds: 80,
      cash: 20,
    };
    const down = mixForYear(noStock, 'custom', 'gradual_shift', 15, 0, cfg);
    expect(stocks(down)).toBe(0);
    const up = mixForYear(noStock, 'custom', 'gradual_shift', -10, 0, cfg);
    const change = shapeAt(gradual, -10) - shapeAt(gradual, 0);
    expect(up.cad_equity).toBeCloseTo(change, 12);
    expect(up.bonds / up.cash).toBeCloseTo(4, 12);
  });
});
