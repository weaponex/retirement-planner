// The app's side of the engine Worker (design file 41; Components and data
// flow, Live recalculation). A Worker can't read a new message mid-run, so a
// newer revision sent while a run is in progress terminates the Worker and
// starts a new one. Replies for any revision but the latest are dropped.
import type { EngineError, PlanInputs, Result, Tips } from '../engine/index';
import type { RunRequest, WorkerReply } from './protocol';

/** The parts of a Worker the client uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: RunRequest): void;
  terminate(): void;
  onmessage: ((event: { data: WorkerReply }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
}

export interface EngineCallbacks {
  onResult(result: Result): void;
  onTips(tips: Tips): void;
  onError(error: EngineError): void;
}

export interface EngineClient {
  run(inputs: PlanInputs, revision: number): void;
  dispose(): void;
}

export function createEngineClient(
  makeWorker: () => WorkerLike,
  appVersion: string,
  callbacks: EngineCallbacks,
): EngineClient {
  let worker: WorkerLike | undefined;
  let latest: number | undefined;
  let busy = false;

  function start(): WorkerLike {
    const w = makeWorker();
    w.onmessage = ({ data }) => {
      if (data.revision !== latest) return;
      if (data.type === 'result') {
        callbacks.onResult(data.result);
      } else if (data.type === 'tips') {
        busy = false;
        callbacks.onTips(data.tips);
      } else {
        busy = false;
        callbacks.onError(data.error);
      }
    };
    w.onerror = (event) => {
      busy = false;
      callbacks.onError({
        revision: latest ?? 0,
        appVersion,
        kind: 'unexpected',
        message: event.message ?? 'The engine Worker failed',
      });
    };
    return w;
  }

  return {
    run(inputs, revision) {
      latest = revision;
      if (worker && busy) {
        worker.terminate();
        worker = undefined;
      }
      worker ??= start();
      busy = true;
      worker.postMessage({ type: 'run', inputs, revision, appVersion });
    },
    dispose() {
      worker?.terminate();
      worker = undefined;
      busy = false;
    },
  };
}
