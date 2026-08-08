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
    .chl-library{display:grid;gap:1.1rem;color:#253139}.chl-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 11rem;gap:.55rem}.chl-toolbar input,.chl-toolbar select,.chl-collection-select{width:100%;min-height:2.65rem;border:1px solid #e1e4e5;border-radius:.3rem;background:#fff;color:inherit;padding:.6rem}.chl-toolbar input{padding-left:.8rem;background:#f6f7f7}.chl-filters{display:flex;gap:.35rem;overflow-x:auto;padding-bottom:.15rem}.chl-filter{flex:0 0 auto;min-height:2.2rem;border:1px solid #e0e3e4;border-radius:.28rem;background:#fff;color:#4f5a60;padding:.4rem .65rem;font-size:.68rem;font-weight:550;cursor:pointer}.chl-filter.active{border-color:#132630;background:#132630;color:#fff}.chl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem}.chl-play-card,.chl-playbook-card{position:relative;min-width:0;border:1px solid #e7e9ea;border-radius:.38rem;background:#fff}.chl-card-main{display:grid;grid-template-columns:2.45rem minmax(0,1fr);gap:.65rem;align-items:center;width:100%;min-height:3.65rem;padding:.55rem 2.3rem .55rem .55rem;border:0;background:transparent;text-align:left;cursor:pointer}.chl-card-main:hover{background:#fafafa}.chl-card-icon{display:grid;place-items:center;width:2.45rem;height:2.45rem;border-radius:.28rem;background:#e6f7f0;color:#27a87a;font-size:1.1rem}.chl-card-copy{min-width:0}.chl-card-copy h3{margin:0;color:#303a40;font-size:.74rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chl-card-copy small{display:block;margin-top:.2rem;color:#a0a5a8;font-size:.6rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chl-card-menu{position:absolute;right:.25rem;top:.5rem}.chl-card-menu>summary{display:grid;place-items:center;width:1.75rem;height:1.75rem;list-style:none;border:0;border-radius:.25rem;background:transparent;color:#7a8287;cursor:pointer}.chl-card-menu>summary::-webkit-details-marker{display:none}.chl-card-menu>div{position:absolute;z-index:4;right:0;top:calc(100% + .2rem);display:grid;gap:.15rem;min-width:12rem;padding:.35rem;border:1px solid #e1e4e5;border-radius:.38rem;background:#fff;box-shadow:0 .75rem 1.7rem rgba(25,33,37,.15)}.chl-actions{display:grid;gap:.15rem}.chl-actions .chq-btn{justify-content:flex-start;min-height:2.25rem;padding:.4rem .5rem;border:0;border-radius:.25rem;background:transparent;color:#4d575c;font-size:.65rem}.chl-actions .chq-btn:hover{background:#f5f6f6}.chl-card-meta{display:none}.chl-card-menu .che-field{padding:.35rem}.chl-playbooks{display:grid;gap:.65rem;padding-top:.65rem;border-top:1px solid #eceeef}.chl-playbooks-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem}.chl-playbooks-head .chq-kicker{display:none}.chl-playbooks-head h3{margin:0;font-size:.9rem}.chl-playbooks-head .chq-btn{min-height:2.35rem;border:1px solid #dfe2e3;border-radius:.3rem;background:#fff;font-size:.68rem}.chl-playbook-card{display:grid;gap:.2rem;padding:.7rem}.chl-playbook-card strong{font-size:.72rem}.chl-playbook-card span{color:#969ca0;font-size:.6rem}.chl-empty{padding:1rem;text-align:center;color:#8a9195}
    @media(max-width:820px){.chl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.chl-toolbar{grid-template-columns:1fr}.chl-grid{grid-template-columns:1fr}.chl-actions .chq-btn{min-height:44px}}
  `;
  document.head.append(style);
}

function createPlayCard(play, collections, options) {
  const card = document.createElement('article');
  card.className = 'chl-play-card';
  card.dataset.playId = play.id || '';
  card.innerHTML = `
    <button class="chl-card-main" type="button" data-library-action="open"><span class="chl-card-icon" aria-hidden="true">▤</span><span class="chl-card-copy"><h3></h3><small></small></span></button>
    <details class="chl-card-menu"><summary aria-label="Weitere Aktionen">•••</summary><div><div class="chl-actions"><button class="chq-btn" type="button" data-library-action="duplicate">Duplizieren</button><button class="chq-btn" type="button" data-library-action="archive"></button><button class="chq-btn" type="button" data-library-action="publish"></button></div><label class="che-field"><span>Zu Playbook hinzufügen</span><select class="chl-collection-select"><option value="">Playbook wählen …</option></select></label></div></details>
    <div class="chl-card-meta"><span data-state></span><div class="chl-badges"></div><p></p></div>`;
  card.querySelector('h3').textContent = play.title || 'Unbenanntes Play';
  card.querySelector('.chl-card-copy small').textContent = play.category || 'Play';
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
