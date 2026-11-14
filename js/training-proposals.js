window.BT=window.BT||{};
BT.trainingProposals=(()=>{
  const esc=v=>BT.util.escapeHTML(String(v??''));
  const skills={dribbling:'Dribbling',drive:'Zug zum Korb',decision:'Entscheidungen',footwork:'Footwork',post:'Post-Moves',passing:'Passen',shooting:'Wurf',defense:'Verteidigung'};
  const detailLabels={goal:'Lernziel',setup:'Aufbau',steps:'Ablauf in Schritten',sets:'Sätze',reps:'Wiederholungen',pause:'Pausen und Übergänge',equipment:'Material',level:'Schwierigkeit',easier:'Vereinfachung',harder:'Steigerung'};
  function enhanceRow(row,e){
    const d=e.repetitions?.details||e.details||{};
    row.insertAdjacentHTML('afterbegin','<div class="proposal-row-options"><label><input type="checkbox" data-regenerate-choice> Für Neugenerierung auswählen</label><label><input type="checkbox" data-keep-exercise '+(e.repetitions?.locked||e.locked?'checked':'')+'> Beibehalten</label></div>');
    row.insertAdjacentHTML('beforeend','<details class="exercise-structured-fields"><summary>Ziel, Aufbau und Umfang einzeln bearbeiten</summary>'+Object.entries(detailLabels).map(([key,label])=>'<label>'+label+'<textarea maxlength="'+(key==='steps'?2000:1200)+'" data-exercise-detail="'+key+'">'+esc(d[key]||'')+'</textarea></label>').join('')+'</details>');
  }
  const rowData=row=>({locked:row.querySelector('[data-keep-exercise]')?.checked===true,details:Object.fromEntries([...row.querySelectorAll('[data-exercise-detail]')].map(el=>[el.dataset.exerciseDetail,el.value.trim()]))});
  function mount({form,list,profile,session,plan,serialize,add,refresh,active}){
    const api=(action,body={})=>BT.api.individualPlanProposal(action,{profileId:profile.id,...body});
    const actions=document.createElement('section');actions.className='training-proposals';
    const options='<option value="">Kein weiterer Schwerpunkt</option>'+Object.entries(skills).map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
    actions.innerHTML='<p class="proposal-duration" role="status" data-plan-duration></p><details data-planning-goals><summary>Trainingsziele und Rahmenbedingungen</summary><p>Diese Ziele gehören ausschließlich zu diesem Spieler. Eigene Änderungen gelten erst nach dem Speichern.</p><div class="proposal-fields">'+[1,2,3,4,5].map(n=>'<label>Priorität '+n+'<select data-priority>'+options+'</select></label>').join('')+'<label>Konkretes Ziel<textarea data-preference="goal" maxlength="1200"></textarea></label><label>Ausschlüsse<textarea data-preference="exclusions" maxlength="800"></textarea></label><label>Niveau<select data-preference="level"><option>Grundlagen</option><option>Aufbau</option><option>Fortgeschritten</option></select></label><label>Aktive Spieler<input data-preference="players" type="number" min="1" max="2"></label><label>Zusätzliche Helfer<input data-preference="helpers" type="number" min="0" max="2"></label><label>Körbe<input data-preference="baskets" type="number" min="0" max="2"></label><label>Material je Zeile<textarea data-preference="equipment"></textarea></label><label class="proposal-check"><input data-preference="threePointApproved" type="checkbox"> Dreier als Schwerpunkt freigegeben</label></div><div class="individual-actions"><button type="button" class="btn" data-goal-preset="guard">Vorlage Dribbling und Entscheidungen</button><button type="button" class="btn" data-goal-preset="post">Vorlage Footwork und Post</button><button type="button" class="btn primary" data-save-goals>Ziele speichern</button></div><p role="status" data-goal-status></p></details><details data-regeneration><summary>Gezielt neu generieren</summary><label>Umfang<select data-generation-scope><option value="exercise">Eine ausgewählte Übung</option><option value="block">Ausgewählte Übungen als Block</option><option value="session">Diese Einheit</option><option value="week">Geplante Einheiten dieser Woche</option></select></label><label>Was soll anders werden?<textarea data-generation-request maxlength="1000" placeholder="Zum Beispiel mehr Drive-oder-Pass-Entscheidungen unter Druck"></textarea></label><label class="proposal-check"><input type="checkbox" data-protect-edits checked> Eigene ungespeicherte Änderungen schützen</label><p>Beibehalten und bereits erfasste Ergebnisse werden immer geschützt. Eine Woche betrifft nur diesen Spieler. Testeinheiten bleiben geschützt.</p><button class="btn primary" type="button" data-generate-plan>KI-Vorschlag erstellen</button><p role="status" data-generation-status></p></details><section data-proposal-preview hidden></section><details data-proposal-history><summary>Gespeicherte Entwürfe und Veröffentlichungen</summary><div data-proposal-list></div><button class="btn" type="button" data-refresh-proposals>Aktualisieren</button></details>';
    form.querySelector('[data-review-exercises]').before(actions);
    const submit=form.querySelector('[type=submit]');submit.textContent='Entwurf speichern und prüfen';
    const status=form.querySelector('[data-review-status]');
    let busy=false,preferencesVersion=profile.planning_preferences_version||1,dirty=false,goalsDirty=false;
    const prefs=()=>{
      const result={priorities:[...actions.querySelectorAll('[data-priority]')].map(e=>e.value).filter(Boolean)};
      for(const el of actions.querySelectorAll('[data-preference]'))result[el.dataset.preference]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
      result.equipment=result.equipment.split('\n').map(x=>x.trim()).filter(Boolean);return result;
    };
    const setPrefs=p=>{
      [...actions.querySelectorAll('[data-priority]')].forEach((el,i)=>el.value=p.priorities?.[i]||'');
      const values={goal:'',exclusions:'',level:'Aufbau',players:1,helpers:1,baskets:1,equipment:['Basketball','Korb'],threePointApproved:false,...p};
      for(const el of actions.querySelectorAll('[data-preference]')){const value=values[el.dataset.preference];if(el.type==='checkbox')el.checked=value===true;else el.value=Array.isArray(value)?value.join('\n'):value;}
    };setPrefs(profile.planning_preferences||{});
    const counts=()=>{const values=[...list.querySelectorAll('[name=minutes]')].map(e=>Number(e.value));const total=values.reduce((n,v)=>n+v,0),limit=session.duration_minutes||105;actions.querySelector('[data-plan-duration]').textContent=`${list.children.length} Übungen · ${total} von ${limit} Minuten inklusive Pausen und Übergängen`+(total>limit?' · Zeitbudget überschritten':` · ${limit-total} Minuten frei`);};
    const observer=new MutationObserver(()=>{counts();if(active()){dirty=true;persist();}});observer.observe(list,{childList:true});counts();
    const draftKey='individual-edit:'+JSON.stringify([BT.exerciseCatalog?.scope(),profile.id,session.id]);
    const readDraft=()=>{try{return JSON.parse(sessionStorage.getItem(draftKey));}catch{return null;}};
    const clearDraft=()=>{try{sessionStorage.removeItem(draftKey);}catch{}};
    const persist=()=>{if(!dirty||!active())return;try{sessionStorage.setItem(draftKey,JSON.stringify({version:plan.version,edit:serialize(),preferences:prefs(),goalsDirty}));}catch{status.textContent='Lokale Sicherung ist nicht verfügbar. Bitte den Entwurf speichern.';}};
    const replaceEdit=next=>{list.replaceChildren();next.exercises.forEach(e=>add({id:e.id,title:e.title,duration_minutes:e.durationMinutes,repetitions:{instruction:e.repetitions,details:e.details,locked:e.locked},measurement_method:{instruction:e.measurementInstruction},coaching_cues:e.cues.split('\n'),observation:e.observation}));form.elements.title.value=next.title;form.elements.objective.value=next.objective;dirty=true;counts();};
    const recovered=readDraft();
    if(recovered){const recovery=document.createElement('p');recovery.setAttribute('role','status');recovery.textContent=recovered.version===plan.version?'Eine lokale ungespeicherte Bearbeitung liegt vor. ':'Der gespeicherte Plan ist neuer als die lokale Bearbeitung. Diese wird nicht automatisch übernommen. ';if(recovered.version===plan.version){const restore=document.createElement('button');restore.type='button';restore.className='btn';restore.textContent='Lokale Bearbeitung wiederherstellen';restore.onclick=()=>{replaceEdit(recovered.edit);setPrefs(recovered.preferences);goalsDirty=recovered.goalsDirty;recovery.remove();};recovery.append(restore);}const remove=document.createElement('button');remove.type='button';remove.className='btn';remove.textContent='Lokale Bearbeitung verwerfen';remove.onclick=()=>{clearDraft();recovery.remove();};recovery.append(remove);actions.prepend(recovery);}
    form.addEventListener('input',event=>{dirty=true;if(event.target.closest('[data-planning-goals]'))goalsDirty=true;counts();persist();});
    const lock=value=>{busy=value;submit.disabled=value;actions.querySelector('[data-generate-plan]').disabled=value;};
    const notifyError=(target,error)=>{if(active())target.textContent=error.message||'Die Anfrage ist fehlgeschlagen. Dein Plan bleibt erhalten.';};
    async function history(){try{const result=await api('list');if(!active())return;const labels={ready:'Entwurf bereit',generating:'KI läuft',published:'Veröffentlicht',failed:'Fehlgeschlagen',stale:'Stand veraltet',discarded:'Verworfen'};const host=actions.querySelector('[data-proposal-list]');host.replaceChildren();for(const p of result.proposals||[]){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=`${new Date(p.createdAt).toLocaleString('de-DE')} · ${labels[p.status]||p.status}`;b.onclick=()=>show(p);host.append(b);}if(!host.children.length)host.textContent='Noch keine gespeicherten Entwürfe.';}catch(error){notifyError(actions.querySelector('[data-proposal-list]'),error);}}
    function show(p){
      const host=actions.querySelector('[data-proposal-preview]');host.hidden=false;
      host.innerHTML='<h4>Vorschlag prüfen</h4><p>Der bisherige Spielerplan bleibt bis zur Veröffentlichung erhalten.</p>';
      for(const next of p.proposal?.plans||[]){
        const before=p.source.base.plans.find(b=>b.planId===next.planId);
        host.insertAdjacentHTML('beforeend','<h5>'+esc(new Date(next.scheduledFor).toLocaleString('de-DE'))+' · '+esc(next.title)+'</h5><p>'+esc(next.objective)+'</p>');
        next.exercises.forEach((e,i)=>{
          const old=e.id?before?.exercises.find(x=>x.id===e.id):before?.exercises[i];
          const comparable=value=>JSON.stringify(value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v).sort()):value);
          const unchanged=old&&['title','durationMinutes','repetitions','measurementInstruction','cues','details','locked'].every(k=>comparable(old[k])===comparable(e[k]));
          host.insertAdjacentHTML('beforeend','<details class="proposal-diff"><summary>'+esc(unchanged?'Bleibt':old?'Geändert':'Neu')+' · '+esc(e.title)+' · '+e.durationMinutes+' Min.</summary>'+(old&&!unchanged?'<p><b>Bisher:</b> '+esc(old.title)+'</p><p class="library-prose">'+esc(old.repetitions)+'</p>':'')+'<p><b>Vorschlag:</b></p><p class="library-prose">'+esc(e.repetitions)+'</p>'+Object.entries(e.details||{}).filter(([,v])=>v).map(([k,v])=>'<p><b>'+esc(detailLabels[k]||k)+':</b> '+esc(v)+'</p>').join('')+'<p>'+esc(e.cues)+'</p><p><b>Erfolgskriterium:</b> '+esc(e.measurementInstruction)+'</p></details>');
        });
        for(const old of before?.exercises||[])if(!next.exercises.some(e=>e.id===old.id))host.insertAdjacentHTML('beforeend','<p class="muted">Ersetzt oder entfernt: '+esc(old.title)+'</p>');
      }
      if(p.status==='ready')host.insertAdjacentHTML('beforeend','<button type="button" class="btn" data-adopt-proposal>Zur weiteren Bearbeitung übernehmen</button><button type="button" class="btn primary" data-publish-proposal>Geprüften Plan veröffentlichen</button>');
      if(!['published','discarded'].includes(p.status))host.insertAdjacentHTML('beforeend','<button type="button" class="btn" data-discard-proposal>Entwurf verwerfen</button>');
      host.insertAdjacentHTML('beforeend','<p role="status" data-proposal-status>'+esc(p.status==='stale'?'Der Ausgangsstand wurde geändert. Bitte mit dem aktuellen Plan neu erstellen.':p.status==='failed'?'Die KI konnte keinen gültigen Plan liefern. Der bisherige Plan ist unverändert.':p.status==='generating'?'Dieser Auftrag wird noch bearbeitet. Aktualisiere die Entwurfsliste.':'')+'</p>');
      const message=host.querySelector('[data-proposal-status]');
      host.querySelector('[data-adopt-proposal]')?.addEventListener('click',()=>{
        if(!active()||busy)return;
        if(p.proposal.plans.length!==1){message.textContent='Wochenentwürfe können gemeinsam veröffentlicht werden. Zum einzelnen Bearbeiten bitte die gewünschte Einheit separat neu planen.';return;}
        const next=p.proposal.plans[0];if(next.sessionId!==session.id||next.expectedVersion!==plan.version){message.textContent='Bitte zuerst die zugehörige aktuelle Einheit öffnen.';return;}
        replaceEdit(next);persist();host.hidden=true;
      });
      for(const [selector,action] of [['[data-publish-proposal]','publish'],['[data-discard-proposal]','discard']])host.querySelector(selector)?.addEventListener('click',async()=>{
        if(!active()||busy)return;lock(true);message.textContent=action==='publish'?'Wird veröffentlicht …':'Wird verworfen …';
        try{await api(action,{proposalId:p.id});if(!active())return;if(action==='publish'){dirty=false;clearDraft();await refresh();}else{host.hidden=true;await history();}}catch(error){notifyError(message,error);}finally{lock(false);}
      });
    }
    async function save(){
      if(!active()||busy)return;lock(true);status.textContent='Entwurf wird gespeichert …';
      try{const result=await api('save',{requestKey:crypto.randomUUID(),sessionId:session.id,expectedVersion:plan.version,edit:serialize()});if(active()){dirty=goalsDirty;if(!dirty)clearDraft();status.textContent='Entwurf gespeichert. Bitte Vorschau prüfen und ausdrücklich veröffentlichen.';show(result.proposal);await history();}}catch(error){notifyError(status,error);}finally{lock(false);}
    }
    actions.querySelector('[data-save-goals]').onclick=async()=>{if(!active()||busy)return;lock(true);const target=actions.querySelector('[data-goal-status]');try{const r=await api('preferences',{preferences:prefs(),expectedVersion:preferencesVersion});if(active()){preferencesVersion=r.planning_preferences_version;goalsDirty=false;persist();target.textContent='Ziele für diesen Spieler gespeichert.';}}catch(error){notifyError(target,error);}finally{lock(false);}};
    actions.querySelectorAll('[data-goal-preset]').forEach(b=>b.onclick=()=>{if(busy||!active())return;setPrefs({...prefs(),priorities:b.dataset.goalPreset==='guard'?['dribbling','drive','decision']:['footwork','post','drive'],goal:b.dataset.goalPreset==='guard'?'Ballkontrolle und Tempowechsel verbessern, zum Korb ziehen und Hilfe für Drive-oder-Pass-Entscheidungen lesen.':'Standfuß und Balance verbessern, Drop-Step und Jump-Hook trainieren, Abschlüsse weich dosieren.',threePointApproved:false});goalsDirty=true;dirty=true;persist();actions.querySelector('[data-goal-status]').textContent='Vorlage ausgewählt; zum Übernehmen Ziele speichern.';});
    actions.querySelector('[data-generate-plan]').onclick=async()=>{
      if(!active()||busy)return;if(goalsDirty){actions.querySelector('[data-generation-status]').textContent='Bitte zuerst die geänderten Trainingsziele speichern.';return;}if(navigator.onLine===false){actions.querySelector('[data-generation-status]').textContent='Für KI-Vorschläge ist eine Verbindung erforderlich.';return;}
      const scope=actions.querySelector('[data-generation-scope]').value,edit=serialize(),selectedKeys=[],lockedKeys=[];
      [...list.children].forEach((row,i)=>{if(row.querySelector('[data-regenerate-choice]')?.checked)selectedKeys.push(`${plan.id}:${i}`);if(row.querySelector('[data-keep-exercise]')?.checked)lockedKeys.push(`${plan.id}:${i}`);});
      lock(true);const target=actions.querySelector('[data-generation-status]');target.textContent='KI erstellt einen neuen Vorschlag …';
      try{const result=await api('generate',{requestKey:crypto.randomUUID(),sessionId:session.id,expectedVersion:plan.version,scope,selectedKeys,lockedKeys,protectEdits:actions.querySelector('[data-protect-edits]').checked,request:actions.querySelector('[data-generation-request]').value,...(edit.exercises.length?{edit}:{})});if(active()){target.textContent='Vorschlag gespeichert. Bisheriger Plan bleibt unverändert.';show(result.proposal);await history();}}catch(error){notifyError(target,error);}finally{lock(false);}
    };
    actions.querySelector('[data-refresh-proposals]').onclick=history;
    // Detached editors must not retain global listeners or observers.
    const leave=event=>{if(dirty&&active()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',leave);
    const detach=new MutationObserver(()=>{if(!form.isConnected){observer.disconnect();detach.disconnect();window.removeEventListener('beforeunload',leave);}});
    queueMicrotask(()=>{if(form.isConnected)detach.observe(document.body,{childList:true,subtree:true});else observer.disconnect();});
    queueMicrotask(history);
    return {save};
  }
  return {enhanceRow,rowData,mount};
})();
