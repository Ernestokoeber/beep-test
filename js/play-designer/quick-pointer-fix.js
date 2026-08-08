import {
  COURT_ENHANCEMENT_VIEW,
  legacyProject,
  parallelProject,
  parallelUnproject
} from './court-enhancements.js';
import { pointFromEvent, projectPoint } from './rendering.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAFT_KEY = 'tacticsBoardDraft';
const installed = new WeakSet();
const activePointers = new Map();
const setupDrags = new Map();
let fallbackInstalled = false;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function fittedSvgMetrics(rectInput, view = COURT_ENHANCEMENT_VIEW) {
  const rect = {
    left: finite(rectInput?.left),
    top: finite(rectInput?.top),
    width: Math.max(1, finite(rectInput?.width, 1)),
    height: Math.max(1, finite(rectInput?.height, 1))
  };
  const scale = Math.min(rect.width / view.width, rect.height / view.height) || 1;
  const width = view.width * scale;
  const height = view.height * scale;
  return {
    ...rect,
    scale,
    offsetX: (rect.width - width) / 2,
    offsetY: (rect.height - height) / 2
  };
}

export function clientToParallelSvg(rect, clientX, clientY) {
  const metrics = fittedSvgMetrics(rect);
  return {
    x: (finite(clientX) - metrics.left - metrics.offsetX) / metrics.scale,
    y: (finite(clientY) - metrics.top - metrics.offsetY) / metrics.scale
  };
}

export function parallelSvgToClient(rect, point) {
  const metrics = fittedSvgMetrics(rect);
  return {
    x: metrics.left + metrics.offsetX + finite(point?.x) * metrics.scale,
    y: metrics.top + metrics.offsetY + finite(point?.y) * metrics.scale
  };
}

export function quickPointerToLegacyClient(rect, clientX, clientY, snappedParallelPoint = null) {
  const parallelPoint = snappedParallelPoint || clientToParallelSvg(rect, clientX, clientY);
  const courtPoint = parallelUnproject(parallelPoint);
  return parallelSvgToClient(rect, legacyProject(courtPoint));
}

export function tokenParallelCenter(target) {
  const group = target?.closest?.('g.token[data-element-id]');
  if (!group || group.classList.contains('ball-token')) return null;
  const transform = group.getAttribute('transform') || '';
  const match = transform.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

function eventProxy(event, coordinates) {
  return new Proxy(event, {
    get(target, property) {
      if (property === 'clientX') return coordinates.x;
      if (property === 'clientY') return coordinates.y;
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function addHitArea(group) {
  if (!(group instanceof Element) || !group.matches('g.token') || group.querySelector(':scope > .chq-token-hit')) return;
  const hit = document.createElementNS(SVG_NS, 'ellipse');
  hit.classList.add('chq-token-hit');
  hit.setAttribute('cx', '0');
  hit.setAttribute('cy', group.classList.contains('ball-token') ? '0' : '-1');
  hit.setAttribute('rx', group.classList.contains('ball-token') ? '22' : '32');
  hit.setAttribute('ry', group.classList.contains('ball-token') ? '22' : '23');
  hit.setAttribute('fill', 'transparent');
  hit.setAttribute('stroke', 'transparent');
  hit.setAttribute('pointer-events', 'all');
  group.prepend(hit);
}

function installHitAreas(svg) {
  const layer = svg.querySelector('[data-layer="tokens"]');
  if (!layer) return null;
  [...layer.children].forEach(addHitArea);
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(addHitArea));
  });
  observer.observe(layer, { childList: true });
  return observer;
}

function coordinatesFor(svg, type, event) {
  if (svg.dataset.projection === 'top-down') {
    return { x: event.clientX, y: event.clientY };
  }
  const snapped = type === 'pointerdown' ? tokenParallelCenter(event.target) : null;
  return quickPointerToLegacyClient(
    svg.getBoundingClientRect(),
    event.clientX,
    event.clientY,
    snapped
  );
}

function callHandler(svg, type, event) {
  const handler = svg[`on${type}`];
  if (typeof handler !== 'function') return false;
  const coordinates = coordinatesFor(svg, type, event);
  try {
    handler.call(svg, eventProxy(event, coordinates));
  } catch (error) {
    if (error?.name !== 'NotFoundError' && error?.name !== 'InvalidStateError') throw error;
  }
  return true;
}

function currentTool(svg) {
  return svg.closest('.chq')?.querySelector('[data-tool].active')?.dataset.tool || null;
}

function stepHasActions(step, core) {
  const transition = core.normalizeTransition(step?.transition);
  return transition.motions.length + transition.passes.length + transition.screens.length > 0;
}

function setupCourtPoint(svg, event) {
  if (svg.dataset.projection === 'top-down') return pointFromEvent(svg, event);
  return parallelUnproject(clientToParallelSvg(
    svg.getBoundingClientRect(),
    event.clientX,
    event.clientY
  ));
}

function setupCandidate(svg, event) {
  if (currentTool(svg) !== 'select') return null;
  const clickedGroup = event.target?.closest?.('g.token[data-element-id]');
  if (!clickedGroup || !svg.contains(clickedGroup)) return null;

  const storage = window.BT?.storage;
  const core = window.BT?.tactics?.__core;
  if (!storage || !core) return null;
  const board = core.normalizeBoard(storage.getSetting(DRAFT_KEY, core.defaultBoard()));
  if (board.currentStep !== 0 || stepHasActions(board.steps[0], core)) return null;

  const point = setupCourtPoint(svg, event);
  const element = core.elements(board.steps[0])
    .filter(candidate => ['offense', 'defense', 'ball'].includes(candidate.type))
    .map(candidate => ({ candidate, distance: core.distance(point, candidate) }))
    .filter(value => value.distance <= (value.candidate.type === 'ball' ? 20 : 30))
    .sort((left, right) => left.distance - right.distance)[0]?.candidate;
  if (!element) return null;
  const id = element.id;
  const group = [...svg.querySelectorAll('g.token[data-element-id]')]
    .find(candidate => candidate.dataset.elementId === id);
  if (!group) return null;
  return { storage, core, board, id, group, element };
}

function updateVisualToken(state, point) {
  const projected = state.svg.dataset.projection === 'top-down'
    ? projectPoint(point)
    : parallelProject(point);
  const transform = state.group.getAttribute('transform') || '';
  const scale = transform.match(/\s(scale\([^)]*\).*)$/)?.[1] || '';
  state.group.setAttribute(
    'transform',
    `translate(${projected.x} ${projected.y})${scale ? ' ' + scale : ''}`
  );
}

function updateSetupBoard(state, point) {
  const x = state.core.clamp(point.x - state.dx, 16, 484);
  const y = state.core.clamp(point.y - state.dy, 16, 454);
  const origin = state.core.elementById(state.board.steps[0], state.id);
  if (!origin) return;
  if (Math.abs(origin.x - x) > .01 || Math.abs(origin.y - y) > .01) state.changed = true;
  state.board.steps.forEach(step => {
    const element = state.core.elementById(step, state.id);
    if (element) Object.assign(element, { x, y });
  });
  updateVisualToken(state, { x, y });
}

function requestQuickReload(svg) {
  const root = svg.closest('.chq');
  if (!root) return;
  root.dispatchEvent(new CustomEvent('courthub:quick-reload', { bubbles: false }));
}

function finishSetupDrag(event, cancelled = false) {
  const state = setupDrags.get(event.pointerId);
  if (!state) return false;
  setupDrags.delete(event.pointerId);
  event.preventDefault();
  event.stopImmediatePropagation();
  try { state.svg.releasePointerCapture?.(event.pointerId); } catch (_) {}

  if (!cancelled && state.changed) {
    state.board = state.core.normalizeBoard(state.board);
    state.storage.setSetting(DRAFT_KEY, state.board);
    const status = state.svg.closest('.chq')?.querySelector('[data-role="status"]');
    if (status) status.textContent = 'Aufstellung geändert.';
  }
  requestAnimationFrame(() => requestQuickReload(state.svg));
  return true;
}

function handleSetupDrag(svg, type, event) {
  if (type === 'pointerdown') {
    const candidate = setupCandidate(svg, event);
    if (!candidate) return false;
    const point = setupCourtPoint(svg, event);
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = {
      ...candidate,
      svg,
      pointerId: event.pointerId,
      dx: point.x - candidate.element.x,
      dy: point.y - candidate.element.y,
      changed: false
    };
    setupDrags.set(event.pointerId, state);
    try { svg.setPointerCapture?.(event.pointerId); } catch (_) {}
    return true;
  }

  const state = setupDrags.get(event.pointerId);
  if (!state || state.svg !== svg) return false;
  if (type === 'pointermove') {
    event.preventDefault();
    event.stopImmediatePropagation();
    updateSetupBoard(state, setupCourtPoint(svg, event));
    return true;
  }
  if (type === 'pointerup') return finishSetupDrag(event, false);
  if (type === 'pointercancel') return finishSetupDrag(event, true);
  return false;
}

function relay(svg, type, event) {
  if (handleSetupDrag(svg, type, event)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const handled = callHandler(svg, type, event);
  if (!handled) return;

  if (type === 'pointerdown') {
    activePointers.set(event.pointerId, svg);
  } else if (type === 'pointerup' || type === 'pointercancel') {
    activePointers.delete(event.pointerId);
  }
}

function installWindowFallback() {
  if (fallbackInstalled) return;
  fallbackInstalled = true;

  window.addEventListener('pointermove', event => {
    const setup = setupDrags.get(event.pointerId);
    if (setup && (!setup.svg.contains(event.target) || !setup.svg.hasPointerCapture?.(event.pointerId))) {
      event.preventDefault();
      updateSetupBoard(setup, setupCourtPoint(setup.svg, event));
      return;
    }

    const svg = activePointers.get(event.pointerId);
    if (!svg || !svg.isConnected || svg.contains(event.target)) return;
    event.preventDefault();
    callHandler(svg, 'pointermove', event);
  }, true);

  const finish = type => event => {
    const setup = setupDrags.get(event.pointerId);
    if (setup) {
      queueMicrotask(() => {
        if (!setupDrags.has(event.pointerId)) return;
        finishSetupDrag(event, type === 'pointercancel');
      });
      return;
    }

    const svg = activePointers.get(event.pointerId);
    if (!svg) return;
    queueMicrotask(() => {
      if (activePointers.get(event.pointerId) !== svg) return;
      activePointers.delete(event.pointerId);
      if (!svg.isConnected) return;
      callHandler(svg, type, event);
    });
  };

  window.addEventListener('pointerup', finish('pointerup'), true);
  window.addEventListener('pointercancel', finish('pointercancel'), true);
}

export function installQuickPointerFix(svg) {
  if (!svg || installed.has(svg) || !svg.closest('.chq-court-wrap')) return svg;
  installed.add(svg);
  svg.dataset.quickPointerFix = 'true';
  installHitAreas(svg);
  installWindowFallback();
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(type => {
    svg.addEventListener(type, event => relay(svg, type, event), true);
  });
  return svg;
}

function scan(root = document) {
  root.querySelectorAll?.('.chq-court-wrap > .chpd-court').forEach(installQuickPointerFix);
}

function boot() {
  scan();
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('.chq-court-wrap > .chpd-court')) installQuickPointerFix(node);
        scan(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
