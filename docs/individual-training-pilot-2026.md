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

**Produktionsfreigabe weiterhin blockiert:** Der echte Individual-Überblick liefert derzeit `503 DATABASE_QUOTA_EXCEEDED`. Deshalb sind neue Einladungen, reale Registrierungen und das geräteübergreifende Speichern gegen Produktion noch nicht abgenommen. Lokale Tests mit isoliertem Datenbank-/HTTP-Transport und mobile Browserprüfungen sind ausdrücklich kein Nachweis für eine funktionierende Produktionsdatenbank. Keine Migration oder zusätzliche kostenpflichtige Integration wurde aktiviert.

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
