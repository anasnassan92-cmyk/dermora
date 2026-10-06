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
import { analyze, buildContext, chatReply, redFlagHints, type ImageInput, type SkinGuidance } from '../services/ai.js';
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
  for (const t of ['chat_messages', 'ai_assessments', 'treatment_plans', 'skin_images', 'assessments', 'email_codes']) await db.run(`DELETE FROM ${t} WHERE user_id = ?`, [userId]);
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
  if (!existing) await db.run('INSERT INTO chat_messages (id, user_id, assessment_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), req.user!.id, a.id, 'assistant', result.guidance.guidance, now()]);
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

appRouter.get('/ai/chat/:id', auth, async (req, res) => {
  const rows = await getDb().all('SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? AND assessment_id = ? ORDER BY created_at, id', [req.user!.id, String(req.params.id)]);
  res.json(rows);
});

appRouter.post('/ai/chat/:id', auth, async (req, res) => {
  const { content } = z.object({ content: z.string().trim().min(1).max(2000) }).parse(req.body);
  const a = await getAssessment(req.user!.id, String(req.params.id));
  const latest = await latestResult(req.user!.id, a.id);
  if (!latest) throw new HttpError(409, 'Kör analysen först.');
  const db = getDb();
  const history = await db.all<{ role: 'user' | 'assistant'; content: string }>('SELECT role, content FROM chat_messages WHERE assessment_id = ? AND user_id = ? ORDER BY created_at, id', [a.id, req.user!.id]);
  await db.run('INSERT INTO chat_messages (id, user_id, assessment_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), req.user!.id, a.id, 'user', content, now()]);
  const { context } = await contextFor(req.user!.id, a, false);
  let answer: string;
  try {
    answer = await chatReply(context, analyzeOut(latest).result, history, content);
  } catch (e) {
    console.error('[ai] chat failed:', (e as Error).message);
    throw new HttpError(502, 'AI-chatten svarar inte just nu. Försök igen om en stund.');
  }
  const id = crypto.randomUUID();
  const t = new Date(Date.now() + 1).toISOString(); // keep order after the user message
  await db.run('INSERT INTO chat_messages (id, user_id, assessment_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, req.user!.id, a.id, 'assistant', answer, t]);
  res.json({ id, role: 'assistant', content: answer, created_at: t });
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
