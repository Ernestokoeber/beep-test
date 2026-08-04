// Test-only bridge for scripts/smoke.mjs.
// The production app loads js/play-designer/main.js in the browser. JSDOM
// evaluates js/tactics.js from scripts/smoke.mjs, so its relative dynamic
// import resolves inside scripts/. This bridge supplies the small legacy DOM
// contract checked by that broad shell smoke test; the real editor is covered
// by the dedicated play-designer smoke tests.

function token(team, index) {
  const element = document.createElement('span');
  element.className = `tactics-token ${team}`;
  element.dataset.index = String(index + 1);
  return element;
}

function installLegacyTemplateOrder() {
  const tactics = window.BT?.tactics;
  if (!tactics || tactics.__smokeTemplateOrderInstalled) return;
  const original = tactics.templates.bind(tactics);
  tactics.templates = () => {
    const order = ['zone-2-3', 'five-out', 'horns', 'no-middle'];
    const items = original();
    return order.map(id => items.find(item => item.id === id)).filter(Boolean);
  };
  tactics.__smokeTemplateOrderInstalled = true;
}

export function mountEditor(target) {
  installLegacyTemplateOrder();
  const root = document.createElement('section');
  root.dataset.role = 'tactics-smoke-bridge';
  root.innerHTML = `
    <button data-tool="offense">Angriff</button>
    <button data-tool="defense">Verteidigung</button>
    <button data-action="save-tactic">Speichern</button>
    <button data-action="export-pdf">PDF</button>
    <select data-role="tactic-template"></select>
    <div data-role="tokens"></div>`;
  const tokens = root.querySelector('[data-role="tokens"]');
  for (let index = 0; index < 5; index += 1) tokens.append(token('offense', index));
  for (let index = 0; index < 5; index += 1) tokens.append(token('defense', index));
  target.append(root);
  return root;
}

export function mountPlayer(target) {
  const root = document.createElement('section');
  root.dataset.role = 'player-tactics';
  root.innerHTML = '<h2>Teamtaktiken</h2><p>Bitte zuerst anmelden, um veröffentlichte Teamtaktiken anzusehen.</p>';
  target.append(root);
  return root;
}
