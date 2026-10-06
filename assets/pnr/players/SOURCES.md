# Fictional Courthub basketball players

These GLBs contain modified CC0 MakeHuman/MPFB2 geometry, individual faces and
bundled hair. Their original motion-capture animations and third-party outfits,
beards, hats and footwear have been excluded, including their binary buffers.
Skinning, basketball uniforms, footwear and basketball motion are authored for
Courthub. No real basketball player is depicted.

- Anatomical body: MakeHuman `makehuman/data/3dobjs/base.obj`, explicitly CC0:
  https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- Individual MakeHuman/MPFB2 faces, skeleton and bundled hair: MMWilliams
  char-kit, `mh_1037`, `mh_1074`, `mh_1185`:
  https://github.com/MMWilliams/char-kit
- MakeHuman asset license (CC0):
  https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md
- Full CC0 text is included in `CC0.txt`.

Source models are modified: clothing-hidden body faces are replaced with the
complete anatomical base, fitted to each skeleton, and custom skin weights.
Character animations are generated entirely by `basketball-film.js`.

The Blender film pipeline preserves these CC0 meshes and skin textures. Indoor
lighting, parquet, cloth/skin shading, shoes, uniform geometry and camera motion
are authored for Courthub. Procedural uniform geometry masks covered skin faces
while retaining the arms and hands. No additional paid or third-party basketball
animation assets are included. Blender 4.5 LTS is a build tool; only the resulting
MP4 films are delivered to the application.
