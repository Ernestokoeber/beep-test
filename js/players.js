window.BT = window.BT || {};

BT.players = (function() {
  const { $, $$, renderTemplate, ageFrom, escapeHTML } = BT.util;
  let root, currentTab = 'active';

  function render(target) {
    root = renderTemplate('tpl-players');
    target.appendChild(root);

    $('[data-action="new-player"]', root).addEventListener('click', () => showForm());
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
      empty.textContent = currentTab === 'archived' ? 'Archiv ist leer.' : 'Noch keine Spieler angelegt.';
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

    $('[data-role="name"]', node).textContent = player.name;
    const age = ageFrom(player.birthDate);
    const metaParts = [];
    if (player.position) metaParts.push(escapeHTML(player.position));
    if (age !== null) metaParts.push(age + ' Jahre');
    if (player.archived) metaParts.push('archiviert');
    $('[data-role="meta"]', node).innerHTML = metaParts.join(' · ') || '&nbsp;';

    renderPlayerSeasonStats(node, player);

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
      tr.innerHTML = `
        <td><a href="#/history/${e.session.id}">${BT.util.formatDate(e.session.date)}</a></td>
        <td>${e.result.level}</td>
        <td>${e.result.shuttle}</td>
        <td>${e.result.totalShuttles}</td>
        <td>${e.session.distanceM || 20} m</td>
      `;
      rows.appendChild(tr);
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
      return;
    }
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
