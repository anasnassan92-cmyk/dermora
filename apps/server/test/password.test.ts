/** Unit tests for the password rules (passwordProblem) – no server, no database. */
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.DATA_DIR = path.join(os.tmpdir(), `dermora-password-${process.pid}`);
process.env.DERMORA_NO_LISTEN = '1';

const { passwordProblem } = await import('../src/auth/index.js');

test('too short passwords are rejected', () => {
  assert.equal(typeof passwordProblem('kort1'), 'string');
  assert.equal(typeof passwordProblem('1234567'), 'string');
});

test('a password needs both a digit and a letter', () => {
  assert.equal(typeof passwordProblem('12345678'), 'string');
  assert.equal(typeof passwordProblem('abcdefgh'), 'string');
  assert.equal(passwordProblem('hudvard123'), null);
  assert.equal(passwordProblem('Räksmörgås1'), null);
});

test('very long passwords are rejected', () => {
  assert.equal(passwordProblem(`a1${'x'.repeat(198)}`), null); // exactly 200
  assert.equal(typeof passwordProblem(`a1${'x'.repeat(199)}`), 'string'); // 201
});
