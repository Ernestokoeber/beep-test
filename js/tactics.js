window.BT = window.BT || {};

BT.tactics = (function() {
  const { $, $$, renderTemplate, escapeHTML, formatDate, toast, toastUndo, uuid } = BT.util;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'tacticsBoardDraft';
  const GIF_LIB_URL = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
  const GIF_WORKER_URL = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js';

  function newStepId() {
    return 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function defaultStep() {
    return {
      id: newStepId(),
      players: [
        { id: 'p1', label: '1', x: 120, y: 380 },
        { id: 'p2', label: '2', x: 380, y: 380 },
        { id: 'p3', label: '3', x: 80, y: 260 },
        { id: 'p4', label: '4', x: 420, y: 260 },
        { id: 'p5', label: '5', x: 250, y: 230 }
      ],
      ball: { x: 250, y: 380 },
      arrows: [],
      texts: [],
      duration: 1.5
    };
  }

  function defaultBoard() { return { steps: [defaultStep()], currentStep: 0 }; }

  function migrate(obj) {
    if (!obj) return defaultBoard();
    if (!obj.steps && obj.players && obj.ball) {
      return {
        steps: [{
          id: 'st_legacy',
          players: obj.players,
          ball: obj.ball,
          arrows: obj.arrows || [],
          texts: obj.texts || [],
          duration: 1.5
        }],
        currentStep: 0
      };
    }
    if (!obj.steps || !Array.isArray(obj.steps) || obj.steps.length === 0) return defaultBoard();
    obj.steps.forEach(s => {
      if (!s.id) s.id = newStepId();
      if (!Array.isArray(s.players)) s.players = [];
      if (!s.ball) s.ball = { x: 250, y: 380 };
      if (!Array.isArray(s.arrows)) s.arrows = [];
      if (!Array.isArray(s.texts)) s.texts = [];
      if (typeof s.duration !== 'number') s.duration = 1.5;
    });
    if (typeof obj.currentStep !== 'number' || obj.currentStep < 0 || obj.currentStep >= obj.steps.length) obj.currentStep = 0;
    return obj;
  }

  function loadDraft() {
    try {
      const raw = BT.storage.getSetting(STORAGE_KEY, null);
      if (!raw) return defaultBoard();
      return migrate(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch (e) {
      return defaultBoard();
    }
  }

  function saveDraft(board) { BT.storage.setSetting(STORAGE_KEY, board); }

  function cloneStep(s) {
    return {
      id: newStepId(),
      players: s.players.map(p => ({ id: p.id, label: p.label, x: p.x, y: p.y })),
      ball: { x: s.ball.x, y: s.ball.y },
      arrows: [],
      texts: [],
      duration: s.duration || 1.5
    };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function pointNearSegment(px, py, x1, y1, x2, y2, tol) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1) < tol;
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
    const qx = x1 + t * dx, qy = y1 + t * dy;
    return Math.hypot(px - qx, py - qy) < tol;
  }

  function render(target) {
    const root = renderTemplate('tpl-tactics');
    target.appendChild(root);

    let board = loadDraft();
    let tool = 'move';
    let arrowStart = null;
    let playback = { running: false, fromStep: 0, startTs: 0, rafId: null };
    let drag = null;

    const svg = $('[data-role="tactics-svg"]', root);
    const tokensLayer = $('[data-role="tokens-layer"]', svg);
    const arrowsLayer = $('[data-role="arrows-layer"]', svg);
    const textsLayer = $('[data-role="texts-layer"]', svg);
    const hint = $('[data-role="tool-hint"]', root);
    const stepsList = $('[data-role="steps-list"]', root);
    const stepDurationInput = $('[data-role="step-duration"]', root);
    const playbackStatus = $('[data-role="playback-status"]', root);
    const playToggleBtn = $('[data-action="play-toggle"]', root);

    const HINTS = {
      move: 'Tippe einen Spieler oder den Ball und ziehe ihn an die gewünschte Stelle.',
      run: 'Laufweg: Erst Startpunkt tippen, dann Endpunkt. Durchgezogene grüne Linie.',
      pass: 'Passweg: Erst Startpunkt tippen, dann Endpunkt. Gestrichelte orange Linie.',
      text: 'Tippe auf die Karte, um eine Textnotiz (Play-Name, Coaching-Point) zu setzen.',
      erase: 'Tippe Spieler, Ball, Pfeil oder Text zum Löschen.'
    };

    function cur() { return board.steps[board.currentStep]; }

    // ---------- Tool buttons ----------
    $$('.tactics-tool', root).forEach(btn => {
      btn.addEventListener('click', () => {
        stopPlayback();
        $$('.tactics-tool', root).forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        tool = btn.dataset.tool;
        arrowStart = null;
        hint.textContent = HINTS[tool] || '';
        renderAll();
      });
    });

    // ---------- Section-head actions ----------
    $('[data-action="reset-board"]', root).addEventListener('click', () => {
      stopPlayback();
      const backup = JSON.parse(JSON.stringify(board));
      board = defaultBoard();
      saveDraft(board);
      renderAll();
      renderSteps();
      if (toastUndo) toastUndo('Taktikboard zurückgesetzt', () => {
        board = backup;
        saveDraft(board);
        renderAll();
        renderSteps();
      });
    });

    $('[data-action="save-as-note"]', root).addEventListener('click', () => {
      const title = prompt('Titel der Taktik (wird als Notiz gespeichert):', 'Taktik ' + formatDate(BT.util.todayISO()));
      if (!title) return;
      const serialized = JSON.stringify(board, null, 2);
      const body = '[TACTIC] ' + title + '\n\n' + serialized;
      const note = BT.storage.upsertNote({ title: 'Taktik: ' + title, body });
      if (toast) toast('„' + title + '" als Notiz gespeichert', {
        actionLabel: 'Öffnen',
        action: () => { location.hash = '#/notes/' + note.id; }
      });
    });

    $('[data-action="ai-explain"]', root).addEventListener('click', () => {
      stopPlayback();
      openExplainModal();
    });

    $('[data-action="share-gif"]', root).addEventListener('click', () => {
      stopPlayback();
      openGifModal();
    });

    // ---------- Steps bar ----------
    $('[data-action="add-step"]', root).addEventListener('click', () => {
      stopPlayback();
      const clone = cloneStep(cur());
      board.steps.splice(board.currentStep + 1, 0, clone);
      board.currentStep += 1;
      saveDraft(board);
      renderSteps();
      renderAll();
    });

    $('[data-action="delete-step"]', root).addEventListener('click', () => {
      if (board.steps.length <= 1) {
        if (toast) toast('Mindestens ein Schritt muss bleiben.');
        return;
      }
      stopPlayback();
      board.steps.splice(board.currentStep, 1);
      if (board.currentStep >= board.steps.length) board.currentStep = board.steps.length - 1;
      saveDraft(board);
      renderSteps();
      renderAll();
    });

    stepDurationInput.addEventListener('change', () => {
      const v = parseFloat(stepDurationInput.value);
      if (isNaN(v) || v <= 0) { stepDurationInput.value = cur().duration; return; }
      cur().duration = Math.min(10, Math.max(0.3, v));
      saveDraft(board);
      updatePlaybackStatus();
    });

    // ---------- Playback ----------
    playToggleBtn.addEventListener('click', () => {
      if (playback.running) stopPlayback(); else startPlayback();
    });
    $('[data-action="play-prev"]', root).addEventListener('click', () => {
      stopPlayback();
      if (board.currentStep > 0) { board.currentStep -= 1; saveDraft(board); renderSteps(); renderAll(); }
    });
    $('[data-action="play-next"]', root).addEventListener('click', () => {
      stopPlayback();
      if (board.currentStep < board.steps.length - 1) { board.currentStep += 1; saveDraft(board); renderSteps(); renderAll(); }
    });

    function startPlayback() {
      if (board.steps.length < 2) {
        if (toast) toast('Mindestens 2 Schritte für Playback nötig.');
        return;
      }
      playback.running = true;
      playback.fromStep = board.currentStep < board.steps.length - 1 ? board.currentStep : 0;
      playback.startTs = performance.now();
      playToggleBtn.textContent = '⏸';
      loopPlayback();
    }

    function stopPlayback() {
      if (playback.rafId) cancelAnimationFrame(playback.rafId);
      playback.running = false;
      playback.rafId = null;
      playToggleBtn.textContent = '▶️';
      renderAll();
    }

    function loopPlayback() {
      if (!playback.running) return;
      const fromIdx = playback.fromStep;
      const toIdx = fromIdx + 1;
      if (toIdx >= board.steps.length) {
        board.currentStep = fromIdx;
        stopPlayback();
        renderSteps();
        return;
      }
      const elapsed = (performance.now() - playback.startTs) / 1000;
      const dur = Math.max(0.2, board.steps[fromIdx].duration || 1.5);
      let t = elapsed / dur;
      if (t >= 1) {
        playback.fromStep = toIdx;
        playback.startTs = performance.now();
        board.currentStep = toIdx;
        renderSteps();
        renderInterpolated(board.steps[toIdx], null, 0);
        playback.rafId = requestAnimationFrame(loopPlayback);
        return;
      }
      renderInterpolated(board.steps[fromIdx], board.steps[toIdx], t);
      playback.rafId = requestAnimationFrame(loopPlayback);
    }

    function updatePlaybackStatus() {
      playbackStatus.textContent = 'Schritt ' + (board.currentStep + 1) + ' / ' + board.steps.length;
      stepDurationInput.value = cur().duration;
    }

    // ---------- SVG point helper ----------
    function svgPoint(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const x = (clientX - rect.left) / rect.width * vb.width;
      const y = (clientY - rect.top) / rect.height * vb.height;
      return { x: clamp(x, 10, 490), y: clamp(y, 10, 460) };
    }

    function tokenUnderPoint(x, y, radius) {
      const r = radius || 22;
      const s = cur();
      for (const p of s.players) {
        if (Math.hypot(p.x - x, p.y - y) < r) return { type: 'player', obj: p };
      }
      if (Math.hypot(s.ball.x - x, s.ball.y - y) < 14) return { type: 'ball', obj: s.ball };
      return null;
    }

    function arrowUnderPoint(x, y) {
      for (const a of cur().arrows) {
        if (pointNearSegment(x, y, a.x1, a.y1, a.x2, a.y2, 8)) return a;
      }
      return null;
    }

    function textUnderPoint(x, y) {
      for (const t of cur().texts) {
        if (Math.abs(t.x - x) < 60 && Math.abs(t.y - y) < 14) return t;
      }
      return null;
    }

    // ---------- Pointer handling (editing current step) ----------
    svg.addEventListener('pointerdown', e => {
      if (playback.running) return;
      const pt = svgPoint(e.clientX, e.clientY);

      if (tool === 'move') {
        const hit = tokenUnderPoint(pt.x, pt.y);
        if (hit) {
          drag = { kind: hit.type, target: hit.obj, offsetX: pt.x - hit.obj.x, offsetY: pt.y - hit.obj.y };
          svg.setPointerCapture(e.pointerId);
        }
        return;
      }
      if (tool === 'run' || tool === 'pass') {
        if (!arrowStart) {
          arrowStart = pt;
          hint.textContent = 'Jetzt Endpunkt tippen.';
          renderArrowPreview();
        } else {
          cur().arrows.push({
            id: uuid ? uuid('a_') : 'a_' + Date.now(),
            style: tool,
            x1: arrowStart.x, y1: arrowStart.y,
            x2: pt.x, y2: pt.y
          });
          arrowStart = null;
          hint.textContent = HINTS[tool];
          saveDraft(board);
          renderAll();
        }
        return;
      }
      if (tool === 'text') {
        const value = prompt('Text (z.B. „Screen", „Cut"):', '');
        if (!value) return;
        cur().texts.push({
          id: uuid ? uuid('t_') : 't_' + Date.now(),
          x: pt.x, y: pt.y,
          text: value.slice(0, 40)
        });
        saveDraft(board);
        renderAll();
        return;
      }
      if (tool === 'erase') {
        const hitTok = tokenUnderPoint(pt.x, pt.y);
        if (hitTok && hitTok.type === 'player') {
          cur().players = cur().players.filter(p => p !== hitTok.obj);
          saveDraft(board); renderAll(); return;
        }
        if (hitTok && hitTok.type === 'ball') return;
        const hitArr = arrowUnderPoint(pt.x, pt.y);
        if (hitArr) { cur().arrows = cur().arrows.filter(a => a !== hitArr); saveDraft(board); renderAll(); return; }
        const hitTxt = textUnderPoint(pt.x, pt.y);
        if (hitTxt) { cur().texts = cur().texts.filter(t => t !== hitTxt); saveDraft(board); renderAll(); return; }
      }
    });

    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const pt = svgPoint(e.clientX, e.clientY);
      drag.target.x = pt.x - drag.offsetX;
      drag.target.y = pt.y - drag.offsetY;
      renderTokens(cur());
    });

    svg.addEventListener('pointerup', e => {
      if (drag) { drag = null; saveDraft(board); try { svg.releasePointerCapture(e.pointerId); } catch (_) {} }
    });
    svg.addEventListener('pointercancel', () => { drag = null; });

    // ---------- Renderers ----------
    function renderTokens(snapshot) {
      tokensLayer.innerHTML = '';
      for (const p of snapshot.players) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'tactics-player');
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 18);
        g.appendChild(c);
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', p.x); t.setAttribute('y', p.y + 5); t.setAttribute('text-anchor', 'middle');
        t.textContent = p.label;
        g.appendChild(t);
        tokensLayer.appendChild(g);
      }
      const bg = document.createElementNS(SVG_NS, 'g');
      bg.setAttribute('class', 'tactics-ball');
      const bc = document.createElementNS(SVG_NS, 'circle');
      bc.setAttribute('cx', snapshot.ball.x); bc.setAttribute('cy', snapshot.ball.y); bc.setAttribute('r', 9);
      bg.appendChild(bc);
      tokensLayer.appendChild(bg);
    }

    function renderArrows(snapshot) {
      arrowsLayer.innerHTML = '';
      for (const a of snapshot.arrows) {
        const l = document.createElementNS(SVG_NS, 'line');
        l.setAttribute('x1', a.x1); l.setAttribute('y1', a.y1);
        l.setAttribute('x2', a.x2); l.setAttribute('y2', a.y2);
        l.setAttribute('class', 'tactics-arrow ' + (a.style === 'pass' ? 'pass' : 'run'));
        l.setAttribute('marker-end', 'url(#arrow-' + (a.style === 'pass' ? 'pass' : 'run') + ')');
        arrowsLayer.appendChild(l);
      }
      renderArrowPreview();
    }

    function renderArrowPreview() {
      const existing = arrowsLayer.querySelector('[data-role="preview"]');
      if (existing) existing.remove();
      if (!playback.running && (tool === 'run' || tool === 'pass') && arrowStart) {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('data-role', 'preview');
        dot.setAttribute('cx', arrowStart.x); dot.setAttribute('cy', arrowStart.y);
        dot.setAttribute('r', 5);
        dot.setAttribute('fill', tool === 'pass' ? 'var(--primary)' : 'var(--cta)');
        arrowsLayer.appendChild(dot);
      }
    }

    function renderTexts(snapshot) {
      textsLayer.innerHTML = '';
      for (const t of snapshot.texts) {
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('x', t.x); el.setAttribute('y', t.y); el.setAttribute('text-anchor', 'middle');
        el.setAttribute('class', 'tactics-text');
        el.textContent = t.text;
        textsLayer.appendChild(el);
      }
    }

    function renderInterpolated(fromStep, toStep, t) {
      const interp = interpolateSnapshot(fromStep, toStep, t);
      renderArrows(fromStep);
      renderTexts(fromStep);
      renderTokens(interp);
    }

    function renderAll() {
      const s = cur();
      renderArrows(s);
      renderTexts(s);
      renderTokens(s);
      updatePlaybackStatus();
    }

    function renderSteps() {
      stepsList.innerHTML = '';
      board.steps.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'step-btn' + (i === board.currentStep ? ' active' : '');
        btn.textContent = String(i + 1);
        btn.setAttribute('aria-pressed', i === board.currentStep ? 'true' : 'false');
        btn.addEventListener('click', () => {
          stopPlayback();
          board.currentStep = i;
          saveDraft(board);
          renderSteps();
          renderAll();
        });
        stepsList.appendChild(btn);
      });
    }

    // ---------- KI-Erklärung ----------
    function openExplainModal() {
      const backdrop = renderTemplate('tpl-tactics-ai-modal');
      document.body.appendChild(backdrop);
      const statusEl = $('[data-role="status"]', backdrop);
      const textEl = $('[data-role="text"]', backdrop);
      const saveBtn = $('[data-action="save-note"]', backdrop);
      let resultText = null;

      function close() { backdrop.remove(); }
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) close();
        if (e.target.closest('[data-action="close"]')) close();
        if (e.target.closest('[data-action="save-note"]') && resultText) {
          BT.storage.upsertNote({ title: 'Taktik-Erklärung (' + formatDate(BT.util.todayISO()) + ')', body: resultText });
          if (toast) toast('Als Notiz gespeichert.');
          close();
        }
      });

      const apiKey = BT.storage.getSetting('geminiApiKey', '');
      if (!apiKey) {
        statusEl.textContent = 'Kein Gemini API Key hinterlegt. Trage ihn im „Plan"-Reiter ein und versuche es erneut.';
        return;
      }

      BT.aiimport.explainTactic(board, apiKey, (msg) => {
        statusEl.textContent = msg;
      }).then(text => {
        resultText = text;
        statusEl.hidden = true;
        textEl.hidden = false;
        textEl.textContent = text;
        saveBtn.disabled = false;
      }).catch(err => {
        statusEl.textContent = 'Fehler: ' + (err && err.message ? err.message : err);
      });
    }

    // ---------- GIF-Export ----------
    function openGifModal() {
      const backdrop = renderTemplate('tpl-tactics-gif-modal');
      document.body.appendChild(backdrop);
      const statusEl = $('[data-role="status"]', backdrop);
      const renderBtn = $('[data-action="render-gif"]', backdrop);

      function close() { backdrop.remove(); }
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) close();
        if (e.target.closest('[data-action="close"]')) close();
      });

      renderBtn.addEventListener('click', async () => {
        const speed = backdrop.querySelector('input[name="gifspeed"]:checked').value;
        const override = speed === 'kept' ? null : parseFloat(speed);

        renderBtn.disabled = true;
        statusEl.hidden = false;
        statusEl.textContent = 'gif.js wird geladen …';

        try {
          await loadGifLib();
          statusEl.textContent = 'Frames werden erzeugt …';
          const blob = await renderGif(board, override, (pct) => {
            statusEl.textContent = 'GIF wird kodiert … ' + Math.round(pct * 100) + '%';
          });
          statusEl.textContent = 'Fertig! Teilen wird geöffnet …';
          const file = new File([blob], 'taktik.gif', { type: 'image/gif' });
          const canShareFile = navigator.canShare && navigator.canShare({ files: [file] });
          if (canShareFile && navigator.share) {
            try {
              await navigator.share({ files: [file], title: 'Taktik' });
              close();
              return;
            } catch (_) { /* fall through to download */ }
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'taktik.gif';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
          statusEl.textContent = 'GIF gespeichert (Teilen nicht verfügbar).';
          renderBtn.disabled = false;
        } catch (err) {
          statusEl.textContent = 'Fehler: ' + (err && err.message ? err.message : err);
          renderBtn.disabled = false;
        }
      });
    }

    // ---------- Load from saved tactic note ----------
    const loadFromNoteId = BT.storage.getSetting('tacticsLoadFromNote', null);
    if (loadFromNoteId) {
      BT.storage.setSetting('tacticsLoadFromNote', null);
      const note = BT.storage.getNote(loadFromNoteId);
      if (note && typeof note.body === 'string' && note.body.startsWith('[TACTIC]')) {
        const jsonStart = note.body.indexOf('{');
        if (jsonStart !== -1) {
          try {
            const parsed = JSON.parse(note.body.slice(jsonStart));
            const migrated = migrate(parsed);
            if (migrated && Array.isArray(migrated.steps) && migrated.steps.length > 0) {
              board = migrated;
              saveDraft(board);
              const label = (note.title || '').replace(/^Taktik:\s*/, '') || 'Taktik';
              if (toast) toast('Taktik „' + label + '" geladen');
            }
          } catch (e) {
            if (toast) toast('Taktik konnte nicht geladen werden');
          }
        }
      }
    }

    renderSteps();
    renderAll();
  }

  // ---------- Interpolation ----------
  function interpolateSnapshot(fromStep, toStep, t) {
    if (!toStep) return fromStep;
    const ease = t;
    const toById = new Map();
    for (const p of toStep.players) toById.set(p.id, p);
    const players = fromStep.players.map(fp => {
      const tp = toById.get(fp.id);
      if (!tp) return { id: fp.id, label: fp.label, x: fp.x, y: fp.y };
      return {
        id: fp.id, label: fp.label,
        x: fp.x + (tp.x - fp.x) * ease,
        y: fp.y + (tp.y - fp.y) * ease
      };
    });
    const fb = fromStep.ball, tb = toStep.ball;
    const ball = { x: fb.x + (tb.x - fb.x) * ease, y: fb.y + (tb.y - fb.y) * ease };
    return { players, ball, arrows: fromStep.arrows, texts: fromStep.texts };
  }

  // ---------- Gif library loader ----------
  let gifLibLoading = null;
  function loadGifLib() {
    if (window.GIF) return Promise.resolve();
    if (gifLibLoading) return gifLibLoading;
    gifLibLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIF_LIB_URL;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('gif.js konnte nicht geladen werden.'));
      document.head.appendChild(s);
    });
    return gifLibLoading;
  }

  // ---------- Canvas drawing for GIF frames ----------
  function drawCourt(ctx) {
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, 500, 470);
    ctx.strokeStyle = '#7a4a1a';
    ctx.lineWidth = 2;
    // Floor outline
    ctx.strokeRect(10, 10, 480, 450);
    // Lane
    ctx.fillStyle = 'rgba(232, 161, 77, 0.3)';
    ctx.fillRect(160, 10, 180, 190);
    ctx.strokeRect(160, 10, 180, 190);
    // Free-throw circle (top of key)
    ctx.beginPath();
    ctx.arc(250, 200, 60, 0, Math.PI * 2);
    ctx.stroke();
    // Free-throw line
    ctx.beginPath();
    ctx.moveTo(160, 200); ctx.lineTo(340, 200); ctx.stroke();
    // Restricted area arc under basket
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(250, 50, 40, Math.PI, 0, true);
    ctx.stroke();
    // Backboard
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(220, 40); ctx.lineTo(280, 40); ctx.stroke();
    // Rim
    ctx.strokeStyle = '#cc3300';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(250, 50, 8, 0, Math.PI * 2);
    ctx.stroke();
    // 3-point corners + arc
    ctx.strokeStyle = '#7a4a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 10); ctx.lineTo(50, 135); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(450, 10); ctx.lineTo(450, 135); ctx.stroke();
    // 3pt arc: matches SVG path `M 50 135 A 200 200 0 0 0 450 135` — semicircle bulging up toward rim
    ctx.beginPath();
    ctx.arc(250, 135, 200, Math.PI, 0, true);
    ctx.stroke();
  }

  function drawArrow(ctx, a) {
    const isPass = a.style === 'pass';
    ctx.strokeStyle = isPass ? 'rgb(232, 161, 77)' : '#004b2b';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 3;
    if (isPass) ctx.setLineDash([8, 6]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2, a.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Arrowhead
    const ang = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
    const size = 10;
    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(a.x2 - size * Math.cos(ang - 0.5), a.y2 - size * Math.sin(ang - 0.5));
    ctx.lineTo(a.x2 - size * Math.cos(ang + 0.5), a.y2 - size * Math.sin(ang + 0.5));
    ctx.closePath();
    ctx.fill();
  }

  function drawText(ctx, t) {
    ctx.fillStyle = '#004b2b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // Halo for readability
    ctx.strokeStyle = 'rgba(245, 230, 200, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
  }

  function drawPlayer(ctx, p) {
    ctx.fillStyle = 'rgb(232, 161, 77)';
    ctx.strokeStyle = '#004b2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#004b2b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, p.x, p.y);
  }

  function drawBall(ctx, b) {
    ctx.fillStyle = '#cc3300';
    ctx.strokeStyle = '#7a2200';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawSnapshot(ctx, snapshot) {
    drawCourt(ctx);
    for (const a of snapshot.arrows) drawArrow(ctx, a);
    for (const t of snapshot.texts) drawText(ctx, t);
    for (const p of snapshot.players) drawPlayer(ctx, p);
    drawBall(ctx, snapshot.ball);
  }

  // ---------- GIF rendering ----------
  async function renderGif(board, overrideDurationSec, onProgress) {
    const W = 400, H = 376;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const scale = W / 500;
    const fps = 10;

    const gif = new window.GIF({
      workers: 2,
      quality: 12,
      width: W,
      height: H,
      workerScript: GIF_WORKER_URL,
      background: '#f5e6c8'
    });

    function renderFrameToCanvas(snapshot) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.scale(scale, scale);
      drawSnapshot(ctx, snapshot);
      ctx.restore();
    }

    for (let i = 0; i < board.steps.length; i++) {
      const from = board.steps[i];
      const to = board.steps[i + 1] || null;
      const dur = (overrideDurationSec != null ? overrideDurationSec : (from.duration || 1.5));
      if (to) {
        const frames = Math.max(2, Math.ceil(dur * fps));
        const delay = Math.max(20, Math.round((dur * 1000) / frames));
        for (let f = 0; f < frames; f++) {
          const t = f / frames;
          const snap = interpolateSnapshot(from, to, t);
          renderFrameToCanvas(snap);
          gif.addFrame(ctx, { delay, copy: true });
        }
      } else {
        // Last step: hold final frame longer
        renderFrameToCanvas(from);
        gif.addFrame(ctx, { delay: Math.round(dur * 1000), copy: true });
      }
    }

    return new Promise((resolve, reject) => {
      gif.on('progress', (p) => { if (onProgress) onProgress(p); });
      gif.on('finished', (blob) => resolve(blob));
      gif.on('abort', () => reject(new Error('GIF-Erzeugung abgebrochen.')));
      try { gif.render(); } catch (e) { reject(e); }
    });
  }

  return { render };
})();
