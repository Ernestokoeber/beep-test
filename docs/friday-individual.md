# Freitag individual

Eigenständiger CourtHub-Arbeitsbereich unter `#/friday-individual`, erreichbar über Startseite und Menü. Dort werden die tatsächlichen Freitagstrainings mit derselben Anwesenheit wie im bisherigen Trainingsbereich geöffnet oder angelegt. Die 500 Karten liegen unter `#/friday-individual/exercises`. Die bisherigen 800 Bibliothekseinträge bleiben unverändert.

## Freitagstraining nach Teilnehmerzahl

Die Startseite zeigt jeden Freitag ab heute beziehungsweise dem nächsten Freitag lückenlos aufsteigend nach Datum und Beginn, auch wenn noch kein Training gespeichert wurde. Zunächst erscheinen zwölf Wochen; „Weitere 12 Freitage anzeigen“ verlängert die Liste ohne festes Enddatum. Gespeicherte Trainings werden direkt verlinkt, fehlende Termine als „Noch nicht angelegt“ angezeigt und erst bei „Anlegen & öffnen“ mit der tatsächlichen Anwesenheitsliste gespeichert. Das Anzeigen und Erweitern der Liste erzeugt keine Trainingsdaten. Der aktuelle beziehungsweise nächste Freitag hat zusätzlich einen direkten Einstieg. Vergangene Termine stehen separat in einem zugeklappten Archiv. Es gibt kein späteres Aktivierungsdatum; auch später neu geplante Freitagstrainings nutzen dieselbe Anwesenheitsregel. Bestehende Termine desselben Tages werden wiederverwendet, mehrere gespeicherte Trainings am selben Tag bleiben erreichbar.

Nach der Anwesenheitserfassung gilt die explizite Coach-Vorgabe: **1 bis 9 anwesende Spieler → Freitag individual; ab 10 → reguläres Mannschaftstraining.** Bei 0 Anwesenden werden noch keine Aufgaben verteilt. Die Regel gilt unabhängig von Wochenendspielen ausschließlich für Freitagstermine. Nur `present` zählt; offene, entschuldigte, verletzte oder abwesende Einträge zählen nicht. Verspätete Anwesende zählen mit. Trainer ohne Spielerrolle sind ausgeschlossen, doppelte Spieler-IDs werden einmal gezählt.

`player.position` ist das bestehende Profilfeld; `gamePosition` dient nur als Ersatz bei leerem Feld. Eindeutige Kurzformen, ausgeschriebene Positionen und 1 bis 5 sind unterstützt. Fehlende oder mehrdeutige Zuordnungen werden nicht geraten. Der Coach kann eine Tagesrolle wählen; diese wird unter `training.fridayIndividual.positions` gespeichert und ändert das Spielerprofil nicht.

Die Auswahl berücksichtigt die gesamte anwesende Gruppengröße, vermeidet doppelte Bewegungsfamilien und beginnt ohne fortgeschrittene Varianten. Für jede Position stehen mindestens drei echte Solo-Technikaufgaben zur Verfügung. Passgeber und Verteidiger zählen zur angegebenen Spielerzahl. Gruppen und Körbe werden vom Coach eingeteilt, nicht als unbegrenzt verfügbare Ressourcen angenommen. Der bestehende manuelle Trainingsplan, Wurfwerte und sonstige Daten bleiben beim Umschalten erhalten. Aus der bisherigen Freitags-Anwesenheitsseite und Trainingsübersicht führt ein aktueller Hinweis zu denselben Positionsaufgaben.

## Vollständiger Ablauf: Solo → gemeinsame Offense → Solo-Rückkehr

Standard ist **20:15–22:00 Uhr, 105 Minuten**. Der Plan verwendet die gespeicherte Startzeit (sonst 20:15) und eine separat anpassbare Gesamtdauer von 45–180 Minuten. Alle Phasen einschließlich Erklären, Rollenwechsel, Verarbeiten und Pausen ergeben exakt die gewählte Dauer; parallel beschäftigte Spieler werden zeitlich nicht addiert.

| Uhrzeit bei Start 20:15 | Inhalt |
| --- | --- |
| 20:15–20:23 | Aktivierung, Mobilität und Ballkontrolle |
| 20:23–20:33 | Solo-Set A: Bewegung verstehen |
| 20:33–20:43 | Solo-Set B: sicher ausführen |
| 20:43–20:53 | Solo-Set C: Anschluss vorbereiten |
| 20:53–20:56 | Trinken, Bausteine zur Offense zusammenführen |
| 20:56–21:18 | Dieselben Solo-Bausteine gemeinsam und geführt anwenden |
| 21:18–21:36 | Dieselbe Offense gegen die tatsächlich eingeteilten Verteidiger |
| 21:36–21:39 | Trinken und persönliche Korrektur wählen |
| 21:39–21:51 | Solo-Rückkehr: individuell A, B oder C nacharbeiten |
| 21:51–21:56 | Kontrollierte Abschlüsse und Freiwürfe |
| 21:56–22:00 | Cooldown und persönlicher Rückblick |

Der gewählte rote Faden liefert passende, eigens erklärte Solo-Vorbereitungen für alle fünf Positionen und die gemeinsame Angriffsfolge: **Mitte → Pass → Midrange → Rebound**, **Flügel-Cut → Paint lesen → Post-Move**, **Pick-and-Roll**, alternativ Handoff oder Drive/Kick-out. Die letzten beiden verwenden die PnR-Grundvorbereitung und sind als Anschlussvarianten zu coachen. Die individuellen Bewegungen stehen namentlich in der gemeinsamen Anwendung; freie Entscheidungen werden erst gegen echte Verteidigung behauptet. Zu zweit wird eine Teilverbindung geübt, ohne einen dritten Angreifer zu erfinden.

Solo-Sets sind echte Einzelaufgaben ohne Helfer. Jeder nutzt das ganze Solo-Fenster für eigenen Aufbau, ruhiges Wiederholen und kurze Verarbeitung. Für korbgebundene Teile gibt es zusätzliche persönliche Korbfenster; außerhalb dieser Fenster läuft die ausdrücklich beschriebene Trockenform ohne Wurf. Es werden standardmäßig ein, wahlweise zwei sicher getrennte Körbe berücksichtigt. Gleichzeitige Korbgruppen, einzelne Rollenwechsel und Nebenstationen sind vollständig mit den anwesenden Spielern besetzt. Automatisch teilen sich bis zu drei Spieler derselben Position eine Technikgruppe. Gemischte Gruppen bevorzugen Guard, Center/Power Forward und Flügel. Beide Gruppeneinteilungen sind frei änderbar; bei jedem Zeitpunkt gehört jeder Spieler genau einer Aufgabe an.

Je Spieler können A/B/C durch echte Solo-Karten aus der Bibliothek oder durch ausdrücklich ausgewählte Übungen aus seinen zugeordneten Individualplänen ersetzt werden. „Solo-Sets aus Individualplänen auswählen“ lädt nur zugängliche Pläne und ersetzt nichts automatisch. Zuordnung ausschließlich über `individual_profile.player_profile_id`, niemals über Namen. Übernommen werden nur Übungsname, Anweisung, Aufbau, Schritte, Coachinghinweise und Erfolgskriterium samt Herkunft; private Beobachtungen und Messwerte werden nicht kopiert. Bei Individualübungen ohne hinterlegten Teilnehmerbedarf muss der Coach im Set ausdrücklich bestätigen, dass sie ohne Helfer durchführbar sind. Bis dahin bleibt das Set als offen markiert. Die ausgewählte Kopie ist anschließend mit dem Freitagstraining offline verfügbar; der ursprüngliche Individualplan bleibt unverändert.

Gespeichert wird unter `training.fridayIndividual.session`: `durationMinutes`, `courts`, `combination`, `techniqueGroups`, `combinationGroups`, `soloSets`, `focusNotes`, `returnSets`, `importedExercises`. Berechnung und Anzeige allein schreiben keine Daten. Änderungen verwenden die bisherige Speicherung und deren Rollen-/Arbeitsplatzschutz. Bei 10 Anwesenden verschwindet der kleine Gruppenablauf; seine Konfiguration bleibt für eine spätere kleinere Teilnahme erhalten.

Die Sammlung enthält **500 Übungskarten: je 100 für Point Guard, Shooting Guard, Small Forward, Power Forward und Center**. Jede Position hat 20 Bewegungsfamilien mit fünf unterschiedlichen Lernaufgaben: Technikaufbau, Verteidigung lesen, Konter finden, Anschluss verbinden und Spielanwendung. Es sind 100 Grundmoves mit 500 Aufgaben, nicht 500 voneinander unabhängige Grundbewegungen. Rechts und links zählen nicht als zusätzliche Einträge.

Jede Karte erklärt Ziel, Aufbau und tatsächliche Gesamtspielerzahl, vier technische Schritte des Grundmoves, die konkrete Lernaufgabe, Organisation der Durchführung, Entscheidungshinweise, Coaching-Punkte, typische Fehler, Wiederholungen und Pausen, beobachtbare Fortschritte, leichtere und schwierigere Stufen sowie angepasste Freitagsbelastung. Die Aufgaben besitzen eigens formulierte Konter-, Anschluss- und Transferbedingungen pro Bewegungsfamilie. Zusätzliche Mitspieler sind ausdrücklich im Aufbau und im Spielerfilter berücksichtigt. Die Angaben sind anpassbare Trainingsvorschläge; es wird keine bereits erfolgte Coach-Abnahme behauptet.

Filter: Position, Lernaufgabe, Suchtext, Schwerpunkt, verfügbare Spieler und Niveau. Details haben eigene Links, die Auswahl bleibt beim Zurückgehen erhalten. Das bloße Lesen der Sammlung schreibt keine Trainingsdaten. Änderungen der Anwesenheit und Tagesrolle werden über die bestehende Arbeitsplatzspeicherung synchronisiert. Nach dem ersten vollständigen Laden sind Sammlung und gespeicherte Freitagstrainings offline verfügbar.

## Quellen und Einordnung

Die Texte sind eigene CourtHub-Ausarbeitungen. Als Referenz für seitliche Postposition, Jump-Hook, Drop-Step, Up-and-Under und Drop-Step-Konter wurde das vom Coach genannte Video „The Best POST MOVES in Basketball! (EASILY INCREASE PPG)“ von ILoveBasketballTV mit Ryan Razooky anhand des YouTube-Transkripts geprüft: https://www.youtube.com/watch?v=JANMMKsws5E . Die fünf entsprechenden Center-Familien verlinken den Grundmove mit Zeitabschnitt. Für die übrigen Karten wird keine Videoanleitung behauptet.

Weiterführende fachliche Grundlagen: FIBA/WABC-Coachingmaterialien https://about.fiba.basketball/en/wabc-documents und FIBA Official Basketball Rules 2026, insbesondere Standbein, Schrittfolge, Blockstellung und Kontakt: https://about.fiba.basketball/en/services/resource-hub/downloads . Die Sammlung ist kein offizieller oder von FIBA freigegebener Katalog.

## Prüfung

`node scripts/friday-individual-smoke.mjs`: Anzahl, Rollenverteilung, Familien und Lernaufgaben, Anleitungen, Organisation, Filter, Detailansicht, unbekannte Links, sichere Textdarstellung und Offline-Manifest.

`node scripts/friday-training-smoke.mjs`: Grenzfälle 0/1/9/10/11, Wochentag, Trainer und Doppelzählung, echte Anwesenheit, Positionszuordnung, Ressourcen und Solo-Aufgaben, persistierte Tagesrollen, Schutz bestehender Pläne und Messwerte sowie Rollen- und Arbeitsplatzwechsel.

`node scripts/friday-session-plan-smoke.mjs`: lückenlose 105-Minuten-Zeitachse und alternative Dauern; 1–9 Anwesende und 1/2 Körbe ohne Doppelbelegung; Solo-Sets und Solo-Rückkehr; gleichpositionierte und gemischte Gruppen; Offense-Verknüpfung; sichere Individualplan-Auswahl mit Solo-Bestätigung, fehlende Rollen und unveränderte Originalpläne.

`node scripts/friday-individual-browser.mjs`: eigener Startseiteneinstieg, alle fünf Positionen, Suche und Filter, Details und Zurückzustand bei 320, 390 und 1280 Pixeln; zusätzlich Offline-Neuladen und dunkle Darstellung bei 390 Pixeln. API-Aufrufe sind in diesen Tests isoliert, es werden keine realen Spieler- oder Trainingsdaten geändert.
