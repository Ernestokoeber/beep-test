# Synchronisierung bei begrenztem Datenübertragungsvolumen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Umsetzung in diesem vorhandenen isolierten Worktree; abschließend eine unabhängige Gesamtprüfung.

**Goal:** Den unnötigen Transfer unveränderter Teamdaten verhindern und den bestätigten DBB.Scores-Spielbericht am Handy ohne Cloud-Abgleich importierbar machen.

**Architecture:** Bestehende Workspace-API um einen optionalen Versionsvergleich ergänzen. Erstzugriff und Rollenwechsel erhalten den vollständigen, rollenbereinigten Stand; unveränderte Prüfungen lesen nur Versionsmetadaten. Der vorhandene Spielbericht-Import lädt eine zweite geprüfte statische Vorlage.

**Tech Stack:** Bestehendes JavaScript, Node, PostgreSQL, JSDOM und Playwright; keine neuen Dienste oder Abhängigkeiten.

**Spec:** Nutzerauftrag in diesem Chat: Bericht und Spielerstatistik am Handy verfügbar machen; ausdrücklich im kostenlosen Neon-Tarif bleiben.

## Befund und Grenzen

Neon meldet `53000`: monatliches Datenübertragungskontingent überschritten. Konsole: 6,3 GB seit 1. Oktober, Abrechnungszeitraum bis 1. November 2026. Vercel-Protokolle bestätigen Fehler für authentifiziertes `/api/auth/me` sowie GET/PUT `/api/workspace`. Die bisherige Intervallprüfung liest alle 30 Sekunden das vollständige JSONB-Dokument. Kein Tarifwechsel, keine Zahlungsart, keine Migration und keine Datenlöschung. Eine Codeänderung setzt das verbrauchte Kontingent nicht zurück.

## Review Focus

- Kein vollständiges Workspace-JSON bei unveränderter Version aus PostgreSQL lesen.
- Erstzugriff, andere Organisation und andere Rolle dürfen keinen alten lokalen Snapshot als gültig voraussetzen.
- Lokale Änderungen und ausstehende Live-Ereignisse auch bei unveränderter Serverversion hochladen.
- Alte Clients, Konflikte und laufende Schreibvorgänge bleiben kompatibel; Versionsstände nicht zurücksetzen.
- Spielbericht enthält nur bestätigte Spieler und sichtbare Werte; unbekannte Statistik bleibt null.

## Tasks

- [x] Rote Endpoint- und Client-Reproduktionen für wiederholte große Workspace-Abfragen, Rollenwechsel und lokale Importänderungen schreiben.
- [x] `api/workspace.js`, `js/api.js`, `js/sync.js`: konditionaler, rollenabhängiger Versionsabgleich; reine Metadaten bei unverändertem Stand. Relevante Regressionen ausführen.
- [x] `api/_lib/http.js`: erschöpftes Datenbankkontingent als verständliche, wiederholbare 503-Antwort ausgeben; übrige Serverfehler unverändert lassen. Fehlervertrag testen.
- [x] Geprüfte Spielbericht-Vorlage aus den Nutzerbildern unter `data/published-game-reports/` aufnehmen. Vorhandenen Import in `js/games.js` datum-/teamgebunden erweitern und am Handy simuliert ohne Cloud testen.
- [x] Unabhängiger Review, vollständige Tests, Browserprüfung und PWA-Version 239.
- [ ] Veröffentlichen und aktuellen Sperrstatus ehrlich dokumentieren.

## Evidence

Originalbericht samt sechs Spielern, sechs Aufstellungen, Originalbildern und SHA-256-Belegen liegt unter `artifacts/dbb-scores-2026-10-17` im Hauptcheckout. Er wurde im aktuellen Produktionsbrowser gespeichert und nach Neuladen bestätigt. Kein gesicherter Cloud-Upload möglich, solange Neon gesperrt ist.

`npm test` vollständig bestanden. Neue Regression `scripts/sync-bandwidth-smoke.mjs`: unveränderte 1-MB-Dokumente lesen nur Metadaten; 30 unveränderte Client-Abfragen ohne weitere volle Downloads oder PUTs. Lokaler Bericht, Live-Journal, verspätete GET-Antwort, alter Client und Rollen-/Teamwechsel geprüft. Review fand den Rollenwechsel Viewer → Coach bei identischem Zeitstempel; vollständige Rollenübernahme korrigiert und per Regression abgesichert. Zwei bestehende Live-/Matchday-Testserver schreiben jetzt nach angenommenen PUTs auch ihre zuvor konstant auf 1 gesetzte GET-Version fort.

`node scripts/sync-report-browser.mjs` bestanden bei 320 und 390 Pixeln: echte Importoberfläche mit API-503, sechs Profile, Spielertrainer-Verknüpfung, 55 Punkte, 6/15 Freiwürfe, unveränderte Stammnummern/Notizen/Spielkennung, Persistenz nach Reload, Archivschutz, Rückweg und sichtbar fehlgeschlagener Cloud-Status. Screenshots im lokalen Temp-Ordner `courthub-sync-report`. Öffentliche Vorlage enthält keine lokalen Profil-IDs oder Originalbilder. Kostenpflichtiger Tarifdialog abgebrochen; Neon Billing zeigt weiterhin Free.
