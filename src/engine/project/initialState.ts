// The first year's state (design file 34): RRSP, LIRA and TFSA balances placed
// by the preset; non-registered accounts from their entered positions and
// costs; each spouse's TFSA room from the sum of their entered room; an account
// whose owner is already past its conversion age starts converted, opened the
// year before, so its minimum applies from the first year.
import { ASSET_CLASSES, type AssetClass } from '../config/keys';
import { conversionAgeFor } from '../accounts/rrspRrif';
import { mixForYear } from '../invest/glide';
import { targetHoldings } from '../invest/placement';
import { emptyHoldings, holdingsAt, type Weights } from '../invest/rebalance';
import type {
  AccountState,
  MixId,
  NormalizedAccount,
  NormalizedInputs,
  Owner,
  PlanState,
  SpouseYearState,
  Variant,
  YearContext,
} from '../types';
import { firstRetirementYear, nextAccountId, spouseForYear } from '../solver/startOfYear';

/** This year's overall mix from the user's mix and shape (fractions). */
export function yearMix(inputs: NormalizedInputs, year: number, ctx: YearContext): Weights {
  return accountYearMix(inputs, {}, year, ctx);
}

/**
 * This year's mix for one account (AR-S3): its own mix, or the household's
 * when it has none, moved along the household's shape.
 */
export function accountYearMix(
  inputs: NormalizedInputs,
  account: { mix?: Record<AssetClass, number> | undefined; mixId?: MixId | undefined },
  year: number,
  ctx: YearContext,
): Weights {
  const retire = firstRetirementYear(inputs);
  const inv = inputs.investing;
  return mixForYear(
    account.mix ?? inv.mix,
    account.mixId ?? inv.mixId,
    inv.shapeId,
    year - retire,
    inputs.planStartYear - retire,
    ctx.cfg,
  );
}

/** Each account's mix this year, keyed by the account. */
export function mixOfFor(
  inputs: NormalizedInputs,
  year: number,
  ctx: YearContext,
): (a: { mix?: Record<AssetClass, number> | undefined; mixId?: MixId | undefined }) => Weights {
  const household = yearMix(inputs, year, ctx);
  if (inputs.investing.presetId !== 'own_mix') return () => household;
  const cache = new Map<string, Weights>();
  return (a) => {
    if (!a.mix) return household;
    const key = JSON.stringify(a.mix) + (a.mixId ?? '');
    let w = cache.get(key);
    if (!w) {
      w = accountYearMix(inputs, a, year, ctx);
      cache.set(key, w);
    }
    return w;
  };
}

function startAccount(
  a: NormalizedAccount,
  ownerAge: number,
  mix: Weights,
  year: number,
  ctx: YearContext,
): AccountState {
  const base: AccountState = {
    id: a.id,
    owner: a.owner,
    type: a.type,
    holdings: emptyHoldings(),
    ...(a.conversionAge !== undefined && { conversionAge: a.conversionAge }),
    ...(a.lifUnlock50 !== undefined && { lifUnlock50: a.lifUnlock50 }),
    ...(a.mixId !== undefined && { mixId: a.mixId }),
    ...(a.mix !== undefined && { mix: a.mix }),
  };
  if (a.type === 'nonreg') {
    const holdings = emptyHoldings();
    let placed = 0;
    for (const cls of ASSET_CLASSES) {
      const p = a.positions?.[cls];
      if (!p) continue;
      holdings[cls] = { valueNom: p.valueNom, costNom: p.costNom };
      placed += p.valueNom;
    }
    // A balance with no positions is held in its mix, at its original cost when
    // given (spread like the value), otherwise at cost.
    const rest = Math.max(0, a.balanceNom - placed);
    if (placed === 0 && rest > 0) {
      const h = holdingsAt(rest, mix);
      if (a.originalCostNom !== undefined) {
        const ratio = a.originalCostNom / rest;
        for (const cls of ASSET_CLASSES) h[cls] = { ...h[cls], costNom: h[cls].valueNom * ratio };
      }
      return { ...base, holdings: h };
    }
    return { ...base, holdings };
  }
  // Placed later by targetHoldings; held as one amount until then.
  const converted =
    (a.type === 'rrsp' || a.type === 'lira') && ownerAge > conversionAgeFor(base, ctx);
  return {
    ...base,
    holdings: holdingsAt(a.balanceNom, mix),
    ...(converted && {
      type: a.type === 'rrsp' ? ('rrif' as const) : ('lif' as const),
      openedYear: year - 1,
    }),
  };
}

export function initialState(
  inputs: NormalizedInputs,
  ctx: YearContext,
  variant: Variant,
): PlanState {
  const year = inputs.planStartYear;
  const mix = yearMix(inputs, year, ctx);
  const blank: SpouseYearState = {
    alive: true,
    age: 0,
    working: false,
    carriedLossNom: 0,
    tfsaRoomNom: 0,
    tfsaWithdrawnThisYearNom: 0,
  };
  const spouses = ([0, 1] as Owner[]).map((o) => ({
    ...spouseForYear(blank, inputs, o, year),
    tfsaRoomNom: inputs.accounts
      .filter((a) => a.type === 'tfsa' && a.owner === o)
      .reduce((s, a) => s + (a.tfsaRoomNom ?? 0), 0),
  })) as PlanState['spouses'];

  const mixOf = mixOfFor(inputs, year, ctx);
  let accounts = inputs.accounts.map((a) =>
    startAccount(a, spouses[a.owner].age, mixOf(a), year, ctx),
  );
  // Every spouse has a non-registered account, so a surplus always has somewhere to go.
  for (const o of [0, 1] as Owner[]) {
    if (!accounts.some((a) => a.type === 'nonreg' && a.owner === o)) {
      accounts.push({
        id: nextAccountId(accounts, 'nonreg', o),
        owner: o,
        type: 'nonreg',
        holdings: emptyHoldings(),
      });
    }
  }
  // Registered accounts and TFSAs are placed by the preset (non-registered
  // accounts keep their positions until the first rebalance).
  const targets = targetHoldings(accounts, mix, variant.presetId, ctx.cfg, mixOf);
  accounts = accounts.map((a) => {
    if (a.type === 'nonreg') return a;
    const t = targets[a.id]!;
    const holdings = emptyHoldings();
    for (const cls of ASSET_CLASSES) holdings[cls] = { valueNom: t[cls], costNom: t[cls] };
    return { ...a, holdings };
  });

  return {
    year,
    yearIndex: 0,
    spouses,
    accounts,
    // The first year starts from no split; the search then finds the best one.
    splitShare: { from: 0, share: 0 },
  };
}
