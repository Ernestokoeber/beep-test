# Druckoptimierter Auswertungsbericht – Design

## Ziel

Der Export unter „Auswertung“ erzeugt einen lesbaren, druckfertigen PDF-Bericht für das Trainerteam. Er soll die gleichen gefilterten Daten wie die Seite abbilden, ohne Navigation oder sonstige App-Oberfläche zu übernehmen.

## Entscheidung

CourtHub erzeugt weiterhin ein eigenständiges PDF mit jsPDF. Ein Seiten-Schnappschuss wird nicht verwendet: Er würde die responsive Bildschirmansicht, Navigation und Filter mitdrucken und auf A4 unzuverlässig umbrechen.

## Berichtaufbau

1. **Deckblatt / Teamüberblick (A4 quer):** CourtHub- und Teamkennung, Saison, Erstellungszeitpunkt, Datenstand sowie sechs Kennzahlen (Trainings, Spiele, Bilanz, Anwesenheit, Training FG, Training FT).
2. **Spielerübersicht (A4 quer):** Eine lesbare Kern-Tabelle mit Spieler, Anwesenheit, Trainingsquoten, Einsätzen und Punkten. Die bisherigen zwölf engen Spalten werden auf zwei Tabellen aufgeteilt:
   - Leistung: Spieler, Anwesenheit, Training FG/FT, Spiele, PPG.
   - Spielwerte: Spieler, Spiel FG/FT, REB, AST, TO, Beep-Test.
   Beide Tabellen wiederholen ihre Kopfzeile bei Seitenumbrüchen und kürzen keine Spielernamen stillschweigend.
3. **Wurfprofile (A4 hoch):** Pro Spieler eine klar getrennte Karte mit vollständigem Namen, Trainingswurfkategorien und Freiwurfwerten. Die Karten werden sauber auf die nächste Seite umbrochen.
4. **Fußzeile:** Vertraulichkeitshinweis und fortlaufende Seitenzahl auf jeder Seite.

## Datenfluss

`exportPDF()` verwendet den bereits durch Saison- und Spielerfilter erzeugten `currentReport`. Die PDF-Darstellung erhält keine eigenen Datenquellen und erzeugt keine Datensätze. So stimmen Bildschirm, CSV und PDF in der jeweiligen Auswahl überein.

## Gestaltungsregeln

- CourtHub-Grün und TSV-Orange bleiben erhalten.
- Zahlen werden rechtsbündig und Namen linksbündig gesetzt.
- Lange Namen erhalten ihre notwendige Spaltenbreite oder werden mehrzeilig ausgegeben; es gibt keine Zeichenlimit-Kürzung.
- Leere Datensätze bleiben verständlich („–“ bzw. klare Leerhinweise) und erzeugen keine leeren Folgeseiten.
- Der Button, Dateiname, mobile Teilen-Funktion und vorhandene CSV-Export bleiben unverändert.

## Fehlerbehandlung

Das bestehende Laden von jsPDF und die bestehende Fehlermeldung bleiben erhalten. Schlägt das Nachladen fehl, wird kein unvollständiger Bericht gespeichert.

## Testbarkeit

Der Smoke-Test prüft weiterhin die Export-Schaltfläche und ergänzt reine PDF-Tests mit einem jsPDF-Stub: getrennte Tabellen, Seitenwechsel, vollständige Namen sowie keine leere Wurfprofil-Seite bei leerem Kader.

## Abgrenzung

Keine Änderung am CSV-Export, an den Auswertungsfiltern, Datenmodellen oder anderen PDF-Exporten (Training, Spieler, Kampfgericht).
