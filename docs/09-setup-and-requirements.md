# 09 · Vad som behövs för att köra Dermora på riktigt

## Konton och nycklar

| Tjänst | Vem skapar | Gratis? | Vad vi behöver | Var det läggs |
|---|---|---|---|---|
| GitHub (organisation eller repo) | Youssef | Ja | Repo, Pages aktiverat, branch protection | – |
| Supabase (region: EU, t.ex. Frankfurt/Stockholm) | Assad | Ja (free tier: 500 MB DB, 1 GB storage) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, anon key | `apps/api/.env`, `apps/mobile/.env` |
| Google AI Studio (Gemini) | Youssef | **Ja**, gratisnivå | `GEMINI_API_KEY` | `apps/api/.env` (aldrig i appen) |
| Google Cloud (Cloud Vision API) | Ali | Gratis kvot (1 000 bilder/mån), kräver att fakturering aktiveras | `GOOGLE_VISION_API_KEY` (API-nyckel begränsad till Vision) | `apps/api/.env` |
| Anthropic API (valfritt alternativ) | – | Nej | `ANTHROPIC_API_KEY` | `apps/api/.env` |
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
AI_PROVIDER=gemini            # mock | gemini | anthropic
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
FACE_DETECTOR=google          # opencv | google
GOOGLE_VISION_API_KEY=AIza...
```

`apps/mobile/.env`
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000     # datorns IP, inte localhost, när telefonen ska nå backend
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Supabase-inställningar att göra i dashboarden

0. Authentication → Providers → **Google**: på. Skapa OAuth-klient i Google Cloud (Credentials → OAuth client ID → Web), lägg in Supabase callback-URL (`https://<projekt>.supabase.co/auth/v1/callback`) och klistra in client id/secret i Supabase. Lägg till webbappens adress under Redirect URLs.

1. SQL Editor → kör `supabase/schema.sql`, sedan `supabase/seed.sql`.
2. Authentication → Providers → Email: på. **Confirm email: på.** Email Templates → *Confirm signup*: ersätt länken med `{{ .Token }}` så att mejlet innehåller den 6-siffriga koden som appen frågar efter.
3. Authentication → URL Configuration → Redirect URLs: lägg till `dermora://verified` och `exp://*`.
4. Authentication → Email Templates: svensk text (valfritt).
5. Storage → bucket `skin-images` ska vara **privat** (skapas av schema.sql).

## Kostnad (uppskattning för kursen)

| Post | Kostnad |
|---|---|
| Supabase free tier | 0 kr |
| GitHub Pages, Actions | 0 kr |
| Gemini gratisnivå: utveckling + demo | 0 kr |
| Google Cloud Vision: under 1 000 bilder/mån | 0 kr (därefter ca 15 kr per 1 000) |
| Backend-hosting hobby | 0–70 kr/mån |
| Expo EAS build (valfritt) | gratis nivå räcker för några builds |

## Checklista innan "riktig" demo

- [ ] `DEV_AUTH=false` i backendens produktionsmiljö.
- [ ] `/health` visar `database: supabase`, `ai_provider: gemini`, `face_detector: google`.
- [ ] Ett testkonto registrerat, mejl verifierat, profil med samtycke.
- [ ] En bild uppladdad: syns i Storage under rätt `user_id`, EXIF borta.
- [ ] En analys klar: rad i `ai_assessments`, `red_flags` rimligt.
- [ ] Plan bekräftad: `treatment_plans.status = confirmed`.
- [ ] Ett andra testkonto ser **inget** av det första (RLS-test).
- [ ] Radera konto → alla rader och filer borta.

## Kända begränsningar i den här versionen

- Beta-formuläret på landningssidan skickar inget än (ingen endpoint ännu; tabellen `beta_signups` finns).
- `expo-camera` i Expo Go fungerar, men ansiktsguiden är bara en visuell ram – kvalitetskontrollen sker på servern.
- Gemini- och Anthropic-providrarna samt Google Vision-anropet är skrivna enligt SDK-/API-dokumentationen men inte körda mot tjänsterna i det här repot (inga nycklar i miljön). Första körningen görs i Sprint 1 av Youssef (Gemini) och Ali (Vision).
- Supabase-repositories är skrivna mot schemat men inte körda mot ett riktigt projekt här. Första körningen görs i Sprint 1 av Assad.
- Google-inloggning är kopplad via Supabase OAuth men inte testad live (kräver Google Cloud OAuth-klient). Apple-inloggning finns inte (kräver betalt Apple-konto).
- Produktkort visar produkttyper och ingredienser, inte varumärken (teamets beslut).
- Fliken Framsteg är en platshållare för Release 2.
- Mascoten och fotona i appen är urklippta ur designskärmarna (`apps/mobile/assets/design`); byt ut filerna när originalen finns.
