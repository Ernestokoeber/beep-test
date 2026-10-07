"""Build the reviewed fictional Courthub athlete from the attributed free inputs.

Uses the complete CC0 MakeHuman surface and official anatomical weights.
Run with Blender --background --python ... -- --work <scratch> --output <dir>.
"""
import argparse,json,pathlib,sys,math
import bpy,bmesh
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);work=pathlib.Path(a.work).resolve();out=pathlib.Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
verts=[];uvs=[];groups={};group=''
for line in (work/'base.obj').read_text().splitlines():
 s=line.split()
 if not s:continue
 if s[0]=='v':verts.append(Vector([float(v)*.1 for v in s[1:4]]))
 elif s[0]=='vt':uvs.append(tuple(map(float,s[1:3])))
 elif s[0]=='g':group=s[1];groups[group]=[]
 elif s[0]=='f':groups[group].append([tuple(int(v)-1 for v in item.split('/')[:2]) for item in s[1:]])
for name,amount in [('male-young.target',1),('male-muscle.target',.75)]:
 for line in (work/name).read_text().splitlines():
  s=line.split()
  if len(s)==4 and not s[0].startswith('#'):verts[int(s[0])]+=Vector([float(v)*.1*amount for v in s[1:]])
def pivot(name):
 ids={i for f in groups['joint-'+name] for i,t in f};return sum((verts[i] for i in ids),Vector())/len(ids)
weights=json.loads((work/'default_weights.mhw').read_text())['weights'];arms={s:{} for s in ['L','R']}
for bone,items in weights.items():
 for side in arms:
  if bone.endswith('.'+side) and any(k in bone for k in ['upperarm','lowerarm','wrist','metacarpal','finger']):
   for i,w in items:arms[side][i]=arms[side].get(i,0)+w
# Relax the arms using the anatomical vertex weights, preserving one surface.
for side,sign in [('L',1),('R',-1)]:
 shoulder=pivot('l-shoulder' if side=='L' else 'r-shoulder');angle=-sign*.46;c,s=math.cos(angle),math.sin(angle)
 for i,amount in arms[side].items():
  d=verts[i]-shoulder;r=Vector((c*d.x-s*d.y,s*d.x+c*d.y,d.z))+shoulder
  verts[i]=verts[i].lerp(r,min(1,amount))
body_ids={i for f in groups['body'] for i,t in f};floor=min(verts[i].y for i in body_ids);scale=1.98/(max(verts[i].y for i in body_ids)-floor)
def convert(v):return Vector((v.x*scale,-v.z*scale,(v.y-floor)*scale))
positions=[convert(v) for v in verts];hip=convert(pivot('pelvis')).z;neck=convert(pivot('neck')).z
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.8):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;return m
skin=material('Athlete skin',(.58,.37,.25),.52);skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.10
green=material('Courthub knit',(.005,.14,.073));white=material('Ivory piping',(.89,.87,.79));shoe_mat=material('Shoe upper',(.89,.9,.85));sole_mat=material('Rubber',(.025,.032,.029));sock_mat=material('Compression sock',(.075,.09,.083));eye_mat=material('Eye white',(.82,.85,.78),.28);iris_mat=material('Brown iris',(.025,.012,.006),.25)
def create(name,ids,mat,inflate=0):
 # Keep original quads and weld only geometrically shared vertices.
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(positions,[],[[v for v,t in groups['body'][f]] for f in ids]);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
 if mat==skin:
  uv=mesh.uv_layers.new(name='MakeHuman UV')
  for poly,fi in zip(mesh.polygons,ids):
   for loop,(_,t) in zip(poly.loop_indices,groups['body'][fi]):uv.data[loop].uv=uvs[t]
 else:
  for v in mesh.vertices:v.co+=v.normal*inflate
 for poly in mesh.polygons:poly.use_smooth=True
 return obj
body=create('Connected anatomical player',[fi for fi,face in enumerate(groups['body']) if max(positions[v].z for v,t in face)>.13],skin)
sock_ids=[]
for fi,face in enumerate(groups['body']):
 center=sum((positions[v] for v,t in face),Vector())/len(face)
 if .10<=center.z<.23:sock_ids.append(fi)
sock=create('Compression socks',sock_ids,sock_mat,.004)
for vertex in sock.data.vertices:
 if vertex.co.z>.20:vertex.co.z=.23
sock.data.update()
def fit_asset(name,mat,kind='clothes'):
 folder=work/'athlete-assets'/kind/name;file=next(folder.glob('*.mhclo'));lines=file.read_text().splitlines();settings={};bindings=[];active=False
 for line in lines:
  s=line.split()
  if not s or s[0].startswith('#'):continue
  if s[0]=='verts':active=True;continue
  if active and s[0].lstrip('-').isdigit():bindings.append(s);continue
  if active:active=False
  settings[s[0]]=s[1:]
 factors=[]
 for axis,key in enumerate(['x_scale','y_scale','z_scale']):
  v1,v2,d=settings[key];factors.append(abs(verts[int(v1)][axis]-verts[int(v2)][axis])/(float(d)*.1))
 coords=[]
 for binding in bindings:
  if len(binding)==1:v=verts[int(binding[0])].copy()
  else:
   v=sum((verts[int(binding[k])]*float(binding[k+3]) for k in range(3)),Vector())
   v+=Vector([float(binding[k+6])*.1*factors[k] for k in range(3)])
  coords.append(convert(v))
 faces=[];tex=[];faceuv=[]
 for line in (folder/settings['obj_file'][0]).read_text().splitlines():
  s=line.split()
  if not s:continue
  if s[0]=='vt':tex.append(tuple(map(float,s[1:3])))
  elif s[0]=='f':
   refs=[item.split('/') for item in s[1:]];faces.append([int(r[0])-1 for r in refs]);faceuv.append([int(r[1])-1 for r in refs])
 assert max(v for face in faces for v in face)<len(coords),(name,len(coords))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(coords,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
 uv=mesh.uv_layers.new(name='Clothing UV')
 for polygon,refs in zip(mesh.polygons,faceuv):
  polygon.use_smooth=True
  for loop,t in zip(polygon.loop_indices,refs):uv.data[loop].uv=tex[t]
 thick=obj.modifiers.new('Fabric thickness','SOLIDIFY');thick.thickness=.002
 print('FITTED_FREE_ASSET',name,len(coords),flush=True)
 return obj
asset_jersey=fit_asset('elvs_male_athletic_tank1',green)
asset_shorts=fit_asset('elvs_male_swim_shorts1',green)
asset_shoes=fit_asset('punkduck_running_shoes_01',shoe_mat)
hair_mat=material('Short brown hair',(.045,.022,.012),.64);brow_mat=material('Individual eyebrow hairs',(.035,.016,.009),.73)
hair=fit_asset('short02',hair_mat,'hair');fit_asset('mindfront_eyebrows_03',brow_mat,'eyebrows')
hair_image=bpy.data.images.load(str(work/'athlete-assets'/'hair'/'short02'/'short02_diffuse.png'));hair_image.pack();tree=hair_mat.node_tree;texture_node=tree.nodes.new('ShaderNodeTexImage');texture_node.image=hair_image;shader=tree.nodes.get('Principled BSDF');tint=tree.nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.27,.13,.07,1);tree.links.new(texture_node.outputs['Color'],tint.inputs[1]);tree.links.new(tint.outputs['Color'],shader.inputs['Base Color']);tree.links.new(texture_node.outputs['Alpha'],shader.inputs['Alpha'])
new_skin=bpy.data.images.load(str(work/'athlete-assets'/'skins'/'young_caucasian_male2'/'young_lightskinned_male_diffuse2.png'));new_skin.pack();node=skin.node_tree.nodes.new('ShaderNodeTexImage');node.image=new_skin;skin.node_tree.links.new(node.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def label(text,z,size):
 torso=[positions[i] for i in body_ids if abs(positions[i].x)<.26 and sum(arms[s].get(i,0) for s in arms)<.15 and abs(positions[i].z-z)<.025]
 low=min(v.y for v in torso);high=max(v.y for v in torso);cy=(low+high)/2;depth=(high-low)/2+.02
 data=bpy.data.curves.new('Uniform '+text,'FONT');data.body=text;data.align_x='CENTER';data.size=size;data.extrude=.0003
 obj=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(obj);obj.location=(0,cy-depth-.005,z);obj.rotation_euler=(math.pi/2,0,0);data.materials.append(white)
 return obj
def sphere(name,location,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=location);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
for side in ['l','r']:
 eye=convert(pivot(side+'-eye'));sphere('Eye',eye,(.013,.012,.012),eye_mat);sphere('Iris',eye+Vector((0,-.010,0)),(.006,.003,.006),iris_mat)
for text,z,size in [('COURTHUB',hip+.37,.042)]:
 obj=label(text,z,size)
 obj.data.extrude=0
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=3,use_grid_fill=True);bm.to_mesh(obj.data);bm.free()
 shrink=obj.modifiers.new('Printed onto the jersey','SHRINKWRAP');shrink.target=asset_jersey;shrink.wrap_method='NEAREST_SURFACEPOINT';shrink.wrap_mode='ABOVE_SURFACE';shrink.offset=.004
for image in bpy.data.images:
 if image.source=='FILE' and not image.packed_file:image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete.blend'))
print('ATHLETE_BUILD',out/'athlete.blend',flush=True)
