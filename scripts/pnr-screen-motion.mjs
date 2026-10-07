import assert from 'node:assert/strict';
import {basketballState} from '../js/play-designer/basketball-choreography.js';
import {basketballFeet} from '../js/play-designer/basketball-footwork.js';
for(const variant of ['pick-and-roll','pick-and-pop','pick-and-roll-reject']){
 const windows=basketballState(0,variant).screenWindows;
 for(const [start,end] of windows){
  const first=basketballState(start+.01,variant).actors[4];
  for(let t=start+.01;t<end-.01;t+=1/60){
   const {actors}=basketballState(t,variant),big=actors[4];
   assert.equal(big.screen,true);assert.equal(big.speed,0);
   assert.equal(big.x,first.x);assert.equal(big.z,first.z);assert.equal(big.yaw,first.yaw);
   const feet=basketballFeet(t,4,variant),planted=basketballFeet(start+.01,4,variant);
   assert.deepEqual(feet,planted);assert.equal(feet.l.height,0);assert.equal(feet.r.height,0);
   // Standing torso clearance is maintained; the defender goes around the
   // screen instead of crossing through it, and the guard brushes its side.
   for(const i of [0,5])assert.ok(Math.hypot(big.x-actors[i].x,big.z-actors[i].z)>.42,`${variant}: torso intersection at ${t}`);
  }
  assert.equal(basketballState(end+.01,variant).actors[4].screen,false);
 }
 const finalScreenEnd=windows.at(-1)[1];
 let guardClearance=Infinity,defenderClearance=Infinity;
 const lastStart=windows.at(-1)[0];
 for(let t=lastStart;t<finalScreenEnd;t+=1/60){const a=basketballState(t,variant).actors;guardClearance=Math.min(guardClearance,Math.hypot(a[0].x-a[4].x,a[0].z-a[4].z));defenderClearance=Math.min(defenderClearance,Math.hypot(a[5].x-a[4].x,a[5].z-a[4].z));}
 assert.ok(guardClearance<.52,'guard must brush the screen closely');
 assert.ok(defenderClearance<.51,'screen must actually obstruct the defender');
 assert.ok(basketballState(finalScreenEnd-.02,variant).actors[0].z<basketballState(finalScreenEnd-.02,variant).actors[4].z,'guard must clear the screen before release');
 for(let t=.01;t<=14;t+=.01){
  const a=basketballState(t-.01,variant),b=basketballState(t,variant);
  for(let i=0;i<10;i++)assert.ok(Math.hypot(a.actors[i].x-b.actors[i].x,a.actors[i].z-b.actors[i].z)<.08,'continuous player paths');
  for(let i=0;i<10;i++)for(const side of ['l','r']){
   const p=basketballFeet(t-.01,i,variant)[side],q=basketballFeet(t,i,variant)[side];
   assert.ok(Math.hypot(p.x-q.x,p.z-q.z,p.height-q.height)<.17,`${variant}: continuous ${i} ${side} foot at ${t}`);
   assert.ok(q.height>=-1e-8,'foot cannot penetrate the floor');
  }
 }
 console.log(`${variant}: planted screen, facing, torso clearance, release and continuous paths passed`);
}
