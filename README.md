# CourtHub

Installierbare Basketball-Plattform für das Trainerteam des TSV Lindau. CourtHub bündelt Training, Spielerentwicklung, Beep-Test, Wurfstatistik, Drills, Taktikboard und KI-gestützte Auswertungen.

## Trainerplattform

- modernes TSV-Lindau-Design für Desktop und Smartphone
- installierbare PWA mit Offline-Modus
- Trainerkonten mit den Rollen Administrator, Trainer, Assistenz und Lesender Zugriff
- gemeinsamer PostgreSQL-Workspace mit automatischer Synchronisierung
- serverseitige Gemini-Anbindung ohne API-Key im Browser
- Vercel-Konfiguration und abgesicherte API-Endpunkte
- Spielplan-Synchronisierung mit der bestehenden TSV-Website-API
- Spielberichte, Boxscores und aus Spielbeobachtungen erzeugte Folgetrainings
- adapterbasierte Project-Atlas-Anbindung mit Revision, Confidence und Provenance
- QR-Selbst-Check-in mit Trainerfreigabe
- Spielerziele, Verfügbarkeit, Trainerfeedback und Einsatzbriefing
- Drag-and-drop-Trainingsplan mit Zeit- und Belastungsübersicht sowie iCal-Export

## Datenfluss

```text
TSV-Website/Worker ── Spieltermine & Ergebnisse ──► CourtHub
Project Atlas ─────── freigegebenes Analysepaket ─► CourtHub
CourtHub ──────────── Trainingsfokus & Entwicklung ► Trainerteam
```

Project Atlas bleibt die führende Analyseplattform. CourtHub startet keine konkurrierende Video-KI, sondern liest den bestehenden Vertrag `game-analysis-overview.v1`, übernimmt ausschließlich verifizierte Boxscores und Events und überführt die Ergebnisse in Trainingspläne. Spieler werden über Atlas-ID oder Trikotnummer zugeordnet. Öffentliche Spielberichte bleiben im Adminbereich der TSV-Webseite.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local
npm run check
npx vercel dev
```

Vor dem ersten Start `schema.sql` in der PostgreSQL-Datenbank ausführen und die Werte in `.env.local` setzen. Die vollständige Produktionsanleitung steht in `DEPLOY.md`.

Alle Trainingsdaten bleiben im Gastmodus lokal im Browser. Nach der Anmeldung wird der lokale Stand mit dem Team-Workspace abgeglichen.
