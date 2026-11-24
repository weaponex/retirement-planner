// The runs behind one recalculation (design file 36; Results and comparisons,
// Comparisons): the user's plan, one run per withdrawal strategy at the user's
// preset, and the placement baseline. The strategy the user chose is the
// user's plan itself, so it is run once.
import type { NormalizedInputs, StrategyId, Variant } from '../types';

/** The strategies in their persisted-id order, as the cards show them. */
export const STRATEGY_ORDER: readonly StrategyId[] = [
  'registered_last',
  'fill_brackets',
  'early_rrsp',
];

export interface PlanVariants {
  /** The user's choices. */
  user: Variant;
  /** One per strategy, in `STRATEGY_ORDER`; the chosen one is `user`. */
  strategies: Variant[];
  /** The user's strategy with the same mix in every account. */
  baseline: Variant;
}

export function variants(inputs: NormalizedInputs): PlanVariants {
  const user: Variant = {
    id: 'user',
    strategyId: inputs.withdrawal.strategyId,
    presetId: inputs.investing.presetId,
  };
  return {
    user,
    strategies: STRATEGY_ORDER.map((strategyId) =>
      strategyId === user.strategyId
        ? user
        : { id: `strategy:${strategyId}`, strategyId, presetId: user.presetId },
    ),
    baseline: { id: 'baseline', strategyId: user.strategyId, presetId: 'same_mix' },
  };
}
