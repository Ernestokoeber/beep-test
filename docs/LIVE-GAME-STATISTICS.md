# Live-Spielstatistik in CourtHub

Für einen Coach am Handy. Erfasst werden ausschließlich Aktionen der eigenen
Mannschaft. Die Trainingsuhr bleibt eine separate Funktion.

## Vor dem Spiel

1. App einmal online öffnen, unter **Konto & Sync** anmelden und synchronisieren.
2. Unter **Spiele** das Spiel auswählen und **Live erfassen** öffnen.
3. Spieltagskader und genau fünf Starter auswählen. Abschnittsdauer einstellen.
4. **Erfassung starten** legt das lokale Protokoll an; **Uhr starten** beginnt
   erst danach die Spielzeit. Die Hallenuhr wird nicht ferngesteuert.

## Während des Spiels

- Spieler antippen, anschließend Treffer, Fehlwurf, Rebound oder andere Aktion.
  Jede Aktion wird vor der Anzeige in IndexedDB gespeichert.
- Spieluhr bei Unterbrechungen selbst stoppen. Nur laufende Spielzeit zählt.
- **Uhr anhalten und wechseln** stoppt zuerst die Uhr. Aus- und Einwechslungen
  gemeinsam auswählen, dann bestätigen. Bei weniger als fünf Spielern Unterzahl
  ausdrücklich bestätigen. Die Uhr danach selbst wieder starten.
- Fünf Fouls erzeugen einen Hinweis, keine automatische Auswechslung.
- **Letzte Aktion rückgängig** betrifft die letzte Statistikaktion, Wechselgruppe
  oder Kaderkorrektur. Widersprüchliche Folgeaktionen verhindern die Änderung.
- **Uhr korrigieren** setzt die angehaltene Uhr auf MM:SS. Betroffene Wechselzeiten
  müssen unter **Protokoll korrigieren** gemeinsam mit den Pausenzeiten geändert
  werden. Das Protokoll wird nicht still repariert.
- Nach 0:00 den nächsten Abschnitt ausdrücklich vorbereiten. Nach den regulären
  Abschnitten folgen Verlängerungen. Keine automatische Weiterzählung in Pausen.
- **Kader korrigieren** ergänzt Nachmeldungen oder korrigiert Namen, ohne die
  ursprüngliche Historie zu löschen.

## Speicherung und Offlinebetrieb

„Lokal gesichert“ bedeutet auf diesem Browser/Gerät, nicht bereits auf dem Server.
„Synchronisiert“ bestätigt die Übernahme durch den Server. Bei Speicherfehlern
ist die betreffende Aktion nicht als erfolgreich anzusehen.

Die App und alle Live-Module müssen vorher einmal online geladen worden sein.
Nach Neuladen dieselbe Erfassung im selben Konto/Team wieder öffnen. Eine laufende
Uhr wird aus dem gespeicherten Zeitanker berechnet, nicht aus Browser-Ticks.
Bildschirmsperre und Hintergrundbetrieb erzeugen keine Pausenzeiten: Die Uhr
läuft rechnerisch weiter bis 0:00. Die Gerätezeit während des Spiels nicht ändern.

Browserdaten nicht löschen, keinen privaten Browsermodus für ein echtes Spiel
verwenden. Lokale Daten sind kein Ersatz für regelmäßige Synchronisierung.

## Mehrere Geräte und Konflikte

Pro Spiel nur ein Erfassungsgerät benutzen. Andere Tabs werden über eine
transaktionale Sperre geschützt. Nach einem abgestürzten Tab kann die Sperre bis
zu 15 Sekunden bestehen bleiben.

Für einen Gerätewechsel zuerst synchronisieren und am alten Gerät die Erfassung
schließen. Auf dem neuen Gerät **Erfassung übernehmen** bestätigen. Die alte
Sitzung bleibt erhalten. Gleichzeitige Offline-Erfassungen können nicht global
gesperrt werden. Bei mehreren Sitzungen die auszuwertende Sitzung ausdrücklich
auswählen; deren Punkte werden niemals miteinander addiert.

Bei einem ID-/Reihenfolgekonflikt oder einem zwischenzeitlich gelöschten Spiel
nicht den Browserspeicher zurücksetzen. Lokale Aktionen bleiben im Journal.
Die Fehlermeldung mit Spiel und Gerät an die Administration weitergeben. Eine
pauschale Workspace-Überschreibung ist keine sichere Konfliktlösung.

Ein Spiel mit Live-Protokoll lässt sich nur online nach Synchronisierung und
zusätzlicher Bestätigung löschen. Vorher auch andere Geräte synchronisieren.

## Abschluss und Auswertung

**Spiel abschließen** stoppt die Uhr. Weitere Änderungen erfolgen ausdrücklich
im Korrekturmodus. **Live-Auswertung** zeigt Punkte, FT/2P/3P, FG, Quoten,
OREB/DREB/REB, AST/STL/BLK/TO/PF, Einsatzminuten und Aufstellungsverlauf.

Live-Auswertung, bestehender manueller Boxscore und Atlas bleiben unabhängige
Quellen. Keine automatische Addition oder Übertragung zwischen ihnen. Bei
eindeutiger Lindau-Zuordnung wird eine Differenz zum gepflegten Ergebnis gezeigt.
Keine Gegnerstatistiken, kein Plus/Minus und keine API zur offiziellen Ergebnis-App.

## Technische Abnahme

`npm test` enthält Modell-, Zeit-, Journal-, API-, Sync-, UI- und Berichtstests.
Zusätzliche Review-Regressionen prüfen tabübergreifende Kontowechsel, den
serverseitig ergänzten Ereignisstand, verspätete Altgeräte-Aktionen und
Wechselkorrekturen nach Fortsetzung der Uhr.
`node scripts/live-game-browser.mjs` startet eine ausschließlich lokale
Testoberfläche mit synthetischen Spielern für 320/390-Pixel-Prüfungen. Keine
Verbindung zu Neon oder dem produktiven Team. Tests auf echten iOS-/Android-
Geräten müssen zusätzlich vom Coach durchgeführt werden.

### Bekannte kleine Restpunkte

Die separate GitHub-Browserprüfung für den Taktikboard-Fokus-Editor scheiterte
bereits vor dieser Funktion auf `b2ea207` (Run `36533594396`,
`scripts/browser-e2e.mjs:188`). Sie wurde in diesem Auftrag nicht verändert.
Die lokale `npm test`-Suite einschließlich aller Live-Tests ist davon getrennt.

- Während einer laufenden Synchronisierung neu erfasste Aktionen bleiben sicher
  im Journal, die globale Anzeige kann aber kurz vorzeitig „synchronisiert“
  anzeigen, bis deren Speichertimer startet.
- Technische Wiederholungen einer Command-ID müssen identischen Inhalt tragen.
  Der Controller überprüft eine wiederverwendete ID noch nicht zusätzlich auf
  abweichenden Inhalt; normale Bedienaktionen erhalten jeweils neue UUIDs.
