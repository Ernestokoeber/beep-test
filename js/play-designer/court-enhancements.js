const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW = Object.freeze({
  width: 760,
  height: 550,
  centerX: 380,
  farY: 58,
  nearY: 510,
  targetHalfWidth: 340,
  legacyFarHalfWidth: 170,
  legacyNearHalfWidth: 350,
  yPower: .86,
  minZoom: 1,
  maxZoom: 3.5
});

const enhanced = new WeakMap();
let sequence = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function svgNode(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) element.setAttribute(key, String(value));
  });
  return element;
}

function depthFromScreenY(y) {
  const projected = clamp01((Number(y) - VIEW.farY) / (VIEW.nearY - VIEW.farY));
  return Math.pow(projected, 1 / VIEW.yPower);
}

function screenYFromCourtY(y) {
  const t = clamp01(Number(y) / 470);
  return VIEW.farY + (VIEW.nearY - VIEW.farY) * Math.pow(t, VIEW.yPower);
}

function legacyHalfWidth(depth) {
  return VIEW.legacyFarHalfWidth
    + (VIEW.legacyNearHalfWidth - VIEW.legacyFarHalfWidth) * clamp01(depth);
}

export function parallelProject(point) {
  const x = Number(point?.x ?? 250);
  const y = Number(point?.y ?? 235);
  return {
    x: VIEW.centerX + ((x - 250) / 250) * VIEW.targetHalfWidth,
    y: screenYFromCourtY(y),
    depth: clamp01(y / 470)
  };
}

export function parallelUnproject(point) {
  const depth = depthFromScreenY(point?.y ?? VIEW.farY);
  return {
    x: clamp(250 + ((Number(point?.x ?? VIEW.centerX) - VIEW.centerX)
      / VIEW.targetHalfWidth) * 250, 16, 484),
    y: clamp(depth * 470, 16, 454)
  };
}

export function legacyProject(point) {
  const x = Number(point?.x ?? 250);
  const y = Number(point?.y ?? 235);
  const depth = clamp01(y / 470);
  return {
    x: VIEW.centerX + ((x - 250) / 250) * legacyHalfWidth(depth),
    y: screenYFromCourtY(y),
    depth
  };
}

function parallelXFromLegacy(x, y) {
  const depth = depthFromScreenY(y);
  const width = legacyHalfWidth(depth) || 1;
  return VIEW.centerX + (Number(x) - VIEW.centerX) * VIEW.targetHalfWidth / width;
}

function pairPath(path) {
  return String(path || '').replace(
    /(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?),(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    (_, rawX, rawY) => {
      const y = Number(rawY);
      return `${parallelXFromLegacy(Number(rawX), y)},${y}`;
    }
  );
}

function parallelizeElement(element) {
  if (!(element instanceof Element) || element.dataset.parallelized === 'true') return;

  if (element.matches('g.token')) {
    const transform = element.getAttribute('transform') || '';
    const match = transform.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)(.*)/);
    if (match) {
      const x = parallelXFromLegacy(Number(match[1]), Number(match[2]));
      element.setAttribute('transform', `translate(${x} ${match[2]})${match[3]}`);
    }
    element.dataset.parallelized = 'true';
    return;
  }

  if (element.tagName.toLowerCase() === 'path' && element.hasAttribute('d')) {
    element.setAttribute('d', pairPath(element.getAttribute('d')));
  } else if (element.tagName.toLowerCase() === 'line') {
    for (const suffix of ['1', '2']) {
      const xName = `x${suffix}`;
      const yName = `y${suffix}`;
      if (element.hasAttribute(xName) && element.hasAttribute(yName)) {
        element.setAttribute(
          xName,
          parallelXFromLegacy(
            Number(element.getAttribute(xName)),
            Number(element.getAttribute(yName))
          )
        );
      }
    }
  } else if (element.hasAttribute('x') && element.hasAttribute('y')) {
    element.setAttribute(
      'x',
      parallelXFromLegacy(Number(element.getAttribute('x')), Number(element.getAttribute('y')))
    );
  } else if (element.hasAttribute('cx') && element.hasAttribute('cy')) {
    element.setAttribute(
      'cx',
      parallelXFromLegacy(Number(element.getAttribute('cx')), Number(element.getAttribute('cy')))
    );
  }

  element.dataset.parallelized = 'true';
  [...element.children].forEach(parallelizeElement);
}

function pathFromCourtPoints(points, close = false) {
  const projected = points.map(parallelProject);
  return projected.map((point, index) =>
    `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`
  ).join(' ') + (close ? ' Z' : '');
}

function sampleArc(cx, cy, rx, ry, start, end, count = 48) {
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = start + (end - start) * index / count;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

function addCourtPath(parent, points, attrs = {}, close = false) {
  parent.appendChild(svgNode('path', {
    d: pathFromCourtPoints(points, close),
    fill: 'none',
    stroke: '#fffdf6',
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...attrs
  }));
}

function addParquet(parent) {
  const colors = ['#e4b16b', '#dca45e', '#e9b971', '#d79d57', '#e6b36c'];
  const plankWidth = 24;
  const plankLength = 62;
  let index = 0;

  for (let x = 10; x < 490; x += plankWidth) {
    const column = Math.floor((x - 10) / plankWidth);
    const offset = -((column % 3) * 21);
    for (let y = 10 + offset; y < 460; y += plankLength) {
      const y1 = Math.max(10, y);
      const y2 = Math.min(460, y + plankLength);
      if (y2 - y1 < 5) continue;
      const x2 = Math.min(490, x + plankWidth);
      parent.appendChild(svgNode('path', {
        d: pathFromCourtPoints([
          { x, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x, y: y2 }
        ], true),
        fill: colors[(column * 5 + index * 3) % colors.length],
        stroke: 'rgba(83,39,13,.27)',
        'stroke-width': .65,
        'data-parquet-plank': String(index)
      }));

      if ((index + column) % 3 === 0) {
        const grainY = y1 + (y2 - y1) * .57;
        addCourtPath(parent, [
          { x: x + 4, y: grainY },
          { x: Math.min(x2 - 4, x + 17), y: grainY + 1.3 }
        ], {
          stroke: 'rgba(92,43,13,.22)',
          'stroke-width': .7,
          opacity: .7,
          'data-wood-grain': String(index)
        });
      }
      index += 1;
    }
  }
}

function buildParallelBase(svg) {
  const legacyBase = svg.querySelector('[data-layer="base"]');
  if (!legacyBase || svg.querySelector('[data-layer="parallel-base"]')) return;
  legacyBase.style.display = 'none';

  sequence += 1;
  const id = `pd-parallel-${sequence}`;
  const base = svgNode('g', { 'data-layer': 'parallel-base', 'data-court-surface': 'parquet' });
  legacyBase.after(base);

  const defs = svg.querySelector('defs');
  const gradient = svgNode('linearGradient', { id: `${id}-arena`, x1: 0, y1: 0, x2: 0, y2: 1 });
  gradient.append(
    svgNode('stop', { offset: 0, 'stop-color': '#07101b' }),
    svgNode('stop', { offset: .58, 'stop-color': '#111d28' }),
    svgNode('stop', { offset: 1, 'stop-color': '#02060b' })
  );
  defs?.appendChild(gradient);

  base.appendChild(svgNode('rect', {
    width: VIEW.width,
    height: VIEW.height,
    fill: `url(#${id}-arena)`
  }));
  base.appendChild(svgNode('ellipse', {
    cx: VIEW.centerX,
    cy: 470,
    rx: 350,
    ry: 64,
    fill: 'rgba(0,0,0,.42)'
  }));

  const tl = parallelProject({ x: 10, y: 10 });
  const tr = parallelProject({ x: 490, y: 10 });
  const br = parallelProject({ x: 490, y: 460 });
  const bl = parallelProject({ x: 10, y: 460 });
  const slab = 15;

  base.appendChild(svgNode('path', {
    d: `M${bl.x},${bl.y} L${br.x},${br.y} L${br.x},${br.y + slab} L${bl.x},${bl.y + slab} Z`,
    fill: '#5c3418'
  }));
  base.appendChild(svgNode('path', {
    d: `M${tl.x},${tl.y} L${bl.x},${bl.y} L${bl.x},${bl.y + slab} L${tl.x},${tl.y + 7} Z`,
    fill: '#70401e'
  }));
  base.appendChild(svgNode('path', {
    d: `M${tr.x},${tr.y} L${br.x},${br.y} L${br.x},${br.y + slab} L${tr.x},${tr.y + 7} Z`,
    fill: '#4c2a15'
  }));
  base.appendChild(svgNode('path', {
    d: pathFromCourtPoints([
      { x: 10, y: 10 },
      { x: 490, y: 10 },
      { x: 490, y: 460 },
      { x: 10, y: 460 }
    ], true),
    fill: '#dda762',
    stroke: 'rgba(255,255,255,.36)',
    'stroke-width': 1.2
  }));

  addParquet(base);

  base.appendChild(svgNode('path', {
    d: pathFromCourtPoints([
      { x: 160, y: 10 },
      { x: 340, y: 10 },
      { x: 340, y: 200 },
      { x: 160, y: 200 }
    ], true),
    fill: 'rgba(126,60,19,.14)',
    stroke: '#fffdf6',
    'stroke-width': 2.5
  }));

  addCourtPath(base, [
    { x: 10, y: 10 },
    { x: 490, y: 10 },
    { x: 490, y: 460 },
    { x: 10, y: 460 },
    { x: 10, y: 10 }
  ]);
  addCourtPath(base, sampleArc(250, 200, 60, 60, 0, Math.PI * 2, 64));
  addCourtPath(base, [{ x: 160, y: 200 }, { x: 340, y: 200 }]);
  addCourtPath(base, [{ x: 72, y: 10 }, { x: 72, y: 52 }]);
  addCourtPath(base, sampleArc(250, 52, 178, 178, Math.PI, 0, 72));
  addCourtPath(base, [{ x: 428, y: 52 }, { x: 428, y: 10 }]);
  addCourtPath(base, sampleArc(250, 52, 42, 42, Math.PI, 0, 36), {
    stroke: 'rgba(255,253,246,.8)',
    'stroke-width': 2
  });
  addCourtPath(base, sampleArc(250, 470, 64, 64, Math.PI, Math.PI * 2, 42));

  const boardLeft = parallelProject({ x: 218, y: 39 });
  const boardRight = parallelProject({ x: 282, y: 39 });
  base.appendChild(svgNode('line', {
    x1: boardLeft.x,
    y1: boardLeft.y - 4,
    x2: boardRight.x,
    y2: boardRight.y - 4,
    stroke: '#e5f3ff',
    'stroke-width': 5,
    'stroke-linecap': 'round'
  }));
  addCourtPath(base, sampleArc(250, 52, 9, 9, 0, Math.PI * 2, 32), {
    stroke: '#ef4444',
    'stroke-width': 3.2
  }, true);

  svg.dataset.projection = 'parallel';
  svg.setAttribute('aria-label', 'Animiertes Basketball-Play auf einem Hallenparkett');
}

function styleZoomControls() {
  if (document.getElementById('courthub-court-enhancements')) return;
  const style = document.createElement('style');
  style.id = 'courthub-court-enhancements';
  style.textContent = `
    .chpd-court-wrap{--court-zoom:1;--court-pan-x:0px;--court-pan-y:0px}
    .chpd-court-wrap>.chpd-court{transform-origin:50% 50%;will-change:transform}
    .chpd-court-wrap.is-zoomed{cursor:grab}
    .chpd-court-wrap.is-zoomed:active{cursor:grabbing}
    .chpd-court-zoom{position:absolute;z-index:8;top:.65rem;right:.65rem;display:flex;align-items:center;gap:.22rem;padding:.25rem;border:1px solid rgba(255,255,255,.17);border-radius:.72rem;background:rgba(4,12,18,.84);box-shadow:0 .55rem 1.4rem rgba(0,0,0,.36);backdrop-filter:blur(.65rem);-webkit-backdrop-filter:blur(.65rem)}
    .chpd-court-zoom button{min-width:2.15rem;height:2.15rem;padding:0 .45rem;border:1px solid rgba(255,255,255,.13);border-radius:.5rem;background:#10242d;color:#f8fafc;font-weight:850;cursor:pointer;touch-action:manipulation}
    .chpd-court-zoom button:hover{background:#193642}
    .chpd-court-zoom .chpd-zoom-value{min-width:3.65rem;font-size:.68rem;color:#d9e7ed}
    @media(max-width:760px){.chpd-court-zoom{top:.42rem;right:.42rem;gap:.16rem;padding:.2rem}.chpd-court-zoom button{min-width:2rem;height:2rem}.chpd-court-zoom .chpd-zoom-value{min-width:3.25rem}}
  `;
  document.head.appendChild(style);
}

function baseSvgMetrics(wrapper) {
  const rect = wrapper.getBoundingClientRect();
  const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height) || 1;
  const width = VIEW.width * scale;
  const height = VIEW.height * scale;
  return {
    rect,
    scale,
    offsetX: (rect.width - width) / 2,
    offsetY: (rect.height - height) / 2,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2
  };
}

function actualClientToParallelSvg(wrapper, state, clientX, clientY) {
  const metrics = baseSvgMetrics(wrapper);
  const baseClientX = metrics.centerX + (clientX - metrics.centerX - state.panX) / state.zoom;
  const baseClientY = metrics.centerY + (clientY - metrics.centerY - state.panY) / state.zoom;
  return {
    x: (baseClientX - metrics.rect.left - metrics.offsetX) / metrics.scale,
    y: (baseClientY - metrics.rect.top - metrics.offsetY) / metrics.scale
  };
}

function legacySvgToClient(wrapper, point) {
  const metrics = baseSvgMetrics(wrapper);
  return {
    x: metrics.rect.left + metrics.offsetX + point.x * metrics.scale,
    y: metrics.rect.top + metrics.offsetY + point.y * metrics.scale
  };
}

function adjustedClient(wrapper, state, clientX, clientY) {
  const actual = actualClientToParallelSvg(wrapper, state, clientX, clientY);
  if (state.topDown) return legacySvgToClient(wrapper, actual);
  const court = parallelUnproject(actual);
  return legacySvgToClient(wrapper, legacyProject(court));
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

function setupInteraction(svg, wrapper, state) {
  const nativeRect = wrapper.getBoundingClientRect.bind(wrapper);
  svg.getBoundingClientRect = nativeRect;
  const pointers = new Map();
  let gesture = null;
  let viewerPan = null;

  function updateControls() {
    state.zoom = clamp(state.zoom, VIEW.minZoom, VIEW.maxZoom);
    const rect = wrapper.getBoundingClientRect();
    const maxX = Math.max(0, (state.zoom - 1) * rect.width / 2);
    const maxY = Math.max(0, (state.zoom - 1) * rect.height / 2);
    state.panX = clamp(state.panX, -maxX, maxX);
    state.panY = clamp(state.panY, -maxY, maxY);
    svg.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
    wrapper.classList.toggle('is-zoomed', state.zoom > 1.01);
    const label = wrapper.querySelector('.chpd-zoom-value');
    if (label) label.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function zoomAt(nextZoom, clientX, clientY) {
    const metrics = baseSvgMetrics(wrapper);
    const oldZoom = state.zoom;
    const newZoom = clamp(nextZoom, VIEW.minZoom, VIEW.maxZoom);
    const anchorX = (clientX - metrics.centerX - state.panX) / oldZoom;
    const anchorY = (clientY - metrics.centerY - state.panY) / oldZoom;
    state.zoom = newZoom;
    state.panX = clientX - metrics.centerX - anchorX * newZoom;
    state.panY = clientY - metrics.centerY - anchorY * newZoom;
    updateControls();
  }

  function reset() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    updateControls();
  }

  function relay(type, event) {
    const handler = svg[`on${type}`];
    if (typeof handler !== 'function') return false;
    const coordinates = adjustedClient(wrapper, state, event.clientX, event.clientY);
    event.preventDefault();
    event.stopImmediatePropagation();
    handler.call(svg, eventProxy(event, coordinates));
    return true;
  }

  function beginPinch() {
    const [a, b] = [...pointers.values()];
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const metrics = baseSvgMetrics(wrapper);
    gesture = {
      distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom: state.zoom,
      anchorX: (midpoint.x - metrics.centerX - state.panX) / state.zoom,
      anchorY: (midpoint.y - metrics.centerY - state.panY) / state.zoom
    };
  }

  svg.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        if (typeof svg.onpointercancel === 'function') {
          const adjusted = adjustedClient(wrapper, state, event.clientX, event.clientY);
          svg.onpointercancel.call(svg, eventProxy(event, adjusted));
        }
        beginPinch();
        viewerPan = null;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }

    if (typeof svg.onpointerdown !== 'function' && state.zoom > 1.01) {
      viewerPan = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: state.panX,
        panY: state.panY
      };
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    relay('pointerdown', event);
  }, true);

  svg.addEventListener('pointermove', event => {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (gesture && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const metrics = baseSvgMetrics(wrapper);
      state.zoom = clamp(
        gesture.zoom * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / gesture.distance,
        VIEW.minZoom,
        VIEW.maxZoom
      );
      state.panX = midpoint.x - metrics.centerX - gesture.anchorX * state.zoom;
      state.panY = midpoint.y - metrics.centerY - gesture.anchorY * state.zoom;
      updateControls();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (viewerPan?.pointerId === event.pointerId) {
      state.panX = viewerPan.panX + event.clientX - viewerPan.startX;
      state.panY = viewerPan.panY + event.clientY - viewerPan.startY;
      updateControls();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    relay('pointermove', event);
  }, true);

  function finishPointer(type, event) {
    const wasGesture = Boolean(gesture || viewerPan?.pointerId === event.pointerId);
    pointers.delete(event.pointerId);
    if (pointers.size < 2) gesture = null;
    if (viewerPan?.pointerId === event.pointerId) viewerPan = null;
    if (wasGesture) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    relay(type, event);
  }

  svg.addEventListener('pointerup', event => finishPointer('pointerup', event), true);
  svg.addEventListener('pointercancel', event => finishPointer('pointercancel', event), true);

  svg.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAt(state.zoom * Math.exp(-event.deltaY * .0025), event.clientX, event.clientY);
  }, { passive: false, capture: true });

  svg.addEventListener('dblclick', event => {
    event.preventDefault();
    if (state.zoom > 1.05) reset();
    else zoomAt(1.8, event.clientX, event.clientY);
  }, true);

  state.controller = {
    zoomIn() {
      const metrics = baseSvgMetrics(wrapper);
      zoomAt(state.zoom * 1.28, metrics.centerX, metrics.centerY);
    },
    zoomOut() {
      const metrics = baseSvgMetrics(wrapper);
      zoomAt(state.zoom / 1.28, metrics.centerX, metrics.centerY);
    },
    reset,
    getZoom: () => state.zoom
  };
  updateControls();
}

function addControls(wrapper, state) {
  if (wrapper.querySelector('[data-role="court-zoom-controls"]')) return;
  const controls = document.createElement('div');
  controls.className = 'chpd-court-zoom';
  controls.dataset.role = 'court-zoom-controls';
  controls.innerHTML = `
    <button type="button" data-zoom="out" aria-label="Spielfeld verkleinern">−</button>
    <button type="button" data-zoom="reset" class="chpd-zoom-value" aria-label="Zoom zurücksetzen">100%</button>
    <button type="button" data-zoom="in" aria-label="Spielfeld vergrößern">＋</button>
  `;
  controls.addEventListener('pointerdown', event => event.stopPropagation());
  controls.addEventListener('click', event => {
    const action = event.target.closest('[data-zoom]')?.dataset.zoom;
    if (action === 'in') state.controller.zoomIn();
    if (action === 'out') state.controller.zoomOut();
    if (action === 'reset') state.controller.reset();
  });
  wrapper.appendChild(controls);
}

function watchDynamicLayers(svg) {
  const layers = ['zones', 'paths', 'objects', 'tokens', 'overlay']
    .map(name => svg.querySelector(`[data-layer="${name}"]`))
    .filter(Boolean);
  layers.forEach(layer => [...layer.children].forEach(parallelizeElement));
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) parallelizeElement(node);
      });
    });
  });
  layers.forEach(layer => observer.observe(layer, { childList: true, subtree: false }));
  return observer;
}

export function enhanceCourt(svg, options = {}) {
  if (!svg || enhanced.has(svg)) return enhanced.get(svg)?.controller || null;
  const topDown = svg.dataset.projection === 'top-down';
  if (!topDown) buildParallelBase(svg);
  const observer = topDown ? { disconnect() {} } : watchDynamicLayers(svg);
  const state = { zoom: 1, panX: 0, panY: 0, observer, controller: null, topDown };
  enhanced.set(svg, state);

  const wrapper = svg.parentElement;
  if (options.interactive !== false && wrapper?.classList.contains('chpd-court-wrap')) {
    styleZoomControls();
    setupInteraction(svg, wrapper, state);
    addControls(wrapper, state);
  }
  return state.controller;
}

function scan(root = document) {
  root.querySelectorAll?.('.chpd-court').forEach(svg => enhanceCourt(svg));
}

function boot() {
  styleZoomControls();
  scan();
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('.chpd-court')) enhanceCourt(node);
        scan(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { VIEW as COURT_ENHANCEMENT_VIEW };
