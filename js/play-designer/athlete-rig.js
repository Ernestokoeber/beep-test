import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';
import { clone } from '../../vendor/three/SkeletonUtils.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

// Shared anatomical model and pose solver for authored films and editable boards.
export async function createAthleteRig() {
  const loader=new GLTFLoader();
  const source=await loader.loadAsync(new URL('../../assets/pnr/players/athlete.glb',import.meta.url).href);
  function createPlayer(scene,{index:i=0,team='attack',height:playerHeight}={}) {
    const model=clone(source.scene),group=new THREE.Group();
    group.add(model);scene.add(group);
    const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;});
    const height=1.98,scale=(playerHeight || 1.92+(i%3)*.035)/height;
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
    return {group,model,bones,scale,hip:bones.pelvis.position.y,footHeight:ankle-floor,fingers,index:i,team};
  }
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
  return {createPlayer,pose,setArm,blendArm,handOffset};
}
