# Vollständiger JSON-Import für CourtHub

## Ziel

Ein CourtHub-Backup soll beim Import denselben vollständigen Teamdatenbestand wiederherstellen, den der Export bereitstellt. Spiele, Kampfgerichte und Saisonphasen dürfen weder beim Ersetzen verworfen noch beim Mergen ignoriert werden.

## Verhalten

Der Import verarbeitet weiterhin Spieler, Beep-Test-Sessions, Trainings, Notizen, Freiwürfe, Drills, Vorlagen und Einstellungen. Zusätzlich verarbeitet er `games`, `tableDuties` und `phases`.

Beim Ersetzen wird jeder dieser Datenbereiche aus dem Backup übernommen. Beim Mergen werden neue Einträge anhand ihrer IDs ergänzt; bereits vorhandene Einträge bleiben unverändert. Einstellungen werden weiterhin zusammengeführt. Der alte browserseitige Gemini-Schlüssel wird weder importiert noch synchronisiert.

Die Entscheidung, ob der Dialog zum Mergen oder Ersetzen erscheint, berücksichtigt alle Teamdatenbereiche. Ein vorhandener Spielplan, ein Kampfgericht oder eine Saisonphase genügt damit bereits, um einen unbeabsichtigten automatischen Ersetzen-Import zu verhindern.

## Fehlerbehandlung

Ungültige oder unvollständige Backups werden wie bisher abgewiesen. Fehlende optionale Listen werden als leere Listen behandelt. Ein abgebrochener oder ungültiger Auswahlwert verändert keine lokalen oder synchronisierten Daten.

## Tests

Der UI-Smoke-Test deckt beide Importmodi ab:

- Ersetzen übernimmt Spiele, Kampfgerichte und Phasen aus einem Backup.
- Mergen ergänzt nur Einträge, deren IDs lokal noch nicht vorhanden sind.
- Bereits vorhandene Daten in mindestens einem der drei Bereiche erzwingen die Merge/Ersetzen-Abfrage.

## Nicht im Scope

Der Import erhält keine neue Oberfläche und keine serverseitige Migrationsroute. Eine Passwort-zurücksetzen-Funktion ist ebenfalls nicht Teil dieser Änderung.
