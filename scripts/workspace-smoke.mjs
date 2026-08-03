import { filterWorkspaceForRole, hasValidTacticsShape } from '../api/_lib/workspace-data.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

const source = { players: [], settings: { tacticsBoardDraft: { title: 'Entwurf' } }, tactics: [{ id: 'draft', published: false }, { id: 'live', published: true }] };
const viewer = filterWorkspaceForRole(source, 'viewer');
assert(viewer.tactics.map(item => item.id).join(',') === 'live', 'Viewer erhält unveröffentlichte Taktiken');
assert(source.tactics.length === 2, 'Serverfilter verändert den kanonischen Workspace');
assert(viewer.settings.tacticsBoardDraft === undefined, 'Viewer erhält einen unveröffentlichten Entwurf aus den Einstellungen');
assert(filterWorkspaceForRole({ tactics: 'invalid' }, 'viewer').tactics.length === 0, 'Ungültige Taktiken werden für Viewer nicht sicher geleert');
assert(hasValidTacticsShape({ tactics: [] }), 'Leeres Taktikarray wird nicht als gültiger Workspace akzeptiert');
assert(!hasValidTacticsShape({ tactics: {} }), 'Ungültige Taktikdaten werden vom Workspace-Endpunkt nicht abgewiesen');
console.log('Workspace-Smoke-Test erfolgreich.');
