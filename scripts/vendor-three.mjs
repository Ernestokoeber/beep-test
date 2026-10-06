import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = root + 'node_modules/three/';
const target = root + 'vendor/three/';
mkdirSync(target, { recursive: true });
for (const file of ['three.module.min.js', 'three.core.min.js']) copyFileSync(source + 'build/' + file, target + file);
copyFileSync(source + 'LICENSE', target + 'LICENSE.txt');
const controls = readFileSync(source + 'examples/jsm/controls/OrbitControls.js', 'utf8').replace("from 'three'", "from './three.module.min.js'");
writeFileSync(target + 'OrbitControls.js', controls);
for (const [sourceFile, targetFile] of [['loaders/GLTFLoader.js', 'GLTFLoader.js'], ['exporters/GLTFExporter.js', 'GLTFExporter.js'], ['utils/BufferGeometryUtils.js', 'BufferGeometryUtils.js'], ['utils/SkeletonUtils.js', 'SkeletonUtils.js']]) {
  const code = readFileSync(source + 'examples/jsm/' + sourceFile, 'utf8').replaceAll("from 'three'", "from './three.module.min.js'").replace("from '../utils/BufferGeometryUtils.js'", "from './BufferGeometryUtils.js'");
  writeFileSync(target + targetFile, code);
}
console.log('Three.js and OrbitControls copied for local and offline use.');
