import { basketballExpertPrompt, BASKETBALL_KNOWLEDGE_VERSION } from './basketball-knowledge.js';

export const AI_MODEL_ID = 'gemini-3.8-flash';
export const AI_CONTRACT_VERSION = 2;
export { BASKETBALL_KNOWLEDGE_VERSION };

export class AIError extends Error {
  constructor(code, message, { status = 502, retryable = false, providerStatus = null } = {}) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.providerStatus = Number.isInteger(providerStatus) ? providerStatus : null;
  }
}

const STRING = { type: 'string' };
const NUMBER = { type: 'number' };
const INTEGER = { type: 'integer' };
const INTENSITY = { type: 'string', enum: ['low', 'medium', 'high'] };
const DRILL_SCHEMA = {
  type: 'object',
  required: ['name', 'minutes', 'description'],
  properties: {
    name: STRING,
    minutes: INTEGER,
    intensity: INTENSITY,
    description: STRING
  }
};
const TRAINING_SCHEMA = {
  type: 'object',
  required: ['date', 'summary', 'freethrows', 'shots', 'drills'],
  properties: {
    weekday: STRING,
    date: STRING,
    summary: STRING,
    freethrows: {
      type: 'object',
      required: ['attempted'],
      properties: { attempted: INTEGER }
    },
    shots: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'attempted'],
        properties: { category: STRING, attempted: INTEGER }
      }
    },
    drills: { type: 'array', items: DRILL_SCHEMA },
    fridayVariants: {
      type: 'object',
      required: ['over8', 'eightOrLess'],
      properties: {
        over8: { type: 'array', items: DRILL_SCHEMA },
        eightOrLess: { type: 'array', items: DRILL_SCHEMA }
      }
    }
  }
};
const SEASON_DRILL_SCHEMA = {
  ...DRILL_SCHEMA,
  required: ['name', 'minutes', 'intensity', 'description']
};
const FRIDAY_STATION_SCHEMA = {
  type: 'object',
  required: ['title', 'category', 'description'],
  properties: {
    title: STRING,
    category: STRING,
    description: STRING
  }
};
const EVIDENCE_BASIS_SCHEMA = {
  type: 'object',
  required: ['observedTrends', 'loadConsiderations', 'planningDecision'],
  properties: {
    observedTrends: { type: 'array', minItems: 1, maxItems: 4, items: STRING },
    loadConsiderations: { type: 'array', minItems: 1, maxItems: 4, items: STRING },
    planningDecision: STRING
  }
};
const SEASON_TRAINING_SCHEMA = {
  ...TRAINING_SCHEMA,
  required: [...TRAINING_SCHEMA.required, 'evidenceBasis'],
  properties: {
    ...TRAINING_SCHEMA.properties,
    drills: { type: 'array', items: SEASON_DRILL_SCHEMA },
    evidenceBasis: EVIDENCE_BASIS_SCHEMA,
    fridayVariants: {
      type: 'object',
      required: ['over8', 'eightOrLess'],
      properties: {
        over8: { type: 'array', items: SEASON_DRILL_SCHEMA },
        eightOrLess: { type: 'array', items: SEASON_DRILL_SCHEMA }
      }
    },
    stationTraining: {
      type: 'object',
      required: ['rationale', 'stations'],
      properties: {
        rationale: STRING,
        stations: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: FRIDAY_STATION_SCHEMA
        }
      }
    }
  }
};

export const PARSE_PLAN_SCHEMA = {
  type: 'object',
  required: ['phase', 'trainings'],
  properties: {
    phase: {
      type: 'object',
      required: ['name', 'focus', 'start', 'end', 'goals'],
      properties: {
        name: STRING,
        focus: STRING,
        start: STRING,
        end: STRING,
        goals: { type: 'array', items: STRING }
      }
    },
    trainings: { type: 'array', items: TRAINING_SCHEMA }
  }
};

export const SUMMARY_SCHEMA = {
  type: 'object',
  required: ['sentences'],
  properties: {
    sentences: {
      type: 'array',
      minItems: 3,
      maxItems: 4,
      items: {
        type: 'object',
        required: ['text', 'factIds'],
        properties: {
          text: STRING,
          factIds: { type: 'array', items: STRING }
        }
      }
    }
  }
};

export const TACTIC_SCHEMA = {
  type: 'object',
  required: ['explanation', 'coachingPoints'],
  properties: {
    explanation: STRING,
    coachingPoints: { type: 'array', minItems: 2, maxItems: 4, items: STRING }
  }
};

export const SEASON_SCHEMA = {
  type: 'object',
  required: ['trainings'],
  properties: { trainings: { type: 'array', items: SEASON_TRAINING_SCHEMA } }
};

const PROMPTS = {
  parsePlan: basketballExpertPrompt(`Du überträgst einen Basketball-Trainingsplan aus einem PDF in strukturierte CourtHub-Daten. Nutze ausschließlich Inhalte des Dokuments und die mitgesendeten tatsächlichen Trainingstage, Uhrzeit und Dauer. Fachwissen darf nur Begriffe korrekt zuordnen, aber keine fehlenden Inhalte ergänzen. Erfinde keine Termine. Gib nur das angeforderte JSON aus.`),
  summarizeTraining: basketballExpertPrompt(`Du wählst aus verifizierten Basketball-Trainingsfakten drei bis vier aussagekräftige Sätze aus. Jeder Satz muss genau den Text eines referenzierten Fakts wortgetreu kopieren und dessen Fakten-ID nennen. Formuliere nichts um und ergänze trotz deines Fachwissens keine Namen, Zahlen, Ursachen oder Bewertungen. Nenne insgesamt höchstens zwei Spieler. Gib nur das angeforderte JSON aus.`),
  explainTactic: basketballExpertPrompt(`Du erklärst einen strukturierten Basketball-Spielzug auf Deutsch. Beschreibe Ziel, Spacing, Timing, Phasen, tatsächlich beteiligte Rollen, Defense-Read und Offense-Antwort. Prüfe besonders Screenwinkel, Passfenster, Anschlussaktionen und die Reaktion auf Hilfe oder Switch. Erfinde keine Rollen oder Aktionen. Liefere zwei bis vier konkrete Coaching-Punkte und nur das angeforderte JSON.`),
  planSeason: basketballExpertPrompt(`Du planst einen Wochenblock einer Basketball-Saison. Analysiere vor der Planung zwingend performanceContext mit den vergangenen Spielen, den abgeschlossenen Trainings und der Spielerbelastung. Wiederkehrende Muster aus mehreren Einträgen wiegen stärker als ein einzelner Ausreißer; fehlende oder unvollständige Werte dürfen nicht als Schwäche interpretiert werden. Liefere in evidenceBasis die tatsächlich verwendeten Trends, Belastungsaspekte und die daraus abgeleitete Planungsentscheidung. Liefere danach für jeden mitgesendeten Slot genau ein Training mit identischem Datum. Ändere keine Termine. Die Drill-Minuten entsprechen der durationMinutes des jeweiligen Slots; fehlt sie, gilt die allgemeine Trainingsdauer. Jeder Drill braucht einen klaren Aufbau, Ablauf, basketballspezifische Coaching-Punkte und eine sinnvolle Belastungsstufe. Plane eine erkennbare Progression von Technik über Entscheidungen zum Spieltransfer.

Behandle coachInput.problems nur als diagnostischen Hinweis, nicht als Hauptauftrag. Inhalte zur Behebung dieser Beobachtung dürfen höchstens 25 Prozent einer Einheit ausmachen. Erhalte immer die langfristigen Mannschaftsprinzipien, den aktuellen Schwerpunkt, technische Grundlagen und eine ausgewogene Belastung. Verteile ein genanntes Problem nicht künstlich auf Warm-up, Hauptteil und Abschluss. Sicherheits-, Schmerz- und Belastungshinweise aus coachInput.roster bleiben davon unberührt und haben Vorrang.

Für einen Slot mit fridayStationMode=true erstellst du jedes Mal ein neues individuelles Stationstraining passend zur aktuellen Spielwoche und zum folgenden Wochenendspiel. Nutze die Historie, um Schwerpunkte und Stationskombinationen nicht einfach zu wiederholen. Das Training dauert genau 105 Minuten und besteht in dieser Reihenfolge aus: 10 Minuten Readiness-Check, 10 Minuten individuelle Aktivierung, fünf unterschiedliche Einzelstationen zu je 15 Minuten und 10 Minuten Cooldown mit Session-RPE. Liefere dazu stationTraining mit genau fünf Stationen. Höchstens eine der fünf Stationen darf unmittelbar aus coachInput.problems abgeleitet sein; die vier übrigen Stationen müssen andere Entwicklungsbereiche abdecken. Keine Teamtaktik, keine Spielformen und kein 1-gegen-1 bis 5-gegen-5. Alle Inhalte müssen allein oder mit einfachen Zuspielern ausführbar sein. Plane niedrige Vor-Spiel-Belastung; die individuelle Ampel für Tagesform, Schmerzen, Spielminuten und Wochenbelastung skaliert das Volumen später pro Spieler. fridayVariants wird für diesen Modus nicht benötigt.

Für sonstige Freitage werden weiterhin vollständige fridayVariants für mehr als acht sowie höchstens acht Spieler benötigt. Gib nur das angeforderte JSON aus.`)
};

function fail(message = 'Die KI-Antwort entspricht nicht dem erwarteten Format.') {
  throw new AIError('AI_INVALID_RESPONSE', message);
}

function parseJson(text) {
  try {
    return JSON.parse(String(text));
  } catch {
    fail('Die KI-Antwort war nicht vollständig lesbar.');
  }
}

function string(value, max, label) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > max) fail(`${label} ist ungültig.`);
  return normalized;
}

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) fail(`${label} ist ungültig.`);
  return value;
}

function date(value, label) {
  const normalized = String(value || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  const parsed = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!match || parsed.getUTCFullYear() !== Number(match[1]) || parsed.getUTCMonth() !== Number(match[2]) - 1 || parsed.getUTCDate() !== Number(match[3])) {
    fail(`${label} ist ungültig.`);
  }
  return normalized;
}

const WEEKDAYS = {
  sun: 0, sunday: 0, sonntag: 0,
  mon: 1, monday: 1, montag: 1,
  tue: 2, tuesday: 2, dienstag: 2,
  wed: 3, wednesday: 3, mittwoch: 3,
  thu: 4, thursday: 4, donnerstag: 4,
  fri: 5, friday: 5, freitag: 5,
  sat: 6, saturday: 6, samstag: 6
};

function weekdayNumber(value) {
  return WEEKDAYS[String(value || '').trim().toLowerCase()];
}

function validateDrills(input, { requireIntensity = false, durationMinutes = null } = {}) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30) fail('Die Drillliste ist ungültig.');
  const drills = input.map((drill) => {
    if (!drill || typeof drill !== 'object') fail('Ein Drill ist ungültig.');
    const normalized = {
      name: string(drill.name, 120, 'Drillname'),
      minutes: integer(drill.minutes, 1, 240, 'Drilldauer'),
      description: string(drill.description, 800, 'Drillbeschreibung')
    };
    if (requireIntensity) {
      if (!['low', 'medium', 'high'].includes(drill.intensity)) fail('Drillintensität ist ungültig.');
      normalized.intensity = drill.intensity;
    } else if (['low', 'medium', 'high'].includes(drill.intensity)) {
      normalized.intensity = drill.intensity;
    }
    return normalized;
  });
  if (durationMinutes !== null && drills.reduce((sum, drill) => sum + drill.minutes, 0) !== durationMinutes) {
    fail('Die Drill-Minuten entsprechen nicht der Trainingsdauer.');
  }
  return drills;
}

function validateShots(input) {
  if (!Array.isArray(input) || input.length > 30) fail('Die Wurfliste ist ungültig.');
  return input.map((shot) => ({
    category: string(shot?.category, 100, 'Wurfkategorie'),
    attempted: integer(shot?.attempted, 0, 1000, 'Wurfversuche')
  }));
}

function validateFridayStations(input) {
  if (!input || typeof input !== 'object') fail('KI-Stationstraining fehlt.');
  if (!Array.isArray(input.stations) || input.stations.length !== 5) fail('Das KI-Stationstraining benötigt genau fünf Stationen.');
  return {
    rationale: string(input.rationale, 500, 'Begründung des Stationstrainings'),
    stations: input.stations.map((station) => ({
      title: string(station?.title, 120, 'Stationstitel'),
      category: string(station?.category, 80, 'Stationskategorie'),
      description: string(station?.description, 800, 'Stationsbeschreibung')
    }))
  };
}

function validateFridayStationDrills(drills) {
  const minutes = drills.map((drill) => drill.minutes);
  const expected = [10, 10, 15, 15, 15, 15, 15, 10];
  if (minutes.length !== expected.length || minutes.some((value, index) => value !== expected[index])) {
    fail('Das KI-Stationstraining benötigt 10 + 10 + fünfmal 15 + 10 Minuten.');
  }
}

function validateEvidenceBasis(input) {
  const list = (value, label) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 4) fail(`${label} ist ungültig.`);
    return value.map(item => string(item, 300, label));
  };
  if (!input || typeof input !== 'object') fail('Die KI-Planungsgrundlage fehlt.');
  return {
    observedTrends: list(input.observedTrends, 'Beobachteter Trend'),
    loadConsiderations: list(input.loadConsiderations, 'Belastungsaspekt'),
    planningDecision: string(input.planningDecision, 600, 'Planungsentscheidung')
  };
}

function normalizeTraining(input, { durationMinutes = null, requireIntensity = false, friday = false, fridayStationMode = false } = {}) {
  if (!input || typeof input !== 'object') fail('Ein Training ist ungültig.');
  const training = {
    date: date(input.date, 'Trainingsdatum'),
    summary: string(input.summary, 240, 'Trainingsschwerpunkt'),
    freethrows: { attempted: integer(input.freethrows?.attempted, 0, 1000, 'Freiwurfversuche') },
    shots: validateShots(input.shots),
    drills: validateDrills(input.drills, { requireIntensity, durationMinutes })
  };
  if (input.evidenceBasis) training.evidenceBasis = validateEvidenceBasis(input.evidenceBasis);
  if (input.weekday) training.weekday = string(input.weekday, 20, 'Wochentag');
  if (fridayStationMode) {
    if (durationMinutes !== 105) fail('Das KI-Stationstraining muss 105 Minuten dauern.');
    validateFridayStationDrills(training.drills);
    training.stationTraining = validateFridayStations(input.stationTraining);
  } else if (friday) {
    if (!input.fridayVariants || typeof input.fridayVariants !== 'object') fail('Freitagsvarianten fehlen.');
    training.fridayVariants = {
      over8: validateDrills(input.fridayVariants.over8, { requireIntensity, durationMinutes }),
      eightOrLess: validateDrills(input.fridayVariants.eightOrLess, { requireIntensity, durationMinutes })
    };
  }
  return training;
}

function structured(parts, responseSchema, thinkingLevel, timeoutMs, parse) {
  return {
    parts,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      thinkingConfig: { thinkingLevel }
    },
    timeoutMs,
    parse
  };
}

function buildParsePlan(payload) {
  const fileBase64 = String(payload.fileBase64 || '');
  if (!fileBase64 || fileBase64.length > 4_000_000) {
    throw new AIError('AI_INPUT_INVALID', 'PDF fehlt oder ist größer als 3 MB.', { status: 413 });
  }
  const mimeType = String(payload.mimeType || 'application/pdf');
  if (mimeType !== 'application/pdf') throw new AIError('AI_INPUT_INVALID', 'Nur PDF-Dateien werden unterstützt.', { status: 400 });
  const schedule = payload.schedule || {};
  const days = Array.isArray(schedule.days) ? schedule.days.map((day) => String(day)).filter(Boolean) : [];
  const time = /^\d{2}:\d{2}$/.test(String(schedule.time || '')) ? String(schedule.time) : '';
  const durationMinutes = Number(schedule.durationMinutes);
  if (!days.length || !time || !Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) {
    throw new AIError('AI_INPUT_INVALID', 'Die tatsächlichen Trainingseinstellungen fehlen.', { status: 400 });
  }
  const context = { days, time, durationMinutes };
  return structured([
    { inlineData: { mimeType, data: fileBase64 } },
    { text: `${PROMPTS.parsePlan}\n\nTrainingseinstellungen:\n${JSON.stringify(context)}` }
  ], PARSE_PLAN_SCHEMA, 'low', 48_000, (text) => {
    const value = parseJson(text);
    if (!value?.phase || !Array.isArray(value.trainings) || value.trainings.length > 200) fail();
    const phase = {
      name: string(value.phase.name, 120, 'Phasenname'),
      focus: string(value.phase.focus, 300, 'Phasenfokus'),
      start: date(value.phase.start, 'Phasenstart'),
      end: date(value.phase.end, 'Phasenende'),
      goals: Array.isArray(value.phase.goals) ? value.phase.goals.map((goal) => string(goal, 200, 'Phasenziel')).slice(0, 20) : fail('Phasenziele fehlen.')
    };
    if (phase.start > phase.end) fail('Der Phasenzeitraum ist ungültig.');
    const trainings = value.trainings.map((training) => normalizeTraining(training));
    if (new Set(trainings.map((training) => training.date)).size !== trainings.length) fail('Trainingstermine sind doppelt.');
    const allowedDays = new Set(days.map(weekdayNumber).filter((day) => day !== undefined));
    for (const training of trainings) {
      const actualDay = new Date(`${training.date}T12:00:00Z`).getUTCDay();
      if (training.date < phase.start || training.date > phase.end) fail('Ein Training liegt außerhalb der Phase.');
      if (allowedDays.size && !allowedDays.has(actualDay)) fail('Ein Training liegt nicht auf einem tatsächlichen Trainingstag.');
      if (training.weekday && weekdayNumber(training.weekday) !== actualDay) fail('Wochentag und Trainingsdatum stimmen nicht überein.');
    }
    return { phase, trainings };
  });
}

function normalizedNumber(value) {
  return String(value).replace(',', '.').replace(/\.0+$/, '');
}

function buildSummary(payload) {
  const facts = Array.isArray(payload.facts) ? payload.facts : [];
  if (!facts.length || facts.length > 100) throw new AIError('AI_INPUT_INVALID', 'Für die Zusammenfassung fehlen gültige Fakten.', { status: 400 });
  const byId = new Map();
  for (const fact of facts) {
    const id = string(fact?.id, 80, 'Fakten-ID');
    if (byId.has(id)) throw new AIError('AI_INPUT_INVALID', 'Fakten-IDs müssen eindeutig sein.', { status: 400 });
    byId.set(id, {
      id,
      text: string(fact.text, 500, 'Faktentext'),
      names: Array.isArray(fact.names) ? fact.names.map((name) => String(name).trim()).filter(Boolean) : [],
      numbers: Array.isArray(fact.numbers) ? fact.numbers.map(normalizedNumber) : []
    });
  }
  return structured([
    { text: `${PROMPTS.summarizeTraining}\n\nVerifizierte Fakten:\n${JSON.stringify([...byId.values()])}` }
  ], SUMMARY_SCHEMA, 'low', 30_000, (text) => {
    const value = parseJson(text);
    if (!Array.isArray(value?.sentences) || value.sentences.length < 3 || value.sentences.length > 4) fail('Die Zusammenfassung benötigt drei bis vier Sätze.');
    const usedNames = new Set();
    const sentences = value.sentences.map((sentence) => {
      const sentenceText = string(sentence?.text, 320, 'Zusammenfassungssatz');
      const factIds = Array.isArray(sentence?.factIds) ? [...new Set(sentence.factIds.map(String))] : [];
      if (!factIds.length || factIds.some((id) => !byId.has(id))) fail('Ein Satz verweist auf unbekannte Fakten.');
      const referenced = factIds.map((id) => byId.get(id));
      const allowedNames = new Set(referenced.flatMap((fact) => fact.names));
      if (!referenced.some((fact) => fact.text === sentenceText)) fail('Ein Satz wurde nicht wortgetreu aus den Fakten übernommen.');
      allowedNames.forEach((name) => usedNames.add(name));
      return { text: sentenceText, factIds };
    });
    if (usedNames.size > 2) fail('Die Zusammenfassung nennt mehr als zwei Spieler.');
    return { sentences, text: sentences.map((sentence) => sentence.text).join(' ') };
  });
}

function buildTactic(payload) {
  const tactic = payload.tactic;
  if (!tactic || typeof tactic !== 'object' || !Array.isArray(tactic.phases) || !tactic.phases.length) {
    throw new AIError('AI_INPUT_INVALID', 'Spielzugdaten fehlen.', { status: 400 });
  }
  const serialized = JSON.stringify(tactic);
  if (serialized.length > 100_000) throw new AIError('AI_INPUT_INVALID', 'Die Spielzugdaten sind zu umfangreich.', { status: 413 });
  return structured([
    { text: `${PROMPTS.explainTactic}\n\nSpielzug:\n${serialized}` }
  ], TACTIC_SCHEMA, 'low', 30_000, (text) => {
    const value = parseJson(text);
    if (!Array.isArray(value?.coachingPoints) || value.coachingPoints.length < 2 || value.coachingPoints.length > 4) fail('Coaching-Punkte fehlen.');
    return {
      explanation: string(value.explanation, 2400, 'Taktikerklärung'),
      coachingPoints: value.coachingPoints.map((point) => string(point, 240, 'Coaching-Punkt'))
    };
  });
}

function isFriday(slot) {
  const weekday = String(slot.weekday || '').toLowerCase();
  return weekday === 'fri' || weekday === 'friday' || weekday === 'freitag' || new Date(`${slot.date}T12:00:00Z`).getUTCDay() === 5;
}

function buildSeason(payload) {
  const data = payload.data || {};
  const slots = Array.isArray(data.slots) ? data.slots : [];
  if (slots.length !== 1) throw new AIError('AI_INPUT_INVALID', 'Für die Saisonplanung wird genau ein Trainingstermin pro Anfrage benötigt.', { status: 400 });
  const dates = slots.map((slot) => date(slot?.date, 'Trainingstermin'));
  if (new Set(dates).size !== dates.length) throw new AIError('AI_INPUT_INVALID', 'Trainingstermine müssen eindeutig sein.', { status: 400 });
  const durationMinutes = Number(data.durationMinutes);
  const expectedDuration = Number.isInteger(durationMinutes) && durationMinutes >= 30 && durationMinutes <= 240 ? durationMinutes : null;
  const serialized = JSON.stringify(data);
  if (serialized.length > 150_000) throw new AIError('AI_INPUT_INVALID', 'Die Saisonplanungsdaten sind zu umfangreich.', { status: 413 });
  return structured([
    { text: `${PROMPTS.planSeason}\n\nPlanungsdaten:\n${serialized}` }
  ], SEASON_SCHEMA, 'low', 48_000, (text) => {
    const value = parseJson(text);
    if (!Array.isArray(value?.trainings) || value.trainings.length !== slots.length) fail('Die KI-Antwort enthält nicht alle Trainingstermine.');
    const trainings = value.trainings.map((training) => {
      const slot = slots.find((entry) => entry.date === training?.date);
      if (!slot) fail('Die KI-Antwort enthält einen unbekannten Trainingstermin.');
      const slotDuration = Number(slot.durationMinutes);
      const trainingDuration = Number.isInteger(slotDuration) && slotDuration >= 30 && slotDuration <= 240 ? slotDuration : expectedDuration;
      if (!training?.evidenceBasis) fail('Die KI hat die vorherigen Leistungs- und Belastungswerte nicht ausgewertet.');
      return normalizeTraining(training, {
        durationMinutes: trainingDuration,
        requireIntensity: true,
        friday: isFriday(slot),
        fridayStationMode: slot.fridayStationMode === true
      });
    });
    if (new Set(trainings.map((training) => training.date)).size !== dates.length) fail('Die KI-Antwort enthält doppelte Trainingstermine.');
    return { trainings };
  });
}

const ACTIONS = {
  parsePlan: buildParsePlan,
  summarizeTraining: buildSummary,
  explainTactic: buildTactic,
  planSeason: buildSeason
};

export function buildAIRequest(action, payload = {}) {
  const build = ACTIONS[action];
  if (!build) throw new AIError('AI_INPUT_INVALID', 'Unbekannte KI-Aktion.', { status: 400 });
  return build(payload);
}
