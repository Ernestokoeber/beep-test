# Gemeinsame Individualeinheit Implementation Plan

> Umsetzung in dieser Sitzung durch den Hauptagenten. Die fachliche Freigabe und der Umsetzungsauftrag liegen im Chat vor.

**Goal:** Eine gemeinsame Live-Einheit für höchstens zwei Spieler mit individueller Dokumentation.

**Architecture:** Ein eigener Live-Renderer verwendet vorhandene gemeinsame Sessions, persönliche Pläne und Messdefinitionen. Der Server erhält Start und atomaren, wiederholbaren Liveabschluss ohne Datenbankmigration.

**Tech Stack:** Vanilla JavaScript, vorhandene Node-API und PostgreSQL, JSDOM und Playwright.

**Spec:** `docs/superpowers/specs/2026-10-19-shared-individual-session-design.md`

## Global Constraints

- Maximal zwei Teilnehmer; gleiche Session-ID verbindet die persönlichen Datensätze.
- Keine persönlichen Werte anderer Spieler in der Spielerantwort.
- Privater Coachzustand bleibt kontogebunden und beim Fehler erhalten.

## Review Focus

- Einstieg über Adnan nimmt denselben Zustand wie über Thomas auf.
- Absage/Fehlzeit erzeugt keine fiktiven Trainingswerte.
- Unterschiedliche Übungen werden anhand der Position und je eigener Übungs-ID dokumentiert.
- Netzwerkfehler oder Doppelklick dupliziert keinen Abschluss.
- Routenwechsel beendet alte Timer und schützt noch nicht gesendete Eingaben.

### Task 1: Gemeinsamer Serverabschluss

Files: `api/_handlers/individual/manage.js`, `scripts/individual-shared-session-api-smoke.mjs`.

Interfaces: `startSession({profileId,sessionId})`, `completeLiveSession({profileId,sessionId,documents:[{profileId,exercises:[{exerciseId,seconds,rating,note}]}]})` über die vorhandene Action-API.

- [x] Fehlende Start-/Abschlussaktionen mit fehlschlagenden Verhaltenstests belegen.
- [x] Session sperren, alle Teilnehmer und Übungszuordnungen validieren, Dokumentation und Abschluss atomar speichern; Wiederholung liefert vorhandenen Abschluss.
- [x] API-Tests ausführen.

### Task 2: Gemeinsame Liveoberfläche

Files: `js/individual-live.js`, `js/individual-training.js`, `individual-training.css`, `index.html`, `sw.js`, `scripts/check.mjs`, `package.json`, `scripts/individual-shared-session-smoke.mjs`.

Interfaces: `BT.individualLive.render({target,profile,data,session,fallbackExercises,helpers})`, `BT.individualLive.cleanup()`.

- [x] Zweierablauf, Isolation, Profilwechsel, Pause, Fehlererhalt und Absage zunächst als fehlschlagende JSDOM-Tests schreiben.
- [x] Persönliche Übungsspuren und gemeinsamen Zustand implementieren und vorhandenen Start anbinden.
- [x] Desktop/Tablet/Smartphone darstellen, Cache und Prüfregistrierung aktualisieren.
- [x] Neue Tests, Individualregression und Syntaxprüfung ausführen; Browseransichten visuell prüfen.

### Task 3: Abschlussprüfung

- [x] Dokumentation um gemeinsamen Liveablauf ergänzen.
- [x] Gesamtsuite ausführen und Diff unabhängig prüfen.
- [x] Änderungen samt Nachweisen übergeben; keine Veröffentlichung ohne Auftrag.

## Ergebnis und Nachweise

- Umsetzung auf `codex/shared-individual-session` ausgehend von `659a1a5`; keine Produktionsänderung oder Datenmigration.
- `npm test`: Exitcode 0, einschließlich Individualfunktionen, KI, Mannschaftstraining, Navigation und PWA.
- Neue API- und Liveansichttests: Exitcode 0 auch nach den abschließenden Korrekturen.
- `node scripts/individual-shared-session-browser.mjs`: Exitcode 0 bei 1440, 1024 und 390 Pixeln, einschließlich Eingaben und gemeinsamem Abschluss. Screenshots visuell auf Tablet und Smartphone geprüft.
- `git diff --check`: ohne Befund.
- Unabhängige Codeprüfung: vier konkrete UI-Befunde (laufende Messanfrage, nachgeholte Übungen, letzter Block und Zeitkorrektur) behoben und mit Verhaltenstests abgesichert. Keine neue serverseitige Atomaritäts- oder Wiederholbarkeitslücke gefunden.
- Bestehende allgemeine Coach-Rechte und gleichzeitige Bedienung auf mehreren Geräten wurden nicht geändert. Die gemeinsamen Uhren und Offlineentwürfe sind wie bisher lokal an das Coachgerät gebunden.
- Die Gesamtsuite protokolliert bei einigen bestehenden Browser-Smoketests eine abgefangene Warnung zum relativen Import von `published-report-delivery.mjs`; alle Testbefehle endeten erfolgreich.
