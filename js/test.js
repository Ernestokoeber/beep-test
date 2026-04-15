window.BT = window.BT || {};

BT.test = (function() {
  const { $, $$, renderTemplate, todayISO, escapeHTML } = BT.util;

  let setupRoot, runRoot;
  let selectedIds = new Set();
  let wakeLock = null;

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { console.warn('Wake Lock nicht verfügbar:', e.message); }
  }

  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && runState && runState.running && !wakeLock) {
      requestWakeLock();
    }
  });

  // === SETUP VIEW ===
  function renderSetup(target) {
    setupRoot = renderTemplate('tpl-setup');
    target.appendChild(setupRoot);

    const form = $('[data-role="setup-form"]', setupRoot);
    form.elements.date.value = todayISO();
    form.elements.distance.value = BT.storage.getSetting('lastDistance', BT.levels.DEFAULT_DISTANCE_M);
    form.addEventListener('submit', onStart);

    const hintEl = $('[data-role="type-hint"]', setupRoot);
    const distanceInput = form.elements.distance;
    function updateTypeUI() {
      const type = form.elements.testType.value;
      if (type === 'yoyoIR1') {
        distanceInput.value = 20;
        distanceInput.disabled = true;
        if (hintEl) hintEl.textContent = 'Yo-Yo IR1: fixe 20 m Strecke. Start bei 10 km/h, 10 s Gehpause nach je 40 m (hin & zurück).';
      } else {
        distanceInput.disabled = false;
        distanceInput.value = BT.storage.getSetting('lastDistance', BT.levels.DEFAULT_DISTANCE_M);
        if (hintEl) hintEl.textContent = 'Standard: 20 m. Bei anderer Länge werden die Beep-Intervalle automatisch angepasst.';
      }
    }
    Array.from(form.elements.testType || []).forEach(r => r.addEventListener('change', updateTypeUI));
    updateTypeUI();

    $('[data-action="select-all"]', setupRoot).addEventListener('click', () => {
      BT.storage.getPlayers().filter(p => !p.archived).forEach(p => selectedIds.add(p.id));
      renderSelectList();
    });
    $('[data-action="select-none"]', setupRoot).addEventListener('click', () => {
      selectedIds.clear();
      renderSelectList();
    });

    selectedIds = new Set();
    renderSelectList();
  }

  function renderSelectList() {
    const list = $('[data-role="select-list"]', setupRoot);
    const noPlayers = $('[data-role="no-players"]', setupRoot);
    const startBtn = $('[data-role="start-btn"]', setupRoot);
    const players = BT.storage.getPlayers()
      .filter(p => !p.archived)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    list.innerHTML = '';
    if (players.length === 0) {
      noPlayers.classList.remove('hidden');
      startBtn.disabled = true;
      return;
    }
    noPlayers.classList.add('hidden');

    for (const p of players) {
      const li = document.createElement('li');
      const checked = selectedIds.has(p.id);
      if (checked) li.classList.add('selected');
      li.innerHTML = `
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <span>${escapeHTML(p.name)}${p.position ? ' <span class="muted">(' + escapeHTML(p.position) + ')</span>' : ''}</span>
      `;
      const cb = li.querySelector('input');
      const toggle = (e) => {
        if (e.target !== cb) cb.checked = !cb.checked;
        if (cb.checked) selectedIds.add(p.id); else selectedIds.delete(p.id);
        li.classList.toggle('selected', cb.checked);
        updateStartBtn();
      };
      li.addEventListener('click', toggle);
      list.appendChild(li);
    }
    updateStartBtn();
  }

  function updateStartBtn() {
    const startBtn = $('[data-role="start-btn"]', setupRoot);
    startBtn.disabled = selectedIds.size === 0;
    startBtn.textContent = selectedIds.size === 0
      ? 'Test starten'
      : `Test starten (${selectedIds.size} Teilnehmer)`;
  }

  function onStart(e) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const f = e.target;
    const testType = (f.elements.testType && f.elements.testType.value) === 'yoyoIR1' ? 'yoyoIR1' : 'leger';
    const distanceM = testType === 'yoyoIR1' ? 20 : (parseFloat(f.elements.distance.value) || BT.levels.DEFAULT_DISTANCE_M);
    if (testType === 'leger') BT.storage.setSetting('lastDistance', distanceM);
    const session = BT.storage.createSession({
      date: f.elements.date.value,
      note: f.elements.note.value.trim() || null,
      testType,
      distanceM,
      participants: Array.from(selectedIds),
      results: []
    });
    location.hash = '#/test/run/' + session.id;
  }

  // === RUN VIEW ===
  let runState = null;

  function renderRun(target, sessionId) {
    runRoot = renderTemplate('tpl-run');
    target.appendChild(runRoot);

    const session = BT.storage.getSession(sessionId);
    if (!session) { location.hash = '#/history'; return; }

    runState = {
      sessionId,
      session,
      running: false,
      paused: false,
      startTime: 0,
      pauseOffset: 0,
      pausedAt: 0,
      currentLevel: 1,
      currentShuttle: 0,
      nextShuttleTime: 0,
      totalShuttlesDone: 0,
      active: new Map(),
      out: [],
      rafId: null
    };

    const players = BT.storage.getPlayers();
    for (const pid of session.participants) {
      const p = players.find(x => x.id === pid);
      if (p) runState.active.set(pid, p);
    }

    if (session.results && session.results.length > 0) {
      for (const r of session.results) {
        runState.active.delete(r.playerId);
        runState.out.push(r);
      }
    }

    $('[data-action="start"]', runRoot).addEventListener('click', start);
    $('[data-action="pause"]', runRoot).addEventListener('click', togglePause);
    $('[data-action="stop"]', runRoot).addEventListener('click', stop);
    $('[data-action="back"]', runRoot).addEventListener('click', () => {
      if (runState && runState.running) {
        if (!confirm('Der Test läuft noch. Wirklich verlassen? Aktive Läufer werden als "Test beendet" gespeichert.')) return;
        finishTest();
      } else {
        location.hash = '#/history';
      }
    });

    const distanceEl = $('[data-role="distance"]', runRoot);
    if (distanceEl) distanceEl.textContent = (runState.session.distanceM || BT.levels.DEFAULT_DISTANCE_M);

    const typeLabel = $('[data-role="test-type-label"]', runRoot);
    if (typeLabel) typeLabel.textContent = runState.session.testType === 'yoyoIR1' ? 'Yo-Yo IR1' : 'Beep-Test';

    const voiceToggle = $('[data-role="voice"]', runRoot);
    voiceToggle.checked = BT.storage.getSetting('voiceEnabled', true);
    voiceToggle.addEventListener('change', () => {
      BT.storage.setSetting('voiceEnabled', voiceToggle.checked);
    });

    updateDisplay();
    renderRunners();
  }

  function start() {
    if (runState.running) return;
    BT.audio.ensureContext();
    requestWakeLock();

    runState.running = true;
    runState.paused = false;
    const level = BT.levels.get(runState.currentLevel, runState.session.testType);
    const now = performance.now() / 1000;
    runState.startTime = now + 3;
    runState.nextShuttleTime = runState.startTime + BT.levels.shuttleDuration(level, runState.session.distanceM, runState.session.testType, 0);
    runState.currentShuttle = 0;
    runState.pauseOffset = 0;
    runState.restEndAt = 0;

    $('[data-action="start"]', runRoot).disabled = true;
    $('[data-action="pause"]', runRoot).disabled = false;
    $('[data-action="stop"]', runRoot).disabled = false;

    const voice = BT.storage.getSetting('voiceEnabled', true);
    showStartCountdown('3');
    BT.audio.tick();
    if (voice) BT.audio.speak('Drei');
    scheduleRestTimeout(() => { showStartCountdown('2'); BT.audio.tick(); if (voice) BT.audio.speak('Zwei'); }, 1000);
    scheduleRestTimeout(() => { showStartCountdown('1'); BT.audio.tick(); if (voice) BT.audio.speak('Eins'); }, 2000);
    scheduleRestTimeout(() => { showStartCountdown('LOS!', true); BT.audio.restEndBeep(); if (voice) BT.audio.speak('Los'); }, 3000);

    tick();
  }

  function togglePause() {
    const btn = $('[data-action="pause"]', runRoot);
    if (runState.paused) {
      const now = performance.now() / 1000;
      const delta = now - runState.pausedAt;
      runState.nextShuttleTime += delta;
      runState.startTime += delta;
      if (runState.restEndAt) runState.restEndAt += delta;
      runState.paused = false;
      btn.textContent = 'Pause';
      tick();
    } else {
      runState.paused = true;
      runState.pausedAt = performance.now() / 1000;
      btn.textContent = 'Weiter';
      if (runState.rafId) cancelAnimationFrame(runState.rafId);
      clearRestTimeouts();
    }
  }

  function stop() {
    if (!confirm('Test wirklich beenden?')) return;
    finishTest();
  }

  function finishTest() {
    runState.running = false;
    releaseWakeLock();
    clearRestTimeouts();
    if (runState.rafId) cancelAnimationFrame(runState.rafId);

    for (const [pid] of runState.active) {
      recordResult(pid, 'dnf');
    }
    runState.active.clear();

    const session = BT.storage.getSession(runState.sessionId);
    if (session) {
      session.endedAt = new Date().toISOString();
      BT.storage.updateSession(session);
    }

    $('[data-action="start"]', runRoot).disabled = true;
    $('[data-action="pause"]', runRoot).disabled = true;
    $('[data-action="stop"]', runRoot).disabled = true;

    renderRunners();
    setTimeout(() => { location.hash = '#/history/' + runState.sessionId; }, 600);
  }

  function tick() {
    if (!runState.running || runState.paused) return;
    const now = performance.now() / 1000;

    while (now >= runState.nextShuttleTime && runState.running) {
      onShuttleEnd();
      if (!runState.running) break;
    }

    updateCountdown(now);
    runState.rafId = requestAnimationFrame(tick);
  }

  function onShuttleEnd() {
    const testType = runState.session.testType;
    const level = BT.levels.get(runState.currentLevel, testType);
    runState.currentShuttle += 1;
    runState.totalShuttlesDone += 1;

    const isYoyo = testType === 'yoyoIR1';
    const restBreak = isYoyo && runState.totalShuttlesDone % BT.levels.YOYO_ROUND_SIZE === 0;

    const voice = BT.storage.getSetting('voiceEnabled', true);
    let levelAnnounce = null;

    if (runState.currentShuttle >= level.shuttles) {
      const nextLevelNum = runState.currentLevel + 1;
      const nextLevel = BT.levels.get(nextLevelNum, testType);
      if (!nextLevel) {
        BT.audio.levelBeep();
        finishTest();
        return;
      }
      runState.currentLevel = nextLevelNum;
      runState.currentShuttle = 0;
      runState.nextShuttleTime += BT.levels.shuttleDuration(nextLevel, runState.session.distanceM, testType, runState.totalShuttlesDone);
      levelAnnounce = nextLevelNum;
      if (restBreak) BT.audio.restStartBeep();
      else BT.audio.levelBeep();
    } else {
      runState.nextShuttleTime += BT.levels.shuttleDuration(level, runState.session.distanceM, testType, runState.totalShuttlesDone);
      if (restBreak) BT.audio.restStartBeep();
      else BT.audio.shuttleBeep();
    }

    if (restBreak) {
      const restSec = BT.levels.YOYO_REST_SEC;
      runState.restEndAt = performance.now() / 1000 + restSec;
      if (voice) {
        scheduleRestTimeout(() => BT.audio.speak('Pause'), 250);
      }
      for (let i = 3; i >= 1; i--) {
        scheduleRestTimeout(() => BT.audio.tick(), (restSec - i) * 1000);
      }
      scheduleRestTimeout(() => BT.audio.restEndBeep(), restSec * 1000);
      if (voice) {
        scheduleRestTimeout(() => BT.audio.speak('Los'), restSec * 1000 + 200);
      }
      if (levelAnnounce != null && voice) {
        scheduleRestTimeout(() => BT.audio.announceLevel(levelAnnounce), 1200);
      }
    } else if (levelAnnounce != null && voice) {
      setTimeout(() => BT.audio.announceLevel(levelAnnounce), 500);
    }

    updateDisplay();
  }

  function scheduleRestTimeout(fn, ms) {
    if (!runState.restTimeoutIds) runState.restTimeoutIds = [];
    const id = setTimeout(() => {
      if (runState && runState.running && !runState.paused) fn();
    }, ms);
    runState.restTimeoutIds.push(id);
  }

  function clearRestTimeouts() {
    if (!runState || !runState.restTimeoutIds) return;
    runState.restTimeoutIds.forEach(id => clearTimeout(id));
    runState.restTimeoutIds = [];
  }

  function showStartCountdown(text, fadeOut) {
    if (!runRoot) return;
    let el = $('[data-role="start-countdown"]', runRoot);
    if (!el) {
      el = document.createElement('div');
      el.className = 'start-countdown';
      el.setAttribute('data-role', 'start-countdown');
      runRoot.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle('final', !!fadeOut);
    if (fadeOut) {
      setTimeout(() => { if (el && el.parentNode) el.remove(); }, 800);
    }
  }

  function updateDisplay() {
    const testType = runState.session.testType;
    const level = BT.levels.get(runState.currentLevel, testType);
    $('[data-role="level"]', runRoot).textContent = runState.currentLevel;
    $('[data-role="shuttle"]', runRoot).textContent = runState.currentShuttle;
    $('[data-role="shuttle-max"]', runRoot).textContent = level.shuttles;
    $('[data-role="speed"]', runRoot).textContent = level.speedKmh.toFixed(1);
  }

  function updateCountdown(now) {
    const testType = runState.session.testType;
    const level = BT.levels.get(runState.currentLevel, testType);
    const duration = BT.levels.shuttleDuration(level, runState.session.distanceM, testType, runState.totalShuttlesDone);
    const remaining = Math.max(0, runState.nextShuttleTime - now);
    const progress = Math.max(0, Math.min(100, (1 - remaining / duration) * 100));
    $('[data-role="progress-bar"]', runRoot).style.width = progress + '%';
    $('[data-role="countdown"]', runRoot).textContent = remaining.toFixed(1);

    const restIndicator = $('[data-role="rest-indicator"]', runRoot);
    if (restIndicator) {
      if (runState.restEndAt && now < runState.restEndAt) {
        restIndicator.classList.add('active');
        const restRemaining = Math.max(0, runState.restEndAt - now);
        const rc = $('[data-role="rest-countdown"]', runRoot);
        if (rc) rc.textContent = restRemaining.toFixed(1);
      } else {
        restIndicator.classList.remove('active');
      }
    }
  }

  function recordResult(playerId, reason) {
    const level = runState.currentLevel;
    const shuttle = runState.currentShuttle;
    const totalShuttles = BT.levels.totalShuttlesBefore(level, runState.session.testType) + shuttle;
    const result = {
      playerId,
      level,
      shuttle,
      totalShuttles,
      reason: reason || 'out',
      droppedAtSec: runState.running
        ? Math.round((performance.now() / 1000 - runState.startTime) * 10) / 10
        : null
    };
    runState.out.push(result);

    const session = BT.storage.getSession(runState.sessionId);
    if (session) {
      session.results.push(result);
      BT.storage.updateSession(session);
    }
  }

  function markOut(playerId) {
    if (!runState.active.has(playerId)) return;
    recordResult(playerId, 'out');
    runState.active.delete(playerId);
    renderRunners();
    if (runState.active.size === 0 && runState.running) {
      finishTest();
    }
  }

  function renderRunners() {
    const activeList = $('[data-role="active-runners"]', runRoot);
    const outList = $('[data-role="out-runners"]', runRoot);
    $('[data-role="active-count"]', runRoot).textContent = runState.active.size;
    $('[data-role="out-count"]', runRoot).textContent = runState.out.length;

    activeList.innerHTML = '';
    const activeSorted = Array.from(runState.active.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    for (const p of activeSorted) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="name">${escapeHTML(p.name)}</span>
        <button class="out-btn" data-pid="${p.id}">Raus</button>
      `;
      li.querySelector('.out-btn').addEventListener('click', () => markOut(p.id));
      activeList.appendChild(li);
    }

    outList.innerHTML = '';
    const allPlayers = BT.storage.getPlayers();
    const outSorted = runState.out.slice()
      .sort((a, b) => b.totalShuttles - a.totalShuttles);
    const distanceM = runState.session.distanceM || BT.levels.DEFAULT_DISTANCE_M;
    for (const r of outSorted) {
      const p = allPlayers.find(x => x.id === r.playerId);
      const li = document.createElement('li');
      const reasonLabel = r.reason === 'dnf' ? ' (Test beendet)' : '';
      const meters = r.totalShuttles * distanceM;
      li.innerHTML = `
        <span class="name">${escapeHTML(p ? p.name : '?')}</span>
        <span class="result">Level ${r.level} · Shuttle ${r.shuttle} · ${meters} m${reasonLabel}</span>
      `;
      outList.appendChild(li);
    }
  }

  function cleanup() {
    if (runState && runState.rafId) cancelAnimationFrame(runState.rafId);
    clearRestTimeouts();
    releaseWakeLock();
    runState = null;
  }

  return { renderSetup, renderRun, cleanup };
})();
