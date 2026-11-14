window.BT=window.BT||{};
BT.individualPlanBrowser={
  mount(root,data,{open}={}){
    const esc=v=>BT.util.escapeHTML(String(v??''));
    const date=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
    const monday=v=>{const d=new Date(date(v)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
    const week=monday(new Date()),weeks=[...new Set([week,...data.sessions.map(s=>monday(s.scheduled_for))])].sort();
    const host=document.createElement('section');host.className='card individual-all-plans';
    host.innerHTML='<h3>Alle individuellen Trainingspläne</h3><div class="proposal-fields"><label>Spieler<select data-plan-player><option value="">Alle zugeordneten Spieler</option>'+data.profiles.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.account_name||(BT.storage.getPlayers()||[]).find(x=>x.id===p.player_profile_id)?.name||'Spieler')+'</option>').join('')+'</select></label><label>Woche<select data-plan-week><option value="">Alle Wochen</option>'+weeks.map(w=>'<option value="'+w+'" '+(w===week?'selected':'')+'>Ab '+w+'</option>').join('')+'</select></label><label>Status<select data-plan-state><option value="">Alle Zustände</option><option value="planned">Geplant</option><option value="in_progress">Läuft</option><option value="completed">Abgeschlossen</option><option value="cancelled">Abgesagt</option></select></label></div><p><a class="btn" href="#/drills">Übungsbibliothek öffnen</a></p><div data-all-plans></div>';
    root.querySelector('.individual-profile-grid').before(host);
    function draw(){
      const profile=host.querySelector('[data-plan-player]').value,w=host.querySelector('[data-plan-week]').value,state=host.querySelector('[data-plan-state]').value;
      const sessions=data.sessions.filter(s=>(!profile||s.individual_profile_id===profile)&&(!w||monday(s.scheduled_for)===w)&&(!state||s.status===state));
      host.querySelector('[data-all-plans]').innerHTML=sessions.length?sessions.map(s=>{
        const p=data.profiles.find(p=>p.id===s.individual_profile_id),plan=data.plans.find(p=>p.session_id===s.id&&p.individual_profile_id===s.individual_profile_id),exercises=data.exercises.filter(e=>e.plan_id===plan?.id).sort((a,b)=>a.position-b.position);
        return '<article class="proposal-plan-card"><h4>'+esc(p?.account_name||(BT.storage.getPlayers()||[]).find(x=>x.id===p?.player_profile_id)?.name||'Spieler')+' · '+esc(new Date(s.scheduled_for).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}))+'</h4><p>'+esc(plan?.title||'Noch kein gespeicherter Plan')+' · '+exercises.length+' Übungen · '+exercises.reduce((n,e)=>n+(e.measurement_method?.durationNotRecorded?0:e.duration_minutes||0),0)+' Min. · Version '+Number(plan?.version||0)+'</p><p>'+esc(plan?.objective||'')+'</p><ol>'+exercises.map(e=>'<li>'+esc(e.title)+' · '+e.duration_minutes+' Min.</li>').join('')+'</ol><button class="btn primary" type="button" data-open-plan="'+esc(s.id)+'" data-profile="'+esc(s.individual_profile_id)+'">Training ansehen und bearbeiten</button></article>';
      }).join(''):'<p>Für diese Auswahl sind keine Einheiten vorhanden. Wähle eine andere Woche oder alle Wochen.</p>';
    }
    host.querySelectorAll('select').forEach(s=>s.onchange=draw);
    host.addEventListener('click',event=>{const b=event.target.closest('[data-open-plan]');if(b)open(b.dataset.profile,b.dataset.openPlan);});draw();
  }
};
