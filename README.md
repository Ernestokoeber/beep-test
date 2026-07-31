# TSV Lindau Basketball · Coaching Center

Installierbare Trainings-PWA für das Basketball-Trainerteam des TSV Lindau. Sie bündelt Training, Spielerentwicklung, Beep-Test, Wurfstatistik, Drills, Taktikboard und KI-gestützte Auswertungen.

## Neu in Version 2

- modernes TSV-Lindau-Design für Desktop und Smartphone
- installierbare PWA mit Offline-Modus
- Trainerkonten mit den Rollen Administrator, Trainer, Assistenz und Lesender Zugriff
- gemeinsamer PostgreSQL-Workspace mit automatischer Synchronisierung
- serverseitige Gemini-Anbindung ohne API-Key im Browser
- Vercel-Konfiguration und abgesicherte API-Endpunkte

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local
npm run check
npx vercel dev
```

Vor dem ersten Start `schema.sql` in der PostgreSQL-Datenbank ausführen und die Werte in `.env.local` setzen. Die vollständige Produktionsanleitung steht in `DEPLOY.md`.

Alle Trainingsdaten bleiben im Gastmodus lokal im Browser. Nach der Anmeldung wird der lokale Stand mit dem Team-Workspace abgeglichen.
