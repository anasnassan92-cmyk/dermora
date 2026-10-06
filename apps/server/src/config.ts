/**
 * Configuration. Hostinger injects panel env vars into the running process (not into the
 * build), so everything is read at runtime here. Durable data (uploads, the auto-generated
 * signing secret) lives OUTSIDE the app directory, because every deploy replaces that folder.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Blank-but-present values count as unset (some panels save empty strings). */
export function setting(name: string): string {
  return (process.env[name] ?? '').trim();
}

const isProd = setting('NODE_ENV') === 'production' || !!setting('DB_HOST');

function dataDir(): string {
  const configured = setting('DATA_DIR');
  if (configured) return path.resolve(configured);
  if (isProd) return path.join(setting('HOME') || os.homedir(), 'dermora-data');
  return path.resolve(process.cwd(), '.data');
}

export const DATA_DIR = dataDir();
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** Signing secret: generated once on the server and kept in the data folder – never typed by a human. */
function signingSecret(): string {
  if (setting('JWT_SECRET')) return setting('JWT_SECRET');
  const file = path.join(DATA_DIR, 'jwt-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch {
    /* first start */
  }
  const fresh = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, fresh, { mode: 0o600 });
  return fresh;
}

export const config = {
  port: Number(setting('PORT') || 4000),
  isProd,
  jwtSecret: signingSecret(),
  db: {
    host: setting('DB_HOST'),
    port: Number(setting('DB_PORT') || 3306),
    name: setting('DB_NAME'),
    user: setting('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    sqliteFile: setting('SQLITE_FILE') || path.join(DATA_DIR, 'dermora.db'),
  },
  adminEmails: setting('ADMIN_EMAILS')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  gemini: { apiKey: setting('GEMINI_API_KEY'), model: setting('GEMINI_MODEL') || 'gemini-flash-latest' },
  visionApiKey: setting('GOOGLE_VISION_API_KEY'),
  googleClientId: setting('GOOGLE_CLIENT_ID'),
  smtp: {
    host: setting('SMTP_HOST') || 'smtp.hostinger.com',
    port: Number(setting('SMTP_PORT') || 465),
    user: setting('SMTP_USER'),
    pass: process.env.SMTP_PASS ?? '',
    from: setting('MAIL_FROM') || setting('SMTP_USER'),
  },
  maxImageBytes: 8 * 1024 * 1024,
};

export const features = {
  get ai() {
    return config.gemini.apiKey ? 'gemini' : 'mock';
  },
  get vision() {
    return !!config.visionApiKey;
  },
  get email() {
    return !!(config.smtp.user && config.smtp.pass);
  },
  get google() {
    return !!config.googleClientId;
  },
};
