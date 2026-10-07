/**
 * Chatbot upgrade: knowledge retrieval, suggestions, streaming, feedback, memory, progress log.
 * Runs in mock mode (no GEMINI_API_KEY) against a temporary SQLite database.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dermora-chat-'));
process.env.DATA_DIR = tmp;
process.env.DERMORA_NO_LISTEN = '1';
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

after(() => server?.close());

async function api(method: string, p: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${base}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, res, text };
}

const ANSWERS = { skin_type: 'combination', concerns: ['acne', 'dark_spots'], acne_frequency: 'often', acne_area: ['forehead', 'chin'], acne_type: ['whiteheads', 'papules'], sensitive: 'sometimes', duration: '1_6m', sudden_change: false, current_routine: ['cleanser'], goal: 'fewer_breakouts' };

test('knowledge base: Swedish BM25 retrieval finds the right chunks', async () => {
  const { retrieve, knowledgeSize, loadKnowledge } = await import('../src/services/knowledge.js');
  loadKnowledge();
  assert.ok(knowledgeSize() >= 40, `expected many chunks, got ${knowledgeSize()}`);
  const hits = retrieve('Kan jag använda salicylsyra mot pormaskar?', 3);
  assert.ok(hits.length);
  assert.equal(hits[0].id, 'ingredienser#salicylsyra-bha');
  const preg = retrieve('Jag är gravid, vad ska jag undvika?', 3).map((h) => h.id);
  assert.ok(preg.includes('vardkontakt-sakerhet#graviditet-och-amning'), preg.join(','));
  const combo = retrieve('retinol och AHA samma kväll', 3).map((h) => h.id);
  assert.ok(combo.some((id) => id.startsWith('kombinationer#')), combo.join(','));
});

test('parseChatOutput splits the suggestion tail', async () => {
  const { parseChatOutput } = await import('../src/services/ai.js');
  const r = parseChatOutput('Börja varannan kväll.\n\n>>> ["Hur ofta?", "Vad om det svider?"]');
  assert.equal(r.text, 'Börja varannan kväll.');
  assert.deepEqual(r.suggestions, ['Hur ofta?', 'Vad om det svider?']);
  assert.deepEqual(parseChatOutput('Bara text').suggestions, []);
  assert.equal(parseChatOutput('Text\n>>> - En fråga\n- Två').suggestions.length, 2);
});

test('chat: suggestions, sources, streaming, feedback, status, progress', async () => {
  const reg = await api('POST', '/api/auth/register', { first_name: 'Chat', email: 'chat@test.se', password: 'hudvard123' });
  assert.equal(reg.status, 201);
  let token = reg.data.token;
  const ver = await api('POST', '/api/auth/verify', { code: reg.data.dev_code }, token);
  token = ver.data.token ?? token;
  await api('PUT', '/api/profile', { age_range: '25_34', gender: 'female', country: 'SE', skin_tone: 4, consent_images: true }, token);
  const a = await api('POST', '/api/assessments', {}, token);
  const aid = a.data.id;
  await api('PUT', `/api/assessments/${aid}/answers`, { answers: ANSWERS }, token);
  await api('POST', `/api/assessments/${aid}/submit`, undefined, token);

  // before the analysis the chat refuses
  assert.equal((await api('POST', `/api/ai/chat/${aid}`, { content: 'hej' }, token)).status, 409);
  const an = await api('POST', `/api/ai/analyze/${aid}`, undefined, token);
  assert.equal(an.status, 200);

  // non-streaming reply carries suggestions + knowledge sources
  const chat = await api('POST', `/api/ai/chat/${aid}`, { content: 'Varför föreslår du salicylsyra?' }, token);
  assert.equal(chat.status, 200, JSON.stringify(chat.data));
  assert.equal(chat.data.role, 'assistant');
  assert.ok(Array.isArray(chat.data.suggestions) && chat.data.suggestions.length >= 2);
  assert.ok(Array.isArray(chat.data.sources));

  // streaming reply: SSE with delta events and a final done event; the message is stored
  const res = await fetch(`${base}/api/ai/chat/${aid}/stream`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ content: 'Vilken rutin ska jag följa?' }) });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);
  const body = await res.text();
  const deltas = [...body.matchAll(/event: delta\ndata: (.*)\n/g)].map((m) => JSON.parse(m[1]).text).join('');
  const done = JSON.parse(/event: done\ndata: (.*)\n/.exec(body)![1]);
  assert.ok(deltas.length > 20);
  assert.equal(done.content, deltas);
  assert.ok(done.suggestions.length >= 2);
  const hist = await api('GET', `/api/ai/chat/${aid}`, undefined, token);
  assert.equal(hist.data.filter((m: { role: string }) => m.role === 'assistant').length, 3); // seed + 2 replies
  assert.ok(hist.data.at(-1).suggestions.length >= 2);

  // feedback
  assert.equal((await api('POST', `/api/ai/chat/${aid}/feedback`, { message_id: done.id, rating: -1, comment: 'För allmänt' }, token)).status, 204);
  assert.equal((await api('POST', `/api/ai/chat/${aid}/feedback`, { message_id: 'nope', rating: 1 }, token)).status, 404);
  const hist2 = await api('GET', `/api/ai/chat/${aid}`, undefined, token);
  assert.equal(hist2.data.at(-1).rating, -1);

  // a third user turn triggers the (mock) memory update
  await api('POST', `/api/ai/chat/${aid}`, { content: 'Jag får ofta sveda av syror.' }, token);
  await new Promise((r) => setTimeout(r, 150));
  const { getDb } = await import('../src/db/index.js');
  const mem = await getDb().get<{ summary: string | null; turns: number }>('SELECT summary, turns FROM user_memory WHERE user_id = ?', [reg.data.user.id]);
  assert.equal(mem?.turns, 3);
  assert.match(mem?.summary ?? '', /sveda/);

  // status + progress without a plan
  const st = await api('GET', `/api/ai/chat/${aid}/status`, undefined, token);
  assert.equal(st.status, 200);
  assert.equal(st.data.checkin_due, false);

  // plan + routine log + progress
  const plan = await api('POST', `/api/plans/from-assessment/${aid}`, undefined, token);
  assert.equal(plan.status, 201, JSON.stringify(plan.data));
  assert.equal((await api('POST', `/api/plans/${plan.data.id}/confirm`, undefined, token)).status, 200);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await api('POST', '/api/progress/log', { day: today, slot: 'morning', done: true }, token)).status, 201);
  assert.equal((await api('POST', '/api/progress/log', { day: today, slot: 'morning', done: true }, token)).status, 200); // upsert
  assert.equal((await api('POST', '/api/progress/log', { day: today, slot: 'evening', done: true }, token)).status, 201);
  assert.equal((await api('POST', '/api/progress/log', { day: '2026-13-99', slot: 'evening', done: true }, token)).status, 422);
  const prog = await api('GET', '/api/progress', undefined, token);
  assert.equal(prog.status, 200);
  assert.equal(prog.data.plan.id, plan.data.id);
  assert.equal(prog.data.logs.length, 2);
  assert.ok(prog.data.adherence_14d >= 7);
  assert.ok(Array.isArray(prog.data.photos));

  // admin sees ratings and memory
  const login = await api('POST', '/api/auth/register', { first_name: 'Admin', email: 'admin@dermora.test', password: 'hudvard123' });
  await api('POST', '/api/auth/verify', { code: login.data.dev_code }, login.data.token);
  const form = new URLSearchParams({ email: 'admin@dermora.test', password: 'hudvard123' });
  const l = await fetch(`${base}/admin/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form, redirect: 'manual' });
  const cookie = l.headers.get('set-cookie')?.split(';')[0] ?? '';
  const chats = await fetch(`${base}/admin/chats`, { headers: { cookie } });
  const html = await chats.text();
  assert.match(html, /👎/);
  assert.match(html, /För allmänt/);
  const user = await (await fetch(`${base}/admin/users/${reg.data.user.id}`, { headers: { cookie } })).text();
  assert.match(user, /Minnesanteckningar/);
  assert.match(user, /sveda/);
  const sys = await (await fetch(`${base}/admin/system`, { headers: { cookie } })).text();
  assert.match(sys, /Kunskapsbas/);

  // GDPR delete also removes memory and routine logs
  assert.equal((await api('DELETE', '/api/profile', undefined, token)).status, 204);
  assert.equal(await getDb().get('SELECT 1 FROM user_memory WHERE user_id = ?', [reg.data.user.id]), undefined);
  assert.equal(await getDb().get('SELECT 1 FROM routine_logs WHERE user_id = ?', [reg.data.user.id]), undefined);
});
