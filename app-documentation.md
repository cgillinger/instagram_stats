# Instagram Statistik App - Teknisk Dokumentation

## Översikt

Instagram Statistik App är en webbapplikation designad för att analysera och visualisera statistikdata från Instagram-exportfiler. Appen låter användare ladda upp CSV-filer exporterade från Instagram, bearbeta datan, och visa insikter både på kontonivå (aggregerad) och inläggsnivå (detaljerad). Applikationen är helt klientbaserad och sparar all data lokalt i användarens webbläsare.

## Teknisk stack

- **Frontend**: React 18
- **UI-komponentbibliotek**: Shadcn/UI-komponenter med Tailwind CSS
- **Datahantering**: PapaParse (CSV-parser), xlsx (Excel-hantering)
- **Stilar**: Tailwind CSS för styling
- **Datalagring**: IndexedDB och localStorage för datalagring i webbläsaren
- **Byggverktyg**: Vite

## Huvudfunktioner

1. **CSV-import**: Stöd för uppladdning och parsning av Instagram-statistikfiler
2. **Flerspråksstöd**: Anpassningsbara kolumnmappningar för att hantera CSV-filer på olika språk
3. **Datavisualisering**: Visar statistik både per konto och per inlägg
4. **Filtrering & sortering**: Möjlighet att filtrera och sortera data
5. **Export**: Export av bearbetad data till CSV eller Excel
6. **Minneshantering**: Avancerad minneshantering för att optimera prestanda i webbläsaren

## Kodstruktur och filöversikt

### Kärnkomponenter

#### App och huvudlayout
- **src/renderer/App.jsx** - Applikationens root-komponent, hanterar global state, navigation
- **src/renderer/index.jsx** - Entry point för appen, renderar App-komponenten

#### Huvudvyer
- **src/renderer/components/MainView/MainView.jsx** - Huvudvy som hanterar växling mellan per-konto och per-inlägg vyer
- **src/renderer/components/AccountView/AccountView.jsx** - Visar data aggregerad per Instagram-konto
- **src/renderer/components/PostView/PostView.jsx** - Visar data för individuella Instagram-inlägg

#### Filuppladdning och databearbetning
- **src/renderer/components/FileUploader/FileUploader.jsx** - Hanterar uppladdning av CSV-filer, validering
- **src/renderer/components/FileUploader/useColumnMapper.js** - Hook för att hantera kolumnmappningar vid CSV-import
- **src/utils/webDataProcessor.js** - Huvudlogik för bearbetning av CSV-data
- **src/utils/dataProcessing.js** - Hjälpfunktioner för databearbetning och -transformering

#### Kolumnmappningar
- **src/renderer/components/ColumnMappingEditor/ColumnMappingEditor.jsx** - Gränssnitt för att konfigurera kolumnmappningar
- **src/renderer/components/ColumnMappingEditor/columnMappingService.js** - Logik för att hantera kolumnmappningar mellan olika språk

#### Minneshantering
- **src/renderer/components/MemoryIndicator/MemoryIndicator.jsx** - Visar minnesanvändning
- **src/utils/memoryUtils.js** - Funktioner för att beräkna och hantera minnesanvändning
- **src/utils/webStorageService.js** - Hantering av lagring med localStorage och IndexedDB

### UI-komponenter

Appen använder ett anpassat UI-bibliotek baserat på shadcn/ui komponenter:

- **src/renderer/components/ui/alert.jsx** - Alert-komponent för notiser
- **src/renderer/components/ui/button.jsx** - Button-komponent
- **src/renderer/components/ui/card.jsx** - Card-komponenter för innehåll
- **src/renderer/components/ui/checkbox.jsx** - Checkbox-komponent
- **src/renderer/components/ui/input.jsx** - Input-komponent
- **src/renderer/components/ui/label.jsx** - Label-komponent
- **src/renderer/components/ui/select.jsx** - Select-komponent (dropdown)
- **src/renderer/components/ui/switch.jsx** - Switch-komponent (toggle)
- **src/renderer/components/ui/tabs.jsx** - Tabs-komponenter
- **src/renderer/components/ui/table.jsx** - Table-komponent för datapresentation

### Konfigurations- och byggfiler
- **vite.config.js** - Konfiguration för Vite-byggverktyget
- **tailwind.config.js** - Konfiguration för Tailwind CSS
- **postcss.config.js** - PostCSS-konfiguration
- **package.json** - Projektberoenden och skript

## Nyckelkomponenternas funktionalitet

### Filuppladdning och bearbetning

`FileUploader.jsx` är en central komponent som hanterar uppladdning av CSV-filer från Instagram. Den:
- Tillåter drag-and-drop eller filbläddring
- Validerar filer (filtyp, storlek)
- Kontrollerar minnesanvändning innan nya filer laddas
- Detekterar duplicerade filer
- Använder `columnMappingService.js` för att matcha kolumner från CSV med interna fältnamn

Efter uppladdning bearbetas data med `webDataProcessor.js` som:
- Parsar CSV-data med PapaParse
- Konverterar kolumnnamn till interna fältnamn
- Identifierar och filtrerar dubletter
- Beräknar aggregeringar per konto
- Lagrar resultaten via `webStorageService.js`

### Datavisning

Data presenteras i två huvudvyer:

#### AccountView (Per konto)
- Visar aggregerade mätvärden per Instagram-konto
- Beräknar summeringar och genomsnitt
- Visar "total"-rad för alla konton
- Stöder export till CSV/Excel
- Tillhandahåller sortering och filtrering
- Visuell färgkodning för olika kanaltyper

#### PostView (Per inlägg)
- Visar detaljerade mätvärden för varje Instagram-inlägg
- Stöder filtrering per konto
- Inkluderar länkar till originella Instagram-inlägg
- Tillhandahåller sortering och paginering
- Stöder export till CSV/Excel

### Kolumnmappningshantering

`ColumnMappingEditor.jsx` och `columnMappingService.js` hanterar mappningar mellan kolumnnamn i CSV-filer och interna fältnamn. Detta är särskilt viktigt eftersom:
- Instagram kan ändra kolumnnamn i exportfiler
- Exportfiler kan vara på olika språk
- Användare kan anpassa mappningar efter sina behov

Mappningarna sparas i localStorage och används vid CSV-import för att korrekt identifiera relevanta kolumner oavsett språk eller namnändringar.

### Minneshantering

Appen innehåller sofistikerad minneshantering för att optimera prestanda i webbläsaren:
- `memoryUtils.js` beräknar och övervakar minnesanvändning
- `MemoryIndicator.jsx` visar minnesanvändning visuellt med varningsnivåer
- `webStorageService.js` hanterar lagring och optimerar mellan localStorage och IndexedDB
- Funktionalitet för att beräkna projicerad minnesanvändning innan nya filer läggs till
- Automatisk detektering av minnesgränser och varningar

## Dataflöde

1. Användaren laddar upp en CSV-fil via FileUploader
2. Filen valideras och bearbetas av webDataProcessor
3. Data mappas från CSV-kolumner till interna fältnamn via columnMappingService
4. Bearbetad data sparas i IndexedDB och localStorage via webStorageService
5. MainView renderar antingen AccountView eller PostView baserat på användarens val
6. Användaren kan växla mellan vyer, filtrera, sortera och exportera data

## Lagring

Appen använder två metoder för att lagra data i webbläsaren:
- **localStorage** för mindre datamängder som konfigurationer och kolumnmappningar
- **IndexedDB** för större datamängder som bearbetad statistikdata

Data som lagras inkluderar:
- Bearbetad inläggsdata (post view data)
- Aggregerad kontodata (account view data)
- Kolumnmappningar
- Filmetadata för uppladdade filer
- Minnesanvändningsstatistik

## Anpassning och konfiguration

Viktiga konfigurationsmöjligheter:
- Kolumnmappningar via ColumnMappingEditor
- Valda fält för visning i både AccountView och PostView 
- Exportformat (CSV/Excel)
- Sortering och filtrering
- Sidstorlek för paginering

## Utvecklingsöverväganden

- **Prestanda**: Appen hanterar minnesbegränsningar i webbläsaren genom noggrann övervakning
- **Språkstöd**: Dynamiska kolumnmappningar stöder CSV-filer på flera språk
- **Robusthet**: Felhantering och felåterhämtning är implementerade på flera nivåer
- **Användarvänlighet**: Gränssnittet ger tydlig feedback om fel och minnesbegränsningar
- **Webbplattform**: Appen är byggd för webben med emulerad Electron-funktionalitet för eventuell desktop-användning

## Avslutande noteringar

Instagram Statistik App är en sofistikerad webbapplikation som ger användare möjlighet att analysera Instagram-statistik från exporterade CSV-filer. Genom att utnyttja moderna webbtekniker hanterar den databearbetning, visualisering och lagring helt på klientsidan, utan behov av backend-server. Detta möjliggör enkel distribution och användning samtidigt som användarnas data förblir privat på deras enhet.
