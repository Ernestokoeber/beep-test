# Freitag individual

Eigenständiger CourtHub-Arbeitsbereich unter `#/friday-individual`, erreichbar über Startseite und Menü. Dort werden die tatsächlichen Freitagstrainings mit derselben Anwesenheit wie im bisherigen Trainingsbereich geöffnet oder angelegt. Die 500 Karten liegen unter `#/friday-individual/exercises`. Die bisherigen 800 Bibliothekseinträge bleiben unverändert.

## Freitagstraining nach Teilnehmerzahl

Die Startseite zeigt heute und zukünftige Freitagstermine aufsteigend nach Datum und Beginn. Der aktuelle beziehungsweise nächste Freitag hat einen direkten Einstieg: vorhandenen Termin öffnen oder bei fehlendem Termin ausdrücklich anlegen. Vergangene Termine stehen separat in einem zugeklappten Archiv. Es gibt kein späteres Aktivierungsdatum; auch später neu geplante Freitagstrainings nutzen dieselbe Anwesenheitsregel. Bestehende Termine desselben Tages werden wiederverwendet.

Nach der Anwesenheitserfassung gilt die explizite Coach-Vorgabe: **1 bis 9 anwesende Spieler → Freitag individual; ab 10 → reguläres Mannschaftstraining.** Bei 0 Anwesenden werden noch keine Aufgaben verteilt. Die Regel gilt unabhängig von Wochenendspielen ausschließlich für Freitagstermine. Nur `present` zählt; offene, entschuldigte, verletzte oder abwesende Einträge zählen nicht. Verspätete Anwesende zählen mit. Trainer ohne Spielerrolle sind ausgeschlossen, doppelte Spieler-IDs werden einmal gezählt.

Je anwesendem Spieler werden drei Aufgaben aus unterschiedlichen Bewegungsfamilien zur hinterlegten Position vorgeschlagen. `player.position` ist das bestehende Profilfeld; `gamePosition` dient nur als Ersatz bei leerem Feld. Eindeutige Kurzformen, ausgeschriebene Positionen und 1 bis 5 sind unterstützt. Fehlende oder mehrdeutige Zuordnungen werden nicht geraten. Der Coach kann eine Tagesrolle wählen; diese wird unter `training.fridayIndividual.positions` gespeichert und ändert das Spielerprofil nicht. `training.fridayIndividual.rotation` steuert ausdrücklich angeforderte andere Vorschläge. Datum, Position und Rotation liefern eine stabile Auswahl statt wechselnder Aufgaben bei jedem Neuladen.

Die Auswahl berücksichtigt die gesamte anwesende Gruppengröße, vermeidet doppelte Bewegungsfamilien und beginnt ohne fortgeschrittene Varianten. Für jede Position stehen mindestens drei echte Solo-Technikaufgaben zur Verfügung. Passgeber und Verteidiger zählen zur angegebenen Spielerzahl. Gruppen und Körbe werden vom Coach eingeteilt, nicht als unbegrenzt verfügbare Ressourcen angenommen. Der bestehende manuelle Trainingsplan, Wurfwerte und sonstige Daten bleiben beim Umschalten erhalten. Aus der bisherigen Freitags-Anwesenheitsseite und Trainingsübersicht führt ein aktueller Hinweis zu denselben Positionsaufgaben.

Die Sammlung enthält **500 Übungskarten: je 100 für Point Guard, Shooting Guard, Small Forward, Power Forward und Center**. Jede Position hat 20 Bewegungsfamilien mit fünf unterschiedlichen Lernaufgaben: Technikaufbau, Verteidigung lesen, Konter finden, Anschluss verbinden und Spielanwendung. Es sind 100 Grundmoves mit 500 Aufgaben, nicht 500 voneinander unabhängige Grundbewegungen. Rechts und links zählen nicht als zusätzliche Einträge.

Jede Karte erklärt Ziel, Aufbau und tatsächliche Gesamtspielerzahl, vier technische Schritte des Grundmoves, die konkrete Lernaufgabe, Organisation der Durchführung, Entscheidungshinweise, Coaching-Punkte, typische Fehler, Wiederholungen und Pausen, beobachtbare Fortschritte, leichtere und schwierigere Stufen sowie angepasste Freitagsbelastung. Die Aufgaben besitzen eigens formulierte Konter-, Anschluss- und Transferbedingungen pro Bewegungsfamilie. Zusätzliche Mitspieler sind ausdrücklich im Aufbau und im Spielerfilter berücksichtigt. Die Angaben sind anpassbare Trainingsvorschläge; es wird keine bereits erfolgte Coach-Abnahme behauptet.

Filter: Position, Lernaufgabe, Suchtext, Schwerpunkt, verfügbare Spieler und Niveau. Details haben eigene Links, die Auswahl bleibt beim Zurückgehen erhalten. Das bloße Lesen der Sammlung schreibt keine Trainingsdaten. Änderungen der Anwesenheit und Tagesrolle werden über die bestehende Arbeitsplatzspeicherung synchronisiert. Nach dem ersten vollständigen Laden sind Sammlung und gespeicherte Freitagstrainings offline verfügbar.

## Quellen und Einordnung

Die Texte sind eigene CourtHub-Ausarbeitungen. Als Referenz für seitliche Postposition, Jump-Hook, Drop-Step, Up-and-Under und Drop-Step-Konter wurde das vom Coach genannte Video „The Best POST MOVES in Basketball! (EASILY INCREASE PPG)“ von ILoveBasketballTV mit Ryan Razooky anhand des YouTube-Transkripts geprüft: https://www.youtube.com/watch?v=JANMMKsws5E . Die fünf entsprechenden Center-Familien verlinken den Grundmove mit Zeitabschnitt. Für die übrigen Karten wird keine Videoanleitung behauptet.

Weiterführende fachliche Grundlagen: FIBA/WABC-Coachingmaterialien https://about.fiba.basketball/en/wabc-documents und FIBA Official Basketball Rules 2026, insbesondere Standbein, Schrittfolge, Blockstellung und Kontakt: https://about.fiba.basketball/en/services/resource-hub/downloads . Die Sammlung ist kein offizieller oder von FIBA freigegebener Katalog.

## Prüfung

`node scripts/friday-individual-smoke.mjs`: Anzahl, Rollenverteilung, Familien und Lernaufgaben, Anleitungen, Organisation, Filter, Detailansicht, unbekannte Links, sichere Textdarstellung und Offline-Manifest.

`node scripts/friday-training-smoke.mjs`: Grenzfälle 0/1/9/10/11, Wochentag, Trainer und Doppelzählung, echte Anwesenheit, Positionszuordnung, Ressourcen und Solo-Aufgaben, persistierte Tagesrollen, Schutz bestehender Pläne und Messwerte sowie Rollen- und Arbeitsplatzwechsel.

`node scripts/friday-individual-browser.mjs`: eigener Startseiteneinstieg, alle fünf Positionen, Suche und Filter, Details und Zurückzustand bei 320, 390 und 1280 Pixeln; zusätzlich Offline-Neuladen und dunkle Darstellung bei 390 Pixeln. API-Aufrufe sind in diesen Tests isoliert, es werden keine realen Spieler- oder Trainingsdaten geändert.
