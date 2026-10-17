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
- [x] Geprüften Stand veröffentlichen; neuen gepoolten Datenbankzugang als Servergeheimnis verwenden, alten Neon-Speicher erhalten. Funktionsabnahme auf PWA 243; anschließende Darstellungsberichtigung mit PWA 244.
- [x] Öffentliche Live-APIs, QR-Registrierung und Rückmeldung gegen produktiven Server mit getrennten synthetischen Testkonten prüfen. Persönliche Einladungen von Thomas/Adnan nicht für Tests verbrauchen.
- [x] Wiederhergestelltes Trainerkonto auf der öffentlichen App anmelden; Teamstand und beide Montagseinheiten prüfen. Nutzer hat sich selbst erfolgreich angemeldet.
- [ ] Abnahmestatus mit genauen Grenzen aktualisieren. Physisches iPhone bleibt von einem emulierten mobilen Browser zu unterscheiden.

## Opt-in-Nachweis

`COURTHUB_REAL_DB_TEST=isolated-schema` plus ausdrücklich gewählte `DATABASE_URL` führt `node scripts/individual-real-db-validation.mjs` aus. `COURTHUB_REAL_DB_BROWSER=1` ergänzt den echten mobilen Browserdurchlauf. Ohne Opt-in startet keine Datenbankprüfung. Die Skripte sind kein Teil des automatisch ausgeführten Standardtests.

## Produktiver Nachweis

- Öffentliche Adresse `https://coach.tsv-lindau.de`: neue Anmeldung, persönliche Einladung und QR-Decodierung, frische Spielerregistrierung, 105-Minuten-Plan und Rückweg, Zusage, Tagesform sowie Freitagsfeedback bis zur Anzeige im getrennten Trainerbrowser erfolgreich. Keine API-Fixtures. Freitagsdatum ausschließlich auf der Testbrowseruhr simuliert.
- Wiederverwendeter Einladungslink wird mit 410 abgewiesen; anonymer Individual-Überblick mit 401. Testorganisation und synthetische Konten entfernt. Reale TSV-Daten unverändert mit 27 Spielern und 13 Spielen nachgewiesen.
- Visuelle Live-Abnahme: dunkle Statusfelder hatten durch einen nicht definierten CSS-Token fast weiße Schrift auf hellem Hintergrund. Durch vorhandenen Farbschema-Token korrigiert, einschließlich Fahrplan/Messwertflächen. Relevante UI- und PWA-Prüfungen sowie unabhängiger Review erfolgreich.
