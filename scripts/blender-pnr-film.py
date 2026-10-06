"""Polish and render an authored Courthub scene with Blender 4.5 LTS.

No paid assets, motion-capture service or runtime dependency is required.
Run after export-pnr-blender.mjs. Work files belong outside the repository.
"""
import argparse, math, pathlib, sys, time
import bpy
from mathutils import Vector

args=argparse.ArgumentParser()
args.add_argument('--input',required=True)
args.add_argument('--output',required=True)
args.add_argument('--preview',type=int)
args.add_argument('--samples',type=int,default=16)
args.add_argument('--width',type=int,default=1920)
args.add_argument('--height',type=int,default=1080)
args.add_argument('--engine',choices=['CYCLES','BLENDER_EEVEE_NEXT'],default='CYCLES')
args.add_argument('--save-scene',action='store_true')
args.add_argument('--frames',help='Optional review frames, e.g. 112:115 or 115,241,285')
opts=args.parse_args(sys.argv[sys.argv.index('--')+1:])
# Headless Windows rendering does not need graphics-context subdivision.
# Keep the original smooth meshes; Cycles still traces on the GPU.
bpy.context.preferences.system.use_gpu_subdivision=False
out=pathlib.Path(opts.output).resolve();out.mkdir(parents=True,exist_ok=True)
variant=pathlib.Path(opts.input).stem
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# glTF seconds are converted into Blender frames during import. Set the
# delivery rate first, otherwise the default 24 fps compresses the motion.
bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(pathlib.Path(opts.input).resolve()))
scene=bpy.context.scene
for action in bpy.data.actions:
 curves=[curve for layer in action.layers for strip in layer.strips for bag in strip.channelbags for curve in bag.fcurves]
 for curve in curves:
  for key in curve.keyframe_points:
   key.co.x+=1;key.handle_left.x+=1;key.handle_right.x+=1
 if curves:
  assert abs(action.frame_range[0]-1)<.01 and abs(action.frame_range[1]-421)<.01,(action.name,action.frame_range[:])
print('COURTHUB_IMPORT_TIMING 30 fps, frames 1..421, 14 seconds',flush=True)
scene.render.engine=opts.engine;scene.cycles.samples=opts.samples
if opts.engine=='BLENDER_EEVEE_NEXT':
 scene.eevee.taa_render_samples=128
 scene.eevee.use_raytracing=True
 scene.eevee.ray_tracing_options.resolution_scale='1'
 scene.eevee.ray_tracing_options.screen_trace_quality=1
scene.cycles.use_denoising=True;scene.cycles.denoiser='OPTIX'
scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2
scene.cycles.glossy_bounces=2;scene.cycles.transparent_max_bounces=8
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.025
scene.render.resolution_x=opts.width;scene.render.resolution_y=opts.height
scene.render.resolution_percentage=100;scene.render.fps=30
scene.frame_start=1;scene.frame_end=420
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8';scene.render.film_transparent=False
scene.render.use_persistent_data=True
scene.render.use_motion_blur=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.35
preferences=bpy.context.preferences.addons['cycles'].preferences
try:
 preferences.compute_device_type='OPTIX';preferences.get_devices()
 gpu=False
 for device in preferences.devices:
  device.use=device.type=='OPTIX';gpu=gpu or device.use
 scene.cycles.device='GPU' if gpu else 'CPU'
 if not gpu:scene.cycles.denoiser='OPENIMAGEDENOISE'
except Exception:
 scene.cycles.device='CPU';scene.cycles.denoiser='OPENIMAGEDENOISE'
print('COURTHUB_RENDER_DEVICE',scene.cycles.device,flush=True)

def principled(material):
 material.use_nodes=True
 return next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)

def detail_bump(material,scale,distance,strength):
 tree=material.node_tree;shader=principled(material)
 if shader is None:return
 noise=tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale
 noise.inputs['Detail'].default_value=2
 bump=tree.nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=distance
 bump.inputs['Strength'].default_value=strength
 tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
 tree.links.new(bump.outputs['Normal'],shader.inputs['Normal'])

for material in bpy.data.materials:
 shader=principled(material)
 if shader is None:continue
 if 'Skin' in material.name or 'Human.body' in material.name:
  shader.inputs['Roughness'].default_value=.48
  shader.inputs['Subsurface Weight'].default_value=.14
  shader.inputs['Subsurface Radius'].default_value=(1,.42,.22)
  shader.inputs['Subsurface Scale'].default_value=.008
  shader.inputs['IOR'].default_value=1.4
  detail_bump(material,650,.00045,.11)
 if 'Fabric' in material.name:
  shader.inputs['Roughness'].default_value=.74
  shader.inputs['Sheen Weight'].default_value=.22
  shader.inputs['Specular IOR Level'].default_value=.26
  detail_bump(material,520,.0007,.26)
 if 'short03' in material.name or 'short04' in material.name:
  shader.inputs['Roughness'].default_value=.6

# Preserve the source skin surface and add thin fabric thickness after posing.
print('COURTHUB_STAGE geometry',flush=True)
for obj in list(bpy.data.objects):
 if obj.type!='MESH':continue
 for polygon in obj.data.polygons:polygon.use_smooth=True
 if 'Jersey' in obj.name or 'Shorts' in obj.name:
  modifier=obj.modifiers.new('Fabric thickness','SOLIDIFY');modifier.thickness=.0025
  modifier.offset=0
 if 'Sole' in obj.name:
  modifier=obj.modifiers.new('Rounded sole','BEVEL');modifier.width=.009;modifier.segments=3

def parquet_material():
 material=bpy.data.materials.new('Courthub maple parquet');material.use_nodes=True
 tree=material.node_tree;tree.nodes.clear()
 shader=tree.nodes.new('ShaderNodeBsdfPrincipled');shader.inputs['Roughness'].default_value=.27
 shader.inputs['Coat Weight'].default_value=.32;shader.inputs['Coat Roughness'].default_value=.20
 output=tree.nodes.new('ShaderNodeOutputMaterial');tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
 coord=tree.nodes.new('ShaderNodeTexCoord')
 mapping=tree.nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(15,14.1,1)
 tree.links.new(coord.outputs['Generated'],mapping.inputs['Vector'])
 brick=tree.nodes.new('ShaderNodeTexBrick');brick.offset=.5;brick.offset_frequency=2
 brick.inputs['Scale'].default_value=1;brick.inputs['Brick Width'].default_value=1.1
 brick.inputs['Row Height'].default_value=.13;brick.inputs['Mortar Size'].default_value=.0015
 brick.inputs['Mortar Smooth'].default_value=.005
 brick.inputs['Color1'].default_value=(.48,.275,.125,1)
 brick.inputs['Color2'].default_value=(.68,.42,.20,1)
 brick.inputs['Mortar'].default_value=(.16,.095,.043,1)
 tree.links.new(mapping.outputs['Vector'],brick.inputs['Vector'])
 grain_map=tree.nodes.new('ShaderNodeMapping');grain_map.inputs['Scale'].default_value=(3,230,6)
 tree.links.new(mapping.outputs['Vector'],grain_map.inputs['Vector'])
 noise=tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1
 noise.inputs['Detail'].default_value=3;tree.links.new(grain_map.outputs['Vector'],noise.inputs['Vector'])
 ramp=tree.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.4,.3,.2,1)
 ramp.color_ramp.elements[1].color=(1,.91,.73,1);tree.links.new(noise.outputs['Fac'],ramp.inputs['Fac'])
 mix=tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.28
 tree.links.new(brick.outputs['Color'],mix.inputs[1]);tree.links.new(ramp.outputs['Color'],mix.inputs[2])
 tree.links.new(mix.outputs['Color'],shader.inputs['Base Color'])
 bump=tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.0007
 tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);tree.links.new(bump.outputs['Normal'],shader.inputs['Normal'])
 return material

for obj in bpy.data.objects:
 if obj.name=='Courthub_Backboard':
  glass=principled(obj.data.materials[0]);glass.inputs['Transmission Weight'].default_value=1;glass.inputs['Alpha'].default_value=1;glass.inputs['IOR'].default_value=1.46
 if obj.type=='MESH' and abs(obj.dimensions.x-15)<.1 and abs(obj.dimensions.y-14.1)<.1:
  obj.data.materials.clear();obj.data.materials.append(parquet_material())

print('COURTHUB_STAGE lighting',flush=True)

for obj in list(bpy.data.objects):
 if obj.type=='LIGHT':bpy.data.objects.remove(obj,do_unlink=True)
world=bpy.data.worlds.new('Courthub indoor ambient');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.48,.58,.72,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.12;scene.world=world
def area(name,location,energy,size,color,target):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='RECTANGLE';data.size=size;data.size_y=size*.6;data.color=color
 obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
 obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
 return obj
for x in [-5,5]:
 for y in [-3,4]:area('Ceiling softbox',(x,y,6.5),950,4,(1,.93,.83),(x,y,0))
area('Sideline fill',(7,-4,4.8),550,5,(.78,.87,1),(0,-1,1))
area('Basket rim light',(-4,6,4.5),450,3,(1,.9,.74),(0,2,1))

camera=bpy.data.objects['CourthubCamera'];scene.camera=camera
print('COURTHUB_STAGE camera',flush=True)
camera.animation_data_clear();camera.data.lens=38;camera.data.sensor_width=36
camera.data.clip_start=.1;camera.data.clip_end=150
camera.data.dof.use_dof=False # All participants and ball contacts stay readable.
screen_end=6.75 if variant=='pick-and-roll-reject' else 4.8
if variant=='pick-and-pop':
 keys=[(0,(9,-10,6),(0,-.5,1)),(2.1,(6.6,-6.7,3.8),(.7,-2.0,1)),(4.8,(6.4,-6.4,3.7),(1,-1.7,1)),(7.7,(8,-6.8,4.4),(2.4,0,1.25)),(11.5,(8,-5.5,4.5),(1.8,2,1.65)),(14,(8.4,-6,4.7),(1.5,2.3,1.5))]
else:
 keys=[(0,(9,-10,6),(0,-.5,1)),(2.1,(6.6,-6.7,3.8),(.7,-2.0,1)),(screen_end,(6.4,-6.4,3.7),(.8,-1.7,1)),(screen_end+3,(7.6,-6.6,4.5),(.8,2,1.35)),(12,(7.4,-5.6,4.3),(.4,3.3,1.65)),(14,(8,-6,4.6),(.4,3,1.4))]
def camera_at(t):
 a,b=keys[-2:]
 for first,second in zip(keys,keys[1:]):
  if t<=second[0]:a,b=first,second;break
 u=max(0,min(1,(t-a[0])/(b[0]-a[0])));u=u*u*(3-2*u)
 return Vector(a[1]).lerp(Vector(b[1]),u),Vector(a[2]).lerp(Vector(b[2]),u)
camera.rotation_mode='QUATERNION'
for frame in range(1,422):
 t=(frame-1)/30;location,target=camera_at(t);camera.location=location
 camera.rotation_quaternion=(target-location).to_track_quat('-Z','Y')
 camera.keyframe_insert(data_path='location',frame=frame);camera.keyframe_insert(data_path='rotation_quaternion',frame=frame)
for curve in camera.animation_data.action.fcurves:
 for key in curve.keyframe_points:key.interpolation='LINEAR'

scene.frame_set(1)
print('COURTHUB_STAGE ready',flush=True)
if opts.save_scene:
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(variant+'.blend')))
if opts.preview is not None:
 print('COURTHUB_STAGE preview-frame',opts.preview,flush=True)
 scene.frame_set(opts.preview);scene.render.filepath=str(out/f'preview-{opts.preview:04d}.png')
 print('COURTHUB_STAGE preview-render',flush=True)
 start=time.monotonic();bpy.ops.render.render(write_still=True)
 print('COURTHUB_PREVIEW_SECONDS',round(time.monotonic()-start,2),flush=True)
else:
 frames=[]
 for item in (opts.frames or '1:420').split(','):
  if ':' in item:
   first,last=map(int,item.split(':'));frames.extend(range(first,last+1))
  else:frames.append(int(item))
 if any(frame<1 or frame>420 for frame in frames):raise ValueError('Frames must be between 1 and 420')
 for frame in frames:
  target=out/f'{frame:04d}.png'
  if target.exists():continue
  scene.frame_set(frame);scene.render.filepath=str(target)
  start=time.monotonic();bpy.ops.render.render(write_still=True)
  print('COURTHUB_FRAME',frame,'SECONDS',round(time.monotonic()-start,2),flush=True)
