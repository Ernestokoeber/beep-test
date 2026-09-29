# Vollständiger Live-Spielerboxscore – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die bestehende mobile Erfassung um Spieltagsnummern, Einsatzstatus und nachvollziehbares Plus/Minus erweitern.

**Architecture:** Das vorhandene Ereignisjournal bleibt die einzige Quelle. Neue Sitzungen erhalten Format 2 und gegnerische Trefferereignisse; ein kleines Projektionsmodul berechnet daraus Einsatzstatus und Plus/Minus. Bestehende Format-1-Sitzungen bleiben erhalten und behaupten keine nicht erfassten gegnerischen Punkte.

**Tech Stack:** Node.js 24, Vanilla JavaScript/ES-Module, IndexedDB, jsdom, fake-indexeddb; keine zusätzlichen Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-09-29-live-player-boxscore-design.md` (vom Nutzer freigegeben).

## Global Constraints

- Keine gegnerischen Spieler, keine externe Ergebnis-API und keine Hallensteuerung.
- Stabile Spieler-ID bleibt unabhängig von Namen und Trikotnummer erhalten.
- DNP-Spieler haben `plusMinus=null`, nicht einen behaupteten Einsatzwert null.
- Format-1-Sitzungen bleiben unverändert lesbar und mit den bisherigen Aktionen fortsetzbar.
- Keine automatische Migration oder nachträgliche Schätzung aus Endständen.
- Keine Vermischung mit Atlas oder manuellem Boxscore.
- 320 und 390 CSS-Pixel ohne horizontales Scrollen prüfen; ausreichend große Tasten.
- Kein neuer Datei-Export als Teil dieser Erweiterung.
- Produktänderungen in einem gemäß `using-git-worktrees` isolierten Worktree durchführen; vorhandene Änderungen erhalten.

## Review Focus

1. Namenskorrektur aus einem alten Client ohne Nummer darf eine vorhandene Nummer nicht löschen; Test in Aufgabe 1.
2. Zwei Wechsel und Treffer bei identischer Restzeit müssen durch Sequenz eindeutig zugeordnet werden, auch ohne positive Einsatzdauer; Test in Aufgabe 2.
3. Eine abgeänderte alte Vollständigkeitsbestätigung darf spätere Statistikänderungen nicht nachträglich absegnen; Test in Aufgabe 2.
4. Alte Workspace-Daten dürfen neue Sitzungen weder entfernen noch auf Format 1 umschreiben; Test in Aufgabe 3.
5. Ein Speicherausfall beim Abschluss darf weder ein abgeschlossenes Spiel noch einen bestätigten Punkteverlauf vortäuschen; Test in Aufgabe 4.

## Dateiverantwortung

- `js/live-game/core.mjs`: Sitzungs-/Ereignisvalidierung, Kadersnapshot und Kaderkorrekturen.
- `js/live-game/clock.mjs`: einheitliche Aufstellung an einem Ereignis und Zeitvalidierung.
- Neu `js/live-game/boxscore.mjs`: reine Ableitung von Einsatzstatus, Punkten und Plus/Minus.
- `js/live-game/controller.mjs`: neue Sitzungen, neue Befehle und atomarer Abschluss.
- `js/live-game/view.mjs`, `live-game.css`: Nummerneingabe, Gegnerpunkte, Bestätigung und Korrekturen.
- `js/live-game/report.mjs`: vollständige Berichtsdaten und sichere Darstellung.
- `merge.mjs`, `journal.mjs`, `bridge.mjs`, `api/workspace.js`: vorhandene Grenzen durch Regressionstests absichern; nur ändern, wenn ein Test eine konkrete Lücke zeigt.
- `scripts/live-game-boxscore-smoke.mjs`: neue Modelltests; bestehende Live-Testskripte um Integrationsfälle ergänzen.
- `package.json`, `sw.js`, `docs/LIVE-GAME-STATISTICS.md`: Tests einbinden, Offline-Cache aktualisieren, Bedienung erklären.

## Aufgabe 1: Rückwärtskompatibles Format und Spieltagsnummer

**Dateien:** `core.mjs`; neu `scripts/live-game-boxscore-smoke.mjs`; `package.json`.

**Schnittstellen:** `createSession({schemaVersion=1,...})` erhält die vorhandene Signatur mit optionaler Version; nur der Controller erstellt ausdrücklich Version 2. `validateSession(s)` akzeptiert 1/2, andere Versionen nicht. `sessionRoster(s)` liefert `{id,name,jerseyNumber?:string|null}`. Neue Ereignisse sind `opponent-score:{points:1|2|3}` und `score-coverage:{complete:boolean}` ausschließlich in Version 2.

- [ ] Folgenden Testaufbau und Versions-/Nummerntests schreiben:

```js
import assert from 'node:assert/strict';
import {createSession,appendEvent,sessionRoster} from '../js/live-game/core.mjs';
const fresh=(schemaVersion=2)=>createSession({schemaVersion,id:'s',deviceId:'d',actorId:'u',
  roster:Array.from({length:7},(_,i)=>({id:'p'+(i+1),name:'P'+(i+1),jerseyNumber:String(i)})),
  startingFive:['p1','p2','p3','p4','p5'],
  config:{periods:4,periodMs:600000,overtimeMs:300000}});
const event=(s,kind,payload={},remainingMs=600000,period=1)=>({
  id:'e'+(s.events.length+1),sessionId:s.id,seq:s.events.length+1,
  kind,payload,remainingMs,period,recordedAt:'2026-09-29T18:00:00Z'});
let s=fresh();
assert.equal(s.schemaVersion,2);
s=appendEvent(s,event(s,'roster',{players:[{id:'p1',name:'Neuer Name'}]}));
assert.equal(sessionRoster(s)[0].jerseyNumber,'0');
assert.throws(()=>appendEvent(s,event(s,'roster',{players:[{id:'p2',name:'P2',jerseyNumber:'0'}]})));
assert.throws(()=>appendEvent(fresh(1),event(fresh(1),'opponent-score',{points:2})));
```

- [ ] `node scripts/live-game-boxscore-smoke.mjs` ausführen; zuerst roten Versions-/Nummerntest dokumentieren.
- [ ] Version erhalten; neue Payloads strikt prüfen (ganze Zahl 1/2/3 bzw. Boolean, keine Spieler-ID). Nummer mit `value === null || typeof value === 'string' && /^\d{1,2}$/.test(value)` prüfen. Fehlendes Feld zulassen, explizites `null` löscht Nummer. Fehlende Nummer nicht durch Wahrheitstest verlieren. Kaderkorrekturen mit `{...previous,...patch}` zusammenführen. Nach jeder wirksamen Kaderkorrektur doppelte nicht leere Nummern ablehnen; Nummerntausch in derselben Kaderaktion atomar prüfen. Keine historischen Metadaten für Synchronisierung normalisieren/umschreiben.
- [ ] Tests für `00` neben `0`, `null`, Leerstring, `123`, negative/numerische Werte, Nummerntausch, unbekannte Version, ungültige neue Payloads ergänzen. Bestehende Version-1-Fixtures unverändert lassen.
- [ ] `node scripts/live-game-boxscore-smoke.mjs` und `npm run test:live` grün ausführen; neuen Test an `test:live` anhängen.
- [ ] Nur zugehörige Dateien committen: `feat: validate live boxscore v2 and game jerseys`.

## Aufgabe 2: Gemeinsame Zeitzuordnung und Boxscore-Projektion

**Dateien:** `clock.mjs`, neu `boxscore.mjs`, `scripts/live-game-boxscore-smoke.mjs`, `scripts/live-game-clock-smoke.mjs`.

**Schnittstellen:** `lineupAtEvent(boundaries,s,e):string[]` und `projectLineups(s,nowMs)` zusätzlich mit `boundaries` sowie `playedIds:string[]`. `projectBoxscore(s,nowMs)` liefert `{players,teamPoints,opponentPoints:number|null,stints,complete,plusMinusComplete,issues:[]}`; Spieler enthalten alle bisherigen Zähler plus `played:boolean`, `minutesMs`, `minutesSeconds`, `plusMinus:number|null`.

- [ ] Testfall nach Aufbau aus Aufgabe 1 schreiben: eigener Zweier, gegnerischer Dreier, Wechsel p1→p6 und eigener Freiwurf p2 bei unveränderter Restzeit. Erwartung fest verdrahten:

```js
const {projectBoxscore}=await import('../js/live-game/boxscore.mjs');
let sample=fresh();
for(const [kind,payload] of [
  ['stat',{playerId:'p1',action:'two-made'}],
  ['opponent-score',{points:3}],
  ['substitution',{out:['p1'],in:['p6']}],
  ['stat',{playerId:'p2',action:'ft-made'}]
]) sample=appendEvent(sample,event(sample,kind,payload));
const result=projectBoxscore(sample,0);
const player=id=>result.players.find(p=>p.id===id);
assert.equal(result.teamPoints,3);assert.equal(result.opponentPoints,3);
assert.equal(player('p1').plusMinus,-1);assert.equal(player('p6').plusMinus,1);
assert.equal(player('p6').played,true);assert.equal(player('p6').minutesSeconds,0);
assert.equal(player('p7').played,false);assert.equal(player('p7').plusMinus,null);
assert.equal(result.plusMinusComplete,false);
```

- [ ] Neuen Test ausführen und erwartetes Scheitern vor Implementierung prüfen.
- [ ] `replay` in `clock.mjs` um gegnerische Statistikereignisse und nicht zeitverändernde Coverage-Ereignisse erweitern. Gegnertreffer an denselben Zeitgrenzen wie eigene Stats prüfen, jedoch ohne Spielerpflicht. Den vorhandenen Algorithmus zur Aufstellung gemeinsam verwenden:

```js
export function lineupAtEvent(boundaries,s,e) {
  const at=position(s,e.period,e.remainingMs);
  return [...(boundaries.filter(b=>b.at<at || b.at===at&&b.seq<e.seq).at(-1)||boundaries[0]).onCourt];
}
```

- [ ] `playedIds` aus Startern und sämtlichen wirksamen Einwechslungen ableiten, nicht nur aus Stints mit positiver Dauer. `boxscore.mjs` kombiniert `projectStats`, `projectLineups`, `effectiveEvents`, `clockAt`. Eigenes Scoring über Mapping `{'ft-made':1,'two-made':2,'three-made':3}`, gegnerisches negativ; keine Fehlwürfe addieren. Version 1: Gegnerpunkte und Plus/Minus `null`. Version 2: Plus/Minus für `played` mit 0 initialisieren und je Punkteereignis an dessen Aufstellung verteilen.
- [ ] Coverage konservativ ableiten: letzte wirksame `score-coverage` mit `complete=true` muss nach jeder relevanten Rohaktion liegen. Relevant: neue Treffer/Wechsel/Uhrkorrekturen sowie `amend`/`void`, deren Ziele Treffer, Wechsel oder Zeitsteuerung betreffen. Die ursprüngliche Sequenz einer nachträglich geänderten Coverage-Aktion bleibt deren Bestätigungsgrenze; frische Bestätigung erfordert ein neues Coverage-Ereignis. Auch aufgehobene Änderungen bleiben Grund für eine neue Bestätigung. `plusMinusComplete` nur bei beendetem Format-2-Spiel und aktueller Bestätigung true.
- [ ] Tests ergänzen: alle Wurfarten/Fehlwürfe; zwei Nullsekundenwechsel; Zeiten vor/nach Wechsel; Unterzahl; zwei Verlängerungen; Gegnerwert ändern/aufheben; Wechselzeit atomar korrigieren; Version 1; DNP; Sekundenabrundung. Coverage nach Abschluss bestätigen, danach Treffer korrigieren → false, erneut bestätigen → true; alte Bestätigung abändern → bleibt false. Summenregel `sum(plusMinus)===5*(teamPoints-opponentPoints)` nur bei durchgehend fünf Spielern prüfen.
- [ ] Modelltests und `npm run test:live` grün ausführen; committen: `feat: derive participation and lineup plus-minus`.

## Aufgabe 3: Befehle, dauerhafte Sicherung und Serverkompatibilität

**Dateien:** `controller.mjs`; Tests `live-game-ui-smoke.mjs`, `live-game-sync-smoke.mjs`, `live-game-api-smoke.mjs`, `live-game-integration-smoke.mjs`.

**Schnittstellen:** `getState()` zusätzlich `boxscore:projectBoxscore(s,now)`. `dispatch({kind:'opponent-score',payload:{points}})`; `dispatch({kind:'score-coverage',payload:{complete}})` auch im ausdrücklichen Abschluss-Korrekturmodus. UI-Abschlussbefehl `finish` mit `{scoreComplete:boolean}` wird atomar in `finish` und nachfolgende `score-coverage` umgesetzt; bestehendes `finish` ohne Angabe bleibt ohne Bestätigung möglich. Ein Journal-Write für beide Ereignisse, stabile abgeleitete Coverage-ID `finishId + ':coverage'` (bei UI-UUID innerhalb ID-Limit); überlange Befehls-ID vor Änderung ablehnen.

- [ ] Im vorhandenen Controller-Test die neuen Befehle einsetzen:

```js
assert.equal(c.getState().session.schemaVersion,2);
assert.equal((await c.dispatch({kind:'opponent-score',payload:{points:3}})).ok,true);
assert.equal(c.getState().boxscore.opponentPoints,3);
await c.dispatch({kind:'undo-last'});
assert.equal(c.getState().boxscore.opponentPoints,0);
```

- [ ] Rot ausführen. Controller-Setup explizit auf Format 2 setzen; Übernahme kopiert die vorhandene Version unverändert. Undo-Zielliste um Gegnerpunkte erweitern; Coverage nicht als letzte Sportaktion behandeln. Abschluss mit Bestätigung als zwei validierte Ereignisse vorbereiten und gemeinsam dauerhaft schreiben. Nach abgeschlossenem Spiel nur bestehende Korrekturarten und Coverage zulassen. Beide neuen Ereignisarten benutzen unverändert Identitäts-/Rechte-/Lease-Prüfung.
- [ ] Fake-IndexedDB-Tests um Version-2-Journals ergänzen: Speichern → schließen → öffnen → identische Gegnerpunkte; doppelte Ereignis-ID idempotent, verschiedene Inhalte ablehnen; Ack eines alten Snapshots erhält neuere Gegneraktion. Bestehende 409-/413-/Konto-/Teamwechsel-Fixtures einmal mit Gegnerereignis ausführen.
- [ ] API-Test mit V2-Serverbestand und altem Client-Spiel ohne `liveStats`: PUT bewahrt V2. Manipulierte Version-1-Kopie derselben Sitzungs-ID muss Konflikt statt Downgrade auslösen. Neue unbekannte Version bleibt 400, Viewer bleibt 403. Bestehende Versionskonflikte/CAS unverändert. Falls Code geändert werden muss, erst den konkreten roten Test festhalten.
- [ ] Journalfehler beim bestätigten Abschluss injizieren: `clock.ended===false`, kein neues Coverage-Ereignis, erneuter Versuch mit derselben Befehls-ID erzeugt genau einen Abschluss und eine Bestätigung. Reload und Geräteübernahme erhalten bestätigten Zustand.
- [ ] Alle Live-Tests grün; committen: `feat: persist opponent scoring and score coverage safely`.

## Aufgabe 4: Mobile Eingabe und vollständige Auswertung

**Dateien:** `view.mjs`, `report.mjs`, `live-game.css`; Tests `live-game-ui-smoke.mjs`, `live-game-report-smoke.mjs`.

**Schnittstellen:** `buildLiveReport(session,nowMs)` delegiert an `projectBoxscore` und behält bisherigen Fehlervertrag bei. Sichere DOM-Texte für Spielerkennung und Bericht; keine HTML-Interpolation von Namen/Nummern.

- [ ] UI-/Berichtstests zuerst ergänzen: Nummernfeld `[data-jersey-player="p1"]`, Buttons `Gegner +1`, `Gegner +2`, `Gegner +3` ohne Spielerwahl; Version 1 zeigt Hinweis statt Gegnertasten. Bericht enthält Nummer, Gespielt/DNP, Sekunden und Plus/Minus-Status. Bisherigen Test „kein Plus/Minus-Text“ durch „Version 1 kein numerisches Plus/Minus“ ersetzen.

```js
const number=document.querySelector('[data-jersey-player="p1"]');
assert.ok(number);number.value='00';
// Nach den vorhandenen Starter-Checkboxen und „Erfassung starten“:
assert.equal(c.getState().roster.find(p=>p.id==='p1').jerseyNumber,'00');
click('Gegner +2');await c.idle();
assert.equal(c.getState().boxscore.opponentPoints,2);
```

- [ ] Rot ausführen. Setup um Textfeld mit `inputMode='numeric'`, `maxLength=2` und Nummernvorbelegung ergänzen; leere Eingabe in `null` wandeln. Snapshot `{id,name,jerseyNumber}`. Kaderkorrektur erhält dasselbe Feld; Auswahl setzt gespeicherten Wert. Nummern in Spieler-, Wechsel- und Korrekturlabels anzeigen.
- [ ] Gegnergruppe mit drei mindestens 48px hohen Buttons und eigenem deaktiviert/busy-Zustand einfügen. Ticker darf deaktivierte Tasten nicht vorzeitig aktivieren. Kopf zeigt `Eigene … : Gegner … · erfasst`; Version 1 nur bekannte eigene Punkte. Protokoll verständlich mit `Gegner +2` etc. darstellen. Korrekturformular für Gegnertreffer bietet 1/2/3 und vorhandene Zeit-/Aufhebenfelder.
- [ ] Abschlussformular um nicht vorangekreuzte Checkbox „Gesamten Punkteverlauf beider Teams erfasst“ ergänzen; beide Antworten erlauben Abschluss. Abgeschlossene Sitzung bietet ausdrückliche neue Bestätigung im Korrekturmodus. Keine Bestätigung allein durch Öffnen/Schließen oder Endstandvergleich.
- [ ] Bericht um Nummer, Status, Plus/Minus und Vollständigkeit ergänzen. `null` als „Nicht verfügbar“ bzw. bei DNP „–“ anzeigen; 0 muss 0 bleiben, positive Werte mit +. Laufendes Spiel „Noch nicht eingesetzt“ statt endgültigem DNP. Vorläufige Werte deutlich so beschriften; bestätigte Werte „Punkteverlauf vom Coach bestätigt“, nicht „offiziell“.
- [ ] Tests: Speicherausfall, Doppeltipp, Tick nach Spielerwahl, Viewer, fremdes Gerät, Namens-XSS, Nummer 0/00, Abschluss mit/ohne Bestätigung, erneute Bestätigung nach Korrektur. UI schließt auf fehlgeschlagenen Befehlen nicht die Fehlermeldung weg. Alle Live-Tests grün; committen: `feat: expose complete mobile live player statistics`.

## Aufgabe 5: Offline-Auslieferung, Gesamttest und Dokumentation

**Dateien:** `sw.js`, `docs/LIVE-GAME-STATISTICS.md`, bei Bedarf `scripts/live-game-browser-fixture.mjs`; Tests aus Aufgaben 1–4.

**Schnittstellen:** Vorhandene Browserfixture verwendet echte IndexedDB und künstliche Spieldaten ohne Produktionszugriff. Neues `boxscore.mjs` muss offline verfügbar sein.

- [ ] Manifestprüfung ergänzen und zunächst rot ausführen:

```js
import {readFileSync} from 'node:fs';
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert.ok(sw.includes("'./js/live-game/boxscore.mjs'"));
assert.ok(!sw.includes("const CACHE = 'courthub-v138'"));
```

- [ ] Manifest ergänzen und Cache gegenüber dem dann aktuellen Stand erhöhen. Dokumentation konkret um Nummern, DNP, Gegnerpunkte, vorläufige/ bestätigte Werte, alte Spiele und Korrekturen ergänzen. Kein bereits erfolgreiches Deployment behaupten.
- [ ] `npm test` vollständig ausführen; Fehler nicht durch Testlöschung umgehen. `git diff --check` ausführen. Coverage-Matrix gegen die zehn Abnahmekriterien der Spezifikation abgleichen.
- [ ] Browser-Skill vollständig lesen; lokale Fixture starten und mit dem vorgesehenen Browser bei 320/390px testen: Nummer ändern, Startformation, eigene/gegnerische Treffer, Wechsel, Undo, Abschlussbestätigung, Korrektur, Reload, zweiter Tab und Offline-Laden. Breite prüfen: `document.documentElement.scrollWidth <= innerWidth`. Keine Produktionsspielstände verändern.
- [ ] Vor Abschluss gemäß Ausführungsskill unabhängige Abschlussprüfung und erforderliche Fehlerbehebung durchführen. Reale iOS-/Android-Geräte nur als geprüft melden, wenn tatsächlich benutzt. Bekannten Taktikboard-E2E-Fehler separat nennen, falls weiterhin reproduzierbar.
- [ ] Dokumentation/Manifest committen: `docs: document live boxscore and refresh offline assets`. Danach gemäß `finishing-a-development-branch` Integration abstimmen; keine unbelegte Behauptung, dass lokale Änderungen bereits online sind.

## Selbstprüfung und Übergabe

Alle Felder der Nutzertabelle sind Aufgabe 1/2/4 zugeordnet; Speicherung und
Versionierung Aufgabe 3; mobile und Offline-Abnahme Aufgabe 5. Die fünf
Review-Fälle sind explizit in den jeweiligen Tests enthalten. Keine neue
Produktabhängigkeit, kein paralleler Summenspeicher, keine Migration alter Spiele.

Empfohlener Ausführungsweg: **Native** – Umsetzung in dieser Sitzung mit
abschließender unabhängiger Prüfung. Die fünf Aufgaben hängen eng an denselben
Ereignis- und Projektionsschnittstellen; parallele Implementierung bringt wenig.
Vor Produktänderungen den schriftlichen Plan vom Nutzer bestätigen lassen.
