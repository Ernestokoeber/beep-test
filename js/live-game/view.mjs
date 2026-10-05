import {actions,effectiveEvents,duration} from './core.mjs';
import {gamePositionLabel,normalizeGamePosition,sortRosterByGamePosition} from '../basketball-positions.mjs';
export const formatTime=ms=>{const sec=Math.ceil(Math.max(0,ms)/1000);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');};
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const button=(text,fn)=>{const n=el('button',text);n.type='button';n.addEventListener('click',fn);return n;};
const field=(parent,label,type,value)=>{const l=el('label',label),i=el('input');i.type=type;i.value=value??'';l.append(i);parent.append(l);return i;};
const select=(parent,label,items,value)=>{const l=el('label',label),s=el('select');for(const [v,t]of items){const o=el('option',t);o.value=v;s.append(o);}s.value=value;l.append(s);parent.append(l);return s;};
const parseTime=value=>{const m=/^(\d{1,2}):([0-5]\d)$/.exec(value.trim());if(!m)throw Error('Zeit als MM:SS eingeben, z. B. 08:30.');return (+m[1]*60 + +m[2])*1000;};
const playerPosition=p=>normalizeGamePosition(p.gamePosition===undefined?p.position:p.gamePosition);
const sortedPlayers=players=>sortRosterByGamePosition(players.map(p=>({...p,gamePosition:playerPosition(p)})));
const playerLabel=p=>gamePositionLabel(playerPosition(p))+' · '+(p.jerseyNumber==null?'Ohne Nummer':'#'+p.jerseyNumber)+' · '+p.name;
const observationLabels={paint:'Paint / Drive','open-three':'Offener Dreier',oreb:'Offensiv-Rebound','free-throw-pressure':'Freiwurfdruck'};
const defenseLabels={man:'Mannverteidigung · Grundlagen',zone212:'Zone 2-1-2',zone23:'Zone 2-3',zone32:'Zone 3-2'};
const actionGroups=[
  ['Treffer & Fehlwürfe',['ft-made','ft-missed','two-made','two-missed','three-made','three-missed']],
  ['Rebound & Zusammenspiel',['oreb','dreb','assist']],
  ['Defense',['steal','block']],
  ['Ballverlust & Foul',['turnover','foul']]
];
const eventLabel=e=>e.kind==='opponent-score'?`Gegner${e.payload.opponentPlayerName?' · '+e.payload.opponentPlayerName:''} +${e.payload.points}`:e.kind==='score-coverage'?(e.payload.complete?'Punkteverlauf bestätigt':'Punkteverlauf unvollständig'):e.kind==='starting-five'?'Starting Five geändert':e.kind==='opponent-observation'?'Gegner: '+(observationLabels[e.payload.type]||e.payload.type):e.kind==='defense-change'?'Defense: '+(defenseLabels[e.payload.defense]||e.payload.defense):(actions[e.payload.action]||e.kind);
const opponentCandidates=session=>{
  const plan=session?.gameplan?.opponentPlan,list=[...(plan?.topScorers||[]),...(plan?.bestShooters||[])],seen=new Set(),result=[];
  for(const item of list){const name=String(item?.name||'').trim(),id=String(item?.id||'').trim(),key=id||name.toLocaleLowerCase('de-DE');if(!name||seen.has(key))continue;seen.add(key);result.push({id,name,key});if(result.length===6)break;}
  return result;
};
function jerseyField(parent,player){const n=field(parent,'Trikotnummer für dieses Spiel','text',player?.jerseyNumber??'');n.inputMode='numeric';n.maxLength=2;n.pattern='[0-9]{1,2}';return n;}

export function mountLiveView(container,controller){
  container.classList.add('live-game');
  let chosen=null,opponentChosen=null,mode=null,signature='',current,correctionMode=false,inFlight=false,lastCapture='';
  const status=el('p','','live-status');status.setAttribute('role','status');
  const header=el('header',undefined,'live-clock'),clockText=el('strong',''),periodText=el('span','');
  const start=button('Uhr starten',()=>toggleClock());
  header.append(periodText,clockText,start);
  const body=el('div'),panel=el('section',undefined,'live-panel'),capture=el('p','','live-capture-feedback');capture.setAttribute('role','status');capture.hidden=true;
  const actionOverlay=el('div',undefined,'live-action-overlay');actionOverlay.hidden=true;
  const actionSheet=el('section',undefined,'live-action-sheet');actionSheet.setAttribute('role','dialog');actionSheet.setAttribute('aria-modal','true');actionSheet.setAttribute('aria-label','Spieleraktion auswählen');actionOverlay.append(actionSheet);
  actionOverlay.addEventListener('click',event=>{if(event.target===actionOverlay)closeActionMenu();});
  container.append(header,status,capture,body,panel,actionOverlay);
  function showError(e){status.textContent=e.message;status.setAttribute('role','alert');}
  async function send(command){if(inFlight)return {ok:false};inFlight=true;try{const result=await controller.dispatch(command);if(result.ok){mode=null;panel.replaceChildren();}return result;}finally{inFlight=false;}}
  function showCapture(text){lastCapture=text;capture.textContent='Erfasst: '+text;capture.hidden=false;}
  function closeActionMenu(){chosen=null;actionOverlay.hidden=true;actionSheet.replaceChildren();}
  function openActionMenu(playerId){
    const player=current?.stats?.players?.[playerId];if(!player)return;
    chosen=playerId;actionSheet.replaceChildren();
    const head=el('header',undefined,'live-action-sheet-head'),title=el('div');title.append(el('small','AKTION FÜR'),el('h2',playerLabel(player)));
    const close=button('Schließen',closeActionMenu);close.setAttribute('aria-label','Aktionsmenü schließen');head.append(title,close);actionSheet.append(head);
    for(const [label,ids] of actionGroups){const group=el('section',undefined,'live-action-group');group.append(el('h3',label));const grid=el('div',undefined,'live-action-options');
      for(const id of ids){const action=button(actions[id],async()=>{const result=await send({kind:'stat',payload:{playerId,action:id}});if(result.ok){showCapture(player.name+' · '+actions[id]);closeActionMenu();}});action.dataset.liveAction=id;grid.append(action);}group.append(grid);actionSheet.append(group);}
    actionOverlay.hidden=false;actionSheet.querySelector('button[data-live-action]')?.focus();
  }
  function form(title){mode=title;panel.replaceChildren(el('h3',title));const f=el('form');panel.append(f);f.append(button('Abbrechen',()=>{mode=null;panel.replaceChildren();}));return f;}
  function submit(f,text,fn){const b=el('button',text);b.type='submit';f.append(b);f.addEventListener('submit',async e=>{e.preventDefault();if(b.disabled)return;b.disabled=true;try{await fn();}catch(error){showError(error);}finally{b.disabled=false;}});queueMicrotask(()=>f.querySelector('input,select,button')?.focus());}
  function checks(f,title,players,selected=[]){const group=el('fieldset');group.append(el('legend',title));f.append(group);const fields=sortedPlayers(players).map(p=>{const i=field(group,playerLabel(p),'checkbox',p.id);i.checked=selected.includes(p.id);return i;});return ()=>fields.filter(i=>i.checked).map(i=>i.value);}
  function toggleClock(){
    if(current.clock.running)return send({kind:'clock-pause'});
    const firstStart=!effectiveEvents(current.session).some(event=>event.kind==='clock-start');
    if(!firstStart)return send({kind:'clock-start'});
    const f=form('Spiel wirklich starten?');f.append(el('p','Mit dem ersten Start wird das Spiel verbindlich begonnen. Kader und Starting Five können danach nicht mehr verändert werden. Prüfe Verletzungen, Ausfälle und Aufstellung jetzt noch einmal.'));
    submit(f,'Spiel verbindlich starten',()=>send({kind:'clock-start'}));
  }
  function setup(s){
    body.replaceChildren(el('h2','Spieltagskader'),el('p','Eigene Mannschaft auswählen, anschließend genau fünf Starter markieren.'),el('p','Für Plus/Minus alle Treffer beider Teams erfassen. Die Trikotnummer gilt nur für dieses Spiel.'));
    const f=el('form');body.append(f);const rows=[];
    for(const p of sortedPlayers(s.roster)){const row=el('div',undefined,'live-roster-row');const active=field(row,gamePositionLabel(p.gamePosition)+' · '+p.name,'checkbox',p.id);active.checked=true;
      const starter=field(row,'Startet','checkbox',p.id);starter.dataset.starter='';const jersey=jerseyField(row,p);jersey.dataset.jerseyPlayer=p.id;active.addEventListener('change',()=>{jersey.disabled=!active.checked;starter.disabled=!active.checked;if(!active.checked)starter.checked=false;});rows.push({p,active,starter,jersey});f.append(row);}
    const periods=field(f,'Reguläre Abschnitte','number',4);periods.min='1';periods.max='12';
    const minutes=field(f,'Minuten je Abschnitt','number',10);minutes.min='1';minutes.max='60';
    const overtime=field(f,'Minuten je Verlängerung','number',5);overtime.min='1';overtime.max='60';
    submit(f,'Erfassung starten',()=>send({kind:'setup',payload:{roster:rows.filter(r=>r.active.checked).map(r=>({id:r.p.id,name:r.p.name,jerseyNumber:r.jersey.value.trim()||null,gamePosition:r.p.gamePosition})),startingFive:rows.filter(r=>r.starter.checked).map(r=>r.p.id),config:{periods:+periods.value,periodMs:+minutes.value*60000,overtimeMs:+overtime.value*60000}}}));
  }
  async function substitutions(){
    if(current.clock.running){const r=await send({kind:'clock-pause'});if(!r.ok)return;}
    const outgoing=new Set(),incoming=new Set(),roster=sortedPlayers(current.roster),onCourt=roster.filter(p=>current.lineups.onCourt.includes(p.id)),bench=roster.filter(p=>p.gameStatus!=='dnp'&&!current.lineups.onCourt.includes(p.id));
    function choice(player,selected,dataName,onChange,canAdd=()=>true){const b=button(playerLabel(player),()=>{if(selected.has(player.id))selected.delete(player.id);else if(canAdd())selected.add(player.id);b.setAttribute('aria-pressed',String(selected.has(player.id)));onChange?.();});b.dataset[dataName]=player.id;b.setAttribute('aria-pressed',String(selected.has(player.id)));return b;}
    function sheetHead(kicker,title,onClose=closeActionMenu){const head=el('header',undefined,'live-action-sheet-head'),copy=el('div');copy.append(el('small',kicker),el('h2',title));const close=button('Schließen',onClose);close.setAttribute('aria-label','Wechselmenü schließen');head.append(copy,close);return head;}
    function chooseOutgoing(){
      actionSheet.setAttribute('aria-label','Auszuwechselnde Spieler auswählen');actionSheet.replaceChildren(sheetHead('WECHSEL · SCHRITT 1 VON 2','Wer geht raus?'));
      actionSheet.append(el('p','Einen oder mehrere der fünf Spieler auswählen.','live-sheet-hint'));
      const grid=el('div',undefined,'live-substitution-players'),next=button('Weiter',chooseIncoming);next.dataset.action='substitution-next';next.disabled=outgoing.size===0;
      const refresh=()=>{next.disabled=outgoing.size===0;};for(const player of onCourt)grid.append(choice(player,outgoing,'subOut',refresh));
      const actionsRow=el('div',undefined,'live-sheet-actions');actionsRow.append(next);actionSheet.append(grid,actionsRow);actionOverlay.hidden=false;
    }
    function chooseIncoming(){
      incoming.clear();actionSheet.setAttribute('aria-label','Einzuwechselnde Spieler auswählen');actionSheet.replaceChildren(sheetHead('WECHSEL · SCHRITT 2 VON 2','Wer kommt rein?'));
      const hint=el('p',`${outgoing.size} Spieler ausgewählt · genauso viele Bankspieler auswählen.`,'live-sheet-hint'),grid=el('div',undefined,'live-substitution-players');
      const back=button('Zurück',chooseOutgoing),finish=button('Fertig',async()=>{const result=await send({kind:'substitution',payload:{out:[...outgoing],in:[...incoming],allowShortHanded:false}});if(result.ok){showCapture(`${outgoing.size}er-Wechsel übernommen`);closeActionMenu();}});finish.dataset.action='substitution-finish';finish.disabled=true;
      const refresh=()=>{finish.disabled=incoming.size!==outgoing.size;hint.textContent=`${outgoing.size} raus · ${incoming.size} rein${incoming.size===outgoing.size?' · bereit zum Übernehmen':''}`;};
      for(const player of bench)grid.append(choice(player,incoming,'subIn',refresh,()=>incoming.size<outgoing.size));
      if(!bench.length)grid.append(el('p','Keine verfügbaren Bankspieler.','live-warning'));
      const actionsRow=el('div',undefined,'live-sheet-actions');actionsRow.append(back,finish);actionSheet.append(hint,grid,actionsRow);
    }
    chooseOutgoing();
  }
  function startingFiveChange(){
    const f=form('Starting Five ändern');
    f.append(el('p','Bis zum ersten Start der Spieluhr kannst du genau fünf nominierte Spieler auswählen. Danach wird die Aufstellung für Einsatzzeit und Plus/Minus gesperrt.'));
    const selected=checks(f,'Starting Five',current.roster.filter(p=>p.gameStatus!=='dnp'),current.lineups.onCourt);
    for(const input of f.querySelectorAll('input[type="checkbox"]'))input.dataset.startingFivePlayer=input.value;
    submit(f,'Starting Five übernehmen',()=>send({kind:'starting-five',payload:{playerIds:selected()}}));
  }
  function clockCorrection(){const f=form('Uhr korrigieren');f.append(el('p','Uhr zuerst anhalten. Bei betroffenen Wechseln die Zeiten im Korrekturprotokoll gemeinsam ändern.'));
    const t=field(f,'Restzeit (MM:SS)','text',formatTime(current.clock.remainingMs));
    submit(f,'Restzeit übernehmen',()=>send({kind:'clock-correction',payload:{toRemainingMs:parseTime(t.value)}}));}
  function confirmCommand(title,description,kind,payload={}){const f=form(title);f.append(el('p',description));submit(f,title,()=>send({kind,payload}));}
  function confirmScore(finishing){
    const f=form(finishing?'Spiel abschließen':'Punkteverlauf bestätigen');
    f.append(el('p',finishing?'Die Uhr wird angehalten. Ohne Bestätigung bleibt Plus/Minus vorläufig.':'Bestätige nur, wenn sämtliche Treffer und Wechsel korrekt erfasst sind. Der Endstand allein reicht nicht.'));
    const complete=field(f,'Gesamten Punkteverlauf beider Teams erfasst','checkbox','yes');complete.dataset.scoreComplete='';
    submit(f,finishing?'Abschluss speichern':'Bestätigung speichern',()=>send(finishing?{kind:'finish',payload:{scoreComplete:complete.checked}}:{kind:'score-coverage',payload:{complete:complete.checked}}));
  }
  function rosterCorrection(){const f=form('Kader ergänzen oder Namen korrigieren');
    f.append(el('p','Bestehende Spieler bleiben für frühere Aktionen erhalten. Zum Umbenennen vorhandenen Spieler auswählen.'));
    const who=select(f,'Spieler',[['new','Neuer Spieler'],...current.roster.map(p=>[p.id,playerLabel(p)])],'new');
    const name=field(f,'Name','text','');name.required=true;name.maxLength=100;
    const jersey=jerseyField(f);
    who.addEventListener('change',()=>{const p=current.roster.find(p=>p.id===who.value);name.value=p?.name||'';jersey.value=p?.jerseyNumber??'';});
    submit(f,'Kaderkorrektur speichern',()=>send({kind:'roster',payload:{players:[{id:who.value==='new'?crypto.randomUUID():who.value,name:name.value.trim(),jerseyNumber:jersey.value.trim()||null}]}}));}
  function corrections(){
    const f=form('Protokoll korrigieren');f.append(el('p','Nur geänderte Zeilen werden gemeinsam gespeichert. Ungültige Folgeaktionen werden nicht automatisch umgebucht.'));
    const changes=[];
    for(const e of effectiveEvents(current.session)){
      if(['roster','period-start','starting-five'].includes(e.kind))continue;
      const row=el('fieldset');row.id='live-event-'+e.id;row.append(el('legend','#'+e.seq+' · '+eventLabel(e)+' · Abschnitt '+e.period));
      const t=field(row,'Restzeit (MM:SS)','text',formatTime(e.remainingMs));
      const remove=field(row,'Aktion rückgängig machen','checkbox','yes');let payload=()=>e.payload;
      if(e.kind==='stat'){
        const p=select(row,'Spieler',current.roster.map(p=>[p.id,playerLabel(p)]),e.payload.playerId);
        const a=select(row,'Aktion',Object.entries(actions),e.payload.action);
        payload=()=>({playerId:p.value,action:a.value});
      }else if(e.kind==='opponent-score'){
        const points=select(row,'Gegnerpunkte',[[1,'1 Punkt'],[2,'2 Punkte'],[3,'3 Punkte']],e.payload.points);
        const candidates=opponentCandidates(current.session),currentPlayer=e.payload.opponentPlayerName?{id:e.payload.opponentPlayerId||'',name:e.payload.opponentPlayerName,key:e.payload.opponentPlayerId||'event'}:null;
        if(currentPlayer&&!candidates.some(item=>item.id&&item.id===currentPlayer.id||item.name===currentPlayer.name))candidates.push(currentPlayer);
        const scorer=select(row,'Gegnerischer Werfer',[['','Nicht zugeordnet'],...candidates.map((item,index)=>[String(index),item.name])],currentPlayer?String(candidates.findIndex(item=>item.id&&item.id===currentPlayer.id||item.name===currentPlayer.name)):'');
        payload=()=>{const player=candidates[+scorer.value];return {points:+points.value,...(scorer.value!==''&&player?{...(player.id?{opponentPlayerId:player.id}:{}),opponentPlayerName:player.name}:{})};};
      }else if(e.kind==='score-coverage'){
        const complete=field(row,'Punkteverlauf vollständig','checkbox','yes');complete.checked=e.payload.complete;payload=()=>({complete:complete.checked});
      }else if(e.kind==='opponent-observation'){
        const type=select(row,'Beobachtung',Object.entries(observationLabels),e.payload.type);payload=()=>({type:type.value});
      }else if(e.kind==='defense-change'){
        const defense=select(row,'Defense',Object.entries(defenseLabels),e.payload.defense);payload=()=>({defense:defense.value});
      }else if(e.kind==='substitution'){
        const out=checks(row,'Ausgewechselt',current.roster,e.payload.out),incoming=checks(row,'Eingewechselt',current.roster.filter(p=>p.gameStatus!=='dnp'),e.payload.in);
        const short=field(row,'Unterzahl bestätigen','checkbox','yes');short.checked=!!e.payload.allowShortHanded;
        payload=()=>({out:out(),in:incoming(),allowShortHanded:short.checked});
      }else if(e.kind==='clock-correction'){
        const target=field(row,'Korrigierte Restzeit','text',formatTime(e.payload.toRemainingMs));payload=()=>({toRemainingMs:parseTime(target.value)});
      }
      const originalTime=t.value;
      changes.push(()=>{if(remove.checked)return {targetId:e.id,patch:null};const p=payload();
        if(t.value===originalTime&&JSON.stringify(p)===JSON.stringify(e.payload))return null;
        return {targetId:e.id,patch:{remainingMs:t.value===originalTime?e.remainingMs:parseTime(t.value),payload:p}};});f.append(row);
    }
    submit(f,'Korrekturen gemeinsam speichern',()=>{const patches=changes.map(fn=>fn()).filter(Boolean);if(!patches.length)throw Error('Keine Änderung ausgewählt.');return send({kind:'amend',payload:{changes:patches}});});
  }
  function render(s){
    current=s;header.hidden=!s.session;periodText.textContent=s.clock?'Abschnitt '+s.clock.period+' · Eigene '+s.stats.points+(s.session.schemaVersion>=2?' : Gegner '+s.boxscore.opponentPoints:' Punkte')+' · erfasst':'';
    clockText.textContent=s.clock?formatTime(s.clock.remainingMs):'';
    start.textContent=s.clock?.running?'Uhr anhalten':'Uhr starten';start.disabled=s.busy||s.readOnly||s.needsTakeover||s.clock?.ended;
    const gameplayStarted=!!s.session&&effectiveEvents(s.session).some(event=>['clock-start','stat','opponent-score','substitution','period-start','finish'].includes(event.kind));
    document.body.classList.toggle('live-game-active',gameplayStarted&&!s.clock?.ended&&!s.readOnly&&!s.needsTakeover);
    status.textContent=s.error||s.syncError||(s.clock?.needsCorrection?'Gerätezeit geändert: Restzeit über „Uhr korrigieren“ abgleichen.':s.busy?'Wird lokal gespeichert …':s.status==='synced'?'Lokal gesichert und synchronisiert.':'Lokal gesichert · Synchronisierung ausstehend.');
    const key=JSON.stringify([s.live,s.readOnly,s.needsTakeover]);
    if(key===signature){body.querySelectorAll('button').forEach(b=>{b.disabled=!!s.busy;});actionSheet.querySelectorAll('button[data-live-action]').forEach(b=>{b.disabled=!!s.busy;});return;}signature=key;
    body.replaceChildren();
    if(!s.live){if(s.readOnly)body.append(el('p','Für Live-Erfassung mit einem Trainerkonto anmelden.'));else setup(s);return;}
    if(!s.session){body.append(el('h2','Mehrere Erfassungen vorhanden'),el('p','Eine Sitzung zur Auswertung auswählen. Andere Protokolle bleiben erhalten.'));
      s.live.sessions.forEach((x,i)=>body.append(button('Erfassung '+(i+1)+' · '+x.events.length+' Aktionen',()=>confirmCommand('Diese Erfassung auswählen','Diese Auswahl bestimmt die Live-Auswertung.','select-session',{id:x.id}))));return;}
    if(s.readOnly){body.append(el('p','Lesender Zugriff. Keine Eingabe möglich.'));return;}
    if(s.needsTakeover){body.append(button('Erfassung auf diesem Gerät übernehmen',()=>confirmCommand('Erfassung übernehmen','Am bisherigen Gerät zuerst synchronisieren und die Erfassung schließen. Es wird eine fortsetzbare Kopie angelegt; die alte Sitzung bleibt erhalten.','takeover')));return;}
    if(!s.clock.ended&&!gameplayStarted){body.append(el('h2','Spiel noch nicht gestartet'),el('p','Prüfe Live-Kader, Trikotnummern und Starting Five. Erst der bestätigte erste Uhrstart schaltet Statistik, Gegnerpunkte und Wechsel frei.'));if(s.session.schemaVersion===1)body.append(el('p','Alte Erfassung: Gegnerpunkte und Plus/Minus sind hier nicht verfügbar. Neue Spiele unterstützen den vollständigen Punkteverlauf.','live-warning'));if(s.session.schemaVersion>=3)body.append(button('Starting Five ändern',startingFiveChange));return;}
    if(s.clock.ended){body.append(el('h2','Spiel abgeschlossen'));body.append(button(correctionMode?'Korrekturmodus schließen':'Korrekturmodus öffnen',()=>{correctionMode=!correctionMode;signature='';render(current);}));if(!correctionMode)return;}
    if(!s.clock.ended){
      const startingFiveOpen=s.session.schemaVersion>=3&&!effectiveEvents(s.session).some(e=>['clock-start','stat','opponent-score','substitution','period-start','finish'].includes(e.kind));
      if(s.session.schemaVersion===1)body.append(el('p','Alte Erfassung: Gegnerpunkte und Plus/Minus sind hier nicht verfügbar. Neue Spiele unterstützen den vollständigen Punkteverlauf.','live-warning'));
      else {
        const opponent=el('section',undefined,'live-opponent');opponent.append(el('h2','Gegnerpunkte'));
        const candidates=opponentCandidates(s.session);
        if(candidates.length){const title=el('p','Werfer optional zuordnen','live-opponent-player-title'),players=el('div',undefined,'live-opponent-players');
          const unassigned=button('Ohne Zuordnung',()=>{opponentChosen=null;signature='';render(current);});unassigned.setAttribute('aria-pressed',String(!opponentChosen));players.append(unassigned);
          for(const player of candidates){const b=button(player.name,()=>{opponentChosen=player.key;signature='';render(current);});b.dataset.opponentPlayer=player.key;b.setAttribute('aria-pressed',String(opponentChosen===player.key));players.append(b);}opponent.append(title,players);
        }else opponentChosen=null;
        const buttons=el('div',undefined,'live-opponent-buttons');
        for(const points of [1,2,3]){const b=button('Gegner +'+points,async()=>{const player=candidates.find(item=>item.key===opponentChosen),payload={points,...(player?{...(player.id?{opponentPlayerId:player.id}:{}),opponentPlayerName:player.name}:{})},result=await send({kind:'opponent-score',payload});if(result.ok){showCapture(`Gegner · +${points}`);opponentChosen=null;signature='';render(current);}});b.disabled=s.busy;buttons.append(b);}
        opponent.append(buttons);body.append(opponent);
      }
      body.append(el('h2','Spieler antippen'));body.append(el('p','Danach öffnet sich das Aktionsmenü direkt auf dem Bildschirm.','live-player-hint'));const players=el('div',undefined,'live-players');
      if(!s.lineups.onCourt.includes(chosen))closeActionMenu();
      for(const player of sortedPlayers(s.roster.filter(p=>s.lineups.onCourt.includes(p.id)))){const id=player.id,p=s.stats.players[id],label=playerLabel(player),b=button(label+' · '+p.points+' P · '+p.fouls+' F',()=>openActionMenu(id));b.dataset.player=id;b.setAttribute('aria-label',label+' · '+p.points+' Punkte · '+p.fouls+' Fouls · Aktionen öffnen');players.append(b);}body.append(players);
      if(Object.values(s.stats.players).some(p=>p.fouls>=5))body.append(el('p','Foulgrenze erreicht: Aufstellung prüfen. Kein automatischer Wechsel.','live-warning'));
      const controls=el('div',undefined,'live-controls');controls.append(button(startingFiveOpen?'Starting Five ändern':s.clock.running?'Uhr anhalten und wechseln':'Wechsel erfassen',startingFiveOpen?startingFiveChange:substitutions),button('Letzte Aktion rückgängig',async()=>{const result=await send({kind:'undo-last'});if(result.ok)showCapture('letzte Aktion rückgängig gemacht');}),button('Uhr korrigieren',clockCorrection),button('Nächster Abschnitt',()=>confirmCommand('Nächsten Abschnitt vorbereiten',s.clock.period>=s.session.config.periods?'Eine Verlängerung vorbereiten? Uhr muss bei 0:00 stehen.':'Uhr muss bei 0:00 stehen. Der nächste Abschnitt startet pausiert.','period-start')),button('Spiel abschließen',()=>s.session.schemaVersion>=2?confirmScore(true):confirmCommand('Spiel abschließen','Die Uhr wird angehalten. Danach sind nur noch ausdrückliche Korrekturen möglich.','finish')));body.append(controls);
    }
    if(s.session.schemaVersion<3)body.append(button('Kader korrigieren',rosterCorrection));
    body.append(button('Protokoll korrigieren',corrections));
    if(s.clock.ended&&s.session.schemaVersion>=2){body.append(el('p',s.boxscore.plusMinusComplete?'Punkteverlauf vom Coach bestätigt.':'Plus/Minus ist vorläufig: Punkteverlauf prüfen.'),button('Punkteverlauf bestätigen',()=>confirmScore(false)));}
    const history=el('details');history.append(el('summary','Aktionsprotokoll'));const list=el('ol');
    for(const e of effectiveEvents(s.session).slice().reverse()){const item=el('li','#'+e.seq+' · '+e.period+'/'+formatTime(e.remainingMs)+' · '+(s.roster.find(p=>p.id===e.payload.playerId)?.name||'')+' '+eventLabel(e));item.title=e.id;list.append(item);}history.append(list);body.append(history);
  }
  const unsubscribe=controller.subscribe(render);
  return()=>{unsubscribe();document.body.classList.remove('live-game-active');container.replaceChildren();};
}
