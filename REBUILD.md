# beep-test zuhause wieder aufbauen

Stand: **07.10.2026**. Dieser Nachbau gehört zum gemeinsamen PC-Snapshot `pc-2026-10-07`. Den exakten veröffentlichten Commit und den zu holenden Branch nennt `playbooks/rebuild/manifest.json`. Ein normales `git pull main` kann einen anderen Stand liefern.

## Voraussetzungen und Spezifikation

Node 24.x; npm; Vercel-Runtime für API; PostgreSQL für Serverfunktionen.

Versionen aus Manifesten, Toolchain-Dateien und Lockfiles verwenden. Der Quell-PC hat Windows 11 Pro Build 26100, Intel i5-6500 (4 Kerne), 31,9 GiB RAM und eine RTX 2060. Das sind gemessene Quellwerte, keine belegten Mindestanforderungen. Die Infrastruktur ist pro Projekt einzurichten; Ports aus mehreren Projekten können kollidieren, daher zunächst einzeln starten.

## Quellcode und lokale Arbeiten

Grundlage vor diesem Checkpoint: `c8305fd327c095c162d11c84bf6673dacc65d632`. In diesem Checkpoint gesichert: **1 zuvor lokale geänderte/neue Dateien**. Der Checkpoint enthält Arbeitsstände, die erst nach den folgenden Prüfungen als betriebsbereit gelten. Historische Angaben in REPOSITORY_STATUS.md beschreiben den früheren Audit-Snapshot und ersetzen die Abnahme dieses Checkpoints nicht.

## Einrichtung

Ab dem Repository-Root; Verzeichniswechsel und VM-Vorgaben beachten. Bestehende `.env`-Dateien erhalten und fehlende Werte gezielt ergänzen.

```text
npm ci
```

Vorhandene Konfigurationsvorlagen: `.env.example`.

Benannte Variablen aus den Vorlagen (ohne Werte): `AI_RATE_LIMIT`, `ATLAS_ACCESS_CLIENT_ID`, `ATLAS_ACCESS_CLIENT_SECRET`, `ATLAS_API_TOKEN`, `ATLAS_API_URL`, `ATLAS_IDENTITY_EMAIL`, `ATLAS_WEBHOOK_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `PUBLIC_APP_URL`, `REGISTRATION_INVITE_CODE`, `TEAM_NAME`, `TEAM_SLUG`, `TSV_WEBSITE_API_URL`.

## Start und Prüfung

```text
npm run dev
```

```text
npm test
```

Erfolg bedeutet: benötigte Werkzeuge verfügbar, Lockfiles unverändert installiert, Tests/Build erfolgreich, Dienste erreichbar und ein lokaler Funktionscheck bestanden. Fehlende Zugänge oder nicht ausgeführte Integrationstests als **offen** protokollieren. Keine produktiven Daten durch Seeds ersetzen.

## Daten und Wiederherstellung

PostgreSQL-Dump und Browserdaten/Exporte separat sichern. .env.local lokal einrichten. Für rein statische Ansicht genügt ein lokaler HTTP-Server; er ersetzt die Vercel-API nicht. Der zusätzliche 3D-Arbeitsbranch wird separat im Manifest als Ergänzung geführt.

Erst auf einer getrennten Testkopie wiederherstellen und fachlich prüfen. Ein Clone rekonstruiert Quellcode; Datenbankinhalte, Browserdaten, VM-Festplatten und Passwortspeicher kommen aus getrennten Sicherungen. Eine bereits vorhandene Sicherung dieser Daten wurde durch diesen Checkpoint nicht nachgewiesen.

## Versionierte Abhängigkeiten

SHA-256 der gesicherten Lock-/Requirements-Dateien nach Normalisierung von CRLF auf LF:

| Datei | SHA-256 |
|---|---|
| `package-lock.json` | `8b8d9bf0799c69444207c30d200bda98b50906073a9c5b69b90632292ba06df3` |

## Vertiefende vorhandene Anleitungen

- [DEPLOY.md](DEPLOY.md)
- [MONTAG_DEPLOYMENT.md](MONTAG_DEPLOYMENT.md)
- [REPOSITORY_STATUS.md](REPOSITORY_STATUS.md)
