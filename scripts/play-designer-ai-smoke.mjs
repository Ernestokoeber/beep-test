import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://coach.tsv-lindau.de/#/tactics',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const window = dom.window;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MutationObserver = window.MutationObserver;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;

const settings = new Map();
window.BT = {
  util: { uuid: (() => { let index = 0; return (prefix = 'id_') => `${prefix}${++index}`; })(), toast: () => {} },
  sync: { getState: () => ({ user: { role: 'coach' } }) },
  storage: {
    getSetting: (key, fallback) => settings.has(key) ? structuredClone(settings.get(key)) : structuredClone(fallback),
    setSetting: (key, value) => { settings.set(key, structuredClone(value)); return value; },
    getTemplates: () => [],
    getTactics: () => [],
    upsertTactic: (value) => value
  },
  api: {
    ai: async (action, payload) => {
      assert(action === 'explainTactic', 'Falsche KI-Aktion');
      assert(payload.tactic.schemaVersion === 3, 'Schema-Version fehlt im Request');
      return {
        text: 'Horns öffnet die Mitte und zwingt die Verteidigung zu einer klaren Entscheidung.',
        coachingPoints: ['Screenwinkel zeigen', 'Passfenster abwarten', 'Nach dem Screen hart abrollen'],
        model: 'gemini-3.8-flash',
        requestId: 'ai_tactic'
      };
    }
  }
};
window.eval(readFileSync(new URL('../js/tactics.js', import.meta.url), 'utf8'));

const core = window.BT.tactics.__core;
const quick = await import('../js/play-designer/quick-core.js');
const { serializeTactic, openAIExplanation } = await import('../js/play-designer/ai-explanation.js');

let board = core.defaultBoard();
board.title = 'Horns gegen Zone';
board.category = 'Zone-Offense';
board.tags = ['Horns', 'Pick & Roll'];
board.steps[0].instruction = '1 nutzt den Screen, 5 rollt ab und 4 blockt für 3.';
core.elementById(board.steps[0], 'd2').defenseMode = 'zone';
board = quick.addQuickPickAndRoll(board, {
  stepIndex: 0,
  relation: 'same',
  handlerId: 'o1',
  screenerId: 'o5',
  targetDefenderId: 'd1',
  handlerPath: [{ x: 250, y: 388 }, { x: 315, y: 300 }],
  screenPoint: { x: 285, y: 340 },
  rollPath: [{ x: 285, y: 340 }, { x: 260, y: 150 }],
  angle: 25
}, core);
board = quick.addQuickPass(board, { stepIndex: 0, relation: 'same', fromId: 'o1', toId: 'o2', curve: -30 }, core);
board = quick.addQuickScreen(board, {
  stepIndex: 0,
  relation: 'same',
  actorId: 'o4',
  beneficiaryId: 'o3',
  targetDefenderId: 'd3',
  point: { x: 350, y: 250 },
  angle: -40
}, core);

const payload = serializeTactic(board, core);
assert(payload.schemaVersion === 3, 'Taktikpayload hat die falsche Schema-Version');
assert(payload.phases.some((phase) => phase.actions.some((action) => action.type === 'screen')), 'Screen fehlt im KI-Payload');
assert(payload.phases.some((phase) => phase.actions.some((action) => action.groupType === 'pick-and-roll')), 'Pick-and-Roll fehlt');
assert(payload.phases.some((phase) => phase.defense.some((player) => player.mode === 'zone')), 'Zonenverteidigung fehlt');
assert(payload.phases.some((phase) => phase.actions.some((action) => action.relation === 'simultaneous')), 'Gleichzeitigkeit fehlt');
assert(payload.phases.some((phase) => phase.actions.some((action) => action.type === 'pass' && action.actor === 'o1' && action.receiver === 'o2')), 'Pass fehlt im KI-Payload');
assert(payload.phases[0].instruction.includes('rollt'), 'Phasenanweisung fehlt');

settings.set('tacticsBoardDraft', structuredClone(board));
const root = window.document.createElement('section');
root.innerHTML = `
  <div class="chq-actions"></div>
  <div class="chq-toolbar-history"></div>
  <details class="chq-header-more"><summary>Mehr</summary><div class="chq-header-menu"></div></details>
  <div class="chq-fields"></div>
  <div data-role="flow"></div>
  <div class="chq-stage-copy"></div>
`;
window.document.body.append(root);
const { enhanceQuickEditor } = await import('../js/play-designer/quick-workflow.js');
enhanceQuickEditor(root, null, { reload: () => {} });
const explainButton = root.querySelector('[data-more="ai-explain"]');
assert(explainButton, 'KI-Erklärung fehlt im Mehr-Menü');
explainButton.click();
await new Promise((resolve) => window.setTimeout(resolve, 0));

const dialog = window.document.querySelector('[data-ai-explanation]');
assert(dialog?.getAttribute('role') === 'dialog', 'KI-Erklärung öffnet keinen Dialog');
assert(dialog.textContent.includes('gemini-3.8-flash'), 'Modellanzeige fehlt');
assert(dialog.textContent.includes('ai_tactic'), 'Request-ID fehlt');
assert(dialog.querySelector('[data-ai-copy]'), 'Kopierbutton fehlt');
assert(dialog.querySelector('[data-ai-apply]')?.textContent.includes('Als Coaching Points übernehmen'), 'Übernehmen fehlt trotz Bearbeitungsrecht');

window.confirm = () => true;
dialog.querySelector('[data-ai-apply]').click();
await new Promise((resolve) => window.setTimeout(resolve, 0));
assert(settings.get('tacticsBoardDraft').description.includes('Screenwinkel'), 'Coaching Points wurden nicht gespeichert');

dialog.querySelector('[data-ai-close]').click();
const readonlyCore = { ...core, canEdit: () => false };
const readonlyDialog = await openAIExplanation({ board, core: readonlyCore, saveDescription: () => { throw new Error('Nur-Lesen darf nicht speichern'); }, toast: () => {} });
assert(!readonlyDialog.querySelector('[data-ai-apply]'), 'Nur-Lesen-Ansicht darf Coaching Points nicht übernehmen');

console.log('CourtHub Taktik-KI: Schema-3-Serializer und Quick-Editor-Dialog erfolgreich.');
