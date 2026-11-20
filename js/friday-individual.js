window.BT = window.BT || {};
BT.fridayIndividual = (() => {
  const route = '#/friday-individual';
  const positions = [
    ['pg','Point Guard','Ballführung, Tempowechsel und Spielentscheidungen'],
    ['sg','Shooting Guard','Freilaufen, Wurfvorbereitung und Anschlussaktionen'],
    ['sf','Small Forward','Flügelangriff, Cuts und vielseitige Abschlüsse'],
    ['pf','Power Forward','Face-up, Short Roll und Verbindungen nach außen'],
    ['c','Center','Post-Moves, Fußarbeit und weiche Korbabschlüsse']
  ];
  const tasks = ['Technikaufbau','Verteidigung lesen','Konter finden','Anschluss verbinden','Spielanwendung'];
  const esc = value => BT.util.escapeHTML(String(value ?? ''));
  const rows = () => BT.fridayPositionExercises || [];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de');
  const roleLabel = position => positions.find(p=>p[0]===position)?.[1] || '';
  const listURL = position => route + (position ? '?position='+position : '');
  const detailURL = id => route+'/move/'+encodeURIComponent(id);
  const section = (title, body) => '<section class="friday-guide-section"><h3>'+title+'</h3>'+body+'</section>';
  const para = value => '<p>'+esc(value)+'</p>';
  const bullets = values => '<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
  const numbered = values => '<ol>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ol>';
  function filter(query={}) {
    const words = normalize(query.search).split(/\s+/).filter(Boolean);
    return rows().filter(row => (!query.position || row.primaryPosition===query.position)
      && (!query.task || row.task===query.task)
      && (!query.category || row.category===query.category)
      && (!query.players || row.playersMin<=Number(query.players))
      && (!query.level || row.level===query.level)
      && words.every(word=>normalize([row.name,row.code,row.goal,row.setup,row.learningTask,...row.aliases,...row.tags,...row.technicalSteps,...row.commonMistakes].join(' ')).includes(word)));
  }
  function shell(target, title, page) {
    const root=document.createElement('section');root.className='view friday-individual library-page';root.dataset.fridayPage=page;
    root.innerHTML='<header class="friday-heading"><span class="section-kicker">Positionsentwicklung am Freitag</span><h2>'+esc(title)+'</h2></header>';
    target.replaceChildren(root);return root;
  }
  function renderDetail(target, id) {
    const row=rows().find(r=>r.id===id);
    if(!row) {
      const root=shell(target,'Übung nicht gefunden','missing');
      root.insertAdjacentHTML('beforeend','<p>Diese Übung ist hier nicht verfügbar.</p><a class="btn" href="'+route+'">Zu Freitag individual</a>');return;
    }
    const root=shell(target,row.familyName,'detail');
    root.insertAdjacentHTML('beforeend','<nav class="friday-breadcrumbs" aria-label="Freitag individual"><a href="'+route+'">Freitag individual</a><span aria-hidden="true">›</span><a href="'+listURL(row.primaryPosition)+'">'+esc(roleLabel(row.primaryPosition))+'</a></nav>'
      +'<p class="friday-task">'+esc(row.code)+' · '+esc(row.task)+'</p>'
      +'<p class="friday-lead">'+esc(row.goal.split(' Lernaufgabe: ')[0])+'</p>'
      +'<dl class="library-facts"><div><dt>Position</dt><dd>'+esc(roleLabel(row.primaryPosition))+'</dd></div><div><dt>Dauer</dt><dd>'+row.minutes+' Minuten</dd></div><div><dt>Organisation</dt><dd>'+row.playersMin+' Spieler insgesamt · 0 zusätzliche Helfer</dd></div><div><dt>Niveau</dt><dd>'+esc(row.level)+'</dd></div><div><dt>Material</dt><dd>'+esc(row.equipment.join(', '))+'</dd></div></dl>'
      +section('Deine Lernaufgabe',para(row.learningTask))
      +section('Aufbau',para(row.setup))
      +section('So funktioniert der Grundmove',numbered(row.technicalSteps))
      +section('So läuft diese Übung',numbered(row.steps))
      +section('Verteidigung lesen',para(row.decisionCue))
      +section('Coaching-Punkte',bullets(row.coachingPoints))
      +section('Häufige Fehler',bullets(row.commonMistakes))
      +section('Umfang & Pausen',para(row.repetitions))
      +section('Daran erkennst du Fortschritt',para(row.successIndicator))
      +section('Einfacher',para(row.easier))
      +section('Schwieriger',para(row.harder))
      +section('Belastung am Freitag',para(row.fridayLoad)));
    if(row.sourceVideo)root.insertAdjacentHTML('beforeend',section('Video zum Grundmove','<p><a target="_blank" rel="noopener noreferrer" href="'+row.sourceVideo.url+'">'+esc(row.sourceVideo.label)+'</a> · '+esc(row.sourceVideo.segment)+'</p><p>Die Lernaufgabe ist eine eigene CourtHub-Ausarbeitung zur gezeigten Grundbewegung.</p>'));
    const siblings=rows().filter(r=>r.familyId===row.familyId && r.id!==row.id);
    root.insertAdjacentHTML('beforeend',section('Diesen Move weiterentwickeln','<nav class="friday-task-links">'+siblings.map(r=>'<a href="'+detailURL(r.id)+'">'+esc(r.task)+'</a>').join('')+'</nav>')+'<a class="btn" href="'+listURL(row.primaryPosition)+'">Alle 100 Übungen für '+esc(roleLabel(row.primaryPosition))+'</a>');
  }
  function renderList(target, queryString) {
    const params=new URLSearchParams(queryString), requested=params.get('position');
    const position=positions.some(p=>p[0]===requested) ? requested : '';
    const root=shell(target,'Freitag individual','list');
    root.insertAdjacentHTML('beforeend','<p class="friday-lead">500 Übungen zur Positionsentwicklung. Jede Position enthält 20 Moves mit jeweils fünf Lernaufgaben: Technikaufbau, Lesen der Verteidigung, Konter, Anschluss und Spielanwendung.</p><p>Wähle für einen Trainingsblock wenige passende Aufgaben. Beide Seiten werden innerhalb jeder Übung trainiert; Umfang und Schwierigkeit passt du an den Spieler an.</p>'
      +'<nav class="friday-position-grid" aria-label="Position auswählen"><a class="friday-position'+(!position?' selected':'')+'" href="'+route+'"'+(!position?' aria-current="page"':'')+'><strong>Alle Positionen</strong><span>500 Übungen · 100 Moves</span></a>'
      +positions.map(([value,label,focus])=>'<a class="friday-position'+(position===value?' selected':'')+'" href="'+listURL(value)+'"'+(position===value?' aria-current="page"':'')+'><strong>'+label+'</strong><span>100 Übungen · 20 Moves</span><small>'+focus+'</small></a>').join('')+'</nav>'
      +'<form class="friday-filters" role="search" aria-label="Freitagsübungen filtern"><label>Übung oder Move suchen<input name="search" type="search" placeholder="Zum Beispiel: Drop-Step, Fußarbeit, Hakenwurf"></label><label>Lernaufgabe<select name="task"><option value="">Alle Lernaufgaben</option>'+tasks.map(t=>'<option>'+t+'</option>').join('')+'</select></label><label>Schwerpunkt<select name="category"><option value="">Alle Schwerpunkte</option>'+[...new Set(rows().map(r=>r.category))].sort().map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></label><label>Spieler verfügbar<select name="players"><option value="">Beliebig</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'">Bis '+n+' Spieler</option>').join('')+'</select></label><label>Niveau<select name="level"><option value="">Alle Niveaus</option><option>Aufbau</option><option>Fortgeschritten</option></select></label><button class="btn" type="button" data-friday-reset>Filter zurücksetzen</button></form>'
      +'<p role="status" data-friday-count></p><div class="library-list" data-friday-list></div><button class="btn" type="button" data-friday-more hidden>Weitere Übungen anzeigen</button>'
      +'<footer class="friday-footer"><a class="btn" href="#/dashboard">Arbeitsbereiche</a><p>Eigene CourtHub-Übungssammlung. Weiterführende Grundlagen: <a href="https://about.fiba.basketball/en/wabc-documents" target="_blank" rel="noopener noreferrer">FIBA/WABC-Coachingmaterialien</a>.</p></footer>');
    const saved=BT.navigation?.getState?.().fridayQuery || {};
    const controls=Object.fromEntries(['search','task','category','players','level'].map(name=>[name,root.querySelector('[name="'+name+'"]')]));
    for(const [name,control] of Object.entries(controls))control.value=saved[name]||'';
    let limit=Math.max(20,Number(saved.limit)||20);
    function draw() {
      const query={position,...Object.fromEntries(Object.entries(controls).map(([name,control])=>[name,control.value]))};
      const matches=filter(query), shown=matches.slice(0,limit);
      BT.navigation?.setState?.({fridayQuery:{...query,limit}});
      root.querySelector('[data-friday-count]').textContent=(shown.length<matches.length?shown.length+' von ':'')+matches.length+' Übungen'+(position?' für '+roleLabel(position):'');
      root.querySelector('[data-friday-list]').innerHTML=shown.length ? shown.map(row=>'<article class="exercise-card" data-friday-item><p class="friday-task">'+esc(row.task)+' · '+esc(roleLabel(row.primaryPosition))+'</p><a class="library-link" href="'+detailURL(row.id)+'"><span><strong>'+esc(row.familyName)+'</strong><small>'+esc(row.category)+' · '+row.playersMin+' Spieler · '+row.minutes+' Min. · '+esc(row.level)+'</small></span><span aria-hidden="true">›</span></a><p>'+esc(row.learningTask)+'</p></article>').join('') : '<p class="library-empty">Keine passende Übung. Setze einzelne Filter zurück oder wähle eine andere Position.</p>';
      root.querySelector('[data-friday-more]').hidden=shown.length>=matches.length;
    }
    root.querySelector('form').onsubmit=event=>event.preventDefault();
    for(const control of Object.values(controls))control.addEventListener(control.tagName==='INPUT'?'input':'change',()=>{limit=20;draw();});
    root.querySelector('[data-friday-reset]').onclick=()=>{Object.values(controls).forEach(c=>c.value='');limit=20;draw();};
    root.querySelector('[data-friday-more]').onclick=()=>{limit+=20;draw();};
    draw();
  }
  function render(target, hash=location.hash) {
    const [path,query='']=hash.split('?');
    if(path.startsWith(route+'/move/')) {
      let id;try{id=decodeURIComponent(path.slice((route+'/move/').length));}catch{id='';}
      renderDetail(target,id);
      const training=new URLSearchParams(query).get('training');
      if(training)target.querySelector('.friday-breadcrumbs')?.insertAdjacentHTML('afterbegin','<a href="'+route+'/training/'+encodeURIComponent(training)+'">Zu den Positionsaufgaben</a>');
    } else if(path===route+'/exercises'||new URLSearchParams(query).has('position'))renderList(target,query);
    else if(path.startsWith(route+'/training/')){
      let id;try{id=decodeURIComponent(path.slice((route+'/training/').length));}catch{id='';}
      BT.fridayTraining.render(target,id);
    } else BT.fridayTraining.render(target);
  }
  return {render,filter,positions,tasks};
})();
