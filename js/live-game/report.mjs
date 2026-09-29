import {projectBoxscore} from './boxscore.mjs';
const time=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
export function buildLiveReport(session,nowMs){
  try{
    return projectBoxscore(session,nowMs);
  }catch(e){return {players:[],teamPoints:null,stints:[],issues:[e.message],complete:false};}
}
export function renderLiveReport(report){
  const make=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const pct=n=>n===null?'–':n.toFixed(1)+' %';
  const plusMinus=p=>p.plusMinus===null?'–':(p.plusMinus>0?'+':'')+p.plusMinus;
  const addRows=(parent,rows)=>{for(const [label,value]of rows)parent.append(make('dt',label),make('dd',String(value)));};
  const addMetrics=(parent,rows)=>{for(const [label,value]of rows){const metric=make('div');metric.append(make('dt',label),make('dd',String(value)));parent.append(metric);}};
  const wrap=make('section',undefined,'live-report');
  const hero=make('header',undefined,'live-report-hero');
  const title=make('div',undefined,'live-report-title');
  title.append(make('p','Coach-Statistik · nicht offizieller Spielbericht','live-report-eyebrow'),make('h2','Spielauswertung'));
  const status=make('span',report.complete?(report.plusMinusComplete?'Bestätigt':'Vorläufig'):'Zwischenstand','live-report-status');
  status.dataset.state=report.complete?(report.plusMinusComplete?'confirmed':'provisional'):'live';
  hero.append(title,status);
  const score=make('div',undefined,'live-report-score');
  const scoreTeam=(kind,label,value)=>{const team=make('div',undefined,'live-report-score-team');team.dataset.team=kind;team.append(make('span',label),make('strong',value));return team;};
  score.append(scoreTeam('own','Unser Team',report.teamPoints===null?'–':String(report.teamPoints)),make('span',':','live-report-score-divider'),scoreTeam('opponent','Gegner',report.opponentPoints==null?'–':String(report.opponentPoints)));
  wrap.append(hero,score);
  const captureNotes=make('details',undefined,'live-report-capture-notes');captureNotes.append(make('summary','Hinweise zur Erfassung'));
  const notes=make('div',undefined,'live-report-notes');
  for(const issue of report.issues)notes.append(make('p',issue,'live-report-warning'));
  if(report.teamPoints!==null)notes.append(make('p','Die Werte stammen ausschließlich aus der manuellen Live-Erfassung.'));
  notes.append(make('p',report.opponentPoints==null?'Plus/Minus nicht verfügbar: Punkteverlauf fehlt.':report.plusMinusComplete?'Punkteverlauf vom Coach bestätigt.':'Vorläufiges Plus/Minus – der Punkteverlauf wurde noch nicht vollständig bestätigt.'));
  captureNotes.append(notes);
  if(report.teamPoints===null){wrap.append(captureNotes);return wrap;}
  const played=report.players.filter(p=>p.played),dnp=report.players.filter(p=>!p.played);
  const totals=played.reduce((sum,p)=>({reb:sum.reb+p.rebounds,ast:sum.ast+p.assists,to:sum.to+p.turnovers,fgm:sum.fgm+p.fieldGoalsMade,fga:sum.fga+p.fieldGoalsAttempted}),{reb:0,ast:0,to:0,fgm:0,fga:0});
  const overview=make('section',undefined,'live-report-overview');overview.append(make('h3','Teamüberblick'));
  const teamQuick=make('dl',undefined,'live-report-team-quick');
  addMetrics(teamQuick,[['PTS',report.teamPoints],['REB',totals.reb],['AST',totals.ast],['TO',totals.to],['FG',totals.fgm+'/'+totals.fga]]);overview.append(teamQuick);wrap.append(overview);
  const players=make('section',undefined,'live-report-players');players.append(make('h3','Spielerleistung'));
  for(const p of played){
    const article=make('article',undefined,'live-report-player');article.dataset.played='true';
    const head=make('header',undefined,'live-report-player-head'),identity=make('div');
    identity.append(make('h4',(p.jerseyNumber==null?'Ohne Nummer':'#'+p.jerseyNumber)+' · '+p.name),make('p',time(p.minutesMs)+' Minuten'));
    head.append(identity);article.append(head);
    const quick=make('dl',undefined,'live-report-player-quick');addMetrics(quick,[['PTS',p.points],['REB',p.rebounds],['AST',p.assists],['+/−',plusMinus(p)]]);article.append(quick);
    const details=make('details',undefined,'live-report-player-details');details.append(make('summary','Würfe und weitere Werte'));
    const dl=make('dl');addRows(dl,[['Freiwürfe',p.ftMade+'/'+p.ftAttempted],['Zweier',p.twoMade+'/'+p.twoAttempted],['Dreier',p.threeMade+'/'+p.threeAttempted],['Feldwürfe',p.fieldGoalsMade+'/'+p.fieldGoalsAttempted],['Feldwurfquote',pct(p.fieldGoalPct)],['Freiwurfquote',pct(p.freeThrowPct)],['Offensiv-Rebounds',p.oreb],['Defensiv-Rebounds',p.dreb],['Steals',p.steals],['Blocks',p.blocks],['Ballverluste',p.turnovers],['Fouls',p.fouls]]);
    details.append(dl);article.append(details);players.append(article);
  }
  if(!played.length)players.append(make('p','Noch keine Einsatzdaten vorhanden.','live-report-empty'));
  wrap.append(players);
  if(dnp.length){const absent=make('details',undefined,'live-report-dnp');absent.append(make('summary','Nicht eingesetzt ('+dnp.length+')'));const list=make('ul');for(const p of dnp)list.append(make('li',(p.jerseyNumber==null?'Ohne Nummer':'#'+p.jerseyNumber)+' · '+p.name+' · '+(report.complete?'DNP – nicht eingesetzt':'Noch nicht eingesetzt')));absent.append(list);wrap.append(absent);}
  wrap.append(captureNotes);
  if(report.stints.length){const history=make('details',undefined,'live-report-history');history.append(make('summary','Aufstellungsverlauf'));const list=make('ol');
    for(const stint of report.stints)list.append(make('li',time(stint.fromMs)+'–'+time(stint.toMs)+' gespielte Zeit: '+stint.onCourt.map(id=>report.players.find(p=>p.id===id)?.name||id).join(', ')));
    history.append(list);wrap.append(history);}
  return wrap;
}
