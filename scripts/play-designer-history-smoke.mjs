import { createHistory } from '../js/play-designer/history.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const history = createHistory({ title: 'Start', steps: [{ id: '1' }] }, { limit: 3 });
assert(!history.canUndo(), 'Neue Historie darf keinen Undo-Schritt besitzen');
assert(!history.canRedo(), 'Neue Historie darf keinen Redo-Schritt besitzen');

history.commit({ title: 'Änderung 1', steps: [{ id: '1' }] });
history.commit({ title: 'Änderung 2', steps: [{ id: '1' }] });
assert(history.canUndo(), 'Undo wurde nach Änderungen nicht aktiviert');
assert(history.undo().title === 'Änderung 1', 'Undo stellt nicht den vorherigen Zustand her');
assert(history.canRedo(), 'Redo wurde nach Undo nicht aktiviert');
assert(history.redo().title === 'Änderung 2', 'Redo stellt nicht den nächsten Zustand her');

history.undo();
history.commit({ title: 'Neue Abzweigung', steps: [{ id: '1' }] });
assert(!history.canRedo(), 'Neue Änderung muss den Redo-Zweig löschen');

history.commit({ title: 'Drei', steps: [] });
history.commit({ title: 'Vier', steps: [] });
history.commit({ title: 'Fünf', steps: [] });
assert(history.sizes().past === 3, 'Historienlimit wird nicht eingehalten');

history.replace({ title: 'Gespeichert', steps: [] });
assert(history.current().title === 'Gespeichert', 'Aktueller Zustand wird nach dem Speichern nicht ersetzt');

history.reset({ title: 'Geladen', steps: [] });
assert(history.current().title === 'Geladen', 'Reset lädt nicht den neuen Zustand');
assert(!history.canUndo() && !history.canRedo(), 'Reset leert die Historie nicht');

console.log('CourtHub Play Designer: Undo/Redo-Prüfungen erfolgreich.');
