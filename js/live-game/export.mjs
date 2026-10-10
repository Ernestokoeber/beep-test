import {buildLiveReport} from './report.mjs';
import {effectiveEvents} from './core.mjs';
const TEAMS={herren1:'Herren 1',u18:'U18',u16:'U16',u14:'U14',u12:'U10–U12',ueber40:'Ü40'};
const fail=message=>{throw new Error(message);};
export function buildGameStatsExport({game,session,teamId,sourceId,ownSide,now=new Date()}){
  if(!game?.id||!/^\d{4}-\d{2}-\d{2}$/.test(game.date||''))fail('Spiel-ID und Spieldatum fehlen.');
  if(!TEAMS[teamId])fail('Mannschaft für das Admin-Panel auswählen.');
  if(!sourceId)fail('Die Export-Quellen-ID fehlt.');
  if(!['home','away'].includes(ownSide))fail('Heim- oder Auswärtsrolle auswählen.');
  const report=buildLiveReport(session,now.getTime());
  if(!report.complete||report.teamPoints===null||report.issues.length)fail('Zuerst das Spiel abschließen und mögliche Erfassungskonflikte lösen.');
  const opponentName=String(ownSide==='home'?game.away:game.home).trim();
  if(!opponentName||opponentName==='undefined')fail('Der Gegner fehlt.');
  const year=Number(game.date.slice(0,4)),start=Number(game.date.slice(5,7))>=7?year:year-1;
  const events=effectiveEvents(session),lastPeriod=Math.max(1,...events.map(e=>e.period));
  // A completed clock does not certify full statistical capture. Keep the import partial.
  return {format:'courthub.game-stats',schemaVersion:1,sourceId:String(sourceId),exportedAt:now.toISOString(),
    game:{id:game.id,teamId,season:`${start}/${start+1}`,date:game.date,opponentName,isHome:ownSide==='home',status:'finished',statsStatus:'partial',
      ourScore:report.teamPoints,opponentScore:report.plusMinusComplete?report.opponentPoints:null,
      regulationPeriods:session.config.periods,periodLengthSeconds:session.config.periodMs/1000,
      overtimePeriods:Math.max(0,lastPeriod-session.config.periods),overtimeLengthSeconds:session.config.overtimeMs/1000},
    players:report.players.map(p=>({id:p.id,name:p.name,number:p.jerseyNumber??null,participation:p.played?'played':'dnp',
      minutesSeconds:p.minutesSeconds,points:p.points,twoPointsMade:p.twoMade,twoPointsAttempted:p.twoAttempted,
      threePointsMade:p.threeMade,threePointsAttempted:p.threeAttempted,freeThrowsMade:p.ftMade,freeThrowsAttempted:p.ftAttempted,
      offensiveRebounds:p.oreb,defensiveRebounds:p.dreb,reboundsTotal:p.rebounds,assists:p.assists,steals:p.steals,blocks:p.blocks,
      turnovers:p.turnovers,fouls:p.fouls,plusMinus:report.plusMinusComplete?p.plusMinus:null}))};
}
export function renderGameStatsExport({game,session}){
  const section=document.createElement('section');section.className='live-report';section.dataset.role='game-stats-export';
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  section.append(make('h3','Statistik für das Admin-Panel exportieren'),make('p','Manuelle Live-Erfassung als JSON. Im Admin-Panel unter Spielerstatistiken → CourtHub + DBB importieren auswählen, prüfen und speichern. Danach „Bericht“ für den KI-Spielbericht öffnen.'));
  const bt=globalThis.window?.BT,storage=bt?.storage;
  const teamLabel=make('label','Mannschaft im Admin-Panel'),team=document.createElement('select');team.dataset.field='export-team';
  for(const [id,label]of Object.entries(TEAMS)){const option=make('option',label);option.value=id;team.append(option);}team.value=storage?.getSetting('gameStatsExportTeam','herren1')||'herren1';teamLabel.append(team);
  const sideLabel=make('label','Eigene Mannschaft'),side=document.createElement('select');side.dataset.field='export-side';
  for(const [id,label]of [['','Bitte auswählen'],['home','Heimteam'],['away','Gastteam']]){const o=make('option',label);o.value=id;side.append(o);}
  const home=/\blindau\b/i.test(game?.home||''),away=/\blindau\b/i.test(game?.away||'');
  side.value=session?.gameplan?.ownSide||(home!==away?(home?'home':'away'):'');sideLabel.append(side);
  const note=make('p','Teilweise erfasste Coach-Statistik: unbestätigte Gegnerpunkte und Plus/Minus bleiben leer. Endergebnis und fehlende Werte im Admin-Panel mit DBB.Scores ergänzen.');
  const status=make('p','');status.setAttribute('role','status');
  const button=make('button','Statistik exportieren');button.type='button';button.className='btn primary';button.dataset.action='export-game-stats';
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      let sourceId=storage?.getSetting('gameStatsExportSourceId','')||bt?.sync?.getState?.().user?.organization?.id;
      if(!sourceId)sourceId=crypto.randomUUID();
      const packet=buildGameStatsExport({game,session,teamId:team.value,sourceId,ownSide:side.value});
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
  section.append(teamLabel,sideLabel,note,button,status);return section;
}
