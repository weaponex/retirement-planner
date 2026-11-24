// Independent year-by-year calculator for the reference plan, written from the design
// (docs/designs/retirement-planner.md) without reading any engine code. Every reading of
// an unclear rule is listed in ../NOTES.md; the comments here point to those notes as [Nxx].
import { makeCtx } from './config.mjs';
import {
  ZERO_INCOME,
  addIncome,
  rawIncome,
  workingBase,
  incomeTotals,
  personalTax,
} from './tax.mjs';

// Engine settings (design file 23, constants.ts). Not rule values.
const SOLVER_PRECISION = 0.01;
const SOLVER_MAX_STEPS = 40;
const SPLIT_STEP = 0.05;
const MAX_SPLIT_PASSES = 3;
const BENEFIT_REFERENCE_AGE = 65; // stage 2 decision 6
const MONTHS = 12;
const TIE_TOLERANCE = 1e-6; // [N30]
const EPS = 1e-9;

const CLASSES = ['cad_equity', 'us_equity', 'intl_equity', 'em_equity', 'bonds', 'cash'];
const STOCKS = ['cad_equity', 'us_equity', 'intl_equity', 'em_equity'];
const SAFE = ['bonds', 'cash'];
const FILL_ORDER = ['cash', 'bonds', 'em_equity', 'intl_equity', 'us_equity', 'cad_equity'];
const INCOME_TYPE = {
  cad_equity: 'eligibleDividends',
  us_equity: 'foreignDividends',
  intl_equity: 'foreignDividends',
  em_equity: 'foreignDividends',
  bonds: 'otherOrdinary',
  cash: 'otherOrdinary',
};
const REGISTERED = new Set(['rrsp', 'rrif', 'lira', 'lif']);

// ---------------------------------------------------------------- small helpers

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const bal = (acct) => CLASSES.reduce((s, c) => s + acct.holdings[c].v, 0);
const cost = (acct) => CLASSES.reduce((s, c) => s + acct.holdings[c].c, 0);
const emptyHoldings = () => Object.fromEntries(CLASSES.map((c) => [c, { v: 0, c: 0 }]));

// Sell `amount` across positions in proportion to value, at average cost. Returns the
// realized gain (negative for a loss).
function sellProRata(acct, amount) {
  const total = bal(acct);
  if (amount <= 0 || total <= 0) return 0;
  const frac = Math.min(1, amount / total);
  let gain = 0;
  for (const c of CLASSES) {
    const h = acct.holdings[c];
    const takeV = h.v * frac;
    const takeC = h.c * frac;
    gain += takeV - takeC;
    h.v -= takeV;
    h.c -= takeC;
  }
  return gain;
}

// Deposit in proportion to current holdings; an empty account takes the year's overall mix
// [N22]. Original cost rises by the amount deposited.
function depositProRata(acct, amount, mix) {
  if (amount <= 0) return;
  const total = bal(acct);
  for (const c of CLASSES) {
    const w = total > 0 ? acct.holdings[c].v / total : mix[c];
    acct.holdings[c].v += amount * w;
    acct.holdings[c].c += amount * w;
  }
}

// Spread `amount` over items in proportion to weight, each capped; overflow is spread again
// over the items that still have capacity. Returns { given: Map, left }.
function waterFill(amount, items, given = new Map()) {
  let left = amount;
  for (let guard = 0; guard < 100 && left > EPS; guard++) {
    const open = items.filter((it) => it.cap - (given.get(it.id) ?? 0) > EPS && it.weight > 0);
    if (open.length === 0) break;
    const wsum = open.reduce((s, it) => s + it.weight, 0);
    let next = 0;
    for (const it of open) {
      const room = it.cap - (given.get(it.id) ?? 0);
      const want = (left * it.weight) / wsum;
      const take = Math.min(want, room);
      given.set(it.id, (given.get(it.id) ?? 0) + take);
      next += want - take;
    }
    left = next;
  }
  return { given, left };
}

// ---------------------------------------------------------------- returns, mix, placement

function classReturns(inputs, ctx) {
  const levels = ctx.plain('planning.fee_levels');
  const fee =
    inputs.investing.feeLevel === 'custom'
      ? inputs.investing.customFee
      : levels[inputs.investing.feeLevel];
  const out = {};
  for (const c of CLASSES) {
    const gross = inputs.investing.returnOverride?.[c] ?? ctx.plain(`market.${c}.geometric_return`);
    const total = gross - fee;
    const y = ctx.plain(`market.${c}.yield`);
    out[c] = { total, yield: y, price: total - y, incomeType: INCOME_TYPE[c] };
  }
  return out;
}

function shapeAt(points, t) {
  const p = [...points].sort((a, b) => a.yearsFromRetirement - b.yearsFromRetirement);
  if (t <= p[0].yearsFromRetirement) return p[0].stockChange;
  if (t >= p[p.length - 1].yearsFromRetirement) return p[p.length - 1].stockChange;
  for (let i = 0; i + 1 < p.length; i++) {
    const a = p[i];
    const b = p[i + 1];
    if (t >= a.yearsFromRetirement && t <= b.yearsFromRetirement) {
      const f = (t - a.yearsFromRetirement) / (b.yearsFromRetirement - a.yearsFromRetirement);
      return a.stockChange + f * (b.stockChange - a.stockChange);
    }
  }
  throw new Error('shape interpolation');
}

function mixForYear(inputs, ctx, t, t0) {
  const user = Object.fromEntries(CLASSES.map((c) => [c, (inputs.investing.mix[c] ?? 0) / 100]));
  const points = ctx.plain('planning.shapes')[inputs.investing.shapeId].points;
  const change = shapeAt(points, t) - shapeAt(points, t0);
  const stock = STOCKS.reduce((s, c) => s + user[c], 0);
  const safe = SAFE.reduce((s, c) => s + user[c], 0);
  const newStock = Math.min(1, Math.max(0, stock + change));
  const newSafe = 1 - newStock;
  const mix = {};
  if (stock > 0) for (const c of STOCKS) mix[c] = (user[c] * newStock) / stock;
  else for (const c of STOCKS) mix[c] = c === 'cad_equity' ? newStock : 0; // O24: no named mixes yet
  if (safe > 0) for (const c of SAFE) mix[c] = (user[c] * newSafe) / safe;
  else for (const c of SAFE) mix[c] = c === 'bonds' ? newSafe : 0;
  return mix;
}

function groupOf(type) {
  if (REGISTERED.has(type)) return 'registered';
  return type; // 'tfsa' | 'nonreg'
}

// targetHoldings: face value; classes placed in FILL_ORDER; within a group, split in
// proportion to each account's room not yet assigned.
function targetHoldings(accounts, mix, preset) {
  const total = accounts.reduce((s, a) => s + bal(a), 0);
  const room = new Map(accounts.map((a) => [a.id, bal(a)]));
  const target = new Map(
    accounts.map((a) => [a.id, Object.fromEntries(CLASSES.map((c) => [c, 0]))]),
  );
  for (const c of FILL_ORDER) {
    const column = c === 'cad_equity' ? 'cad_equity' : SAFE.includes(c) ? 'bonds' : 'global_equity';
    let need = mix[c] * total;
    for (const g of preset[column]) {
      if (need <= 0) break;
      const members = accounts.filter((a) => groupOf(a.type) === g);
      const groupRoom = members.reduce((s, a) => s + room.get(a.id), 0);
      if (groupRoom <= 0) continue;
      const take = Math.min(need, groupRoom);
      for (const a of members) {
        const r = room.get(a.id);
        const alloc = (take * r) / groupRoom;
        target.get(a.id)[c] += alloc;
        room.set(a.id, r - alloc);
      }
      need -= take;
    }
  }
  return target;
}

// Rebalance every account to its targets; returns realized gains by owner (non-registered).
function rebalance(accounts, targets) {
  const gains = [0, 0];
  for (const a of accounts) {
    const t = targets.get(a.id);
    for (const c of CLASSES) {
      const h = a.holdings[c];
      const v1 = t[c];
      if (a.type === 'nonreg') {
        if (v1 < h.v) {
          const sold = h.v - v1;
          const soldCost = h.v > 0 ? (h.c * sold) / h.v : 0;
          gains[a.owner] += sold - soldCost;
          h.c -= soldCost;
        } else {
          h.c += v1 - h.v;
        }
      } else {
        h.c = v1;
      }
      h.v = v1;
    }
  }
  return gains;
}

// ---------------------------------------------------------------- benefits

function monthsFactorFirstYear(birthMonth) {
  return (MONTHS - birthMonth) / MONTHS;
}

function cppAnnualFull(sp, ctx) {
  const months = (sp.cppStartAge - BENEFIT_REFERENCE_AGE) * MONTHS;
  const adj =
    months < 0
      ? 1 - ctx.plain('federal.cpp.adjust.early_per_month') * -months
      : 1 + ctx.plain('federal.cpp.adjust.late_per_month') * months;
  return sp.cppAt65Today * MONTHS * ctx.deflator * adj;
}

function cppPaid(sp, age, ctx) {
  if (age < sp.cppStartAge) return 0;
  const f = age === sp.cppStartAge ? monthsFactorFirstYear(sp.birthMonth) : 1;
  return cppAnnualFull(sp, ctx) * f;
}

function oasPaid(sp, age, ctx) {
  if (age < sp.oasStartAge) return 0;
  if (sp.yearsInCanadaAt65 < ctx.plain('federal.oas.residence.min_years')) return 0;
  const full = ctx.plain('federal.oas.residence.full_years');
  const months = Math.min(
    (sp.oasStartAge - BENEFIT_REFERENCE_AGE) * MONTHS,
    ctx.plain('federal.oas.deferral.max_months'),
  );
  const base =
    ctx.num('federal.oas.base_at_65') *
    (Math.min(sp.yearsInCanadaAt65, full) / full) *
    (1 + ctx.plain('federal.oas.deferral.per_month') * months);
  const startF = age === sp.oasStartAge ? monthsFactorFirstYear(sp.birthMonth) : 1;
  const incAge = ctx.plain('federal.oas.increase_age');
  const f75 = age < incAge ? 0 : age === incAge ? monthsFactorFirstYear(sp.birthMonth) : 1;
  return base * startF * (1 + ctx.plain('federal.oas.increase_rate') * f75);
}

function dbIndexFactor(db, memberAge, ctx) {
  if (db.indexing === 'full') return ctx.deflator;
  if (db.indexing === 'fixed')
    return Math.pow(1 + db.indexRate, Math.max(0, memberAge - db.startAge));
  return 1;
}

function dbPaid(db, member, age, ctx) {
  if (age < db.startAge) return 0;
  const f = dbIndexFactor(db, age, ctx);
  const startF = age === db.startAge ? monthsFactorFirstYear(member.birthMonth) : 1;
  let pay = db.lifetimeAnnualToday * f * startF;
  if (db.bridgeAnnualToday && db.bridgeEndAge !== undefined) {
    if (age < db.bridgeEndAge) pay += db.bridgeAnnualToday * f * startF;
    else if (age === db.bridgeEndAge)
      pay += (db.bridgeAnnualToday * f * member.birthMonth) / MONTHS; // decision 13a
  }
  return pay;
}

function dbSurvivorShare(db, member, year, ctx) {
  const memberAge = year - member.birthYear;
  return (db.survivorPct / 100) * db.lifetimeAnnualToday * dbIndexFactor(db, memberAge, ctx); // [N14]
}

function cppSurvivor(deceased, survivor, survivorAge, ownCpp, ctx) {
  const dec = cppAnnualFull(deceased, ctx); // [N12]
  const raw =
    survivorAge >= BENEFIT_REFERENCE_AGE
      ? ctx.plain('federal.cpp.survivor.pct_65_plus') * dec
      : ctx.num('federal.cpp.survivor.flat_under_65') +
        ctx.plain('federal.cpp.survivor.pct_under_65') * dec;
  const cap = ctx.num('federal.cpp.survivor.max_combined');
  return Math.max(0, Math.min(ownCpp + raw, cap) - ownCpp);
}

// ---------------------------------------------------------------- accounts

function minFactor(age, ctx) {
  const f = ctx.ageTable('federal.rrif.min_factor', age);
  if (f !== undefined) return f;
  return 1 / (ctx.plain('federal.rrif.min_factor_base_age') - age);
}

function lifLimits(acct, startBal, ageStart, opening, ctx) {
  const min = opening ? 0 : minFactor(ageStart, ctx) * startBal;
  const factorMax = ctx.ageTable('ontario.lif.max_factor', ageStart) * startBal;
  const max = opening ? factorMax : Math.max(factorMax, acct.lifPrevEarnings ?? 0);
  return { min, max };
}

function netGains(realized, carried) {
  if (realized >= 0) {
    const used = Math.min(carried, realized);
    return { taxable: realized - used, carried: carried - used };
  }
  return { taxable: 0, carried: carried - realized };
}

// ---------------------------------------------------------------- the plan

export function runPlan(inputs, cfgEntries) {
  const startYear = inputs.planStartYear;
  const sp = inputs.spouses;
  const deathYear = sp.map((s) => s.birthYear + s.lifeExpectancyTarget);
  const firstDead = deathYear[0] <= deathYear[1] ? 0 : 1; // tie: spouse 1 (index 0) first
  const lastDead = 1 - firstDead;
  const firstDeathYear = deathYear[firstDead];
  const secondDeathYear = deathYear[lastDead];
  if (firstDeathYear === secondDeathYear)
    throw new Error('same-year deaths not exercised by this fixture');
  const firstRetirement = Math.min(sp[0].retirementYear, sp[1].retirementYear);
  const t0 = startYear - firstRetirement;
  const preset = makeCtx(cfgEntries, 0).plain('planning.presets')[inputs.investing.presetId];

  // ---- initial state (initialState): balances are entered at the plan start, which is
  // year index 0, so today's dollars equal future dollars here.
  const accounts = inputs.accounts.map((a) => {
    const acct = {
      id: a.id,
      owner: a.owner,
      type: a.type,
      holdings: emptyHoldings(),
      conversionAge: a.conversionAge,
      lifUnlock50: !!a.lifUnlock50,
      contributionToday: a.annualContributionToday ?? 0,
      openedYear: undefined,
      lifPrevEarnings: undefined,
    };
    if (a.type === 'nonreg') {
      for (const [c, p] of Object.entries(a.positions ?? {})) {
        acct.holdings[c] = { v: p.valueToday, c: p.originalCostToday };
      }
    } else {
      acct.pendingBalance = a.balanceToday; // placed by the preset in the first rebalance
    }
    return acct;
  });
  for (const i of [0, 1]) {
    if (!accounts.some((a) => a.owner === i && a.type === 'nonreg'))
      throw new Error(
        'fixture gives every spouse a non-registered account (decision 12 not exercised)',
      );
  }
  // Already past the conversion age at the plan start: converted, openedYear = start − 1.
  for (const a of accounts) {
    const age = startYear - sp[a.owner].birthYear;
    if (
      (a.type === 'rrsp' || a.type === 'lira') &&
      a.conversionAge !== undefined &&
      age > a.conversionAge
    ) {
      a.type = a.type === 'rrsp' ? 'rrif' : 'lif';
      a.openedYear = startYear - 1;
    }
  }
  // Sheltered balances need a class split before the first rebalance; the first rebalance
  // overwrites it, so any split works. Use the year-0 mix.
  {
    const ctx0 = makeCtx(cfgEntries, 0);
    const mix0 = mixForYear(inputs, ctx0, t0, t0);
    for (const a of accounts) {
      if (a.pendingBalance !== undefined) {
        for (const c of CLASSES)
          a.holdings[c] = { v: a.pendingBalance * mix0[c], c: a.pendingBalance * mix0[c] };
        delete a.pendingBalance;
      }
    }
  }
  accounts.sort(byId);

  const spouses = [0, 1].map((i) => ({
    carriedLoss: 0,
    tfsaRoom: inputs.accounts
      .filter((a) => a.owner === i && a.type === 'tfsa')
      .reduce((s, a) => s + (a.tfsaRoomToday ?? 0), 0),
    tfsaWithdrawnLastYear: 0,
  }));
  let split = { from: 0, share: 0 };
  const rows = [];

  for (let year = startYear; year <= secondDeathYear; year++) {
    const yi = year - startYear;
    const ctx = makeCtx(cfgEntries, yi);
    const R = classReturns(inputs, ctx);
    const age = [0, 1].map((i) => year - sp[i].birthYear);
    const alive = [0, 1].map((i) => year <= deathYear[i]);
    const isWorkingYear = year < firstRetirement;
    const working = [0, 1].map((i) => alive[i] && year < sp[i].retirementYear);
    const afterFirstDeath = year > firstDeathYear;

    // ---- step 1 (part): first-death transfers, before the January 1 conversions (decision 5)
    if (year === firstDeathYear + 1) {
      for (const a of accounts) if (a.owner === firstDead) a.owner = lastDead;
      spouses[firstDead].carriedLoss = 0;
      split = { from: 0, share: 0 };
    }

    // ---- step 0: conversions, unlock, TFSA room
    for (const a of accounts) {
      if (a.type !== 'rrsp' && a.type !== 'lira') continue;
      const ownerAge = year - sp[a.owner].birthYear;
      const latest = ctx.plain('federal.rrif.latest_conversion_age');
      const convAge = a.conversionAge ?? latest;
      if (ownerAge >= Math.min(convAge, latest)) {
        if (a.type === 'rrsp') {
          a.type = 'rrif';
          a.openedYear = year;
        } else {
          a.type = 'lif';
          a.openedYear = year;
          if (a.lifUnlock50) {
            const share = ctx.plain('ontario.lif.unlock_share');
            let dest = accounts.filter(
              (b) => b.owner === a.owner && (b.type === 'rrsp' || b.type === 'rrif'),
            )[0];
            if (!dest)
              throw new Error(
                'unlock with no RRSP/RRIF (decision 11) not exercised by this fixture',
              );
            for (const c of CLASSES) {
              const mv = a.holdings[c].v * share;
              a.holdings[c].v -= mv;
              a.holdings[c].c -= a.holdings[c].c * share;
              dest.holdings[c].v += mv;
              dest.holdings[c].c += mv;
            }
          }
        }
      }
    }
    if (yi > 0) {
      for (const i of [0, 1]) {
        if (!alive[i]) continue;
        spouses[i].tfsaRoom +=
          ctx.num('federal.tfsa.annual_limit') + spouses[i].tfsaWithdrawnLastYear;
      }
    }
    for (const i of [0, 1]) spouses[i].tfsaWithdrawnLastYear = 0;

    // Account records for the row.
    const rec = new Map(
      accounts.map((a) => [
        a.id,
        {
          startNom: bal(a),
          contributionsNom: 0,
          depositsNom: 0,
          reinvestedYieldNom: 0,
          withholdingNom: 0,
          priceReturnNom: 0,
          drawsNom: 0,
          endNom: 0,
        },
      ]),
    );
    const startBal = new Map(accounts.map((a) => [a.id, bal(a)]));

    // ---- step 2: rebalance to this year's targets
    const mix = mixForYear(inputs, ctx, year - firstRetirement, t0);
    const targets = targetHoldings(accounts, mix, preset);
    const rebalanceGains = rebalance(accounts, targets);

    // Cash yields on the January 1 (rebalanced) holdings.
    const cashYield = [0, 1].map(() => ({ ...ZERO_INCOME }));
    const cashYieldByAcct = new Map();
    const shelteredYield = new Map(); // id -> { gross, withholding, byClass }
    for (const a of accounts) {
      if (a.type === 'nonreg') {
        let tot = 0;
        for (const c of CLASSES) {
          const y = a.holdings[c].v * R[c].yield;
          cashYield[a.owner][R[c].incomeType] += y;
          tot += y;
        }
        cashYieldByAcct.set(a.id, tot);
      } else {
        const byClass = {};
        let gross = 0;
        let wh = 0;
        for (const c of CLASSES) {
          const y = a.holdings[c].v * R[c].yield;
          const w =
            R[c].incomeType === 'foreignDividends'
              ? y * ctx.plain('market.foreign_withholding_rate')
              : 0;
          byClass[c] = y - w;
          gross += y;
          wh += w;
        }
        shelteredYield.set(a.id, { gross, withholding: wh, byClass });
      }
    }
    const cashYieldTotal = [...cashYieldByAcct.values()].reduce((s, x) => s + x, 0);

    const spouseRow = [0, 1].map((i) => ({
      age: age[i],
      alive: alive[i],
      cppNom: 0,
      oasNom: 0,
      dbNom: 0,
      payNom: 0,
      withdrawals: {},
      forcedDrawsNom: 0,
      realizedGainsNom: 0,
      taxableIncomeNom: 0,
      taxNom: 0,
      clawbackNom: 0,
      splitShare: 0,
    }));

    // ---- step 3: fixed income
    const fixed = [0, 1].map(() => ({ cpp: 0, oas: 0, db: 0, pay: 0 }));
    for (const i of [0, 1]) {
      if (!alive[i]) continue;
      fixed[i].cpp = cppPaid(sp[i], age[i], ctx);
      fixed[i].oas = oasPaid(sp[i], age[i], ctx);
      for (const db of inputs.dbPensions)
        if (db.owner === i) fixed[i].db += dbPaid(db, sp[i], age[i], ctx);
      if (!isWorkingYear && working[i]) fixed[i].pay = sp[i].afterTaxPayToday * ctx.deflator;
    }
    if (afterFirstDeath && alive[lastDead]) {
      const s = lastDead;
      fixed[s].cpp += cppSurvivor(sp[firstDead], sp[s], age[s], fixed[s].cpp, ctx);
      for (const db of inputs.dbPensions)
        if (db.owner === firstDead) fixed[s].db += dbSurvivorShare(db, sp[firstDead], year, ctx);
    }

    // ---- step 4: RRIF and LIF minimums (taken in working years too)
    const minDraw = new Map();
    const lifMax = new Map();
    for (const a of accounts) {
      if (a.type !== 'rrif' && a.type !== 'lif') continue;
      const ageStart = year - sp[a.owner].birthYear - 1;
      const opening = a.openedYear === year;
      const sb = startBal.get(a.id);
      let min = opening ? 0 : minFactor(ageStart, ctx) * sb;
      if (a.type === 'lif') {
        const lim = lifLimits(a, sb, ageStart, opening, ctx);
        min = lim.min;
        lifMax.set(a.id, lim.max);
      }
      min = Math.min(min, bal(a));
      if (min > 0) minDraw.set(a.id, min);
    }

    let row;
    let diag = {};
    if (isWorkingYear) {
      row = workingYear();
    } else {
      row = retiredYear();
    }
    rows.push(row);

    // ------------------------------------------------------------ working year
    function workingYear() {
      // Minimums: drawn, taxed at the owner's working rate, net saved like CPP and OAS.
      const benefitIncome = [0, 0];
      const minIncome = [0, 0];
      for (const a of accounts) {
        const m = minDraw.get(a.id) ?? 0;
        if (m <= 0) continue;
        sellProRata(a, m);
        rec.get(a.id).drawsNom += m;
        spouseRow[a.owner].withdrawals[a.id] = (spouseRow[a.owner].withdrawals[a.id] ?? 0) + m;
        spouseRow[a.owner].forcedDrawsNom += m;
        minIncome[a.owner] += m;
      }
      let householdDeposits = 0;
      let householdTax = 0;
      const forcedGain = [0, 0];
      for (const i of [0, 1]) {
        const rate = sp[i].workingMarginalRate;
        const ng = netGains(rebalanceGains[i], spouses[i].carriedLoss);
        spouses[i].carriedLoss = ng.carried;
        const yieldAmt = rawIncome(cashYield[i]);
        // [N06, decided] the yield and the rebalance gains taxed at the working rate on the
        // taxable base (gains x inclusion rate), paid from the yield
        const taxYG = rate * workingBase({ ...cashYield[i], capitalGains: ng.taxable }, ctx);
        benefitIncome[i] = fixed[i].cpp + fixed[i].oas + fixed[i].db;
        const taxBen = rate * (benefitIncome[i] + minIncome[i]);
        const nr = accounts.filter((a) => a.owner === i && a.type === 'nonreg')[0];
        const net = yieldAmt - taxYG;
        if (net >= 0) {
          depositProRata(nr, net, mix);
          rec.get(nr.id).depositsNom += net;
          householdDeposits += net;
        } else {
          // decision 9a: this sale's own gain is not taxed this year, but it is realized and
          // nets against the carried loss [N24, decided]
          const g = sellProRata(nr, -net);
          forcedGain[i] = g;
          spouses[i].carriedLoss = netGains(g, spouses[i].carriedLoss).carried;
          rec.get(nr.id).drawsNom += -net;
          spouseRow[i].withdrawals[nr.id] = (spouseRow[i].withdrawals[nr.id] ?? 0) + -net;
          householdDeposits += net;
        }
        // Benefits and minimums, net of tax, to the TFSA within room, then non-registered.
        const benNet = benefitIncome[i] + minIncome[i] - taxBen;
        if (benNet > 0) householdDeposits += depositToSpouse(i, benNet, mix);
        const inc = { ...cashYield[i] };
        inc.capitalGains = ng.taxable;
        inc.cpp = fixed[i].cpp;
        inc.oas = fixed[i].oas;
        inc.pensionEligible = fixed[i].db;
        inc.otherOrdinary += minIncome[i];
        spouseRow[i].cppNom = fixed[i].cpp;
        spouseRow[i].oasNom = fixed[i].oas;
        spouseRow[i].dbNom = fixed[i].db;
        spouseRow[i].realizedGainsNom = rebalanceGains[i] + forcedGain[i];
        spouseRow[i].taxableIncomeNom = incomeTotals(inc, ctx).total; // [N25]
        spouseRow[i].taxNom = taxYG + taxBen;
        householdTax += taxYG + taxBen;
      }
      reinvestShelteredYields();
      applyPriceReturns();
      // Contributions land at the end of the year [N05].
      for (const a of [...accounts]) {
        const amt = a.contributionToday * ctx.deflator;
        if (amt <= 0) continue;
        if (a.type === 'rrsp' || a.type === 'lira') {
          depositProRata(a, amt, mix);
          rec.get(a.id).contributionsNom += amt;
        } else if (a.type === 'rrif' || a.type === 'lif' || a.type === 'nonreg') {
          // decision 9b: a converted RRSP/LIRA's contribution goes to the owner's non-registered
          const nr =
            a.type === 'nonreg'
              ? a
              : accounts.filter((b) => b.owner === a.owner && b.type === 'nonreg')[0];
          depositProRata(nr, amt, mix);
          rec.get(nr.id).contributionsNom += amt;
        } else if (a.type === 'tfsa') {
          const inRoom = Math.min(amt, Math.max(0, spouses[a.owner].tfsaRoom));
          depositProRata(a, inRoom, mix);
          rec.get(a.id).contributionsNom += inRoom;
          spouses[a.owner].tfsaRoom -= inRoom;
          const excess = amt - inRoom;
          if (excess > 0) {
            const nr = accounts.filter((b) => b.owner === a.owner && b.type === 'nonreg')[0];
            depositProRata(nr, excess, mix);
            rec.get(nr.id).contributionsNom += excess;
          }
        }
      }
      // Household identity (working year): benefits + minimums + cash yield − tax = deposits.
      const lhs =
        [0, 1].reduce((s, i) => s + fixed[i].cpp + fixed[i].oas + fixed[i].db, 0) +
        [...minDraw.values()].reduce((s, x) => s + x, 0) +
        cashYieldTotal -
        householdTax;
      if (Math.abs(lhs - householdDeposits) > 0.05) throw new Error(`working identity ${year}`);
      return finishRow({ spendNeed: 0, afterTaxCash: 0, surplus: 0, shortfall: 0 });
    }

    // ------------------------------------------------------------ retired year
    function retiredYear() {
      // Spending need.
      const yrs = year - firstRetirement;
      const [slower, later] = inputs.spending.phases;
      const keep =
        yrs >= later.fromYear ? later.keepPct : yrs >= slower.fromYear ? slower.keepPct : 100;
      if (inputs.spending.mode !== 'one_total') throw new Error('fixture uses one_total');
      let need = MONTHS * inputs.spending.monthlyTotalToday * (keep / 100) * ctx.deflator;
      if (afterFirstDeath) need *= inputs.estate.survivorPct / 100;

      // Take the minimums now (they are not part of W).
      for (const a of accounts) {
        const m = minDraw.get(a.id) ?? 0;
        if (m <= 0) continue;
        sellProRata(a, m);
      }

      const nonregs = accounts.filter((a) => a.type === 'nonreg');
      const tfsas = accounts.filter((a) => a.type === 'tfsa');
      const regs = accounts.filter(
        (a) => a.type === 'rrsp' || a.type === 'rrif' || a.type === 'lif',
      );
      const regCap = (a) =>
        a.type === 'lif'
          ? Math.max(0, Math.min(bal(a), lifMax.get(a.id) - (minDraw.get(a.id) ?? 0)))
          : bal(a);
      const nonregTotal = nonregs.reduce((s, a) => s + bal(a), 0);
      const regTotalCap = regs.reduce((s, a) => s + regCap(a), 0);
      const tfsaTotal = tfsas.reduce((s, a) => s + bal(a), 0);
      const available = nonregTotal + regTotalCap + tfsaTotal;

      // W -> Map(id -> amount), "registered last" order (M6).
      function planDraws(W) {
        const out = new Map();
        const n = Math.min(W, nonregTotal);
        if (n > 0) for (const a of nonregs) out.set(a.id, (n * bal(a)) / nonregTotal);
        let rest = W - n;
        const r = Math.min(rest, regTotalCap);
        if (r > 0) {
          for (const [id, amt] of distributeRegistered(r)) out.set(id, (out.get(id) ?? 0) + amt);
        }
        rest -= r;
        const t = Math.min(rest, tfsaTotal);
        if (t > 0)
          for (const a of tfsas) out.set(a.id, (out.get(a.id) ?? 0) + (t * bal(a)) / tfsaTotal);
        return out;
      }

      function distributeRegistered(r) {
        const poolBal = regs.reduce((s, a) => s + bal(a), 0);
        const given = new Map();
        const excessByOwner = [0, 0];
        for (const a of regs) {
          const share = (r * bal(a)) / poolBal;
          const cap = regCap(a);
          const take = Math.min(share, cap);
          given.set(a.id, take);
          excessByOwner[a.owner] += share - take;
        }
        let leftover = 0;
        for (const o of [0, 1]) {
          if (excessByOwner[o] <= EPS) continue;
          // LIF overflow: the same owner's RRSP/RRIF first, then the other spouse.
          const own = regs
            .filter((a) => a.owner === o && a.type !== 'lif')
            .map((a) => ({ id: a.id, weight: bal(a), cap: regCap(a) }));
          const r1 = waterFill(excessByOwner[o], own, given);
          const other = regs
            .filter((a) => a.owner !== o)
            .map((a) => ({ id: a.id, weight: bal(a), cap: regCap(a) }));
          const r2 = waterFill(r1.left, other, given);
          leftover += r2.left;
        }
        if (leftover > EPS) {
          const all = regs.map((a) => ({ id: a.id, weight: bal(a), cap: regCap(a) }));
          waterFill(leftover, all, given);
        }
        return given;
      }

      // Build each spouse's TaxableIncome and tax for a set of W draws and a split.
      function evaluate(W, sp0) {
        const draws = planDraws(W);
        const realized = [rebalanceGains[0], rebalanceGains[1]];
        const regDraws = [
          { elig: 0, other: 0 },
          { elig: 0, other: 0 },
        ];
        for (const a of accounts) {
          const amt = (draws.get(a.id) ?? 0) + (minDraw.get(a.id) ?? 0);
          if (amt <= 0) continue;
          if (a.type === 'nonreg') {
            const b = bal(a);
            realized[a.owner] += (draws.get(a.id) ?? 0) * (b > 0 ? 1 - cost(a) / b : 0);
          } else if (REGISTERED.has(a.type)) {
            const ownerAge = age[a.owner];
            if (
              (a.type === 'rrif' || a.type === 'lif') &&
              ownerAge >= ctx.plain('federal.credits.pension.min_age_rrif')
            )
              regDraws[a.owner].elig += amt;
            else regDraws[a.owner].other += amt;
          }
        }
        const inc = [0, 1].map((i) => {
          if (!alive[i]) return { ...ZERO_INCOME };
          const ng = netGains(realized[i], spouses[i].carriedLoss);
          return addIncome(cashYield[i], {
            cpp: fixed[i].cpp,
            oas: fixed[i].oas,
            pensionEligible: fixed[i].db + regDraws[i].elig,
            otherOrdinary: regDraws[i].other,
            capitalGains: ng.taxable,
          });
        });
        // Split-eligible pension income [N16]
        const splitElig = [0, 1].map((i) => {
          let e = fixed[i].db;
          for (const a of accounts) {
            if (a.owner !== i || (a.type !== 'rrif' && a.type !== 'lif')) continue;
            if (age[i] >= ctx.plain('federal.split.min_age_rrif'))
              e += (draws.get(a.id) ?? 0) + (minDraw.get(a.id) ?? 0);
          }
          return e;
        });
        const canSplit = alive[0] && alive[1] && !working[0] && !working[1];
        const taxFor = (incs) =>
          [0, 1].map((i) => {
            if (!alive[i]) return { total: 0, clawback: 0, taxableIncome: 0 };
            if (working[i]) {
              const t = sp[i].workingMarginalRate * workingBase(incs[i], ctx);
              return { total: t, clawback: 0, taxableIncome: incomeTotals(incs[i], ctx).total };
            }
            return personalTax(incs[i], age[i], ctx);
          });
        const applySplit = (s) => {
          const out = [{ ...inc[0] }, { ...inc[1] }];
          if (!canSplit || s.share <= 0) return out;
          const amt = s.share * splitElig[s.from];
          out[s.from].pensionEligible -= amt;
          out[1 - s.from].pensionEligible += amt;
          return out;
        };
        const incSplit = applySplit(sp0);
        const taxes = taxFor(incSplit);
        let drawTotal = 0;
        for (const v of draws.values()) drawTotal += v;
        for (const v of minDraw.values()) drawTotal += v;
        const fixedTotal = [0, 1].reduce(
          (s, i) => s + fixed[i].cpp + fixed[i].oas + fixed[i].db + fixed[i].pay,
          0,
        );
        const taxTotal = taxes[0].total + taxes[1].total;
        const cash = fixedTotal + drawTotal + cashYieldTotal - taxTotal;
        return {
          draws,
          realized,
          inc,
          incSplit,
          taxes,
          taxTotal,
          cash,
          canSplit,
          splitElig,
          applySplit,
          taxFor,
        };
      }

      function bestSplit(ev) {
        let best = {
          from: 0,
          share: 0,
          tax: ev.taxFor(ev.applySplit({ from: 0, share: 0 })).reduce((s, t) => s + t.total, 0),
        };
        if (!ev.canSplit) return best;
        const steps = Math.round(ctx.plain('federal.split.max_share') / SPLIT_STEP);
        for (let k = 1; k <= steps; k++) {
          const share = k * SPLIT_STEP;
          for (const from of [0, 1]) {
            if (ev.splitElig[from] <= 0) continue;
            const tax = ev.taxFor(ev.applySplit({ from, share })).reduce((s, t) => s + t.total, 0);
            // lower tax wins; a tie keeps the earlier candidate (smaller share, then spouse 1)
            if (process.env.SPLIT_DEBUG === String(year))
              console.log(year, from, share.toFixed(2), tax.toFixed(6));
            if (tax < best.tax - TIE_TOLERANCE) best = { from, share, tax };
          }
        }
        return best;
      }

      function solve(s) {
        const f = (W) => evaluate(W, s).cash - need;
        if (f(0) >= 0) return { W: 0, shortfall: 0 };
        if (f(available) < 0) return { W: available, shortfall: -f(available) };
        let lo = 0;
        let hi = available;
        let steps = 0;
        while (hi - lo > SOLVER_PRECISION && steps < SOLVER_MAX_STEPS) {
          const mid = (lo + hi) / 2;
          if (f(mid) >= 0) hi = mid;
          else lo = mid;
          steps++;
        }
        if (hi - lo > SOLVER_PRECISION) throw new Error(`bisection did not converge in ${year}`);
        return { W: hi, shortfall: 0 }; // [N27]
      }

      // Split passes (decision 15).
      let current = split.share > 0 ? { ...split } : { from: 0, share: 0 };
      let sol;
      let ev;
      for (let pass = 1; pass <= MAX_SPLIT_PASSES; pass++) {
        sol = solve(current);
        ev = evaluate(sol.W, current);
        const best = bestSplit(ev);
        const same =
          (best.share === 0 && current.share === 0) ||
          (best.share === current.share && best.from === current.from);
        if (same) break;
        if (pass === MAX_SPLIT_PASSES) break; // [N29] keep the last solved split
        current = { from: best.from, share: best.share };
      }
      split = { ...current };

      // ---- apply the year's draws
      for (const a of accounts) {
        const m = minDraw.get(a.id) ?? 0;
        const w = ev.draws.get(a.id) ?? 0;
        if (m + w <= 0) continue;
        if (w > 0) sellProRata(a, w);
        rec.get(a.id).drawsNom += m + w;
        spouseRow[a.owner].withdrawals[a.id] = (spouseRow[a.owner].withdrawals[a.id] ?? 0) + m + w;
        spouseRow[a.owner].forcedDrawsNom += m;
        if (a.type === 'tfsa') spouses[a.owner].tfsaWithdrawnLastYear += w;
      }
      for (const i of [0, 1]) {
        if (!alive[i]) continue;
        const ng = netGains(ev.realized[i], spouses[i].carriedLoss);
        spouses[i].carriedLoss = ng.carried;
        spouseRow[i].cppNom = fixed[i].cpp;
        spouseRow[i].oasNom = fixed[i].oas;
        spouseRow[i].dbNom = fixed[i].db;
        spouseRow[i].payNom = fixed[i].pay;
        spouseRow[i].realizedGainsNom = ev.realized[i];
        spouseRow[i].taxableIncomeNom = ev.taxes[i].taxableIncome;
        spouseRow[i].taxNom = ev.taxes[i].total;
        spouseRow[i].clawbackNom = ev.taxes[i].clawback;
        spouseRow[i].splitShare = ev.canSplit && current.from === i ? current.share : 0;
        spouseRow[i].incomeSplit = ev.incSplit[i];
      }

      reinvestShelteredYields();

      // ---- step 6: surplus
      // A surplus exists only when no extra withdrawal was needed (W = 0); when W was found by
      // bisection, cash exceeds the need by less than the solver precision and is not a
      // surplus [N27].
      const surplus = sol.W === 0 ? Math.max(0, ev.cash - need) : 0;
      if (surplus > 0) {
        const forced = [0, 1].map((i) => spouseRow[i].forcedDrawsNom);
        const fsum = forced[0] + forced[1];
        let shares;
        if (fsum > 0) shares = forced.map((f) => f / fsum);
        else {
          const fx = [0, 1].map((i) =>
            alive[i] ? fixed[i].cpp + fixed[i].oas + fixed[i].db + fixed[i].pay : 0,
          );
          const s = fx[0] + fx[1];
          if (s > 0) shares = fx.map((x) => x / s);
          else {
            const n = alive.filter(Boolean).length;
            shares = alive.map((al) => (al ? 1 / n : 0));
          }
        }
        for (const i of [0, 1]) if (shares[i] > 0) depositToSpouse(i, surplus * shares[i], mix);
      }

      applyPriceReturns();

      // Household identity (retired year).
      let draws = 0;
      let deposits = 0;
      for (const r of rec.values()) {
        draws += r.drawsNom;
        deposits += r.depositsNom;
      }
      const fixedTotal = [0, 1].reduce(
        (s, i) => s + fixed[i].cpp + fixed[i].oas + fixed[i].db + fixed[i].pay,
        0,
      );
      const lhs = draws + fixedTotal + cashYieldTotal - ev.taxTotal - deposits;
      if (Math.abs(lhs - (need - sol.shortfall)) > 0.05)
        throw new Error(`retired identity ${year}: ${lhs} vs ${need}`);

      const estate = year === secondDeathYear ? finalReturn() : undefined;
      // Diagnostics only (not written to the CSV).
      diag = {
        W: sol.W,
        regExtra: regs.reduce((s, a) => s + (ev.draws.get(a.id) ?? 0), 0),
        tfsaDraw: tfsas.reduce((s, a) => s + (ev.draws.get(a.id) ?? 0), 0),
        lifCapped: regs.some(
          (a) => a.type === 'lif' && regCap(a) > 0 && (ev.draws.get(a.id) ?? 0) >= regCap(a) - 1e-6,
        ),
        split: { ...current },
      };
      return finishRow({
        spendNeed: need,
        afterTaxCash: ev.cash,
        surplus,
        shortfall: sol.shortfall,
        estate,
      });
    }

    // ------------------------------------------------------------ shared steps
    function depositToSpouse(i, amount, mixNow) {
      // The spouse's first TFSA by id within room, then their first non-registered (decision 14).
      const tfsa = accounts.filter((a) => a.owner === i && a.type === 'tfsa')[0];
      let left = amount;
      if (tfsa) {
        const inRoom = Math.min(left, Math.max(0, spouses[i].tfsaRoom));
        if (inRoom > 0) {
          depositProRata(tfsa, inRoom, mixNow);
          rec.get(tfsa.id).depositsNom += inRoom;
          spouses[i].tfsaRoom -= inRoom;
          left -= inRoom;
        }
      }
      if (left > 0) {
        const nr = accounts.filter((a) => a.owner === i && a.type === 'nonreg')[0];
        depositProRata(nr, left, mixNow);
        rec.get(nr.id).depositsNom += left;
      }
      return amount;
    }

    function reinvestShelteredYields() {
      for (const a of accounts) {
        const y = shelteredYield.get(a.id);
        if (!y) continue;
        for (const c of CLASSES) {
          a.holdings[c].v += y.byClass[c];
          a.holdings[c].c += y.byClass[c];
        }
        rec.get(a.id).reinvestedYieldNom += y.gross;
        rec.get(a.id).withholdingNom += y.withholding;
      }
    }

    function applyPriceReturns() {
      for (const a of accounts) {
        let pr = 0;
        for (const c of CLASSES) {
          const g = a.holdings[c].v * R[c].price;
          a.holdings[c].v += g;
          pr += g;
        }
        rec.get(a.id).priceReturnNom += pr;
        if (a.type === 'lif') {
          const r = rec.get(a.id);
          a.lifPrevEarnings = r.reinvestedYieldNom - r.withholdingNom + pr; // [N19]
        }
      }
    }

    function finalReturn() {
      const d = lastDead;
      let deemedReg = 0;
      let gross = 0;
      for (const a of accounts) {
        if (REGISTERED.has(a.type)) deemedReg += bal(a);
        if (a.type === 'nonreg') gross += bal(a) - cost(a);
      }
      const deemedGains = Math.max(0, gross - spouses[d].carriedLoss);
      const yearInc = spouseRow[d].incomeSplit;
      const full = addIncome(yearInc, { otherOrdinary: deemedReg, capitalGains: deemedGains });
      const fullTax = personalTax(full, age[d], ctx).total;
      const finalTax = fullTax - spouseRow[d].taxNom;
      const home = (inputs.estate.homeValueToday ?? 0) * ctx.deflator;
      const nonregEnd = accounts.filter((a) => a.type === 'nonreg').reduce((s, a) => s + bal(a), 0);
      const base = Math.max(0, nonregEnd + home - finalTax);
      const thr = ctx.num('ontario.probate.threshold');
      const probate = base <= thr ? 0 : ctx.plain('ontario.probate.rate') * (base - thr);
      const all = accounts.reduce((s, a) => s + bal(a), 0);
      return {
        deemedRegisteredNom: deemedReg,
        deemedGainsNom: deemedGains,
        finalReturnTaxNom: finalTax,
        homeNom: home,
        probateNom: probate,
        afterTaxLegacyNom: all + home - finalTax - probate,
      };
    }

    function finishRow({ spendNeed, afterTaxCash, surplus, shortfall, estate }) {
      const acc = {};
      for (const a of accounts) {
        const r = rec.get(a.id);
        r.endNom = bal(a);
        const lhs =
          r.startNom +
          r.contributionsNom +
          r.depositsNom +
          r.reinvestedYieldNom -
          r.withholdingNom +
          r.priceReturnNom -
          r.drawsNom;
        if (Math.abs(lhs - r.endNom) > 0.05) throw new Error(`account identity ${year} ${a.id}`);
        for (const c of CLASSES) {
          if (a.holdings[c].v < -1e-6 || a.holdings[c].c < -1e-6)
            throw new Error(`negative ${year} ${a.id} ${c}`);
        }
        acc[a.id] = r;
      }
      return {
        year,
        spouse: spouseRow,
        accounts: acc,
        balancesEndNom: Object.fromEntries(accounts.map((a) => [a.id, bal(a)])),
        cashYieldNom: cashYieldTotal,
        spendNeedNom: spendNeed,
        afterTaxCashNom: afterTaxCash,
        surplusNom: surplus,
        shortfallNom: shortfall,
        estate: estate ?? {
          deemedRegisteredNom: 0,
          deemedGainsNom: 0,
          finalReturnTaxNom: 0,
          homeNom: 0,
          probateNom: 0,
          afterTaxLegacyNom: 0,
        },
        _diag: diag,
        _types: Object.fromEntries(accounts.map((a) => [a.id, `${a.type}@${a.owner}`])),
      };
    }
  }
  return rows;
}
