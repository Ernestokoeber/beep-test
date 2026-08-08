import { createCourt, drawCourt } from './rendering.js';
import { recordedActions } from './phase-recorder-core.js';

export function visiblePhases(board) {
  if (!board?.steps?.length) return [];
  return board.steps.slice(0, Math.max(1, board.steps.length - 1));
}

export function renderPhaseRail(container, board, activeIndex, core, onSelect, onAction) {
  container.replaceChildren();
  visiblePhases(board).forEach((step, index) => {
    const row = document.createElement('article');
    row.className = `chq-flow-item chq-phase-card${index === activeIndex ? ' active' : ''}`;
    row.dataset.phaseId = step.phaseId || '';
    row.dataset.phaseIndex = String(index);
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');

    const number = document.createElement('span');
    number.className = 'chq-flow-index';
    number.textContent = String(index + 1).padStart(2, '0');

    const thumbnail = document.createElement('span');
    thumbnail.className = 'chq-phase-thumbnail';
    const svg = createCourt('chpd-court chq-thumbnail-court');
    drawCourt(svg, step, { sourceStep: step, showGuides: true });
    thumbnail.append(svg);

    const copy = document.createElement('span');
    copy.className = 'chq-flow-copy';
    const actions = recordedActions(step, core);
    copy.innerHTML = `<strong>Phase ${index + 1}</strong><span>${actions.length ? `${actions.length} Aktion${actions.length === 1 ? '' : 'en'}` : 'Grundaufstellung / Pause'}</span>`;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'chq-phase-open';
    open.setAttribute('aria-label', `Phase ${index + 1} öffnen`);
    open.append(number, thumbnail, copy);
    open.onclick = () => onSelect?.(index);

    const menu = document.createElement('details');
    menu.className = 'chq-phase-menu';
    menu.dataset.phaseMenu = String(index);
    menu.innerHTML = `<summary aria-label="Menü für Phase ${index + 1}" title="Phase bearbeiten">•••</summary><div><button type="button" data-phase-action="edit">Aktionen bearbeiten</button><button type="button" data-phase-action="duplicate">Duplizieren</button><button type="button" data-phase-action="insert-before">Davor einfügen</button><button type="button" data-phase-action="insert-after">Danach einfügen</button><button type="button" data-phase-action="delete">Löschen</button></div>`;
    menu.onclick = event => {
      const action = event.target.closest('[data-phase-action]')?.dataset.phaseAction;
      if (!action) return;
      event.preventDefault();
      menu.open = false;
      onAction?.(action, index);
    };
    row.append(open, menu);
    container.append(row);
  });

  if (!container.children.length) {
    container.innerHTML = '<div class="chq-empty">Noch keine Phase vorhanden.</div>';
  }
}
