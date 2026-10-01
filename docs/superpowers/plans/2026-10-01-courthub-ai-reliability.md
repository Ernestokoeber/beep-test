# CourtHub KI-Zuverlässigkeit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle vier CourtHub-KI-Abläufe zuverlässig auf `gemini-3.8-flash` umstellen, ihre Datenverträge validieren und unterbrochene Saisonplanungen sicher fortsetzbar machen.

**Architecture:** Ein reiner, injizierbar testbarer Gemini-Client und ein Modul mit aktionsbezogenen Verträgen liegen unter `api/_lib/`; der Vercel-Handler übernimmt nur Authentifizierung, Rate-Limit und HTTP-Abbildung. Browserseitige reine Helfer kapseln Zusammenfassungsfakten, PDF-Schutzregeln, Saisonentwürfe und den Schema-3-Taktikserializer, während die vorhandenen Ansichten nur orchestrieren.

**Tech Stack:** Vanilla JavaScript/ESM, Vercel Node Functions, Gemini Generate Content REST API, `AbortController`, bestehende Node-/JSDOM-Smoke-Tests.

**Spec:** `docs/superpowers/specs/2026-10-01-courthub-ai-reliability-design.md`

## Global Constraints

- Alle produktiven KI-Aktionen verwenden ausschließlich `gemini-3.8-flash`.
- Der vorhandene `GEMINI_API_KEY` bleibt die einzige notwendige KI-Umgebungsvariable.
- Kein neues Gemini-SDK und keine neue Laufzeitabhängigkeit.
- Keine Datenbankmigration und kein zusätzlicher Cloud-Dienst.
- Kein KI-Ergebnis verändert CourtHub-Daten vor vollständiger Validierung und sichtbarer Bestätigung.
- Abgeschlossene, beendete oder manuell bearbeitete Trainings werden nie überschrieben.
- Provider-Prompts, PDF-Inhalte, Rohantworten und Personendaten werden nicht protokolliert.
- Das Vercel-Limit für `api/ai/gemini.js` bleibt 60 Sekunden; der eigene Provider-Abbruch erfolgt vorher.
- Saisonentwürfe bleiben gerätebezogen und werden nicht in das Team-Workspace-Dokument geschrieben.
- Die bestehende manuelle Trainingszusammenfassung bleibt als Fallback erhalten.

## Review Focus

- `finishReason = MAX_TOKENS` bei HTTP 200 muss `AI_TRUNCATED_RESPONSE` liefern, ohne JSON anzuwenden — Test in Task 1.
- Eine Zusammenfassung mit unbekanntem Namen oder unbekannter Zahl muss abgelehnt werden — Test in Task 1.
- Ein PDF-Import auf ein manuell befülltes oder abgeschlossenes Training muss sichtbar übersprungen werden — Test in Task 3.
- Ein lokaler Saisonentwurf mit verändertem Payload-Hash darf nicht fortgesetzt werden — Test in Task 4.
- Pick-and-Roll, gleichzeitiger Screen und Zonenverteidiger müssen im Taktik-Payload erhalten bleiben — Test in Task 5.

---

### Task 1: Gemini-3.8-Client und aktionsbezogene Serververträge

**Files:**
- Create: `api/_lib/ai-contracts.js`
- Create: `api/_lib/gemini-client.js`
- Create: `scripts/ai-gateway-smoke.mjs`
- Modify: `scripts/check.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `AI_MODEL_ID: "gemini-3.8-flash"` und `AI_CONTRACT_VERSION: 1`.
- Produces: `buildAIRequest(action, payload): { parts, generationConfig, timeoutMs, parse(text, context) }`.
- Produces: `AIError` mit `code`, `status`, `retryable` und sicherer deutscher `message`.
- Produces: `generateWithGemini({ action, payload, apiKey, requestId, fetchImpl, now, setTimer, clearTimer }): Promise<{ value, model, requestId, durationMs }>`.
- Consumes: keine Anwendungsmodule; beide Servermodule bleiben ohne Datenbank testbar.

- [ ] **Step 1: Gateway-Vertrag als fehlschlagenden Test schreiben**

  `scripts/ai-gateway-smoke.mjs` importiert die noch nicht vorhandenen Module und prüft mindestens:

  ```js
  import { AI_MODEL_ID, buildAIRequest } from '../api/_lib/ai-contracts.js';
  import { generateWithGemini } from '../api/_lib/gemini-client.js';

  assert(AI_MODEL_ID === 'gemini-3.8-flash', 'Falsches Gemini-Modell');
  const season = buildAIRequest('planSeason', {
    data: { slots: [{ date: '2026-10-06', weekday: 'tue' }] }
  });
  assert(season.generationConfig.responseMimeType === 'application/json', 'JSON-MIME fehlt');
  assert(season.generationConfig.thinkingConfig.thinkingLevel === 'medium', 'Saison-Thinking-Level falsch');
  assert(season.generationConfig.responseSchema.type === 'object', 'Saison-Schema fehlt');
  ```

  Der Test enthält Fake-Fetch-Antworten für gültiges JSON, gültigen Text,
  `MAX_TOKENS`, leere Kandidaten, ungültiges JSON, Schemafehler, `429`, `500`,
  `503` und einen bis zum Abort offenen Request. Der Zusammenfassungstest
  übergibt erlaubte Fakten und erwartet bei `"Max erzielte 99 %"` einen
  `AI_INVALID_RESPONSE`, wenn weder Name noch Zahl in den referenzierten Fakten
  vorkommen.

- [ ] **Step 2: Test ausführen und den erwarteten RED-Zustand bestätigen**

  Run: `node scripts/ai-gateway-smoke.mjs`

  Expected: FAIL mit `ERR_MODULE_NOT_FOUND` für `api/_lib/ai-contracts.js`.

- [ ] **Step 3: Aktionsverträge mit vollständigen JSON-Schemas implementieren**

  `api/_lib/ai-contracts.js` exportiert die Konstanten, `AIError`, vier Prompts,
  vier JSON-Schemas und die beiden Funktionen. Der zentrale Aufbau folgt
  diesem Vertrag:

  ```js
  export const AI_MODEL_ID = 'gemini-3.8-flash';
  export const AI_CONTRACT_VERSION = 1;

  export class AIError extends Error {
    constructor(code, message, { status = 502, retryable = false } = {}) {
      super(message);
      this.name = 'AIError';
      this.code = code;
      this.status = status;
      this.retryable = retryable;
    }
  }

  export function buildAIRequest(action, payload = {}) {
    const contract = ACTIONS[action];
    if (!contract) throw new AIError('AI_INPUT_INVALID', 'Unbekannte KI-Aktion.', { status: 400 });
    return contract.build(payload);
  }
  ```

  Die Verträge sind exakt:

  - `parsePlan`: Payload aus `fileBase64`, `mimeType`, `schedule.days`,
    `schedule.time`, `schedule.durationMinutes`; Thinking `low`; Timeout 48.000
    ms; Ausgabe `{ phase, trainings }` mit begrenzten Strings und Zahlen.
  - `summarizeTraining`: Payload `{ facts }`; Thinking `low`; Timeout 30.000
    ms; Ausgabe `{ sentences: [{ text, factIds }] }`; drei bis vier Sätze.
  - `explainTactic`: Payload `{ tactic }`; Thinking `low`; Timeout 30.000 ms;
    Ausgabe `{ explanation, coachingPoints }`.
  - `planSeason`: höchstens zwei Slots; Thinking `medium`; Timeout 48.000 ms;
    Ausgabe `{ trainings }` mit exakt denselben Datumswerten und vollständigen
    Freitagsvarianten.

  Für strukturierte Aktionen setzt jeder Build:

  ```js
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema,
    thinkingConfig: { thinkingLevel }
  }
  ```

  Die Zusammenfassungsvalidierung extrahiert Namen und Zahlen aus jedem Satz.
  Sie erlaubt sie nur, wenn alle referenzierten Fakten-IDs existieren und Name
  bzw. normalisierte Zahl in mindestens einem dieser Fakten vorkommen. Danach
  werden die Sätze mit Leerzeichen zu `value.text` verbunden.

- [ ] **Step 4: Gemini-Transport mit Gesamtdeadline implementieren**

  `api/_lib/gemini-client.js` baut die REST-Anfrage ausschließlich aus dem
  Request-Objekt und wertet Kandidat sowie `finishReason` aus:

  ```js
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL_ID}:generateContent`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: request.parts }],
      generationConfig: request.generationConfig
    }),
    signal: controller.signal
  });
  ```

  `MAX_TOKENS` und andere unvollständige Finish-Gründe werden vor dem Parser in
  `AI_TRUNCATED_RESPONSE` übersetzt. Der Timer wird immer in `finally` entfernt.
  Ein früher `429`, `500` oder `503` darf genau einmal wiederholt werden, wenn
  bis zur Deadline mindestens 20.000 ms verbleiben. Ein Abort wird
  `AI_TIMEOUT`; JSON-, Schema- und Inhaltsfehler werden nicht serverseitig
  wiederholt. Provider-Rohtexte werden nie Teil des Fehlers.

- [ ] **Step 5: Gateway-Test auf GREEN bringen**

  Run: `node scripts/ai-gateway-smoke.mjs`

  Expected: PASS mit Abschlusszeile
  `CourtHub KI-Gateway: Modell, Schema, Timeout und Fehlerverträge erfolgreich.`

- [ ] **Step 6: Neue Dateien in statische Prüfung und Testskript aufnehmen**

  `scripts/check.mjs` erhält `api/_lib/ai-contracts.js` und
  `api/_lib/gemini-client.js`. `package.json` erhält:

  ```json
  "test:ai": "node scripts/ai-gateway-smoke.mjs"
  ```

  `npm test` ruft `npm run test:ai` vor den allgemeinen Smoke-Tests auf.

- [ ] **Step 7: Task-Verifikation ausführen**

  Run: `npm run test:ai && node scripts/check.mjs`

  Expected: beide Befehle mit Exitcode 0.

- [ ] **Step 8: Commit erstellen**

  ```bash
  git add api/_lib/ai-contracts.js api/_lib/gemini-client.js scripts/ai-gateway-smoke.mjs scripts/check.mjs package.json
  git commit -m "feat: add validated Gemini 3.8 gateway"
  ```

### Task 2: HTTP-Handler und Browserfehler auf den neuen Vertrag umstellen

**Files:**
- Create: `api/_lib/ai-handler.js`
- Create: `scripts/ai-api-smoke.mjs`
- Modify: `api/ai/gemini.js`
- Modify: `js/api.js`
- Modify: `scripts/check.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildAIRequest()`, `generateWithGemini()` und `AIError` aus Task 1.
- Produces: `createAIHandler({ requireMembership, query, generate, getApiKey }): (req, res) => Promise<void>`.
- Produces: `BT.api.ai(action, payload)` mit aktionsbezogenem Browser-Timeout und Fehlerfeldern `code`, `retryable`, `requestId`.

- [ ] **Step 1: Handler- und Browserfehler-Tests zuerst schreiben**

  `scripts/ai-api-smoke.mjs` testet den injizierten Handler mit Fake-Request,
  Fake-Response, Fake-Mitgliedschaft und Fake-Query. Es erwartet:

  ```js
  assert(success.statusCode === 200, 'KI-Erfolg wird nicht als 200 ausgegeben');
  assert(success.body.model === 'gemini-3.8-flash', 'Modell fehlt in der Antwort');
  assert(timeout.statusCode === 504, 'KI-Timeout wird nicht als 504 ausgegeben');
  assert(timeout.body.code === 'AI_TIMEOUT' && timeout.body.retryable === true, 'Timeout-Vertrag fehlt');
  assert(rateLimited.statusCode === 429, 'Rate-Limit wird nicht als 429 ausgegeben');
  assert(seasonLimit === 60 && summaryLimit === 30, 'Aktionslimits sind falsch');
  ```

  Derselbe Test lädt `js/api.js` mit Fake-`fetch`, löst einen `AbortError`, einen
  JSON-Fehler mit `code` und eine HTML-504-Antwort aus und erwartet jeweils
  `KI-Anfrage hat zu lange gedauert.`, den Servertext bzw.
  `KI-Server hat die Anfrage vorzeitig beendet.` statt der bisherigen
  Adressmeldung.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/ai-api-smoke.mjs`

  Expected: FAIL mit `ERR_MODULE_NOT_FOUND` für `api/_lib/ai-handler.js`.

- [ ] **Step 3: Injizierbaren Handler implementieren**

  `api/_lib/ai-handler.js` enthält `limitForAction(action)` mit 60 für
  `planSeason` und 30 für alle anderen Aktionen. `createAIHandler()` führt in
  dieser Reihenfolge aus: Methode, Mitgliedschaft, Schlüssel, Eingabevertrag,
  Rate-Limit, Gemini-Aufruf, Erfolgsantwort. `AIError` wird so abgebildet:

  ```js
  res.status(error.status || 502).json({
    error: error.message,
    code: error.code || 'AI_PROVIDER',
    retryable: error.retryable === true,
    requestId
  });
  ```

  Unerwartete Fehler werden mit Aktion, `requestId` und Fehlername geloggt, aber
  ohne Payload oder Rohantwort. Der öffentliche Handler in `api/ai/gemini.js`
  injiziert die bestehenden `requireMembership`, `query`,
  `generateWithGemini` und `process.env.GEMINI_API_KEY`.

  Die Erfolgsabbildung bleibt clientkompatibel und ist explizit:

  ```js
  if (action === 'summarizeTraining') {
    return res.status(200).json({ text: result.value.text, model: result.model, requestId: result.requestId });
  }
  if (action === 'explainTactic') {
    return res.status(200).json({ text: result.value.explanation, coachingPoints: result.value.coachingPoints, model: result.model, requestId: result.requestId });
  }
  return res.status(200).json({ data: result.value, model: result.model, requestId: result.requestId });
  ```

- [ ] **Step 4: Browser-Request um kontrollierten Timeout erweitern**

  `request(path, options)` erzeugt nur dann einen `AbortController`, wenn
  `options.timeoutMs` gesetzt ist. Bei Abort entsteht Status 0 und Code
  `CLIENT_TIMEOUT`. Serverfelder werden am Error erhalten:

  ```js
  error.status = response.status;
  error.code = data.code || null;
  error.retryable = data.retryable === true;
  error.requestId = data.requestId || null;
  ```

  `BT.api.ai()` verwendet 55.000 ms für `parsePlan` und `planSeason`, 38.000 ms
  für `summarizeTraining` und `explainTactic`. Bei nicht parsebarer 504-Antwort
  wird die aktionsbezogene KI-Servermeldung erzeugt.

- [ ] **Step 5: Tests auf GREEN bringen und registrieren**

  Run: `node scripts/ai-api-smoke.mjs`

  Expected: PASS mit
  `CourtHub KI-API: Auth, Limits, Fehler und Browser-Timeout erfolgreich.`

  Danach `api/_lib/ai-handler.js` in `scripts/check.mjs` und
  `node scripts/ai-api-smoke.mjs` in `test:ai` ergänzen.

- [ ] **Step 6: Task-Verifikation ausführen**

  Run: `npm run test:ai && node scripts/check.mjs`

  Expected: Exitcode 0.

- [ ] **Step 7: Commit erstellen**

  ```bash
  git add api/_lib/ai-handler.js api/ai/gemini.js js/api.js scripts/ai-api-smoke.mjs scripts/check.mjs package.json
  git commit -m "fix: return actionable AI request errors"
  ```

### Task 3: Trainingszusammenfassung und PDF-Import absichern

**Files:**
- Create: `js/ai-core.js`
- Create: `scripts/ai-flows-smoke.mjs`
- Modify: `js/aiimport.js`
- Modify: `js/schedule.js`
- Modify: `js/training.js`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `scripts/check.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `BT.api.ai()` mit Fehlervertrag aus Task 2.
- Produces: `BT.aicore.buildSummaryFacts(training, previous, players): { facts }`.
- Produces: `BT.aicore.classifyPdfImport(parsed, trainings): { items, counts }`.
- Produces: `BT.aicore.isProtectedTraining(training): boolean`.
- Produces: `BT.aiimport.summarizeTraining(training, previous, onProgress): Promise<{ text, model, requestId }>`.
- Produces: `BT.aiimport.applyPlanToTrainings(parsed, preview)`; verändert nur als `new` oder `fillable` klassifizierte Einträge.

- [ ] **Step 1: Fachregeln als fehlschlagenden Test schreiben**

  `scripts/ai-flows-smoke.mjs` lädt `js/ai-core.js` und prüft reale Objekte:

  ```js
  const facts = BT.aicore.buildSummaryFacts(current, previous, players).facts;
  assert(facts.every(fact => fact.id && fact.text), 'Zusammenfassungsfakten sind nicht referenzierbar');
  assert(facts.some(fact => fact.text.includes('71 %')), 'Freiwurf-Fakt fehlt');

  const preview = BT.aicore.classifyPdfImport(parsed, [
    { id: 'manual', date: '2026-10-06', note: 'Coach-Plan', plan: { drills: [] } },
    { id: 'done', date: '2026-10-09', status: 'completed', endedAt: '2026-10-09T22:00:00Z' },
    { id: 'empty', date: '2026-10-13', note: '', attendance: [], freethrows: [], shots: [] }
  ]);
  assert(preview.items.find(item => item.date === '2026-10-06').action === 'protected', 'Manueller Plan ist nicht geschützt');
  assert(preview.items.find(item => item.date === '2026-10-09').action === 'protected', 'Abgeschlossenes Training ist nicht geschützt');
  assert(preview.items.find(item => item.date === '2026-10-13').action === 'fillable', 'Leerer Termin wird nicht erkannt');
  ```

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/ai-flows-smoke.mjs`

  Expected: FAIL, weil `js/ai-core.js` fehlt.

- [ ] **Step 3: Reine Browserfachlogik implementieren**

  `js/ai-core.js` ist ein klassisches IIFE-Modul und exportiert über
  `BT.aicore`. Fakten besitzen `{ id, type, text, names, numbers }`; Namen und
  Zahlen werden bereits beim Erstellen normalisiert. `isProtectedTraining()`
  liefert `true` bei Status/Endzeit, nichtleerer Notiz, bestehender Planung,
  Anwesenheitswert, Freiwurfwert oder Wurfeintrag. Ein vollständig leerer,
  zukünftiger Termin ist `fillable`.

  `classifyPdfImport()` liefert pro erkanntem Plan:

  ```js
  {
    date,
    action: 'new' | 'fillable' | 'protected',
    reason: 'Neuer Termin' | 'Leerer Termin' | 'Bereits manuell oder abgeschlossen',
    existingId: string | null,
    planEntry
  }
  ```

- [ ] **Step 4: Zusammenfassungs- und PDF-Aufrufer umstellen**

  `js/aiimport.js` entfernt die doppelten ungenutzten Prompt-Konstanten und
  verwendet `BT.aicore.buildSummaryFacts()`. Der PDF-Aufruf sendet:

  ```js
  {
    fileBase64: base64,
    mimeType: mime,
    schedule: {
      days: BT.storage.getSetting('regularDays', ['tue', 'fri']),
      time: BT.storage.getSetting('regularTime', '20:15'),
      durationMinutes: Number(BT.storage.getSetting('trainingDurationMinutes', 105)) || 105
    }
  }
  ```

  `applyPlanToTrainings()` akzeptiert nur die bestätigte Vorschau. Neue und
  befüllte Einheiten erhalten `planning.source = 'ai-pdf'`, `status = 'draft'`
  und `coachEdited = false`; geschützte Einträge werden nicht mutiert.
  `summarizeTraining()` gibt die Serverantwort mit `text`, `model` und
  `requestId` zurück. `js/training.js` liest diese Felder, setzt den Text in das
  Textfeld und zeigt `gemini-3.8-flash` sowie die Request-ID im Status an.

- [ ] **Step 5: PDF-Vorschau in der Trainingsplanung darstellen**

  `js/schedule.js` ersetzt die einfache Trainingsliste im `confirm()` durch
  drei Abschnitte: neu, leerer Termin wird befüllt, geschützt/übersprungen. Die
  Bestätigung nennt alle Zähler. Nach Übernahme zeigt der Status zusätzlich die
  Anzahl übersprungener Einheiten. Bei null anwendbaren Einträgen wird kein
  Bestätigungsdialog geöffnet.

- [ ] **Step 6: Offline- und Lade-Reihenfolge ergänzen**

  `index.html` lädt `js/ai-core.js` unmittelbar vor `js/aiimport.js`.
  `scripts/check.mjs` prüft die Datei. `sw.js` enthält das Asset und erhöht den
  Cache von `courthub-v140` auf `courthub-v141`.

- [ ] **Step 7: Tests auf GREEN bringen und registrieren**

  Run: `node scripts/ai-flows-smoke.mjs`

  Expected: PASS mit
  `CourtHub KI-Abläufe: Fakten und PDF-Schutzregeln erfolgreich.`

  `test:ai` wird um den neuen Test ergänzt.

- [ ] **Step 8: Task-Verifikation ausführen**

  Run: `npm run test:ai && node scripts/check.mjs`

  Expected: Exitcode 0.

- [ ] **Step 9: Commit erstellen**

  ```bash
  git add js/ai-core.js js/aiimport.js js/schedule.js js/training.js index.html sw.js scripts/ai-flows-smoke.mjs scripts/check.mjs package.json
  git commit -m "fix: ground summaries and protect PDF imports"
  ```

### Task 4: Saisonplanung wochenweise und fortsetzbar machen

**Files:**
- Create: `js/season-ai-draft.js`
- Create: `scripts/season-ai-draft-smoke.mjs`
- Modify: `js/seasonplanner.js`
- Modify: `js/schedule.js`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `scripts/check.mjs`
- Modify: `scripts/smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Serververtrag `planSeason` mit höchstens zwei Slots aus Task 1.
- Produces: `BT.seasonDraft.fingerprint(payload): string`.
- Produces: `BT.seasonDraft.load(scope, fingerprint)`, `save(scope, draft)`, `clear(scope)`.
- Produces: `splitAIPayload(payload)` gruppiert chronologisch pro Kalenderwoche mit maximal zwei Slots.
- Produces: `planInBatches(payload, requestBatch, onProgress, draftStore)` setzt einen passenden Entwurf fort und liefert `{ trainings, resumedBlocks, models, requestIds }`.

- [ ] **Step 1: Wiederaufnahme und Wochenblockbildung zuerst testen**

  `scripts/season-ai-draft-smoke.mjs` verwendet einen speicherbasierten
  `localStorage`-Ersatz und prüft:

  ```js
  const batches = BT.seasonplanner.splitAIPayload(payload);
  assert(batches.every(batch => batch.slots.length <= 2), 'Wochenblock ist zu groß');
  assert(batches[0].slots.map(slot => slot.date).join(',') === '2026-10-06,2026-10-09', 'Erste Woche wurde getrennt');

  const fingerprint = BT.seasonDraft.fingerprint(payload);
  BT.seasonDraft.save('team-a', { fingerprint, completed: [{ index: 0, trainings: [{ date: '2026-10-06' }, { date: '2026-10-09' }] }] });
  assert(BT.seasonDraft.load('team-a', fingerprint).completed.length === 1, 'Passender Entwurf wird nicht geladen');
  assert(BT.seasonDraft.load('team-a', BT.seasonDraft.fingerprint(changedPayload)) === null, 'Veralteter Entwurf wird fortgesetzt');
  ```

  Ein zweiter Test lässt Block 2 scheitern, startet `planInBatches()` erneut
  und erwartet, dass Block 1 nicht erneut angefragt wird. Die Übernahmefunktion
  darf vor dem letzten validierten Block nicht aufgerufen werden.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/season-ai-draft-smoke.mjs`

  Expected: FAIL, weil `js/season-ai-draft.js` fehlt.

- [ ] **Step 3: Gerätebezogenen Entwurfsspeicher implementieren**

  `js/season-ai-draft.js` speichert unter
  `courthub_ai_season_draft_v1:<scope>`. `fingerprint()` verwendet eine stabile
  rekursive Schlüsselreihenfolge und einen deterministischen FNV-1a-Hash über
  Modell-ID, Vertragsversion und Payload. `load()` löscht automatisch Entwürfe
  mit falscher Version oder falschem Hash. Gespeichert werden nur validierte
  Trainingsblöcke und Metadaten, keine Token.

  Der gespeicherte Vertrag lautet:

  ```js
  {
    version: 1,
    model: 'gemini-3.8-flash',
    fingerprint,
    completed: [{ index, dates, trainings }],
    nextIndex,
    createdAt,
    updatedAt
  }
  ```

- [ ] **Step 4: Saisonplaner auf Wochenblöcke und Resume umstellen**

  `splitAIPayload()` gruppiert über den Montag der ISO-Kalenderwoche statt über
  feste Vierer-Slices. `planInBatches()` lädt vor der Schleife passende
  bestätigte Blöcke, meldet sie mit `resumed: true`, speichert nach jedem
  validierten Block und belässt den Entwurf bei endgültigem Fehler. Erst nach
  vollständigem Erfolg liefert es `{ trainings, resumedBlocks, models,
  requestIds }`; Modellnamen werden dedupliziert. Der Aufrufer löscht den
  Entwurf erst nach erfolgreicher `applyAIPlan()`-Bestätigung.

- [ ] **Step 5: Oberfläche für Fortsetzung ergänzen**

  `js/schedule.js` berechnet vor dem Dialog Scope und Fingerprint. Bei passendem
  Entwurf lautet der Buttonstatus „Saisonplanung fortsetzen“ und der Dialog
  nennt die Zahl vorhandener Wochenblöcke. Fortschritt unterscheidet
  „übernommen“, „plant“ und „erneuter Versuch“. Ein Fehler nennt Blocknummer,
  Servertext und `requestId`; der Entwurf bleibt erhalten. Nach erfolgreicher
  Übernahme nennt der Abschlussstatus `gemini-3.8-flash`. Der Scope ist
  `leagueId + ':' + teamId` aus `BT.seasonplanner.scheduleConfig()` und fällt
  nur bei fehlenden IDs auf den normalisierten Teamnamen zurück.

- [ ] **Step 6: Datumabhängigen Regressionstest stabilisieren**

  In `scripts/smoke.mjs` wird nicht mehr `appliedSeason.protected === 1`
  verlangt. Der Test hält die ID und eine tiefe Kopie des ausdrücklich
  angelegten manuellen Trainings fest und prüft nach der Übernahme:

  ```js
  assert(appliedSeason.protected >= 1, 'Manuelles Training wurde nicht als geschützt gezählt');
  assert(JSON.stringify(window.BT.storage.getTraining(manualTraining.id)) === manualBefore, 'Manuelles Training wurde verändert');
  ```

- [ ] **Step 7: Offline-Manifest und Testregistrierung ergänzen**

  `index.html` lädt `js/season-ai-draft.js` vor `js/seasonplanner.js`.
  `scripts/check.mjs` enthält die Datei. `sw.js` enthält das Asset und erhöht
  den Cache auf `courthub-v142`. `test:ai` erhält den Saisonentwurfstest.

- [ ] **Step 8: Tests auf GREEN bringen**

  Run: `node scripts/season-ai-draft-smoke.mjs && node scripts/smoke.mjs`

  Expected: beide Befehle mit Exitcode 0; Abschlusszeile
  `CourtHub KI-Saisonentwurf: Wochenblöcke und Wiederaufnahme erfolgreich.`

- [ ] **Step 9: Task-Verifikation ausführen**

  Run: `npm run test:ai && npm run smoke`

  Expected: Exitcode 0.

- [ ] **Step 10: Commit erstellen**

  ```bash
  git add js/season-ai-draft.js js/seasonplanner.js js/schedule.js index.html sw.js scripts/season-ai-draft-smoke.mjs scripts/check.mjs scripts/smoke.mjs package.json
  git commit -m "fix: resume AI season planning by week"
  ```

### Task 5: KI-Erklärung in den aktuellen Play Designer integrieren

**Files:**
- Create: `js/play-designer/ai-explanation.js`
- Create: `scripts/play-designer-ai-smoke.mjs`
- Modify: `js/play-designer/quick-workflow.js`
- Modify: `js/aiimport.js`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `scripts/check.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `BT.api.ai('explainTactic', { tactic })` aus Task 2.
- Consumes: Schema-3-Board und `core.canEdit()` aus dem Play Designer.
- Produces: `serializeTactic(board, core): TacticPayload`.
- Produces: `openAIExplanation({ board, core, saveDescription, toast }): Promise<HTMLElement>`.

- [ ] **Step 1: Schema-3-Serializer als fehlschlagenden Test schreiben**

  `scripts/play-designer-ai-smoke.mjs` erstellt mit den echten Quick-Core-
  Funktionen einen Spielzug mit Dribbling, gleichzeitigem gebundenem Screen,
  Pick-and-Roll, Pass, Mann- und Zonenverteidiger sowie Phasenanweisung. Danach:

  ```js
  const payload = serializeTactic(board, core);
  assert(payload.phases.some(phase => phase.actions.some(action => action.type === 'screen')), 'Screen fehlt im KI-Payload');
  assert(payload.phases.some(phase => phase.actions.some(action => action.groupType === 'pick-and-roll')), 'Pick-and-Roll fehlt');
  assert(payload.phases.some(phase => phase.defense.some(player => player.mode === 'zone')), 'Zonenverteidigung fehlt');
  assert(payload.phases.some(phase => phase.actions.some(action => action.relation === 'simultaneous')), 'Gleichzeitigkeit fehlt');
  ```

  Der UI-Teil baut einen Quick Editor, öffnet den Mehr-Button, klickt
  `data-more="ai-explain"`, liefert eine Fake-Antwort und erwartet Dialog,
  Modellanzeige, Kopierbutton und – nur mit Bearbeitungsrecht – „Als Coaching
  Points übernehmen“.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/play-designer-ai-smoke.mjs`

  Expected: FAIL, weil `js/play-designer/ai-explanation.js` fehlt.

- [ ] **Step 3: Aktuellen Taktikserializer implementieren**

  `serializeTactic()` normalisiert das Board und liefert pro Phase:

  ```js
  {
    number,
    instruction,
    duration,
    offense: [{ id, role, x, y }],
    defense: [{ id, role, mode, x, y }],
    ball: { x, y },
    actions: [{ type, actor, receiver, beneficiary, targetDefender, kind, relation, groupId, groupType, groupRole, start, duration, end, angle, automatic }]
  }
  ```

  Bewegungen, Pässe und Screens werden chronologisch sortiert. Für Bewegungen
  ist `end` der letzte Pfadpunkt; automatische Defense-Bewegungen tragen
  `automatic: true`. Fehlende optionale IDs werden als `null`, nicht als
  erfundene Rollen ausgegeben.

- [ ] **Step 4: Dialog und Quick-Editor-Aktion implementieren**

  `openAIExplanation()` erstellt einen mobilen Dialog, setzt während der
  Anfrage Status, zeigt danach Erklärung, Coaching Points, Modell und
  `requestId`. Kopieren verwendet Clipboard mit bestehendem Fallback. Das
  Übernehmen setzt nach Bestätigung `board.description` auf höchstens 400
  Zeichen und ruft `saveDescription(board)` auf.

  `quick-workflow.js` ergänzt im vorhandenen Mehr-Menü:

  ```html
  <button type="button" data-more="ai-explain">Mit KI erklären</button>
  ```

  Der Klick schließt das Menü und übergibt `currentBoard()`, `core`,
  `saveDraft()` und `toast()`.

- [ ] **Step 5: Veralteten Taktik-KI-Pfad entfernen**

  `js/aiimport.js` entfernt `TACTIC_PROMPT`, `describeTactic()` und
  `explainTactic()`. `index.html` entfernt den toten alten
  `data-action="ai-explain"`-Button und `tpl-tactics-ai-modal`, damit nur der
  aktuelle Play Designer eine KI-Erklärung anbietet.

- [ ] **Step 6: Offline- und Testregistrierung ergänzen**

  `sw.js` enthält `js/play-designer/ai-explanation.js` und erhöht den Cache auf
  `courthub-v143`. `scripts/check.mjs` enthält das Modul. `test:ai` ruft den
  neuen Smoke-Test auf.

- [ ] **Step 7: Tests auf GREEN bringen**

  Run: `node scripts/play-designer-ai-smoke.mjs`

  Expected: PASS mit
  `CourtHub Taktik-KI: Schema-3-Serializer und Quick-Editor-Dialog erfolgreich.`

- [ ] **Step 8: Task-Verifikation ausführen**

  Run: `npm run test:ai && node scripts/play-designer-quick-smoke.mjs`

  Expected: Exitcode 0.

- [ ] **Step 9: Commit erstellen**

  ```bash
  git add js/play-designer/ai-explanation.js js/play-designer/quick-workflow.js js/aiimport.js index.html sw.js scripts/play-designer-ai-smoke.mjs scripts/check.mjs package.json
  git commit -m "feat: explain current Play Designer tactics with AI"
  ```

### Task 6: Gesamtintegration, Betriebsdokumentation und Abnahme

**Files:**
- Modify: `DEPLOY.md`
- Modify: `docs/superpowers/specs/2026-10-01-courthub-ai-reliability-design.md`
- Modify: alle in den vorherigen Tasks berührten Dateien nur bei durch Tests belegten Integrationsfehlern

**Interfaces:**
- Consumes: alle Tasks 1 bis 5.
- Produces: vollständig geprüfter Branch mit dokumentiertem Rollout und Status der Spezifikation.

- [ ] **Step 1: Deployment- und Abnahmehinweise ergänzen**

  `DEPLOY.md` dokumentiert ohne Schlüsselwert:

  ```text
  KI-Modell: gemini-3.8-flash
  Pflichtvariable: GEMINI_API_KEY
  Schnellprüfung: npm run test:ai
  Produktionsabnahme: Zusammenfassung → Taktikerklärung → kleines PDF → zwei Saisonwochen → vollständige Saison
  ```

  Zusätzlich werden die Fehlercodes und die Suche nach `requestId` in Vercel-
  Logs beschrieben. Die Spezifikation erhält Status „Implementiert, noch nicht
  veröffentlicht“ sowie die tatsächlichen Commit- und Testergebnisse.

- [ ] **Step 2: KI-Vertragstests vollständig ausführen**

  Run: `npm run test:ai`

  Expected: alle fünf KI-Smoke-Dateien mit Exitcode 0.

- [ ] **Step 3: Vollständige CourtHub-Suite ausführen**

  Run: `npm test`

  Expected: Exitcode 0 ohne Warnung oder datumabhängigen Fehler.

- [ ] **Step 4: Statische Produktionsverträge prüfen**

  Run:

  ```powershell
  rg -n "gemini-2\.5|response_mime_type|function describeTactic|Trainings finden Dienstag" api js
  rg -n "gemini-3\.8-flash|responseMimeType|AI_TIMEOUT|AI_TRUNCATED_RESPONSE" api js scripts
  git diff --check
  ```

  Expected: Der erste `rg`-Befehl findet nichts; der zweite findet Modell,
  Schema und Fehlercodes; `git diff --check` bleibt leer.

- [ ] **Step 5: Service-Worker-Vollständigkeit prüfen**

  Run: `node scripts/check.mjs`

  Expected: `CourtHub: statische Prüfungen erfolgreich.` und Exitcode 0.

- [ ] **Step 6: Integrationsfehler ausschließlich testgetrieben beheben**

  Falls Step 2 bis 5 fehlschlägt, wird pro eigenständigem Fehler zuerst ein
  minimaler Regressionstest im zuständigen Smoke-Skript ergänzt und im RED-
  Zustand ausgeführt. Danach folgt die kleinste Produktivänderung und derselbe
  Test sowie `npm test` müssen GREEN sein. Ohne Fehler bleibt dieser Schritt
  ohne Codeänderung. Da alle möglichen Regressionstests in bereits durch Task
  1 bis 5 angelegten Dateien ergänzt werden, entstehen hier keine neuen
  Dateipfade.

- [ ] **Step 7: Dokumentation committen**

  ```bash
  git add -u
  git add DEPLOY.md docs/superpowers/specs/2026-10-01-courthub-ai-reliability-design.md
  git commit -m "docs: add Gemini 3.8 rollout guide"
  ```

- [ ] **Step 8: Abschlussprüfung für den Integrationsentscheid wiederholen**

  Run: `npm test && git status -sb`

  Expected: Tests mit Exitcode 0; Arbeitsbaum sauber und Feature-Branch nur um
  die geplanten Commits vor seinem Ausgangspunkt voraus.
