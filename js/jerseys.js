window.BT = window.BT || {};

BT.jerseys = (function() {
  const { escapeHTML: esc, formatDate, todayISO, seasonForDate } = BT.util;
  const kitLabel = kit => kit === 'home' ? 'Heimtrikots' : 'Auswärtstrikots';
  const canEdit = () => BT.sync?.getState().user?.role !== 'viewer';
  const activePlayers = () => BT.storage.getPlayers().filter(player => !player.archived);
  const nameOf = duty => BT.storage.getPlayer(duty.playerId)?.name || duty.playerName || 'Ehemaliger Spieler';

  function workload(players, duties, season) {
    return players.map(player => {
      const entries = duties.filter(duty => duty.playerId === player.id && (season === 'all' || duty.seasonId === season));
      return { player, total: entries.length, home: entries.filter(duty => duty.kit === 'home').length,
        away: entries.filter(duty => duty.kit === 'away').length,
        returned: entries.filter(duty => duty.status === 'returned').length,
        open: duties.filter(duty => duty.playerId === player.id && duty.status === 'pending').length,
        last: entries.map(duty => duty.takenOn).sort().at(-1) || '' };
    }).sort((a, b) => a.total - b.total || a.last.localeCompare(b.last) || String(a.player.name).localeCompare(String(b.player.name), 'de'));
  }

  function render(target) {
    const root = document.createElement('section');
    root.className = 'view jerseys-view';
    target.append(root);
    let season = BT.storage.getActiveSeason() || seasonForDate(todayISO());
    let onlyNever = false;
    let editId = null;
    const status = (message, error = false) => {
      const node = root.querySelector('[data-role="jersey-status"]');
      node.textContent = message;
      node.dataset.status = error ? 'error' : 'ok';
    };
    function draw(message = '') {
      const duties = BT.storage.getJerseyDuties();
      const rows = workload(activePlayers(), duties, season);
      const seasons = [...new Set([seasonForDate(todayISO()), ...duties.map(duty => duty.seasonId), ...(season !== 'all' ? [season] : [])])].filter(Boolean).sort().reverse();
      const scoped = duties.filter(duty => season === 'all' || duty.seasonId === season);
      const history = scoped.map(duty => `<article class="jersey-history-row" data-duty-id="${esc(duty.id)}">
        <div><strong>${esc(nameOf(duty))}</strong><p>${kitLabel(duty.kit)} · Mitgenommen ${esc(formatDate(duty.takenOn))}${duty.gameLabel ? ' · ' + esc(duty.gameLabel) : ''}</p>
        <p>${duty.status === 'returned' ? 'Sauber zurück am ' + esc(formatDate(duty.returnedOn)) : 'Rückgabe offen' + (duty.dueOn ? ' · fällig ' + esc(formatDate(duty.dueOn)) : '')}</p>${duty.note ? '<p>' + esc(duty.note) + '</p>' : ''}</div>
        <div class="jersey-actions">${duty.status === 'pending' && canEdit() ? '<button class="btn small primary" data-action="return" type="button">Sauber zurück</button>' : ''}
        ${canEdit() ? '<button class="btn small" data-action="edit" type="button">Bearbeiten</button><button class="btn small danger" data-action="delete" type="button">Löschen</button>' : ''}</div></article>`).join('');
      root.innerHTML = `<div class="section-head"><div><span class="section-kicker">Teamorganisation</span><h2>Trikots &amp; Waschdienst</h2><p>Wer hat welchen Satz mitgenommen und wer ist als Nächstes dran?</p></div></div>
        <p class="auth-status" data-role="jersey-status" role="status" aria-live="polite"></p>
        <div class="jersey-kits">${['home', 'away'].map(kit => {
          const pending = duties.find(duty => duty.kit === kit && duty.status === 'pending');
          const last = duties.find(duty => duty.kit === kit && duty.status === 'returned');
          const overdue = pending?.dueOn && pending.dueOn < todayISO();
          return `<article class="jersey-kit ${overdue ? 'is-overdue' : ''}" data-kit="${kit}"><span class="section-kicker">${kit === 'home' ? 'Zuhause' : 'Auswärts'}</span><h3>${kitLabel(kit)}</h3>
            <strong>${pending ? 'Bei ' + esc(nameOf(pending)) : last ? 'Sauber zurückgegeben' : 'Noch keine Mitnahme erfasst'}</strong>
            <p>${pending ? 'Mitgenommen am ' + esc(formatDate(pending.takenOn)) + (pending.dueOn ? ' · Rückgabe bis ' + esc(formatDate(pending.dueOn)) : '') : last ? 'Zuletzt: ' + esc(nameOf(last)) + ' · ' + esc(formatDate(last.returnedOn)) : 'Den aktuellen Besitzer oder frühere Dienste eintragen.'}</p>
            ${overdue ? '<span class="att-chip warn">Rückgabe überfällig</span>' : ''}
            ${canEdit() ? pending ? `<div class="jersey-actions" data-duty-id="${esc(pending.id)}"><button class="btn primary" type="button" data-action="return">Sauber zurück</button><button class="btn" type="button" data-action="edit">Bearbeiten</button></div>` : `<button class="btn primary" type="button" data-action="new" data-kit="${kit}" ${!rows.length ? 'disabled' : ''}>Mitnahme eintragen</button>` : ''}</article>`;
        }).join('')}</div>
        <form class="jersey-form player-form" data-role="jersey-form" hidden></form>
        <section class="jersey-panel"><div class="jersey-panel-head"><h3>Verteilung der Waschdienste</h3><label>Zeitraum<select data-role="jersey-season">${seasons.map(id => `<option value="${esc(id)}" ${season === id ? 'selected' : ''}>Saison ${esc(id)}</option>`).join('')}<option value="all" ${season === 'all' ? 'selected' : ''}>Alle Saisons</option></select></label></div>
          <p>Mitnahmen zählen als übernommener Dienst. Saubere Rückgaben werden zusätzlich ausgewiesen. Spieler mit den wenigsten Diensten stehen zuerst.</p>
          <label class="jersey-filter"><input type="checkbox" data-role="jersey-never" ${onlyNever ? 'checked' : ''}> Nur Spieler ohne dokumentierten Dienst (${rows.filter(row => !row.total).length})</label>
          <div class="jersey-workload">${rows.filter(row => !onlyNever || !row.total).map(row => `<article class="jersey-player-row" data-player-id="${esc(row.player.id)}"><div><strong>${esc(row.player.name)}</strong><p>${row.total ? row.total + ' Dienst(e) · Heim ' + row.home + ' · Auswärts ' + row.away : 'Noch kein Dienst im gewählten Zeitraum'}${row.last ? ' · zuletzt ' + esc(formatDate(row.last)) : ''}</p></div><div><span class="att-chip ${row.total ? 'ok' : 'warn'}">${row.returned} sauber zurück</span>${row.open ? '<span class="att-chip warn">' + row.open + ' Rückgabe offen</span>' : ''}</div></article>`).join('') || (rows.length ? '<p>Alle aktiven Spieler haben bereits einen dokumentierten Dienst übernommen.</p>' : '<p>Lege zuerst Spieler im <a href="#/players">Kader</a> an.</p>')}</div>
        </section>
        <details class="jersey-panel"><summary>Verlauf (${scoped.length})</summary><p>Frühere Dienste können nachgetragen oder korrigiert werden.</p>${canEdit() ? '<button class="btn small" type="button" data-action="past" '+(!rows.length ? 'disabled' : '')+'>Früheren Dienst nachtragen</button>' : ''}<div class="jersey-history">${history || '<p>Noch keine Dienste im gewählten Zeitraum dokumentiert.</p>'}</div></details>`;
      root.querySelector('[data-role="jersey-season"]').addEventListener('change', event => { season = event.target.value; draw(); });
      root.querySelector('[data-role="jersey-never"]').addEventListener('change', event => { onlyNever = event.target.checked; draw(); });
      root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        if (!canEdit()) return;
        const duty = BT.storage.getJerseyDuties().find(item => item.id === button.closest('[data-duty-id]')?.dataset.dutyId);
        if (button.dataset.action === 'new') openForm(null, button.dataset.kit);
        if (button.dataset.action === 'past') openForm(null, 'home', true);
        if (button.dataset.action === 'edit' && duty) openForm(duty);
        if (button.dataset.action === 'return' && duty) {
          if (!confirm(kitLabel(duty.kit) + ' von ' + nameOf(duty) + ' sind gewaschen und wieder zurück?')) return;
          try { BT.storage.upsertJerseyDuty({ ...duty, status: 'returned', returnedOn: todayISO() }); draw('Saubere Rückgabe gespeichert.'); }
          catch (error) { status(error.message, true); }
        }
        if (button.dataset.action === 'delete' && duty && confirm('Diesen Waschdienst löschen? Er wird auch aus der Dienstzählung entfernt.')) {
          BT.storage.deleteJerseyDuty(duty.id); draw('Eintrag gelöscht.');
        }
      }));
      if (message) status(message);
    }
    function openForm(duty, kit = 'home', past = false) {
      editId = duty?.id || null;
      const form = root.querySelector('[data-role="jersey-form"]');
      const duties = BT.storage.getJerseyDuties();
      const candidates = workload(activePlayers(), duties, season);
      const archived = duty && BT.storage.getPlayer(duty.playerId);
      if (archived?.archived) candidates.push({ player: archived, total: 0 });
      if (duty && !archived) candidates.push({ player: { id: duty.playerId, name: duty.playerName || 'Ehemaliger Spieler', archived: true }, total: 0 });
      const games = BT.storage.getGames();
      form.hidden = false;
      form.innerHTML = `<h3>${duty ? 'Waschdienst bearbeiten' : past ? 'Früheren Waschdienst nachtragen' : 'Mitnahme eintragen'}</h3>
        <input type="hidden" name="id" value="${esc(editId || '')}">
        <div class="jersey-form-grid"><label>Trikotsatz<select name="kit"><option value="home">Heimtrikots</option><option value="away">Auswärtstrikots</option></select></label>
        <label>Spieler<select name="playerId" required><option value="">Spieler auswählen</option>${candidates.map(row => `<option value="${esc(row.player.id)}">${esc(row.player.name)} · ${row.total} Dienst(e)${row.player.archived ? ' · archiviert' : ''}</option>`).join('')}</select></label>
        <label>Mitgenommen am<input name="takenOn" type="date" max="${todayISO()}" required></label>
        <label>Rückgabe bis (optional)<input name="dueOn" type="date"></label>
        <label>Status<select name="status"><option value="pending">Mitgenommen · Rückgabe offen</option><option value="returned">Gewaschen und zurückgegeben</option></select></label>
        <label data-role="returned-field">Sauber zurück am<input name="returnedOn" type="date" max="${todayISO()}"></label>
        <label>Spiel (optional)<select name="gameId"><option value="">Ohne Spielzuordnung</option>${games.map(game => `<option value="${esc(game.id)}">${esc(formatDate(game.date))} · ${esc(game.home || '')} – ${esc(game.away || '')}</option>`).join('')}</select></label>
        <label>Notiz (optional)<input name="note" maxlength="300" placeholder="z. B. Rückgabe beim nächsten Training"></label></div>
        <div class="form-actions"><button class="btn primary" type="submit">Speichern</button><button class="btn" type="button" data-action="cancel">Abbrechen</button></div>
        <p class="auth-status" data-role="form-error" role="alert"></p>`;
      for (const [key, value] of Object.entries({ kit: duty?.kit || kit, playerId: duty?.playerId || '', takenOn: duty?.takenOn || todayISO(),
        dueOn: duty?.dueOn || '', status: duty?.status || (past ? 'returned' : 'pending'), returnedOn: duty?.returnedOn || (past ? todayISO() : ''), gameId: duty?.gameId || '', note: duty?.note || '' })) form.elements[key].value = value;
      const updateReturn = () => {
        const returned = form.elements.status.value === 'returned';
        form.querySelector('[data-role="returned-field"]').hidden = !returned;
        form.elements.returnedOn.required = returned;
        if (returned && !form.elements.returnedOn.value) form.elements.returnedOn.value = todayISO();
        form.elements.returnedOn.min = form.elements.takenOn.value;
        form.elements.dueOn.min = form.elements.takenOn.value;
      };
      form.elements.status.addEventListener('change', updateReturn);
      form.elements.takenOn.addEventListener('change', updateReturn);
      form.elements.gameId.addEventListener('change', () => {
        const game = games.find(item => item.id === form.elements.gameId.value);
        if (game) {
          form.elements.kit.value = game.matchday?.draft?.ownSide || (/lindau/i.test(game.home || '') ? 'home' : 'away');
          if (game.date && game.date <= todayISO()) form.elements.takenOn.value = game.date;
          updateReturn();
        }
      });
      form.querySelector('[data-action="cancel"]').addEventListener('click', () => { form.hidden = true; editId = null; });
      form.onsubmit = event => {
        event.preventDefault();
        if (!canEdit()) return;
        try {
          const previous = duty ? BT.storage.getJerseyDuties().find(item => item.id === duty.id) : null;
          // Do not turn a return recorded elsewhere in this tab into an open duty through a stale form.
          if (duty && previous?.updatedAt !== duty.updatedAt) throw new Error('Der Eintrag wurde geändert. Öffne ihn erneut.');
          const game = games.find(item => item.id === form.elements.gameId.value);
          BT.storage.upsertJerseyDuty({ id: editId || undefined, kit: form.elements.kit.value, playerId: form.elements.playerId.value,
            takenOn: form.elements.takenOn.value, dueOn: form.elements.dueOn.value, status: form.elements.status.value,
            returnedOn: form.elements.returnedOn.value, gameId: game?.id || '',
            gameLabel: game ? `${formatDate(game.date)} · ${game.home || ''} – ${game.away || ''}` : '', note: form.elements.note.value.trim() });
          editId = null; draw('Waschdienst gespeichert.');
        } catch (error) { form.querySelector('[data-role="form-error"]').textContent = error.message; }
      };
      updateReturn();
      form.elements.playerId.focus();
      form.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
    draw();
  }
  return { render, workload };
})();
