// Fixed explanation templates (design file 50; Advice wording): every strategy,
// shape, preset and comparison, in conditional wording. Never "you should".
import type { PresetId, ShapeId, StrategyId } from '../../engine/types';

export interface StrategyText {
  title: string;
  short: string;
  what: string;
  effect: string;
  pros: string[];
  cons: string[];
  whenItFits: string;
  choosing?: string;
}

export const STRATEGIES: Record<StrategyId, StrategyText> = {
  registered_last: {
    title: 'Registered last',
    short: 'Spend non-registered savings first, then RRSP/RRIF and LIF, then the TFSA.',
    what: 'After the required RRIF and LIF minimums, the plan draws from non-registered savings first, then from RRSP/RRIF and LIF money, and from the TFSA last.',
    effect:
      'Registered money keeps growing untaxed for longer, so registered balances, and the minimums and tax on them, can be larger later and at the second death.',
    pros: ['Simple and familiar', 'Keeps the TFSA for last, so it can pass on tax-free'],
    cons: [
      'Can leave large registered balances, taxed in full on the final return',
      'Later RRIF minimums can push income into the OAS clawback',
    ],
    whenItFits:
      'Under these assumptions it tends to suit plans with modest registered savings or a large TFSA.',
  },
  fill_brackets: {
    title: 'Fill lower brackets first',
    short: 'Each year, top each spouse’s income up to a level from RRSP/RRIF and LIF.',
    what: 'Each year, each spouse’s taxable income is topped up to the chosen level from their RRSP/RRIF, then LIF, even when spending doesn’t need the money. What isn’t needed goes to the TFSA, then non-registered savings.',
    effect:
      'Registered money is taxed earlier, at lower rates, which can lower the tax on later minimums and on the final return.',
    pros: ['Can smooth taxable income over the years', 'Can shrink the final return’s tax'],
    cons: [
      'Pays some tax earlier than needed',
      'Money moved out is taxed every year in non-registered savings once TFSA room is used',
    ],
    whenItFits:
      'Under these assumptions it tends to suit plans with large registered savings and low income in the early years.',
    choosing:
      'The level is either the top of the first federal bracket or just under the OAS clawback threshold. Both follow the rule values in Settings.',
  },
  early_rrsp: {
    title: 'Early RRSP drawdown',
    short: 'Draw RRSP/RRIF and LIF money first while CPP and OAS haven’t started.',
    what: 'In the draw-down years (until both spouses’ CPP and OAS have started), spending comes from RRSP/RRIF and LIF first, from the spouse with the lower income. After that, it follows “Registered last”.',
    effect:
      'Bridges the years before delayed CPP and OAS with registered money, which can lower registered balances and later minimums.',
    pros: [
      'Pairs with delaying CPP and OAS, which pay more for life',
      'Uses low-income years to draw taxable money',
    ],
    cons: [
      'Draws down savings faster in the early years',
      'Has no effect when CPP and OAS start at or before retirement',
    ],
    whenItFits:
      'Under these assumptions it tends to suit plans that retire early and delay CPP or OAS.',
    choosing:
      'The draw-down years follow the CPP and OAS start ages, set under “When to start CPP and OAS” above.',
  },
};

export const SHAPES: Record<ShapeId, { title: string; text: string }> = {
  steady: { title: 'Keep my mix', text: 'The stock share stays as it is today.' },
  gradual_shift: {
    title: 'Get safer gradually',
    text: 'More stocks before retirement, then a gradual shift to bonds and cash.',
  },
  safety_first_regrow: {
    title: 'Safer around retirement',
    text: 'Fewer stocks around retirement, then back to today’s mix later.',
  },
};

export const PRESETS: Record<PresetId, { title: string; text: string }> = {
  bonds_sheltered_first: {
    title: 'Bonds sheltered first',
    text: 'Bonds and cash go in RRSP/RRIF and LIF accounts first; foreign stocks in the TFSA; Canadian stocks in non-registered accounts.',
  },
  growth_tax_free_first: {
    title: 'Growth tax-free first',
    text: 'Foreign stocks go in the TFSA first; bonds and cash in registered accounts; Canadian stocks in non-registered accounts.',
  },
};

export const FACE_VALUE_NOTE =
  'The mix is counted at face value, so part of a placement’s benefit can come from holding more stocks once tax on registered withdrawals is taken into account.';

/** The sentence explaining a comparison whose tax and legacy move in opposite directions. */
export const OPPOSITE_DIRECTIONS =
  'Under these assumptions, lower lifetime tax comes with a smaller after-tax legacy here (or the reverse), mostly because of when tax is paid and how long money grows untaxed.';
