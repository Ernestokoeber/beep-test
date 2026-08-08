export function injectQuickEditorStyles() {
  if (document.getElementById('courthub-quick-editor-v1')) return;
  const style = document.createElement('style');
  style.id = 'courthub-quick-editor-v1';
  style.textContent = `
    body:has(main#app>.chq-focus-shell){padding-bottom:0}
    body:has(main#app>.chq-focus-shell)>.topbar,body:has(main#app>.chq-focus-shell)>.mobile-dock{display:none}
    body:has(main#app>.chq-focus-shell)>main#app{max-width:none;width:100%;min-height:100dvh;margin-left:0;padding:0;overflow-x:hidden}
    main#app:has(> .chq){max-width:none;width:auto;overflow-x:hidden}
    .chq{--q-panel:#0b171e;--q-panel2:#10232b;--q-line:rgba(255,255,255,.11);--q-muted:#91a4ad;--q-text:#f7fafc;--q-accent:#ff9d2e;max-width:96rem;margin:auto;padding:1rem;color:var(--q-text)}
    .chq *{box-sizing:border-box}
    .chq button,.chq input,.chq select,.chq textarea{font:inherit}
    .chq-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.85rem}
    .chq-brand{display:flex;align-items:center;gap:.75rem;min-width:0}
    .chq-logo{display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:.85rem;background:linear-gradient(145deg,#ffb653,#ec7417);color:#211207;font-weight:900;box-shadow:0 .7rem 1.8rem rgba(236,116,23,.28);flex:0 0 auto}
    .chq-kicker{display:block;color:var(--q-accent);font-size:.68rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}
    .chq h1{font-size:clamp(1.2rem,2vw,1.7rem);margin:.05rem 0 0;color:var(--text,#13221b)}
    [data-theme="dark"] .chq h1{color:var(--q-text)}
    .chq-actions{display:flex;gap:.42rem;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .chq-btn{border:1px solid var(--q-line);background:#11242b;color:var(--q-text);border-radius:.72rem;padding:.58rem .74rem;min-height:2.5rem;font-weight:760;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.38rem;text-decoration:none}
    .chq-btn:hover{background:#17313a}
    .chq-btn:disabled{opacity:.4;cursor:not-allowed}
    .chq-btn.primary{background:linear-gradient(145deg,#ffae46,#ee7b1b);color:#251407;border-color:transparent}
    .chq-btn.danger{color:#fecaca;border-color:rgba(248,113,113,.35)}
    .chq-btn.icon{width:2.5rem;padding:0}
    .chq-mode{display:flex;gap:.2rem;padding:.2rem;border:1px solid rgba(15,35,42,.13);background:rgba(255,255,255,.62);border-radius:.75rem}
    [data-theme="dark"] .chq-mode{border-color:var(--q-line);background:#07151b}
    .chq-mode button{border:0;background:transparent;color:var(--muted,#64756d);border-radius:.56rem;padding:.48rem .68rem;font-weight:800;cursor:pointer}
    .chq-mode button.active{background:#0c4d35;color:#fff}
    .chq-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(20rem,.62fr);gap:.85rem;align-items:start}
    .chq-card{background:linear-gradient(180deg,rgba(15,35,42,.98),rgba(6,18,23,.98));border:1px solid var(--q-line);border-radius:1rem;box-shadow:0 1.2rem 3rem rgba(0,0,0,.24);overflow:hidden;min-width:0}
    .chq-card-head{display:flex;align-items:center;justify-content:space-between;gap:.65rem;padding:.78rem .88rem;border-bottom:1px solid var(--q-line)}
    .chq-card-head h2{margin:0;color:var(--q-text);font-size:.86rem}
    .chq-card-body{padding:.82rem}
    .chq-stage{padding:.72rem;background:radial-gradient(circle at 50% 12%,rgba(61,104,130,.25),transparent 42%),linear-gradient(180deg,#07101a,#02060b 72%)}
    .chq-stage-copy{display:flex;align-items:center;justify-content:space-between;gap:.65rem;padding:.1rem .12rem .58rem}
    .chq-stage-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .chq-stage-copy span{display:block;color:var(--q-muted);font-size:.68rem}
    .chq-court-wrap{position:relative;aspect-ratio:760/550;width:100%;max-height:74vh;margin:auto;border-radius:.9rem;overflow:hidden;background:#050b12;box-shadow:inset 0 0 0 1px rgba(255,255,255,.11),0 1.4rem 3.2rem rgba(0,0,0,.48);touch-action:none}
    .chq-court-wrap>.chpd-court{width:100%;height:100%;display:block;user-select:none;-webkit-user-select:none}
    .chq-transport{display:grid;grid-template-columns:auto minmax(8rem,1fr) auto;gap:.6rem;align-items:center;margin-top:.68rem;padding:.62rem;border:1px solid var(--q-line);border-radius:.82rem;background:#0b171e}
    .chq-transport-buttons{display:flex;gap:.32rem}
    .chq-scrubber{display:grid;grid-template-columns:auto 1fr auto;gap:.45rem;align-items:center}
    .chq-scrubber span{font-size:.66rem;color:var(--q-muted);font-variant-numeric:tabular-nums}
    .chq-scrubber input{width:100%;accent-color:#ff9d2e}
    .chq-speed{display:flex;gap:.35rem;align-items:center}
    .chq-speed select{border:1px solid var(--q-line);background:#061218;color:var(--q-text);border-radius:.52rem;padding:.46rem}
    .chq-side{display:grid;gap:.75rem;min-width:0}
    .chq-section-title{display:flex;align-items:center;gap:.48rem;margin-bottom:.48rem}
    .chq-section-title span{display:grid;place-items:center;width:1.55rem;height:1.55rem;border-radius:50%;background:rgba(255,157,46,.14);color:#ffc47d;font-size:.7rem;font-weight:900;flex:0 0 auto}
    .chq-section-title strong{font-size:.82rem}
    .chq-help{margin:.1rem 0 .65rem;color:var(--q-muted);font-size:.72rem;line-height:1.5}
    .chq-fields{display:grid;grid-template-columns:1fr 9rem;gap:.5rem}
    .chq-field{display:grid;gap:.3rem}
    .chq-field label{font-size:.66rem;color:var(--q-muted);font-weight:760}
    .chq-field input,.chq-field select{width:100%;border:1px solid var(--q-line);background:#061218;color:var(--q-text);border-radius:.62rem;padding:.58rem .64rem}
    .chq-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.42rem}
    .chq-tool{border:1px solid var(--q-line);background:#10242b;color:var(--q-text);border-radius:.7rem;padding:.68rem .55rem;min-height:3.35rem;font-weight:800;cursor:pointer;display:grid;place-items:center;gap:.12rem;text-align:center}
    .chq-tool small{font-size:.58rem;color:var(--q-muted);font-weight:650}
    .chq-tool.active{border-color:#ff9d2e;background:rgba(255,157,46,.14);color:#ffc47d}
    .chq-relation{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin-bottom:.55rem}
    .chq-relation button{border:1px solid var(--q-line);background:#07151b;color:var(--q-muted);border-radius:.62rem;padding:.55rem;font-weight:780;cursor:pointer}
    .chq-relation button.active{border-color:#ff9d2e;background:rgba(255,157,46,.12);color:#ffc47d}
    .chq-status{padding:.58rem .62rem;border-radius:.64rem;background:rgba(255,255,255,.045);color:var(--q-muted);font-size:.68rem;line-height:1.45;margin-top:.55rem}
    .chq-flow{display:grid;gap:.4rem;max-height:22rem;overflow:auto}
    .chq-flow-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.5rem;align-items:center;border:1px solid var(--q-line);background:rgba(255,255,255,.035);border-radius:.7rem;padding:.52rem .58rem;cursor:pointer;color:var(--q-text);text-align:left}
    .chq-flow-item.active{border-color:#ff9d2e;background:rgba(255,157,46,.1)}
    .chq-flow-index{display:grid;place-items:center;width:1.75rem;height:1.75rem;border-radius:50%;background:#10242b;color:#ffc47d;font-size:.68rem;font-weight:900}
    .chq-flow-copy{min-width:0}
    .chq-flow-copy strong{display:block;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .chq-flow-copy span{display:block;font-size:.6rem;color:var(--q-muted);margin-top:.12rem}
    .chq-phase-actions{list-style:none;margin:.28rem 0 0;padding:0;display:grid;gap:.16rem;color:var(--q-muted);font-size:.62rem;line-height:1.35}
    .chq-phase-actions li{position:relative;padding-left:.78rem}
    .chq-phase-actions li::before{content:"↳";position:absolute;left:0;color:#ffb45c}
    .chq-phase-actions li[data-group="pick-and-roll"]::after{content:"P&R";display:inline-block;margin-left:.35rem;padding:.08rem .28rem;border-radius:999px;background:rgba(56,189,248,.12);color:#b9e8ff;font-size:.52rem;font-weight:900}
    .chq-flow-time{font-size:.62rem;color:var(--q-muted);font-variant-numeric:tabular-nums}
    .chq-empty{color:var(--q-muted);font-size:.72rem;line-height:1.5;padding:.5rem 0}
    .chq-pending{display:flex;align-items:center;gap:.45rem;margin-top:.48rem;padding:.5rem .58rem;border-radius:.62rem;background:rgba(56,189,248,.08);color:#b9e8ff;font-size:.68rem;border:1px solid rgba(56,189,248,.18)}
    .chq-pending[hidden]{display:none}
    .chq-cancel-recording{width:100%;margin-top:.42rem}
    .chq-cancel-recording[hidden]{display:none}
    .chq-spacing-warning{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:center;margin-bottom:.55rem;padding:.55rem .62rem;border:1px solid rgba(251,191,36,.25);border-radius:.68rem;background:rgba(251,191,36,.08);color:#fde68a;font-size:.65rem;line-height:1.35}
    .chq-spacing-warning[hidden]{display:none}
    .chq-overlap .token-shape,.chq-overlap ellipse,.chq-overlap circle{stroke:#facc15!important;stroke-width:4!important;filter:drop-shadow(0 0 5px rgba(250,204,21,.8))}
    .visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    .chq-focus-shell{max-width:none;margin:0;min-height:calc(100dvh - 1rem);padding:.65rem;display:flex;flex-direction:column;background:linear-gradient(145deg,rgba(8,29,21,.04),rgba(236,125,29,.04))}
    .chq-editor-toolbar{position:sticky;z-index:30;top:.35rem;display:grid;grid-template-columns:minmax(15rem,1fr) auto minmax(15rem,1fr);gap:.75rem;margin-bottom:.65rem;padding:.55rem;border:1px solid rgba(15,72,48,.16);border-radius:1rem;background:rgba(248,251,249,.94);box-shadow:0 .8rem 2.4rem rgba(10,38,26,.12);backdrop-filter:blur(1rem)}
    [data-theme="dark"] .chq-editor-toolbar{background:rgba(6,20,15,.94);border-color:var(--q-line)}
    .chq-toolbar-leading{display:flex;align-items:center;gap:.58rem;min-width:0}.chq-back span{white-space:nowrap}.chq-title-stack{display:grid;min-width:0}.chq-title-input{width:min(21rem,100%);border:0;border-bottom:1px solid transparent;background:transparent;color:var(--text,#13221b);font-size:.96rem;font-weight:900;padding:.12rem 0;outline:none}.chq-title-input:hover,.chq-title-input:focus{border-bottom-color:#ec7d1d}[data-theme="dark"] .chq-title-input{color:var(--q-text)}
    .chq-save-state{font-size:.58rem;color:var(--muted,#64756d)}
    .chq-toolbar-tools{display:flex;align-items:center;justify-content:center;gap:.28rem}.chq-toolbar-tools .chq-tool{min-width:3.2rem;min-height:2.85rem;padding:.34rem .42rem}.chq-toolbar-tools .chq-tool>span{font-size:.85rem}.chq-toolbar-tools .chq-tool small{font-size:.55rem}
    .chq-header-more{position:relative}.chq-header-more>summary{list-style:none}.chq-header-more>summary::-webkit-details-marker{display:none}.chq-header-menu{position:absolute;z-index:40;right:0;top:calc(100% + .4rem);display:grid;gap:.3rem;min-width:12rem;padding:.45rem;border:1px solid var(--q-line);border-radius:.75rem;background:#0b171e;box-shadow:0 1rem 2.6rem rgba(0,0,0,.3)}.chq-header-menu .chq-btn{width:100%;justify-content:flex-start}
    .chq-workspace{display:grid;grid-template-columns:13.5rem minmax(28rem,1fr) 22rem;gap:.65rem;min-height:0;flex:1}
    .chq-phase-rail,.chq-stage-panel,.chq-inspector-main,.chq-properties{border:1px solid var(--q-line);border-radius:1rem;background:linear-gradient(180deg,rgba(15,35,42,.98),rgba(6,18,23,.98));box-shadow:0 1rem 2.6rem rgba(0,0,0,.18);min-width:0;overflow:hidden}
    .chq-phase-rail{display:flex;flex-direction:column;max-height:calc(100dvh - 6.4rem)}.chq-panel-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.7rem;border-bottom:1px solid var(--q-line)}.chq-panel-head strong{display:block;font-size:.82rem}
    .chq-phase-rail .chq-flow{padding:.55rem;max-height:none;overflow:auto}.chq-phase-rail .chq-flow-item{display:block;position:relative;padding:.42rem}.chq-phase-open{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;width:100%;padding:0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.chq-phase-rail .chq-flow-index{position:absolute;z-index:2;top:.55rem;left:.55rem;background:#0c4d35;color:#fff;box-shadow:0 .2rem .6rem rgba(0,0,0,.24)}.chq-phase-thumbnail{display:block;grid-column:1/-1;aspect-ratio:760/550;overflow:hidden;border-radius:.55rem;border:1px solid rgba(255,255,255,.12);background:#061218}.chq-phase-thumbnail svg{display:block;width:100%;height:100%}.chq-phase-rail .chq-flow-copy{grid-column:1/-1;padding:.18rem .18rem 0}.chq-phase-rail .chq-flow-copy strong{font-size:.68rem}.chq-phase-rail .chq-flow-copy span{font-size:.58rem;color:var(--q-muted)}.chq-phase-menu{position:absolute;z-index:5;top:.55rem;right:.55rem}.chq-phase-menu>summary{display:grid;place-items:center;width:2rem;height:2rem;list-style:none;border:1px solid rgba(255,255,255,.15);border-radius:.5rem;background:rgba(6,18,24,.88);color:#fff;cursor:pointer}.chq-phase-menu>summary::-webkit-details-marker{display:none}.chq-phase-menu>div{position:absolute;right:0;top:calc(100% + .3rem);display:grid;gap:.2rem;min-width:10.5rem;padding:.35rem;border:1px solid var(--q-line);border-radius:.65rem;background:#07151b;box-shadow:0 .8rem 2rem rgba(0,0,0,.4)}.chq-phase-menu button{min-height:2.2rem;border:0;border-radius:.45rem;background:transparent;color:#f7fafc;text-align:left;padding:.4rem .5rem;cursor:pointer}.chq-phase-menu button:hover{background:rgba(255,157,46,.14)}
    .chq-stage-panel{display:flex;flex-direction:column;padding:.65rem;background:radial-gradient(circle at 50% 10%,rgba(25,94,67,.2),transparent 42%),linear-gradient(180deg,#07151b,#02080a)}.chq-stage-copy{min-height:3.25rem}.chq-stage-copy>div:first-child{min-width:0}.chq-stage-copy>div:first-child>span:last-child{white-space:normal}.chq-stage-panel .chq-court-wrap{flex:1;max-height:calc(100dvh - 15rem);min-height:20rem;aspect-ratio:auto}.chq-stage-panel .chq-status{margin-top:.45rem}
    .chq-stage-panel .chq-relation{display:flex;margin:0}.chq-stage-panel .chq-relation button{min-height:2.5rem;padding:.45rem .65rem}
    .chq-inspector{display:flex;flex-direction:column;gap:.65rem;max-height:calc(100dvh - 6.4rem);overflow:auto}.chq-inspector-main{flex:1;min-height:18rem}.chq-tabs{display:grid;grid-template-columns:1fr 1fr;padding:.35rem;border-bottom:1px solid var(--q-line)}.chq-tabs button{min-height:2.55rem;border:0;border-radius:.58rem;background:transparent;color:var(--q-muted);font-weight:850;cursor:pointer}.chq-tabs button.active{background:rgba(255,157,46,.14);color:#ffc47d}.chq-tab-panel{padding:.65rem}.chq-tab-panel[hidden]{display:none}
    .chq-inspector-toggle{display:none;align-items:center;justify-content:space-between;gap:.75rem;width:100%;min-height:44px;padding:.65rem .75rem;border:1px solid var(--q-line);border-radius:.8rem;background:#0b1c23;color:var(--q-text);font-weight:850;cursor:pointer}
    .chq-timeline{display:grid;gap:.55rem}.chq-timeline-group{display:grid;gap:.32rem}.chq-timeline-group h3{margin:0;color:var(--q-muted);font-size:.62rem;text-transform:uppercase;letter-spacing:.08em}.chq-timeline-action{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:.38rem;align-items:center;width:100%;min-height:2.85rem;padding:.55rem;border:1px solid var(--q-line);border-radius:.65rem;background:rgba(255,255,255,.035);color:var(--q-text);text-align:left;cursor:pointer}.chq-timeline-action:hover,.chq-timeline-action:focus-visible{border-color:#ff9d2e}.chq-timeline-action strong{font-size:.68rem}.chq-timeline-action span{padding:.1rem .3rem;border-radius:999px;background:rgba(56,189,248,.12);color:#b9e8ff;font-size:.52rem;font-weight:900}.chq-timeline-action small{color:var(--q-muted);font-size:.56rem}.chq-empty{display:grid;gap:.25rem}.chq-empty span{font-size:.65rem}
    .chq-instruction-field{display:grid;gap:.45rem}.chq-instruction-field>span{font-size:.68rem;font-weight:800;color:var(--q-muted)}.chq-instruction-field textarea{min-height:16rem;width:100%;resize:vertical;border:1px solid var(--q-line);border-radius:.7rem;background:#061218;color:var(--q-text);padding:.7rem;line-height:1.5}
    .chq-defense-tools{display:grid;gap:.4rem;margin-top:.65rem;padding-top:.65rem;border-top:1px solid var(--q-line)}.chq-defense-tools>span{font-size:.65rem;color:var(--q-muted)}.chq-defense-tools>div{display:grid;grid-template-columns:1fr 1fr;gap:.35rem}.chq-defense-tools .chq-btn.active{border-color:#ff9d2e;background:rgba(255,157,46,.14);color:#ffc47d}
    .chq-focus-shell button:focus-visible,.chq-focus-shell input:focus-visible,.chq-focus-shell select:focus-visible,.chq-focus-shell textarea:focus-visible,.chq-focus-shell a:focus-visible{outline:3px solid #ff9d2e;outline-offset:2px}
    @media(max-width:1220px){.chq-editor-toolbar{grid-template-columns:minmax(14rem,1fr) auto}.chq-toolbar-tools{grid-column:1/-1;order:3}.chq-workspace{grid-template-columns:10.5rem minmax(25rem,1fr) 19rem}.chq-back span{display:none}}
    @media(max-width:900px){.chq-focus-shell{padding:.45rem}.chq-editor-toolbar{position:relative;top:0;grid-template-columns:1fr}.chq-toolbar-leading,.chq-actions{width:100%}.chq-actions{justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:.15rem}.chq-toolbar-tools{justify-content:flex-start;overflow-x:auto;padding-bottom:.15rem}.chq-workspace{grid-template-columns:1fr}.chq-stage-panel{order:1}.chq-phase-rail{order:2;max-height:none}.chq-inspector{order:3;max-height:none}.chq-phase-rail .chq-flow{display:flex;overflow-x:auto;overflow-y:hidden}.chq-phase-rail .chq-flow-item{flex:0 0 9.5rem}.chq-stage-panel .chq-court-wrap{min-height:0;max-height:none;aspect-ratio:760/550}.chq-inspector{display:grid;grid-template-columns:minmax(0,1fr) minmax(16rem,.7fr)}.chq-inspector-toggle{display:flex;grid-column:1/-1}.chq-inspector.is-collapsed>.chq-inspector-main,.chq-inspector.is-collapsed>.chq-properties{display:none}.chq-inspector-main{min-height:16rem}.chq-properties{align-self:start}}
    @media(max-width:620px){.chq-logo{display:none}.chq-title-input{font-size:.86rem}.chq-toolbar-tools .chq-tool{min-width:3.65rem;min-height:2.75rem}.chq-workspace{gap:.48rem}.chq-stage-copy{align-items:flex-start;flex-direction:column}.chq-stage-panel .chq-relation{width:100%}.chq-stage-panel .chq-relation button{flex:1;min-height:44px}.chq-transport{grid-template-columns:1fr}.chq-transport-buttons,.chq-speed{justify-content:center}.chq-fields{grid-template-columns:1fr}.chq-inspector{grid-template-columns:1fr}.chq-instruction-field textarea{min-height:11rem}.chq-btn,.chq-tool,.chq-tabs button,.chq-timeline-action{min-height:44px}.chq-actions .chq-btn{font-size:.68rem}.chq-phase-rail .chq-flow-item{flex-basis:8.8rem}}
  `;
  document.head.appendChild(style);
}
