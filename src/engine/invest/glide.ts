// The growth-to-safety shape (design: Placement and the growth-to-safety shift;
// SR1-M7). A shape changes the user's own stock share by years from the first
// retirement, measured from the plan start, so the first year always uses
// today's mix. Proportions within stocks, and within bonds and cash, are kept.
import { ASSET_CLASSES, type AssetClass } from '../config/keys';
import type { Config } from '../config/load';
import { planObject } from '../config/read';
import type { MixId, ShapeId } from '../types';
import type { Weights } from './rebalance';
import { SAFE_CLASSES, STOCK_CLASSES } from './returns';

interface ShapePoint {
  yearsFromRetirement: number;
  stockChange: number;
}

/** The shape's stock change at `t` years from retirement: straight lines between points, flat beyond the ends. */
export function shapeAt(points: ShapePoint[], t: number): number {
  const sorted = [...points].sort((a, b) => a.yearsFromRetirement - b.yearsFromRetirement);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (t <= first.yearsFromRetirement) return first.stockChange;
  if (t >= last.yearsFromRetirement) return last.stockChange;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    if (t <= b.yearsFromRetirement) {
      const along = (t - a.yearsFromRetirement) / (b.yearsFromRetirement - a.yearsFromRetirement);
      return a.stockChange + along * (b.stockChange - a.stockChange);
    }
  }
  return last.stockChange;
}

const sumOf = (w: Weights, classes: readonly AssetClass[]) => classes.reduce((s, c) => s + w[c], 0);

/** Spreads `amount` over `classes` in proportion to `w`; equally weighted `fallback` if they hold nothing. */
function spread(
  w: Weights,
  classes: readonly AssetClass[],
  amount: number,
  fallback: Partial<Weights>,
): void {
  const held = sumOf(w, classes);
  if (held > 0) {
    for (const c of classes) w[c] += (amount * w[c]) / held;
    return;
  }
  const fb = Object.entries(fallback) as [AssetClass, number][];
  const fbTotal = fb.reduce((s, [, v]) => s + v, 0);
  for (const [c, v] of fb) w[c] += (amount * v) / fbTotal;
}

/** Scales `classes` so they sum to `target`. */
function scaleTo(w: Weights, classes: readonly AssetClass[], target: number): void {
  const held = sumOf(w, classes);
  for (const c of classes) w[c] = held > 0 ? (w[c] * target) / held : 0;
}

/** The stock proportions of the named starting mix chosen last, or Canadian stocks for Custom (or until `planning.mixes` has values, O24). */
function stockFallback(startingMixId: MixId, cfg: Config): Partial<Weights> {
  const cad: Partial<Weights> = { cad_equity: 1 };
  if (startingMixId === 'custom') return cad;
  const entry = cfg.entries.get('planning.mixes');
  if (!entry || entry.value === null) return cad;
  const mix = planObject<Record<string, Partial<Weights>>>(cfg, 'planning.mixes')[startingMixId];
  const stocks = Object.fromEntries(
    STOCK_CLASSES.filter((c) => (mix?.[c] ?? 0) > 0).map((c) => [c, mix![c]!]),
  );
  return Object.keys(stocks).length > 0 ? stocks : cad;
}

/**
 * This year's mix, as fractions: the user's mix (whole percentages) with
 * shape(t) − shape(t₀) added to its stock share, clamped to 0..1. Points taken
 * from stocks go to bonds and cash in the user's proportions (to bonds if the
 * user holds neither); points added come from bonds and cash in proportion and
 * go to stocks in the user's proportions (or the starting mix's, if the user
 * holds no stocks).
 */
export function mixForYear(
  userMix: Record<AssetClass, number>,
  startingMixId: MixId,
  shapeId: ShapeId,
  yearsFromFirstRetirement: number,
  planStartYearsFromRetirement: number,
  cfg: Config,
): Weights {
  const w = {} as Weights;
  for (const c of ASSET_CLASSES) w[c] = userMix[c] / 100;
  const shapes = planObject<Record<ShapeId, { points: ShapePoint[] }>>(cfg, 'planning.shapes');
  const points = shapes[shapeId].points;
  const change =
    shapeAt(points, yearsFromFirstRetirement) - shapeAt(points, planStartYearsFromRetirement);
  const stock = sumOf(w, STOCK_CLASSES);
  const newStock = Math.min(1, Math.max(0, stock + change));
  const delta = newStock - stock;
  if (delta < 0) {
    scaleTo(w, STOCK_CLASSES, newStock);
    spread(w, SAFE_CLASSES, -delta, { bonds: 1 });
  } else if (delta > 0) {
    scaleTo(w, SAFE_CLASSES, sumOf(w, SAFE_CLASSES) - delta);
    spread(w, STOCK_CLASSES, delta, stockFallback(startingMixId, cfg));
  }
  return w;
}
