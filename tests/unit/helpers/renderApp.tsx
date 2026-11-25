// Renders the app with a plan store whose "Worker" runs the real engine at
// once, so screen tests see real results.
import { render } from '@testing-library/react';
import { loadConfig } from '../../../src/engine/config/load';
import { engineError, runPlan, runTips } from '../../../src/engine/index';
import type { PlanDraft } from '../../../src/state/draft';
import { PlanStoreContext } from '../../../src/state/react';
import { createPlanStore, type PlanStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { TODAY } from './draftPlan';

export function renderApp(
  initial?: PlanDraft,
  options: { fail?: boolean; firstRun?: boolean } = {},
) {
  if (!options.firstRun) localStorage.setItem('rp.disclaimer.seen', '1');
  const store: PlanStore = createPlanStore({
    cfg: loadConfig(),
    now: () => TODAY,
    ...(initial && { initial }),
    connect: (cb) => ({
      run(inputs, revision) {
        if (options.fail) {
          cb.onError(engineError(new Error('boom'), revision, 'test'));
          return;
        }
        const result = runPlan(inputs, { revision, appVersion: 'test', today: TODAY });
        cb.onResult(result);
        cb.onTips(runTips(inputs, result));
      },
      dispose() {},
    }),
  });
  const view = render(
    <PlanStoreContext.Provider value={store}>
      <App />
    </PlanStoreContext.Provider>,
  );
  return { store, ...view };
}
