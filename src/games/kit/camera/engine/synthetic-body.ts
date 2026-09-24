/**
 * The skeleton behind synthetic poses: a 1.72 metre person standing in
 * metres, feet on the floor at y 0, y up, x to the right of the mirrored
 * picture and z away from the camera. Arms are built from bone directions
 * so they keep their length while they move between poses.
 */

export type Vec = [number, number, number];

export const UPPER_ARM = 0.29;
export const FOREARM = 0.27;
export const STANDING_HEIGHT = 1.72;

/** Standing joints, indexed like the model's 33 points. Arms are filled in separately. */
export const STANDING: readonly Vec[] = [
  [0, 1.6, -0.1], // nose
  [-0.015, 1.645, -0.09],
  [-0.032, 1.645, -0.085],
  [-0.045, 1.645, -0.08],
  [0.015, 1.645, -0.09],
  [0.032, 1.645, -0.085],
  [0.045, 1.645, -0.08],
  [-0.075, 1.63, 0], // ears
  [0.075, 1.63, 0],
  [-0.025, 1.575, -0.085], // mouth
  [0.025, 1.575, -0.085],
  [-0.17, 1.42, 0], // shoulders
  [0.17, 1.42, 0],
  [-0.19, 1.13, 0], // elbows, wrists and hands, replaced by the arm builder
  [0.19, 1.13, 0],
  [-0.2, 0.86, 0],
  [0.2, 0.86, 0],
  [-0.2, 0.79, 0],
  [0.2, 0.79, 0],
  [-0.2, 0.79, 0],
  [0.2, 0.79, 0],
  [-0.2, 0.79, 0],
  [0.2, 0.79, 0],
  [-0.1, 0.93, 0], // hips
  [0.1, 0.93, 0],
  [-0.1, 0.5, -0.01], // knees
  [0.1, 0.5, -0.01],
  [-0.1, 0.09, 0.02], // ankles
  [0.1, 0.09, 0.02],
  [-0.1, 0.05, 0.07], // heels
  [0.1, 0.05, 0.07],
  [-0.11, 0.02, -0.12], // toes
  [0.11, 0.02, -0.12],
];

/** Bone directions for one arm, upper arm then forearm, for the player's left arm. The right mirrors x. */
interface ArmShape {
  upper: Vec;
  fore: Vec;
}

/** Arm poses. x here points outward from the body, so one table serves both arms. */
export const ARM_SHAPES = {
  down: { upper: [0.07, -1, 0], fore: [0.03, -1, -0.07] },
  guard: { upper: [0, -0.707, -0.707], fore: [-0.27, 0.93, -0.27] },
  punch: { upper: [-0.1, 0.07, -1], fore: [-0.1, 0.07, -1] },
  wide: { upper: [1, 0, -0.1], fore: [0.2, 0.1, -1] },
  hook: { upper: [0.43, 0.02, -0.9], fore: [-0.96, 0.1, -0.26] },
  raise: { upper: [0.1, 1, 0], fore: [0.05, 1, -0.05] },
} satisfies Record<string, ArmShape>;

export type ArmShapeName = keyof typeof ARM_SHAPES;

export function normalize(v: Vec): Vec {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** Blends two directions and keeps the result a unit vector. */
export function blend(a: Vec, b: Vec, t: number): Vec {
  if (t <= 0) return a;
  return normalize([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

export function add(a: Vec, b: Vec, scale = 1): Vec {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
}

/** Turns p about a pivot in the plane of two axes, by an angle in radians. */
export function rotate(p: Vec, pivot: Vec, axisA: 0 | 1 | 2, axisB: 0 | 1 | 2, angle: number): Vec {
  const out: Vec = [...p];
  const a = p[axisA] - pivot[axisA];
  const b = p[axisB] - pivot[axisB];
  out[axisA] = pivot[axisA] + a * Math.cos(angle) - b * Math.sin(angle);
  out[axisB] = pivot[axisB] + a * Math.sin(angle) + b * Math.cos(angle);
  return out;
}
