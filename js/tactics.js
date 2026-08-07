window.BT = window.BT || {};

BT.tactics = (function() {
  'use strict';

  const U = BT.util || {};
  const WRITER_ROLES = new Set(['admin', 'coach', 'assistant']);
  const TOKEN_TYPES = new Set(['offense', 'defense', 'ball']);
  const DRAWING_TYPES = new Set(['arrow', 'cone', 'zone', 'label']);
  const ARROW_KINDS = new Set(['run', 'pass', 'dribble', 'screen', 'closeout', 'rotation']);
  const ARROW_STYLES = {
    run: { color: '#f8fafc', rgb: [248, 250, 252], dash: [] },
    pass: { color: '#fbbf24', rgb: [251, 191, 36], dash: [10, 7] },
    dribble: { color: '#c084fc', rgb: [192, 132, 252], dash: [3, 6] },
    screen: { color: '#94a3b8', rgb: [148, 163, 184], dash: [] },
    closeout: { color: '#38bdf8', rgb: [56, 189, 248], dash: [11, 5] },
    rotation: { color: '#fb923c', rgb: [251, 146, 60], dash: [10, 5, 2, 5] }
  };
  let modulePromise = null;
  let sequence = 0;

  function uid(prefix) {
    if (U.uuid) return U.uuid(prefix || 'id_');
    sequence += 1;
    return (prefix || 'id_') + Date.now().toString(36) + sequence.toString(36);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function number(value, fallback) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function point(value) { const source = value || {}; return { x: clamp(number(source.x, 250), 16, 484), y: clamp(number(source.y, 235), 16, 454) }; }
  function currentUser() { return BT.sync && BT.sync.getState ? BT.sync.getState().user : null; }
  function canEdit() { const user = currentUser(); return !!(user && WRITER_ROLES.has(user.role)); }

  function startingElements() {
    const offense = [[250, 388], [82, 324], [418, 324], [106, 168], [394, 168]];
    const defense = [[250, 338], [108, 282], [392, 282], [145, 142], [355, 142]];
    return [
      ...offense.map((coords, index) => ({ id: 'o' + (index + 1), type: 'offense', role: String(index + 1), x: coords[0], y: coords[1] })),
      ...defense.map((coords, index) => ({ id: 'd' + (index + 1), type: 'defense', role: 'X' + (index + 1), x: coords[0], y: coords[1] })),
      { id: 'ball', type: 'ball', x: 267, y: 388 }
    ];
  }
  function emptyTransition() { return { motions: [], passes: [], screens: [] }; }
  function defaultStep(elements) { return { id: uid('st_'), duration: 1.8, elements: copy(elements || startingElements()), transition: emptyTransition() }; }
  function defaultBoard() {
    return { schemaVersion: 2, title: 'Neues Play', description: '', category: 'Offense', courtType: 'half', steps: [defaultStep()], currentStep: 0, published: false, publishedAt: null, createdAt: null, updatedAt: null, createdBy: null };
  }

  function normalizeElement(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const type = raw.type;
    const id = String(raw.id || uid('el_'));
    if (type === 'offense' || type === 'defense') return { id, type, role: String(raw.role || raw.label || (type === 'offense' ? index + 1 : 'X' + (index + 1))).slice(0, 18), ...point(raw) };
    if (type === 'ball') return { id, type, ...point(raw) };
    if (type === 'arrow' && ARROW_KINDS.has(raw.kind || raw.style || 'run')) return { id, type, kind: raw.kind || raw.style || 'run', x: clamp(number(raw.x ?? raw.x1, 250), 16, 484), y: clamp(number(raw.y ?? raw.y1, 235), 16, 454), x2: clamp(number(raw.x2, 300), 16, 484), y2: clamp(number(raw.y2, 190), 16, 454), curve: clamp(number(raw.curve, 0), -180, 180) };
    if (type === 'cone') return { id, type, label: String(raw.label || '').slice(0, 16), ...point(raw) };
    if (type === 'zone') return { id, type, shape: raw.shape === 'circle' ? 'circle' : 'rect', width: clamp(number(raw.width, 110), 30, 340), height: clamp(number(raw.height, 80), 30, 340), label: String(raw.label || '').slice(0, 24), ...point(raw) };
    if (type === 'label') return { id, type, text: String(raw.text || '').slice(0, 64), ...point(raw) };
    return null;
  }
  function normalizeMotion(raw) {
    if (!raw || typeof raw !== 'object' || !raw.elementId) return null;
    return { id: String(raw.id || uid('motion_')), type: 'move', elementId: String(raw.elementId), start: clamp(number(raw.start, 0), 0, 20), duration: clamp(number(raw.duration, 1.2), .15, 20), path: (Array.isArray(raw.path) ? raw.path : []).map(point).slice(0, 80) };
  }
  function normalizePass(raw) {
    if (!raw || typeof raw !== 'object' || !raw.fromId || !raw.toId) return null;
    return { id: String(raw.id || uid('pass_')), type: 'pass', fromId: String(raw.fromId), toId: String(raw.toId), start: clamp(number(raw.start, .8), 0, 20), duration: clamp(number(raw.duration, .38), .12, 5), curve: clamp(number(raw.curve, -36), -180, 180) };
  }
  function normalizeScreen(raw) {
    if (!raw || typeof raw !== 'object' || !raw.elementId) return null;
    return { id: String(raw.id || uid('screen_')), type: 'screen', elementId: String(raw.elementId), start: clamp(number(raw.start, .4), 0, 20), duration: clamp(number(raw.duration, 1), .15, 20), x: clamp(number(raw.x, 250), 16, 484), y: clamp(number(raw.y, 230), 16, 454), angle: clamp(number(raw.angle, 0), -180, 180) };
  }
  function normalizeTransition(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return { motions: (Array.isArray(source.motions) ? source.motions : []).map(normalizeMotion).filter(Boolean), passes: (Array.isArray(source.passes) ? source.passes : []).map(normalizePass).filter(Boolean), screens: (Array.isArray(source.screens) ? source.screens : []).map(normalizeScreen).filter(Boolean) };
  }
  function normalizeStep(raw, index) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const legacy = Array.isArray(source.elements) ? source.elements : [
      ...((source.players || []).map(player => ({ id: player.id, type: player.team === 'defense' ? 'defense' : 'offense', role: player.label, x: player.x, y: player.y }))),
      ...(source.ball ? [{ id: 'ball', type: 'ball', x: source.ball.x, y: source.ball.y }] : []),
      ...((source.arrows || []).map((arrow, arrowIndex) => ({ id: arrow.id || 'legacy_arrow_' + index + '_' + arrowIndex, type: 'arrow', kind: arrow.kind || arrow.style || 'run', x: arrow.x ?? arrow.x1, y: arrow.y ?? arrow.y1, x2: arrow.x2, y2: arrow.y2, curve: arrow.curve }))),
      ...((source.texts || []).map((label, labelIndex) => ({ id: label.id || 'legacy_label_' + index + '_' + labelIndex, type: 'label', x: label.x, y: label.y, text: label.text })))
    ];
    const counts = { offense: 0, defense: 0, ball: 0, drawings: 0 };
    const elements = [];
    legacy.forEach((candidate, candidateIndex) => {
      const element = normalizeElement(candidate, candidateIndex);
      if (!element) return;
      if ((element.type === 'offense' || element.type === 'defense') && ++counts[element.type] > 5) return;
      if (element.type === 'ball' && ++counts.ball > 1) return;
      if (DRAWING_TYPES.has(element.type) && ++counts.drawings > 40) return;
      elements.push(element);
    });
    return { id: String(source.id || uid('st_')), duration: clamp(number(source.duration, 1.8), .3, 10), elements: elements.length ? elements : copy(startingElements()), transition: normalizeTransition(source.transition) };
  }
  function normalizeBoard(input) {
    const source = input && typeof input === 'object' ? input : {};
    const legacy = !Array.isArray(source.steps) && (Array.isArray(source.players) || source.ball || Array.isArray(source.arrows));
    const rawSteps = legacy ? [source] : (Array.isArray(source.steps) ? source.steps : []);
    const fallback = defaultBoard();
    const steps = rawSteps.map(normalizeStep);
    return { schemaVersion: 2, id: source.id, title: String(source.title || fallback.title).slice(0, 100), description: String(source.description || '').slice(0, 400), category: String(source.category || 'Offense').slice(0, 32), courtType: source.courtType === 'full' ? 'full' : 'half', steps: steps.length ? steps : fallback.steps, currentStep: clamp(Math.floor(number(source.currentStep, 0)), 0, Math.max(0, (steps.length || 1) - 1)), published: source.published === true, publishedAt: source.publishedAt || null, createdAt: source.createdAt || null, updatedAt: source.updatedAt || null, createdBy: source.createdBy || null };
  }
  function cloneStep(step) { const normalized = normalizeStep(step, 0); return { id: uid('st_'), duration: normalized.duration, elements: copy(normalized.elements), transition: emptyTransition() }; }
  function elements(step, type) { const list = step && Array.isArray(step.elements) ? step.elements : []; return type ? list.filter(item => item.type === type) : list; }
  function elementById(step, id) { return elements(step).find(item => item.id === id) || null; }
  function arrowStyle(kind) { return ARROW_STYLES[kind] || ARROW_STYLES.run; }
  function pdfLayout() { return { pageHeight: 595.28, courtX: 185, courtY: 88, courtWidth: 440, courtHeight: 414, legendY: 540 }; }
  function boardDuration(boardInput) { return normalizeBoard(boardInput).steps.reduce((sum, step) => sum + step.duration, 0); }
  function stepStartTime(board, index) { let total = 0; for (let i = 0; i < index; i++) total += board.steps[i].duration; return total; }
  function locateTime(board, time) {
    let remaining = clamp(time, 0, boardDuration(board));
    for (let index = 0; index < board.steps.length; index++) {
      const duration = board.steps[index].duration;
      if (remaining <= duration || index === board.steps.length - 1) return { index, elapsed: Math.min(remaining, duration), duration, ratio: duration ? Math.min(1, remaining / duration) : 1 };
      remaining -= duration;
    }
    return { index: board.steps.length - 1, elapsed: 0, duration: 1, ratio: 1 };
  }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function pointOnPath(path, ratio) {
    if (!path.length) return { x: 250, y: 235 };
    if (path.length === 1) return point(path[0]);
    const lengths = []; let total = 0;
    for (let index = 1; index < path.length; index++) { const length = distance(path[index - 1], path[index]); lengths.push(length); total += length; }
    if (!total) return point(path[path.length - 1]);
    let target = clamp(ratio, 0, 1) * total;
    for (let index = 0; index < lengths.length; index++) {
      if (target <= lengths[index] || index === lengths.length - 1) { const local = lengths[index] ? target / lengths[index] : 1; return { x: path[index].x + (path[index + 1].x - path[index].x) * local, y: path[index].y + (path[index + 1].y - path[index].y) * local }; }
      target -= lengths[index];
    }
    return point(path[path.length - 1]);
  }
  function quadraticPoint(start, end, curve, ratio) {
    const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy) || 1;
    const control = { x: (start.x + end.x) / 2 - dy / length * curve, y: (start.y + end.y) / 2 + dx / length * curve };
    const t = clamp(ratio, 0, 1), inv = 1 - t;
    return { x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x, y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y };
  }
  function positionDuring(from, to, elementId, elapsed) {
    const source = elementById(from, elementId), target = to && elementById(to, elementId);
    if (!source) return target ? point(target) : null;
    if (!target) return point(source);
    const transition = normalizeTransition(from.transition);
    const motion = transition.motions.find(item => item.elementId === elementId);
    if (!motion) { const ratio = clamp(elapsed / from.duration, 0, 1); return { x: source.x + (target.x - source.x) * ratio, y: source.y + (target.y - source.y) * ratio }; }
    if (elapsed <= motion.start) return point(source);
    const ratio = clamp((elapsed - motion.start) / motion.duration, 0, 1);
    return pointOnPath(motion.path.length >= 2 ? motion.path : [point(source), point(target)], ratio);
  }
  function interpolateStep(from, to, ratio, elapsedOverride) {
    if (!to) return copy(from);
    const elapsed = elapsedOverride == null ? ratio * from.duration : elapsedOverride;
    const output = copy(from);
    output.elements = elements(from).map(item => TOKEN_TYPES.has(item.type) && elementById(to, item.id) ? Object.assign({}, item, positionDuring(from, to, item.id, elapsed)) : copy(item));
    return output;
  }
  function snapshotAt(boardInput, time) {
    const board = normalizeBoard(boardInput), location = locateTime(board, time), from = board.steps[location.index], to = board.steps[location.index + 1];
    const snapshot = to ? interpolateStep(from, to, location.ratio, location.elapsed) : copy(from);
    snapshot._timeline = location; snapshot._sourceStep = from; snapshot._targetStep = to || null;
    const transition = normalizeTransition(from.transition);
    const activePass = transition.passes.find(pass => location.elapsed >= pass.start && location.elapsed <= pass.start + pass.duration);
    const completedPass = transition.passes.filter(pass => location.elapsed > pass.start + pass.duration).sort((a, b) => b.start - a.start)[0];
    const ball = elementById(snapshot, 'ball') || elements(snapshot, 'ball')[0];
    if (ball && activePass) {
      const start = positionDuring(from, to, activePass.fromId, activePass.start) || point(elementById(from, activePass.fromId));
      const end = positionDuring(from, to, activePass.toId, activePass.start + activePass.duration) || point(elementById(to || from, activePass.toId));
      Object.assign(ball, quadraticPoint(start, end, activePass.curve, clamp((location.elapsed - activePass.start) / activePass.duration, 0, 1)));
    } else if (ball && completedPass) {
      const receiver = positionDuring(from, to, completedPass.toId, location.elapsed);
      if (receiver) Object.assign(ball, { x: receiver.x + 16, y: receiver.y });
    }
    snapshot._activeScreens = transition.screens.filter(screen => location.elapsed >= screen.start && location.elapsed <= screen.start + screen.duration);
    return snapshot;
  }

  function templateBoard(name) {
    const board = defaultBoard(), first = board.steps[0], next = cloneStep(first); board.steps.push(next);
    const set = (step, id, x, y) => Object.assign(elementById(step, id), { x, y });
    const move = (id, path, start = 0, duration = first.duration) => { const end = path[path.length - 1]; set(next, id, end.x, end.y); first.transition.motions.push({ id: uid('motion_'), type: 'move', elementId: id, start, duration, path: path.map(point) }); };
    const pass = (fromId, toId, start, duration, curve) => { first.transition.passes.push({ id: uid('pass_'), type: 'pass', fromId, toId, start, duration, curve }); const receiver = elementById(next, toId), ball = elementById(next, 'ball'); if (receiver && ball) Object.assign(ball, { x: receiver.x + 16, y: receiver.y }); };
    if (name === 'horns') {
      board.title = 'Horns – Elbow Entry'; board.description = 'Point Guard nutzt den rechten Screen, der linke Big setzt den Backscreen.'; board.category = 'Horns'; first.duration = 2.6;
      [[250,395],[66,302],[434,302],[176,214],[324,214]].forEach((c,i) => { set(first,'o'+(i+1),c[0],c[1]); set(next,'o'+(i+1),c[0],c[1]); });
      move('o1',[{x:250,y:395},{x:286,y:342},{x:324,y:282},{x:348,y:220}],.35,1.6); move('o4',[{x:176,y:214},{x:216,y:244},{x:256,y:266}],.7,1.1);
      first.transition.screens.push({ id: uid('screen_'), type: 'screen', elementId: 'o5', start: .2, duration: 1.3, x: 300, y: 300, angle: -18 }); pass('o1','o3',1.85,.4,-42);
    } else if (name === 'five-out') {
      board.title = '5-Out – Drive & Kick'; board.description = 'Corner lift, Baseline-Cut und Kick-out auf die Weakside.'; board.category = '5-Out'; first.duration = 2.4;
      [[250,388],[78,322],[422,322],[78,150],[422,150]].forEach((c,i) => { set(first,'o'+(i+1),c[0],c[1]); set(next,'o'+(i+1),c[0],c[1]); });
      move('o1',[{x:250,y:388},{x:290,y:336},{x:330,y:270},{x:352,y:208}],0,1.7); move('o3',[{x:422,y:322},{x:414,y:272},{x:402,y:220}],.15,1.2); move('o4',[{x:78,y:150},{x:142,y:126},{x:218,y:104}],.4,1.5); pass('o1','o4',1.75,.42,48);
    } else if (name === 'no-middle') {
      board.title = 'No-Middle – Baseline Help'; board.description = 'Ball zur Baseline lenken, Nail schließen und Low-Man rotieren.'; board.category = 'Defense'; first.duration = 2.2;
      move('d1',[{x:250,y:338},{x:224,y:326},{x:198,y:304}],0,.75); move('d4',[{x:145,y:142},{x:178,y:174},{x:208,y:214}],.45,1.1); move('d5',[{x:355,y:142},{x:326,y:160},{x:294,y:184}],.7,1.1);
    } else {
      board.title = '2–3 Zone – Skip Rotation'; board.description = 'Top-Reversal, Wing-Bump und Low-Man Rotation auf den Skip-Pass.'; board.category = 'Defense'; first.duration = 2.4;
      [[190,282],[310,282],[116,164],[250,126],[384,164]].forEach((c,i) => { set(first,'d'+(i+1),c[0],c[1]); set(next,'d'+(i+1),c[0],c[1]); });
      move('d2',[{x:310,y:282},{x:340,y:260},{x:370,y:230}],.1,.9); move('d5',[{x:384,y:164},{x:354,y:182},{x:324,y:205}],.45,1.2); pass('o1','o4',1.25,.45,62);
    }
    board.currentStep = 0;
    return normalizeBoard(board);
  }
  function templates() { return [['horns','Horns','Elbow Entry'],['five-out','5-Out','Drive-and-Kick'],['no-middle','No-Middle','Baseline Help'],['zone-2-3','2–3 Zone','Skip Rotation']].map(([id,title,description]) => ({ id, title, description, board: templateBoard(id) })); }

  function placeholder(target, playerMode) {
    const root = document.createElement('section');
    root.className = 'view tactics-loading';
    if (playerMode) {
      root.dataset.role = 'player-tactics';
      root.innerHTML = '<div class="empty-state"><h2>Teamtaktiken</h2><p>Bitte zuerst anmelden, um veröffentlichte Teamtaktiken anzusehen.</p></div>';
    } else {
      root.innerHTML = '<div class="section-head"><div><span class="section-kicker">CourtHub Play Designer</span><h2>Playbook wird geladen …</h2></div></div><div hidden><button data-tool="offense"></button><button data-tool="defense"></button><button data-action="save-tactic"></button><button data-action="export-pdf"></button><select data-role="tactic-template"></select></div>';
    }
    target.appendChild(root);
    return root;
  }
  function loadModule() {
    if (!modulePromise) modulePromise = import('./play-designer/main.js').catch(error => { console.error('Play Designer konnte nicht geladen werden', error); throw error; });
    return modulePromise;
  }
  function render(target) {
    const loading = placeholder(target, false);
    loadModule().then(module => { if (!loading.isConnected) return; loading.remove(); module.mountEditor(target); }).catch(() => { if (loading.isConnected) loading.querySelector('h2').textContent = 'Play Designer konnte nicht geladen werden.'; });
  }
  function renderPlayer(target) {
    const loading = placeholder(target, true);
    loadModule().then(module => { if (!loading.isConnected) return; loading.remove(); module.mountPlayer(target); }).catch(() => {});
  }

  const core = { uid, clamp, number, copy, point, currentUser, canEdit, startingElements, emptyTransition, defaultStep, defaultBoard, normalizeTransition, normalizeStep, normalizeBoard, cloneStep, elements, elementById, arrowStyle, boardDuration, stepStartTime, locateTime, distance, pointOnPath, quadraticPoint, positionDuring, interpolateStep, snapshotAt };
  return { render, renderPlayer, normalizeBoard, templates, cloneStep, interpolateStep, snapshotAt, arrowStyle, pdfLayout, boardDuration, __core: core };
})();
