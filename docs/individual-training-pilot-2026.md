# CourtHub Individual Training Pilot 2026

Implementierungsreferenz für die am 15. Oktober 2026 vollständig freigegebene Produktspezifikation.

## Verbindlicher Pilot

- Start: Montag, 19. Oktober 2026
- Dauer: acht tatsächlich durchgeführte Montagseinheiten zu je 105 Minuten
- Feste Startzeit: montags um 20:15 Uhr
- Teilnehmer: Thomas Albrecht und Adnan Gasum, höchstens zwei Spieler je Einheit
- Ressource: ein Korb
- Schließwoche: 2. bis 6. November 2026; der 2. November zählt nicht als Einheit
- Vergleichstests: Einheit 1, Einheit 4 und Einheit 8; Ballkontrolle, beidseitiger Abschluss und Wurf bleiben getrennte Messbereiche
- Mannschaftstraining: ein persönlicher Wochenfokus mit höchstens zwei Hinweisen, keine vorab erfundenen Dienstag-/Freitagübungen

Die versionierten Vorlagen liegen in `api/_lib/individual-pilot.js`. Einheit 1 enthält den vollständigen 105-Minuten-Ablauf. Einheit 4 und 8 sperren den standardisierten Test auf 60 Minuten und halten die folgenden 45 Minuten fachlich getrennt.

## Sicherheits- und Datenregeln

- Die Rolle `player` erhält keinen Zugriff auf den Team-Workspace.
- Spielerzugriffe werden serverseitig immer auf die dem Konto zugeordnete Individualprofil-ID eingeschränkt.
- Coach und Administrator greifen nur innerhalb ihrer Organisation und Coach-Zuordnung zu.
- Private Coach-Notizen und KI-Entwürfe werden nie an Spielerantworten ausgeliefert.
- Nachträgliche Messwert- und Feedbackänderungen benötigen einen Grund und erzeugen unveränderbare Audit-Einträge.
- Offline-Konflikte werden anhand der Server-Eingangszeit entschieden; Gerätezeit bleibt nur Nachweis.
- Abmelden entfernt lokale Individual-Caches und die persönliche Offline-Warteschlange.

### Persönlicher QR-Code und freigegebene Spielerdaten

- Die Oberfläche erstellt für jedes Individualprofil einen eigenen Link mit QR-Code. Beide sind standardmäßig 72 Stunden ab Erstellung gültig; das genaue Ende wird in deutscher Ortszeit angezeigt. Ein Ersatzcode widerruft den bisherigen.
- Der Code ermöglicht genau eine erfolgreiche Kontoregistrierung, auch bei gleichzeitigen Versuchen. Danach bleibt das verknüpfte Spielerkonto bestehen und verwendet E-Mail und Passwort. Eine Einladung für ein bereits verknüpftes Profil wird abgewiesen.
- Der Link ist ein persönlicher Einladungsschlüssel, keine Prüfung der bürgerlichen Identität: Das erste erfolgreich registrierte Konto wird gebunden. Deshalb ausschließlich an den vorgesehenen Spieler weitergeben.
- Spieler erhalten ihren Individualtermin, Teilnahme, Tagesform, eigenen Trainingsplan mit Übungen, persönliche Messwerte, Wochenfokus, eigene Rückmeldungen, Erinnerungen und ausdrücklich freigegebenes Coach-Feedback. Der Wochenfokus beschreibt persönliche Ziele und gibt keine Mannschaftstrainingspläne frei.
- Mannschaftstrainings, Team-Workspace, andere Spielerprofile, Mitgliederverzeichnis, Mannschaftsspiele und Mannschafts-KI bleiben serverseitig gesperrt. Explizite Feldfreigaben entfernen interne Coach-Metadaten; auch als Messwert gespeicherte `trainernotiz`-Einträge werden nicht ausgeliefert. Die Trainervorschau blendet sie ebenfalls aus.
- Bei einem Kontowechsel erhält ein Spieler einen getrennten lokalen Workspace. Ein zuvor geladener Trainer-Workspace wird nicht als Spielerstand aktiviert; veröffentlichte Mannschaftsspielberichte werden für Spieler nicht automatisch geladen.

Nachweise: `scripts/individual-access-policy-smoke.mjs`, UI-Regressionen und echte PostgreSQL-Prüfung einschließlich paralleler Codeerzeugung, paralleler Registrierung, Ablauf, Ersatz und Profilbindung. Der mobile Browser prüft zusätzlich direkte Mannschaftsrouten und fremde Profilrouten.

## Verbindlicher Coach-Ablauf

- Ernesto gelangt nach der Anmeldung in die Startzentrale und wählt dort zwischen den getrennten Arbeitsbereichen **Mannschaft** und **Individual Training**.
- Das Individual-Cockpit zeigt Thomas und Adnan gemeinsam mit nächster Einheit, Zu- oder Absage, Synchronisierungsstatus, offener Rückmeldung, aktuellem Wochenfokus und KI-Status.
- Die Spielerkarte führt in Vorbereitung und Verwaltung der persönlichen Einheit; Einladungsverwaltung bleibt nachgeordnet.
- `Training durchführen` öffnet einen reduzierten Vollbildmodus. Der aktuelle Block steht groß im Fokus, der nächste Block und der gesamte Ablauf bleiben sichtbar.
- Die Durchführung umfasst eine durchgehende Trainingsuhr, Blockuhr, Coaching-Points, Messwerterfassung, Schnellbewertung (`Funktioniert`, `Wiederholen`, `Problem`), Trainernotiz, Taktik-Schnellzugriff, Zeitkorrektur sowie Vor-, Weiter- und Überspringen-Steuerung.
- Beim Abschluss werden tatsächliche Dauer, Bewertung und Notiz je Übung gespeichert; erst danach wird die Einheit abgeschlossen und der private KI-Prozess ausgelöst.

## Erinnerungen

Der serverseitige Scheduler aktiviert montags eine Terminerinnerung 60 bis 120 Minuten vor der festen Startzeit um 20:15 Uhr. Die Dienstagserinnerung entfällt. Freitags wird der persönliche Beobachtungsfokus 60 bis 120 Minuten vor dem Mannschaftstraining um 20:15 Uhr aktiviert; samstags folgt ungefähr um 12:00 Uhr genau eine Rückmeldungsaufforderung. Eine Folgeerinnerung gibt es nicht. Die paarweise angelegten UTC-Zeitfenster fangen die Sommer-/Winterzeit von `Europe/Berlin` ab; die idempotente Verarbeitung verhindert doppelte Auslieferungen. Dashboard-Auslieferung funktioniert unabhängig von Web-Push.

## KI-Lebenszyklus

Nach Abschluss und erfolgreicher Synchronisierung wird je anwesendem Spieler und Einheit genau ein Auftrag angelegt. Der KI-Kontext enthält ausschließlich Daten des betroffenen Spielers. Ergebnisse bleiben privat. Nur ein aktueller vollständiger Entwurf kann Coach-Feedback und Wochenfokus veröffentlichen. Korrekturen markieren aktuelle Entwürfe als veraltet; eine neue Version entsteht nur durch den manuellen Neuerzeugungsbefehl.

## Abnahme

### Spielerzugang und Vorschau – Stand 18. Oktober 2026

- Neue persönliche Einladungen öffnen `/#/join/TOKEN` und ein eigenes Spielerformular. Der Token steht im Fragment; QR-Bild und Link enthalten dieselbe Adresse. Bestehende Query-Einladungen werden auf diesen Einstieg umgestellt.
- Vor dem Formular prüft `/api/individual/invite` die Gültigkeit, Verwendung, Widerruf, Frist und freie Profilzuordnung. Die eigentliche Registrierung löst die Einladung weiterhin innerhalb der Datenbanktransaktion ein und vergibt ausschließlich die Rolle `player`.
- Spieler öffnen unter `#/individual` ihren Termin, Teilnahme, Tagesform, Wochenfokus, Erinnerungen und freigegebenes Feedback. `#/individual/training` zeigt den gespeicherten Plan mit Übungen; `#/individual/progress` zeigt ausschließlich ihre erfassten Messwerte und Einheiten. Die mobile Navigation bietet vier direkte Ziele einschließlich Konto.
- Coaches öffnen bei einem Profil „Spieleransicht ansehen“. Diese Vorschau verwendet denselben Renderer und zeigt auch die tatsächlichen Eingabemasken; sämtliche Formulareingaben sind deaktiviert. Private Coach-Notizen, private KI-Entwürfe und andere Spielerwerte sind ausgeschlossen.
- `#/individual/preview` ist eine ausdrücklich markierte Beispielvorschau für Coaches. Sie enthält den verbindlichen 105-Minuten-Plan der ersten Einheit und keine echten Messwerte oder freigegebenen Rückmeldungen. Sie ersetzt keine erfolgreiche Einladung.
- Persönliche Offline-Eingaben bleiben bei Netz- und Kontingentfehlern erhalten. Ältere Warteschlangen werden erst nach bestätigter Serveridentität und passender persönlicher Sitzung/Fokuszuordnung übernommen; nicht zuordenbare Altbestände bleiben erhalten und werden angezeigt.

**Bisheriger Produktionsblocker:** Neon verweigert wegen des erschöpften Transferkontingents auch den Export (`53000`, öffentlich `503 DATABASE_QUOTA_EXCEEDED`). Nach ausdrücklicher Zustimmung wurde Prisma Postgres Free in Frankfurt bereitgestellt und ein getrennter Pilotbetrieb aus dem vorhandenen lokalen Team-Backup vorbereitet. Der Nutzer hat sein neues Trainerpasswort selbst eingerichtet. Die alte Neon-Datenbank und ein zusätzlicher Snapshot bleiben erhalten; ausschließlich dort vorhandene alte Anmeldedaten und Rückmeldungen sind noch nicht migriert. Es wurde kein kostenpflichtiger Tarif aktiviert.

Die neue Prüfung `scripts/individual-real-db-validation.mjs` verwendet echte PostgreSQL-Verbindungen in einem ausdrücklich freigegebenen, zufälligen Testschema. Sie bestätigt Registrierung, Login, Einmal-Einladung, Profilbindung, 105-Minuten-Pläne, Rückmeldungen, wiederholte Offline-Batches und Persistenz aus einer unabhängigen Verbindung. Mit `COURTHUB_REAL_DB_BROWSER=1` prüft sie zusätzlich die mobile Oberfläche und einen getrennten Trainerbrowser ohne API-Fixtures. Die Live-Abnahme bleibt ein eigener Schritt; ein physisches iPhone ist damit nicht geprüft.

Dabei korrigierte Fehler: UUID/Text-Konflikt in Erinnerungsabfragen; Zeitzonenverschiebung bei SQL-Kalendertagen; fehlende Anzeige eingegangener Spielerrückmeldungen im Trainer-Feedbackbereich. Umsetzung und Nachweise stehen im [Wiederherstellungsplan](superpowers/plans/2026-10-18-free-database-pilot-recovery.md).

**Produktive Funktionsabnahme erfolgreich:** Der vollständige Ablauf lief anschließend über die öffentliche App und ihre realen Serverfunktionen mit gesonderten synthetischen Konten: QR-Decodierung, neue Spielerregistrierung, eigene Trainingsseiten und Rückwege, Zusage, Tagesform und Rückmeldung bis in einen getrennten Trainerbrowser. Die Testkonten wurden entfernt, der wiederhergestellte Teamstand blieb erhalten. Ernesto hat sich selbst erfolgreich mit seinem neuen Trainerpasswort angemeldet; beide realen Pilotprofile zeigen Montag, 19. Oktober, 20:15 Uhr. Das physische iPhone wurde nicht ferngesteuert geprüft. Persönliche Einladungscodes der realen Pilotspieler werden nicht für Testregistrierungen verbraucht.

Zusätzliche technische Nachweise: `scripts/individual-invite-smoke.mjs`, `scripts/individual-registration-smoke.mjs`, `scripts/individual-player-validation-smoke.mjs`, `scripts/individual-review-regression.mjs` und `scripts/individual-player-browser.mjs`. Der Browsertest decodiert das tatsächlich serverseitig erzeugte QR-Bild mit ZXing-C++ und öffnet die enthaltene Route mit einem frischen Browserkontext. Die PostgreSQL-Produktionsverbindung und ein physisches iPhone bleiben gesonderte Abnahmeschritte.

| Bereich | Automatischer Nachweis |
| --- | --- |
| Domäne, Kapazitäten, 105-Minuten-Vorlagen, DST | `scripts/individual-training-domain-smoke.mjs` |
| Rollen, Isolation, Teilnahme, Änderungsgrund | `scripts/individual-training-api-smoke.mjs` |
| KI-Vertrag und Freigabesperre | `scripts/individual-training-ai-smoke.mjs` |
| Scheduler und Dashboard-Fallback | `scripts/individual-training-reminders-smoke.mjs` |
| Rollenansichten, Offline-Queue und Logout | `scripts/individual-training-ui-smoke.mjs` |
| Gesamte Regression | `npm test` |

Migration, Rückweg, Web-Push-Ablehnung, Netzunterbrechung und echte Mobilgeräte werden vor Produktion in einer getrennten Umgebung mit geeigneten Testdaten geprüft. Keine Migration oder Pilotzuordnung wird durch den normalen Deployment-Build automatisch gegen Produktion ausgeführt.

QR-Testvoraussetzung neben dem gebündelten Python/OpenCV: `python -m pip install -r scripts/requirements-qr-validation.txt`. Ein bei der Live-Abnahme zufällig erzeugter, gültiger Code wurde von OpenCV nicht erkannt, von ZXing-C++ korrekt gelesen. Der Abnahmetest verwendet deshalb ZXing-C++ als unabhängigen Decoder; an den produktiven QR-Bildern wurde dafür nichts verändert.
