import { useRef } from 'react';
import type * as THREE from 'three';
import type { Choice } from '../../../model/choice';
import { Model } from '../models';
import { castBlobShadow } from '../shadowCaster';
import { BlobShadow } from '../shadows';
import { useBattleFrame } from './clock';
import { Flashes, Sparks, type Flash, type SparkBurst } from './fx';
import { HOME_X } from './stage';
import { decay, ease, kick, seg, track, type Key } from './timeline';

const CLASH = 0.95;
export const DRAW_DURATION = 1.7;

/** Distance from the centre: both rush in, bump, and bounce back to their side. */
const APPROACH: Key[] = [
  { t: 0.5, v: [HOME_X] },
  { t: 0.7, v: [HOME_X + 0.3], ease: ease.outQuad },
  { t: CLASH, v: [0.85], ease: ease.inCubic },
  { t: 1.6, v: [HOME_X], ease: ease.outCubic },
];

const SPARKS: SparkBurst[] = [{ t: CLASH, at: [0, 0.1, 0.4], count: 22, power: 4.5 }];
const FLASHES: Flash[] = [{ t: CLASH, at: [0, 0.1, 0.5], size: 1 }];

const distance = [0];

/** Same choice on both sides: nobody wins. */
export function DrawClash({ kind }: { kind: Choice }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const leftShadow = useRef<THREE.Mesh>(null);
  const rightShadow = useRef<THREE.Mesh>(null);

  useBattleFrame((t, clock) => {
    track(APPROACH, t, distance);
    const intro = ease.outBack(seg(t, 0.05, 0.5));
    const recoil = kick(t, CLASH, 5);
    const hover = 0.06 * Math.sin(t * 1.6);
    left.current?.position.set(-distance[0], hover + 0.25 * recoil, 0);
    left.current?.rotation.set(0, 0, 0.5 * recoil);
    left.current?.scale.setScalar(intro);
    right.current?.position.set(distance[0], -hover + 0.25 * recoil, 0);
    right.current?.rotation.set(0, 0, -0.5 * recoil);
    right.current?.scale.set(-intro, intro, intro);
    castBlobShadow(leftShadow.current, -distance[0], 0, 0.6 + 0.25 * recoil, 0.85 * intro);
    castBlobShadow(rightShadow.current, distance[0], 0, 0.6 + 0.25 * recoil, 0.85 * intro);
    clock.shake = 0.08 * decay(t, CLASH, 9);
  });

  return (
    <group>
      <group ref={left} position={[-HOME_X, 0, 0]}>
        <Model kind={kind} />
      </group>
      {/* Mirrored so the two opponents face each other. */}
      <group ref={right} position={[HOME_X, 0, 0]} scale={[-1, 1, 1]}>
        <Model kind={kind} />
      </group>
      <BlobShadow ref={leftShadow} slot="battle-a" />
      <BlobShadow ref={rightShadow} slot="battle-b" />
      <Sparks bursts={SPARKS} />
      <Flashes flashes={FLASHES} />
    </group>
  );
}
