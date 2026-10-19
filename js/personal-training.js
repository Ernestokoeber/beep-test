window.BT = window.BT || {};
BT.personalTraining = (() => {
  let generation = 0, renderedOwner;
  let core;
  const loadCore = () => core ||= import('./personal-core.mjs');
  const esc = value => BT.util.escapeHTML(String(value ?? ''));
  const current = () => BT.sync?.getState?.().user;
  const clone = value => JSON.parse(JSON.stringify(value));
  const dateLabel = value => new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value+'T12:00:00Z'));
  const route = hash => { location.hash = hash; };
  function draftKey(owner,hash) { return `courthub_personal_draft:${owner}:${hash}`; }
  function clearLocalData() {
    generation++;
    try { for (let i=localStorage.length-1;i>=0;i--) { const key=localStorage.key(i); if(key?.startsWith('courthub_personal_draft:')) localStorage.removeItem(key); } } catch {}
  }
  function navigation(hash) {
    const nav=document.querySelector('[data-role="personal-navigation"]');
    const selected=hash.split('/')[2]||'overview';
    const links=[['overview','Übersicht','#/personal'],['plan','Mein Plan','#/personal/plan'],['training','Trainieren','#/personal/training'],['history','Verlauf','#/personal/history']];
    if(nav) nav.innerHTML='<span class="nav-section-label">Dein persönliches Training</span>'+links.map(([key,label,href])=>`<a href="${href}" ${selected===key||key==='plan'&&['settings','edit'].includes(selected)?'aria-current="page" class="active"':''}>${label}</a>`).join('')+'<a href="#/personal/account">Konto</a><a href="#/dashboard">Bereich wechseln</a>';
    document.querySelectorAll('[data-personal-nav]').forEach(a=>{if(a.dataset.personalNav===selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  }
  function rules() {
    return `<details class="personal-rules"><summary>Belastung steuern und sicher steigern</summary><p>Dieser Aufbau setzt eine Sportfreigabe voraus. Individuelle Vorgaben deiner behandelnden Fachperson haben Vorrang. Beginne erst, wenn die übliche Ausgangslage nach der letzten Belastung wieder erreicht ist.</p><p>Während der Übungen höchstens leichte, stabile Beschwerden (vorsichtiger Startwert: maximal 3/10), ohne Hinken oder Ausweichen. Bei steigendem oder stechendem Schmerz beenden. Am nächsten Morgen wieder auf dem üblichen Ausgangsniveau; sonst pausieren oder zur zuvor verträglichen Dosis zurückgehen.</p><p>Erst nach zwei gut vertragenen vergleichbaren Einheiten eine Größe verändern: Wiederholungen, Widerstand oder Umfang. Zwischen anspruchsvolleren Krafteinheiten mindestens 48 Stunden lassen. Zusätzliche Team- und Alltagsbelastung mitrechnen.</p><p>Neue Schwellung, Blockieren oder Wegknicken ärztlich beurteilen lassen. Sprünge, Landungen, Cuts und Spielbelastung folgen erst nach ausreichendem Kraftaufbau und entsprechender fachlicher Beurteilung. Das Ende eines Trainingsblocks ist keine automatische Spielfreigabe.</p></details>`;
  }
  const input=(label,name,value,type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const area=(label,name,value,max=2000)=>`<label>${label}<textarea name="${name}" rows="3" maxlength="${max}">${esc(value)}</textarea></label>`;
  const pain=(label,name,value='')=>input(label,name,value,'number','min="0" max="10" step="1" required');
  async function render(target) {
    const token=++generation, owner=current()?.id, hash=location.hash;
    renderedOwner=owner;
    const credential=BT.api.getToken?.();
    navigation(hash);
    const alive=()=>token===generation&&current()?.id===owner&&BT.api.getToken?.()===credential&&location.hash===hash;
    if(!owner) { target.innerHTML='<section class="view personal-view"><h2>Personal</h2><p>Melde dich an, um deinen eigenen Trainingsplan auf allen Geräten zu nutzen.</p><a class="btn primary" href="#/personal/account">Zur Anmeldung</a></section>';return; }
    target.innerHTML='<section class="view personal-view"><h2>Personal</h2><p role="status">Dein Training wird geladen …</p></section>';
    let state, domain;
    try { [state,domain]=await Promise.all([BT.api.getPersonalTraining(),loadCore()]); }
    catch(error) { if(alive()){ target.innerHTML=`<section class="view personal-view"><h2>Personal</h2><p role="alert">${esc(error.message)}</p><button class="btn" data-retry>Erneut laden</button></section>`;target.querySelector('[data-retry]').onclick=()=>render(target); }return; }
    if(!alive()) return;
    const {plan,records}=state.data;
    const [,section='',encodedId='']=hash.slice(2).split('/');
    let selectedId; try {selectedId=decodeURIComponent(encodedId);} catch {selectedId='';}
    const completed=new Set(records.map(r=>r.sessionId));
    const activeSessions=plan?.sessions.filter(s=>s.kind!=='recovery'&&!s.optional)||[];
    const next=activeSessions.find(s=>!completed.has(s.id));
    const todaySession=plan?.sessions.find(s=>s.date===domain.localDate());
    const last=records.reduce((latest,r)=>!latest||r.date>=latest.date?r:latest,null), response=domain.reaction(last);
    const shell=body=>`<section class="view personal-view"><header class="personal-heading"><div><span class="section-kicker">Dein eigener Trainingsbereich</span><h2>Personal</h2><p>${esc(current()?.displayName||'Mein Training')} · nur für dein Konto</p></div><a class="btn small" href="#/dashboard">Bereich wechseln</a></header>${body}<p class="personal-status" role="status" aria-live="polite"></p></section>`;
    const status=message=>{const el=target.querySelector('.personal-status');if(el)el.textContent=message;};
    function card(s,index) {
      return `<article class="personal-card"><span class="personal-eyebrow">${s.optional?'Optional':s.kind==='recovery'?'Erholung':'Einheit '+(index+1)} · ${esc(s.location)} · ${s.minutes} Min.</span><h3>${esc(s.title)}</h3><p>${dateLabel(s.date)} · ${completed.has(s.id)?'Protokolliert':'Geplant – Termin anpassbar'}</p>${s.phase?`<p class="personal-phase">${esc(s.phase)}</p>`:''}<p>${esc(s.instruction)}</p><div class="personal-actions"><a class="btn primary" href="#/personal/training/${esc(s.id)}">${s.kind==='recovery'?'Erholung ansehen':completed.has(s.id)?'Erneut durchführen':'Einheit öffnen'}</a><a class="btn" href="#/personal/edit/${esc(s.id)}">Bearbeiten</a></div></article>`;
    }
    const guide=()=> (plan?.guide||[]).map(g=>`<details class="personal-rules"><summary>${esc(g.title)}</summary><p>${esc(g.text)}</p></details>`).join('');
    function monday(date) {const n=new Date(date+'T12:00:00Z').getUTCDay();return domain.addDays(date,-((n+6)%7));}
    function weekPlan() {
      const weeks=[...new Set(plan.sessions.map(s=>monday(s.date)))].sort();
      const selected=BT.navigation?.getState?.().personalWeek || (weeks.includes(monday(domain.localDate()))?monday(domain.localDate()):weeks[0]);
      return `<label class="personal-week-select">Woche auswählen<select data-week-select><option value="all" ${selected==='all'?'selected':''}>Alle Wochen</option>${weeks.map((w,i)=>`<option value="${w}" ${w===selected?'selected':''}>Woche ${i+1} · ${dateLabel(w)} – ${dateLabel(domain.addDays(w,6))}</option>`).join('')}</select></label><p class="personal-week-help">Montag Halle · Dienstag/Freitag Kraft zuhause · Mittwoch optional · Donnerstag/Sonntag Erholung · Samstag Rumpf und Oberkörper.</p>${weeks.map(w=>`<section data-personal-week="${w}" ${selected!=='all'&&selected!==w?'hidden':''}><div class="personal-grid">${plan.sessions.map((s,i)=>monday(s.date)===w?card(s,i):'').join('')}</div></section>`).join('')}`;
    }
    function defaultEnd(date) {const d=new Date(date.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+2,0);return d.toISOString().slice(0,10);}
    let body='';
    if(section==='settings'||!plan) {
      body=`<div class="personal-card"><h3>${plan?'Ziele und Rahmen':'Deinen Aufbauplan anlegen'}</h3><p>Wähle den kurzen Startblock oder einen umfassenden Aufbauplan mit Hallen-, Heim- und Erholungstagen. Termine und Übungen bleiben einzeln anpassbar.</p><form data-form="settings">${input('Planname','title',plan?.title||'Mein Aufbauplan','text','maxlength="120" required')}${area('Mein Ziel','goal',plan?.goal||'Kontrolliert zum Basketball zurückkehren',800)}${input('Erfahrung','experience',plan?.experience||'Fortgeschritten','text','maxlength="120" required')}${input('Startdatum','startDate',plan?.startDate||domain.localDate(),'date','required')}<label>Trainingsplan<select name="planTemplate"><option value="keep">${plan?'Bestehende Einheiten behalten':'Kurzer Startblock · acht Einheiten'}</option><option value="rehab">Umfassender Reha-Aufbau · Montag Halle, Rest zuhause</option></select></label>${input('Enddatum für umfassenden Aufbauplan','endDate',plan?.endDate||defaultEnd(plan?.startDate||domain.localDate()),'date','required')}${area('Persönliche Vorgaben und Hinweise','notes',plan?.notes||'',3000)}<p>Beim umfassenden Aufbauplan werden die bisherigen geplanten Termine durch den neuen Wochenplan ersetzt. Bereits gespeicherte Trainingsprotokolle bleiben erhalten. Mittwoch ist eine optionale Hallenalternative zur leichten Heimeinheit; Mannschaftstraining ist nicht enthalten. Stufen werden nur nach Verträglichkeit gesteigert.</p><button class="btn primary">${plan?'Änderungen speichern':'Aufbauplan anlegen'}</button></form></div>${rules()}`;
    } else if(section==='plan') {
      body=`<div class="personal-section-head"><div><h3>${esc(plan.title)}</h3><p>${esc(plan.goal)}</p></div><a class="btn" href="#/personal/settings">Ziele und Plan bearbeiten</a></div><details class="personal-rules"><summary>Dein Ziel und deine Vorgaben</summary><p>${esc(plan.experience)}</p>${plan.notes?`<p class="personal-note">${esc(plan.notes)}</p>`:''}</details>${plan.type==='rehab'?weekPlan():`<div class="personal-grid">${plan.sessions.map(card).join('')}</div>`}<form data-form="append" class="personal-card"><h3>Weitere Einheit planen</h3><label>Vorlage<select name="kind"><option value="strengthA">Kraft A</option><option value="strengthB">Kraft B</option><option value="court">Halle</option><option value="recovery">Erholung</option></select></label>${input('Datum','date',domain.addDays(plan.sessions.at(-1).date,2),'date','required')}<button class="btn">Einheit ergänzen</button></form>${guide()}${rules()}`;
    } else if(section==='edit') {
      const s=plan.sessions.find(s=>s.id===selectedId);
      if(!s) body='<p>Einheit nicht gefunden.</p><a href="#/personal/plan">Zum Plan</a>';
      else body=`<div class="personal-card"><h3>Einheit bearbeiten</h3><form data-form="edit">${input('Titel','title',s.title,'text','maxlength="120" required')}<div class="personal-fields">${input('Datum','date',s.date,'date','required')}${input('Dauer in Minuten','minutes',s.minutes,'number','min="5" max="180" required')}${input('Ort','location',s.location,'text','maxlength="100" required')}</div>${area('Hinweis zur Belastung','instruction',s.instruction,1500)}${s.exercises.map((e,i)=>`<fieldset><legend>Übung ${i+1}</legend>${input('Übungsname',`title-${i}`,e.title,'text','maxlength="160" required')}${area('Sätze, Wiederholungen und Pausen',`dose-${i}`,e.dose,500)}${area('Ausführung / Alternative',`cue-${i}`,e.cue,1500)}</fieldset>`).join('')}<div class="personal-actions"><button class="btn primary">Einheit speichern</button><a class="btn" href="#/personal/plan">Zurück zum Plan</a></div></form></div>`;
    } else if(section==='training') {
      const s=selectedId?plan.sessions.find(s=>s.id===selectedId):next;
      if(!s) body='<div class="personal-card"><h3>Startblock protokolliert</h3><p>Besprich den weiteren Kraftaufbau und die spätere Sprungbelastung mit deiner Physiotherapie.</p><a class="btn" href="#/personal/plan">Weitere Einheit planen</a></div>';
      else body=`<aside class="personal-reaction ${response.level}"><strong>${response.title}</strong><p>${response.text}</p>${last&&last.nextPain===null?`<a href="#/personal/followup/${last.id}">Reaktion am Folgetag erfassen</a>`:''}</aside><div class="personal-card"><span class="personal-eyebrow">${esc(s.location)} · geplant ${s.minutes} Minuten</span><h3>${esc(s.title)}</h3><p>${esc(s.instruction)}</p><a href="#/personal/edit/${s.id}">Termin oder Ablauf bearbeiten</a><form data-form="record"><div class="personal-fields">${input('Trainingstag','date',domain.localDate(),'date','required')}${pain('Knieschmerz vorher (0–10)','prePain')}</div>${s.exercises.map((e,i)=>`<fieldset class="personal-exercise"><legend>${i+1}. ${esc(e.title)}</legend><p><strong>${esc(e.dose)}</strong></p><p>${esc(e.cue)}</p><label class="personal-check"><input type="checkbox" name="done-${i}">Durchgeführt</label>${input('Tatsächlich geschafft / Treffer und Versuche',`actual-${i}`,'','text','maxlength="500"')}</fieldset>`).join('')}<h3>Einheit abschließen</h3><div class="personal-fields">${input('Tatsächliche Dauer in Minuten','minutes',s.minutes,'number','min="1" max="240" required')}${pain('Knieschmerz danach (0–10)','postPain')}${input('Anstrengung (1–10)','rpe','','number','min="1" max="10" required')}</div><label class="personal-check"><input type="checkbox" name="swelling">Neue Schwellung</label><label class="personal-check"><input type="checkbox" name="blocking">Knie blockiert</label><label class="personal-check"><input type="checkbox" name="givingWay">Knie gibt nach</label>${area('Meine Beobachtungen','notes','')}<p>Schmerz und Steifigkeit am Folgetag werden separat erfasst. Nicht als erledigt markieren, was du nicht durchgeführt hast.</p><button class="btn primary">Trainingsprotokoll speichern</button></form></div>${rules()}`;
    } else if(section==='followup') {
      const r=records.find(r=>r.id===selectedId);
      if(!r) body='<p>Protokoll nicht gefunden.</p><a href="#/personal/history">Zum Verlauf</a>';
      else if(domain.localDate()<=r.date) body=`<div class="personal-card"><h3>Rückmeldung am nächsten Morgen</h3><p>Für das Training vom ${dateLabel(r.date)} kannst du die Reaktion ab dem nächsten Kalendertag erfassen.</p><a href="#/personal/history">Zum Verlauf</a></div>`;
      else body=`<div class="personal-card"><h3>Reaktion am Folgetag</h3><p>${esc(r.title)} · ${dateLabel(r.date)} · Schmerz vorher ${r.prePain}/10</p><form data-form="followup">${pain('Knieschmerz am nächsten Morgen (0–10)','nextPain',r.nextPain??'')}<label class="personal-check"><input type="checkbox" name="stiffness" ${r.stiffness?'checked':''}>Mehr Steifigkeit als vor dem Training</label><label class="personal-check"><input type="checkbox" name="swelling" ${r.swelling?'checked':''}>Neue Schwellung seit der Einheit</label><label class="personal-check"><input type="checkbox" name="blocking" ${r.blocking?'checked':''}>Knie blockiert seit der Einheit</label><label class="personal-check"><input type="checkbox" name="givingWay" ${r.givingWay?'checked':''}>Knie gibt nach seit der Einheit</label><button class="btn primary">Reaktion speichern</button></form></div>`;
    } else if(section==='history') {
      body=`<div class="personal-section-head"><h3>Dein Verlauf</h3><span>${records.length} Protokolle</span></div>${records.length?[...records].reverse().map(r=>`<article class="personal-card"><span class="personal-eyebrow">${dateLabel(r.date)} · ${r.minutes} Min. · Anstrengung ${r.rpe}/10</span><h3>${esc(r.title)}</h3><dl class="personal-metrics"><div><dt>Vorher</dt><dd>${r.prePain}/10</dd></div><div><dt>Danach</dt><dd>${r.postPain}/10</dd></div><div><dt>Folgetag</dt><dd>${r.nextPain===null?'Offen':r.nextPain+'/10'}</dd></div></dl><p><strong>${domain.reaction(r).title}</strong></p><p>${domain.reaction(r).text}</p><details><summary>Übungen und Beobachtungen</summary>${r.exercises.map(e=>`<p>${e.done?'✓':'–'} ${esc(e.title)}${e.actual?' · '+esc(e.actual):''}</p>`).join('')}<p>${esc(r.notes)}</p></details><a class="btn" href="#/personal/followup/${r.id}">${r.nextPain===null?'Folgetag erfassen':'Folgetag bearbeiten'}</a></article>`).join(''):'<div class="personal-card"><p>Noch kein Training protokolliert.</p><a class="btn primary" href="#/personal/training">Erste Einheit öffnen</a></div>'}`;
    } else {
      const count=activeSessions.filter(s=>completed.has(s.id)).length;
      body=`<div class="personal-section-head"><div><h3>${esc(plan.title)}</h3><p>${esc(plan.goal)}</p></div><a class="btn" href="#/personal/plan">Mein Plan</a></div><aside class="personal-reaction ${response.level}"><strong>${response.title}</strong><p>${response.text}</p></aside><div class="personal-metrics"><div><span>Aufbaueinheiten protokolliert</span><strong>${count} / ${activeSessions.length}</strong></div><div><span>Trainingsminuten</span><strong>${records.reduce((n,r)=>n+r.minutes,0)}</strong></div></div>${records.filter(r=>r.nextPain===null).map(r=>`<a class="personal-followup" href="#/personal/followup/${r.id}">Reaktion am Folgetag ergänzen · ${dateLabel(r.date)} →</a>`).join('')}${todaySession&&(todaySession.kind==='recovery'||todaySession.optional)?`<h3>Heute: ${todaySession.optional?'optional':'Erholung'}</h3>${card(todaySession,plan.sessions.indexOf(todaySession))}`:''}${next?`<h3>Deine nächste Aufbaueinheit</h3>${card(next,plan.sessions.indexOf(next))}`:'<p>Startblock protokolliert. Nächste Schritte fachlich abstimmen.</p>'}${guide()}${rules()}<details class="personal-rules"><summary>Grundlagen zum Aufbau</summary><ul>${domain.SOURCES.map(([title,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`).join('')}</ul><p>Der Plan steigert die Belastbarkeit von Muskulatur und Patellasehne schrittweise. Termine sind Vorschläge; Beschwerden und individuelle Vorgaben bestimmen die nächste Stufe.</p></details>`;
    }
    target.innerHTML=shell(body);
    const weekSelect=target.querySelector('[data-week-select]');
    if(weekSelect) weekSelect.addEventListener('change',()=>{
      target.querySelectorAll('[data-personal-week]').forEach(el=>el.hidden=weekSelect.value!=='all'&&el.dataset.personalWeek!==weekSelect.value);
      BT.navigation?.setState?.({personalWeek:weekSelect.value});
    });
    const form=target.querySelector('form');
    if(!form) return;
    const key=draftKey(owner,hash);
    try {
      const draft=JSON.parse(localStorage.getItem(key)||'null');
      if(draft) { for(const el of form.elements) if(el.name&&Object.hasOwn(draft,el.name)) {if(el.type==='checkbox')el.checked=draft[el.name];else el.value=draft[el.name];} status('Dein noch nicht gespeicherter Eingabeentwurf wurde wiederhergestellt.'); }
    } catch {}
    form.addEventListener('input',()=>{
      const draft={}; for(const el of form.elements) if(el.name) draft[el.name]=el.type==='checkbox'?el.checked:el.value;
      try{localStorage.setItem(key,JSON.stringify(draft));}catch{status('Eingabeentwurf kann auf diesem Gerät nicht gesichert werden. Bitte vor dem Verlassen speichern.');}
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault(); if(!form.reportValidity()||!alive())return;
      const button=form.querySelector('button[type="submit"],button:not([type])');button.disabled=true;
      const values=new FormData(form), v=name=>String(values.get(name)||''), n=name=>Number(values.get(name)), checked=name=>values.has(name);
      const data=clone(state.data); let destination='#/personal';
      try {
        if(form.dataset.form==='settings') {
          if(v('planTemplate')==='rehab') {
            const {createRehabPlan}=await import('./personal-rehab.mjs');
            if(!alive())return;
            data.plan=createRehabPlan({startDate:v('startDate'),endDate:v('endDate'),goal:v('goal'),experience:v('experience'),notes:v('notes')});data.plan.title=v('title');
          } else if(data.plan) Object.assign(data.plan,{title:v('title'),goal:v('goal'),experience:v('experience'),notes:v('notes'),startDate:v('startDate')});
          else {data.plan=domain.createPlan({startDate:v('startDate'),goal:v('goal'),experience:v('experience'),notes:v('notes')});data.plan.title=v('title');}
          destination='#/personal/plan';
        } else if(form.dataset.form==='append') {
          const template=domain.WORKOUTS[v('kind')];data.plan.sessions.push({...clone(template),kind:v('kind'),id:crypto.randomUUID(),date:v('date'),instruction:'Nur bei verträglicher Ausgangslage durchführen. Steigerung nach Reaktion, nicht nach Kalender.'});destination='#/personal/plan';
        } else if(form.dataset.form==='edit') {
          const s=data.plan.sessions.find(s=>s.id===selectedId);Object.assign(s,{title:v('title'),date:v('date'),minutes:n('minutes'),location:v('location'),instruction:v('instruction')});s.exercises.forEach((e,i)=>Object.assign(e,{title:v(`title-${i}`),dose:v(`dose-${i}`),cue:v(`cue-${i}`)}));destination='#/personal/plan';
        } else if(form.dataset.form==='record') {
          const s=selectedId?plan.sessions.find(s=>s.id===selectedId):next;
          if(!s.exercises.some((_,i)=>checked(`done-${i}`)))throw new Error('Markiere mindestens eine tatsächlich durchgeführte Übung.');
          if(v('date')>domain.localDate())throw new Error('Ein durchgeführtes Training kann nicht in der Zukunft liegen.');
          data.records.push({id:crypto.randomUUID(),sessionId:s.id,date:v('date'),title:s.title,minutes:n('minutes'),prePain:n('prePain'),postPain:n('postPain'),nextPain:null,rpe:n('rpe'),stiffness:false,swelling:checked('swelling'),blocking:checked('blocking'),givingWay:checked('givingWay'),notes:v('notes'),exercises:s.exercises.map((e,i)=>({id:e.id,title:e.title,done:checked(`done-${i}`),actual:v(`actual-${i}`)}))});destination='#/personal/history';
        } else if(form.dataset.form==='followup') {
          const r=data.records.find(r=>r.id===selectedId);Object.assign(r,{nextPain:n('nextPain'),stiffness:checked('stiffness'),swelling:checked('swelling'),blocking:checked('blocking'),givingWay:checked('givingWay')});destination='#/personal/history';
        }
        domain.validateStore(data);status('Wird gespeichert …');
        const saved=await BT.api.savePersonalTraining(data,state.version);
        if(!alive())return;
        state=saved;try{localStorage.removeItem(key);}catch{}BT.util.toast('Dein persönliches Training wurde gespeichert.');if(location.hash===destination)await render(target);else route(destination);
      } catch(error) {
        if(alive()) {status(error.message);button.disabled=false;if(error.status===409){const reload=document.createElement('button');reload.className='btn';reload.textContent='Aktuellen Stand laden';reload.onclick=()=>render(target);target.querySelector('.personal-status').append(document.createElement('br'),reload);}}
      }
    });
  }
  window.addEventListener('bt-sync-change',()=>{
    if(location.hash.startsWith('#/personal') && location.hash!=='#/personal/account' && current()?.id!==renderedOwner) {
      const target=document.getElementById('app'); if(target) render(target);
    }
  });
  return {render,clearLocalData,cleanup(){generation++;},navigation};
})();
