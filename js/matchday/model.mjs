import {canonical,clone,ensure} from '../live-game/core.mjs';
const idOK=x=>typeof x==='string'&&x.length>0&&x.length<=120&&!['__proto__','prototype','constructor'].includes(x);
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const playerStatuses=new Set(['starter','bench','dnp']);
const tacticUsages=new Set(['offense','defense','inbound','pressbreak']);
export function emptyDraft(){return {ownSide:null,kind:'match',step:'game',roster:[],startingFive:[],config:{periods:4,periodMs:600000,overtimeMs:300000},goals:'',warmup:'',tactics:[],coachingNote:'',closingNote:''};}
function validateDraft(v){
  ensure(v&&[null,'home','away'].includes(v.ownSide)&&['match','training'].includes(v.kind)&&['game','roster','preparation','review'].includes(v.step),'schema','Ungültige Spieltagsvorbereitung.');
  ensure(['goals','warmup','coachingNote','closingNote'].every(k=>text(v[k],4000)),'schema','Notizen dürfen höchstens 4000 Zeichen enthalten.');
  ensure(Array.isArray(v.roster)&&v.roster.length<=40&&v.roster.every(p=>p&&idOK(p.id)&&text(p.name,100)&&(p.jerseyNumber===null||text(p.jerseyNumber,100))&&
    (p.gameStatus===undefined||playerStatuses.has(p.gameStatus))&&(p.role===undefined||text(p.role,120))),'schema','Ungültiger Kaderentwurf.');
  ensure(new Set(v.roster.map(p=>p.id)).size===v.roster.length,'schema','Spieler doppelt im Entwurf.');
  ensure(Array.isArray(v.startingFive)&&v.startingFive.length<=5&&v.startingFive.every(idOK)&&new Set(v.startingFive).size===v.startingFive.length,'schema','Ungültige Starterauswahl.');
  ensure(v.config&&Number.isInteger(v.config.periods)&&v.config.periods>=1&&v.config.periods<=12&&['periodMs','overtimeMs'].every(k=>Number.isInteger(v.config[k])&&v.config[k]>=1000&&v.config[k]<=3600000),'schema','Ungültige Uhr-Einstellungen.');
  ensure(Array.isArray(v.tactics)&&v.tactics.length<=20&&v.tactics.every(t=>t&&idOK(t.id)&&text(t.title,200)&&(t.usage===undefined||tacticUsages.has(t.usage)))&&new Set(v.tactics.map(t=>t.id)).size===v.tactics.length,'schema','Ungültige Taktikauswahl.');
}
export function validateMatchday(value){
  ensure(value&&value.schemaVersion===1&&Array.isArray(value.revisions)&&value.revisions.length>0&&value.revisions.length<=1000,'schema','Unbekannte oder zu große Spieltagsversion. App aktualisieren; lokale Daten behalten.');
  const map=new Map();
  for(const r of value.revisions){
    ensure(r&&[r.id,r.actorId,r.deviceId].every(idOK)&&typeof r.recordedAt==='string'&&Number.isFinite(Date.parse(r.recordedAt)),'schema','Ungültige Entwurfskennung.');
    ensure(!map.has(r.id),'collision','Doppelte Entwurfskennung.');
    ensure(Array.isArray(r.parents)&&r.parents.every(idOK)&&new Set(r.parents).size===r.parents.length&&canonical(r.parents)===canonical([...r.parents].sort()),'schema','Ungültige Vorgängerversion.');
    validateDraft(r.value);map.set(r.id,r);
  }
  const seen=new Set(),visiting=new Set();
  function visit(id){
    ensure(map.has(id),'schema','Vorgängerversion fehlt.');
    if(seen.has(id))return;
    ensure(!visiting.has(id),'schema','Zyklische Entwurfsversion.');
    visiting.add(id);map.get(id).parents.forEach(visit);visiting.delete(id);seen.add(id);
  }
  map.forEach(r=>visit(r.id));return value;
}
function heads(value){const parents=new Set(value.revisions.flatMap(r=>r.parents));return value.revisions.map(r=>r.id).filter(id=>!parents.has(id)).sort();}
export function mergeMatchday(a,b){
  if(!a&&!b)return {value:undefined,heads:[]};
  const map=new Map();
  for(const source of [a,b].filter(Boolean))for(const r of validateMatchday(source).revisions){
    ensure(!map.has(r.id)||canonical(map.get(r.id))===canonical(r),'collision','Entwurf wurde unter derselben Kennung unterschiedlich geändert.');map.set(r.id,clone(r));
  }
  const value={schemaVersion:1,revisions:[...map.values()].sort((x,y)=>x.id<y.id?-1:x.id>y.id?1:0)};
  validateMatchday(value);return {value,heads:heads(value)};
}
export function reviseMatchday(value,revision){
  const revisions=clone(value?.revisions||[]),existing=revisions.find(r=>r.id===revision.id);
  ensure(!existing||canonical(existing)===canonical(revision),'collision','Entwurfskennung bereits verwendet.');
  if(!existing)revisions.push(clone(revision));
  return mergeMatchday({schemaVersion:1,revisions},undefined).value;
}
export function selectDraft(value){
  if(!value)return {draft:null,heads:[],conflict:false};
  validateMatchday(value);const ids=heads(value);
  return {draft:ids.length===1?clone(value.revisions.find(r=>r.id===ids[0]).value):null,heads:ids,conflict:ids.length>1};
}
export function resolveMatchday(value,chosenId,metadata){
  const selection=selectDraft(value);ensure(selection.heads.includes(chosenId),'selection','Diese Entwurfsversion ist nicht mehr aktuell.');
  return reviseMatchday(value,{...metadata,parents:selection.heads,value:clone(value.revisions.find(r=>r.id===chosenId).value)});
}
