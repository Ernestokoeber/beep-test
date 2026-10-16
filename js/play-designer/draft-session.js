// Existing board tools share one setting name. While a routed editor is open,
// its working copy belongs to this document, not to a different browser tab.
let active = null;
let installed = false;
export function beginDraftSession(storage, board) {
  if (!installed) {
    const read = storage.getSetting.bind(storage), write = storage.setSetting.bind(storage);
    storage.getSetting = (key, fallback) => key === 'tacticsBoardDraft' && active
      ? structuredClone(active.board) : read(key, fallback);
    storage.setSetting = (key, value) => {
      if (key === 'tacticsBoardDraft' && active) active.board = structuredClone(value);
      return write(key, value);
    };
    installed = true;
  }
  const session = { board: structuredClone(board) }; active = session;
  return () => { if (active === session) active = null; };
}
