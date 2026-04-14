window.BT = window.BT || {};

BT.notes = (function() {
  const { $, renderTemplate, escapeHTML, formatDate } = BT.util;

  function renderList(target) {
    const root = renderTemplate('tpl-notes-list');
    target.appendChild(root);

    const list = $('[data-role="list"]', root);
    const empty = $('[data-role="empty"]', root);
    const search = $('[data-role="search"]', root);

    $('[data-action="new-note"]', root).addEventListener('click', () => {
      const n = BT.storage.upsertNote({ title: '', body: '' });
      location.hash = '#/notes/' + n.id;
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
        empty.textContent = q ? 'Keine Treffer.' : 'Noch keine Notizen.';
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
    bodyEl.addEventListener('input', scheduleSave);

    $('[data-action="delete"]', root).addEventListener('click', () => {
      if (!confirm('Notiz wirklich löschen?')) return;
      BT.storage.deleteNote(note.id);
      location.hash = '#/notes';
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
