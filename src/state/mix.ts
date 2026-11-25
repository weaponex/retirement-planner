// The mix sliders (design: Asset classes and returns, The user's mix): setting
// one class moves the others in proportion to their current shares, in whole
// percent, so the total stays at 100. A class at 0% stays at 0%.
import { ASSET_CLASSES, type AssetClass } from '../engine/config/keys';

const TOTAL = 100;

export function setMixShare(
  mix: Record<AssetClass, number>,
  changed: AssetClass,
  value: number,
): Record<AssetClass, number> {
  const v = Math.max(0, Math.min(TOTAL, Math.round(value)));
  const others = ASSET_CLASSES.filter((c) => c !== changed && mix[c] > 0);
  const held = others.reduce((s, c) => s + mix[c], 0);
  const next = { ...mix, [changed]: v };
  if (held === 0) return next; // nothing to move; the mix check reports a total other than 100
  const room = TOTAL - v;
  // Largest-remainder rounding, so the shares stay whole and add up to 100.
  const exact = others.map((c) => ({ c, x: (mix[c] * room) / held }));
  for (const e of exact) next[e.c] = Math.floor(e.x);
  let left = room - exact.reduce((s, e) => s + Math.floor(e.x), 0);
  for (const e of [...exact].sort((a, b) => b.x - Math.floor(b.x) - (a.x - Math.floor(a.x)))) {
    if (left <= 0) break;
    next[e.c] += 1;
    left -= 1;
  }
  return next;
}

export function mixTotal(mix: Record<AssetClass, number | null>): number {
  return ASSET_CLASSES.reduce((s, c) => s + (mix[c] ?? 0), 0);
}
