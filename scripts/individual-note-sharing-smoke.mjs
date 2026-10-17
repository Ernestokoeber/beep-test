import assert from 'node:assert/strict';
import {createIndividualManageHandler} from '../api/_handlers/individual/manage.js';
const profile={id:'11111111-1111-4111-8111-111111111111',organization_id:'22222222-2222-4222-8222-222222222222',coach_user_id:'33333333-3333-4333-8333-333333333333'};
let role='coach',writes=[];
const handler=createIndividualManageHandler({requireMembership:async()=>({sub:profile.coach_user_id,organization_id:profile.organization_id,role}),transaction:async fn=>fn({query:async(sql,params)=>{
 if(sql.includes('FROM individual_profiles'))return {rows:[profile]};
 if(sql.includes('INSERT INTO')){writes.push(sql);return {rows:[{id:'saved-note',content:params[2],note:params[2]}]};}
 return {rows:[]};
}})});
async function call(body){const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}};await handler({method:'POST',body:{profileId:profile.id,...body},headers:{}},res);return res;}
for(const flag of [undefined,false,'true',1]){
 writes=[];const result=await call({action:'saveReleasedFeedback',content:'Nicht als Spielernotiz gekennzeichnet',...(flag===undefined?{}:{shareWithPlayer:flag})});
 assert.equal(result.statusCode,403,'Ohne ausdrückliche boolesche Freigabe darf keine Spielernotiz entstehen.');
 assert.equal(writes.length,0);
}
writes=[];assert.equal((await call({action:'saveReleasedFeedback',content:'Bewusst freigegebene Spielernotiz',shareWithPlayer:true})).statusCode,201);
assert.equal(writes.length,1);assert(writes[0].includes('individual_released_feedback'));
writes=[];assert.equal((await call({action:'addCoachNote',note:'Privat bleibt privat',shareWithPlayer:true})).statusCode,201);
assert.equal(writes.length,1);assert(writes[0].includes('individual_coach_notes'));
role='player';writes=[];assert.equal((await call({action:'saveReleasedFeedback',content:'Keine eigene Freigabe',shareWithPlayer:true})).statusCode,403);assert.equal(writes.length,0);
console.log('Trainernotizen: nur ausdrückliche Coach-Freigabe veröffentlicht, fehlende/falsche Markierung und Spielerfreigaben gesperrt, private Notiz bleibt privat.');
