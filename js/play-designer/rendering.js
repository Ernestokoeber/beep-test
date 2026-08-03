const core = window.BT.tactics.__core;
const SVG_NS = 'http://www.w3.org/2000/svg';

function node(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => { if (value != null) element.setAttribute(key, String(value)); });
  return element;
}

export function createCourt(className = 'chpd-court tactics-preview-court') {
  const svg = node('svg', { viewBox: '0 0 500 470', class: className, role: 'img', 'aria-label': 'Animiertes Basketball-Play' });
  svg.innerHTML = `
    <defs>
      <linearGradient id="pd-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b87536"/><stop offset=".2" stop-color="#dc9e58"/><stop offset=".42" stop-color="#c37f3e"/><stop offset=".64" stop-color="#e1a965"/><stop offset=".84" stop-color="#bf7738"/><stop offset="1" stop-color="#dda660"/></linearGradient>
      <pattern id="pd-planks" width="62" height="470" patternUnits="userSpaceOnUse"><rect width="62" height="470" fill="url(#pd-wood)"/><path d="M61 0V470" stroke="rgba(91,46,17,.24)"/><path d="M0 78H62M0 236H62M0 392H62" stroke="rgba(255,255,255,.08)"/></pattern>
      <filter id="pd-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".38"/></filter>
      <marker id="pd-arrow-white" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9Z" fill="#f8fafc"/></marker>
      <marker id="pd-arrow-yellow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9Z" fill="#fbbf24"/></marker>
    </defs>
    <rect width="500" height="470" fill="url(#pd-planks)"/>
    <rect x="10" y="10" width="480" height="450" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/>
    <rect x="160" y="10" width="180" height="190" fill="rgba(83,45,20,.13)" stroke="#fff" stroke-width="2.2"/>
    <circle cx="250" cy="200" r="60" fill="none" stroke="#fff" stroke-width="2.2"/>
    <path d="M106 10A144 144 0 0 0 394 10" fill="none" stroke="#fff" stroke-width="2.2"/>
    <path d="M220 40H280" stroke="#fff" stroke-width="4"/><circle cx="250" cy="52" r="8" fill="none" stroke="#ff6b2c" stroke-width="3"/>
    <path d="M10 418A58 58 0 0 1 68 460M490 418A58 58 0 0 0 432 460" fill="none" stroke="#fff" stroke-width="2.2"/>
    <g data-layer="zones"></g><g data-layer="paths"></g><g data-layer="objects"></g><g data-layer="tokens"></g><g data-layer="overlay"></g>
  `;
  return svg;
}

export function bezierPath(start, end, curve = 0) {
  const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy) || 1;
  const cx = (start.x + end.x) / 2 - dy / length * curve;
  const cy = (start.y + end.y) / 2 + dx / length * curve;
  return `M${start.x},${start.y} Q${cx},${cy} ${end.x},${end.y}`;
}

export function polylinePath(points) {
  if (!points || !points.length) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index], next = points[index + 1];
    d += ` Q${current.x},${current.y} ${(current.x + next.x) / 2},${(current.y + next.y) / 2}`;
  }
  const last = points[points.length - 1];
  return d + ` T${last.x},${last.y}`;
}

function layers(svg) {
  const output = {};
  ['zones', 'paths', 'objects', 'tokens', 'overlay'].forEach(name => {
    output[name] = svg.querySelector(`[data-layer="${name}"]`);
    output[name].replaceChildren();
  });
  return output;
}

function drawToken(parent, element, selectedId) {
  const group = node('g', { class: 'token', 'data-element-id': element.id, transform: `translate(${element.x} ${element.y})`, filter: 'url(#pd-shadow)' });
  const defense = element.type === 'defense';
  group.appendChild(node('circle', { r: 20, fill: defense ? '#123d68' : '#f38a22', stroke: defense ? '#93c5fd' : '#fff7ed', 'stroke-width': 3 }));
  if (defense) group.appendChild(node('path', { d: 'M-8 -8L8 8M8 -8L-8 8', stroke: '#dbeafe', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: .55 }));
  const label = node('text', { x: 0, y: 5, fill: '#fff', 'font-size': 12, 'font-weight': 900, 'text-anchor': 'middle', 'pointer-events': 'none' });
  label.textContent = element.role || (defense ? 'X' : 'O');
  group.appendChild(label);
  if (selectedId === element.id) group.appendChild(node('circle', { r: 27, class: 'selected' }));
  parent.appendChild(group);
}

function drawBall(parent, element, selectedId) {
  const group = node('g', { class: 'token', 'data-element-id': element.id, transform: `translate(${element.x} ${element.y})`, filter: 'url(#pd-shadow)' });
  group.appendChild(node('circle', { r: 10, fill: '#f97316', stroke: '#3f210d', 'stroke-width': 1.5 }));
  group.appendChild(node('path', { d: 'M-10 0H10M0-10C-4-5-4 5 0 10M0-10C4-5 4 5 0 10', fill: 'none', stroke: '#5c2f10', 'stroke-width': 1.2 }));
  if (selectedId === element.id) group.appendChild(node('circle', { r: 17, class: 'selected' }));
  parent.appendChild(group);
}

function drawStatic(target, element, selectedId) {
  if (element.type === 'zone') {
    const shape = element.shape === 'circle'
      ? node('ellipse', { cx: element.x, cy: element.y, rx: element.width / 2, ry: element.height / 2 })
      : node('rect', { x: element.x - element.width / 2, y: element.y - element.height / 2, width: element.width, height: element.height, rx: 12 });
    Object.entries({ fill: 'rgba(14,165,233,.16)', stroke: selectedId === element.id ? '#fff' : '#38bdf8', 'stroke-width': selectedId === element.id ? 3 : 2, 'data-element-id': element.id }).forEach(([key, value]) => shape.setAttribute(key, value));
    target.zones.appendChild(shape);
  } else if (element.type === 'cone') {
    target.objects.appendChild(node('path', { d: `M${element.x} ${element.y - 13}L${element.x - 11} ${element.y + 11}H${element.x + 11}Z`, fill: '#ff9f2f', stroke: selectedId === element.id ? '#fff' : '#7c3f0a', 'stroke-width': 2, 'data-element-id': element.id }));
  } else if (element.type === 'label') {
    const text = node('text', { x: element.x, y: element.y, fill: '#fff', 'font-size': 15, 'font-weight': 850, 'text-anchor': 'middle', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 3, 'paint-order': 'stroke', 'data-element-id': element.id });
    text.textContent = element.text;
    target.objects.appendChild(text);
  } else if (element.type === 'arrow') {
    const style = window.BT.tactics.arrowStyle(element.kind);
    target.paths.appendChild(node('path', { d: bezierPath(element, { x: element.x2, y: element.y2 }, element.curve), class: 'tactics-arrow ' + element.kind, fill: 'none', stroke: style.color, 'stroke-width': element.kind === 'screen' ? 6 : 3, 'stroke-dasharray': style.dash.join(' '), 'stroke-linecap': 'round', 'marker-end': element.kind === 'screen' ? null : 'url(#pd-arrow-white)', 'data-element-id': element.id }));
  }
}

function drawGuides(target, step, selectedActionId, showGuides) {
  const transition = core.normalizeTransition(step && step.transition);
  transition.motions.forEach(action => {
    if (!showGuides && selectedActionId !== action.id) return;
    target.paths.appendChild(node('path', { d: polylinePath(action.path), class: 'motion' + (selectedActionId === action.id ? ' active' : ''), 'marker-end': 'url(#pd-arrow-white)', 'data-action-id': action.id }));
  });
  transition.passes.forEach(action => {
    if (!showGuides && selectedActionId !== action.id) return;
    const from = core.elementById(step, action.fromId), to = core.elementById(step, action.toId);
    if (from && to) target.paths.appendChild(node('path', { d: bezierPath(from, to, action.curve), class: 'pass', 'marker-end': 'url(#pd-arrow-yellow)', 'data-action-id': action.id }));
  });
  transition.screens.forEach(action => {
    if (!showGuides && selectedActionId !== action.id) return;
    const radians = action.angle * Math.PI / 180, dx = Math.cos(radians) * 20, dy = Math.sin(radians) * 20;
    target.paths.appendChild(node('line', { x1: action.x - dx, y1: action.y - dy, x2: action.x + dx, y2: action.y + dy, class: 'screen', 'data-action-id': action.id }));
  });
}

export function drawCourt(svg, snapshot, options = {}) {
  const target = layers(svg);
  core.elements(snapshot).filter(item => ['arrow', 'cone', 'zone', 'label'].includes(item.type)).forEach(item => drawStatic(target, item, options.selectedId));
  if (options.sourceStep) drawGuides(target, options.sourceStep, options.selectedActionId, options.showGuides !== false);
  core.elements(snapshot).filter(item => item.type === 'offense' || item.type === 'defense').forEach(item => drawToken(target.tokens, item, options.selectedId));
  core.elements(snapshot, 'ball').forEach(item => drawBall(target.tokens, item, options.selectedId));
  (snapshot._activeScreens || []).forEach(action => {
    const radians = action.angle * Math.PI / 180, dx = Math.cos(radians) * 22, dy = Math.sin(radians) * 22;
    target.overlay.appendChild(node('line', { x1: action.x - dx, y1: action.y - dy, x2: action.x + dx, y2: action.y + dy, class: 'screen' }));
  });
}

export function appendDraftPath(svg, points) {
  if (!points || points.length < 2) return;
  svg.querySelector('[data-layer="overlay"]').appendChild(node('path', { d: polylinePath(points), class: 'motion active', 'marker-end': 'url(#pd-arrow-white)' }));
}

export function formatTime(seconds) {
  const value = Math.max(0, seconds || 0), whole = Math.floor(value), tenths = Math.floor((value - whole) * 10);
  return `${whole}.${tenths} s`;
}

export function actionLabel(action, step) {
  if (action.type === 'move') return 'Lauf ' + (core.elementById(step, action.elementId)?.role || 'Spieler');
  if (action.type === 'pass') return 'Pass ' + (core.elementById(step, action.fromId)?.role || '?') + ' → ' + (core.elementById(step, action.toId)?.role || '?');
  return 'Screen ' + (core.elementById(step, action.elementId)?.role || 'Spieler');
}

export function transitionActions(step) {
  const transition = core.normalizeTransition(step && step.transition);
  return [...transition.motions, ...transition.passes, ...transition.screens].sort((a, b) => a.start - b.start || a.duration - b.duration);
}

export function pointFromEvent(svg, event) {
  const rect = svg.getBoundingClientRect();
  return { x: core.clamp((event.clientX - rect.left) / rect.width * 500, 16, 484), y: core.clamp((event.clientY - rect.top) / rect.height * 470, 16, 454) };
}
