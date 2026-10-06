import * as THREE from "three";

/**
 * The shape of the stadium: a rounded rectangle round the field (a
 * superellipse) that every ring of the building follows. A lower bowl
 * of seats steps up from a wall at the front edge; behind its top row a
 * band of suites; above them an upper deck, steeper and further back,
 * that overhangs the suites; over that a roof canopy whose inner edge
 * carries the floodlights. Plain maths, so the crowd, the stands and
 * the lights all agree on where things are.
 */
export interface BowlShape {
  /** Half length and half width of the front edge, metres. */
  a: number;
  b: number;
  /** How square the corners are: 2 is an ellipse, higher is boxier. */
  n: number;
}

/** A deck of seats: rows stepping up and back from where it starts. */
export interface Deck {
  rows: number;
  rowDepth: number;
  rowRise: number;
  /** How far back from the front edge its first row is. */
  out: number;
  /** The first row's height. */
  base: number;
}

export const BOWL: BowlShape = { a: 72, b: 40, n: 5 };
export const LOWER: Deck = { rows: 26, rowDepth: 0.95, rowRise: 0.55, out: 0, base: 2.2 };
export const UPPER: Deck = { rows: 20, rowDepth: 0.9, rowRise: 0.68, out: 27, base: 23.8 };
/** The suites between the decks: their glass stands this far back, from the club rail on the lower deck to under the upper deck. */
export const SUITES = { out: 30.5, bottom: 17.9, top: 22.6 } as const;
/** The roof canopy: its inner edge, where the lights hang, and its back over the top of the upper deck. */
export const ROOF = { inner: 19, back: 47, y: 44, thickness: 2.2 } as const;

/** Where a deck's rows end: the top of its last riser. */
export function deckTop(deck: Deck): { out: number; y: number } {
  return { out: deck.out + deck.rows * deck.rowDepth, y: deck.base + deck.rows * deck.rowRise };
}

/** A point on the front edge at angle `t`, and the outward direction there. */
export function edge(shape: BowlShape, t: number): { x: number; z: number; nx: number; nz: number } {
  const e = 2 / shape.n;
  const at = (u: number) => {
    const c = Math.cos(u);
    const s = Math.sin(u);
    return { x: shape.a * Math.sign(c) * Math.abs(c) ** e, z: shape.b * Math.sign(s) * Math.abs(s) ** e };
  };
  const p = at(t);
  // The outward normal from a tiny step along the curve, turned a quarter.
  const q = at(t + 1e-3);
  const tx = q.x - p.x;
  const tz = q.z - p.z;
  const len = Math.hypot(tx, tz) || 1;
  return { x: p.x, z: p.z, nx: tz / len, nz: -tx / len };
}

/** A point `out` metres back from the front edge at angle `t`, `y` metres up. */
export function ring(t: number, out: number, y: number, shape: BowlShape = BOWL): THREE.Vector3 {
  const p = edge(shape, t);
  return new THREE.Vector3(p.x + p.nx * out, y, p.z + p.nz * out);
}

/** Where a seat is: round the bowl at angle `t`, `row` rows into `deck`. */
export function seat(deck: Deck, t: number, row: number, shape: BowlShape = BOWL): THREE.Vector3 {
  return ring(t, deck.out + row * deck.rowDepth, deck.base + row * deck.rowRise, shape);
}

/** The angle round the bowl whose front edge passes `x` on the side of `sign` (1 for +z), found by halving. */
export function angleAtX(x: number, sign: 1 | -1, shape: BowlShape = BOWL): number {
  // Along the +z side x falls from a to -a as t runs from 0 to pi.
  let lo = 0;
  let hi = Math.PI;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (edge(shape, mid).x > x) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return sign > 0 ? t : -t;
}
