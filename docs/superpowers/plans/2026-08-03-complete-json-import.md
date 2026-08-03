# Vollständiger JSON-Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JSON-Backups stellen beim Ersetzen und Mergen auch Spiele, Kampfgerichte und Saisonphasen vollständig wieder her.

**Architecture:** `js/history.js` erhält eine kleine, testbare Import-Schicht, die alle synchronisierbaren Listen zentral definiert. Der Dateidialog bleibt unverändert und delegiert nach der Auswahl an diese Schicht. Der bestehende jsdom-Smoke-Test ruft die Import-Schicht direkt auf und überprüft deren Wirkung im echten Browser-Speicher.

**Tech Stack:** Vanilla JavaScript, Browser `localStorage`, jsdom, Node.js-Skripte

## Global Constraints

- Der browserseitige Schlüssel `settings.geminiApiKey` darf weder importiert noch synchronisiert werden.
- Fehlende optionale Listen werden als leere Listen behandelt.
- Merge ergänzt nur Einträge mit bisher unbekannter ID; vorhandene Einträge bleiben unverändert.
- Kein neues UI und keine serverseitige Migrationsroute.

---

### Task 1: Vollständige Importdaten zentral verarbeiten

**Files:**
- Modify: `js/history.js:138-201`
- Test: `scripts/smoke.mjs:vor der abschließenden Erfolgsmeldung`

**Interfaces:**
- Produces: `BT.history.applyBackup(data, mode)` mit `mode` `r` oder `m`; speichert den vollständigen Importzustand und gibt bei ungültigem Modus einen Fehler aus.
- Produces: `BT.history.hasImportableData(data)`; gibt `true` zurück, sobald eine synchronisierbare Liste mindestens einen Eintrag enthält.
- Consumes: `BT.storage.load()` und `BT.storage.save(data)`.

- [ ] **Step 1: Write the failing smoke-test assertions**

Füge in `scripts/smoke.mjs` vor `console.log('UI-Smoke-Test erfolgreich...')` diese Testdaten und Assertions ein:

```js
const importBackup = {
  schemaVersion: 2,
  players: [], sessions: [], trainings: [], notes: [], freethrows: [], drills: [], templates: [],
  games: [{ id: 'import-game', home: 'TSV Lindau', away: 'Import Team' }],
  tableDuties: [{ id: 'import-duty', date: '2026-10-11', assignments: {} }],
  phases: [{ id: 'import-phase', name: 'Importphase', start: '2026-10-01', end: '2026-10-31' }],
  settings: { importMarker: 'replace' }
};
BT.storage.save({ schemaVersion: 2, players: [], sessions: [], trainings: [], games: [{ id: 'old-game' }], tableDuties: [{ id: 'old-duty' }], notes: [], freethrows: [], drills: [], templates: [], phases: [{ id: 'old-phase' }], settings: {} }, { fromSync: true });
assert(BT.history.hasImportableData(BT.storage.load()), 'Spiel-, Kampfgerichts- oder Phasendaten werden nicht als vorhandene Importdaten erkannt');
BT.history.applyBackup(importBackup, 'r');
let imported = BT.storage.load();
assert(imported.games.map(entry => entry.id).join(',') === 'import-game', 'Ersetzen übernimmt Spiele nicht vollständig');
assert(imported.tableDuties.map(entry => entry.id).join(',') === 'import-duty', 'Ersetzen übernimmt Kampfgerichte nicht vollständig');
assert(imported.phases.map(entry => entry.id).join(',') === 'import-phase', 'Ersetzen übernimmt Saisonphasen nicht vollständig');

BT.storage.save({ schemaVersion: 2, players: [], sessions: [], trainings: [], games: [{ id: 'import-game', home: 'Bestehend' }], tableDuties: [{ id: 'import-duty', date: '2026-09-01', assignments: {} }], notes: [], freethrows: [], drills: [], templates: [], phases: [{ id: 'import-phase', name: 'Bestehend' }], settings: {} }, { fromSync: true });
BT.history.applyBackup({ ...importBackup, games: [...importBackup.games, { id: 'new-game' }], tableDuties: [...importBackup.tableDuties, { id: 'new-duty', assignments: {} }], phases: [...importBackup.phases, { id: 'new-phase' }] }, 'm');
imported = BT.storage.load();
assert(imported.games.length === 2 && imported.games.find(entry => entry.id === 'import-game').home === 'Bestehend', 'Merge überschreibt vorhandene Spiele oder ergänzt neue nicht');
assert(imported.tableDuties.length === 2 && imported.tableDuties.some(entry => entry.id === 'new-duty'), 'Merge ergänzt Kampfgerichte nicht');
assert(imported.phases.length === 2 && imported.phases.some(entry => entry.id === 'new-phase'), 'Merge ergänzt Saisonphasen nicht');
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npm run smoke`

Expected: FAIL because `BT.history.hasImportableData` and `BT.history.applyBackup` do not yet exist.

- [ ] **Step 3: Implement the minimal import helpers**

In `js/history.js`, define this list near `importBackup()` and use it for every replace, merge and presence check:

```js
const IMPORT_LISTS = ['players', 'sessions', 'trainings', 'games', 'tableDuties', 'notes', 'freethrows', 'drills', 'templates', 'phases'];

function importList(data, key) {
  return Array.isArray(data?.[key]) ? data[key] : [];
}

function hasImportableData(data) {
  return IMPORT_LISTS.some(key => importList(data, key).length > 0);
}

function importSettings(data) {
  const settings = Object.assign({}, data?.settings || {});
  delete settings.geminiApiKey;
  return settings;
}

function applyBackup(data, mode) {
  const current = BT.storage.load();
  if (mode === 'r') {
    const replacement = { schemaVersion: 2, settings: importSettings(data) };
    IMPORT_LISTS.forEach(key => { replacement[key] = importList(data, key); });
    BT.storage.save(replacement);
    return;
  }
  if (mode === 'm') {
    const merged = { schemaVersion: 2, settings: Object.assign({}, current.settings || {}, importSettings(data)) };
    IMPORT_LISTS.forEach(key => { merged[key] = mergeById(importList(current, key), importList(data, key)); });
    BT.storage.save(merged);
    return;
  }
  throw new Error('Ungültiger Importmodus.');
}
```

Ersetze in `importBackup()` die bisherige Ersetzen-/Mergen-Verzweigung durch `applyBackup(data, choice)`. Ersetze die bisherige `hasData`-Prüfung durch `hasImportableData(current)`. Exportiere beide Helfer im Rückgabeobjekt von `BT.history`.

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npm run smoke`

Expected: PASS with `UI-Smoke-Test erfolgreich`.

- [ ] **Step 5: Run the full suite**

Run: `npm test`

Expected: Exit code 0; statische Prüfung und UI-Smoke-Test erfolgreich.

- [ ] **Step 6: Commit the implementation**

```bash
git add js/history.js scripts/smoke.mjs
git commit -m "fix: import all CourtHub backup data"
```
