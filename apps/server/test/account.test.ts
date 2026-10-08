/** Account settings: change password, change e-mail with a code to the new address. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dermora-account-'));
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

test('change password and change e-mail', async () => {
  const reg = await api('POST', '/api/auth/register', { first_name: 'Acc', email: 'acc@test.se', password: 'gammalt123' });
  let token = reg.data.token;
  token = (await api('POST', '/api/auth/verify', { code: reg.data.dev_code }, token)).data.token ?? token;

  // password
  assert.equal((await api('POST', '/api/auth/change-password', { current_password: 'fel', new_password: 'nytt12345' }, token)).status, 401);
  assert.equal((await api('POST', '/api/auth/change-password', { current_password: 'gammalt123', new_password: 'kort' }, token)).status, 422);
  assert.equal((await api('POST', '/api/auth/change-password', { current_password: 'gammalt123', new_password: 'nytt12345' }, token)).status, 200);
  assert.equal((await api('POST', '/api/auth/login', { email: 'acc@test.se', password: 'nytt12345' })).status, 200);

  // e-mail: wrong password, same address, then OK
  assert.equal((await api('POST', '/api/auth/change-email', { password: 'fel', new_email: 'ny@test.se' }, token)).status, 401);
  assert.equal((await api('POST', '/api/auth/change-email', { password: 'nytt12345', new_email: 'acc@test.se' }, token)).status, 422);
  const ce = await api('POST', '/api/auth/change-email', { password: 'nytt12345', new_email: 'Ny@Test.se' }, token);
  assert.equal(ce.status, 200, JSON.stringify(ce.data));
  assert.equal(ce.data.new_email, 'ny@test.se');
  const line = logged.find((l) => l.includes('demo-kod (email_change) för ny@test.se'));
  assert.ok(line);
  const code = /(\d{6})\s*$/.exec(line!)![1];
  assert.equal((await api('POST', '/api/auth/confirm-email', { code: code === '000000' ? '111111' : '000000' }, token)).status, 400);
  const ok = await api('POST', '/api/auth/confirm-email', { code }, token);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.user.email, 'ny@test.se');
  assert.equal((await api('POST', '/api/auth/login', { email: 'ny@test.se', password: 'nytt12345' })).status, 200);
  assert.equal((await api('POST', '/api/auth/login', { email: 'acc@test.se', password: 'nytt12345' })).status, 401);
  // the new token works and /me shows the new address
  const me = await api('GET', '/api/auth/me', undefined, ok.data.token);
  assert.equal(me.status, 200);
  assert.equal(me.data.email ?? me.data.user?.email, 'ny@test.se');
});
