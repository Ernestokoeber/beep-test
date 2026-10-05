// Shared by classic training views and the module-based matchday.
(function(root) {
  const copy = value => JSON.parse(JSON.stringify(value));
  const roles = [['coach', 'Trainer'], ['assistant', 'Co-Trainer']];
  const statuses = [['present', 'Anwesend'], ['pending', 'Offen'], ['absent', 'Abwesend'], ['excused', 'Entschuldigt']];
  const idOK = value => typeof value === 'string' && value.length > 0 && value.length <= 120 && !['__proto__', 'constructor', 'prototype'].includes(value);
  function validate(staff) {
    if (staff === undefined) return;
    if (!Array.isArray(staff) || staff.length > 2) throw Error('Ungültiges Trainerteam.');
    const seenRoles = new Set(), seenPeople = new Set(), seenNames = new Set();
    for (const member of staff) {
      if (!member || !roles.some(([role]) => role === member.role) || typeof member.name !== 'string' || !member.name.trim() || member.name.length > 100 ||
          !(member.playerId === null || idOK(member.playerId)) || typeof member.alsoPlayer !== 'boolean' || !statuses.some(([status]) => status === member.status)) throw Error('Ungültiger Trainer-Slot.');
      const person = member.playerId ? 'id:' + member.playerId : 'name:' + member.name.trim().toLocaleLowerCase('de');
      if (seenRoles.has(member.role) || seenPeople.has(person) || seenNames.has(member.name.trim().toLocaleLowerCase('de'))) throw Error('Eine Person kann nicht beide Trainer-Slots belegen.');
      seenRoles.add(member.role); seenPeople.add(person); seenNames.add(member.name.trim().toLocaleLowerCase('de'));
      if (!member.playerId && member.alsoPlayer) throw Error('Spielertrainer müssen mit einem Spielerprofil verknüpft sein.');
    }
  }
  const isCoachOnly = (event, playerId) => (event?.staff || []).some(member => member.playerId === playerId && !member.alsoPlayer);
  const playerAttendance = training => (training?.attendance || []).filter(entry => !isCoachOnly(training, entry.playerId));
  const lines = staff => (staff || []).map(member => `${roles.find(([role]) => role === member.role)?.[1] || member.role}: ${member.name} · ${statuses.find(([status]) => status === member.status)?.[1] || member.status}${member.alsoPlayer ? ' · Auch als Spieler' : ''}`);
  function summary(container, staff) {
    const section = document.createElement('section'); section.className = 'coaching-staff-summary'; section.dataset.role = 'staff-summary';
    const title = document.createElement('h3'); title.textContent = 'Trainerteam'; section.append(title);
    for (const line of lines(staff).length ? lines(staff) : ['Trainer und Co-Trainer noch nicht zugeordnet.']) { const p = document.createElement('p'); p.textContent = line; section.append(p); }
    container.append(section); return section;
  }
  function mountEditor(container, {staff = [], players = [], onChange = () => {}, readOnly = false} = {}) {
    let accepted = copy(staff); validate(accepted);
    const section = document.createElement('details'); section.className = 'coaching-staff'; section.dataset.role = 'staff-editor';
    const heading = document.createElement('summary');
    const updateHeading = () => { heading.textContent = 'Trainerteam · ' + (accepted.length ? accepted.map(member => `${member.role === 'coach' ? 'Trainer' : 'Co-Trainer'}: ${member.name}`).join(' · ') : 'Trainer / Co-Trainer zuordnen'); }; updateHeading();
    const hint = document.createElement('p'); hint.textContent = 'Trainer und Co-Trainer separat zuordnen. „Auch als Spieler“ zählt die Person zusätzlich zum Spielerkader.';
    const grid = document.createElement('div'); grid.className = 'coaching-staff-grid';
    const error = document.createElement('p'); error.setAttribute('role', 'status'); error.className = 'coaching-staff-error';
    const rows = [];
    const input = (parent, role, label, field, type) => {
      const wrap = document.createElement('label'); wrap.textContent = label;
      const node = document.createElement(type === 'select' ? 'select' : 'input'); if (type !== 'select') node.type = type;
      node.dataset.staffField = field; node.setAttribute('aria-label', `${role}: ${label}`); wrap.append(node); parent.append(wrap); return node;
    };
    for (const [role, label] of roles) {
      const saved = accepted.find(member => member.role === role);
      const card = document.createElement('fieldset'); card.dataset.staffRole = role; card.disabled = readOnly;
      const legend = document.createElement('legend'); legend.textContent = label; card.append(legend);
      const person = input(card, label, 'Person', 'person', 'select');
      const candidates = new Map(players.filter(player => !player.archived).map(player => [player.id, player]));
      if (saved?.playerId && !candidates.has(saved.playerId)) candidates.set(saved.playerId, {id: saved.playerId, name: saved.name});
      for (const [value, text] of [['', 'Nicht zugeordnet'], ['external', 'Name frei eingeben'], ...[...candidates.values()].sort((a,b) => a.name.localeCompare(b.name, 'de')).map(player => [player.id, player.name])]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; person.append(option);
      }
      person.value = saved?.playerId || (saved ? 'external' : '');
      const name = input(card, label, 'Name', 'name', 'text'); name.maxLength = 100; name.value = saved?.name || '';
      const status = input(card, label, 'Anwesenheit', 'status', 'select');
      for (const [value, text] of statuses) { const option = document.createElement('option'); option.value = value; option.textContent = text; status.append(option); } status.value = saved?.status || 'present';
      const playing = input(card, label, 'Auch als Spieler', 'alsoPlayer', 'checkbox'); playing.checked = saved?.alsoPlayer || false; playing.parentElement.className = 'coaching-staff-playing';
      const row = {role, person, name, status, playing, candidates}; rows.push(row); grid.append(card);
      function sync() { const linked = person.value && person.value !== 'external'; name.parentElement.hidden = Boolean(linked) || !person.value; name.readOnly = Boolean(linked); name.disabled = !person.value; status.disabled = !person.value; playing.parentElement.hidden = !linked; playing.disabled = !linked; if (!linked) playing.checked = false; }
      person.addEventListener('change', () => { name.value = candidates.get(person.value)?.name || ''; playing.checked = false; sync(); emit(); });
      name.addEventListener('change', emit); status.addEventListener('change', emit); playing.addEventListener('change', emit); sync();
    }
    function emit() {
      const next = rows.filter(row => row.person.value && row.name.value.trim()).map(row => ({role: row.role, name: row.name.value.trim(), playerId: row.person.value === 'external' ? null : row.person.value, status: row.status.value, alsoPlayer: row.playing.checked}));
      try { validate(next); accepted = next; updateHeading(); error.textContent = ''; onChange(copy(next)); }
      catch (reason) { error.textContent = reason.message; }
    }
    section.append(heading, hint, grid, error); container.append(section);
    return {read: () => copy(accepted), setReadOnly(value) { for (const fieldset of grid.children) fieldset.disabled = value; }};
  }
  root.CourtHubStaff = {validate, isCoachOnly, playerAttendance, lines, summary, mountEditor};
  if (typeof window !== 'undefined') { window.BT = window.BT || {}; window.BT.staff = root.CourtHubStaff; }
})(globalThis);
