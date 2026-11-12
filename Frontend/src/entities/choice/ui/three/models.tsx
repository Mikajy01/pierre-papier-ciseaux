import { useMemo, useRef, type ReactNode, type Ref } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { MeshDistortMaterial, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Choice } from '../../model/choice';
import {
  ACCENT,
  getBladeGeometry,
  getPaperGeometry,
  getPaperTexture,
  getRockGeometry,
  HALF_Z,
  PAPER_SCALE,
  PAPER_STACK,
  PAPER_TILT,
  RING_CENTER,
  RING_RADIUS,
  RING_STRETCH,
  RING_TUBE,
  SCISSORS_SCALE,
  SHANK,
} from './geometry';

export type ModelKind = Choice | 'unknown';

/* ----------------------------- Materials ---------------------------- */

export function RockMaterial() {
  return <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />;
}

export function SteelMaterial() {
  return <meshStandardMaterial color="#eef1f4" metalness={0.92} roughness={0.22} envMapIntensity={1.6} />;
}

export function HandleMaterial() {
  return <meshPhysicalMaterial color={ACCENT} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} />;
}

/* ---------------------------- Static parts -------------------------- */

export function RockMesh(props: ThreeElements['mesh']) {
  const geo = useMemo(getRockGeometry, []);
  return (
    <mesh geometry={geo} {...props}>
      <RockMaterial />
    </mesh>
  );
}

/** Back sheets of the paper stack (everything but the printed top sheet). */
export function PaperBackSheets() {
  const geo = useMemo(getPaperGeometry, []);
  return (
    <>
      {PAPER_STACK.slice(1).map((sheet) => (
        <mesh key={sheet.color} geometry={geo} position={[...sheet.offset]} rotation-z={sheet.rotationZ}>
          <meshStandardMaterial color={sheet.color} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

export function PaperTopSheet() {
  const geo = useMemo(getPaperGeometry, []);
  const tex = useMemo(getPaperTexture, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={tex} roughness={0.78} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Plastic handle of one scissor half: shank bar and, optionally, the finger ring. */
export function ScissorHandle({ ring = true }: { ring?: boolean }) {
  return (
    <>
      <RoundedBox
        args={[SHANK.length, 0.15, 0.09]}
        radius={0.04}
        smoothness={4}
        position={[SHANK.mid.x, SHANK.mid.y, 0]}
        rotation-z={SHANK.angle}
      >
        <HandleMaterial />
      </RoundedBox>
      {ring && (
        <mesh position={[RING_CENTER.x, RING_CENTER.y, 0]} scale={[RING_STRETCH, 1, 1]}>
          <torusGeometry args={[RING_RADIUS, RING_TUBE, 32, 96]} />
          <HandleMaterial />
        </mesh>
      )}
    </>
  );
}

export function ScissorScrew(props: ThreeElements['mesh']) {
  return (
    <mesh rotation-x={Math.PI / 2} {...props}>
      <cylinderGeometry args={[0.065, 0.065, 0.13, 32]} />
      <meshStandardMaterial color="#9ea3ab" metalness={1} roughness={0.25} />
    </mesh>
  );
}

function ScissorHalf({ mirror }: { mirror?: boolean }) {
  const blade = useMemo(getBladeGeometry, []);
  return (
    <group scale={[mirror ? -1 : 1, 1, 1]} position-z={mirror ? -HALF_Z : HALF_Z}>
      <mesh geometry={blade}>
        <SteelMaterial />
      </mesh>
      <ScissorHandle />
    </group>
  );
}

type ScissorsBodyProps = {
  /** Rotate around Z to open/close: front half takes -angle, back half +angle. */
  frontRef?: Ref<THREE.Group>;
  backRef?: Ref<THREE.Group>;
  children?: ReactNode;
};

/** Complete pair of scissors, pivot at the origin, blades pointing to +Y. */
export function ScissorsBody({ frontRef, backRef, children }: ScissorsBodyProps) {
  return (
    <group scale={SCISSORS_SCALE}>
      <group ref={frontRef}>
        <ScissorHalf />
      </group>
      <group ref={backRef}>
        <ScissorHalf mirror />
      </group>
      <ScissorScrew />
      {children}
    </group>
  );
}

/* ---------------------------- Idle models --------------------------- */

type ModelProps = { active?: boolean };

function Rock({ active }: ModelProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * (active ? 1.4 : 0.35);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, active ? 0.35 : 0.15, 0.05);
  });
  return <RockMesh ref={ref} scale={0.95} />;
}

function Paper({ active }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const amp = active ? 0.75 : 0.45;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, Math.sin(t * (active ? 1.6 : 0.6)) * amp, 0.08);
  });
  return (
    <group ref={ref} scale={PAPER_SCALE} rotation={[...PAPER_TILT]}>
      <PaperBackSheets />
      <PaperTopSheet />
    </group>
  );
}

function Scissors({ active }: ModelProps) {
  const root = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const open = active ? 0.18 + (Math.sin(t * 7) * 0.5 + 0.5) * 0.28 : 0.16 + Math.sin(t * 1.4) * 0.06;
    if (front.current) front.current.rotation.z = THREE.MathUtils.lerp(front.current.rotation.z, -open, 0.25);
    if (back.current) back.current.rotation.z = THREE.MathUtils.lerp(back.current.rotation.z, open, 0.25);
    if (root.current) {
      const target = Math.sin(t * (active ? 1.4 : 0.5)) * (active ? 0.7 : 0.45);
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, target, 0.06);
    }
  });
  return (
    <group ref={root}>
      <group rotation-z={-0.55} position={[0.05, -0.08, 0]}>
        <ScissorsBody frontRef={front} backRef={back} />
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

/** Idle, self-animated model of a choice. */
export function Model({ kind, active }: { kind: ModelKind; active?: boolean }) {
  switch (kind) {
    case 'pierre': return <Rock active={active} />;
    case 'papier': return <Paper active={active} />;
    case 'ciseau': return <Scissors active={active} />;
    default: return <Mystery />;
  }
}
