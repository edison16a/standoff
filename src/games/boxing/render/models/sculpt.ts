import * as THREE from "three";

/**
 * One cross section of a sculpted part: an oval at height y, `rx` wide
 * each side, `zf` deep to the front and `zb` to the back. `x` and `z`
 * shift its middle. Parts are built from a handful of these, top first.
 */
export interface Ring {
  t: number;
  y: number;
  rx: number;
  zf: number;
  zb: number;
  x?: number;
  z?: number;
}

/**
 * A soft muscle or dent: a bump laid over the surface around an angle
 * (0 is the front, positive toward +x) and a place along the part (t).
 */
export interface Bump {
  theta: number;
  t: number;
  /** How wide in radians and how tall in t the bump spreads. */
  width: number;
  height: number;
  /** Metres outward, negative for a groove. */
  amount: number;
  /** Also place it at -theta, for left and right muscles. */
  mirror?: boolean;
}

export interface SculptOptions {
  rows?: number;
  segments?: number;
  bumps?: readonly Bump[];
  /** Extra outward offset anywhere, for hair shells and noise. */
  offset?: (theta: number, t: number) => number;
  /** Only build the surface from t = 0 down to this, per angle: a hairline. */
  until?: (theta: number) => number;
  /**
   * Close both ends with a cap. On by default, since an open end shows as a
   * dark hole where a part pokes out at a joint. Shells cut at a hairline
   * are left open.
   */
  caps?: boolean;
}

/** Interpolates a ring at t with a smooth Catmull-Rom curve through the keys. */
export function ringAt(rings: readonly Ring[], t: number): Required<Ring> {
  let i = rings.findIndex((r) => r.t >= t);
  if (i <= 0) i = i === 0 ? 1 : rings.length - 1;
  const a = rings[i - 1]!;
  const b = rings[i]!;
  const before = rings[Math.max(0, i - 2)]!;
  const after = rings[Math.min(rings.length - 1, i + 1)]!;
  const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  const pick = (key: "y" | "rx" | "zf" | "zb" | "x" | "z") =>
    catmull(before[key] ?? 0, a[key] ?? 0, b[key] ?? 0, after[key] ?? 0, u);
  return { t, y: pick("y"), rx: Math.max(0, pick("rx")), zf: Math.max(0, pick("zf")), zb: Math.max(0, pick("zb")), x: pick("x"), z: pick("z") };
}

function catmull(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

export function bumpAt(bumps: readonly Bump[], theta: number, t: number): number {
  let sum = 0;
  for (const b of bumps) {
    sum += gauss(b, angleGap(theta, b.theta), t);
    if (b.mirror) sum += gauss(b, angleGap(theta, -b.theta), t);
  }
  return sum;
}

function gauss(b: Bump, dTheta: number, t: number): number {
  const a = dTheta / b.width;
  const c = (t - b.t) / b.height;
  return b.amount * Math.exp(-(a * a + c * c));
}

function angleGap(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** A point on the sculpted surface, before bumps. Angle 0 faces +z. */
export function surfacePoint(ring: Required<Ring>, theta: number): { x: number; y: number; z: number; nx: number; nz: number } {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  // Front and back depths blend smoothly through the sides.
  const k = THREE.MathUtils.smoothstep(c, -0.35, 0.35);
  const depth = ring.zb + (ring.zf - ring.zb) * k;
  const nx = s * depth;
  const nz = c * ring.rx;
  const length = Math.hypot(nx, nz) || 1;
  return { x: ring.x + ring.rx * s, y: ring.y, z: ring.z + depth * c, nx: nx / length, nz: nz / length };
}

/**
 * Builds a closed organic surface from rings and bumps: heads, torsos,
 * limbs and gloves are all made this way. UVs wrap around with the front
 * in the middle of the texture (u = 0.5) and the top at v = 1.
 */
export function sculpt(rings: readonly Ring[], options: SculptOptions = {}): THREE.BufferGeometry {
  const rows = options.rows ?? 24;
  const segments = options.segments ?? 28;
  const bumps = options.bumps ?? [];
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const s = r / rows;
    for (let q = 0; q <= segments; q++) {
      // The seam sits at the back, where it is least seen.
      const theta = -Math.PI + (q / segments) * Math.PI * 2;
      const t = options.until ? s * options.until(theta) : s;
      const ring = ringAt(rings, t);
      const p = surfacePoint(ring, theta);
      const out = bumpAt(bumps, theta, t) + (options.offset?.(theta, t) ?? 0);
      positions.push(p.x + p.nx * out, p.y, p.z + p.nz * out);
      uvs.push(q / segments, 1 - t);
    }
  }
  const indices: number[] = [];
  const stride = segments + 1;
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < segments; q++) {
      const a = r * stride + q;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  if (options.caps ?? !options.until) {
    // A fan from the middle of each end ring, on its own copy of the ring so the cap's flat
    // shading never bends the side's. Rings run round anticlockwise seen from above, so the
    // top fan faces up and the bottom one, wound the other way, faces down.
    for (const [row, up] of [[0, true], [rows, false]] as const) {
      const centre = positions.length / 3;
      const ring = ringAt(rings, row / rows);
      positions.push(ring.x, ring.y, ring.z);
      uvs.push(0.5, 1 - row / rows);
      for (let q = 0; q <= segments; q++) {
        const from = row * stride + q;
        positions.push(positions[from * 3]!, positions[from * 3 + 1]!, positions[from * 3 + 2]!);
        uvs.push(uvs[from * 2]!, uvs[from * 2 + 1]!);
      }
      for (let q = 0; q < segments; q++) {
        const a = centre + 1 + q;
        indices.push(...(up ? [centre, a, a + 1] : [centre, a + 1, a]));
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  weldSeam(geometry, rows, segments);
  return geometry;
}

/** The first and last column share places, so their normals are averaged to hide the seam. */
function weldSeam(geometry: THREE.BufferGeometry, rows: number, segments: number): void {
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const stride = segments + 1;
  const n = new THREE.Vector3();
  for (let r = 0; r <= rows; r++) {
    const a = r * stride;
    const b = a + segments;
    n.set(normals.getX(a) + normals.getX(b), normals.getY(a) + normals.getY(b), normals.getZ(a) + normals.getZ(b)).normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  }
  normals.needsUpdate = true;
}

/** A symmetric ring, for limbs: round with a given radius, optionally deeper to the front. */
export function round(t: number, y: number, r: number, front = r, back = r): Ring {
  return { t, y, rx: r, zf: front, zb: back };
}
