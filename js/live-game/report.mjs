import {projectBoxscore} from './boxscore.mjs';
const time=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
export function buildLiveReport(session,nowMs){
  try{
    return projectBoxscore(session,nowMs);
  }catch(e){return {players:[],teamPoints:null,stints:[],issues:[e.message],complete:false};}
}
export function renderLiveReport(report){
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const wrap=make('section','');wrap.className='live-report';wrap.append(make('h2','Manuell erfasste Coach-Statistik'),make('p',report.complete?'Abgeschlossen':'Zwischenstand – noch kein abschließender Spielbericht'));
  for(const issue of report.issues)wrap.append(make('p',issue));
  if(report.teamPoints===null)return wrap;
  wrap.append(make('p','Eigene erfasste Punkte: '+report.teamPoints+' · Ohne Addition von manuellem Boxscore oder Atlas.'));
  wrap.append(make('p',report.opponentPoints===null?'Plus/Minus nicht verfügbar: Punkteverlauf fehlt.':'Gegnerische erfasste Punkte: '+report.opponentPoints));
  if(report.opponentPoints!==null)wrap.append(make('p',report.plusMinusComplete?'Punkteverlauf vom Coach bestätigt. Keine offizielle Statistik.':'Vorläufiges Plus/Minus – erfasster Verlauf, Vollständigkeit nicht bestätigt.'));
  for(const p of report.players){
    const article=make('article','');article.append(make('h3',(p.jerseyNumber==null?'Ohne Nummer':'#'+p.jerseyNumber)+' · '+p.name+' · '+p.points+' Punkte · '+time(p.minutesMs)+' Minuten'));
    article.append(make('p',p.played?'Gespielt':report.complete?'DNP – nicht eingesetzt':'Noch nicht eingesetzt'));
    const details=make('details','');details.append(make('summary','Statistik anzeigen'));const dl=make('dl','');
    const pct=n=>n===null?'–':n.toFixed(1)+' %';
    const rows=[['Freiwürfe',p.ftMade+'/'+p.ftAttempted],['Zweier',p.twoMade+'/'+p.twoAttempted],['Dreier',p.threeMade+'/'+p.threeAttempted],['Feldwürfe',p.fieldGoalsMade+'/'+p.fieldGoalsAttempted],['Feldwurfquote',pct(p.fieldGoalPct)],['Freiwurfquote',pct(p.freeThrowPct)],['Offensiv-Rebounds',p.oreb],['Defensiv-Rebounds',p.dreb],['Rebounds gesamt',p.rebounds],['Assists',p.assists],['Steals',p.steals],['Blocks',p.blocks],['Ballverluste',p.turnovers],['Fouls',p.fouls]];
    rows.push(['Plus/Minus',p.plusMinus===null?(p.played?'Nicht verfügbar':'–'):(p.plusMinus>0?'+':'')+p.plusMinus]);
    for(const [label,value]of rows)dl.append(make('dt',label),make('dd',String(value)));details.append(dl);article.append(details);wrap.append(article);
  }
  const history=make('details','');history.append(make('summary','Aufstellungsverlauf'));const list=make('ol','');
  for(const stint of report.stints)list.append(make('li',time(stint.fromMs)+'–'+time(stint.toMs)+' gespielte Zeit: '+stint.onCourt.map(id=>report.players.find(p=>p.id===id)?.name||id).join(', ')));
  history.append(list);wrap.append(history);return wrap;
}
