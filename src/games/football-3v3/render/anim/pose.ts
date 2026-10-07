/**
 * A pose is a flat set of joint angles in radians, plus the body's lift,
 * shift and tilt. Flat numbers blend easily, so one pose can ease into
 * the next without any snapping, and poses are plain data for tests.
 *
 * The pelvis twists (pelvisY, its left hip forward when negative) and
 * drops to one side (pelvisZ, positive lifts the left hip) under the
 * spine, which turns back against it, so the chest keeps its own angles.
 *
 * Signs: a positive hip or shoulder X swings the limb backward, a
 * positive knee bends the heel up behind, a negative elbow bends the
 * forearm forward. Z spreads a limb out to the side (positive is out
 * for both sides, mirrored when applied). Y twists an upper arm inward,
 * swinging the forearm across the chest. Body pitch tips forward, roll
 * tips to the body's left, and yaw turns it left. Barrel rolls the body
 * about its own spine before any of that, so a man lying on the turf can
 * roll over onto his side or his back as he tumbles.
 *
 * The figure stands every pose on the ground by itself: its lowest
 * point touches the turf and its hips sit over the player's spot. So
 * `lift` is only height in the air, and `fwd` and `side` shift the hips
 * off the spot, as in a lunge that throws the body ahead of the feet.
 */
export const JOINTS = [
  "lift", "fwd", "side", "pitch", "roll", "yaw", "barrel",
  "pelvisY", "pelvisZ",
  "spineX", "spineY", "spineZ", "neckX", "neckY",
  "shLX", "shLY", "shLZ", "elL", "shRX", "shRY", "shRZ", "elR",
  "hipLX", "hipLZ", "kneeL", "ankL", "hipRX", "hipRZ", "kneeR", "ankR",
] as const;

export type Joint = (typeof JOINTS)[number];
export type Pose = Record<Joint, number>;

export function neutral(): Pose {
  const pose = {} as Pose;
  for (const j of JOINTS) pose[j] = 0;
  // Pads push the arms out from the body, elbows soft.
  pose.shLZ = 0.2;
  pose.shRZ = 0.2;
  pose.elL = -0.2;
  pose.elR = -0.2;
  return pose;
}

/** A copy of `base` with some joints set. */
export function over(base: Pose, set: Partial<Pose>): Pose {
  return { ...base, ...set };
}

/** Adds offsets to some joints of `p`, in place. */
export function add(p: Pose, delta: Partial<Pose>): Pose {
  for (const [k, v] of Object.entries(delta) as [Joint, number][]) p[k] += v;
  return p;
}

const wrap = (d: number) => {
  let r = d % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
};

/** The pose a share `t` of the way from `a` to `b`, as a new pose. Yaw goes the short way round. */
export function mix(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const j of JOINTS) out[j] = j === "yaw" ? a.yaw + wrap(b.yaw - a.yaw) * t : a[j] + (b[j] - a[j]) * t;
  return out;
}

/** Angles that come round: easing them goes the short way, so a full roll ending at 2 PI does not unwind. */
const ROUND = new Set<Joint>(["yaw", "barrel"]);

/**
 * Moves `current` toward `target` at `rate` per second, frame rate
 * independent: the same motion at 30 or 144 frames a second.
 */
export function approach(current: Pose, target: Pose, rate: number, dt: number): void {
  const k = 1 - Math.exp(-rate * dt);
  for (const j of JOINTS) current[j] += (ROUND.has(j) ? wrap(target[j] - current[j]) : target[j] - current[j]) * k;
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** 0 up to 1 and back to 0 over v from 0 to 1. */
export const bump = (v: number) => Math.sin(Math.PI * clamp01(v));

/** A pose sequence: keys at times, eased between. Before the first key it holds the first, after the last the last. */
export type Keys = readonly (readonly [number, Pose])[];

export function keyed(keys: Keys, t: number): Pose {
  const first = keys[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1] = keys[i]!;
    const [t0, p0] = keys[i - 1]!;
    if (t <= t1) return mix(p0, p1, smooth((t - t0) / Math.max(1e-6, t1 - t0)));
  }
  return keys[keys.length - 1]![1];
}
