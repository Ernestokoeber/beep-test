window.BT = window.BT || {};

BT.insightModel = (() => {
  const round=value=>Math.round(value*10)/10;
  const valid=p=>Number.isFinite(p.numerator)&&Number.isFinite(p.denominator)&&p.denominator>0&&p.numerator>=0&&p.numerator<=p.denominator;
  function aggregate(points){
    const numerator=points.reduce((n,p)=>n+p.numerator,0),denominator=points.reduce((n,p)=>n+p.denominator,0);
    return {numerator,denominator,pct:denominator ? round(numerator/denominator*100) : null};
  }
  function metric(points,kind){
    const series=points.filter(valid),total=aggregate(series),recent=series.slice(-3),previous=series.slice(-6,-3);
    const current=aggregate(recent),baseline=aggregate(previous);
    const minimum=kind==='attendance' ? 1 : 10;
    const comparison=series.length>=6&&current.denominator>=minimum&&baseline.denominator>=minimum
      ? {recent:current,previous:baseline,delta:round(current.numerator/current.denominator*100-baseline.numerator/baseline.denominator*100),recentPoints:recent,previousPoints:previous} : null;
    return {series,total,comparison};
  }
  const empty=()=>({attendance:[],ft:[],fg:[]});
  const inSeason=(item,season)=>season==='all'||(item.seasonId || BT.util.seasonForDate(item.date))===season;
  function buildModel(season){
    const today=BT.util.todayISO();
    const trainings=BT.storage.getTrainings().filter(t=>t.date&&t.date<=today&&!t.cancelled&&BT.stats.isEnded(t)&&inSeason(t,season))
      .sort((a,b)=>(a.date+(a.startTime || '')+a.id).localeCompare(b.date+(b.startTime || '')+b.id));
    const games=BT.storage.getGames().filter(g=>inSeason(g,season)&&BT.games.statusFor(g).completed).sort((a,b)=>(b.date || '').localeCompare(a.date || ''));
    const players=BT.storage.getPlayers().slice().sort((a,b)=>(a.name || '').localeCompare(b.name || '','de'));
    const team=empty(),byPlayer=new Map(players.map(p=>[p.id,empty()]));
    for(const training of trainings){
      const measurements=new Map();
      const add=(id,kind,numerator,denominator)=>{
        const value={numerator:Number(numerator || 0),denominator:Number(denominator || 0)};
        if(BT.staff?.isCoachOnly(training,id)||!valid(value))return;
        if(!measurements.has(id))measurements.set(id,{attendance:{numerator:0,denominator:0},ft:{numerator:0,denominator:0},fg:{numerator:0,denominator:0}});
        const entry=measurements.get(id)[kind];entry.numerator+=value.numerator;entry.denominator+=value.denominator;
      };
      for(const a of (BT.staff?.playerAttendance(training) || training.attendance || []))if(['present','absent','excused','injured'].includes(a.status))add(a.playerId,'attendance',a.status==='present'?1:0,1);
      for(const a of training.freethrows || [])add(a.playerId,'ft',a.made,a.attempted);
      for(const c of training.shots || [])for(const a of c.entries || [])add(a.playerId,'fg',a.made,a.attempted);
      const point={id:training.id,date:training.date,title:training.note || training.plan?.summary || 'Teamtraining',href:'#/training/'+encodeURIComponent(training.id)+'/analysis'};
      for(const kind of ['attendance','ft','fg']){
        const values=[];
        for(const [id,entry] of measurements){
          if(entry[kind].denominator){values.push(entry[kind]);byPlayer.get(id)?.[kind].push({...point,...entry[kind]});}
        }
        const totals=aggregate(values);if(totals.denominator)team[kind].push({...point,numerator:totals.numerator,denominator:totals.denominator});
      }
    }
    const finalize=series=>Object.fromEntries(Object.entries(series).map(([key,values])=>[key,metric(values,key)]));
    return {season,trainings,games,team:finalize(team),players:players.map(player=>({player,metrics:finalize(byPlayer.get(player.id)),goals:(player.goals || []).filter(g=>g.status!=='done')}))};
  }
  function build(season=BT.storage.getActiveSeason() || 'all'){
    return BT.storage.withReadCache ? BT.storage.withReadCache(()=>buildModel(season)) : buildModel(season);
  }
  return {build,metric};
})();
