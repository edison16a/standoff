import type { Dims, Joints } from "../models/rig";

/**
 * A pose is a set of joint angles in plain terms: how far an arm is
 * raised forward and spread out, how bent an elbow or knee is, how far
 * the torso leans. Animations produce poses, poses blend, and one
 * function turns a pose into joint rotations. Angles are radians.
 */
export const CHANNELS = [
  "hipY", "hipZ", "pelvisX", "pelvisY", "pelvisZ",
  "torsoX", "torsoY", "torsoZ", "neckX", "neckY",
  "armLRaise", "armLSpread", "elbowL", "wristL",
  "armRRaise", "armRSpread", "elbowR", "wristR",
  "legLLift", "legLSpread", "kneeL", "footL",
  "legRLift", "legRSpread", "kneeR", "footR",
  /** Whole body turns: a somersault about the hips, and a spin about the spine. */
  "flip", "spin",
] as const;

export type Channel = (typeof CHANNELS)[number];
export type Pose = Record<Channel, number>;
export type PosePatch = Partial<Pose>;

export function restPose(): Pose {
  const p = {} as Pose;
  for (const c of CHANNELS) p[c] = 0;
  return p;
}

/** Copies the channels a patch sets over a pose. */
export function over(base: Pose, patch: PosePatch): Pose {
  for (const c of CHANNELS) {
    const v = patch[c];
    if (v !== undefined) base[c] = v;
  }
  return base;
}

/** out = a + (b - a) * t, channel by channel, for the channels b sets. */
export function blend(a: Pose, b: PosePatch, t: number, out: Pose): Pose {
  for (const c of CHANNELS) {
    const to = b[c];
    out[c] = to === undefined ? a[c] : a[c] + (to - a[c]) * t;
  }
  return out;
}

/**
 * Eases a pose toward a target, frame rate independent. Whole body
 * turns in progress are copied straight across, since easing would lag
 * a somersault. Once the turn ends the body rolls upright the short way
 * round, so a tumble cut short by landing never snaps.
 */
export function approach(current: Pose, target: Pose, rate: number, dt: number): void {
  const k = 1 - Math.exp(-rate * dt);
  for (const c of CHANNELS) if (c !== "flip" && c !== "spin") current[c] += (target[c] - current[c]) * k;
  for (const c of ["flip", "spin"] as const) {
    if (target[c] !== 0) current[c] = target[c];
    else current[c] = Math.atan2(Math.sin(current[c]), Math.cos(current[c])) * (1 - k);
  }
}

const smooth = (u: number) => u * u * (3 - 2 * u);

/**
 * Keyframes: a list of [time, patch]. Each key holds what it sets plus
 * everything earlier keys set, and the pose eases from one key to the
 * next. Before the first key and after the last, the pose holds.
 */
export function keyed(frames: readonly (readonly [number, PosePatch])[], t: number, base: Pose): Pose {
  const from = over({ ...base }, frames[0]?.[1] ?? {});
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1]![0] <= t) over(from, frames[++i]![1]);
  const next = frames[i + 1];
  if (!next || t <= frames[i]![0]) return from;
  const u = Math.min(1, (t - frames[i]![0]) / Math.max(1e-6, next[0] - frames[i]![0]));
  return blend(from, next[1], smooth(u), { ...from });
}

/** Turns a pose into joint rotations on a rig. */
export function applyPose(p: Pose, j: Joints, d: Dims): void {
  j.hips.position.set(0, d.hipY + p.hipY, p.hipZ);
  j.hips.rotation.set(p.pelvisX + p.flip, p.pelvisY + p.spin, p.pelvisZ);
  j.torso.rotation.set(p.torsoX, p.torsoY, p.torsoZ);
  j.neck.rotation.set(p.neckX, p.neckY, 0);
  j.shoulderL.rotation.set(-p.armLRaise, 0, p.armLSpread);
  j.shoulderR.rotation.set(-p.armRRaise, 0, -p.armRSpread);
  j.elbowL.rotation.set(-p.elbowL, 0, 0);
  j.elbowR.rotation.set(-p.elbowR, 0, 0);
  j.handL.rotation.set(-p.wristL, 0, 0);
  j.handR.rotation.set(-p.wristR, 0, 0);
  j.hipL.rotation.set(-p.legLLift, 0, p.legLSpread);
  j.hipR.rotation.set(-p.legRLift, 0, -p.legRSpread);
  j.kneeL.rotation.set(p.kneeL, 0, 0);
  j.kneeR.rotation.set(p.kneeR, 0, 0);
  j.ankleL.rotation.set(p.footL, 0, 0);
  j.ankleR.rotation.set(p.footR, 0, 0);
}
