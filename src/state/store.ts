// The plan store (design file 42; Components and data flow): one source of
// truth for the plan's inputs and its latest results. Every action that
// changes the inputs raises `inputsRevision`; 500 ms after the last change a
// ready plan is sent to the engine Worker; a reply for an older revision is
// dropped.
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Config } from '../engine/config/load';
import type { AccountType, EngineError, Owner, Result, Tips } from '../engine/types';
import type { EngineCallbacks, EngineClient } from '../worker/client';
import { changeSummary, type ChangeSummary } from './changeSummary';
import { groupOf } from './categories';
import { defaultLifeExpectancy, emptyPlan, newAccount, startingMix } from './defaults';
import { deleteAt, getAt, setAt, type PlanDraft } from './draft';
import { readyToRun, type Missing } from './readiness';

export const RUN_DELAY_MS = 500;

export type TabId = 'household' | 'savings' | 'spending' | 'withdrawals' | 'estate' | 'results';
export type View = TabId | 'settings';
export type Status = 'incomplete' | 'updating' | 'up_to_date' | 'error';

export interface PlanState {
  inputs: PlanDraft;
  inputsRevision: number;
  result?: Result | undefined;
  tips?: Tips | undefined;
  previousResult?: Result | undefined;
  summary?: ChangeSummary | undefined;
  /** Input paths edited since the last result. */
  edits: string[];
  editedAt?: number | undefined;
  /** The last change was a plan load: the next result has no change summary. */
  loaded: boolean;
  missing: Missing[];
  error?: EngineError | undefined;
  view: View;
  /** An input path or rule key to scroll to and focus. */
  focus?: string | undefined;

  setInput(path: string, value: unknown): void;
  clearInput(path: string): void;
  setRule(key: string, value: number): void;
  resetRule(key: string): void;
  /** Removes every rule override. */
  resetAllRules(): void;
  loadPlan(inputs: PlanDraft): void;
  chooseMix(mixId: 'conservative' | 'balanced' | 'growth' | 'custom'): void;
  setSpendingMode(mode: 'by_category' | 'one_total'): void;
  addAccount(type: AccountType, owner: Owner): void;
  /** A defined contribution pension, held as a LIRA (AR-S6). */
  addDcPension(owner: Owner): void;
  /** Sets an account's mix to a starting mix, or marks it custom (AR-S3). */
  chooseAccountMix(id: string, mixId: 'conservative' | 'balanced' | 'growth' | 'custom'): void;
  /**
   * Turns on or off "Use this mix for every account" for account `id` (AR2-S1).
   * On: every account takes its mix and follows it. Off: each keeps its mix.
   */
  shareAccountMix(id: string, on: boolean): void;
  /** Sets a group's own monthly amount, clearing its categories; null clears it (AR-P1). */
  setGroupAmount(groupId: string, categoryIds: readonly string[], value: number | null): void;
  removeAccount(id: string): void;
  addDbPension(owner: Owner): void;
  removeDbPension(index: number): void;
  setView(view: View, focus?: string): void;
}

export function statusOf(
  s: Pick<PlanState, 'missing' | 'error' | 'result' | 'inputsRevision'>,
): Status {
  if (s.missing.length > 0) return 'incomplete';
  if (s.error && s.error.revision === s.inputsRevision) return 'error';
  if (s.result && s.result.revision === s.inputsRevision) return 'up_to_date';
  return 'updating';
}

export interface StoreOptions {
  cfg: Config;
  /** Connects to the engine; the app passes a Worker client, tests a fake. */
  connect(callbacks: EngineCallbacks): EngineClient;
  now?: () => Date;
  initial?: PlanDraft;
}

export type PlanStore = StoreApi<PlanState>;

type DraftAccount = PlanDraft['accounts'][number];

const SPOUSE_KEYS = /^spouses\.(\d)\.(birthYear|sexAtBirth)$/;

export function createPlanStore(options: StoreOptions): PlanStore {
  const { cfg } = options;
  const now = options.now ?? (() => new Date());
  let timer: ReturnType<typeof setTimeout> | undefined;

  const store = createStore<PlanState>()((set, get) => {
    /** Fills a spouse's empty life expectancy target once birth year and sex are set. */
    function fillLifeExpectancy(inputs: PlanDraft, path: string): PlanDraft {
      const m = SPOUSE_KEYS.exec(path);
      if (!m) return inputs;
      const i = Number(m[1]);
      const s = inputs.spouses[i]!;
      if (s.lifeExpectancyTarget !== null || s.birthYear === null || s.sexAtBirth === null) {
        return inputs;
      }
      const age = inputs.planStartYear! - s.birthYear;
      return setAt(
        inputs,
        `spouses.${i}.lifeExpectancyTarget`,
        defaultLifeExpectancy(s.sexAtBirth, age, cfg),
      );
    }

    function send() {
      timer = undefined;
      const s = get();
      const r = readyToRun(s.inputs, cfg);
      if (!r.ready) {
        set({ missing: r.missing });
        return;
      }
      set({ missing: [] });
      client.run(r.inputs, s.inputsRevision);
    }

    /** Replaces the inputs, raises the revision and schedules a run. */
    function change(inputs: PlanDraft, editPath: string | undefined, loaded = false) {
      const s = get();
      const r = readyToRun(inputs, cfg);
      set({
        inputs,
        inputsRevision: s.inputsRevision + 1,
        edits: editPath ? [...s.edits, editPath] : loaded ? [] : s.edits,
        editedAt: now().getTime(),
        loaded,
        missing: r.ready ? [] : r.missing,
      });
      if (timer) clearTimeout(timer);
      if (r.ready) timer = setTimeout(send, RUN_DELAY_MS);
    }

    /**
     * After account `id`'s mix changed (AR2-S1): when it is the account every
     * mix follows, copies its mix to every account; when another account
     * follows, that account leaves the shared mix and the toggle turns off.
     */
    function syncMixes(inputs: PlanDraft, id: string): PlanDraft {
      const from = inputs.investing.mixFromAccount;
      if (from === undefined) return inputs;
      if (from !== id) return deleteAt(inputs, 'investing.mixFromAccount');
      return copyMix(inputs, id);
    }

    /** `a` with the mix of `src`. */
    function mixOf(a: DraftAccount, src: DraftAccount): DraftAccount {
      const out = { ...a };
      if (src.mixId !== undefined) out.mixId = src.mixId;
      if (src.mix !== undefined) out.mix = { ...src.mix };
      return out;
    }

    /** Gives every account the mix of account `id`. */
    function copyMix(inputs: PlanDraft, id: string): PlanDraft {
      const src = inputs.accounts.find((a) => a.id === id);
      if (!src) return inputs;
      const accounts = inputs.accounts.map((a) => (a.id === id ? a : mixOf(a, src)));
      return { ...inputs, accounts };
    }

    /** A new account follows the shared mix while the toggle is on. */
    function withSharedMix(inputs: PlanDraft, account: DraftAccount): DraftAccount {
      const src = inputs.accounts.find((a) => a.id === inputs.investing.mixFromAccount);
      return src ? mixOf(account, src) : account;
    }

    function nextAccountId(type: AccountType, owner: Owner): string {
      const taken = new Set(get().inputs.accounts.map((a) => a.id));
      let n = 1;
      while (taken.has(`${type}-${owner}-${n}`)) n += 1;
      return `${type}-${owner}-${n}`;
    }

    const initial = options.initial ?? emptyPlan(cfg, now());
    const r0 = readyToRun(initial, cfg);
    return {
      inputs: initial,
      inputsRevision: 0,
      edits: [],
      loaded: true,
      missing: r0.ready ? [] : r0.missing,
      view: 'household',

      setInput(path, value) {
        let inputs = get().inputs;
        // A new birth year keeps the retirement age (AR-H1).
        const birth = /^spouses\.(\d)\.birthYear$/.exec(path);
        if (birth) {
          const sp = inputs.spouses[Number(birth[1])]!;
          if (sp.birthYear !== null && sp.retirementYear !== null && typeof value === 'number') {
            inputs = setAt(
              inputs,
              `spouses.${birth[1]}.retirementYear`,
              sp.retirementYear - sp.birthYear + value,
            );
          }
        }
        // An item's amount replaces its group's own amount (AR-P1).
        const cat = /^spending\.categories\.([a-z_]+)\.monthlyToday$/.exec(path);
        if (cat && inputs.spending.groupsMonthlyToday) {
          const group = groupOf(cat[1]!);
          if (group && group in inputs.spending.groupsMonthlyToday) {
            inputs = deleteAt(inputs, `spending.groupsMonthlyToday.${group}`);
          }
        }
        inputs = fillLifeExpectancy(setAt(inputs, path, value), path);
        // An account's mix may be the one every account follows (AR2-S1).
        const mix = /^accounts\.([^.]+)\.(mix|mixId)(\.|$)/.exec(path);
        if (mix) inputs = syncMixes(inputs, mix[1]!);
        change(inputs, path);
      },
      clearInput(path) {
        change(deleteAt(get().inputs, path), path);
      },
      setRule(key, value) {
        const overrides = { ...(get().inputs.ruleOverrides ?? {}) };
        overrides[key] = { value, defaultTaxYear: cfg.taxYear };
        change({ ...get().inputs, ruleOverrides: overrides }, `ruleOverrides.${key}`);
      },
      resetRule(key) {
        const overrides = { ...(get().inputs.ruleOverrides ?? {}) };
        delete overrides[key];
        change({ ...get().inputs, ruleOverrides: overrides }, `ruleOverrides.${key}`);
      },
      resetAllRules() {
        change({ ...get().inputs, ruleOverrides: {} }, 'ruleOverrides');
      },
      loadPlan(inputs) {
        set({ result: undefined, tips: undefined, previousResult: undefined, summary: undefined });
        change(inputs, undefined, true);
      },
      chooseMix(mixId) {
        let inputs = setAt(get().inputs, 'investing.mixId', mixId);
        if (mixId !== 'custom') inputs = setAt(inputs, 'investing.mix', startingMix(mixId, cfg));
        change(inputs, 'investing.mixId');
      },
      setSpendingMode(mode) {
        let inputs = setAt(get().inputs, 'spending.mode', mode);
        const sp = inputs.spending;
        if (mode === 'one_total' && sp.monthlyTotalToday === null) {
          const sum = Object.values(sp.categories).reduce((a, c) => a + (c.monthlyToday ?? 0), 0);
          inputs = setAt(inputs, 'spending.monthlyTotalToday', sum);
        }
        change(inputs, 'spending.mode');
      },
      addAccount(type, owner) {
        const inputs = get().inputs;
        const account = withSharedMix(
          inputs,
          newAccount(type, owner, nextAccountId(type, owner), cfg),
        );
        change({ ...inputs, accounts: [...inputs.accounts, account] }, 'accounts');
      },
      addDcPension(owner) {
        const inputs = get().inputs;
        const account = withSharedMix(inputs, {
          ...newAccount('lira', owner, nextAccountId('lira', owner), cfg),
          dcPension: true,
        });
        change({ ...inputs, accounts: [...inputs.accounts, account] }, 'accounts');
      },
      chooseAccountMix(id, mixId) {
        const i = get().inputs.accounts.findIndex((a) => a.id === id);
        if (i < 0) return;
        let inputs = setAt(get().inputs, `accounts.${id}.mixId`, mixId);
        if (mixId !== 'custom')
          inputs = setAt(inputs, `accounts.${id}.mix`, startingMix(mixId, cfg));
        change(syncMixes(inputs, id), `accounts.${id}.mixId`);
      },
      shareAccountMix(id, on) {
        const inputs = get().inputs;
        if (!on) {
          // Every account keeps the mix it has (AR2-S1).
          if (inputs.investing.mixFromAccount === id) {
            change(deleteAt(inputs, 'investing.mixFromAccount'), 'investing.mixFromAccount');
          }
          return;
        }
        if (!inputs.accounts.some((a) => a.id === id)) return;
        change(
          copyMix(setAt(inputs, 'investing.mixFromAccount', id), id),
          'investing.mixFromAccount',
        );
      },
      setGroupAmount(groupId, categoryIds, value) {
        let inputs = get().inputs;
        const groups = { ...(inputs.spending.groupsMonthlyToday ?? {}) };
        if (value === null) {
          delete groups[groupId];
        } else {
          groups[groupId] = value;
          for (const id of categoryIds) {
            inputs = setAt(inputs, `spending.categories.${id}`, { monthlyToday: 0 });
          }
        }
        inputs = setAt(inputs, 'spending.groupsMonthlyToday', groups);
        change(inputs, `spending.groupsMonthlyToday.${groupId}`);
      },
      removeAccount(id) {
        let inputs = get().inputs;
        const accounts = inputs.accounts.filter((a) => a.id !== id);
        if (inputs.investing.mixFromAccount === id) {
          inputs = deleteAt(inputs, 'investing.mixFromAccount');
        }
        change({ ...inputs, accounts }, 'accounts');
      },
      addDbPension(owner) {
        const db: PlanDraft['dbPensions'][number] = {
          owner,
          lifetimeAnnualToday: null,
          startAge: 65,
          indexing: 'full',
          survivorPct: 60,
        };
        change({ ...get().inputs, dbPensions: [...get().inputs.dbPensions, db] }, 'dbPensions');
      },
      removeDbPension(index) {
        const dbPensions = get().inputs.dbPensions.filter((_, i) => i !== index);
        change({ ...get().inputs, dbPensions }, 'dbPensions');
      },
      setView(view, focus) {
        set({ view, focus });
      },
    };
  });

  const callbacks: EngineCallbacks = {
    onResult(result) {
      const s = store.getState();
      if (result.revision !== s.inputsRevision) return;
      const summary =
        s.result && !s.loaded ? changeSummary(s.result, result, s.edits, s.inputs) : undefined;
      store.setState({
        previousResult: s.result,
        result,
        summary,
        tips: undefined,
        edits: [],
        error: undefined,
      });
    },
    onTips(tips) {
      if (tips.revision === store.getState().inputsRevision) store.setState({ tips });
    },
    onError(error) {
      if (error.revision === store.getState().inputsRevision) store.setState({ error });
    },
  };
  const client: EngineClient = options.connect(callbacks);
  // A plan that is ready from the start (a loaded plan) runs at once.
  const first = readyToRun(store.getState().inputs, cfg);
  if (first.ready) client.run(first.inputs, 0);
  return store;
}

/** The value at an input path, for the screens. */
export function inputAt<T = unknown>(state: PlanState, path: string): T {
  return getAt(state.inputs, path) as T;
}
