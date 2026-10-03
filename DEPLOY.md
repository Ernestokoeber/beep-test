# Produktion auf Vercel und Neon

## 1. Projekt importieren

Das GitHub-Repository `Ernestokoeber/beep-test` in Vercel als neues Projekt importieren. Das Framework-Preset kann auf „Other“ bleiben; Build- und Output-Verzeichnis bleiben leer.

## 2. PostgreSQL verbinden

Im Vercel Marketplace eine Neon-PostgreSQL-Datenbank mit dem Projekt verbinden. Anschließend `schema.sql` einmal in der Neon SQL Console ausführen. Falls die Integration keinen Wert namens `DATABASE_URL` anlegt, den gepoolten Neon-Connection-String unter diesem Namen als Vercel-Umgebungsvariable hinterlegen.

## 3. Geschützte Umgebungsvariablen

Für Production, Preview und Development setzen:

| Variable | Bedeutung |
|---|---|
| `DATABASE_URL` | gepoolte PostgreSQL-Verbindung mit TLS |
| `JWT_SECRET` | mindestens 48 zufällige Bytes, z. B. `openssl rand -base64 48` |
| `GEMINI_API_KEY` | serverseitiger Google-Gemini-Schlüssel |
| `BOOTSTRAP_ADMIN_EMAIL` | E-Mail des reservierten ersten TSV-Administrators |
| `REGISTRATION_INVITE_CODE` | privater Einladungscode für weitere Trainer |
| `TEAM_NAME` | `TSV Lindau Basketball` |
| `TEAM_SLUG` | `tsv-lindau-basketball` |
| `TSV_WEBSITE_API_URL` | vorhandener TSV-Worker für Spielplan und Kalender |
| `ATLAS_API_URL` | Basis-URL der separaten Project-Atlas-Plattform |
| `ATLAS_API_TOKEN` | optionales Bearer-Token für Atlas; aktuell nur als Reserve |
| `ATLAS_WEBHOOK_SECRET` | mindestens 32 zufällige Zeichen für signierte Atlas-Pushes |
| `ATLAS_ACCESS_CLIENT_ID` | Cloudflare-Access-Service-Token-ID für Atlas |
| `ATLAS_ACCESS_CLIENT_SECRET` | Cloudflare-Access-Service-Token-Secret für Atlas |
| `ATLAS_IDENTITY_EMAIL` | Identitätsheader für lokale/direkte Atlas-Tests; hinter Cloudflare Access nicht erforderlich |
| `PUBLIC_APP_URL` | kanonische PWA-Adresse für QR-Codes, z. B. `https://coach.tsv-lindau.de` |

Geheimnisse niemals in Git committen. Nach Änderungen an Variablen neu deployen.

## 4. Erstes Konto und Rollen

Nach dem ersten Produktions-Deployment sofort mit der in `BOOTSTRAP_ADMIN_EMAIL` hinterlegten Adresse das erste Konto erstellen. Nur dieses Konto kann den ersten Administrator anlegen. Weitere Trainer registrieren sich mit dem Einladungscode; Rollen werden danach unter „Konto & Sync“ verwaltet.

## 5. Eigene Adresse

Im Vercel-Projekt unter „Domains“ `coach.tsv-lindau.de` hinzufügen. Beim DNS-Anbieter der Domain den von Vercel angezeigten CNAME-Eintrag setzen und die Prüfung abwarten. Erst wenn Vercel die Domain als gültig markiert, den Link auf der TSV-Webseite von der Übergangsadresse auf `https://coach.tsv-lindau.de` umstellen.

## 6. KI-Betrieb und kontrollierte Abnahme

- KI-Modell: `gemini-3.8-flash`
- Pflichtvariable: `GEMINI_API_KEY`
- Schnellprüfung: `npm run test:ai`
- Limits: Saisonplanung 60 Trainingstermine pro Nutzer und Stunde; alle übrigen KI-Aktionen 30 Anfragen pro Nutzer und Stunde

CourtHub meldet KI-Probleme mit einem stabilen Code und einer `requestId`. Die
wichtigsten Codes sind:

| Code | Bedeutung | Erneuter Versuch |
|---|---|---|
| `AI_TIMEOUT` | Gemini wurde vor dem Vercel-Limit kontrolliert abgebrochen | ja |
| `AI_RATE_LIMIT` | CourtHub- oder Provider-Limit erreicht | später |
| `AI_PROVIDER` | Gemini vorübergehend nicht erreichbar | ja |
| `AI_EMPTY_RESPONSE` | keine verwertbare Kandidatenantwort | ja |
| `AI_TRUNCATED_RESPONSE` | Antwort wurde unvollständig beendet | ja |
| `AI_INVALID_RESPONSE` | JSON, Schema oder Inhalt ist ungültig | nach Prüfung der Eingabe |
| `AI_PROVIDER_REQUEST` | Gemini hat die strukturierte Anfrage abgelehnt | nein; Request-ID prüfen |
| `AI_PROVIDER_AUTH` | Gemini-Schlüssel oder Berechtigung ist ungültig | nein; Konfiguration prüfen |
| `AI_MODEL_UNAVAILABLE` | das konfigurierte Gemini-Modell ist nicht erreichbar | nein; Modellkonfiguration prüfen |
| `AI_INPUT_INVALID` | CourtHub hat unvollständige/zu große Eingaben abgewiesen | nein, Eingabe korrigieren |
| `AI_NOT_CONFIGURED` | `GEMINI_API_KEY` fehlt | nein, Vercel-Konfiguration korrigieren |

Bei einer Fehlermeldung die angezeigte `requestId` kopieren und in Vercel unter
„Logs“ danach suchen. Logs dürfen keine vollständigen Prompts, PDF-Inhalte,
Provider-Rohantworten oder Schlüssel enthalten.

Die Produktionsabnahme erfolgt bewusst mit kleinen Datenmengen in dieser
Reihenfolge:

1. Trainingszusammenfassung erzeugen
2. Taktikerklärung im aktuellen Quick Editor erzeugen
3. kleines PDF importieren und die Schutzvorschau prüfen
4. zwei Saisonwochen planen und eine Fortsetzung nach Neuladen prüfen
5. erst danach eine vollständige Saison planen

## 7. Allgemeine Abnahme

```bash
npm ci
npm run check
```

Danach in einem privaten Browserfenster prüfen:

1. reserviertes Admin-Konto registrieren und anmelden
2. vorhandene lokale Trainingsdaten synchronisieren
3. zweites Konto mit Einladungscode anlegen und Rolle ändern
4. die KI-Abnahme aus Abschnitt 6 in der dort beschriebenen Reihenfolge durchführen
5. TSV-Spielplan synchronisieren und ein Atlas-Paket importieren
6. QR-Code erzeugen, auf einem zweiten Gerät einchecken und Meldung übernehmen
7. Offline-Modus sowie PWA-Installation auf iOS/Android prüfen

## Project Atlas verbinden

Die App erwartet unter `ATLAS_API_URL` den Dienst aus `Ernestokoeber/basketball-ai` und lädt die echte, verifizierbare Spielauswertung über:

```text
GET /api/v1/games/{gameId}/analysis
```

Der derzeitige Vertrag lautet `game-analysis-overview.v1`. Er enthält `latest_job_id`, Scoreboard, Qualitätsbericht, verifizierte Team- und Spielerstatistiken, Review-Zahlen sowie die Event-Timeline. Die Coaching-App übernimmt nur diese geprüften Werte und leitet daraus Trainingsschwerpunkte ab. Offene Review-Events fließen laut Atlas-Vertrag nicht in den Boxscore ein.

In Produktion schützt Cloudflare Access die Atlas-API. Dafür werden `ATLAS_ACCESS_CLIENT_ID` und `ATLAS_ACCESS_CLIENT_SECRET` ausschließlich serverseitig gesetzt. `ATLAS_IDENTITY_EMAIL` ist nur für einen direkt gestarteten lokalen Atlas-Dienst vorgesehen. Niemals Access-Secrets in Browsercode oder Workspace-Daten speichern.

Für die Spielerzuordnung wird im Spielerprofil entweder die exakte `entity_id` aus Atlas oder die Trikotnummer hinterlegt. Die App erkennt zusätzlich die Formen `#11` und `player-11` und übernimmt PTS, FG, FT, REB, AST, STL, BLK, TO und Fouls automatisch in den Spiel-Boxscore.

Bei einer bestehenden Datenbank `schema.sql` erneut ausführen. Alle Befehle sind idempotent; dadurch werden die neuen Tabellen `checkin_links` und `checkin_submissions` ergänzt, ohne Workspace-Daten zu löschen.

Atlas kann alternativ zum Abruf ein freigegebenes Paket an `POST /api/games/atlas-webhook` senden. Das Geheimnis kommt als `X-Atlas-Webhook-Secret` oder Bearer-Token. Die Antwort ist ein Import-Receipt mit Checksumme und neuer Workspace-Version; wiederholte Pakete werden idempotent als `already-imported` bestätigt. Dafür wird zusätzlich `atlas_import_receipts` angelegt.
