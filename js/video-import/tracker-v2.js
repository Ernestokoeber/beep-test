const DRAFT_KEY = 'tacticsBoardDraft';
const MARKER_IDS = ['o1', 'o2', 'o3', 'o4', 'o5', 'd1', 'd2', 'd3', 'd4', 'd5', 'ball'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function timeKey(value) {
  return (Math.round((Number(value) || 0) * 100) / 100).toFixed(2);
}

function parseTimeLabel(value) {
  const match = String(value || '').match(/(\d+):(\d+(?:[.,]\d+)?)/);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2].replace(',', '.'));
}

export function grayscaleFrame(imageData, width, height) {
  const source = imageData?.data || imageData;
  if (!source || source.length !== width * height * 4) throw new Error('Videobild besitzt ungültige Bilddaten.');
  const gray = new Uint8Array(width * height);
  for (let sourceIndex = 0, target = 0; sourceIndex < source.length; sourceIndex += 4, target += 1) {
    gray[target] = Math.round(source[sourceIndex] * .299 + source[sourceIndex + 1] * .587 + source[sourceIndex + 2] * .114);
  }
  return { width, height, gray };
}

function patchScore(previous, next, centerA, centerB, radius) {
  const samplesA = [];
  const samplesB = [];
  for (let y = -radius; y <= radius; y += 2) {
    for (let x = -radius; x <= radius; x += 2) {
      const ax = clamp(Math.round(centerA.x + x), 0, previous.width - 1);
      const ay = clamp(Math.round(centerA.y + y), 0, previous.height - 1);
      const bx = clamp(Math.round(centerB.x + x), 0, next.width - 1);
      const by = clamp(Math.round(centerB.y + y), 0, next.height - 1);
      samplesA.push(previous.gray[ay * previous.width + ax]);
      samplesB.push(next.gray[by * next.width + bx]);
    }
  }
  const meanA = samplesA.reduce((sum, value) => sum + value, 0) / samplesA.length;
  const meanB = samplesB.reduce((sum, value) => sum + value, 0) / samplesB.length;
  let score = 0;
  for (let index = 0; index < samplesA.length; index += 1) {
    score += Math.abs((samplesA[index] - meanA) - (samplesB[index] - meanB));
  }
  return score / samplesA.length;
}

export function trackGrayPoint(previous, next, normalizedPoint, options = {}) {
  if (!previous?.gray || !next?.gray || previous.width !== next.width || previous.height !== next.height) {
    throw new Error('Tracking-Bilder besitzen unterschiedliche Größen.');
  }
  const radius = clamp(options.patchRadius || 7, 3, 18);
  const searchRadius = clamp(options.searchRadius || 28, 6, 80);
  const searchStep = clamp(options.searchStep || 2, 1, 6);
  const source = {
    x: clamp(normalizedPoint.x, 0, 1) * (previous.width - 1),
    y: clamp(normalizedPoint.y, 0, 1) * (previous.height - 1)
  };
  let best = { x: source.x, y: source.y, score: Infinity };
  let second = Infinity;

  for (let dy = -searchRadius; dy <= searchRadius; dy += searchStep) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += searchStep) {
      const candidate = {
        x: clamp(source.x + dx, radius, next.width - radius - 1),
        y: clamp(source.y + dy, radius, next.height - radius - 1)
      };
      const score = patchScore(previous, next, source, candidate, radius);
      if (score < best.score) {
        second = best.score;
        best = { ...candidate, score };
      } else if (score < second) {
        second = score;
      }
    }
  }

  const contrast = Number.isFinite(second) ? clamp((second - best.score) / Math.max(4, second), 0, 1) : 0;
  const quality = clamp(1 - best.score / 70, 0, 1);
  return {
    point: {
      x: clamp(best.x / Math.max(1, next.width - 1), 0, 1),
      y: clamp(best.y / Math.max(1, next.height - 1), 0, 1)
    },
    confidence: clamp(quality * .78 + contrast * .22, 0, 1),
    score: best.score
  };
}

function seekVideo(video, time) {
  const target = clamp(time, 0, Number(video.duration) || time);
  if (Math.abs((video.currentTime || 0) - target) < .012 && video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer = 0;
    const finish = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', finish);
      video.removeEventListener('error', fail);
      resolve();
    };
    const fail = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', finish);
      video.removeEventListener('error', fail);
      reject(new Error('Videobild konnte nicht gelesen werden.'));
    };
    video.addEventListener('seeked', finish, { once: true });
    video.addEventListener('error', fail, { once: true });
    timer = setTimeout(fail, 5000);
    video.currentTime = target;
  });
}

function captureFrame(video, maximumWidth = 480) {
  const sourceWidth = Math.max(1, video.videoWidth || video.clientWidth || maximumWidth);
  const sourceHeight = Math.max(1, video.videoHeight || video.clientHeight || 360);
  const scale = Math.min(1, maximumWidth / sourceWidth);
  const width = Math.max(64, Math.round(sourceWidth * scale));
  const height = Math.max(64, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas-Tracking wird von diesem Browser nicht unterstützt.');
  context.drawImage(video, 0, 0, width, height);
  return grayscaleFrame(context.getImageData(0, 0, width, height), width, height);
}

async function trackSequence(video, startTime, endTime, startingPositions, markerTypes, interval, onProgress) {
  const duration = Math.max(.1, endTime - startTime);
  const requested = Math.max(1, Math.ceil(duration / interval));
  const count = Math.min(36, requested);
  const actualInterval = duration / count;
  const results = [];
  let positions = JSON.parse(JSON.stringify(startingPositions));

  await seekVideo(video, startTime);
  let previous = captureFrame(video);

  for (let index = 1; index <= count; index += 1) {
    const time = index === count ? endTime : startTime + actualInterval * index;
    await seekVideo(video, time);
    const next = captureFrame(video);
    const tracked = {};
    const confidences = {};

    Object.entries(positions).forEach(([id, point]) => {
      const ball = markerTypes[id] === 'ball';
      const match = trackGrayPoint(previous, next, point, {
        patchRadius: ball ? 4 : 7,
        searchRadius: ball ? 42 : 30,
        searchStep: ball ? 2 : 2
      });
      tracked[id] = match.point;
      confidences[id] = match.confidence;
    });

    positions = tracked;
    previous = next;
    results.push({ time, positions: tracked, confidences });
    onProgress?.(index / count, results.at(-1));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return results;
}

export function addScreenCandidates(boardInput, suppliedCore) {
  const core = suppliedCore || window.BT.tactics.__core;
  const board = core.normalizeBoard(boardInput);
  let added = 0;

  for (let index = 0; index < board.steps.length - 1; index += 1) {
    const step = board.steps[index];
    const next = board.steps[index + 1];
    const transition = core.normalizeTransition(step.transition);
    if (transition.screens.length) continue;

    const offense = core.elements(step, 'offense');
    const defense = core.elements(step, 'defense');
    let best = null;

    offense.forEach(screener => {
      const nextScreener = core.elementById(next, screener.id);
      if (!nextScreener || core.distance(screener, nextScreener) > 24) return;
      const defender = defense
        .map(player => ({ player, distance: core.distance(player, screener) }))
        .sort((left, right) => left.distance - right.distance)[0];
      if (!defender || defender.distance > 52) return;

      offense.filter(player => player.id !== screener.id).forEach(cutter => {
        const nextCutter = core.elementById(next, cutter.id);
        if (!nextCutter || core.distance(cutter, nextCutter) < 38) return;
        const proximity = Math.min(core.distance(cutter, screener), core.distance(nextCutter, nextScreener));
        if (proximity > 92) return;
        const score = defender.distance + proximity;
        if (!best || score < best.score) best = { screener, defender: defender.player, score };
      });
    });

    if (!best) continue;
    const angle = Math.atan2(best.defender.y - best.screener.y, best.defender.x - best.screener.x) * 180 / Math.PI + 90;
    transition.screens.push({
      id: `video_screen_${index}_${best.screener.id}`,
      type: 'screen',
      elementId: best.screener.id,
      start: Math.max(0, step.duration * .18),
      duration: Math.min(1.15, Math.max(.45, step.duration * .58)),
      x: best.screener.x,
      y: best.screener.y,
      angle
    });
    step.transition = transition;
    added += 1;
  }

  if (added) {
    const note = `${added} mögliche Screen${added === 1 ? '' : 's'} automatisch erkannt – bitte kurz prüfen.`;
    board.description = `${board.description ? board.description + ' ' : ''}${note}`.slice(0, 400);
  }
  return { board: core.normalizeBoard(board), added };
}

function markerTypeMap(view) {
  const output = {};
  [...view.querySelectorAll('.vi-token')].forEach((button, index) => {
    const id = MARKER_IDS[index];
    if (!id) return;
    output[id] = button.classList.contains('ball') ? 'ball' : button.classList.contains('defense') ? 'defense' : 'offense';
  });
  return output;
}

function activeMarkerId(view) {
  const buttons = [...view.querySelectorAll('.vi-token')];
  const index = buttons.findIndex(button => button.classList.contains('active'));
  return MARKER_IDS[index] || null;
}

function activeFrameTime(view) {
  const row = view.querySelector('.vi-keyframe.active');
  return parseTimeLabel(row?.querySelector('span')?.textContent || row?.textContent);
}

function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
    y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
  };
}

function dispatchMarker(canvas, point) {
  const rect = canvas.getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    pointerId: 741,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: rect.left + point.x * rect.width,
    clientY: rect.top + point.y * rect.height
  };
  canvas.dispatchEvent(new PointerEvent('pointerdown', init));
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0 }));
}

function injectStyles() {
  if (document.getElementById('courthub-video-tracker-v2')) return;
  const style = document.createElement('style');
  style.id = 'courthub-video-tracker-v2';
  style.textContent = `
    .vi-tracker-v2{margin:.75rem 0;padding:.72rem;border:1px solid rgba(22,128,196,.2);border-radius:.72rem;background:rgba(22,128,196,.055)}
    [data-theme="dark"] .vi-tracker-v2{background:rgba(22,128,196,.09);border-color:rgba(96,190,245,.22)}
    .vi-tracker-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.35rem}.vi-tracker-head strong{font-size:.78rem}.vi-tracker-badge{font-size:.62rem;font-weight:900;letter-spacing:.08em;color:#12679a}
    .vi-tracker-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;align-items:end}.vi-tracker-controls label{display:grid;gap:.25rem;font-size:.67rem;font-weight:800;color:var(--muted,#64756d)}
    .vi-tracker-controls select{width:100%;border:1px solid rgba(20,60,42,.17);border-radius:.6rem;padding:.5rem;background:var(--surface,#fff);color:inherit}
    [data-theme="dark"] .vi-tracker-controls select{background:#06120d;border-color:rgba(255,255,255,.11)}
    .vi-tracker-status{margin:.45rem 0 0;font-size:.69rem;line-height:1.45;color:var(--muted,#64756d)}
    .vi-tracker-status.warning{color:#b45309}.vi-tracker-status.success{color:#087443}
    @media(max-width:560px){.vi-tracker-controls{grid-template-columns:1fr}.vi-tracker-controls .vi-btn{width:100%}}
  `;
  document.head.append(style);
}

export function enhanceVideoTracking(view) {
  const video = view?.querySelector?.('[data-role="video"]');
  const canvas = view?.querySelector?.('[data-role="overlay"]');
  const panel = view?.querySelector?.('[data-role="keyframe-panel"]');
  if (!video || !canvas || !panel || view.dataset.trackerV2Installed === 'true') return view;
  view.dataset.trackerV2Installed = 'true';
  injectStyles();

  const shadowFrames = new Map();
  let dragging = false;
  let running = false;

  const tracker = document.createElement('div');
  tracker.className = 'vi-tracker-v2';
  tracker.innerHTML = `
    <div class="vi-tracker-head"><strong>Automatisches Tracking</strong><span class="vi-tracker-badge">V2 · LOKAL</span></div>
    <p class="vi-help">Markiere die Spieler und den Ball einmal, wähle danach eine spätere Videozeit und lasse CourtHub die Positionen dazwischen verfolgen.</p>
    <div class="vi-tracker-controls"><label>Tracking-Abstand<select data-track-interval><option value="0.25">Genau · 0,25 s</option><option value="0.4" selected>Normal · 0,40 s</option><option value="0.6">Schnell · 0,60 s</option></select></label><button class="vi-btn small primary" type="button" data-track-start>Bis zur aktuellen Zeit verfolgen</button></div>
    <p class="vi-tracker-status" data-track-status>Ersten Keyframe vollständig markieren.</p>`;
  panel.append(tracker);

  const status = tracker.querySelector('[data-track-status]');
  const button = tracker.querySelector('[data-track-start]');

  function nearestKnown(time) {
    return [...shadowFrames.entries()]
      .map(([key, positions]) => ({ time: Number(key), positions }))
      .filter(item => item.time <= time + .02)
      .sort((left, right) => right.time - left.time)[0]?.positions || {};
  }

  function ensureActiveShadow() {
    const time = activeFrameTime(view);
    if (!Number.isFinite(time)) return null;
    const key = timeKey(time);
    if (!shadowFrames.has(key)) shadowFrames.set(key, JSON.parse(JSON.stringify(nearestKnown(time))));
    return { time, key, positions: shadowFrames.get(key) };
  }

  function recordPointer(event) {
    if (!view.querySelector('[data-action="marker-mode"]')?.classList.contains('primary')) return;
    const frame = ensureActiveShadow();
    if (!frame) return;
    setTimeout(() => {
      const id = activeMarkerId(view);
      if (!id) return;
      frame.positions[id] = canvasPoint(canvas, event);
      updateState();
    }, 0);
  }

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    recordPointer(event);
  }, true);
  canvas.addEventListener('pointermove', event => {
    if (dragging) recordPointer(event);
  }, true);
  canvas.addEventListener('pointerup', () => { dragging = false; }, true);
  canvas.addEventListener('pointercancel', () => { dragging = false; }, true);

  function updateState() {
    if (running) return;
    const active = ensureActiveShadow();
    const count = active ? Object.keys(active.positions).length : 0;
    const end = Number(video.currentTime) || 0;
    const valid = active && count > 0 && end > active.time + .08 && video.readyState >= 2;
    button.disabled = !valid;
    status.className = 'vi-tracker-status';
    status.textContent = !active
      ? 'Zuerst einen Keyframe anlegen.'
      : !count
        ? 'Im aktiven Keyframe mindestens einen Marker setzen.'
        : end <= active.time + .08
          ? `${count} Marker bereit. Jetzt zu einer späteren Videozeit wechseln.`
          : `${count} Marker bereit · ${active.time.toFixed(1)} s bis ${end.toFixed(1)} s.`;
  }

  const observer = new MutationObserver(updateState);
  observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  video.addEventListener('timeupdate', updateState);
  video.addEventListener('loadeddata', updateState);

  button.onclick = async () => {
    if (running) return;
    const active = ensureActiveShadow();
    if (!active || !Object.keys(active.positions).length) return;
    const endTime = Number(video.currentTime) || active.time;
    if (endTime <= active.time + .08) return;

    running = true;
    button.disabled = true;
    video.pause();
    const interval = Number(tracker.querySelector('[data-track-interval]').value) || .4;
    const types = markerTypeMap(view);
    status.className = 'vi-tracker-status';
    status.textContent = 'Tracking wird vorbereitet …';

    try {
      const results = await trackSequence(
        video,
        active.time,
        endTime,
        active.positions,
        types,
        interval,
        progress => {
          status.textContent = `Positionen werden verfolgt … ${Math.round(progress * 100)} %`;
        }
      );

      let uncertain = 0;
      for (let frameIndex = 0; frameIndex < results.length; frameIndex += 1) {
        const frame = results[frameIndex];
        await seekVideo(video, frame.time);
        view.querySelector('[data-action="add-keyframe"]')?.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        for (const [id, point] of Object.entries(frame.positions)) {
          const confidence = frame.confidences[id] || 0;
          const minimum = types[id] === 'ball' ? .25 : .34;
          if (confidence < minimum) uncertain += 1;
          const index = MARKER_IDS.indexOf(id);
          const marker = [...view.querySelectorAll('.vi-token')][index];
          if (!marker) continue;
          marker.click();
          dispatchMarker(canvas, point);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        shadowFrames.set(timeKey(frame.time), JSON.parse(JSON.stringify(frame.positions)));
        status.textContent = `Keyframes werden eingesetzt … ${frameIndex + 1}/${results.length}`;
      }

      await seekVideo(video, endTime);
      status.className = `vi-tracker-status ${uncertain ? 'warning' : 'success'}`;
      status.textContent = uncertain
        ? `Tracking abgeschlossen. ${uncertain} Positionen hatten geringe Sicherheit und sollten kurz kontrolliert werden.`
        : `Tracking abgeschlossen. ${results.length} neue Keyframes wurden angelegt.`;
      window.BT.util?.toast?.('Automatisches Video-Tracking abgeschlossen.');
    } catch (error) {
      console.error('CourtHub tracking v2 failed', error);
      status.className = 'vi-tracker-status warning';
      status.textContent = 'Tracking fehlgeschlagen: ' + error.message;
      window.BT.util?.toast?.('Video-Tracking fehlgeschlagen: ' + error.message);
    } finally {
      running = false;
      updateState();
    }
  };

  view.querySelector('[data-action="create-play"]')?.addEventListener('click', () => {
    setTimeout(() => {
      const draft = window.BT.storage?.getSetting?.(DRAFT_KEY, null);
      if (!draft) return;
      const enhanced = addScreenCandidates(draft, window.BT.tactics.__core);
      if (!enhanced.added) return;
      window.BT.storage.setSetting(DRAFT_KEY, enhanced.board);
      window.BT.util?.toast?.(`${enhanced.added} mögliche Screens wurden automatisch ergänzt.`);
    }, 0);
  });

  updateState();
  return view;
}
