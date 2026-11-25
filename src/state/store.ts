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
import { defaultLifeExpectancy, emptyPlan, startingMix } from './defaults';
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
      const r = readyToRun(s.inputs);
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
      const r = readyToRun(inputs);
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

    function nextAccountId(type: AccountType, owner: Owner): string {
      const taken = new Set(get().inputs.accounts.map((a) => a.id));
      let n = 1;
      while (taken.has(`${type}-${owner}-${n}`)) n += 1;
      return `${type}-${owner}-${n}`;
    }

    const initial = options.initial ?? emptyPlan(cfg, now());
    const r0 = readyToRun(initial);
    return {
      inputs: initial,
      inputsRevision: 0,
      edits: [],
      loaded: true,
      missing: r0.ready ? [] : r0.missing,
      view: 'household',

      setInput(path, value) {
        const inputs = fillLifeExpectancy(setAt(get().inputs, path, value), path);
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
        const account: PlanDraft['accounts'][number] = {
          id: nextAccountId(type, owner),
          owner,
          type,
          balanceToday: null,
          annualContributionToday: 0,
          ...(type === 'tfsa' && { tfsaRoomToday: 0 }),
          ...((type === 'rrsp' || type === 'lira') && { conversionAge: 71 }),
          ...(type === 'lira' && { lifUnlock50: false }),
        };
        change({ ...get().inputs, accounts: [...get().inputs.accounts, account] }, 'accounts');
      },
      removeAccount(id) {
        const accounts = get().inputs.accounts.filter((a) => a.id !== id);
        change({ ...get().inputs, accounts }, 'accounts');
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
  const first = readyToRun(store.getState().inputs);
  if (first.ready) client.run(first.inputs, 0);
  return store;
}

/** The value at an input path, for the screens. */
export function inputAt<T = unknown>(state: PlanState, path: string): T {
  return getAt(state.inputs, path) as T;
}
