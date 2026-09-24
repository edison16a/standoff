import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry, Vector2 } from "three";

/**
 * Most fruit is a shape turned around an axis, like a lathe, but with a
 * radius that may also change around the axis (the star fruit's points,
 * a plum's crease, a banana's ridges). The axis is y. `t` runs from the
 * bottom pole (0) to the top pole (1) and `phi` goes around.
 */
export interface RevolveShape {
  y(t: number): number;
  r(t: number, phi: number): number;
  rings?: number;
  segments?: number;
}

const TAU = Math.PI * 2;

/** The surface for a range of t and phi. Texture u always follows the full turn, so halves line up with the whole. */
export function revolve(shape: RevolveShape, t0 = 0, t1 = 1, phi0 = 0, phi1 = TAU): BufferGeometry {
  const rings = Math.max(4, Math.round((shape.rings ?? 40) * (t1 - t0)));
  const segments = Math.max(6, Math.round(((shape.segments ?? 48) * (phi1 - phi0)) / TAU));
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = t0 + ((t1 - t0) * i) / rings;
    const y = shape.y(t);
    for (let j = 0; j <= segments; j++) {
      const phi = phi0 + ((phi1 - phi0) * j) / segments;
      const r = shape.r(t, phi);
      positions.push(r * Math.sin(phi), y, r * Math.cos(phi));
      uvs.push(phi / TAU, t);
    }
  }
  const index: number[] = [];
  const row = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * row + j;
      index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  smoothNormals(geo, rings + 1, row, phi1 - phi0 >= TAU - 1e-6);
  return geo;
}

/**
 * Computes normals, then mends the two places a grid of rings leaves
 * creases: the seam where the turn closes, and the poles where a whole
 * ring collapses to one point.
 */
export function smoothNormals(geo: BufferGeometry, rows: number, row: number, closed: boolean): void {
  geo.computeVertexNormals();
  const n = geo.getAttribute("normal");
  const p = geo.getAttribute("position");
  const average = (ids: number[]) => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const id of ids) {
      x += n.getX(id);
      y += n.getY(id);
      z += n.getZ(id);
    }
    const len = Math.hypot(x, y, z) || 1;
    for (const id of ids) n.setXYZ(id, x / len, y / len, z / len);
  };
  for (let i = 0; i < rows; i++) {
    const ids = Array.from({ length: row }, (_, j) => i * row + j);
    const collapsed = ids.every((id) => Math.hypot(p.getX(id) - p.getX(ids[0]!), p.getZ(id) - p.getZ(ids[0]!)) < 1e-4);
    if (collapsed) average(ids);
    else if (closed) average([i * row, i * row + row - 1]);
  }
  n.needsUpdate = true;
}

/**
 * Recomputes normals after a surface was bent, then averages the normals
 * of vertices that share a position so seams and poles stay smooth.
 */
export function weldNormals(geo: BufferGeometry): void {
  geo.computeVertexNormals();
  const p = geo.getAttribute("position");
  const n = geo.getAttribute("normal");
  const groups = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const id of ids) {
      x += n.getX(id);
      y += n.getY(id);
      z += n.getZ(id);
    }
    const len = Math.hypot(x, y, z) || 1;
    for (const id of ids) n.setXYZ(id, x / len, y / len, z / len);
  }
  n.needsUpdate = true;
}

/** The t where the shape crosses y = 0, where an across cut is made. */
export function middleT(shape: RevolveShape): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (shape.y(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The flat face of an across cut: a fan at height t. `up` says which way
 * it faces. Texture coordinates put the axis in the middle of the image
 * and the widest point of the outline on its edge.
 */
export function acrossCap(shape: RevolveShape, t: number, up: boolean): BufferGeometry {
  const segments = shape.segments ?? 48;
  const y = shape.y(t);
  let rmax = 0;
  for (let j = 0; j < segments; j++) rmax = Math.max(rmax, shape.r(t, (j / segments) * TAU));
  const positions = [0, y, 0];
  const uvs = [0.5, 0.5];
  for (let j = 0; j <= segments; j++) {
    const phi = (j / segments) * TAU;
    const r = shape.r(t, phi);
    positions.push(r * Math.sin(phi), y, r * Math.cos(phi));
    uvs.push(0.5 + (0.5 * r * Math.sin(phi)) / rmax, 0.5 + (0.5 * r * Math.cos(phi)) / rmax);
  }
  const index: number[] = [];
  for (let j = 1; j <= segments; j++) index.push(...(up ? [0, j, j + 1] : [0, j + 1, j]));
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  const normals = new Array((segments + 2) * 3).fill(0).map((_, i) => (i % 3 === 1 ? (up ? 1 : -1) : 0));
  geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geo.setIndex(index);
  return geo;
}

/** The outline of an along cut, and the square its cap texture covers. */
export function alongOutline(shape: RevolveShape, samples = 48): { points: Vector2[]; size: number; mid: number } {
  const right: Vector2[] = [];
  const left: Vector2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    right.push(new Vector2(shape.r(t, 0), shape.y(t)));
    left.push(new Vector2(-shape.r(t, Math.PI), shape.y(t)));
  }
  const points = [...right, ...left.reverse().slice(1, -1)];
  const ymin = shape.y(0);
  const ymax = shape.y(1);
  const size = Math.max(ymax - ymin, ...points.map((p) => Math.abs(p.x) * 2)) * 1.04;
  return { points, size, mid: (ymin + ymax) / 2 };
}

/** Maps an outline point into the cap texture's 0 to 1 square. */
export function outlineUv(p: Vector2, size: number, mid: number): Vector2 {
  return new Vector2(p.x / size + 0.5, (p.y - mid) / size + 0.5);
}

/**
 * The flat face of an along cut, through the axis, in the plane x = 0.
 * `facing` is the way it points along x: -1 for the half that holds
 * x >= 0, +1 for the other.
 */
export function alongCap(shape: RevolveShape, facing: 1 | -1): BufferGeometry {
  const { points, size, mid } = alongOutline(shape);
  const flip = facing === 1 ? -1 : 1;
  const geo = new ShapeGeometry(new Shape(points.map((p) => new Vector2(p.x * flip, p.y))), 1);
  // Each vertex takes its texture coordinate from where it sat before the flip.
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) * flip) / size + 0.5, (pos.getY(i) - mid) / size + 0.5);
  geo.rotateY(facing === 1 ? Math.PI / 2 : -Math.PI / 2);
  return geo;
}
