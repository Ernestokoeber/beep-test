# CourtHub Phase Action Recorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quick editor's hidden second-based workflow with a phase recorder in which coaches create sequential or simultaneous player actions directly on the half court.

**Architecture:** Keep the existing `steps`/`transition` persistence format and add phase/action metadata during normalization. Put pure recorder behavior in a focused core module, let the quick editor translate court gestures into those functions, and render readable phase cards from the same normalized action descriptions. Existing pro editor, exports, and stored plays continue to consume the unchanged transition arrays.

**Tech Stack:** Vanilla JavaScript ES modules, SVG half-court renderer, local workspace storage, Node smoke tests, JSDOM, Playwright browser E2E.

## Global Constraints

- The board remains half-court only.
- Manual seconds are not a primary input in the phase recorder.
- New actions default to a new phase; “Gleichzeitig” appends to the active phase.
- Existing stored plays remain readable and are only rewritten after an explicit save.
- Screen and pick-and-roll actions keep stable actor references.
- Deliberately tight basketball spacing remains possible; overlap handling warns and offers a readable snap.
- Desktop mouse and iPhone touch must use the same interaction model.

---

### Task 1: Phase metadata, descriptions, and automatic timing

**Files:**
- Create: `js/play-designer/phase-recorder-core.js`
- Create: `scripts/phase-recorder-core-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `window.BT.tactics.__core` normalization and geometry helpers.
- Produces: `normalizeRecordedBoard(board, core)`, `recordedActions(step, core)`, `describeRecordedAction(step, action, core)`, `phaseDuration(step, core)`, and `applyPhaseTiming(step, core)`.

- [ ] **Step 1: Write the failing core smoke test**

Create a test that normalizes an old board, verifies stable `phaseId` values, distinguishes run/dribble through explicit `kind`, describes passes and screens in German, and sets phase duration to the longest simultaneous action plus the existing safety margin.

```js
const normalized = recorder.normalizeRecordedBoard(oldBoard, core);
assert(normalized.steps[0].phaseId, 'Alte Schritte erhalten keine Phase-ID');
assert(recorder.describeRecordedAction(step, pass, core) === '1 passt zu 2', 'Passbeschreibung ist unklar');
assert(Math.abs(recorder.applyPhaseTiming(step, core).duration - 1.65) < .001, 'Phasendauer folgt nicht der längsten Aktion');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/phase-recorder-core-smoke.mjs`

Expected: FAIL because `phase-recorder-core.js` does not exist.

- [ ] **Step 3: Implement minimal pure recorder functions**

Normalize only copied values, assign IDs through `core.uid`, preserve transition arrays, attach `phaseId`, `relation`, and explicit motion `kind`, and calculate phase duration from `max(start + duration) + 0.15` clamped to `0.3..10`.

```js
export function applyPhaseTiming(step, core) {
  const longest = recordedActions(step, core).reduce(
    (end, action) => Math.max(end, action.start + action.duration), 0
  );
  step.duration = core.clamp(longest ? longest + .15 : step.duration, .3, 10);
  return step;
}
```

- [ ] **Step 4: Run the core smoke test and verify GREEN**

Run: `node scripts/phase-recorder-core-smoke.mjs`

Expected: `CourtHub Phasenrekorder: Metadaten und Timing erfolgreich geprüft.`

- [ ] **Step 5: Add the test to `npm test` and commit**

```powershell
git add js/play-designer/phase-recorder-core.js scripts/phase-recorder-core-smoke.mjs package.json
git commit -m "feat: add phase recorder core"
```

### Task 2: Sequential and simultaneous recording primitives

**Files:**
- Modify: `js/play-designer/quick-core.js`
- Modify: `scripts/play-designer-quick-smoke.mjs`

**Interfaces:**
- Consumes: `normalizeRecordedBoard`, `applyPhaseTiming` from Task 1.
- Produces: enhanced `addQuickMove`, `addQuickPass`, `addQuickScreen`, plus `addQuickPickAndRoll(board, options, core)`.

- [ ] **Step 1: Extend the failing quick-core tests**

Assert that an `after` action creates a new phase, `same` stays in the current phase, motion actions persist `kind`, screens contain `beneficiaryId` and `targetDefenderId`, and pick-and-roll creates three actions sharing one `groupId`.

```js
board = quick.addQuickPickAndRoll(board, {
  stepIndex: 1, relation: 'same', handlerId: 'o1', screenerId: 'o5',
  screenPoint: { x: 286, y: 286 },
  handlerPath: [{ x: 250, y: 388 }, { x: 330, y: 245 }],
  rollPath: [{ x: 286, y: 286 }, { x: 250, y: 108 }]
}, core);
const grouped = quick.stepActions(board.steps[1], core).filter(action => action.groupType === 'pick-and-roll');
assert(grouped.length === 3 && new Set(grouped.map(action => action.groupId)).size === 1, 'Pick-and-Roll ist nicht verbunden');
```

- [ ] **Step 2: Run the quick smoke test and verify RED**

Run: `node scripts/play-designer-quick-smoke.mjs`

Expected: FAIL because metadata and `addQuickPickAndRoll` are missing.

- [ ] **Step 3: Implement the recording primitives**

Keep `prepareQuickAction` as the phase boundary. Mark moves with `kind` based on current ball possession, bind screens to beneficiary/defender, and create the pick-and-roll group atomically so an invalid path leaves the input board unchanged.

```js
const groupId = core.uid('pnr_');
motionHandler.groupId = groupId;
motionHandler.groupType = 'pick-and-roll';
screen.groupId = groupId;
screen.groupType = 'pick-and-roll';
motionRoll.groupId = groupId;
motionRoll.groupType = 'pick-and-roll';
```

- [ ] **Step 4: Run focused and full quick-core tests**

Run: `node scripts/play-designer-quick-smoke.mjs`

Expected: PASS with phase, screen, and pick-and-roll assertions.

- [ ] **Step 5: Commit**

```powershell
git add js/play-designer/quick-core.js scripts/play-designer-quick-smoke.mjs
git commit -m "feat: record grouped basketball actions"
```

### Task 3: Readable spacing and bound screen placement

**Files:**
- Create: `js/play-designer/phase-spacing.js`
- Create: `scripts/phase-spacing-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `findOverlaps(step, core, minimum = 34)`, `suggestScreenPlacement(step, beneficiaryId, point, core)`, and `snapPhaseReadable(board, stepIndex, core)`.
- Screen placement returns `{ point, angle, targetDefenderId, adjusted }`.

- [ ] **Step 1: Write the failing spacing smoke test**

Build a step with overlapping players, verify deterministic warning pairs, verify a screen suggestion sits beside rather than on top of the nearest defender, and verify snapping does not move elements already outside the minimum distance.

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/phase-spacing-smoke.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic geometry**

Use stable element order and a normalized direction vector. If two markers share the same coordinates, choose the horizontal direction based on their IDs. Clamp moved points to the playable `16..484` / `16..454` bounds.

- [ ] **Step 4: Run spacing and renderer tests**

Run: `node scripts/phase-spacing-smoke.mjs && node scripts/court-enhancements-smoke.mjs`

Expected: both PASS.

- [ ] **Step 5: Commit**

```powershell
git add js/play-designer/phase-spacing.js scripts/phase-spacing-smoke.mjs package.json
git commit -m "feat: keep recorded plays readable"
```

### Task 4: Phase recorder interaction and phase cards

**Files:**
- Modify: `js/play-designer/quick-editor.js`
- Modify: `js/play-designer/quick-styles.js`
- Modify: `js/play-designer/quick-workflow.js`
- Create: `scripts/phase-recorder-ui-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: the visible modes `Aufstellung`, `Danach`, and `Gleichzeitig`; staged screen and pick-and-roll gestures; phase cards with readable action sentences; overlap warning and `Lesbar einrasten` action.

- [ ] **Step 1: Write a failing JSDOM UI smoke test**

Mount the quick editor as an authenticated coach and assert the presence of the phase-mode controls, Pick-and-Roll tool, phase cards, explicit cancel button, and overlap repair button when warnings exist.

```js
assert(root.querySelector('[data-action="pick-and-roll"]'), 'Pick-and-Roll-Werkzeug fehlt');
assert(root.querySelector('[data-relation="after"]').textContent.includes('Danach'), 'Phasenmodus fehlt');
assert(root.querySelector('[data-action="cancel-recording"]'), 'Angefangene Aktion kann nicht abgebrochen werden');
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node scripts/phase-recorder-ui-smoke.mjs`

Expected: FAIL on missing controls and phase descriptions.

- [ ] **Step 3: Implement the phase recorder UI**

Replace seconds-first copy with coaching language. Keep free dragging exclusive to setup mode. For screen recording use states `screener → beneficiary → position`; for pick-and-roll use `handler → screener → screen position → handler path → roll path`. Persist only after the final state succeeds. Escape and the cancel button clear pending state without modifying the board.

- [ ] **Step 4: Render action sentences and spacing warnings**

Each phase card lists the output of `describeRecordedAction`. Add group badges for Pick & Roll and a warning panel with `Lesbar einrasten`. Remove manual seconds from the quick phase cards; keep them inside the pro editor and advanced modal.

- [ ] **Step 5: Run UI, pointer, and reorder smoke tests**

Run: `node scripts/phase-recorder-ui-smoke.mjs && node scripts/play-designer-quick-pointer-smoke.mjs && node scripts/play-designer-reorder-smoke.mjs`

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add js/play-designer/quick-editor.js js/play-designer/quick-styles.js js/play-designer/quick-workflow.js scripts/phase-recorder-ui-smoke.mjs package.json
git commit -m "feat: build phase action recorder UI"
```

### Task 5: Compatibility, editing, and service-worker delivery

**Files:**
- Modify: `js/play-designer/main.js`
- Modify: `js/play-designer/quick-details.js`
- Modify: `js/play-designer/quick-reorder.js`
- Modify: `sw.js`
- Modify: `scripts/play-designer-reorder-smoke.mjs`
- Modify: `scripts/smoke.mjs`

**Interfaces:**
- Consumes: normalized phase metadata and action groups.
- Produces: compatible load/save, group-aware deletion/editing, metadata-preserving reorder, and a new offline cache version.

- [ ] **Step 1: Add failing compatibility and reorder assertions**

Verify an old board receives phase IDs only in the draft copy, a reordered pick-and-roll keeps one group ID, and deletion can remove a full group without leaving orphan actions.

- [ ] **Step 2: Run tests and verify RED**

Run: `node scripts/play-designer-reorder-smoke.mjs && node scripts/smoke.mjs`

Expected: FAIL on missing group/phase behavior.

- [ ] **Step 3: Wire normalization and group-aware editing**

Normalize the draft during editor mount, preserve metadata through reorder, and add group deletion alongside single-action deletion. Increment `sw.js` from `courthub-v124` to `courthub-v125` and cache the new modules without query-string versions.

- [ ] **Step 4: Run focused compatibility tests**

Run: `node scripts/play-designer-reorder-smoke.mjs && node scripts/smoke.mjs`

Expected: both PASS.

- [ ] **Step 5: Commit**

```powershell
git add js/play-designer/main.js js/play-designer/quick-details.js js/play-designer/quick-reorder.js sw.js scripts/play-designer-reorder-smoke.mjs scripts/smoke.mjs
git commit -m "feat: preserve phase recorder workflows"
```

### Task 6: Browser acceptance and final verification

**Files:**
- Modify: `scripts/browser-e2e.mjs`
- Modify: `.github/workflows/test.yml` only if the existing workflow does not already run the browser test.

**Interfaces:**
- Verifies the complete user workflow on desktop and iPhone-sized touch input.

- [ ] **Step 1: Extend browser E2E with the approved coaching example**

Record: pass 1→2; simultaneous screen 5 for 2; ballhandler path; roll 5; simultaneous screen 4 for 3. Assert phase count, action descriptions, group ID integrity, playback completion, save, and reopen.

- [ ] **Step 2: Run browser E2E and verify RED before finishing interaction code**

Run with the repository's existing local static server command and `node scripts/browser-e2e.mjs`.

Expected: initial FAIL on the first missing recorder behavior.

- [ ] **Step 3: Apply only browser-specific interaction fixes**

Correct touch targets, pointer capture, focus, and responsive overflow without changing the recorder data model.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Run: browser E2E on desktop and iPhone contexts.

Expected: all commands exit `0` with no failed assertion.

- [ ] **Step 5: Commit and push**

```powershell
git add scripts/browser-e2e.mjs .github/workflows/test.yml
git commit -m "test: cover phase recorder end to end"
git push origin main
```
