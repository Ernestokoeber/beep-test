import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { createAthleteRig } from './athlete-rig.js';
import { createBoardAthleteMotion } from './board-athlete-motion.js';

// Board coordinates stay authoritative. Only presentation uses metres and height.
export function worldPoint(point, height = 0) {
  return new THREE.Vector3((point.x - 250) * .03, height, (point.y - 235) * .03);
}

export async function createCourt3D(host, onUnavailable, { board } = {}) {
  const rig = await createAthleteRig();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor('#e9efed');
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', '3D-Basketballfeld. Ziehen zum Drehen, zwei Finger zum Zoomen.');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enablePan = true;
  controls.minDistance = 5;
  controls.maxDistance = 36;
  controls.minPolarAngle = .04;
  controls.maxPolarAngle = Math.PI / 2 - .12;
  scene.add(new THREE.HemisphereLight('#ffffff', '#6d6254', 2.2));
  const light = new THREE.DirectionalLight('#ffffff', 2.5);
  light.position.set(-7, 14, 8);
  light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
  light.shadow.bias = -.0004;
  scene.add(light);
  const materials = new Set(), geometries = new Set(), textures = new Set();
  const material = (color, extra = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .75, ...extra });
    materials.add(value); return value;
  };
  const mesh = (geometry, surface, parent, position) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, surface);
    object.receiveShadow = true;
    if (position) object.position.set(...position);
    parent.add(object); return object;
  };
  const wood = material('#d9a76c'), dark = material('#24362e'), white = material('#ffffff');
  const woodCanvas = document.createElement('canvas'); woodCanvas.width = woodCanvas.height = 512;
  const grain = woodCanvas.getContext('2d'); let seed = 73;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let row = 0; row < 16; row++) for (let column = -1; column < 5; column++) {
    const x = column * 128 + (row % 2 ? 64 : 0), y = row * 32;
    grain.fillStyle = `hsl(33 49% ${52 + random() * 12}%)`; grain.fillRect(x, y, 128, 32);
    grain.strokeStyle = '#a87e50'; grain.lineWidth = .6; grain.strokeRect(x, y, 128, 32);
    for (let i = 0; i < 12; i++) { grain.strokeStyle = `rgba(115,75,35,${random() * .12})`; grain.beginPath(); grain.moveTo(x, y + random() * 32); grain.lineTo(x + 128, y + random() * 32); grain.stroke(); }
  }
  const parquet = new THREE.CanvasTexture(woodCanvas); parquet.colorSpace = THREE.SRGBColorSpace;
  parquet.wrapS = parquet.wrapT = THREE.RepeatWrapping; parquet.repeat.set(2, 2); textures.add(parquet);
  wood.color.set('#ffffff'); wood.map = parquet; wood.roughness = .55;
  mesh(new THREE.BoxGeometry(15.6, .2, 14.7), dark, scene, [0, -.14, 0]);
  mesh(new THREE.BoxGeometry(15, .08, 14.1), wood, scene, [0, -.04, 0]);
  const floorLines = new THREE.Group(); scene.add(floorLines);
  function line(points, color = '#ffffff') {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => worldPoint(p, .015)));
    const surface = new THREE.LineBasicMaterial({ color });
    geometries.add(geometry); materials.add(surface);
    floorLines.add(new THREE.Line(geometry, surface));
  }
  line([{ x: 5, y: 5 }, { x: 495, y: 5 }, { x: 495, y: 465 }, { x: 5, y: 465 }, { x: 5, y: 5 }]);
  line([{ x: 170, y: 5 }, { x: 170, y: 195 }, { x: 330, y: 195 }, { x: 330, y: 5 }]);
  const arc = (cx, cy, radius, from, to) => Array.from({ length: 81 }, (_, i) => {
    const a = from + (to - from) * i / 80;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  });
  line(arc(250, 195, 60, 0, Math.PI * 2));
  line(arc(250, 55, 225, .32, Math.PI - .32));
  line([{ x: 36.4, y: 5 }, { x: 36.4, y: 125.8 }]);
  line([{ x: 463.6, y: 5 }, { x: 463.6, y: 125.8 }]);
  line(arc(250, 55, 42, 0, Math.PI));
  line(arc(250, 465, 60, Math.PI, Math.PI * 2));
  const hoopPosition = worldPoint({ x: 250, y: 55 }, 3.05);
  mesh(new THREE.BoxGeometry(1.8, 1.05, .07), white, scene, [0, 3.52, -6.16]);
  mesh(new THREE.BoxGeometry(.15, 3.55, .15), dark, scene, [0, 1.78, -7.3]);
  mesh(new THREE.BoxGeometry(.15, .15, 1.15), dark, scene, [0, 3.52, -6.73]);
  const rim = mesh(new THREE.TorusGeometry(.225, .035, 8, 32), material('#e77326'), scene);
  rim.position.copy(hoopPosition); rim.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.23, .14, .4, 12, 1, true), material('#ffffff', { wireframe: true }), scene, [hoopPosition.x, 2.82, hoopPosition.z]);

  function label(text) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(5, 5, 118, 70, 20); ctx.fill();
    ctx.fillStyle = '#18372b'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(text).slice(0, 4), 64, 41, 108);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; textures.add(map);
    const surface = new THREE.SpriteMaterial({ map, depthTest: false }); materials.add(surface);
    const sprite = new THREE.Sprite(surface); sprite.position.y = 2.45; sprite.scale.set(.65, .41, 1); return sprite;
  }
  const actors = new Map();
  const core = window.BT.tactics.__core;
  const motion = board ? createBoardAthleteMotion(board, window.BT.tactics.snapshotAt, window.BT.tactics.boardDuration(board)) : null;
  function actor(element) {
    const value = rig.createPlayer(scene, { index: actors.size, team: element.type === 'offense' ? 'attack' : 'defense', height: String(element.role) === '5' ? 2.08 : undefined });
    const { group } = value;
    const number = label(element.role || element.id); group.add(number);
    const foot = mesh(new THREE.CircleGeometry(.43, 24), material(element.type === 'offense' ? '#008454' : '#db4545', { transparent: true, opacity: .22 }), group, [0, .02, 0]);
    foot.rotation.x = -Math.PI / 2;
    value.role = element.role; group.userData.boardElementId = element.id;
    actors.set(element.id, value); return value;
  }
  const ball = mesh(new THREE.SphereGeometry(.14, 16, 12), material('#ee8527'), scene);
  const seamMaterial = material('#45271a');
  for (const rotation of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]]) {
    const seam = mesh(new THREE.TorusGeometry(.141, .008, 4, 32), seamMaterial, ball);
    seam.rotation.set(...rotation);
  }
  const screens = new THREE.Group(); scene.add(screens);
  const screenSurface = material('#f2ba3f');
  const screenGeometry = new THREE.BoxGeometry(1.05, .08, .14); geometries.add(screenGeometry);
  let disposed = false, time = 0, lastSnapshot = null;
  function paint() { if (!disposed) renderer.render(scene, camera); }
  function resize() {
    if (disposed) return;
    const width = host.clientWidth || 600, height = host.clientHeight || 450;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); paint();
  }
  function setCamera(top = false) {
    if (top === 'close') {
      const ball = lastSnapshot?.elements?.find(e => e.type === 'ball');
      controls.target.copy(ball ? worldPoint(ball, 1) : new THREE.Vector3(0, 1, 0));
      const distance = camera.aspect < .85 ? 14 : 10;
      camera.position.copy(controls.target).add(new THREE.Vector3(distance * .6, distance * .4, distance * .7));
      controls.update(); paint(); return;
    }
    controls.target.set(0, 0, 0);
    const distance = camera.aspect < .85 ? 30 : 25;
    camera.position.set(top ? 0 : distance * .43, top ? distance : distance * .72, top ? .05 : distance * .7);
    controls.update(); paint();
  }
  function draw(value, seconds = 0) {
    if (disposed) return;
    time = seconds;
    lastSnapshot = value;
    const source = value._sourceStep || value;
    const elapsed = value._timeline?.elapsed || 0;
    const motions = source.transition?.motions || [];
    const activeScreens = value._activeScreens || (source.transition?.screens || []).filter(s => elapsed >= s.start && elapsed <= s.start + s.duration);
    const present = new Set();
    for (const element of value.elements || []) {
      if (!['offense', 'defense'].includes(element.type)) continue;
      present.add(element.id); const player = actors.get(element.id) || actor(element);
      player.group.visible = true;
      const movement = motions.find(m => m.elementId === element.id && elapsed >= m.start && elapsed < m.start + m.duration);
      const state = motion?.state(element.id, time);
      const screening = state?.screen ?? activeScreens.some(s => s.elementId === element.id && Math.hypot(element.x - s.x, element.y - s.y) < 18);
      let yaw = state?.yaw ?? Math.atan2(250 - element.x, 55 - element.y);
      if (!state && movement?.path?.length > 1) {
        const first = core.positionDuring(source, value._targetStep, element.id, Math.max(0, elapsed - .04)) || movement.path[0];
        const last = core.positionDuring(source, value._targetStep, element.id, elapsed + .04) || movement.path.at(-1);
        yaw = Math.atan2(last.x - first.x, last.y - first.y);
      }
      const point = worldPoint(element), feet = state?.feet || Object.fromEntries(['l', 'r'].map(side => [side, { x: point.x + Math.cos(yaw) * (side === 'l' ? .135 : -.135), z: point.z - Math.sin(yaw) * (side === 'l' ? .135 : -.135), height: 0, yaw }]));
      rig.pose(player, time, point, yaw, screening ? 0 : Math.min(1, (state?.speed || 0) / .8), screening ? 'screen' : 'idle', 0, feet, screening ? 1 : 0);
    }
    for (const [id, player] of actors) player.group.visible = present.has(id);
    while (screens.children.length) screens.remove(screens.children[0]);
    for (const screen of activeScreens) {
      const marker = new THREE.Mesh(screenGeometry, screenSurface);
      const screener = (value.elements || []).find(e => e.id === screen.elementId);
      if (screener && Math.hypot(screener.x - screen.x, screener.y - screen.y) >= 35) continue;
      marker.position.copy(worldPoint(screen, .09)); marker.rotation.y = -(screen.angle || 0) * Math.PI / 180;
      screens.add(marker);
    }
    const b = (value.elements || []).find(e => e.type === 'ball'); ball.visible = !!b;
    if (b) {
      const passes = source.transition?.passes || [];
      const pass = passes.find(p => elapsed >= p.start && elapsed < p.start + p.duration);
      const completed = passes.filter(p => elapsed >= p.start + p.duration).sort((a, b) => (b.start + b.duration) - (a.start + a.duration))[0];
      const carrierId = completed?.toId || value._ballCarrierId;
      const upcoming = passes.filter(p => p.fromId === carrierId && p.start > elapsed).sort((a, b) => a.start - b.start)[0];
      const gather = upcoming ? Math.max(0, Math.min(1, (elapsed - upcoming.start + .3) / .3)) : 0;
      const bounce = motions.some(m => m.elementId === carrierId && elapsed >= m.start && elapsed < m.start + m.duration);
      const dribbleHeight = .14 + Math.abs(Math.sin(time * 10)) * .94;
      const height = pass ? 1.3 + Math.sin(Math.PI * (elapsed - pass.start) / pass.duration) * .18 : bounce ? dribbleHeight + (1.3 - dribbleHeight) * gather : 1.3;
      ball.position.copy(worldPoint(b, height)); ball.rotation.z = time * 4;
      const carrier = actors.get(carrierId);
      if (carrier && !pass) {
        const target = ball.position.clone(); target.y = Math.max(.68, target.y + .07);
        rig.setArm(carrier, 'r', target);
        rig.blendArm(carrier, 'l', ball.position.clone().add(rig.handOffset(carrier, .1)), bounce ? gather : 1);
      }
      if (pass) {
        const u = Math.max(0, Math.min(1, (elapsed - pass.start) / pass.duration));
        for (const [id, weight] of [[pass.fromId, 1 - u], [pass.toId, u]]) {
          const player = actors.get(id); if (!player) continue;
          for (const [side, x] of [['l', .1], ['r', -.1]]) rig.blendArm(player, side, ball.position.clone().add(rig.handOffset(player, x)), weight);
        }
      }
    }
    scene.updateMatrixWorld(true);
    paint();
  }
  controls.addEventListener('change', paint);
  const observer = new ResizeObserver(resize); observer.observe(host);
  const contextLost = event => { event.preventDefault(); onUnavailable?.(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const keydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') return setCamera();
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (event.key === 'ArrowLeft') spherical.theta -= .15;
    if (event.key === 'ArrowRight') spherical.theta += .15;
    if (event.key === 'ArrowUp') spherical.phi = Math.max(.04, spherical.phi - .12);
    if (event.key === 'ArrowDown') spherical.phi = Math.min(controls.maxPolarAngle, spherical.phi + .12);
    if (event.key === '+') spherical.radius = Math.max(5, spherical.radius - 2);
    if (event.key === '-') spherical.radius = Math.min(36, spherical.radius + 2);
    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target)); controls.update(); paint();
  };
  renderer.domElement.addEventListener('keydown', keydown);
  resize(); setCamera();
  return {
    draw, setCamera, resize, actors, scene, camera, renderer,
    destroy() {
      if (disposed) return; disposed = true;
      observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.domElement.removeEventListener('keydown', keydown);
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) { materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
