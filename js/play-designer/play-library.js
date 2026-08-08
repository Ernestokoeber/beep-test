const FILTERS = [
  ['man-offense', 'Mann-Offense'],
  ['zone-offense', 'Zone-Offense'],
  ['pick-and-roll', 'Pick & Roll'],
  ['horns', 'Horns'],
  ['inbound', 'Einwurf'],
  ['press-break', 'Press Break']
];

function searchable(play) {
  return `${play?.title || ''} ${play?.category || ''} ${play?.description || ''} ${(play?.tags || []).join(' ')}`.toLowerCase();
}

function containsPickAndRoll(play) {
  if (searchable(play).includes('pick') || searchable(play).includes('p&r')) return true;
  return (play?.steps || []).some(step => {
    const transition = step?.transition || {};
    return ['motions', 'passes', 'screens'].some(key =>
      (transition[key] || []).some(action => action.groupType === 'pick-and-roll')
    );
  });
}

function matchesFilter(play, filter) {
  if (!filter) return true;
  const text = searchable(play);
  if (filter === 'man-offense') return text.includes('mann-offense') || text.includes('gegen mann');
  if (filter === 'zone-offense') return text.includes('zone-offense') || text.includes('gegen zone');
  if (filter === 'pick-and-roll') return containsPickAndRoll(play);
  if (filter === 'horns') return text.includes('horns');
  if (filter === 'inbound') return text.includes('einwurf') || text.includes('inbound');
  if (filter === 'press-break') return text.includes('press break') || text.includes('press-break') || text.includes('presse brechen');
  return true;
}

export function filterAndSortPlays(playsInput, state = {}) {
  const query = String(state.query || '').trim().toLowerCase();
  const output = (Array.isArray(playsInput) ? playsInput : []).filter(play =>
    (!query || searchable(play).includes(query))
      && matchesFilter(play, state.filter)
      && (state.showArchived === true || play.archived !== true)
  );
  const sort = state.sort || 'updated';
  return output.sort((left, right) => {
    if (sort === 'title') return String(left.title || '').localeCompare(String(right.title || ''), 'de');
    if (sort === 'category') return String(left.category || '').localeCompare(String(right.category || ''), 'de')
      || String(left.title || '').localeCompare(String(right.title || ''), 'de');
    return String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || ''));
  });
}

function injectStyles() {
  if (document.getElementById('courthub-play-library-2')) return;
  const style = document.createElement('style');
  style.id = 'courthub-play-library-2';
  style.textContent = `
    .chl-library{display:grid;gap:1rem}.chl-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 12rem;gap:.55rem}.chl-toolbar input,.chl-toolbar select,.chl-collection-select{width:100%;border:1px solid rgba(20,60,42,.17);border-radius:.65rem;background:var(--surface,#fff);color:inherit;padding:.62rem}.chl-filters{display:flex;gap:.35rem;overflow-x:auto;padding-bottom:.15rem}.chl-filter{flex:0 0 auto;min-height:2.35rem;border:1px solid rgba(20,60,42,.14);border-radius:999px;background:rgba(20,60,42,.04);color:inherit;padding:.45rem .68rem;font-weight:800;cursor:pointer}.chl-filter.active{border-color:#ec7d1d;background:rgba(236,125,29,.12);color:#d76812}.chl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:.65rem}.chl-play-card,.chl-playbook-card{display:grid;gap:.55rem;padding:.75rem;border:1px solid rgba(20,60,42,.12);border-radius:.8rem;background:rgba(20,60,42,.025)}.chl-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.55rem}.chl-card-head h3{margin:0;font-size:.88rem}.chl-badges{display:flex;gap:.25rem;flex-wrap:wrap}.chl-badge{padding:.13rem .35rem;border-radius:999px;background:rgba(14,107,70,.1);color:#0e6b46;font-size:.55rem;font-weight:850}.chl-play-card p{margin:0;color:var(--muted,#64756d);font-size:.68rem;line-height:1.45}.chl-actions{display:flex;gap:.35rem;flex-wrap:wrap}.chl-actions .chq-btn{min-height:2.25rem;padding:.42rem .55rem;font-size:.65rem}.chl-playbooks{display:grid;gap:.55rem}.chl-playbooks-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem}.chl-playbooks-head h3{margin:0;font-size:.9rem}.chl-playbook-card strong{font-size:.78rem}.chl-playbook-card span{color:var(--muted,#64756d);font-size:.65rem}.chl-empty{padding:1rem;text-align:center;color:var(--muted,#64756d)}
    [data-theme="dark"] .chl-toolbar input,[data-theme="dark"] .chl-toolbar select,[data-theme="dark"] .chl-collection-select{background:#06120d;border-color:rgba(255,255,255,.12)}[data-theme="dark"] .chl-play-card,[data-theme="dark"] .chl-playbook-card{border-color:rgba(255,255,255,.09);background:rgba(255,255,255,.025)}[data-theme="dark"] .chl-badge{color:#9ae6c4;background:rgba(14,107,70,.24)}
    @media(max-width:620px){.chl-toolbar{grid-template-columns:1fr}.chl-actions .chq-btn{min-height:44px}}
  `;
  document.head.append(style);
}

function createPlayCard(play, collections, options) {
  const card = document.createElement('article');
  card.className = 'chl-play-card';
  card.dataset.playId = play.id || '';
  card.innerHTML = `
    <div class="chl-card-head"><div><span class="chq-kicker"></span><h3></h3></div><span class="chl-badge" data-state></span></div>
    <div class="chl-badges"></div><p></p>
    <div class="chl-actions"><button class="chq-btn primary" type="button" data-library-action="open">Öffnen</button><button class="chq-btn" type="button" data-library-action="duplicate">Duplizieren</button><button class="chq-btn" type="button" data-library-action="archive"></button><button class="chq-btn" type="button" data-library-action="publish"></button></div>
    <label class="che-field"><span>Zu Playbook hinzufügen</span><select class="chl-collection-select"><option value="">Playbook wählen …</option></select></label>`;
  card.querySelector('.chq-kicker').textContent = play.category || 'Play';
  card.querySelector('h3').textContent = play.title || 'Unbenanntes Play';
  card.querySelector('[data-state]').textContent = play.published ? 'Veröffentlicht' : play.archived ? 'Archiviert' : 'Entwurf';
  card.querySelector('p').textContent = play.description || 'Keine Beschreibung hinterlegt.';
  const badges = card.querySelector('.chl-badges');
  [...new Set(play.tags || [])].forEach(value => {
    const badge = document.createElement('span');
    badge.className = 'chl-badge';
    badge.textContent = value;
    badges.append(badge);
  });
  const archive = card.querySelector('[data-library-action="archive"]');
  archive.textContent = play.archived ? 'Wiederherstellen' : 'Archivieren';
  const publish = card.querySelector('[data-library-action="publish"]');
  publish.textContent = play.published ? 'Zurückziehen' : 'Veröffentlichen';
  card.querySelector('[data-library-action="open"]').onclick = () => options.onOpen?.(play);
  card.querySelector('[data-library-action="duplicate"]').onclick = () => options.onDuplicate?.(play);
  archive.onclick = () => options.onArchive?.(play);
  publish.onclick = () => options.onPublish?.(play);
  const collectionSelect = card.querySelector('.chl-collection-select');
  collections.forEach(collection => {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = collection.title;
    collectionSelect.append(option);
  });
  collectionSelect.onchange = () => {
    if (!collectionSelect.value) return;
    options.onAddToCollection?.(play, collectionSelect.value);
    collectionSelect.value = '';
  };
  return card;
}

export function createPlayLibrary(options = {}) {
  injectStyles();
  const plays = Array.isArray(options.plays) ? options.plays : [];
  const collections = Array.isArray(options.collections) ? options.collections : [];
  const state = { query: '', filter: '', sort: 'updated', showArchived: false };
  const root = document.createElement('section');
  root.className = 'chl-library';
  root.innerHTML = `
    <div class="chl-toolbar"><input type="search" data-role="library-search" placeholder="Titel, Kategorie oder Beschreibung suchen …" aria-label="Taktik suchen"><select data-role="library-sort"><option value="updated">Zuletzt geändert</option><option value="title">Titel</option><option value="category">Kategorie</option></select></div>
    <div class="chl-filters"><button class="chl-filter active" type="button" data-library-filter="">Alle</button></div>
    <label class="che-check"><input type="checkbox" data-role="show-archived"> Archivierte Plays anzeigen</label>
    <div class="chl-grid" data-role="library-grid"></div>
    <section class="chl-playbooks"><div class="chl-playbooks-head"><div><span class="chq-kicker">Sammlungen</span><h3>Playbooks</h3></div><button class="chq-btn" type="button" data-action="create-playbook">Neues Playbook</button></div><div class="chl-grid" data-role="playbook-grid"></div></section>`;
  const filters = root.querySelector('.chl-filters');
  FILTERS.forEach(([id, label]) => {
    const button = document.createElement('button');
    button.className = 'chl-filter';
    button.type = 'button';
    button.dataset.libraryFilter = id;
    button.textContent = label;
    filters.append(button);
  });

  const render = () => {
    const grid = root.querySelector('[data-role="library-grid"]');
    grid.replaceChildren();
    filterAndSortPlays(plays, state).forEach(play => grid.append(createPlayCard(play, collections, options)));
    if (!grid.children.length) grid.innerHTML = '<div class="chl-empty">Keine passenden Plays gefunden.</div>';
    root.querySelectorAll('[data-library-filter]').forEach(button => button.classList.toggle('active', button.dataset.libraryFilter === state.filter));
  };

  const playbookGrid = root.querySelector('[data-role="playbook-grid"]');
  collections.forEach(collection => {
    const card = document.createElement('article');
    card.className = 'chl-playbook-card';
    card.innerHTML = '<strong></strong><span></span>';
    card.querySelector('strong').textContent = collection.title || 'Playbook';
    card.querySelector('span').textContent = `${(collection.playIds || []).length} Plays`;
    playbookGrid.append(card);
  });
  if (!playbookGrid.children.length) playbookGrid.innerHTML = '<div class="chl-empty">Noch keine Playbook-Sammlung angelegt.</div>';

  root.querySelector('[data-role="library-search"]').oninput = event => { state.query = event.target.value; render(); };
  root.querySelector('[data-role="library-sort"]').onchange = event => { state.sort = event.target.value; render(); };
  root.querySelector('[data-role="show-archived"]').onchange = event => { state.showArchived = event.target.checked; render(); };
  filters.onclick = event => {
    const button = event.target.closest('[data-library-filter]');
    if (!button) return;
    state.filter = button.dataset.libraryFilter;
    render();
  };
  root.querySelector('[data-action="create-playbook"]').onclick = () => {
    const title = options.requestTitle?.() ?? window.prompt?.('Name des neuen Playbooks:');
    if (String(title || '').trim()) options.onCreateCollection?.(String(title).trim());
  };
  render();
  return root;
}

export { FILTERS as PLAY_FILTERS };
