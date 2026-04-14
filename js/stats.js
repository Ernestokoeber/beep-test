window.BT = window.BT || {};

BT.stats = (function() {
  function pct(made, att) { return att ? Math.round((made / att) * 100) : 0; }

  function countTrainings() {
    return BT.storage.getTrainings().length;
  }

  function playerAttendance(playerId) {
    const trainings = BT.storage.getTrainings();
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
    const trainings = BT.storage.getTrainings();
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
    const trainings = BT.storage.getTrainings();
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
    const trainings = BT.storage.getTrainings();
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
    const trainings = BT.storage.getTrainings();
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
    const trainings = BT.storage.getTrainings();
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
    const trainings = BT.storage.getTrainings().slice()
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
    const trainings = BT.storage.getTrainings().slice()
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
    const trainings = BT.storage.getTrainings().slice()
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
    pct, countTrainings,
    playerAttendance, playerFreethrows, playerShotsByCategory,
    playerAttendanceTimeline, playerFreethrowsTimeline, playerShotsTimelineByCategory,
    rollingAttendancePct,
    teamAttendance, teamFreethrows, teamShotsByCategory,
    topAttenders, topFreethrowShooters, topShootersByCategory,
    nextTrainingCountdown
  };
})();
