import {publishedGamePatch} from './published-game-report.mjs';

// The catalog contains confirmed public reports, never private provider URLs.
const indexUrl=new URL('../data/published-game-reports/index.json',import.meta.url).href;
const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');
const matches=(game,target)=>game.date===target.date&&normalize(game.home)===normalize(target.home)&&normalize(game.away)===normalize(target.away);
const cancelled=game=>game.cancelled||['cancelled','abgesagt'].includes(game.status);

function validatedCatalog(value){
  if(value?.schemaVersion!=='courthub.published-report-index.v1'||!Array.isArray(value.reports)||value.reports.length>200)throw Error('Ungültiges Spielbericht-Verzeichnis.');
  const targets=new Set(),files=new Set();
  return value.reports.map(entry=>{
    const target=entry?.target,file=entry?.file;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(target?.date||'')||!['home','away'].every(k=>typeof target[k]==='string'&&target[k].trim()&&target[k].length<=100)||
       typeof file!=='string'||!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(file)||!file.startsWith(target.date+'-'))throw Error('Ungültige Spielbericht-Quelle.');
    const key=target.date+'|'+normalize(target.home)+'|'+normalize(target.away);
    if(targets.has(key)||files.has(file))throw Error('Mehrdeutiges Spielbericht-Verzeichnis.');
    targets.add(key);files.add(file);
    return {target,file,url:new URL('../data/published-game-reports/'+file,import.meta.url).href};
  });
}

async function fetchPublicReport(url){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(url,{credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error('Veröffentlichter Spielbericht konnte nicht geladen werden.');
    const text=await response.text();
    if(text.length>1_000_000)throw Error('Veröffentlichter Spielbericht ist zu groß.');
    return JSON.parse(text);
  }finally{clearTimeout(timer);}
}

export function createPublishedReportDelivery({storage,fetchReport=fetchPublicReport,fetchIndex=fetchPublicReport,getContext=()=>null,canApply=()=>true,now=()=>Date.now()}){
  let catalog=null,catalogAt=0,worker=null,requested=false;
  const packets=new Map();
  function target(data,entry){
    const games=(data.games||[]).filter(game=>matches(game,entry.target));
    return games.length===1&&!cancelled(games[0])&&!games[0].publishedReport?games[0]:null;
  }
  async function deliver(){
    const context=getContext();
    if(!canApply()||!(storage.load().games||[]).some(game=>!game.publishedReport&&!cancelled(game)))return {imported:0,errors:[]};
    const result={imported:0,errors:[]};
    try{
      if(!catalog||now()-catalogAt>=300_000){catalog=validatedCatalog(await fetchIndex(indexUrl));catalogAt=now();}
      for(const entry of catalog){
        if(context!==getContext()||!canApply())break;
        if(!target(storage.load(),entry))continue;
        try{
          if(!packets.has(entry.file))packets.set(entry.file,await fetchReport(entry.url));
          await storage.flush?.();
          if(context!==getContext()||!canApply())break;
          // Re-read after network/flush awaits: retain edits made in the meantime.
          const data=storage.load(),game=target(data,entry);
          if(!game)continue;
          const patch=publishedGamePatch(packets.get(entry.file),game,data.players||[]);
          const backup=game.publishedReportBackup||{score:game.score||'',status:game.status||null,
            playerStats:structuredClone(game.playerStats||[]),capturedAt:patch.publishedReport.importedAt};
          Object.assign(game,patch,{publishedReportBackup:backup});
          // Public supplements do not pretend to be cloud edits or trigger uploads.
          await storage.save(data,{fromSync:true,preserveTimestamp:true});
          if(context===getContext())result.imported++;
        }catch(error){result.errors.push(error.message||'Spielbericht konnte nicht übernommen werden.');}
      }
    }catch(error){result.errors.push(error.message||'Spielbericht-Verzeichnis ist nicht verfügbar.');}
    return result;
  }
  function run(){
    requested=true;
    if(worker)return worker;
    worker=(async()=>{
      const result={imported:0,errors:[]};
      while(requested){requested=false;const next=await deliver();result.imported+=next.imported;result.errors.push(...next.errors);}
      return result;
    })().finally(()=>{worker=null;});
    return worker;
  }
  return {run};
}
