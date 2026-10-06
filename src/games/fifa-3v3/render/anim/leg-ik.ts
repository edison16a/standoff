import type { Pose } from "./pose";

/**
 * Legs placed by where the feet should be rather than by joint angles:
 * a two bone solve from the hip to the ankle, then the ankle turned so
 * the sole meets the turf at the wanted pitch. Planting a foot on the
 * same spot frame after frame is what stops it skating, and aiming a
 * boot at the ball is what keeps the ball at the feet.
 */

/** A body's leg measurements in metres, from its height and build (see body/rig.ts). */
export interface Build {
  /** Height over 1.8 m, which scales every bone. */
  s: number;
  hipW: number;
  /** The hip joints' height standing. */
  hipY: number;
  /** How far the hip joints hang below the pelvis's centre, which it turns and tips about. */
  hipDrop: number;
  thigh: number;
  shin: number;
  /** The ankle's height with the sole flat on the turf. */
  ground: number;
}

export function buildOf(height: number, build: number): Build {
  const s = height / 1.8;
  return { s, hipW: (0.095 + 0.015 * build) * s, hipY: 0.92 * s, hipDrop: 0.02 * s, thigh: 0.44 * s, shin: 0.43 * s, ground: 0.06 * s };
}

/** Where an ankle goes, in the figure's own frame: x to its left, y up, z forward. `toe` tips the boot down. */
export interface Foot {
  x: number;
  y: number;
  z: number;
  toe: number;
}

export type Side = 1 | -1;

/** Left is +1, as the body's left is +x. */
export const LEFT: Side = 1;
export const RIGHT: Side = -1;

/**
 * Solves one leg so its ankle reaches `foot`, given the body's lift,
 * lean and roll and the pelvis's turn and tilt already in the pose. Out
 * of reach, the leg straightens toward it rather than snapping.
 */
export function solveLeg(p: Pose, side: Side, foot: Foot, b: Build): void {
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const cr = Math.cos(p.roll);
  const sr = Math.sin(p.roll);
  const cy = Math.cos(p.pelvisY);
  const sy = Math.sin(p.pelvisY);
  const cz = Math.cos(p.pelvisZ);
  const sz = Math.sin(p.pelvisZ);
  // The hip joint in the body's frame: the pelvis tips (z) then turns (y) about its centre.
  const hx0 = side * b.hipW;
  const px = hx0 * cz + b.hipDrop * sz;
  const py = hx0 * sz - b.hipDrop * cz;
  const bx = px * cy;
  const by = b.hipY + b.hipDrop + py;
  const bz = -px * sy;
  // Then the body rolls about z and pitches about x (the rig turns in YXZ order).
  const rx = bx * cr - by * sr;
  const ry = bx * sr + by * cr;
  const hip = { x: rx, y: p.lift + ry * cp - bz * sp, z: p.fwd + ry * sp + bz * cp };
  // The target from the hip, turned back through the body's lean and the pelvis into the thigh's own frame.
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const dz = foot.z - hip.z;
  const ty = dy * cp + dz * sp;
  const tz0 = -dy * sp + dz * cp;
  const lx0 = dx * cr + ty * sr;
  const ly0 = -dx * sr + ty * cr;
  const lx1 = lx0 * cy - tz0 * sy;
  const tz = lx0 * sy + tz0 * cy;
  const lx = lx1 * cz + ly0 * sz;
  const ly = -lx1 * sz + ly0 * cz;
  // The knee bends to make the hip to ankle distance; the thigh then spreads (z) and swings (x) to point the leg at it.
  const a = b.thigh;
  const c = b.shin;
  const d = Math.max(Math.abs(a - c) + 1e-3, Math.min((a + c) * 0.9995, Math.hypot(lx, ly, tz)));
  const bend = Math.PI - Math.acos(clampCos((a * a + c * c - d * d) / (2 * a * c)));
  const along = a + c * Math.cos(bend);
  const across = c * Math.sin(bend);
  const spread = Math.asin(Math.max(-0.9, Math.min(0.9, lx / along)));
  const hipX = wrap(Math.atan2(tz, ly) - Math.atan2(-across, -along * Math.cos(spread)));
  const ankle = foot.toe - p.pitch - hipX - bend;
  if (side === LEFT) {
    p.hipLX = hipX;
    p.hipLZ = spread;
    p.kneeL = bend;
    p.ankL = ankle;
  } else {
    p.hipRX = hipX;
    p.hipRZ = -spread;
    p.kneeR = bend;
    p.ankR = ankle;
  }
}

const clampCos = (v: number) => Math.max(-1, Math.min(1, v));
const wrap = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));
