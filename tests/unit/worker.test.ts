import { afterEach, describe, expect, it, vi } from 'vitest';
import * as engine from '../../src/engine/index';
import type { EngineError, Result, Tips } from '../../src/engine/index';
import { createEngineClient, type WorkerLike } from '../../src/worker/client';
import { handleRun, type RunRequest, type WorkerReply } from '../../src/worker/protocol';
import { couplePlan } from './helpers/couplePlan';

const request = (revision: number): RunRequest => ({
  type: 'run',
  inputs: couplePlan(),
  revision,
  appVersion: 't',
});

afterEach(() => vi.restoreAllMocks());

describe('handleRun', () => {
  it('posts the result, then the tips, for the same revision', () => {
    const replies: WorkerReply[] = [];
    handleRun(request(4), (r) => replies.push(r), new Date(2026, 10, 24));
    expect(replies.map((r) => r.type)).toEqual(['result', 'tips']);
    expect(replies.every((r) => r.revision === 4)).toBe(true);
    const result = (replies[0] as { result: Result }).result;
    expect(result.revision).toBe(4);
    expect(result.appVersion).toBe('t');
  });

  it('posts only an error when the main run fails', () => {
    vi.spyOn(engine, 'runPlan').mockImplementation(() => {
      throw new Error('boom');
    });
    const replies: WorkerReply[] = [];
    handleRun(request(2), (r) => replies.push(r));
    expect(replies).toEqual([
      {
        type: 'error',
        revision: 2,
        error: { revision: 2, appVersion: 't', kind: 'unexpected', message: 'boom' },
      },
    ]);
  });

  it('logs failed tips and posts them empty, keeping the result', () => {
    vi.spyOn(engine, 'runTips').mockImplementation(() => {
      throw new Error('tip failed');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const replies: WorkerReply[] = [];
    handleRun(request(6), (r) => replies.push(r));
    expect(replies.map((r) => r.type)).toEqual(['result', 'tips']);
    expect(replies[1]).toEqual({ type: 'tips', revision: 6, tips: { revision: 6, byWarning: {} } });
    expect(warn).toHaveBeenCalledOnce();
  });
});

/** A fake Worker that records what it was sent. */
class FakeWorker implements WorkerLike {
  sent: RunRequest[] = [];
  terminated = false;
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  postMessage(message: RunRequest) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: WorkerReply) {
    this.onmessage?.({ data });
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const got = {
    results: [] as Result[],
    tips: [] as Tips[],
    errors: [] as EngineError[],
  };
  const client = createEngineClient(
    () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
    '9.9',
    {
      onResult: (r) => got.results.push(r),
      onTips: (t) => got.tips.push(t),
      onError: (e) => got.errors.push(e),
    },
  );
  return { client, workers, got };
}

const fakeResult = (revision: number) => ({ revision }) as Result;
const fakeTips = (revision: number): Tips => ({ revision, byWarning: {} });

describe('createEngineClient', () => {
  it('sends the run with the app version and passes replies on', () => {
    const { client, workers, got } = setup();
    client.run(couplePlan(), 1);
    expect(workers).toHaveLength(1);
    expect(workers[0]!.sent[0]).toMatchObject({ type: 'run', revision: 1, appVersion: '9.9' });
    workers[0]!.reply({ type: 'result', revision: 1, result: fakeResult(1) });
    workers[0]!.reply({ type: 'tips', revision: 1, tips: fakeTips(1) });
    expect(got.results).toHaveLength(1);
    expect(got.tips).toHaveLength(1);
  });

  it('reuses an idle Worker for the next run', () => {
    const { client, workers } = setup();
    client.run(couplePlan(), 1);
    workers[0]!.reply({ type: 'result', revision: 1, result: fakeResult(1) });
    workers[0]!.reply({ type: 'tips', revision: 1, tips: fakeTips(1) });
    client.run(couplePlan(), 2);
    expect(workers).toHaveLength(1);
    expect(workers[0]!.sent.map((m) => m.revision)).toEqual([1, 2]);
  });

  it('terminates a busy Worker for a newer revision and drops the old replies', () => {
    const { client, workers, got } = setup();
    client.run(couplePlan(), 1);
    client.run(couplePlan(), 2);
    expect(workers).toHaveLength(2);
    expect(workers[0]!.terminated).toBe(true);
    // A late reply for revision 1 (from either Worker) is dropped.
    workers[0]!.reply({ type: 'result', revision: 1, result: fakeResult(1) });
    workers[1]!.reply({ type: 'result', revision: 1, result: fakeResult(1) });
    expect(got.results).toHaveLength(0);
    workers[1]!.reply({ type: 'result', revision: 2, result: fakeResult(2) });
    expect(got.results.map((r) => r.revision)).toEqual([2]);
  });

  it('passes engine errors on and frees the Worker', () => {
    const { client, workers, got } = setup();
    client.run(couplePlan(), 1);
    const error: EngineError = { revision: 1, appVersion: '9.9', kind: 'integrity', message: 'x' };
    workers[0]!.reply({ type: 'error', revision: 1, error });
    expect(got.errors).toEqual([error]);
    client.run(couplePlan(), 2);
    expect(workers).toHaveLength(1);
  });

  it('reports a Worker crash as an unexpected error', () => {
    const { client, workers, got } = setup();
    client.run(couplePlan(), 7);
    workers[0]!.onerror?.({ message: 'script error' });
    workers[0]!.onerror?.({});
    expect(got.errors).toEqual([
      { revision: 7, appVersion: '9.9', kind: 'unexpected', message: 'script error' },
      { revision: 7, appVersion: '9.9', kind: 'unexpected', message: 'The engine Worker failed' },
    ]);
  });

  it('terminates the Worker on dispose', () => {
    const { client, workers } = setup();
    client.dispose();
    client.run(couplePlan(), 1);
    client.dispose();
    expect(workers[0]!.terminated).toBe(true);
  });
});
