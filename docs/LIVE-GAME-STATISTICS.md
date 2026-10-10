# Live-Spielstatistik in CourtHub

Für einen Coach am Handy. Individuelle Aktionen werden ausschließlich für die
eigene Mannschaft erfasst. Gegnerische Treffer werden als Teampunkte festgehalten,
damit Plus/Minus berechnet werden kann. Die Trainingsuhr bleibt separat.

## Vor dem Spiel

Alternativ führt **Spieltag starten** durch Kader und optionale Vorbereitung.
Die anschließende freie Live-Ansicht nutzt dieselbe Erfassung, keine zweite
Statistikquelle. Ablauf und Wiederaufnahme: [Spieltag-Modus](MATCHDAY-MODE.md).

1. App einmal online öffnen, unter **Konto & Sync** anmelden und synchronisieren.
2. Unter **Spiele** das Spiel auswählen und **Live Game mit Gegnerplan** öffnen.
3. Spieltagskader und genau fünf Starter auswählen. Abschnittsdauer einstellen.
   Trikotnummern für dieses Spiel prüfen: `0` und `00` sind verschieden; fehlende
   Nummern dürfen leer bleiben. Profiländerungen verändern diesen Spieltagskader
   nicht rückwirkend. Doppelte Nummern sind nicht zulässig.
4. **Erfassung starten** legt das lokale Protokoll an; **Uhr starten** beginnt
   erst danach die Spielzeit. Über **Starting Five ändern** kann die Auswahl bis
   zum ersten Uhrstart korrigiert werden. Danach sind Änderungen normale Wechsel.
   Die Hallenuhr wird nicht ferngesteuert.

## Während des Spiels

- Feldspieler und beide Schritte des Wechselmenüs sind nach Spielposition
  sortiert: Point Guard, Shooting Guard, Small Forward, Power Forward, Center.
  Innerhalb einer Position stehen die Namen alphabetisch; Spieler ohne
  zugeordnete Position folgen am Ende. Die Position steht direkt auf dem Button.
  Nach Wechseln und beim Wiederöffnen gilt dieselbe Reihenfolge.
- Mit dem verbindlichen Spielstart verschwindet auf Handys die normale untere
  App-Navigation. An ihrer Stelle bleibt die Spieluhr mit großem
  **Uhr starten**-/ **Uhr anhalten**-Button fest am unteren Bildschirmrand. Sie
  ist damit auch nach dem Scrollen jederzeit erreichbar. Nach dem Spiel oder
  beim Verlassen der Live-Erfassung erscheint die normale Navigation wieder.
- Spieler antippen. Dadurch öffnet sich ein bildschirmfestes Aktionsmenü mit den
  Gruppen **Treffer & Fehlwürfe**, **Rebound & Zusammenspiel**, **Defense** sowie
  **Ballverlust & Foul**. Nach der Auswahl wird die Aktion gespeichert, das Menü
  schließt sich und die fünf Spieler stehen wieder zur Auswahl. Jede Aktion wird
  vor der Anzeige in IndexedDB gespeichert.
- Gegnerische Treffer über **Gegner +1**, **+2**, **+3** erfassen. Ist ein
  Gegnerplan mit bekannten Topscorern oder Schützen vorhanden, kann der Werfer
  vorher optional ausgewählt werden. Ohne Auswahl werden die Punkte weiterhin
  vollständig als Teampunkte gewertet. Nach jeder Buchung wird die optionale
  Werferauswahl zurückgesetzt. Eigene Treffer ausschließlich beim jeweiligen Spieler buchen. Angezeigt wird
  der selbst erfasste, nicht der offizielle Spielstand.
- Spieluhr bei Unterbrechungen selbst stoppen. Nur laufende Spielzeit zählt.
- **Uhr anhalten und wechseln** stoppt zuerst die Uhr und öffnet den
  Wechsel-Assistenten. Im ersten Menü einen oder mehrere der fünf Feldspieler
  auswählen und **Weiter** drücken. Im zweiten Menü dieselbe Anzahl verfügbarer
  Bankspieler auswählen und mit **Fertig** den gesamten Wechsel übernehmen. Die
  Uhr danach selbst wieder starten.
- Fünf Fouls erzeugen einen Hinweis, keine automatische Auswechslung.
- Im Spieltag-Modus bleiben Gegnerplan und aktuelle Defense sichtbar. Paint/Drive,
  offene Dreier, Offensiv-Rebounds und Freiwurfdruck lassen sich als schnelle
  Beobachtung erfassen. Erreichte Auslöser erscheinen als Hinweis; den Wechsel
  zwischen Mann, 2-1-2, 2-3 und 3-2 bestätigt immer der Coach selbst.
- **Letzte Aktion rückgängig** betrifft die letzte Statistikaktion, Gegnerpunkte, Wechselgruppe
  oder Kaderkorrektur. Widersprüchliche Folgeaktionen verhindern die Änderung.
- **Uhr korrigieren** setzt die angehaltene Uhr auf MM:SS. Betroffene Wechselzeiten
  müssen unter **Protokoll korrigieren** gemeinsam mit den Pausenzeiten geändert
  werden. Das Protokoll wird nicht still repariert.
- Nach 0:00 den nächsten Abschnitt ausdrücklich vorbereiten. Nach den regulären
  Abschnitten folgen Verlängerungen. Keine automatische Weiterzählung in Pausen.
- **Kader korrigieren** ergänzt Nachmeldungen oder korrigiert Namen/Nummern, ohne die
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
im Korrekturmodus. **Live-Auswertung** zeigt für Mannschaft und Spieler Punkte,
FGM/FGA, FG%, 2PM/2PA, 2P%, 3PM/3PA, 3P%, FTM/FTA, FT%, OREB/DREB/REB,
AST/TOV/STL/BLK/PF sowie Einsatzminuten und Aufstellungsverlauf. Der kompakte
Handyüberblick bleibt auf PTS, REB, AST, Plus/Minus, TOV und EFF begrenzt; der
vollständige Boxscore ist je Spieler aufklappbar.

CourtHub berechnet zusätzlich automatisch:

- `eFG% = (FGM + 0,5 × 3PM) ÷ FGA`
- `TS% = PTS ÷ (2 × (FGA + 0,44 × FTA))`
- `AST/TO = AST ÷ TOV`
- `EFF = PTS + REB + AST + STL + BLK − (FGA − FGM) − (FTA − FTM) − TOV`

Bei null Versuchen beziehungsweise null Turnovers zeigt die Auswertung einen
Strich statt einer irreführenden Quote. PIE, Rebound-Prozentwerte sowie
Offensiv- und Defensivrating werden bewusst nicht berechnet: Dafür fehlen die
vollständigen Gegnerstatistiken beziehungsweise verlässlich erfasste Possessions.

Im Spieltag-Modus ergänzt **Gegner & Defense** die manuell erfassten Gegnerpunkte
und Beobachtungen je Mannverteidigung, 2-1-2, 2-3 und 3-2. Angezeigt werden Einsatzzeit,
Punkte, Trefferarten und Punkte pro zehn Spielminuten sowie optional zugeordnete
gegnerische Werfer. Diese Rate ist nicht possession-bereinigt und ersetzt keine
vollständige Video- oder Boxscoreanalyse.

Zusätzlich zeigt der Bericht Spieltagsnummer, **Gespielt** bzw. **DNP – nicht
eingesetzt** und Plus/Minus. Während des Spiels heißt DNP noch „Noch nicht
eingesetzt“. Auch eine Einwechslung ohne verstrichene Sekunde zählt als Einsatz;
die Minutenanzeige allein entscheidet das nicht. Intern bleiben Millisekunden
erhalten, im Bericht stehen außerdem ganze Sekunden zur Verfügung.

Plus/Minus verteilt jeden erfassten eigenen bzw. gegnerischen Treffer auf die
damals aktive eigene Aufstellung. Bei identischer Spielzeit zählt die Reihenfolge
vor oder nach dem Wechsel. Nach Korrekturen werden die Werte neu berechnet.
DNP-Spieler erhalten keinen numerischen Plus/Minus-Wert.

Beim Abschluss nur dann **Gesamten Punkteverlauf beider Teams erfasst** auswählen,
wenn alle Treffer und Wechsel richtig erfasst wurden. Ohne Bestätigung lässt
sich das Spiel ebenfalls abschließen, die Werte bleiben ausdrücklich vorläufig.
Nach nachträglicher Statistik-/Zeitkorrektur im Korrekturmodus den **Punkteverlauf
bestätigen**. Eine alte Bestätigung wird dadurch nicht automatisch erneuert.
Ein passender Endstand allein beweist keine korrekte Zuordnung zu Spielern.

Alte Erfassungen (Format 1) bleiben unverändert nutzbar, ohne Gegnerpunkte und
ohne geschätztes Plus/Minus. Format 2 ergänzt Gegnerpunkte und Plus/Minus. Neue
Spieltage verwenden Format 3 für schnelle Gegnerbeobachtungen, bestätigte
Defense-Wechsel und optionale gegnerische Werferzuordnung. Vor einem neuen Spiel die App auf allen Geräten online
aktualisieren. Bei einer nicht unterstützten Datenversion aktualisieren, niemals
Browserdaten löschen oder eine neue Erfassung über die alte schreiben.

Live-Auswertung, bestehender manueller Boxscore und Atlas bleiben unabhängige
Quellen. Keine automatische Addition oder Übertragung zwischen ihnen. Bei
eindeutiger Lindau-Zuordnung wird eine Differenz zum gepflegten Ergebnis gezeigt.
Die optionalen Gegnerwerte stammen ausschließlich aus der manuellen
Live-Zuordnung; es gibt weiterhin keine API zur offiziellen Ergebnis-App.

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

- Ungültige Profilnummern abgewählter Spieler blockieren den Start nicht mehr.
  Ausgewählte Spieler benötigen weiterhin eine gültige oder leere Nummer.

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
