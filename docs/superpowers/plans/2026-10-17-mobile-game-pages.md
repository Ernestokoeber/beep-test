# Mobile Spielseiten

Grundlage: freigegebene mobile App-Navigation vom 16. Oktober. Basis `3bbf362`, Umsetzung im bestehenden Worktree auf `codex/mobile-game-pages`.

## Gestaltung und Verhalten

Die Spielübersicht führt mit einem Tipp zu einer eigenen Spielseite. Vorbereitung, Kader, Starting Five, Gameplan, Freigabe und Spielbegleitung erhalten eigene Adressen. Ein Spiel startet erst durch eine bewusste Freigabe; die Spieluhr startet separat. Ein laufendes Spiel bleibt beim Seitenwechsel erhalten.

Inter und die bestehende grüne App-Navigation bleiben die Grundlage: Text #163b2e, Primäraktion #005438, Fläche #ffffff, Hintergrund #f3f6f5, Akzent #e89a35. Die Spielpaarung mit Ergebnis bildet den visuellen Schwerpunkt. Darunter stehen direkte, beschriftete Zugänge zu den nächsten Aufgaben. Suchtext, Filter, Position und Formularentwürfe bleiben erhalten.

Vorhandene Spieltagscontroller, Journale und Erfassungsfunktionen bleiben die Quelle der Daten. Archivierte Spiele behalten ihre ausdrückliche Bearbeitungsfreigabe. Statistikwerte werden am Handy pro Spieler geöffnet; Tabellen bleiben für Exporte nutzbar. Gegnerinformationen, offizielle Termine, Atlas, Berichte und Folgetraining bleiben erreichbar.

## Aufgaben

- [x] Failing Browserregression für Liste, Spielseite, Vorbereitung, Live-Uhr und Rückwege.
- [x] Routenschicht und mobile Spielübersicht/-details mit dem bestehenden Spielmodul verbinden.
- [x] Vorbereitung über eigene Seiten navigieren; laufende Erfassung übersichtlich einbetten.
- [x] Browserprüfung 320/390/768/1440, Entwürfe, Archiv, Rollen und Dunkelmodus.
- [x] Bestehende relevante Tests, unabhängiger Gesamt-Review, lokale Sicherung.

## Entscheidungen

- Umsetzung setzt die freigegebene App-Struktur fort; keine erneute Konzeptfreigabe nötig.
- Kein Deployment in diesem Schritt. Vorheriger Live-Auftrag bezog sich auf Taktiken.
- Legacy-Renderfunktionen bleiben für bestehende Komponenten und deren Tests verfügbar. Die App verwendet die neuen Seiten.
- Seitenzustand darf ausschließlich den Navigationsschritt ändern; die laufende Spieluhr bleibt im bestehenden Ereignisjournal erhalten.

## Abschlussnachweise

- RED: neuer Browserablauf scheiterte zunächst am fehlenden eigenen Listenzustand. Anschließend alle eigenen Seiten und Rückwege grün.
- `npm test` vollständig bestanden. Relevante Fachprüfungen umfassen Archivschutz, Controller, Journale, Konflikte, Live-Erfassung, Exporte, Gegner-Scouting und die bestehende Navigation.
- `node scripts/game-pages-browser.mjs`: 320, 390, 768 und 1440 Pixel ohne horizontalen Überlauf bestanden. Ergänzte 390-Pixel-Prüfung nach den letzten Anpassungen erneut bestanden.
- Geprüft: Suche, direkte Spielauswahl, Kader-/Starting-Five-Seiten, Gameplan-Entwurf, bewusste Freigabe, separate Uhrbestätigung, laufende Uhr nach Rückweg und Reload, einzelne Spielerwerte, Metadatenentwurf, sichere Rückkehr nach direkter Neuanlage und gesperrtes Archiv nach Spielwechsel/Reload.
- Rollenprüfung: Viewer kann keine Notizen oder Spieldaten ändern; fehlender Spieltagszugang zeigt eine Anmeldeaktion. Archivfreigabe kann abgelehnt werden und gilt nach Bestätigung innerhalb eines Spiels über dessen Unterseiten hinweg.
- Unabhängiger Review: fehlender Einstieg zur Sitzungsauswahl bei mehreren Live-Erfassungen behoben und im Browser mit gültigen Sessions abgesichert. Der zunächst gefundene Export-Verlust ist über `preserveDetail` behoben; manuelle Spielauswertungen/Metriken werden geprüft. Archiv-/Edit-Verdacht wurde vom Reviewer im Browser verworfen.
- Bestehende Browserprüfungen für Spielarchiv, mobile Startseite, Gegnernotizen, Trainerteam, Editor, Screen-Akademie und Training bestanden. Der vollständige Lauf erreichte zunächst einen alten Matchday-Einstieg; nach Anpassung der Komponenten-Fixture bestanden Trainerteam und Matchday auf iPhone und 320 Pixeln (`E2E_MATCHDAY_ONLY=1`) einschließlich Abschluss und zwei Reloads.
- Ruling: Alte Komponentenprüfungen verwenden ausdrücklich die Legacy-Renderer; die neuen produktiven Routen werden separat durch `game-pages-browser.mjs` abgenommen. Der neue Seitentest ist im Browser-CI-Job eingebunden.
- PWA-Prüfung: 153 Cache-Dateien, Offline-Wiederherstellung und Versionswechsel bestanden. `git diff --check` und Syntaxprüfungen der geänderten Module bestanden.
- Visuelle Kontrolle von Spielübersicht, Vorbereitung, Spielerwerten, Live-Ansicht und Dunkelmodus anhand der Browser-Screenshots durchgeführt. Uhr bleibt in der Live-Ansicht erreichbar; die Hauptnavigation bleibt sichtbar.
- Vorschau: `http://127.0.0.1:4182/#/games`. Kein Push, Merge oder Deployment. Auf einem physischen Handy noch nicht geprüft.
