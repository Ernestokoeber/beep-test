# Druckoptimierter Auswertungsbericht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Auswertungs-Export erzeugt einen mehrseitigen, gut lesbaren CourtHub-PDF-Bericht ohne überladene Zwölf-Spalten-Tabelle.

**Architecture:** `js/reports.js` behält `exportPDF()` und `buildReport()` unverändert als Datenquelle. `buildPDF()` wird in kleine Layout-Helfer für Kopf-/Fußzeilen, Kennzahlen, Tabellen und Wurfprofile gegliedert; jede Seite liest ihre aktuelle Größe aus dem Dokument, damit Quer- und Hochformat kombinierbar bleiben. `scripts/smoke.mjs` nutzt einen beobachtbaren jsPDF-Stub, um die exportierten Inhalte ohne Browser-Download zu prüfen.

**Tech Stack:** Vanilla JavaScript, jsPDF 2.5.2 (zur Laufzeit über CDN), JSDOM-Smoke-Test, Node.js.

## Global Constraints

- `currentReport` bleibt die einzige Datenquelle für Bildschirm, CSV und PDF.
- Der PDF-Button, Dateiname, Teilen auf Mobilgeräten und CSV-Export bleiben unverändert.
- Keine Änderungen an Datenmodell, Filtern oder anderen PDF-Exporten.
- CourtHub-Grün und TSV-Orange bleiben die Exportfarben.
- Spielernamen dürfen nicht durch ein festes Zeichenlimit abgeschnitten werden.
- Bei leerem Kader gibt es keine leere Wurfprofil-Seite.

---

## File Structure

- `js/reports.js`: Erzeugt Layout und Inhalte des Auswertungs-PDFs.
- `scripts/smoke.mjs`: Stellt realistische Reportdaten bereit und prüft den Inhalt gegen einen jsPDF-Stub.
- `docs/superpowers/specs/2026-08-03-report-pdf-design.md`: Akzeptierte Gestaltungsentscheidung; nur Referenz, keine Änderung.

### Task 1: PDF-Testvertrag für die neue Struktur

**Files:**
- Modify: `scripts/smoke.mjs: nach den bestehenden Auswertungs-Smoketests`
- Modify: `js/reports.js: Export von buildPDF bleibt bestehen`

**Interfaces:**
- Consumes: `window.BT.reports.buildReport(seasonId, playerId)` und `window.BT.reports.buildPDF(doc, report)`.
- Produces: Einen Test, der aus dem erzeugten Dokument Texte und Seitenorientierungen liest.

- [ ] **Step 1: Einen fehlschlagenden PDF-Strukturtest hinzufügen**

  Direkt nach den vorhandenen Assertions für `#/reports` zwei Spieler mit langen Namen, eine abgeschlossene Trainingseinheit, Wurfdaten und ein Spiel in den Speicher schreiben. Einen `pdfStub` bereitstellen, der Text, `addPage(format, orientation)` und Seitengrößen aufzeichnet.

  ```js
  const pdfEvents = [];
  const pdfPages = [{ orientation: 'landscape', width: 841.89, height: 595.28 }];
  const pdfStub = {
    internal: {
      pageSize: { getWidth: () => pdfPages[pdfPages.length - 1].width, getHeight: () => pdfPages[pdfPages.length - 1].height },
      getNumberOfPages: () => pdfPages.length
    },
    addPage: (_format, orientation) => {
      const portrait = orientation === 'portrait';
      pdfPages.push({ orientation: portrait ? 'portrait' : 'landscape', width: portrait ? 595.28 : 841.89, height: portrait ? 841.89 : 595.28 });
      pdfEvents.push(['addPage', orientation]);
    },
    text: value => pdfEvents.push(['text', Array.isArray(value) ? value.join(' ') : String(value)]),
    setCharSpace() {}, setFillColor() {}, rect() {}, setDrawColor() {}, roundedRect() {},
    setTextColor() {}, setFont() {}, setFontSize() {}, line() {}, setPage() {}, splitTextToSize: value => [String(value)]
  };
  window.BT.reports.buildPDF(pdfStub, window.BT.reports.buildReport('2026-27', 'all'));
  assert(pdfEvents.some(event => event[1] === 'Leistungsübersicht'), 'Leistungsübersicht fehlt im PDF');
  assert(pdfEvents.some(event => event[1] === 'Spielwerte'), 'Spielwerte fehlen im PDF');
  assert(pdfEvents.some(event => event[1].includes('Sehr langer Beispielname')), 'Spielername wurde im PDF nicht vollständig ausgegeben');
  assert(pdfPages.some(page => page.orientation === 'portrait'), 'Wurfprofile werden nicht im Hochformat ausgegeben');
  ```

- [ ] **Step 2: Den Test vor der Umsetzung ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: FAIL, weil die derzeitige PDF-Erzeugung weder „Leistungsübersicht“ noch „Spielwerte“ schreibt und keine Hochformatseite anlegt.

- [ ] **Step 3: Den Test nach dem erwarteten Fehler stehen lassen**

  Der fehlende Berichtaufbau ist der genaue Red-Zustand für Task 2. Es wird kein Produktionscode geändert.

- [ ] **Step 4: Commit des Testvertrags erst zusammen mit Task 2 vorbereiten**

  Der Test und die Implementierung werden in einem fachlich zusammenhängenden Commit versioniert.

### Task 2: Lesbare Team- und Spielertabellen im Querformat

**Files:**
- Modify: `js/reports.js:365-552`
- Test: `scripts/smoke.mjs: PDF-Strukturtest aus Task 1`

**Interfaces:**
- Consumes: `report.seasonLabel`, `report.generatedAt`, `report.throughDate`, `report.team`, `report.teamCategories` und `report.players`.
- Produces: `buildPDF(doc, report)`, das die Titel „Leistungsübersicht“ und „Spielwerte“ mit jeweils einer eigenen Tabelle ausgibt.

- [ ] **Step 1: Den fehlschlagenden Test erneut ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: FAIL mit einer der Assertions „Leistungsübersicht fehlt im PDF“ oder „Spielwerte fehlen im PDF“.

- [ ] **Step 2: PDF-Helfer für Seitenmaße und Tabellenkopf ergänzen**

  In `js/reports.js` innerhalb von `buildPDF()` aktuelle Seitengröße bei jedem Seitenwechsel beziehen und die Tabellenzeichnung ohne Zeichenlimit gestalten.

  ```js
  function pageBox() {
    return { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight() };
  }

  function addLandscapePage(title) {
    doc.addPage('a4', 'landscape');
    header(title);
  }
  ```

  Die Tabellenfunktion nimmt Spaltenobjekte `{ label, width, align }` an, schreibt Überschriften nach jedem Seitenumbruch erneut und nutzt `doc.splitTextToSize()` für Namen statt `slice()`.

- [ ] **Step 3: Die bisherige Gesamttabelle durch zwei Tabellen ersetzen**

  Nach den Kennzahlen zuerst „Leistungsübersicht“ mit `Spieler`, `Anwesenheit`, `Training FG`, `Training FT`, `Spiele`, `PPG` zeichnen. Direkt danach „Spielwerte“ mit `Spieler`, `Spiel FG`, `Spiel FT`, `REB`, `AST`, `TO`, `Beep-Test` zeichnen. Zahlen rechtsbündig, Namen linksbündig setzen.

  ```js
  const performanceColumns = [
    { label: 'Spieler', width: 260, align: 'left' },
    { label: 'Anw.', width: 85, align: 'right' },
    { label: 'Training FG', width: 105, align: 'right' },
    { label: 'Training FT', width: 105, align: 'right' },
    { label: 'Spiele', width: 70, align: 'right' },
    { label: 'PPG', width: 75, align: 'right' }
  ];
  ```

- [ ] **Step 4: Den PDF-Strukturtest ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: PASS; der Stub enthält beide Tabellenüberschriften und den vollständigen langen Namen.

- [ ] **Step 5: Codequalität prüfen**

  Run: `git diff --check && node --check js/reports.js`

  Expected: Keine Ausgabe und Exit-Code 0.

### Task 3: Wurfprofile im Hochformat und vollständiger Dokumentabschluss

**Files:**
- Modify: `js/reports.js: PDF-Abschnitt nach den Spielertabellen`
- Test: `scripts/smoke.mjs: PDF-Strukturtest aus Task 1`

**Interfaces:**
- Consumes: `report.players[].player.name`, `report.players[].training.categories` und `report.players[].training.ft`.
- Produces: Hochformatseiten mit Wurfprofil-Karten, die nur bei mindestens einem Spieler erzeugt werden, sowie konsistente Fußzeilen auf Seiten beider Orientierungen.

- [ ] **Step 1: Einen zweiten fehlschlagenden Test für leeren Kader ergänzen**

  Einen Report mit `players: []` aus den realen Teamdaten ableiten und über denselben Stub exportieren. Prüfen, dass keine Seite mit dem Titel „Wurfprofile je Spieler“ angelegt wird.

  ```js
  const emptyReport = { ...reportForPdf, players: [] };
  const emptyPdf = createPdfStub();
  window.BT.reports.buildPDF(emptyPdf.doc, emptyReport);
  assert(!emptyPdf.events.some(event => event[1] === 'Wurfprofile je Spieler'), 'Leere Wurfprofil-Seite wurde erzeugt');
  ```

- [ ] **Step 2: Den leeren-Kader-Test ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: PASS mit der bestehenden Bedingung; falls der Test wegen fehlender Stub-Fabrik nicht läuft, den wiederverwendbaren Stub aus Task 1 als `createPdfStub()` extrahieren und erneut ausführen.

- [ ] **Step 3: Hochformat-Wurfprofile implementieren**

  Nur wenn `report.players.length > 0`, eine A4-Hochformatseite anlegen. Jede Karte erhält Namen, Wurfkategorien und Freiwurfquote; vor jeder Karte wird die aktuelle Seitenhöhe geprüft und bei Bedarf eine weitere Hochformatseite erstellt.

  ```js
  if (report.players.length) {
    doc.addPage('a4', 'portrait');
    header('Wurfprofile je Spieler');
    report.players.forEach(row => drawShotProfile(row));
  }
  ```

  `drawShotProfile(row)` zeichnet den Namen stets vollständig, bricht lange Kategorien mit `doc.splitTextToSize()` um und erhöht die Kartenhöhe anhand der resultierenden Zeilen.

- [ ] **Step 4: Fußzeilen an das aktuelle Seitenformat anpassen**

  Beim Durchlaufen aller Seiten vor jeder Fußzeile `doc.setPage(page)` und anschließend `doc.internal.pageSize.getWidth()` sowie `getHeight()` verwenden. So endet die Seitenzahl im Hochformat nicht außerhalb des Dokuments.

- [ ] **Step 5: Alle PDF- und Smoke-Tests ausführen**

  Run: `node scripts/smoke.mjs && npm test`

  Expected: Beide Befehle enden mit Exit-Code 0 und der bestehende UI-Smoke-Test bestätigt alle CourtHub-Bereiche.

- [ ] **Step 6: Implementierung committen**

  ```bash
  git add js/reports.js scripts/smoke.mjs docs/superpowers/plans/2026-08-03-report-pdf-redesign.md
  git commit -m "feat: redesign report PDF export"
  ```

## Self-Review

- **Spec coverage:** Task 2 deckt Deckblatt, Kennzahlen und die zwei lesbaren Querformat-Tabellen ab. Task 3 deckt Wurfprofile im Hochformat, keine leere Folgeseite und die Fußzeilen ab. CSV, Filter, Dateiname und mobile Teilen-Funktion bleiben durch die unveränderte `exportPDF()`-Hülle erhalten.
- **Placeholder scan:** Der Plan enthält keine offenen Arbeitspunkte, unbestimmten Fehlerbehandlungen oder Platzhalter.
- **Type consistency:** `buildPDF(doc, report)` bleibt der einzige Exportvertrag. Der Teststub erfüllt alle vom Bericht verwendeten jsPDF-Methoden und liefert pro Seite die über `doc.internal.pageSize` abgefragten Maße.
