import { KICK, PASS } from "../../engine/tuning";
import { keyed, mix, neutral, over, smooth, type Keys, type Pose } from "./pose";

/**
 * The throwing motion, timed to the engine's own clock so the ball
 * leaves the hand exactly as the engine releases it (at PASS.windup).
 * The ball comes back by the right ear, the left foot steps at the
 * target, the hips and then the shoulders turn through, and the arm
 * whips over and follows through across the body.
 */
const base = neutral();
const SET = over(base, {
  spineY: 0.15, pitch: 0.05,
  hipLX: -0.25, hipRX: 0.1, kneeL: 0.35, kneeR: 0.4,
  shLX: -0.55, shRX: -0.55, elL: -1.55, elR: -1.45, shLY: 0.55, shRY: 0.5, shLZ: 0.28, shRZ: 0.3,
});
const LOADED = over(base, {
  spineY: 0.75, spineZ: -0.12, pitch: -0.05, neckY: -0.65,
  hipLX: -0.55, hipRX: 0.25, kneeL: 0.25, kneeR: 0.55,
  // The ball up behind the ear, the elbow at shoulder height; the left arm points at the target.
  shRX: -0.25, shRZ: 1.45, elR: -1.75, shRY: -0.6,
  shLX: -1.35, shLZ: 0.35, elL: -0.35, shLY: 0.2,
});
const RELEASE = over(base, {
  spineY: -0.35, spineX: 0.25, pitch: 0.18, neckY: 0.3,
  hipLX: -0.6, hipRX: 0.45, kneeL: 0.35, kneeR: 0.35,
  shRX: -1.9, shRZ: 0.55, elR: -0.35, shRY: 0.2,
  shLX: -0.4, shLZ: 0.25, elL: -1.4, shLY: 0.6,
});
const FOLLOW = over(base, {
  spineY: -0.6, spineX: 0.35, pitch: 0.22, neckY: 0.45,
  hipLX: -0.5, hipRX: 0.3, kneeL: 0.4, kneeR: 0.9,
  shRX: -0.6, shRZ: 0.1, elR: -0.5, shRY: 0.9,
  shLX: 0.25, shLZ: 0.35, elL: -1.1,
});

const THROW_KEYS: Keys = [
  [0, SET],
  [PASS.windup * 0.7, LOADED],
  [PASS.windup, RELEASE],
  [PASS.windup + 0.12, FOLLOW],
];

export function throwPose(t: number, dur: number): Pose {
  const p = keyed(THROW_KEYS, t);
  // Settle back toward the set as the action ends, so the run takes over smoothly.
  return mix(p, SET, smooth((t - dur + 0.1) / 0.1) * 0.5);
}

/**
 * The kick: a last jab step, the plant foot beside the ball, the right
 * leg swinging through from behind and up high in the follow through,
 * the arms thrown wide for balance. Contact is at KICK.windup.
 */
const K_START = over(base, { pitch: 0.1, hipLX: -0.3, hipRX: 0.2, kneeL: 0.3, kneeR: 0.3, shLZ: 0.4, shRZ: 0.35 });
const K_BACK = over(base, {
  pitch: 0.12, spineZ: 0.12, roll: 0.08,
  hipLX: -0.15, kneeL: 0.3, hipRX: 0.95, kneeR: 1.75, ankR: 0.4,
  shLX: -0.9, shLZ: 1.1, elL: -0.3, shRX: 0.6, shRZ: 0.8, elR: -0.3,
});
const K_HIT = over(base, {
  pitch: -0.05, spineX: 0.05, roll: 0.05,
  hipLX: -0.05, kneeL: 0.35, hipRX: -1.25, kneeR: 0.25, ankR: 0.6,
  shLX: -0.6, shLZ: 1.3, elL: -0.2, shRX: 0.3, shRZ: 1.0, elR: -0.3,
});
const K_FOLLOW = over(base, {
  lift: 0.08, pitch: -0.2, spineX: -0.05,
  hipLX: 0.1, kneeL: 0.25, hipRX: -2.1, kneeR: 0.05, ankR: 0.5,
  shLX: -0.3, shLZ: 1.25, elL: -0.2, shRX: 0.7, shRZ: 0.9, elR: -0.4,
});

export function kickPose(t: number): Pose {
  const w = KICK.windup;
  return keyed([[0, K_START], [w * 0.6, K_BACK], [w, K_HIT], [w + 0.28, K_FOLLOW], [w + 0.9, K_START]], t);
}

/**
 * Reaching for a ball in the air: both arms up and out toward it,
 * hands together to make a basket. `reach` is 0 to 1 as it arrives,
 * `high` lifts the hands above the helmet for a ball arriving high.
 */
export function catchPose(base: Pose, reach: number, high: number): Pose {
  const hands = over(base, {
    shLX: -1.6 - high * 1.2, shRX: -1.6 - high * 1.2, elL: -0.5 + high * 0.3, elR: -0.5 + high * 0.3,
    shLZ: 0.18, shRZ: 0.18, shLY: 0.25, shRY: 0.25, neckX: base.neckX - 0.3 - high * 0.3, spineX: base.spineX - 0.1,
  });
  return mix(base, hands, smooth(reach));
}
