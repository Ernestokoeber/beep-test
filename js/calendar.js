window.BT=window.BT || {};

BT.calendar=(()=>{
  const {escapeHTML:esc,todayISO,formatDate}=BT.util;
  let root=null,timer=null;
  const localDate=d=>String(d.getFullYear()).padStart(4,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value || ''))return false;const date=new Date(value+'T12:00:00');return !Number.isNaN(date.getTime())&&localDate(date)===value;}
  const validMonth=value=>/^\d{4}-\d{2}$/.test(value || '')&&validDate(value+'-01');
  function shiftMonth(month,delta){if(!validMonth(month))month=todayISO().slice(0,7);const date=new Date(month+'-01T12:00:00');date.setMonth(date.getMonth()+delta);return localDate(date).slice(0,7);}
  const canWrite=()=>!['viewer','player'].includes(BT.sync?.getState?.().user?.role);
  const state=()=>BT.navigation?.getState() || {};
  const remember=patch=>BT.navigation?.setState(patch);
  const url=(month,kind='all',query='')=>'#/schedule?'+new URLSearchParams({month,kind,...(query?{q:query}:{})});
  const taskLink=(href,title,detail='')=>'<a class="calendar-task" href="'+esc(href)+'"><span><strong>'+esc(title)+'</strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</span><span aria-hidden="true">›</span></a>';
  function buildModel(month,kind,query){
    const today=todayISO(),events=[];
    for(const t of BT.storage.getTrainings()){
      if(!validDate(t.date))continue;
      const cancelled=t.cancelled||['cancelled','abgesagt'].includes(t.status),completed=!cancelled&&(t.endedAt||t.status==='completed'||t.liveSession?.status==='completed'||t.date<today);
      const active=!cancelled&&!completed&&t.date===today&&t.liveSession?.status==='active';
      events.push({id:t.id,kind:'training',date:t.date,time:t.startTime || '',title:t.note || t.plan?.summary || 'Teamtraining',place:t.location || t.place || '',team:t.team || '',href:'#/training/'+encodeURIComponent(t.id),
        status:cancelled?'cancelled':completed?'completed':active?'active':'planned',label:cancelled?'Abgesagt':completed?'Abgeschlossen':active?'Durchführung geöffnet':'Geplant'});
    }
    for(const g of BT.storage.getGames()){
      if(!validDate(g.date))continue;const s=BT.games.statusFor(g);
      events.push({id:g.id,kind:'game',date:g.date,time:g.time || '',title:(g.home || 'Heimteam')+' – '+(g.away || 'Gastteam'),place:g.location || g.venue || g.hall || '',team:g.team || '',href:'#/games/'+encodeURIComponent(g.id),status:s.cancelled?'cancelled':s.completed?'completed':s.status==='live'?'active':'planned',label:s.label});
    }
    const search=String(query || '').trim().toLocaleLowerCase('de');
    const filtered=events.filter(e=>e.date.startsWith(month)&&(!['training','game'].includes(kind)||e.kind===kind))
      .filter(e=>[e.title,e.place,e.team,e.date,formatDate(e.date),e.label].join(' ').toLocaleLowerCase('de').includes(search))
      .sort((a,b)=>(a.date+(a.time || '99:99')).localeCompare(b.date+(b.time || '99:99'))||(a.kind+a.id).localeCompare(b.kind+b.id));
    const groups=[];
    for(const event of filtered){event.timeLabel=event.time ? event.time+' Uhr' : 'Uhrzeit offen';let group=groups.at(-1);if(group?.date!==event.date){group={date:event.date,events:[]};groups.push(group);}group.events.push(event);}
    return {month,events:filtered,groups};
  }
  function build(month=todayISO().slice(0,7),kind='all',query=''){return BT.storage.withReadCache ? BT.storage.withReadCache(()=>buildModel(month,kind,query)) : buildModel(month,kind,query);}
  function context(){const hash=location.hash || '#/schedule',params=new URLSearchParams(hash.split('?')[1] || ''),saved=state(),month=params.get('month') || saved.calendarMonth;return {hash,month:validMonth(month)?month:todayISO().slice(0,7),kind:saved.calendarKind ?? params.get('kind') ?? 'all',query:saved.calendarQuery ?? params.get('q') ?? ''};}
  function eventCard(e){
    const team=({herren:'Herren',u18:'U18'})[e.team] || e.team;
    return '<a class="calendar-event calendar-'+e.status+'" data-calendar-event="'+esc(e.kind+':'+e.id)+'" href="'+e.href+'"><span class="calendar-event-head"><span>'+esc((e.kind==='training'?'Training':'Spiel')+(team?' · '+team:''))+'</span><small>'+esc(e.label)+'</small></span><strong>'+esc(e.title)+'</strong><span class="calendar-event-meta">'+esc(e.timeLabel)+(e.place?' · '+esc(e.place):'')+'</span><span class="calendar-event-open">'+(e.kind==='training'?'Training öffnen':'Spiel öffnen')+' <span aria-hidden="true">→</span></span></a>';
  }
  function createAgenda(){
    const ctx=context(),node=document.createElement('section');node.className='view calendar-page';node.dataset.calendarPage='agenda';node.dataset.calendarRoute=ctx.hash;
    const monthName=new Date(ctx.month+'-01T12:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    node.innerHTML='<header class="calendar-heading"><h2 tabindex="-1">Kalender</h2><p>Training und Spiel. Dein Monat im Überblick.</p></header><nav class="calendar-tabs" aria-label="Kalender und Saisonplanung"><a aria-current="page" href="#/schedule">Termine</a><a href="#/schedule/planning">Saisonplanung</a></nav><div class="calendar-month"><button type="button" data-month-step="-1" aria-label="Vorheriger Monat">‹</button><label><span>Monat</span><input type="month" data-calendar-month value="'+esc(ctx.month)+'" aria-label="Monat auswählen"></label><button type="button" data-month-step="1" aria-label="Nächster Monat">›</button></div><button type="button" class="btn small calendar-current" data-calendar-current>Dieser Monat</button><div class="calendar-tools"><label>Terminart<select data-calendar-kind><option value="all">Training und Spiele</option><option value="training">Nur Trainings</option><option value="game">Nur Spiele</option></select></label><label>Termine suchen<input type="search" data-calendar-search placeholder="Team, Ort oder Schwerpunkt" value="'+esc(ctx.query)+'"></label></div><p class="calendar-count" data-calendar-count role="status"></p><div data-calendar-days></div><nav class="calendar-actions" aria-label="Terminplanung">'+(canWrite()?taskLink('#/training/new','Training planen')+taskLink('#/games/new','Spiel anlegen'):'')+taskLink('#/schedule/planning','Saisonplanung öffnen','Trainingszeiten, Saisonplan, Teamkonzept und Import')+'</nav>';
    const monthInput=node.querySelector('[data-calendar-month]'),kind=node.querySelector('[data-calendar-kind]'),search=node.querySelector('[data-calendar-search]');kind.value=['training','game'].includes(ctx.kind)?ctx.kind:'all';
    function draw(){
      const data=build(ctx.month,kind.value,search.value);remember({calendarMonth:ctx.month,calendarKind:kind.value,calendarQuery:search.value});
      node.querySelector('[data-calendar-count]').textContent=monthName+' · '+data.events.length+(data.events.length===1?' Termin':' Termine');
      node.querySelector('[data-calendar-days]').innerHTML=data.groups.length ? data.groups.map(g=>'<section class="calendar-day" data-calendar-date="'+g.date+'"><h3>'+esc(new Date(g.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'}))+(g.date===todayISO()?' <span>Heute</span>':'')+'</h3><div class="calendar-day-events">'+g.events.map(eventCard).join('')+'</div></section>').join('') : '<div class="calendar-empty"><h3>'+ (search.value.trim()?'Keine passenden Termine':'Noch keine Termine in diesem Monat')+'</h3><p>'+(search.value.trim()?'Passe Suche oder Terminart an.':'Angelegte Trainings und Spiele erscheinen hier. Reguläre Trainingszeiten findest du in der Saisonplanung.')+'</p></div>';
    }
    const changeMonth=month=>{if(!validMonth(month))return;const destination=url(month,kind.value,search.value);BT.navigation?.replace ? BT.navigation.replace(destination) : location.hash=destination;};
    monthInput.addEventListener('change',()=>changeMonth(monthInput.value));node.querySelectorAll('[data-month-step]').forEach(b=>b.addEventListener('click',()=>changeMonth(shiftMonth(ctx.month,Number(b.dataset.monthStep)))));
    node.querySelector('[data-calendar-current]').addEventListener('click',()=>changeMonth(todayISO().slice(0,7)));
    search.addEventListener('input',draw);kind.addEventListener('change',draw);draw();return node;
  }
  const planningTitles={regular:'Reguläre Trainingszeiten',upcoming:'Regelmäßige Terminvorschläge',season:'Saisonplan', 'team-concept':'Teamkonzept',import:'Trainingsplan importieren'};
  function controls(node){return [...node.querySelectorAll('input[data-role],textarea[data-role],select[data-role],input[data-strategy-defense],input[data-strategy-tactic]')].filter(element=>!element.closest('[hidden]')).map(element=>({element,key:element.dataset.role || (element.dataset.strategyDefense?'defense:'+element.dataset.strategyDefense:'tactic:'+element.dataset.strategyTactic)}));}
  function expose(node,chosen){for(const child of node.children){if(child===chosen){child.hidden=false;continue;}if(child.contains(chosen)){child.hidden=false;child.classList.remove('mobile-extra-section');expose(child,chosen);}else child.hidden=true;}}
  function createPlanning(pane){
    const node=document.createElement('section');node.className='view calendar-page calendar-planning';node.dataset.calendarPage=pane || 'planning';node.dataset.calendarRoute=location.hash;
    node.innerHTML='<header class="calendar-heading"><h2 tabindex="-1">'+esc(planningTitles[pane] || 'Saisonplanung')+'</h2><p>Ein klarer Rahmen für deine Mannschaft.</p></header>';
    if(!planningTitles[pane]){node.innerHTML+='<nav class="calendar-tasks">'+taskLink('#/schedule/regular','Reguläre Trainingszeiten','Wochentage, Beginn und Kalenderexport')+taskLink('#/schedule/upcoming','Regelmäßige Terminvorschläge','Nächste Trainings mit einem Tipp anlegen oder öffnen')+taskLink('#/schedule/season','Saisonplan','Termine bis Saisonende prüfen und bestehende KI-Planung nutzen')+taskLink('#/schedule/team-concept','Teamkonzept','Offense, Defense und aktive Taktiken')+taskLink('#/schedule/import','Trainingsplan importieren','Bestehenden Plan aus PDF übernehmen')+taskLink('#/games/settings','Spielplanquelle','Offiziellen Spielplan konfigurieren und synchronisieren')+taskLink('#/schedule','Zum Kalender','Gespeicherte Trainings und Spiele')+'</nav>';return node;}
    const legacy=document.createElement('div');legacy.className='calendar-planner-frame';node.append(legacy);
    const draft=state().draft || {};
    BT.schedule.render(legacy,{pane,draft});
    const base=legacy.firstElementChild;
    const chosen=pane==='upcoming' ? base.querySelector('[data-role="regular-preview"]') : pane==='regular' ? base.querySelector('[data-role="weekdays"]').closest('.mobile-extra-section') : pane==='team-concept' ? base.querySelector('[data-role="team-strategy-card"]') : pane==='season' ? base.querySelector('.season-ai-panel') : base.querySelector('[data-action="upload-pdf"]').closest('.mobile-extra-section');
    expose(base,chosen);chosen.classList.remove('mobile-extra-section');
    if(pane==='season')chosen.querySelector('[data-role="team-strategy-card"]').hidden=true;
    if(pane==='team-concept'){const status=base.querySelector('[data-role="season-ai-status"]');chosen.append(status);status.hidden=false;}
    base.querySelectorAll('.mobile-extra-section').forEach(el=>el.classList.remove('mobile-extra-section'));
    for(const {element,key} of controls(chosen)){const value=draft.fields?.[key];if(value!==undefined){if(element.type==='checkbox')element.checked=Boolean(value);else element.value=value;}}
    const saveDraft=()=>remember({draft:{fields:Object.fromEntries(controls(chosen).map(({element,key})=>[key,element.type==='checkbox'?element.checked:element.value])),regularDays:[...base.querySelectorAll('.wd-btn.active')].map(b=>b.dataset.key)}});
    chosen.addEventListener('input',saveDraft);chosen.addEventListener('change',saveDraft);chosen.addEventListener('click',e=>{if(e.target.closest('.wd-btn'))saveDraft();});
    if(!canWrite())chosen.querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=true);
    return node;
  }
  function cleanup(){clearInterval(timer);timer=null;root=null;window.removeEventListener('bt-sync-change',refresh);document.removeEventListener('visibilitychange',visible);}
  function visible(){if(!document.hidden)refresh();}
  function render(target){cleanup();const pane=(location.hash.split('?')[0].split('/')[2] || '');root=pane?createPlanning(pane):createAgenda();target.append(root);if(!pane){timer=setInterval(visible,60000);window.addEventListener('bt-sync-change',refresh);document.addEventListener('visibilitychange',visible);}}
  function refresh(){
    if(!root?.isConnected || root.dataset.calendarPage!=='agenda')return;
    const next=createAgenda();if(root.innerHTML===next.innerHTML)return;
    const active=root.contains(document.activeElement)?document.activeElement:null,href=active?.getAttribute('href'),field=active?.matches('[data-calendar-search]')?'[data-calendar-search]':active?.matches('[data-calendar-kind]')?'[data-calendar-kind]':active?.matches('[data-calendar-month]')?'[data-calendar-month]':null;
    const selection=field==='[data-calendar-search]'?[active.selectionStart,active.selectionEnd]:null;
    root.replaceWith(next);root=next;const focus=field?root.querySelector(field):href?[...root.querySelectorAll('a')].find(a=>a.getAttribute('href')===href):null;
    (focus || (active?root.querySelector('h2'):null))?.focus({preventScroll:true});if(selection&&focus)focus.setSelectionRange(...selection);
  }
  return {render,cleanup,refresh,build,validDate,validMonth,shiftMonth};
})();
