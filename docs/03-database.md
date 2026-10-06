# 03 · Databas, auth och bildlagring

Ägare: **Assad** (backend + databas), auth-delen tillsammans med **Anas**.
Källa: [`supabase/schema.sql`](../supabase/schema.sql). Kör den i Supabase SQL-editor.

## ER-diagram

```
auth.users (Supabase)
    │ 1
    │
    ├──1── profiles ──────────────── display_name, birth_year, skin_type, consent_images, consent_at, locale
    │
    ├──*── assessments ───────────── questionnaire_version, status, answers (jsonb), submitted_at, analyzed_at
    │          │
    │          ├──*── skin_images ── storage_path, area, width, height, bytes, face_check (jsonb)
    │          │
    │          ├──*── ai_assessments  provider, model, result (jsonb = SkinGuidance), red_flags[], tokens
    │          │
    │          ├──*── chat_messages ─ role, content
    │          │
    │          └──0..1 treatment_plans  status, title, summary, plan (jsonb), confirmed_at
    │
questionnaire_versions ─────────── version, schema (jsonb), is_active
beta_signups ───────────────────── email, source
```

## Tabeller

| Tabell | Syfte | Nyckelfält |
|---|---|---|
| `profiles` | En rad per användare, skapas automatiskt av trigger vid signup | `consent_images` (GDPR-samtycke), `skin_type` |
| `questionnaire_versions` | Vilken version av frågeformuläret en bedömning svarade mot | `version`, `is_active` (max en aktiv) |
| `assessments` | En "omgång": svar → bilder → AI-resultat | `status` draft → submitted → analyzed/failed, `answers` jsonb |
| `skin_images` | Metadata om bild; filen ligger i bucket | `storage_path` = `<user_id>/<image_id>.jpg`, `face_check` |
| `ai_assessments` | Strukturerat AI-svar | `result` jsonb enligt `SkinGuidance`, `red_flags[]` |
| `chat_messages` | Konversationen per bedömning | `role`, `content` |
| `treatment_plans` | Föreslagen/bekräftad plan | `status`, unikt index: max en `confirmed` per användare |
| `beta_signups` | Från landningssidan | `email` unik |

Varför jsonb för `answers`, `result` och `plan`? Frågeformuläret och AI-schemat kommer att ändras varje sprint. Jsonb låter oss versionera i kod (Pydantic + `questionnaire_version`) i stället för att migrera tabeller varje vecka. Fält vi vill filtrera på (`status`, `red_flags`) ligger som riktiga kolumner.

## Säkerhet: Row Level Security

Alla tabeller har RLS på. Policyn är densamma överallt: `auth.uid() = user_id`. Även om anon-nyckeln läcker kan en användare bara läsa sina egna rader.

Backend använder **service-role-nyckeln** (som går förbi RLS). Därför filtrerar varje repository-metod på `user_id` från den verifierade JWT:n – backend är sin egen RLS. Se `apps/api/src/repositories/supabase.py`.

## Auth-flöde

```
App ── signUp(email, password) ──▶ Supabase Auth ── mejl med länk (dermora://verified)
App ── signIn ───────────────────▶ Supabase Auth ──▶ access_token (JWT, HS256)
App ── Authorization: Bearer <jwt> ──▶ FastAPI: jwt.decode(SUPABASE_JWT_SECRET, aud="authenticated") → sub = user_id
```

Lokalt utan Supabase: `DEV_AUTH=true` accepterar `Bearer dev:<uuid>`. Config vägrar starta i produktion med `DEV_AUTH=true`.

## Bildlagring

- Bucket `skin-images`, **privat**, max 8 MB, endast jpeg/png/webp.
- Sökväg `<user_id>/<image_id>.jpg` → storage-policy: `(storage.foldername(name))[1] = auth.uid()`.
- Backend tar bort EXIF (GPS!), roterar rätt, skalar till max 1600 px och sparar som JPEG innan uppladdning.
- Appen visar bilder via tidsbegränsad signerad URL (10 min) eller via `GET /images/{id}/file` i dev.

## GDPR-checklista

| Krav | Lösning |
|---|---|
| Rättslig grund för hudbilder (känslig data) | Uttryckligt samtycke: `profiles.consent_images` + `consent_at`; uppladdning nekas utan |
| Dataminimering | Inga biometriska mallar, bara kvalitetsverdikt i `face_check`; EXIF strippas |
| Rätt till radering | `DELETE /profile` tar bort bilder + rader; SQL-funktion `delete_user_data(uuid)` |
| Lagring inom EU | Välj EU-region i Supabase; Anthropic-anrop: inga bilder lagras efter svar (kontrollera avtal) |
| Transparens | Appen förklarar vid samtycke och på bildskärmen vad som händer |

## Utanför MVP (förberett)

Tabeller för rutiner, påminnelser, progressbilder och läkarkontakt läggs till som nya tabeller med samma mönster (`user_id` + RLS). `skin_images.assessment_id` är nullable just för att progressbilder i Release 2 inte behöver tillhöra en bedömning.
