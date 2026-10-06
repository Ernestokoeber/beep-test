# PnR in 3D

Open a PnR play and choose **Animation abspielen**. Pick & Roll, Pick & Pop,
Reject/Re-Screen and PnR-labelled plays open in 3D. The published player view
has the same 2D/3D controls. Other plays initially retain the 2D view.

Drag to rotate; use the wheel or a two-finger pinch to zoom. Camera reset and
top view are available as buttons. With keyboard focus on the canvas, arrow
keys rotate, +/- zoom and Home resets the camera. Existing playback, pause,
speed and scrub controls apply to both views, retaining the playback position.

Green players are offense, red players defense. Labels retain board roles.
The ball and players follow `BT.tactics.snapshotAt` without rewriting the
saved play. A yellow ground marker indicates an active screen near its actor.
Player meshes are schematic; leg motion and ball bounce are presentation cues,
not a physics simulation. Existing PDF and GIF exports use the 2D renderer.

Three.js 0.180.0 and matching OrbitControls are pinned and vendored locally
with their MIT license. After changing that dependency, run
`node scripts/vendor-three.mjs` and commit the resulting vendor files. The
service-worker manifest caches the complete dependency chain for offline use.
The 3D module loads only when selected. If WebGL2 is unavailable, initialization
fails or the graphics context is lost, the same animation stays available in 2D.
Closing or removing a viewer disposes controls, observers and GPU resources;
closing while the module loads cannot create an orphaned renderer.

Validation: `npm test`; with Playwright installed and a local server running,
`node scripts/pnr-3d-browser.mjs`. Browser CI runs the 3D checks after the existing
E2E suite. Optional `E2E_BROWSER_CHANNEL` selects an installed browser, and
`E2E_SCREENSHOTS` saves desktop/mobile screenshots to a supplied directory.
