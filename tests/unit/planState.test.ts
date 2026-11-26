import { planValue } from '../../src/engine/config/read';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/engine/config/load';
import type { Result } from '../../src/engine/types';
import { CATEGORY_IDS, categoryName } from '../../src/state/categories';
import { changeSummary, describeEdits } from '../../src/state/changeSummary';
import { emptyPlan } from '../../src/state/defaults';
import { deleteAt, getAt, setAt } from '../../src/state/draft';
import { money, moneyDiff, moneyShort, percent } from '../../src/state/format';
import { fieldLabel } from '../../src/state/labels';
import { mixTotal, setMixShare } from '../../src/state/mix';
import { readyToRun } from '../../src/state/readiness';
import { completePlan, TODAY } from './helpers/draftPlan';

const cfg = loadConfig();

describe('draft paths', () => {
  const d = completePlan();
  it('reads and writes by path, with accounts addressed by id', () => {
    expect(getAt(d, 'spouses.0.birthYear')).toBe(1961);
    expect(getAt(d, 'accounts.rrsp-0-1.balanceToday')).toBe(500_000);
    expect(getAt(d, 'accounts.nope.balanceToday')).toBeUndefined();
    expect(getAt(d, 'spouses.0.birthYear.x')).toBeUndefined();
    const e = setAt(d, 'accounts.rrsp-0-1.balanceToday', 1);
    expect(getAt(e, 'accounts.rrsp-0-1.balanceToday')).toBe(1);
    expect(getAt(d, 'accounts.rrsp-0-1.balanceToday')).toBe(500_000); // a copy
    const f = setAt(d, 'investing.returnOverride.bonds', 0.03);
    expect(getAt(f, 'investing.returnOverride.bonds')).toBe(0.03);
  });

  it('deletes optional keys, and leaves the draft alone for a path that is not an object', () => {
    const f = setAt(d, 'investing.returnOverride.bonds', 0.03);
    expect(
      getAt(deleteAt(f, 'investing.returnOverride.bonds'), 'investing.returnOverride'),
    ).toEqual({});
    expect(deleteAt(d, 'spouses.0.birthYear.x')).toBe(d);
    expect(deleteAt(d, 'accounts.0')).toBe(d); // an array, not an object
    expect('schemaVersion' in deleteAt(d, 'schemaVersion')).toBe(false);
  });
});

describe('readyToRun', () => {
  it('accepts a complete plan and fills unused fields', () => {
    const r = readyToRun(completePlan());
    expect(r.ready).toBe(true);
    if (r.ready) {
      expect(r.inputs.spouses[0].grossPayToday).toBeUndefined();
      expect(r.inputs.spouses[0].arrivedInCanadaYear).toBeUndefined();
    }
    const byCategory = setAt(completePlan(), 'spending.mode', 'by_category');
    const r2 = readyToRun(setAt(byCategory, 'spending.monthlyTotalToday', null));
    expect(r2.ready).toBe(true);
  });

  it('uses the average CPP at 65 for an empty estimate, and drops empty group amounts', () => {
    let d = setAt(completePlan(), 'spouses.0.cppAtStartToday', null);
    d = setAt(d, 'spending.groupsMonthlyToday', { home: 1200, food: null });
    const r = readyToRun(d, cfg);
    expect(r.ready).toBe(true);
    if (r.ready) {
      expect(r.inputs.spouses[0].cppAtStartToday).toBeUndefined();
      expect(r.inputs.spouses[0].cppAt65Today).toBeCloseTo(
        planValue(cfg, 'federal.cpp.average_at_65') / 12,
      );
      expect(r.inputs.spending.groupsMonthlyToday).toEqual({ home: 1200 });
    }
    const both = readyToRun(setAt(completePlan(), 'spouses.0.cppAt65Today', undefined));
    expect(both.ready).toBe(false);
  });

  it('checks each account mix adds up to 100', () => {
    const d = setAt(completePlan(), 'accounts.rrsp-0-1.mix', {
      cad_equity: 50,
      us_equity: 0,
      intl_equity: 0,
      em_equity: 0,
      bonds: 0,
      cash: 0,
    });
    const r = readyToRun(d);
    expect(r.ready).toBe(false);
    if (!r.ready) expect(r.missing[0]!.path).toBe('accounts.rrsp-0-1.mix');
  });

  it('lists empty fields as not entered yet, with labels', () => {
    const r = readyToRun(emptyPlan(cfg, TODAY));
    expect(r.ready).toBe(false);
    if (!r.ready) {
      expect(r.missing.map((m) => m.path)).toContain('spouses.0.birthYear');
      expect(r.missing.find((m) => m.path === 'spouses.1.birthYear')!.message).toBe(
        'Birth year, Spouse 2: not entered yet',
      );
    }
  });

  it('needs a working tax rate only for a spouse still working', () => {
    const d = setAt(completePlan(), 'spouses.1.retirementYear', 2030);
    const r = readyToRun(d);
    expect(r.ready).toBe(false);
    if (!r.ready) expect(r.missing.map((m) => m.path)).toEqual(['spouses.1.grossPayToday']);
  });

  it('reports rule breaks: mix total, phase order, target, account fields by id', () => {
    let d = completePlan();
    d = setAt(d, 'investing.mix.cash', 6);
    d = setAt(d, 'spending.phases.1.fromYear', 10);
    d = setAt(d, 'spouses.0.lifeExpectancyTarget', 64);
    d = setAt(d, 'accounts.rrsp-0-1.balanceToday', -5);
    const r = readyToRun(d);
    expect(r.ready).toBe(false);
    if (!r.ready) {
      const paths = r.missing.map((m) => m.path);
      expect(paths).toEqual(
        expect.arrayContaining([
          'investing.mix',
          'spending.phases.1.fromYear',
          'spouses.0.lifeExpectancyTarget',
          'accounts.rrsp-0-1.balanceToday',
        ]),
      );
      expect(r.missing.find((m) => m.path === 'investing.mix')!.message).toContain('101%');
    }
  });

  it('caps accounts and DB pensions per spouse', () => {
    const d = completePlan();
    const accounts = Array.from({ length: 9 }, (_, n) => ({
      id: `tfsa-0-${n + 1}`,
      owner: 0 as const,
      type: 'tfsa' as const,
      balanceToday: 1,
      annualContributionToday: 0,
    }));
    const dbs = Array.from({ length: 3 }, () => ({
      owner: 1 as const,
      lifetimeAnnualToday: 1,
      startAge: 65,
      indexing: 'full' as const,
      survivorPct: 60,
    }));
    const r = readyToRun({ ...d, accounts, dbPensions: dbs });
    expect(r.ready).toBe(false);
    if (!r.ready) {
      expect(r.missing.map((m) => m.message).join(' ')).toContain('At most 8 accounts');
      expect(r.missing.map((m) => m.path)).toContain('dbPensions');
    }
  });
});

describe('labels', () => {
  const d = completePlan();
  it('names spouse, account, pension, mix, category and other paths', () => {
    expect(fieldLabel('spouses.0.retirementYear', d)).toBe('Retirement age, Alex');
    expect(fieldLabel('spouses.0.unknownField', d)).toBe('unknownField, Alex');
    expect(fieldLabel('accounts.rrsp-0-1.balanceToday', d)).toBe("Alex's RRSP balance");
    expect(fieldLabel('accounts.tfsa-1-2.tfsaRoomToday', d)).toBe("Sam's TFSA 2 TFSA room");
    expect(fieldLabel('accounts.zzz-1-1.other', d)).toBe("Sam's zzz other");
    expect(fieldLabel('dbPensions.0.startAge', d)).toBe('Workplace pension 1: startAge');
    expect(fieldLabel('investing.mix.bonds', d)).toBe('Mix: bonds');
    expect(fieldLabel('investing.returnOverride.bonds', d)).toBe('Expected return');
    expect(fieldLabel('spending.categories.travel_gear.monthlyToday', d)).toBe('Travel: Gear');
    expect(fieldLabel('ruleOverrides.federal.oas.recovery.threshold', d)).toBe(
      'A rule value in Settings',
    );
    expect(fieldLabel('estate.survivorPct', d)).toBe('Survivor spending');
    expect(fieldLabel('something.else', d)).toBe('something.else');
    expect(fieldLabel('spouses.1.name', setAt(d, 'spouses.1.name', '  '))).toBe('Name, Spouse 2');
  });

  it('knows every category id', () => {
    expect(CATEGORY_IDS).toHaveLength(29);
    expect(new Set(CATEGORY_IDS).size).toBe(29);
    expect(categoryName('groceries')).toBe('Groceries');
    expect(categoryName('nope')).toBe('nope');
  });
});

describe('setMixShare', () => {
  const mix = { cad_equity: 20, us_equity: 25, intl_equity: 10, em_equity: 5, bonds: 35, cash: 5 };
  it('moves the other classes in proportion, in whole percent adding up to 100', () => {
    const m = setMixShare(mix, 'bonds', 50);
    expect(m.bonds).toBe(50);
    expect(mixTotal(m)).toBe(100);
    expect(m.cad_equity).toBeLessThan(20);
  });
  it('keeps a class at 0% at 0%, and clamps to 0..100', () => {
    const m = setMixShare({ ...mix, em_equity: 0, cad_equity: 25 }, 'bonds', 40);
    expect(m.em_equity).toBe(0);
    expect(setMixShare(mix, 'cash', 140).cash).toBe(100);
    expect(setMixShare(mix, 'cash', -3).cash).toBe(0);
  });
  it('leaves the total off 100 when nothing else is held', () => {
    const only = { cad_equity: 100, us_equity: 0, intl_equity: 0, em_equity: 0, bonds: 0, cash: 0 };
    expect(mixTotal(setMixShare(only, 'cad_equity', 80))).toBe(80);
    expect(mixTotal({ ...only, bonds: null })).toBe(100);
  });
});

describe('format', () => {
  it('formats money, short money, differences and percents', () => {
    expect(money(1234.4)).toBe('$1,234');
    expect(money(-1234)).toBe('−$1,234');
    expect(moneyShort(999)).toBe('$999');
    expect(moneyShort(62_400)).toBe('$62k');
    expect(moneyShort(-62_400)).toBe('−$62k');
    expect(moneyDiff(-6_400)).toBe('6,000');
    expect(moneyDiff(437)).toBe('440');
    expect(percent(0.072, 1)).toBe('7.2%');
    expect(percent(0.5)).toBe('50%');
  });
});

describe('changeSummary', () => {
  const d = completePlan();
  const result = (o: {
    met?: boolean;
    first?: number;
    legacy?: number;
    tax?: number;
    clawback?: number;
  }) =>
    ({
      goals: {
        spending: { met: o.met ?? true, firstShortfallYear: o.first },
        legacy: { afterTaxLegacyToday: o.legacy ?? 100_000 },
      },
      plan: { summary: { lifetimeTaxToday: o.tax ?? 50_000, clawbackYears: o.clawback ?? 0 } },
    }) as unknown as Result;

  it('names one edit, counts several, and says when there were none', () => {
    expect(describeEdits([], d)).toBe('No change');
    expect(describeEdits(['spouses.0.retirementYear', 'spouses.0.retirementYear'], d)).toBe(
      'Retirement age, Alex',
    );
    expect(describeEdits(['spouses.0.retirementYear', 'estate.survivorPct'], d)).toBe(
      '2 changes: Retirement age, Alex, Survivor spending',
    );
  });

  it('lists the headline numbers that changed', () => {
    const s = changeSummary(
      result({}),
      result({ met: false, first: 2041, legacy: 38_000, tax: 56_000, clawback: 3 }),
      ['estate.survivorPct'],
      d,
    );
    expect(s.changes).toEqual([
      'spending covered: yes → no',
      'first shortfall year none → 2041',
      'legacy 62,000 lower',
      'tax 6,000 higher',
      'clawback years 0 → 3',
    ]);
    const back = changeSummary(result({ met: false, first: 2041 }), result({}), [], d);
    expect(back.changes).toEqual([
      'spending covered: no → yes',
      'first shortfall year 2041 → none',
    ]);
    expect(changeSummary(result({}), result({ legacy: 100_000.4 }), [], d).changes).toEqual([]);
  });
});
