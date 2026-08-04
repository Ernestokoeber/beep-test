const core = window.BT.tactics.__core;
const TRASH_KEY = 'tacticsTrash';
const DRAFT_KEY = 'tacticsBoardDraft';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 30;
let installed = false;
let originalDeleteTactic = null;

function toast(message) {
  window.BT.util?.toast?.(message);
}

function readTrash() {
  const now = Date.now();
  const raw = window.BT.storage.getSetting(TRASH_KEY, []);
  const items = Array.isArray(raw) ? raw : [];
  return items
    .filter(item => item?.board && now - new Date(item.deletedAt || 0).getTime() <= RETENTION_MS)
    .slice(0, MAX_ITEMS);
}

function writeTrash(items) {
  window.BT.storage.setSetting(TRASH_KEY, items.slice(0, MAX_ITEMS));
}

function archive(board) {
  if (!board?.id) return;
  const items = readTrash().filter(item => item.board?.id !== board.id);
  items.unshift({
    id: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deletedAt: new Date().toISOString(),
    board: core.normalizeBoard(board)
  });
  writeTrash(items);
}

export function installTacticTrash() {
  if (installed) return;
  installed = true;
  const storage = window.BT.storage;
  originalDeleteTactic = storage.deleteTactic.bind(storage);
  storage.deleteTactic = id => {
    const board = storage.getTactic(id);
    if (board) archive(board);
    return originalDeleteTactic(id);
  };
  const cleaned = readTrash();
  const current = storage.getSetting(TRASH_KEY, []);
  if (!Array.isArray(current) || current.length !== cleaned.length) writeTrash(cleaned);
}

function injectStyles() {
  if (document.getElementById('courthub-tactic-trash')) return;
  const style = document.createElement('style');
  style.id = 'courthub-tactic-trash';
  style.textContent = `
    .cht-overlay{position:fixed;z-index:1100;inset:0;display:grid;place-items:center;padding:1rem;background:rgba(2,12,8,.7);backdrop-filter:blur(5px)}
    .cht-modal{width:min(42rem,100%);max-height:86vh;overflow:auto;border-radius:1rem;background:var(--surface,#fff);color:var(--text,#13221b);border:1px solid rgba(20,60,42,.16);box-shadow:0 2rem 5rem rgba(0,0,0,.38)}
    [data-theme="dark"] .cht-modal{background:#0c1c16;color:#f5f8f6;border-color:rgba(255,255,255,.12)}
    .cht-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem 1rem;background:inherit;border-bottom:1px solid rgba(20,60,42,.1)}
    [data-theme="dark"] .cht-head{border-color:rgba(255,255,255,.09)}
    .cht-head h2{margin:0;font-size:1.15rem}.cht-body{padding:1rem}.cht-list{display:grid;gap:.55rem}
    .cht-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;padding:.72rem;border:1px solid rgba(20,60,42,.12);border-radius:.75rem;background:rgba(20,60,42,.025)}
    [data-theme="dark"] .cht-item{border-color:rgba(255,255,255,.09);background:rgba(255,255,255,.025)}
    .cht-item strong{display:block}.cht-item small{color:var(--muted,#64756d)}.cht-actions{display:flex;gap:.4rem;flex-wrap:wrap}
    @media(max-width:620px){.cht-item{grid-template-columns:1fr}.cht-actions>*{flex:1}}
  `;
  document.head.append(style);
}

function formatDeletedAt(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Zeitpunkt unbekannt';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function openTacticTrash(options = {}) {
  injectStyles();
  const overlay = document.createElement('div');
  overlay.className = 'cht-overlay';
  overlay.innerHTML = `<section class="cht-modal" role="dialog" aria-modal="true" aria-label="Play-Papierkorb"><header class="cht-head"><div><span class="chpd-kicker">7 Tage aufbewahrt</span><h2>Play-Papierkorb</h2></div><button class="chpd-btn icon" type="button" data-close>×</button></header><div class="cht-body"><div class="cht-list" data-list></div></div></section>`;
  const close = () => overlay.remove();
  overlay.querySelector('[data-close]').onclick = close;
  overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); });

  const render = () => {
    const list = overlay.querySelector('[data-list]');
    const items = readTrash();
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('article');
      row.className = 'cht-item';
      row.innerHTML = `<div><strong></strong><small></small></div><div class="cht-actions"><button class="chpd-btn primary" type="button" data-restore>Wiederherstellen</button><button class="chpd-btn danger" type="button" data-purge>Endgültig löschen</button></div>`;
      row.querySelector('strong').textContent = item.board.title || 'Unbenanntes Play';
      row.querySelector('small').textContent = `${item.board.category || 'Ohne Kategorie'} · gelöscht ${formatDeletedAt(item.deletedAt)}`;
      row.querySelector('[data-restore]').onclick = () => {
        let board = core.normalizeBoard(item.board);
        board = core.normalizeBoard(window.BT.storage.upsertTactic(board));
        window.BT.storage.setSetting(DRAFT_KEY, board);
        writeTrash(readTrash().filter(entry => entry.id !== item.id));
        close();
        options.reload?.();
        toast('Play wiederhergestellt.');
      };
      row.querySelector('[data-purge]').onclick = () => {
        if (!window.confirm('Dieses Play endgültig löschen?')) return;
        writeTrash(readTrash().filter(entry => entry.id !== item.id));
        render();
      };
      list.append(row);
    });
    if (!items.length) list.innerHTML = '<p class="chpd-empty">Der Papierkorb ist leer.</p>';
  };

  document.body.append(overlay);
  render();
  return overlay;
}

export function enhanceTacticTrash(root, options = {}) {
  installTacticTrash();
  const quickMenu = root?.querySelector?.('.chqw-menu');
  if (quickMenu && !quickMenu.querySelector('[data-open-trash]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chq-btn';
    button.dataset.openTrash = 'true';
    button.textContent = 'Papierkorb';
    button.onclick = () => openTacticTrash(options);
    quickMenu.append(button);
  }

  const proPanel = root?.querySelector?.('.chpd-library-panel .chpd-row');
  if (proPanel && !proPanel.querySelector('[data-open-trash]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chpd-btn';
    button.dataset.openTrash = 'true';
    button.textContent = 'Papierkorb';
    button.onclick = () => openTacticTrash(options);
    proPanel.append(button);
  }
  return root;
}
