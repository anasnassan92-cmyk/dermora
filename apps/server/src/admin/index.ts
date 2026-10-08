/**
 * /admin – server-rendered admin panel. Owner: Assad (data) + Even (UI).
 * Access: users whose e-mail is in ADMIN_EMAILS (or is_admin = 1) log in with their normal
 * Dermora e-mail + password. Session = signed httpOnly cookie (SameSite=Strict).
 */
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';

import { checkPassword, findUserByEmail, findUserById, signFileToken, toAuthUser, verifyGoogleAccessToken } from '../auth/index.js';
import { config, features } from '../config.js';
import { knowledgeSize } from '../services/knowledge.js';
import { getDb, parseJson } from '../db/index.js';
import { deleteUserEverything } from '../routes/app.js';
import { loadQuestionnaire } from '../services/questionnaire.js';

export const adminRouter = Router();
const COOKIE = 'dermora_admin';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const date = (v: unknown) => (v ? new Date(String(v)).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const yes = (v: unknown) => (Number(v) ? '<span class="pill ok">Ja</span>' : '<span class="pill">Nej</span>');

/** Sections of the panel – label + one-line explanation (shown as tooltip and on Översikt). */
const NAV: [string, string, string][] = [
  ['/admin', 'Översikt', 'Siffror, systemstatus och senaste användare'],
  ['/admin/users', 'Användare', 'Alla konton: svar, bilder, analyser, plan, chatt – och radering'],
  ['/admin/chats', 'Chattar', 'Alla meddelanden mellan användare och AI:n, med tumme upp/ner'],
  ['/admin/flags', 'Vårdsignaler', 'Analyser där AI:n rekommenderat att kontakta vården'],
  ['/admin/beta', 'Beta-anmälningar', 'E-postadresser från formuläret på dermora.site'],
  ['/admin/questionnaire', 'Frågeformulär', 'Frågorna som appen ställer (läsläge)'],
  ['/admin/system', 'System', 'AI-modeller, kunskapsbas, e-post och Google-status'],
];

function layout(title: string, body: string, active = ''): string {
  const nav = NAV.map(([href, label, hint]) => `<a href="${href}" class="${active === href ? 'on' : ''}" title="${esc(hint)}">${label}</a>`).join('');
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Dermora Admin</title><meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<style>
:root{--teal:#0C9387;--deep:#04776B;--mint:#DFF2F0;--cream:#FAF7F0;--ink:#121C33;--muted:#6B7280;--line:#E6E1D6;--danger:#C0392B;--warn:#9A4716}
*{box-sizing:border-box}body{margin:0;font-family:Montserrat,system-ui,sans-serif;background:var(--cream);color:var(--ink);font-size:14px}
a{color:var(--deep)}header{background:#fff;border-bottom:1px solid var(--line);padding:12px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
header img{height:28px}header nav{display:flex;gap:4px;flex-wrap:wrap;flex:1}header nav a{padding:8px 12px;border-radius:999px;text-decoration:none;color:var(--ink);font-weight:500}
header nav a.on,header nav a:hover{background:var(--mint);color:var(--deep)}main{max-width:1200px;margin:0 auto;padding:24px 20px}
h1{font-size:24px;margin:0 0 16px}h2{font-size:17px;margin:24px 0 10px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px}.stat b{display:block;font-size:28px;color:var(--deep)}.stat span{color:var(--muted)}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#F4F1EA;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}tr:last-child td{border-bottom:0}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;background:#EEE;font-size:12px}.pill.ok{background:var(--mint);color:var(--deep)}.pill.bad{background:#F7DEDA;color:var(--danger)}.pill.warn{background:#F8E4D5;color:var(--warn)}
.btn{display:inline-block;background:var(--teal);color:#fff;border:0;border-radius:999px;padding:10px 18px;font:600 14px Montserrat,sans-serif;cursor:pointer;text-decoration:none}.btn.ghost{background:#fff;color:var(--deep);border:1.5px solid var(--teal)}.btn.danger{background:var(--danger)}
input[type=email],input[type=password],input[type=search]{width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;font:inherit}
.muted{color:var(--muted)}.chat{display:flex;flex-direction:column;gap:8px}.msg{max-width:80%;padding:10px 14px;border-radius:14px;white-space:pre-wrap}.msg.user{align-self:flex-end;background:var(--teal);color:#fff}.msg.assistant{background:#fff;border:1px solid var(--line)}
.thumbs{display:flex;gap:10px;flex-wrap:wrap}.thumbs figure{margin:0;text-align:center}.thumbs img{width:140px;height:160px;object-fit:cover;border-radius:12px;background:#eee}
pre{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px;overflow:auto;max-height:420px;font-size:12px}.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
@media(max-width:700px){td,th{padding:8px}.hide-sm{display:none}}
</style></head><body>
<header><a href="/admin"><img src="/assets/logo/logo-horizontal.svg" alt="Dermora"></a><nav>${nav}</nav>
<form method="post" action="/admin/logout"><button class="btn ghost">Logga ut</button></form></header>
<main>${body}</main></body></html>`;
}

function loginPage(error = '') {
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dermora Admin</title>
<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF7F0;font-family:Montserrat,sans-serif;color:#121C33}
form{background:#fff;border:1px solid #E6E1D6;border-radius:20px;padding:32px;width:min(380px,92vw);display:grid;gap:12px}
img{height:36px;margin:0 auto 8px}input{padding:12px 14px;border:1.5px solid #E6E1D6;border-radius:12px;font:inherit}button{background:#0C9387;color:#fff;border:0;border-radius:999px;padding:12px;font:600 15px Montserrat}
.err{color:#C0392B;font-size:14px}.muted{color:#6B7280;font-size:12px}</style></head><body>
<form method="post" action="/admin/login"><img src="/assets/logo/logo-horizontal.svg" alt="Dermora"><h2 style="margin:0">Admin</h2>
${error ? `<div class="err">${esc(error)}</div>` : ''}
<input type="email" name="email" placeholder="E-post" required autocomplete="username"><input type="password" name="password" placeholder="Lösenord" required autocomplete="current-password">
<button>Logga in</button>
${config.googleClientId ? `<div class="muted" style="text-align:center">eller</div><button type="button" id="g" style="background:#fff;color:#121C33;border:1.5px solid #E6E1D6">Logga in med Google</button>` : ''}
<p class="muted">Endast för Dermoras administratörer (ADMIN_EMAILS). Använd samma konto som i appen.</p></form>
${config.googleClientId ? `<script src="https://accounts.google.com/gsi/client" async></script><script>
document.getElementById('g').onclick=function(){var c=google.accounts.oauth2.initTokenClient({client_id:${JSON.stringify(config.googleClientId)},scope:'openid email profile',callback:function(r){if(!r.access_token)return;fetch('/admin/login/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:r.access_token})}).then(function(x){return x.json()}).then(function(d){if(d.ok)location.href='/admin';else{var e=document.querySelector('.err')||document.createElement('div');e.className='err';e.textContent=d.detail||'Kunde inte logga in.';document.querySelector('form').insertBefore(e,document.querySelector('form').children[2]);}});}});c.requestAccessToken({prompt:'select_account'});};
</script>` : ''}</body></html>`;
}

function setAdminCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId, typ: 'admin' }, config.jwtSecret, { expiresIn: '8h' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: config.isProd, maxAge: 8 * 3600_000, path: '/admin' });
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    const p = jwt.verify(String(token ?? ''), config.jwtSecret) as { sub: string; typ: string };
    if (p.typ !== 'admin') throw new Error('typ');
    const u = await findUserById(p.sub);
    if (!u || !toAuthUser(u).isAdmin) throw new Error('not admin');
    req.user = toAuthUser(u);
    next();
  } catch {
    res.redirect('/admin/login');
  }
}

adminRouter.get('/login', (_req, res) => res.type('html').send(loginPage()));

adminRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const user = await findUserByEmail(email);
  const ok = user && (await checkPassword(String(req.body?.password ?? ''), user.password_hash)) && toAuthUser(user).isAdmin;
  if (!ok) return res.status(401).type('html').send(loginPage('Fel e-post/lösenord, eller kontot är inte administratör.'));
  setAdminCookie(res, user!.id);
  res.redirect('/admin');
});

/** Google one-click login for administrators (same Google account as in the app). */
adminRouter.post('/login/google', express.json(), async (req, res) => {
  try {
    const info = await verifyGoogleAccessToken(String(req.body?.access_token ?? ''));
    const user = await findUserByEmail(info.email);
    if (!user || !toAuthUser(user).isAdmin) return res.status(403).json({ ok: false, detail: 'Kontot är inte administratör. Skapa först ett konto i appen med en adress i ADMIN_EMAILS.' });
    setAdminCookie(res, user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(401).json({ ok: false, detail: (e as Error).message });
  }
});

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/admin' });
  res.redirect('/admin/login');
});

adminRouter.use(requireAdmin);

const count = async (sql: string, params: unknown[] = []) => Number((await getDb().get<{ n: number }>(sql, params))?.n ?? 0);

adminRouter.get('/', async (_req, res) => {
  const stats = [
    ['Användare', await count('SELECT COUNT(*) AS n FROM users')],
    ['Verifierade', await count('SELECT COUNT(*) AS n FROM users WHERE email_verified = 1')],
    ['Bedömningar', await count('SELECT COUNT(*) AS n FROM assessments')],
    ['AI-analyser', await count('SELECT COUNT(*) AS n FROM ai_assessments')],
    ['Chattmeddelanden', await count('SELECT COUNT(*) AS n FROM chat_messages')],
    ['Bekräftade planer', await count("SELECT COUNT(*) AS n FROM treatment_plans WHERE status = 'confirmed'")],
    ['Bilder', await count('SELECT COUNT(*) AS n FROM skin_images')],
    ['Vårdsignaler', await count('SELECT COUNT(*) AS n FROM ai_assessments WHERE seek_care = 1')],
    ['Beta-anmälningar', await count('SELECT COUNT(*) AS n FROM beta_signups')],
  ];
  const recent = await getDb().all<{ id: string; email: string; first_name: string | null; created_at: string; email_verified: number }>('SELECT id, email, first_name, created_at, email_verified FROM users ORDER BY created_at DESC LIMIT 8');
  const body = `<h1>Översikt</h1>
  <div class="card" style="margin-bottom:20px"><b>Så här använder du panelen</b><div class="grid" style="margin-top:10px">${NAV.slice(1).map(([href, label, hint]) => `<a class="card" href="${href}" style="text-decoration:none"><b>${label}</b><div class="muted" style="font-size:12px;margin-top:4px">${esc(hint)}</div></a>`).join('')}</div></div>
  <div class="grid">${stats.map(([l, n]) => `<div class="card stat"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
  <h2>Systemstatus</h2><div class="row">
    <span class="pill ${features.ai === 'gemini' ? 'ok' : 'warn'}">AI: ${features.ai === 'gemini' ? 'Gemini aktiv' : 'Demo-läge (ingen GEMINI_API_KEY)'}</span>
    <span class="pill ${features.vision ? 'ok' : 'warn'}">Bildkontroll: ${features.vision ? 'Google Vision' : 'Lokal (ingen Vision-nyckel)'}</span>
    <span class="pill ${features.email ? 'ok' : 'warn'}">E-post: ${features.email ? 'SMTP aktiv' : 'Demo – koden visas på skärmen'}</span>
    <span class="pill ${features.google ? 'ok' : 'warn'}">Google-inloggning: ${features.google ? 'aktiv' : 'inte konfigurerad'}</span>
    <span class="pill ok">Databas: ${getDb().driver === 'mysql' ? 'MySQL' : 'SQLite (lokal)'}</span></div>
  <h2>Senaste användare</h2><table><tr><th>Namn</th><th>E-post</th><th>Verifierad</th><th class="hide-sm">Skapad</th></tr>
  ${recent.map((u) => `<tr><td><a href="/admin/users/${esc(u.id)}">${esc(u.first_name || '–')}</a></td><td>${esc(u.email)}</td><td>${yes(u.email_verified)}</td><td class="hide-sm">${date(u.created_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Inga användare ännu.</td></tr>'}</table>`;
  res.type('html').send(layout('Översikt', body, '/admin'));
});

adminRouter.get('/users', async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const rows = await getDb().all<Record<string, unknown>>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.email_verified, u.is_admin, u.created_at, u.last_login_at,
       (SELECT COUNT(*) FROM assessments a WHERE a.user_id = u.id) AS assessments,
       (SELECT COUNT(*) FROM treatment_plans p WHERE p.user_id = u.id AND p.status = 'confirmed') AS plans
     FROM users u ${q ? 'WHERE LOWER(u.email) LIKE ? OR LOWER(u.first_name) LIKE ? OR LOWER(u.last_name) LIKE ?' : ''} ORDER BY u.created_at DESC LIMIT 200`,
    q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [],
  );
  const body = `<h1>Användare</h1><form class="row" style="margin-bottom:12px"><input type="search" name="q" value="${esc(q)}" placeholder="Sök namn eller e-post" style="max-width:360px"><button class="btn">Sök</button></form>
  <table><tr><th>Namn</th><th>E-post</th><th>Verifierad</th><th>Bedömningar</th><th>Aktiv plan</th><th class="hide-sm">Senast inloggad</th></tr>
  ${rows.map((u) => `<tr><td><a href="/admin/users/${esc(u.id)}">${esc([u.first_name, u.last_name].filter(Boolean).join(' ') || '–')}</a>${Number(u.is_admin) ? ' <span class="pill ok">admin</span>' : ''}</td><td>${esc(u.email)}</td><td>${yes(u.email_verified)}</td><td>${esc(u.assessments)}</td><td>${yes(u.plans)}</td><td class="hide-sm">${date(u.last_login_at)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Inga träffar.</td></tr>'}</table>`;
  res.type('html').send(layout('Användare', body, '/admin/users'));
});

adminRouter.get('/users/:id', async (req, res) => {
  const db = getDb();
  const id = String(req.params.id);
  const u = await findUserById(id);
  if (!u) return res.status(404).type('html').send(layout('Saknas', '<h1>Användaren finns inte</h1>'));
  const p = await db.get<Record<string, unknown>>('SELECT * FROM profiles WHERE user_id = ?', [id]);
  const assessments = await db.all<Record<string, unknown>>('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC', [id]);
  const images = await db.all<Record<string, unknown>>('SELECT * FROM skin_images WHERE user_id = ? ORDER BY created_at DESC', [id]);
  const ai = await db.all<Record<string, unknown>>('SELECT * FROM ai_assessments WHERE user_id = ? ORDER BY created_at DESC', [id]);
  const plans = await db.all<Record<string, unknown>>('SELECT * FROM treatment_plans WHERE user_id = ? ORDER BY created_at DESC', [id]);
  const chats = await db.all<Record<string, unknown>>('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at, id', [id]);
  const memory = await db.get<{ summary: string | null }>('SELECT summary FROM user_memory WHERE user_id = ?', [id]);
  const routineCount = Number((await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM routine_logs WHERE user_id = ? AND done = 1', [id]))?.n ?? 0);
  const lastLog = await db.get<{ day: string; slot: string }>('SELECT day, slot FROM routine_logs WHERE user_id = ? ORDER BY day DESC LIMIT 1', [id]);
  const area: Record<string, string> = { face: 'Framifrån', left: 'Vänster', right: 'Höger', closeup: 'Närbild', other: 'Annat' };
  const body = `<h1>${esc([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email)}</h1>
  <div class="grid"><div class="card"><b>E-post</b><br>${esc(u.email)}</div><div class="card"><b>Verifierad</b><br>${yes(u.email_verified)}</div>
  <div class="card"><b>Skapad</b><br>${date(u.created_at)}</div><div class="card"><b>Inloggning</b><br>${u.google_sub ? 'Google' : 'E-post + lösenord'}</div></div>
  <h2>Profil</h2><div class="row">${p ? ['age_range', 'gender', 'country', 'skin_tone', 'skin_type'].map((k) => `<span class="pill">${k}: ${esc(p[k] ?? '–')}</span>`).join('') + ` <span class="pill ${Number(p.consent_images) ? 'ok' : 'warn'}">Bildsamtycke: ${Number(p.consent_images) ? 'ja' : 'nej'}</span>` : '–'}</div>
  <h2>Bilder (${images.length})</h2><div class="thumbs">${images.map((i) => `<figure><img src="/api/images/${esc(i.id)}/file?t=${signFileToken(id, String(i.id))}" alt=""><figcaption class="muted">${area[String(i.area)] ?? esc(i.area)}</figcaption></figure>`).join('') || '<span class="muted">Inga bilder.</span>'}</div>
  <h2>AI-analyser (${ai.length})</h2>${ai.map((r) => { const g = parseJson<Record<string, unknown>>(r.result, {}); return `<div class="card" style="margin-bottom:10px"><div class="row"><b>${esc(g.primary_concern)}</b><span class="pill">${esc(r.provider)} · ${esc(r.model)}</span>${Number(r.seek_care) ? '<span class="pill bad">Vårdsignal</span>' : ''}<span class="muted">${date(r.created_at)}</span></div><p>${esc(g.guidance)}</p>${(g.red_flags as string[] | undefined)?.length ? `<p><b>Röda flaggor:</b> ${(g.red_flags as string[]).map(esc).join('; ')}</p>` : ''}<details><summary>Hela resultatet (JSON)</summary><pre>${esc(JSON.stringify(g, null, 2))}</pre></details></div>`; }).join('') || '<span class="muted">Inga analyser.</span>'}
  <h2>Minnesanteckningar (chatbot)</h2><p class="muted" style="white-space:pre-wrap">${esc(memory?.summary ?? '') || 'Inga ännu – skapas efter några chattmeddelanden.'}</p>
  <h2>Rutinlogg (Framsteg)</h2><p class="muted">${routineCount} loggade tillfällen${lastLog ? `, senast ${esc(lastLog.day)} (${esc(lastLog.slot)})` : ''}.</p>
  <h2>Chatt (${chats.length})</h2><div class="chat">${chats.map((m) => `<div class="msg ${esc(m.role)}">${esc(m.content)}${m.rating === 1 ? ' 👍' : m.rating === -1 ? ' 👎' : ''}</div>`).join('') || '<span class="muted">Ingen chatt.</span>'}</div>
  <h2>Planer (${plans.length})</h2><table><tr><th>Titel</th><th>Status</th><th>Skapad</th></tr>${plans.map((pl) => `<tr><td>${esc(pl.title)}</td><td><span class="pill ${pl.status === 'confirmed' ? 'ok' : ''}">${esc(pl.status)}</span></td><td>${date(pl.created_at)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Inga planer.</td></tr>'}</table>
  <h2>Svar på frågeformuläret</h2>${assessments.map((a) => `<details class="card" style="margin-bottom:8px"><summary>${date(a.created_at)} · <span class="pill">${esc(a.status)}</span></summary><pre>${esc(JSON.stringify(parseJson(a.answers, {}), null, 2))}</pre></details>`).join('') || '<span class="muted">Inga bedömningar.</span>'}
  <h2>GDPR</h2><form method="post" action="/admin/users/${esc(id)}/delete" onsubmit="return confirm('Radera användaren och ALL data permanent?')"><button class="btn danger">Radera användare och all data</button></form>`;
  res.type('html').send(layout('Användare', body, '/admin/users'));
});

adminRouter.post('/users/:id/delete', async (req, res) => {
  const id = String(req.params.id);
  if (id === req.user!.id) return res.status(400).type('html').send(layout('Fel', '<h1>Du kan inte radera ditt eget adminkonto här.</h1>'));
  await deleteUserEverything(id);
  res.redirect('/admin/users');
});

adminRouter.get('/chats', async (_req, res) => {
  const rows = await getDb().all<Record<string, unknown>>(
    'SELECT m.role, m.content, m.created_at, m.user_id, m.rating, m.feedback, m.meta, u.email FROM chat_messages m JOIN users u ON u.id = m.user_id ORDER BY m.created_at DESC LIMIT 150',
  );
  const stats = await getDb().get<{ up: number; down: number; total: number }>(
    "SELECT SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS up, SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) AS down, COUNT(*) AS total FROM chat_messages WHERE role = 'assistant'",
  );
  const ratingCell = (m: Record<string, unknown>) =>
    m.role !== 'assistant' ? '' : m.rating === 1 ? '<span class="pill ok">👍</span>' : m.rating === -1 ? `<span class="pill warn">👎</span>${m.feedback ? ` <span class="muted">${esc(m.feedback)}</span>` : ''}` : '<span class="muted">–</span>';
  const body = `<h1>Senaste chattmeddelanden</h1>
  <p class="muted">AI-svar: ${Number(stats?.total ?? 0)} · 👍 ${Number(stats?.up ?? 0)} · 👎 ${Number(stats?.down ?? 0)}. Modell och använda kunskapsavsnitt visas under varje svar.</p>
  <table><tr><th>Tid</th><th>Användare</th><th>Roll</th><th>Meddelande</th><th>Betyg</th></tr>
  ${rows.map((m) => { const meta = parseJson<{ model?: string; sources?: string[] }>(m.meta as string | null, {}); return `<tr><td>${date(m.created_at)}</td><td><a href="/admin/users/${esc(m.user_id)}">${esc(m.email)}</a></td><td><span class="pill ${m.role === 'user' ? '' : 'ok'}">${m.role === 'user' ? 'Användare' : 'Dermora AI'}</span></td><td style="white-space:pre-wrap">${esc(String(m.content).slice(0, 400))}${meta.model || meta.sources?.length ? `<div class="muted" style="font-size:12px;margin-top:4px">${esc(meta.model ?? '')}${meta.sources?.length ? ` · källor: ${meta.sources.map(esc).join(', ')}` : ''}</div>` : ''}</td><td>${ratingCell(m)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Inga meddelanden.</td></tr>'}</table>`;
  res.type('html').send(layout('Chattar', body, '/admin/chats'));
});

adminRouter.get('/flags', async (_req, res) => {
  const rows = await getDb().all<Record<string, unknown>>(
    'SELECT a.result, a.created_at, a.user_id, u.email FROM ai_assessments a JOIN users u ON u.id = a.user_id WHERE a.seek_care = 1 ORDER BY a.created_at DESC LIMIT 100',
  );
  const body = `<h1>Vårdsignaler</h1><p class="muted">Analyser där AI:n eller reglerna rekommenderade vårdkontakt.</p><table><tr><th>Tid</th><th>Användare</th><th>Röda flaggor</th></tr>
  ${rows.map((r) => `<tr><td>${date(r.created_at)}</td><td><a href="/admin/users/${esc(r.user_id)}">${esc(r.email)}</a></td><td>${(parseJson<{ red_flags?: string[] }>(r.result, {}).red_flags ?? []).map(esc).join('<br>')}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Inga vårdsignaler.</td></tr>'}</table>`;
  res.type('html').send(layout('Vårdsignaler', body, '/admin/flags'));
});

adminRouter.get('/beta', async (req, res) => {
  const rows = await getDb().all<{ email: string; source: string; created_at: string }>('SELECT email, source, created_at FROM beta_signups ORDER BY created_at DESC');
  if (req.query.format === 'csv') {
    res.type('text/csv').attachment('dermora-beta.csv').send(['email,source,created_at', ...rows.map((r) => `${r.email},${r.source ?? ''},${r.created_at}`)].join('\n'));
    return;
  }
  const body = `<div class="row"><h1 style="flex:1">Beta-anmälningar (${rows.length})</h1><a class="btn ghost" href="/admin/beta?format=csv">Exportera CSV</a></div>
  <table><tr><th>E-post</th><th>Källa</th><th>Tid</th></tr>${rows.map((r) => `<tr><td>${esc(r.email)}</td><td>${esc(r.source)}</td><td>${date(r.created_at)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Inga anmälningar.</td></tr>'}</table>`;
  res.type('html').send(layout('Beta', body, '/admin/beta'));
});

adminRouter.get('/questionnaire', (_req, res) => {
  const q = loadQuestionnaire();
  const body = `<h1>Frågeformulär v${esc(q.version)}</h1><p class="muted">Redigeras i <code>apps/server/src/data/questionnaire_v1.json</code> (ägare: Adam).</p>
  <table><tr><th>#</th><th>Fråga</th><th>Typ</th><th>Visas om</th><th>Alternativ</th></tr>
  ${q.questions.map((x, i) => `<tr><td>${i + 1}</td><td><b>${esc(x.title)}</b>${x.required === false ? ' <span class="pill">valfri</span>' : ''}</td><td>${esc(x.type)}</td><td>${x.show_if ? esc(`${x.show_if.question_id} ${x.show_if.includes ? `innehåller ${x.show_if.includes}` : ''}`) : '–'}</td><td>${(x.options ?? []).map((o) => esc(o.label)).join(', ')}</td></tr>`).join('')}</table>`;
  res.type('html').send(layout('Frågeformulär', body, '/admin/questionnaire'));
});

adminRouter.get('/system', (_req, res) => {
  const rows = [
    ['Databas', getDb().driver === 'mysql' ? `MySQL (${esc(config.db.name)})` : 'SQLite (lokal utveckling)'],
    ['AI-provider', features.ai === 'gemini' ? `Gemini · analys: ${esc(config.gemini.analysisModel)} (tänkbudget ${config.gemini.analysisThinking}) · chat: ${esc(config.gemini.chatModel)} · reserv: ${esc(config.gemini.fallbackModels.join(', '))}` : 'Demo (sätt GEMINI_API_KEY)'],
    ['Kunskapsbas', `${knowledgeSize()} avsnitt (apps/server/src/data/knowledge/*.md) – hämtas med BM25 till varje analys och chattsvar`],
    ['Bildkontroll', features.vision ? 'Google Cloud Vision' : 'Lokal skärpa/ljus (sätt GOOGLE_VISION_API_KEY)'],
    ['E-post (SMTP)', features.email ? `${esc(config.smtp.host)} som ${esc(config.smtp.from)}` : 'Demo – koden visas på skärmen (sätt SMTP_USER + SMTP_PASS)'],
    ['Google-inloggning', features.google ? `Aktiv (webb${config.googleAndroidClientId ? ' + Android' : ''})` : 'Inte konfigurerad (sätt GOOGLE_CLIENT_ID, för APK även GOOGLE_ANDROID_CLIENT_ID)'],
    ['Administratörer', config.adminEmails.map(esc).join(', ') || '–'],
  ];
  const body = `<h1>System</h1><p class="muted">Nycklar visas aldrig här – bara om de är satta. Ändras i hPanel → Websites → Environment variables → Apply changes.</p>
  <table>${rows.map(([k, v]) => `<tr><th style="width:220px">${k}</th><td>${v}</td></tr>`).join('')}</table>`;
  res.type('html').send(layout('System', body, '/admin/system'));
});
