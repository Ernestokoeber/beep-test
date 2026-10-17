window.BT = window.BT || {};

BT.drills = (function() {
  const { $, $$, renderTemplate, escapeHTML, formatDate } = BT.util;

  const UNCATEGORIZED = 'Nicht zugeordnet';

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
    catSel.innerHTML = '<option value="">Alle Kategorien</option>' + cats.map(c => '<option value="' + escapeHTML(c) + '">' + escapeHTML(c) + '</option>').join('');
    catSel.value = '';
    catSel.setAttribute('aria-label', 'Kategorie');
    search.setAttribute('aria-label', 'Übungen suchen');

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

  return { renderList: target => BT.libraryPages.render(target, 'drills'), renderDetail: (target, path) => BT.libraryPages.render(target, 'drills', path), collectTrainingDrills, openPicker };
})();
