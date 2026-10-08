window.BT = window.BT || {};

BT.trainingLive = (() => {
  const SCHEMA_VERSION = 1;
  const MAX_BACKGROUND_MS = 6 * 60 * 60 * 1000;
  let active = null;

  const now = () => Date.now();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const iso = value => new Date(value).toISOString();
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = value => String(value == null ? '' : value);
  const clean = value => text(value).trim();
  const slug = value => clean(value).toLocaleLowerCase('de-DE')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function durationSeconds(drill) {
    return clamp(Math.round(Number(drill?.minutes || 0) * 60), 30, 4 * 60 * 60);
  }

  function normalizeBlock(raw, index) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const plannedSeconds = clamp(Math.round(Number(source.plannedSeconds ?? source.durationSeconds ?? 600)), 30, 4 * 60 * 60);
    const elapsedMs = clamp(Number(source.elapsedMs || 0), 0, 24 * 60 * 60 * 1000);
    const runningSince = Number.isFinite(Number(source.runningSince)) && Number(source.runningSince) > 0
      ? Number(source.runningSince) : null;
    return {
      id: clean(source.id) || `live_block_${index + 1}`,
      sourceIndex: Number.isInteger(source.sourceIndex) ? source.sourceIndex : index,
      name: clean(source.name) || `Block ${index + 1}`,
      description: text(source.description).slice(0, 2000),
      shotTargets: (source.shotTargets || []).map(target => ({ ...target })),
      intensity: ['low', 'medium', 'high'].includes(source.intensity) ? source.intensity : 'medium',
      plannedSeconds,
      durationSeconds: clamp(Math.round(Number(source.durationSeconds || plannedSeconds)), 30, 4 * 60 * 60),
      elapsedMs,
      runningSince,
      status: ['pending', 'active', 'completed', 'skipped'].includes(source.status) ? source.status : 'pending',
      rating: ['worked', 'repeat', 'problem'].includes(source.rating) ? source.rating : null,
      note: text(source.note).slice(0, 1200),
      startedAt: source.startedAt || null,
      endedAt: source.endedAt || null,
      tacticId: clean(source.tacticId) || null
    };
  }

  function blocksFromPlan(training) {
    return ((training?.plan?.drills) || []).map((drill, index) => normalizeBlock({
      id: clean(drill.id) || `training_${training.id}_block_${index + 1}`,
      sourceIndex: index,
      name: drill.name,
      description: drill.description,
      shotTargets: drill.shotTargets,
      intensity: drill.intensity,
      plannedSeconds: durationSeconds(drill),
      durationSeconds: durationSeconds(drill),
      status: index === 0 ? 'active' : 'pending',
      tacticId: drill.tacticId
    }, index));
  }

  function createSession(training, timestamp = now()) {
    const blocks = blocksFromPlan(training);
    return {
      schemaVersion: SCHEMA_VERSION,
      status: 'active',
      startedAt: iso(timestamp),
      completedAt: null,
      activeIndex: 0,
      totalElapsedMs: 0,
      totalRunningSince: timestamp,
      presentCount: (BT.staff?.playerAttendance(training) || training.attendance || []).filter(item => item.status === 'present').length,
      plannedSeconds: blocks.reduce((sum, block) => sum + block.plannedSeconds, 0),
      blocks,
      events: [{ type: 'session-started', at: iso(timestamp) }],
      report: null,
      updatedAt: iso(timestamp)
    };
  }

  function normalizeSession(training, raw, timestamp = now()) {
    if (!raw || typeof raw !== 'object' || raw.schemaVersion !== SCHEMA_VERSION) return createSession(training, timestamp);
    const blocks = (Array.isArray(raw.blocks) ? raw.blocks : []).map(normalizeBlock);
    if (!blocks.length) return createSession(training, timestamp);
    const status = raw.status === 'completed' ? 'completed' : 'active';
    const activeIndex = clamp(Math.floor(Number(raw.activeIndex || 0)), 0, blocks.length - 1);
    blocks.forEach((block, index) => {
      if (status === 'completed') block.runningSince = null;
      if (index === activeIndex && status === 'active' && block.status === 'pending') block.status = 'active';
      if (index !== activeIndex && status === 'active' && block.status === 'active') block.status = 'pending';
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      status,
      startedAt: raw.startedAt || iso(timestamp),
      completedAt: raw.completedAt || null,
      activeIndex,
      totalElapsedMs: clamp(Number(raw.totalElapsedMs || 0), 0, 7 * 24 * 60 * 60 * 1000),
      totalRunningSince: status === 'active' && Number.isFinite(Number(raw.totalRunningSince))
        ? Number(raw.totalRunningSince) : null,
      presentCount: clamp(Number(raw.presentCount || 0), 0, 100),
      plannedSeconds: clamp(Number(raw.plannedSeconds || blocks.reduce((sum, block) => sum + block.plannedSeconds, 0)), 0, 24 * 60 * 60),
      blocks,
      events: Array.isArray(raw.events) ? raw.events.slice(-300) : [],
      report: raw.report && typeof raw.report === 'object' ? raw.report : null,
      updatedAt: raw.updatedAt || iso(timestamp)
    };
  }

  function runningDelta(since, timestamp) {
    return since == null ? 0 : clamp(timestamp - since, 0, MAX_BACKGROUND_MS);
  }

  function blockElapsed(block, timestamp = now()) {
    return clamp(block.elapsedMs + runningDelta(block.runningSince, timestamp), 0, 24 * 60 * 60 * 1000);
  }

  function totalElapsed(session, timestamp = now()) {
    return clamp(session.totalElapsedMs + runningDelta(session.totalRunningSince, timestamp), 0, 7 * 24 * 60 * 60 * 1000);
  }

  function pauseBlock(block, timestamp = now()) {
    if (block.runningSince == null) return;
    block.elapsedMs = blockElapsed(block, timestamp);
    block.runningSince = null;
  }

  function activeBlock(session) {
    return session.blocks[session.activeIndex] || null;
  }

  function log(session, type, detail, timestamp = now()) {
    session.events.push({ type, at: iso(timestamp), ...(detail || {}) });
    session.events = session.events.slice(-300);
    session.updatedAt = iso(timestamp);
  }

  function toggle(session, timestamp = now()) {
    if (session.status !== 'active') return session;
    const block = activeBlock(session);
    if (!block) return session;
    if (block.runningSince == null) {
      block.runningSince = timestamp;
      block.startedAt ||= iso(timestamp);
      block.status = 'active';
      log(session, 'block-started', { blockId: block.id }, timestamp);
    } else {
      pauseBlock(block, timestamp);
      log(session, 'block-paused', { blockId: block.id, elapsedMs: block.elapsedMs }, timestamp);
    }
    return session;
  }

  function adjust(session, deltaSeconds, timestamp = now()) {
    const block = activeBlock(session);
    if (!block || session.status !== 'active') return session;
    const minimum = Math.max(30, Math.ceil(blockElapsed(block, timestamp) / 1000));
    block.durationSeconds = clamp(block.durationSeconds + deltaSeconds, minimum, 4 * 60 * 60);
    log(session, 'block-duration-adjusted', { blockId: block.id, deltaSeconds, durationSeconds: block.durationSeconds }, timestamp);
    return session;
  }

  function moveTo(session, targetIndex, options = {}, timestamp = now()) {
    if (session.status !== 'active' || !session.blocks.length) return session;
    const nextIndex = clamp(Math.floor(targetIndex), 0, session.blocks.length - 1);
    const current = activeBlock(session);
    pauseBlock(current, timestamp);
    if (options.finishCurrent && current) {
      current.status = options.skipCurrent ? 'skipped' : 'completed';
      current.endedAt = iso(timestamp);
      log(session, options.skipCurrent ? 'block-skipped' : 'block-completed', {
        blockId: current.id,
        elapsedMs: current.elapsedMs
      }, timestamp);
    } else if (current && current.status === 'active' && nextIndex !== session.activeIndex) {
      current.status = 'pending';
    }
    session.activeIndex = nextIndex;
    const target = activeBlock(session);
    if (target && target.status === 'pending') target.status = 'active';
    log(session, 'block-selected', { blockId: target?.id || null, index: nextIndex }, timestamp);
    return session;
  }

  function finishSession(session, timestamp = now()) {
    if (session.status === 'completed') return session;
    const block = activeBlock(session);
    if (block) {
      pauseBlock(block, timestamp);
      if (block.status === 'active') {
        block.status = 'completed';
        block.endedAt = iso(timestamp);
      }
    }
    session.blocks.forEach(item => {
      if (item.status === 'pending' || item.status === 'active') item.status = 'skipped';
      item.runningSince = null;
    });
    session.totalElapsedMs = totalElapsed(session, timestamp);
    session.totalRunningSince = null;
    session.status = 'completed';
    session.completedAt = iso(timestamp);
    session.report = buildReport(session, timestamp);
    log(session, 'session-completed', { actualMs: session.totalElapsedMs }, timestamp);
    return session;
  }

  function buildReport(session, timestamp = now()) {
    const actualMs = session.status === 'completed' ? session.totalElapsedMs : totalElapsed(session, timestamp);
    return {
      plannedSeconds: session.plannedSeconds,
      actualSeconds: Math.round(actualMs / 1000),
      completedBlocks: session.blocks.filter(block => block.status === 'completed').length,
      skippedBlocks: session.blocks.filter(block => block.status === 'skipped').length,
      worked: session.blocks.filter(block => block.rating === 'worked').length,
      repeat: session.blocks.filter(block => block.rating === 'repeat').length,
      problems: session.blocks.filter(block => block.rating === 'problem').length,
      blocks: session.blocks.map(block => ({
        id: block.id,
        name: block.name,
        status: block.status,
        plannedSeconds: block.plannedSeconds,
        scheduledSeconds: block.durationSeconds,
        actualSeconds: Math.round(blockElapsed(block, timestamp) / 1000),
        rating: block.rating,
        note: block.note
      }))
    };
  }

  function formatClock(ms, overtime = false) {
    const seconds = Math.max(0, Math.floor(Math.abs(ms) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const rest = seconds % 60;
    const base = `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    return overtime ? `+${base}` : base;
  }

  function coachingPoints(block, training) {
    const source = clean(block?.description);
    const points = source
      ? source.split(/\n|[•;]+|\.(?:\s+|$)/).map(clean).filter(item => item.length > 2).slice(0, 6)
      : [];
    const context = slug(`${block?.name || ''} ${block?.description || ''} ${training?.plan?.summary || ''}`);
    const add = value => { if (!points.some(item => slug(item) === slug(value))) points.push(value); };
    if (/horns|5 out|five out|flex/.test(context)) {
      add('Spacing halten und Entscheidungen lesen');
      add('Nach dem Pass schneiden und frei weiterspielen');
    }
    if (/no middle|help|defen|verteid/.test(context)) {
      add('Mitte schließen, Baseline vorgeben');
      add('Helpside früh zeigen und laut kommunizieren');
    }
    if (/rebound|ausbox/.test(context)) add('Kontakt herstellen, ausboxen und Ball sichern');
    if (/transition|umschalt/.test(context)) add('Ball stoppen, Paint schützen und Match-up ansagen');
    return points.slice(0, 6).length ? points.slice(0, 6) : ['Ziel und Regeln vor dem Start kurz benennen', 'Kommunikation und spielnahe Entscheidungen einfordern'];
  }

  function tacticFor(block) {
    const source = slug(`${block?.name || ''} ${block?.description || ''}`);
    const stored = (BT.teamStrategy?.activeTactics?.() || []).filter(tactic => !tactic.archived);
    if (block?.tacticId) {
      const exact = stored.find(tactic => tactic.id === block.tacticId);
      if (exact) return exact;
    }
    const scored = stored.map(tactic => {
      const candidates = [tactic.title, tactic.category, ...(tactic.tags || [])].map(slug).filter(Boolean);
      const score = candidates.reduce((best, candidate) => {
        if (source.includes(candidate)) return Math.max(best, candidate.length + 20);
        const overlap = candidate.split(' ').filter(part => part.length > 2 && source.includes(part)).length;
        return Math.max(best, overlap * 5);
      }, 0);
      return { tactic, score };
    }).sort((a, b) => b.score - a.score)[0];
    if (scored?.score >= 5) return scored.tactic;

    const key = /pick and pop|pick pop|pnp/.test(source) ? 'pick-and-pop'
      : /reject|re screen|rescreen/.test(source) ? 'pick-and-roll-reject'
        : /pick and roll|pick roll|pnr/.test(source) ? 'pick-and-roll' : null;
    return key ? stored.find(tactic => tactic.id === key) || null : null;
  }

  function button(label, action, className = '') {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.dataset.liveAction = action;
    if (className) element.className = className;
    return element;
  }

  function createRoot() {
    const root = document.createElement('section');
    root.className = 'training-live';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'training-live-title');
    root.innerHTML = `
      <header class="training-live-header">
        <div><span class="training-live-kicker">CourtHub Coach-Modus</span><h1 id="training-live-title">Training Live</h1></div>
        <button type="button" class="training-live-close" data-live-action="close" aria-label="Training Live schließen">Schließen</button>
      </header>
      <div class="training-live-total">
        <span data-live="session-state">Training läuft</span>
        <strong data-live="total-time">00:00</strong>
        <span data-live="presence">0 Spieler</span>
      </div>
      <div class="training-live-progress" data-live="progress" aria-label="Trainingsfortschritt"></div>
      <main class="training-live-main">
        <section class="training-live-current" data-live="current-view">
          <div class="training-live-position"><span data-live="position">Block 1 von 1</span><span data-live="intensity">Mittel</span></div>
          <h2 data-live="block-name">Drill</h2>
          <div class="training-live-clock" data-live="block-time" aria-live="off">00:00</div>
          <p class="training-live-clock-state" data-live="clock-state" role="status">Bereit</p>
          <div class="training-live-primary-controls">
            <button type="button" class="training-live-start" data-live-action="toggle">▶ Start</button>
            <button type="button" data-live-action="minus-one">−1 min</button>
            <button type="button" data-live-action="plus-one">+1 min</button>
            <button type="button" data-live-action="plus-five">+5 min</button>
          </div>
          <p class="training-live-skip-hint">Die Uhr ist nur eine Hilfe: Du kannst jederzeit zum nächsten Block wechseln.</p>
          <div class="training-live-columns">
            <section class="training-live-card">
              <div class="training-live-card-head"><h3>Coaching-Points</h3><button type="button" class="training-live-tactic" data-live-action="tactic" hidden>Taktik anzeigen</button></div>
              <ul data-live="coaching"></ul>
              <p class="muted" data-live="shot-targets" hidden></p>
              <button type="button" data-live-action="shots" hidden>Würfe erfassen</button>
            </section>
            <section class="training-live-card">
              <h3>Schnellbewertung</h3>
              <div class="training-live-ratings" role="group" aria-label="Block bewerten">
                <button type="button" data-live-rating="worked">✓ Funktioniert</button>
                <button type="button" data-live-rating="repeat">↻ Wiederholen</button>
                <button type="button" data-live-rating="problem">⚠ Problem</button>
              </div>
              <label class="training-live-note">Kurze Trainernotiz<textarea rows="3" maxlength="1200" data-live="note" placeholder="Was ist aufgefallen?"></textarea></label>
            </section>
          </div>
          <section class="training-live-next" data-live="next-card"><span>Als Nächstes</span><strong data-live="next-name">—</strong><small data-live="next-meta"></small></section>
        </section>
        <section class="training-live-summary" data-live="summary-view" hidden>
          <span class="training-live-kicker">Einheit abgeschlossen</span>
          <h2>Trainingsauswertung</h2>
          <div class="training-live-summary-grid" data-live="summary-grid"></div>
          <ol class="training-live-report" data-live="report"></ol>
          <div class="training-live-summary-actions">
            <button type="button" data-live-action="reset">Neue Durchführung starten</button>
            <button type="button" data-live-action="load-management" hidden>Belastung &amp; RPE eintragen</button>
            <button type="button" class="primary" data-live-action="close">Zur Trainingsübersicht</button>
          </div>
        </section>
      </main>
      <footer class="training-live-footer">
        <nav class="training-live-nav" aria-label="Trainingsblöcke steuern">
          <button type="button" data-live-action="previous">← Vorheriger</button>
          <button type="button" data-live-action="skip">Überspringen</button>
          <button type="button" class="primary" data-live-action="next">Nächster Block →</button>
        </nav>
        <div class="training-live-footer-secondary"><button type="button" data-live-action="overview">Alle Blöcke</button><button type="button" class="finish" data-live-action="finish">Training beenden &amp; speichern</button></div>
      </footer>
      <aside class="training-live-sheet" data-live="sheet" hidden aria-label="Alle Trainingsblöcke">
        <div class="training-live-sheet-head"><h2>Trainingsablauf</h2><button type="button" data-live-action="overview-close">Schließen</button></div>
        <ol data-live="block-list"></ol>
      </aside>`;
    return root;
  }

  function save(timestamp = now()) {
    if (!active) return;
    active.session.updatedAt = iso(timestamp);
    active.training.liveSession = copy(active.session);
    BT.storage.upsertTraining(active.training);
    syncLauncher(active.training);
  }

  function scheduleSave() {
    if (!active) return;
    clearTimeout(active.saveTimer);
    active.saveTimer = setTimeout(() => save(), 300);
  }

  function syncLauncher(training) {
    const launcher = document.querySelector('[data-action="training-live"]');
    if (!launcher) return;
    const session = training?.liveSession;
    launcher.textContent = session?.status === 'active' ? '▶ Training fortsetzen'
      : session?.status === 'completed' ? '✓ Live-Auswertung' : '▶ Training durchführen';
  }

  function setRating(rating) {
    const block = activeBlock(active.session);
    if (!block) return;
    block.rating = block.rating === rating ? null : rating;
    log(active.session, 'block-rated', { blockId: block.id, rating: block.rating });
    save();
    renderStatic();
  }

  async function openTactic() {
    if (!active?.tactic) return;
    try {
      const [{ openPlayPreview }, { openAnimationPlayer }] = await Promise.all([
        import('./play-designer/play-preview.js'),
        import('./play-designer/animation-player.js')
      ]);
      const board = BT.tactics.normalizeBoard(active.tactic);
      openPlayPreview(board, {
        core: BT.tactics.__core,
        onPlay: () => openAnimationPlayer(board, { core: BT.tactics.__core })
      });
    } catch (error) {
      console.error('Training-Live-Taktik konnte nicht geöffnet werden', error);
      BT.util?.toast?.('Taktik konnte nicht geöffnet werden.');
    }
  }

  function selectBlock(index) {
    moveTo(active.session, index);
    save();
    renderStatic();
  }

  function handleAction(action) {
    if (!active) return;
    const session = active.session;
    const current = activeBlock(session);
    if (action === 'close') { close(); return; }
    if (action === 'shots') {
      const targets = current?.shotTargets || [];
      const field = targets.find(target => target.kind === 'field');
      close();
      BT.training?.openShotCapture(field ? 'shots' : 'ft', field?.category);
      return;
    }
    if (action === 'toggle') {
      toggle(session);
      save(); renderStatic(); return;
    }
    if (action === 'minus-one' || action === 'plus-one' || action === 'plus-five') {
      adjust(session, action === 'minus-one' ? -60 : action === 'plus-five' ? 300 : 60);
      save(); renderStatic(); return;
    }
    if (action === 'previous') {
      if (session.activeIndex > 0) selectBlock(session.activeIndex - 1);
      return;
    }
    if (action === 'next') {
      if (session.activeIndex < session.blocks.length - 1) {
        moveTo(session, session.activeIndex + 1, { finishCurrent: true });
        save(); renderStatic();
      } else {
        finish();
      }
      return;
    }
    if (action === 'skip') {
      if (session.activeIndex < session.blocks.length - 1) {
        moveTo(session, session.activeIndex + 1, { finishCurrent: true, skipCurrent: true });
        save(); renderStatic();
      } else {
        current.status = 'skipped';
        finish();
      }
      return;
    }
    if (action === 'overview') {
      renderBlockList();
      active.root.querySelector('[data-live="sheet"]').hidden = false;
      return;
    }
    if (action === 'overview-close') {
      active.root.querySelector('[data-live="sheet"]').hidden = true;
      return;
    }
    if (action === 'tactic') { openTactic(); return; }
    if (action === 'finish') { finish(); return; }
    if (action === 'load-management') {
      close();
      document.querySelector('.subnav-btn[data-pane="load"]')?.click();
      return;
    }
    if (action === 'reset') {
      if (!window.confirm('Die gespeicherte Live-Durchführung zurücksetzen und neu beginnen?')) return;
      delete active.training.liveSession;
      delete active.training.endedAt;
      if (active.training.status === 'completed') delete active.training.status;
      active.session = createSession(active.training);
      save(); renderStatic();
    }
  }

  function finish() {
    if (!active || active.session.status === 'completed') return;
    const remaining = active.session.blocks.filter(block => block.status === 'pending').length;
    const pendingAttendance = (BT.staff?.playerAttendance(active.training) || active.training.attendance || []).filter(item => !item.status).length;
    const details = [remaining ? `${remaining} noch nicht gestartete Blöcke werden als übersprungen markiert.` : '', pendingAttendance ? `Bei ${pendingAttendance} Spielern ist die Anwesenheit noch offen.` : ''].filter(Boolean).join('\n\n');
    if (!window.confirm(`Training jetzt beenden und die Live-Auswertung speichern?${details ? `\n\n${details}` : ''}`)) return;
    finishSession(active.session);
    active.training.liveSession = copy(active.session);
    active.training.endedAt = active.session.completedAt;
    active.training.status = 'completed';
    save();
    BT.wake?.release?.('training-live');
    renderStatic();
  }

  function renderProgress() {
    const target = active.root.querySelector('[data-live="progress"]');
    target.replaceChildren();
    active.session.blocks.forEach((block, index) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `training-live-progress-step ${block.status}${index === active.session.activeIndex ? ' current' : ''}`;
      marker.title = block.name;
      marker.setAttribute('aria-label', `${index + 1}. ${block.name}: ${block.status}`);
      marker.addEventListener('click', () => selectBlock(index));
      target.appendChild(marker);
    });
  }

  function renderBlockList() {
    const list = active.root.querySelector('[data-live="block-list"]');
    list.replaceChildren();
    active.session.blocks.forEach((block, index) => {
      const item = document.createElement('li');
      const choose = button('', 'choose-block');
      choose.removeAttribute('data-live-action');
      choose.dataset.liveBlock = String(index);
      const name = document.createElement('strong');
      name.textContent = block.name;
      const meta = document.createElement('span');
      const elapsed = Math.round(blockElapsed(block) / 1000);
      meta.textContent = `${formatClock(block.plannedSeconds * 1000)} geplant · ${formatClock(elapsed * 1000)} tatsächlich · ${block.status}`;
      choose.append(name, meta);
      item.appendChild(choose);
      list.appendChild(item);
    });
  }

  function renderSummary() {
    const report = active.session.report || buildReport(active.session);
    const grid = active.root.querySelector('[data-live="summary-grid"]');
    grid.replaceChildren();
    [
      ['Geplant', formatClock(report.plannedSeconds * 1000)],
      ['Tatsächlich', formatClock(report.actualSeconds * 1000)],
      ['Abgeschlossen', `${report.completedBlocks}/${active.session.blocks.length}`],
      ['Wiederholen', String(report.repeat + report.problems)]
    ].forEach(([label, value]) => {
      const card = document.createElement('div');
      const span = document.createElement('span'); span.textContent = label;
      const strong = document.createElement('strong'); strong.textContent = value;
      card.append(span, strong); grid.appendChild(card);
    });
    const list = active.root.querySelector('[data-live="report"]');
    list.replaceChildren();
    report.blocks.forEach(block => {
      const item = document.createElement('li');
      item.className = `training-live-report-item ${block.status}`;
      const head = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = block.name;
      const times = document.createElement('span'); times.textContent = `${formatClock(block.actualSeconds * 1000)} / ${formatClock(block.plannedSeconds * 1000)}`;
      head.append(name, times); item.appendChild(head);
      const labels = { worked: '✓ Funktioniert', repeat: '↻ Wiederholen', problem: '⚠ Problem' };
      if (block.rating || block.note) {
        const note = document.createElement('p');
        note.textContent = [labels[block.rating], block.note].filter(Boolean).join(' · ');
        item.appendChild(note);
      }
      list.appendChild(item);
    });
  }

  function renderStatic() {
    if (!active) return;
    const { root, session, training } = active;
    const completed = session.status === 'completed';
    root.querySelector('[data-live="current-view"]').hidden = completed;
    root.querySelector('[data-live="summary-view"]').hidden = !completed;
    root.querySelector('.training-live-footer').hidden = completed;
    root.querySelector('[data-live="session-state"]').textContent = completed ? 'Training abgeschlossen' : 'Training läuft';
    root.querySelector('[data-live="presence"]').textContent = `${session.presentCount} Spieler anwesend`;
    root.querySelector('[data-live-action="load-management"]').hidden = !completed || !training.stationTraining;
    renderProgress();
    if (completed) { renderSummary(); tick(); return; }

    const block = activeBlock(session);
    const next = session.blocks[session.activeIndex + 1] || null;
    root.querySelector('[data-live="position"]').textContent = `Block ${session.activeIndex + 1} von ${session.blocks.length}`;
    root.querySelector('[data-live="block-name"]').textContent = block.name;
    const intensity = root.querySelector('[data-live="intensity"]');
    intensity.textContent = block.intensity === 'high' ? 'Intensiv' : block.intensity === 'low' ? 'Locker' : 'Mittel';
    intensity.dataset.level = block.intensity;
    const coaching = root.querySelector('[data-live="coaching"]');
    coaching.replaceChildren();
    coachingPoints(block, training).forEach(point => {
      const item = document.createElement('li'); item.textContent = point; coaching.appendChild(item);
    });
    const shotTargets = block.shotTargets || [];
    const targetLabel = root.querySelector('[data-live="shot-targets"]');
    targetLabel.hidden = !shotTargets.length;
    targetLabel.textContent = shotTargets.map(target => `${target.category}: ${target.attempted} Versuche pro Spieler`).join(' · ');
    root.querySelector('[data-live-action="shots"]').hidden = !shotTargets.length;
    active.tactic = tacticFor(block);
    const tactic = root.querySelector('[data-live-action="tactic"]');
    tactic.hidden = !active.tactic;
    tactic.textContent = active.tactic ? `Taktik: ${active.tactic.title || 'anzeigen'}` : 'Taktik anzeigen';
    root.querySelectorAll('[data-live-rating]').forEach(button => {
      button.classList.toggle('active', button.dataset.liveRating === block.rating);
      button.setAttribute('aria-pressed', button.dataset.liveRating === block.rating ? 'true' : 'false');
    });
    const note = root.querySelector('[data-live="note"]');
    if (note !== document.activeElement) note.value = block.note;
    const nextCard = root.querySelector('[data-live="next-card"]');
    nextCard.hidden = !next;
    if (next) {
      root.querySelector('[data-live="next-name"]').textContent = next.name;
      root.querySelector('[data-live="next-meta"]').textContent = `${formatClock(next.durationSeconds * 1000)} · ${next.intensity === 'high' ? 'intensiv' : next.intensity === 'low' ? 'locker' : 'mittel'}`;
    }
    root.querySelector('[data-live-action="previous"]').disabled = session.activeIndex === 0;
    root.querySelector('[data-live-action="next"]').textContent = next ? 'Nächster Block →' : 'Training abschließen →';
    tick();
  }

  function tick() {
    if (!active) return;
    const timestamp = now();
    const { root, session } = active;
    root.querySelector('[data-live="total-time"]').textContent = formatClock(totalElapsed(session, timestamp));
    if (session.status === 'completed') return;
    const block = activeBlock(session);
    const elapsed = blockElapsed(block, timestamp);
    const remaining = block.durationSeconds * 1000 - elapsed;
    root.querySelector('[data-live="block-time"]').textContent = formatClock(remaining, remaining < 0);
    root.querySelector('[data-live="block-time"]').classList.toggle('overtime', remaining < 0);
    root.querySelector('[data-live="clock-state"]').textContent = block.runningSince == null
      ? elapsed ? 'Pausiert' : 'Bereit'
      : remaining < 0 ? 'Blockzeit erreicht · Verlängern oder abschließen' : 'Läuft';
    root.querySelector('[data-live-action="toggle"]').textContent = block.runningSince == null ? (elapsed ? '▶ Fortsetzen' : '▶ Start') : 'Ⅱ Pause';
    if (block.runningSince != null) BT.wake?.acquire?.('training-live');
    else BT.wake?.release?.('training-live');
    if (remaining <= 0 && !active.signaled.has(block.id)) {
      active.signaled.add(block.id);
      try { BT.audio?.levelBeep?.(); } catch (_) { /* Visuelle Anzeige bleibt erhalten. */ }
    }
  }

  function bind() {
    const { root } = active;
    root.addEventListener('click', event => {
      const rating = event.target.closest('[data-live-rating]')?.dataset.liveRating;
      if (rating) { setRating(rating); return; }
      const blockIndex = event.target.closest('[data-live-block]')?.dataset.liveBlock;
      if (blockIndex != null) {
        selectBlock(Number(blockIndex));
        root.querySelector('[data-live="sheet"]').hidden = true;
        return;
      }
      const action = event.target.closest('[data-live-action]')?.dataset.liveAction;
      if (action) handleAction(action);
    });
    root.querySelector('[data-live="note"]').addEventListener('input', event => {
      const block = activeBlock(active.session);
      if (!block) return;
      block.note = event.target.value.slice(0, 1200);
      scheduleSave();
    });
    root.addEventListener('keydown', event => { if (event.key === 'Escape' && root.querySelector('[data-live="sheet"]').hidden) close(); });
    active.persistOnHide = () => {
      if (document.visibilityState === 'hidden') save();
    };
    active.persistOnPageHide = () => save();
    document.addEventListener('visibilitychange', active.persistOnHide);
    window.addEventListener('pagehide', active.persistOnPageHide);
  }

  function open(trainingId) {
    close();
    const training = BT.storage.getTraining(trainingId);
    if (!training) { BT.util?.toast?.('Training wurde nicht gefunden.'); return false; }
    const existing = training.liveSession;
    const session = normalizeSession(training, existing);
    if (!session.blocks.length) {
      BT.util?.toast?.('Füge zuerst mindestens einen Drill zum Trainingsplan hinzu.');
      return false;
    }
    const root = createRoot();
    active = {
      training, session, root, interval: 0, saveTimer: 0, signaled: new Set(), tactic: null,
      previousFocus: document.activeElement, persistOnHide: null, persistOnPageHide: null
    };
    bind();
    document.body.appendChild(root);
    document.documentElement.classList.add('training-live-open');
    renderStatic();
    active.interval = window.setInterval(tick, 250);
    save();
    root.querySelector('[data-live-action="toggle"]')?.focus();
    return true;
  }

  function close() {
    if (!active) return;
    clearTimeout(active.saveTimer);
    clearInterval(active.interval);
    save();
    const state = active;
    active = null;
    document.removeEventListener('visibilitychange', state.persistOnHide);
    window.removeEventListener('pagehide', state.persistOnPageHide);
    state.root.remove();
    document.documentElement.classList.remove('training-live-open');
    BT.wake?.release?.('training-live');
    state.previousFocus?.focus?.();
  }

  return {
    open,
    close,
    syncLauncher,
    __test: {
      createSession,
      normalizeSession,
      blockElapsed,
      totalElapsed,
      activeBlock,
      toggle,
      adjust,
      moveTo,
      finishSession,
      buildReport,
      coachingPoints,
      formatClock
    }
  };
})();


