# CourtHub Spielerentwicklung: Datenbasis und PDF-Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CourtHub um ein synchronisiertes Entwicklungsjournal erweitern und Spielerbewertungs-PDFs ausschließlich nach einzeln bestätigter Coach-Prüfung als strukturierte Befunde speichern.

**Architecture:** Ein reines Browser-Fachmodul validiert, priorisiert und führt versionierte Befunde zusammen. `js/storage.js` speichert Journal und Importbelege in Workspace-Schema 5; der bestehende Gemini-Endpunkt erhält einen streng validierten PDF-Vertrag, während `js/development-import.js` nur Vorschau und atomare Bestätigung orchestriert.

**Tech Stack:** Vanilla JavaScript/IIFE, Web Crypto SHA-256, Vercel Node Functions, Gemini Generate Content REST API, JSDOM- und Node-Smoke-Tests, bestehendes Workspace-JSON.

**Spec:** `docs/superpowers/specs/2026-10-12-player-development-game-analysis-design.md`

## Global Constraints

- Storage-Schema wird exakt von 4 auf 5 erhöht; es gibt keine PostgreSQL-Migration.
- Neue Top-Level-Listen heißen `developmentFindings` und `developmentImportReceipts`.
- PDF-Bytes und vollständige PDF-Texte werden weder gespeichert noch protokolliert.
- `evidenceExcerpt` ist höchstens 400 Zeichen lang.
- `suggestedPriority` und `coachPriority` liegen zwischen 1 und 5; `coachPriority` darf `null` sein.
- Erlaubte Statuswerte sind `new`, `developing`, `stable` und `achieved`.
- Erlaubte Geltungsbereiche sind `player` und `team`; Spieler-PDFs erzeugen ausschließlich `player`-Kandidaten.
- Kein Befund wird vor ausdrücklicher Coach-Bestätigung gespeichert.
- Ein fehlgeschlagener oder abgebrochener Import verändert den Workspace nicht.
- Das bestehende Training `tr_u9ki7ul9pxyo` vom 13.10.2026 wird in dieser Lieferstufe nicht verändert.
- Alle produktiven KI-Aufrufe bleiben serverseitig authentifiziert; `GEMINI_API_KEY` gelangt nie in den Browser.

## Review Focus

- Ein Spieler wird nach der KI-Antwort gelöscht oder archiviert: Die Bestätigung muss die Zuordnung erneut prüfen und atomar abbrechen — Test in Task 4.
- Zwei Geräte ändern denselben Befund mit identischem `updatedAt`: Der Merge muss deterministisch sein und unabhängige Befunde behalten — Test in Task 2.
- Dieselbe PDF wird unter anderem Dateinamen erneut gewählt: Der SHA-256-Beleg muss den Doppelimport verhindern — Test in Task 4.
- Eine KI-Antwort liefert erlaubte JSON-Form, aber unbekannte Kategorie, `skillKey` oder überlangen Beleg: Der Serververtrag muss sie ablehnen — Test in Task 3.
- Ein altes Schema-4-Backup wird ersetzt oder gemergt: Beide neuen Listen müssen vorhanden sein, ohne bestehende Spieler oder Trainings zu verlieren — Test in Task 2.

---

## File Structure

- Create `js/development-core.js`: Taxonomie, Befundvalidierung, Priorisierung und deterministischer ID-Merge.
- Create `js/development-import.js`: Hashing, KI-Aufruf, Zuordnungsvorschau und atomare Importbestätigung.
- Create `scripts/development-storage-smoke.mjs`: Schema-, Prioritäts-, Backup- und Merge-Regressionen.
- Create `scripts/development-import-smoke.mjs`: KI-PDF- und Bestätigungsablauf einschließlich Doppelimport.
- Modify `js/storage.js`: Schema 5 und atomare Journal-/Importbeleg-APIs.
- Modify `js/history.js`: Backup-Export, Ersetzen und Merge der neuen Listen.
- Modify `js/sync.js`: Konfliktmerge der versionierten Entwicklungsdaten.
- Modify `api/_lib/workspace-data.js`: Formprüfung und Ausblendung für Viewer.
- Modify `api/workspace.js`: serverseitige Formprüfung des Entwicklungsjournals.
- Modify `api/_lib/ai-contracts.js`: Vertrag `player-development-import.v1`.
- Modify `js/api.js`: 55-Sekunden-Timeout für `parsePlayerDevelopmentPdf`.
- Modify `js/games.js`: Einstieg „Spielerbewertungen importieren“ im Spieldetail.
- Modify `index.html`: Importdialog und Script-Einbindung.
- Modify `sw.js`, `scripts/check.mjs` und `package.json`: Offline-Cache und Testregistrierung.

### Task 1: Fachmodell, Taxonomie und deterministische Priorisierung

**Files:**
- Create: `js/development-core.js`
- Create: `scripts/development-storage-smoke.mjs`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Produces: `BT.developmentCore.TAXONOMY` und `BT.developmentCore.STATUSES`.
- Produces: `validateFinding(finding, context): object`; gibt eine normalisierte Kopie zurück oder wirft `TypeError`.
- Produces: `profileForPlayer(findings, playerId, nowIso): { priorities, strengths, history }`.
- Produces: `mergeVersionedById(local, remote): object[]`.
- Produces: `mergeDevelopmentWorkspace(local, remote): object`.

- [ ] **Step 1: Fehlschlagenden Fachmodelltest schreiben**

  `scripts/development-storage-smoke.mjs` lädt `js/development-core.js` in JSDOM und prüft mindestens:

  ```js
  const finding = core.validateFinding({
    id: 'df_1', scope: 'player', playerId: 'p1', sourceGameId: 'g1',
    sourceType: 'player-evaluation-pdf', sourceHash: 'sha256:' + 'a'.repeat(64),
    category: 'decision', skillKey: 'turnover-control',
    kind: 'development', observation: 'Pass unter Druck zu früh.',
    evidenceExcerpt: 'Dritter Ballverlust gegen Druck.', evidenceRefs: [],
    suggestedPriority: 4, coachPriority: null, pinned: false,
    roleRelevant: true, status: 'new',
    createdAt: NOW, confirmedAt: NOW, updatedAt: NOW
  }, { playerIds: new Set(['p1']), gameIds: new Set(['g1']) });
  assert.equal(finding.scope, 'player');
  assert.throws(() => core.validateFinding({ ...finding, skillKey: 'frei-erfunden' }, context));
  assert.throws(() => core.validateFinding({ ...finding, evidenceExcerpt: 'x'.repeat(401) }, context));
  ```

  Der Test legt weitere Befunde für `g2` und `g3` an und erwartet genau drei
  Prioritäten, Wiederholungsbonus nur über unterschiedliche Spiele, Ausschluss
  von `achieved`, aggregierte eindeutige `drillTags` sowie getrennte Stärken.
  Für zwei Einträge mit gleicher ID und gleichem `updatedAt` erwartet er auf
  beiden Geräten dasselbe Merge-Ergebnis.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/development-storage-smoke.mjs`

  Expected: FAIL mit `ENOENT` oder fehlendem `BT.developmentCore`.

- [ ] **Step 3: Taxonomie und Validierung minimal implementieren**

  `js/development-core.js` wird als IIFE aufgebaut:

  ```js
  window.BT = window.BT || {};
  BT.developmentCore = (function () {
    const TAXONOMY = Object.freeze({
      technique: ['ball-control', 'passing', 'footwork', 'shooting', 'finishing'],
      decision: ['scanning', 'advantage-read', 'pass-read', 'shot-selection', 'turnover-control'],
      offense: ['spacing', 'cutting', 'screening', 'pnr-handler', 'pnr-screener', 'off-ball'],
      defense: ['on-ball', 'closeout', 'help', 'rotation', 'screen-coverage', 'transition-defense'],
      rebounding: ['box-out', 'pursuit', 'outlet'],
      transition: ['sprint-lanes', 'early-advance', 'transition-decision'],
      role: ['point-guard-organization', 'off-ball-guard', 'wing-role', 'big-role'],
      load: ['conditioning', 'recovery', 'availability']
    });
    const STATUSES = Object.freeze(['new', 'developing', 'stable', 'achieved']);
    // validateFinding, profileForPlayer und Merge-Funktionen folgen hier.
    return { TAXONOMY, STATUSES, validateFinding, profileForPlayer, mergeVersionedById, mergeDevelopmentWorkspace };
  })();
  ```

  `validateFinding()` prüft IDs, konditionale `playerId`, Quelle, Taxonomie,
  Längen, Prioritäten, Status, Datumsstrings und bekannte Spieler/Spiele.
  `sourceHash` ist nur bei `player-evaluation-pdf` Pflicht.

- [ ] **Step 4: Priorisierung exakt nach Spezifikation implementieren**

  Die Gruppen-ID ist `playerId + ':' + category + ':' + skillKey`. Die
  Punktzahl wird ausschließlich aus bestätigten, nicht erreichten
  Spielerbefunden gebildet:

  ```js
  const score = effectivePriority * 10
    + Math.min(distinctGames.size, 3) * 5
    + (ageDays <= 14 ? 10 : ageDays <= 42 ? 5 : 0)
    + (roleRelevant ? 5 : 0)
    + (pinned ? 100 : 0)
    + ({ new: 0, developing: -5, stable: -20 }[latest.status] || 0);
  ```

  Gleiche Punktzahlen werden nach jüngstem `confirmedAt` und danach nach
  Gruppen-ID sortiert. `priorities` wird mit `slice(0, 3)` begrenzt.

- [ ] **Step 5: Deterministischen Merge implementieren**

  `mergeVersionedById()` behält jede unabhängige ID. Bei gleicher ID gewinnt
  das spätere `updatedAt`; Importbelege verwenden ersatzweise `confirmedAt`
  und danach `importedAt`. Bei identischem Zeitpunkt gewinnt deterministisch
  die lexikografisch größere `JSON.stringify()`-Darstellung. Die Funktion
  mutiert keine Eingabe.

- [ ] **Step 6: Test auf GREEN bringen und statische Prüfung registrieren**

  Run: `node scripts/development-storage-smoke.mjs && node scripts/check.mjs`

  Expected: Beide Befehle enden mit Exitcode 0. `scripts/check.mjs` enthält
  `js/development-core.js`.

- [ ] **Step 7: Commit erstellen**

  ```bash
  git add js/development-core.js scripts/development-storage-smoke.mjs scripts/check.mjs
  git commit -m "feat: add player development domain model"
  ```

### Task 2: Workspace-Schema 5, Backup und Konfliktmerge

**Files:**
- Modify: `js/storage.js`
- Modify: `js/history.js`
- Modify: `js/sync.js`
- Modify: `api/_lib/workspace-data.js`
- Modify: `api/workspace.js`
- Modify: `scripts/development-storage-smoke.mjs`
- Modify: `scripts/workspace-smoke.mjs`
- Modify: `scripts/sync-smoke.mjs`

**Interfaces:**
- Consumes: `BT.developmentCore.validateFinding()` und `mergeDevelopmentWorkspace()` aus Task 1.
- Produces: `BT.storage.getDevelopmentFindings(filter = {}): object[]`.
- Produces: `BT.storage.getDevelopmentImportReceipts(): object[]`.
- Produces: `BT.storage.saveDevelopmentImport({ receipt, findings }): { receipt, findings }`.
- Produces: `BT.storage.updateDevelopmentFinding(id, changes): object`.
- Produces: `hasValidDevelopmentShape(data): boolean` auf dem Server.

- [ ] **Step 1: Schema- und Backup-Regressionen zum Test hinzufügen**

  Der Test startet mit einem Schema-4-Datensatz und erwartet:

  ```js
  assert.equal(migrated.schemaVersion, 5);
  assert.deepEqual(migrated.developmentFindings, []);
  assert.deepEqual(migrated.developmentImportReceipts, []);
  ```

  Danach speichert er zwei validierte Befunde und einen Beleg mit genau einem
  `BT.storage.saveDevelopmentImport()`-Aufruf. Ein ungültiger zweiter Befund
  muss den vollständigen Batch verwerfen. `BT.history.applyBackup(old, 'm')`
  und `applyBackup(old, 'r')` müssen die neuen Listen immer anlegen.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/development-storage-smoke.mjs`

  Expected: FAIL, weil Schema 4 und die neuen Storage-Methoden aktiv sind.

- [ ] **Step 3: Storage-Schema und atomare APIs implementieren**

  `js/storage.js` erhält:

  ```js
  const CURRENT_SCHEMA = 5;

  if (data.schemaVersion < 5) {
    data.developmentFindings = data.developmentFindings || [];
    data.developmentImportReceipts = data.developmentImportReceipts || [];
    data.schemaVersion = 5;
  }

  function saveDevelopmentImport({ receipt, findings }) {
    const data = load();
    const context = {
      playerIds: new Set(data.players.map(item => item.id)),
      gameIds: new Set(data.games.map(item => item.id))
    };
    const normalized = findings.map(item => BT.developmentCore.validateFinding(item, context));
    if (!receipt?.id || !receipt?.sourceHash || receipt.gameId !== normalized[0]?.sourceGameId) {
      throw new TypeError('Ungültiger Importbeleg.');
    }
    if (data.developmentImportReceipts.some(item => item.sourceHash === receipt.sourceHash)) {
      throw new Error('Diese PDF wurde bereits importiert.');
    }
    const next = structuredClone(data);
    next.developmentFindings.push(...normalized);
    next.developmentImportReceipts.push(structuredClone(receipt));
    save(next);
    return { receipt, findings: normalized };
  }
  ```

  `updateDevelopmentFinding()` erlaubt nur `coachPriority`, `pinned`,
  `roleRelevant`, `status`, `linkedDrillIds` und `coachNote`, setzt
  `updatedAt` neu und validiert anschließend den vollständigen Eintrag.

- [ ] **Step 4: Backup und Sync ergänzen**

  `js/history.js` erweitert `IMPORT_LISTS` um beide Listen und verwendet
  `schemaVersion: 5`. Nur diese beiden Listen werden beim Modus `m` über
  `BT.developmentCore.mergeVersionedById()` zusammengeführt; das bisherige
  Verhalten anderer Listen bleibt unverändert.

  `js/sync.js` ergänzt beide Listen in `hasTeamData()`. Vor jeder Entscheidung
  in einem HTTP-409-Konflikt wird ausgeführt:

  ```js
  const mergedDevelopment = BT.developmentCore.mergeDevelopmentWorkspace(latestLocal, remote.data);
  latestLocal.developmentFindings = mergedDevelopment.developmentFindings;
  latestLocal.developmentImportReceipts = mergedDevelopment.developmentImportReceipts;
  ```

  Damit bleiben unabhängige Befunde erhalten; die übrigen Workspace-Daten
  folgen weiterhin der bestehenden Zeitstempelregel.

- [ ] **Step 5: Serverform und Viewer-Datenschutz testen und implementieren**

  `scripts/workspace-smoke.mjs` erwartet, dass `filterWorkspaceForRole(data,
  'viewer')` beide Entwicklungslisten entfernt und dass Objekte statt Arrays
  von `hasValidDevelopmentShape()` abgelehnt werden.

  `api/_lib/workspace-data.js` exportiert:

  ```js
  export function hasValidDevelopmentShape(data) {
    return (data?.developmentFindings === undefined || Array.isArray(data.developmentFindings))
      && (data?.developmentImportReceipts === undefined || Array.isArray(data.developmentImportReceipts));
  }
  ```

  `api/workspace.js` antwortet bei ungültiger Form mit HTTP 400 und
  `Ungültige Entwicklungsdaten.`.

- [ ] **Step 6: Task-Verifikation ausführen**

  Run: `node scripts/development-storage-smoke.mjs && node scripts/workspace-smoke.mjs && node scripts/sync-smoke.mjs`

  Expected: Alle drei Tests enden mit Exitcode 0; der Schema-4-Fall verliert
  keine Spieler oder Trainings.

- [ ] **Step 7: Commit erstellen**

  ```bash
  git add js/storage.js js/history.js js/sync.js api/_lib/workspace-data.js api/workspace.js scripts/development-storage-smoke.mjs scripts/workspace-smoke.mjs scripts/sync-smoke.mjs
  git commit -m "feat: sync confirmed development findings"
  ```

### Task 3: Strenger Gemini-Vertrag für Spielerbewertungs-PDFs

**Files:**
- Modify: `api/_lib/ai-contracts.js`
- Modify: `js/api.js`
- Create: `scripts/development-import-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: bestehende `AIError`- und `buildAIRequest()`-Infrastruktur.
- Produces: Aktion `parsePlayerDevelopmentPdf` mit Vertrag `player-development-import.v1`.
- Produces: validierten Wert `{ contractVersion, sourceLabel, candidates, warnings }`.

- [ ] **Step 1: Vertrags-Smoke-Test schreiben**

  `scripts/development-import-smoke.mjs` baut eine Anfrage mit kleinem
  Base64-PDF, Spielmetadaten und bekannten Spielernamen. Er prüft:

  ```js
  const request = buildAIRequest('parsePlayerDevelopmentPdf', {
    fileBase64: 'JVBERi0xLjQK',
    mimeType: 'application/pdf',
    game: { date: '2026-10-10', opponent: 'BG Illertal 3' },
    knownPlayerNames: ['Dhruva', 'Dennis']
  });
  assert.equal(request.timeoutMs, 48_000);
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.generationConfig.thinkingConfig.thinkingLevel, 'low');
  ```

  Gültige Kandidaten enthalten nur `playerName`, `category`, `skillKey`,
  `kind`, `observation`, `evidenceExcerpt`, `sourcePage`,
  `suggestedPriority`, `drillTags` und `roleRelevant`. Tests lehnen
  unbekannte Taxonomie, Priorität 6, 401 Zeichen Beleg, leeren Spielernamen,
  erfundene IDs, falschen MIME-Typ, zu große Base64-Daten und eine
  diagnostische Aussage wie „Meniskusriss bestätigt“ ab. Zusätzlich prüft der
  Test, dass der Prompt medizinische Diagnosen ausdrücklich verbietet.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/development-import-smoke.mjs`

  Expected: FAIL mit `Unbekannte KI-Aktion.`.

- [ ] **Step 3: Schema, Prompt und Parser implementieren**

  `api/_lib/ai-contracts.js` erhält `PLAYER_DEVELOPMENT_IMPORT_SCHEMA`. Der
  Prompt verlangt ausschließlich sichtbare PDF-Inhalte, kurze Belege,
  nullbasierte freie Textinterpretation ohne IDs und verbietet medizinische
  Diagnose sowie ergänzte Statistiken.

  Der Parser setzt den Vertrag fest:

  ```js
  return {
    contractVersion: 'player-development-import.v1',
    sourceLabel: limitedString(value.sourceLabel, 120),
    candidates: value.candidates.map(normalizePlayerDevelopmentCandidate),
    warnings: limitedStrings(value.warnings, 20, 240)
  };
  ```

  `normalizePlayerDevelopmentCandidate()` gleicht `category` und `skillKey`
  gegen dieselbe fest codierte Taxonomie ab, begrenzt Beobachtung auf 500,
  Beleg auf 400, Tags auf zehn Einträge und Seite auf positive Ganzzahl.

- [ ] **Step 4: Browser-Timeout ergänzen**

  `js/api.js` behandelt `parsePlayerDevelopmentPdf` wie `parsePlan` und
  `planSeason` mit `timeoutMs: 55_000`.

- [ ] **Step 5: Testskript registrieren und GREEN bestätigen**

  `package.json` erhält:

  ```json
  "test:development": "node scripts/development-storage-smoke.mjs && node scripts/development-import-smoke.mjs"
  ```

  `npm test` ruft `npm run test:development` nach `npm run test:ai` auf.

  Run: `npm run test:development && npm run test:ai`

  Expected: Beide Skripte enden mit Exitcode 0.

- [ ] **Step 6: Commit erstellen**

  ```bash
  git add api/_lib/ai-contracts.js js/api.js scripts/development-import-smoke.mjs package.json
  git commit -m "feat: parse player evaluation PDFs safely"
  ```

### Task 4: Importvorschau, Spielerzuordnung und atomare Bestätigung

**Files:**
- Create: `js/development-import.js`
- Modify: `js/games.js`
- Modify: `index.html`
- Modify: `scripts/development-import-smoke.mjs`
- Modify: `scripts/check.mjs`
- Modify: `sw.js`

**Interfaces:**
- Consumes: `BT.api.ai('parsePlayerDevelopmentPdf', payload)` und `BT.storage.saveDevelopmentImport()`.
- Produces: `BT.developmentImport.parseFile(file, game, onProgress): Promise<draft>`.
- Produces: `BT.developmentImport.buildPreview(draft, players, game): preview`.
- Produces: `BT.developmentImport.confirm(preview, selections): savedBatch`.
- Produces: `BT.developmentImport.open(game): Promise<void>`.

- [ ] **Step 1: Browserablauf im Smoke-Test festschreiben**

  Der Test stellt `File`, `crypto.subtle`, zwei Spieler, ein Spiel und einen
  Fake-KI-Response bereit. Er erwartet:

  ```js
  const draft = await BT.developmentImport.parseFile(file, game);
  assert.match(draft.sourceHash, /^sha256:[0-9a-f]{64}$/);
  const preview = BT.developmentImport.buildPreview(draft, players, game);
  assert.equal(preview.rows[0].suggestedPlayerId, 'p_dhruva');
  const saved = BT.developmentImport.confirm(preview, [{
    candidateIndex: 0, playerId: 'p_dhruva', accepted: true,
    coachPriority: 5, roleRelevant: true
  }]);
  assert.equal(saved.findings.length, 1);
  ```

  Danach wird `p_dhruva` vor `confirm()` gelöscht; der Test erwartet einen
  Fehler und exakt unveränderte JSON-Daten. Ein bereits vorhandener
  `sourceHash` muss vor einem zweiten KI-Aufruf mit „bereits importiert“
  abbrechen.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/development-import-smoke.mjs`

  Expected: FAIL, weil `js/development-import.js` fehlt.

- [ ] **Step 3: Dateiverarbeitung und Vorschau implementieren**

  `parseFile()` akzeptiert nur `application/pdf` und höchstens 3 MiB
  Originalgröße. Es liest denselben `ArrayBuffer` für SHA-256 und Base64:

  ```js
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sourceHash = 'sha256:' + [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  ```

  Vor dem KI-Aufruf prüft die Funktion vorhandene Importbelege. Der Draft
  bleibt nur im Speicher und enthält keine CourtHub-IDs aus der KI-Antwort.
  `buildPreview()` ordnet normalisierte Namen nur bei genau einem Treffer
  automatisch zu; alle übrigen Reihen bleiben sichtbar ungeklärt.

- [ ] **Step 4: Bestätigung atomar implementieren**

  `confirm()` liest Spieler und Spiel unmittelbar vor dem Speichern erneut,
  verwirft abgelehnte Reihen, verlangt für jede angenommene Reihe eine gültige
  Spieler-ID und erzeugt `df_`-/`dir_`-IDs über `BT.util.uuid()`. Erst danach
  ruft es genau einmal `saveDevelopmentImport()` auf.

  `sourceLabel` wird auf Steuerzeichen, Pfadanteile und 120 Zeichen bereinigt.
  `evidenceExcerpt` wird nie aus einem vollständigen PDF-Text erzeugt, sondern
  ausschließlich aus dem validierten Kandidaten übernommen.

- [ ] **Step 5: Dialog und Spieleinstieg implementieren**

  Das Spieldetail in `js/games.js` erhält neben Atlas:

  ```html
  <button class="btn small" type="button" data-action="import-player-evaluations">
    Spielerbewertungen importieren
  </button>
  <p class="auth-status" data-role="development-import-status" aria-live="polite"></p>
  ```

  Der Dialog in `index.html` zeigt pro Kandidat Spielerzuordnung, Stärke oder
  Entwicklungsfeld, Kategorie, Beobachtung, Belegseite, Coach-Priorität,
  Rollenrelevanz und Annehmen/Ablehnen. „Bestätigte Beobachtungen speichern“
  bleibt deaktiviert, solange eine angenommene Reihe ungeklärt ist.

- [ ] **Step 6: Offline- und Syntaxregistrierung abschließen**

  `index.html` lädt `js/development-core.js` vor `js/development-import.js`
  und beide vor `js/games.js`. `sw.js` nimmt beide Dateien auf und erhöht
  `CACHE` von `courthub-v205` auf `courthub-v206`.
  `scripts/check.mjs` prüft `js/development-import.js`.

- [ ] **Step 7: Task-Verifikation ausführen**

  Run: `npm run test:development && node scripts/check.mjs && npm run smoke`

  Expected: Alle Befehle enden mit Exitcode 0. Der Test bestätigt, dass
  `JSON.stringify(BT.storage.load())` vor der finalen Bestätigung unverändert
  bleibt.

- [ ] **Step 8: Commit erstellen**

  ```bash
  git add js/development-import.js js/games.js index.html scripts/development-import-smoke.mjs scripts/check.mjs sw.js
  git commit -m "feat: confirm player PDF findings before save"
  ```

### Task 5: Vollständige Regression und dokumentierter Stufenabschluss

**Files:**
- Modify: `docs/BASKETBALL-AI.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: sämtliche Schnittstellen aus Task 1 bis 4.
- Produces: dokumentierte Bedienung und geprüfte Grundlage für die folgenden Pläne.

- [ ] **Step 1: Dokumentation aktualisieren**

  `docs/BASKETBALL-AI.md` erhält einen Abschnitt „Spielerbewertungs-PDF“, der
  den Ablauf Datei → temporäre Analyse → Zuordnung → Einzelbestätigung →
  synchronisiertes Journal sowie die Nicht-Speicherung der PDF erklärt.
  `README.md` nennt Workspace-Schema 5 und die Coach-Bestätigungspflicht.

- [ ] **Step 2: Gesamttests der Lieferstufe ausführen**

  Run: `npm run test:development && npm run test:ai && npm test`

  Expected: Alle Befehle enden mit Exitcode 0.

- [ ] **Step 3: Schutz des bestehenden Dienstagstrainings nachweisen**

  Ein Fixture mit `tr_u9ki7ul9pxyo` wird vor und nach PDF-Import mit
  `JSON.stringify()` verglichen.

  Run: `node scripts/development-import-smoke.mjs`

  Expected: PASS mit einer expliziten Assertion
  `Das geschützte Dienstagstraining wurde durch den PDF-Import verändert`,
  die nicht ausgelöst wird.

- [ ] **Step 4: Finalen Commit erstellen**

  ```bash
  git add README.md docs/BASKETBALL-AI.md scripts/development-import-smoke.mjs
  git commit -m "docs: describe confirmed development imports"
  ```
