const DRAFT_KEY = 'tacticsBoardDraft';

export function deletePlayCompletely(storage, board, draftKey = DRAFT_KEY) {
  if (!storage || typeof storage.setSetting !== 'function') {
    throw new TypeError('CourtHub-Speicher ist nicht verfügbar.');
  }

  const id = board && board.id ? String(board.id) : null;
  if (id && typeof storage.deleteTactic === 'function') storage.deleteTactic(id);
  storage.setSetting(draftKey, null);
  return { deletedSavedPlay: Boolean(id), id };
}

export function installCompleteDelete(root) {
  if (!root || root.dataset.completeDeleteInstalled === 'true') return root;
  root.dataset.completeDeleteInstalled = 'true';

  const button = root.querySelector('[data-a="delete-play"]');
  if (button) {
    button.textContent = 'Play vollständig löschen';
    button.title = 'Gespeichertes Play oder aktuellen Entwurf vollständig entfernen';
  }

  root.addEventListener('click', event => {
    const deleteButton = event.target.closest?.('[data-a="delete-play"]');
    if (!deleteButton || !root.contains(deleteButton)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!window.BT?.tactics?.__core?.canEdit?.()) {
      window.BT.util?.toast?.('Zum Löschen bitte als Trainerteam anmelden.');
      return;
    }

    const storage = window.BT?.storage;
    const board = storage?.getSetting?.(DRAFT_KEY, null);
    const titleInput = root.querySelector('[data-r="title"]');
    const title = String(titleInput?.value || board?.title || 'dieses Play').trim();
    const saved = Boolean(board?.id);
    const message = saved
      ? `„${title}“ wird vollständig aus dem Playbook und aus dem aktuellen Entwurf gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.`
      : `Der aktuelle Entwurf „${title}“ wird vollständig verworfen. Dieser Vorgang kann nicht rückgängig gemacht werden.`;

    if (!window.confirm(message)) return;

    try {
      const result = deletePlayCompletely(storage, board);
      const app = document.getElementById('app');
      if (app) {
        app.replaceChildren();
        window.BT.tactics.render(app);
      }
      window.BT.util?.toast?.(
        result.deletedSavedPlay ? 'Play vollständig gelöscht.' : 'Entwurf vollständig verworfen.'
      );
    } catch (error) {
      window.BT.util?.toast?.('Play konnte nicht gelöscht werden: ' + error.message);
    }
  }, true);

  return root;
}
