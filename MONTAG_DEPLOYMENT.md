# CourtHub – Produktionsbereitstellung am Montag

Stand: 1. August 2026

Repository: `https://github.com/Ernestokoeber/beep-test`

Branch: `main`

Letzter veröffentlichter Funktions-Commit: `113d40ffd7945b7af69a4a0129b7cadd9a67c259` (`Add AI season planning`)

## Ziel

CourtHub soll nicht länger nur als statische GitHub-Pages-PWA laufen, sondern vollständig mit Backend bereitgestellt werden. Danach sollen Anmeldung, Team-Synchronisierung, offizieller Herren-Spielplan, Gemini-KI, QR-Check-in und KI-Saisonplanung online funktionieren.

Geplante Produktionsadresse:

```text
https://coach.tsv-lindau.de
```

## Wichtiger aktueller Stand

Der Quellcode ist auf `main` veröffentlicht. Die statische Oberfläche kann über GitHub Pages geladen werden. GitHub Pages führt jedoch keine Dateien aus dem Ordner `api/` aus. Deshalb funktionieren dort derzeit unter anderem folgende Funktionen nicht vollständig:

- Registrierung und Anmeldung
- gemeinsamer Team-Workspace
- Synchronisierung zwischen mehreren Trainern und Geräten
- offizieller Spielplan-Sync über `/api/games/sync`
- Gemini-KI über `/api/ai/gemini`
- serverseitiger QR-Check-in
- Project-Atlas-Abruf und Webhook

Das ist kein Fehler der Spielplanlogik. Es fehlt die laufende Backend-Bereitstellung.

## Bereits implementierte Funktionen

### Offizieller Herren-Spielplan

- Quelle: DBB TeamSL
- Liga-ID: `54509`
- Liga: `Bezirksklasse Herren Süd 26/27`
- Saison: `2026/2027`
- Team: `TSV Lindau`
- permanente Team-ID: `258298`
- TeamSL-Saisonteam-ID: `450472`
- Verein-ID: `1498`
- 12 TSV-Lindau-Spiele
- erstes Spiel: `11.10.2026`
- letztes Spiel: `06.03.2027`
- offizieller Link: `https://www.basketball-bund.net/static/#/liga/54509/spielplan`
- offizieller JSON-Endpunkt: `https://www.basketball-bund.net/rest/competition/spielplan/id/54509`

Der Server-Endpunkt `api/games/sync.js` liest TeamSL direkt aus. Er verwendet stabile offizielle Spiel-IDs, erkennt Verlegungen, Ergebnisse und Absagen und filtert nur die konfigurierte Mannschaft.

### Konfiguration für andere Trainerteams

Unter `Spiele & Atlas` kann jedes Team seinen eigenen offiziellen Spielplan konfigurieren:

- TeamSL-Spielplan-Link
- Liga-ID, automatisch aus dem Link gelesen
- Team-ID, optional
- exakter Teamname

Die Konfiguration wird im gemeinsamen Team-Workspace gespeichert.

### KI-Saisonplanung

Die Saisonplanung befindet sich derzeit unter:

```text
Hamburger-Menü → Trainingsplan → KI-Saisonplanung
```

Ablauf nach erfolgreicher Backend-Bereitstellung:

1. Offiziellen Spielplan synchronisieren.
2. Bayerische Schulferien und Feiertage berücksichtigen.
3. Dienstags und freitags Trainingstermine bis zum letzten Saisonspiel erzeugen.
4. Coach-Eingaben, Spielbeobachtungen, Project-Atlas-Daten und abgeschlossene Trainings an Gemini senden.
5. KI-Trainings als Entwürfe anlegen.
6. Entwürfe erscheinen unter `Training → Anstehend`.
7. Manuell bearbeitete oder absolvierte Trainings werden bei späteren Neuplanungen nicht überschrieben.

### Trainingsregeln

- bestehende Trainingsdauer: `105 Minuten`
- bestehende Startzeit: `20:15 Uhr`
- Trainingstage: Dienstag und Freitag
- während der bayerischen Schulferien findet kein Training statt
- Dienstag ist der Haupttrainingstag
- neue Systeme, wichtige Lerninhalte und die höchste Wochenbelastung gehören grundsätzlich auf Dienstag
- Freitag dient der Festigung und Spielvorbereitung
- Freitag mit mehr als 8 Spielern:
  - Teamtaktik
  - Transition
  - 4-gegen-4 und 5-gegen-5
  - Situation Play
- Freitag mit 8 oder weniger Spielern:
  - Individualtechnik
  - Wurftraining
  - Entscheidungen
  - 1-gegen-1, 2-gegen-2 und 3-gegen-3
  - kein erzwungenes 5-gegen-5

Jede KI-Einheit enthält Warm-up, Hauptschwerpunkt, spielnahe Anwendung und strukturiertes 5-gegen-5, sofern die Spielerzahl dies zulässt.

### Bibliotheken

- jeder neue KI-Trainingsblock wird automatisch in die Drill-Bibliothek übernommen
- jede vollständige KI-Einheit wird zusätzlich als Trainingsvorlage gespeichert
- freitags erzeugt die KI zwei Varianten für `> 8` und `≤ 8` Spieler
- die gewünschte Freitagsvariante kann im Training übernommen und anschließend manuell bearbeitet werden

### Ferien 2026/2027

Quelle: Bayerisches Staatsministerium für Unterricht und Kultus

`https://www.km.bayern.de/termine/ferien-und-feiertage`

In folgenden Zeiträumen werden keine Trainings angelegt:

- Sommerferien: 03.08.2026–14.09.2026
- Allerheiligen: 02.11.2026–06.11.2026
- Weihnachtsferien: 24.12.2026–08.01.2027
- Frühjahrsferien: 08.02.2027–12.02.2027
- Osterferien: 22.03.2027–02.04.2027
- Pfingstferien: 18.05.2027–28.05.2027
- Sommerferien: 02.08.2027–13.09.2027

## Empfohlene Produktionsarchitektur

```text
Browser / installierte PWA
          │
          ▼
https://coach.tsv-lindau.de
          │
          ▼
Vercel
  ├─ statische CourtHub-Oberfläche
  ├─ /api/auth/*
  ├─ /api/workspace
  ├─ /api/games/sync
  ├─ /api/ai/gemini
  ├─ /api/checkin/*
  └─ /api/games/atlas*
          │
          ├────────► Neon PostgreSQL
          ├────────► Google Gemini
          ├────────► DBB TeamSL
          └────────► Project Atlas
```

Ein separater Cloudflare Worker nur für den Spielplan ist für CourtHub nicht erforderlich. Der vorhandene Vercel-Endpunkt ruft TeamSL direkt ab. Ein gemeinsamer Worker ist später nur sinnvoll, wenn auch die öffentliche TSV-Webseite dieselbe normalisierte Spielplan-API verwenden soll.

## Montag: Arbeitsreihenfolge

### 1. Repository und Stand prüfen

```bash
git clone https://github.com/Ernestokoeber/beep-test.git
cd beep-test
git switch main
git pull --ff-only origin main
git status --short --branch
npm ci
npm test
```

Erwartung:

- Branch `main`
- sauberer Arbeitsbaum
- Commit mindestens `113d40f`
- statische Prüfungen erfolgreich
- UI-Smoke-Test einschließlich KI-Saisonplanung erfolgreich

### 2. Vercel-Projekt erstellen

1. Bei Vercel anmelden.
2. `Add New → Project` auswählen.
3. GitHub-Repository `Ernestokoeber/beep-test` importieren.
4. Framework-Preset auf `Other` lassen.
5. Build Command leer lassen.
6. Output Directory leer lassen.
7. Noch nicht produktiv freigeben, bevor Datenbank und Umgebungsvariablen geprüft sind.

Die vorhandene Datei `vercel.json` konfiguriert die Serverfunktionen und deren Laufzeiten.

### 3. Neon-PostgreSQL verbinden

Empfohlen: Neon über den Vercel Marketplace hinzufügen.

Danach:

1. Neon SQL Editor öffnen.
2. Den vollständigen Inhalt von `schema.sql` ausführen.
3. Prüfen, ob `DATABASE_URL` im Vercel-Projekt vorhanden ist.
4. Gepoolte TLS-Verbindung verwenden.

`schema.sql` ist idempotent und kann bei späteren Aktualisierungen erneut ausgeführt werden.

### 4. Umgebungsvariablen setzen

Die Werte gehören ausschließlich in Vercel und niemals in GitHub, Markdown-Dateien, Screenshots oder den Browsercode.

Pflichtvariablen:

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | gepoolte Neon-PostgreSQL-Verbindung |
| `JWT_SECRET` | Signierung der Anmeldetokens, mindestens 48 zufällige Bytes |
| `GEMINI_API_KEY` | serverseitige Gemini-KI |
| `BOOTSTRAP_ADMIN_EMAIL` | E-Mail des ersten CourtHub-Administrators |
| `REGISTRATION_INVITE_CODE` | privater Einladungscode für weitere Trainer |
| `TEAM_NAME` | `TSV Lindau Basketball` |
| `TEAM_SLUG` | `tsv-lindau-basketball` |
| `PUBLIC_APP_URL` | `https://coach.tsv-lindau.de` |
| `AI_RATE_LIMIT` | zunächst `30` |

Für Project Atlas zusätzlich:

| Variable | Zweck |
|---|---|
| `ATLAS_API_URL` | URL der Basketball-AI-Plattform |
| `ATLAS_API_TOKEN` | optionales serverseitiges Token |
| `ATLAS_WEBHOOK_SECRET` | Signaturprüfung für Atlas-Pushes |
| `ATLAS_ACCESS_CLIENT_ID` | Cloudflare-Access-Service-Token-ID |
| `ATLAS_ACCESS_CLIENT_SECRET` | Cloudflare-Access-Service-Token-Secret |

`TSV_WEBSITE_API_URL` wird für den neuen direkten TeamSL-Spielplan-Sync nicht mehr benötigt. Vor dem Deployment prüfen, ob alte Abhängigkeiten oder Dokumentation dazu noch entfernt werden sollen.

Sichere Generierung eines JWT-Geheimnisses auf dem eigenen Computer:

```bash
openssl rand -base64 48
```

Den ausgegebenen Wert direkt in Vercel eintragen und nicht in Chat oder Konsole erneut ausgeben.

### 5. Erstes Deployment

Nach dem Setzen der Variablen:

1. Production Deployment starten.
2. Deployment-Logs auf Fehler prüfen.
3. Vercel-Vorschauadresse öffnen.
4. `/api/games/sync` noch nicht ohne Anmeldung testen, da der Endpunkt absichtlich eine Team-Mitgliedschaft verlangt.

### 6. Admin-Konto und Team-Workspace

1. Mit der Adresse aus `BOOTSTRAP_ADMIN_EMAIL` registrieren.
2. Prüfen, dass dieses Konto Administrator wird.
3. Vorhandene lokale Trainingsdaten beim ersten Abgleich kontrolliert übernehmen.
4. Zweites Trainerkonto mit `REGISTRATION_INVITE_CODE` anlegen.
5. Rollen und Leserechte testen.

Vor der ersten Synchronisierung auf dem bisherigen Gerät eine aktuelle JSON-Datensicherung erstellen.

### 7. Offiziellen Spielplan testen

In CourtHub:

1. `Spiele & Atlas` öffnen.
2. `Eigene Mannschaft und Liga konfigurieren` aufklappen.
3. Folgende Werte prüfen:

```text
Spielplan-Link: https://www.basketball-bund.net/static/#/liga/54509/spielplan
Team-ID: 258298
Teamname: TSV Lindau
```

4. `Konfiguration speichern` drücken.
5. `Offizieller Spielplan` drücken.
6. Folgende Ergebnisse prüfen:

- Liga `Bezirksklasse Herren Süd 26/27`
- 12 Lindauer Spiele
- erstes Spiel am 11.10.2026 gegen BG Illertal 3
- letztes Spiel am 06.03.2027 bei TSV Ottobeuren 2
- Quellenanzeige `DBB TeamSL`
- Spielnummern sichtbar

### 8. KI-Saisonplanung testen

1. `Trainingsplan` öffnen.
2. Dienstag und Freitag aktivieren.
3. Startzeit `20:15` prüfen.
4. Coach-Eingaben ausfüllen:
   - Saisonziel
   - aktueller Schwerpunkt
   - zuletzt erkannte Probleme
   - Kader- und Belastungshinweise
5. `Termine prüfen` drücken.
6. Prüfen, dass keine Termine in den bayerischen Schulferien liegen.
7. `Mit KI Saison planen` drücken.
8. KI-Planung bestätigen.
9. Unter `Training → Anstehend` prüfen, ob alle Entwürfe sichtbar sind.
10. Eine Dienstagseinheit öffnen und Hauptbelastung sowie wichtigste Inhalte prüfen.
11. Eine Freitagseinheit öffnen und beide Varianten prüfen:
    - `Variante > 8 übernehmen`
    - `Variante ≤ 8 übernehmen`
12. Einen Drill verändern.
13. Saisonplanung erneut starten und prüfen, dass das bearbeitete Training geschützt bleibt.
14. Drill-Bibliothek und Trainingsvorlagen auf KI-Einträge prüfen.

### 9. Domain verbinden

1. In Vercel `Settings → Domains` öffnen.
2. `coach.tsv-lindau.de` hinzufügen.
3. Den von Vercel angezeigten DNS-Eintrag beim Domain-/DNS-Anbieter setzen.
4. HTTPS-Prüfung abwarten.
5. `PUBLIC_APP_URL` auf `https://coach.tsv-lindau.de` prüfen.
6. Production Deployment erneut auslösen, falls die Variable geändert wurde.

### 10. PWA und Mobilgerät prüfen

Auf iPhone und möglichst zusätzlich Android testen:

- App vollständig schließen
- alte GitHub-Pages-PWA nicht mit der neuen Produktions-PWA verwechseln
- `https://coach.tsv-lindau.de` in Safari öffnen
- Anmeldung testen
- zum Home-Bildschirm hinzufügen
- PWA erneut öffnen
- Hell-/Dunkelmodus testen
- Dashboard-Navigation testen
- Training öffnen und beenden
- Spielplan synchronisieren
- KI-Saisonplanung starten
- Offline-Modus testen
- nach Rückkehr ins Netz Team-Sync testen

Erst wenn die neue PWA sicher funktioniert, die alte GitHub-Pages-Verknüpfung auf der TSV-Webseite ersetzen.

## Empfohlene UI-Nacharbeit

Die KI-Saisonplanung ist technisch unter `Trainingsplan` integriert. Für Trainer ist sie dort auf dem Smartphone nicht deutlich genug auffindbar. Nach erfolgreicher Backend-Abnahme sollte zusätzlich umgesetzt werden:

- Saisonplanungs-Karte direkt oben unter `Training → Anstehend`
- Anzeige `12 offizielle Spiele synchronisiert`
- Anzahl vorhandener, geschützter und noch fehlender Trainings
- Button `Gesamte Saison mit KI planen`
- Link zu Coach-Eingaben
- letzter KI-Planungszeitpunkt
- Warnung bei Spielplanänderungen

Es ist kein zusätzlicher Hauptmenüpunkt erforderlich.

## Codex-Auftrag für Montag

Den folgenden Text am Montag in Codex verwenden:

```text
Arbeite im Repository Ernestokoeber/beep-test auf main. Lies zuerst MONTAG_DEPLOYMENT.md, DEPLOY.md, vercel.json, schema.sql und den aktuellen Git-Status vollständig. Veröffentliche oder ändere zunächst nichts unkontrolliert.

Ziel ist die vollständige Produktionsbereitstellung von CourtHub auf Vercel mit Neon PostgreSQL unter coach.tsv-lindau.de. Prüfe zuerst den aktuellen Commit und führe npm ci sowie npm test aus. Hilf anschließend Schritt für Schritt bei Vercel-Projekt, Neon-Schema und Umgebungsvariablen, ohne Geheimnisse auszugeben oder in Dateien zu schreiben.

Teste danach Anmeldung, Team-Sync, den offiziellen DBB-TeamSL-Spielplan der Liga 54509 für TSV Lindau mit Team-ID 258298, die KI-Saisonplanung für Dienstag und Freitag, den Ausschluss bayerischer Schulferien, den Schutz manuell bearbeiteter Trainings und die Übernahme von KI-Blöcken in Drill- und Vorlagenbibliothek.

Wenn die Backend-Abnahme erfolgreich ist, integriere die Saisonplanung zusätzlich sichtbar direkt unter Training → Anstehend. Führe alle Tests aus und zeige mir vor einem Push den exakten Änderungsumfang. Push nur nach meinem ausdrücklichen Go auf main.
```

## Abnahmekriterien

Die Arbeit ist erst abgeschlossen, wenn:

- `https://coach.tsv-lindau.de` erreichbar ist
- Registrierung und Anmeldung funktionieren
- Teamdaten zwischen zwei Konten synchronisiert werden
- zwölf offizielle Herren-Spiele geladen werden
- Spielverlegungen ohne Duplikate aktualisiert werden
- Gemini serverseitig erreichbar ist
- KI-Trainings bis 06.03.2027 erzeugt werden
- keine Trainings in bayerischen Schulferien liegen
- Dienstag als Haupttraining erkennbar ist
- Freitag beide Spielerzahlvarianten enthält
- KI-Drills in der Drill-Bibliothek stehen
- KI-Einheiten als Vorlagen verfügbar sind
- manuell bearbeitete Trainings geschützt bleiben
- anstehende Trainings auf dem Smartphone klar sichtbar sind
- installierte PWA nach Cache-Aktualisierung den neuen Stand zeigt
- `npm test` vollständig erfolgreich ist

## Sicherheitsregeln

- keine API-Keys, Passwörter, Tokens oder Datenbank-URLs in Git committen
- keine Geheimnisse im Chat wiederholen
- `.env` und `.env.local` nicht veröffentlichen
- keine produktive Datenbank löschen oder zurücksetzen
- vor der ersten Datenmigration eine aktuelle CourtHub-JSON-Sicherung erstellen
- `main` nur nach ausdrücklicher Freigabe aktualisieren
- DNS erst umstellen, wenn die Vercel-Vorschau vollständig getestet wurde
