// Opt-in integration validation. Every application query uses a fresh, disposable
// PostgreSQL schema; public and existing accounts are never used as test data.
import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

if (process.env.COURTHUB_REAL_DB_TEST !== 'isolated-schema') {
  throw new Error('Echter Datenbanktest benötigt COURTHUB_REAL_DB_TEST=isolated-schema und eine ausdrücklich gewählte Testdatenbank.');
}
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[SENSITIVE]')) throw new Error('Testdatenbankverbindung fehlt.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suffix = randomBytes(8).toString('hex');
const schema = `courthub_validation_${suffix}`;
assert.match(schema, /^courthub_validation_[a-f0-9]{16}$/);
const connectionUrl = new URL(process.env.DATABASE_URL);
connectionUrl.searchParams.delete('options');
connectionUrl.searchParams.set('sslmode', 'verify-full');
const control = new pg.Client({connectionString: connectionUrl.href, connectionTimeoutMillis: 10000});
let pool, created = false, failure;
const evidence = {kind: 'real-postgresql-isolated-schema', productionVerified: false, success:false, checks: []};
const directory=resolve(root,'.superpowers/db-migration');
await mkdir(directory,{recursive:true});
const evidencePath=resolve(directory,'real-database-validation.json');
await writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
const record = name => { evidence.checks.push(name); console.log('OK:', name); };

function response() {
  return {statusCode:200, headers:{}, setHeader(k,v){this.headers[k]=v;}, status(n){this.statusCode=n;return this;}, json(value){this.body=value;return this;}};
}

try {
  await control.connect();
  await control.query(`CREATE SCHEMA ${schema}`);
  created = true;
  // Omitting public here is essential: IF NOT EXISTS must create test tables,
  // never resolve an existing application table in the public schema.
  await control.query(`SET search_path TO ${schema}`);
  await control.query(await readFile(resolve(root,'schema.sql'),'utf8'));
  await control.query(await readFile(resolve(root,'migrations/20261015_0001_individual_training.sql'),'utf8'));
  pool = new pg.Pool({connectionString:connectionUrl.href, options:`-c search_path=${schema},public`, max:3, connectionTimeoutMillis:10000});
  globalThis.__beepTestPool = pool;
  process.env.JWT_SECRET = randomBytes(48).toString('base64url');
  process.env.BOOTSTRAP_ADMIN_EMAIL = `coach-${suffix}@example.invalid`;
  process.env.TEAM_SLUG = `validation-${suffix}`;
  process.env.TEAM_NAME = 'CourtHub – ausdrücklich isoliertes Testteam';
  process.env.PUBLIC_APP_URL = 'https://coach.tsv-lindau.de';
  const handlers = Object.fromEntries(await Promise.all([
    ['register','auth/register'],['login','auth/login'],['me','auth/me'],
    ['manage','individual/manage'],['overview','individual/overview'],
    ['invite','individual/invite'],['sync','individual/sync']
  ].map(async ([key,path])=>[key,(await import(`../api/_handlers/${path}.js`)).default])));
  async function call(key, {token,body,query={},status=200}={}) {
    const res=response();
    await handlers[key]({method:body?'POST':'GET',body,query,headers:token?{authorization:`Bearer ${token}`}:{ }},res);
    assert.equal(res.statusCode,status,`${key}: ${JSON.stringify(res.body)}`);
    return res.body;
  }
  const password=randomBytes(24).toString('base64url');
  const coach=await call('register',{body:{email:process.env.BOOTSTRAP_ADMIN_EMAIL,displayName:'Isolierter Testcoach',password},status:201});
  const token=coach.token;
  assert.equal(coach.user.role,'admin');
  const login=await call('login',{body:{email:coach.user.email,password}});
  assert.equal(login.user.id,coach.user.id);
  await call('login',{body:{email:coach.user.email,password:'falsches-passwort'},status:401});
  record('Echte Trainerregistrierung, Passwort-Hash und Login');
  const org=coach.user.organization.id;
  await pool.query('UPDATE workspaces SET data=$1::jsonb WHERE organization_id=$2',[JSON.stringify({players:[{id:'test-player-one',name:'Testspieler Eins'},{id:'test-player-two',name:'Testspieler Zwei'}]}),org]);
  const profiles=[];
  for(const id of ['test-player-one','test-player-two']) {
    const r=await call('manage',{token,body:{action:'createProfile',playerProfileId:id},status:201});profiles.push(r.profile);
  }
  const pilot=await call('manage',{token,body:{action:'ensurePilotStart'}});
  assert.equal(pilot.detailsComplete,true,'Termindetails und Trainingspläne müssen vollständig persistieren.');
  const session=pilot.session;
  const coachView=await call('overview',{token});
  assert.equal(coachView.plans.length,2);
  assert.equal(coachView.exercises.filter(e=>e.individual_profile_id===profiles[0].id).reduce((n,e)=>n+e.duration_minutes,0),105);
  record('Montagseinheit und beide 105-Minuten-Pläne echt gespeichert');
  const firstInvitation=await call('manage',{token,body:{action:'createInvite',profileId:profiles[0].id},status:201});
  const hours=(new Date(firstInvitation.invite.expires_at)-Date.now())/3600000;
  assert(hours>71.99&&hours<=72,'Standardgültigkeit muss 72 Stunden ab Erstellung sein.');
  const otherInvitation=await call('manage',{token,body:{action:'createInvite',profileId:profiles[1].id},status:201});
  assert.notEqual(firstInvitation.token,otherInvitation.token,'Jedes Spielerprofil benötigt einen eigenen Code.');
  await pool.query('UPDATE individual_invites SET expires_at=clock_timestamp()-interval \'1 second\' WHERE individual_profile_id=$1',[profiles[1].id]);
  await call('invite',{query:{token:otherInvitation.token},status:410});
  const concurrentInvites=await Promise.all([1,2].map(()=>call('manage',{token,body:{action:'createInvite',profileId:profiles[0].id},status:201})));
  const activeInvites=await pool.query('SELECT token_hash FROM individual_invites WHERE individual_profile_id=$1 AND used_at IS NULL AND revoked_at IS NULL',[profiles[0].id]);
  assert.equal(activeInvites.rows.length,1,'Auch parallele Erzeugung darf nur eine aktuelle Einladung pro Profil behalten.');
  const {createHash}=await import('node:crypto');
  const invitation=concurrentInvites.find(i=>createHash('sha256').update(i.token).digest('hex')===activeInvites.rows[0].token_hash);
  assert(invitation);
  await call('invite',{query:{token:firstInvitation.token},status:410});
  record('72 Stunden, eigene Codes je Profil, Ablauf, Ersatz und parallele Erzeugung geprüft');
  const publicInvite=await call('invite',{query:{token:invitation.token}});
  assert.equal(publicInvite.valid,true);
  assert.deepEqual(Object.keys(publicInvite).sort(),['expiresAt','valid']);
  const playerEmail=`player-${suffix}@example.invalid`;
  const race=await Promise.all([playerEmail,`race-${suffix}@example.invalid`].map(async email=>{
    const res=response();await handlers.register({method:'POST',body:{email,displayName:'Isolierter Testspieler',password,individualInviteToken:invitation.token},headers:{}},res);return res;
  }));
  assert.deepEqual(race.map(r=>r.statusCode).sort(),[201,403],'Genau eine von zwei parallelen Personen darf ein Konto erhalten.');
  const player=race.find(r=>r.statusCode===201).body;
  assert.equal(player.user.role,'player');
  assert.equal(player.user.individualProfileId,profiles[0].id);
  await call('invite',{query:{token:invitation.token},status:410});
  await call('register',{body:{email:`reuse-${suffix}@example.invalid`,displayName:'Unerlaubte Zweitnutzung',password,individualInviteToken:invitation.token},status:403});
  const playerLogin=await call('login',{body:{email:player.user.email,password}});
  assert.equal(playerLogin.user.individualProfileId,profiles[0].id);
  record('Echte Einmal-Einladung, Spielerregistrierung und erneute Anmeldung');
  await call('manage',{token:player.token,body:{action:'createInvite',profileId:profiles[1].id},status:403});
  await call('manage',{token,body:{action:'addCoachNote',profileId:profiles[0].id,note:'PRIVATE TESTNOTIZ'},status:201});
  await call('manage',{token,body:{action:'saveMeasurement',profileId:profiles[0].id,sessionId:session.id,metricKey:'trainernotiz',textValue:'PRIVATE TESTNOTIZ'},status:201});
  const playerView=await call('overview',{token:player.token,query:{profileId:profiles[1].id}});
  assert.equal(playerView.profiles.length,1);
  assert.equal(playerView.profiles[0].id,profiles[0].id);
  assert(!JSON.stringify(playerView).includes('PRIVATE TESTNOTIZ'));
  assert(!('coachNotes' in playerView));
  assert(!playerView.measurements.some(m=>m.metric_key==='trainernotiz'));
  record('Spielerrolle, eigenes Profil und Schutz privater Trainernotizen');
  const focus=await call('manage',{token,body:{action:'setFocus',profileId:profiles[0].id,sessionId:session.id,title:'Linke Hand einsetzen',cueOne:'Blick nach vorne',successIndicator:'Drei bewusste Abschlüsse',validFrom:'2026-10-20',validUntil:'2026-10-25'},status:201});
  assert.equal(focus.focus.valid_from,'2026-10-20','Kalendertage müssen ohne Uhrzeit und Zeitzonenverschiebung ankommen.');
  const datedOverview=await call('overview',{token:player.token});
  assert.equal(datedOverview.focuses[0].valid_until,'2026-10-25');
  const mutations=[
    {mutationId:`attendance-${suffix}`,kind:'attendance',payload:{entityId:session.id,status:'confirmed'}},
    {mutationId:`readiness-${suffix}`,kind:'readiness',payload:{entityId:session.id,score:8}},
    {mutationId:`feedback-${suffix}`,kind:'weekly_feedback',payload:{entityId:randomUUID(),focusId:focus.focus.id,trainingDay:'friday',trainingDate:'2026-10-23',occurrence:'often',implementationScore:4,note:'Isolierte echte Datenbank-Rückmeldung'}}
  ];
  const synced=await call('sync',{token:player.token,body:{mutations}});
  assert.equal(synced.results.length,3);
  assert(synced.results.every(r=>r.applied),JSON.stringify(synced));
  const duplicate=await call('sync',{token:player.token,body:{mutations}});
  assert(duplicate.results.every(r=>r.applied&&r.duplicate));
  // A fresh independent connection proves COMMIT/persistence, not an in-memory fixture.
  const observer=new pg.Client({connectionString:connectionUrl.href,options:`-c search_path=${schema},public`});
  try{
    await observer.connect();
    const saved=await observer.query('SELECT note FROM individual_weekly_feedback WHERE individual_profile_id=$1',[profiles[0].id]);
    assert.equal(saved.rows[0].note,mutations[2].payload.note);
  }finally{await observer.end();}
  const received=await call('overview',{token:login.token});
  assert(received.sessions.some(s=>s.individual_profile_id===profiles[0].id&&s.attendance_status==='confirmed'));
  assert.equal(received.readiness[0].score,8);
  assert.equal(received.feedback[0].note,mutations[2].payload.note);
  record('Zusage, Tagesform und Freitagsfeedback nach COMMIT im getrennten Trainerkonto sichtbar');
  record('Wiederholung desselben Offline-Batches ohne doppelte Einträge');
  const failed=await call('sync',{token:player.token,body:{mutations:[{mutationId:`forbidden-${suffix}`,kind:'readiness',payload:{entityId:randomUUID(),score:8}}]}});
  assert.equal(failed.results[0].applied,false);
  record('Nicht zugeordneter Termin serverseitig abgewiesen');
  if(process.env.COURTHUB_REAL_DB_BROWSER==='1') {
    const invitationTwo=await call('manage',{token,body:{action:'createInvite',profileId:profiles[1].id},status:201});
    await call('manage',{token,body:{action:'setFocus',profileId:profiles[1].id,sessionId:session.id,title:'Linke Hand einsetzen',cueOne:'Blick nach vorne',successIndicator:'Drei bewusste Abschlüsse',validFrom:'2026-10-20',validUntil:'2026-10-25'},status:201});
    const {validateRealDatabaseBrowser}=await import('./individual-real-db-browser.mjs');
    await validateRealDatabaseBrowser({root,handlers,invitation:invitationTwo,password,coachEmail:coach.user.email,playerEmail:`mobile-${suffix}@example.invalid`,profileId:profiles[1].id});
    const mobileReceived=await call('overview',{token:login.token});
    assert(mobileReceived.feedback.some(f=>f.individual_profile_id===profiles[1].id&&f.note==='Echte mobile Rückmeldung angekommen.'));
    record('Mobiler Browser ohne API-Fixtures: QR → Registrierung → eigene Seiten → Rückmeldung im Trainerkonto');
  }
  evidence.success=true;
} catch(error) {
  failure=error;
  throw error;
} finally {
  const cleanupErrors=[];
  try{
    try{if(pool)await pool.end();}catch(error){cleanupErrors.push(error);}
    if(created){
      try{
        // Recover from a failed BEGIN/COMMIT migration before removing its schema.
        await control.query('ROLLBACK');
        assert.match(schema,/^courthub_validation_[a-f0-9]{16}$/);
        await control.query(`DROP SCHEMA ${schema} CASCADE`);
        evidence.testSchemaRemoved=true;
      }catch(error){cleanupErrors.push(error);}
    }
  }finally{
    try{await control.end();}catch(error){cleanupErrors.push(error);}
    if(failure||cleanupErrors.length)evidence.success=false;
    evidence.cleanupErrorCount=cleanupErrors.length;
    await writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  }
  if(cleanupErrors.length){
    if(!failure)throw new AggregateError(cleanupErrors,'Testschema konnte nicht vollständig aufgeräumt werden.');
    console.error('Zusätzlich fehlgeschlagene Cleanup-Schritte:',cleanupErrors.length);
  }
}
console.log('Echte PostgreSQL-Abnahme mit isolierten Testkonten erfolgreich. Produktionsumschaltung bleibt separat zu prüfen.');
