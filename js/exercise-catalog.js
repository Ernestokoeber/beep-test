window.BT = window.BT || {};

// The bundled catalog never enters a user's workspace. Plans receive independent
// snapshots; only explicitly saved copies and favorites are synchronized.
BT.exerciseCatalog = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => BT.util.escapeHTML(String(value ?? ''));
  const levels = ['Grundlagen', 'Aufbau', 'Fortgeschritten'];
  const scope = () => { const s=BT.sync?.getState?.(); return JSON.stringify([s?.user?.id,s?.user?.organization?.id || s?.user?.organizationId,s?.user?.role,s?.sessionEpoch]); };
  const writable = () => !['viewer','player'].includes(BT.sync?.getState?.().user?.role);
  const favorites = () => new Set(BT.storage.getSetting('exerciseFavorites', []));
  function all() {
    const own=BT.storage.getDrills().map(row=>({...row,builtIn:false}));
    const ids=new Set(own.map(row=>row.id));
    return [...(BT.exerciseLibraryCore || []),...(BT.exerciseCatalogSeed || []).map(row=>({...row,entryKind:'variant',reviewStatus:'review'}))].filter(row=>!ids.has(row.id)).map(row=>clone(row)).concat(own).sort((a,b)=>(a.name || '').localeCompare(b.name || '', 'de')||a.id.localeCompare(b.id));
  }
  const get = id => all().find(row=>row.id===id);
  function describe(row) {
    return [row.goal && 'Ziel: '+row.goal,row.setup && 'Aufbau: '+row.setup,
      row.steps?.length && 'Ablauf:\n'+row.steps.map((s,i)=>(i+1)+'. '+s).join('\n'),
      !row.setup && !row.steps?.length && row.description,
      row.repetitions && 'Umfang: '+row.repetitions,
      row.coachingPoints?.length && 'Coaching: '+row.coachingPoints.join(' · '),
      row.successIndicator && 'Erfolgskriterium: '+row.successIndicator,
      row.easier && 'Einfacher: '+row.easier,row.harder && 'Schwieriger: '+row.harder].filter(Boolean).join('\n\n');
  }
  function planDrill(row) {
    // No live reference to the library, private observations, or old exercise IDs.
    return {name:row.name,minutes:Number(row.minutes)||10,description:describe(row),category:row.category || '',librarySourceId:row.id};
  }
  function individualExercise(row) {
    const instruction=[row.goal && 'Ziel: '+row.goal,row.setup && 'Aufbau: '+row.setup,
      row.steps?.length ? row.steps.map((x,i)=>(i+1)+'. '+x).join('\n') : row.description,
      row.repetitions,row.easier && 'Einfacher: '+row.easier,row.harder && 'Schwieriger: '+row.harder].filter(Boolean).join('\n\n');
    return {title:row.name,duration_minutes:Number(row.minutes)||10,
      repetitions:{instruction,details:{goal:row.goal||'',setup:row.setup||'',steps:(row.steps||[]).join('\n'),reps:row.repetitions||'',equipment:(row.equipment||[]).join('\n'),level:row.level||'',easier:row.easier||'',harder:row.harder||''}},measurement_method:{instruction:row.successIndicator || ''},coaching_cues:row.coachingPoints || []};
  }
  function filter(rows, query={}) {
    const normalize=s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de');
    const words=normalize(query.search).trim().split(/\s+/).filter(Boolean), saved=favorites();
    return rows.filter(row=>{
      if(query.reviewStatus ? (row.reviewStatus||'draft')!==query.reviewStatus : row.reviewStatus==='archived')return false;
      if(query.entryKind && row.entryKind!==query.entryKind)return false;
      if(query.helpers!==undefined&&query.helpers!==''&&(row.helpersMin===undefined||row.helpersMin===null||row.helpersMin>Number(query.helpers)))return false;
      const tags=Array.isArray(query.tags)?query.tags:String(query.tags||'').split(',').filter(Boolean);
      if(tags.length && !(query.tagMode==='all'?tags.every(t=>row.tags?.includes(t)):tags.some(t=>row.tags?.includes(t))))return false;
      if(query.category && row.category!==query.category && !(query.category==='Nicht zugeordnet' && !row.category)) return false;
      if(query.source==='own' && row.builtIn || query.source==='catalog' && !row.builtIn || query.source==='favorites' && !saved.has(row.id)) return false;
      if(query.level && row.level!==query.level) return false;
      if(query.minutes && (!row.minutes || row.minutes>Number(query.minutes))) return false;
      if(query.equipment==='no-basket' && (!Array.isArray(row.equipment) || row.equipment.includes('Korb'))) return false;
      if(query.equipment && query.equipment!=='no-basket' && !row.equipment?.includes(query.equipment)) return false;
      if(query.players) {
        if(!row.playersMin) return false;
        const [min,max]=query.players.split('-').map(Number), upper=max || min;
        if(row.playersMin>upper || (row.playersMax || row.playersMin)<min) return false;
      }
      const haystack=normalize([row.name,row.code,row.category,row.goal,row.description,row.setup,...(row.tags||[]),...(row.aliases||[]),...(row.steps || []),...(row.coachingPoints || []),...(row.equipment || [])].join(' '));
      return words.every(word=>haystack.includes(word));
    });
  }
  const playerLabel = row => row.playersMin ? (row.playersMin===row.playersMax ? row.playersMin : row.playersMin+'–'+row.playersMax)+' Spieler' : 'Spielerzahl offen';
  const meta = row => [row.category,playerLabel(row),row.level,row.minutes ? row.minutes+' Min.' : 'Dauer offen'].filter(Boolean).join(' · ');
  async function saveCopy(row) {
    if(!writable()) throw Error('Zum Speichern ist ein Trainerkonto erforderlich.');
    const copy=clone(row); delete copy.id; delete copy.builtIn; delete copy.createdAt; delete copy.updatedAt;
    copy.description=[row.setup && 'Aufbau: '+row.setup,row.steps?.length?row.steps.map((s,i)=>(i+1)+'. '+s).join('\n'):row.description].filter(Boolean).join('\n\n');
    copy.setup='';copy.steps=[];copy.librarySourceId=row.id;copy.sourceVersion=row.version||1;copy.version=1;copy.reviewStatus='draft';
    const saved=BT.storage.upsertDrill(copy); await BT.storage.flush(); return saved;
  }
  function detailHTML(row) {
    const status={draft:'Entwurf',review:'Fachliche Prüfung offen',approved:'Vom Trainer freigegeben',archived:'Archiviert'};
    return '<p class="muted">'+esc(row.builtIn?'CourtHub-Grundkatalog':'Eigene Übung')+' · '+esc(status[row.reviewStatus]||'Freigabe offen')+' · Version '+Number(row.version||1)+'</p><dl class="library-facts"><div><dt>Umfang</dt><dd>'+esc(meta(row))+'</dd></div><div><dt>Zusätzliche Helfer</dt><dd>'+esc(row.helpersMin??'Nicht erfasst')+'</dd></div><div><dt>Material</dt><dd>'+esc(row.equipment?.join(', ') || 'Nicht angegeben')+'</dd></div></dl><section><h3>Ablauf & Coaching</h3><p class="library-prose">'+esc(describe(row) || 'Noch kein Ablauf hinterlegt.')+'</p></section>';
  }
  function mountBrowser(host, {onPick,initial={},remember=()=>{},onChange=()=>{}}={}) {
    const identity=scope(),route=location.hash, active=()=>host.isConnected && scope()===identity && location.hash===route;
    const rows=all(),categories=[...new Set(rows.map(r=>r.category || 'Nicht zugeordnet'))].sort((a,b)=>a.localeCompare(b,'de'));
    const options=items=>items.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');
    host.classList.add('exercise-browser');
    host.innerHTML='<div class="library-filters"><label>Suchen<input type="search" name="search" placeholder="Übung, Ziel oder Coachingpunkt"></label><label>Kategorie<select name="category">'+options([['','Alle Kategorien'],...categories.map(x=>[x,x])])+'</select></label></div><details class="exercise-filter-options"><summary>Weitere Filter</summary><div class="exercise-filter-grid"><label>Sammlung<select name="source">'+options([['','Alle Übungen'],['catalog','Grundkatalog'],['own','Eigene Übungen'],['favorites','Gemerkte Übungen']])+'</select></label><label>Spielerzahl<select name="players">'+options([['','Alle Gruppengrößen'],['1','Allein'],['2','Zu zweit'],['3-6','Kleingruppe (3–6)'],['7-20','Team (7–20)']])+'</select></label><label>Niveau<select name="level">'+options([['','Alle Niveaus'],...levels.map(x=>[x,x])])+'</select></label><label>Zeit pro Übung<select name="minutes">'+options([['','Beliebig'],['5','Bis 5 Minuten'],['10','Bis 10 Minuten'],['15','Bis 15 Minuten'],['20','Bis 20 Minuten']])+'</select></label><label>Materialbedarf<select name="equipment">'+options([['','Beliebig'],['no-basket','Ohne Korb möglich'],['Korb','Mit Korb'],['Hütchen','Mit Hütchen'],['Wand','Mit Wand']])+'</select></label><button type="button" class="btn" data-clear-filters>Filter zurücksetzen</button></div><p class="muted">Spielerzahl ohne Trainer. Eigene Übungen ohne Angaben erscheinen bei „Alle“. Dauer und Umfang sind anpassbare Startwerte.</p></details><p role="status" data-library-count></p><p role="status" data-catalog-status></p><div data-library-list class="library-list"></div><button type="button" class="btn" data-library-more hidden></button>';
    host.querySelector('.exercise-filter-grid').insertAdjacentHTML('beforeend','<label>Eintragsart<select name="entryKind"><option value="">Grundübungen und Varianten</option><option value="exercise">Eigenständige Grundübungen</option><option value="variant">Bisherige Varianten</option></select></label><label>Freigabe<select name="reviewStatus"><option value="">Alle aktiven Einträge</option><option value="draft">Entwürfe</option><option value="review">Fachliche Prüfung offen</option><option value="approved">Vom Trainer freigegeben</option><option value="archived">Archivierte Einträge</option></select></label><label>Zusätzliche Helfer<select name="helpers"><option value="">Beliebig</option><option value="0">Ohne Helfer</option><option value="1">Höchstens ein Helfer</option></select></label><label>Kompetenzen<select name="tags" multiple size="4"><option value="dribbling">Dribbling</option><option value="drive">Zug zum Korb</option><option value="decision">Entscheidungen</option><option value="footwork">Footwork</option><option value="post">Post</option><option value="passing">Passen</option><option value="shooting">Wurf</option><option value="defense">Verteidigung</option></select></label><label>Kompetenzen verknüpfen<select name="tagMode"><option value="any">Mindestens eine</option><option value="all">Alle ausgewählten</option></select></label>');
    const names=['search','category','source','players','level','minutes','equipment','entryKind','reviewStatus','helpers','tags','tagMode'],controls=Object.fromEntries(names.map(n=>[n,host.querySelector('[name="'+n+'"]')]));
    names.forEach(n=>controls[n].value=initial[n] || '');
    for(const option of controls.tags.options)option.selected=(initial.tags||[]).includes(option.value);
    controls.search.addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
    if(names.some(n=>n!=='search' && n!=='category' && initial[n])) host.querySelector('details').open=true;
    let limit=Math.max(40,Number(initial.limit)||40),busy=false;
    function draw() {
      const query=Object.fromEntries(names.map(n=>[n,n==='tags'?[...controls[n].selectedOptions].map(o=>o.value):controls[n].value])),matches=filter(rows,query),shown=matches.slice(0,limit),saved=favorites();
      remember({...query,limit}); onChange(query);
      host.querySelector('[data-library-count]').textContent=(shown.length<matches.length?shown.length+' von ':'')+matches.length+(matches.length===1?' Übung':' Übungen');
      host.querySelector('[data-library-list]').innerHTML=shown.length ? shown.map(row=>'<article class="exercise-card" data-library-item><div>'+(onPick?'<h3>'+esc(row.name)+'</h3>':'<a class="library-link" href="#/drills/'+encodeURIComponent(row.id)+'"><span><strong>'+esc(row.name)+'</strong><small>'+esc(meta(row))+'</small></span><span aria-hidden="true">›</span></a>')+(onPick?'<p class="muted">'+esc(meta(row))+'</p>':'')+'<p>'+esc(row.goal || row.description?.slice(0,160) || 'Eigene Übung')+'</p></div><div class="exercise-card-actions">'+(writable()?'<button type="button" class="btn small" data-favorite="'+esc(row.id)+'" aria-pressed="'+saved.has(row.id)+'" aria-label="'+esc(row.name)+': '+(saved.has(row.id)?'nicht mehr merken':'merken')+'">'+(saved.has(row.id)?'★ Gemerkt':'☆ Merken')+'</button>':'')+(onPick?'<button type="button" class="btn primary" data-catalog-pick="'+esc(row.id)+'">In den Plan</button>':'')+'</div>'+(onPick?'<details class="exercise-preview"><summary>Ablauf ansehen</summary>'+detailHTML(row)+'</details>':'')+'</article>').join('') : '<p class="library-empty">Keine passenden Übungen. Setze einzelne Filter zurück oder lege eine eigene Übung an.</p>';
      const more=host.querySelector('[data-library-more]'); more.hidden=shown.length>=matches.length; more.textContent='Weitere '+Math.min(40,matches.length-shown.length)+' anzeigen';
    }
    Object.values(controls).forEach(c=>c.addEventListener(c.tagName==='INPUT'?'input':'change',()=>{limit=40;draw();}));
    host.querySelector('[data-clear-filters]').onclick=()=>{Object.values(controls).forEach(c=>c.value='');limit=40;draw();};
    host.querySelector('[data-library-more]').onclick=()=>{limit+=40;draw();};
    host.addEventListener('click',async event=>{
      const button=event.target.closest('[data-favorite],[data-catalog-pick]'); if(!button || !active() || busy || !writable())return;
      const row=rows.find(r=>r.id===(button.dataset.favorite || button.dataset.catalogPick)); if(!row)return;
      busy=true;button.disabled=true;
      try {
        if(button.dataset.favorite) {const ids=favorites();if(ids.has(row.id))ids.delete(row.id);else ids.add(row.id);BT.storage.setSetting('exerciseFavorites',[...ids]);await BT.storage.flush();if(active())draw();}
        else {await onPick(clone(row));if(active())host.querySelector('[data-catalog-status]').textContent=row.name+' zum Plan hinzugefügt.';}
      }catch(error){if(active())host.querySelector('[data-catalog-status]').textContent=error.message || 'Speichern fehlgeschlagen. Bitte erneut versuchen.';}
      finally{busy=false;if(active())button.disabled=false;}
    });
    draw(); return {refresh:draw};
  }
  function openPicker(onPick) {
    const dialog=document.createElement('dialog');dialog.className='exercise-dialog';dialog.setAttribute('aria-label','Übung aus Bibliothek auswählen');
    dialog.innerHTML='<header><h2>Übung auswählen</h2><button type="button" class="btn" data-close>Schließen</button></header><div data-catalog-browser></div>';
    document.body.append(dialog);const focus=document.activeElement;
    const close=()=>{window.removeEventListener('hashchange',close);dialog.remove();focus?.focus?.();};
    dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});window.addEventListener('hashchange',close);
    mountBrowser(dialog.querySelector('[data-catalog-browser]'),{onPick:async row=>{await onPick(planDrill(row));close();}});
    dialog.showModal();dialog.querySelector('[name=search]').focus();
  }
  return {all,get,filter,describe,planDrill,individualExercise,playerLabel,meta,levels,detailHTML,mountBrowser,openPicker,saveCopy,writable,scope};
})();
