# Konsistenzprüfung vom 17. Oktober 2026

Auftrag: Bestehende mobile CourtHub-App als Ganzes prüfen und belegte Bestandsfehler beheben. Screenshot-Feedback und neue KI-Anbindungen bleiben verschoben.

## Befunde und Umsetzung

- Spielplansynchronisierung: verspätete Antworten nach Konto-, Organisations-, Rollen- oder Ansichtswechsel verwerfen.
- Trainingsseiten: Lesezugriff auch lokal einhalten, einschließlich direkter Unterseiten und synthetischer Eingaben. Lesendes Öffnen darf keine Trainingsdaten speichern.
- Gegnerübersicht: zukünftige Spiele mit vorläufigem Ergebnis nach derselben Statusregel wie die Startseite einordnen.
- Heute: Hinweise immer dem tatsächlich nächsten Termin zuordnen und zum passenden Briefing verlinken.
- Auswertung: Differenzen von Wurfquoten als Prozentpunkte anzeigen; Absagen, abgeschlossene Durchführung und lokalen Kalendertag konsistent behandeln.

## Nachweis

Gezielte rote Reproduktionen vor dem jeweiligen Fix, anschließend Regressionstests, vollständige Suite, mobile Browserabläufe und unabhängige Abschlussprüfung. Frontendversion für die Offline-App erhöhen. Erst nach erfolgreicher Prüfung veröffentlichen und Produktionsstand kontrollieren.

## Ausgangsstand

`eb5e545`: vollständiges `npm test` erneut erfolgreich. Unabhängige Bestandsprüfung bestätigt vier zusätzliche Fehler. Produktionsoberfläche lesend bei 390 × 844 geprüft; Heute und Trainingsübersicht ohne horizontalen Überlauf.

## Ergebnis der Korrekturen

Alle fünf Befundgruppen umgesetzt. Die Nachprüfung fand zusätzlich eine bereits geöffnete Live-Durchführung nach Rollenwechsel. Auch deren Aktionen, verzögerte Speicherung, `pagehide` und Schließen prüfen jetzt den beim Öffnen erfassten Sitzungskontext. Direkte schreibende Trainingsseiten sind für Viewer und Spieler gesperrt; reine Wurfkategorie- und Spielerfilter bleiben nutzbar. Beim lesenden Öffnen werden keine Übungsidentitäten persistiert.

- `scripts/consistency-audit-smoke.mjs`: zunächst rote Reproduktionen für Spielplanantwort, Viewer-Plan, zukünftiges 0:0, falsche Heute-Hinweise und Live-Rollenwechsel; anschließend grün. Spielplanschutz zusätzlich getrennt für Nutzer, Organisation, Rolle, Token und Ansichtswechsel geprüft; gültiger Import bleibt möglich.
- `scripts/stats-consistency-smoke.mjs`: zunächst falsche Quoteneinheit reproduziert; anschließend Prozentpunkte in Warnung, Trainingsquote und Spieleransicht, Absagen, Live-Abschluss und lokaler Tag erfolgreich geprüft.
- `npm run test:training:browser` und `npm run test:home:browser`: 320, 390, 768 und 1440 Pixel erfolgreich; Direktlinks, Rückwege, Entwürfe, Erfassung, Uhren, Dunkelmodus und Überlauf geprüft.
- `npm run test:consistency:browser`: 320 und 390 Pixel erfolgreich; lesender Plan/Übung/Wurfkategorie, Quotenanzeige, gesperrte Live-Durchführung, spielbezogene Hinweise und echter Rückweg. Screenshot der Auswertung bei 320 Pixeln visuell kontrolliert.
- Unabhängige Nachprüfung der korrigierten Live-Guards und Quoteneinheiten: keine verbleibenden Befunde im geprüften Umfang.
- Vollständiges `npm test` nach den ersten Fixes erfolgreich; abschließender Lauf mit sämtlichen Nachbesserungen ebenfalls erfolgreich (`courthub-consistency-audit-v236-tests.log`, Exit 0).

Testlogs und Bildschirmbelege: `%TEMP%/courthub-consistency-audit*`, `%TEMP%/courthub-training-preview`, `%TEMP%/courthub-home-preview`. Offline-Cache zuletzt auf `courthub-v238` erhöht.

Produktionskontrolle des ersten Fixstands erfolgreich. Dabei zusätzlich die feste Überschrift „Vor dem nächsten Training“ als unpassend für Spielhinweise erkannt, rot reproduziert und an den Termintyp gebunden. Erneut gezielt mit Home- und Konsistenzprüfungen abgesichert.

Keine neuen Anbieter angebunden, keine kostenpflichtige KI-Recherche gestartet und keine produktiven Trainings- oder Spielinhalte geändert. Physisches Smartphone und Qualität neuer Live-KI-Antworten bleiben außerhalb dieser Prüfung.
