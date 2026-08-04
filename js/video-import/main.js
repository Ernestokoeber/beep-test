import { createBoardFromVideoDraft, formatSeconds, validateCalibration } from './core.js';
import { injectVideoImportStyles } from './styles.js';

const core = window.BT.tactics.__core;
const MARKERS = [
  ...Array.from({ length: 5 }, (_, index) => ({ id: `o${index + 1}`, type: 'offense', role: String(index + 1) })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `d${index + 1}`, type: 'defense', role: `X${index + 1}` })),
  { id: 'ball', type: 'ball', role: 'Ball' }
];
const CALIBRATION_LABELS = [
  'Hintere linke Ecke',
  'Hintere rechte Ecke',
  'Vordere rechte Ecke',
  'Vordere linke Ecke'
];

let activeCleanup = null;

function uid(prefix) {
  return core.uid ? core.uid(prefix) : `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toast(message) {
  window.BT.util?.toast?.(message);
}

function template() {
  return `
    <section class="view video-import" data-role="video-import">
      <header class="vi-head">
        <div>
          <span class="vi-kicker">CourtHub Video Import · V1</span>
          <h2>Play aus Video erstellen</h2>
          <p>Kurzen Clip laden, Spielfeld kalibrieren, Spieler in mindestens zwei Keyframes markieren und anschließend als vollständig bearbeitbares CourtHub-Play übernehmen.</p>
        </div>
        <div class="vi-head-actions">
          <a class="vi-btn" href="#/tactics">← Play Designer</a>
          <button class="vi-btn primary" type="button" data-action="create-play">Play erzeugen</button>
        </div>
      </header>

      <div class="vi-steps" aria-label="Import-Schritte">
        ${['Video laden', 'Clip festlegen', 'Court markieren', 'Keyframes setzen', 'Play übernehmen'].map((label, index) => `<div class="vi-step" data-step="${index + 1}"><span>${index + 1}</span>${label}</div>`).join('')}
      </div>

      <div class="vi-grid">
        <main class="vi-card">
          <div class="vi-card-head"><h3>Video und Markierungen</h3><span class="vi-time" data-role="current-label">0:00.0</span></div>
          <div class="vi-card-body">
            <label class="vi-file">
              <strong>Video auswählen</strong>
              <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" data-role="video-file">
              <small>MP4, MOV oder WebM · ideal sind 5–30 Sekunden · das Video bleibt lokal auf diesem Gerät.</small>
            </label>
            <div class="vi-video-shell" data-role="video-shell">
              <div class="vi-empty-video" data-role="video-empty"><strong>Noch kein Video geladen</strong>Nutze eine gespeicherte Bildschirmaufnahme oder einen kurzen Videoclip.</div>
              <video playsinline preload="metadata" data-role="video" hidden></video>
              <canvas class="vi-overlay" data-role="overlay"></canvas>
            </div>
            <div class="vi-controls">
              <button class="vi-btn small" type="button" data-action="play">▶</button>
              <input type="range" min="0" max="1" step="0.01" value="0" data-role="time-range">
              <button class="vi-btn small" type="button" data-action="frame-forward">+0,1 s</button>
            </div>
            <div class="vi-trim">
              <div class="vi-field"><label>Clip-Start</label><input type="number" min="0" step="0.1" value="0" data-role="clip-start"></div>
              <div class="vi-field"><label>Clip-Ende</label><input type="number" min="0" step="0.1" value="0" data-role="clip-end"></div>
            </div>
          </div>
        </main>

        <aside class="vi-card">
          <div class="vi-card-head"><h3>Import-Assistent</h3><button class="vi-btn small" type="button" data-action="reset">Neu starten</button></div>
          <div class="vi-card-body">
            <div class="vi-field"><label>Play-Name</label><input maxlength="100" value="Play aus Video" data-role="title"></div>
            <div class="vi-field"><label>Kategorie</label><select data-role="category"><option>Offense</option><option>Defense</option><option>Horns</option><option>5-Out</option><option>Transition</option><option>Einwurf</option><option>Press Break</option></select></div>

            <div class="vi-status" data-role="status">Beginne mit einem kurzen Video.</div>

            <section data-role="calibration-panel">
              <strong>1. Spielfeld kalibrieren</strong>
              <p class="vi-help">Tippe die vier Spielfeldecken in der angegebenen Reihenfolge an. Sichtbar sein muss nur die ebene Spielfläche, nicht zwingend das komplette Feld.</p>
              <div class="vi-calibration-list" data-role="calibration-list"></div>
              <div class="vi-actions">
                <button class="vi-btn small primary" type="button" data-action="calibration-mode">Court-Punkte setzen</button>
                <button class="vi-btn small" type="button" data-action="calibration-undo">Letzten Punkt löschen</button>
              </div>
            </section>

            <hr>

            <section data-role="keyframe-panel">
              <strong>2. Spieler und Ball markieren</strong>
              <p class="vi-help">Füge an wichtigen Zeitpunkten Keyframes hinzu. Wähle danach einen Marker und tippe seine Position im Video an. Ein neuer Keyframe übernimmt die Positionen des vorherigen.</p>
              <div class="vi-token-palette" data-role="marker-palette"></div>
              <div class="vi-actions">
                <button class="vi-btn small primary" type="button" data-action="add-keyframe">Keyframe bei aktueller Zeit</button>
                <button class="vi-btn small" type="button" data-action="marker-mode">Marker setzen</button>
              </div>
              <div class="vi-keyframes" data-role="keyframes"></div>
            </section>

            <div class="vi-summary">
              <div><strong data-role="calibration-count">0/4</strong><span>Court-Punkte</span></div>
              <div><strong data-role="frame-count">0</strong><span>Keyframes</span></div>
              <div><strong data-role="position-count">0</strong><span>Positionen</span></div>
            </div>
            <p class="vi-note">V1 arbeitet halbautomatisch: CourtHub berechnet aus deinen Keyframes Laufwege und versucht Ballbesitzwechsel als Pass zu erkennen. Das erzeugte Play kann anschließend vollständig verändert werden.</p>
          </div>
        </aside>
      </div>
    </section>`;
}

function renderMarkerPalette(container, selectedId, onSelect) {
  container.replaceChildren();
  MARKERS.forEach(marker => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `vi-token ${marker.type}${marker.id === selectedId ? ' active' : ''}`;
    button.textContent = marker.role;
    button.title = marker.type === 'offense' ? `Angriff ${marker.role}` : marker.type === 'defense' ? `Verteidigung ${marker.role}` : 'Ball';
    button.onclick = () => onSelect(marker.id);
    container.append(button);
  });
}

function markerColor(type) {
  if (type === 'offense') return '#1680c4';
  if (type === 'defense') return '#242b35';
  return '#f97316';
}

export function mount(target) {
  cleanup();
  injectVideoImportStyles();

  const root = document.createElement('div');
  root.innerHTML = template();
  const view = root.firstElementChild;
  target.appendChild(view);

  if (!core.canEdit()) {
    view.innerHTML = '<div class="vi-card"><div class="vi-card-body"><span class="vi-kicker">Geschützter Trainerbereich</span><h2>Play aus Video erstellen</h2><p class="vi-help">Bitte als Admin, Coach oder Assistenz anmelden, um Videos in bearbeitbare Plays umzuwandeln.</p><a class="vi-btn primary" href="#/account">Anmelden</a></div></div>';
    activeCleanup = () => view.remove();
    return view;
  }

  const q = selector => view.querySelector(selector);
  const video = q('[data-role="video"]');
  const canvas = q('[data-role="overlay"]');
  const context = canvas.getContext('2d');
  const resizeObserver = new ResizeObserver(resizeCanvas);
  const state = {
    objectUrl: null,
    fileName: '',
    duration: 0,
    clipStart: 0,
    clipEnd: 0,
    calibration: [],
    mode: 'calibration',
    selectedMarker: 'o1',
    frames: [],
    activeFrameId: null,
    draggingMarker: null
  };

  function activeFrame() {
    return state.frames.find(frame => frame.id === state.activeFrameId) || null;
  }

  function sortedFrames() {
    return [...state.frames].sort((left, right) => left.time - right.time);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawOverlay();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function drawOverlay() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    if (!state.duration) return;

    if (state.calibration.length) {
      context.save();
      context.lineWidth = 2;
      context.strokeStyle = '#ff9d2e';
      context.fillStyle = 'rgba(255,157,46,.14)';
      context.beginPath();
      state.calibration.forEach((point, index) => {
        const x = point.x * width;
        const y = point.y * height;
        if (!index) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      if (state.calibration.length === 4) context.closePath();
      context.fill();
      context.stroke();
      context.restore();

      state.calibration.forEach((point, index) => {
        const x = point.x * width;
        const y = point.y * height;
        context.beginPath();
        context.fillStyle = '#ff9d2e';
        context.arc(x, y, 11, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#261506';
        context.font = '900 12px sans-serif';
        context.textAlign = 'center';
        context.fillText(String(index + 1), x, y + 4);
      });
    }

    const frame = activeFrame();
    if (!frame) return;
    MARKERS.forEach(marker => {
      const point = frame.positions[marker.id];
      if (!point) return;
      const x = point.x * width;
      const y = point.y * height;
      context.save();
      context.shadowColor = 'rgba(0,0,0,.55)';
      context.shadowBlur = 7;
      context.shadowOffsetY = 3;
      context.beginPath();
      context.fillStyle = markerColor(marker.type);
      context.strokeStyle = marker.id === state.selectedMarker ? '#ffb454' : '#fff';
      context.lineWidth = marker.id === state.selectedMarker ? 4 : 2;
      context.arc(x, y, marker.type === 'ball' ? 8 : 15, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
      if (marker.type !== 'ball') {
        context.fillStyle = '#fff';
        context.font = '900 10px sans-serif';
        context.textAlign = 'center';
        context.fillText(marker.type === 'defense' ? 'X' : marker.role, x, y + 3.5);
      }
    });
  }

  function updateCalibrationList() {
    const list = q('[data-role="calibration-list"]');
    list.replaceChildren();
    CALIBRATION_LABELS.forEach((label, index) => {
      const item = document.createElement('div');
      item.className = index < state.calibration.length ? 'done' : '';
      item.textContent = `${index + 1}. ${label}`;
      list.append(item);
    });
  }

  function updateKeyframes() {
    const container = q('[data-role="keyframes"]');
    container.replaceChildren();
    sortedFrames().forEach((frame, index) => {
      const row = document.createElement('div');
      row.className = `vi-keyframe${frame.id === state.activeFrameId ? ' active' : ''}`;
      const positions = Object.keys(frame.positions).length;
      row.innerHTML = `<button type="button" data-open><strong>Keyframe ${index + 1}</strong><br><span>${formatSeconds(frame.time)} · ${positions} Marker</span></button><button type="button" data-copy title="Aktuelle Videozeit übernehmen">⏱</button><button type="button" data-delete title="Löschen">×</button>`;
      row.querySelector('[data-open]').onclick = () => {
        state.activeFrameId = frame.id;
        video.currentTime = frame.time;
        state.mode = 'markers';
        refresh();
      };
      row.querySelector('[data-copy]').onclick = () => {
        frame.time = Math.max(state.clipStart, Math.min(state.clipEnd, video.currentTime));
        refresh();
      };
      row.querySelector('[data-delete]').onclick = () => {
        state.frames = state.frames.filter(item => item.id !== frame.id);
        if (state.activeFrameId === frame.id) state.activeFrameId = state.frames[0]?.id || null;
        refresh();
      };
      container.append(row);
    });
    if (!state.frames.length) container.innerHTML = '<p class="vi-help">Noch keine Keyframes vorhanden.</p>';
  }

  function progressStep() {
    if (!state.duration) return 1;
    if (state.clipEnd <= state.clipStart) return 2;
    if (!validateCalibration(state.calibration)) return 3;
    if (state.frames.length < 2) return 4;
    return 5;
  }

  function countPositions() {
    return state.frames.reduce((sum, frame) => sum + Object.keys(frame.positions).length, 0);
  }

  function refresh() {
    q('[data-role="clip-start"]').value = state.clipStart.toFixed(1);
    q('[data-role="clip-end"]').value = state.clipEnd.toFixed(1);
    q('[data-role="current-label"]').textContent = formatSeconds(video.currentTime || 0);
    q('[data-role="time-range"]').value = String(video.currentTime || 0);
    q('[data-role="calibration-count"]').textContent = `${state.calibration.length}/4`;
    q('[data-role="frame-count"]').textContent = String(state.frames.length);
    q('[data-role="position-count"]').textContent = String(countPositions());
    q('[data-action="play"]').textContent = video.paused ? '▶' : 'Ⅱ';
    q('[data-action="create-play"]').disabled = progressStep() < 5;
    q('[data-action="add-keyframe"]').disabled = !state.duration || !validateCalibration(state.calibration);
    q('[data-action="marker-mode"]').disabled = !activeFrame();
    q('[data-action="calibration-mode"]').classList.toggle('primary', state.mode === 'calibration');
    q('[data-action="marker-mode"]').classList.toggle('primary', state.mode === 'markers');
    q('[data-role="status"]').textContent = state.mode === 'calibration'
      ? state.calibration.length < 4
        ? `Court-Kalibrierung: Markiere Punkt ${state.calibration.length + 1} – ${CALIBRATION_LABELS[state.calibration.length]}.`
        : 'Court-Kalibrierung vollständig. Füge jetzt mindestens zwei Keyframes hinzu.'
      : activeFrame()
        ? `Marker-Modus: ${MARKERS.find(marker => marker.id === state.selectedMarker)?.role || state.selectedMarker} bei ${formatSeconds(activeFrame().time)} positionieren.`
        : 'Füge zuerst einen Keyframe bei der aktuellen Videozeit hinzu.';
    view.querySelectorAll('[data-step]').forEach(item => item.classList.toggle('active', Number(item.dataset.step) === progressStep()));
    updateCalibrationList();
    updateKeyframes();
    renderMarkerPalette(q('[data-role="marker-palette"]'), state.selectedMarker, id => {
      state.selectedMarker = id;
      state.mode = 'markers';
      refresh();
    });
    drawOverlay();
  }

  function loadFile(file) {
    if (!file) return;
    if (!file.type.startsWith('video/')) return toast('Bitte eine Videodatei auswählen.');
    if (file.size > 300 * 1024 * 1024) return toast('Das Video ist größer als 300 MB. Bitte zuerst kürzen.');
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    state.fileName = file.name;
    video.src = state.objectUrl;
    video.hidden = false;
    q('[data-role="video-empty"]').hidden = true;
    video.load();
  }

  function resetWorkflow() {
    video.pause();
    state.clipStart = 0;
    state.clipEnd = state.duration;
    state.calibration = [];
    state.mode = 'calibration';
    state.selectedMarker = 'o1';
    state.frames = [];
    state.activeFrameId = null;
    video.currentTime = 0;
    refresh();
  }

  function addKeyframe() {
    if (!state.duration || !validateCalibration(state.calibration)) return;
    const time = Math.max(state.clipStart, Math.min(state.clipEnd, video.currentTime));
    const existing = state.frames.find(frame => Math.abs(frame.time - time) < .05);
    if (existing) {
      state.activeFrameId = existing.id;
      state.mode = 'markers';
      return refresh();
    }
    const previous = sortedFrames().filter(frame => frame.time <= time).at(-1) || sortedFrames().at(-1);
    const frame = {
      id: uid('video_frame_'),
      time,
      positions: previous ? clone(previous.positions) : {}
    };
    state.frames.push(frame);
    state.activeFrameId = frame.id;
    state.mode = 'markers';
    refresh();
  }

  function nearestMarker(point) {
    const frame = activeFrame();
    if (!frame) return null;
    const rect = canvas.getBoundingClientRect();
    let best = null;
    MARKERS.forEach(marker => {
      const position = frame.positions[marker.id];
      if (!position) return;
      const distance = Math.hypot((position.x - point.x) * rect.width, (position.y - point.y) * rect.height);
      if (!best || distance < best.distance) best = { marker, distance };
    });
    return best && best.distance <= 24 ? best.marker : null;
  }

  function placeMarker(point) {
    const frame = activeFrame();
    if (!frame) return toast('Bitte zuerst einen Keyframe hinzufügen.');
    frame.positions[state.selectedMarker] = point;
    drawOverlay();
    updateKeyframes();
    q('[data-role="position-count"]').textContent = String(countPositions());
  }

  function createPlay() {
    try {
      const board = core.normalizeBoard(createBoardFromVideoDraft({
        title: q('[data-role="title"]').value,
        category: q('[data-role="category"]').value,
        calibration: state.calibration,
        markers: MARKERS,
        frames: state.frames,
        clipStart: state.clipStart,
        clipEnd: state.clipEnd
      }));
      window.BT.storage.setSetting('tacticsBoardDraft', board);
      toast('Video-Play erstellt. Du kannst jetzt alle Aktionen weiter bearbeiten.');
      location.hash = '#/tactics';
    } catch (error) {
      toast(error.message);
      q('[data-role="status"]').textContent = error.message;
    }
  }

  q('[data-role="video-file"]').onchange = event => loadFile(event.target.files?.[0]);
  q('[data-action="play"]').onclick = () => video.paused ? video.play() : video.pause();
  q('[data-action="frame-forward"]').onclick = () => {
    video.pause();
    video.currentTime = Math.min(state.clipEnd || state.duration, video.currentTime + .1);
  };
  q('[data-role="time-range"]').oninput = event => {
    video.pause();
    video.currentTime = Number(event.target.value) || 0;
  };
  q('[data-role="clip-start"]').onchange = event => {
    state.clipStart = Math.max(0, Math.min(state.clipEnd - .1, Number(event.target.value) || 0));
    video.currentTime = state.clipStart;
    refresh();
  };
  q('[data-role="clip-end"]').onchange = event => {
    state.clipEnd = Math.min(state.duration, Math.max(state.clipStart + .1, Number(event.target.value) || state.duration));
    video.currentTime = Math.min(video.currentTime, state.clipEnd);
    refresh();
  };
  q('[data-action="calibration-mode"]').onclick = () => { state.mode = 'calibration'; refresh(); };
  q('[data-action="calibration-undo"]').onclick = () => { state.calibration.pop(); state.mode = 'calibration'; refresh(); };
  q('[data-action="marker-mode"]').onclick = () => { state.mode = 'markers'; refresh(); };
  q('[data-action="add-keyframe"]').onclick = addKeyframe;
  q('[data-action="create-play"]').onclick = createPlay;
  q('[data-action="reset"]').onclick = resetWorkflow;

  video.onloadedmetadata = () => {
    state.duration = Number.isFinite(video.duration) ? video.duration : 0;
    state.clipStart = 0;
    state.clipEnd = state.duration;
    q('[data-role="time-range"]').max = String(state.duration || 1);
    q('[data-role="clip-start"]').max = String(state.duration || 0);
    q('[data-role="clip-end"]').max = String(state.duration || 0);
    resizeObserver.observe(video);
    refresh();
  };
  video.ontimeupdate = () => {
    if (state.clipEnd && video.currentTime > state.clipEnd) {
      video.pause();
      video.currentTime = state.clipStart;
    }
    q('[data-role="current-label"]').textContent = formatSeconds(video.currentTime || 0);
    q('[data-role="time-range"]').value = String(video.currentTime || 0);
  };
  video.onplay = refresh;
  video.onpause = refresh;

  canvas.onpointerdown = event => {
    if (!state.duration) return;
    const point = canvasPoint(event);
    if (state.mode === 'calibration') {
      if (state.calibration.length >= 4) state.calibration = [];
      state.calibration.push(point);
      if (state.calibration.length === 4) state.mode = 'markers';
      refresh();
      return;
    }
    const hit = nearestMarker(point);
    if (hit) {
      state.selectedMarker = hit.id;
      state.draggingMarker = hit.id;
      canvas.setPointerCapture(event.pointerId);
    } else {
      placeMarker(point);
    }
    refresh();
  };
  canvas.onpointermove = event => {
    if (!state.draggingMarker) return;
    const frame = activeFrame();
    if (!frame) return;
    frame.positions[state.draggingMarker] = canvasPoint(event);
    drawOverlay();
  };
  const finishDrag = event => {
    if (!state.draggingMarker) return;
    state.draggingMarker = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    refresh();
  };
  canvas.onpointerup = finishDrag;
  canvas.onpointercancel = finishDrag;

  resizeObserver.observe(q('[data-role="video-shell"]'));
  refresh();

  activeCleanup = () => {
    video.pause();
    resizeObserver.disconnect();
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    view.remove();
  };
  return view;
}

export function cleanup() {
  if (activeCleanup) activeCleanup();
  activeCleanup = null;
}
