window.BT = window.BT || {};

BT.insights = (() => {
  const {escapeHTML:esc,formatDate}=BT.util;
  const labels={attendance:'Teilnahme',ft:'Freiwürfe',fg:'Feldwürfe'};
  const number=n=>Number(n).toLocaleString('de-DE',{maximumFractionDigits:1});
  const percent=n=>n===null ? '–' : number(n)+' %';
  const delta=n=>(n>0 ? '+' : '')+number(n)+' Prozentpunkte';
  let root=null,timer=null;
  function context(){
    const hash=location.hash || '#/statistics',split=hash.split('?'),params=new URLSearchParams(split[1] || '');
    let parts;try{parts=split[0].slice(2).split('/').map(decodeURIComponent);}catch{parts=[];}
    return {hash,parts,params,season:params.get('season') || BT.storage.getActiveSeason() || 'all'};
  }
  const href=(path,season,extra={})=>path+'?'+new URLSearchParams({season,...extra});
  const link=(path,title,detail='')=>'<a class="insight-row" href="'+esc(path)+'"><span><strong>'+esc(title)+'</strong>'+(detail ? '<small>'+esc(detail)+'</small>' : '')+'</span><span aria-hidden="true">›</span></a>';
  function trend(stat){return stat.comparison ? 'Zuletzt '+percent(stat.comparison.recent.pct)+' · '+delta(stat.comparison.delta) : 'Noch kein Vergleich · '+stat.series.length+' erfasste Trainings';}
  function metricCards(metrics,base,season){return '<div class="insight-metrics">'+Object.entries(labels).map(([key,title])=>{
    const s=metrics[key];
    return '<a class="insight-metric" href="'+esc(href(base+'/'+key,season))+'"><h3>'+title+'</h3><strong>'+percent(s.total.pct)+'</strong><small>'+ (s.total.denominator ? 'Gesamt · '+s.total.numerator+'/'+s.total.denominator+(key==='attendance' ? ' Teilnahmen' : ' Treffer') : 'Noch keine erfassten Werte')+'</small><span class="insight-trend">'+esc(trend(s))+'</span><span class="insight-open">Verlauf öffnen <span aria-hidden="true">→</span></span></a>';
  }).join('')+'</div>';}
  function plot(stat){
    const points=stat.series.slice(-12);if(points.length<2)return '<p class="insight-empty">Für einen Verlauf sind mindestens zwei Trainings mit Angaben nötig.</p>';
    const xy=points.map((p,i)=>[20+i*560/(points.length-1),125-110*p.numerator/p.denominator]);
    return '<figure class="insight-chart"><svg viewBox="0 0 600 150" role="img" aria-label="Quotenverlauf der letzten '+points.length+' erfassten Trainings von links nach rechts, Skala 0 bis 100 Prozent"><path class="insight-chart-grid" d="M20 15H580M20 70H580M20 125H580"/><polyline points="'+xy.map(p=>p.join(',')).join(' ')+'"/>'+xy.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4"/>').join('')+'</svg><figcaption>Letzte '+points.length+' erfasste Trainings · älteste links · Skala 0–100 %</figcaption></figure>';
  }
  function metricDetail(stat,key){
    const c=stat.comparison;
    let html='<section class="insight-detail-hero"><span>'+labels[key]+' insgesamt</span><strong>'+percent(stat.total.pct)+'</strong><p>'+ (stat.total.denominator ? stat.total.numerator+' von '+stat.total.denominator+' '+(key==='attendance' ? 'eingetragenen Teilnahmestatus anwesend' : 'Würfen getroffen') : 'Noch keine Messwerte in dieser Auswahl')+'</p></section>';
    html+=c ? '<section class="insight-comparison"><h3>'+esc(delta(c.delta))+'</h3><div><p><strong>Zuletzt '+percent(c.recent.pct)+'</strong><span>'+formatDate(c.recentPoints[0].date)+' – '+formatDate(c.recentPoints[2].date)+'</span><small>'+c.recent.numerator+'/'+c.recent.denominator+'</small></p><p><strong>Zuvor '+percent(c.previous.pct)+'</strong><span>'+formatDate(c.previousPoints[0].date)+' – '+formatDate(c.previousPoints[2].date)+'</span><small>'+c.previous.numerator+'/'+c.previous.denominator+'</small></p></div></section>' : '<p class="insight-empty">Noch kein belastbarer Vergleich. Benötigt werden sechs Trainings mit Angaben'+(key==='attendance' ? '.' : ' und mindestens zehn Wurfversuche je Vergleichsfenster.')+'</p>';
    html+='<p class="insight-method">Verglichen werden die letzten drei Trainings mit Angaben mit den drei davor. Fehlende Werte werden ausgelassen. Veränderungen sind Prozentpunkte und keine allgemeine Leistungsbewertung.</p>'+plot(stat)+'<h3>Erfasste Trainings</h3><div class="insight-list">';
    html+=stat.series.length ? stat.series.slice().reverse().map(p=>link(p.href,formatDate(p.date)+' · '+p.title,percent(p.numerator/p.denominator*100)+' · '+p.numerator+'/'+p.denominator)).join('') : '<p class="insight-empty">Noch keine Werte erfasst.</p>';
    return html+'</div>';
  }
  function playerList(model,ctx){
    const state=BT.navigation?.getState() || {};
    return '<section class="insight-players"><h3>Spielerentwicklung</h3><div class="insight-filters"><label>Spieler suchen<input type="search" data-insight-search value="'+esc(state.insightSearch ?? ctx.params.get('q') ?? '')+'" placeholder="Name oder Position"></label><label>Kader<select data-insight-roster><option value="active">Aktiver Kader</option><option value="all"'+((state.insightRoster ?? ctx.params.get('roster'))==='all'?' selected':'')+'>Mit Archiv</option></select></label></div><p data-insight-count role="status"></p><div class="insight-list" data-insight-players>'+model.players.map(row=>{
      const player=row.player,[metricName,metric]=Object.entries(row.metrics).find(([,s])=>s.comparison) || [],name=player.name || 'Spieler';
      const text=metric ? labels[metricName]+': '+trend(metric) : row.metrics.attendance.total.denominator ? percent(row.metrics.attendance.total.pct)+' Teilnahme · noch kein Vergleich' : 'Noch keine vergleichbaren Trainingsdaten';
      return '<a class="insight-row" data-insight-player="'+esc(player.id)+'" data-search="'+esc((name+' '+(player.position || '')).toLocaleLowerCase('de'))+'" data-archived="'+Boolean(player.archived)+'" href="'+esc(href('#/statistics/player/'+encodeURIComponent(player.id),ctx.season))+'"><span><strong>'+esc(name)+(player.archived ? ' · Archiv' : '')+'</strong><small>'+esc((player.position || 'Position offen')+' · '+row.goals.length+' offene Ziele')+'</small><small>'+esc(text)+'</small></span><span aria-hidden="true">›</span></a>';
    }).join('')+'</div><p class="insight-empty" data-insight-no-players hidden>Keine passenden Spieler.</p></section>';
  }
  function createPage(){
    const ctx=context(),model=BT.insightModel.build(ctx.season),parts=ctx.parts;
    const node=document.createElement('section');node.className='view insight-page';node.dataset.insightRoute=ctx.hash;
    const reports=parts[0]==='reports',page=parts.slice(1).join('/') || 'overview';node.dataset.insightPage=page;
    if((reports&&page==='full')||(!reports&&page==='rankings')){
      node.dataset.insightLegacy='true';
      if(reports){
        const id=ctx.params.get('player');
        if(id&&id!=='all'&&!BT.storage.getPlayer(id)){node.innerHTML='<h2>Spieler nicht gefunden</h2>'+link(href('#/statistics',ctx.season),'Zur Entwicklung');return node;}
        BT.reports.render(node,{seasonId:ctx.season,playerId:id || 'all'});
      }else BT.dashboard.renderStatistics(node,ctx.season);
      return node;
    }
    let title=reports ? 'Auswertung' : 'Entwicklung';
    const isPlayer=!reports&&parts[1]==='player',player=isPlayer ? model.players.find(r=>r.player.id===parts[2]) : null;
    const key=isPlayer ? parts[3] : parts[1]==='team' ? parts[2] : null;
    if(isPlayer)title=player?.player.name || 'Spieler nicht gefunden';
    else if(!reports&&parts[1]==='team')title='Teamentwicklung';
    else if(reports&&page==='trainings')title='Trainingsauswertung';
    else if(reports&&page==='games')title='Spielauswertung';
    else if(reports&&page==='players')title='Spielerentwicklung';
    if(key&&labels[key])title=labels[key]+' · '+(player?.player.name || 'Team');
    let html='<div class="insight-heading"><h2 tabindex="-1">'+esc(title)+'</h2><p>'+model.trainings.length+' abgeschlossene Trainings · '+model.games.length+(model.games.length===1 ? ' absolviertes Spiel' : ' absolvierte Spiele')+'</p></div>';
    html+='<nav class="insight-tabs" aria-label="Entwicklung und Auswertung"><a href="'+esc(href('#/statistics',ctx.season))+'"'+(!reports ? ' aria-current="page"' : '')+'>Entwicklung</a><a href="'+esc(href('#/reports',ctx.season))+'"'+(reports ? ' aria-current="page"' : '')+'>Auswertung</a></nav>';
    html+='<label class="insight-season">Saison<select data-insight-season><option value="all">Alle Saisons</option>'+[...new Set([...BT.storage.getSeasons(),...(ctx.season==='all' ? [] : [ctx.season])])].map(s=>'<option value="'+esc(s)+'"'+(s===ctx.season?' selected':'')+'>'+esc(BT.util.seasonLabel(s))+'</option>').join('')+'</select></label>';
    if(isPlayer&&!player)html+='<p class="insight-empty">Dieses Profil ist im aktuellen Team nicht vorhanden.</p>'+link(href('#/statistics',ctx.season),'Zur Entwicklung');
    else if(!reports){
      const metrics=player?.metrics || model.team,base=isPlayer ? '#/statistics/player/'+encodeURIComponent(player.player.id) : '#/statistics/team';
      if(key&&labels[key])html+=metricDetail(metrics[key],key);
      else{
        html+='<p class="insight-method">Trainingsentwicklung · Trend: letzte drei erfasste Trainings gegenüber den drei davor.</p>'+metricCards(metrics,base,ctx.season);
        if(isPlayer){
          html+='<section class="insight-goals"><h3>Aktueller Entwicklungsfokus</h3>'+(player.goals.length ? '<ul>'+player.goals.map(g=>'<li>'+esc(g.title || 'Entwicklungsziel')+'</li>').join('')+'</ul>' : '<p>Noch kein offenes Entwicklungsziel hinterlegt.</p>')+link('#/player/'+encodeURIComponent(player.player.id)+'/development','Ziele und Trainerfeedback öffnen')+'</section><nav class="insight-list">'+link('#/player/'+encodeURIComponent(player.player.id),'Spielerprofil öffnen')+link(href('#/reports/full',ctx.season,{player:player.player.id}),'Spielerbericht & Export','Trainingswerte, Spiele und Beep-Test')+'</nav>';
        }else{
          if(page==='overview')html+=playerList(model,ctx);
          html+='<nav class="insight-list insight-secondary">'+link(href('#/statistics/rankings',ctx.season),'Ranglisten und Wurfkarte','Anwesenheit, Freiwürfe, Positionen und Wurfkarte')+link(href('#/reports',ctx.season),'Auswertungen öffnen','Trainings, Spiele und vollständige Berichte')+'</nav>';
        }
      }
    }else if(page==='trainings'){
      html+='<p class="insight-method">Abgeschlossene Trainings der gewählten Saison. Ein Tipp öffnet die Auswertung dieser Einheit.</p><div class="insight-list">'+(model.trainings.length ? model.trainings.slice().reverse().map(t=>link('#/training/'+encodeURIComponent(t.id)+'/analysis',formatDate(t.date)+' · '+(t.note || t.plan?.summary || 'Teamtraining'),'Trainingsauswertung öffnen')).join('') : '<p class="insight-empty">Noch keine abgeschlossenen Trainings.</p>')+'</div>';
    }else if(page==='games'){
      html+='<p class="insight-method">Nur absolvierte Spiele. Spielwerte und Trainingswurfwerte bleiben getrennt.</p><div class="insight-list">'+(model.games.length ? model.games.map(g=>link('#/games/'+encodeURIComponent(g.id)+'/report',(g.home || 'Heimteam')+' – '+(g.away || 'Gastteam'),formatDate(g.date)+(g.score ? ' · '+g.score : ' · Ergebnis offen'))).join('') : '<p class="insight-empty">Noch keine absolvierten Spiele.</p>')+'</div>';
    }else if(page==='players')html+=playerList(model,ctx);
    else html+='<p class="insight-intro">Wähle aus, was du genauer ansehen möchtest.</p><nav class="insight-list">'+link(href('#/statistics/team',ctx.season),'Teamentwicklung','Teilnahme und Wurfquoten im Zeitverlauf')+link(href('#/reports/trainings',ctx.season),'Trainingsauswertung',model.trainings.length+' abgeschlossene Einheiten')+link(href('#/reports/games',ctx.season),'Spielauswertung',model.games.length+(model.games.length===1 ? ' absolviertes Spiel' : ' absolvierte Spiele'))+link(href('#/reports/players',ctx.season),'Spielerentwicklung','Individuelle Werte und Entwicklungsziele')+link(href('#/reports/full',ctx.season),'Vollständiger Bericht & Export','Team, Spieler, CSV und PDF')+'</nav>';
    node.innerHTML=html;
    node.querySelector('[data-insight-season]').value=ctx.season;
    node.querySelector('[data-insight-season]').addEventListener('change',e=>{
      const params=new URLSearchParams(ctx.params);params.set('season',e.target.value);BT.storage.setActiveSeason(e.target.value);
      const search=node.querySelector('[data-insight-search]'),roster=node.querySelector('[data-insight-roster]');
      if(search){params.set('q',search.value);params.set('roster',roster.value);}
      const next=ctx.hash.split('?')[0]+'?'+params;BT.navigation?.replace ? BT.navigation.replace(next) : location.hash=next;
    });
    const search=node.querySelector('[data-insight-search]'),roster=node.querySelector('[data-insight-roster]');
    if(search){
      const filter=()=>{
        const query=search.value.trim().toLocaleLowerCase('de');let count=0;
        node.querySelectorAll('[data-insight-player]').forEach(row=>{row.hidden=!(row.dataset.search.includes(query)&&(roster.value==='all'||row.dataset.archived==='false'));if(!row.hidden)count++;});
        node.querySelector('[data-insight-count]').textContent=count+' Spieler';node.querySelector('[data-insight-no-players]').hidden=count!==0;
      };
      const onInput=()=>{BT.navigation?.setState({insightSearch:search.value,insightRoster:roster.value});filter();};
      search.addEventListener('input',onInput);roster.addEventListener('change',onInput);filter();
    }
    return node;
  }
  function cachedPage(){return BT.storage.withReadCache ? BT.storage.withReadCache(createPage) : createPage();}
  function cleanup(){clearInterval(timer);timer=null;root=null;window.removeEventListener('bt-sync-change',refresh);document.removeEventListener('visibilitychange',visible);}
  function visible(){if(!document.hidden)refresh();}
  function render(target){cleanup();root=cachedPage();target.append(root);if(!root.dataset.insightLegacy){timer=setInterval(visible,60000);window.addEventListener('bt-sync-change',refresh);document.addEventListener('visibilitychange',visible);}}
  function refresh(){
    if(!root?.isConnected||root.dataset.insightLegacy)return;
    const next=cachedPage();if(root.innerHTML===next.innerHTML)return;
    const active=root.contains(document.activeElement)?document.activeElement:null,linkHref=active?.getAttribute('href'),search=active?.matches('[data-insight-search]'),selection=search ? [active.selectionStart,active.selectionEnd] : null;
    const field=active?.matches('[data-insight-season]') ? '[data-insight-season]' : active?.matches('[data-insight-roster]') ? '[data-insight-roster]' : null;
    root.replaceWith(next);root=next;
    const focus=search ? root.querySelector('[data-insight-search]') : field ? root.querySelector(field) : linkHref ? [...root.querySelectorAll('a')].find(a=>a.getAttribute('href')===linkHref) : null;
    (focus || (active ? root.querySelector('h2') : null))?.focus({preventScroll:true});if(search&&focus)focus.setSelectionRange(...selection);
  }
  return {render,refresh,cleanup};
})();
