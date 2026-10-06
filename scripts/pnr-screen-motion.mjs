import assert from 'node:assert/strict';
import {basketballState} from '../js/play-designer/basketball-choreography.js';
for(const variant of ['pick-and-roll','pick-and-pop','pick-and-roll-reject']){
 const windows=basketballState(0,variant).screenWindows;
 for(const [start,end] of windows){
  const first=basketballState(start+.01,variant).actors[4];
  for(let t=start+.01;t<end-.01;t+=1/60){
   const {actors}=basketballState(t,variant),big=actors[4];
   assert.equal(big.screen,true);assert.equal(big.speed,0);
   assert.equal(big.x,first.x);assert.equal(big.z,first.z);assert.equal(big.yaw,first.yaw);
   // Standing torso clearance is maintained; the defender goes around the
   // screen instead of crossing through it, and the guard brushes its side.
   for(const i of [0,5])assert.ok(Math.hypot(big.x-actors[i].x,big.z-actors[i].z)>.55,`${variant}: torso intersection at ${t}`);
  }
  assert.equal(basketballState(end+.01,variant).actors[4].screen,false);
 }
 const finalScreenEnd=windows.at(-1)[1];
 assert.ok(basketballState(finalScreenEnd-.02,variant).actors[0].z<basketballState(finalScreenEnd-.02,variant).actors[4].z,'guard must clear the screen before release');
 for(let t=.01;t<=14;t+=.01){
  const a=basketballState(t-.01,variant),b=basketballState(t,variant);
  for(let i=0;i<10;i++)assert.ok(Math.hypot(a.actors[i].x-b.actors[i].x,a.actors[i].z-b.actors[i].z)<.08,'continuous player paths');
 }
 console.log(`${variant}: planted screen, facing, torso clearance, release and continuous paths passed`);
}
