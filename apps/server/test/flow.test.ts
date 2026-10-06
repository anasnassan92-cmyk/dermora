/**
 * End-to-end test of the MVP journey against the real Express app and a real (SQLite) database.
 * Run: npm test   (no network, no API keys – AI runs in mock mode)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dermora-test-'));
process.env.DATA_DIR = tmp;
process.env.ADMIN_EMAILS = 'admin@dermora.test';
for (const k of ['DB_HOST', 'GEMINI_API_KEY', 'GOOGLE_VISION_API_KEY', 'SMTP_USER', 'SMTP_PASS', 'GOOGLE_CLIENT_ID']) delete process.env[k];

let server: Server;
let base = '';

before(async () => {
  const { openDb } = await import('../src/db/index.js');
  const { createApp } = await import('../src/index.js');
  await openDb({ sqliteFile: path.join(tmp, 'test.db') });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => {
  server?.close();
});

async function api(method: string, p: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${base}${p}`, { method, headers, body: payload, redirect: 'manual' });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, res };
}

async function testJpeg(): Promise<Blob> {
  const sharp = (await import('sharp')).default;
  // textured image so the sharpness check has something to measure
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#d9b49a"/>${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 97) % 800}" cy="${(i * 53) % 1000}" r="${6 + (i % 9)}" fill="#a86f5a"/>`).join('')}</svg>`,
  );
  const buf = await sharp(svg).jpeg().toBuffer();
  return new Blob([new Uint8Array(buf)], { type: 'image/jpeg' });
}

const ANSWERS = {
  skin_type: 'combination',
  concerns: ['acne', 'dark_spots'],
  acne_frequency: 'often',
  acne_area: ['forehead', 'chin'],
  acne_type: ['whiteheads', 'papules'],
  sensitive: 'sometimes',
  duration: '1_6m',
  sudden_change: false,
  current_routine: ['cleanser'],
  goal: 'fewer_breakouts',
};

test('health and public config', async () => {
  const h = await api('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.data.ai, 'mock');
  const q = await api('GET', '/api/questionnaire');
  assert.equal(q.status, 200);
  assert.ok(q.data.questions.length > 5);
});

test('full MVP journey', async () => {
  // register → demo code returned because SMTP is not configured
  const weak = await api('POST', '/api/auth/register', { first_name: 'Alex', email: 'alex@test.se', password: 'short' });
  assert.equal(weak.status, 422);
  const reg = await api('POST', '/api/auth/register', { first_name: 'Alex', last_name: 'Andersson', email: 'Alex@Test.se', password: 'hudvard123' });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.match(reg.data.dev_code, /^\d{6}$/);
  let token = reg.data.token;

  // unverified users cannot use the app API
  assert.equal((await api('GET', '/api/profile', undefined, token)).status, 403);
  assert.equal((await api('POST', '/api/auth/verify', { code: '000000' === reg.data.dev_code ? '111111' : '000000' }, token)).status, 400);
  const ver = await api('POST', '/api/auth/verify', { code: reg.data.dev_code }, token);
  assert.equal(ver.status, 200);
  assert.equal(ver.data.user.email_verified, true);
  token = ver.data.token;

  // login works with any casing
  const login = await api('POST', '/api/auth/login', { email: 'ALEX@test.se', password: 'hudvard123' });
  assert.equal(login.status, 200);
  assert.equal((await api('POST', '/api/auth/login', { email: 'alex@test.se', password: 'wrong-pass1' })).status, 401);
  assert.equal((await api('POST', '/api/auth/register', { first_name: 'X', email: 'alex@test.se', password: 'hudvard123' })).status, 409);

  // Grundprofil
  const prof = await api('PUT', '/api/profile', { age_range: '25_34', gender: 'female', country: 'SE', skin_tone: 4, consent_images: true }, token);
  assert.equal(prof.status, 200, JSON.stringify(prof.data));
  assert.equal(prof.data.age_range, '25_34');
  assert.equal(prof.data.consent_images, true);
  assert.ok(prof.data.consent_at);

  // questionnaire
  const a = await api('POST', '/api/assessments', {}, token);
  assert.equal(a.status, 201);
  const aid = a.data.id;
  assert.equal((await api('POST', `/api/assessments/${aid}/submit`, undefined, token)).status, 422);
  assert.equal((await api('PUT', `/api/assessments/${aid}/answers`, { answers: ANSWERS }, token)).status, 200);
  const sub = await api('POST', `/api/assessments/${aid}/submit`, undefined, token);
  assert.equal(sub.status, 200, JSON.stringify(sub.data));
  assert.equal(sub.data.status, 'submitted');

  // images: four angles
  for (const area of ['face', 'left', 'right', 'closeup']) {
    const fd = new FormData();
    fd.append('file', await testJpeg(), 'skin.jpg');
    fd.append('assessment_id', aid);
    fd.append('area', area);
    const up = await api('POST', '/api/images', fd, token);
    assert.equal(up.status, 201, JSON.stringify(up.data));
    assert.equal(up.data.area, area);
    const file = await fetch(`${base}${up.data.url}`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/jpeg');
  }
  const imgs = await api('GET', `/api/images?assessment_id=${aid}`, undefined, token);
  assert.equal(imgs.data.length, 4);

  // AI analysis (mock) + chat
  const an = await api('POST', `/api/ai/analyze/${aid}`, undefined, token);
  assert.equal(an.status, 200, JSON.stringify(an.data));
  assert.equal(an.data.result.seek_care, false);
  assert.equal(an.data.result.plan.morning.length, 4);
  const chat = await api('POST', `/api/ai/chat/${aid}`, { content: 'Vilken rutin ska jag följa?' }, token);
  assert.equal(chat.status, 200);
  assert.equal(chat.data.role, 'assistant');
  const hist = await api('GET', `/api/ai/chat/${aid}`, undefined, token);
  assert.deepEqual(hist.data.map((m: { role: string }) => m.role), ['assistant', 'user', 'assistant']);

  // plan: propose → confirm → active; second confirm archives the first
  const p1 = await api('POST', `/api/plans/from-assessment/${aid}`, undefined, token);
  assert.equal(p1.status, 201);
  assert.equal((await api('POST', `/api/plans/${p1.data.id}/confirm`, undefined, token)).data.status, 'confirmed');
  const p2 = await api('POST', `/api/plans/from-assessment/${aid}`, undefined, token);
  await api('POST', `/api/plans/${p2.data.id}/confirm`, undefined, token);
  const active = await api('GET', '/api/plans/active', undefined, token);
  assert.equal(active.data.id, p2.data.id);
  const all = await api('GET', '/api/plans', undefined, token);
  assert.equal(all.data.find((p: { id: string }) => p.id === p1.data.id).status, 'archived');

  // another user sees nothing
  const other = await api('POST', '/api/auth/register', { first_name: 'Bo', email: 'bo@test.se', password: 'hudvard123' });
  const ot = (await api('POST', '/api/auth/verify', { code: other.data.dev_code }, other.data.token)).data.token;
  assert.equal((await api('GET', `/api/assessments/${aid}`, undefined, ot)).status, 404);
  assert.equal((await api('GET', '/api/plans/active', undefined, ot)).data, null);
  assert.equal((await fetch(`${base}/api/images/${imgs.data[0].id}/file`, { headers: { authorization: `Bearer ${ot}` } })).status, 404);
});

test('red flags force seek_care', async () => {
  const reg = await api('POST', '/api/auth/register', { first_name: 'Cy', email: 'cy@test.se', password: 'hudvard123' });
  const t = (await api('POST', '/api/auth/verify', { code: reg.data.dev_code }, reg.data.token)).data.token;
  const a = (await api('POST', '/api/assessments', {}, t)).data;
  await api('PUT', `/api/assessments/${a.id}/answers`, { answers: { ...ANSWERS, acne_type: ['cystic'], acne_pain: 8, acne_frequency: 'very_often', sudden_change: true } }, t);
  assert.equal((await api('POST', `/api/assessments/${a.id}/submit`, undefined, t)).status, 200);
  const an = await api('POST', `/api/ai/analyze/${a.id}`, undefined, t);
  assert.equal(an.data.result.seek_care, true);
  assert.ok(an.data.result.red_flags.length >= 2);
  assert.equal(an.data.result.plan.follow_up_days, 7);
});

test('image upload needs consent', async () => {
  const reg = await api('POST', '/api/auth/register', { first_name: 'Di', email: 'di@test.se', password: 'hudvard123' });
  const t = (await api('POST', '/api/auth/verify', { code: reg.data.dev_code }, reg.data.token)).data.token;
  const fd = new FormData();
  fd.append('file', await testJpeg(), 'skin.jpg');
  assert.equal((await api('POST', '/api/images', fd, t)).status, 403);
});

test('beta signup is idempotent', async () => {
  assert.equal((await api('POST', '/api/beta', { email: 'x@y.se' })).status, 201);
  assert.equal((await api('POST', '/api/beta', { email: 'X@y.se' })).status, 201);
  assert.equal((await api('POST', '/api/beta', { email: 'nope' })).status, 422);
});

test('admin panel: login, pages, access control', async () => {
  // not logged in → redirect
  const r0 = await api('GET', '/admin');
  assert.equal(r0.status, 302);
  // admin e-mail registers in the app like everyone else
  const reg = await api('POST', '/api/auth/register', { first_name: 'Admin', email: 'admin@dermora.test', password: 'hudvard123' });
  assert.equal(reg.data.user.is_admin, true);
  // a normal user cannot log in to /admin
  const bad = await fetch(`${base}/admin/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=alex%40test.se&password=hudvard123', redirect: 'manual' });
  assert.equal(bad.status, 401);
  const ok = await fetch(`${base}/admin/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=admin%40dermora.test&password=hudvard123', redirect: 'manual' });
  assert.equal(ok.status, 302);
  const cookie = ok.headers.get('set-cookie')!.split(';')[0];
  for (const page of ['/admin', '/admin/users', '/admin/chats', '/admin/flags', '/admin/beta', '/admin/questionnaire', '/admin/system']) {
    const res = await fetch(`${base}${page}`, { headers: { cookie } });
    assert.equal(res.status, 200, page);
    const html = await res.text();
    assert.match(html, /Dermora Admin/);
  }
  const users = await (await fetch(`${base}/admin/users`, { headers: { cookie } })).text();
  assert.match(users, /alex@test\.se/);
  const csv = await fetch(`${base}/admin/beta?format=csv`, { headers: { cookie } });
  assert.match(await csv.text(), /x@y\.se/);
  // HTML is escaped: register a user with a script tag as name
  await api('POST', '/api/auth/register', { first_name: '<script>alert(1)</script>', email: 'xss@test.se', password: 'hudvard123' });
  const list = await (await fetch(`${base}/admin/users`, { headers: { cookie } })).text();
  assert.ok(!list.includes('<script>alert(1)</script>'));
});

test('GDPR delete removes everything', async () => {
  const login = await api('POST', '/api/auth/login', { email: 'alex@test.se', password: 'hudvard123' });
  assert.equal((await api('DELETE', '/api/profile', undefined, login.data.token)).status, 204);
  assert.equal((await api('POST', '/api/auth/login', { email: 'alex@test.se', password: 'hudvard123' })).status, 401);
  const files = fs.readdirSync(path.join(tmp, 'uploads'));
  assert.ok(!files.includes(login.data.user.id));
});
