import {canonical,clone} from '../live-game/core.mjs';
import {mountLiveView} from '../live-game/view.mjs';
import {renderLiveReport} from '../live-game/report.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function mountMatchdayLive(container,controller,{tactics=()=>[]}={}){
  let dirty=false,revision=0,parents=controller.getState().heads,base=clone(controller.getState().draft),saving=false,pending=Promise.resolve(true),dead=false,reportKey='',conflictKey='';
  const hint=el('p'),pause=el('section'),liveHost=el('section'),details=el('details'),report=el('section'),conflicts=el('section');
  pause.dataset.role='pause';report.dataset.role='report';details.append(el('summary','Vorbereitung & Spieltagsnotizen'));
  const overview=el('div'),form=el('form'),status=el('p');status.setAttribute('role','status');details.append(overview,form,status);
  const fields={};for(const [key,label]of [['goals','Spielziele'],['warmup','Aufwärmen'],['coachingNote','Coaching-Notiz'],['closingNote','Abschlussnotiz']]){const l=el('label',label),n=el('textarea');n.dataset.field=key;n.maxLength=4000;n.value=base[key];l.append(n);form.append(l);fields[key]=n;}
  const save=el('button','Notizen speichern');save.type='submit';form.append(save);
  const discard=el('button','Ungespeicherte Eingaben verwerfen');discard.type='button';discard.dataset.action='discard-unsaved';discard.hidden=true;details.append(discard);
  discard.addEventListener('click',()=>{dirty=false;update(controller.getState());});
  container.append(hint,pause,liveHost,details,conflicts,report);
  // Base and parents belong to the displayed fields, including a focused field
  // whose remote update was deliberately held back.
  function mark(){dirty=true;revision++;status.textContent='Notizen ungespeichert';}
  form.addEventListener('input',mark);
  function flush(){
    if(saving)return pending.then(()=>dirty?flush():true);if(!dirty)return Promise.resolve(true);
    const version=revision;const value={...base,...Object.fromEntries(Object.entries(fields).map(([k,n])=>[k,n.value]))};saving=true;save.disabled=true;
    pending=controller.saveDraft(value,{parents}).then(r=>{saving=false;if(dead)return r.ok;if(r.ok){parents=controller.getState().heads;base=clone(value);if(version===revision)dirty=false;}update(controller.getState());return r.ok;}).catch(e=>{saving=false;status.textContent=e.message;return false;});return pending;
  }
  form.addEventListener('submit',e=>{e.preventDefault();flush();});
  form.addEventListener('focusout',()=>queueMicrotask(()=>{if(!dead&&dirty&&!form.contains(document.activeElement))flush();}));
  function update(s){
    if(dead)return;
    hint.textContent=s.liveState.clock?.running?'Die Uhr läuft beim Verlassen weiter.':'Die Spieluhr startest und stoppst du selbst.';
    pause.hidden=s.stage!=='pause';
    if(!pause.hidden){const half=s.liveState.session.config.periods%2===0&&s.liveState.clock.period===s.liveState.session.config.periods/2;
      const box=s.liveState.boxscore;pause.replaceChildren(el('h3',half?'Halbzeit':'Abschnittspause'),el('p',`Erfasster Stand: ${box.teamPoints} : ${box.opponentPoints??'–'}`),el('p','Aufstellung und Spielziele prüfen. Nächsten Abschnitt unten bewusst vorbereiten und starten.'),el('p',s.draft.goals));
      const list=el('ul');for(const id of s.liveState.lineups.onCourt){const p=box.players.find(p=>p.id===id);if(p)list.append(el('li',`${p.name} · ${p.fouls} Fouls`));}pause.append(list);
    }
    if(!dirty&&!saving&&!form.contains(document.activeElement)){parents=s.heads;base=clone(s.draft);for(const [k,n]of Object.entries(fields))n.value=base[k];}
    discard.hidden=!(dirty&&s.readOnly);discard.disabled=saving;
    for(const n of Object.values(fields))n.disabled=s.readOnly||s.conflict;save.disabled=s.readOnly||s.conflict||saving;
    status.textContent=s.error||(dirty?'Notizen ungespeichert':s.localStatus==='synced'?'Vorbereitung synchronisiert':s.localStatus==='pending'?'Lokal gesichert · Synchronisation ausstehend':'Noch keine Notizen gespeichert');
    overview.replaceChildren();for(const t of s.draft.tactics)overview.append(el('p',t.title+(tactics().some(x=>x.id===t.id)?'':' – Nicht mehr verfügbar')));
    const key=canonical([s.choices,s.readOnly,dirty]);if(key!==conflictKey){conflictKey=key;conflicts.replaceChildren();if(s.conflict){conflicts.append(el('h3','Vorbereitungskonflikt – Live-Erfassung bleibt verfügbar'));for(const choice of s.choices){const p=el('pre',JSON.stringify(choice.value,null,2)),b=el('button',dirty?'Ungespeicherte Notizen verwerfen und diese Vorbereitung übernehmen':'Diese Vorbereitung übernehmen');b.disabled=s.readOnly;b.addEventListener('click',async()=>{const result=await controller.resolve(choice.id,{heads:s.heads});if(result.ok){dirty=false;form.querySelector(':focus')?.blur();update(controller.getState());}});conflicts.append(p,b);}}}
    if(s.stage==='finished'){const next=canonical(s.liveState.boxscore);if(reportKey!==next){reportKey=next;report.replaceChildren(renderLiveReport(s.liveState.boxscore));}}else{reportKey='';report.replaceChildren();}
  }
  const unmount=mountLiveView(liveHost,controller.live),unsub=controller.subscribe(update);
  const unload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);
  function cleanup(){dead=true;unsub();unmount();window.removeEventListener('beforeunload',unload);}
  cleanup.flush=flush;return cleanup;
}
