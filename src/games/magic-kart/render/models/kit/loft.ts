import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * One slice across a lofted body, at a point along the kart. The slice
 * is a superellipse: an ellipse at `n` 2, a soft rounded box near 4.
 */
export interface Section {
  z: number;
  /** Full width. */
  w: number;
  /** Bottom and top heights. */
  y0: number;
  y1: number;
  /** Squareness, 2 to about 5. */
  n?: number;
  /** Width of the top as a share of the bottom, for sides that lean in like a car's. */
  top?: number;
  /** Sideways offset of the slice's middle. */
  x?: number;
}

export interface LoftOptions {
  /** Points round each slice. */
  around?: number;
  /** Slices along the body, after smoothing between the given ones. */
  along?: number;
  /** Close the ends with a flat cap. */
  caps?: boolean;
}

type Num = keyof Omit<Section, never>;

/** Catmull-Rom through the given slices, so the body curves smoothly between them. */
function sample(sections: readonly Section[], t: number): Section {
  const last = sections.length - 1;
  const f = t * last;
  const i = Math.min(last - 1, Math.floor(f));
  const u = f - i;
  const at = (k: number) => sections[Math.max(0, Math.min(last, k))]!;
  const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  const cr = (key: Num, fallback: number) => {
    const a = p0[key] ?? fallback;
    const b = p1[key] ?? fallback;
    const c = p2[key] ?? fallback;
    const d = p3[key] ?? fallback;
    const u2 = u * u;
    const u3 = u2 * u;
    return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  };
  return {
    z: cr("z", 0),
    w: Math.max(0.001, cr("w", 0)),
    y0: cr("y0", 0),
    y1: cr("y1", 0),
    n: Math.max(1.6, cr("n", 2.6)),
    top: Math.max(0.05, cr("top", 1)),
    x: cr("x", 0),
  };
}

/**
 * A smooth body lofted through slices from tail to nose (or nose to
 * tail). This is what gives the karts their rounded, car shaped bodywork
 * instead of boxes: every slice blends into the next, and the normals are
 * shared all round so the paint catches one long highlight.
 */
export function loft(sections: readonly Section[], options: LoftOptions = {}): THREE.BufferGeometry {
  const around = options.around ?? 32;
  const along = options.along ?? Math.max(12, sections.length * 6);
  const positions: number[] = [];
  for (let j = 0; j <= along; j++) {
    const s = sample(sections, j / along);
    const half = (s.y1 - s.y0) / 2;
    const mid = s.y0 + half;
    const e = 2 / s.n!;
    for (let i = 0; i < around; i++) {
      const a = (i / around) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const up = Math.max(0, sn);
      const width = (s.w / 2) * (1 + (s.top! - 1) * up);
      positions.push(s.x! + Math.sign(c) * Math.abs(c) ** e * width, mid + Math.sign(sn) * Math.abs(sn) ** e * half, s.z);
    }
  }
  const index: number[] = [];
  // Winding depends on which way the slices run, so the outside always faces out.
  const forward = sections[sections.length - 1]!.z > sections[0]!.z;
  for (let j = 0; j < along; j++) {
    for (let i = 0; i < around; i++) {
      const a = j * around + i;
      const b = j * around + ((i + 1) % around);
      const c = a + around;
      const d = b + around;
      if (forward) index.push(a, b, c, b, d, c);
      else index.push(a, c, b, b, c, d);
    }
  }
  const skin = new THREE.BufferGeometry();
  skin.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  skin.setIndex(index);
  // Normals are shared all the way round, then the ends get flat caps of their own.
  skin.computeVertexNormals();
  const body = skin.toNonIndexed();
  skin.dispose();
  if (!(options.caps ?? true)) return body;
  const caps: number[] = [];
  const vertex = (k: number) => [positions[k * 3]!, positions[k * 3 + 1]!, positions[k * 3 + 2]!];
  for (const [ring, flip] of [[0, forward], [along, !forward]] as const) {
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < around; i++) {
      cx += positions[(ring * around + i) * 3]!;
      cy += positions[(ring * around + i) * 3 + 1]!;
    }
    const centre = [cx / around, cy / around, positions[ring * around * 3 + 2]!];
    for (let i = 0; i < around; i++) {
      const a = vertex(ring * around + i);
      const b = vertex(ring * around + ((i + 1) % around));
      caps.push(...centre, ...(flip ? b : a), ...(flip ? a : b));
    }
  }
  const cap = new THREE.BufferGeometry();
  cap.setAttribute("position", new THREE.Float32BufferAttribute(caps, 3));
  cap.computeVertexNormals();
  const merged = mergeGeometries([body, cap], false);
  body.dispose();
  cap.dispose();
  if (!merged) throw new Error("Loft did not merge.");
  return merged;
}
