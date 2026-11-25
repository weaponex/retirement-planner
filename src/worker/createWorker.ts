// Vite inlines the Worker's bundle and starts it from a `blob:` URL, so the
// Worker runs under the page's security policy (`worker-src 'self' blob:`).
import type { WorkerLike } from './client';
import EngineWorker from './engine.worker?worker&inline';

export function createWorker(): WorkerLike {
  // A real Worker passes MessageEvents, which carry the `data` the client reads.
  return new EngineWorker() as unknown as WorkerLike;
}
