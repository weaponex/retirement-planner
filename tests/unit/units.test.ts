import { describe, expect, it } from 'vitest';
import { loadConfig, rebaseConfig } from '../../src/engine/config/load';
import { applyRuleOverrides } from '../../src/engine/config/overrides';
import { makeDeflator, normalizeInputs, toDisplay } from '../../src/engine/units';
import { noEstate } from '../../src/engine/solver/yearSolve';
import type { SpouseYear, YearRow } from '../../src/engine/types';
import { couplePlan, valueOf } from './helpers/couplePlan';

const cfg = loadConfig();
const inflation = valueOf<number>(cfg, 'market.inflation');
const year = cfg.taxYear;

describe('normalizeInputs', () => {
  it('converts today-dollar inputs to future dollars at the plan start', () => {
    const plan = couplePlan();
    const n = normalizeInputs(plan, cfg);
    expect(n.spouses[0].cppAt65Nom).toBe(plan.spouses[0].cppAt65Today);
    expect(n.accounts[0]!.balanceNom).toBe(plan.accounts[0]!.balanceToday);
    expect(n.accounts.find((a) => a.id === 'nonreg-0-1')!.positions!.cad_equity).toEqual({
      valueNom: 90_000,
      costNom: 60_000,
    });
    expect(n.spending.monthlyTotalNom).toBe(plan.spending.monthlyTotalToday);
  });

  it('leaves fixed and none DB amounts nominal', () => {
    const plan = couplePlan({
      dbPensions: [
        { owner: 0, lifetimeAnnualToday: 20_000, startAge: 65, indexing: 'none', survivorPct: 60 },
        {
          owner: 1,
          lifetimeAnnualToday: 10_000,
          startAge: 65,
          bridgeAnnualToday: 5_000,
          bridgeEndAge: 65,
          indexing: 'fixed',
          indexRate: 0.01,
          survivorPct: 50,
        },
      ],
    });
    const n = normalizeInputs(plan, cfg);
    expect(n.dbPensions[0]!.lifetimeAnnualNom).toBe(20_000);
    expect(n.dbPensions[1]!.bridgeAnnualNom).toBe(5_000);
    expect(n.dbPensions[1]!.indexRate).toBe(0.01);
  });
});

describe('toDisplay', () => {
  const spouse: SpouseYear = {
    age: 70,
    alive: true,
    cppNom: 1000,
    oasNom: 500,
    dbNom: 0,
    payNom: 0,
    withdrawals: { 'rrsp-0-1': 2000 },
    forcedDrawsNom: 0,
    realizedGainsNom: 0,
    taxableIncomeNom: 3500,
    taxNom: 100,
    clawbackNom: 0,
    splitShare: 0.25,
  };
  const row = (y: number): YearRow => ({
    year: y,
    spouse: [spouse, spouse],
    accounts: {},
    balancesEndNom: { 'rrsp-0-1': 10_000 },
    cashYieldNom: 0,
    spendNeedNom: 4000,
    afterTaxCashNom: 4000,
    surplusNom: 0,
    shortfallNom: 0,
    estate: noEstate(),
  });

  it('divides money by the deflator for each row and keeps other numbers', () => {
    const deflator = makeDeflator(cfg);
    const [first, second] = toDisplay([row(2026), row(2027)], deflator);
    expect(first!.spendNeedToday).toBe(4000);
    expect(second!.spendNeedToday).toBeCloseTo(4000 / (1 + inflation), 9);
    expect(second!.spouse[0].withdrawals['rrsp-0-1']).toBeCloseTo(2000 / (1 + inflation), 9);
    // Year-end balances are converted at the end of their year (AR2-R1).
    expect(first!.balancesEndToday['rrsp-0-1']).toBeCloseTo(10_000 / (1 + inflation), 9);
    expect(second!.balancesEndToday['rrsp-0-1']).toBeCloseTo(10_000 / (1 + inflation) ** 2, 9);
    expect(second!.spouse[0].age).toBe(70);
    expect(second!.spouse[0].splitShare).toBe(0.25);
    expect(second!.year).toBe(2027);
  });

  it('round-trips an input through normalizeInputs at the plan start', () => {
    const n = normalizeInputs(couplePlan(), cfg);
    const r = { ...row(2026), spendNeedNom: n.spending.monthlyTotalNom };
    expect(toDisplay([r], makeDeflator(cfg))[0]!.spendNeedToday).toBe(
      couplePlan().spending.monthlyTotalToday,
    );
  });
});

describe('rebaseConfig, three years after the tax year', () => {
  const later = rebaseConfig(cfg, year + 3);
  const f = (1 + inflation) ** 3;
  const v = <T>(key: string) => valueOf<T>(later, key);

  it('rebases an indexed number and leaves an unindexed one', () => {
    expect(v<number>('federal.credits.basic')).toBeCloseTo(
      valueOf<number>(cfg, 'federal.credits.basic') * f,
      6,
    );
    expect(v('federal.credits.pension.amount')).toBe(
      valueOf(cfg, 'federal.credits.pension.amount'),
    );
    expect(later.entries.get('federal.credits.basic')!.taxYear).toBe(year + 3);
  });

  it('rebases bracket rows by their own flags', () => {
    const before = valueOf<{ from: number; indexed?: boolean }[]>(cfg, 'ontario.tax.brackets');
    const after = v<{ from: number }[]>('ontario.tax.brackets');
    before.forEach((row, i) => {
      const expected = row.indexed === false ? row.from : row.from * f;
      expect(after[i]!.from).toBeCloseTo(expected, 6);
    });
  });

  it('rebases an indexed list', () => {
    const before = valueOf<number[]>(cfg, 'ontario.surtax.thresholds');
    v<number[]>('ontario.surtax.thresholds').forEach((n, i) =>
      expect(n).toBeCloseTo(before[i]! * f, 6),
    );
  });

  it('rebases phase-in from and cap only when indexed', () => {
    const before = valueOf<{ from: number; cap: number }[]>(cfg, 'ontario.health_premium.schedule');
    const indexed = cfg.entries.get('ontario.health_premium.schedule')!.indexed;
    const after = v<{ from: number; cap: number }[]>('ontario.health_premium.schedule');
    before.forEach((row, i) => {
      expect(after[i]!.from).toBeCloseTo(indexed ? row.from * f : row.from, 6);
      expect(after[i]!.cap).toBeCloseTo(indexed ? row.cap * f : row.cap, 6);
    });
    // Check the indexed path too, on a copy marked indexed.
    const entries = new Map(cfg.entries);
    entries.set('ontario.health_premium.schedule', {
      ...cfg.entries.get('ontario.health_premium.schedule')!,
      indexed: true,
    });
    const forced = valueOf<{ from: number; cap: number }[]>(
      rebaseConfig({ ...cfg, entries }, year + 3),
      'ontario.health_premium.schedule',
    );
    expect(forced[0]!.from).toBeCloseTo(before[0]!.from * f, 6);
    expect(forced[0]!.cap).toBeCloseTo(before[0]!.cap * f, 6);
  });

  it('leaves age tables untouched', () => {
    expect(v('federal.rrif.min_factor')).toEqual(valueOf(cfg, 'federal.rrif.min_factor'));
  });

  it('rebases a stale override from its own tax year', () => {
    const overridden = applyRuleOverrides(cfg, {
      'federal.oas.recovery.threshold': { value: 90_000, defaultTaxYear: year - 1 },
    });
    expect(
      valueOf<number>(rebaseConfig(overridden, year + 3), 'federal.oas.recovery.threshold'),
    ).toBeCloseTo(90_000 * (1 + inflation) ** 4, 6);
  });

  it('uses an overridden inflation rate', () => {
    const overridden = applyRuleOverrides(cfg, {
      'market.inflation': { value: 0.03, defaultTaxYear: year },
    });
    expect(
      valueOf<number>(rebaseConfig(overridden, year + 3), 'federal.credits.basic'),
    ).toBeCloseTo(valueOf<number>(cfg, 'federal.credits.basic') * 1.03 ** 3, 6);
  });
});
