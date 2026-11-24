// Vite inlines the Worker's bundle and starts it from a `blob:` URL, so the
// Worker runs under the page's security policy (`worker-src 'self' blob:`).
import EngineWorker from './engine.worker?worker&inline';

export function createWorker(): Worker {
  return new EngineWorker();
}
