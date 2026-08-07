const core = window.BT.tactics.__core;
const DRAFT_KEY = 'tacticsBoardDraft';

function toast(message) {
  window.BT.util?.toast?.(message);
}

function currentBoard() {
  return core.normalizeBoard(window.BT.storage.getSetting(DRAFT_KEY, core.defaultBoard()));
}

function saveBoard(board) {
  window.BT.storage.setSetting(DRAFT_KEY, core.normalizeBoard(board));
}

function actionsFor(step) {
  const transition = core.normalizeTransition(step?.transition);
  return [...transition.motions, ...transition.passes, ...transition.screens];
}

function activeStepIndex(root, board) {
  const rows = [...root.querySelectorAll('.chq-flow-item')];
  const selected = rows.findIndex(row => row.classList.contains('active'));
  if (selected >= 0) return Math.min(selected, board.steps.length - 1);
  return Math.min(board.currentStep || 0, board.steps.length - 1);
}

function injectStyles() {
  if (document.getElementById('courthub-quick-details')) return;
  const style = document.createElement('style');
  style.id = 'courthub-quick-details';
  style.textContent = `
    .chqd-grid{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}
    .chqd-team{display:grid;gap:.35rem}.chqd-team>strong{font-size:.72rem;color:var(--muted,#64756d)}
    .chqd-player{display:grid;grid-template-columns:2.1rem minmax(0,1fr);gap:.35rem;align-items:center}
    .chqd-player span{display:grid;place-items:center;height:2rem;border-radius:50%;font-size:.68rem;font-weight:900;background:rgba(22,128,196,.12);color:#12679a}
    .chqd-player.defense span{background:rgba(36,43,53,.1);color:#303744}
    [data-theme="dark"] .chqd-player.defense span{background:rgba(255,255,255,.1);color:#f4f7f5}
    .chqd-player input,.chqd-pause select{width:100%;border:1px solid rgba(20,60,42,.17);background:var(--surface,#fff);color:inherit;border-radius:.6rem;padding:.5rem;font:inherit}
    [data-theme="dark"] .chqd-player input,[data-theme="dark"] .chqd-pause select{background:#06120d;border-color:rgba(255,255,255,.11)}
    .chqd-pause{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;align-items:end;margin-top:.55rem}
    .chqd-pause label{display:grid;gap:.25rem;font-size:.68rem;font-weight:780;color:var(--muted,#64756d)}
    .chqd-step-actions{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.65rem}
    @media(max-width:520px){.chqd-grid{grid-template-columns:1fr}.chqd-pause{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function renamePlayer(id, value, reload) {
  const board = currentBoard();
  const label = String(value || '').trim().slice(0, 18);
  if (!label) return;
  board.steps.forEach(step => {
    const element = core.elementById(step, id);
    if (element && ['offense', 'defense'].includes(element.type)) element.role = label;
  });
  saveBoard(board);
  reload();
  toast('Spielerbezeichnung aktualisiert.');
}

function insertPause(root, duration, reload) {
  const board = currentBoard();
  let index = activeStepIndex(root, board);
  if (actionsFor(board.steps[index]).length) {
    if (!board.steps[index + 1]) board.steps.push(core.cloneStep(board.steps[index]));
    index += 1;
  }
  if (!board.steps[index + 1]) board.steps.push(core.cloneStep(board.steps[index]));
  board.steps[index].transition = core.emptyTransition();
  board.steps[index].duration = core.clamp(duration, .3, 5);
  board.currentStep = index;
  saveBoard(board);
  reload();
  toast(`Pause von ${duration.toFixed(1).replace('.', ',')} Sekunden eingefügt.`);
}

function deleteStep(root, reload) {
  const board = currentBoard();
  if (board.steps.length <= 1) return toast('Der einzige Ablauf kann nicht gelöscht werden.');
  const index = activeStepIndex(root, board);
  if (!window.confirm(`Ablauf ${index + 1} wirklich löschen?`)) return;
  board.steps.splice(index, 1);
  board.currentStep = Math.min(index, board.steps.length - 1);
  saveBoard(board);
  reload();
  toast('Ablauf gelöscht.');
}

export function enhanceQuickDetails(root, options = {}) {
  if (!root?.querySelector?.('.chq-side')) return root;
  injectStyles();
  const reload = () => options.reload?.();
  const board = currentBoard();
  const first = board.steps[0];

  const card = document.createElement('section');
  card.className = 'chq-card';
  card.dataset.quickDetails = 'true';
  card.innerHTML = `
    <div class="chq-card-body">
      <div class="chq-section-title"><span>4</span><strong>Details</strong></div>
      <p class="chq-help">Spielerbezeichnungen gelten für das gesamte Play. Die Pausenlänge kann vor dem Einfügen gewählt werden.</p>
      <div class="chqd-grid"><div class="chqd-team" data-offense><strong>Angriff</strong></div><div class="chqd-team" data-defense><strong>Verteidigung</strong></div></div>
      <div class="chqd-pause"><label>Pausendauer<select data-pause-duration><option value="0.5">0,5 Sekunden</option><option value="0.8" selected>0,8 Sekunden</option><option value="1">1,0 Sekunden</option><option value="1.5">1,5 Sekunden</option><option value="2">2,0 Sekunden</option></select></label><button class="chq-btn" type="button" data-insert-pause>Pause einfügen</button></div>
      <div class="chqd-step-actions"><button class="chq-btn danger" type="button" data-delete-step>Aktuellen Ablauf löschen</button><a class="chq-btn" href="#/tactics" data-open-pro>Im Profi-Modus korrigieren</a></div>
    </div>`;

  ['offense', 'defense'].forEach(type => {
    const container = card.querySelector(type === 'offense' ? '[data-offense]' : '[data-defense]');
    core.elements(first, type).forEach((element, index) => {
      const row = document.createElement('label');
      row.className = `chqd-player ${type}`;
      row.innerHTML = `<span>${type === 'offense' ? 'O' : 'X'}${index + 1}</span><input maxlength="18">`;
      const input = row.querySelector('input');
      input.value = element.role;
      input.setAttribute('aria-label', `${type === 'offense' ? 'Angreifer' : 'Verteidiger'} ${index + 1}`);
      input.onchange = () => renamePlayer(element.id, input.value, reload);
      container.append(row);
    });
  });

  card.querySelector('[data-insert-pause]').onclick = () => {
    const duration = core.number(card.querySelector('[data-pause-duration]').value, .8);
    insertPause(root, duration, reload);
  };
  card.querySelector('[data-delete-step]').onclick = () => deleteStep(root, reload);
  card.querySelector('[data-open-pro]').onclick = event => {
    event.preventDefault();
    window.BT.storage.setSetting('tacticsEditorMode', 'pro');
    reload();
  };

  const originalPause = root.querySelector('[data-action="pause"]');
  if (originalPause) {
    originalPause.hidden = true;
    originalPause.setAttribute('aria-hidden', 'true');
  }

  const svg = root.querySelector('.chq-court-wrap svg');
  svg?.addEventListener('pointerdown', event => {
    const activeTool = root.querySelector('[data-tool].active')?.dataset.tool;
    if (activeTool !== 'ball') return;
    const latest = currentBoard();
    const index = activeStepIndex(root, latest);
    if (index === 0 && !actionsFor(latest.steps[index]).length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('Der Ball kann nur in der Grundaufstellung frei zugeordnet werden. Nutze danach einen Pass oder den Profi-Modus.');
  }, true);

  root.querySelector('.chq-side').append(card);
  return root;
}
