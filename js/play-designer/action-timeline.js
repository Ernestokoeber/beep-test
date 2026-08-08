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
    heading.textContent = group.actions.length > 1
      ? `Gleichzeitig · Gruppe ${groupIndex + 1}`
      : `Danach · Aktion ${groupIndex + 1}`;
    section.append(heading);
    group.actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chq-timeline-action';
      button.dataset.actionId = action.id;
      const badge = action.groupType === 'pick-and-roll' ? '<span>P&amp;R</span>' : '';
      button.innerHTML = `<strong></strong>${badge}<small>${Math.max(0, Number(action.duration) || 0).toFixed(1)} s</small>`;
      button.querySelector('strong').textContent = describeRecordedAction(step, action, core);
      button.onclick = () => onSelect?.(action);
      section.append(button);
    });
    container.append(section);
  });
}
