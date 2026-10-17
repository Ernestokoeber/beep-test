# Kostenloser Datenbankwechsel und Pilot-Wiederherstellung

Stand: 18. Oktober 2026. Auftrag: echte Spieleranmeldung über Link/QR und Rückmeldungen bis Montag; keine zusätzlichen Kosten.

## Genehmigte Wiederherstellung

- Neon Free verweigert SQL-Verbindungen mit `53000`; auch der Export ist blockiert. Ein manueller kostenloser Snapshot wurde angelegt; die Datenbank bleibt erhalten.
- Prisma Postgres wurde nach ausdrücklicher Zustimmung zu Anbieterbedingungen und Metadatenweitergabe im Free-Tarif in Frankfurt bereitgestellt. Der Vercel-Dialog nennt 100.000 Operationen/Monat und 500 MB. Kein kostenpflichtiger Tarif wurde aktiviert.
- Der Nutzer hat einen getrennten Pilotbetrieb mit Wiederherstellung des hier vorhandenen Teamstands genehmigt. Alte Zugangsdaten und ausschließlich in Neon gespeicherte Rückmeldungen können erst nach erneutem Zugriff übernommen werden.
- Der Nutzer hat das neue erste Trainerkonto selbst mit neuem Passwort eingerichtet. Keine Änderung oder Abschwächung des bestehenden Registrierungs-/Rollenvertrags.
- Offizieller CourtHub-Backup-Export gesichert: 27 Spieler, 47 Trainings, 13 Spiele sowie übrige lokale Bereiche. Wiederherstellung im neuen Speicher exakt mit dem Export verglichen. Thomas und Adnan sind der Montagseinheit am 19. Oktober um 20:15 Uhr zugeordnet, beide Pläne vollständig mit 105 Minuten.
- Geheimnisse und Backup-Inhalte liegen ausschließlich im ignorierten lokalen Arbeitsordner; keine Veröffentlichung oder Versionierung.

## Durchgeführte Regressionen

- Echter PostgreSQL-Test zunächst rot: `42P08` bei UUID/Text-Mischung in Terminerinnerungen. Profilparameter explizit als UUID typisiert, auch bei Fokus-Erinnerungen.
- Datumsregression rot: `2026-10-20` wurde in einer Berliner Node-Umgebung als `2026-10-19T22:00Z` ausgegeben. Wochenfokus- und Rückmeldedaten werden als SQL-`DATE::text` transportiert, damit Kalendertage nicht verschoben werden.
- Echter Browserdurchlauf zunächst rot: gespeicherte Spielerrückmeldung fehlte im Trainer-Feedbackbereich. Neue profilgefilterte und escaped Anzeige ergänzt.
- Echtes PostgreSQL mit neuem, zufälligem Testschema: Registrierung, Login, Einmal-Einladung, Zuordnung, Pläne, Rollen-/Datenschutz, Sync, Duplikate, unabhängiger Persistenz-Lesezugriff erfolgreich. Testschema anschließend entfernt.
- Mobiler Browser, echte Handler und echtes PostgreSQL ohne API-Fixtures: QR decodiert, Registrierung, Zusage, Tagesform, 105-Minuten-Plan, Zurück-Navigation, Freitagsfeedback und Anzeige im getrennten Trainerbrowser erfolgreich. Für das Wochenfeedback wird ausschließlich die Browseruhr auf den folgenden Freitag gestellt.
- Unabhängiger Review: Cleanup nach fehlgeschlagener Migration verbessert; danach keine weiteren Befunde.

## Auslieferung und echte Live-Abnahme

- [x] Gesamte Regression nach allen Änderungen erfolgreich (`npm test`, Exit 0).
- [ ] Geprüften Stand mit PWA 243 veröffentlichen; neuen gepoolten Datenbankzugang als Servergeheimnis verwenden, alten Neon-Speicher erhalten.
- [ ] Öffentliche Live-APIs, QR-Registrierung und Rückmeldung gegen produktiven Server mit getrennten synthetischen Testkonten prüfen. Persönliche Einladungen von Thomas/Adnan nicht für Tests verbrauchen.
- [ ] Wiederhergestelltes Trainerkonto auf der öffentlichen App anmelden; Teamstand, Einheiten und Einladungsvorschau prüfen.
- [ ] Abnahmestatus mit genauen Grenzen aktualisieren. Physisches iPhone bleibt von einem emulierten mobilen Browser zu unterscheiden.

## Opt-in-Nachweis

`COURTHUB_REAL_DB_TEST=isolated-schema` plus ausdrücklich gewählte `DATABASE_URL` führt `node scripts/individual-real-db-validation.mjs` aus. `COURTHUB_REAL_DB_BROWSER=1` ergänzt den echten mobilen Browserdurchlauf. Ohne Opt-in startet keine Datenbankprüfung. Die Skripte sind kein Teil des automatisch ausgeführten Standardtests.
