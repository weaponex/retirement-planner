// The browser entry point: one plan store connected to the engine Worker, and
// the app shell.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PlanStoreContext } from './state/react';
import { createPlanStore } from './state/store';
import { App } from './ui/App';
import { bundledConfig } from './ui/config';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/600.css';
import './ui/styles.css';
import { createEngineClient } from './worker/client';
import { createWorker } from './worker/createWorker';

const store = createPlanStore({
  cfg: bundledConfig(),
  connect: (callbacks) => createEngineClient(createWorker, __APP_VERSION__, callbacks),
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PlanStoreContext.Provider value={store}>
        <App />
      </PlanStoreContext.Provider>
    </StrictMode>,
  );
}
