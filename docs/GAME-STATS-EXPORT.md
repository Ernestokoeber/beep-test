# Spielstatistik für das TSV-Admin-Panel

Nach **Spiel beenden** erscheint in der Spielauswertung **Statistik für das Admin-Panel exportieren**. Der Export steht auch direkt in der Detailansicht abgeschlossener Spiele zur Verfügung. Er benötigt keine Live-Erfassung. Unter **Spiele → Boxscore und Spielnotizen** werden Offensiv-/Defensiv-Rebounds, Steals, Assists, Turnovers, Blocks und Zweier-/Dreierversuche nach der Videoauswertung eingetragen (bei geschlossenen Spielen zuerst die Bearbeitung freigeben).

1. Mannschaft im Admin-Panel kontrollieren (standardmäßig Herren 1).
2. Eigene Heim-/Gastrolle kontrollieren; der gespeicherte Gameplan hat Vorrang vor der Namenszuordnung.
3. Als Quelle **Video-Auswertung im Spieler-Boxscore** verwenden. Optional lassen sich die ergänzenden Beobachtungswerte aus einer abgeschlossenen **Manuellen Live-Erfassung** exportieren. **Statistik exportieren** drücken. Auf iPhones wird nach Möglichkeit das Teilen-Menü geöffnet; alternativ wird die JSON-Datei heruntergeladen.
4. Im TSV-Admin-Panel **Spielerstatistiken → CourtHub + DBB importieren** öffnen. Datei auswählen, bei Bedarf DBB.Scores ergänzen, Spielerzuordnungen und Abweichungen prüfen und speichern.
5. Beim gespeicherten Spiel **Bericht** drücken, den KI-Text prüfen und als Entwurf speichern oder veröffentlichen.

## Vertrag und Datenqualität

Die Datei verwendet `format: courthub.game-stats`, `schemaVersion: 1`. Sie enthält eine dauerhaft gespeicherte Quellen-ID, Spiel-ID, Mannschaft, Saison im Format YYYY/YYYY (Wechsel am 1. Juli), Datum, Gegner und Heimrolle sowie die vom Trainer eingetragenen **Offensiv-/Defensiv-Rebounds, Steals, Assists, Turnovers, Blocks und Zweier-/Dreierversuche**. Nur Spieler mit mindestens einem eingetragenen Video-Wert werden exportiert. Leere Werte bleiben `null`, eine tatsächlich eingetragene Null bleibt `0`.

**DBB.Scores bleibt die Quelle für Endergebnis, Punkte, Spielminuten, Wurftreffer, Freiwürfe, Fouls und Plus/Minus.** Diese Felder werden im CourtHub-Export immer leer gelassen – auch wenn sie bereits im Boxscore oder Live-Protokoll stehen. Die ergänzenden Werte können dadurch mit den offiziellen Daten zusammengeführt werden, ohne diese durch Coach-Erfassung zu ersetzen. Der Importstatus bleibt `partial`. Ein Spielabschluss bestätigt keine vollständige Videoauswertung. Atlas und veröffentlichte Berichte werden nicht automatisch mit der gewählten Quelle vermischt.

Der Export ändert weder Live-Ereignisse noch Statistiken und veröffentlicht nichts. Die dauerhafte Quellen- und Spiel-ID ermöglichen dem Admin-Importer, wiederholte Exporte demselben Spiel zuzuordnen. Die Datei enthält Spielernamen und sollte gezielt für den Statistikimport verwendet werden.

## Kennzahlen

In der Spieldetailansicht zeigt **Wurfquoten und Effizienz · DBB + Video** pro Spieler und für den erfassten Team-Boxscore 2FG%, 3FG%, FG%, FT%, eFG%, AST/TO sowie EFF; für Spieler mit bekannten Minuten außerdem EFF/Min. EFF = Punkte + Rebounds + Assists + Steals + Blocks − Feldwurf-Fehlversuche − Freiwurf-Fehlversuche − Turnovers. Nur vollständige Eingaben ermöglichen EFF. Bei null Versuchen bleibt die Quote offen. Die Teamzeile summiert den tatsächlich erfassten Boxscore; fehlende Spieler oder Felder müssen ergänzt werden. Das ist kein ballbesitzbasiertes Offensive-/Defensive-Rating und keine automatische Erkennung taktischer Fehler.

## Prüfung

- `scripts/game-stats-export-smoke.mjs`: Spielabschluss, Video-Werte, Ausschluss aller DBB-Werte, echte Null, offene Werte, Auswärtsperspektive, Saisonwechsel, stabile Quellen-ID und JSON-Download.
- `scripts/browser-e2e.mjs`: Exportdownload im vollständigen Matchday auf iPhone und 320 px, einschließlich erneutem Export nach Reload und Kontrolle der Spielerwerte.
- Integration mit dem unveränderten `prepareImport` des TSV-Admin-Panels: Exportdatei akzeptiert, DBB-Punkte und Minuten erhalten, Video-Werte ergänzt und wiederholter Import geprüft.
