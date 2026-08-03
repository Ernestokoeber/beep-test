# KI-Saisonplanung stabilisieren – Design

Stand: 03.08.2026

## Ziel

Die KI-Saisonplanung verarbeitet Termine weiterhin sequenziell in Viererblöcken. Ein veralteter PWA-Cache darf nicht mehr zu einem anderen Client-Verhalten führen. Ungültige oder unvollständige KI-Antworten werden für den betreffenden Block einmal erneut angefordert. Trainings, Drills und Vorlagen werden ausschließlich nach vollständiger, erfolgreicher Planung aller Blöcke übernommen.

## Ausgangslage

`js/seasonplanner.js` verwendet bereits `SEASON_BATCH_SIZE = 4` und sammelt Antworten blockweise. Der Service Worker verwendet derzeit eine manuell gepflegte Cache-Version und teilweise eigene Asset-Query-Parameter. Dadurch können installierte Clients eine frühere JavaScript-Version ausführen. Außerdem wird bislang nur geprüft, ob eine Antwort ein `trainings`-Array besitzt; fehlende, doppelte oder fremde Termine würden erst bei der Übernahme auffallen.

## Architektur

Eine einzige Client-Release-Version wird in `sw.js` definiert. Der Cache-Name und alle versionierten lokalen JavaScript- und CSS-Assets leiten sich daraus ab. Bei einer Änderung der Saisonplanungslogik wird diese Version erhöht; beim Aktivieren entfernt der Service Worker ausschließlich ältere CourtHub-Caches.

`planInBatches(payload, requestBatch, onProgress)` bleibt der Orchestrator für die Sequenz. Für jeden Block gilt:

1. Die Anfrage wird ausgeführt.
2. Die Antwort wird gegen genau die Termine dieses Blocks validiert.
3. Schlägt die Anfrage oder die Validierung fehl, wird derselbe Block genau einmal wiederholt.
4. Schlägt auch der Wiederholungsversuch fehl, bricht die Planung mit einer verständlichen Fehlermeldung einschließlich Blocknummer ab.

Die Antwort eines Blocks ist nur gültig, wenn `data.trainings` ein Array ist und dessen `date`-Werte die erwarteten Slot-Daten exakt einmal enthalten. Zusätzliche, fehlende oder doppelte Daten machen die Antwort ungültig. Die zusammengeführten Antworten werden erst nach dem letzten erfolgreichen Block an `applyAIPlan()` übergeben. Der bereits bestehende atomare Aufruf aus `schedule.js` bleibt damit erhalten.

## Benutzererlebnis und Fehlerbehandlung

Die Fortschrittsanzeige bleibt blockbasiert. Beim Wiederholungsversuch zeigt sie an, dass der aktuelle Block erneut angefragt wird. Nach dem endgültigen Fehlschlag werden keine Trainingsdaten geschrieben; die vorhandenen Trainings, Drills und Vorlagen bleiben unverändert. Die Meldung benennt den betroffenen Block, nicht interne Gemini- oder JSON-Details.

Ein erfolgreicher Retry ist für Trainer transparent außer der Statusmeldung. Keine Antwort wird über Blöcke hinweg gemischt oder teilweise übernommen.

## Tests

Der Smoke-Test ergänzt folgende Fälle:

- Aufteilung in Viererblöcke bleibt unverändert.
- Eine unvollständige oder doppelte Blockantwort wird einmal erneut angefragt und danach vollständig zurückgegeben.
- Zwei ungültige Antworten für einen Block brechen die Planung ab.
- Bei einem endgültigen Blockfehler wird `applyAIPlan()` nicht ausgeführt und keine Teilübernahme ausgelöst.
- Eine gültige Antwort mit fremdem Termin wird abgelehnt.
- Der Service Worker referenziert dieselbe Release-Version für Cache und lokale Assets.

## Abgrenzung

Nicht Bestandteil sind eine Änderung des Neon-Verbindungsstrings, Änderungen der Gemini-Modelle oder -Limits, eine serverseitige Retry-Logik sowie der Ausbau des Taktikboards. Die produktive Prüfung erfordert weiterhin eine eingerichtete Vercel-Umgebung und einen serverseitigen `GEMINI_API_KEY`.
