# Freitag individual

Eigenständiger CourtHub-Arbeitsbereich unter `#/friday-individual`, erreichbar über die Startseite „Arbeitsbereich wechseln“ und das Menü. Keine Zuordnung zu Mannschafts- oder bestehenden Individualplänen. Die bisherigen 800 Bibliothekseinträge bleiben unverändert.

Die Sammlung enthält **500 Übungskarten: je 100 für Point Guard, Shooting Guard, Small Forward, Power Forward und Center**. Jede Position hat 20 Bewegungsfamilien mit fünf unterschiedlichen Lernaufgaben: Technikaufbau, Verteidigung lesen, Konter finden, Anschluss verbinden und Spielanwendung. Es sind 100 Grundmoves mit 500 Aufgaben, nicht 500 voneinander unabhängige Grundbewegungen. Rechts und links zählen nicht als zusätzliche Einträge.

Jede Karte erklärt Ziel, Aufbau und tatsächliche Gesamtspielerzahl, vier technische Schritte des Grundmoves, die konkrete Lernaufgabe, Organisation der Durchführung, Entscheidungshinweise, Coaching-Punkte, typische Fehler, Wiederholungen und Pausen, beobachtbare Fortschritte, leichtere und schwierigere Stufen sowie angepasste Freitagsbelastung. Die Aufgaben besitzen eigens formulierte Konter-, Anschluss- und Transferbedingungen pro Bewegungsfamilie. Zusätzliche Mitspieler sind ausdrücklich im Aufbau und im Spielerfilter berücksichtigt. Die Angaben sind anpassbare Trainingsvorschläge; es wird keine bereits erfolgte Coach-Abnahme behauptet.

Filter: Position, Lernaufgabe, Suchtext, Schwerpunkt, verfügbare Spieler und Niveau. Details haben eigene Links, die Auswahl bleibt beim Zurückgehen erhalten. Der Bereich schreibt keine Trainings-, Spieler- oder Bibliotheksdaten. Nach dem ersten vollständigen Laden ist er durch den Service Worker offline verfügbar.

## Quellen und Einordnung

Die Texte sind eigene CourtHub-Ausarbeitungen. Als Referenz für seitliche Postposition, Jump-Hook, Drop-Step, Up-and-Under und Drop-Step-Konter wurde das vom Coach genannte Video „The Best POST MOVES in Basketball! (EASILY INCREASE PPG)“ von ILoveBasketballTV mit Ryan Razooky anhand des YouTube-Transkripts geprüft: https://www.youtube.com/watch?v=JANMMKsws5E . Die fünf entsprechenden Center-Familien verlinken den Grundmove mit Zeitabschnitt. Für die übrigen Karten wird keine Videoanleitung behauptet.

Weiterführende fachliche Grundlagen: FIBA/WABC-Coachingmaterialien https://about.fiba.basketball/en/wabc-documents und FIBA Official Basketball Rules 2026, insbesondere Standbein, Schrittfolge, Blockstellung und Kontakt: https://about.fiba.basketball/en/services/resource-hub/downloads . Die Sammlung ist kein offizieller oder von FIBA freigegebener Katalog.

## Prüfung

`node scripts/friday-individual-smoke.mjs`: Anzahl, Rollenverteilung, Familien und Lernaufgaben, Anleitungen, Organisation, Filter, Detailansicht, unbekannte Links, sichere Textdarstellung und Offline-Manifest.

`node scripts/friday-individual-browser.mjs`: eigener Startseiteneinstieg, alle fünf Positionen, Suche und Filter, Details und Zurückzustand bei 320, 390 und 1280 Pixeln; zusätzlich Offline-Neuladen und dunkle Darstellung bei 390 Pixeln. API-Aufrufe sind in diesen Tests isoliert, es werden keine realen Spieler- oder Trainingsdaten geändert.
