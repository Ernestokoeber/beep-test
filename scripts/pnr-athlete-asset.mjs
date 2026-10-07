import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Check the shipped binary, including actual weights and bind transforms.
// This catches malformed asset exports before the browser/render pipeline.
const glb=readFileSync(new URL('../assets/pnr/players/athlete.glb',import.meta.url));
assert.equal(glb.readUInt32LE(0),0x46546c67);
assert.equal(glb.readUInt32LE(4),2);
assert.equal(glb.readUInt32LE(8),glb.length);
const length=glb.readUInt32LE(12),doc=JSON.parse(glb.subarray(20,20+length).toString());
const binary=glb.subarray(28+length);
assert.equal(doc.skins.length,1);
assert.equal(doc.skins[0].joints.length,52);
assert.ok(!doc.animations,'source character carries no foreign motion capture');
assert.ok(doc.images.every(image=>image.bufferView!==undefined&&!image.uri),'textures must be embedded');
function values(index){
 const a=doc.accessors[index],view=doc.bufferViews[a.bufferView];
 const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
 const bytes={5126:4,5125:4,5123:2}[a.componentType];
 const read={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE'}[a.componentType];
 const offset=(view.byteOffset||0)+(a.byteOffset||0);
 assert.ok(offset+a.count*width*bytes<=binary.length);
 return Array.from({length:a.count},(_,row)=>Array.from({length:width},(_,column)=>binary[read](offset+(row*width+column)*bytes)));
}
const jointNames=doc.skins[0].joints.map(index=>doc.nodes[index].name);
for(const side of ['l','r'])for(let finger=1;finger<=5;finger++)for(let segment=1;segment<=3;segment++)assert.ok(jointNames.includes(`finger${finger}_${segment}_${side}`));
const body=doc.meshes.find(mesh=>mesh.name==='Connected anatomical player');
assert.ok(body);
const used=new Set();let vertices=0;
for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
 const position=values(primitive.attributes.POSITION),index=values(primitive.indices).flat();
 assert.ok(position.every(row=>row.every(Number.isFinite)),mesh.name+' non-finite coordinate');
 assert.ok(index.every(i=>i>=0&&i<position.length),mesh.name+' invalid index');
 if(primitive.attributes.WEIGHTS_0!==undefined){
  const weights=values(primitive.attributes.WEIGHTS_0),joints=values(primitive.attributes.JOINTS_0);
  assert.equal(position.length,weights.length);assert.equal(weights.length,joints.length);
  for(let i=0;i<weights.length;i++){
   assert.ok(weights[i].every(w=>w>=0&&Number.isFinite(w)));
   assert.ok(Math.abs(weights[i].reduce((a,b)=>a+b,0)-1)<1e-5,mesh.name+' invalid skin weight');
   for(let k=0;k<4;k++){
    assert.ok(joints[i][k]<jointNames.length);
    if(mesh===body&&weights[i][k]>.01)used.add(jointNames[joints[i][k]]);
   }
  }
 }
 vertices+=position.length;
}
for(const name of ['pelvis','spine_01','spine_03','neck_01','head','upperarm_l','upperarm_r','thigh_l','thigh_r','finger2_2_l','finger2_2_r'])assert.ok(used.has(name),'missing anatomical influence '+name);
const inverse=values(doc.skins[0].inverseBindMatrices);
const world=doc.nodes.map(()=>[0,0,0]);
function walk(index,parent=[0,0,0]){
 const node=doc.nodes[index];world[index]=(node.translation||[0,0,0]).map((value,i)=>value+parent[i]);
 for(const child of node.children||[])walk(child,world[index]);
}
walk(0);
doc.skins[0].joints.forEach((index,i)=>{
 for(let axis=0;axis<3;axis++)assert.ok(Math.abs(inverse[i][12+axis]+world[index][axis])<1e-5,'incorrect bind translation '+doc.nodes[index].name);
});
for(const side of ['l','r']){
 const shoe=doc.nodes.find(node=>node.name==='Sole_'+side),foot=doc.nodes.findIndex(node=>node.name==='foot_'+side);
 assert.ok(doc.nodes[foot].children.includes(doc.nodes.indexOf(shoe)),'shoe must follow the ankle');
 assert.equal(shoe.skin,undefined,'shoe geometry stays rigid');
}
console.log(`Courthub athlete: ${vertices} exported vertices, 52 anatomical joints, normalized weights, embedded textures and valid rest bindings.`);
