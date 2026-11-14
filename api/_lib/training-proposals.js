import {createHash} from 'node:crypto';
import {text, optionalText, uuid} from './individual-training.js';

export function proposalError(status, message) { const error=new TypeError(message);error.status=status;throw error; }
// PostgreSQL JSONB reorders object keys; the concurrency guard must be canonical.
export const revision = value => createHash('sha256').update(JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)).digest('hex');
export const SKILLS=['dribbling','drive','decision','footwork','post','passing','shooting','defense'];

export function planningPreferences(input={}) {
  const priorities=Array.isArray(input.priorities)?input.priorities:[];
  if(priorities.length>5 || new Set(priorities).size!==priorities.length || priorities.some(x=>!SKILLS.includes(x)))throw new TypeError('Bitte bis zu fünf unterschiedliche Trainingsschwerpunkte wählen.');
  const integer=(key,fallback,min,max)=>{const n=Number(input[key]??fallback);if(!Number.isInteger(n)||n<min||n>max)throw new TypeError('Ungültige Rahmenbedingung: '+key);return n;};
  const equipment=Array.isArray(input.equipment)?input.equipment:['Basketball','Korb'];
  if(equipment.length>12 || equipment.some(x=>typeof x!=='string'||!x.trim()||x.length>80))throw new TypeError('Bitte gültiges Material angeben.');
  return {priorities,goal:optionalText(input.goal,'Trainingsziel',{max:1200})||'',
    exclusions:optionalText(input.exclusions,'Ausschlüsse',{max:800})||'',
    threePointApproved:input.threePointApproved===true,players:integer('players',1,1,2),helpers:integer('helpers',1,0,2),baskets:integer('baskets',1,0,2),
    level:['Grundlagen','Aufbau','Fortgeschritten'].includes(input.level)?input.level:'Aufbau',equipment};
}

export function editExercise(e, allowedIds) {
  const id=e.id?uuid(e.id,'Übungs-ID'):null;
  if(id&&!allowedIds.has(id))throw new TypeError('Die Übung gehört nicht zu diesem Trainingsplan.');
  const durationMinutes=e.durationMinutes===null||e.durationMinutes===''?null:Number(e.durationMinutes);
  if(durationMinutes!==null&&(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>120))throw new TypeError('Übungsdauer: 1 bis 120 Minuten.');
  const details={};
  for(const key of ['goal','setup','steps','sets','reps','pause','equipment','level','easier','harder'])details[key]=optionalText(e.details?.[key],key,{max:key==='steps'?2000:1200})||'';
  return {id,title:text(e.title,'Übung',{min:2,max:200}),durationMinutes,
    repetitions:optionalText(e.repetitions,'Ablauf',{max:2000})||'',measurementInstruction:optionalText(e.measurementInstruction,'Erfolgskriterium',{max:2000})||'',
    cues:optionalText(e.cues,'Trainerhinweise',{max:1000})||'',observation:optionalText(e.observation,'Beobachtung',{max:500})||'',details,
    locked:e.locked===true};
}

export function snapshotPlan(plan, session, exercises) {
  return {planId:plan.id,sessionId:session.id,expectedVersion:plan.version,title:plan.title,objective:plan.objective,
    scheduledFor:new Date(session.scheduled_for).toISOString(),durationMinutes:session.duration_minutes,unitNumber:session.unit_number,status:session.status,
    exercises:exercises.map(e=>({id:e.id,title:e.title,durationMinutes:e.measurement_method?.durationNotRecorded?null:e.duration_minutes,
      repetitions:e.repetitions?.instruction||'',measurementInstruction:e.measurement_method?.instruction||'',cues:(e.coaching_cues||[]).join('\n'),
      details:e.repetitions?.details||{},locked:e.repetitions?.locked===true,observation:''}))};
}

export function validatePlanEdit(input, base) {
  if(input.expectedVersion!==base.expectedVersion)proposalError(409,'Der Plan wurde inzwischen geändert. Bitte neu öffnen.');
  if(!Array.isArray(input.exercises)||input.exercises.length<1||input.exercises.length>30)throw new TypeError('Bitte 1 bis 30 Übungen angeben.');
  const ids=new Set(base.exercises.map(e=>e.id));
  const exercises=input.exercises.map(e=>editExercise(e,ids));
  const retained=exercises.map(e=>e.id).filter(Boolean);
  if(new Set(retained).size!==retained.length)throw new TypeError('Eine Übung ist doppelt zugeordnet.');
  if(exercises.some(e=>e.durationMinutes===null))throw new TypeError('Für einen geplanten Ablauf benötigt jede Übung eine Dauer.');
  if(exercises.reduce((n,e)=>n+e.durationMinutes,0)>base.durationMinutes)throw new TypeError('Übungszeiten einschließlich Pausen und Übergängen überschreiten die Einheitsdauer.');
  return {...base,title:text(input.title,'Titel',{min:2,max:200}),objective:text(input.objective,'Ziel',{min:2,max:3000}),exercises};
}

export function targetSlots(plans, {scope,selectedKeys=[],lockedKeys=[],protectEdits=true}, bases, measuredIds=new Set()) {
  if(!['exercise','block','session','week'].includes(scope))throw new TypeError('Ungültiger Umfang der Neugenerierung.');
  if(!Array.isArray(selectedKeys)||!Array.isArray(lockedKeys)||selectedKeys.length>30||lockedKeys.length>120)throw new TypeError('Ungültige Übungsauswahl.');
  const existingKeys=new Set(plans.flatMap(p=>p.exercises.map((e,i)=>`${p.planId}:${i}`)));
  if([...selectedKeys,...lockedKeys].some(k=>!existingKeys.has(k)))throw new TypeError('Die Übungsauswahl ist nicht mehr aktuell.');
  if(scope==='exercise'&&selectedKeys.length!==1 || scope==='block'&&!selectedKeys.length)throw new TypeError('Bitte die zu ersetzenden Übungen auswählen.');
  const slots=[];
  for(const plan of plans) {
    const base=bases.find(p=>p.planId===plan.planId);
    for(const [index,e] of plan.exercises.entries()) {
      const key=`${plan.planId}:${index}`,old=base.exercises.find(x=>x.id&&x.id===e.id);
      const comparable=(value,key)=>key==='details'?JSON.stringify(Object.entries(value||{}).filter(([,v])=>v).sort()):JSON.stringify(value);
      const changed=!old || ['title','durationMinutes','repetitions','measurementInstruction','cues','details'].some(k=>comparable(old[k],k)!==comparable(e[k],k));
      const selected=['session','week'].includes(scope)||selectedKeys.includes(key);
      if(selected&&!e.locked&&!lockedKeys.includes(key)&&!measuredIds.has(e.id)&&!(protectEdits&&changed)) {
        if(!Number.isInteger(e.durationMinutes))throw new TypeError('Bitte zuerst eine Zeit für jede ausgewählte Übung angeben.');
        slots.push({slotId:key,planId:plan.planId,index,minutes:e.durationMinutes,title:e.title});
      }
    }
  }
  if(!slots.length)proposalError(409,'Keine veränderbare Übung ausgewählt. Beibehalten, eigene Änderungen und erfasste Ergebnisse werden geschützt.');
  if(slots.length>30)throw new TypeError('Bitte höchstens 30 Übungen pro KI-Auftrag auswählen.');
  return slots;
}

export function applyGeneratedExercises(plans, slots, result, preferences) {
  if(!Array.isArray(result?.exercises)||result.exercises.length!==slots.length)throw new TypeError('Die KI hat nicht genau die ausgewählten Übungen geliefert.');
  const proposal=structuredClone(plans),seen=new Set();
  for(const item of result.exercises) {
    const slot=slots.find(s=>s.slotId===item.slotId);
    if(!slot||seen.has(item.slotId))throw new TypeError('Ungültige oder doppelte KI-Übungszuordnung.');seen.add(item.slotId);
    if(item.minutes!==slot.minutes)throw new TypeError('Die KI hat die feste Zeitvorgabe verändert.');
    if(!Number.isInteger(item.players)||item.players<1||item.players>preferences.players||!Number.isInteger(item.helpers)||item.helpers<0||item.helpers>preferences.helpers||!Number.isInteger(item.baskets)||item.baskets<0||item.baskets>preferences.baskets)throw new TypeError('Die KI-Übung überschreitet die verfügbaren Spieler, Helfer oder Körbe.');
    if(!Array.isArray(item.equipment)||item.equipment.some(x=>!preferences.equipment.includes(x)))throw new TypeError('Die KI benötigt nicht freigegebenes Material.');
    const serialized=JSON.stringify(item);
    if(!preferences.threePointApproved&&/dreier|drei[ -]?punkte|three[ -]?point|3[ -]?point|3er/i.test(serialized))throw new TypeError('Dreier sind für dieses Entwicklungsprofil noch nicht freigegeben.');
    const plan=proposal.find(p=>p.planId===slot.planId);
    const exercise=editExercise({title:item.title,durationMinutes:item.minutes,repetitions:item.instructions,
      measurementInstruction:item.successIndicator,cues:item.cues,details:{goal:item.goal,setup:item.setup,steps:item.instructions,pause:item.pause,equipment:item.equipment.join('\n'),level:preferences.level,easier:item.easier,harder:item.harder}},new Set());
    if(!exercise.repetitions||!exercise.measurementInstruction||!exercise.details.setup||!exercise.cues)throw new TypeError('Der KI-Übung fehlen Ablauf, Aufbau, Coaching oder Erfolgskriterium.');
    plan.exercises[slot.index]=exercise;
  }
  return {plans:proposal};
}
