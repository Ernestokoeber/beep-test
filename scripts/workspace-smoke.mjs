import { filterWorkspaceForRole } from '../api/_lib/workspace-data.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

const source = { players: [], tactics: [{ id: 'draft', published: false }, { id: 'live', published: true }] };
const viewer = filterWorkspaceForRole(source, 'viewer');
assert(viewer.tactics.map(item => item.id).join(',') === 'live', 'Viewer erhält unveröffentlichte Taktiken');
assert(source.tactics.length === 2, 'Serverfilter verändert den kanonischen Workspace');
assert(filterWorkspaceForRole({ tactics: 'invalid' }, 'viewer').tactics.length === 0, 'Ungültige Taktiken werden für Viewer nicht sicher geleert');
console.log('Workspace-Smoke-Test erfolgreich.');
