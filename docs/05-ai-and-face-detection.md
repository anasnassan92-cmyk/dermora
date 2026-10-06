# 05 · AI-vägledning och ansiktsdetektering

Ägare: **Youssef** (AI), **Ali** (bildkvalitet).

## Två olika saker – och vad vi INTE gör

| | Ansiktsdetektering | Ansiktsigenkänning |
|---|---|---|
| Fråga som besvaras | "Finns det ett ansikte i bild, och är bilden användbar?" | "Vem är det här?" |
| Data som skapas | Ett kvalitetsverdikt (ja/nej, skärpa, ljus) | Biometrisk mall som kan matchas mot register |
| GDPR | Vanlig personuppgift (bilden) | Känslig biometrisk uppgift, särskilda krav |
| Dermora | **Ja**, på servern: Google Cloud Vision (FACE_DETECTION) med OpenCV som fallback | **Nej, aldrig** |

Vi använder ordet *hudanalys* utåt. Säg aldrig "ansiktsigenkänning" i appen, på webben eller i presentationen.

## Pipeline

```
Bild från appen
   │
   ▼  strip_metadata_and_normalize()   EXIF/GPS bort · rotera rätt · max 1600 px · JPEG
   │
   ▼  run_face_check()                  FACE_DETECTOR=google → Cloud Vision, annars OpenCV
   │     Google Vision: antal ansikten, boundingPoly (storlek), blurredLikelihood,
   │                    underExposedLikelihood, pan/tilt-vinkel → samma FaceCheck-verdikt.
   │                    Vi begär inga landmarks. Faller tillbaka på OpenCV vid nätverksfel/kvot.
   │     OpenCV:        Haar-kaskad; blur = varians av Laplacian (< 60), ljus 60–215,
   │                    exakt 1 ansikte, ansiktsruta ≥ 4 % av bilden
   │     → FaceCheck { ok, reasons[] på svenska }
   │
   ▼  storage.put(<user_id>/<image_id>.jpg)   privat bucket
   │
   ▼  POST /ai/analyze
         context_builder: profil + svar (bara synliga frågor) + bildmetadata → text
         red_flag_hints:  regelbaserade varningar från svaren (kod, inte AI)
         provider.analyze(context, bilder, hints)
            Gemini (standard): system_instruction + bilder (Part.from_bytes) + kontext
              response_mime_type=application/json, response_schema=SkinGuidance → response.parsed
            Claude (alternativ, AI_PROVIDER=anthropic): messages.parse(output_format=SkinGuidance)
         kod: om hints finns och AI sa seek_care=false → tvinga true
         spara ai_assessments, seed:a chatten med guidance-texten
```

## Varför en färdig multimodal modell i MVP?

- Vi har ingen märkt bilddata att träna på, och insamling av hudbilder kräver etik- och GDPR-arbete som inte ryms i kursen.
- En multimodal modell kan redan beskriva akne, rodnad och textur område för område.
- Teamets AI-arbete blir i stället: **prompter, strukturerat schema, kontextbygge, säkerhetsregler, testfall och utvärdering** – det är det som bedöms.

Valfritt stretch-mål för Release 2: en liten klassificerare för akne-svårighetsgrad (t.ex. tränad på en publik dataset) som andra åsikt bredvid modellen.

## Structured outputs

`apps/api/src/schemas/ai.py` definierar `SkinGuidance`. Gemini anropas med `response_schema=SkinGuidance` (och Claude med `output_format=SkinGuidance`) så att svaret alltid är giltig JSON enligt schemat. Appen parsar aldrig fritext.

Planen innehåller nu även `goals[]` (Huvudmål), `key_ingredients[]` och `tips[]` – raderna som visas på skärm 13–14 i designen.

Fält som alltid finns: `observations[]` (område, fynd, svårighetsgrad, säkerhet), `guidance` (du-form, svenska), `plan` (morgon/kväll/vecka/undvik/förväntningar/uppföljning), `red_flags[]`, `seek_care`, `disclaimer`.

## Säkerhetsregler (i prompten OCH i kod)

| Regel | Var |
|---|---|
| Aldrig diagnos, inga sjukdomsnamn som fakta | prompt |
| Inga varumärken – bara produkttyper och aktiva ingredienser | prompt |
| Max 3 steg morgon/kväll, max 1 ny aktiv ingrediens | prompt |
| `seek_care=true` vid snabb förändring, svullnad, vätskande sår, feber, stark smärta, återkommande cystor, misstänkt infektion/allergi, födelsemärke som ändrar sig, graviditet/amning + aktiva | prompt **+** `context_builder.red_flag_hints()` |
| Aldrig råda att sluta med receptbelagd behandling | prompt |
| Kommentera inte utseende, ålder, identitet | prompt |
| Suddig/mörk bild → `image_quality_note` + lägre confidence | prompt + face_check skickas som kontext |
| Chat: håll dig till hudvård, hänvisa annars till vården | chat-prompt |
| Refusal från modellens säkerhetsklassificerare | kod: `stop_reason == "refusal"` → fel till appen, server-side fallback aktiverad |

## Modell och kostnad

**Standard: Google Gemini** (`GEMINI_MODEL=gemini-2.5-flash`). Nyckeln skapas gratis på https://aistudio.google.com/apikey. Gratisnivån räcker för utveckling och demo (begränsat antal anrop per minut/dag – se aktuella gränser i AI Studio). Obs: på gratisnivån kan Google använda data för förbättring – använd inte riktiga användares bilder där; för skarp drift, aktivera fakturering.

Alternativ: Anthropic Claude (`AI_PROVIDER=anthropic`) – ingen gratisnivå, men prompt-cachad systemprompt och server-side refusal-fallback finns implementerat.

Uppskattning per analys: 1–3 bilder + ~1 500 tokens kontext in, ~1 200 tokens ut.

## Testning och utvärdering (Youssefs backlog)

1. `tests/test_flow.py` kör hela flödet med `MockProvider` – inga nätverksanrop.
2. Skapa `tests/ai_cases/` med 10–20 anonymiserade fall (svar + ev. bild + förväntat `seek_care`, förväntad svårighetsgrad). Kör mot riktig provider i en separat, manuell körning.
3. Mät: andel korrekta `seek_care`, inga varumärken i svaret, alla texter på svenska, planen ≤ 3 steg.
4. Logga `input_tokens`/`output_tokens` (sparas i `ai_assessments`) för kostnadsuppföljning.

## Lokalt: mock vs riktig AI

```
AI_PROVIDER=mock        # deterministiskt svar, inget nätverk (standard)
AI_PROVIDER=gemini      # kräver GEMINI_API_KEY (gratis)
AI_PROVIDER=anthropic   # kräver ANTHROPIC_API_KEY
FACE_DETECTOR=opencv    # lokal kontroll (standard)
FACE_DETECTOR=google    # kräver GOOGLE_VISION_API_KEY (Cloud Vision API aktiverat)
```

Att chatten "inte fungerar" i demo-läge betyder bara att `AI_PROVIDER=mock` svarar med fasta texter. Sätt Gemini-nyckeln så svarar riktig AI.

`MockProvider` och appens `mockData.ts` berättar samma historia (blandhud, mild akne, salicylsyra varannan kväll) så demo:n är konsekvent oavsett läge.
