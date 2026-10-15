import assert from 'node:assert/strict';
import { findIndividualProfile } from '../api/_lib/individual-access.js';
import { createIndividualOverviewHandler } from '../api/individual/overview.js';
import { createIndividualManageHandler } from '../api/individual/manage.js';

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
