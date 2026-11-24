// Engine data contracts (design: Data contracts). Money fields ending in `Today`
// are in today's dollars; fields ending in `Nom` are in future dollars.
// This file declares shapes only.
import type { AssetClass } from './config/keys';
import type { Config } from './config/load';
import type { Jurisdiction } from './jurisdiction/types';

export type { AssetClass };

/** Everything an engine function needs to read and index rule values for one year. */
export interface YearContext {
  /** Years after the plan's start year (0 in the start year). */
  yearIndex: number;
  /** Inflation factor for a year index: (1 + inflation)^t, counting from the plan start. */
  deflator: (yearIndex: number) => number;
  /** Rule values after overrides and `rebaseConfig`. */
  cfg: Config;
  jurisdiction: Jurisdiction;
}

/**
 * One person's income for one year's return, after any pension split, in
 * future dollars.
 *
 * - `pensionEligible`: income that gets the pension credit: DB payments at any
 *   age, RRIF/LIF payments when the owner is at least
 *   `federal.credits.pension.min_age_rrif`.
 * - `otherOrdinary`: RRSP and LIRA withdrawals, RRIF/LIF below that age, interest.
 * - `eligibleDividends`: the cash amount received; the tax code grosses it up.
 * - `foreignDividends`: received in a non-registered account; taxed as
 *   ordinary income.
 * - `capitalGains`: the full realized gain, after same-year losses and any
 *   carried-forward loss; the tax code applies the inclusion rate.
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
export type StrategyId = 'registered_last' | 'fill_brackets' | 'early_rrsp';
export type BracketLevel = 'first_bracket' | 'oas_threshold';
export type MixId = 'conservative' | 'balanced' | 'growth' | 'custom';
export type ShapeId = 'steady' | 'gradual_shift' | 'safety_first_regrow';
export type PresetId = 'bonds_sheltered_first' | 'growth_tax_free_first';
export type FeeLevel = 'index_etf' | 'robo' | 'advisor' | 'custom';
export type AccountType = 'rrsp' | 'lira' | 'tfsa' | 'nonreg';
/** Account types inside the engine: an RRSP converts to a RRIF and a LIRA to a LIF. */
export type EngineAccountType = 'rrsp' | 'rrif' | 'lira' | 'lif' | 'tfsa' | 'nonreg';
export type DbIndexing = 'full' | 'fixed' | 'none';

/** A rule-value override from Settings, in the key's published unit and its default's tax-year dollars. */
export type RuleOverrides = Record<string, { value: unknown; defaultTaxYear: number }>;

// ---------------------------------------------------------------- plan inputs

export interface SpouseInput {
  /** Shown on the Household tab. */
  name: string;
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
  /** Today's dollars with `full` indexing; the nominal statement amount otherwise. */
  lifetimeAnnualToday: number;
  startAge: number;
  bridgeAnnualToday?: number;
  bridgeEndAge?: number;
  indexing: DbIndexing;
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

export interface InvestingInputs {
  mixId: MixId;
  /** Whole numbers summing to 100. */
  mix: Record<AssetClass, number>;
  shapeId: ShapeId;
  presetId: PresetId;
  rebalance: boolean;
  returnOverride?: Partial<Record<AssetClass, number>>;
  feeLevel: FeeLevel;
  customFee?: number;
}

export interface WithdrawalInputs {
  strategyId: StrategyId;
  bracketLevel: BracketLevel;
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
  investing: InvestingInputs;
  withdrawal: WithdrawalInputs;
  /** From Settings. */
  ruleOverrides?: RuleOverrides;
}

// ---------------------------------------------------------- normalized inputs
// PlanInputs with every …Today field replaced by …Nom at the plan start
// (`normalizeInputs` in units.ts). Rule overrides are already applied to the config.

export interface NormalizedSpouse {
  birthYear: number;
  birthMonth: number;
  sexAtBirth: 'F' | 'M';
  retirementYear: number;
  lifeExpectancyTarget: number;
  /** Monthly estimate at 65. */
  cppAt65Nom: number;
  cppStartAge: number;
  oasStartAge: number;
  yearsInCanadaAt65: number;
  workingMarginalRate: number;
  afterTaxPayNom: number;
}

export interface NormalizedPosition {
  valueNom: number;
  costNom: number;
}

export interface NormalizedAccount {
  id: string;
  owner: Owner;
  type: AccountType;
  balanceNom: number;
  annualContributionNom: number;
  positions?: Partial<Record<AssetClass, NormalizedPosition>>;
  tfsaRoomNom?: number;
  conversionAge?: number;
  lifUnlock50?: boolean;
}

export interface NormalizedDbPension {
  owner: Owner;
  lifetimeAnnualNom: number;
  startAge: number;
  bridgeAnnualNom?: number;
  bridgeEndAge?: number;
  indexing: DbIndexing;
  indexRate?: number;
  survivorPct: number;
}

export interface NormalizedInputs {
  planStartYear: number;
  spouses: [NormalizedSpouse, NormalizedSpouse];
  accounts: NormalizedAccount[];
  dbPensions: NormalizedDbPension[];
  spending: {
    mode: 'by_category' | 'one_total';
    monthlyTotalNom: number;
    categories: Record<
      string,
      { monthlyNom: number; laterOverrideNom?: [number | null, number | null] }
    >;
    phases: [SpendingPhase, SpendingPhase];
  };
  estate: { survivorPct: number; legacyGoalNom: number; homeValueNom?: number };
  investing: InvestingInputs;
  withdrawal: WithdrawalInputs;
}

// ---------------------------------------------------------------- engine state

export interface PositionState {
  valueNom: number;
  /** Original cost; used for non-registered accounts only. */
  costNom: number;
}

export interface AccountState {
  id: string;
  owner: Owner;
  type: EngineAccountType;
  holdings: Record<AssetClass, PositionState>;
  /** The age the user chose for conversion (RRSP and LIRA). */
  conversionAge?: number;
  lifUnlock50?: boolean;
  /** RRIF/LIF: the year it opened (no minimum that year). */
  openedYear?: number;
  /** LIF: last year's investment earnings (yield plus price return, after fees). */
  lifPrevEarningsNom?: number;
}

export interface SpouseYearState {
  alive: boolean;
  age: number;
  /** Still working in this year (before their retirement year). */
  working: boolean;
  carriedLossNom: number;
  /** Room belongs to the person, shared by all their TFSAs. */
  tfsaRoomNom: number;
  /** Added back to room next January 1. */
  tfsaWithdrawnThisYearNom: number;
}

export interface SplitChoice {
  /** The transferring spouse. */
  from: Owner;
  /** Share of their eligible pension income transferred, 0 to `federal.split.max_share`. */
  share: number;
}

export interface PlanState {
  year: number;
  yearIndex: number;
  spouses: [SpouseYearState, SpouseYearState];
  accounts: AccountState[];
  splitShare: SplitChoice;
  firstDeathYear?: number;
}

export type DrawIncomeType = 'pensionEligible' | 'otherOrdinary' | 'tfsa' | 'nonregPrincipal';

export interface Draw {
  accountId: string;
  amountNom: number;
  incomeType: DrawIncomeType;
  /** Non-registered sales only (negative for a loss). */
  realizedGainNom: number;
}

export interface Variant {
  id: string;
  strategyId: StrategyId;
  presetId: PresetId | 'same_mix';
}

export interface Death {
  spouse: Owner;
  year: number;
}

export interface YearInProgress {
  state: PlanState;
  inputs: NormalizedInputs;
  /** Each spouse's taxable income so far this year, before splitting. */
  incomeSoFar: [TaxableIncome, TaxableIncome];
  /** Draws already taken this year. */
  drawsSoFar: Draw[];
}

/** What an `EngineIntegrityError` carries (design: Data contracts). */
export interface IntegrityFailure {
  year: number;
  variantId: string;
  check: string;
  before: PlanState;
  after: PlanState;
}

// --------------------------------------------------------------------- results

export interface SpouseYear {
  age: number;
  alive: boolean;
  cppNom: number;
  oasNom: number;
  dbNom: number;
  payNom: number;
  /** Gross draws by account id. */
  withdrawals: Record<string, number>;
  /** Required draws: RRIF/LIF minimums and the bracket top-up. */
  forcedDrawsNom: number;
  realizedGainsNom: number;
  /** Taxable income (line 26000) after the pension split. */
  taxableIncomeNom: number;
  /** Total tax, including the clawback. */
  taxNom: number;
  clawbackNom: number;
  /** Share of this spouse's eligible pension income moved to the other (0 if receiving). */
  splitShare: number;
}

export interface AccountYear {
  startNom: number;
  contributionsNom: number;
  depositsNom: number;
  reinvestedYieldNom: number;
  withholdingNom: number;
  priceReturnNom: number;
  drawsNom: number;
  endNom: number;
}

export interface YearRow {
  year: number;
  spouse: [SpouseYear, SpouseYear];
  accounts: Record<string, AccountYear>;
  /** Equals accounts[id].endNom. */
  balancesEndNom: Record<string, number>;
  /** Non-registered yield paid out as cash. */
  cashYieldNom: number;
  spendNeedNom: number;
  afterTaxCashNom: number;
  surplusNom: number;
  shortfallNom: number;
}

export interface PlanSummary {
  spendingCovered: boolean;
  firstShortfallYear?: number;
  totalShortfallNom: number;
  totalShortfallToday: number;
  lifetimeTaxNom: number;
  lifetimeTaxToday: number;
  afterTaxLegacyNom: number;
  /** True in stage 2: there is no final return yet, so the legacy is before tax. */
  legacyIsPreTax: boolean;
  clawbackYears: number;
  savedToTfsaNom: number;
  /** Empty until stage 6. */
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
  rows: {
    year: number;
    incomeBySourceNom: IncomeBySourceNom;
    taxNom: number;
    clawbackNom: number;
    savedToTfsaNom: number;
    spendNeedNom: number;
  }[];
}
