import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const NOW = '2026-10-12T18:00:00.000Z';
const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
dom.window.eval(readFileSync(new URL('../js/development-core.js', import.meta.url), 'utf8'));

const core = dom.window.BT.developmentCore;
const context = {
  playerIds: new Set(['p1']),
  gameIds: new Set(['g1', 'g2', 'g3', 'g4'])
};

function finding(overrides = {}) {
  return {
    id: 'df_1',
    scope: 'player',
    playerId: 'p1',
    sourceGameId: 'g1',
    sourceType: 'player-evaluation-pdf',
    sourceHash: 'sha256:' + 'a'.repeat(64),
    sourceLabel: 'Spielerbewertung BG Illertal 3',
    sourcePage: 2,
    category: 'decision',
    skillKey: 'turnover-control',
    kind: 'development',
    observation: 'Pass unter Druck zu früh.',
    evidenceExcerpt: 'Dritter Ballverlust gegen Druck.',
    evidenceRefs: [],
    suggestedPriority: 4,
    coachPriority: null,
    pinned: false,
    roleRelevant: true,
    status: 'new',
    drillTags: ['passing', 'pressure'],
    linkedDrillIds: [],
    coachNote: '',
    createdAt: NOW,
    confirmedAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

const normalized = core.validateFinding(finding(), context);
assert.equal(normalized.scope, 'player');
assert.notEqual(normalized, finding(), 'Validierung muss eine Kopie liefern');
assert.throws(
  () => core.validateFinding(finding({ skillKey: 'frei-erfunden' }), context),
  dom.window.TypeError,
  'Unbekannte Taxonomieschlüssel dürfen nicht gespeichert werden'
);
assert.throws(
  () => core.validateFinding(finding({ evidenceExcerpt: 'x'.repeat(401) }), context),
  dom.window.TypeError,
  'Belegausschnitte über 400 Zeichen müssen abgelehnt werden'
);
assert.throws(
  () => core.validateFinding(finding({ playerId: 'gelöscht' }), context),
  dom.window.TypeError,
  'Gelöschte oder unbekannte Spieler dürfen nicht referenziert werden'
);
assert.throws(
  () => core.validateFinding(finding({ sourceHash: null }), context),
  dom.window.TypeError,
  'PDF-Befunde benötigen einen SHA-256-Hash'
);

const findings = [
  finding({ id: 'df_repeat_1', sourceGameId: 'g1', drillTags: ['passing', 'pressure'] }),
  finding({ id: 'df_repeat_2', sourceGameId: 'g2', confirmedAt: '2026-10-11T18:00:00.000Z', updatedAt: '2026-10-11T18:00:00.000Z', drillTags: ['pressure', 'advantage-read'] }),
  finding({ id: 'df_same_game', sourceGameId: 'g2', confirmedAt: '2026-10-10T18:00:00.000Z', updatedAt: '2026-10-10T18:00:00.000Z' }),
  finding({ id: 'df_box', sourceGameId: 'g3', category: 'rebounding', skillKey: 'box-out', suggestedPriority: 5, roleRelevant: false, drillTags: ['box-out'] }),
  finding({ id: 'df_spacing', sourceGameId: 'g4', category: 'offense', skillKey: 'spacing', suggestedPriority: 3, pinned: true, drillTags: ['spacing'] }),
  finding({ id: 'df_fourth', sourceGameId: 'g4', category: 'defense', skillKey: 'closeout', suggestedPriority: 2 }),
  finding({ id: 'df_achieved', sourceGameId: 'g4', category: 'technique', skillKey: 'shooting', suggestedPriority: 5, status: 'achieved' }),
  finding({ id: 'df_strength', sourceGameId: 'g3', category: 'transition', skillKey: 'early-advance', kind: 'strength', suggestedPriority: 4 }),
  finding({ id: 'df_same_skill_strength', sourceGameId: 'g4', kind: 'strength', observation: 'Unter Druck wurde mehrfach ruhig organisiert.' })
].map(item => core.validateFinding(item, context));

const profile = core.profileForPlayer(findings, 'p1', NOW);
assert.equal(profile.priorities.length, 3, 'Spielerprofile müssen auf drei Entwicklungsfelder begrenzt bleiben');
assert.equal(profile.priorities[0].groupId, 'p1:offense:spacing', 'Fixierte Entwicklungsfelder müssen Vorrang haben');
const repeated = profile.priorities.find(item => item.skillKey === 'turnover-control');
assert.equal(repeated.distinctGameCount, 2, 'Mehrere Fundstellen aus demselben Spiel dürfen den Wiederholungsbonus nicht erhöhen');
assert.deepEqual(Array.from(repeated.drillTags), ['advantage-read', 'passing', 'pressure'], 'Übungs-Tags müssen eindeutig und reproduzierbar sein');
assert.equal(profile.strengths.length, 2, 'Stärken müssen auch bei gleichem Skill getrennt von Entwicklungsfeldern ausgegeben werden');
assert(!profile.priorities.some(item => item.skillKey === 'shooting'), 'Erreichte Ziele dürfen nicht als aktuelle Priorität erscheinen');
assert.equal(profile.history.length, findings.length, 'Die Historie muss alle bestätigten Spielerbefunde enthalten');

const local = [finding({ id: 'df_tie', observation: 'A' }), finding({ id: 'df_local' })];
const remote = [finding({ id: 'df_tie', observation: 'Z' }), finding({ id: 'df_remote' })];
const localFirst = core.mergeVersionedById(local, remote);
const remoteFirst = core.mergeVersionedById(remote, local);
assert.deepEqual(JSON.parse(JSON.stringify(localFirst)), JSON.parse(JSON.stringify(remoteFirst)), 'Gleiche Zeitstempel müssen auf allen Geräten dasselbe Ergebnis liefern');
assert.equal(localFirst.length, 3, 'Unabhängige Einträge dürfen beim Merge nicht verloren gehen');
assert.equal(localFirst.find(item => item.id === 'df_tie').observation, 'Z', 'Der deterministische Tie-Break muss lexikografisch entscheiden');

const mergedWorkspace = core.mergeDevelopmentWorkspace(
  { developmentFindings: local, developmentImportReceipts: [{ id: 'dir_a', importedAt: NOW }] },
  { developmentFindings: remote, developmentImportReceipts: [{ id: 'dir_b', importedAt: NOW }] }
);
assert.equal(mergedWorkspace.developmentFindings.length, 3);
assert.equal(mergedWorkspace.developmentImportReceipts.length, 2);

dom.window.BT.util = {
  seasonForDate: () => '26/27',
  todayISO: () => '2026-10-12',
  uuid: prefix => prefix + 'test',
  $: () => null,
  renderTemplate: () => dom.window.document.createElement('div'),
  formatDate: value => value,
  escapeHTML: value => value,
  downloadCSV() {},
  downloadJSON() {},
  shareOrDownloadJSON: async () => 'downloaded',
  pickFile: async () => null,
  readFileAsText: async () => '',
  confirmBtn() {}
};
const protectedTraining = { id: 'tr_u9ki7ul9pxyo', date: '2026-10-13', title: 'Dienstag Mannschaftstraining' };
const schemaFour = {
  schemaVersion: 4,
  meta: { updatedAt: '2026-10-12T17:00:00.000Z' },
  players: [{ id: 'p1', name: 'Dhruva' }],
  sessions: [],
  trainings: [protectedTraining],
  games: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }],
  opponents: [], tableDuties: [], jerseyDuties: [], notes: [], freethrows: [],
  drills: [], templates: [], phases: [], tactics: [], settings: {}
};
dom.window.localStorage.setItem('beepTest_v1', JSON.stringify(schemaFour));
dom.window.eval(readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8'));
const storage = dom.window.BT.storage;
const migrated = storage.load();
assert.equal(migrated.schemaVersion, 5, 'Schema 4 wird nicht auf Schema 5 migriert');
assert.deepEqual(Array.from(migrated.developmentFindings), []);
assert.deepEqual(Array.from(migrated.developmentImportReceipts), []);
assert.equal(JSON.stringify(migrated.trainings[0]), JSON.stringify(protectedTraining), 'Bestehende Trainings werden bei der Migration verändert');

const importFindings = [
  finding({ id: 'df_import_1' }),
  finding({ id: 'df_import_2', category: 'role', skillKey: 'point-guard-organization' })
];
const receipt = {
  id: 'dir_import_1',
  sourceHash: importFindings[0].sourceHash,
  sourceLabel: 'Bewertung Illertal',
  gameId: 'g1',
  findingIds: importFindings.map(item => item.id),
  importedAt: NOW,
  confirmedAt: NOW
};
const savedImport = storage.saveDevelopmentImport({ receipt, findings: importFindings });
assert.equal(savedImport.findings.length, 2, 'Bestätigte Befunde werden nicht gemeinsam gespeichert');
assert.equal(storage.getDevelopmentFindings({ playerId: 'p1' }).length, 2, 'Spielerfilter liefert nicht die bestätigten Befunde');
assert.equal(storage.getDevelopmentImportReceipts().length, 1, 'Importbeleg fehlt');

const beforeInvalidBatch = dom.window.localStorage.getItem('beepTest_v1');
assert.throws(() => storage.saveDevelopmentImport({
  receipt: { ...receipt, id: 'dir_import_2', sourceHash: 'sha256:' + 'b'.repeat(64) },
  findings: [
    finding({ id: 'df_valid', sourceHash: 'sha256:' + 'b'.repeat(64) }),
    finding({ id: 'df_invalid', sourceHash: 'sha256:' + 'b'.repeat(64), skillKey: 'frei-erfunden' })
  ]
}), dom.window.TypeError, 'Ein ungültiger Befund muss den vollständigen Batch verwerfen');
assert.equal(dom.window.localStorage.getItem('beepTest_v1'), beforeInvalidBatch, 'Fehlgeschlagener Batch verändert den Workspace');
assert.throws(
  () => storage.updateDevelopmentFinding('df_import_1', { playerId: 'p_fremd' }),
  dom.window.TypeError,
  'Unzulässige Felder dürfen über das Profil nicht verändert werden'
);
const updated = storage.updateDevelopmentFinding('df_import_1', { coachPriority: 5, status: 'developing' });
assert.equal(updated.coachPriority, 5);
assert.equal(updated.status, 'developing');

dom.window.eval(readFileSync(new URL('../js/history.js', import.meta.url), 'utf8'));
const history = dom.window.BT.history;
const newerRemoteFinding = finding({ id: 'df_import_1', observation: 'Neuere Backup-Fassung', updatedAt: '2026-10-12T19:00:00.000Z' });
history.applyBackup({ ...schemaFour, developmentFindings: [newerRemoteFinding] }, 'm');
const mergedBackup = storage.load();
assert.equal(mergedBackup.schemaVersion, 5);
assert.equal(mergedBackup.developmentFindings.find(item => item.id === 'df_import_1').observation, 'Neuere Backup-Fassung', 'Entwicklungsbefunde werden beim Backup-Merge nicht versioniert zusammengeführt');
assert.equal(mergedBackup.trainings[0].id, protectedTraining.id, 'Backup-Merge verliert bestehende Trainings');
history.applyBackup(schemaFour, 'r');
const replacedBackup = storage.load();
assert.equal(replacedBackup.schemaVersion, 5);
assert.deepEqual(Array.from(replacedBackup.developmentFindings), []);
assert.deepEqual(Array.from(replacedBackup.developmentImportReceipts), []);
assert.equal(replacedBackup.players[0].id, 'p1', 'Schema-4-Backup verliert Spieler beim Ersetzen');
assert.equal(replacedBackup.trainings[0].id, protectedTraining.id, 'Schema-4-Backup verliert Trainings beim Ersetzen');

console.log('CourtHub Spielerentwicklung: Fachmodell, Schema, Backup und Merge erfolgreich.');
