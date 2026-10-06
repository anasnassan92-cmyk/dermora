# 10 · Redovisning – talmanus och demo-flöde

Mål: läraren ska se (1) ett verkligt problem och validering, (2) en fungerande produkt från start till sparad plan, (3) en professionell arkitektur och ett arbetssätt där sex personer bidrar var sitt tydliga stycke.

Tid: ca 15 minuter + demo. Alla sex pratar.

## 1. Problemet och valideringen – Youssef (2 min)

- Målgrupp: 18–35 med återkommande akne. Intervjuer med 10 personer: "för många råd, visste inte vad som passade mig".
- Javelin: fem experiment, 4 av 5 otillfredsställt behov, förtroende/integritet avgör om folk vill dela bilder, betalningsvilja finns om värdet är personligt.
- Insikt: AI är verktyget – värdet är personlig vägledning + uppföljning + väg till läkare. Därför roadmap i tre releaser.

Visa: `presentation.html` (sektionerna Varför Dermora, Roadmap).

## 2. Produkten – demo i appen – Even leder, alla visar sin del (5 min)

| Steg | Vem | Säg |
|---|---|---|
| Welcome → Skapa konto → Verifiera | Anas | "Supabase Auth med riktig e-postverifiering; backend accepterar bara verifierade JWT." |
| Grundprofil + samtycke | Anas | "Uttryckligt samtycke för bilder – GDPR-krav för känslig data." |
| Frågeformulär | Adam | "Villkorade följdfrågor: svarar du akne får du frågor om var, hur ofta, hur de ser ut. Samma regel i app och backend." |
| Ta bild | Ali | "Ansiktsguide + kvalitetskontroll på servern: suddig, mörk, inget ansikte → tips om att ta om. Ingen ansiktsigenkänning, EXIF/GPS tas bort." |
| Analyserar → Bedömning | Youssef | "Multimodal modell får bild + svar, svarar i ett strikt JSON-schema. Regelbaserade röda flaggor i kod tvingar 'kontakta vården'." |
| Chat | Youssef | "Chatten känner till profilen, svaren och bedömningen. Stannar inom hudvård." |
| Plan → Bekräfta → Hem/Plan-flik | Even | "AI föreslår, användaren bekräftar. Max en aktiv plan. Disclaimer på varje AI-skärm." |

Demo-tips: kör mock-läge som backup om wifi strular (`.env` tom → allt fungerar offline). Ha en inspelad video som reserv.

## 3. Arkitekturen – Assad (3 min)

- Tre lager: app → FastAPI → Supabase/Claude. Appen pratar aldrig direkt med databas eller AI.
- Varför backend i mitten: nycklar på servern, kvalitetskontroll, regelbaserad säkerhet, testbarhet.
- Databas: 7 tabeller, RLS `auth.uid() = user_id` på allt, privat bucket med sökväg per användare, `delete_user_data()`.
- Tester: `pytest` kör hela resan utan nätverk; CI på varje PR.

Visa: `docs/02-architecture.md` (diagrammet), `supabase/schema.sql` (en policy), `/docs` i Swagger.

## 4. Arbetssättet – Even (2 min)

- Scrum med 1-veckorssprintar, daily mån/tis/tors 10:00, demo + retro + planering fredag. Jira, GitHub, Discord.
- En användarresa delad i sex ägarområden – inte sex öar. Feature-branches, PR med mall, CODEOWNERS, minst en granskare, grön CI.
- "Bygg inte någon annans feature": mock-gränser. Visa `USE_MOCK_API` i appen och `MockProvider` i backend.
- Teamkontrakt: lugn, alla kommer till tals, laget före jaget. Poker planning-lärdom: tekniska uppgifter uppskattas olika – prata innan.

## 5. Vad vi lärde oss och nästa steg – Adam + Ali (2 min)

- Lärdomar: validera innan ni bygger; integritet är en funktion; strukturerad AI-output gör AI testbar.
- Nästa: Release 2 (rutiner, progressbilder), Release 3 (hudläkare). Landningssidan live för betatestare.

## Frågor att vara beredd på

| Fråga | Svar |
|---|---|
| Är det här medicinskt säkert? | Vi ger vägledning, inte diagnos. Röda flaggor i både prompt och kod → vårdhänvisning. Disclaimer överallt. Release 3 kopplar in legitimerade läkare. |
| Varför inte träna en egen modell? | Ingen märkt data, etik/GDPR för insamling ryms inte i kursen. Multimodal modell + strukturerat schema ger testbar kvalitet nu. Egen klassificerare är ett stretch-mål. |
| Ansiktsigenkänning och GDPR? | Vi gör ansikts*detektering* för bildkvalitet, inga biometriska mallar. Bilder privata, EU, raderbara. |
| Hur vet ni att AI:n svarar rätt? | Strukturerat schema + regelbaserade kontroller + utvärderingsset med förväntade `seek_care`. Tokens loggas. |
| Vad händer om AI-tjänsten är nere? | Appen får 502 och "försök igen"; bedömningen markeras `failed`; inget går förlorat. |
| Hur skalar det? | Feature-mappar + nya tabeller med samma RLS-mönster. Backend är stateless och kan köras i flera instanser. |
