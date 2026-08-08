import { describeRecordedAction, recordedActions } from './phase-recorder-core.js';

function groupsFor(step, core) {
  const groups = [];
  recordedActions(step, core).forEach(action => {
    const key = Math.round((Number(action.start) || 0) * 100);
    let group = groups.find(candidate => candidate.key === key);
    if (!group) {
      group = { key, start: Number(action.start) || 0, actions: [] };
      groups.push(group);
    }
    group.actions.push(action);
  });
  return groups.sort((left, right) => left.start - right.start);
}

export function renderActionTimeline(container, step, core, onSelect) {
  container.replaceChildren();
  const groups = groupsFor(step, core);
  if (!groups.length) {
    container.innerHTML = '<div class="chq-empty"><strong>Noch keine Aktion</strong><span>Wähle oben ein Werkzeug und führe die Aktion direkt auf dem Spielfeld aus.</span></div>';
    return;
  }

  groups.forEach((group, groupIndex) => {
    const section = document.createElement('section');
    section.className = 'chq-timeline-group';
    section.dataset.simultaneous = group.actions.length > 1 ? 'true' : 'false';
    const heading = document.createElement('h3');
    heading.innerHTML = `<span class="chq-group-icon" aria-hidden="true">◇</span><span></span><span class="chq-drag-handle" aria-hidden="true">⠿</span>`;
    heading.querySelector('span:nth-child(2)').textContent = group.actions.length > 1
      ? 'Gleichzeitig'
      : groupIndex === 0 ? 'Ablauf' : 'Danach';
    section.append(heading);
    group.actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chq-timeline-action';
      button.dataset.actionId = action.id;
      const actionIcon = action.type === 'pass' ? '⇢' : action.type === 'screen' ? '⊥' : '↗';
      button.innerHTML = `<span class="chq-action-icon" aria-hidden="true">${actionIcon}</span><strong></strong><span class="chq-action-relation" aria-hidden="true">${action.groupType === 'pick-and-roll' ? 'P&amp;R' : action.relation === 'simultaneous' ? '⋈' : '↳'}</span><small>${Math.max(0, Number(action.duration) || 0).toFixed(1)} s</small><span class="chq-drag-handle" aria-hidden="true">⠿</span>`;
      button.querySelector('strong').textContent = describeRecordedAction(step, action, core);
      button.onclick = () => onSelect?.(action);
      section.append(button);
    });
    container.append(section);
  });
}
