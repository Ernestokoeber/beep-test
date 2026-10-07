import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,copyFileSync,createWriteStream,renameSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const scenes=resolve(process.env.PNR_BLENDER_WORK||resolve(root,'../blender-scenes'));
const destination=resolve(root,'assets/pnr/films');mkdirSync(destination,{recursive:true});
const blender=process.env.PNR_BLENDER||'blender',ffmpeg=process.env.PNR_FFMPEG||'ffmpeg';
const samples=Number(process.env.PNR_SAMPLES||16);
const script=resolve(root,'scripts/blender-pnr-film.py');
const variants=process.env.PNR_VARIANT?[process.env.PNR_VARIANT]:['pick-and-roll','pick-and-pop','pick-and-roll-reject'];
const titles={'pick-and-roll':'PICK & ROLL','pick-and-pop':'PICK & POP','pick-and-roll-reject':'REJECT & RE-SCREEN'};
const font=process.env.PNR_FONT||(process.platform==='win32'?'C:/Windows/Fonts/arialbd.ttf':'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
async function run(binary,args,{cwd=root,logfile,render=false}={}){
 return new Promise((resolveRun,reject)=>{
  const process=spawn(binary,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const log=logfile?createWriteStream(logfile):null;let pending='';
  const capture=data=>{
   if(log)log.write(data);
   pending+=data.toString();const lines=pending.split(/\r?\n/);pending=lines.pop();
   for(const line of lines){
    if(render){const match=line.match(/COURTHUB_FRAME (\d+)/);if(match&&Number(match[1])%30===0)console.log(line);else if(line.startsWith('COURTHUB_RENDER_DEVICE'))console.log(line);}
    else if(line.trim())console.log(line);
   }
  };
  process.stdout.on('data',capture);process.stderr.on('data',capture);
  process.on('error',reject);process.on('exit',code=>{log?.end();code===0?resolveRun():reject(new Error(`${binary} exited ${code}; diagnostics: ${logfile||'console'}`));});
 });
}
for(const variant of variants){
 const glb=resolve(scenes,variant+'.glb');
 if(!existsSync(glb))throw new Error(`Export missing: ${glb}. Run scripts/export-pnr-blender.mjs first.`);
 const signature=createHash('sha256').update(readFileSync(glb)).update(readFileSync(script)).update(String(samples)).digest('hex').slice(0,12);
 const folder=resolve(scenes,'renders',variant,signature);mkdirSync(folder,{recursive:true});
 console.log(`${variant}: rendering 420 frames at 1080p, 30 fps, ${samples} Cycles samples`);
 await run(blender,['--background','--threads','2','--factory-startup','--python-exit-code','1','--python',script,'--','--input',glb,'--output',folder,'--samples',String(samples),'--save-scene'],{logfile:resolve(folder,'render.log'),render:true});
 for(let frame=1;frame<=420;frame++){
  const image=resolve(folder,String(frame).padStart(4,'0')+'.png');
  if(!existsSync(image)||statSync(image).size<1024)throw new Error(`Incomplete render: frame ${frame}, ${image}`);
 }
 await run(blender,['--background','--threads','2',resolve(folder,variant+'.blend'),'--python-exit-code','1','--python',resolve(root,'scripts/verify-pnr-blender.py')],{logfile:resolve(folder,'verification.log')});
 copyFileSync(font,resolve(folder,'hud-bold.ttf'));
 const reject=variant==='pick-and-roll-reject',pop=variant==='pick-and-pop';
 const phases=reject?[[0,2,'Aufstellung'],[2,3.95,'Reject gegen Überplay'],[3.95,6.75,'Re-Screen stellen'],[6.75,9,'Block nutzen · zum Korb rollen'],[9,10.6,'Pass zum Roller'],[10.6,14,'Abschluss']]:[[0,2,'Aufstellung'],[2,4.8,'Screen stellen · eng vorbeidribbeln'],[4.8,7.6,pop?'Pop nach außen · Passfenster öffnen':'Zum Korb abrollen · Hände zeigen'],[7.6,9.2,pop?'Pass zum Popper':'Pass zum Roller'],[9.2,14,'Abschluss']];
 const filters=[`drawbox=x=32:y=22:w=520:h=60:color=0x062a22@0.85:t=fill`,`drawtext=fontfile=hud-bold.ttf:text='COURTHUB  ·  ${titles[variant]}':fontsize=29:fontcolor=white:x=48:y=37`,`drawbox=x=32:y=980:w=650:h=60:color=0x062a22@0.86:t=fill`,...phases.map(([from,to,label])=>`drawtext=fontfile=hud-bold.ttf:text='${label}':fontsize=25:fontcolor=white:x=50:y=996:enable='gte(t,${from})*lt(t,${to})'`)];
 const movie=resolve(folder,variant+'.mp4');
 const attribution='Body/hair/skin: MakeHuman CC0. Top/shorts: Elvaerwyn CC-BY. Sneakers: punkduck CC BY 3.0 https://creativecommons.org/licenses/by/3.0/. Fitted, recolored, rigged and animated for Courthub. Sources: https://static.makehumancommunity.org/assets/assetpacks/shirts03.html https://static.makehumancommunity.org/assets/assetpacks/pants03.html https://static.makehumancommunity.org/assets/assetpacks/shoes02.html';
 await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate','30','-start_number','1','-i','%04d.png','-frames:v','420','-vf',[...filters,`drawtext=fontfile=hud-bold.ttf:text='Modelle MakeHuman (CC0) | Kleidung Elvaerwyn / punkduck (CC-BY)':fontsize=14:fontcolor=white:shadowcolor=black:shadowx=1:shadowy=1:x=w-tw-24:y=h-th-10`].join(','),'-an','-metadata','comment='+attribution,'-c:v','libx264','-crf','18','-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart',movie],{cwd:folder});
 // Only replace the shipped clip after every frame and encoding succeed.
 const temporary=resolve(destination,variant+'.pending.mp4');copyFileSync(movie,temporary);renameSync(temporary,resolve(destination,variant+'.mp4'));
 console.log(`${variant}: completed 14-second Blender film`);
}
