# CourtHub

Installierbare Basketball-Plattform für das Trainerteam des TSV Lindau. CourtHub bündelt Training, Spielerentwicklung, Beep-Test, Wurfstatistik, Drills, Taktikboard und KI-gestützte Auswertungen.

## Trainerplattform

- modernes TSV-Lindau-Design für Desktop und Smartphone
- installierbare PWA mit Offline-Modus
- Trainerkonten mit den Rollen Administrator, Trainer, Assistenz und Lesender Zugriff
- gemeinsamer PostgreSQL-Workspace mit automatischer Synchronisierung
- Trikotverwaltung mit getrenntem Heim-/Auswärtssatz, Waschdienst, Rückgabefrist und saisonaler Dienstverteilung
- serverseitige Gemini-Anbindung ohne API-Key im Browser
- Vercel-Konfiguration und abgesicherte API-Endpunkte
- Spielplan-Synchronisierung mit der bestehenden TSV-Website-API
- Spielberichte, Boxscores und aus Spielbeobachtungen erzeugte Folgetrainings
- adapterbasierte Project-Atlas-Anbindung mit Revision, Confidence und Provenance
- QR-Selbst-Check-in mit Trainerfreigabe
- Spielerziele, Verfügbarkeit, Trainerfeedback und Einsatzbriefing
- Drag-and-drop-Trainingsplan mit Zeit- und Belastungsübersicht sowie iCal-Export
- vollständige, aufklappbare Übungsanleitungen mit Aufbau, Ablauf, Umfang, Pausen und Coaching in allen Trainingsansichten
- mobiler Coach-Modus „Training Live“ mit aktuellem/nächstem Drill, persistenter Uhr, Schnellbewertung und Trainingsauswertung
- von der KI für jede Spielwoche neu erstelltes 105-Minuten-Stationstraining vor Wochenendspielen mit individueller Belastungsampel
- zentral spezialisierte Basketball-KI für Trainingsplanung, Taktikerklärung, Belastungssteuerung und faktengebundene Auswertung
- synchronisiertes, versioniertes Teamkonzept mit aktiven Taktiken und verbindlichem Strategiewechsel für Trainings- und Spieltags-KI

## Datenfluss

```text
TSV-Website/Worker ── Spieltermine & Ergebnisse ──► CourtHub
Project Atlas ─────── freigegebenes Analysepaket ─► CourtHub
CourtHub ──────────── Trainingsfokus & Entwicklung ► Trainerteam
```

Project Atlas bleibt die führende Analyseplattform. CourtHub startet keine konkurrierende Video-KI, sondern liest den bestehenden Vertrag `game-analysis-overview.v1`, übernimmt ausschließlich verifizierte Boxscores und Events und überführt die Ergebnisse in Trainingspläne. Spieler werden über Atlas-ID oder Trikotnummer zugeordnet. Öffentliche Spielberichte bleiben im Adminbereich der TSV-Webseite. Die abgeschlossene Live-Auswertung bietet dafür einen [Statistikexport im Admin-Importformat](docs/GAME-STATS-EXPORT.md).

## Lokale Entwicklung

```bash
npm ci
cp .env.example .env.local
npm run check
npx vercel dev
```

Vor dem ersten Start `schema.sql` in der PostgreSQL-Datenbank ausführen und die Werte in `.env.local` setzen. Die vollständige Produktionsanleitung steht in `DEPLOY.md`.

Alle Trainingsdaten bleiben im Gastmodus lokal im Browser. Nach der Anmeldung wird der lokale Stand mit dem Team-Workspace abgeglichen.

## Laufzeit und Verifikation

Node.js **24.x** gemäß `package.json` verwenden. `npm run check` deckt Struktur und Kern-Smoke-Tests ab; `npm run test:ai` prüft die KI-API-Flows mit Testfällen. `npm test` führt die vollständige definierte Suite aus. `npm run dev` startet die Vercel-Entwicklungsumgebung; Datenbank und `.env.local` werden für echte Serverfunktionen weiterhin benötigt.

Die nächste fachliche Abnahme und geplante Erweiterungen stehen in [COURTHUB_NEXT_STEPS.md](docs/COURTHUB_NEXT_STEPS.md). Erfolgreiche Smoke-Tests bestätigen keine Live-Analysequalität oder tatsächliche Providerverfügbarkeit.

## Bestandsprüfung

Code-/Dokumentationsabgleich, geprüfter Commit, CI-Zuordnung, Branch-Abweichungen und Dependency-Befunde vom **07.10.2026**: [REPOSITORY_STATUS.md](REPOSITORY_STATUS.md).

## Zuhause nachbauen

Gemeinsamer PC-Stand, Voraussetzungen, Start, Prüfungen und getrennte Datensicherung: [REBUILD.md](REBUILD.md). Zentraler Einstieg: `Ernestokoeber/playbooks`, Branch `docs/repository-audit-2026-10-07`, `rebuild/HOME_SETUP.md`.
