const berlinDate = value => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const count = value => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const valid = (made, attempted) => made !== null && attempted !== null && attempted > 0 && made <= attempted;
const positions = new Set(['treffer_baseline_links','treffer_fluegel_links','treffer_frontal','treffer_fluegel_rechts','treffer_baseline_rechts']);

function groups(points) {
  const grouped = new Map();
  for (const point of points) {
    if (!valid(point.made,point.attempted)) continue;
    let item = grouped.get(point.key);
    if (!item) { item = {...point,made:0,attempted:0,ids:new Set(),dates:[]}; grouped.set(point.key,item); }
    item.made += point.made; item.attempted += point.attempted;
    item.ids.add(point.sessionId); if (point.date) item.dates.push(point.date);
  }
  return [...grouped.values()].map(item => ({
    key:item.key,kind:item.kind,label:item.label,made:item.made,attempted:item.attempted,
    pct:Math.round(item.made/item.attempted*1000)/10,sessions:item.ids.size,
    from:item.dates.sort()[0] || null,until:item.dates.sort().at(-1) || null
  })).sort((a,b)=>a.label.localeCompare(b.label,'de'));
}

export function buildShootingComparison({profiles=[],sessions=[],exercises=[],measurements=[],teamRows=[],today=berlinDate(new Date())}={}) {
  return profiles.map(profile => {
    const completed = new Map(sessions.filter(s=>s.individual_profile_id===profile.id && s.status==='completed' && Number.isFinite(Date.parse(s.scheduled_for)) && berlinDate(s.scheduled_for)<=today).map(s=>[s.id,s]));
    const ownExercises = new Map(exercises.filter(e=>e.individual_profile_id===profile.id && completed.has(e.session_id)).map(e=>[e.id,e]));
    const latest = new Map();
    for (const measurement of measurements) {
      if (measurement.individual_profile_id!==profile.id || !completed.has(measurement.session_id) || !ownExercises.has(measurement.exercise_id) || ownExercises.get(measurement.exercise_id).session_id!==measurement.session_id) continue;
      const key=JSON.stringify([measurement.session_id,measurement.exercise_id,measurement.metric_key,measurement.attempt ?? 1]);
      const previous=latest.get(key),time=Date.parse(measurement.updated_at || measurement.server_received_at) || 0;
      if (!previous || time >= (Date.parse(previous.updated_at || previous.server_received_at) || 0)) latest.set(key,measurement);
    }
    const individual=[];
    for (const measurement of latest.values()) {
      const title=String(ownExercises.get(measurement.exercise_id).title || '').toLocaleLowerCase('de-DE');
      let key,kind,label;
      if (positions.has(measurement.metric_key) && /w[üu]rf/.test(title)) { key='positions';kind='field';label='Positionswürfe'; }
      else if (['treffer_links','treffer_rechts'].includes(measurement.metric_key) && (title.includes('korbabschluss') || title.includes('korbleger'))) { key='finishes';kind='finish';label='Korbabschlüsse'; }
      else if (measurement.metric_key==='treffer' && /freiw[üu]rf/.test(title)) { key='freethrows';kind='freethrow';label='Freiwürfe'; }
      else if (measurement.metric_key==='treffer' && /w[üu]rf/.test(title)) { key='field';kind='field';label='Weitere Feldwürfe'; }
      else continue;
      const attemptKey=JSON.stringify([measurement.session_id,measurement.exercise_id,String(measurement.metric_key).replace(/^treffer/,'versuche'),measurement.attempt ?? 1]);
      const explicit=latest.get(attemptKey);
      // Only a recorded attempt count or the recorded series unit is a denominator.
      // Planned repetitions and template volumes never become measured attempts.
      const series=String(measurement.unit || '').trim().match(/^von\s+(\d+)$/i);
      const attempted=explicit ? count(explicit.numeric_value) : series ? count(series[1]) : null;
      individual.push({key,kind,label,made:count(measurement.numeric_value),attempted,sessionId:measurement.session_id,date:berlinDate(completed.get(measurement.session_id).scheduled_for)});
    }
    const team=teamRows.filter(row=>row.individual_profile_id===profile.id && ['field','freethrow'].includes(row.kind)).map(row=>{
      const label=row.kind==='freethrow' ? 'Freiwürfe' : String(row.category || 'Feldwürfe').trim().slice(0,100) || 'Feldwürfe';
      return {key:row.kind+':'+label.toLocaleLowerCase('de-DE'),kind:row.kind,label,made:count(row.made),attempted:count(row.attempted),sessionId:row.training_id || row.training_date,date:row.training_date};
    });
    return {individual_profile_id:profile.id,individual:groups(individual),team:groups(team)};
  });
}

const array = expression => `CASE WHEN jsonb_typeof(${expression})='array' THEN ${expression} ELSE '[]'::jsonb END`;

export async function loadTeamShootingRows(execute, organizationId, profiles, today=berlinDate(new Date())) {
  if (!profiles.length) return [];
  const {rows} = await execute(`
    WITH authorized AS (
      SELECT ip.id,ip.player_profile_id,w.data->'trainings' AS trainings
        FROM individual_profiles ip JOIN workspaces w ON w.organization_id=ip.organization_id
       WHERE ip.organization_id=$1 AND ip.id=ANY($2::uuid[]) AND ip.active=TRUE
    ), eligible AS (
      SELECT a.id AS individual_profile_id,a.player_profile_id,t.value AS training
        FROM authorized a CROSS JOIN LATERAL jsonb_array_elements(${array('a.trainings')}) t
       WHERE t.value->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         AND t.value->>'date' <= $3
         AND COALESCE(t.value->>'cancelled','false') <> 'true'
         AND COALESCE(t.value->>'status','') NOT IN ('cancelled','abgesagt')
         AND (NULLIF(t.value->>'endedAt','') IS NOT NULL OR t.value->>'status'='completed'
              OR t.value->'liveSession'->>'status'='completed' OR t.value->>'date' < $3)
         AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${array("t.value->'staff'")}) staff
           WHERE staff.value->>'playerId'=a.player_profile_id AND COALESCE(staff.value->>'alsoPlayer','false') <> 'true')
    )
    SELECT e.individual_profile_id,e.training->>'id' AS training_id,e.training->>'date' AS training_date,
           'field' AS kind,s.value->>'category' AS category,r.value->>'made' AS made,r.value->>'attempted' AS attempted
      FROM eligible e CROSS JOIN LATERAL jsonb_array_elements(${array("e.training->'shots'")}) s
      CROSS JOIN LATERAL jsonb_array_elements(${array("s.value->'entries'")}) r
     WHERE r.value->>'playerId'=e.player_profile_id
    UNION ALL
    SELECT e.individual_profile_id,e.training->>'id',e.training->>'date','freethrow','Freiwürfe',r.value->>'made',r.value->>'attempted'
      FROM eligible e CROSS JOIN LATERAL jsonb_array_elements(${array("e.training->'freethrows'")}) r
     WHERE r.value->>'playerId'=e.player_profile_id`,[organizationId,profiles.map(p=>p.id),today]);
  return rows;
}
