window.BT = window.BT || {};

BT.opponents = (function() {
  const DEFENSE_LABELS = {
    man: 'Mannverteidigung · No-Middle',
    zone212: 'Zone 2-1-2',
    zone23: 'Zone 2-3',
    zone32: 'Zone 3-2'
  };
  const LEVELS = new Set(['unknown', 'low', 'medium', 'high']);
  const MAX_SCREENSHOTS = 24;
  const SCREENSHOT_BATCH_SIZE = 4;
  const SCREENSHOT_BATCH_NEW_IMAGES = 2;
  const SCREENSHOT_BATCH_CONTEXT_IMAGES = 2;
  const SCREENSHOT_BATCH_CONCURRENCY = 2;
  const SCREENSHOT_BATCH_MAX_CHARS = 3_800_000;
  let root = null;
  let selectedId = null;
  let pendingImport = null;

  function keyFor(value) {
    return String(value || '').trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(e\.?v\.?|herren(?:\s+i+)?)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function sameTeam(name, id, expectedName, expectedId) {
    if (Number(id) && Number(expectedId) && Number(id) === Number(expectedId)) return true;
    const left = keyFor(name);
    const right = keyFor(expectedName);
    return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
  }

  function scoreParts(value) {
    const match = String(value || '').match(/(\d+)\s*:\s*(\d+)/);
    return match ? [Number(match[1]), Number(match[2])] : null;
  }

  function seasonForGame(game) {
    return game?.seasonId || (BT.util?.seasonForDate ? BT.util.seasonForDate(game?.date) : '');
  }

  function compareGamesChronologically(left, right) {
    const leftDate = String(left?.date || '');
    const rightDate = String(right?.date || '');
    if (leftDate && !rightDate) return -1;
    if (!leftDate && rightDate) return 1;
    return leftDate.localeCompare(rightDate) || normalizedNumber(left?.sourceIndex) - normalizedNumber(right?.sourceIndex);
  }

  function opponentFromOwnGame(game, ownName, ownId) {
    if (!game) return null;
    if (sameTeam(game.home, game.homeTeamId, ownName, ownId)) return { name: game.away, teamId: game.awayTeamId };
    if (sameTeam(game.away, game.awayTeamId, ownName, ownId)) return { name: game.home, teamId: game.homeTeamId };
    return null;
  }

  function orderOpponentProfiles(profiles, games, config, today) {
    const ownName = config?.teamName || 'TSV Lindau';
    const ownId = Number(config?.teamId) || 0;
    const cutoff = today || (BT.util?.todayISO ? BT.util.todayISO() : new Date().toISOString().slice(0, 10));
    const upcoming = (Array.isArray(games) ? games : []).filter(game => {
      if (!game?.date || game.cancelled || game.date < cutoff || scoreParts(game.score)) return false;
      return Boolean(opponentFromOwnGame(game, ownName, ownId));
    }).sort((left, right) => `${left.date || ''}T${left.time || '23:59'}`.localeCompare(`${right.date || ''}T${right.time || '23:59'}`));

    return (Array.isArray(profiles) ? profiles : []).map(profile => {
      const nextGame = upcoming.find(game => {
        const opponent = opponentFromOwnGame(game, ownName, ownId);
        return opponent && ((profile.teamId && opponent.teamId && Number(profile.teamId) === Number(opponent.teamId)) || keyFor(profile.name) === keyFor(opponent.name));
      }) || null;
      return { profile, nextGame };
    }).sort((left, right) => {
      if (left.nextGame && !right.nextGame) return -1;
      if (!left.nextGame && right.nextGame) return 1;
      if (left.nextGame && right.nextGame) {
        const scheduleOrder = `${left.nextGame.date}T${left.nextGame.time || '23:59'}`.localeCompare(`${right.nextGame.date}T${right.nextGame.time || '23:59'}`);
        if (scheduleOrder) return scheduleOrder;
      }
      return String(left.profile.name || '').localeCompare(String(right.profile.name || ''), 'de');
    });
  }

  function upcomingGameLabel(game, isFirst) {
    if (!game) return '';
    const date = String(game.date || '').split('-');
    const shortDate = date.length === 3 ? `${date[2]}.${date[1]}.` : String(game.date || '');
    const competition = String(game.competition || game.leagueName || game.round || '');
    const competitionLabel = /pokal|cup/i.test(competition) ? ' · Pokal' : '';
    return `${isFirst ? 'Nächstes Spiel' : 'Danach'} · ${shortDate}${competitionLabel}`;
  }

  function profileGames(profile) {
    return Array.isArray(profile?.games) ? profile.games.slice().sort(compareGamesChronologically) : [];
  }

  function gameSignature(game) {
    return `${game?.date || ''}:${keyFor(game?.home)}:${keyFor(game?.away)}`;
  }

  function mergeGames(existingGames, incomingGames) {
    const merged = [];
    const bySignature = new Map();
    for (const game of [...(existingGames || []), ...(incomingGames || [])]) {
      if (!game?.home || !game?.away) continue;
      const signature = gameSignature(game);
      const index = bySignature.get(signature);
      if (index === undefined) {
        bySignature.set(signature, merged.length);
        merged.push(Object.assign({}, game));
      } else {
        merged[index] = Object.assign({}, merged[index], game);
      }
    }
    return merged.sort(compareGamesChronologically);
  }

  function metricsFor(profile) {
    const games = profileGames(profile).filter(game => scoreParts(game.score));
    const rows = games.map(game => {
      const score = scoreParts(game.score);
      const home = sameTeam(game.home, game.homeTeamId, profile.name, profile.teamId);
      const pointsFor = home ? score[0] : score[1];
      const pointsAgainst = home ? score[1] : score[0];
      return { date: game.date, pointsFor, pointsAgainst, won: pointsFor > pointsAgainst };
    });
    const total = key => rows.reduce((sum, row) => sum + row[key], 0);
    const played = rows.length;
    const recent = rows.slice(-5);
    const wins = rows.filter(row => row.won).length;
    const recentWins = recent.filter(row => row.won).length;
    const round = value => Math.round(value * 10) / 10;
    return {
      games: played,
      wins,
      losses: played - wins,
      recentGames: recent.length,
      recentWins,
      recentLosses: recent.length - recentWins,
      pointsForPerGame: played ? round(total('pointsFor') / played) : null,
      pointsAgainstPerGame: played ? round(total('pointsAgainst') / played) : null,
      pointDifferential: played ? round((total('pointsFor') - total('pointsAgainst')) / played) : null
    };
  }

  function normalizedNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function shootingSummary(profile) {
    const totals = profile?.manualTotals || {};
    const pct = (made, attempted) => attempted > 0 ? Math.round((made / attempted) * 1000) / 10 : null;
    const round = value => Math.round(value * 10) / 10;
    const screenshotFouls = profileGames(profile).filter(game => game.opponentTeamStats?.completeFouls === true && game.opponentTeamStats.fouls !== null);
    const screenshotShots = profileGames(profile).filter(game => game.opponentTeamStats?.completeShots === true);
    const screenshotMadeProfiles = profileGames(profile).filter(game => game.opponentTeamStats?.twoMade !== null && game.opponentTeamStats?.twoMade !== undefined && game.opponentTeamStats?.threeMade !== null && game.opponentTeamStats?.threeMade !== undefined);
    const sumScreenshot = (games, key) => games.reduce((sum, game) => sum + normalizedNumber(game.opponentTeamStats?.[key]), 0);
    const shotGames = screenshotShots.length || normalizedNumber(totals.gamesWithShots);
    const foulGames = screenshotFouls.length || normalizedNumber(totals.gamesWithFouls);
    const totalValue = (key, games) => games.length ? sumScreenshot(games, key) : normalizedNumber(totals[key]);
    const threeAttempted = totalValue('threeAttempted', screenshotShots);
    const teamFouls = totalValue('teamFouls', []);
    const madeProfileGames = screenshotMadeProfiles.length;
    const twoMade = sumScreenshot(screenshotMadeProfiles, 'twoMade');
    const threeMade = sumScreenshot(screenshotMadeProfiles, 'threeMade');
    const freeThrowMadeGames = screenshotMadeProfiles.filter(game => game.opponentTeamStats?.freeThrowsMade !== null && game.opponentTeamStats?.freeThrowsMade !== undefined);
    const freeThrowsMade = freeThrowMadeGames.length ? sumScreenshot(freeThrowMadeGames, 'freeThrowsMade') : null;
    const madeFieldGoals = twoMade + threeMade;
    const twoMadeShare = madeFieldGoals ? round((twoMade / madeFieldGoals) * 100) : null;
    const threeMadeShare = madeFieldGoals ? round((threeMade / madeFieldGoals) * 100) : null;
    const freeThrowsMadePerGame = freeThrowMadeGames.length ? round(freeThrowsMade / freeThrowMadeGames.length) : null;
    let madeShotTendency = 'unknown';
    if (madeProfileGames >= 2 && freeThrowMadeGames.length >= 2 && twoMadeShare >= 75 && freeThrowsMadePerGame >= 12) madeShotTendency = 'inside-pressure';
    else if (madeProfileGames >= 2 && twoMadeShare >= 75) madeShotTendency = 'two-heavy';
    else if (madeProfileGames >= 2 && threeMadeShare >= 30) madeShotTendency = 'perimeter-heavy';
    else if (madeProfileGames >= 2) madeShotTendency = 'balanced';
    return {
      gamesWithShots: shotGames,
      gamesWithFouls: foulGames,
      gamesWithMadeProfile: madeProfileGames,
      gamesWithFreeThrowMakes: freeThrowMadeGames.length,
      teamFoulsPerGame: foulGames ? Math.round(((screenshotFouls.length ? sumScreenshot(screenshotFouls, 'fouls') : teamFouls) / foulGames) * 10) / 10 : null,
      fieldGoalPct: pct(totalValue('fieldGoalsMade', screenshotShots), totalValue('fieldGoalsAttempted', screenshotShots)),
      threePointPct: pct(totalValue('threeMade', screenshotShots), threeAttempted),
      threeAttemptsPerGame: shotGames ? Math.round((threeAttempted / shotGames) * 10) / 10 : null,
      freeThrowPct: pct(totalValue('freeThrowsMade', screenshotShots), totalValue('freeThrowsAttempted', screenshotShots)),
      twoMade,
      threeMade,
      freeThrowsMade,
      twoMadePerGame: madeProfileGames ? round(twoMade / madeProfileGames) : null,
      threeMadePerGame: madeProfileGames ? round(threeMade / madeProfileGames) : null,
      freeThrowsMadePerGame,
      twoMadeShare,
      threeMadeShare,
      madeShotTendency,
      source: screenshotFouls.length || screenshotShots.length || screenshotMadeProfiles.length ? 'dbb-scores-screenshot' : 'manual'
    };
  }

  function playerSummary(profile) {
    const screenshotRows = Array.isArray(profile?.screenshotPlayerStats) ? profile.screenshotPlayerStats : [];
    if (screenshotRows.length) {
      const grouped = new Map();
      for (const row of screenshotRows) {
        if (!row?.name || !row.gameDate) continue;
        const key = keyFor(row.name);
        const entry = grouped.get(key) || { id: key, name: row.name, rows: new Map() };
        const gameKey = `${row.gameDate}:${key}`;
        entry.rows.set(gameKey, Object.assign({}, entry.rows.get(gameKey) || {}, row));
        grouped.set(key, entry);
      }
      const sum = (rows, field) => rows.reduce((total, row) => total + normalizedNumber(row[field]), 0);
      const available = (rows, field) => rows.filter(row => row[field] !== null && row[field] !== undefined);
      const pct = (made, attempted) => attempted ? Math.round((made / attempted) * 1000) / 10 : null;
      return [...grouped.values()].map(entry => {
        const rows = [...entry.rows.values()];
        const pointRows = available(rows, 'points');
        const foulRows = available(rows, 'fouls');
        const shotRows = available(rows, 'threeAttempted');
        const threeAttempted = sum(shotRows, 'threeAttempted');
        const fieldRows = available(rows, 'fieldGoalsAttempted');
        const fieldGoalsAttempted = sum(fieldRows, 'fieldGoalsAttempted');
        return {
          id: entry.id,
          name: entry.name,
          games: rows.length,
          pointsPerGame: pointRows.length ? Math.round((sum(pointRows, 'points') / pointRows.length) * 10) / 10 : null,
          foulsPerGame: foulRows.length ? Math.round((sum(foulRows, 'fouls') / foulRows.length) * 10) / 10 : null,
          fieldGoalPct: pct(sum(fieldRows, 'fieldGoalsMade'), fieldGoalsAttempted),
          threePointPct: pct(sum(shotRows, 'threeMade'), threeAttempted),
          threeAttemptsPerGame: shotRows.length ? Math.round((threeAttempted / shotRows.length) * 10) / 10 : null,
          source: 'dbb-scores-screenshot'
        };
      });
    }
    return (Array.isArray(profile?.playerStats) ? profile.playerStats : []).map(player => {
      const games = normalizedNumber(player.games);
      const threeAttempted = normalizedNumber(player.threeAttempted);
      const fieldGoalsAttempted = normalizedNumber(player.fieldGoalsAttempted);
      const pct = (made, attempted) => attempted ? Math.round((made / attempted) * 1000) / 10 : null;
      return {
        id: player.id,
        name: String(player.name || '').trim(),
        games,
        pointsPerGame: games ? Math.round((normalizedNumber(player.points) / games) * 10) / 10 : null,
        foulsPerGame: games ? Math.round((normalizedNumber(player.fouls) / games) * 10) / 10 : null,
        fieldGoalPct: pct(normalizedNumber(player.fieldGoalsMade), fieldGoalsAttempted),
        threePointPct: pct(normalizedNumber(player.threeMade), threeAttempted),
        threeAttemptsPerGame: games ? Math.round((threeAttempted / games) * 10) / 10 : null,
        source: 'manual'
      };
    }).filter(player => player.name && player.games > 0);
  }

  function dataQuality(profile) {
    const metrics = metricsFor(profile);
    const shooting = shootingSummary(profile);
    const scouting = profile?.scouting || {};
    const observed = ['insideThreat', 'perimeterThreat', 'highPostPassing', 'offensiveRebounding', 'primaryScorerArea']
      .filter(key => scouting[key] && scouting[key] !== 'unknown').length;
    const liveReports = Array.isArray(profile?.matchdayReports) ? profile.matchdayReports : [];
    let points = 0;
    if (metrics.games >= 3) points += 1;
    if (metrics.games >= 5) points += 1;
    if (shooting.gamesWithFouls >= 3) points += 1;
    if (shooting.gamesWithShots >= 3) points += 2;
    if (shooting.gamesWithMadeProfile >= 3) points += 1;
    if (observed >= 2) points += 1;
    if (playerSummary(profile).length >= 2) points += 1;
    if (liveReports.length >= 1) points += 1;
    if (liveReports.length >= 3) points += 1;
    const confidence = points >= 6 ? 'high' : points >= 3 ? 'medium' : 'low';
    const sources = [];
    if (profileGames(profile).length) sources.push('TeamSL-Ergebnisse');
    if (shooting.source === 'dbb-scores-screenshot' || playerSummary(profile).some(player => player.source === 'dbb-scores-screenshot')) sources.push('DBB.Scores-Screenshot');
    if ((shooting.gamesWithFouls || shooting.gamesWithShots || playerSummary(profile).length) && !sources.includes('DBB.Scores-Screenshot')) sources.push('geprüfte manuelle Statistik');
    if (observed) sources.push('Trainerbeobachtung');
    if (liveReports.length) sources.push('CourtHub-Livebeobachtung');
    return { confidence, points, sources, observedFields: observed };
  }

  function recommendDefense(profile) {
    const scouting = profile?.scouting || {};
    const shooting = shootingSummary(profile);
    const players = playerSummary(profile);
    const quality = dataQuality(profile);
    const scores = { man: 2, zone212: 0, zone23: 0, zone32: 0 };
    const reasons = [];
    const liveReports = Array.isArray(profile?.matchdayReports) ? profile.matchdayReports : [];
    const observedLive = liveReports.reduce((sum, report) => {
      for (const key of ['paint', 'open-three', 'oreb', 'free-throw-pressure']) sum[key] += normalizedNumber(report?.observations?.[key]);
      return sum;
    }, { paint: 0, 'open-three': 0, oreb: 0, 'free-throw-pressure': 0 });

    if (scouting.insideThreat === 'high') { scores.zone212 += 2; scores.zone23 += 3; reasons.push('hohe Gefahr durch Drives oder Inside-Spiel'); }
    if (scouting.insideThreat === 'medium') { scores.zone212 += 1; scores.zone23 += 1; }
    if (scouting.perimeterThreat === 'high') { scores.zone32 += 3; reasons.push('hohe Gefahr durch Guards und Distanzwurf'); }
    if (scouting.perimeterThreat === 'medium') scores.zone32 += 1;
    if (scouting.perimeterThreat === 'low') { scores.zone212 += 1; scores.zone23 += 2; }
    if (scouting.primaryScorerArea === 'inside') { scores.zone212 += 1; scores.zone23 += 2; reasons.push('primäre Scoring-Gefahr innen'); }
    if (scouting.primaryScorerArea === 'perimeter') { scores.zone32 += 2; reasons.push('primäre Scoring-Gefahr am Perimeter'); }
    if (scouting.primaryScorerArea === 'balanced') { scores.man += 2; reasons.push('ausgeglichenes Angriffsprofil'); }
    if (scouting.highPostPassing === 'high') { scores.zone212 += 3; scores.zone23 -= 3; reasons.push('starkes Passspiel über den High Post'); }
    if (scouting.offensiveRebounding === 'high') { scores.man += 2; scores.zone212 -= 1; scores.zone23 -= 1; scores.zone32 -= 1; reasons.push('hohe Gefahr am offensiven Brett'); }
    if (shooting.threeAttemptsPerGame >= 16) { scores.zone32 += 2; scores.zone23 -= 2; reasons.push(`${shooting.threeAttemptsPerGame} Dreier-Versuche pro erfasstem Spiel`); }
    else if (shooting.threeAttemptsPerGame >= 10) scores.zone32 += 1;
    if (shooting.threePointPct >= 34) { scores.zone32 += 1; scores.zone23 -= 2; reasons.push(`${shooting.threePointPct} % Dreierquote in der Datenbasis`); }
    if (shooting.gamesWithMadeProfile >= 2 && shooting.twoMadeShare >= 75) {
      scores.zone212 += 1;
      scores.zone23 += 2;
      reasons.push(`${shooting.twoMadeShare} % der sichtbaren Feldtreffer sind Zweier; keine Aussage zur Wurfquote`);
    }
    if (shooting.gamesWithMadeProfile >= 2 && shooting.freeThrowsMadePerGame >= 12) {
      scores.zone212 += 1;
      reasons.push(`${shooting.freeThrowsMadePerGame} verwandelte Freiwürfe pro erfasstem Spiel stützen die Tendenz zu Ringdruck`);
    }
    if (shooting.gamesWithMadeProfile >= 2 && shooting.threeMadeShare >= 30) {
      scores.zone32 += 1;
      reasons.push(`${shooting.threeMadeShare} % der sichtbaren Feldtreffer sind Dreier`);
    }
    if (players.some(player => player.threeAttemptsPerGame >= 4 && player.threePointPct >= 33)) {
      scores.zone32 += 1;
      reasons.push('mindestens ein belegter Volumen-Schütze');
    }
    if (observedLive.paint >= 4) { scores.zone212 += 1; scores.zone23 += 1; reasons.push('wiederholte Paint-/Drive-Beobachtungen aus eigenen Spielen'); }
    if (observedLive['open-three'] >= 4) { scores.zone32 += 1; scores.zone23 -= 1; reasons.push('wiederholt offene Dreier in eigenen Spielen'); }
    if (observedLive.oreb >= 3) { scores.man += 1; reasons.push('wiederholte Offensiv-Rebounds erfordern klare Box-out-Zuordnung'); }
    if (quality.confidence === 'low') {
      scores.man += 5;
      reasons.unshift('Datenbasis reicht noch nicht für einen belastbaren Zonenstart');
    }

    const defenseOrder = ['man', 'zone212', 'zone23', 'zone32'];
    const order = defenseOrder.slice().sort((left, right) => scores[right] - scores[left] || defenseOrder.indexOf(left) - defenseOrder.indexOf(right));
    const start = order[0];
    const alternative = order[1];
    const triggers = {
      man: ['Zwei klare Paint-Touches oder direkte Drives in drei Angriffen: 2-3 prüfen.', 'Zwei offene Abschlüsse von Guards oder Flügeln oberhalb der Freiwurflinie: 3-2 prüfen.'],
      zone212: ['Wiederholte High-Post-Touches oder zwei offene Distanzwürfe aus derselben Zone: zurück zur Mannverteidigung.', 'Zwei verlorene Defensiv-Rebounds in drei Angriffen: Mannverteidigung und klare Box-outs.'],
      zone23: ['Zwei freie High-Post- oder Short-Corner-Touches: 2-1-2 oder Mannverteidigung prüfen.', 'Zwei offene Dreier nach Skip-Pass: 3-2 oder Mannverteidigung prüfen.'],
      zone32: ['Zwei Abschlüsse aus Ecke oder Short Corner: zurück zur Mannverteidigung oder 2-1-2.', 'Zwei verlorene Defensiv-Rebounds in drei Angriffen: Zone beenden.']
    };
    const risks = {
      man: 'Foulbelastung, verlorene direkte Duelle und verspätete Helpside.',
      zone212: 'High Post, schnelle Ballverlagerung, Ecken und Rebound-Zuordnung.',
      zone23: 'High Post, Short Corner, gute Werfer, Skip-Pässe und klare Rebound-Zuordnung.',
      zone32: 'Baseline, Ecken, Short Corner und Defensiv-Rebound.'
    };
    return {
      start,
      startLabel: DEFENSE_LABELS[start],
      alternative,
      alternativeLabel: DEFENSE_LABELS[alternative],
      reasons: [...new Set(reasons)].slice(0, 5),
      triggers: triggers[start],
      risk: risks[start],
      confidence: quality.confidence,
      allowedDefenses: Object.values(DEFENSE_LABELS)
    };
  }

  function contextForProfile(profile) {
    if (!profile) return null;
    const metrics = metricsFor(profile);
    const shooting = shootingSummary(profile);
    const players = playerSummary(profile);
    const quality = dataQuality(profile);
    return {
      opponentId: profile.id,
      opponent: profile.name,
      seasonId: profile.seasonId || '',
      results: metrics,
      teamStatistics: shooting,
      topScorers: players.slice().sort((a, b) => (b.pointsPerGame || 0) - (a.pointsPerGame || 0)).slice(0, 5),
      bestShooters: players.filter(player => player.threePointPct !== null).sort((a, b) => b.threePointPct - a.threePointPct || b.threeAttemptsPerGame - a.threeAttemptsPerGame).slice(0, 5),
      scouting: {
        insideThreat: scoutingValue(profile, 'insideThreat'),
        perimeterThreat: scoutingValue(profile, 'perimeterThreat'),
        highPostPassing: scoutingValue(profile, 'highPostPassing'),
        offensiveRebounding: scoutingValue(profile, 'offensiveRebounding'),
        primaryScorerArea: scoutingValue(profile, 'primaryScorerArea'),
        notes: String(profile.scouting?.notes || '').slice(0, 800)
      },
      matchdayReports: (Array.isArray(profile.matchdayReports) ? profile.matchdayReports : []).slice(-5),
      defenseRecommendation: recommendDefense(profile),
      dataQuality: {
        confidence: quality.confidence,
        sources: quality.sources,
        lastUpdated: profile.updatedAt || null,
        warning: quality.confidence === 'low' ? 'Zu wenig Daten für eine gegnerspezifische Zonen-Startempfehlung.' : null
      }
    };
  }

  function scoutingValue(profile, key) {
    return String(profile?.scouting?.[key] || 'unknown');
  }

  function recordMatchdayFeedback(feedback) {
    if (!feedback?.gameId || !feedback?.opponentId) return null;
    const profile = BT.storage.getOpponents().find(item => item.id === feedback.opponentId || keyFor(item.name) === keyFor(feedback.opponent));
    if (!profile) return null;
    const reports = (Array.isArray(profile.matchdayReports) ? profile.matchdayReports : []).filter(item => item.gameId !== feedback.gameId);
    const defenseSummary = (Array.isArray(feedback.defenseSummary) ? feedback.defenseSummary : []).slice(0, 4).map(item => {
      const defense = Object.hasOwn(DEFENSE_LABELS, item?.defense) ? item.defense : 'man';
      const minutesMs = normalizedNumber(item?.minutesMs), points = normalizedNumber(item?.points);
      return {
        defense, label: DEFENSE_LABELS[defense], minutesMs, points,
        pointsPer10: minutesMs ? Math.round(points * 6000000 / minutesMs) / 10 : null,
        one: normalizedNumber(item?.one), two: normalizedNumber(item?.two), three: normalizedNumber(item?.three),
        observations: Object.fromEntries(['paint', 'open-three', 'oreb', 'free-throw-pressure'].map(key => [key, normalizedNumber(item?.observations?.[key])]))
      };
    });
    const playerScoring = (Array.isArray(feedback.playerScoring) ? feedback.playerScoring : []).slice(0, 20).map(item => ({
      id: String(item?.id || '').slice(0, 120), name: String(item?.name || '').trim().slice(0, 100),
      points: normalizedNumber(item?.points), one: normalizedNumber(item?.one), two: normalizedNumber(item?.two), three: normalizedNumber(item?.three)
    })).filter(item => item.name);
    reports.push({
      gameId: String(feedback.gameId), date: String(feedback.date || ''), recordedAt: String(feedback.recordedAt || new Date().toISOString()),
      observations: Object.fromEntries(['paint', 'open-three', 'oreb', 'free-throw-pressure'].map(key => [key, normalizedNumber(feedback.observations?.[key])])),
      opponentMakes: Object.fromEntries(['one', 'two', 'three'].map(key => [key, normalizedNumber(feedback.opponentMakes?.[key])])),
      defenseChanges: (Array.isArray(feedback.defenseChanges) ? feedback.defenseChanges : []).slice(0, 30).map(item => ({ defense: ['man', 'zone212', 'zone23', 'zone32'].includes(item.defense) ? item.defense : 'man', period: normalizedNumber(item.period), remainingMs: normalizedNumber(item.remainingMs) })),
      defenseSummary, playerScoring,
      finalDefense: ['man', 'zone212', 'zone23', 'zone32'].includes(feedback.finalDefense) ? feedback.finalDefense : 'man'
    });
    reports.sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')));
    const next = reports.slice(-20);
    if (JSON.stringify(next) === JSON.stringify(profile.matchdayReports || [])) return profile;
    return BT.storage.upsertOpponent({ id: profile.id, matchdayReports: next });
  }

  function contextForGame(game) {
    if (!game) return null;
    const config = BT.seasonplanner?.scheduleConfig?.() || { teamName: 'TSV Lindau', teamId: 0 };
    const target = opponentFromOwnGame(game, config.teamName, config.teamId);
    if (!target) return null;
    const profile = BT.storage.getOpponents().find(item =>
      (target.teamId && item.teamId && Number(target.teamId) === Number(item.teamId)) || keyFor(item.name) === keyFor(target.name)
    );
    return contextForProfile(profile);
  }

  function syncLeague(leagueGames, config) {
    const games = Array.isArray(leagueGames) ? leagueGames.filter(game => game?.home && game?.away) : [];
    const ownName = config?.teamName || 'TSV Lindau';
    const ownId = Number(config?.teamId) || 0;
    const teams = new Map();
    for (const game of games) {
      [[game.home, game.homeTeamId], [game.away, game.awayTeamId]].forEach(([name, teamId]) => {
        if (!name || sameTeam(name, teamId, ownName, ownId)) return;
        const key = keyFor(name);
        const current = teams.get(key) || { key, name, teamId: teamId || null, games: [] };
        current.games.push(game);
        if (!current.teamId && teamId) current.teamId = teamId;
        teams.set(key, current);
      });
    }
    const saved = [];
    for (const team of teams.values()) {
      const existing = BT.storage.getOpponents().find(item =>
        (team.teamId && item.teamId && Number(team.teamId) === Number(item.teamId)) || item.key === team.key
      );
      saved.push(BT.storage.upsertOpponent({
        id: existing?.id,
        key: team.key,
        name: team.name,
        teamId: team.teamId,
        seasonId: seasonForGame(team.games[0]),
        leagueId: team.games[0]?.leagueId || existing?.leagueId || null,
        source: 'basketball-bund',
        games: mergeGames(existing?.games || [], team.games),
        scouting: existing?.scouting || {},
        manualTotals: existing?.manualTotals || {},
        playerStats: existing?.playerStats || []
      }));
    }
    return saved;
  }

  function ensureFromOwnGames() {
    const config = BT.seasonplanner?.scheduleConfig?.() || { teamName: 'TSV Lindau', teamId: 0 };
    const byTeam = new Map();
    for (const game of BT.storage.getGames()) {
      const target = opponentFromOwnGame(game, config.teamName, config.teamId);
      if (!target?.name) continue;
      const key = keyFor(target.name);
      const entry = byTeam.get(key) || { name: target.name, teamId: target.teamId, games: [] };
      entry.games.push(game);
      byTeam.set(key, entry);
    }
    for (const [key, entry] of byTeam) {
      const existing = BT.storage.getOpponents().find(item => item.key === key);
      if (existing) continue;
      BT.storage.upsertOpponent({ key, name: entry.name, teamId: entry.teamId || null, seasonId: seasonForGame(entry.games[0]), source: 'own-schedule', games: entry.games, scouting: {}, manualTotals: {}, playerStats: [] });
    }
  }

  function render(target) {
    ensureFromOwnGames();
    selectedId = null;
    root = BT.util.renderTemplate('tpl-opponents');
    target.appendChild(root);
    const syncButton = root.querySelector('[data-action="sync-opponents"]');
    const status = root.querySelector('[data-role="opponents-status"]');
    syncButton.addEventListener('click', async () => {
      if (!BT.api.getToken()) { location.hash = '#/account'; return; }
      syncButton.disabled = true;
      status.textContent = 'Ligadaten werden aus TeamSL geladen …';
      try {
        const config = BT.seasonplanner.scheduleConfig();
        const result = await BT.api.syncWebsiteGames(config);
        result.games.forEach(game => BT.storage.upsertGame(game));
        const profiles = syncLeague(result.leagueGames || result.games, { teamName: result.team.name, teamId: result.team.id });
        BT.seasonplanner.saveScheduleConfig({ teamId: result.team.id, teamName: result.team.name });
        status.textContent = `${profiles.length} Saison-Gegner und ${result.leagueGames?.length || result.games.length} Ligaspiele aktualisiert.`;
        drawList();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        syncButton.disabled = false;
      }
    });
    drawList();
  }

  function drawList() {
    const list = root.querySelector('[data-role="opponent-list"]');
    const config = BT.seasonplanner?.scheduleConfig?.() || { teamName: 'TSV Lindau', teamId: 0 };
    const ordered = orderOpponentProfiles(BT.storage.getOpponents(), BT.storage.getGames(), config);
    if ((!selectedId || !ordered.some(item => item.profile.id === selectedId)) && ordered.length) selectedId = ordered[0].profile.id;
    list.innerHTML = ordered.length ? ordered.map(({ profile, nextGame }, index) => {
      const metrics = metricsFor(profile);
      const recommendation = recommendDefense(profile);
      const scheduleLabel = upcomingGameLabel(nextGame, index === 0);
      return `<li><button type="button" class="game-list-card ${selectedId === profile.id ? 'active' : ''}" data-opponent-id="${BT.util.escapeHTML(profile.id)}"><span class="game-team">${BT.util.escapeHTML(scheduleLabel || (metrics.games ? `${metrics.wins}:${metrics.losses} · ${metrics.games} Spiele` : 'Datenbasis offen'))}</span><strong>${BT.util.escapeHTML(profile.name)}</strong><span class="game-list-meta">${BT.util.escapeHTML(recommendation.startLabel)} · ${qualityLabel(recommendation.confidence)}</span></button></li>`;
    }).join('') : '<li class="empty empty--field"><p class="empty-body">Noch keine Gegner. Synchronisiere den offiziellen Spielplan.</p></li>';
    list.querySelectorAll('[data-opponent-id]').forEach(button => button.addEventListener('click', () => {
      selectedId = button.dataset.opponentId;
      drawList();
    }));
    drawDetail();
  }

  function qualityLabel(value) {
    return value === 'high' ? 'Datenlage Grün' : value === 'medium' ? 'Datenlage Gelb' : 'Datenlage Rot';
  }

  function valueOrDash(value, suffix = '') {
    return value === null || value === undefined ? '–' : `${value}${suffix}`;
  }

  function madeShotTendencyLabel(value) {
    return {
      'inside-pressure': 'Zweierlastig mit deutlichem Freiwurfdruck',
      'two-heavy': 'Zweierlastiges Trefferprofil',
      'perimeter-heavy': 'Erhöhte Dreier-Tendenz',
      balanced: 'Ausgeglichenes Trefferprofil',
      unknown: 'Noch nicht belastbar'
    }[value] || 'Noch nicht belastbar';
  }

  function madeShotTendencyExplanation(shooting) {
    const base = `${shooting.twoMadeShare} % der sichtbaren Feldtreffer sind Zweier. Das beschreibt die Trefferverteilung, nicht die Wurfquote.`;
    if (shooting.madeShotTendency === 'inside-pressure') return `${base} Viele Zweier zusammen mit ${shooting.freeThrowsMadePerGame} verwandelten Freiwürfen pro Spiel sprechen vorsichtig für Inside- oder Ringdruck; Mitteldistanzwürfe bleiben möglich.`;
    if (shooting.madeShotTendency === 'two-heavy') return `${base} Das kann auf Ring- oder Inside-Spiel hindeuten, beweist ohne Wurfzonen aber keine Paint-Dominanz.`;
    if (shooting.madeShotTendency === 'perimeter-heavy') return `${base} Der erhöhte Anteil getroffener Dreier weist auf mehr Perimeterproduktion hin, sagt aber nichts über Volumen oder Effizienz.`;
    return `${base} Ohne Wurfversuche und Wurfzonen bleibt die offensive Einordnung vorsichtig.`;
  }

  function visibleMadeShotLine(stats) {
    if (stats?.twoMade === null || stats?.twoMade === undefined || stats?.threeMade === null || stats?.threeMade === undefined) return '';
    const freeThrows = stats.freeThrowsMade === null || stats.freeThrowsMade === undefined ? '' : ` · ${stats.freeThrowsMade} FW`;
    return `${stats.twoMade}×2 · ${stats.threeMade}×3${freeThrows}`;
  }

  function option(value, label, current) {
    return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
  }

  function playerRow(player = {}) {
    const id = player.id || BT.util.uuid('opps_');
    const field = (name, label) => `<label><span class="sr-only">${label}</span><input type="number" min="0" step="1" inputmode="numeric" data-player-field="${name}" value="${player[name] ?? ''}" placeholder="${label}"></label>`;
    return `<tr data-scout-player="${BT.util.escapeHTML(id)}"><td><input type="text" maxlength="80" data-player-field="name" value="${BT.util.escapeHTML(player.name || '')}" placeholder="Name"></td><td>${field('games', 'Spiele')}</td><td>${field('points', 'Punkte')}</td><td>${field('fouls', 'Fouls')}</td><td>${field('threeMade', '3PM')}</td><td>${field('threeAttempted', '3PA')}</td><td><button class="btn small danger" type="button" data-action="remove-scout-player" aria-label="Spieler entfernen">×</button></td></tr>`;
  }

  function drawDetail() {
    const host = root.querySelector('[data-role="opponent-detail"]');
    const profile = BT.storage.getOpponent(selectedId);
    if (!profile) { host.innerHTML = '<div class="empty empty--field"><p class="empty-body">Gegner auswählen.</p></div>'; return; }
    const context = contextForProfile(profile);
    const metrics = context.results;
    const shooting = context.teamStatistics;
    const defense = context.defenseRecommendation;
    const scouting = profile.scouting || {};
    const totals = profile.manualTotals || {};
    const top = context.topScorers;
    const liveReports = context.matchdayReports || [];
    host.innerHTML = `
      <div class="game-detail-head"><div><span class="section-kicker">Gegner-Scouting · ${BT.util.escapeHTML(profile.seasonId || 'Saison')}</span><h3>${BT.util.escapeHTML(profile.name)}</h3><p class="muted">Quellen: ${BT.util.escapeHTML(context.dataQuality.sources.join(', ') || 'noch keine belastbare Quelle')} · ${qualityLabel(context.dataQuality.confidence)}</p></div></div>
      <section class="boxscore-panel opponent-screenshot-panel">
        <div class="section-head compact"><div><span class="section-kicker">DBB.Scores</span><h3>Screenshots auswerten</h3></div></div>
        <p class="muted">Wähle bis zu ${MAX_SCREENSHOTS} Fotos oder Screenshots gemeinsam aus. CourtHub verarbeitet sie automatisch in sicheren Paketen, liest sichtbare Spiele, Ergebnisse, Fouls, Wurfwerte und Spielerzeilen aus und speichert die Bilder selbst nicht.</p>
        <div class="opponent-screenshot-actions">
          <label class="btn opponent-file-picker">
            <span aria-hidden="true">▣</span>
            <span data-role="opponent-file-label">Fotos auswählen</span>
            <input type="file" accept="image/*,.heic,.heif" multiple data-role="opponent-screenshots" aria-label="Fotos oder Screenshots auswählen">
          </label>
          <button class="btn primary" type="button" data-action="analyze-screenshots" disabled>Auswertung starten</button>
          <span class="opponent-file-count" data-role="opponent-file-count">Noch keine Fotos ausgewählt.</span>
        </div>
        <p class="auth-status" data-role="screenshot-status" aria-live="polite"></p>
        <div data-role="screenshot-preview"></div>
      </section>
      <div class="opponent-kpis">
        <div><span>Bilanz</span><strong>${metrics.games ? `${metrics.wins}:${metrics.losses}` : '–'}</strong></div>
        <div><span>Punkte</span><strong>${valueOrDash(metrics.pointsForPerGame)}</strong></div>
        <div><span>Zugelassen</span><strong>${valueOrDash(metrics.pointsAgainstPerGame)}</strong></div>
        <div><span>Teamfouls</span><strong>${valueOrDash(shooting.teamFoulsPerGame)}</strong></div>
        <div><span>${shooting.threePointPct === null ? 'Dreier-Treffer/Sp.' : 'Dreierquote'}</span><strong>${shooting.threePointPct === null ? valueOrDash(shooting.threeMadePerGame) : valueOrDash(shooting.threePointPct, ' %')}</strong></div>
      </div>
      ${shooting.gamesWithMadeProfile ? `<section class="opponent-made-shot-profile">
        <div><span class="section-kicker">Trefferprofil · ${shooting.gamesWithMadeProfile} Spiele</span><strong>${BT.util.escapeHTML(madeShotTendencyLabel(shooting.madeShotTendency))}</strong></div>
        <div class="opponent-made-shot-values"><span><strong>${shooting.twoMade}</strong> Zweier</span><span><strong>${shooting.threeMade}</strong> Dreier</span><span><strong>${valueOrDash(shooting.freeThrowsMade)}</strong> FW</span></div>
        <p>${BT.util.escapeHTML(madeShotTendencyExplanation(shooting))}</p>
      </section>` : ''}
      <section class="opponent-defense-card confidence-${defense.confidence}">
        <div class="section-head compact"><div><span class="section-kicker">CourtHub Defense-Entscheidung</span><h3>${BT.util.escapeHTML(defense.startLabel)}</h3></div><span class="att-chip ${defense.confidence === 'high' ? 'ok' : defense.confidence === 'medium' ? 'warn' : 'bad'}">${qualityLabel(defense.confidence)}</span></div>
        <p><strong>Alternative:</strong> ${BT.util.escapeHTML(defense.alternativeLabel)}</p>
        <ul>${defense.reasons.length ? defense.reasons.map(reason => `<li>${BT.util.escapeHTML(reason)}</li>`).join('') : '<li>Keine belastbaren Gegnermerkmale erfasst.</li>'}</ul>
        <p><strong>Risiko:</strong> ${BT.util.escapeHTML(defense.risk)}</p>
        <div><strong>Wechsel-Auslöser</strong><ul>${defense.triggers.map(trigger => `<li>${BT.util.escapeHTML(trigger)}</li>`).join('')}</ul></div>
      </section>
      ${liveReports.length ? `<section class="boxscore-panel opponent-live-history"><div class="section-head compact"><div><span class="section-kicker">Eigene Spiele</span><h3>CourtHub-Livebeobachtungen</h3></div></div>${liveReports.slice().reverse().map(report => `<article><strong>${BT.util.escapeHTML(report.date || 'Spieltag')}</strong><span>Paint ${normalizedNumber(report.observations?.paint)} · offene 3er ${normalizedNumber(report.observations?.['open-three'])} · OREB ${normalizedNumber(report.observations?.oreb)} · FW-Druck ${normalizedNumber(report.observations?.['free-throw-pressure'])}</span>${(report.defenseSummary||[]).filter(item=>item.minutesMs).map(item=>`<span>${BT.util.escapeHTML(item.label||DEFENSE_LABELS[item.defense]||item.defense)}: ${(normalizedNumber(item.minutesMs)/60000).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})} Min · ${normalizedNumber(item.points)} P · ${item.pointsPer10===null||item.pointsPer10===undefined?'–':normalizedNumber(item.pointsPer10).toLocaleString('de-DE')} P/10</span>`).join('')}${report.playerScoring?.length?`<span>Werfer: ${report.playerScoring.map(player=>`${BT.util.escapeHTML(player.name)} ${normalizedNumber(player.points)} P`).join(' · ')}</span>`:''}</article>`).join('')}</section>` : ''}
      <section class="boxscore-panel"><div class="section-head compact"><div><span class="section-kicker">Leistungsträger</span><h3>Topscorer aus erfassten Daten</h3></div></div>
        ${top.length ? `<div class="opponent-leaders">${top.map(player => `<div><strong>${BT.util.escapeHTML(player.name)}</strong><span>${valueOrDash(player.pointsPerGame)} PPG · ${valueOrDash(player.foulsPerGame)} Fouls · ${valueOrDash(player.threePointPct, ' % 3P')}</span></div>`).join('')}</div>` : '<p class="muted">Noch keine geprüften Spielerwerte. Punkte sind nicht automatisch eine Wurfquote.</p>'}
      </section>
      <form class="opponent-form" data-role="opponent-form">
        <section class="boxscore-panel"><div class="section-head compact"><div><span class="section-kicker">Trainerbeobachtung</span><h3>Angriffsprofil</h3></div></div>
          <div class="opponent-form-grid">
            <label>Inside-/Drive-Gefahr<select name="insideThreat">${option('unknown','Nicht bekannt',scouting.insideThreat)}${option('low','Niedrig',scouting.insideThreat)}${option('medium','Mittel',scouting.insideThreat)}${option('high','Hoch',scouting.insideThreat)}</select></label>
            <label>Perimeter-Gefahr<select name="perimeterThreat">${option('unknown','Nicht bekannt',scouting.perimeterThreat)}${option('low','Niedrig',scouting.perimeterThreat)}${option('medium','Mittel',scouting.perimeterThreat)}${option('high','Hoch',scouting.perimeterThreat)}</select></label>
            <label>High-Post-Passing<select name="highPostPassing">${option('unknown','Nicht bekannt',scouting.highPostPassing)}${option('low','Schwach',scouting.highPostPassing)}${option('medium','Mittel',scouting.highPostPassing)}${option('high','Stark',scouting.highPostPassing)}</select></label>
            <label>Offensiv-Rebound<select name="offensiveRebounding">${option('unknown','Nicht bekannt',scouting.offensiveRebounding)}${option('low','Schwach',scouting.offensiveRebounding)}${option('medium','Mittel',scouting.offensiveRebounding)}${option('high','Stark',scouting.offensiveRebounding)}</select></label>
            <label>Primäre Scoring-Zone<select name="primaryScorerArea">${option('unknown','Nicht bekannt',scouting.primaryScorerArea)}${option('inside','Inside',scouting.primaryScorerArea)}${option('perimeter','Perimeter',scouting.primaryScorerArea)}${option('balanced','Ausgeglichen',scouting.primaryScorerArea)}</select></label>
          </div>
          <label class="block-label">Beobachtungen<textarea name="notes" rows="4" maxlength="1200" placeholder="Systeme, Schlüsselspieler, Verhalten gegen Druck, Special Situations …">${BT.util.escapeHTML(scouting.notes || '')}</textarea></label>
        </section>
        <section class="boxscore-panel"><div class="section-head compact"><div><span class="section-kicker">Vollständige Stichprobe</span><h3>Teamwerte</h3></div></div>
          <p class="muted">Nur vollständige, geprüfte Spielberichte addieren. Fehlende Werte bleiben leer und werden nicht geschätzt.</p>
          <div class="opponent-totals-grid">
            ${totalInput('gamesWithFouls','Spiele mit Fouls',totals)}${totalInput('teamFouls','Teamfouls gesamt',totals)}
            ${totalInput('gamesWithShots','Spiele mit Würfen',totals)}${totalInput('fieldGoalsMade','FGM',totals)}${totalInput('fieldGoalsAttempted','FGA',totals)}
            ${totalInput('threeMade','3PM',totals)}${totalInput('threeAttempted','3PA',totals)}${totalInput('freeThrowsMade','FTM',totals)}${totalInput('freeThrowsAttempted','FTA',totals)}
          </div>
        </section>
        <section class="boxscore-panel"><div class="section-head compact"><div><span class="section-kicker">Spielerstatistik</span><h3>Topscorer, Fouls und Würfe</h3></div><button class="btn small" type="button" data-action="add-scout-player">+ Spieler</button></div>
          <div class="table-scroll"><table class="results opponent-player-table"><thead><tr><th>Spieler</th><th>Sp.</th><th>PTS</th><th>PF</th><th>3PM</th><th>3PA</th><th></th></tr></thead><tbody data-role="scout-players">${(profile.playerStats || []).map(playerRow).join('')}</tbody></table></div>
        </section>
        <div class="form-actions"><button class="btn primary" type="submit">Gegnerprofil speichern</button></div>
      </form>`;

    const form = host.querySelector('[data-role="opponent-form"]');
    const rows = host.querySelector('[data-role="scout-players"]');
    const fileInput = host.querySelector('[data-role="opponent-screenshots"]');
    const fileLabel = host.querySelector('[data-role="opponent-file-label"]');
    const fileCount = host.querySelector('[data-role="opponent-file-count"]');
    const analyzeButton = host.querySelector('[data-action="analyze-screenshots"]');
    const updateFileSelection = () => {
      const count = fileInput.files?.length || 0;
      fileLabel.textContent = count ? 'Auswahl ändern' : 'Fotos auswählen';
      fileCount.textContent = count === 1
        ? '1 Foto ausgewählt.'
        : count > 1
          ? `${count} Fotos ausgewählt.`
          : 'Noch keine Fotos ausgewählt.';
      analyzeButton.disabled = count < 1 || count > MAX_SCREENSHOTS;
      if (count > MAX_SCREENSHOTS) fileCount.textContent = `Bitte höchstens ${MAX_SCREENSHOTS} Fotos auswählen.`;
    };
    fileInput.addEventListener('change', updateFileSelection);
    analyzeButton.addEventListener('click', () => analyzeScreenshots(profile, host));
    host.querySelector('[data-action="add-scout-player"]').addEventListener('click', () => rows.insertAdjacentHTML('beforeend', playerRow()));
    rows.addEventListener('click', event => {
      const button = event.target.closest('[data-action="remove-scout-player"]');
      if (button) button.closest('tr').remove();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const formData = new FormData(form);
      const readLevel = name => LEVELS.has(String(formData.get(name))) ? String(formData.get(name)) : 'unknown';
      const manualTotals = {};
      host.querySelectorAll('[data-total-field]').forEach(input => { manualTotals[input.dataset.totalField] = input.value === '' ? null : normalizedNumber(input.value); });
      const playerStats = [...rows.querySelectorAll('[data-scout-player]')].map(row => {
        const entry = { id: row.dataset.scoutPlayer };
        row.querySelectorAll('[data-player-field]').forEach(input => { entry[input.dataset.playerField] = input.dataset.playerField === 'name' ? input.value.trim() : (input.value === '' ? null : normalizedNumber(input.value)); });
        return entry;
      }).filter(player => player.name);
      BT.storage.upsertOpponent({
        id: profile.id,
        scouting: {
          insideThreat: readLevel('insideThreat'),
          perimeterThreat: readLevel('perimeterThreat'),
          highPostPassing: readLevel('highPostPassing'),
          offensiveRebounding: readLevel('offensiveRebounding'),
          primaryScorerArea: ['inside','perimeter','balanced'].includes(String(formData.get('primaryScorerArea'))) ? String(formData.get('primaryScorerArea')) : 'unknown',
          notes: String(formData.get('notes') || '').trim().slice(0, 1200)
        },
        manualTotals,
        playerStats
      });
      BT.util.toast('Gegnerprofil und Defense-Empfehlung aktualisiert.');
      drawList();
    });
  }

  function totalInput(name, label, totals) {
    return `<label>${label}<input type="number" min="0" step="1" inputmode="numeric" data-total-field="${name}" value="${totals[name] ?? ''}"></label>`;
  }

  function blobBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('Screenshot konnte nicht gelesen werden.'));
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ein Screenshot ist beschädigt oder nicht lesbar.')); };
      image.src = url;
    });
  }

  async function compressScreenshot(file) {
    const imageType = String(file.type || '').toLowerCase();
    const imageName = String(file.name || '').toLowerCase();
    if (!imageType.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/.test(imageName)) {
      throw new Error('Bitte nur Fotos oder Screenshots auswählen.');
    }
    if (file.size > 12_000_000) throw new Error(`${file.name} ist größer als 12 MB.`);
    const image = await loadImage(file);
    const maxSide = 1500;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) throw new Error(`${file.name} konnte nicht vorbereitet werden.`);
    return { mimeType: 'image/jpeg', data: await blobBase64(blob), name: file.name };
  }

  async function payloadHash(images) {
    const joined = images.map(image => `${image.name}:${image.data}`).join('|');
    if (!crypto?.subtle) return `${Date.now()}-${joined.length}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(joined));
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function sortScreenshotFiles(files) {
    const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
    return [...(files || [])].map((file, selectionIndex) => ({ file, selectionIndex })).sort((left, right) => {
      const leftName = String(left.file?.name || '');
      const rightName = String(right.file?.name || '');
      const bothHaveSequence = /\d/.test(leftName) && /\d/.test(rightName);
      if (bothHaveSequence) {
        const nameOrder = collator.compare(leftName, rightName);
        if (nameOrder) return nameOrder;
      }
      const leftTime = Number(left.file?.lastModified);
      const rightTime = Number(right.file?.lastModified);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
      return collator.compare(leftName, rightName) || left.selectionIndex - right.selectionIndex;
    }).map(item => item.file);
  }

  function buildScreenshotBatches(images) {
    const groups = [];
    let current = [];
    let currentLength = 0;
    const flush = () => {
      if (!current.length) return;
      groups.push(current);
      current = [];
      currentLength = 0;
    };
    images.forEach((image, sourceIndex) => {
      const item = Object.assign({}, image, { sourceIndex });
      const length = item.data.length;
      if (length > SCREENSHOT_BATCH_MAX_CHARS) {
        throw new Error(`${item.name} ist auch nach der Vorbereitung noch zu groß.`);
      }
      if (current.length >= SCREENSHOT_BATCH_NEW_IMAGES || (current.length && currentLength + length > SCREENSHOT_BATCH_MAX_CHARS)) flush();
      current.push(item);
      currentLength += length;
    });
    flush();
    return groups.map((group, groupIndex) => {
      const context = groupIndex > 0 ? groups[groupIndex - 1].slice(-SCREENSHOT_BATCH_CONTEXT_IMAGES) : [];
      while (context.length && (
        context.length + group.length > SCREENSHOT_BATCH_SIZE
        || context.concat(group).reduce((sum, image) => sum + image.data.length, 0) > SCREENSHOT_BATCH_MAX_CHARS
      )) context.shift();
      const batchImages = context.concat(group);
      return {
        startIndex: batchImages[0].sourceIndex,
        contextCount: context.length,
        images: batchImages
      };
    });
  }

  function mergeVisibleFields(existing, incoming) {
    const merged = Object.assign({}, existing || {});
    Object.entries(incoming || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') merged[key] = value;
    });
    return merged;
  }

  function mergeScreenshotResults(results, expectedOpponent = '') {
    const names = new Map();
    const games = new Map();
    const players = new Map();
    const warnings = new Set();

    results.forEach((result, batchIndex) => {
      const data = result?.data || {};
      const batch = result?.batch || { startIndex: 0 };
      const opponentName = String(data.opponentName || '').trim();
      if (opponentName) names.set(opponentName, (names.get(opponentName) || 0) + 1);

      (Array.isArray(data.games) ? data.games : []).forEach(game => {
        const sourceIndex = batch.startIndex + normalizedNumber(game.sourceIndex);
        const normalized = Object.assign({}, game, {
          sourceIndex,
          opponentTeamStats: mergeVisibleFields({}, game.opponentTeamStats)
        });
        const signature = `${game.date || `bild-${sourceIndex}`}:${keyFor(game.home)}:${keyFor(game.away)}`;
        const previous = games.get(signature);
        games.set(signature, Object.assign({}, mergeVisibleFields(previous, normalized), {
          opponentTeamStats: mergeVisibleFields(previous?.opponentTeamStats, normalized.opponentTeamStats)
        }));
      });

      (Array.isArray(data.players) ? data.players : []).forEach(player => {
        const sourceIndex = batch.startIndex + normalizedNumber(player.sourceIndex);
        const normalized = Object.assign({}, player, { sourceIndex });
        const signature = `${player.gameDate || `bild-${sourceIndex}`}:${keyFor(player.name)}`;
        players.set(signature, mergeVisibleFields(players.get(signature), normalized));
      });

      (Array.isArray(data.warnings) ? data.warnings : []).forEach(warning => {
        const text = String(warning || '').trim();
        if (text) warnings.add(results.length > 1 ? `Paket ${batchIndex + 1}: ${text}` : text);
      });
    });

    const detectedName = [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return {
      opponentName: detectedName || expectedOpponent,
      games: [...games.values()].sort(compareGamesChronologically),
      players: [...players.values()].sort((a, b) => `${a.gameDate || ''}:${a.name || ''}`.localeCompare(`${b.gameDate || ''}:${b.name || ''}`, 'de')),
      warnings: [...warnings]
    };
  }

  async function runScreenshotBatches(batches, run, onProgress = () => {}) {
    const results = new Array(batches.length);
    let cursor = 0;
    let completed = 0;
    const worker = async () => {
      while (cursor < batches.length) {
        const index = cursor;
        cursor += 1;
        const batch = batches[index];
        let attempt = 0;
        while (attempt < 2) {
          attempt += 1;
          const requestBatch = attempt > 1 && batch.contextCount
            ? {
                startIndex: batch.images[batch.contextCount]?.sourceIndex ?? batch.startIndex,
                contextCount: 0,
                images: batch.images.slice(batch.contextCount)
              }
            : batch;
          onProgress({ type: 'start', index, attempt, completed, total: batches.length });
          try {
            results[index] = { response: await run(requestBatch, index, attempt), batch: requestBatch };
            completed += 1;
            onProgress({ type: 'complete', index, attempt, completed, total: batches.length });
            break;
          } catch (error) {
            const retryable = error?.retryable === true || ['CLIENT_TIMEOUT', 'AI_TIMEOUT', 'AI_SERVER_TIMEOUT', 'AI_RATE_LIMIT', 'AI_PROVIDER', 'AI_EMPTY_RESPONSE', 'AI_TRUNCATED_RESPONSE'].includes(error?.code);
            if (!retryable || attempt >= 2) {
              error.message = `Paket ${index + 1} von ${batches.length}: ${error.message}`;
              throw error;
            }
            onProgress({ type: 'retry', index, attempt, completed, total: batches.length });
            if (error?.code === 'AI_RATE_LIMIT') await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(SCREENSHOT_BATCH_CONCURRENCY, batches.length) }, () => worker()));
    return results;
  }

  async function analyzeScreenshots(profile, host) {
    const input = host.querySelector('[data-role="opponent-screenshots"]');
    const button = host.querySelector('[data-action="analyze-screenshots"]');
    const status = host.querySelector('[data-role="screenshot-status"]');
    const files = sortScreenshotFiles(input.files || []);
    if (!files.length || files.length > MAX_SCREENSHOTS) { status.textContent = `Bitte ein bis ${MAX_SCREENSHOTS} Screenshots auswählen.`; return; }
    if (!BT.api.getToken()) { location.hash = '#/account'; return; }
    button.disabled = true;
    status.textContent = `${files.length} Screenshot${files.length === 1 ? '' : 's'} werden sortiert und vorbereitet …`;
    try {
      const images = [];
      for (let index = 0; index < files.length; index += 1) {
        status.textContent = `Foto ${index + 1} von ${files.length} wird vorbereitet …`;
        images.push(await compressScreenshot(files[index]));
      }
      const hash = await payloadHash(images);
      if ((profile.screenshotImports || []).some(item => item.hash === hash)) throw new Error('Diese Screenshots wurden bereits übernommen.');
      const batches = buildScreenshotBatches(images);
      const processedBatches = await runScreenshotBatches(batches, (batch) => BT.api.ai('parseOpponentScreenshots', {
          images: batch.images.map(({ mimeType, data }) => ({ mimeType, data })),
          expectedOpponent: profile.name
        }), progress => {
          if (progress.type === 'retry') status.textContent = `Paket ${progress.index + 1} war zu langsam und wird kleiner erneut gesendet …`;
          else if (progress.type === 'complete') status.textContent = `${progress.completed} von ${progress.total} KI-Paketen ausgewertet …`;
          else status.textContent = `Basketball-KI verarbeitet Paket ${progress.index + 1} von ${progress.total} …`;
        });
      const results = processedBatches.map(({ response, batch }) => ({ data: response.data, model: response.model, requestId: response.requestId, batch }));
      pendingImport = {
        profileId: profile.id,
        hash,
        imageCount: images.length,
        batchCount: batches.length,
        data: mergeScreenshotResults(results, profile.name),
        model: results.find(result => result.model)?.model || '',
        requestId: results.find(result => result.requestId)?.requestId || '',
        requestIds: results.map(result => result.requestId).filter(Boolean)
      };
      renderScreenshotPreview(profile, host);
      status.textContent = `${files.length} Fotos wurden in ${batches.length} Paket${batches.length === 1 ? '' : 'en'} ausgewertet. Bitte Ergebnis prüfen.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  function renderScreenshotPreview(profile, host) {
    const preview = host.querySelector('[data-role="screenshot-preview"]');
    const data = pendingImport?.profileId === profile.id ? pendingImport.data : null;
    if (!data) { preview.replaceChildren(); return; }
    const opponentMismatch = data.opponentName && keyFor(data.opponentName) !== keyFor(profile.name);
    preview.innerHTML = `<div class="screenshot-review">
      <div class="screenshot-review-head">
        <div><span class="section-kicker">Erkannter Gegner</span><strong>${BT.util.escapeHTML(data.opponentName || profile.name)}</strong></div>
        <div class="screenshot-review-metrics">
          <span><strong>${data.games.length}</strong> Spiele</span>
          <span><strong>${data.players.length}</strong> Spielerwerte</span>
          <span><strong>${pendingImport.imageCount}</strong> Fotos</span>
        </div>
      </div>
      ${opponentMismatch ? '<p class="screenshot-warning"><strong>Achtung:</strong> Der erkannte Teamname weicht vom ausgewählten Gegner ab. Vor der Übernahme genau prüfen.</p>' : ''}
      ${data.games.length ? `<div class="screenshot-game-list">${data.games.map((game, gameIndex) => `<article class="screenshot-game-card"><time>Spiel ${gameIndex + 1} · ${BT.util.escapeHTML(game.date || 'Datum nicht lesbar')}</time><div><span>${BT.util.escapeHTML(game.home)}</span><strong>${game.homeScore ?? '–'}:${game.awayScore ?? '–'}</strong><span>${BT.util.escapeHTML(game.away)}</span></div>${visibleMadeShotLine(game.opponentTeamStats) ? `<small>Treffer Gegner: ${visibleMadeShotLine(game.opponentTeamStats)}</small>` : ''}</article>`).join('')}</div>` : '<p class="muted">In der Auswahl wurde noch kein vollständiges Spiel erkannt.</p>'}
      ${data.players.length ? `<details class="screenshot-player-details"><summary><span>Spielerwerte prüfen</span><strong>${data.players.length}</strong></summary><div class="table-scroll"><table class="results screenshot-player-preview"><thead><tr><th>Spiel</th><th>Spieler</th><th>PTS</th><th>PF</th><th>2P</th><th>3P</th></tr></thead><tbody>${data.players.map(player => `<tr><td>${BT.util.escapeHTML(player.gameDate)}</td><td>${BT.util.escapeHTML(player.name)}</td><td>${player.points ?? '–'}</td><td>${player.fouls ?? '–'}</td><td>${player.twoMade ?? '–'}</td><td>${player.threeMade ?? '–'}/${player.threeAttempted ?? '–'}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
      ${data.warnings.length ? `<details class="screenshot-warnings"><summary><span>Prüfhinweise</span><strong>${data.warnings.length}</strong></summary><ul>${data.warnings.map(warning => `<li>${BT.util.escapeHTML(warning)}</li>`).join('')}</ul></details>` : ''}
      <div class="form-actions"><button class="btn primary" type="button" data-action="confirm-screenshot-import">Geprüfte Daten übernehmen</button><button class="btn" type="button" data-action="discard-screenshot-import">Verwerfen</button></div>
    </div>`;
    preview.querySelector('[data-action="confirm-screenshot-import"]').addEventListener('click', () => confirmScreenshotImport(profile));
    preview.querySelector('[data-action="discard-screenshot-import"]').addEventListener('click', () => { pendingImport = null; renderScreenshotPreview(profile, host); });
  }

  function confirmScreenshotImport(profile) {
    if (!pendingImport || pendingImport.profileId !== profile.id) return;
    const importedAt = new Date().toISOString();
    const data = pendingImport.data;
    const games = profileGames(profile);
    for (const item of data.games) {
      if (!item.date) continue;
      const signature = `${item.date}:${keyFor(item.home)}:${keyFor(item.away)}`;
      const existing = games.find(game => gameSignature(game) === signature);
      const imported = {
        externalId: existing?.externalId || `dbbs_${pendingImport.hash.slice(0, 12)}_${item.sourceIndex}_${item.date}`,
        date: item.date,
        home: item.home,
        away: item.away,
        score: item.homeScore === null || item.awayScore === null ? '' : `${item.homeScore}:${item.awayScore}`,
        source: 'dbb-scores-screenshot',
        opponentTeamStats: item.opponentTeamStats,
        importedAt
      };
      if (existing) Object.assign(existing, imported, { externalId: existing.externalId || imported.externalId });
      else games.push(imported);
    }
    const playerRows = Array.isArray(profile.screenshotPlayerStats) ? profile.screenshotPlayerStats.slice() : [];
    for (const player of data.players) {
      const key = `${player.gameDate}:${keyFor(player.name)}`;
      const index = playerRows.findIndex(row => `${row.gameDate}:${keyFor(row.name)}` === key);
      const imported = Object.assign({}, player, { importHash: pendingImport.hash, importedAt });
      if (index >= 0) playerRows[index] = Object.assign({}, playerRows[index], imported);
      else playerRows.push(imported);
    }
    const imports = (profile.screenshotImports || []).concat({
      hash: pendingImport.hash,
      importedAt,
      imageCount: pendingImport.imageCount,
      batchCount: pendingImport.batchCount || 1,
      requestId: pendingImport.requestId,
      requestIds: pendingImport.requestIds || (pendingImport.requestId ? [pendingImport.requestId] : []),
      model: pendingImport.model,
      warnings: data.warnings
    });
    games.sort(compareGamesChronologically);
    BT.storage.upsertOpponent({ id: profile.id, games, screenshotPlayerStats: playerRows, screenshotImports: imports });
    pendingImport = null;
    BT.util.toast('DBB.Scores-Daten wurden geprüft übernommen.');
    drawList();
  }

  return {
    DEFENSE_LABELS,
    keyFor,
    metricsFor,
    shootingSummary,
    playerSummary,
    dataQuality,
    recommendDefense,
    contextForProfile,
    contextForGame,
    mergeGames,
    orderOpponentProfiles,
    sortScreenshotFiles,
    buildScreenshotBatches,
    runScreenshotBatches,
    mergeScreenshotResults,
    recordMatchdayFeedback,
    syncLeague,
    ensureFromOwnGames,
    render
  };
})();
