# 05 · AI-vägledning och ansiktsdetektering

Ägare: **Youssef** (AI), **Ali** (bildkvalitet).

## Två olika saker – och vad vi INTE gör

| | Ansiktsdetektering | Ansiktsigenkänning |
|---|---|---|
| Fråga som besvaras | "Finns det ett ansikte i bild, och är bilden användbar?" | "Vem är det här?" |
| Data som skapas | Ett kvalitetsverdikt (ja/nej, skärpa, ljus) | Biometrisk mall som kan matchas mot register |
| GDPR | Vanlig personuppgift (bilden) | Känslig biometrisk uppgift, särskilda krav |
| Dermora | **Ja**, på servern med OpenCV | **Nej, aldrig** |

Vi använder ordet *hudanalys* utåt. Säg aldrig "ansiktsigenkänning" i appen, på webben eller i presentationen.

## Pipeline

```
Bild från appen
   │
   ▼  strip_metadata_and_normalize()   EXIF/GPS bort · rotera rätt · max 1600 px · JPEG
   │
   ▼  check_face_photo()               OpenCV Haar-kaskad (frontalface_default)
   │     blur_score  = varians av Laplacian  (< 60 → suddig)
   │     brightness  = medelluminans        (< 60 mörk, > 215 överexponerad)
   │     faces       = antal ansikten       (måste vara exakt 1)
   │     coverage    = ansiktsruta / bild   (< 4 % → för långt bort)
   │     → FaceCheck { ok, reasons[] på svenska }
   │
   ▼  storage.put(<user_id>/<image_id>.jpg)   privat bucket
   │
   ▼  POST /ai/analyze
         context_builder: profil + svar (bara synliga frågor) + bildmetadata → text
         red_flag_hints:  regelbaserade varningar från svaren (kod, inte AI)
         provider.analyze(context, bilder, hints)
            Claude: system-prompt (cachad) + bilder (base64) + kontext
            output_format = SkinGuidance  →  SDK validerar JSON mot Pydantic
         kod: om hints finns och AI sa seek_care=false → tvinga true
         spara ai_assessments, seed:a chatten med guidance-texten
```

## Varför en färdig multimodal modell i MVP?

- Vi har ingen märkt bilddata att träna på, och insamling av hudbilder kräver etik- och GDPR-arbete som inte ryms i kursen.
- En multimodal modell kan redan beskriva akne, rodnad och textur område för område.
- Teamets AI-arbete blir i stället: **prompter, strukturerat schema, kontextbygge, säkerhetsregler, testfall och utvärdering** – det är det som bedöms.

Valfritt stretch-mål för Release 2: en liten klassificerare för akne-svårighetsgrad (t.ex. tränad på en publik dataset) som andra åsikt bredvid modellen.

## Structured outputs

`apps/api/src/schemas/ai.py` definierar `SkinGuidance`. Anropet använder `client.messages.parse(..., output_format=SkinGuidance)` så att svaret alltid är giltig JSON enligt schemat. Appen parsar aldrig fritext.

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

Standard: `claude-opus-5-5`, effort `medium` för analys, `low` för chat. Byt med `AI_MODEL` / `AI_EFFORT` i `.env`. Systemprompten är prompt-cachad (`cache_control`), så upprepade anrop blir billigare.

Uppskattning per analys: ~1 bild + ~1 500 tokens kontext in, ~1 200 tokens ut. Räkna med några ören till någon krona per analys beroende på modell. För kursen räcker Anthropics gratiskrediter / ett litet kort.

## Testning och utvärdering (Youssefs backlog)

1. `tests/test_flow.py` kör hela flödet med `MockProvider` – inga nätverksanrop.
2. Skapa `tests/ai_cases/` med 10–20 anonymiserade fall (svar + ev. bild + förväntat `seek_care`, förväntad svårighetsgrad). Kör mot riktig provider i en separat, manuell körning.
3. Mät: andel korrekta `seek_care`, inga varumärken i svaret, alla texter på svenska, planen ≤ 3 steg.
4. Logga `input_tokens`/`output_tokens` (sparas i `ai_assessments`) för kostnadsuppföljning.

## Lokalt: mock vs riktig AI

```
AI_PROVIDER=mock        # deterministiskt svar, inget nätverk (standard)
AI_PROVIDER=anthropic   # kräver ANTHROPIC_API_KEY
```

`MockProvider` och appens `mockData.ts` berättar samma historia (blandhud, mild akne, salicylsyra varannan kväll) så demo:n är konsekvent oavsett läge.
