import assert from 'node:assert/strict';
import {collectOfficialScouting,parseRoster,compareRosters,attachOfficialResearch} from '../api/_lib/scouting-official.js';
import {generateWithGemini} from '../api/_lib/gemini-client.js';
const html=(team,names)=>'<td>Spielerstatistiken '+team+'</td><table>'+names.map(([last,first])=>'<tr><td class="sportItemEven"><NOBR>&nbsp;'+last+'&nbsp;</NOBR></td><td class="sportItemEven"><NOBR>&nbsp;'+first+'&nbsp;</NOBR></td>'+Array(6).fill('<td class="sportItemEven">0</td>').join('')+'</tr>').join('')+'</table>';
const page=html('Anderer Verein',[['Falsch','Spieler']])+html('Testverein',[['Müller','Jan'],['****','***'],['Groß','Kim']]);
assert.deepEqual(parseRoster(page,'Testverein').players,['Jan Müller','Kim Groß']);
assert.equal(parseRoster(page,'Testverein').masked,1);
assert.deepEqual(compareRosters(['Jan Müller','Kim Groß'],['Jan Müller','Alex Neu']).shared,['Jan Müller']);
assert.equal(compareRosters(['Jan Müller'],['Jan Müller']).equalObserved,true);
const team=(id,clubId=7)=>({teamPermanentId:id,clubId,teamname:'Testverein'});
const league=(id,age,matches)=>({status:'0',data:{ligaData:{ligaId:id,seasonName:'2026/2027',verbandId:2,bezirknr:2,geschlechtId:1,akName:age,liganame:age+' 26/27'},matches}});
const game=(id,t,date,cancelled=false)=>({matchId:id,homeTeam:t,guestTeam:{teamPermanentId:90,clubId:99,teamname:'Gast'},kickoffDate:date,kickoffTime:'10:00',result:date<'2026-10-17'?'70:60':null,abgesagt:cancelled});
const answers={
 '/rest/competition/spielplan/id/1':league(1,'Senioren',[game(11,team(5),'2026-10-10'),game(12,team(5),'2026-10-17')]),
 '/rest/competition/spielplan/id/2':league(2,'U20',[game(21,team(6),'2026-10-03'),game(22,team(6),'2026-10-18',true)]),
 '/rest/competition/spielplan/id/3':league(3,'U18',[game(31,team(8,123),'2026-10-11')])
};
const fetchImpl=async url=>{const u=new URL(url);assert.equal(u.origin,'https://www.basketball-bund.net');if(u.pathname==='/index.jsp')return new Response('<a href="index.jsp?Action=102&amp;liga_id=2"></a><a href="index.jsp?Action=102&liga_id=3"></a>');if(u.pathname.includes('ergebnisDetails'))return new Response(page);return new Response(JSON.stringify(answers[u.pathname]));};
const report=await collectOfficialScouting({leagueId:1,teamId:5,seasonId:'26/27',nextGameDate:'2026-10-17'},{fetchImpl});
assert.equal(report.teams.length,2,'Fremde Vereine dürfen trotz Namensgleichheit nicht verknüpft werden.');
assert.equal(report.comparisons[0].shared.length,2);assert.equal(report.teams[1].games.find(g=>g.date==='2026-10-18').cancelled,true);assert(report.sources.every(s=>s.url.startsWith('https://www.basketball-bund.net/')));
assert.equal(report.teams[0].reports[0].statisticsUsable,false,'Null-Platzhalter sind keine auswertbare Spielerleistung.');
assert.equal(report.teams[0].reports[0].players.length,2);assert.equal(report.teams[0].reports[0].starters,undefined,'Kader sind keine Starting Five.');
const youthOnly=structuredClone(report);youthOnly.teams[1].reports[0].players.push('Nur Jugend');const merged=attachOfficialResearch({sources:[],players:[],findings:[],gaps:[]},youthOnly);assert(!merged.players.some(p=>p.name==='Nur Jugend'),'Jugend-only-Spieler dürfen nicht als Teil des Herrenkaders erscheinen.');
const misplaced=attachOfficialResearch({sources:[],players:[{name:'Nur Jugend',sourceIds:['dbb2'],history:'U20'}],findings:[],gaps:[]},youthOnly);assert(!misplaced.players.some(p=>p.name==='Nur Jugend'),'Auch die KI darf reine Jugend-Kaderbelege nicht in den Zielkader verschieben.');
const overclaim=attachOfficialResearch({sources:[],players:[],summary:'Keine Doppelbelastung',findings:[{topic:'form',text:'Alle Spieler können unbegrenzt spielen',sourceIds:['dbb2']}],coachingEvidence:[{text:'Ohne Einsatzzeit-Restriktionen voll durchspielen',sourceIds:['dbb2']}],coachingFocus:['Ohne Einsatzzeit-Restriktionen voll durchspielen'],gaps:[]},report);
assert(!overclaim.findings.some(f=>f.text==='Alle Spieler können unbegrenzt spielen'));assert(!overclaim.coachingFocus.some(f=>f.includes('Restriktionen')));assert(!overclaim.summary.includes('Keine Doppelbelastung'));
const falseTransfer=attachOfficialResearch({sources:[],players:[{name:'Jan Müller',history:'Wechsel vom SV Beispiel',previousClub:'SV Beispiel',joinedSeason:'26/27',status:'confirmed_new',sourceIds:['dbb1']}],findings:[],gaps:[]},report);const rebuilt=falseTransfer.players.find(p=>p.name==='Jan Müller');assert.equal(rebuilt.previousClub,'','Ein Spielbericht belegt keinen vorherigen Verein.');assert.equal(rebuilt.joinedSeason,'');assert.equal(rebuilt.historyOrigin,'official');assert(!rebuilt.history.includes('Wechsel vom'));
const externalFallback=attachOfficialResearch({summary:'Extern belegt',summarySourceIds:['s1'],sources:[{id:'s1',url:'https://verein.test'}],players:[],findings:[],gaps:[]},{teams:[],comparisons:[],sources:[],gaps:['DBB nicht erreichbar']});assert.deepEqual(externalFallback.summarySourceIds,['s1']);
const missing=await collectOfficialScouting({leagueId:1,teamId:5,seasonId:'25/26'},{fetchImpl});assert.equal(missing.teams.length,0);assert(missing.gaps.length);
let providerCalls=0;
const generated=await generateWithGemini({action:'researchOpponent',payload:{opponent:{name:'Testverein',leagueId:1,teamId:5,seasonId:'26/27',nextGameDate:'2026-10-17'}},apiKey:'test',requestId:'direct',fetchImpl:async(url,options)=>{
 if(new URL(url).hostname==='www.basketball-bund.net')return fetchImpl(url);
 providerCalls++;const body=JSON.parse(options.body);assert(body.contents[0].parts.some(p=>p.text.includes('officialEvidence')||p.text.includes('DBB-Primärdaten')));
 const value=providerCalls===1?'Keine weiteren Webfunde.':JSON.stringify({teamName:'Testverein',season:'26/27',summary:'',summarySourceUrls:[],findings:[],players:[],lineups:[],coachingFocus:[],gaps:[]});
 return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:value}]}}]}));
}});
assert.equal(providerCalls,2);assert.equal(generated.value.officialEvidence.teams.length,2);assert.equal(generated.value.players.length,2);assert.equal(generated.value.sources.length,4);assert(!generated.value.gaps.some(g=>g.includes('Keine Fakten bestätigt')));
let abortTimer;
const partial=await generateWithGemini({action:'researchOpponent',payload:{opponent:{name:'Testverein',leagueId:1,teamId:5,seasonId:'26/27',nextGameDate:'2026-10-17'}},apiKey:'test',requestId:'timeout',setTimer:cb=>(abortTimer=cb,1),clearTimer:()=>{},fetchImpl:async(url)=>{if(new URL(url).hostname==='www.basketball-bund.net')return fetchImpl(url);abortTimer();throw new DOMException('Zeitlimit','AbortError');}});
assert.equal(partial.value.researchStatus,'partial');assert.equal(partial.value.officialEvidence.teams.length,2);assert(partial.value.summary.startsWith('Teilbericht'));assert(partial.value.gaps.some(g=>g.includes('zu lange')));
console.log('Direkte Verbandsrecherche: Vereinsverknüpfung, maskierte Namen, Kadervergleich, Saisontrennung, Absagen und Statistiklücken geprüft.');
