import { AI_CONTRACT_VERSION, AI_MODEL_ID, AIError, BASKETBALL_KNOWLEDGE_VERSION, buildAIRequest } from '../api/_lib/ai-contracts.js';
import { generateWithGemini } from '../api/_lib/gemini-client.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectAIError(run, code, message) {
  try {
    await run();
  } catch (error) {
    assert(error instanceof AIError, `${message}: kein AIError`);
    assert(error.code === code, `${message}: ${error.code} statt ${code}`);
    assert(!String(error.message).includes('GEHEIM'), `${message}: Rohdaten im Fehler`);
    return error;
  }
  throw new Error(`${message}: Anfrage blieb erfolgreich`);
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; }
  };
}

function candidate(text, finishReason = 'STOP') {
  return response(200, {
    candidates: [{ finishReason, content: { parts: [{ text }] } }]
  });
}

const validSeasonPayload = {
  data: {
    durationMinutes: 90,
    slots: [{ date: '2026-10-06', weekday: 'tue', intensity: 'high' }]
  }
};
const validSeasonResult = JSON.stringify({
  trainings: [{
    date: '2026-10-06',
    summary: 'Defense und Entscheidungen',
    evidenceBasis: {
      observedTrends: ['Wiederkehrende Rotationsprobleme aus zwei Spielen'],
      loadConsiderations: ['Dienstag ist der Hauptbelastungstag'],
      planningDecision: 'Rotationen werden spielnah trainiert, ohne andere Mannschaftsprinzipien zu verdrängen.'
    },
    freethrows: { attempted: 20 },
    shots: [{ category: 'Abschluss am Ring', attempted: 20 }],
    drills: [{ name: 'Shell Drill', minutes: 90, intensity: 'high', description: 'Kommunikation und Rotation' }]
  }]
});

assert(AI_MODEL_ID === 'gemini-3.8-flash', 'Falsches Gemini-Modell');
assert(AI_CONTRACT_VERSION === 5, 'KI-Vertrag wurde für den deterministischen Freitagsrahmen nicht angehoben');
assert(BASKETBALL_KNOWLEDGE_VERSION === '2026.10.1', 'Basketball-Fachstandard ist nicht versioniert');
const season = buildAIRequest('planSeason', validSeasonPayload);
const promptText = request => request.parts.map(part => part.text || '').join('\n');
assert(promptText(season).includes('COURTHUB BASKETBALL-KI') && promptText(season).includes('Trainingslehre'), 'Saisonplanung nutzt den Basketball-Fachstandard nicht');
assert(season.generationConfig.responseMimeType === 'application/json', 'JSON-MIME fehlt');
assert(season.generationConfig.thinkingConfig.thinkingLevel === 'low', 'Saisonplanung nutzt nicht den latenzarmen Thinking-Level');
assert(season.generationConfig.responseSchema.type === 'object', 'Saison-Schema fehlt');
assert(season.generationConfig.responseSchema.properties.trainings.items.properties.drills.items.required.includes('intensity'), 'Saison-Schema verlangt die validierte Drillintensität nicht');
assert(season.generationConfig.responseSchema.properties.trainings.items.properties.stationTraining.properties.stations.minItems === 5, 'Saison-Schema verlangt nicht genau fünf KI-Stationen');
assert(season.parts[0].text.includes('höchstens 25 Prozent') && season.parts[0].text.includes('Höchstens eine der fünf Stationen'), 'KI-Prompt begrenzt die Problemgewichtung nicht');
assert(season.parts[0].text.includes('summary als prägnanten Trainingsschwerpunkt mit höchstens 180 Zeichen'), 'KI-Prompt begrenzt den Trainingsschwerpunkt nicht');
assert(season.timeoutMs === 48_000, 'Saison-Timeout ist nicht begrenzt');

const verboseSeasonResult = JSON.parse(validSeasonResult);
verboseSeasonResult.trainings[0].summary = 'Ausführlicher Trainingsschwerpunkt '.repeat(12);
verboseSeasonResult.trainings[0].drills[0].description = 'Ausführliche Drillbeschreibung '.repeat(40);
const boundedSeasonResult = season.parse(JSON.stringify(verboseSeasonResult));
assert(boundedSeasonResult.trainings[0].summary.length === 240, 'Zu langer KI-Trainingsschwerpunkt wird nicht sicher gekürzt');
assert(boundedSeasonResult.trainings[0].drills[0].description.length === 800, 'Zu lange KI-Drillbeschreibung wird nicht sicher gekürzt');

const fridayRequest = buildAIRequest('planSeason', { data: {
  durationMinutes: 90,
  slots: [{
    date: '2026-10-09', weekday: 'fri', durationMinutes: 105, fridayStationMode: true,
    weekendGame: { date: '2026-10-10', home: 'TSV Lindau', away: 'Testgegner' }
  }]
} });
const fridayDrills = [10, 10, 15, 15, 15, 15, 15, 10].map((minutes, index) => ({
  name: `KI Block ${index + 1}`, minutes, intensity: 'low', description: `Individueller Inhalt ${index + 1}`
}));
const fridayResult = {
  trainings: [{
    date: '2026-10-09', summary: 'Frischer KI-Spielwochenplan',
    evidenceBasis: {
      observedTrends: ['Ballkontrolle blieb über mehrere Einheiten stabil'],
      loadConsiderations: ['Spiel folgt am nächsten Tag'],
      planningDecision: 'Individuelle Qualität bei niedriger Belastung sichern.'
    },
    freethrows: { attempted: 20 }, shots: [], drills: fridayDrills,
    stationTraining: {
      rationale: 'Neue Schwerpunkte passend zur Spielnähe und zur bisherigen Trainingshistorie.',
      stations: Array.from({ length: 5 }, (_, index) => ({
        title: `KI Station ${index + 1}`, category: `Kategorie ${index + 1}`, description: `Neue Einzelaufgabe ${index + 1}`
      }))
    }
  }]
};
assert(fridayRequest.parse(JSON.stringify(fridayResult)).trainings[0].stationTraining.stations[0].title === 'KI Station 1', 'KI-Stationen werden nicht validiert und übernommen');
const unevenFriday = structuredClone(fridayResult);
unevenFriday.trainings[0].drills[2].minutes = 14;
unevenFriday.trainings[0].drills[3].minutes = 16;
const normalizedFriday = fridayRequest.parse(JSON.stringify(unevenFriday));
assert(
  normalizedFriday.trainings[0].drills.map(drill => drill.minutes).join(',') === '10,10,15,15,15,15,15,10',
  'KI-Stationstraining wird nicht auf 10 + 10 + fünfmal 15 + 10 Minuten normalisiert'
);
const incompleteFridayDrills = structuredClone(fridayResult);
incompleteFridayDrills.trainings[0].drills = incompleteFridayDrills.trainings[0].drills.slice(0, 5);
const rebuiltFriday = fridayRequest.parse(JSON.stringify(incompleteFridayDrills));
assert(rebuiltFriday.trainings[0].drills.length === 8, 'Unvollständige KI-Drillliste wird nicht aus den fünf Stationen aufgebaut');
assert(rebuiltFriday.trainings[0].drills[2].name === 'KI Station 1', 'Erste KI-Station fehlt im verbindlichen Freitagsrahmen');
assert(rebuiltFriday.trainings[0].drills[7].name === 'Cooldown & Session-RPE', 'Cooldown fehlt im verbindlichen Freitagsrahmen');
await expectAIError(
  () => {
    const incomplete = structuredClone(fridayResult);
    incomplete.trainings[0].stationTraining.stations.pop();
    return Promise.resolve(fridayRequest.parse(JSON.stringify(incomplete)));
  },
  'AI_INVALID_RESPONSE',
  'Unvollständige Liste der fünf individuellen Stationen wurde akzeptiert'
);

const summary = buildAIRequest('summarizeTraining', {
  facts: [
    { id: 'team-ft', text: 'Das Team traf 71 % seiner Freiwürfe.', names: [], numbers: ['71'] },
    { id: 'player-max', text: 'Max traf 8 von 10 Würfen.', names: ['Max'], numbers: ['8', '10'] }
  ]
});
assert(promptText(summary).includes('COURTHUB BASKETBALL-KI') && promptText(summary).includes('keine Namen, Zahlen, Ursachen oder Bewertungen'), 'Zusammenfassung verliert Fachrolle oder Faktenbindung');
assert(summary.generationConfig.thinkingConfig.thinkingLevel === 'low', 'Zusammenfassungs-Thinking-Level falsch');
const summaryValue = summary.parse(JSON.stringify({ sentences: [
  { text: 'Das Team traf 71 % seiner Freiwürfe.', factIds: ['team-ft'] },
  { text: 'Max traf 8 von 10 Würfen.', factIds: ['player-max'] },
  { text: 'Das Team traf 71 % seiner Freiwürfe.', factIds: ['team-ft'] }
] }));
assert(summaryValue.text.includes('Max traf 8 von 10 Würfen.'), 'Gültige Zusammenfassung wurde nicht verbunden');

await expectAIError(
  () => Promise.resolve(summary.parse(JSON.stringify({ sentences: [
    { text: 'Max erzielte 99 %.', factIds: ['team-ft'] },
    { text: 'Wir trainieren weiter.', factIds: ['team-ft'] },
    { text: 'Das Team bleibt konzentriert.', factIds: ['team-ft'] }
  ] }))),
  'AI_INVALID_RESPONSE',
  'Erfundener Name oder Wert wurde akzeptiert'
);

await expectAIError(
  () => Promise.resolve(summary.parse(JSON.stringify({ sentences: [
    { text: 'LeBron erzielte 71 %.', factIds: ['team-ft'] },
    { text: 'Michael erzielte 71 %.', factIds: ['team-ft'] },
    { text: 'Dirk erzielte 71 %.', factIds: ['team-ft'] }
  ] }))),
  'AI_INVALID_RESPONSE',
  'Unbekannte Spielernamen wurden trotz erlaubter Zahl akzeptiert'
);

await expectAIError(
  () => Promise.resolve(summary.parse(JSON.stringify({ sentences: [
    { text: 'LeBron war heute besonders konzentriert.', factIds: ['team-ft'] },
    { text: 'Das Team traf 71 % seiner Freiwürfe.', factIds: ['team-ft'] },
    { text: 'Das Team traf 71 % seiner Freiwürfe.', factIds: ['team-ft'] }
  ] }))),
  'AI_INVALID_RESPONSE',
  'Unbekannter Spielername ohne Zahl wurde akzeptiert'
);

const threePlayersSummary = buildAIRequest('summarizeTraining', {
  facts: [
    { id: 'p1', text: 'Max verteidigte konzentriert.', names: ['Max'], numbers: [] },
    { id: 'p2', text: 'Alex reboundete sicher.', names: ['Alex'], numbers: [] },
    { id: 'p3', text: 'Sam traf gute Entscheidungen.', names: ['Sam'], numbers: [] }
  ]
});
await expectAIError(
  () => Promise.resolve(threePlayersSummary.parse(JSON.stringify({ sentences: [
    { text: 'Max verteidigte konzentriert.', factIds: ['p1'] },
    { text: 'Alex reboundete sicher.', factIds: ['p2'] },
    { text: 'Sam traf gute Entscheidungen.', factIds: ['p3'] }
  ] }))),
  'AI_INVALID_RESPONSE',
  'Mehr als zwei Spielernamen wurden akzeptiert'
);

const pdfRequest = buildAIRequest('parsePlan', {
  fileBase64: 'cGRm',
  mimeType: 'application/pdf',
  schedule: { days: ['tue', 'fri'], time: '20:15', durationMinutes: 90 }
});
assert(promptText(pdfRequest).includes('COURTHUB BASKETBALL-KI') && promptText(pdfRequest).includes('keine fehlenden Inhalte ergänzen'), 'PDF-Import nutzt den Fachstandard nicht sicher');
const validPdfPlan = {
  phase: { name: 'Defense', focus: 'Kommunikation', start: '2026-10-01', end: '2026-10-31', goals: ['Rotation'] },
  trainings: [{
    date: '2026-10-06', weekday: 'tue', summary: 'Shell Drill',
    freethrows: { attempted: 20 }, shots: [],
    drills: [{ name: 'Shell', minutes: 90, description: 'Rotieren' }]
  }]
};
assert(pdfRequest.parse(JSON.stringify(validPdfPlan)).trainings[0].date === '2026-10-06', 'Gültiger PDF-Termin wird abgelehnt');
for (const [label, mutate] of [
  ['unmöglicher Kalendertag', value => { value.trainings[0].date = '2026-02-30'; }],
  ['falscher Wochentag', value => { value.trainings[0].weekday = 'fri'; }],
  ['umgekehrter Phasenzeitraum', value => { value.phase.start = '2026-11-01'; value.phase.end = '2026-10-01'; }]
]) {
  await expectAIError(
    () => {
      const value = structuredClone(validPdfPlan);
      mutate(value);
      return Promise.resolve(pdfRequest.parse(JSON.stringify(value)));
    },
    'AI_INVALID_RESPONSE',
    `PDF-Validierung: ${label}`
  );
}

await expectAIError(
  () => Promise.resolve(buildAIRequest('planSeason', { data: { slots: [
    { date: '2026-10-06', weekday: 'tue' },
    { date: '2026-10-09', weekday: 'fri' }
  ] } })),
  'AI_INPUT_INVALID',
  'Mehrere Termine in einer Saisonanfrage wurden akzeptiert'
);

let now = 1_000;
let calls = 0;
let requestBody = null;
const success = await generateWithGemini({
  action: 'planSeason',
  payload: validSeasonPayload,
  apiKey: 'GEHEIM',
  requestId: 'ai_success',
  now: () => now,
  fetchImpl: async (url, options) => {
    calls += 1;
    requestBody = JSON.parse(options.body);
    now = 1_123;
    assert(url.endsWith('/gemini-3.8-flash:generateContent'), 'Falscher Gemini-Endpunkt');
    assert(options.headers['x-goog-api-key'] === 'GEHEIM', 'API-Schlüssel fehlt im Header');
    return candidate(validSeasonResult);
  }
});
assert(calls === 1, 'Erfolgreiche Anfrage wurde wiederholt');
assert(success.model === 'gemini-3.8-flash', 'Erfolg enthält falsches Modell');
assert(success.requestId === 'ai_success', 'Request-ID ging verloren');
assert(success.durationMs === 123, 'Dauer wurde nicht gemessen');
assert(success.value.trainings[0].date === '2026-10-06', 'Saisonantwort wurde nicht validiert');
assert(requestBody.generationConfig.responseSchema.type === 'object', 'Schema wurde nicht an Gemini übertragen');

const tacticRequest = buildAIRequest('explainTactic', { tactic: { title: 'Horns', phases: [{ number: 1, offense: [], defense: [], actions: [] }] } });
assert(promptText(tacticRequest).includes('COURTHUB BASKETBALL-KI') && promptText(tacticRequest).includes('Screenwinkel'), 'Taktikerklärung nutzt das Basketball-Fachwissen nicht');

const validText = await generateWithGemini({
  action: 'explainTactic',
  payload: { tactic: { title: 'Horns', phases: [{ number: 1, offense: [], defense: [], actions: [] }] } },
  apiKey: 'GEHEIM',
  requestId: 'ai_tactic',
  fetchImpl: async () => candidate(JSON.stringify({
    explanation: 'Der Spielzug öffnet die Mitte und schafft klare Passfenster.',
    coachingPoints: ['Abstände halten', 'Nach dem Pass schneiden']
  }))
});
assert(validText.value.coachingPoints.length === 2, 'Strukturierte Taktikerklärung fehlt');

for (const [label, reply, code] of [
  ['MAX_TOKENS', candidate('{"trainings": [', 'MAX_TOKENS'), 'AI_TRUNCATED_RESPONSE'],
  ['leer', response(200, { candidates: [] }), 'AI_EMPTY_RESPONSE'],
  ['ungültiges JSON', candidate('{GEHEIM'), 'AI_INVALID_RESPONSE'],
  ['Schemafehler', candidate('{"trainings":[]}'), 'AI_INVALID_RESPONSE']
]) {
  let errorAttempts = 0;
  await expectAIError(
    () => generateWithGemini({
      action: 'planSeason',
      payload: validSeasonPayload,
      apiKey: 'GEHEIM',
      requestId: `ai_${label}`,
      fetchImpl: async () => { errorAttempts += 1; return reply; }
    }),
    code,
    label
  );
  assert(errorAttempts === 1, `${label} wurde fälschlich wiederholt`);
}

let lateAttempts = 0;
const lateClock = [0, 29_000];
await expectAIError(
  () => generateWithGemini({
    action: 'summarizeTraining',
    payload: { facts: [{ id: 'f1', text: 'Das Team trainierte.', names: [], numbers: [] }] },
    apiKey: 'GEHEIM',
    requestId: 'ai_late_503',
    now: () => lateClock.shift() ?? 29_000,
    fetchImpl: async () => { lateAttempts += 1; return response(503, { error: { message: 'GEHEIM' } }); }
  }),
  'AI_PROVIDER',
  'Später Providerfehler'
);
assert(lateAttempts === 1, 'Später Providerfehler wurde trotz knapper Restzeit wiederholt');

for (const [status, code, retryable] of [
  [400, 'AI_PROVIDER_REQUEST', false],
  [401, 'AI_PROVIDER_AUTH', false],
  [403, 'AI_PROVIDER_AUTH', false],
  [404, 'AI_MODEL_UNAVAILABLE', false]
]) {
  const error = await expectAIError(
    () => generateWithGemini({
      action: 'planSeason',
      payload: validSeasonPayload,
      apiKey: 'GEHEIM',
      requestId: `ai_provider_${status}`,
      fetchImpl: async () => response(status, { error: { message: 'GEHEIM' } })
    }),
    code,
    `Providerstatus ${status}`
  );
  assert(error.providerStatus === status, `Providerstatus ${status} ging verloren`);
  assert(error.retryable === retryable, `Providerstatus ${status} hat falsche Wiederholbarkeit`);
}

for (const status of [429, 500, 503]) {
  let attempts = 0;
  const retried = await generateWithGemini({
    action: 'planSeason',
    payload: validSeasonPayload,
    apiKey: 'GEHEIM',
    requestId: `ai_retry_${status}`,
    now: () => 0,
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1 ? response(status, { error: { message: 'GEHEIM' } }) : candidate(validSeasonResult);
    }
  });
  assert(attempts === 2, `HTTP ${status} wurde nicht genau einmal wiederholt`);
  assert(retried.value.trainings.length === 1, `HTTP ${status} konnte sich nicht erholen`);
}

let timeoutCleared = false;
await expectAIError(
  () => generateWithGemini({
    action: 'summarizeTraining',
    payload: { facts: [{ id: 'f1', text: 'Das Team trainierte.', names: [], numbers: [] }] },
    apiKey: 'GEHEIM',
    requestId: 'ai_timeout',
    now: () => 0,
    setTimer: (fn) => { queueMicrotask(fn); return 7; },
    clearTimer: (id) => { timeoutCleared = id === 7; },
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted GEHEIM'), { name: 'AbortError' })));
    })
  }),
  'AI_TIMEOUT',
  'Provider-Timeout'
);
assert(timeoutCleared, 'Deadline-Timer wurde nicht entfernt');

let bodyDeadline;
await expectAIError(
  () => generateWithGemini({
    action: 'summarizeTraining',
    payload: { facts: [{ id: 'f1', text: 'Das Team trainierte.', names: [], numbers: [] }] },
    apiKey: 'GEHEIM',
    requestId: 'ai_body_timeout',
    now: () => 0,
    setTimer: (fn) => { bodyDeadline = fn; return 8; },
    clearTimer: () => {},
    fetchImpl: async (_url, options) => ({
      ok: true,
      status: 200,
      async json() {
        bodyDeadline();
        throw Object.assign(new Error('body aborted'), { name: 'AbortError', signal: options.signal });
      }
    })
  }),
  'AI_TIMEOUT',
  'Provider-Timeout beim Lesen des Antwortkörpers'
);

console.log('CourtHub KI-Gateway: Modell, Schema, Timeout und Fehlerverträge erfolgreich.');
