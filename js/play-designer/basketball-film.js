import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';
import { clone } from '../../vendor/three/SkeletonUtils.js';
import { basketballState } from './basketball-choreography.js';
import { basketballFeet } from './basketball-footwork.js';

// Authored basketball demonstration, independent of a coach's recorded board.
// All poses are authored here; no third-party motion capture is distributed.
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const clamp = x => Math.max(0,Math.min(1,x));
const ease = x => { x=clamp(x);return x*x*(3-2*x); };

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
  function line(points,color=paint){
    if(points.every(p=>p.y<.1)){
      const positions=[],indices=[];
      for(let i=0;i<points.length;i++){
        const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after.x-before.x,dz=after.z-before.z,l=Math.hypot(dx,dz)||1;
        for(const side of [-1,1])positions.push(points[i].x+side*dz/l*.025,.01,points[i].z-side*dx/l*.025);
        if(i<points.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const material=color.clone();material.side=THREE.DoubleSide;return mesh(geometry,material);
    }
    const curve=new THREE.CatmullRomCurve3(points);return mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),.0035,6,false),color);
  }
  line([V(-7.5,.02,-7.05),V(7.5,.02,-7.05),V(7.5,.02,7.05),V(-7.5,.02,7.05),V(-7.5,.02,-7.05)]);
  // Separate straight segments avoid rounded Catmull-Rom lane corners.
  for(const [a,b] of [[[-2.45,-7],[ -2.45,-1.25]],[[2.45,-7],[2.45,-1.25]],[[-2.45,-1.25],[2.45,-1.25]]])line([V(a[0],.025,a[1]),V(b[0],.025,b[1])]);
  const arc=(x,z,r,a,b)=>Array.from({length:65},(_,i)=>V(x+Math.cos(a+(b-a)*i/64)*r,.025,z+Math.sin(a+(b-a)*i/64)*r));
  line(arc(0,-1.25,1.8,0,Math.PI*2));line(arc(0,-5.4,6.75,.17,Math.PI-.17));
  line([V(-6.65,.025,-7),V(-6.65,.025,-4.26)]);line([V(6.65,.025,-7),V(6.65,.025,-4.26)]);
  mesh(new THREE.BoxGeometry(4.7,.005,5.7),mat('#006445',{roughness:.35}),scene,V(0,.003,-4.15));
  const hoop=V(0,3.05,-5.4);
  mesh(new THREE.BoxGeometry(1.8,1.05,.055),mat('#deeced',{transparent:true,opacity:.55,roughness:.08}),scene,V(0,3.45,-5.85)).name='Courthub_Backboard';
  for(const [x,y,w,h] of [[-.9,3.45,.035,1.1],[.9,3.45,.035,1.1],[0,2.925,1.8,.035],[0,3.975,1.8,.035],[-.295,3.275,.022,.45],[.295,3.275,.022,.45],[0,3.50,.59,.022],[0,3.05,.59,.022]])mesh(new THREE.BoxGeometry(w,h,.012),paint,scene,V(x,y,-5.812));
  mesh(new THREE.BoxGeometry(.15,3.8,.15),mat('#243237'),scene,V(0,1.9,-7.8));
  mesh(new THREE.BoxGeometry(.15,.15,2),mat('#243237'),scene,V(0,3.75,-6.85));
  const rim=mesh(new THREE.TorusGeometry(.225,.025,12,48),mat('#e8621c'),scene,hoop);rim.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    line(Array.from({length:6},(_,row)=>{const angle=a+(row%2)*Math.PI/12,r=.22-row*.019;return V(Math.cos(angle)*r,3.02-row*.083,-5.4+Math.sin(angle)*r);}),mat('#faf7ee'));
  }
  for(let row=1;row<6;row++)line(Array.from({length:49},(_,i)=>V(Math.cos(i*Math.PI/24)*(.22-row*.019),3.02-row*.083,-5.4+Math.sin(i*Math.PI/24)*(.22-row*.019))),mat('#faf7ee'));
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
  const source=await loader.loadAsync(new URL('../../assets/pnr/players/athlete.glb',import.meta.url).href);
  const players=[];
  for(let i=0;i<10;i++){
    const team=i<5?'attack':'defense',model=clone(source.scene),group=new THREE.Group();
    group.add(model);scene.add(group);
    const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;});
    const height=1.98,scale=(i===4?2.08:1.92+(i%3)*.035)/height;
    group.scale.setScalar(scale);
    const ankle=bones.foot_l.getWorldPosition(V()).y/scale;
    const soleBox=new THREE.Box3();
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
      o.material=o.material.clone();
      if(o.name.startsWith('Connected_anatomical_player')){
        o.name=`Player_${i+1}_Body`;o.material.name=`Player_${i+1}_Skin`;
        o.material.roughness=.52;
        o.material.color.set(['#ffffff','#eee4d6','#f6eadc'][i%3]);
      }
      if(o.name.includes('athletic_tank')||o.name.includes('swim_shorts')){
        const jersey=o.name.includes('athletic_tank');
        o.name=`Player_${i+1}_${jersey?'Jersey':'Shorts'}`;
        o.material.name=`Player_${i+1}_Fabric`;
        o.material.color.set(team==='attack'?'#00683e':'#e9e5d7');
        o.material.side=THREE.DoubleSide;o.material.roughness=.8;
      }
      if(o.name.startsWith('Sole_')){
        const side=o.name.endsWith('_l')?'l':'r';
        o.name=`Player_${i+1}_Sole_${side}`;
        soleBox.expandByObject(o);
      }
      if(o.name.startsWith('Uniform'))o.material.color.set(team==='attack'?'#f5eee0':'#164732');
    });
    const floor=soleBox.min.y/scale;
    const fingers=[];
    for(const side of ['l','r'])for(let finger=1;finger<=5;finger++)for(let segment=1;segment<=3;segment++){
      const bone=bones[`finger${finger}_${segment}_${side}`];
      const next=bone.children.find(child=>child.isBone);
      const direction=next?next.position.clone():bone.position.clone();
      const axis=direction.normalize().cross(V(0,0,1)).normalize();
      fingers.push({bone,axis,side,finger,segment});
    }
    players.push({group,model,bones,scale,hip:bones.pelvis.position.y,footHeight:ankle-floor,fingers,index:i,team});
  }
  const ball=mesh(new THREE.SphereGeometry(.12,32,24),mat('#ca611b',{roughness:.8}));
  for(const rot of [[0,0,0],[Math.PI/2,0,0],[0,Math.PI/2,0]])mesh(new THREE.TorusGeometry(.121,.003,5,48),mat('#38271a'),ball).rotation.set(...rot);
  function setArm(player,side,target){
    const upper=player.bones[`upperarm_${side}`],lower=player.bones[`lowerarm_${side}`],hand=player.bones[`hand_${side}`];
    player.group.updateMatrixWorld(true);
    const shoulder=upper.getWorldPosition(V()),length1=lower.position.length()*player.scale,length2=hand.position.length()*player.scale;
    const delta=target.clone().sub(shoulder),distance=Math.min(delta.length(),length1+length2-.001);delta.normalize();
    const along=(length1*length1-length2*length2+distance*distance)/(2*distance);
    const bend=V(side==='r'?-.2:.2,-.1,-1).applyQuaternion(player.group.getWorldQuaternion(new THREE.Quaternion()));bend.addScaledVector(delta,-bend.dot(delta)).normalize();
    const elbow=shoulder.clone().addScaledVector(delta,along).addScaledVector(bend,Math.sqrt(Math.max(0,length1*length1-along*along)));
    const aim=(bone,direction,axis)=>{
      const inverse=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      bone.quaternion.setFromUnitVectors(axis.clone().normalize(),direction.normalize().applyQuaternion(inverse));bone.updateMatrixWorld(true);
    };
    aim(upper,elbow.clone().sub(shoulder),lower.position);aim(lower,target.clone().sub(elbow),hand.position);
  }
  function setLeg(player,side,footprint,jump){
    const upper=player.bones[`thigh_${side}`],lower=player.bones[`calf_${side}`],foot=player.bones[`foot_${side}`];
    player.group.updateMatrixWorld(true);
    const hip=upper.getWorldPosition(V()),target=V(footprint.x,player.footHeight*player.scale+footprint.height+jump,footprint.z);
    const l1=lower.position.length()*player.scale,l2=foot.position.length()*player.scale;
    const delta=target.clone().sub(hip),distance=Math.min(delta.length(),l1+l2-.0001);delta.normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    const forward=V(Math.sin(player.group.rotation.y),0,Math.cos(player.group.rotation.y));
    forward.addScaledVector(delta,-forward.dot(delta)).normalize();
    const knee=hip.clone().addScaledVector(delta,along).addScaledVector(forward,Math.sqrt(Math.max(0,l1*l1-along*along)));
    const aim=(bone,direction,axis)=>{
      const inverse=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      bone.quaternion.setFromUnitVectors(axis.clone().normalize(),direction.normalize().applyQuaternion(inverse));bone.updateMatrixWorld(true);
    };
    aim(upper,knee.clone().sub(hip),lower.position);aim(lower,target.clone().sub(knee),foot.position);
    const level=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),footprint.yaw);
    foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(level));
  }
  function blendArm(player,side,target,weight){
    if(weight<=0)return;
    const upper=player.bones[`upperarm_${side}`],lower=player.bones[`lowerarm_${side}`];
    const a=upper.quaternion.clone(),b=lower.quaternion.clone();
    setArm(player,side,target);
    if(weight<1){upper.quaternion.copy(a.slerp(upper.quaternion,weight));lower.quaternion.copy(b.slerp(lower.quaternion,weight));player.group.updateMatrixWorld(true);}
  }
  function pose(player,t,p,direction,moving,state='idle',jump=0,feet,screenWeight=0){
    const {bones,group,hip}=player;group.position.copy(p);group.position.y=jump;
    group.rotation.y=direction;
    Object.values(bones).forEach(b=>b.rotation.set(0,0,0));bones.pelvis.position.y=hip;
    const wave=Math.sin(t*12+player.index*.7),stride=wave*.35*moving;
    const crouch=player.team==='defense'?.3:.08;
    bones.pelvis.position.y=hip-(state==='screen'?.10:player.team==='defense'?.11:.035+.045*moving)/player.scale;
    bones.spine_01.rotation.x=.045+.085*moving;
    if(state!=='screen')bones.spine_03.rotation.x=.007*Math.sin(t*1.7+player.index);
    for(const [side,sign] of [['l',1],['r',-1]]){
      bones[`thigh_${side}`].rotation.x=stride*sign-crouch;
      bones[`calf_${side}`].rotation.x=crouch*2+(moving?Math.max(0,-wave*sign)*.9:0);
      bones[`foot_${side}`].rotation.x=-crouch;
      bones[`upperarm_${side}`].rotation.x=-stride*sign-.15;
      bones[`upperarm_${side}`].rotation.z=(side==='l'?1:-1)*.07;
      bones[`lowerarm_${side}`].rotation.x=-.25-.55*moving;
    }
    if(state==='screen'){
      bones.spine_01.rotation.x=.015;
      for(const side of ['l','r']){
        bones[`thigh_${side}`].rotation.x=-.22;
        bones[`thigh_${side}`].rotation.z=side==='l'?.10:-.10;
        bones[`calf_${side}`].rotation.x=.44;
        bones[`foot_${side}`].rotation.x=-.22;
      }
    }
    if(player.team==='defense')for(const side of ['l','r']){bones[`upperarm_${side}`].rotation.z=(side==='l'?1:-1)*.55;bones[`lowerarm_${side}`].rotation.x=-.35;}
    group.updateMatrixWorld(true);
    let lower=0;
    for(const side of ['l','r']){
      const joint=bones[`thigh_${side}`].getWorldPosition(V()),goal=feet[side];
      const reach=(bones[`calf_${side}`].position.length()+bones[`foot_${side}`].position.length())*player.scale-.002;
      const horizontal=Math.hypot(joint.x-goal.x,joint.z-goal.z),vertical=Math.sqrt(Math.max(.01,reach*reach-horizontal*horizontal));
      lower=Math.max(lower,joint.y-(player.footHeight*player.scale+goal.height+jump)-vertical);
    }
    bones.pelvis.position.y-=Math.min(.30,Math.max(0,lower))/player.scale;
    group.updateMatrixWorld(true);
    for(const side of ['l','r'])setLeg(player,side,feet[side],jump);
    for(const finger of player.fingers){
      const curl=finger.finger===1?.12:(finger.segment===1?.12:.32);
      finger.bone.quaternion.setFromAxisAngle(finger.axis,curl);
    }
    if(screenWeight>0){
      group.updateMatrixWorld(true);
      for(const side of ['l','r']){
        const hand=group.localToWorld(V((side==='l'?.09:-.09)/player.scale,1.16/player.scale,.22/player.scale));
        blendArm(player,side,hand,screenWeight);
      }
    }
  }
  const handOffset=(player,x,y=0,z=0)=>V(x,y,z).applyQuaternion(player.group.getWorldQuaternion(new THREE.Quaternion()));
  function render(t=0,variant='pick-and-roll'){
    t=Math.max(0,Math.min(14,t));const pop=variant==='pick-and-pop';
    const state=basketballState(t,variant),{passStart,shotStart}=state;
    const passEnd=passStart+.65,shotEnd=shotStart+(pop?1.9:1.3);
    for(let i=0;i<10;i++){
      const actor=state.actors[i];
      const jump=i===4 && t>shotStart-.4 && t<shotStart+.45?Math.sin(clamp((t-shotStart+.4)/.85)*Math.PI)*.3:0;
      const screenWeight=i===4?Math.max(...state.screenWindows.map(([start,end])=>ease((t-start+.25)/.25)*(1-ease((t-end)/.3)))):0;
      const movement=actor.screen?0:ease(actor.speed/.8);
      pose(players[i],t,V(actor.x,0,actor.z),actor.yaw,movement,actor.screen?'screen':'idle',jump,basketballFeet(t,i,variant),screenWeight);
    }
    scene.updateMatrixWorld(true);
    const guardPlayer=players[0],bigPlayer=players[4];
    const bounce=(t*1.75)%1;
    const localBall=V(-.38,.121+.94*4*bounce*(1-bounce),.31);
    let ballPoint=guardPlayer.group.localToWorld(V(localBall.x/guardPlayer.scale,localBall.y/guardPlayer.scale,localBall.z/guardPlayer.scale));
    const receiverPoint=bigPlayer.group.localToWorld(V(0,1.3/bigPlayer.scale,.37/bigPlayer.scale));
    if(t<passStart){
      const gather=ease((t-(passStart-.55))/.55),held=guardPlayer.group.localToWorld(V(0,1.35/guardPlayer.scale,.42/guardPlayer.scale));
      ballPoint.lerp(held,gather);
      const hand=ballPoint.clone();hand.y=Math.max(.68,ballPoint.y+.07);hand.lerp(held.clone().add(handOffset(guardPlayer,-.09)),gather);setArm(guardPlayer,'r',hand);
      blendArm(guardPlayer,'l',held.clone().add(handOffset(guardPlayer,.09)),gather);
      const receive=ease((t-passStart+.35)/.35);
      for(const [side,x] of [['l',.1],['r',-.1]])blendArm(bigPlayer,side,receiverPoint.clone().add(handOffset(bigPlayer,x)),receive);
    }
    else if(t<passEnd){
      const from=guardPlayer.group.localToWorld(V(0,1.35/guardPlayer.scale,.42/guardPlayer.scale));const u=clamp((t-passStart)/(passEnd-passStart));ballPoint=from.clone().lerp(receiverPoint,u);ballPoint.y+=Math.sin(u*Math.PI)*.18;
      setArm(guardPlayer,'l',from.clone().add(handOffset(guardPlayer,.09)));setArm(guardPlayer,'r',from.clone().add(handOffset(guardPlayer,-.09)));
      setArm(bigPlayer,'l',receiverPoint.clone().add(handOffset(bigPlayer,.1)));setArm(bigPlayer,'r',receiverPoint.clone().add(handOffset(bigPlayer,-.1)));
    }else if(t<shotStart){
      const lift=ease((t-(shotStart-.6))/.6);ballPoint=receiverPoint.clone();ballPoint.y+=lift*.7;
      setArm(bigPlayer,'l',ballPoint.clone().add(handOffset(bigPlayer,.1,-.04)));setArm(bigPlayer,'r',ballPoint.clone().add(handOffset(bigPlayer,-.1,-.04)));
    }else if(t<shotEnd){
      const shotActor=basketballState(shotStart,variant).actors[4],jumpAtRelease=Math.sin(.4/.85*Math.PI)*.3;
      const from=V(shotActor.x+Math.sin(shotActor.yaw)*.37,2+jumpAtRelease,shotActor.z+Math.cos(shotActor.yaw)*.37);
      const u=clamp((t-shotStart)/(shotEnd-shotStart));ballPoint=from.clone().lerp(hoop,u);ballPoint.y+=Math.sin(u*Math.PI)*(pop?2.7:1.45);
      const weight=1-ease((t-shotStart-.65)/.45),extend=ease((t-shotStart)/.15);
      const right=V(-.1,-.04,0).lerp(V(0,.25,-.12),extend),left=V(.1,-.04,0).lerp(V(.15,.05,0),extend);
      blendArm(bigPlayer,'r',from.clone().add(right.applyQuaternion(bigPlayer.group.getWorldQuaternion(new THREE.Quaternion()))),weight);blendArm(bigPlayer,'l',from.clone().add(left.applyQuaternion(bigPlayer.group.getWorldQuaternion(new THREE.Quaternion()))),weight);
    }else{ballPoint=hoop.clone();ballPoint.y=Math.max(.13,3.05-(t-shotEnd)*5);if(ballPoint.y===.13)ballPoint.y+=Math.abs(Math.sin((t-shotEnd-.584)*5))*.24;}
    if(t>=passEnd&&t<passEnd+.35){
      const from=guardPlayer.group.localToWorld(V(0,1.35/guardPlayer.scale,.42/guardPlayer.scale)),weight=1-ease((t-passEnd)/.35);
      blendArm(guardPlayer,'l',from.clone().add(handOffset(guardPlayer,.09)),weight);blendArm(guardPlayer,'r',from.clone().add(handOffset(guardPlayer,-.09)),weight);
    }
    ball.position.copy(ballPoint);ball.rotation.set(t*2,t*3,t);
    for(const player of players){
      const head=player.bones.head,point=head.getWorldPosition(V()),local=player.group.worldToLocal(ballPoint.clone());
      head.rotation.y=Math.max(-.48,Math.min(.48,Math.atan2(local.x,local.z)))*.6;
      head.rotation.x=Math.max(-.15,Math.min(.18,(point.y-ballPoint.y)*.07));
    }
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
