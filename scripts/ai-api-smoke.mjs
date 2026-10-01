import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { AIError } from '../api/_lib/ai-contracts.js';
import { createAIHandler } from '../api/_lib/ai-handler.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(action, payload, method = 'POST') {
  return { method, body: { action, payload }, headers: {} };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

const summaryPayload = {
  facts: [{ id: 'team', text: 'Das Team trainierte konzentriert.', names: [], numbers: [] }]
};
const seasonPayload = {
  data: { slots: [{ date: '2026-10-06', weekday: 'tue' }] }
};

const limits = [];
let nextCount = 1;
const handler = createAIHandler({
  requireMembership: async () => ({ sub: 'user-1', organization_id: 'team-1' }),
  query: async (_sql, params) => {
    limits.push({ action: params[1], limit: params[2] });
    return { rows: [{ count: nextCount }] };
  },
  getApiKey: () => 'GEHEIM',
  generate: async ({ action, requestId }) => ({
    value: action === 'summarizeTraining'
      ? { text: 'Das Team trainierte konzentriert.' }
      : { trainings: [{ date: '2026-10-06' }] },
    model: 'gemini-3.8-flash',
    requestId,
    durationMs: 12
  })
});

const success = response();
await handler(request('summarizeTraining', summaryPayload), success);
assert(success.statusCode === 200, 'KI-Erfolg wird nicht als 200 ausgegeben');
assert(success.body.text === 'Das Team trainierte konzentriert.', 'Zusammenfassung fehlt in der Antwort');
assert(success.body.model === 'gemini-3.8-flash', 'Modell fehlt in der Antwort');
assert(success.body.requestId?.startsWith('ai_'), 'Request-ID fehlt in der Antwort');

const timeoutHandler = createAIHandler({
  requireMembership: async () => ({ sub: 'user-1' }),
  query: async () => ({ rows: [{ count: 1 }] }),
  getApiKey: () => 'GEHEIM',
  generate: async () => { throw new AIError('AI_TIMEOUT', 'Die KI-Anfrage hat zu lange gedauert.', { status: 504, retryable: true }); }
});
const timeout = response();
await timeoutHandler(request('summarizeTraining', summaryPayload), timeout);
assert(timeout.statusCode === 504, 'KI-Timeout wird nicht als 504 ausgegeben');
assert(timeout.body.code === 'AI_TIMEOUT' && timeout.body.retryable === true, 'Timeout-Vertrag fehlt');
assert(timeout.body.requestId?.startsWith('ai_'), 'Timeout enthält keine Request-ID');

nextCount = 61;
const rateLimited = response();
await handler(request('planSeason', seasonPayload), rateLimited);
assert(rateLimited.statusCode === 429, 'Rate-Limit wird nicht als 429 ausgegeben');
assert(rateLimited.body.code === 'AI_RATE_LIMIT' && rateLimited.body.retryable === true, 'Rate-Limit-Vertrag fehlt');
nextCount = 1;
const seasonLimit = limits.find((entry) => entry.action === 'planSeason')?.limit;
const summaryLimit = limits.find((entry) => entry.action === 'summarizeTraining')?.limit;
assert(seasonLimit === 60 && summaryLimit === 30, 'Aktionslimits sind falsch');

const missingKeyHandler = createAIHandler({
  requireMembership: async () => ({ sub: 'user-1' }),
  query: async () => { throw new Error('Rate-Limit darf ohne Schlüssel nicht laufen'); },
  generate: async () => { throw new Error('Gemini darf ohne Schlüssel nicht laufen'); },
  getApiKey: () => ''
});
const missingKey = response();
await missingKeyHandler(request('summarizeTraining', summaryPayload), missingKey);
assert(missingKey.statusCode === 503 && missingKey.body.code === 'AI_NOT_CONFIGURED', 'Fehlender Schlüssel wird nicht sicher gemeldet');

const methodResponse = response();
await handler(request('summarizeTraining', summaryPayload, 'GET'), methodResponse);
assert(methodResponse.statusCode === 405 && methodResponse.headers.Allow === 'POST', 'HTTP-Methode wird nicht begrenzt');

function browser() {
  const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
  dom.window.eval(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'));
  return dom.window;
}

const serverWindow = browser();
serverWindow.fetch = async () => ({
  ok: false,
  status: 429,
  json: async () => ({ error: 'Bitte später erneut versuchen.', code: 'AI_RATE_LIMIT', retryable: true, requestId: 'ai_server' })
});
try {
  await serverWindow.BT.api.ai('summarizeTraining', summaryPayload);
  throw new Error('Serverfehler wurde verschluckt');
} catch (error) {
  assert(error.message === 'Bitte später erneut versuchen.', 'Servertext ging verloren');
  assert(error.status === 429 && error.code === 'AI_RATE_LIMIT', 'Serverstatus oder Code ging verloren');
  assert(error.retryable === true && error.requestId === 'ai_server', 'Retry- oder Request-ID ging verloren');
}

const htmlWindow = browser();
htmlWindow.fetch = async () => ({ ok: false, status: 504, json: async () => { throw new Error('HTML'); } });
try {
  await htmlWindow.BT.api.ai('planSeason', seasonPayload);
  throw new Error('HTML-504 wurde verschluckt');
} catch (error) {
  assert(error.message === 'KI-Server hat die Anfrage vorzeitig beendet.', 'HTML-504 zeigt weiterhin die falsche Adressmeldung');
  assert(error.status === 504 && error.code === 'AI_SERVER_TIMEOUT', 'HTML-504 ist nicht klassifiziert');
}

const timeoutWindow = browser();
timeoutWindow.setTimeout = (fn) => { timeoutWindow.queueMicrotask(fn); return 17; };
timeoutWindow.clearTimeout = () => {};
timeoutWindow.fetch = async (_url, options) => new Promise((_resolve, reject) => {
  options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
});
try {
  await timeoutWindow.BT.api.ai('summarizeTraining', summaryPayload);
  throw new Error('Browser-Timeout wurde verschluckt');
} catch (error) {
  assert(error.message === 'KI-Anfrage hat zu lange gedauert.', 'Browser-Timeout hat die falsche Meldung');
  assert(error.status === 0 && error.code === 'CLIENT_TIMEOUT' && error.retryable === true, 'Browser-Timeout-Vertrag fehlt');
}

const bodyTimeoutWindow = browser();
let bodyTimer = null;
let bodyTimerCleared = false;
bodyTimeoutWindow.setTimeout = (fn) => { bodyTimer = fn; return 23; };
bodyTimeoutWindow.clearTimeout = () => { bodyTimerCleared = true; };
bodyTimeoutWindow.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => {
    if (bodyTimerCleared) throw new Error('Antwortkörper ist nicht mehr durch die Deadline geschützt');
    bodyTimer();
    throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  }
});
try {
  await bodyTimeoutWindow.BT.api.ai('summarizeTraining', summaryPayload);
  throw new Error('Browser-Body-Timeout wurde verschluckt');
} catch (error) {
  assert(error.code === 'CLIENT_TIMEOUT' && error.retryable === true, 'Antwortkörper wird nicht als Browser-Timeout klassifiziert');
}

console.log('CourtHub KI-API: Auth, Limits, Fehler und Browser-Timeout erfolgreich.');
