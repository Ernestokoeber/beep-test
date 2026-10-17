# Mobile Statistik und Auswertung

Auftrag: Team- und Spielerentwicklung am Handy sofort sehen und Details mit einem Tipp auf eigener Seite öffnen. Fortsetzung des bestätigten mobilen App-Aufbaus.

1. Lesendes Entwicklungsmodell: Saisonfilter, Teilnahme/Freiwürfe/Feldwürfe, Team und Spieler. Vergleich der letzten drei erfassten abgeschlossenen Trainings mit drei davor; fehlende Werte nicht als null interpretieren. Würfe gewichtet nach Versuchen, Prozentpunkte korrekt benennen. Vergleich erst bei ausreichender Basis, keine pauschale Leistungsnote.
2. Statistik-Startseite mit Teamkarten und durchsuchbarer Spielerliste; eigene Team-/Spieler-/Kennzahlseiten mit Zeitraum, Datenbasis und direkten Quellen. Bestehende Spielerprofile und Entwicklungsziele erreichbar.
3. Auswertungsstartseite mit eigenen Trainings-, Spiel- und Spielerlisten. Bestehenden vollständigen Bericht/PDF/CSV unter eigener Seite erhalten; Saison und Person beim Öffnen übergeben. Abgesagte/laufende/zukünftige Spiele nicht als abgeschlossene Spiele zählen.
4. Echter Verlauf und Elternfallback, Such-/Saisonauswahl erhalten; Sync-/Visibility-Aktualisierung und Cleanup. Offline-Dateien aktualisieren. Tests rot/grün für Vergleich und Datenerhalt, Browser bei 320/390/768/1440 px, Dunkelmodus und bestehende Wege; unabhängiger Gesamtreview.

## Entscheidungen und Nachweise

- Wiederverwendeter Worktree, neuer Branch ab `a026547`.
- Die Detailseiten nennen Trainingsdaten als Quelle des Trends. Trainings- und Spielwurfwerte werden nicht vermischt.
- Drei Messungen pro Fenster, zusätzlich mindestens zehn Wurfversuche pro Fenster für Wurfvergleiche. Weniger Daten bleiben als Werte sichtbar, ohne Trendbehauptung.
- Historische Teamdaten einschließlich inzwischen archivierter Spieler bleiben enthalten; die Spielerliste zeigt standardmäßig den aktiven Kader mit optionalem Archivfilter.
- Umsetzung lokal; Veröffentlichung separat auf Auftrag.
- Status: Lokal umgesetzt; Veröffentlichung steht separat aus.
- Modelltests zunächst rot (fehlendes Modell; anschließend Zukunft/Absage und Trainer-Wurfwerte im vollständigen Bericht), nach Korrektur grün. CSV-/PDF-Berechnungen verwenden denselben bereinigten Terminbestand.
- Unabhängiger Gesamt-Review fand zwei Saisonfehler: Query-Saison ging beim Rankings-Link verloren; reine Spiel-Saison fehlte beim Bericht. Beide mit echtem UI in JSDOM reproduziert und rot/grün korrigiert. Ranglisten verwenden einen synchronen lesenden Saisonkontext; getSeasons berücksichtigt jetzt Spiele, der vollständige Bericht akzeptiert auch eine explizit leere Saison.
- Vollständige `npm test`-Suite nach diesen Korrekturen grün, einschließlich neuem Modell- und UI-Regressionstest. Bestehende `test:navigation:browser`-Prüfungen einschließlich mobilem Coachingweg grün.
- Mobile Browserprüfungen prüfen Team-/Spielertrends, Quellen, Suche/Saison/Archiv, Fokus bei Sync, App-/Browser-Zurück, Direktlink-Elternfallback, vollständigen Bericht, echten CSV-Download und Dunkelmodus. Der Scrollvergleich erfasst die tatsächliche Klickposition, nachdem Playwright den Link in den sichtbaren Bereich bewegt hat.
- PWA-Ladeprüfung: v230 mit 156 vorhandenen Offline-Dateien erfolgreich. Keine neue Netzabhängigkeit.
- Abschließender Browserdurchlauf nach allen Korrekturen bei 320/390/768/1440 px erfolgreich. Dunkle Eingabe-/Auswahlfelder visuell geprüft und Textfarbe korrigiert. Lokale Vorschau unter `http://127.0.0.1:4182/#/statistics` bereit.
