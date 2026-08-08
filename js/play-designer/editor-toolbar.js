export function editorToolbarMarkup() {
  return `
    <header class="chq-header chq-editor-toolbar" aria-label="Play-Editor Werkzeugleiste">
      <div class="chq-toolbar-leading">
        <button class="chq-btn chq-back" type="button" data-action="back-library" title="Zurück zur Taktikbibliothek" aria-label="Zurück zur Taktikbibliothek">← <span>Bibliothek</span></button>
        <div class="chq-brand">
          <div class="chq-logo" aria-hidden="true">CH</div>
          <div class="chq-title-stack">
            <span class="chq-kicker">CourtHub Play Editor 2.0</span>
            <input class="chq-title-input" maxlength="100" data-role="title" aria-label="Playname" value="Neues Play">
            <span class="chq-save-state" data-role="save-state" role="status">Entwurf bereit</span>
          </div>
        </div>
      </div>

      <div class="chq-toolbar-tools" role="toolbar" aria-label="Basketball-Aktionen">
        <button class="chq-tool active" type="button" data-tool="select" title="Auswahl und Grundaufstellung" aria-label="Auswahl und Grundaufstellung"><span aria-hidden="true">✥</span><small>Auswahl</small></button>
        <button class="chq-tool" type="button" data-tool="move" title="Lauf oder Dribbling zeichnen" aria-label="Lauf oder Dribbling"><span aria-hidden="true">→</span><small>Lauf</small></button>
        <button class="chq-tool" type="button" data-tool="pass" title="Pass einzeichnen" aria-label="Pass"><span aria-hidden="true">⇢</span><small>Pass</small></button>
        <button class="chq-tool" type="button" data-tool="screen" title="Screen setzen" aria-label="Screen"><span aria-hidden="true">⊥</span><small>Screen</small></button>
        <button class="chq-tool" type="button" data-tool="pick-and-roll" title="Pick and Roll aufnehmen" aria-label="Pick and Roll"><span aria-hidden="true">P&amp;R</span><small>Pick &amp; Roll</small></button>
        <button class="chq-tool" type="button" data-tool="ball" title="Ballführer festlegen" aria-label="Ballführer festlegen"><span aria-hidden="true">●</span><small>Ball</small></button>
      </div>

      <div class="chq-actions">
        <button class="chq-btn" type="button" data-action="preview" title="Nicht bearbeitbare Playbook-Vorschau">Vorschau</button>
        <button class="chq-btn" type="button" data-action="export" title="PDF, Bild oder Animation exportieren">Export</button>
        <button class="chq-btn icon primary" type="button" data-action="open-animation" aria-label="Animationsplayer öffnen" title="Animationsplayer öffnen">▶</button>
        <button class="chq-btn primary" type="button" data-action="save">Speichern</button>
        <details class="chq-header-more"><summary class="chq-btn" title="Weitere Editor-Aktionen">Mehr</summary><div class="chq-header-menu"><button class="chq-btn" type="button" data-action="new">Neues Play</button><button class="chq-btn" type="button" data-action="video-import">Video → Play</button><button class="chq-btn" type="button" data-action="pro-mode">Profi-Modus</button><button class="chq-btn danger" type="button" data-action="delete">Play löschen</button></div></details>
      </div>
    </header>`;
}
