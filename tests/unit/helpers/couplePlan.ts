// Shared stage 2 helper: a minimal made-up couple and a year context built from
// the bundle. Not a test file. No rule value is typed in here; the plan's
// numbers are a made-up household.
import { loadConfig, rebaseConfig, type Config } from '../../../src/engine/config/load';
import { ontario } from '../../../src/engine/jurisdiction/ontario';
import { makeDeflator, normalizeInputs } from '../../../src/engine/units';
import type {
  NormalizedInputs,
  PlanInputs,
  TaxableIncome,
  YearContext,
} from '../../../src/engine/types';

export const START_YEAR = 2026;

/** Two retired spouses, 65 and 63 in the start year, with every account type. */
export function couplePlan(overrides: Partial<PlanInputs> = {}): PlanInputs {
  return {
    schemaVersion: 1,
    planStartYear: START_YEAR,
    spouses: [
      {
        name: 'Alex',
        birthYear: 1961,
        birthMonth: 4,
        sexAtBirth: 'M',
        retirementYear: 2026,
        lifeExpectancyTarget: 92,
        cppAt65Today: 1000,
        cppStartAge: 65,
        oasStartAge: 65,
        yearsInCanadaAt65: 40,
        workingMarginalRate: 0.3,
        afterTaxPayToday: 0,
      },
      {
        name: 'Sam',
        birthYear: 1963,
        birthMonth: 9,
        sexAtBirth: 'F',
        retirementYear: 2026,
        lifeExpectancyTarget: 95,
        cppAt65Today: 700,
        cppStartAge: 65,
        oasStartAge: 65,
        yearsInCanadaAt65: 40,
        workingMarginalRate: 0.3,
        afterTaxPayToday: 0,
      },
    ],
    accounts: [
      {
        id: 'rrsp-0-1',
        owner: 0,
        type: 'rrsp',
        balanceToday: 400_000,
        annualContributionToday: 0,
        conversionAge: 71,
      },
      {
        id: 'rrsp-1-1',
        owner: 1,
        type: 'rrsp',
        balanceToday: 250_000,
        annualContributionToday: 0,
        conversionAge: 71,
      },
      {
        id: 'lira-0-1',
        owner: 0,
        type: 'lira',
        balanceToday: 100_000,
        annualContributionToday: 0,
        conversionAge: 66,
        lifUnlock50: false,
      },
      {
        id: 'tfsa-0-1',
        owner: 0,
        type: 'tfsa',
        balanceToday: 90_000,
        annualContributionToday: 0,
        tfsaRoomToday: 10_000,
      },
      {
        id: 'tfsa-1-1',
        owner: 1,
        type: 'tfsa',
        balanceToday: 80_000,
        annualContributionToday: 0,
        tfsaRoomToday: 15_000,
      },
      {
        id: 'nonreg-0-1',
        owner: 0,
        type: 'nonreg',
        balanceToday: 150_000,
        annualContributionToday: 0,
        positions: {
          cad_equity: { valueToday: 90_000, originalCostToday: 60_000 },
          bonds: { valueToday: 60_000, originalCostToday: 62_000 },
        },
      },
    ],
    dbPensions: [],
    spending: {
      mode: 'one_total',
      monthlyTotalToday: 5_000,
      categories: {},
      phases: [
        { fromYear: 10, keepPct: 90 },
        { fromYear: 20, keepPct: 80 },
      ],
    },
    estate: { survivorPct: 70, legacyGoalToday: 0 },
    investing: {
      mixId: 'balanced',
      mix: { cad_equity: 20, us_equity: 25, intl_equity: 10, em_equity: 5, bonds: 35, cash: 5 },
      shapeId: 'steady',
      presetId: 'bonds_sheltered_first',
      rebalance: true,
      feeLevel: 'index_etf',
    },
    withdrawal: {
      strategyId: 'registered_last',
      bracketLevel: 'first_bracket',
    },
    ...overrides,
  };
}

/** The bundled config, rebased to the helper plan's start year. */
export function planConfig(startYear = START_YEAR): Config {
  return rebaseConfig(loadConfig(), startYear);
}

export function normalized(plan: PlanInputs = couplePlan()): NormalizedInputs {
  return normalizeInputs(plan, planConfig(plan.planStartYear));
}

/** A year context for the helper plan's config, with the config's own inflation. */
export function yearContext(yearIndex = 0, cfg: Config = planConfig()): YearContext {
  return { yearIndex, deflator: makeDeflator(cfg), cfg, jurisdiction: ontario };
}

export const zeroIncome = (): TaxableIncome => ({
  pensionEligible: 0,
  oas: 0,
  cpp: 0,
  otherOrdinary: 0,
  eligibleDividends: 0,
  foreignDividends: 0,
  capitalGains: 0,
});

/** The raw value of a key in a config, before any indexing. */
export function valueOf<T>(cfg: Config, key: string): T {
  const entry = cfg.entries.get(key);
  if (!entry || entry.value === null) throw new Error(`no value for ${key}`);
  return entry.value as T;
}
