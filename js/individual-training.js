window.BT = window.BT || {};

BT.individualTraining = (function() {
  const QUEUE_PREFIX = 'courthub_individual_queue:';
  const CACHE_PREFIX = 'courthub_individual_cache:';
  const LIVE_PREFIX = 'courthub_individual_live:';
  let activeRequest = 0;
  let stopCoachRefresh = () => {};
  const syncWorkers = new Map();

  function user() { return BT.sync?.getState?.().user || null; }
  function contextKey() { const u = user(); return `${u?.id || 'guest'}:${u?.organization?.id || 'none'}:${u?.role || 'guest'}`; }
  function userKey(prefix) { return prefix + contextKey(); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return clone(fallback); }
  }
  function saveLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function clearLocalData() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(QUEUE_PREFIX) || key?.startsWith(CACHE_PREFIX) || key?.startsWith(LIVE_PREFIX)) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch {}
  }

  function mutation(kind, payload) {
    const random = crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return { mutationId: `individual-${random}`, kind, payload: clone(payload), deviceRecordedAt: new Date().toISOString() };
  }

  async function queueMutation(kind, payload) {
    const item = mutation(kind, payload);
    const key = userKey(QUEUE_PREFIX);
    const queue = loadLocal(key, []);
    queue.push(item);
    saveLocal(key, queue);
    if (navigator.onLine) {
      try { await syncPending(); } catch (error) { item.syncError = error.message; }
    }
    return item;
  }

  async function syncPending() {
    const current = user();
    if (!current || current.role !== 'player' || !navigator.onLine) return { pending: loadLocal(userKey(QUEUE_PREFIX), []).length };
    const key = userKey(QUEUE_PREFIX);
    if (syncWorkers.has(key)) return syncWorkers.get(key);
    const work = (async () => {
      const attempted = new Set(), results = [];
      while (key === userKey(QUEUE_PREFIX) && user()?.role === 'player') {
        const queue = loadLocal(key, []).filter(item=>!attempted.has(item.mutationId)).slice(0,50);
        if (!queue.length) break;
        queue.forEach(item=>attempted.add(item.mutationId));
        const result = await BT.api.syncIndividualMutations(queue);
        if (key !== userKey(QUEUE_PREFIX)) return {pending:0};
        results.push(...(result.results || []));
        const acknowledged = new Set((result.results || []).filter(item=>item.applied || item.duplicate).map(item=>item.mutation_id));
        saveLocal(key, loadLocal(key, []).filter(item=>!acknowledged.has(item.mutationId)));
      }
      return {pending:loadLocal(key, []).length,results};
    })();
    syncWorkers.set(key,work);
    try { return await work; } finally { if (syncWorkers.get(key) === work) syncWorkers.delete(key); }
  }

  async function loadOverview(profileId) {
    const key = userKey(CACHE_PREFIX);
    try {
      let data = await BT.api.getIndividualOverview(profileId);
      if (key !== userKey(CACHE_PREFIX)) throw new Error('Das Konto wurde zwischenzeitlich gewechselt.');
      try { saveLocal(key, data); } catch { data._cacheUnavailable = true; }
      if (migrateLegacyQueue(data)) {
        try {
          const result = await syncPending();
          if (!result.pending && key === userKey(CACHE_PREFIX)) {
            data = await BT.api.getIndividualOverview(profileId);
            if (key !== userKey(CACHE_PREFIX)) throw new Error('Das Konto wurde zwischenzeitlich gewechselt.');
            try { saveLocal(key,data); } catch { data._cacheUnavailable = true; }
          }
        } catch { /* Safely migrated entries stay in the new queue for retry. */ }
      }
      return withPending(data);
    } catch (error) {
      if (key !== userKey(CACHE_PREFIX)) throw error;
      if (error.status !== 0 && !(error.status === 503 && error.code === 'DATABASE_QUOTA_EXCEEDED')) throw error;
      const cached = loadLocal(key, null);
      if (!cached) throw error;
      return withPending({...cached,_offline:true});
    }
  }

  function migrateLegacyQueue(data) {
    const current = user();
    if (current?.role !== 'player' || BT.sync.getState().identitySource !== 'server' || data.role !== 'player') return false;
    const profile = (data.profiles || []).find(p=>p.id === current.individualProfileId && p.user_id === current.id);
    if (!profile) return false;
    const legacyKey = QUEUE_PREFIX + current.id, legacy = loadLocal(legacyKey, []);
    if (!Array.isArray(legacy) || !legacy.length) return false;
    const sessions = new Set((data.sessions || []).filter(s=>s.individual_profile_id === profile.id).map(s=>s.id));
    const focuses = new Set((data.focuses || []).filter(f=>f.individual_profile_id === profile.id).map(f=>f.id));
    const safe = item=>typeof item?.mutationId === 'string' && (
      (['attendance','readiness'].includes(item.kind) && sessions.has(item.payload?.entityId)) ||
      (item.kind === 'weekly_feedback' && focuses.has(item.payload?.focusId))
    );
    const accepted = legacy.filter(safe);
    if (!accepted.length) return false;
    const key = userKey(QUEUE_PREFIX), queue = loadLocal(key, []), existing = new Set(queue.map(item=>item.mutationId));
    saveLocal(key, [...queue,...accepted.filter(item=>!existing.has(item.mutationId))]);
    const remaining = legacy.filter(item=>!safe(item));
    if (remaining.length) saveLocal(legacyKey,remaining); else localStorage.removeItem(legacyKey);
    return true;
  }

  function withPending(data) {
    if (user()?.role !== 'player') return data;
    const copy = clone(data), queue = loadLocal(userKey(QUEUE_PREFIX), []), profileId = user()?.individualProfileId || copy.profiles?.[0]?.id;
    copy._pending = queue.length;
    const legacy = loadLocal(QUEUE_PREFIX + user().id, []);
    copy._legacyPending = Array.isArray(legacy) ? legacy.length : 0;
    for (const {kind,payload} of queue) {
      if (kind === 'attendance') for (const s of copy.sessions || []) if (s.id === payload.entityId && s.individual_profile_id === profileId) s.attendance_status = payload.status;
      if (kind === 'readiness') {
        copy.readiness = (copy.readiness || []).filter(r=>r.session_id !== payload.entityId || r.individual_profile_id !== profileId);
        copy.readiness.unshift({individual_profile_id:profileId,session_id:payload.entityId,score:payload.score});
      }
    }
    return copy;
  }

  function fmt(value, options = {}) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', ...options }).format(new Date(value));
  }

  function playerName(profile) {
    if (profile.account_name) return profile.account_name;
    const player = BT.storage?.getPlayers?.().find(item => item.id === profile.player_profile_id);
    return player?.name || user()?.displayName || 'Spieler';
  }

  function upcomingSession(data, profileId) {
    const now = Date.now();
    return (data.sessions || [])
      .filter(item => item.individual_profile_id === profileId && item.status !== 'cancelled' && Date.parse(item.scheduled_for) >= now - 6 * 60 * 60 * 1000)
      .sort((a, b) => Date.parse(a.scheduled_for) - Date.parse(b.scheduled_for))[0] || null;
  }

  function needsPilotStart(data) {
    const profiles = data.profiles || [];
    if (!profiles.length) return false;
    return profiles.some(profile => {
      const session = (data.sessions || []).find(item =>
        item.individual_profile_id === profile.id && Number(item.unit_number) === 1 && item.status !== 'cancelled'
      );
      if (!session) return true;
      return !(data.plans || []).some(plan => plan.session_id === session.id && plan.individual_profile_id === profile.id);
    });
  }

  function currentFocus(data, profileId) {
    const today = new Date().toISOString().slice(0, 10);
    return (data.focuses || []).find(item => item.individual_profile_id === profileId && item.valid_from <= today && item.valid_until >= today)
      || (data.focuses || []).find(item => item.individual_profile_id === profileId)
      || null;
  }

  function attendanceLabel(status) {
    return ({ pending: 'Antwort offen', confirmed: 'Zugesagt', declined: 'Abgesagt', attended: 'Anwesend', unexcused_no_show: 'No-Show' })[status] || 'Offen';
  }

  function draftLabel(status) {
    return ({ queued: 'wartet', generating: 'wird erstellt', current: 'zur Prüfung', stale: 'veraltet', approved: 'freigegeben', failed: 'Fehler' })[status] || 'noch kein Entwurf';
  }

  function renderHub(target) {
    target.innerHTML = `<section class="view individual-start-hub">
      <div class="individual-hub-head"><div><h3>Arbeitsbereich wechseln</h3><p>Mannschaft oder Individualtraining</p></div></div>
      <div class="individual-workspaces">
        <a class="individual-workspace-card individual-workspace-team" data-workspace="team" href="#/team"><span class="individual-workspace-icon" aria-hidden="true">M</span><span><small>Arbeitsbereich</small><strong>Mannschaft</strong><em>Teamtraining, Spiele, Kader und Auswertungen</em></span><b aria-hidden="true">→</b></a>
        <a class="individual-workspace-card individual-workspace-one" data-workspace="individual" href="#/individual"><span class="individual-workspace-icon" aria-hidden="true">1</span><span><small>Arbeitsbereich</small><strong>Individual Training</strong><em>Thomas und Adnan gezielt entwickeln</em></span><b aria-hidden="true">→</b></a>
      </div>
    </section>`;
    const todayView = document.createDocumentFragment();
    BT.dashboard?.render(todayView);
    target.prepend(todayView);
  }

  function setPlayerNavigation(base, pane, playerView) {
    document.body.classList.toggle('individual-player-mode', playerView);
    const account = base === '#/individual' ? '#/individual/account' : `${base}/account`;
    const links = [base, `${base}/training`, `${base}/progress`, account];
    document.querySelectorAll('[data-player-nav]').forEach((link,index)=>{
      link.setAttribute('href', links[index]);
      if (index === ['overview','training','progress','account'].indexOf(pane)) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if (playerView) {
      document.querySelector('.brand')?.setAttribute('href', base);
      const manage = document.querySelector('.manage-link');
      manage?.setAttribute('href', account);
      manage?.setAttribute('aria-label', 'Dein Konto');
    }
  }

  function renderIndividualNavigation(data, current, selectedProfileId = null, selectedPane = 'overview', previewPane = 'overview') {
    const preview = ['admin','coach'].includes(current.role) && selectedPane === 'preview';
    const playerView = current.role === 'player' || preview;
    const base = preview ? selectedProfileId ? `#/individual/player/${encodeURIComponent(selectedProfileId)}/preview` : '#/individual/preview' : '#/individual';
    const pane = preview ? previewPane : selectedPane;
    setPlayerNavigation(base, pane, playerView);
    const navigation = document.querySelector('[data-role="individual-navigation"]');
    if (!navigation) return;
    if (playerView) {
      navigation.innerHTML = `<span class="nav-section-label">Dein Individualtraining</span>${[
        ['overview','Mein Training',base],['training','Ablauf',`${base}/training`],['progress','Entwicklung',`${base}/progress`],
        ['account','Konto',base === '#/individual' ? '#/individual/account' : `${base}/account`]
      ].map(([key,label,href])=>`<a href="${href}" ${key === pane ? 'class="active" aria-current="page"' : ''}>${label}</a>`).join('')}`;
      return;
    }
    const coachLinks = ['admin', 'coach'].includes(current.role)
      ? (data.profiles || []).map(profile => `<a href="#/individual/player/${encodeURIComponent(profile.id)}/overview" class="${profile.id === selectedProfileId ? 'individual-selected-player' : ''}"><span class="nav-icon" aria-hidden="true">◉</span><span>${BT.util.escapeHTML(playerName(profile))}</span></a>`).join('')
      : '';
    const selectedProfile = (data.profiles || []).find(profile => profile.id === selectedProfileId);
    const paneLinks = selectedProfile ? [
      ['overview', '⌂', 'Übersicht'],
      ['training', '▶', 'Training durchführen'],
      ['measurements', '#', 'Messwerte'],
      ['focus', '◎', 'Wochenfokus'],
      ['feedback', '✎', 'Notizen & Feedback'],
      ['ai-history', '◆', 'KI & Verlauf']
    ].map(([pane, icon, label]) => `<a href="#/individual/player/${encodeURIComponent(selectedProfile.id)}/${pane}" class="individual-pane-link ${pane === selectedPane ? 'active' : ''}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('') : '';
    navigation.innerHTML = `<span class="nav-section-label">Individual Training</span>
      <a href="#/individual" class="${selectedProfileId ? '' : 'active'}"><span class="nav-icon" aria-hidden="true">⌂</span><span>${current.role === 'player' ? 'Mein Training' : 'Coach-Cockpit'}</span></a>
      ${coachLinks}
      ${selectedProfile ? `<span class="nav-section-label individual-player-menu-label">${BT.util.escapeHTML(playerName(selectedProfile))}</span>${paneLinks}` : ''}
      <span class="nav-section-label">Verwaltung</span>
      <a href="#/individual/account"><span class="nav-icon" aria-hidden="true">◉</span><span>Konto &amp; Synchronisierung</span></a>
      ${['admin', 'coach'].includes(current.role) ? '<a href="#/dashboard" class="individual-switch-workspace"><span class="nav-icon" aria-hidden="true">⇄</span><span>Bereich wechseln</span></a>' : ''}`;
  }

  function nextPilotDate(sessions) {
    const dates = [...new Set((sessions || []).map(item => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(item.scheduled_for))))].sort();
    if (!dates.length) return '2026-10-19';
    const next = new Date(`${dates.at(-1)}T12:00:00Z`);
    do { next.setUTCDate(next.getUTCDate() + 7); } while (next.toISOString().slice(0, 10) === '2026-11-02');
    return next.toISOString().slice(0, 10);
  }

  function localBerlinDate(value) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(value));
  }

  function datePlus(date, days) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  function roadmapDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(`${value}T12:00:00Z`));
  }

  function sessionStatusLabel(status) {
    return ({ planned: 'Angelegt', in_progress: 'Läuft', completed: 'Abgeschlossen', cancelled: 'Ausgefallen' })[status] || 'Vorgesehen';
  }

  function roadmapExercise(exercise, index) {
    return `<li><strong>${index + 1}. ${BT.util.escapeHTML(exercise.title)} · ${exercise.durationMinutes} Min.</strong>
      <details><summary>Wiederholungen, Messung und Coaching</summary>
        <p><b>Wiederholungen:</b> ${BT.util.escapeHTML(JSON.stringify(exercise.repetitions || {}))}</p>
        <p><b>Messung:</b> ${BT.util.escapeHTML(JSON.stringify(exercise.measurementMethod || {}))}</p>
        <p><b>Coaching:</b> ${BT.util.escapeHTML((exercise.coachingCues || []).join(' · '))}</p>
      </details></li>`;
  }

  function renderPilotRoadmap(data, sessions) {
    const roadmap = data.pilotRoadmap || [];
    if (!roadmap.length) return '';
    const cards = roadmap.map(unit => {
      const matching = (sessions || []).filter(session => Number(session.unit_number) === Number(unit.unitNumber));
      const actual = [...matching].reverse().find(session => session.status !== 'cancelled') || matching.at(-1) || null;
      const isAssessment = unit.kind === 'assessment';
      const planDate = actual ? localBerlinDate(actual.scheduled_for) : unit.scheduledDate;
      const exercises = unit.template?.exercises || [];
      return `<article class="individual-roadmap-unit ${isAssessment ? 'assessment' : ''} ${actual?.status || 'upcoming'}" data-pilot-unit="${unit.unitNumber}">
        <div class="individual-roadmap-number"><span>Einheit</span><strong>${unit.unitNumber}</strong></div>
        <div class="individual-roadmap-content">
          <div class="individual-roadmap-heading"><div><small>${isAssessment ? 'Verbindliche Testeinheit' : 'Entwicklungseinheit'}</small><h5>${BT.util.escapeHTML(unit.title)}</h5></div><span>${BT.util.escapeHTML(sessionStatusLabel(actual?.status))}</span></div>
          <p class="individual-roadmap-date">${BT.util.escapeHTML(roadmapDate(planDate))} · 20:15 Uhr · ${unit.durationMinutes} Minuten</p>
          <p>${BT.util.escapeHTML(unit.objective)}</p>
          ${exercises.length ? `<details class="individual-roadmap-details"><summary>Freigegebenen Ablauf anzeigen</summary><ol class="individual-exercise-list">${exercises.map(roadmapExercise).join('')}</ol></details>` : '<p class="muted">Der individuelle Ablauf entsteht nach Auswertung der vorherigen Einheit.</p>'}
        </div>
      </article>`;
    }).join('');
    return `<section class="card individual-roadmap"><div class="section-head"><div><span class="section-kicker">Verbindlicher Wochenablauf</span><h4>Pilotplan 2026 · alle acht Einheiten</h4><p class="muted">Der 2. November entfällt wegen der bayerischen Allerheiligenferien. Bei einem Ausfall bleibt die Einheitsnummer offen und wird am nächsten Montag fortgeführt.</p></div></div><div class="individual-roadmap-list">${cards}</div></section>`;
  }

  function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }

  async function enablePush(root) {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Web-Push ist auf diesem Gerät nicht verfügbar.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Push wurde nicht erlaubt. Dashboard-Erinnerungen bleiben aktiv.');
      const { publicKey } = await BT.api.getIndividualPushKey();
      if (!publicKey) throw new Error('Web-Push ist serverseitig noch nicht konfiguriert. Dashboard-Erinnerungen bleiben aktiv.');
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await BT.api.saveIndividualPush(subscription.toJSON());
      notice(root, 'Web-Push ist aktiviert. Dashboard-Erinnerungen bleiben zusätzlich sichtbar.');
    } catch (error) { notice(root, error.message, true); }
  }

  function notice(root, message, error = false) {
    const host = root.querySelector('[data-role="individual-status"]');
    if (!host) return;
    host.textContent = message;
    host.classList.toggle('error', error);
  }

  async function playerAction(root, kind, payload, success) {
    if (root.getAttribute('aria-busy') === 'true') return;
    const owner = contextKey();
    root.setAttribute('aria-busy','true');
    root.querySelectorAll('button').forEach(b=>b.disabled=true);
    try {
      const item = await queueMutation(kind, payload);
      if (!root.isConnected || owner !== contextKey()) return;
      const data = await loadOverview();
      if (!root.isConnected || owner !== contextKey()) return;
      const target = root.parentElement;
      renderPlayer(target, data);
      notice(target, data._pending ? 'Auf diesem Gerät gespeichert. Die Übertragung ist noch offen.' : success, !!item.syncError);
    } catch (error) { if (root.isConnected && owner === contextKey()) notice(root, error.message, true); }
    finally { root.removeAttribute('aria-busy'); root.querySelectorAll('button').forEach(b=>b.disabled=false); }
  }

  function renderPlayer(target, data, options = {}) {
    const profile = (data.profiles || []).find(p=>p.id === options.profileId) || data.profiles?.[0];
    return BT.individualPlayerView.render(target, data, {
      displayName: profile ? playerName(profile) : user()?.displayName, onAction: playerAction, onPush: enablePush, ...options
    });
  }

  function profileCard(profile, data) {
    const session = upcomingSession(data, profile.id);
    const readiness = session && (data.readiness || []).find(item => item.individual_profile_id === profile.id && item.session_id === session.id);
    const readinessScore = readiness && Number(readiness.score);
    const readinessLabel = Number.isInteger(readinessScore) && readinessScore >= 1 && readinessScore <= 10 ? `${readinessScore}/10` : session ? 'Noch nicht gemeldet' : '—';
    const drafts = (data.aiDrafts || []).filter(item => item.individual_profile_id === profile.id);
    const latestDraft = drafts[0];
    const focus = currentFocus(data, profile.id);
    const openFeedback = (data.notifications || []).some(item => item.individual_profile_id === profile.id && item.kind === 'feedback_request' && !item.read_at);
    return `<article class="card individual-profile-card" data-profile-id="${profile.id}">
      <div class="individual-profile-heading"><div><span class="section-kicker">Pilotspieler</span><h3>${BT.util.escapeHTML(playerName(profile))}</h3></div><span class="individual-sync-dot ${Number(profile.pending_sync_count || 0) ? 'pending' : ''}" title="Synchronisierungsstatus"></span></div>
      <dl class="individual-status-grid">
        <div class="wide"><dt>Nächste Einheit</dt><dd data-coach-next-session>${session ? `${fmt(session.scheduled_for)} · Einheit ${session.unit_number || '–'}` : 'Nicht geplant'}</dd></div>
        <div><dt>Teilnahme</dt><dd data-coach-attendance aria-live="polite">${session ? attendanceLabel(session.attendance_status) : '—'}</dd></div>
        <div><dt>Tagesform</dt><dd data-coach-readiness aria-live="polite">${readinessLabel}</dd></div>
        <div><dt>Synchronisierung</dt><dd>${Number(profile.pending_sync_count || 0) ? `${Number(profile.pending_sync_count)} offen` : 'Aktuell'}</dd></div>
        <div><dt>Rückmeldung</dt><dd>${openFeedback ? 'Offen' : 'Aktuell'}</dd></div>
        <div class="wide"><dt>Wochenfokus</dt><dd>${focus ? BT.util.escapeHTML(focus.title) : 'Noch nicht freigegeben'}</dd></div>
        <div class="wide"><dt>KI-Status</dt><dd>${latestDraft ? BT.util.escapeHTML(draftLabel(latestDraft.status)) : 'Noch kein Entwurf'}</dd></div>
      </dl>
      <div class="individual-actions"><button class="btn" type="button" data-action="invite-player" ${profile.user_id ? 'disabled' : ''}>${profile.user_id ? 'Spielerkonto verbunden' : 'Einladung & QR-Code'}</button><a class="btn" href="#/individual/player/${encodeURIComponent(profile.id)}/preview">Spieleransicht ansehen</a><button class="btn primary" type="button" data-action="open-profile">Spieler öffnen</button></div>
    </article>`;
  }

  function secondsLabel(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function liveKey(sessionId) { return `${userKey(LIVE_PREFIX)}:${sessionId}`; }

  function freshLiveState(session, exercises) {
    return {
      sessionId: session.id,
      startedAt: null,
      index: 0,
      runningSince: null,
      elapsed: Object.fromEntries(exercises.map(item => [item.id, 0])),
      adjustments: Object.fromEntries(exercises.map(item => [item.id, 0])),
      ratings: {}, notes: {}, completed: {}, skipped: {}
    };
  }

  function renderCoachLive(target, profile, data, session, fallbackExercises = []) {
    const storedExercises = (data.exercises || [])
      .filter(item => item.session_id === session.id && item.individual_profile_id === profile.id)
      .sort((a, b) => Number(a.position) - Number(b.position));
    const exercises = storedExercises.length
      ? storedExercises.map(item => ({ ...item, database_id: item.id }))
      : fallbackExercises.map((item, index) => ({ ...item, id: `template-${index + 1}`, database_id: null }));
    if (!exercises.length) {
      notice(target.querySelector('.individual-view'), 'Für diese Einheit ist noch kein Übungsplan gespeichert.', true);
      return;
    }
    const key = liveKey(session.id);
    const stored = loadLocal(key, null);
    const state = stored?.sessionId === session.id ? { ...freshLiveState(session, exercises), ...stored } : freshLiveState(session, exercises);
    state.index = Math.max(0, Math.min(exercises.length - 1, Number(state.index) || 0));
    let timer = null;
    document.body.classList.add('individual-live-mode');

    const exercise = () => exercises[state.index];
    const finalizeRunning = () => {
      if (!state.runningSince) return;
      const item = exercise();
      state.elapsed[item.id] = Number(state.elapsed[item.id] || 0) + Math.max(0, Math.floor((Date.now() - state.runningSince) / 1000));
      state.runningSince = null;
    };
    const currentSeconds = () => Number(state.elapsed[exercise().id] || 0) + (state.runningSince ? Math.max(0, Math.floor((Date.now() - state.runningSince) / 1000)) : 0);
    const totalSeconds = () => {
      const base = Object.values(state.elapsed).reduce((sum, value) => sum + Number(value || 0), 0);
      return base + (state.runningSince ? Math.max(0, Math.floor((Date.now() - state.runningSince) / 1000)) : 0);
    };
    const persist = () => saveLocal(key, state);
    const stopTimer = () => { if (timer) clearInterval(timer); timer = null; };
    const tick = () => {
      target.querySelector('[data-live-block-clock]')?.replaceChildren(document.createTextNode(secondsLabel(currentSeconds())));
      target.querySelector('[data-live-total-clock]')?.replaceChildren(document.createTextNode(secondsLabel(totalSeconds())));
    };
    const runTimer = () => { stopTimer(); tick(); timer = setInterval(tick, 1000); };

    const draw = () => {
      const item = exercise();
      const next = exercises[state.index + 1];
      const quickMeasurements = measurementDefinitions(item);
      const planned = Math.max(1, Number(item.duration_minutes) || 1) * 60 + Number(state.adjustments[item.id] || 0);
      const repetitions = typeof item.repetitions === 'string' ? item.repetitions : JSON.stringify(item.repetitions || {});
      const measurement = typeof item.measurement_method === 'string' ? item.measurement_method : JSON.stringify(item.measurement_method || {});
      target.innerHTML = `<section class="individual-live-shell" aria-label="Geführte Individual-Training-Durchführung">
        <header class="individual-live-header">
          <button class="individual-live-back" type="button" data-live-exit>← Cockpit</button>
          <div><span>Einheit ${session.unit_number || '–'} · ${BT.util.escapeHTML(playerName(profile))}</span><strong>${fmt(session.scheduled_for)}</strong></div>
          <div class="individual-live-total"><small>Trainingszeit</small><strong data-live-total-clock>${secondsLabel(totalSeconds())}</strong></div>
        </header>
        <div class="individual-live-progress" aria-label="Trainingsfortschritt"><span style="width:${Math.round(((state.index + 1) / exercises.length) * 100)}%"></span></div>
        <main class="individual-live-main">
          <section class="individual-live-current">
            <div class="individual-live-kicker"><span>Aktueller Block · ${state.index + 1} von ${exercises.length}</span><span>${Math.round(planned / 60)} Min. geplant</span></div>
            <h1>${BT.util.escapeHTML(item.title)}</h1>
            <div class="individual-live-clock" data-live-block-clock>${secondsLabel(currentSeconds())}</div>
            <div class="individual-live-timer-actions">
              <button class="btn primary" type="button" data-live-toggle>${state.runningSince ? 'Pause' : currentSeconds() ? 'Fortsetzen' : 'Uhr starten'}</button>
              <button class="btn" type="button" data-live-adjust="-60">−1 Min.</button>
              <button class="btn" type="button" data-live-adjust="60">+1 Min.</button>
              <button class="btn" type="button" data-live-adjust="300">+5 Min.</button>
            </div>
            <div class="individual-live-instructions">
              <div><small>Wiederholungen</small><p>${BT.util.escapeHTML(repetitions)}</p></div>
              <div><small>Messmethode</small><p>${BT.util.escapeHTML(measurement)}</p></div>
            </div>
            <section class="individual-live-cues"><span class="section-kicker">Coaching-Points</span><ul>${(item.coaching_cues || []).map(cue => `<li>${BT.util.escapeHTML(cue)}</li>`).join('') || '<li>Technik sauber und kontrolliert ausführen.</li>'}</ul></section>
            <div class="individual-live-rating" role="group" aria-label="Schnellbewertung">
              ${['Funktioniert', 'Wiederholen', 'Problem'].map(value => `<button type="button" data-live-rating="${value}" class="${state.ratings[item.id] === value ? 'active' : ''}">${value}</button>`).join('')}
            </div>
            <label class="individual-live-note">Trainernotiz<textarea data-live-note maxlength="500" placeholder="Beobachtung zu diesem Block …">${BT.util.escapeHTML(state.notes[item.id] || '')}</textarea></label>
            <div class="individual-live-quick-actions"><button class="btn" type="button" data-live-quick-note>Schnellnotiz mit Zeit</button><button class="btn" type="button" data-live-tactics>Taktik öffnen</button></div>
            ${quickMeasurements.length ? `<form class="individual-live-measurement" data-live-measurement>
              <strong>Ergebnis direkt erfassen</strong>
              <select name="metric" aria-label="Beobachtung wählen">${quickMeasurements.map(definition => `<option value="${definition.key}" data-type="${definition.type}" data-unit="${BT.util.escapeHTML(definition.unit || '')}">${BT.util.escapeHTML(definition.label)}</option>`).join('')}</select>
              <input name="value" required placeholder="Ergebnis"><button class="btn" type="submit">Speichern</button>
            </form>` : ''}
            <p class="auth-status" data-role="individual-status" aria-live="polite"></p>
          </section>
          <aside class="individual-live-side">
            <section class="individual-live-next"><small>Als Nächstes</small>${next ? `<strong>${BT.util.escapeHTML(next.title)}</strong><span>${next.duration_minutes} Minuten</span>` : '<strong>Abschluss</strong><span>Einheit auswerten und speichern</span>'}</section>
            <section class="individual-live-attendance"><small>Teilnahme</small><strong>${BT.util.escapeHTML(playerName(profile))}</strong><span>${attendanceLabel(session.attendance_status)}</span><div><button class="btn" type="button" data-live-attendance="attended">Anwesend</button><button class="btn" type="button" data-live-attendance="unexcused_no_show">No-Show</button></div></section>
            <section class="individual-live-outline"><small>Ablauf</small>${exercises.map((entry, index) => `<button type="button" data-live-jump="${index}" class="${index === state.index ? 'active' : ''} ${state.skipped[entry.id] ? 'skipped' : ''} ${state.completed[entry.id] ? 'done' : ''}"><span>${index + 1}</span><b>${BT.util.escapeHTML(entry.title)}</b><em>${entry.duration_minutes} Min.</em></button>`).join('')}</section>
          </aside>
        </main>
        <footer class="individual-live-footer">
          <button class="btn" type="button" data-live-prev ${state.index === 0 ? 'disabled' : ''}>← Vorheriger Drill</button>
          <button class="btn" type="button" data-live-skip>Überspringen</button>
          <button class="btn primary" type="button" data-live-next>${next ? 'Block beenden · Nächster Drill' : 'Block beenden'}</button>
          <button class="btn danger" type="button" data-live-finish>Training beenden &amp; speichern</button>
        </footer>
        <div class="individual-tactics-sheet" data-live-tactics-sheet hidden><div><button type="button" data-live-tactics-close>×</button><span class="section-kicker">Schnellzugriff</span><h2>Taktik</h2><p>Öffne das CourtHub-Taktikboard direkt aus der Durchführung. Dein aktueller Ablauf bleibt gespeichert.</p><a class="btn primary" href="#/tactics">Taktikboard öffnen</a></div></div>
      </section>`;

      target.querySelector('[data-live-exit]').onclick = () => { finalizeRunning(); persist(); stopTimer(); document.body.classList.remove('individual-live-mode'); renderCoach(target, data); };
      target.querySelector('[data-live-toggle]').onclick = event => {
        if (state.runningSince) { finalizeRunning(); stopTimer(); event.currentTarget.textContent = 'Fortsetzen'; }
        else { state.startedAt ||= new Date().toISOString(); state.runningSince = Date.now(); event.currentTarget.textContent = 'Pause'; runTimer(); }
        persist(); tick();
      };
      target.querySelectorAll('[data-live-adjust]').forEach(button => button.onclick = () => {
        state.adjustments[item.id] = Math.max(-Math.max(0, Number(item.duration_minutes) - 1) * 60, Number(state.adjustments[item.id] || 0) + Number(button.dataset.liveAdjust));
        persist(); draw();
      });
      target.querySelectorAll('[data-live-rating]').forEach(button => button.onclick = () => { state.ratings[item.id] = button.dataset.liveRating; persist(); draw(); });
      target.querySelector('[data-live-note]').oninput = event => { state.notes[item.id] = event.target.value; persist(); };
      target.querySelector('[data-live-quick-note]').onclick = () => { state.notes[item.id] = `${state.notes[item.id] || ''}${state.notes[item.id] ? '\n' : ''}[${secondsLabel(totalSeconds())}] `; persist(); draw(); target.querySelector('[data-live-note]')?.focus(); };
      const move = (index, status) => { finalizeRunning(); stopTimer(); if (status) state[status][item.id] = true; state.index = Math.max(0, Math.min(exercises.length - 1, index)); persist(); draw(); };
      target.querySelector('[data-live-prev]').onclick = () => move(state.index - 1);
      target.querySelector('[data-live-skip]').onclick = () => move(Math.min(exercises.length - 1, state.index + 1), 'skipped');
      target.querySelector('[data-live-next]').onclick = () => move(Math.min(exercises.length - 1, state.index + 1), 'completed');
      target.querySelectorAll('[data-live-jump]').forEach(button => button.onclick = () => move(Number(button.dataset.liveJump)));
      target.querySelector('[data-live-tactics]').onclick = () => { target.querySelector('[data-live-tactics-sheet]').hidden = false; };
      target.querySelector('[data-live-tactics-close]').onclick = () => { target.querySelector('[data-live-tactics-sheet]').hidden = true; };
      target.querySelectorAll('[data-live-attendance]').forEach(button => button.onclick = async () => {
        try { await BT.api.individualAction('setAttendance', { profileId: profile.id, sessionId: session.id, status: button.dataset.liveAttendance }); notice(target, 'Teilnahme gespeichert.'); }
        catch (error) { notice(target, error.message, true); }
      });
      const liveMeasurementForm = target.querySelector('[data-live-measurement]');
      if (liveMeasurementForm) liveMeasurementForm.onsubmit = async event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        const selected = event.currentTarget.elements.metric.selectedOptions[0];
        const numeric = selected.dataset.type === 'number';
        try { await BT.api.individualAction('saveMeasurement', { profileId: profile.id, sessionId: session.id, exerciseId: item.database_id, metricKey: form.get('metric'), numericValue: numeric ? Number(form.get('value')) : null, textValue: numeric ? null : form.get('value'), unit: selected.dataset.unit || null }); event.currentTarget.reset(); notice(target, 'Ergebnis gespeichert.'); }
        catch (error) { notice(target, error.message, true); }
      };
      target.querySelector('[data-live-finish]').onclick = async () => {
        finalizeRunning(); stopTimer(); persist();
        const finishButton = target.querySelector('[data-live-finish]'); finishButton.disabled = true; notice(target, 'Tatsächlichen Ablauf wird gespeichert …');
        try {
          const writes = exercises.flatMap(entry => {
            const values = [BT.api.individualAction('saveMeasurement', { profileId: profile.id, sessionId: session.id, exerciseId: entry.database_id, metricKey: 'tatsaechliche_dauer', numericValue: Number(state.elapsed[entry.id] || 0), unit: 'Sekunden' })];
            if (state.ratings[entry.id]) values.push(BT.api.individualAction('saveMeasurement', { profileId: profile.id, sessionId: session.id, exerciseId: entry.database_id, metricKey: 'schnellbewertung', textValue: state.ratings[entry.id] }));
            if ((state.notes[entry.id] || '').trim()) values.push(BT.api.individualAction('saveMeasurement', { profileId: profile.id, sessionId: session.id, exerciseId: entry.database_id, metricKey: 'trainernotiz', textValue: state.notes[entry.id].trim() }));
            return values;
          });
          await Promise.all(writes);
          const result = await BT.api.individualAction('completeSession', { profileId: profile.id, sessionId: session.id });
          await Promise.allSettled((result.queuedDrafts || []).map(draft => BT.api.individualAIDraft('generate', { profileId: draft.individual_profile_id, sessionId: draft.session_id })));
          localStorage.removeItem(key); document.body.classList.remove('individual-live-mode'); await render(target);
        } catch (error) { finishButton.disabled = false; notice(target, error.message, true); }
      };
      tick();
      if (state.runningSince) runTimer();
    };
    draw();
  }

  function measurementDefinitions(exercise) {
    const title = String(exercise?.title || '').toLocaleLowerCase('de-DE');
    const number = (key, label, unit = '', max = null, attempts = 0) => ({ key, label, type: 'number', unit, max, attempts });
    const choice = (key, label, choices) => ({ key, label, type: 'choice', choices });
    const text = (key, label, placeholder = 'Kurz und verständlich eintragen') => ({ key, label, type: 'text', placeholder });
    if (title.includes('dynamische aktivierung')) return [];
    if (title.includes('check-in') || title.includes('readiness')) return [number('readiness', 'Tagesform', 'von 10', 10)];
    if (title.includes('ballkontrolle')) return [
      number('zeit', 'Zeit', 'Sekunden', null, 2),
      number('ballverluste', 'Ballverluste', 'Anzahl', null, 2),
      number('ausgelassene_huetchen', 'Ausgelassene Hütchen', 'Anzahl', 5, 2),
      choice('blick_oben', 'Blick oben', ['Ja', 'Teilweise', 'Nein']),
      choice('schwache_hand', 'Schwache Hand', ['Sicher', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('korbabschluss')) return [
      number('treffer_rechts', 'Treffer rechts', 'von 10', 10),
      number('treffer_links', 'Treffer links', 'von 10', 10),
      number('korrekte_abschlusshand', 'Richtige Abschlusshand', 'von 20', 20),
      number('korrekte_schrittfolge', 'Korrekte Schrittfolge', 'von 20', 20),
      number('ballverlust_vor_abschluss', 'Ballverlust vor Abschluss', 'Anzahl', 20),
      choice('technik', 'Technik insgesamt', ['Stabil', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('wurf')) return [
      number('treffer_baseline_links', 'Treffer Baseline links', 'von 5', 5),
      number('treffer_fluegel_links', 'Treffer Flügel links', 'von 5', 5),
      number('treffer_frontal', 'Treffer frontal', 'von 5', 5),
      number('treffer_fluegel_rechts', 'Treffer Flügel rechts', 'von 5', 5),
      number('treffer_baseline_rechts', 'Treffer Baseline rechts', 'von 5', 5),
      choice('fehlwurfrichtung', 'Häufigste Fehlwurfrichtung', ['Zu kurz', 'Zu lang', 'Links', 'Rechts', 'Unterschiedlich']),
      choice('balance', 'Balance', ['Stabil', 'Wechselhaft', 'Unsicher']),
      choice('wurflinie', 'Wurflinie', ['Stabil', 'Wechselhaft', 'Unsicher']),
      choice('follow_through', 'Follow-through', ['Stabil', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('technikkorrektur')) return [text('coach_beobachtung', 'Was wurde korrigiert?')];
    if (title.includes('wahrnehmung') || title.includes('entscheidung')) return [
      number('entscheidung_richtig', 'Richtige Entscheidungen', 'von 18', 18),
      number('entscheidung_verspaetet', 'Verspätete Entscheidungen', 'Anzahl', 18),
      number('entscheidung_falsch', 'Falsche Entscheidungen', 'Anzahl', 18),
      number('ballverluste', 'Ballverluste', 'Anzahl', 18),
      number('treffer', 'Treffer', 'Anzahl', 18)
    ];
    if (title.includes('eins-gegen-eins')) return [
      number('vorteil_erzeugt', 'Vorteil erzeugt', 'von 8', 8),
      number('abschluss_erreicht', 'Abschluss erreicht', 'von 8', 8),
      number('treffer', 'Treffer', 'von 8', 8),
      number('ballverluste', 'Ballverluste', 'Anzahl', 8),
      choice('genutzte_seite', 'Bevorzugte Seite', ['Links', 'Rechts', 'Ausgeglichen']),
      choice('coach_bewertung', 'Entscheidungen insgesamt', ['Gut', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('kontrollmessung')) return [
      choice('kontrollbereich', 'Wiederholter Bereich', ['Ballkontrolle', 'Korbabschluss', 'Wurf']),
      text('kontrollwert', 'Ergebnis nach dem Coaching', 'Zum Beispiel: 7 Treffer aus 10 oder 13,4 Sekunden')
    ];
    if (title.includes('reflexion')) return [
      text('funktionierte_am_besten', 'Was funktionierte am besten?'),
      text('am_schwierigsten', 'Was war am schwierigsten?'),
      text('hinweis_naechstes_training', 'Welcher Hinweis gilt fürs nächste Training?')
    ];
    if (title.includes('vollständigkeitsprüfung')) return [
      choice('vollstaendig', 'Alle Tests vollständig?', ['Ja', 'Nein']),
      choice('vergleichbar', 'Bedingungen vergleichbar?', ['Ja', 'Nein']),
      text('abweichung', 'Abweichung oder äußerer Fehler', 'Nur ausfüllen, wenn etwas die Messung beeinflusst hat')
    ];
    if (title.includes('auswertung') || title.includes('entwicklungsblock')) return [text('coach_beobachtung', 'Coach-Beobachtung')];
    return [text('beobachtung', 'Beobachtung')];
  }

  function measurementInput(definition) {
    if (definition.type === 'choice') {
      return `<select name="value" required><option value="">Bitte wählen</option>${definition.choices.map(value => `<option value="${BT.util.escapeHTML(value)}">${BT.util.escapeHTML(value)}</option>`).join('')}</select>`;
    }
    if (definition.type === 'text') return `<textarea name="value" required maxlength="500" placeholder="${BT.util.escapeHTML(definition.placeholder || '')}"></textarea>`;
    return `<input name="value" type="number" inputmode="decimal" min="0" ${definition.max === null ? '' : `max="${definition.max}"`} step="0.01" required>`;
  }

  function renderMeasurementPane(activeSession, exercises, measurements) {
    const trackable = exercises.map(exercise => ({ exercise, definitions: measurementDefinitions(exercise) })).filter(item => item.definitions.length);
    const forms = trackable.map(({ exercise, definitions }) => {
      const saved = measurements.filter(item => exercise.id && item.exercise_id === exercise.id).length;
      return `<details class="card individual-measurement-exercise">
        <summary><span><small>Übung ${exercise.position}</small><strong>${BT.util.escapeHTML(exercise.title)}</strong></span><b>${saved ? `${saved} gespeichert` : 'Öffnen'}</b></summary>
        <div class="individual-measurement-grid">${definitions.map(definition => `<form data-guided-measurement data-exercise-id="${exercise.id || ''}" data-metric-key="${definition.key}" data-value-type="${definition.type}" data-unit="${BT.util.escapeHTML(definition.unit || '')}">
          <label><span>${BT.util.escapeHTML(definition.label)}${definition.unit ? ` <small>${BT.util.escapeHTML(definition.unit)}</small>` : ''}</span>${measurementInput(definition)}</label>
          ${definition.attempts ? `<label><span>Durchgang</span><select name="attempt" required>${Array.from({ length: definition.attempts }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('')}</select></label>` : ''}
          <button class="btn primary" type="submit">${BT.util.escapeHTML(definition.label)} speichern</button>
        </form>`).join('')}</div>
      </details>`;
    }).join('');
    const exerciseNames = new Map(exercises.filter(item => item.id).map(item => [item.id, item.title]));
    const labels = new Map(exercises.flatMap(exercise => measurementDefinitions(exercise).map(definition => [definition.key, definition.label])));
    const history = measurements.length ? measurements.slice().reverse().map(item => {
      const value = item.numeric_value !== null && item.numeric_value !== undefined ? Number(item.numeric_value) : item.text_value;
      return `<li><span><strong>${BT.util.escapeHTML(labels.get(item.metric_key) || String(item.metric_key).replaceAll('_', ' '))}</strong><small>${BT.util.escapeHTML(exerciseNames.get(item.exercise_id) || 'Einheit 1')}${item.attempt ? ` · Durchgang ${item.attempt}` : ''}</small></span><b>${BT.util.escapeHTML(value)}${item.unit ? ` ${BT.util.escapeHTML(item.unit)}` : ''}</b></li>`;
    }).join('') : '<li class="muted">Noch keine Ergebnisse gespeichert.</li>';
    return `<section class="individual-measurement-intro"><p>Wähle die Übung und trage nur das beobachtete Ergebnis ein. CourtHub ordnet es automatisch richtig zu.</p></section>
      <div class="individual-measurement-exercises">${forms || '<section class="card"><p class="muted">Für diese Einheit sind keine Messungen vorgesehen.</p></section>'}</div>
      <section class="card individual-measurement-history"><h4>Gespeicherte Ergebnisse</h4><ul>${history}</ul></section>`;
  }

  function renderCoachDetail(root, profile, data, pane = 'overview') {
    const host = root.querySelector('[data-role="individual-detail"]');
    const sessions = (data.sessions || []).filter(item => item.individual_profile_id === profile.id);
    const activeSession = [...sessions].reverse().find(item => ['planned', 'in_progress'].includes(item.status)) || sessions.at(-1) || null;
    const plan = (data.plans || []).find(item => item.session_id === activeSession?.id && item.individual_profile_id === profile.id);
    const exercises = (data.exercises || []).filter(item => item.session_id === activeSession?.id && item.individual_profile_id === profile.id);
    const roadmapUnit = (data.pilotRoadmap || []).find(item => Number(item.unitNumber) === Number(activeSession?.unit_number));
    const fallbackTemplate = roadmapUnit?.template || null;
    const displayPlan = plan || fallbackTemplate;
    const displayExercises = exercises.length ? exercises : (fallbackTemplate?.exercises || []).map((exercise, index) => ({
      id: null,
      position: index + 1,
      title: exercise.title,
      duration_minutes: exercise.durationMinutes,
      repetitions: exercise.repetitions,
      measurement_method: exercise.measurementMethod,
      coaching_cues: exercise.coachingCues
    }));
    const measurements = (data.measurements || []).filter(item => item.individual_profile_id === profile.id && item.session_id === activeSession?.id);
    const notes = (data.coachNotes || []).filter(item => item.individual_profile_id === profile.id);
    const feedback = (data.releasedFeedback || []).filter(item => item.individual_profile_id === profile.id);
    const playerFeedback = (data.feedback || []).filter(item => item.individual_profile_id === profile.id);
    const occurrenceLabels = { often: 'Oft angewendet', sometimes: 'Manchmal angewendet', none: 'Keine Gelegenheit', training_cancelled: 'Training ausgefallen', not_participated: 'Nicht teilgenommen' };
    const incomingFeedback = `<section class="card"><h4>Rückmeldungen vom Spieler</h4>${playerFeedback.length ? playerFeedback.map(item => `<article><p><strong>${BT.util.escapeHTML(String(item.training_date || '').slice(0, 10))}</strong> · ${BT.util.escapeHTML(occurrenceLabels[item.occurrence] || 'Rückmeldung')}${item.implementation_score != null ? ` · Umsetzung ${Number(item.implementation_score)}/5` : ''}</p>${item.note ? `<p>${BT.util.escapeHTML(item.note)}</p>` : '<p class="muted">Keine zusätzliche Notiz.</p>'}</article>`).join('') : '<p class="muted">Noch keine Rückmeldung eingegangen. Sobald der Spieler seine Rückmeldung speichert, erscheint sie hier.</p>'}</section>`;
    const drafts = (data.aiDrafts || []).filter(item => item.individual_profile_id === profile.id);
    const latestDraft = drafts[0] || null;
    const paneLabels = {
      overview: 'Übersicht',
      training: 'Training durchführen',
      measurements: 'Messwerte',
      focus: 'Wochenfokus',
      feedback: 'Notizen & Feedback',
      'ai-history': 'KI & Verlauf'
    };
    if (!paneLabels[pane]) pane = 'overview';
    const emptySession = '<section class="card"><h4>Keine aktive Einheit</h4><p class="muted">Plane zuerst in der Übersicht die nächste Montagseinheit.</p><a class="btn primary" href="#/individual/player/' + encodeURIComponent(profile.id) + '/overview">Zur Übersicht</a></section>';
    const overview = `${renderPilotRoadmap(data, sessions)}
      <div class="individual-detail-grid">
        ${activeSession && ['planned', 'in_progress'].includes(activeSession.status) ? `<section class="card"><h4>Nächste Montagseinheit</h4><p><strong>Einheit ${activeSession.unit_number} ist angelegt.</strong></p><p>${fmt(activeSession.scheduled_for)} · 105 Minuten</p><a class="btn primary" href="#/individual/player/${encodeURIComponent(profile.id)}/training">Einheit öffnen</a></section>` : `<form class="card" data-plan-session><h4>Nächste Montagseinheit planen</h4><label>Datum<input name="scheduledDate" type="date" value="${nextPilotDate(data.sessions)}" readonly required></label><label>Startzeit<input name="scheduledTime" type="time" value="20:15" readonly required></label><label>Zweiter Teilnehmer, optional<select name="secondProfileId"><option value="">Einzeltraining</option>${(data.profiles || []).filter(item => item.id !== profile.id).map(item => `<option value="${item.id}">${BT.util.escapeHTML(playerName(item))}</option>`).join('')}</select></label><button class="btn primary" type="submit">105-Minuten-Einheit anlegen</button></form>`}
      </div>`;
    const training = activeSession ? `<section class="card individual-session-run-card"><div class="section-head"><div><span class="section-kicker">Durchführung</span><h4>Einheit ${activeSession.unit_number || '–'} · ${fmt(activeSession.scheduled_for)}</h4></div><span>${BT.util.escapeHTML(activeSession.status)}</span></div>
        <button class="btn primary individual-start-live" type="button" data-action="start-live-training" ${displayExercises.length ? '' : 'disabled'}>▶ Training durchführen</button>
        <div class="individual-actions"><button class="btn" data-set-attendance="attended">Als anwesend bestätigen</button><button class="btn" data-set-attendance="unexcused_no_show">Unentschuldigt gefehlt</button><button class="btn danger" data-cancel-session>Einheit absagen</button></div>
        ${displayPlan ? `<h4>${BT.util.escapeHTML(displayPlan.title)}</h4><p>${BT.util.escapeHTML(displayPlan.objective || '')}</p><ol class="individual-exercise-list">${displayExercises.map(exercise => `<li><strong>${exercise.position}. ${BT.util.escapeHTML(exercise.title)} · ${exercise.duration_minutes} Min.</strong><details><summary>Wiederholungen, Messung und Coaching</summary><p><b>Wiederholungen:</b> ${BT.util.escapeHTML(JSON.stringify(exercise.repetitions))}</p><p><b>Messung:</b> ${BT.util.escapeHTML(JSON.stringify(exercise.measurement_method))}</p><p><b>Coaching:</b> ${BT.util.escapeHTML((exercise.coaching_cues || []).join(' · '))}</p></details></li>`).join('')}</ol>` : '<p class="muted">Für diese Einheit ist noch kein Plan gespeichert.</p>'}
        <div class="individual-actions"><button class="btn primary" data-complete-session>Einheit abschließen und KI-Entwurf starten</button></div>
      </section>` : emptySession;
    const measurementPane = activeSession ? `<section class="card"><div class="section-head"><div><span class="section-kicker">Einheit ${activeSession.unit_number || '–'}</span><h4>Ergebnisse erfassen</h4></div><strong>${measurements.length} gespeichert</strong></div></section>${renderMeasurementPane(activeSession, displayExercises, measurements)}` : emptySession;
    const focusPane = activeSession ? `<form class="card individual-feedback-form" data-weekly-focus><h4>Persönlichen Wochenfokus freigeben</h4><label>Zielhandlung<input name="title" required maxlength="120"></label><label>Hinweis 1<input name="cueOne" required maxlength="240"></label><label>Hinweis 2, optional<input name="cueTwo" maxlength="240"></label><label>Gelungen, wenn …<input name="successIndicator" required maxlength="300"></label><label>Gültig ab<input name="validFrom" type="date" value="${datePlus(localBerlinDate(activeSession.scheduled_for), 1)}" readonly required></label><label>Gültig bis<input name="validUntil" type="date" value="${datePlus(localBerlinDate(activeSession.scheduled_for), 6)}" readonly required></label><button class="btn primary" type="submit">Wochenfokus veröffentlichen</button></form>` : emptySession;
    const feedbackPane = `${incomingFeedback}<div class="individual-detail-grid">
        <form class="card" data-coach-note><h4>Private Trainernotiz</h4><p>Nur für das Trainerteam. Diese Notiz wird nicht an den Spieler weitergegeben.</p><label>Deine Notiz<textarea name="note" maxlength="5000" required></textarea></label><button class="btn" type="submit">Privat speichern</button></form>
        <form class="card" data-release-feedback><h4>Notiz für den Spieler</h4><label>Text für den Spieler<textarea name="content" maxlength="5000" required></textarea></label><label class="individual-note-consent"><input type="checkbox" name="shareWithPlayer" required><span>Diese Notiz für den Spieler freigeben</span></label><p class="muted">Nur bewusst gekennzeichnete Notizen erscheinen beim Spieler.</p><button class="btn primary" type="submit">Für Spieler freigeben</button></form>
      </div>
      <section class="card private-coach-card"><h4>Private Notizen</h4>${notes.length ? notes.map(item => `<p>${BT.util.escapeHTML(item.note)} <small>${fmt(item.created_at)}</small></p>`).join('') : '<p class="muted">Keine privaten Notizen.</p>'}</section>
      <section class="card"><h4>Für den Spieler freigegeben</h4>${feedback.length ? feedback.map(item => `<p>${BT.util.escapeHTML(item.content)}</p>`).join('') : '<p class="muted">Noch nichts freigegeben.</p>'}</section>`;
    const aiHistoryPane = `<section class="card private-coach-card"><h4>Privater KI-Entwurf</h4>${latestDraft ? `<p>Status: <strong>${BT.util.escapeHTML(latestDraft.status)}</strong></p>${latestDraft.content ? `<h5>${BT.util.escapeHTML(latestDraft.content.nextSession?.title || '')}</h5><p>${BT.util.escapeHTML(latestDraft.content.analysis || '')}</p><p><b>Wochenfokus:</b> ${BT.util.escapeHTML(latestDraft.content.weeklyFocus?.title || '')}</p>` : ''}<div class="individual-actions">${['queued', 'failed'].includes(latestDraft.status) ? '<button class="btn" data-generate-draft>Entwurf erzeugen</button>' : ''}${latestDraft.status === 'stale' ? '<button class="btn" data-regenerate-draft>Aktuell neu erzeugen</button>' : ''}${latestDraft.status === 'current' ? '<button class="btn primary" data-approve-draft>Prüfung bestätigen und veröffentlichen</button>' : ''}</div>` : '<p class="muted">Nach Abschluss und Synchronisierung wird pro Spieler ein Entwurf angelegt.</p>'}</section>
      <section class="card"><h4>Einheiten</h4>${sessions.length ? `<ul>${sessions.map(item => `<li>${fmt(item.scheduled_for)} · ${BT.util.escapeHTML(item.status)} · Einheit ${item.unit_number || '–'} · ${BT.util.escapeHTML(item.attendance_status)}</li>`).join('')}</ul>` : '<p class="muted">Noch keine Einheit angelegt.</p>'}</section>`;
    const paneContent = { overview, training, measurements: measurementPane, focus: focusPane, feedback: feedbackPane, 'ai-history': aiHistoryPane }[pane];
    host.hidden = false;
    host.innerHTML = `<div class="section-head individual-player-title"><div><span class="section-kicker">Coach-Ansicht</span><h3>${BT.util.escapeHTML(playerName(profile))}</h3></div><span class="individual-current-pane">${paneLabels[pane]}</span></div><p><a class="btn" href="#/individual/player/${encodeURIComponent(profile.id)}/preview">Spieleransicht ansehen</a></p>${paneContent}`;
    const refresh = () => render(root.parentElement, profile.id, pane);
    host.querySelector('[data-plan-session]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const secondProfileId = form.get('secondProfileId');
      try { await BT.api.individualAction('createSession', { profileIds: [profile.id, secondProfileId].filter(Boolean), scheduledDate: form.get('scheduledDate'), scheduledTime: form.get('scheduledTime'), durationMinutes: 105 }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-coach-note]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('addCoachNote', { profileId: profile.id, note: form.get('note') }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-release-feedback]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      if (form.get('shareWithPlayer') !== 'on') { notice(root, 'Bitte die Notiz ausdrücklich für den Spieler freigeben.', true); return; }
      try { await BT.api.individualAction('saveReleasedFeedback', { profileId: profile.id, content: form.get('content'), shareWithPlayer: true }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelectorAll('[data-set-attendance]').forEach(button => button.addEventListener('click', async () => {
      try { await BT.api.individualAction('setAttendance', { profileId: profile.id, sessionId: activeSession.id, status: button.dataset.setAttendance }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    }));
    host.querySelector('[data-action="start-live-training"]')?.addEventListener('click', () => renderCoachLive(root.parentElement, profile, data, activeSession, displayExercises));
    host.querySelector('[data-cancel-session]')?.addEventListener('click', async () => {
      try { await BT.api.individualAction('cancelSession', { profileId: profile.id, sessionId: activeSession.id }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelectorAll('[data-guided-measurement]').forEach(formElement => formElement.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const numeric = event.currentTarget.dataset.valueType === 'number';
      try { await BT.api.individualAction('saveMeasurement', { profileId: profile.id, sessionId: activeSession.id, exerciseId: event.currentTarget.dataset.exerciseId || null, metricKey: event.currentTarget.dataset.metricKey, numericValue: numeric ? Number(form.get('value')) : null, textValue: numeric ? null : form.get('value'), unit: event.currentTarget.dataset.unit || null, attempt: form.get('attempt') ? Number(form.get('attempt')) : null }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    }));
    host.querySelector('[data-complete-session]')?.addEventListener('click', async () => {
      try {
        const result = await BT.api.individualAction('completeSession', { profileId: profile.id, sessionId: activeSession.id });
        await Promise.allSettled((result.queuedDrafts || []).map(draft => BT.api.individualAIDraft('generate', { profileId: draft.individual_profile_id, sessionId: draft.session_id })));
        await refresh();
      } catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-weekly-focus]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('setFocus', { profileId: profile.id, sessionId: activeSession.id, title: form.get('title'), cueOne: form.get('cueOne'), cueTwo: form.get('cueTwo'), successIndicator: form.get('successIndicator'), validFrom: form.get('validFrom'), validUntil: form.get('validUntil') }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-generate-draft]')?.addEventListener('click', async () => {
      try { await BT.api.individualAIDraft('generate', { profileId: profile.id, sessionId: latestDraft.session_id }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-regenerate-draft]')?.addEventListener('click', async () => {
      try { await BT.api.individualAIDraft('regenerate', { profileId: profile.id, sessionId: latestDraft.session_id }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-approve-draft]')?.addEventListener('click', async () => {
      try { await BT.api.individualAIDraft('approve', { draftId: latestDraft.id }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
  }

  function renderCoachDetailPage(target, profile, data, pane = 'overview') {
    target.innerHTML = `<section class="view individual-view individual-coach-detail-page">
      <div class="individual-cockpit-nav"><a class="btn small" href="#/individual">← Coach-Cockpit</a><span>Individual Training</span></div>
      <p class="auth-status" data-role="individual-status" aria-live="polite"></p>
      <section data-role="individual-detail"></section>
    </section>`;
    renderCoachDetail(target.querySelector('.individual-view'), profile, data, pane);
  }

  function startCoachRefresh(root) {
    stopCoachRefresh();
    if (typeof BT.api.getIndividualResponses !== 'function') return;
    const owner=contextKey(),controller=new AbortController(),status=root.querySelector('[data-coach-auto-refresh]');
    let stopped=false,timer=null,inFlight=false,failures=0,lastStarted=-Infinity;
    const valid=()=>!stopped && root.isConnected && owner===contextKey() && ['admin','coach'].includes(user()?.role) && location.hash==='#/individual';
    const available=()=>valid() && !document.hidden && navigator.onLine;
    const message=text=>{if(status && status.textContent!==text)status.textContent=text;};
    const cancel=()=>{if(timer!==null)window.clearTimeout(timer);timer=null;};
    const stop=()=>{stopped=true;cancel();controller.abort();};
    const schedule=()=>{cancel();if(available())timer=window.setTimeout(refresh,Math.min(120000,20000*2**Math.min(failures,3)));};
    async function refresh() {
      cancel();
      if(!valid()){stop();return;}
      if(!available())return;
      if(inFlight)return;
      if(Date.now()-lastStarted<1000){schedule();return;}
      inFlight=true;lastStarted=Date.now();
      try {
        const result=await BT.api.getIndividualResponses();
        if(!valid())return;
        if(!Array.isArray(result.responses))throw new Error('Ungültiger Rückmeldungsstand.');
        const byProfile=new Map(result.responses.map(row=>[row.profile_id,row]));
        for(const card of root.querySelectorAll('[data-profile-id]')) {
          const row=byProfile.get(card.dataset.profileId);
          if(!row){card.remove();continue;}
          const score=Number(row.score);
          const values=[['[data-coach-next-session]',row.session_id ? `${fmt(row.scheduled_for)} · Einheit ${row.unit_number || '–'}` : 'Nicht geplant'],
            ['[data-coach-attendance]',row.session_id ? attendanceLabel(row.attendance_status) : '—'],
            ['[data-coach-readiness]',row.session_id ? row.score!==null && row.score!==undefined && Number.isInteger(score) && score>=1 && score<=10 ? `${score}/10` : 'Noch nicht gemeldet' : '—']];
          for(const [selector,value] of values){const field=card.querySelector(selector);if(field && field.textContent!==value)field.textContent=value;}
        }
        failures=0;message('Automatische Aktualisierung aktiv · alle 20 Sekunden.');
      }catch(error){
        if(!valid())return;
        failures++;
        message('Letzte Werte bleiben sichtbar. Verbindung gestört – Aktualisierung wird erneut versucht.');
        if(error.status===401 || error.status===403){message('Automatische Aktualisierung angehalten. Bitte erneut anmelden.');stop();}
      }finally{inFlight=false;schedule();}
    }
    function resume() {
      cancel();
      if(!valid()){stop();return;}
      if(!navigator.onLine){message('Offline – letzte Werte bleiben sichtbar.');return;}
      if(document.hidden)return;
      refresh();
    }
    for(const event of ['focus','online','offline','bt-sync-change'])window.addEventListener(event,resume,{signal:controller.signal});
    window.addEventListener('hashchange',stop,{signal:controller.signal});
    document.addEventListener('visibilitychange',resume,{signal:controller.signal});
    stopCoachRefresh=stop;
    message(navigator.onLine ? 'Automatische Aktualisierung aktiv · alle 20 Sekunden.' : 'Offline – letzte Werte bleiben sichtbar.');
    schedule();
  }

  function renderCoach(target, data) {
    const existing = new Set((data.profiles || []).map(profile => profile.player_profile_id));
    const available = (BT.storage?.getPlayers?.() || []).filter(player => !player.archived && !existing.has(player.id));
    target.innerHTML = `<section class="view individual-view individual-coach-cockpit">
      <div class="individual-cockpit-nav"><a class="btn small" href="#/dashboard">← Startzentrale</a><span>Coach-Cockpit</span></div>
      <div class="section-head individual-cockpit-head"><div><span class="section-kicker">Getrennter Arbeitsbereich</span><h2>Individual Training</h2><p class="muted">Beide Pilotspieler und alle offenen Aufgaben auf einen Blick.</p></div><span class="individual-unit-chip">Pilot 2026 · 8 Einheiten</span></div>
      <p class="auth-status" data-role="individual-status" aria-live="polite"></p>
      <p class="muted" data-coach-auto-refresh role="status"></p>
      <div class="individual-profile-grid">${(data.profiles || []).length ? data.profiles.map(profile => profileCard(profile, data)).join('') : '<div class="empty">Noch kein Individualprofil angelegt.</div>'}</div>
      <section class="card" data-role="individual-invite" hidden></section>
      <section data-role="individual-detail" hidden></section>
      <details class="card individual-setup"><summary>Pilot verwalten</summary><form data-create-profile><label>Pilotspieler hinzufügen<select name="playerProfileId" required><option value="">Spieler wählen</option>${available.map(player => `<option value="${player.id}">${BT.util.escapeHTML(player.name)}</option>`).join('')}</select></label><label>Pilotstart<input type="date" name="pilotStartedOn" value="2026-10-19"></label><button class="btn primary" type="submit" ${available.length ? '' : 'disabled'}>Profil anlegen</button></form><p>Maximal drei aktive Spieler je Coach; eine Einheit hat höchstens zwei Teilnehmer.</p></details>
    </section>`;
    const root = target.querySelector('.individual-view');
    startCoachRefresh(root);
    root.querySelector('[data-create-profile]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('createProfile', { playerProfileId: form.get('playerProfileId'), pilotStartedOn: form.get('pilotStartedOn') }); await render(target); }
      catch (error) { notice(root, error.message, true); }
    });
    root.addEventListener('click', async event => {
      const actionButton = event.target.closest('[data-action]');
      const card = actionButton?.closest('[data-profile-id]');
      if (!actionButton || !card) return;
      const profile = data.profiles.find(item => item.id === card.dataset.profileId);
      if (!profile) return;
      if (actionButton.dataset.action === 'open-profile') {
        location.hash = `#/individual/player/${encodeURIComponent(profile.id)}`;
        return;
      }
      if (actionButton.dataset.action === 'invite-player') {
        if (actionButton.disabled) return;
        actionButton.disabled = true;
        try {
          const result = await BT.api.individualAction('createInvite', { profileId: profile.id, expiresInHours: 72 });
          if (!root.isConnected) return;
          const url = result.inviteUrl;
          const inviteHost = root.querySelector('[data-role="individual-invite"]');
          inviteHost.hidden = false;
          inviteHost.innerHTML = `<h3>Einladung für ${BT.util.escapeHTML(playerName(profile))}</h3><img class="individual-invite-qr" src="${BT.util.escapeHTML(result.qrDataUrl)}" width="320" height="320" alt="QR-Code für die einmalige CourtHub-Einladung"><p>Gültig bis <strong>${BT.util.escapeHTML(fmt(result.invite.expires_at, {timeZone:'Europe/Berlin'}))}</strong> (72 Stunden ab Erstellung).</p><p>Ein persönlicher Code für genau ein Spielerkonto. Bitte teile den Link ausschließlich mit diesem Spieler.</p><p>Freigeschaltet wird nur das eigene Individualtraining. Mannschaftstrainings bleiben gesperrt.</p><div class="individual-actions"><button class="btn primary" data-share-invite>Link teilen</button><button class="btn" data-copy-invite>Link kopieren</button><a class="btn" href="${BT.util.escapeHTML(url)}">Einladung öffnen</a></div><p data-invite-status role="status"></p><small>Einmal verwendbar. Ein neuer Link macht die vorherige Einladung ungültig. Nach der Registrierung meldet sich der Spieler mit E-Mail und Passwort an.</small>`;
          const inviteStatus = inviteHost.querySelector('[data-invite-status]');
          inviteHost.querySelector('[data-share-invite]').addEventListener('click',async()=>{
            try { if (navigator.share) await navigator.share({title:'CourtHub Individual Training',text:'Deine persönliche CourtHub-Einladung',url}); else { await navigator.clipboard.writeText(url); inviteStatus.textContent='Link kopiert.'; } }
            catch (error) { inviteStatus.textContent=error.name === 'AbortError' ? 'Teilen abgebrochen. Deine Einladung bleibt gültig.' : 'Teilen ist hier nicht verfügbar. Du kannst die Einladung öffnen und die Adresse kopieren.'; }
          });
          inviteHost.querySelector('[data-copy-invite]').addEventListener('click',async()=>{try { await navigator.clipboard.writeText(url); inviteStatus.textContent='Link kopiert.'; } catch { inviteStatus.textContent='Kopieren ist hier nicht verfügbar. Öffne die Einladung und kopiere die Adresse.'; }});
          inviteHost.scrollIntoView?.({behavior:'smooth',block:'start'});
          notice(root, 'Einladungslink wurde bereitgestellt. Er ist einmal verwendbar.');
        } catch (error) { if (root.isConnected) notice(root, error.message, true); }
        finally { actionButton.disabled = false; }
      }
    });
  }

  async function render(target, selectedProfileId = null, selectedPane = 'overview', previewPane = 'overview') {
    stopCoachRefresh();
    const request = ++activeRequest;
    const current = user();
    const owner = contextKey();
    document.body.classList.remove('individual-live-mode');
    target.innerHTML = '<section class="view individual-view"><p class="muted">Individual Training wird geladen …</p></section>';
    if (!current) {
      target.innerHTML = '<section class="view individual-view"><h2>Individual Training</h2><p>Bitte zuerst anmelden.</p><a class="btn primary" href="#/account">Zur Anmeldung</a></section>';
      return;
    }
    renderIndividualNavigation({profiles:[]}, current, selectedProfileId, selectedPane, previewPane);
    try {
      let data = await loadOverview();
      if (request !== activeRequest || owner !== contextKey()) return;
      let pilotStartError = null;
      if (['admin', 'coach'].includes(current.role) && needsPilotStart(data)) {
        try {
          await BT.api.individualAction('ensurePilotStart', {});
          data = await loadOverview();
          if (request !== activeRequest || owner !== contextKey()) return;
        } catch (error) {
          pilotStartError = error;
        }
      }
      if (request !== activeRequest || owner !== contextKey()) return;
      renderIndividualNavigation(data, current, selectedProfileId, selectedPane, previewPane);
      if (current.role === 'player') renderPlayer(target, data, {profileId:current.individualProfileId,pane:selectedPane});
      else {
        const selectedProfile = selectedProfileId ? data.profiles.find(profile => profile.id === selectedProfileId) : null;
        if (selectedProfileId && !selectedProfile) {
          target.innerHTML = '<section class="view individual-view"><a class="btn small" href="#/individual">← Coach-Cockpit</a><p class="auth-status error">Spielerprofil nicht gefunden.</p></section>';
        } else if (selectedProfile && selectedPane === 'preview') renderPlayer(target, data, {profileId:selectedProfile.id,pane:previewPane,preview:true,displayName:playerName(selectedProfile)});
        else if (selectedProfile) renderCoachDetailPage(target, selectedProfile, data, selectedPane);
        else renderCoach(target, data);
        if (pilotStartError) notice(target.querySelector('.individual-view'), pilotStartError.message, true);
      }
    } catch (error) {
      if (request !== activeRequest || owner !== contextKey()) return;
      target.innerHTML = `<section class="view individual-view"><h2>Individual Training</h2><p class="auth-status error">${BT.util.escapeHTML(error.message)}</p><button class="btn" data-retry>Erneut laden</button>${['admin','coach'].includes(current.role) ? '<a class="btn primary" href="#/individual/preview">Spieleransicht mit Beispieldaten ansehen</a><p>Einladungen und neue Spielerkonten benötigen eine erreichbare Datenbank.</p>' : ''}</section>`;
      target.querySelector('[data-retry]')?.addEventListener('click', () => render(target,selectedProfileId,selectedPane,previewPane));
    }
  }

  async function renderDemo(target, pane = 'overview') {
    stopCoachRefresh();
    const request = ++activeRequest, owner = contextKey();
    if (!['admin','coach'].includes(user()?.role)) { location.hash = '#/individual'; return; }
    renderIndividualNavigation({profiles:[]},user(),null,'preview',pane);
    target.innerHTML='<section class="view"><p>Beispielvorschau wird geladen …</p></section>';
    try {
      const response = await fetch('data/individual-player-preview.json');
      if (!response.ok) throw new Error('Die Beispielvorschau konnte nicht geladen werden.');
      const data = await response.json();
      if (request !== activeRequest || owner !== contextKey()) return;
      renderIndividualNavigation({profiles:[]},user(),null,'preview',pane);
      renderPlayer(target,data,{preview:true,demo:true,pane});
    } catch (error) { if (request === activeRequest && owner === contextKey()) target.innerHTML=`<section class="view"><p>${BT.util.escapeHTML(error.message)}</p><a class="btn" href="#/individual">Zurück</a></section>`; }
  }
  function cleanup() { activeRequest++; stopCoachRefresh(); }

  function applyNavigationForRole() {
    const role = user()?.role;
    const individual = document.querySelector('[data-nav="individual"]');
    if (individual) individual.hidden = !!role && !['admin', 'coach', 'player'].includes(role);
    const preview = ['admin','coach'].includes(role) && location.hash.match(/^#\/individual\/(?:player\/([^/]+)\/)?preview(?:\/([^/]+))?$/);
    if (preview) renderIndividualNavigation({profiles:[]},user(),preview[1] || null,'preview',preview[2] || 'overview');
    else if (role === 'player') renderIndividualNavigation({profiles:[]},user(),null,location.hash === '#/account' ? 'account' : location.hash.split('/')[2] || 'overview');
    else setPlayerNavigation('#/individual','overview',false);
    if (role === 'player' && !location.hash.startsWith('#/individual') && !location.hash.startsWith('#/account')) location.hash = '#/individual';
  }

  async function renderAccountNavigation() {
    const current = user();
    if (!current) return renderIndividualNavigation({ profiles: [] }, { role: 'guest' });
    let data = { profiles: [] };
    try { data = await loadOverview(); } catch { /* Account stays usable offline without a cached overview. */ }
    if (location.hash === '#/individual/account' && user()?.id === current.id) renderIndividualNavigation(data, current, null, 'account');
  }

  window.addEventListener('bt-sync-change', applyNavigationForRole);
  window.addEventListener('online', () => syncPending().catch(() => {}));
  document.addEventListener('DOMContentLoaded', applyNavigationForRole);
  return { render, renderDemo, cleanup, renderHub, renderAccountNavigation, queueMutation, syncPending, clearLocalData, applyNavigationForRole };
})();
