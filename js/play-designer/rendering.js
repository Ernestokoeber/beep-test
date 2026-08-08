const core = window.BT.tactics.__core;
const SVG_NS = 'http://www.w3.org/2000/svg';

export const COURT_VIEW = Object.freeze({
  width: 760,
  height: 550,
  originX: 110,
  originY: 20,
  scale: 1.08,
  courtWidth: 540,
  courtHeight: 507.6
});

let courtSequence = 0;

function node(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) element.setAttribute(key, String(value));
  });
  return element;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function projectPoint(value) {
  const x = Number(value?.x ?? 250);
  const y = Number(value?.y ?? 235);
  return {
    x: COURT_VIEW.originX + x * COURT_VIEW.scale,
    y: COURT_VIEW.originY + y * COURT_VIEW.scale,
    depth: 0,
    scale: 1
  };
}

export function unprojectPoint(value) {
  return {
    x: core.clamp((Number(value?.x ?? 380) - COURT_VIEW.originX) / COURT_VIEW.scale, 16, 484),
    y: core.clamp((Number(value?.y ?? 274) - COURT_VIEW.originY) / COURT_VIEW.scale, 16, 454)
  };
}

export function depthScale(y) {
  return 1;
}

function pointsPath(points, close = false) {
  if (!points.length) return '';
  const projected = points.map(projectPoint);
  const commands = projected.map((point, index) =>
    `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`
  );
  return commands.join(' ') + (close ? ' Z' : '');
}

function smoothProjectedPath(points) {
  const projected = (points || []).map(projectPoint);
  if (!projected.length) return '';
  if (projected.length === 1) return `M${projected[0].x},${projected[0].y}`;
  if (projected.length === 2) {
    return `M${projected[0].x},${projected[0].y} L${projected[1].x},${projected[1].y}`;
  }
  let d = `M${projected[0].x},${projected[0].y}`;
  for (let index = 1; index < projected.length - 1; index++) {
    const current = projected[index];
    const next = projected[index + 1];
    d += ` Q${current.x},${current.y} ${(current.x + next.x) / 2},${(current.y + next.y) / 2}`;
  }
  const last = projected[projected.length - 1];
  return d + ` T${last.x},${last.y}`;
}

function sampleArc(cx, cy, rx, ry, start, end, count = 48) {
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = start + (end - start) * index / count;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

function polygon(parent, points, attrs = {}) {
  parent.appendChild(node('path', { d: pointsPath(points, true), ...attrs }));
}

function baseLine(parent, points, extra = {}) {
  parent.appendChild(node('path', {
    d: pointsPath(points),
    fill: 'none',
    stroke: '#fffdf6',
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity: .96,
    ...extra
  }));
}

function buildCourtBase(svg) {
  const prefix = svg.dataset.pdPrefix;
  const base = svg.querySelector('[data-layer="base"]');
  base.appendChild(node('rect', {
    width: COURT_VIEW.width,
    height: COURT_VIEW.height,
    fill: `url(#${prefix}-arena)`
  }));

  polygon(base, [
    { x: 10, y: 10 },
    { x: 490, y: 10 },
    { x: 490, y: 460 },
    { x: 10, y: 460 }
  ], {
    fill: `url(#${prefix}-floor)`,
    stroke: 'rgba(255,255,255,.35)',
    'stroke-width': 1.2,
    filter: `url(#${prefix}-court-shadow)`
  });

  const colors = ['#e4b16b', '#dca45e', '#e9b971', '#d79d57', '#e6b36c'];
  let plankIndex = 0;
  for (let x = 10; x < 490; x += 24) {
    const column = Math.floor((x - 10) / 24);
    const offset = -((column % 3) * 21);
    for (let y = 10 + offset; y < 460; y += 62) {
      const y1 = Math.max(10, y);
      const y2 = Math.min(460, y + 62);
      if (y2 - y1 < 5) continue;
      const path = node('path', {
        d: pointsPath([
          { x, y: y1 },
          { x: Math.min(490, x + 24), y: y1 },
          { x: Math.min(490, x + 24), y: y2 },
          { x, y: y2 }
        ], true),
        fill: colors[(column * 5 + plankIndex * 3) % colors.length],
        stroke: 'rgba(83,39,13,.24)',
        'stroke-width': .65,
        'data-parquet-plank': String(plankIndex)
      });
      base.appendChild(path);
      plankIndex += 1;
    }
  }

  polygon(base, [
    { x: 160, y: 10 },
    { x: 340, y: 10 },
    { x: 340, y: 200 },
    { x: 160, y: 200 }
  ], {
    fill: 'rgba(132,64,21,.16)',
    stroke: '#fffdf6',
    'stroke-width': 2.5
  });

  baseLine(base, [
    { x: 10, y: 10 },
    { x: 490, y: 10 },
    { x: 490, y: 460 },
    { x: 10, y: 460 },
    { x: 10, y: 10 }
  ]);
  baseLine(base, sampleArc(250, 200, 60, 60, 0, Math.PI * 2, 64));
  baseLine(base, [{ x: 160, y: 200 }, { x: 340, y: 200 }]);
  baseLine(base, [{ x: 72, y: 10 }, { x: 72, y: 52 }]);
  baseLine(base, sampleArc(250, 52, 178, 178, Math.PI, 0, 72));
  baseLine(base, [{ x: 428, y: 52 }, { x: 428, y: 10 }]);
  baseLine(base, sampleArc(250, 52, 42, 42, Math.PI, 0, 36), {
    stroke: 'rgba(255,253,246,.78)',
    'stroke-width': 2
  });
  baseLine(base, sampleArc(250, 470, 64, 64, Math.PI, Math.PI * 2, 42));

  const backboardLeft = projectPoint({ x: 218, y: 39 });
  const backboardRight = projectPoint({ x: 282, y: 39 });
  base.appendChild(node('line', {
    x1: backboardLeft.x,
    y1: backboardLeft.y - 4,
    x2: backboardRight.x,
    y2: backboardRight.y - 4,
    stroke: '#e5f3ff',
    'stroke-width': 5,
    'stroke-linecap': 'round',
    filter: `url(#${prefix}-glow)`
  }));
  base.appendChild(node('path', {
    d: pointsPath(sampleArc(250, 52, 9, 9, 0, Math.PI * 2, 32), true),
    fill: 'none',
    stroke: '#ef4444',
    'stroke-width': 3.2,
    filter: `url(#${prefix}-glow)`
  }));
  const hoop = projectPoint({ x: 250, y: 52 });
  base.appendChild(node('line', {
    x1: hoop.x,
    y1: hoop.y - 10,
    x2: hoop.x,
    y2: hoop.y - 24,
    stroke: 'rgba(226,232,240,.8)',
    'stroke-width': 3
  }));
}

export function createCourt(className = 'chpd-court tactics-preview-court') {
  courtSequence += 1;
  const prefix = `pd-${courtSequence}`;
  const svg = node('svg', {
    viewBox: `0 0 ${COURT_VIEW.width} ${COURT_VIEW.height}`,
    class: className,
    role: 'img',
    'aria-label': 'Zweidimensionales Basketball-Halbfeld aus der Vogelperspektive',
    preserveAspectRatio: 'xMidYMid meet',
    'data-projection': 'top-down'
  });
  svg.dataset.pdPrefix = prefix;
  svg.innerHTML = `
    <defs>
      <linearGradient id="${prefix}-arena" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#07101b"/>
        <stop offset=".55" stop-color="#101a24"/>
        <stop offset="1" stop-color="#02060b"/>
      </linearGradient>
      <linearGradient id="${prefix}-floor" x1="0" y1="0" x2="1" y2=".82">
        <stop offset="0" stop-color="#d7a15e"/>
        <stop offset=".24" stop-color="#f0c37b"/>
        <stop offset=".5" stop-color="#c98943"/>
        <stop offset=".76" stop-color="#edbd70"/>
        <stop offset="1" stop-color="#bd7739"/>
      </linearGradient>
      <linearGradient id="${prefix}-offense-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1769ad"/>
        <stop offset="1" stop-color="#06345e"/>
      </linearGradient>
      <radialGradient id="${prefix}-offense-top" cx=".34" cy=".24" r=".8">
        <stop offset="0" stop-color="#6ec8ff"/>
        <stop offset=".48" stop-color="#1976bd"/>
        <stop offset="1" stop-color="#084274"/>
      </radialGradient>
      <linearGradient id="${prefix}-defense-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#343b48"/>
        <stop offset="1" stop-color="#080b10"/>
      </linearGradient>
      <radialGradient id="${prefix}-defense-top" cx=".34" cy=".24" r=".8">
        <stop offset="0" stop-color="#5a6472"/>
        <stop offset=".55" stop-color="#1f2937"/>
        <stop offset="1" stop-color="#080b10"/>
      </radialGradient>
      <radialGradient id="${prefix}-ball" cx=".32" cy=".25" r=".78">
        <stop offset="0" stop-color="#ffbd66"/>
        <stop offset=".5" stop-color="#f97316"/>
        <stop offset="1" stop-color="#9a3412"/>
      </radialGradient>
      <filter id="${prefix}-court-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".52"/>
      </filter>
      <filter id="${prefix}-token-shadow" x="-80%" y="-80%" width="260%" height="280%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".55"/>
      </filter>
      <filter id="${prefix}-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="1.2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${prefix}-blur"><feGaussianBlur stdDeviation="15"/></filter>
      <marker id="${prefix}-arrow-red" markerWidth="10" markerHeight="10" refX="8.5" refY="5" orient="auto">
        <path d="M0 0L10 5L0 10Z" fill="#b20e19"/>
      </marker>
      <marker id="${prefix}-arrow-dark" markerWidth="10" markerHeight="10" refX="8.5" refY="5" orient="auto">
        <path d="M0 0L10 5L0 10Z" fill="#111827"/>
      </marker>
    </defs>
    <g data-layer="base"></g>
    <g data-layer="zones"></g>
    <g data-layer="paths"></g>
    <g data-layer="objects"></g>
    <g data-layer="tokens"></g>
    <g data-layer="overlay"></g>
  `;
  buildCourtBase(svg);
  return svg;
}

function quadraticControl(start, end, curve = 0) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: (start.x + end.x) / 2 - dy / length * curve,
    y: (start.y + end.y) / 2 + dx / length * curve
  };
}

export function bezierPath(start, end, curve = 0) {
  const control = quadraticControl(start, end, curve);
  const points = Array.from({ length: 29 }, (_, index) => {
    const t = index / 28;
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
    };
  });
  return smoothProjectedPath(points);
}

export function polylinePath(points) {
  return smoothProjectedPath(points);
}

function layers(svg) {
  const output = {};
  ['zones', 'paths', 'objects', 'tokens', 'overlay'].forEach(name => {
    output[name] = svg.querySelector(`[data-layer="${name}"]`);
    output[name].replaceChildren();
  });
  return output;
}

function tokenLabel(element, defense) {
  const raw = String(element.role || (defense ? 'X' : 'O'));
  return raw.length > 4 ? raw.slice(0, 4) : raw;
}

function drawToken(parent, element, selectedId) {
  const projected = projectPoint(element);
  const prefix = parent.ownerSVGElement.dataset.pdPrefix;
  const defense = element.type === 'defense';
  const zoneDefense = defense && element.defenseMode === 'zone';
  const labelValue = tokenLabel(element, defense);
  const group = node('g', {
    class: `token ${defense ? `defense-token ${zoneDefense ? 'defense-zone' : 'defense-man'}` : 'offense-token'}`,
    'data-element-id': element.id,
    transform: `translate(${projected.x} ${projected.y})`,
    role: 'img',
    'aria-label': defense
      ? `${zoneDefense ? 'Zonenverteidigung' : 'Mannverteidigung'} ${labelValue}`
      : `Angriffsspieler ${labelValue}`,
    filter: `url(#${prefix}-token-shadow)`
  });

  if (!defense) {
    group.appendChild(node('circle', {
      r: 22,
      fill: '#0d6b46',
      stroke: '#f8fafc',
      'stroke-width': 3,
      'data-token-shape': 'circle'
    }));
  } else if (zoneDefense) {
    group.appendChild(node('path', {
      d: 'M0 -25 L25 0 L0 25 L-25 0 Z',
      fill: '#fff8ed',
      stroke: '#b45309',
      'stroke-width': 3.2,
      'data-defense-symbol': 'diamond'
    }));
  } else {
    group.appendChild(node('path', {
      d: 'M-20 -20 L20 20 M20 -20 L-20 20',
      fill: 'none',
      stroke: '#172033',
      'stroke-width': 8,
      'stroke-linecap': 'round',
      'data-defense-symbol': 'x'
    }));
  }

  const label = node('text', {
    x: 0,
    y: 5,
    fill: defense ? (zoneDefense ? '#7c2d12' : '#ffffff') : '#ffffff',
    'font-size': defense ? 11 : 17,
    'font-weight': 950,
    'text-anchor': 'middle',
    'pointer-events': 'none',
    'paint-order': 'stroke',
    stroke: defense && !zoneDefense ? '#172033' : 'rgba(4,32,57,.35)',
    'stroke-width': defense && !zoneDefense ? 3.4 : 1.4
  });
  label.textContent = labelValue;
  group.appendChild(label);

  if (selectedId === element.id) {
    group.appendChild(node('circle', { r: 31, class: 'selected' }));
  }
  parent.appendChild(group);
}

function drawBall(parent, element, selectedId) {
  const projected = projectPoint(element);
  const prefix = parent.ownerSVGElement.dataset.pdPrefix;
  const scale = .92;
  const group = node('g', {
    class: 'token ball-token',
    'data-element-id': element.id,
    transform: `translate(${projected.x} ${projected.y}) scale(${scale})`,
    filter: `url(#${prefix}-token-shadow)`
  });
  group.appendChild(node('circle', {
    r: 11,
    fill: `url(#${prefix}-ball)`,
    stroke: '#54240d',
    'stroke-width': 1.5
  }));
  group.appendChild(node('path', {
    d: 'M-11 0H11M0-11C-5-6-5 6 0 11M0-11C5-6 5 6 0 11',
    fill: 'none',
    stroke: '#6b2d10',
    'stroke-width': 1.25
  }));
  if (selectedId === element.id) {
    group.appendChild(node('circle', { r: 17, class: 'selected' }));
  }
  parent.appendChild(group);
}

function screenEndpoints(action, length = 22) {
  const radians = action.angle * Math.PI / 180;
  const dx = Math.cos(radians) * length;
  const dy = Math.sin(radians) * length;
  return [
    { x: action.x - dx, y: action.y - dy },
    { x: action.x + dx, y: action.y + dy }
  ];
}

function drawScreen(parent, action, active = false) {
  const [start, end] = screenEndpoints(action, active ? 24 : 21);
  const p1 = projectPoint(start);
  const p2 = projectPoint(end);
  const center = projectPoint(action);
  const width = active ? 7 : 5.5;
  parent.appendChild(node('line', {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    class: 'screen',
    stroke: active ? '#111827' : 'rgba(17,24,39,.86)',
    'stroke-width': width,
    'stroke-linecap': 'round',
    'data-action-id': action.id
  }));
  parent.appendChild(node('line', {
    x1: center.x - 5 * center.scale,
    y1: center.y - 8 * center.scale,
    x2: center.x + 5 * center.scale,
    y2: center.y + 8 * center.scale,
    stroke: '#111827',
    'stroke-width': active ? 4.2 : 3.2,
    'stroke-linecap': 'round',
    opacity: active ? 1 : .82,
    'data-action-id': action.id
  }));
}

function drawStatic(target, element, selectedId) {
  const prefix = target.paths.ownerSVGElement.dataset.pdPrefix;
  if (element.type === 'zone') {
    const points = element.shape === 'circle'
      ? sampleArc(element.x, element.y, element.width / 2, element.height / 2, 0, Math.PI * 2, 52)
      : [
          { x: element.x - element.width / 2, y: element.y - element.height / 2 },
          { x: element.x + element.width / 2, y: element.y - element.height / 2 },
          { x: element.x + element.width / 2, y: element.y + element.height / 2 },
          { x: element.x - element.width / 2, y: element.y + element.height / 2 }
        ];
    target.zones.appendChild(node('path', {
      d: pointsPath(points, true),
      fill: 'rgba(30,136,229,.18)',
      stroke: selectedId === element.id ? '#fff' : '#38a8eb',
      'stroke-width': selectedId === element.id ? 4 : 2.4,
      'stroke-dasharray': element.shape === 'circle' ? null : '8 5',
      'data-element-id': element.id
    }));
  } else if (element.type === 'cone') {
    const projected = projectPoint(element);
    const scale = projected.scale;
    target.objects.appendChild(node('path', {
      d: `M${projected.x} ${projected.y - 18 * scale} L${projected.x - 12 * scale} ${projected.y + 8 * scale} L${projected.x + 12 * scale} ${projected.y + 8 * scale} Z`,
      fill: '#ff9f2f',
      stroke: selectedId === element.id ? '#fff' : '#78350f',
      'stroke-width': 2.2,
      filter: `url(#${prefix}-token-shadow)`,
      'data-element-id': element.id
    }));
  } else if (element.type === 'label') {
    const projected = projectPoint(element);
    const text = node('text', {
      x: projected.x,
      y: projected.y - 8,
      fill: '#fff',
      'font-size': 15 * projected.scale,
      'font-weight': 900,
      'text-anchor': 'middle',
      stroke: 'rgba(0,0,0,.72)',
      'stroke-width': 4,
      'paint-order': 'stroke',
      'data-element-id': element.id
    });
    text.textContent = element.text;
    target.objects.appendChild(text);
  } else if (element.type === 'arrow') {
    const style = window.BT.tactics.arrowStyle(element.kind);
    const pass = element.kind === 'pass';
    target.paths.appendChild(node('path', {
      d: bezierPath(element, { x: element.x2, y: element.y2 }, element.curve),
      class: `tactics-arrow ${element.kind}`,
      fill: 'none',
      stroke: pass ? '#a70f1a' : (element.kind === 'screen' ? '#111827' : '#b20e19'),
      'stroke-width': element.kind === 'screen' ? 7 : 4.2,
      'stroke-dasharray': pass ? '11 8' : style.dash.join(' '),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'marker-end': element.kind === 'screen' ? null : `url(#${prefix}-arrow-red)`,
      filter: `url(#${prefix}-glow)`,
      'data-element-id': element.id
    }));
  }
}

function drawGuides(target, step, selectedActionId, showGuides) {
  const prefix = target.paths.ownerSVGElement.dataset.pdPrefix;
  const transition = core.normalizeTransition(step && step.transition);
  transition.motions.forEach(action => {
    if (!showGuides && selectedActionId !== action.id) return;
    const dribble = action.kind === 'dribble';
    target.paths.appendChild(node('path', {
      d: polylinePath(action.path),
      class: `motion ${dribble ? 'dribble' : 'run'}${selectedActionId === action.id ? ' active' : ''}`,
      fill: 'none',
      stroke: selectedActionId === action.id ? '#ef4444' : '#b20e19',
      'stroke-width': selectedActionId === action.id ? 5.2 : 4.2,
      'stroke-dasharray': dribble ? '3 7' : null,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'marker-end': `url(#${prefix}-arrow-red)`,
      filter: `url(#${prefix}-glow)`,
      opacity: showGuides ? .96 : .76,
      'data-action-id': action.id
    }));
  });
  transition.passes.forEach(action => {
    if (!showGuides && selectedActionId !== action.id) return;
    const from = core.elementById(step, action.fromId);
    const to = core.elementById(step, action.toId);
    if (!from || !to) return;
    target.paths.appendChild(node('path', {
      d: bezierPath(from, to, action.curve),
      class: 'pass',
      fill: 'none',
      stroke: selectedActionId === action.id ? '#f43f5e' : '#a70f1a',
      'stroke-width': selectedActionId === action.id ? 5 : 4,
      'stroke-dasharray': '12 9',
      'stroke-linecap': 'round',
      'marker-end': `url(#${prefix}-arrow-red)`,
      filter: `url(#${prefix}-glow)`,
      opacity: .96,
      'data-action-id': action.id
    }));
  });
  transition.screens.forEach(action => {
    if (!showGuides && selectedActionId !== action.id) return;
    drawScreen(target.paths, action, selectedActionId === action.id);
  });
}

export function drawCourt(svg, snapshot, options = {}) {
  const target = layers(svg);
  core.elements(snapshot)
    .filter(item => ['arrow', 'cone', 'zone', 'label'].includes(item.type))
    .sort((a, b) => (a.y || 0) - (b.y || 0))
    .forEach(item => drawStatic(target, item, options.selectedId));
  if (options.sourceStep) {
    drawGuides(target, options.sourceStep, options.selectedActionId, options.showGuides !== false);
  }
  core.elements(snapshot)
    .filter(item => item.type === 'offense' || item.type === 'defense')
    .sort((a, b) => a.y - b.y)
    .forEach(item => drawToken(target.tokens, item, options.selectedId));
  core.elements(snapshot, 'ball')
    .sort((a, b) => a.y - b.y)
    .forEach(item => drawBall(target.tokens, item, options.selectedId));
  (snapshot._activeScreens || []).forEach(action => drawScreen(target.overlay, action, true));
}

export function appendDraftPath(svg, points) {
  if (!points || points.length < 2) return;
  const prefix = svg.dataset.pdPrefix;
  svg.querySelector('[data-layer="overlay"]').appendChild(node('path', {
    d: polylinePath(points),
    class: 'motion active',
    fill: 'none',
    stroke: '#ef4444',
    'stroke-width': 5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'marker-end': `url(#${prefix}-arrow-red)`,
    filter: `url(#${prefix}-glow)`
  }));
}

export function formatTime(seconds) {
  const value = Math.max(0, seconds || 0);
  const whole = Math.floor(value);
  const tenths = Math.floor((value - whole) * 10);
  return `${whole}.${tenths} s`;
}

export function actionLabel(action, step) {
  if (action.type === 'move') return 'Lauf ' + (core.elementById(step, action.elementId)?.role || 'Spieler');
  if (action.type === 'pass') {
    return 'Pass ' + (core.elementById(step, action.fromId)?.role || '?')
      + ' → ' + (core.elementById(step, action.toId)?.role || '?');
  }
  return 'Screen ' + (core.elementById(step, action.elementId)?.role || 'Spieler');
}

export function transitionActions(step) {
  const transition = core.normalizeTransition(step && step.transition);
  return [...transition.motions, ...transition.passes, ...transition.screens]
    .sort((a, b) => a.start - b.start || a.duration - b.duration);
}

export function pointFromEvent(svg, event) {
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(
    rect.width / COURT_VIEW.width,
    rect.height / COURT_VIEW.height
  ) || 1;
  const renderedWidth = COURT_VIEW.width * scale;
  const renderedHeight = COURT_VIEW.height * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  return unprojectPoint({
    x: (event.clientX - rect.left - offsetX) / scale,
    y: (event.clientY - rect.top - offsetY) / scale
  });
}
