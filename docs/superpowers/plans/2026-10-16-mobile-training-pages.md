# Trainingsbereich: eigene Seiten und mobile Bedienung

> Ausführung mit superpowers:executing-plans im aktuellen Chat. Fortsetzung des vom Nutzer freigegebenen App-Aufbaus; am 16.10.2026 ausdrücklich beauftragt: Trainings mit einem Klick öffnen, richtige Rückwege, übersichtliche Planung und Durchführung.

**Ziel:** Ein durchgängiger mobiler Weg Trainingsliste → Training → Plan/Übung beziehungsweise Durchführung.
**Architektur:** Bestehender Hash-Router und BT.navigation bleiben maßgeblich. BT.trainingPages verantwortet neue Übersichten, Plan und Übungsseiten. Die vorhandenen Erfassungsfunktionen bleiben in BT.training und werden jeweils als eigene Seite eingebunden. Training Live und Timer unterstützen zusätzlich das Einbetten als Seite.
**Technik:** JavaScript, HTML, CSS, JSDOM, Playwright. Keine neuen Abhängigkeiten oder Datenbankmigrationen.
**Spezifikation:** ../specs/2026-10-16-mobile-app-navigation-design.md

## Leitplanken

- Fünf feste Hauptbereiche bleiben sichtbar. Globaler Zurück-Button und Browser-Verlauf führen an den tatsächlichen Ausgangspunkt zurück.
- Kein Training beginnt durch Öffnen der Übersicht. Live-Uhren, Notizen, Bewertungen, Wurfvorgaben und vorhandene Daten bleiben erhalten.
- Teamtraining und Individualtraining bleiben getrennt.
- Deutsche Bezeichnungen, mindestens 44 Pixel große neue Bedienelemente, schmale Ansichten ab 320 Pixeln ohne Seitenüberlauf.
- Lokale Änderungen erfolgen im vorhandenen verwalteten Worktree auf codex/mobile-training-pages. Kein Produktionsdeployment in diesem Umsetzungsschritt.

## Gestaltung

Bestehende Gestaltung fortführen: Grün #005438, dunkles Grün #163b2e, Weiß #ffffff, Hintergrund #f3f6f5, Orange #e89a35 für Fortschritt und Fokus. Lokale Inter-Schrift. Linksbündige Trainingszeilen mit Datum und Schwerpunkt; im Plan ein zeitlich geordneter Ablauf; in der Durchführung eine große Uhr und eindeutige Hauptaktion. Informationen über Termin, Planung und Erfassung werden auf eigene Seiten verteilt.

## Dateien und Schnittstellen

- Neu: js/training-pages.js, training-pages.css. API renderList(target), renderNew(target), render(target, id, page, detail, query).
- Ändern: js/app.js (Routen), js/navigation.js (Elternpfade), js/training.js (einzelne Erfassungsseiten und Weiterleitungen), js/training-live.js und js/training-timer.js (Seitenmodus).
- index.html, sw.js und scripts/check.mjs binden neue Dateien ein.
- Tests: scripts/training-pages-smoke.mjs, scripts/training-pages-browser.mjs, betroffene bestehende Browserprüfungen.

## Prüfschwerpunkte

1. Direktlinks, mehrfach Zurück, Reload und erneutes Öffnen mit Listenfilter, Suchtext, Entwurf und Scrollposition.
2. Laufende Durchführung → Wurferfassung/Spielerprofil → Zurück; Zeit, Notiz und Bewertung bleiben erhalten.
3. Bestehende Pläne ohne Übungs-ID; Sortieren, Bearbeiten und Hinzufügen behalten richtige Übungszuordnung.
4. Leere/abgeschlossene/gelöschte Trainings, ungültige Adressen, lange Namen und bestehende Stationspläne.
5. Bestehende Erfassung, Timer, Vorlagen, Exporte, Rollen, Offline-Dateien und Individualtraining bleiben erreichbar.

## Aufgabe 1: Seitenhierarchie und Trainingsübersicht

- [x] Fehlende Trainingsseiten, sicheren Direktlink-Rückweg und Erhalt des Listenfilters als Tests nachweisen.
- [x] Übersicht, neues Training und Router implementieren; vorhandene Erfassungsansichten jeweils einzeln einbinden.
- [x] Klar beschriftete Links zu Planung, Anwesenheit, Messwerten, Termin/Trainerteam und Auswertung.

## Aufgabe 2: Plan und Übungen

- [x] Tests für gespeicherte Pläne, stabile Übungszuordnung, Entwürfe und Sortieren schreiben und rot sehen.
- [x] Plan als Zeitfolge mit eigener Übungsseite, eigener Bibliotheksauswahl und eigener Übungserstellung.
- [x] Vorhandene Wurfvorgaben, Varianten und KI-Hinweise erhalten. Bearbeitete Pläne weiter als manuell geschützt markieren.

## Aufgabe 3: Durchführung und mobile Gestaltung

- [x] Test für eigene Live-Adresse und laufende Uhr nach Rückweg/Reload schreiben und rot sehen.
- [x] Live-Modus und Timer als Seite einbinden; Uhr, nächste Übung, Bewertung und Notiz verständlich anordnen.
- [x] Mobile Screenshots prüfen; Bedienung und Überläufe bei 320, 390, 768 und 1440 Pixeln testen.

## Aufgabe 4: Prüfung und Abschluss

- [x] Gezielte Tests, bestehende Trainingsprüfungen und gesamte Testsuite ausführen.
- [x] Bestehende Browserprüfungen an tatsächliche neue Wege anpassen.
- [x] Ein unabhängiger Review des Gesamtdiffs; wichtige Befunde mit Regressionstest beheben.
- [x] Lokal auf dem Feature-Branch sichern und Vorschau bereitstellen.

## Entscheidungen und Fortschritt

- Basis 1eacfab: gesamte Testsuite und umfassender Browserlauf in dieser Sitzung bereits erfolgreich; identischer Stand ist produktiv.
- Der konkrete Fortsetzungsauftrag und die freigegebene Seitenspezifikation autorisieren die Umsetzung ohne erneute Designfreigabe.
- Vorhandene Erfassungsansichten behalten ihren gemeinsamen DOM-Kontext, damit Ereignishandler nach dem Seitenumbau gültig bleiben.

## Abnahme am 16.10.2026

- Neue JSDOM-Prüfung zunächst rot (Trainingsseiten fehlen), danach grün. Regressionen für historische Trainings und normalisierte Wurfkategorien ebenfalls zunächst reproduziert, anschließend behoben.
- npm test vollständig erfolgreich; letzter vollständiger Lauf protokolliert unter TEMP/courthub-training-final-test.log. Danach kleine Anpassung der Verwaltungsanordnung mit erneuter gezielter Browserprüfung und statischen Checks.
- training-pages-browser.mjs: 320, 390, 768 und 1440 Pixel; Bearbeiten, Reihenfolge, Entwürfe, Reload, Direktlinks, Rückwege, Live-Uhr, Notizen, Wurferfassung, Punkte und Dunkelmodus erfolgreich. Screenshots visuell kontrolliert unter TEMP/courthub-training-preview.
- navigation-browser.mjs einschließlich bestehender mobiler Coachingwege erfolgreich.
- training-instructions-browser.mjs: vollständige Anleitungen, fünf parallele Stationsrunden, Korbteilung und Offline-Neuladen auf iPhone und 320 Pixel erfolgreich.
- browser-e2e.mjs: alte Tab-Annahmen für Trainerteam und Stationen auf Seitenrouten umgestellt. Breiter Lauf prüfte Archiv, mobile Wege, Trainerteam, Desktop/Tablet/Taktik; eine fehlende Wartebedingung vor der Stationsseite wurde korrigiert. Anschließend E2E_TRAINING_ONLY=1 für Freitagstationen, Timer, Bewertung, Notiz, Reload und Abschluss auf beiden Handybreiten erfolgreich. Der vollständige Browserlauf wurde nach dieser Testkorrektur nicht nochmals gestartet.
- Unabhängiger Gesamtreview review_training_pages: zwei P2-Befunde (historische Trainingsklassifizierung, Schreibweisen von Wurfkategorien) durch Regressionstests abgesichert und behoben; keine weiteren belastbaren Funktionsbefunde. Dunkelmodus nachgebessert und geprüft.
- Plan-IDs sind additive Metadaten für stabile Übungslinks. Vorhandene Wurfziele und sonstige Übungsfelder bleiben bei Änderungen erhalten. KI-Pläne werden weiterhin als coach-edited geschützt.
- Erweiterte Vorgaben, Varianten und bestehende Planwerkzeuge bleiben auf einer getrennten Optionsseite erreichbar; Erfassung behält den bisherigen DOM-Kontext.
- Vorschau: http://127.0.0.1:4182/#/training. Kein Produktionsdeployment; keine echten Trainingsdaten durch Browserfixtures geändert. Ein physisches Handy wurde nicht getestet.