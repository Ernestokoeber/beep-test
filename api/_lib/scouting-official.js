const BASE='https://www.basketball-bund.net';
const key=value=>String(value || '').normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g,' ').trim();
const decode=value=>String(value).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff)));
const clean=value=>decode(value.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function parseRoster(html,teamName){
 // Only data cells of the matching named section; never expose masked names.
 const sections=String(html).split(/Spielerstatistiken\s+/i),players=[],statistics=[];let masked=0,statisticsUsable=false;
 for(const section of sections.slice(1)){
  if(key(clean(section.split('</td>')[0]))!==key(teamName))continue;
  for(const row of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=[...row[1].matchAll(/<td\b[^>]*class=["']sportItem(?:Even|Odd)["'][^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
   if(cells.length<8)continue;
   if(/[\*]/.test(cells[0]+cells[1])){masked++;continue;}
   if(!cells[0]||!cells[1]||cells[0].length>80||cells[1].length>100)continue;
   players.push(cells[1]+' '+cells[0]);
   statistics.push({name:cells[1]+' '+cells[0],points:Number(cells[2]),freeAttempted:Number(cells[3]),freeMade:Number(cells[4]),twoMade:Number(cells[5]),threeMade:Number(cells[6])});
   if(cells.slice(2).some(v=>Number(v)>0))statisticsUsable=true;
  }
 }
 return {players:[...new Set(players)],masked,statisticsUsable,statistics:statisticsUsable?statistics:[]};
}
export function attachOfficialResearch(report,evidence){
 if(!evidence)return report;
 const sources=[...(report.sources || []),...evidence.sources],first=evidence.teams[0];
 const names=new Set((first?.reports || []).flatMap(r=>r.players));
 const targetNames=new Set([...names].map(key)),youthNames=new Set(evidence.teams.slice(1).flatMap(t=>t.reports.flatMap(r=>r.players)).map(key));
 const players=(report.players || []).filter(p=>!youthNames.has(key(p.name))||targetNames.has(key(p.name))||(p.sourceIds || []).some(id=>!id.startsWith('dbb'))).map(p=>({...p}));
 for(const name of names){const rows=evidence.teams.flatMap(t=>t.reports.filter(r=>r.players.some(p=>key(p)===key(name))).map(r=>({team:t,report:r})));const old=players.find(p=>key(p.name)===key(name));const observation=rows.map(r=>r.team.age+' · '+r.report.date).join('; '),sourceIds=[...new Set(rows.flatMap(r=>r.report.sourceIds))];
  if(old){old.history+=' Direkt im Spielbericht genannt: '+observation;old.sourceIds=[...new Set([...old.sourceIds,...sourceIds])];}
  else players.push({name,history:'Namentlich im öffentlichen Spielbericht: '+observation+'. Dies belegt eine Kadernennung, keine Startposition und keinen Vereinswechsel.',previousClub:'',joinedSeason:'',status:'first_seen',season:first?.season || '',sourceIds});
 }
 // The provider may attach a roster URL to an unsupported inference. Facts
 // based solely on direct data are rebuilt from that data instead of prose.
 const external=row=>(row.sourceIds || []).some(id=>!id.startsWith('dbb'));
 const findings=(report.findings || []).filter(external).concat(evidence.comparisons.filter(c=>c.sourceIds.length).map(c=>({topic:'roster',season:first?.season || '',text:c.shared.length+' namentliche Überschneidungen zwischen '+first.age+' und '+c.age+': '+c.shared.join(', ')+'. Verglichen werden die verfügbaren Spielberichtskader, keine garantierte zukünftige Aufstellung.'+(c.masked?' Maskierte Namen bleiben unverglichen.':''),sourceIds:c.sourceIds})));
 const reference=new Date(evidence.targetDate+'T12:00:00Z').getTime(),nearby=evidence.teams.flatMap(t=>t.games.filter(g=>Math.abs(new Date(g.date+'T12:00:00Z').getTime()-reference)<=86400000).map(g=>({team:t,game:g})));
 for(const t of evidence.teams)for(const g of t.games.filter(g=>g.score&&!g.cancelled))findings.push({topic:'form',season:t.season,text:t.age+' · '+g.date+': '+g.home+' – '+g.away+' '+g.score+(g.confirmed?' (bestätigt).':' (noch unbestätigt).'),sourceIds:g.sourceIds});
 for(const {team,game} of nearby.filter(r=>r.game.cancelled))findings.push({topic:'form',season:team.season,text:team.age+' · '+game.date+' '+game.time+': '+game.home+' – '+game.away+' ist im direkt geprüften Spielplan abgesagt. Daraus folgt keine Aussage zu Einsatzzeit, Verfügbarkeit oder sonstiger Belastung.',sourceIds:game.sourceIds});
 let coachingEvidence=(report.coachingEvidence || []).filter(external);
 const youth=evidence.teams.find(t=>t.age==='U20'),last=youth?.reports.filter(r=>r.statisticsUsable).at(-1);
 if(last)for(const stat of last.statistics.filter(s=>targetNames.has(key(s.name))).sort((a,b)=>b.points-a.points).slice(0,2))coachingEvidence.push({text:'Beobachtungsauftrag: '+stat.name+' früh aufnehmen. Im U20-Spielbericht vom '+last.date+': '+stat.points+' Punkte und '+stat.threeMade+' Dreier. Übertragbarkeit auf das Herrenspiel und tatsächliche Rolle vor Ort prüfen.',sourceIds:last.sourceIds});
 if(nearby.some(r=>r.game.cancelled))coachingEvidence.push({text:'Belastung und Verfügbarkeit offen prüfen: Eine einzelne Spielabsage belegt weder Erholung noch unbegrenzte Einsatzzeit. Weitere Vereinsmannschaften und heutige Kadernennungen mitberücksichtigen.',sourceIds:[...new Set(nearby.flatMap(r=>r.game.sourceIds))]});
 coachingEvidence=coachingEvidence.slice(0,5);
 const summary=first?'Direkte Verbandsprüfung: '+names.size+' öffentlich lesbare Namen in '+first.reports.length+' geladenen Spielberichtskadern des Zielteams. '+evidence.comparisons.map(c=>c.shared.length+' namentliche Überschneidungen mit '+c.age).join('; ')+(evidence.comparisons.some(c=>c.shared.length)?'. Das belegt einen gemeinsamen Spielerkern, keine vollständige oder künftige Kaderidentität.':'. Ein gemeinsamer Spielerkern ist damit noch nicht belegt.'):'Keine direkte Mannschaftszuordnung verfügbar. '+(report.summary || '');
 return {...report,summary,summarySourceIds:first?[...new Set([...first.reports.flatMap(r=>r.sourceIds),...evidence.comparisons.flatMap(c=>c.sourceIds)])]:(report.summarySourceIds || []),sources,players,findings,coachingFocus:coachingEvidence.map(c=>c.text),coachingEvidence,officialEvidence:evidence,gaps:[...new Set([...(report.gaps || []),...evidence.gaps])]};
}
export function compareRosters(first,second){const a=new Set(first.map(key)),b=new Set(second.map(key));return{shared:first.filter(p=>b.has(key(p))),firstOnly:first.filter(p=>!b.has(key(p))),otherOnly:second.filter(p=>!a.has(key(p))),equalObserved:a.size>0&&a.size===b.size&&[...a].every(p=>b.has(p))};}
const season=value=>{const m=String(value).match(/(\d{4})\/(\d{4})/);return m?m[1].slice(-2)+'/'+m[2].slice(-2):'';};
export async function collectOfficialScouting(target,{fetchImpl=globalThis.fetch,signal}={}){
 const result={fetchedAt:new Date().toISOString(),targetDate:target.nextGameDate || new Date().toISOString().slice(0,10),teams:[],comparisons:[],sources:[],gaps:[],coverage:'Direkter DBB-Spielplan der Ziel-Liga; U20-/U18-Ligen desselben Verbands und Bezirks (höchstens sechs); jeweils bis zu drei frühere Spielberichte. Kein vollständiges Vereinsarchiv.'};
 if(!Number.isInteger(Number(target.leagueId))||Number(target.leagueId)<1||!Number(target.teamId)){result.gaps.push('Für die direkte Verbandsprüfung fehlen Liga- oder Mannschafts-ID.');return result;}
 const budget=AbortSignal.any([AbortSignal.timeout(8000),...(signal?[signal]:[])]);
 const get=async path=>{const response=await fetchImpl(BASE+path,{headers:{Accept:'application/json,text/html','User-Agent':'CourtHub/3.1 (+https://coach.tsv-lindau.de)'},signal:budget,redirect:'error'});if(!response.ok)throw Error('HTTP '+response.status);const body=await response.text();if(body.length>2_000_000)throw Error('Antwort zu groß');return body;};
 const source=url=>{let s=result.sources.find(s=>s.url===url);if(!s){s={id:'dbb'+(result.sources.length+1),url,title:'DBB · direkt geprüft'};result.sources.push(s);}return s.id;};
 const load=async id=>{const path='/rest/competition/spielplan/id/'+id,d=JSON.parse(await get(path));if(String(d.status)!=='0'||!d.data?.ligaData||!Array.isArray(d.data.matches))throw Error('Unbekanntes Spielplanformat');if(season(d.data.ligaData.seasonName)!==target.seasonId)throw Error('Abweichende Saison');return d.data;};
 const addTeam=(data,team)=>{const l=data.ligaData,leagueId=Number(l.ligaId),teamId=Number(team.teamPermanentId);if(result.teams.some(t=>t.teamId===teamId&&t.leagueId===leagueId))return;
  const matches=data.matches.filter(m=>[m.homeTeam,m.guestTeam].some(t=>Number(t?.teamPermanentId)===teamId));
  const games=matches.map(m=>({matchId:Number(m.matchId),date:String(m.kickoffDate).slice(0,10),time:String(m.kickoffTime || '').slice(0,5),home:m.homeTeam?.teamname,away:m.guestTeam?.teamname,score:typeof m.result==='string'?m.result:'',confirmed:m.ergebnisbestaetigt===true,cancelled:m.abgesagt===true,sourceIds:[source(BASE+'/rest/competition/spielplan/id/'+leagueId)]})).sort((a,b)=>a.date.localeCompare(b.date));
  result.teams.push({teamId,clubId:Number(team.clubId),leagueId,name:team.teamname,league:l.liganame,age:l.akName,season:target.seasonId,games,reports:[]});
 };
 let data,primary;
 try{data=await load(Number(target.leagueId));primary=data.matches.flatMap(m=>[m.homeTeam,m.guestTeam]).find(t=>Number(t?.teamPermanentId)===Number(target.teamId));if(!primary?.clubId)throw Error('Zielmannschaft nicht gefunden');addTeam(data,primary);}catch(error){result.gaps.push('Ziel-Liga konnte nicht direkt geprüft werden: '+error.message);return result;}
 const l=data.ligaData,leagueIds=new Set();
 // Publicly exposed filter IDs for U20 and U18; discover actual league IDs.
 const discoveries=await Promise.allSettled([310,311].map(async age=>{
  const query=new URLSearchParams({Action:'100',Verband:String(l.verbandId),cbAltersklasseFilter:String(age),cbGeschlechtFilter:String(l.geschlechtId)});
  if(l.bezirknr)query.set('cbBezirkFilter',String(l.bezirknr));
  const index=await get('/index.jsp?'+query);
  for(const match of index.matchAll(/Action=102(?:&amp;|&)liga_id=(\d+)/g))leagueIds.add(Number(match[1]));
 }));
 if(discoveries.some(r=>r.status==='rejected'))result.gaps.push('Mindestens eine Jugend-Ligenübersicht war nicht erreichbar.');
 if(leagueIds.size>6)result.gaps.push('Jugendligen auf sechs direkte Abrufe begrenzt; weitere Wettbewerbe bleiben offen.');
 const related=await Promise.allSettled([...leagueIds].filter(id=>id!==Number(target.leagueId)).slice(0,6).map(load));
 for(const item of related){if(item.status==='rejected'){result.gaps.push('Eine entdeckte Jugend-Liga war nicht prüfbar: '+item.reason.message);continue;}for(const t of item.value.matches.flatMap(m=>[m.homeTeam,m.guestTeam]))if(Number(t?.clubId)===Number(primary.clubId))addTeam(item.value,t);}
 const today=new Date().toISOString().slice(0,10),cutoff=target.nextGameDate&&target.nextGameDate<today?target.nextGameDate:today;
 const reports=result.teams.flatMap(team=>team.games.filter(g=>g.score&&!g.cancelled&&g.date<=cutoff).slice(-3).map(game=>({team,game}))).slice(0,12);
 // A bounded batch avoids flooding the public site.
 for(let offset=0;offset<reports.length;offset+=4)await Promise.all(reports.slice(offset,offset+4).map(async({team,game})=>{
  const path='/public/ergebnisDetails.jsp?type=1&spielplan_id='+game.matchId+'&liga_id='+team.leagueId+'&defaultview=1';
  try{const roster=parseRoster(await get(path),team.name);if(!roster.players.length&&!roster.masked)throw Error('Keine lesbare Spielerstatistik');team.reports.push({...roster,date:game.date,matchId:game.matchId,sourceIds:[source(BASE+path)]});}
  catch(error){result.gaps.push('Spielbericht '+game.matchId+' nicht auswertbar: '+error.message);}
 }));
 for(const team of result.teams)team.reports.sort((a,b)=>a.date.localeCompare(b.date));
 const first=result.teams[0],union=team=>[...new Set(team.reports.flatMap(r=>r.players))];
 for(const other of result.teams.slice(1)){
  const comparison=compareRosters(union(first),union(other));result.comparisons.push({teamId:other.teamId,leagueId:other.leagueId,age:other.age,league:other.league,...comparison,firstCount:union(first).length,otherCount:union(other).length,masked:first.reports.reduce((n,r)=>n+r.masked,0)+other.reports.reduce((n,r)=>n+r.masked,0),sourceIds:[...new Set([...first.reports,...other.reports].flatMap(r=>r.sourceIds))]});
 }
 result.gaps.push('Spielberichtskader sind keine bestätigten Starter. Künftige Besetzungen und Vereinswechsel werden daraus nicht abgeleitet.');
 if(result.teams.some(t=>t.reports.some(r=>!r.statisticsUsable)))result.gaps.push('Mindestens ein Spielbericht enthält ausschließlich Nullwerte. Diese werden nicht als individuelle Leistungsdaten ausgewertet.');
 return result;
}
