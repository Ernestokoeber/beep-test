# CourtHub Gegner-Scouting

CourtHub führt offizielle Ligaergebnisse, bestätigte DBB.Scores-Screenshots,
manuell geprüfte Statistiken und Trainerbeobachtungen in einem Gegnerprofil
zusammen. Fehlende Werte werden nie als Nullwert oder Schwäche interpretiert.

Die Gegnerkarten folgen dem eigenen Spielplan: Das zeitlich nächste Spiel steht
an erster Stelle und wird beim Öffnen automatisch ausgewählt, danach folgen die
weiteren Gegner nach Datum und Uhrzeit. Gegner ohne kommendes Spiel stehen am
Ende alphabetisch. Dadurch wird ein anstehendes Pokalspiel vor späteren
Ligaspielen direkt als erste Analyse geöffnet.

## Datenquellen

- **TeamSL:** Saison-Gegner, Spieltermine, Ergebnisse, Form und Punkteschnitte.
- **DBB.Scores-Screenshots:** bis zu 24 Fotos oder Screenshots pro Durchgang,
  einschließlich HEIC/HEIF vom iPhone. CourtHub verkleinert die Bilder im
  Browser und verarbeitet sie automatisch in überlappenden Paketen mit
  höchstens vier Bildern. Zwei Pakete werden parallel verarbeitet; bei einem
  Timeout wird nur das betroffene Paket einmal automatisch wiederholt. Beim
  zweiten Versuch entfallen die schon bekannten Kontextbilder, sodass nur zwei
  neue Bilder gesendet werden. So bleiben Spielübersicht und die nachfolgenden
  DBB.Scores-Statistikansichten auch an Paketgrenzen miteinander verknüpft.
  Die Bilder selbst werden nicht im Team-Workspace gespeichert.
- **Reihenfolge:** CourtHub sortiert ausgewählte Bilder zunächst natürlich nach
  Dateiname (`IMG_0105`, `IMG_0106`, …) und ersatzweise nach Datei-Aufnahmezeit.
  Erkannte Spiele werden anschließend chronologisch nach Spieltag angezeigt;
  Spielerzeilen folgen dem Spieltag und danach dem Namen.
- **Trainerteam:** qualitative Angriffsmerkmale sowie vollständig erfasste
  Team- und Spielerstatistiken.

Vor einem Screenshot-Import zeigt CourtHub kompakt die erkannten Spiele und die
Anzahl der Spielerwerte. Spielerzeilen und Prüfhinweise sind auf Mobilgeräten
einklappbar. Erst die ausdrückliche Bestätigung speichert die extrahierten Werte.
Identische Bildpakete und Spiele mit demselben Datum und denselben Teams werden
nicht doppelt übernommen.

Für Spielerpunkte verwendet die KI die sichtbare Spalte **Pkt**. **2Pkt** und
**3Pkt** werden als Trefferzahlen behandelt, nicht als Punktesummen. Sind keine
Wurfversuche sichtbar, berechnet CourtHub ausdrücklich keine Wurfquote. Stattdessen
zeigt es ein Trefferprofil aus Zweiern, Dreiern und verwandelten Freiwürfen. Eine
zweierlastige Verteilung mit vielen Freiwürfen wird nur als vorsichtiger Hinweis
auf Inside- oder Ringdruck verwendet; Mitteldistanzwürfe bleiben möglich.

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

## Spielvorbereitung und Live Game

Beim Öffnen eines Spieltags friert CourtHub den zu diesem Zeitpunkt bestätigten
Gegnerkontext als nachvollziehbaren Snapshot ein. Die Basketball-KI kann daraus
Kabinensätze, Spielziele, Offense-/Defense-Schlüssel, Aufwärmfokus und
Halbzeitfragen erstellen. Sie darf nur belegte Daten verwenden und nur zwischen
Mannverteidigung mit No-Middle, 2-1-2 und 3-2 wählen.

Im Live Game können Paint-/Drive-Aktionen, offene Dreier, Offensiv-Rebounds und
Freiwurfdruck mit einem Tipp protokolliert werden. CourtHub vergleicht diese
Beobachtungen mit messbaren Auslösern und zeigt eine Empfehlung; ein
Defense-Wechsel wird erst durch den Coach bestätigt und als eigenes Ereignis
gespeichert. Die Halbzeitansicht bündelt Stand, aktuelle Defense, Zähler und
Prüffragen. Nach Spielende werden Beobachtungen und Wechsel idempotent in das
Gegnerprofil zurückgeführt.

## Grenzen

- Unlesbare oder abgeschnittene Werte bleiben leer.
- Saison-Durchschnittswerte werden nicht als Einzelspielwerte importiert.
- Eine Defense-Empfehlung oder ein Live-Hinweis ist eine Coaching-Hilfe und keine
  automatische Steuerung. CourtHub dokumentiert nur ausdrücklich bestätigte
  Defense-Wechsel.
- Eine spätere autorisierte Recherche-API kann weitere öffentliche Quellen
  ergänzen; sie ändert nichts an Quellenangabe, Vorschau und Bestätigung.
