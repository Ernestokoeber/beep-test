window.BT = window.BT || {};

BT.notes = (function() {
  const { $, renderTemplate, escapeHTML, formatDate } = BT.util;

  function renderList(target) {
    const root = renderTemplate('tpl-notes-list');
    target.appendChild(root);

    const list = $('[data-role="list"]', root);
    const empty = $('[data-role="empty"]', root);
    const search = $('[data-role="search"]', root);

    root.addEventListener('click', e => {
      if (e.target.closest('[data-action="new-note"]')) {
        const n = BT.storage.upsertNote({ title: '', body: '' });
        location.hash = '#/notes/' + n.id;
      }
    });

    function draw() {
      const q = (search.value || '').trim().toLowerCase();
      const notes = BT.storage.getNotes().filter(n => {
        if (!q) return true;
        return (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q);
      });

      list.innerHTML = '';
      if (notes.length === 0) {
        empty.classList.remove('hidden');
        if (q) {
          empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p class="empty-body">Keine Treffer.</p>';
        } else {
          empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg><p class="empty-headline">Noch keine Notizen</p><p class="empty-body">Halte Trainingsideen, Drills oder Beobachtungen fest.</p><button class="btn primary" data-action="new-note">+ Neue Notiz</button>';
        }
        return;
      }
      empty.classList.add('hidden');

      for (const n of notes) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#/notes/' + n.id;
        const title = (n.title || '').trim() || previewFirstLine(n.body) || '(ohne Titel)';
        const preview = previewBody(n.body, n.title);
        const ts = n.updatedAt ? formatDate(n.updatedAt.slice(0, 10)) : '';
        a.innerHTML = `
          <div class="info">
            <div class="name">${escapeHTML(title)}</div>
            <div class="meta">${escapeHTML(preview)}</div>
            <div class="meta muted-chip">${ts}</div>
          </div>
        `;
        li.appendChild(a);
        list.appendChild(li);
      }
    }

    search.addEventListener('input', draw);
    draw();
  }

  function previewFirstLine(body) {
    if (!body) return '';
    const line = body.split('\n').find(l => l.trim());
    return (line || '').trim().slice(0, 80);
  }

  function previewBody(body, title) {
    if (!body) return '';
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    const hasTitle = !!(title && title.trim());
    const startAt = hasTitle ? 0 : 1;
    const preview = lines.slice(startAt).join(' ');
    return preview.slice(0, 120) + (preview.length > 120 ? '…' : '');
  }

  function renderDetail(target, id) {
    const note = BT.storage.getNote(id);
    if (!note) { location.hash = '#/notes'; return; }

    const root = renderTemplate('tpl-note-detail');
    target.appendChild(root);

    const titleEl = $('[data-role="title"]', root);
    const bodyEl = $('[data-role="body"]', root);
    const metaEl = $('[data-role="meta"]', root);

    titleEl.value = note.title || '';
    bodyEl.value = note.body || '';
    updateMeta(metaEl, note);

    const isTactic = typeof note.body === 'string' && note.body.startsWith('[TACTIC]');
    if (isTactic) {
      bodyEl.classList.add('hidden');
      const preview = document.createElement('div');
      preview.className = 'note-tactic-preview';
      const headline = document.createElement('p');
      headline.className = 'note-tactic-hint';
      headline.textContent = 'Diese Notiz enthält ein gespeichertes Taktikboard.';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn primary';
      openBtn.textContent = '🔀 Im Taktikboard öffnen';
      openBtn.addEventListener('click', () => {
        BT.storage.setSetting('tacticsLoadFromNote', note.id);
        location.hash = '#/tactics';
      });
      const details = document.createElement('details');
      details.className = 'note-tactic-raw';
      const summary = document.createElement('summary');
      summary.textContent = 'Rohdaten anzeigen';
      const pre = document.createElement('pre');
      pre.textContent = note.body;
      details.appendChild(summary);
      details.appendChild(pre);
      preview.appendChild(headline);
      preview.appendChild(openBtn);
      preview.appendChild(details);
      bodyEl.parentNode.insertBefore(preview, bodyEl);
    }

    let saveTimer = null;
    const scheduleSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const updated = BT.storage.upsertNote({
          id: note.id,
          title: titleEl.value,
          body: bodyEl.value
        });
        updateMeta(metaEl, updated);
      }, 300);
    };

    titleEl.addEventListener('input', scheduleSave);
    if (!isTactic) bodyEl.addEventListener('input', scheduleSave);

    $('[data-action="delete"]', root).addEventListener('click', () => {
      const snapshot = BT.storage.getNote(note.id);
      if (!snapshot) { location.hash = '#/notes'; return; }
      BT.storage.deleteNote(note.id);
      location.hash = '#/notes';
      const title = (snapshot.title || '').trim() || 'Notiz';
      BT.util.toastUndo('„' + title + '" gelöscht', () => {
        BT.storage.restoreNote(snapshot);
        location.hash = '#/notes/' + snapshot.id;
      });
    });

    $('[data-action="export"]', root).addEventListener('click', () => {
      const title = (titleEl.value || 'notiz').trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 40) || 'notiz';
      const content = (titleEl.value ? '# ' + titleEl.value + '\n\n' : '') + (bodyEl.value || '');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  function updateMeta(el, note) {
    const parts = [];
    if (note.createdAt) parts.push('Erstellt ' + formatDate(note.createdAt.slice(0, 10)));
    if (note.updatedAt && note.updatedAt !== note.createdAt) {
      parts.push('zuletzt geändert ' + formatDate(note.updatedAt.slice(0, 10)));
    }
    el.textContent = parts.join(' · ');
  }

  return { renderList, renderDetail };
})();
