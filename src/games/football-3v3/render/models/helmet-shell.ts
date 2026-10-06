import * as THREE from "three";

/**
 * The helmet's shell, in the head's frame (the middle of the head at
 * the origin, facing +z). Its edge is one closed line: along the brim
 * over the eyes, down the front of each jaw flap, under the ears and
 * round the back of the neck. Every meridian runs from a point high on
 * the back of the shell to a point on that edge; seen from there the
 * edge never doubles back, so the fan never folds and the shell is one
 * clean cap with the face opening as part of its rim. It has a
 * thickness: an inner surface of dark padding and a rubber trim.
 */

/** The shell's middle and outer half sizes, in metres for a 1.85 m player. */
export const SHELL_CENTRE = new THREE.Vector3(0, 0.02, -0.012);
export const SHELL_SIZE = new THREE.Vector3(0.122, 0.135, 0.15);
const THICK = 0.011;

/** The edge as (azimuth from the front toward the left, elevation) in degrees, round from the back of the neck. */
const EDGE: readonly (readonly [number, number])[] = [
  [-180, -52], [-160, -49], [-130, -43], [-100, -52], [-70, -62], [-46, -58], [-52, -35], [-56, -10], [-52, 8], [-30, 15],
  [0, 16], [30, 15], [52, 8], [56, -10], [52, -35], [46, -58], [70, -62], [100, -52], [130, -43], [160, -49], [180, -52],
];

const rad = (deg: number) => (deg * Math.PI) / 180;
export const dirOf = (az: number, el: number) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));

/** The edge sampled at `n` points on a smooth closed curve, as unit directions from the shell's middle. */
function edge(n: number): THREE.Vector3[] {
  const pts = EDGE.slice(0, -1).map(([az, el]) => dirOf(rad(az), rad(el)));
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  return curve.getSpacedPoints(n).slice(0, n).map((p) => p.normalize());
}

/** Where the meridians start: high on the back, the one spot the whole edge can be seen round in order. */
const FAN = dirOf(Math.PI, rad(65));
/** The texture is a stereographic map from the middle of the face opening, so the shell has no seam and no pole. */
const UV_POLE = dirOf(0, rad(-22));
const UV_E1 = new THREE.Vector3(1, 0, 0);
const UV_E2 = new THREE.Vector3().crossVectors(UV_POLE, UV_E1).negate().normalize();
/** The farthest the edge reaches on the map, with a margin. */
export const UV_REACH = 3.2;

/** A raised rib down the middle of the crown and a flare at the back, the shape modern shells have. */
function swell(d: THREE.Vector3): number {
  const rib = 0.0035 * Math.exp(-((d.x / 0.07) ** 2)) * Math.max(0, d.y + 0.2);
  const flare = 0.006 * Math.max(0, -d.z) * Math.max(0, 0.2 - d.y) * 2;
  const brim = 0.004 * Math.max(0, d.z - 0.6) * Math.exp(-(((d.y - 0.25) / 0.12) ** 2)) * 2;
  return rib + flare + brim;
}

export interface ShellOptions {
  /** Points round the edge and rings from the crown to it. */
  around: number;
  rings: number;
}

/** UV from a direction: projected from the face opening onto a plane behind the head. The helmet paint inverts this. */
export function shellUV(d: THREE.Vector3): [number, number] {
  const k = 1 / Math.max(1e-4, 1 - d.dot(UV_POLE));
  return [0.5 + (0.5 * d.dot(UV_E1) * k) / UV_REACH, 0.5 + (0.5 * d.dot(UV_E2) * k) / UV_REACH];
}

/** The direction a texel of the helmet paint lands on. */
export function uvDirection(u: number, v: number): THREE.Vector3 {
  const qx = (u - 0.5) * 2 * UV_REACH;
  const qy = (v - 0.5) * 2 * UV_REACH;
  const q2 = qx * qx + qy * qy;
  // Inverse stereographic projection from the pole.
  return new THREE.Vector3()
    .addScaledVector(UV_E1, (2 * qx) / (1 + q2))
    .addScaledVector(UV_E2, (2 * qy) / (1 + q2))
    .addScaledVector(UV_POLE, (q2 - 1) / (q2 + 1));
}

/** The shell in two pieces: the painted outside, and the dark lining (padding and edge trim) that shares the masks' material. */
export interface ShellParts {
  outer: THREE.BufferGeometry;
  lining: THREE.BufferGeometry;
}

export function shellGeometry(o: ShellOptions): ShellParts {
  const rim = edge(o.around);
  const cols = o.around + 1;
  const pos: number[] = [];
  const col: number[] = [];
  const rough: number[] = [];
  const index: number[] = [];
  const q = new THREE.Quaternion();
  const d = new THREE.Vector3();
  const dirs: THREE.Vector3[] = [];
  // Three sheets: the painted outside, the padded inside and the rubber trim joining them at the edge.
  const surface = (inset: number, grey: number, shine: number, flipFaces: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i <= o.rings; i++) {
      const t = i / o.rings;
      for (let j = 0; j < cols; j++) {
        const end = rim[j % o.around]!;
        q.setFromUnitVectors(FAN, end);
        d.copy(FAN).applyQuaternion(new THREE.Quaternion().slerp(q, t));
        const out = inset === 0 ? swell(d) : 0;
        pos.push(
          SHELL_CENTRE.x + d.x * (SHELL_SIZE.x + out - inset),
          SHELL_CENTRE.y + d.y * (SHELL_SIZE.y + out - inset),
          SHELL_CENTRE.z + d.z * (SHELL_SIZE.z + out - inset),
        );
        dirs.push(d.clone());
        col.push(grey, grey, grey);
        rough.push(shine);
      }
    }
    for (let i = 0; i < o.rings; i++) {
      for (let j = 0; j < o.around; j++) {
        const a = base + i * cols + j;
        const b = a + 1;
        const c = a + cols;
        const e = c + 1;
        const tris = i === 0 ? [[a, e, c]] : [[a, b, e], [a, e, c]];
        for (const [x, y, z] of tris) index.push(...(flipFaces ? [x!, z!, y!] : [x!, y!, z!]));
      }
    }
    return base;
  };
  const outer = surface(0, 1, 1, true);
  const split = index.length;
  const inner = surface(THICK, 0.07, 0.95, false);
  // The trim: a band from the outer edge to the inner one.
  const last = o.rings * cols;
  const trim = pos.length / 3;
  for (const from of [outer, inner]) {
    for (let j = 0; j < cols; j++) {
      const k = (from + last + j) * 3;
      pos.push(pos[k]!, pos[k + 1]!, pos[k + 2]!);
      dirs.push(dirs[from + last + j]!);
      col.push(0.05, 0.05, 0.05);
      rough.push(0.6);
    }
  }
  for (let j = 0; j < o.around; j++) {
    const a = trim + j;
    const c = trim + cols + j;
    index.push(a, c + 1, a + 1, a, c, c + 1);
  }
  const all = new THREE.BufferGeometry();
  all.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  all.setIndex(index);
  all.computeVertexNormals();
  const nrm = all.getAttribute("normal").array as Float32Array;
  // Cut the sheets apart: the outside's vertices come first, the lining's after.
  const piece = (from: number, to: number, tris: number[], withUv: boolean) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos.slice(from * 3, to * 3), 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(Array.from(nrm.slice(from * 3, to * 3)), 3));
    const uv = withUv ? dirs.slice(from, to).flatMap((v) => shellUV(v)) : new Array<number>((to - from) * 2).fill(0);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col.slice(from * 3, to * 3), 3));
    g.setAttribute("rough", new THREE.Float32BufferAttribute(rough.slice(from, to), 1));
    g.setIndex(tris.map((k) => k - from));
    return g;
  };
  return { outer: piece(0, inner, index.slice(0, split), true), lining: piece(inner, pos.length / 3, index.slice(split), false) };
}
