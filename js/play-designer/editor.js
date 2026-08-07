import {
  createCourt,
  drawCourt,
  appendDraftPath,
  formatTime,
  actionLabel,
  transitionActions,
  pointFromEvent
} from './rendering.js';
import { exportPdf, exportGif } from './exports.js';
import { createHistory } from './history.js';

const c = window.BT.tactics.__core;
const K = 'tacticsBoardDraft';
const H = {
  select: 'Element auswählen oder verschieben.',
  move: 'Spieler berühren und Laufweg zeichnen.',
  pass: 'Passgeber und Passempfänger wählen.',
  screen: 'Screensteller und Position wählen.',
  offense: 'Angriffsspieler platzieren.',
  defense: 'Verteidiger platzieren.',
  ball: 'Ball platzieren.',
  cone: 'Hütchen platzieren.',
  zone: 'Zone platzieren.',
  label: 'Text platzieren.',
  erase: 'Element löschen.'
};

const toast = message => window.BT.util?.toast?.(message);
const ok = () => c.canEdit() || (toast('Zum Bearbeiten bitte als Trainerteam anmelden.'), false);
const save = board => window.BT.storage.setSetting(K, c.normalizeBoard(board));
const cleanPath = points => {
  const output = [points[0]];
  points.slice(1).forEach(point => {
    if (c.distance(output.at(-1), point) >= 8) output.push(point);
  });
  return output.slice(0, 80);
};

function html() {
  const tools = [
    ['select', 'Auswahl'],
    ['move', 'Laufweg'],
    ['pass', 'Pass'],
    ['screen', 'Screen'],
    ['offense', 'O-Spieler'],
    ['defense', 'X-Spieler'],
    ['ball', 'Ball'],
    ['cone', 'Hütchen'],
    ['zone', 'Zone'],
    ['label', 'Text'],
    ['erase', 'Löschen']
  ].map(([key, label], index) =>
    `<button class="chpd-tool${index ? '' : ' active'}" data-tool="${key}">${label}</button>`
  ).join('');

  return `
    <header class="chpd-header">
      <div class="chpd-brand">
        <div class="chpd-logo">CH</div>
        <div>
          <span class="chpd-kicker">CourtHub Play Designer</span>
          <h1>Playbook & Animation</h1>
        </div>
      </div>
      <div class="chpd-actions">
        <a href="#/tactics/player" class="chpd-btn ghost">Spieleransicht</a>
        <button class="chpd-btn" data-a="pdf">PDF</button>
        <button class="chpd-btn" data-a="gif">GIF</button>
        <button class="chpd-btn primary" data-a="save">Speichern</button>
      </div>
    </header>
    <div class="chpd-grid">
      <aside class="chpd-panel chpd-library-panel">
        <div class="chpd-panel-head">
          <h2>Playbook</h2>
          <button class="chpd-btn icon" data-a="new">＋</button>
        </div>
        <div class="chpd-panel-body">
          <div class="chpd-field">
            <label>Vorlage</label>
            <select data-r="template"><option value="">Vorlage wählen</option></select>
          </div>
          <div class="chpd-field">
            <label>Kategorie</label>
            <select data-r="category">
              <option>Offense</option><option>Defense</option><option>Horns</option>
              <option>5-Out</option><option>Transition</option><option>Einwurf</option>
              <option>Press Break</option>
            </select>
          </div>
          <div class="chpd-library" data-r="library"></div>
          <div class="chpd-row">
            <button class="chpd-btn" data-a="publish">Veröffentlichen</button>
            <button class="chpd-btn danger" data-a="delete-play">Löschen</button>
          </div>
        </div>
      </aside>
      <main class="chpd-center">
        <section class="chpd-stage" data-r="stage">
          <div class="chpd-stage-inner">
            <div class="chpd-stage-head">
              <div class="chpd-stage-copy">
                <strong data-r="stage-title"></strong>
                <span data-r="stage-sub"></span>
              </div>
              <div class="chpd-row" data-role="history-controls">
                <button class="chpd-btn icon" type="button" data-a="undo" aria-label="Rückgängig" title="Rückgängig · Strg/Cmd + Z">↶</button>
                <button class="chpd-btn icon" type="button" data-a="redo" aria-label="Wiederholen" title="Wiederholen · Strg/Cmd + Umschalt + Z">↷</button>
                <span class="chpd-badge" data-r="badge"></span>
              </div>
            </div>
            <div class="chpd-court-wrap" data-r="court"></div>
            <div class="chpd-tools">${tools}</div>
            <div class="chpd-hint" data-r="hint">${H.select}</div>
          </div>
        </section>
        <section class="chpd-transport">
          <div class="chpd-transport-buttons">
            <button class="chpd-btn icon" data-a="restart">↺</button>
            <button class="chpd-btn icon primary" data-a="play">▶</button>
            <button class="chpd-btn icon" data-a="fullscreen">⛶</button>
          </div>
          <div class="chpd-scrubber">
            <span data-r="time"></span>
            <input type="range" min="0" value="0" data-r="scrubber">
            <span data-r="total"></span>
          </div>
          <div class="chpd-speed">
            <label class="chpd-toggle"><input type="checkbox" data-r="loop"> Loop</label>
            <select data-r="speed">
              <option value=".5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option>
            </select>
          </div>
        </section>
        <section class="chpd-timeline">
          <div class="chpd-timeline-head">
            <strong>Timeline</strong>
            <div>
              <button class="chpd-btn icon" data-a="add-step">＋</button>
              <button class="chpd-btn icon" data-a="delete-step">−</button>
            </div>
          </div>
          <div class="chpd-steps" data-r="steps"></div>
          <div class="chpd-action-strip" data-r="actions"></div>
        </section>
      </main>
      <aside class="chpd-panel chpd-inspector">
        <div class="chpd-panel-head">
          <h2>Eigenschaften</h2>
          <button class="chpd-btn icon" data-a="ai">✦</button>
        </div>
        <div class="chpd-panel-body">
          <div class="chpd-field"><label>Play-Name</label><input maxlength="100" data-r="title"></div>
          <div class="chpd-field"><label>Coaching Points</label><textarea maxlength="400" data-r="description"></textarea></div>
          <div class="chpd-field"><label>Schrittdauer</label><input type="number" min=".3" max="10" step=".1" data-r="duration"></div>
          <div data-r="inspector"></div>
          <div class="chpd-status" data-r="status">Lokaler Entwurf · Team-Synchronisierung aktiv</div>
        </div>
      </aside>
    </div>`;
}

export function mountEditor(target) {
  const root = document.createElement('section');
  root.className = 'view chpd';
  root.dataset.role = 'tactics-v2';
  root.innerHTML = html();
  target.appendChild(root);

  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const svg = createCourt();
  q('[data-r="court"]').append(svg);

  let b = c.normalizeBoard(window.BT.storage.getSetting(K, null));
  let tool = 'select';
  let sel = null;
  let act = null;
  let pending = null;
  let drag = null;
  let draft = null;
  let time = c.stepStartTime(b, b.currentStep);
  let playing = false;
  let speed = 1;
  let loop = false;
  let last = 0;
  let raf = 0;

  const history = createHistory(b, { limit: 80, clone: c.copy });
  const step = () => b.steps[b.currentStep];
  const tr = () => step().transition = c.normalizeTransition(step().transition);
  const next = () => b.steps[b.currentStep + 1]
    || (b.steps.push(c.cloneStep(step())), b.steps.at(-1));

  window.BT.tactics.templates().forEach(template => {
    q('[data-r="template"]').insertAdjacentHTML(
      'beforeend',
      `<option value="${template.id}">${template.title}</option>`
    );
  });

  function persist(message) {
    save(b);
    if (message) q('[data-r="status"]').textContent = message;
  }

  function commitChange(message) {
    b = c.normalizeBoard(b);
    const changed = history.commit(b);
    persist(message);
    return changed;
  }

  function resetTransientState() {
    sel = null;
    act = null;
    pending = null;
    drag = null;
    draft = null;
  }

  function restoreHistoryState(value, message) {
    if (!value) return;
    stop();
    b = c.normalizeBoard(value);
    resetTransientState();
    time = c.stepStartTime(b, b.currentStep);
    persist(message);
    refresh();
    toast(message);
  }

  function undo() {
    if (!ok()) return;
    restoreHistoryState(history.undo(), 'Letzten Vorgang rückgängig gemacht.');
  }

  function redo() {
    if (!ok()) return;
    restoreHistoryState(history.redo(), 'Vorgang wiederhergestellt.');
  }

  function draw() {
    const start = c.stepStartTime(b, b.currentStep);
    const snapshot = playing || Math.abs(time - start) > .001
      ? window.BT.tactics.snapshotAt(b, time)
      : c.copy(step());
    drawCourt(svg, snapshot, {
      sourceStep: snapshot._sourceStep || step(),
      selectedId: sel,
      selectedActionId: act,
      showGuides: !playing
    });
    appendDraftPath(svg, draft);
    q('[data-r="stage-title"]').textContent = b.title;
    q('[data-r="stage-sub"]').textContent = `Schritt ${(snapshot._timeline?.index ?? b.currentStep) + 1} von ${b.steps.length}`;
    q('[data-r="badge"]').textContent = b.published ? 'VERÖFFENTLICHT' : 'ENTWURF';
  }

  function timeline() {
    const box = q('[data-r="steps"]');
    box.replaceChildren();
    b.steps.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = 'chpd-step' + (index === b.currentStep ? ' active' : '');
      button.innerHTML = `<strong>Schritt ${index + 1}</strong><span>${item.duration.toFixed(1)} s · ${transitionActions(item).length} Aktionen</span>`;
      button.onclick = () => {
        stop();
        b.currentStep = index;
        time = c.stepStartTime(b, index);
        sel = null;
        act = null;
        refresh();
      };
      box.append(button);
    });

    const actions = q('[data-r="actions"]');
    actions.replaceChildren();
    transitionActions(step()).forEach(action => {
      const button = document.createElement('button');
      button.className = 'chpd-action' + (action.id === act ? ' active' : '');
      button.textContent = actionLabel(action, step());
      button.onclick = () => {
        act = action.id;
        sel = null;
        refresh();
      };
      actions.append(button);
    });
    if (!actions.children.length) {
      actions.innerHTML = '<span class="chpd-empty">Noch keine animierten Aktionen.</span>';
    }
  }

  function library() {
    const box = q('[data-r="library"]');
    const items = window.BT.storage.getTactics().map(c.normalizeBoard);
    box.replaceChildren();
    items.forEach(item => {
      const button = document.createElement('button');
      button.className = item.id === b.id ? 'active' : '';
      button.innerHTML = '<strong></strong><span></span>';
      button.children[0].textContent = item.title;
      button.children[1].textContent = `${item.category} · ${item.steps.length} Schritte${item.published ? ' · veröffentlicht' : ''}`;
      button.onclick = () => {
        b = item;
        history.reset(b);
        time = c.stepStartTime(b, b.currentStep);
        resetTransientState();
        persist('Play geladen.');
        refresh();
      };
      box.append(button);
    });
    if (!items.length) box.innerHTML = '<p class="chpd-empty">Noch keine gespeicherten Plays.</p>';
  }

  function inspector() {
    const box = q('[data-r="inspector"]');
    const element = c.elementById(step(), sel);
    const action = transitionActions(step()).find(item => item.id === act);
    box.replaceChildren();

    if (!element && !action) {
      box.innerHTML = '<p class="chpd-empty">Spieler oder Timeline-Aktion auswählen.</p>';
      return;
    }

    if (element) {
      box.innerHTML = `<div class="chpd-stat"><strong>${element.type}</strong><span>${Math.round(element.x)} / ${Math.round(element.y)}</span></div>`;
      if (['offense', 'defense', 'label'].includes(element.type)) {
        const input = document.createElement('input');
        input.value = element.type === 'label' ? element.text : element.role;
        input.onchange = () => {
          if (element.type === 'label') element.text = input.value;
          else element.role = input.value;
          commitChange('Beschriftung geändert.');
          refresh();
        };
        box.append(input);
      }
      const removeButton = document.createElement('button');
      removeButton.className = 'chpd-btn danger';
      removeButton.textContent = 'Element entfernen';
      removeButton.onclick = remove;
      box.append(removeButton);
      return;
    }

    box.innerHTML = `<div class="chpd-stat"><strong>${actionLabel(action, step())}</strong><span>${action.type}</span></div>`;
    [['Startzeit', 'start', 0], ['Dauer', 'duration', .12]].forEach(([label, key, minimum]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chpd-field';
      wrapper.innerHTML = `<label>${label}</label>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '.1';
      input.min = minimum;
      input.value = action[key];
      input.onchange = () => {
        action[key] = c.clamp(c.number(input.value, action[key]), minimum, 10);
        commitChange(`${label} geändert.`);
        refresh();
      };
      wrapper.append(input);
      box.append(wrapper);
    });
    const removeButton = document.createElement('button');
    removeButton.className = 'chpd-btn danger';
    removeButton.textContent = 'Aktion entfernen';
    removeButton.onclick = remove;
    box.append(removeButton);
  }

  function fields() {
    q('[data-r="title"]').value = b.title;
    q('[data-r="description"]').value = b.description;
    q('[data-r="category"]').value = b.category;
    q('[data-r="duration"]').value = step().duration.toFixed(1);
    const total = window.BT.tactics.boardDuration(b);
    q('[data-r="scrubber"]').max = Math.round(total * 1000);
    q('[data-r="scrubber"]').value = Math.round(time * 1000);
    q('[data-r="time"]').textContent = formatTime(time);
    q('[data-r="total"]').textContent = formatTime(total);
    q('[data-a="play"]').textContent = playing ? 'Ⅱ' : '▶';
    q('[data-a="publish"]').textContent = b.published ? 'Zurückziehen' : 'Veröffentlichen';

    const editable = c.canEdit();
    qa('[data-tool],[data-a="add-step"],[data-a="delete-step"]').forEach(button => {
      button.disabled = !editable;
    });
    q('[data-a="undo"]').disabled = !editable || !history.canUndo();
    q('[data-a="redo"]').disabled = !editable || !history.canRedo();
  }

  const refresh = () => {
    draw();
    timeline();
    library();
    inspector();
    fields();
  };

  function stop() {
    playing = false;
    last = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function tick(timestamp) {
    if (!playing || !root.isConnected) return stop();
    if (!last) last = timestamp;
    time += Math.min(.08, (timestamp - last) / 1000) * speed;
    last = timestamp;
    const total = window.BT.tactics.boardDuration(b);
    if (time >= total) {
      if (loop) time = 0;
      else {
        time = total;
        stop();
      }
    }
    b.currentStep = c.locateTime(b, time).index;
    draw();
    fields();
    if (playing) raf = requestAnimationFrame(tick);
  }

  function hit(point) {
    return c.elements(step()).slice().reverse().find(element =>
      element.type === 'zone'
        ? Math.abs(point.x - element.x) <= element.width / 2 && Math.abs(point.y - element.y) <= element.height / 2
        : c.distance(point, element) <= (element.type === 'ball' ? 18 : 27)
    );
  }

  function nearest(point) {
    return c.elements(step())
      .filter(element => ['offense', 'defense'].includes(element.type))
      .map(element => ({ element, distance: c.distance(element, point) }))
      .sort((left, right) => left.distance - right.distance)[0];
  }

  function addMove(actor, path) {
    const following = next();
    const targetElement = c.elementById(following, actor.id);
    const cleanedPath = cleanPath([c.point(actor), ...path]);
    const endPoint = cleanedPath.at(-1);
    Object.assign(targetElement, endPoint);
    tr().motions = tr().motions.filter(item => item.elementId !== actor.id);
    const action = {
      id: c.uid('motion_'),
      type: 'move',
      elementId: actor.id,
      start: 0,
      duration: step().duration,
      path: cleanedPath
    };
    tr().motions.push(action);
    act = action.id;
    sel = null;
    commitChange('Laufweg gespeichert.');
  }

  function addPass(from, to) {
    const following = next();
    const receiver = c.elementById(following, to);
    const ball = c.elementById(following, 'ball');
    if (receiver && ball) Object.assign(ball, { x: receiver.x + 16, y: receiver.y });
    const action = {
      id: c.uid('pass_'),
      type: 'pass',
      fromId: from,
      toId: to,
      start: step().duration * .55,
      duration: .4,
      curve: -42
    };
    tr().passes.push(action);
    act = action.id;
    commitChange('Pass gespeichert.');
  }

  function addScreen(id, point) {
    const element = c.elementById(step(), id);
    const action = {
      id: c.uid('screen_'),
      type: 'screen',
      elementId: id,
      start: step().duration * .2,
      duration: step().duration * .55,
      x: point.x,
      y: point.y,
      angle: Math.atan2(point.y - element.y, point.x - element.x) * 180 / Math.PI + 90
    };
    tr().screens.push(action);
    act = action.id;
    commitChange('Screen gespeichert.');
  }

  function remove() {
    if (!ok()) return;
    if (act) {
      const transition = tr();
      transition.motions = transition.motions.filter(item => item.id !== act);
      transition.passes = transition.passes.filter(item => item.id !== act);
      transition.screens = transition.screens.filter(item => item.id !== act);
      act = null;
    } else if (sel) {
      step().elements = step().elements.filter(element => element.id !== sel);
      b.steps.slice(b.currentStep + 1).forEach(item => {
        item.elements = item.elements.filter(element => element.id !== sel);
      });
      sel = null;
    } else {
      return;
    }
    commitChange('Auswahl entfernt.');
    refresh();
  }

  svg.onpointerdown = event => {
    if (!ok()) return;
    stop();
    const point = pointFromEvent(svg, event);
    const selected = hit(point);

    if (tool === 'select') {
      act = null;
      sel = selected?.id || null;
      if (selected) {
        drag = {
          element: selected,
          dx: point.x - selected.x,
          dy: point.y - selected.y,
          id: event.pointerId,
          changed: false
        };
        svg.setPointerCapture(event.pointerId);
      }
      refresh();
      return;
    }

    if (tool === 'move') {
      const result = nearest(point);
      if (!result || result.distance > 34) return toast('Laufweg auf einem Spieler beginnen.');
      sel = result.element.id;
      draft = [c.point(result.element)];
      drag = { mode: 'path', actor: result.element, id: event.pointerId };
      svg.setPointerCapture(event.pointerId);
      draw();
      return;
    }

    if (['pass', 'screen'].includes(tool)) {
      const result = nearest(point);
      if (!pending) {
        if (!result || result.distance > 36) return toast('Spieler auswählen.');
        pending = result.element.id;
        sel = pending;
        draw();
        return;
      }
      if (tool === 'pass') {
        if (result && result.element.id !== pending) addPass(pending, result.element.id);
        else toast('Anderen Empfänger wählen.');
      } else {
        addScreen(pending, point);
      }
      pending = null;
      sel = null;
      refresh();
      return;
    }

    if (tool === 'erase') {
      if (selected) {
        sel = selected.id;
        remove();
      }
      return;
    }

    let changed = false;
    if (['offense', 'defense'].includes(tool)) {
      if (c.elements(step(), tool).length >= 5) return toast('Maximal fünf Spieler.');
      const index = c.elements(step(), tool).length + 1;
      step().elements.push({
        id: c.uid(tool === 'offense' ? 'o_' : 'd_'),
        type: tool,
        role: tool === 'offense' ? String(index) : 'X' + index,
        ...point
      });
      changed = true;
    } else if (tool === 'ball') {
      const ball = c.elements(step(), 'ball')[0];
      if (ball) Object.assign(ball, point);
      else step().elements.push({ id: 'ball', type: 'ball', ...point });
      changed = true;
    } else if (tool === 'cone') {
      step().elements.push({ id: c.uid('cone_'), type: 'cone', ...point });
      changed = true;
    } else if (tool === 'zone') {
      step().elements.push({
        id: c.uid('zone_'),
        type: 'zone',
        shape: 'rect',
        width: 120,
        height: 85,
        ...point
      });
      changed = true;
    } else if (tool === 'label') {
      const text = prompt('Beschriftung:', 'Screen');
      if (text) {
        step().elements.push({ id: c.uid('label_'), type: 'label', text, ...point });
        changed = true;
      }
    }

    if (changed) commitChange('Element hinzugefügt.');
    refresh();
  };

  svg.onpointermove = event => {
    if (!drag) return;
    const point = pointFromEvent(svg, event);
    if (drag.mode === 'path') {
      if (c.distance(draft.at(-1), point) > 5) draft.push(point);
      draw();
      return;
    }
    const x = c.clamp(point.x - drag.dx, 16, 484);
    const y = c.clamp(point.y - drag.dy, 16, 454);
    if (x !== drag.element.x || y !== drag.element.y) drag.changed = true;
    drag.element.x = x;
    drag.element.y = y;
    draw();
  };

  const endPointer = event => {
    if (!drag) return;
    const activeDrag = drag;
    if (activeDrag.mode === 'path' && draft.length > 1) addMove(activeDrag.actor, draft);
    else if (activeDrag.changed) commitChange('Element verschoben.');
    draft = null;
    drag = null;
    try { svg.releasePointerCapture(event.pointerId); } catch (_) {}
    refresh();
  };
  svg.onpointerup = endPointer;
  svg.onpointercancel = endPointer;

  qa('[data-tool]').forEach(button => {
    button.onclick = () => {
      tool = button.dataset.tool;
      pending = null;
      qa('[data-tool]').forEach(item => item.classList.toggle('active', item === button));
      q('[data-r="hint"]').textContent = H[tool];
      draw();
    };
  });

  q('[data-a="undo"]').onclick = undo;
  q('[data-a="redo"]').onclick = redo;
  q('[data-a="play"]').onclick = () => {
    if (playing) return stop();
    if (time >= window.BT.tactics.boardDuration(b) - .02) time = 0;
    playing = true;
    raf = requestAnimationFrame(tick);
  };
  q('[data-a="restart"]').onclick = () => {
    stop();
    time = 0;
    b.currentStep = 0;
    refresh();
  };
  q('[data-a="fullscreen"]').onclick = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await q('[data-r="stage"]').requestFullscreen();
  };
  q('[data-r="scrubber"]').oninput = event => {
    stop();
    time = c.number(event.target.value, 0) / 1000;
    b.currentStep = c.locateTime(b, time).index;
    refresh();
  };
  q('[data-r="speed"]').onchange = event => speed = c.number(event.target.value, 1);
  q('[data-r="loop"]').onchange = event => loop = event.target.checked;

  q('[data-a="add-step"]').onclick = () => {
    if (!ok()) return;
    b.steps.splice(b.currentStep + 1, 0, c.cloneStep(step()));
    b.currentStep += 1;
    time = c.stepStartTime(b, b.currentStep);
    commitChange('Schritt hinzugefügt.');
    refresh();
  };
  q('[data-a="delete-step"]').onclick = () => {
    if (!ok() || b.steps.length === 1) return;
    b.steps.splice(b.currentStep, 1);
    b.currentStep = Math.min(b.currentStep, b.steps.length - 1);
    time = c.stepStartTime(b, b.currentStep);
    commitChange('Schritt gelöscht.');
    refresh();
  };

  q('[data-r="title"]').oninput = event => {
    b.title = event.target.value;
    draw();
  };
  q('[data-r="title"]').onchange = () => {
    commitChange('Play-Name geändert.');
    refresh();
  };
  q('[data-r="description"]').onchange = event => {
    b.description = event.target.value;
    commitChange('Coaching Points geändert.');
    refresh();
  };
  q('[data-r="category"]').onchange = event => {
    b.category = event.target.value;
    commitChange('Kategorie geändert.');
    refresh();
  };
  q('[data-r="duration"]').onchange = event => {
    step().duration = c.clamp(c.number(event.target.value, step().duration), .3, 10);
    commitChange('Schrittdauer geändert.');
    refresh();
  };
  q('[data-r="template"]').onchange = event => {
    if (!event.target.value || !ok()) return;
    const template = window.BT.tactics.templates().find(item => item.id === event.target.value);
    if (!template) return;
    b = c.normalizeBoard(template.board);
    time = 0;
    resetTransientState();
    commitChange('Vorlage geladen.');
    refresh();
  };

  q('[data-a="new"]').onclick = () => {
    if (!ok()) return;
    b = c.defaultBoard();
    time = 0;
    resetTransientState();
    commitChange('Neues Play erstellt.');
    refresh();
  };
  q('[data-a="save"]').onclick = () => {
    if (!ok()) return;
    b = c.normalizeBoard(window.BT.storage.upsertTactic(b));
    history.replace(b);
    persist('Play gespeichert und synchronisiert.');
    refresh();
    toast('Play gespeichert.');
  };
  q('[data-a="publish"]').onclick = () => {
    if (!ok()) return;
    b.published = !b.published;
    b.publishedAt = b.published ? new Date().toISOString() : null;
    b = c.normalizeBoard(window.BT.storage.upsertTactic(b));
    history.replace(b);
    persist();
    refresh();
  };
  q('[data-a="delete-play"]').onclick = () => {
    if (!ok() || !b.id) return;
    window.BT.storage.deleteTactic(b.id);
    b = c.defaultBoard();
    history.reset(b);
    time = 0;
    resetTransientState();
    persist('Play gelöscht.');
    refresh();
  };
  q('[data-a="pdf"]').onclick = () => exportPdf(b);
  q('[data-a="gif"]').onclick = () => exportGif(b);
  q('[data-a="ai"]').onclick = async () => {
    try {
      const text = await window.BT.aiimport.explainTactic(b, null, () => {});
      window.BT.storage.upsertNote({ title: 'Play-Erklärung: ' + b.title, body: text });
      toast('Erklärung gespeichert.');
    } catch (error) {
      toast(error.message);
    }
  };

  const onKeyboard = event => {
    if (!root.isConnected) {
      window.removeEventListener('keydown', onKeyboard);
      return;
    }
    const editable = event.target?.matches?.('input, textarea, select, [contenteditable="true"]');
    if (editable) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (key === 'z') {
      event.preventDefault();
      undo();
    } else if (key === 'y') {
      event.preventDefault();
      redo();
    }
  };
  window.addEventListener('keydown', onKeyboard);

  refresh();
  return root;
}
