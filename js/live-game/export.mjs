import {buildLiveReport} from './report.mjs';
import {effectiveEvents} from './core.mjs';
const TEAMS={herren1:'Herren 1',u18:'U18',u16:'U16',u14:'U14',u12:'U10–U12',ueber40:'Ü40'};
const fail=message=>{throw new Error(message);};
export function buildGameStatsExport({game,session,players=[],statsSource='video',teamId,sourceId,ownSide,now=new Date()}){
  if(!game?.id||!/^\d{4}-\d{2}-\d{2}$/.test(game.date||''))fail('Spiel-ID und Spieldatum fehlen.');
  if(!TEAMS[teamId])fail('Mannschaft für das Admin-Panel auswählen.');
  if(!sourceId)fail('Die Export-Quellen-ID fehlt.');
  if(!['home','away'].includes(ownSide))fail('Heim- oder Auswärtsrolle auswählen.');
  const report=session?buildLiveReport(session,now.getTime()):null;
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now);
  if(!report?.complete&&!game.publishedReport&&!(game.date<=today&&(['played','completed','finished'].includes(game.status)||game.date<today)))fail('Zuerst das Spiel abschließen.');
  if(!['video','live'].includes(statsSource))fail('Statistikquelle auswählen.');
  if(statsSource==='live'&&(!report?.complete||report.teamPoints===null||report.issues.length))fail('Zuerst die Live-Erfassung abschließen und mögliche Konflikte lösen.');
  const opponentName=String(ownSide==='home'?game.away:game.home).trim();
  if(!opponentName||opponentName==='undefined')fail('Der Gegner fehlt.');
  const year=Number(game.date.slice(0,4)),start=Number(game.date.slice(5,7))>=7?year:year-1;
  const raw=statsSource==='live'?report.players.map(p=>({...p,offensiveRebounds:p.oreb,defensiveRebounds:p.dreb,twoAttempted:p.twoAttempted,threeAttempted:p.threeAttempted})):game.playerStats||[];
  const entries=raw.filter(p=>['rebounds','offensiveRebounds','defensiveRebounds','assists','steals','turnovers','blocks','twoAttempted','threeAttempted'].some(key=>p[key]!=null)).map(p=>{
    const id=p.playerId||p.id,identity=players.find(player=>player.id===id)||report?.players.find(player=>player.id===id)||game.publishedReport?.players.find(player=>player.playerId===id)||p;
    if(!id||!identity.name)fail('Spielername oder Zuordnung fehlt.');
    const read=key=>{const value=p[key];if(value==null)return null;if(!Number.isSafeInteger(value)||value<0)fail(`${identity.name}: ${key} muss eine nicht negative ganze Zahl sein.`);return value;};
    const offensiveRebounds=read('offensiveRebounds'),defensiveRebounds=read('defensiveRebounds');
    const reboundsTotal=offensiveRebounds!==null&&defensiveRebounds!==null?offensiveRebounds+defensiveRebounds:read('rebounds');
    // DBB.Scores owns all official scoring and time values. Never export them here.
    return {id,name:identity.name,number:p.jerseyNumber??identity.jerseyNumber??null,participation:p.gameStatus==='dnp'||p.played===false?'dnp':'played',
      reboundsTotal,offensiveRebounds,defensiveRebounds,blocks:read('blocks'),assists:read('assists'),steals:read('steals'),turnovers:read('turnovers'),
      points:null,minutesSeconds:null,twoPointsMade:null,twoPointsAttempted:read('twoAttempted'),threePointsMade:null,threePointsAttempted:read('threeAttempted'),
      freeThrowsMade:null,freeThrowsAttempted:null,fouls:null,plusMinus:null};
  });
  if(!entries.length)fail('Noch keine Video-Werte erfasst. Rebounds, Assists, Steals, Turnovers, Blocks oder Wurfversuche im Spieler-Boxscore eintragen oder die Live-Erfassung auswählen.');
  for(const p of entries)if(p.participation==='dnp'&&[p.reboundsTotal,p.assists,p.steals,p.turnovers,p.blocks,p.twoPointsAttempted,p.threePointsAttempted].some(v=>v>0))fail(`${p.name}: Kein Einsatz widerspricht der Video-Statistik.`);
  return {format:'courthub.game-stats',schemaVersion:1,sourceId:String(sourceId),exportedAt:now.toISOString(),
    game:{id:game.id,teamId,season:`${start}/${start+1}`,date:game.date,opponentName,isHome:ownSide==='home',status:'finished',statsStatus:'partial',ourScore:null,opponentScore:null},players:entries};
}
export function renderGameStatsExport({game,session}){
  const section=document.createElement('section');section.className='live-report';section.dataset.role='game-stats-export';
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  section.append(make('h3','Statistik für das Admin-Panel exportieren'),make('p','Deine Video-Statistik als JSON. Im Admin-Panel unter Spielerstatistiken → CourtHub + DBB importieren auswählen, prüfen und speichern. Danach „Bericht“ für den KI-Spielbericht öffnen.'));
  const bt=globalThis.window?.BT,storage=bt?.storage;
  const teamLabel=make('label','Mannschaft im Admin-Panel'),team=document.createElement('select');team.dataset.field='export-team';
  for(const [id,label]of Object.entries(TEAMS)){const option=make('option',label);option.value=id;team.append(option);}team.value=storage?.getSetting('gameStatsExportTeam','herren1')||'herren1';teamLabel.append(team);
  const sideLabel=make('label','Eigene Mannschaft'),side=document.createElement('select');side.dataset.field='export-side';
  for(const [id,label]of [['','Bitte auswählen'],['home','Heimteam'],['away','Gastteam']]){const o=make('option',label);o.value=id;side.append(o);}
  const home=/\blindau\b/i.test(game?.home||''),away=/\blindau\b/i.test(game?.away||'');
  side.value=session?.gameplan?.ownSide||(home!==away?(home?'home':'away'):'');sideLabel.append(side);
  const sourceLabel=make('label','Quelle deiner Beobachtungen'),source=document.createElement('select');source.dataset.field='export-source';
  for(const [id,label]of [['video','Video-Auswertung im Spieler-Boxscore'],['live','Manuelle Live-Erfassung']]){const o=make('option',label);o.value=id;source.append(o);}sourceLabel.append(source);
  const note=make('p','CourtHub exportiert deine Rebounds (offensiv/defensiv), Steals, Assists, Turnovers, Blocks und Zweier-/Dreierversuche. Punkte, Minuten und das Endergebnis kommen ausschließlich aus DBB.Scores. Leere Video-Felder bleiben leer; eine eingetragene 0 wird übernommen.');
  const status=make('p','');status.setAttribute('role','status');
  const button=make('button','Statistik exportieren');button.type='button';button.className='btn primary';button.dataset.action='export-game-stats';
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      let sourceId=storage?.getSetting('gameStatsExportSourceId','')||bt?.sync?.getState?.().user?.organization?.id;
      if(!sourceId)sourceId=crypto.randomUUID();
      const packet=buildGameStatsExport({game:storage?.getGame?.(game.id)||game,session,players:storage?.getPlayers?.()||[],statsSource:source.value,teamId:team.value,sourceId,ownSide:side.value});
      if(!storage?.getSetting('gameStatsExportSourceId',''))storage?.setSetting('gameStatsExportSourceId',sourceId);
      storage?.setSetting('gameStatsExportTeam',team.value);
      const filename=`courthub-spielstatistik-${game.date}-${String(game.id).replace(/[^a-zA-Z0-9_-]/g,'-')}.json`;
      const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'});
      const file=typeof File==='function'?new File([blob],filename,{type:'application/json'}):null;
      if(file&&navigator.canShare?.({files:[file]})){
        try{await navigator.share({files:[file],title:'CourtHub Spielstatistik'});status.textContent='Statistik geteilt.';return;}
        catch(error){if(error.name==='AbortError'){status.textContent='Teilen abgebrochen.';return;}}
      }
      if(bt?.util?.downloadBlob)bt.util.downloadBlob(filename,blob);
      else{const url=URL.createObjectURL(blob),link=make('a',filename);link.href=url;link.download=filename;section.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
      status.textContent='Statistikdatei exportiert. Im Admin-Panel importieren und prüfen.';
    }catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  section.append(teamLabel,sideLabel,sourceLabel,note,button,status);return section;
}

// Derived values require actual inputs; blanks and zero attempts never become 0%.
export function calculateGameMetrics(stat){
  const value=(...keys)=>{for(const key of keys)if(typeof stat[key]==='number'&&Number.isFinite(stat[key]))return stat[key];return null;};
  const twoMade=value('twoMade','twoPointsMade'),threeMade=value('threeMade','threePointsMade');
  const twoAttempted=value('twoAttempted','twoPointsAttempted'),threeAttempted=value('threeAttempted','threePointsAttempted');
  const add=(a,b)=>a===null||b===null?null:a+b;
  const fgMade=add(twoMade,threeMade)??value('fieldGoalsMade'),fgAttempted=add(twoAttempted,threeAttempted)??value('fieldGoalsAttempted');
  const ftMade=value('freeThrowsMade'),ftAttempted=value('freeThrowsAttempted');
  const pct=(made,attempted)=>made!==null&&attempted>0&&made>=0&&made<=attempted?100*made/attempted:null;
  const rebounds=add(value('offensiveRebounds'),value('defensiveRebounds'))??value('rebounds');
  const points=value('points'),assists=value('assists'),steals=value('steals'),blocks=value('blocks'),turnovers=value('turnovers');
  const minutes=value('minutes')??(value('minutesSeconds')===null?null:value('minutesSeconds')/60);
  const complete=[points,rebounds,assists,steals,blocks,turnovers,fgMade,fgAttempted,ftMade,ftAttempted].every(v=>v!==null&&v>=0)&&fgMade<=fgAttempted&&ftMade<=ftAttempted;
  const efficiency=complete?points+rebounds+assists+steals+blocks-(fgAttempted-fgMade)-(ftAttempted-ftMade)-turnovers:null;
  return {twoFG:pct(twoMade,twoAttempted),threeFG:pct(threeMade,threeAttempted),FG:pct(fgMade,fgAttempted),FT:pct(ftMade,ftAttempted),
    eFG:fgMade!==null&&threeMade!==null&&fgAttempted>0&&fgMade<=fgAttempted?100*(fgMade+0.5*threeMade)/fgAttempted:null,
    assistTurnover:assists!==null&&turnovers>0?assists/turnovers:null,efficiency,efficiencyPerMinute:efficiency!==null&&minutes>0?efficiency/minutes:null};
}
export function renderGameMetrics({game,players=[]}){
  const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const wrap=make('section');wrap.className='live-report';wrap.dataset.role='game-metrics';
  const details=make('details');details.append(make('summary','Wurfquoten und Effizienz · DBB + Video'));
  details.append(make('p','2FG%, 3FG%, FG% und FT% sind Treffer geteilt durch Versuche. eFG% gewichtet Dreiertreffer höher. EFF = Punkte + Rebounds + Assists + Steals + Blocks − Fehlwürfe − verfehlte Freiwürfe − Turnovers. Leere Werte oder fehlende Versuche bleiben offen; höchste EFF steht zuerst.'));
  const scroll=make('div');scroll.className='table-scroll';const table=make('table');table.className='results';
  const headings=['Spieler','2FG%','3FG%','FG%','FT%','eFG%','AST/TO','EFF','EFF/Min'];
  const head=make('thead'),headRow=make('tr');for(const label of headings)headRow.append(make('th',label));head.append(headRow);table.append(head);
  const body=make('tbody'),rows=(game.playerStats||[]).filter(s=>s.gameStatus!=='dnp').map(stat=>({stat,metrics:calculateGameMetrics(stat)})).sort((a,b)=>(b.metrics.efficiency??-Infinity)-(a.metrics.efficiency??-Infinity));
  if(rows.length){
    const get=(stat,...keys)=>{for(const key of keys)if(typeof stat[key]==='number'&&Number.isFinite(stat[key]))return stat[key];return null;};
    const sum=fn=>{const values=rows.map(({stat})=>fn(stat));return values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;};
    const total={};for(const key of ['points','assists','steals','blocks','turnovers','freeThrowsMade','freeThrowsAttempted'])total[key]=sum(stat=>get(stat,key));
    total.twoMade=sum(stat=>get(stat,'twoMade','twoPointsMade'));total.threeMade=sum(stat=>get(stat,'threeMade','threePointsMade'));
    total.twoAttempted=sum(stat=>get(stat,'twoAttempted','twoPointsAttempted'));total.threeAttempted=sum(stat=>get(stat,'threeAttempted','threePointsAttempted'));
    total.fieldGoalsMade=sum(stat=>get(stat,'twoMade','twoPointsMade')!==null&&get(stat,'threeMade','threePointsMade')!==null?get(stat,'twoMade','twoPointsMade')+get(stat,'threeMade','threePointsMade'):get(stat,'fieldGoalsMade'));
    total.fieldGoalsAttempted=sum(stat=>get(stat,'twoAttempted','twoPointsAttempted')!==null&&get(stat,'threeAttempted','threePointsAttempted')!==null?get(stat,'twoAttempted','twoPointsAttempted')+get(stat,'threeAttempted','threePointsAttempted'):get(stat,'fieldGoalsAttempted'));
    total.rebounds=sum(stat=>get(stat,'offensiveRebounds')!==null&&get(stat,'defensiveRebounds')!==null?stat.offensiveRebounds+stat.defensiveRebounds:get(stat,'rebounds'));
    rows.unshift({stat:{name:'Team · erfasster Boxscore'},metrics:calculateGameMetrics(total)});
  }
  const show=v=>v===null?'–':v.toLocaleString('de-DE',{maximumFractionDigits:1});
  for(const {stat,metrics}of rows){const name=players.find(p=>p.id===stat.playerId)?.name||game.publishedReport?.players.find(p=>p.playerId===stat.playerId)?.name||stat.name||'Spieler';const row=make('tr');row.append(make('td',name));for(const key of ['twoFG','threeFG','FG','FT','eFG','assistTurnover','efficiency','efficiencyPerMinute'])row.append(make('td',show(metrics[key])));body.append(row);}
  table.append(body);scroll.append(table);details.append(scroll);if(!rows.length)details.append(make('p','Noch keine Spielerstatistiken vorhanden.'));wrap.append(details);return wrap;
}
