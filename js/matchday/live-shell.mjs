import {canonical,clone} from '../live-game/core.mjs';
import {mountLiveView} from '../live-game/view.mjs';
import {renderLiveReport} from '../live-game/report.mjs';
import {gamePositionLabel} from '../basketball-positions.mjs';
import {activeGamePlan,buildOpponentFeedback,DEFENSES,OBSERVATIONS,projectOpponentLive} from './opponent-plan.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const playerStatusLabels={starter:'Starting Five',bench:'Bank',dnp:'DNP – nicht eingesetzt'};
const tacticUsageLabels={offense:'Offense',defense:'Defense',inbound:'Einwurf',pressbreak:'Pressbreak'};
const minutesLabel=milliseconds=>(milliseconds/60000).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
function renderOpponentAnalysis(live,title='Defense-Vergleich'){
  const section=el('section');section.className='matchday-opponent-analysis';section.append(el('h4',title));
  const grid=el('div');grid.className='matchday-defense-results';
  const used=Object.values(live.byDefense).filter(item=>item.minutesMs||item.points||Object.values(item.observations).some(Boolean));
  for(const item of used){const observations=Object.values(item.observations).reduce((sum,value)=>sum+value,0),card=el('article');card.dataset.defense=item.defense;card.append(el('strong',item.label),el('span',`${minutesLabel(item.minutesMs)} Min · ${item.points} Punkte · ${item.pointsPer10===null?'–':item.pointsPer10.toLocaleString('de-DE')} P/10`),el('small',`Treffer: 1er ${item.one} · 2er ${item.two} · 3er ${item.three} · Beobachtungen ${observations}`));grid.append(card);}
  section.append(grid);
  if(!used.length)section.append(el('p','Noch keine Spielzeit für den Defense-Vergleich erfasst.'));
  if(live.comparison)section.append(el('p',live.comparison.message));
  if(live.playerScoring.length){section.append(el('h5','Zugeordnete gegnerische Werfer'));const list=el('ul');for(const player of live.playerScoring)list.append(el('li',`${player.name}: ${player.points} Punkte · 1er ${player.one} · 2er ${player.two} · 3er ${player.three}`));section.append(list);}
  const note=el('small','P/10 basiert auf manuell erfassten Punkten und Spielzeit, nicht auf Ballbesitzen. Nicht zugeordnete Treffer bleiben in der Team- und Defense-Auswertung enthalten.');note.className='matchday-analysis-note';section.append(note);return section;
}
export function mountMatchdayLive(container,controller,{tactics=()=>[],game=null,onOpponentFeedback=()=>{}}={}){
  let dirty=false,revision=0,parents=controller.getState().heads,base=clone(controller.getState().draft),saving=false,pending=Promise.resolve(true),dead=false,reportKey='',conflictKey='';
  let scoutingKey='',feedbackKey='';
  const hint=el('p'),scouting=el('details'),pause=el('section'),liveTools=el('details'),liveHost=el('section'),details=el('details'),report=el('section'),conflicts=el('section');
  scouting.dataset.role='live-scouting';scouting.className='matchday-live-scouting';scouting.open=true;
  pause.dataset.role='pause';report.dataset.role='report';liveTools.dataset.role='live-tools';liveTools.open=true;liveTools.append(el('summary','Details und Korrekturen'),liveHost);details.className='matchday-frozen-plan';details.append(el('summary','Gameplan & Abschluss'));
  const overview=el('div'),form=el('form'),status=el('p');status.setAttribute('role','status');details.append(overview,form,status);
  const closingLabel=el('label','Abschlussnotiz'),closingNote=el('textarea');closingNote.dataset.field='closingNote';closingNote.maxLength=4000;closingNote.value=base.closingNote;closingLabel.append(closingNote);form.append(closingLabel);
  const save=el('button','Abschlussnotiz speichern');save.type='submit';form.append(save);
  const discard=el('button','Ungespeicherte Eingaben verwerfen');discard.type='button';discard.dataset.action='discard-unsaved';discard.hidden=true;details.append(discard);
  discard.addEventListener('click',()=>{dirty=false;update(controller.getState());});
  container.append(hint,scouting,pause,report,liveTools,details,conflicts);
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
  function renderScouting(s){
    const plan=s.draft.opponentPlan,session=s.liveState.session;
    if(!plan||!session){scouting.hidden=true;scouting.replaceChildren();return null;}
    scouting.hidden=false;const live=projectOpponentLive(session,plan),key=canonical([session.events,plan,s.readOnly,s.busy]);
    if(key===scoutingKey)return live;scoutingKey=key;scouting.replaceChildren();
    scouting.append(el('summary',`Gegnerplan · ${live.currentDefenseLabel}`));
    const body=el('div');body.className='matchday-live-scouting-body';
    const head=el('header');head.append(el('div',plan.opponent),el('strong',`Aktuell: ${live.currentDefenseLabel}`));body.append(head);
    const active=activeGamePlan(plan);if(active?.lockerRoom?.length){const list=el('ul');for(const item of active.lockerRoom)list.append(el('li',item));body.append(list);}
    const switches=el('div');switches.className='matchday-defense-buttons';
    for(const [id,label]of Object.entries(DEFENSES)){const action=el('button',label);action.type='button';action.dataset.defense=id;action.setAttribute('aria-pressed',String(id===live.currentDefense));action.disabled=s.readOnly||s.busy;action.addEventListener('click',()=>controller.live.dispatch({kind:'defense-change',payload:{defense:id}}));switches.append(action);}body.append(el('h4','Defense bestätigen oder wechseln'),switches);
    const observations=el('div');observations.className='matchday-observation-buttons';
    for(const [id,label]of Object.entries(OBSERVATIONS)){const action=el('button',`${label} +1`);action.type='button';action.dataset.observation=id;action.disabled=s.readOnly||s.busy;action.addEventListener('click',()=>controller.live.dispatch({kind:'opponent-observation',payload:{type:id}}));observations.append(action);}body.append(el('h4','Schnelle Beobachtung'),observations);
    const count=el('p',`Seit letztem Wechsel: Paint ${live.counts.paint} · offene 3er ${live.counts['open-three']} · OREB ${live.counts.oreb} · FW-Druck ${live.counts['free-throw-pressure']}`);count.className='matchday-scout-count';body.append(count);
    if(live.comparison){const comparison=el('p',`Live-Vergleich: ${live.comparison.message}`);comparison.className='matchday-scout-comparison';body.append(comparison);}
    if(live.suggestions.length){const alerts=el('div');alerts.className='matchday-scout-alerts';for(const item of live.suggestions)alerts.append(el('p',item.message));body.append(alerts);}
    else{const clear=el('p','Noch kein Wechsel-Auslöser erreicht.');clear.className='matchday-scout-clear';body.append(clear);}
    scouting.append(body);return live;
  }
  function update(s){
    if(dead)return;
    hint.textContent=s.liveState.clock?.running?'Die Uhr läuft beim Verlassen weiter.':'Die Spieluhr startest und stoppst du selbst.';
    pause.hidden=s.stage!=='pause';
    const opponentLive=renderScouting(s);
    if(!pause.hidden){const half=s.liveState.session.config.periods%2===0&&s.liveState.clock.period===s.liveState.session.config.periods/2;
      const box=s.liveState.boxscore;pause.replaceChildren(el('h3',half?'Halbzeit':'Abschnittspause'),el('p',`Erfasster Stand: ${box.teamPoints} : ${box.opponentPoints??'–'}`),el('p','Aufstellung und Spielziele prüfen. Nächsten Abschnitt unten bewusst vorbereiten und starten.'),el('p',s.draft.goals));
      const list=el('ul');for(const id of s.liveState.lineups.onCourt){const p=box.players.find(p=>p.id===id);if(p)list.append(el('li',`${p.name} · ${p.fouls} Fouls`));}pause.append(list);
      if(opponentLive){const scout=el('section');scout.className='matchday-halftime-scout';scout.append(el('h4','Gegnerabgleich'),el('p',`Aktuelle Defense: ${opponentLive.currentDefenseLabel}`),el('p',`Beobachtet: Paint ${opponentLive.totalCounts.paint} · offene 3er ${opponentLive.totalCounts['open-three']} · OREB ${opponentLive.totalCounts.oreb} · FW-Druck ${opponentLive.totalCounts['free-throw-pressure']}`),renderOpponentAnalysis(opponentLive,'Defense bis hierhin'));const checks=activeGamePlan(s.draft.opponentPlan)?.halftimeChecks||[];if(checks.length){const checkList=el('ul');for(const item of checks)checkList.append(el('li',item));scout.append(checkList);}for(const item of opponentLive.suggestions)scout.append(el('p',item.message));pause.append(scout);}
    }
    if(!dirty&&!saving&&!form.contains(document.activeElement)){parents=s.heads;base=clone(s.draft);closingNote.value=base.closingNote;}
    discard.hidden=!(dirty&&(s.readOnly||s.conflict));discard.disabled=saving;
    closingNote.disabled=s.readOnly||s.conflict;save.disabled=s.readOnly||s.conflict||saving;
    status.textContent=s.error||(dirty?'Abschlussnotiz ungespeichert':s.localStatus==='synced'?'Gameplan synchronisiert':s.localStatus==='pending'?'Lokal gesichert · Synchronisation ausstehend':'Noch keine Abschlussnotiz gespeichert');
    overview.replaceChildren(el('p','Vor Spielbeginn festgelegt · während des Spiels nur lesbar.'));
    const lineup=el('div');lineup.className='matchday-lineup-board';for(const [key,label]of Object.entries(playerStatusLabels)){const section=el('section');section.dataset.status=key;section.append(el('h4',label));const list=el('ul');for(const player of s.draft.roster.filter(item=>(item.gameStatus||(s.draft.startingFive.includes(item.id)?'starter':'bench'))===key))list.append(el('li',`${player.jerseyNumber===null?'Ohne Nummer':'#'+player.jerseyNumber} ${player.name} · ${gamePositionLabel(player.gamePosition)}${player.role?' · '+player.role:''}`));if(!list.children.length)list.append(el('li','Keine Spieler'));section.append(list);lineup.append(section);}overview.append(lineup);
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
    if(finished){const next=canonical([s.liveState.boxscore,opponentLive]);if(reportKey!==next){reportKey=next;liveTools.open=false;report.replaceChildren(renderLiveReport(s.liveState.boxscore));if(opponentLive)report.append(renderOpponentAnalysis(opponentLive,'Gegner & Defense'));}
      const feedback=buildOpponentFeedback({game,plan:s.draft.opponentPlan,session:s.liveState.session});const nextFeedback=feedback?canonical(feedback):'';
      if(feedback&&feedbackKey!==nextFeedback){feedbackKey=nextFeedback;try{onOpponentFeedback(feedback);}catch(error){status.textContent='Spiel gespeichert; Gegnerbeobachtungen konnten nicht übernommen werden: '+error.message;}}
    }else{reportKey='';feedbackKey='';report.replaceChildren();}
  }
  const unmount=mountLiveView(liveHost,controller.live),unsub=controller.subscribe(update);
  const unload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);
  function cleanup(){dead=true;unsub();unmount();window.removeEventListener('beforeunload',unload);}
  cleanup.flush=flush;return cleanup;
}
