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
  cppAt65Today: null,
  cppStartAge: 65,
  oasStartAge: 65,
  yearsInCanadaAt65: null,
  workingMarginalRate: null,
  afterTaxPayToday: 0,
});

/** A new plan: nothing about the household yet, and the defaults for everything else. */
export function emptyPlan(cfg: Config, today: Date = new Date()): PlanDraft {
  const phases = planObject<[SpendingPhase, SpendingPhase]>(cfg, 'planning.spending_phases');
  return {
    schemaVersion: 1,
    planStartYear: today.getFullYear(),
    spouses: [emptySpouse('Spouse 1'), emptySpouse('Spouse 2')],
    accounts: [],
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
      presetId: 'bonds_sheltered_first',
      rebalance: true,
      feeLevel: 'index_etf',
    },
    withdrawal: { strategyId: 'registered_last', bracketLevel: 'first_bracket' },
    ruleOverrides: {},
  };
}
