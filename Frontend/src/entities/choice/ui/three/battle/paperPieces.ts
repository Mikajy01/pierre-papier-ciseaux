import * as THREE from 'three';
import { PAPER_H, PAPER_W, paperBend } from '../geometry';

/** A straight cut across the sheet, in sheet coordinates. */
export interface CutLine {
  /** A point the cut goes through. */
  through: readonly [number, number];
  /** Direction of travel, in radians. */
  angle: number;
}

export interface PaperPiece {
  /** Geometry centred on the piece, keeping the curvature and UVs of the full sheet. */
  geometry: THREE.BufferGeometry;
  /** Where the piece sits on the uncut sheet. */
  centroid: THREE.Vector3;
  /** For each cut, which side of the line the piece is on (+1 / -1). */
  sides: number[];
}

type Point = [number, number];

/** Keeps the part of a convex polygon lying on one side of a line. */
function clip(polygon: Point[], cx: number, cy: number, nx: number, ny: number, sign: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = ((a[0] - cx) * nx + (a[1] - cy) * ny) * sign;
    const db = ((b[0] - cx) * nx + (b[1] - cy) * ny) * sign;
    if (da >= 0) out.push(a);
    if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const s = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]);
    }
  }
  return out;
}

const area = (p: Point[]) => {
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
};

/**
 * Slices the paper sheet along straight cuts. The sheet is a fine grid whose cells are
 * clipped exactly on each line, so the pieces fit back together without a visible seam.
 */
export function cutSheet(cuts: readonly CutLine[], columns = 20, rows = 26): PaperPiece[] {
  const lines = cuts.map((cut) => ({
    cx: cut.through[0],
    cy: cut.through[1],
    nx: -Math.sin(cut.angle),
    ny: Math.cos(cut.angle),
  }));

  const groups = new Map<string, { sides: number[]; triangles: number[] }>();
  const dx = PAPER_W / columns;
  const dy = PAPER_H / rows;

  for (let ix = 0; ix < columns; ix++) {
    for (let iy = 0; iy < rows; iy++) {
      const x0 = -PAPER_W / 2 + ix * dx;
      const y0 = -PAPER_H / 2 + iy * dy;
      let fragments: { polygon: Point[]; sides: number[] }[] = [
        { polygon: [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]], sides: [] },
      ];
      for (const line of lines) {
        const next: typeof fragments = [];
        for (const fragment of fragments) {
          for (const sign of [1, -1]) {
            const polygon = clip(fragment.polygon, line.cx, line.cy, line.nx, line.ny, sign);
            if (polygon.length >= 3 && Math.abs(area(polygon)) > 1e-8) {
              next.push({ polygon, sides: [...fragment.sides, sign] });
            }
          }
        }
        fragments = next;
      }
      for (const { polygon, sides } of fragments) {
        const key = sides.join(',');
        let group = groups.get(key);
        if (!group) groups.set(key, (group = { sides, triangles: [] }));
        for (let i = 1; i < polygon.length - 1; i++) {
          group.triangles.push(...polygon[0], ...polygon[i], ...polygon[i + 1]);
        }
      }
    }
  }

  const eps = 1e-3;
  const normal = new THREE.Vector3();

  return [...groups.values()].map(({ sides, triangles }) => {
    // Area-weighted centroid
    let total = 0, cx = 0, cy = 0;
    for (let i = 0; i < triangles.length; i += 6) {
      const a = Math.abs(
        (triangles[i + 2] - triangles[i]) * (triangles[i + 5] - triangles[i + 1]) -
          (triangles[i + 4] - triangles[i]) * (triangles[i + 3] - triangles[i + 1]),
      ) / 2;
      total += a;
      cx += (a * (triangles[i] + triangles[i + 2] + triangles[i + 4])) / 3;
      cy += (a * (triangles[i + 1] + triangles[i + 3] + triangles[i + 5])) / 3;
    }
    cx /= total;
    cy /= total;
    const centroid = new THREE.Vector3(cx, cy, paperBend(cx, cy));

    const count = triangles.length / 2;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = triangles[i * 2];
      const y = triangles[i * 2 + 1];
      const z = paperBend(x, y);
      positions.set([x - centroid.x, y - centroid.y, z - centroid.z], i * 3);
      normal
        .set(
          -(paperBend(x + eps, y) - paperBend(x - eps, y)) / (2 * eps),
          -(paperBend(x, y + eps) - paperBend(x, y - eps)) / (2 * eps),
          1,
        )
        .normalize();
      normals.set([normal.x, normal.y, normal.z], i * 3);
      uvs.set([x / PAPER_W + 0.5, y / PAPER_H + 0.5], i * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return { geometry, centroid, sides };
  });
}
