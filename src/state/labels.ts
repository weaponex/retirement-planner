// Plain names for input paths, for the missing-details list and the change
// summary ("Retirement year, Alex").
import { categoryName } from './categories';
import { getAt, type PlanDraft } from './draft';

const SPOUSE_FIELDS: Record<string, string> = {
  name: 'Name',
  birthYear: 'Birth year',
  birthMonth: 'Birth month',
  sexAtBirth: 'Sex at birth',
  retirementYear: 'Retirement year',
  lifeExpectancyTarget: 'Life expectancy target',
  cppAt65Today: 'CPP estimate at 65',
  cppStartAge: 'CPP start age',
  oasStartAge: 'OAS start age',
  yearsInCanadaAt65: 'Years in Canada at 65',
  workingMarginalRate: 'Working tax rate',
  afterTaxPayToday: 'After-tax pay',
};

const ACCOUNT_FIELDS: Record<string, string> = {
  balanceToday: 'balance',
  annualContributionToday: 'yearly contribution',
  tfsaRoomToday: 'TFSA room',
  conversionAge: 'conversion age',
  lifUnlock50: '50% unlock',
  positions: 'holdings',
};

const ACCOUNT_TYPES: Record<string, string> = {
  rrsp: 'RRSP',
  lira: 'LIRA',
  tfsa: 'TFSA',
  nonreg: 'Non-registered',
};

const OTHER: Record<string, string> = {
  'spending.mode': 'How spending is entered',
  'spending.monthlyTotalToday': 'Monthly spending',
  'spending.phases.0.fromYear': 'Slower years start',
  'spending.phases.0.keepPct': 'Slower years share',
  'spending.phases.1.fromYear': 'Later years start',
  'spending.phases.1.keepPct': 'Later years share',
  'spending.active': 'Active-years spending',
  'estate.survivorPct': 'Survivor spending',
  'estate.legacyGoalToday': 'Legacy goal',
  'estate.homeValueToday': 'Home value',
  'investing.mixId': 'Starting mix',
  'investing.mix': 'Investment mix',
  'investing.shapeId': 'As you get older',
  'investing.presetId': 'Which account holds what',
  'investing.rebalance': 'Rebalance once a year',
  'investing.feeLevel': 'Fee level',
  'investing.customFee': 'Custom fee',
  'withdrawal.strategyId': 'Withdrawal strategy',
  'withdrawal.bracketLevel': 'Bracket level',
  accounts: 'Accounts',
  dbPensions: 'Workplace pensions',
};

function spouseName(draft: PlanDraft, i: number): string {
  const name = getAt(draft, `spouses.${i}.name`);
  return typeof name === 'string' && name.trim() ? name.trim() : `Spouse ${i + 1}`;
}

/** A plain name for an input path. */
export function fieldLabel(path: string, draft: PlanDraft): string {
  const parts = path.split('.');
  if (parts[0] === 'spouses' && parts.length >= 3) {
    return `${SPOUSE_FIELDS[parts[2]!] ?? parts[2]}, ${spouseName(draft, Number(parts[1]))}`;
  }
  if (parts[0] === 'accounts' && parts.length >= 3) {
    const [type, owner, n] = parts[1]!.split('-');
    const what = `${ACCOUNT_TYPES[type!] ?? type}${n && n !== '1' ? ` ${n}` : ''}`;
    return `${spouseName(draft, Number(owner))}'s ${what} ${ACCOUNT_FIELDS[parts[2]!] ?? parts[2]}`;
  }
  if (parts[0] === 'dbPensions' && parts.length >= 3) {
    return `Workplace pension ${Number(parts[1]) + 1}: ${parts[2]}`;
  }
  if (parts[0] === 'investing' && parts[1] === 'mix' && parts[2]) return `Mix: ${parts[2]}`;
  if (parts[0] === 'investing' && parts[1] === 'returnOverride') return 'Expected return';
  if (parts[0] === 'spending' && parts[1] === 'categories' && parts[2]) {
    return categoryName(parts[2]);
  }
  if (parts[0] === 'ruleOverrides') return 'A rule value in Settings';
  return OTHER[path] ?? path;
}
