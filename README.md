<p align="center">
  <img src="apps/web/assets/logo/logo-stacked-tagline.svg" alt="Dermora – Din hud, förstådd." width="220">
</p>

# Dermora

**Personlig hudvägledning med AI.** En app där användaren beskriver sin hud, svarar på frågor med villkorade följdfrågor, laddar upp bilder, får strukturerad AI-vägledning, diskuterar den i en chat och bekräftar en behandlingsplan som sparas.

> Release 1 / MVP. Studentprojekt – **Grupp 6**: Youssef, Even, Anas, Adam, Ali, Assad.
> Dermora ger vägledning, inte medicinsk diagnos.

## Live

| | |
|---|---|
| Landningssida (kund) | https://lightslategray-wallaby-444786.hostingersite.com/ |
| Appen i webbläsaren | https://lightslategray-wallaby-444786.hostingersite.com/app/ |
| Adminpanel | https://lightslategray-wallaby-444786.hostingersite.com/admin/login |
| Projektpresentation (lärare) | https://lightslategray-wallaby-444786.hostingersite.com/presentation.html |
| Figma (redigerbar design) | https://www.figma.com/design/3Mytv71asDlX8rEz1JbCGk/Dermora---App---Web--Grupp-6- |
| GitHub Pages (statisk kopia, mock-läge) | https://anasnassan92-cmyk.github.io/dermora/ |
| Android-APK | byggs med EAS, se [Bygga APK](#bygga-apk-android) |

## Delar av systemet

| | |
|---|---|
| Landningssida | `apps/web/index.html` (+ `presentation.html`) – HTML/CSS, brand kit v1.1 |
| Mobilapp | `apps/mobile` – React Native + Expo SDK 57 + TypeScript; körs även som webbapp |
| Backend + adminpanel | `apps/server` – Node.js 24 + Express 5 + TypeScript. Egen auth (e-postkoder, JWT), Gemini-chatbot, bildhantering, GDPR-radering, adminpanel på `/admin` |
| Databas | MySQL på Hostinger (`DB_*`), SQLite lokalt och i tester – samma migrationer |
| AI | Google Gemini (strukturerad JSON-analys + chat) med modell-fallback; mock-läge utan nyckel |
| Legacy | `legacy/` – den första FastAPI + Supabase-prototypen (körs inte längre) |

## Användarresan (MVP)

```
Welcome → Skapa konto / Logga in → Verifiera e-post → Grundprofil
→ Frågeformulär (villkorade följdfrågor) → Ladda upp bilder (kvalitetskontroll)
→ AI-analys (Gemini, strukturerad) → Chat om analysen
→ AI föreslår plan → Användaren bekräftar → Planen sparas → Hem
```

## Arkitektur

```
┌──────────────┐  HTTPS /api   ┌──────────────────────┐        ┌──────────────┐
│ App          │ ────────────▶ │ apps/server          │ ─────▶ │ MySQL        │
│ Expo / RN    │ ◀──────────── │ Express + TypeScript │        │ (Hostinger)  │
│ (webb, APK)  │               │ auth · bilder · AI   │        └──────────────┘
└──────────────┘               │ adminpanel /admin    │ ─────▶ ┌──────────────┐
┌──────────────┐  samma host   │ serverar public/     │        │ Gemini API   │
│ Landningssida│ ◀──────────── │ (landning + webapp)  │        └──────────────┘
└──────────────┘               └──────────────────────┘
```

Allt körs som **en** Hostinger "Node.js Web App": servern serverar landningssidan, webbappen (`/app`), API:et (`/api`) och adminpanelen (`/admin`). Bilder och SQLite-fallback ligger i `$HOME/dermora-data` utanför app-mappen så att de överlever omdeploy.

## Kom igång lokalt

Allt går att köra **utan** databas och utan AI-nyckel (SQLite + mock-AI).

```bash
# 1. Server (API + admin)  →  http://localhost:4000
cd apps/server && npm install && npm run dev        # eller: npx tsx src/index.ts
# tester: npm test

# 2. App i webbläsaren  →  http://localhost:8081
cd apps/mobile && npm install
echo EXPO_PUBLIC_API_URL=http://localhost:4000/api > .env
npx expo start --web

# 3. Landningssida  →  http://localhost:8085
cd apps/web && python -m http.server 8085
```

Utan `.env` körs appen helt på mock-data. Förhandsläge för en enskild skärm: `http://localhost:8081/?preview=AIChat` (lista i `scripts/screenshots.py`).

### Miljövariabler (server)

Se `apps/server/.env.example`. Viktigast: `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` (MySQL), `GEMINI_API_KEY`, `ADMIN_EMAILS` (vilka konton som får logga in i adminpanelen), `SMTP_*` (e-postkoder; utan dem visas koden på skärmen i demo-läge), `GOOGLE_VISION_API_KEY`, `GOOGLE_CLIENT_ID`.

## Deploy till Hostinger

```bash
legacy/api/.venv/Scripts/python scripts/package-server.py     # exporterar webbappen + bygger dist/dermora-deploy.zip
```

hPanel → Web App → Deployments → *Settings and redeploy* → *Upload new files* → välj ZIP → *Save and redeploy*. Miljövariabler sätts under *Environment variables* (sedan *Apply changes* + redeploy). Root directory: `dermora-deploy`, Node 24, build `npm run build`, entry `dist/index.js`.

## Bygga APK (Android)

```bash
cd apps/mobile
npx eas build -p android --profile preview      # APK via EAS (molnet), ~15 min
npx eas build -p android --profile production   # AAB för Google Play
```

Profilerna i `apps/mobile/eas.json` sätter `EXPO_PUBLIC_API_URL` till den live-körda servern. Inloggad Expo-konto krävs (`npx eas login`).

## Adminpanel

`/admin/login` – logga in med ett vanligt Dermora-konto vars e-post finns i `ADMIN_EMAILS`. Sidor: Översikt, Användare (profil, bilder, AI-resultat, chat, planer, GDPR-radering), Chattar, Vårdsignaler, Beta (CSV), Frågeformulär, System.

## Dokumentation

| Fil | Innehåll |
|---|---|
| [docs/01-vision.md](docs/01-vision.md) | Problem, mål, målgrupp, vad som ingår i Release 1 |
| [docs/02-architecture.md](docs/02-architecture.md) | Systemarkitektur, dataflöden, mappstruktur (skriven för prototypen – se noten överst) |
| [docs/03-database.md](docs/03-database.md) | Datamodell och GDPR (prototypen; aktuellt schema i `apps/server/src/db/schema.ts`) |
| [docs/04-api-contract.md](docs/04-api-contract.md) | Endpoints (prototypen; aktuella routes i `apps/server/src/routes`) |
| [docs/05-ai-and-face-detection.md](docs/05-ai-and-face-detection.md) | AI-provider, ansiktskontroll, säkerhetsregler |
| [docs/06-team-and-workflow.md](docs/06-team-and-workflow.md) | Sex ansvarsområden, Git-regler, Scrum |
| [docs/07-sprint-plan.md](docs/07-sprint-plan.md) | Sprint 0–3 med mål per person |
| [docs/08-figma-import.md](docs/08-figma-import.md) | Designen i Figma |
| [docs/09-setup-and-requirements.md](docs/09-setup-and-requirements.md) | Konton, nycklar, kostnader, checklista |
| [docs/10-presentation-notes.md](docs/10-presentation-notes.md) | Talmanus och demo-flöde för redovisningen |

## Skärmdumpar

`legacy/api/.venv/Scripts/python scripts/screenshots.py` tar 17 skärmdumpar från den körande webbversionen (`?preview=<Screen>`) till `apps/web/assets/screens/`. Landningssidans sektion **Appen** visar dem.

## Repo-struktur

```
dermora/
├── apps/
│   ├── web/            # landningssida + presentation (HTML/CSS/JS), exporterad webbapp i app/
│   ├── mobile/         # Expo-app: src/{components,features,navigation,services,hooks,types,constants,theme}
│   └── server/         # Node/Express: src/{routes,auth,db,services,admin,data}, test/
├── legacy/             # FastAPI + Supabase-prototypen (historik)
├── packages/brand/     # färg-tokens, Montserrat-css från brand kit v1.1
├── scripts/            # package-server.py (Hostinger-ZIP), screenshots.py, gen-icons.py
├── docs/
└── .github/            # CI (server-tester, typecheck, webb), Pages-deploy
```

## Git-regler

Ingen utvecklar direkt på `main`. Branch per feature (`feat/auth-login`), pull request, minst en granskare, merge. Se [docs/06-team-and-workflow.md](docs/06-team-and-workflow.md).
