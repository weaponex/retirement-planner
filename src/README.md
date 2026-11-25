# Source

## Overview

The app's source. `main.tsx` creates the plan store, connects it to the engine Worker and
mounts the app. [`engine/`](./engine/README.md) holds the calculation,
[`worker/`](./worker/README.md) runs it off the main thread, [`state/`](./state/README.md)
holds the plan store, and [`ui/`](./ui/README.md) the screens.

## Interface

- `main.tsx`: no exports; creates one store with `createPlanStore` and renders `App`.
- `vite-env.d.ts`: the Vite client types and `__APP_VERSION__`.
- Subfolders:
  - [engine](./engine/README.md): the calculation engine (config, tax, data contracts).
  - [worker](./worker/README.md): the engine Worker and the client the app uses to run it.
  - [state](./state/README.md): the plan store, readiness, defaults and the change summary.
  - [ui](./ui/README.md): the app shell, tabs, Settings, results and charts.

## Invariants

- `[main.tsx:root]` The app mounts only if the page has a `#root` element; otherwise nothing
  renders and no error is thrown.
- `[main.tsx]` There is one plan store per page; the Worker client is created from `createWorker` (an inline `blob:` Worker).

## Side Effects

- `[main.tsx:root]` On load, reads `document.getElementById('root')`.
- `[main.tsx]` If `#root` exists, calls `createRoot(root).render(...)`, which mounts the React tree
  into the page.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Build: `npm run build`
