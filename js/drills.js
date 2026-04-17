window.BT = window.BT || {};

BT.drills = (function() {
  const { $, $$, renderTemplate, escapeHTML, formatDate } = BT.util;

  function allCategories() {
    const set = new Set();
    for (const d of BT.storage.getDrills()) {
      if (d.category) set.add(d.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }

  function renderList(target) {
    const root = renderTemplate('tpl-drills-list');
    target.appendChild(root);

    const list = $('[data-role="list"]', root);
    const empty = $('[data-role="empty"]', root);
    const search = $('[data-role="search"]', root);
    const catSel = $('[data-role="category-filter"]', root);

    root.addEventListener('click', e => {
      if (e.target.closest('[data-action="new-drill"]')) {
        const d = BT.storage.upsertDrill({ name: 'Neuer Drill', category: '', minutes: 0, description: '' });
        location.hash = '#/drills/' + d.id;
      }
    });

    function populateCats() {
      const cats = allCategories();
      const prev = catSel.value;
      catSel.innerHTML = '<option value="">Alle Kategorien</option>' +
        cats.map(c => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + '</option>').join('');
      catSel.value = prev;
    }

    function draw() {
      populateCats();
      const q = (search.value || '').trim().toLowerCase();
      const cat = catSel.value;
      const drills = BT.storage.getDrills().filter(d => {
        if (cat && d.category !== cat) return false;
        if (!q) return true;
        return (d.name || '').toLowerCase().includes(q)
          || (d.description || '').toLowerCase().includes(q)
          || (d.category || '').toLowerCase().includes(q);
      });

      list.innerHTML = '';
      if (drills.length === 0) {
        if (!q && !cat) empty.classList.remove('hidden');
        else {
          empty.classList.remove('hidden');
          empty.innerHTML = '<p class="empty-body">Keine Treffer.</p>';
        }
        return;
      }
      empty.classList.add('hidden');

      for (const d of drills) {
        const li = document.createElement('li');
        li.className = 'drill-item';
        const minLabel = d.minutes ? d.minutes + ' min' : '';
        const metaParts = [];
        if (d.category) metaParts.push(escapeHTML(d.category));
        if (minLabel) metaParts.push(minLabel);
        const desc = (d.description || '').slice(0, 120);
        const a = document.createElement('a');
        a.href = '#/drills/' + d.id;
        a.innerHTML = `
          <div class="info">
            <div class="name">${escapeHTML(d.name || '(ohne Name)')}</div>
            <div class="meta">${metaParts.join(' · ')}</div>
            ${desc ? '<div class="meta muted">' + escapeHTML(desc) + (d.description.length > 120 ? '…' : '') + '</div>' : ''}
          </div>
        `;
        li.appendChild(a);
        list.appendChild(li);
      }
    }

    search.addEventListener('input', draw);
    catSel.addEventListener('change', draw);
    draw();
  }

  function renderDetail(target, id) {
    const drill = BT.storage.getDrill(id);
    if (!drill) { location.hash = '#/drills'; return; }

    const root = renderTemplate('tpl-drill-detail');
    target.appendChild(root);

    const form = $('[data-role="drill-form"]', root);
    const nameEl = form.elements['name'];
    const catEl = form.elements['category'];
    const minEl = form.elements['minutes'];
    const descEl = form.elements['description'];
    const metaEl = $('[data-role="meta"]', root);

    nameEl.value = drill.name || '';
    catEl.value = drill.category || '';
    minEl.value = drill.minutes || '';
    descEl.value = drill.description || '';

    const datalist = root.querySelector('#drill-categories');
    if (datalist) {
      datalist.innerHTML = allCategories().map(c => '<option value="' + escapeHTML(c) + '"></option>').join('');
    }

    updateMeta(metaEl, drill);

    let timer = null;
    function scheduleSave() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const updated = BT.storage.upsertDrill({
          id: drill.id,
          name: nameEl.value.trim(),
          category: catEl.value.trim(),
          minutes: parseInt(minEl.value, 10) || 0,
          description: descEl.value
        });
        updateMeta(metaEl, updated);
      }, 300);
    }

    [nameEl, catEl, minEl, descEl].forEach(el => el.addEventListener('input', scheduleSave));

    $('[data-action="delete"]', root).addEventListener('click', () => {
      const snapshot = BT.storage.getDrill(drill.id);
      if (!snapshot) { location.hash = '#/drills'; return; }
      BT.storage.deleteDrill(drill.id);
      location.hash = '#/drills';
      const label = snapshot.name || 'Drill';
      BT.util.toastUndo('„' + label + '" gelöscht', () => {
        BT.storage.restoreDrill(snapshot);
        location.hash = '#/drills/' + snapshot.id;
      });
    });
  }

  function updateMeta(el, drill) {
    const parts = [];
    if (drill.createdAt) parts.push('Erstellt ' + formatDate(drill.createdAt.slice(0, 10)));
    if (drill.updatedAt && drill.updatedAt !== drill.createdAt) {
      parts.push('zuletzt geändert ' + formatDate(drill.updatedAt.slice(0, 10)));
    }
    el.textContent = parts.join(' · ');
  }

  // Modal-Picker zur Auswahl eines Drills. onPick(drill) wird aufgerufen.
  function openPicker(onPick) {
    const drills = BT.storage.getDrills();
    const backdrop = renderTemplate('tpl-drill-picker');
    document.body.appendChild(backdrop);

    const list = $('[data-role="list"]', backdrop);
    const empty = $('[data-role="empty"]', backdrop);
    const search = $('[data-role="search"]', backdrop);
    const catSel = $('[data-role="category-filter"]', backdrop);

    const cats = allCategories();
    catSel.innerHTML = '<option value="">Alle Kategorien</option>' +
      cats.map(c => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + '</option>').join('');

    function close() {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close();
      if (e.target.closest('[data-action="close"]')) close();
    });

    function draw() {
      const q = (search.value || '').trim().toLowerCase();
      const cat = catSel.value;
      const filtered = drills.filter(d => {
        if (cat && d.category !== cat) return false;
        if (!q) return true;
        return (d.name || '').toLowerCase().includes(q)
          || (d.description || '').toLowerCase().includes(q)
          || (d.category || '').toLowerCase().includes(q);
      });

      list.innerHTML = '';
      if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');

      for (const d of filtered) {
        const li = document.createElement('li');
        li.className = 'drill-item drill-pick';
        const metaParts = [];
        if (d.category) metaParts.push(escapeHTML(d.category));
        if (d.minutes) metaParts.push(d.minutes + ' min');
        li.innerHTML = `
          <div class="info">
            <div class="name">${escapeHTML(d.name || '(ohne Name)')}</div>
            <div class="meta">${metaParts.join(' · ')}</div>
            ${d.description ? '<div class="meta muted">' + escapeHTML((d.description || '').slice(0, 120)) + (d.description.length > 120 ? '…' : '') + '</div>' : ''}
          </div>
          <button type="button" class="btn small primary" data-pick="${d.id}">Einfügen</button>
        `;
        li.querySelector('[data-pick]').addEventListener('click', () => {
          onPick({ name: d.name, minutes: d.minutes || 0, description: d.description || '' });
          close();
        });
        list.appendChild(li);
      }
    }

    search.addEventListener('input', draw);
    catSel.addEventListener('change', draw);
    draw();
    setTimeout(() => search.focus(), 50);
  }

  return { renderList, renderDetail, openPicker };
})();
