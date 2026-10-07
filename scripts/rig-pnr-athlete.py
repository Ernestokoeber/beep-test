"""Bind the reviewed athlete to the translation-only Courthub basketball rig.

Blender --background --python scripts/rig-pnr-athlete.py --
  --model athlete-review.blend --source <MakeHuman inputs> --output athlete.glb

Body weights come from MakeHuman's anatomical rig. Clothing weights are
interpolated on the nearest body triangle, never guessed from nearest bones.
The exported rest transforms match the runtime IK's identity quaternion rest.
"""
import argparse, json, math, pathlib, struct, sys
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

p=argparse.ArgumentParser()
p.add_argument('--model',required=True);p.add_argument('--source',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
source=pathlib.Path(a.source).resolve();output=pathlib.Path(a.output).resolve()
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(pathlib.Path(a.model).resolve()))
body=bpy.data.objects['Connected anatomical player']

base=[];groups={};group=''
for line in (source/'base.obj').read_text().splitlines():
 s=line.split()
 if not s:continue
 if s[0]=='v':base.append(Vector([float(v)*.1 for v in s[1:4]]))
 elif s[0]=='g':group=s[1];groups[group]=[]
 elif s[0]=='f':groups[group].append([int(x.split('/')[0])-1 for x in s[1:]])
for name,amount in [('male-young.target',1),('male-muscle.target',.75)]:
 for line in (source/name).read_text().splitlines():
  s=line.split()
  if len(s)==4 and not s[0].startswith('#'):base[int(s[0])]+=Vector([float(v)*.1*amount for v in s[1:]])
def pivot(name):
 ids={i for face in groups['joint-'+name] for i in face}
 return sum((base[i] for i in ids),Vector())/len(ids)
ids={i for face in groups['body'] for i in face}
floor=min(base[i].y for i in ids);scale=1.98/(max(base[i].y for i in ids)-floor)
def gltf(v):return Vector((v.x*scale,(v.y-floor)*scale,v.z*scale))
def native_to_gltf(v):return Vector((v.x,v.z,-v.y))
def relaxed(v,side):
 shoulder=pivot(side+'-shoulder');d=v-shoulder
 angle=(-1 if side=='l' else 1)*.46;c,s=math.cos(angle),math.sin(angle)
 return shoulder+Vector((c*d.x-s*d.y,s*d.x+c*d.y,d.z))

names=['root','pelvis','spine_01','spine_03','neck_01','head']
parents=[None,0,1,2,3,4]
positions=[Vector(),gltf(pivot('pelvis')),gltf(pivot('spine-4')),gltf(pivot('spine-2')),gltf(pivot('neck')),gltf(pivot('head'))]
for side in ['l','r']:
 start=len(names)
 names.extend(['clavicle_'+side,'upperarm_'+side,'lowerarm_'+side,'hand_'+side])
 parents.extend([3,start,start+1,start+2])
 positions.extend([gltf(pivot(side+'-clavicle')),gltf(pivot(side+'-shoulder')),gltf(relaxed(pivot(side+'-elbow'),side)),gltf(relaxed(pivot(side+'-hand'),side))])
for side in ['l','r']:
 start=len(names)
 names.extend(['thigh_'+side,'calf_'+side,'foot_'+side,'ball_'+side])
 parents.extend([1,start,start+1,start+2])
 positions.extend([gltf(pivot(side+'-upper-leg')),gltf(pivot(side+'-knee')),gltf(pivot(side+'-ankle')),gltf(pivot(side+'-foot-1'))])
for side in ['l','r']:
 for finger in range(1,6):
  parent=names.index('hand_'+side)
  for segment in range(1,4):
   names.append(f'finger{finger}_{segment}_{side}');parents.append(parent)
   positions.append(gltf(relaxed(pivot(f'{side}-finger-{finger}-{segment}'),side)))
   parent=len(names)-1

def mapped(name):
 side=name[-1].lower() if name.endswith(('.L','.R')) else None
 if name.startswith(('upperarm','lowerarm')):return ('upperarm_' if name.startswith('upperarm') else 'lowerarm_')+side
 if name.startswith('finger'):
  finger,segment=name.split('.')[0].replace('finger','').split('-')
  return f'finger{finger}_{segment}_{side}'
 if name.startswith(('wrist','metacarpal')):return 'hand_'+side
 if name.startswith('upperleg'):return 'thigh_'+side
 if name.startswith('lowerleg'):return 'calf_'+side
 if name.startswith(('foot','toe')):return 'foot_'+side
 if name.startswith(('clavicle','shoulder')):return 'clavicle_'+side
 if name.startswith(('root','pelvis')):return 'pelvis'
 if name.startswith('spine'):return 'spine_01' if name[-1] in '45' else 'spine_03'
 if name.startswith(('breast','levator')):return 'spine_03'
 if name.startswith('neck'):return 'neck_01'
 return 'head'

weights=[{} for _ in base]
for name,values in json.loads((source/'default_weights.mhw').read_text())['weights'].items():
 joint=names.index(mapped(name))
 for i,w in values:weights[i][joint]=weights[i].get(joint,0)+w
def normalized(weight):
 values=sorted(weight.items(),key=lambda x:-x[1])[:4]
 if not values:values=[(1,1)]
 total=sum(w for j,w in values)
 return [j for j,w in values]+[0]*(4-len(values)),[w/total for j,w in values]+[0]*(4-len(values))

# The body's IDs still correspond to the official MakeHuman base vertex IDs.
body.data.calc_loop_triangles()
triangles=[tuple(t.vertices) for t in body.data.loop_triangles]
points=[v.co.copy() for v in body.data.vertices]
surface=BVHTree.FromPolygons(points,triangles,all_triangles=True)
def surface_weight(co):
 closest,normal,index,distance=surface.find_nearest(co)
 assert index is not None
 indices=triangles[index];a,b,c=[points[i] for i in indices]
 ab=b-a;ac=c-a;d=closest-a
 denominator=ab.dot(ab)*ac.dot(ac)-ab.dot(ac)**2
 if abs(denominator)<1e-14:return weights[indices[0]]
 v=(ac.dot(ac)*d.dot(ab)-ab.dot(ac)*d.dot(ac))/denominator
 w=(ab.dot(ab)*d.dot(ac)-ab.dot(ac)*d.dot(ab))/denominator
 factors=[max(0,1-v-w),max(0,v),max(0,w)];total=sum(factors)
 result={}
 for vi,factor in zip(indices,factors):
  for joint,amount in weights[vi].items():result[joint]=result.get(joint,0)+amount*factor/total
 return result

doc={'asset':{'version':'2.0','generator':'Courthub reviewed MakeHuman athlete, anatomical weight transfer'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[],'meshes':[],'materials':[],'textures':[],'images':[],'samplers':[{'magFilter':9729,'minFilter':9987}],'accessors':[],'bufferViews':[],'skins':[]}
binary=bytearray()
def view(blob,target=None):
 binary.extend(b'\0'*((-len(binary))%4));index=len(doc['bufferViews'])
 value={'buffer':0,'byteOffset':len(binary),'byteLength':len(blob)}
 if target:value['target']=target
 doc['bufferViews'].append(value);binary.extend(blob);return index
def accessor(values,component,type_,width,target=None,bounds=False):
 flat=[x for row in values for x in row] if width>1 else values
 code={5126:'f',5125:'I',5123:'H'}[component]
 entry={'bufferView':view(struct.pack('<'+code*len(flat),*flat),target),'componentType':component,'count':len(values),'type':type_}
 if bounds:entry.update(min=[min(row[k] for row in values) for k in range(width)],max=[max(row[k] for row in values) for k in range(width)])
 doc['accessors'].append(entry);return len(doc['accessors'])-1

for i,(name,parent,pos) in enumerate(zip(names,parents,positions)):
 local=pos-(positions[parent] if parent is not None else Vector())
 node={'name':name,'translation':list(local),'children':[]}
 doc['nodes'].append(node)
 if parent is not None:doc['nodes'][parent]['children'].append(i)
inverse=[]
for v in positions:inverse.append([1,0,0,0,0,1,0,0,0,0,1,0,-v.x,-v.y,-v.z,1])
doc['skins'].append({'name':'Anatomical basketball rig','joints':list(range(len(names))),'skeleton':0,'inverseBindMatrices':accessor(inverse,5126,'MAT4',16)})

material_ids={}
def material(mat):
 if mat.name in material_ids:return material_ids[mat.name]
 shader=mat.node_tree.nodes.get('Principled BSDF');color=list(shader.inputs['Base Color'].default_value)
 entry={'name':mat.name,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':0,'roughnessFactor':shader.inputs['Roughness'].default_value}}
 tex=next((n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None)
 if tex:
  image=tex.image;assert image.packed_file,(mat.name,image.name)
  doc['images'].append({'name':image.name,'bufferView':view(bytes(image.packed_file.data)),'mimeType':'image/png'})
  doc['textures'].append({'source':len(doc['images'])-1,'sampler':0})
  entry['pbrMetallicRoughness']['baseColorTexture']={'index':len(doc['textures'])-1}
  entry['pbrMetallicRoughness']['baseColorFactor']=[1,1,1,1]
  if mat.name=='Short brown hair':
   entry['pbrMetallicRoughness']['baseColorFactor']=[.27,.13,.07,1];entry['alphaMode']='MASK';entry['alphaCutoff']=.35
 material_ids[mat.name]=len(doc['materials']);doc['materials'].append(entry);return material_ids[mat.name]

def export_mesh(obj,name,parent=0,rigid=None,polygons=None):
 # Evaluate the printed lettering's shrinkwrap, but leave thickness for render.
 use_evaluated=obj.name.startswith('Uniform')
 evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get()) if use_evaluated else obj
 mesh=evaluated.to_mesh() if use_evaluated else obj.data
 mesh.calc_loop_triangles();uv=mesh.uv_layers.active
 normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
 pos=[];normal=[];tex=[];joints=[];amounts=[];index=[];lookup={}
 origin=positions[rigid] if rigid is not None else Vector()
 for triangle in mesh.loop_triangles:
  if polygons is not None and triangle.polygon_index not in polygons:continue
  for loop_index in triangle.loops:
   loop=mesh.loops[loop_index];vertex=mesh.vertices[loop.vertex_index]
   co=obj.matrix_world@vertex.co;coordinate=native_to_gltf(co)-origin
   n=native_to_gltf(normal_matrix@loop.normal).normalized();uvco=uv.data[loop_index].uv if uv else Vector((0,0))
   key=(loop.vertex_index,round(uvco.x,6),round(uvco.y,6),*(round(x,5) for x in n))
   if key not in lookup:
    lookup[key]=len(pos);pos.append(list(coordinate));normal.append(list(n));tex.append([uvco.x,1-uvco.y])
    if rigid is None:
     if obj==body or obj.name=='Compression socks':weight=weights[loop.vertex_index]
     elif obj.name.startswith(('short02','mindfront_eyebrows','Eye','Iris')):weight={names.index('head'):1}
     else:weight=surface_weight(co)
     ji,wa=normalized(weight);joints.append(ji);amounts.append(wa)
   index.append(lookup[key])
 attributes={'POSITION':accessor(pos,5126,'VEC3',3,34962,True),'NORMAL':accessor(normal,5126,'VEC3',3,34962),'TEXCOORD_0':accessor(tex,5126,'VEC2',2,34962)}
 if rigid is None:attributes.update(JOINTS_0=accessor(joints,5123,'VEC4',4,34962),WEIGHTS_0=accessor(amounts,5126,'VEC4',4,34962))
 doc['meshes'].append({'name':name,'primitives':[{'attributes':attributes,'indices':accessor(index,5125,'SCALAR',1,34963),'material':material(mesh.materials[0])}]})
 node={'name':name,'mesh':len(doc['meshes'])-1}
 if rigid is None:node['skin']=0
 doc['nodes'][parent]['children'].append(len(doc['nodes']));doc['nodes'].append(node)
 if use_evaluated:evaluated.to_mesh_clear()
 print('ATHLETE_MESH',name,len(pos),len(index)//3,flush=True)

for obj in list(bpy.data.objects):
 if obj.type!='MESH' or obj.hide_render or obj.name.startswith('Plane'):continue
 # Dense cloth/brow source meshes carry more vertices than a Full-HD film
 # needs. Reduce those surfaces before transferring the anatomical weights.
 # Body IDs and the official body weights remain untouched.
 if obj.name.startswith(('elvs_male_athletic_tank','mindfront_eyebrows','Uniform')):
  bpy.context.view_layer.objects.active=obj
  for modifier in list(obj.modifiers):
   if modifier.type=='SOLIDIFY':obj.modifiers.remove(modifier)
  reduce=obj.modifiers.new('Full HD mesh density','DECIMATE')
  reduce.ratio=.25 if obj.name.startswith('elvs') else .2
  bpy.ops.object.modifier_apply(modifier=reduce.name)
 if obj.name=='punkduck_running_shoes_01':
  for side in ['l','r']:
   faces={p.index for p in obj.data.polygons if (p.center.x>=0)==(side=='l')}
   foot=names.index('foot_'+side)
   export_mesh(obj,'Sole_'+side,foot,foot,faces)
 else:export_mesh(obj,obj.name)

doc['nodes'][0]['extras']={'height':1.98,'ankleHeight':positions[names.index('foot_l')].y,'sources':'See SOURCES.md: MakeHuman CC0; Elvaerwyn CC-BY; punkduck CC BY 3.0.'}
doc['buffers']=[{'byteLength':len(binary)}]
payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);binary.extend(b'\0'*((-len(binary))%4))
output.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(binary),0x004e4942)+binary)
print('ATHLETE_EXPORT',output,output.stat().st_size,'ankle',doc['nodes'][0]['extras']['ankleHeight'],flush=True)
