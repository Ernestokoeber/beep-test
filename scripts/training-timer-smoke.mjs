import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const file = new URL('../js/training-timer.js', import.meta.url);
assert.ok(existsSync(file), 'Die Trainingsuhr muss implementiert sein');
const dom = new JSDOM('<body></body>', { url: 'https://courthub.test', runScripts: 'outside-only' });
const { window: w } = dom;
let now = 100000;
const callbacks = new Map();
let intervalId = 0;
w.setInterval = fn => { callbacks.set(++intervalId, fn); return intervalId; };
w.clearInterval = id => callbacks.delete(id);
const pulse = () => { for (const fn of callbacks.values()) fn(); };
w.Date.now = () => now;
w.confirm = () => true;
w.eval(readFileSync(file, 'utf8'));
const api = w.BT.trainingTimer;
const click = (action) => w.document.querySelector(`[data-tt="${action}"]`).click();
const output = (role) => w.document.querySelector(`[data-tt="${role}"]`).textContent;
const change = (role, value) => {
  const el = w.document.querySelector(`[data-tt="${role}"]`);
  el.value = value;
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
};
function reopen(id = 'one') { api.close(); api.open(id); }

// Pausing must exclude idle time; closing/reloading must not lose elapsed time.
api.open('one');
assert.ok(w.document.documentElement.classList.contains('training-timer-open'), 'Hintergrundscrollen muss gesperrt sein');
const observer = new w.MutationObserver(() => {});
observer.observe(w.document.querySelector('[data-tt="points-0"]'), { childList: true });
pulse();
assert.equal(observer.takeRecords().length, 0, 'Unveränderte Punkte dürfen nicht ständig erneut angekündigt werden');
observer.disconnect();
click('toggle'); now += 12500; reopen();
assert.equal(output('time'), '00:12');
click('toggle'); now += 5000; reopen();
assert.equal(output('time'), '00:12');
click('toggle'); now += 1500; reopen();
assert.equal(output('time'), '00:14');
click('reset');
assert.equal(output('time'), '00:00');

// Scores undo actual previous values, never go negative, and stay per training.
click('score-0-3'); click('score-1-2'); click('undo');
assert.equal(output('points-0'), '3');
assert.equal(output('points-1'), '0');
click('score-1--1');
assert.equal(output('points-1'), '0');
change('name-0', '<img src=x onerror=alert(1)>');
reopen('two'); assert.equal(output('points-0'), '0');
reopen(); assert.equal(output('points-0'), '3');
assert.equal(w.document.querySelector('img'), null);

// Countdown catches up in the background, clamps at zero and stops.
change('mode', 'countdown'); change('duration', '60');
click('toggle'); now += 25000; reopen();
assert.equal(output('time'), '00:35');
now += 40000; reopen();
assert.equal(output('time'), '00:00');
assert.equal(w.document.querySelector('[data-tt="toggle"]').disabled, true);

// Two 30s work rounds with 10s rest in between: total 70s, no final rest.
change('mode', 'interval');
change('work', '30'); change('rest', '10'); change('rounds', '2');
click('toggle'); now += 30000; reopen();
assert.equal(output('time'), '00:10');
assert.match(output('phase'), /Pause/);
now += 10000; reopen(); assert.match(output('phase'), /2.*2/);
now += 30000; reopen(); assert.match(output('phase'), /Beendet/);

// Shotclock reset is independent of the main timer and scores.
click('shot-enabled'); click('shot-toggle'); now += 10000; reopen();
assert.equal(output('shot-time'), '14');
click('shot-14'); now += 5000; reopen();
assert.equal(output('shot-time'), '9');
assert.equal(output('points-0'), '3');
click('shot-toggle'); now += 20000; reopen();
assert.equal(output('shot-time'), '9');

// Failed localStorage writes must not replace newer in-memory points with stale disk data.
reopen('quota'); click('score-0-1');
const originalSetItem = w.Storage.prototype.setItem;
w.Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
click('score-0-2');
assert.match(output('notice'), /nicht möglich/);
reopen('quota');
assert.equal(output('points-0'), '3');
w.Storage.prototype.setItem = originalSetItem;

// A zero-rest interval advances immediately, signals each boundary once, and never replays on reopen.
let signals = 0;
w.BT.audio = { ensureContext() {}, levelBeep() { signals++; } };
Object.defineProperty(w.document, 'visibilityState', { value: 'visible', configurable: true });
reopen('alarm'); change('mode', 'interval');
change('work', '1'); change('rest', '0'); change('rounds', '2');
click('toggle'); now += 1000; pulse();
assert.match(output('phase'), /2.*2/);
assert.equal(signals, 1);
pulse(); assert.equal(signals, 1);
now += 1000; pulse();
assert.match(output('phase'), /Beendet/);
assert.equal(signals, 2);
reopen('alarm'); pulse(); assert.equal(signals, 2);

// Malformed persisted values do not create NaN or an unbounded running timer.
const spoken = [];
w.BT.audio.speak = message => spoken.push(message);
signals = 0;
reopen('game'); change('mode', 'game'); change('duration', '120');
assert.equal(output('time'), '02:00');
click('toggle'); now += 14000; pulse();
assert.equal(output('shot-time'), '10');
assert.deepEqual(spoken, ['Noch zehn Sekunden']);
pulse(); assert.equal(spoken.length, 1);
click('toggle'); now += 5000; pulse();
assert.equal(output('time'), '01:46');
assert.equal(output('shot-time'), '10');
click('toggle'); now += 10000; pulse();
assert.equal(output('shot-time'), '24');
assert.equal(output('time'), '01:36');
assert.equal(signals, 1);
click('shot-14'); now += 4000; pulse();
assert.equal(spoken.length, 2);
now += 10000; pulse();
assert.equal(output('shot-time'), '24');
assert.equal(signals, 2);
// Catch up 50 seconds without replaying missed sounds; remain aligned with wall time.
api.close(); now += 50000; api.open('game');
assert.equal(output('shot-time'), '22');
assert.equal(output('time'), '00:32');
assert.equal(signals, 2);
assert.equal(spoken.length, 2);
now += 40000; pulse();
assert.equal(output('time'), '00:00');
assert.equal(output('shot-time'), '14'); // stop at game end, not 8 seconds later
now += 20000; pulse();
assert.equal(output('shot-time'), '14');
click('reset');
assert.equal(output('shot-time'), '24');
assert.equal(output('time'), '02:00');

// Standalone shotclock also announces ten, but must NOT automatically restart.
reopen('standalone'); click('shot-enabled'); click('shot-toggle');
now += 14000; pulse(); assert.equal(spoken.length, 3);
now += 10000; pulse(); assert.equal(output('shot-time'), '0');
now += 5000; pulse(); assert.equal(output('shot-time'), '0');

api.close();
w.localStorage.setItem('courthub-training-timer-v1:bad', '{"mode":"interval","clock":{"elapsed":-4,"since":"bad"},"config":{"work":0},"scores":[-2,null]}');
api.open('bad');
assert.doesNotMatch(w.document.body.textContent, /NaN|undefined/);
assert.equal(output('points-0'), '0');
api.close();
assert.equal(w.document.querySelector('dialog'), null);
assert.equal(w.document.documentElement.classList.contains('training-timer-open'), false);
assert.equal(callbacks.size, 0, 'Geschlossene Ansicht muss ihren Aktualisierungstimer freigeben');
w.close();
console.log('Training timer: pause, background, persistence, intervals, shotclock, scores and malformed data passed.');
