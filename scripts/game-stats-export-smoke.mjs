import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSession,appendEvent} from '../js/live-game/core.mjs';
import {buildGameStatsExport,renderGameStatsExport} from '../js/live-game/export.mjs';
let session=createSession({schemaVersion:3,id:'export-test',deviceId:'d',actorId:'u',roster:Array.from({length:6},(_,i)=>({id:'p'+i,name:'Spieler '+i,jerseyNumber:i===5?'00':String(i)})),startingFive:['p0','p1','p2','p3','p4'],config:{periods:4,periodMs:600000,overtimeMs:300000}});
const game={id:'g1',date:'2026-10-11',home:'Gast',away:'TSV Lindau',score:'99:88',playerStats:[{points:999}],atlas:{points:999}};
const args=()=>({game,session,teamId:'herren1',sourceId:'team-source',ownSide:'away',now:new Date('2026-10-11T18:00:00Z')});
assert.throws(()=>buildGameStatsExport(args()),/abschließen/);
function add(kind,payload={},remainingMs=600000){session=appendEvent(session,{id:'e'+(session.events.length+1),sessionId:session.id,seq:session.events.length+1,period:1,remainingMs,recordedAt:'2026-10-11T17:00:00Z',kind,payload});}
add('clock-start',{startedAtMs:1000});add('clock-pause',{},540000);
add('stat',{playerId:'p0',action:'three-made'},540000);add('opponent-score',{points:2},540000);add('finish',{},540000);
const snapshot=JSON.stringify({session,game});let packet=buildGameStatsExport(args());
assert.equal(packet.format,'courthub.game-stats');assert.equal(packet.game.season,'2026/2027');assert.equal(packet.game.isHome,false);assert.equal(packet.game.opponentName,'Gast');
assert.equal(packet.game.ourScore,3);assert.equal(packet.game.opponentScore,null);assert.equal(packet.players[0].plusMinus,null);
assert.equal(packet.players[0].minutesSeconds,60);assert.equal(packet.players[0].threePointsMade,1);assert.equal(packet.players[0].threePointsAttempted,1);
assert.equal(packet.players[1].points,0);assert.equal(packet.players[5].participation,'dnp');assert.equal(packet.players[5].number,'00');assert.equal(packet.game.statsStatus,'partial');
assert.equal(JSON.stringify({session,game}),snapshot,'Export must not change game, live events or other sources.');
add('score-coverage',{complete:true},540000);packet=buildGameStatsExport(args());assert.equal(packet.game.opponentScore,2);assert.equal(packet.players[0].plusMinus,1);
assert.throws(()=>buildGameStatsExport({...args(),teamId:'herren'}),/Mannschaft/);assert.throws(()=>buildGameStatsExport({...args(),ownSide:''}),/Heim/);
assert.equal(buildGameStatsExport({...args(),game:{...game,date:'2026-06-30'}}).game.season,'2025/2026');
const dom=new JSDOM('<main></main>');globalThis.window=dom.window;globalThis.document=dom.window.document;
const settings={};let downloaded;window.BT={storage:{getSetting:(k,f)=>settings[k]??f,setSetting:(k,v)=>settings[k]=v},sync:{getState:()=>({user:{organization:{id:'org-test'}}})},util:{downloadBlob:(filename,blob)=>downloaded={filename,blob}}};
const view=renderGameStatsExport({game,session});document.body.append(view);assert.equal(view.querySelector('[data-field="export-side"]').value,'away');
view.querySelector('button').click();await new Promise(r=>setTimeout(r,0));const file=JSON.parse(await downloaded.blob.text());assert.equal(file.sourceId,'org-test');assert.equal(file.game.teamId,'herren1');assert.match(downloaded.filename,/^courthub-spielstatistik-2026-10-11-g1.json$/);assert.match(view.textContent,/exportiert/);
// Allow the integration audit to use exactly the output produced by the UI.
if(process.env.EXPORT_FIXTURE_PATH){const {writeFileSync}=await import('node:fs');writeFileSync(process.env.EXPORT_FIXTURE_PATH,JSON.stringify(file));}
dom.window.close();console.log('Game stats export: finished guard, raw stats, score coverage, DNP, away role, stable identity and JSON download passed.');
