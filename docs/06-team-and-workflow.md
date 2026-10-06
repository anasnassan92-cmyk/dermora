# 06 · Team, ansvarsområden och arbetssätt

## Grupp 6

| | Namn | Roll | Ansvarsområde (ägare) | Mappar |
|---|---|---|---|---|
| A | **Youssef** | Product Owner | AI-vägledning + AI-integration | `apps/mobile/src/features/ai-guidance/`, `apps/mobile/src/services/ai/`, `apps/api/src/services/{ai_service,provider,prompts,context_builder}.py` |
| B | **Anas** | Utvecklare | Autentisering + profil | `apps/mobile/src/features/{auth,profile}/`, `apps/mobile/src/services/auth/`, `apps/api/src/api/routes/profile.py`, `apps/api/src/core/security.py` |
| C | **Adam** | Utvecklare | Frågeformulär | `apps/mobile/src/features/assessment/`, `apps/api/src/data/questionnaire_v1.json`, `apps/api/src/api/routes/assessment.py` |
| D | **Ali** | Utvecklare | Bilduppladdning + lagring | `apps/mobile/src/features/images/`, `apps/mobile/src/services/storage/`, `apps/api/src/api/routes/images.py`, `apps/api/src/services/face_detection.py` |
| E | **Assad** | Utvecklare | Backend + databas | `apps/api/src/{main.py,core/,repositories/,schemas/}`, `supabase/` |
| F | **Even** | Scrum Master | Behandlingsplan + delat UI | `apps/mobile/src/features/treatment-plan/`, `apps/mobile/src/components/ui/`, `apps/mobile/src/theme/`, `apps/api/src/api/routes/plans.py` |

Vi delar inte projektet i sex orelaterade bitar. Vi delar **en användarresa** i sex ägarområden:

```
Welcome → Konto (Anas) → Frågeformulär (Adam) → Bilder (Ali) → AI-vägledning (Youssef) → Plan (Even)
                                      ▲ allt vilar på Backend + databas (Assad)
```

Ägarskap betyder "du driver, du granskar, du svarar på frågor" – inte "ingen annan får röra". Alla granskar varandras PR:ar.

## Scrum

| | |
|---|---|
| Sprintlängd | 1 vecka |
| Daily | måndag, tisdag, torsdag kl. 10:00 – vad jobbar jag med, hinder, behöver jag hjälp? |
| Backlog refinement | torsdag |
| Sprint review / demo | fredag – vi visar en **fungerande** version mot sprintmålet |
| Retrospektiv | fredag |
| Sprint planning | fredag efter retro |
| Verktyg | Jira (Scrum board), GitHub, Discord |

## Git-regler

1. **Ingen utvecklar direkt på `main`.** `main` ska alltid gå att demo:a.
2. Branch per uppgift: `feat/<område>-<kort>` t.ex. `feat/auth-verify-email`, `fix/images-exif`. Utgå från uppdaterad `main`.
3. Små commits med tydliga meddelanden: `auth: add VerifyEmailScreen (DER-12)`.
4. Pull request med mallen ifylld → minst **en** granskare från ett annat område → merge (squash).
5. CI måste vara grön: `pytest` + `ruff` (backend), `tsc` (app).
6. Hemligheter läggs aldrig i git. `.env` är ignorerad; `.env.example` uppdateras när ni lägger till variabler.
7. Delade filer (`components/ui`, `types/api.ts`, `schemas/`, `schema.sql`) ändras bara efter en kort avstämning i Discord med ägaren.

## "Bygg inte någon annans feature"

Behöver du något som inte finns än? Skapa en **mock-gräns**, inte funktionen:

- App: lägg mock-data i `services/mock/` och låt din service kolla `USE_MOCK_API`.
- Backend: lägg en stub i `repositories/memory.py` eller `MockProvider`.
- Skriv i PR:en vad du mockat så ägaren vet vad som ska ersättas.

## Delad utvecklingskontext (klistra in i er AI-assistent)

> DERMORA — SHARED DEVELOPMENT CONTEXT
> We are building Dermora, a mobile-first React Native + Expo + TypeScript application that gives users personalized skin guidance. We are currently developing Release 1 / MVP only.
> Core MVP user journey: Welcome → Create account/Login → Verify email → Basic profile → Skin questionnaire with conditional follow-up questions → Upload initial images → AI receives questionnaire + image context → User discusses guidance with AI → AI proposes a structured plan → User confirms the plan → Plan is saved and viewable.
> Do not add future features unless specifically assigned. The architecture must remain scalable because later releases may add routines, progress tracking, notifications, additional images, professional services and other modules.
> Use the existing modular structure (`src/components, features, navigation, services, hooks, types, utils, constants, theme, assets`). Feature-specific code lives in `src/features/<feature-name>/`. Keep UI, business logic, API/services and TypeScript types separated.
> Before generating code: respect the existing repository structure, inspect existing shared components/types, do not rename or reorganize shared files without agreement, avoid duplicated components, make your code compatible with work from other developers, state which files you create or modify. Use small, isolated changes suitable for individual GitHub commits. If another part of the application is needed but not assigned to you, create a clean interface/mock boundary instead of implementing someone else's feature.

## Teamkontrakt (sammanfattning)

1. **Professionalism, lugn och positivitet** – lösningsorienterade, även under press och under demo.
2. **Alla ska få komma till tals** – beslut fattas efter att alla fått bidra.
3. **Delaktighet och hjälp varandra – laget före jaget** – säg till tidigt när något är svårt.
