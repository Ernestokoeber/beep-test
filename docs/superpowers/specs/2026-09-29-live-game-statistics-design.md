# CourtHub: Live-Spielstatistik für den Coach

Status: Vom Nutzer freigegeben; noch nicht implementiert.
Datum: 29.09.2026

## 1. Ziel und freigegebener Umfang

Ein Coach erfasst während eines Basketballspiels auf seinem Handy die Aktionen
der eigenen Mannschaft. Er bedient die Spieluhr selbst und dokumentiert Ein-
und Auswechslungen. Nach dem Spiel sollen individuelle Statistiken,
Einsatzminuten und der Aufstellungsverlauf nachvollziehbar sein.

Die offiziellen Punkte stehen in einer anderen App ohne API-Zugriff zur
Verfügung. CourtHub erfasst keine detaillierten Gegnerstatistiken und ersetzt
weder diese App noch die offizielle Spieluhr oder den offiziellen Spielbericht.
Die Summe der selbst erfassten Treffer ist eine interne Kontrollgröße.

Die bestehende Trainingsuhr bleibt unverändert: Die automatisch wiederholende
Trainings-Shotclock wird nicht für die Erfassung offizieller Spiele verwendet.

## 2. Bestehende Anknüpfungspunkte

Geprüft im Repository am 29.09.2026:

- `js/games.js`: Spielauswahl, Spielbericht, manuell editierbare
  `game.playerStats` und Import von geprüften Atlas-Analysen existieren bereits.
- Die vorhandene Boxscore-Tabelle enthält Minuten, Punkte, Würfe/Freiwürfe,
  Rebounds, Assists, Steals, Blocks, Ballverluste, Fouls und Plus/Minus.
- `js/storage.js`: Spiele werden lokal gespeichert; `upsertGame` übernimmt
  eingehende Felder auf den bisherigen Spielstand. Verschachtelte Daten erhalten
  dadurch keinen automatischen Konfliktabgleich.
- `js/sync.js`: Teamdaten werden als Workspace synchronisiert. Bei einem
  Versionskonflikt wird anhand von Zeitstempeln entschieden; ein neuerer
  Serverstand kann den lokalen Workspace ersetzen. Das ist allein keine
  ausreichende Verlustsicherung für eine Live-Ereignisliste.

Folgerung: Die neue Live-Erfassung benötigt ein eigenes versioniertes
Ereignisprotokoll und eine lokale Sicherung unbestätigter Änderungen.
Es gibt bisher keine verifizierte Umsetzung dieser Erweiterung.

## 3. Bedienablauf auf dem Handy

### Vorbereitung

1. Vorhandenes Spiel öffnen und „Live erfassen“ wählen.
2. Spieltagskader aus den vorhandenen Spielern zusammenstellen.
3. Genau fünf unterschiedliche Spieler als Starting Five auswählen.
4. Spielabschnitte und Dauer einstellen. Vorgeschlagene, editierbare Vorgabe:
   vier Viertel à zehn Minuten, Verlängerungen à fünf Minuten.
5. Mit „Spiel starten“ beginnt die eigene Spieluhr.

Vor Beginn dürfen Kader und Starting Five frei geändert werden. Nach Beginn
werden relevante Änderungen protokolliert. Spieler-ID und Name/Trikotnummer
werden für dieses Spiel festgehalten, damit spätere Profiländerungen oder
Archivierungen den historischen Spielbericht nicht unlesbar machen.

### Live-Ansicht

- Oben: Viertel/Verlängerung, große Spieluhr und große Start-/Pause-Taste.
- Direkt erreichbar: fünf aktive Spieler mit Name und Trikotnummer.
- Spieler antippen, dann eine Aktion wählen. Häufige Aktionen benötigen nach
  dem Öffnen der Ansicht höchstens zwei Berührungen.
- Bank und „Wechsel“ klar von Statistik-Aktionen trennen.
- „Letzte Aktion rückgängig“ und ein chronologisches Aktionsprotokoll anbieten.
- Erfasste eigene Punkte als solche beschriften, nicht als offizielles Ergebnis.
- Sichtbarer Speicherstatus: lokal gesichert, Synchronisierung ausstehend,
  synchronisiert oder Konflikt/Fehler.

Eine Statistikbuchung pausiert die Uhr nicht automatisch. Später erfasste
Aktionen können im Protokoll hinsichtlich Spieler, Aktion und Spielzeit
korrigiert werden.

### Aktionen

- Freiwurf, Zweier oder Dreier, jeweils getroffen/verfehlt.
- Offensiver oder defensiver Rebound.
- Assist, Steal, Block, Ballverlust und persönliches Foul.

Treffer erzeugen automatisch Versuch und Punkte; Fehlwürfe nur einen Versuch.
Feldwürfe schließen Freiwürfe aus. Gesamt-Rebounds ergeben sich aus offensiven
und defensiven Rebounds. Ein Assist wird separat erfasst und nicht aus einem
Treffer vermutet. Nicht erfasste Kategorien dürfen später nicht als vollständig
beobachtete Nullleistung dargestellt werden; der Bericht kennzeichnet die Daten
als manuell erfasste Coach-Statistik.

### Wechsel

Die Uhr für Wechsel anhalten. „Raus“ und „Rein“ auswählen und bestätigen.
Mehrere Wechsel in einer Unterbrechung werden gemeinsam bestätigt und erhalten
dieselbe Spielzeit. Eine Wechselgruppe ist atomar: entweder alle gültigen
Wechsel oder keiner.

Validierung: keine doppelten Spieler; ausgewechselte Spieler müssen auf dem
Feld stehen, eingewechselte Spieler zur Bank des Spieltagskaders gehören.
Regulär stehen fünf Spieler auf dem Feld. Für Verletzung, Ausschluss oder
fehlenden Ersatz ist eine ausdrücklich bestätigte Unterzahl mit weniger als
fünf Spielern zulässig; nie mehr als fünf. Foulgrenzen führen zu einem Hinweis,
nicht zu einer stillen automatischen Auswechslung.

## 4. Spieluhr und Einsatzminuten

- Die Uhr zählt pro Abschnitt abwärts und kann gestartet, pausiert sowie bei
  angehaltener Uhr an die Hallenuhr angepasst werden.
- Zeitberechnung über gespeicherte Zeitanker, nicht durch Dekrementieren eines
  Browserzählers. Neuladen oder Hintergrundbetrieb dürfen die Laufzeit nicht
  auf null setzen. Ein tatsächlich laufender Zeitanker läuft rechnerisch weiter.
- Bei Abschnittsende stoppt die Uhr bei null. Es beginnt niemals automatisch
  das nächste Viertel. Vor dem nächsten Abschnitt kann die Aufstellung geändert
  werden; bei Bedarf werden weitere Verlängerungen angelegt.
- Nur laufende Spielzeit zählt zu Einsatzminuten, keine Auszeiten,
  Unterbrechungen oder Viertelpausen.
- Das Aktionsprotokoll speichert Abschnitt, Restspielzeit, stabile Reihenfolge
  und zusätzlich die tatsächliche Erfassungszeit. Die Gerätezeit dient nicht
  als fachliche Reihenfolge zwischen verschiedenen Geräten.

Eine Uhrkorrektur wird als eigene Korrektur dokumentiert. Beispiel: Die App
zeigt 08:20, die Hallenuhr 08:30. Die zehn Sekunden Differenz dürfen nicht
zusätzlich als Einsatzzeit bestehen bleiben. Betrifft die Korrektur einen
Zeitraum mit bereits protokolliertem Wechsel, muss der Coach dessen Zeitpunkt
prüfen. Widersprüchliche Reihenfolgen dürfen nicht stillschweigend zu negativen
Minuten führen; die Korrektur wird bis zur Auflösung nicht übernommen.

Einsatzzeiten werden aus den gültigen Aufstellungsabschnitten neu berechnet,
nicht als separat editierte Zähler geführt. Gleichzeitige Wechsel erzeugen
keine zusätzlichen Sekunden. Bei durchgehend fünf Spielern muss die Summe der
Einsatzzeiten fünfmal der verstrichenen Spielzeit entsprechen; bei Unterzahl
entsprechend weniger. Gerundet wird erst für die Anzeige.

## 5. Protokoll und Datenverantwortung

Vorgeschlagener neuer Bereich am Spiel: `liveStats` mit eigener `schemaVersion`.
Er enthält Spieltagskader, Abschnittskonfiguration, Erfassungssitzung,
Uhrzustand und Ereignisse. Summen und Aufstellungsabschnitte werden daraus
abgeleitet und sind nicht eine zweite unabhängig bearbeitbare Quelle.

Jede Aktion erhält eine stabile eindeutige ID, Sitzungs-ID, fortlaufende
Reihenfolge, Spielzeit und Nutzdaten. Ereignisse umfassen Startaufstellung,
Statistikaktion, Wechselgruppe, Uhr-/Abschnittssteuerung und Korrekturen.
Korrekturen referenzieren die ursprüngliche Aktion; sie löschen die Historie
nicht unwiederbringlich. Rückgängig/Korrektur von Wechseln führt zur erneuten
Validierung aller nachfolgenden Aufstellungen.

Die bestehenden `game.playerStats` und Atlas-Daten werden nicht bei jedem
Live-Tipp überschrieben. In der Spielübersicht ist klar erkennbar, ob man die
Live-Auswertung, manuelle Bestandsdaten oder eine Atlas-Analyse betrachtet.
Keine automatische Addition dieser Quellen, da sonst dieselben Treffer doppelt
gezählt werden könnten. Alte Spiele ohne `liveStats` behalten ihr Verhalten.

Ein späterer manueller Abgleich des offiziellen Ergebnisses ändert nicht
rückwirkend einzelne Spieleraktionen. Abweichungen werden sichtbar gemacht,
nicht durch erfundene Treffer ausgeglichen.

## 6. Offline-Sicherung, Synchronisierung und Rechte

- Jede bestätigte Aktion zuerst dauerhaft lokal sichern, erst danach als
  gespeichert anzeigen. Bei Speicherfehlern deutlich warnen; kein falscher
  Erfolgshinweis. Wiederherstellung nach Neuladen testen.
- Unbestätigte Aktionen in einer zusätzlichen lokalen Warteschlange außerhalb
  des durch `applyRemote` ersetzbaren Workspace sichern. Diese Sicherung wird
  nach Team, Spiel und Erfassungssitzung getrennt.
- Beim Synchronisieren lokale und serverseitige Ereignisse anhand ihrer IDs
  abgleichen. Wiederholtes Senden darf keine Doppelzählung erzeugen.
- Ein Serverstand darf lokale unbestätigte Aktionen nicht entfernen. Die
  Warteschlange erst nach bestätigter Übernahme genau dieser Aktionen leeren.
- Pro Spiel ist ein aktives Erfassungsgerät vorgesehen. Parallele Erfassung in
  mehreren Tabs/Geräten wird erkannt, soweit online möglich. Offline ist keine
  globale Sperre garantierbar: konkurrierende Sitzungen nach Verbindung sichtbar
  zur Auflösung anbieten, nicht automatisch zusammenzählen oder überschreiben.
- Spielplanaktualisierung, Atlas-Import und Workspace-Konfliktbehandlung müssen
  die neue Live-Historie erhalten. Dies erfordert gezielte Anpassungen an den
  bestehenden Datenwegen; eine bloße neue Oberfläche reicht nicht.
- Nur entsprechend berechtigte Trainer/Administratoren schreiben. Lesende
  Konten dürfen auch über den Server keine Statistiken verändern.
- Keine fremden Mannschaftsdaten oder sitzungsübergreifenden Aktionen bei
  Konto-/Teamwechsel synchronisieren.

## 7. Spielabschluss und Auswertung

„Spiel beenden“ hält eine laufende Uhr an und verlangt eine Bestätigung.
Danach erscheinen pro Spieler Punkte, Wurfversuche/Treffer und Quoten,
Offensiv-/Defensiv-/Gesamt-Rebounds, Assists, Steals, Blocks, Ballverluste,
Fouls und Einsatzminuten sowie der Aufstellungsverlauf des Teams.

Nachträgliche Änderungen sind über einen ausdrücklichen Korrekturmodus möglich
und bleiben im Protokoll nachvollziehbar. Der Abschlussbericht kennzeichnet
unaufgelöste Datenkonflikte oder ungültige Wechsel, statt korrekte Minuten zu
behaupten. Ein neuer Datei-Export ist nicht Voraussetzung dieser ersten Version.

## 8. Nicht enthalten

- Gegnerstatistiken und detaillierte gegnerische Punktesequenzen.
- Plus/Minus: Ohne gegnerische Punkte samt Spielzeit nicht zuverlässig möglich.
- Automatischer Zugriff auf die andere Ergebnis-App.
- Automatische Ereigniserkennung per Video, Sprache oder Sensor.
- Fernsteuerung von Hallenuhr, Hallenanzeige oder offizieller Shotclock.
- Mehrere gleichzeitig schreibende Statistikführer als regulärer Betriebsmodus.
- Automatische taktische Bewertungen oder KI-Auswertungen der neuen Daten.

## 9. Abnahmekriterien für die spätere Umsetzung

1. Kader/Starting Five auswählen, ein Spiel starten und auf einem schmalen
   Handybildschirm ohne horizontales Scrollen Spieleraktionen erfassen.
2. Treffer, Fehlwürfe und Rebounds korrekt ableiten; Rückgängig und Korrektur
   verändern nur die beabsichtigte Aktion und rechnen Summen erneut aus.
3. Einfache und mehrfache Wechsel validieren; Einsatzminuten anhand vorgegebener
   Spielverläufe einschließlich Pausen, Viertelwechsel und Verlängerung prüfen.
4. Uhr vor- und zurückkorrigieren, auch nahe einem Wechsel; keine negativen
   Minuten oder stillschweigend widersprüchlichen Aufstellungen zulassen.
5. Unterzahl explizit erfassen; bei fünf Spielern die Summenprüfung der Minuten
   erfüllen. Archivierte Spieler bleiben im historischen Bericht sichtbar.
6. Offline erfassen, neu laden, wieder verbinden: alle bestätigten Aktionen
   erhalten, keine Duplikate und keine nachträglich erfundenen Ereignisse.
7. Veralteter Workspace, zweites Gerät, Import und Konto-/Teamwechsel dürfen
   Live-Aktionen nicht stillschweigend löschen oder fremden Teams zuordnen.
8. Bestehende Spiele, manuelle Boxscores und Atlas-Importe weiter nutzbar halten.
9. Schreibrechte, Speicherfehler, nicht unterstützte Browserfunktionen sowie
   Abbruch und Wiederaufnahme mit automatisierten Tests abdecken.
10. Reale Handybedienung prüfen: Uhr anhalten, mehrere Spieler wechseln,
    Statistik buchen und Fehleingabe korrigieren ohne Verlust des Spielstands.

## 10. Nächster Schritt

Dieses Konzept zuerst durchsehen und freigeben. Danach einen separaten
Implementierungsplan mit Arbeitspaketen für Datenmodell/Zeitberechnung,
lokale Sicherung/Synchronisierung, mobile Erfassung und Auswertung erstellen.
Die Umsetzung startet erst nach Prüfung dieses Plans. Diese Datei ist eine
Spezifikation und kein Nachweis, dass die beschriebenen Funktionen bereits
vorhanden sind.
