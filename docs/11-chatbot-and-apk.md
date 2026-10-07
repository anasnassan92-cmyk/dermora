# 11 · Chatboten (expertläge) och Android-APK

## Chatboten – hur den fungerar

Allt sitter i `apps/server/src/services/ai.ts`, `knowledge.ts` och `routes/app.ts` (sektionen *chat*).

| Del | Vad | Var |
|---|---|---|
| Kunskapsbas (RAG) | Åtta svenska markdown-filer om ingredienser, kombinationer, hudtyper, akne, pigment/rodnad/torrhet, solskydd/livsstil, vårdkontakt/graviditet, förväntningar. Varje `## rubrik` är ett avsnitt. Hämtas med BM25 (svensk stemmer, inga embeddings – körs offline och i tester). | `src/data/knowledge/*.md`, `src/services/knowledge.ts` |
| Modeller | Analys: `gemini-2.5-pro` med tankebudget 2048 (strukturerad JSON). Chat: `gemini-flash-latest` utan tanke (snabb). Reserv i ordning: `gemini-2.5-flash`, `gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-2.5-flash-lite`. En överbelastad modell vilar 5 min. | `src/config.ts` (`GEMINI_*`) |
| Minne | `user_memory.summary`: korta anteckningar (produkter som provats, reaktioner, preferenser, mål) som modellen uppdaterar var tredje användarmeddelande i bakgrunden. Skickas med i systemprompten. Raderas med kontot. | `maybeUpdateMemory()` |
| Uppföljning | När planens `follow_up_days` passerat och användaren inte chattat på 3 dagar sätts `checkin_due`; appen visar en avstämningsknapp och prompten ber modellen inleda med avstämningsfrågor. | `planStatus()`, `GET /ai/chat/:id/status` |
| Bild i chatten | `POST /ai/chat/:id` med `image_id` (en uppladdad bild). Servern skickar första framifrån-bilden + den nya till modellen och ber om en jämförelse område för område. | `chatContextFor()` |
| Streaming | `POST /ai/chat/:id/stream` svarar med server-sent events: `delta` (text), `done` (hela meddelandet med `suggestions` och `sources`), `error`. Appen använder `expo/fetch` på mobil och vanlig `fetch` på webb; faller tillbaka till `POST /ai/chat/:id` om strömmen inte går. | `chatReplyStream()` |
| Följdfrågor | Modellen avslutar varje svar med `>>> ["…", "…"]`; servern plockar bort raden och sparar den som `suggestions`. Appen visar dem som knappar. | `parseChatOutput()` |
| Betyg | `POST /ai/chat/:id/feedback` `{message_id, rating: 1|-1|0, comment}` → `chat_messages.rating/feedback`. Adminpanelen visar 👍/👎 per svar, modell och använda kunskapsavsnitt. | admin → Chattar |

Att förbättra chatbotens kunskap = redigera markdown-filerna och deploya. Inga nya nycklar behövs.

### Testa chatten lokalt

```bash
cd apps/server && GEMINI_API_KEY=... npx tsx src/index.ts     # utan nyckel: mock-svar med samma format
curl -N -X POST localhost:4000/api/ai/chat/<assessmentId>/stream -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"content":"Kan jag kombinera retinol och AHA?"}'
```

## Framsteg-fliken

`GET /progress` → aktiv plan, dagar på planen, `checkin_due`, följsamhet 14 dagar (%), svit (dagar i rad), rutinlogg (28 dagar) och alla framifrån-bilder i datumordning. `POST /progress/log` `{day, slot: morning|evening|weekly, done}` loggar (upsert). Appen: `ProgressTabScreen` (svit, procent, dagar till uppföljning, dagens morgon/kväll, 14-dagarsrutnät, före/efter-bilder, knapp till uppföljningschatten).

## Android-APK med EAS

Förutsättningar: Expo-konto inloggat (`npx eas login`), projektet är länkat (`extra.eas.projectId` i `app.json`).

```bash
cd apps/mobile
npx eas build -p android --profile preview --non-interactive --no-wait   # APK, ~15 min i molnet
npx eas build:list --platform android --limit 1                           # status + nedladdningslänk
npx eas build -p android --profile production                             # AAB för Google Play
```

`eas.json` sätter `EXPO_PUBLIC_API_URL=https://lightslategray-wallaby-444786.hostingersite.com/api` i båda profilerna, så APK:n pratar med den live-körda servern. Signeringsnyckeln skapades automatiskt i EAS vid första bygget (behåll den – samma nyckel krävs för uppdateringar).

Installera på Android: ladda ner APK-länken på telefonen → öppna → tillåt "okända källor" → installera.

## Google-inloggning

- **Webb:** OAuth-klient av typen *Web application* i Google Cloud → `GOOGLE_CLIENT_ID` på servern. Tillåtna JavaScript-origins: `https://lightslategray-wallaby-444786.hostingersite.com`.
- **Android (APK):** OAuth-klient av typen *Android* med paketnamn `se.dermora.app` och SHA-1-fingeravtrycket från EAS-nyckeln (`npx eas credentials -p android` → Keystore → SHA-1). Sätt `GOOGLE_ANDROID_CLIENT_ID` på servern (och bygg om APK:n, eller sätt `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` i `eas.json`). Appen använder `expo-auth-session` med redirect `se.dermora.app:/oauthredirect` och skickar `id_token` till `POST /auth/google`, som accepterar alla id:n i `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_IDS` + `GOOGLE_ANDROID_CLIENT_ID`.

## E-postkoder (SMTP)

Skapa en brevlåda i hPanel → Emails (gratis med hostingen), sätt `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (samma adress) på servern → Apply changes → redeploy. Tills dess visar appen koden på skärmen ("Demo").
