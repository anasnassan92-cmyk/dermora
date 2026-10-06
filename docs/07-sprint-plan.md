# 07 · Sprintplan (Release 1)

Utgångsläge: det här repot innehåller redan en körbar grund i mock-läge (app, backend, schema, docs). Sprintarna nedan handlar om att göra varje del *riktig*, en ägare i taget, med demo varje fredag.

## Sprint 0 · Grunden tillsammans (2–3 dagar)

Mål: **alla sex kan köra projektet på sin dator.**

- [ ] Skapa GitHub-repot, pusha detta, sätt branch protection på `main` (kräv PR + 1 review + grön CI).
- [ ] Byt ut `@youssef` m.fl. i `.github/CODEOWNERS` mot riktiga GitHub-användarnamn.
- [ ] Alla: klona, `npm install`, `pip install`, `npx expo start` → appen i Expo Go i mock-läge; `pytest` grönt.
- [ ] Assad: skapa Supabase-projekt (EU), kör `schema.sql` + `seed.sql`, dela nycklar via Discord-DM (aldrig i git).
- [ ] Youssef: skapa Anthropic-konto, lägg nyckeln i egen `.env`.
- [ ] Jira: importera backloggen nedan som stories.

Demo: "Start → svara → bild → AI-svar → plan" i mock-läge på en telefon.

## Sprint 1 · Första kompletta flödet med riktig auth och databas

| Ägare | Story | Klart när |
|---|---|---|
| Anas | Riktig signup/login/verifiering mot Supabase | Konto skapas, mejl kommer, länk loggar in, backend accepterar JWT |
| Anas | Profil sparas i `profiles` | PUT /profile syns i Supabase |
| Assad | `SbRepos` i drift, `/health` visar `database: supabase` | pytest grönt + manuellt test mot Supabase |
| Adam | Frågeformulär v1 granskat med teamet, `show_if`-regler testade | Alla följdfrågor dyker upp rätt i appen |
| Ali | Uppladdning till privat bucket, signerad URL i appen | Bild syns i Supabase Storage under `<user_id>/` |
| Youssef | `AnthropicProvider` kopplad, 5 testfall körda | Riktigt svar i appen med `seek_care` rätt i testfallen |
| Even | Plan-skärmar mot riktigt resultat, bekräfta/arkivera | En bekräftad plan per användare i databasen |

Demo: hela resan med riktiga konton, riktig databas, riktig AI – på två telefoner samtidigt.

## Sprint 2 · Kvalitet och kanter

- Anas: glömt lösenord, logga ut överallt, radera konto (Supabase admin via backend).
- Adam: redigera svar innan submit, spara utkast mellan sessioner.
- Ali: ansiktsguiden utvärderad på 10 riktiga bilder (olika ljus, hudtoner, glasögon); justera trösklar i `face_detection.py`.
- Youssef: utvärderingsset 15–20 fall, mät `seek_care`-träff, inga varumärken, svenska; justera prompt.
- Assad: rate limiting, loggning utan personuppgifter, backup-plan för Supabase, deploy av API (Render/Fly/Railway).
- Even: tomma lägen, felmeddelanden, tillgänglighet (TalkBack/VoiceOver), onboarding-text.
- Alla: GDPR-genomgång med checklistan i `03-database.md`.

Demo: felhantering (dålig bild, nätverk nere, röd flagga → vårdhänvisning).

## Sprint 3 · Polish, landningssida live, redovisning

- Publicera `apps/web` till GitHub Pages (workflow finns), koppla beta-formuläret till `beta_signups`.
- Expo-build (EAS) eller Expo Go-länk för läraren.
- Presentationssidan (`presentation.html`) uppdaterad med slutliga skärmdumpar.
- Talmanus i `10-presentation-notes.md` repeterat – alla sex pratar om sitt område.
- Retro för hela projektet: vad tar vi med oss?

## Definition of Done (per story)

- Koden ligger i en PR som är granskad och mergad.
- Typkontroll/tester gröna i CI.
- Fungerar i mock-läge **och** mot riktiga tjänster (om storyn gäller integration).
- Ingen disclaimer saknas på skärmar med AI-innehåll.
- Dokumentation uppdaterad om kontrakt ändrats (`04-api-contract.md`, `types/api.ts`).
