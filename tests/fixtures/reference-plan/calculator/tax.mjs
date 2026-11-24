// Personal tax for one return (federal + Ontario + OAS recovery tax), from the design's
// Tax scope (O11) section. `ctx` comes from config.mjs makeCtx.

export const ZERO_INCOME = Object.freeze({
  pensionEligible: 0,
  oas: 0,
  cpp: 0,
  otherOrdinary: 0,
  eligibleDividends: 0,
  foreignDividends: 0,
  capitalGains: 0,
});

export function addIncome(a, b) {
  const out = {};
  for (const k of Object.keys(ZERO_INCOME)) out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  return out;
}

// Plain sum of the TaxableIncome fields (cash dividends, full gains). Used for the
// working-marginal-rate tax.
export function rawIncome(inc) {
  let s = 0;
  for (const k of Object.keys(ZERO_INCOME)) s += inc[k];
  return s;
}

// The working-marginal-rate base (author's decision, 2026-11-24): taxable amounts with
// eligible dividends at their cash amount (not grossed up) and capital gains (already net of
// losses and the carried loss) times the inclusion rate, floored at 0.
export function workingBase(inc, ctx) {
  const base =
    inc.pensionEligible +
    inc.oas +
    inc.cpp +
    inc.otherOrdinary +
    inc.eligibleDividends +
    inc.foreignDividends +
    inc.capitalGains * ctx.plain('federal.capital_gains.inclusion_rate');
  return Math.max(0, base);
}

export function incomeTotals(inc, ctx) {
  const grossDiv = inc.eligibleDividends * (1 + ctx.plain('federal.dividend.eligible.gross_up'));
  const total =
    inc.pensionEligible +
    inc.oas +
    inc.cpp +
    inc.otherOrdinary +
    grossDiv +
    inc.foreignDividends +
    inc.capitalGains * ctx.plain('federal.capital_gains.inclusion_rate');
  const clawback = Math.min(
    inc.oas,
    ctx.plain('federal.oas.recovery.rate') *
      Math.max(0, total - ctx.num('federal.oas.recovery.threshold')),
  );
  return { total, grossDiv, clawback, net: total - clawback };
}

function bracketTax(rows, x) {
  let tax = 0;
  for (let i = 0; i < rows.length; i++) {
    const lo = rows[i].from;
    const hi = i + 1 < rows.length ? rows[i + 1].from : Infinity;
    if (x > lo) tax += rows[i].rate * (Math.min(x, hi) - lo);
  }
  return tax;
}

function ageAmount(age, net, amountKey, thresholdKey, rateKey, ctx) {
  if (age < ctx.plain('federal.credits.age.min_age')) return 0;
  return Math.max(
    0,
    ctx.num(amountKey) - ctx.plain(rateKey) * Math.max(0, net - ctx.num(thresholdKey)),
  );
}

export function federalTax(inc, age, ctx) {
  const t = incomeTotals(inc, ctx);
  const rows = ctx.brackets('federal.tax.brackets');
  const taxable = t.net;
  const basic = ctx.num('federal.credits.basic');
  const basicMin = ctx.num('federal.credits.basic_min');
  const b4 = rows[3].from;
  const b5 = rows[4].from;
  let bpa;
  if (taxable <= b4) bpa = basic;
  else if (taxable >= b5) bpa = basicMin;
  else bpa = basic - ((basic - basicMin) * (taxable - b4)) / (b5 - b4);
  const ageAmt = ageAmount(
    age,
    t.net,
    'federal.credits.age.amount',
    'federal.credits.age.reduction_threshold',
    'federal.credits.age.reduction_rate',
    ctx,
  );
  const pension = Math.min(ctx.num('federal.credits.pension.amount'), inc.pensionEligible);
  const credits = (bpa + ageAmt + pension) * rows[0].rate;
  const divCredit = ctx.plain('federal.dividend.eligible.credit_rate') * t.grossDiv;
  const tax = Math.max(0, bracketTax(rows, taxable) - credits - divCredit);
  return { tax, clawback: t.clawback, totals: t };
}

export function ontarioTax(inc, age, ctx) {
  const t = incomeTotals(inc, ctx);
  const taxable = t.net;
  const rows = ctx.brackets('ontario.tax.brackets');
  const bt = bracketTax(rows, taxable);
  const ageAmt = ageAmount(
    age,
    t.net,
    'ontario.credits.age.amount',
    'ontario.credits.age.reduction_threshold',
    'ontario.credits.age.reduction_rate',
    ctx,
  );
  const pension = Math.min(ctx.num('ontario.credits.pension.amount'), inc.pensionEligible);
  const credits = (ctx.num('ontario.credits.basic') + ageAmt + pension) * rows[0].rate;
  const basicTax = Math.max(0, bt - credits);
  const thr = ctx.list('ontario.surtax.thresholds');
  const rates = ctx.list('ontario.surtax.rates');
  let surtax = 0;
  for (let i = 0; i < thr.length; i++) surtax += rates[i] * Math.max(0, basicTax - thr[i]);
  const afterDiv = Math.max(
    0,
    basicTax + surtax - ctx.plain('ontario.dividend.eligible.credit_rate') * t.grossDiv,
  );
  const reduction = Math.max(0, 2 * ctx.num('ontario.tax_reduction.basic') - afterDiv);
  const afterReduction = Math.max(0, afterDiv - reduction);
  const hp = healthPremium(taxable, ctx);
  return afterReduction + hp;
}

function healthPremium(income, ctx) {
  const rows = ctx.phaseIn('ontario.health_premium.schedule');
  let amount = 0;
  for (let i = 0; i < rows.length; i++) {
    if (income < rows[i].from) break;
    const prevCap = i === 0 ? 0 : rows[i - 1].cap;
    amount = Math.min(rows[i].cap, prevCap + rows[i].rate * (income - rows[i].from));
  }
  return amount;
}

export function personalTax(inc, age, ctx) {
  const f = federalTax(inc, age, ctx);
  const provincial = ontarioTax(inc, age, ctx);
  return {
    federal: f.tax,
    provincial,
    clawback: f.clawback,
    total: f.tax + provincial + f.clawback,
    taxableIncome: f.totals.net,
  };
}
