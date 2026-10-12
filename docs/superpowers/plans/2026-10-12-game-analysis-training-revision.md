# CourtHub Spielauswertung und Dienstagstrainingsrevision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verifizierte Spielquellen zu bestätigten Team- und Spielerbefunden bündeln und daraus ausschließlich für geeignete zukünftige Dienstagstrainings einen transparenten, einzeln prüfbaren 105-Minuten-Änderungsvorschlag erzeugen.

**Architecture:** `js/game-development.js` übersetzt vorhandene CourtHub-Spielquellen deterministisch in bestätigbare Kandidaten, ohne aus fehlenden Zahlen Schwächen abzuleiten. Ein eigener Gemini-Vertrag erzeugt einen vollständigen Dienstag-Kandidaten; `js/training-revision.js` prüft Schutzstatus, Quellen-IDs, 15+90-Minuten-Struktur, Block-Differenz und unveränderten Ziel-Fingerprint, bevor ein Coach den Plan atomar übernimmt.

**Tech Stack:** Vanilla JavaScript/IIFE, bestehende Atlas-/Live-Spielmodelle, Gemini JSON-Schema, Web Crypto SHA-256, JSDOM-/Node-Smoke-Tests, bestehendes Workspace-JSON.

**Spec:** `docs/superpowers/specs/2026-10-12-player-development-game-analysis-design.md`

## Global Constraints

- Dieser Plan setzt beide Pläne `2026-10-12-player-development-data-import.md` und `2026-10-12-individual-development-coach-view.md` vollständig voraus.
- Nur bestätigte Befunde dürfen eine Trainingsrevision begründen.
- Die KI-Aktion heißt `proposeTrainingRevision` und verwendet `training-revision.v1`.
- Jeder Kandidat umfasst exakt 105 Minuten: 15 Minuten Mannschaftsbesprechung und 90 Minuten aktive Trainingszeit.
- Es gibt höchstens drei verständliche Mannschaftsschwerpunkte.
- Zur mentalen Entlastung gibt es höchstens fünf kognitive Hauptblöcke plus einen kurzen Cool-down; mehrere Trainingsanforderungen werden sinnvoll kombiniert.
- Jeder Block nennt die verwendeten `findingIds`.
- Jede aktive Übung enthält Varianten für 8–10, 11–14 und mindestens 15 Spieler.
- Freitagstrainings werden niemals revidiert.
- Abgeschlossene, gestartete, manuell geschützte oder nach Vorschlagserstellung veränderte Trainings werden niemals überschrieben.
- `tr_u9ki7ul9pxyo` vom 13.10.2026 bleibt bytegleich und erhält auch kein neues Metadatenfeld.
- Kein Vorschlag verändert Daten vor ausdrücklicher Coach-Bestätigung.

## Review Focus

- Ein Zieltraining wird zwischen Vorschau und Bestätigung in einem zweiten Tab verändert: Fingerprint-Prüfung muss die Übernahme stoppen — Test in Task 3.
- Der KI-Kandidat summiert 105 Minuten, verteilt aber nicht 15+90 korrekt oder lässt Cool-down/Box-out aus: Vertragsvalidierung muss ablehnen — Test in Task 2.
- Der Coach deaktiviert einzelne Änderungen und der gemischte Plan hat danach 103 Minuten: Die Übernahme muss deaktiviert bleiben — Test in Task 4.
- Ein Atlas-/Live-Feld ist `null` oder unvollständig: Es darf nicht als Schwäche oder Nullleistung bestätigt werden — Test in Task 1.
- Das geschützte Training wird über Route, Direktaufruf oder manipulierten Kandidaten adressiert: Jede Ebene muss ablehnen und der gespeicherte JSON-Text muss identisch bleiben — Test in Task 3 und Task 4.

---

## File Structure

- Create `js/game-development.js`: belegte Spielquellen, Kandidaten und Bestätigungsbatch.
- Create `js/training-revision.js`: Schutzmatrix, Fingerprint, Diff, Validierung und atomare Übernahme.
- Create `scripts/game-development-smoke.mjs`: vollständige Quellen- und Bestätigungsprüfung.
- Create `scripts/training-revision-smoke.mjs`: KI-Vertrag, Schutzmatrix, 105 Minuten, Diff und Race-Schutz.
- Modify `js/storage.js`: allgemeines atomisches Speichern bestätigter Nicht-PDF-Befunde.
- Modify `js/games.js`: „Auswertung bündeln“ und Entfernung des generischen Direktplans.
- Modify `api/_lib/ai-contracts.js`: `training-revision.v1`.
- Modify `js/api.js`: 55-Sekunden-Timeout für `proposeTrainingRevision`.
- Modify `js/training.js`: sichtbarer Prüfeinstieg und Differenzdialog.
- Modify `index.html` und `development.css`: Bündelungs- und Revisionsoberfläche.
- Modify `sw.js`, `scripts/check.mjs` und `package.json`: Cache und Testregistrierung.
- Modify `docs/BASKETBALL-AI.md` und `docs/TRAINING-INSTRUCTIONS.md`: Coach-Ablauf und Schutzregeln.

### Task 1: Vollständige Spielquellen in bestätigbare Befunde überführen

**Files:**
- Create: `js/game-development.js`
- Modify: `js/storage.js`
- Modify: `js/games.js`
- Create: `scripts/game-development-smoke.mjs`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Produces: `BT.gameDevelopment.collectEvidence(game, atlas): evidence[]`.
- Produces: `BT.gameDevelopment.buildCandidates(game, atlas): candidate[]`.
- Produces: `BT.gameDevelopment.confirm(gameId, selections): finding[]`.
- Produces: `BT.storage.saveDevelopmentFindings(findings): finding[]`.

- [ ] **Step 1: Quellen- und Nullwert-Test schreiben**

  `scripts/game-development-smoke.mjs` legt ein Spiel mit Coach-Feldern,
  Player-Stats, Atlas-Paket und Live-Ereignissen an. Es erwartet stabile
  Referenzen:

  ```js
  const evidence = gameDevelopment.collectEvidence(game, atlas);
  assert(evidence.some(item => item.id === 'game:g1:coach:improvements'));
  assert(evidence.some(item => item.id === 'game:g1:player:p1:turnovers'));
  assert(!evidence.some(item => item.value === null && item.claim), 'Unbekannte Zahl wurde als Aussage verwendet');
  ```

  `buildCandidates()` erzeugt Kandidaten nur aus:

  - nichtleeren Absätzen von `strengths`, `improvements` und `coachSummary`;
  - vorhandenen Spieler-`note`-Feldern;
  - Atlas-Beobachtungen und Atlas-`trainingFocus`;
  - explizit als verifiziert gekennzeichneten Live-Review-Fakten.

  Reine Zahlen werden als Belege angezeigt, aber ohne fachliche Coach-Regel
  nicht automatisch zu einer Stärke oder Schwäche umgedeutet.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/game-development-smoke.mjs`

  Expected: FAIL, weil `js/game-development.js` fehlt.

- [ ] **Step 3: Reines Quellenmodul implementieren**

  Jeder Beleg hat:

  ```js
  {
    id: 'game:g1:atlas:focus:0',
    sourceType: 'atlas',
    scope: 'team',
    playerId: null,
    label: 'Atlas-Trainingsfokus',
    text: 'Konsequenter Box-out auf der Weakside',
    value: null
  }
  ```

  Kandidaten enthalten noch keine `df_`-ID, aber genau eine oder mehrere
  `evidenceRefs`. Ein Kandidat ohne Belegreferenz ist ungültig.

- [ ] **Step 4: Allgemeinen atomaren Speicherweg implementieren**

  `BT.storage.saveDevelopmentFindings(findings)` validiert den vollständigen
  Batch über `BT.developmentCore.validateFinding()`, prüft Spieler und Spiel
  erneut, klont den Workspace und ruft `save()` genau einmal auf.
  PDF-Befunde bleiben ausschließlich im vorhandenen
  `saveDevelopmentImport()`-Weg.

- [ ] **Step 5: Spielansicht „Auswertung bündeln“ anbinden**

  `js/games.js` ersetzt die direkte Aktion
  `Aus Spielanalyse Training erstellen` durch `Auswertung bündeln`. Der Dialog
  zeigt Rohbelege, vorhandene bestätigte Befunde und neue Kandidaten. Der Coach
  wählt `scope`, Spieler, Kategorie, `skillKey`, Art, Priorität und
  Rollenrelevanz und bestätigt jede Zeile einzeln.

  Die bisherige Funktion `createTrainingFromGame()` wird entfernt. Es darf
  keinen alternativen Direktweg geben, der unbestätigte Texte in Trainings
  überträgt.

- [ ] **Step 6: Test auf GREEN bringen**

  Run: `node scripts/game-development-smoke.mjs && node scripts/check.mjs`

  Expected: Exitcode 0; unbekannte Zahlen erzeugen keinen Kandidaten und ein
  ungültiger Batch verändert den Workspace nicht.

- [ ] **Step 7: Commit erstellen**

  ```bash
  git add js/game-development.js js/storage.js js/games.js scripts/game-development-smoke.mjs scripts/check.mjs
  git commit -m "feat: confirm findings from complete game analysis"
  ```

### Task 2: Gemini-Vertrag für vollständige 105-Minuten-Dienstagskandidaten

**Files:**
- Modify: `api/_lib/ai-contracts.js`
- Modify: `js/api.js`
- Create: `scripts/training-revision-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: Aktion `proposeTrainingRevision` mit Vertrag `training-revision.v1`.
- Produces: validierten Wert `{ contractVersion, targetTrainingId, themes, meeting, blocks, summary }`.
- Consumes: nur erlaubte `findingIds` und vorhandene Drill-IDs aus dem Payload.

- [ ] **Step 1: Vertrags-Smoke-Test schreiben**

  Der Test baut eine Anfrage für einen zukünftigen Dienstag und validiert einen
  Kandidaten mit 15 Minuten Besprechung und 90 aktiven Minuten:

  ```js
  const request = buildAIRequest('proposeTrainingRevision', {
    target: { id: 'tr_future', date: '2026-10-20', startTime: '20:15', durationMinutes: 105 },
    currentPlan: { summary: 'Bisheriger Plan', drills: [] },
    findings: [{ id: 'df_team_boxout', scope: 'team', observation: 'Box-out zu spät.' }],
    drills: [], resources: { baskets: 2, balls: 12 }
  });
  const parsed = request.parse(JSON.stringify(validCandidate));
  assert.equal(parsed.meeting.durationMinutes, 15);
  assert.equal(parsed.blocks.reduce((sum, block) => sum + block.durationMinutes, 0), 90);
  assert(parsed.themes.length <= 3);
  ```

  Negative Fälle prüfen 104/106 Minuten, Besprechung ungleich 15, mehr als
  fünf Hauptblöcke, fehlenden Cool-down, unbekannte `findingId`, fehlende
  Box-out-/Transition-/Entscheidungskomponente sowie fehlende Varianten für
  8–10, 11–14 oder 15+ Spieler.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/training-revision-smoke.mjs`

  Expected: FAIL mit `Unbekannte KI-Aktion.`.

- [ ] **Step 3: Vollständiges Schema definieren**

  `meeting` enthält `durationMinutes: 15`, sachliche Spieleinordnung,
  Fortschritte, wichtigste Teamprobleme, höchstens drei Schwerpunkte,
  nächste Spielziele, Rückfragen und `findingIds`.

  Jeder aktive Block enthält:

  ```js
  {
    id: 'candidate_block_1',
    sourceBlockId: null,
    drillId: 'd_pressure_passing',
    proposedDrill: null,
    type: 'activation-technique',
    durationMinutes: 15,
    name: 'Aktivierung mit Druckpässen',
    goal: '...',
    gameReference: '...',
    organization: '...',
    material: ['Bälle', 'Hütchen'],
    steps: ['1. ...', '2. ...'],
    coachingPoints: ['...'],
    commands: ['Scan!', 'Passfenster!'],
    intensity: 'medium',
    progression: '...',
    simplification: '...',
    metrics: ['Mindestens 8 von 10 Pässen ohne Ballverlust'],
    constraints: ['Maximal zwei Dribblings'],
    drinkBreak: { planned: true, afterMinute: 12 },
    variants: {
      players8to10: '...',
      players11to14: '...',
      players15plus: '...'
    },
    findingIds: ['df_team_boxout']
  }
  ```

  Erlaubte Typen sind `activation-technique`, `decision-offense`,
  `defense-rebounding`, `transition-advantage`, `constrained-scrimmage` und
  `cooldown-review`. Es gibt höchstens fünf Blöcke ohne Cool-down und genau
  einen abschließenden Cool-down. Die Typkombinationen decken Aktivierung,
  Technik, Entscheidung, Offense, Defense, Box-out/Rebounding, Transition,
  gesteuertes Abschlussspiel und Auswertung ab.

  `drillId` muss auf eine übergebene vorhandene Übung verweisen.
  `proposedDrill` ist nur bei `drillId = null` erlaubt und übernimmt den
  vollständigen Vorschlagsvertrag aus
  `player-development-answer.v1`. Ein solcher Block ist noch nicht
  freigabefähig.

- [ ] **Step 4: Parser und Prompt implementieren**

  Der Parser prüft alle Referenzen gegen die Payload-Sets, begrenzt Texte und
  Arrays, summiert 90 aktive Minuten und weist doppelte IDs zurück. Der Prompt
  verlangt konkrete Trinkpausen, messbare Kennzahlen und basketballspezifische
  Kommandos, ohne öffentliche Einzelkritik in der Besprechung.

  `js/api.js` behandelt `proposeTrainingRevision` mit 55.000 ms.

- [ ] **Step 5: Testregistrierung und GREEN**

  `package.json` hängt `game-development-smoke.mjs` und
  `training-revision-smoke.mjs` an `test:development`.

  Run: `npm run test:development && npm run test:ai`

  Expected: Exitcode 0 für alle positiven und negativen Vertragsfälle.

- [ ] **Step 6: Commit erstellen**

  ```bash
  git add api/_lib/ai-contracts.js js/api.js scripts/training-revision-smoke.mjs package.json
  git commit -m "feat: validate evidence based Tuesday revisions"
  ```

### Task 3: Schutzmatrix, Fingerprint und blockgenaue Differenz

**Files:**
- Create: `js/training-revision.js`
- Modify: `scripts/training-revision-smoke.mjs`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Produces: `canPropose(training, todayIso): { allowed, reason }`.
- Produces: `fingerprintTraining(training): Promise<string>`.
- Produces: `buildProposal(training, findings, resources): Promise<proposal>`.
- Produces: `buildDiff(training, candidate): diffRow[]`.
- Produces: `composeSelection(training, candidate, selectedIds): plan`.
- Produces: `applyProposal(proposal, selectedIds): training`.

- [ ] **Step 1: Schutz- und Race-Tests schreiben**

  Der Test deckt Freitag, Vergangenheit, `completed`, `endedAt`,
  `planning.protectedFromGameAnalysis` und die feste Schutzkombination ab:

  ```js
  const protectedTraining = {
    id: 'tr_u9ki7ul9pxyo', date: '2026-10-13',
    plan: { summary: 'Vorhandener Dienstag', drills: [{ name: 'Block', minutes: 105 }] }
  };
  const before = JSON.stringify(protectedTraining);
  assert.equal(revision.canPropose(protectedTraining, '2026-10-12').allowed, false);
  await assert.rejects(() => revision.buildProposal(protectedTraining, [], {}));
  assert.equal(JSON.stringify(protectedTraining), before);
  ```

  Für `tr_future` erstellt der Test eine Vorschau, verändert danach dessen
  Notiz und erwartet, dass `applyProposal()` wegen Fingerprint-Abweichung
  abbricht.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/training-revision-smoke.mjs`

  Expected: FAIL, weil `js/training-revision.js` fehlt.

- [ ] **Step 3: Schutzmatrix implementieren**

  `canPropose()` verlangt Datum größer als `todayIso`, Dienstag, keinen
  Start-/Endestatus und keinen Schutz. Die feste Regel steht vor allen anderen
  Checks:

  ```js
  if (training.id === 'tr_u9ki7ul9pxyo' && training.date === '2026-10-13') {
    return { allowed: false, reason: 'Dieses bestehende Dienstagstraining bleibt unverändert.' };
  }
  ```

  Es wird kein Feld in dieses Training geschrieben.

- [ ] **Step 4: Fingerprint und Vorschlag implementieren**

  `fingerprintTraining()` hasht eine stabile Projektion aus `id`, `date`,
  `startTime`, `status`, `endedAt`, `note`, `planning` und `plan` mit
  SHA-256. `buildProposal()` speichert `targetFingerprint` nur im
  Arbeitsspeicher und ruft `BT.api.ai('proposeTrainingRevision', payload)` auf.

- [ ] **Step 5: Diff und gemischten Plan implementieren**

  `buildDiff()` vergleicht Besprechung und Blöcke über `sourceBlockId`,
  andernfalls über Position. Jede Zeile enthält Original, Kandidat, Begründung,
  Ziel und `findingIds`.

  `composeSelection()` übernimmt ausgewählte Kandidatenzeilen und behält bei
  abgewählten Zeilen das Original. Danach validiert es erneut:

  ```js
  if (meetingMinutes !== 15 || activeMinutes !== 90) {
    throw new Error('Die ausgewählte Kombination muss 15 + 90 Minuten ergeben.');
  }
  ```

  Zusätzlich berechnet die Funktion aus `startTime` und den laufenden Minuten
  für Besprechung und jeden Block `startAt` und `endAt`. Enthält ein
  ausgewählter Kandidatenblock noch `proposedDrill` statt `drillId`, bleibt die
  Kombination mit „Neue Übung zuerst freigeben“ ungültig.

  `applyProposal()` liest das Zieltraining erneut aus Storage, vergleicht den
  Fingerprint und ruft erst nach erfolgreicher Auswahlvalidierung genau einmal
  `BT.storage.upsertTraining()` auf. Es setzt `planning.source` auf
  `ai-game-analysis` sowie `approvedAt` und `findingIds`.

- [ ] **Step 6: Test auf GREEN bringen**

  Run: `node scripts/training-revision-smoke.mjs && node scripts/check.mjs`

  Expected: Exitcode 0; Schutzfixture bleibt bytegleich und Race-Test bricht
  ohne Speicheraufruf ab.

- [ ] **Step 7: Commit erstellen**

  ```bash
  git add js/training-revision.js scripts/training-revision-smoke.mjs scripts/check.mjs
  git commit -m "feat: protect and diff Tuesday training revisions"
  ```

### Task 4: Trainingsdetail mit transparenter Einzelauswahl und Freigabe

**Files:**
- Modify: `js/training.js`
- Modify: `index.html`
- Modify: `development.css`
- Modify: `scripts/training-revision-smoke.mjs`
- Modify: `sw.js`

**Interfaces:**
- Consumes: `BT.trainingRevision` aus Task 3.
- Produces: sichtbaren Ablauf „Training anhand der Spielauswertung prüfen“.
- Produces: keinerlei Alternative für Freitag oder das geschützte Training.

- [ ] **Step 1: UI-Smoke-Test ergänzen**

  JSDOM rendert drei Trainings: erlaubter Zukunftsdienstag, Freitag und
  `tr_u9ki7ul9pxyo`. Nur beim erlaubten Dienstag ist die Aktion sichtbar.
  Der Diffdialog zeigt pro Zeile Checkbox, Befundquelle, altes/neues Ziel,
  Minuten und Belastung.

  Nach Abwahl einer Zeile entsteht eine 103-Minuten-Kombination; der
  Übernehmen-Button ist deaktiviert und zeigt die Differenz. Erst eine gültige
  105-Minuten-Auswahl aktiviert ihn.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/training-revision-smoke.mjs`

  Expected: FAIL wegen fehlender UI-Anbindung.

- [ ] **Step 3: Trainingsaktion und Fortschritt implementieren**

  `tpl-training-detail` erhält im Mehr-Menü:

  ```html
  <button class="btn small" data-action="review-game-analysis" hidden>
    Training anhand der Spielauswertung prüfen
  </button>
  ```

  `renderDetail()` verwendet `canPropose()` zum Ein-/Ausblenden. Beim Start
  zeigt die UI die verwendeten bestätigten Teamthemen und Spielermuster, danach
  Request-ID oder konkreten Fehler.

- [ ] **Step 4: Differenzdialog und atomare Freigabe implementieren**

  Der Dialog zeigt oben drei Themen und darunter Besprechung plus Blockzeilen.
  Jede Quellen-ID verlinkt auf Spiel oder Spielerprofil. Änderungen sind
  standardmäßig ausgewählt. Nach jeder Checkboxänderung ruft die UI
  `composeSelection()` auf; bei Fehler bleibt „Auswahl übernehmen“ deaktiviert.

  Die Übernahme verlangt einen letzten Dialog:
  `„Diesen vollständigen 105-Minuten-Plan jetzt ersetzen?“`. Erst danach wird
  `applyProposal()` aufgerufen und die Trainingsansicht neu gerendert.

  Für jeden neuen `proposedDrill` zeigt der Dialog vorher
  „In Übungsbibliothek übernehmen“. Diese Aktion verwendet
  zuerst `BT.individualDevelopment.stageProposedDrill()` und danach
  `approveProposedDrill()` aus dem zweiten Plan. Sie ersetzt den Vorschlag
  anschließend durch die gespeicherte `drillId`. Ohne diese Freigabe kann der
  Trainingsplan nicht übernommen werden.

- [ ] **Step 5: Service Worker aktualisieren**

  `index.html` lädt `js/game-development.js` und `js/training-revision.js` vor
  `js/games.js` beziehungsweise `js/training.js`. `sw.js` nimmt beide Dateien
  auf und erhöht `CACHE` von `courthub-v207` auf `courthub-v208`.

- [ ] **Step 6: Task-Verifikation ausführen**

  Run: `npm run test:development && node scripts/check.mjs && npm run smoke`

  Expected: Exitcode 0; Freitag und geschützter Dienstag besitzen keinen
  aktiven Revisionsweg.

- [ ] **Step 7: Commit erstellen**

  ```bash
  git add js/training.js index.html development.css scripts/training-revision-smoke.mjs sw.js
  git commit -m "feat: review Tuesday training changes before apply"
  ```

### Task 5: Gesamtregression, Dokumentation und Release-Bereitschaft

**Files:**
- Modify: `docs/BASKETBALL-AI.md`
- Modify: `docs/TRAINING-INSTRUCTIONS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: vollständigen Spielauswertungs- und Revisionsablauf.
- Produces: geprüften, aber noch nicht automatisch deployten Release-Kandidaten.

- [ ] **Step 1: Dokumentation aktualisieren**

  `docs/BASKETBALL-AI.md` dokumentiert die drei neuen Vertragsversionen und
  Quellenpflicht. `docs/TRAINING-INSTRUCTIONS.md` beschreibt 15+90 Minuten,
  maximal drei Themen, höchstens fünf Hauptblöcke plus Cool-down,
  Teilnehmervarianten und Einzelauswahl. `README.md` nennt den geschützten
  Bestandsplan nicht als allgemeine Produktregel, sondern verweist auf die
  migrationssichere Schutzprüfung.

- [ ] **Step 2: Entwicklungs- und KI-Suiten ausführen**

  Run: `npm run test:development && npm run test:ai`

  Expected: Exitcode 0.

- [ ] **Step 3: Vollständige CourtHub-Regression ausführen**

  Run: `npm test`

  Expected: Exitcode 0 für Workspace, Sync, Live-Spiel, Matchday, Training,
  KI, PWA und Play Designer.

- [ ] **Step 4: Produktionsnahe Schutzprüfung ausführen**

  Run: `node scripts/training-revision-smoke.mjs && node scripts/pwa-loading-smoke.mjs`

  Expected: Das Fixture `tr_u9ki7ul9pxyo` ist vor und nach allen Direktaufrufen
  bytegleich; `courthub-v208` enthält alle neuen lokalen Assets.

- [ ] **Step 5: Finalen Commit erstellen**

  ```bash
  git add README.md docs/BASKETBALL-AI.md docs/TRAINING-INSTRUCTIONS.md
  git commit -m "docs: describe evidence based Tuesday revisions"
  ```

- [ ] **Step 6: Deployment bewusst getrennt halten**

  Run: `git status --short --branch`

  Expected: sauberer Feature-Stand. Erst nach separater Coach-Freigabe werden
  Push, Vercel-Deployment und produktive Datenmigration ausgeführt.
