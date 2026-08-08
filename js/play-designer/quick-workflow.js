import { exportGif, exportPdf } from './exports.js';
import {
  describeRecordedAction,
  normalizeRecordedBoard,
  recordedActions,
  removeRecordedAction
} from './phase-recorder-core.js';
import { createPlayLibrary } from './play-library.js';

const core = window.BT.tactics.__core;
const DRAFT_KEY = 'tacticsBoardDraft';
const HISTORY_LIMIT = 80;

const historyState = {
  installed: false,
  restoring: false,
  originalSetSetting: null,
  entries: [],
  index: -1,
  listeners: new Set()
};

function clone(value) {
  return core.copy(value);
}

function normalized(value) {
  return normalizeRecordedBoard(value, core);
}

function signature(value) {
  try {
    return JSON.stringify(normalized(value));
  } catch (_) {
    return '';
  }
}

function notifyHistory() {
  historyState.listeners.forEach(listener => listener());
}

function recordHistory(value) {
  const board = normalized(value);
  const current = historyState.entries[historyState.index];
  if (current && signature(current) === signature(board)) return;
  historyState.entries = historyState.entries.slice(0, historyState.index + 1);
  historyState.entries.push(clone(board));
  if (historyState.entries.length > HISTORY_LIMIT) historyState.entries.shift();
  historyState.index = historyState.entries.length - 1;
  notifyHistory();
}

function installHistory() {
  if (historyState.installed) return;
  const storage = window.BT.storage;
  historyState.originalSetSetting = storage.setSetting.bind(storage);
  storage.setSetting = (key, value) => {
    const result = historyState.originalSetSetting(key, value);
    if (key === DRAFT_KEY && !historyState.restoring) recordHistory(value);
    return result;
  };
  historyState.installed = true;
  recordHistory(storage.getSetting(DRAFT_KEY, core.defaultBoard()));
}

function currentBoard() {
  return normalized(window.BT.storage.getSetting(DRAFT_KEY, core.defaultBoard()));
}

function saveDraft(board) {
  window.BT.storage.setSetting(DRAFT_KEY, normalized(board));
}

function restoreHistory(index) {
  if (index < 0 || index >= historyState.entries.length || !historyState.originalSetSetting) return false;
  historyState.index = index;
  historyState.restoring = true;
  try {
    historyState.originalSetSetting(DRAFT_KEY, clone(historyState.entries[index]));
  } finally {
    historyState.restoring = false;
  }
  notifyHistory();
  return true;
}

function canUndo() {
  return historyState.index > 0;
}

function canRedo() {
  return historyState.index >= 0 && historyState.index < historyState.entries.length - 1;
}

function toast(message) {
  window.BT.util?.toast?.(message);
}

function injectStyles() {
  if (document.getElementById('courthub-quick-workflow')) return;
  const style = document.createElement('style');
  style.id = 'courthub-quick-workflow';
  style.textContent = `
    .chqw-icon{min-width:2.55rem;padding-inline:.62rem}
    .chqw-more{position:relative}
    .chqw-more>summary{list-style:none;cursor:pointer}.chqw-more>summary::-webkit-details-marker{display:none}
    .chqw-menu{position:absolute;z-index:35;right:0;top:calc(100% + .4rem);display:grid;gap:.35rem;min-width:13rem;padding:.5rem;border:1px solid rgba(20,60,42,.14);border-radius:.8rem;background:var(--surface,#fff);box-shadow:0 1rem 2.5rem rgba(16,38,28,.2)}
    [data-theme="dark"] .chqw-menu{background:#0c1c16;border-color:rgba(255,255,255,.12)}
    .chqw-menu button,.chqw-menu a{width:100%;justify-content:flex-start}
    .chqw-edit-step{margin-left:auto;display:inline-grid;place-items:center;width:2rem;height:2rem;border-radius:.55rem;background:rgba(236,125,29,.11);color:#d76812;font-size:1rem;font-weight:900}
    .chq-flow-item{gap:.45rem}
    .chqw-lock{display:inline-flex;align-items:center;gap:.35rem;margin-left:auto;padding:.28rem .48rem;border-radius:999px;background:rgba(185,28,28,.08);color:#b91c1c;font-size:.66rem;font-weight:800}
    [data-theme="dark"] .chqw-lock{color:#fda4af;background:rgba(244,63,94,.12)}
    .chqw-overlay{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:1rem;background:rgba(2,12,8,.68);backdrop-filter:blur(5px)}
    .chqw-modal{width:min(48rem,100%);max-height:min(88vh,52rem);overflow:auto;border-radius:1rem;background:var(--surface,#fff);color:var(--text,#13221b);border:1px solid rgba(20,60,42,.16);box-shadow:0 2rem 5rem rgba(0,0,0,.35)}
    [data-theme="dark"] .chqw-modal{background:#0c1c16;color:#f5f8f6;border-color:rgba(255,255,255,.12)}
    .chqw-modal-head{position:sticky;z-index:2;top:0;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem 1rem;border-bottom:1px solid rgba(20,60,42,.1);background:inherit}
    [data-theme="dark"] .chqw-modal-head{border-color:rgba(255,255,255,.09)}
    .chqw-modal-head h2{margin:0;font-size:1.15rem}.chqw-modal-body{padding:1rem}
    .chqw-filter{display:grid;grid-template-columns:minmax(0,1fr) 12rem;gap:.55rem;margin-bottom:.8rem}
    .chqw-filter input,.chqw-filter select,.chqw-field input,.chqw-field textarea,.chqw-field select{width:100%;border:1px solid rgba(20,60,42,.17);border-radius:.62rem;padding:.6rem;background:var(--surface,#fff);color:inherit;font:inherit}
    [data-theme="dark"] .chqw-filter input,[data-theme="dark"] .chqw-filter select,[data-theme="dark"] .chqw-field input,[data-theme="dark"] .chqw-field textarea,[data-theme="dark"] .chqw-field select{background:#06120d;border-color:rgba(255,255,255,.12)}
    .chqw-library,.chqw-action-list,.chqw-template-list{display:grid;gap:.5rem}
    .chqw-library-item,.chqw-action-item,.chqw-template-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem;align-items:center;padding:.72rem;border:1px solid rgba(20,60,42,.12);border-radius:.72rem;background:rgba(20,60,42,.025)}
    [data-theme="dark"] .chqw-library-item,[data-theme="dark"] .chqw-action-item,[data-theme="dark"] .chqw-template-item{border-color:rgba(255,255,255,.09);background:rgba(255,255,255,.025)}
    .chqw-library-item strong,.chqw-action-item strong,.chqw-template-item strong{display:block}.chqw-library-item small,.chqw-action-item small,.chqw-template-item small{color:var(--muted,#64756d)}
    .chqw-row{display:flex;gap:.4rem;flex-wrap:wrap}.chqw-section{margin-top:1rem}.chqw-section h3{font-size:.9rem;margin:.2rem 0 .55rem}
    .chqw-action-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem;margin-top:.5rem}
    .chqw-field{display:grid;gap:.25rem}.chqw-field label{font-size:.67rem;font-weight:800;color:var(--muted,#64756d)}
    .chqw-danger{color:#b91c1c;border-color:rgba(185,28,28,.28)!important}
    .chqw-description{grid-column:1/-1}.chqw-description textarea{min-height:4.2rem;resize:vertical}
    @media(max-width:720px){.chqw-filter{grid-template-columns:1fr}.chqw-library-item,.chqw-action-item,.chqw-template-item{grid-template-columns:1fr}.chqw-action-fields{grid-template-columns:1fr 1fr}.chqw-menu{position:fixed;right:.65rem;top:auto;bottom:calc(4.8rem + env(safe-area-inset-bottom));max-width:calc(100vw - 1.3rem)}}
  `;
  document.head.appendChild(style);
}

function createOverlay(title, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'chqw-overlay';
  overlay.innerHTML = `<section class="chqw-modal" role="dialog" aria-modal="true"><header class="chqw-modal-head"><h2></h2><button class="chq-btn icon" type="button" data-close aria-label="Schließen">×</button></header><div class="chqw-modal-body"></div></section>`;
  overlay.querySelector('h2').textContent = title;
  const close = () => {
    overlay.remove();
    onClose?.();
  };
  overlay.querySelector('[data-close]').onclick = close;
  overlay.addEventListener('pointerdown', event => {
    if (event.target === overlay) close();
  });
  document.body.append(overlay);
  return { overlay, body: overlay.querySelector('.chqw-modal-body'), close };
}

function actionEntries(step) {
  return recordedActions(step, core).map(action => ({
    action,
    type: action.type === 'move' ? 'motion' : action.type
  }));
}

function actionLabel(step, entry) {
  return describeRecordedAction(step, entry.action, core);
}

function copyElementPosition(fromStep, toStep, id) {
  const source = core.elementById(fromStep, id);
  const target = core.elementById(toStep, id);
  if (source && target) Object.assign(target, { x: source.x, y: source.y });
}

function removeAction(board, stepIndex, entry, scope = 'single') {
  const step = board.steps[stepIndex];
  const next = board.steps[stepIndex + 1];
  const removeGroup = scope === 'group' && entry.action.groupId;
  const removed = actionEntries(step).filter(candidate => removeGroup
    ? candidate.action.groupId === entry.action.groupId
    : candidate.action.id === entry.action.id);
  if (next) removed.forEach(candidate => {
    if (candidate.type === 'motion') copyElementPosition(step, next, candidate.action.elementId);
    if (candidate.type === 'pass') copyElementPosition(step, next, 'ball');
  });
  return removeRecordedAction(board, stepIndex, entry.action.id, scope, core);
}

function clearStep(board, stepIndex) {
  const step = board.steps[stepIndex];
  const next = board.steps[stepIndex + 1];
  step.transition = core.emptyTransition();
  if (next) {
    core.elements(step).forEach(element => {
      if (['offense', 'defense', 'ball'].includes(element.type)) copyElementPosition(step, next, element.id);
    });
  }
  return normalized(board);
}

function openActionEditor(stepIndex, reload) {
  let board = currentBoard();
  if (!board.steps[stepIndex]) return;
  let dirty = false;
  const modal = createOverlay(`Ablauf ${stepIndex + 1} bearbeiten`, () => {
    if (dirty) reload();
  });

  const render = () => {
    const step = board.steps[stepIndex];
    const entries = actionEntries(step);
    modal.body.innerHTML = `
      <div class="chqw-row">
        <button class="chq-btn" type="button" data-relation="same">Alle gleichzeitig</button>
        <button class="chq-btn" type="button" data-relation="after">Nacheinander</button>
        <button class="chq-btn chqw-danger" type="button" data-clear>Ablauf leeren</button>
      </div>
      <div class="chqw-section chqw-field"><label>Ablaufdauer</label><input type="number" min="0.3" max="10" step="0.1" value="${step.duration.toFixed(1)}" data-step-duration></div>
      <div class="chqw-section"><h3>Aktionen</h3><div class="chqw-action-list"></div></div>`;

    const list = modal.body.querySelector('.chqw-action-list');
    if (!entries.length) list.innerHTML = '<p class="chq-help">Dieser Ablauf enthält aktuell keine Aktion.</p>';
    entries.forEach(entry => {
      const item = document.createElement('article');
      item.className = 'chqw-action-item';
      item.innerHTML = `<div><strong></strong><small>${entry.type === 'motion' ? 'Bewegung' : entry.type === 'pass' ? 'Pass' : 'Screen'}</small><div class="chqw-action-fields"><div class="chqw-field"><label>Start</label><input type="number" min="0" max="10" step="0.1" data-value="start"></div><div class="chqw-field"><label>Dauer</label><input type="number" min="0.12" max="10" step="0.1" data-value="duration"></div>${entry.type === 'screen' ? '<div class="chqw-field"><label>Winkel</label><input type="number" min="-180" max="180" step="5" data-value="angle"></div>' : ''}</div></div><button class="chq-btn chqw-danger" type="button" data-delete>Aktion löschen</button>`;
      item.querySelector('strong').textContent = actionLabel(step, entry);
      item.querySelector('[data-value="start"]').value = Number(entry.action.start || 0).toFixed(1);
      item.querySelector('[data-value="duration"]').value = Number(entry.action.duration || .4).toFixed(1);
      const angle = item.querySelector('[data-value="angle"]');
      if (angle) angle.value = String(Math.round(entry.action.angle || 0));
      item.querySelectorAll('[data-value]').forEach(input => {
        input.onchange = () => {
          const key = input.dataset.value;
          const minimum = key === 'duration' ? .12 : key === 'angle' ? -180 : 0;
          const maximum = key === 'angle' ? 180 : 10;
          entry.action[key] = core.clamp(core.number(input.value, entry.action[key]), minimum, maximum);
          step.duration = Math.max(step.duration, entry.action.start + entry.action.duration + .1);
          saveDraft(board);
          dirty = true;
          render();
        };
      });
      item.querySelector('[data-delete]').onclick = () => {
        const scope = entry.action.groupId
          ? (window.confirm('Gesamtes Pick & Roll löschen?\n\nOK: komplette Aktion löschen\nAbbrechen: nur diese Teilaktion löschen') ? 'group' : 'single')
          : 'single';
        board = removeAction(board, stepIndex, entry, scope);
        saveDraft(board);
        dirty = true;
        render();
      };
      list.append(item);
    });

    modal.body.querySelector('[data-step-duration]').onchange = event => {
      step.duration = core.clamp(core.number(event.target.value, step.duration), .3, 10);
      saveDraft(board);
      dirty = true;
      render();
    };
    modal.body.querySelector('[data-relation="same"]').onclick = () => {
      actionEntries(step).forEach(entry => { entry.action.start = 0; });
      const maxDuration = actionEntries(step).reduce((maximum, entry) => Math.max(maximum, entry.action.duration), .3);
      step.duration = core.clamp(maxDuration + .15, .3, 10);
      saveDraft(board);
      dirty = true;
      render();
    };
    modal.body.querySelector('[data-relation="after"]').onclick = () => {
      let cursor = 0;
      actionEntries(step).forEach(entry => {
        entry.action.start = cursor;
        cursor += entry.action.duration + .08;
      });
      step.duration = core.clamp(cursor + .07, .3, 10);
      saveDraft(board);
      dirty = true;
      render();
    };
    modal.body.querySelector('[data-clear]').onclick = () => {
      if (!window.confirm(`Ablauf ${stepIndex + 1} wirklich vollständig leeren?`)) return;
      board = clearStep(board, stepIndex);
      saveDraft(board);
      dirty = true;
      render();
    };
  };

  render();
}

function openPlaybook(reload) {
  return openPlaybookV2(reload);
  /* Legacy library stays below as a compatibility reference. */
  const modal = createOverlay('Playbook');
  modal.body.innerHTML = `
    <div class="chqw-filter"><input type="search" placeholder="Play suchen …" data-search><select data-category><option value="">Alle Kategorien</option></select></div>
    <div class="chqw-library" data-library></div>
    <section class="chqw-section"><h3>Vorlagen</h3><div class="chqw-template-list" data-templates></div></section>`;
  const search = modal.body.querySelector('[data-search]');
  const category = modal.body.querySelector('[data-category]');
  const items = window.BT.storage.getTactics().map(normalized);
  [...new Set(items.map(item => item.category).filter(Boolean))].sort().forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    category.append(option);
  });

  const openBoard = board => {
    saveDraft(board);
    modal.close();
    reload();
  };

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const box = modal.body.querySelector('[data-library]');
    box.replaceChildren();
    items.filter(item => {
      const matchesQuery = !query || `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query);
      return matchesQuery && (!selectedCategory || item.category === selectedCategory);
    }).forEach(item => {
      const row = document.createElement('article');
      row.className = 'chqw-library-item';
      row.innerHTML = `<div><strong></strong><small></small></div><div class="chqw-row"><button class="chq-btn primary" type="button" data-open>Öffnen</button><button class="chq-btn" type="button" data-copy>Duplizieren</button></div>`;
      row.querySelector('strong').textContent = item.title;
      row.querySelector('small').textContent = `${item.category} · ${item.steps.length} Schritte${item.published ? ' · veröffentlicht' : ''}`;
      row.querySelector('[data-open]').onclick = () => openBoard(item);
      row.querySelector('[data-copy]').onclick = () => {
        const duplicate = clone(item);
        delete duplicate.id;
        duplicate.title = `${item.title} – Kopie`;
        duplicate.published = false;
        duplicate.publishedAt = null;
        duplicate.createdAt = null;
        duplicate.updatedAt = null;
        openBoard(duplicate);
      };
      box.append(row);
    });
    if (!box.children.length) box.innerHTML = '<p class="chq-help">Keine passenden Plays gefunden.</p>';
  };

  const templates = modal.body.querySelector('[data-templates]');
  window.BT.tactics.templates().forEach(template => {
    const row = document.createElement('article');
    row.className = 'chqw-template-item';
    row.innerHTML = `<div><strong></strong><small></small></div><button class="chq-btn" type="button">Vorlage laden</button>`;
    row.querySelector('strong').textContent = template.title;
    row.querySelector('small').textContent = template.description;
    row.querySelector('button').onclick = () => openBoard(template.board);
    templates.append(row);
  });

  search.oninput = render;
  category.onchange = render;
  render();
}

function openPlaybookV2(reload) {
  const modal = createOverlay('Taktikbibliothek');
  let items = window.BT.storage.getTactics().map(normalized);
  let collections = window.BT.storage.getSetting('tacticsPlaybooksV1', []);
  if (!Array.isArray(collections)) collections = [];

  const saveCollections = () => {
    collections = collections.map(collection => ({
      id: String(collection.id || core.uid('playbook_')),
      title: String(collection.title || 'Playbook').slice(0, 80),
      playIds: [...new Set((collection.playIds || []).map(String))]
    }));
    window.BT.storage.setSetting('tacticsPlaybooksV1', collections);
  };

  const openBoard = board => {
    saveDraft(board);
    modal.close();
    reload();
  };

  const render = () => {
    modal.body.replaceChildren();
    const library = createPlayLibrary({
      plays: items,
      collections,
      onOpen: openBoard,
      onDuplicate: item => {
        const duplicate = clone(item);
        delete duplicate.id;
        duplicate.title = `${item.title} – Kopie`;
        duplicate.published = false;
        duplicate.publishedAt = null;
        duplicate.archived = false;
        duplicate.createdAt = null;
        duplicate.updatedAt = null;
        openBoard(duplicate);
      },
      onArchive: item => {
        item.archived = !item.archived;
        window.BT.storage.upsertTactic(item);
        items = window.BT.storage.getTactics().map(normalized);
        render();
      },
      onPublish: item => {
        item.published = !item.published;
        item.publishedAt = item.published ? new Date().toISOString() : null;
        window.BT.storage.upsertTactic(item);
        items = window.BT.storage.getTactics().map(normalized);
        render();
      },
      onAddToCollection: (item, collectionId) => {
        const collection = collections.find(candidate => candidate.id === collectionId);
        if (!collection || !item.id) return;
        collection.playIds = [...new Set([...(collection.playIds || []), String(item.id)])];
        saveCollections();
        toast(`„${item.title}“ wurde zum Playbook „${collection.title}“ hinzugefügt.`);
        render();
      },
      onCreateCollection: title => {
        collections.push({ id: core.uid('playbook_'), title, playIds: [] });
        saveCollections();
        render();
      }
    });
    modal.body.append(library);

    const templates = document.createElement('section');
    templates.className = 'chqw-section';
    templates.innerHTML = '<h3>CourtHub Vorlagen</h3><div class="chqw-template-list" data-templates></div>';
    window.BT.tactics.templates().forEach(template => {
      const row = document.createElement('article');
      row.className = 'chqw-template-item';
      row.innerHTML = '<div><strong></strong><small></small></div><button class="chq-btn" type="button">Vorlage laden</button>';
      row.querySelector('strong').textContent = template.title;
      row.querySelector('small').textContent = template.description;
      row.querySelector('button').onclick = () => openBoard(template.board);
      templates.querySelector('[data-templates]').append(row);
    });
    modal.body.append(templates);
  };

  render();
  return modal;
}

function duplicateCurrent(reload) {
  const duplicate = currentBoard();
  delete duplicate.id;
  duplicate.title = `${duplicate.title} – Kopie`;
  duplicate.published = false;
  duplicate.publishedAt = null;
  duplicate.createdAt = null;
  duplicate.updatedAt = null;
  saveDraft(duplicate);
  reload();
  toast('Play-Kopie als neuer Entwurf geöffnet.');
}

function togglePublish(reload) {
  let board = currentBoard();
  board.published = !board.published;
  board.publishedAt = board.published ? new Date().toISOString() : null;
  board = normalized(window.BT.storage.upsertTactic(board));
  saveDraft(board);
  reload();
  toast(board.published ? 'Play veröffentlicht.' : 'Veröffentlichung zurückgezogen.');
}

function activeStepIndex(root) {
  const rows = [...root.querySelectorAll('.chq-flow-item')];
  const active = rows.findIndex(row => row.classList.contains('active'));
  if (active >= 0) return active;
  const label = root.querySelector('[data-role="stage-step"]')?.textContent || '';
  const number = Number(label.match(/\d+/)?.[0]);
  return Number.isFinite(number) && number > 0 ? number - 1 : 0;
}

function decorateFlow(root) {
  root.querySelectorAll('.chq-flow-item').forEach((button, index) => {
    button.dataset.quickStepIndex = String(index);
    if (button.querySelector('[data-phase-menu]')) return;
    if (button.querySelector('[data-quick-edit-step]')) return;
    const edit = document.createElement('span');
    edit.className = 'chqw-edit-step';
    edit.dataset.quickEditStep = String(index);
    edit.title = 'Aktionen bearbeiten oder löschen';
    edit.setAttribute('role', 'button');
    edit.setAttribute('aria-label', `Ablauf ${index + 1} bearbeiten`);
    edit.textContent = '•••';
    button.append(edit);
  });

  const stageCopy = root.querySelector('.chq-stage-copy');
  if (!stageCopy) return;
  let lock = stageCopy.querySelector('.chqw-lock');
  const board = currentBoard();
  const index = activeStepIndex(root);
  const locked = index > 0 || actionEntries(board.steps[index]).length > 0;
  if (locked && !lock) {
    lock = document.createElement('span');
    lock.className = 'chqw-lock';
    lock.textContent = 'Positionen geschützt';
    stageCopy.append(lock);
  } else if (!locked && lock) {
    lock.remove();
  }
}

export function enhanceQuickEditor(root, target, options = {}) {
  if (!root?.querySelector?.('.chq-actions')) return root;
  installHistory();
  injectStyles();
  const reload = () => options.reload?.();
  const actions = root.querySelector('.chq-actions');

  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'chq-btn chqw-icon';
  undo.dataset.quickUndo = 'true';
  undo.title = 'Rückgängig · Strg/Cmd + Z';
  undo.textContent = '↶';

  const redo = document.createElement('button');
  redo.type = 'button';
  redo.className = 'chq-btn chqw-icon';
  redo.dataset.quickRedo = 'true';
  redo.title = 'Wiederholen · Strg/Cmd + Umschalt + Z';
  redo.textContent = '↷';

  const playbook = document.createElement('button');
  playbook.type = 'button';
  playbook.className = 'chq-btn';
  playbook.textContent = 'Playbook';
  playbook.onclick = () => openPlaybook(reload);
  const backToLibrary = root.querySelector('[data-action="back-library"]');
  if (backToLibrary) backToLibrary.onclick = () => openPlaybook(reload);

  const more = document.createElement('details');
  more.className = 'chqw-more';
  more.innerHTML = `<summary class="chq-btn">Mehr</summary><div class="chqw-menu"><button class="chq-btn" type="button" data-more="pdf">PDF exportieren</button><button class="chq-btn" type="button" data-more="gif">GIF exportieren</button><button class="chq-btn" type="button" data-more="publish">Veröffentlichen</button><button class="chq-btn" type="button" data-more="duplicate">Duplizieren</button><a class="chq-btn" href="#/tactics/player">Spieleransicht</a></div>`;

  actions.prepend(undo, redo, playbook, more);

  const fields = root.querySelector('.chq-fields');
  if (fields && !fields.querySelector('[data-role="quick-description"]')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chq-field chqw-description';
    wrapper.innerHTML = '<label>Coaching Points</label><textarea maxlength="400" data-role="quick-description" placeholder="Ziel, Reads und wichtigste Coaching-Hinweise"></textarea>';
    const textarea = wrapper.querySelector('textarea');
    textarea.value = currentBoard().description || '';
    textarea.onchange = () => {
      const board = currentBoard();
      board.description = textarea.value.slice(0, 400);
      saveDraft(board);
      reload();
    };
    fields.append(wrapper);
  }

  const updateHistoryButtons = () => {
    undo.disabled = !canUndo();
    redo.disabled = !canRedo();
  };
  historyState.listeners.add(updateHistoryButtons);
  updateHistoryButtons();

  undo.onclick = () => {
    if (!canUndo()) return;
    restoreHistory(historyState.index - 1);
    reload();
    toast('Letzten Vorgang rückgängig gemacht.');
  };
  redo.onclick = () => {
    if (!canRedo()) return;
    restoreHistory(historyState.index + 1);
    reload();
    toast('Vorgang wiederhergestellt.');
  };

  more.querySelector('[data-more="pdf"]').onclick = () => { more.open = false; exportPdf(currentBoard()); };
  more.querySelector('[data-more="gif"]').onclick = () => { more.open = false; exportGif(currentBoard()); };
  more.querySelector('[data-more="publish"]').onclick = () => { more.open = false; togglePublish(reload); };
  more.querySelector('[data-more="duplicate"]').onclick = () => { more.open = false; duplicateCurrent(reload); };

  root.addEventListener('click', event => {
    const trigger = event.target.closest('[data-quick-edit-step]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openActionEditor(Number(trigger.dataset.quickEditStep), reload);
  }, true);
  root.addEventListener('courthub:edit-phase', event => {
    openActionEditor(Number(event.detail?.index || 0), reload);
  });

  const svg = root.querySelector('.chq-court-wrap svg');
  svg?.addEventListener('pointerdown', event => {
    const tool = root.querySelector('[data-tool].active')?.dataset.tool;
    if (tool !== 'select') return;
    const board = currentBoard();
    const index = activeStepIndex(root);
    const locked = index > 0 || actionEntries(board.steps[index]).length > 0;
    if (!locked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('Direktes Verschieben ist nur in der Grundaufstellung möglich. Nutze für spätere Positionen einen Laufweg oder öffne den Profi-Modus.');
  }, true);

  const flow = root.querySelector('[data-role="flow"]');
  const observer = new MutationObserver(() => decorateFlow(root));
  if (flow) observer.observe(flow, { childList: true, subtree: true });
  decorateFlow(root);

  const onKeyboard = event => {
    if (!root.isConnected) {
      window.removeEventListener('keydown', onKeyboard);
      historyState.listeners.delete(updateHistoryButtons);
      observer.disconnect();
      return;
    }
    if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && event.shiftKey && canRedo()) {
      event.preventDefault();
      restoreHistory(historyState.index + 1);
      reload();
    } else if (key === 'z' && canUndo()) {
      event.preventDefault();
      restoreHistory(historyState.index - 1);
      reload();
    } else if (key === 'y' && canRedo()) {
      event.preventDefault();
      restoreHistory(historyState.index + 1);
      reload();
    }
  };
  window.addEventListener('keydown', onKeyboard);

  return root;
}
