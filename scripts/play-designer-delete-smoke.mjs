import { deletePlayCompletely } from '../js/play-designer/complete-delete.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function storageMock() {
  const calls = [];
  return {
    calls,
    deleteTactic(id) { calls.push(['deleteTactic', id]); },
    setSetting(key, value) { calls.push(['setSetting', key, value]); }
  };
}

const savedStorage = storageMock();
const savedResult = deletePlayCompletely(savedStorage, { id: 'tac_42', title: 'Horns' });
assert(savedResult.deletedSavedPlay === true, 'Gespeichertes Play wurde nicht als gelöscht gemeldet');
assert(savedStorage.calls[0][0] === 'deleteTactic' && savedStorage.calls[0][1] === 'tac_42', 'Gespeichertes Play wurde nicht aus dem Playbook entfernt');
assert(savedStorage.calls[1][0] === 'setSetting' && savedStorage.calls[1][1] === 'tacticsBoardDraft' && savedStorage.calls[1][2] === null, 'Aktueller Entwurf wurde nach dem Löschen nicht geleert');

const draftStorage = storageMock();
const draftResult = deletePlayCompletely(draftStorage, { title: 'Fehlerhafter Entwurf' });
assert(draftResult.deletedSavedPlay === false, 'Ungespeicherter Entwurf darf nicht als gespeichertes Play gelten');
assert(draftStorage.calls.length === 1, 'Ungespeicherter Entwurf darf keinen Playbook-Löschaufruf auslösen');
assert(draftStorage.calls[0][0] === 'setSetting' && draftStorage.calls[0][2] === null, 'Ungespeicherter Entwurf wurde nicht vollständig verworfen');

console.log('CourtHub Play Designer: vollständiges Löschen erfolgreich geprüft.');
