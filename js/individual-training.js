window.BT = window.BT || {};

BT.individualTraining = (function() {
  const QUEUE_PREFIX = 'courthub_individual_queue:';
  const CACHE_PREFIX = 'courthub_individual_cache:';
  let activeRequest = 0;

  function user() { return BT.sync?.getState?.().user || null; }
  function userKey(prefix) { return prefix + (user()?.id || 'guest'); }
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
        if (key?.startsWith(QUEUE_PREFIX) || key?.startsWith(CACHE_PREFIX)) keys.push(key);
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
    if (navigator.onLine) await syncPending();
    return item;
  }

  async function syncPending() {
    const current = user();
    if (!current || current.role !== 'player' || !navigator.onLine) return { pending: loadLocal(userKey(QUEUE_PREFIX), []).length };
    const key = userKey(QUEUE_PREFIX);
    const queue = loadLocal(key, []);
    if (!queue.length) return { pending: 0 };
    const result = await BT.api.syncIndividualMutations(queue);
    const acknowledged = new Set((result.results || []).filter(item => item.applied || item.duplicate).map(item => item.mutation_id));
    const remaining = queue.filter(item => !acknowledged.has(item.mutationId));
    saveLocal(key, remaining);
    return { pending: remaining.length, results: result.results || [] };
  }

  async function loadOverview(profileId) {
    const key = userKey(CACHE_PREFIX);
    try {
      const data = await BT.api.getIndividualOverview(profileId);
      saveLocal(key, data);
      return data;
    } catch (error) {
      if (error.status !== 0) throw error;
      const cached = loadLocal(key, null);
      if (!cached) throw error;
      return cached;
    }
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

  function currentFocus(data, profileId) {
    const today = new Date().toISOString().slice(0, 10);
    return (data.focuses || []).find(item => item.individual_profile_id === profileId && item.valid_from <= today && item.valid_until >= today)
      || (data.focuses || []).find(item => item.individual_profile_id === profileId)
      || null;
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
    try {
      await queueMutation(kind, payload);
      notice(root, navigator.onLine ? success : `${success} Wird bei Verbindung synchronisiert.`);
      const data = await loadOverview();
      renderPlayer(root.parentElement, data);
    } catch (error) { notice(root, error.message, true); }
  }

  function renderPlayer(target, data) {
    const profile = data.profiles?.[0];
    if (!profile) {
      target.innerHTML = '<section class="view individual-view"><h2>Individual Training</h2><p class="empty">Das Konto ist noch keinem aktiven Spielerprofil zugeordnet.</p></section>';
      return;
    }
    const session = upcomingSession(data, profile.id);
    const focus = currentFocus(data, profile.id);
    const notifications = (data.notifications || []).filter(item => item.individual_profile_id === profile.id && !item.read_at);
    target.innerHTML = `<section class="view individual-view individual-player-dashboard">
      <div class="individual-hero"><div><span class="section-kicker">Dein persönlicher Bereich</span><h2>${BT.util.escapeHTML(playerName(profile))}</h2><p>Individual Training · Pilot 2026</p></div><span class="individual-unit-chip">${session?.unit_number ? `Einheit ${session.unit_number} von 8` : '8 Einheiten'}</span></div>
      <p class="auth-status" data-role="individual-status" aria-live="polite"></p>
      <div class="individual-grid">
        <section class="card individual-session-card"><span class="section-kicker">Nächste Montagseinheit</span><h3>${session ? fmt(session.scheduled_for) : 'Noch kein Termin geplant'}</h3><p>${session ? '105 Minuten · ein Korb · maximal zwei Spieler' : 'Der Coach trägt den nächsten offenen Termin ein.'}</p>
          ${session ? `<div class="individual-actions"><button class="btn primary" data-attendance="confirmed">Ich bin dabei</button><button class="btn" data-attendance="declined">Ich kann nicht</button></div>` : ''}
          ${session ? `<form data-readiness><label>Tagesform vor der Einheit <strong data-readiness-value>7</strong>/10<input name="score" type="range" min="1" max="10" value="7"></label><button class="btn" type="submit">Tagesform speichern</button><small>Bei einem niedrigen Wert sprechen Sie persönlich mit Ihrem Coach. Es werden keine Diagnosen erfasst.</small></form>` : ''}
        </section>
        <section class="card individual-focus-card"><span class="section-kicker">Wochenfokus</span><h3>${focus ? BT.util.escapeHTML(focus.title) : 'Nach der Montagseinheit verfügbar'}</h3>${focus ? `<ol><li>${BT.util.escapeHTML(focus.cue_one)}</li>${focus.cue_two ? `<li>${BT.util.escapeHTML(focus.cue_two)}</li>` : ''}</ol><p><strong>Gelungen, wenn:</strong> ${BT.util.escapeHTML(focus.success_indicator)}</p>` : '<p>Der Fokus enthält höchstens zwei Hinweise für das Freitagstraining.</p>'}<button class="btn" type="button" data-enable-push>Web-Push aktivieren</button></section>
      </div>
      ${notifications.length ? `<section class="card"><h3>Offene Erinnerungen</h3><ul class="individual-notifications">${notifications.map(item => `<li><strong>${item.kind === 'attendance' ? 'Individualtraining heute' : item.kind === 'focus' ? 'Fokus beachten' : 'Rückmeldung fällig'}</strong><span>${fmt(item.due_at)}</span></li>`).join('')}</ul></section>` : ''}
      ${focus ? `<section class="card"><div class="section-head"><div><span class="section-kicker">Nach dem Freitagstraining</span><h3>Kurze Rückmeldung</h3></div></div><form data-weekly-feedback class="individual-feedback-form">
        <input name="trainingDay" type="hidden" value="friday">
        <label>Datum<input name="trainingDate" type="date" required></label>
        <label>Wie oft kam die Situation vor?<select name="occurrence"><option value="often">Oft</option><option value="sometimes">Manchmal</option><option value="none">Keine Gelegenheit</option><option value="training_cancelled">Training ausgefallen</option><option value="not_participated">Nicht teilgenommen</option></select></label>
        <label>Umsetzung 1–5<input name="implementationScore" type="number" min="1" max="5" value="3"></label>
        <label>Optionale Notiz<textarea name="note" maxlength="1000"></textarea></label>
        <button class="btn primary" type="submit">Rückmeldung speichern</button>
      </form></section>` : ''}
      <section class="card"><h3>Freigegebenes Coach-Feedback</h3><div class="individual-feedback-list">${(data.releasedFeedback || []).length ? data.releasedFeedback.map(item => `<article><p>${BT.util.escapeHTML(item.content)}</p><small>${fmt(item.released_at)}</small></article>`).join('') : '<p class="muted">Noch kein Feedback freigegeben.</p>'}</div></section>
    </section>`;
    target.querySelectorAll('[data-attendance]').forEach(button => button.addEventListener('click', () => playerAction(target.querySelector('.individual-view'), 'attendance', { entityId: session.id, status: button.dataset.attendance }, 'Teilnahme gespeichert.')));
    target.querySelector('[data-enable-push]')?.addEventListener('click', () => enablePush(target.querySelector('.individual-view')));
    target.querySelector('[data-readiness]')?.addEventListener('input', event => {
      target.querySelector('[data-readiness-value]').textContent = event.target.value;
    });
    target.querySelector('[data-readiness]')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      playerAction(target.querySelector('.individual-view'), 'readiness', { entityId: session.id, score: Number(form.get('score')) }, 'Tagesform gespeichert.');
    });
    target.querySelector('[data-weekly-feedback]')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const occurrence = form.get('occurrence');
      playerAction(target.querySelector('.individual-view'), 'weekly_feedback', {
        entityId: crypto.randomUUID(), focusId: focus.id, trainingDay: form.get('trainingDay'), trainingDate: form.get('trainingDate'), occurrence,
        implementationScore: ['training_cancelled', 'not_participated'].includes(occurrence) ? null : Number(form.get('implementationScore')),
        note: form.get('note')
      }, 'Rückmeldung gespeichert.');
    });
  }

  function profileCard(profile, data) {
    const session = upcomingSession(data, profile.id);
    const drafts = (data.aiDrafts || []).filter(item => item.individual_profile_id === profile.id);
    const latestDraft = drafts[0];
    return `<article class="card individual-profile-card" data-profile-id="${profile.id}">
      <div><span class="section-kicker">Pilotspieler</span><h3>${BT.util.escapeHTML(playerName(profile))}</h3><p>${session ? `${fmt(session.scheduled_for)} · Einheit ${session.unit_number || '–'}` : 'Keine Einheit geplant'}</p></div>
      <div class="individual-profile-meta"><span>${profile.user_id ? 'Konto verbunden' : 'Einladung offen'}</span><span>Sync: ${Number(profile.pending_sync_count || 0) ? `${Number(profile.pending_sync_count)} offen` : 'aktuell'}</span><span>KI: ${latestDraft ? BT.util.escapeHTML(latestDraft.status) : 'noch kein Entwurf'}</span></div>
      <div class="individual-actions"><button class="btn" data-action="invite-player">Einladungslink</button><button class="btn primary" data-action="open-profile">Öffnen</button></div>
    </article>`;
  }

  function renderCoachDetail(root, profile, data) {
    const host = root.querySelector('[data-role="individual-detail"]');
    const sessions = (data.sessions || []).filter(item => item.individual_profile_id === profile.id);
    const activeSession = [...sessions].reverse().find(item => ['planned', 'in_progress'].includes(item.status)) || sessions.at(-1) || null;
    const plan = (data.plans || []).find(item => item.session_id === activeSession?.id && item.individual_profile_id === profile.id);
    const exercises = (data.exercises || []).filter(item => item.session_id === activeSession?.id && item.individual_profile_id === profile.id);
    const measurements = (data.measurements || []).filter(item => item.individual_profile_id === profile.id && item.session_id === activeSession?.id);
    const notes = (data.coachNotes || []).filter(item => item.individual_profile_id === profile.id);
    const feedback = (data.releasedFeedback || []).filter(item => item.individual_profile_id === profile.id);
    const drafts = (data.aiDrafts || []).filter(item => item.individual_profile_id === profile.id);
    const latestDraft = drafts[0] || null;
    host.hidden = false;
    host.innerHTML = `<div class="section-head"><div><span class="section-kicker">Coach-Ansicht</span><h3>${BT.util.escapeHTML(playerName(profile))}</h3></div></div>
      <div class="individual-detail-grid">
        <form class="card" data-plan-session><h4>Nächste Montagseinheit planen</h4><label>Datum<input name="scheduledDate" type="date" value="${nextPilotDate(data.sessions)}" readonly required></label><label>Startzeit<input name="scheduledTime" type="time" value="20:15" readonly required></label><label>Zweiter Teilnehmer, optional<select name="secondProfileId"><option value="">Einzeltraining</option>${(data.profiles || []).filter(item => item.id !== profile.id).map(item => `<option value="${item.id}">${BT.util.escapeHTML(playerName(item))}</option>`).join('')}</select></label><button class="btn primary" type="submit">105-Minuten-Einheit anlegen</button></form>
        <form class="card" data-coach-note><h4>Private Coach-Notiz</h4><textarea name="note" maxlength="5000" required></textarea><button class="btn" type="submit">Privat speichern</button></form>
        <form class="card" data-release-feedback><h4>Feedback freigeben</h4><textarea name="content" maxlength="5000" required></textarea><button class="btn primary" type="submit">Für Spieler freigeben</button></form>
      </div>
      ${activeSession ? `<section class="card"><div class="section-head"><div><span class="section-kicker">Durchführung</span><h4>Einheit ${activeSession.unit_number || '–'} · ${fmt(activeSession.scheduled_for)}</h4></div><span>${BT.util.escapeHTML(activeSession.status)}</span></div>
        <div class="individual-actions"><button class="btn" data-set-attendance="attended">Als anwesend bestätigen</button><button class="btn" data-set-attendance="unexcused_no_show">Unentschuldigt gefehlt</button><button class="btn danger" data-cancel-session>Einheit absagen</button></div>
        ${plan ? `<h4>${BT.util.escapeHTML(plan.title)}</h4><p>${BT.util.escapeHTML(plan.objective)}</p><ol class="individual-exercise-list">${exercises.map(exercise => `<li><strong>${exercise.position}. ${BT.util.escapeHTML(exercise.title)} · ${exercise.duration_minutes} Min.</strong><details><summary>Wiederholungen, Messung und Coaching</summary><p><b>Wiederholungen:</b> ${BT.util.escapeHTML(JSON.stringify(exercise.repetitions))}</p><p><b>Messung:</b> ${BT.util.escapeHTML(JSON.stringify(exercise.measurement_method))}</p><p><b>Coaching:</b> ${BT.util.escapeHTML((exercise.coaching_cues || []).join(' · '))}</p></details></li>`).join('')}</ol>` : '<p class="muted">Für diese Einheit ist noch kein Plan gespeichert.</p>'}
        <form data-measurement class="individual-feedback-form"><h4>Messwert erfassen</h4><label>Übung<select name="exerciseId"><option value="">Ohne Übungszuordnung</option>${exercises.map(exercise => `<option value="${exercise.id}">${exercise.position}. ${BT.util.escapeHTML(exercise.title)}</option>`).join('')}</select></label><label>Messwertschlüssel<input name="metricKey" required placeholder="z. B. wurf_treffer_frontal"></label><label>Numerischer Wert<input name="numericValue" type="number" step="0.01"></label><label>Oder Textwert<input name="textValue"></label><label>Einheit<input name="unit" placeholder="Treffer, Sekunden …"></label><label>Versuch<input name="attempt" type="number" min="1"></label><button class="btn" type="submit">Messwert speichern</button></form>
        <p>${measurements.length} Messwerte gespeichert.</p>
        <div class="individual-actions"><button class="btn primary" data-complete-session>Einheit abschließen und KI-Entwurf starten</button></div>
      </section>` : ''}
      ${activeSession ? `<form class="card individual-feedback-form" data-weekly-focus><h4>Persönlichen Wochenfokus freigeben</h4><label>Zielhandlung<input name="title" required maxlength="120"></label><label>Hinweis 1<input name="cueOne" required maxlength="240"></label><label>Hinweis 2, optional<input name="cueTwo" maxlength="240"></label><label>Gelungen, wenn …<input name="successIndicator" required maxlength="300"></label><label>Gültig ab<input name="validFrom" type="date" value="${datePlus(localBerlinDate(activeSession.scheduled_for), 1)}" readonly required></label><label>Gültig bis<input name="validUntil" type="date" value="${datePlus(localBerlinDate(activeSession.scheduled_for), 6)}" readonly required></label><button class="btn primary" type="submit">Wochenfokus veröffentlichen</button></form>` : ''}
      <section class="card private-coach-card"><h4>Privater KI-Entwurf</h4>${latestDraft ? `<p>Status: <strong>${BT.util.escapeHTML(latestDraft.status)}</strong></p>${latestDraft.content ? `<h5>${BT.util.escapeHTML(latestDraft.content.nextSession?.title || '')}</h5><p>${BT.util.escapeHTML(latestDraft.content.analysis || '')}</p><p><b>Wochenfokus:</b> ${BT.util.escapeHTML(latestDraft.content.weeklyFocus?.title || '')}</p>` : ''}<div class="individual-actions">${['queued', 'failed'].includes(latestDraft.status) ? '<button class="btn" data-generate-draft>Entwurf erzeugen</button>' : ''}${latestDraft.status === 'stale' ? '<button class="btn" data-regenerate-draft>Aktuell neu erzeugen</button>' : ''}${latestDraft.status === 'current' ? '<button class="btn primary" data-approve-draft>Prüfung bestätigen und veröffentlichen</button>' : ''}</div>` : '<p class="muted">Nach Abschluss und Synchronisierung wird pro Spieler ein Entwurf angelegt.</p>'}</section>
      <section class="card"><h4>Einheiten</h4>${sessions.length ? `<ul>${sessions.map(item => `<li>${fmt(item.scheduled_for)} · ${BT.util.escapeHTML(item.status)} · Einheit ${item.unit_number || '–'} · ${BT.util.escapeHTML(item.attendance_status)}</li>`).join('')}</ul>` : '<p class="muted">Noch keine Einheit angelegt.</p>'}</section>
      <section class="card private-coach-card"><h4>Private Notizen</h4>${notes.length ? notes.map(item => `<p>${BT.util.escapeHTML(item.note)} <small>${fmt(item.created_at)}</small></p>`).join('') : '<p class="muted">Keine privaten Notizen.</p>'}</section>
      <section class="card"><h4>Freigegebenes Feedback</h4>${feedback.length ? feedback.map(item => `<p>${BT.util.escapeHTML(item.content)}</p>`).join('') : '<p class="muted">Noch nichts freigegeben.</p>'}</section>`;
    host.querySelector('[data-plan-session]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const secondProfileId = form.get('secondProfileId');
      try { await BT.api.individualAction('createSession', { profileIds: [profile.id, secondProfileId].filter(Boolean), scheduledDate: form.get('scheduledDate'), scheduledTime: form.get('scheduledTime'), durationMinutes: 105 }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-coach-note]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('addCoachNote', { profileId: profile.id, note: form.get('note') }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-release-feedback]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('saveReleasedFeedback', { profileId: profile.id, content: form.get('content') }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelectorAll('[data-set-attendance]').forEach(button => button.addEventListener('click', async () => {
      try { await BT.api.individualAction('setAttendance', { profileId: profile.id, sessionId: activeSession.id, status: button.dataset.setAttendance }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    }));
    host.querySelector('[data-cancel-session]')?.addEventListener('click', async () => {
      try { await BT.api.individualAction('cancelSession', { profileId: profile.id, sessionId: activeSession.id }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-measurement]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const numeric = form.get('numericValue');
      try { await BT.api.individualAction('saveMeasurement', { profileId: profile.id, sessionId: activeSession.id, exerciseId: form.get('exerciseId') || null, metricKey: form.get('metricKey'), numericValue: numeric === '' ? null : Number(numeric), textValue: numeric === '' ? form.get('textValue') : null, unit: form.get('unit') || null, attempt: form.get('attempt') ? Number(form.get('attempt')) : null }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-complete-session]')?.addEventListener('click', async () => {
      try {
        const result = await BT.api.individualAction('completeSession', { profileId: profile.id, sessionId: activeSession.id });
        await Promise.allSettled((result.queuedDrafts || []).map(draft => BT.api.individualAIDraft('generate', { profileId: draft.individual_profile_id, sessionId: draft.session_id })));
        await render(root.parentElement);
      } catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-weekly-focus]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('setFocus', { profileId: profile.id, sessionId: activeSession.id, title: form.get('title'), cueOne: form.get('cueOne'), cueTwo: form.get('cueTwo'), successIndicator: form.get('successIndicator'), validFrom: form.get('validFrom'), validUntil: form.get('validUntil') }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-generate-draft]')?.addEventListener('click', async () => {
      try { await BT.api.individualAIDraft('generate', { profileId: profile.id, sessionId: latestDraft.session_id }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-regenerate-draft]')?.addEventListener('click', async () => {
      try { await BT.api.individualAIDraft('regenerate', { profileId: profile.id, sessionId: latestDraft.session_id }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
    host.querySelector('[data-approve-draft]')?.addEventListener('click', async () => {
      try { await BT.api.individualAIDraft('approve', { draftId: latestDraft.id }); await render(root.parentElement); }
      catch (error) { notice(root, error.message, true); }
    });
  }

  function renderCoach(target, data) {
    const existing = new Set((data.profiles || []).map(profile => profile.player_profile_id));
    const available = (BT.storage?.getPlayers?.() || []).filter(player => !player.archived && !existing.has(player.id));
    target.innerHTML = `<section class="view individual-view individual-coach-cockpit">
      <div class="section-head"><div><span class="section-kicker">Getrennter Arbeitsbereich</span><h2>Individual Training</h2><p class="muted">Coach-Cockpit für den Pilot 2026</p></div></div>
      <p class="auth-status" data-role="individual-status" aria-live="polite"></p>
      <section class="card individual-setup"><form data-create-profile><label>Pilotspieler hinzufügen<select name="playerProfileId" required><option value="">Spieler wählen</option>${available.map(player => `<option value="${player.id}">${BT.util.escapeHTML(player.name)}</option>`).join('')}</select></label><label>Pilotstart<input type="date" name="pilotStartedOn" value="2026-10-19"></label><button class="btn primary" type="submit" ${available.length ? '' : 'disabled'}>Profil anlegen</button></form><p>Maximal drei aktive Spieler je Coach; eine Einheit hat höchstens zwei Teilnehmer.</p></section>
      <div class="individual-profile-grid">${(data.profiles || []).length ? data.profiles.map(profile => profileCard(profile, data)).join('') : '<div class="empty">Noch kein Individualprofil angelegt.</div>'}</div>
      <section class="card" data-role="individual-invite" hidden></section>
      <section data-role="individual-detail" hidden></section>
    </section>`;
    const root = target.querySelector('.individual-view');
    root.querySelector('[data-create-profile]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await BT.api.individualAction('createProfile', { playerProfileId: form.get('playerProfileId'), pilotStartedOn: form.get('pilotStartedOn') }); await render(target); }
      catch (error) { notice(root, error.message, true); }
    });
    root.querySelectorAll('[data-profile-id]').forEach(card => {
      const profile = data.profiles.find(item => item.id === card.dataset.profileId);
      card.querySelector('[data-action="open-profile"]').addEventListener('click', () => renderCoachDetail(root, profile, data));
      card.querySelector('[data-action="invite-player"]').addEventListener('click', async () => {
        try {
          const result = await BT.api.individualAction('createInvite', { profileId: profile.id, expiresInHours: 72 });
          const url = result.inviteUrl || `${location.origin}${location.pathname}?individualInvite=${encodeURIComponent(result.token)}#/account`;
          const inviteHost = root.querySelector('[data-role="individual-invite"]');
          inviteHost.hidden = false;
          inviteHost.innerHTML = `<h3>Einmalige Einladung für ${BT.util.escapeHTML(playerName(profile))}</h3>${result.qrDataUrl ? `<img src="${result.qrDataUrl}" width="240" height="240" alt="QR-Code für die einmalige CourtHub-Einladung">` : '<p>Für den Server-QR-Code muss PUBLIC_APP_URL gesetzt sein.</p>'}<p><a href="${BT.util.escapeHTML(url)}">Einladungslink öffnen</a></p><small>Der Link ist bis zur ersten Verwendung oder bis zum Ablauf gültig.</small>`;
          if (navigator.share) await navigator.share({ title: 'CourtHub Individual Training', text: 'Deine persönliche CourtHub-Einladung', url });
          else await navigator.clipboard.writeText(url);
          notice(root, 'Einladungslink wurde bereitgestellt. Er ist einmal verwendbar.');
        } catch (error) { notice(root, error.message, true); }
      });
    });
  }

  async function render(target) {
    const request = ++activeRequest;
    const current = user();
    target.innerHTML = '<section class="view individual-view"><p class="muted">Individual Training wird geladen …</p></section>';
    if (!current) {
      target.innerHTML = '<section class="view individual-view"><h2>Individual Training</h2><p>Bitte zuerst anmelden.</p><a class="btn primary" href="#/account">Zur Anmeldung</a></section>';
      return;
    }
    try {
      const data = await loadOverview();
      if (request !== activeRequest) return;
      if (current.role === 'player') renderPlayer(target, data);
      else renderCoach(target, data);
    } catch (error) {
      if (request !== activeRequest) return;
      target.innerHTML = `<section class="view individual-view"><h2>Individual Training</h2><p class="auth-status error">${BT.util.escapeHTML(error.message)}</p><button class="btn" data-retry>Erneut laden</button></section>`;
      target.querySelector('[data-retry]')?.addEventListener('click', () => render(target));
    }
  }

  function applyNavigationForRole() {
    const role = user()?.role;
    const individual = document.querySelector('[data-nav="individual"]');
    if (individual) individual.hidden = !!role && !['admin', 'coach', 'player'].includes(role);
    document.body.classList.toggle('individual-player-mode', role === 'player');
    if (role === 'player' && !location.hash.startsWith('#/individual') && !location.hash.startsWith('#/account')) location.hash = '#/individual';
  }

  window.addEventListener('bt-sync-change', applyNavigationForRole);
  window.addEventListener('online', () => syncPending().catch(() => {}));
  document.addEventListener('DOMContentLoaded', applyNavigationForRole);
  return { render, queueMutation, syncPending, clearLocalData, applyNavigationForRole };
})();
