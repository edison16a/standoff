import { PASS } from "../../engine/tuning";
import { keyed, mix, neutral, over, smooth, type Pose } from "./pose";

/**
 * Follow through on the smaller ball moves: the pitch on a run call and
 * securing a catch. Each finishes its motion rather than snapping back.
 */
const base = neutral();

/** Two hands on the ball at the chest, as the pitch starts. */
const HOLD = over(base, { pitch: 0.1, shLX: -0.55, shRX: -0.55, elL: -1.55, elR: -1.45, shLY: 0.55, shRY: 0.5, shLZ: 0.28, shRZ: 0.3, kneeL: 0.25, kneeR: 0.25 });
/** Down to the back hip, the body coiled away from the toss. */
const LOAD = over(base, {
  pitch: 0.22, spineY: -0.35, spineX: 0.15, kneeL: 0.5, kneeR: 0.45, hipLX: -0.35, hipRX: -0.2,
  shLX: -0.25, shRX: 0.05, elL: -0.9, elR: -0.6, shLY: 0.8, shRY: 0.2, shLZ: 0.15, shRZ: 0.35,
});
/** Both arms swing through underhand and let it go at the chest. */
const RELEASE = over(base, {
  pitch: 0.12, spineY: 0.2, spineX: 0.05, kneeL: 0.3, kneeR: 0.3, hipLX: -0.3, hipRX: 0.1,
  shLX: -1.2, shRX: -1.25, elL: -0.25, elR: -0.2, shLY: 0.3, shRY: 0.3, shLZ: 0.15, shRZ: 0.15,
});
/** The hands carry on up after the ball, palms toward the back. */
const FOLLOW = over(RELEASE, { spineY: 0.35, shLX: -1.65, shRX: -1.7, elL: -0.15, elR: -0.1, pitch: 0.06 });

/**
 * The pitch: timed so the ball leaves both hands exactly when the engine
 * releases it. `toward` is where the back is, in radians to the left of
 * the QB's facing; the body and arms turn to toss it to him.
 */
export function pitchPose(t: number, dur: number, toward: number): Pose {
  const w = PASS.windup;
  const p = keyed([[0, HOLD], [w * 0.55, LOAD], [w, RELEASE], [w + 0.14, FOLLOW], [dur, mix(FOLLOW, HOLD, 0.4)]], t);
  // Square up to the back: the hips turn part of the way, the chest the rest.
  const turn = Math.max(-1.4, Math.min(1.4, toward)) * smooth(t / w);
  return over(p, { yaw: turn * 0.55, spineY: p.spineY + turn * 0.35 });
}

/**
 * Securing a catch over its first half second: both hands bring the ball
 * into the chest with the eyes on it, then it goes away under the arm as
 * the run takes over. `u` runs 0 to 1 over that time.
 */
export function securePose(run: Pose, u: number): Pose {
  const chest = over(run, {
    shLX: -0.6, shRX: -0.6, elL: -1.75, elR: -1.7, shLY: 0.6, shRY: 0.55, shLZ: 0.22, shRZ: 0.22,
    neckX: run.neckX + 0.3, spineX: run.spineX + 0.12,
  });
  return mix(mix(run, chest, smooth(u / 0.15)), run, smooth((u - 0.45) / 0.55));
}
