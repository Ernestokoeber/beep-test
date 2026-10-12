# CourtHub Individualentwicklung: Spielerprofile und Freitag-Coachansicht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bestätigte Spielerbefunde als maximal drei klare Entwicklungsfelder darstellen und dem Coach im offenen Freitagstraining passende vorhandene Übungen sowie belegte Antworten auf konkrete Fragen anbieten.

**Architecture:** `js/development-core.js` bleibt die reine Quelle für Profilbildung und Drill-Matching. `js/individual-development.js` rendert Spielerprofil und Coach-Schnellansicht; ein eigener KI-Vertrag darf ausschließlich bestätigte Befund- und Drill-IDs zitieren und speichert neue Übungen erst nach einem zweiten, ausdrücklichen Coach-Schritt.

**Tech Stack:** Vanilla JavaScript/IIFE, bestehende CourtHub-Templates und Drill-Bibliothek, Gemini JSON-Schema, JSDOM-Smoke-Tests, PWA-Service-Worker.

**Spec:** `docs/superpowers/specs/2026-10-12-player-development-game-analysis-design.md`

## Global Constraints

- Dieser Plan setzt `2026-10-12-player-development-data-import.md` vollständig voraus.
- Pro Spieler werden höchstens drei aktuelle Entwicklungsfelder angezeigt.
- Stärken werden getrennt von Entwicklungsfeldern dargestellt.
- Freitag erzeugt keinen Trainingsplan und keine automatische Stationszuordnung.
- Der Spieler entscheidet im Gespräch mit dem Coach, woran er arbeitet.
- CourtHub durchsucht immer zuerst die vorhandene Übungsbibliothek.
- Eine KI-Übung bleibt ungespeichert, bis der Coach „In Übungsbibliothek übernehmen“ auslöst.
- KI-Antworten dürfen nur bestätigte `findingIds` und vorhandene `drillIds` verwenden.
- `new` darf nach dokumentierter Freitagsarbeit zu `developing` wechseln; andere Statusänderungen bleiben bewusste Coach-Aktionen.
- Keine Spielerzugänge und keine medizinischen Empfehlungen.

## Review Focus

- Ein Spieler besitzt nur Stärken und keine offenen Entwicklungsfelder: Die Ansicht muss nützlich bleiben und darf keine künstliche Schwäche erzeugen — Test in Task 2.
- Ein Drill hat passende Tags, aber ungeeignete Spielerzahl oder fehlendes Material: Er muss hinter vollständig passenden Drills rangieren — Test in Task 1.
- Die KI zitiert eine bekannte Befund-ID eines anderen Spielers: Die Antwort muss als ungültig abgelehnt werden — Test in Task 4.
- Der Coach klickt doppelt auf „In Übungsbibliothek übernehmen“: Es darf nur ein Drill entstehen — Test in Task 4.
- Ein Befund wird während geöffneter Freitagansicht auf `achieved` gesetzt: Die nächste Darstellung muss ihn ohne Seitenneuladen aus den Top drei entfernen — Test in Task 3.

---

## File Structure

- Modify `js/development-core.js`: Drill-Matching und Profilaktionen.
- Create `js/individual-development.js`: Spielerpanel, Freitag-Coachansicht und KI-Fragen.
- Create `development.css`: fokussierte Karten-, Verlaufs- und Dialogdarstellung.
- Create `scripts/individual-development-smoke.mjs`: Profil-, Drill- und UI-Tests.
- Create `scripts/development-answer-smoke.mjs`: serverseitiger Antwortvertrag und Referenzvalidierung.
- Modify `js/drills.js`: Bearbeitung von `developmentTags`, Material, Intensität, Schwierigkeit und Spielerbereich.
- Modify `js/players.js`: Einbindung des abgeleiteten Entwicklungsprofils.
- Modify `api/_lib/ai-contracts.js`: Vertrag `player-development-answer.v1`.
- Modify `js/api.js`: Timeout für `answerPlayerDevelopmentQuestion`.
- Modify `js/app.js` und `index.html`: Route `#/development`, Navigation und Templates.
- Modify `sw.js`, `scripts/check.mjs` und `package.json`: Cache und Testregistrierung.

### Task 1: Drill-Metadaten und deterministisches Matching

**Files:**
- Modify: `js/development-core.js`
- Modify: `js/drills.js`
- Modify: `index.html`
- Create: `scripts/individual-development-smoke.mjs`

**Interfaces:**
- Produces: `normalizeDrillDevelopment(drill): object`.
- Produces: `matchDrills({ priority, drills, players, material, intensity, difficulty }): match[]`.
- Jeder Treffer enthält `{ drill, score, matchedTags, warnings }`.

- [ ] **Step 1: Fehlschlagenden Matching-Test schreiben**

  `scripts/individual-development-smoke.mjs` lädt das Fachmodul und prüft:

  ```js
  const matches = core.matchDrills({
    priority: { category: 'decision', skillKey: 'turnover-control', drillTags: ['passing', 'pressure'] },
    drills: [
      { id: 'd1', developmentTags: ['turnover-control', 'pressure'], minPlayers: 8, maxPlayers: 16, material: ['Bälle'], intensity: 'high', difficulty: 'advanced' },
      { id: 'd2', developmentTags: ['turnover-control'], minPlayers: 1, maxPlayers: 4, material: ['Bälle'], intensity: 'medium', difficulty: 'basic' }
    ],
    players: 2, material: ['Bälle'], intensity: 'medium', difficulty: 'basic'
  });
  assert.equal(matches[0].drill.id, 'd2');
  assert(matches[1].warnings.includes('Spielerzahl'));
  ```

  Ein Drill ohne Tag-Überschneidung darf nicht als passend erscheinen.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/individual-development-smoke.mjs`

  Expected: FAIL, weil `matchDrills` fehlt.

- [ ] **Step 3: Matching implementieren**

  Die Punktzahl verwendet nachvollziehbare feste Gewichte:

  ```js
  score = matchedTags.length * 20
    + (drill.developmentTags.includes(priority.skillKey) ? 30 : 0)
    + (playerCountFits ? 10 : -20)
    + (materialFits ? 10 : -20)
    + (intensityFits ? 5 : 0)
    + (difficultyFits ? 5 : 0);
  ```

  Treffer benötigen mindestens eine Tag-Überschneidung und werden nach
  Punktzahl, Drill-Name und ID sortiert.

- [ ] **Step 4: Drillformular erweitern**

  `tpl-drill-detail` erhält Felder für komma-separierte Entwicklungs-Tags,
  Material, Intensität, Schwierigkeit, minimale und maximale Spielerzahl.
  `js/drills.js` normalisiert Tags klein, eindeutig und höchstens 20 Stück:

  ```js
  developmentTags: tagsEl.value.split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean).filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 20)
  ```

- [ ] **Step 5: Test auf GREEN bringen**

  Run: `node scripts/individual-development-smoke.mjs && node scripts/check.mjs`

  Expected: Exitcode 0; bestehende Drills ohne neue Felder bleiben gültig.

- [ ] **Step 6: Commit erstellen**

  ```bash
  git add js/development-core.js js/drills.js index.html scripts/individual-development-smoke.mjs
  git commit -m "feat: match development fields to existing drills"
  ```

### Task 2: Spielerprofil mit Top drei, Stärken und Verlauf

**Files:**
- Create: `js/individual-development.js`
- Modify: `js/players.js`
- Modify: `index.html`
- Create: `development.css`
- Modify: `scripts/individual-development-smoke.mjs`

**Interfaces:**
- Consumes: `profileForPlayer()`, `matchDrills()` und Storage-APIs aus dem ersten Plan.
- Produces: `BT.individualDevelopment.renderPlayerPanel(host, playerId): void`.
- Produces: `BT.individualDevelopment.updateFinding(id, changes): object`.

- [ ] **Step 1: Profil- und Interaktionstest ergänzen**

  Der JSDOM-Test rendert einen Spieler mit vier offenen Feldern und einer
  Stärke. Er erwartet drei Prioritätskarten, eine getrennte Stärkenliste und
  chronologisch absteigende Historie. Ein Spieler nur mit Stärken zeigt:

  `„Aktuell kein offenes Entwicklungsfeld. Stärken weiter stabilisieren.“`

  Nach Klick auf „Erreicht“ wird der Befund aktualisiert und verschwindet
  sofort aus den Top drei.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/individual-development-smoke.mjs`

  Expected: FAIL, weil `js/individual-development.js` fehlt.

- [ ] **Step 3: Spielerpanel implementieren**

  `index.html` ergänzt in `tpl-player-detail` unter den bestehenden Zielen:

  ```html
  <section class="development-evidence-panel" data-role="development-evidence">
    <div class="development-head">
      <div><span class="section-kicker">Aus bestätigten Spielen</span><h3>Entwicklungsprofil</h3></div>
    </div>
    <div data-role="development-priorities"></div>
    <div data-role="development-strengths"></div>
    <div data-role="development-history"></div>
  </section>
  ```

  `renderPlayerPanel()` verwendet ausschließlich `textContent` oder
  `BT.util.escapeHTML()`. Jede Prioritätskarte zeigt Punktzahlbegründung,
  Ursprungsspiele, Status, Rolle, passende Drills und Aktionen „Fixieren“,
  „Herabstufen“ sowie „Erreicht“.

- [ ] **Step 4: Spieleransicht anbinden und gestalten**

  `js/players.js` ruft nach `renderGoals(node, player)`:

  ```js
  BT.individualDevelopment?.renderPlayerPanel(
    node.querySelector('[data-role="development-evidence"]'),
    player.id
  );
  ```

  `development.css` verwendet die vorhandenen Farbvariablen, responsive
  Einspaltenkarten unter 720 px und klar sichtbare Fokus-/Statuszustände.

- [ ] **Step 5: Test auf GREEN bringen**

  Run: `node scripts/individual-development-smoke.mjs`

  Expected: PASS einschließlich Stärke-ohne-Schwäche-Fall.

- [ ] **Step 6: Commit erstellen**

  ```bash
  git add js/individual-development.js js/players.js index.html development.css scripts/individual-development-smoke.mjs
  git commit -m "feat: show confirmed player development profiles"
  ```

### Task 3: Schnelle Coach-Ansicht für das offene Freitagstraining

**Files:**
- Modify: `js/individual-development.js`
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `development.css`
- Modify: `scripts/individual-development-smoke.mjs`
- Modify: `sw.js`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Produces: `BT.individualDevelopment.renderCoachView(target): void`.
- Produces: `markWorkedOn(findingId): object`; setzt nur `new` auf `developing`.
- Route: `#/development` mit aktivem Navigationsschlüssel `development`.

- [ ] **Step 1: Routen- und Auswahltest schreiben**

  Der Test rendert `tpl-individual-development`, wählt einen Spieler und prüft:

  ```js
  assert.equal(root.querySelectorAll('[data-role="priority-card"]').length, 3);
  assert.equal(root.querySelector('[data-role="selected-player-name"]').textContent, 'Dhruva');
  assert.equal(storage.getTrainings().length, 0, 'Freitagsansicht hat einen Trainingsplan erzeugt');
  ```

  Nach `markWorkedOn('df_new')` erwartet er `status === 'developing'`; bei
  `stable` bleibt der Status unverändert.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/individual-development-smoke.mjs`

  Expected: FAIL wegen fehlendem `renderCoachView`.

- [ ] **Step 3: Coach-Ansicht implementieren**

  Die Ansicht enthält Suchfeld, kompakte Spielerkarten, ausgewählten Spieler,
  drei Entwicklungsfelder, Stärken, Drillfilter für Spielerzahl, Material,
  Intensität und Schwierigkeit sowie „Heute bearbeitet“. Es gibt keine
  Schaltfläche zum Erzeugen eines Freitagstrainings.

  Die Drillkarte öffnet den bestehenden Hash `#/drills/:id` und zeigt
  `matchedTags` sowie Warnungen aus `matchDrills()`.

- [ ] **Step 4: Route, Navigation und Offline-Cache anbinden**

  `js/app.js` erhält vor `#/players`:

  ```js
  } else if (hash === '#/development') {
    BT.individualDevelopment.renderCoachView(app);
  ```

  `index.html` erhält unter „Coaching“ den Link „Individualentwicklung“, das
  Template, `development.css` und `js/individual-development.js` nach dem
  Fachmodul. `setActiveNav()` ordnet die Route `development` zu.

  `sw.js` nimmt CSS und JS auf und erhöht `CACHE` von `courthub-v206` auf
  `courthub-v207`.

- [ ] **Step 5: Test und Syntaxprüfung auf GREEN bringen**

  Run: `node scripts/individual-development-smoke.mjs && node scripts/check.mjs`

  Expected: Exitcode 0; der Test weist weiterhin null neu erzeugte Trainings
  nach.

- [ ] **Step 6: Commit erstellen**

  ```bash
  git add js/individual-development.js js/app.js index.html development.css scripts/individual-development-smoke.mjs sw.js scripts/check.mjs
  git commit -m "feat: add open Friday coach development view"
  ```

### Task 4: Belegte KI-Antworten und bestätigungspflichtige neue Übungen

**Files:**
- Modify: `api/_lib/ai-contracts.js`
- Modify: `js/api.js`
- Modify: `js/individual-development.js`
- Create: `scripts/development-answer-smoke.mjs`
- Modify: `scripts/individual-development-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: Aktion `answerPlayerDevelopmentQuestion` mit Vertrag `player-development-answer.v1`.
- Produces: `askQuestion(playerId, question): Promise<{ answer, findingIds, drillIds, proposedDrill }>`.
- Produces: `stageProposedDrill(proposal): string`; legt einen flüchtigen Vorschlag ab und gibt dessen Token zurück.
- Produces: `approveProposedDrill(proposalToken): object`.

- [ ] **Step 1: Serverseitigen Vertrags-Smoke-Test schreiben**

  `scripts/development-answer-smoke.mjs` erstellt zwei Spieler und übergibt nur
  die bestätigten IDs des ausgewählten Spielers:

  ```js
  const request = buildAIRequest('answerPlayerDevelopmentQuestion', {
    player: { id: 'p1', name: 'Dhruva' },
    question: 'Welche Übung passt heute bei zwei Spielern?',
    findings: [{ id: 'df1', observation: 'Ballverluste unter Druck', skillKey: 'turnover-control' }],
    drills: [{ id: 'd1', name: 'Pressure Passing', developmentTags: ['turnover-control'] }]
  });
  const result = request.parse(JSON.stringify({
    answer: 'Nutze Pressure Passing mit kontrolliertem Tempo.',
    findingIds: ['df1'], drillIds: ['d1'], proposedDrill: null
  }), { allowedFindingIds: new Set(['df1']), allowedDrillIds: new Set(['d1']) });
  assert.deepEqual(result.findingIds, ['df1']);
  ```

  Unbekannte IDs, `df_other_player`, medizinische Aussagen, leere Belege und
  mehr als ein Übungsvorschlag müssen `AI_INVALID_RESPONSE` auslösen.

- [ ] **Step 2: RED-Zustand bestätigen**

  Run: `node scripts/development-answer-smoke.mjs`

  Expected: FAIL mit `Unbekannte KI-Aktion.`.

- [ ] **Step 3: KI-Vertrag implementieren**

  Der Antwortvertrag liefert:

  ```js
  {
    answer: '...',
    findingIds: ['df1'],
    drillIds: ['d1'],
    proposedDrill: {
      name: '...', category: '...', minutes: 12,
      goal: '...', organization: '...', steps: ['1. ...', '2. ...'],
      coachingPoints: ['...'], commands: ['Scan!', 'Passfenster!'],
      description: 'Ziel: ...\\nAufbau: ...\\nAblauf: ...',
      developmentTags: ['turnover-control'],
      material: ['Bälle'], intensity: 'medium', difficulty: 'basic',
      minPlayers: 1, maxPlayers: 4,
      progression: '...', simplification: '...',
      metrics: ['8 von 10 Pässen erreichen das Ziel'],
      constraints: ['Maximal zwei Dribblings'],
      variants: { players8to10: '...', players11to14: '...', players15plus: '...' }
    }
  }
  ```

  `proposedDrill` darf `null` sein und ist nur erlaubt, wenn kein vorhandener
  Drill die Mindestübereinstimmung erreicht. Der Payload enthält dafür das
  deterministisch berechnete Feld `hasSuitableDrill`; bei `true` verwirft der
  Parser jeden Neuvorschlag. Der Parser vergleicht jede ID mit den übergebenen
  erlaubten Sets und begrenzt die Antwort auf 1.500 Zeichen.

- [ ] **Step 4: Fragebox und flüchtigen Vorschlag implementieren**

  `askQuestion()` baut den Payload ausschließlich aus dem ausgewählten Spieler,
  dessen bestätigten Befunden und den aktuell angezeigten Drill-Kandidaten.
  `proposedDrill` bleibt in einer privaten `Map` im Arbeitsspeicher. Die UI
  zeigt Quellenchips für alle verwendeten Befunde und Drills.

  `stageProposedDrill()` validiert und klont denselben Vorschlagsvertrag,
  erzeugt über `BT.util.uuid('drill_proposal_')` ein Token und ist der einzige
  Schreibweg in diese private `Map`. Dadurch können spätere
  Dienstagvorschläge denselben Freigabeablauf sicher wiederverwenden.

  Erst dieser Handler speichert:

  ```js
  function approveProposedDrill(token) {
    const proposal = pendingDrills.get(token);
    if (!proposal) throw new Error('Der Übungsvorschlag ist nicht mehr verfügbar.');
    pendingDrills.delete(token);
    return BT.storage.upsertDrill({ ...proposal, source: 'ai-development-approved' });
  }
  ```

  Durch das Löschen vor `upsertDrill()` bleibt ein Doppelklick idempotent.

- [ ] **Step 5: Tests und Registrierung abschließen**

  `js/api.js` verwendet für `answerPlayerDevelopmentQuestion` 38.000 ms.
  `package.json` hängt beide neuen Smoke-Tests an `test:development`.

  Run: `npm run test:development && npm run test:ai`

  Expected: Exitcode 0; fremde Spieler-ID und Doppelklick-Fall sind abgedeckt.

- [ ] **Step 6: Commit erstellen**

  ```bash
  git add api/_lib/ai-contracts.js js/api.js js/individual-development.js scripts/development-answer-smoke.mjs scripts/individual-development-smoke.mjs package.json
  git commit -m "feat: answer coach questions from confirmed findings"
  ```

### Task 5: Lieferstufe vollständig verifizieren und dokumentieren

**Files:**
- Modify: `docs/BASKETBALL-AI.md`
- Modify: `docs/FRIDAY-STATIONS.md`

**Interfaces:**
- Consumes: alle Schnittstellen aus Task 1 bis 4.
- Produces: dokumentierten coachgeführten Freitag ohne Auto-Planung.

- [ ] **Step 1: Dokumentation aktualisieren**

  `docs/BASKETBALL-AI.md` beschreibt Quellenchips, zulässige IDs und
  Übungsfreigabe. `docs/FRIDAY-STATIONS.md` stellt klar, dass die neue Route
  `#/development` die offene Individualentwicklung unterstützt und keinen
  Stationsplan erzeugt oder Spielern Inhalte zuweist.

- [ ] **Step 2: Vollständige Tests ausführen**

  Run: `npm run test:development && npm run test:ai && npm test`

  Expected: Alle Befehle enden mit Exitcode 0.

- [ ] **Step 3: PWA-Regression prüfen**

  Run: `node scripts/pwa-loading-smoke.mjs`

  Expected: `development.css`, `js/development-core.js` und
  `js/individual-development.js` sind vorhanden und offline referenzierbar.

- [ ] **Step 4: Finalen Commit erstellen**

  ```bash
  git add docs/BASKETBALL-AI.md docs/FRIDAY-STATIONS.md
  git commit -m "docs: describe open individual Friday workflow"
  ```
