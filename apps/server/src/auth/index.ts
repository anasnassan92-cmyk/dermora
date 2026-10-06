/**
 * Authentication – owner: Anas.
 * E-mail + password (bcrypt), 6-digit e-mail code for verification, Google ID-token sign-in,
 * stateless JWT for the app (Bearer) and a separate cookie session for /admin.
 */
import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { getDb, now } from '../db/index.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  first_name: string | null;
  last_name: string | null;
  email_verified: number;
  is_admin: number;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string | null) => (hash ? bcrypt.compare(pw, hash) : Promise.resolve(false));
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Lösenordet måste vara minst 8 tecken.';
  if (!/\d/.test(pw) || !/[A-Za-zÅÄÖåäö]/.test(pw)) return 'Lösenordet måste innehålla minst en siffra och en bokstav.';
  return null;
}

export function isAdminEmail(email: string) {
  return config.adminEmails.includes(email.toLowerCase());
}

export function toAuthUser(u: UserRow): AuthUser {
  return { id: u.id, email: u.email, emailVerified: !!Number(u.email_verified), isAdmin: !!Number(u.is_admin) || isAdminEmail(u.email) };
}

// ---------- tokens ----------
const APP_TOKEN_DAYS = 14;

export function signAppToken(u: AuthUser): string {
  return jwt.sign({ sub: u.id, typ: 'app' }, config.jwtSecret, { expiresIn: `${APP_TOKEN_DAYS}d` });
}

/** Short-lived token embedded in image URLs, because <Image> cannot send headers. */
export function signFileToken(userId: string, imageId: string): string {
  return jwt.sign({ sub: userId, img: imageId, typ: 'file' }, config.jwtSecret, { expiresIn: '30m' });
}

export function verifyFileToken(token: string, imageId: string): string | null {
  try {
    const p = jwt.verify(token, config.jwtSecret) as { sub: string; img: string; typ: string };
    return p.typ === 'file' && p.img === imageId ? p.sub : null;
  } catch {
    return null;
  }
}

export async function findUserById(id: string) {
  return getDb().get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function findUserByEmail(email: string) {
  return getDb().get<UserRow>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

/** Express middleware: requires a valid app token. */
export function requireUser(opts: { verified?: boolean } = { verified: true }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization ?? '';
      if (!header.toLowerCase().startsWith('bearer ')) throw new HttpError(401, 'Du behöver logga in.');
      let payload: { sub: string; typ: string };
      try {
        payload = jwt.verify(header.slice(7).trim(), config.jwtSecret) as { sub: string; typ: string };
      } catch {
        throw new HttpError(401, 'Din inloggning har gått ut. Logga in igen.');
      }
      if (payload.typ !== 'app') throw new HttpError(401, 'Ogiltig token.');
      const user = await findUserById(payload.sub);
      if (!user) throw new HttpError(401, 'Kontot finns inte längre.');
      req.user = toAuthUser(user);
      if (opts.verified !== false && !req.user.emailVerified) throw new HttpError(403, 'Verifiera din e-post först.');
      next();
    } catch (e) {
      next(e);
    }
  };
}

// ---------- e-mail codes ----------
const CODE_TTL_MIN = 15;
const MAX_ATTEMPTS = 5;

export async function createEmailCode(userId: string, purpose: 'verify' | 'login' = 'verify'): Promise<string> {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const db = getDb();
  await db.run('DELETE FROM email_codes WHERE user_id = ? AND purpose = ?', [userId, purpose]);
  await db.run('INSERT INTO email_codes (id, user_id, code_hash, purpose, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)', [
    crypto.randomUUID(),
    userId,
    sha256(code),
    purpose,
    new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    now(),
  ]);
  return code;
}

export async function checkEmailCode(userId: string, code: string, purpose: 'verify' | 'login' = 'verify'): Promise<void> {
  const db = getDb();
  const row = await db.get<{ id: string; code_hash: string; attempts: number; expires_at: string }>(
    'SELECT id, code_hash, attempts, expires_at FROM email_codes WHERE user_id = ? AND purpose = ?',
    [userId, purpose],
  );
  if (!row) throw new HttpError(400, 'Ingen kod finns. Skicka en ny kod.');
  if (new Date(row.expires_at).getTime() < Date.now()) throw new HttpError(400, 'Koden har gått ut. Skicka en ny kod.');
  if (Number(row.attempts) >= MAX_ATTEMPTS) throw new HttpError(429, 'För många försök. Skicka en ny kod.');
  if (sha256(code.trim()) !== row.code_hash) {
    await db.run('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?', [row.id]);
    throw new HttpError(400, 'Koden är fel. Kontrollera siffrorna och försök igen.');
  }
  await db.run('DELETE FROM email_codes WHERE id = ?', [row.id]);
}

// ---------- Google ----------
/** Verifies a Google Identity Services ID token with Google's tokeninfo endpoint. */
export async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string; given_name?: string; family_name?: string }> {
  if (!config.googleClientId) throw new HttpError(503, 'Google-inloggning är inte aktiverad ännu.');
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new HttpError(401, 'Google-inloggningen kunde inte verifieras.');
  const info = (await res.json()) as { aud: string; sub: string; email: string; email_verified: string | boolean; given_name?: string; family_name?: string; exp: string };
  if (info.aud !== config.googleClientId) throw new HttpError(401, 'Google-token är inte avsedd för Dermora.');
  if (!(info.email_verified === true || info.email_verified === 'true')) throw new HttpError(401, 'Google-kontots e-post är inte verifierad.');
  if (Number(info.exp) * 1000 < Date.now()) throw new HttpError(401, 'Google-token har gått ut.');
  return info;
}

// ---------- simple in-memory rate limit for auth endpoints ----------
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(max: number, windowMs: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${req.path}:${req.ip}`;
    const t = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < t) {
      hits.set(key, { n: 1, reset: t + windowMs });
      return next();
    }
    h.n += 1;
    if (h.n > max) return next(new HttpError(429, 'För många försök. Vänta en stund och försök igen.'));
    next();
  };
}
