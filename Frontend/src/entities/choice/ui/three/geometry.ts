import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, hash3, mulberry32 } from './noise';

/** Procedural geometry and textures. Everything is built once and shared across canvases. */

export const ACCENT = '#ff5b24';

/* ------------------------------- Rock ------------------------------- */

let rockGeometry: THREE.BufferGeometry | null = null;
export function getRockGeometry() {
  if (rockGeometry) return rockGeometry;
  const seed = 11;
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 36);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo);

  const rng = mulberry32(seed);
  const planes = Array.from({ length: 9 }, () => ({
    n: new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(),
    d: 0.7 + rng() * 0.18,
  }));

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const dark = new THREE.Color('#4a4845');
  const mid = new THREE.Color('#8f8b83');
  const light = new THREE.Color('#b8b3a8');
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize();
    const large = fbm(dir.x * 1.2, dir.y * 1.2, dir.z * 1.2, seed, 3);
    const detail = fbm(dir.x * 5.5, dir.y * 5.5, dir.z * 5.5, seed + 3, 4);
    v.copy(dir).multiplyScalar(1 + large * 0.25 + detail * 0.04);

    // Chisel flat facets like a real broken stone
    for (const p of planes) {
      const dist = v.dot(p.n);
      if (dist > p.d) v.addScaledVector(p.n, -(dist - p.d) * 0.9);
    }
    // Fine grain on top of facets
    const grain = fbm(dir.x * 18, dir.y * 18, dir.z * 18, seed + 9, 3);
    v.addScaledVector(dir, grain * 0.012);
    v.set(v.x * 1.18, v.y * 0.84, v.z * 1.02);
    pos.setXYZ(i, v.x, v.y, v.z);

    // Mineral colouring: veins + speckles + darker crevices
    const t = THREE.MathUtils.clamp(fbm(dir.x * 3, dir.y * 3, dir.z * 3, seed + 5, 4) * 0.9 + 0.5, 0, 1);
    col.copy(dark).lerp(mid, t);
    const speck = hash3(Math.floor(dir.x * 90), Math.floor(dir.y * 90), Math.floor(dir.z * 90), seed);
    if (speck > 0.975) col.lerp(light, 0.35);
    else if (speck < 0.04) col.lerp(dark, 0.5);
    const crevice = THREE.MathUtils.clamp(0.75 + detail * 2.2, 0.45, 1.05);
    col.multiplyScalar(crevice);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  rockGeometry = geo;
  return geo;
}

/* ------------------------------- Paper ------------------------------ */

export const PAPER_W = 1.5;
export const PAPER_H = 2;

/** Height of the resting sheet at (x, y): gentle bend, soft wave and a curled corner. */
export function paperBend(x: number, y: number) {
  let z = -0.14 * Math.pow(x / (PAPER_W / 2), 2) + 0.035 * Math.sin(y * 2.4 + 0.8);
  const u = (x - PAPER_W / 2 + (-y - PAPER_H / 2)) / Math.SQRT2 + 0.42;
  if (u > 0) z += u * u * 1.6;
  return z;
}

/** Paper sheets of the stack, from the printed top sheet to the back. */
export const PAPER_STACK = [
  { offset: [0, 0, 0], rotationZ: 0, color: '#ffffff' },
  { offset: [0.04, -0.03, -0.045], rotationZ: -0.05, color: '#eeebe5' },
  { offset: [0.09, -0.06, -0.09], rotationZ: -0.1, color: '#e4e1da' },
] as const;
/** How the idle stack is sized and tilted. */
export const PAPER_SCALE = 0.82;
export const PAPER_TILT = [-0.15, 0, 0.08] as const;

let paperGeometry: THREE.BufferGeometry | null = null;
export function getPaperGeometry() {
  if (paperGeometry) return paperGeometry;
  const geo = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 48, 64);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, paperBend(pos.getX(i), pos.getY(i)));
  geo.computeVertexNormals();
  paperGeometry = geo;
  return geo;
}

let paperTexture: THREE.CanvasTexture | null = null;
export function getPaperTexture() {
  if (paperTexture) return paperTexture;
  const w = 768, h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f6f4ef';
  ctx.fillRect(0, 0, w, h);

  // paper fibre noise
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // ruled lines
  ctx.strokeStyle = 'rgba(70, 110, 170, 0.28)';
  ctx.lineWidth = 2;
  for (let y = 150; y < h - 40; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // margin
  ctx.strokeStyle = 'rgba(255, 91, 36, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(110, 0);
  ctx.lineTo(110, h);
  ctx.stroke();

  // "handwriting" strokes
  const rng = mulberry32(4);
  ctx.strokeStyle = 'rgba(30, 32, 40, 0.55)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let line = 0; line < 14; line++) {
    const y = 150 + line * 38 - 9;
    let x = 135;
    const end = line % 5 === 4 ? 420 : 640 - rng() * 120;
    while (x < end) {
      const wordLen = 30 + rng() * 70;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let px = x; px < Math.min(x + wordLen, end); px += 6) {
        ctx.lineTo(px, y - 4 - Math.sin(px * 0.6 + line) * 5 * rng());
      }
      ctx.stroke();
      x += wordLen + 14;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  paperTexture = tex;
  return tex;
}

/* ----------------------------- Scissors ----------------------------- */

/** Blade outline, pivot at the origin, pointing towards +Y. */
export const BLADE = {
  tip: new THREE.Vector2(0, 1.62),
  spineCtrl: new THREE.Vector2(0.34, 0.75),
  spineEnd: new THREE.Vector2(0.24, 0.02),
  heelCtrl: new THREE.Vector2(0.18, -0.22),
  heelEnd: new THREE.Vector2(-0.04, -0.22),
  edgeBase: new THREE.Vector2(-0.035, 0.02),
  depth: 0.035,
} as const;

export const BLADE_EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: BLADE.depth,
  bevelEnabled: true,
  bevelThickness: 0.008,
  bevelSize: 0.008,
  bevelSegments: 3,
  curveSegments: 48,
};

let bladeGeometry: THREE.BufferGeometry | null = null;
export function getBladeGeometry() {
  if (bladeGeometry) return bladeGeometry;
  const s = new THREE.Shape();
  s.moveTo(BLADE.tip.x, BLADE.tip.y);
  s.quadraticCurveTo(BLADE.spineCtrl.x, BLADE.spineCtrl.y, BLADE.spineEnd.x, BLADE.spineEnd.y);
  s.quadraticCurveTo(BLADE.heelCtrl.x, BLADE.heelCtrl.y, BLADE.heelEnd.x, BLADE.heelEnd.y);
  s.lineTo(BLADE.edgeBase.x, BLADE.edgeBase.y);
  s.lineTo(BLADE.tip.x, BLADE.tip.y); // cutting edge
  const geo = new THREE.ExtrudeGeometry(s, BLADE_EXTRUDE);
  geo.translate(0, 0, -BLADE.depth / 2);
  bladeGeometry = geo;
  return geo;
}

/** Size of the scissors in a scene, and Z offset that lets the two blades slide over one another. */
export const SCISSORS_SCALE = 0.66;
export const HALF_Z = 0.03;

export const RING_CENTER = new THREE.Vector2(-0.44, -1.02);
export const RING_RADIUS = 0.27;
export const RING_TUBE = 0.075;
export const RING_STRETCH = 1.18;

/** Plastic bar linking the pivot to the finger ring. */
export const SHANK = (() => {
  const from = new THREE.Vector2(-0.02, -0.12);
  const toward = from.clone().sub(RING_CENTER).normalize();
  const to = RING_CENTER.clone().addScaledVector(toward, RING_RADIUS * 0.9);
  return {
    mid: from.clone().add(to).multiplyScalar(0.5),
    length: from.distanceTo(to),
    angle: Math.atan2(to.y - from.y, to.x - from.x),
  };
})();

/* ------------------------------ Effects ----------------------------- */

let softTexture: THREE.CanvasTexture | null = null;
/** Soft round sprite for dust and glows. */
export function getSoftTexture() {
  if (softTexture) return softTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  softTexture = new THREE.CanvasTexture(canvas);
  return softTexture;
}
