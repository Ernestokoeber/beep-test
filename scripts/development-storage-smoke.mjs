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
  finding({ id: 'df_strength', sourceGameId: 'g3', category: 'transition', skillKey: 'early-advance', kind: 'strength', suggestedPriority: 4 })
].map(item => core.validateFinding(item, context));

const profile = core.profileForPlayer(findings, 'p1', NOW);
assert.equal(profile.priorities.length, 3, 'Spielerprofile müssen auf drei Entwicklungsfelder begrenzt bleiben');
assert.equal(profile.priorities[0].groupId, 'p1:offense:spacing', 'Fixierte Entwicklungsfelder müssen Vorrang haben');
const repeated = profile.priorities.find(item => item.skillKey === 'turnover-control');
assert.equal(repeated.distinctGameCount, 2, 'Mehrere Fundstellen aus demselben Spiel dürfen den Wiederholungsbonus nicht erhöhen');
assert.deepEqual(Array.from(repeated.drillTags), ['advantage-read', 'passing', 'pressure'], 'Übungs-Tags müssen eindeutig und reproduzierbar sein');
assert.equal(profile.strengths.length, 1, 'Stärken müssen getrennt von Entwicklungsfeldern ausgegeben werden');
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

console.log('CourtHub Spielerentwicklung: Fachmodell, Priorisierung und Merge erfolgreich.');
