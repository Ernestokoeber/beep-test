window.BT = window.BT || {};

BT.storage = (function() {
  const KEY = 'beepTest_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const data = JSON.parse(raw);
      if (!data.schemaVersion) return empty();
      data.players = data.players || [];
      data.sessions = data.sessions || [];
      data.trainings = data.trainings || [];
      return data;
    } catch (e) {
      console.error('Storage load failed', e);
      return empty();
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function empty() {
    return { schemaVersion: 1, players: [], sessions: [], trainings: [], settings: {} };
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

  return {
    load, save,
    getPlayers, getPlayer, upsertPlayer, setArchived, deletePlayer,
    getSessions, getSession, createSession, updateSession, deleteSession,
    getTrainings, getTraining, upsertTraining, deleteTraining,
    getSetting, setSetting
  };
})();
