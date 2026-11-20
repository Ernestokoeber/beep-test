window.BT=window.BT||{};
BT.fridayTraining=(()=>{
  const base='#/friday-individual', esc=v=>BT.util.escapeHTML(String(v??''));
  const url=id=>base+'/training/'+encodeURIComponent(id);
  const isFriday=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'') && new Date(date+'T12:00:00').getDay()===5;
  const identity=()=>{const s=BT.sync?.getState?.();return JSON.stringify([s?.user?.id,s?.user?.organization?.id,s?.user?.role,s?.sessionEpoch]);};
  let displayedScope=null;
  window.addEventListener('bt-sync-change',()=>{if(displayedScope&&displayedScope!==identity()&&location.hash.startsWith(base))window.dispatchEvent(new Event('hashchange'));});
  const writable=()=>!['viewer','player'].includes(BT.sync?.getState?.().user?.role);
  const aliases={pg:'pg',pointguard:'pg','1':'pg',sg:'sg',shootingguard:'sg','2':'sg',sf:'sf',smallforward:'sf','3':'sf',pf:'pf',powerforward:'pf','4':'pf',c:'c',center:'c',centre:'c','5':'c'};
  const normalize=value=>aliases[String(value||'').toLowerCase().replace(/[\s-]/g,'')]||null;
  function positions(player){return [...new Set(String(player?.position||player?.gamePosition||'').split(/[\/,;|+]/).map(normalize).filter(Boolean))];}
  const label=position=>BT.fridayIndividual.positions.find(p=>p[0]===position)?.[1]||'Position offen';
  const hash=value=>[...value].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
  const dateISO=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  function calendar(trainings,today=BT.util.todayISO(),weekCount=12) {
    const next=new Date(today+'T12:00:00');next.setDate(next.getDate()+(5-next.getDay()+7)%7);
    const nextDate=dateISO(next);
    const compare=(a,b)=>a.date.localeCompare(b.date)||String(a.startTime||'').localeCompare(String(b.startTime||''))||String(a.id||'').localeCompare(String(b.id||''));
    const fridays=trainings.filter(t=>isFriday(t.date));
    const upcoming=fridays.filter(t=>t.date>=today).sort(compare),past=fridays.filter(t=>t.date<today).sort((a,b)=>compare(b,a));
    const onDate=upcoming.filter(t=>t.date===nextDate);
    const current=onDate.find(t=>!t.endedAt&&t.status!=='completed')||onDate[0]||null;
    const byDate=new Map();for(const training of upcoming){if(!byDate.has(training.date))byDate.set(training.date,[]);byDate.get(training.date).push(training);}
    const weeks=Array.from({length:weekCount},(_,index)=>{const date=new Date(next);date.setDate(date.getDate()+index*7);const iso=dateISO(date);return {date:iso,trainings:byDate.get(iso)||[]};});
    return {today,nextDate,upcoming,past,current,weeks};
  }
  function assess(training,players=[]) {
    const byId=new Map(players.map(p=>[p.id,p])), attendance=BT.staff?.playerAttendance(training)||(training?.attendance||[]).filter(a=>!(training.staff||[]).some(s=>s.playerId===a.playerId&&!s.alsoPlayer));
    const present=[...new Set(attendance.filter(a=>a?.status==='present'&&typeof a.playerId==='string'&&a.playerId).map(a=>a.playerId))];
    const mode=!isFriday(training?.date)?'other-day':!present.length?'pending':present.length<10?'individual':'team';
    const available=(BT.fridayPositionExercises||[]).filter(r=>r.playersMin<=present.length && r.level!=='Fortgeschritten');
    const members=present.map(id=>{
      const player=byId.get(id),options=positions(player),override=normalize(training.fridayIndividual?.positions?.[id]);
      const position=override||(options.length===1?options[0]:null);
      const families=[...new Set(available.filter(r=>r.primaryPosition===position).map(r=>r.familyId))];
      const offset=families.length ? hash(training.date+'|'+position+'|'+(training.fridayIndividual?.rotation||0))%families.length : 0;
      const ordered=families.slice(offset).concat(families.slice(0,offset)), chosen=[];
      if(mode==='individual'&&position)for(const task of ['Technikaufbau','Verteidigung lesen','Konter finden']) {
        const eligible=available.filter(r=>r.primaryPosition===position && !chosen.some(c=>c.familyId===r.familyId));
        const candidates=eligible.filter(r=>r.task===task),pool=candidates.length?candidates:eligible;
        pool.sort((a,b)=>ordered.indexOf(a.familyId)-ordered.indexOf(b.familyId));if(pool[0])chosen.push(pool[0]);
      }
      return {id,player,position,options,override,exercises:chosen,issue:!player?'Spielerprofil fehlt':!position?(options.length>1?'Mehrere Positionen hinterlegt – Tagesrolle wählen':'Position fehlt oder ist nicht eindeutig'):chosen.length<3&&mode==='individual'?'Nicht genügend passende Aufgaben für die aktuelle Gruppengröße':null};
    });
    return {mode,count:present.length,members,pending:attendance.filter(a=>!a.status).length};
  }
  function renderEntry(root,training) {
    if(!root||!isFriday(training?.date))return;
    let host=root.querySelector('[data-friday-training-entry]');
    if(!host){host=document.createElement('section');host.dataset.fridayTrainingEntry='';host.className='friday-session-entry';(root.querySelector('.pane[data-pane="attendance"]')||root).append(host);}
    const result=assess(training,BT.storage.getPlayers());
    host.innerHTML='<h3>Freitag individual</h3><p>'+result.count+' anwesende Spieler · '+(result.mode==='team'?'Ab 10 Anwesenden: reguläres Mannschaftstraining.':result.mode==='pending'?'Zuerst Anwesenheiten erfassen.':'Positionsaufgaben für die kleine Trainingsgruppe.')+'</p><a class="btn" href="'+url(training.id)+'">Anwesenheiten & Positionsaufgaben öffnen</a>';
  }
  function render(target,id) {
    displayedScope=identity();
    const root=document.createElement('section');root.className='view friday-individual library-page';root.dataset.fridayPage=id?'session':'home';target.replaceChildren(root);
    const scope=identity(),route=location.hash,active=()=>root.isConnected&&scope===identity()&&route===location.hash;
    const training=id?BT.storage.getTraining(id):null;
    const heading=title=>'<header class="friday-heading"><span class="section-kicker">Freitagstraining nach Anwesenheit</span><h2>'+title+'</h2></header>';
    if(!id){
      const days=calendar(BT.storage.getTrainings()),isToday=days.nextDate===days.today;
      const entry=t=>'<a class="library-link" data-friday-date="'+esc(t.date)+'" href="'+url(t.id)+'"><span><strong>'+(t.date===days.today?'Heute · ':'')+esc(BT.util.formatDate(t.date))+(t.startTime?' · '+esc(t.startTime):'')+'</strong><small>'+assess(t,BT.storage.getPlayers()).count+' anwesend · '+esc(t.note||'Freitagstraining')+'</small></span><span aria-hidden="true">›</span></a>';
      const weekEntry=week=>week.trainings.length?week.trainings.map(entry).join(''):'<div class="friday-session-slot" data-friday-date="'+week.date+'"><div><strong>'+(week.date===days.today?'Heute · ':'')+esc(BT.util.formatDate(week.date))+'</strong><small>Noch nicht angelegt</small></div>'+(writable()?'<button class="btn" type="button" data-friday-open-date="'+week.date+'" aria-label="Training am '+esc(BT.util.formatDate(week.date))+' anlegen und öffnen">Anlegen & öffnen</button>':'')+'</div>';
      root.innerHTML=heading('Freitag individual')+'<p>Bei 1 bis 9 anwesenden Spielern trainiert ihr mit passenden Positionsaufgaben. Ab 10 Anwesenden bleibt es beim regulären Mannschaftstraining. Trainer zählen nur mit, wenn sie auch als Spieler teilnehmen.</p><section class="friday-session-entry" data-friday-current><h3>'+(isToday?'Heute: ':'Nächster Freitag: ')+esc(BT.util.formatDate(days.nextDate))+'</h3><p>Die Positionsaufgaben gelten für jedes Freitagstraining ab heute. Die Anwesenheit entscheidet über die Trainingsform.</p>'+(days.current?'<a class="btn primary" href="'+url(days.current.id)+'">'+(isToday?'Heutiges Freitagstraining öffnen':'Nächstes Freitagstraining öffnen')+'</a>':writable()?'<button class="btn primary" type="button" data-friday-open-current>'+(isToday?'Heutiges Freitagstraining anlegen':'Nächstes Freitagstraining anlegen')+'</button>':'<p>Für diesen Freitag ist noch kein Training angelegt.</p>')+'</section><a class="btn" href="'+base+'/exercises">500 Übungskarten nach Position ansehen</a><h3>Heute und nächste Freitage</h3><p>Jeder Freitag ist aufgeführt. Bereits geplante Trainings kannst du direkt öffnen; fehlende Termine legst du mit einem Klick an.</p><nav class="friday-session-list" data-friday-upcoming>'+days.weeks.map(weekEntry).join('')+'</nav><button class="btn" type="button" data-friday-more-weeks>Weitere 12 Freitage anzeigen</button>';
      let weekCount=12;
      root.querySelector('[data-friday-more-weeks]').addEventListener('click',()=>{if(!active())return;weekCount+=12;root.querySelector('[data-friday-upcoming]').innerHTML=calendar(BT.storage.getTrainings(),days.today,weekCount).weeks.map(weekEntry).join('');});
      if(days.past.length)root.insertAdjacentHTML('beforeend','<details data-friday-past><summary>Vergangene Freitagstrainings ('+days.past.length+')</summary><nav class="friday-session-list">'+days.past.map(entry).join('')+'</nav></details>');
      if(writable()){
        root.insertAdjacentHTML('beforeend','<form class="friday-create"><h3>Weiteren Freitag planen</h3><label>Freitag<input name="date" type="date" required min="'+days.today+'" value="'+days.nextDate+'"></label><label>Beginn<input name="time" type="time" required value="'+esc(BT.storage.getSetting('trainingStartTime','20:15'))+'"></label><button class="btn primary" type="submit">Training öffnen oder anlegen</button><p role="status" data-friday-save></p></form>');
        let opening=false;
        const openTraining=async(date,time,button)=>{
          if(opening||!active()||!writable())return;
          const status=root.querySelector('[data-friday-save]');
          if(!isFriday(date)||date<BT.util.todayISO()){status.textContent='Bitte heute oder einen zukünftigen Freitag auswählen.';return;}
          opening=true;button.disabled=true;
          try{const onDate=BT.storage.getTrainings().filter(t=>t.date===date);let saved=onDate.find(t=>!t.endedAt&&t.status!=='completed')||onDate[0];
            if(!saved){saved=BT.storage.upsertTraining({date,startTime:time,note:'Freitagstraining',attendance:BT.storage.attendanceForActivePlayers(date),freethrows:[],shots:[],plan:{drills:[],durationMinutes:BT.storage.getSetting('trainingDurationMinutes',105),summary:''}});await BT.storage.flush();}
            if(active())location.hash=url(saved.id);
          }catch(error){if(active())status.textContent=error.message||'Speichern fehlgeschlagen.';}finally{opening=false;if(active())button.disabled=false;}
        };
        root.querySelector('[data-friday-open-current]')?.addEventListener('click',event=>openTraining(days.nextDate,root.querySelector('[name=time]').value,event.currentTarget));
        root.querySelector('[data-friday-upcoming]').addEventListener('click',event=>{const button=event.target.closest('[data-friday-open-date]');if(button)openTraining(button.dataset.fridayOpenDate,root.querySelector('[name=time]').value,button);});
        root.querySelector('form').onsubmit=event=>{
          event.preventDefault();const form=event.currentTarget;if(form.reportValidity())openTraining(form.elements.date.value,form.elements.time.value,form.querySelector('button'));
        };
      }
      return;
    }
    if(!training||!isFriday(training.date)){root.innerHTML=heading('Freitagstraining nicht gefunden')+'<a class="btn" href="'+base+'">Zur Freitagsübersicht</a>';return;}
    const players=BT.storage.getPlayers(), staffIds=new Set((training.staff||[]).filter(s=>!s.alsoPlayer).map(s=>s.playerId));
    const people=players.filter(p=>!p.archived&&!staffIds.has(p.id));
    const statusOptions=[['','Offen'],['present','Anwesend'],['absent','Abwesend'],['excused','Entschuldigt'],['injured','Verletzt']];
    root.innerHTML=heading('Freitag individual')+'<p>'+esc(BT.util.formatDate(training.date))+' · '+esc(training.startTime||'')+'</p><nav class="friday-breadcrumbs"><a href="'+base+'">Freitagsübersicht</a><a href="'+base+'/exercises">500 Übungskarten</a><a href="#/training/'+encodeURIComponent(id)+'">Training & Erfassung</a></nav><section><h3>1. Anwesenheiten</h3><p>Nur „Anwesend“ zählt. Verspätete Spieler zählen mit, sobald sie als anwesend erfasst sind.</p><div class="friday-attendance">'+people.map(p=>{const att=(training.attendance||[]).find(a=>a.playerId===p.id);return '<label><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.position||p.gamePosition||'Position offen')+'</small></span><select data-friday-attendance="'+esc(p.id)+'" aria-label="Anwesenheit '+esc(p.name)+'" '+(!writable()?'disabled':'')+'>'+statusOptions.map(([v,l])=>'<option value="'+v+'"'+((att?.status||'')===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label>';}).join('')+'</div></section><p role="status" data-friday-save></p><section data-friday-assignments></section>';
    let busy=false,individualOptions=[];
    const session=t=>{t.fridayIndividual||={};return t.fridayIndividual.session||={};};
    async function save(change){
      if(busy||!active()||!writable())return;busy=true;root.querySelectorAll('select,button,input').forEach(c=>c.disabled=true);const status=root.querySelector('[data-friday-save]');status.textContent='Speichern …';
      try{const fresh=BT.storage.getTraining(id);if(!fresh)throw Error('Training wurde inzwischen entfernt.');change(fresh);BT.storage.upsertTraining(fresh);await BT.storage.flush();if(active()){status.textContent='Gespeichert.';draw();}}
      catch(error){if(active()){status.textContent=error.message||'Speichern fehlgeschlagen.';draw();}}
      finally{busy=false;if(active())root.querySelectorAll('select,button,input').forEach(c=>c.disabled=!writable());}
    }
    root.addEventListener('change',event=>{
      const key=event.target.dataset.fridayAttendance;if(key){const value=event.target.value;if(!statusOptions.some(([v])=>v===value))return;
        save(t=>{if((t.staff||[]).some(s=>s.playerId===key&&!s.alsoPlayer))throw Error('Diese Person ist nur als Trainer zugeordnet.');t.attendance||=[];let att=t.attendance.find(a=>a.playerId===key);if(!att){att={playerId:key,late:false,note:''};t.attendance.push(att);}att.status=value||null;if(value!=='present')att.late=false;});
      }
      const playerId=event.target.dataset.fridayPosition;if(playerId){const position=event.target.value;if(position&&!normalize(position))return;save(t=>{t.fridayIndividual||={};t.fridayIndividual.positions||={};if(position)t.fridayIndividual.positions[playerId]=position;else delete t.fridayIndividual.positions[playerId];});}
      const control=event.target,data=control.dataset,value=control.value;
      if(control.matches('[data-friday-duration]')){const n=Number(value);if(!Number.isInteger(n)||n<45||n>180){root.querySelector('[data-friday-save]').textContent='Bitte eine ganze Dauer von 45 bis 180 Minuten wählen.';return;}save(t=>session(t).durationMinutes=n);}
      if(control.matches('[data-friday-courts]')&&['1','2'].includes(value))save(t=>session(t).courts=Number(value));
      if(control.matches('[data-friday-combination]')&&BT.fridaySessionPlan.combinations[value])save(t=>session(t).combination=value);
      const present=(t,id)=>{const member=assess(t,BT.storage.getPlayers()).members.find(m=>m.id===id);if(!member)throw Error('Spieler ist nicht mehr anwesend. Bitte die Anwesenheiten prüfen.');return member;};
      if(['techniqueGroups','combinationGroups'].includes(data.fridayGroup)&&(!value||/^[1-9]$/.test(value)))save(t=>{present(t,data.player);const config=session(t);config[data.fridayGroup]||={};if(value)config[data.fridayGroup][data.player]=Number(value);else delete config[data.fridayGroup][data.player];});
      if(data.fridayReturn&&/^[0-2]$/.test(value))save(t=>{present(t,data.fridayReturn);const config=session(t);config.returnSets||={};config.returnSets[data.fridayReturn]=Number(value);});
      if(data.fridayFocus)save(t=>{present(t,data.fridayFocus);const config=session(t);config.focusNotes||={};config.focusNotes[data.fridayFocus]=value.trim().slice(0,240);});
      if(data.fridaySolo&&/^[0-2]$/.test(data.setIndex))save(t=>{
        const member=present(t,data.fridaySolo),config=session(t),chosen=(BT.fridayPositionExercises||[]).find(r=>r.id===value&&r.primaryPosition===member.position&&r.playersMin===1)||individualOptions.find(r=>r.id===value&&r.playerId===member.id)||config.importedExercises?.[value]||Array.from({length:3},(_,index)=>BT.fridaySessionPlan.exercise(member,index,{...config,soloSets:{}},0)).find(r=>r.id===value);
        if(!chosen||chosen.playerId&&chosen.playerId!==member.id)throw Error('Übung ist für diesen Spieler nicht verfügbar.');
        config.soloSets||={};config.soloSets[member.id]||=Array.from({length:3},(_,index)=>BT.fridaySessionPlan.exercise(member,index,config,Number(t.fridayIndividual?.rotation)||0).id);
        config.soloSets[member.id][Number(data.setIndex)]=value;
        if(chosen.source==='individual'){config.importedExercises||={};config.importedExercises[value]={...(config.importedExercises[value]||chosen)};}
        const used=new Set(Object.values(config.soloSets).flat());for(const id of Object.keys(config.importedExercises||{}))if(!used.has(id))delete config.importedExercises[id];
      });
      if(data.fridayRequirement&&/^[0-2]$/.test(data.setIndex)&&value==='1')save(t=>{present(t,data.fridayRequirement);const config=session(t),id=config.soloSets?.[data.fridayRequirement]?.[Number(data.setIndex)],row=config.importedExercises?.[id];if(!row||row.playerId!==data.fridayRequirement)throw Error('Übernommenes Set nicht gefunden.');row.playersMin=Number(value);});
    });
    root.addEventListener('click',async event=>{
      if(event.target.closest('[data-friday-auto-groups]'))save(t=>{const config=session(t);delete config.techniqueGroups;delete config.combinationGroups;});
      if(event.target.closest('[data-friday-load-individual]')){
        if(busy||!active()||!writable())return;busy=true;root.querySelectorAll('select,button,input').forEach(c=>c.disabled=true);
        const status=()=>root.querySelector('[data-friday-import-status]');status().textContent='Individuelle Pläne werden geladen …';
        try{if(typeof BT.api?.getIndividualOverview!=='function')throw Error('Individualpläne sind hier gerade nicht erreichbar. Die vorhandenen Solo-Sets bleiben verfügbar.');const data=await BT.api.getIndividualOverview();if(!active()||!writable())return;individualOptions=BT.fridaySessionPlan.individualChoices(data,assess(BT.storage.getTraining(id),BT.storage.getPlayers()));draw();status().textContent=individualOptions.length?individualOptions.length+' Übungen aus zugeordneten Individualplänen stehen in „Meine Übung“ zur Auswahl. Beim Übernehmen den Spielerbedarf bestätigen. Bestehende Solo-Sets bleiben bis zur Auswahl erhalten.':'Keine Übungen mit eindeutiger Spielerzuordnung gefunden. Die vorhandenen Solo-Sets bleiben bestehen.';}
        catch(error){if(active())status().textContent=error.message||'Individualpläne konnten nicht geladen werden.';}
        finally{busy=false;if(active())root.querySelectorAll('select,button,input').forEach(c=>c.disabled=!writable());}
      }
    });
    function draw(){
      const current=BT.storage.getTraining(id);if(!current)return;const report=assess(current,BT.storage.getPlayers()),host=root.querySelector('[data-friday-assignments]');
      root.querySelectorAll('[data-friday-attendance]').forEach(c=>c.value=(current.attendance||[]).find(a=>a.playerId===c.dataset.fridayAttendance)?.status||'');
      host.innerHTML='<h3>2. Trainingsform & Positionsaufgaben</h3><p class="friday-mode" data-friday-mode="'+report.mode+'"><strong>'+report.count+' anwesende Spieler</strong> · '+(report.mode==='pending'?'Anwesenheiten erfassen':report.mode==='team'?'Reguläres Mannschaftstraining ab 10 Spielern':'Freitag individual aktiv')+'</p>'+(report.pending?'<p>'+report.pending+' Teilnahmen noch offen; diese zählen bisher nicht als anwesend.</p>':'');
      if(report.mode==='pending')return;
      if(report.mode==='team'){host.insertAdjacentHTML('beforeend','<p>Die Positionsaufgaben für kleine Gruppen sind bei 10 oder mehr Anwesenden deaktiviert.</p><a class="btn primary" href="#/training/'+encodeURIComponent(id)+'/plan">Regulären Trainingsplan öffnen</a>');return;}
      const plan=BT.fridaySessionPlan.build(current,report);
      host.insertAdjacentHTML('beforeend',BT.fridaySessionPlan.html(plan,{editable:writable(),choices:individualOptions}));
    }
    draw();
  }
  return {render,renderEntry,assess,isFriday,positions,normalize,url,calendar};
})();
