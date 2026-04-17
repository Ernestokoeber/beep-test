window.BT = window.BT || {};

BT.storage = (function() {
  const KEY = 'beepTest_v1';
  const CURRENT_SCHEMA = 2;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const data = JSON.parse(raw);
      if (!data.schemaVersion) return empty();
      data.players = data.players || [];
      data.sessions = data.sessions || [];
      data.trainings = data.trainings || [];
      data.notes = data.notes || [];
      data.freethrows = data.freethrows || [];
      data.drills = data.drills || [];
      if (data.schemaVersion < CURRENT_SCHEMA) {
        migrate(data);
        localStorage.setItem(KEY, JSON.stringify(data));
      }
      return data;
    } catch (e) {
      console.error('Storage load failed', e);
      return empty();
    }
  }

  function migrate(data) {
    if (data.schemaVersion < 2) {
      for (const t of data.trainings) {
        if (!t.seasonId) t.seasonId = BT.util.seasonForDate(t.date);
      }
      for (const s of data.sessions) {
        const d = s.date || (s.startedAt || '').slice(0, 10);
        if (!s.seasonId) s.seasonId = BT.util.seasonForDate(d);
      }
      data.schemaVersion = 2;
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function empty() {
    return { schemaVersion: CURRENT_SCHEMA, players: [], sessions: [], trainings: [], notes: [], freethrows: [], drills: [], settings: {} };
  }

  function getSetting(key, fallback) {
    const data = load();
    const s = data.settings || {};
    return s[key] !== undefined ? s[key] : fallback;
  }

  function setSetting(key, value) {
    const data = load();
    data.settings = data.settings || {};
    data.settings[key] = value;
    save(data);
  }

  function getPlayers() { return load().players; }

  function getPlayer(id) { return load().players.find(p => p.id === id); }

  function upsertPlayer(player) {
    const data = load();
    if (player.id) {
      const i = data.players.findIndex(p => p.id === player.id);
      if (i >= 0) { data.players[i] = Object.assign({}, data.players[i], player); }
    } else {
      player.id = BT.util.uuid('p_');
      player.createdAt = new Date().toISOString();
      player.archived = false;
      data.players.push(player);
    }
    save(data);
    return player;
  }

  function setArchived(id, archived) {
    const data = load();
    const p = data.players.find(p => p.id === id);
    if (p) { p.archived = archived; save(data); }
  }

  function deletePlayer(id) {
    const data = load();
    data.players = data.players.filter(p => p.id !== id);
    save(data);
  }

  function getSessions() {
    return load().sessions.slice().sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  }

  function getSession(id) { return load().sessions.find(s => s.id === id); }

  function createSession(session) {
    const data = load();
    session.id = BT.util.uuid('s_');
    session.startedAt = new Date().toISOString();
    session.results = session.results || [];
    if (!session.seasonId) {
      session.seasonId = BT.util.seasonForDate(session.date || session.startedAt.slice(0, 10));
    }
    data.sessions.push(session);
    save(data);
    return session;
  }

  function updateSession(session) {
    const data = load();
    const i = data.sessions.findIndex(s => s.id === session.id);
    if (i >= 0) { data.sessions[i] = session; save(data); }
  }

  function deleteSession(id) {
    const data = load();
    data.sessions = data.sessions.filter(s => s.id !== id);
    save(data);
  }

  function getTrainings() {
    return load().trainings.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function getTraining(id) { return load().trainings.find(t => t.id === id); }

  function upsertTraining(training) {
    const data = load();
    if (training.date) training.seasonId = BT.util.seasonForDate(training.date);
    if (training.id) {
      const i = data.trainings.findIndex(t => t.id === training.id);
      if (i >= 0) { data.trainings[i] = training; }
    } else {
      training.id = BT.util.uuid('tr_');
      training.createdAt = new Date().toISOString();
      data.trainings.push(training);
    }
    save(data);
    return training;
  }

  function deleteTraining(id) {
    const data = load();
    data.trainings = data.trainings.filter(t => t.id !== id);
    save(data);
  }

  function restoreTraining(training) {
    if (!training || !training.id) return;
    const data = load();
    if (data.trainings.some(t => t.id === training.id)) return;
    data.trainings.push(training);
    save(data);
  }

  function getNotes() {
    return load().notes.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  function getNote(id) { return load().notes.find(n => n.id === id); }

  function upsertNote(note) {
    const data = load();
    const now = new Date().toISOString();
    if (note.id) {
      const i = data.notes.findIndex(n => n.id === note.id);
      if (i >= 0) {
        data.notes[i] = Object.assign({}, data.notes[i], note, { updatedAt: now });
      }
    } else {
      note.id = BT.util.uuid('n_');
      note.createdAt = now;
      note.updatedAt = now;
      data.notes.push(note);
    }
    save(data);
    return note;
  }

  function deleteNote(id) {
    const data = load();
    data.notes = data.notes.filter(n => n.id !== id);
    save(data);
  }

  function restoreNote(note) {
    if (!note || !note.id) return;
    const data = load();
    if (data.notes.some(n => n.id === note.id)) return;
    data.notes.push(note);
    save(data);
  }

  function getDrills() {
    return (load().drills || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  }

  function getDrill(id) { return (load().drills || []).find(d => d.id === id); }

  function upsertDrill(drill) {
    const data = load();
    data.drills = data.drills || [];
    const now = new Date().toISOString();
    if (drill.id) {
      const i = data.drills.findIndex(d => d.id === drill.id);
      if (i >= 0) data.drills[i] = Object.assign({}, data.drills[i], drill, { updatedAt: now });
    } else {
      drill.id = BT.util.uuid('d_');
      drill.createdAt = now;
      drill.updatedAt = now;
      data.drills.push(drill);
    }
    save(data);
    return drill;
  }

  function deleteDrill(id) {
    const data = load();
    data.drills = (data.drills || []).filter(d => d.id !== id);
    save(data);
  }

  function restoreDrill(drill) {
    if (!drill || !drill.id) return;
    const data = load();
    data.drills = data.drills || [];
    if (data.drills.some(d => d.id === drill.id)) return;
    data.drills.push(drill);
    save(data);
  }

  function getSeasons() {
    const data = load();
    const set = new Set();
    for (const t of data.trainings) if (t.seasonId) set.add(t.seasonId);
    for (const s of data.sessions) if (s.seasonId) set.add(s.seasonId);
    set.add(BT.util.seasonForDate(BT.util.todayISO()));
    return Array.from(set).sort().reverse();
  }

  function getActiveSeason() {
    return getSetting('activeSeason', BT.util.seasonForDate(BT.util.todayISO()));
  }

  function setActiveSeason(id) {
    setSetting('activeSeason', id);
  }

  function inActiveSeason(item) {
    const active = getActiveSeason();
    if (!active || active === 'all') return true;
    return (item && item.seasonId) === active;
  }

  const DEFAULT_SHOT_CATEGORIES = ['Layup', 'Mitteldistanz', '3er'];

  function getShotCategories() {
    const cats = getSetting('shotCategories', null);
    if (!Array.isArray(cats) || cats.length === 0) return DEFAULT_SHOT_CATEGORIES.slice();
    return cats.slice();
  }

  function setShotCategories(list) {
    setSetting('shotCategories', list.slice());
  }

  function getFreethrows() {
    return load().freethrows.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function getFreethrow(id) { return load().freethrows.find(f => f.id === id); }

  function upsertFreethrow(ft) {
    const data = load();
    if (ft.id) {
      const i = data.freethrows.findIndex(f => f.id === ft.id);
      if (i >= 0) data.freethrows[i] = ft;
    } else {
      ft.id = BT.util.uuid('ft_');
      ft.createdAt = new Date().toISOString();
      data.freethrows.push(ft);
    }
    save(data);
    return ft;
  }

  function deleteFreethrow(id) {
    const data = load();
    data.freethrows = data.freethrows.filter(f => f.id !== id);
    save(data);
  }

  return {
    load, save,
    getPlayers, getPlayer, upsertPlayer, setArchived, deletePlayer,
    getSessions, getSession, createSession, updateSession, deleteSession,
    getTrainings, getTraining, upsertTraining, deleteTraining, restoreTraining,
    getNotes, getNote, upsertNote, deleteNote, restoreNote,
    getDrills, getDrill, upsertDrill, deleteDrill, restoreDrill,
    getFreethrows, getFreethrow, upsertFreethrow, deleteFreethrow,
    getShotCategories, setShotCategories,
    getSetting, setSetting,
    getSeasons, getActiveSeason, setActiveSeason, inActiveSeason
  };
})();
