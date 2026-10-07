import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,...(process.env.E2E_BROWSER_CHANNEL?{channel:process.env.E2E_BROWSER_CHANNEL}:{})});
try {
 const page=await browser.newPage({viewport:{width:640,height:360}});
 await page.goto((process.env.E2E_BASE_URL||'http://127.0.0.1:4173')+'/scripts/pnr-blender-export.html');
 await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 for(const variant of ['pick-and-roll','pick-and-pop','pick-and-roll-reject']){
  const result=await page.evaluate(variant=>{
   const film=window.film,reject=variant==='pick-and-roll-reject';
   const windows=reject?[[2,2.35],[3.9,4.3],[4.95,5.3],[6.7,7.1]]:[[2,2.35],[4.75,5.15]];
   const pass=reject?9:7.6,shot=reject?10.6:9.2;
   windows.push([pass-.55,pass+.1],[pass+.6,pass+1.05],[shot-.1,shot+1.15]);
   let maximum=0,worst=null;
   for(const [start,end] of windows){
    let previous=null;
    for(let t=start;t<=end;t+=1/120){
     film.render(t,variant,{draw:false});
     const points=[0,4].flatMap(i=>['l','r'].map(side=>film.players[i].bones['hand_'+side].getWorldPosition(film.players[i].group.position.clone()).toArray()));
     if(previous)for(let i=0;i<points.length;i++){
      const distance=Math.hypot(...points[i].map((x,k)=>x-previous[i][k]));
      if(distance>maximum){maximum=distance;worst={t,player:i<2?0:4,side:i%2?'r':'l'};}
     }
     previous=points;
    }
   }
   return {maximum,worst};
  },variant);
  assert.ok(result.maximum<.06,`${variant}: hand teleports at ${JSON.stringify(result)}`);
  console.log(`${variant}: smooth screen, gather, catch, pass release and shot recovery; max hand step ${result.maximum.toFixed(4)} m`);
 }
} finally {await browser.close();}
