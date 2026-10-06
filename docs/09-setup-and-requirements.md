# 09 · Vad som behövs för att köra Dermora på riktigt

## Konton och nycklar

| Tjänst | Vem skapar | Gratis? | Vad vi behöver | Var det läggs |
|---|---|---|---|---|
| GitHub (organisation eller repo) | Youssef | Ja | Repo, Pages aktiverat, branch protection | – |
| Supabase (region: EU, t.ex. Frankfurt/Stockholm) | Assad | Ja (free tier: 500 MB DB, 1 GB storage) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, anon key | `apps/api/.env`, `apps/mobile/.env` |
| Anthropic API | Youssef | Startkredit, därefter betalkort | `ANTHROPIC_API_KEY` | `apps/api/.env` (aldrig i appen) |
| Expo (expo.dev) | Even | Ja | Konto för EAS Build om ni vill ha installerbar app | – |
| Backend-hosting (Render / Railway / Fly.io) | Assad | Free/hobby-nivå | Deploy av `apps/api`, env-variabler | – |
| Domän (valfritt) | – | ~100–150 kr/år | `dermora.se` eller liknande till Pages | – |

**Regel:** nycklar delas via Discord-DM eller lösenordshanterare, aldrig i git, aldrig i skärmdumpar.

## Programvara på varje dator

- Git, Node 20+ (vi testade på 24), Python 3.11+ (vi testade på 3.14), VS Code.
- Expo Go på telefonen (iOS/Android). Telefon och dator på samma wifi.
- Valfritt: Android Studio-emulator eller iOS-simulator.

## Miljövariabler

`apps/api/.env`
```
APP_ENV=development
DEV_AUTH=true                 # false i produktion
CORS_ORIGINS=http://localhost:8085,http://localhost:8081
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_BUCKET=skin-images
AI_PROVIDER=anthropic         # mock | anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-opus-5-5
AI_EFFORT=medium
```

`apps/mobile/.env`
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000     # datorns IP, inte localhost, när telefonen ska nå backend
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Supabase-inställningar att göra i dashboarden

1. SQL Editor → kör `supabase/schema.sql`, sedan `supabase/seed.sql`.
2. Authentication → Providers → Email: på. **Confirm email: på.**
3. Authentication → URL Configuration → Redirect URLs: lägg till `dermora://verified` och `exp://*`.
4. Authentication → Email Templates: svensk text (valfritt).
5. Storage → bucket `skin-images` ska vara **privat** (skapas av schema.sql).

## Kostnad (uppskattning för kursen)

| Post | Kostnad |
|---|---|
| Supabase free tier | 0 kr |
| GitHub Pages, Actions | 0 kr |
| Anthropic: ~200 analyser + chat under utveckling | ca 50–150 kr beroende på modell |
| Backend-hosting hobby | 0–70 kr/mån |
| Expo EAS build (valfritt) | gratis nivå räcker för några builds |

## Checklista innan "riktig" demo

- [ ] `DEV_AUTH=false` i backendens produktionsmiljö.
- [ ] `/health` visar `database: supabase`, `ai_provider: anthropic`.
- [ ] Ett testkonto registrerat, mejl verifierat, profil med samtycke.
- [ ] En bild uppladdad: syns i Storage under rätt `user_id`, EXIF borta.
- [ ] En analys klar: rad i `ai_assessments`, `red_flags` rimligt.
- [ ] Plan bekräftad: `treatment_plans.status = confirmed`.
- [ ] Ett andra testkonto ser **inget** av det första (RLS-test).
- [ ] Radera konto → alla rader och filer borta.

## Kända begränsningar i den här versionen

- Beta-formuläret på landningssidan skickar inget än (ingen endpoint ännu; tabellen `beta_signups` finns).
- `expo-camera` i Expo Go fungerar, men ansiktsguiden är bara en visuell ram – kvalitetskontrollen sker på servern.
- Anthropic-providern är skriven enligt SDK-dokumentationen men inte körd mot API:et i det här repot (ingen nyckel i miljön). Första körningen görs i Sprint 1 av Youssef.
- Supabase-repositories är skrivna mot schemat men inte körda mot ett riktigt projekt här. Första körningen görs i Sprint 1 av Assad.
- Ikoner i appens flikfält är tecken (⌂ ✓ ●); byt till brand kit-ikoner via `react-native-svg` i Sprint 2.
