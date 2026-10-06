import { Rng } from "../../engine/rng";
import { PITCH } from "../../engine/tuning";

export const ROW_DEPTH = 0.85;
export const ROW_RISE = 0.5;
/** The front row sits on a wall this high, so the boards never hide it. */
export const FIRST_ROW = 1.3;
/** Metres between seats along a row. */
export const SPACING = 0.6;
/** Metres between aisles, and how wide each one is. */
export const AISLE_EVERY = 9;
export const AISLE_WIDTH = 1.1;

export interface StandSpec {
  /** Where the front row sits: z for the side stands, x for the ends. */
  front: number;
  /** "z" stands run along the sides, "x" stands behind the goals. */
  axis: "x" | "z";
  /** +1 climbs toward positive, -1 toward negative. */
  climb: 1 | -1;
  rows: number;
  /** Half the stand's length along its front. */
  half: number;
  roof: boolean;
}

const HL = PITCH.halfLength;
const HW = PITCH.halfWidth;

/**
 * The bowl. The main stand across the pitch is the deepest, under a roof
 * the broadcast camera looks up to. The stand on the camera's side is
 * lower, with no roof, so it never blocks the gantry above it. The two
 * ends rise behind the catch nets, roofed too.
 */
export const STANDS: readonly StandSpec[] = [
  { front: -(HW + 3.2), axis: "z", climb: -1, rows: 16, half: HL + 8, roof: true },
  { front: HW + 3.2, axis: "z", climb: 1, rows: 9, half: HL + 8, roof: false },
  { front: -(HL + 6.5), axis: "x", climb: -1, rows: 12, half: HW + 2.4, roof: true },
  { front: HL + 6.5, axis: "x", climb: 1, rows: 12, half: HW + 2.4, roof: true },
];

/** The turn about y that takes a stand built along x, climbing toward -z, into its place. */
export function standTurn(stand: StandSpec): number {
  if (stand.axis === "z") return stand.climb < 0 ? 0 : Math.PI;
  return stand.climb < 0 ? Math.PI / 2 : -Math.PI / 2;
}

/** A point given along the stand's front, out from the pitch and up, in the world. */
export function standPoint(stand: StandSpec, along: number, out: number, y: number): { x: number; y: number; z: number } {
  const turn = standTurn(stand);
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  // Rotating (along, -out) about y by `turn`.
  let x = along * c + -out * s;
  let z = -along * s + -out * c;
  if (stand.axis === "z") z += stand.front;
  else x += stand.front;
  return { x, y, z };
}

/** Whether a spot along a stand's front falls in one of its aisles. */
export function inAisle(stand: StandSpec, along: number): boolean {
  const from = along + stand.half;
  const k = Math.round(from / AISLE_EVERY);
  return k > 0 && k * AISLE_EVERY < stand.half * 2 - 1 && Math.abs(from - k * AISLE_EVERY) < AISLE_WIDTH / 2;
}

export interface Seat {
  x: number;
  y: number;
  z: number;
  /** Which way the fan faces, radians about y. */
  turn: number;
  /** Which end the fan supports: the left stands and the left half of the sides are red's. */
  side: number;
  /** How far up the stand, 0 front row to 1 back row. */
  height: number;
}

/** Every seat with a fan in it: most seats are taken, none in the aisles. */
export function seats(seed = 5): Seat[] {
  const rng = new Rng(seed);
  const out: Seat[] = [];
  for (const stand of STANDS) {
    const turn = standTurn(stand);
    for (let r = 0; r < stand.rows; r++) {
      for (let a = -stand.half + 0.4; a < stand.half - 0.3; a += SPACING) {
        if (inAisle(stand, a) || rng.chance(0.06)) continue;
        const p = standPoint(stand, a, r * ROW_DEPTH + ROW_DEPTH * 0.55, FIRST_ROW + r * ROW_RISE + 0.02);
        const side = stand.axis === "x" ? (stand.front < 0 ? 0 : 1) : p.x < 0 ? 0 : 1;
        out.push({ ...p, turn, side, height: r / Math.max(1, stand.rows - 1) });
      }
    }
  }
  return out;
}
