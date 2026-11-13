import { useRef, type ReactNode, type Ref } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import type { Choice } from '../../model/choice';
import {
  getBladeGeometry,
  getCageGeometry,
  getOrbGeometry,
  getPaperGeometry,
  getRingGeometry,
  getRockGeometry,
  getScrewGeometry,
  getShankGeometry,
  HALF_Z,
  PAPER_SCALE,
  PAPER_STACK,
  PAPER_TILT,
  RING_CENTER,
  RING_STRETCH,
  SCISSORS_SCALE,
  SHANK,
} from './geometry';
import { materials } from './materials';

/**
 * The 3D models. They only assemble shared geometries and materials, so mounting one
 * creates a handful of scene nodes and nothing on the GPU.
 */

export type ModelKind = Choice | 'unknown';

/* ---------------------------- Static parts -------------------------- */

export function RockMesh(props: ThreeElements['mesh']) {
  return <mesh geometry={getRockGeometry()} material={materials.rock()} {...props} />;
}

/** Back sheets of the paper stack (everything but the printed top sheet). */
export function PaperBackSheets() {
  return (
    <>
      {PAPER_STACK.map((sheet, layer) =>
        layer === 0 ? null : (
          <mesh
            key={layer}
            geometry={getPaperGeometry()}
            material={materials.paper(layer)}
            position={[...sheet.offset]}
            rotation-z={sheet.rotationZ}
          />
        ),
      )}
    </>
  );
}

export function PaperTopSheet() {
  return <mesh geometry={getPaperGeometry()} material={materials.paper(0)} />;
}

/** Plastic handle of one scissor half: shank bar and, optionally, the finger ring. */
export function ScissorHandle({ ring = true }: { ring?: boolean }) {
  return (
    <>
      <mesh
        geometry={getShankGeometry()}
        material={materials.handle()}
        position={[SHANK.mid.x, SHANK.mid.y, 0]}
        rotation-z={SHANK.angle}
      />
      {ring && (
        <mesh
          geometry={getRingGeometry()}
          material={materials.handle()}
          position={[RING_CENTER.x, RING_CENTER.y, 0]}
          scale={[RING_STRETCH, 1, 1]}
        />
      )}
    </>
  );
}

export function ScissorScrew(props: ThreeElements['mesh']) {
  return <mesh geometry={getScrewGeometry()} material={materials.screw()} rotation-x={Math.PI / 2} {...props} />;
}

function ScissorHalf({ mirror }: { mirror?: boolean }) {
  return (
    <group scale={[mirror ? -1 : 1, 1, 1]} position-z={mirror ? -HALF_Z : HALF_Z}>
      <mesh geometry={getBladeGeometry()} material={materials.steel()} />
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

/** Stand-in for a choice that is still hidden: a restless dark orb in a wire cage. */
function Mystery() {
  const cage = useRef<THREE.Mesh>(null);
  const orb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    if (cage.current) {
      cage.current.rotation.y += dt * 0.5;
      cage.current.rotation.x += dt * 0.2;
    }
    if (orb.current) {
      orb.current.scale.set(
        1 + 0.1 * Math.sin(t * 2.3),
        1 + 0.1 * Math.sin(t * 2.9 + 1.7),
        1 + 0.1 * Math.sin(t * 1.9 + 3.1),
      );
      orb.current.rotation.set(t * 0.4, t * 0.6, 0);
    }
  });
  return (
    <group>
      <mesh ref={cage} geometry={getCageGeometry()} material={materials.cage()} />
      <mesh ref={orb} geometry={getOrbGeometry()} material={materials.orb()} />
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
