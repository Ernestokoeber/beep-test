window.BT = window.BT || {};

BT.stationTraining = (() => {
  const SCHEMA_VERSION = 1;
  const DURATION_MINUTES = 105;
  const STATION_FAMILIES = [
    [
      ['Weak-Hand Handle', 'Nur schwache Hand: Rhythmuswechsel, In-&-Out und kontrollierter Richtungswechsel.'],
      ['Two-Ball Control', 'Zwei Bälle, unterschiedliche Höhen und Tempi; Kopf bleibt oben.'],
      ['Change-of-Pace Handle', 'Stop-and-go, Hesitation und explosiver erster Schritt ohne Gegner.'],
      ['Retreat & Re-Attack', 'Rückwärtsdribbling, neuer Winkel und erneuter Angriff mit beiden Händen.'],
      ['Pocket Dribble', 'Ball eng am Körper schützen, Hüfte tief und aus der Tasche explosiv beschleunigen.'],
      ['Combo Control', 'Crossover, Between und Behind in wechselnder Reihenfolge ohne Blick zum Ball.'],
      ['Reaction Handle', 'Auf Farb- oder Zahlensignal Hand, Richtung und Tempo spontan wechseln.'],
      ['Cone Constraints', 'Enger Parcours mit maximal zwei Kontakten zwischen den Hütchen.']
    ],
    [
      ['Footwork Shooting', '1-2-Stopp und Hop aus fünf Spots; nur saubere, ausbalancierte Würfe zählen.'],
      ['Catch-ready Shooting', 'Hände früh zeigen, Füße vor dem Fang vorbereiten, kurzer Dip.'],
      ['Relocation Shooting', 'Pass simulieren, neu positionieren und direkt wurfbereit sein.'],
      ['Game-speed Pull-up', 'Ein harter Dribblingkontakt, stabiler Stopp und kontrollierter Pull-up.'],
      ['Screen Footwork', 'Curl, Flare und Straight Cut simulieren; Füße vor dem Fang organisieren.'],
      ['Drift & Lift Shooting', 'Aus Corner und Wing passend zur Penetration verschieben und wurfbereit landen.'],
      ['Side-step Shooting', 'Closeout simulieren, ein kontrollierter Side-step und stabiler Abschluss.'],
      ['Make-streak Shooting', 'Nur Trefferfolgen zählen; Technik bleibt auch unter Ergebnisdruck konstant.']
    ],
    [
      ['Finishing Angles', 'Beide Seiten: Inside-Hand, Outside-Hand und Reverse mit Brett.'],
      ['Contact Finishing', 'Kontaktpolster oder eigener Widerstand vor dem letzten Schritt; Balance halten.'],
      ['Floater & Runner', 'Abschluss aus der Mitteldistanz über beide Füße und mit beiden Händen.'],
      ['Wrong-foot Finishing', 'Gegengleicher Absprung und schneller Abschluss vor der Helpside.'],
      ['Stride-stop & Pivot', 'Beidbeiniger Stopp, Verteidiger lesen und mit sauberem Pivot abschließen.'],
      ['Euro & Pro-hop', 'Seitlichen Raum gewinnen, Ball schützen und unter voller Kontrolle landen.'],
      ['High-glass Finishing', 'Ball hoch ans Brett bringen und Abschlusswinkel auf beiden Seiten variieren.'],
      ['Same-foot Finish', 'Gleicher Fuß und gleiche Hand für einen schnellen Abschluss ohne großen Anlauf.']
    ],
    [
      ['Closeout Footwork', 'Kurze Schritte, hohe Hände, Mitte schließen und kontrolliert abbremsen.'],
      ['Mirror Reaction', 'Partner spiegelt seitliche Bewegungen; Brust vor dem Ball und laut kommunizieren.'],
      ['First-three Steps', 'Die ersten drei Transitionschritte maximal sauber und schnell, dann kontrollieren.'],
      ['Rebound Footwork', 'Hit–Find–Get: Kontakt herstellen, drehen und Ball über Kinn sichern.'],
      ['Drop-step Recovery', 'Geschlagene Position öffnen, sprinten und vor dem Korb wieder stabil werden.'],
      ['Closeout Turn', 'Aus dem Closeout seitlich drehen, zweiten Drive stoppen und Balance behalten.'],
      ['Pursuit Rebound', 'Ballflug lesen, Kontakt suchen und den Rebound außerhalb der eigenen Zone verfolgen.'],
      ['Deceleration', 'Aus Tempo in zwei kurzen Schritten abbremsen und sofort wieder kontrolliert starten.']
    ],
    [
      ['Prehab & Core', 'Sprunggelenk, Knie, Hüfte und Rumpf kontrolliert stabilisieren.'],
      ['Landing Quality', 'Beid- und einbeinige Landungen: leise, stabil und Knie über dem Fuß.'],
      ['Mobility Reset', 'Hüfte, Sprunggelenk und Brustwirbelsäule mobilisieren; keine Schmerzprovokation.'],
      ['Free-throw Routine', 'Konstante Routine, Atmung und zehn dokumentierte Freiwürfe unter Ruhe.'],
      ['Band Stability', 'Schulterblatt und Hüfte mit leichtem Bandwiderstand kontrolliert stabilisieren.'],
      ['Ankle & Calf Capacity', 'Fußgewölbe, Sprunggelenk und Wade langsam und schmerzfrei belasten.'],
      ['Adductor & Hamstring', 'Adduktoren und hintere Kette isometrisch aktivieren, Rumpf stabil halten.'],
      ['Breathing Reset', 'Atmung beruhigen, Beweglichkeit zurückholen und Freiwurfroutine festigen.']
    ]
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const dateAtNoon = value => new Date(`${String(value || '')}T12:00:00`);
  const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const addDays = (value, days) => { const date = dateAtNoon(value); date.setDate(date.getDate() + days); return isoDate(date); };
  const clean = value => String(value == null ? '' : value).trim();

  function mondayFor(value) {
    const date = dateAtNoon(value);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return isoDate(date);
  }

  function weekNumber(value) {
    return Math.floor(dateAtNoon(mondayFor(value)).getTime() / (7 * 86400000));
  }

  function isMensGame(game) {
    return game && game.date && game.team !== 'u18' && !game.cancelled && game.status !== 'cancelled' && game.status !== 'abgesagt';
  }

  function weekendGameForFriday(friday, games = BT.storage.getGames()) {
    const date = dateAtNoon(friday);
    if (Number.isNaN(date.getTime()) || date.getDay() !== 5) return null;
    const saturday = addDays(friday, 1);
    const sunday = addDays(friday, 2);
    return (games || []).filter(isMensGame)
      .filter(game => game.date === saturday || game.date === sunday)
      .sort((left, right) => `${left.date}${left.time || ''}`.localeCompare(`${right.date}${right.time || ''}`))[0] || null;
  }

  function nextSuggestion(fromDate = BT.util.todayISO(), games = BT.storage.getGames(), trainings = BT.storage.getTrainings()) {
    for (let offset = 0; offset <= 21; offset += 1) {
      const friday = addDays(fromDate, offset);
      if (dateAtNoon(friday).getDay() !== 5) continue;
      const game = weekendGameForFriday(friday, games);
      if (!game) continue;
      const existing = (trainings || []).find(training => training.date === friday && !training.endedAt && training.status !== 'completed') || null;
      return { friday, game, existing };
    }
    return null;
  }

  function opponent(game) {
    return /lindau/i.test(game?.home || '') ? game.away : game?.home;
  }

  function stationsForDate(date) {
    const cycle = Math.abs(weekNumber(date));
    return STATION_FAMILIES.map((family, index) => {
      const selected = family[(cycle + index * 2) % family.length];
      return { id: `station_${index + 1}`, label: `Station ${index + 1}`, title: selected[0], description: selected[1], minutes: 15 };
    });
  }

  function planFor(date, game, stations) {
    const stationSummary = stations.map(station => `${station.label}: ${station.title}`).join(' · ');
    const rounds = stations.map((station, index) => ({
      id: `friday_round_${index + 1}`,
      name: `Stationsrunde ${index + 1}`,
      minutes: 15,
      intensity: 'medium',
      description: `Zur nächsten Station rotieren. Grün: volles geplantes Volumen · Gelb: etwa 70 % · Rot: Technik/Prehab ohne Schmerz. ${stationSummary}`
    }));
    return {
      durationMinutes: DURATION_MINUTES,
      summary: `Individuelle Belastungssteuerung vor dem Spiel gegen ${opponent(game) || 'den nächsten Gegner'}. Fünf wöchentlich wechselnde Stationen, Qualität vor Volumen.`,
      loadTarget: 'low',
      loadReason: game?.date === addDays(date, 1) ? 'Aktivierung einen Tag vor dem Spiel' : 'Kontrollierte individuelle Belastung zwei Tage vor dem Spiel',
      gameContext: { next: game ? { id: game.id, date: game.date, time: game.time || '', home: game.home || '', away: game.away || '' } : null },
      drills: [
        { id: 'friday_readiness', name: 'Readiness-Check & Tagesziel', minutes: 10, intensity: 'low', description: 'Tagesform, Schmerzen, Spielminuten und Wochenbelastung erfassen. Ampel und Ziel-RPE festlegen.' },
        { id: 'friday_warmup', name: 'Individuelle Aktivierung', minutes: 10, intensity: 'low', description: 'Mobilität, Ballgefühl und progressive Aktivierung. Keine ermüdenden Läufe.' },
        ...rounds,
        { id: 'friday_recovery', name: 'Cooldown & Session-RPE', minutes: 10, intensity: 'low', description: 'Herunterfahren, Beschwerden erneut prüfen und tatsächliche RPE pro Spieler dokumentieren.' }
      ]
    };
  }

  function gameMinutes(playerId, date, games = BT.storage.getGames()) {
    const start = addDays(date, -6);
    return (games || []).filter(game => game.date >= start && game.date <= date).reduce((sum, game) => {
      const stat = (game.playerStats || []).find(item => item.playerId === playerId);
      return sum + clamp(stat?.minutes, 0, 80);
    }, 0);
  }

  function trainingLoad(playerId, date, trainings = BT.storage.getTrainings()) {
    const start = addDays(date, -6);
    return (trainings || []).filter(training => training.date >= start && training.date < date && (training.endedAt || training.status === 'completed')).reduce((sum, training) => {
      const attendance = (BT.staff?.playerAttendance(training) || training.attendance || []).find(item => item.playerId === playerId);
      if (attendance?.status !== 'present') return sum;
      const stationPlayer = training.stationTraining?.players?.[playerId];
      const drills = training.plan?.drills || [];
      const drillMinutes = drills.reduce((total, drill) => total + (Number(drill.minutes) || 0), 0);
      const estimatedRpe = drillMinutes
        ? drills.reduce((total, drill) => total + (Number(drill.minutes) || 0) * ({ low: 3, medium: 5, high: 7 }[drill.intensity] || 5), 0) / drillMinutes
        : ({ low: 3, medium: 5, high: 7 }[training.plan?.loadTarget] || 5);
      const rpe = clamp(stationPlayer?.actualRpe || estimatedRpe, 1, 10);
      const minutes = clamp(training.liveSession?.report?.actualSeconds / 60 || training.plan?.durationMinutes || 0, 0, 240);
      return sum + Math.round(rpe * minutes);
    }, 0);
  }

  function recommendation(entry, gameDate, friday) {
    const minutes = clamp(entry.gameMinutes, 0, 200);
    const load = clamp(entry.baseTrainingLoad, 0, 5000) + minutes * 10;
    const readiness = clamp(entry.readiness || 4, 1, 5);
    const pain = clamp(entry.pain, 0, 10);
    const nextDay = gameDate === addDays(friday, 1);
    if (entry.injured) return {
      light: 'red', targetRpe: 1, weeklyLoad: load,
      message: 'Keine normale Stationsbelastung. Nur ausdrücklich medizinisch freigegebene, schmerzfreie Reha/Prehab; sonst pausieren.'
    };
    let light = 'green';
    if (pain >= 5 || readiness <= 2 || load >= 800) light = 'red';
    else if (pain >= 2 || readiness === 3 || load >= 500 || minutes >= 25) light = 'yellow';
    const targetRpe = light === 'red' ? 2 : light === 'yellow' ? 3 : nextDay ? 4 : 5;
    const message = light === 'red'
      ? 'Nur schmerzfreie Technik, Wurf und Prehab; Sprünge und harte Richtungswechsel auslassen.'
      : light === 'yellow'
        ? 'Volumen auf etwa 70 % reduzieren, längere Pausen und keine Zusatzbelastung.'
        : `Alle Stationen in sauberer Qualität; Belastung bei RPE ${targetRpe} deckeln.`;
    return { light, targetRpe, weeklyLoad: load, message };
  }

  function createState(training, game, stations = stationsForDate(training.date)) {
    const players = {};
    BT.storage.getPlayers().filter(player => !player.archived && !BT.staff?.isCoachOnly(training, player.id)).forEach(player => {
      const minutes = gameMinutes(player.id, training.date);
      const attendance=(training.attendance||[]).find(item=>item.playerId===player.id);
      const availabilityActive=!player.availabilityUntil||player.availabilityUntil>=training.date;
      const entry = {
        injured: attendance?.status==='injured'||availabilityActive&&player.availability==='injured',
        readiness: 4,
        pain: 0,
        gameMinutes: minutes,
        gameMinutesAuto: minutes,
        baseTrainingLoad: trainingLoad(player.id, training.date),
        actualRpe: null,
        note: ''
      };
      Object.assign(entry, recommendation(entry, game?.date, training.date));
      players[player.id] = entry;
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      weekKey: mondayFor(training.date),
      gameId: game?.id || null,
      gameDate: game?.date || null,
      generatedAt: new Date().toISOString(),
      stations,
      players
    };
  }

  function restorePlayerInputs(state, previousPlayers, game, training) {
    Object.keys(state.players).forEach(playerId => {
      const previous = previousPlayers[playerId];
      if (!previous) return;
      state.players[playerId] = Object.assign(state.players[playerId], {
        readiness: previous.readiness,
        pain: previous.pain,
        gameMinutes: previous.gameMinutes,
        actualRpe: previous.actualRpe,
        note: previous.note
      });
      Object.assign(state.players[playerId], recommendation(state.players[playerId], game.date, training.date));
    });
  }

  function apply(training, game = weekendGameForFriday(training.date)) {
    if (!training || !game) return false;
    const previousPlayers = training.stationTraining?.players || {};
    const state = createState(training, game);
    restorePlayerInputs(state, previousPlayers, game, training);
    training.plan = planFor(training.date, game, state.stations);
    training.stationTraining = state;
    training.note = `Freitags-Stationstraining vor ${opponent(game) || 'dem Spiel'}`;
    training.planning = {
      source: 'friday-stations', status: 'ready', coachEdited: false,
      generatedAt: state.generatedAt, loadTarget: 'individual'
    };
    return training;
  }

  function normalizeAIStations(entry) {
    const input = entry?.stationTraining?.stations;
    if (!Array.isArray(input) || input.length !== 5) return null;
    const stations = input.map((station, index) => ({
      id: `station_${index + 1}`,
      label: `Station ${index + 1}`,
      title: clean(station?.title).slice(0, 120),
      category: clean(station?.category).slice(0, 80),
      description: clean(station?.description).slice(0, 800),
      ...(Array.isArray(station.shotTargets) ? { shotTargets: station.shotTargets.map(target => ({ ...target })) } : {}),
      minutes: 15
    }));
    return stations.every(station => station.title && station.category && station.description) ? stations : null;
  }

  function planFromAI(entry, date, game, stations) {
    const drills = Array.isArray(entry?.drills) ? entry.drills.map((drill, index) => ({
      id: `friday_ai_${index + 1}`,
      name: clean(drill?.name).slice(0, 120),
      minutes: Number(drill?.minutes) || 0,
      intensity: ['low', 'medium', 'high'].includes(drill?.intensity) ? drill.intensity : 'low',
      description: clean(drill?.description).slice(0, 800),
      ...(Array.isArray(drill.shotTargets) ? { shotTargets: drill.shotTargets.map(target => ({ ...target })) } : {})
    })) : [];
    const expectedMinutes = [10, 10, 15, 15, 15, 15, 15, 10];
    if (drills.length !== expectedMinutes.length || drills.some((drill, index) => !drill.name || !drill.description || drill.minutes !== expectedMinutes[index])) return null;
    const fallback = planFor(date, game, stations);
    return Object.assign(fallback, {
      summary: clean(entry.summary).slice(0, 500) || fallback.summary,
      evidenceBasis: {
        observedTrends: (entry.evidenceBasis?.observedTrends || []).map(value => clean(value).slice(0, 300)).slice(0, 4),
        loadConsiderations: (entry.evidenceBasis?.loadConsiderations || []).map(value => clean(value).slice(0, 300)).slice(0, 4),
        planningDecision: clean(entry.evidenceBasis?.planningDecision).slice(0, 600)
      },
      drills,
      freethrows: entry.freethrows?.attempted >= 0 ? { attempted: Number(entry.freethrows.attempted) || 0 } : null,
      shots: Array.isArray(entry.shots) ? entry.shots.filter(item => clean(item?.category)).map(item => ({
        category: clean(item.category).slice(0, 100), attempted: Math.max(0, Number(item.attempted) || 0)
      })) : [],
      aiRationale: clean(entry.stationTraining?.rationale).slice(0, 500)
    });
  }

  function applyAI(training, game, entry) {
    if (!training || !game) return false;
    const stations = normalizeAIStations(entry);
    if (!stations) return false;
    const plan = planFromAI(entry, training.date, game, stations);
    if (!plan) return false;
    const previousPlayers = training.stationTraining?.players || {};
    const state = createState(training, game, stations);
    state.source = 'gemini';
    state.rationale = plan.aiRationale;
    restorePlayerInputs(state, previousPlayers, game, training);
    training.plan = plan;
    BT.trainingShots?.sync(training);
    training.stationTraining = state;
    training.note = plan.summary;
    training.planning = {
      source: 'ai-friday-stations', status: 'draft', coachEdited: false,
      generatedAt: state.generatedAt, loadTarget: 'individual'
    };
    return training;
  }

  function createOrUpdate(friday, game, existing) {
    const training = existing || {
      date: friday,
      startTime: BT.storage.getSetting('trainingStartTime', '20:15'),
      attendance: BT.storage.attendanceForActivePlayers(friday),
      freethrows: [], shots: []
    };
    apply(training, game);
    return BT.storage.upsertTraining(training);
  }

  function refreshPlayer(training, playerId) {
    const state = training.stationTraining;
    const entry = state?.players?.[playerId];
    if (!entry) return null;
    const player=BT.storage.getPlayer(playerId),attendance=(training.attendance||[]).find(item=>item.playerId===playerId);
    const availabilityActive=player&&(!player.availabilityUntil||player.availabilityUntil>=training.date);
    entry.injured=attendance?.status==='injured'||Boolean(availabilityActive&&player?.availability==='injured');
    Object.assign(entry, recommendation(entry, state.gameDate, training.date));
    return entry;
  }

  function ensurePlayers(training) {
    if (!training.stationTraining) return;
    training.stationTraining.players ||= {};
    BT.storage.getPlayers().filter(player => !player.archived && !BT.staff?.isCoachOnly(training, player.id)).forEach(player => {
      if (training.stationTraining.players[player.id]) return;
      const minutes = gameMinutes(player.id, training.date);
      training.stationTraining.players[player.id] = {
        readiness: 4, pain: 0, gameMinutes: minutes, gameMinutesAuto: minutes,
        baseTrainingLoad: trainingLoad(player.id, training.date), actualRpe: null, note: ''
      };
      refreshPlayer(training, player.id);
    });
  }

  function render(target, training, onSave) {
    if (!target) return;
    if (!training.stationTraining) { target.replaceChildren(); return; }
    ensurePlayers(training);
    const escapeHTML = BT.util.escapeHTML;
    const state = training.stationTraining;
    const players = BT.storage.getPlayers().filter(player => !player.archived && !BT.staff?.isCoachOnly(training, player.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    players.forEach(player => refreshPlayer(training, player.id));
    const counts = players.reduce((result, player) => {
      result[state.players[player.id]?.light || 'green'] += 1; return result;
    }, { green: 0, yellow: 0, red: 0 });
    const groups = Array.from({ length: Math.min(5, Math.max(1, players.length)) }, () => []);
    players.filter(player=>!state.players[player.id]?.injured).forEach((player, index) => groups[index % groups.length].push(player.name));
    target.innerHTML = `
      <section class="station-overview">
        <div><span class="section-kicker">Freitag · 105 Minuten</span><h3>Individuelle Stationen & Belastungssteuerung</h3><p>Die Ampel wird aus Tagesform, Schmerzen, Spielminuten und der Belastung der letzten sieben Tage berechnet.</p></div>
        <div class="station-traffic-summary"><span class="traffic-green">${counts.green} Grün</span><span class="traffic-yellow">${counts.yellow} Gelb</span><span class="traffic-red">${counts.red} Rot</span></div>
      </section>
      <div class="station-grid">${state.stations.map((station, index) => `<article class="station-card"><span>${escapeHTML(station.label)} · ${station.minutes} min</span><h4>${escapeHTML(station.title)}</h4><p>${escapeHTML(station.description)}</p><small>Startgruppe: ${escapeHTML(groups[index]?.join(' / ') || 'offen')}</small></article>`).join('')}</div>
      <section class="station-load-section"><div class="section-head compact"><div><span class="section-kicker">Session-RPE</span><h3>Belastung pro Spieler</h3></div></div><div class="station-player-list">${players.map(player => {
        const entry = state.players[player.id];
        return `<article class="station-player-card" data-station-player="${escapeHTML(player.id)}">
          <header><strong>${escapeHTML(player.name)}</strong>${entry.injured?'<span class="att-chip bad">Verletzt · Schonung</span>':''}<span class="station-light station-light-${entry.light}">${entry.light === 'green' ? 'Grün' : entry.light === 'yellow' ? 'Gelb' : 'Rot'}</span><span>Ziel-RPE <b data-station-output="target">${entry.targetRpe}</b></span></header>
          <div class="station-player-fields">
            <label>Tagesform <select data-station-field="readiness"><option value="5" ${entry.readiness === 5 ? 'selected' : ''}>5 · sehr gut</option><option value="4" ${entry.readiness === 4 ? 'selected' : ''}>4 · gut</option><option value="3" ${entry.readiness === 3 ? 'selected' : ''}>3 · mittel</option><option value="2" ${entry.readiness === 2 ? 'selected' : ''}>2 · schwach</option><option value="1" ${entry.readiness === 1 ? 'selected' : ''}>1 · sehr schwach</option></select></label>
            <label>Schmerz 0–10 <input type="number" min="0" max="10" inputmode="numeric" data-station-field="pain" value="${entry.pain}"></label>
            <label>Spielminuten (7 Tage) <input type="number" min="0" max="200" inputmode="numeric" data-station-field="gameMinutes" value="${entry.gameMinutes}"></label>
            <label>Wochenlast <output data-station-output="load">${entry.weeklyLoad}</output></label>
            <label>RPE nach Training <input type="number" min="1" max="10" inputmode="numeric" data-station-field="actualRpe" value="${entry.actualRpe || ''}" placeholder="1–10"></label>
          </div>
          <p class="station-recommendation" data-station-output="message">${escapeHTML(entry.message)}</p>
          <label class="station-player-note">Notiz<input type="text" maxlength="300" data-station-field="note" value="${escapeHTML(entry.note || '')}" placeholder="z. B. Knie heute empfindlich"></label>
        </article>`;
      }).join('')}</div></section>`;

    target.querySelectorAll('[data-station-player]').forEach(card => {
      const playerId = card.dataset.stationPlayer;
      card.querySelectorAll('[data-station-field]').forEach(input => input.addEventListener('change', () => {
        const entry = state.players[playerId];
        const field = input.dataset.stationField;
        entry[field] = field === 'note' ? input.value.slice(0, 300) : input.value === '' ? null : Number(input.value);
        refreshPlayer(training, playerId);
        if (typeof onSave === 'function') onSave();
        render(target, training, onSave);
      }));
    });
  }

  return {
    DURATION_MINUTES,
    weekendGameForFriday,
    nextSuggestion,
    stationsForDate,
    gameMinutes,
    trainingLoad,
    recommendation,
    apply,
    applyAI,
    createOrUpdate,
    render,
    __test: { mondayFor, addDays, planFor, planFromAI, createState, normalizeAIStations }
  };
})();


