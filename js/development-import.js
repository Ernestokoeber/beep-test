(function () {
  window.BT = window.BT || {};

  BT.developmentImport = (function () {
    const MAX_PDF_BYTES = 3 * 1024 * 1024;
    let activeGame = null;
    let activePreview = null;

    function cleanSourceLabel(value) {
      const pieces = String(value || 'Spielerbewertung')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .split(/[\\/]/);
      return (pieces.at(-1) || 'Spielerbewertung').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Spielerbewertung';
    }

    function normalizeName(value) {
      return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    function bytesToBase64(bytes) {
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }

    function opponentForGame(game) {
      if (game.opponent) return String(game.opponent);
      const home = String(game.home || '');
      const away = String(game.away || '');
      if (/lindau/i.test(home) && away) return away;
      if (/lindau/i.test(away) && home) return home;
      return [home, away].filter(Boolean).join(' – ') || 'Unbekannter Gegner';
    }

    async function parseFile(file, game, onProgress) {
      if (!file || file.type !== 'application/pdf') throw new TypeError('Bitte eine PDF-Datei auswählen.');
      if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PDF_BYTES) throw new TypeError('Die PDF darf höchstens 3 MB groß sein.');
      if (!game?.id || !BT.storage.getGame(game.id)) throw new Error('Das Ursprungsspiel existiert nicht mehr.');
      const progress = typeof onProgress === 'function' ? onProgress : () => {};
      progress({ phase: 'read', message: 'PDF wird lokal vorbereitet …' });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sourceHash = 'sha256:' + [...new Uint8Array(digest)]
        .map(value => value.toString(16).padStart(2, '0')).join('');
      if (BT.storage.getDevelopmentImportReceipts().some(item => item.sourceHash === sourceHash)) {
        throw new Error('Diese PDF wurde bereits importiert.');
      }
      if (!BT.api.getToken()) throw new Error('Für die PDF-Analyse zuerst unter Konto & Sync anmelden.');
      progress({ phase: 'analyze', message: 'Spielerbewertung wird sicher analysiert …' });
      const response = await BT.api.ai('parsePlayerDevelopmentPdf', {
        fileBase64: bytesToBase64(bytes),
        mimeType: 'application/pdf',
        game: { date: game.date || '', opponent: opponentForGame(game) },
        knownPlayerNames: BT.storage.getPlayers().filter(player => !player.archived).map(player => player.name)
      });
      const data = response?.data || response;
      if (data?.contractVersion !== 'player-development-import.v1' || !Array.isArray(data.candidates) || !Array.isArray(data.warnings)) {
        throw new Error('Die KI-Antwort hat einen unbekannten Vertrag.');
      }
      progress({ phase: 'review', message: 'Analyse bereit. Bitte jede Beobachtung prüfen.' });
      return {
        contractVersion: data.contractVersion,
        gameId: game.id,
        sourceHash,
        sourceLabel: cleanSourceLabel(data.sourceLabel || file.name),
        candidates: data.candidates.map(candidate => JSON.parse(JSON.stringify(candidate))),
        warnings: data.warnings.map(String),
        model: String(response?.model || ''),
        requestId: String(response?.requestId || '')
      };
    }

    function matchingPlayerIds(name, players) {
      const wanted = normalizeName(name);
      if (!wanted) return [];
      const exact = players.filter(player => normalizeName(player.name) === wanted);
      if (exact.length) return exact.map(player => player.id);
      if (!wanted.includes(' ')) {
        return players.filter(player => normalizeName(player.name).split(' ').includes(wanted)).map(player => player.id);
      }
      return [];
    }

    function buildPreview(draft, players, game) {
      if (!draft || draft.contractVersion !== 'player-development-import.v1' || !Array.isArray(draft.candidates)) throw new TypeError('Ungültiger Importentwurf.');
      if (!game?.id || draft.gameId !== game.id) throw new TypeError('Importentwurf und Ursprungsspiel passen nicht zusammen.');
      const roster = (Array.isArray(players) ? players : []).filter(player => player?.id && !player.archived);
      return {
        contractVersion: draft.contractVersion,
        gameId: game.id,
        sourceHash: draft.sourceHash,
        sourceLabel: cleanSourceLabel(draft.sourceLabel),
        warnings: [...draft.warnings],
        rows: draft.candidates.map((candidate, candidateIndex) => {
          const matches = matchingPlayerIds(candidate.playerName, roster);
          return {
            candidateIndex,
            candidate: JSON.parse(JSON.stringify(candidate)),
            suggestedPlayerId: matches.length === 1 ? matches[0] : null,
            matchingPlayerIds: matches
          };
        })
      };
    }

    function confirm(preview, selections) {
      if (!preview || !Array.isArray(preview.rows) || !Array.isArray(selections)) throw new TypeError('Ungültige Importauswahl.');
      const game = BT.storage.getGame(preview.gameId);
      if (!game) throw new Error('Das Ursprungsspiel existiert nicht mehr.');
      if (BT.storage.getDevelopmentImportReceipts().some(item => item.sourceHash === preview.sourceHash)) {
        throw new Error('Diese PDF wurde bereits importiert.');
      }
      const players = new Map(BT.storage.getPlayers().map(player => [player.id, player]));
      const byIndex = new Map(selections.map(selection => [Number(selection.candidateIndex), selection]));
      const accepted = preview.rows.filter(row => byIndex.get(row.candidateIndex)?.accepted === true);
      if (!accepted.length) throw new TypeError('Mindestens eine Beobachtung muss bestätigt werden.');
      const now = new Date().toISOString();
      const findings = accepted.map(row => {
        const selection = byIndex.get(row.candidateIndex);
        const player = players.get(selection.playerId);
        if (!player || player.archived) throw new Error('Der ausgewählte Spieler existiert nicht mehr.');
        const candidate = row.candidate;
        const coachPriority = selection.coachPriority === null || selection.coachPriority === undefined || selection.coachPriority === ''
          ? null
          : Number(selection.coachPriority);
        return {
          id: BT.util.uuid('df_'),
          scope: 'player',
          playerId: player.id,
          sourceGameId: game.id,
          sourceType: 'player-evaluation-pdf',
          sourceHash: preview.sourceHash,
          sourceLabel: cleanSourceLabel(preview.sourceLabel),
          sourcePage: candidate.sourcePage,
          category: selection.category || candidate.category,
          skillKey: selection.skillKey || candidate.skillKey,
          kind: selection.kind || candidate.kind,
          observation: String(selection.observation ?? candidate.observation).trim(),
          evidenceExcerpt: candidate.evidenceExcerpt,
          evidenceRefs: [],
          suggestedPriority: candidate.suggestedPriority,
          coachPriority,
          pinned: false,
          roleRelevant: selection.roleRelevant === undefined ? candidate.roleRelevant === true : selection.roleRelevant === true,
          status: 'new',
          drillTags: Array.isArray(candidate.drillTags) ? [...candidate.drillTags] : [],
          linkedDrillIds: [],
          coachNote: '',
          createdAt: now,
          confirmedAt: now,
          updatedAt: now
        };
      });
      const receipt = {
        id: BT.util.uuid('dir_'),
        sourceHash: preview.sourceHash,
        sourceLabel: cleanSourceLabel(preview.sourceLabel),
        gameId: game.id,
        findingIds: findings.map(item => item.id),
        importedAt: now,
        confirmedAt: now
      };
      return BT.storage.saveDevelopmentImport({ receipt, findings });
    }

    function dialogElements() {
      const dialog = document.getElementById('development-import-dialog');
      if (!dialog) throw new Error('Der Importdialog ist nicht verfügbar.');
      return {
        dialog,
        file: dialog.querySelector('[data-role="development-pdf"]'),
        analyze: dialog.querySelector('[data-action="analyze-development-pdf"]'),
        status: dialog.querySelector('[data-role="development-import-dialog-status"]'),
        preview: dialog.querySelector('[data-role="development-import-preview"]'),
        confirm: dialog.querySelector('[data-action="confirm-development-import"]')
      };
    }

    function categoryOptions(selected) {
      return Object.keys(BT.developmentCore.TAXONOMY).map(category =>
        `<option value="${category}"${category === selected ? ' selected' : ''}>${category}</option>`
      ).join('');
    }

    function skillOptions(category, selected) {
      return (BT.developmentCore.TAXONOMY[category] || []).map(skill =>
        `<option value="${skill}"${skill === selected ? ' selected' : ''}>${skill}</option>`
      ).join('');
    }

    function updateConfirmState(elements) {
      const accepted = [...elements.preview.querySelectorAll('[data-candidate-index]')]
        .filter(row => row.querySelector('[data-field="accepted"]').checked);
      elements.confirm.disabled = !accepted.length || accepted.some(row =>
        !row.querySelector('[data-field="playerId"]').value
        || !row.querySelector('[data-field="observation"]').value.trim()
        || !row.querySelector('[data-field="skillKey"]').value
      );
    }

    function renderPreview(elements, preview) {
      const escape = BT.util.escapeHTML;
      const players = BT.storage.getPlayers().filter(player => !player.archived).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      elements.preview.innerHTML = `${preview.warnings.length ? `<div class="notice"><strong>Prüfhinweise</strong><ul>${preview.warnings.map(item => `<li>${escape(item)}</li>`).join('')}</ul></div>` : ''}
        ${preview.rows.map(row => {
          const candidate = row.candidate;
          const playerOptions = players.map(player => `<option value="${escape(player.id)}"${player.id === row.suggestedPlayerId ? ' selected' : ''}>${escape(player.name)}</option>`).join('');
          return `<article class="card" data-candidate-index="${row.candidateIndex}">
            <label><input type="checkbox" data-field="accepted" checked> Beobachtung übernehmen</label>
            <div class="form-grid">
              <label>Spieler<select data-field="playerId"><option value="">Zuordnung wählen …</option>${playerOptions}</select></label>
              <label>Art<select data-field="kind"><option value="development"${candidate.kind === 'development' ? ' selected' : ''}>Entwicklungsfeld</option><option value="strength"${candidate.kind === 'strength' ? ' selected' : ''}>Stärke</option></select></label>
              <label>Kategorie<select data-field="category">${categoryOptions(candidate.category)}</select></label>
              <label>Fähigkeit<select data-field="skillKey">${skillOptions(candidate.category, candidate.skillKey)}</select></label>
              <label>Coach-Priorität<input data-field="coachPriority" type="number" min="1" max="5" value="${candidate.suggestedPriority}"></label>
              <label><input data-field="roleRelevant" type="checkbox"${candidate.roleRelevant ? ' checked' : ''}> Rollenrelevant</label>
            </div>
            <label>Beobachtung<textarea data-field="observation" rows="3" maxlength="500">${escape(candidate.observation)}</textarea></label>
            <p class="muted"><strong>Beleg · Seite ${candidate.sourcePage}:</strong> ${escape(candidate.evidenceExcerpt)}</p>
          </article>`;
        }).join('')}`;
      elements.preview.querySelectorAll('[data-candidate-index]').forEach(row => {
        const category = row.querySelector('[data-field="category"]');
        category.addEventListener('change', () => {
          row.querySelector('[data-field="skillKey"]').innerHTML = skillOptions(category.value, '');
          updateConfirmState(elements);
        });
        row.querySelectorAll('input, select, textarea').forEach(input => input.addEventListener('input', () => updateConfirmState(elements)));
        row.querySelectorAll('select').forEach(input => input.addEventListener('change', () => updateConfirmState(elements)));
      });
      updateConfirmState(elements);
    }

    function selectionsFromDialog(elements) {
      return [...elements.preview.querySelectorAll('[data-candidate-index]')].map(row => ({
        candidateIndex: Number(row.dataset.candidateIndex),
        accepted: row.querySelector('[data-field="accepted"]').checked,
        playerId: row.querySelector('[data-field="playerId"]').value,
        kind: row.querySelector('[data-field="kind"]').value,
        category: row.querySelector('[data-field="category"]').value,
        skillKey: row.querySelector('[data-field="skillKey"]').value,
        observation: row.querySelector('[data-field="observation"]').value,
        coachPriority: row.querySelector('[data-field="coachPriority"]').value,
        roleRelevant: row.querySelector('[data-field="roleRelevant"]').checked
      }));
    }

    function bindDialog(elements) {
      if (elements.dialog.dataset.bound === 'true') return;
      elements.dialog.dataset.bound = 'true';
      elements.file.addEventListener('change', () => { elements.analyze.disabled = !elements.file.files?.length; });
      elements.dialog.querySelector('[data-action="close-development-import"]').addEventListener('click', () => elements.dialog.close());
      elements.analyze.addEventListener('click', async () => {
        elements.analyze.disabled = true;
        elements.confirm.disabled = true;
        elements.preview.replaceChildren();
        try {
          const draft = await parseFile(elements.file.files?.[0], activeGame, progress => { elements.status.textContent = progress.message; });
          activePreview = buildPreview(draft, BT.storage.getPlayers(), activeGame);
          renderPreview(elements, activePreview);
          elements.status.textContent = `${activePreview.rows.length} Beobachtungen erkannt. Bitte einzeln prüfen.`;
        } catch (error) {
          activePreview = null;
          elements.status.textContent = error.message;
        } finally {
          elements.analyze.disabled = !elements.file.files?.length;
        }
      });
      elements.confirm.addEventListener('click', () => {
        try {
          const saved = confirm(activePreview, selectionsFromDialog(elements));
          elements.status.textContent = `${saved.findings.length} bestätigte Beobachtungen gespeichert.`;
          BT.util.toast?.('Spielerentwicklung wurde aktualisiert.');
          elements.dialog.close();
        } catch (error) {
          elements.status.textContent = error.message;
        }
      });
    }

    async function open(game) {
      const current = game?.id && BT.storage.getGame(game.id);
      if (!current) throw new Error('Das Ursprungsspiel existiert nicht mehr.');
      const elements = dialogElements();
      bindDialog(elements);
      activeGame = current;
      activePreview = null;
      elements.file.value = '';
      elements.preview.replaceChildren();
      elements.status.textContent = `Spielerbewertungen für ${opponentForGame(current)} auswählen. Die PDF selbst wird nicht gespeichert.`;
      elements.analyze.disabled = true;
      elements.confirm.disabled = true;
      if (typeof elements.dialog.showModal === 'function') elements.dialog.showModal();
      else elements.dialog.setAttribute('open', '');
    }

    return { parseFile, buildPreview, confirm, open };
  })();
})();
