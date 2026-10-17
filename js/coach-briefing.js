window.BT = window.BT || {};

BT.coachBriefing = (() => {
  const {escapeHTML:esc,formatDate,todayISO} = BT.util;
  const unique = lines => [...new Set(lines.map(v => String(v || '').trim()).filter(Boolean))];
  const route = (kind,id) => '#/briefing?'+kind+'='+encodeURIComponent(id);
  let root=null,timer=null;

  function gameBriefing(game) {
    const selected=game.liveStats?.sessions?.find(s=>s.id===game.liveStats.selectedSessionId);
    const sessions=game.liveStats?.sessions || [];
    const revisions=game.matchday?.revisions || [];
    const parents=new Set(revisions.flatMap(r=>r.parents || []));
    const heads=revisions.filter(r=>!parents.has(r.id));
    const sessionConflict=sessions.length>0 && !selected;
    const draftConflict=!selected?.gameplan && !sessionConflict && heads.length>1;
    const plan=selected?.gameplan || (!sessionConflict && !draftConflict ? heads[0]?.value : null) || {};
    const preparation=sessionConflict || (!selected && draftConflict) ? {roster:[],startingFive:[],staff:[]} : BT.games.preparationState(game);
    const roster=preparation.roster || [],players=roster.filter(p=>p.gameStatus!=='dnp');
    const staff=preparation.staff || plan.staff || [];
    const opponent=plan.opponentPlan,defense=opponent?.defense;
    const sections=[],cautions=[];
    const add=(key,title,lines,href,label)=>sections.push({key,title,lines:unique(lines),href,linkLabel:label});
    const base='#/games/'+encodeURIComponent(game.id);
    if(sessionConflict)cautions.push('Mehrere oder nicht ausgewählte Erfassungen: Wähle die gültige Erfassung im Spiel aus.');
    if(draftConflict)cautions.push('Mehrere Versionen der Vorbereitung: Löse den Konflikt im Spiel, bevor du den Gameplan verwendest.');
    if(!players.length)cautions.push('Spielkader noch nicht bestätigt.');
    if((preparation.startingFive || []).length!==5)cautions.push('Starting Five noch nicht vollständig festgelegt.');
    if(!plan.goals)cautions.push('Spielziele noch nicht hinterlegt.');
    if(!staff.some(s=>s.role==='coach'&&s.status==='present'))cautions.push('Anwesender Trainer noch nicht eingetragen.');
    if(game.date>=todayISO()) {
      const profiles=new Map(BT.storage.getPlayers().map(p=>[p.id,p]));
      for(const p of players) {
        const profile=profiles.get(p.id);
        if(!profile || (profile.availabilityUntil && profile.availabilityUntil<game.date) || BT.staff?.isCoachOnly({staff},p.id))continue;
        const status={limited:'eingeschränkt',injured:'verletzt',away:'abwesend'}[profile.availability];
        if(status)cautions.unshift(p.name+': '+status+(profile.availabilityNote ? ' · '+profile.availabilityNote : '')+'. Verfügbarkeit vor dem Einsatz klären.');
      }
    }
    const focus=unique([plan.goals,plan.coachingNote,defense?.startLabel ? 'Startverteidigung: '+defense.startLabel : '',...(defense?.triggers || []).map(v=>'Wechsel-Auslöser: '+v)]).slice(0,3);
    add('goals','Spielziele und Coaching', [plan.goals || 'Spielziele noch offen.',plan.coachingNote],base+'/prepare/gameplan','Gameplan öffnen');
    add('roster','Kader und Starting Five',[
      players.length+' Spieler im Kader · '+(preparation.startingFive || []).length+'/5 Starter',
      ...roster.map(p=>p.name+': '+(p.gameStatus==='dnp' ? 'setzt aus'+(p.absenceReason ? ' · '+({injured:'verletzt',ill:'krank',unavailable:'nicht verfügbar','not-selected':'nicht nominiert'})[p.absenceReason] : '') : (preparation.startingFive || []).includes(p.id) ? 'Starting Five' : 'Bank')),
      ...roster.filter(p=>p.gameStatus==='dnp'&&['injured','ill'].includes(p.absenceReason)).map(p=>p.name+': vor dem Einsatz Verfügbarkeit klären.')
    ],base+'/prepare/roster','Kader öffnen');
    add('warmup','Aufwärmen und Taktiken',[plan.warmup || 'Aufwärmen noch offen.',...(plan.tactics || []).map(t=>'Taktik: '+t.title)],base+'/prepare/gameplan','Vorbereitung öffnen');
    add('staff','Trainerteam und Aufgaben',BT.staff?.lines(staff).length ? BT.staff.lines(staff) : ['Trainerteam noch nicht zugeordnet.'],base+'/prepare/roster','Trainerteam öffnen');
    if(opponent)add('opponent','Gespeicherter Gegnerplan',[
      opponent.opponent,
      defense?.startLabel ? 'Startverteidigung: '+defense.startLabel : '',
      defense?.alternativeLabel ? 'Alternative: '+defense.alternativeLabel : '',
      ...(defense?.triggers || []).map(v=>'Wechsel-Auslöser: '+v),...(defense?.reasons || []),
      ...['gameGoals','offenseKeys','defenseKeys','warmupFocus','halftimeChecks'].flatMap(key=>(opponent.aiPlan?.[key] || [])),
      'Datenlage: '+({low:'gering',medium:'mittel',high:'hoch'}[opponent.dataQuality?.confidence] || 'nicht angegeben')
    ],base+'/prepare/gameplan','Gegnerplan öffnen');
    if(game.coachSummary || game.plan || game.postgameNotes)add('notes','Gespeicherte Spielnotizen',[game.coachSummary,game.plan,game.postgameNotes],base+'/notes','Spielnotizen öffnen');
    return {focus:focus.length ? focus : ['Für dieses Spiel sind noch keine eindeutigen Coaching-Punkte hinterlegt.'],cautions,sections,blocks:[],facts:[players.length+' Spieler im Kader',(preparation.startingFive || []).length+'/5 Starter']};
  }

  function buildModel(hash) {
    const agenda=BT.dashboard.getAgenda();
    const params=new URLSearchParams(hash.split('?')[1] || '');
    const explicit=params.has('training') || params.has('game');
    const kind=params.has('training') ? 'training' : params.has('game') ? 'game' : agenda.next?.kind;
    const id=explicit ? params.get(kind) : agenda.next?.id;
    const record=kind==='training' ? BT.storage.getTraining(id) : kind==='game' ? BT.storage.getGame(id) : null;
    const options=[];
    for(const e of [agenda.next,...agenda.today,...agenda.upcoming].filter(Boolean)) {
      if(['planned','active'].includes(e.status) && !options.some(o=>o.kind===e.kind))options.push(e);
    }
    if(!record || (params.has('training') && params.has('game')))return {kind,event:null,missing:explicit,options};
    let info,event;
    if(kind==='training') {
      const training=BT.dashboard.buildTrainingBriefing(record);
      const restrictions=training.sections.find(s=>s.title==='Teilnahme und Einschränkungen')?.lines.slice(2) || [];
      const load=training.sections.find(s=>s.title==='Belastung und Anpassungen')?.lines.filter(v=>/Ampel (Gelb|Rot)/.test(v)) || [];
      const ended=record.endedAt || record.status==='completed' || record.liveSession?.status==='completed' || record.date<todayISO();
      event={id,kind,team:record.team,date:record.date,time:record.startTime,title:record.note || 'Teamtraining',place:record.location || record.place,
        href:'#/training/'+encodeURIComponent(id),label:record.cancelled || ['cancelled','abgesagt'].includes(record.status) ? 'Abgesagt' : ended ? 'Abgeschlossen' : record.date===todayISO() && record.liveSession?.status==='active' ? 'Durchführung geöffnet' : 'Geplant'};
      info={focus:unique([record.plan?.summary,...training.blocks.flatMap(b=>b.lines.filter(v=>!/fehlen noch/.test(v)).map(v=>b.title+': '+v))]).slice(0,3),
        cautions:unique([...restrictions,...load,...training.notes.map(n=>n.text)]),sections:training.sections.map((s,i)=>({...s,key:'training-'+i})),blocks:training.blocks,
        facts:[training.present+' anwesend · '+training.open+' Status offen',training.plannedMinutes+' Min. verplant'],shareText:training.shareText};
      if(!info.focus.length)info.focus=['Coaching-Punkte und Schwerpunkt sind noch nicht hinterlegt.'];
    } else {
      const state=BT.games.statusFor(record);
      event={id,kind,team:record.team,date:record.date,time:record.time,title:(record.home || 'Heimteam')+' – '+(record.away || 'Gastteam'),place:record.location || record.venue || record.hall,
        href:'#/games/'+encodeURIComponent(id),label:state.label};
      info=gameBriefing(record);
    }
    const shareText=info.shareText || ['CourtHub · Trainerbriefing','Spiel: '+event.title,formatDate(event.date)+(event.time ? ' · '+event.time+' Uhr' : ''),
      '', 'Coaching-Fokus',...info.focus.map(v=>'• '+v),'','Vor Beginn klären',...info.cautions.map(v=>'• '+v),
      ...info.sections.flatMap(s=>['',s.title,...s.lines.map(v=>'• '+v)])].join('\n');
    return {kind,event,options,...info,shareText};
  }
  function build(hash=location.hash) {
    return BT.storage.withReadCache ? BT.storage.withReadCache(()=>buildModel(hash)) : buildModel(hash);
  }
  const list=lines=>'<ul>'+lines.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>';

  function makeRoot() {
    const node=BT.util.renderTemplate('tpl-coach-briefing'),model=build();
    node.dataset.briefingRoute=location.hash || '#/briefing';
    const host=node.querySelector('[data-role="coach-briefing"]');
    let html='<div class="briefing-page-head"><div><h2 tabindex="-1">Trainerbriefing</h2><p>Dein Fokus für den nächsten Einsatz.</p></div>'+(model.event ? '<button type="button" class="btn small" data-action="share-briefing" aria-label="Briefing teilen">Teilen</button>' : '')+'</div>';
    html+='<nav class="briefing-choices" aria-label="Briefing auswählen">'+model.options.map(e=>'<a data-briefing-choice href="'+route(e.kind,e.id)+'"'+(e.kind===model.kind&&e.id===model.event?.id ? ' aria-current="page"' : '')+'><strong>'+(e.kind==='training' ? 'Training' : 'Spiel')+'</strong><span>'+esc(formatDate(e.date)+(e.time ? ' · '+e.time : ''))+'</span></a>').join('')+'</nav>';
    if(!model.event)html+='<div class="briefing-empty"><h3>'+(model.missing ? 'Termin nicht mehr vorhanden' : 'Kein nächster Termin')+'</h3><p>'+(model.missing ? 'Wähle ein anderes Briefing oder öffne die Terminübersicht.' : 'Sobald ein Training oder Spiel geplant ist, findest du hier deinen Coaching-Fokus.')+'</p><a class="btn" href="#/training">Trainings öffnen</a><a class="btn" href="#/games">Spiele öffnen</a></div>';
    else {
      const e=model.event,team=({herren:'Herren',u18:'U18'})[e.team] || e.team;
      html+='<section class="briefing-event"><span>'+(e.kind==='training' ? 'Training' : 'Spiel')+(team ? ' · '+esc(team) : '')+' · '+esc(e.label)+'</span><h3>'+esc(e.title)+'</h3><p>'+esc(formatDate(e.date)+(e.time ? ' · '+e.time+' Uhr' : ' · Uhrzeit offen'))+'</p>'+(e.place ? '<p>'+esc(e.place)+'</p>' : '')+'<a class="btn primary" data-role="briefing-open-event" href="'+e.href+'">'+(e.kind==='training' ? 'Training öffnen' : 'Spiel öffnen')+'</a></section>';
      html+='<section class="briefing-focus"><h3>Darauf achtest du</h3>'+list(model.focus)+'</section>';
      if(model.cautions.length)html+='<section class="briefing-cautions"><h3>Vor Beginn klären</h3><ul class="coach-briefing-list">'+model.cautions.slice(0,3).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>'+(model.cautions.length>3 ? '<details class="briefing-more" data-briefing-section="cautions"><summary>'+ (model.cautions.length-3)+(model.cautions.length===4 ? ' weiterer Hinweis' : ' weitere Hinweise')+'</summary>'+list(model.cautions.slice(3))+'</details>' : '')+'</section>';
      html+='<div class="briefing-facts">'+model.facts.map(v=>'<span>'+esc(v)+'</span>').join('')+'</div><div class="coach-briefing-content" data-role="coach-briefing-content">'+model.sections.map(s=>'<details class="briefing-section" data-briefing-section="'+s.key+'"><summary>'+esc(s.title)+'</summary>'+list(s.lines)+'<a class="btn small" href="'+esc(s.href)+'">'+esc(s.linkLabel)+'</a></details>').join('');
      if(model.kind==='training')html+='<details class="briefing-section" data-briefing-section="blocks" data-role="briefing-blocks"><summary>Ablauf und Coaching-Punkte · '+model.blocks.length+' Blöcke</summary>'+(model.blocks.length ? model.blocks.map(b=>'<article class="briefing-block"><h4>'+esc(b.title)+'</h4><p>'+esc(b.meta)+'</p>'+list(b.lines)+'</article>').join('') : '<p>Noch keine Übungen geplant.</p>')+'</details>';
      html+='</div>';
    }
    host.innerHTML=html;
    host.querySelector('[data-action="share-briefing"]')?.addEventListener('click',async()=>{
      // Keep the visible appointment selected while rereading its latest content.
      const current=build(route(model.kind,model.event.id));
      if(!current.event){BT.util.toast('Termin nicht mehr vorhanden.');refresh();return;}
      if(navigator.share){try{await navigator.share({title:'Trainerbriefing',text:current.shareText});return;}catch(error){if(error.name==='AbortError')return;}}
      try{await navigator.clipboard.writeText(current.shareText);BT.util.toast('Trainerbriefing kopiert.');}
      catch{BT.util.downloadBlob('trainerbriefing-'+todayISO()+'.txt',new Blob([current.shareText],{type:'text/plain;charset=utf-8'}));}
    });
    BT.dashboard.renderPhase(node);
    return node;
  }
  function cleanup(){clearInterval(timer);timer=null;root=null;window.removeEventListener('bt-sync-change',refresh);document.removeEventListener('visibilitychange',onVisible);}
  function onVisible(){if(!document.hidden)refresh();}
  function render(target){cleanup();root=makeRoot();target.append(root);timer=setInterval(onVisible,60000);window.addEventListener('bt-sync-change',refresh);document.addEventListener('visibilitychange',onVisible);}
  function refresh(){
    if(!root?.isConnected)return;
    const next=makeRoot();
    for(const section of root.querySelectorAll('[data-briefing-section][open]'))[...next.querySelectorAll('[data-briefing-section]')].find(s=>s.dataset.briefingSection===section.dataset.briefingSection)?.setAttribute('open','');
    if(root.innerHTML===next.innerHTML)return;
    const focused=root.contains(document.activeElement) ? document.activeElement : null;
    const href=focused?.getAttribute('href'),action=focused?.dataset.action,section=focused?.closest('[data-briefing-section]')?.dataset.briefingSection;
    root.replaceWith(next);root=next;
    const target=href ? [...root.querySelectorAll('a')].find(a=>a.getAttribute('href')===href) : action ? root.querySelector('[data-action="'+action+'"]') : section ? [...root.querySelectorAll('[data-briefing-section]')].find(s=>s.dataset.briefingSection===section)?.querySelector('summary') : null;
    (target || (focused ? root.querySelector('h2') : null))?.focus({preventScroll:true});
  }
  return {render,refresh,cleanup,build};
})();
