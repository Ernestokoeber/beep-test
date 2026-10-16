# CourtHub: neuer App-Aufbau und mobile Navigation

Stand: 16. Oktober 2026
Status: Vom Nutzer am 16. Oktober 2026 freigegeben. Erster Umsetzungsschritt (mobile Navigation und Mannschaftsspielerprofile) lokal umgesetzt; weitere App-Bereiche folgen separat.
Ausgangsbasis: `b661372`.

## Ziel und bestätigte Anforderungen

CourtHub soll beim Coaching von Basketballteams aller Alters- und Leistungsstufen helfen. Der Coach möchte KI-Unterstützung mit direkt bedienbaren Trainingsplänen und Taktiken verbinden. Die gesamte App-Struktur soll dafür neu geordnet werden; auf dem Smartphone müssen Wege und Aktionen verständlich sein.

Bestätigt sind:

- Die Auswahl eines Spielers öffnet eine eigene Profilseite.
- Die gleiche Regel gilt für Trainings, Übungen, Taktiken und andere fachliche Detailansichten.
- Neue Inhalte werden nicht unten an die bestehende Übersichtsseite angehängt.
- Jede Detailseite besitzt einen sichtbaren Rückweg.
- Häufige Aktionen und das Öffnen eines ausgewählten Eintrags benötigen einen Tipp.
- Mannschaft und Individualtraining bleiben bewusst getrennte Arbeitsbereiche, entsprechend den bisherigen Nutzerentscheidungen.
- Die Bedienung verwendet Trainersprache.

Die nachfolgenden Hauptbereiche und ihre Bezeichnungen wurden als Grundlage für den ersten Umbau bestätigt.

## Erster Umbau: App-Struktur und Navigation

Der erste zusammenhängende Umbau schafft eine einheitliche Navigation für die vorhandenen Funktionen. Neue KI-Fähigkeiten und die Verallgemeinerung aller Trainingsregeln für weitere Alters- und Leistungsstufen folgen darauf. Bestehende Daten, Rollen, Synchronisierung und laufende Trainingseinheiten müssen dabei erhalten bleiben.

### Mannschaftsbereich

Die untere Navigation enthält fünf feste Ziele. Auswahl und Reihenfolge bleiben auf allen zugehörigen Seiten gleich.

| Ziel | Inhalt |
| --- | --- |
| Heute | Nächster Einsatz, relevante Hinweise und direkte Aktionen für das aktuelle Training oder Spiel |
| Training | Kalender, anstehende und abgeschlossene Einheiten, Trainingsplanung sowie Übungsbibliothek |
| Team | Spielerliste, einzelne Spielerprofile, Spielerentwicklung und Teamkonzept |
| Taktik | Taktikbibliothek, einzelne Spielzüge, visuelle Bearbeitung und Wiedergabe |
| Spiele | Spielübersicht, Vorbereitung, Gegnerinformationen, Live-Begleitung und Nachbereitung |

Die Hauptnavigation enthält keine zweite, lange Liste mit denselben Zielen. Konto und Verwaltung sind über eine feste Schaltfläche im Seitenkopf erreichbar. Dort liegen Einstellungen, Synchronisierung, Sicherungen und die organisatorischen Aufgaben wie Trikots und Kampfgericht. Im konkreten Spiel oder Training können passende Direktlinks auf diese Aufgaben führen.

Trainerbriefing wird beim jeweiligen Einsatz erreichbar. Trainingsplan und Trainingsdurchführung gehören zum Bereich Training. Spielerstatistik gehört ins Spielerprofil; Mannschaftsauswertung und Ranglisten sind Unterseiten von Team. Bestehende Funktionen bleiben erreichbar, erhalten aber einen fachlich passenden Ort.

### Individualtraining

Der Bereichswechsel ist im Seitenkopf eindeutig beschriftet. Er führt bewusst in den anderen Arbeitsbereich.

Das Individualtraining erhält eine eigene feste Navigation mit Heute, Spieler, Einheiten und Entwicklung. Mannschaftsfunktionen erscheinen dort nicht. Das individuelle Spielerprofil und seine Unterseiten verwenden dieselben Bedienregeln wie der Mannschaftsbereich, mit den jeweils erlaubten Inhalten. Spielerkonten behalten ihren eingeschränkten persönlichen Zugang.

## Eine Auswahl öffnet eine Seite

Beispiel für einen Spieler:

`Team → Spielerprofil → Wurfentwicklung → einzelne Messung`

Beispiel für ein Training:

`Training → Training vom 19. Oktober → Trainingsplan → Übung`

Beispiel für eine Taktik:

`Taktik → Spielzug → Bearbeiten oder Abspielen`

Jeder Schritt besitzt einen eigenen Navigationszustand und eine direkt aufrufbare Adresse innerhalb der App. Es entsteht kein zusätzlicher Browser-Tab. Die ausgewählte Seite ersetzt die vorherige Inhaltsansicht und beginnt bei einem Vorwärtsschritt oben.

Eine Listenzeile oder Karte ist direkt antippbar. Ein zusätzlicher Button „Öffnen“ ist dafür nicht erforderlich. Die Profilübersicht bleibt kompakt: Identität, aktueller Fokus, wichtigste Informationen und klar beschriftete Verweise auf Entwicklung, Würfe, Fitness, Notizen und weitere Details. Diese Details erscheinen auf eigenen Seiten.

## Zurück-Verhalten

- Jede Detailseite besitzt oben einen sichtbaren Zurück-Pfeil mit verständlichem Ziel.
- Zurück führt zum tatsächlichen vorherigen Ort innerhalb der App. Wer ein Spielerprofil aus einem Training öffnet, gelangt zurück zu diesem Training.
- Suchtext, Filter, gewählter Zeitraum und Scrollposition einer vorherigen Liste werden wiederhergestellt.
- Bei direktem Aufruf oder Neuladen einer Detailadresse ohne vorhandenen Verlauf führt Zurück zur passenden übergeordneten Übersicht.
- Browser-Zurück und der Zurück-Pfeil der App durchlaufen dieselben fachlichen Seiten.
- Mannschaft und Individualtraining werden nur durch einen bewusst ausgelösten Wechsel verlassen.
- Noch nicht gespeicherte Bearbeitungen bleiben als Entwurf erhalten. Falls dies für einen bestehenden Ablauf nicht möglich ist, wird vor dem Verlassen eine konkrete Entscheidung angeboten.
- Laufende Trainings- und Spieluhren werden durch das Öffnen einer anderen Seite weder beendet noch zurückgesetzt.

## Ein Tipp: Bedeutung und Grenzen

Ein Tipp öffnet den gewählten Eintrag, einen Hauptbereich oder eine sichtbare häufige Aktion. „Training starten“ startet die ausgewählte Einheit; das bloße Öffnen ihrer Detailseite startet sie nicht.

Auf jeder Seite ist die wichtigste Aktion deutlich erkennbar und auf dem Handy gut erreichbar. Zusätzliche Aktionen erhalten beschriftete Zugänge. Löschen, Veröffentlichen und das Übernehmen weitreichender KI-Änderungen behalten eine nachvollziehbare Bestätigung. Nicht jede Funktion wird gleichzeitig auf den Bildschirm gelegt.

## KI und visuelles Arbeiten

„Coach fragen“ ist ein gleichbleibender Zugang auf den relevanten Seiten. Er öffnet eine eigene Seite und übernimmt den aktuellen Kontext, beispielsweise den ausgewählten Spieler oder Trainingsplan. Der Rückweg führt zur ursprünglichen Ansicht einschließlich eines vorhandenen Bearbeitungsentwurfs.

Ein vorgeschlagener Ablauf für später ist: Der Coach beschreibt „Heute nur acht Spieler und ein Korb“, die KI schlägt konkrete Anpassungen am geöffneten Trainingsplan vor und zeigt die betroffenen Übungen und Zeiten. Der Coach prüft und übernimmt diese Änderungen. Die visuelle Bearbeitung bleibt jederzeit unabhängig davon nutzbar.

Der erste Umbau legt den Platz und die Navigation für diese Unterstützung fest. Er verspricht noch keine zusätzliche KI-Funktion. Bestehende KI-Aktionen werden passend eingeordnet; neue Fähigkeiten erhalten einen eigenen fachlichen Entwurf.

## Technische Leitplanken

Die aktuelle App besitzt bereits adressierbare Detailseiten, vermischt sie jedoch mit eingeblendeten Abschnitten, internen Tabs und Scrollaktionen. Der Umbau vereinheitlicht diese Mechanismen anhand eines zentralen Seiten- und Navigationsmodells.

- Gemeinsamer Seitenkopf, Hauptnavigation und Zurück-Verhalten statt einzelner Sonderlösungen pro Modul.
- Bestehende Links werden auf die entsprechende neue Seite abgebildet.
- Formulare, Seitenzustand und Listenposition werden getrennt von den gespeicherten Fachdaten behandelt und nach Nutzer und Arbeitsbereich getrennt gehalten.
- Bestehende Rollenprüfungen gelten auch bei direktem Aufruf einer Unterseite.
- Mobile und Desktop verwenden dieselbe Seitenhierarchie. Desktop darf mehr Platz für Übersichten und den Taktikeditor nutzen.
- Die PWA berücksichtigt neue Dateien und Routen beim Offline-Betrieb und bei Aktualisierungen.

Betroffene Bereiche sind insbesondere `js/app.js`, die Navigation und Vorlagen in `index.html`, die zugehörigen Styles sowie die Ansichten für Spieler, Training, Planung, Individualtraining, Spiele und Taktik. Eine Entscheidung über einen Frameworkwechsel ist damit nicht getroffen; der gewünschte Bedienablauf benötigt diese Entscheidung nicht als Voraussetzung.

## Abnahme

1. Auf einem schmalen mobilen Bildschirm führt ein Tipp auf einen Spieler zur eigenen Profilseite. Die Liste ist dort nicht zusätzlich sichtbar.
2. Zurück stellt Suchtext, Filter und Listenposition wieder her. Derselbe Vorgang funktioniert beim Öffnen aus einem Training.
3. Unterseiten eines Profils sowie Trainings- und Taktikdetails sind direkt aufrufbar; Neuladen zeigt dieselbe fachliche Seite.
4. Jede Detailseite bietet auch ohne vorherigen Verlauf einen verständlichen Rückweg.
5. Mannschaft und Individualtraining behalten ihre jeweils eigene Navigation, einschließlich beim Aufruf von Konto und Unterseiten.
6. Es gibt kein unbeabsichtigtes horizontales Scrollen der App. Interaktive Spielflächen dürfen innerhalb ihres ausdrücklich vorgesehenen Bereichs verschoben und vergrößert werden.
7. Bedienung per Tastatur und Bildschirmleser folgt dem Seitenwechsel; Seitentitel, Fokus und aktive Navigation stimmen überein.
8. Laufende Uhren, gespeicherte Daten, Offline-Eingaben und bestehende Zugriffsrechte bleiben erhalten.
9. Die bestehenden Fachtests und gezielte Browserprüfungen für die neuen Navigationswege bestehen.
10. Der Coach prüft die zentralen Wege zusätzlich auf seinem tatsächlichen Handy. Eine Browseremulation allein bestätigt diese Abnahme nicht.

## Umsetzung in zusammenhängenden Schritten

Zuerst werden Seitenrahmen, Verlauf und Rückwege zusammen mit dem vollständigen Weg Spielerliste → Profil → Unterseite umgesetzt. Anschließend werden Training und Individualtraining sowie Taktik, Spiele und die übrigen Bereiche in diese Struktur überführt. Währenddessen bleiben noch nicht überführte Funktionen erreichbar. Erst die vollständige Überführung der vereinbarten Bereiche erfüllt diesen Entwurf.

Danach folgen das erweiterte Coaching mit KI und die fachliche Anpassbarkeit für unterschiedliche Basketballteams. Die Freigabe des ersten Schritts erfolgte mit dem Auftrag: „Fang mit der mobilen Navigation und den Spielerprofilen an, mit eigenen Seiten und einem richtigen Zurück-Button.“
