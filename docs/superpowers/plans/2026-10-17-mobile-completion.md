# CourtHub: mobile Abläufe vervollständigen

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Umsetzung inline, abschließend unabhängiger Review.

**Goal:** Die vereinbarten mobilen Bedienregeln auf die verbleibenden Bibliotheks- und Scoutingdetails übertragen und die gesamte bestehende App regressionsprüfen.
**Architecture:** Bestehende Vanilla-JavaScript-PWA und zentrale Hash-Navigation bleiben bestehen. Ein gemeinsames Bibliotheksmodul übernimmt Übungen und Notizen; Gegnerspieler werden aus vorhandenen Belegen lesend zusammengeführt.
**Tech Stack:** JavaScript, HTML/CSS, JSDOM, Playwright, bestehende Vercel-Bereitstellung.
**Spec:** `docs/superpowers/specs/2026-10-16-mobile-app-navigation-design.md`; Nutzerauftrag vom 17.10.: selbstständig auf Basis der bisherigen Arbeit weiterbauen, neue API erst später.

## Global Constraints

- Eigene Seiten und echte Rückwege, einschließlich Direktaufruf und Neuladen.
- Suche, Filter, Position und Bearbeitungsentwürfe nach Nutzer und Arbeitsbereich getrennt erhalten.
- Keine neue Anbieteranbindung, kein API-Schlüssel, keine kostenpflichtige Live-Recherche in diesem Auftrag.
- Vorhandene Rollen, gespeicherte Trainings, Spieluhren, Taktiken und Synchronisierung erhalten.
- Deutsche Trainersprache, mindestens 44 px große Touchziele, kein unbeabsichtigter horizontaler Überlauf.
- Vorhandene Vereinsfarben und Schrift beibehalten. Lesende Ansichten zuerst; Formulare erst auf Bearbeitungsseiten.

## Review Focus

- Ein gescheiterter oder schneller Seitenwechsel darf keine verspäteten Änderungen im anderen Nutzerkonto speichern.
- Löschen und anschließende verzögerte Speicherung dürfen gelöschte Notizen/Übungen nicht wiederherstellen.
- Ein Nachname oder eine Namensüberschneidung belegt keine Personenidentität oder durchgehende Vereinszugehörigkeit.
- Alte Saison und Teilbericht dürfen nicht als aktuelles vollständiges Scouting erscheinen.
- Ein Direktaufruf einer verschachtelten Spieler-/Bearbeitungsseite führt schrittweise zur fachlichen Übersicht zurück.

### Task 1: Übungsbibliothek und Trainernotizen

**Files:** `js/library-pages.js`, `js/drills.js`, `js/notes.js`, `js/app.js`, `js/navigation.js`, `index.html`, `library-pages.css`, `scripts/library-pages-smoke.mjs`.
**Interfaces:** `BT.libraryPages.render(target, kind, path)` mit kind `drills`/`notes`; vorhandener `BT.drills.openPicker` bleibt erhalten. CRUD über vorhandenen Storage.

- [ ] Verhaltenstest schreiben: alle Kategorien sichtbar, Suchzustand erhalten, lesendes Detail, separate Bearbeitung, neuer Entwurf ohne Datensatz, explizites Speichern, Entwurf nach Neuladen, Rollenprüfung, kein verspätetes Speichern nach Nutzerwechsel/Löschen.
- [ ] `node scripts/library-pages-smoke.mjs` rot beobachten.
- [ ] Gemeinsame Seitenliste/Detail/Bearbeitung und Übungsimport als eigene Seite implementieren. Taktiknotizen samt Taktikboard-Zugang erhalten. Filter auch im Trainingspicker mit „Alle Kategorien“ beginnen lassen.
- [ ] Test grün; `npm run test:navigation`; commit.

### Task 2: Scouting verdichten und Gegnerspieler öffnen

**Files:** `js/scouting-model.js`, `js/scouting-pages.js`, `js/navigation.js`, `scouting-pages.css`, `scripts/scouting-pages-smoke.mjs`.
**Interfaces:** `BT.scoutingModel.players(row)` liefert nur vorhandene Namen mit getrennten Verbandsbelegen, manuellen Werten und KI-Historie; keine neue Recherche. Route `/opponents/:id/player/:name`.

- [ ] Tests schreiben: Name aus direktem Bericht ohne KI-Historie öffnet eigene Seite; Jugend-only-Spieler nicht zum Herren erklären; saisonfremde Berichte kennzeichnen; Teilbericht klar benennen; neue Anfrage übernimmt Hinweise genau einmal und ignoriert Ergebnis nach Kontextwechsel.
- [ ] Tests rot beobachten.
- [ ] Kaderübersicht mit Suche und einzelnen Spielerprofilen; kompakter Teambezug, datierte Spielberichte auf Spielerprofil, getrennte Herkunft/Statistik/Offenfragen. KI mit Quellenverknüpfung als KI-Angabe statt direkt geprüft kennzeichnen. Generischer Hinweis, dass Quelle nicht gleich inhaltliche Bestätigung ist; keine Sonderregel für Wasserburg.
- [ ] `npm run test:scouting` grün; commit.

### Task 3: Gesamtabnahme und Bereitstellung

**Files:** `scripts/library-pages-browser.mjs`, vorhandene Browserprüfungen, `package.json`, `scripts/check.mjs`, `sw.js`, dieser Plan.
**Interfaces:** bestehende Browsermatrizen 320/390/768/1440 px; Offline-Cache mit allen neuen Assets.

- [ ] Browserprüfung für Liste → Detail → Bearbeiten → Zurück, Direktaufruf, Entwurf, mobilen Import und Gegnerspieler ergänzen und ausführen.
- [ ] `npm test` und sämtliche vorhandenen mobilen Bereichsprüfungen ausführen; echte Offline-PWA prüfen. Tatsächlich gefundene Fehler gezielt reproduzieren und beheben.
- [ ] Unabhängiger Review des gesamten Changesets, wichtige Funde beheben, Nachprüfung.
- [ ] PWA-Version erhöhen, Tests und `git diff --check` grün. Fast-forward auf main und Bereitstellung prüfen; Ergebnis im Nutzerbrowser ohne Datenänderung kontrollieren und Screenshots sichern.

## Abgrenzung der Fertigstellung

Die Abnahme betrifft die vorhandenen mobilen Arbeitsabläufe. GPT-Vergleich, neue Recherchequalität durch einen anderen Anbieter und eine Prüfung auf dem physischen Nutzerhandy bleiben ausdrücklich offen. Ein vollständig automatisches Durchsuchen sämtlicher öffentlicher Datenbanken wird nicht versprochen.
