import { editorToolbarMarkup } from './editor-toolbar.js';

export function editorShellMarkup() {
  return `
    ${editorToolbarMarkup()}
    <div class="chq-workspace">
      <aside class="chq-phase-rail" data-role="phase-rail" aria-label="Phasen">
        <header class="chq-panel-head"><div><span class="chq-kicker">Ablauf</span><strong>Phasen</strong></div><button class="chq-btn icon" type="button" data-action="insert-phase" title="Neue Phase nach der aktiven Phase einfügen" aria-label="Neue Phase einfügen">＋</button></header>
        <div class="chq-flow" data-role="flow" role="listbox" aria-label="Play-Phasen"></div>
      </aside>

      <section class="chq-stage-panel" aria-label="Spielfeld-Editor">
        <div class="chq-stage-copy">
          <div><span class="chq-kicker" data-role="stage-step">Phase 1</span><strong data-role="stage-action">Grundaufstellung</strong><span data-role="stage-help">Spieler und Ball positionieren.</span></div>
          <div class="chq-relation" aria-label="Reihenfolge der nächsten Aktion">
            <button type="button" class="active" data-relation="after">Danach</button>
            <button type="button" data-relation="same">Gleichzeitig</button>
          </div>
        </div>
        <h1 class="visually-hidden" data-role="stage-title">Neues Play</h1>
        <div class="chq-court-wrap" data-role="court"></div>
        <div class="chq-pending" data-role="pending" hidden></div>
        <button class="chq-btn chq-cancel-recording" type="button" data-action="cancel-recording" hidden>Aktion abbrechen</button>
        <div class="chq-status" data-role="status">Spieler und Ball in der Grundaufstellung verschieben.</div>
        <div class="chq-transport">
          <div class="chq-transport-buttons"><button class="chq-btn icon" type="button" data-action="restart" aria-label="Animation zurücksetzen">↺</button><button class="chq-btn icon primary" type="button" data-action="play" aria-label="Animation abspielen">▶</button></div>
          <div class="chq-scrubber"><span data-role="time">0.0 s</span><input type="range" min="0" value="0" data-role="scrubber" aria-label="Animationsposition"><span data-role="total">0.0 s</span></div>
          <div class="chq-speed"><label for="chq-speed">Tempo</label><select id="chq-speed" data-role="speed"><option value=".5">0,5x</option><option value="1" selected>1x</option><option value="1.5">1,5x</option></select></div>
        </div>
      </section>

      <aside class="chq-side chq-inspector" data-role="right-panel">
        <button class="chq-inspector-toggle" type="button" data-action="toggle-inspector" aria-expanded="true"><span>Timeline &amp; Anweisungen</span><span aria-hidden="true">⌄</span></button>
        <section class="chq-card chq-inspector-main">
          <div class="chq-tabs" role="tablist" aria-label="Phasendetails">
            <button type="button" class="active" role="tab" aria-selected="true" data-tab="timeline">Timeline</button>
            <button type="button" role="tab" aria-selected="false" data-tab="instructions">Anweisungen</button>
          </div>
          <div class="chq-tab-panel" data-panel="timeline">
            <div class="chq-spacing-warning" data-role="spacing-warning" hidden><span></span><button class="chq-btn" type="button" data-action="snap-readable">Lesbar einrasten</button></div>
            <div class="chq-timeline" data-role="timeline"></div>
          </div>
          <div class="chq-tab-panel" data-panel="instructions" hidden>
            <label class="chq-instruction-field"><span>Traineranweisung für diese Phase</span><textarea maxlength="2000" data-role="phase-instruction" placeholder="Reads, Spacing und Coaching Points für diese Phase …"></textarea></label>
            <p class="chq-help">Absätze und einfache Aufzählungen bleiben erhalten.</p>
          </div>
        </section>

        <section class="chq-card chq-properties">
          <div class="chq-card-body">
            <div class="chq-section-title"><span>i</span><strong>Play &amp; Aufstellung</strong></div>
            <div class="chq-fields">
              <div class="chq-field"><label>Kategorie</label><select data-role="category"><option>Offense</option><option>Defense</option><option>Horns</option><option>5-Out</option><option>Transition</option><option>Einwurf</option><option>Press Break</option></select></div>
            </div>
            <div class="chq-defense-tools" aria-label="Verteidigungsdarstellung">
              <span>Ausgewählten Verteidiger darstellen als</span>
              <div><button class="chq-btn" type="button" data-defense-mode="man" title="Mannverteidigung als X">X · Mann</button><button class="chq-btn" type="button" data-defense-mode="zone" title="Zonenverteidigung als Raute">◇ · Zone</button></div>
            </div>
          </div>
        </section>
      </aside>
    </div>`;
}
