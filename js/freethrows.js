window.BT = window.BT || {};

BT.freethrows = (function() {
  const { $, $$, renderTemplate, formatDate, todayISO, escapeHTML, downloadCSV, downloadJSON } = BT.util;

  function pct(made, att) {
    if (!att) return 0;
    return Math.round((made / att) * 100);
  }

  function initialEntries() {
    return BT.storage.getPlayers()
      .filter(p => !p.archived)
      .map(p => ({ playerId: p.id, made: 0, attempted: 0 }));
  }

  function renderList(target) {
    const root = renderTemplate('tpl-freethrows-list');
    target.appendChild(root);

    $('[data-action="new-ft"]', root).addEventListener('click', () => {
      const ft = BT.storage.upsertFreethrow({
        date: todayISO(),
        note: '',
        entries: initialEntries()
      });
      location.hash = '#/freethrows/' + ft.id;
    });

    const list = $('[data-role="list"]', root);
    const empty = $('[data-role="empty"]', root);
    const sessions = BT.storage.getFreethrows();

    if (sessions.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    const allPlayers = BT.storage.getPlayers();
    for (const ft of sessions) {
      const total = summarize(ft);
      const best = findBest(ft, allPlayers);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#/freethrows/' + ft.id;
      a.innerHTML = `
        <div class="info">
          <div class="name">${formatDate(ft.date)}${ft.note ? ' – ' + escapeHTML(ft.note) : ''}</div>
          <div class="meta">
            Team: ${total.made}/${total.attempted} (${total.pct}%)
            ${best ? ' · Beste: ' + escapeHTML(best.name) + ' ' + best.made + '/' + best.attempted : ''}
          </div>
        </div>
      `;
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  function summarize(ft) {
    let made = 0, att = 0;
    for (const e of ft.entries || []) { made += e.made || 0; att += e.attempted || 0; }
    return { made, attempted: att, pct: pct(made, att) };
  }

  function findBest(ft, allPlayers) {
    const candidates = (ft.entries || []).filter(e => (e.attempted || 0) >= 3);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const pa = pct(a.made, a.attempted), pb = pct(b.made, b.attempted);
      if (pb !== pa) return pb - pa;
      return (b.made || 0) - (a.made || 0);
    });
    const top = candidates[0];
    const p = allPlayers.find(x => x.id === top.playerId);
    return p ? { name: p.name, made: top.made, attempted: top.attempted } : null;
  }

  let current = null;
  let root = null;

  function renderDetail(target, id) {
    const ft = BT.storage.getFreethrow(id);
    if (!ft) { location.hash = '#/freethrows'; return; }
    current = ft;

    root = renderTemplate('tpl-freethrow-detail');
    target.appendChild(root);

    syncWithPlayers();

    $('[data-role="title"]', root).textContent = 'Freiwürfe vom ' + formatDate(ft.date);
    $('[data-role="date"]', root).value = ft.date;
    $('[data-role="note"]', root).value = ft.note || '';

    $('[data-role="date"]', root).addEventListener('change', e => {
      current.date = e.target.value;
      save();
      $('[data-role="title"]', root).textContent = 'Freiwürfe vom ' + formatDate(current.date);
    });
    $('[data-role="note"]', root).addEventListener('input', e => {
      current.note = e.target.value;
      save();
    });

    $('[data-action="export-csv"]', root).addEventListener('click', () => exportCSV(current));
    $('[data-action="export-json"]', root).addEventListener('click', () => exportJSON(current));
    $('[data-action="delete"]', root).addEventListener('click', () => {
      if (!confirm('Diese Freiwurf-Session wirklich löschen?')) return;
      BT.storage.deleteFreethrow(current.id);
      location.hash = '#/freethrows';
    });

    renderEntries();
    renderSummary();
  }

  function syncWithPlayers() {
    const active = BT.storage.getPlayers().filter(p => !p.archived);
    const existingIds = new Set((current.entries || []).map(e => e.playerId));
    for (const p of active) {
      if (!existingIds.has(p.id)) {
        current.entries.push({ playerId: p.id, made: 0, attempted: 0 });
      }
    }
    save();
  }

  function renderEntries() {
    const list = $('[data-role="entries"]', root);
    list.innerHTML = '';
    const allPlayers = BT.storage.getPlayers();

    const entries = (current.entries || []).slice()
      .map(e => ({ e, p: allPlayers.find(pp => pp.id === e.playerId) }))
      .filter(x => x.p)
      .sort((a, b) => a.p.name.localeCompare(b.p.name, 'de'));

    for (const { e, p } of entries) {
      const card = document.createElement('li');
      card.className = 'ft-card';
      card.innerHTML = `
        <div class="ft-head">
          <span class="name">${escapeHTML(p.name)}</span>
          <span class="ft-pct" data-role="pct">${pct(e.made, e.attempted)}% (${e.made}/${e.attempted})</span>
        </div>
        <div class="ft-row">
          <span class="ft-label">Treffer</span>
          <button type="button" class="ft-btn" data-act="m-">−</button>
          <input type="number" class="ft-input" data-role="made" min="0" step="1" value="${e.made}">
          <button type="button" class="ft-btn plus" data-act="m+">+</button>
        </div>
        <div class="ft-row">
          <span class="ft-label">Versuche</span>
          <button type="button" class="ft-btn" data-act="a-">−</button>
          <input type="number" class="ft-input" data-role="att" min="0" step="1" value="${e.attempted}">
          <button type="button" class="ft-btn plus" data-act="a+">+</button>
        </div>
      `;

      const madeInput = $('[data-role="made"]', card);
      const attInput = $('[data-role="att"]', card);
      const pctLabel = $('[data-role="pct"]', card);

      function updateLabel() {
        pctLabel.textContent = pct(e.made, e.attempted) + '% (' + e.made + '/' + e.attempted + ')';
      }

      function normalize() {
        e.made = Math.max(0, Math.floor(e.made || 0));
        e.attempted = Math.max(0, Math.floor(e.attempted || 0));
        if (e.made > e.attempted) e.attempted = e.made;
        madeInput.value = e.made;
        attInput.value = e.attempted;
      }

      madeInput.addEventListener('input', () => {
        e.made = parseInt(madeInput.value, 10) || 0;
        normalize(); updateLabel(); save(); renderSummary();
      });
      attInput.addEventListener('input', () => {
        e.attempted = parseInt(attInput.value, 10) || 0;
        normalize(); updateLabel(); save(); renderSummary();
      });

      $$('[data-act]', card).forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          if (act === 'm+') { e.made++; if (e.made > e.attempted) e.attempted = e.made; }
          else if (act === 'm-') { e.made = Math.max(0, e.made - 1); }
          else if (act === 'a+') { e.attempted++; }
          else if (act === 'a-') { e.attempted = Math.max(e.made, e.attempted - 1); }
          normalize(); updateLabel(); save(); renderSummary();
        });
      });

      list.appendChild(card);
    }
  }

  function renderSummary() {
    const s = summarize(current);
    const el = $('[data-role="summary"]', root);
    el.innerHTML = `
      <span class="att-chip ok">Team ${s.made}/${s.attempted}</span>
      <span class="att-chip">${s.pct}%</span>
    `;
  }

  function save() {
    BT.storage.upsertFreethrow(current);
  }

  function exportCSV(ft) {
    const allPlayers = BT.storage.getPlayers();
    const rows = [['Datum', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %', 'Notiz']];
    const sorted = (ft.entries || []).slice()
      .map(e => ({ e, p: allPlayers.find(pp => pp.id === e.playerId) }))
      .filter(x => x.p)
      .sort((a, b) => pct(b.e.made, b.e.attempted) - pct(a.e.made, a.e.attempted));
    for (const { e, p } of sorted) {
      rows.push([
        ft.date,
        p.name,
        p.position || '',
        e.made,
        e.attempted,
        pct(e.made, e.attempted),
        ft.note || ''
      ]);
    }
    const s = summarize(ft);
    rows.push(['', 'TEAM', '', s.made, s.attempted, s.pct, '']);
    downloadCSV('freiwuerfe_' + ft.date + '.csv', rows);
  }

  function exportJSON(ft) {
    const allPlayers = BT.storage.getPlayers();
    const payload = {
      type: 'freethrows',
      date: ft.date,
      note: ft.note || null,
      team: summarize(ft),
      entries: (ft.entries || []).map(e => {
        const p = allPlayers.find(x => x.id === e.playerId);
        return {
          playerId: e.playerId,
          name: p ? p.name : null,
          position: p && p.position ? p.position : null,
          made: e.made,
          attempted: e.attempted,
          pct: pct(e.made, e.attempted)
        };
      })
    };
    downloadJSON('freiwuerfe_' + ft.date + '.json', payload);
  }

  return { renderList, renderDetail };
})();
