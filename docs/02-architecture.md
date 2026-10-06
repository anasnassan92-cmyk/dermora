# 02 · Systemarkitektur

## Översikt

```
                 ┌───────────────────────────────┐
                 │          ANVÄNDARE            │
                 └───────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │   MOBILAPP (apps/mobile)      │
                 │   React Native + Expo + TS    │
                 │   features/ services/ theme/  │
                 └───────┬───────────────┬───────┘
      Supabase Auth      │               │  Alla andra anrop: HTTPS + Bearer JWT
      (signup/login/     │               │
       verifiering)      │               ▼
                         │   ┌───────────────────────────┐
                         │   │  BACKEND (apps/api)       │
                         │   │  FastAPI                  │
                         │   │  • verifierar JWT         │
                         │   │  • validerar input        │
                         │   │  • face-check (OpenCV)    │
                         │   │  • bygger AI-kontext      │
                         │   │  • sparar resultat        │
                         │   └──────┬─────────┬──────────┘
                         │          │         │
                         ▼          ▼         ▼
            ┌──────────────────────────┐   ┌──────────────────────┐
            │  SUPABASE (EU)           │   │  CLAUDE API          │
            │  Postgres + RLS          │   │  bild + text in,     │
            │  Auth                    │   │  SkinGuidance (JSON) │
            │  Storage: skin-images    │   │  ut                  │
            └──────────────────────────┘   └──────────────────────┘
```

**Regel:** appen pratar aldrig direkt med databasen, bildlagringen eller AI:n. Det enda undantaget är Supabase Auth (inloggning), eftersom det ger oss e-postverifiering och sessionshantering gratis.

## Varför en backend i mitten?

- **Säkerhet:** AI-nyckeln och service-role-nyckeln finns bara på servern. Användar-id tas från den verifierade JWT:n, aldrig från request-body.
- **Kvalitet:** bilder normaliseras (EXIF/GPS bort, rätt rotation, max 1600 px) och kvalitetskontrolleras innan AI:n ser dem.
- **Kontroll:** regelbaserade varningssignaler ("sudden_change", hög smärta) beräknas i kod och tvingar `seek_care=true` oavsett vad modellen svarar.
- **Testbarhet:** hela flödet körs med minnesrepositories och mock-AI i `pytest` utan nätverk.

## Exempel: användaren laddar upp bild + formulär

```
Mobilapp                      Backend                              Supabase / AI
   │  PUT /assessments/{id}/answers │                                   │
   │ ─────────────────────────────▶ │ validera, spara (draft)           │
   │  POST /images (multipart)      │                                   │
   │ ─────────────────────────────▶ │ consent? → normalisera → face-check
   │                                │ → storage.put(<user>/<id>.jpg) ──▶│ bucket skin-images
   │ ◀───────────────────────────── │ ImageOut { face_check }           │
   │  POST /assessments/{id}/submit │                                   │
   │ ─────────────────────────────▶ │ validera obligatoriska svar       │
   │  POST /ai/analyze/{id}         │                                   │
   │ ─────────────────────────────▶ │ profil + svar + bilder → kontext  │
   │                                │ → provider.analyze() ───────────▶ │ Claude (structured output)
   │                                │ ◀ SkinGuidance (validerad Pydantic)
   │                                │ spara ai_assessments, seed chat   │
   │ ◀───────────────────────────── │ AnalyzeOut                        │
```

## Mobilappens struktur

```
apps/mobile/src/
├── components/ui/        Button, Input, Card, Screen, Chip, ProgressBar, T, Disclaimer   (Even)
├── features/
│   ├── auth/             Welcome, Login, Register, VerifyEmail                            (Anas)
│   ├── profile/          Profile, EditProfile                                             (Anas)
│   ├── assessment/       AssessmentScreen, QuestionRenderer, QuestionOption, service     (Adam)
│   ├── images/           ImageUploadScreen, ImagePicker, ImagePreview                     (Ali)
│   ├── ai-guidance/      Analyzing, Result, AIChat, AIMessage                             (Youssef)
│   └── treatment-plan/   Home, TreatmentPlan, SavedPlan, PlanCard, PlanItem, service     (Even)
├── navigation/           RootNavigator (auth-stack / verify / app-stack + tabs), types
├── services/
│   ├── api/client.ts     fetch-wrapper med Bearer-token
│   ├── auth/             Supabase Auth eller mock                                         (Anas)
│   ├── ai/               aiService                                                         (Youssef)
│   ├── storage/          imageStorageService                                               (Ali)
│   ├── profile/          profileService
│   └── mock/             mock-data (samma berättelse som backendens MockProvider)
├── hooks/useAuth.tsx     AuthProvider + useAuth()
├── types/api.ts          speglar backendens Pydantic-scheman
├── utils/questionnaire.ts isVisible / progress (samma regel som backend)
├── constants/            API_URL, flaggor för mock-läge, disclaimer
└── theme/                colors, spacing, typography (brand kit v1.1)
```

**Mock-gräns:** varje service kollar `USE_MOCK_API`/`USE_MOCK_AUTH`. Om env saknas körs appen helt lokalt. Det är så "bygg inte någon annans feature"-regeln blir praktisk: Adam kan bygga frågeformuläret mot mock-API innan Assad har backend klar.

## Backendens struktur

```
apps/api/src/
├── main.py               FastAPI-app, CORS, routers, /health
├── core/                 config (env), security (JWT / dev-token), supabase-klient      (Assad, Anas)
├── api/routes/           profile, assessment, images, ai, plans
├── schemas/              Pydantic-kontrakt: profile, assessment, image, ai (SkinGuidance), plan
├── services/
│   ├── context_builder   svar → text, validering, regelbaserade varningssignaler         (Youssef)
│   ├── provider          MockProvider / AnthropicProvider (structured outputs)           (Youssef)
│   ├── prompts           system-prompter med säkerhetsregler                             (Youssef)
│   ├── ai_service        orkestrerar analys och chat                                     (Youssef)
│   └── face_detection    OpenCV Haar: ansikte hittat? skärpa? ljus?                      (Ali)
├── repositories/         Protocol-interface + memory.py + supabase.py                    (Assad)
└── data/questionnaire_v1.json  frågor + show_if-regler                                   (Adam)
```

## Beslut (ADR-light)

| # | Beslut | Alternativ | Motivering |
|---|---|---|---|
| 1 | FastAPI som mellanlager | Appen pratar direkt med Supabase + AI | Nycklar på servern, kvalitetskontroll, regelbaserad säkerhet, testbarhet |
| 2 | Supabase för Postgres/Auth/Storage | Egen Postgres + JWT + S3 | Gratis nivå, e-postverifiering och RLS ut ur lådan, SQL som läraren kan läsa |
| 3 | Claude (multimodal) med structured outputs | Träna egen CNN | Ingen datainsamling behövs i MVP; teamets AI-arbete blir prompter, schema, kontext, tester |
| 4 | Ansiktsdetektering på servern (OpenCV) | ML Kit på enheten | Fungerar i Expo Go utan native build; inga biometriska data lämnar servern |
| 5 | Mock-läge i både app och backend | Vänta på riktig integration | Alla sex kan demo:a sprint 1 utan konton/nycklar |
| 6 | Bilder lagras under `<user_id>/` i privat bucket | Publik bucket med obskyra namn | Storage-RLS kan då bindas till `auth.uid()` |
