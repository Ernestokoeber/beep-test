"""Validate imported animation/contact in a saved production .blend.

blender --background <film.blend> --python-exit-code 1 --python scripts/verify-pnr-blender.py
"""
import math, pathlib
import bpy
from mathutils import Vector

scene=bpy.context.scene
variant=pathlib.Path(bpy.data.filepath).stem
assert variant in ['pick-and-roll','pick-and-pop','pick-and-roll-reject']
assert scene.render.fps==30 and scene.frame_start==1 and scene.frame_end==420
assert (scene.render.resolution_x,scene.render.resolution_y)==(1920,1080)
scene.frame_set(1)
balls=[o for o in bpy.data.objects if o.type=='MESH' and all(abs(d-.24)<.005 for d in o.dimensions)]
assert len(balls)==1,'exactly one regulation-size basketball is expected'
# These checks observe animated ankle-attached shoes, roots and the ball.
# Avoid evaluating unrelated cloth/skin modifiers at every frame; all rig
# actions and the checked objects remain enabled and unchanged.
for obj in bpy.data.objects:
 if obj.type=='MESH' and '_Sole_' not in obj.name and obj not in balls:obj.hide_viewport=True
windows=[(2.25,3.95),(5.2,6.75)] if variant=='pick-and-roll-reject' else [(2.25,4.8)]
root=bpy.data.objects['Player_05']
soles=[bpy.data.objects['Player_5_Sole_'+side] for side in ['l','r']]
for start,end in windows:
 reference=None;drift=0;floor_error=0
 for frame in range(math.ceil(start*30+1),math.ceil(end*30+1)):
  scene.frame_set(frame)
  positions=[root.matrix_world.translation.copy()]+[o.matrix_world.translation.copy() for o in soles]
  if reference is None:reference=positions
  drift=max(drift,max((a-b).length for a,b in zip(positions,reference)))
  for sole in soles:
   floor_error=max(floor_error,abs(min((sole.matrix_world@Vector(p)).z for p in sole.bound_box)))
 assert drift<.002,('screen root/feet drift',start,end,drift)
 assert floor_error<.008,('sole-floor gap',start,end,floor_error)
 print('NATIVE_SCREEN_CONTACT_PASS',variant,start,end,round(drift,6),round(floor_error,6),flush=True)

scene.frame_set(327 if variant=='pick-and-roll-reject' else 285)
assert balls[0].matrix_world.translation.z>3,'shot timing must match the imported 30 fps action'
print('NATIVE_SHOT_TIMING_PASS',variant,flush=True)

all_soles=[o for o in bpy.data.objects if '_Sole_' in o.name]
assert len(all_soles)==20
minimum=0
for frame in range(1,421):
 scene.frame_set(frame)
 for sole in all_soles:
  minimum=min(minimum,min((sole.matrix_world@Vector(p)).z for p in sole.bound_box))
assert minimum>-.003,('shoe penetrates court',minimum)
print('NATIVE_FLOOR_CLEARANCE_PASS',variant,round(minimum,6),flush=True)
