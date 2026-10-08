import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'https://coach.tsv-lindau.de/#/training', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.ResizeObserver = class { observe() {} disconnect() {} };
window.HTMLElement.prototype.scrollIntoView = () => {};
window.confirm = () => true;
for (const match of html.matchAll(/<script defer src="(js\/[^"]+)"/g)) {
  window.eval(readFileSync(new URL('../' + match[1], import.meta.url), 'utf8'));
}
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => window.setTimeout(resolve, 30));
const player = window.BT.storage.upsertPlayer({ name: 'Wurfspieler', number: 8, position: 'PG' });
const entry = {
  date: '2026-10-13', summary: 'Wurfentscheidungen', freethrows: { attempted: 12 }, shots: [{ category: 'Pop-Wurf', attempted: 20 }],
  drills: [{ name: 'PnR & Pop', minutes: 105, intensity: 'medium', description: 'Screen nutzen, freien Wurf nehmen.', shotTargets: [
    { kind: 'field', category: 'Pop-Wurf', attempted: 20 }, { kind: 'freethrow', category: 'Freiwürfe', attempted: 12 }
  ] }]
};
window.BT.seasonplanner.applyAIPlan({ trainings: [entry] }, [{ date: entry.date, weekday: 'tue', time: '20:15', durationMinutes: 105, load: 'medium' }]);
const training = window.BT.storage.getTrainings().find(item => item.date === entry.date);
training.attendance = [{ playerId: player.id, status: 'present' }];
window.BT.storage.upsertTraining(training);
window.location.hash = '#/training/' + training.id;
window.dispatchEvent(new window.HashChangeEvent('hashchange'));
await new Promise(resolve => window.setTimeout(resolve, 30));
const document = window.document;
document.querySelector('.subnav-btn[data-pane="shots"]').click();
assert.match(document.querySelector('[data-role="shots"] [data-role="shot-target"]').textContent, /20 Versuche pro Spieler/);
assert.equal(document.querySelector('[data-role="shots"] [data-role="att"]').value, '0', 'Planned attempts must not become actual attempts when opening capture');
assert.equal(document.querySelector('[data-role="freethrows"] [data-role="att"]').value, '0');
document.querySelector('[data-action="training-live"]').click();
assert.equal(document.querySelector('[data-live-action="shots"]').hidden, false);
assert.match(document.querySelector('[data-live="shot-targets"]').textContent, /Pop-Wurf: 20/);
document.querySelector('[data-live-action="shots"]').click();
assert.equal(document.querySelector('.training-live'), null);
assert.equal(document.querySelector('.pane[data-pane="shots"]').classList.contains('hidden'), false);
document.querySelector('[data-role="shots"] [data-act="m+"]').click();
const saved = window.BT.storage.getTraining(training.id);
assert.equal(saved.shots[0].entries[0].made, 1);
assert.equal(saved.shots[0].entries[0].attempted, 1);
assert.equal(saved.liveSession.blocks[0].shotTargets[0].category, 'Pop-Wurf', 'Returning from live mode must preserve the live session');
document.querySelector('[data-action="training-live"]').click();
assert.equal(document.querySelector('[data-live="block-name"]').textContent, 'PnR & Pop');
window.BT.trainingLive.close();
window.BT.training.cleanup();
window.BT.training.renderDetail(document.createElement('div'), training.id);
assert.equal(window.BT.storage.getTraining(training.id).shots[0].entries[0].made, 1, 'Rendering again must retain measured results');
window.BT.training.cleanup();
dom.window.close();
console.log('CourtHub Wurf-UI: Saisonplan, Ziele, Nullwerte, Live-Einstieg und Persistenz erfolgreich.');
