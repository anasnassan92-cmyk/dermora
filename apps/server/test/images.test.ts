/** Image handling without Google Vision: normalise() resizes, faceCheck() flags dark/blurry photos. */
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.DATA_DIR = path.join(os.tmpdir(), `dermora-images-${process.pid}`);
process.env.DERMORA_NO_LISTEN = '1';
delete process.env.GOOGLE_VISION_API_KEY;

const sharp = (await import('sharp')).default;
const { faceCheck, normalise } = await import('../src/services/images.js');

async function flatJpeg(width: number, height: number, grey: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: grey, g: grey, b: grey } } }).jpeg().toBuffer();
}

test('normalise shrinks large photos to max 1600 px and keeps the aspect ratio', async () => {
  const out = await normalise(await flatJpeg(3200, 2400, 128));
  assert.equal(out.width, 1600);
  assert.equal(out.height, 1200);
  assert.ok(out.data.length > 0);
});

test('normalise never enlarges small photos', async () => {
  const out = await normalise(await flatJpeg(800, 600, 128));
  assert.equal(out.width, 800);
  assert.equal(out.height, 600);
});

test('a dark, flat photo fails the local quality check with Swedish reasons', async () => {
  const img = await normalise(await flatJpeg(800, 1000, 20));
  const check = await faceCheck(img.data, img.width, img.height);
  assert.equal(check.method, 'local');
  assert.equal(check.ok, false);
  assert.ok(check.reasons.some((r) => r.includes('mörk')), check.reasons.join(' | '));
  assert.ok(check.reasons.some((r) => r.includes('suddig')), check.reasons.join(' | '));
});
