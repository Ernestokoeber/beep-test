import {clone,canonical} from '../live-game/core.mjs';
import {buildSetup} from './flow.mjs';
import {mountMatchdayLive} from './live-shell.mjs';
import {GAME_POSITIONS,gamePositionLabel,normalizeGamePosition} from '../basketball-positions.mjs';
import {activeGamePlan,mergeAIPlan} from './opponent-plan.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const playerStatusLabels={starter:'Starting Five',bench:'Bank',dnp:'DNP – nicht eingesetzt'};
const tacticGroups=[['offense','Offense'],['defense','Defense'],['inbound','Einwurf'],['pressbreak','Pressbreak']];
const tacticUsage=t=>{const value=String(t.usage||t.category||'').toLowerCase();if(/defen|no-middle/.test(value))return'defense';if(/einwurf|inbound|baseline|sideline|blob|slob/.test(value))return'inbound';if(/press/.test(value))return'pressbreak';return'offense';};
export async function prepareMatchdayEntry(controller,defaultOwnSide,opponentPlan=null){
  const initial=controller.getState();
  if(initial.readOnly||initial.conflict||initial.liveState?.hasLiveData)return true;
  const ownSide=initial.draft.ownSide||(['home','away'].includes(defaultOwnSide)?defaultOwnSide:null);
  const next={...initial.draft,ownSide,opponentPlan:initial.draft.opponentPlan||opponentPlan||null};
  if(initial.stage==='game'&&ownSide)next.step='roster';
  if(canonical(next)===canonical(initial.draft))return true;
  const result=await controller.saveDraft(next,{parents:initial.heads});
  if(!result.ok)throw Error(result.error||controller.getState().error||'Spielvorbereitung konnte nicht geöffnet werden.');
  return true;
}
export function mountMatchdayView(container,controller,{players=()=>[],tactics=()=>[],game=null,getOpponentPlan=()=>null,requestGamePlan=async({game,opponentPlan})=>{
  const response=await window.BT.api.ai('planGame',{game,opponentPlan});return response.data;
},onOpponentFeedback=payload=>window.BT?.opponents?.recordMatchdayFeedback?.(payload),prepareRosterPdf=()=>import('./roster-pdf.mjs').then(module=>module.prepareRosterPdf()),onRosterPdf=payload=>import('./roster-pdf.mjs').then(module=>module.exportRosterPdf(payload)),onLive=(host,c)=>mountMatchdayLive(host,c,{tactics,game,onOpponentFeedback})}={}){
  container.classList.add('matchday');let stage='',draft,parents,read=()=>draft,dirty=false,saving=false,revision=0,liveCleanup=null,dead=false,pending=Promise.resolve(true),selectionPane='roster';
  const title=el('h2','Dein Spieltag'),steps=el('p'),status=el('p'),body=el('div'),conflicts=el('section');let conflictKey='';status.setAttribute('role','status');container.append(title,steps,status,body,conflicts);
  const discard=el('button','Ungespeicherte Eingaben verwerfen');discard.type='button';discard.dataset.action='discard-unsaved';discard.hidden=true;container.append(discard);
  discard.addEventListener('click',()=>{dirty=false;stage='';update(controller.getState());});
  function field(parent,label,key,type,value){const l=el('label',label),n=el(type==='textarea'?'textarea':type==='select'?'select':'input');if(n.tagName==='INPUT')n.type=type;n.dataset.field=key;if(type!=='select')n.value=value??'';l.append(n);parent.append(l);return n;}
  function button(parent,label,action,fn){const n=el('button',label);n.type='button';n.dataset.action=action;n.addEventListener('click',fn);parent.append(n);return n;}
  function mark(){dirty=true;revision++;status.textContent='Ungespeichert';}
  async function replaceAndRender(value){
    draft=clone(value);read=()=>clone(draft);dirty=true;revision++;
    const ok=await save();if(ok){stage='';update(controller.getState());}return ok;
  }
  function opponentSection(plan,{review=false}={}){
    const section=el('section');section.className='matchday-opponent-plan';section.dataset.role='opponent-plan';
    if(!plan){section.append(el('h3','Gegneranalyse'),el('p','Für dieses Spiel ist noch keine bestätigte Gegneranalyse verbunden.'));return section;}
    const heading=el('div');heading.className='matchday-opponent-head';const title=el('div');title.append(el('small','Gegneranalyse'),el('h3',plan.opponent));const quality=el('strong',plan.dataQuality?.confidence==='high'?'Datenlage Grün':plan.dataQuality?.confidence==='medium'?'Datenlage Gelb':'Datenlage Rot');quality.dataset.quality=plan.dataQuality?.confidence||'low';heading.append(title,quality);section.append(heading);
    const defense=el('div');defense.className='matchday-defense-pair';defense.append(el('p','Start: '+plan.defense.startLabel),el('p','Alternative: '+plan.defense.alternativeLabel));section.append(defense);
    const triggers=el('ul');for(const item of plan.defense.triggers||[])triggers.append(el('li',item));if(triggers.children.length)section.append(el('h4','Wechsel-Auslöser'),triggers);
    const active=activeGamePlan(plan);
    if(active){const room=el('ol');for(const item of active.lockerRoom||[])room.append(el('li',item));section.append(el('h4','Kabine'),room);}
    if(review&&active){
      for(const [key,label]of [['gameGoals','Spielziele'],['offenseKeys','Offense'],['defenseKeys','Defense'],['halftimeChecks','Halbzeit prüfen']]){
        const items=active[key]||[];if(!items.length)continue;const list=el('ul');for(const item of items)list.append(el('li',item));section.append(el('h4',label),list);
      }
    }
    if(!review){
      const buttons=el('div');buttons.className='matchday-opponent-actions';
      button(buttons,'Analyse aktualisieren','refresh-opponent-plan',async()=>{
        const refreshed=getOpponentPlan();if(!refreshed){status.textContent='Für dieses Spiel wurde kein Gegnerprofil gefunden.';return;}
        await replaceAndRender({...read(),opponentPlan:refreshed});
      });
      const ai=button(buttons,plan.aiPlan?'KI-Gameplan neu erstellen':'Mit Basketball-KI vorbereiten','generate-game-plan',async()=>{
        ai.disabled=true;status.textContent='Basketball-KI erstellt den Gameplan …';
        try{
          const base=read(),generated=await requestGamePlan({game,opponentPlan:base.opponentPlan});
          const opponentPlan=mergeAIPlan(base.opponentPlan,generated),active=activeGamePlan(opponentPlan);
          const next={...base,opponentPlan};
          if(!String(next.goals||'').trim())next.goals=(active.gameGoals||[]).join('\n');
          if(!String(next.warmup||'').trim())next.warmup=(active.warmupFocus||[]).join('\n');
          if(!String(next.coachingNote||'').trim())next.coachingNote=[...(active.defenseKeys||[]),...(active.offenseKeys||[])].join('\n');
          await replaceAndRender(next);
        }catch(error){status.textContent=error.message;}finally{ai.disabled=false;}
      });
      section.append(buttons);
    }
    return section;
  }
  function save(next){
    if(saving)return pending.then(ok=>ok?save(next):false);
    if(!dirty&&!next)return Promise.resolve(true);
    const value=read(),version=revision;if(next)value.step=next;
    saving=true;
    pending=controller.saveDraft(value,{parents}).then(result=>{
      saving=false;if(dead)return result.ok;
      if(result.ok){parents=controller.getState().heads;if(version===revision){dirty=false;draft=clone(value);}}
      update(controller.getState());return result.ok;
    }).catch(e=>{saving=false;status.textContent=e.message;return false;});return pending;
  }
  function render(s){
    const newStage=['live','pause','finished'].includes(s.stage)||s.liveState.hasLiveData?'live':s.stage;
    if(stage===newStage)return;
    liveCleanup?.();liveCleanup=null;stage=newStage;body.replaceChildren();
    if(stage==='live'){steps.textContent='Spiel begleiten';liveCleanup=onLive(body,controller);read=()=>draft;return;}
    draft=clone(s.draft);parents=s.heads;dirty=false;
    if(stage==='conflict'){
      steps.textContent='Vorbereitungskonflikt';return;
    }
    const names={game:'1 · Spiel prüfen',roster:'2 · Kader & Starting Five',preparation:'3 · Gameplan',review:'4 · Gameplan bestätigen'};
    steps.textContent=names[stage];const form=el('form'),group=el('fieldset');form.append(group);body.append(form);
    form.addEventListener('submit',e=>e.preventDefault());group.disabled=s.readOnly;
    form.addEventListener('input',mark);form.addEventListener('change',mark);
    form.addEventListener('focusout',()=>queueMicrotask(()=>{if(!dead&&dirty&&!saving&&!form.contains(document.activeElement))save();}));
    const actions=el('div');actions.className='matchday-actions';group.append(actions);
    if(stage==='game'){
      const side=field(group,'Unsere Mannschaft spielt','ownSide','select');for(const [v,t]of [['','Bitte wählen'],['home','Heim'],['away','Gast']]){const o=el('option',t);o.value=v;side.append(o);}side.value=draft.ownSide||'';
      const kind=field(group,'Spielart','kind','select');for(const [v,t]of [['match','Spiel'],['training','Trainingsspiel']]){const o=el('option',t);o.value=v;kind.append(o);}kind.value=draft.kind;
      read=()=>({...draft,ownSide:side.value||null,kind:kind.value});
      button(actions,'Weiter zur Mannschaft','next',()=>{if(!side.value){status.textContent='Heim oder Gast auswählen.';return;}save('roster');});
    }else if(stage==='roster'){
      group.append(el('h3','Kader & Starting Five'),el('p','Lege zuerst den Spieltagskader fest und wähle danach genau fünf Starter.'));
      const summary=el('div');summary.className='matchday-selection-summary';summary.dataset.role='selection-summary';group.append(summary);
      const nav=el('nav');nav.className='matchday-plan-nav';nav.setAttribute('aria-label','Spielvorbereitung');group.append(nav);
      const rosterTab=button(nav,'Kader','show-roster',()=>showPane('roster'));
      const lineupTab=button(nav,'Starting Five','show-lineup',()=>showPane('lineup'));
      button(nav,'Gameplan','show-gameplan',()=>{try{buildSetup(read());save('preparation');}catch(e){status.textContent=e.message;}});
      const rosterPanel=el('section'),lineupPanel=el('section');rosterPanel.dataset.role='roster-panel';lineupPanel.dataset.role='lineup-panel';
      rosterPanel.append(el('h4','Wer ist dabei?'),el('p','Tippe pro Spieler auf Dabei oder Nicht dabei.'));
      const exportButton=button(rosterPanel,'Kader als PDF','export-roster-pdf',async()=>{
        exportButton.disabled=true;status.textContent='Kader-PDF wird erstellt …';
        try{const result=await onRosterPdf({game,draft:read()});status.textContent=result?.delivery==='cancelled'?'PDF-Export abgebrochen.':'Kader-PDF erstellt.';}
        catch(error){status.textContent='Kader-PDF fehlgeschlagen: '+error.message;}
        finally{exportButton.disabled=false;}
      });exportButton.className='matchday-roster-export';
      exportButton.disabled=true;exportButton.textContent='PDF wird vorbereitet …';
      Promise.resolve().then(()=>prepareRosterPdf()).then(()=>{if(dead)return;exportButton.disabled=false;exportButton.textContent='Kader als PDF';}).catch(error=>{if(dead)return;exportButton.textContent='Kader-PDF nicht verfügbar';status.textContent='Kader-PDF fehlgeschlagen: '+error.message;});
      lineupPanel.append(el('h4','Wer startet?'),el('p','Wähle aus dem nominierten Kader genau fünf Starter.'));
      const lineupEmpty=el('p','Noch niemand im Kader. Wähle zuerst Spieler unter Kader aus.');lineupEmpty.className='matchday-empty-hint';lineupPanel.append(lineupEmpty);
      group.append(rosterPanel,lineupPanel);
      const all=new Map(players().filter(p=>!p.archived).map(p=>[p.id,p]));for(const p of draft.roster)all.set(p.id,{...players().find(x=>x.id===p.id),...p});
      const rows=[];
      const choice=(parent,label,player,value,kind)=>{const n=button(parent,label,kind==='roster'?'choose-roster':'choose-lineup',()=>setStatus(player.id,value,kind));n.dataset[kind==='roster'?'playerRoster':'playerLineup']=player.id;n.dataset.status=value;n.setAttribute('aria-label',`${player.name}: ${label}`);n.setAttribute('aria-pressed','false');return n;};
      for(const p of all.values()){
        const saved=draft.roster.find(x=>x.id===p.id),row=el('section'),lineupRow=el('section');row.className='matchday-player matchday-player-plan';lineupRow.className='matchday-player matchday-player-plan matchday-lineup-choice';
        const initialStatus=saved?.gameStatus||(draft.startingFive.includes(p.id)?'starter':saved?'bench':'dnp');
        const head=el('div');head.className='matchday-player-head';head.append(el('h4',p.name+(p.archived?' (archiviert – Status prüfen)':'')),el('span',p.jerseyNumber?'#'+p.jerseyNumber:'Ohne Nummer'));row.append(head);
        const rosterChoices=el('div');rosterChoices.className='matchday-choice-row';const inButton=choice(rosterChoices,'Dabei',p,'bench','roster'),outButton=choice(rosterChoices,'Nicht dabei',p,'dnp','roster');row.append(rosterChoices);
        const position=field(row,'Position für dieses Spiel','gamePosition','select');position.parentElement.className='matchday-player-position';for(const optionValue of [{value:'',label:'Ohne Position'},...GAME_POSITIONS]){const option=el('option',optionValue.label);option.value=optionValue.value;position.append(option);}position.value=Object.prototype.hasOwnProperty.call(saved||{},'gamePosition')?(saved.gamePosition||''):(normalizeGamePosition(p.position)||'');position.dataset.playerPosition=p.id;
        const details=el('details');details.className='matchday-player-details';details.append(el('summary','Nummer & optionale Rolle'));
        const detailBody=el('div');const jersey=field(detailBody,'Trikotnummer','jersey','text',p.jerseyNumber);jersey.inputMode='numeric';jersey.maxLength=2;jersey.dataset.jersey=p.id;
        const role=field(detailBody,'Rolle im Gameplan (optional)','role','text',saved?.role||'');role.maxLength=120;role.placeholder='z. B. Ballhandler, Shooter, Big';role.dataset.playerRole=p.id;details.append(detailBody);row.append(details);rosterPanel.append(row);
        const lineupHead=el('div');lineupHead.className='matchday-player-head';lineupHead.append(el('h4',p.name),el('span',p.jerseyNumber?'#'+p.jerseyNumber:'Ohne Nummer'));lineupRow.append(lineupHead);
        const lineupChoices=el('div');lineupChoices.className='matchday-choice-row';const starterButton=choice(lineupChoices,'Starting Five',p,'starter','lineup'),benchButton=choice(lineupChoices,'Bank',p,'bench','lineup');lineupRow.append(lineupChoices);lineupPanel.append(lineupRow);
        rows.push({p,row,lineupRow,jersey,position,role,status:initialStatus,inButton,outButton,starterButton,benchButton});
      }
      function setStatus(playerId,value,kind){const row=rows.find(item=>item.p.id===playerId);if(!row)return;const next=kind==='roster'&&value==='bench'&&row.status==='starter'?'starter':value;if(next===row.status)return;row.status=next;mark();updateSelection();}
      function updateSelection(){
        const nominated=rows.filter(row=>row.status!=='dnp'),starters=rows.filter(row=>row.status==='starter');
        const rosterStat=el('span');rosterStat.append(el('small','Kader '),el('strong',`${nominated.length} Spieler`));
        const lineupStat=el('span');lineupStat.append(el('small','Starting Five '),el('strong',`${starters.length}/5`));summary.replaceChildren(rosterStat,lineupStat);
        lineupEmpty.hidden=nominated.length>0;
        for(const item of rows){const included=item.status!=='dnp';item.row.dataset.status=item.status;item.lineupRow.dataset.status=item.status;item.lineupRow.hidden=!included;item.position.disabled=!included;item.role.disabled=!included;
          item.inButton.classList.toggle('active',included);item.outButton.classList.toggle('active',!included);item.starterButton.classList.toggle('active',item.status==='starter');item.benchButton.classList.toggle('active',item.status==='bench');
          item.inButton.setAttribute('aria-pressed',String(included));item.outButton.setAttribute('aria-pressed',String(!included));item.starterButton.setAttribute('aria-pressed',String(item.status==='starter'));item.benchButton.setAttribute('aria-pressed',String(item.status==='bench'));
        }
      }
      function showPane(pane){selectionPane=pane;const lineup=pane==='lineup';rosterPanel.hidden=lineup;lineupPanel.hidden=!lineup;rosterTab.classList.toggle('active',!lineup);lineupTab.classList.toggle('active',lineup);}
      read=()=>{const roster=rows.map(r=>({id:r.p.id,name:r.p.name,jerseyNumber:r.jersey.value.trim()||null,gameStatus:r.status,gamePosition:r.position.value||null,role:r.status==='dnp'?'':r.role.value.trim()}));return {...draft,roster,startingFive:roster.filter(player=>player.gameStatus==='starter').map(player=>player.id)};};
      updateSelection();showPane(selectionPane);
      button(actions,'Zurück','back',()=>save('game'));
      button(actions,'Weiter zum Gameplan','next',()=>{try{buildSetup(read());save('preparation');}catch(e){status.textContent=e.message;}});
    }else if(stage==='preparation'){
      const nav=el('nav');nav.className='matchday-plan-nav';nav.setAttribute('aria-label','Spielvorbereitung');group.append(nav);
      button(nav,'Kader','show-roster',()=>{selectionPane='roster';save('roster');});
      button(nav,'Starting Five','show-lineup',()=>{selectionPane='lineup';save('roster');});
      const gameplanTab=button(nav,'Gameplan','show-gameplan',()=>{});gameplanTab.classList.add('active');gameplanTab.setAttribute('aria-current','page');
      const periods=field(group,'Viertel / Abschnitte','periods','number',draft.config.periods);periods.min=1;periods.max=12;
      const minutes=field(group,'Minuten je Abschnitt','minutes','number',draft.config.periodMs/60000);minutes.min=1;minutes.max=60;
      const overtime=field(group,'Minuten je Verlängerung','overtime','number',draft.config.overtimeMs/60000);overtime.min=1;overtime.max=60;
      const fields={};for(const [key,label]of [['goals','Spielziele'],['warmup','Aufwärmen'],['coachingNote','Coaching-Notiz']]){fields[key]=field(group,label,key,'textarea',draft[key]);fields[key].maxLength=4000;}
      group.insertBefore(opponentSection(draft.opponentPlan),periods.parentElement);
      group.append(el('h3','Taktiken für dieses Spiel'));
      const options=new Map(tactics().filter(t=>!t.archived).map(t=>[t.id,{id:t.id,title:t.title||t.name||'Taktik',usage:tacticUsage(t)}]));for(const t of draft.tactics)if(!options.has(t.id))options.set(t.id,{...t,usage:t.usage||'offense',missing:true});
      const selected=[];for(const [usage,label]of tacticGroups){const section=el('section');section.className='matchday-tactic-group';section.dataset.tacticGroup=usage;section.append(el('h4',label));const matches=[...options.values()].filter(t=>t.usage===usage);if(!matches.length)section.append(el('p','Keine passende Taktik im Taktikboard.'));for(const t of matches){const check=field(section,t.title+(t.missing?' – Nicht mehr verfügbar':''),'tactic','checkbox',t.id);check.checked=draft.tactics.some(x=>x.id===t.id);check.dataset.tacticId=t.id;selected.push({check,t});}group.append(section);}
      read=()=>({...draft,config:{periods:Number(periods.value),periodMs:Number(minutes.value)*60000,overtimeMs:Number(overtime.value)*60000},...Object.fromEntries(Object.entries(fields).map(([k,n])=>[k,n.value])),tactics:selected.filter(x=>x.check.checked).map(({t})=>({id:t.id,title:t.title,usage:t.usage}))});
      button(actions,'Zurück','back',()=>save('roster'));
      button(actions,'Optionale Angaben überspringen','skip-preparation',()=>save('review'));
      button(actions,'Gameplan prüfen','next',()=>save('review'));
    }else{
      group.append(el('h3','Gameplan bestätigen'),el('p',`${draft.kind==='training'?'Trainingsspiel':'Spiel'} · ${draft.ownSide==='home'?'Heim':'Gast'} · ${draft.config.periods} × ${draft.config.periodMs/60000} Minuten`),el('p','Mit dem Start wird dieser Gameplan eingefroren. Während des Spiels bleibt er nur lesbar.'));
      group.append(opponentSection(draft.opponentPlan,{review:true}));
      const lineup=el('div');lineup.className='matchday-lineup-board';for(const [key,label]of Object.entries(playerStatusLabels)){const section=el('section');section.dataset.status=key;section.append(el('h4',label));const list=el('ul');for(const p of draft.roster.filter(player=>(player.gameStatus||(draft.startingFive.includes(player.id)?'starter':'bench'))===key))list.append(el('li',`${p.jerseyNumber===null?'Ohne Nummer':'#'+p.jerseyNumber} ${p.name} · ${gamePositionLabel(p.gamePosition)}${p.role?' · '+p.role:''}`));if(!list.children.length)list.append(el('li','Keine Spieler'));section.append(list);lineup.append(section);}group.append(lineup);
      const plan=el('section');plan.className='matchday-plan-summary';plan.append(el('h4','Schwerpunkte'),el('p',draft.goals||'Keine Spielziele eingetragen.'),el('p',draft.warmup?'Aufwärmen: '+draft.warmup:'Kein Aufwärmplan eingetragen.'),el('p',draft.coachingNote?'Coaching: '+draft.coachingNote:'Keine Coaching-Notiz eingetragen.'));group.append(plan);
      const tacticsSummary=el('section');tacticsSummary.className='matchday-plan-summary';tacticsSummary.append(el('h4','Geplante Taktiken'));for(const [usage,label]of tacticGroups){const chosen=draft.tactics.filter(t=>(t.usage||'offense')===usage);if(chosen.length)tacticsSummary.append(el('p',label+': '+chosen.map(t=>t.title).join(', ')));}if(!draft.tactics.length)tacticsSummary.append(el('p','Keine Taktik ausgewählt.'));group.append(tacticsSummary,el('p','Die Spieluhr startest du anschließend selbst.'));
      read=()=>clone(draft);button(actions,'Zurück','back',()=>save('preparation'));button(actions,'Zur Live-Ansicht','start',async()=>{if(await save())await controller.start();});
    }
    button(actions,'Vorbereitung speichern','save',()=>{dirty=true;save();});group.append(actions);
  }
  function update(s){
    if(dead)return;
    if(!saving&&(!dirty||stage==='live'))render(s);
    status.textContent=s.error|| (dirty?'Ungespeichert':s.localStatus==='pending'?'Lokal gesichert · Synchronisation ausstehend':s.localStatus==='synced'?'Vorbereitung synchronisiert':'Vorbereitung noch nicht gespeichert');
    for(const fs of body.querySelectorAll('form > fieldset'))fs.disabled=s.readOnly;
    discard.hidden=stage==='live'||!(dirty&&s.readOnly);discard.disabled=saving;
    const key=canonical([s.choices,s.readOnly,dirty,s.busy,stage==='live']);
    if(key===conflictKey)return;conflictKey=key;conflicts.replaceChildren();
    if(!s.conflict||stage==='live')return;
    conflicts.append(el('h3','Vorbereitung auf mehreren Geräten geändert'),el('p',dirty?'Deine ungespeicherten Eingaben bleiben oben stehen. Übernehmen verwirft diese Eingaben ausdrücklich.':'Wähle bewusst eine Version. Die andere bleibt in der Historie erhalten.'));
    for(const choice of s.choices){
      const section=el('section');section.append(el('pre',JSON.stringify(choice.value,null,2)));
      const b=button(section,dirty?'Ungespeicherte Eingaben verwerfen und diese Version übernehmen':'Diese Version übernehmen','resolve',async()=>{
        const result=await controller.resolve(choice.id,{heads:s.heads});
        if(result.ok){dirty=false;stage='';update(controller.getState());}
      });b.disabled=s.readOnly||saving||s.busy;conflicts.append(section);
    }
  }
  const unsub=controller.subscribe(update);
  const unload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);
  function cleanup(){dead=true;unsub();liveCleanup?.();window.removeEventListener('beforeunload',unload);}
  cleanup.flush=async()=>{if(liveCleanup?.flush)return liveCleanup.flush();if(saving)await pending;return save();};
  return cleanup;
}
