import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.DATA_DIR = path.join(os.tmpdir(), `dermora-fallback-${process.pid}`);
process.env.DERMORA_NO_LISTEN = '1';
process.env.GEMINI_MODEL = 'main-model';
process.env.GEMINI_FALLBACK_MODELS = 'gone-model, backup-model';

const { withGemini } = await import('../src/services/ai.js');

const fail = (status: number) => Object.assign(new Error(`{"error":{"code":${status}}}`), { status });

test('overloaded model and unknown model are skipped, backup answers', async () => {
  const calls: string[] = [];
  const { value, model } = await withGemini(async (m) => {
    calls.push(m);
    if (m === 'main-model') throw fail(503);
    if (m === 'gone-model') throw fail(404);
    return 'ok';
  });
  assert.equal(value, 'ok');
  assert.equal(model, 'backup-model');
  assert.deepEqual(calls, ['main-model', 'gone-model', 'backup-model']);
});

test('status parsed from the JSON message when .status is missing', async () => {
  let n = 0;
  const { model } = await withGemini(async (m) => {
    n++;
    if (m === 'main-model') throw new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}');
    return 'ok';
  });
  assert.equal(n, 2);
  assert.notEqual(model, 'main-model');
});

test('a bad key is not retried', async () => {
  let n = 0;
  await assert.rejects(withGemini(async () => { n++; throw fail(400); }));
  assert.equal(n, 1);
});

test('a hanging model is cut off by its own time limit', async () => {
  const t0 = Date.now();
  const { model } = await withGemini(
    (m, signal) =>
      m === 'main-model'
        ? new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
        : Promise.resolve('ok'),
    { perCallMs: 300, budgetMs: 10_000 },
  );
  assert.equal(model, 'gone-model');
  assert.ok(Date.now() - t0 < 2_000);
});

test('the whole budget is respected', async () => {
  const t0 = Date.now();
  await assert.rejects(
    withGemini((_m, signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))), { perCallMs: 2_000, budgetMs: 4_000 }),
  );
  assert.ok(Date.now() - t0 < 4_500);
});
