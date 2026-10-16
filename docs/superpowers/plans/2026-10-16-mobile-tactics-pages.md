# Mobile Taktikseiten

Grundlage: freigegebener Seitenaufbau aus `../specs/2026-10-16-mobile-app-navigation-design.md`.
Umsetzung im bestehenden Worktree, Branch `codex/mobile-tactics-pages`, Basis `ad6f37c`.

## Umfang und Entscheidungen

- Bibliothek unter `#/tactics`; Antippen öffnet `#/tactics/:id`.
- Bearbeitung unter `/:id/edit`, Wiedergabe unter `/:id/play`, neue Taktik unter `/new`.
- Gemeinsamer Zurück-Button und Browser-Verlauf; direkte Unterseiten haben einen hierarchischen Rückweg.
- Bibliothek behält Suche, Filter und Scrollposition. Benutzerbezogene Entwürfe bleiben pro Taktik erhalten.
- Bestehendes Datenmodell und Board-Werkzeuge weiterverwenden. Auf dem Handy: beschriftete Touch-Ziele, horizontale Phasenleiste, Spielfeld vor Details, sichtbares Speichern.
- Veröffentlichungen, Sammlungen, Export, Vorlagen, Papierkorb, Screen-Akademie und Videoimport bleiben erreichbar.
- Kein Deployment in diesem Umsetzungsschritt.

## Aufgaben und Nachweise

- [x] Regressionstest: Bibliothek → eigene Seite → Editor → Wiedergabe → Zurück; Direktlink und Entwürfe.
- [x] Routenseiten, Editor-Anbindung und mobile Gestaltung implementieren.
- [x] Browserprüfung bei 320, 390, 768 und 1440 Pixeln, Rollen, Dunkelmodus und Offline-Dateien prüfen.
- [x] Bestehende Tests ausführen; abschließender Review des gesamten Diffs; lokal committen.

## Protokoll

Pre-flight: Der Editor verwendet einen globalen Arbeitsentwurf. Die neue Routenschicht muss diesen beim Seitenwechsel mit einem benutzer- und taktikbezogenen Entwurf versorgen. Undo wird beim Wechsel der Taktik zurückgesetzt. Bestehende direkte Editor-Aufrufe bleiben kompatibel.

## Abschlussnachweise

- RED: neuer Browsertest scheiterte zunächst am fehlenden Bibliotheks-Einstieg. Der spätere Navigationstest scheiterte an der fehlenden Replacement-Funktion. Beide anschließend grün.
- `npm test`: vollständig bestanden, einschließlich bestehender Taktik-, Export-, Import-, Trainings- und Navigationstests. PWA-Prüfung: 151 Cache-Dateien, Offline-Wiederherstellung erfolgreich.
- `node scripts/tactics-pages-browser.mjs`: 320/390/768/1440 Pixel ohne horizontalen Überlauf; eigene Seiten, Suche, Zurück, Neuladen, getrennte Entwürfe, Wiedergabe und Dunkelmodus geprüft.
- Ergänzte 390-Pixel-Prüfung bestanden: echte Touch-Eingaben für Ballführer und Pass, zwei parallele Tabs, Duplikate, Rollenwechsel, Gastansicht, Direktaufruf vor dem Speichern, neuer Entwurf, Screen-Demo und verzögert geladener Videoimport.
- `scripts/browser-e2e.mjs` vollständig bestanden: Desktop, Tablet, iPhone, 320 Pixel, Editor/Drag-and-drop, Videoimport, Screen-Akademie, Trainerteam, Training und Spieltag.
- Ruling: Bestehende Editor-Komponententests montieren den wiederverwendbaren Vollbildeditor ausdrücklich. Die neuen produktiven Routen werden durch den zusätzlichen Seitentest geprüft. Der JSDOM-Shelltest verwendet weiter seinen vorhandenen Editor-Stub und wartet nun auf asynchrone Routenabschlüsse.
- Unabhängiger Review: vier reproduzierte Findings behoben und abgesichert (Mehrtab-Entwurf, Import-Rennen, echter Vorgänger beim Ersetzen einer Route, „Neues Play“ auf der Neuanlage).
- `git diff --check`: bestanden. Vorschau: `http://127.0.0.1:4182/#/tactics`.
- Auf echten Mobilgeräten noch nicht geprüft. Kein Push, Merge oder Deployment; Live-Stand bleibt unverändert.
