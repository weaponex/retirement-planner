import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/engine/config/load';
import type { PlanInputs, Result } from '../../src/engine/types';
import { defaultLifeExpectancy, emptyPlan, startingMix } from '../../src/state/defaults';
import { setAt } from '../../src/state/draft';
import { createPlanStore, RUN_DELAY_MS, statusOf, inputAt } from '../../src/state/store';
import type { EngineCallbacks } from '../../src/worker/client';
import { completePlan } from './helpers/draftPlan';

const cfg = loadConfig();
const TODAY = new Date(2026, 10, 24);

function setup(initial = emptyPlan(cfg, TODAY)) {
  const runs: { inputs: PlanInputs; revision: number }[] = [];
  let cb!: EngineCallbacks;
  const store = createPlanStore({
    cfg,
    now: () => TODAY,
    initial,
    connect(callbacks) {
      cb = callbacks;
      return { run: (inputs, revision) => runs.push({ inputs, revision }), dispose() {} };
    },
  });
  return { store, runs, cb: () => cb };
}

const fakeResult = (revision: number, legacy = 100_000) =>
  ({
    revision,
    goals: {
      spending: { met: true },
      legacy: { afterTaxLegacyToday: legacy },
    },
    plan: { summary: { lifetimeTaxToday: 1000, clawbackYears: 0 } },
  }) as unknown as Result;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the store', () => {
  it('starts incomplete with an empty plan and sends nothing', () => {
    const { store, runs } = setup();
    const s = store.getState();
    expect(statusOf(s)).toBe('incomplete');
    expect(s.missing.length).toBeGreaterThan(0);
    expect(s.view).toBe('household');
    expect(runs).toEqual([]);
  });

  it('runs a ready plan at once, then 500 ms after the last edit', () => {
    const { store, runs } = setup(completePlan());
    expect(runs.map((r) => r.revision)).toEqual([0]);
    store.getState().setInput('spending.monthlyTotalToday', 5100);
    store.getState().setInput('spending.monthlyTotalToday', 5200);
    vi.advanceTimersByTime(RUN_DELAY_MS - 1);
    expect(runs).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(runs.map((r) => r.revision)).toEqual([0, 2]);
    expect(runs[1]!.inputs.spending.monthlyTotalToday).toBe(5200);
    expect(statusOf(store.getState())).toBe('updating');
  });

  it('does not send when an edit makes the plan incomplete', () => {
    const { store, runs } = setup(completePlan());
    store.getState().setInput('spouses.0.birthYear', null);
    vi.advanceTimersByTime(RUN_DELAY_MS);
    expect(runs).toHaveLength(1);
    expect(statusOf(store.getState())).toBe('incomplete');
  });

  it('keeps the latest result, drops older ones, and summarizes the change', () => {
    const { store, cb } = setup(completePlan());
    cb().onResult(fakeResult(0, 100_000));
    expect(statusOf(store.getState())).toBe('up_to_date');
    expect(store.getState().summary).toBeUndefined(); // after a load

    store.getState().setInput('estate.survivorPct', 80);
    cb().onResult(fakeResult(0)); // older than the inputs: dropped
    expect(store.getState().result!.revision).toBe(0);
    cb().onResult(fakeResult(1, 40_000));
    const s = store.getState();
    expect(s.previousResult!.revision).toBe(0);
    expect(s.summary!.edit).toBe('Survivor spending');
    expect(s.summary!.changes).toEqual(['legacy 60,000 lower']);
    expect(s.edits).toEqual([]);
  });

  it('keeps tips and errors for the latest revision only', () => {
    const { store, cb } = setup(completePlan());
    cb().onTips({ revision: 5, byWarning: {} });
    expect(store.getState().tips).toBeUndefined();
    cb().onTips({ revision: 0, byWarning: {} });
    expect(store.getState().tips).toEqual({ revision: 0, byWarning: {} });
    cb().onError({ revision: 9, appVersion: 'x', kind: 'unexpected', message: 'old' });
    expect(store.getState().error).toBeUndefined();
    cb().onError({ revision: 0, appVersion: 'x', kind: 'unexpected', message: 'boom' });
    expect(statusOf(store.getState())).toBe('error');
  });

  it('raises the revision for every action that changes the inputs', () => {
    const { store } = setup(completePlan());
    const st = () => store.getState();
    const actions: (() => void)[] = [
      () => st().setInput('estate.legacyGoalToday', 1),
      () => st().clearInput('estate.homeValueToday'),
      () => st().setRule('federal.oas.recovery.threshold', 50_000),
      () => st().resetRule('federal.oas.recovery.threshold'),
      () => st().chooseMix('growth'),
      () => st().setSpendingMode('by_category'),
      () => st().addAccount('tfsa', 1),
      () => st().removeAccount('tfsa-1-1'),
      () => st().addDbPension(0),
      () => st().removeDbPension(0),
      () => st().loadPlan(completePlan()),
    ];
    actions.forEach((act, i) => {
      act();
      expect(st().inputsRevision).toBe(i + 1);
    });
    expect(st().loaded).toBe(true);
    expect(st().edits).toEqual([]);
  });

  it('stores rule overrides with the defaults’ tax year, and resets them', () => {
    const { store } = setup(completePlan());
    store.getState().setRule('federal.oas.recovery.threshold', 50_000);
    expect(store.getState().inputs.ruleOverrides).toEqual({
      'federal.oas.recovery.threshold': { value: 50_000, defaultTaxYear: cfg.taxYear },
    });
    store.getState().resetRule('federal.oas.recovery.threshold');
    expect(store.getState().inputs.ruleOverrides).toEqual({});
    store.setState({ inputs: { ...store.getState().inputs, ruleOverrides: undefined } });
    store.getState().resetRule('x');
    store.getState().setRule('market.inflation', 0.03);
    expect(Object.keys(store.getState().inputs.ruleOverrides!)).toEqual(['market.inflation']);
  });

  it('chooses named mixes from the config, and keeps the mix for Custom', () => {
    const { store } = setup(completePlan());
    store.getState().chooseMix('growth');
    expect(store.getState().inputs.investing.mix).toEqual(startingMix('growth', cfg));
    store.getState().chooseMix('custom');
    expect(store.getState().inputs.investing.mixId).toBe('custom');
    expect(store.getState().inputs.investing.mix).toEqual(startingMix('growth', cfg));
  });

  it('starts One total from the category sum the first time only', () => {
    let d = emptyPlan(cfg, TODAY);
    d = setAt(d, 'spending.categories.groceries.monthlyToday', 800);
    d = setAt(d, 'spending.categories.hydro.monthlyToday', 150);
    const { store } = setup(d);
    store.getState().setSpendingMode('one_total');
    expect(store.getState().inputs.spending.monthlyTotalToday).toBe(950);
    store.getState().setInput('spending.monthlyTotalToday', 2000);
    store.getState().setSpendingMode('by_category');
    store.getState().setSpendingMode('one_total');
    expect(store.getState().inputs.spending.monthlyTotalToday).toBe(2000);
    expect(store.getState().inputs.spending.categories.groceries!.monthlyToday).toBe(800);
  });

  it('adds accounts with the next free id and type defaults, and DB pensions', () => {
    const { store } = setup(completePlan());
    const s = () => store.getState();
    s().addAccount('rrsp', 0);
    s().addAccount('lira', 1);
    s().addAccount('tfsa', 1);
    s().addAccount('nonreg', 0);
    const ids = s().inputs.accounts.map((a) => a.id);
    expect(ids).toEqual(['rrsp-0-1', 'rrsp-0-2', 'lira-1-1', 'tfsa-1-1', 'nonreg-0-1']);
    expect(inputAt(s(), 'accounts.lira-1-1.lifUnlock50')).toBe(false);
    expect(inputAt(s(), 'accounts.lira-1-1.conversionAge')).toBe(71);
    expect(inputAt(s(), 'accounts.tfsa-1-1.tfsaRoomToday')).toBe(0);
    expect(inputAt(s(), 'accounts.nonreg-0-1.conversionAge')).toBeUndefined();
    s().addDbPension(1);
    expect(s().inputs.dbPensions[0]).toMatchObject({ owner: 1, indexing: 'full', survivorPct: 60 });
  });

  it('fills an empty life expectancy target once birth year and sex are set, and never replaces it', () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setInput('spouses.0.birthYear', 1963);
    expect(s().inputs.spouses[0].lifeExpectancyTarget).toBeNull();
    s().setInput('spouses.0.sexAtBirth', 'F');
    const filled = defaultLifeExpectancy('F', 2026 - 1963, cfg);
    expect(s().inputs.spouses[0].lifeExpectancyTarget).toBe(filled);
    s().setInput('spouses.0.sexAtBirth', 'M');
    expect(s().inputs.spouses[0].lifeExpectancyTarget).toBe(filled);
    s().setInput('spouses.1.lifeExpectancyTarget', 88);
    s().setInput('spouses.1.sexAtBirth', 'M');
    s().setInput('spouses.1.birthYear', 1960);
    expect(s().inputs.spouses[1].lifeExpectancyTarget).toBe(88);
  });

  it('moves between views with an optional focus', () => {
    const { store } = setup();
    store.getState().setView('settings', 'market.inflation');
    expect(store.getState()).toMatchObject({ view: 'settings', focus: 'market.inflation' });
  });
});

describe('defaults', () => {
  it('reads FP Canada’s table at or below the age, the last row above it, never below age + 1', () => {
    const table = cfg.entries.get('planning.life_expectancy.female')!.value as Record<
      string,
      number
    >;
    expect(defaultLifeExpectancy('F', 63, cfg)).toBe(Math.max(table['60']!, 64));
    expect(defaultLifeExpectancy('F', 104, cfg)).toBe(105);
    expect(defaultLifeExpectancy('F', 101, cfg)).toBe(Math.max(table['100']!, 102));
    expect(defaultLifeExpectancy('M', 10, cfg)).toBe(
      (cfg.entries.get('planning.life_expectancy.male')!.value as Record<string, number>)['20'],
    );
  });

  it('gives an empty plan the planning defaults', () => {
    const d = emptyPlan(cfg, TODAY);
    expect(d.planStartYear).toBe(2026);
    expect(d.investing).toMatchObject({
      mixId: 'balanced',
      feeLevel: 'index_etf',
      rebalance: true,
    });
    expect(d.investing.mix).toEqual(startingMix('balanced', cfg));
    expect(d.withdrawal).toEqual({ strategyId: 'registered_last', bracketLevel: 'first_bracket' });
    expect(d.spending.phases).toEqual([
      { fromYear: 15, keepPct: 70 },
      { fromYear: 25, keepPct: 60 },
    ]);
    expect(d.estate.survivorPct).toBe(70);
    expect(Object.keys(d.spending.categories)).toHaveLength(29);
  });
});

describe('the stage 5 review actions', () => {
  it('starts with four $0 accounts per spouse, Balanced, CPP and OAS at 70', () => {
    const { store } = setup();
    const { accounts, spouses, investing } = store.getState().inputs;
    expect(accounts.map((a) => a.id)).toEqual([
      'rrsp-0-1',
      'tfsa-0-1',
      'lira-0-1',
      'nonreg-0-1',
      'rrsp-1-1',
      'tfsa-1-1',
      'lira-1-1',
      'nonreg-1-1',
    ]);
    expect(accounts[0]).toMatchObject({ balanceToday: 0, mixId: 'balanced', conversionAge: 71 });
    expect(spouses[0]).toMatchObject({ cppStartAge: 70, oasStartAge: 70 });
    expect(investing.presetId).toBe('own_mix');
  });

  it('adds a DC pension as a LIRA and sets an account mix', () => {
    const { store } = setup();
    store.getState().addDcPension(1);
    const dc = store.getState().inputs.accounts.at(-1)!;
    expect(dc).toMatchObject({ id: 'lira-1-2', type: 'lira', dcPension: true });
    store.getState().chooseAccountMix('rrsp-0-1', 'growth');
    expect(store.getState().inputs.accounts[0]!.mix).toEqual(startingMix('growth', cfg));
    store.getState().chooseAccountMix('rrsp-0-1', 'custom');
    expect(store.getState().inputs.accounts[0]!).toMatchObject({
      mixId: 'custom',
      mix: startingMix('growth', cfg),
    });
    store.getState().chooseAccountMix('nope', 'growth');
  });

  it('keeps the retirement age when the birth year changes', () => {
    const { store } = setup();
    store.getState().setInput('spouses.0.birthYear', 1960);
    store.getState().setInput('spouses.0.retirementYear', 2025);
    store.getState().setInput('spouses.0.birthYear', 1962);
    expect(store.getState().inputs.spouses[0].retirementYear).toBe(2027);
  });

  it('lets a group amount replace its items, and an item replace the group amount', () => {
    const { store } = setup();
    store.getState().setInput('spending.categories.hydro.monthlyToday', 150);
    store.getState().setGroupAmount('home', ['hydro', 'internet'], 2000);
    let sp = store.getState().inputs.spending;
    expect(sp.groupsMonthlyToday).toEqual({ home: 2000 });
    expect(sp.categories.hydro!.monthlyToday).toBe(0);
    store.getState().setInput('spending.categories.internet.monthlyToday', 80);
    sp = store.getState().inputs.spending;
    expect(sp.groupsMonthlyToday).toEqual({});
    store.getState().setGroupAmount('food', [], 500);
    store.getState().setGroupAmount('food', [], null);
    expect(store.getState().inputs.spending.groupsMonthlyToday).toEqual({});
  });
});

describe('the second stage 5 review: one mix for every account (AR2-S1)', () => {
  const mixes = (store: ReturnType<typeof setup>['store']) =>
    store.getState().inputs.accounts.map((a) => a.mixId);

  it('copies the mix to every account and keeps them following it', () => {
    const { store } = setup();
    store.getState().chooseAccountMix('rrsp-0-1', 'growth');
    store.getState().shareAccountMix('rrsp-0-1', true);
    expect(store.getState().inputs.investing.mixFromAccount).toBe('rrsp-0-1');
    expect(new Set(mixes(store))).toEqual(new Set(['growth']));
    store.getState().chooseAccountMix('rrsp-0-1', 'custom');
    store.getState().setInput('accounts.rrsp-0-1.mix.bonds', 50);
    expect(store.getState().inputs.accounts.every((a) => a.mix!.bonds === 50)).toBe(true);
    // New accounts and DC pensions follow it too.
    store.getState().addAccount('tfsa', 1);
    store.getState().addDcPension(0);
    expect(
      store
        .getState()
        .inputs.accounts.slice(-2)
        .map((a) => a.mix!.bonds),
    ).toEqual([50, 50]);
  });

  it('turns off when another account changes, and each keeps its mix', () => {
    const { store } = setup();
    store.getState().chooseAccountMix('rrsp-0-1', 'conservative');
    store.getState().shareAccountMix('rrsp-0-1', true);
    store.getState().chooseAccountMix('tfsa-0-1', 'growth');
    expect(store.getState().inputs.investing.mixFromAccount).toBeUndefined();
    expect(mixes(store)[0]).toBe('conservative');
    expect(mixes(store)[1]).toBe('growth');
    expect(mixes(store)[2]).toBe('conservative');
    store.getState().chooseAccountMix('rrsp-0-1', 'balanced');
    expect(mixes(store)[2]).toBe('conservative');
  });

  it('turns off by the toggle or by removing the account', () => {
    const { store } = setup();
    store.getState().shareAccountMix('missing', true);
    expect(store.getState().inputs.investing.mixFromAccount).toBeUndefined();
    store.getState().chooseAccountMix('lira-0-1', 'growth');
    store.getState().shareAccountMix('lira-0-1', true);
    store.getState().shareAccountMix('rrsp-0-1', false);
    expect(store.getState().inputs.investing.mixFromAccount).toBe('lira-0-1');
    store.getState().shareAccountMix('lira-0-1', false);
    expect(store.getState().inputs.investing.mixFromAccount).toBeUndefined();
    expect(new Set(mixes(store))).toEqual(new Set(['growth']));
    store.getState().shareAccountMix('lira-0-1', true);
    store.getState().removeAccount('lira-0-1');
    expect(store.getState().inputs.investing.mixFromAccount).toBeUndefined();
    store.getState().removeAccount('tfsa-0-1');
    expect(store.getState().inputs.accounts).toHaveLength(6);
  });
});
