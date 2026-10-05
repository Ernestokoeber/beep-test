# Training Live

`Training Live` macht einen gespeicherten Trainingsplan während der Einheit direkt ausführbar. Der Einstieg liegt oben in der Trainingsdetailansicht.

## Ablauf

1. Training mit mindestens einem Drill planen.
2. `Training durchführen` öffnen.
3. Pro Block Uhr starten, bei Bedarf Zeit anpassen, bewerten und eine kurze Notiz hinterlegen.
4. Mit `Nächster Block` jederzeit zum nächsten Drill wechseln oder einen Block überspringen. Die Uhr muss dafür weder gestartet noch abgelaufen sein.
5. `Training beenden & speichern` erzeugt die Trainingsauswertung.

Während der Durchführung zeigt die Ansicht immer den aktuellen und den nächsten Drill. Passende Coaching-Points werden aus der Drillbeschreibung und bekannten CourtHub-Schwerpunkten abgeleitet. Für Horns, 5-Out, No Middle und Zoneninhalte kann eine vorhandene oder integrierte Taktik direkt geöffnet werden.

## Persistenz und Offline-Verhalten

Die Durchführung wird als `liveSession` am Training gespeichert. Uhren basieren auf Zeitankern und laufen nach Reload oder kurzzeitigem Hintergrundbetrieb korrekt weiter. Plan, Notizen, Bewertungen, tatsächliche Zeiten und der Abschlussbericht sind deshalb auch nach einem App-Neustart verfügbar. JavaScript und Styles liegen im PWA-Offline-Cache.

## Abschlussbericht

Der Bericht enthält:

- geplante und tatsächliche Gesamtdauer,
- abgeschlossene und übersprungene Blöcke,
- tatsächliche Zeit je Drill,
- Schnellbewertungen (`Funktioniert`, `Wiederholen`, `Problem`),
- Trainernotizen je Block.

Ein abgeschlossenes Training kann über `Live-Auswertung` erneut geöffnet werden. `Neue Durchführung starten` setzt nur die gespeicherte Live-Durchführung zurück; Trainingsplan und Anwesenheit bleiben erhalten.


## Trainerteam

Trainer und Co-Trainer werden pro Termin separat zugeordnet. Die Teilnahme als Spieler ist optional; Details und Prüfläufe: [Trainerteam](COACHING-STAFF.md).
