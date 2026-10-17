window.BT = window.BT || {};

BT.trainingPages = (() => {
  const esc = value => BT.util.escapeHTML(String(value ?? ''));
  const url = (id, page = '') => '#/training/' + encodeURIComponent(id) + (page ? '/' + page : '');
  const finished = t => BT.stats?.isEnded ? BT.stats.isEnded(t) : !!t.endedAt || t.status === 'completed';
  const minutes = d => Math.max(0, Number(d.minutes) || 0);
  const uid = () => globalThis.crypto?.randomUUID?.() || 'drill-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const state = () => BT.navigation?.getState() || {};
  const remember = patch => BT.navigation?.setState(patch);
  const goBack = fallback => BT.navigation ? BT.navigation.back(fallback) : location.hash = fallback;
  const link = (href, title, detail = '') => `<a class="tp-link" href="${esc(href)}"><span><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</span><span aria-hidden="true">›</span></a>`;
  function shell(target, page, title, subtitle = '') {
    const root = document.createElement('section'); root.className = 'view training-page'; root.dataset.trainingPage = page;
    root.innerHTML = `<header class="tp-header"><p class="section-kicker">TEAMTRAINING</p><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</header>`;
    target.append(root); return root;
  }
  function missing(target, id, text = 'Training nicht gefunden') {
    const root = shell(target, 'missing', text, 'Der Eintrag wurde möglicherweise gelöscht.');
    root.insertAdjacentHTML('beforeend', link(id ? url(id, 'plan') : '#/training', id ? 'Zum Trainingsplan' : 'Alle Trainings'));
  }
  function update(id, change) {
    const t = BT.storage.getTraining(id);
    if (!t) { BT.util.toast('Das Training wurde inzwischen gelöscht.'); return null; }
    t.plan ||= {drills: []}; t.plan.drills ||= [];
    if (change(t) === false) return null;
    if (t.planning?.source === 'ai-season') {
      t.planning.coachEdited = true; t.planning.status = 'coach-edited'; t.planning.editedAt = new Date().toISOString();
    }
    return BT.storage.upsertTraining(t);
  }
  // Additive identities keep drill links stable when a legacy plan is reordered.
  function identify(t) {
    let changed = false; const seen = new Set();
    for (const d of t.plan?.drills || []) {
      if (!d.id || seen.has(d.id)) { d.id = uid(); changed = true; }
      seen.add(d.id);
    }
    if (changed) BT.storage.upsertTraining(t);
    return t;
  }
  function renderList(target) {
    const root = shell(target, 'list', 'Dein Training', 'Planen. Gemeinsam besser werden.');
    root.insertAdjacentHTML('beforeend', `<a class="btn primary tp-create" href="#/training/new">+ Training planen</a><div class="tp-friday" data-role="friday-station-suggestion"></div>
      <label class="tp-search">Training suchen<input type="search" data-training-search placeholder="Schwerpunkt oder Datum" autocomplete="off"></label>
      <div class="tp-filter" role="group" aria-label="Trainings filtern"><button type="button" data-filter="upcoming">Anstehend</button><button type="button" data-filter="completed">Abgeschlossen</button></div>
      <p class="tp-list-count" role="status"></p><div class="tp-list"></div>
      <nav class="tp-secondary" aria-label="Trainingsplanung">${link('#/schedule','Saison & Kalender','Langfristig planen und KI-Planung nutzen')}${link('#/drills','Übungsbibliothek','Übungen sammeln und vorbereiten')}${link('#/notes','Trainernotizen')}</nav>`);
    const input = root.querySelector('input'); input.value = state().trainingSearch || '';
    let filter = state().trainingFilter === 'completed' ? 'completed' : 'upcoming';
    function refresh() {
      remember({trainingSearch:input.value, trainingFilter:filter});
      root.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
      const query = input.value.trim().toLocaleLowerCase('de');
      const trainings = BT.storage.getTrainings().filter(t => finished(t) === (filter === 'completed'))
        .filter(t => [t.date,BT.util.formatDate(t.date),t.note,t.plan?.summary].join(' ').toLocaleLowerCase('de').includes(query))
        .sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')) * (filter === 'completed' ? -1 : 1));
      root.querySelector('.tp-list-count').textContent = trainings.length + (trainings.length === 1 ? ' Training' : ' Trainings');
      root.querySelector('.tp-list').innerHTML = trainings.length ? trainings.map(t => {
        const date = String(t.date || '').split('-'); const ds = t.plan?.drills || [];
        return `<a class="tp-training-row" data-training-link href="${url(t.id)}"><span class="tp-date"><strong>${esc(date[2] || '–')}</strong><small>${esc(date[1] ? new Date(t.date+'T12:00:00').toLocaleDateString('de-DE',{month:'short'}) : '')}</small></span><span class="tp-training-info"><small>${esc(BT.util.formatDate(t.date))}${t.startTime ? ' · '+esc(t.startTime) : ''}</small><strong>${esc(t.note || t.plan?.summary || 'Teamtraining')}</strong><small>${finished(t) ? 'Abgeschlossen' : t.liveSession?.status === 'active' ? 'Durchführung geöffnet' : ds.length ? ds.length + ' Übungen · ' + ds.reduce((sum,d)=>sum+minutes(d),0) + ' Min.' : 'Plan noch offen'}</small></span><span aria-hidden="true">›</span></a>`;
      }).join('') : `<div class="tp-empty"><h3>${query ? 'Kein passendes Training' : filter === 'completed' ? 'Noch kein Training abgeschlossen' : 'Platz für die nächste Einheit'}</h3><p>${query ? 'Versuche einen anderen Suchbegriff.' : filter === 'completed' ? 'Abgeschlossene Einheiten erscheinen hier.' : 'Lege einen Termin an und baue deinen Trainingsplan auf.'}</p></div>`;
    }
    input.addEventListener('input',refresh);
    root.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;refresh();}));
    refresh();
    BT.training?.renderFridayStationSuggestion(root, BT.storage.getTrainings());
    root.addEventListener('click',async e=>{
      const b=e.target.closest('[data-action="create-friday-stations"]');if(!b)return;
      const game=BT.storage.getGame(b.dataset.gameId);
      const existing=BT.storage.getTrainings().find(t=>t.date===b.dataset.friday && !finished(t));
      if(existing && !existing.stationTraining && existing.plan?.drills?.length && !confirm('Den bestehenden Trainingsplan durch ein neues KI-Stationstraining ersetzen?'))return;
      try{const t=await BT.training.replanFridayTraining(b,b.dataset.friday,game,existing);location.hash=url(t.id);}
      catch(error){BT.util.toast('KI-Freitagstraining konnte nicht erstellt werden: '+error.message);}
    });
  }
  function bindDraft(form) {
    form.addEventListener('input',()=>remember({draft:Object.fromEntries(new FormData(form))}));
  }
  function renderNew(target) {
    const draft = state().draft || {};
    const root = shell(target,'new','Training planen','Erst der Rahmen. Den Ablauf stellst du danach zusammen.');
    root.insertAdjacentHTML('beforeend',`<form class="tp-form"><label>Datum<input required name="date" type="date" value="${esc(draft.date || BT.util.todayISO())}"></label><label>Beginn<input required name="startTime" type="time" value="${esc(draft.startTime || BT.storage.getSetting('trainingStartTime','20:15'))}"></label><label>Dauer in Minuten<input required name="duration" type="number" inputmode="numeric" min="15" max="240" value="${esc(draft.duration || BT.storage.getSetting('trainingDurationMinutes',90))}"></label><label>Schwerpunkt<input name="note" maxlength="300" placeholder="Zum Beispiel: Verteidigung im Team" value="${esc(draft.note || '')}"></label><div class="tp-form-actions"><button class="btn primary" type="submit">Training anlegen</button><button class="btn" type="button" data-cancel>Zurück</button></div></form>`);
    const form = root.querySelector('form'); bindDraft(form);
    form.querySelector('[data-cancel]').onclick = ()=>goBack('#/training');
    form.onsubmit = event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      const t = BT.storage.upsertTraining({date:data.date,startTime:data.startTime,note:data.note.trim(),attendance:BT.storage.attendanceForActivePlayers(data.date),freethrows:[],shots:[],plan:{drills:[],durationMinutes:Number(data.duration),summary:''}});
      remember({draft:null}); location.hash = url(t.id);
    };
  }
  function overview(target,t) {
    const drills = t.plan?.drills || []; const count = (BT.staff?.playerAttendance(t) || t.attendance || []).filter(a=>a.status==='present').length;
    const root = shell(target,'overview',t.note || 'Teamtraining',BT.util.formatDate(t.date) + (t.startTime ? ' · '+t.startTime+' Uhr' : ''));
    root.insertAdjacentHTML('beforeend',`<div class="tp-session-hero"><span class="tp-status">${finished(t) ? 'Abgeschlossen' : t.liveSession ? 'Durchführung gespeichert' : drills.length ? 'Bereit für die Halle' : 'Deine nächste Einheit'}</span><p>${esc(t.plan?.summary || 'Ein klarer Ablauf für dich und dein Team.')}</p><dl class="tp-facts"><div><dt>Geplant</dt><dd>${drills.reduce((n,d)=>n+minutes(d),0)} <small>Min.</small></dd></div><div><dt>Übungen</dt><dd>${drills.length}</dd></div><div><dt>Anwesend</dt><dd>${count}</dd></div></dl><a class="btn primary" href="${url(t.id,drills.length ? 'live' : 'plan')}">${drills.length ? finished(t) ? 'Durchführung ansehen' : t.liveSession ? 'Durchführung fortsetzen' : 'Training durchführen' : 'Trainingsplan erstellen'} <span aria-hidden="true">→</span></a></div>
      <nav class="tp-links" aria-label="Dieses Training">${link('#/briefing?training='+encodeURIComponent(t.id),'Trainerbriefing','Coaching-Fokus und offene Punkte')}${link(url(t.id,'plan'),'Trainingsplan',drills.length ? 'Ablauf und Übungen bearbeiten' : 'Schwerpunkt setzen und Übungen hinzufügen')}${link(url(t.id,'attendance'),'Anwesenheit','Wer ist heute dabei?')}${link(url(t.id,'records'),'Erfassung & Werkzeuge','Würfe, Fitness, Notizen und Uhren')}${t.stationTraining ? link(url(t.id,'load'),'Stationen & Belastung','Individuelle Aufgaben für dein Team') : ''}${link(url(t.id,'analysis'),'Auswertung','Ergebnisse dieser Einheit')}${link(url(t.id,'event'),'Termin & Verwaltung','Trainerteam, Vorlagen, Export und Abschluss')}</nav>`);
  }
  function plan(target,t) {
    t = identify(t); const drills=t.plan?.drills || [];
    const total=drills.reduce((n,d)=>n+minutes(d),0); const duration=t.plan?.durationMinutes || 90;
    const root=shell(target,'plan','Trainingsplan',BT.util.formatDate(t.date));
    root.insertAdjacentHTML('beforeend',`<div class="tp-plan-settings"><label>Schwerpunkt<textarea rows="2" maxlength="6000" data-plan-summary>${esc(t.plan?.summary || '')}</textarea></label><label>Dauer (Min.)<input type="number" min="15" max="240" required inputmode="numeric" data-plan-duration value="${esc(duration)}"></label><p class="tp-save-state" role="status">Änderungen werden automatisch gespeichert.</p></div><div class="tp-plan-total"><strong>${total} Min. verplant</strong><span>${Math.abs(duration-total)} Min. ${duration>=total ? 'frei' : 'überplant'}</span></div><ol class="tp-timeline"></ol><div class="tp-form-actions"><a class="btn primary" href="${url(t.id,'plan/library')}">+ Übung hinzufügen</a>${drills.length ? `<a class="btn" href="${url(t.id,'live')}">Training durchführen</a>` : ''}</div><nav class="tp-secondary">${link(url(t.id,'plan-options'),'Vorgaben & Planvarianten','Wurfziele, KI-Hinweise und weitere Planoptionen')}${link(url(t.id,'event'),'Vorlagen & Verwaltung','Vorlage laden, Plan speichern oder exportieren')}</nav>`);
    root.querySelector('[data-plan-summary]').oninput=e=>{update(t.id, x=>{x.plan.summary=e.target.value;});root.querySelector('.tp-save-state').textContent='Gespeichert';};
    root.querySelector('[data-plan-duration]').onchange=e=>{
      if(!e.target.reportValidity()) return;
      update(t.id,x=>{x.plan.durationMinutes=Number(e.target.value);});
      const diff=Number(e.target.value)-total;root.querySelector('.tp-plan-total span').textContent=Math.abs(diff)+' Min. '+(diff>=0?'frei':'überplant');
      root.querySelector('.tp-save-state').textContent='Gespeichert';
    };
    let elapsed=0;
    root.querySelector('ol').innerHTML=drills.length ? drills.map((d,i)=>{
      const start=elapsed;elapsed+=minutes(d);
      return `<li><a href="${url(t.id,'drill/'+encodeURIComponent(d.id))}" class="tp-drill-link"><span class="tp-sequence">${i+1}</span><span><small>${start}–${elapsed} Min.</small><strong>${esc(d.name || 'Übung')}</strong><small>${minutes(d)} Min. · ${esc({low:'Locker',medium:'Mittel',high:'Intensiv'}[d.intensity] || 'Mittel')}</small></span><span aria-hidden="true">›</span></a><div class="tp-reorder"><button type="button" data-move="up" data-drill="${esc(d.id)}" aria-label="${esc(d.name)} nach oben" ${i===0?'disabled':''}>↑</button><button type="button" data-move="down" data-drill="${esc(d.id)}" aria-label="${esc(d.name)} nach unten" ${i===drills.length-1?'disabled':''}>↓</button></div></li>`;
    }).join('') : '<li class="tp-empty"><h3>Wie startet dein Team?</h3><p>Füge die erste Übung hinzu. Anschließend kannst du den Ablauf sortieren.</p></li>';
    root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{
      const saved=update(t.id,x=>{const i=x.plan.drills.findIndex(d=>d.id===b.dataset.drill),j=i+(b.dataset.move==='up'?-1:1);if(i<0 || j<0 || j>=x.plan.drills.length)return false;[x.plan.drills[i],x.plan.drills[j]]=[x.plan.drills[j],x.plan.drills[i]];});
      if(saved){const scroll=window.scrollY;root.remove();plan(target,saved);window.scrollTo(0,scroll);const button=[...target.querySelectorAll('[data-move]')].find(el=>el.dataset.drill===b.dataset.drill && el.dataset.move===b.dataset.move && !el.disabled);button?.focus({preventScroll:true});}
    });
  }
  function drill(target,t,key) {
    identify(t); const isNew=key==='new'; const original=isNew ? {name:'',minutes:10,intensity:'medium',description:''} : t.plan?.drills?.find(d=>d.id===key);
    if(!original) return missing(target,t.id,'Übung nicht gefunden');
    const draft=state().draft; const d=draft?.drillKey===key ? {...original,...draft} : original;
    const root=shell(target,'drill',isNew?'Eigene Übung':original.name,'Eine Übung. Ein klarer Coaching-Auftrag.');
    root.insertAdjacentHTML('beforeend',`<form class="tp-form"><input type="hidden" name="drillKey" value="${esc(key)}"><label>Name<input required name="name" maxlength="200" value="${esc(d.name)}"></label><div class="tp-form-pair"><label>Dauer (Min.)<input required name="minutes" type="number" inputmode="numeric" min="1" max="240" value="${esc(d.minutes)}"></label><label>Intensität<select name="intensity"><option value="low">Locker</option><option value="medium">Mittel</option><option value="high">Intensiv</option></select></label></div><label>Ablauf & Coaching-Punkte<textarea name="description" rows="8" maxlength="6000" placeholder="Aufbau, Ablauf und worauf du achten möchtest …">${esc(d.description || '')}</textarea></label><p class="muted">Dein Entwurf bleibt beim Zurückgehen erhalten. Mit Speichern übernimmst du ihn in den Plan.</p><div class="tp-form-actions"><button class="btn primary" type="submit">Übung speichern</button><button class="btn" type="button" data-cancel>Zurück</button></div>${!isNew ? '<button class="btn danger" type="button" data-remove>Aus dem Plan entfernen</button>' : ''}</form>`);
    const form=root.querySelector('form');form.elements.intensity.value=d.intensity || 'medium';bindDraft(form);
    form.querySelector('[data-cancel]').onclick=()=>goBack(url(t.id,'plan'));
    form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form));const fields={name:data.name.trim(),minutes:Number(data.minutes),intensity:data.intensity,description:data.description};if(!fields.name)return;
      const saved=update(t.id,x=>{if(isNew)x.plan.drills.push({...fields,id:uid()});else {const index=x.plan.drills.findIndex(d=>d.id===key);if(index<0){BT.util.toast('Diese Übung wurde inzwischen entfernt.');return false;}x.plan.drills[index]={...x.plan.drills[index],...fields};}});
      if(saved){remember({draft:null});goBack(url(t.id,'plan'));}
    };
    form.querySelector('[data-remove]')?.addEventListener('click',()=>{
      if(!confirm('Diese Übung aus dem Trainingsplan entfernen?'))return;
      if(update(t.id,x=>{x.plan.drills=x.plan.drills.filter(d=>d.id!==key);})){remember({draft:null});goBack(url(t.id,'plan'));}
    });
  }
  function library(target,t) {
    const root=shell(target,'library','Übung hinzufügen','Wähle eine Übung für deinen Ablauf.');
    root.insertAdjacentHTML('beforeend',`<a class="btn primary" href="${url(t.id,'drill/new')}">+ Eigene Übung</a><label class="tp-search">Bibliothek durchsuchen<input type="search" data-library-search placeholder="Name oder Beschreibung"></label><p role="status" data-library-status></p><div class="tp-library"></div>`);
    const input=root.querySelector('input');input.value=state().librarySearch || '';
    function refresh(){remember({librarySearch:input.value});const q=input.value.trim().toLocaleLowerCase('de');const list=BT.storage.getDrills().filter(d=>[d.name,d.description,d.category].join(' ').toLocaleLowerCase('de').includes(q));root.querySelector('.tp-library').innerHTML=list.length ? list.map(d=>`<button class="tp-link" type="button" data-add="${esc(d.id)}"><span><strong>${esc(d.name)}</strong><small>${esc(d.category || 'Übung')} · ${minutes(d) || 10} Min.</small></span><span aria-hidden="true">+</span></button>`).join('') : '<p class="tp-empty">Keine passende Übung. Lege eine eigene an.</p>';}
    input.oninput=refresh;refresh();
    root.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const d=BT.storage.getDrills().find(x=>x.id===b.dataset.add);if(!d)return;
      if(update(t.id,x=>{x.plan.drills.push({...d,id:uid(),minutes:minutes(d)||10});})){b.textContent='✓ Hinzugefügt';b.disabled=true;root.querySelector('[data-library-status]').textContent=d.name+' hinzugefügt.';}
    });
  }
  const panes={attendance:'Anwesenheit',ft:'Freiwürfe',shots:'Feldwürfe',fitness:'Fitness',sprints:'Sprints',load:'Stationen & Belastung',map:'Wurfkarte',notes:'Spielernotizen',analysis:'Auswertung',timer:'Kurzzeit-Timer',event:'Termin & Verwaltung','plan-options':'Vorgaben & Planvarianten'};
  function legacy(target,t,page,query) {
    BT.training.renderDetail(target,t.id,true);
    const root=target.querySelector('.training-detail-view');root.dataset.trainingPage=page;root.classList.add('training-page','tp-capture');
    root.querySelector('.subnav').hidden=true;
    root.querySelector('.head-left > a')?.remove();
    root.querySelector('[data-role="title"]').textContent=panes[page];
    root.querySelector('.head-actions').hidden=page!=='event';
    root.querySelector('[data-role="training-staff"]').hidden=page!=='event';
    BT.training.showPane(page==='plan-options'?'plan':page,query?.get('category'));
    if(page==='event') {
      const actions=root.querySelector('.head-actions');actions.classList.add('tp-management-actions');
      root.querySelector('.pane[data-pane="event"]').append(actions);
      root.querySelector('.head-menu-toggle').textContent='Vorlagen, Export & weitere Aktionen';
    }
  }
  function render(target,id,page='overview',detail,query) {
    const t=BT.storage.getTraining(id);if(!t)return missing(target);
    if(page==='overview')return overview(target,t);
    if(page==='plan' && detail==='library')return library(target,t);
    if(page==='plan')return plan(target,t);
    if(page==='drill')return drill(target,t,detail);
    if(page==='live'){
      const root=shell(target,'live','Durchführung',BT.util.formatDate(t.date));
      if(!BT.trainingLive.open(t.id,{target:root,onBack:()=>goBack(url(id))}))root.insertAdjacentHTML('beforeend',link(url(id,'plan'),'Zuerst einen Trainingsplan erstellen','Füge mindestens eine Übung hinzu.'));
      return;
    }
    if(page==='clock'){const root=shell(target,'clock','Timer & Punkte',BT.util.formatDate(t.date));BT.trainingTimer.open(t.id,{target:root,onBack:()=>goBack(url(id))});return;}
    if(page==='records'){
      const root=shell(target,'records','Erfassung & Werkzeuge',BT.util.formatDate(t.date));
      root.insertAdjacentHTML('beforeend',`<nav class="tp-links">${link(url(id,'clock'),'Timer & Punkte','Stoppuhr, Intervalle und Trainingsspiel')}${['ft','shots','map','fitness','sprints','notes','timer'].map(p=>link(url(id,p),panes[p])).join('')}</nav>`);return;
    }
    if(panes[page])return legacy(target,t,page,query);
    missing(target,undefined,'Seite nicht gefunden');
  }
  return {renderList,renderNew,render};
})();
