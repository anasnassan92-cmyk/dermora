# 04 · API-kontrakt

> **Obs (2026-10):** detta dokument skrevs för den första prototypen (FastAPI + Supabase, nu i `legacy/`). Produktionen kör `apps/server` (Node.js/Express + MySQL på Hostinger). Principerna gäller, men filvägar, endpoints och tabeller finns i `apps/server/src/`.


Bas-URL lokalt: `http://localhost:8000`. Interaktiv dokumentation: `/docs` (Swagger) och `/redoc`.
Alla endpoints utom `/health` och `/questionnaire` kräver `Authorization: Bearer <jwt>`.
Fel returneras som `{"detail": "..."}` (sträng) eller `{"detail": {"errors": [...]}}` vid valideringsfel.

| Metod | Path | Ägare | Beskrivning |
|---|---|---|---|
| GET | `/health` | Assad | Status, vilken databas/AI-provider som körs |
| GET | `/profile` | Anas | Hämta profil (skapas om den saknas) |
| PUT | `/profile` | Anas | Uppdatera `display_name`, `birth_year`, `age_range`, `gender`, `country`, `skin_type`, `consent_images`, `locale` |
| DELETE | `/profile` | Anas | GDPR: radera all data för användaren |
| GET | `/questionnaire?version=1.0.0` | Adam | Frågor inkl. `show_if`-regler |
| POST | `/assessments` | Adam | Ny bedömning (draft) |
| GET | `/assessments` | Adam | Lista egna bedömningar |
| GET | `/assessments/{id}` | Adam | En bedömning inkl. `image_ids` |
| PUT | `/assessments/{id}/answers` | Adam | Spara (del-)svar, autosave |
| POST | `/assessments/{id}/submit` | Adam | Validera obligatoriska svar → status `submitted` |
| POST | `/images` (multipart) | Ali | Ladda upp bild: `file`, `assessment_id?`, `area?` → face_check |
| POST | `/images/check` (multipart) | Ali | Bara kvalitetskontroll, sparar inget |
| GET | `/images?assessment_id=` | Ali | Lista bilder med signerad URL |
| GET | `/images/{id}/file` | Ali | Bildfilen (dev / fallback) |
| DELETE | `/images/{id}` | Ali | Radera bild + fil |
| POST | `/ai/analyze/{assessment_id}` | Youssef | Kör AI-analys → `SkinGuidance` |
| GET | `/ai/result/{assessment_id}` | Youssef | Senaste resultat |
| GET | `/ai/chat/{assessment_id}` | Youssef | Chat-historik |
| POST | `/ai/chat/{assessment_id}` | Youssef | Skicka meddelande → AI-svar |
| POST | `/plans/from-assessment/{id}` | Even | Skapa *föreslagen* plan från AI-resultatet |
| POST | `/plans` | Even | Skapa plan från (redigerat) förslag |
| GET | `/plans` | Even | Alla planer |
| GET | `/plans/active` | Even | Den bekräftade planen eller `null` |
| GET | `/plans/{id}` | Even | En plan |
| POST | `/plans/{id}/confirm` | Even | Bekräfta (föregående bekräftad arkiveras) |
| POST | `/plans/{id}/archive` | Even | Arkivera |

## Statuskoder att hantera i appen

| Kod | När | Appen gör |
|---|---|---|
| 401 | Token saknas/ogiltig/utgången | Logga ut, visa login |
| 403 | E-post ej verifierad, eller samtycke saknas för bild | Visa VerifyEmail / EditProfile |
| 409 | Fel ordning (analysera innan submit, chatta innan analys) | Styr tillbaka i flödet |
| 413 / 415 / 422 | Bild för stor / fel format / oläsbar, eller saknade svar | Visa `detail` för användaren |
| 502 | AI-tjänsten svarade inte | "Försök igen"-knapp |

## Exempel

### Frågeformulär med följdfråga

```json
GET /questionnaire
{
  "version": "1.0.0",
  "title": "Berätta om din hud",
  "questions": [
    { "id": "concerns", "type": "multi", "title": "Vilka besvär vill du ha hjälp med?", "options": [ { "value": "acne", "label": "Finnar / akne" } ] },
    { "id": "acne_area", "type": "multi", "title": "Var får du oftast finnar?",
      "show_if": { "question_id": "concerns", "includes": "acne" }, "options": [ ... ] }
  ]
}
```

`show_if` stöder `equals` (single/boolean), `includes` (multi) och `gte` (scale). `layout` (`cards` | `grid`) och `options[].icon/description` styr hur appen ritar frågan (skärm 6–7 i designen). Samma regel finns i `apps/mobile/src/utils/questionnaire.ts` och `apps/api/src/services/context_builder.py`.

### Bilduppladdning

```
POST /images
Content-Type: multipart/form-data
file=<jpeg>  assessment_id=<uuid>  area=face

201
{
  "id": "…", "assessment_id": "…", "area": "face", "width": 1200, "height": 1600, "bytes": 231044,
  "face_check": { "face_found": true, "faces": 1, "blur_score": 184.2, "brightness": 138.5,
                  "face_coverage": 0.21, "ok": true, "reasons": [] },
  "url": "https://…signed…"
}
```

Om `face_check.ok` är `false` innehåller `reasons` svenska tips ("Bilden är suddig …"). Appen föreslår "Ta om" men tillåter "Använd ändå".

### AI-resultat (`SkinGuidance`)

```json
POST /ai/analyze/{assessment_id}
{
  "assessment_id": "…", "provider": "anthropic", "model": "claude-opus-5-5",
  "result": {
    "skin_type_estimate": "combination",
    "primary_concern": "Mild till måttlig akne i T-zonen",
    "observations": [ { "area": "forehead", "finding": "Några små finnar och pormaskar", "severity": "mild", "confidence": "medium" } ],
    "overall_severity": "mild",
    "image_quality_note": null,
    "guidance": "Dina svar och bilder tyder på …",
    "plan": {
      "title": "Lugn start för blandhud med mild akne",
      "summary": "…",
      "goals": [ "Minska utbrott", "Balansera talgproduktion" ],
      "morning": [ { "step": "Rengöring", "product_type": "Mild, parfymfri rengöring", "active_ingredient": null, "frequency": "Varje morgon", "why": "…" } ],
      "key_ingredients": [ "Salicylsyra 2 % – rensar porer" ], "tips": [ "Byt örngott varje vecka" ],
      "evening": [ … ], "weekly": [], "avoid": [ "Skrubbar med korn" ],
      "expectations": "…", "follow_up_days": 14
    },
    "red_flags": [], "seek_care": false,
    "disclaimer": "Dermora ger vägledning, inte medicinsk diagnos. Kontakta vården vid oro."
  }
}
```

Schemat är definierat en gång i `apps/api/src/schemas/ai.py` och speglat i `apps/mobile/src/types/api.ts`. Ändra båda i samma PR.
