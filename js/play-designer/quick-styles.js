export function injectQuickEditorStyles() {
  if (document.getElementById('courthub-quick-editor-v1')) return;
  const style = document.createElement('style');
  style.id = 'courthub-quick-editor-v1';
  style.textContent = `
    body:has(main#app>.chq-focus-shell){padding-bottom:0;background:#fff;overflow:hidden}
    body:has(main#app>.chq-focus-shell)>.topbar,
    body:has(main#app>.chq-focus-shell)>.mobile-dock{display:none}
    body:has(main#app>.chq-focus-shell)>main#app{width:100%;max-width:none;min-height:100dvh;margin:0;padding:0;overflow:hidden}
    main#app:has(> .chq-focus-shell){width:100%;max-width:none;margin:0;padding:0}

    .chq{--cc-text:#17232b;--cc-muted:#7e858a;--cc-line:#eceeef;--cc-soft:#f7f8f8;--cc-accent:#ef6b52;--cc-accent-soft:#fff0ed;--cc-dark:#111;--cc-court:#f8d9b2;color:var(--cc-text);background:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .chq,.chq *{box-sizing:border-box}
    .chq button,.chq input,.chq select,.chq textarea{font:inherit}
    .chq button{color:inherit}
    .visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}

    .chq-focus-shell{width:100%;height:100dvh;min-height:0;margin:0;padding:0;display:grid;grid-template-rows:3.5rem minmax(0,1fr);overflow:hidden;background:#fff}
    .chq-editor-toolbar{position:relative;z-index:40;display:grid;grid-template-columns:minmax(12rem,17rem) minmax(22rem,1fr) minmax(18rem,23rem);align-items:center;min-width:0;height:3.5rem;margin:0;border-bottom:1px solid var(--cc-line);background:#fff}
    .chq-toolbar-leading{display:flex;align-items:center;gap:.65rem;min-width:0;height:100%;padding:0 .85rem;border-right:1px solid var(--cc-line)}
    .chq-icon{display:block;width:1.35rem;height:1.35rem;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .chq-icon .dashed{stroke-dasharray:2.5 2.5}
    .chq-icon-button{display:grid;place-items:center;width:2.5rem;height:2.5rem;flex:0 0 auto;padding:0;border:0;border-radius:.35rem;background:transparent;cursor:pointer}
    .chq-icon-button:hover{background:#f4f5f5}
    .chq-title-wrap{position:relative;display:flex;align-items:center;min-width:0;max-width:13rem;cursor:text}
    .chq-title-input{width:100%;min-width:0;padding:.35rem 1.35rem .35rem 0;border:0;border-bottom:1px solid transparent;background:transparent;color:#27323a;font-size:.9rem;font-weight:550;outline:none;text-overflow:ellipsis}
    .chq-title-input:hover,.chq-title-input:focus{border-bottom-color:#cfd3d5}
    .chq-title-chevron{position:absolute;right:.1rem;top:50%;transform:translateY(-52%);color:#485057;font-size:.8rem;pointer-events:none}
    .chq-save-state{position:absolute;left:0;top:calc(100% + .65rem);width:max-content;max-width:16rem;padding:.35rem .5rem;border:1px solid var(--cc-line);border-radius:.35rem;background:#fff;color:var(--cc-muted);font-size:.62rem;box-shadow:0 .4rem 1rem rgba(26,35,39,.08);opacity:0;pointer-events:none;transition:opacity .15s}
    .chq-title-wrap:focus-within .chq-save-state{opacity:1}

    .chq-toolbar-center{display:flex;align-items:center;justify-content:center;min-width:0;height:100%;gap:.45rem;overflow:hidden}
    .chq-toolbar-tools{display:flex;align-items:center;justify-content:center;height:100%;gap:.05rem;overflow-x:auto;scrollbar-width:none}
    .chq-toolbar-tools::-webkit-scrollbar{display:none}
    .chq-tool{position:relative;display:grid;place-items:center;width:2.75rem;height:2.75rem;flex:0 0 auto;padding:0;border:0;border-radius:.25rem;background:transparent;cursor:pointer}
    .chq-tool:hover{background:#f4f5f5}
    .chq-tool.active{background:#111;color:#fff}
    .chq-tool>span{position:absolute;z-index:20;left:50%;top:calc(100% + .35rem);transform:translateX(-50%);width:max-content;padding:.3rem .45rem;border-radius:.3rem;background:#111;color:#fff;font-size:.62rem;font-weight:650;opacity:0;pointer-events:none}
    .chq-tool:hover>span,.chq-tool:focus-visible>span{opacity:1}
    .chq-toolbar-history{display:flex;align-items:center;gap:.05rem;padding-left:.45rem;border-left:1px solid var(--cc-line)}
    .chq-toolbar-history .chqw-icon{display:grid;place-items:center;width:2.3rem;height:2.3rem;min-width:0;padding:0;border:0;border-radius:.25rem;background:transparent;color:#767d82;font-size:1.15rem;cursor:pointer}
    .chq-toolbar-history .chqw-icon:hover:not(:disabled){background:#f4f5f5;color:#111}
    .chq-toolbar-history .chqw-icon:disabled{opacity:.25;cursor:default}

    .chq-actions{display:flex;align-items:center;justify-content:flex-end;gap:.15rem;min-width:0;height:100%;padding:0 .55rem;border-left:1px solid var(--cc-line)}
    .chq-top-action{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;height:2.65rem;padding:0 .65rem;border:0;border-radius:.3rem;background:transparent;color:#354048;font-size:.82rem;cursor:pointer;white-space:nowrap}
    .chq-top-action:hover{background:#f4f5f5}
    .chq-top-action .chq-icon{width:1.2rem;height:1.2rem}
    .chq-header-more{position:relative}
    .chq-header-more>summary{list-style:none}
    .chq-header-more>summary::-webkit-details-marker{display:none}
    .chq-header-menu{position:absolute;z-index:60;right:0;top:calc(100% + .35rem);display:grid;min-width:14rem;padding:.35rem;border:1px solid var(--cc-line);border-radius:.45rem;background:#fff;box-shadow:0 .9rem 2rem rgba(24,34,39,.16)}
    .chq-header-menu button,.chq-header-menu a{display:flex;align-items:center;min-height:2.5rem;padding:.5rem .65rem;border:0;border-radius:.3rem;background:transparent;color:inherit;text-align:left;text-decoration:none;cursor:pointer}
    .chq-header-menu button:hover,.chq-header-menu a:hover{background:#f5f6f6}
    .chq-header-menu .danger{color:#b42318}

    .chq-workspace{display:grid;grid-template-columns:10rem minmax(0,1fr) 22.75rem;min-width:0;min-height:0;height:100%;overflow:hidden;background:#fff}
    .chq-phase-rail{position:relative;min-width:0;min-height:0;padding:.65rem;border-right:1px solid var(--cc-line);background:#fff;overflow:hidden}
    .chq-flow{display:grid;gap:.7rem;height:100%;align-content:start;overflow-y:auto;overflow-x:visible;padding:.05rem .1rem 4rem;scrollbar-width:thin;scrollbar-color:#d7dadd transparent}
    .chq-flow-item{position:relative;min-width:0;border:2px solid transparent;border-radius:.35rem;background:#f2f3f3;transition:border-color .12s,background .12s}
    .chq-flow-item.active{border-color:var(--cc-accent);background:var(--cc-accent-soft)}
    .chq-flow-item.active::before{content:"";position:absolute;left:-.78rem;top:25%;width:.2rem;height:50%;border-radius:1rem;background:var(--cc-accent)}
    .chq-phase-open{position:relative;display:block;width:100%;padding:0;border:0;background:transparent;cursor:pointer}
    .chq-phase-thumbnail{display:block;width:100%;aspect-ratio:1.55;overflow:hidden;border-radius:.22rem;background:var(--cc-court)}
    .chq-phase-thumbnail svg{display:block;width:100%;height:100%}
    .chq-flow-index{position:absolute;z-index:4;left:.35rem;top:.3rem;display:grid;place-items:center;min-width:1.25rem;height:1.15rem;padding:0 .2rem;border-radius:.2rem;background:rgba(255,255,255,.94);color:#263139;font-size:.62rem;font-weight:750;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .chq-phase-menu{position:absolute;z-index:6;right:.25rem;top:.2rem;opacity:0;transition:opacity .12s}
    .chq-flow-item:hover .chq-phase-menu,.chq-phase-menu[open],.chq-flow-item:focus-within .chq-phase-menu{opacity:1}
    .chq-phase-menu>summary{display:grid;place-items:center;width:1.65rem;height:1.4rem;list-style:none;border:0;border-radius:.2rem;background:rgba(255,255,255,.92);font-size:.68rem;cursor:pointer}
    .chq-phase-menu>summary::-webkit-details-marker{display:none}
    .chq-phase-menu>div{position:absolute;right:0;top:calc(100% + .2rem);display:grid;min-width:10.5rem;padding:.3rem;border:1px solid var(--cc-line);border-radius:.4rem;background:#fff;box-shadow:0 .7rem 1.6rem rgba(24,34,39,.15)}
    .chq-phase-menu button{min-height:2.2rem;padding:.35rem .5rem;border:0;border-radius:.25rem;background:transparent;text-align:left;font-size:.7rem;cursor:pointer}
    .chq-phase-menu button:hover{background:#f5f6f6}
    .chq-phase-add{--chq-active-phase:0;position:absolute;z-index:8;left:50%;top:calc(.65rem + (var(--chq-active-phase) * 6.3rem) + 5.4rem);display:grid;place-items:center;width:2rem;height:2rem;transform:translateX(-50%);border:1px solid var(--cc-line);border-radius:50%;background:#fff;color:var(--cc-accent);font-size:1.2rem;line-height:1;box-shadow:0 .2rem .55rem rgba(24,34,39,.12);cursor:pointer}
    .chq-phase-add:hover{border-color:#f3ad9f;background:var(--cc-accent-soft)}

    .chq-stage-panel{position:relative;display:grid;place-items:center;min-width:0;min-height:0;padding:1rem;background:#fcfcfc;overflow:hidden}
    .chq-court-wrap{position:relative;width:min(100%,calc((100dvh - 5.5rem) * 1.1515));max-width:100%;aspect-ratio:760/660;max-height:calc(100dvh - 5.5rem);overflow:hidden;background:var(--cc-court);touch-action:none;box-shadow:0 .2rem 1.35rem rgba(92,65,45,.08)}
    .chq-court-wrap>.chpd-court{display:block;width:100%;height:100%;user-select:none;-webkit-user-select:none}
    .chq-court-wrap .chpd-court-zoom{opacity:0;border-color:rgba(20,24,26,.1);background:rgba(255,255,255,.9);box-shadow:0 .25rem .7rem rgba(25,31,34,.1);transition:opacity .15s}
    .chq-court-wrap:hover .chpd-court-zoom,.chq-court-wrap:focus-within .chpd-court-zoom{opacity:1}
    .chq-court-wrap .chpd-court-zoom button{border-color:#e2e4e5;background:#fff;color:#30383d}
    .chq-court-wrap .chpd-court-zoom .chpd-zoom-value{color:#697176}
    .chq-status{display:none}
    .chq-pending{position:absolute;z-index:13;left:50%;bottom:3.6rem;max-width:min(32rem,calc(100% - 2rem));transform:translateX(-50%);padding:.55rem .75rem;border:1px solid #bfd8fa;border-radius:.45rem;background:#eaf3ff;color:#174b87;font-size:.72rem;box-shadow:0 .35rem .9rem rgba(36,82,133,.12)}
    .chq-pending[hidden],.chq-cancel-recording[hidden]{display:none}
    .chq-cancel-recording{position:absolute;z-index:14;right:1.2rem;bottom:1rem;min-height:2rem;padding:.3rem .55rem;border:1px solid #e2e4e5;border-radius:.35rem;background:#fff;color:#555f65;font-size:.68rem;cursor:pointer}
    .chq-runtime-controls,.chq-runtime-settings{display:none!important}

    .chq-inspector{display:grid;grid-template-columns:minmax(0,1fr) 4rem;min-width:0;min-height:0;border-left:1px solid var(--cc-line);background:#fff;overflow:hidden}
    .chq-inspector>.chq-card{display:none!important}
    .chq-workspace:has(.chq-inspector.is-collapsed){grid-template-columns:10rem minmax(0,1fr) 4rem}
    .chq-inspector-panel{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
    .chq-inspector.is-collapsed .chq-inspector-panel{display:none}
    .chq-inspector-head{display:flex;align-items:center;justify-content:space-between;min-height:3.5rem;padding:0 .7rem 0 .85rem;border-bottom:1px solid var(--cc-line);font-size:.87rem}
    .chq-inspector-toggle{display:grid;place-items:center;width:2rem;height:2rem;padding:0;border:0;border-radius:.25rem;background:transparent;color:#566067;font-size:1.25rem;cursor:pointer}
    .chq-inspector-toggle:hover{background:#f4f5f5}
    .chq-inspector-tabs{display:flex;flex-direction:column;align-items:stretch;gap:.45rem;padding:.55rem .45rem;border-left:1px solid var(--cc-line);background:#fff}
    .chq-inspector-tabs button{display:grid;place-items:center;width:3rem;height:3rem;border:0;border-radius:.28rem;background:transparent;color:#253039;font-size:1.35rem;cursor:pointer}
    .chq-inspector-tabs button:hover{background:#f5f6f6}
    .chq-inspector-tabs button.active{background:var(--cc-accent-soft);color:var(--cc-accent)}
    .chq-tab-panel{min-height:0;overflow:auto;padding:.65rem .85rem}
    .chq-tab-panel[hidden]{display:none}
    .chq-relation{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.75rem;padding-bottom:.65rem;border-bottom:1px solid var(--cc-line);color:#7b8388;font-size:.65rem}
    .chq-relation>div{display:flex;padding:.12rem;border:1px solid #e4e6e7;border-radius:.35rem;background:#f7f8f8}
    .chq-relation button{min-height:1.7rem;padding:.18rem .42rem;border:0;border-radius:.25rem;background:transparent;color:#697176;font-size:.62rem;cursor:pointer}
    .chq-relation button.active{background:#fff;color:#202b31;box-shadow:0 1px 3px rgba(26,34,38,.1)}
    .chq-spacing-warning{display:grid;grid-template-columns:1fr auto;gap:.5rem;align-items:center;margin-bottom:.65rem;padding:.5rem;border:1px solid #f0d58a;border-radius:.35rem;background:#fff9e8;color:#7c5b05;font-size:.64rem}
    .chq-spacing-warning[hidden]{display:none}
    .chq-spacing-warning button{border:0;background:transparent;color:#835f00;font-weight:750;cursor:pointer}
    .chq-timeline{display:grid;gap:.75rem}
    .chq-timeline-group{display:grid;gap:.1rem}
    .chq-timeline-group h3{display:grid;grid-template-columns:1.25rem minmax(0,1fr) auto;align-items:center;gap:.35rem;margin:0;padding:.35rem 0;color:#424c52;font-size:.72rem;font-weight:550;letter-spacing:0;text-transform:none}
    .chq-group-icon{font-size:1rem;color:#435059}
    .chq-drag-handle{color:#9ba1a5;font-size:.92rem;font-weight:400}
    .chq-timeline-action{display:grid;grid-template-columns:1.35rem minmax(0,1fr) auto auto auto;align-items:center;gap:.35rem;width:100%;min-height:2.75rem;padding:.35rem 0;border:0;border-radius:.25rem;background:transparent;color:#5c6469;text-align:left;cursor:pointer}
    .chq-timeline-action:hover,.chq-timeline-action:focus-visible{background:#f6f7f7}
    .chq-action-icon{display:grid;place-items:center;color:#3c474e;font-size:1rem}
    .chq-timeline-action strong{font-size:.7rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .chq-action-relation{min-width:1.65rem;color:#7d858a;font-size:.55rem;text-align:center}
    .chq-timeline-action small{color:#a0a5a8;font-size:.55rem;font-variant-numeric:tabular-nums}
    .chq-empty{display:grid;gap:.25rem;padding:1rem .4rem;color:#7e868b;font-size:.72rem;line-height:1.5;text-align:center}
    .chq-empty strong{color:#4d575d}
    .chq-rich-toolbar{display:flex;align-items:center;gap:1rem;height:2.3rem;padding:0 .05rem;border-bottom:1px solid var(--cc-line);color:#3c464c;font-size:.8rem}
    .chq-instruction-field{display:block;height:100%}
    .chq-instruction-field textarea{width:100%;min-height:20rem;padding:.75rem 0;border:0;background:#fff;color:#444e54;font-size:.75rem;line-height:1.65;resize:none;outline:none}
    .chq-defense-tools{margin-top:auto;padding:.65rem .85rem;border-top:1px solid var(--cc-line);background:#fafafa}
    .chq-defense-tools>span{display:block;margin-bottom:.4rem;color:#858c90;font-size:.62rem}
    .chq-defense-tools>div{display:grid;grid-template-columns:1fr 1fr;gap:.35rem}
    .chq-defense-tools button{min-height:2rem;border:1px solid #e2e4e5;border-radius:.3rem;background:#fff;color:#586166;font-size:.65rem;cursor:pointer}
    .chq-defense-tools button.active{border-color:#ef9c8c;background:var(--cc-accent-soft);color:#b5412d}
    .chq-overlap .token-shape,.chq-overlap ellipse,.chq-overlap circle{stroke:#e6a600!important;stroke-width:4!important}

    .chq-focus-shell button:focus-visible,.chq-focus-shell input:focus-visible,.chq-focus-shell select:focus-visible,.chq-focus-shell textarea:focus-visible,.chq-focus-shell summary:focus-visible{outline:2px solid #ef6b52;outline-offset:2px}

    @media(max-width:1180px){
      .chq-editor-toolbar{grid-template-columns:minmax(11rem,14rem) minmax(20rem,1fr) minmax(15rem,19rem)}
      .chq-workspace{grid-template-columns:8rem minmax(0,1fr) 19rem}
      .chq-workspace:has(.chq-inspector.is-collapsed){grid-template-columns:8rem minmax(0,1fr) 4rem}
      .chq-top-action{padding:0 .45rem}
      .chq-phase-add{top:calc(.65rem + (var(--chq-active-phase) * 5.15rem) + 4.35rem)}
    }

    @media(max-width:900px){
      body:has(main#app>.chq-focus-shell){overflow:auto}
      body:has(main#app>.chq-focus-shell)>main#app{overflow:visible}
      .chq-focus-shell{height:auto;min-height:100dvh;overflow:visible;grid-template-rows:auto auto}
      .chq-editor-toolbar{position:sticky;top:0;grid-template-columns:minmax(9rem,1fr) auto;height:auto;min-height:3.35rem}
      .chq-toolbar-leading{height:3.35rem;border-right:0}
      .chq-actions{height:3.35rem;border-left:0}
      .chq-toolbar-center{grid-column:1/-1;grid-row:2;height:3.15rem;border-top:1px solid var(--cc-line)}
      .chq-toolbar-tools{justify-content:flex-start;padding:0 .45rem}
      .chq-toolbar-history{margin-left:auto;margin-right:.45rem}
      .chq-workspace,.chq-workspace:has(.chq-inspector.is-collapsed){display:flex;flex-direction:column;height:auto;overflow:visible}
      .chq-stage-panel{order:1;min-height:0;padding:.55rem}
      .chq-court-wrap{width:100%;max-height:none;aspect-ratio:760/660}
      .chq-phase-rail{order:2;height:7.4rem;padding:.55rem;border-top:1px solid var(--cc-line);border-right:0;overflow:hidden}
      .chq-flow{display:flex;height:100%;gap:.6rem;overflow-x:auto;overflow-y:hidden;padding:.05rem 3rem .25rem .05rem}
      .chq-flow-item{flex:0 0 8.6rem}
      .chq-phase-add{position:absolute;left:auto;right:.5rem;top:50%;transform:translateY(-50%)}
      .chq-inspector{order:3;display:grid;grid-template-columns:minmax(0,1fr) 3.35rem;min-height:3.35rem;border-top:1px solid var(--cc-line);border-left:0}
      .chq-inspector.is-collapsed{height:3.35rem}
      .chq-inspector.is-collapsed .chq-inspector-panel{display:none}
      .chq-inspector-panel{min-height:20rem}
      .chq-inspector-tabs{flex-direction:column;padding:.2rem;border-left:1px solid var(--cc-line)}
      .chq-inspector-tabs button{width:2.8rem;height:2.8rem}
      .chq-status{position:fixed;bottom:calc(.75rem + env(safe-area-inset-bottom));max-width:calc(100vw - 1.5rem)}
    }

    @media(max-width:620px){
      .chq-editor-toolbar{grid-template-columns:minmax(7rem,1fr) auto}
      .chq-toolbar-leading{padding:0 .35rem;gap:.25rem}
      .chq-title-input{font-size:.8rem}
      .chq-title-wrap{max-width:9rem}
      .chq-actions{padding-right:.25rem}
      .chq-top-action{width:2.55rem;padding:0}
      .chq-top-action>span{display:none}
      .chq-actions>.chqw-more,.chq-actions>button[data-quick-undo],.chq-actions>button[data-quick-redo],.chq-actions>button:not(.chq-top-action){display:none}
      .chq-toolbar-center{justify-content:flex-start}
      .chq-toolbar-history{display:none}
      .chq-tool{width:2.8rem;height:2.75rem}
      .chq-stage-panel{padding:.25rem}
      .chq-phase-rail{height:6.4rem;padding:.45rem}
      .chq-flow-item{flex-basis:7.35rem}
      .chq-phase-menu{display:none}
      .chq-inspector-panel{min-height:18rem}
      .chq-defense-tools{display:none}
      .chq-pending{position:fixed;left:.75rem;right:.75rem;bottom:4rem;max-width:none;transform:none}
      .chq-cancel-recording{position:fixed;right:.9rem;bottom:4.25rem}
    }
  `;
  document.head.append(style);
}
