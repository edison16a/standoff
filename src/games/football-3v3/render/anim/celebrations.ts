import type { Celebration } from "../../builds";
import { bump, keyed, neutral, over, smooth, type Pose } from "./pose";

/**
 * Touchdown celebrations. The scorer who spikes it slams the ball into
 * the turf; everyone else does their own thing: a dance, a flex, a
 * salute, a leap or a point to the crowd. `t` is seconds into it.
 */
const base = neutral();

/** Where in the spike the ball leaves the hand, in seconds. The ball view reads this too. */
export const SPIKE_RELEASE = 0.62;

export function spikePose(t: number): Pose {
  const raise = over(base, { spineX: -0.2, pitch: -0.1, shRX: -2.9, shRZ: 0.3, elR: -0.3, shLZ: 0.6, hipLX: -0.3, kneeL: 0.3 });
  const slam = over(base, { pitch: 0.55, spineX: 0.45, shRX: -0.2, shRZ: 0.2, elR: -0.1, shLX: 0.5, shLZ: 0.7, hipLX: -0.7, kneeL: 0.9, kneeR: 0.5 });
  const roar = over(base, { spineX: -0.35, neckX: -0.5, shLX: -0.9, shRX: -0.9, shLZ: 1.1, shRZ: 1.1, elL: -1.6, elR: -1.6, hipLZ: 0.25, hipRZ: 0.25, kneeL: 0.3, kneeR: 0.3 });
  return keyed([[0, base], [0.4, raise], [SPIKE_RELEASE, slam], [0.95, slam], [1.35, roar]], t);
}

function dance(t: number): Pose {
  // A side to side shuffle on the beat, arms rolling in front.
  const beat = t * Math.PI * 2 * 2;
  const s = Math.sin(beat);
  const c = Math.cos(beat);
  return over(base, {
    side: s * 0.08, roll: -s * 0.08, spineZ: s * 0.18, spineY: c * 0.2, neckY: -c * 0.25,
    hipLZ: 0.25 + 0.15 * s, hipRZ: 0.25 - 0.15 * s, kneeL: 0.5 + 0.4 * Math.max(0, s), kneeR: 0.5 + 0.4 * Math.max(0, -s),
    hipLX: -0.3 - 0.3 * Math.max(0, s), hipRX: -0.3 - 0.3 * Math.max(0, -s),
    shLX: -1.1 + 0.4 * c, shRX: -1.1 - 0.4 * c, elL: -1.5, elR: -1.5, shLY: 0.6, shRY: 0.6, shLZ: 0.3, shRZ: 0.3,
    lift: 0.05 * Math.abs(s),
  });
}

function flex(t: number): Pose {
  const pump = 0.5 + 0.5 * Math.sin(t * 7);
  return over(base, {
    spineX: 0.1 + 0.1 * pump, neckX: -0.3, hipLZ: 0.3, hipRZ: 0.3, kneeL: 0.35, kneeR: 0.35,
    shLX: -0.2, shRX: -0.2, shLZ: 1.5, shRZ: 1.5, elL: -1.9 - 0.3 * pump, elR: -1.9 - 0.3 * pump, shLY: -0.4, shRY: -0.4,
  });
}

function salute(t: number): Pose {
  const hand = smooth(t / 0.4);
  return over(base, {
    spineX: -0.05, neckX: -0.1, hipLZ: 0.08, hipRZ: 0.08,
    shRX: -1.2 * hand, shRZ: 0.2 + 1.1 * hand, elR: -2.3 * hand, shRY: 0.3 * hand,
    shLZ: 0.12, elL: -0.05,
  });
}

function leap(t: number): Pose {
  const cycle = t % 1.1;
  const air = bump((cycle - 0.25) / 0.55);
  const crouch = bump(cycle / 0.3) + bump((cycle - 0.8) / 0.3);
  return over(base, {
    lift: 0.7 * air, pitch: 0.3 * crouch - 0.15 * air, spineX: -0.2 * air,
    hipLX: -0.9 * crouch - 1.1 * air, hipRX: -0.9 * crouch + 0.2 * air, kneeL: 1.4 * crouch + 1.6 * air, kneeR: 1.4 * crouch + 0.6 * air,
    shRX: -2.9 * air - 0.3 * crouch, shRZ: 0.25, elR: -0.3, shLX: -0.8 * air, shLZ: 0.9 * air + 0.2, elL: -0.9,
  });
}

function point(t: number): Pose {
  const sway = Math.sin(t * 3);
  return over(base, {
    spineX: -0.2, neckX: -0.6, neckY: sway * 0.2, hipLX: -0.25, kneeL: 0.25,
    shRX: -2.6, shRZ: 0.35, elR: -0.05, shLX: -2.4, shLZ: 0.5, elL: -0.05, yaw: sway * 0.1,
  });
}

export function celebratePose(style: Celebration, t: number, spike: boolean): Pose {
  if (spike) return spikePose(t);
  switch (style) {
    case "dance":
      return dance(t);
    case "flex":
      return flex(t);
    case "salute":
      return salute(t);
    case "point":
      return point(t);
    // A spiker whose teammate scored leaps with them.
    case "leap":
    case "spike":
      return leap(t);
  }
}

/** On the losing side at the end: head down, hands on the hips. */
export function dejectedPose(t: number, seed: number): Pose {
  return over(base, {
    spineX: 0.2, neckX: 0.55, neckY: Math.sin(t * 0.5 + seed) * 0.25,
    shLX: 0.35, shRX: 0.35, shLZ: 0.75, shRZ: 0.75, elL: -1.7, elR: -1.7, shLY: -0.5, shRY: -0.5,
    hipLZ: 0.12, hipRZ: 0.12, kneeL: 0.12, kneeR: 0.12,
  });
}
