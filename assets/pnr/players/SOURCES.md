# Courthub fictional athlete and PnR films

`athlete.glb` is the approved character used by the current films. It combines
CC0 anatomical geometry with attributed CC-BY clothes. It depicts no real player.
The model and derived movies must retain these credits; they are not wholly CC0.

| Part | Creator | License | Source |
| --- | --- | --- | --- |
| Anatomical body, morphs, anatomical skinning weights | MakeHuman Community | CC0 | [MakeHuman repository](https://github.com/makehumancommunity/makehuman) |
| Skin atlas, short02 hair | MakeHuman Community | CC0 | [System assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) |
| mindfront_eyebrows_03 | Mindfront (Sweden) | CC0 | [Eyebrows pack](https://static.makehumancommunity.org/assets/assetpacks/eyebrows01.html) |
| elvs_male_athletic_tank1 | Elvaerwyn | CC-BY, as specified by its original asset header | [Shirts pack](https://static.makehumancommunity.org/assets/assetpacks/shirts03.html) |
| elvs_male_swim_shorts1 | Elvaerwyn | CC-BY, as specified by its original asset header | [Pants pack](https://static.makehumancommunity.org/assets/assetpacks/pants03.html) |
| punkduck_running_shoes_01 | punkduck | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Shoes pack](https://static.makehumancommunity.org/assets/assetpacks/shoes02.html) |

Original clothing author/license headers are preserved in `CLOTHING-NOTICES.txt`.
The Elvaerwyn source headers do not identify a Creative Commons version; this
project preserves that declaration without assigning an unsupported version.
The full CC0 text is included in `CC0.txt`. CC BY 3.0's
[legal code](https://creativecommons.org/licenses/by/3.0/legalcode) applies to
the punkduck sneaker geometry.

Modifications: masculine athletic body morphs, 1.98 m proportions and relaxed
arm rest pose; clothes fitted through their MakeHuman barycentric bindings,
recolored, reduced to Full-HD mesh density, and bound to the anatomical body.
Body/finger weights are aggregated from the official anatomical rig; cloth
weights are interpolated on the nearest body triangle. Shoes attach rigidly to
the ankle joints. Hair is tinted brown. Socks, eye surfaces and uniform lettering
are authored for Courthub. The ten players share this character base with
height and skin tint variations; they are not ten individually sculpted faces.

Basketball motion, court, lights and camera are authored for Courthub. There
are no paid basketball packages or redistributed motion-capture clips. Blender
renders the final movies. The app's player includes these credits and a link
here, and exported movies retain an attribution line.

## Rebuilding

Blender 4.5 LTS, Node 24, Playwright and FFmpeg with H.264/drawtext are build tools.
The app plays ordinary MP4 files; it needs no Blender installation.

Prepare a scratch directory (outside the repository) containing:

- MakeHuman `makehuman/data/3dobjs/base.obj` and
  `makehuman/data/rigs/default_weights.mhw` as `base.obj`, `default_weights.mhw`.
- `male-young.target`: the MakeHuman Caucasian male-young macro target.
- `male-muscle.target`: universal-male-young-maxmuscle-averageweight macro target.
- `athlete-assets/`: the clothing/hair/skin/eyebrow folders named above, extracted
  from their MakeHuman asset packs with their original filenames and UVs.

Run `scripts/build-pnr-athlete.py` in Blender with `--work <scratch>` and
`--output <character-work>`. Then run `scripts/rig-pnr-athlete.py` with
`--model <character-work>/athlete.blend --source <scratch>` and
`--output assets/pnr/players/athlete.glb`. The exporter writes a glTF 2 binary
with translation-only rest transforms matching the runtime IK.

Serve the repository and run `scripts/export-pnr-blender.mjs` with
`E2E_BASE_URL`, `PNR_BROWSER_CHANNEL` and `PNR_BLENDER_WORK`. Run
`scripts/render-pnr-blender.mjs` with `PNR_BLENDER`, `PNR_FFMPEG` and the same
`PNR_BLENDER_WORK`. All three 14-second movies render at 1920 x 1080 / 30 fps.
The script preserves intermediate frames and `.blend` scenes outside the repo
and replaces shipped clips only after complete rendering and native validation.

The older `player-1037.glb`, `player-1074.glb`, `player-1185.glb` are unused legacy
CC0 MakeHuman/MPFB2 meshes sourced from
[MMWilliams/char-kit](https://github.com/MMWilliams/char-kit). Their source
motion capture and third-party accessories were removed. The production films
use `athlete.glb` instead.
