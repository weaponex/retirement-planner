# worker

## Overview

The engine's Web Worker and the app's client for it (design file 41;
[Components and data flow](../../docs/designs/retirement-planner.md#components-and-data-flow)).
One run posts the main `Result`, then the `Tips`, or an `EngineError`.

## Interface

- `protocol.ts`: `RunRequest { type: 'run', inputs, revision, appVersion }`; `WorkerReply`
  (`result`, `tips` or `error`, each with its `revision`); `handleRun(request, post, today?)`.
- `engine.worker.ts`: the Worker entry; passes each message to `handleRun`.
- `createWorker.ts`: `createWorker()`, the inlined Worker started from a `blob:` URL.
- `client.ts`: `createEngineClient(makeWorker, appVersion, { onResult, onTips, onError })`:
  `run(inputs, revision)` and `dispose()`; `WorkerLike` for tests.

## Invariants

- `[createWorker.ts]` The Worker bundle is inlined (`?worker&inline`) and started from a `blob:`
  URL, so it runs under the page's content security policy, whose `worker-src` allows `blob:`.
- `[client.ts]` A newer revision sent while a run is in progress terminates the Worker and starts
  a new one; replies for any revision but the latest are dropped.
- `[protocol.ts:handleRun]` A failed main run posts only an error. Failed tips are logged and
  posted empty, so the results stay.
- `[tsconfig.node.json]` `protocol.ts` and `client.ts` are also in the node project, so the tests
  can import them; `engine.worker.ts` and `createWorker.ts` are not (Worker and Vite types).

## Side Effects

- `engine.worker.ts` sets `self.onmessage`. `client.ts` creates and terminates Workers.
  `handleRun` writes to `console.warn` when tips fail.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Unit tests: `tests/unit/worker.test.ts` (with a fake Worker)
