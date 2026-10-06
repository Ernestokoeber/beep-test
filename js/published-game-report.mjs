// Published aggregate statistics are independent of the manual event journal.
import {validateStaff} from './coaching-staff.mjs';
const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const fields=['minutesMs','points','twoMade','threeMade','fieldGoalsMade','fieldGoalsAttempted','twoAttempted','threeAttempted','freeThrowsMade','freeThrowsAttempted','fouls','plusMinus','rebounds','assists','steals','blocks','turnovers'];
export function publishedGamePatch(packet,game,roster,now=new Date().toISOString()){
  requireValue(packet?.schemaVersion==='courthub.published-game.v1','Unbekanntes Spielbericht-Format.');
  requireValue(game&&packet.target?.date===game.date&&normalize(packet.target.home)===normalize(game.home)&&normalize(packet.target.away)===normalize(game.away),'Der Bericht gehört zu einem anderen Spiel.');
  const score=String(packet.score||'').match(/^(\d{1,3})\s*:\s*(\d{1,3})$/);
  requireValue(score,'Ein vollständiges Endergebnis fehlt.');
  const ownSide=packet.ownSide;requireValue(['home','away'].includes(ownSide),'Eigene Mannschaft als Heim oder Gast angeben.');
  requireValue(Array.isArray(packet.players)&&packet.players.length>=5&&packet.players.length<=40,'Der Spielbericht braucht einen vollständigen Kader.');
  const usedIds=new Set(),usedNumbers=new Set();
  const players=packet.players.map(row=>{
    const matches=roster.filter(player=>normalize(player.name)===normalize(row.name)&&(!row.playerId||player.id===row.playerId));
    requireValue(matches.length===1,`Spieler nicht eindeutig zugeordnet: ${row.name||'Ohne Namen'}.`);
    const player=matches[0];requireValue(!usedIds.has(player.id),'Spieler doppelt im Spielbericht.');usedIds.add(player.id);
    const jerseyNumber=row.jerseyNumber==null?null:String(row.jerseyNumber);
    requireValue(jerseyNumber===null||/^\d{1,2}$/.test(jerseyNumber),'Ungültige Spieltagsnummer.');
    if(jerseyNumber!==null){requireValue(!usedNumbers.has(jerseyNumber),'Doppelte Spieltagsnummer.');usedNumbers.add(jerseyNumber);}
    requireValue(['starter','bench','dnp'].includes(row.gameStatus),'Spielerstatus fehlt.');
    const values={};for(const key of fields){const value=row[key]??null;requireValue(value===null||Number.isInteger(value)&&Math.abs(value)<=(key==='minutesMs'?36000000:1000)&&(key==='plusMinus'||value>=0),`Ungültiger Wert: ${row.name} · ${key}.`);values[key]=value;}
    requireValue(values.points!==null,`Punkte fehlen bei ${row.name}.`);
    for(const [made,attempted]of [['twoMade','twoAttempted'],['threeMade','threeAttempted'],['fieldGoalsMade','fieldGoalsAttempted'],['freeThrowsMade','freeThrowsAttempted']])requireValue(values[made]===null||values[attempted]===null||values[made]<=values[attempted],`Mehr Treffer als Versuche bei ${row.name}.`);
    if([values.twoMade,values.threeMade,values.freeThrowsMade].every(v=>v!==null))requireValue(values.points===2*values.twoMade+3*values.threeMade+values.freeThrowsMade,`Würfe und Punkte stimmen bei ${row.name} nicht überein.`);
    if(values.twoMade!==null&&values.threeMade!==null){requireValue(values.fieldGoalsMade===null||values.fieldGoalsMade===values.twoMade+values.threeMade,`Feldwürfe stimmen bei ${row.name} nicht überein.`);values.fieldGoalsMade=values.twoMade+values.threeMade;}
    return {playerId:player.id,name:player.name,jerseyNumber,gameStatus:row.gameStatus,...values};
  });
  requireValue(players.filter(p=>p.gameStatus==='starter').length===5,'Genau fünf Starter im Spielbericht angeben.');
  requireValue(players.reduce((sum,p)=>sum+p.points,0)===Number(score[ownSide==='home'?1:2]),'Spielerpunkte stimmen nicht mit dem Endergebnis überein.');
  const periods=(packet.periodScores||[]).map((p,i)=>{requireValue(p.period===i+1&&Number.isInteger(p.home)&&p.home>=0&&Number.isInteger(p.away)&&p.away>=0,'Ungültiger Viertelstand.');return {period:p.period,home:p.home,away:p.away};});
  if(periods.length)requireValue(periods.reduce((sum,p)=>sum+p.home,0)===Number(score[1])&&periods.reduce((sum,p)=>sum+p.away,0)===Number(score[2]),'Viertelstände stimmen nicht mit dem Endergebnis überein.');
  const staff=packet.staff||[];validateStaff(staff);
  const opponentTotals={};for(const key of ['points','twoMade','threeMade','freeThrowsMade','freeThrowsAttempted','fouls']){const value=packet.opponentTotals?.[key]??null;requireValue(value===null||Number.isInteger(value)&&value>=0&&value<=1000,'Ungültige Gegnerstatistik.');opponentTotals[key]=value;}
  const opponentScore=Number(score[ownSide==='home'?2:1]);requireValue(opponentTotals.points===null||opponentTotals.points===opponentScore,'Gegnerpunkte stimmen nicht mit dem Endergebnis überein.');opponentTotals.points=opponentScore;
  if(['twoMade','threeMade','freeThrowsMade'].every(key=>opponentTotals[key]!==null))requireValue(2*opponentTotals.twoMade+3*opponentTotals.threeMade+opponentTotals.freeThrowsMade===opponentScore,'Gegnerwürfe stimmen nicht mit dem Endergebnis überein.');
  requireValue(opponentTotals.freeThrowsAttempted===null||opponentTotals.freeThrowsMade===null||opponentTotals.freeThrowsMade<=opponentTotals.freeThrowsAttempted,'Mehr gegnerische Freiwurftreffer als Versuche.');
  const sources=(packet.sources||[]).filter(s=>s&&typeof s.url==='string'&&/^https:\/\//.test(s.url)).map(s=>({url:s.url.slice(0,1000),recordId:String(s.recordId||s.matchId||'').slice(0,120)}));
  const report={schemaVersion:packet.schemaVersion,ownSide,score:`${Number(score[1])}:${Number(score[2])}`,players,periodScores:periods,opponentTotals,staff:structuredClone(staff),sources,importedAt:now};
  const playerStats=(game.playerStats||[]).map(p=>({...p}));
  for(const p of players){const stat=playerStats.find(s=>s.playerId===p.playerId)||{playerId:p.playerId};if(!playerStats.includes(stat))playerStats.push(stat);for(const key of fields)if(p[key]!==null)stat[key]=p[key];stat.minutes=p.minutesMs===null?null:p.minutesMs/60000;stat.jerseyNumber=p.jerseyNumber;stat.gameStatus=p.gameStatus;stat.source='published-game-report';}
  return {id:game.id,score:report.score,status:'played',officialMatchId:packet.officialMatchId?String(packet.officialMatchId):game.officialMatchId,publishedReport:report,playerStats};
}
export function renderPublishedReport(report,liveReport=null){
  const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const number=v=>v==null?'–':String(v),pair=(made,attempted)=>made==null?'–':attempted==null?`${made} Treffer · Versuche offen`:`${made}/${attempted}`;
  const minutes=ms=>ms==null?'Einsatzzeit offen':`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')} Minuten`;
  const metric=(host,label,value)=>{const item=el('div');item.append(el('dt',label),el('dd',value));host.append(item);};
  const total=key=>report.players.some(p=>p[key]==null)?null:report.players.reduce((sum,p)=>sum+p[key],0);
  const wrap=el('section',undefined,'live-report');wrap.dataset.role='published-report';
  const hero=el('header',undefined,'live-report-hero'),title=el('div',undefined,'live-report-title');
  title.append(el('p','Veröffentlichter Spielbericht · TSV-Webseite / DBB.Scores','live-report-eyebrow'),el('h2','Spielauswertung'));
  const badge=el('span','Übernommen','live-report-status');badge.dataset.state='published';hero.append(title,badge);
  const score=el('div',undefined,'live-report-score'),parts=report.score.split(':'),own=report.ownSide==='home'?parts[0]:parts[1],opponent=report.ownSide==='home'?parts[1]:parts[0];
  for(const [key,label,value]of [['own','Unser Team',own],['opponent','Gegner',opponent]]){if(key==='opponent')score.append(el('span',':','live-report-score-divider'));const team=el('div',undefined,'live-report-score-team');team.dataset.team=key;team.append(el('span',label),el('strong',value));score.append(team);}wrap.append(hero,score);
  if(report.periodScores.length){const section=el('section',undefined,'live-report-overview');section.append(el('h3','Viertelstände'));const list=el('dl',undefined,'live-report-team-quick');for(const p of report.periodScores)metric(list,`V${p.period}`,`${p.home}:${p.away}`);section.append(list);wrap.append(section);}
  if(report.staff.length){const section=el('section',undefined,'coaching-staff-summary');section.append(el('h3','Trainerteam'));for(const s of report.staff)section.append(el('p',`${s.role==='coach'?'Trainer':'Co-Trainer'}: ${s.name}`));wrap.append(section);}
  const overview=el('section',undefined,'live-report-overview'),quick=el('dl',undefined,'live-report-team-quick');overview.append(el('h3','Teamüberblick'));
  for(const [label,value]of [['PTS',own],['2er',number(total('twoMade'))],['3er',number(total('threeMade'))],['FW',pair(total('freeThrowsMade'),total('freeThrowsAttempted'))],['PF',number(total('fouls'))]])metric(quick,label,value);overview.append(quick);wrap.append(overview);
  if(report.opponentTotals){const detail=el('details',undefined,'live-report-capture-notes'),list=el('dl',undefined,'live-report-team-quick');detail.append(el('summary','Gegnerstatistik'));for(const [key,label]of [['points','PTS'],['twoMade','2er'],['threeMade','3er'],['fouls','PF']])metric(list,label,number(report.opponentTotals[key]));metric(list,'FW',pair(report.opponentTotals.freeThrowsMade,report.opponentTotals.freeThrowsAttempted));detail.append(list);wrap.append(detail);}
  const players=el('section',undefined,'live-report-players');players.append(el('h3','Spielerleistung'));
  for(const p of report.players){const article=el('article',undefined,'live-report-player');article.dataset.playerId=p.playerId;const head=el('header',undefined,'live-report-player-head'),identity=el('div');identity.append(el('h4',`${p.jerseyNumber==null?'Ohne Nummer':'#'+p.jerseyNumber} · ${p.name}`),el('p',`${minutes(p.minutesMs)} · ${p.gameStatus==='starter'?'Starting Five':p.gameStatus==='dnp'?'Nicht eingesetzt':'Bank'}`));head.append(identity);article.append(head);
    const metrics=el('dl',undefined,'live-report-player-quick');for(const [label,value]of [['PTS',number(p.points)],['REB',number(p.rebounds)],['AST',number(p.assists)],['+/−',p.plusMinus==null?'–':`${p.plusMinus>0?'+':''}${p.plusMinus}`]])metric(metrics,label,value);article.append(metrics);
    const detail=el('details',undefined,'live-report-player-details'),dl=el('dl');detail.append(el('summary','Würfe und weitere Werte'));for(const [label,value]of [['Zweier',pair(p.twoMade,p.twoAttempted)],['Dreier',pair(p.threeMade,p.threeAttempted)],['Feldwürfe',pair(p.fieldGoalsMade,p.fieldGoalsAttempted)],['Freiwürfe',pair(p.freeThrowsMade,p.freeThrowsAttempted)],['Fouls',number(p.fouls)],['Steals',number(p.steals)],['Blocks',number(p.blocks)],['Ballverluste',number(p.turnovers)]])dl.append(el('dt',label),el('dd',value));detail.append(dl);article.append(detail);players.append(article);
  }wrap.append(players);
  const provenance=el('details',undefined,'live-report-capture-notes');provenance.append(el('summary','Quellen und Erfassung'));provenance.append(el('p','Nicht veröffentlichte Werte bleiben offen (–). Feldwurfversuche und ein vollständiger Punkte- oder Wechselverlauf liegen nicht vor.'));
  if(liveReport?.teamPoints!=null)provenance.append(el('p',`Manuelle Live-Erfassung: ${liveReport.teamPoints}:${liveReport.opponentPoints??'–'}. Sie bleibt separat erhalten und bestimmt dieses Endergebnis nicht.`));
  for(const source of report.sources){const p=el('p'),link=el('a','Veröffentlichte Daten ansehen');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';p.append(link);provenance.append(p);}wrap.append(provenance);return wrap;
}
