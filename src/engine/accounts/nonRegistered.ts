// Non-registered accounts and the sheltered-yield rule (design: Accounts;
// Yields inside sheltered accounts, M15; Capital losses, FR-M5). Positions are
// pooled per class at original cost; sales are spread across positions in
// proportion, at average cost.
import { ASSET_CLASSES } from '../config/keys';
import { planValue } from '../config/read';
import type { ClassReturns } from '../invest/returns';
import { sellProRataHoldings } from '../invest/rebalance';
import type { AccountState, YearContext } from '../types';

export interface Sale {
  account: AccountState;
  cash: number;
  /** Negative for a loss. */
  realizedGain: number;
}

/** Sells `amount` across the account's positions in proportion, at average cost. */
export function sellProRata(account: AccountState, amount: number): Sale {
  const { holdings, realizedGain } = sellProRataHoldings(account.holdings, amount);
  return { account: { ...account, holdings }, cash: amount, realizedGain };
}

export interface CashYield {
  interest: number;
  eligibleDividends: number;
  foreignDividends: number;
  total: number;
}

/** Interest and dividends paid on the start-of-year balance, by income type. */
export function cashYield(account: AccountState, returns: ClassReturns): CashYield {
  const out: CashYield = { interest: 0, eligibleDividends: 0, foreignDividends: 0, total: 0 };
  for (const cls of ASSET_CLASSES) {
    const paid = account.holdings[cls].valueNom * returns[cls].yield;
    out[returns[cls].incomeType] += paid;
    out.total += paid;
  }
  return out;
}

/**
 * Applies a carried-forward loss to the year's net realized gains. A net gain
 * is reduced by the carried loss; a net loss adds to it. Losses never offset
 * other income.
 */
export function netGains(
  realized: number,
  carriedLoss: number,
): { taxableGain: number; carriedLoss: number } {
  if (realized <= 0) return { taxableGain: 0, carriedLoss: carriedLoss - realized };
  const used = Math.min(realized, carriedLoss);
  return { taxableGain: realized - used, carriedLoss: carriedLoss - used };
}

export interface ReinvestedYield {
  account: AccountState;
  /** The yield before withholding. */
  reinvested: number;
  /** Foreign withholding lost on foreign dividends (not recoverable here). */
  withholding: number;
}

/**
 * In an RRSP, RRIF, LIRA, LIF or TFSA the yield stays in the account and is
 * reinvested in the same class; foreign dividends first lose
 * `market.foreign_withholding_rate`.
 */
export function reinvestYield(
  account: AccountState,
  returns: ClassReturns,
  ctx: YearContext,
): ReinvestedYield {
  const rate = planValue(ctx.cfg, 'market.foreign_withholding_rate');
  const holdings = { ...account.holdings };
  let reinvested = 0;
  let withholding = 0;
  for (const cls of ASSET_CLASSES) {
    const gross = account.holdings[cls].valueNom * returns[cls].yield;
    const lost = returns[cls].incomeType === 'foreignDividends' ? gross * rate : 0;
    reinvested += gross;
    withholding += lost;
    const net = gross - lost;
    holdings[cls] = {
      valueNom: account.holdings[cls].valueNom + net,
      costNom: account.holdings[cls].costNom + net,
    };
  }
  return { account: { ...account, holdings }, reinvested, withholding };
}
