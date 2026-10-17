window.BT=window.BT || {};
BT.scoutingModel=(()=>{
 const key=value=>BT.opponents.keyFor(value),same=(a,b)=>Number(a.teamId)&&Number(b.teamId)?Number(a.teamId)===Number(b.teamId):key(a.name)===key(b.name);
 function list(){return BT.storage.withReadCache(()=>{
  const config=BT.seasonplanner.scheduleConfig(),profiles=BT.storage.getOpponents().map(p=>({...p})),games=BT.storage.getGames();
  for(const game of games){let target=null;const matches=(name,id)=>Number(id)&&Number(config.teamId)?Number(id)===Number(config.teamId):key(name)===key(config.teamName);
   if(matches(game.home,game.homeTeamId))target={name:game.away,teamId:game.awayTeamId};else if(matches(game.away,game.awayTeamId))target={name:game.home,teamId:game.homeTeamId};
   if(!target?.name)continue;let profile=profiles.find(p=>same(p,target));if(!profile){profile={...target,id:'schedule-'+(target.teamId || key(target.name)),key:BT.opponents.profileKey(target.name,target.teamId),seasonId:game.seasonId || BT.util.seasonForDate(game.date),source:'own-schedule',games:[],scouting:{},manualTotals:{},playerStats:[]};profiles.push(profile);}
   const populated=Object.fromEntries(Object.entries(game).filter(([,value])=>value!==''&&value!==null&&value!==undefined));
   profile.games=BT.opponents.mergeGames(profile.games || [],[populated]);
  }
  return BT.opponents.orderOpponentProfiles(profiles,games,config).map(row=>{const season=row.nextGame?.seasonId || row.profile.seasonId || BT.util.seasonForDate(row.profile.games?.at(-1)?.date || BT.util.todayISO());return {...row,profile:BT.opponents.forSeason(row.profile,season)};});
 });}
 const find=id=>list().find(row=>row.profile.id===id||id==='schedule-'+(row.profile.teamId || key(row.profile.name)));
 function compareLineups(report){const all=(report?.lineups || []).filter(l=>l.kind==='confirmed'&&l.date&&l.players?.length===5).sort((a,b)=>a.date.localeCompare(b.date)),latest=all.at(-1),previous=all.at(-2),left=new Set((previous?.players || []).map(key)),right=new Set((latest?.players || []).map(key));return {confirmedCount:all.length,latest,previous,added:previous?latest.players.filter(p=>!left.has(key(p))):[],removed:previous?previous.players.filter(p=>!right.has(key(p))):[]};}
 function ownLineup(game){if(!game)return[];const prep=BT.games.preparationState(game);return (prep.startingFive || []).map(id=>prep.roster.find(p=>p.id===id)).filter(Boolean).map(p=>({name:p.name,position:p.gamePosition || p.position || ''}));}
 function researchPayload(row){const {profile,nextGame}=row;return{opponent:{name:profile.name,teamId:profile.teamId,seasonId:nextGame?.seasonId || profile.seasonId || BT.util.seasonForDate(BT.util.todayISO()),leagueId:nextGame?.leagueId || profile.leagueId || BT.seasonplanner.scheduleConfig().leagueId,league:nextGame?.leagueName || profile.leagueName || '',region:profile.region || '',nextGameDate:nextGame?.date || ''},ownTeam:{name:BT.seasonplanner.scheduleConfig().teamName,lineup:ownLineup(nextGame)},knownPlayers:BT.opponents.playerSummary(profile).map(p=>p.name).slice(0,25),context:JSON.stringify({results:BT.opponents.metricsFor(profile),teamStatistics:BT.opponents.shootingSummary(profile)}).slice(0,4000)};}
 const reportFor=row=>{const report=row.profile.publicResearch,season=row.nextGame?.seasonId || row.profile.seasonId || BT.util.seasonForDate(BT.util.todayISO());return report?.season===season&&(!report.teamId||!row.profile.teamId||Number(report.teamId)===Number(row.profile.teamId))?report:null;};
 const playerKey=name=>String(name || '').normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g,' ').trim();
 function players(row){
  const report=reportFor(row),teams=report?.officialEvidence?.teams || [],target=row.profile.teamId?teams.find(t=>Number(t.teamId)===Number(row.profile.teamId)):teams[0],found=new Map();
  const add=name=>{name=String(name || '').trim();if(!name||name.includes('*'))return null;const id=playerKey(name);if(!found.has(id))found.set(id,{name,key:id,appearances:[],history:null,manual:null,targetEvidence:false});return found.get(id);};
  for(const r of target?.reports || [])for(const name of r.players || []){const p=add(name);if(p)p.targetEvidence=true;}
  for(const history of report?.players || []){const p=add(history.name);if(p)p.history=history;}
  for(const manual of BT.opponents.playerSummary(row.profile)){const p=add(manual.name);if(p)p.manual=manual;}
  for(const p of found.values())for(const team of teams)for(const r of team.reports || [])if(r.players?.some(n=>playerKey(n)===p.key))p.appearances.push({age:team.age,league:team.league,date:r.date,sourceIds:r.sourceIds || [],target:team===target,statisticsUsable:!!r.statisticsUsable,statistics:r.statisticsUsable?r.statistics?.find(s=>playerKey(s.name)===p.key):null});
  return [...found.values()].sort((a,b)=>a.name.localeCompare(b.name,'de'));
 }
 return{list,find,compareLineups,ownLineup,researchPayload,players,reportFor,playerKey};
})();
