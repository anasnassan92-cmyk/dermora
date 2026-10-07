/**
 * App API (same contract as docs/04-api-contract.md and apps/mobile/src/types/api.ts).
 * Ownership: profile – Anas · questionnaire/assessments – Adam · images – Ali ·
 * ai – Youssef · plans – Even · database/API – Assad.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { HttpError, requireUser, signFileToken, verifyFileToken } from '../auth/index.js';
import { UPLOAD_DIR, config, features } from '../config.js';
import { getDb, now, parseJson } from '../db/index.js';
import { assessmentOut, planOut, profileOut, type AssessmentRow, type ImageRow, type PlanRow, type ProfileRow } from '../db/repo.js';
import { analyze, buildContext, chatReply, chatReplyStream, redFlagHints, updateMemory, type ChatContext, type ChatReply, type ChatTurn, type ImageInput, type SkinGuidance } from '../services/ai.js';
import { faceCheck, normalise } from '../services/images.js';
import { loadQuestionnaire, validateAnswers } from '../services/questionnaire.js';

export const appRouter = Router();
const auth = requireUser();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxImageBytes, files: 1 } });

// ---------- public ----------
appRouter.get('/config', (_req, res) => {
  res.json({ ai: features.ai, vision: features.vision, email: features.email, google_client_id: config.googleClientId || null });
});

appRouter.get('/questionnaire', (_req, res) => {
  res.json(loadQuestionnaire());
});

appRouter.post('/beta', async (req, res) => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email('Ange en giltig e-postadress.').max(190) }).parse(req.body);
  const db = getDb();
  const exists = await db.get('SELECT id FROM beta_signups WHERE email = ?', [email]);
  if (!exists) await db.run('INSERT INTO beta_signups (id, email, source, created_at) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), email, 'landing', now()]);
  res.status(201).json({ ok: true });
});

// ---------- profile (Anas) ----------
async function getProfile(userId: string) {
  const p = await getDb().get<ProfileRow>('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  if (!p) throw new HttpError(404, 'Profilen finns inte.');
  return p;
}

appRouter.get('/profile', auth, async (req, res) => {
  res.json(profileOut(await getProfile(req.user!.id)));
});

const profileSchema = z.object({
  display_name: z.string().max(160).nullable().optional(),
  birth_year: z.number().int().min(1900).max(2100).nullable().optional(),
  age_range: z.enum(['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus']).nullable().optional(),
  gender: z.enum(['female', 'male', 'non_binary', 'undisclosed']).nullable().optional(),
  country: z.string().length(2).nullable().optional(),
  skin_tone: z.number().int().min(1).max(6).nullable().optional(),
  skin_type: z.enum(['oily', 'dry', 'combination', 'normal', 'sensitive', 'unknown']).optional(),
  consent_images: z.boolean().optional(),
  locale: z.enum(['sv', 'en']).optional(),
});

appRouter.put('/profile', auth, async (req, res) => {
  const body = profileSchema.parse(req.body);
  const current = await getProfile(req.user!.id);
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    values.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
  }
  if (body.consent_images && !Number(current.consent_images)) {
    fields.push('consent_at = ?');
    values.push(now());
  }
  fields.push('updated_at = ?');
  values.push(now(), req.user!.id);
  await getDb().run(`UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
  res.json(profileOut(await getProfile(req.user!.id)));
});

appRouter.delete('/profile', auth, async (req, res) => {
  await deleteUserEverything(req.user!.id);
  res.status(204).end();
});

/** GDPR: removes files and every row (FK cascades). Also used by the admin panel. */
export async function deleteUserEverything(userId: string) {
  const db = getDb();
  const imgs = await db.all<{ file_name: string }>('SELECT file_name FROM skin_images WHERE user_id = ?', [userId]);
  for (const i of imgs) fs.rmSync(path.join(UPLOAD_DIR, i.file_name), { force: true });
  fs.rmSync(path.join(UPLOAD_DIR, userId), { recursive: true, force: true });
  for (const t of ['chat_messages', 'ai_assessments', 'treatment_plans', 'skin_images', 'assessments', 'email_codes', 'user_memory', 'routine_logs']) await db.run(`DELETE FROM ${t} WHERE user_id = ?`, [userId]);
  await db.run('DELETE FROM profiles WHERE user_id = ?', [userId]);
  await db.run('DELETE FROM users WHERE id = ?', [userId]);
}

// ---------- assessments (Adam) ----------
async function getAssessment(userId: string, id: string) {
  const a = await getDb().get<AssessmentRow>('SELECT * FROM assessments WHERE id = ? AND user_id = ?', [id, userId]);
  if (!a) throw new HttpError(404, 'Bedömningen finns inte.');
  return a;
}

appRouter.post('/assessments', auth, async (req, res) => {
  const id = crypto.randomUUID();
  await getDb().run('INSERT INTO assessments (id, user_id, questionnaire_version, status, answers, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, req.user!.id, loadQuestionnaire().version, 'draft', '{}', now()]);
  res.status(201).json(await assessmentOut(await getAssessment(req.user!.id, id)));
});

appRouter.get('/assessments', auth, async (req, res) => {
  const rows = await getDb().all<AssessmentRow>('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC', [req.user!.id]);
  res.json(await Promise.all(rows.map(assessmentOut)));
});

appRouter.get('/assessments/:id', auth, async (req, res) => {
  res.json(await assessmentOut(await getAssessment(req.user!.id, String(req.params.id))));
});

appRouter.put('/assessments/:id/answers', auth, async (req, res) => {
  const a = await getAssessment(req.user!.id, String(req.params.id));
  if (a.status !== 'draft') throw new HttpError(409, 'Bedömningen är redan inskickad.');
  const { answers } = z.object({ answers: z.record(z.string(), z.unknown()) }).parse(req.body);
  const merged = { ...parseJson<Record<string, unknown>>(a.answers, {}), ...answers };
  await getDb().run('UPDATE assessments SET answers = ? WHERE id = ?', [JSON.stringify(merged), a.id]);
  res.json(await assessmentOut(await getAssessment(req.user!.id, a.id)));
});

appRouter.post('/assessments/:id/submit', auth, async (req, res) => {
  const a = await getAssessment(req.user!.id, String(req.params.id));
  const errors = validateAnswers(loadQuestionnaire(), parseJson(a.answers, {}));
  if (errors.length) throw new HttpError(422, errors.join('\n'), { errors });
  await getDb().run('UPDATE assessments SET status = ?, submitted_at = ? WHERE id = ?', ['submitted', now(), a.id]);
  res.json(await assessmentOut(await getAssessment(req.user!.id, a.id)));
});

// ---------- images (Ali) ----------
const AREAS = ['face', 'left', 'right', 'closeup', 'other'] as const;

function imageOut(i: ImageRow, base = '/api') {
  return {
    id: i.id,
    user_id: i.user_id,
    assessment_id: i.assessment_id,
    area: i.area,
    width: i.width,
    height: i.height,
    bytes: i.bytes,
    face_check: parseJson(i.face_check, null),
    taken_at: i.created_at,
    created_at: i.created_at,
    url: `${base}/images/${i.id}/file?t=${signFileToken(i.user_id, i.id)}`,
  };
}

async function readUpload(file: Express.Multer.File | undefined) {
  if (!file) throw new HttpError(422, 'Ingen bild skickades.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.mimetype)) throw new HttpError(415, 'Endast JPEG, PNG, WebP eller HEIC.');
  try {
    return await normalise(file.buffer);
  } catch {
    throw new HttpError(422, 'Kunde inte läsa bilden.');
  }
}

appRouter.post('/images/check', auth, upload.single('file'), async (req, res) => {
  const img = await readUpload(req.file);
  res.json(await faceCheck(img.data, img.width, img.height));
});

appRouter.post('/images', auth, upload.single('file'), async (req, res) => {
  const profile = await getProfile(req.user!.id);
  if (!Number(profile.consent_images)) throw new HttpError(403, 'Du måste godkänna bildbehandling i din profil först.');
  const area = (AREAS as readonly string[]).includes(String(req.body.area)) ? String(req.body.area) : 'face';
  const assessmentId = req.body.assessment_id ? String(req.body.assessment_id) : null;
  if (assessmentId) await getAssessment(req.user!.id, assessmentId);
  const img = await readUpload(req.file);
  if (Math.min(img.width, img.height) < 300) throw new HttpError(422, 'Bilden har för låg upplösning.');
  const check = area === 'closeup' ? null : await faceCheck(img.data, img.width, img.height);
  const id = crypto.randomUUID();
  const fileName = `${req.user!.id}/${id}.jpg`;
  fs.mkdirSync(path.join(UPLOAD_DIR, req.user!.id), { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), img.data);
  await getDb().run(
    'INSERT INTO skin_images (id, user_id, assessment_id, file_name, area, width, height, bytes, face_check, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.id, assessmentId, fileName, area, img.width, img.height, img.data.length, check ? JSON.stringify(check) : null, now()],
  );
  const row = (await getDb().get<ImageRow>('SELECT * FROM skin_images WHERE id = ?', [id]))!;
  res.status(201).json(imageOut(row));
});

appRouter.get('/images', auth, async (req, res) => {
  const aid = req.query.assessment_id ? String(req.query.assessment_id) : null;
  const rows = aid
    ? await getDb().all<ImageRow>('SELECT * FROM skin_images WHERE user_id = ? AND assessment_id = ? ORDER BY created_at DESC', [req.user!.id, aid])
    : await getDb().all<ImageRow>('SELECT * FROM skin_images WHERE user_id = ? ORDER BY created_at DESC', [req.user!.id]);
  res.json(rows.map((r) => imageOut(r)));
});

/** File route: accepts the short-lived ?t= token (for <Image>) or a Bearer header. */
appRouter.get('/images/:id/file', async (req, res, next) => {
  const id = String(req.params.id);
  const tokenUser = req.query.t ? verifyFileToken(String(req.query.t), id) : null;
  if (!tokenUser) return requireUser()(req, res, async (err?: unknown) => (err ? next(err) : sendFile(req.user!.id)));
  return sendFile(tokenUser);
  async function sendFile(userId: string) {
    const row = await getDb().get<ImageRow>('SELECT * FROM skin_images WHERE id = ? AND user_id = ?', [id, userId]);
    if (!row) return next(new HttpError(404, 'Bilden finns inte.'));
    const file = path.join(UPLOAD_DIR, row.file_name);
    if (!fs.existsSync(file)) return next(new HttpError(410, 'Bildfilen saknas.'));
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.type('jpeg').send(fs.readFileSync(file));
  }
});

appRouter.delete('/images/:id', auth, async (req, res) => {
  const row = await getDb().get<ImageRow>('SELECT * FROM skin_images WHERE id = ? AND user_id = ?', [String(req.params.id), req.user!.id]);
  if (!row) throw new HttpError(404, 'Bilden finns inte.');
  fs.rmSync(path.join(UPLOAD_DIR, row.file_name), { force: true });
  await getDb().run('DELETE FROM skin_images WHERE id = ?', [row.id]);
  res.status(204).end();
});

// ---------- AI (Youssef) ----------
async function contextFor(userId: string, a: AssessmentRow, withImages: boolean) {
  const db = getDb();
  const profile = await db.get<Record<string, unknown>>('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  const rows = await db.all<ImageRow>('SELECT * FROM skin_images WHERE assessment_id = ? AND user_id = ? ORDER BY created_at', [a.id, userId]);
  const images: ImageInput[] = [];
  for (const r of rows.slice(0, 4)) {
    const file = path.join(UPLOAD_DIR, r.file_name);
    images.push({ data: withImages && fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0), mimeType: 'image/jpeg', area: r.area, faceCheck: parseJson(r.face_check, null) });
  }
  const usable = images.filter((i) => i.data.length || !withImages);
  return { context: buildContext(profile, loadQuestionnaire(), parseJson(a.answers, {}), usable), images: usable };
}

function analyzeOut(row: { assessment_id: string; provider: string; model: string; result: string }) {
  return { assessment_id: row.assessment_id, provider: row.provider, model: row.model, result: parseJson<SkinGuidance>(row.result, {} as SkinGuidance) };
}

appRouter.post('/ai/analyze/:id', auth, async (req, res) => {
  const a = await getAssessment(req.user!.id, String(req.params.id));
  if (a.status === 'draft') throw new HttpError(409, 'Skicka in svaren först.');
  const { context, images } = await contextFor(req.user!.id, a, true);
  let result;
  try {
    result = await analyze(context, images, redFlagHints(parseJson(a.answers, {})));
  } catch (e) {
    await getDb().run('UPDATE assessments SET status = ? WHERE id = ?', ['failed', a.id]);
    console.error('[ai] analyze failed:', (e as Error).message);
    throw new HttpError(502, 'AI-analysen misslyckades. Försök igen om en stund.');
  }
  const db = getDb();
  const id = crypto.randomUUID();
  await db.run(
    'INSERT INTO ai_assessments (id, user_id, assessment_id, provider, model, result, seek_care, input_tokens, output_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.id, a.id, result.provider, result.model, JSON.stringify(result.guidance), result.guidance.seek_care ? 1 : 0, result.inputTokens ?? null, result.outputTokens ?? null, now()],
  );
  await db.run('UPDATE assessments SET status = ?, analyzed_at = ? WHERE id = ?', ['analyzed', now(), a.id]);
  const existing = await db.get('SELECT id FROM chat_messages WHERE assessment_id = ?', [a.id]);
  if (!existing) await db.run('INSERT INTO chat_messages (id, user_id, assessment_id, role, content, created_at, meta) VALUES (?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), req.user!.id, a.id, 'assistant', result.guidance.guidance, now(), JSON.stringify({ sources: result.sources ?? [], model: result.model })]);
  res.json({ assessment_id: a.id, provider: result.provider, model: result.model, result: result.guidance });
});

async function latestResult(userId: string, assessmentId: string) {
  return getDb().get<{ assessment_id: string; provider: string; model: string; result: string }>(
    'SELECT assessment_id, provider, model, result FROM ai_assessments WHERE user_id = ? AND assessment_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId, assessmentId],
  );
}

appRouter.get('/ai/result/:id', auth, async (req, res) => {
  const row = await latestResult(req.user!.id, String(req.params.id));
  res.json(row ? analyzeOut(row) : null);
});

// ---------- chat (Youssef) – memory, knowledge base, streaming, feedback ----------
interface ChatRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  rating: number | null;
  meta: string | null;
}

function chatOut(m: ChatRow) {
  const meta = parseJson<{ suggestions?: string[]; sources?: string[]; image_id?: string; model?: string }>(m.meta, {});
  return { id: m.id, role: m.role, content: m.content, created_at: m.created_at, rating: m.rating ?? null, suggestions: meta.suggestions ?? [], sources: meta.sources ?? [], image_id: meta.image_id ?? null };
}

const DAY_MS = 86_400_000;

/** Active plan + how well the routine has been followed (for the chatbot and the Framsteg tab). */
async function planStatus(userId: string) {
  const db = getDb();
  const plan = await db.get<PlanRow>("SELECT * FROM treatment_plans WHERE user_id = ? AND status = 'confirmed' ORDER BY confirmed_at DESC LIMIT 1", [userId]);
  if (!plan) return { plan: null, note: null, checkinDue: false, adherence14: 0, streak: 0, daysOnPlan: 0, followUpDays: 14 };
  const p = parseJson<{ follow_up_days?: number }>(plan.plan, {});
  const followUpDays = Math.min(90, Math.max(7, Number(p.follow_up_days) || 14));
  const since = plan.confirmed_at ?? plan.created_at;
  const daysOnPlan = Math.floor((Date.now() - new Date(since).getTime()) / DAY_MS);
  const logs = await db.all<{ day: string; slot: string; done: number }>('SELECT day, slot, done FROM routine_logs WHERE user_id = ? ORDER BY day DESC', [userId]);
  const today = new Date();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const last14 = new Set<string>();
  for (let i = 0; i < 14; i++) last14.add(dayKey(new Date(today.getTime() - i * DAY_MS)));
  const done14 = logs.filter((l) => l.done && last14.has(l.day) && (l.slot === 'morning' || l.slot === 'evening')).length;
  const adherence14 = Math.round((done14 / 28) * 100);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const k = dayKey(new Date(today.getTime() - i * DAY_MS));
    const any = logs.some((l) => l.day === k && l.done && (l.slot === 'morning' || l.slot === 'evening'));
    if (!any) {
      if (i === 0) continue; // today may not be logged yet
      break;
    }
    streak++;
  }
  const lastCheckin = await db.get<{ created_at: string }>("SELECT created_at FROM chat_messages WHERE user_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1", [userId]);
  const daysSinceChat = lastCheckin ? Math.floor((Date.now() - new Date(lastCheckin.created_at).getTime()) / DAY_MS) : 999;
  const checkinDue = daysOnPlan >= followUpDays && daysSinceChat >= 3;
  const note = [
    `Plan: "${plan.title}", bekräftad för ${daysOnPlan} dagar sedan (uppföljning efter ${followUpDays} dagar).`,
    `Följsamhet senaste 14 dagarna: ${adherence14} % av morgon-/kvällsrutinerna loggade som gjorda. Nuvarande svit: ${streak} dagar.`,
  ].join('\n');
  return { plan, note, checkinDue, adherence14, streak, daysOnPlan, followUpDays };
}

async function loadImage(userId: string, imageId: string | null | undefined): Promise<ImageInput | null> {
  if (!imageId) return null;
  const row = await getDb().get<ImageRow>('SELECT * FROM skin_images WHERE id = ? AND user_id = ?', [imageId, userId]);
  if (!row) throw new HttpError(404, 'Bilden finns inte.');
  const file = path.join(UPLOAD_DIR, row.file_name);
  if (!fs.existsSync(file)) throw new HttpError(410, 'Bildfilen saknas.');
  return { data: fs.readFileSync(file), mimeType: 'image/jpeg', area: row.area };
}

async function chatContextFor(userId: string, a: AssessmentRow, message: string, imageId?: string | null): Promise<ChatContext> {
  const db = getDb();
  const latest = await latestResult(userId, a.id);
  if (!latest) throw new HttpError(409, 'Kör analysen först.');
  const history = await db.all<ChatTurn>('SELECT role, content FROM chat_messages WHERE assessment_id = ? AND user_id = ? ORDER BY created_at, id', [a.id, userId]);
  const { context } = await contextFor(userId, a, false);
  const mem = await db.get<{ summary: string | null }>('SELECT summary FROM user_memory WHERE user_id = ?', [userId]);
  const status = await planStatus(userId);
  const image = await loadImage(userId, imageId);
  let previousImage: ImageInput | null = null;
  if (image) {
    const first = await db.get<ImageRow>("SELECT * FROM skin_images WHERE assessment_id = ? AND user_id = ? AND area = 'face' AND id <> ? ORDER BY created_at ASC LIMIT 1", [a.id, userId, imageId]);
    if (first) previousImage = await loadImage(userId, first.id).catch(() => null);
  }
  return { context, guidance: analyzeOut(latest).result, history, message, memory: mem?.summary ?? null, planNote: status.note, checkinDue: status.checkinDue, image, previousImage };
}

async function storeTurn(userId: string, assessmentId: string, role: 'user' | 'assistant', content: string, meta: Record<string, unknown> | null, createdAt = now()) {
  const id = crypto.randomUUID();
  await getDb().run('INSERT INTO chat_messages (id, user_id, assessment_id, role, content, created_at, meta) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, userId, assessmentId, role, content, createdAt, meta ? JSON.stringify(meta) : null]);
  return { id, created_at: createdAt };
}

/** Every third user turn: refresh the rolling memory in the background (never blocks the reply). */
async function maybeUpdateMemory(userId: string, assessmentId: string) {
  const db = getDb();
  const row = await db.get<{ turns: number; summary: string | null }>('SELECT turns, summary FROM user_memory WHERE user_id = ?', [userId]);
  const turns = (row?.turns ?? 0) + 1;
  if (!row) await db.run('INSERT INTO user_memory (user_id, summary, turns, updated_at) VALUES (?, ?, ?, ?)', [userId, null, turns, now()]);
  else await db.run('UPDATE user_memory SET turns = ? WHERE user_id = ?', [turns, userId]);
  if (turns % 3 !== 0) return;
  const history = await db.all<ChatTurn>('SELECT role, content FROM chat_messages WHERE assessment_id = ? AND user_id = ? ORDER BY created_at, id', [assessmentId, userId]);
  const profile = await db.get<Record<string, unknown>>('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  const profileLine = `Ålder ${profile?.age_range ?? '?'}, kön ${profile?.gender ?? '?'}, hudton ${profile?.skin_tone ?? '?'}, hudtyp ${profile?.skin_type ?? '?'}`;
  try {
    const summary = await updateMemory(row?.summary ?? null, history, profileLine);
    await db.run('UPDATE user_memory SET summary = ?, updated_at = ? WHERE user_id = ?', [summary, now(), userId]);
  } catch (e) {
    console.warn('[ai] memory update failed:', (e as Error).message);
  }
}

const chatBody = z.object({ content: z.string().trim().min(1).max(2000), image_id: z.string().uuid().optional().nullable() });

appRouter.get('/ai/chat/:id', auth, async (req, res) => {
  const rows = await getDb().all<ChatRow>('SELECT id, role, content, created_at, rating, meta FROM chat_messages WHERE user_id = ? AND assessment_id = ? ORDER BY created_at, id', [req.user!.id, String(req.params.id)]);
  res.json(rows.map(chatOut));
});

/** Extra state for the chat screen: whether a follow-up check-in is due, the active plan summary. */
appRouter.get('/ai/chat/:id/status', auth, async (req, res) => {
  await getAssessment(req.user!.id, String(req.params.id));
  const s = await planStatus(req.user!.id);
  res.json({ checkin_due: s.checkinDue, days_on_plan: s.daysOnPlan, follow_up_days: s.followUpDays, adherence_14d: s.adherence14, streak: s.streak });
});

appRouter.post('/ai/chat/:id', auth, async (req, res) => {
  const { content, image_id } = chatBody.parse(req.body);
  const a = await getAssessment(req.user!.id, String(req.params.id));
  const ctx = await chatContextFor(req.user!.id, a, content, image_id);
  await storeTurn(req.user!.id, a.id, 'user', content, image_id ? { image_id } : null);
  let reply: ChatReply;
  try {
    reply = await chatReply(ctx);
  } catch (e) {
    console.error('[ai] chat failed:', (e as Error).message);
    throw new HttpError(502, 'AI-chatten svarar inte just nu. Försök igen om en stund.');
  }
  const t = new Date(Date.now() + 1).toISOString(); // keep order after the user message
  const { id } = await storeTurn(req.user!.id, a.id, 'assistant', reply.text, { suggestions: reply.suggestions, sources: reply.sources, model: reply.model }, t);
  res.json({ id, role: 'assistant', content: reply.text, created_at: t, rating: null, suggestions: reply.suggestions, sources: reply.sources, image_id: null });
  void maybeUpdateMemory(req.user!.id, a.id);
});

/** Server-sent events: `delta` chunks while the model writes, then one `done` with the stored message. */
appRouter.post('/ai/chat/:id/stream', auth, async (req, res) => {
  const { content, image_id } = chatBody.parse(req.body);
  const a = await getAssessment(req.user!.id, String(req.params.id));
  const ctx = await chatContextFor(req.user!.id, a, content, image_id);
  await storeTurn(req.user!.id, a.id, 'user', content, image_id ? { image_id } : null);
  res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    for await (const part of chatReplyStream(ctx)) {
      if (part.delta) send('delta', { text: part.delta });
      if (part.done) {
        const t = new Date(Date.now() + 1).toISOString();
        const { id } = await storeTurn(req.user!.id, a.id, 'assistant', part.done.text, { suggestions: part.done.suggestions, sources: part.done.sources, model: part.done.model }, t);
        send('done', { id, role: 'assistant', content: part.done.text, created_at: t, rating: null, suggestions: part.done.suggestions, sources: part.done.sources, image_id: null });
      }
    }
  } catch (e) {
    console.error('[ai] chat stream failed:', (e as Error).message);
    send('error', { detail: 'AI-chatten svarar inte just nu. Försök igen om en stund.' });
  }
  res.end();
  void maybeUpdateMemory(req.user!.id, a.id);
});

appRouter.post('/ai/chat/:id/feedback', auth, async (req, res) => {
  const { message_id, rating, comment } = z.object({ message_id: z.string().min(1), rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]), comment: z.string().trim().max(500).optional() }).parse(req.body);
  const r = await getDb().run("UPDATE chat_messages SET rating = ?, feedback = ? WHERE id = ? AND user_id = ? AND assessment_id = ? AND role = 'assistant'", [rating === 0 ? null : rating, comment ?? null, message_id, req.user!.id, String(req.params.id)]);
  if (!r.changes) throw new HttpError(404, 'Meddelandet finns inte.');
  res.status(204).end();
});

// ---------- progress ("Framsteg" – Even) ----------
appRouter.get('/progress', auth, async (req, res) => {
  const s = await planStatus(req.user!.id);
  const db = getDb();
  const logs = await db.all<{ day: string; slot: string; done: number; note: string | null }>('SELECT day, slot, done, note FROM routine_logs WHERE user_id = ? AND day >= ? ORDER BY day', [req.user!.id, new Date(Date.now() - 27 * DAY_MS).toISOString().slice(0, 10)]);
  const photos = await db.all<ImageRow>("SELECT * FROM skin_images WHERE user_id = ? AND area = 'face' ORDER BY created_at ASC", [req.user!.id]);
  res.json({
    plan: s.plan ? planOut(s.plan) : null,
    days_on_plan: s.daysOnPlan,
    follow_up_days: s.followUpDays,
    checkin_due: s.checkinDue,
    adherence_14d: s.adherence14,
    streak: s.streak,
    logs,
    photos: photos.map((p) => imageOut(p)),
  });
});

appRouter.post('/progress/log', auth, async (req, res) => {
  const { day, slot, done, note } = z
    .object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => { const t = Date.parse(`${d}T00:00:00Z`); return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d; }, 'Ogiltigt datum.'), slot: z.enum(['morning', 'evening', 'weekly']), done: z.boolean(), note: z.string().trim().max(300).optional() })
    .parse(req.body);
  const db = getDb();
  const existing = await db.get<{ id: string }>('SELECT id FROM routine_logs WHERE user_id = ? AND day = ? AND slot = ?', [req.user!.id, day, slot]);
  if (existing) await db.run('UPDATE routine_logs SET done = ?, note = ? WHERE id = ?', [done ? 1 : 0, note ?? null, existing.id]);
  else await db.run('INSERT INTO routine_logs (id, user_id, day, slot, done, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), req.user!.id, day, slot, done ? 1 : 0, note ?? null, now()]);
  res.status(existing ? 200 : 201).json({ day, slot, done });
});

// ---------- plans (Even) ----------
async function getPlan(userId: string, id: string) {
  const p = await getDb().get<PlanRow>('SELECT * FROM treatment_plans WHERE id = ? AND user_id = ?', [id, userId]);
  if (!p) throw new HttpError(404, 'Planen finns inte.');
  return p;
}

async function insertPlan(userId: string, assessmentId: string | null, plan: { title: string; summary?: string }) {
  const id = crypto.randomUUID();
  const t = now();
  await getDb().run('INSERT INTO treatment_plans (id, user_id, assessment_id, status, title, summary, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    id,
    userId,
    assessmentId,
    'proposed',
    plan.title,
    plan.summary ?? null,
    JSON.stringify(plan),
    t,
    t,
  ]);
  return getPlan(userId, id);
}

appRouter.post('/plans/from-assessment/:id', auth, async (req, res) => {
  const latest = await latestResult(req.user!.id, String(req.params.id));
  if (!latest) throw new HttpError(409, 'Ingen AI-bedömning finns för denna bedömning.');
  res.status(201).json(planOut(await insertPlan(req.user!.id, latest.assessment_id, analyzeOut(latest).result.plan)));
});

appRouter.post('/plans', auth, async (req, res) => {
  const body = z.object({ assessment_id: z.string().nullable().optional(), plan: z.object({ title: z.string().min(1), summary: z.string().optional() }).passthrough() }).parse(req.body);
  res.status(201).json(planOut(await insertPlan(req.user!.id, body.assessment_id ?? null, body.plan)));
});

appRouter.get('/plans', auth, async (req, res) => {
  const rows = await getDb().all<PlanRow>('SELECT * FROM treatment_plans WHERE user_id = ? ORDER BY created_at DESC', [req.user!.id]);
  res.json(rows.map(planOut));
});

appRouter.get('/plans/active', auth, async (req, res) => {
  const row = await getDb().get<PlanRow>("SELECT * FROM treatment_plans WHERE user_id = ? AND status = 'confirmed' ORDER BY confirmed_at DESC LIMIT 1", [req.user!.id]);
  res.json(row ? planOut(row) : null);
});

appRouter.get('/plans/:id', auth, async (req, res) => {
  res.json(planOut(await getPlan(req.user!.id, String(req.params.id))));
});

appRouter.post('/plans/:id/confirm', auth, async (req, res) => {
  const p = await getPlan(req.user!.id, String(req.params.id));
  if (p.status !== 'confirmed') {
    const db = getDb();
    await db.run("UPDATE treatment_plans SET status = 'archived', updated_at = ? WHERE user_id = ? AND status = 'confirmed'", [now(), req.user!.id]);
    await db.run("UPDATE treatment_plans SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", [now(), now(), p.id]);
  }
  res.json(planOut(await getPlan(req.user!.id, p.id)));
});

appRouter.post('/plans/:id/archive', auth, async (req, res) => {
  const p = await getPlan(req.user!.id, String(req.params.id));
  await getDb().run("UPDATE treatment_plans SET status = 'archived', updated_at = ? WHERE id = ?", [now(), p.id]);
  res.json(planOut(await getPlan(req.user!.id, p.id)));
});
