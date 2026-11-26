// The empty plan and the defaults the store fills in (design file 42; Design
// values, Other defaults). Planning values come from the config.
import { ASSET_CLASSES, type AssetClass } from '../engine/config/keys';
import type { Config } from '../engine/config/load';
import { planObject, planValue } from '../engine/config/read';
import type { SpendingPhase } from '../engine/types';
import { CATEGORY_IDS } from './categories';
import type { PlanDraft } from './draft';

const PERCENT = 100;

/**
 * FP Canada's 25%-survival age for this sex at this age: the table row at or
 * below the age (the first row below the table, the last row above it), and
 * never below age + 1.
 */
export function defaultLifeExpectancy(sex: 'F' | 'M', age: number, cfg: Config): number {
  const key = sex === 'F' ? 'planning.life_expectancy.female' : 'planning.life_expectancy.male';
  const rows = Object.entries(planObject<Record<string, number>>(cfg, key))
    .map(([a, v]) => [Number(a), v] as const)
    .sort((x, y) => x[0] - y[0]);
  let value = rows[0]![1];
  for (const [rowAge, v] of rows) if (rowAge <= age) value = v;
  return Math.max(value, age + 1);
}

/** A starting mix from `planning.mixes`, in whole percent. */
export function startingMix(
  mixId: 'conservative' | 'balanced' | 'growth',
  cfg: Config,
): Record<AssetClass, number> {
  const mixes = planObject<Record<string, Record<AssetClass, number>>>(cfg, 'planning.mixes');
  return Object.fromEntries(ASSET_CLASSES.map((c) => [c, mixes[mixId]![c]])) as Record<
    AssetClass,
    number
  >;
}

const emptySpouse = (name: string): PlanDraft['spouses'][number] => ({
  name,
  birthYear: null,
  birthMonth: null,
  sexAtBirth: null,
  retirementYear: null,
  lifeExpectancyTarget: null,
  // Empty means the default: the average CPP at 65, moved to the start age (AR-H2).
  cppAtStartToday: null,
  // 70 for both (AR-W2).
  cppStartAge: 70,
  oasStartAge: 70,
  // Empty means born in Canada (AR-H4).
  arrivedInCanadaYear: null,
  grossPayToday: null,
});

/** The account types every new plan starts with, for each spouse (AR-S2). */
export const STARTING_ACCOUNT_TYPES = ['rrsp', 'tfsa', 'lira', 'nonreg'] as const;

/** A new account: no balance yet, Balanced, converting at the latest age (AR-S4). */
export function newAccount(
  type: 'rrsp' | 'lira' | 'tfsa' | 'nonreg',
  owner: 0 | 1,
  id: string,
  cfg: Config,
): PlanDraft['accounts'][number] {
  return {
    id,
    owner,
    type,
    balanceToday: 0,
    annualContributionToday: 0,
    mixId: 'balanced',
    mix: startingMix('balanced', cfg),
    ...(type === 'tfsa' && { tfsaRoomToday: 0 }),
    ...((type === 'rrsp' || type === 'lira') && {
      conversionAge: planValue(cfg, 'federal.rrif.latest_conversion_age'),
    }),
    ...(type === 'lira' && { lifUnlock50: false }),
  };
}

/** A new plan: nothing about the household yet, and the defaults for everything else. */
export function emptyPlan(cfg: Config, today: Date = new Date()): PlanDraft {
  const phases = planObject<[SpendingPhase, SpendingPhase]>(cfg, 'planning.spending_phases');
  return {
    schemaVersion: 1,
    planStartYear: today.getFullYear(),
    spouses: [emptySpouse('Spouse 1'), emptySpouse('Spouse 2')],
    accounts: ([0, 1] as const).flatMap((o) =>
      STARTING_ACCOUNT_TYPES.map((t) => newAccount(t, o, `${t}-${o}-1`, cfg)),
    ),
    dbPensions: [],
    spending: {
      mode: 'by_category',
      monthlyTotalToday: null,
      categories: Object.fromEntries(CATEGORY_IDS.map((id) => [id, { monthlyToday: 0 }])),
      phases: [{ ...phases[0] }, { ...phases[1] }],
    },
    estate: {
      survivorPct: Math.round(planValue(cfg, 'planning.survivor_spending') * PERCENT),
      legacyGoalToday: 0,
    },
    investing: {
      mixId: 'balanced',
      mix: startingMix('balanced', cfg),
      shapeId: 'steady',
      presetId: 'own_mix',
      rebalance: true,
      feeLevel: 'index_etf',
    },
    withdrawal: { strategyId: 'registered_last', bracketLevel: 'first_bracket' },
    ruleOverrides: {},
  };
}
