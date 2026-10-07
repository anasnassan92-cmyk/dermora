# 08 · Få in designen i Figma (redigerbar)

Designen lever i kod (landningssida i HTML/CSS, appen i React Native) med brand kit-tokens. För att få **redigerbara** Figma-filer används pluginet **html.to.design** (gratis för grundbruk). Det läser en webbsida och skapar riktiga Figma-lager (auto layout, text, fyllningar) – inte en bild.

## Landningssidan och presentationen

1. Starta sidan lokalt: `cd apps/web && python -m http.server 8085` (eller använd GitHub Pages-länken när den är publicerad).
2. Öppna Figma → ny fil **Dermora – Web**.
3. Plugins → sök **html.to.design** → kör.
4. Välj **URL**, klistra in `http://localhost:8085/` (kräver att pluginets desktop-brygga körs för localhost; annars använd Pages-länken). Importera i bredd 1440 och 390 (mobil).
5. Upprepa för `/presentation.html`.
6. Lägg varje import på en egen Figma-page: `Landing – Desktop`, `Landing – Mobile`, `Presentation`.

Tips: kör importen igen efter större kodändringar i stället för att redigera båda ställena. Kod är källan.

## Appen

Två vägar:

**A. Expo Web → html.to.design (snabbast).**
1. `cd apps/mobile && npx expo start --web` → öppna `http://localhost:8081`.
2. Sätt webbläsarens visningsyta till 390 × 844 (enhetsläge i DevTools).
3. Öppna varje skärm direkt med förhandsvisningsläget, t.ex. `http://localhost:8081/?preview=Register`, `?preview=Assessment&q=1`, `?preview=AIChat`, `?preview=Tabs&tab=Home` (lista i `scripts/screenshots.py`), och importera varje vy med html.to.design → page `App – Screens`.

**B. Rita om i Figma med tokens (när ni vill designa vidare).**
Skapa Figma-variabler från `packages/brand/dermora-colors.json` (färger) och typografin i `apps/mobile/src/theme/typography.ts`. Radier: 10 / 16 / 24 / 32 / 999. Ikoner: importera `apps/web/assets/icons/*.svg` (24 px, 1,75 px linje, `currentColor`).

## Brand kit i Figma

- Logotyper: `Dermora_Brand_Kit/01_Logo/**/SVG/*.svg` → dra in som komponenter.
- Ikoner: `05_Icons/SVG/line-outlined/` är versionen som är gjord för Figma (linjer konverterade till ytor).
- Mönster: `06_Patterns/**/*_tile.svg` som fyllning med "Tile".
- Typsnitt: Montserrat finns i Figma utan installation (Google Fonts).

## Prototyp i Figma

Koppla skärmarna i page `App – Screens` i samma ordning som användarresan:
Welcome → Register → VerifyEmail → Hem → Frågeformulär → Bild → Analyserar → Bedömning → (Chat) → Plan → Hem.
Det ger en klickbar prototyp till redovisningen även om man inte kör appen live.

## Öppen för redigering (hela gruppen)

Filen finns redan: **https://www.figma.com/design/3Mytv71asDlX8rEz1JbCGk/Dermora---App---Web--Grupp-6-** (Anyone with the link → can edit). Innehåller landningssidan (1440 + 390), presentationen (1440) och alla appens skärmar (390): Välkommen, Logga in, Skapa konto, Verifiera, Grundprofil, Intro, Hudtyp, Hudproblem, Följdfrågor, Bilder, Granska bilder, Analys, Chat, Plan, Bekräfta, Plan sparad, Hem, Skanna – importerade från `/app/?preview=<Skärm>` på den live-körda sajten (förhandsläget fungerar nu i produktion, utan inloggning). Gratisplanen i html.to.design har en månadskvot; när den är slut, vänta till nästa månad eller använd Capture-tillägget.

1. Skapa Figma-filerna i ett **Team** (Figma → Teams → *Dermora – Grupp 6*) och bjud in alla sex som *Editor*; eller sätt filens delning till *Anyone with the link → can edit*.
2. Appen körs live på <https://lightslategray-wallaby-444786.hostingersite.com/app/> – ingen lokal server behövs. Installera Chrome-tillägget **html.to.design – Capture**, gå igenom flödet i appen (skapa konto → kod → grundprofil → frågor → bilder → analys → chat → plan → hem) och klicka *Capture* på varje skärm; importera sedan i Figma-pluginet. Inloggade skärmar fungerar eftersom tillägget läser det som visas i webbläsaren.
3. Landningssidan importeras direkt med URL: `https://lightslategray-wallaby-444786.hostingersite.com/` (1440 och 390 px).
4. Lägg Figma-länken i README under *Design* så att den syns för läraren.
