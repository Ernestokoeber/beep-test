window.BT = window.BT || {};
BT.trainingTimer = (() => {
  const prefix = 'courthub-training-timer-v1:';
  const memory = new Map();
  let active = null;
  const clock = () => ({ elapsed: 0, since: null });
  const finite = (n, fallback, min, max) => typeof n === 'number' && Number.isFinite(n)
    ? Math.min(max, Math.max(min, n)) : fallback;
  const elapsed = (c, now) => c.elapsed + (c.since === null ? 0 : Math.max(0, now - c.since));
  function normalize(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const normalizeClock = c => ({
      elapsed: finite(c?.elapsed, 0, 0, 31536000000),
      since: typeof c?.since === 'number' && Number.isFinite(c.since) && c.since >= 0 ? c.since : null
    });
    return {
      mode: ['stopwatch', 'countdown', 'interval', 'game'].includes(r.mode) ? r.mode : 'stopwatch',
      config: {
        duration: Math.round(finite(r.config?.duration, 600, 1, 7200)),
        work: Math.round(finite(r.config?.work, 60, 1, 3600)),
        rest: Math.round(finite(r.config?.rest, 30, 0, 3600)),
        rounds: Math.round(finite(r.config?.rounds, 5, 1, 99))
      },
      clock: normalizeClock(r.clock), shot: normalizeClock(r.shot),
      shotEnabled: r.mode === 'game' || r.shotEnabled === true,
      shotDuration: r.shotDuration === 14 ? 14 : 24,
      names: [0, 1].map(i => typeof r.names?.[i] === 'string' ? r.names[i].slice(0, 24) : `Team ${i + 1}`),
      scores: [0, 1].map(i => Math.round(finite(r.scores?.[i], 0, 0, 999))),
      history: Array.isArray(r.history) ? r.history.filter(h => Array.isArray(h) && h.length === 2 &&
        h.every(n => Number.isInteger(n) && n >= 0 && n <= 999)).slice(-50) : []
    };
  }
  function mainView(s, now) {
    const e = elapsed(s.clock, now);
    if (s.mode === 'stopwatch') return { ms: e, phase: 'Stoppuhr', key: 'stopwatch', done: false, total: Infinity };
    const c = s.config;
    const total = (s.mode === 'countdown' || s.mode === 'game' ? c.duration : c.work * c.rounds + c.rest * (c.rounds - 1)) * 1000;
    if (e >= total) return { ms: 0, phase: 'Beendet', key: 'done', done: true, total };
    if (s.mode === 'countdown' || s.mode === 'game') return { ms: total - e, phase: s.mode === 'game' ? 'Trainingsspiel' : 'Countdown', key: s.mode, done: false, total };
    const cycle = (c.work + c.rest) * 1000;
    const round = Math.floor(e / cycle);
    const offset = e % cycle;
    const rest = offset >= c.work * 1000;
    return { ms: (rest ? cycle : c.work * 1000) - offset,
      phase: `${rest ? 'Pause' : 'Belastung'} · Runde ${round + 1} von ${c.rounds}`,
      key: `${round}-${rest}`, done: false, total };
  }
  function format(ms, countdown) {
    const seconds = Math.max(0, (countdown ? Math.ceil : Math.floor)(ms / 1000));
    const h = Math.floor(seconds / 3600);
    return (h ? `${h}:` : '') + `${Math.floor(seconds / 60) % 60}`.padStart(2, '0') + ':' + `${seconds % 60}`.padStart(2, '0');
  }
  function save() {
    if (!active) return;
    const json = JSON.stringify(active.state);
    memory.set(active.key, json);
    try { localStorage.setItem(active.key, json); }
    catch (_) { active.root.querySelector('[data-tt="notice"]').textContent = 'Speichern auf diesem Gerät nicht möglich. Der Stand bleibt nur bis zum Neuladen erhalten.'; }
  }
  function signal() {
    if (document.visibilityState === 'hidden') return;
    try { BT.audio?.levelBeep(); } catch (_) { /* Visual feedback remains available. */ }
  }
  function tick(sound = false) {
    if (!active) return;
    const a = active, s = a.state, now = Date.now();
    const view = mainView(s, now);
    const game = s.mode === 'game';
    // Freeze the shotclock at the exact game end, even when this tick is late.
    const shotNow = game && view.done && s.clock.since !== null
      ? Math.min(now, s.clock.since + Math.max(0, view.total - s.clock.elapsed)) : now;
    let changed = false;
    let shotDone = s.shotEnabled && elapsed(s.shot, shotNow) >= s.shotDuration * 1000;
    const alarm = (s.clock.since !== null && a.phase !== view.key) || (s.shot.since !== null && shotDone);
    const shotRemaining = s.shotDuration * 1000 - elapsed(s.shot, shotNow);
    const announce = s.shotEnabled && s.shot.since !== null && !view.done &&
      a.shotRemaining > 10000 && shotRemaining <= 10000 && shotRemaining > 9000;
    if (game && shotDone && s.shot.since !== null) {
      // The first period may be a manual 14s reset; every subsequent period is 24s.
      s.shot = { elapsed: (elapsed(s.shot, shotNow) - s.shotDuration * 1000) % 24000, since: shotNow };
      s.shotDuration = 24;
      shotDone = false;
      changed = true;
    }
    if (game && view.done && s.shot.since !== null) {
      s.shot = { elapsed: elapsed(s.shot, shotNow), since: null }; changed = true;
    }
    if (view.done && s.clock.since !== null) {
      s.clock = { elapsed: view.total, since: null }; changed = true;
    }
    if (shotDone && s.shot.since !== null) {
      s.shot = { elapsed: s.shotDuration * 1000, since: null }; changed = true;
    }
    a.phase = view.key;
    a.shotRemaining = s.shotDuration * 1000 - elapsed(s.shot, now);
    const q = key => a.root.querySelector(`[data-tt="${key}"]`);
    const text = (key, value) => { const el = q(key); if (el.textContent !== String(value)) el.textContent = value; };
    text('time', format(view.ms, s.mode !== 'stopwatch'));
    text('phase', view.phase);
    text('toggle', s.clock.since === null ? (s.clock.elapsed ? 'Fortsetzen' : 'Start') : 'Pause');
    q('toggle').disabled = view.done;
    text('reset', 'Uhr zurücksetzen');
    q('mode').disabled = s.clock.since !== null;
    a.root.querySelectorAll('[data-config]').forEach(el => { el.disabled = s.clock.since !== null; });
    q('countdown-config').hidden = s.mode !== 'countdown' && !game;
    q('interval-config').hidden = s.mode !== 'interval';
    q('shot-panel').hidden = !s.shotEnabled;
    q('shot-enabled').checked = s.shotEnabled;
    q('shot-enabled').disabled = game;
    q('shot-toggle').hidden = game;
    text('mode-help', game
      ? 'Start und Pause steuern beide Uhren. Bei 10 Sekunden: Ansage. Bei 0: Piepton und automatisch neue 24 Sekunden. Ballbesitzwechsel bei Bedarf mit Reset markieren. Keine automatische Erkennung von Ballbesitz.'
      : 'Shotclock separat starten und pausieren. Bei 10 Sekunden: Ansage; bei 0: Piepton und Stopp.');
    text('shot-time', Math.ceil(Math.max(0, s.shotDuration * 1000 - elapsed(s.shot, now)) / 1000));
    text('shot-toggle', s.shot.since === null ? 'Shotclock starten' : 'Shotclock pausieren');
    q('shot-toggle').disabled = shotDone;
    s.scores.forEach((score, i) => { text(`points-${i}`, score); });
    q('undo').disabled = !s.history.length;
    if (changed) save();
    if (sound && alarm) signal();
    else if (sound && announce && document.visibilityState !== 'hidden') {
      try { BT.audio?.speak('Noch zehn Sekunden'); } catch (_) { /* Optional speech output. */ }
    }
  }
  function close() {
    if (!active) return;
    tick(); save();
    const a = active;
    active = null;
    clearInterval(a.interval);
    window.removeEventListener('hashchange', close);
    window.removeEventListener('pagehide', save);
    document.removeEventListener('visibilitychange', a.visibility);
    BT.wake?.release('training-timer');
    if (typeof a.root.close === 'function') a.root.close();
    a.root.remove();
    document.documentElement.classList.remove('training-timer-open');
    a.previousFocus?.focus();
  }
  function open(trainingId) {
    close();
    const key = prefix + String(trainingId);
    let raw;
    try { raw = JSON.parse(memory.get(key) || localStorage.getItem(key) || 'null'); }
    catch (_) { try { raw = JSON.parse(memory.get(key) || 'null'); } catch (_) { raw = null; } }
    const s = normalize(raw);
    const root = document.createElement('dialog');
    root.className = 'training-timer';
    root.setAttribute('aria-labelledby', 'training-timer-title');
    root.innerHTML = `
      <header class="tt-header"><h2 id="training-timer-title">Timer & Punkte</h2><button type="button" data-tt="close" autofocus>Zum Training</button></header>
      <div class="tt-body">
        <label class="tt-mode">Uhr auswählen<select data-tt="mode"><option value="stopwatch">Stoppuhr</option><option value="countdown">Countdown</option><option value="interval">Intervalle</option><option value="game">Trainingsspiel</option></select></label>
        <div data-tt="countdown-config" class="tt-config"><label>Dauer (Sekunden)<input data-tt="duration" data-config type="number" inputmode="numeric" min="1" max="7200"></label></div>
        <div data-tt="interval-config" class="tt-config"><label>Belastung (Sek.)<input data-tt="work" data-config type="number" inputmode="numeric" min="1" max="3600"></label><label>Pause (Sek.)<input data-tt="rest" data-config type="number" inputmode="numeric" min="0" max="3600"></label><label>Runden<input data-tt="rounds" data-config type="number" inputmode="numeric" min="1" max="99"></label></div>
        <section class="tt-clock" aria-label="Trainingsuhr"><p data-tt="phase" role="status"></p><output class="tt-time" data-tt="time" aria-label="Zeit" aria-live="off"></output><div class="tt-controls"><button type="button" data-tt="toggle" class="tt-primary">Start</button><button type="button" data-tt="reset">Uhr zurücksetzen</button></div></section>
        <section class="tt-scores" aria-label="Punktestand">${[0, 1].map(i => `<div class="tt-team"><label><span class="tt-label">Team ${i + 1}</span><input data-tt="name-${i}" aria-label="Name Team ${i + 1}" maxlength="24"></label><output data-tt="points-${i}" aria-label="Punkte Team ${i + 1}" aria-live="polite">0</output><div class="tt-score-buttons">${[1, 2, 3, -1].map(n => `<button type="button" data-tt="score-${i}-${n}" aria-label="Team ${i + 1}: ${n > 0 ? 'plus' : 'minus'} ${Math.abs(n)}">${n > 0 ? '+' : '−'}${Math.abs(n)}</button>`).join('')}</div></div>`).join('')}</section>
        <div class="tt-controls"><button type="button" data-tt="undo">Letzte Punkte zurück</button><button type="button" data-tt="clear-scores">Punkte auf null</button></div>
        <label class="tt-check"><input type="checkbox" data-tt="shot-enabled"> Shotclock verwenden</label>
        <section data-tt="shot-panel" class="tt-shot" aria-label="Shotclock"><output data-tt="shot-time" aria-label="Shotclock Sekunden" aria-live="off">24</output><div><div class="tt-controls"><button type="button" data-tt="shot-24">Reset 24 s</button><button type="button" data-tt="shot-14">Reset 14 s</button></div><button type="button" data-tt="shot-toggle">Shotclock starten</button></div></section>
        <p class="tt-help" data-tt="mode-help"></p>
        <p class="tt-help">Uhren laufen beim Zurückgehen weiter. Der Stand wird nur auf diesem Gerät gespeichert, nicht als Spielstatistik.</p>
        <p class="tt-help">Bei Bildschirmsperre läuft die Zeit weiter; ein Tonsignal ist dann nicht garantiert. Solange diese Ansicht offen ist, versuchen wir den Bildschirm wach zu halten.</p>
        <p data-tt="notice" role="status" class="tt-help"></p>
      </div>`;
    active = { key, state: s, root, phase: mainView(s, Date.now()).key, previousFocus: document.activeElement };
    const q = role => root.querySelector(`[data-tt="${role}"]`);
    q('mode').value = s.mode;
    Object.entries(s.config).forEach(([name, value]) => { q(name).value = value; });
    s.names.forEach((name, i) => { q(`name-${i}`).value = name; });
    q('shot-enabled').checked = s.shotEnabled;
    root.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.tt;
      if (!action) return;
      tick();
      const now = Date.now();
      if (action === 'close') { close(); return; }
      if (action === 'toggle' || action === 'shot-toggle') {
        if (s.mode === 'game' && action === 'shot-toggle') return;
        const c = action === 'toggle' ? s.clock : s.shot;
        if (c.since === null) {
          try { BT.audio?.ensureContext(); } catch (_) { /* Optional audio. */ }
          c.since = now;
        } else { c.elapsed = elapsed(c, now); c.since = null; }
        if (s.mode === 'game' && action === 'toggle') {
          s.shot = { elapsed: elapsed(s.shot, now), since: c.since };
        }
      } else if (action === 'reset') {
        if (elapsed(s.clock, now) > 0 && !window.confirm('Die Uhr zurücksetzen? Punkte bleiben erhalten.')) return;
        s.clock = clock();
        if (s.mode === 'game') { s.shot = clock(); s.shotDuration = 24; }
      } else if (action.startsWith('score-')) {
        const [, team, delta] = action.match(/^score-(\d)-(-?\d)$/) || [];
        if (team === undefined) return;
        const next = Math.max(0, Math.min(999, s.scores[team] + Number(delta)));
        if (next !== s.scores[team]) {
          s.history.push([...s.scores]); s.history = s.history.slice(-50); s.scores[team] = next;
        }
      } else if (action === 'undo') {
        if (s.history.length) s.scores = s.history.pop();
      } else if (action === 'clear-scores') {
        if (!window.confirm('Beide Punktestände auf null setzen?')) return;
        s.history.push([...s.scores]); s.history = s.history.slice(-50); s.scores = [0, 0];
      } else if (action === 'shot-24' || action === 'shot-14') {
        s.shotDuration = action === 'shot-24' ? 24 : 14;
        s.shot = { elapsed: 0, since: s.shot.since === null ? null : now };
      }
      tick(); save();
    });
    root.addEventListener('change', event => {
      const el = event.target, field = el.dataset.tt, checked = el.checked;
      tick();
      if (field === 'mode' || el.hasAttribute('data-config')) {
        if (el.hasAttribute('data-config') && (!el.checkValidity() || el.value === '')) {
          el.value = s.config[field]; return;
        }
        if (elapsed(s.clock, Date.now()) > 0 && !window.confirm('Diese Änderung setzt die Uhr zurück. Fortfahren?')) {
          el.value = field === 'mode' ? s.mode : s.config[field]; return;
        }
        const wasGame = s.mode === 'game';
        if (field === 'mode') s.mode = el.value;
        else s.config[field] = Number(el.value);
        s.clock = clock();
        if (wasGame || s.mode === 'game') { s.shot = clock(); s.shotDuration = 24; }
        if (s.mode === 'game') s.shotEnabled = true;
      } else if (field === 'shot-enabled') {
        s.shotEnabled = checked;
        if (!s.shotEnabled) { s.shot.elapsed = elapsed(s.shot, Date.now()); s.shot.since = null; }
      } else if (field?.startsWith('name-')) {
        s.names[Number(field.slice(-1))] = el.value.slice(0, 24);
      }
      tick(); save();
    });
    root.addEventListener('cancel', event => { event.preventDefault(); close(); });
    root.addEventListener('close', () => { if (active?.root === root) close(); });
    document.body.appendChild(root);
    document.documentElement.classList.add('training-timer-open');
    if (typeof root.showModal === 'function') root.showModal(); else root.setAttribute('open', '');
    tick(); save();
    active.visibility = () => { tick(); save(); };
    document.addEventListener('visibilitychange', active.visibility);
    window.addEventListener('hashchange', close);
    window.addEventListener('pagehide', save);
    active.interval = setInterval(() => tick(true), 100);
    BT.wake?.acquire('training-timer');
  }
  return { open, close };
})();
