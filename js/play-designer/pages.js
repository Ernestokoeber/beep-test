import { mountEditor, mountVideoImport } from './main.js';
import { resetEditorHistory } from './quick-workflow.js';
import { filterAndSortPlays, PLAY_FILTERS } from './play-library.js';
import { createCourt, drawCourt } from './rendering.js';
import { mountStage } from './viewer.js';
import { injectStyles } from './styles.js';
import { openExportDialog } from './export-dialog.js';
import { beginDraftSession } from './draft-session.js';

const core = window.BT.tactics.__core;
const draftKey = 'tacticsBoardDraft';
const route = (id, page = '') => '#/tactics/' + encodeURIComponent(id) + (page ? '/' + page : '');
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const link = (text, href, primary = false) => { const a = el('a', 'tk-button' + (primary ? ' primary' : ''), text); a.href = href; return a; };
const button = (text, action) => { const b = el('button', 'tk-button', text); b.type = 'button'; b.onclick = action; return b; };

function identity() {
  const user = core.currentUser();
  return JSON.stringify([user?.id || 'guest', user?.organization?.id || user?.organizationId || user?.teamId || '', user?.role || '']);
}
function draftStore() {
  const key = 'courthub_tactics_drafts:' + identity();
  let data;
  try { data = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { data = {}; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
  return {
    get: id => data[id] ? core.copy(data[id]) : null,
    set(id, value) {
      if (value) data[id] = core.copy(value); else delete data[id];
      try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { window.BT.util?.toast?.('Entwurf konnte nicht dauerhaft gesichert werden. Bitte die Taktik speichern.'); }
    }
  };
}
function plays() {
  const all = new Map(window.BT.tactics.templates().map(template => [String(template.board.id || template.id), { ...template.board, id: template.board.id || template.id, builtIn: true }]));
  window.BT.tactics.availableTactics().filter(board => board.id).forEach(board => all.set(String(board.id), board));
  return [...all.values()];
}
function heading(root, kicker, title, description) {
  const header = el('header', 'tk-header');
  header.append(el('span', 'tk-kicker', kicker), el('h2', '', title));
  if (description) header.append(el('p', 'tk-intro', description));
  root.append(header); return header;
}
function missing(root) {
  root.dataset.tacticsPage = 'missing';
  heading(root, 'Taktikbibliothek', 'Taktik nicht verfügbar', 'Dieser Spielzug wurde entfernt oder ist für dein Konto nicht freigegeben.');
  root.append(link('Zur Taktikbibliothek', '#/tactics', true));
}
function copyBoard(board) {
  const copy = core.copy(board);
  delete copy.id;
  Object.assign(copy, { title: board.title + ' – Kopie', builtIn: false, published: false, publishedAt: null, archived: false, createdAt: null, updatedAt: null });
  return copy;
}

export function openDraft(input) {
  if (!core.canEdit()) return;
  const board = core.normalizeBoard(input); delete board.id;
  Object.assign(board, { builtIn: false, published: false, publishedAt: null });
  draftStore().set('new', board);
  location.hash = '#/tactics/new';
}

export function renderPage(root, hash) {
  root.replaceChildren();
  const user = core.currentUser(), editable = core.canEdit(), drafts = draftStore();
  let disposed = false, teardown = () => {};
  const dispose = () => { if (disposed) return; teardown(); disposed = true; };
  if (!user) {
    root.dataset.tacticsPage = 'login';
    heading(root, 'Dein Playbook', 'Taktiken fürs Team', 'Melde dich an, um deine Spielzüge zu öffnen.');
    root.append(link('Anmelden', '#/account', true)); return dispose;
  }
  let parts;
  try { parts = hash.slice('#/tactics'.length).split('/').filter(Boolean).map(decodeURIComponent); }
  catch { missing(root); return dispose; }
  const [id, page = 'overview'] = parts;
  const publishedOnly = id === 'player' || !editable;
  const boards = plays().filter(board => !publishedOnly || board.published === true);
  const scope = identity();
  const allowed = () => !disposed && scope === identity() && core.canEdit();
  const saveDraft = (key, board) => { if (allowed()) drafts.set(key, board); };
  const startCopy = board => { saveDraft('new', copyBoard(board)); location.hash = '#/tactics/new'; };

  if (!id || id === 'player') {
    root.dataset.tacticsPage = 'list';
    heading(root, publishedOnly ? 'Für dein Team' : 'Dein Playbook', publishedOnly ? 'Teamtaktiken' : 'Taktikbibliothek', 'Spielzug antippen. Gemeinsam verstehen. Auf dem Feld umsetzen.');
    const actions = el('div', 'tk-actions');
    if (editable) actions.append(link(drafts.get('new') ? 'Entwurf fortsetzen' : '+ Neue Taktik', '#/tactics/new', true));
    actions.append(link('Screen-Akademie', '#/tactics/screens'));
    if (editable) actions.append(link('Video → Taktik', '#/tactics/import'));
    root.append(actions);
    // An existing editor draft remains reachable during the migration to routed pages.
    const legacy = window.BT.storage.getSetting(draftKey, null);
    const owner = window.BT.storage.getSetting('tacticsDraftOwner', null);
    if (editable && legacy && (!owner || owner === scope)) {
      const resume = button('Letzten Board-Entwurf öffnen', () => {
        const key = legacy.id && boards.some(b => b.id === legacy.id) ? String(legacy.id) : 'new';
        saveDraft(key, legacy); location.hash = key === 'new' ? '#/tactics/new' : route(key, 'edit');
      }); resume.classList.add('tk-text-button'); root.append(resume);
    }
    const state = { query: '', filter: '', sort: 'updated', showArchived: false, ...window.BT.navigation?.getState?.().library };
    const toolbar = el('div', 'tk-library-controls');
    const searchLabel = el('label', '', 'Spielzug suchen');
    const search = el('input'); search.type = 'search'; search.placeholder = 'Name, Ziel oder Coaching Point'; search.dataset.tacticsSearch = ''; search.value = state.query; searchLabel.append(search);
    const sortLabel = el('label', '', 'Sortierung'); const sort = el('select');
    for (const [value, text] of [['updated','Zuletzt bearbeitet'],['title','Name A–Z'],['category','Kategorie']]) { const o = el('option', '', text); o.value = value; sort.append(o); }
    sort.value = state.sort; sortLabel.append(sort); toolbar.append(searchLabel, sortLabel); root.append(toolbar);
    const filters = el('div', 'tk-filters'); filters.setAttribute('aria-label', 'Taktiken filtern');
    for (const [value, text] of [['','Alle Spielzüge'], ...PLAY_FILTERS]) {
      const b = button(text, () => { state.filter = value; render(); }); b.dataset.filter = value; filters.append(b);
    }
    root.append(filters);
    const count = el('p', 'tk-count'); count.setAttribute('role', 'status'); const grid = el('div', 'tk-grid'); root.append(count, grid);
    function render() {
      window.BT.navigation?.setState?.({ library: state }); grid.replaceChildren();
      const visible = filterAndSortPlays(boards, state); count.textContent = visible.length + (visible.length === 1 ? ' Spielzug' : ' Spielzüge');
      filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
      for (const board of visible) {
        const a = el('a', 'tk-card'); a.href = route(board.id); a.dataset.tacticLink = '';
        const badge = el('span', 'tk-card-mark', board.usage === 'defense' || board.category === 'Defense' ? '×' : '↗'); badge.setAttribute('aria-hidden', 'true');
        const copy = el('div', 'tk-card-copy'); copy.append(el('span', 'tk-kicker', board.category), el('h3', '', board.title), el('p', '', board.description || 'Aufstellung und Ablauf öffnen'));
        const meta = el('span', 'tk-meta', board.steps.length + ' Phasen · ' + (board.archived ? 'Archiviert' : board.published ? 'Fürs Team freigegeben' : board.builtIn ? 'Vorlage' : 'Eigene Taktik'));
        copy.append(meta); a.append(badge, copy, el('span', 'tk-card-chevron', '›')); grid.append(a);
      }
      if (!visible.length) { const empty = el('div', 'tk-empty'); empty.append(el('h3', '', 'Kein passender Spielzug'), el('p', '', 'Ändere deine Suche oder wähle einen anderen Filter.')); grid.append(empty); }
    }
    search.oninput = () => { state.query = search.value; render(); }; sort.onchange = () => { state.sort = sort.value; render(); };
    if (editable) {
      const archive = el('label', 'tk-check'); const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = state.showArchived; checkbox.onchange = () => { state.showArchived = checkbox.checked; render(); }; archive.append(checkbox, 'Archivierte Taktiken anzeigen'); root.append(archive);
      const collections = el('details', 'tk-panel'); collections.append(el('summary', '', 'Playbook-Sammlungen')); root.append(collections);
      const list = el('div', 'tk-collection-list'); collections.append(list);
      const collectionData = window.BT.storage.getSetting('tacticsPlaybooksV1', []);
      for (const collection of Array.isArray(collectionData) ? collectionData : []) {
        const section = el('section'); section.append(el('h3', '', collection.title));
        boards.filter(board => collection.playIds?.includes(board.id)).forEach(board => section.append(link(board.title, route(board.id)))); list.append(section);
      }
      const form = el('form', 'tk-inline-form'); const nameLabel = el('label', '', 'Neue Sammlung'); const name = el('input'); name.required = true; name.maxLength = 80; nameLabel.append(name); const submit = el('button', 'tk-button', 'Anlegen'); submit.type = 'submit'; form.append(nameLabel, submit); collections.append(form);
      form.onsubmit = event => { event.preventDefault(); if (!allowed() || !name.value.trim()) return; const current = window.BT.storage.getSetting('tacticsPlaybooksV1', []); window.BT.storage.setSetting('tacticsPlaybooksV1', [...(Array.isArray(current) ? current : []), { id: core.uid('playbook_'), title: name.value.trim(), playIds: [] }]); const section = el('section'); section.append(el('h3', '', name.value.trim())); list.append(section); name.value = ''; };
    }
    render(); return dispose;
  }

  if (id === 'import' && editable) {
    root.dataset.tacticsPage = 'import';
    heading(root, 'Taktikbibliothek', 'Video in einen Spielzug verwandeln');
    const host = el('div'); root.append(host);
    mountVideoImport(host, { isCurrent: () => !disposed && root.isConnected }).catch(() => { if (!disposed) host.textContent = 'Videoimport konnte nicht geladen werden. Bitte erneut öffnen.'; });
    teardown = () => window.BT.videoImport?.cleanup?.(); return dispose;
  }
  const saved = boards.find(board => String(board.id) === id);
  const isNew = id === 'new' || id === 'draft';
  if ((!saved && !isNew) || (isNew && !editable) || parts.length > 2 || !['overview','edit','play'].includes(page)) { missing(root); return dispose; }
  const draftId = isNew ? 'new' : id;
  let board = editable ? drafts.get(draftId) || saved : saved;
  if (!board && isNew) board = id === 'draft' ? window.BT.storage.getSetting(draftKey, null) : null;
  board = core.normalizeBoard(board || core.defaultBoard());
  if (!isNew) board.id = saved.id;

  if ((isNew && page !== 'play') || page === 'edit') {
    if (!editable) { missing(root); return dispose; }
    root.dataset.tacticsPage = 'edit';
    heading(root, 'Taktikboard', isNew ? 'Neue Taktik' : 'Taktik bearbeiten', 'Werkzeug wählen, Spieler antippen und die Aktion auf dem Feld zeichnen.');
    const host = el('div', 'tk-editor'); root.append(host);
    const endDraftSession = beginDraftSession(window.BT.storage, board);
    window.BT.storage.setSetting(draftKey, board); window.BT.storage.setSetting('tacticsDraftOwner', scope); resetEditorHistory();
    let editor, deleted = false;
    const snapshot = () => { if (!deleted && allowed()) saveDraft(draftId, window.BT.storage.getSetting(draftKey, board)); };
    const showPreview = input => {
      snapshot();
      location.hash = route(input.id || 'new', 'play');
    };
    mountEditor(host, {
      onPersist: input => { board = input; saveDraft(draftId, input); },
      onLibrary: () => { snapshot(); window.BT.navigation.back(); },
      onPreview: showPreview,
      onSaved: input => {
        saveDraft(String(input.id), input);
        if (isNew) { drafts.set('new', null); deleted = true; window.BT.navigation.replace(route(input.id)); }
      },
      onNew: () => {
        if (drafts.get('new') && !window.confirm('Den bisherigen neuen Entwurf verwerfen und mit einer leeren Taktik beginnen?')) return;
        const fresh = core.defaultBoard(); saveDraft('new', fresh);
        if (isNew) {
          editor.querySelector('.chq-header-more').open = false;
          editor.dispatchEvent(new CustomEvent('courthub:replace-board', { detail: { board: fresh } }));
          resetEditorHistory(); editor.querySelector('[data-role="title"]').focus();
        } else { snapshot(); location.hash = '#/tactics/new'; }
      },
      onDeleted: () => { drafts.set(draftId, null); deleted = true; window.BT.navigation.replace('#/tactics'); },
      onReload: () => {
        const next = window.BT.storage.getSetting(draftKey, board);
        if ((next.id || '') !== (board.id || '')) {
          const key = next.id ? String(next.id) : 'new';
          saveDraft(key, next); deleted = true;
          location.hash = key === 'new' ? '#/tactics/new' : route(key, 'edit'); return false;
        }
      },
      onMount: view => {
        editor = view;
        const actions = view.querySelector('.chq-actions'), save = view.querySelector('[data-action="save"]');
        save.textContent = 'Speichern'; save.className = 'chq-top-action tk-save'; actions.prepend(save);
        const back = view.querySelector('[data-action="back-library"]'); back.hidden = true;
        const preview = view.querySelector('[data-action="preview"]'); preview.onclick = () => showPreview(window.BT.storage.getSetting(draftKey, board));
        view.querySelector('[data-action="open-3d"]').onclick = () => showPreview(window.BT.storage.getSetting(draftKey, board));
        view.querySelector('[data-action="open-animation"] span').textContent = 'Abspielen';
        const panel = view.querySelector('[data-role="right-panel"]'); panel.classList.remove('is-collapsed');
        const toggle = view.querySelector('[data-action="toggle-inspector"]'); toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-label', 'Phasendetails einklappen');
        view.querySelectorAll('[data-tab]').forEach(tab => { tab.textContent = tab.dataset.tab === 'timeline' ? 'Ablauf' : 'Anweisungen'; tab.setAttribute('aria-label', tab.textContent); });
      }
    });
    const beforeUnload = () => snapshot(); window.addEventListener('pagehide', beforeUnload);
    teardown = () => { snapshot(); editor?.dispose?.(); endDraftSession(); window.removeEventListener('pagehide', beforeUnload); };
    return dispose;
  }

  root.dataset.tacticsPage = page;
  heading(root, page === 'play' ? 'Taktik abspielen' : board.category, board.title, board.description);
  const actions = el('div', 'tk-actions');
  if (page === 'overview') actions.append(link('▶ Abspielen', route(id, 'play'), true));
  if (editable) actions.append(link('Taktik bearbeiten', route(id, 'edit'), page === 'play'));
  actions.append(button('Exportieren', () => openExportDialog(board))); root.append(actions);
  if (page === 'play') {
    injectStyles(); const stage = el('div', 'chpd tk-player'); root.append(stage); const controller = mountStage(stage, board);
    for (const [selector, label] of [['[data-action="play"]','Abspielen oder pausieren'],['[data-action="restart"]','Von vorn abspielen'],['[data-action="fullscreen"]','Spielfeld im Vollbild'],['[data-role="scrubber"]','Position im Spielzug'],['[data-role="speed"]','Wiedergabegeschwindigkeit']]) stage.querySelector(selector).setAttribute('aria-label', label);
    teardown = () => controller.destroy(); return dispose;
  }
  const status = el('p', 'tk-meta', board.steps.length + ' Phasen · ' + (board.published ? 'Fürs Team freigegeben' : 'Nur im Trainerbereich'));
  root.append(status);
  const layout = el('div', 'tk-detail-grid'), court = el('section', 'tk-board'), phases = el('section', 'tk-panel tk-phases'); layout.append(court, phases); root.append(layout);
  const svg = createCourt('tk-court'); svg.setAttribute('aria-label', 'Aufstellung der ausgewählten Phase'); court.append(svg);
  phases.append(el('h3', '', 'Der Ablauf')); const steps = el('div', 'tk-step-list'); phases.append(steps);
  const instruction = el('p', 'tk-instruction'); court.append(instruction);
  const showStep = index => { drawCourt(svg, board.steps[index], { sourceStep: board.steps[index], showGuides: true }); instruction.textContent = board.steps[index].instruction || board.steps[index].name || 'Spieler und Ball wie auf dem Feld positionieren.'; steps.querySelectorAll('button').forEach((b,i) => b.setAttribute('aria-pressed', String(i === index))); };
  board.steps.forEach((step, index) => { const b = button('', () => showStep(index)); b.append(el('span', 'tk-step-number', String(index + 1)), el('span', '', step.name || step.title || 'Phase ' + (index + 1))); steps.append(b); }); showStep(0);
  for (const [label, items] of [['Coaching Points', board.coachingPoints],['Entscheidungen & Reads', board.reads]]) if (items?.length) { const section = el('section', 'tk-panel'); section.append(el('h3', '', label)); const ul = el('ul'); items.forEach(text => ul.append(el('li', '', text))); section.append(ul); root.append(section); }
  if (editable) {
    const manage = el('details', 'tk-panel'); manage.append(el('summary', '', 'Spielzug verwalten')); const controls = el('div', 'tk-actions'); manage.append(controls); root.append(manage);
    controls.append(button('Als neue Taktik kopieren', () => startCopy(board)));
    const publish = button(board.published ? 'Teamfreigabe zurücknehmen' : 'Fürs Team freigeben', () => {
      if (!allowed()) return; board.published = !board.published; board.publishedAt = board.published ? new Date().toISOString() : null;
      board = window.BT.storage.upsertTactic(board); saveDraft(id, board); publish.textContent = board.published ? 'Teamfreigabe zurücknehmen' : 'Fürs Team freigeben'; status.textContent = board.published ? 'Fürs Team freigegeben' : 'Nur im Trainerbereich';
    }); controls.append(publish);
    const archive = button(board.archived ? 'Aus Archiv holen' : 'Archivieren', () => { if (!allowed()) return; board.archived = !board.archived; board = window.BT.storage.upsertTactic(board); saveDraft(id, board); archive.textContent = board.archived ? 'Aus Archiv holen' : 'Archivieren'; }); controls.append(archive);
    const collections = window.BT.storage.getSetting('tacticsPlaybooksV1', []);
    if (Array.isArray(collections) && collections.length) {
      const label = el('label', 'tk-collection-field', 'Zu einer Sammlung hinzufügen'); const select = el('select'); const empty = el('option', '', 'Sammlung wählen'); empty.value = ''; select.append(empty);
      collections.forEach(collection => { const o = el('option', '', collection.title); o.value = collection.id; select.append(o); }); label.append(select); manage.append(label);
      select.onchange = () => { if (!allowed()) return; const collection = collections.find(c => c.id === select.value); if (!collection) return; collection.playIds = [...new Set([...(collection.playIds || []), board.id])]; window.BT.storage.setSetting('tacticsPlaybooksV1', collections); window.BT.util?.toast?.('Zur Sammlung hinzugefügt.'); };
    }
    if (board.reference?.url?.startsWith('assets/playbooks/')) { const a = link('Originalvorlage öffnen', board.reference.url); a.target = '_blank'; a.rel = 'noopener'; controls.append(a); }
  }
  return dispose;
}
