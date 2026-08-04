import {
  COURT_ENHANCEMENT_VIEW,
  legacyProject,
  parallelUnproject
} from './court-enhancements.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const installed = new WeakSet();
const activePointers = new Map();
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
    // Safari/Chromium können setPointerCapture ablehnen, wenn das während
    // eines gerenderten SVG-Austauschs passiert. Der Drag-Zustand wurde im
    // Editor bereits angelegt und wird über den Fenster-Fallback fortgeführt.
    if (error?.name !== 'NotFoundError' && error?.name !== 'InvalidStateError') throw error;
  }
  return true;
}

function relay(svg, type, event) {
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
    const svg = activePointers.get(event.pointerId);
    if (!svg || !svg.isConnected || svg.contains(event.target)) return;
    event.preventDefault();
    callHandler(svg, 'pointermove', event);
  }, true);

  const finish = type => event => {
    const svg = activePointers.get(event.pointerId);
    if (!svg) return;
    // Der normale SVG-Listener erhält zuerst die Chance. Falls der Pointer
    // wegen eines DOM-Austauschs oder verlorener Capture nicht dort ankommt,
    // schließt dieser Microtask den Drag trotzdem sauber ab und speichert ihn.
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
