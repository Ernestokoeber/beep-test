# Live-Spielstatistik – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ausführungsmethode erst nach Auswahl durch den Nutzer festlegen.

**Goal:** Der Coach erfasst eigene Spieleraktionen, Wechsel und Spielzeit am Handy und erhält nachvollziehbare Statistiken und Einsatzminuten.

**Architecture:** Ein versioniertes, append-only Aktionsprotokoll ist die Quelle der Live-Auswertung. Reine Funktionen berechnen Statistiken und Aufstellungszeiten; ein separat gesichertes lokales Journal schützt unbestätigte Änderungen vor Workspace-Konflikten. Die vorhandene Spielverwaltung bleibt Einstieg und zeigt Live-Daten getrennt von manuellen Boxscores und Atlas.

**Tech Stack:** Bestehendes Vanilla-JavaScript, neue isolierte ES-Module, native Browserfunktionen, IndexedDB für das Journal, vorhandene Node/Vercel-API und PostgreSQL-Workspace mit Versionsvergleich. Node 24 und jsdom für bestehende Tests; keine neue Produktabhängigkeit vorgesehen.

**Spec:** `docs/superpowers/specs/2026-09-29-live-game-statistics-design.md` – freigegeben. Vor Umsetzung vollständig lesen.

Status: Implementierungsplan zur Prüfung. Keine Produktfunktion dieses Plans ist bereits umgesetzt.

## Global Constraints

- „Die bestehende Trainingsuhr bleibt unverändert“.
- „Die Summe der selbst erfassten Treffer ist eine interne Kontrollgröße.“
- „Nur laufende Spielzeit zählt zu Einsatzminuten, keine Auszeiten, Unterbrechungen oder Viertelpausen.“
- „Ein Serverstand darf lokale unbestätigte Aktionen nicht entfernen.“
- „Keine automatische Addition dieser Quellen, da sonst dieselben Treffer doppelt gezählt werden könnten.“
- „Pro Spiel ist ein aktives Erfassungsgerät vorgesehen.“
- Keine Gegnerstatistiken, kein Plus/Minus, kein Zugriff auf die andere Ergebnis-App.
- Neue Funktionen müssen ohne Netz benutzbar sein; Authentifizierung und Teamzuordnung zuvor sichern. Offline-Start auf einem noch nie angemeldeten Gerät ist nicht Teil der ersten Version.
- Produktänderungen zunächst isoliert umsetzen, vorhandene Änderungen erhalten. Vor Veröffentlichung vollständige Tests und mobile Abnahme, keine Tests gegen echte Spieldaten.

## Review Focus

1. Ein Doppeltipp oder verlorenes HTTP-Ergebnis darf keine Aktion doppelt zählen: Tasks 1, 3 und 4.
2. Nach Neuladen während eines laufenden Viertels darf weder die Uhr neu beginnen noch eine Pause als Einsatzzeit zählen: Tasks 2 und 6.
3. Ein korrigierter Wechsel kann spätere Aktionen ungültig machen: Task 2; keine stillen Reparaturen.
4. Ein anderer Tab oder ein Konto-/Teamwechsel darf ausstehende Aktionen nicht falsch zuordnen: Task 3.
5. Ein älterer Client, Atlas-Import oder Spielplan-Update darf ein Live-Protokoll nicht unbemerkt überschreiben: Tasks 3 und 5.

## Dateigrenzen und Ladereihenfolge

Neue Dateien:

| Datei | Verantwortung |
| --- | --- |
| `js/live-game/core.mjs` | Ereignisformat, Validierung, Statistikprojektion, Korrekturen |
| `js/live-game/clock.mjs` | Spieluhr, Abschnittszeit und Einsatzzeitprojektion |
| `js/live-game/journal.mjs` | IndexedDB-Journal, ausstehende/ bestätigte Aktionen |
| `js/live-game/merge.mjs` | Reiner ID-basierter Abgleich und Konflikterkennung |
| `js/live-game/bridge.mjs` | Journal/Workspace-Brücke, Konto- und Teamgrenzen |
| `js/live-game/controller.mjs` | UI-Aktionen validieren, speichern und erst dann anzeigen |
| `js/live-game/view.mjs` | Mobile Erfassung, Kaderwahl, Wechsel und Korrekturdialoge |
| `js/live-game/report.mjs` | Live-Auswertung, Minuten und Aufstellungsverlauf |
| `js/live-game/bootstrap.js` | Klassischen App-Code mit den neuen Modulen verbinden |
| `live-game.css` | Ausschließlich auf die Live-Ansicht begrenzte Gestaltung |
| `scripts/live-game-*-smoke.mjs` | Je Task benannte Tests, siehe unten |
| `docs/LIVE-GAME-STATISTICS.md` | Bedienung, Offline-Grenzen und Wiederherstellung |

Bestehende Dateien gezielt erweitern: `js/games.js`, `js/storage.js`,
`js/sync.js`, `js/api.js`, `api/workspace.js`, `api/_lib/workspace-data.js`,
`index.html`, `sw.js`, `scripts/check.mjs`, `scripts/smoke.mjs`,
`scripts/sync-smoke.mjs`, `scripts/workspace-smoke.mjs`, `package.json`.
Serverseitige Importpfade in `api/games/atlas.js` und
`api/games/atlas-webhook.js` auf Erhalt von Live-Daten prüfen.

`bootstrap.js` vor `sync.js` laden. Es setzt sofort eine Promise:

```js
window.BT = window.BT || {};
BT.liveReady = import('./bridge.mjs').then(module => module.bridge);
```

Bei Umsetzung liegt `bootstrap.js` im selben Ordner wie `bridge.mjs`.
Alle berührten Sync-Einstiege warten auf `BT.liveReady`, bevor sie Live-Daten
lesen oder ersetzen. Bei Ladefehlern keinen Workspace mit ungeschützten
Live-Daten schreiben; Fehlermeldung anzeigen und lokalen Stand erhalten.
Reine `.mjs`-Module werden ohne DOM-Abhängigkeit auch von API-Tests importiert.

## Gemeinsamer Datenvertrag

`game.liveStats` enthält `{schemaVersion:1, sessions, selectedSessionId,
resolutionRevision}`. Eine Sitzung besitzt ID, Ersteller, Gerät-ID,
Kadersnapshot, Abschnittskonfiguration und `events`. Bei konkurrierenden
Sitzungen bleiben beide erhalten; nur eine explizit gewählte Sitzung wird
ausgewertet. Auswahlentscheidungen per Workspace-Version sichern.

Ein Event enthält:

```js
const event = {
  id: 'event-uuid', sessionId: 'session-uuid', seq: 12,
  period: 1, remainingMs: 480000,
  recordedAt: '2026-09-29T18:02:00.000Z',
  kind: 'stat', payload: { playerId: 'p1', action: 'two-made' }
};
```

`seq` ist pro Sitzung eindeutig und bestimmt die Erfassungsreihenfolge;
`period` und `remainingMs` bestimmen die fachliche Spielzeit. `recordedAt`
ist nur Auditinformation. IDs mit `crypto.randomUUID()` erzeugen, nicht aus
Uhrzeiten. Ereignistypen: `setup`, `stat`, `substitution`, `clock-start`,
`clock-pause`, `clock-correction`, `period-start`, `finish`, `amend`, `void`.
Korrekturen referenzieren ursprüngliche Event-IDs; keine Korrekturketten auf
Korrekturen erlauben. Neueste gültige Korrektur je Ziel anwenden.

Statistikaktionen: `ft-made`, `ft-missed`, `two-made`, `two-missed`,
`three-made`, `three-missed`, `oreb`, `dreb`, `assist`, `steal`, `block`,
`turnover`, `foul`. Minuten intern als Millisekunden, Quoten ohne Versuche
als `null`, nicht als scheinbar beobachtete 0 %.

## Task 1: Ereignisprotokoll und Spielerstatistik

**Files:** Neu `js/live-game/core.mjs`, `scripts/live-game-core-smoke.mjs`.

**Interfaces:** Exportiere `createSession({id,deviceId,actorId,roster,
startingFive,config})`, `appendEvent(session,event)` und
`projectStats(session)`. `appendEvent` liefert eine neue Sitzung oder wirft
`LiveValidationError` mit stabilem `code`; gleiche ID mit identischem Inhalt
ist idempotent, gleiche ID mit anderem Inhalt ist ein Konflikt.
`projectStats` liefert `{players,points,issues}`; `players` ist nach Spieler-ID
indiziert und enthält getrennte FT/2P/3P-Treffer/-Versuche sowie OREB/DREB.

- [ ] Fehlenden Modulvertrag mit `scripts/live-game-core-smoke.mjs` testen.
  Ein lokaler Testfixture erzeugt sechs Spieler p1–p6, Starting Five p1–p5,
  vier Abschnitte zu 600000 ms und Verlängerungen zu 300000 ms.
  Die Fixture-Funktion `sessionFixture()` in derselben Testdatei definieren;
  Produktcode bekommt keine testexklusiven Methoden.

```js
let session = sessionFixture();
const e = { id:'e1',sessionId:session.id,seq:1,period:1,
  remainingMs:600000,recordedAt:'2026-09-29T18:00:00Z',
  kind:'stat',payload:{playerId:'p1',action:'three-made'} };
session = appendEvent(session,e);
session = appendEvent(session,e);
assert.equal(projectStats(session).players.p1.points,3);
assert.equal(projectStats(session).players.p1.threeAttempted,1);
assert.throws(() => appendEvent(session,{...e,payload:{...e.payload,action:'two-made'}}));
```

- [ ] `node scripts/live-game-core-smoke.mjs` ausführen: fehlende Funktion bzw.
  gezielte Assertion muss zunächst scheitern.
- [ ] `createSession` validiert IDs, eindeutigen Kader und genau fünf Starter;
  Konfiguration ganzzahlig/positiv, maximal 12 reguläre Abschnitte und maximal
  3600000 ms je Abschnitt. Unbekannte Schema-Version nicht still migrieren.
- [ ] `appendEvent` validiert Eventtyp, Spielerzuordnung, Zeitgrenzen und
  Sequenz. Neue Events sind unveränderliche Kopien; keine Mutation der Eingabe.
- [ ] Die Statistikprojektion mit einer Aktionstabelle implementieren:

```js
const shotActions = {
  'ft-made': ['ft',1,true], 'ft-missed': ['ft',1,false],
  'two-made': ['two',2,true], 'two-missed': ['two',2,false],
  'three-made': ['three',3,true], 'three-missed': ['three',3,false]
};
// bucketAttempted += 1; bucketMade += Number(made);
// points += made ? value : 0; rebounds = oreb + dreb.
```

- [ ] Für jede Aktion literal erwartete Werte testen; `void` von e1 ergibt
  null Punkte/null Dreier-Versuche, Änderung des Ziels auf p2 verschiebt die
  Werte vollständig. Fremde Spieler, ungültige Zahlen und doppelte Sequenzen
  ablehnen. Archivierung im aktuellen Kader darf den Sitzungssnapshot nicht ändern.
- [ ] Test grün ausführen und committen: `feat: add live game event model`.

## Task 2: Spieluhr, Wechsel und Einsatzminuten

**Files:** Neu `js/live-game/clock.mjs`, `scripts/live-game-clock-smoke.mjs`;
`core.mjs` um zeitliche Validierung ergänzen.

**Interfaces:** `clockAt(session,nowMs)` liefert
`{period,remainingMs,running,ended}`. `projectLineups(session,nowMs)` liefert
`{onCourt,stints,minutesMs,issues}`. `validateTimeline(session)` liefert
`{valid,issues}`. `appendEvent` prüft damit jede Änderung atomar.
Jedes Issue hat `code`, betroffene `eventIds` und einen deutschen Erklärungstext.

- [ ] Test mit fester Uhr schreiben: p1–p5 spielen 120 Sekunden, p1 wird bei
  08:00 durch p6 ersetzt, danach 60 Sekunden Spielzeit und 30 Sekunden Pause.
  Erwartung: p1=120000, p6=60000, p2–p5 jeweils 180000 ms, Summe=900000 ms.
- [ ] `node scripts/live-game-clock-smoke.mjs` zunächst rot ausführen.
- [ ] Laufende Restzeit berechnen, ohne Browser-Ticks zu zählen:

```js
const remainingMs = Math.max(0,
  anchor.remainingMs - Math.max(0,nowMs-anchor.startedAtMs));
// Endzeit am Abschnittsende kappen, niemals automatisch nächsten Abschnitt starten.
```

- [ ] Wechsel als `{out:['p1','p2'],in:['p6','p7'],allowShortHanded:false}`
  verarbeiten. Zielaufstellung zuerst vollständig prüfen, dann übernehmen.
  Wechsel nur bei pausierter Uhr; explizite Unterzahl zulassen, >5 nie.
- [ ] Stints anhand fachlicher Spielzeit ordnen und mit jeweils gültiger
  Aufstellung integrieren. Pausen-/Viertelpausen zählen nicht. Gleiche Zeit
  erzeugt keine Dauer, Sequenz entscheidet die Reihenfolge.
- [ ] Uhrkorrektur von 08:20 auf 08:30 ohne betroffenen Wechsel ergibt nach
  Start bei 10:00 exakt 90000 ms pro Starter, nicht 100000 ms.
  Liegt ein Wechsel bei 08:25, Korrektur ablehnen und betroffene Event-ID
  melden; Coach muss Zeit des Wechsels gemeinsam korrigieren. Dafür `amend`
  als atomare Liste von Zieländerungen zulassen und erst den Gesamtstand prüfen.
- [ ] Korrektur früherer Wechsel testet alle nachfolgenden Wechsel und
  Spieleraktionen erneut. Eine Aktion für einen dann nicht mehr aktiven
  Spieler verlangt Korrektur, keine automatische Zuordnung.
- [ ] Neuladen, 0-Zeit, verspäteter Tick, Änderung der Gerätezeit,
  mehrere Wechsel, Unterzahl, fünftes Foul, Abschnittswechsel und zwei
  Verlängerungen testen. Bei rückwärts springender Gerätezeit pausieren und
  Uhrabgleich verlangen statt negative Zeit zu erzeugen.
- [ ] Test grün ausführen und committen: `feat: track game clock and lineup minutes`.

## Task 3: Lokales Journal und verlustsichere Synchronisierung

**Files:** Neu `journal.mjs`, `merge.mjs`, `bridge.mjs`, `bootstrap.js`,
`scripts/live-game-sync-smoke.mjs`; ändern `js/sync.js`, `js/storage.js`,
`js/api.js`, `api/workspace.js`, `api/_lib/workspace-data.js` und `index.html`.

**Interfaces:** `openJournal({organizationId,actorId})` liefert async Methoden
`append(gameId,session,event)`, `pending()`, `ack(receipt)`, `read(gameId)`.
Alle Journalzugriffe sind durch Organisation UND Benutzer getrennt.
`mergeLiveStats(local,remote)` liefert `{value,conflicts}` ohne stille Gewinnerwahl.
`bridge.beforeSend(workspace,scope)` liefert `{data,receipt}`;
`bridge.beforeApply(remote,scope)` liefert einen geschützten Workspace;
`bridge.ack(receipt,scope)` bestätigt nur genau gesendete Events.
`scope={organizationId,actorId,sessionEpoch}` wird nie aus Eventdaten vertraut.

- [ ] Tests zuerst schreiben: Serverstand neuer als lokale Metadaten, aber
  lokale Event-ID fehlt; nach `beforeApply` und erneutem Senden weiterhin
  vorhanden. Im Journal während einer laufenden Anfrage neu angelegte e2 darf
  durch Quittierung von e1 nicht gelöscht werden.

```js
await journal.append('g1',session,e1);
const {receipt} = await bridge.beforeSend(workspace,scope);
await journal.append('g1',session,e2);
await bridge.ack(receipt,scope);
assert.deepEqual((await journal.pending()).map(row=>row.event.id),['e2']);
```

- [ ] `node scripts/live-game-sync-smoke.mjs` rot ausführen. Testadapter für
  IndexedDB am Speicherzugriff injizieren; den echten Adapter zusätzlich im
  lokalen Browser testen, nicht ausschließlich den Adapter-Mock.
- [ ] IndexedDB-Datenbank `courthub-live-v1`, Store `sessions` und `events`
  anlegen. Eventschlüssel enthält Organisation, Benutzer, Spiel, Sitzung, ID.
  Ereignis plus Sitzungsänderung in einer Readwrite-Transaktion sichern;
  erst nach `transaction.oncomplete` Erfolg melden. Quota/Abort bleibt Fehler.
- [ ] `mergeLiveStats`: gleiche IDs/gleicher Inhalt einmal übernehmen;
  unterschiedliche Inhalte gleicher ID oder unterschiedliche Events gleicher
  Sequenz als Konflikt erhalten. Konkurrierende Sitzungen separat behalten.
  Unaufgelöste Sitzungen nicht gemeinsam auswerten.
- [ ] Vor jedem Workspace-Push Journal einbeziehen, vor jedem `applyRemote`
  Journal schützen. Bei 409 den ID-Abgleich anwenden, nicht allein Zeitstempel.
  Nach drei Konfliktversuchen stoppen und sichtbar zur manuellen Auflösung
  auffordern; Journaleinträge bleiben erhalten. Session-Epoch vor und nach
  jedem Await vergleichen; spätes Ergebnis eines anderen Kontos ignorieren.
- [ ] Server führt vor dem vorhandenen atomaren Versions-UPDATE denselben
  Live-ID-Abgleich mit dem aktuellen Workspace durch. Metadaten per Schema
  validieren, bestehende Protokolle nicht durch fehlende `liveStats` löschen.
  400 bei ungültigem Format, 403 für Viewer, 409 bei Live-Konflikt, 413 bei
  Überschreiten des vorhandenen 4-MiB-Workspace-Limits. Journal bei allen
  Fehlern erhalten. Kein pauschaler Ausbau dieses Limits.
- [ ] Spielentfernung absichern: `saveWorkspace` optional um
  `confirmedGameDeletions:string[]` ergänzen. Der Server lehnt das Weglassen
  eines Spiels mit Live-Protokoll ohne diesen expliziten Löschauftrag ab.
  UI verlangt bestehende Löschbestätigung und zusätzlich geklärte/gesicherte
  Live-Aktionen. Fremdgerät-Löschung mit lokalem Journal als Konflikt anzeigen,
  nicht still das Spiel wiederherstellen oder das Journal löschen.
- [ ] Schreibsitzung pro Tab über eindeutige Tab-ID und BroadcastChannel
  koordinieren; ohne diese Funktion eine IndexedDB-Lease atomar erwerben.
  Geräteübergreifend konkurrierende Sitzungen beim Workspace-Abgleich erkennen.
  Ein Gerätewechsel benötigt sichtbare Übernahmebestätigung; Offline-Konflikte
  bleiben bis zur Auswahl der auszuwertenden Sitzung aufbewahrt.
- [ ] Tests für verlorene HTTP-Antwort nach erfolgreichem PUT, erneutes Senden,
  schreibgeschützten Benutzer, volles Journal, zwei Tabs, zwei Geräte, Logout,
  anderes Team, Session-Übernahme und 413 ergänzen. Serverautorisierung mit
  kontrollierten Auth-/DB-Grenzen testen, niemals echte Produktionsdaten ändern.
- [ ] Tests grün ausführen; bestehende `sync-smoke.mjs` und
  `workspace-smoke.mjs` ebenfalls grün; committen:
  `feat: preserve live events across offline and workspace conflicts`.

## Task 4: Mobile Live-Erfassung

**Files:** Neu `controller.mjs`, `view.mjs`, `live-game.css`,
`scripts/live-game-ui-smoke.mjs`; ändern `js/games.js`, `index.html`, `sw.js`.

**Interfaces:** `openLiveGame({gameId,scope})` liefert einen Controller mit
`dispatch(command)`, `subscribe(listener)`, `close()`.
`mountLiveView(container,controller)` liefert eine Cleanup-Funktion.
`dispatch` liefert `Promise<{ok,state,error}>`; Fehler ändern den bestätigten
Zustand nicht. Commands entsprechen den oben definierten Eventtypen plus
`undo-last` (erzeugt `void`). Controller besitzt Listener und Timer und gibt
sie beim Schließen frei, nicht die gespeicherte Sitzung.

- [ ] UI-Test zuerst: Kader wählen, fünf Starter, Start, p1 wählen,
  Dreier getroffen wählen, erwartete eigene Punkte=3; kein zusätzliches
  Bestätigungsfenster für reguläre Statistikaktionen.
- [ ] `node scripts/live-game-ui-smoke.mjs` rot ausführen.
- [ ] Controller-Speicherreihenfolge implementieren:

```js
const candidate = appendEvent(session,event); // einschließlich Timelineprüfung
await journal.append(gameId,candidate,event); // erst dauerhaft sichern
session = candidate;
notifySubscribers();                         // dann bestätigte UI ändern
// Danach Workspace-Spiegelung und reguläre Sync-Warteschlange anstoßen.
```

- [ ] Speichervorgänge serialisieren; während Bestätigung einer Wechselgruppe
  weitere Bestätigung deaktivieren. Dieselbe Command-ID bei technischem Retry
  weiterverwenden, nicht jedes Retry als neue Aktion anlegen.
- [ ] Handyoberfläche mit fester Uhr/Start-Pause, fünf Spielerkacheln,
  Aktionstasten, Wechselansicht, Bank, Protokoll und Speicherstatus umsetzen.
  Treffer/Fehlwurf direkt auswählbar, Touchziele mindestens 44×44 CSS-Pixel,
  keine Pflicht zum horizontalen Scrollen bei 320 px Breite.
- [ ] Wechsel nur bei gestoppter Uhr; bei laufender Uhr ausdrücklich
  „Uhr anhalten und wechseln“ anbieten. Mehrere Paare vor Bestätigung sammeln.
  Unterzahl gesondert bestätigen. Foulgrenzhinweis ohne Zwangsauswechslung.
- [ ] Uhrkorrektur, Abschnittswechsel, Verlängerung, Kaderkorrektur nach Start
  und Spielabschluss durch bewusst beschriftete Dialoge führen. Bei einem
  Validierungsfehler betroffene Protokollzeile erreichbar machen.
- [ ] Lesende Konten ohne Eingabetasten; Sessionwechsel schließt aktive
  Schreibansicht. Gespeicherte lokale Sitzung nach Wiederanmeldung im selben
  Team anbieten. Bestehende Wake-Lock-Hilfe nutzen, Cleanup beim Schließen.
- [ ] Doppeltipp, gescheiterte Speicherung, HTML in Spielernamen, Fokusführung,
  Tastaturbedienung, Wiederöffnen und Wechsel-Rückgängig testen.
- [ ] Alle neuen Assets in `sw.js` aufnehmen, Cacheversion vom dann aktuellen
  Stand erhöhen. Einstieg in `games.js` dynamisch importieren:

```js
const {openLiveGame} = await import('./live-game/controller.mjs');
await openLiveGame({gameId:game.id,scope});
```

- [ ] Tests grün ausführen und committen: `feat: add mobile live game capture`.

## Task 5: Spielauswertung und Bestandsdaten

**Files:** Neu `report.mjs`, `scripts/live-game-report-smoke.mjs`;
ändern `js/games.js`, `js/storage.js`, die beiden Atlas-API-Dateien soweit
notwendig und `docs/LIVE-GAME-STATISTICS.md`.

**Interfaces:** `buildLiveReport(session,nowMs)` liefert
`{players,teamPoints,stints,issues,complete}` aus `projectStats` und
`projectLineups`; `renderLiveReport(report)` liefert ein DOM-Element.
Spielernamen mit `textContent` setzen. Bericht nicht in `playerStats` mischen.

- [ ] Test zuerst: manueller Boxscore mit 8 Punkten, Live-Protokoll mit 3
  Punkten und Atlas mit 10 Punkten bleibt drei getrennte Ansichten;
  insbesondere entsteht niemals eine Summe von 21 Punkten.
- [ ] `node scripts/live-game-report-smoke.mjs` rot ausführen.
- [ ] Bericht mit FT/2P/3P, FG, Punkten, OREB/DREB/REB, AST/STL/BLK/TO/PF,
  Minuten im Format MM:SS und Aufstellungsverlauf erzeugen. Kennzeichnung
  „Manuell erfasste Coach-Statistik“, kein Plus/Minus-Feld in der Live-Ansicht.
- [ ] Bei Konflikten `complete:false`; verständliche Warnung statt gültig
  wirkender Endwerte. Spielabschluss stoppt die Uhr; danach Änderungen nur
  über expliziten Korrekturmodus. Quellenwahl darf keinen Import auslösen.
- [ ] Offizielle Ergebnispflege bleibt separat. Bekannte Abweichungen zu
  selbst erfassten Punkten zeigen, aber weder Events erzeugen noch korrigieren.
  Ergebnis ohne eindeutige Zuordnung zur eigenen Mannschaft nicht vergleichen.
- [ ] Regressionstest: Spielplan- und Atlas-Updates erhalten Event-IDs und
  Minuten; alte Spiele ohne `liveStats` bleiben bearbeitbar. Aktualisierung
  während eines offenen Berichts darf keine veraltete Spielkopie zurückspeichern.
- [ ] Bedienungsdokumentation schreiben: Vorbereitung, Live-Tipps, Wechsel,
  Uhrabgleich, Speicherstatus, Konfliktauflösung, Gerätewechsel und Grenzen.
- [ ] Tests grün ausführen und committen: `feat: show live boxscore and lineup history`.

## Task 6: Gesamtprüfung und Veröffentlichung

**Files:** Ändern `scripts/check.mjs`, `package.json`, `scripts/smoke.mjs`;
neu `scripts/live-game-browser.mjs` für reproduzierbare lokale Abnahme.

**Interfaces:** Keine neuen Produktinterfaces. Alle Module/Tests der Tasks
1–5 werden über die vorhandene Testpipeline und Offline-Manifestprüfung erfasst.

- [ ] Neue Testdateien in `npm test`, neue JS/MJS-Dateien in statische
  Syntaxprüfung aufnehmen. API-Bundleauflösung der gemeinsamen Module prüfen.
- [ ] `npm test` ausführen. Erwartung: alle bestehenden und neuen Tests grün;
  fremde Fehler ebenfalls berichten, nicht verschweigen oder dafür Tests löschen.
- [ ] Lokalen Browser mit ausschließlich synthetischem Testspiel prüfen:
  320/390 px Breite, Kader, Start, Treffer, Pause, Doppelwechsel, Fortsetzen,
  Rebound, Rückgängig, Uhrkorrektur, Viertelwechsel, Abschluss und Bericht.
- [ ] Echten IndexedDB-Adapter prüfen: offline buchen, Tab neu laden,
  Sitzung fortsetzen, online synchronisieren; genau dieselben IDs und Summen.
  Ein zweiter Tab muss vor konkurrierender Erfassung warnen.
- [ ] Ein komplettes synthetisches Viertel mit bekannten Wechselzeiten
  nachspielen. Summe der Einsatzzeiten und Spielerwerte mit der manuell
  berechneten Fixture vergleichen. Handytest auf iOS/Android soweit Geräte
  verfügbar; nicht getestete Hardware im Abschluss benennen.
- [ ] `git diff --check` und gesamte Änderung gegen die Spezifikation prüfen;
  insbesondere rechtegeschützte Schreibwege, unbeabsichtigte Imports und
  Workspace-Konflikte kontrollieren. Keine Live-Aktionen im echten Team buchen.
- [ ] Nur bei grüner Abnahme Änderungen integrieren und auf `main` pushen.
  Vercel-Deployment separat prüfen; Push allein ist kein Nachweis für Livegang.
  Read-only prüfen, ob neue Assets ausgeliefert werden. Datenmigration auf Neon
  ist für diesen Plan nicht vorgesehen; wird eine notwendig, vorher neu abstimmen.
- [ ] Abschluss mit Commit, Testbelegen, Bedienpfad und tatsächlichen
  Einschränkungen liefern; Betriebsanleitung auf GitHub verlinken.

## Abdeckungsprüfung und Übergabe

Spezifikation 1–3: Tasks 1/4; Abschnitt 4: Task 2; Abschnitt 5: Tasks 1/3/5;
Abschnitt 6: Task 3; Abschnitt 7: Task 5; Ausschlüsse aus Abschnitt 8 gelten
global; sämtliche Abnahmekriterien aus Abschnitt 9 gehen in Task 6 ein.
Die fünf Review-Fokusfälle haben jeweils explizite Tests in den genannten Tasks.

Empfohlene Ausführung: nacheinander in dieser Aufgabe (`executing-plans`),
weil Ereignisformat, Zeitberechnung und Synchronisierung eng zusammenhängen.
Alternativ können nach ausdrücklicher Wahl spezialisierte Subagenten pro Task
mit unabhängiger Prüfung eingesetzt werden. Vor Produktcode diesen Plan vom
Nutzer prüfen lassen und Ausführungsmethode bestätigen.
