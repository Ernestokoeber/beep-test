window.BT = window.BT || {};

BT.drills = (function() {
  const { $, $$, renderTemplate, escapeHTML, formatDate } = BT.util;

  const UNCATEGORIZED = 'Nicht zugeordnet';
  let pendingFilter = null;

  function allCategories() {
    const set = new Set();
    let hasUncategorized = false;
    for (const d of BT.storage.getDrills()) {
      if (d.category) set.add(d.category);
      else hasUncategorized = true;
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
    if (hasUncategorized) arr.push(UNCATEGORIZED);
    return arr;
  }

  function drillCategory(d) {
    return d.category ? d.category : UNCATEGORIZED;
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
        pendingFilter = UNCATEGORIZED;
        const d = BT.storage.upsertDrill({ name: 'Neuer Drill', category: '', minutes: 0, description: '' });
        location.hash = '#/drills/' + d.id;
      }
      if (e.target.closest('[data-action="import-from-trainings"]')) {
        importFromTrainings(() => {
          pendingFilter = UNCATEGORIZED;
          draw();
        });
      }
    });

    function populateCats() {
      const cats = allCategories();
      const prev = catSel.value;
      catSel.innerHTML = cats.map(c => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + '</option>').join('');
      if (pendingFilter && cats.includes(pendingFilter)) {
        catSel.value = pendingFilter;
        pendingFilter = null;
      } else if (cats.includes(prev)) catSel.value = prev;
      else if (cats.length > 0) catSel.value = cats[0];
    }

    function draw() {
      populateCats();
      const q = (search.value || '').trim().toLowerCase();
      const cat = catSel.value;
      const drills = BT.storage.getDrills().filter(d => {
        if (cat && drillCategory(d) !== cat) return false;
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

  function collectTrainingDrills() {
    const trainings = BT.storage.getTrainings();
    const out = [];
    const seen = new Set();
    for (const t of trainings) {
      const drills = (t.plan && Array.isArray(t.plan.drills)) ? t.plan.drills : [];
      for (const d of drills) {
        const name = (d && d.name ? String(d.name) : '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          name,
          minutes: parseInt(d.minutes, 10) || 0,
          description: d.description ? String(d.description) : '',
          sourceDate: t.date || ''
        });
      }
    }
    return out;
  }

  function importFromTrainings(refresh) {
    const existing = new Set(BT.storage.getDrills().map(d => (d.name || '').trim().toLowerCase()));
    const all = collectTrainingDrills();
    const candidates = all.filter(d => !existing.has(d.name.toLowerCase()));

    if (candidates.length === 0) {
      if (BT.util.toast) {
        BT.util.toast(all.length === 0
          ? 'Keine Drills in Trainings gefunden.'
          : 'Alle Drills aus Trainings sind bereits in der Bibliothek.');
      }
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-label="Drills aus Trainings importieren">
        <div class="modal-head">
          <h3>${candidates.length} Drill${candidates.length === 1 ? '' : 's'} aus Trainings</h3>
          <button type="button" class="btn small" data-action="close" aria-label="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div class="drill-import-actions">
            <button type="button" class="btn small" data-action="select-all">Alle</button>
            <button type="button" class="btn small" data-action="select-none">Keinen</button>
          </div>
          <ul class="drill-list drill-import-list"></ul>
          <div class="modal-foot">
            <button type="button" class="btn" data-action="cancel">Abbrechen</button>
            <button type="button" class="btn primary" data-action="confirm">Importieren</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const list = backdrop.querySelector('.drill-import-list');
    candidates.forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'drill-item drill-import-item';
      const metaParts = [];
      if (d.minutes) metaParts.push(d.minutes + ' min');
      if (d.sourceDate) metaParts.push('aus ' + formatDate(d.sourceDate));
      const desc = (d.description || '').slice(0, 120);
      li.innerHTML = `
        <label class="drill-import-row">
          <input type="checkbox" data-idx="${i}" checked>
          <div class="info">
            <div class="name">${escapeHTML(d.name)}</div>
            <div class="meta">${metaParts.join(' · ')}</div>
            ${desc ? '<div class="meta muted">' + escapeHTML(desc) + (d.description.length > 120 ? '…' : '') + '</div>' : ''}
          </div>
        </label>
      `;
      list.appendChild(li);
    });

    const controller = new AbortController();
    const signal = controller.signal;
    function close() {
      if (!backdrop.parentNode) return;
      backdrop.remove();
      controller.abort();
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { signal });
    window.addEventListener('hashchange', close, { signal });

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close();
      if (e.target.closest('[data-action="close"]')) close();
      if (e.target.closest('[data-action="cancel"]')) close();
      if (e.target.closest('[data-action="select-all"]')) {
        backdrop.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
      }
      if (e.target.closest('[data-action="select-none"]')) {
        backdrop.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      }
      if (e.target.closest('[data-action="confirm"]')) {
        const picked = Array.from(backdrop.querySelectorAll('input[type="checkbox"]:checked'))
          .map(cb => candidates[parseInt(cb.dataset.idx, 10)]);
        let n = 0;
        for (const d of picked) {
          BT.storage.upsertDrill({
            name: d.name,
            category: '',
            minutes: d.minutes || 0,
            description: d.description || ''
          });
          n++;
        }
        close();
        if (BT.util.toast) BT.util.toast(n + ' Drill' + (n === 1 ? '' : 's') + ' importiert.');
        if (refresh) refresh();
      }
    }, { signal });
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
    catSel.innerHTML = cats.map(c => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + '</option>').join('');
    if (cats.length > 0) catSel.value = cats[0];

    const controller = new AbortController();
    const signal = controller.signal;
    function close() {
      if (!backdrop.parentNode) return;
      backdrop.remove();
      controller.abort();
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { signal });
    window.addEventListener('hashchange', close, { signal });

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close();
      if (e.target.closest('[data-action="close"]')) close();
    }, { signal });

    function draw() {
      const q = (search.value || '').trim().toLowerCase();
      const cat = catSel.value;
      const filtered = drills.filter(d => {
        if (cat && drillCategory(d) !== cat) return false;
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
