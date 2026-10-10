# Spielstatistik für das TSV-Admin-Panel

Nach **Spiel beenden** erscheint in der Spielauswertung **Statistik für das Admin-Panel exportieren**. Der gleiche Export steht unter **Spiele → Live-Auswertung** für die ausgewählte abgeschlossene Live-Erfassung zur Verfügung, auch wenn daneben bereits ein veröffentlichter Bericht angezeigt wird.

1. Mannschaft im Admin-Panel kontrollieren (standardmäßig Herren 1).
2. Eigene Heim-/Gastrolle kontrollieren; der gespeicherte Gameplan hat Vorrang vor der Namenszuordnung.
3. **Statistik exportieren** drücken. Auf iPhones wird nach Möglichkeit das Teilen-Menü geöffnet; alternativ wird die JSON-Datei heruntergeladen.
4. Im TSV-Admin-Panel **Spielerstatistiken → CourtHub + DBB importieren** öffnen. Datei auswählen, bei Bedarf DBB.Scores ergänzen, Spielerzuordnungen und Abweichungen prüfen und speichern.
5. Beim gespeicherten Spiel **Bericht** drücken, den KI-Text prüfen und als Entwurf speichern oder veröffentlichen.

## Vertrag und Datenqualität

Die Datei verwendet `format: courthub.game-stats`, `schemaVersion: 1`. Sie enthält eine dauerhaft gespeicherte Quellen-ID, Spiel-ID, Mannschaft, Saison im Format YYYY/YYYY (Wechsel am 1. Juli), Datum, Gegner, Heimrolle, Spielformat, Einsatzstatus, Trikotnummer, Sekunden sowie Rohwerte für Würfe, Rebounds, Assists, Steals, Blocks, Ballverluste und Fouls.

Die Quelle ist ausschließlich die ausgewählte abgeschlossene manuelle Live-Erfassung. Atlas, manuelle Bestandsboxscores und veröffentlichte Berichte werden nicht damit vermischt. Ein Spielabschluss bestätigt keine vollständige Statistik: `statsStatus` bleibt `partial`. Unbestätigte Gegnerpunkte und Plus/Minus bleiben `null`. Erfasste eigene Punkte werden in Mannschaftsperspektive exportiert; ein abweichender offizieller Endstand muss beim Import ausdrücklich abgeglichen werden. Nicht nominierte Spieler werden nicht exportiert; nominierte Bankspieler ohne Einsatz erhalten `dnp`.

Der Export ändert weder Live-Ereignisse noch Statistiken und veröffentlicht nichts. Die dauerhafte Quellen- und Spiel-ID ermöglichen dem Admin-Importer, wiederholte Exporte demselben Spiel zuzuordnen. Die Datei enthält Spielernamen und sollte gezielt für den Statistikimport verwendet werden.

## Prüfung

- `scripts/game-stats-export-smoke.mjs`: Spielabschluss, Rohwerte, echte Null, offene Werte, DNP, Auswärtsperspektive, Saisonwechsel, Quellen-ID und JSON-Download.
- `scripts/browser-e2e.mjs`: Exportdownload im vollständigen Matchday auf iPhone und 320 px, einschließlich erneutem Export nach Reload und Kontrolle der Spielerwerte.
- Integration mit dem unveränderten `prepareImport` des TSV-Admin-Panels: Exportdatei akzeptiert, Auswärtsergebnis in Mannschaftsperspektive, Spielzeiten und wiederholter Import geprüft.
