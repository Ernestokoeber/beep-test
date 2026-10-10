> **Historischer Audit:** Die folgenden Befunde/Tests beziehen sich auf den hier genannten früheren Audit-Commit. Für den PC-Checkpoint vom 07.10.2026 sind [REBUILD.md](REBUILD.md) und das zentrale playbooks-Manifest maßgeblich. Die technische Abnahme dieses neuen Checkpoints ist separat auszuführen.

# Repository-Status – beep-test

**Bestandsprüfung: 07.10.2026**

Grundlage: GitHub-Standardbranch `main`, Commit [`19fa700fe5c7`](https://github.com/Ernestokoeber/beep-test/commit/19fa700fe5c7c3badca08cedf50c704981c91794). Die Angaben beziehen sich auf diesen Snapshot; sie bestätigen keinen aktuellen Live-Betrieb.

## Implementierter Stand

CourtHub 3.1.2: Vanilla-JS-PWA mit Vercel-API/PostgreSQL, Training Live, Spieltag, Live-Boxscore, Taktikboard und KI-Flows. Standardbranch enthält den erfolgreichen Testlauf vom 07.10.2026.

## Dokumentationsabgleich und offene Punkte

- README um Node 24, reproduzierbare Installation und Testgruppen ergänzt.
- CI-Erfolg gilt für den dokumentierten Commit; kein neuer produktiver KI-Aufruf ausgeführt.
- Mehrere ältere Entwicklungsbranches haben eigene Commits und liegen weit hinter main. Vor Branch-Bereinigung Unterschiede prüfen; nichts automatisch gelöscht.
- Keine npm-Advisories im geprüften Lockfile gemeldet; das ist keine Aussage über Anwendungssicherheit oder Live-Konfiguration.

## Verifikation

- Lokaler Aufruf `node scripts/check.mjs`: **statische Prüfungen erfolgreich**. Vollständige npm-Suite nicht erneut ausgeführt; erfolgreicher CI-Lauf am geprüften Head separat verlinkt.

Jüngster gefundener Workflow: [CourtHub Tests](https://github.com/Ernestokoeber/beep-test/actions/runs/37604234593), `completed` / `success`, Branch `main`, Commit `19fa700fe5c7`, gestartet 2026-10-07. Dieser Lauf gehört zum geprüften Codecommit.

| Workflow am geprüften Head | Ergebnis |
|---|---|
| [CourtHub Tests](https://github.com/Ernestokoeber/beep-test/actions/runs/37604234593) | `success` |
| [pages build and deployment](https://github.com/Ernestokoeber/beep-test/actions/runs/37604233213) | `success` |

## Branch-Abgleich

Andere Branches besitzen gegenüber dem Standardbranch eigene Git-Commits. Das kann auch historische/cherry-gepickte Arbeit sein; vor Merge oder Löschung den Diff prüfen. Es wurden keine Branches verändert.

| Branch | Ahead / Behind | Vergleich |
|---|---|---|
| `agent/ball-carrier-dribble` | 5 / 190 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/ball-carrier-dribble) |
| `agent/court-zoom-parquet` | 10 / 208 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/court-zoom-parquet) |
| `agent/play-designer-complete-delete` | 7 / 191 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/play-designer-complete-delete) |
| `agent/play-designer-desktop-layout` | 4 / 193 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/play-designer-desktop-layout) |
| `agent/play-designer-stability-v1` | 14 / 192 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/play-designer-stability-v1) |
| `agent/play-designer-undo-redo` | 7 / 207 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/play-designer-undo-redo) |
| `agent/play-designer-v2` | 11 / 217 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/play-designer-v2) |
| `agent/tsv-coaching-center-v2` | 2 / 249 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/tsv-coaching-center-v2) |
| `agent/video-import-desktop-assignment` | 7 / 195 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/video-import-desktop-assignment) |
| `agent/video-import-desktop-layout` | 2 / 194 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...agent/video-import-desktop-layout) |
| `claude/implement-todo-item-xEiaG` | 2 / 249 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...claude/implement-todo-item-xEiaG) |
| `feat/courthub-offline-pdf` | 7 / 161 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...feat/courthub-offline-pdf) |
| `feat/courthub-p1-editor` | 4 / 162 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...feat/courthub-p1-editor) |
| `fix/courthub-p0-workflow` | 11 / 163 | [Diff](https://github.com/Ernestokoeber/beep-test/compare/main...fix/courthub-p0-workflow) |

## Dependency-Prüfung

Registry-Versionen wurden am Prüftag direkt von npm, PyPI und crates.io abgefragt. „Neueste Version“ ist eine Verfügbarkeitsangabe, keine automatische Upgradeempfehlung. Mindestversionen zeigen **nicht** den tatsächlich installierten Stand. Paket-/Lockfiles wurden nicht aktualisiert.

### npm-Lockfiles

`npm audit --package-lock-only --ignore-scripts --json` wurde ohne `fix` ausgeführt. npm zählt betroffene Pakete einschließlich transitiver Abhängigkeiten; daraus folgt nicht automatisch eine ausnutzbare Anwendungslücke.

| Manifest | Niedrig | Mittel | Hoch | Kritisch | Gesamt |
|---|---:|---:|---:|---:|---:|
| `package.json` | 0 | 0 | 0 | 0 | 0 |

| Betroffenes Paket | Schwere | Advisory / Kette |
|---|---|---|

### Python-/Rust-Pins

Versionierte `requirements*.txt`, `uv.lock` und `Cargo.lock` wurden gegen die [OSV-Datenbank](https://osv.dev/) abgeglichen. Ergebnisse umfassen gegebenenfalls auch Wartungs-/Unmaintained-Hinweise. Aliasse wie GHSA/PYSEC/RUSTSEC können dasselbe Problem beschreiben. Ohne Lockfile/Mindestversions-Auflösung ist keine vollständige transitive Prüfung möglich.

Für die aus diesem Repository abgefragten festen Python-/Rust-Versionen wurden keine OSV-Treffer gemeldet, oder es lagen keine festen Versionen zum Abgleich vor. Dies bestätigt keine vollständige Sicherheitsprüfung einer tatsächlich installierten Umgebung.

### Direkte Deklarationen und Registry-Stand

| Datei | Paket | Deklariert | Direkt gelockt (npm) | Neueste Registry-Version |
|---|---|---|---|---|
| `package.json` | npm: `bcryptjs` | `^2.4.3` | `2.4.3` | [3.0.3](https://registry.npmjs.org/bcryptjs/latest) |
| `package.json` | npm: `fake-indexeddb` | `^6.2.5` | `6.2.5` | [6.2.5](https://registry.npmjs.org/fake-indexeddb/latest) |
| `package.json` | npm: `jsdom` | `^29.1.1` | `29.1.1` | [30.1.2](https://registry.npmjs.org/jsdom/latest) |
| `package.json` | npm: `jsonwebtoken` | `^9.0.2` | `9.0.3` | [9.0.3](https://registry.npmjs.org/jsonwebtoken/latest) |
| `package.json` | npm: `pg` | `^8.12.0` | `8.22.0` | [8.23.1](https://registry.npmjs.org/pg/latest) |
| `package.json` | npm: `playwright` | `1.62.1` | `1.62.1` | [1.63.0](https://registry.npmjs.org/playwright/latest) |
| `package.json` | npm: `qrcode` | `^1.5.4` | `1.5.4` | [1.5.4](https://registry.npmjs.org/qrcode/latest) |
| `package.json` | npm: `three` | `0.180.0` | `0.180.0` | [0.186.1](https://registry.npmjs.org/three/latest) |

## Umfang und Grenzen

Geprüft wurden alle eigenen GitHub-Repositories aus der paginierten Owner-Liste, jeweils der Standardbranch; andere Branches wurden auf Git-Abweichungen verglichen, nicht vollständig erneut als Anwendungen getestet. Betriebszustände externer Provider, personenbezogene Inhalte, Vertrags-/Datenschutztexte und rechtliche Regelkataloge sind nicht fachlich neu abgenommen. Bei der Bestandsprüfung wurden keine Produktivdeployments, Live-Zahlungen, Posts, Mails oder kostenpflichtigen KI-Jobs manuell gestartet. Die Dokumentations-PRs können vorhandene automatische CI- und Vorschau-Deployments auslösen; deren Ergebnisse sind separat vom geprüften Code-Snapshot zu bewerten.

Quellen: Repository-Dateien am oben verlinkten Commit, [GitHub Actions](https://github.com/Ernestokoeber/beep-test/actions), Paketregistries und [OSV](https://osv.dev/). Bei erneuter Prüfung Snapshot, Tests, CI-Zuordnung und Audits gemeinsam aktualisieren.
