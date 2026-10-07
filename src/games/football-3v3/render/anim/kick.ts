import { KICK } from "../../engine/tuning";
import { keyed, neutral, over, type Pose } from "./pose";

const base = neutral();

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
