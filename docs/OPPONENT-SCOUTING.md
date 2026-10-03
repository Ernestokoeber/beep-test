# CourtHub Gegner-Scouting

CourtHub führt offizielle Ligaergebnisse, bestätigte DBB.Scores-Screenshots,
manuell geprüfte Statistiken und Trainerbeobachtungen in einem Gegnerprofil
zusammen. Fehlende Werte werden nie als Nullwert oder Schwäche interpretiert.

## Datenquellen

- **TeamSL:** Saison-Gegner, Spieltermine, Ergebnisse, Form und Punkteschnitte.
- **DBB.Scores-Screenshots:** bis zu sechs JPG-, PNG- oder WebP-Dateien pro
  Durchgang. Die Bilder werden im Browser verkleinert, serverseitig durch die
  Basketball-KI gelesen und nicht im Team-Workspace gespeichert.
- **Trainerteam:** qualitative Angriffsmerkmale sowie vollständig erfasste
  Team- und Spielerstatistiken.

Vor einem Screenshot-Import zeigt CourtHub die erkannten Spiele, die Anzahl der
Spielerzeilen und alle Prüfhinweise. Erst die ausdrückliche Bestätigung speichert
die extrahierten Werte. Identische Bildpakete und Spiele mit demselben Datum und
denselben Teams werden nicht doppelt übernommen.

## Kennzahlen

Aus vollständigen Daten berechnet CourtHub unter anderem:

- Bilanz und Form der letzten fünf Spiele
- erzielte und zugelassene Punkte pro Spiel
- durchschnittliche Teamfouls
- Feldwurf-, Dreier- und Freiwurfquote
- Topscorer nach Punkten pro Spiel
- belegte Volumen-Schützen und Spielerfouls

Topscorer und bester Werfer bleiben getrennte Begriffe. Eine Wurfquote wird nur
angezeigt, wenn Treffer und Versuche vorhanden sind.

## Defense-Entscheidung

Das zulässige TSV-Lindau-Repertoire ist verbindlich auf drei Varianten begrenzt:

1. Mannverteidigung mit No-Middle
2. Zone 2-1-2
3. Zone 3-2

CourtHub bewertet Inside-Gefahr, Perimeter-Gefahr, High-Post-Passing,
Offensiv-Rebound, Wurfprofil, Schlüsselspieler und Datenqualität. Die Ausgabe
enthält Startverteidigung, Alternative, Gründe, Risiken und messbare
Wechsel-Auslöser. Bei niedriger Datenqualität bleibt Mannverteidigung mit
No-Middle die Startempfehlung.

## Trainingsplanung

Der bestätigte Gegnerkontext wird in den nächsten Trainingsslot übernommen. Die
Basketball-KI darf gegnerbezogene Inhalte in einer normalen Einheit mit höchstens
25 Prozent gewichten. Im individuellen 105-Minuten-Freitagstraining darf
höchstens eine der fünf Stationen aus einer Gegnerbesonderheit oder einem
Trainerproblem entstehen. Tagesform, Schmerzen, RPE, Spielminuten und
Wochenbelastung haben weiterhin Vorrang.

## Grenzen

- Unlesbare oder abgeschnittene Werte bleiben leer.
- Saison-Durchschnittswerte werden nicht als Einzelspielwerte importiert.
- Eine Defense-Empfehlung ist eine vorbereitete Coaching-Entscheidung und keine
  automatische Live-Steuerung.
- Eine spätere autorisierte Recherche-API kann weitere öffentliche Quellen
  ergänzen; sie ändert nichts an Quellenangabe, Vorschau und Bestätigung.
