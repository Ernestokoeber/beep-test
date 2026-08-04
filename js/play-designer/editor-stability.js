const core = window.BT.tactics.__core;
const DRAFT_KEY = 'tacticsBoardDraft';

function format(value) {
  return `${Math.max(0, Number(value) || 0).toFixed(1)} s`;
}

function injectStyles() {
  if (document.getElementById('courthub-play-designer-stability')) return;
  const style = document.createElement('style');
  style.id = 'courthub-play-designer-stability';
  style.textContent = `
    .chpd > .chpd-header .chpd-brand h1{color:var(--text,#13221b)}
    .chpd > .chpd-header .chpd-btn.ghost{color:var(--text,#13221b);background:rgba(255,255,255,.55);border-color:rgba(15,35,42,.16)}
    [data-theme="dark"] .chpd > .chpd-header .chpd-brand h1{color:#f7fafc}
    [data-theme="dark"] .chpd > .chpd-header .chpd-btn.ghost{color:#f7fafc;background:rgba(7,18,24,.7);border-color:rgba(255,255,255,.14)}
    .chpd-action{display:grid;gap:.08rem;align-content:center}
    .chpd-action .chpd-action-name{font-weight:780}
    .chpd-action .chpd-action-time{font-size:.58rem;color:var(--pd-muted);font-variant-numeric:tabular-nums}
    .chpd-action.active .chpd-action-time{color:#ffd4a3}
    .chpd-timing-summary{display:grid;gap:.45rem;margin:.2rem 0 .7rem;padding:.62rem;border:1px solid var(--pd-line);border-radius:.68rem;background:rgba(255,255,255,.035)}
    .chpd-timing-summary strong{font-size:.73rem}
    .chpd-timing-summary span{font-size:.65rem;color:var(--pd-muted);font-variant-numeric:tabular-nums}
    .chpd-timing-summary .chpd-btn{width:100%;min-height:2.25rem;font-size:.68rem}
    .chpd-field input[data-timing-input]{font-variant-numeric:tabular-nums}
  `;
  document.head.appendChild(style);
}

function currentBoard() {
  return core.normalizeBoard(window.BT.storage.getSetting(DRAFT_KEY, null));
}

function activeStepIndex(root) {
  const steps = [...root.querySelectorAll('.chpd-step')];
  const index = steps.findIndex(button => button.classList.contains('active'));
  return Math.max(0, index);
}

function actionsFor(step) {
  const transition = core.normalizeTransition(step?.transition);
  return [...transition.motions, ...transition.passes, ...transition.screens]
    .sort((left, right) => left.start - right.start || left.duration - right.duration);
}

function actionName(action, step) {
  if (action.type === 'move') {
    return `Lauf ${core.elementById(step, action.elementId)?.role || 'Spieler'}`;
  }
  if (action.type === 'pass') {
    return `Pass ${core.elementById(step, action.fromId)?.role || '?'} → ${core.elementById(step, action.toId)?.role || '?'}`;
  }
  return `Screen ${core.elementById(step, action.elementId)?.role || 'Spieler'}`;
}

function enhanceActionList(root, board, stepIndex) {
  const step = board.steps[stepIndex];
  const actions = actionsFor(step);
  const buttons = [...root.querySelectorAll('.chpd-action-strip .chpd-action')];
  buttons.forEach((button, index) => {
    const action = actions[index];
    if (!action) return;
    const signature = `${action.id}:${action.start}:${action.duration}`;
    if (button.dataset.timingSignature === signature) return;
    button.dataset.timingSignature = signature;
    button.dataset.actionId = action.id;
    button.title = `${actionName(action, step)} · Start ${format(action.start)} · Ende ${format(core.actionEnd(action))}`;
    const name = document.createElement('span');
    name.className = 'chpd-action-name';
    name.textContent = actionName(action, step);
    const time = document.createElement('span');
    time.className = 'chpd-action-time';
    time.textContent = `${format(action.start)} – ${format(core.actionEnd(action))}`;
    button.replaceChildren(name, time);
  });
}

function enhanceInspector(root, board, stepIndex) {
  const inspector = root.querySelector('[data-r="inspector"]');
  if (!inspector) return;
  const fields = [...inspector.querySelectorAll('.chpd-field')];
  const startField = fields.find(field => field.querySelector('label')?.textContent?.startsWith('Startzeit'));
  const durationField = fields.find(field => field.querySelector('label')?.textContent === 'Dauer');
  const activeButton = root.querySelector('.chpd-action-strip .chpd-action.active');
  if (!startField || !durationField || !activeButton) {
    inspector.querySelector('.chpd-timing-summary')?.remove();
    return;
  }

  const step = board.steps[stepIndex];
  const actions = actionsFor(step);
  const buttons = [...root.querySelectorAll('.chpd-action-strip .chpd-action')];
  const action = actions[buttons.indexOf(activeButton)];
  if (!action) return;

  const startInput = startField.querySelector('input');
  const durationInput = durationField.querySelector('input');
  const minimum = action.type === 'pass' ? 0.12 : 0.15;
  startField.querySelector('label').textContent = 'Start im Schritt';
  startInput.dataset.timingInput = 'start';
  durationInput.dataset.timingInput = 'duration';
  startInput.max = String(Math.max(0, step.duration - minimum));
  durationInput.max = String(Math.max(minimum, step.duration - action.start));

  let summary = inspector.querySelector('.chpd-timing-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'chpd-timing-summary';
    durationField.after(summary);
  }
  const absoluteStart = core.stepStartTime(board, stepIndex) + action.start;
  const absoluteEnd = absoluteStart + action.duration;
  summary.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = `Aktionsfenster: ${format(action.start)} – ${format(core.actionEnd(action))}`;
  const detail = document.createElement('span');
  detail.textContent = `Im gesamten Play: ${format(absoluteStart)} – ${format(absoluteEnd)} · Schritt endet bei ${format(step.duration)}`;
  const preview = document.createElement('button');
  preview.type = 'button';
  preview.className = 'chpd-btn';
  preview.textContent = 'Ab dieser Startzeit abspielen';
  preview.onclick = () => {
    const scrubber = root.querySelector('[data-r="scrubber"]');
    const play = root.querySelector('[data-a="play"]');
    if (!scrubber || !play) return;
    scrubber.value = String(Math.round(absoluteStart * 1000));
    scrubber.dispatchEvent(new Event('input', { bubbles: true }));
    requestAnimationFrame(() => {
      if (play.textContent.trim() !== 'Ⅱ') play.click();
    });
  };
  summary.append(title, detail, preview);
}

function sync(root) {
  if (!root.isConnected) return;
  const board = currentBoard();
  const stepIndex = Math.min(activeStepIndex(root), board.steps.length - 1);
  enhanceActionList(root, board, stepIndex);
  enhanceInspector(root, board, stepIndex);
}

export function installEditorStability(root) {
  if (!root || root.dataset.stabilityInstalled === 'true') return root;
  root.dataset.stabilityInstalled = 'true';
  injectStyles();

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync(root);
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  root.addEventListener('click', event => {
    const play = event.target.closest?.('[data-a="play"]');
    if (play && play.textContent.trim() === 'Ⅱ') {
      setTimeout(() => {
        if (play.isConnected && play.textContent.trim() === 'Ⅱ') play.textContent = '▶';
      }, 0);
    }
    schedule();
  }, true);
  root.addEventListener('change', schedule, true);
  root.addEventListener('input', event => {
    if (event.target.matches?.('[data-timing-input]')) schedule();
  }, true);

  schedule();
  return root;
}
