// Placing the household's mix across accounts (design: Placement presets,
// Filling accounts). Balances are counted at face value. Each class fills
// account groups in its preset order; the baseline holds the same mix in every
// account.
import { ASSET_CLASSES, type AssetClass } from '../config/keys';
import type { Config } from '../config/load';
import { planObject } from '../config/read';
import type { AccountState, EngineAccountType, PresetId } from '../types';
import { accountValue, type Weights } from './rebalance';

type Group = 'registered' | 'tfsa' | 'nonreg';
type Column = 'bonds' | 'global_equity' | 'cad_equity';
type Preset = Record<Column, Group[]>;

/** Classes are placed in this order. */
export const FILL_ORDER: readonly AssetClass[] = [
  'cash',
  'bonds',
  'em_equity',
  'intl_equity',
  'us_equity',
  'cad_equity',
];

/** Cash follows the bonds column; U.S., international and emerging-market stocks follow global stocks. */
const COLUMN: Record<AssetClass, Column> = {
  cash: 'bonds',
  bonds: 'bonds',
  em_equity: 'global_equity',
  intl_equity: 'global_equity',
  us_equity: 'global_equity',
  cad_equity: 'cad_equity',
};

const GROUP: Record<EngineAccountType, Group> = {
  rrsp: 'registered',
  rrif: 'registered',
  lira: 'registered',
  lif: 'registered',
  tfsa: 'tfsa',
  nonreg: 'nonreg',
};

export type Targets = Record<string, Record<AssetClass, number>>;

function emptyTarget(): Record<AssetClass, number> {
  const t = {} as Record<AssetClass, number>;
  for (const c of ASSET_CLASSES) t[c] = 0;
  return t;
}

/**
 * Target holdings by account, at face value. For each class in `FILL_ORDER`,
 * the target is its share × the household total; it fills the groups in the
 * preset's order, split within a group across both spouses' accounts in
 * proportion to each account's unassigned room; what doesn't fit moves on to
 * the next group. `same_mix` puts the overall mix in every account.
 */
export function targetHoldings(
  accounts: AccountState[],
  overallMix: Weights,
  presetId: PresetId | 'same_mix',
  cfg: Config,
  mixOf: (a: AccountState) => Weights = () => overallMix,
): Targets {
  const targets: Targets = {};
  for (const a of accounts) targets[a.id] = emptyTarget();
  if (presetId === 'same_mix' || presetId === 'own_mix') {
    // `own_mix` (AR-S3): each account holds its own mix.
    for (const a of accounts) {
      const v = accountValue(a);
      const m = presetId === 'own_mix' ? mixOf(a) : overallMix;
      for (const c of ASSET_CLASSES) targets[a.id]![c] = v * m[c];
    }
    return targets;
  }
  const preset = planObject<Record<Exclude<PresetId, 'own_mix'>, Preset>>(cfg, 'planning.presets')[
    presetId
  ];
  const room = new Map(accounts.map((a) => [a.id, accountValue(a)]));
  const total = [...room.values()].reduce((s, v) => s + v, 0);
  for (const cls of FILL_ORDER) {
    let left = overallMix[cls] * total;
    for (const group of preset[COLUMN[cls]]) {
      if (left <= 0) break;
      const members = accounts.filter((a) => GROUP[a.type] === group);
      const groupRoom = members.reduce((s, a) => s + room.get(a.id)!, 0);
      if (groupRoom <= 0) continue;
      const placed = Math.min(left, groupRoom);
      for (const a of members) {
        const share = (placed * room.get(a.id)!) / groupRoom;
        targets[a.id]![cls] += share;
        room.set(a.id, room.get(a.id)! - share);
      }
      left -= placed;
    }
  }
  return targets;
}
