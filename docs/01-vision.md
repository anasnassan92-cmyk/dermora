# 01 · Vision och omfattning

## Problemet

Många med akne och återkommande hudproblem upplever osäkerhet kring behandling, långa vårdvägar och brist på personlig vägledning. I våra intervjuer (10 personer, 19–47 år) hade nästan alla provat flera produkter på råd från TikTok, apotek eller vänner utan att veta vad som faktiskt passade deras hud. Flera beskrev att de "spenderade mycket pengar innan de fick en tydlig plan".

Javelin-experimenten (fem omgångar, 5 personer per omgång) gav:

| Antagande | Resultat | Beslut |
|---|---|---|
| Problemet är viktigt för målgruppen | 4 av 5 uttryckte ett otillfredsställt behov | Fortsätt |
| Personer med akne saknar personlig vägledning | 4 av 5 hade provat flera lösningar utan att veta vad som passade | Fortsätt |
| Användare är bekväma med att dela ansiktsbilder | 4 av 5 positiva eller villkorat positiva – **förtroende, integritet och tydlighet avgör** | Fortsätt, integritet först |
| Betalningsvilja finns | 3 av 5 kan tänka sig att betala om tjänsten ger tydligt personligt värde | Fortsätt, testa pris senare |
| AI räcker som värde | Personlig vägledning + uppföljning + möjlighet till läkare värderas högst; AI är verktyget, inte värdet | Roadmap: läkare i Release 3 |

Små urval – riktning, inte bevis.

## Målet

Göra hudhjälp mer personlig och tillgänglig. Användaren ska förstå sin hud, få individanpassad vägledning och kunna följa sin utveckling över tid.

**Målgrupp (MVP):** vuxna 18–35 i Sverige med återkommande mild till måttlig akne i ansiktet.

## Vad ingår i Release 1 / MVP

| Ingår | Ingår inte (senare releaser) |
|---|---|
| Welcome, skapa konto, logga in, verifiera e-post | Dagliga rutiner, påminnelser, notiser |
| Grundprofil med samtycke till bildbehandling | Progressbilder och jämförelse över tid |
| Frågeformulär med villkorade följdfrågor | Kontakt med hudläkare, dela historik med vården |
| Ladda upp bilder med ansiktsguide och kvalitetskontroll | Egen tränad bildmodell |
| AI får frågesvar + bildkontext → strukturerad vägledning | Produktbutik / affiliate |
| Chat med AI om vägledningen | Flera språk (appen är på svenska) |
| AI föreslår plan → användaren bekräftar → planen sparas och visas | |

## Produktprinciper

1. **Vägledning, inte diagnos.** Varje skärm med AI-innehåll visar disclaimern. Varningssignaler → "kontakta vården".
2. **Integritet är grunden.** Privat lagring, ingen ansiktsigenkänning, radera allt med ett knapptryck, data inom EU.
3. **Enkelt slår perfekt.** Max tre steg morgon och kväll, en ny aktiv ingrediens i taget.
4. **Ingredienser, inte varumärken.** Vi säljer inget.
5. **Skalbart från dag ett.** Feature-mappar och mock-gränser gör att Release 2–3 kan läggas till utan omskrivning.

## User story map (sammanfattning)

| Nivå | 1. Kom igång | 2. Beskriva min hud | 3. Få AI-vägledning | 4. Välja & spara plan | 5. Följa rutin | 6. Följa utveckling | 7. Professionell hjälp |
|---|---|---|---|---|---|---|---|
| **Release 1 (MVP)** | Konto, login, verifiering, grundprofil | Svara på frågor + följdfrågor, ladda upp bild | AI-bedömning, chatta | Granska, bekräfta, spara | – | – | Information om när vård behövs |
| **Release 2** | Bank-ID | Redigera svar, fler bilder | Ställ följdfrågor om planen | Ändra plan | Rutiner, påminnelser, checka av | Progressbilder, historik | Hänvisning |
| **Release 3** | – | – | AI justerar efter utveckling | Starta ny plan | – | Mönster, långsiktig analys | Kontakt med hudläkare, dela historik |
