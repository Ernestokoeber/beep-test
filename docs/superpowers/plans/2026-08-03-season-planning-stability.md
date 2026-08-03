# KI-Saisonplanung stabilisieren – Umsetzungsplan

> **Für agentische Arbeitskräfte:** ERFORDERLICHE TEILFÄHIGKEIT: Nutze `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Die Schritte verwenden Kontrollkästchen (`- [ ]`) zur Fortschrittsverfolgung.

**Ziel:** Die KI-Saisonplanung wiederholt ungültige Blockantworten genau einmal, übernimmt niemals Teilresultate und liefert neue Programmdateien zuverlässig an installierte PWAs aus.

**Architektur:** `planInBatches` validiert jede Antwort gegen die konkreten Slot-Daten des aktuellen Viererblocks und fordert den Block bei Fehler einmal erneut an. Die Funktion liefert erst nach vollständigem Erfolg eine zusammengeführte Trainingsliste; `schedule.js` bleibt damit der einzige Ort, an dem `applyAIPlan` aufgerufen wird. Die PWA nutzt ausschließlich eine Cache-Release-Version im Service Worker und unverversionierte lokale Asset-Pfade, damit Cache-Wechsel und Programmcode untrennbar gemeinsam aktualisiert werden.

**Technik:** Vanilla JavaScript, Service Worker Cache API, Node.js, JSDOM, bestehender `scripts/smoke.mjs`-Smoke-Test.

## Globale Einschränkungen

- `SEASON_BATCH_SIZE` bleibt exakt `4`.
- Jeder Block erhält höchstens einen Wiederholungsversuch, insgesamt also maximal zwei Anfragen.
- Ein Block ist nur gültig, wenn seine Antwort genau einmal alle erwarteten `slot.date`-Werte enthält und keine weiteren Daten liefert.
- `applyAIPlan()` darf erst nach dem letzten erfolgreich validierten Block aufgerufen werden.
- Keine Änderung an Neon-SSL, Gemini-Modellen/-Limits oder serverseitigen KI-Endpunkten.
- Die PWA-Release-Version wird nur in `sw.js` gepflegt; lokale CSS- und JavaScript-Pfade tragen keine eigenen `?v=`-Parameter mehr.

---

## Dateistruktur

- `js/seasonplanner.js` – validiert KI-Blockantworten, führt den einmaligen Retry aus und meldet Versuch sowie Blockfortschritt.
- `js/schedule.js` – übersetzt Retry-Fortschritt in eine verständliche Statusmeldung, ohne die atomare Übernahme zu ändern.
- `scripts/smoke.mjs` – beweist Retry, strikte Terminvalidierung und Nichtübernahme nach endgültigem Fehler.
- `sw.js` – enthält die einzige PWA-Release-Version und cachet alle lokalen Dateien über unverversionierte Pfade.
- `index.html` – lädt CSS und lokale JavaScript-Dateien ohne eigenständige Versionsparameter.

### Aufgabe 1: Fehlende Tests für Retry und Blockvalidierung ergänzen

**Dateien:**

- Ändern: `scripts/smoke.mjs:259-282`

**Schnittstellen:**

- Verwendet: `BT.seasonplanner.planInBatches(payload, requestBatch, onProgress)`.
- Erwartet künftig: `onProgress({ block, total, attempt })`, wobei `attempt` entweder `1` oder `2` ist.
- Liefert für Folgeschritte: reproduzierbare Assertions für alle Rückgabe- und Fehlerpfade der Blockplanung.

- [ ] **Schritt 1: Einen Helper für eine gültige Testantwort hinzufügen.**

  Direkt vor den bestehenden Batch-Assertions ergänzen:

  ```js
  function responseForSlots(slots) {
    return { data: { trainings: slots.map(slot => ({ date: slot.date, summary: 'KI ' + slot.date, drills: [] })) } };
  }
  ```

- [ ] **Schritt 2: Den Retry-Test schreiben.**

  Nach dem bisherigen erfolgreichen Batch-Test ergänzen:

  ```js
  let retryCalls = 0;
  const retryProgress = [];
  const retriedResult = await window.BT.seasonplanner.planInBatches(
    { ...batchPayload, slots: batchPayload.slots.slice(0, 4) },
    async data => {
      retryCalls++;
      return retryCalls === 1
        ? { data: { trainings: [{ date: data.slots[0].date }] } }
        : responseForSlots(data.slots);
    },
    progress => retryProgress.push(progress)
  );
  assert(retryCalls === 2, 'Ungültiger KI-Block wurde nicht einmal erneut angefragt');
  assert(retriedResult.trainings.length === 4, 'Erfolgreicher Retry liefert nicht alle Trainings zurück');
  assert(retryProgress.some(item => item.attempt === 2), 'Retry-Fortschritt wird nicht gemeldet');
  ```

- [ ] **Schritt 3: Die Tests für doppelte, fremde und endgültig ungültige Antworten schreiben.**

  Direkt nach dem Retry-Test ergänzen:

  ```js
  const invalidResponses = [
    { data: { trainings: [{ date: batchPayload.slots[0].date }, { date: batchPayload.slots[0].date }] } },
    { data: { trainings: batchPayload.slots.slice(0, 3).map(slot => ({ date: slot.date })).concat({ date: '2099-01-01' }) } }
  ];
  for (const invalidResponse of invalidResponses) {
    let calls = 0;
    let rejected = false;
    try {
      await window.BT.seasonplanner.planInBatches(
        { ...batchPayload, slots: batchPayload.slots.slice(0, 4) },
        async () => { calls++; return invalidResponse; }
      );
    } catch (error) {
      rejected = /Block 1/.test(error.message);
    }
    assert(calls === 2, 'Ungültige KI-Antwort wurde nicht exakt zweimal angefragt');
    assert(rejected, 'Endgültig ungültige KI-Antwort nennt Block 1 nicht');
  }
  ```

- [ ] **Schritt 4: Den Smoke-Test ausführen und den erwarteten Fehlschlag bestätigen.**

  Ausführen: `npm run smoke`

  Erwartet: FEHLER, weil `planInBatches` die Retry-Antworten noch nicht validiert und kein Fortschrittsobjekt liefert.

- [ ] **Schritt 5: Commit der Testbasis erstellen.**

  ```powershell
  git add scripts/smoke.mjs
  git commit -m "test: cover season planning retries"
  ```

### Aufgabe 2: Blockantworten strikt validieren und einmal erneut anfragen

**Dateien:**

- Ändern: `js/seasonplanner.js:167-177`
- Ändern: `scripts/smoke.mjs:259-330`

**Schnittstellen:**

- Verwendet: ein `payload` mit `slots: Array<{date: string}>` und `requestBatch(data): Promise<{data: {trainings: Array<{date: string}>}}>`.
- Erzeugt: `validateBatchResponse(response, slots): Array<object>` und `planInBatches(...) -> Promise<{trainings: Array<object>}>`.
- Fehlervertrag: endgültige Fehler beginnen mit `KI-Block <n> von <gesamt> fehlgeschlagen:`.

- [ ] **Schritt 1: Die fehlende Validierungsfunktion minimal ergänzen.**

  Unmittelbar vor `planInBatches` ergänzen:

  ```js
  function validateBatchResponse(response, slots) {
    const trainings = response?.data?.trainings;
    if (!Array.isArray(trainings)) throw new Error('KI-Antwort enthält keine Trainingsliste.');
    const expectedDates = slots.map(slot => slot.date);
    const receivedDates = trainings.map(training => String(training?.date || ''));
    const expected = new Set(expectedDates);
    if (receivedDates.length !== expectedDates.length || new Set(receivedDates).size !== receivedDates.length || receivedDates.some(date => !expected.has(date))) {
      throw new Error('KI-Antwort enthält nicht genau die erwarteten Trainingstermine.');
    }
    return trainings;
  }
  ```

- [ ] **Schritt 2: `planInBatches` auf zwei Versuche und Fortschrittsobjekte umstellen.**

  Den bisherigen Schleifenrumpf durch diese Logik ersetzen:

  ```js
  for (let index = 0; index < batches.length; index++) {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (onProgress) onProgress({ block: index + 1, total: batches.length, attempt });
      try {
        const response = await requestBatch(batches[index]);
        trainings.push(...validateBatchResponse(response, batches[index].slots));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw new Error('KI-Block ' + (index + 1) + ' von ' + batches.length + ' fehlgeschlagen: ' + lastError.message);
  }
  ```

- [ ] **Schritt 3: Die Validierungsfunktion mit exportieren.**

  Den Rückgabewert des Moduls erweitern:

  ```js
  closureFor, buildSlots, buildAIPayload, splitAIPayload, validateBatchResponse, planInBatches, applyAIPlan
  ```

- [ ] **Schritt 4: Den Retry- und Validierungs-Smoke-Test ausführen.**

  Ausführen: `npm run smoke`

  Erwartet: ERFOLG; alle neuen Assertions sowie der bisherige Saisonplan-Smoketest sind grün.

- [ ] **Schritt 5: Gesamten Testsatz ausführen und committen.**

  ```powershell
  npm test
  git add js/seasonplanner.js scripts/smoke.mjs
  git commit -m "fix: retry invalid season planning blocks"
  ```

### Aufgabe 3: Retry-Status im Saisonplanungs-UI anzeigen

**Dateien:**

- Ändern: `js/schedule.js:161-165`
- Test: `scripts/smoke.mjs:259-330`

**Schnittstellen:**

- Verwendet: `planInBatches` ruft `onProgress({ block, total, attempt })` auf.
- Erzeugt: Status für Versuch eins und den einzigen Wiederholungsversuch, ohne `applyAIPlan(result, slots)` zu verschieben.

- [ ] **Schritt 1: Eine UI-Assertion für die Fortschrittsform ergänzen.**

  Nach den Retry-Assertions ergänzen:

  ```js
  const retryLabel = ({ block, total, attempt }) => attempt === 2
    ? 'KI versucht Block ' + block + ' von ' + total + ' erneut …'
    : 'KI plant Block ' + block + ' von ' + total + ' …';
  assert(retryLabel({ block: 2, total: 5, attempt: 1 }) === 'KI plant Block 2 von 5 …', 'Erster Blockstatus ist falsch');
  assert(retryLabel({ block: 2, total: 5, attempt: 2 }) === 'KI versucht Block 2 von 5 erneut …', 'Retry-Blockstatus ist falsch');
  ```

- [ ] **Schritt 2: Den Callback in `schedule.js` anpassen.**

  Den bisherigen Callback mit drei Parametern ersetzen:

  ```js
  ({ block, total, attempt }) => {
    status.textContent = attempt === 2
      ? 'KI versucht Block ' + block + ' von ' + total + ' erneut …'
      : 'KI plant Block ' + block + ' von ' + total + ' …';
  }
  ```

- [ ] **Schritt 3: Den Smoke-Test ausführen.**

  Ausführen: `npm run smoke`

  Erwartet: ERFOLG mit den beiden Status-Assertions.

- [ ] **Schritt 4: Tests und UI-Änderung committen.**

  ```powershell
  git add js/schedule.js scripts/smoke.mjs
  git commit -m "feat: show season planning retries"
  ```

### Aufgabe 4: PWA-Cache als einheitliches Release ausliefern

**Dateien:**

- Ändern: `sw.js:1-38`
- Ändern: `index.html:21, 1450-1483`
- Ändern: `scripts/smoke.mjs:1-12, 259-330`

**Schnittstellen:**

- Verwendet: `const RELEASE = '105'` ausschließlich in `sw.js`.
- Erzeugt: `const CACHE = 'courthub-v' + RELEASE` und unverversionierte relative Pfade in `ASSETS` sowie im HTML.
- Erfolgskriterium: Cache-Namenswechsel und geänderte `seasonplanner.js` werden immer gemeinsam aktiviert.

- [ ] **Schritt 1: Den Service-Worker-Release-Test schreiben.**

  Oben in `scripts/smoke.mjs` ergänzen:

  ```js
  const serviceWorker = readFileSync(resolve(root, 'sw.js'), 'utf8');
  assert(/const RELEASE = '\\d+';/.test(serviceWorker), 'Service Worker besitzt keine Release-Version');
  assert(/const CACHE = 'courthub-v' \+ RELEASE;/.test(serviceWorker), 'Cache-Name leitet sich nicht von der Release-Version ab');
  assert(!/\\?v=/.test(serviceWorker), 'Service Worker enthält eigenständige Asset-Versionen');
  assert(!/\\?v=/.test(html), 'HTML enthält eigenständige Asset-Versionen');
  ```

- [ ] **Schritt 2: Den erwarteten Testfehlschlag ausführen.**

  Ausführen: `npm run smoke`

  Erwartet: FEHLER mit `Service Worker besitzt keine Release-Version`.

- [ ] **Schritt 3: Service Worker und HTML auf unverversionierte Asset-Pfade umstellen.**

  In `sw.js` den Beginn so ersetzen und alle `?v=<Zahl>`-Suffixe in `ASSETS` entfernen:

  ```js
  const RELEASE = '105';
  const CACHE = 'courthub-v' + RELEASE;
  ```

  In `index.html` aus `style.css?v=104` und allen `<script src="js/...?...">` die Query-Parameter entfernen. Die Dateinamen und die Ladereihenfolge bleiben unverändert.

- [ ] **Schritt 4: Cache- und Gesamttests ausführen.**

  Ausführen: `npm test`

  Erwartet: ERFOLG; `check.mjs` findet weiterhin alle benötigten Skripte und `smoke.mjs` bestätigt eine einheitliche PWA-Release-Version.

- [ ] **Schritt 5: PWA-Änderung committen.**

  ```powershell
  git add sw.js index.html scripts/smoke.mjs
  git commit -m "fix: version season planner PWA cache"
  ```

### Aufgabe 5: Manuelle produktive Abnahme vorbereiten

**Dateien:**

- Ändern: `MONTAG_DEPLOYMENT.md:285-305`

**Schnittstellen:**

- Verwendet: produktiv eingerichtetes Vercel-Projekt mit `GEMINI_API_KEY` sowie angemeldete Trainerrolle.
- Erzeugt: eine kurze Checkliste, welche Retry-Meldung, atomare Übernahme und PWA-Aktualisierung vor einem Produktionsrelease geprüft werden.

- [ ] **Schritt 1: Die Abnahme-Checkliste ergänzen.**

  Direkt nach dem Abschnitt zur Saisonplanung ergänzen:

  ```markdown
  14. In einem Testlauf eine unvollständige KI-Blockantwort simulieren oder im Browser-Netzwerk einmal abbrechen. Prüfen, dass CourtHub „erneut“ für denselben Block meldet und danach fortfährt.
  15. Zwei aufeinanderfolgende fehlgeschlagene Antworten für denselben Block erzeugen. Prüfen, dass keine neuen Trainings, Drills oder Vorlagen erscheinen.
  16. Nach dem Deploy die installierte PWA schließen, neu öffnen und prüfen, dass im DevTools-Tab „Application“ nur der aktuelle `courthub-v<Release>`-Cache aktiv ist.
  ```

- [ ] **Schritt 2: Den vollständigen Testsatz erneut ausführen.**

  Ausführen: `npm test`

  Erwartet: ERFOLG vor manueller produktiver Abnahme.

- [ ] **Schritt 3: Abschlusscommit erstellen.**

  ```powershell
  git add MONTAG_DEPLOYMENT.md
  git commit -m "docs: add season planning release checks"
  ```

## Abnahme nach der Implementierung

1. `npm test` muss ohne Fehler laufen.
2. Eine vierteilige Saisonanfrage muss bei einer unvollständigen ersten Antwort denselben Block genau einmal wiederholen und danach alle vier Trainings zurückgeben.
3. Doppelte, fehlende und fremde Termindaten müssen nach zwei Versuchen mit `KI-Block <n> von <gesamt> fehlgeschlagen:` abbrechen.
4. Bei Abbruch darf kein Aufruf von `applyAIPlan()` erfolgen; deshalb entstehen keine Teiltrainings, Drills oder Vorlagen.
5. Die installierte PWA muss bei einem neuen `RELEASE` einen neuen `courthub-v<Release>`-Cache aktivieren und lokale CSS-/JavaScript-Dateien ohne separate Query-Versionen laden.
