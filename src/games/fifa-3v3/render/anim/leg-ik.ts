import type { Pose } from "./pose";

/**
 * Legs placed by where the feet should be rather than by joint angles:
 * a two bone solve from the hip to the ankle, then the ankle turned so
 * the sole meets the turf at the wanted pitch. Planting a foot on the
 * same spot frame after frame is what stops it skating, and aiming a
 * boot at the ball is what keeps the ball at the feet.
 */

/** A body's leg measurements in metres, from its height and build (see models/body.ts). */
export interface Build {
  /** Height over 1.8 m, which scales every bone. */
  s: number;
  hipW: number;
  hipY: number;
  thigh: number;
  shin: number;
  /** The ankle's height with the sole flat on the turf. */
  ground: number;
}

export function buildOf(height: number, build: number): Build {
  const s = height / 1.8;
  return { s, hipW: (0.095 + 0.015 * build) * s, hipY: 0.92 * s, thigh: 0.44 * s, shin: 0.43 * s, ground: 0.06 * s };
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
 * lean and roll already in the pose. Out of reach, the leg straightens
 * toward it rather than snapping.
 */
export function solveLeg(p: Pose, side: Side, foot: Foot, b: Build): void {
  // The hip joint in the figure's frame: the body group lifts, then tips forward by pitch and sideways by roll.
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const cr = Math.cos(p.roll);
  const sr = Math.sin(p.roll);
  const hx0 = side * b.hipW;
  // Roll about z, then pitch about x (the rig turns in YXZ order).
  const rx = hx0 * cr - b.hipY * sr;
  const ry = hx0 * sr + b.hipY * cr;
  const hip = { x: rx, y: p.lift + ry * cp, z: p.fwd + ry * sp };
  // The target from the hip, turned back into the body's tipped frame.
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const dz = foot.z - hip.z;
  const ty = dy * cp + dz * sp;
  const tz = -dy * sp + dz * cp;
  const lx = dx * cr + ty * sr;
  const ly = -dx * sr + ty * cr;
  const reach = Math.hypot(lx, ly, tz);
  // Sideways first: the leg spreads out or crosses in toward the target.
  const spread = Math.asin(Math.max(-0.9, Math.min(0.9, lx / Math.max(1e-4, reach))));
  const py = ly / Math.max(0.3, Math.cos(spread));
  const a = b.thigh;
  const c = b.shin;
  const d = Math.max(Math.abs(a - c) + 1e-3, Math.min((a + c) * 0.9995, Math.hypot(py, tz)));
  const bend = Math.PI - Math.acos(clampCos((a * a + c * c - d * d) / (2 * a * c)));
  const lean = Math.atan2(-tz, -py);
  const lift = Math.acos(clampCos((a * a + d * d - c * c) / (2 * a * d)));
  const hipX = lean - lift;
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
