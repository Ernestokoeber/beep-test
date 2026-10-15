import assert from 'node:assert/strict';
import { findIndividualProfile } from '../api/_lib/individual-access.js';
import { createIndividualOverviewHandler } from '../api/_handlers/individual/overview.js';
import { createIndividualManageHandler } from '../api/_handlers/individual/manage.js';

const IDS = {
  profile: '11111111-1111-4111-8111-111111111111',
  otherProfile: '22222222-2222-4222-8222-222222222222',
  session: '33333333-3333-4333-8333-333333333333',
  organization: '44444444-4444-4444-8444-444444444444',
  player: '55555555-5555-4555-8555-555555555555',
  coach: '66666666-6666-4666-8666-666666666666',
  measurement: '77777777-7777-4777-8777-777777777777'
};

function response() {
  return {
    statusCode: 200, body: null, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

const playerAuth = { sub: IDS.player, organization_id: IDS.organization, role: 'player' };
const coachAuth = { sub: IDS.coach, organization_id: IDS.organization, role: 'coach' };
const adminAuth = { sub: IDS.player, organization_id: IDS.organization, role: 'admin' };
let observedPlayerParams = null;
const ownProfile = await findIndividualProfile(playerAuth, IDS.otherProfile, async (_sql, params) => {
  observedPlayerParams = params;
  return { rows: [{ id: IDS.profile, organization_id: IDS.organization, user_id: IDS.player }] };
});
assert.equal(ownProfile.id, IDS.profile);
assert.deepEqual(observedPlayerParams, [IDS.organization, IDS.player], 'Spielerzugriff darf angeforderte fremde Profil-ID nicht verwenden');

const overviewQueries = [];
const playerOverview = createIndividualOverviewHandler({
  requireMembership: async () => playerAuth,
  query: async (sql, params) => {
    overviewQueries.push(sql);
    if (sql.includes('FROM individual_profiles')) return { rows: [{ id: IDS.profile, organization_id: IDS.organization, user_id: IDS.player }] };
    return { rows: [] };
  }
});
const playerOverviewResponse = response();
await playerOverview({ method: 'GET', query: {}, headers: {} }, playerOverviewResponse);
assert.equal(playerOverviewResponse.statusCode, 200);
assert.equal(playerOverviewResponse.body.profiles.length, 1);
assert(!('coachNotes' in playerOverviewResponse.body), 'Spielerantwort enthält private Coach-Notizen');
assert(!('aiDrafts' in playerOverviewResponse.body), 'Spielerantwort enthält private KI-Entwürfe');
assert(!overviewQueries.some(sql => sql.includes('individual_coach_notes')), 'Spielerpfad fragt private Coach-Notizen ab');

const coachOverview = createIndividualOverviewHandler({
  requireMembership: async () => coachAuth,
  query: async sql => {
    if (sql.includes('FROM individual_profiles')) return { rows: [{ id: IDS.profile, organization_id: IDS.organization, coach_user_id: IDS.coach }] };
    return { rows: [] };
  }
});
const coachOverviewResponse = response();
await coachOverview({ method: 'GET', query: {}, headers: {} }, coachOverviewResponse);
assert.equal(coachOverviewResponse.statusCode, 200);
assert.deepEqual(coachOverviewResponse.body.coachNotes, []);
assert.deepEqual(coachOverviewResponse.body.aiDrafts, []);

const forbiddenCreate = createIndividualManageHandler({
  requireMembership: async () => playerAuth,
  transaction: async callback => callback({ query: async () => ({ rows: [] }) })
});
const forbiddenResponse = response();
await forbiddenCreate({ method: 'POST', body: { action: 'createProfile', playerProfileId: 'p1' }, headers: {} }, forbiddenResponse);
assert.equal(forbiddenResponse.statusCode, 403, 'Spieler darf Individualprofile anlegen');

const ensuredSql = [];
let planSequence = 0;
const ensureHandler = createIndividualManageHandler({
  requireMembership: async () => coachAuth,
  transaction: async callback => callback({
    query: async (sql, params) => {
      ensuredSql.push({ sql, params });
      if (sql.includes('SELECT id FROM users')) return { rows: [{ id: IDS.coach }] };
      if (sql.includes('FROM individual_profiles') && sql.includes('active = TRUE')) return { rows: [
        { id: IDS.profile, organization_id: IDS.organization, coach_user_id: IDS.coach },
        { id: IDS.otherProfile, organization_id: IDS.organization, coach_user_id: IDS.coach }
      ] };
      if (sql.includes('FROM individual_sessions') && sql.includes('unit_number = 1')) return { rows: [] };
      if (sql.includes('INSERT INTO individual_sessions')) return { rows: [{ id: IDS.session, scheduled_for: '2026-10-19T18:15:00.000Z', unit_number: 1, status: 'planned' }] };
      if (sql.includes('SELECT id FROM individual_session_plans')) return { rows: [] };
      if (sql.includes('INSERT INTO individual_session_plans')) return { rows: [{ id: `88888888-8888-4888-8888-88888888888${planSequence++}` }] };
      return { rows: [] };
    }
  })
});
const ensureResponse = response();
await ensureHandler({ method: 'POST', headers: {}, body: { action: 'ensurePilotStart' } }, ensureResponse);
assert.equal(ensureResponse.statusCode, 200, 'Verbindlicher Pilotstart wurde nicht automatisch angelegt');
assert.equal(ensureResponse.body.profileIds.length, 2, 'Die gemeinsame Einheit enthält nicht beide Pilotspieler');
assert(ensuredSql.some(item => item.sql.includes('INSERT INTO individual_sessions') && item.params?.[2] === '2026-10-19T18:15:00.000Z'));
assert.equal(ensuredSql.filter(item => item.sql.includes('INSERT INTO individual_session_participants')).length, 2);
assert.equal(ensuredSql.filter(item => item.sql.includes('INSERT INTO individual_session_plans')).length, 2);
const ensuredProfilesQuery = ensuredSql.find(item => item.sql.includes('FROM individual_profiles') && item.sql.includes('active = TRUE'));
assert(ensuredProfilesQuery.sql.includes("$2 = 'admin' OR coach_user_id = $3"), 'Pilotstart muss dieselben Adminprofile wie die Übersicht verwenden');
assert.deepEqual(ensuredProfilesQuery.params, [IDS.organization, 'coach', IDS.coach]);

const adminEnsureSql = [];
const adminEnsureHandler = createIndividualManageHandler({
  requireMembership: async () => adminAuth,
  transaction: async callback => callback({
    query: async (sql, params) => {
      adminEnsureSql.push({ sql, params });
      if (sql.includes('SELECT id FROM users')) return { rows: [{ id: IDS.player }] };
      if (sql.includes('FROM individual_profiles') && sql.includes('active = TRUE')) return { rows: [
        { id: IDS.profile, organization_id: IDS.organization, coach_user_id: IDS.coach },
        { id: IDS.otherProfile, organization_id: IDS.organization, coach_user_id: IDS.coach }
      ] };
      if (sql.includes('FROM individual_sessions') && sql.includes('unit_number = 1')) return { rows: [{ id: IDS.session, scheduled_for: '2026-10-19T18:15:00.000Z', unit_number: 1, status: 'planned' }] };
      if (sql.includes('SELECT id FROM individual_session_plans')) return { rows: [{ id: IDS.measurement }] };
      return { rows: [] };
    }
  })
});
const adminEnsureResponse = response();
await adminEnsureHandler({ method: 'POST', headers: {}, body: { action: 'ensurePilotStart' } }, adminEnsureResponse);
assert.equal(adminEnsureResponse.statusCode, 200, 'Administrator muss sichtbare Pilotprofile automatisch planen können');
const adminProfilesQuery = adminEnsureSql.find(item => item.sql.includes('FROM individual_profiles') && item.sql.includes('active = TRUE'));
assert.deepEqual(adminProfilesQuery.params, [IDS.organization, 'admin', IDS.player]);

const sessionSql = [];
const sessionHandler = createIndividualManageHandler({
  requireMembership: async () => coachAuth,
  transaction: async callback => callback({
    query: async (sql, params) => {
      sessionSql.push({ sql, params });
      if (sql.includes('FROM individual_profiles')) return { rows: [{ id: IDS.profile, organization_id: IDS.organization, coach_user_id: IDS.coach }] };
      if (sql.includes("status = 'completed'")) return { rows: [{ count: 0 }] };
      if (sql.includes('SELECT max((scheduled_for')) return { rows: [{ date: null }] };
      if (sql.includes('INSERT INTO individual_sessions')) return { rows: [{ id: IDS.session, scheduled_for: '2026-10-19T18:15:00.000Z', unit_number: 1 }] };
      if (sql.includes('INSERT INTO individual_session_plans')) return { rows: [{ id: IDS.measurement }] };
      return { rows: [] };
    }
  })
});
const sessionResponse = response();
await sessionHandler({
  method: 'POST', headers: {}, body: {
    action: 'createSession', profileIds: [IDS.profile], scheduledDate: '2026-10-19', scheduledTime: '20:15', durationMinutes: 105
  }
}, sessionResponse);
assert.equal(sessionResponse.statusCode, 201, 'Feste Montagseinheit um 20:15 Uhr wurde nicht angelegt');
assert(sessionSql.some(item => item.sql.includes("'attendance', $3::timestamptz - interval '2 hours'")), 'Montagserinnerung wurde nicht mit der Einheit angelegt');
const invalidSessionResponse = response();
await sessionHandler({
  method: 'POST', headers: {}, body: {
    action: 'createSession', profileIds: [IDS.profile], scheduledDate: '2026-10-19', scheduledTime: '19:30', durationMinutes: 105
  }
}, invalidSessionResponse);
assert.equal(invalidSessionResponse.statusCode, 400, 'Abweichende Montagstartzeit wurde akzeptiert');
assert.match(invalidSessionResponse.body.error, /20:15/);

const attendanceSql = [];
const attendanceHandler = createIndividualManageHandler({
  requireMembership: async () => playerAuth,
  transaction: async callback => callback({
    query: async (sql) => {
      attendanceSql.push(sql);
      if (sql.includes('FROM individual_profiles')) return { rows: [{ id: IDS.profile, organization_id: IDS.organization, user_id: IDS.player }] };
      if (sql.includes('FROM individual_sessions')) return { rows: [{ id: IDS.session, organization_id: IDS.organization, status: 'planned' }] };
      if (sql.includes('UPDATE individual_session_participants')) return { rows: [{ session_id: IDS.session, individual_profile_id: IDS.profile, attendance_status: 'declined' }] };
      if (sql.includes('SELECT attendance_status')) return { rows: [{ attendance_status: 'declined' }, { attendance_status: 'confirmed' }] };
      return { rows: [] };
    }
  })
});
const attendanceResponse = response();
await attendanceHandler({
  method: 'POST', headers: {},
  body: { action: 'setAttendance', profileId: IDS.otherProfile, sessionId: IDS.session, status: 'declined' }
}, attendanceResponse);
assert.equal(attendanceResponse.statusCode, 200);
assert.equal(attendanceResponse.body.attendance.individual_profile_id, IDS.profile);
assert(!attendanceSql.some(sql => sql.includes("SET status = 'cancelled'")), 'Einheit mit verbleibender Zusage wurde fälschlich abgesagt');

const measurementHandler = createIndividualManageHandler({
  requireMembership: async () => coachAuth,
  transaction: async callback => callback({
    query: async sql => {
      if (sql.includes('FROM individual_profiles')) return { rows: [{ id: IDS.profile, organization_id: IDS.organization, coach_user_id: IDS.coach }] };
      if (sql.includes('FROM individual_sessions')) return { rows: [{ id: IDS.session, organization_id: IDS.organization }] };
      return { rows: [] };
    }
  })
});
const measurementResponse = response();
await measurementHandler({
  method: 'POST', headers: {},
  body: {
    action: 'saveMeasurement', profileId: IDS.profile, sessionId: IDS.session,
    measurementId: IDS.measurement, metricKey: 'treffer', numericValue: 7
  }
}, measurementResponse);
assert.equal(measurementResponse.statusCode, 400, 'Nachträgliche Messwertänderung ohne Grund wurde akzeptiert');
assert.match(measurementResponse.body.error, /Änderungsgrund/);

console.log('Individual Training API: Rollen, Isolation, Teilnahme und Änderungsgrund erfolgreich.');
