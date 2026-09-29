import {clone} from '../live-game/core.mjs';
import {buildSetup} from './flow.mjs';
import {mountMatchdayLive} from './live-shell.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function mountMatchdayView(container,controller,{players=()=>[],tactics=()=>[],onLive=(host,c)=>mountMatchdayLive(host,c,{tactics})}={}){
  container.classList.add('matchday');let stage='',draft,parents,read=()=>draft,dirty=false,saving=false,revision=0,liveCleanup=null,dead=false,pending=Promise.resolve(true);
  const title=el('h2','Dein Spieltag'),steps=el('p'),status=el('p'),body=el('div');status.setAttribute('role','status');container.append(title,steps,status,body);
  function field(parent,label,key,type,value){const l=el('label',label),n=el(type==='textarea'?'textarea':type==='select'?'select':'input');if(n.tagName==='INPUT')n.type=type;n.dataset.field=key;if(type!=='select')n.value=value??'';l.append(n);parent.append(l);return n;}
  function button(parent,label,action,fn){const n=el('button',label);n.type='button';n.dataset.action=action;n.addEventListener('click',fn);parent.append(n);return n;}
  function mark(){dirty=true;revision++;status.textContent='Ungespeichert';}
  function save(next){
    if(saving)return pending;
    if(!dirty&&!next)return Promise.resolve(true);
    const value=read(),version=revision;if(next)value.step=next;
    saving=true;
    pending=controller.saveDraft(value,{parents}).then(result=>{
      saving=false;if(dead)return result.ok;
      if(result.ok){parents=controller.getState().heads;if(version===revision){dirty=false;draft=clone(value);}}
      update(controller.getState());return result.ok;
    }).catch(e=>{saving=false;status.textContent=e.message;return false;});return pending;
  }
  function render(s){
    const newStage=['live','pause','finished'].includes(s.stage)||s.liveState.hasLiveData?'live':s.stage;
    if(stage===newStage)return;
    liveCleanup?.();liveCleanup=null;stage=newStage;body.replaceChildren();
    if(stage==='live'){steps.textContent='Spiel begleiten';liveCleanup=onLive(body,controller);read=()=>draft;return;}
    draft=clone(s.draft);parents=s.heads;dirty=false;
    if(stage==='conflict'){
      body.append(el('h3','Vorbereitung auf mehreren Geräten geändert'),el('p','Wähle bewusst eine Version. Die andere bleibt in der Historie erhalten.'));
      for(const choice of s.choices){const section=el('section');section.append(el('pre',JSON.stringify(choice.value,null,2)));button(section,'Diese Version übernehmen','resolve',()=>controller.resolve(choice.id));body.append(section);}return;
    }
    const names={game:'1 · Spiel prüfen',roster:'2 · Mannschaft',preparation:'3 · Vorbereitung (optional)',review:'4 · Bereit für das Spiel'};
    steps.textContent=names[stage];const form=el('form'),group=el('fieldset');form.append(group);body.append(form);
    form.addEventListener('submit',e=>e.preventDefault());group.disabled=s.readOnly;
    form.addEventListener('input',mark);form.addEventListener('change',mark);
    form.addEventListener('focusout',()=>queueMicrotask(()=>{if(!dead&&dirty&&!saving&&!form.contains(document.activeElement))save();}));
    const actions=el('div');actions.className='matchday-actions';group.append(actions);
    if(stage==='game'){
      const side=field(group,'Unsere Mannschaft spielt','ownSide','select');for(const [v,t]of [['','Bitte wählen'],['home','Heim'],['away','Gast']]){const o=el('option',t);o.value=v;side.append(o);}side.value=draft.ownSide||'';
      const kind=field(group,'Spielart','kind','select');for(const [v,t]of [['match','Spiel'],['training','Trainingsspiel']]){const o=el('option',t);o.value=v;kind.append(o);}kind.value=draft.kind;
      read=()=>({...draft,ownSide:side.value||null,kind:kind.value});
      button(actions,'Weiter zur Mannschaft','next',()=>{if(!side.value){status.textContent='Heim oder Gast auswählen.';return;}save('roster');});
    }else if(stage==='roster'){
      group.append(el('p','Kader wählen, Nummern prüfen und genau fünf Starter markieren.'));
      const all=new Map(players().filter(p=>!p.archived).map(p=>[p.id,p]));for(const p of draft.roster)all.set(p.id,{...players().find(x=>x.id===p.id),...p});
      const rows=[];for(const p of all.values()){
        const row=el('section');row.className='matchday-player';group.append(row);
        const active=field(row,p.name+(p.archived?' (archiviert – Auswahl prüfen)':''),'active','checkbox',p.id);active.dataset.roster=p.id;active.checked=draft.roster.length?draft.roster.some(x=>x.id===p.id):!p.archived;
        const jersey=field(row,'Trikotnummer','jersey','text',p.jerseyNumber);jersey.inputMode='numeric';jersey.maxLength=2;jersey.dataset.jersey=p.id;
        const starter=field(row,'Starting Five','starter','checkbox',p.id);starter.dataset.starter=p.id;starter.checked=draft.startingFive.includes(p.id);
        const toggle=()=>{jersey.disabled=!active.checked;starter.disabled=!active.checked;if(!active.checked)starter.checked=false;};active.addEventListener('change',toggle);toggle();rows.push({p,active,jersey,starter});
      }
      read=()=>({...draft,roster:rows.filter(r=>r.active.checked).map(r=>({id:r.p.id,name:r.p.name,jerseyNumber:r.jersey.value.trim()||null})),startingFive:rows.filter(r=>r.active.checked&&r.starter.checked).map(r=>r.p.id)});
      button(actions,'Zurück','back',()=>save('game'));
      button(actions,'Weiter zur Vorbereitung','next',()=>{try{buildSetup(read());save('preparation');}catch(e){status.textContent=e.message;}});
    }else if(stage==='preparation'){
      const periods=field(group,'Viertel / Abschnitte','periods','number',draft.config.periods);periods.min=1;periods.max=12;
      const minutes=field(group,'Minuten je Abschnitt','minutes','number',draft.config.periodMs/60000);minutes.min=1;minutes.max=60;
      const overtime=field(group,'Minuten je Verlängerung','overtime','number',draft.config.overtimeMs/60000);overtime.min=1;overtime.max=60;
      const fields={};for(const [key,label]of [['goals','Spielziele'],['warmup','Aufwärmen'],['coachingNote','Coaching-Notiz']]){fields[key]=field(group,label,key,'textarea',draft[key]);fields[key].maxLength=4000;}
      const options=new Map(tactics().map(t=>[t.id,{id:t.id,title:t.title||t.name||'Taktik'}]));for(const t of draft.tactics)if(!options.has(t.id))options.set(t.id,{...t,missing:true});
      const selected=[];for(const t of options.values()){const check=field(group,t.title+(t.missing?' – Nicht mehr verfügbar':''),'tactic','checkbox',t.id);check.checked=draft.tactics.some(x=>x.id===t.id);selected.push({check,t});}
      read=()=>({...draft,config:{periods:Number(periods.value),periodMs:Number(minutes.value)*60000,overtimeMs:Number(overtime.value)*60000},...Object.fromEntries(Object.entries(fields).map(([k,n])=>[k,n.value])),tactics:selected.filter(x=>x.check.checked).map(({t})=>({id:t.id,title:t.title}))});
      button(actions,'Zurück','back',()=>save('roster'));
      button(actions,'Vorbereitung überspringen','skip-preparation',()=>save('review'));
      button(actions,'Weiter zur Übersicht','next',()=>save('review'));
    }else{
      group.append(el('h3','Alles bereit?'),el('p',`${draft.kind==='training'?'Trainingsspiel':'Spiel'} · ${draft.ownSide==='home'?'Heim':'Gast'} · ${draft.config.periods} × ${draft.config.periodMs/60000} Minuten`));
      const list=el('ul');for(const p of draft.roster)list.append(el('li',`${p.jerseyNumber===null?'Ohne Nummer':'#'+p.jerseyNumber} ${p.name}${draft.startingFive.includes(p.id)?' – Starter':''}`));group.append(list,el('p',draft.goals||'Keine Spielziele eingetragen.'),el('p','Die Spieluhr startest du anschließend selbst.'));
      read=()=>clone(draft);button(actions,'Zurück','back',()=>save('preparation'));button(actions,'Zur Live-Ansicht','start',async()=>{if(await save())await controller.start();});
    }
    button(actions,'Entwurf speichern','save',()=>{dirty=true;save();});group.append(actions);
  }
  function update(s){if(dead)return;if(!saving&&(!dirty||stage==='live'))render(s);status.textContent=s.error|| (dirty?'Ungespeichert':s.localStatus==='pending'?'Lokal gesichert · Synchronisation ausstehend':s.localStatus==='synced'?'Vorbereitung synchronisiert':'Vorbereitung noch nicht gespeichert');for(const fs of body.querySelectorAll('form > fieldset'))fs.disabled=s.readOnly||saving;}
  const unsub=controller.subscribe(update);
  const unload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);
  function cleanup(){dead=true;unsub();liveCleanup?.();window.removeEventListener('beforeunload',unload);}
  cleanup.flush=async()=>{if(liveCleanup?.flush)return liveCleanup.flush();if(saving)await pending;return save();};
  return cleanup;
}
