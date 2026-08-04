export function injectVideoImportStyles() {
  if (document.getElementById('courthub-video-import-v1')) return;
  const style = document.createElement('style');
  style.id = 'courthub-video-import-v1';
  style.textContent = `
    .video-import{max-width:1500px;margin:auto;padding:1rem;color:var(--text,#13221b)}
    [data-theme="dark"] .video-import{color:#f5f8f6}
    .video-import *{box-sizing:border-box}
    .vi-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}
    .vi-head h2{margin:.15rem 0 .25rem;font-size:clamp(1.45rem,3vw,2.1rem)}
    .vi-kicker{font-size:.72rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase;color:#ec7d1d}
    .vi-head p{margin:0;color:var(--muted,#64756d);max-width:48rem;line-height:1.55}
    .vi-head-actions{display:flex;gap:.45rem;flex-wrap:wrap;justify-content:flex-end}
    .vi-btn{border:1px solid rgba(20,60,42,.16);background:var(--surface,#fff);color:inherit;border-radius:.72rem;padding:.62rem .82rem;min-height:2.55rem;font:inherit;font-weight:760;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;text-decoration:none}
    [data-theme="dark"] .vi-btn{background:#10231b;border-color:rgba(255,255,255,.12)}
    .vi-btn:hover{transform:translateY(-1px)}
    .vi-btn:disabled{opacity:.42;cursor:not-allowed;transform:none}
    .vi-btn.primary{background:linear-gradient(145deg,#ffac45,#ed7819);color:#261506;border-color:transparent}
    .vi-btn.danger{color:#b91c1c;border-color:rgba(185,28,28,.28)}
    .vi-btn.small{min-height:2.15rem;padding:.42rem .6rem;font-size:.78rem}
    .vi-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem;margin-bottom:.85rem}
    .vi-step{border:1px solid rgba(20,60,42,.13);background:rgba(255,255,255,.68);border-radius:.72rem;padding:.56rem .62rem;display:flex;gap:.48rem;align-items:center;color:var(--muted,#64756d);font-size:.74rem;font-weight:740}
    [data-theme="dark"] .vi-step{background:rgba(10,27,20,.75);border-color:rgba(255,255,255,.1)}
    .vi-step span{display:grid;place-items:center;width:1.45rem;height:1.45rem;border-radius:50%;background:rgba(236,125,29,.12);color:#d76812;flex:0 0 auto}
    .vi-step.active{border-color:#ec7d1d;color:inherit;box-shadow:0 0 0 2px rgba(236,125,29,.1)}
    .vi-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(19rem,.75fr);gap:.85rem;align-items:start}
    .vi-card{background:var(--surface,#fff);border:1px solid rgba(20,60,42,.13);border-radius:1rem;box-shadow:0 1rem 2.5rem rgba(25,51,40,.09);overflow:hidden}
    [data-theme="dark"] .vi-card{background:#0c1c16;border-color:rgba(255,255,255,.1);box-shadow:0 1rem 2.5rem rgba(0,0,0,.28)}
    .vi-card-head{padding:.78rem .9rem;border-bottom:1px solid rgba(20,60,42,.1);display:flex;justify-content:space-between;align-items:center;gap:.6rem}
    [data-theme="dark"] .vi-card-head{border-color:rgba(255,255,255,.08)}
    .vi-card-head h3{font-size:.92rem;margin:0}
    .vi-card-body{padding:.86rem}
    .vi-video-shell{position:relative;background:#020604;border-radius:.8rem;overflow:hidden;min-height:18rem;display:grid;place-items:center}
    .vi-video-shell video{width:100%;height:auto;max-height:70vh;display:block;background:#000}
    .vi-overlay{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
    .vi-empty-video{padding:3rem 1rem;text-align:center;color:#b8c5bf;line-height:1.55}
    .vi-empty-video strong{display:block;color:#fff;margin-bottom:.35rem}
    .vi-file{display:grid;gap:.45rem;padding:.8rem;border:1px dashed rgba(236,125,29,.45);border-radius:.75rem;background:rgba(236,125,29,.055);margin-bottom:.75rem}
    .vi-file input{width:100%}
    .vi-file small{color:var(--muted,#64756d)}
    .vi-controls{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.55rem;margin-top:.72rem}
    .vi-controls input[type="range"]{width:100%;accent-color:#ec7d1d}
    .vi-time{font-variant-numeric:tabular-nums;font-size:.76rem;color:var(--muted,#64756d);min-width:3.8rem;text-align:center}
    .vi-trim{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:.7rem}
    .vi-field{display:grid;gap:.28rem;margin-bottom:.65rem}
    .vi-field label{font-size:.69rem;font-weight:780;color:var(--muted,#64756d)}
    .vi-field input,.vi-field select,.vi-field textarea{width:100%;border:1px solid rgba(20,60,42,.17);background:var(--surface,#fff);color:inherit;border-radius:.64rem;padding:.6rem .65rem;font:inherit}
    [data-theme="dark"] .vi-field input,[data-theme="dark"] .vi-field select,[data-theme="dark"] .vi-field textarea{background:#06120d;border-color:rgba(255,255,255,.11)}
    .vi-field textarea{min-height:4.4rem;resize:vertical}
    .vi-help{font-size:.76rem;color:var(--muted,#64756d);line-height:1.55;margin:.15rem 0 .65rem}
    .vi-status{padding:.62rem .68rem;border-radius:.65rem;background:rgba(0,75,43,.07);color:#075c38;font-size:.75rem;line-height:1.45;margin-bottom:.7rem}
    [data-theme="dark"] .vi-status{background:rgba(61,196,127,.1);color:#8ff0bb}
    .vi-calibration-list{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin:.5rem 0 .7rem}
    .vi-calibration-list div{padding:.48rem;border-radius:.58rem;background:rgba(20,60,42,.05);font-size:.7rem;color:var(--muted,#64756d)}
    [data-theme="dark"] .vi-calibration-list div{background:rgba(255,255,255,.045)}
    .vi-calibration-list div.done{color:#087443;background:rgba(16,185,129,.09)}
    .vi-token-palette{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.35rem;margin:.55rem 0 .7rem}
    .vi-token{border:1px solid rgba(20,60,42,.14);background:rgba(255,255,255,.7);color:inherit;border-radius:.58rem;min-height:2.35rem;font-weight:850;cursor:pointer}
    [data-theme="dark"] .vi-token{background:#10231b;border-color:rgba(255,255,255,.1)}
    .vi-token.active{border-color:#ec7d1d;background:rgba(236,125,29,.12);color:#d76812}
    .vi-token.offense{box-shadow:inset 0 -.22rem 0 #1680c4}
    .vi-token.defense{box-shadow:inset 0 -.22rem 0 #303744}
    .vi-token.ball{box-shadow:inset 0 -.22rem 0 #f97316}
    .vi-keyframes{display:grid;gap:.4rem;max-height:15rem;overflow:auto;margin:.45rem 0 .7rem}
    .vi-keyframe{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:.4rem;padding:.48rem .52rem;border:1px solid rgba(20,60,42,.12);border-radius:.62rem;background:rgba(20,60,42,.025)}
    [data-theme="dark"] .vi-keyframe{border-color:rgba(255,255,255,.09);background:rgba(255,255,255,.025)}
    .vi-keyframe.active{border-color:#ec7d1d;background:rgba(236,125,29,.08)}
    .vi-keyframe button{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}
    .vi-keyframe strong{font-size:.75rem}.vi-keyframe span{font-size:.67rem;color:var(--muted,#64756d)}
    .vi-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:.42rem;margin:.6rem 0}
    .vi-summary div{padding:.58rem;border-radius:.65rem;background:rgba(20,60,42,.05);text-align:center}
    [data-theme="dark"] .vi-summary div{background:rgba(255,255,255,.045)}
    .vi-summary strong{display:block;font-size:1rem}.vi-summary span{font-size:.65rem;color:var(--muted,#64756d)}
    .vi-actions{display:flex;gap:.42rem;flex-wrap:wrap}
    .vi-note{font-size:.68rem;color:var(--muted,#64756d);line-height:1.5;margin-top:.65rem}
    @media(max-width:980px){.vi-grid{grid-template-columns:1fr}.vi-video-shell{min-height:15rem}.vi-steps{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:620px){.video-import{padding:.55rem}.vi-head{flex-direction:column}.vi-head-actions{width:100%;justify-content:flex-start}.vi-steps{display:flex;overflow:auto}.vi-step{min-width:8.5rem}.vi-token-palette{grid-template-columns:repeat(4,1fr)}.vi-trim{grid-template-columns:1fr}.vi-video-shell{min-height:12rem}.vi-summary{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}
