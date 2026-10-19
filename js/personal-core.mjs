// Shared rules; no account or health data is shipped in this module.
export const SOURCES = [
  ['NHS: Patellar tendinopathy', 'https://www.kingstonandrichmond.nhs.uk/patients-and-families/patient-leaflets/patellar-tendinopathy'],
  ['Leitlinie: progressiver Kraftaufbau', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11792096/'],
  ['NHS: Belastung und 24-Stunden-Reaktion', 'https://nhsforthvalley.com/health-services/az-of-services/physiotherapy/musculoskeletal-msk/patellar-tendinopathy/']
];
export function localDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function addDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10);
}
const exercise = (id,title,dose,cue) => ({id,title,dose,cue});
export const WORKOUTS = {
  strengthA: {title:'Kraft A · verträgliche Belastung finden',location:'Zuhause',minutes:25,exercises:[
    exercise('warmup','Ruhig aufwärmen','5 Minuten','Gehen auf ebener Fläche, nur soweit verträglich.'),
    exercise('hold','Flacher Wandsitz','3 × 20–30 Sekunden · 60–90 Sekunden Pause','Beidbeinig, verträglicher Winkel. Bei Reizung ersetzen: Oberschenkel mit gestrecktem Bein anspannen, Kniekehle sanft gegen eine Unterlage drücken, 10 × 5 Sekunden.'),
    exercise('bridge','Glute Bridge','2 × 10 · 60 Sekunden Pause','Beidbeinig, Hüfte kontrolliert heben und senken.'),
    exercise('calf','Wadenheben mit Handstütze','2 × 12 · 60 Sekunden Pause','Beidbeinig, langsam auf und ab.'),
    exercise('hip','Seitliches Beinheben','2 × 10 je Seite','In Seitenlage, Becken ruhig halten.')
  ]},
  strengthB: {title:'Kraft B · langsamer Kraftaufbau',location:'Zuhause',minutes:30,exercises:[
    exercise('warmup','Ruhig aufwärmen','5 Minuten','Nur im verträglichen Bereich.'),
    exercise('squat','Aufstehen vom hohen Stuhl','2 × 8 · 90 Sekunden Pause','Stabiler Stuhl. Etwa 3 Sekunden absenken und 3 Sekunden aufrichten. Bei Reizung durch die Halteübung aus Kraft A ersetzen.'),
    exercise('bridge','Glute Bridge','2 × 10 · 60 Sekunden Pause','Kontrolliert und mit Reserven.'),
    exercise('calf','Wadenheben mit Handstütze','2 × 12 · 60 Sekunden Pause','Langsam, ohne Federn.'),
    exercise('hip','Seitliches Beinheben','2 × 10 je Seite','Becken ruhig halten.')
  ]},
  court: {title:'Halle · Ballkontrolle und Wurfpräzision',location:'Halle',minutes:25,exercises:[
    exercise('warmup','Ruhig aufwärmen','5 Minuten','Keine Sprints, Sprünge oder abrupten Richtungswechsel.'),
    exercise('handle','Stationäre Ballkontrolle','6 × 30 Sekunden · jeweils 30 Sekunden Pause','Anspruchsvolle Rhythmus- und Höhenwechsel nach deinem Niveau. Keine tiefe Dauerposition oder explosiven Cuts.'),
    exercise('shots','Standwürfe aus kurzer Distanz','3 × 10 Versuche · 60–90 Sekunden Pause','Ohne Absprung; Distanz so wählen, dass kein kräftiges Nachdrücken nötig ist. Treffer und Versuche zählen.'),
    exercise('ft','Optionale Freiwürfe','2 × 5 Versuche','Nur ohne schmerzhaftes Nachdrücken oder Absprung. Insgesamt anfangs höchstens 40 Wurfversuche; bei Reizung früher beenden.')
  ]}
};
Object.assign(WORKOUTS, {
  recovery:{title:'Erholung',location:'Zuhause',minutes:10,exercises:[exercise('rest','Erholung','10 Minuten','Nur angenehme Alltagsbewegung und Kniekontrolle.')]},
  upper:{title:'Rumpf und Oberkörper',location:'Zuhause',minutes:25,exercises:[exercise('core','Dead Bug','2 × 6 je Seite','Rücken ruhig halten.')]},
  optionalCourt:{title:'Leichte Einheit / Halle optional',location:'Zuhause / optional Halle',minutes:20,exercises:[exercise('choice','Leichte Bewegung','15–20 Minuten','Nur eine verträgliche Variante wählen.')] }
});
export function createPlan({startDate=localDate(),goal='Kontrolliert zum Basketball zurückkehren',experience='Fortgeschritten',notes=''} = {}) {
  const kinds=['strengthA','court','strengthA','court','strengthB','court','strengthB','court'];
  return {version:1,title:'Mein Aufbauplan',goal,experience,notes,startDate,
    sessions:kinds.map((kind,i)=>({id:`unit-${i+1}`,kind,date:addDays(startDate,i*2),title:WORKOUTS[kind].title,minutes:WORKOUTS[kind].minutes,location:WORKOUTS[kind].location,
      instruction:kind==='strengthB'?'Nur wenn Kraft A einschließlich Folgetag vertragen wird. Sonst Kraft A wiederholen.':i>1?'Dosis zunächst wiederholen. Erst nach zwei gut vertragenen vergleichbaren Einheiten eine Größe vorsichtig steigern.':'Verträgliche Ausgangsdosis finden; keine Maximalleistung.',
      exercises:structuredClone(WORKOUTS[kind].exercises)}))};
}
export function reaction(record) {
  if (!record) return {level:'neutral',title:'Ausgangslage erfassen',text:'Mit einer kleinen, verträglichen Dosis beginnen.'};
  if (record.swelling || record.blocking || record.givingWay) return {level:'stop',title:'Belastung pausieren',text:'Neue Schwellung, Blockieren oder Wegknicken ärztlich beurteilen lassen.'};
  if (record.prePain > 3) return {level:'reduce',title:'Ausgangsbeschwerden erhöht',text:'Vor weiterer Belastung zur üblichen, gut verträglichen Ausgangslage zurückkehren und die Dosis mit der Physiotherapie abstimmen.'};
  if (record.postPain > 3 || record.postPain > record.prePain + 1) return {level:'reduce',title:'Belastung reduzieren',text:'Die letzte Einheit hat das Knie stärker gereizt. Zunächst zur üblichen Ausgangslage zurückkehren.'};
  if (record.nextPain === null || record.nextPain === undefined) return {level:'pending',title:'Rückmeldung am Folgetag fehlt',text:'Vor einer Steigerung Schmerz und Steifigkeit am nächsten Morgen erfassen.'};
  if (record.nextPain > record.prePain || record.stiffness) return {level:'reduce',title:'Dosis halten oder reduzieren',text:'Die Beschwerden sind am Folgetag noch erhöht. Keine Steigerung; bei anhaltender Verschlechterung Rücksprache mit der Physiotherapie.'};
  return {level:'stable',title:'Letzte Dosis vertragen',text:'Zunächst wiederholen. Eine einzelne gute Reaktion gibt Sprünge oder Spielbelastung noch nicht frei.'};
}
function str(value,max,label) {
  if(typeof value!=='string'||value.length>max) throw new TypeError(`${label} ist ungültig.`); return value;
}
function num(value,min,max,label,nullable=false) {
  if(nullable && value===null) return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) throw new TypeError(`${label} ist ungültig.`); return value;
}
export function validDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value) throw new TypeError('Datum ist ungültig.'); return value;
}
function id(value) { const v=str(value,80,'ID'); if(!/^[a-zA-Z0-9_-]+$/.test(v)) throw new TypeError('ID ist ungültig.');return v; }
export function validateStore(input) {
  if(!input||typeof input!=='object') throw new TypeError('Trainingsdaten fehlen.');
  let plan=null;
  if(input.plan) {
    const p=input.plan;
    if(!Array.isArray(p.sessions)||p.sessions.length<1||p.sessions.length>100) throw new TypeError('1 bis 100 Einheiten sind möglich.');
    plan={version:1,title:str(p.title,120,'Titel'),goal:str(p.goal,800,'Ziel'),experience:str(p.experience,120,'Erfahrung'),notes:str(p.notes,3000,'Hinweise'),startDate:validDate(p.startDate),sessions:p.sessions.map(s=>{
      if(!Object.hasOwn(WORKOUTS,s.kind)||!Array.isArray(s.exercises)||s.exercises.length<1||s.exercises.length>30) throw new TypeError('Einheit ist ungültig.');
      return {id:id(s.id),kind:s.kind,date:validDate(s.date),title:str(s.title,120,'Titel'),minutes:num(s.minutes,5,180,'Dauer'),location:str(s.location,100,'Ort'),instruction:str(s.instruction,1500,'Hinweis'),exercises:s.exercises.map(e=>({id:id(e.id),title:str(e.title,160,'Übung'),dose:str(e.dose,500,'Dosierung'),cue:str(e.cue,1500,'Ausführung')}))};
    })};
    if(p.type!==undefined) { if(!['starter','rehab'].includes(p.type)) throw new TypeError('Plantyp ist ungültig.'); plan.type=p.type; }
    if(p.endDate!==undefined) plan.endDate=validDate(p.endDate);
    if(p.guide!==undefined) {
      if(!Array.isArray(p.guide)||p.guide.length>10)throw new TypeError('Planleitfaden ist ungültig.');
      plan.guide=p.guide.map(g=>({title:str(g.title,150,'Leitfaden-Titel'),text:str(g.text,6000,'Leitfaden')}));
    }
    plan.sessions.forEach((s,i)=>{
      if(p.sessions[i].optional!==undefined){if(typeof p.sessions[i].optional!=='boolean')throw new TypeError('Optionaler Termin ist ungültig.');s.optional=p.sessions[i].optional;}
      if(p.sessions[i].phase!==undefined)s.phase=str(p.sessions[i].phase,120,'Stufe');
    });
    if(new Set(plan.sessions.map(s=>s.id)).size!==plan.sessions.length) throw new TypeError('Einheiten-IDs müssen eindeutig sein.');
    for(const s of plan.sessions) if(new Set(s.exercises.map(e=>e.id)).size!==s.exercises.length) throw new TypeError('Übungs-IDs müssen eindeutig sein.');
  }
  if(!Array.isArray(input.records)||input.records.length>500) throw new TypeError('Zu viele Protokolle.');
  const records=input.records.map(r=>{
    if(!Array.isArray(r.exercises)||r.exercises.length>30) throw new TypeError('Übungsprotokoll ungültig.');
    for(const f of ['stiffness','swelling','blocking','givingWay']) if(typeof r[f]!=='boolean') throw new TypeError('Knie-Reaktion ist ungültig.');
    return {id:id(r.id),sessionId:id(r.sessionId),date:validDate(r.date),title:str(r.title,120,'Titel'),minutes:num(r.minutes,1,240,'Dauer'),prePain:num(r.prePain,0,10,'Schmerz vorher'),postPain:num(r.postPain,0,10,'Schmerz danach'),nextPain:num(r.nextPain,0,10,'Schmerz am Folgetag',true),rpe:num(r.rpe,1,10,'Anstrengung'),stiffness:r.stiffness,swelling:r.swelling,blocking:r.blocking,givingWay:r.givingWay,notes:str(r.notes,2000,'Notiz'),exercises:r.exercises.map(e=>({id:id(e.id),title:str(e.title,160,'Übung'),done:e.done===true,actual:str(e.actual,500,'Ergebnis')}))};
  });
  if(new Set(records.map(r=>r.id)).size!==records.length) throw new TypeError('Protokoll-IDs müssen eindeutig sein.');
  return {plan,records};
}
