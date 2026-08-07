# CourtHub Play Designer – Stabilitätsaudit

## Bestätigte Fehler

1. **Aktions-Startzeiten werden nicht an die Schrittdauer gebunden.** Start und Dauer können außerhalb des aktuellen Schritts liegen; die Aktion läuft dann gar nicht oder nur teilweise.
2. **Der Ball bewegt sich schon vor einem Pass.** Ohne eigene Bewegungsaktion wird er zwischen den Schritten linear interpoliert, obwohl der Pass erst später startet.
3. **Spieler ohne Laufweg bewegen sich trotzdem.** Unterschiedliche Positionen in zwei Schritten werden automatisch interpoliert. Nach dem Löschen eines Laufwegs bleibt dadurch eine unerwartete Bewegung bestehen.
4. **Exakte Schrittgrenzen gehören noch zum vorherigen Schritt.** Bei exakt `Schrittdauer` zeigt der Scrubber den alten Schritt statt den folgenden Anfangszustand.
5. **Pause aktualisiert den Play-Button nicht zuverlässig.** Der interne Zustand stoppt, die Oberfläche kann weiterhin das Pause-Symbol zeigen.
6. **Änderungen an der Schrittdauer lassen ungültige Aktionszeiten zurück.** Aktionen können nach einer Verkürzung außerhalb des Schritts liegen.
7. **Die Aktionsliste zeigt keine Zeitspanne.** Dadurch lässt sich nicht kontrollieren, wann eine Aktion tatsächlich beginnt und endet.
8. **Speichern ersetzt den Historienzustand, lässt aber einen alten Redo-Zweig bestehen.**

## Ziel der Reparatur

- Jede Aktion liegt vollständig innerhalb ihres Schritts.
- Startzeit und Dauer werden gemeinsam und nachvollziehbar korrigiert.
- Nur explizit angelegte Laufwege animieren Spieler.
- Der Ball bleibt bis zum Passbeginn am Ausgangspunkt und folgt danach dem Empfänger.
- Schrittgrenzen, Scrubber, Pause und Aktionsanzeige verwenden dieselbe Zeitlogik.
- Smoke-Tests sichern die Timing-Fälle dauerhaft ab.
