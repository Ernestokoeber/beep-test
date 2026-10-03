window.BT = window.BT || {};

BT.seasonplanner = (function() {
  const BAVARIA_SCHOOL_BREAKS = [
    { name: 'Sommerferien 2026', start: '2026-08-03', end: '2026-09-14' },
    { name: 'Allerheiligen 2026', start: '2026-11-02', end: '2026-11-06' },
    { name: 'Weihnachtsferien 2026/27', start: '2026-12-24', end: '2027-01-08' },
    { name: 'Frühjahrsferien 2027', start: '2027-02-08', end: '2027-02-12' },
    { name: 'Osterferien 2027', start: '2027-03-22', end: '2027-04-02' },
    { name: 'Pfingstferien 2027', start: '2027-05-18', end: '2027-05-28' },
    { name: 'Sommerferien 2027', start: '2027-08-02', end: '2027-09-13' }
  ];

  const BAVARIA_PUBLIC_HOLIDAYS = new Set([
    '2026-10-03', '2026-11-01', '2026-12-25', '2026-12-26',
    '2027-01-01', '2027-01-06', '2027-03-26', '2027-03-29',
    '2027-05-01', '2027-05-06', '2027-05-17', '2027-06-03',
    '2027-08-15', '2027-10-03', '2027-11-01', '2027-12-25', '2027-12-26'
  ]);

  const DAY_NUMBERS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

  function dateAtNoon(iso) {
    return new Date(String(iso || '') + 'T12:00:00');
  }

  function isoDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function daysBetween(from, to) {
    return Math.round((dateAtNoon(to) - dateAtNoon(from)) / 86400000);
  }

  function parseLeagueId(url) {
    const match = String(url || '').match(/\/liga\/(\d+)(?:\/|$)/i);
    return match ? Number(match[1]) : null;
  }

  function scheduleConfig() {
    const saved = BT.storage.getSetting('officialSchedule', {});
    return Object.assign({
      url: 'https://www.basketball-bund.net/static/#/liga/54509/spielplan',
      leagueId: 54509,
      teamId: 258298,
      teamName: 'TSV Lindau'
    }, saved || {});
  }

  function saveScheduleConfig(value) {
    const config = Object.assign({}, scheduleConfig(), value || {});
    config.leagueId = parseLeagueId(config.url) || Number(config.leagueId) || 54509;
    config.teamId = config.teamId === '' || config.teamId === null ? 0 : (Number(config.teamId) || 0);
    config.teamName = String(config.teamName || '').trim() || 'TSV Lindau';
    BT.storage.setSetting('officialSchedule', config);
    return config;
  }

  function closureFor(date) {
    const range = BAVARIA_SCHOOL_BREAKS.find(item => date >= item.start && date <= item.end);
    if (range) return range.name;
    if (BAVARIA_PUBLIC_HOLIDAYS.has(date)) return 'Gesetzlicher Feiertag in Bayern';
    return '';
  }

  function gameSummary(game) {
    if (!game) return null;
    return {
      id: game.externalId || game.id,
      date: game.date,
      time: game.time || '',
      home: game.home || '',
      away: game.away || '',
      score: game.score || '',
      cancelled: Boolean(game.cancelled),
      strengths: String(game.strengths || '').slice(0, 500),
      improvements: String(game.improvements || '').slice(0, 500),
      coachSummary: String(game.coachSummary || '').slice(0, 500)
    };
  }

  function loadTarget(date, previousGame, nextGame, weekday) {
    const after = previousGame ? daysBetween(previousGame.date, date) : null;
    const before = nextGame ? daysBetween(date, nextGame.date) : null;
    if (before !== null && before <= 1) return { level: 'low', reason: 'Aktivierung und taktische Klarheit unmittelbar vor dem Spiel' };
    if (after !== null && after <= 2) return { level: 'low', reason: 'Regeneration, Technik und Fehlerkorrektur nach dem Spiel' };
    if (before !== null && before <= 3) return { level: 'medium', reason: 'Spielspezifische Vorbereitung mit kontrollierter Belastung' };
    if (weekday === 'tue') return { level: 'high', reason: 'Hauptbelastung mit Entwicklungsschwerpunkt' };
    return { level: 'medium', reason: 'Qualität, Spielfluss und Vorbereitung auf die nächste Belastung' };
  }

  function buildSlots(games, options) {
    if (BT.opponents?.ensureFromOwnGames) BT.opponents.ensureFromOwnGames();
    const config = options || {};
    const allGames = (games || [])
      .filter(game => game && game.date && !game.cancelled)
      .slice()
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    if (!allGames.length) return [];
    const days = Array.isArray(config.days) && config.days.length ? config.days : ['tue', 'fri'];
    const dayNumbers = new Set(days.map(day => DAY_NUMBERS[day]).filter(value => value !== undefined));
    const start = dateAtNoon(config.startDate || BT.util.todayISO());
    const end = dateAtNoon(config.endDate || allGames[allGames.length - 1].date);
    const time = config.time || '20:15';
    const slots = [];
    for (let cursor = new Date(start), guard = 0; cursor <= end && guard < 500; cursor.setDate(cursor.getDate() + 1), guard++) {
      if (!dayNumbers.has(cursor.getDay())) continue;
      const date = isoDate(cursor);
      if (closureFor(date)) continue;
      if (allGames.some(game => game.date === date)) continue;
      const previousGame = allGames.filter(game => game.date < date).at(-1) || null;
      const nextGame = allGames.find(game => game.date > date) || null;
      const weekday = cursor.getDay() === 2 ? 'tue' : cursor.getDay() === 5 ? 'fri' : days.find(day => DAY_NUMBERS[day] === cursor.getDay());
      const load = loadTarget(date, previousGame, nextGame, weekday);
      const weekendGame = weekday === 'fri' && nextGame && (daysBetween(date, nextGame.date) === 1 || daysBetween(date, nextGame.date) === 2)
        ? nextGame : null;
      slots.push({
        date, weekday, time, load: load.level, loadReason: load.reason,
        durationMinutes: weekendGame ? 105 : Math.max(60, Number(BT.storage.getSetting('trainingDurationMinutes', 105)) || 105),
        fridayStationMode: Boolean(weekendGame), weekendGame: gameSummary(weekendGame),
        opponentContext: nextGame && BT.opponents?.contextForGame ? BT.opponents.contextForGame(nextGame) : null,
        daysAfterPreviousGame: previousGame ? daysBetween(previousGame.date, date) : null,
        daysBeforeNextGame: nextGame ? daysBetween(date, nextGame.date) : null,
        previousGame: gameSummary(previousGame), nextGame: gameSummary(nextGame)
      });
    }
    return slots;
  }

  function addDaysISO(value, days) {
    const date = dateAtNoon(value);
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function sumStats(rows, key) {
    return rows.reduce((sum, row) => sum + (Number(row?.[key]) || 0), 0);
  }

  function percent(made, attempted) {
    return attempted > 0 ? Math.round((made / attempted) * 100) : null;
  }

  function stringList(value, max = 4) {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return list.map(item => String(item).slice(0, 250)).slice(0, max);
  }

  function recentGameHistory(cutoffDate) {
    const playersById = new Map(BT.storage.getPlayers().map(player => [String(player.id), player.name]));
    const fromDate = addDaysISO(cutoffDate, -42);
    return BT.storage.getGames()
      .filter(game => game?.date >= fromDate && game.date < cutoffDate && game.team !== 'u18' && !game.cancelled)
      .filter(game => game.score || game.liveStats || game.atlas || (game.playerStats || []).length || game.strengths || game.improvements || game.coachSummary)
      .sort((left, right) => String(left.date).localeCompare(String(right.date)))
      .slice(-6)
      .map(game => {
        const rows = (game.playerStats || []).filter(row => row && row.playerId && Object.keys(row).some(key => key !== 'playerId' && row[key] !== null && row[key] !== ''));
        const fieldGoalsMade = sumStats(rows, 'fieldGoalsMade');
        const fieldGoalsAttempted = sumStats(rows, 'fieldGoalsAttempted');
        const freeThrowsMade = sumStats(rows, 'freeThrowsMade');
        const freeThrowsAttempted = sumStats(rows, 'freeThrowsAttempted');
        const atlas = game.atlas?.package || {};
        const atlasAnalysis = atlas.analysis || atlas.websiteSummary || atlas.summary || {};
        const atlasTotals = atlas.totals || atlasAnalysis.totals || {};
        return {
          date: game.date,
          opponent: /lindau/i.test(game.home || '') ? game.away || '' : game.home || '',
          venue: /lindau/i.test(game.home || '') ? 'home' : 'away',
          score: String(game.score || ''),
          observations: {
            strengths: String(game.strengths || '').slice(0, 500),
            improvements: String(game.improvements || '').slice(0, 500),
            coachSummary: String(game.coachSummary || '').slice(0, 500)
          },
          teamBoxscore: {
            playersRecorded: rows.length,
            minutes: sumStats(rows, 'minutes'),
            points: sumStats(rows, 'points'),
            fieldGoalsMade, fieldGoalsAttempted, fieldGoalPct: percent(fieldGoalsMade, fieldGoalsAttempted),
            freeThrowsMade, freeThrowsAttempted, freeThrowPct: percent(freeThrowsMade, freeThrowsAttempted),
            rebounds: sumStats(rows, 'rebounds'), assists: sumStats(rows, 'assists'),
            steals: sumStats(rows, 'steals'), blocks: sumStats(rows, 'blocks'),
            turnovers: sumStats(rows, 'turnovers'), fouls: sumStats(rows, 'fouls')
          },
          playerBoxscore: rows.slice(0, 16).map(row => ({
            player: String(playersById.get(String(row.playerId)) || row.playerId).slice(0, 80),
            minutes: Number(row.minutes) || 0, points: Number(row.points) || 0,
            fieldGoalsMade: Number(row.fieldGoalsMade) || 0, fieldGoalsAttempted: Number(row.fieldGoalsAttempted) || 0,
            freeThrowsMade: Number(row.freeThrowsMade) || 0, freeThrowsAttempted: Number(row.freeThrowsAttempted) || 0,
            rebounds: Number(row.rebounds) || 0, assists: Number(row.assists) || 0,
            steals: Number(row.steals) || 0, blocks: Number(row.blocks) || 0,
            turnovers: Number(row.turnovers) || 0, fouls: Number(row.fouls) || 0,
            plusMinus: row.plusMinus == null ? null : Number(row.plusMinus), note: String(row.note || '').slice(0, 100)
          })),
          reviewedAnalysis: {
            summary: String(atlasAnalysis.text || atlasAnalysis.summary || atlasAnalysis.narrative || '').slice(0, 400),
            strengths: stringList(atlasAnalysis.strengths || atlasAnalysis.positives),
            improvements: stringList(atlasAnalysis.improvements || atlasAnalysis.weaknesses),
            trainingFocus: stringList(atlasAnalysis.trainingFocus || atlasAnalysis.trainingRecommendations || atlasAnalysis.recommendations),
            verifiedTotals: Object.fromEntries(Object.entries(atlasTotals).filter(([, value]) => typeof value === 'number').slice(0, 16))
          },
          dataQuality: rows.length ? 'boxscore-recorded' : game.liveStats ? 'live-capture-without-boxscore-projection' : 'observations-only'
        };
      });
  }

  function recentTrainingHistory(cutoffDate) {
    const fromDate = addDaysISO(cutoffDate, -42);
    return BT.storage.getTrainings()
      .filter(training => training?.date >= fromDate && training.date < cutoffDate && (training.status === 'completed' || training.endedAt))
      .sort((left, right) => String(left.date).localeCompare(String(right.date)))
      .slice(-8)
      .map(training => {
        const attendance = (training.attendance || []).reduce((counts, entry) => {
          const key = ['present', 'absent', 'excused', 'injured'].includes(entry.status) ? entry.status : 'open';
          counts[key] += 1;
          return counts;
        }, { present: 0, absent: 0, excused: 0, injured: 0, open: 0 });
        const freeThrows = (training.freethrows || []).reduce((total, entry) => ({
          made: total.made + (Number(entry.made) || 0), attempted: total.attempted + (Number(entry.attempted) || 0)
        }), { made: 0, attempted: 0 });
        const shots = (training.shots || []).map(category => {
          const totals = (category.entries || []).reduce((total, entry) => ({
            made: total.made + (Number(entry.made) || 0), attempted: total.attempted + (Number(entry.attempted) || 0)
          }), { made: 0, attempted: 0 });
          return { category: category.category, ...totals, pct: percent(totals.made, totals.attempted) };
        });
        const rpeValues = Object.values(training.stationTraining?.players || {}).map(entry => Number(entry.actualRpe)).filter(value => value >= 1 && value <= 10);
        return {
          date: training.date,
          summary: String(training.plan?.summary || training.note || '').slice(0, 240),
          plannedMinutes: Number(training.plan?.durationMinutes) || 0,
          actualMinutes: Math.round((Number(training.liveSession?.report?.actualSeconds) || 0) / 60) || null,
          loadTarget: training.plan?.loadTarget || null,
          attendance,
          sessionRpe: rpeValues.length ? Math.round((rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length) * 10) / 10 : null,
          freeThrows: { ...freeThrows, pct: percent(freeThrows.made, freeThrows.attempted) },
          shots: shots.slice(0, 8),
          drills: (training.plan?.drills || []).slice(0, 8).map(drill => ({ name: String(drill.name || '').slice(0, 100), minutes: drill.minutes, intensity: drill.intensity }))
        };
      });
  }

  function playerLoadSnapshot(cutoffDate) {
    const station = BT.stationTraining;
    return BT.storage.getPlayers().filter(player => !player.archived).map(player => ({
      player: player.name,
      gameMinutesLast7Days: station?.gameMinutes ? station.gameMinutes(player.id, cutoffDate) : 0,
      trainingLoadLast7Days: station?.trainingLoad ? station.trainingLoad(player.id, cutoffDate) : 0
    }));
  }

  function playerLoadByWeek(cutoffDate) {
    const station = BT.stationTraining;
    const players = BT.storage.getPlayers().filter(player => !player.archived);
    return Array.from({ length: 4 }, (_, index) => {
      const weekEnding = addDaysISO(cutoffDate, -1 - index * 7);
      return {
        weekEnding,
        players: players.map(player => ({
          player: player.name,
          gameMinutes: station?.gameMinutes ? station.gameMinutes(player.id, weekEnding) : 0,
          trainingLoad: station?.trainingLoad ? station.trainingLoad(player.id, addDaysISO(weekEnding, 1)) : 0
        }))
      };
    }).reverse();
  }

  function performanceContext(slots) {
    const cutoffDate = (slots || []).map(slot => slot.date).filter(Boolean).sort()[0] || BT.util.todayISO();
    return {
      cutoffDate,
      lookbackDays: 42,
      games: recentGameHistory(cutoffDate),
      completedTrainings: recentTrainingHistory(cutoffDate),
      playerLoadByWeek: playerLoadByWeek(cutoffDate),
      playerLoadBeforeFirstSlot: playerLoadSnapshot(cutoffDate),
      interpretationRules: [
        'Nur vorhandene Werte verwenden; fehlende Werte sind kein negatives Ergebnis.',
        'Wiederkehrende Muster über mehrere Spiele oder Wochen stärker gewichten als Einzelereignisse.',
        'Trainerbeobachtungen mit Boxscore-, Trainings- und Belastungsdaten abgleichen.',
        'Planungsentscheidung und verwendete Evidenz in evidenceBasis offenlegen.'
      ]
    };
  }

  function buildAIPayload(slots, preferences) {
    return {
      team: scheduleConfig().teamName,
      durationMinutes: Math.max(60, Number(BT.storage.getSetting('trainingDurationMinutes', 105)) || 105),
      principles: {
        offense: 'Horns, 5-Out, Spacing, Entscheidungen und Transition',
        defense: 'No-Middle, Helpside-Kommunikation, Rebounding und Transition Defense',
        allowedDefenses: ['Mannverteidigung · No-Middle', 'Zone 2-1-2', 'Zone 2-3', 'Zone 3-2'],
        defenseRule: 'Nur diese vier trainierten Verteidigungen empfehlen. Mannverteidigung bleibt bei unzureichender Gegnerdatenlage die Basis.'
      },
      tacticalPlaybook: (BT.phase3Playbook?.entries || []).map(item => ({
        id: item.id, title: item.title, usage: item.usage, description: item.description,
        coachingPoints: item.coachingPoints, reads: item.reads
      })),
      weeklyStructure: {
        tuesday: 'Haupttrainingstag: höchste Wochenbelastung, neue Systeme und alle wichtigen Lerninhalte.',
        fridayGameWeek: 'Die KI erstellt für jede Spielwoche neu: 105 Minuten ausschließlich individuelles Stationstraining mit fünf neuen Stationen, Readiness, Belastungsampel und Session-RPE.',
        fridayWithoutWeekendGame: 'Technik, Entscheidungen und Small-Sided Games passend zur Spielerzahl.'
      },
      fridayLoadManagement: {
        inputs: ['Tagesform 1–5', 'Schmerzen 0–10', 'Spielminuten der letzten sieben Tage', 'Session-RPE und Wochenbelastung'],
        green: 'volles geplantes Volumen bis zum Ziel-RPE',
        yellow: 'etwa 70 Prozent Volumen, längere Pausen, keine Zusatzbelastung',
        red: 'nur schmerzfreie Technik, Wurf und Prehab; keine Sprünge oder harten Richtungswechsel'
      },
      balancePolicy: {
        problemInputRole: 'diagnostischer Hinweis, nicht Hauptschwerpunkt',
        maxProblemSharePercent: 25,
        fridayMaxProblemStations: 1,
        maxOpponentSpecificSharePercent: 25,
        preserve: ['langfristige Mannschaftsprinzipien', 'aktueller Schwerpunkt', 'technische Grundlagen', 'ausgewogene Belastung'],
        safetyException: 'Schmerzen, Verletzungen und Belastungsgrenzen haben immer Vorrang'
      },
      coachInput: preferences || {},
      slots,
      performanceContext: performanceContext(slots),
      instructions: 'Erzeuge für jeden Slot genau einen veränderbaren Trainingsentwurf. Belastungsvorgabe und Spielabstand müssen eingehalten werden. Nutze opponentContext nur mit der dort ausgewiesenen Datenqualität und erfinde keine fehlenden Gegnerwerte. Die Defense-Auswahl ist verbindlich auf Mannverteidigung mit No-Middle, Zone 2-1-2, Zone 2-3 und Zone 3-2 begrenzt. Verwende für Teamtaktik ausschließlich Inhalte aus tacticalPlaybook. Gegnerbezogene Inhalte dürfen höchstens 25 Prozent einer normalen Einheit ausmachen. Gewichte coachInput.problems ebenfalls mit höchstens 25 Prozent; ein Problem darf nie die ganze Einheit dominieren. Für fridayStationMode=true muss die KI selbst ein neues individuelles 105-Minuten-Stationstraining liefern, wobei höchstens eine von fünf Stationen das genannte Problem oder eine Gegnerbesonderheit aufgreift; verwende keine feste Rotation.'
    };
  }

  function splitAIPayload(payload) {
    const slots = (Array.isArray(payload?.slots) ? payload.slots : [])
      .slice()
      .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')));
    return slots.map((slot) => Object.assign({}, payload, { slots: [slot] }));
  }

  function validateBatchResponse(response, slots) {
    const invalid = (message) => {
      const error = new Error(message);
      error.code = 'AI_INVALID_RESPONSE';
      error.retryable = true;
      throw error;
    };
    const trainings = response?.data?.trainings;
    if (!Array.isArray(trainings)) invalid('KI-Antwort enthält keine Trainingsliste.');
    const expectedDates = slots.map(slot => slot.date);
    const receivedDates = trainings.map(training => String(training?.date || ''));
    const expected = new Set(expectedDates);
    const hasExactDates = receivedDates.length === expectedDates.length &&
      new Set(receivedDates).size === receivedDates.length &&
      receivedDates.every(date => expected.has(date));
    if (!hasExactDates) invalid('KI-Antwort enthält nicht genau den erwarteten Trainingstermin.');
    return trainings;
  }

  async function planInBatches(payload, requestBatch, onProgress, draftStore) {
    const batches = splitAIPayload(payload);
    const store = draftStore?.store || BT.seasonDraft;
    const scope = draftStore?.scope || null;
    const fingerprint = store?.fingerprint ? store.fingerprint(payload) : null;
    const saved = scope && store?.load ? store.load(scope, fingerprint) : null;
    let activeDraft = saved;
    const completedByIndex = new Map((saved?.completed || []).map((block) => [Number(block.index), block]));
    const completed = (saved?.completed || []).slice();
    const trainings = [];
    const models = new Set();
    const requestIds = [];
    let resumedBlocks = 0;

    for (let index = 0; index < batches.length; index++) {
      const resumed = completedByIndex.get(index);
      if (resumed) {
        trainings.push(...resumed.trainings);
        resumedBlocks += 1;
        if (onProgress) onProgress({ block: index + 1, total: batches.length, attempt: 0, resumed: true });
        continue;
      }
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (onProgress) onProgress({ block: index + 1, total: batches.length, attempt, resumed: false });
        try {
          const requestPayload = Object.assign({}, batches[index], {
            performanceContext: performanceContext(batches[index].slots),
            priorGeneratedTrainings: trainings.slice(-8).map(training => ({
              date: training.date,
              summary: training.summary,
              stations: (training.stationTraining?.stations || []).map(station => station.title)
            }))
          });
          const response = await requestBatch(requestPayload);
          const blockTrainings = validateBatchResponse(response, batches[index].slots);
          trainings.push(...blockTrainings);
          if (response.model) models.add(response.model);
          if (response.requestId) requestIds.push(response.requestId);
          const block = {
            index,
            dates: batches[index].slots.map(slot => slot.date),
            trainings: blockTrainings
          };
          completed.push(block);
          completedByIndex.set(index, block);
          if (scope && store?.save) {
            activeDraft = store.save(scope, {
              fingerprint,
              completed: completed.slice().sort((left, right) => left.index - right.index),
              nextIndex: index + 1,
              createdAt: activeDraft?.createdAt
            });
          }
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (error?.retryable !== true) break;
        }
      }
      if (lastError) {
        const error = new Error('KI-Training ' + (index + 1) + ' von ' + batches.length + ' fehlgeschlagen: ' + lastError.message);
        error.code = lastError.code || null;
        error.retryable = lastError.retryable === true;
        error.requestId = lastError.requestId || null;
        error.providerStatus = lastError.providerStatus || null;
        error.block = index + 1;
        throw error;
      }
    }
    return { trainings, resumedBlocks, models: [...models], requestIds };
  }

  function normalizeDrills(input, fallbackIntensity, durationMinutes) {
    const allowed = new Set(['low', 'medium', 'high']);
    const drills = Array.isArray(input) ? input.filter(drill => drill && drill.name).map(drill => ({
      name: String(drill.name).slice(0, 100),
      minutes: Math.max(1, Math.min(60, Number(drill.minutes) || 10)),
      description: String(drill.description || '').slice(0, 500),
      intensity: allowed.has(drill.intensity) ? drill.intensity : fallbackIntensity
    })) : [];
    if (!drills.length) return drills;
    const total = drills.reduce((sum, drill) => sum + drill.minutes, 0);
    if (total !== durationMinutes) {
      const factor = durationMinutes / total;
      let allocated = 0;
      drills.forEach((drill, index) => {
        drill.minutes = index === drills.length - 1
          ? Math.max(1, durationMinutes - allocated)
          : Math.max(1, Math.round(drill.minutes * factor));
        allocated += drill.minutes;
      });
      const difference = durationMinutes - drills.reduce((sum, drill) => sum + drill.minutes, 0);
      drills.at(-1).minutes = Math.max(1, drills.at(-1).minutes + difference);
    }
    return drills;
  }

  function normalizePlan(entry, slot, durationMinutes) {
    const drills = normalizeDrills(entry.drills, slot.load, durationMinutes);
    const variants = slot.weekday === 'fri' ? {
      over8: normalizeDrills(entry.fridayVariants?.over8, slot.load, durationMinutes),
      eightOrLess: normalizeDrills(entry.fridayVariants?.eightOrLess, slot.load, durationMinutes)
    } : null;
    return {
      summary: String(entry.summary || slot.loadReason).slice(0, 500),
      evidenceBasis: {
        observedTrends: (entry.evidenceBasis?.observedTrends || []).map(value => String(value).slice(0, 300)).slice(0, 4),
        loadConsiderations: (entry.evidenceBasis?.loadConsiderations || []).map(value => String(value).slice(0, 300)).slice(0, 4),
        planningDecision: String(entry.evidenceBasis?.planningDecision || '').slice(0, 600)
      },
      durationMinutes,
      loadTarget: slot.load,
      loadReason: slot.loadReason,
      gameContext: { previous: slot.previousGame, next: slot.nextGame },
      opponentPlan: slot.opponentContext ? {
        opponent: slot.opponentContext.opponent,
        defenseRecommendation: slot.opponentContext.defenseRecommendation,
        dataQuality: slot.opponentContext.dataQuality
      } : null,
      freethrows: entry.freethrows?.attempted ? { attempted: Math.max(1, Number(entry.freethrows.attempted)) } : null,
      shots: Array.isArray(entry.shots) ? entry.shots.filter(item => item?.category).map(item => ({ category: String(item.category).slice(0, 80), attempted: Math.max(1, Number(item.attempted) || 10) })) : [],
      drills,
      variants
    };
  }

  function saveToLibraries(plan, date) {
    const allDrills = [
      ...(plan.drills || []),
      ...(plan.variants?.over8 || []),
      ...(plan.variants?.eightOrLess || [])
    ];
    const existingDrills = BT.storage.getDrills();
    allDrills.forEach(drill => {
      const exists = existingDrills.some(item => String(item.name || '').trim().toLowerCase() === String(drill.name || '').trim().toLowerCase());
      if (!exists) {
        const created = BT.storage.upsertDrill({
          name: drill.name,
          category: 'KI-Saisonplanung',
          minutes: drill.minutes,
          intensity: drill.intensity,
          description: drill.description,
          source: 'ai-season'
        });
        existingDrills.push(created);
      }
    });

    const templates = BT.storage.getTemplates();
    const existingTemplate = templates.find(template => template.source === 'ai-season' && template.sourceDate === date);
    BT.storage.upsertTemplate({
      id: existingTemplate?.id,
      name: 'KI ' + BT.util.formatDate(date) + ' · ' + (plan.summary || 'Teamtraining'),
      source: 'ai-season', sourceDate: date,
      plan: {
        durationMinutes: plan.durationMinutes,
        summary: plan.summary,
        drills: plan.drills.map(drill => Object.assign({}, drill))
      },
      freethrowsAttempted: plan.freethrows?.attempted || 0,
      shotCategories: plan.shots.map(item => item.category)
    });
  }

  function applyAIPlan(response, slots) {
    const entries = Array.isArray(response?.trainings) ? response.trainings : [];
    const byDate = new Map(entries.map(entry => [entry.date, entry]));
    const existing = BT.storage.getTrainings();
    const duration = Math.max(60, Number(BT.storage.getSetting('trainingDurationMinutes', 105)) || 105);
    const result = { created: 0, updated: 0, protected: 0, missing: 0 };
    slots.forEach(slot => {
      const entry = byDate.get(slot.date);
      const current = existing.find(training => training.date === slot.date);
      const aiManaged = ['ai-season', 'ai-friday-stations', 'friday-stations'].includes(current?.planning?.source);
      const protectedTraining = current && (
        current.status === 'completed' || current.endedAt ||
        current.planning?.coachEdited || !aiManaged
      );
      if (protectedTraining) { result.protected++; return; }
      if (slot.fridayStationMode && BT.stationTraining) {
        if (!entry) { result.missing++; return; }
        const game = BT.storage.getGame(slot.weekendGame?.id) || slot.weekendGame || slot.nextGame;
        const base = current || {
          date: slot.date, startTime: slot.time,
          attendance: BT.storage.attendanceForActivePlayers(slot.date),
          freethrows: [], shots: []
        };
        base.startTime = slot.time;
        if (!BT.stationTraining.applyAI(base, game, entry)) { result.missing++; return; }
        BT.storage.upsertTraining(base);
        if (current) result.updated++;
        else result.created++;
        return;
      }
      if (!entry) { result.missing++; return; }
      const plan = normalizePlan(entry, slot, Number(slot.durationMinutes) || duration);
      const base = current || {
        date: slot.date, startTime: slot.time,
        attendance: BT.storage.attendanceForActivePlayers(slot.date),
        freethrows: [], shots: []
      };
      base.startTime = slot.time;
      base.note = plan.summary;
      base.plan = plan;
      base.shots = base.shots || [];
      plan.shots.forEach(target => {
        if (!base.shots.some(category => category.category === target.category)) base.shots.push({ category: target.category, entries: [] });
      });
      base.planning = {
        source: 'ai-season', status: 'draft', coachEdited: false,
        generatedAt: new Date().toISOString(), loadTarget: slot.load
      };
      BT.storage.upsertTraining(base);
      saveToLibraries(plan, slot.date);
      if (current) result.updated++;
      else result.created++;
    });
    return result;
  }

  function fridaySlot(friday, game) {
    const before = daysBetween(friday, game.date);
    return {
      date: friday,
      weekday: 'fri',
      time: BT.storage.getSetting('trainingStartTime', '20:15'),
      durationMinutes: 105,
      load: 'low',
      loadReason: before === 1 ? 'Aktivierung einen Tag vor dem Spiel' : 'Kontrollierte individuelle Belastung zwei Tage vor dem Spiel',
      fridayStationMode: true,
      weekendGame: gameSummary(game),
      opponentContext: BT.opponents?.contextForGame ? BT.opponents.contextForGame(game) : null,
      daysAfterPreviousGame: null,
      daysBeforeNextGame: before,
      previousGame: null,
      nextGame: gameSummary(game)
    };
  }

  async function generateFridayTraining(friday, game, existing = null) {
    if (!game || !BT.stationTraining) throw new Error('Das Wochenendspiel für das Freitagstraining fehlt.');
    const slot = fridaySlot(friday, game);
    const payload = buildAIPayload([slot], BT.storage.getSetting('seasonCoachInput', {}));
    const response = await BT.api.ai('planSeason', { data: payload });
    const [entry] = validateBatchResponse(response, [slot]);
    const training = existing || {
      date: friday,
      startTime: slot.time,
      attendance: BT.storage.attendanceForActivePlayers(friday),
      freethrows: [], shots: []
    };
    training.startTime = slot.time;
    if (!BT.stationTraining.applyAI(training, game, entry)) throw new Error('Die KI hat kein vollständiges 105-Minuten-Stationstraining geliefert.');
    BT.storage.upsertTraining(training);
    saveToLibraries(training.plan, friday);
    return training;
  }

  return {
    BAVARIA_SCHOOL_BREAKS, parseLeagueId, scheduleConfig, saveScheduleConfig,
    closureFor, buildSlots, buildAIPayload, performanceContext, splitAIPayload, validateBatchResponse, planInBatches, applyAIPlan,
    generateFridayTraining
  };
})();
