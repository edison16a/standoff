import { mix, neutral, over, smooth, type Pose } from "./pose";

/**
 * The set positions before the snap and the fight at the line after it.
 * Each stance keeps a gentle breath so a lined up team is not frozen.
 */

const base = neutral();

/** A lineman down in a three point stance: hips high, back flat, the right hand on the turf. */
export const THREE_POINT: Pose = over(base, {
  pitch: 0.95, spineX: 0.15, neckX: -0.95,
  hipLX: -1.05, hipRX: -0.7, kneeL: 1.55, kneeR: 1.35, ankL: -0.35, ankR: -0.3, hipLZ: 0.2, hipRZ: 0.22,
  shRX: -0.55, elR: -0.05, shRZ: 0.1, shLX: -0.2, elL: -1.1, shLZ: 0.35,
});

/** The center's stance: square, both hands reaching down to the ball. */
export const CENTER: Pose = over(THREE_POINT, {
  hipLX: -0.95, hipRX: -0.95, kneeL: 1.45, kneeR: 1.45, hipLZ: 0.3, hipRZ: 0.3,
  shRX: -0.5, shLX: -0.5, elL: -0.1, elR: -0.1, shLZ: 0.15, shRZ: 0.15,
});

/** A receiver's two point stance: the left foot forward, weight on the balls of the feet. */
export const TWO_POINT: Pose = over(base, {
  pitch: 0.32, spineX: 0.12, neckX: -0.35,
  hipLX: -0.55, hipRX: 0.05, kneeL: 0.75, kneeR: 0.55,
  shLX: 0.35, shRX: -0.45, elL: -0.9, elR: -1.0,
});

/** A QB in the shotgun, crouched a little with the hands out for the snap. */
export const SHOTGUN: Pose = over(base, {
  pitch: 0.18, spineX: 0.1, neckX: -0.2,
  hipLX: -0.35, hipRX: -0.35, kneeL: 0.6, kneeR: 0.6, hipLZ: 0.14, hipRZ: 0.14,
  shLX: -0.65, shRX: -0.65, elL: -0.7, elR: -0.7, shLY: 0.35, shRY: 0.35,
});

/** A defender set on the balls of the feet, hands up, ready to react. */
export const READY: Pose = over(base, {
  pitch: 0.3, spineX: 0.15, neckX: -0.4,
  hipLX: -0.55, hipRX: -0.55, kneeL: 0.9, kneeR: 0.9, hipLZ: 0.2, hipRZ: 0.2,
  shLX: -0.55, shRX: -0.55, elL: -1.2, elR: -1.2, shLZ: 0.4, shRZ: 0.4,
});

/** A kicker or punter waiting, arms loose, eyes on the ball. */
export const KICK_SET: Pose = over(base, { pitch: 0.08, neckX: 0.15, hipLX: -0.15, kneeL: 0.2, kneeR: 0.15, shLZ: 0.35, shRZ: 0.3 });

export function breathe(p: Pose, time: number, seed: number): Pose {
  const b = Math.sin(time * 2.2 + seed);
  return over(p, { spineX: p.spineX + b * 0.025, neckY: p.neckY + Math.sin(time * 0.6 + seed * 3) * 0.12 });
}

/**
 * Two linemen locked together: low and driving, arms locked out into
 * the other's chest, the legs churning in short choppy steps. `win` is
 * how the fight is going, from -1 losing ground to 1 driving them back.
 */
export function blockPose(time: number, seed: number, win: number): Pose {
  const chop = time * 9 + seed;
  const s = Math.sin(chop);
  const lean = 0.55 + 0.15 * win;
  return over(base, {
    pitch: lean, spineX: 0.1 - 0.1 * win, neckX: -lean * 0.9,
    hipLX: -0.7 - s * 0.25, hipRX: -0.7 + s * 0.25, kneeL: 1.0 + Math.max(0, s) * 0.4, kneeR: 1.0 + Math.max(0, -s) * 0.4,
    hipLZ: 0.2, hipRZ: 0.2,
    shLX: -1.35 + s * 0.08, shRX: -1.35 - s * 0.08, elL: -0.45, elR: -0.45, shLZ: 0.3, shRZ: 0.3,
    roll: Math.sin(time * 1.7 + seed) * 0.08,
  });
}

/** The center's snap: both hands whip the ball back between the legs, then come up to block. */
export function snapPose(t: number): Pose {
  const whip = smooth(t / 0.12);
  const rise = smooth((t - 0.18) / 0.3);
  const snapped = over(CENTER, { shLX: 0.55, shRX: 0.55, elL: -0.2, elR: -0.2, pitch: 1.0 });
  return mix(mix(CENTER, snapped, whip), blockPose(t, 0, 0), rise);
}
