# KI-Saisonplanung in Blöcken – Design

## Ausgangslage

Die Produktionslogs zeigen einen Vercel Runtime Timeout nach 60 Sekunden. Ein einzelner KI-Aufruf kann bis zu 120 Saisontermine, detaillierte Drillbeschreibungen und für jeden Freitag zwei vollständige Varianten erzeugen. Die bisher angeforderten 32.768 Output-Tokens übersteigen damit praktisch die Laufzeit einer Vercel-Funktion.

Die Neon-SSL-Warnung ist hiervon unabhängig. Sie wird nicht im Rahmen dieser Änderung behandelt, da sie die Saisonplanung nicht beendet.

## Entscheidung

Die Saisonplanung verarbeitet die Termine sequenziell in Blöcken von höchstens acht Slots. Jede Anfrage erhält nur ihren eigenen Block und eine an dessen Umfang angepasste Output-Grenze. Das Frontend zeigt den Fortschritt nach jedem erfolgreich beantworteten Block an.

## Datenfluss

1. `schedule.js` erstellt wie bisher alle planbaren Slots und das vollständige Basispayload.
2. Ein neuer Helfer in `seasonplanner.js` teilt ausschließlich `payload.slots` in Blöcke à acht Termine; alle gemeinsamen Kontextfelder bleiben pro Block erhalten.
3. `schedule.js` ruft `BT.api.ai('planSeason', { data: batch })` für jeden Block nacheinander auf.
4. Die Trainingslisten aller erfolgreichen Antworten werden im Arbeitsspeicher gesammelt.
5. Erst nach dem letzten erfolgreichen Block ruft das Frontend einmal `applyAIPlan()` auf. Dadurch bleibt der Workspace bei einem Blockfehler unverändert.

## Serververtrag

`api/ai/gemini.js` akzeptiert weiterhin dieselbe Aktion `planSeason`. Pro Anfrage gelten höchstens acht Slots und maximal 8.192 Output-Tokens. Die bestehende Validierung, Mitgliedschaft, Rate-Limit-Prüfung und JSON-Prüfung bleiben aktiv.

Eine Saison mit maximal 120 Slots benötigt höchstens 15 Anfragen und bleibt damit innerhalb des standardmäßigen KI-Limits von 30 Anfragen pro Stunde.

## Benutzererlebnis

Während der Planung zeigt der Status für jeden Aufruf beispielsweise „KI plant Block 4 von 13 …“. Nach Erfolg nennt er wie bisher neue, aktualisierte und geschützte Trainings. Bricht ein Block mit einem Fehler ab, zeigt CourtHub dessen Fehlermeldung mit dem Blockhinweis; bereits beantwortete Blöcke werden nicht übernommen.

## Fehlerbehandlung

- Ungültige oder leere Antworten eines Blocks bleiben ein Fehler und führen nicht zu Teilübernahmen.
- Bestehende manuell bearbeitete oder abgeschlossene Trainings bleiben weiterhin durch `applyAIPlan()` geschützt.
- Es gibt keine automatische Wiederholung, damit kein unvorhersehbarer Verbrauch des stündlichen KI-Limits entsteht.

## Testbarkeit

Der Smoke-Test prüft die Aufteilung von 17 Slots in 8, 8 und 1 Termin, die Kontextübernahme je Block und die atomare Übernahme: Bei einem simulierten Fehler darf `applyAIPlan()` nicht aufgerufen werden. Außerdem bleibt der bestehende Saisonplan-Smoketest vollständig grün.

## Abgrenzung

Keine Änderung am Vercel-Limit, Neon-Verbindungsstring, Gemini-API-Key, bestehenden Trainingsdaten oder am PDF-Export.
