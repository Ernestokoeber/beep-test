window.BT = window.BT || {};

BT.dashboard = (function() {
  const { $, renderTemplate, escapeHTML, downloadCSV, downloadJSON, todayISO, formatDate } = BT.util;

  function render(target) {
    const root = renderTemplate('tpl-dashboard');
    target.appendChild(root);

    $('[data-action="share-backup"]', root).addEventListener('click', () => BT.history.shareBackup());
    $('[data-action="import-backup"]', root).addEventListener('click', () => BT.history.importBackup());
    $('[data-action="export-season-csv"]', root).addEventListener('click', exportSeasonCSV);
    $('[data-action="export-season-json"]', root).addEventListener('click', exportSeasonJSON);

    const trainings = BT.storage.getTrainings();
    $('[data-role="trainings-count"]', root).textContent = trainings.length;

    const next = BT.stats.nextTrainingCountdown();
    const nextEl = $('[data-role="next-training"]', root);
    if (next) {
      const dStr = next.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const tStr = next.date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const inStr = next.diffDays > 0 ? 'in ' + next.diffDays + ' Tagen' : 'in ' + next.diffHours + ' h';
      nextEl.textContent = 'Nächstes: ' + dStr + ' ' + tStr + ' (' + inStr + ')';
    } else {
      nextEl.innerHTML = '<a href="#/schedule">Plan einrichten</a>';
    }

    const ta = BT.stats.teamAttendance();
    $('[data-role="team-att-pct"]', root).textContent = ta.pct;
    $('[data-role="team-att-sub"]', root).textContent = ta.present + ' von ' + ta.slots + ' Slots';

    const tf = BT.stats.teamFreethrows();
    $('[data-role="team-ft-pct"]', root).textContent = tf.pct;
    $('[data-role="team-ft-sub"]', root).textContent = tf.attempted > 0
      ? tf.made + '/' + tf.attempted + ' aus ' + tf.sessions + ' Sessions'
      : 'Noch keine Daten';

    renderTopAttenders(root);
    renderTopFT(root);
    renderShotCategories(root);
  }

  function renderTopAttenders(root) {
    const list = $('[data-role="top-att"]', root);
    list.innerHTML = '';
    const top = BT.stats.topAttenders(10);
    if (top.length === 0) {
      const li = document.createElement('li');
      li.className = 'rank-empty';
      li.textContent = 'Noch keine Anwesenheits-Daten.';
      list.appendChild(li);
      return;
    }
    top.forEach((row, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <a class="rank-name" href="#/player/${row.player.id}">${escapeHTML(row.player.name)}</a>
        <span class="rank-bar"><span class="rank-fill" style="width:${row.stats.pct}%"></span></span>
        <span class="rank-val">${row.stats.pct}% <span class="muted-chip">(${row.stats.present}/${row.stats.total})</span></span>
      `;
      list.appendChild(li);
    });
  }

  function renderTopFT(root) {
    const list = $('[data-role="top-ft"]', root);
    const empty = $('[data-role="top-ft-empty"]', root);
    list.innerHTML = '';
    const top = BT.stats.topFreethrowShooters(10, 10);
    if (top.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    top.forEach((row, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <a class="rank-name" href="#/player/${row.player.id}">${escapeHTML(row.player.name)}</a>
        <span class="rank-bar"><span class="rank-fill" style="width:${row.stats.pct}%"></span></span>
        <span class="rank-val">${row.stats.pct}% <span class="muted-chip">(${row.stats.made}/${row.stats.attempted})</span></span>
      `;
      list.appendChild(li);
    });
  }

  function renderShotCategories(root) {
    const wrap = $('[data-role="shot-cats"]', root);
    const empty = $('[data-role="shot-cats-empty"]', root);
    wrap.innerHTML = '';
    const cats = BT.stats.teamShotsByCategory().filter(c => c.attempted > 0);
    if (cats.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    for (const cat of cats) {
      const block = document.createElement('div');
      block.className = 'cat-block';
      const top = BT.stats.topShootersByCategory(cat.category, 3, 5);
      block.innerHTML = `
        <div class="cat-block-head">
          <span class="cat-name">${escapeHTML(cat.category)}</span>
          <span class="att-chip ok">${cat.pct}%</span>
          <span class="muted-chip">${cat.made}/${cat.attempted}</span>
        </div>
        <ol class="ranking compact">
          ${top.length === 0 ? '<li class="rank-empty">Noch zu wenig Daten (min. 5 Versuche)</li>' : top.map((r, i) => `
            <li>
              <span class="rank-pos">${i + 1}</span>
              <a class="rank-name" href="#/player/${r.player.id}">${escapeHTML(r.player.name)}</a>
              <span class="rank-val">${r.stats.pct}% <span class="muted-chip">(${r.stats.made}/${r.stats.attempted})</span></span>
            </li>
          `).join('')}
        </ol>
      `;
      wrap.appendChild(block);
    }
  }

  function exportSeasonCSV() {
    const trainings = BT.storage.getTrainings().slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const players = BT.storage.getPlayers();
    const playerById = id => players.find(p => p.id === id);

    const STATUS_SYMBOL = { present: '✓', absent: '✗', excused: 'E', injured: 'V' };
    const rows = [];
    rows.push(['# Saison-Export', 'Erstellt: ' + new Date().toISOString()]);
    rows.push([]);

    rows.push(['# Anwesenheits-Matrix']);
    const header = ['Spieler', 'Position'].concat(trainings.map(t => t.date)).concat(['Anwesend', 'Möglich', 'Quote %']);
    rows.push(header);
    const sortedPlayers = players.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
    for (const p of sortedPlayers) {
      const row = [p.name, p.position || ''];
      let present = 0, total = 0;
      for (const t of trainings) {
        const a = (t.attendance || []).find(x => x.playerId === p.id);
        if (!a) { row.push(''); continue; }
        total++;
        if (a.status === 'present') present++;
        const sym = STATUS_SYMBOL[a.status] || '?';
        row.push(sym + (a.late ? '+' : ''));
      }
      row.push(present, total, total ? Math.round((present / total) * 100) : 0);
      rows.push(row);
    }
    rows.push([]);
    rows.push(['Legende:', '✓ anwesend', '✗ abwesend', 'E entschuldigt', 'V verletzt', '+ zu spät']);
    rows.push([]);

    rows.push(['# Freiwürfe (alle Trainings)']);
    rows.push(['Datum', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %']);
    for (const t of trainings) {
      const presentIds = new Set((t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
      const fts = (t.freethrows || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
      const sorted = fts.slice().sort((a, b) => {
        const pa = playerById(a.playerId), pb = playerById(b.playerId);
        return (pa ? pa.name : '').localeCompare(pb ? pb.name : '', 'de');
      });
      for (const e of sorted) {
        const p = playerById(e.playerId);
        rows.push([t.date, p ? p.name : '?', p && p.position ? p.position : '', e.made, e.attempted, BT.stats.pct(e.made, e.attempted)]);
      }
    }
    rows.push([]);

    const allCats = new Set();
    for (const t of trainings) for (const c of (t.shots || [])) allCats.add(c.category);
    for (const cat of Array.from(allCats).sort()) {
      rows.push(['# Würfe – ' + cat]);
      rows.push(['Datum', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %']);
      for (const t of trainings) {
        const presentIds = new Set((t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
        const c = (t.shots || []).find(s => s.category === cat);
        if (!c) continue;
        const entries = (c.entries || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
        const sorted = entries.slice().sort((a, b) => {
          const pa = playerById(a.playerId), pb = playerById(b.playerId);
          return (pa ? pa.name : '').localeCompare(pb ? pb.name : '', 'de');
        });
        for (const e of sorted) {
          const p = playerById(e.playerId);
          rows.push([t.date, p ? p.name : '?', p && p.position ? p.position : '', e.made, e.attempted, BT.stats.pct(e.made, e.attempted)]);
        }
      }
      rows.push([]);
    }

    rows.push(['# Saison-Aggregat pro Spieler']);
    rows.push(['Spieler', 'Position', 'Anwesend', 'Möglich', 'Quote %', 'FT Treffer', 'FT Versuche', 'FT %']);
    for (const p of sortedPlayers) {
      const att = BT.stats.playerAttendance(p.id);
      const ft = BT.stats.playerFreethrows(p.id);
      rows.push([p.name, p.position || '', att.present, att.total, att.pct, ft.made, ft.attempted, ft.pct]);
    }

    downloadCSV('saison_' + todayISO() + '.csv', rows);
  }

  function exportSeasonJSON() {
    const trainings = BT.storage.getTrainings().slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const players = BT.storage.getPlayers();
    const playerById = id => players.find(p => p.id === id);
    const enrich = (e) => {
      const p = playerById(e.playerId);
      return {
        playerId: e.playerId,
        name: p ? p.name : null,
        position: p && p.position ? p.position : null,
        made: e.made, attempted: e.attempted,
        pct: BT.stats.pct(e.made, e.attempted)
      };
    };

    const payload = {
      type: 'season-export',
      exportedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, position: p.position || null,
        birthDate: p.birthDate || null, archived: !!p.archived,
        seasonStats: {
          attendance: BT.stats.playerAttendance(p.id),
          freethrows: BT.stats.playerFreethrows(p.id),
          shotsByCategory: BT.stats.playerShotsByCategory(p.id)
        }
      })),
      teamStats: {
        attendance: BT.stats.teamAttendance(),
        freethrows: BT.stats.teamFreethrows(),
        shotsByCategory: BT.stats.teamShotsByCategory()
      },
      trainings: trainings.map(t => {
        const presentIds = new Set((t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
        return {
          id: t.id, date: t.date, startTime: t.startTime || null, note: t.note || null,
          attendance: (t.attendance || []).map(a => {
            const p = playerById(a.playerId);
            return {
              playerId: a.playerId,
              name: p ? p.name : null,
              status: a.status, late: !!a.late, note: a.note || null
            };
          }),
          freethrows: (t.freethrows || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0).map(enrich),
          shots: (t.shots || []).map(c => ({
            category: c.category,
            entries: (c.entries || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0).map(enrich)
          })).filter(c => c.entries.length > 0)
        };
      })
    };

    downloadJSON('saison_' + todayISO() + '.json', payload);
  }

  return { render };
})();
