import json,struct,math,pathlib,sys
root=pathlib.Path(sys.argv[1])
verts=[];uvs=[];groups={};g=''
for line in (root/'base.obj').read_text().splitlines():
    bits=line.split()
    if not bits:continue
    if bits[0]=='v':verts.append(tuple(float(x)*.1 for x in bits[1:4]))
    if bits[0]=='vt':uvs.append(tuple(map(float,bits[1:3])))
    if bits[0]=='g':g=bits[1];groups[g]=[]
    if bits[0]=='f':groups[g].append([tuple(int(i)-1 for i in x.split('/')[:2]) for x in bits[1:]])
def add(a,b):return tuple(x+y for x,y in zip(a,b))
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def mul(a,s):return tuple(x*s for x in a)
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def length(a):return math.sqrt(dot(a,a))
def norm(a):return mul(a,1/max(1e-10,length(a)))
def cross(a,b):return(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def pivot(name):
    indices={v[0] for f in groups['joint-'+name] for v in f}
    return tuple(sum(verts[i][k] for i in indices)/len(indices) for k in range(3))
mapping={'pelvis':'pelvis','spine_01':'spine-4','spine_03':'spine-1','neck_01':'neck','head':'head'}
for side in ['l','r']:
    for bone,joint in [('upperarm','shoulder'),('lowerarm','elbow'),('hand','hand'),('thigh','upper-leg'),('calf','knee'),('foot','ankle'),('ball','foot-2')]:mapping[bone+'_'+side]=side+'-'+joint
children={'pelvis':'spine_01','spine_01':'spine_03','spine_03':'neck_01','neck_01':'head'}
for side in ['l','r']:
    for a,b in [('upperarm','lowerarm'),('lowerarm','hand'),('thigh','calf'),('calf','foot'),('foot','ball')]:children[a+'_'+side]=b+'_'+side
for source in ['1037','1074','1185']:
    file=pathlib.Path(__file__).parents[1]/f'assets/pnr/players/player-{source}.glb';data=file.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);buf=bytearray(data[28+n:])
    world={};nameindex={n.get('name'):i for i,n in enumerate(doc['nodes'])}
    def walk(i,parent=(0,0,0)):
        node=doc['nodes'][i];world[node.get('name')]=add(parent,tuple(node.get('translation',[0,0,0])))
        for c in node.get('children',[]):walk(c,world[node.get('name')])
    for i in doc['scenes'][0]['nodes']:walk(i)
    skeleton=doc['skins'][0]['joints'];names=[doc['nodes'][i]['name'] for i in skeleton]
    segments=[]
    for name in mapping:
        if name in ['head','ball_l','ball_r']:continue
        a=pivot(mapping[name]);b=pivot(mapping[children[name]]) if name in children else add(a,(0,-.13,.03))
        ta=world[name];tb=world[children[name]] if name in children else add(ta,(0,-.13,.03))
        segments.append((name,a,b,ta,tb))
    def transform(v):
        scores=[]
        for name,a,b,ta,tb in segments:
            ab=sub(b,a);u=max(0,min(1,dot(sub(v,a),ab)/dot(ab,ab)));distance=length(sub(v,add(a,mul(ab,u))))
            # Exclude arm/hand bones when a vertex belongs to the torso or leg.
            if ('arm' in name or 'hand' in name) and abs(v[0])<.15:distance+=.5
            if ('thigh' in name or 'calf' in name or 'foot' in name) and v[1]>.18:distance+=.5
            if name.endswith('_l') and v[0]<0:distance+=.5
            if name.endswith('_r') and v[0]>0:distance+=.5
            scores.append((distance,name,a,b,ta,tb))
        scores=sorted(scores)[:3];weights=[1/(d+.018)**5 for d,*_ in scores];total=sum(weights);weights=[w/total for w in weights]
        result=(0,0,0);joints=[]
        for w,(d,name,a,b,ta,tb) in zip(weights,scores):
            av=norm(sub(b,a));bv=norm(sub(tb,ta));axis=cross(av,bv);cos=dot(av,bv);vv=sub(v,a)
            rotated=add(add(vv,cross(axis,vv)),mul(cross(axis,cross(axis,vv)),1/max(1e-5,1+cos)))
            # Preserve anatomical thickness while adjusting longitudinal length.
            along=dot(rotated,bv);rotated=add(rotated,mul(bv,along*(length(sub(tb,ta))/length(sub(b,a))-1)))
            result=add(result,mul(add(ta,rotated),w));joints.append(names.index(name))
        return result,joints+[0],weights+[0]
    positions=[];texcoords=[];jointvals=[];weightvals=[];indices=[];lookup={};normalvals=[]
    for face in groups['body']:
        target=[transform(verts[v])[0] for v,t in face]
        # Use the individually generated faces from char-kit above the neck.
        if sum(p[1] for p in target)/len(target)>world['neck_01'][1]+.015:continue
        ids=[]
        for v,t in face:
            key=(v,t)
            if key not in lookup:
                p,j,w=transform(verts[v]);lookup[key]=len(positions)//3;positions+=p;texcoords+=uvs[t];jointvals+=j;weightvals+=w;normalvals += [0,0,0]
            ids.append(lookup[key])
        for i in range(1,len(ids)-1):indices += [ids[0],ids[i],ids[i+1]]
    for i in range(0,len(indices),3):
        a,b,c=indices[i:i+3];p=lambda j:positions[j*3:j*3+3];normal=cross(sub(p(b),p(a)),sub(p(c),p(a)))
        for j in [a,b,c]:
            for k in range(3):normalvals[j*3+k]+=normal[k]
    for i in range(0,len(normalvals),3):normalvals[i:i+3]=norm(normalvals[i:i+3])
    def attribute(values,kind,components,component=5126):
        while len(buf)%4:buf.append(0)
        packed=struct.pack('<'+({5126:'f',5123:'H',5125:'I'}[component])*len(values),*values);view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(buf),'byteLength':len(packed)});buf.extend(packed)
        access=len(doc['accessors']);obj={'bufferView':view,'componentType':component,'count':len(values)//components,'type':kind}
        if kind=='VEC3':obj['min']=[min(values[k::3]) for k in range(3)];obj['max']=[max(values[k::3]) for k in range(3)]
        doc['accessors'].append(obj);return access
    mesh=doc['meshes'][0];old=mesh['primitives'][0]
    def read(access):
        a=doc['accessors'][access];v=doc['bufferViews'][a['bufferView']];count=a['count']*({'VEC3':3,'SCALAR':1}[a['type']]);fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']];return struct.unpack_from('<'+fmt*count,buf,v.get('byteOffset',0)+a.get('byteOffset',0))
    ps=read(old['attributes']['POSITION']);ids=read(old['indices']);headids=[]
    for i in range(0,len(ids),3):
        face=ids[i:i+3]
        if sum(ps[v*3+1] for v in face)/3>=world['neck_01'][1]:headids+=face
    old['indices']=attribute(headids,'SCALAR',1,5125)
    mesh['primitives'].append({'attributes':{'POSITION':attribute(positions,'VEC3',3),'NORMAL':attribute(normalvals,'VEC3',3),'TEXCOORD_0':attribute(texcoords,'VEC2',2),'JOINTS_0':attribute(jointvals,'VEC4',4,5123),'WEIGHTS_0':attribute(weightvals,'VEC4',4)},'indices':attribute(indices,'SCALAR',1,5125),'material':0})
    while len(buf)%4:buf.append(0)
    doc['buffers'][0]['byteLength']=len(buf);js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
    file.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(buf))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(buf),0x004e4942)+buf)
    print(source,'completed',len(positions)//3,'vertices')

