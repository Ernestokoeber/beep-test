window.BT = window.BT || {};

BT.individualTraining = (function() {
  const QUEUE_PREFIX = 'courthub_individual_queue:';
  const CACHE_PREFIX = 'courthub_individual_cache:';
  const MEASUREMENT_DRAFT_PREFIX = 'courthub_individual_measurement_draft:';
  const COACH_QUEUE_PREFIX = 'courthub_individual_coach_queue:';
  const LIVE_PREFIX = 'courthub_individual_live:';
  const measurementSessions = new Map();
  let activeRequest = 0;
  let coachEpoch = 0;
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
    coachEpoch++;
    measurementSessions.clear();
    BT.individualLive?.clearLocalData();
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(MEASUREMENT_DRAFT_PREFIX) || key?.startsWith(COACH_QUEUE_PREFIX) || key?.startsWith(QUEUE_PREFIX) || key?.startsWith(CACHE_PREFIX) || key?.startsWith(LIVE_PREFIX)) keys.push(key);
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

  function coachQueueKey() { return userKey(COACH_QUEUE_PREFIX); }
  const coachSyncWorkers = new Map();
  const coachActions = new Set(['startSession','setAttendance','saveMeasurement','addCoachNote','completeSession','completeLiveSession']);
  function retryable(error) { return error.status === 0 || error.status === 503 || error.status === 504; }

  async function syncCoachPending() {
    const key = coachQueueKey(), epoch = coachEpoch;
    if (!['admin','coach'].includes(user()?.role) || !navigator.onLine || BT.sync.getState().identitySource === 'cache') return;
    if (coachSyncWorkers.has(key)) return coachSyncWorkers.get(key);
    const work = (async () => {
      const responses = [];
      while (key === coachQueueKey() && epoch === coachEpoch) {
        const item = loadLocal(key, [])[0];
        if (!item) return responses;
        const result = await BT.api.individualAction(item.action, item.payload);
        if (key !== coachQueueKey() || epoch !== coachEpoch) return;
        responses.push({mutationId:item.payload.mutationId,result});
        // Read again: other inputs may have been added while the request was in flight.
        saveLocal(key, loadLocal(key, []).filter(entry => entry.payload.mutationId !== item.payload.mutationId));
        if (item.action === 'completeLiveSession' || item.action === 'completeSession') {
          for (const draft of result.queuedDrafts || []) BT.api.individualAIDraft('generate', {profileId:draft.individual_profile_id,sessionId:draft.session_id}).catch(() => {});
        }
      }
    })();
    coachSyncWorkers.set(key, work);
    try { return await work; } finally { if (coachSyncWorkers.get(key) === work) coachSyncWorkers.delete(key); }
  }

  async function coachAction(action, payload) {
    if (!coachActions.has(action)) return BT.api.individualAction(action, payload);
    if (!['admin','coach'].includes(user()?.role)) throw new Error('Nur Trainer dürfen diese Eingabe speichern.');
    const item = mutation(action, payload), key = coachQueueKey();
    const entry = {action,payload:{...clone(payload),mutationId:item.mutationId,deviceRecordedAt:item.deviceRecordedAt}};
    saveLocal(key, [...loadLocal(key, []),entry]);
    let responses;
    try { responses = await syncCoachPending(); }
    catch (error) {
      if (!retryable(error)) {
        // A rejected input must not be reported as saved. Existing queued inputs remain for review.
        saveLocal(key, loadLocal(key, []).filter(value => value.payload.mutationId !== entry.payload.mutationId));
        throw error;
      }
    }
    return {...(responses || []).find(r=>r.mutationId===entry.payload.mutationId)?.result,mutationId:entry.payload.mutationId,_queued:loadLocal(key, []).some(value => value.payload.mutationId === entry.payload.mutationId)};
  }

  function withCoachPending(data) {
    const copy = clone(data), queue = loadLocal(coachQueueKey(), []);
    copy._coachPending = queue.length;
    for (const {action,payload:p} of queue) {
      const sessions = (copy.sessions || []).filter(s => s.id === p.sessionId);
      if (action === 'startSession') sessions.forEach(s => s.status = 'in_progress');
      if (action === 'completeSession' || action === 'completeLiveSession') sessions.forEach(s => s.status = 'completed');
      if (action === 'setAttendance') sessions.filter(s => s.individual_profile_id === p.profileId).forEach(s => s.attendance_status = p.status);
      if (action === 'addCoachNote') (copy.coachNotes ||= []).unshift({id:p.mutationId,individual_profile_id:p.profileId,session_id:p.sessionId,note:p.note,created_at:p.deviceRecordedAt,_pending:true});
      if (action === 'saveMeasurement') (copy.measurements ||= []).push({id:p.mutationId,individual_profile_id:p.profileId,session_id:p.sessionId,exercise_id:p.exerciseId,metric_key:p.metricKey,numeric_value:p.numericValue,text_value:p.textValue,unit:p.unit,attempt:p.attempt,_pending:true});
    }
    return copy;
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
      if (!retryable(error)) throw error;
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
    if (user()?.role !== 'player') return withCoachPending(data);
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

  function trainingTitle(value) { return BT.individualCopy.title(value); }

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
    return BT.individualCopy.attendance(status);
  }

  function draftLabel(status) {
    return BT.individualCopy.draft(status);
  }

  function renderHub(target) {
    target.innerHTML = `<section class="view individual-start-hub">
      <div class="individual-hub-head"><div><h3>Arbeitsbereich wechseln</h3><p>Mannschaft, Individualtraining oder Personal</p></div></div>
      <div class="individual-workspaces">
        <a class="individual-workspace-card individual-workspace-team" data-workspace="team" href="#/team"><span class="individual-workspace-icon" aria-hidden="true">M</span><span><small>Arbeitsbereich</small><strong>Mannschaft</strong><em>Teamtraining, Spiele, Kader und Auswertungen</em></span><b aria-hidden="true">→</b></a>
        <a class="individual-workspace-card individual-workspace-one" data-workspace="individual" href="#/individual"><span class="individual-workspace-icon" aria-hidden="true">1</span><span><small>Arbeitsbereich</small><strong>Individualtraining</strong><em>Spieler individuell fördern</em></span><b aria-hidden="true">→</b></a>
        <a class="individual-workspace-card" data-workspace="personal" href="#/personal"><span class="individual-workspace-icon" aria-hidden="true">P</span><span><small>Arbeitsbereich</small><strong>Personal</strong><em>Mein Aufbauplan, eigene Einheiten und Fortschritt</em></span><b aria-hidden="true">→</b></a>
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
      ].map(([key,label,href])=>`<a href="${href}" ${key === pane ? 'class="active" aria-current="page"' : ''}>${label}</a>`).join('')}${current.role === 'player' ? '<a href="#/personal">Personal</a>' : ''}`;
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
      ['feedback', '✎', 'Notizen & Rückmeldungen'],
      ['ai-history', '◆', 'KI-Auswertung & Verlauf']
    ].map(([pane, icon, label]) => `<a href="#/individual/player/${encodeURIComponent(selectedProfile.id)}/${pane}" class="individual-pane-link ${pane === selectedPane ? 'active' : ''}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('') : '';
    navigation.innerHTML = `<span class="nav-section-label">Individualtraining</span>
      <a href="#/individual" class="${selectedProfileId ? '' : 'active'}"><span class="nav-icon" aria-hidden="true">⌂</span><span>${current.role === 'player' ? 'Mein Training' : 'Trainerübersicht'}</span></a>
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
    return status ? BT.individualCopy.session(status) : 'Noch nicht geplant';
  }

  function roadmapExercise(exercise, index) {
    return `<li><strong>${index + 1}. ${BT.util.escapeHTML(trainingTitle(exercise.title))} · ${exercise.durationMinutes == null ? 'Dauer nicht notiert' : `${exercise.durationMinutes} Min.`}</strong>
      <details><summary>Wiederholungen, Messung und Trainerhinweise</summary>
        <p><b>Wiederholungen:</b> ${BT.util.escapeHTML(BT.individualCopy.details(exercise.repetitions || {}))}</p>
        <p><b>Messung:</b> ${BT.util.escapeHTML(BT.individualCopy.details(exercise.measurementMethod || {}))}</p>
        <p><b>Trainerhinweise:</b> ${BT.util.escapeHTML((exercise.coachingCues || []).map(BT.individualCopy.cue).join(' · '))}</p>
      </details></li>`;
  }

  function renderPilotRoadmap(data, sessions, profileId) {
    const roadmap = data.pilotRoadmap || [];
    if (!roadmap.length) return '';
    const cards = roadmap.map(unit => {
      const matching = (sessions || []).filter(session => Number(session.unit_number) === Number(unit.unitNumber));
      const actual = [...matching].reverse().find(session => session.status !== 'cancelled') || matching.at(-1) || null;
      const isAssessment = unit.kind === 'assessment';
      const planDate = actual ? localBerlinDate(actual.scheduled_for) : unit.scheduledDate;
      const actualPlan=(data.plans || []).find(p=>p.session_id===actual?.id && p.individual_profile_id===profileId);
      const reviewed=actualPlan && actualPlan.version>1;
      const exercises = reviewed ? (data.exercises || []).filter(e=>e.plan_id===actualPlan.id).map(e=>({title:e.title,durationMinutes:e.measurement_method?.durationNotRecorded ? null : e.duration_minutes,repetitions:e.repetitions,measurementMethod:e.measurement_method,coachingCues:e.coaching_cues})) : unit.template?.exercises || [];
      return `<article class="individual-roadmap-unit ${isAssessment ? 'assessment' : ''} ${actual?.status || 'upcoming'}" data-pilot-unit="${unit.unitNumber}">
        <div class="individual-roadmap-number"><span>Einheit</span><strong>${unit.unitNumber}</strong></div>
        <div class="individual-roadmap-content">
          <div class="individual-roadmap-heading"><div><small>${isAssessment ? 'Verbindliche Testeinheit' : 'Entwicklungseinheit'}</small><h5>${BT.util.escapeHTML(trainingTitle(reviewed ? actualPlan.title : unit.title))}</h5></div><span>${BT.util.escapeHTML(sessionStatusLabel(actual?.status))}</span></div>
          <p class="individual-roadmap-date">${BT.util.escapeHTML(roadmapDate(planDate))} · 20:15 Uhr · ${unit.durationMinutes} Minuten</p>
          <p>${BT.util.escapeHTML(reviewed ? actualPlan.objective : unit.objective)}</p>
          ${exercises.length ? `<details class="individual-roadmap-details"><summary>Freigegebenen Ablauf anzeigen</summary><ol class="individual-exercise-list">${exercises.map(roadmapExercise).join('')}</ol></details>` : '<p class="muted">Der individuelle Ablauf entsteht nach Auswertung der vorherigen Einheit.</p>'}
        </div>
      </article>`;
    }).join('');
    return `<section class="card individual-roadmap"><div class="section-head"><div><span class="section-kicker">Verbindlicher Wochenablauf</span><h4>Trainingsplan · alle acht Einheiten</h4><p class="muted">Der 2. November entfällt wegen der bayerischen Allerheiligenferien. Bei einem Ausfall bleibt die Einheitsnummer offen und wird am nächsten Montag fortgeführt.</p></div></div><div class="individual-roadmap-list">${cards}</div></section>`;
  }

  function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }

  async function enablePush(root) {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Benachrichtigungen sind auf diesem Gerät nicht verfügbar.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt. Erinnerungen bleiben unter „Mein Training“ sichtbar.');
      const { publicKey } = await BT.api.getIndividualPushKey();
      if (!publicKey) throw new Error('Benachrichtigungen sind noch nicht eingerichtet. Erinnerungen bleiben unter „Mein Training“ sichtbar.');
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await BT.api.saveIndividualPush(subscription.toJSON());
      notice(root, 'Benachrichtigungen sind aktiviert. Erinnerungen bleiben zusätzlich unter „Mein Training“ sichtbar.');
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
      <div class="individual-profile-heading"><div><span class="section-kicker">Spieler</span><h3><a href="#/individual/player/${encodeURIComponent(profile.id)}/overview">${BT.util.escapeHTML(playerName(profile))}</a></h3></div><span class="individual-sync-dot ${Number(profile.pending_sync_count || 0) ? 'pending' : ''}" title="Synchronisierungsstatus"></span></div>
      <dl class="individual-status-grid">
        <div class="wide"><dt>Nächste Einheit</dt><dd data-coach-next-session>${session ? `${fmt(session.scheduled_for)} · Einheit ${session.unit_number || '–'}` : 'Nicht geplant'}</dd></div>
        <div><dt>Teilnahme</dt><dd data-coach-attendance aria-live="polite">${session ? attendanceLabel(session.attendance_status) : '—'}</dd></div>
        <div><dt>Tagesform</dt><dd data-coach-readiness aria-live="polite">${readinessLabel}</dd></div>
      </dl>
      <details class="individual-profile-details"><summary>Fokus und Auswertung${openFeedback ? ' · Rückmeldung offen' : ''}</summary><dl class="individual-status-grid">
        <div><dt>Synchronisierung</dt><dd>${Number(profile.pending_sync_count || 0) ? `${Number(profile.pending_sync_count)} offen` : 'Aktuell'}</dd></div>
        <div><dt>Rückmeldung</dt><dd>${openFeedback ? 'Offen' : 'Aktuell'}</dd></div>
        <div class="wide"><dt>Wochenfokus</dt><dd>${focus ? BT.util.escapeHTML(focus.title) : 'Noch nicht freigegeben'}</dd></div>
        <div class="wide"><dt>KI-Auswertung</dt><dd>${latestDraft ? BT.util.escapeHTML(draftLabel(latestDraft.status)) : 'Nach der ersten abgeschlossenen Einheit'}</dd></div>
      </dl></details>
      <div class="individual-actions"><button class="btn" type="button" data-action="invite-player" ${profile.user_id ? 'disabled' : ''}>${profile.user_id ? 'Spielerkonto verbunden' : 'Einladung & QR-Code'}</button><a class="btn" href="#/individual/player/${encodeURIComponent(profile.id)}/preview">Spieleransicht ansehen</a><button class="btn primary" type="button" data-action="open-profile">Spieler öffnen</button></div>
    </article>`;
  }

  function renderCoachLive(target, profile, data, session, fallbackExercises = []) {
    stopCoachRefresh();
    if (!['planned', 'in_progress'].includes(session.status)) {
      notice(target, 'Diese Einheit ist bereits abgeschlossen oder abgesagt.', true);
      return;
    }
    try {
      BT.individualLive.render({
        target, profile, data, session, fallbackExercises,
        helpers: {
          key: `${userKey(LIVE_PREFIX)}:${session.id}`, contextKey, notice, playerName, trainingTitle,
          fmt, attendanceLabel, measurementDefinitions, measurementInput,
          exit: () => render(target),
          finished: () => render(target)
        }
      });
    } catch (error) { notice(target, error.message, true); }
  }

  function measurementDefinitions(exercise) {
    const title = String(exercise?.title || '').toLocaleLowerCase('de-DE');
    const number = (key, label, unit = '', max = null, attempts = 0) => ({ key, label, type: 'number', unit, max, attempts });
    const choice = (key, label, choices) => ({ key, label, type: 'choice', choices });
    const text = (key, label, placeholder = 'Kurz und verständlich eintragen') => ({ key, label, type: 'text', placeholder });
    if (title.includes('dynamische aktivierung')) return [];
    if (title.includes('check-in') || title.includes('readiness') || title.includes('tagesform')) return [number('readiness', 'Tagesform', 'von 10', 10)];
    if (title.includes('ballkontrolle')) return [
      number('zeit', 'Zeit', 'Sekunden', null, 2),
      number('ballverluste', 'Ballverluste', 'Anzahl', null, 2),
      number('ausgelassene_huetchen', 'Ausgelassene Hütchen', 'Anzahl', 5, 2),
      choice('blick_oben', 'Blick oben', ['Ja', 'Teilweise', 'Nein']),
      choice('schwache_hand', 'Schwache Hand', ['Sicher', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('freiwürfe') || title.includes('freiwurf')) return [number('treffer','Freiwürfe getroffen','von 10',10)];
    if (title.includes('bodenpass')) return [number('treffer','Spot-up-Treffer','von 10',10),text('passqualitaet','Passqualität')];
    if (title.includes('spot-up') || title.includes('spotup') || title.includes('pick-and-roll') || title.includes('box-out')) return [text('coach_beobachtung','Beobachtung')];
    if (title.includes('korbleger')) return [number('treffer_rechts','Treffer rechts','von 10',10),number('treffer_links','Treffer links','von 10',10),text('coach_beobachtung','Technik und linke Hand')];
    if (title.includes('korbabschluss')) return [
      number('treffer_rechts', 'Treffer rechts', 'von 10', 10),
      number('treffer_links', 'Treffer links', 'von 10', 10),
      number('korrekte_abschlusshand', 'Richtige Abschlusshand', 'von 20', 20),
      number('korrekte_schrittfolge', 'Korrekte Schrittfolge', 'von 20', 20),
      number('ballverlust_vor_abschluss', 'Ballverlust vor Abschluss', 'Anzahl', 20),
      choice('technik', 'Technik insgesamt', ['Stabil', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('wurf')) return [
      number('treffer_baseline_links', 'Treffer Grundlinie links', 'von 5', 5),
      number('treffer_fluegel_links', 'Treffer Flügel links', 'von 5', 5),
      number('treffer_frontal', 'Treffer frontal', 'von 5', 5),
      number('treffer_fluegel_rechts', 'Treffer Flügel rechts', 'von 5', 5),
      number('treffer_baseline_rechts', 'Treffer Grundlinie rechts', 'von 5', 5),
      choice('fehlwurfrichtung', 'Häufigste Fehlwurfrichtung', ['Zu kurz', 'Zu lang', 'Links', 'Rechts', 'Unterschiedlich']),
      choice('balance', 'Gleichgewicht', ['Stabil', 'Wechselhaft', 'Unsicher']),
      choice('wurflinie', 'Wurflinie', ['Stabil', 'Wechselhaft', 'Unsicher']),
      choice('follow_through', 'Wurfbewegung ausschwingen', ['Stabil', 'Wechselhaft', 'Unsicher'])
    ];
    if (title.includes('technikkorrektur') && !title.includes('kontrollmessung')) return [text('coach_beobachtung', 'Was wurde korrigiert?')];
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
      text('kontrollwert', 'Ergebnis nach der Technikkorrektur', 'Zum Beispiel: 7 Treffer aus 10 oder 13,4 Sekunden')
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
    if (title.includes('auswertung') || title.includes('entwicklungsblock')) return [text('coach_beobachtung', 'Trainerbeobachtung')];
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
        <summary><span><small>Übung ${exercise.position}</small><strong>${BT.util.escapeHTML(trainingTitle(exercise.title))}</strong></span><b>${saved ? `${saved} gespeichert` : 'Öffnen'}</b></summary>
        <div class="individual-measurement-grid">${definitions.map(definition => `<form data-guided-measurement data-exercise-id="${exercise.id || ''}" data-metric-key="${definition.key}" data-value-type="${definition.type}" data-unit="${BT.util.escapeHTML(definition.unit || '')}">
          <label><span>${BT.util.escapeHTML(definition.label)}${definition.unit ? ` <small>${BT.util.escapeHTML(definition.unit)}</small>` : ''}</span>${measurementInput(definition)}</label>
          ${definition.attempts ? `<label><span>Durchgang</span><select name="attempt" required>${Array.from({ length: definition.attempts }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('')}</select></label>` : ''}
          <button class="btn primary" type="submit">${BT.util.escapeHTML(definition.label)} speichern</button>
        </form>`).join('')}</div>
      </details>`;
    }).join('');
    const exerciseNames = new Map(exercises.filter(item => item.id).map(item => [item.id, trainingTitle(item.title)]));
    const labels = new Map(exercises.filter(exercise => exercise.id).map(exercise => [exercise.id, new Map(measurementDefinitions(exercise).map(definition => [definition.key, definition.label]))]));
    const history = measurements.length ? measurements.slice().reverse().map(item => {
      const value = item.numeric_value !== null && item.numeric_value !== undefined ? Number(item.numeric_value) : item.text_value;
      return `<li><span><strong>${BT.util.escapeHTML(labels.get(item.exercise_id)?.get(item.metric_key) || BT.individualCopy.metric(item.metric_key))}</strong><small>${BT.util.escapeHTML(exerciseNames.get(item.exercise_id) || 'Allgemeine Messung')}${item.attempt ? ` · Durchgang ${item.attempt}` : ''}</small></span><b>${BT.util.escapeHTML(item.metric_key === 'tatsaechliches_ende' ? fmt(value,{timeZone:'Europe/Berlin'}) : value)}${item.unit ? ` ${BT.util.escapeHTML(item.unit)}` : ''}</b></li>`;
    }).join('') : '<li class="muted">Noch keine Ergebnisse gespeichert.</li>';
    return `<section class="individual-measurement-intro"><p>Wähle die Übung und trage nur das beobachtete Ergebnis ein. CourtHub ordnet es automatisch richtig zu.</p></section>
      <div class="individual-measurement-exercises">${forms || '<section class="card"><p class="muted">Für diese Einheit sind keine Messungen vorgesehen.</p></section>'}</div>
      <section class="card individual-measurement-history"><h4>Gespeicherte Ergebnisse</h4><ul>${history}</ul></section>`;
  }

  function renderCoachDetail(root, profile, data, pane = 'overview') {
    const host = root.querySelector('[data-role="individual-detail"]');
    const sessions = (data.sessions || []).filter(item => item.individual_profile_id === profile.id);
    const selectedSession = pane === 'measurements' ? sessions.find(s=>s.id===measurementSessions.get(`${contextKey()}:${profile.id}`)) : null;
    const activeSession = selectedSession || [...sessions].reverse().find(item => ['planned', 'in_progress'].includes(item.status)) || sessions.at(-1) || null;
    const plan = (data.plans || []).find(item => item.session_id === activeSession?.id && item.individual_profile_id === profile.id);
    const exercises = (data.exercises || []).filter(item => item.session_id === activeSession?.id && item.individual_profile_id === profile.id);
    const roadmapUnit = (data.pilotRoadmap || []).find(item => Number(item.unitNumber) === Number(activeSession?.unit_number));
    const fallbackTemplate = roadmapUnit?.template || null;
    const displayPlan = plan || fallbackTemplate;
    const sessionPlayers = (data.profiles || []).filter(p => (data.sessions || []).some(s => s.id === activeSession?.id && s.individual_profile_id === p.id));
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
    const rolePlanReady = draft => ['current','approved'].includes(draft?.status) && draft?.content?.planningContractVersion === 3;
    const latestDraftFor = profileId => (data.aiDrafts || []).find(item => item.individual_profile_id === profileId) || null;
    const paneLabels = {
      overview: 'Übersicht',
      training: 'Training durchführen',
      measurements: 'Messwerte',
      focus: 'Wochenfokus',
      feedback: 'Notizen & Rückmeldungen',
      'ai-history': 'KI-Auswertung & Verlauf'
    };
    if (!paneLabels[pane]) pane = 'overview';
    const emptySession = '<section class="card"><h4>Keine aktive Einheit</h4><p class="muted">Plane zuerst in der Übersicht die nächste Montagseinheit.</p><a class="btn primary" href="#/individual/player/' + encodeURIComponent(profile.id) + '/overview">Zur Übersicht</a></section>';
    const sessionOpen = activeSession && ['planned', 'in_progress'].includes(activeSession.status);
    const canRefreshSessionPlans = activeSession?.status === 'planned' && Number(activeSession.unit_number) > 1
      && sessionPlayers.length > 0 && sessionPlayers.every(item => rolePlanReady(latestDraftFor(item.id)));
    const refreshSessionPlansControl = activeSession?.status === 'planned' && Number(activeSession.unit_number) > 1
      ? `<div class="individual-actions"><button class="btn" type="button" data-refresh-session-plans ${canRefreshSessionPlans ? '' : 'disabled'}>Rollenspezifische KI-Pläne in Einheit übernehmen</button><p role="status" data-refresh-session-plans-status>${canRefreshSessionPlans ? 'Ersetzt die bereits angelegten Abläufe durch die aktuellen Rollenpläne.' : 'Zuerst für alle Teilnehmer einen aktuellen rollenspezifischen KI-Entwurf erstellen.'}</p></div>`
      : '';
    const completedCount = new Set((data.sessions || []).filter(s=>s.status === 'completed').map(s=>s.id)).size;
    const nextSessionCard = sessionOpen ? `<section class="card"><h4>Nächste Montagseinheit</h4><p><strong>Einheit ${activeSession.unit_number} ist angelegt.</strong></p><p>${fmt(activeSession.scheduled_for)} · ${activeSession.duration_minutes || 105} Minuten</p><a class="btn primary" href="#/individual/player/${encodeURIComponent(profile.id)}/training">Einheit öffnen</a></section>` : completedCount >= 8 ? '<section class="card"><h4>Trainingsblock abgeschlossen</h4><p>Alle acht Einheiten sind durchgeführt.</p></section>' : `<form class="card" data-plan-session data-primary-plan-ready="${rolePlanReady(latestDraft)}"><h4>Nächste Montagseinheit planen</h4><p>Für jeden Teilnehmer wird ausschließlich der aktuelle rollenspezifische KI-Entwurf übernommen. Rückmeldung und Wochenfokus bleiben bis zur gesonderten Freigabe privat.</p><label>Datum<input name="scheduledDate" type="date" value="${nextPilotDate(data.sessions)}" readonly required></label><label>Startzeit<input name="scheduledTime" type="time" value="20:15" readonly required></label><label>Zweiter Teilnehmer, optional<select name="secondProfileId"><option value="" data-plan-ready="true">Einzeltraining</option>${(data.profiles || []).filter(item => item.id !== profile.id).map(item => `<option value="${item.id}" data-plan-ready="${rolePlanReady(latestDraftFor(item.id))}" ${sessionPlayers.some(p=>p.id===item.id) ? 'selected' : ''}>${BT.util.escapeHTML(playerName(item))}</option>`).join('')}</select></label><p role="status" data-plan-session-status></p><button class="btn primary" type="submit">Nächste Einheit mit rollenspezifischem KI-Plan ansetzen</button><a class="btn" href="#/individual/player/${encodeURIComponent(profile.id)}/ai-history">KI-Entwurf prüfen</a></form>`;
    const overview = `${nextSessionCard}${renderPilotRoadmap(data, sessions, profile.id)}`;
    const training = activeSession ? `<section class="card individual-session-run-card"><div class="section-head"><div><span class="section-kicker">Durchführung</span><h4>Einheit ${activeSession.unit_number || '–'} · ${fmt(activeSession.scheduled_for)}</h4></div><span>${BT.util.escapeHTML(sessionStatusLabel(activeSession.status))}</span></div>
        <p><strong>Teilnehmer: ${BT.util.escapeHTML(sessionPlayers.map(playerName).join(' + '))}</strong>${sessionPlayers.length > 1 ? '<br>Eine gemeinsame Uhr und ein Ablauf, persönliche Dokumentation für jeden Spieler.' : ''}</p>
        <button class="btn primary individual-start-live" type="button" data-action="start-live-training" ${displayExercises.length && ['planned', 'in_progress'].includes(activeSession.status) ? '' : 'disabled'}>▶ ${sessionPlayers.length > 1 ? 'Gemeinsames Training durchführen' : 'Training durchführen'}</button>
        ${refreshSessionPlansControl}
        ${sessionOpen ? '<div class="individual-actions"><button class="btn" data-set-attendance="attended">Als anwesend bestätigen</button><button class="btn" data-set-attendance="unexcused_no_show">Unentschuldigt gefehlt</button><button class="btn danger" data-cancel-session>Einheit absagen</button></div>' : `<p>Diese Einheit ist ${activeSession.status === 'completed' ? 'bereits abgeschlossen. Die Ergebnisse bleiben gespeichert.' : 'abgesagt.'}</p><a class="btn" href="#/individual/player/${encodeURIComponent(profile.id)}/ai-history">KI-Auswertung öffnen</a>`}
        ${displayPlan ? `<h4>${BT.util.escapeHTML(trainingTitle(displayPlan.title))}</h4><p>${BT.util.escapeHTML(displayPlan.objective || '')}</p><ol class="individual-exercise-list">${displayExercises.map(exercise => `<li><strong>${exercise.position}. ${BT.util.escapeHTML(trainingTitle(exercise.title))} · ${exercise.measurement_method?.durationNotRecorded ? 'Dauer nicht notiert' : `${exercise.duration_minutes} Min.`}</strong><details><summary>Wiederholungen, Messung und Trainerhinweise</summary><p><b>Wiederholungen:</b> ${BT.util.escapeHTML(BT.individualCopy.details(exercise.repetitions))}</p><p><b>Messung:</b> ${BT.util.escapeHTML(BT.individualCopy.details(exercise.measurement_method))}</p><p><b>Trainerhinweise:</b> ${BT.util.escapeHTML((exercise.coaching_cues || []).map(BT.individualCopy.cue).join(' · '))}</p></details></li>`).join('')}</ol>` : '<p class="muted">Für diese Einheit ist noch kein Plan gespeichert.</p>'}
        ${sessionOpen ? '<div class="individual-actions"><p role="status" data-complete-session-status></p><button class="btn primary" data-complete-session>Einheit abschließen und KI-Entwurf starten</button></div>' : ''}
      </section>${sessionOpen ? '' : nextSessionCard}` : `${emptySession}${nextSessionCard}`;
    const measurementPane = activeSession ? `<section class="card"><div class="section-head"><div><span class="section-kicker">Einheit ${activeSession.unit_number || '–'}</span><h4>Ergebnisse erfassen</h4></div><strong>${measurements.length} gespeichert</strong></div></section>${renderMeasurementPane(activeSession, displayExercises, measurements)}` : emptySession;
    const focusPane = activeSession ? `<form class="card individual-feedback-form" data-weekly-focus><h4>Persönlichen Wochenfokus freigeben</h4><label>Persönliches Ziel<input name="title" required maxlength="120"></label><label>Hinweis 1<input name="cueOne" required maxlength="240"></label><label>Hinweis 2, optional<input name="cueTwo" maxlength="240"></label><label>Gelungen, wenn …<input name="successIndicator" required maxlength="300"></label><label>Gültig ab<input name="validFrom" type="date" value="${datePlus(localBerlinDate(activeSession.scheduled_for), 1)}" readonly required></label><label>Gültig bis<input name="validUntil" type="date" value="${datePlus(localBerlinDate(activeSession.scheduled_for), 6)}" readonly required></label><button class="btn primary" type="submit">Wochenfokus für Spieler freigeben</button></form>` : emptySession;
    const feedbackPane = `${incomingFeedback}<div class="individual-detail-grid">
        <form class="card" data-coach-note><h4>Private Trainernotiz</h4><p>Nur für das Trainerteam. Die KI berücksichtigt die zwölf zuletzt gespeicherten oder bearbeiteten privaten Notizen als Vorwissen für ihre interne Analyse und den Trainingsvorschlag. Spielerfeedback und Wochenfokus entstehen getrennt ohne diese Notizen.</p><label>Deine Notiz<textarea name="note" maxlength="5000" required></textarea></label><button class="btn" type="submit">Privat speichern</button></form>
        <form class="card" data-release-feedback><h4>Notiz für den Spieler</h4><label>Text für den Spieler<textarea name="content" maxlength="5000" required></textarea></label><label class="individual-note-consent"><input type="checkbox" name="shareWithPlayer" required><span>Diese Notiz für den Spieler freigeben</span></label><p class="muted">Nur bewusst gekennzeichnete Notizen erscheinen beim Spieler.</p><button class="btn primary" type="submit">Für Spieler freigeben</button></form>
      </div>
      <section class="card private-coach-card"><h4>Private Notizen</h4>${notes.length ? notes.map(item => `<article class="individual-private-note"><p style="white-space:pre-wrap">${BT.util.escapeHTML(item.note)}</p><small>${fmt(item.created_at)}${item.updated_at && item.updated_at !== item.created_at ? ` · Bearbeitet ${fmt(item.updated_at)}` : ''}</small><details><summary>Bearbeiten</summary><form data-edit-coach-note="${BT.util.escapeHTML(item.id)}"><label>Private Notiz bearbeiten<textarea name="note" minlength="2" maxlength="5000" required>${BT.util.escapeHTML(item.note)}</textarea></label><p class="muted">Bleibt privat. Die nächste KI-Auswertung berücksichtigt die korrigierte Fassung.</p><div class="individual-actions"><button class="btn primary" type="submit">Änderungen speichern</button><button class="btn" type="button" data-cancel-note-edit>Abbrechen</button><button class="btn" type="button" data-delete-coach-note>Notiz löschen</button></div><p role="status" data-note-edit-status></p></form></details></article>`).join('') : '<p class="muted">Keine privaten Notizen.</p>'}</section>
      <section class="card"><h4>Für den Spieler freigegeben</h4>${feedback.length ? feedback.map(item => `<p>${BT.util.escapeHTML(item.content)}</p>`).join('') : '<p class="muted">Noch nichts freigegeben.</p>'}</section>`;
    const draftPlan = latestDraft?.content?.nextSession;
    const planningBasis = latestDraft?.content?.planningBasis;
    const planningBasisDetails = planningBasis ? `<section class="individual-ai-priorities"><p><b>Spielerrolle:</b> ${BT.util.escapeHTML(latestDraft.content.playerRole?.label || 'Nicht angegeben')}</p><p><b>Hauptpriorität:</b> ${BT.util.escapeHTML(planningBasis.primaryPriority?.title || '')} · ${Number(planningBasis.allocationMinutes?.primary || 0)} Min.</p><p><b>Zweite Priorität:</b> ${BT.util.escapeHTML(planningBasis.secondaryPriority?.title || '')} · ${Number(planningBasis.allocationMinutes?.secondary || 0)} Min.</p>${planningBasis.deferredTopics?.length ? `<p><b>Diesmal bewusst zurückgestellt:</b> ${BT.util.escapeHTML(planningBasis.deferredTopics.join(' · '))}</p>` : ''}</section>` : '';
    const draftPlanDetails = draftPlan ? `<details class="individual-ai-plan"><summary>Vollständigen KI-Trainingsplan prüfen</summary><p>${BT.util.escapeHTML(draftPlan.objective || '')}</p><ol>${(draftPlan.blocks || []).map((block,index)=>`<li><strong>${BT.util.escapeHTML(block.title || `Übungsblock ${index+1}`)} · ${Number(block.minutes)} Min.</strong>${block.roleAssignment ? `<p><b>Rollenauftrag:</b> ${BT.util.escapeHTML(block.roleAssignment)}</p>` : ''}<p><b>Organisation:</b> ${block.coordinationMode === 'shared' ? 'Gemeinsamer Rollenblock' : 'Individuelle Aufgabe'}</p><p>${BT.util.escapeHTML(BT.individualCopy.details(block.repetitions))}</p><p>Messung: ${BT.util.escapeHTML(BT.individualCopy.details(block.measurementMethod))}</p><p>Trainerhinweise: ${BT.util.escapeHTML((block.coachingCues || []).join(' · '))}</p></li>`).join('')}</ol></details>` : '';
    const legacyPlan = latestDraft?.content && latestDraft.content.planningContractVersion !== 3;
    const aiHistoryPane = `<section class="card private-coach-card"><h4>Privater KI-Entwurf</h4><p>Nur für dich sichtbar. Nach deiner Prüfung kannst du die Rückmeldung für den Spieler und den Wochenfokus für den Spieler freigeben.</p>${latestDraft ? `<p>Status: <strong>${BT.util.escapeHTML(draftLabel(latestDraft.status))}</strong></p>${legacyPlan ? '<p class="auth-status error">Dieser Entwurf verwendet noch die alte Rollenlogik. Er kann nicht als nächste Einheit übernommen werden. Bitte mit klar getrennten Spieleraufgaben neu erstellen.</p>' : ''}${latestDraft.content ? `<h5>${BT.util.escapeHTML(latestDraft.content.nextSession?.title || '')}</h5><p>${BT.util.escapeHTML(latestDraft.content.analysis || '')}</p>${planningBasisDetails}<p><b>Wochenfokus:</b> ${BT.util.escapeHTML(latestDraft.content.weeklyFocus?.title || '')}</p>` : ''}${draftPlanDetails}<div class="individual-actions">${['queued', 'failed'].includes(latestDraft.status) ? '<button class="btn" data-generate-draft>KI-Entwurf erstellen</button>' : ''}${legacyPlan && !['queued', 'generating', 'failed'].includes(latestDraft.status) ? '<button class="btn" data-regenerate-draft>Getrennten Rollenplan neu erstellen</button>' : !legacyPlan && ['current', 'stale'].includes(latestDraft.status) ? '<button class="btn" data-regenerate-draft>Entwurf nach Änderungen neu erstellen</button>' : ''}${latestDraft.status === 'current' && !legacyPlan ? '<button class="btn primary" data-approve-draft>Rückmeldung und Wochenfokus freigeben</button>' : ''}</div>` : '<p class="muted">Der erste KI-Entwurf entsteht nach einer abgeschlossenen Einheit mit bestätigter Anwesenheit. Alle Eingaben müssen synchronisiert sein. Starte ihn beim Trainingsabschluss und prüfe ihn anschließend hier.</p>'}</section>
      ${sessionOpen ? '' : nextSessionCard}<section class="card"><h4>Einheiten</h4>${sessions.length ? `<ul>${sessions.map(item => `<li>${fmt(item.scheduled_for)} · ${BT.util.escapeHTML(sessionStatusLabel(item.status))} · Einheit ${item.unit_number || '–'} · ${BT.util.escapeHTML(attendanceLabel(item.attendance_status))}</li>`).join('')}</ul>` : '<p class="muted">Noch keine Einheit angelegt.</p>'}</section>`;
    const paneContent = { overview, training, measurements: measurementPane, focus: focusPane, feedback: feedbackPane, 'ai-history': aiHistoryPane }[pane];
    host.hidden = false;
    host.innerHTML = `<div class="section-head individual-player-title"><div><span class="section-kicker">Traineransicht</span><h3>${BT.util.escapeHTML(playerName(profile))}</h3></div><span class="individual-current-pane">${paneLabels[pane]}</span></div><p><a class="btn" href="#/individual/player/${encodeURIComponent(profile.id)}/preview">Spieleransicht ansehen</a></p>${paneContent}`;
    const refresh = () => render(root.parentElement, profile.id, pane);
    if (pane === 'measurements' && sessions.length) {
      const label=document.createElement('label');label.textContent='Einheit auswählen';
      const select=document.createElement('select');select.dataset.measurementSession='';
      for (const s of [...sessions].reverse()) {const option=document.createElement('option');option.value=s.id;option.textContent=`Einheit ${s.unit_number} · ${fmt(s.scheduled_for)} · ${sessionStatusLabel(s.status)}`;option.selected=s.id===activeSession?.id;select.append(option);}
      select.onchange=()=>{measurementSessions.set(`${contextKey()}:${profile.id}`,select.value);refresh();};label.append(select);host.querySelector('.individual-player-title')?.after(label);
    }
    if (pane === 'training') BT.individualPlanEditor?.mount(host,{profile,session:activeSession,plan,exercises,measurements,refresh});
    const planSessionForm = host.querySelector('[data-plan-session]');
    const updatePlanReadiness = () => {
      if (!planSessionForm) return;
      const select = planSessionForm.elements.secondProfileId;
      const ready = planSessionForm.dataset.primaryPlanReady === 'true' && (select.selectedOptions[0]?.dataset.planReady !== 'false');
      planSessionForm.querySelector('[type="submit"]').disabled = !ready;
      planSessionForm.querySelector('[data-plan-session-status]').textContent = ready ? '' : 'Bitte zuerst für jeden ausgewählten Spieler den neuen rollenspezifischen KI-Entwurf erstellen.';
    };
    planSessionForm?.elements.secondProfileId.addEventListener('change', updatePlanReadiness);
    updatePlanReadiness();
    planSessionForm?.addEventListener('submit', async event => {
      event.preventDefault(); const element=event.currentTarget;
      if(element.dataset.saving==='true')return;
      const form = new FormData(element),button=element.querySelector('[type="submit"]'),status=element.querySelector('[data-plan-session-status]');
      const secondProfileId = form.get('secondProfileId');
      element.dataset.saving='true';button.disabled=true;status.textContent='Training wird angesetzt …';
      try { await BT.api.individualAction('createSession', { profileIds: [profile.id, secondProfileId].filter(Boolean), scheduledDate: form.get('scheduledDate'), scheduledTime: form.get('scheduledTime'), durationMinutes: 105 }); location.hash=`#/individual/player/${encodeURIComponent(profile.id)}/training`; await render(root.parentElement,profile.id,'training'); }
      catch (error) { status.textContent=error.message; }
      finally {element.dataset.saving='false';button.disabled=false;}
    });
    host.querySelector('[data-coach-note]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await coachAction('addCoachNote', { profileId: profile.id, sessionId: activeSession?.id || null, note: form.get('note') }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelectorAll('[data-edit-coach-note]').forEach(formElement => {
      const original = notes.find(item => item.id === formElement.dataset.editCoachNote);
      const textarea = formElement.querySelector('textarea');
      const status = formElement.querySelector('[data-note-edit-status]');
      const buttons = [...formElement.querySelectorAll('button')];
      let saving = false;
      formElement.querySelector('[data-cancel-note-edit]').addEventListener('click', () => {
        if (saving) return;
        textarea.value = original.note;
        status.textContent = '';
        formElement.closest('details').open = false;
        formElement.closest('details').querySelector('summary').focus();
      });
      const persistNote = async action => {
        if (saving) return;
        saving = true;
        buttons.forEach(button => { button.disabled = true; });
        textarea.readOnly = true;
        status.textContent = action === 'deleteCoachNote' ? 'Wird gelöscht …' : 'Wird gespeichert …';
        try {
          await BT.api.individualAction(action, { profileId: profile.id, noteId: original.id, ...(action === 'editCoachNote' ? { note: textarea.value } : {}), expectedNote: original.note });
          await refresh();
        } catch (error) {
          status.textContent = error.message;
        } finally {
          saving = false;
          buttons.forEach(button => { button.disabled = false; });
          textarea.readOnly = false;
        }
      };
      formElement.addEventListener('submit', event => {
        event.preventDefault();
        persistNote('editCoachNote');
      });
      formElement.querySelector('[data-delete-coach-note]').addEventListener('click', () => {
        if (saving) return;
        if (!window.confirm('Private Notiz wirklich löschen? Das kann nicht rückgängig gemacht werden. Die Notiz wird bei der nächsten KI-Auswertung nicht mehr als Vorwissen eingelesen.')) return;
        persistNote('deleteCoachNote');
      });
    });
    host.querySelector('[data-release-feedback]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      if (form.get('shareWithPlayer') !== 'on') { notice(root, 'Bitte die Notiz ausdrücklich für den Spieler freigeben.', true); return; }
      try { await BT.api.individualAction('saveReleasedFeedback', { profileId: profile.id, content: form.get('content'), shareWithPlayer: true }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelectorAll('[data-set-attendance]').forEach(button => button.addEventListener('click', async () => {
      try { await coachAction('setAttendance', { profileId: profile.id, sessionId: activeSession.id, status: button.dataset.setAttendance }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    }));
    host.querySelector('[data-action="start-live-training"]')?.addEventListener('click', () => renderCoachLive(root.parentElement, profile, data, activeSession, displayExercises));
    host.querySelector('[data-refresh-session-plans]')?.addEventListener('click', async event => {
      const button=event.currentTarget,status=host.querySelector('[data-refresh-session-plans-status]');
      if(button.disabled)return;button.disabled=true;status.textContent='Rollenspezifische Pläne werden übernommen …';
      try { await BT.api.individualAction('refreshSessionPlans', { profileId: profile.id, sessionId: activeSession.id }); await refresh(); }
      catch (error) { status.textContent=error.message;button.disabled=false; }
    });
    host.querySelector('[data-cancel-session]')?.addEventListener('click', async () => {
      try { await BT.api.individualAction('cancelSession', { profileId: profile.id, sessionId: activeSession.id }); await refresh(); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelectorAll('[data-guided-measurement]').forEach(formElement => {
      const key=userKey(MEASUREMENT_DRAFT_PREFIX)+`:${profile.id}:${activeSession.id}:${formElement.dataset.exerciseId}:${formElement.dataset.metricKey}`;
      const draft=loadLocal(key,null),epoch=coachEpoch;
      if(draft){formElement.elements.value.value=draft.value;if(formElement.elements.attempt && draft.attempt)formElement.elements.attempt.value=draft.attempt;}
      const capture=()=>{try{saveLocal(key,{value:formElement.elements.value.value,attempt:formElement.elements.attempt?.value});}catch(error){notice(root,'Diese Eingabe kann auf diesem Gerät momentan nicht zwischengespeichert werden.',true);}};
      formElement.addEventListener('input',capture);formElement.addEventListener('change',capture);
      formElement.addEventListener('submit',async event=>{
        event.preventDefault();if(formElement.dataset.saving==='true')return;
        capture();const form=new FormData(formElement),numeric=formElement.dataset.valueType==='number';
        if(!String(form.get('value') || '').trim())return;
        formElement.dataset.saving='true';formElement.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=true);
        try {
          await coachAction('saveMeasurement',{profileId:profile.id,sessionId:activeSession.id,exerciseId:formElement.dataset.exerciseId || null,metricKey:formElement.dataset.metricKey,numericValue:numeric?Number(form.get('value')):null,textValue:numeric?null:form.get('value'),unit:formElement.dataset.unit || null,attempt:form.get('attempt')?Number(form.get('attempt')):null});
          if(epoch!==coachEpoch)return;localStorage.removeItem(key);await refresh();
        }catch(error){if(epoch===coachEpoch)notice(root,error.message,true);}
        finally{formElement.dataset.saving='false';formElement.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=false);}
      });
    });
    host.querySelector('[data-complete-session]')?.addEventListener('click', async event => {
      const button=event.currentTarget,status=host.querySelector('[data-complete-session-status]');
      if(button.disabled)return;button.disabled=true;status.textContent='Einheit wird abgeschlossen …';
      try {
        await coachAction('completeSession', { profileId: profile.id, sessionId: activeSession.id });
        await refresh();
      } catch (error) { status.textContent=error.message;button.disabled=false; }
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
      <div class="individual-cockpit-nav"><a class="btn small" href="#/individual">← Trainerübersicht</a><span>Individualtraining</span></div>
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
      <div class="individual-cockpit-nav"><a class="btn small" href="#/dashboard">← Startzentrale</a><span>Trainerübersicht</span></div>
      <div class="section-head individual-cockpit-head"><div><span class="section-kicker">Persönliche Spielerentwicklung</span><h2>Individualtraining</h2><p class="muted">Deine Spieler und alle offenen Aufgaben auf einen Blick.</p></div><span class="individual-unit-chip">Trainingsblock · 8 Einheiten</span></div>
      <p class="auth-status" data-role="individual-status" aria-live="polite"></p>
      <p class="muted" data-coach-auto-refresh role="status"></p>
      <div class="individual-profile-grid">${(data.profiles || []).length ? data.profiles.map(profile => profileCard(profile, data)).join('') : '<div class="empty">Noch kein Spieler hinzugefügt.</div>'}</div>
      <section class="card" data-role="individual-invite" hidden></section>
      <section data-role="individual-detail" hidden></section>
      <details class="card individual-setup"><summary>Spieler verwalten</summary><form data-create-profile><label>Spieler hinzufügen<select name="playerProfileId" required><option value="">Spieler wählen</option>${available.map(player => `<option value="${player.id}">${BT.util.escapeHTML(player.name)}</option>`).join('')}</select></label><label>Startdatum<input type="date" name="pilotStartedOn" value="2026-10-19"></label><button class="btn primary" type="submit" ${available.length ? '' : 'disabled'}>Profil anlegen</button></form><p>Maximal drei aktive Spieler je Trainer; eine Einheit hat höchstens zwei Teilnehmer.</p>${(data.profiles || []).filter(p=>!p.user_id && !(data.sessions||[]).some(s=>s.individual_profile_id===p.id)).map(p=>`<div data-profile-id="${p.id}"><button class="btn small" type="button" data-action="archive-unused-profile">Ungeplantes Profil ausblenden: ${BT.util.escapeHTML(playerName(p))}</button></div>`).join('')}</details>
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
      if (actionButton.dataset.action === 'archive-unused-profile') {
        actionButton.disabled = true;
        try { await BT.api.individualAction('archiveUnusedProfile', {profileId:profile.id}); await render(target); }
        catch (error) { notice(root,error.message,true); actionButton.disabled=false; }
        return;
      }
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
            try { if (navigator.share) await navigator.share({title:'CourtHub Individualtraining',text:'Deine persönliche CourtHub-Einladung',url}); else { await navigator.clipboard.writeText(url); inviteStatus.textContent='Link kopiert.'; } }
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
    BT.individualLive?.cleanup();
    stopCoachRefresh();
    const request = ++activeRequest;
    const current = user();
    const owner = contextKey();
    document.body.classList.remove('individual-live-mode');
    target.innerHTML = '<section class="view individual-view"><p class="muted">Individualtraining wird geladen …</p></section>';
    if (!current) {
      target.innerHTML = '<section class="view individual-view"><h2>Individualtraining</h2><p>Bitte zuerst anmelden.</p><a class="btn primary" href="#/account">Zur Anmeldung</a></section>';
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
          target.innerHTML = '<section class="view individual-view"><a class="btn small" href="#/individual">← Trainerübersicht</a><p class="auth-status error">Spielerprofil nicht gefunden.</p></section>';
        } else if (selectedProfile && selectedPane === 'preview') renderPlayer(target, data, {profileId:selectedProfile.id,pane:previewPane,preview:true,displayName:playerName(selectedProfile)});
        else if (selectedProfile) renderCoachDetailPage(target, selectedProfile, data, selectedPane);
        else renderCoach(target, data);
        if (data._offline || data._coachPending) {
          const status = document.createElement('p'); status.className = 'individual-sync-message'; status.setAttribute('role','status'); status.dataset.individualOfflineStatus = '';
          status.textContent = `${data._offline ? 'Offline: gespeicherter Trainingsstand. ' : ''}${data._coachPending ? `${data._coachPending} Eingaben nur auf diesem Gerät gespeichert; Übertragung erfolgt bei Verbindung. ` : ''}Für die Offline-Nutzung muss der Trainingsplan einmal online geöffnet worden sein.`;
          target.querySelector('.individual-view')?.prepend(status);
        }
        if (pilotStartError) notice(target.querySelector('.individual-view'), pilotStartError.message, true);
      }
    } catch (error) {
      if (request !== activeRequest || owner !== contextKey()) return;
      target.innerHTML = `<section class="view individual-view"><h2>Individualtraining</h2><p class="auth-status error">${BT.util.escapeHTML(error.message)}</p><button class="btn" data-retry>Erneut laden</button>${['admin','coach'].includes(current.role) ? '<a class="btn primary" href="#/individual/preview">Spieleransicht mit Beispieldaten ansehen</a><p>Einladungen und neue Spielerkonten benötigen eine erreichbare Datenbank.</p>' : ''}</section>`;
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
  function cleanup() { activeRequest++; stopCoachRefresh(); BT.individualLive?.cleanup(); }

  function applyNavigationForRole() {
    const role = user()?.role;
    const individual = document.querySelector('[data-nav="individual"]');
    if (individual) individual.hidden = !!role && !['admin', 'coach', 'player'].includes(role);
    const preview = ['admin','coach'].includes(role) && location.hash.match(/^#\/individual\/(?:player\/([^/]+)\/)?preview(?:\/([^/]+))?$/);
    if (preview) renderIndividualNavigation({profiles:[]},user(),preview[1] || null,'preview',preview[2] || 'overview');
    else if (role === 'player' && !location.hash.startsWith('#/personal')) renderIndividualNavigation({profiles:[]},user(),null,location.hash === '#/account' ? 'account' : location.hash.split('/')[2] || 'overview');
    else setPlayerNavigation('#/individual','overview',false);
    if (role === 'player' && !location.hash.startsWith('#/individual') && !location.hash.startsWith('#/personal') && !location.hash.startsWith('#/account')) location.hash = '#/individual';
  }

  async function renderAccountNavigation() {
    const current = user();
    if (!current) return renderIndividualNavigation({ profiles: [] }, { role: 'guest' });
    let data = { profiles: [] };
    try { data = await loadOverview(); } catch { /* Account stays usable offline without a cached overview. */ }
    if (location.hash === '#/individual/account' && user()?.id === current.id) renderIndividualNavigation(data, current, null, 'account');
  }

  window.addEventListener('bt-sync-change', applyNavigationForRole);
  window.addEventListener('online', () => { syncPending().catch(() => {}); syncCoachPending().catch(() => {}); });
  window.addEventListener('bt-sync-change', () => { if (BT.sync.getState().identitySource === 'server') syncCoachPending().catch(() => {}); });
  document.addEventListener('DOMContentLoaded', applyNavigationForRole);
  return { render, renderDemo, cleanup, renderHub, renderAccountNavigation, queueMutation, syncPending, coachAction, syncCoachPending, clearLocalData, applyNavigationForRole };
})();
