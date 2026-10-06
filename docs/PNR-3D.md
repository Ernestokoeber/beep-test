# PnR basketball films

The built-in Pick & Roll, Pick & Pop and Reject & Re-Screen examples open in
**3D-Spielszene**, in both the animation modal and published Team-Plays view.
Each is a 14-second 1280×720 H.264 film at 24 fps, rendered from an actual 3D
scene with ten fictional human characters, basketball uniforms, a gym, screen,
dribbling, roll/pop, pass and finish. Native video controls provide playback,
pause, seeking, speed selection and fullscreen. Playback starts paused.

These are authored teaching examples, not renders of a coach's edited phase
recording. The accompanying text makes this distinction explicit. The 2D and
rotatable 3D tactical views still follow the recorded board and retain their
existing transport. Changing views pauses the film; closing releases its media
source. A failed video request returns to 2D with a message. The video can play
on devices without WebGL. The existing WebGL tactical view keeps its own 2D
fallback and disposal behavior.

This is a functional visual prototype. Character proportions and faces come
from anatomical human meshes; movement is authored procedurally. The graphics,
cloth and foot contact are simpler than a modern commercial basketball game.
Further artwork and motion capture can improve that quality without replacing
the native film player.

Screen choreography is defined in basketball-choreography.js. During each
screen, the screener's position, facing and planted stance stay fixed. The
on-ball defender travels around the screener; the guard clears the screen
before the screener pivots into the roll or pop. Reject uses two separate
stationary screen windows with repositioning between them.

Films are fetched only when selected and are not service-worker precached.
Native media byte-range requests bypass the service worker, allowing CDN seeking
and avoiding invalid caching of 206 responses. 2D remains available offline;
the films require a successful media download. No external runtime CDN or API
is used. Model licenses and provenance are in assets/pnr/players/SOURCES.md.

## Re-rendering

Install repository dependencies, Playwright and an ffmpeg build with libx264.
Serve the checkout with node scripts/static-server.mjs. Then run
E2E_BASE_URL=http://127.0.0.1:4173 node scripts/render-pnr-films.mjs.
PNR_FFMPEG selects ffmpeg; PNR_BROWSER_CHANNEL or PNR_CHROMIUM selects a
browser. scripts/pnr-film-studio.html is the render studio; its deterministic
window.renderFilm(seconds, variant) entry point renders any frame.

To regenerate player assets, put the three original mh_*.glb files listed in
SOURCES.md and MakeHuman's base.obj in a scratch directory outside the repo.
Run python scripts/prepare-pnr-players.py <scratch-directory> followed by
python scripts/complete-pnr-bodies.py <scratch-directory>. The first removes
all motion capture and non-bundled accessories; the second reconstructs the
full anatomical body, keeping individual faces. Original files are not shipped.

Three.js 0.180.0, GLTFLoader and SkeletonUtils are pinned and locally vendored
with the MIT license. Run node scripts/vendor-three.mjs after upgrading.

## Validation

npm test covers existing behavior and syntax. With the range-capable local
server running, node scripts/pnr-3d-browser.mjs checks desktop and mobile:
14-second film loading, actual playback, seeking, pausing on view change,
tactical playback and reset, 320px layout, unavailable WebGL and failed media
download. CI uses the same static server and browser checks.
node scripts/pnr-screen-motion.mjs checks fixed screen position and facing,
torso clearance, release timing and continuous paths for all three variants.
