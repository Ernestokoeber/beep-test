import {basketballState} from './basketball-choreography.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const cache=new Map();
const footprint=(a,side)=>({x:a.x+Math.cos(a.yaw)*(side==='l'?.135:-.135),z:a.z-Math.sin(a.yaw)*(side==='l'?.135:-.135),yaw:a.yaw});
function build(variant,index){
 const actor=t=>basketballState(t,variant).actors[index],tracks={l:[],r:[]};
 const feet={l:footprint(actor(0),'l'),r:footprint(actor(0),'r')};
 const moving=t=>actor(t).speed>.12&&!actor(t).screen;
 let start=null,side='l';const runs=[],contacts=index===4?basketballState(0,variant).screenWindows:[];
 let contactIndex=0;
 for(let t=0;t<=14.02;t+=.02){
  if(moving(t)&&start===null)start=Math.max(0,t-.02);
  if(!moving(t)&&start!==null){
   if(runs.length&&start-runs.at(-1)[1]<.28)runs.at(-1)[1]=t;
   else runs.push([start,t]);
   start=null;
  }
 }
 for(const [begin,end] of runs){
  while(contactIndex<contacts.length&&contacts[contactIndex][1]<=begin+.03){
   const [planted]=contacts[contactIndex++];
   for(const s of ['l','r']){
    const target=footprint(actor(planted),s),fromTime=Math.max(tracks[s].at(-1)?.end||0,planted-.28);
    tracks[s].push({start:fromTime,end:planted,from:feet[s],to:target,lift:.025});feet[s]=target;
   }
  }
  const priorContact=contacts.filter(([,release])=>release<=begin+.03).at(-1)?.[1]||0;
  let t=Math.max(priorContact,begin-.12);
  while(t<end-.01){
   const duration=Math.max(.18,Math.min(.32,.50/Math.max(.8,actor(t+.18).speed)));
   const finish=Math.min(end,t+duration),target=footprint(actor(Math.min(end,finish+duration*.35)),side);
   tracks[side].push({start:t,end:finish,from:feet[side],to:target,lift:.055+Math.min(.055,actor(t+.08).speed*.014)});
   feet[side]=target;t=finish;side=side==='l'?'r':'l';
  }
  for(const s of [side,side==='l'?'r':'l']){
   const target=footprint(actor(Math.min(14,end+.25)),s);
   tracks[s].push({start:t,end:t+.11,from:feet[s],to:target,lift:.025});feet[s]=target;t+=.11;
  }
 }
 return {tracks,initial:{l:footprint(actor(0),'l'),r:footprint(actor(0),'r')}};
}
// Support feet hold their world position; only the alternating swing foot moves.
// Screen contact overrides the gait with a fixed, symmetric footprint.
export function basketballFeet(t,index,variant='pick-and-roll'){
 const a=basketballState(t,variant).actors[index];
 if(a.screen)return {l:{...footprint(a,'l'),height:0},r:{...footprint(a,'r'),height:0}};
 const key=`${variant}/${index}`;if(!cache.has(key))cache.set(key,build(variant,index));
 const {tracks,initial}=cache.get(key),result={};
 for(const side of ['l','r']){
  let value={...initial[side],height:0};
  for(const step of tracks[side]){
   if(t<step.start)break;
   if(t>=step.end){value={...step.to,height:0};continue;}
   const phase=(t-step.start)/(step.end-step.start),u=smooth(phase);
   const delta=Math.atan2(Math.sin(step.to.yaw-step.from.yaw),Math.cos(step.to.yaw-step.from.yaw));
   value={x:step.from.x+(step.to.x-step.from.x)*u,z:step.from.z+(step.to.z-step.from.z)*u,yaw:step.from.yaw+delta*u,height:Math.sin(phase*Math.PI)*step.lift};break;
  }
  result[side]=value;
 }
 return result;
}
