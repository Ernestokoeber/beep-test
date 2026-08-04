export function injectQuickEditorStyles() {
  if (document.getElementById('courthub-quick-editor-v1')) return;
  const style = document.createElement('style');
  style.id = 'courthub-quick-editor-v1';
  style.textContent = `
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
    .chq-flow-time{font-size:.62rem;color:var(--q-muted);font-variant-numeric:tabular-nums}
    .chq-empty{color:var(--q-muted);font-size:.72rem;line-height:1.5;padding:.5rem 0}
    .chq-pending{display:flex;align-items:center;gap:.45rem;margin-top:.48rem;padding:.5rem .58rem;border-radius:.62rem;background:rgba(56,189,248,.08);color:#b9e8ff;font-size:.68rem;border:1px solid rgba(56,189,248,.18)}
    .chq-pending[hidden]{display:none}
    @media(max-width:1050px){.chq-grid{grid-template-columns:1fr}.chq-side{grid-template-columns:repeat(2,minmax(0,1fr))}.chq-side>.chq-card:last-child{grid-column:1/-1}}
    @media(max-width:720px){.chq{padding:.52rem}.chq-header{align-items:flex-start;flex-direction:column}.chq-actions{width:100%;justify-content:flex-start}.chq-mode{order:-1}.chq-side{grid-template-columns:1fr}.chq-side>.chq-card:last-child{grid-column:auto}.chq-transport{grid-template-columns:1fr}.chq-transport-buttons,.chq-speed{justify-content:center}.chq-fields{grid-template-columns:1fr}.chq-court-wrap{max-height:64vh}.chq-actions .chq-btn:not(.primary){font-size:.7rem}}
  `;
  document.head.appendChild(style);
}
