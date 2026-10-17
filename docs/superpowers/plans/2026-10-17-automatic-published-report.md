# Automatische Auslieferung des bestätigten Spielberichts

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Umsetzung im vorhandenen isolierten Worktree, ein unabhängiger Gesamt-Review vor Veröffentlichung.

**Goal:** Beim Öffnen von CourtHub den bestätigten Bericht vom 17.10.2026 einschließlich sechs Spielerstatistiken ohne manuellen Import und unabhängig von Neon übernehmen.

**Architecture:** Ein kleiner Auslieferungscontroller lädt die bereits öffentliche statische Datei. Der bestehende Validator ordnet genau ein vorhandenes Spiel und eindeutige Spielerprofile zu. Start, Rückkehr in die App und abgeschlossener Cloud-Abgleich stoßen die Prüfung an; vorhandene Berichte werden nicht überschrieben. Das lokale Supplement verändert keinen globalen Sync-Zeitstempel und löst keinen Workspace-Upload aus.

**Tech Stack:** Vorhandenes JavaScript/ES-Module, lokale CourtHub-Speicherung, JSDOM/Playwright; keine neuen Dienste, Abhängigkeiten oder Tarife.

**Spec:** Im Chat bestätigter Vorschlag und ausdrücklicher Umsetzungs-/Veröffentlichungsauftrag vom 17.10.2026.

## Global Constraints

- Kostenlosen Neon-Tarif beibehalten; keine Migration, externe KI oder kostenpflichtigen Aufrufe.
- Nur die bereits bestätigte öffentliche Datei für Wasserburg/Günzburg–Lindau vom 17.10.2026 automatisch ausliefern.
- Keine Spiele/Spieler automatisch anlegen; keine Zuordnung über Nummern oder gerätespezifische IDs.
- Bestehende Notizen, Vorbereitung, Live-Journal, manuelle Videowerte und Stammnummern erhalten. Vor Ersetzung bekannter DBB-Werte vorherigen Boxscore/Ergebnis lokal als Importbeleg sichern.
- Einen vorhandenen veröffentlichten Bericht unangetastet lassen. Cloud-Sperre bleibt separat sichtbar.

## Review Focus

- Konto-/Teamwechsel oder lokale Änderungen während einer laufenden Dateianfrage dürfen keine falschen Daten verändern.
- Fehlende/mehrdeutige Profile, doppelte Termine, falsche Quelldaten und Schreibfehler führen zu keiner Teilübernahme.
- Erfolg erst nach dauerhaftem Speichern melden; kein Cloud-Erfolg durch statische Dateiauslieferung.
- Wiederholtes Öffnen/Foreground und erneuter Cloud-Stand führen nicht zu Duplikaten oder einer Upload-Schleife.
- Kein unnötiger Download für andere Spiele oder bereits importierte Berichte; Route und Entwürfe bleiben benutzbar.

## Umsetzung

- [x] `scripts/published-report-delivery-smoke.mjs`: rote Tests für Übernahme, Schutz, Fehler, Idempotenz und Scope-/Netzwerk-Rennen schreiben und ausführen.
- [x] `js/published-report-delivery.mjs`: `createPublishedReportDelivery({storage,fetchReport,getContext})` mit `run()`; ein erlaubter Termin, bestehender Validator, aktueller Snapshot erst nach Download, atomisches Save mit fromSync/preserveTimestamp und Ergebnis `{imported,errors}`.
- [x] `js/app.js`: dynamischer Import beim Start unabhängig vom Erfolg von `BT.sync.init`; Wiederholung nach Cloud-Abgleich, Online und Sichtbarwerden, keine Neuinitialisierung aktiver Eingaben/Live-Erfassung.
- [x] PWA-Cache 240 und neues Modul aufnehmen; Smoke-Test in npm test eintragen.
- [x] Echter Browserablauf 320/390 px mit zwei getrennten Geräten und API-503: ausschließlich öffnen, automatisch sechs Statistiken, Reload/offline, vorhandene manuelle Werte und Rückweg; Netzwerk-/Speicherfehler prüfen.
- [x] Gesamt-Review und npm test.
- [ ] Veröffentlichung und Prüfung der Produktionsdateien/Live-Ansicht (Release-Schritt nach diesem Code-Checkpoint).

## Entscheidungen

Ruling: Die vorhandene statische Veröffentlichung ist bereits autorisiert. Der neue Weg verteilt nur diesen geprüften Bericht; die Datenbank-Sperre und der allgemeine Zwei-Wege-Abgleich werden dadurch nicht als behoben dargestellt.

Ruling: Während offener Spiel-Editorseiten wird nichts übernommen. Der Controller prüft `canApply` vor der Anfrage und erneut nach Fetch/Flush; nach abgeschlossener Navigation wird die Prüfung nachgeholt. Damit bleiben auch bereits im UI gehaltene Boxscore-Objekte geschützt. Die zugehörige Regression wurde zuerst rot und anschließend grün ausgeführt.

Nachweise vor Release: vollständiges `npm test` Exit 0, Modul-Smoke, bestehender manueller Import-Browsertest sowie neuer automatischer Browsertest 320/390 px bestanden. Frischer Review und Nachprüfung freigegeben. Der neue Browserfall prüft zwei unabhängige Profile mit unterschiedlichen lokalen Spieler-IDs, API-503, Online-Wiederholung, Boxscore-Änderung 7→8 Rebounds während zurückgestellter Übernahme, bekannte DBB-Punkte/Zeiten/Freiwürfe, unveränderte Stammnummern/Notizen, Reload und Rückweg. JSDOM-Tests mit direktem Script-Eval können die optionale ESM-Datei nicht relativ auflösen; dies bleibt ein aufgefangener Hinweis im Test-Harness, die echte Modulauflösung ist durch Browserprüfungen abgedeckt.
