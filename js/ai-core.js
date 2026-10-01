window.BT = window.BT || {};

BT.aicore = (function() {
  function numberToken(value) {
    return String(value).replace(',', '.').replace(/\.0+$/, '');
  }

  function fact(id, type, text, names, numbers) {
    return {
      id,
      type,
      text,
      names: [...new Set((names || []).filter(Boolean).map(String))],
      numbers: [...new Set((numbers || []).filter((value) => value !== null && value !== undefined).map(numberToken))]
    };
  }

  function playerMap(players) {
    return new Map((players || []).map((player) => [String(player.id), String(player.name || player.displayName || '').trim()]));
  }

  function attendanceTotals(training) {
    const totals = { present: 0, absent: 0, excused: 0, injured: 0, late: 0 };
    for (const entry of training?.attendance || []) {
      if (Object.prototype.hasOwnProperty.call(totals, entry.status)) totals[entry.status] += 1;
      if (entry.late) totals.late += 1;
    }
    return totals;
  }

  function freeThrowTotals(training) {
    let made = 0;
    let attempted = 0;
    for (const entry of training?.freethrows || []) {
      made += Number(entry.made) || 0;
      attempted += Number(entry.attempted) || 0;
    }
    return { made, attempted, pct: attempted ? Math.round((made / attempted) * 100) : null };
  }

  function shotTotals(training) {
    const totals = [];
    for (const category of training?.shots || []) {
      let made = 0;
      let attempted = 0;
      for (const entry of category.entries || []) {
        made += Number(entry.made) || 0;
        attempted += Number(entry.attempted) || 0;
      }
      if (attempted > 0) {
        totals.push({
          category: String(category.category || 'Würfe').trim(),
          made,
          attempted,
          pct: Math.round((made / attempted) * 100)
        });
      }
    }
    return totals;
  }

  function playerPerformances(training, playersById) {
    const rows = [];
    for (const entry of training?.freethrows || []) {
      const attempted = Number(entry.attempted) || 0;
      const made = Number(entry.made) || 0;
      const name = playersById.get(String(entry.playerId));
      if (name && attempted >= 3) rows.push({ kind: 'Freiwürfe', name, made, attempted, pct: Math.round((made / attempted) * 100) });
    }
    for (const category of training?.shots || []) {
      for (const entry of category.entries || []) {
        const attempted = Number(entry.attempted) || 0;
        const made = Number(entry.made) || 0;
        const name = playersById.get(String(entry.playerId));
        if (name && attempted >= 3) rows.push({ kind: String(category.category || 'Würfe'), name, made, attempted, pct: Math.round((made / attempted) * 100) });
      }
    }
    rows.sort((left, right) => right.pct - left.pct || right.attempted - left.attempted || left.name.localeCompare(right.name, 'de'));
    const selected = [];
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.name)) continue;
      selected.push(row);
      seen.add(row.name);
      if (selected.length === 2) break;
    }
    return selected;
  }

  function buildSummaryFacts(training, previous, players) {
    const facts = [];
    const names = playerMap(players);
    const attendance = attendanceTotals(training);
    const attendanceCount = attendance.present + attendance.absent + attendance.excused + attendance.injured;
    if (attendanceCount > 0) {
      facts.push(fact(
        'attendance-current',
        'attendance',
        `${attendance.present} anwesend, ${attendance.excused} entschuldigt, ${attendance.absent} abwesend und ${attendance.injured} verletzt.`,
        [],
        [attendance.present, attendance.excused, attendance.absent, attendance.injured]
      ));
    }

    const freeThrows = freeThrowTotals(training);
    if (freeThrows.attempted > 0) {
      facts.push(fact(
        'freethrows-current',
        'freethrows',
        `Das Team traf ${freeThrows.made} von ${freeThrows.attempted} Freiwürfen (${freeThrows.pct} %).`,
        [],
        [freeThrows.made, freeThrows.attempted, freeThrows.pct]
      ));
    }

    shotTotals(training).forEach((shot, index) => {
      facts.push(fact(
        `shots-current-${index + 1}`,
        'shots',
        `${shot.category}: ${shot.made} von ${shot.attempted} Treffern (${shot.pct} %).`,
        [],
        [shot.made, shot.attempted, shot.pct]
      ));
    });

    playerPerformances(training, names).forEach((row, index) => {
      facts.push(fact(
        `player-performance-${index + 1}`,
        'player',
        `${row.name} traf bei ${row.kind} ${row.made} von ${row.attempted} Versuchen (${row.pct} %).`,
        [row.name],
        [row.made, row.attempted, row.pct]
      ));
    });

    const drillNames = (training?.plan?.drills || []).map((drill) => String(drill.name || '').trim()).filter(Boolean).slice(0, 6);
    if (drillNames.length) {
      facts.push(fact('drills-current', 'drills', `Trainiert wurden: ${drillNames.join(', ')}.`, [], []));
    }

    const previousFreeThrows = freeThrowTotals(previous);
    if (freeThrows.attempted > 0 && previousFreeThrows.attempted > 0) {
      facts.push(fact(
        'freethrows-trend',
        'trend',
        `Die Freiwurfquote veränderte sich vom vorherigen Training von ${previousFreeThrows.pct} % auf ${freeThrows.pct} %.`,
        [],
        [previousFreeThrows.pct, freeThrows.pct]
      ));
    }

    return { facts };
  }

  function hasAttendanceValue(training) {
    return (training?.attendance || []).some((entry) => Boolean(entry?.status || entry?.late || entry?.note));
  }

  function hasFreeThrowValue(training) {
    return (training?.freethrows || []).some((entry) => (Number(entry?.made) || 0) > 0 || (Number(entry?.attempted) || 0) > 0);
  }

  function hasShotValue(training) {
    return (training?.shots || []).some((category) => (category?.entries || []).some((entry) =>
      (Number(entry?.made) || 0) > 0 || (Number(entry?.attempted) || 0) > 0
    ));
  }

  function isProtectedTraining(training) {
    if (!training) return false;
    if (training.status === 'completed' || training.endedAt) return true;
    if (String(training.note || '').trim()) return true;
    if (training.plan && typeof training.plan === 'object') return true;
    if (training.planning && typeof training.planning === 'object') return true;
    return hasAttendanceValue(training) || hasFreeThrowValue(training) || hasShotValue(training);
  }

  function classifyPdfImport(parsed, trainings) {
    const existingByDate = new Map((trainings || []).map((training) => [training.date, training]));
    const items = (parsed?.trainings || []).map((planEntry) => {
      const date = String(planEntry?.date || '');
      const existing = existingByDate.get(date) || null;
      const action = !existing ? 'new' : isProtectedTraining(existing) ? 'protected' : 'fillable';
      const reason = action === 'new'
        ? 'Neuer Termin'
        : action === 'fillable'
          ? 'Leerer Termin'
          : 'Bereits manuell oder abgeschlossen';
      return { date, action, reason, existingId: existing?.id || null, planEntry };
    });
    return {
      items,
      counts: {
        new: items.filter((item) => item.action === 'new').length,
        fillable: items.filter((item) => item.action === 'fillable').length,
        protected: items.filter((item) => item.action === 'protected').length
      }
    };
  }

  return { buildSummaryFacts, classifyPdfImport, isProtectedTraining };
})();
