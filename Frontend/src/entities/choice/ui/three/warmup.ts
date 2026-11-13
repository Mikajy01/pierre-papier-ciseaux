import * as THREE from 'three';
import {
  getBladeGeometry,
  getCageGeometry,
  getFlashRingGeometry,
  getGravelGeometry,
  getHeapGeometry,
  getOrbGeometry,
  getPaperGeometry,
  getRingGeometry,
  getRockGeometry,
  getScrewGeometry,
  getShankGeometry,
  getUnitBox,
  getUnitPlane,
} from './geometry';
import { addStudioLights } from './lighting';
import { materials } from './materials';
import { getCutLayers } from './battle/cuttingPlan';
import { getDustGeometry } from './battle/rubble';
import { getBreakableScissors } from './battle/scissorsParts';
import { getWrapSheet } from './battle/wrapSheet';

/**
 * Compiles every shader and uploads every buffer and texture before the first scene shows.
 *
 * Without this the GPU work happens the first time each object is drawn, which is what makes
 * a model pop in late (or the page freeze) on phones. The scene built here is never shown:
 * it only lists one object per geometry/material pairing used anywhere in the game.
 */
export async function warmUp(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  addStudioLights(scene);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 20;
  camera.layers.enableAll();

  const disposable: { dispose: () => void }[] = [];
  const add = <T extends THREE.Object3D>(object: T) => {
    object.frustumCulled = false;
    scene.add(object);
    return object;
  };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => add(new THREE.Mesh(geometry, material));
  const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, colours = false) => {
    const object = add(new THREE.InstancedMesh(geometry, material, 1));
    if (colours) object.setColorAt(0, new THREE.Color('#ffffff'));
    disposable.push(object);
    return object;
  };

  const breakable = getBreakableScissors();

  // Models
  mesh(getRockGeometry(), materials.rock());
  mesh(getPaperGeometry(), materials.paper(0));
  mesh(getPaperGeometry(), materials.paper(1));
  mesh(getPaperGeometry(), materials.paper(2));
  mesh(getBladeGeometry(), materials.steel());
  mesh(getRingGeometry(), materials.handle());
  mesh(getShankGeometry(), materials.handle());
  mesh(getScrewGeometry(), materials.screw());
  mesh(getOrbGeometry(), materials.orb());
  mesh(getCageGeometry(), materials.cage());
  // Battles
  for (const blade of [breakable.intact, breakable.lower, breakable.tip]) mesh(blade, materials.battleSteel());
  mesh(breakable.ring.broken, materials.handle());
  mesh(breakable.ring.fragment, materials.handle());
  getCutLayers().forEach((layer, i) => layer.pieces.forEach((piece) => mesh(piece.geometry, materials.paper(i))));
  mesh(getWrapSheet().geometry, materials.paper(0));
  instanced(getGravelGeometry(), materials.gravel(), true);
  mesh(getHeapGeometry(), materials.heap());
  add(new THREE.Points(getDustGeometry(), materials.dust()));
  // Effects
  instanced(getUnitBox(), materials.spark());
  mesh(getFlashRingGeometry(), materials.flash(0));
  mesh(getUnitPlane(), materials.trail(0));
  mesh(getUnitPlane(), materials.shadow());
  add(new THREE.Sprite(materials.glow(0)));
  add(new THREE.Sprite(materials.puff(0)));

  // Compile without blocking the page where the browser supports it, then draw one frame
  // so geometry buffers and textures are uploaded too.
  await gl.compileAsync(scene, camera);
  gl.render(scene, camera);
  gl.clear();

  scene.clear();
  disposable.forEach((object) => object.dispose());
}
