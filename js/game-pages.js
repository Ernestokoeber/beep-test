window.BT = window.BT || {};
BT.gamePages = (() => {
  const node = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; };
  const path = (id,page='') => '#/games/'+encodeURIComponent(id)+(page?'/'+page:'');
  const link = (text,href,primary=false) => {const a=node('a','gp-link'+(primary?' primary':''),text);a.href=href;return a;};
  const state = () => BT.navigation?.getState?.() || {};
  const remember = patch => BT.navigation?.setState?.(patch);
  const canWrite = () => !['viewer','player'].includes(BT.sync?.getState?.().user?.role);
  function header(root,title,game) {
    const h=node('header','gp-header');h.dataset.gpUi='';h.append(node('h2','',title));
    if(game){const fixture=game.home+' – '+game.away;if(title!==fixture)h.append(node('p','gp-fixture',fixture));h.append(node('p','gp-meta',BT.util.formatDate(game.date)+(game.time?' · '+game.time+' Uhr':'')));if(game.score)h.append(node('strong','gp-score',game.score));}
    root.prepend(h);return h;
  }
  function mark(root,page,hash) {root.classList.add('games-page');root.dataset.gamePage=page;root.dataset.gameRoute=hash;}
  function missing(target,hash) {const root=node('section','view games-page');mark(root,'missing',hash);header(root,'Spiel nicht verfügbar');root.append(node('p','','Dieses Spiel wurde entfernt oder ist nicht verfügbar.'),link('Zur Spielübersicht','#/games',true));target.append(root);}
  function setupForm(root,game,isNew,training) {
    const form=root.querySelector('[data-role="game-form"]');form.hidden=false;form.classList.remove('hidden');form.dataset.trainingGame=String(training);
    const draft=state().draft;
    const values=draft || {id:game?.id||'',team:game?.team||'herren',date:game?.date||BT.util.todayISO(),time:game?.time||'',home:game?.home||'TSV Lindau',away:game?.away||'',score:game?.score||''};
    for(const name of ['id','team','date','time','home','away','score'])form.elements[name].value=values[name]||'';
    const editable=canWrite()&&(isNew||BT.games.canEdit(game));
    form.querySelectorAll('input,select,button[type=submit]').forEach(input=>input.disabled=!editable);
    const save=()=>remember({draft:Object.fromEntries(new FormData(form))});
    form.oninput=save;form.onchange=save;
  }
  function frame(root,page,hash,game,playerId) {
    root.querySelectorAll(':scope > [data-gp-ui]').forEach(n=>n.remove());
    mark(root,page,hash);for(const child of root.children)child.hidden=true;
    const list=root.querySelector('[data-role="game-list"]'),detail=root.querySelector('[data-role="game-detail"]'),layout=root.querySelector('.games-layout');
    list.hidden=page!=='list';detail.hidden=['list','new','settings'].includes(page);layout.hidden=['new','settings'].includes(page);
    const titles={list:'Spiele',new:'Neues Spiel',edit:'Spieldaten bearbeiten',notes:'Notizen & Fazit',boxscore:'Spielerwerte',player:'Spielerwerte',analysis:'Videoanalyse',report:'Spielauswertung',settings:'Offizieller Spielplan'};
    header(root,page==='overview'?game.home+' – '+game.away:titles[page]||'Spiel',game);
    if(page==='list') {
      const actions=node('div','gp-actions');actions.dataset.gpUi='';
      if(canWrite())actions.append(link('+ Spiel anlegen','#/games/new',true),link('Trainingsspiel','#/games/new?training'));
      actions.append(link('Offizieller Spielplan','#/games/settings'),link('Gegner-Scouting','#/opponents'));root.querySelector('.gp-header').after(actions);
      const toolbar=root.querySelector('.games-toolbar');toolbar.hidden=false;const search=root.querySelector('[data-role="games-search"]'),team=root.querySelector('[data-role="games-team"]');
      if(!toolbar.dataset.gpReady){const saved=state().list||{};search.value=saved.search||'';team.value=saved.team||'all';
        const label=node('label','','Zeitraum');const select=node('select');select.dataset.gamesFilter='';for(const [value,text]of [['all','Alle Spiele'],['upcoming','Anstehend & live'],['played','Abgeschlossen']]){const o=node('option','',text);o.value=value;select.append(o);}select.value=saved.status||'all';label.append(select);toolbar.append(label);
        const update=()=>{remember({list:{search:search.value,team:team.value,status:select.value}});BT.games.refreshList();};search.addEventListener('input',update);team.addEventListener('change',update);select.onchange=update;toolbar.dataset.gpReady='true';BT.games.refreshList();
      }
      root.querySelector('[data-role="games-empty"]').hidden=false;return;
    }
    if(page==='settings') {
      const settings=root.querySelector('[data-role="schedule-source"]');settings.hidden=false;settings.open=true;settings.classList.remove('mobile-extra-section');
      const actions=node('div','gp-actions');actions.dataset.gpUi='';const sync=root.querySelector('[data-action="sync-games"]');actions.append(sync);root.append(actions);
      sync.disabled=!canWrite();settings.querySelectorAll('input,button').forEach(n=>n.disabled=!canWrite());root.querySelector('[data-role="games-status"]').hidden=false;return;
    }
    if(page==='new'){setupForm(root,null,true,new URLSearchParams(hash.split('?')[1]||'').has('training'));return;}
    for(const child of detail.children)child.hidden=true;
    detail.querySelector('[data-role="game-archive"]').hidden=!BT.games.statusFor(game).closed;
    if(!canWrite())detail.querySelector('[data-action="unlock-game"]')?.setAttribute('disabled','');
    if(page==='edit'){setupForm(root,game,false,false);root.insertBefore(layout,root.querySelector('[data-role="game-form"]'));layout.hidden=!BT.games.statusFor(game).closed;const actions=node('div','gp-actions');actions.dataset.gpUi='';actions.append(root.querySelector('[data-action="delete-game"]'));root.append(actions);return;}
    if(page==='overview') {
      const preparation=BT.games.preparationState(game),status=BT.games.statusFor(game),session=game.liveStats?.sessions?.find(s=>s.id===game.liveStats.selectedSessionId),hasLive=Boolean(game.liveStats?.sessions?.length);
      const summary=node('section','gp-summary');summary.dataset.gpUi='';summary.append(node('strong','',status.label),node('p','',`${preparation.roster.filter(p=>p.gameStatus!=='dnp').length} Spieler im Kader · ${preparation.startingFive.length}/5 Starter`));
      summary.append(link(hasLive?(session?'Spieltag öffnen':'Erfassung auswählen'):'Vorbereitung öffnen',path(game.id,hasLive?'live':'prepare/roster'),true));detail.append(summary);
      const links=node('nav','gp-task-list');links.dataset.gpUi='';links.setAttribute('aria-label','Dieses Spiel');
      links.append(link('Trainerbriefing','#/briefing?game='+encodeURIComponent(game.id)));
      for(const [label,destination]of [...(hasLive?[['Kader & Trainerteam','prepare/roster']]:[]),['Starting Five','prepare/lineup'],['Gameplan','prepare/gameplan'],['Notizen & Fazit','notes'],['Spielerwerte','boxscore'],['Spielauswertung','report'],['Videoanalyse','analysis'],['Spieldaten bearbeiten','edit']])links.append(link(label,path(game.id,destination)));
      detail.append(links);return;
    }
    if(page==='notes') {
      detail.querySelector('.game-observation-grid').hidden=false;
      const actions=node('div','gp-actions');actions.dataset.gpUi='';actions.append(root.querySelector('[data-action="share-game"]'));if(canWrite())actions.append(root.querySelector('[data-action="create-training"]'));detail.append(actions);return;
    }
    if(page==='analysis') {
      const atlas=detail.querySelector('.atlas-panel');atlas.hidden=false;atlas.classList.remove('mobile-extra-section');
      const actions=node('div','gp-actions');actions.dataset.gpUi='';actions.append(root.querySelector('[data-action="import-atlas"]'),root.querySelector('[data-action="import-published-report"]'));actions.querySelectorAll('button').forEach(b=>{b.disabled=!BT.games.canEdit(game);b.classList.remove('mobile-extra-action');});detail.append(actions);return;
    }
    if(page==='report') {
      const card=detail.querySelector('.game-preparation-card');card.hidden=false;for(const child of card.children)child.hidden=true;card.querySelector('[data-role="live-game-host"]').hidden=false;BT.games.showLiveReport(game.id,detail,true);
      if(canWrite()){
        const actions=node('div','gp-actions');actions.dataset.gpUi='';
        const importReport=root.querySelector('[data-action="import-published-report"]');
        importReport.disabled=!BT.games.canEdit(game);importReport.classList.remove('mobile-extra-action');actions.append(importReport);detail.querySelector('[data-role="game-archive"]').after(actions);
      }
      const exports=detail.querySelector('[data-role="video-stats-export-host"]');exports.hidden=false;return;
    }
    if(page==='boxscore'||page==='player') {
      const table=detail.querySelector('.game-boxscore'),rows=[...table.querySelectorAll('tbody tr')];
      if(page==='boxscore') {
        const links=node('nav','gp-task-list');links.dataset.gpUi='';links.setAttribute('aria-label','Spielerwerte öffnen');
        for(const row of rows){const name=row.querySelector('td a')?.textContent||'Spieler',a=link(name,path(game.id,'player/'+encodeURIComponent(row.dataset.playerId)));a.dataset.gamePlayerLink='';links.append(a);}
        if(!rows.length)links.append(node('p','','Noch keine Spieler im Kader. Lege Spieler im Team an und nominiere den Spieltagskader.'));detail.append(links);return;
      }
      const selected=rows.find(row=>row.dataset.playerId===playerId);
      if(!selected){const p=node('p','','Dieser Spieler ist nicht im verfügbaren Kader.');p.dataset.gpUi='';detail.append(p);return;}
      root.querySelector('.gp-header h2').textContent=selected.querySelector('td a')?.textContent+' · Spielerwerte';
      const section=table.closest('.boxscore-panel');section.hidden=false;section.classList.remove('mobile-extra-section');section.classList.add('gp-player-stats');
      section.querySelector('.section-head').hidden=true;
      const names={Min:'Minuten',PTS:'Punkte',FG:'Feldwürfe · Treffer / Versuche',FT:'Freiwürfe · Treffer / Versuche',REB:'Rebounds',OREB:'Offensiv-Rebounds',DREB:'Defensiv-Rebounds','2PA':'Zweierversuche','3PA':'Dreierversuche',AST:'Assists',STL:'Ballgewinne',BLK:'Blocks',TO:'Ballverluste',PF:'Fouls','+/−':'Plus/Minus'};
      const labels=[...table.querySelectorAll('thead th')].map(th=>names[th.textContent]||th.textContent);rows.forEach(row=>row.hidden=row!==selected);
      [...selected.children].forEach((td,index)=>td.dataset.label=labels[index]);
    }
  }
  async function renderMatchday(target,hash,game,phase,training) {
    const root=node('section','view games-page');mark(root,'loading',hash);target.append(root);
    const stages={game:'setup',roster:'roster',lineup:'lineup',preparation:'gameplan',review:'confirm',live:'live'};
    const destinations={game:'prepare/setup',roster:'prepare/roster',lineup:'prepare/lineup',preparation:'prepare/gameplan',review:'prepare/confirm',live:'live'};
    const phaseTitles={game:'Spiel prüfen',roster:'Kader & Trainerteam',lineup:'Starting Five',preparation:'Gameplan',review:'Gameplan bestätigen',live:'Spiel begleiten'};
    header(root,phaseTitles[phase]||'Spieltag',game);
    if(!BT.sync?.getState?.().user?.organization?.id){mark(root,'login',hash);root.append(node('p','gp-callout','Melde dich mit deinem Trainerkonto an, um den Spieltag vorzubereiten und zu begleiten.'),link('Anmelden','#/account',true));return;}
    const host=node('div','gp-matchday-host');root.append(host);
    await BT.games.renderMatchday(host,game.id,training,{navigation:{page:phase,onNavigate:next=>{location.hash=path(game.id,destinations[next]||'prepare/roster');}},onReady:(view,controller)=>{
      if(!root.isConnected||location.hash!==hash)return;
      const s=controller.getState();
      if(s.liveState.hasLiveData&&!s.liveState.session&&phase!=='live'){BT.navigation.replace(path(game.id,'live'));return;}
      if(!s.draft.ownSide&&phase!=='game'&&!s.liveState.hasLiveData){BT.navigation.replace(path(game.id,'prepare/setup'));return;}
      if(phase==='review'&&s.stage==='roster'&&!s.liveState.hasLiveData){BT.util.toast('Vor der Freigabe zuerst Kader und fünf Starter festlegen.');BT.navigation.replace(path(game.id,'prepare/roster'));return;}
      mark(root,stages[phase],hash);view.classList.add('gp-matchday');
      if(phase==='live'&&!s.liveState.hasLiveData){const callout=node('p','gp-callout','Lege zunächst Kader, Starting Five und Gameplan fest. Die Spieluhr startet erst nach der Freigabe.');root.querySelector('.gp-header').after(callout);}
    }});
    if(root.dataset.gamePage==='loading'&&root.isConnected)mark(root,stages[phase],hash);
  }
  async function render(target,hash) {
    let parts;const [pathname,query='']=hash.split('?');try{parts=pathname.slice('#/games'.length).split('/').filter(Boolean).map(decodeURIComponent);}catch{missing(target,hash);return;}
    const [id,pane='overview',extra]=parts,game=id&&BT.storage.getGame(id);
    if(parts.length>3||(['new','settings'].includes(id)&&parts.length!==1)){missing(target,hash);return;}
    if(id&&!['new','settings'].includes(id)&&!game){missing(target,hash);return;}
    if(game&&(pane==='prepare'||pane==='matchday'||pane==='live')) {
      const phases={setup:'game',roster:'roster',lineup:'lineup',gameplan:'preparation',confirm:'review'};
      let phase=pane==='live'?'live':phases[extra]||'roster';
      if(pane==='matchday'){const p=BT.games.preparationState(game);phase=game.liveStats?'live':p.startingFive.length===5?'preparation':'roster';}
      if(pane==='prepare'&&extra&&!phases[extra]){missing(target,hash);return;}
      await renderMatchday(target,hash,game,phase,new URLSearchParams(query).has('training'));return;
    }
    const page=!id?'list':id==='new'?'new':id==='settings'?'settings':pane;
    if(!['list','new','settings','overview','notes','boxscore','player','edit','analysis','report'].includes(page)||parts.length>3){missing(target,hash);return;}
    const options={routed:true,onNew:training=>location.hash='#/games/new'+(training?'?training':''),onCancel:()=>BT.navigation.back(),onDeleted:()=>BT.navigation.replace('#/games'),
      onSaved:(saved,training)=>{remember({draft:null});BT.navigation.replace(path(saved.id,training?'prepare/roster':''));},
      filterGame:entry=>{const filter=state().list?.status||'all';return filter==='all'||(filter==='played'?BT.games.statusFor(entry).closed:!BT.games.statusFor(entry).closed);},
      onDetail:(root,current)=>frame(root,page,hash,current,extra)};
    const root=BT.games.render(target,game?.id,options);if(!game)frame(root,page,hash,game,extra);
  }
  return {render};
})();
