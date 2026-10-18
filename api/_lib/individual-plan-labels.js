// Server-owned labels are the only titles allowed out of a private AI plan.
export const INDIVIDUAL_EXERCISE_LABELS = Object.freeze({
  checkin: 'Ankommen und Tagesform', warmup: 'Aufwärmen', ballhandling: 'Ballkontrolle',
  finishing: 'Korbabschlüsse', shooting: 'Wurftraining', freethrows: 'Freiwürfe',
  passing: 'Passspiel', footwork: 'Fußarbeit', rebounding: 'Rebounds', defense: 'Verteidigung',
  pickandroll: 'Pick-and-Roll', decision: 'Entscheidungstraining',
  cooldown: 'Ausklang', reflection: 'Rückblick', technique: 'Individuelle Technik'
});

export function individualExerciseLabel(key) {
  return Object.hasOwn(INDIVIDUAL_EXERCISE_LABELS, key || '')
    ? INDIVIDUAL_EXERCISE_LABELS[key] : INDIVIDUAL_EXERCISE_LABELS.technique;
}
