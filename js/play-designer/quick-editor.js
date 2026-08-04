import {
  createCourt,
  drawCourt,
  appendDraftPath,
  formatTime,
  pointFromEvent
} from './rendering.js';
import {
  addQuickMove,
  addQuickPass,
  addQuickScreen,
  addQuickPause,
  hasStepActions,
  quickStepLabel,
  stepActions
} from './quick-core.js';
import { deletePlayCompletely } from './complete-delete.js';
import { injectQuickEditorStyles } from './quick-styles.js';

const core = window.BT.tactics.__core;
const DRAFT_KEY = 'tacticsBoardDraft';

const TOOL_HELP = {
  select: 'Spieler und Ball direkt auf dem Feld verschieben.',
  ball: 'Den Angreifer antippen, der den Ball erhalten soll.',
  move: 'Auf einem Spieler beginnen und den gewünschten Weg zeichnen.',
  pass: 'Zuerst Passgeber, danach Empfänger antippen.',
  screen: 'Zuerst Screensteller, danach die Screenposition antippen.'
};

function toast(message) {
  window.BT.util?.toast?.(message);
}

function template() {
  return `
    <header class="chq-header">
      <div class="chq-brand">
        <div class="chq-logo">CH</div>
        <div>
          <span class="chq-kicker">CourtHub Schnellmodus</span>
          <h1>Play einfach aufbauen</h1>
        </div>
      </div>
      <div class="chq-actions">
        <div class="chq-mode" aria-label="Editor-Modus">
          <button type="button" class="active">Schnell</button>
          <button type="button" data-action="pro-mode">Profi</button>
        </div>
        <button class="chq-btn" type="button" data-action="video-import">Video → Play</button>
        <button class="chq-btn" type="button" data-action="new">Neu</button>
        <button class="chq-btn primary" type="button" data-action="save">Speichern</button>
      </div>
    </header>

    <div class="chq-grid">
      <section class="chq-card">
        <div class="chq-card-head">
          <h2 data-role="stage-title">Neues Play</h2>
          <span class="chq-kicker" data-role="stage-step">Aufstellung</span>
        </div>
        <div class="chq-stage">
          <div class="chq-stage-copy">
            <div><strong data-role="stage-action">Grundaufstellung</strong><span data-role="stage-help">Spieler und Ball positionieren.</span></div>
            <button class="chq-btn danger" type="button" data-action="delete">Play vollständig löschen</button>
          </div>
          <div class="chq-court-wrap" data-role="court"></div>
          <div class="chq-transport">
            <div class="chq-transport-buttons">
              <button class="chq-btn icon" type="button" data-action="restart" aria-label="Neu starten">↺</button>
              <button class="chq-btn icon primary" type="button" data-action="play" aria-label="Abspielen">▶</button>
            </div>
            <div class="chq-scrubber">
              <span data-role="time">0.0 s</span>
              <input type="range" min="0" value="0" data-role="scrubber">
              <span data-role="total">0.0 s</span>
            </div>
            <div class="chq-speed">
              <label class="chq-help" style="margin:0">Tempo</label>
              <select data-role="speed"><option value=".75">Langsam</option><option value="1" selected>Normal</option><option value="1.3">Schnell</option></select>
            </div>
          </div>
        </div>
      </section>

      <aside class="chq-side">
        <section class="chq-card">
          <div class="chq-card-body">
            <div class="chq-section-title"><span>1</span><strong>Aufstellung</strong></div>
            <p class="chq-help">Name vergeben, Spieler verschieben und den Ball einem Angreifer zuordnen.</p>
            <div class="chq-fields">
              <div class="chq-field"><label>Play-Name</label><input maxlength="100" data-role="title"></div>
              <div class="chq-field"><label>Kategorie</label><select data-role="category"><option>Offense</option><option>Defense</option><option>Horns</option><option>5-Out</option><option>Transition</option><option>Einwurf</option><option>Press Break</option></select></div>
            </div>
            <div class="chq-tools" style="margin-top:.55rem">
              <button class="chq-tool active" type="button" data-tool="select">Verschieben<small>Spieler frei setzen</small></button>
              <button class="chq-tool" type="button" data-tool="ball">Ball zuordnen<small>Ballführer wählen</small></button>
            </div>
          </div>
        </section>

        <section class="chq-card">
          <div class="chq-card-body">
            <div class="chq-section-title"><span>2</span><strong>Aktion hinzufügen</strong></div>
            <p class="chq-help">CourtHub legt Dauer und Startzeit automatisch fest.</p>
            <div class="chq-relation" aria-label="Reihenfolge">
              <button type="button" class="active" data-relation="after">Danach</button>
              <button type="button" data-relation="same">Gleichzeitig</button>
            </div>
            <div class="chq-tools">
              <button class="chq-tool" type="button" data-tool="move">Lauf / Dribbling<small>Weg zeichnen</small></button>
              <button class="chq-tool" type="button" data-tool="pass">Pass<small>Geber → Empfänger</small></button>
              <button class="chq-tool" type="button" data-tool="screen">Screen<small>Spieler → Position</small></button>
              <button class="chq-tool" type="button" data-action="pause">Pause<small>0,8 Sekunden</small></button>
            </div>
            <div class="chq-pending" data-role="pending" hidden></div>
            <div class="chq-status" data-role="status">${TOOL_HELP.select}</div>
          </div>
        </section>

        <section class="chq-card">
          <div class="chq-card-body">
            <div class="chq-section-title"><span>3</span><strong>Ablauf</strong></div>
            <p class="chq-help">Eine Zeile auswählen, um dort weitere gleichzeitige Aktionen hinzuzufügen.</p>
            <div class="chq-flow" data-role="flow"></div>
          </div>
        </section>
      </aside>
    </div>`;
}

function cleanDraft(points) {
  if (!points?.length) return null;
  const output = [points[0]];
  points.slice(1).forEach(point => {
    if (core.distance(output.at(-1), point) >= 5) output.push(point);
  });
  return output.slice(0, 80);
}

export function mountQuickEditor(target, options = {}) {
  injectQuickEditorStyles();
  const root = document.createElement('section');
  root.className = 'view chq';
  root.dataset.role = 'tactics-quick';
  root.innerHTML = template();
  target.appendChild(root);

  if (!core.canEdit()) {
    root.innerHTML = '<div class="chq-card"><div class="chq-card-body"><span class="chq-kicker">Geschützter Trainerbereich</span><h1>Play einfach aufbauen</h1><p class="chq-help">Bitte als Admin, Coach oder Assistenz anmelden.</p><a class="chq-btn primary" href="#/account">Anmelden</a></div></div>';
    return root;
  }

  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const svg = createCourt();
  q('[data-role="court"]').append(svg);

  let board = core.normalizeBoard(window.BT.storage.getSetting(DRAFT_KEY, null));
  let tool = 'select';
  let relation = 'after';
  let pending = null;
  let drag = null;
  let draft = null;
  let time = core.stepStartTime(board, board.currentStep);
  let playing = false;
  let speed = 1;
  let last = 0;
  let frame = 0;

  const step = () => board.steps[board.currentStep];

  function persist(message) {
    board = core.normalizeBoard(board);
    window.BT.storage.setSetting(DRAFT_KEY, board);
    if (message) q('[data-role="status"]').textContent = message;
  }

  function stop() {
    playing = false;
    last = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function currentSnapshot() {
    const start = core.stepStartTime(board, board.currentStep);
    if (playing || Math.abs(time - start) > 0.001) return window.BT.tactics.snapshotAt(board, time);
    return core.copy(step());
  }

  function draw() {
    const snapshot = currentSnapshot();
    drawCourt(svg, snapshot, {
      sourceStep: snapshot._sourceStep || step(),
      showGuides: !playing
    });
    appendDraftPath(svg, draft);
    q('[data-role="stage-title"]').textContent = board.title;
    q('[data-role="stage-step"]').textContent = `Ablauf ${board.currentStep + 1}`;
    q('[data-role="stage-action"]').textContent = board.currentStep < board.steps.length - 1
      ? quickStepLabel(step(), core)
      : 'Endposition';
    q('[data-role="stage-help"]').textContent = TOOL_HELP[tool] || 'Aktion auf dem Feld erstellen.';
  }

  function renderFlow() {
    const box = q('[data-role="flow"]');
    box.replaceChildren();
    const visible = board.steps.slice(0, Math.max(1, board.steps.length - 1));
    visible.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chq-flow-item${index === board.currentStep ? ' active' : ''}`;
      const label = index < board.steps.length - 1 ? quickStepLabel(item, core) : 'Grundaufstellung';
      const actions = stepActions(item, core).length;
      button.innerHTML = `<span class="chq-flow-index">${index + 1}</span><span class="chq-flow-copy"><strong></strong><span></span></span><span class="chq-flow-time"></span>`;
      button.querySelector('strong').textContent = label;
      button.querySelector('.chq-flow-copy span').textContent = actions ? `${actions} Aktion${actions === 1 ? '' : 'en'}` : 'Wartephase';
      button.querySelector('.chq-flow-time').textContent = `${item.duration.toFixed(1)} s`;
      button.onclick = () => {
        stop();
        board.currentStep = index;
        time = core.stepStartTime(board, index);
        pending = null;
        draft = null;
        refresh();
      };
      box.append(button);
    });
    if (!box.children.length) box.innerHTML = '<div class="chq-empty">Noch keine Aktion vorhanden.</div>';
  }

  function renderPending() {
    const box = q('[data-role="pending"]');
    if (!pending) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    const player = core.elementById(step(), pending.id);
    box.hidden = false;
    box.textContent = tool === 'pass'
      ? `Passgeber ${player?.role || ''} gewählt – jetzt Empfänger antippen.`
      : `Screensteller ${player?.role || ''} gewählt – jetzt Screenposition antippen.`;
  }

  function renderFields() {
    q('[data-role="title"]').value = board.title;
    q('[data-role="category"]').value = board.category;
    const total = window.BT.tactics.boardDuration(board);
    q('[data-role="scrubber"]').max = String(Math.round(total * 1000));
    q('[data-role="scrubber"]').value = String(Math.round(time * 1000));
    q('[data-role="time"]').textContent = formatTime(time);
    q('[data-role="total"]').textContent = formatTime(total);
    q('[data-action="play"]').textContent = playing ? 'Ⅱ' : '▶';
  }

  function refresh() {
    draw();
    renderFlow();
    renderPending();
    renderFields();
    qa('[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
    qa('[data-relation]').forEach(button => button.classList.toggle('active', button.dataset.relation === relation));
  }

  function tick(timestamp) {
    if (!playing || !root.isConnected) return stop();
    if (!last) last = timestamp;
    time += Math.min(0.08, (timestamp - last) / 1000) * speed;
    last = timestamp;
    const total = window.BT.tactics.boardDuration(board);
    if (time >= total) {
      time = total;
      stop();
    }
    board.currentStep = core.locateTime(board, time).index;
    draw();
    renderFields();
    renderFlow();
    if (playing) frame = requestAnimationFrame(tick);
  }

  function hit(point) {
    return core.elements(step()).slice().reverse().find(element =>
      ['offense', 'defense', 'ball'].includes(element.type)
        && core.distance(point, element) <= (element.type === 'ball' ? 20 : 30)
    ) || null;
  }

  function nearestPlayer(point, offenseOnly = false) {
    return core.elements(step())
      .filter(element => offenseOnly ? element.type === 'offense' : ['offense', 'defense'].includes(element.type))
      .map(element => ({ element, distance: core.distance(element, point) }))
      .sort((left, right) => left.distance - right.distance)[0] || null;
  }

  function updateSetupPosition(id, point) {
    const activeHasActions = hasStepActions(step(), core);
    const startIndex = board.currentStep;
    const endIndex = !activeHasActions && startIndex === 0 ? board.steps.length : startIndex + 1;
    for (let index = startIndex; index < endIndex; index += 1) {
      const element = core.elementById(board.steps[index], id);
      if (element) Object.assign(element, point);
    }
  }

  function assignBall(player) {
    if (!player || player.type !== 'offense') return toast('Bitte einen Angreifer auswählen.');
    const point = { x: core.clamp(player.x + 16, 16, 484), y: player.y };
    updateSetupPosition('ball', point);
    persist(`Ball ist jetzt bei Spieler ${player.role}.`);
    refresh();
  }

  function applyMove(actor, points) {
    try {
      board = addQuickMove(board, {
        stepIndex: board.currentStep,
        relation,
        actorId: actor.id,
        path: points
      }, core);
      time = core.stepStartTime(board, board.currentStep);
      persist(actor.type === 'offense' && core.distance(actor, core.elementById(step(), 'ball')) <= 34
        ? 'Dribbling automatisch erstellt.'
        : 'Laufweg automatisch erstellt.');
    } catch (error) {
      toast(error.message);
    }
    refresh();
  }

  function applyPass(fromId, toId) {
    try {
      board = addQuickPass(board, {
        stepIndex: board.currentStep,
        relation,
        fromId,
        toId
      }, core);
      time = core.stepStartTime(board, board.currentStep);
      persist('Pass automatisch erstellt.');
    } catch (error) {
      toast(error.message);
    }
    pending = null;
    refresh();
  }

  function applyScreen(actorId, point) {
    try {
      board = addQuickScreen(board, {
        stepIndex: board.currentStep,
        relation,
        actorId,
        point
      }, core);
      time = core.stepStartTime(board, board.currentStep);
      persist('Screen und benötigter Laufweg automatisch erstellt.');
    } catch (error) {
      toast(error.message);
    }
    pending = null;
    refresh();
  }

  svg.onpointerdown = event => {
    stop();
    const point = pointFromEvent(svg, event);
    if (tool === 'select') {
      const selected = hit(point);
      if (!selected) return;
      drag = {
        id: event.pointerId,
        elementId: selected.id,
        dx: point.x - selected.x,
        dy: point.y - selected.y,
        changed: false
      };
      svg.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'ball') {
      const result = nearestPlayer(point, true);
      if (result && result.distance <= 42) assignBall(result.element);
      else toast('Ballführer direkt antippen.');
      return;
    }

    if (tool === 'move') {
      const result = nearestPlayer(point, false);
      if (!result || result.distance > 40) return toast('Laufweg direkt auf einem Spieler beginnen.');
      draft = [core.point(result.element)];
      drag = { id: event.pointerId, mode: 'path', actor: result.element };
      svg.setPointerCapture(event.pointerId);
      draw();
      return;
    }

    if (tool === 'pass') {
      const result = nearestPlayer(point, true);
      if (!result || result.distance > 42) return toast('Angreifer direkt antippen.');
      if (!pending) {
        pending = { id: result.element.id };
        refresh();
      } else if (pending.id !== result.element.id) {
        applyPass(pending.id, result.element.id);
      } else {
        toast('Bitte einen anderen Empfänger wählen.');
      }
      return;
    }

    if (tool === 'screen') {
      if (!pending) {
        const result = nearestPlayer(point, true);
        if (!result || result.distance > 42) return toast('Screensteller direkt antippen.');
        pending = { id: result.element.id };
        refresh();
      } else {
        applyScreen(pending.id, point);
      }
    }
  };

  svg.onpointermove = event => {
    if (!drag) return;
    const point = pointFromEvent(svg, event);
    if (drag.mode === 'path') {
      if (core.distance(draft.at(-1), point) >= 5) draft.push(point);
      draw();
      return;
    }
    const x = core.clamp(point.x - drag.dx, 16, 484);
    const y = core.clamp(point.y - drag.dy, 16, 454);
    const element = core.elementById(step(), drag.elementId);
    if (!element) return;
    if (element.x !== x || element.y !== y) drag.changed = true;
    updateSetupPosition(drag.elementId, { x, y });
    draw();
  };

  function finishPointer(event) {
    if (!drag) return;
    const active = drag;
    drag = null;
    try { svg.releasePointerCapture(event.pointerId); } catch (_) {}
    if (active.mode === 'path') {
      const path = cleanDraft(draft);
      draft = null;
      if (path?.length > 1) applyMove(active.actor, path);
      else refresh();
      return;
    }
    if (active.changed) persist('Aufstellung geändert.');
    refresh();
  }

  svg.onpointerup = finishPointer;
  svg.onpointercancel = finishPointer;

  qa('[data-tool]').forEach(button => {
    button.onclick = () => {
      tool = button.dataset.tool;
      pending = null;
      draft = null;
      q('[data-role="status"]').textContent = TOOL_HELP[tool];
      refresh();
    };
  });

  qa('[data-relation]').forEach(button => {
    button.onclick = () => {
      relation = button.dataset.relation;
      q('[data-role="status"]').textContent = relation === 'same'
        ? 'Die nächste Aktion startet gleichzeitig mit den Aktionen dieser Zeile.'
        : 'Die nächste Aktion wird automatisch danach angelegt.';
      refresh();
    };
  });

  q('[data-action="pause"]').onclick = () => {
    try {
      board = addQuickPause(board, { stepIndex: board.currentStep, duration: 0.8 }, core);
      time = core.stepStartTime(board, board.currentStep);
      persist('Pause von 0,8 Sekunden eingefügt.');
      refresh();
    } catch (error) {
      toast(error.message);
    }
  };

  q('[data-action="play"]').onclick = () => {
    if (playing) {
      stop();
      refresh();
      return;
    }
    const total = window.BT.tactics.boardDuration(board);
    if (time >= total - 0.02) time = 0;
    playing = true;
    last = 0;
    refresh();
    frame = requestAnimationFrame(tick);
  };

  q('[data-action="restart"]').onclick = () => {
    stop();
    time = 0;
    board.currentStep = 0;
    refresh();
  };

  q('[data-role="scrubber"]').oninput = event => {
    stop();
    time = core.number(event.target.value, 0) / 1000;
    board.currentStep = core.locateTime(board, time).index;
    refresh();
  };

  q('[data-role="speed"]').onchange = event => {
    speed = core.number(event.target.value, 1);
  };

  q('[data-role="title"]').onchange = event => {
    board.title = String(event.target.value || 'Neues Play').slice(0, 100);
    persist('Play-Name geändert.');
    refresh();
  };

  q('[data-role="category"]').onchange = event => {
    board.category = String(event.target.value || 'Offense').slice(0, 32);
    persist('Kategorie geändert.');
    refresh();
  };

  q('[data-action="save"]').onclick = () => {
    board = core.normalizeBoard(window.BT.storage.upsertTactic(board));
    persist('Play gespeichert und synchronisiert.');
    toast('Play gespeichert.');
    refresh();
  };

  q('[data-action="new"]').onclick = () => {
    if (!window.confirm('Aktuellen Entwurf verwerfen und ein neues Play beginnen?')) return;
    stop();
    board = core.defaultBoard();
    time = 0;
    tool = 'select';
    relation = 'after';
    pending = null;
    persist('Neues Play begonnen.');
    refresh();
  };

  q('[data-action="delete"]').onclick = () => {
    const saved = Boolean(board.id);
    const message = saved
      ? `„${board.title}“ vollständig aus dem Playbook und als Entwurf löschen?`
      : `Den aktuellen Entwurf „${board.title}“ vollständig verwerfen?`;
    if (!window.confirm(message)) return;
    deletePlayCompletely(window.BT.storage, board);
    board = core.defaultBoard();
    time = 0;
    pending = null;
    tool = 'select';
    persist(saved ? 'Play vollständig gelöscht.' : 'Entwurf verworfen.');
    toast(saved ? 'Play vollständig gelöscht.' : 'Entwurf vollständig verworfen.');
    refresh();
  };

  q('[data-action="pro-mode"]').onclick = () => options.onModeChange?.('pro');
  q('[data-action="video-import"]').onclick = () => options.onVideoImport?.();

  persist();
  refresh();
  return root;
}
