window.BT = window.BT || {};

BT.players = (function() {
  const { $, $$, renderTemplate, ageFrom, escapeHTML } = BT.util;
  let root, currentTab = 'active';

  function render(target) {
    root = renderTemplate('tpl-players');
    target.appendChild(root);

    root.addEventListener('click', e => { if (e.target.closest('[data-action="new-player"]')) showForm(); });
    $('[data-action="cancel"]', root).addEventListener('click', () => hideForm());
    $('[data-role="player-form"]', root).addEventListener('submit', onSubmit);

    $$('.tab', root).forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        $$('.tab', root).forEach(t => t.classList.toggle('active', t === tab));
        renderList();
      });
    });

    renderList();
  }

  function showForm(player) {
    const form = $('[data-role="player-form"]', root);
    form.classList.remove('hidden');
    form.elements.id.value = player ? player.id : '';
    form.elements.name.value = player ? player.name : '';
    form.elements.birthDate.value = player ? (player.birthDate || '') : '';
    form.elements.position.value = player ? (player.position || '') : '';
    form.elements.name.focus();
  }

  function hideForm() {
    const form = $('[data-role="player-form"]', root);
    form.classList.add('hidden');
    form.reset();
  }

  function onSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const data = {
      id: f.elements.id.value || undefined,
      name: f.elements.name.value.trim(),
      birthDate: f.elements.birthDate.value || null,
      position: f.elements.position.value.trim() || null
    };
    if (!data.name) return;
    BT.storage.upsertPlayer(data);
    hideForm();
    renderList();
  }

  function renderList() {
    const list = $('[data-role="player-list"]', root);
    const empty = $('[data-role="empty"]', root);
    const players = BT.storage.getPlayers()
      .filter(p => currentTab === 'archived' ? p.archived : !p.archived)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    list.innerHTML = '';
    if (players.length === 0) {
      empty.classList.remove('hidden');
      if (currentTab === 'archived') {
        empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg><p class="empty-body">Archiv ist leer.</p>';
      } else {
        empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg><p class="empty-headline">Noch keine Spieler angelegt</p><p class="empty-body">Leg deinen ersten Spieler an, um loszulegen.</p><button class="btn primary" data-action="new-player">+ Neuer Spieler</button>';
      }
      return;
    }
    empty.classList.add('hidden');

    for (const p of players) {
      const li = document.createElement('li');
      const age = ageFrom(p.birthDate);
      const metaParts = [];
      if (p.position) metaParts.push(escapeHTML(p.position));
      if (age !== null) metaParts.push(age + ' Jahre');
      li.innerHTML = `
        <div class="info" data-open>
          <div class="name">${escapeHTML(p.name)}</div>
          <div class="meta">${metaParts.join(' · ') || '&nbsp;'}</div>
        </div>
        <div class="actions">
          <button class="btn small" data-edit>Bearbeiten</button>
          <button class="btn small" data-archive>${p.archived ? 'Reaktivieren' : 'Archivieren'}</button>
        </div>
      `;
      li.querySelector('[data-open]').addEventListener('click', () => {
        location.hash = '#/player/' + p.id;
      });
      li.querySelector('[data-edit]').addEventListener('click', () => showForm(p));
      li.querySelector('[data-archive]').addEventListener('click', () => {
        BT.storage.setArchived(p.id, !p.archived);
        renderList();
      });
      list.appendChild(li);
    }
  }

  function renderDetail(target, playerId) {
    const node = renderTemplate('tpl-player-detail');
    target.appendChild(node);

    const player = BT.storage.getPlayer(playerId);
    if (!player) { location.hash = '#/players'; return; }

    const printBtn = $('[data-action="print-report"]', node);
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        document.body.classList.add('print-mode');
        setTimeout(() => {
          window.print();
          setTimeout(() => document.body.classList.remove('print-mode'), 100);
        }, 50);
      });
    }

    $('[data-role="name"]', node).textContent = player.name;
    const age = ageFrom(player.birthDate);
    const metaParts = [];
    if (player.position) metaParts.push(escapeHTML(player.position));
    if (age !== null) metaParts.push(age + ' Jahre');
    if (player.archived) metaParts.push('archiviert');
    $('[data-role="meta"]', node).innerHTML = metaParts.join(' · ') || '&nbsp;';

    renderPlayerSeasonStats(node, player);
    renderPlayerHeatmap(node, player);

    const sessions = BT.storage.getSessions().slice().reverse();
    const entries = [];
    for (const s of sessions) {
      const r = s.results.find(x => x.playerId === playerId);
      if (r) entries.push({ session: s, result: r });
    }

    const rows = $('[data-role="rows"]', node);
    const chart = $('[data-role="chart"]', node);
    const noData = $('[data-role="no-data"]', node);

    if (entries.length === 0) {
      noData.classList.remove('hidden');
      chart.classList.add('hidden');
    } else {
      chart.innerHTML = renderChart(entries);
    }

    entries.slice().reverse().forEach(e => {
      const tr = document.createElement('tr');
      const distM = e.session.distanceM || 20;
      const rating = BT.ratings.rateResult(e.session, e.result);
      tr.innerHTML = `
        <td><a href="#/history/${e.session.id}">${BT.util.formatDate(e.session.date)}</a></td>
        <td>${e.result.level}</td>
        <td>${e.result.shuttle}</td>
        <td>${e.result.totalShuttles}</td>
        <td>${distM} m</td>
        <td>${e.result.totalShuttles * distM} m</td>
        <td>${rating.vo2max.toFixed(1)}</td>
        <td><span class="rating-chip tier-${rating.tier}">${rating.label}</span></td>
      `;
      rows.appendChild(tr);
    });
  }

  function renderPlayerHeatmap(node, player) {
    const trainings = (BT.stats.endedTrainings && BT.stats.endedTrainings()) || [];
    const shots = [];
    for (const t of trainings) {
      for (const s of (t.shotMap || [])) {
        if (s.playerId === player.id) shots.push(s);
      }
    }

    const meta = $('[data-role="heatmap-meta"]', node);
    const empty = $('[data-role="heatmap-empty"]', node);
    const wrap = $('[data-role="player-heatmap-wrap"]', node);

    if (shots.length === 0) {
      if (empty) empty.classList.remove('hidden');
      if (meta) meta.textContent = '';
      if (wrap) wrap.style.display = 'none';
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (wrap) wrap.style.display = '';

    const totalHits = shots.filter(s => s.made).length;
    const totalMisses = shots.length - totalHits;
    const totalPct = Math.round((totalHits / shots.length) * 100);
    if (meta) meta.textContent = shots.length + ' Würfe insgesamt · ' + totalHits + ' Treffer · ' + totalMisses + ' Fehlwürfe · ' + totalPct + '%';

    function render(view) {
      const cellsLayer = $('[data-role="player-heatmap-cells"]', node);
      const shotsLayer = $('[data-role="player-heatmap-shots"]', node);
      if (cellsLayer) cellsLayer.innerHTML = '';
      if (shotsLayer) shotsLayer.innerHTML = '';
      if (view === 'shots') BT.heatmap.renderShots(shotsLayer, shots);
      else BT.heatmap.renderZones(cellsLayer, shots);
    }

    render('zones');
    $$('input[name="heatmap-view"]', node).forEach(r => {
      r.addEventListener('change', () => render(r.value));
    });
  }

  function renderPlayerSeasonStats(node, player) {
    const grid = $('[data-role="player-stats"]', node);
    const att = BT.stats.playerAttendance(player.id);
    const ft = BT.stats.playerFreethrows(player.id);

    grid.innerHTML = `
      <div class="dash-card">
        <div class="dash-label">Anwesenheit</div>
        <div class="dash-big">${att.pct}%</div>
        <div class="dash-sub">${att.present}/${att.total} Trainings${att.late ? ' · ' + att.late + 'x zu spät' : ''}</div>
      </div>
      <div class="dash-card">
        <div class="dash-label">Freiwürfe</div>
        <div class="dash-big">${ft.attempted > 0 ? ft.pct + '%' : '–'}</div>
        <div class="dash-sub">${ft.attempted > 0 ? ft.made + '/' + ft.attempted + ' aus ' + ft.sessions + ' Sessions' : 'Noch keine Daten'}</div>
      </div>
      <div class="dash-card">
        <div class="dash-label">Status</div>
        <div class="dash-mini">
          <span class="att-chip ok">✓ ${att.present}</span>
          <span class="att-chip bad">✗ ${att.absent}</span>
          <span class="att-chip warn">E ${att.excused}</span>
          <span class="att-chip warn">V ${att.injured}</span>
        </div>
      </div>
    `;

    const wrap = $('[data-role="player-shot-cats"]', node);
    const empty = $('[data-role="player-shot-empty"]', node);
    const cats = BT.stats.playerShotsByCategory(player.id);
    if (cats.length === 0) {
      empty.classList.remove('hidden');
      wrap.innerHTML = '';
    } else {
      empty.classList.add('hidden');
      wrap.innerHTML = '';
      for (const c of cats) {
        const div = document.createElement('div');
        div.className = 'cat-block';
        div.innerHTML = `
          <div class="cat-block-head">
            <span class="cat-name">${escapeHTML(c.category)}</span>
            <span class="att-chip ok">${c.pct}%</span>
            <span class="muted-chip">${c.made}/${c.attempted} · ${c.sessions} Sessions</span>
          </div>
        `;
        wrap.appendChild(div);
      }
    }

    renderPlayerTrends(node, player, cats);
  }

  function renderPlayerTrends(node, player, shotCats) {
    const wrap = $('[data-role="player-trends"]', node);
    wrap.innerHTML = '';

    const attTimeline = BT.stats.playerAttendanceTimeline(player.id);
    if (attTimeline.length > 0) {
      const rolling = BT.stats.rollingAttendancePct(attTimeline, 5);
      const block = document.createElement('div');
      block.className = 'trend-block';
      block.innerHTML = `
        <div class="trend-head">Anwesenheits-Quote (gleitender Schnitt über 5 Trainings)</div>
        ${renderTrendChart(rolling.map(r => ({ date: r.date, value: r.pct })), { yMin: 0, yMax: 100, unit: '%' })}
      `;
      wrap.appendChild(block);
    }

    const ftTimeline = BT.stats.playerFreethrowsTimeline(player.id);
    if (ftTimeline.length > 0) {
      const block = document.createElement('div');
      block.className = 'trend-block';
      block.innerHTML = `
        <div class="trend-head">Freiwurf-Quote pro Training</div>
        ${renderTrendChart(ftTimeline.map(r => ({ date: r.date, value: r.pct, label: r.made + '/' + r.attempted })), { yMin: 0, yMax: 100, unit: '%' })}
      `;
      wrap.appendChild(block);
    }

    for (const c of shotCats) {
      const tl = BT.stats.playerShotsTimelineByCategory(player.id, c.category);
      if (tl.length === 0) continue;
      const block = document.createElement('div');
      block.className = 'trend-block';
      block.innerHTML = `
        <div class="trend-head">${escapeHTML(c.category)} – Quote pro Training</div>
        ${renderTrendChart(tl.map(r => ({ date: r.date, value: r.pct, label: r.made + '/' + r.attempted })), { yMin: 0, yMax: 100, unit: '%' })}
      `;
      wrap.appendChild(block);
    }

    if (wrap.children.length === 0) {
      wrap.innerHTML = '<div class="empty empty--field"><svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 17 4-8 4 4 6-8"/></svg><p class="empty-body">Noch zu wenig Daten für Trends.</p></div>';
    }
  }

  function renderTrendChart(points, opts) {
    if (!points || points.length === 0) return '<p class="muted">Keine Daten</p>';
    const W = 600, H = 180, P = 36;
    const yMin = opts.yMin != null ? opts.yMin : 0;
    const yMax = opts.yMax != null ? opts.yMax : 100;
    const unit = opts.unit || '';
    const n = points.length;
    const stepX = n > 1 ? (W - 2 * P) / (n - 1) : 0;
    const scaleY = v => H - P - ((v - yMin) / (yMax - yMin)) * (H - 2 * P);

    const pts = points.map((p, i) => ({
      x: P + i * stepX,
      y: scaleY(p.value),
      v: p.value,
      date: p.date,
      label: p.label
    }));

    let yAxis = '';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = Math.round(yMin + (yMax - yMin) * i / ticks);
      const y = scaleY(v);
      yAxis += `<line class="axis" x1="${P}" x2="${W - P / 2}" y1="${y}" y2="${y}" stroke-opacity="0.15"/>`;
      yAxis += `<text class="axis-label" x="4" y="${y + 4}">${v}${unit}</text>`;
    }

    const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    const dots = pts.map(p => {
      const tooltip = BT.util.formatDate(p.date) + ': ' + p.v + unit + (p.label ? ' (' + p.label + ')' : '');
      return `<circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"><title>${tooltip}</title></circle>`;
    }).join('');

    const firstDate = BT.util.formatDate(points[0].date);
    const lastDate = BT.util.formatDate(points[points.length - 1].date);

    return `
      <div class="chart-wrap">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          ${yAxis}
          <line class="axis" x1="${P}" x2="${P}" y1="${P / 2}" y2="${H - P}"/>
          <line class="axis" x1="${P}" x2="${W - P / 2}" y1="${H - P}" y2="${H - P}"/>
          <path class="line" d="${pathD}"/>
          ${dots}
          <text class="axis-label" x="${P}" y="${H - 8}">${firstDate}</text>
          <text class="axis-label" x="${W - P}" y="${H - 8}" text-anchor="end">${lastDate}</text>
        </svg>
      </div>
    `;
  }

  function renderChart(entries) {
    const W = 600, H = 220, P = 36;
    const vals = entries.map(e => e.result.totalShuttles);
    const maxV = Math.max(...vals, 10);
    const minV = 0;
    const n = entries.length;
    const stepX = n > 1 ? (W - 2 * P) / (n - 1) : 0;
    const scaleY = v => H - P - ((v - minV) / (maxV - minV)) * (H - 2 * P);

    const points = entries.map((e, i) => {
      const x = P + i * stepX;
      const y = scaleY(e.result.totalShuttles);
      return { x, y, e };
    });

    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');

    const yTicks = 4;
    let yAxis = '';
    for (let i = 0; i <= yTicks; i++) {
      const v = Math.round(minV + (maxV - minV) * i / yTicks);
      const y = scaleY(v);
      yAxis += `<line class="axis" x1="${P}" x2="${W - P / 2}" y1="${y}" y2="${y}" stroke-opacity="0.2"/>`;
      yAxis += `<text class="axis-label" x="4" y="${y + 4}">${v}</text>`;
    }

    const dots = points.map(p => {
      const label = 'L' + p.e.result.level + ' · ' + BT.util.formatDate(p.e.session.date);
      return `<g><circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"><title>${label} – ${p.e.result.totalShuttles} Shuttles</title></circle></g>`;
    }).join('');

    const firstDate = BT.util.formatDate(entries[0].session.date);
    const lastDate = BT.util.formatDate(entries[entries.length - 1].session.date);

    return `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        ${yAxis}
        <line class="axis" x1="${P}" x2="${P}" y1="${P / 2}" y2="${H - P}"/>
        <line class="axis" x1="${P}" x2="${W - P / 2}" y1="${H - P}" y2="${H - P}"/>
        <path class="line" d="${pathD}"/>
        ${dots}
        <text class="axis-label" x="${P}" y="${H - 8}">${firstDate}</text>
        <text class="axis-label" x="${W - P}" y="${H - 8}" text-anchor="end">${lastDate}</text>
        <text class="axis-label" x="${W / 2}" y="14" text-anchor="middle">Gesamt-Shuttles über Zeit</text>
      </svg>
    `;
  }

  return { render, renderDetail };
})();
