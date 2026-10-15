export const PILOT_TEMPLATE_VERSION = 'courthub-individual-pilot-2026.v1';
export const PILOT_START_DATE = '2026-10-19';
export const PILOT_CLOSED_DATES = Object.freeze(['2026-11-02']);

const pilotDates = Object.freeze([
  '2026-10-19',
  '2026-10-26',
  '2026-11-09',
  '2026-11-16',
  '2026-11-23',
  '2026-11-30',
  '2026-12-07',
  '2026-12-14'
]);

const baselineMeasurements = Object.freeze([
  {
    title: 'Ausgangsmessung Ballkontrolle', durationMinutes: 8,
    repetitions: { practiceRuns: 1, regularMeasuredRuns: 2, weakHandMeasuredRuns: 2 },
    measurementMethod: {
      setup: 'Fünf Hütchen in gerader Linie, etwa zwei Meter Abstand; Startlinie einen Meter vor dem ersten Hütchen.',
      metrics: ['Zeit in Sekunden', 'Ballverluste', 'ausgelassene Hütchen', 'Blick oben: ja/teilweise/nein', 'schwache Hand: sicher/wechselhaft/unsicher'],
      rules: 'Nach Ballverlust an der Verluststelle fortsetzen. Beide Versuche speichern; bester regelkonformer Versuch zusätzlich anzeigen. Zeit und Fehler getrennt auswerten.'
    },
    coachingCues: ['Messserie ohne technische Korrektur durchführen.', 'Aufbau und Abstände für Einheit 4 und 8 unverändert lassen.']
  },
  {
    title: 'Ausgangsmessung Korbabschluss', durationMinutes: 10,
    repetitions: { rightLayups: 10, leftLayups: 10, switchAfterAttempts: 5, totalFinishes: 20 },
    measurementMethod: {
      metrics: ['Treffer je Seite', 'vorgesehene Abschlusshand', 'korrekte Schrittfolge', 'Ballverlust vor Abschluss', 'Technik: stabil/wechselhaft/unsicher'],
      rules: 'Treffer und Technik getrennt bewerten. Ein technisch falscher Treffer bleibt ein Treffer und erhält zusätzlich die passende Technikbewertung.'
    },
    coachingCues: ['Messserie ohne technische Unterbrechung beenden.', 'Danach Schrittfolge, Abschlusshand, Ballschutz und frühen Zielblick korrigieren.']
  },
  {
    title: 'Ausgangsmessung Wurf', durationMinutes: 12,
    repetitions: { positions: 5, attemptsPerPosition: 5, totalAttempts: 25, switchAfterEachPosition: true },
    measurementMethod: {
      setup: 'Fünf feste Positionen in etwa 3,5 bis 4 Metern: beide Baselines, beide Flügel und frontal. Pass aus Korbnähe, kein Verteidiger.',
      metrics: ['Treffer und Versuche je Position', 'Gesamttreffer aus 25', 'Trefferquote', 'Fehlwurfrichtung', 'Balance', 'Wurflinie', 'Follow-through'],
      rules: 'Während der Messserie keine zusätzlichen Übungswürfe und keine technischen Änderungen.'
    },
    coachingCues: ['Positionen und Bedingungen für Einheit 4 und 8 identisch halten.', 'Spieler nach jeder Position wechseln.']
  }
]);

const testWarmup = Object.freeze({
  title: 'Check-in, Readiness und standardisierte Aktivierung', durationMinutes: 15,
  repetitions: {
    readinessScale: '1–10', mobilityTrips: 'je 2 × 10–12 m hin und zurück',
    stationaryDribbles: ['30 s tief rechts', '30 s tief links', '30 s Speed rechts', '30 s Speed links', '30 s Crossover', '30 s zwischen den Beinen'],
    controlledRuns: 2
  },
  measurementMethod: { metrics: ['Readiness 1–10'], rules: 'Aktivierung ist keine Leistungsmessung.' },
  coachingCues: ['Bei Readiness 1–4 persönlich sprechen und Belastung regulär, angepasst oder nicht festlegen.', 'Keine Diagnosen oder ausführlichen medizinischen Angaben speichern.']
});

function unitOne() {
  return {
    templateKey: 'pilot-2026-unit-1', version: 1,
    title: 'Piloteinheit 1 – Ausgangsniveau',
    objective: 'Ausgangsniveau in Ballkontrolle, beidseitigem Korbabschluss und Wurfbasis erfassen, erste technische Korrekturen setzen und Vergleichswerte für Einheit 4 und 8 erzeugen.',
    exercises: [
      { ...testWarmup, title: 'Check-in und Readiness', durationMinutes: 5, repetitions: { readinessScale: '1–10' } },
      {
        title: 'Dynamische Aktivierung mit Ball', durationMinutes: 10,
        repetitions: testWarmup.repetitions,
        measurementMethod: { metrics: [], rules: 'Beobachtungen sammeln, aber erst nach der Ausgangsmessung ausführlich korrigieren. Dieser Abschnitt zählt nicht als Messung.' },
        coachingCues: ['Blick vom Ball lösen und Hüfte tief halten.', 'Brust stabilisieren; Ball seitlich aus Fingern und Handgelenk führen.']
      },
      ...baselineMeasurements,
      {
        title: 'Individuelle Technikkorrektur', durationMinutes: 20,
        repetitions: {
          ballhandling: ['3 × 30 s schwache Hand', '3 × 6 explosive erste Schritte schwache Hand', '2 × 6 Crossover plus Beschleunigung', '20–30 s Satzpause'],
          finishOption: ['2 × 5 Korbleger je Seite ohne Tempo', '2 × 5 je Seite mit Antritt', '40 Abschlüsse gesamt'],
          shotOption: ['10 einhändige Formwürfe', '10 Würfe Position 1', '10 Würfe Position 2', '30 Würfe gesamt']
        },
        measurementMethod: { metrics: ['angeleitete Übungsversuche getrennt von Messversuchen'], rules: 'Pro Spieler genau ein Ballhandling- und ein Abschluss- oder Wurfschwerpunkt.' },
        coachingCues: ['Fehler konkret benennen und genau eine verständliche Korrektur geben.', 'Fünf Wiederholungen ausführen lassen, erst dann erneut eingreifen.']
      },
      {
        title: 'Wahrnehmung und Entscheidung', durationMinutes: 15,
        repetitions: { sets: 3, actionsPerSet: 6, totalActions: 18, switchAfterEachSet: true },
        measurementMethod: { metrics: ['Entscheidung: richtig/verspätet/falsch', 'Ballverlust', 'Abschlussart', 'Treffer'], rules: 'Entscheidung und Wurfergebnis getrennt bewerten.' },
        coachingCues: ['Richtungs- oder Sperrsignal erst nach Bewegungsbeginn geben.', 'Direkten Abschluss, kontrollierten Stopp oder Richtungswechsel passend zum Signal wählen.']
      },
      {
        title: 'Kontrolliertes Eins-gegen-eins', durationMinutes: 15,
        repetitions: { attacksPerPlayer: 8, totalPossessions: 16, maxDribbles: 3 },
        measurementMethod: { metrics: ['erzeugter Vorteil', 'erreichter Abschluss', 'Treffer', 'Ballverlust', 'genutzte Seite', 'Coach-Entscheidungsbewertung'], rules: 'Transferbeobachtung, kein standardisierter Vergleichstest.' },
        coachingCues: ['Start am Flügel; Verteidiger mit etwa einer halben Armlänge seitlichem Nachteil.', 'Vorteil mit höchstens drei Dribblings nutzen.']
      },
      {
        title: 'Kontrollmessung nach Coaching', durationMinutes: 5,
        repetitions: { finishProblem: '5 Korbleger je Seite', shotProblem: '10 Würfe aus zwei Positionen', ballControlProblem: '1 gemessener Kontrollparcours' },
        measurementMethod: { metrics: ['Kontrollwert nach Coaching'], rules: 'Nur wichtigsten Korrekturbereich wiederholen. Kontrollwert getrennt speichern; Baseline niemals ersetzen.' },
        coachingCues: ['Identische Bedingungen des gewählten Ausgangstests verwenden.']
      },
      {
        title: 'Reflexion und Wochenaufgaben', durationMinutes: 5,
        repetitions: { questions: 3 },
        measurementMethod: { metrics: ['Was funktionierte am besten?', 'Was war am schwierigsten?', 'Welcher Hinweis soll im nächsten Training angewendet werden?'] },
        coachingCues: ['Private Coach-Notiz, Spielerfeedback und Wochenfokus getrennt speichern.', 'Wochenfokus mit höchstens zwei Hinweisen erst nach Coach-Freigabe veröffentlichen.']
      }
    ]
  };
}

function assessmentUnit(unitNumber) {
  const final = unitNumber === 8;
  return {
    templateKey: `pilot-2026-unit-${unitNumber}`, version: 1,
    title: final ? 'Piloteinheit 8 – Abschlusstest' : 'Piloteinheit 4 – Zwischenmessung',
    objective: final
      ? 'Standardisierten 60-Minuten-Abschlusstest durchführen und anschließend individuell auswerten und die nächsten Schritte planen.'
      : 'Standardisierte Zwischenmessung durchführen und anschließend einen getrennten Entwicklungsblock nutzen.',
    exercises: [
      testWarmup,
      ...baselineMeasurements,
      {
        title: 'Pausen, Vollständigkeitsprüfung und Kurzreflexion', durationMinutes: 15,
        repetitions: { validationPasses: 1 },
        measurementMethod: { metrics: ['Vollständigkeit', 'Vergleichbarkeit'], rules: 'Wiederholung nur bei dokumentiertem äußeren Fehler; Fehlwurf oder schlechte Ausführung sind kein Wiederholungsgrund.' },
        coachingCues: ['Ballkontrolle, Abschluss und Wurf getrennt vergleichen; keine Gesamtnote bilden.']
      },
      final ? {
        title: 'Auswertung und Zukunftsplanung', durationMinutes: 45,
        repetitions: { digitalReflectionMinutes: 10, thomasConversationMinutes: 15, adnanConversationMinutes: 15, jointCloseMinutes: 5 },
        measurementMethod: { metrics: ['individuelle Reflexion', 'nächste Entwicklungsschritte'], rules: 'Persönliche Ergebnisse nicht gemeinsam offenlegen; kein neuer Vergleichstest und kein neues technisches Thema.' },
        coachingCues: ['Während des jeweils anderen Einzelgesprächs selbstständige Aufgabe geben.', 'Gemeinsamer Abschluss enthält keine persönlichen Leistungsdaten.']
      } : {
        title: 'Separater Entwicklungsblock', durationMinutes: 45,
        repetitions: { durationMinutes: 45 },
        measurementMethod: { metrics: [], rules: 'Getrennt von der Zwischenmessung dokumentieren; keine zusätzlichen Vergleichsversuche und keine Veränderung der Testwerte.' },
        coachingCues: ['Standardmäßig Basketball-IQ wählen.', 'Alternativ einen neuen technischen Schwerpunkt beginnen.']
      }
    ]
  };
}

export function pilotSessionTemplate(unitNumber) {
  if (Number(unitNumber) === 1) return unitOne();
  if ([4, 8].includes(Number(unitNumber))) return assessmentUnit(Number(unitNumber));
  return null;
}

export function pilotRoadmap() {
  return pilotDates.map((scheduledDate, index) => {
    const unitNumber = index + 1;
    const template = pilotSessionTemplate(unitNumber);
    return {
      unitNumber,
      scheduledDate,
      durationMinutes: 105,
      kind: template ? 'assessment' : 'development',
      title: template?.title || `Piloteinheit ${unitNumber} – individuelle Entwicklung`,
      objective: template?.objective || 'Der konkrete Schwerpunkt wird nach der vorherigen Montagseinheit aus den Messwerten, Beobachtungen und dem Wochenfeedback erstellt.',
      template
    };
  });
}

export function assertTemplateDuration(template, expected = 105) {
  const total = (template?.exercises || []).reduce((sum, exercise) => sum + Number(exercise.durationMinutes || 0), 0);
  if (total !== expected) throw new Error(`Pilotvorlage hat ${total} statt ${expected} Minuten.`);
  return total;
}
