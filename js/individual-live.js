window.BT = window.BT || {};

BT.individualLive = (function () {
  let dispose = () => {};
  const drafts = new Map();
  const absent = status => ['declined', 'unexcused_no_show'].includes(status);
  const label = seconds => {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  };
  function cleanup() { dispose(); dispose = () => {}; }
  function clearLocalData() { cleanup(); for (const draft of drafts.values()) draft.valid=false; drafts.clear(); }

  function render({ target, profile, data, session, fallbackExercises, helpers: h }) {
    cleanup();
    const rows = (data.sessions || []).filter(row => row.id === session.id);
    const profiles = (data.profiles || []).filter(p => rows.some(row => row.individual_profile_id === p.id)).sort((a,b) => a.id.localeCompare(b.id));
    if (!profiles.length || profiles.length > 2) throw new Error('Eine Einheit benötigt einen oder zwei zugeordnete Spieler.');
    const esc = BT.util.escapeHTML;
    const tracks = profiles.map(p => {
      const participant = rows.find(row => row.individual_profile_id === p.id);
      const stored = (data.exercises || []).filter(e => e.session_id === session.id && e.individual_profile_id === p.id);
      const template = (data.pilotRoadmap || []).find(unit => Number(unit.unitNumber) === Number(session.unit_number))?.template;
      const fallback = p.id === profile.id ? fallbackExercises : (template?.exercises || []).map((e,index) => ({
        position:index + 1, title:e.title, duration_minutes:e.durationMinutes, repetitions:e.repetitions,
        measurement_method:e.measurementMethod, coaching_cues:e.coachingCues
      }));
      const exercises = (stored.length ? stored : fallback || []).map((e,index) => ({...e,
        id:e.id || `template-${index+1}`, database_id:e.id || null, position:Number(e.position) || index+1
      })).sort((a,b) => a.position-b.position);
      return { profile:p, participant, exercises };
    });
    if (!tracks.some(t => t.exercises.length)) throw new Error('Für diese Einheit fehlt noch ein Trainingsplan.');
    const blocks = [...new Set(tracks.flatMap(t => t.exercises.map(e => e.position)))].sort((a,b) => a-b).map(position => ({
      id:`block-${position}`, position, entries:tracks.map(t => ({track:t,exercise:t.exercises.find(e => e.position===position)}))
    }));
    const key = h.key, owner = h.contextKey();
    let draft=drafts.get(key), state=draft?.state;
    if (!state) try { state = JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* Invalid cache starts a fresh draft. */ }
    const old = state;
    if (state?.version !== 2 || state.sessionId !== session.id) {
      state = {version:2,sessionId:session.id,index:0,startedAt:null,runningSince:null,elapsed:{},adjustments:{},completed:{},skipped:{},players:{}};
      if (old?.sessionId === session.id) {
        state.index = old.index || 0; state.startedAt = old.startedAt; state.runningSince = old.runningSince;
        const t = tracks.find(t => t.profile.id === profile.id);
        state.players[profile.id] = {notes:old.notes || {},ratings:old.ratings || {},inputs:{}};
        for (const e of t.exercises) {
          state.elapsed[`block-${e.position}`] = Number(old.elapsed?.[e.id] || 0);
          state.adjustments[`block-${e.position}`] = Number(old.adjustments?.[e.id] || 0);
        }
      }
    }
    state.index = Math.max(0,Math.min(blocks.length-1,Number(state.index)||0));
    for (const t of tracks) state.players[t.profile.id] ||= {notes:{},ratings:{},inputs:{}};
    if (!draft) {draft={state,saving:new Set(),valid:true};drafts.set(key,draft);}
    let timer = null, disposed = false, busy = false;
    const valid = () => !disposed && h.contextKey() === owner && target.querySelector('.individual-live-shell');
    const persist = () => { if (draft.valid && h.contextKey() === owner) localStorage.setItem(key,JSON.stringify(state)); };
    const current = () => blocks[state.index];
    const running = () => state.runningSince ? Math.max(0,Math.floor((Date.now()-state.runningSince)/1000)) : 0;
    const total = () => Object.values(state.elapsed).reduce((sum,n)=>sum+Number(n||0),0)+running();
    const currentSeconds = () => Number(state.elapsed[current().id] || 0)+running();
    const stopTimer = () => { if (timer !== null) clearInterval(timer); timer = null; };
    const pause = () => { if (state.runningSince) {state.elapsed[current().id]=currentSeconds();state.runningSince=null;}stopTimer(); };
    const status = (message,error=false) => h.notice(target,message,error);
    const tick = () => {
      if (!valid()) { stopTimer(); return; }
      target.querySelector('[data-live-block-clock]').textContent=label(currentSeconds());
      target.querySelector('[data-live-total-clock]').textContent=label(total());
    };
    const saved = event => {if(event.detail?.key===key && valid()){draw();status(event.detail.message,event.detail.error);}};
    window.addEventListener('bt-individual-live-saved',saved);
    dispose = () => { pause(); persist(); disposed = true; window.removeEventListener('bt-individual-live-saved',saved); document.body.classList.remove('individual-live-mode'); };
    document.body.classList.add('individual-live-mode');
    function blockTitle(block) {
      const titles = [...new Set(block.entries.filter(e=>e.exercise && !absent(e.track.participant.attendance_status)).map(e=>h.trainingTitle(e.exercise.title)))];
      return titles.length===1 ? titles[0] : 'Individuelle Aufgaben';
    }
    function playerPanel({track:t,exercise:e}) {
      const name=esc(h.playerName(t.profile));
      if (absent(t.participant.attendance_status)) return `<section class="individual-live-player is-absent" data-live-player="${esc(t.profile.id)}"><h2>${name}</h2><p>${esc(h.attendanceLabel(t.participant.attendance_status))} · Keine Trainingswerte für diesen Spieler.</p></section>`;
      if (!e) return `<section class="individual-live-player" data-live-player="${esc(t.profile.id)}"><h2>${name}</h2><p>Für diesen Block ist keine eigene Aufgabe geplant.</p></section>`;
      const ps=state.players[t.profile.id], definitions=h.measurementDefinitions(e), input=ps.inputs[e.id] || {};
      ps.results ||= {};
      const recorded = [...(data.measurements || []).filter(m=>m.individual_profile_id===t.profile.id && m.session_id===session.id && m.exercise_id===e.database_id),...(ps.results[e.id] || [])];
      const uniqueResults = [...new Map(recorded.map(m=>[m.id,m])).values()];
      const results = uniqueResults.filter(m=>m.metric_key!=='trainernotiz').map(m=>{const metric=definitions.find(d=>d.key===m.metric_key);return `<li><strong>${esc(metric?.label || BT.individualCopy.metric(m.metric_key))}</strong>: ${esc(m.numeric_value ?? m.text_value)} ${esc(m.unit || '')}${m.attempt ? ` · Durchgang ${esc(m.attempt)}` : ''}<small> · gespeichert${m._queued ? ' auf diesem Gerät' : ''}</small></li>`;}).join('');
      const definition=definitions.find(d=>d.key===input.metric) || definitions[0];
      const plan=(data.plans || []).find(p=>p.session_id===session.id && p.individual_profile_id===t.profile.id);
      return `<section class="individual-live-player" data-live-player="${esc(t.profile.id)}">
        <header><h2>${name}</h2><span>${esc(h.attendanceLabel(t.participant.attendance_status))}</span></header>
        <h3>${esc(h.trainingTitle(e.title))}</h3>${plan?.objective ? `<p class="individual-live-goal">${esc(plan.objective)}</p>` : ''}
        <div class="individual-live-instructions"><div><small>Wiederholungen</small><p>${esc(BT.individualCopy.details(e.repetitions || {}))}</p></div><div><small>Messmethode</small><p>${esc(BT.individualCopy.details(e.measurement_method || {}))}</p></div></div>
        <section class="individual-live-cues"><span class="section-kicker">Trainerhinweise</span><ul>${(e.coaching_cues || []).map(cue=>`<li>${esc(BT.individualCopy.cue(cue))}</li>`).join('') || '<li>Technik sauber und kontrolliert ausführen.</li>'}</ul></section>
        <div class="individual-live-rating" role="group" aria-label="Schnellbewertung für ${name}">${['Funktioniert','Wiederholen','Problem'].map(value=>`<button type="button" data-live-rating="${value}" aria-pressed="${ps.ratings[e.id]===value}" class="${ps.ratings[e.id]===value?'active':''}">${value}</button>`).join('')}</div>
        ${results ? `<section class="individual-live-results"><strong>Gespeicherte Ergebnisse</strong><ul>${results}</ul></section>` : ''}
        <label class="individual-live-note">Private Trainernotiz für ${name}<textarea data-live-note maxlength="500">${esc(ps.notes[e.id] || '')}</textarea></label>
        <button class="btn" type="button" data-live-quick-note>Schnellnotiz mit Zeit</button>
        ${definition ? `<form class="individual-live-measurement" data-live-measurement><strong>Ergebnis für ${name} erfassen</strong><select name="metric" aria-label="Beobachtung für ${name}">${definitions.map(d=>`<option value="${esc(d.key)}" ${d.key===definition.key?'selected':''}>${esc(d.label)}${d.unit?` (${esc(d.unit)})`:''}</option>`).join('')}</select><label class="individual-live-value"><span>Ergebnis</span>${h.measurementInput(definition)}</label>${definition.attempts?`<label>Durchgang<select name="attempt">${Array.from({length:definition.attempts},(_,i)=>`<option value="${i+1}" ${Number(input.attempt)===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label>`:''}<button class="btn" type="submit">Speichern</button></form>` : ''}
      </section>`;
    }
    function draw() {
      if (disposed || h.contextKey()!==owner) return;
      stopTimer();
      const block=current(), next=blocks[state.index+1];
      const minutes=Math.max(1,...block.entries.filter(x=>x.exercise && !absent(x.track.participant.attendance_status)).map(x=>Number(x.exercise.duration_minutes)||1))+Number(state.adjustments[block.id]||0)/60;
      target.innerHTML=`<section class="individual-live-shell" aria-label="Gemeinsames Individualtraining">
        <header class="individual-live-header"><button class="individual-live-back" type="button" data-live-exit>← Trainerübersicht</button><div><span>Einheit ${session.unit_number || '–'} · ${esc(tracks.map(t=>h.playerName(t.profile)).join(' + '))}</span><strong>${h.fmt(session.scheduled_for)}</strong></div><div class="individual-live-total"><small>Gemeinsame Trainingszeit</small><strong data-live-total-clock>${label(total())}</strong></div></header>
        <div class="individual-live-progress" aria-label="Trainingsfortschritt"><span style="width:${Math.round((state.index+1)/blocks.length*100)}%"></span></div>
        <main class="individual-live-main"><section class="individual-live-current"><div class="individual-live-kicker"><span>Gemeinsamer Block · ${state.index+1} von ${blocks.length}</span><span>${Math.round(minutes)} Min. geplant</span></div><h1>${esc(blockTitle(block))}</h1><div class="individual-live-clock" data-live-block-clock>${label(currentSeconds())}</div>
          <div class="individual-live-timer-actions"><button class="btn primary" data-live-toggle>${state.runningSince?'Pause':state.startedAt?'Fortsetzen':'Training starten'}</button><button class="btn" data-live-adjust="-60">−1 Min.</button><button class="btn" data-live-adjust="60">+1 Min.</button><button class="btn" data-live-adjust="300">+5 Min.</button><button class="btn" data-live-tactics>Taktik öffnen</button></div>
          <p class="auth-status" data-role="individual-status" aria-live="polite"></p><div class="individual-live-players">${block.entries.map(playerPanel).join('')}</div></section>
          <aside class="individual-live-side"><section class="individual-live-next"><small>Als Nächstes</small><strong>${next?esc(blockTitle(next)):'Abschluss'}</strong></section>
            ${tracks.map(t=>`<section class="individual-live-attendance" data-attendance-profile="${esc(t.profile.id)}"><small>Teilnahme</small><strong>${esc(h.playerName(t.profile))}</strong><span>${esc(h.attendanceLabel(t.participant.attendance_status))}</span><div><button class="btn" data-live-attendance="attended">Anwesend</button><button class="btn" data-live-attendance="unexcused_no_show">Unentschuldigt gefehlt</button></div></section>`).join('')}
            <section class="individual-live-outline"><small>Ablauf</small>${blocks.map((b,i)=>`<button data-live-jump="${i}" class="${i===state.index?'active':''} ${state.skipped[b.id]?'skipped':''} ${state.completed[b.id]?'done':''}"><span>${i+1}</span><b>${esc(blockTitle(b))}</b><em>${Math.max(...b.entries.filter(x=>x.exercise).map(x=>Number(x.exercise.duration_minutes)||1))} Min.</em></button>`).join('')}</section></aside></main>
        <footer class="individual-live-footer"><button class="btn" data-live-prev ${state.index===0?'disabled':''}>← Vorherige Übung</button><button class="btn" data-live-skip>Überspringen</button><button class="btn primary" data-live-next>${next?'Übung beenden · Nächste Übung':'Übung beenden'}</button><button class="btn danger" data-live-finish>Training beenden &amp; speichern</button></footer>
        <div class="individual-tactics-sheet" data-live-tactics-sheet hidden><div><button data-live-tactics-close>×</button><h2>Taktik</h2><p>Die gemeinsame Einheit bleibt gespeichert.</p><a class="btn primary" href="#/tactics">Taktikboard öffnen</a></div></div>
      </section>`;
      for (const {track:t,exercise:e} of block.entries) {
        if (!e || absent(t.participant.attendance_status)) continue;
        const ps=state.players[t.profile.id], panel=[...target.querySelectorAll('[data-live-player]')].find(node=>node.dataset.livePlayer===t.profile.id);
        panel.querySelector('[data-live-note]').oninput=event=>{ps.notes[e.id]=event.target.value;persist();};
        panel.querySelectorAll('[data-live-rating]').forEach(button=>button.onclick=()=>{ps.ratings[e.id]=button.dataset.liveRating;persist();draw();});
        panel.querySelector('[data-live-quick-note]').onclick=()=>{ps.notes[e.id]=`${ps.notes[e.id] || ''}${ps.notes[e.id]?'\n':''}[${label(total())}] `;persist();draw();};
        const form=panel.querySelector('[data-live-measurement]');
        if (!form) continue;
        const inputKey=`${t.profile.id}:${e.id}`;
        if(draft.saving.has(inputKey))form.querySelectorAll('button,input,textarea,select').forEach(node=>node.disabled=true);
        const input=ps.inputs[e.id] || {};
        if (input.value!==undefined) form.elements.value.value=input.value;
        const capture=()=>{ps.inputs[e.id]={metric:form.elements.metric.value,value:form.elements.value.value,attempt:form.elements.attempt?.value};persist();};
        form.addEventListener('input',capture);
        form.elements.metric.onchange=()=>{ps.inputs[e.id]={metric:form.elements.metric.value,value:''};persist();draw();};
        form.onsubmit=async event=>{
          event.preventDefault();if(busy || draft.saving.has(inputKey) || !form.checkValidity())return;
          capture();const definition=h.measurementDefinitions(e).find(d=>d.key===form.elements.metric.value);
          const numeric=definition.type==='number', value=form.elements.value.value;
          if (!value.trim() || (numeric && !Number.isFinite(Number(value)))) return;
          draft.saving.add(inputKey);form.querySelectorAll('button,input,textarea,select').forEach(node=>node.disabled=true);
          let saveError = null;
          try {
            const savedResult = await (BT.individualTraining?.coachAction || BT.api.individualAction)('saveMeasurement',{profileId:t.profile.id,sessionId:session.id,exerciseId:e.database_id,metricKey:definition.key,numericValue:numeric?Number(value):null,textValue:numeric?null:value,unit:definition.unit||null,attempt:form.elements.attempt?Number(form.elements.attempt.value):null});
            if(!draft.valid || h.contextKey()!==owner)return;
            (ps.results[e.id] ||= []).push(savedResult?.measurement || {id:savedResult?.mutationId || `local-${Date.now()}-${Math.random()}`,metric_key:definition.key,numeric_value:numeric?Number(value):null,text_value:numeric?null:value,unit:definition.unit||null,attempt:form.elements.attempt?Number(form.elements.attempt.value):null,_queued:savedResult?._queued});
            ps.inputs[e.id]={metric:definition.key,value:'',attempt:form.elements.attempt?.value};persist();
          } catch(error) {saveError=error;}
          finally {
            draft.saving.delete(inputKey);
            if(draft.valid && h.contextKey()===owner){window.dispatchEvent(new CustomEvent('bt-individual-live-saved',{detail:{key,message:saveError?saveError.message:`Ergebnis für ${h.playerName(t.profile)} gespeichert; bei fehlender Verbindung zunächst auf diesem Gerät.`,error:!!saveError}}));}
          }
        };
      }
      target.querySelector('[data-live-toggle]').onclick=async()=>{
        if(busy)return;
        if(state.runningSince){pause();persist();draw();return;}
        busy=true;target.querySelector('[data-live-toggle]').disabled=true;
        try {
          if(!state.startedAt)await (BT.individualTraining?.coachAction || BT.api.individualAction)('startSession',{profileId:profile.id,sessionId:session.id});
          if(!valid())return;
          state.startedAt ||= new Date().toISOString();state.runningSince=Date.now();persist();draw();
        }catch(error){if(valid()){status(error.message,true);target.querySelector('[data-live-toggle]').disabled=false;}}
        finally{busy=false;}
      };
      const move=(index,mark)=>{if(busy)return;const resume=!!state.runningSince;pause();if(mark){state[mark][block.id]=true;delete state[mark==='completed'?'skipped':'completed'][block.id];}state.index=Math.max(0,Math.min(blocks.length-1,index));if(resume && !(mark && index>=blocks.length))state.runningSince=Date.now();persist();draw();};
      target.querySelectorAll('[data-live-adjust]').forEach(button=>button.onclick=()=>{
        if(busy)return;
        const base=Math.max(1,...block.entries.filter(x=>x.exercise && !absent(x.track.participant.attendance_status)).map(x=>Number(x.exercise.duration_minutes)||1))*60;
        state.adjustments[block.id]=Math.max(60-base,Number(state.adjustments[block.id]||0)+Number(button.dataset.liveAdjust));persist();draw();
      });
      target.querySelector('[data-live-prev]').onclick=()=>move(state.index-1);
      target.querySelector('[data-live-next]').onclick=()=>move(state.index+1,'completed');
      target.querySelector('[data-live-skip]').onclick=()=>move(state.index+1,'skipped');
      target.querySelectorAll('[data-live-jump]').forEach(button=>button.onclick=()=>move(Number(button.dataset.liveJump)));
      target.querySelector('[data-live-exit]').onclick=()=>{if(!busy){cleanup();h.exit();}};
      target.querySelector('[data-live-tactics]').onclick=()=>{target.querySelector('[data-live-tactics-sheet]').hidden=false;};
      target.querySelector('[data-live-tactics-close]').onclick=()=>{target.querySelector('[data-live-tactics-sheet]').hidden=true;};
      target.querySelectorAll('[data-live-attendance]').forEach(button=>button.onclick=async()=>{
        if(busy || draft.saving.size)return;
        const t=tracks.find(t=>t.profile.id===button.closest('[data-attendance-profile]').dataset.attendanceProfile);
        busy=true;button.disabled=true;
        try{await (BT.individualTraining?.coachAction || BT.api.individualAction)('setAttendance',{profileId:t.profile.id,sessionId:session.id,status:button.dataset.liveAttendance});if(valid()){t.participant.attendance_status=button.dataset.liveAttendance;draw();}}
        catch(error){if(valid()){button.disabled=false;status(error.message,true);}}finally{busy=false;}
      });
      target.querySelector('[data-live-finish]').onclick=finish;
      tick();if(state.runningSince)timer=setInterval(tick,1000);
    }
    async function finish() {
      if(busy)return;
      if(draft.saving.size){status('Bitte kurz warten, bis die laufende Messung gespeichert ist.',true);return;}
      const present=tracks.filter(t=>t.participant.attendance_status==='attended');
      if(!present.length){status('Bitte die tatsächliche Anwesenheit vor dem Abschluss bestätigen.',true);return;}
      if(tracks.some(t=>!absent(t.participant.attendance_status) && t.participant.attendance_status!=='attended')){status('Bitte die Teilnahme für jeden Spieler als anwesend oder fehlend bestätigen.',true);return;}
      if(present.some(t=>Object.values(state.players[t.profile.id].inputs).some(input=>String(input.value||'').trim()))){status('Es gibt noch nicht gespeicherte Ergebnisse. Bitte zuerst die Ergebnisse speichern oder das Eingabefeld leeren.',true);return;}
      pause();persist();busy=true;
      target.querySelectorAll('button,input,textarea,select').forEach(node=>node.disabled=true);
      status('Die gemeinsame Einheit und beide Spielerdokumentationen werden gespeichert …');
      const documents=present.map(t=>({profileId:t.profile.id,exercises:t.exercises.filter(e=>!state.skipped[`block-${e.position}`] || Number(state.elapsed[`block-${e.position}`]||0)>0 || state.players[t.profile.id].ratings[e.id] || (state.players[t.profile.id].notes[e.id]||'').trim()).map(e=>({
        exerciseId:e.database_id,seconds:Number(state.elapsed[`block-${e.position}`]||0),rating:state.players[t.profile.id].ratings[e.id]||null,note:(state.players[t.profile.id].notes[e.id]||'').trim()
      }))}));
      try{
        const result=await (BT.individualTraining?.coachAction || BT.api.individualAction)('completeLiveSession',{profileId:profile.id,sessionId:session.id,documents});
        if(!valid())return;
        localStorage.removeItem(key);draft.valid=false;drafts.delete(key);disposed=true;stopTimer();window.removeEventListener('bt-individual-live-saved',saved);document.body.classList.remove('individual-live-mode');dispose=()=>{};
        const jobs=(result.queuedDrafts || []).map(d=>BT.api.individualAIDraft('generate',{profileId:d.individual_profile_id,sessionId:d.session_id}));
        Promise.allSettled(jobs);await h.finished();
      }catch(error){busy=false;if(valid()){draw();status(error.message,true);}}
    }
    persist();draw();
  }
  return {render,cleanup,clearLocalData};
})();
