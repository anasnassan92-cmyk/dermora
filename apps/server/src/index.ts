/**
 * Dermora server – one Hostinger Node.js Web App serves everything:
 *   /            landing page + presentation (public/)
 *   /app/        Expo web app (public/app, SPA fallback)
 *   /api/...     JSON API for the app
 *   /admin       admin panel
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import { adminRouter } from './admin/index.js';
import { HttpError } from './auth/index.js';
import { config, features } from './config.js';
import { openDb } from './db/index.js';
import { appRouter } from './routes/app.js';
import { authRouter } from './routes/auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = [path.join(here, '..', 'public'), path.join(here, '..', '..', 'web')].find((p) => fs.existsSync(path.join(p, 'index.html')));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // CORS only for local development (Expo dev server on another port)
  if (!config.isProd) {
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    });
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ai: features.ai, vision: features.vision, email: features.email, google: features.google }));
  app.use('/api/auth', authRouter);
  app.use('/api', appRouter);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Okänd API-väg.')));
  app.use('/admin', adminRouter);

  if (PUBLIC_DIR) {
    app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h', index: 'index.html' }));
    // Expo web app is a single-page app: unknown /app/* paths load its index.html
    app.get(/^\/app(\/.*)?$/, (_req, res, next) => {
      const index = path.join(PUBLIC_DIR, 'app', 'index.html');
      return fs.existsSync(index) ? res.sendFile(index) : next();
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) return res.status(422).json({ detail: err.issues.map((i) => i.message).join('\n') });
    if (err instanceof HttpError) return res.status(err.status).json({ detail: err.message, ...(err.detail ? { errors: err.detail } : {}) });
    const e = err as { code?: string; message?: string; type?: string };
    if (e?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ detail: 'Bilden är större än 8 MB.' });
    if (e?.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Ogiltig JSON.' });
    console.error('[error]', err);
    res.status(500).json({ detail: 'Något gick fel på servern.' });
  });
  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await openDb();
  createApp().listen(config.port, () => {
    console.log(`Dermora server on :${config.port} · db=${config.db.host ? 'mysql' : 'sqlite'} · ai=${features.ai} · vision=${features.vision} · email=${features.email} · public=${PUBLIC_DIR ?? 'none'}`);
  });
}
