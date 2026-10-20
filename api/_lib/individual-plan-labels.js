// Server-owned labels are the only titles allowed out of a private AI plan.
export const INDIVIDUAL_EXERCISE_LABELS = Object.freeze({
  checkin: 'Ankommen und Tagesform', warmup: 'Aufwärmen', ballhandling: 'Ballkontrolle',
  finishing: 'Korbabschlüsse', shooting: 'Wurftraining', freethrows: 'Freiwürfe',
  passing: 'Passspiel', footwork: 'Fußarbeit', rebounding: 'Rebounds', defense: 'Verteidigung',
  pickandroll: 'Pick-and-Roll', decision: 'Entscheidungstraining',
  cooldown: 'Ausklang', reflection: 'Rückblick', technique: 'Individuelle Technik'
});

const ROLE_EXERCISE_LABELS = Object.freeze({
  point_guard: Object.freeze({
    ballhandling: 'Point Guard · Ballkontrolle', passing: 'Point Guard · Passspiel & Blick',
    decision: 'Point Guard · Vorteilsentscheidungen', pickandroll: 'Pick-and-Roll · Ballhandler',
    finishing: 'Point Guard · Guard-Abschlüsse', shooting: 'Point Guard · Wurfvorbereitung'
  }),
  center: Object.freeze({
    finishing: 'Center · Abschluss am Ring', footwork: 'Center · Fußarbeit',
    rebounding: 'Center · Rebound & Box-out', pickandroll: 'Pick-and-Roll · Screener & Roller',
    passing: 'Center · Outlet & Weiterleitung', decision: 'Center · Short-Roll-Entscheidung'
  })
});

export function individualExerciseLabel(key, roleKey = '') {
  if (Object.hasOwn(ROLE_EXERCISE_LABELS[roleKey] || {}, key || '')) return ROLE_EXERCISE_LABELS[roleKey][key];
  return Object.hasOwn(INDIVIDUAL_EXERCISE_LABELS, key || '')
    ? INDIVIDUAL_EXERCISE_LABELS[key] : INDIVIDUAL_EXERCISE_LABELS.technique;
}
