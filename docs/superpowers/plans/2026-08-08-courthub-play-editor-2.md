# CourtHub Play Editor 2.0 – Umsetzungsplan

**Ziel:** Den bestehenden Phasenrekorder in einen fokussierten, responsiven 2D-Play-Editor mit Phasenleiste, Aktions-Timeline, Traineranweisungen, Vorschau, Animation, gemeinsamem Exportdialog und ausgebauter Taktikbibliothek überführen.

**Grundsatz:** Die vorhandene `steps`-/`transition`-Engine bleibt erhalten. Alte Plays werden beim Öffnen nur im Arbeitsspeicher normalisiert und erst beim bewussten Speichern im erweiterten Format persistiert. PDF- und GIF-Export bleiben während des Umbaus funktionsfähig.

**UI-Referenz:** CoachCanvas ist für Layout, visuelle Dichte und Bedienfluss verbindlich. Die Umsetzung folgt der hellen Vollbildstruktur mit weißer Symbolleiste, schmaler Phasenleiste, pastellfarbenem Court und rechter Timeline möglichst genau, verwendet aber ausschließlich CourtHub-Code, CourtHub-Daten und eigene SVG-Assets.

**Technik:** Vanilla JavaScript ES-Module, SVG-Halbfeld, bestehender CourtHub-Speicher und Workspace-Sync, Node-Smoke-Tests, JSDOM und Browser-E2E.

## Verbindliche Grenzen

- Ausschließlich festes 2D-Halbfeld aus der Vogelperspektive.
- Angriff: nummerierter Kreis; Mannverteidigung: X; Zonenverteidigung: Raute mit X-Kennung.
- Verteidigungsart wird pro Verteidiger gespeichert; Mischformen bleiben möglich.
- Farben sind nie das einzige Unterscheidungsmerkmal.
- Keine 3D-Kamera, keine 3D-Spielermodelle und kein Videoexport als Release-Blocker.
- Keine automatische KI-Erzeugung kompletter Plays.
- Touch-Ziele mindestens 44 Pixel; Kernabläufe funktionieren mit Maus, Touch und Tastatur.

---

## Arbeitspaket 1: Datenmodell und verlustfreie Migration

**Dateien:**

- `js/tactics.js`
- `js/play-designer/phase-recorder-core.js`
- `scripts/play-editor-2-model-smoke.mjs`
- `package.json`

**Test zuerst:**

- Altes Board ohne `instruction` und `defenseMode` normalisieren.
- Geometrie, IDs, Aktionen und Timing unverändert erhalten.
- `instruction: ""` pro Phase ergänzen.
- `defenseMode: "man"` nur für alte Verteidiger ergänzen.
- Gemischte Mann-/Zonenverteidigung über Folgephasen erhalten.
- Tags, Archiv- und Veröffentlichungsstatus erhalten.

**Implementierung:**

- Normalisierer um additive Felder erweitern.
- Schema-Version erhöhen, ohne alte Strukturen abzulehnen.
- Klon-, Reorder- und Folgeschrittlogik um neue Felder ergänzen.
- Speichern bleibt eine bewusste Benutzeraktion.

**Abnahme:** `node scripts/play-editor-2-model-smoke.mjs`

## Arbeitspaket 2: Einheitliche 2D-Spielfeldsprache

**Dateien:**

- `js/play-designer/rendering.js`
- `js/play-designer/court-stage.js`
- `scripts/play-editor-2-rendering-smoke.mjs`
- bestehende Renderer-/Export-Smoke-Tests

**Test zuerst:**

- SVG meldet ein zweidimensionales Halbfeld und keine perspektivische Darstellung.
- Angriffsspieler werden als nummerierte Kreise gerendert.
- Mannverteidiger werden als X, Zonenverteidiger als Raute mit X-Kennung gerendert.
- Lauf, Dribbling, Pass und Screen besitzen unterschiedliche Formen/Stricharten.
- Editor, Vorschau und Export verwenden denselben Renderer.

**Implementierung:**

- Perspektivprojektion durch eine lineare 2D-Abbildung ersetzen.
- Flachen pastellfarbenen Court mit weißen Linien und zurückhaltenden Schatten wie in der Referenz umsetzen.
- Token-Renderer nach `defenseMode` differenzieren.
- Dribbling als visuell strukturierte Linie, Pass gestrichelt, Lauf durchgezogen und Screen als T darstellen.

**Abnahme:** Rendering-, Court-, PDF- und GIF-Smoke-Tests sind grün.

## Arbeitspaket 3: Fokus-Editor und modulare Hülle

**Dateien:**

- `js/play-designer/editor-shell.js`
- `js/play-designer/editor-toolbar.js`
- `js/play-designer/phase-rail.js`
- `js/play-designer/court-stage.js`
- `js/play-designer/action-timeline.js`
- `js/play-designer/phase-instructions.js`
- `js/play-designer/quick-editor.js`
- `js/play-designer/quick-styles.js`
- `scripts/play-editor-2-shell-smoke.mjs`

**Test zuerst:**

- Vollbildhülle mit Zurück, Playname, Hauptwerkzeugen, Undo/Redo, Wiedergabe, Export und Vorschau.
- Linke Phasenleiste enthält echte Spielfeld-Thumbnails und klaren Aktivzustand.
- Rechte Seitenleiste enthält Timeline und Anweisungen.
- Traineranweisung wird phasenbezogen gespeichert und wieder geladen.
- Verteidigungsart kann pro Verteidiger geändert werden.
- Desktop, Tablet und Smartphone besitzen die vereinbarten Layoutbereiche.

**Implementierung:**

- Bestehende Engine und Gestenadapter weiterverwenden.
- UI-Zustände aus dem bisherigen großen Schnellmodus in kleine Module auslagern.
- Phasennavigation, Einfügen, Duplizieren, Löschen und Reorder über eine gemeinsame API führen.
- Timeline gruppiert gleichzeitige Aktionen und Pick-and-Roll-Teilaktionen.
- Autosave-/Speicherstatus sichtbar anzeigen.

**Abnahme:** Shell-, Phasenrekorder-, Pointer- und Reorder-Tests sind grün.

## Arbeitspaket 4: Playbook-Vorschau und Animationsplayer

**Dateien:**

- `js/play-designer/play-preview.js`
- `js/play-designer/animation-player.js`
- `scripts/play-editor-2-preview-smoke.mjs`

**Test zuerst:**

- Vorschau ist nicht bearbeitbar und zeigt Titel, Beschreibung, fortlaufende Phasen, Diagramme und Anweisungen.
- Mobil werden Diagramm und Text einspaltig angeordnet.
- Player zeigt Play/Pause, Reset, Zeit, Fortschritt und 0,5x/1x/1,5x.
- Phasengrenzen erscheinen auf dem Fortschrittsregler.
- Gleichzeitige Aktionen starten zusammen; nächste Phase wartet auf die längste Aktion.
- `prefers-reduced-motion` wird respektiert.

**Implementierung:**

- Vorschau und Player verwenden ausschließlich normalisierte Boards und den gemeinsamen 2D-Renderer.
- Dialoge erhalten Fokusmanagement und Escape-Unterstützung.

**Abnahme:** Preview-/Animation-Smoke-Test sowie bestehende Timing-Tests sind grün.

## Arbeitspaket 5: Gemeinsamer Exportdialog

**Dateien:**

- `js/play-designer/export-dialog.js`
- `js/play-designer/exports.js`
- `js/play-designer/pdf-writer.js`
- `scripts/play-editor-2-export-smoke.mjs`

**Test zuerst:**

- Dialog bündelt PDF, Bild und GIF; Video ist sichtbar als spätere Ausbaustufe und nicht auswählbar.
- PDF unterstützt Diagramm/Text, Raster, nur Diagramme und Schwarz-Weiß.
- Bild unterstützt einzelne Phase oder Übersicht, Reihe/Raster, optionale Texte und Außenabstand.
- Fehler verändern das Play nicht.

**Implementierung:**

- Vorhandene PDF-/GIF-Funktionen als kompatible Standardpfade erhalten.
- Konfigurierbaren Snapshot-/Übersichtsexport ergänzen.
- Exportoptionen validieren, bevor Rendering beginnt.

**Abnahme:** Neuer Export-Smoke-Test und bestehende PDF-/GIF-Regressionstests sind grün.

## Arbeitspaket 6: Taktikbibliothek und Playbooks

**Dateien:**

- `js/play-designer/play-library.js`
- `js/play-designer/quick-workflow.js`
- `scripts/play-editor-2-library-smoke.mjs`

**Test zuerst:**

- Suche über Titel, Kategorie und Beschreibung.
- Filterchips für Mann-Offense, Zone-Offense, Pick & Roll, Horns, Einwurf und Press Break.
- Sortierung nach zuletzt geändert, Titel und Kategorie.
- Kartenaktionen für Öffnen, Duplizieren, Archivieren und Veröffentlichen.
- Playbook-Sammlungen speichern Play-IDs ohne Board-Duplikate.

**Implementierung:**

- Bestehende Storage-API nutzen und optionale Tags/Archivfelder ergänzen.
- Bibliothek als eigener Einstiegspunkt innerhalb des Editor-Workflows bereitstellen.
- Spieleransicht weiterhin ausschließlich für veröffentlichte Plays öffnen.

**Abnahme:** Library-Smoke-Test und Workspace-Smoke-Test sind grün.

## Arbeitspaket 7: PWA, Accessibility und Browser-Abnahme

**Dateien:**

- `sw.js`
- `scripts/browser-e2e.mjs`
- `.github/workflows/test.yml`
- gegebenenfalls responsive Styles der neuen Module

**Test zuerst:**

- Vollständiges Play auf Desktop mit Tastatur/Maus erstellen, speichern, schließen und erneut öffnen.
- Derselbe Kernablauf auf iPhone-Größe mit Touch-Pointerevents.
- Keine wesentlichen Überlappungen auf 390 px, 768 px und Desktop.
- Werkzeugnamen, Tooltips, Fokuszustände, Tabs und Verteidigungsarten sind zugänglich benannt.
- Offline werden nur vorhandene Daten angezeigt; keine fehlgeschlagene Mutation wird als gespeichert dargestellt.

**Implementierung:**

- Service-Worker-Version erhöhen und neue Module cachen.
- Fokusfallen, Escape und Wiederherstellung des Ausgangsfokus ergänzen.
- Touch- und Safe-Area-Abstände finalisieren.

**Endabnahme:**

```bash
npm test
node scripts/browser-e2e.mjs
```

Alle vorhandenen und neuen Tests müssen ohne Fehler durchlaufen. Erst danach werden Änderungen committed und auf `main` veröffentlicht.
