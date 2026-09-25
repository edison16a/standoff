import type { Dims, Joints } from "../models/athlete-model";

/**
 * A pose is a set of joint angles in plain terms: how far an arm is
 * raised forward and spread out, how bent an elbow or knee is, how far
 * the torso leans. Animations produce poses, poses blend, and one
 * function turns a pose into joint rotations.
 */
export const CHANNELS = [
  "hipY", "hipX", "hipZ", "pelvisX", "pelvisY", "pelvisZ",
  "torsoX", "torsoY", "torsoZ", "neckX", "neckY", "neckZ",
  "armLRaise", "armLSpread", "armLTwist", "elbowL", "wristL",
  "armRRaise", "armRSpread", "armRTwist", "elbowR", "wristR",
  "legLLift", "legLSpread", "kneeL", "footL",
  "legRLift", "legRSpread", "kneeR", "footR",
  "spin",
] as const;

export type Channel = (typeof CHANNELS)[number];
export type Pose = Record<Channel, number>;
export type PosePatch = Partial<Pose>;

export function restPose(): Pose {
  const p = {} as Pose;
  for (const c of CHANNELS) p[c] = 0;
  return p;
}

/** A relaxed standing pose: soft knees, arms hanging a little off the body. */
export const STAND: Pose = {
  ...restPose(),
  hipY: -0.02, torsoX: 0.05,
  armLSpread: 0.12, armRSpread: 0.12, elbowL: 0.25, elbowR: 0.25, armLRaise: 0.05, armRRaise: 0.05,
  kneeL: 0.12, kneeR: 0.12, legLLift: 0.06, legRLift: 0.06,
};

/** out = a + (b - a) * t, channel by channel. */
export function blend(a: Pose, b: PosePatch, t: number, out: Pose): Pose {
  for (const c of CHANNELS) {
    const to = b[c];
    out[c] = to === undefined ? a[c] : a[c] + (to - a[c]) * t;
  }
  return out;
}

/** Copies the channels a patch sets over a pose. */
export function over(base: Pose, patch: PosePatch): Pose {
  for (const c of CHANNELS) {
    const v = patch[c];
    if (v !== undefined) base[c] = v;
  }
  return base;
}

/** Eases a pose toward a target, frame rate independent. */
export function approach(current: Pose, target: Pose, rate: number, dt: number): void {
  const k = 1 - Math.exp(-rate * dt);
  for (const c of CHANNELS) current[c] += (target[c] - current[c]) * k;
}

/**
 * Keyframes: a list of [time, patch]. Each key holds what it sets plus
 * everything earlier keys set, and the pose eases smoothly from one key
 * to the next.
 */
export function keyed(frames: readonly (readonly [number, PosePatch])[], t: number, base: Pose): Pose {
  const from = { ...base };
  let i = 0;
  over(from, frames[0]?.[1] ?? {});
  while (i < frames.length - 1 && frames[i + 1]![0] <= t) over(from, frames[++i]![1]);
  const next = frames[i + 1];
  if (!next || t <= frames[i]![0]) return from;
  const u = Math.min(1, (t - frames[i]![0]) / Math.max(1e-6, next[0] - frames[i]![0]));
  return blend(from, next[1], u * u * (3 - 2 * u), { ...from });
}

/** Turns a pose into joint rotations on a model. */
export function applyPose(p: Pose, j: Joints, d: Dims): void {
  j.hips.position.set(p.hipX, d.hipY + p.hipY, p.hipZ);
  j.hips.rotation.set(p.pelvisX, p.pelvisY, p.pelvisZ);
  j.torso.rotation.set(p.torsoX, p.torsoY, p.torsoZ);
  j.neck.rotation.set(p.neckX, p.neckY, p.neckZ);
  j.shoulderL.rotation.set(-p.armLRaise, p.armLTwist, p.armLSpread);
  j.shoulderR.rotation.set(-p.armRRaise, -p.armRTwist, -p.armRSpread);
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
