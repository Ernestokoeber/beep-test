import { basketballExpertPrompt, BASKETBALL_KNOWLEDGE_VERSION } from './basketball-knowledge.js';
import { buildOpponentResearch } from './opponent-research.js';

export const AI_MODEL_ID = 'gemini-3.8-flash';
export const AI_CONTRACT_VERSION = 14;
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
const SHOT_TARGETS_SCHEMA = {
  type: 'array',
  items: {
    type: 'object', required: ['kind', 'category', 'attempted'],
    properties: {
      kind: { type: 'string', enum: ['field', 'freethrow'] },
      category: STRING,
      attempted: INTEGER
    }
  }
};
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
  required: ['name', 'minutes', 'intensity', 'description', 'shotTargets'],
  properties: { ...DRILL_SCHEMA.properties, shotTargets: SHOT_TARGETS_SCHEMA }
};
const FRIDAY_STATION_SCHEMA = {
  type: 'object',
  required: ['title', 'category', 'description', 'focusAreas', 'shotTargets'],
  properties: {
    title: STRING,
    category: STRING,
    focusAreas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'skillKey'],
        properties: { category: STRING, skillKey: STRING }
      }
    },
    shotTargets: SHOT_TARGETS_SCHEMA,
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
// Send only the fields needed for this slot. Derived totals and the fixed
// Friday timetable are built locally, not repeated throughout Gemini's schema.
const SEASON_EVIDENCE_SCHEMA = {
  ...EVIDENCE_BASIS_SCHEMA,
  properties: {
    observedTrends: { type: 'array', items: STRING },
    loadConsiderations: { type: 'array', items: STRING },
    planningDecision: STRING
  }
};
const SEASON_TRAINING_SCHEMA = {
  type: 'object',
  required: ['date', 'summary', 'evidenceBasis', 'drills'],
  properties: {
    date: STRING,
    summary: STRING,
    evidenceBasis: SEASON_EVIDENCE_SCHEMA,
    drills: { type: 'array', items: SEASON_DRILL_SCHEMA }
  }
};

function seasonSchemaForSlot(slot) {
  const training = {
    ...SEASON_TRAINING_SCHEMA,
    required: [...SEASON_TRAINING_SCHEMA.required],
    properties: { ...SEASON_TRAINING_SCHEMA.properties }
  };
  if (slot.fridayStationMode === true) {
    delete training.properties.drills;
    training.required = ['date', 'summary', 'evidenceBasis', 'stationTraining'];
    training.properties.stationTraining = {
      type: 'object', required: ['rationale', 'stations'],
      properties: {
        rationale: STRING,
        stations: { type: 'array', items: FRIDAY_STATION_SCHEMA }
      }
    };
  } else if (isFriday(slot)) {
    training.required.push('fridayVariants');
    training.properties.fridayVariants = {
      type: 'object', required: ['over8', 'eightOrLess'],
      properties: {
        over8: { type: 'array', items: SEASON_DRILL_SCHEMA },
        eightOrLess: { type: 'array', items: SEASON_DRILL_SCHEMA }
      }
    };
  }
  return {
    type: 'object', required: ['trainings'],
    properties: { trainings: { type: 'array', items: training } }
  };
}

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
              twoMade: INTEGER,
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
          twoMade: INTEGER,
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

const PLAYER_DEVELOPMENT_TAXONOMY = Object.freeze({
  technique: ['ball-control', 'passing', 'footwork', 'shooting', 'finishing'],
  decision: ['scanning', 'advantage-read', 'pass-read', 'shot-selection', 'turnover-control'],
  offense: ['spacing', 'cutting', 'screening', 'pnr-handler', 'pnr-screener', 'off-ball'],
  defense: ['on-ball', 'closeout', 'help', 'rotation', 'screen-coverage', 'transition-defense'],
  rebounding: ['box-out', 'pursuit', 'outlet'],
  transition: ['sprint-lanes', 'early-advance', 'transition-decision'],
  role: ['point-guard-organization', 'off-ball-guard', 'wing-role', 'big-role'],
  load: ['conditioning', 'recovery', 'availability']
});

export const PLAYER_DEVELOPMENT_IMPORT_SCHEMA = {
  type: 'object',
  required: ['sourceLabel', 'candidates', 'warnings'],
  properties: {
    sourceLabel: STRING,
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['playerName', 'category', 'skillKey', 'kind', 'observation', 'evidenceExcerpt', 'sourcePage', 'suggestedPriority', 'drillTags', 'roleRelevant'],
        properties: {
          playerName: STRING,
          category: { type: 'string', enum: Object.keys(PLAYER_DEVELOPMENT_TAXONOMY) },
          skillKey: STRING,
          kind: { type: 'string', enum: ['strength', 'development'] },
          observation: STRING,
          evidenceExcerpt: STRING,
          sourcePage: INTEGER,
          suggestedPriority: INTEGER,
          drillTags: { type: 'array', items: STRING },
          roleRelevant: { type: 'boolean' }
        }
      }
    },
    warnings: { type: 'array', items: STRING }
  }
};

export const GAME_PLAN_SCHEMA = {
  type: 'object',
  required: ['lockerRoom', 'gameGoals', 'offenseKeys', 'defenseKeys', 'warmupFocus', 'halftimeChecks'],
  properties: Object.fromEntries(['lockerRoom', 'gameGoals', 'offenseKeys', 'defenseKeys', 'warmupFocus', 'halftimeChecks'].map((key) => [key, {
    type: 'array', minItems: 3, maxItems: 3, items: STRING
  }]))
};

export const INDIVIDUAL_TRAINING_DRAFT_SCHEMA = {
  type: 'object',
  required: ['analysis', 'playerFeedback', 'nextSession', 'weeklyFocus'],
  properties: {
    analysis: STRING,
    playerFeedback: STRING,
    nextSession: {
      type: 'object',
      required: ['title', 'objective', 'blocks'],
      properties: {
        title: STRING,
        objective: STRING,
        blocks: {
          type: 'array', minItems: 4, maxItems: 12,
          items: {
            type: 'object',
            required: ['title', 'minutes', 'repetitions', 'measurementMethod', 'coachingCues'],
            properties: {
              title: STRING,
              minutes: INTEGER,
              repetitions: STRING,
              measurementMethod: STRING,
              coachingCues: { type: 'array', minItems: 1, maxItems: 3, items: STRING }
            }
          }
        }
      }
    },
    weeklyFocus: {
      type: 'object',
      required: ['title', 'coachingCues', 'successIndicator'],
      properties: {
        title: STRING,
        coachingCues: { type: 'array', minItems: 1, maxItems: 2, items: STRING },
        successIndicator: STRING
      }
    }
  }
};

const FRIDAY_DEVELOPMENT_PROMPT = `Bei fridayStationMode enthält playerDevelopment ausschließlich bestätigte Entwicklungsfelder aktiver Spieler und ist die verbindliche Grundlage für die individuellen Inhalte. Stärken, fehlende Daten und nicht genannte Fähigkeiten sind keine Schwächen. Decke die vorhandenen Prioritäten mit den fünf Stationen möglichst vollständig ab; mindestens die erste und damit höchste Priorität jedes Spielers muss abgedeckt sein. Gib jeder Station ein bis vier passende focusAreas aus developmentTaxonomy. Das Training bleibt offen: Spieler wählen je Runde eine passende Station; es gibt keine Pflichtrotation und keine feste Spielerzuweisung durch die KI. Der Coach gleicht nur die Belegung aus. Diese offene Wahl ersetzt für fridayStationMode jede zuvor allgemein beschriebene Gruppenrotation.`;

const PROMPTS = {
  parsePlan: basketballExpertPrompt(`Du überträgst einen Basketball-Trainingsplan aus einem PDF in strukturierte CourtHub-Daten. Nutze ausschließlich Inhalte des Dokuments und die mitgesendeten tatsächlichen Trainingstage, Uhrzeit und Dauer. Fachwissen darf nur Begriffe korrekt zuordnen, aber keine fehlenden Inhalte ergänzen. Erfinde keine Termine. Gib nur das angeforderte JSON aus.`),
  summarizeTraining: basketballExpertPrompt(`Du wählst aus verifizierten Basketball-Trainingsfakten drei bis vier aussagekräftige Sätze aus. Jeder Satz muss genau den Text eines referenzierten Fakts wortgetreu kopieren und dessen Fakten-ID nennen. Formuliere nichts um und ergänze trotz deines Fachwissens keine Namen, Zahlen, Ursachen oder Bewertungen. Nenne insgesamt höchstens zwei Spieler. Gib nur das angeforderte JSON aus.`),
  explainTactic: basketballExpertPrompt(`Du erklärst einen strukturierten Basketball-Spielzug auf Deutsch. Beschreibe Ziel, Spacing, Timing, Phasen, tatsächlich beteiligte Rollen, Defense-Read und Offense-Antwort. Prüfe besonders Screenwinkel, Passfenster, Anschlussaktionen und die Reaktion auf Hilfe oder Switch. Erfinde keine Rollen oder Aktionen. Liefere zwei bis vier konkrete Coaching-Punkte und nur das angeforderte JSON.`),
  parseOpponentScreenshots: basketballExpertPrompt(`Du extrahierst überprüfbare Basketball-Gegnerdaten aus einem oder mehreren Screenshots der DBB.Scores-App. Verwende ausschließlich klar sichtbare Angaben. Erfinde keine Namen, Daten, Ergebnisse, Fouls, Würfe oder Quoten und leite fehlende Einzelwerte nicht aus Summen ab. sourceIndex ist die nullbasierte Position des Bildes in der Anfrage. Die Bilder stehen in Auswahlreihenfolge; direkt aufeinanderfolgende Ansichten "Kennzahlen", "Spielverlauf" und "Statistiken" können dasselbe Spiel zeigen. Ordne eine Statistikansicht dem vorherigen Spiel nur zu, wenn Team, Farbe, Ergebnis oder die unmittelbare Bildfolge den Zusammenhang eindeutig belegt, und übernimm dann dessen Datum für gameDate. Erfasse ein Spiel nur, wenn beide Teams klar erkennbar sind; Ergebnisse nur, wenn beide Punktzahlen sichtbar sind. Das Datum wird als YYYY-MM-DD ausgegeben, andernfalls als leerer String. opponentTeamStats und players beziehen sich ausschließlich auf den als erwarteten Gegner genannten Verein, niemals auf den anderen Verein. Lies Spielerpunkte vorrangig direkt aus der Spalte "Pkt". In DBB.Scores bedeutet "2Pkt" die Anzahl getroffener Zweier und wird als twoMade gespeichert, "3Pkt" die Anzahl getroffener Dreier und wird als threeMade gespeichert, "FW" die Freiwürfe und "PF" die Fouls. Diese Trefferzahlen sind keine Punktesummen und ohne sichtbare Versuche niemals Wurfquoten. Bei "FW x/y" speicherst du x als freeThrowsMade und y als freeThrowsAttempted; steht im Teamvergleich nur eine FW-Zahl, ist das ausschließlich freeThrowsMade. Spielerwerte werden ausschließlich als einzelne Spielzeilen mit eindeutigem Spieltag ausgegeben; Saison-Gesamtsummen oder Durchschnittswerte werden nicht als Einzelspielwerte übernommen. Setze completeFouls beziehungsweise completeShots nur dann auf true, wenn die vollständigen Teamwerte dieses Spiels sichtbar sind. Weise in warnings auf unlesbare, abgeschnittene, mehrdeutige oder unvollständige Bereiche hin. Gib nur das angeforderte JSON aus.`),
  parsePlayerDevelopmentPdf: basketballExpertPrompt(`Du strukturierst eine Spielerbewertungs-PDF als überprüfbare Kandidaten für CourtHub. Verwende ausschließlich Aussagen, die in der PDF sichtbar belegt sind. Erfinde keine Statistik, Ursache, Rolle, Spieler-ID, Spiel-ID oder Beobachtung. Gib keine Spieler-ID aus, sondern nur den gelesenen Spielernamen; unklare Namen bleiben als Warnung sichtbar. Ordne Kategorie und skillKey ausschließlich der vorgegebenen Taxonomie zu. evidenceExcerpt enthält nur den kurzen zur Beobachtung nötigen Ausschnitt und niemals vollständige PDF-Texte. Formuliere keine medizinischen Diagnosen und übernimm keine medizinischen Diagnosen aus Vermutungen; load beschreibt nur beobachtbare Verfügbarkeit, Kondition oder Erholung. Eine medizinische Aussage gehört nicht in candidates. Gib nur das angeforderte JSON aus.`),
  planGame: basketballExpertPrompt(`Du erstellst einen kompakten, direkt nutzbaren Basketball-Gameplan für TSV Lindau. teamStrategy ist die verbindliche aktuelle Wahrheit. Bei replacesPrevious=true ersetzt es alle früheren Mannschaftsprinzipien vollständig; excludedConcepts dürfen auch dann nicht reaktiviert werden, wenn sie in historischen Daten oder opponentPlan vorkommen. Nutze ausschließlich Fakten aus dem bestätigten opponentPlan und die dort angegebene Datenqualität. publicResearch ist eine externe, quellenbezogene Webrecherche: beachte Saison und Recherchezeitpunkt, unterscheide dortige belegte Befunde von KI-Einschätzungen und offenen Fragen, und leite daraus keine neuen bestätigten Statistiken oder Starter ab. Erfinde keine Quoten, Systeme, Spielertypen oder Matchups. Fehlende Werte bleiben unbekannt und dürfen nicht als gegnerische Schwäche interpretiert werden. Verwende nur Verteidigungen aus teamStrategy.allowedDefenseIds. selectedTactics enthält ausschließlich die vom Trainer aktuell freigegebenen Inhalte. Beziehe diese konkret ein und erfinde keine nicht ausgewählte Teamtaktik. Formuliere jeweils genau drei kurze, konkrete Punkte für Kabine, Spielziele, Offense, Defense, Aufwärmen und Halbzeitkontrolle. Unterscheide belegte Fakten klar von Beobachtungsaufträgen für die ersten Angriffe. Gib nur das angeforderte JSON aus.`),
  individualTrainingDraft: basketballExpertPrompt(`Du erstellst für genau einen Spieler einen privaten CourtHub-Entwurf nach einer abgeschlossenen Montagseinheit. Verwende ausschließlich die mitgesendeten Daten dieses Spielers. Fehlende Werte bleiben unbekannt und dürfen weder als null noch als schlechte Leistung interpretiert werden. Erfinde keine Messwerte, Beschwerden, Diagnosen oder Ursachen. Analyse, Feedback, nächster Trainingsvorschlag und Wochenfokus bleiben Entwürfe bis zur ausdrücklichen Coach-Freigabe. Der nächste Trainingsvorschlag dauert genau 105 Minuten, ist mit einem Korb und höchstens zwei Spielern ausführbar und nennt für jeden Block konkrete Wiederholungen, Messmethode und ein bis drei Coaching-Hinweise. Einheit 4 und Einheit 8 dürfen die freigegebenen standardisierten 60-Minuten-Testblöcke nicht verändern. Der Wochenfokus ist in unbekannten Mannschaftstrainings anwendbar, beschreibt eine beobachtbare Zielhandlung, enthält höchstens zwei Coaching-Hinweise und ein verständliches Erfolgsmerkmal. Gib ausschließlich das angeforderte JSON aus.`),
  planSeason: basketballExpertPrompt(`Du planst einen Wochenblock einer Basketball-Saison. teamStrategy ist die verbindliche aktuelle Wahrheit und hat Vorrang vor performanceContext, coachInput und historischen Trainingsnamen. Bei replacesPrevious=true ersetzt es alle früheren Systeme vollständig; excludedConcepts dürfen weder empfohlen noch als Übung, Variante oder Anschlussaktion eingebaut werden. Analysiere vor der Planung zwingend performanceContext mit den vergangenen Spielen, den abgeschlossenen Trainings und der Spielerbelastung. Historische Taktiknamen sind ausschließlich Vergangenheitsdaten und keine aktiven Vorgaben. Wiederkehrende Leistungsmuster wiegen stärker als ein einzelner Ausreißer; fehlende oder unvollständige Werte dürfen nicht als Schwäche interpretiert werden. Analysiere zusätzlich den opponentContext des Slots, sofern vorhanden. Verwende ausschließlich dort belegte Gegnerwerte und beachte Datenqualität, Stichprobengröße und Warnungen. Empfehle nur Verteidigungen aus teamStrategy.allowedDefenseIds. tacticalPlaybook enthält ausschließlich die aktuell freigegebenen Teamtaktiken; nutze nur daraus passende Teamtaktik. Gegnerbezogene Inhalte dürfen höchstens 25 Prozent einer normalen Einheit ausmachen. Liefere in evidenceBasis die tatsächlich verwendeten Trends, Belastungsaspekte und die daraus abgeleitete Planungsentscheidung. Liefere danach für jeden mitgesendeten Slot genau ein Training mit identischem Datum. Ändere keine Termine. Formuliere summary als prägnanten Trainingsschwerpunkt mit höchstens 180 Zeichen. Die Drill-Minuten entsprechen der durationMinutes des jeweiligen Slots; fehlt sie, gilt die allgemeine Trainingsdauer. Jeder Drill braucht einen klaren Aufbau, Ablauf, basketballspezifische Coaching-Punkte und eine sinnvolle Belastungsstufe. Plane eine erkennbare Progression von Technik über Entscheidungen zum Spieltransfer.

Jede description ist eine unmittelbar ausführbare Anleitung auf Deutsch mit diesen sechs Überschriften in genau dieser Reihenfolge, jeweils auf einer neuen Zeile: Ziel:, Aufbau:, Ablauf:, Umfang & Pausen:, Coaching:, Anpassung:. Beschreibe konkret Material, Korbbelegung, Gruppengröße und Startpositionen; nummeriere die einzelnen Handlungsschritte im Ablauf. Gib Wiederholungen/Serien, Partnerwechsel, Arbeits- und Pausenzeiten innerhalb der Blockdauer an. Erkläre zwei bis drei beobachtbare Coaching-Punkte und typische Fehler sowie eine einfachere Variante und individuelle Belastungsanpassung. Reine Schlagworte oder Übungsnamen genügen nicht. Plane etwa 700–1800 Zeichen pro Anleitung und maximal 6000. Die Wurfzahlen in der Beschreibung müssen mit shotTargets übereinstimmen; Vorgaben sind Versuche pro Spieler, niemals bereits erzielte Treffer. trainingResources.availableBaskets ist die verfügbare Korbzahl, standardmäßig zwei. Plane niemals mehr gleichzeitige Wurfstationen als Körbe; bei geteiltem Korb benenne getrennte Zeitfenster und die korbfreie Aufgabe der wartenden Gruppe. Beim Stationstraining rotieren fünf Gruppen in fünf 15-Minuten-Runden, jede Station wird einmal besucht. Jede Stationsbeschreibung erklärt ihre gleichzeitige Belegung und den Wechsel; keine fünf nacheinander absolvierten Aufgaben für die gesamte Mannschaft.

Wurferfassung ist verpflichtender Bestandteil jedes neuen Trainings: Jeder Drill und jede Einzelstation erhält shotTargets. Für jede tatsächlich vorgesehene Wurfaufgabe (auch Korbleger, Roll-/Pop-Abschlüsse, Pull-ups und Würfe in Entscheidungsübungen) liefere kind=field oder freethrow, eine eindeutige Wurfkategorie und attempted als positive Anzahl geplanter Versuche PRO SPIELER. Die Beschreibung erklärt dazu Position/Distanz, Ablauf, Umfang und Coaching-Punkte. Bei reinen Lauf-, Pass-, Defense-, Mobilitäts- oder Ballhandling-Aufgaben ohne Abschluss ist shotTargets ein leeres Array; erfinde dort keine Würfe. Verwende eindeutige, konsistente Kategorien in den shotTargets. Liefere keine separaten shots- oder freethrows-Gesamtsummen; CourtHub summiert Wiederholungen derselben Kategorie und alle Freiwurfvorgaben selbst. CourtHub berechnet shots und freethrows verbindlich aus den shotTargets der aktiven Übungen; Treffer, tatsächliche Versuche und Quoten werden erst im Training erfasst. Für fridayStationMode sind die shotTargets der fünf Stationen maßgeblich, nicht doppelt die entsprechenden drills. Freitagsvarianten erhalten eigene, vollständige shotTargets. Neue Trainings dürfen keine alten Wurfkategorien ungeprüft übernehmen.

Behandle coachInput.problems nur als diagnostischen Hinweis, nicht als Hauptauftrag. Inhalte zur Behebung dieser Beobachtung dürfen höchstens 25 Prozent einer Einheit ausmachen. Erhalte immer die aktiven Mannschaftsprinzipien aus teamStrategy, den aktuellen Schwerpunkt, technische Grundlagen und eine ausgewogene Belastung. Verteile ein genanntes Problem nicht künstlich auf Warm-up, Hauptteil und Abschluss. Sicherheits-, Schmerz- und Belastungshinweise aus coachInput.roster sowie Verletztenstatus aus performanceContext bleiben davon unberührt und haben Vorrang. Verletzte Spieler erhalten keine normale Trainings- oder Stationsbelastung, sondern nur ausdrücklich medizinisch freigegebene, schmerzfreie Reha/Prehab oder Pause.

Für einen Slot mit fridayStationMode=true erstellst du jedes Mal ein neues individuelles Stationstraining passend zur aktuellen Spielwoche und zum folgenden Wochenendspiel. Nutze die Historie, um Schwerpunkte und Stationskombinationen nicht einfach zu wiederholen. Wenn der Slot previousStationPlan enthält, ist er eine verbindliche Ausschlussreferenz für die Neuplanung: Übernimm keine der fünf bisherigen Stationsbezeichnungen und ersetze mindestens drei der fünf primären focusAreas durch fachlich andere Schwerpunkte aus developmentTaxonomy. Bloßes Umbenennen bei gleichbleibenden focusAreas gilt nicht als neuer Plan. requiredPrimaryFocuses enthält die eindeutigen, zwingend abzudeckenden Hauptprioritäten; jedes dort genannte Paar aus category und skillKey muss in mindestens einer focusAreas-Liste exakt vorkommen. Bei replanAttempt=2 wurde der erste Entwurf abgelehnt; korrigiere den in replanFeedback genannten Grund vollständig und ändere bei zu großer Ähnlichkeit die Zusammenstellung grundlegend. Das Training dauert genau 105 Minuten und besteht in dieser Reihenfolge aus: 10 Minuten Readiness-Check, 10 Minuten individuelle Aktivierung, fünf unterschiedliche Einzelstationen zu je 15 Minuten und 10 Minuten Cooldown mit Session-RPE. Liefere dazu stationTraining mit genau fünf Stationen. Liefere für diesen Modus ausschließlich date, summary, evidenceBasis und stationTraining. Keine zusätzlichen drills, shots, freethrows oder fridayVariants: CourtHub erzeugt die acht Blöcke, deren Wurfvorgaben und die verbindliche Zeitstruktur selbst aus den fünf Stationen. Höchstens eine der fünf Stationen darf unmittelbar aus coachInput.problems abgeleitet sein; die vier übrigen Stationen müssen andere Entwicklungsbereiche abdecken. Keine Teamtaktik, keine Spielformen und kein 1-gegen-1 bis 5-gegen-5. Alle Inhalte müssen allein oder mit einfachen Zuspielern ausführbar sein. Plane niedrige Vor-Spiel-Belastung; die individuelle Ampel für Tagesform, Schmerzen, Spielminuten und Wochenbelastung skaliert das Volumen später pro Spieler. fridayVariants wird für diesen Modus nicht benötigt.

${FRIDAY_DEVELOPMENT_PROMPT}

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

function trainingDescription(value, label) {
  const text = string(value, 6000, label);
  const headings = ['Ziel', 'Aufbau', 'Ablauf', 'Umfang & Pausen', 'Coaching', 'Anpassung'];
  const matches = [...text.matchAll(/^(Ziel|Aufbau|Ablauf|Umfang & Pausen|Coaching|Anpassung):[ \t]*/gm)];
  if (matches.length !== headings.length || matches.some((match, index) => match[1] !== headings[index] || !text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim())) {
    fail(`${label} benötigt Ziel, Aufbau, Ablauf, Umfang & Pausen, Coaching und Anpassung.`);
  }
  const steps = text.slice(matches[2].index + matches[2][0].length, matches[3].index);
  if (!/(?:^|\s)1[.)]\s/.test(steps) || !/(?:^|\s)2[.)]\s/.test(steps)) fail(`${label} benötigt einen nummerierten Ablauf.`);
  return text;
}

function validateDrills(input, { requireIntensity = false, durationMinutes = null } = {}) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30) fail('Die Drillliste ist ungültig.');
  const drills = input.map((drill) => {
    if (!drill || typeof drill !== 'object') fail('Ein Drill ist ungültig.');
    const normalized = {
      name: generatedString(drill.name, 120, 'Drillname'),
      minutes: integer(drill.minutes, 1, 240, 'Drilldauer'),
      description: requireIntensity ? trainingDescription(drill.description, 'Drillbeschreibung') : generatedString(drill.description, 6000, 'Drillbeschreibung')
    };
    if (requireIntensity) {
      normalized.shotTargets = validateShotTargets(drill.shotTargets);
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

function validateShotTargets(input) {
  if (!Array.isArray(input) || input.length > 10) fail('Die Wurfvorgaben einer Übung fehlen oder sind ungültig.');
  return input.map(target => {
    if (!['field', 'freethrow'].includes(target?.kind)) fail('Die Wurfart ist ungültig.');
    return {
      kind: target.kind,
      category: target.kind === 'freethrow' ? 'Freiwürfe' : generatedString(target.category, 100, 'Wurfkategorie'),
      attempted: integer(target.attempted, 1, 1000, 'Geplante Wurfversuche pro Spieler')
    };
  });
}

function shootingPlanFromDrills(drills) {
  const categories = new Map();
  let freethrows = 0;
  for (const drill of drills) for (const target of drill.shotTargets || []) {
    if (target.kind === 'freethrow') freethrows += target.attempted;
    else {
      const key = target.category.trim().toLocaleLowerCase('de-DE');
      const previous = categories.get(key);
      categories.set(key, { category: previous?.category || target.category, attempted: (previous?.attempted || 0) + target.attempted });
    }
  }
  if (freethrows > 1000 || [...categories.values()].some(target => target.attempted > 1000)) fail('Das geplante Wurfvolumen ist zu hoch.');
  return { freethrows: { attempted: freethrows }, shots: [...categories.values()] };
}

function validateFridayStations(input) {
  if (!input || typeof input !== 'object') fail('KI-Stationstraining fehlt.');
  if (!Array.isArray(input.stations) || input.stations.length !== 5) fail('Das KI-Stationstraining benötigt genau fünf Stationen.');
  return {
    rationale: generatedString(input.rationale, 500, 'Begründung des Stationstrainings'),
    stations: input.stations.map((station) => ({
      title: generatedString(station?.title, 120, 'Stationstitel'),
      category: generatedString(station?.category, 80, 'Stationskategorie'),
      focusAreas: validateFridayFocusAreas(station?.focusAreas),
      shotTargets: validateShotTargets(station?.shotTargets),
      description: trainingDescription(station?.description, 'Stationsbeschreibung')
    }))
  };
}

function validateFridayFocusAreas(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 4) fail('Die Entwicklungsbereiche einer Station fehlen oder sind ungültig.');
  const unique = new Set();
  return input.map((area) => {
    const category = generatedString(area?.category, 40, 'Entwicklungskategorie');
    const skillKey = generatedString(area?.skillKey, 80, 'Entwicklungsfähigkeit');
    if (!PLAYER_DEVELOPMENT_TAXONOMY[category]?.includes(skillKey)) fail('Eine Station enthält einen unbekannten Entwicklungsbereich.');
    const key = `${category}:${skillKey}`;
    if (unique.has(key)) fail('Eine Station enthält einen Entwicklungsbereich doppelt.');
    unique.add(key);
    return { category, skillKey };
  });
}

function validateFridayDevelopmentCoverage(stationTraining, playerDevelopment) {
  const covered = new Set(stationTraining.stations.flatMap(station => station.focusAreas.map(area => `${area.category}:${area.skillKey}`)));
  for (const player of Array.isArray(playerDevelopment) ? playerDevelopment : []) {
    const highestPriority = Array.isArray(player?.priorities) ? player.priorities[0] : null;
    if (!highestPriority) continue;
    const category = String(highestPriority.category || '');
    const skillKey = String(highestPriority.skillKey || '');
    if (!PLAYER_DEVELOPMENT_TAXONOMY[category]?.includes(skillKey)) fail('Der Freitagspayload enthält einen unbekannten Entwicklungsbereich.');
    if (!covered.has(`${category}:${skillKey}`)) fail('Das Stationstraining deckt nicht alle höchsten Spielerprioritäten ab.');
  }
}

function buildFridayStationDrills(stationTraining) {
  return [
    {
      name: 'Readiness-Check & Belastungsampel',
      minutes: 10,
      intensity: 'low',
      description: 'Ziel: Belastung und Tagesziel pro Spieler festlegen.\nAufbau: Gemeinsam am Seitenrand, CourtHub-Reiter Belastung öffnen; die fünf Stationen und ihre Schwerpunkte sichtbar machen.\nAblauf: 1. In 3 min Tagesform, Schmerzen und Wochenbelastung erfassen. 2. In 3 min Ampel und Ziel-RPE besprechen. 3. In 4 min wählt jeder Spieler mit dem Coach passende Stationen; der Coach gleicht nur die Belegung aus.\nUmfang & Pausen: 10 min; danach fünf Stationsrunden à 15 min mit offener Stationswahl. Spieler dürfen passende Stationen wiederholen und müssen nicht alle Stationen absolvieren.\nCoaching: Jeder Spieler kennt seinen Entwicklungsfokus und eine passende Startoption; Beschwerden vor dem Start melden lassen.\nAnpassung: Gelb mit etwa 70 % Volumen; Rot nur freigegebene schmerzfreie Aufgaben oder Pause.',
      shotTargets: []
    },
    {
      name: 'Individuelle Aktivierung',
      minutes: 10,
      intensity: 'low',
      description: 'Ziel: Kontrollierte Aktivierung ohne Vor-Spiel-Ermüdung.\nAufbau: Freie Außenflächen, ein Ball je Spieler oder Partnerpaar; Laufwege trennen.\nAblauf: 1. 2 min locker gehen/traben. 2. 3 min schmerzfreie Mobilität. 3. 3 min Ballhandling rechts/links im Stand und Gehen. 4. 2 min ruhige Start-Stopp-Schritte.\nUmfang & Pausen: 10 min; kurze Partnerwechsel, keine Sprint- oder Sprungserien.\nCoaching: Blick oben, stabil stoppen, Technik vor Tempo.\nAnpassung: Gelb mit zusätzlichen Pausen; Rot nur freigegebene schmerzfreie Aufgaben oder Pause.',
      shotTargets: []
    },
    ...stationTraining.stations.map((station) => ({
      name: station.title,
      minutes: 15,
      intensity: 'low',
      description: station.description,
      shotTargets: station.shotTargets
    })),
    {
      name: 'Cooldown & Session-RPE',
      minutes: 10,
      intensity: 'low',
      description: 'Ziel: Belastung senken und die gesamte Einheit bewerten.\nAufbau: Bälle ablegen, am Seitenrand sammeln; CourtHub zur Nachbereitung bereithalten.\nAblauf: 1. 3 min ruhig gehen. 2. 3 min lockere schmerzfreie Mobilität. 3. 2 min Beschwerden und Übungsqualität besprechen. 4. 2 min Session-RPE erklären und die Eintragung nach kurzer Erholung vorbereiten.\nUmfang & Pausen: 10 min; kein Abschlusswettkampf und keine zusätzlichen Würfe.\nCoaching: Gesamte Belastung bewerten, Beschwerden und ausgelassene Aufgaben dokumentieren.\nAnpassung: Alle schließen ruhig ab; bei Beschwerden keine Zusatzbelastung.',
      shotTargets: []
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
    drills: fridayStationMode
      ? buildFridayStationDrills(stationTraining)
      : validateDrills(input.drills, { requireIntensity, durationMinutes })
  };
  if (requireIntensity) Object.assign(training, shootingPlanFromDrills(training.drills));
  else {
    training.freethrows = { attempted: integer(input.freethrows?.attempted, 0, 1000, 'Freiwurfversuche') };
    training.shots = validateShots(input.shots);
  }
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
          twoMade: optionalInteger(stats.twoMade, 150, 'Zweiertreffer'),
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
    const datedGames = games.filter(game => game.date).sort((a, b) => a.sourceIndex - b.sourceIndex);
    const inferredSources = new Set();
    const players = value.players.slice(0, 160).map((player) => {
      const index = sourceIndex(player?.sourceIndex);
      let gameDate = cleanDate(player?.gameDate);
      if (!gameDate) {
        const previousGame = datedGames.filter(game => game.sourceIndex <= index).at(-1);
        if (previousGame && index - previousGame.sourceIndex <= 3) {
          gameDate = previousGame.date;
          inferredSources.add(index);
        }
      }
      return {
        name: generatedString(player?.name, 100, 'Spielername'),
        gameDate,
        points: optionalInteger(player?.points, 150, 'Spielerpunkte'),
        fouls: optionalInteger(player?.fouls, 10, 'Spielerfouls'),
        twoMade: optionalInteger(player?.twoMade, 60, 'Zweiertreffer'),
        fieldGoalsMade: optionalInteger(player?.fieldGoalsMade, 80, 'Feldwurftreffer'),
        fieldGoalsAttempted: optionalInteger(player?.fieldGoalsAttempted, 100, 'Feldwurfversuche'),
        threeMade: optionalInteger(player?.threeMade, 50, 'Dreiertreffer'),
        threeAttempted: optionalInteger(player?.threeAttempted, 70, 'Dreierversuche'),
        freeThrowsMade: optionalInteger(player?.freeThrowsMade, 60, 'Freiwurftreffer'),
        freeThrowsAttempted: optionalInteger(player?.freeThrowsAttempted, 80, 'Freiwurfversuche'),
        sourceIndex: index
      };
    }).filter(player => player.gameDate);
    inferredSources.forEach(index => warnings.push(`Screenshot ${index + 1}: Spielerwerte wurden dem unmittelbar vorherigen Spieltag zugeordnet.`));
    return {
      opponentName: generatedString(value.opponentName || expectedOpponent || 'Unbekannter Gegner', 100, 'Gegnername'),
      games,
      players,
      warnings: warnings.slice(0, 20)
    };
  });
}

function buildPlayerDevelopmentPdf(payload) {
  const fileBase64 = String(payload.fileBase64 || '');
  const mimeType = String(payload.mimeType || '');
  if (mimeType !== 'application/pdf') throw new AIError('AI_INPUT_INVALID', 'Nur PDF-Dateien werden unterstützt.', { status: 400 });
  if (!fileBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(fileBase64)) {
    throw new AIError('AI_INPUT_INVALID', 'Die PDF-Datei ist ungültig.', { status: 400 });
  }
  const bytes = Buffer.from(fileBase64, 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) {
    throw new AIError('AI_INPUT_INVALID', 'PDF fehlt oder ist größer als 3 MB.', { status: 413 });
  }
  if (bytes.subarray(0, 4).toString('ascii') !== '%PDF') {
    throw new AIError('AI_INPUT_INVALID', 'Die ausgewählte Datei ist keine lesbare PDF.', { status: 400 });
  }
  const game = payload.game || {};
  const context = {
    game: {
      date: date(game.date, 'Spieldatum'),
      opponent: string(game.opponent, 120, 'Gegner')
    },
    knownPlayerNames: [...new Set((Array.isArray(payload.knownPlayerNames) ? payload.knownPlayerNames : [])
      .map(name => string(name, 120, 'Spielername')))].slice(0, 80),
    taxonomy: PLAYER_DEVELOPMENT_TAXONOMY
  };
  if (!context.knownPlayerNames.length) throw new AIError('AI_INPUT_INVALID', 'Der bekannte Kader fehlt.', { status: 400 });
  const allowedCandidateKeys = new Set(['playerName', 'category', 'skillKey', 'kind', 'observation', 'evidenceExcerpt', 'sourcePage', 'suggestedPriority', 'drillTags', 'roleRelevant']);
  const medicalClaim = /\b(meniskus(?:riss)?|kreuzband(?:riss)?|bänderriss|fraktur|ruptur|gehirnerschütterung|sehnenriss|diagnose|mrt)\b/i;
  return structured([
    { inlineData: { mimeType, data: fileBase64 } },
    { text: `${PROMPTS.parsePlayerDevelopmentPdf}\n\nSpiel- und Kaderkontext:\n${JSON.stringify(context)}` }
  ], PLAYER_DEVELOPMENT_IMPORT_SCHEMA, 'low', 48_000, (textValue) => {
    const value = parseJson(textValue);
    if (!Array.isArray(value?.candidates) || value.candidates.length > 120 || !Array.isArray(value?.warnings) || value.warnings.length > 20) {
      fail('Die Spielerbewertung ist unvollständig oder zu umfangreich.');
    }
    const candidates = value.candidates.map((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
        || Object.keys(candidate).some(key => !allowedCandidateKeys.has(key))) {
        fail('Ein Kandidat enthält unerlaubte Felder.');
      }
      const category = string(candidate.category, 40, 'Kategorie');
      const skillKey = string(candidate.skillKey, 80, 'Fähigkeit');
      if (!PLAYER_DEVELOPMENT_TAXONOMY[category]?.includes(skillKey)) fail('Kategorie oder Fähigkeit ist unbekannt.');
      const kind = string(candidate.kind, 30, 'Befundart');
      if (!['strength', 'development'].includes(kind)) fail('Befundart ist unbekannt.');
      const observation = string(candidate.observation, 500, 'Beobachtung');
      const evidenceExcerpt = string(candidate.evidenceExcerpt, 400, 'Belegausschnitt');
      if (medicalClaim.test(observation) || medicalClaim.test(evidenceExcerpt)) fail('Medizinische Diagnosen werden nicht als Trainingsbefund übernommen.');
      if (!Array.isArray(candidate.drillTags) || candidate.drillTags.length > 10) fail('Übungs-Tags sind ungültig.');
      if (typeof candidate.roleRelevant !== 'boolean') fail('Rollenrelevanz ist ungültig.');
      return {
        playerName: string(candidate.playerName, 120, 'Spielername'),
        category,
        skillKey,
        kind,
        observation,
        evidenceExcerpt,
        sourcePage: integer(candidate.sourcePage, 1, 10_000, 'PDF-Seite'),
        suggestedPriority: integer(candidate.suggestedPriority, 1, 5, 'Priorität'),
        drillTags: [...new Set(candidate.drillTags.map(tag => string(tag, 80, 'Übungs-Tag')))],
        roleRelevant: candidate.roleRelevant
      };
    });
    return {
      contractVersion: 'player-development-import.v1',
      sourceLabel: string(value.sourceLabel, 120, 'Quellenbezeichnung'),
      candidates,
      warnings: value.warnings.map(warning => string(warning, 240, 'Warnhinweis'))
    };
  });
}

function buildGamePlan(payload) {
  const game = payload.game || {};
  const opponentPlan = payload.opponentPlan;
  if (!opponentPlan || typeof opponentPlan !== 'object' || opponentPlan.schemaVersion !== 1 || !opponentPlan.opponent || !opponentPlan.defense) {
    throw new AIError('AI_INPUT_INVALID', 'Für den Gameplan fehlt eine bestätigte Gegneranalyse.', { status: 400 });
  }
  if (!['man', 'zone212', 'zone23', 'zone32'].includes(opponentPlan.defense.start) || !['man', 'zone212', 'zone23', 'zone32'].includes(opponentPlan.defense.alternative)) {
    throw new AIError('AI_INPUT_INVALID', 'Der Gegnerplan enthält eine nicht trainierte Verteidigung.', { status: 400 });
  }
  const candidateTactics = (Array.isArray(payload.selectedTactics) ? payload.selectedTactics : []).slice(0, 20).map(item => ({
    id: generatedString(item?.id, 120, 'Taktik-ID'),
    title: generatedString(item?.title, 200, 'Taktiktitel'),
    usage: ['offense', 'defense', 'inbound', 'pressbreak'].includes(item?.usage) ? item.usage : 'offense',
    description: String(item?.description || '').slice(0, 600),
    playbook: String(item?.playbook || '').slice(0, 80),
    coachingPoints: (Array.isArray(item?.coachingPoints) ? item.coachingPoints : []).slice(0, 12).map(point => String(point).slice(0, 300)),
    reads: (Array.isArray(item?.reads) ? item.reads : []).slice(0, 12).map(read => String(read).slice(0, 300))
  }));
  const strategy = payload.teamStrategy && typeof payload.teamStrategy === 'object' ? payload.teamStrategy : {};
  const teamStrategy = {
    schemaVersion: Number(strategy.schemaVersion) || 1,
    revision: Number(strategy.revision) || 1,
    name: String(strategy.name || 'Aktives Teamkonzept').slice(0, 120),
    replacesPrevious: strategy.replacesPrevious !== false,
    offensePrinciples: String(strategy.offensePrinciples || '').slice(0, 2000),
    defensePrinciples: String(strategy.defensePrinciples || '').slice(0, 2000),
    transitionPrinciples: String(strategy.transitionPrinciples || '').slice(0, 2000),
    allowedDefenseIds: (Array.isArray(strategy.allowedDefenseIds) ? strategy.allowedDefenseIds : ['man']).filter(id => ['man', 'zone212', 'zone23', 'zone32'].includes(id)),
    activeTacticIds: (Array.isArray(strategy.activeTacticIds) ? strategy.activeTacticIds : []).slice(0, 80).map(item => String(item).slice(0, 120)),
    excludedConcepts: (Array.isArray(strategy.excludedConcepts) ? strategy.excludedConcepts : []).slice(0, 40).map(item => String(item).slice(0, 100))
  };
  const activeTacticIds = new Set(teamStrategy.activeTacticIds);
  const selectedTactics = candidateTactics.filter(item => activeTacticIds.has(item.id));
  const serialized = JSON.stringify({ game: { date: game.date || '', home: game.home || '', away: game.away || '', competition: game.competition || game.leagueName || '' }, teamStrategy, opponentPlan, selectedTactics });
  if (serialized.length > 60_000) throw new AIError('AI_INPUT_INVALID', 'Die Gegneranalyse ist für einen Gameplan zu umfangreich.', { status: 413 });
  return structured([{ text: `${PROMPTS.planGame}\n\nBestätigte Spiel- und Gegnerdaten:\n${serialized}` }], GAME_PLAN_SCHEMA, 'low', 38_000, (text) => {
    const value = parseJson(text);
    const plan = {};
    for (const key of ['lockerRoom', 'gameGoals', 'offenseKeys', 'defenseKeys', 'warmupFocus', 'halftimeChecks']) {
      if (!Array.isArray(value?.[key]) || value[key].length !== 3) fail(`Der KI-Gameplan benötigt genau drei Punkte für ${key}.`);
      plan[key] = value[key].map((item) => generatedString(item, 500, 'Gameplan-Punkt'));
    }
    return plan;
  });
}

function buildIndividualTrainingDraft(payload) {
  const data = payload?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AIError('AI_INPUT_INVALID', 'Daten für den Individual-Entwurf fehlen.', { status: 400 });
  }
  const serialized = JSON.stringify(data);
  if (serialized.length > 100_000) throw new AIError('AI_INPUT_INVALID', 'Die Individualdaten sind zu umfangreich.', { status: 413 });
  return structured([
    { text: `${PROMPTS.individualTrainingDraft}\n\nZulässige Daten dieses Spielers:\n${serialized}` }
  ], INDIVIDUAL_TRAINING_DRAFT_SCHEMA, 'low', 48_000, (textValue) => {
    const value = parseJson(textValue);
    const blocks = value?.nextSession?.blocks;
    if (!Array.isArray(blocks) || blocks.length < 4 || blocks.length > 12) fail('Der nächste Trainingsvorschlag ist unvollständig.');
    const normalizedBlocks = blocks.map(block => ({
      title: generatedString(block?.title, 160, 'Blocktitel'),
      minutes: integer(block?.minutes, 1, 105, 'Blockdauer'),
      repetitions: generatedString(block?.repetitions, 800, 'Wiederholungen'),
      measurementMethod: generatedString(block?.measurementMethod, 1200, 'Messmethode'),
      coachingCues: Array.isArray(block?.coachingCues) && block.coachingCues.length >= 1 && block.coachingCues.length <= 3
        ? block.coachingCues.map(cue => generatedString(cue, 300, 'Coaching-Hinweis'))
        : fail('Ein Trainingsblock benötigt ein bis drei Coaching-Hinweise.')
    }));
    if (normalizedBlocks.reduce((sum, block) => sum + block.minutes, 0) !== 105) fail('Der nächste Trainingsvorschlag muss genau 105 Minuten dauern.');
    const focusCues = value?.weeklyFocus?.coachingCues;
    if (!Array.isArray(focusCues) || focusCues.length < 1 || focusCues.length > 2) fail('Der Wochenfokus benötigt ein bis zwei Coaching-Hinweise.');
    return {
      analysis: generatedString(value.analysis, 4000, 'Analyse'),
      playerFeedback: generatedString(value.playerFeedback, 3000, 'Spielerfeedback'),
      nextSession: {
        title: generatedString(value.nextSession?.title, 160, 'Trainingstitel'),
        objective: generatedString(value.nextSession?.objective, 1200, 'Trainingsziel'),
        blocks: normalizedBlocks
      },
      weeklyFocus: {
        title: generatedString(value.weeklyFocus?.title, 120, 'Wochenfokus'),
        coachingCues: focusCues.map(cue => generatedString(cue, 240, 'Coaching-Hinweis')),
        successIndicator: generatedString(value.weeklyFocus?.successIndicator, 300, 'Erkennungsmerkmal')
      }
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
  ], seasonSchemaForSlot(slots[0]), 'low', 48_000, (text) => {
    const value = parseJson(text);
    if (!Array.isArray(value?.trainings) || value.trainings.length !== slots.length) fail('Die KI-Antwort enthält nicht alle Trainingstermine.');
    const trainings = value.trainings.map((training) => {
      const slot = slots.find((entry) => entry.date === training?.date);
      if (!slot) fail('Die KI-Antwort enthält einen unbekannten Trainingstermin.');
      const slotDuration = Number(slot.durationMinutes);
      const trainingDuration = Number.isInteger(slotDuration) && slotDuration >= 30 && slotDuration <= 240 ? slotDuration : expectedDuration;
      if (!training?.evidenceBasis) fail('Die KI hat die vorherigen Leistungs- und Belastungswerte nicht ausgewertet.');
      const normalized = normalizeTraining(training, {
        durationMinutes: trainingDuration,
        requireIntensity: true,
        friday: isFriday(slot),
        fridayStationMode: slot.fridayStationMode === true
      });
      if (slot.fridayStationMode === true) validateFridayDevelopmentCoverage(normalized.stationTraining, data.playerDevelopment);
      return normalized;
    });
    if (new Set(trainings.map((training) => training.date)).size !== dates.length) fail('Die KI-Antwort enthält doppelte Trainingstermine.');
    return { trainings };
  });
}

const ACTIONS = {
  researchOpponent: payload => buildOpponentResearch(payload,AIError),
  parsePlan: buildParsePlan,
  summarizeTraining: buildSummary,
  explainTactic: buildTactic,
  parseOpponentScreenshots: buildOpponentScreenshots,
  parsePlayerDevelopmentPdf: buildPlayerDevelopmentPdf,
  individualTrainingDraft: buildIndividualTrainingDraft,
  planGame: buildGamePlan,
  planSeason: buildSeason
};

export function buildAIRequest(action, payload = {}) {
  const build = ACTIONS[action];
  if (!build) throw new AIError('AI_INPUT_INVALID', 'Unbekannte KI-Aktion.', { status: 400 });
  return build(payload);
}

