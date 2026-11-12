import * as THREE from 'three';
import { BLADE, BLADE_EXTRUDE, RING_RADIUS, RING_TUBE } from '../geometry';
import { clamp01, lerp } from './timeline';

/**
 * Breakable version of the scissor blade: an intact blade, the same blade split in two
 * along a jagged fracture, and morph targets that bend the metal.
 */

/** Height at which the blade snaps. */
const SPLIT_Y = 0.98;

const quad = (a: THREE.Vector2, c: THREE.Vector2, b: THREE.Vector2, s: number) =>
  new THREE.Vector2(
    (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * c.x + s * s * b.x,
    (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * c.y + s * s * b.y,
  );
const spineAt = (s: number) => quad(BLADE.tip, BLADE.spineCtrl, BLADE.spineEnd, s);
const heelAt = (s: number) => quad(BLADE.spineEnd, BLADE.heelCtrl, BLADE.heelEnd, s);
/** Point of the straight cutting edge at height y. */
const edgeAt = (y: number) =>
  new THREE.Vector2(
    lerp(BLADE.edgeBase.x, BLADE.tip.x, (y - BLADE.edgeBase.y) / (BLADE.tip.y - BLADE.edgeBase.y)),
    y,
  );

const range = (from: number, to: number, steps: number, includeEnd = true) =>
  Array.from({ length: steps + (includeEnd ? 1 : 0) }, (_, i) => lerp(from, to, i / steps));

function extrude(points: THREE.Vector2[]) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(points), BLADE_EXTRUDE);
  geo.translate(0, 0, -BLADE.depth / 2);
  return geo;
}

/** Adds two morph targets: [0] bends the blade out of its plane, [1] warps it sideways. */
function addDamageMorphs(geo: THREE.BufferGeometry) {
  const base = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const target = (deform: (p: THREE.Vector3, k: number) => void) => {
    const clone = geo.clone();
    const pos = clone.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(base, i);
      deform(v, clamp01((v.y - 0.1) / 1.5));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    clone.computeVertexNormals();
    return { position: pos, normal: clone.attributes.normal as THREE.BufferAttribute };
  };
  const bend = target((p, k) => {
    p.z += 0.42 * k * k + Math.max(0, p.y - 0.6) * 0.22;
    p.y -= 0.12 * k * k;
  });
  const warp = target((p, k) => {
    p.x += 0.17 * Math.sin(k * Math.PI * 1.7) * Math.sqrt(k);
    p.z += 0.05 * Math.sin(k * 10);
  });
  geo.morphAttributes.position = [bend.position, warp.position];
  geo.morphAttributes.normal = [bend.normal, warp.normal];
  return geo;
}

/** Recentres a geometry (and its morph targets) on its bounding box. Returns the old centre. */
function recentre(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const centre = geo.boundingBox!.getCenter(new THREE.Vector3());
  geo.translate(-centre.x, -centre.y, -centre.z);
  for (const morph of geo.morphAttributes.position ?? []) {
    const attr = morph as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      attr.setXYZ(i, attr.getX(i) - centre.x, attr.getY(i) - centre.y, attr.getZ(i) - centre.z);
    }
  }
  return centre;
}

function build() {
  // Find where the curved spine crosses the fracture height.
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (spineAt(mid).y > SPLIT_Y) lo = mid;
    else hi = mid;
  }
  const sSplit = (lo + hi) / 2;
  const right = spineAt(sSplit);
  const left = edgeAt(SPLIT_Y);
  // Jagged fracture, listed from the cutting edge to the spine.
  const fracture = [
    left,
    new THREE.Vector2(lerp(left.x, right.x, 0.3), SPLIT_Y - 0.06),
    new THREE.Vector2(lerp(left.x, right.x, 0.62), SPLIT_Y + 0.05),
    right,
  ];

  const upperSpine = range(0, sSplit, 10, false).map(spineAt);
  const lowerSpine = range(sSplit, 1, 16).slice(1).map(spineAt);
  const heel = range(0, 1, 10).slice(1).map(heelAt);
  const upperEdge = range(SPLIT_Y, BLADE.tip.y, 8, false).slice(1).map(edgeAt);
  const lowerEdge = range(BLADE.edgeBase.y, SPLIT_Y, 14, false).map(edgeAt);
  const fullEdge = range(BLADE.edgeBase.y, BLADE.tip.y, 22, false).map(edgeAt);

  const intact = addDamageMorphs(
    extrude([...range(0, 1, 26).map(spineAt), ...heel, ...fullEdge]),
  );
  const lower = addDamageMorphs(extrude([...fracture, ...lowerSpine, ...heel, ...lowerEdge]));
  const tip = addDamageMorphs(extrude([...upperSpine, ...[...fracture].reverse(), ...upperEdge]));
  const tipCentre = recentre(tip);

  // Finger ring broken into a remaining arc plus loose fragments.
  const fragmentArc = 0.62;
  const fragmentCount = 3;
  const fragment = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 16, 12, fragmentArc);
  const fragmentCentre = recentre(fragment);
  const gapStart = 0.3;
  const gap = fragmentArc * fragmentCount;
  const brokenRing = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 24, 72, Math.PI * 2 - gap);

  return {
    intact,
    lower,
    tip,
    tipCentre,
    ring: {
      broken: brokenRing,
      /** Rotation that lines the remaining arc up after the gap. */
      brokenAngle: gapStart + gap,
      fragment,
      fragmentCentre,
      fragmentAngles: Array.from({ length: fragmentCount }, (_, i) => gapStart + i * fragmentArc),
    },
  };
}

let parts: ReturnType<typeof build> | null = null;
export function getBreakableScissors() {
  parts ??= build();
  return parts;
}
