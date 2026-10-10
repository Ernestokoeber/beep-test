window.BT = window.BT || {};

BT.storage = (function() {
  const KEY = 'beepTest_v1';
  const CURRENT_SCHEMA = 4;
  let readCache = null;

  function load() {
    if (readCache) return readCache;
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
      data.games = data.games || [];
      data.opponents = data.opponents || [];
      data.tableDuties = data.tableDuties || [];
      data.jerseyDuties = data.jerseyDuties || [];
      data.tactics = data.tactics || [];
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

  // Statistik-Ansichten lesen denselben Datenbestand sehr oft hintereinander.
  // Innerhalb dieses begrenzten Blocks reicht ein einziger JSON-Parse; nach dem
  // Callback wird der Cache immer verworfen, damit normale Schreibvorgaenge ihr
  // bisheriges Verhalten behalten.
  function withReadCache(callback) {
    if (typeof callback !== 'function') throw new TypeError('callback muss eine Funktion sein.');
    if (readCache) return callback(readCache);
    readCache = load();
    try {
      return callback(readCache);
    } finally {
      readCache = null;
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
    if (data.schemaVersion < 3) {
      data.games = data.games || [];
      for (const player of data.players) {
        if (!player.availability) player.availability = 'ready';
        if (!Array.isArray(player.goals)) player.goals = [];
      }
      data.schemaVersion = 3;
    }
    if (data.schemaVersion < 4) {
      data.opponents = data.opponents || [];
      data.schemaVersion = 4;
    }
  }

  function normalizedTnaNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{9}$/.test(value)) {
      throw new TypeError('TNA-Nummer: genau neun Ziffern als Text eingeben.');
    }
    return value;
  }

  function validatePlayerTnaNumbers(players) {
    for (const player of players || []) {
      if (player && Object.prototype.hasOwnProperty.call(player, 'tnaNumber')) {
        player.tnaNumber = normalizedTnaNumber(player.tnaNumber);
      }
    }
  }

  function save(data, options) {
    const config = options || {};
    validatePlayerTnaNumbers(data.players);
    data.meta = data.meta || {};
    if (!config.preserveTimestamp) data.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(data));
    if (!config.fromSync && window.BT && BT.sync && BT.sync.queueSave) BT.sync.queueSave(data);
  }

  function empty() {
    return { schemaVersion: CURRENT_SCHEMA, meta: {}, players: [], sessions: [], trainings: [], games: [], opponents: [], tableDuties: [], jerseyDuties: [], notes: [], freethrows: [], drills: [], templates: [], phases: [], tactics: [], settings: {} };
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

  function attendanceForActivePlayers(date) {
    const targetDate = date || BT.util.todayISO();
    return getPlayers().filter(player => !player.archived).map(player => {
      const activeStatus = !player.availabilityUntil || player.availabilityUntil >= targetDate;
      const availability = activeStatus ? (player.availability || 'ready') : 'ready';
      let status = null;
      if (availability === 'injured') status = 'injured';
      else if (availability === 'away') status = 'excused';
      return { playerId: player.id, status, late: false, note: availability === 'ready' ? '' : (player.availabilityNote || '') };
    });
  }

  function getPlayer(id) { return load().players.find(p => p.id === id); }

  function upsertPlayer(player) {
    if (Object.prototype.hasOwnProperty.call(player, 'tnaNumber')) {
      player.tnaNumber = normalizedTnaNumber(player.tnaNumber);
    }
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
    BT.trainingShots?.sync(training);
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

  function getTactics() {
    return (load().tactics || []).slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  function getTactic(id) { return (load().tactics || []).find(tactic => tactic.id === id); }

  function upsertTactic(tactic) {
    const data = load();
    data.tactics = data.tactics || [];
    const now = new Date().toISOString();
    if (tactic.id) {
      const index = data.tactics.findIndex(item => item.id === tactic.id);
      if (index >= 0) data.tactics[index] = Object.assign({}, data.tactics[index], tactic, { updatedAt: now });
      else data.tactics.push(Object.assign({}, tactic, { createdAt: tactic.createdAt || now, updatedAt: now }));
    } else {
      tactic.id = BT.util.uuid('tac_');
      tactic.createdAt = now;
      tactic.updatedAt = now;
      data.tactics.push(tactic);
    }
    save(data);
    return tactic;
  }

  function deleteTactic(id) {
    const data = load();
    data.tactics = (data.tactics || []).filter(tactic => tactic.id !== id);
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

  function getTemplates() {
    return (load().templates || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  }

  function getTemplate(id) { return (load().templates || []).find(t => t.id === id); }

  function upsertTemplate(tpl) {
    const data = load();
    data.templates = data.templates || [];
    const now = new Date().toISOString();
    if (tpl.id) {
      const i = data.templates.findIndex(t => t.id === tpl.id);
      if (i >= 0) data.templates[i] = Object.assign({}, data.templates[i], tpl, { updatedAt: now });
    } else {
      tpl.id = BT.util.uuid('tpl_');
      tpl.createdAt = now;
      tpl.updatedAt = now;
      data.templates.push(tpl);
    }
    save(data);
    return tpl;
  }

  function deleteTemplate(id) {
    const data = load();
    data.templates = (data.templates || []).filter(t => t.id !== id);
    save(data);
  }

  function getPhases() {
    return (load().phases || []).slice().sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  }

  function upsertPhase(phase) {
    const data = load();
    data.phases = data.phases || [];
    if (phase.id) {
      const i = data.phases.findIndex(p => p.id === phase.id);
      if (i >= 0) data.phases[i] = Object.assign({}, data.phases[i], phase);
      else data.phases.push(phase);
    } else {
      phase.id = BT.util.uuid('ph_');
      data.phases.push(phase);
    }
    save(data);
    return phase;
  }

  function getPhaseForDate(dateStr) {
    const phases = (load().phases || []);
    return phases.find(p => p.start && p.end && dateStr >= p.start && dateStr <= p.end) || null;
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

  function getGames() {
    return (load().games || []).slice().sort((a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || '')));
  }

  function getGame(id) { return (load().games || []).find(game => game.id === id || game.externalId === id); }

  function upsertGame(game) {
    const data = load();
    data.games = data.games || [];
    const index = data.games.findIndex(item => item.id === game.id || (game.externalId && item.externalId === game.externalId));
    const now = new Date().toISOString();
    if (index >= 0) {
      // Imports and older open forms must not overwrite the independent live journal.
      if (data.games[index].liveStats && game.liveStats !== data.games[index].liveStats) {
        game = Object.assign({}, game, { liveStats: data.games[index].liveStats });
      }
      if (data.games[index].matchday) game = Object.assign({}, game, { matchday: data.games[index].matchday });
      data.games[index] = Object.assign({}, data.games[index], game, { id: data.games[index].id, updatedAt: now });
      game = data.games[index];
    } else {
      game.id = game.id || BT.util.uuid('game_');
      game.createdAt = now;
      game.updatedAt = now;
      game.seasonId = game.seasonId || BT.util.seasonForDate(game.date);
      data.games.push(game);
    }
    save(data);
    return game;
  }

  function deleteGame(id) {
    const data = load();
    data.games = (data.games || []).filter(game => game.id !== id);
    save(data);
  }

  function getOpponents() {
    return (load().opponents || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  }

  function getOpponent(idOrKey) {
    return (load().opponents || []).find(opponent => opponent.id === idOrKey || opponent.key === idOrKey);
  }

  function upsertOpponent(opponent) {
    const data = load();
    data.opponents = data.opponents || [];
    const index = data.opponents.findIndex(item => item.id === opponent.id || (opponent.key && item.key === opponent.key));
    const now = new Date().toISOString();
    if (index >= 0) {
      data.opponents[index] = Object.assign({}, data.opponents[index], opponent, {
        id: data.opponents[index].id,
        createdAt: data.opponents[index].createdAt || now,
        updatedAt: now
      });
      opponent = data.opponents[index];
    } else {
      opponent.id = opponent.id || BT.util.uuid('opp_');
      opponent.createdAt = now;
      opponent.updatedAt = now;
      data.opponents.push(opponent);
    }
    save(data);
    return opponent;
  }

  function deleteOpponent(id) {
    const data = load();
    data.opponents = (data.opponents || []).filter(opponent => opponent.id !== id);
    save(data);
  }

  function getJerseyDuties() {
    return (load().jerseyDuties || []).slice().sort((a, b) =>
      (b.takenOn || '').localeCompare(a.takenOn || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }

  function upsertJerseyDuty(item) {
    const data = load();
    const duties = data.jerseyDuties || [];
    const existing = item.id ? duties.find(entry => entry.id === item.id) : null;
    if (item.id && !existing) throw new Error('Der Waschdienst existiert nicht mehr.');
    const next = Object.assign({}, existing || {}, item);
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!['home', 'away'].includes(next.kit)) throw new Error('Wähle den Heim- oder Auswärtssatz.');
    if (typeof next.playerId !== 'string' || !next.playerId) throw new Error('Wähle einen aktiven Spieler.');
    const player = data.players.find(entry => entry.id === next.playerId);
    if ((!player && existing?.playerId !== next.playerId) || (player?.archived && existing?.playerId !== player.id)) throw new Error('Wähle einen aktiven Spieler.');
    if (!validDate(next.takenOn) || next.takenOn > BT.util.todayISO()) throw new Error('Die Mitnahme muss heute oder in der Vergangenheit liegen.');
    if (next.dueOn && (!validDate(next.dueOn) || next.dueOn < next.takenOn)) throw new Error('Die Rückgabe darf nicht vor der Mitnahme liegen.');
    if (!['pending', 'returned'].includes(next.status)) throw new Error('Ungültiger Waschstatus.');
    if (next.status === 'returned' && (!validDate(next.returnedOn) || next.returnedOn < next.takenOn || next.returnedOn > BT.util.todayISO())) throw new Error('Prüfe das Datum der sauberen Rückgabe.');
    if (next.status === 'pending' && duties.some(entry => entry.id !== next.id && entry.kit === next.kit && entry.status === 'pending')) throw new Error('Dieser Trikotsatz ist bereits bei einem Spieler. Bestätige zuerst die Rückgabe.');
    const now = new Date().toISOString();
    next.id = next.id || BT.util.uuid('jersey_');
    next.playerName = player?.name || existing?.playerName || 'Ehemaliger Spieler';
    next.seasonId = BT.util.seasonForDate(next.takenOn);
    next.createdAt = existing?.createdAt || now;
    next.updatedAt = now;
    if (next.status === 'pending') next.returnedOn = '';
    data.jerseyDuties = duties.filter(entry => entry.id !== next.id).concat(next);
    save(data);
    return next;
  }

  function deleteJerseyDuty(id) {
    const data = load();
    data.jerseyDuties = (data.jerseyDuties || []).filter(item => item.id !== id);
    save(data);
  }

  function getTableDuties() {
    return (load().tableDuties || []).slice().sort((a, b) =>
      ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || ''))
    );
  }

  function getTableDuty(id) {
    return (load().tableDuties || []).find(item => item.id === id);
  }

  function upsertTableDuty(item) {
    const data = load();
    data.tableDuties = data.tableDuties || [];
    const now = new Date().toISOString();
    const index = item.id ? data.tableDuties.findIndex(entry => entry.id === item.id) : -1;
    if (index >= 0) {
      data.tableDuties[index] = Object.assign({}, data.tableDuties[index], item, {
        id: data.tableDuties[index].id,
        updatedAt: now
      });
      item = data.tableDuties[index];
    } else {
      item.id = item.id || BT.util.uuid('duty_');
      item.createdAt = now;
      item.updatedAt = now;
      item.assignments = item.assignments || {};
      item.meetingMinutesBefore = Number(item.meetingMinutesBefore) || 45;
      data.tableDuties.push(item);
    }
    item.seasonId = item.seasonId || BT.util.seasonForDate(item.date);
    save(data);
    return item;
  }

  function deleteTableDuty(id) {
    const data = load();
    data.tableDuties = (data.tableDuties || []).filter(item => item.id !== id);
    save(data);
  }

  return {
    load, save, withReadCache,
    getPlayers, getPlayer, upsertPlayer, setArchived, deletePlayer, attendanceForActivePlayers,
    getSessions, getSession, createSession, updateSession, deleteSession,
    getTrainings, getTraining, upsertTraining, deleteTraining, restoreTraining,
    getNotes, getNote, upsertNote, deleteNote, restoreNote,
    getTactics, getTactic, upsertTactic, deleteTactic,
    getDrills, getDrill, upsertDrill, deleteDrill, restoreDrill,
    getTemplates, getTemplate, upsertTemplate, deleteTemplate,
    getFreethrows, getFreethrow, upsertFreethrow, deleteFreethrow,
    getGames, getGame, upsertGame, deleteGame,
    getOpponents, getOpponent, upsertOpponent, deleteOpponent,
    getJerseyDuties, upsertJerseyDuty, deleteJerseyDuty,
    getTableDuties, getTableDuty, upsertTableDuty, deleteTableDuty,
    getShotCategories, setShotCategories,
    getSetting, setSetting,
    getPhases, upsertPhase, getPhaseForDate,
    getSeasons, getActiveSeason, setActiveSeason, inActiveSeason
  };
})();

