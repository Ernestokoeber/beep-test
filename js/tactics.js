window.BT = window.BT || {};

BT.tactics = (function() {
  const { $, $$, renderTemplate, formatDate, toast, toastUndo, uuid } = BT.util;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'tacticsBoardDraft';
  const WRITER_ROLES = new Set(['admin', 'coach', 'assistant']);
  const ARROW_KINDS = new Set(['run', 'pass', 'dribble', 'screen', 'closeout', 'rotation']);
  const ARROW_STYLES = {
    run: { color: '#004b2b', rgb: [0, 75, 43], dash: [] }, pass: { color: '#e8a14d', rgb: [232, 161, 77], dash: [8, 6] },
    dribble: { color: '#7b4ea3', rgb: [123, 78, 163], dash: [3, 5] }, screen: { color: '#4d5968', rgb: [77, 89, 104], dash: [1, 0] },
    closeout: { color: '#2e6eaa', rgb: [46, 110, 170], dash: [10, 3] }, rotation: { color: '#8c4a20', rgb: [140, 74, 32], dash: [8, 4, 2, 4] }
  };
  let pdfLoading = null;
  let gifLoading = null;

  function id(prefix) { return uuid ? uuid(prefix) : prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function stepId() { return id('st_'); }
  function number(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
  function point(value) { return { x: clamp(number(value.x, 250), 10, 490), y: clamp(number(value.y, 235), 10, 460) }; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }

  function startingElements() {
    const offense = [[120, 380], [380, 380], [80, 260], [420, 260], [250, 230]];
    const defense = [[120, 330], [380, 330], [110, 210], [390, 210], [250, 180]];
    const roles = ['PG', 'Wing', 'Wing', 'Big', 'Big'];
    return [
      ...offense.map((item, index) => ({ id: 'o' + (index + 1), type: 'offense', role: roles[index], x: item[0], y: item[1] })),
      ...defense.map((item, index) => ({ id: 'd' + (index + 1), type: 'defense', role: roles[index], x: item[0], y: item[1] })),
      { id: 'ball', type: 'ball', x: 250, y: 380 }
    ];
  }

  function defaultStep() { return { id: stepId(), duration: 1.5, elements: startingElements() }; }
  function defaultBoard() { return { title: '', description: '', steps: [defaultStep()], currentStep: 0, published: false, publishedAt: null }; }

  function validElement(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const type = raw.type;
    const key = raw.id || id('el_');
    if (type === 'offense' || type === 'defense' || type === 'ball') return Object.assign({ id: key, type }, type === 'ball' ? point(raw) : { role: String(raw.role || raw.label || 'Wing').slice(0, 20), ...point(raw) });
    if (type === 'arrow' && ARROW_KINDS.has(raw.kind || raw.style || 'run')) return { id: key, type, kind: raw.kind || raw.style || 'run', ...point({ x: raw.x1, y: raw.y1 }), x2: clamp(number(raw.x2, 250), 10, 490), y2: clamp(number(raw.y2, 235), 10, 460) };
    if (type === 'cone') return { id: key, type, ...point(raw) };
    if (type === 'zone') return { id: key, type, shape: raw.shape === 'circle' ? 'circle' : 'rect', ...point(raw), width: clamp(number(raw.width, 80), 30, 300), height: clamp(number(raw.height, 60), 30, 300) };
    if (type === 'label') return { id: key, type, ...point(raw), text: String(raw.text || '').slice(0, 40) };
    return null;
  }

  function normalizeStep(raw, index) {
    const legacyElements = Array.isArray(raw && raw.elements) ? raw.elements : [
      ...((raw && raw.players) || []).map(player => ({ id: player.id, type: player.team === 'defense' ? 'defense' : 'offense', role: player.label, x: player.x, y: player.y })),
      ...((raw && raw.ball) ? [{ id: 'ball', type: 'ball', x: raw.ball.x, y: raw.ball.y }] : []),
      ...((raw && raw.arrows) || []).map((arrow, arrowIndex) => ({ id: arrow.id || 'a_' + index + '_' + arrowIndex, type: 'arrow', kind: arrow.kind || arrow.style, x1: arrow.x1, y1: arrow.y1, x2: arrow.x2, y2: arrow.y2 })),
      ...((raw && raw.texts) || []).map((label, labelIndex) => ({ id: label.id || 'l_' + index + '_' + labelIndex, type: 'label', x: label.x, y: label.y, text: label.text }))
    ];
    const counts = { offense: 0, defense: 0, ball: 0, drawings: 0 };
    const elements = [];
    legacyElements.forEach((candidate, candidateIndex) => {
      const element = validElement(candidate, candidateIndex);
      if (!element) return;
      if ((element.type === 'offense' || element.type === 'defense') && ++counts[element.type] > 5) return;
      if (element.type === 'ball' && ++counts.ball > 1) return;
      if (!['offense', 'defense', 'ball'].includes(element.type) && ++counts.drawings > 30) return;
      elements.push(element);
    });
    return { id: raw && raw.id || stepId(), duration: clamp(number(raw && raw.duration, 1.5), .3, 10), elements };
  }

  function normalizeBoard(input) {
    const source = input && typeof input === 'object' ? input : {};
    const hasLegacyBoard = !Array.isArray(source.steps) && (Array.isArray(source.players) || source.ball);
    const rawSteps = hasLegacyBoard ? [source] : (Array.isArray(source.steps) ? source.steps : []);
    const steps = rawSteps.map(normalizeStep);
    const fallback = defaultBoard();
    return {
      id: source.id,
      title: String(source.title || ''),
      description: String(source.description || ''),
      published: source.published === true,
      publishedAt: source.publishedAt || null,
      createdAt: source.createdAt || null,
      createdBy: source.createdBy || null,
      updatedAt: source.updatedAt || null,
      steps: steps.length ? steps : fallback.steps,
      currentStep: clamp(Math.floor(number(source.currentStep, 0)), 0, Math.max(0, (steps.length || 1) - 1))
    };
  }

  function loadDraft() {
    try { return normalizeBoard(BT.storage.getSetting(STORAGE_KEY, null)); }
    catch (_) { return defaultBoard(); }
  }
  function saveDraft(board) { BT.storage.setSetting(STORAGE_KEY, normalizeBoard(board)); }
  function cloneStep(step) { return { id: stepId(), duration: step.duration, elements: copy(step.elements) }; }
  function elements(step, type) { return (step.elements || []).filter(item => !type || item.type === type); }
  function drawingCount(step) { return elements(step).filter(item => !['offense', 'defense', 'ball'].includes(item.type)).length; }
  function arrowStyle(kind) { return ARROW_STYLES[kind] || ARROW_STYLES.run; }
  function pdfLayout() { return { pageHeight: 595.28, courtX: 185, courtY: 88, courtWidth: 440, courtHeight: 414, legendY: 540 }; }
  function currentUser() { return BT.sync && BT.sync.getState ? BT.sync.getState().user : null; }
  function canEdit() { const user = currentUser(); return !!(user && WRITER_ROLES.has(user.role)); }

  function templateBoard(idValue) {
    const board = defaultBoard();
    const first = board.steps[0];
    const byId = key => first.elements.find(item => item.id === key);
    const set = (key, x, y) => Object.assign(byId(key), { x, y });
    if (idValue === 'zone-2-3') {
      board.title = '2–3 Zone'; board.description = 'Zwei oben, drei unten – Paint schützen und Ecken schließen.';
      [["d1", 185, 255], ["d2", 315, 255], ["d3", 110, 150], ["d4", 390, 150], ["d5", 250, 120]].forEach(row => set(...row));
      first.elements.push({ id: id('zone_'), type: 'zone', shape: 'rect', x: 250, y: 195, width: 270, height: 150 }, { id: id('label_'), type: 'label', x: 250, y: 85, text: '2–3 Zone: Paint zuerst' });
    } else if (idValue === 'five-out') {
      board.title = '5-Out'; board.description = 'Maximale Breite, Drive-and-Kick und konsequente Besetzung der Ecken.';
      [["o1", 250, 360], ["o2", 75, 330], ["o3", 425, 330], ["o4", 70, 160], ["o5", 430, 160]].forEach(row => set(...row));
      first.elements.push({ id: id('a_'), type: 'arrow', kind: 'run', x: 250, y: 360, x2: 340, y2: 245 });
    } else if (idValue === 'horns') {
      board.title = 'Horns'; board.description = 'Zwei Bigs an den Elbows, Entscheidung aus dem High Pick-and-Roll.';
      [["o1", 250, 375], ["o2", 80, 320], ["o3", 420, 320], ["o4", 180, 215], ["o5", 320, 215]].forEach(row => set(...row));
      first.elements.push({ id: id('a_'), type: 'arrow', kind: 'screen', x: 180, y: 215, x2: 250, y2: 300 }, { id: id('a_'), type: 'arrow', kind: 'run', x: 250, y: 375, x2: 310, y2: 245 });
    } else if (idValue === 'no-middle') {
      board.title = 'No-Middle Defense'; board.description = 'Ball zum Seitenaus lenken, Mitte schließen, Baseline-Hilfe rotieren.';
      [["d1", 220, 350], ["d2", 95, 290], ["d3", 405, 290], ["d4", 155, 175], ["d5", 345, 175]].forEach(row => set(...row));
      first.elements.push({ id: id('a_'), type: 'arrow', kind: 'closeout', x: 220, y: 350, x2: 180, y2: 315 }, { id: id('label_'), type: 'label', x: 250, y: 95, text: 'Mitte dicht – Baseline Hilfe' });
    }
    return board;
  }
  const TEMPLATE_INFO = [
    ['zone-2-3', '2–3 Zone', 'Kompakte Zonenverteidigung'], ['five-out', '5-Out', 'Breite und Drive-and-Kick'], ['horns', 'Horns', 'High Pick-and-Roll aus zwei Elbows'], ['no-middle', 'No-Middle Defense', 'Mitte schließen und rotieren']
  ];
  function templates() { return TEMPLATE_INFO.map(([idValue, title, description]) => ({ id: idValue, title, description, board: templateBoard(idValue) })); }

  function render(target) {
    const root = renderTemplate('tpl-tactics');
    target.appendChild(root);
    let board = loadDraft();
    let tool = 'move', arrowStart = null, drag = null, selectedId = null;
    let playback = { running: false, from: 0, started: 0, frame: null };
    const svg = $('[data-role="tactics-svg"]', root);
    const layers = { tokens: $('[data-role="tokens-layer"]', svg), arrows: $('[data-role="arrows-layer"]', svg), objects: $('[data-role="objects-layer"]', svg), texts: $('[data-role="texts-layer"]', svg) };
    const hint = $('[data-role="tool-hint"]', root), stepsList = $('[data-role="steps-list"]', root), duration = $('[data-role="step-duration"]', root), status = $('[data-role="playback-status"]', root);
    const titleInput = $('[data-role="tactic-title"]', root), descriptionInput = $('[data-role="tactic-description"]', root), savedSelect = $('[data-role="saved-tactic"]', root), templateSelect = $('[data-role="tactic-template"]', root);
    const context = $('[data-role="tactics-context"]', root), contextTitle = $('[data-role="context-title"]', root), contextLabel = $('[data-role="context-label"]', root), contextShapeWrap = $('[data-role="context-shape-wrap"]', root), contextShape = $('[data-role="context-shape"]', root);
    const HINTS = { move: 'Element auswählen und ziehen.', offense: 'Auf den Platz tippen, um einen Angriffsspieler zu platzieren (maximal 5).', defense: 'Auf den Platz tippen, um einen Verteidiger zu platzieren (maximal 5).', ball: 'Auf den Platz tippen, um den Ball zu setzen.', run: 'Start- und Endpunkt für den Laufweg tippen.', pass: 'Start- und Endpunkt für den Passweg tippen.', dribble: 'Start- und Endpunkt für den Dribblingweg tippen.', screen: 'Start- und Endpunkt für den Screen tippen.', closeout: 'Start- und Endpunkt für den Closeout tippen.', rotation: 'Start- und Endpunkt für die Rotation tippen.', cone: 'Auf den Platz tippen, um ein Hütchen zu setzen.', zone: 'Auf den Platz tippen, um eine Zone zu setzen.', text: 'Auf den Platz tippen, um eine Beschriftung zu setzen.', erase: 'Element zum Löschen antippen.' };
    function cur() { return board.steps[board.currentStep]; }
    function persist() { saveDraft(board); }
    function editable() { if (canEdit()) return true; if (toast) toast('Zum Bearbeiten und Speichern bitte als Trainerteam anmelden.'); return false; }
    function select(element) {
      selectedId = element ? element.id : null;
      context.hidden = !element;
      if (!element) return;
      contextTitle.textContent = ({ offense: 'Angriffsspieler', defense: 'Verteidiger', ball: 'Ball', arrow: 'Bewegung', cone: 'Hütchen', zone: 'Zone', label: 'Beschriftung' })[element.type] || 'Element';
      contextLabel.value = element.role || element.text || '';
      contextLabel.disabled = !['offense', 'defense', 'label'].includes(element.type) || !canEdit();
      contextShapeWrap.hidden = element.type !== 'zone'; contextShape.value = element.shape || 'rect'; contextShape.disabled = !canEdit();
    }
    function selected() { return cur().elements.find(element => element.id === selectedId); }
    function pointFromEvent(event) { const rect = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return { x: clamp((event.clientX - rect.left) / rect.width * vb.width, 10, 490), y: clamp((event.clientY - rect.top) / rect.height * vb.height, 10, 460) }; }
    function hitAt(x, y) {
      const list = cur().elements;
      for (let index = list.length - 1; index >= 0; index--) { const element = list[index];
        if (['offense', 'defense'].includes(element.type) && Math.hypot(element.x - x, element.y - y) < 23) return element;
        if (element.type === 'ball' && Math.hypot(element.x - x, element.y - y) < 14) return element;
        if (element.type === 'cone' && Math.hypot(element.x - x, element.y - y) < 15) return element;
        if (element.type === 'zone' && Math.abs(element.x - x) < element.width / 2 && Math.abs(element.y - y) < element.height / 2) return element;
        if (element.type === 'label' && Math.abs(element.x - x) < 65 && Math.abs(element.y - y) < 16) return element;
        if (element.type === 'arrow' && nearSegment(x, y, element.x, element.y, element.x2, element.y2, 9)) return element;
      } return null;
    }
    function updateInputs() { titleInput.value = board.title || ''; descriptionInput.value = board.description || ''; duration.value = cur().duration; }
    function drawElement(element, parent) {
      const make = name => document.createElementNS(SVG_NS, name);
      if (element.type === 'arrow') { const line = make('line'); line.setAttribute('x1', element.x); line.setAttribute('y1', element.y); line.setAttribute('x2', element.x2); line.setAttribute('y2', element.y2); line.setAttribute('class', 'tactics-arrow ' + element.kind); line.setAttribute('marker-end', 'url(#arrow-' + (element.kind === 'pass' ? 'pass' : 'run') + ')'); parent.appendChild(line); }
      else if (element.type === 'cone') { const polygon = make('path'); polygon.setAttribute('d', 'M ' + element.x + ' ' + (element.y - 12) + ' L ' + (element.x - 11) + ' ' + (element.y + 10) + ' L ' + (element.x + 11) + ' ' + (element.y + 10) + ' Z'); polygon.setAttribute('class', 'tactics-cone'); parent.appendChild(polygon); }
      else if (element.type === 'zone') { const shape = make(element.shape === 'circle' ? 'ellipse' : 'rect'); if (element.shape === 'circle') { shape.setAttribute('cx', element.x); shape.setAttribute('cy', element.y); shape.setAttribute('rx', element.width / 2); shape.setAttribute('ry', element.height / 2); } else { shape.setAttribute('x', element.x - element.width / 2); shape.setAttribute('y', element.y - element.height / 2); shape.setAttribute('width', element.width); shape.setAttribute('height', element.height); shape.setAttribute('rx', 8); } shape.setAttribute('class', 'tactics-zone' + (selectedId === element.id ? ' selected' : '')); parent.appendChild(shape); }
      else if (element.type === 'label') { const text = make('text'); text.setAttribute('x', element.x); text.setAttribute('y', element.y); text.setAttribute('text-anchor', 'middle'); text.setAttribute('class', 'tactics-text'); text.textContent = element.text; parent.appendChild(text); }
      else if (['offense', 'defense'].includes(element.type)) { const group = make('g'), shape = make(element.type === 'defense' ? 'rect' : 'circle'), text = make('text'); group.setAttribute('class', 'tactics-token ' + element.type + (selectedId === element.id ? ' selected' : '')); if (element.type === 'defense') { shape.setAttribute('x', element.x - 17); shape.setAttribute('y', element.y - 17); shape.setAttribute('width', 34); shape.setAttribute('height', 34); shape.setAttribute('rx', 5); } else { shape.setAttribute('cx', element.x); shape.setAttribute('cy', element.y); shape.setAttribute('r', 18); } text.setAttribute('x', element.x); text.setAttribute('y', element.y + 4); text.setAttribute('text-anchor', 'middle'); text.textContent = element.role; group.append(shape, text); parent.appendChild(group); }
      else if (element.type === 'ball') { const group = make('g'), circle = make('circle'); group.setAttribute('class', 'tactics-ball' + (selectedId === element.id ? ' selected' : '')); circle.setAttribute('cx', element.x); circle.setAttribute('cy', element.y); circle.setAttribute('r', 9); group.appendChild(circle); parent.appendChild(group); }
    }
    function renderBoard(snapshot) {
      Object.values(layers).forEach(layer => { layer.innerHTML = ''; });
      elements(snapshot, 'zone').forEach(item => drawElement(item, layers.objects)); elements(snapshot, 'cone').forEach(item => drawElement(item, layers.objects));
      elements(snapshot, 'arrow').forEach(item => drawElement(item, layers.arrows)); elements(snapshot, 'label').forEach(item => drawElement(item, layers.texts));
      elements(snapshot).filter(item => ['offense', 'defense', 'ball'].includes(item.type)).forEach(item => drawElement(item, layers.tokens));
      if (arrowStart && ARROW_KINDS.has(tool)) { const dot = document.createElementNS(SVG_NS, 'circle'); dot.setAttribute('cx', arrowStart.x); dot.setAttribute('cy', arrowStart.y); dot.setAttribute('r', 5); dot.setAttribute('class', 'tactics-preview'); layers.arrows.appendChild(dot); }
    }
    function renderSteps() { stepsList.innerHTML = ''; board.steps.forEach((step, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'step-btn' + (index === board.currentStep ? ' active' : ''); button.textContent = String(index + 1); button.setAttribute('aria-pressed', index === board.currentStep ? 'true' : 'false'); button.addEventListener('click', () => { stopPlayback(); board.currentStep = index; persist(); select(null); refresh(); }); stepsList.appendChild(button); }); }
    function refresh() { renderBoard(cur()); renderSteps(); updateInputs(); status.textContent = 'Schritt ' + (board.currentStep + 1) + ' / ' + board.steps.length; }
    function stopPlayback() { if (playback.frame) cancelAnimationFrame(playback.frame); playback.running = false; playback.frame = null; $('[data-action="play-toggle"]', root).textContent = '▶️'; }
    function playbackLoop() { if (!playback.running) return; const from = board.steps[playback.from], to = board.steps[playback.from + 1]; if (!to) { board.currentStep = playback.from; stopPlayback(); refresh(); return; } const progress = (performance.now() - playback.started) / (from.duration * 1000); if (progress >= 1) { playback.from += 1; playback.started = performance.now(); board.currentStep = playback.from; refresh(); } else renderBoard(interpolateStep(from, to, progress)); playback.frame = requestAnimationFrame(playbackLoop); }
    function startPlayback() { if (board.steps.length < 2) { if (toast) toast('Mindestens zwei Schritte für die Animation nötig.'); return; } stopPlayback(); playback.running = true; playback.from = board.currentStep < board.steps.length - 1 ? board.currentStep : 0; playback.started = performance.now(); $('[data-action="play-toggle"]', root).textContent = '⏸'; playbackLoop(); }
    function addElement(element) { if (!['offense', 'defense', 'ball'].includes(element.type) && drawingCount(cur()) >= 30) { if (toast) toast('Maximal 30 Zeichenobjekte pro Schritt.'); return; } cur().elements.push(element); select(element); persist(); refresh(); }
    function syncLibrary() { savedSelect.innerHTML = '<option value="">Neuer Entwurf</option>'; BT.storage.getTactics().forEach(tactic => { const option = document.createElement('option'); option.value = tactic.id; option.textContent = tactic.title || 'Unbenannte Taktik'; option.selected = tactic.id === board.id; savedSelect.appendChild(option); }); }
    function saveTeamTactic(publish) { if (!editable()) return; board.title = titleInput.value.trim() || 'Unbenannte Taktik'; board.description = descriptionInput.value.trim(); const wasPublished = board.published; board.published = publish === undefined ? board.published : publish; if (board.published && !wasPublished) board.publishedAt = new Date().toISOString(); const user = currentUser(); board.createdBy = board.createdBy || user && user.id || null; const saved = BT.storage.upsertTactic(normalizeBoard(board)); board.id = saved.id; board.createdAt = saved.createdAt; board.updatedAt = saved.updatedAt; persist(); syncLibrary(); if (toast) toast(board.published ? 'Taktik veröffentlicht und gespeichert.' : 'Taktik als Entwurf gespeichert.'); }
    $$('.tactics-tool', root).forEach(button => button.addEventListener('click', () => { stopPlayback(); tool = button.dataset.tool; arrowStart = null; $$('.tactics-tool', root).forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); }); hint.textContent = HINTS[tool]; renderBoard(cur()); }));
    templateSelect.innerHTML += templates().map(template => '<option value="' + template.id + '">' + template.title + '</option>').join('');
    templateSelect.addEventListener('change', () => { if (!templateSelect.value || !editable()) return; if (!confirm('Aktuellen Entwurf durch die Vorlage ersetzen?')) { templateSelect.value = ''; return; } board = templateBoard(templateSelect.value); persist(); select(null); syncLibrary(); refresh(); });
    savedSelect.addEventListener('change', () => { const tactic = BT.storage.getTactic(savedSelect.value); if (tactic) { board = normalizeBoard(tactic); persist(); select(null); refresh(); } });
    $('[data-action="new-tactic"]', root).addEventListener('click', () => { if (!editable()) return; board = defaultBoard(); persist(); savedSelect.value = ''; templateSelect.value = ''; select(null); refresh(); });
    $('[data-action="save-tactic"]', root).addEventListener('click', () => saveTeamTactic());
    $('[data-action="publish-tactic"]', root).addEventListener('click', () => saveTeamTactic(!board.published));
    $('[data-action="reset-board"]', root).addEventListener('click', () => { if (!editable()) return; const backup = copy(board); board = defaultBoard(); persist(); select(null); syncLibrary(); refresh(); if (toastUndo) toastUndo('Entwurf zurückgesetzt', () => { board = backup; persist(); syncLibrary(); refresh(); }); });
    $('[data-action="add-step"]', root).addEventListener('click', () => { if (!editable()) return; board.steps.splice(board.currentStep + 1, 0, cloneStep(cur())); board.currentStep++; persist(); select(null); refresh(); });
    $('[data-action="delete-step"]', root).addEventListener('click', () => { if (!editable()) return; if (board.steps.length === 1) { if (toast) toast('Mindestens ein Schritt muss bleiben.'); return; } board.steps.splice(board.currentStep, 1); board.currentStep = Math.min(board.currentStep, board.steps.length - 1); persist(); select(null); refresh(); });
    duration.addEventListener('change', () => { if (!editable()) return; cur().duration = clamp(number(duration.value, cur().duration), .3, 10); persist(); refresh(); });
    titleInput.addEventListener('change', () => { board.title = titleInput.value.slice(0, 80); persist(); }); descriptionInput.addEventListener('change', () => { board.description = descriptionInput.value.slice(0, 180); persist(); });
    contextLabel.addEventListener('change', () => { const element = selected(); if (!element || !editable()) return; if (element.type === 'label') element.text = contextLabel.value.slice(0, 40); else element.role = contextLabel.value.slice(0, 20); persist(); refresh(); select(element); });
    contextShape.addEventListener('change', () => { const element = selected(); if (!element || element.type !== 'zone' || !editable()) return; element.shape = contextShape.value; persist(); refresh(); select(element); });
    $('[data-action="delete-selected"]', root).addEventListener('click', () => { if (!editable() || !selectedId) return; cur().elements = cur().elements.filter(element => element.id !== selectedId); select(null); persist(); refresh(); });
    $('[data-action="play-toggle"]', root).addEventListener('click', () => playback.running ? (stopPlayback(), refresh()) : startPlayback());
    $('[data-action="play-prev"]', root).addEventListener('click', () => { stopPlayback(); if (board.currentStep) board.currentStep--; persist(); refresh(); });
    $('[data-action="play-next"]', root).addEventListener('click', () => { stopPlayback(); if (board.currentStep < board.steps.length - 1) board.currentStep++; persist(); refresh(); });
    $('[data-action="ai-explain"]', root).addEventListener('click', () => openExplainModal(board));
    $('[data-action="share-gif"]', root).addEventListener('click', () => openGifModal(board));
    $('[data-action="export-pdf"]', root).addEventListener('click', () => exportPdf(board));
    svg.addEventListener('pointerdown', event => {
      if (playback.running || !editable()) return; const p = pointFromEvent(event), hit = hitAt(p.x, p.y);
      if (tool === 'move') { select(hit); if (hit) { drag = { element: hit, dx: p.x - hit.x, dy: p.y - hit.y }; svg.setPointerCapture(event.pointerId); } refresh(); return; }
      if (ARROW_KINDS.has(tool)) { if (!arrowStart) { arrowStart = p; hint.textContent = 'Jetzt Endpunkt tippen.'; renderBoard(cur()); } else { addElement({ id: id('a_'), type: 'arrow', kind: tool, x: arrowStart.x, y: arrowStart.y, x2: p.x, y2: p.y }); arrowStart = null; hint.textContent = HINTS[tool]; } return; }
      if (tool === 'offense' || tool === 'defense') { if (elements(cur(), tool).length >= 5) { if (toast) toast('Maximal fünf ' + (tool === 'offense' ? 'Angriffsspieler' : 'Verteidiger') + ' pro Schritt.'); return; } addElement({ id: id(tool === 'offense' ? 'o_' : 'd_'), type: tool, role: tool === 'offense' ? 'Wing' : 'Wing', x: p.x, y: p.y }); return; }
      if (tool === 'ball') { const ball = elements(cur(), 'ball')[0]; if (ball) Object.assign(ball, p); else addElement({ id: id('ball_'), type: 'ball', x: p.x, y: p.y }); persist(); refresh(); return; }
      if (tool === 'cone') { addElement({ id: id('cone_'), type: 'cone', x: p.x, y: p.y }); return; }
      if (tool === 'zone') { addElement({ id: id('zone_'), type: 'zone', shape: 'rect', x: p.x, y: p.y, width: 100, height: 70 }); return; }
      if (tool === 'text') { const text = prompt('Beschriftung (z. B. Screen oder Cut):', ''); if (text) addElement({ id: id('label_'), type: 'label', x: p.x, y: p.y, text: text.slice(0, 40) }); return; }
      if (tool === 'erase' && hit) { cur().elements = cur().elements.filter(element => element !== hit); select(null); persist(); refresh(); }
    });
    svg.addEventListener('pointermove', event => { if (!drag) return; const p = pointFromEvent(event); drag.element.x = p.x - drag.dx; drag.element.y = p.y - drag.dy; renderBoard(cur()); });
    svg.addEventListener('pointerup', event => { if (drag) { drag = null; persist(); try { svg.releasePointerCapture(event.pointerId); } catch (_) {} } }); svg.addEventListener('pointercancel', () => { drag = null; });
    const legacyNote = BT.storage.getSetting('tacticsLoadFromNote', null);
    if (legacyNote) { BT.storage.setSetting('tacticsLoadFromNote', null); const note = BT.storage.getNote(legacyNote), json = note && note.body && note.body.indexOf('{'); if (json >= 0) { try { board = normalizeBoard(JSON.parse(note.body.slice(json))); persist(); } catch (_) { if (toast) toast('Taktik konnte nicht geladen werden.'); } } }
    syncLibrary(); refresh();
  }

  function renderPlayer(target) {
    const root = document.createElement('section'); root.className = 'view tactics-player-view'; root.dataset.role = 'player-tactics'; target.appendChild(root);
    const user = currentUser();
    if (!BT.api.getToken() || !user) { root.innerHTML = '<div class="empty-state"><h2>Teamtaktiken</h2><p>Bitte zuerst anmelden, um veröffentlichte Teamtaktiken anzusehen.</p><a class="btn primary" href="#/account">Anmelden</a></div>'; return; }
    const published = BT.storage.getTactics().filter(tactic => tactic.published === true); root.innerHTML = '<div class="section-head"><div><span class="section-kicker">Spieleransicht</span><h2>Teamtaktiken</h2></div><a class="btn small" href="#/tactics">Trainerboard</a></div><div data-role="player-tactic-list" class="tactics-player-list"></div><div data-role="player-tactic-detail"></div>';
    const list = $('[data-role="player-tactic-list"]', root), detail = $('[data-role="player-tactic-detail"]', root);
    if (!published.length) { list.innerHTML = '<p class="muted">Es wurden noch keine Taktiken veröffentlicht.</p>'; return; }
    function show(tactic) { const board = normalizeBoard(tactic); detail.innerHTML = '<article class="tactics-player-card"><h3></h3><p class="muted"></p><div class="tactics-player-step"></div><div class="tactics-playback"><button class="btn small" data-action="prev">⏮</button><span class="muted" data-role="number"></span><button class="btn small" data-action="next">⏭</button></div></article>'; $('h3', detail).textContent = board.title || 'Unbenannte Taktik'; $('p', detail).textContent = board.description || 'Kein zusätzlicher Coaching-Hinweis.'; let index = 0; const step = $('[data-role="number"]', detail), court = $('.tactics-player-step', detail); function draw() { court.replaceChildren(buildPreview(board.steps[index])); step.textContent = 'Schritt ' + (index + 1) + ' / ' + board.steps.length; } $('[data-action="prev"]', detail).addEventListener('click', () => { index = Math.max(0, index - 1); draw(); }); $('[data-action="next"]', detail).addEventListener('click', () => { index = Math.min(board.steps.length - 1, index + 1); draw(); }); draw(); }
    published.forEach(tactic => { const button = document.createElement('button'); button.className = 'btn small'; button.type = 'button'; button.textContent = tactic.title || 'Unbenannte Taktik'; button.addEventListener('click', () => show(tactic)); list.appendChild(button); }); show(published[0]);
  }

  function buildPreview(step) { const svg = document.createElementNS(SVG_NS, 'svg'); svg.setAttribute('viewBox', '0 0 500 470'); svg.setAttribute('class', 'court tactics-preview-court'); svg.innerHTML = '<rect class="court-floor" x="10" y="10" width="480" height="450" stroke-width="2"/><rect class="court-lane" x="160" y="10" width="180" height="190" stroke-width="2"/><circle class="court-line" cx="250" cy="200" r="60" fill="none" stroke-width="2"/><line class="court-line" x1="160" y1="200" x2="340" y2="200" stroke-width="2"/><line class="court-backboard" x1="220" y1="40" x2="280" y2="40" stroke-width="3"/><circle class="court-rim" cx="250" cy="50" r="8" fill="none" stroke-width="2.5"/>';
    const layers = { objects: document.createElementNS(SVG_NS, 'g'), arrows: document.createElementNS(SVG_NS, 'g'), texts: document.createElementNS(SVG_NS, 'g'), tokens: document.createElementNS(SVG_NS, 'g') }; Object.values(layers).forEach(layer => svg.appendChild(layer)); const context = { selectedId: null }; elements(step, 'zone').forEach(item => drawPreviewElement(item, layers.objects, context)); elements(step, 'cone').forEach(item => drawPreviewElement(item, layers.objects, context)); elements(step, 'arrow').forEach(item => drawPreviewElement(item, layers.arrows, context)); elements(step, 'label').forEach(item => drawPreviewElement(item, layers.texts, context)); elements(step).filter(item => ['offense', 'defense', 'ball'].includes(item.type)).forEach(item => drawPreviewElement(item, layers.tokens, context)); return svg;
  }
  function drawPreviewElement(element, parent) { const make = name => document.createElementNS(SVG_NS, name); if (element.type === 'arrow') { const line = make('line'); line.setAttribute('x1', element.x); line.setAttribute('y1', element.y); line.setAttribute('x2', element.x2); line.setAttribute('y2', element.y2); line.setAttribute('class', 'tactics-arrow ' + element.kind); parent.appendChild(line); } else if (element.type === 'cone') { const p = make('path'); p.setAttribute('d', 'M ' + element.x + ' ' + (element.y - 12) + ' L ' + (element.x - 11) + ' ' + (element.y + 10) + ' L ' + (element.x + 11) + ' ' + (element.y + 10) + ' Z'); p.setAttribute('class', 'tactics-cone'); parent.appendChild(p); } else if (element.type === 'zone') { const shape = make(element.shape === 'circle' ? 'ellipse' : 'rect'); if (element.shape === 'circle') { shape.setAttribute('cx', element.x); shape.setAttribute('cy', element.y); shape.setAttribute('rx', element.width / 2); shape.setAttribute('ry', element.height / 2); } else { shape.setAttribute('x', element.x - element.width / 2); shape.setAttribute('y', element.y - element.height / 2); shape.setAttribute('width', element.width); shape.setAttribute('height', element.height); } shape.setAttribute('class', 'tactics-zone'); parent.appendChild(shape); } else if (element.type === 'label') { const text = make('text'); text.setAttribute('x', element.x); text.setAttribute('y', element.y); text.setAttribute('text-anchor', 'middle'); text.setAttribute('class', 'tactics-text'); text.textContent = element.text; parent.appendChild(text); } else if (['offense', 'defense'].includes(element.type)) { const group = make('g'), shape = make(element.type === 'defense' ? 'rect' : 'circle'), text = make('text'); group.setAttribute('class', 'tactics-token ' + element.type); if (element.type === 'defense') { shape.setAttribute('x', element.x - 17); shape.setAttribute('y', element.y - 17); shape.setAttribute('width', 34); shape.setAttribute('height', 34); } else { shape.setAttribute('cx', element.x); shape.setAttribute('cy', element.y); shape.setAttribute('r', 18); } text.setAttribute('x', element.x); text.setAttribute('y', element.y + 4); text.setAttribute('text-anchor', 'middle'); text.textContent = element.role; group.append(shape, text); parent.appendChild(group); } else if (element.type === 'ball') { const circle = make('circle'); circle.setAttribute('class', 'tactics-ball'); circle.setAttribute('cx', element.x); circle.setAttribute('cy', element.y); circle.setAttribute('r', 9); parent.appendChild(circle); } }

  function nearSegment(px, py, x1, y1, x2, y2, tolerance) { const dx = x2 - x1, dy = y2 - y1, length = dx * dx + dy * dy; if (!length) return Math.hypot(px - x1, py - y1) < tolerance; const t = clamp(((px - x1) * dx + (py - y1) * dy) / length, 0, 1); return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t)) < tolerance; }
  function interpolateStep(from, to, ratio) { if (!to) return from; const target = new Map(elements(to).filter(item => ['offense', 'defense', 'ball'].includes(item.type)).map(item => [item.id, item])); return Object.assign({}, from, { elements: elements(from).map(item => { const next = target.get(item.id); return next && ['offense', 'defense', 'ball'].includes(item.type) ? Object.assign({}, item, { x: item.x + (next.x - item.x) * ratio, y: item.y + (next.y - item.y) * ratio }) : item; }) }); }

  function openExplainModal(board) { const backdrop = renderTemplate('tpl-tactics-ai-modal'); document.body.appendChild(backdrop); const status = $('[data-role="status"]', backdrop), result = $('[data-role="text"]', backdrop), save = $('[data-action="save-note"]', backdrop); let explanation = ''; const close = () => backdrop.remove(); backdrop.addEventListener('click', event => { if (event.target === backdrop || event.target.closest('[data-action="close"]')) close(); if (event.target.closest('[data-action="save-note"]') && explanation) { BT.storage.upsertNote({ title: 'Taktik-Erklärung ' + formatDate(BT.util.todayISO()), body: explanation }); close(); } }); if (!BT.api.getToken()) { status.textContent = 'Bitte zuerst unter „Konto & Sync“ anmelden, um die geschützte KI-Erklärung zu nutzen.'; return; } BT.wake.acquire('tactics-ai'); BT.aiimport.explainTactic(board, null, message => { status.textContent = message; }).then(text => { explanation = text; status.hidden = true; result.hidden = false; result.textContent = text; save.disabled = false; }).catch(error => { status.textContent = 'Fehler: ' + error.message; }).finally(() => BT.wake.release('tactics-ai')); }
  function openGifModal(board) { const backdrop = renderTemplate('tpl-tactics-gif-modal'); document.body.appendChild(backdrop); const status = $('[data-role="status"]', backdrop), button = $('[data-action="render-gif"]', backdrop); backdrop.addEventListener('click', event => { if (event.target === backdrop || event.target.closest('[data-action="close"]')) backdrop.remove(); }); button.addEventListener('click', async () => { button.disabled = true; status.hidden = false; status.textContent = 'GIF wird erzeugt …'; try { const blob = await renderGif(board, parseFloat(backdrop.querySelector('input[name="gifspeed"]:checked').value) || null, progress => { status.textContent = 'GIF wird kodiert … ' + Math.round(progress * 100) + '%'; }); download('taktik.gif', blob); status.textContent = 'GIF gespeichert.'; } catch (error) { status.textContent = 'Fehler: ' + error.message; } finally { button.disabled = false; } }); }
  function loadGif() { if (window.GIF) return Promise.resolve(); if (gifLoading) return gifLoading; gifLoading = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js'; script.onload = resolve; script.onerror = () => reject(new Error('gif.js konnte nicht geladen werden.')); document.head.appendChild(script); }); return gifLoading; }
  async function renderGif(board, override, progress) { await loadGif(); const canvas = document.createElement('canvas'), W = 400, H = 376, scale = W / 500; canvas.width = W; canvas.height = H; const context = canvas.getContext('2d'), gif = new window.GIF({ workers: 2, quality: 12, width: W, height: H, workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js', background: '#f5e6c8' }); function frame(step) { context.save(); context.clearRect(0, 0, W, H); context.scale(scale, scale); drawCanvasStep(context, step); context.restore(); } for (let index = 0; index < board.steps.length; index++) { const from = board.steps[index], to = board.steps[index + 1], seconds = override || from.duration; if (to) { const count = Math.max(2, Math.ceil(seconds * 10)); for (let f = 0; f < count; f++) { frame(interpolateStep(from, to, f / count)); gif.addFrame(context, { delay: Math.round(seconds * 1000 / count), copy: true }); } } else { frame(from); gif.addFrame(context, { delay: Math.round(seconds * 1000), copy: true }); } } return new Promise((resolve, reject) => { gif.on('progress', progress); gif.on('finished', resolve); gif.on('abort', () => reject(new Error('GIF-Erzeugung abgebrochen.'))); gif.render(); }); }
  function drawCanvasStep(context, step) { context.fillStyle = '#f5e6c8'; context.fillRect(0, 0, 500, 470); context.strokeStyle = '#7a4a1a'; context.lineWidth = 2; context.strokeRect(10, 10, 480, 450); context.strokeRect(160, 10, 180, 190); context.beginPath(); context.arc(250, 200, 60, 0, Math.PI * 2); context.stroke(); elements(step).forEach(element => { if (element.type === 'zone') { context.fillStyle = 'rgba(46,110,170,.16)'; context.strokeStyle = '#2e6eaa'; if (element.shape === 'circle') { context.beginPath(); context.ellipse(element.x, element.y, element.width / 2, element.height / 2, 0, 0, Math.PI * 2); context.fill(); context.stroke(); } else { context.fillRect(element.x - element.width / 2, element.y - element.height / 2, element.width, element.height); context.strokeRect(element.x - element.width / 2, element.y - element.height / 2, element.width, element.height); } } else if (element.type === 'arrow') { const style = arrowStyle(element.kind); context.strokeStyle = style.color; context.lineWidth = element.kind === 'screen' ? 5 : 3; context.setLineDash(style.dash); context.beginPath(); context.moveTo(element.x, element.y); context.lineTo(element.x2, element.y2); context.stroke(); context.lineWidth = 2; context.setLineDash([]); } else if (element.type === 'cone') { context.fillStyle = '#e8a14d'; context.beginPath(); context.moveTo(element.x, element.y - 12); context.lineTo(element.x - 10, element.y + 10); context.lineTo(element.x + 10, element.y + 10); context.fill(); } else if (element.type === 'label') { context.fillStyle = '#004b2b'; context.font = 'bold 14px sans-serif'; context.textAlign = 'center'; context.fillText(element.text, element.x, element.y); } else if (['offense', 'defense'].includes(element.type)) { context.fillStyle = element.type === 'offense' ? '#e8a14d' : '#2e6eaa'; context.strokeStyle = '#123a61'; if (element.type === 'offense') { context.beginPath(); context.arc(element.x, element.y, 18, 0, Math.PI * 2); context.fill(); context.stroke(); } else { context.fillRect(element.x - 17, element.y - 17, 34, 34); context.strokeRect(element.x - 17, element.y - 17, 34, 34); } context.fillStyle = '#fff'; context.font = 'bold 11px sans-serif'; context.textAlign = 'center'; context.fillText(element.role, element.x, element.y + 4); } else if (element.type === 'ball') { context.fillStyle = '#e67e22'; context.beginPath(); context.arc(element.x, element.y, 9, 0, Math.PI * 2); context.fill(); } }); }
  function loadPdf() { if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF); if (pdfLoading) return pdfLoading; pdfLoading = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'; script.onload = () => window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('PDF-Modul konnte nicht gestartet werden.')); script.onerror = () => reject(new Error('PDF-Modul konnte nicht geladen werden.')); document.head.appendChild(script); }); return pdfLoading; }
  async function exportPdf(board) { try { const JsPDF = await loadPdf(), doc = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' }), layout = pdfLayout(); board.steps.forEach((step, index) => { if (index) doc.addPage(); doc.setFontSize(20); doc.text(board.title || 'Taktikboard', 40, 38); doc.setFontSize(11); doc.text(board.description || 'CourtHub Teamtaktik', 40, 57); doc.text('Schritt ' + (index + 1) + ' von ' + board.steps.length + ' · ' + step.duration + ' s', 40, 74); drawPdfCourt(doc, step, layout.courtX, layout.courtY, layout.courtWidth, layout.courtHeight); doc.setFontSize(9); doc.text('Legende: O Angriff · X Verteidigung · ● Ball · Grün Laufweg · Orange Pass · Lila Dribbling · Grau Screen · Blau Closeout · Braun Rotation', 40, layout.legendY); }); const blob = doc.output('blob'); download((board.title || 'taktik').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.pdf', blob); if (toast) toast('Taktik-PDF erstellt.'); } catch (error) { if (toast) toast('PDF-Export fehlgeschlagen: ' + error.message); } }
  function drawPdfCourt(doc, step, x, y, width, height) { const sx = width / 500, sy = height / 470, px = value => x + value * sx, py = value => y + value * sy; doc.setDrawColor(122, 74, 26); doc.rect(x, y, width, height); doc.rect(px(160), py(10), 180 * sx, 190 * sy); doc.circle(px(250), py(200), 60 * sx); elements(step).forEach(element => { if (element.type === 'zone') { doc.setDrawColor(46, 110, 170); if (element.shape === 'circle') doc.ellipse(px(element.x), py(element.y), element.width * sx / 2, element.height * sy / 2); else doc.rect(px(element.x - element.width / 2), py(element.y - element.height / 2), element.width * sx, element.height * sy); } else if (element.type === 'arrow') { const style = arrowStyle(element.kind); doc.setDrawColor(...style.rgb); if (style.dash.length) doc.setLineDashPattern(style.dash, 0); doc.setLineWidth(element.kind === 'screen' ? 3 : 1); doc.line(px(element.x), py(element.y), px(element.x2), py(element.y2)); doc.setLineDashPattern([], 0); doc.setLineWidth(1); } else if (['offense', 'defense'].includes(element.type)) { doc.setFillColor(element.type === 'offense' ? 232 : 46, element.type === 'offense' ? 161 : 110, element.type === 'offense' ? 77 : 170); if (element.type === 'offense') doc.circle(px(element.x), py(element.y), 13 * sx, 'FD'); else doc.rect(px(element.x) - 13 * sx, py(element.y) - 13 * sy, 26 * sx, 26 * sy, 'FD'); doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.text(element.role, px(element.x), py(element.y) + 3, { align: 'center' }); doc.setTextColor(0, 0, 0); } else if (element.type === 'ball') { doc.setFillColor(230, 126, 34); doc.circle(px(element.x), py(element.y), 7 * sx, 'FD'); } else if (element.type === 'cone') { doc.setFillColor(232, 161, 77); doc.triangle(px(element.x), py(element.y - 10), px(element.x - 9), py(element.y + 9), px(element.x + 9), py(element.y + 9), 'F'); } else if (element.type === 'label') { doc.setFontSize(10); doc.text(element.text, px(element.x), py(element.y), { align: 'center' }); } }); }
  function download(filename, blob) { const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); setTimeout(() => { URL.revokeObjectURL(url); anchor.remove(); }, 500); }
  return { render, renderPlayer, normalizeBoard, templates, cloneStep, interpolateStep, arrowStyle, pdfLayout };
})();
