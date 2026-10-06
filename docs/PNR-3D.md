# PnR basketball films

The built-in Pick & Roll, Pick & Pop and Reject & Re-Screen examples open in
**3D-Spielszene**, in both the animation modal and published Team-Plays view.
Each is a 14-second 1920×1080 H.264 film at 30 fps, rendered with Blender
4.5 LTS / Cycles from an actual 3D
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

This is a functional visual prototype using free software and CC0 anatomical
meshes. Movement, uniforms and shoes are authored for Courthub. Cycles adds
indoor area lighting, soft contact shadows, skin and cloth shading, a maple
floor and a camera that follows each play. German phase captions accompany
the action. Characters, cloth deformation and motion remain simpler than a
modern commercial basketball game. No paid basketball package, external API
or third-party motion capture is used. Further artwork and motion capture
can improve quality without replacing the native film player.

Screen choreography is defined in basketball-choreography.js. During each
screen, the screener's position, facing and planted stance stay fixed. The
on-ball defender travels around the screener; the guard clears the screen
before the screener pivots into the roll or pop. Reject uses two separate
stationary screen windows with repositioning between them.

Monotone cubic paths keep movement continuous through waypoints without
overshooting screen anchors. basketball-footwork.js plans alternating steps
in world space: supporting feet stay planted, moving feet lift and land, and
both feet remain fixed during screens. basketball-film.js applies two-bone
leg and arm IK, a crouched stance, ball tracking, dribble/gather, pass and
finish. The dribble reaches the floor; the shot has a fixed release position.
Clothed body faces are masked while hands remain visible.

Films are fetched only when selected and are not service-worker precached.
Native media byte-range requests bypass the service worker, allowing CDN seeking
and avoiding invalid caching of 206 responses. 2D remains available offline;
the films require a successful media download. Versioned film URLs replace
browser-cached older renders. No external runtime CDN or API
is used. Model licenses and provenance are in assets/pnr/players/SOURCES.md.

## Re-rendering

Install repository dependencies, Playwright, Blender 4.5 LTS and an ffmpeg
build with libx264 and drawtext. Blender and ffmpeg are build tools; the app
only downloads MP4s. Serve the checkout with node scripts/static-server.mjs.
Then run:

```sh
E2E_BASE_URL=http://127.0.0.1:4173 node scripts/export-pnr-blender.mjs
PNR_BLENDER=/path/to/blender PNR_FFMPEG=/path/to/ffmpeg node scripts/render-pnr-blender.mjs
```

On PowerShell set environment variables with `$env:NAME='value'` before the
Node commands. PNR_BROWSER_CHANNEL=msedge or chrome selects an installed
browser. PNR_VARIANT selects one of the three IDs. Intermediate GLBs, packed
editable .blend scenes, frames and logs go outside the repo into
../blender-scenes; PNR_BLENDER_WORK overrides that directory.

The export captures poses at 30 fps for 14 seconds and gives each character
unique bone names. Blender sets 30 fps before importing, shifts every action
slot to frame 1, and asserts the 1..421 imported animation range. Output frames
1..420 produce the 14-second film. The Blender script replaces preview
lighting, floor material and camera with the film setup.

The default uses 16 Cycles samples with adaptive sampling and OptiX denoising
on a supported GPU, with CPU fallback. PNR_SAMPLES raises the sample budget.
The driver limits native CPU threads to two. It hashes the GLB, Blender script
and sample count to isolate checkpoints; restarting resumes the same render.
Encoding requires all 420 nonempty frames. A film replaces the shipped asset
only after Blender and ffmpeg succeed. ffmpeg adds captions and encodes
H.264/yuv420p with faststart for browser seeking.

To review particular frames without encoding the whole film:

```sh
blender --background --threads 2 --factory-startup --python-exit-code 1 \
  --python scripts/blender-pnr-film.py -- \
  --input ../blender-scenes/pick-and-roll.glb --output ../blender-scenes/review \
  --frames 115,241,285 --samples 32
```

--preview 115 renders one named preview; --save-scene saves the editable
project. --engine BLENDER_EEVEE_NEXT supports comparisons; shipped films use
Cycles. scripts/render-pnr-films.mjs remains the earlier browser-based
720p/24fps render path and should not overwrite the final Blender films.

To regenerate player assets, put the three original mh_*.glb files listed in
SOURCES.md and MakeHuman's base.obj in a scratch directory outside the repo.
Run python scripts/prepare-pnr-players.py <scratch-directory> followed by
python scripts/complete-pnr-bodies.py <scratch-directory>. The first removes
all motion capture and non-bundled accessories; the second reconstructs the
full anatomical body, keeping individual faces. Original files are not shipped.

Three.js 0.180.0, GLTFLoader, SkeletonUtils and GLTFExporter are pinned and locally vendored
with the MIT license. Run node scripts/vendor-three.mjs after upgrading.

## Validation

npm test covers existing behavior and syntax. With the range-capable local
server running, node scripts/pnr-3d-browser.mjs checks desktop and mobile:
1080p dimensions, 14-second film loading, actual playback, seeking, pausing on view change,
tactical playback and reset, 320px layout, unavailable WebGL and failed media
download. CI uses the same static server and browser checks.
node scripts/pnr-screen-motion.mjs checks fixed screen position and facing,
both planted feet, close contact with torso clearance, release timing and
continuous root/foot paths for all three variants. The Blender import asserts
animation timing; representative frames are reviewed before the full render.
E2E_BROWSER_CHANNEL=msedge selects Edge for the browser checks.

scripts/pnr-film-motion-browser.mjs measures actual hand positions on the
rendered skeleton across screen, gather, catch, pass release and shot recovery
transitions. Arm targets blend in and out; limb IK transforms target directions
into the parent's coordinate system before computing rotations, preserving
anatomical twist when players turn. The moving stance blends continuously with
speed instead of snapping between idle and running poses.

For each saved production project, run Blender in the background with the
.blend path, --python-exit-code 1 and --python scripts/verify-pnr-blender.py.
This checks the imported frame rate and range, stationary screen roots/feet,
sole-floor contact, shot timing, and floor clearance for all 20 shoes across
the 420 frames. These checks operate on the imported Blender scene, not only
the authored path data.
