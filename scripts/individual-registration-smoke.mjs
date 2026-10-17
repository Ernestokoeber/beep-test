// Exercise the real registration, password hashing, token signing and invitation
// claim. Only the unavailable PostgreSQL transport is replaced with a transaction fixture.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import jwt from 'jsonwebtoken';
const token='test-invite-token-with-at-least-32-characters';
const ids={org:'11111111-1111-4111-8111-111111111111',profile:'22222222-2222-4222-8222-222222222222'};
let state={users:[],members:[],invite:{hash:createHash('sha256').update(token).digest('hex'),used:false,revoked:false,expired:false},assigned:null},snapshot;
process.env.DATABASE_URL='postgres://isolated-test.invalid/unused';process.env.JWT_SECRET='isolated-registration-test-secret-'.repeat(3);
async function query(sql,params=[]){
 if(sql==='BEGIN'){snapshot=structuredClone(state);return {rows:[]};}
 if(sql==='COMMIT')return {rows:[]};if(sql==='ROLLBACK'){state=snapshot;return {rows:[]};}
 if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
 if(sql.includes('SELECT 1 FROM users WHERE email'))return {rows:[],rowCount:state.users.filter(u=>u.email===params[0]).length};
 if(sql.includes('count(*)::int AS count FROM users'))return {rows:[{count:state.users.length+1}]};
 if(sql.includes('FROM individual_invites ii')){
  const hashingInSQL=sql.includes('digest(');const hash=hashingInSQL?createHash('sha256').update(params[0]).digest('hex'):params[0];
  assert(sql.includes('ii.used_at IS NULL')&&sql.includes('ii.revoked_at IS NULL')&&sql.includes('ii.expires_at > clock_timestamp()'),'Einladung muss verwendet/widerrufen/abgelaufen ausschließen');
  if(hash!==state.invite.hash||state.invite.used||state.invite.revoked||state.invite.expired)return {rows:[]};
  if(hashingInSQL)return {rows:[{id:ids.org,name:'Testteam',slug:'testteam'}]};
  assert(sql.includes('FOR UPDATE'),'Einlösung benötigt Zeilensperre');return {rows:[{id:'invite-fixture',organization_id:ids.org,individual_profile_id:ids.profile}]};
 }
 if(sql.includes('INSERT INTO users')){assert.notEqual(params[2],'Testpasswort123');assert.match(params[2],/^\$2[aby]\$/);const u={id:'new-user-'+(state.users.length+1),email:params[0],display_name:params[1]};state.users.push(u);return {rows:[u]};}
 if(sql.includes('UPDATE individual_profiles')){assert(sql.includes('user_id IS NULL')&&sql.includes('active = TRUE'));if(state.assigned)return {rows:[],rowCount:0};state.assigned=params[0];return {rows:[{id:ids.profile,player_profile_id:'own-roster-profile'}],rowCount:1};}
 if(sql.includes('UPDATE individual_invites')){state.invite.used=true;return {rows:[],rowCount:1};}
 if(sql.includes('INSERT INTO memberships')){state.members.push(params);return {rows:[],rowCount:1};}
 if(sql.includes('INSERT INTO workspaces'))return {rows:[],rowCount:0};
 throw new Error('Nicht erwartete Datenbankoperation: '+sql);
}
globalThis.__beepTestPool={connect:async()=>({query,release(){}}),query};
const {default:register}=await import('../api/_handlers/auth/register.js');
const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const request=email=>({method:'POST',body:{displayName:'Testspieler',email,password:'Testpasswort123',individualInviteToken:token},headers:{}});
const first=response();await register(request('player@example.invalid'),first);assert.equal(first.code,201,JSON.stringify(first.body));assert.equal(first.body.user.role,'player');assert.equal(first.body.user.individualProfileId,ids.profile);assert.equal(state.members[0][2],'player');assert.equal(jwt.verify(first.body.token,process.env.JWT_SECRET).sub,first.body.user.id);assert.equal(state.invite.used,true);
const replay=response();await register(request('second@example.invalid'),replay);assert.equal(replay.code,403);assert.equal(state.users.length,1,'Zweiter Gebrauch darf kein weiteres Konto anlegen');
state.invite.used=false;state.invite.revoked=true;const revoked=response();await register(request('revoked@example.invalid'),revoked);assert.equal(revoked.code,403);
state.invite.revoked=false;state.invite.expired=true;const expired=response();await register(request('expired@example.invalid'),expired);assert.equal(expired.code,403);
state.invite.expired=false;state.assigned='existing-account';const assigned=response();await register(request('assigned@example.invalid'),assigned);assert.equal(assigned.code,409);assert.equal(state.users.length,1,'Gescheiterte Profilzuordnung muss Kontoanlage zurückrollen');assert.equal(state.members.length,1);
console.log('Echte Registrierungslogik: Passwort-Hash, JWT, Spielerrolle, genaues Profil, Einmaligkeit, Ablauf/Widerruf und Rollback mit isoliertem Datenbanktransport geprüft.');
