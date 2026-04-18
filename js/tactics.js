window.BT = window.BT || {};

BT.tactics = (function() {
  const { $, $$, renderTemplate, escapeHTML, formatDate } = BT.util;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'tacticsBoardDraft';

  function defaultBoard() {
    return {
      players: [
        { id: 'p1', label: '1', x: 120, y: 380 },
        { id: 'p2', label: '2', x: 380, y: 380 },
        { id: 'p3', label: '3', x: 80, y: 260 },
        { id: 'p4', label: '4', x: 420, y: 260 },
        { id: 'p5', label: '5', x: 250, y: 230 }
      ],
      ball: { id: 'ball', x: 250, y: 380 },
      arrows: [],
      texts: []
    };
  }

  function loadDraft() {
    try {
      const raw = BT.storage.getSetting(STORAGE_KEY, null);
      if (!raw) return defaultBoard();
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return defaultBoard();
    }
  }

  function saveDraft(board) {
    BT.storage.setSetting(STORAGE_KEY, board);
  }

  function render(target) {
    const root = renderTemplate('tpl-tactics');
    target.appendChild(root);

    let board = loadDraft();
    let tool = 'move';
    let arrowStart = null;

    const svg = $('[data-role="tactics-svg"]', root);
    const tokensLayer = $('[data-role="tokens-layer"]', svg);
    const arrowsLayer = $('[data-role="arrows-layer"]', svg);
    const textsLayer = $('[data-role="texts-layer"]', svg);
    const hint = $('[data-role="tool-hint"]', root);

    const HINTS = {
      move: 'Tippe einen Spieler oder den Ball und ziehe ihn an die gewünschte Stelle.',
      run: 'Laufweg: Erst Startpunkt tippen, dann Endpunkt. Durchgezogene grüne Linie.',
      pass: 'Passweg: Erst Startpunkt tippen, dann Endpunkt. Gestrichelte orange Linie.',
      text: 'Tippe auf die Karte, um eine Textnotiz (Play-Name, Coaching-Point) zu setzen.',
      erase: 'Tippe Spieler, Ball, Pfeil oder Text zum Löschen.'
    };

    $$('.tactics-tool', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tactics-tool', root).forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        tool = btn.dataset.tool;
        arrowStart = null;
        hint.textContent = HINTS[tool] || '';
        renderArrowPreview();
      });
    });

    $('[data-action="reset-board"]', root).addEventListener('click', () => {
      const backup = JSON.parse(JSON.stringify(board));
      board = defaultBoard();
      saveDraft(board);
      renderAll();
      BT.util.toastUndo('Taktikboard zurückgesetzt', () => {
        board = backup;
        saveDraft(board);
        renderAll();
      });
    });

    $('[data-action="save-as-note"]', root).addEventListener('click', () => {
      const title = prompt('Titel der Taktik (wird als Notiz gespeichert):', 'Taktik ' + formatDate(BT.util.todayISO()));
      if (!title) return;
      const serialized = JSON.stringify(board, null, 2);
      const body = '[TACTIC] ' + title + '\n\n' + serialized;
      const note = BT.storage.upsertNote({ title: 'Taktik: ' + title, body });
      BT.util.toast('„' + title + '" als Notiz gespeichert', {
        actionLabel: 'Öffnen',
        action: () => { location.hash = '#/notes/' + note.id; }
      });
    });

    function svgPoint(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const x = (clientX - rect.left) / rect.width * vb.width;
      const y = (clientY - rect.top) / rect.height * vb.height;
      return { x: clamp(x, 10, 490), y: clamp(y, 10, 460) };
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function tokenUnderPoint(x, y, radius) {
      const r = radius || 22;
      for (const p of board.players) {
        if (Math.hypot(p.x - x, p.y - y) < r) return { type: 'player', obj: p };
      }
      if (Math.hypot(board.ball.x - x, board.ball.y - y) < 14) {
        return { type: 'ball', obj: board.ball };
      }
      return null;
    }

    function arrowUnderPoint(x, y) {
      for (const a of board.arrows) {
        if (pointNearSegment(x, y, a.x1, a.y1, a.x2, a.y2, 8)) return a;
      }
      return null;
    }

    function textUnderPoint(x, y) {
      for (const t of board.texts) {
        if (Math.abs(t.x - x) < 60 && Math.abs(t.y - y) < 14) return t;
      }
      return null;
    }

    function pointNearSegment(px, py, x1, y1, x2, y2, tol) {
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(px - x1, py - y1) < tol;
      const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
      const qx = x1 + t * dx, qy = y1 + t * dy;
      return Math.hypot(px - qx, py - qy) < tol;
    }

    // Drag handling
    let drag = null;

    svg.addEventListener('pointerdown', e => {
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
        } else {
          board.arrows.push({
            id: BT.util.uuid('a_'),
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
        board.texts.push({
          id: BT.util.uuid('t_'),
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
          board.players = board.players.filter(p => p !== hitTok.obj);
          saveDraft(board);
          renderAll();
          return;
        }
        if (hitTok && hitTok.type === 'ball') {
          // Ball nicht löschen, nur verstecken → Wiederherstellen via reset
          return;
        }
        const hitArr = arrowUnderPoint(pt.x, pt.y);
        if (hitArr) {
          board.arrows = board.arrows.filter(a => a !== hitArr);
          saveDraft(board);
          renderAll();
          return;
        }
        const hitTxt = textUnderPoint(pt.x, pt.y);
        if (hitTxt) {
          board.texts = board.texts.filter(t => t !== hitTxt);
          saveDraft(board);
          renderAll();
          return;
        }
      }
    });

    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const pt = svgPoint(e.clientX, e.clientY);
      drag.target.x = pt.x - drag.offsetX;
      drag.target.y = pt.y - drag.offsetY;
      renderTokens();
    });

    svg.addEventListener('pointerup', e => {
      if (drag) {
        drag = null;
        saveDraft(board);
        svg.releasePointerCapture(e.pointerId);
      }
    });
    svg.addEventListener('pointercancel', () => { drag = null; });

    function renderTokens() {
      tokensLayer.innerHTML = '';
      for (const p of board.players) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'tactics-player');
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', p.x);
        c.setAttribute('cy', p.y);
        c.setAttribute('r', 18);
        g.appendChild(c);
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', p.x);
        t.setAttribute('y', p.y + 5);
        t.setAttribute('text-anchor', 'middle');
        t.textContent = p.label;
        g.appendChild(t);
        tokensLayer.appendChild(g);
      }
      const bg = document.createElementNS(SVG_NS, 'g');
      bg.setAttribute('class', 'tactics-ball');
      const bc = document.createElementNS(SVG_NS, 'circle');
      bc.setAttribute('cx', board.ball.x);
      bc.setAttribute('cy', board.ball.y);
      bc.setAttribute('r', 9);
      bg.appendChild(bc);
      tokensLayer.appendChild(bg);
    }

    function renderArrows() {
      arrowsLayer.innerHTML = '';
      for (const a of board.arrows) {
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
      if ((tool === 'run' || tool === 'pass') && arrowStart) {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('data-role', 'preview');
        dot.setAttribute('cx', arrowStart.x);
        dot.setAttribute('cy', arrowStart.y);
        dot.setAttribute('r', 5);
        dot.setAttribute('fill', tool === 'pass' ? 'var(--primary)' : 'var(--cta)');
        arrowsLayer.appendChild(dot);
      }
    }

    function renderTexts() {
      textsLayer.innerHTML = '';
      for (const t of board.texts) {
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('x', t.x);
        el.setAttribute('y', t.y);
        el.setAttribute('text-anchor', 'middle');
        el.setAttribute('class', 'tactics-text');
        el.textContent = t.text;
        textsLayer.appendChild(el);
      }
    }

    function renderAll() {
      renderArrows();
      renderTexts();
      renderTokens();
    }

    // Load from a saved tactic note if requested from the notes detail view
    const loadFromNoteId = BT.storage.getSetting('tacticsLoadFromNote', null);
    if (loadFromNoteId) {
      BT.storage.setSetting('tacticsLoadFromNote', null);
      const note = BT.storage.getNote(loadFromNoteId);
      if (note && typeof note.body === 'string' && note.body.startsWith('[TACTIC]')) {
        const jsonStart = note.body.indexOf('{');
        if (jsonStart !== -1) {
          try {
            const parsed = JSON.parse(note.body.slice(jsonStart));
            if (parsed && Array.isArray(parsed.players) && parsed.ball) {
              board = parsed;
              saveDraft(board);
              const label = (note.title || '').replace(/^Taktik:\s*/, '') || 'Taktik';
              BT.util.toast('Taktik „' + label + '" geladen');
            }
          } catch (e) {
            BT.util.toast('Taktik konnte nicht geladen werden');
          }
        }
      }
    }

    renderAll();
  }

  return { render };
})();
