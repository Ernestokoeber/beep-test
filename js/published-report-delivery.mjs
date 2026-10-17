import {publishedGamePatch} from './published-game-report.mjs';

// Only confirmed public reports belong here. No database or provider request.
const report = {date:'2026-10-17',home:'TSV Wasserburg/Günzburg',away:'TSV Lindau',
  url:new URL('../data/published-game-reports/2026-10-17-wasserburg-lindau.json',import.meta.url).href};
const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');
const matches=game=>game.date===report.date&&normalize(game.home)===normalize(report.home)&&normalize(game.away)===normalize(report.away);
const cancelled=game=>game.cancelled||['cancelled','abgesagt'].includes(game.status);

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

export function createPublishedReportDelivery({storage,fetchReport=fetchPublicReport,getContext=()=>null,canApply=()=>true}){
  let packet=null,worker=null,requested=false;
  function target(data){
    const games=(data.games||[]).filter(matches);
    return games.length===1&&!cancelled(games[0])&&!games[0].publishedReport?games[0]:null;
  }
  async function deliver(){
    const context=getContext();
    if(!canApply()||!target(storage.load()))return {imported:0,errors:[]};
    try{
      if(!packet)packet=await fetchReport(report.url);
      await storage.flush?.();
      if(context!==getContext()||!canApply())return {imported:0,errors:[]};
      // Re-read after the network/flush awaits: retain edits made in the meantime.
      const data=storage.load(),game=target(data);
      if(!game)return {imported:0,errors:[]};
      const patch=publishedGamePatch(packet,game,data.players||[]);
      const backup=game.publishedReportBackup||{score:game.score||'',status:game.status||null,
        playerStats:structuredClone(game.playerStats||[]),capturedAt:patch.publishedReport.importedAt};
      Object.assign(game,patch,{publishedReportBackup:backup});
      // Public supplements do not pretend to be cloud edits or trigger uploads.
      await storage.save(data,{fromSync:true,preserveTimestamp:true});
      return {imported:context===getContext()?1:0,errors:[]};
    }catch(error){return {imported:0,errors:[error.message||'Spielbericht konnte nicht übernommen werden.']};}
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
