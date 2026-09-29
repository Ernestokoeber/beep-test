import {actions,effectiveEvents,duration} from './core.mjs';
export const formatTime=ms=>{const sec=Math.ceil(Math.max(0,ms)/1000);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');};
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const button=(text,fn)=>{const n=el('button',text);n.type='button';n.addEventListener('click',fn);return n;};
const field=(parent,label,type,value)=>{const l=el('label',label),i=el('input');i.type=type;i.value=value??'';l.append(i);parent.append(l);return i;};
const select=(parent,label,items,value)=>{const l=el('label',label),s=el('select');for(const [v,t]of items){const o=el('option',t);o.value=v;s.append(o);}s.value=value;l.append(s);parent.append(l);return s;};
const parseTime=value=>{const m=/^(\d{1,2}):([0-5]\d)$/.exec(value.trim());if(!m)throw Error('Zeit als MM:SS eingeben, z. B. 08:30.');return (+m[1]*60 + +m[2])*1000;};

export function mountLiveView(container,controller){
  container.classList.add('live-game');
  let chosen=null,mode=null,signature='',current,correctionMode=false,inFlight=false;
  const status=el('p','','live-status');status.setAttribute('role','status');
  const header=el('header',undefined,'live-clock'),clockText=el('strong',''),periodText=el('span','');
  const start=button('Uhr starten',()=>send({kind:current.clock.running?'clock-pause':'clock-start'}));
  header.append(periodText,clockText,start);
  const body=el('div'),panel=el('section',undefined,'live-panel');container.append(header,status,body,panel);
  function showError(e){status.textContent=e.message;status.setAttribute('role','alert');}
  async function send(command){if(inFlight)return {ok:false};inFlight=true;try{const result=await controller.dispatch(command);if(result.ok){mode=null;panel.replaceChildren();}return result;}finally{inFlight=false;}}
  function form(title){mode=title;panel.replaceChildren(el('h3',title));const f=el('form');panel.append(f);f.append(button('Abbrechen',()=>{mode=null;panel.replaceChildren();}));return f;}
  function submit(f,text,fn){const b=el('button',text);b.type='submit';f.append(b);f.addEventListener('submit',async e=>{e.preventDefault();if(b.disabled)return;b.disabled=true;try{await fn();}catch(error){showError(error);}finally{b.disabled=false;}});queueMicrotask(()=>f.querySelector('input,select,button')?.focus());}
  function checks(f,title,players,selected=[]){const group=el('fieldset');group.append(el('legend',title));f.append(group);const fields=players.map(p=>{const i=field(group,p.name,'checkbox',p.id);i.checked=selected.includes(p.id);return i;});return ()=>fields.filter(i=>i.checked).map(i=>i.value);}
  function setup(s){
    body.replaceChildren(el('h2','Spieltagskader'),el('p','Eigene Mannschaft auswählen, anschließend genau fünf Starter markieren.'));
    const f=el('form');body.append(f);const rows=[];
    for(const p of s.roster){const row=el('div',undefined,'live-roster-row');const active=field(row,p.name,'checkbox',p.id);active.checked=true;
      const starter=field(row,'Startet','checkbox',p.id);starter.dataset.starter='';rows.push({p,active,starter});f.append(row);}
    const periods=field(f,'Reguläre Abschnitte','number',4);periods.min='1';periods.max='12';
    const minutes=field(f,'Minuten je Abschnitt','number',10);minutes.min='1';minutes.max='60';
    const overtime=field(f,'Minuten je Verlängerung','number',5);overtime.min='1';overtime.max='60';
    submit(f,'Erfassung starten',()=>send({kind:'setup',payload:{roster:rows.filter(r=>r.active.checked).map(r=>({id:r.p.id,name:r.p.name})),startingFive:rows.filter(r=>r.starter.checked).map(r=>r.p.id),config:{periods:+periods.value,periodMs:+minutes.value*60000,overtimeMs:+overtime.value*60000}}}));
  }
  async function substitutions(){
    if(current.clock.running){const r=await send({kind:'clock-pause'});if(!r.ok)return;}
    const f=form('Wechsel gemeinsam erfassen');
    const out=checks(f,'Vom Feld',current.roster.filter(p=>current.lineups.onCourt.includes(p.id)));
    const incoming=checks(f,'Von der Bank',current.roster.filter(p=>!current.lineups.onCourt.includes(p.id)));
    const short=field(f,'Unterzahl ausdrücklich bestätigen','checkbox','yes');
    submit(f,'Wechsel bestätigen',()=>send({kind:'substitution',payload:{out:out(),in:incoming(),allowShortHanded:short.checked}}));
  }
  function clockCorrection(){const f=form('Uhr korrigieren');f.append(el('p','Uhr zuerst anhalten. Bei betroffenen Wechseln die Zeiten im Korrekturprotokoll gemeinsam ändern.'));
    const t=field(f,'Restzeit (MM:SS)','text',formatTime(current.clock.remainingMs));
    submit(f,'Restzeit übernehmen',()=>send({kind:'clock-correction',payload:{toRemainingMs:parseTime(t.value)}}));}
  function confirmCommand(title,description,kind,payload={}){const f=form(title);f.append(el('p',description));submit(f,title,()=>send({kind,payload}));}
  function rosterCorrection(){const f=form('Kader ergänzen oder Namen korrigieren');
    f.append(el('p','Bestehende Spieler bleiben für frühere Aktionen erhalten. Zum Umbenennen vorhandenen Spieler auswählen.'));
    const who=select(f,'Spieler',[['new','Neuer Spieler'],...current.roster.map(p=>[p.id,p.name])],'new');
    const name=field(f,'Name','text','');name.required=true;name.maxLength=100;
    who.addEventListener('change',()=>{name.value=current.roster.find(p=>p.id===who.value)?.name||'';});
    submit(f,'Kaderkorrektur speichern',()=>send({kind:'roster',payload:{players:[{id:who.value==='new'?crypto.randomUUID():who.value,name:name.value.trim()}]}}));}
  function corrections(){
    const f=form('Protokoll korrigieren');f.append(el('p','Nur geänderte Zeilen werden gemeinsam gespeichert. Ungültige Folgeaktionen werden nicht automatisch umgebucht.'));
    const changes=[];
    for(const e of effectiveEvents(current.session)){
      if(['roster','period-start'].includes(e.kind))continue;
      const row=el('fieldset');row.id='live-event-'+e.id;row.append(el('legend','#'+e.seq+' · '+(actions[e.payload.action]||e.kind)+' · Abschnitt '+e.period));
      const t=field(row,'Restzeit (MM:SS)','text',formatTime(e.remainingMs));
      const remove=field(row,'Aktion rückgängig machen','checkbox','yes');let payload=()=>e.payload;
      if(e.kind==='stat'){
        const p=select(row,'Spieler',current.roster.map(p=>[p.id,p.name]),e.payload.playerId);
        const a=select(row,'Aktion',Object.entries(actions),e.payload.action);
        payload=()=>({playerId:p.value,action:a.value});
      }else if(e.kind==='substitution'){
        const out=checks(row,'Ausgewechselt',current.roster,e.payload.out),incoming=checks(row,'Eingewechselt',current.roster,e.payload.in);
        const short=field(row,'Unterzahl bestätigen','checkbox','yes');short.checked=!!e.payload.allowShortHanded;
        payload=()=>({out:out(),in:incoming(),allowShortHanded:short.checked});
      }else if(e.kind==='clock-correction'){
        const target=field(row,'Korrigierte Restzeit','text',formatTime(e.payload.toRemainingMs));payload=()=>({toRemainingMs:parseTime(target.value)});
      }
      const originalTime=t.value;
      changes.push(()=>{if(remove.checked)return {targetId:e.id,patch:null};const p=payload();
        if(t.value===originalTime&&JSON.stringify(p)===JSON.stringify(e.payload))return null;
        return {targetId:e.id,patch:{remainingMs:t.value===originalTime?e.remainingMs:parseTime(t.value),payload:p}};});f.append(row);
    }
    submit(f,'Korrekturen gemeinsam speichern',()=>{const patches=changes.map(fn=>fn()).filter(Boolean);if(!patches.length)throw Error('Keine Änderung ausgewählt.');return send({kind:'amend',payload:{changes:patches}});});
  }
  function render(s){
    current=s;header.hidden=!s.session;periodText.textContent=s.clock?'Abschnitt '+s.clock.period+' · '+s.stats.points+' eigene Punkte':'';
    clockText.textContent=s.clock?formatTime(s.clock.remainingMs):'';
    start.textContent=s.clock?.running?'Uhr anhalten':'Uhr starten';start.disabled=s.busy||s.readOnly||s.needsTakeover||s.clock?.ended;
    status.textContent=s.error||s.syncError||(s.clock?.needsCorrection?'Gerätezeit geändert: Restzeit über „Uhr korrigieren“ abgleichen.':s.busy?'Wird lokal gespeichert …':s.status==='synced'?'Lokal gesichert und synchronisiert.':'Lokal gesichert · Synchronisierung ausstehend.');
    const key=JSON.stringify([s.live,s.readOnly,s.needsTakeover]);
    if(key===signature){body.querySelectorAll('button').forEach(b=>{b.disabled=!!s.busy||(b.dataset.liveAction==='stat'&&!chosen);});return;}signature=key;
    body.replaceChildren();
    if(!s.live){if(s.readOnly)body.append(el('p','Für Live-Erfassung mit einem Trainerkonto anmelden.'));else setup(s);return;}
    if(!s.session){body.append(el('h2','Mehrere Erfassungen vorhanden'),el('p','Eine Sitzung zur Auswertung auswählen. Andere Protokolle bleiben erhalten.'));
      s.live.sessions.forEach((x,i)=>body.append(button('Erfassung '+(i+1)+' · '+x.events.length+' Aktionen',()=>confirmCommand('Diese Erfassung auswählen','Diese Auswahl bestimmt die Live-Auswertung.','select-session',{id:x.id}))));return;}
    if(s.readOnly){body.append(el('p','Lesender Zugriff. Keine Eingabe möglich.'));return;}
    if(s.needsTakeover){body.append(button('Erfassung auf diesem Gerät übernehmen',()=>confirmCommand('Erfassung übernehmen','Am bisherigen Gerät zuerst synchronisieren und die Erfassung schließen. Es wird eine fortsetzbare Kopie angelegt; die alte Sitzung bleibt erhalten.','takeover')));return;}
    if(s.clock.ended){body.append(el('h2','Spiel abgeschlossen'));body.append(button(correctionMode?'Korrekturmodus schließen':'Korrekturmodus öffnen',()=>{correctionMode=!correctionMode;signature='';render(current);}));if(!correctionMode)return;}
    if(!s.clock.ended){
      body.append(el('h2','Spieler wählen'));const players=el('div',undefined,'live-players');
      if(!s.lineups.onCourt.includes(chosen))chosen=null;
      for(const id of s.lineups.onCourt){const p=s.stats.players[id];const b=button(p.name+' · '+p.points+' P · '+p.fouls+' F',()=>{chosen=id;signature='';render(current);});b.dataset.player=id;b.setAttribute('aria-pressed',String(chosen===id));players.append(b);}body.append(players);
      const actionGrid=el('div',undefined,'live-actions');for(const [id,label]of Object.entries(actions)){const b=button(label,async()=>{if(!chosen)return;const r=await send({kind:'stat',payload:{playerId:chosen,action:id}});if(r.ok){chosen=null;signature='';render(current);}});b.dataset.liveAction='stat';b.disabled=!chosen||s.busy;actionGrid.append(b);}body.append(actionGrid);
      if(Object.values(s.stats.players).some(p=>p.fouls>=5))body.append(el('p','Foulgrenze erreicht: Aufstellung prüfen. Kein automatischer Wechsel.','live-warning'));
      const controls=el('div',undefined,'live-controls');controls.append(button(s.clock.running?'Uhr anhalten und wechseln':'Wechsel erfassen',substitutions),button('Letzte Aktion rückgängig',()=>send({kind:'undo-last'})),button('Uhr korrigieren',clockCorrection),button('Nächster Abschnitt',()=>confirmCommand('Nächsten Abschnitt vorbereiten',s.clock.period>=s.session.config.periods?'Eine Verlängerung vorbereiten? Uhr muss bei 0:00 stehen.':'Uhr muss bei 0:00 stehen. Der nächste Abschnitt startet pausiert.','period-start')),button('Spiel abschließen',()=>confirmCommand('Spiel abschließen','Die Uhr wird angehalten. Danach sind nur noch ausdrückliche Korrekturen möglich.','finish')));body.append(controls);
    }
    body.append(button('Kader korrigieren',rosterCorrection),button('Protokoll korrigieren',corrections));
    const history=el('details');history.append(el('summary','Aktionsprotokoll'));const list=el('ol');
    for(const e of effectiveEvents(s.session).slice().reverse()){const item=el('li','#'+e.seq+' · '+e.period+'/'+formatTime(e.remainingMs)+' · '+(s.roster.find(p=>p.id===e.payload.playerId)?.name||'')+' '+(actions[e.payload.action]||e.kind));item.title=e.id;list.append(item);}history.append(list);body.append(history);
  }
  const unsubscribe=controller.subscribe(render);
  return()=>{unsubscribe();container.replaceChildren();};
}
