import { editorToolbarMarkup } from './editor-toolbar.js';

export function editorShellMarkup() {
  return `
    ${editorToolbarMarkup()}
    <div class="chq-workspace">
      <aside class="chq-phase-rail" data-role="phase-rail" aria-label="Phasen">
        <div class="chq-flow" data-role="flow" role="listbox" aria-label="Play-Phasen"></div>
        <button class="chq-phase-add" type="button" data-action="insert-phase" title="Neue Phase nach der aktiven Phase einfügen" aria-label="Neue Phase einfügen">+</button>
      </aside>

      <section class="chq-stage-panel" aria-label="Spielfeld-Editor">
        <h1 class="visually-hidden" data-role="stage-title">Neues Play</h1>
        <div class="chq-stage-copy visually-hidden" aria-live="polite">
          <span data-role="stage-step">Phase 1</span>
          <strong data-role="stage-action">Grundaufstellung</strong>
          <span data-role="stage-help">Spieler und Ball positionieren.</span>
        </div>
        <div class="chq-court-wrap" data-role="court"></div>
        <div class="chq-pending" data-role="pending" hidden></div>
        <button class="chq-cancel-recording" type="button" data-action="cancel-recording" hidden>Abbrechen</button>
        <div class="chq-status" data-role="status" aria-live="polite">Spieler und Ball in der Grundaufstellung verschieben.</div>

        <div class="chq-runtime-controls" aria-hidden="true">
          <button type="button" data-action="restart">Neu starten</button>
          <button type="button" data-action="play">Abspielen</button>
          <span data-role="time">0.0 s</span>
          <input type="range" min="0" value="0" data-role="scrubber" tabindex="-1">
          <span data-role="total">0.0 s</span>
          <select data-role="speed" tabindex="-1"><option value=".5">0,5x</option><option value="1" selected>1x</option><option value="1.5">1,5x</option></select>
        </div>
      </section>

      <aside class="chq-side chq-inspector" data-role="right-panel" aria-label="Phasendetails">
        <section class="chq-inspector-panel">
          <header class="chq-inspector-head">
            <strong data-role="inspector-title">Timeline</strong>
            <button class="chq-inspector-toggle" type="button" data-action="toggle-inspector" aria-expanded="true" aria-label="Seitenbereich einklappen"><span class="visually-hidden">Timeline &amp; Anweisungen</span><span aria-hidden="true">›</span></button>
          </header>

          <div class="chq-tab-panel" data-panel="timeline">
            <div class="chq-relation" aria-label="Reihenfolge der nächsten Aktion">
              <span>Nächste Aktion</span>
              <div><button type="button" class="active" data-relation="after">Danach</button><button type="button" data-relation="same">Gleichzeitig</button></div>
            </div>
            <div class="chq-spacing-warning" data-role="spacing-warning" hidden><span></span><button type="button" data-action="snap-readable">Lesbar einrasten</button></div>
            <div class="chq-timeline" data-role="timeline"></div>
          </div>

          <div class="chq-tab-panel chq-instructions-panel" data-panel="instructions" hidden>
            <div class="chq-rich-toolbar" aria-hidden="true"><strong>B</strong><em>I</em><u>U</u><span>☷</span><span>↗</span></div>
            <label class="chq-instruction-field"><span class="visually-hidden">Traineranweisung für diese Phase</span><textarea maxlength="2000" data-role="phase-instruction" placeholder="Anweisungen für diese Phase …"></textarea></label>
          </div>

          <div class="chq-defense-tools" aria-label="Verteidigungsdarstellung">
            <span>Ausgewählter Verteidiger</span>
            <div><button type="button" data-defense-mode="man" title="Mannverteidigung als X">X · Mann</button><button type="button" data-defense-mode="zone" title="Zonenverteidigung als Raute">◇ · Zone</button></div>
          </div>
        </section>

        <nav class="chq-inspector-tabs" role="tablist" aria-label="Phasendetails">
          <button type="button" class="active" role="tab" aria-selected="true" data-tab="timeline" title="Timeline" aria-label="Timeline"><span aria-hidden="true">▤</span></button>
          <button type="button" role="tab" aria-selected="false" data-tab="instructions" title="Anweisungen" aria-label="Anweisungen"><span aria-hidden="true">▣</span></button>
        </nav>

        <div class="chq-runtime-settings" aria-hidden="true">
          <label>Kategorie<select data-role="category" tabindex="-1"><option>Offense</option><option>Defense</option><option>Horns</option><option>5-Out</option><option>Transition</option><option>Einwurf</option><option>Press Break</option></select></label>
          <button type="button" data-action="pause">Pause</button>
        </div>
      </aside>
    </div>`;
}
