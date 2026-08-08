function icon(content, className = '') {
  return `<svg class="chq-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${content}</svg>`;
}

const ICONS = {
  back: icon('<path d="m15 18-6-6 6-6"/>'),
  select: icon('<path d="m5 3 14 8-6 2-3 6L5 3Z"/>'),
  move: icon('<path d="M5 18c3-7 5-9 13-12"/><path d="m13 5 5 1-1 5"/>'),
  pass: icon('<path d="M5 18c3-7 6-9 13-12" class="dashed"/><path d="m13 5 5 1-1 5"/>'),
  screen: icon('<path d="M5 18c3-7 6-9 13-12"/><path d="m14 4 5 2-2 5"/><path d="m4 17 5 3"/>'),
  pick: icon('<path d="M5 17c2-6 5-9 12-10"/><path d="m13 5 4 2-2 4"/><circle cx="7" cy="7" r="2.2"/>'),
  ball: icon('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c-3 4-3 12 0 16M12 4c3 4 3 12 0 16"/>'),
  play: icon('<circle cx="12" cy="12" r="8"/><path d="m10 8 6 4-6 4Z"/>'),
  export: icon('<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 14v5h14v-5"/>'),
  preview: icon('<path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/>'),
  more: icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')
};

function tool(id, label, iconMarkup, title = label) {
  return `<button class="chq-tool${id === 'select' ? ' active' : ''}" type="button" data-tool="${id}" title="${title}" aria-label="${label}">${iconMarkup}<span>${label}</span></button>`;
}

export function editorToolbarMarkup() {
  return `
    <header class="chq-header chq-editor-toolbar" aria-label="Play-Editor Werkzeugleiste">
      <div class="chq-toolbar-leading">
        <button class="chq-icon-button chq-back" type="button" data-action="back-library" title="Zurück zur Taktikbibliothek" aria-label="Zurück zur Taktikbibliothek">${ICONS.back}</button>
        <label class="chq-title-wrap">
          <span class="visually-hidden">Playname</span>
          <input class="chq-title-input" maxlength="100" data-role="title" aria-label="Playname" value="Neues Play">
          <span class="chq-title-chevron" aria-hidden="true">⌄</span>
          <span class="chq-save-state" data-role="save-state" role="status">Änderungen lokal gesichert</span>
        </label>
      </div>

      <div class="chq-toolbar-center">
        <div class="chq-toolbar-tools" role="toolbar" aria-label="Basketball-Aktionen">
          ${tool('select', 'Auswahl', ICONS.select, 'Auswählen und Grundaufstellung verschieben')}
          ${tool('move', 'Lauf', ICONS.move, 'Lauf oder Dribbling zeichnen')}
          ${tool('pass', 'Pass', ICONS.pass, 'Pass einzeichnen')}
          ${tool('screen', 'Screen', ICONS.screen, 'Screen setzen')}
          ${tool('pick-and-roll', 'Pick & Roll', ICONS.pick, 'Pick & Roll aufnehmen')}
          ${tool('ball', 'Ball', ICONS.ball, 'Ballführer festlegen')}
        </div>
        <div class="chq-toolbar-history" aria-label="Verlauf"></div>
      </div>

      <div class="chq-actions">
        <button class="chq-top-action" type="button" data-action="open-animation" title="Play auf dem Spielfeld abspielen">${ICONS.play}<span>Play</span></button>
        <button class="chq-top-action" type="button" data-action="export" title="Play exportieren">${ICONS.export}<span>Export</span></button>
        <button class="chq-top-action" type="button" data-action="preview" title="Playbook-Vorschau öffnen">${ICONS.preview}<span>Vorschau</span></button>
        <details class="chq-header-more">
          <summary class="chq-icon-button" title="Weitere Aktionen" aria-label="Weitere Aktionen">${ICONS.more}</summary>
          <div class="chq-header-menu">
            <button type="button" data-action="save">Speichern &amp; synchronisieren</button>
            <button type="button" data-action="new">Neues Play</button>
            <button type="button" data-action="video-import">Video → Play</button>
            <button type="button" data-action="pro-mode">Profi-Modus</button>
            <button class="danger" type="button" data-action="delete">Play löschen</button>
          </div>
        </details>
      </div>
    </header>`;
}
