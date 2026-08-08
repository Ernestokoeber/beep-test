import { normalizeRecordedBoard } from './phase-recorder-core.js';

const DRAFT_KEY = 'tacticsBoardDraft';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function translatedPoint(point, dx, dy, core) {
  return core.point({ x: Number(point?.x || 0) + dx, y: Number(point?.y || 0) + dy });
}

function copyTokenState(step, core) {
  const output = core.cloneStep(step);
  output.phaseId = step.phaseId;
  output.duration = step.duration;
  output.elements = clone(step.elements || []);
  output.transition = core.emptyTransition();
  return output;
}

function rebuildSegment(source, current, core) {
  const next = copyTokenState(current, core);
  const transition = source.transition || core.emptyTransition();
  const rebuilt = core.emptyTransition();
  const movedBallCarriers = [];

  transition.motions.forEach(action => {
    const originalActor = core.elementById(source, action.elementId);
    const currentActor = core.elementById(current, action.elementId);
    const targetActor = core.elementById(next, action.elementId);
    if (!originalActor || !currentActor || !targetActor) return;

    const dx = currentActor.x - originalActor.x;
    const dy = currentActor.y - originalActor.y;
    const sourcePath = Array.isArray(action.path) && action.path.length
      ? action.path
      : [originalActor, core.elementById(source, action.elementId) || originalActor];
    const path = sourcePath.map(point => translatedPoint(point, dx, dy, core));
    if (!path.length) path.push(core.point(currentActor));
    path[0] = core.point(currentActor);
    Object.assign(targetActor, path.at(-1));

    rebuilt.motions.push({
      ...clone(action),
      path
    });

    const originalBall = core.elementById(source, 'ball');
    if (originalBall && core.distance(originalBall, originalActor) <= 36) {
      movedBallCarriers.push({
        actorId: action.elementId,
        offsetX: originalBall.x - originalActor.x,
        offsetY: originalBall.y - originalActor.y
      });
    }
  });

  transition.screens.forEach(action => {
    const originalActor = core.elementById(source, action.elementId);
    const currentActor = core.elementById(current, action.elementId);
    if (!originalActor || !currentActor) return;
    rebuilt.screens.push({
      ...clone(action),
      x: core.clamp(Number(action.x || originalActor.x) + currentActor.x - originalActor.x, 16, 484),
      y: core.clamp(Number(action.y || originalActor.y) + currentActor.y - originalActor.y, 16, 454)
    });
  });

  rebuilt.passes = transition.passes.map(action => clone(action));
  current.transition = rebuilt;
  current.duration = core.clamp(Number(source.duration) || 1.8, .3, 10);

  const nextBall = core.elementById(next, 'ball');
  if (nextBall && movedBallCarriers.length && !rebuilt.passes.length) {
    const carrier = movedBallCarriers.at(-1);
    const actor = core.elementById(next, carrier.actorId);
    if (actor) {
      nextBall.x = core.clamp(actor.x + carrier.offsetX, 16, 484);
      nextBall.y = core.clamp(actor.y + carrier.offsetY, 16, 454);
    }
  }

  if (nextBall && rebuilt.passes.length) {
    const lastPass = [...rebuilt.passes].sort((left, right) =>
      (left.start + left.duration) - (right.start + right.duration)
    ).at(-1);
    const receiver = lastPass ? core.elementById(next, lastPass.toId) : null;
    if (receiver) {
      nextBall.x = core.clamp(receiver.x + 16, 16, 484);
      nextBall.y = core.clamp(receiver.y, 16, 454);
    }
  }

  return next;
}

function phaseSegments(board) {
  return board.steps.slice(0, Math.max(0, board.steps.length - 1)).map((step, index) => ({
    originalIndex: index,
    step: clone(step)
  }));
}

function rebuildQuickSegments(board, segments, core, activeSegment) {
  const count = segments.length;
  if (!count) return board;
  const rebuilt = [];
  let current = copyTokenState(board.steps[0], core);

  segments.forEach(segment => {
    current.phaseId = segment.step.phaseId;
    current.instruction = String(segment.step.instruction || '');
    if (segment.step.thumbnailVersion) current.thumbnailVersion = segment.step.thumbnailVersion;
    else delete current.thumbnailVersion;
    rebuilt.push(current);
    current = rebuildSegment(segment.step, current, core);
  });

  const finalDuration = board.steps.at(-1)?.duration || 1.2;
  const finalPhaseId = board.steps.at(-1)?.phaseId;
  current.duration = core.clamp(Number(finalDuration) || 1.2, .3, 10);
  current.phaseId = finalPhaseId;
  current.transition = core.emptyTransition();
  rebuilt.push(current);

  board.steps = rebuilt;
  board.currentStep = Math.max(0, Math.min(count - 1, activeSegment));
  return normalizeRecordedBoard(board, core);
}

export function reorderQuickFlows(boardInput, fromIndex, toIndex, suppliedCore) {
  const core = suppliedCore || window.BT.tactics.__core;
  const board = normalizeRecordedBoard(boardInput, core);
  const count = Math.max(0, board.steps.length - 1);
  if (count < 2) return board;

  const from = core.clamp(Math.floor(Number(fromIndex) || 0), 0, count - 1);
  const to = core.clamp(Math.floor(Number(toIndex) || 0), 0, count - 1);
  if (from === to) return board;
  const originalCurrent = core.clamp(board.currentStep || 0, 0, count - 1);
  const segments = phaseSegments(board);
  const [moved] = segments.splice(from, 1);
  segments.splice(to, 0, moved);
  let active = segments.findIndex(segment => segment.originalIndex === originalCurrent);
  if (active < 0) active = Math.min(to, count - 1);
  return rebuildQuickSegments(board, segments, core, active);
}

export function duplicateQuickFlow(boardInput, phaseIndex, suppliedCore) {
  const core = suppliedCore || window.BT.tactics.__core;
  const board = normalizeRecordedBoard(boardInput, core);
  const segments = phaseSegments(board);
  if (!segments.length) return board;
  const index = core.clamp(Math.floor(Number(phaseIndex) || 0), 0, segments.length - 1);
  const duplicate = clone(segments[index]);
  duplicate.originalIndex = `duplicate-${core.uid('phase_')}`;
  duplicate.step.id = core.uid('st_');
  duplicate.step.phaseId = core.uid('phase_');
  segments.splice(index + 1, 0, duplicate);
  return rebuildQuickSegments(board, segments, core, index + 1);
}

export function deleteQuickFlow(boardInput, phaseIndex, suppliedCore) {
  const core = suppliedCore || window.BT.tactics.__core;
  const board = normalizeRecordedBoard(boardInput, core);
  const segments = phaseSegments(board);
  if (segments.length <= 1) return board;
  const index = core.clamp(Math.floor(Number(phaseIndex) || 0), 0, segments.length - 1);
  segments.splice(index, 1);
  return rebuildQuickSegments(board, segments, core, Math.min(index, segments.length - 1));
}

export function insertQuickFlow(boardInput, phaseIndex, position = 'after', suppliedCore) {
  const core = suppliedCore || window.BT.tactics.__core;
  const board = normalizeRecordedBoard(boardInput, core);
  const segments = phaseSegments(board);
  const index = core.clamp(Math.floor(Number(phaseIndex) || 0), 0, Math.max(0, segments.length - 1));
  const insertionIndex = position === 'before' ? index : index + 1;
  const source = clone(segments[Math.min(index, segments.length - 1)]?.step || board.steps[0]);
  source.id = core.uid('st_');
  source.phaseId = core.uid('phase_');
  source.instruction = '';
  source.duration = .8;
  source.transition = core.emptyTransition();
  segments.splice(insertionIndex, 0, { originalIndex: `insert-${source.phaseId}`, step: source });
  return rebuildQuickSegments(board, segments, core, insertionIndex);
}

function injectStyles() {
  if (document.getElementById('courthub-quick-reorder')) return;
  const style = document.createElement('style');
  style.id = 'courthub-quick-reorder';
  style.textContent = `
    .chqr-handle{display:grid;place-items:center;flex:0 0 auto;width:2rem;height:2rem;border:0;border-radius:.55rem;background:rgba(20,60,42,.07);color:var(--muted,#64756d);font:900 1rem/1 system-ui;cursor:grab;touch-action:none;user-select:none}
    .chq-phase-rail .chqr-handle{position:absolute;z-index:6;top:.5rem;left:.5rem;background:rgba(6,18,24,.88);color:#fff;border:1px solid rgba(255,255,255,.15)}
    .chq-phase-rail .chq-flow-index{left:2.9rem}
    .chqr-handle:active{cursor:grabbing}.chqr-handle:focus-visible{outline:2px solid #ec7d1d;outline-offset:2px}
    .chq-flow-item.chqr-source{opacity:.5;transform:scale(.985)}
    .chq-flow-item.chqr-target{box-shadow:0 0 0 3px rgba(236,125,29,.22);border-color:#ec7d1d}
    .chq-flow-item.chqr-before::before,.chq-flow-item.chqr-after::after{content:'';position:absolute;left:.55rem;right:.55rem;height:3px;border-radius:3px;background:#ec7d1d}
    .chq-flow-item.chqr-before::before{top:-.28rem}.chq-flow-item.chqr-after::after{bottom:-.28rem}
    .chq-flow-item{position:relative}
  `;
  document.head.append(style);
}

function activeRows(root) {
  return [...root.querySelectorAll('.chq-flow-item')];
}

function saveReorder(root, from, to, reload) {
  if (from === to) return;
  const board = window.BT.storage.getSetting(DRAFT_KEY, window.BT.tactics.__core.defaultBoard());
  const reordered = reorderQuickFlows(board, from, to, window.BT.tactics.__core);
  window.BT.storage.setSetting(DRAFT_KEY, reordered);
  window.BT.util?.toast?.(`Ablauf ${from + 1} wurde an Position ${to + 1} verschoben.`);
  reload();
}

function clearMarkers(root) {
  activeRows(root).forEach(row => row.classList.remove('chqr-source', 'chqr-target', 'chqr-before', 'chqr-after'));
}

function targetForPoint(root, clientX, clientY) {
  const rows = activeRows(root);
  if (!rows.length) return 0;
  const rects = rows.map(row => row.getBoundingClientRect());
  const horizontalSpread = Math.max(...rects.map(rect => rect.left + rect.width / 2))
    - Math.min(...rects.map(rect => rect.left + rect.width / 2));
  const verticalSpread = Math.max(...rects.map(rect => rect.top + rect.height / 2))
    - Math.min(...rects.map(rect => rect.top + rect.height / 2));
  const horizontal = horizontalSpread > verticalSpread;
  const pointer = horizontal ? clientX : clientY;
  return rects
    .map((rect, index) => ({
      index,
      distance: Math.abs(pointer - (horizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2))
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.index || 0;
}

function decorate(root, reload) {
  activeRows(root).forEach((row, index) => {
    row.dataset.reorderIndex = String(index);
    if (row.querySelector('.chqr-handle')) return;

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'chqr-handle';
    handle.textContent = '↕';
    handle.title = 'Ablauf per Ziehen verschieben';
    handle.setAttribute('aria-label', `Ablauf ${index + 1} verschieben`);
    row.prepend(handle);

    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { pointerId: event.pointerId, from: index, to: index };
      try { handle.setPointerCapture?.(event.pointerId); } catch (_) {}
      clearMarkers(root);
      activeRows(root)[index]?.classList.add('chqr-source');
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      drag.to = targetForPoint(root, event.clientX, event.clientY);
      clearMarkers(root);
      const rows = activeRows(root);
      rows[drag.from]?.classList.add('chqr-source');
      rows[drag.to]?.classList.add('chqr-target', drag.to < drag.from ? 'chqr-before' : 'chqr-after');
    });
    const finish = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const value = drag;
      drag = null;
      try { handle.releasePointerCapture?.(event.pointerId); } catch (_) {}
      clearMarkers(root);
      saveReorder(root, value.from, value.to, reload);
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      clearMarkers(root);
    });
    handle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
    });
    handle.addEventListener('keydown', event => {
      const rows = activeRows(root);
      if (event.key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        saveReorder(root, index, index - 1, reload);
      } else if (event.key === 'ArrowDown' && index < rows.length - 1) {
        event.preventDefault();
        saveReorder(root, index, index + 1, reload);
      }
    });
  });
}

export function enhanceQuickReorder(root, options = {}) {
  const flow = root?.querySelector?.('[data-role="flow"]');
  if (!flow || root.dataset.quickReorderInstalled === 'true') return root;
  root.dataset.quickReorderInstalled = 'true';
  injectStyles();
  const reload = () => options.reload?.();
  const observer = new MutationObserver(() => decorate(root, reload));
  observer.observe(flow, { childList: true, subtree: true });
  decorate(root, reload);

  const cleanup = () => {
    if (root.isConnected) return;
    observer.disconnect();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
  return root;
}
