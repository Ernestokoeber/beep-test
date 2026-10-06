# Mobile Coaching-Oberfläche

Stand: 06.10.2026

Die Startseite zeigt den nächsten Trainingstermin, das nächste Spiel, kurze offene Hinweise und den Einstieg ins Trainerbriefing. Das Training öffnet die Trainingsübersicht; das Spiel öffnet seine Vorbereitung. Ein Termin wird dadurch nicht gestartet oder freigegeben.

Die mobile Schnellnavigation enthält **Start, Training, Spiele, Mehr**. Über Mehr oder das Hamburger-Menü sind alle weiteren Bereiche erreichbar. Das Menü enthält eigene Einträge für Trainerbriefing (`#/briefing`), Statistik und Ranglisten (`#/statistics`) sowie Daten und Export (`#/data`). Auswertungen, Wurfkarten und Exportaktionen werden auf der Startseite nicht gerendert.

## Details im aktuellen Bereich

Das Hamburger-Menü bietet kontextabhängige Aktionen. Die zugehörigen Daten und bisherigen Speicherfunktionen bleiben bestehen.

- Training: Wurferfassung, Fitness, Sprints, Wurfkarte, Notizen, Planeditor, Trainingsauswertung, Timer, Terminänderungen und Export. Die Übersicht zeigt den Ablauf; Anwesenheit und gegebenenfalls Belastung bleiben direkt erreichbar.
- Spiele: Trainingsspiel und Atlas-Import, Konfiguration von Mannschaft und Liga sowie beim ausgewählten Spiel Videoanalyse und Boxscore.
- Spielerprofil: detaillierte Spielerstatistik, Wurfkarte, Fitness und Verlauf.
- Trainingsplanung: reguläre Trainingszeiten, Saisonplanung und Teamkonzept, PDF-Import. `#/schedule/team-concept` öffnet das Teamkonzept direkt.

Die Detailgruppen sind auf dem Handy zunächst ausgeblendet. Eine Menüaktion öffnet die gewünschte Gruppe. Desktopansichten behalten diese Gruppen sichtbar. Druckausgaben enthalten auch die ausgeblendeten Detailgruppen.

## Anwesenheitsrangliste

Die Rangliste berücksichtigt die ausgewählte Saison und abgeschlossene Trainings. Abgesagte Trainings, fehlende oder offene Statusangaben und reine Trainerrollen zählen nicht als Spielertermine. Verletzte und entschuldigte Termine bleiben als dokumentierte Statusangaben erfasst; fehlende Angaben werden nicht als Fehlzeiten ergänzt.

Ein Spieler benötigt mindestens **fünf dokumentierte Termine**, um einen Rang zu erhalten. Die Reihenfolge richtet sich zuerst nach tatsächlichen Teilnahmen, danach nach der ungerundeten Anwesenheitsquote. Weitere Gleichstände werden über die Datenmenge und den Namen aufgelöst. Die Oberfläche zeigt Teilnahmen und Datenbasis, beispielsweise `8 Teilnahmen · 8/10 · 80 %`.

Weniger als fünf dokumentierte Termine erscheinen in einer separaten Liste **ohne Rang**. Damit verdrängt `1/1 = 100 %` weder `8/10` noch `5/5`. Diese Darstellung misst Trainingsbeteiligung, keine sportliche Leistung.

## Trainerbriefing

Das Briefing bündelt Schwerpunkt, vorhandene Planungsgrundlagen, aktuelles Teamkonzept, Ablauf und Coaching-Punkte, Teilnahme und Einschränkungen, Belastungshinweise, Trainerteam, aktive Spielerziele und den im Trainingsplan gespeicherten Gegnerplan. Aufgaben werden ausdrücklich als Vorschläge gekennzeichnet. Fehlende Inhalte werden benannt, nicht erfunden. Beim Teilen wird der aktuelle Datenstand erneut gelesen.

## Prüfung

- `npm test`: bestehende Prüfungen und zusätzliche Tests für Briefing und Anwesenheitsrangliste.
- `scripts/browser-e2e.mjs`: zusätzliche mobile Browserläufe auf iPhone und 320 Pixeln für Startseite, Hamburger-Menü und Mehr, Detailzugriffe, Rangliste, Trainerbriefing, Daten und Export sowie Reload. Bestehende Live- und Matchday-Läufe bleiben erhalten.

Der Offline-Cache wird mit der Änderung auf `courthub-v182` angehoben.
