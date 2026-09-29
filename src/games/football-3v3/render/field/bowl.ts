import * as THREE from "three";

/**
 * The shape of the stadium bowl: a rounded rectangle round the field
 * (a superellipse), with rows of seats stepping up and back from it.
 * Plain maths so the crowd and the stands agree on where a seat is.
 */
export interface BowlShape {
  /** Half length and half width of the front row. */
  a: number;
  b: number;
  /** How square the corners are: 2 is an ellipse, higher is boxier. */
  n: number;
  rows: number;
  rowDepth: number;
  rowRise: number;
  /** Height of the front wall under the first row. */
  wall: number;
}

export const BOWL: BowlShape = { a: 72, b: 40, n: 5, rows: 26, rowDepth: 0.95, rowRise: 0.55, wall: 2.2 };

/** A point on the front edge at angle `t`, and the outward direction there. */
export function edge(shape: BowlShape, t: number): { x: number; z: number; nx: number; nz: number } {
  const e = 2 / shape.n;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const x = shape.a * Math.sign(c) * Math.abs(c) ** e;
  const z = shape.b * Math.sign(s) * Math.abs(s) ** e;
  // The outward normal from a tiny step along the curve, turned a quarter.
  const d = 1e-3;
  const c2 = Math.cos(t + d);
  const s2 = Math.sin(t + d);
  const tx = shape.a * Math.sign(c2) * Math.abs(c2) ** e - x;
  const tz = shape.b * Math.sign(s2) * Math.abs(s2) ** e - z;
  const len = Math.hypot(tx, tz) || 1;
  return { x, z, nx: tz / len, nz: -tx / len };
}

/** Where a seat is: along the bowl at angle `t`, `row` rows back and up. */
export function seat(shape: BowlShape, t: number, row: number): THREE.Vector3 {
  const p = edge(shape, t);
  const out = row * shape.rowDepth;
  return new THREE.Vector3(p.x + p.nx * out, shape.wall + row * shape.rowRise, p.z + p.nz * out);
}

/**
 * The concrete terraces as one stepped mesh: every row a tread and a
 * riser, all the way round, coloured in bands of seat colours.
 */
export function standsGeometry(shape: BowlShape, segments: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const band = [new THREE.Color("#1d2a4a"), new THREE.Color("#233257"), new THREE.Color("#8a1c1c")];
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, col: THREE.Color) => {
    for (const p of [a, b, c, a, c, d]) {
      positions.push(p.x, p.y, p.z);
      colours.push(col.r, col.g, col.b);
    }
  };
  for (let i = 0; i < segments; i++) {
    const t0 = (i / segments) * Math.PI * 2;
    const t1 = ((i + 1) / segments) * Math.PI * 2;
    // The front wall from the ground up to the first row.
    const f0 = edge(shape, t0);
    const f1 = edge(shape, t1);
    quad(new THREE.Vector3(f0.x, 0, f0.z), new THREE.Vector3(f1.x, 0, f1.z), new THREE.Vector3(f1.x, shape.wall, f1.z), new THREE.Vector3(f0.x, shape.wall, f0.z), new THREE.Color("#0e1528"));
    for (let r = 0; r < shape.rows; r++) {
      const col = r % 9 === 8 ? band[2]! : band[r % 2]!;
      const a0 = seat(shape, t0, r);
      const a1 = seat(shape, t1, r);
      const b0 = seat(shape, t0, r + 1);
      const b1 = seat(shape, t1, r + 1);
      // Tread: flat at this row's height, out to the next row's riser.
      const tread0 = b0.clone().setY(a0.y);
      const tread1 = b1.clone().setY(a1.y);
      quad(a0, tread0, tread1, a1, col);
      quad(tread0, b0, b1, tread1, col.clone().multiplyScalar(0.7));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  return geo;
}
