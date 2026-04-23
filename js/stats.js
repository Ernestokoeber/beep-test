window.BT = window.BT || {};

BT.stats = (function() {
  function pct(made, att) { return att ? Math.round((made / att) * 100) : 0; }

  function isEnded(t) {
    if (!t) return false;
    if (t.endedAt) return true;
    // Fallback fuer Altdaten ohne explizites endedAt:
    // Trainings deren Datum in der Vergangenheit liegt gelten als abgeschlossen.
    if (t.date) {
      const today = new Date().toISOString().slice(0, 10);
      if (t.date < today) return true;
    }
    return false;
  }

  function endedTrainings() {
    return BT.storage.getTrainings().filter(isEnded).filter(BT.storage.inActiveSeason);
  }

  function allEndedTrainings() {
    return BT.storage.getTrainings().filter(isEnded);
  }

  function countTrainings() {
    return endedTrainings().length;
  }

  function playerAttendance(playerId) {
    const trainings = endedTrainings();
    const stats = { total: 0, present: 0, late: 0, absent: 0, excused: 0, injured: 0, pct: 0 };
    for (const t of trainings) {
      const a = (t.attendance || []).find(x => x.playerId === playerId);
      if (!a || !a.status) continue;
      stats.total++;
      if (stats[a.status] !== undefined) stats[a.status]++;
      if (a.late && a.status === 'present') stats.late++;
    }
    stats.pct = pct(stats.present, stats.total);
    return stats;
  }

  function playerFreethrows(playerId) {
    const trainings = endedTrainings();
    let made = 0, att = 0, sessions = 0;
    for (const t of trainings) {
      const e = (t.freethrows || []).find(x => x.playerId === playerId);
      if (e && (e.attempted || 0) > 0) {
        made += e.made || 0;
        att += e.attempted || 0;
        sessions++;
      }
    }
    return { made, attempted: att, pct: pct(made, att), sessions };
  }

  function playerShotsByCategory(playerId) {
    const trainings = endedTrainings();
    const byCat = new Map();
    for (const t of trainings) {
      for (const cat of (t.shots || [])) {
        const e = (cat.entries || []).find(x => x.playerId === playerId);
        if (!e || (e.attempted || 0) === 0) continue;
        const acc = byCat.get(cat.category) || { made: 0, attempted: 0, sessions: 0 };
        acc.made += e.made || 0;
        acc.attempted += e.attempted || 0;
        acc.sessions++;
        byCat.set(cat.category, acc);
      }
    }
    const out = [];
    byCat.forEach((v, k) => out.push({ category: k, made: v.made, attempted: v.attempted, pct: pct(v.made, v.attempted), sessions: v.sessions }));
    out.sort((a, b) => a.category.localeCompare(b.category, 'de'));
    return out;
  }

  function teamAttendance() {
    const trainings = endedTrainings();
    let slots = 0, present = 0;
    for (const t of trainings) {
      for (const a of (t.attendance || [])) {
        if (!a.status) continue;
        slots++;
        if (a.status === 'present') present++;
      }
    }
    return { totalTrainings: trainings.length, slots, present, pct: pct(present, slots) };
  }

  function teamFreethrows() {
    const trainings = endedTrainings();
    let made = 0, att = 0, sessions = 0;
    for (const t of trainings) {
      let tMade = 0, tAtt = 0, any = false;
      for (const e of (t.freethrows || [])) {
        if ((e.attempted || 0) > 0) { tMade += e.made || 0; tAtt += e.attempted || 0; any = true; }
      }
      if (any) { made += tMade; att += tAtt; sessions++; }
    }
    return { made, attempted: att, pct: pct(made, att), sessions };
  }

  function teamShotsByCategory() {
    const trainings = endedTrainings();
    const byCat = new Map();
    for (const t of trainings) {
      for (const cat of (t.shots || [])) {
        const acc = byCat.get(cat.category) || { made: 0, attempted: 0, sessions: 0 };
        let any = false;
        for (const e of (cat.entries || [])) {
          if ((e.attempted || 0) > 0) { acc.made += e.made || 0; acc.attempted += e.attempted || 0; any = true; }
        }
        if (any) acc.sessions++;
        byCat.set(cat.category, acc);
      }
    }
    const out = [];
    byCat.forEach((v, k) => out.push({ category: k, made: v.made, attempted: v.attempted, pct: pct(v.made, v.attempted), sessions: v.sessions }));
    out.sort((a, b) => a.category.localeCompare(b.category, 'de'));
    return out;
  }

  function topAttenders(limit) {
    const players = BT.storage.getPlayers().filter(p => !p.archived);
    const rows = players.map(p => ({ player: p, stats: playerAttendance(p.id) }))
      .filter(r => r.stats.total > 0)
      .sort((a, b) => {
        if (b.stats.pct !== a.stats.pct) return b.stats.pct - a.stats.pct;
        return b.stats.present - a.stats.present;
      });
    return rows.slice(0, limit || rows.length);
  }

  function topFreethrowShooters(limit, minAttempts) {
    const m = minAttempts || 10;
    const players = BT.storage.getPlayers().filter(p => !p.archived);
    const rows = players.map(p => ({ player: p, stats: playerFreethrows(p.id) }))
      .filter(r => r.stats.attempted >= m)
      .sort((a, b) => {
        if (b.stats.pct !== a.stats.pct) return b.stats.pct - a.stats.pct;
        return b.stats.attempted - a.stats.attempted;
      });
    return rows.slice(0, limit || rows.length);
  }

  function topShootersByCategory(category, limit, minAttempts) {
    const m = minAttempts || 5;
    const players = BT.storage.getPlayers().filter(p => !p.archived);
    const rows = [];
    for (const p of players) {
      const cats = playerShotsByCategory(p.id);
      const s = cats.find(c => c.category === category);
      if (s && s.attempted >= m) rows.push({ player: p, stats: s });
    }
    rows.sort((a, b) => {
      if (b.stats.pct !== a.stats.pct) return b.stats.pct - a.stats.pct;
      return b.stats.attempted - a.stats.attempted;
    });
    return rows.slice(0, limit || rows.length);
  }

  function playerAttendanceTimeline(playerId) {
    const trainings = endedTrainings().slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const out = [];
    for (const t of trainings) {
      const a = (t.attendance || []).find(x => x.playerId === playerId);
      if (!a || !a.status) continue;
      out.push({ date: t.date, status: a.status, late: !!a.late });
    }
    return out;
  }

  function playerFreethrowsTimeline(playerId) {
    const trainings = endedTrainings().slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const out = [];
    for (const t of trainings) {
      const e = (t.freethrows || []).find(x => x.playerId === playerId);
      if (!e || (e.attempted || 0) === 0) continue;
      out.push({ date: t.date, made: e.made, attempted: e.attempted, pct: pct(e.made, e.attempted) });
    }
    return out;
  }

  function playerShotsTimelineByCategory(playerId, category) {
    const trainings = endedTrainings().slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const out = [];
    for (const t of trainings) {
      const cat = (t.shots || []).find(s => s.category === category);
      if (!cat) continue;
      const e = (cat.entries || []).find(x => x.playerId === playerId);
      if (!e || (e.attempted || 0) === 0) continue;
      out.push({ date: t.date, made: e.made, attempted: e.attempted, pct: pct(e.made, e.attempted) });
    }
    return out;
  }

  function rollingAttendancePct(timeline, window) {
    const w = window || 5;
    const out = [];
    for (let i = 0; i < timeline.length; i++) {
      const start = Math.max(0, i - w + 1);
      const slice = timeline.slice(start, i + 1);
      const present = slice.filter(x => x.status === 'present').length;
      out.push({ date: timeline[i].date, pct: pct(present, slice.length) });
    }
    return out;
  }

  function trainingTeamShotQuote(trainingId) {
    const t = BT.storage.getTraining(trainingId);
    if (!t) {
      return {
        total: { made: 0, attempted: 0, pct: 0 },
        freethrows: { made: 0, attempted: 0, pct: 0 },
        byCategory: [],
        deltaVsSeason: { totalPct: null, ftPct: null }
      };
    }

    // Feldwuerfe nach Kategorie + Total (ohne FT)
    const byCategory = [];
    let totMade = 0, totAtt = 0;
    for (const cat of (t.shots || [])) {
      let cMade = 0, cAtt = 0;
      for (const e of (cat.entries || [])) {
        cMade += e.made || 0;
        cAtt += e.attempted || 0;
      }
      byCategory.push({ category: cat.category, made: cMade, attempted: cAtt, pct: pct(cMade, cAtt) });
      totMade += cMade;
      totAtt += cAtt;
    }
    byCategory.sort((a, b) => a.category.localeCompare(b.category, 'de'));

    // Freiwuerfe separat
    let ftMade = 0, ftAtt = 0;
    for (const e of (t.freethrows || [])) {
      ftMade += e.made || 0;
      ftAtt += e.attempted || 0;
    }

    // Saisonvergleich: bisherige abgeschlossene Trainings derselben seasonId, OHNE das aktuelle
    const seasonTrainings = BT.storage.getTrainings().filter(function(x) {
      return isEnded(x) && x.id !== t.id && (x.seasonId || null) === (t.seasonId || null);
    });
    let seasonTotMade = 0, seasonTotAtt = 0, seasonFtMade = 0, seasonFtAtt = 0;
    for (const st of seasonTrainings) {
      for (const cat of (st.shots || [])) {
        for (const e of (cat.entries || [])) {
          seasonTotMade += e.made || 0;
          seasonTotAtt += e.attempted || 0;
        }
      }
      for (const e of (st.freethrows || [])) {
        seasonFtMade += e.made || 0;
        seasonFtAtt += e.attempted || 0;
      }
    }
    const totalPctDelta = seasonTotAtt > 0 && totAtt > 0 ? pct(totMade, totAtt) - pct(seasonTotMade, seasonTotAtt) : null;
    const ftPctDelta = seasonFtAtt > 0 && ftAtt > 0 ? pct(ftMade, ftAtt) - pct(seasonFtMade, seasonFtAtt) : null;

    return {
      total: { made: totMade, attempted: totAtt, pct: pct(totMade, totAtt) },
      freethrows: { made: ftMade, attempted: ftAtt, pct: pct(ftMade, ftAtt) },
      byCategory: byCategory,
      deltaVsSeason: { totalPct: totalPctDelta, ftPct: ftPctDelta }
    };
  }

  function trainingDelta(trainingId) {
    const t = BT.storage.getTraining(trainingId);
    if (!t) return { ftDelta: null, fgDelta: null, attendanceDelta: null, trend: null };

    // Vorangegangenes abgeschlossenes Training derselben Saison (direkt davor in Datum-Reihenfolge)
    const sameSeason = BT.storage.getTrainings()
      .filter(function(x) { return isEnded(x) && (x.seasonId || null) === (t.seasonId || null); })
      .slice()
      .sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
    const idx = sameSeason.findIndex(function(x) { return x.id === t.id; });
    const prev = idx > 0 ? sameSeason[idx - 1] : null;
    if (!prev) return { ftDelta: null, fgDelta: null, attendanceDelta: null, trend: null };

    function aggFt(x) {
      let m = 0, a = 0;
      for (const e of (x.freethrows || [])) { m += e.made || 0; a += e.attempted || 0; }
      return { made: m, attempted: a };
    }
    function aggFg(x) {
      let m = 0, a = 0;
      for (const cat of (x.shots || [])) {
        for (const e of (cat.entries || [])) { m += e.made || 0; a += e.attempted || 0; }
      }
      return { made: m, attempted: a };
    }
    function aggAtt(x) {
      let n = 0;
      for (const a of (x.attendance || [])) {
        if (a.status === 'present') { n++; if (a.late) n++; }
      }
      return n;
    }

    const tFt = aggFt(t), pFt = aggFt(prev);
    const tFg = aggFg(t), pFg = aggFg(prev);
    const ftDelta = (tFt.attempted > 0 && pFt.attempted > 0) ? pct(tFt.made, tFt.attempted) - pct(pFt.made, pFt.attempted) : null;
    const fgDelta = (tFg.attempted > 0 && pFg.attempted > 0) ? pct(tFg.made, tFg.attempted) - pct(pFg.made, pFg.attempted) : null;
    const attendanceDelta = aggAtt(t) - aggAtt(prev);

    let trend = null;
    if (ftDelta !== null || fgDelta !== null) {
      const parts = [];
      if (ftDelta !== null) parts.push(ftDelta);
      if (fgDelta !== null) parts.push(fgDelta);
      const avg = parts.reduce(function(s, v) { return s + v; }, 0) / parts.length;
      if (avg > 2) trend = 'up';
      else if (avg < -2) trend = 'down';
      else trend = 'flat';
    }

    return { ftDelta: ftDelta, fgDelta: fgDelta, attendanceDelta: attendanceDelta, trend: trend };
  }

  const FITNESS_METRICS = [
    { key: 'sprint',      label: 'Sprint',        unit: 's',  digits: 2, lowerIsBetter: true  },
    { key: 'rimTouches',  label: 'Rim Touches',   unit: '',   digits: 0, lowerIsBetter: false },
    { key: 'laneAgility', label: 'Lane Agility',  unit: 's',  digits: 2, lowerIsBetter: true  },
    { key: 'pushUps',     label: 'Liegestütze',   unit: '',   digits: 0, lowerIsBetter: false }
  ];

  function presentIdSet(training) {
    const archived = new Set(BT.storage.getPlayers().filter(p => p.archived).map(p => p.id));
    const ids = new Set();
    for (const a of (training.attendance || [])) {
      if (a && a.status === 'present' && !archived.has(a.playerId)) ids.add(a.playerId);
    }
    return ids;
  }

  function trainingFitnessSummary(trainingId) {
    const t = BT.storage.getTraining(trainingId);
    const emptyMetric = m => ({
      key: m.key, label: m.label, unit: m.unit, digits: m.digits,
      lowerIsBetter: m.lowerIsBetter,
      best: null, avg: null, count: 0
    });
    const out = { metrics: FITNESS_METRICS.map(emptyMetric), trends: [], hasAny: false };
    if (!t) return out;

    const presentIds = presentIdSet(t);
    const entries = (t.fitness || []).filter(e => presentIds.has(e.playerId));
    const players = BT.storage.getPlayers();
    const playerName = id => (players.find(p => p.id === id) || {}).name || 'Unbekannt';

    for (const m of out.metrics) {
      const vals = [];
      for (const e of entries) {
        const v = e[m.key];
        if (v == null || isNaN(v)) continue;
        vals.push({ playerId: e.playerId, value: v });
      }
      m.count = vals.length;
      if (vals.length === 0) continue;
      out.hasAny = true;
      const sum = vals.reduce((s, x) => s + x.value, 0);
      m.avg = sum / vals.length;
      const best = vals.reduce((acc, x) =>
        acc == null ? x : (m.lowerIsBetter ? (x.value < acc.value ? x : acc) : (x.value > acc.value ? x : acc)),
      null);
      m.best = { value: best.value, playerId: best.playerId, playerName: playerName(best.playerId) };
    }

    // Trends: pro Spieler pro Metrik Delta zum letzten Training mit Wert (chronologisch frueher).
    const prior = BT.storage.getTrainings()
      .filter(x => x.id !== t.id && (x.date || '') <= (t.date || '') && isEnded(x))
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // neueste zuerst
    const perPlayerTrend = new Map();
    for (const e of entries) {
      for (const m of FITNESS_METRICS) {
        const cur = e[m.key];
        if (cur == null || isNaN(cur)) continue;
        let prev = null;
        for (const pt of prior) {
          const pe = (pt.fitness || []).find(x => x.playerId === e.playerId);
          if (pe && pe[m.key] != null && !isNaN(pe[m.key])) { prev = pe[m.key]; break; }
        }
        if (prev == null) continue;
        const delta = cur - prev;
        if (delta === 0) continue;
        const improved = m.lowerIsBetter ? delta < 0 : delta > 0;
        if (!perPlayerTrend.has(e.playerId)) perPlayerTrend.set(e.playerId, []);
        perPlayerTrend.get(e.playerId).push({
          metric: m.key, metricLabel: m.label, unit: m.unit, digits: m.digits,
          prev: prev, current: cur, delta: delta, improved: improved
        });
      }
    }
    for (const [playerId, items] of perPlayerTrend.entries()) {
      out.trends.push({ playerId, playerName: playerName(playerId), items });
    }
    out.trends.sort((a, b) => a.playerName.localeCompare(b.playerName, 'de'));
    return out;
  }

  function trainingSprintSummary(trainingId) {
    const t = BT.storage.getTraining(trainingId);
    const out = { best: null, avg: null, count: 0, totalRuns: 0 };
    if (!t) return out;
    const presentIds = presentIdSet(t);
    const players = BT.storage.getPlayers();
    const playerName = id => (players.find(p => p.id === id) || {}).name || 'Unbekannt';

    const perPlayerBest = [];
    for (const s of (t.sprints || [])) {
      if (!presentIds.has(s.playerId)) continue;
      const times = (s.times || []).map(x => typeof x === 'number' ? x : (x && x.sec))
        .filter(v => v != null && !isNaN(v));
      if (times.length === 0) continue;
      out.totalRuns += times.length;
      const b = Math.min.apply(null, times);
      perPlayerBest.push({ playerId: s.playerId, value: b });
    }
    out.count = perPlayerBest.length;
    if (perPlayerBest.length === 0) return out;
    const best = perPlayerBest.reduce((acc, x) => acc == null ? x : (x.value < acc.value ? x : acc), null);
    out.best = { value: best.value, playerId: best.playerId, playerName: playerName(best.playerId) };
    out.avg = perPlayerBest.reduce((s, x) => s + x.value, 0) / perPlayerBest.length;
    return out;
  }

  function playerFitness(playerId) {
    const trainings = allEndedTrainings().slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const metrics = [
      { key: 'sprint',      label: 'Sprint',       unit: 's', digits: 2, lowerIsBetter: true  },
      { key: 'rimTouches',  label: 'Rim Touches',  unit: '',  digits: 0, lowerIsBetter: false },
      { key: 'laneAgility', label: 'Lane Agility', unit: 's', digits: 2, lowerIsBetter: true  },
      { key: 'pushUps',     label: 'Liegestütze',  unit: '',  digits: 0, lowerIsBetter: false }
    ];
    const out = { metrics: [], hasAny: false };
    for (const m of metrics) {
      const entries = [];
      for (const t of trainings) {
        const e = (t.fitness || []).find(x => x.playerId === playerId);
        if (e && e[m.key] != null && !isNaN(e[m.key])) {
          entries.push({ date: t.date, value: e[m.key] });
        }
      }
      if (entries.length === 0) {
        out.metrics.push({ key: m.key, label: m.label, unit: m.unit, digits: m.digits, count: 0, latest: null, best: null, previous: null });
        continue;
      }
      out.hasAny = true;
      const latest = entries[entries.length - 1];
      const previous = entries.length >= 2 ? entries[entries.length - 2] : null;
      const best = entries.reduce((acc, x) =>
        acc == null ? x : (m.lowerIsBetter ? (x.value < acc.value ? x : acc) : (x.value > acc.value ? x : acc)),
      null);
      out.metrics.push({
        key: m.key, label: m.label, unit: m.unit, digits: m.digits, lowerIsBetter: m.lowerIsBetter,
        count: entries.length,
        latest: { value: latest.value, date: latest.date },
        previous: previous ? { value: previous.value, date: previous.date } : null,
        best: { value: best.value, date: best.date }
      });
    }
    return out;
  }

  function teamAlerts() {
    const out = [];
    const players = BT.storage.getPlayers().filter(p => !p.archived);
    const trainingsChrono = endedTrainings().slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    for (const p of players) {
      // 1) Anwesenheit: >=3 Abwesenheiten in Folge (die letzten 3 Trainings)
      const last3 = trainingsChrono.slice(-3);
      if (last3.length === 3) {
        const statuses = last3.map(t => {
          const a = (t.attendance || []).find(x => x.playerId === p.id);
          return a && a.status;
        });
        const missedAll = statuses.every(s => s === 'absent' || s === 'excused');
        if (missedAll) {
          out.push({
            severity: 'warn',
            playerId: p.id,
            playerName: p.name,
            type: 'attendance',
            message: p.name + ' hat die letzten 3 Trainings gefehlt'
          });
        }
      }

      // 2) FT-Form: letzte 3 FT-Trainings mind. 10% schlechter als Saisonschnitt (davor)
      const ftSessions = trainingsChrono.filter(t => {
        const e = (t.freethrows || []).find(x => x.playerId === p.id);
        return e && (e.attempted || 0) > 0;
      });
      if (ftSessions.length >= 5) {
        const recent = ftSessions.slice(-3);
        const baseline = ftSessions.slice(0, ftSessions.length - 3);
        let rM = 0, rA = 0, bM = 0, bA = 0;
        for (const t of recent) {
          const e = (t.freethrows || []).find(x => x.playerId === p.id);
          rM += e.made || 0; rA += e.attempted || 0;
        }
        for (const t of baseline) {
          const e = (t.freethrows || []).find(x => x.playerId === p.id);
          bM += e.made || 0; bA += e.attempted || 0;
        }
        const rPct = pct(rM, rA);
        const bPct = pct(bM, bA);
        if (bPct > 0 && rPct - bPct <= -10) {
          out.push({
            severity: 'warn',
            playerId: p.id,
            playerName: p.name,
            type: 'ft_decline',
            message: p.name + ': Freiwurf-Form ' + (rPct - bPct) + ' % unter Saisonschnitt (' + rPct + ' % vs. ' + bPct + ' %)'
          });
        }
      }

      // 3) Fitness-Rueckgang: letzter Fitness-Wert pro Metrik schlechter als der vorvorherige
      const fitnessTrainings = trainingsChrono.filter(t =>
        (t.fitness || []).some(e => e.playerId === p.id &&
          ['sprint','rimTouches','laneAgility','pushUps'].some(k => e[k] != null && !isNaN(e[k])))
      );
      if (fitnessTrainings.length >= 2) {
        const lastT = fitnessTrainings[fitnessTrainings.length - 1];
        const prevT = fitnessTrainings[fitnessTrainings.length - 2];
        const lastE = (lastT.fitness || []).find(e => e.playerId === p.id);
        const prevE = (prevT.fitness || []).find(e => e.playerId === p.id);
        const metricMeta = {
          sprint:      { label: 'Sprint',       lowerIsBetter: true },
          rimTouches:  { label: 'Rim Touches',  lowerIsBetter: false },
          laneAgility: { label: 'Lane Agility', lowerIsBetter: true },
          pushUps:     { label: 'Liegestütze',  lowerIsBetter: false }
        };
        const declined = [];
        for (const key of Object.keys(metricMeta)) {
          if (lastE && prevE && lastE[key] != null && prevE[key] != null) {
            const m = metricMeta[key];
            const worse = m.lowerIsBetter ? lastE[key] > prevE[key] : lastE[key] < prevE[key];
            if (worse) declined.push(m.label);
          }
        }
        if (declined.length >= 2) {
          out.push({
            severity: 'info',
            playerId: p.id,
            playerName: p.name,
            type: 'fitness_decline',
            message: p.name + ': Fitness-Rueckgang bei ' + declined.join(', ')
          });
        }
      }
    }

    // Severity-Sortierung: warn vor info
    out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1));
    return out;
  }

  function attendanceStreak(playerId) {
    // Seasonuebergreifend: alle abgeschlossenen Trainings chronologisch (aelteste zuerst).
    const trainings = allEndedTrainings().slice()
      .sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });

    let current = 0, longest = 0, running = 0;
    let lastMissed = null;

    for (const t of trainings) {
      const a = (t.attendance || []).find(function(x) { return x.playerId === playerId; });
      // Entscheidung: Trainings ohne Eintrag oder mit status=null werden ignoriert (nicht-bewertbar, kein Streak-Reset).
      if (!a || !a.status) continue;
      const attended = a.status === 'present' || a.late === true;
      if (attended) {
        running++;
        if (running > longest) longest = running;
      } else {
        running = 0;
        lastMissed = t.date || lastMissed;
      }
    }
    // current = Streak vom juengsten Training rueckwaerts
    for (let i = trainings.length - 1; i >= 0; i--) {
      const t = trainings[i];
      const a = (t.attendance || []).find(function(x) { return x.playerId === playerId; });
      if (!a || !a.status) continue;
      const attended = a.status === 'present' || a.late === true;
      if (attended) current++;
      else break;
    }

    return { current: current, longest: longest, lastMissed: lastMissed };
  }

  function playerFTSparkline(playerId, lastN) {
    const n = lastN || 10;
    // Seasonuebergreifend: alle abgeschlossenen Trainings, chronologisch
    const trainings = allEndedTrainings().slice()
      .sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
    const rows = [];
    for (const t of trainings) {
      const e = (t.freethrows || []).find(function(x) { return x.playerId === playerId; });
      if (!e || (e.attempted || 0) === 0) continue;
      rows.push({
        trainingId: t.id,
        date: t.date,
        made: e.made || 0,
        attempted: e.attempted || 0,
        pct: pct(e.made || 0, e.attempted || 0)
      });
    }
    return rows.slice(-n);
  }

  function statsByPosition() {
    const trainings = endedTrainings();
    const players = BT.storage.getPlayers().filter(function(p) { return !p.archived; });

    const buckets = {};
    function ensure(pos) {
      if (!buckets[pos]) {
        buckets[pos] = {
          position: pos,
          players: 0,
          ftMade: 0, ftAttempted: 0, ftPct: 0,
          fgMade: 0, fgAttempted: 0, fgPct: 0,
          attendancePct: 0,
          _attSum: 0, _attCount: 0
        };
      }
      return buckets[pos];
    }

    for (const p of players) {
      const pos = p.position && String(p.position).trim() ? p.position : 'Ohne Position';
      const b = ensure(pos);
      b.players++;

      const att = playerAttendance(p.id);
      if (att.total > 0) {
        b._attSum += att.pct;
        b._attCount++;
      }

      for (const t of trainings) {
        const fe = (t.freethrows || []).find(function(x) { return x.playerId === p.id; });
        if (fe && (fe.attempted || 0) > 0) {
          b.ftMade += fe.made || 0;
          b.ftAttempted += fe.attempted || 0;
        }
        for (const cat of (t.shots || [])) {
          const se = (cat.entries || []).find(function(x) { return x.playerId === p.id; });
          if (se && (se.attempted || 0) > 0) {
            b.fgMade += se.made || 0;
            b.fgAttempted += se.attempted || 0;
          }
        }
      }
    }

    const out = {};
    Object.keys(buckets).forEach(function(k) {
      const b = buckets[k];
      b.ftPct = pct(b.ftMade, b.ftAttempted);
      b.fgPct = pct(b.fgMade, b.fgAttempted);
      b.attendancePct = b._attCount > 0 ? Math.round(b._attSum / b._attCount) : 0;
      delete b._attSum;
      delete b._attCount;
      out[k] = b;
    });
    return out;
  }

  function improvingPlayers(recentCount, baselineCount, limit) {
    const rc = recentCount || 3;
    const bc = baselineCount || 5;
    const lim = limit || 3;

    const trainings = endedTrainings().slice()
      .sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
    const players = BT.storage.getPlayers().filter(function(p) { return !p.archived; });

    function aggFor(playerId, slice) {
      let ftM = 0, ftA = 0, fgM = 0, fgA = 0;
      for (const t of slice) {
        const fe = (t.freethrows || []).find(function(x) { return x.playerId === playerId; });
        if (fe && (fe.attempted || 0) > 0) { ftM += fe.made || 0; ftA += fe.attempted || 0; }
        for (const cat of (t.shots || [])) {
          const se = (cat.entries || []).find(function(x) { return x.playerId === playerId; });
          if (se && (se.attempted || 0) > 0) { fgM += se.made || 0; fgA += se.attempted || 0; }
        }
      }
      const ftPct = ftA > 0 ? pct(ftM, ftA) : null;
      const fgPct = fgA > 0 ? pct(fgM, fgA) : null;
      if (ftPct === null || fgPct === null) return null;
      return { ftPct: ftPct, fgPct: fgPct, combinedPct: Math.round((ftPct + fgPct) / 2) };
    }

    const results = [];
    for (const p of players) {
      // Nur Trainings wo Spieler ueberhaupt teilgenommen/Daten hat — wir nehmen einfach die letzten rc+bc
      // aus allen Saison-Trainings und teilen dann.
      const recentSlice = trainings.slice(-rc);
      const baselineSlice = trainings.slice(-(rc + bc), -rc);
      if (recentSlice.length === 0 || baselineSlice.length === 0) continue;

      const recent = aggFor(p.id, recentSlice);
      const baseline = aggFor(p.id, baselineSlice);
      if (!recent || !baseline) continue;

      const delta = recent.combinedPct - baseline.combinedPct;
      if (delta > 0) {
        results.push({
          player: { id: p.id, name: p.name, position: p.position || null },
          recent: recent,
          baseline: baseline,
          delta: delta
        });
      }
    }
    results.sort(function(a, b) { return b.delta - a.delta; });
    return results.slice(0, lim);
  }

  function nextTrainingCountdown() {
    const days = BT.storage.getSetting('regularDays', null);
    const time = BT.storage.getSetting('regularTime', '20:15');
    if (!Array.isArray(days) || days.length === 0) return null;
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const nums = days.map(d => dayMap[d]).filter(n => n !== undefined);
    if (nums.length === 0) return null;

    const [h, m] = time.split(':').map(x => parseInt(x, 10));
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(h || 20, m || 15, 0, 0);
      if (nums.includes(d.getDay()) && d > now) {
        const diffMs = d - now;
        const diffDays = Math.floor(diffMs / 86400000);
        const diffHours = Math.floor((diffMs % 86400000) / 3600000);
        return { date: d, diffDays, diffHours };
      }
    }
    return null;
  }

  return {
    pct, countTrainings, isEnded, endedTrainings, allEndedTrainings,
    playerAttendance, playerFreethrows, playerShotsByCategory,
    playerAttendanceTimeline, playerFreethrowsTimeline, playerShotsTimelineByCategory,
    rollingAttendancePct,
    teamAttendance, teamFreethrows, teamShotsByCategory,
    topAttenders, topFreethrowShooters, topShootersByCategory,
    nextTrainingCountdown,
    trainingTeamShotQuote, trainingDelta, trainingFitnessSummary, trainingSprintSummary, attendanceStreak,
    teamAlerts, playerFitness,
    playerFTSparkline, statsByPosition, improvingPlayers
  };
})();
