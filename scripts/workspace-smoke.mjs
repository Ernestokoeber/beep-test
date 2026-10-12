import { filterWorkspaceForRole, hasValidDevelopmentShape, hasValidTacticsShape } from '../api/_lib/workspace-data.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

const source = {
  players: [],
  settings: { tacticsBoardDraft: { title: 'Entwurf' } },
  tactics: [{ id: 'draft', published: false }, { id: 'live', published: true }],
  developmentFindings: [{ id: 'df_private', playerId: 'p1' }],
  developmentImportReceipts: [{ id: 'dir_private', sourceHash: 'sha256:test' }]
};
const viewer = filterWorkspaceForRole(source, 'viewer');
assert(viewer.tactics.map(item => item.id).join(',') === 'live', 'Viewer erhält unveröffentlichte Taktiken');
assert(source.tactics.length === 2, 'Serverfilter verändert den kanonischen Workspace');
assert(viewer.settings.tacticsBoardDraft === undefined, 'Viewer erhält einen unveröffentlichten Entwurf aus den Einstellungen');
assert(viewer.developmentFindings === undefined, 'Viewer erhält private Spielerentwicklungsbefunde');
assert(viewer.developmentImportReceipts === undefined, 'Viewer erhält private PDF-Importbelege');
assert(source.developmentFindings.length === 1, 'Viewer-Filter verändert das Entwicklungsjournal');
assert(filterWorkspaceForRole({ tactics: 'invalid' }, 'viewer').tactics.length === 0, 'Ungültige Taktiken werden für Viewer nicht sicher geleert');
assert(hasValidTacticsShape({ tactics: [] }), 'Leeres Taktikarray wird nicht als gültiger Workspace akzeptiert');
assert(!hasValidTacticsShape({ tactics: {} }), 'Ungültige Taktikdaten werden vom Workspace-Endpunkt nicht abgewiesen');
assert(hasValidDevelopmentShape({ developmentFindings: [], developmentImportReceipts: [] }), 'Leere Entwicklungslisten werden nicht akzeptiert');
assert(hasValidDevelopmentShape({}), 'Alte Workspaces ohne Entwicklungslisten werden nicht akzeptiert');
assert(!hasValidDevelopmentShape({ developmentFindings: {} }), 'Ein Objekt wird fälschlich als Befundliste akzeptiert');
assert(!hasValidDevelopmentShape({ developmentImportReceipts: {} }), 'Ein Objekt wird fälschlich als Importbelegliste akzeptiert');
console.log('Workspace-Smoke-Test erfolgreich.');
