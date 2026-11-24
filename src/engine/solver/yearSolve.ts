// The year solver for retired-household years (design: The year solver). Each
// year, for each variant: the first-death transfer, the start-of-year step,
// the rebalance, fixed income, required draws, the withdrawal solve with the
// two-pass pension split, the surplus, price returns, then the invariants.
// Everything here is in future dollars.
import { lifLimits } from '../accounts/liraLif';
import { cashYield, netGains, reinvestYield, type CashYield } from '../accounts/nonRegistered';
import { rrifMinimum } from '../accounts/rrspRrif';
import { recordWithdrawal, useRoom } from '../accounts/tfsa';
import { cppAt, cppFullYear } from '../benefits/cpp';
import { dbPayment, dbSurvivorBase } from '../benefits/db';
import { oasAt } from '../benefits/oas';
import { survivorBenefits } from '../benefits/survivor';
import { ASSET_CLASSES, type AssetClass } from '../config/keys';
import { plain } from '../config/read';
import { checkYear, EngineIntegrityError, type YearChecks } from '../invariants';
import { targetHoldings } from '../invest/placement';
import {
  accountValue,
  buy,
  currentWeights,
  rebalance,
  sellProRataHoldings,
  type Weights,
} from '../invest/rebalance';
import { classReturns, type ClassReturns } from '../invest/returns';
import { deaths, firstDeathTransfer } from '../project/death';
import { yearMix } from '../project/initialState';
import { spendingNeed } from '../project/spendingNeed';
import { bestSplit, householdTax, type SplitSpouse, type SpouseTax } from '../tax/split';
import type {
  AccountState,
  AccountYear,
  Draw,
  NormalizedInputs,
  Owner,
  PlanState,
  SplitChoice,
  SpouseYear,
  TaxableIncome,
  Variant,
  YearContext,
  YearInProgress,
  YearRow,
} from '../types';
import { drawDownYears, earlyRrsp } from '../withdraw/earlyRrsp';
import { bracketTopUp } from '../withdraw/fillBrackets';
import { available, registeredDraw, registeredLast, withDraws } from '../withdraw/registeredLast';
import { placeSurplus, surplusShares, type Deposit } from '../withdraw/surplus';
import { MAX_SPLIT_PASSES } from '../constants';
import { bisect } from './bisect';
import {
  assembleIncome,
  noCashYield,
  noFixedIncome,
  splitEligible,
  type FixedIncome,
} from './incomeAssembly';
import { deathYear, spouseForYear, startOfYear } from './startOfYear';

const OWNERS: Owner[] = [0, 1];
const other = (o: Owner): Owner => (o === 0 ? 1 : 0);
const SHELTERED = new Set(['rrsp', 'rrif', 'lira', 'lif', 'tfsa']);

// ------------------------------------------------------------ start of year

export interface PreparedYear {
  /** After the first-death transfer, the start-of-year step and the rebalance. */
  state: PlanState;
  /** Each account's value after the start-of-year step, before the rebalance. */
  startValues: Record<string, number>;
  reinvested: Record<string, { reinvested: number; withholding: number }>;
  /** Each sheltered account's yield net of withholding, by class, to credit after the draws. */
  yieldCredit: Record<string, Record<AssetClass, number>>;
  rebalanceGains: [number, number];
  /** Each RRIF/LIF's minimum and maximum, on its start-of-year balance. */
  limits: Record<string, { min: number; max: number }>;
  tfsaRoomStart: [number, number];
  /** This year's overall mix. */
  mix: Weights;
}

/** Steps 0 to 2 and the sheltered-yield reinvestment. */
export function prepareYear(
  state: PlanState,
  inputs: NormalizedInputs,
  ctx: YearContext,
  variant: Variant,
  returns: ClassReturns,
): PreparedYear {
  let s = state.firstDeathYear === state.year - 1 ? firstDeathTransfer(state) : state;
  s = startOfYear(s, ctx);
  const startValues = Object.fromEntries(s.accounts.map((a) => [a.id, accountValue(a)]));
  const limits: PreparedYear['limits'] = {};
  for (const a of s.accounts) {
    const startAge = s.spouses[a.owner].age - 1;
    if (a.type === 'rrif') {
      // A RRIF has no maximum.
      limits[a.id] = { min: rrifMinimum(a, startAge, s.year, ctx), max: Infinity };
    } else if (a.type === 'lif') {
      limits[a.id] = lifLimits(a, startAge, s.year, ctx);
    }
  }
  const mix = yearMix(inputs, s.year, ctx);
  let rebalanceGains: [number, number] = [0, 0];
  if (inputs.investing.rebalance || state.yearIndex === 0) {
    const r = rebalance(s.accounts, targetHoldings(s.accounts, mix, variant.presetId, ctx.cfg));
    s = { ...s, accounts: r.accounts };
    rebalanceGains = r.realizedGains;
  }
  // Sheltered yields are worked out on the start-of-year balance and credited
  // after the year's draws (`creditYields`), so they never enlarge the balance
  // the RRIF and LIF limits are measured on.
  const reinvested: PreparedYear['reinvested'] = {};
  const yieldCredit: PreparedYear['yieldCredit'] = {};
  for (const a of s.accounts) {
    if (!SHELTERED.has(a.type)) continue;
    const r = reinvestYield(a, returns, ctx);
    reinvested[a.id] = { reinvested: r.reinvested, withholding: r.withholding };
    const credit = {} as Record<AssetClass, number>;
    for (const cls of ASSET_CLASSES) {
      credit[cls] = r.account.holdings[cls].valueNom - a.holdings[cls].valueNom;
    }
    yieldCredit[a.id] = credit;
  }
  return {
    state: s,
    startValues,
    reinvested,
    yieldCredit,
    rebalanceGains,
    limits,
    tfsaRoomStart: [s.spouses[0].tfsaRoomNom, s.spouses[1].tfsaRoomNom],
    mix,
  };
}

// ------------------------------------------------------------- fixed income

/** Step 3: CPP, OAS, DB, survivor benefits and a working spouse's after-tax pay. */
export function fixedIncome(
  state: PlanState,
  inputs: NormalizedInputs,
  ctx: YearContext,
  householdRetired: boolean,
): [FixedIncome, FixedIncome] {
  const out: [FixedIncome, FixedIncome] = [noFixedIncome(), noFixedIncome()];
  for (const o of OWNERS) {
    const sp = state.spouses[o];
    if (!sp.alive) continue;
    const input = inputs.spouses[o];
    const f = out[o];
    f.cpp = cppAt(input.cppAt65Nom, input.cppStartAge, sp.age, input.birthMonth, ctx);
    f.oas = oasAt(input.yearsInCanadaAt65, input.oasStartAge, sp.age, input.birthMonth, ctx);
    f.db = inputs.dbPensions
      .filter((db) => db.owner === o)
      .reduce((s, db) => s + dbPayment(db, sp.age, input.birthMonth, ctx, true).total, 0);
    if (sp.working && householdRetired) f.pay = input.afterTaxPayNom * ctx.deflator(ctx.yearIndex);
    // Survivor benefits start the year after the first death.
    const d = other(o);
    if (!state.spouses[d].alive && state.firstDeathYear !== undefined) {
      const dead = inputs.spouses[d];
      const deadAge = state.year - dead.birthYear;
      const b = survivorBenefits(
        {
          deceasedCppFullYear: cppFullYear(dead.cppAt65Nom, dead.cppStartAge, ctx),
          deceasedDb: inputs.dbPensions
            .filter((db) => db.owner === d)
            .map((db) => ({
              lifetimeFullYear: dbSurvivorBase(db, deadAge, ctx),
              survivorPct: db.survivorPct,
            })),
        },
        { age: sp.age, ownCpp: f.cpp },
        ctx,
      );
      f.survivorCpp = b.cpp;
      f.survivorDb = b.db;
    }
  }
  return out;
}

export const fixedTotal = (f: FixedIncome) =>
  f.cpp + f.oas + f.db + f.survivorCpp + f.survivorDb + f.pay;

/** Each owner's non-registered cash yield on the start-of-year balance. */
export function ownerCashYields(state: PlanState, returns: ClassReturns): [CashYield, CashYield] {
  const out: [CashYield, CashYield] = [noCashYield(), noCashYield()];
  for (const a of state.accounts) {
    if (a.type !== 'nonreg') continue;
    const y = cashYield(a, returns);
    const t = out[a.owner];
    t.interest += y.interest;
    t.eligibleDividends += y.eligibleDividends;
    t.foreignDividends += y.foreignDividends;
    t.total += y.total;
  }
  return out;
}

// ------------------------------------------------------------- the solve

interface Evaluation {
  cash: number;
  draws: Draw[];
  taxes: [SpouseTax, SpouseTax];
  /** Each spouse's income before the split. */
  incomes: [TaxableIncome, TaxableIncome];
  spouses: [SplitSpouse, SplitSpouse];
}

interface YearSetup {
  state: PlanState;
  inputs: NormalizedInputs;
  ctx: YearContext;
  fixed: [FixedIncome, FixedIncome];
  yields: [CashYield, CashYield];
  rebalanceGains: [number, number];
  owners: ReadonlyMap<string, Owner>;
  types: ReadonlyMap<string, string>;
}

function incomesFor(setup: YearSetup, draws: Draw[]): [TaxableIncome, TaxableIncome] {
  return OWNERS.map((o) =>
    assembleIncome(
      setup.state.spouses[o],
      setup.fixed[o],
      draws.filter((d) => setup.owners.get(d.accountId) === o),
      setup.yields[o],
      setup.rebalanceGains[o],
    ),
  ) as [TaxableIncome, TaxableIncome];
}

function splitSpouses(
  setup: YearSetup,
  draws: Draw[],
  incomes: [TaxableIncome, TaxableIncome],
): [SplitSpouse, SplitSpouse] {
  const splitAge = plain(setup.ctx, 'federal.split.min_age_rrif');
  return OWNERS.map((o) => {
    const sp = setup.state.spouses[o];
    const flatRate = !sp.alive
      ? 0
      : sp.working
        ? setup.inputs.spouses[o].workingMarginalRate
        : undefined;
    return {
      income: incomes[o],
      age: sp.age,
      eligible: splitEligible(
        setup.fixed[o],
        draws.filter((d) => setup.owners.get(d.accountId) === o),
        setup.types,
        sp.age,
        splitAge,
      ),
      excluded: !sp.alive || sp.working,
      ...(flatRate !== undefined && { flatRate }),
    };
  }) as [SplitSpouse, SplitSpouse];
}

function evaluate(setup: YearSetup, draws: Draw[], split: SplitChoice): Evaluation {
  const incomes = incomesFor(setup, draws);
  const spouses = splitSpouses(setup, draws, incomes);
  const taxes = householdTax(spouses[0], spouses[1], split, setup.ctx);
  const cash =
    fixedTotal(setup.fixed[0]) +
    fixedTotal(setup.fixed[1]) +
    setup.yields[0].total +
    setup.yields[1].total +
    draws.reduce((s, d) => s + d.amountNom, 0) -
    taxes[0].total -
    taxes[1].total;
  return { cash, draws, taxes, incomes, spouses };
}

const sameSplit = (a: SplitChoice, b: SplitChoice) =>
  (a.share === 0 && b.share === 0) || (a.from === b.from && a.share === b.share);

// ------------------------------------------------------------- the year

export interface SolveOptions {
  /** Solve once at this split, with no search (used to compare against the full search in tests). */
  fixedSplit?: SplitChoice;
}

export interface SolvedYear {
  nextState: PlanState;
  row: YearRow;
}

/** Applies draws and deposits to the accounts and the TFSA room. */
function settle(
  state: PlanState,
  draws: Draw[],
  deposits: Deposit[],
  mix: Weights,
): { state: PlanState; drawnBy: Record<string, number>; depositedBy: Record<string, number> } {
  const drawnBy: Record<string, number> = {};
  const depositedBy: Record<string, number> = {};
  for (const d of draws) drawnBy[d.accountId] = (drawnBy[d.accountId] ?? 0) + d.amountNom;
  for (const d of deposits)
    depositedBy[d.accountId] = (depositedBy[d.accountId] ?? 0) + d.amountNom;
  let spouses = state.spouses;
  const accounts = state.accounts.map((a) => {
    let holdings = a.holdings;
    const out = drawnBy[a.id] ?? 0;
    if (out > 0) {
      holdings = sellProRataHoldings(holdings, out).holdings;
      if (a.type === 'tfsa') {
        spouses = spouses.map((s, i) =>
          i === a.owner ? recordWithdrawal(s, out) : s,
        ) as PlanState['spouses'];
      }
    }
    const into = depositedBy[a.id] ?? 0;
    if (into > 0) {
      holdings = buy(holdings, into, currentWeights(holdings, mix));
      if (a.type === 'tfsa') {
        spouses = spouses.map((s, i) =>
          i === a.owner ? useRoom(s, into) : s,
        ) as PlanState['spouses'];
      }
    }
    return { ...a, holdings };
  });
  return { state: { ...state, accounts, spouses }, drawnBy, depositedBy };
}

/** Credits each sheltered account's yield (net of withholding) to its classes. */
export function creditYields(
  accounts: AccountState[],
  credit: PreparedYear['yieldCredit'],
): AccountState[] {
  return accounts.map((a) => {
    const c = credit[a.id];
    if (!c) return a;
    const holdings = { ...a.holdings };
    for (const cls of ASSET_CLASSES) {
      holdings[cls] = {
        valueNom: a.holdings[cls].valueNom + c[cls],
        costNom: a.holdings[cls].costNom + c[cls],
      };
    }
    return { ...a, holdings };
  });
}

/** Step 7: price returns on what remains. Returns the new accounts and each account's price return. */
export function applyPriceReturns(
  accounts: AccountState[],
  returns: ClassReturns,
): { accounts: AccountState[]; priceReturn: Record<string, number> } {
  const priceReturn: Record<string, number> = {};
  const next = accounts.map((a) => {
    const holdings = { ...a.holdings };
    let gained = 0;
    for (const cls of ASSET_CLASSES) {
      const g = a.holdings[cls].valueNom * returns[cls].price;
      gained += g;
      holdings[cls] = { ...a.holdings[cls], valueNom: a.holdings[cls].valueNom + g };
    }
    priceReturn[a.id] = gained;
    return { ...a, holdings };
  });
  return { accounts: next, priceReturn };
}

/** The state for the next year: ages, who is alive, the split and the first death. */
export function advance(state: PlanState, inputs: NormalizedInputs, split: SplitChoice): PlanState {
  const year = state.year + 1;
  const diedThisYear = OWNERS.some((o) => deathYear(inputs, o) === state.year);
  const firstDeathYear = state.firstDeathYear ?? (diedThisYear ? state.year : undefined);
  return {
    ...state,
    year,
    yearIndex: state.yearIndex + 1,
    spouses: OWNERS.map((o) =>
      spouseForYear(state.spouses[o], inputs, o, year),
    ) as PlanState['spouses'],
    splitShare: split,
    ...(firstDeathYear !== undefined && { firstDeathYear }),
  };
}

/**
 * One retired-household year (design: The year solver, steps 0 to 9; the
 * final return is stage 3). Throws EngineIntegrityError when the solve does not converge or an invariant fails.
 */
export function solveYear(
  state: PlanState,
  inputs: NormalizedInputs,
  ctx: YearContext,
  variant: Variant,
  options: SolveOptions = {},
): SolvedYear {
  const returns = classReturns(ctx.cfg, inputs.investing);
  const p = prepareYear(state, inputs, ctx, variant, returns);
  const s = p.state;

  const setup: YearSetup = {
    state: s,
    inputs,
    ctx,
    fixed: fixedIncome(s, inputs, ctx, true),
    yields: ownerCashYields(s, returns),
    rebalanceGains: p.rebalanceGains,
    owners: new Map(s.accounts.map((a) => [a.id, a.owner])),
    types: new Map(s.accounts.map((a) => [a.id, a.type])),
  };

  // Step 4: required draws: minimums, then the bracket top-up.
  const progress = (draws: Draw[]): YearInProgress => ({
    state: s,
    inputs,
    incomeSoFar: incomesFor(setup, draws),
    drawsSoFar: draws,
  });
  let forced: Draw[] = [];
  for (const a of s.accounts) {
    const min = p.limits[a.id]?.min ?? 0;
    if (min > 0) forced.push(registeredDraw(progress([]), a, min, ctx));
  }
  if (variant.strategyId === 'fill_brackets') {
    forced = [...forced, ...bracketTopUp(progress(forced), inputs.withdrawal.bracketLevel, ctx)];
  }
  const base = progress(forced);
  const forcedBy: [number, number] = [0, 0];
  for (const d of forced) forcedBy[setup.owners.get(d.accountId)!] += d.amountNom;

  // Step 5: solve for W.
  const need = spendingNeed(inputs, s, ctx);
  const drawDown = variant.strategyId === 'early_rrsp' ? drawDownYears(inputs, deaths(inputs)) : [];
  const extra = (W: number): Draw[] =>
    W <= 0
      ? []
      : variant.strategyId === 'early_rrsp'
        ? earlyRrsp(W, base, drawDown, ctx)
        : registeredLast(W, base, ctx);
  const evalAt = (W: number, split: SplitChoice) =>
    evaluate(setup, [...forced, ...extra(W)], split);
  const most = available(base, ctx);
  const solve = (split: SplitChoice): number => {
    const f = (W: number) => evalAt(W, split).cash - need;
    if (f(0) >= 0) return 0;
    if (f(most) < 0) return most;
    const r = bisect(f, 0, most);
    if (!r.converged) {
      throw new EngineIntegrityError({
        year: s.year,
        variantId: variant.id,
        check: 'withdrawal solve did not converge',
        before: state,
        after: s,
      });
    }
    return r.x;
  };

  // The split passes: solve at last year's split, search at that answer, and
  // re-solve while the best split changes, up to MAX_SPLIT_PASSES solves.
  let split = options.fixedSplit ?? state.splitShare;
  let W = solve(split);
  let result = evalAt(W, split);
  for (let pass = 1; !options.fixedSplit && pass < MAX_SPLIT_PASSES; pass++) {
    const best = bestSplit(result.spouses[0], result.spouses[1], ctx);
    if (sameSplit(best, split)) break;
    split = { from: best.from, share: best.share };
    W = solve(split);
    result = evalAt(W, split);
  }

  // Step 6: surplus.
  const surplus = Math.max(0, result.cash - need);
  const shortfall = Math.max(0, need - result.cash);
  const afterDraws = withDraws({ ...base, drawsSoFar: [] }, result.draws);
  const deposits = placeSurplus(
    surplus,
    afterDraws,
    surplusShares(afterDraws, forcedBy, [fixedTotal(setup.fixed[0]), fixedTotal(setup.fixed[1])]),
  );
  const settled = settle(s, result.draws, deposits, p.mix);

  // Step 7: price returns, LIF earnings, carried losses.
  const priced = applyPriceReturns(creditYields(settled.state.accounts, p.yieldCredit), returns);
  const accounts = priced.accounts.map((a) =>
    a.type === 'lif'
      ? {
          ...a,
          lifPrevEarningsNom:
            (p.reinvested[a.id]?.reinvested ?? 0) -
            (p.reinvested[a.id]?.withholding ?? 0) +
            priced.priceReturn[a.id]!,
        }
      : a,
  );
  const gainsBy: [number, number] = [p.rebalanceGains[0], p.rebalanceGains[1]];
  for (const d of result.draws) gainsBy[setup.owners.get(d.accountId)!] += d.realizedGainNom;
  const spousesEnd = settled.state.spouses.map((sp, o) => ({
    ...sp,
    carriedLossNom: netGains(gainsBy[o]!, sp.carriedLossNom).carriedLoss,
  })) as PlanState['spouses'];
  const endState: PlanState = { ...settled.state, accounts, spouses: spousesEnd };

  // The row.
  const accountRows: Record<string, AccountYear> = {};
  for (const a of accounts) {
    accountRows[a.id] = {
      startNom: p.startValues[a.id] ?? 0,
      contributionsNom: 0,
      depositsNom: settled.depositedBy[a.id] ?? 0,
      reinvestedYieldNom: p.reinvested[a.id]?.reinvested ?? 0,
      withholdingNom: p.reinvested[a.id]?.withholding ?? 0,
      priceReturnNom: priced.priceReturn[a.id] ?? 0,
      drawsNom: settled.drawnBy[a.id] ?? 0,
      endNom: accountValue(a),
    };
  }
  const spouseRows = OWNERS.map((o): SpouseYear => {
    const f = setup.fixed[o];
    const own = result.draws.filter((d) => setup.owners.get(d.accountId) === o);
    return {
      age: s.spouses[o].age,
      alive: s.spouses[o].alive,
      cppNom: f.cpp + f.survivorCpp,
      oasNom: f.oas,
      dbNom: f.db + f.survivorDb,
      payNom: f.pay,
      withdrawals: Object.fromEntries(
        Object.entries(
          own.reduce<Record<string, number>>((m, d) => {
            m[d.accountId] = (m[d.accountId] ?? 0) + d.amountNom;
            return m;
          }, {}),
        ),
      ),
      forcedDrawsNom: forcedBy[o],
      realizedGainsNom: gainsBy[o],
      taxableIncomeNom: result.taxes[o].taxableIncome,
      taxNom: result.taxes[o].total,
      clawbackNom: result.taxes[o].clawback,
      splitShare:
        split.from === o && !result.spouses[0].excluded && !result.spouses[1].excluded
          ? split.share
          : 0,
    };
  }) as [SpouseYear, SpouseYear];
  const row: YearRow = {
    year: s.year,
    spouse: spouseRows,
    accounts: accountRows,
    balancesEndNom: Object.fromEntries(accounts.map((a) => [a.id, accountValue(a)])),
    cashYieldNom: setup.yields[0].total + setup.yields[1].total,
    spendNeedNom: need,
    afterTaxCashNom: result.cash,
    surplusNom: surplus,
    shortfallNom: shortfall,
  };

  const nextState = advance(endState, inputs, split);
  const tfsaIn: [number, number] = [0, 0];
  for (const d of deposits) {
    const a = s.accounts.find((x) => x.id === d.accountId);
    if (a?.type === 'tfsa') tfsaIn[a.owner] += d.amountNom;
  }
  const checks: YearChecks = {
    variantId: variant.id,
    kind: 'retired',
    limits: p.limits,
    tfsaRoomStart: p.tfsaRoomStart,
    tfsaIn,
  };
  checkYear(state, endState, row, ctx, checks);
  return { nextState, row };
}
