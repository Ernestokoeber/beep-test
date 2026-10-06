import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {once} from 'node:events';
const target=new URL('../assets/pnr/films/',import.meta.url);mkdirSync(target,{recursive:true});
const fps=24,frames=14*fps;
const browser=await chromium.launch({headless:true,...(process.env.PNR_BROWSER_CHANNEL?{channel:process.env.PNR_BROWSER_CHANNEL}:process.env.PNR_CHROMIUM?{executablePath:process.env.PNR_CHROMIUM}:{})});
const page=await browser.newPage({viewport:{width:1280,height:720},serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.env.E2E_BASE_URL||'http://127.0.0.1:4174')+'/scripts/pnr-film-studio.html');await page.waitForFunction(()=>window.ready,null,{timeout:60000});
try {
 for(const variant of ['pick-and-roll','pick-and-pop','pick-and-roll-reject']){
  const output=new URL(variant+'.mp4',target);
  const ffmpeg=spawn(process.env.PNR_FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',output.pathname.replace(/^\/([A-Za-z]:)/,'$1')],{stdio:['pipe','inherit','inherit']});
  const finished=once(ffmpeg,'exit');
  for(let frame=0;frame<frames;frame++){
   await page.evaluate(([t,id])=>window.renderFilm(t,id),[frame/fps,variant]);
   const png=await page.screenshot({type:'jpeg',quality:92});if(!ffmpeg.stdin.write(png))await once(ffmpeg.stdin,'drain');
   if(frame%96===0)console.log(`${variant}: frame ${frame}/${frames}`);
  }
  ffmpeg.stdin.end();const [code]=await finished;if(code!==0)throw new Error(`ffmpeg exited ${code}`);
  if(errors.length)throw new Error(errors.join('\n'));console.log(`${variant}: 14-second 720p film rendered`);
 }
} finally {await page.close();await browser.close();}
