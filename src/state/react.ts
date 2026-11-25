// React access to the plan store: one store per app, passed through context.
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { PlanState, PlanStore } from './store';

export const PlanStoreContext = createContext<PlanStore | null>(null);

export function usePlanStore(): PlanStore {
  const store = useContext(PlanStoreContext);
  if (!store) throw new Error('usePlan needs a PlanStoreContext provider');
  return store;
}

export function usePlan<T>(selector: (s: PlanState) => T): T {
  return useStore(usePlanStore(), selector);
}
