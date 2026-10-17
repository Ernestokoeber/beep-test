window.BT = window.BT || {};

BT.libraryPages = (() => {
  const esc = BT.util.escapeHTML;
  const writable = () => !['viewer', 'player'].includes(BT.sync?.getState?.().user?.role);
  const identity = () => { const s = BT.sync?.getState?.(); return JSON.stringify([s?.user?.id, s?.user?.organization?.id || s?.user?.organizationId, s?.user?.role, s?.sessionEpoch]); };
  const state = () => BT.navigation?.getState?.() || {};
  const remember = patch => BT.navigation?.setState?.(patch);
  const href = (kind, id = '', pane = '') => '#/' + kind + (id ? '/' + encodeURIComponent(id) : '') + (pane ? '/' + pane : '');
  const link = (url, title, detail = '') => '<a class="library-link" href="' + esc(url) + '"><span><strong>' + esc(title) + '</strong>' + (detail ? '<small>' + esc(detail) + '</small>' : '') + '</span><span aria-hidden="true">›</span></a>';
  const config = kind => kind === 'drills' ? {
    title: 'Übungsbibliothek', singular: 'Übung', fields: ['name', 'category', 'minutes', 'description'],
    getAll: () => BT.storage.getDrills(), get: id => BT.storage.getDrill(id), put: data => BT.storage.upsertDrill(data), remove: id => BT.storage.deleteDrill(id), restore: row => BT.storage.restoreDrill(row), name: row => row.name || 'Übung ohne Namen'
  } : {
    title: 'Trainernotizen', singular: 'Notiz', fields: ['title', 'body'],
    getAll: () => BT.storage.getNotes(), get: id => BT.storage.getNote(id), put: data => BT.storage.upsertNote(data), remove: id => BT.storage.deleteNote(id), restore: row => BT.storage.restoreNote(row), name: row => row.title?.trim() || row.body?.split('\n').find(x => x.trim())?.slice(0, 80) || 'Notiz ohne Titel'
  };
  const fingerprint = (c, row) => JSON.stringify(c.fields.map(key => row?.[key] ?? ''));
  const tacticNote = row => typeof row?.body === 'string' && row.body.startsWith('[TACTIC]');
  function heading(node, title, detail = '') {
    node.innerHTML = '<header class="library-heading"><h2 tabindex="-1">' + esc(title) + '</h2>' + (detail ? '<p>' + esc(detail) + '</p>' : '') + '</header>';
  }
  function renderList(node, kind, c) {
    heading(node, c.title, kind === 'drills' ? 'Übungen finden und direkt für dein Training öffnen.' : 'Ideen und Beobachtungen für dein Coaching.');
    node.innerHTML += '<nav class="library-actions">' + (writable() ? link(href(kind, 'new'), kind === 'drills' ? 'Neue Übung' : 'Neue Notiz') : '') + (kind === 'drills' && writable() ? link(href(kind, 'import'), 'Aus Trainings übernehmen') : '') + '</nav><div class="library-filters"><label>Suchen<input type="search" name="search" placeholder="' + (kind === 'drills' ? 'Name, Kategorie oder Ablauf' : 'Titel oder Inhalt') + '"></label>' + (kind === 'drills' ? '<label>Kategorie<select name="category"><option value="">Alle Kategorien</option></select></label>' : '') + '</div><p class="muted" role="status" data-library-count></p><div class="library-list" data-library-list></div>';
    const search = node.querySelector('[name=search]'), category = node.querySelector('[name=category]');
    search.value = state().librarySearch || '';
    if (category) {
      const categories = [...new Set(c.getAll().map(d => d.category || 'Nicht zugeordnet'))].sort((a, b) => a.localeCompare(b, 'de'));
      category.innerHTML += categories.map(value => '<option>' + esc(value) + '</option>').join('');
      category.value = categories.includes(state().libraryCategory) ? state().libraryCategory : '';
    }
    const draw = () => {
      const q = search.value.trim().toLocaleLowerCase('de'), cat = category?.value || '';
      remember({ librarySearch: search.value, libraryCategory: cat });
      const rows = c.getAll().filter(row => (!cat || (row.category || 'Nicht zugeordnet') === cat) && [c.name(row), row.description, row.category, tacticNote(row) ? 'Taktikboard' : row.body].filter(Boolean).join(' ').toLocaleLowerCase('de').includes(q));
      node.querySelector('[data-library-count]').textContent = rows.length + (kind === 'drills' ? ' Übungen' : ' Notizen');
      node.querySelector('[data-library-list]').innerHTML = rows.length ? rows.map(row => '<div data-library-item>' + link(href(kind, row.id), c.name(row), kind === 'drills' ? [row.category, row.minutes ? row.minutes + ' Minuten' : 'Dauer offen', row.description?.slice(0, 110)].filter(Boolean).join(' · ') : tacticNote(row) ? 'Gespeichertes Taktikboard' : row.body?.slice(0, 140)) + '</div>').join('') : '<p class="library-empty">' + (q || cat ? 'Keine passenden Einträge. Ändere deine Suche oder die Kategorie.' : kind === 'drills' ? 'Noch keine Übungen. Lege eine Übung an oder übernimm sie aus einem Trainingsplan.' : 'Noch keine Notizen. Halte deinen nächsten Coaching-Gedanken fest.') + '</p>';
    };
    search.addEventListener('input', draw); category?.addEventListener('change', draw); draw();
  }
  function renderDetail(node, kind, c, row) {
    heading(node, c.name(row), c.singular);
    if (writable()) node.innerHTML += '<nav class="library-actions">' + link(href(kind, row.id, 'edit'), c.singular + ' bearbeiten') + '</nav>';
    if (kind === 'drills') {
      node.innerHTML += '<dl class="library-facts"><div><dt>Kategorie</dt><dd>' + esc(row.category || 'Nicht zugeordnet') + '</dd></div><div><dt>Dauer</dt><dd>' + esc(row.minutes ? row.minutes + ' Minuten' : 'Noch offen') + '</dd></div></dl><section><h3>Ablauf & Coaching</h3><p class="library-prose">' + esc(row.description || 'Noch kein Ablauf hinterlegt.') + '</p></section>';
    } else if (tacticNote(row)) {
      node.innerHTML += '<p>Diese Notiz enthält ein gespeichertes Taktikboard.</p><button class="btn primary" type="button" data-library-tactic>Im Taktikboard öffnen</button>';
      node.querySelector('[data-library-tactic]').addEventListener('click', () => { BT.storage.setSetting('tacticsLoadFromNote', row.id); location.hash = '#/tactics'; });
    } else node.innerHTML += '<p class="library-prose">' + esc(row.body || 'Noch kein Inhalt hinterlegt.') + '</p>';
    if (row.updatedAt) node.innerHTML += '<p class="muted">Zuletzt gespeichert: ' + esc(BT.util.formatDate(String(row.updatedAt).slice(0, 10))) + '</p>';
    if (kind === 'notes') {
      node.innerHTML += '<button type="button" class="btn" data-library-export>Als Text exportieren</button>';
      node.querySelector('[data-library-export]').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([(row.title ? row.title + '\n\n' : '') + (row.body || '')], { type: 'text/plain;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = 'trainernotiz.txt'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    }
  }
  function renderEditor(node, kind, c, row) {
    const isNew = !row, original = row || {}, scope = identity(), route = location.hash;
    heading(node, (isNew ? 'Neue ' : '') + c.singular + (isNew ? '' : ' bearbeiten'), 'Deine Änderungen bleiben als Entwurf auf diesem Gerät, bis du sie speicherst.');
    if (!writable()) { node.innerHTML += '<p class="library-empty">Du hast hier Lesezugriff.</p>' + link(href(kind, row?.id), 'Zurück zu ' + (row ? c.singular : c.title)); return; }
    const draft = state().draft, base = draft?.base ?? fingerprint(c, original), fields = draft?.fields || original;
    const field = (key, label, options = {}) => '<label>' + label + (options.area ? '<textarea rows="' + (kind === 'notes' ? 14 : 8) + '" name="' + key + '">' + esc(fields[key] || '') + '</textarea>' : '<input name="' + key + '" type="' + (options.type || 'text') + '" ' + (options.attrs || '') + ' value="' + esc(fields[key] ?? '') + '">') + '</label>';
    node.innerHTML += '<form class="library-editor">' + (kind === 'drills' ? field('name', 'Name', { attrs: 'required maxlength="80"' }) + '<div class="library-form-pair">' + field('category', 'Kategorie', { attrs: 'maxlength="40" placeholder="Zum Beispiel: Defense"' }) + field('minutes', 'Dauer in Minuten', { type: 'number', attrs: 'min="0" max="120" step="1" inputmode="numeric"' }) + '</div>' + field('description', 'Aufbau, Ablauf & Coaching-Punkte', { area: true }) : field('title', 'Titel', { attrs: 'maxlength="160"' }) + (tacticNote(original) ? '<p>Das Taktikboard bleibt erhalten. Seine Zeichnung bearbeitest du im Taktikbereich.</p>' : field('body', 'Deine Notiz', { area: true }))) + '<p role="status" data-library-status>Entwurf · noch nicht gespeichert</p><div class="library-editor-actions"><button class="btn primary" type="submit">' + c.singular + ' speichern</button><button class="btn" type="button" data-library-discard>Änderungen verwerfen</button></div></form>' + (!isNew ? '<details class="library-delete"><summary>Weitere Aktionen</summary><button class="btn danger" type="button" data-library-delete>' + c.singular + ' löschen</button></details>' : '');
    const form = node.querySelector('form'), status = node.querySelector('[data-library-status]');
    const active = () => node.isConnected && scope === identity() && route === location.hash && writable();
    const values = () => Object.fromEntries(new FormData(form));
    form.addEventListener('input', () => { if (active()) { remember({ draft: { fields: values(), base } }); status.textContent = 'Entwurf auf diesem Gerät gesichert · noch nicht gespeichert'; } });
    form.addEventListener('submit', e => {
      e.preventDefault(); if (!active()) { status.textContent = 'Der Arbeitsbereich hat sich geändert. Öffne die Seite erneut.'; return; }
      const current = isNew ? null : c.get(original.id);
      if (!isNew && (!current || fingerprint(c, current) !== base)) { status.textContent = 'Der gespeicherte Eintrag wurde inzwischen geändert oder gelöscht. Dein Entwurf bleibt erhalten. Prüfe den aktuellen Stand vor dem Speichern.'; return; }
      const data = values();
      if (kind === 'drills') {
        data.name = data.name.trim(); data.category = data.category.trim(); data.minutes = Number(data.minutes || 0);
        if (!data.name || !Number.isInteger(data.minutes) || data.minutes < 0 || data.minutes > 120) { status.textContent = 'Bitte einen Namen und eine ganze Dauer von 0 bis 120 Minuten eingeben.'; return; }
      } else if (tacticNote(original)) data.body = original.body;
      try {
        const saved = c.put({ ...current, ...data, ...(isNew ? {} : { id: original.id }) });
        remember({ draft: null });
        if (isNew) BT.navigation.replace(href(kind, saved.id)); else BT.navigation.back(href(kind, saved.id));
      } catch { status.textContent = 'Speichern fehlgeschlagen. Dein Entwurf bleibt erhalten.'; }
    });
    node.querySelector('[data-library-discard]').addEventListener('click', () => {
      if (!active()) return;
      remember({ draft: null }); BT.navigation.back(href(kind, row?.id));
    });
    node.querySelector('[data-library-delete]')?.addEventListener('click', () => {
      if (!active()) return;
      const snapshot = c.get(row.id); if (!snapshot) return;
      if (!window.confirm('„' + c.name(snapshot) + '“ löschen?')) return;
      c.remove(row.id); remember({ draft: null }); BT.navigation.replace(href(kind));
      BT.util.toastUndo?.('„' + c.name(snapshot) + '“ gelöscht', () => { if (scope !== identity() || !writable() || c.get(snapshot.id)) return; c.restore(snapshot); location.hash = href(kind, snapshot.id); });
    });
  }
  function renderImport(node) {
    heading(node, 'Übungen übernehmen', 'Übernimm vorhandene Übungen aus deinen Trainingsplänen in die Bibliothek.');
    if (!writable()) { node.innerHTML += '<p>Du hast hier Lesezugriff.</p>'; return; }
    const scope = identity(), route = location.hash;
    const existing = new Set(BT.storage.getDrills().map(d => d.name.trim().toLocaleLowerCase('de')));
    const candidates = BT.drills.collectTrainingDrills().filter(d => !existing.has(d.name.toLocaleLowerCase('de')));
    if (!candidates.length) { node.innerHTML += '<p class="library-empty">Keine weiteren Übungen gefunden. Alle benannten Übungen aus deinen Trainings sind bereits in der Bibliothek oder es gibt noch keine Trainingspläne.</p>'; return; }
    node.innerHTML += '<div class="library-editor-actions"><button class="btn" data-select-all>Alle auswählen</button><button class="btn" data-select-none>Auswahl aufheben</button></div><div class="library-import">' + candidates.map((d, i) => '<label><input type="checkbox" value="' + i + '" checked><span><strong>' + esc(d.name) + '</strong><small>' + esc([d.minutes ? d.minutes + ' Minuten' : '', d.sourceDate ? 'Training vom ' + BT.util.formatDate(d.sourceDate) : ''].filter(Boolean).join(' · ')) + '</small></span></label>').join('') + '</div><button class="btn primary" data-library-import>Auswahl übernehmen</button><p role="status" data-library-status></p>';
    const choices = [...node.querySelectorAll('input[type=checkbox]')];
    const selected = state().draft?.importNames;
    if (selected) choices.forEach(cb => cb.checked = selected.includes(candidates[Number(cb.value)].name));
    const keepSelection = () => { if (scope === identity() && route === location.hash && writable()) remember({draft:{importNames:choices.filter(cb=>cb.checked).map(cb=>candidates[Number(cb.value)].name)}}); };
    choices.forEach(cb => cb.addEventListener('change', keepSelection));
    node.querySelector('[data-select-all]').addEventListener('click', () => { choices.forEach(cb => cb.checked = true); keepSelection(); });
    node.querySelector('[data-select-none]').addEventListener('click', () => { choices.forEach(cb => cb.checked = false); keepSelection(); });
    node.querySelector('[data-library-import]').addEventListener('click', e => {
      if (!node.isConnected || scope !== identity() || route !== location.hash || !writable()) return;
      let count = 0;
      try {
        const seen = new Set(BT.storage.getDrills().map(d => d.name.trim().toLocaleLowerCase('de')));
        for (const cb of choices.filter(cb => cb.checked)) { const d = candidates[Number(cb.value)], key = d.name.toLocaleLowerCase('de'); if (seen.has(key)) continue; BT.storage.upsertDrill({name:d.name,minutes:d.minutes,description:d.description,category:''}); seen.add(key); count++; }
        node.querySelector('[data-library-status]').textContent = count ? count + ' Übungen übernommen.' : 'Bitte mindestens eine noch nicht übernommene Übung auswählen.';
        if(count) { e.currentTarget.disabled = true; remember({draft:null}); node.insertAdjacentHTML('beforeend',link(href('drills'),'Übungsbibliothek öffnen')); }
      } catch { node.querySelector('[data-library-status]').textContent = count + ' Übungen übernommen. Weitere konnten nicht gespeichert werden. Du kannst erneut versuchen.'; }
    });
  }
  function render(target, kind, path = '') {
    const c = config(kind), node = document.createElement('section'); node.className = 'view library-page'; node.dataset.libraryRoute = location.hash; target.append(node);
    const parts = path.split('/'); let id; try { id = decodeURIComponent(parts[0]); } catch { id = ''; }
    if (!path) { node.dataset.libraryPage = 'list'; renderList(node, kind, c); return; }
    if (kind === 'drills' && id === 'import') { node.dataset.libraryPage = 'import'; renderImport(node); return; }
    const row = id === 'new' ? null : c.get(id);
    if (id !== 'new' && (!row || parts.length > 2 || (parts[1] && parts[1] !== 'edit'))) { node.dataset.libraryPage = 'missing'; heading(node, c.singular + ' nicht verfügbar'); node.innerHTML += link(href(kind), 'Zurück zu ' + c.title); return; }
    node.dataset.libraryPage = id === 'new' || parts[1] === 'edit' ? 'edit' : 'detail';
    if (node.dataset.libraryPage === 'edit') renderEditor(node, kind, c, row); else renderDetail(node, kind, c, row);
  }
  return { render };
})();
