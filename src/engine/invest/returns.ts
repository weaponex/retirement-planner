// Each asset class's yearly return (design: Asset classes and returns, FR-M6).
// This is the only place returns are worked out. Returns are fixed: the same
// every year.
import { ASSET_CLASSES, type AssetClass } from '../config/keys';
import type { Config } from '../config/load';
import { planObject, planValue } from '../config/read';
import type { InvestingInputs } from '../types';

export type IncomeType = 'eligibleDividends' | 'foreignDividends' | 'interest';

export interface ClassReturn {
  /** Gross return less the plan's fee. */
  total: number;
  /** Cash yield on the start-of-year balance; never negative. */
  yield: number;
  /** total − yield; can be negative. */
  price: number;
  incomeType: IncomeType;
}

export type ClassReturns = Record<AssetClass, ClassReturn>;

/** Each class pays one income type (design: Cash yields). */
export const INCOME_TYPE: Record<AssetClass, IncomeType> = {
  cad_equity: 'eligibleDividends',
  us_equity: 'foreignDividends',
  intl_equity: 'foreignDividends',
  em_equity: 'foreignDividends',
  bonds: 'interest',
  cash: 'interest',
};

export const STOCK_CLASSES: readonly AssetClass[] = [
  'cad_equity',
  'us_equity',
  'intl_equity',
  'em_equity',
];
export const SAFE_CLASSES: readonly AssetClass[] = ['bonds', 'cash'];

/** The plan's yearly fee: the chosen level's value, or the user's own figure. */
export function planFee(cfg: Config, investing: InvestingInputs): number {
  if (investing.feeLevel === 'custom') return investing.customFee ?? 0;
  const levels = planObject<Record<string, number>>(cfg, 'planning.fee_levels');
  const fee = levels[investing.feeLevel];
  if (fee === undefined) throw new Error(`planning.fee_levels has no ${investing.feeLevel}`);
  return fee;
}

/**
 * For each class: gross = the user's override if set, else FP Canada's
 * compound return (both before fees); total = gross − fee; yield from the
 * config (or its override); price = total − yield.
 */
export function classReturns(cfg: Config, investing: InvestingInputs): ClassReturns {
  const fee = planFee(cfg, investing);
  const out = {} as ClassReturns;
  for (const cls of ASSET_CLASSES) {
    const gross =
      investing.returnOverride?.[cls] ?? planValue(cfg, `market.${cls}.geometric_return`);
    const total = gross - fee;
    const y = planValue(cfg, `market.${cls}.yield`);
    out[cls] = { total, yield: y, price: total - y, incomeType: INCOME_TYPE[cls] };
  }
  return out;
}

/**
 * The optimistic-return limit for a class: FP Canada's figure plus
 * `planning.override_margin`, before fees. An override above it triggers the
 * "optimistic returns" warning.
 */
export function optimisticLimit(cfg: Config, cls: AssetClass): number {
  return (
    planValue(cfg, `market.${cls}.geometric_return`) + planValue(cfg, 'planning.override_margin')
  );
}

export function isOptimistic(cfg: Config, cls: AssetClass, override: number): boolean {
  return override > optimisticLimit(cfg, cls);
}
