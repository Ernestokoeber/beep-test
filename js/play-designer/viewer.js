import { createCourt, drawCourt, formatTime } from './rendering.js';

const core = window.BT.tactics.__core;
function toast(message){if(window.BT.util?.toast)window.BT.util.toast(message);}

function mountStage(container, boardInput){
  const board=core.normalizeBoard(boardInput), total=window.BT.tactics.boardDuration(board);
  container.innerHTML=`<section class="chpd-center"><section class="chpd-stage" data-role="stage"><div class="chpd-stage-inner"><div class="chpd-stage-head"><div class="chpd-stage-copy"><strong></strong><span></span></div><span class="chpd-badge">TEAM PLAY</span></div><div class="chpd-court-wrap" data-role="court"></div></div></section><section class="chpd-transport"><div class="chpd-transport-buttons"><button class="chpd-btn icon" data-action="restart">↺</button><button class="chpd-btn icon primary" data-action="play">▶</button><button class="chpd-btn icon" data-action="fullscreen">⛶</button></div><div class="chpd-scrubber"><span data-role="time">0.0 s</span><input type="range" min="0" value="0" data-role="scrubber"><span data-role="total"></span></div><div class="chpd-speed"><label class="chpd-toggle"><input type="checkbox" data-role="loop" checked> Loop</label><select data-role="speed"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option></select></div></section></section>`;
  const q=s=>container.querySelector(s), svg=createCourt();q('[data-role="court"]').appendChild(svg);q('.chpd-stage-copy strong').textContent=board.title;q('.chpd-stage-copy span').textContent=board.description||board.category;q('[data-role="total"]').textContent=formatTime(total);
  const scrubber=q('[data-role="scrubber"]');scrubber.max=String(Math.round(total*1000));let time=0,playing=false,speed=1,loop=true,last=0,frame=0;
  function draw(){const snapshot=window.BT.tactics.snapshotAt(board,time);drawCourt(svg,snapshot,{sourceStep:snapshot._sourceStep,showGuides:!playing});q('[data-role="time"]').textContent=formatTime(time);scrubber.value=String(Math.round(time*1000));q('[data-action="play"]').textContent=playing?'Ⅱ':'▶';}
  function stop(){playing=false;last=0;if(frame)cancelAnimationFrame(frame);frame=0;draw();}
  function tick(ts){if(!playing||!container.isConnected)return stop();if(!last)last=ts;time+=Math.min(.08,(ts-last)/1000)*speed;last=ts;if(time>=total){if(loop)time=0;else{time=total;return stop();}}draw();frame=requestAnimationFrame(tick);}
  function start(){if(time>=total-.02)time=0;playing=true;last=0;draw();frame=requestAnimationFrame(tick);}
  q('[data-action="play"]').onclick=()=>playing?stop():start();q('[data-action="restart"]').onclick=()=>{stop();time=0;draw();};q('[data-action="fullscreen"]').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await q('[data-role="stage"]').requestFullscreen();}catch{toast('Vollbildmodus nicht verfügbar.');}};scrubber.oninput=()=>{stop();time=core.number(scrubber.value,0)/1000;draw();};q('[data-role="speed"]').onchange=e=>speed=core.number(e.target.value,1);q('[data-role="loop"]').onchange=e=>loop=e.target.checked;draw();return{stop};
}

export function mountPlayer(target){
  const root=document.createElement('section');root.className='view chpd';root.dataset.role='player-tactics';target.appendChild(root);
  const user=core.currentUser(),token=window.BT.api?.getToken?.();
  if(!user||!token){root.innerHTML='<div class="chpd-login"><span class="chpd-kicker">CourtHub Playbook</span><h2>Team-Plays</h2><p>Bitte zuerst anmelden, um veröffentlichte Teamtaktiken anzusehen.</p><a class="chpd-btn primary" href="#/account">Anmelden</a></div>';return root;}
  const published=window.BT.storage.getTactics().map(core.normalizeBoard).filter(item=>item.published===true);
  root.innerHTML='<header class="chpd-header"><div class="chpd-brand"><div class="chpd-logo">CH</div><div><span class="chpd-kicker">Spieleransicht</span><h1>Team-Plays</h1></div></div><div class="chpd-actions"><a href="#/tactics" class="chpd-btn ghost">Trainerboard</a></div></header><div class="chpd-player-grid"><aside class="chpd-panel"><div class="chpd-panel-head"><h2>Veröffentlichte Plays</h2></div><div class="chpd-panel-body chpd-player-list" data-role="list"></div></aside><div data-role="stage"></div></div>';
  const list=root.querySelector('[data-role="list"]'),stage=root.querySelector('[data-role="stage"]');
  if(!published.length){list.innerHTML='<p class="chpd-empty">Noch keine Plays veröffentlicht.</p>';stage.innerHTML='<div class="chpd-login"><h2>Kein Play ausgewählt</h2><p>Sobald ein Coach ein Play veröffentlicht, erscheint es hier.</p></div>';return root;}
  let controller=null;
  function show(board){controller?.stop();controller=mountStage(stage,board);list.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.id===board.id));}
  published.forEach(board=>{const button=document.createElement('button');button.dataset.id=board.id||'';button.innerHTML='<strong></strong><span></span>';button.querySelector('strong').textContent=board.title;button.querySelector('span').textContent=`${board.category} · ${board.steps.length} Schritte`;button.onclick=()=>show(board);list.appendChild(button);});show(published[0]);return root;
}
