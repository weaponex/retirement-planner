// The messages between the app and the engine Worker (design file 41), and
// the Worker's handling of one run. Kept apart from engine.worker.ts so it can
// be tested without a Worker.
import { engineError, runPlan, runTips } from '../engine/index';
import type { EngineError, PlanInputs, Result, Tips } from '../engine/index';

export interface RunRequest {
  type: 'run';
  inputs: PlanInputs;
  revision: number;
  appVersion: string;
}

export type WorkerReply =
  | { type: 'result'; revision: number; result: Result }
  | { type: 'tips'; revision: number; tips: Tips }
  | { type: 'error'; revision: number; error: EngineError };

/**
 * One run: the main results first, then the tips in a second message. A failed
 * main run posts an error and no tips; failed tips are logged and posted empty,
 * so the results stay on screen.
 */
export function handleRun(
  request: RunRequest,
  post: (reply: WorkerReply) => void,
  today: Date = new Date(),
): void {
  const { inputs, revision, appVersion } = request;
  let result: Result;
  try {
    result = runPlan(inputs, { revision, appVersion, today });
  } catch (error) {
    post({ type: 'error', revision, error: engineError(error, revision, appVersion) });
    return;
  }
  post({ type: 'result', revision, result });
  let tips: Tips;
  try {
    tips = runTips(inputs, result);
  } catch (error) {
    console.warn('Tips failed and were dropped:', error);
    tips = { revision, byWarning: {} };
  }
  post({ type: 'tips', revision, tips });
}
