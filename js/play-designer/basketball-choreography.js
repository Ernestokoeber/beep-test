const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
function sample(keys,t,angle=false){
 let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],u=clamp((t-a[0])/(b[0]-a[0])),h=b[0]-a[0];
 if(angle)return a.slice(1).map((v,k)=>v+Math.atan2(Math.sin(b[k+1]-v),Math.cos(b[k+1]-v))*ease(u));
 return a.slice(1).map((v,k)=>{
  const column=k+1,slope=j=>(keys[j+1][column]-keys[j][column])/(keys[j+1][0]-keys[j][0]);
  if(v===b[column])return v;
  const tangent=j=>{
   if(j===0||j===keys.length-1)return 0;
   const left=slope(j-1),right=slope(j);if(left*right<=0)return 0;
   const before=keys[j][0]-keys[j-1][0],after=keys[j+1][0]-keys[j][0],w1=2*after+before,w2=after+2*before;
   return (w1+w2)/(w1/left+w2/right);
  };
  // Monotone cubic interpolation maintains speed through intermediate reads
  // while preserving held positions and avoiding coordinate overshoot.
  return (2*u*u*u-3*u*u+1)*v+(u*u*u-2*u*u+u)*h*tangent(i)+(-2*u*u*u+3*u*u)*b[column]+(u*u*u-u*u)*h*tangent(i+1);
 });
}
const guardBase=[[0,0,5],[2.65,0,5],[3.4,1.26,2.8],[4,1.28,1.68],[4.6,1.46,.92],[6.5,2.3,-.2],[14,2.3,-.2]];
const guardReject=[[0,0,5],[2.3,0,5],[4,-1.2,2.8],[5,-1.2,2.8],[5.55,-1.1,3.2],[6.05,.63,2.75],[6.6,.64,2.25],[7.2,1.0,1.35],[8.5,1.9,.2],[10,1.9,-.6],[14,1.9,-.6]];
const bigRoll=[[0,2,2.6],[1.8,.8,1.65],[4.8,.8,1.65],[5.5,.8,.85],[8.1,0,-3.8],[14,0,-3.8]];
const bigPop=[[0,2,2.6],[1.8,.8,1.65],[4.8,.8,1.65],[7.5,4.6,1],[14,4.6,1]];
const bigReject=[[0,2,2.6],[1.8,.8,1.65],[3.95,.8,1.65],[4.85,.15,2.25],[6.75,.15,2.25],[7.6,.15,1.3],[9.2,0,-3.8],[14,0,-3.8]];
const defenseBase=[[0,0,3.95],[2.9,.7,3.12],[3.45,.78,2.12],[4.15,.78,2.12],[4.8,1.42,2.1],[5.5,2.1,1.05],[6.5,2.65,.45],[14,2.65,.45]];
const defenseReject=[[0,.65,3.95],[2.8,.72,3.4],[4,-1.2,1.95],[5,-1.2,1.95],[5.55,-.6,3],[6,.14,2.73],[6.7,.14,2.73],[7.3,.78,2.8],[8,1.65,1.55],[9,2.45,.5],[14,2.45,.5]];
const pi=Math.PI;
const guardYaw=[[0,pi],[2.65,pi],[3.25,2.55],[3.75,pi],[4.35,2.78],[6.5,pi],[14,pi]];
const rejectGuardYaw=[[0,pi],[2.3,pi],[3,-2.7],[4,pi],[5,pi],[5.65,pi/2],[6.15,pi],[7.2,2.7],[8.5,pi],[14,pi]];
const bigYaw=[[0,-2.25],[1.35,-2.25],[2.25,0],[4.8,0],[5.4,pi],[14,pi]];
const popYaw=[[0,-2.25],[1.35,-2.25],[2.25,0],[4.8,0],[5.4,1.75],[7.5,1.75],[8.1,-2.52],[14,-2.52]];
const rejectBigYaw=[[0,-2.25],[1.35,-2.25],[2.25,0],[3.95,0],[4.3,-.84],[4.85,-.84],[5.2,0],[6.75,0],[7.3,pi],[14,pi]];

// Screen stance is fully established before the defender reaches it. The root
// and facing stay fixed during contact; release happens after the guard passes.
export function basketballState(t,variant='pick-and-roll'){
 t=Math.max(0,Math.min(14,t));const reject=variant==='pick-and-roll-reject',pop=variant==='pick-and-pop';
 const paths=[reject?guardReject:guardBase,[ [0,-5.7,1.8],[14,-5.7,1.8] ],[[0,5.7,1.8],[14,5.7,1.8]],[[0,-5.9,-4.8],[14,-5.9,-4.8]],reject?bigReject:pop?bigPop:bigRoll,reject?defenseReject:defenseBase,[[0,-4.7,1],[14,-4.7,1]],[[0,4.7,1],[14,4.7,1]],[[0,-4.8,-4],[14,-4.8,-4]],pop?[[0,1,0],[4,1,0],[7,1.5,-1],[14,2.1,-.9]]:[[0,1,0],[4,1,0],[7,1.8,-2],[14,1.1,-4.5]]];
 const windows=reject?[[2.25,3.95],[5.2,6.75]]:[[2.25,4.8]];
 const screening=windows.some(([start,end])=>t>=start&&t<end);
 const positions=paths.map(keys=>sample(keys,t));
 const actors=positions.map(([x,z],i)=>{
  const before=sample(paths[i],t-.025),after=sample(paths[i],t+.025),speed=Math.hypot(after[0]-before[0],after[1]-before[1])/.05;
  let yaw=i===0?sample(reject?rejectGuardYaw:guardYaw,t,true)[0]:i===4?sample(reject?rejectBigYaw:pop?popYaw:bigYaw,t,true)[0]:Math.atan2(-x,-z);
  if(i>=5){const target=positions[i-5];yaw=Math.atan2(target[0]-x,target[1]-z);}
  return {x,z,yaw,speed:i===4&&screening?0:speed,screen:i===4&&screening};
 });
 return {actors,screenWindows:windows,passStart:reject?9:7.6,shotStart:reject?10.6:9.2};
}
