# Mobile Startseite · 17. Oktober 2026

Auftrag: Am Handy sofort den heutigen Tagesplan erkennen und Training oder Spiel mit einem Tipp auf einer eigenen Seite öffnen. Grundlage ist das bestätigte Navigationsdesign vom 16. Oktober.

## Umsetzung

1. Gemeinsames Tagesmodell für Training und Spiel: Datum und Uhrzeit sortieren, laufende Durchführung hervorheben, abgesagte/abgeschlossene Termine nur im Tagesrückblick zeigen. Keine Uhren oder Einsätze durch Lesen starten.
2. Heute-Seite: ein hervorgehobener nächster Einsatz, weitere heutige Termine, nächste Termine, verständliche Leerzustände und direkte Zugänge zu Training, Spielen und Briefing. Ganze Karten sind Links.
3. Auf der Startzentrale ebenfalls zuerst Heute zeigen; die vorhandene Auswahl Mannschaft/Individual darunter behalten. Daten bei Synchronisierung, Tageswechsel und Rückkehr aktualisieren; Listener beim Seitenwechsel entfernen.
4. Domänen- und Browserprüfungen für 320/390/768/1440 px, Dunkelmodus, beide Startadressen, direkte Detailseiten und Zurück-Navigation. Abschließender unabhängiger Gesamt-Review.

## Entscheidungen und Nachweise

- Bestehenden Worktree wiederverwenden, neuer Branch `codex/mobile-home` ab `a5c5375`.
- Die Startzentrale bleibt erreichbar. Heute steht dort vor der Bereichsauswahl, damit auch angemeldete Coaches ihre Termine ohne weiteren Klick sehen.
- Umsetzung und Vorschau lokal; Veröffentlichung ist ein separater Auftrag.
- Offene heutige Termine stehen vor einem eingeklappten Tagesarchiv. Für zukünftige Tage erscheinen jeweils das nächste Training und Spiel; dadurch verdrängen viele Trainings das nächste Spiel nicht aus der Startseite.
- Tests zunächst rot: fehlendes Tagesmodell; später zu lange Terminliste und Fokusverlust der Überschrift. Jeweils gezielt implementiert und grün geprüft.
- `npm test`: vollständig erfolgreich. `npm run test:navigation:browser`: 320/390/768/1440 px einschließlich bestehender Coachingwege erfolgreich. `npm run test:home:browser`: beide Startadressen, leere/belegte Tagesagenda, direkte Trainings-/Spielseiten, Browser-/App-Zurück, Scrollposition, Synchronisierung, Statuswechsel, Dunkelmodus und schmale Touchziele erfolgreich.
- PWA-Prüfung erfolgreich: Version v228, 153 vorhandene Offline-Dateien. Keine zusätzlichen Netzabhängigkeiten.
- Unabhängiger Gesamt-Review: keine wesentlichen Befunde; kleiner Fokusverlust bei Aktualisierung reproduziert und behoben. Überschrift/Terminkarte behalten Fokus, eine fokussierte abgeschlossene Karte bleibt im aufgeklappten Tagesarchiv sichtbar. Zusätzliche Regressionstests grün.
