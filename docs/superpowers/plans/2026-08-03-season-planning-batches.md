# KI-Saisonplanung in Blöcken Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die KI-Saisonplanung verarbeitet eine Saison in kleinen, sicheren Blöcken und übernimmt erst bei vollständigem Erfolg alle Trainingsentwürfe.

**Architecture:** `js/seasonplanner.js` kapselt das Aufteilen eines bestehenden KI-Payloads und die sequenzielle Anfrageausführung als testbare Funktion. `js/schedule.js` zeigt nur Fortschritt und übergibt nach erfolgreicher Gesamtantwort eine zusammengeführte Trainingsliste an das bestehende `applyAIPlan()`. Der Server begrenzt jede `planSeason`-Anfrage auf acht Slots und 8.192 Output-Tokens.

**Tech Stack:** Vanilla JavaScript, Vercel Serverless Function, Gemini GenerateContent API, JSDOM-Smoke-Test, Node.js.

## Global Constraints

- Ein Block enthält höchstens acht Slots.
- Pro Block bleiben Team, Dauer, Prinzipien, Coach-Eingaben und Historie unverändert; nur `slots` wird geteilt.
- Die Blöcke laufen nacheinander, nicht parallel.
- Es erfolgt erst nach allen erfolgreichen Antworten genau ein Aufruf von `applyAIPlan()`.
- Keine automatische Wiederholung bei KI-Fehlern.
- Höchstens 15 KI-Anfragen für 120 Slots und damit innerhalb von `AI_RATE_LIMIT=30` pro Stunde.
- Manuell bearbeitete und abgeschlossene Trainings bleiben durch die vorhandene Logik geschützt.

---

## File Structure

- `js/seasonplanner.js`: Aufteilung des Payloads und sequenzielle, testbare Blockausführung.
- `js/schedule.js`: Fortschrittsanzeige und einmalige Übernahme der gesammelten Antwort.
- `api/ai/gemini.js`: Serverseitige Begrenzung für Slots und Output-Tokens.
- `scripts/smoke.mjs`: Testet Chunking, Kontextübernahme und Fehlerverhalten.

### Task 1: Testvertrag für Blockaufteilung und atomare Antwortsammlung

**Files:**
- Modify: `scripts/smoke.mjs: nach den bestehenden Saisonplan-Tests`
- Modify: `js/seasonplanner.js: öffentliche Saisonplan-Helfer`

**Interfaces:**
- Consumes: `BT.seasonplanner.buildAIPayload(slots, preferences)`.
- Produces: `BT.seasonplanner.planInBatches(payload, requestBatch, onProgress)` als Promise von `{ trainings: Array }`.

- [ ] **Step 1: Einen fehlschlagenden Test für 17 Slots ergänzen**

  Erzeuge 17 einfache Slots mit unterschiedlichen Daten. Rufe den neuen Helfer mit einem asynchronen Stub auf, der pro Eingabe eine Trainingsliste für genau die erhaltenen Slots zurückgibt.

  ```js
  const batchPayload = window.BT.seasonplanner.buildAIPayload(
    Array.from({ length: 17 }, (_, index) => ({ date: '2027-06-' + String(index + 1).padStart(2, '0'), weekday: 'tue', time: '20:15', load: 'medium', loadReason: 'Test' })),
    { focus: 'Defense' }
  );
  const batchSizes = [];
  const batchResult = await window.BT.seasonplanner.planInBatches(batchPayload, async data => {
    batchSizes.push(data.slots.length);
    return { data: { trainings: data.slots.map(slot => ({ date: slot.date, drills: [] })) } };
  });
  assert(batchSizes.join(',') === '8,8,1', 'Saisonplanung teilt Slots nicht in sichere Blöcke');
  assert(batchResult.trainings.length === 17, 'Antworten aller Blöcke wurden nicht gesammelt');
  ```

- [ ] **Step 2: Einen Fehlerfall vor der Umsetzung ergänzen**

  Im dritten Stub-Aufruf einen Fehler auslösen und nach der abgelehnten Promise prüfen, dass kein Rückgabewert mit Teiltrainings entsteht.

  ```js
  let rejectedBatch = false;
  try {
    await window.BT.seasonplanner.planInBatches(batchPayload, async data => {
      if (data.slots[0].date === '2027-06-17') throw new Error('Blockfehler');
      return { data: { trainings: [] } };
    });
  } catch (error) { rejectedBatch = error.message === 'Blockfehler'; }
  assert(rejectedBatch, 'Ein Blockfehler bricht die Saisonplanung nicht zuverlässig ab');
  ```

- [ ] **Step 3: Den neuen Test ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: FAIL mit `planInBatches is not a function`.

- [ ] **Step 4: Den Test bis zur Minimalimplementierung unverändert lassen**

  Der Test definiert den öffentlichen Vertrag für Task 2.

### Task 2: Clientseitige Blockausführung und Fortschrittsanzeige

**Files:**
- Modify: `js/seasonplanner.js:138-282`
- Modify: `js/schedule.js:160-166`
- Test: `scripts/smoke.mjs: Blocktests aus Task 1`

**Interfaces:**
- Consumes: Vollständiges `payload`, `requestBatch(data) => Promise<{ data: { trainings: Array } }>` und optional `onProgress(current, total)`.
- Produces: `planInBatches()` mit einer vollständig gesammelten Trainingsliste oder einer unveränderten Fehlerweitergabe.

- [ ] **Step 1: Den fehlschlagenden Test ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: FAIL mit fehlendem `planInBatches`.

- [ ] **Step 2: Einen reinen Payload-Teiler ergänzen**

  ```js
  const SEASON_BATCH_SIZE = 8;
  function splitAIPayload(payload, batchSize = SEASON_BATCH_SIZE) {
    const slots = Array.isArray(payload?.slots) ? payload.slots : [];
    return Array.from({ length: Math.ceil(slots.length / batchSize) }, (_, index) =>
      Object.assign({}, payload, { slots: slots.slice(index * batchSize, (index + 1) * batchSize) })
    );
  }
  ```

- [ ] **Step 3: Die sequenzielle Ausführung implementieren**

  ```js
  async function planInBatches(payload, requestBatch, onProgress) {
    const batches = splitAIPayload(payload);
    const trainings = [];
    for (let index = 0; index < batches.length; index++) {
      if (onProgress) onProgress(index + 1, batches.length);
      const response = await requestBatch(batches[index]);
      if (!Array.isArray(response?.data?.trainings)) throw new Error('KI-Antwort enthält keine Trainingsliste.');
      trainings.push(...response.data.trainings);
    }
    return { trainings };
  }
  ```

  `splitAIPayload` und `planInBatches` im Rückgabeobjekt von `BT.seasonplanner` veröffentlichen.

- [ ] **Step 4: `schedule.js` auf die neue Funktion umstellen**

  Den einzelnen API-Aufruf durch `await BT.seasonplanner.planInBatches(...)` ersetzen. Der Progress-Callback setzt `status.textContent` auf `KI plant Block ${current} von ${total} …`. Erst danach wird einmal `BT.seasonplanner.applyAIPlan({ trainings: result.trainings }, slots)` aufgerufen.

- [ ] **Step 5: Den Blocktest ausführen**

  Run: `node scripts/smoke.mjs`

  Expected: PASS; es werden exakt die Blockgrößen 8, 8 und 1 beobachtet und der simulierte Fehler wird weitergegeben.

- [ ] **Step 6: Syntax und Diff prüfen**

  Run: `node --check js/seasonplanner.js && node --check js/schedule.js && git diff --check`

  Expected: Alle Befehle beenden sich mit Exit-Code 0.

### Task 3: Serverseitige Begrenzung gegen erneute Laufzeitüberschreitung

**Files:**
- Modify: `api/ai/gemini.js:110-120`
- Test: `scripts/smoke.mjs: vorhandener kompletter Saisonplan-Smoketest`

**Interfaces:**
- Consumes: POST-Aktion `planSeason` mit `payload.data.slots`.
- Produces: HTTP 400 bei mehr als acht Slots und Gemini-Generation mit höchstens 8.192 Output-Tokens.

- [ ] **Step 1: Die relevante Serverbedingung prüfen**

  Run: `rg -n "data\.slots\.length|maxOutputTokens" api/ai/gemini.js`

  Expected: Die aktuelle Grenze 120 und `32768` sind sichtbar.

- [ ] **Step 2: Die beiden Servergrenzen minimal ändern**

  ```js
  if (!Array.isArray(data.slots) || !data.slots.length || data.slots.length > 8) {
    throw Object.assign(new Error('Für die Saisonplanung fehlen gültige Trainingstermine.'), { status: 400 });
  }
  // ...
  generationConfig: { response_mime_type: 'application/json', temperature: 0.25, maxOutputTokens: 8192 },
  ```

- [ ] **Step 3: Die Begrenzung statisch prüfen**

  Run: `rg -n "data\.slots\.length > 8|maxOutputTokens: 8192" api/ai/gemini.js`

  Expected: Beide neuen Werte sind jeweils einmal sichtbar.

- [ ] **Step 4: Den vollständigen Testlauf ausführen**

  Run: `npm test`

  Expected: Statische Prüfung und UI-Smoke-Test enden mit Exit-Code 0.

- [ ] **Step 5: Implementierung committen**

  ```bash
  git add api/ai/gemini.js js/seasonplanner.js js/schedule.js scripts/smoke.mjs docs/superpowers/plans/2026-08-03-season-planning-batches.md
  git commit -m "fix: batch AI season planning requests"
  ```

## Self-Review

- **Spec coverage:** Task 1 und 2 decken die 8er-Aufteilung, Kontextübernahme, sequenzielle Anfragen, Fortschritt und das Sammeln ohne Teilübernahme ab. Task 3 begrenzt den Serververtrag und die Outputgröße.
- **Placeholder scan:** Der Plan enthält keine offenen Platzhalter oder unbestimmte Fehlerbehandlung.
- **Type consistency:** `planInBatches()` nimmt immer einen vollständigen Payload und gibt genau `{ trainings }` zurück. `schedule.js` übergibt dieses Objekt unverändert an `applyAIPlan()`, dessen bestehender Vertrag eine `trainings`-Liste erwartet.
