import { basketballExpertPrompt, BASKETBALL_KNOWLEDGE_VERSION } from './basketball-knowledge.js';

export const AI_MODEL_ID = 'gemini-3.8-flash';
export const AI_CONTRACT_VERSION = 6;
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

export const OPPONENT_SCREENSHOT_SCHEMA = {
  type: 'object',
  required: ['opponentName', 'games', 'players', 'warnings'],
  properties: {
    opponentName: STRING,
    games: {
      type: 'array',
      items: {
        type: 'object',
        required: ['home', 'away', 'sourceIndex'],
        properties: {
          date: STRING,
          home: STRING,
          away: STRING,
          homeScore: INTEGER,
          awayScore: INTEGER,
          sourceIndex: INTEGER,
          opponentTeamStats: {
            type: 'object',
            properties: {
              fouls: INTEGER,
              fieldGoalsMade: INTEGER,
              fieldGoalsAttempted: INTEGER,
              threeMade: INTEGER,
              threeAttempted: INTEGER,
              freeThrowsMade: INTEGER,
              freeThrowsAttempted: INTEGER,
              completeFouls: { type: 'boolean' },
              completeShots: { type: 'boolean' }
            }
          }
        }
      }
    },
    players: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'gameDate', 'sourceIndex'],
        properties: {
          name: STRING,
          gameDate: STRING,
          points: INTEGER,
          fouls: INTEGER,
          fieldGoalsMade: INTEGER,
          fieldGoalsAttempted: INTEGER,
          threeMade: INTEGER,
          threeAttempted: INTEGER,
          freeThrowsMade: INTEGER,
          freeThrowsAttempted: INTEGER,
          sourceIndex: INTEGER
        }
      }
    },
    warnings: { type: 'array', items: STRING }
  }
};

const PROMPTS = {
  parsePlan: basketballExpertPrompt(`Du überträgst einen Basketball-Trainingsplan aus einem PDF in strukturierte CourtHub-Daten. Nutze ausschließlich Inhalte des Dokuments und die mitgesendeten tatsächlichen Trainingstage, Uhrzeit und Dauer. Fachwissen darf nur Begriffe korrekt zuordnen, aber keine fehlenden Inhalte ergänzen. Erfinde keine Termine. Gib nur das angeforderte JSON aus.`),
  summarizeTraining: basketballExpertPrompt(`Du wählst aus verifizierten Basketball-Trainingsfakten drei bis vier aussagekräftige Sätze aus. Jeder Satz muss genau den Text eines referenzierten Fakts wortgetreu kopieren und dessen Fakten-ID nennen. Formuliere nichts um und ergänze trotz deines Fachwissens keine Namen, Zahlen, Ursachen oder Bewertungen. Nenne insgesamt höchstens zwei Spieler. Gib nur das angeforderte JSON aus.`),
  explainTactic: basketballExpertPrompt(`Du erklärst einen strukturierten Basketball-Spielzug auf Deutsch. Beschreibe Ziel, Spacing, Timing, Phasen, tatsächlich beteiligte Rollen, Defense-Read und Offense-Antwort. Prüfe besonders Screenwinkel, Passfenster, Anschlussaktionen und die Reaktion auf Hilfe oder Switch. Erfinde keine Rollen oder Aktionen. Liefere zwei bis vier konkrete Coaching-Punkte und nur das angeforderte JSON.`),
  parseOpponentScreenshots: basketballExpertPrompt(`Du extrahierst überprüfbare Basketball-Gegnerdaten aus einem oder mehreren Screenshots der DBB.Scores-App. Verwende ausschließlich klar sichtbare Angaben. Erfinde keine Namen, Daten, Ergebnisse, Fouls, Würfe oder Quoten und leite fehlende Einzelwerte nicht aus Summen ab. sourceIndex ist die nullbasierte Position des Bildes in der Anfrage. Erfasse ein Spiel nur, wenn beide Teams klar erkennbar sind; Ergebnisse nur, wenn beide Punktzahlen sichtbar sind. Das Datum wird als YYYY-MM-DD ausgegeben, andernfalls als leerer String. opponentTeamStats und players beziehen sich ausschließlich auf den als erwarteten Gegner genannten Verein, niemals auf den anderen Verein. Spielerwerte werden ausschließlich als einzelne Spielzeilen mit eindeutigem Spieltag ausgegeben; Saison-Gesamtsummen oder Durchschnittswerte werden nicht als Einzelspielwerte übernommen. Setze completeFouls beziehungsweise completeShots nur dann auf true, wenn die vollständigen Teamwerte dieses Spiels sichtbar sind. Weise in warnings auf unlesbare, abgeschnittene, mehrdeutige oder unvollständige Bereiche hin. Gib nur das angeforderte JSON aus.`),
  planSeason: basketballExpertPrompt(`Du planst einen Wochenblock einer Basketball-Saison. Analysiere vor der Planung zwingend performanceContext mit den vergangenen Spielen, den abgeschlossenen Trainings und der Spielerbelastung. Wiederkehrende Muster aus mehreren Einträgen wiegen stärker als ein einzelner Ausreißer; fehlende oder unvollständige Werte dürfen nicht als Schwäche interpretiert werden. Analysiere zusätzlich den opponentContext des Slots, sofern vorhanden. Verwende ausschließlich dort belegte Gegnerwerte und beachte Datenqualität, Stichprobengröße und Warnungen. Empfehle niemals eine nicht trainierte Verteidigung: erlaubt sind nur Mannverteidigung mit No-Middle, Zone 2-1-2 und Zone 3-2. Bei niedriger Datenqualität bleibt Mannverteidigung mit No-Middle die Basis. Gegnerbezogene Inhalte dürfen höchstens 25 Prozent einer normalen Einheit ausmachen. Liefere in evidenceBasis die tatsächlich verwendeten Trends, Belastungsaspekte und die daraus abgeleitete Planungsentscheidung. Liefere danach für jeden mitgesendeten Slot genau ein Training mit identischem Datum. Ändere keine Termine. Formuliere summary als prägnanten Trainingsschwerpunkt mit höchstens 180 Zeichen. Die Drill-Minuten entsprechen der durationMinutes des jeweiligen Slots; fehlt sie, gilt die allgemeine Trainingsdauer. Jeder Drill braucht einen klaren Aufbau, Ablauf, basketballspezifische Coaching-Punkte und eine sinnvolle Belastungsstufe. Plane eine erkennbare Progression von Technik über Entscheidungen zum Spieltransfer.

Behandle coachInput.problems nur als diagnostischen Hinweis, nicht als Hauptauftrag. Inhalte zur Behebung dieser Beobachtung dürfen höchstens 25 Prozent einer Einheit ausmachen. Erhalte immer die langfristigen Mannschaftsprinzipien, den aktuellen Schwerpunkt, technische Grundlagen und eine ausgewogene Belastung. Verteile ein genanntes Problem nicht künstlich auf Warm-up, Hauptteil und Abschluss. Sicherheits-, Schmerz- und Belastungshinweise aus coachInput.roster bleiben davon unberührt und haben Vorrang.

Für einen Slot mit fridayStationMode=true erstellst du jedes Mal ein neues individuelles Stationstraining passend zur aktuellen Spielwoche und zum folgenden Wochenendspiel. Nutze die Historie, um Schwerpunkte und Stationskombinationen nicht einfach zu wiederholen. Das Training dauert genau 105 Minuten und besteht in dieser Reihenfolge aus: 10 Minuten Readiness-Check, 10 Minuten individuelle Aktivierung, fünf unterschiedliche Einzelstationen zu je 15 Minuten und 10 Minuten Cooldown mit Session-RPE. Liefere dazu stationTraining mit genau fünf Stationen. drills soll ebenfalls genau diese acht Blöcke enthalten; CourtHub erzeugt die verbindliche Zeitstruktur zusätzlich selbst aus stationTraining. Höchstens eine der fünf Stationen darf unmittelbar aus coachInput.problems abgeleitet sein; die vier übrigen Stationen müssen andere Entwicklungsbereiche abdecken. Keine Teamtaktik, keine Spielformen und kein 1-gegen-1 bis 5-gegen-5. Alle Inhalte müssen allein oder mit einfachen Zuspielern ausführbar sein. Plane niedrige Vor-Spiel-Belastung; die individuelle Ampel für Tagesform, Schmerzen, Spielminuten und Wochenbelastung skaliert das Volumen später pro Spieler. fridayVariants wird für diesen Modus nicht benötigt.

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

function generatedString(value, max, label) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) fail(`${label} ist ungültig.`);
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max).trimEnd();
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

function fitDrillMinutes(drills, durationMinutes) {
  if (durationMinutes === null || drills.reduce((sum, drill) => sum + drill.minutes, 0) === durationMinutes) return drills;
  if (drills.length > durationMinutes) fail('Die Drillliste enthält zu viele Blöcke für die Trainingsdauer.');
  const remaining = durationMinutes - drills.length;
  const weightTotal = drills.reduce((sum, drill) => sum + drill.minutes, 0);
  const allocations = drills.map((drill, index) => {
    const exact = remaining * drill.minutes / weightTotal;
    return { index, minutes: 1 + Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let rest = durationMinutes - allocations.reduce((sum, item) => sum + item.minutes, 0);
  allocations.slice().sort((left, right) => right.fraction - left.fraction || left.index - right.index)
    .slice(0, rest)
    .forEach(item => { allocations[item.index].minutes += 1; });
  allocations.forEach(item => { drills[item.index].minutes = item.minutes; });
  return drills;
}

function validateDrills(input, { requireIntensity = false, durationMinutes = null } = {}) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30) fail('Die Drillliste ist ungültig.');
  const drills = input.map((drill) => {
    if (!drill || typeof drill !== 'object') fail('Ein Drill ist ungültig.');
    const normalized = {
      name: generatedString(drill.name, 120, 'Drillname'),
      minutes: integer(drill.minutes, 1, 240, 'Drilldauer'),
      description: generatedString(drill.description, 800, 'Drillbeschreibung')
    };
    if (requireIntensity) {
      if (!['low', 'medium', 'high'].includes(drill.intensity)) fail('Drillintensität ist ungültig.');
      normalized.intensity = drill.intensity;
    } else if (['low', 'medium', 'high'].includes(drill.intensity)) {
      normalized.intensity = drill.intensity;
    }
    return normalized;
  });
  fitDrillMinutes(drills, durationMinutes);
  return drills;
}

function validateShots(input) {
  if (!Array.isArray(input) || input.length > 30) fail('Die Wurfliste ist ungültig.');
  return input.map((shot) => ({
    category: generatedString(shot?.category, 100, 'Wurfkategorie'),
    attempted: integer(shot?.attempted, 0, 1000, 'Wurfversuche')
  }));
}

function validateFridayStations(input) {
  if (!input || typeof input !== 'object') fail('KI-Stationstraining fehlt.');
  if (!Array.isArray(input.stations) || input.stations.length !== 5) fail('Das KI-Stationstraining benötigt genau fünf Stationen.');
  return {
    rationale: generatedString(input.rationale, 500, 'Begründung des Stationstrainings'),
    stations: input.stations.map((station) => ({
      title: generatedString(station?.title, 120, 'Stationstitel'),
      category: generatedString(station?.category, 80, 'Stationskategorie'),
      description: generatedString(station?.description, 800, 'Stationsbeschreibung')
    }))
  };
}

function buildFridayStationDrills(stationTraining) {
  return [
    {
      name: 'Readiness-Check & Belastungsampel',
      minutes: 10,
      intensity: 'low',
      description: 'Tagesform (1–5), Schmerzen (0–10), Spielminuten und aktuelle Wochenbelastung erfassen; Ampel Grün, Gelb oder Rot festlegen.'
    },
    {
      name: 'Individuelle Aktivierung',
      minutes: 10,
      intensity: 'low',
      description: 'Mobilität, Ballgefühl und kontrollierte basketballspezifische Bewegungen passend zur persönlichen Belastungsampel.'
    },
    ...stationTraining.stations.map((station) => ({
      name: station.title,
      minutes: 15,
      intensity: 'low',
      description: generatedString(`${station.category}: ${station.description}`, 800, 'Stationsbeschreibung')
    })),
    {
      name: 'Cooldown & Session-RPE',
      minutes: 10,
      intensity: 'low',
      description: 'Belastung kontrolliert senken, Beschwerden erneut prüfen und die wahrgenommene Trainingsbelastung als Session-RPE dokumentieren.'
    }
  ];
}

function validateEvidenceBasis(input) {
  const list = (value, label) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 4) fail(`${label} ist ungültig.`);
    return value.map(item => generatedString(item, 300, label));
  };
  if (!input || typeof input !== 'object') fail('Die KI-Planungsgrundlage fehlt.');
  return {
    observedTrends: list(input.observedTrends, 'Beobachteter Trend'),
    loadConsiderations: list(input.loadConsiderations, 'Belastungsaspekt'),
    planningDecision: generatedString(input.planningDecision, 600, 'Planungsentscheidung')
  };
}

function normalizeTraining(input, { durationMinutes = null, requireIntensity = false, friday = false, fridayStationMode = false } = {}) {
  if (!input || typeof input !== 'object') fail('Ein Training ist ungültig.');
  const stationTraining = fridayStationMode ? validateFridayStations(input.stationTraining) : null;
  const training = {
    date: date(input.date, 'Trainingsdatum'),
    summary: generatedString(input.summary, 240, 'Trainingsschwerpunkt'),
    freethrows: { attempted: integer(input.freethrows?.attempted, 0, 1000, 'Freiwurfversuche') },
    shots: validateShots(input.shots),
    drills: fridayStationMode
      ? buildFridayStationDrills(stationTraining)
      : validateDrills(input.drills, { requireIntensity, durationMinutes })
  };
  if (input.evidenceBasis) training.evidenceBasis = validateEvidenceBasis(input.evidenceBasis);
  if (input.weekday) training.weekday = generatedString(input.weekday, 20, 'Wochentag');
  if (fridayStationMode) {
    if (durationMinutes !== 105) fail('Das KI-Stationstraining muss 105 Minuten dauern.');
    training.stationTraining = stationTraining;
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
      name: generatedString(value.phase.name, 120, 'Phasenname'),
      focus: generatedString(value.phase.focus, 300, 'Phasenfokus'),
      start: date(value.phase.start, 'Phasenstart'),
      end: date(value.phase.end, 'Phasenende'),
      goals: Array.isArray(value.phase.goals) ? value.phase.goals.map((goal) => generatedString(goal, 200, 'Phasenziel')).slice(0, 20) : fail('Phasenziele fehlen.')
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
      explanation: generatedString(value.explanation, 2400, 'Taktikerklärung'),
      coachingPoints: value.coachingPoints.map((point) => generatedString(point, 240, 'Coaching-Punkt'))
    };
  });
}

function optionalInteger(value, max, label) {
  if (value === undefined || value === null || value === '') return null;
  return integer(value, 0, max, label);
}

function buildOpponentScreenshots(payload) {
  const images = Array.isArray(payload.images) ? payload.images : [];
  if (!images.length || images.length > 6) {
    throw new AIError('AI_INPUT_INVALID', 'Bitte ein bis sechs DBB.Scores-Screenshots auswählen.', { status: 400 });
  }
  let totalBytes = 0;
  const parts = images.map((image, index) => {
    const mimeType = String(image?.mimeType || '');
    const data = String(image?.data || '');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || !data) {
      throw new AIError('AI_INPUT_INVALID', `Screenshot ${index + 1} hat kein unterstütztes Bildformat.`, { status: 400 });
    }
    totalBytes += Buffer.byteLength(data, 'base64');
    return { inlineData: { mimeType, data } };
  });
  if (totalBytes > 3_200_000) throw new AIError('AI_INPUT_INVALID', 'Die Screenshots sind zusammen zu groß. Bitte in zwei Durchgängen importieren.', { status: 413 });
  const expectedOpponent = String(payload.expectedOpponent || '').trim().slice(0, 100);
  parts.push({ text: `${PROMPTS.parseOpponentScreenshots}\n\nErwarteter Gegner: ${expectedOpponent || 'nicht vorgegeben'}\nBilder: ${images.length}` });
  return structured(parts, OPPONENT_SCREENSHOT_SCHEMA, 'low', 48_000, (text) => {
    const value = parseJson(text);
    if (!Array.isArray(value?.games) || !Array.isArray(value?.players) || !Array.isArray(value?.warnings)) fail('Die Screenshot-Auswertung ist unvollständig.');
    const sourceIndex = (input) => integer(input, 0, images.length - 1, 'Screenshot-Index');
    const cleanDate = (input) => input ? date(input, 'Spieldatum') : '';
    const warnings = value.warnings.map(item => generatedString(item, 300, 'Warnhinweis')).slice(0, 20);
    const games = value.games.slice(0, 30).map((game) => {
      const index = sourceIndex(game?.sourceIndex);
      let homeScore = optionalInteger(game?.homeScore, 300, 'Heimpunkte');
      let awayScore = optionalInteger(game?.awayScore, 300, 'Gastpunkte');
      if ((homeScore === null) !== (awayScore === null)) {
        homeScore = null;
        awayScore = null;
        warnings.push(`Screenshot ${index + 1}: Das Ergebnis ist unvollständig; beide Punktzahlen wurden zur Prüfung offengelassen.`);
      }
      const stats = game?.opponentTeamStats || {};
      return {
        date: cleanDate(game?.date),
        home: generatedString(game?.home, 100, 'Heimteam'),
        away: generatedString(game?.away, 100, 'Gastteam'),
        homeScore,
        awayScore,
        sourceIndex: index,
        opponentTeamStats: {
          fouls: optionalInteger(stats.fouls, 200, 'Teamfouls'),
          fieldGoalsMade: optionalInteger(stats.fieldGoalsMade, 200, 'Feldwurftreffer'),
          fieldGoalsAttempted: optionalInteger(stats.fieldGoalsAttempted, 300, 'Feldwurfversuche'),
          threeMade: optionalInteger(stats.threeMade, 100, 'Dreiertreffer'),
          threeAttempted: optionalInteger(stats.threeAttempted, 200, 'Dreierversuche'),
          freeThrowsMade: optionalInteger(stats.freeThrowsMade, 150, 'Freiwurftreffer'),
          freeThrowsAttempted: optionalInteger(stats.freeThrowsAttempted, 200, 'Freiwurfversuche'),
          completeFouls: stats.completeFouls === true,
          completeShots: stats.completeShots === true
        }
      };
    });
    const players = value.players.slice(0, 160).map((player) => ({
      name: generatedString(player?.name, 100, 'Spielername'),
      gameDate: cleanDate(player?.gameDate),
      points: optionalInteger(player?.points, 150, 'Spielerpunkte'),
      fouls: optionalInteger(player?.fouls, 10, 'Spielerfouls'),
      fieldGoalsMade: optionalInteger(player?.fieldGoalsMade, 80, 'Feldwurftreffer'),
      fieldGoalsAttempted: optionalInteger(player?.fieldGoalsAttempted, 100, 'Feldwurfversuche'),
      threeMade: optionalInteger(player?.threeMade, 50, 'Dreiertreffer'),
      threeAttempted: optionalInteger(player?.threeAttempted, 70, 'Dreierversuche'),
      freeThrowsMade: optionalInteger(player?.freeThrowsMade, 60, 'Freiwurftreffer'),
      freeThrowsAttempted: optionalInteger(player?.freeThrowsAttempted, 80, 'Freiwurfversuche'),
      sourceIndex: sourceIndex(player?.sourceIndex)
    })).filter(player => player.gameDate);
    return {
      opponentName: generatedString(value.opponentName || expectedOpponent || 'Unbekannter Gegner', 100, 'Gegnername'),
      games,
      players,
      warnings: warnings.slice(0, 20)
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
  parseOpponentScreenshots: buildOpponentScreenshots,
  planSeason: buildSeason
};

export function buildAIRequest(action, payload = {}) {
  const build = ACTIONS[action];
  if (!build) throw new AIError('AI_INPUT_INVALID', 'Unbekannte KI-Aktion.', { status: 400 });
  return build(payload);
}
