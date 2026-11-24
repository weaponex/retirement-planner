// Holdings arithmetic and the yearly rebalance (design: Placement, Yearly
// rebalance). Moves inside registered accounts and the TFSA are tax-free; sales
// in non-registered accounts realize gains at average cost.
import { ASSET_CLASSES, type AssetClass } from '../config/keys';
import type { AccountState, Owner, PositionState } from '../types';

export type Holdings = Record<AssetClass, PositionState>;
export type Weights = Record<AssetClass, number>;

export function emptyHoldings(): Holdings {
  const h = {} as Holdings;
  for (const cls of ASSET_CLASSES) h[cls] = { valueNom: 0, costNom: 0 };
  return h;
}

export function holdingsValue(h: Holdings): number {
  return ASSET_CLASSES.reduce((sum, cls) => sum + h[cls].valueNom, 0);
}

export function accountValue(a: AccountState): number {
  return holdingsValue(a.holdings);
}

/** The account's current class weights; an empty account uses `fallback`. */
export function currentWeights(h: Holdings, fallback: Weights): Weights {
  const total = holdingsValue(h);
  if (total <= 0) return fallback;
  const w = {} as Weights;
  for (const cls of ASSET_CLASSES) w[cls] = h[cls].valueNom / total;
  return w;
}

/** Holdings of `amount` spread by `weights`, at cost (a purchase). */
export function holdingsAt(amount: number, weights: Weights): Holdings {
  const h = emptyHoldings();
  for (const cls of ASSET_CLASSES) {
    const v = amount * weights[cls];
    h[cls] = { valueNom: v, costNom: v };
  }
  return h;
}

/** Adds a purchase of `amount` spread by `weights`; cost rises by what was paid. */
export function buy(h: Holdings, amount: number, weights: Weights): Holdings {
  const out = emptyHoldings();
  for (const cls of ASSET_CLASSES) {
    const v = amount * weights[cls];
    out[cls] = { valueNom: h[cls].valueNom + v, costNom: h[cls].costNom + v };
  }
  return out;
}

/**
 * Sells `amount` in proportion to current values, at average cost: each class
 * gives up the same share of its value and of its cost. Returns the new
 * holdings and the realized gain (negative for a loss).
 */
export function sellProRataHoldings(
  h: Holdings,
  amount: number,
): { holdings: Holdings; realizedGain: number } {
  const total = holdingsValue(h);
  if (amount <= 0 || total <= 0) return { holdings: h, realizedGain: 0 };
  const share = Math.min(1, amount / total);
  const out = emptyHoldings();
  let gain = 0;
  for (const cls of ASSET_CLASSES) {
    const sold = h[cls].valueNom * share;
    const costOut = h[cls].costNom * share;
    gain += sold - costOut;
    out[cls] = { valueNom: h[cls].valueNom - sold, costNom: h[cls].costNom - costOut };
  }
  return { holdings: out, realizedGain: gain };
}

/**
 * Moves an account to its target values by class. In a non-registered account,
 * a class that shrinks is sold at average cost (realizing a gain or loss) and a
 * class that grows is bought at cost.
 */
export function rebalanceAccount(
  a: AccountState,
  target: Record<AssetClass, number>,
): { account: AccountState; realizedGain: number } {
  const out = emptyHoldings();
  let gain = 0;
  for (const cls of ASSET_CLASSES) {
    const { valueNom, costNom } = a.holdings[cls];
    const want = target[cls];
    if (want < valueNom) {
      const costOut = valueNom > 0 ? costNom * ((valueNom - want) / valueNom) : 0;
      gain += valueNom - want - costOut;
      out[cls] = { valueNom: want, costNom: costNom - costOut };
    } else {
      out[cls] = { valueNom: want, costNom: costNom + (want - valueNom) };
    }
  }
  return {
    account: { ...a, holdings: out },
    realizedGain: a.type === 'nonreg' ? gain : 0,
  };
}

/**
 * Rebalances every account to its target holdings. Returns the new accounts and
 * the gains realized in non-registered accounts, by owner (this year's taxable
 * income, `YearRow.spouse[i].realizedGainsNom`).
 */
export function rebalance(
  accounts: AccountState[],
  targets: Record<string, Record<AssetClass, number>>,
): { accounts: AccountState[]; realizedGains: [number, number] } {
  const gains: [number, number] = [0, 0];
  const next = accounts.map((a) => {
    const target = targets[a.id];
    if (!target) return a;
    const { account, realizedGain } = rebalanceAccount(a, target);
    gains[a.owner as Owner] += realizedGain;
    return account;
  });
  return { accounts: next, realizedGains: gains };
}
