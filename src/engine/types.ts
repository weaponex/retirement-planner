// Engine data contracts (design: Data contracts). Money fields ending in `Today`
// are in today's dollars; fields ending in `Nom` are in future dollars.
import type { AssetClass } from './config/keys';
import type { Config } from './config/load';

export type { AssetClass };

/** Everything an engine function needs to read and index rule values for one year. */
export interface YearContext {
  /** Years after the plan's start year (0 in the start year). */
  yearIndex: number;
  /** Inflation factor for a year index: (1 + inflation)^t. */
  deflator: (yearIndex: number) => number;
  cfg: Config;
}

/**
 * One person's income for one year's return, after any pension split, in
 * future dollars.
 *
 * - `pensionEligible`: income that gets the pension credit: DB payments at any
 *   age, RRIF/LIF payments when the owner is 65 or older.
 * - `otherOrdinary`: RRSP and LIRA withdrawals, RRIF/LIF before 65, interest.
 * - `eligibleDividends`: the cash amount received; the tax code grosses it up.
 * - `foreignDividends`: received in a non-registered account; taxed as
 *   ordinary income.
 * - `capitalGains`: the full realized gain; the tax code applies the
 *   inclusion rate.
 */
export interface TaxableIncome {
  pensionEligible: number;
  oas: number;
  cpp: number;
  otherOrdinary: number;
  eligibleDividends: number;
  foreignDividends: number;
  capitalGains: number;
}

export type Owner = 0 | 1;
export type StrategyId = 'registered_last' | 'fill_brackets' | 'early_rrsp' | 'planner_pick';
export type BracketLevel = 'first_bracket' | 'oas_threshold';
export type PlannerGoal = 'most_left' | 'least_tax';
export type MixId = 'conservative' | 'balanced' | 'growth' | 'custom';
export type ShapeId = 'steady' | 'gradual_shift' | 'safety_first_regrow';
export type PresetId = 'bonds_sheltered_first' | 'growth_tax_free_first';
export type FeeLevel = 'index_etf' | 'robo' | 'advisor' | 'custom';
export type AccountType = 'rrsp' | 'lira' | 'tfsa' | 'nonreg';

export interface SpouseInput {
  birthYear: number;
  birthMonth: number;
  sexAtBirth: 'F' | 'M';
  retirementYear: number;
  lifeExpectancyTarget: number;
  /** Monthly estimate at 65, as My Service Canada shows it. */
  cppAt65Today: number;
  cppStartAge: number;
  oasStartAge: number;
  yearsInCanadaAt65: number;
  workingMarginalRate: number;
  /** Used while still working after the first retirement. */
  afterTaxPayToday: number;
}

export interface PositionInput {
  valueToday: number;
  originalCostToday: number;
}

export interface AccountInput {
  /** '<type>-<owner>-<n>', for example 'rrsp-0-1'. */
  id: string;
  owner: Owner;
  type: AccountType;
  balanceToday: number;
  annualContributionToday: number;
  /** Non-registered only: the first rebalance sells positions and realizes gains. */
  positions?: Partial<Record<AssetClass, PositionInput>>;
  /** TFSA only. */
  tfsaRoomToday?: number;
  /** RRSP to RRIF, LIRA to LIF. */
  conversionAge?: number;
  /** LIRA only. */
  lifUnlock50?: boolean;
}

export interface DbPensionInput {
  owner: Owner;
  lifetimeAnnualToday: number;
  startAge: number;
  bridgeAnnualToday?: number;
  bridgeEndAge?: number;
  indexing: 'full' | 'fixed' | 'none';
  indexRate?: number;
  survivorPct: number;
}

export interface SpendingCategoryInput {
  monthlyToday: number;
  /** Slower and later phase overrides; null means use keepPct. */
  laterOverrideToday?: [number | null, number | null];
}

export interface SpendingPhase {
  /** Counts from the first retirement. */
  fromYear: number;
  /** Percent of the active amount kept. */
  keepPct: number;
}

export interface PlanInputs {
  schemaVersion: 1;
  planStartYear: number;
  spouses: [SpouseInput, SpouseInput];
  accounts: AccountInput[];
  dbPensions: DbPensionInput[];
  spending: {
    mode: 'by_category' | 'one_total';
    monthlyTotalToday: number;
    categories: Record<string, SpendingCategoryInput>;
    /** Slower, later. */
    phases: [SpendingPhase, SpendingPhase];
  };
  estate: { survivorPct: number; legacyGoalToday: number; homeValueToday?: number };
  investing: {
    mixId: MixId;
    /** Whole numbers summing to 100. */
    mix: Record<AssetClass, number>;
    shapeId: ShapeId;
    presetId: PresetId;
    rebalance: boolean;
    returnOverride?: Partial<Record<AssetClass, number>>;
    feeLevel: FeeLevel;
    customFee?: number;
  };
  withdrawal: {
    strategyId: StrategyId;
    bracketLevel: BracketLevel;
    plannerGoal: PlannerGoal;
  };
  /** From Settings: a rule-value key to a value of the same kind and unit. */
  ruleOverrides?: Record<string, unknown>;
}

export interface SpouseYear {
  age: number;
  alive: boolean;
  cppNom: number;
  oasNom: number;
  dbNom: number;
  payNom: number;
  withdrawals: Record<string, number>;
  taxableIncomeNom: number;
  taxNom: number;
  clawbackNom: number;
  splitShare: number;
}

export interface YearRow {
  year: number;
  spouse: [SpouseYear, SpouseYear];
  balancesEndNom: Record<string, number>;
  realizedGainsNom: number;
  spendNeedNom: number;
  afterTaxCashNom: number;
  surplusNom: number;
  shortfallNom: number;
}

export interface PlanSummary {
  spendingCovered: boolean;
  firstShortfallYear?: number;
  totalShortfallNom: number;
  lifetimeTaxNom: number;
  afterTaxLegacyNom: number;
  clawbackYears: number;
  savedToTfsaNom: number;
  warningFacts: Record<string, unknown>;
}

export interface IncomeBySourceNom {
  work: number;
  db: number;
  cpp: number;
  oas: number;
  registered: number;
  nonreg: number;
  tfsa: number;
}

export interface StrategyResult {
  strategyId: StrategyId;
  summary: PlanSummary;
  /** planner_pick only. */
  pickedOption?: string;
  runnerUp?: string;
  gapNom?: number;
  rows: {
    year: number;
    incomeBySourceNom: IncomeBySourceNom;
    taxNom: number;
    clawbackNom: number;
    savedToTfsaNom: number;
    spendNeedNom: number;
  }[];
}
