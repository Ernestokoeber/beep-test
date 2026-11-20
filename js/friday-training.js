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
    if(!host){host=document.createElement('section');host.dataset.fridayTrainingEntry='';host.className='friday-session-entry';(root.querySelector('[data-pane="attendance"]')||root).append(host);}
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
      const trainings=BT.storage.getTrainings().filter(t=>isFriday(t.date)).sort((a,b)=>b.date.localeCompare(a.date));
      root.innerHTML=heading('Freitag individual')+'<p>Bei 1 bis 9 anwesenden Spielern trainiert ihr mit passenden Positionsaufgaben. Ab 10 Anwesenden bleibt es beim regulären Mannschaftstraining. Trainer zählen nur mit, wenn sie auch als Spieler teilnehmen.</p><a class="btn" href="'+base+'/exercises">500 Übungskarten nach Position ansehen</a><h3>Freitagstraining öffnen</h3><nav class="friday-session-list">'+trainings.map(t=>'<a class="library-link" href="'+url(t.id)+'"><span><strong>'+esc(BT.util.formatDate(t.date))+(t.startTime?' · '+esc(t.startTime):'')+'</strong><small>'+assess(t,BT.storage.getPlayers()).count+' anwesend · '+esc(t.note||'Freitagstraining')+'</small></span><span aria-hidden="true">›</span></a>').join('')+'</nav>';
      if(!trainings.length)root.insertAdjacentHTML('beforeend','<p>Noch kein Freitagstraining vorhanden.</p>');
      if(writable()){
        const today=BT.util.todayISO(),next=new Date(today+'T12:00:00');next.setDate(next.getDate()+(5-next.getDay()+7)%7);
        const date=[next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');
        root.insertAdjacentHTML('beforeend','<form class="friday-create"><h3>Freitagstraining anlegen</h3><label>Freitag<input name="date" type="date" required value="'+date+'"></label><label>Beginn<input name="time" type="time" required value="'+esc(BT.storage.getSetting('trainingStartTime','20:15'))+'"></label><button class="btn primary" type="submit">Training öffnen oder anlegen</button><p role="status" data-friday-save></p></form>');
        root.querySelector('form').onsubmit=async event=>{
          event.preventDefault();if(!active()||!writable())return;const form=event.currentTarget,status=form.querySelector('[data-friday-save]');
          if(!isFriday(form.elements.date.value)){status.textContent='Bitte einen Freitag auswählen.';return;}
          const button=form.querySelector('button');button.disabled=true;
          try{let saved=BT.storage.getTrainings().find(t=>t.date===form.elements.date.value&&!t.endedAt&&t.status!=='completed');
            if(!saved){saved=BT.storage.upsertTraining({date:form.elements.date.value,startTime:form.elements.time.value,note:'Freitagstraining',attendance:BT.storage.attendanceForActivePlayers(form.elements.date.value),freethrows:[],shots:[],plan:{drills:[],durationMinutes:BT.storage.getSetting('trainingDurationMinutes',105),summary:''}});await BT.storage.flush();}
            if(active())location.hash=url(saved.id);
          }catch(error){if(active())status.textContent=error.message||'Speichern fehlgeschlagen.';}finally{if(active())button.disabled=false;}
        };
      }
      return;
    }
    if(!training||!isFriday(training.date)){root.innerHTML=heading('Freitagstraining nicht gefunden')+'<a class="btn" href="'+base+'">Zur Freitagsübersicht</a>';return;}
    const players=BT.storage.getPlayers(), staffIds=new Set((training.staff||[]).filter(s=>!s.alsoPlayer).map(s=>s.playerId));
    const people=players.filter(p=>!p.archived&&!staffIds.has(p.id));
    const statusOptions=[['','Offen'],['present','Anwesend'],['absent','Abwesend'],['excused','Entschuldigt'],['injured','Verletzt']];
    root.innerHTML=heading('Freitag individual')+'<p>'+esc(BT.util.formatDate(training.date))+' · '+esc(training.startTime||'')+'</p><nav class="friday-breadcrumbs"><a href="'+base+'">Freitagsübersicht</a><a href="'+base+'/exercises">500 Übungskarten</a><a href="#/training/'+encodeURIComponent(id)+'">Training & Erfassung</a></nav><section><h3>1. Anwesenheiten</h3><p>Nur „Anwesend“ zählt. Verspätete Spieler zählen mit, sobald sie als anwesend erfasst sind.</p><div class="friday-attendance">'+people.map(p=>{const att=(training.attendance||[]).find(a=>a.playerId===p.id);return '<label><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.position||p.gamePosition||'Position offen')+'</small></span><select data-friday-attendance="'+esc(p.id)+'" aria-label="Anwesenheit '+esc(p.name)+'" '+(!writable()?'disabled':'')+'>'+statusOptions.map(([v,l])=>'<option value="'+v+'"'+((att?.status||'')===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label>';}).join('')+'</div></section><p role="status" data-friday-save></p><section data-friday-assignments></section>';
    let busy=false;
    async function save(change){
      if(busy||!active()||!writable())return;busy=true;root.querySelectorAll('select,button').forEach(c=>c.disabled=true);const status=root.querySelector('[data-friday-save]');
      try{const fresh=BT.storage.getTraining(id);if(!fresh)throw Error('Training wurde inzwischen entfernt.');change(fresh);BT.storage.upsertTraining(fresh);await BT.storage.flush();if(active()){status.textContent='Gespeichert.';draw();}}
      catch(error){if(active()){status.textContent=error.message||'Speichern fehlgeschlagen.';draw();}}
      finally{busy=false;if(active())root.querySelectorAll('select,button').forEach(c=>c.disabled=!writable());}
    }
    root.addEventListener('change',event=>{
      const key=event.target.dataset.fridayAttendance;if(key){const value=event.target.value;if(!statusOptions.some(([v])=>v===value))return;
        save(t=>{if((t.staff||[]).some(s=>s.playerId===key&&!s.alsoPlayer))throw Error('Diese Person ist nur als Trainer zugeordnet.');t.attendance||=[];let att=t.attendance.find(a=>a.playerId===key);if(!att){att={playerId:key,late:false,note:''};t.attendance.push(att);}att.status=value||null;if(value!=='present')att.late=false;});
      }
      const playerId=event.target.dataset.fridayPosition;if(playerId){const position=event.target.value;if(position&&!normalize(position))return;save(t=>{t.fridayIndividual||={};t.fridayIndividual.positions||={};if(position)t.fridayIndividual.positions[playerId]=position;else delete t.fridayIndividual.positions[playerId];});}
    });
    root.addEventListener('click',event=>{if(event.target.closest('[data-friday-rotate]'))save(t=>{t.fridayIndividual||={};t.fridayIndividual.rotation=(Number(t.fridayIndividual.rotation)||0)+1;});});
    function draw(){
      const current=BT.storage.getTraining(id);if(!current)return;const report=assess(current,BT.storage.getPlayers()),host=root.querySelector('[data-friday-assignments]');
      root.querySelectorAll('[data-friday-attendance]').forEach(c=>c.value=(current.attendance||[]).find(a=>a.playerId===c.dataset.fridayAttendance)?.status||'');
      host.innerHTML='<h3>2. Trainingsform & Positionsaufgaben</h3><p class="friday-mode" data-friday-mode="'+report.mode+'"><strong>'+report.count+' anwesende Spieler</strong> · '+(report.mode==='pending'?'Anwesenheiten erfassen':report.mode==='team'?'Reguläres Mannschaftstraining ab 10 Spielern':'Freitag individual aktiv')+'</p>'+(report.pending?'<p>'+report.pending+' Teilnahmen noch offen; diese zählen bisher nicht als anwesend.</p>':'');
      if(report.mode==='pending')return;
      if(report.mode==='team'){host.insertAdjacentHTML('beforeend','<p>Die Positionsaufgaben für kleine Gruppen sind bei 10 oder mehr Anwesenden deaktiviert.</p><a class="btn primary" href="#/training/'+encodeURIComponent(id)+'/plan">Regulären Trainingsplan öffnen</a>');return;}
      host.insertAdjacentHTML('beforeend','<p>Je Spieler drei Aufgaben aus unterschiedlichen Moves. Der Mitspielerbedarf umfasst Passgeber und Verteidiger; Partner können aus der gesamten anwesenden Gruppe helfen. Körbe und Gruppen nacheinander einteilen. Die Aufgaben sind Vorschläge für einen Technikblock.</p>'+(writable()?'<button class="btn" type="button" data-friday-rotate>Andere Positionsaufgaben vorschlagen</button>':'')+'<div class="friday-player-tasks">'+report.members.map(member=>'<article class="exercise-card" data-friday-player="'+esc(member.id)+'"><h4>'+esc(member.player?.name||'Unbekanntes Spielerprofil')+'</h4><p><strong>'+esc(label(member.position))+'</strong> · '+(member.override?'Tagesrolle':member.options.length===1?'Aus Spielerprofil':'Zuordnung offen')+'</p>'+(writable()?'<label>Position für dieses Training<select data-friday-position="'+esc(member.id)+'"><option value="">Profilposition verwenden</option>'+BT.fridayIndividual.positions.map(([v,l])=>'<option value="'+v+'"'+(member.override===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label>':'')+(member.issue?'<p class="friday-issue">'+esc(member.issue)+'</p>':'')+'<ol>'+member.exercises.map(row=>'<li><a href="'+base+'/move/'+encodeURIComponent(row.id)+'?training='+encodeURIComponent(id)+'"><strong>'+esc(row.familyName)+'</strong></a><p>'+esc(row.task)+' · '+row.minutes+' Min. · '+row.playersMin+' Spieler insgesamt</p><p>'+esc(row.learningTask)+'</p><details><summary>Grundmove erklären</summary><ol>'+row.technicalSteps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><p><b>Coaching:</b> '+esc(row.coachingPoints.join(' · '))+'</p></details></li>').join('')+'</ol></article>').join('')+'</div>');
    }
    draw();
  }
  return {render,renderEntry,assess,isFriday,positions,normalize,url};
})();
