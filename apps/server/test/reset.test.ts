/** Forgot/reset password in demo mode (code comes from the server log → here read from the DB hash path via the API). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dermora-reset-'));
process.env.DATA_DIR = tmp;
process.env.DERMORA_NO_LISTEN = '1';
for (const k of ['DB_HOST', 'GEMINI_API_KEY', 'SMTP_USER', 'SMTP_PASS']) delete process.env[k];

let server: Server;
let base = '';
const logged: string[] = [];
const origLog = console.log;

before(async () => {
  const { openDb } = await import('../src/db/index.js');
  const { createApp } = await import('../src/index.js');
  await openDb({ sqliteFile: path.join(tmp, 'test.db') });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  console.log = (...a: unknown[]) => { logged.push(a.map(String).join(' ')); };
});

after(() => { console.log = origLog; server?.close(); });

async function api(method: string, p: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

test('forgot + reset password signs the user in with the new password', async () => {
  const reg = await api('POST', '/api/auth/register', { first_name: 'Reset', email: 'reset@test.se', password: 'gammalt123' });
  assert.equal(reg.status, 201);
  // unknown e-mail: still 200 (no probing)
  assert.equal((await api('POST', '/api/auth/forgot', { email: 'nobody@test.se' })).status, 200);
  const f = await api('POST', '/api/auth/forgot', { email: 'Reset@Test.se' });
  assert.equal(f.status, 200);
  assert.equal(f.data.demo, true);
  const line = logged.find((l) => l.includes('demo-kod (reset) för reset@test.se'));
  assert.ok(line, 'reset code should be logged in demo mode');
  const code = /(\d{6})\s*$/.exec(line!)![1];
  assert.equal((await api('POST', '/api/auth/reset', { email: 'reset@test.se', code: '000000' === code ? '111111' : '000000', password: 'nytt12345' })).status, 400);
  assert.equal((await api('POST', '/api/auth/reset', { email: 'reset@test.se', code, password: 'kort' })).status, 422);
  const r = await api('POST', '/api/auth/reset', { email: 'reset@test.se', code, password: 'nytt12345' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.token);
  assert.equal(r.data.user.email_verified, true);
  assert.equal((await api('POST', '/api/auth/login', { email: 'reset@test.se', password: 'gammalt123' })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { email: 'reset@test.se', password: 'nytt12345' })).status, 200);
  // the code is single-use
  assert.equal((await api('POST', '/api/auth/reset', { email: 'reset@test.se', code, password: 'nytt12345' })).status, 400);
});
