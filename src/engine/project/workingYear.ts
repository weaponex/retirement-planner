// Years before the first retirement (design: The year solver, working years):
// rebalance and apply the shape; tax the non-registered cash yield at each
// owner's working marginal rate and reinvest the rest; tax CPP, OAS and DB
// collected while working, and any RRIF or LIF minimum, at that rate and save
// the rest (TFSA within room, then non-registered); apply price returns;
// contributions land at the end of the year; then the invariants.
import { netGains } from '../accounts/nonRegistered';
import { firstTfsa, fitsInRoom, useRoom } from '../accounts/tfsa';
import { checkYear, type YearChecks } from '../invariants';
import { incomeTotals } from '../jurisdiction/federal';
import { accountValue, buy, currentWeights, sellProRataHoldings } from '../invest/rebalance';
import { classReturns } from '../invest/returns';
import type {
  AccountState,
  AccountYear,
  NormalizedInputs,
  Owner,
  PlanState,
  SpouseYear,
  TaxableIncome,
  Variant,
  YearContext,
  YearRow,
} from '../types';
import { assembleIncome, noCashYield, noFixedIncome } from '../solver/incomeAssembly';
import {
  advance,
  applyPriceReturns,
  creditYields,
  fixedIncome,
  fixedTotal,
  gainsFor,
  ownerCashYields,
  noEstate,
  prepareYear,
  type SolveOptions,
  type SolvedYear,
  type TaxedIncome,
} from '../solver/yearSolve';
import { flatTaxable } from '../tax/split';

const OWNERS: Owner[] = [0, 1];

const noIncome = (): TaxableIncome => ({
  pensionEligible: 0,
  oas: 0,
  cpp: 0,
  otherOrdinary: 0,
  eligibleDividends: 0,
  foreignDividends: 0,
  capitalGains: 0,
});

function addIncome(a: TaxableIncome, b: TaxableIncome): TaxableIncome {
  return {
    pensionEligible: a.pensionEligible + b.pensionEligible,
    oas: a.oas + b.oas,
    cpp: a.cpp + b.cpp,
    otherOrdinary: a.otherOrdinary + b.otherOrdinary,
    eligibleDividends: a.eligibleDividends + b.eligibleDividends,
    foreignDividends: a.foreignDividends + b.foreignDividends,
    capitalGains: a.capitalGains + b.capitalGains,
  };
}

function firstOf(accounts: AccountState[], type: string, owner: Owner) {
  return accounts
    .filter((a) => a.type === type && a.owner === owner)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

export function workingYear(
  state: PlanState,
  inputs: NormalizedInputs,
  ctx: YearContext,
  variant: Variant,
  options: SolveOptions = {},
): SolvedYear {
  const returns = classReturns(ctx.cfg, inputs.investing);
  const p = gainsFor(prepareYear(state, inputs, ctx, variant, returns), options);
  let s = p.state;
  const fixed = fixedIncome(s, inputs, ctx, false);
  const yields = ownerCashYields(s, returns);
  const deposits: Record<string, number> = {};
  const draws: Record<string, number> = {};
  const contributions: Record<string, number> = {};
  const add = (m: Record<string, number>, id: string, v: number) => (m[id] = (m[id] ?? 0) + v);
  let accounts = s.accounts;
  let spouses = s.spouses;
  const taxBy: [number, number] = [0, 0];
  const taxed: [TaxedIncome, TaxedIncome] = [
    { income: noIncome(), tax: 0 },
    { income: noIncome(), tax: 0 },
  ];
  const gainsBy: [number, number] = [p.rebalanceGains[0], p.rebalanceGains[1]];
  const minimumsBy: [number, number] = [0, 0];

  for (const o of OWNERS) {
    if (!spouses[o].alive) continue;
    const rate = inputs.spouses[o].workingMarginalRate;
    const yieldIncome = assembleIncome(
      spouses[o],
      noFixedIncome(),
      [],
      yields[o],
      p.rebalanceGains[o],
    );
    // RRIF and LIF minimums apply in working years too; they are taxed and
    // saved like the benefits.
    let minimums = 0;
    for (const a of accounts) {
      const min = a.owner === o ? (p.limits[a.id]?.min ?? 0) : 0;
      if (min > 0) {
        add(draws, a.id, min);
        minimums += min;
      }
    }
    minimumsBy[o] = minimums;
    const benefitIncome = assembleIncome(
      { carriedLossNom: 0 },
      { ...fixed[o], db: fixed[o].db + minimums },
      [],
      noCashYield(),
      0,
    );
    const yieldTaxable = flatTaxable(yieldIncome, ctx);
    const benefitTaxable = flatTaxable(benefitIncome, ctx);
    const yieldTax = yieldTaxable * rate;
    const benefitTax = benefitTaxable * rate;
    taxed[o] = { income: addIncome(yieldIncome, benefitIncome), tax: yieldTax + benefitTax };
    taxBy[o] = yieldTax + benefitTax;

    // The yield, less its tax, is reinvested in the owner's non-registered
    // account; if the tax is larger, the rest is sold from it.
    const nonreg = firstOf(accounts, 'nonreg', o)!;
    const netYield = yields[o].total - yieldTax;
    if (netYield >= 0) add(deposits, nonreg.id, netYield);
    else add(draws, nonreg.id, -netYield);

    // Benefits, less tax, are saved: TFSA within room, then non-registered.
    let save = fixedTotal(fixed[o]) + minimums - benefitTax;
    const tfsa = firstTfsa(accounts, o);
    if (tfsa && save > 0) {
      const put = fitsInRoom(spouses[o], save);
      if (put > 0) {
        add(deposits, tfsa.id, put);
        spouses = spouses.map((sp, i) => (i === o ? useRoom(sp, put) : sp)) as PlanState['spouses'];
        save -= put;
      }
    }
    if (save > 0) add(deposits, nonreg.id, save);
  }

  const tfsaRoomForChecks: [number, number] = [p.tfsaRoomStart[0], p.tfsaRoomStart[1]];
  accounts = accounts.map((a) => {
    let holdings = a.holdings;
    const out = draws[a.id] ?? 0;
    if (out > 0) {
      const sale = sellProRataHoldings(holdings, out);
      holdings = sale.holdings;
      // Only non-registered sales realize gains.
      if (a.type === 'nonreg') gainsBy[a.owner] += sale.realizedGain;
    }
    // Sheltered yields are credited before deposits, as in retired years.
    holdings = creditYields([{ ...a, holdings }], p.yieldCredit)[0]!.holdings;
    const into = deposits[a.id] ?? 0;
    if (into > 0) holdings = buy(holdings, into, currentWeights(holdings, p.mix));
    return { ...a, holdings };
  });

  // Price returns, then contributions at the end of the year.
  const priced = applyPriceReturns(accounts, returns);
  accounts = priced.accounts;
  const indexed = ctx.deflator(ctx.yearIndex);
  for (const input of inputs.accounts) {
    const amount = input.annualContributionNom * indexed;
    if (amount <= 0 || !spouses[input.owner].alive) continue;
    const current = accounts.find((a) => a.id === input.id);
    if (!current) continue;
    // TFSA within room; a converted RRIF or LIF takes no contributions. What
    // can't go in goes to the owner's non-registered account.
    let put = amount;
    if (current.type === 'tfsa') {
      put = fitsInRoom(spouses[current.owner], amount);
      spouses = spouses.map((sp, i) =>
        i === current.owner ? useRoom(sp, put) : sp,
      ) as PlanState['spouses'];
    } else if (current.type === 'rrif' || current.type === 'lif') {
      put = 0;
    }
    if (put > 0) add(contributions, current.id, put);
    if (amount - put > 0) {
      add(contributions, firstOf(accounts, 'nonreg', current.owner)!.id, amount - put);
    }
  }
  accounts = accounts.map((a) => {
    const c = contributions[a.id] ?? 0;
    return c > 0 ? { ...a, holdings: buy(a.holdings, c, currentWeights(a.holdings, p.mix)) } : a;
  });

  spouses = spouses.map((sp, o) => ({
    ...sp,
    carriedLossNom: netGains(gainsBy[o]!, sp.carriedLossNom).carriedLoss,
  })) as PlanState['spouses'];
  const endState: PlanState = { ...s, accounts, spouses };
  s = endState;

  const accountRows: Record<string, AccountYear> = {};
  for (const a of accounts) {
    accountRows[a.id] = {
      startNom: p.startValues[a.id] ?? 0,
      contributionsNom: contributions[a.id] ?? 0,
      depositsNom: deposits[a.id] ?? 0,
      reinvestedYieldNom: p.reinvested[a.id]?.reinvested ?? 0,
      withholdingNom: p.reinvested[a.id]?.withholding ?? 0,
      priceReturnNom: priced.priceReturn[a.id] ?? 0,
      drawsNom: draws[a.id] ?? 0,
      endNom: accountValue(a),
    };
  }
  const spouseRows = OWNERS.map((o): SpouseYear => ({
    age: p.state.spouses[o].age,
    alive: p.state.spouses[o].alive,
    cppNom: fixed[o].cpp + fixed[o].survivorCpp,
    oasNom: fixed[o].oas,
    dbNom: fixed[o].db + fixed[o].survivorDb,
    payNom: 0,
    withdrawals: Object.fromEntries(
      accounts.filter((a) => a.owner === o && draws[a.id]).map((a) => [a.id, draws[a.id]!]),
    ),
    forcedDrawsNom: minimumsBy[o],
    realizedGainsNom: gainsBy[o],
    // The tax-return taxable income (stage 3 decision S3), not the working-rate base.
    taxableIncomeNom: incomeTotals(taxed[o].income, ctx).taxableIncome,
    taxNom: taxBy[o],
    clawbackNom: 0,
    splitShare: 0,
  })) as [SpouseYear, SpouseYear];
  const totalDraws = Object.values(draws).reduce((a, b) => a + b, 0);
  const row: YearRow = {
    year: p.state.year,
    spouse: spouseRows,
    accounts: accountRows,
    balancesEndNom: Object.fromEntries(accounts.map((a) => [a.id, accountValue(a)])),
    cashYieldNom: yields[0].total + yields[1].total,
    spendNeedNom: 0,
    // No spending need before the first retirement; what is saved shows as deposits (S3).
    afterTaxCashNom: 0,
    surplusNom: 0,
    shortfallNom: 0,
    estate: noEstate(),
  };

  const tfsaIn: [number, number] = [0, 0];
  for (const a of accounts) {
    if (a.type !== 'tfsa') continue;
    tfsaIn[a.owner] += (deposits[a.id] ?? 0) + (contributions[a.id] ?? 0);
  }
  const checks: YearChecks = {
    variantId: variant.id,
    kind: 'working',
    limits: p.limits,
    tfsaRoomStart: tfsaRoomForChecks,
    tfsaIn,
    workingDraws: totalDraws,
  };
  checkYear(state, s, row, ctx, checks);
  return { nextState: advance(s, inputs, state.splitShare), row, endState: s, taxed };
}
