import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  MeshDistortMaterial,
  RoundedBox,
} from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type ModelKind = 'pierre' | 'papier' | 'ciseau' | 'unknown';

export const ACCENT = '#ff5b24';

/* ------------------------------------------------------------------ */
/*  Procedural noise                                                   */
/* ------------------------------------------------------------------ */

function hash3(x: number, y: number, z: number, seed: number) {
  let h =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(z | 0, 1274126177) ^
    Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = THREE.MathUtils.lerp(c(0, 0, 0), c(1, 0, 0), u);
  const x10 = THREE.MathUtils.lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = THREE.MathUtils.lerp(c(0, 0, 1), c(1, 0, 1), u);
  const x11 = THREE.MathUtils.lerp(c(0, 1, 1), c(1, 1, 1), u);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(x00, x10, v),
    THREE.MathUtils.lerp(x01, x11, v),
    w,
  );
}

function fbm(x: number, y: number, z: number, seed: number, octaves = 4) {
  let amp = 0.5, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (valueNoise(x * freq, y * freq, z * freq, seed + i * 17) * 2 - 1);
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Geometry factories (cached once, shared across canvases)           */
/* ------------------------------------------------------------------ */

let rockGeometry: THREE.BufferGeometry | null = null;
function getRockGeometry() {
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

const PAPER_W = 1.5;
const PAPER_H = 2;

let paperGeometry: THREE.BufferGeometry | null = null;
function getPaperGeometry() {
  if (paperGeometry) return paperGeometry;
  const geo = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 48, 64);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // gentle cylindrical bend + soft wave
    let z = -0.14 * Math.pow(x / (PAPER_W / 2), 2) + 0.035 * Math.sin(y * 2.4 + 0.8);
    // curled bottom-right corner
    const u = (x - PAPER_W / 2 + (-y - PAPER_H / 2)) / Math.SQRT2 + 0.42;
    if (u > 0) z += u * u * 1.6;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  paperGeometry = geo;
  return geo;
}

let paperTexture: THREE.CanvasTexture | null = null;
function getPaperTexture() {
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

let bladeGeometry: THREE.BufferGeometry | null = null;
function getBladeGeometry() {
  if (bladeGeometry) return bladeGeometry;
  const s = new THREE.Shape();
  s.moveTo(0, 1.62); // tip
  s.quadraticCurveTo(0.34, 0.75, 0.24, 0.02); // spine
  s.quadraticCurveTo(0.18, -0.22, -0.04, -0.22); // heel around pivot
  s.lineTo(-0.035, 0.02);
  s.lineTo(0, 1.62); // cutting edge
  const depth = 0.035;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 48,
  });
  geo.translate(0, 0, -depth / 2);
  bladeGeometry = geo;
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Models                                                             */
/* ------------------------------------------------------------------ */

type ModelProps = { active?: boolean };

function Rock({ active }: ModelProps) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(getRockGeometry, []);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * (active ? 1.4 : 0.35);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, active ? 0.35 : 0.15, 0.05);
  });
  return (
    <mesh ref={ref} geometry={geo} scale={0.95} castShadow>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
    </mesh>
  );
}

function Paper({ active }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(getPaperGeometry, []);
  const tex = useMemo(getPaperTexture, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const amp = active ? 0.75 : 0.45;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, Math.sin(t * (active ? 1.6 : 0.6)) * amp, 0.08);
  });
  return (
    <group ref={ref} scale={0.82} rotation={[-0.15, 0, 0.08]}>
      <mesh geometry={geo} position={[0.09, -0.06, -0.09]} rotation-z={-0.1}>
        <meshStandardMaterial color="#e4e1da" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo} position={[0.04, -0.03, -0.045]} rotation-z={-0.05}>
        <meshStandardMaterial color="#eeebe5" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial map={tex} roughness={0.78} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

const RING_CENTER = new THREE.Vector2(-0.44, -1.02);
const RING_RADIUS = 0.27;

function ScissorHalf({ mirror, z }: { mirror?: boolean; z: number }) {
  const blade = useMemo(getBladeGeometry, []);
  const shank = useMemo(() => {
    const from = new THREE.Vector2(-0.02, -0.12);
    const toward = from.clone().sub(RING_CENTER).normalize();
    const to = RING_CENTER.clone().addScaledVector(toward, RING_RADIUS * 0.9);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const len = from.distanceTo(to);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    return { mid, len, angle };
  }, []);

  return (
    <group scale={[mirror ? -1 : 1, 1, 1]} position-z={z}>
      <mesh geometry={blade} castShadow>
        <meshStandardMaterial color="#eef1f4" metalness={0.92} roughness={0.22} envMapIntensity={1.6} />
      </mesh>
      <RoundedBox
        args={[shank.len, 0.15, 0.09]}
        radius={0.04}
        smoothness={4}
        position={[shank.mid.x, shank.mid.y, 0]}
        rotation-z={shank.angle}
        castShadow
      >
        <meshPhysicalMaterial color={ACCENT} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} />
      </RoundedBox>
      <mesh position={[RING_CENTER.x, RING_CENTER.y, 0]} scale={[1.18, 1, 1]} castShadow>
        <torusGeometry args={[RING_RADIUS, 0.075, 32, 96]} />
        <meshPhysicalMaterial color={ACCENT} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} />
      </mesh>
    </group>
  );
}

function Scissors({ active }: ModelProps) {
  const root = useRef<THREE.Group>(null);
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const open = active
      ? 0.18 + (Math.sin(t * 7) * 0.5 + 0.5) * 0.28
      : 0.16 + Math.sin(t * 1.4) * 0.06;
    if (a.current) a.current.rotation.z = THREE.MathUtils.lerp(a.current.rotation.z, -open, 0.25);
    if (b.current) b.current.rotation.z = THREE.MathUtils.lerp(b.current.rotation.z, open, 0.25);
    if (root.current) {
      const target = Math.sin(t * (active ? 1.4 : 0.5)) * (active ? 0.7 : 0.45);
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, target, 0.06);
    }
  });
  return (
    <group ref={root}>
      <group scale={0.66} rotation-z={-0.55} position={[0.05, -0.08, 0]}>
        <group ref={a}>
          <ScissorHalf z={0.03} />
        </group>
        <group ref={b}>
          <ScissorHalf mirror z={-0.03} />
        </group>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.065, 0.065, 0.13, 32]} />
          <meshStandardMaterial color="#9ea3ab" metalness={1} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

function Mystery() {
  const cage = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!cage.current) return;
    cage.current.rotation.y += dt * 0.5;
    cage.current.rotation.x += dt * 0.2;
  });
  return (
    <group>
      <mesh ref={cage}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#52525b" wireframe transparent opacity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.58, 96, 96]} />
        <MeshDistortMaterial color="#1c1c1f" metalness={0.9} roughness={0.12} distort={0.38} speed={2.2} />
      </mesh>
    </group>
  );
}

function Model({ kind, active }: { kind: ModelKind; active?: boolean }) {
  switch (kind) {
    case 'pierre': return <Rock active={active} />;
    case 'papier': return <Paper active={active} />;
    case 'ciseau': return <Scissors active={active} />;
    default: return <Mystery />;
  }
}

/* ------------------------------------------------------------------ */
/*  Scene setup                                                        */
/* ------------------------------------------------------------------ */

function Studio() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#ffd9c7" />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="rect" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[10, 1, 1]} />
          <Lightformer form="rect" intensity={3} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1.5, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[0, 0, 8]} scale={[12, 6, 1]} />
          <Lightformer form="ring" color={ACCENT} intensity={1.2} position={[0, -3, 6]} scale={4} />
        </group>
      </Environment>
    </>
  );
}

type SceneProps = {
  kind: ModelKind;
  active?: boolean;
  className?: string;
};

export function ChoiceScene({ kind, active, className }: SceneProps) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 5], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <Studio />
        <Float speed={active ? 3 : 1.6} rotationIntensity={0.25} floatIntensity={0.6}>
          <Model kind={kind} active={active} />
        </Float>
        <ContactShadows position={[0, -1.35, 0]} opacity={0.55} scale={6} blur={2.4} far={3} resolution={256} />
      </Canvas>
    </div>
  );
}

export function HeroScene({ className }: { className?: string }) {
  const items: ModelKind[] = ['pierre', 'papier', 'ciseau'];
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.3, 7.2], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <Studio />
        {items.map((kind, i) => (
          <Float key={kind} speed={1.4 + i * 0.3} rotationIntensity={0.3} floatIntensity={0.8}>
            <group position={[(i - 1) * 2.4, 0, 0]}>
              <Model kind={kind} />
            </group>
          </Float>
        ))}
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={12} blur={2.6} far={3} resolution={512} />
      </Canvas>
    </div>
  );
}
