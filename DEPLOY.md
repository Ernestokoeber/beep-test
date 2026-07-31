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
| `AI_RATE_LIMIT` | KI-Anfragen pro Nutzer und Stunde, Standard `30` |

Geheimnisse niemals in Git committen. Nach Änderungen an Variablen neu deployen.

## 4. Erstes Konto und Rollen

Nach dem ersten Produktions-Deployment sofort mit der in `BOOTSTRAP_ADMIN_EMAIL` hinterlegten Adresse das erste Konto erstellen. Nur dieses Konto kann den ersten Administrator anlegen. Weitere Trainer registrieren sich mit dem Einladungscode; Rollen werden danach unter „Konto & Sync“ verwaltet.

## 5. Eigene Adresse

Im Vercel-Projekt unter „Domains“ `coach.tsv-lindau.de` hinzufügen. Beim DNS-Anbieter der Domain den von Vercel angezeigten CNAME-Eintrag setzen und die Prüfung abwarten. Erst wenn Vercel die Domain als gültig markiert, den Link auf der TSV-Webseite von der Übergangsadresse auf `https://coach.tsv-lindau.de` umstellen.

## 6. Abnahme

```bash
npm ci
npm run check
```

Danach in einem privaten Browserfenster prüfen:

1. reserviertes Admin-Konto registrieren und anmelden
2. vorhandene lokale Trainingsdaten synchronisieren
3. zweites Konto mit Einladungscode anlegen und Rolle ändern
4. PDF-KI-Import und Taktikerklärung testen
5. Offline-Modus sowie PWA-Installation auf iOS/Android prüfen
