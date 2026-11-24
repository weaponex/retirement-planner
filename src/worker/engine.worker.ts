// The engine Worker (design file 41): runs one revision at a time. The client
// terminates it and starts a new one when a newer revision arrives mid-run.
import { handleRun, type RunRequest, type WorkerReply } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<RunRequest>) =>
  handleRun(event.data, (reply: WorkerReply) => self.postMessage(reply));
