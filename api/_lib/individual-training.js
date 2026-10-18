const SESSION_STATUSES = new Set(['planned', 'cancelled', 'in_progress', 'completed']);
const ATTENDANCE_STATUSES = new Set(['pending', 'confirmed', 'declined', 'attended', 'unexcused_no_show']);
const OCCURRENCES = new Set(['often', 'sometimes', 'none', 'training_cancelled', 'not_participated']);
const TERMINAL_OCCURRENCES = new Set(['training_cancelled', 'not_participated']);
const DRAFT_STATUSES = new Set(['queued', 'generating', 'current', 'stale', 'failed', 'approved']);

export const INDIVIDUAL_TIMEZONE = 'Europe/Berlin';
export const MAX_ACTIVE_PLAYERS_PER_COACH = 3;
export const MAX_SESSION_PARTICIPANTS = 2;
export const PILOT_TARGET_UNITS = 8;
export const PILOT_START_DATE = '2026-10-19';
export const PILOT_CLOSED_MONDAYS = new Set(['2026-11-02']);

export function text(value, field, { min = 1, max = 500 } = {}) {
  const normalized = String(value ?? '').trim();
  if (normalized.length < min || normalized.length > max) {
    throw new TypeError(`${field} muss ${min} bis ${max} Zeichen enthalten.`);
  }
  return normalized;
}

export function optionalText(value, field, options) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  return text(value, field, options);
}

export function uuid(value, field = 'ID') {
  const normalized = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new TypeError(`${field} ist ungültig.`);
  }
  return normalized;
}

export function mutationId(value) {
  return text(value, 'Mutations-ID', { min: 8, max: 120 });
}

export function validateReadiness(value) {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new TypeError('Tagesform muss zwischen 1 und 10 liegen.');
  }
  return value;
}

export function validateChangeReason(value) {
  return text(value, 'Änderungsgrund', { min: 2, max: 240 });
}

export function validateSessionStatus(value) {
  if (!SESSION_STATUSES.has(value)) throw new TypeError('Ungültiger Einheitenstatus.');
  return value;
}

export function validateAttendanceStatus(value) {
  if (!ATTENDANCE_STATUSES.has(value)) throw new TypeError('Ungültiger Teilnahmestatus.');
  return value;
}

export function validateWeeklyFeedback(input) {
  const occurrence = String(input?.occurrence || '');
  if (!OCCURRENCES.has(occurrence)) throw new TypeError('Ungültige Rückmeldung zur Trainingsgelegenheit.');
  const rawScore = input?.implementationScore;
  const implementationScore = rawScore === undefined || rawScore === null || rawScore === '' ? null : Number(rawScore);
  if (TERMINAL_OCCURRENCES.has(occurrence)) {
    if (implementationScore !== null) throw new TypeError('Bei Ausfall oder Nichtteilnahme wird keine Umsetzung bewertet.');
  } else if (!Number.isInteger(implementationScore) || implementationScore < 1 || implementationScore > 5) {
    throw new TypeError('Die Umsetzung muss zwischen 1 und 5 liegen.');
  }
  return {
    occurrence,
    implementationScore,
    note: optionalText(input?.note, 'Notiz', { min: 1, max: 1000 })
  };
}

export function shouldStopFeedbackReminders(occurrence) {
  return TERMINAL_OCCURRENCES.has(occurrence);
}

export function completedUnitCount(sessions) {
  return (sessions || []).filter(session => session?.status === 'completed').length;
}

export function nextUnitNumber(sessions) {
  return Math.min(completedUnitCount(sessions) + 1, PILOT_TARGET_UNITS);
}

export function nextOpenPilotMonday(latestScheduledDate = null) {
  if (!latestScheduledDate) return PILOT_START_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(latestScheduledDate))) throw new TypeError('Letzter Trainingstermin ist ungültig.');
  const next = new Date(`${latestScheduledDate}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 7);
  let date = next.toISOString().slice(0, 10);
  while (PILOT_CLOSED_MONDAYS.has(date)) {
    next.setUTCDate(next.getUTCDate() + 7);
    date = next.toISOString().slice(0, 10);
  }
  return date;
}

export function assertParticipantCapacity(participantIds) {
  const unique = [...new Set((participantIds || []).filter(Boolean))];
  if (unique.length < 1 || unique.length > MAX_SESSION_PARTICIPANTS) {
    throw new RangeError('Eine Individualeinheit benötigt mindestens einen und höchstens zwei Teilnehmer.');
  }
  return unique;
}

export function assertCoachCapacity(activeProfileIds) {
  const unique = [...new Set((activeProfileIds || []).filter(Boolean))];
  if (unique.length > MAX_ACTIVE_PLAYERS_PER_COACH) {
    throw new RangeError('Ein Trainer darf höchstens drei aktive Spieler im Individualtraining betreuen.');
  }
  return unique;
}

export function chooseServerLastWrite(left, right) {
  const leftTime = Date.parse(left?.serverReceivedAt || '');
  const rightTime = Date.parse(right?.serverReceivedAt || '');
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    throw new TypeError('Für den Abgleich ist eine gültige Server-Eingangszeit erforderlich.');
  }
  if (leftTime !== rightTime) return leftTime > rightTime ? left : right;
  return String(left.mutationId || '').localeCompare(String(right.mutationId || '')) >= 0 ? left : right;
}

export function validateDraftStatus(value) {
  if (!DRAFT_STATUSES.has(value)) throw new TypeError('Ungültiger KI-Entwurfsstatus.');
  return value;
}

export function canApproveDraft(draft) {
  return draft?.status === 'current' && draft?.content && typeof draft.content === 'object';
}

export function staleDraft(draft) {
  validateDraftStatus(draft?.status);
  if (draft.status === 'approved') throw new Error('Ein bereits freigegebener Entwurf wird nicht nachträglich umgeschrieben.');
  return { ...draft, status: 'stale', approvedAt: null, approvedBy: null };
}

export function reminderKey(profileId, kind, dueAt) {
  return `${profileId}:${kind}:${new Date(dueAt).toISOString()}`;
}

function partsInTimeZone(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

export function zonedDateTimeToInstant(date, time, timeZone = INDIVIDUAL_TIMEZONE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}(:\d{2})?$/.test(String(time))) {
    throw new TypeError('Lokaler Erinnerungstermin ist ungültig.');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desiredUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = partsInTimeZone(new Date(guess), timeZone);
    const observedUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    const correction = desiredUtc - observedUtc;
    guess += correction;
    if (correction === 0) break;
  }
  return new Date(guess).toISOString();
}

export function buildWeeklyReminderPlan({ profileId, sessionAt, fridayDate, suspended = false }) {
  if (suspended) return [];
  const session = new Date(sessionAt);
  if (!Number.isFinite(session.getTime())) throw new TypeError('Montagstermin ist ungültig.');
  const mondayReminder = new Date(session.getTime() - 120 * 60 * 1000).toISOString();
  const fridayFocus = zonedDateTimeToInstant(fridayDate, '18:15:00');
  const saturday = new Date(`${fridayDate}T12:00:00Z`);
  saturday.setUTCDate(saturday.getUTCDate() + 1);
  const saturdayFeedback = zonedDateTimeToInstant(saturday.toISOString().slice(0, 10), '12:00:00');
  return [
    ['attendance', mondayReminder],
    ['focus', fridayFocus],
    ['feedback_request', saturdayFeedback]
  ].map(([kind, dueAt]) => ({ kind, dueAt, notificationKey: reminderKey(profileId, kind, dueAt) }));
}
