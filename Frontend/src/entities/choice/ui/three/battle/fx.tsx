import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getSoftTexture } from '../geometry';
import { mulberry32 } from '../noise';
import { useBattleFrame } from './clock';
import { FX_LAYER, onFxLayer } from './stage';
import { clamp01, ease, seg } from './timeline';

type Vec3 = readonly [number, number, number];

/* ------------------------------ Sparks ------------------------------ */

export interface SparkBurst {
  t: number;
  at: Vec3;
  count: number;
  power: number;
}

const SPARK_GRAVITY = 6;
const UP = new THREE.Vector3(0, 1, 0);

/** Short-lived glowing shards thrown from impact points. */
export function Sparks({ bursts, color = '#ffe1b3' }: { bursts: readonly SparkBurst[]; color?: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => {
    const rng = mulberry32(7);
    return bursts.flatMap((burst) =>
      Array.from({ length: burst.count }, () => {
        const yaw = rng() * Math.PI * 2;
        const pitch = (rng() - 0.25) * Math.PI * 0.9;
        const speed = burst.power * (0.45 + rng() * 0.75);
        return {
          t: burst.t,
          at: burst.at,
          v: new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch) * 0.6)
            .multiplyScalar(speed),
          life: 0.22 + rng() * 0.3,
          size: 0.018 + rng() * 0.022,
        };
      }),
    );
  }, [bursts]);

  useLayoutEffect(() => {
    mesh.current?.layers.set(FX_LAYER);
  }, []);

  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), v: new THREE.Vector3() }),
    [],
  );

  useBattleFrame((t) => {
    const im = mesh.current;
    if (!im) return;
    const { m, p, q, s, v } = scratch;
    particles.forEach((part, i) => {
      const tau = t - part.t;
      if (tau < 0 || tau > part.life) {
        m.makeScale(0, 0, 0);
      } else {
        p.set(
          part.at[0] + part.v.x * tau,
          part.at[1] + part.v.y * tau - 0.5 * SPARK_GRAVITY * tau * tau,
          part.at[2] + part.v.z * tau,
        );
        v.set(part.v.x, part.v.y - SPARK_GRAVITY * tau, part.v.z).normalize();
        q.setFromUnitVectors(UP, v);
        const k = part.size * (1 - tau / part.life);
        s.set(k, k * 6, k);
        m.compose(p, q, s);
      }
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, particles.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

/* ------------------------------ Flashes ----------------------------- */

export interface Flash {
  t: number;
  at: Vec3;
  size: number;
}

const FLASH_LIFE = 0.2;

/** Expanding ring + glow at the instant of an impact. */
export function Flashes({ flashes }: { flashes: readonly Flash[] }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const glows = useRef<(THREE.Sprite | null)[]>([]);
  const soft = useMemo(getSoftTexture, []);

  useBattleFrame((t) => {
    flashes.forEach((flash, i) => {
      const p = seg(t, flash.t, flash.t + FLASH_LIFE);
      const on = t >= flash.t && p < 1;
      const ring = rings.current[i];
      const glow = glows.current[i];
      if (ring) {
        ring.visible = on;
        ring.scale.setScalar(flash.size * (0.25 + ease.outCubic(p)));
        (ring.material as THREE.MeshBasicMaterial).opacity = 1 - p;
      }
      if (glow) {
        glow.visible = on;
        glow.scale.setScalar(flash.size * 2.4 * (1 - p * 0.5));
        glow.material.opacity = 0.9 * (1 - p) * (1 - p);
      }
    });
  });

  return (
    <>
      {flashes.map((flash, i) => (
        <group key={i} position={[...flash.at]}>
          <mesh
            ref={(o) => {
              rings.current[i] = o;
              onFxLayer(o);
            }}
            visible={false}
            renderOrder={10}
          >
            <ringGeometry args={[0.93, 1, 64]} />
            <meshBasicMaterial color="#ffffff" transparent depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
          <sprite
            ref={(o) => {
              glows.current[i] = o;
              onFxLayer(o);
            }}
            visible={false}
            renderOrder={9}
          >
            <spriteMaterial map={soft} color="#fff1d6" transparent depthTest={false} depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </>
  );
}

/* ------------------------------- Puffs ------------------------------ */

export interface Puff {
  t: number;
  at: Vec3;
  count: number;
  /** How far the cloud spreads sideways. */
  spread: number;
  /** How much it rises over its life. */
  rise: number;
  size: number;
  life: number;
  opacity: number;
  color?: string;
}

/** Soft dust clouds that expand and fade. */
export function Puffs({ puffs }: { puffs: readonly Puff[] }) {
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const soft = useMemo(getSoftTexture, []);
  const items = useMemo(() => {
    const rng = mulberry32(21);
    return puffs.flatMap((puff) =>
      Array.from({ length: puff.count }, (_, i) => {
        const angle = (i / puff.count) * Math.PI * 2 + rng() * 0.8;
        return {
          puff,
          dir: new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle) * 0.6),
          delay: rng() * 0.12,
          reach: 0.5 + rng() * 0.7,
          grow: 0.7 + rng() * 0.6,
        };
      }),
    );
  }, [puffs]);

  useBattleFrame((t) => {
    items.forEach((item, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;
      const { puff } = item;
      const p = clamp01((t - puff.t - item.delay) / puff.life);
      sprite.visible = p > 0 && p < 1;
      if (!sprite.visible) return;
      const out = ease.outCubic(p) * puff.spread * item.reach;
      sprite.position.set(
        puff.at[0] + item.dir.x * out,
        puff.at[1] + puff.rise * p * item.grow,
        puff.at[2] + item.dir.z * out,
      );
      sprite.scale.setScalar(puff.size * item.grow * (0.35 + ease.outCubic(p)));
      sprite.material.opacity = puff.opacity * Math.min(1, p / 0.08) * Math.pow(1 - p, 1.5);
    });
  });

  return (
    <>
      {items.map((item, i) => (
        <sprite
          key={i}
          ref={(o) => {
            sprites.current[i] = o;
            onFxLayer(o);
          }}
          visible={false}
        >
          <spriteMaterial map={soft} color={item.puff.color ?? '#9a948a'} transparent depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}
