// Account-state builders for stage 2 tests. Not a test file.
import { ASSET_CLASSES, type AssetClass } from '../../../src/engine/config/keys';
import type {
  AccountState,
  EngineAccountType,
  Owner,
  SpouseYearState,
} from '../../../src/engine/types';

/** An account holding the given values by class (cost = value unless given). */
export function account(
  id: string,
  type: EngineAccountType,
  owner: Owner,
  values: Partial<Record<AssetClass, number>>,
  costs: Partial<Record<AssetClass, number>> = {},
  extra: Partial<AccountState> = {},
): AccountState {
  const holdings = {} as AccountState['holdings'];
  for (const c of ASSET_CLASSES) {
    const v = values[c] ?? 0;
    holdings[c] = { valueNom: v, costNom: costs[c] ?? v };
  }
  return { id, owner, type, holdings, ...extra };
}

export function spouseState(extra: Partial<SpouseYearState> = {}): SpouseYearState {
  return {
    alive: true,
    age: 70,
    working: false,
    carriedLossNom: 0,
    tfsaRoomNom: 0,
    tfsaWithdrawnThisYearNom: 0,
    ...extra,
  };
}
