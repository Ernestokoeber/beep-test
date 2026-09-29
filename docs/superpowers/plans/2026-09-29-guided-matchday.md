# Guided Matchday Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen geführten Einstieg mit optionaler Vorbereitung, freier Live-Erfassung, Pausenübersicht und sicherer Wiederaufnahme auf dem Handy liefern.

**Architecture:** Ein eigenständiger Spieltagsbereich ergänzt vorhandene Spiele und bettet den Live-Controller ein. Vorbereitung und Notizen bekommen ein eigenes versioniertes Journal; Statistik, Uhr und Aufstellungen bleiben ausschließlich im bestehenden Live-Protokoll. Beide Journale werden über den bestehenden Workspace synchronisiert.

**Tech Stack:** Vanilla JavaScript, ES-Module, IndexedDB, bestehende Node-Smoke-Tests mit `node:assert/strict`, `fake-indexeddb` und `jsdom`; bestehender Vercel-Workspace-Endpunkt. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-09-29-guided-matchday-design.md` (vom Nutzer freigegeben).

Status: Direkt umgesetzt auf `feat/guided-matchday`; automatisierte Gesamtprüfung und Abschlussreview. Manuelle Offline-/Handyabnahme teilweise offen, siehe `docs/MATCHDAY-MODE.md`. Noch nicht integriert oder veröffentlicht.
Ausgangsstand: lokaler `main`, Produktcode `0501923`, Designcommit `60899e5`.

## Global Constraints

- Hochformat ab 320 CSS-Pixeln ohne horizontales Scrollen.
- Zentrale Aktionen haben mindestens 48 Pixel große Berührungsflächen.
- Die Hallenanzeige wird nicht gesteuert.
- Aufwärmen, Spielziele und Taktiken sind optional und überspringbar.
- Der bestehende Live-Controller bleibt die einzige Instanz für Statistik, Aufstellungen, Uhr und Abschluss.
- Alte Sitzungen im Format 1 behalten ihre Einschränkungen und werden nicht stillschweigend migriert.
- Offizielles Ergebnis, manueller Boxscore und Live-Erfassung bleiben getrennt.
- Lesende Rollen können vorhandene Spieltage ansehen, aber keine Entwürfe, Notizen oder Erfassungen verändern.
- Keine neue externe Plattform und keine zusätzliche KI-Abhängigkeit.
- Keine Veröffentlichung, kein Push und kein Merge durch Ausführung dieses Plans ohne gesonderte Integrationsentscheidung.

## Review Focus

1. Absturz zwischen Sitzungsanlage und Schrittwechsel: Wiederaufnahme darf niemals eine zweite Sitzung anlegen (Task 4).
2. Rückkehr eines lange offline gewesenen Geräts nach Konfliktauflösung: neue unbekannte Änderungen müssen wieder als Konflikt erscheinen (Task 1).
3. Synchronisationsbestätigung trifft nach neuer Eingabe ein: diese Eingabe bleibt ausstehend, nicht fälschlich synchronisiert (Tasks 2–3).
4. Archivierter Spieler oder gelöschte Taktik nach gespeichertem Entwurf: kein stilles Entfernen aus der Vorbereitung und kein kaputter Start (Tasks 4–5).
5. Abschluss oder Zeitkorrektur während offener Notizeingabe: weder Fokus/Textverlust noch erneuter Spielstart (Tasks 5–6).

## Arbeitsweise und Dateigrenzen

Vor Ausführung Spec und Plan vollständig lesen. Isolierten neuen Worktree vom aktuellen lokalen `main` über den Worktree-Skill erstellen; den vorhandenen `beep-test-live`-Worktree nicht verändern. Zuerst `npm test` als Baseline ausführen. Jeden Task mit rotem Test beginnen, minimal implementieren, grün prüfen und separat committen. Beispiele unten sind konkrete Verträge und Testkerne; komplette Testdateien ergänzen die jeweils ausdrücklich benannten Fälle.

Neue Module unter `js/matchday/`:

| Datei | Verantwortung |
| --- | --- |
| `model.mjs` | Versionsgraph, Payloadvalidierung, Konfliktauflösung |
| `flow.mjs` | rein abgeleiteter Schritt und Setup-Payload |
| `journal.mjs` | transaktionale lokale Speicherung und exakte Empfangsbestätigung |
| `bridge.mjs` | Journal-Overlay für Workspace-Synchronisation |
| `controller.mjs` | Identität, Speichern, Start und Wiederaufnahme |
| `view.mjs` | geführte Vorbereitung und Zusammenfassung |
| `live-shell.mjs` | freie Live-Ansicht, Pausen und Abschlussnotizen |

Gezielte Integrationen: `js/games.js`, `js/app.js`, `js/storage.js`, `js/sync.js`, `js/live-game/bridge.mjs`, `js/live-game/merge.mjs`, `js/live-game/view.mjs`, `api/workspace.js`, `index.html`, `sw.js`, `package.json`. Die Live-Statistikformate bleiben unverändert. Kein allgemeiner Rewrite dieser Dateien.

### Task 1: Versioniertes Modell und abgeleiteter Ablauf

**Files:** Create `js/matchday/model.mjs`, `js/matchday/flow.mjs`, `scripts/matchday-model-smoke.mjs`.

**Interfaces:**

```js
// game.matchday; alle Bezeichner nichtleere Strings <=120 Zeichen.
// Eltern sind IDs derselben Hülle, sortiert, eindeutig; keine Zyklen.
// Mehrere Wurzeln sind konkurrierende Erstentwürfe, kein Datenverlust.
// value ist ein vollständiger Snapshot, kein Patch.
const envelope = {schemaVersion: 1, revisions: []};
const value = {
  ownSide: null, kind: 'match', step: 'game',
  roster: [], startingFive: [],
  config: {periods: 4, periodMs: 600000, overtimeMs: 300000},
  goals: '', warmup: '', tactics: [], coachingNote: '', closingNote: ''
};
// Revision: {id, parents: string[], actorId, deviceId, recordedAt, value}
// roster: [{id,name,jerseyNumber: string|null}]
// tactics: [{id,title}]; kind: match|training; step: game|roster|preparation|review.
export function emptyDraft() {} // -> frischer value wie oben
export function validateMatchday(envelope) {} // -> envelope, wirft Error mit code
export function mergeMatchday(a, b) {} // -> {value: envelope|undefined, heads: string[]}
export function reviseMatchday(envelope, revision) {} // -> validierter neuer envelope
export function selectDraft(envelope) {} // -> {draft: value|null, heads, conflict:boolean}
export function resolveMatchday(envelope, chosenId, metadata) {} // -> neuer envelope
// metadata: {id,actorId,deviceId,recordedAt}; neue Revision übernimmt chosenId.value,
// parents enthält ALLE zum Entscheidungszeitpunkt bekannten Heads.
export function deriveStage({draft, liveState}) {} // -> game|roster|preparation|review|conflict|live|pause|finished
export function buildSetup(draft) {} // -> {roster,startingFive,config}; wirft bei ungültigem Start
```

- [ ] **Step 1: Testkerne und Grenzfälle schreiben.** Imports aus den zwei neuen Modulen; für den Graphentest genügt ein leerer Draft.

```js
import assert from 'node:assert/strict';
import {emptyDraft, reviseMatchday, mergeMatchday, selectDraft,
  resolveMatchday} from '../js/matchday/model.mjs';
const make = (id, parents, goals) => ({id, parents, actorId:'coach', deviceId:'phone',
  recordedAt:'2026-09-29T10:00:00.000Z', value:{...emptyDraft(), goals}});
const base = reviseMatchday(undefined, make('base', [], 'Start'));
const left = reviseMatchday(base, make('left', ['base'], 'Rebound'));
const right = reviseMatchday(base, make('right', ['base'], 'Transition'));
const merged = mergeMatchday(left, right).value;
assert.equal(selectDraft(merged).conflict, true);
const resolved = resolveMatchday(merged, 'left', {
  id:'decision', actorId:'coach', deviceId:'phone', recordedAt:'2026-09-29T10:01:00Z'});
assert.equal(selectDraft(resolved).draft.goals, 'Rebound');
const late = reviseMatchday(right, make('late', ['right'], 'Neue Offline-Notiz'));
assert.equal(selectDraft(mergeMatchday(resolved, late).value).conflict, true);
assert.deepEqual(mergeMatchday(left, left).value, left);
```

Weitere Assertions: gleiche ID mit anderem Inhalt wirft `collision`; fehlender Elternknoten, Zyklus, unbekannte Version, doppelte IDs, ungültige Typen/Größen werden abgelehnt. Ungültige Trikotnummern dürfen als Entwurf erhalten bleiben, aber nicht `buildSetup` passieren. Getrennte Tests für 0/00, leeren Kader, fünf Starter, doppelte Starter und archivierte Snapshot-Spieler. Ablaufpriorität: unaufgelöste Live-Auswahl → conflict; beendete Sitzung → finished; Sitzung bei 0:00 → pause; übrige Sitzung → live; ohne Sitzung Entwurfskonflikt → conflict, sonst gültiger Entwurfsschritt.

- [ ] **Step 2:** `node scripts/matchday-model-smoke.mjs` ausführen; fehlende Module bzw. Funktionen als roten Ausgangspunkt bestätigen.
- [ ] **Step 3:** Modell implementieren. Graph per Map zusammenführen, identische IDs kanonisch vergleichen, Topologie validieren. Heads sind alle IDs, die kein Elternverweis nennt; sortierte Ausgabe garantiert deterministische Merge-Ergebnisse. Konflikte sind mehrere Heads, keine Timestamp-Wahl. Maximal 1000 Revisionen; bei Überschreitung keine Kürzung, sondern verständlicher Fehler mit Erhalt des lokalen Standes. Textgrenzen: Ziele/Aufwärmen/Coaching-/Abschlussnotiz je 4000 Zeichen; höchstens 40 Kaderspieler, 20 Taktiken, Namen 100 und Taktiktitel 200 Zeichen. Strings als Daten behandeln. `ownSide` ist null/home/away; bei `buildSetup` muss es home/away sein. Elternlisten und Werte dürfen nach Anlage nicht verändert werden.

```js
// Entscheidungsregel in flow.mjs, keine zweite Spieluhr:
if (liveState?.session) {
  if (liveState.clock.ended) return 'finished';
  return liveState.clock.remainingMs === 0 ? 'pause' : 'live';
}
// buildSetup validiert ausgewählten Snapshot über die bestehende createSession:
// createSession({schemaVersion:2,id:'validation',deviceId:'validation',
// actorId:'validation',roster:draft.roster,startingFive:draft.startingFive,config:draft.config})
```

- [ ] **Step 4:** Modelltest und `npm run test:live` müssen Exit 0 liefern.
- [ ] **Step 5:** Nur Task-Dateien stagen; Commit `feat: model guided matchday drafts and recovery`.

### Task 2: Lokales Journal und Workspace-Brücke

**Files:** Create `js/matchday/journal.mjs`, `js/matchday/bridge.mjs`, `scripts/matchday-journal-smoke.mjs`.

**Consumes:** `validateMatchday`, `mergeMatchday` aus Task 1; `canonical` aus `js/live-game/core.mjs`.
**Produces:** `openMatchdayJournal(scope,idb=globalThis.indexedDB)` mit Methoden `append(gameId,value)`, `read(gameId)`, `pending()`, `ack(receipt)`; `getMatchdayJournal(scope)` und `createMatchdayBridge(provider=getMatchdayJournal)` mit `beforeSend`, `beforeApply`, `mergeAccepted`, `ack`, `hasPending`, identischen Argumenten zur bestehenden Live-Brücke. Rückgabe von `beforeSend`: `{data,receipt:[{gameId,stamp}]}`.

- [ ] **Step 1:** Journaltest mit `IDBFactory` aus `fake-indexeddb` schreiben.

```js
const idb = new IDBFactory();
const scope = {organizationId:'club', actorId:'coach'};
const journal = await openMatchdayJournal(scope,idb);
const draft = reviseMatchday(undefined, {id:'a',parents:[],actorId:'coach',deviceId:'phone',
  recordedAt:'2026-09-29T10:00:00Z',value:emptyDraft()});
await journal.append('game',draft);
const oldReceipt = (await journal.pending()).map(({gameId,stamp})=>({gameId,stamp}));
const newer = reviseMatchday(draft,{...draft.revisions[0],id:'b',parents:['a'],
  value:{...emptyDraft(),goals:'Box-out'}});
await journal.append('game',newer);
await journal.ack(oldReceipt);
assert.equal((await journal.pending()).length,1);
const reopened = await openMatchdayJournal(scope,idb);
assert.deepEqual(await reopened.read('game'),newer);
```

Weitere Tests: anderer Benutzer/Club sieht nichts; zwei gleichzeitige append bewahren beide Graphzweige; Transaktionsabbruch meldet Fehler und kein Erfolg; fehlendes IndexedDB verständlich; Overlay eines gelöschten Spiels wirft `deletion`; vollständiger aktueller Receipt quittiert; Merge akzeptierter Serverrevisionen erhält neuere lokale Eingaben.

- [ ] **Step 2:** `node scripts/matchday-journal-smoke.mjs` rot ausführen.
- [ ] **Step 3:** Separate Datenbank `courthub-matchday-v1`, Store `drafts`, Schlüssel JSON-Tupel `[organizationId,actorId,gameId]`. Read/Merge/Put innerhalb EINER Readwrite-Transaktion. Promise erst bei `tx.oncomplete` auflösen; onabort/onerror ablehnen. Zeile `{key,scope,gameId,matchday,pending,stamp}`. Ack vergleicht den aktuellen Stamp transaktional. Die Bridge kopiert den Workspace und ergänzt nur `game.matchday`; sie verändert `liveStats` niemals.

```js
// Overlay pro pending-Zeile, nach gesichertem Identitätskontext:
game.matchday = mergeMatchday(game.matchday, row.matchday).value;
receipt.push({gameId:row.gameId,stamp:row.stamp});
// ack: ausschließlich if (stored.stamp === receipt.stamp) pending=false setzen.
```

- [ ] **Step 4:** Journal- und Modelltests grün; bestehenden Live-Sync-Test ebenfalls ausführen.
- [ ] **Step 5:** Commit `feat: persist matchday preparation offline`.

### Task 3: Geschützte Synchronisierung und Imports

**Files:** Modify `js/live-game/bridge.mjs`, `js/live-game/merge.mjs`, `js/sync.js`, `js/storage.js`, `js/games.js`, `api/workspace.js`; Create `scripts/matchday-sync-smoke.mjs`; Modify `scripts/live-game-api-smoke.mjs`, `scripts/live-game-integration-smoke.mjs`.

**Consumes:** Matchday-Bridge und Modell. **Produces:** zusammengesetzte bestehende `bridge` mit unveränderten Methoden; Receipt-Einträge zusätzlich `kind:'live'|'matchday'`. Alte unmarkierte Receipts bleiben als live interpretierbar. `protectWorkspace` schützt beide optionalen Bereiche. API bleibt GET/PUT mit bisherigem Vertrag und 4-MiB-Grenze.

- [ ] **Step 1:** Tests für ältere Clients, Import, Konflikte und Receipts ergänzen.

```js
const current = {games:[{id:'g',matchday:draft}]};
const oldClient = {games:[{id:'g',home:'TSV Lindau',away:'Gast'}]};
assert.deepEqual(protectWorkspace(oldClient,current).games[0].matchday,draft);
assert.throws(()=>protectWorkspace({games:[]},current),e=>e.code==='deletion');
assert.deepEqual(protectWorkspace({games:[]},current,['g']).games,[]);
// API-Fälle im bestehenden Handler-Harness: unbekannte matchday-Version ->400,
// ID-Kollision ->409; zwei gültige Zweige ->200 mit erhaltenem Konfliktgraph,
// Viewer PUT ->403, CAS-Rennen ->409, übergroßer Workspace ->413.
```

Im bestehenden Integrationsharness jeweils während eines gehaltenen saveWorkspace-Promises eine zweite Journalrevision schreiben; nach Auflösung müssen pending und UI-Status ausstehend bleiben. Zusätzlich Kontowechsel während beforeSend/mergeAccepted/ack, verlorene Antwort mit Wiederholung und ausschließlich auf dem Server bekanntes Spiel mit `matchday` prüfen. Import via upsertGame darf weder alten Snapshot zurückschreiben noch unbekannte Entwurfsfelder entfernen.

- [ ] **Step 2:** Neue Sync-/API-Tests ausführen und tatsächliche Fehlannahmen festhalten.
- [ ] **Step 3:** Bestehende Bridge intern in Live-Brücke plus Komposition teilen, ohne ihre externen Aufrufer zu ändern. Beide Overlays nacheinander anwenden, Receipts markieren, Ack getrennt verteilen; `hasPending` ist logisches ODER. `mergeAccepted` erhält sowohl serverseitige Live- als auch Matchday-Spiele. `protectWorkspace` bewahrt beide Graphen und verlangt auch für reine Vorbereitungs-Spiele einen bestätigten Löschauftrag. `upsertGame` schützt gespeichertes `matchday` entsprechend `liveStats`; Spieltagscontroller schreibt ausschließlich über Journal/Bridge, nicht über ungeprüfte upsert-Snapshots. Löschoberfläche und `deleteLiveGame`-Pfad auf Spiele mit Entwurf erweitern, Bestätigungstext anpassen, keine neue ungeschützte Löschroute.

```js
// Nach Ack und erneuter Identitätsprüfung, nicht pauschal synced setzen:
const pending = pushRequested || (bridge && await bridge.hasPending(scope));
if (!current(epoch)) return;
setStatus(pending ? 'pending' : 'synced');
// Im serverseitigen Schutz je Spiel:
next.matchday = mergeMatchday(next.matchday, old.matchday).value;
```

- [ ] **Step 4:** `node scripts/matchday-sync-smoke.mjs`, `npm run test:live`, `node scripts/sync-smoke.mjs`, `node scripts/workspace-smoke.mjs` grün. Rollenfilter in `api/_lib/workspace-data.js` read-only prüfen: falls er das neue Feld entfernt, gezielt ergänzen und Viewer-GET testen; keine Rechte erweitern.
- [ ] **Step 5:** Commit `feat: synchronize matchday drafts without silent overwrites`.

### Task 4: Spieltagscontroller und idempotenter Einstieg

**Files:** Create `js/matchday/controller.mjs`, `scripts/matchday-controller-smoke.mjs`; Modify `js/live-game/controller.mjs`.

**Consumes:** Modell, Journal und `openLiveGame({gameId,scope,deps})` aus bestehendem Controller.
**Produces:**

```js
export async function openMatchday({gameId,scope,deps}) {} // -> controller
// deps: {load,save,getIdentity,subscribeIdentity,journal,openLive,now,uuid,deviceId}
// openLive: () => Promise<vorhandener Live-Controller>; Tests injizieren echte Logik
// mit synthetischen Abhängigkeiten, nicht Produktionszugriff.
// controller.getState(): {draft,heads,conflict,stage,liveState,localStatus,error,readOnly}
// controller.saveDraft(value): Promise<{ok:boolean}>
// controller.resolve(chosenId): Promise<{ok:boolean}>
// controller.start(): Promise<{ok:boolean}>
// controller.live: vorhandener Live-Controller
// controller.subscribe(listener): unsubscribe
// controller.close(): Promise<void>; controller.idle(): Promise<void>
```

- [ ] **Step 1:** Tests mit bestehender Live-Controller-Infrastruktur und fake-indexeddb aufbauen. Fixture umfasst Spiel g, mindestens sechs feste Spieler-IDs, Coachidentität und kontrollierte Uhr.

```js
await matchday.saveDraft({...emptyDraft(),ownSide:'home',step:'review',
  roster,startingFive:roster.slice(0,5).map(p=>p.id)});
await Promise.all([matchday.start(),matchday.start()]);
assert.equal(matchday.live.getState().clock.running,false);
const sessionId = matchday.live.getState().session.id;
await matchday.close();
const resumed = await openMatchday({gameId:'g',scope,deps});
await resumed.start();
assert.equal(resumed.live.getState().session.id,sessionId);
```

Weitere Fälle: Journal-Setup gelingt, anschließendes Workspace-save scheitert, dann Wiederöffnung; alter Draft darf aktive Sitzung nicht überschreiben; Entwurfskonflikt sperrt neuen Start, aber nicht laufende Statistik; nach Sitzungsanlage bleiben nur Vorbereitungstexte/Taktiken/Abschlussnotiz editierbar. Viewer, Identitätswechsel während await, geschlossene Instanz, unbekannte Rolle, mehrere Live-Sitzungen und fremdes Erfassungsgerät verwenden bestehende Sperren. Aus Profil archivierter Spieler bleibt im Entwurf sichtbar und ist vom Coach bewusst zu bestätigen oder abzuwählen; keine automatische Entfernung.

- [ ] **Step 2:** Controller-Smoke-Test rot ausführen.
- [ ] **Step 3:** Befehle serialisieren; Identität vor und nach asynchronen Grenzen prüfen. Draft-Änderungen beziehen sich auf bekannten Head, veraltete Änderungen bleiben Konfliktzweige. Pro explizitem Speichern eine Revision, nicht bei jedem Tastendruck. start prüft zuerst vorhandene Live-Sitzung, dann `buildSetup`, dann vorhandenen setup-Befehl. Keine separate Persistenz eines Live-Status. Gleiche Startwiederholung erhält dieselbe Command-ID innerhalb eines Versuchs; nach Reload vorhandenes Live-Journal lesen, bevor Setup angeboten wird.

```js
const existing = live.getState();
if (existing.session) return {ok:true};
if (existing.hasLiveData && !existing.session) throw Error('Erfassung zuerst auswählen.');
const payload = buildSetup(selectDraft(envelope).draft);
return live.dispatch({kind:'setup',id:startCommandId,payload});
```

Im Live-Controller ein read-only `hasLiveData:!!live` in `getState` ergänzen. Dazu Regressionstest für die unaufgelöste Auswahl selectedSessionId=null hinzufügen. Die Schnittstelle verändert keine bisherigen Felder. Der Matchday-Controller abonniert Identitäts- und Live-Zustandsänderungen; close löst beide Abonnements und schließt seinen Live-Controller. Produktionsabhängigkeiten kommen über einen kleinen browserDependencies-Adapter aus BT.storage/BT.sync, analog zum vorhandenen Live-Controller; Tests liefern deps explizit.

- [ ] **Step 4:** Neue Controller-Tests plus `npm run test:live` grün.
- [ ] **Step 5:** Commit `feat: orchestrate guided matchday start and resume`.

### Task 5: Mobile Vorbereitung, Spielauswahl und Wiederaufnahme

**Files:** Create `js/matchday/view.mjs`, `matchday.css`, `scripts/matchday-ui-smoke.mjs`; Modify `js/games.js`, `js/app.js`, `index.html`, `js/live-game/view.mjs`.

**Consumes:** Spieltagscontroller. **Produces:** `mountMatchdayView(container,controller,{players,tactics,onLive}) -> cleanup`; `players` und `tactics` sind read-only Datenprovider; `onLive(host,controller)` gibt cleanup zurück und wird in Task 6 mit der Live-Hülle verbunden. Bis Task 6 direkt `mountLiveView(host,controller.live)` verwenden. Route `#/games/<encoded-game-id>/matchday` ergänzt bestehenden Spielepfad; Reload öffnet anhand der ID, nicht anhand einer Modulvariable.

- [ ] **Step 1:** jsdom-Tests mit tatsächlichem DOM schreiben: Spielseite/Trainingsspiel, Kader/Nummern, Starter, Konfiguration, optionale Texte/Taktiken, Zusammenfassung und Fortsetzen.

```js
const goals = root.querySelector('[data-field="goals"]');
goals.value = 'Defensiv zuerst ausboxen';
goals.dispatchEvent(new window.Event('input',{bubbles:true}));
root.querySelector('[data-action="skip-preparation"]').click();
await controller.idle();
assert.equal(controller.getState().draft.goals,'Defensiv zuerst ausboxen');
assert.equal(controller.getState().draft.step,'review');
```

Weitere Tests: Speichern scheitert → kein Weitergehen; Nummer123 eines abgewählten Spielers blockiert nicht, dieselbe Nummer eines ausgewählten schon; Taktik fehlt → Titel-Snapshot plus Hinweis; UI schreibt HTML-artige Notizen via textContent; Viewer kein aktives Speichern. Während offenen Eingabefelds emittierter Sync darf Fokus und ungespeicherten Text nicht ersetzen. Konfliktauswahl zeigt beide Inhalte; laufende Live-Erfassung bleibt erreichbar.

- [ ] **Step 2:** UI-Smoke-Test rot ausführen.
- [ ] **Step 3:** Sichtbare Schritte Spiel/Kader/Vorbereitung/Prüfen mit „Zurück“ und „Weiter“. Beim Weiter/Zurück/Überspringen und explizitem „Entwurf speichern“ Formularwerte sichern; bei Eingabe sofort Status „Ungespeichert“. Auf blur speichern, ohne Tick-basiertes Komplett-Rendering. Beim internen Verlassen ausstehende Speicherung abwarten; bei Browser-Schließen mit ungespeicherten Daten beforeunload-Hinweis als Best Effort, keine garantierte Browser-Abschlussarbeit behaupten. Nur wirklich bestätigte Saves als gesichert anzeigen. Vorbereitungsnavigation während aktiver Sitzung nicht zurück zum Setup erlauben.

```js
// Formulargruppen nur bei echtem Schrittwechsel ersetzen:
if (renderedStage !== next.stage) renderStage(next);
else updateStatusOnly(next);
// Keine Browser-Validierung für nicht gewählten Kader:
jersey.disabled = !selected.checked;
starter.disabled = !selected.checked;
if (!selected.checked) starter.checked = false;
```

Manuelles Trainingsspiel über bestehendes upsertGame mit source manual anlegen, sofort stabile ID und Route erhalten; anschließend kind training im Draft sichern. Bestehende normale Spiele nicht duplizieren. Explizite eigene Seite im Draft entscheidet Anzeige, vorhandene Ergebnisdaten unverändert. Gleichen Nummernfix im alten Live-Setup anwenden und dessen bestehenden UI-Test ergänzen. CSS mit 48px-Minimalzielen, einspaltigen Formularen, ohne feste Mindestbreite oberhalb320px; CSS über index.html laden.

- [ ] **Step 4:** UI-Test, bestehender UI-Smoke und `npm run test:live` grün.
- [ ] **Step 5:** Commit `feat: add mobile guided matchday preparation`.

### Task 6: Freie Live-Ansicht, Pausen und Abschluss

**Files:** Create `js/matchday/live-shell.mjs`, `scripts/matchday-live-smoke.mjs`; Modify `js/matchday/view.mjs`, `matchday.css`, `js/games.js`.

**Consumes:** `mountLiveView`, `buildLiveReport`, `renderLiveReport`, Spieltagscontroller. **Produces:** `mountMatchdayLive(container,controller,{tactics}) -> cleanup`. Lifecycle bindet genau eine Live-Ansicht und löst alle Listener beim Verlassen. Keine zweite Dispatch-/Timerlogik.

- [ ] **Step 1:** Tests für Pausen und Fokus schreiben, reale Live-Controller verwenden.

```js
await controller.live.dispatch({kind:'clock-start'});
await controller.live.dispatch({kind:'clock-pause'});
assert.equal(controller.getState().stage,'live'); // Pause mitten im Viertel
const before = controller.live.getState().session.events.length;
mountMatchdayLive(host,controller,{tactics:()=>[]});
assert.equal(controller.live.getState().session.events.length,before);
// Kontrollierte Testuhr auf Abschnittsende vorziehen und subscribe auslösen:
// Pause erscheint; ohne Klick kein period-start und kein clock-start.
```

Weitere Tests: Halbzeit nach2/4 und1/2, keine Halbzeitmarkierung in Verlängerung; 0:00 bei beendetem Spiel zeigt Bericht statt Pause; Abschluss ohne Vollständigkeitscheckbox möglich. Nachträgliche Notiz lässt Events und plusMinusComplete unverändert. Offene Notiz bleibt beim Abschluss/Zeittick erhalten. Neue Statistik während ausstehendem Entwurfs-Sync zeigt nicht „alles synchronisiert“. Alte v1-Sitzung bleibt ohne erfundene Gegnerpunkte/PlusMinus. Taktikreferenzen offline fehlend verständlich kennzeichnen.

- [ ] **Step 2:** Live-Shell-Test rot ausführen.
- [ ] **Step 3:** Drei stabile DOM-Bereiche: Status/Orientierung, vorhandene Live-Ansicht, einklappbare Vorbereitung/Notizen. Pausenübersicht ohne Modal; Aktionen für nächsten Abschnitt über bestehende Live-Bedienung. Nach Abschluss read-only Bericht ergänzen, vorhandenen Korrekturmodus weiter erreichbar lassen. Bericht nur bei geänderter Sitzungsprojektion aktualisieren, Notizformular niemals durch Uhrtick ersetzen.

```js
const isHalftime = state.stage === 'pause' &&
  state.liveState.session.config.periods % 2 === 0 &&
  state.liveState.clock.period === state.liveState.session.config.periods / 2;
pauseTitle.textContent = isHalftime ? 'Halbzeit' : 'Abschnittspause';
// Finale Vorläufigkeitskennzeichnung kommt ausschließlich aus buildLiveReport.
```

Hinweis bei laufender Uhr sichtbar: „Die Uhr läuft beim Verlassen weiter.“ Internes Schließen hält die Uhr nicht automatisch an. Lokalen Entwurfsstatus und Live-Sync-Status getrennt anzeigen; aus globalem pending niemals Synchronisation des Einzelstands ableiten.

- [ ] **Step 4:** Live-Shell-, UI-, Controller-Tests und vollständiges `npm test` grün.
- [ ] **Step 5:** Commit `feat: guide matchday breaks and postgame review`.

### Task 7: Offline-Abnahme, Dokumentation und Gesamtprüfung

**Files:** Modify `sw.js`, `package.json`, `docs/LIVE-GAME-STATISTICS.md`; Create `docs/MATCHDAY-MODE.md`, `scripts/matchday-browser.mjs`, `scripts/matchday-offline-smoke.mjs`; Modify Planstatus.

**Interfaces:** `npm run test:matchday` führt die sieben neuen Modell-/Journal-/Sync-/Controller-/UI-/Live-/Offline-Testdateien aus. `npm run check` bindet es zusätzlich zu `test:live` ein. Browserfixture bedient nur synthetische lokale Spiele, echte lokale Journale und kontrollierte Sync-Antworten, niemals Produktionsdaten.

- [ ] **Step 1:** Offline-Smoke führt Serviceworker-install mit aufgezeichnetem cache.addAll aus und prüft alle acht neuen JS-/CSS-Dateien. Browserfixture nach Muster `scripts/live-game-browser.mjs` mit frei geprüftem Port4180 aufbauen; `/` muss index.html liefern. Keine Produktionsanmeldung oder API-Schlüssel.

```js
const expected = ['model','flow','journal','bridge','controller','view','live-shell'];
for (const name of expected) {
  assert.ok(cached.some(url=>url.endsWith('/js/matchday/'+name+'.mjs')));
}
assert.ok(cached.some(url=>url.endsWith('/matchday.css')));
```

- [ ] **Step 2:** Offline-Smoke vor Cacheänderung rot bestätigen.
- [ ] **Step 3:** Cacheversion vom bei Ausführung tatsächlich vorhandenen Wert erhöhen und neue Module/CSS precachen. npm-Skripte ergänzen. Anleitung beschreibt geführten Einstieg, Fortsetzung, lokale Sicherung versus Synchronisierung, gespeicherte versus noch offene Eingaben, Konto-/Gerätewechsel, Konfliktauswahl, v1-Grenzen und keine automatische Hallenuhr. Spec/Plan nur nach tatsächlich bestandener Abnahme als umgesetzt kennzeichnen.
- [ ] **Step 4:** `npm test` und `git diff --check` ausführen. Mit Browser-Skill bei320/390px gesamten Ablauf bedienen: Trainingsspiel, Vorbereitung überspringen, Start, eigene/gegnerische Punkte, Wechsel, Pause, Fortsetzen, Abschluss, Notiz, erneutes Öffnen. Screenshots prüfen; keine Layoutabnahme nur anhand DOM behaupten.
- [ ] **Step 5:** Tatsächlicher Offlineversuch: App/Module laden, Draft speichern, Testserver kontrolliert beenden, Neuladen, Draft ändern/sichern, erneutes Neuladen. Danach Live-Erfassung ebenfalls offline fortsetzen und nach Serverstart Sync prüfen. Gegenprobe Speicherfehler/zweiter Tab. Browserdaten nicht pauschal löschen. Mobile Emulation nicht als echter iOS-/Android-Test ausgeben.
- [ ] **Step 6:** Commit `test: verify guided matchday offline workflow`. Gesamtdiff gemäß gewählter Ausführungsart unabhängig prüfen lassen; wichtige Befunde vor Abschluss beheben und betroffene Tests erneut ausführen. Integration erst nach Nutzerentscheidung.

## Selbstprüfung und Übergabe

- Spec 1–3 → Tasks1,4,5; freie Live-Ansicht/Pausen/Abschluss → Task6.
- Wiederaufnahme, Doppeltippen, alte Sitzungen → Tasks1,4,6.
- Lokale Speicherung, Konflikte, Rollen, alte Clients → Tasks2–4.
- Taktikreferenzen, Fokus, mobile Bedienung → Tasks5–7.
- Alle fünf Review-Fokusfälle sind konkreten Testschritten zugeordnet.
- Kein neuer Statistikrechenkern, keine Uhrduplizierung, kein externer Dienst.
- Nach Planprüfung Ausführungsart wählen: direkt in dieser Sitzung mit abschließendem unabhängigen Review oder taskweise mit Subagents und Zwischenreviews.
- Empfehlung: direkte Umsetzung, weil die sieben Tasks aufeinander aufbauen und Schnittstellen eng zusammenhängen. Der abschließende unabhängige Review bleibt wegen Speicherung und Sync wichtig.
