/** The rule-based "seek care" hints must never depend on the AI model alone. */
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.DATA_DIR = path.join(os.tmpdir(), `dermora-redflags-${process.pid}`);
process.env.DERMORA_NO_LISTEN = '1';

const { redFlagHints } = await import('../src/services/ai.js');

test('calm answers give no hints', () => {
  assert.deepEqual(redFlagHints({ sudden_change: false, acne_pain: 2, acne_type: ['whiteheads'], acne_frequency: 'sometimes' }), []);
  assert.deepEqual(redFlagHints({}), []);
});

test('sudden change is a red flag', () => {
  const hints = redFlagHints({ sudden_change: true });
  assert.equal(hints.length, 1);
  assert.match(hints[0], /snabb förändring/);
});

test('high pain and very frequent cystic acne are red flags', () => {
  assert.equal(redFlagHints({ acne_pain: 7 }).length, 1);
  assert.equal(redFlagHints({ acne_pain: 6 }).length, 0);
  assert.equal(redFlagHints({ acne_type: ['cystic'], acne_frequency: 'very_often' }).length, 1);
  assert.equal(redFlagHints({ acne_type: ['cystic'], acne_frequency: 'often' }).length, 0);
});

test('several problems give several hints', () => {
  assert.equal(redFlagHints({ sudden_change: true, acne_pain: 9, acne_type: ['cystic'], acne_frequency: 'very_often' }).length, 3);
});
