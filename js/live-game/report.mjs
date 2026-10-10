import {projectBoxscore} from './boxscore.mjs';
const time=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
export function buildLiveReport(session,nowMs){
  try{
    return projectBoxscore(session,nowMs);
  }catch(e){return {players:[],teamPoints:null,stints:[],issues:[e.message],complete:false};}
}
export function renderLiveReport(report){
  const make=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const decimal=n=>n===null?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
  const pct=n=>n===null?'–':decimal(n)+' %';
  const plusMinus=p=>p.plusMinus===null?'–':(p.plusMinus>0?'+':'')+p.plusMinus;
  const addRows=(parent,rows)=>{for(const [label,value]of rows)parent.append(make('dt',label),make('dd',String(value)));};
  const addMetrics=(parent,rows)=>{for(const [label,value]of rows){const metric=make('div');metric.append(make('dt',label),make('dd',String(value)));parent.append(metric);}};
  const statGroup=(title,rows)=>{const section=make('section',undefined,'live-report-stat-group');section.append(make('h5',title));const dl=make('dl');addRows(dl,rows);section.append(dl);return section;};
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
  const overview=make('section',undefined,'live-report-overview');overview.append(make('h3','Teamüberblick'));
  const teamQuick=make('dl',undefined,'live-report-team-quick');
  addMetrics(teamQuick,[['PTS',report.teamPoints],['REB',report.team.rebounds],['AST',report.team.assists],['TOV',report.team.turnovers],['FG',report.team.fieldGoalsMade+'/'+report.team.fieldGoalsAttempted]]);overview.append(teamQuick);
  const teamDetails=make('details',undefined,'live-report-team-details');teamDetails.append(make('summary','Vollständiger Team-Boxscore'));
  teamDetails.append(
    statGroup('Wurf',[['Feldwürfe',report.team.fieldGoalsMade+'/'+report.team.fieldGoalsAttempted],['FG%',pct(report.team.fieldGoalPct)],['Zweier',report.team.twoMade+'/'+report.team.twoAttempted],['2P%',pct(report.team.twoPointPct)],['Dreier',report.team.threeMade+'/'+report.team.threeAttempted],['3P%',pct(report.team.threePointPct)],['Freiwürfe',report.team.ftMade+'/'+report.team.ftAttempted],['FT%',pct(report.team.freeThrowPct)],['eFG%',pct(report.team.effectiveFieldGoalPct)],['TS%',pct(report.team.trueShootingPct)]]),
    statGroup('Ballbesitz',[['Offensiv-Rebounds',report.team.oreb],['Defensiv-Rebounds',report.team.dreb],['Rebounds gesamt',report.team.rebounds],['Assists',report.team.assists],['Turnovers',report.team.turnovers],['AST/TO',decimal(report.team.assistTurnoverRatio)]]),
    statGroup('Defense und Effizienz',[['Steals',report.team.steals],['Blocks',report.team.blocks],['Fouls',report.team.fouls],['EFF',report.team.efficiency]])
  );overview.append(teamDetails);wrap.append(overview);
  const players=make('section',undefined,'live-report-players');players.append(make('h3','Spielerleistung'));
  for(const p of played){
    const article=make('article',undefined,'live-report-player');article.dataset.played='true';
    const head=make('header',undefined,'live-report-player-head'),identity=make('div');
    identity.append(make('h4',(p.jerseyNumber==null?'Ohne Nummer':'#'+p.jerseyNumber)+' · '+p.name),make('p',time(p.minutesMs)+' Minuten'));
    head.append(identity);article.append(head);
    const quick=make('dl',undefined,'live-report-player-quick');addMetrics(quick,[['PTS',p.points],['REB',p.rebounds],['AST',p.assists],['+/−',plusMinus(p)],['TOV',p.turnovers],['EFF',p.efficiency]]);article.append(quick);
    const details=make('details',undefined,'live-report-player-details');details.append(make('summary','Vollständiger Boxscore'));
    details.append(
      statGroup('Wurf',[['Feldwürfe',p.fieldGoalsMade+'/'+p.fieldGoalsAttempted],['FG%',pct(p.fieldGoalPct)],['Zweier',p.twoMade+'/'+p.twoAttempted],['2P%',pct(p.twoPointPct)],['Dreier',p.threeMade+'/'+p.threeAttempted],['3P%',pct(p.threePointPct)],['Freiwürfe',p.ftMade+'/'+p.ftAttempted],['FT%',pct(p.freeThrowPct)],['eFG%',pct(p.effectiveFieldGoalPct)],['TS%',pct(p.trueShootingPct)]]),
      statGroup('Ballbesitz',[['Offensiv-Rebounds',p.oreb],['Defensiv-Rebounds',p.dreb],['Rebounds gesamt',p.rebounds],['Assists',p.assists],['Turnovers',p.turnovers],['AST/TO',decimal(p.assistTurnoverRatio)]]),
      statGroup('Defense und Einfluss',[['Steals',p.steals],['Blocks',p.blocks],['Fouls',p.fouls],['Plus/Minus',plusMinus(p)],['EFF',p.efficiency]])
    );
    article.append(details);players.append(article);
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
