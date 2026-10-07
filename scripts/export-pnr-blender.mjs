import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.env.PNR_BLENDER_WORK||'../blender-scenes');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PNR_BROWSER_CHANNEL?{channel:process.env.PNR_BROWSER_CHANNEL}:{})});
const page=await browser.newPage({viewport:{width:640,height:360},serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.exposeFunction('saveFilmGltf',(variant,data)=>writeFileSync(resolve(out,variant+'.glb'),Buffer.from(data,'base64')));
try{
 await page.goto((process.env.E2E_BASE_URL||'http://127.0.0.1:4173')+'/scripts/pnr-blender-export.html');
 await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 for(const variant of (process.env.PNR_VARIANT?[process.env.PNR_VARIANT]:['pick-and-roll','pick-and-pop','pick-and-roll-reject'])){
  console.log(await page.evaluate(id=>window.exportFilm(id),variant));
  if(errors.length)throw new Error(errors.join('\n'));
 }
}finally{await page.close();await browser.close();}
