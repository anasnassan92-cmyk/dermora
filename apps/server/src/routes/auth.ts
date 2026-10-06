/**
 * /api/auth – owner: Anas.
 *   POST /register {first_name,last_name,email,password}  → {token, user, dev_code?}
 *   POST /verify   {code}  (Bearer)                       → {token, user}
 *   POST /resend           (Bearer)                       → {sent, dev_code?}
 *   POST /login    {email,password}                       → {token, user}
 *   POST /google   {id_token}                             → {token, user}
 *   GET  /me               (Bearer)                       → {user}
 * dev_code is only returned when SMTP is not configured (demo mode).
 */
import crypto from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import {
  HttpError,
  checkEmailCode,
  checkPassword,
  createEmailCode,
  findUserByEmail,
  findUserById,
  hashPassword,
  isAdminEmail,
  passwordProblem,
  rateLimit,
  requireUser,
  signAppToken,
  toAuthUser,
  verifyGoogleIdToken,
  type UserRow,
} from '../auth/index.js';
import { getDb, now } from '../db/index.js';
import { sendCode } from '../services/mailer.js';

export const authRouter = Router();

const userOut = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  first_name: u.first_name,
  last_name: u.last_name,
  email_verified: !!Number(u.email_verified),
  is_admin: !!Number(u.is_admin) || isAdminEmail(u.email),
});

async function createUser(data: { email: string; password_hash: string | null; google_sub?: string | null; first_name?: string | null; last_name?: string | null; verified: boolean }) {
  const id = crypto.randomUUID();
  const t = now();
  const db = getDb();
  await db.run(
    'INSERT INTO users (id, email, password_hash, google_sub, first_name, last_name, email_verified, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.email.toLowerCase(), data.password_hash, data.google_sub ?? null, data.first_name ?? null, data.last_name ?? null, data.verified ? 1 : 0, isAdminEmail(data.email) ? 1 : 0, t],
  );
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  await db.run('INSERT INTO profiles (user_id, display_name, country, skin_type, consent_images, locale, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)', [id, name, 'SE', 'unknown', 'sv', t]);
  return (await findUserById(id))!;
}

const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'Ange ditt förnamn.').max(80),
  last_name: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().toLowerCase().email('Ange en giltig e-postadress.').max(190),
  password: z.string().max(200),
});

authRouter.post('/register', rateLimit(10, 15 * 60_000), async (req, res) => {
  const body = registerSchema.parse(req.body);
  const problem = passwordProblem(body.password);
  if (problem) throw new HttpError(422, problem);
  const existing = await findUserByEmail(body.email);
  if (existing) throw new HttpError(409, 'E-postadressen är redan registrerad. Logga in i stället.');
  const user = await createUser({ email: body.email, password_hash: await hashPassword(body.password), first_name: body.first_name, last_name: body.last_name || null, verified: false });
  const code = await createEmailCode(user.id);
  const devCode = await sendCode(user.email, code, user.first_name);
  res.status(201).json({ token: signAppToken(toAuthUser(user)), user: userOut(user), dev_code: devCode ?? undefined });
});

authRouter.post('/verify', rateLimit(20, 15 * 60_000), requireUser({ verified: false }), async (req, res) => {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/, 'Ange de sex siffrorna från mejlet.') }).parse(req.body);
  await checkEmailCode(req.user!.id, code);
  await getDb().run('UPDATE users SET email_verified = 1 WHERE id = ?', [req.user!.id]);
  const user = (await findUserById(req.user!.id))!;
  res.json({ token: signAppToken(toAuthUser(user)), user: userOut(user) });
});

authRouter.post('/resend', rateLimit(5, 15 * 60_000), requireUser({ verified: false }), async (req, res) => {
  const user = (await findUserById(req.user!.id))!;
  if (Number(user.email_verified)) return res.json({ sent: false, already_verified: true });
  const code = await createEmailCode(user.id);
  const devCode = await sendCode(user.email, code, user.first_name);
  res.json({ sent: !devCode, dev_code: devCode ?? undefined });
});

authRouter.post('/login', rateLimit(20, 15 * 60_000), async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).parse(req.body);
  const user = await findUserByEmail(email);
  if (!user || !(await checkPassword(password, user.password_hash))) throw new HttpError(401, 'Fel e-post eller lösenord.');
  await getDb().run('UPDATE users SET last_login_at = ? WHERE id = ?', [now(), user.id]);
  let devCode: string | null = null;
  if (!Number(user.email_verified)) devCode = await sendCode(user.email, await createEmailCode(user.id), user.first_name);
  res.json({ token: signAppToken(toAuthUser(user)), user: userOut(user), dev_code: devCode ?? undefined });
});

authRouter.post('/google', rateLimit(20, 15 * 60_000), async (req, res) => {
  const { id_token } = z.object({ id_token: z.string().min(20) }).parse(req.body);
  const info = await verifyGoogleIdToken(id_token);
  let user = await findUserByEmail(info.email);
  if (!user) {
    user = await createUser({ email: info.email, password_hash: null, google_sub: info.sub, first_name: info.given_name ?? null, last_name: info.family_name ?? null, verified: true });
  } else {
    await getDb().run('UPDATE users SET google_sub = COALESCE(google_sub, ?), email_verified = 1, last_login_at = ? WHERE id = ?', [info.sub, now(), user.id]);
    user = (await findUserById(user.id))!;
  }
  res.json({ token: signAppToken(toAuthUser(user)), user: userOut(user) });
});

authRouter.get('/me', requireUser({ verified: false }), async (req, res) => {
  const user = (await findUserById(req.user!.id))!;
  res.json({ user: userOut(user) });
});
