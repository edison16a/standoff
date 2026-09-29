import type { Gesture } from "../../engine/types";
import { celebratePose } from "./celebrations";
import { over, STAND, type Pose, type PosePatch } from "./pose";

/**
 * The small gestures after a big basket (see `engine/celebrate.ts`).
 * `t` runs from zero over the gesture's second and a half.
 *
 * * Too small: the right hand held out low, palm down, patting the air
 *   at waist height as if on a child's head, eyes down at it.
 * * Sleep: both palms together under a tilted cheek, swaying a little.
 * * Shush: the index finger to the lips, the other arm out, head up.
 * * Flex: the player's biceps, from the celebrations.
 */
export function gesturePose(g: Gesture, t: number): Pose {
  if (g === "flex") return celebratePose("flex", t);
  const p = { ...STAND };
  return over(p, PATCHES[g](t));
}

const PATCHES: Record<Exclude<Gesture, "flex">, (t: number) => PosePatch> = {
  tooSmall: (t) => {
    // Three slow pats, each a drop of the forearm from the elbow.
    const pat = Math.max(0, Math.sin(t * 7.5));
    return {
      armRRaise: 0.62, armRSpread: 0.38, elbowR: 0.55 + pat * 0.4, wristR: -0.45 - pat * 0.25, armRTwist: 0.2,
      armLRaise: 0.1, armLSpread: 0.25, elbowL: 0.35,
      neckX: 0.4, neckY: -0.25, torsoX: 0.12, torsoY: -0.15, hipY: -0.03, kneeL: 0.2, kneeR: 0.15,
    };
  },
  sleep: (t) => {
    // The left hand crosses over so both palms press together under the right cheek, and the head lies on them.
    const sway = Math.sin(t * 2.4) * 0.06;
    return {
      armLRaise: 1.66, armLSpread: -1.17, armLTwist: -0.85, elbowL: 1.94, wristL: 0.15,
      armRRaise: 0.9, armRSpread: 0.32, armRTwist: 0.26, elbowR: 2.65, wristR: 0.31,
      neckZ: 0.5 + sway, neckX: 0.12, torsoZ: 0.12 + sway, torsoX: 0.02, kneeL: 0.18, kneeR: 0.18,
    };
  },
  shush: (t) => {
    // The index finger rises to the lips with the elbow down in front, the other arm out to the side.
    const hold = Math.min(1, t / 0.3);
    return {
      armRRaise: 1.06 * hold, armRSpread: -0.13, armRTwist: -0.73 * hold, elbowR: 2.41 * hold, wristR: -0.18,
      armLRaise: 0.5, armLSpread: 0.9, elbowL: 0.3,
      neckX: -0.2, torsoX: -0.08, hipY: -0.02,
    };
  },
};
