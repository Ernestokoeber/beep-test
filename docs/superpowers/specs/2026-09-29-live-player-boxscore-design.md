# CourtHub: vollständige Spielerstatistik und Plus/Minus

Datum: 29.09.2026
Status: Vom Nutzer freigegeben; noch nicht implementiert.
Ausgangsstand: `aed77fb`.

## Ziel und Abgrenzung

Der Coach erfasst auf dem Handy weiterhin ausschließlich individuelle Aktionen
der eigenen Spieler. Pro Spiel werden feste Spieler-ID, Name, Trikotnummer,
Gespielt/DNP, Einsatzzeit, Zweier/Dreier/Freiwürfe als Treffer und Versuche,
OREB/DREB, Assists, Steals, Blocks, Turnovers, persönliche Fouls und Plus/Minus
ausgewiesen. Gegnerische Treffer werden ausschließlich als Teampunkte erfasst.
Keine gegnerischen Spieler, keine externe Ergebnis-API und keine Hallensteuerung.

Der Nutzer hat die Übernahme dieser Angaben und der vorgeschlagenen Tasten
„Gegner +1/+2/+3“ in die Erfassung beauftragt. Diese Spezifikation konkretisiert
insbesondere die sichere Behandlung bestehender Daten und der Ereignisreihenfolge.
Sie ersetzt die Ausschlüsse gegnerischer Punktesequenzen und von Plus/Minus in
Abschnitt 8 der ursprünglichen Live-Spielstatistik-Spezifikation.

## Geprüfter Bestand

- `core.mjs`: Spieler-ID und Name, alle geforderten Wurf- und Aktionszähler vorhanden.
- `view.mjs`: Startkader übernimmt derzeit nur ID und Name, nicht `jerseyNumber`.
  Das Spielerprofil besitzt dieses Feld bereits.
- `clock.mjs`: Einsatzzeit als ganze Millisekunden, validierte Wechsel und
  chronologischer Aufstellungsverlauf vorhanden.
- `report.mjs`: kein ausdrücklicher Einsatzstatus und kein Live-Plus/Minus.
- `merge.mjs`: unveränderliche Sitzungsköpfe, validierter Ereignisabgleich und
  Schutz gegen Datenverlust vorhanden. Das Ereignisformat wird auch serverseitig
  geprüft; die Erweiterung betrifft daher mehr als die Oberfläche.
- Die alte manuelle Boxscore-Tabelle ist eine getrennte Datenquelle. Ihre Werte
  dürfen nicht mit Live-Werten addiert werden.

## Gewählter Ansatz

Gegnerische Treffer als eigene Ereignisse in der vorhandenen Live-Historie
speichern; alle Summen daraus ableiten. So wirken Rückgängig, Korrekturen,
Offline-Sicherung und Synchronisierung auf dieselbe Quelle.

Verworfene Alternativen: Ein unabhängiger gegnerischer Summenzähler verliert die
Zuordnung zu Aufstellungen. Nur den Endstand zu übernehmen erlaubt grundsätzlich
keine individuelle Plus/Minus-Berechnung. Ein zweites Statistiksystem für Gegner
wäre unnötiger Bedienaufwand und liegt außerhalb des Auftrags.

## Spieltagskader und Einsatz

- In der Vorbereitung Trikotnummer aus dem Profil vorbelegen und für dieses Spiel
  editierbar machen. Speicherung im Kadersnapshot, keine Profiländerung.
- `jerseyNumber` als Zeichenfolge behandeln: `0` und `00` sind verschieden.
  Zulässig sind ein bis zwei Ziffern oder `null` für nicht angegeben. Doppelte
  nicht leere Nummern im Spieltagskader zurückweisen; keine Fantasienummern vergeben.
- Kaderkorrekturen umfassen Name und Nummer. Fehlende Felder bei historischen
  Namenskorrekturen dürfen vorhandene Nummern nicht versehentlich entfernen.
- Stabile Spieler-ID bleibt unabhängig von Namen und Trikotnummer erhalten.
- `played` ergibt sich aus Starting Five oder einer wirksamen Einwechslung,
  einschließlich einer Einwechslung ohne anschließend verstrichene Spielzeit.
  Nicht aus gerundeten Minuten ableiten. Korrigierte/aufgehobene Wechsel zählen
  nur in ihrer wirksamen Form.
- Im laufenden Spiel heißt `played=false` „Noch nicht eingesetzt“; nach Abschluss
  „DNP – nicht eingesetzt“. Fehlende Spieler außerhalb des Kaders erscheinen nicht.
- Millisekunden intern beibehalten; zusätzlich `minutesSeconds=floor(minutesMs/1000)`
  in der Berichtsdatenstruktur anbieten. Anzeige bleibt MM:SS.

## Ereignisse und Plus/Minus

- Neue Sitzungen verwenden Sitzungsformat 2, der äußere `liveStats`-Container
  bleibt Version 1. Der neue Validator unterstützt Sitzungen der Versionen 1 und 2.
- Neuer Ereignistyp `opponent-score`, Nutzdaten `{points: 1|2|3}`. Keine Spieler-ID.
  Wie eigene Statistiken erhält er Abschnitt, Restzeit, Sequenz und eindeutige ID.
- Eine explizite Korrektur kann Wert oder Zeitpunkt ändern oder das Ereignis
  aufheben. „Letzte Aktion rückgängig“ berücksichtigt gegnerische Treffer.
- Eigene Treffer liefern +1/+2/+3, gegnerische Treffer −1/−2/−3 für jeden
  zu diesem Zeitpunkt aktiven eigenen Spieler. Fehlwürfe verändern Plus/Minus nicht.
- Die maßgebliche Aufstellung folgt derselben Zeit-/Sequenzregel wie die
  vorhandene Statistikvalidierung: Spielzeit bestimmt den Aufstellungsabschnitt;
  bei identischer Spielzeit entscheidet die Ereignissequenz vor/nach dem Wechsel.
  Nicht nur positive Zeitintervalle verwenden, da Treffer bei stehender Uhr und
  unmittelbar vor/nach Wechseln erfasst werden können.
- Nach einer Zeit-, Treffer- oder Wechselkorrektur Plus/Minus vollständig aus den
  wirksamen Ereignissen neu berechnen. Keine separat editierbaren Summen.
- Ereignisse außerhalb der erfassten Spielzeit zurückweisen. Ungültige korrigierte
  Abläufe, Rechte, ID-Kollisionen und Schreibkonflikte bleiben sichtbar; keine
  stillschweigende Umbuchung auf eine andere Aufstellung.
- DNP-Spieler haben `plusMinus=null`, nicht einen behaupteten Einsatzwert null.

## Vollständigkeit und bestehende Spiele

- Format-1-Sitzungen bleiben unverändert lesbar und mit den bisherigen Aktionen
  fortsetzbar. Sie liefern weiterhin keine belastbare gegnerische Punktesequenz:
  Plus/Minus bleibt `null` mit Hinweis „Nicht verfügbar: Punkteverlauf fehlt“.
  Keine automatische Migration oder nachträgliche Schätzung aus Endständen.
- Gegnertasten stehen für neue Format-2-Sitzungen zur Verfügung. Bei einem alten
  laufenden Spiel die Einschränkung erklären, nicht dessen bisherige Historie löschen.
- Neue Sitzungen weisen den Coach auf die Erfassung sämtlicher Treffer beider Teams
  hin. Während des Spiels heißt der Wert „Vorläufiges Plus/Minus – erfasster Verlauf“.
- Eine sichtbare Vollständigkeitsangabe wird als korrigierbares Ereignis
  `score-coverage` mit `{complete: boolean}` gespeichert. Vorgabe ist nicht bestätigt.
  Beim Abschluss ausdrücklich fragen, ob der gesamte Punkteverlauf erfasst wurde.
  Eine Ablehnung darf den Spielabschluss nicht verhindern.
- Bericht bietet numerisches Plus/Minus als vorläufigen Wert für eingesetzte
  Spieler bei Format 2; nur bei beendetem Spiel und bestätigtem Verlauf ist
  `plusMinusComplete=true`. Bei Format 1 oder DNP bleibt der Wert nicht verfügbar.
  Bestätigung ist eine Coach-Angabe, keine automatische Garantie.
- Nach nachträglichen Änderungen an Treffern, Wechseln oder deren Zeiten ist eine
  frühere Vollständigkeitsbestätigung nicht mehr aktuell. Vorläufig markieren,
  bis nach diesen Änderungen erneut ausdrücklich bestätigt wurde.
- Eine Übereinstimmung mit dem externen Endstand allein bestätigt keine korrekte
  individuelle Zuordnung. Kein automatisches Auffüllen fehlender Treffer.
- Alte Clients dürfen neue Sitzungen nicht bearbeiten oder herunterkonvertieren.
  Formatprüfung muss sicher abbrechen und gespeicherte Daten erhalten. Release
  umfasst Servervalidator, Frontend und aktualisierten Service-Worker-Cache.

## Mobile Oberfläche und Bericht

- Aktive Spieler mit Nummer und Namen anzeigen; Nummer auch in Wechsel- und
  Korrekturauswahl sowie Bericht verwenden. Fehlende Nummer als „ohne Nummer“.
- Gegnertasten in einer klar abgetrennten Gruppe, ohne vorherige Spielerauswahl.
  Eigene Treffer bleiben ausschließlich Spieleraktionen, um Doppelzählung zu vermeiden.
- Oben eigener und gegnerischer erfasster Punktestand, ausdrücklich nicht offiziell.
- Eingabesperre während lokaler Speicherung, bestehende Rechteprüfung und
  Gerätesperre auch für die neuen Aktionen anwenden.
- Bericht enthält alle vom Nutzer geforderten Felder, Einsatzstatus und
  Vollständigkeitskennzeichnung. Keine Vermischung mit Atlas oder manuellem Boxscore.
- 320 und 390 CSS-Pixel ohne horizontales Scrollen prüfen; ausreichend große Tasten.
- Kein neuer Datei-Export als Teil dieser Erweiterung.

## Verifikation und Abnahme

1. `0`, `00`, fehlende, doppelte und ungültige Nummern; Profiländerungen nach dem
   Spiel; Kaderkorrektur erhält ID und nicht geänderte Nummer.
2. Starter, eingewechselter Spieler, nie eingesetzter Spieler und Nullsekundenwechsel;
   Aufhebung eines Wechsels aktualisiert Einsatzstatus.
3. Sämtliche Treffer-/Versuchszähler und weiteren Nutzerfelder mit erwarteten
   konkreten Werten prüfen; MM:SS und ganze Sekunden stimmen überein.
4. Eigener Zweier, gegnerischer Dreier: aktive fünf Spieler jeweils −1.
   Anschließender Wechsel und Freiwurf: nur die neue Aufstellung erhält +1.
5. Treffer unmittelbar vor und nach einem Wechsel bei gleicher Restzeit,
   Unterzahl, Viertelwechsel und Verlängerung korrekt zuordnen.
6. Fehlwurf ohne Änderung; gegnerischen Treffer rückgängig machen oder korrigieren;
   Wechselzeit korrigieren und Plus/Minus neu berechnen.
7. Format 1 ohne erfundene Plus/Minus-Werte; Format 2 mit unbestätigtem,
   bestätigtem und durch nachträgliche Korrektur überholtem Vollständigkeitsstatus.
8. Offline erfassen und neu laden, exakte Empfangsbestätigung, Konfliktabgleich,
   Geräteübernahme, Konto-/Teamwechsel und Serverberechtigungen für neue Ereignisse.
9. Bei stets fünf eingesetzten Spielern entspricht die Summe ihrer Plus/Minus-Werte
   dem Fünffachen der erfassten Punktedifferenz; DNP-Werte nicht als Zahlen mitzählen.
10. Vollständige bestehende Testsuite und reale Browserprüfung in Handybreiten;
    bekannten unabhängigen Taktikboard-E2E-Fehler separat ausweisen.

## Freigabegrenze

Nach Freigabe dieser Datei folgt der konkrete Implementierungsplan mit Tests und
Ausführungsweg. Diese Datei dokumentiert Anforderungen und Entscheidungen,
nicht bereits ausgeliefertes Verhalten.
