import {canonical,clone} from '../live-game/core.mjs';
import {mountLiveView} from '../live-game/view.mjs';
import {renderLiveReport} from '../live-game/report.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const playerStatusLabels={starter:'Starting Five',bench:'Bank',dnp:'DNP – nicht eingesetzt'};
const tacticUsageLabels={offense:'Offense',defense:'Defense',inbound:'Einwurf',pressbreak:'Pressbreak'};
export function mountMatchdayLive(container,controller,{tactics=()=>[]}={}){
  let dirty=false,revision=0,parents=controller.getState().heads,base=clone(controller.getState().draft),saving=false,pending=Promise.resolve(true),dead=false,reportKey='',conflictKey='';
  const hint=el('p'),pause=el('section'),liveTools=el('details'),liveHost=el('section'),details=el('details'),report=el('section'),conflicts=el('section');
  pause.dataset.role='pause';report.dataset.role='report';liveTools.dataset.role='live-tools';liveTools.open=true;liveTools.append(el('summary','Details und Korrekturen'),liveHost);details.className='matchday-frozen-plan';details.append(el('summary','Gameplan & Abschluss'));
  const overview=el('div'),form=el('form'),status=el('p');status.setAttribute('role','status');details.append(overview,form,status);
  const closingLabel=el('label','Abschlussnotiz'),closingNote=el('textarea');closingNote.dataset.field='closingNote';closingNote.maxLength=4000;closingNote.value=base.closingNote;closingLabel.append(closingNote);form.append(closingLabel);
  const save=el('button','Abschlussnotiz speichern');save.type='submit';form.append(save);
  const discard=el('button','Ungespeicherte Eingaben verwerfen');discard.type='button';discard.dataset.action='discard-unsaved';discard.hidden=true;details.append(discard);
  discard.addEventListener('click',()=>{dirty=false;update(controller.getState());});
  container.append(hint,pause,report,liveTools,details,conflicts);
  // Base and parents belong to the displayed fields, including a focused field
  // whose remote update was deliberately held back.
  function mark(){dirty=true;revision++;status.textContent='Abschlussnotiz ungespeichert';}
  form.addEventListener('input',mark);
  function flush(){
    if(saving)return pending.then(()=>dirty?flush():true);if(!dirty)return Promise.resolve(true);
    const version=revision,value={...base,closingNote:closingNote.value};saving=true;save.disabled=true;
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
    if(!dirty&&!saving&&!form.contains(document.activeElement)){parents=s.heads;base=clone(s.draft);closingNote.value=base.closingNote;}
    discard.hidden=!(dirty&&(s.readOnly||s.conflict));discard.disabled=saving;
    closingNote.disabled=s.readOnly||s.conflict;save.disabled=s.readOnly||s.conflict||saving;
    status.textContent=s.error||(dirty?'Abschlussnotiz ungespeichert':s.localStatus==='synced'?'Gameplan synchronisiert':s.localStatus==='pending'?'Lokal gesichert · Synchronisation ausstehend':'Noch keine Abschlussnotiz gespeichert');
    overview.replaceChildren(el('p','Vor Spielbeginn festgelegt · während des Spiels nur lesbar.'));
    const lineup=el('div');lineup.className='matchday-lineup-board';for(const [key,label]of Object.entries(playerStatusLabels)){const section=el('section');section.dataset.status=key;section.append(el('h4',label));const list=el('ul');for(const player of s.draft.roster.filter(item=>(item.gameStatus||(s.draft.startingFive.includes(item.id)?'starter':'bench'))===key))list.append(el('li',`${player.jerseyNumber===null?'Ohne Nummer':'#'+player.jerseyNumber} ${player.name}${player.role?' · '+player.role:''}`));if(!list.children.length)list.append(el('li','Keine Spieler'));section.append(list);lineup.append(section);}overview.append(lineup);
    const notes=el('section');notes.className='matchday-plan-summary';notes.append(el('h4','Schwerpunkte'),el('p',s.draft.goals||'Keine Spielziele eingetragen.'),el('p',s.draft.warmup?'Aufwärmen: '+s.draft.warmup:'Kein Aufwärmplan eingetragen.'),el('p',s.draft.coachingNote?'Coaching: '+s.draft.coachingNote:'Keine Coaching-Notiz eingetragen.'));overview.append(notes);
    const planned=el('section');planned.className='matchday-plan-summary';planned.append(el('h4','Geplante Taktiken'));for(const [usage,label]of Object.entries(tacticUsageLabels)){const chosen=s.draft.tactics.filter(t=>(t.usage||'offense')===usage);if(chosen.length)planned.append(el('p',label+': '+chosen.map(t=>t.title+(tactics().some(x=>x.id===t.id)?'':' – Nicht mehr verfügbar')).join(', ')));}if(!s.draft.tactics.length)planned.append(el('p','Keine Taktik ausgewählt.'));overview.append(planned);
    const key=canonical([s.choices,s.readOnly,dirty]);if(key!==conflictKey){
      conflictKey=key;conflicts.replaceChildren();
      if(s.conflict){
        conflicts.append(el('h3','Abschlussnotiz-Konflikt'),el('p','Der bestätigte Gameplan bleibt unverändert. Wähle aus, welche Abschlussnotiz weitergeführt werden soll.'));
        for(const choice of s.choices){
          const card=el('article'),note=choice.value.closingNote||'Leere Abschlussnotiz',button=el('button','Diese Abschlussnotiz übernehmen');
          card.append(el('p',note),el('small',`Stand: ${new Date(choice.recordedAt).toLocaleString('de-DE')}`));button.type='button';button.dataset.action='resolve-closing-note';button.disabled=s.readOnly||dirty;
          button.addEventListener('click',async()=>{button.disabled=true;const result=await controller.resolveClosingNote(choice.id,{heads:s.heads});if(!result.ok)status.textContent=result.error;update(controller.getState());});
          card.append(button);conflicts.append(card);
        }
        if(dirty)conflicts.append(el('p','Die noch nicht gespeicherte Eingabe bleibt sichtbar. Verwirf sie ausdrücklich, bevor du eine synchronisierte Abschlussnotiz übernimmst.'));
      }
    }
    const finished=s.stage==='finished';liveTools.querySelector(':scope > summary').hidden=!finished;if(!finished)liveTools.open=true;
    if(finished){const next=canonical(s.liveState.boxscore);if(reportKey!==next){reportKey=next;liveTools.open=false;report.replaceChildren(renderLiveReport(s.liveState.boxscore));}}else{reportKey='';report.replaceChildren();}
  }
  const unmount=mountLiveView(liveHost,controller.live),unsub=controller.subscribe(update);
  const unload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);
  function cleanup(){dead=true;unsub();unmount();window.removeEventListener('beforeunload',unload);}
  cleanup.flush=flush;return cleanup;
}
