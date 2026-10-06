import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';
import { clone } from '../../vendor/three/SkeletonUtils.js';

// Authored basketball demonstration, independent of a coach's recorded board.
// All poses are authored here; no third-party motion capture is distributed.
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const clamp = x => Math.max(0,Math.min(1,x));
const ease = x => { x=clamp(x);return x*x*(3-2*x); };
function path(keys,t) {
  let i=0;while(i<keys.length-2 && t>keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1];return V(a[1],0,a[2]).lerp(V(b[1],0,b[2]),ease((t-a[0])/(b[0]-a[0])));
}

export async function createBasketballFilm(host, { width=1280,height=720 } = {}) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#202d30');
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(width,height);renderer.setPixelRatio(1);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  host.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(43,width/height,.1,100);
  scene.add(new THREE.HemisphereLight('#e7f2ff','#645344',2.2));
  const light=new THREE.DirectionalLight('#fff1db',3.5);light.position.set(-5,12,3);light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-12;light.shadow.camera.right=12;light.shadow.camera.top=12;light.shadow.camera.bottom=-12;light.shadow.bias=-.0004;scene.add(light);
  const fill=new THREE.DirectionalLight('#c8e6ff',1.2);fill.position.set(8,6,-6);scene.add(fill);
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
  function mesh(g,m,parent=scene,p=V()) {const o=new THREE.Mesh(g,m);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  const woodCanvas=document.createElement('canvas');woodCanvas.width=1024;woodCanvas.height=1024;
  const ctx=woodCanvas.getContext('2d');ctx.fillStyle='#c58e55';ctx.fillRect(0,0,1024,1024);
  let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let row=0;row<16;row++)for(let column=0;column<4;column++){
    const x=column*256+(row%2?128:0)-128,y=row*64;
    ctx.fillStyle=`hsl(33 49% ${52+random()*12}%)`;ctx.fillRect(x,y,256,64);
    ctx.strokeStyle='#926736';ctx.lineWidth=1;ctx.strokeRect(x,y,256,64);
    for(let n=0;n<30;n++){ctx.strokeStyle=`rgba(115,75,35,${random()*.14})`;ctx.beginPath();ctx.moveTo(x,y+random()*64);ctx.lineTo(x+256,y+random()*64);ctx.stroke();}
  }
  const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;woodTexture.wrapS=woodTexture.wrapT=THREE.RepeatWrapping;woodTexture.repeat.set(2,2);
  mesh(new THREE.BoxGeometry(18,.2,19),mat('#15382f'),scene,V(0,-.14,0));
  mesh(new THREE.BoxGeometry(15,.06,14.1),mat('#ffffff',{map:woodTexture,roughness:.3}),scene,V(0,-.03,0));
  const paint=mat('#fbf7e7');
  function line(points,color=paint){const curve=new THREE.CatmullRomCurve3(points);return mesh(new THREE.TubeGeometry(curve,Math.max(2,points.length*3),.025,5,false),color);}
  line([V(-7.5,.02,-7.05),V(7.5,.02,-7.05),V(7.5,.02,7.05),V(-7.5,.02,7.05),V(-7.5,.02,-7.05)]);
  // Separate straight segments avoid rounded Catmull-Rom lane corners.
  for(const [a,b] of [[[-2.45,-7],[ -2.45,-1.25]],[[2.45,-7],[2.45,-1.25]],[[-2.45,-1.25],[2.45,-1.25]]])line([V(a[0],.025,a[1]),V(b[0],.025,b[1])]);
  const arc=(x,z,r,a,b)=>Array.from({length:65},(_,i)=>V(x+Math.cos(a+(b-a)*i/64)*r,.025,z+Math.sin(a+(b-a)*i/64)*r));
  line(arc(0,-1.25,1.8,0,Math.PI*2));line(arc(0,-5.4,6.75,.17,Math.PI-.17));
  line([V(-6.65,.025,-7),V(-6.65,.025,-4.26)]);line([V(6.65,.025,-7),V(6.65,.025,-4.26)]);
  mesh(new THREE.BoxGeometry(4.7,.005,5.7),mat('#006445',{roughness:.35}),scene,V(0,.003,-4.15));
  const hoop=V(0,3.05,-5.4);
  mesh(new THREE.BoxGeometry(1.8,1.05,.055),mat('#deeced',{transparent:true,opacity:.55,roughness:.08}),scene,V(0,3.55,-5.85));
  mesh(new THREE.BoxGeometry(.15,3.8,.15),mat('#243237'),scene,V(0,1.9,-7.8));
  mesh(new THREE.BoxGeometry(.15,.15,2),mat('#243237'),scene,V(0,3.75,-6.85));
  const rim=mesh(new THREE.TorusGeometry(.225,.025,12,48),mat('#e8621c'),scene,hoop);rim.rotation.x=Math.PI/2;
  const net=new THREE.Group();scene.add(net);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,b=a+.5;
    line([V(Math.cos(a)*.22,3.02,-5.4+Math.sin(a)*.22),V(Math.cos(b)*.16,2.6,-5.4+Math.sin(b)*.16)],mat('#faf7ee'));
  }
  // Hall walls, bleachers and lights give the action a physical setting.
  mesh(new THREE.BoxGeometry(25,7,.2),mat('#a5b0ae'),scene,V(0,3.5,-10));
  mesh(new THREE.BoxGeometry(.2,7,24),mat('#929f9c'),scene,V(-12.5,3.5,0));
  for(let row=0;row<3;row++){
    mesh(new THREE.BoxGeometry(21,.35,1.1),mat('#414e50'),scene,V(0,.45+row*.45,-8.6-row*.55));
    for(let seat=0;seat<25;seat++)mesh(new THREE.BoxGeometry(.55,.12,.55),mat(row%2?'#d3d8d3':'#006b47'),scene,V(-10+seat*.83,.71+row*.45,-8.5-row*.55));
  }
  for(let x=-9;x<=9;x+=6)mesh(new THREE.BoxGeometry(3,.1,.4),mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:2}),scene,V(x,6.5,-6));
  function sign(text,w,h,color='#f5f4e8'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const k=c.getContext('2d');k.fillStyle='#006b47';k.fillRect(0,0,1024,256);k.fillStyle=color;k.font='700 94px Arial';k.textAlign='center';k.textBaseline='middle';k.fillText(text,512,128);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));
  }
  sign('COURTHUB  ·  PnR',7,1.5).position.set(0,5.4,-9.85);
  const loader=new GLTFLoader();
  const sources=await Promise.all(['1037','1074','1185'].map(id=>loader.loadAsync(new URL(`../../assets/pnr/players/player-${id}.glb`,import.meta.url).href)));
  const players=[];
  function garment(body,skeleton,hip,top,color,shorts=false){
    if(!shorts){
      const positions=[],joints=[],weights=[],indices=[],rings=[[-.13,.245,.175],[.13,.225,.185],[.42,.255,.18],[.59,.245,.155],[.64,.10,.09]];
      const pelvis=skeleton.bones.findIndex(b=>b.name==='pelvis'),spine=skeleton.bones.findIndex(b=>b.name==='spine_03');
      for(const [dy,rx,rz] of rings)for(let i=0;i<24;i++){
        const a=i*Math.PI/12,blend=clamp((dy+.11)/.50);positions.push(Math.cos(a)*rx,hip+.12+dy,Math.sin(a)*rz-.018);joints.push(pelvis,spine,0,0);weights.push(1-blend,blend,0,0);
      }
      for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<24;i++){
        if(ring===2 && Math.abs(Math.cos((i+.5)*Math.PI/12))>.78)continue;
        const a=ring*24+i,b=ring*24+(i+1)%24,c=(ring+1)*24+i,d=(ring+1)*24+(i+1)%24;indices.push(a,c,b,b,c,d);
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setIndex(indices);g.computeVertexNormals();
      const jersey=new THREE.SkinnedMesh(g,mat(color,{roughness:.9,side:THREE.DoubleSide}));jersey.bind(skeleton,body.bindMatrix);jersey.castShadow=true;body.parent.add(jersey);return jersey;
    }
    const geo=body.geometry.clone(),pos=geo.attributes.position,norm=geo.attributes.normal,indices=[];
    const original=geo.index;const maxX=shorts?.3:.245;
    for(let i=0;i<original.count;i+=3){const a=original.getX(i),b=original.getX(i+1),c=original.getX(i+2);
      const y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3,x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3;
      const onTorso=[a,b,c].every(vertex=>{
        const joints=geo.attributes.skinIndex,weights=geo.attributes.skinWeight;
        let torso=0;for(let k=0;k<4;k++){const name=skeleton.bones[joints.array[vertex*4+k]]?.name||'';if(/pelvis|spine|thigh|calf/.test(name))torso+=weights.array[vertex*4+k];}
        return torso>.82;
      });
      const strap=!shorts && y>hip+.51 && Math.abs(x)>.075 && Math.abs(x)<.21;
      if(y>hip && y<top && Math.abs(x)<maxX && (onTorso||strap))indices.push(a,b,c);
    }
    for(let i=0;i<pos.count;i++){pos.setXYZ(i,pos.getX(i)+norm.getX(i)*.032,pos.getY(i)+norm.getY(i)*.025,pos.getZ(i)+norm.getZ(i)*.035);}
    pos.needsUpdate=true;geo.setIndex(indices);geo.computeBoundingSphere();
    const outfit=new THREE.SkinnedMesh(geo,mat(color,{roughness:.9,side:THREE.DoubleSide}));outfit.bind(skeleton,body.bindMatrix);outfit.castShadow=true;outfit.receiveShadow=true;body.parent.add(outfit);return outfit;
  }
  for(let i=0;i<10;i++){
    const team=i<5?'attack':'defense',model=clone(sources[i%3].scene),group=new THREE.Group();group.add(model);scene.add(group);
    const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;});
    const box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;
    const scale=(i===4?2.08:1.92+(i%3)*.035)/height;group.scale.setScalar(scale);
    let body;
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(o.material.name==='Human.body')body=o;}});
    // A separate full anatomical body uses a skin tone matching its face.
    body.material=mat(['#bf8e70','#dbb49b','#78503a'][i%3],{roughness:.8});
    const hip=bones.pelvis.position.y;
    const color=team==='attack'?'#00683e':'#e9e5d7';
    garment(body,body.skeleton,hip-.12,hip+.62,color);
    garment(body,body.skeleton,hip-.43,hip-.055,color,true);
    for(const side of ['l','r']){
      const foot=bones[`foot_${side}`];
      const shoe=mesh(new THREE.CapsuleGeometry(.085,.14,6,12),mat('#f8f8ef'),foot,V(0,-.01,.1));shoe.rotation.x=Math.PI/2;shoe.scale.z=.72;
      mesh(new THREE.BoxGeometry(.18,.025,.3),mat('#182e2c'),foot,V(0,-.072,.09));
    }
    // Jersey number is part of the player's uniform, rather than a marker.
    const numberCanvas=document.createElement('canvas');numberCanvas.width=numberCanvas.height=256;
    const nk=numberCanvas.getContext('2d');nk.fillStyle=team==='attack'?'#ffffff':'#143a2c';nk.font='bold 190px Arial';nk.textAlign='center';nk.textBaseline='middle';nk.fillText(String(i%5+1),128,139);
    const numberMap=new THREE.CanvasTexture(numberCanvas);numberMap.colorSpace=THREE.SRGBColorSpace;
    const number=new THREE.Mesh(new THREE.PlaneGeometry(.17,.22),new THREE.MeshBasicMaterial({map:numberMap,transparent:true,depthWrite:false}));
    bones.spine_03.add(number);number.position.set(0,-.05,.165);
    players.push({group,model,bones,scale,hip,index:i,team});
  }
  const ball=mesh(new THREE.SphereGeometry(.12,32,24),mat('#ca611b',{roughness:.8}));
  for(const rot of [[0,0,0],[Math.PI/2,0,0],[0,Math.PI/2,0]])mesh(new THREE.TorusGeometry(.121,.003,5,48),mat('#38271a'),ball).rotation.set(...rot);
  function setArm(player,side,target){
    const upper=player.bones[`upperarm_${side}`],lower=player.bones[`lowerarm_${side}`],hand=player.bones[`hand_${side}`];
    player.group.updateMatrixWorld(true);
    const shoulder=upper.getWorldPosition(V()),length1=lower.position.length()*player.scale,length2=hand.position.length()*player.scale;
    const delta=target.clone().sub(shoulder),distance=Math.min(delta.length(),length1+length2-.001);delta.normalize();
    const along=(length1*length1-length2*length2+distance*distance)/(2*distance);
    const bend=V(side==='r'?-.2:.2,-.1,-1);bend.addScaledVector(delta,-bend.dot(delta)).normalize();
    const elbow=shoulder.clone().addScaledVector(delta,along).addScaledVector(bend,Math.sqrt(Math.max(0,length1*length1-along*along)));
    const aim=(bone,direction,axis)=>{const q=new THREE.Quaternion().setFromUnitVectors(axis.clone().normalize(),direction.normalize());bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));bone.updateMatrixWorld(true);};
    aim(upper,elbow.clone().sub(shoulder),lower.position);aim(lower,target.clone().sub(elbow),hand.position);
  }
  function pose(player,t,p,direction,moving,state='idle',jump=0){
    const {bones,group,hip}=player;group.position.copy(p);group.position.y=jump;
    group.rotation.y=direction;
    Object.values(bones).forEach(b=>b.rotation.set(0,0,0));bones.pelvis.position.y=hip;
    const wave=Math.sin(t*9+player.index*.7),stride=moving?wave*.55:0;
    const crouch=player.team==='defense'?.3:.08;
    bones.pelvis.position.y=hip-(moving?.035: crouch*.15)/player.scale;
    bones.spine_01.rotation.x=moving?.13:.045;
    for(const [side,sign] of [['l',1],['r',-1]]){
      bones[`thigh_${side}`].rotation.x=stride*sign-crouch;
      bones[`calf_${side}`].rotation.x=crouch*2+(moving?Math.max(0,-wave*sign)*.9:0);
      bones[`foot_${side}`].rotation.x=-crouch;
      bones[`upperarm_${side}`].rotation.x=-stride*sign-.15;
      bones[`upperarm_${side}`].rotation.z=(side==='l'?1:-1)*.07;
      bones[`lowerarm_${side}`].rotation.x=moving?-.8:-.25;
    }
    if(state==='screen'){
      bones.upperarm_l.rotation.x=bones.upperarm_r.rotation.x=-.35;
      bones.lowerarm_l.rotation.x=bones.lowerarm_r.rotation.x=-1.2;
      bones.upperarm_l.rotation.z=.25;bones.upperarm_r.rotation.z=-.25;
    }
    if(player.team==='defense')for(const side of ['l','r']){bones[`upperarm_${side}`].rotation.z=(side==='l'?1:-1)*.55;bones[`lowerarm_${side}`].rotation.x=-.35;}
    group.updateMatrixWorld(true);
    const lowest=Math.min(bones.foot_l.getWorldPosition(V()).y,bones.foot_r.getWorldPosition(V()).y)-.072*player.scale;
    group.position.y+=jump-lowest;
  }
  const spots=[[-5.7,1.8],[5.7,1.8],[-5.9,-4.8]];
  function render(t=0,variant='pick-and-roll'){
    t=Math.max(0,Math.min(14,t));const reject=variant==='pick-and-roll-reject',pop=variant==='pick-and-pop';
    const guardKeys=reject?[[0,0,5],[2,0,5],[4,-1.5,2.6],[5.4,-1.5,2.6],[7.7,1.9,.2],[10,1.9,-.6],[14,1.9,-.6]]:[[0,0,5],[2,0,5],[4,1.7,1.7],[6.5,2.3,-.2],[14,2.3,-.2]];
    const bigKeys=pop?[[0,2,2.6],[2,.9,1.8],[4.5,.9,1.8],[7.5,4.6,1],[14,4.6,1]]:reject?[[0,2,2.6],[2,-.3,2.5],[4,-.3,2.5],[5.4,-.6,2],[6.5,-.6,2],[9.2,0,-3.8],[14,0,-3.8]]:[[0,2,2.6],[2,.9,1.8],[4.5,.9,1.8],[8.1,0,-3.8],[14,0,-3.8]];
    const positions=[path(guardKeys,t),...spots.map(([x,z])=>V(x,0,z)),path(bigKeys,t)];
    const passStart=reject?9:7.6,passEnd=passStart+.65,shotStart=reject?10.6:9.2,shotEnd=shotStart+(pop?1.9:1.3);
    const paths=[guardKeys,null,null,null,bigKeys];
    for(let i=0;i<5;i++){
      const p=positions[i],before=paths[i]?path(paths[i],t-.035):p,after=paths[i]?path(paths[i],t+.035):p;
      const velocity=after.clone().sub(before),moving=velocity.length()>.005;
      const angle=moving?Math.atan2(velocity.x,velocity.z):i===0?Math.PI:i===4?Math.atan2(-p.x,-5.4-p.z):Math.atan2(-p.x,-p.z);
      const screening=i===4 && t>1.9 && t<(reject?6.5:4.5);
      const jump=i===4 && t>shotStart-.4 && t<shotStart+.45?Math.sin(clamp((t-shotStart+.4)/.85)*Math.PI)*.3:0;
      pose(players[i],t,p,screening?Math.PI/2:angle,moving,screening?'screen':'idle',jump);
    }
    const guard=positions[0],big=positions[4];
    const d1=guard.clone().add(V(-.6,0,-.95));
    if(t>3 && t<6.5 && !reject)d1.copy(path([[3,.7,2.8],[4.4,.35,1.8],[6.5,1.7,.7]],t));
    const d5=path(pop?[[0,1,1],[4,1,1],[7,1.5,-1],[14,2.1,-.9]]:[[0,1,1],[4,1,1],[7,1.8,-2],[14,1.1,-4.5]],t);
    const defense=[d1,V(-4.7,0,1),V(4.7,0,1),V(-4.8,0,-4),d5];
    for(let i=0;i<5;i++){
      const p=defense[i],target=i===4?big:positions[i];pose(players[i+5],t,p,Math.atan2(target.x-p.x,target.z-p.z),(i===0||i===4)&&t>2&&t<8);
    }
    scene.updateMatrixWorld(true);
    const guardPlayer=players[0],bigPlayer=players[4];
    const localBall=V(-.42,.17+Math.abs(Math.cos(t*6.5))*.94,.34);
    let ballPoint=guardPlayer.group.localToWorld(V(localBall.x/guardPlayer.scale,localBall.y/guardPlayer.scale,localBall.z/guardPlayer.scale));
    const receiverPoint=bigPlayer.group.localToWorld(V(0,1.3/bigPlayer.scale,.37/bigPlayer.scale));
    if(t<passStart){const hand=ballPoint.clone();hand.y=Math.max(.87,ballPoint.y+.07);setArm(guardPlayer,'r',hand);}
    else if(t<passEnd){
      const from=guardPlayer.group.localToWorld(V(0,1.35/guardPlayer.scale,.42/guardPlayer.scale));const u=clamp((t-passStart)/(passEnd-passStart));ballPoint=from.clone().lerp(receiverPoint,u);ballPoint.y+=Math.sin(u*Math.PI)*.18;
      setArm(guardPlayer,'l',from.clone().add(V(.09,0,0)));setArm(guardPlayer,'r',from.clone().add(V(-.09,0,0)));
      setArm(bigPlayer,'l',receiverPoint.clone().add(V(.1,0,0)));setArm(bigPlayer,'r',receiverPoint.clone().add(V(-.1,0,0)));
    }else if(t<shotStart){
      const lift=ease((t-(shotStart-.6))/.6);ballPoint=receiverPoint.clone();ballPoint.y+=lift*.7;
      setArm(bigPlayer,'l',ballPoint.clone().add(V(.1,-.04,0)));setArm(bigPlayer,'r',ballPoint.clone().add(V(-.1,-.04,0)));
    }else if(t<shotEnd){
      const from=receiverPoint.clone();from.y+=.7;const u=clamp((t-shotStart)/(shotEnd-shotStart));ballPoint=from.clone().lerp(hoop,u);ballPoint.y+=Math.sin(u*Math.PI)*(pop?2.7:1.45);
      if(t<shotStart+.65){setArm(bigPlayer,'r',from.clone().add(V(0,.25,-.12)));setArm(bigPlayer,'l',from.clone().add(V(.15,.05,0)));}
    }else{ballPoint=hoop.clone();ballPoint.y=Math.max(.13,3.05-(t-shotEnd)*5);if(ballPoint.y===.13)ballPoint.y+=Math.abs(Math.sin((t-shotEnd-.584)*5))*.24;}
    ball.position.copy(ballPoint);ball.rotation.set(t*2,t*3,t);
    // A continuous sideline camera keeps all reads visible without jump cuts.
    camera.position.set(9.1-.9*ease(t/14),5.5-.5*ease(t/14),10.2-1.3*ease(t/14));camera.lookAt(.2,1.1,-.3-1.3*ease(t/14));
    scene.updateMatrixWorld(true);renderer.render(scene,camera);
  }
  render();
  return {render,canvas:renderer.domElement,players,scene,camera,renderer,destroy(){
    const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();
  }};
}
