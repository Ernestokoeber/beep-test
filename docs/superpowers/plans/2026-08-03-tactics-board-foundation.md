# Taktikboard – Grundlagen: Umsetzungsplan

> **Für agentische Arbeitskräfte:** ERFORDERLICHE TEILFÄHIGKEIT: Nutze `superpowers:subagent-driven-development` oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Die Schritte verwenden Kontrollkästchen (`- [ ]`) zur Fortschrittsverfolgung.

**Ziel:** Die erste Lieferung stellt sichere gemeinsame Taktikdaten, 5-gegen-5-Angriffs-/Verteidigungs-Tokens und die Grundlage für die späteren Werkzeuge, Vorlagen und Spieleransicht bereit.

**Architektur:** `tactics` wird ein Top-Level-Array des bestehenden Workspace. Alte Taktiknotizen und der lokale Entwurf werden beim Laden in Schritte mit allgemeinen Elementen überführt. Der Workspace-Endpunkt filtert für Viewer serverseitig auf `published === true`; der Viewer-Sync ersetzt lokale Daten stets durch diese gefilterte Antwort.

**Technik:** Vanilla JavaScript, Vercel-Serverfunktionen, PostgreSQL-Workspace, JSDOM, `scripts/smoke.mjs`.

## Globale Einschränkungen

- Es wird keine neue Tabelle und kein neuer API-Endpunkt angelegt.
- `admin`, `coach` und `assistant` schreiben; `viewer` schreibt nie.
- Viewer erhalten serverseitig nur `tactics` mit `published === true`.
- Pro Schritt: höchstens fünf Angriffs- und fünf Verteidigungs-Tokens, ein Ball und 30 Zeichenobjekte.
- Der vorhandene Workspace-Compare-and-Swap bleibt der einzige Konfliktvertrag.

---

### Aufgabe 1: Taktikdaten im lokalen Speicher und beim Laden normalisieren

**Dateien:**

- Ändern: `js/storage.js:1-80`
- Ändern: `js/tactics.js:12-90`
- Test: `scripts/smoke.mjs`

**Schnittstellen:**

- Erzeugt `BT.tactics.normalizeBoard(input)` mit Rückgabe `{ id?, title?, description?, steps, published?, publishedAt? }`.
- Jeder Schritt hat `elements`; Legacy-`players`, `ball`, `arrows`, `texts` werden verlustarm überführt.

- [ ] **Schritt 1: Einen fehlschlagenden Migrationstest schreiben.**

  ```js
  const migrated = window.BT.tactics.normalizeBoard({ players: [{ id: 'p1', label: '1', x: 120, y: 380 }], ball: { x: 250, y: 380 }, arrows: [{ x1: 1, y1: 2, x2: 3, y2: 4, style: 'pass' }], texts: [{ x: 1, y: 2, text: 'Horns' }] });
  assert(migrated.steps[0].elements.filter(item => item.type === 'offense').length === 1, 'Alte Spieler werden nicht zu Angriff-Tokens migriert');
  assert(migrated.steps[0].elements.some(item => item.type === 'arrow' && item.kind === 'pass'), 'Alter Passpfeil wird nicht migriert');
  ```

- [ ] **Schritt 2: `npm run smoke` ausführen; erwartet ist ein Fehler wegen fehlendem `normalizeBoard`.**

- [ ] **Schritt 3: Die Normalisierung implementieren.**

  `storage.empty()` ergänzt `tactics: []`. `normalizeBoard` erzeugt bei Legacy-Daten `offense`, `ball`, `arrow` und `label` in `steps[0].elements`; unvollständige Elemente werden verworfen. Neue Boards erhalten fünf `offense`- und fünf `defense`-Tokens mit Rollen `PG`, `Wing`, `Wing`, `Big`, `Big`.

- [ ] **Schritt 4: `npm test` ausführen; erwartet: grün.**

- [ ] **Schritt 5: Commit erstellen.**

  ```powershell
  git add js/storage.js js/tactics.js scripts/smoke.mjs
  git commit -m "feat: normalize shared tactic boards"
  ```

### Aufgabe 2: Gemeinsame Workspace-Daten für Viewer sicher filtern

**Dateien:**

- Ändern: `api/workspace.js:14-31`
- Ändern: `js/sync.js:30-130`
- Test: `scripts/smoke.mjs` und neuer Node-Test `scripts/workspace-smoke.mjs`

**Schnittstellen:**

- Viewer-GET liefert eine Kopie mit `data.tactics = tactics.filter(tactic => tactic.published === true)`.
- `hasTeamData(data)` erkennt `tactics`.
- Viewer-Reconcile wendet Remote-Daten an und ruft nie `saveWorkspace` auf.

- [ ] **Schritt 1: Fehlschlagende API-Tests mit gemocktem DB-Adapter schreiben.**

  ```js
  const viewerData = await getWorkspaceForRole('viewer', { tactics: [{ id: 'draft', published: false }, { id: 'live', published: true }] });
  assert(viewerData.tactics.map(item => item.id).join(',') === 'live', 'Viewer erhält unveröffentlichte Taktik');
  ```

- [ ] **Schritt 2: Den Test ausführen; erwartet: Viewer erhält beide Einträge.**

- [ ] **Schritt 3: Filter und Viewer-Sync implementieren.**

  `api/workspace.js` kopiert `workspace.data` vor dem Filtern. `sync.js` ergänzt `tactics` in `hasTeamData`; bei `user.role === 'viewer'` wendet `reconcile()` die Remote-Antwort unabhängig von lokalen Zeitstempeln an und beendet sich ohne `push()`.

- [ ] **Schritt 4: `node scripts/workspace-smoke.mjs && npm test` ausführen; erwartet: grün.**

- [ ] **Schritt 5: Commit erstellen.**

  ```powershell
  git add api/workspace.js js/sync.js scripts/workspace-smoke.mjs scripts/smoke.mjs
  git commit -m "fix: filter unpublished tactics for viewers"
  ```

### Aufgabe 3: Trainer-Board auf allgemeine Elemente und Tokens umstellen

**Dateien:**

- Ändern: `index.html:1143-1210`
- Ändern: `js/tactics.js:96-470`
- Ändern: `style.css:4427-4515`
- Test: `scripts/smoke.mjs`

**Schnittstellen:**

- Board-Renderer liest ausschließlich `step.elements`.
- Token-Typen `offense` und `defense` sind visuell und semantisch verschieden; Ball bleibt einzeln.
- Werkzeuge: `move`, `offense`, `defense`, `ball`, `erase`.

- [ ] **Schritt 1: Fehlschlagende UI-Assertions schreiben.**

  ```js
  route('#/tactics');
  assert(window.document.querySelector('[data-tool="offense"]'), 'Angriffs-Token-Werkzeug fehlt');
  assert(window.document.querySelector('[data-tool="defense"]'), 'Verteidigungs-Token-Werkzeug fehlt');
  assert(window.document.querySelectorAll('.tactics-token.offense').length === 5, 'Startboard enthält nicht fünf Angreifer');
  assert(window.document.querySelectorAll('.tactics-token.defense').length === 5, 'Startboard enthält nicht fünf Verteidiger');
  ```

- [ ] **Schritt 2: `npm run smoke` ausführen; erwartet: fehlende Werkzeuge und Tokens.**

- [ ] **Schritt 3: Minimalen Renderer und die horizontale Token-Werkzeuggruppe implementieren.**

  Die SVG-Layer werden um `objects-layer` ergänzt. `renderElements(step)` erzeugt Kreise für Angriff, Quadrate für Verteidigung und den Ball als eigenes Element. Touch/Pointer-Platzierung stoppt nach fünf Tokens des jeweiligen Teams und meldet die Begrenzung per Toast.

- [ ] **Schritt 4: `npm test` ausführen; erwartet: grün.**

- [ ] **Schritt 5: Commit erstellen.**

  ```powershell
  git add index.html js/tactics.js style.css scripts/smoke.mjs
  git commit -m "feat: add offense and defense tactic tokens"
  ```

## Nächste Lieferungen

Nach dieser nutzbaren Grundlage folgen als eigene Pläne die Werkzeuge und Vorlagen (Hütchen, Zonen, Screens, sechs Pfeile, Kontextleiste, vier Templates) sowie Kommunikation und Export (vollständige Animation, PDF, Veröffentlichung und Spieleransicht). Ihre Schnittstellen sind in `docs/superpowers/specs/2026-08-03-tactics-board-design.md` verbindlich definiert.
