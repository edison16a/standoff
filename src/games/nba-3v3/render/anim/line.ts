import { JUMPER } from "../../engine/shooting";
import { blend, keyed, over, type Pose, type PosePatch } from "./pose";

/** Where the players along the lane are in the free throw routine. */
export type LaneStance = "rest" | "ready";

const TAKEOFF = JUMPER.takeoff;

/**
 * Along the lane between shots: bent over a little with the hands on
 * the knees, catching a breath, each at their own rhythm.
 */
const REST: PosePatch = {
  torsoX: 0.5, hipY: -0.05, neckX: -0.3, kneeL: 0.45, kneeR: 0.45, legLLift: 0.3, legRLift: 0.3, legLSpread: 0.12, legRSpread: 0.12,
  armLRaise: 0.75, armRRaise: 0.75, armLSpread: 0.18, armRSpread: 0.18, elbowL: 0.35, elbowR: 0.35, wristL: 0.2, wristR: 0.2,
};

/**
 * Once the shot goes up: down low, arms out and hands up, ready to box
 * out for the rebound. The arms spread only so far that the hands stop
 * short of the next player along the lane instead of passing through him.
 */
const READY: PosePatch = {
  torsoX: 0.3, hipY: -0.13, neckX: -0.3, kneeL: 0.95, kneeR: 0.95, legLLift: 0.5, legRLift: 0.5, legLSpread: 0.22, legRSpread: 0.22,
  armLRaise: 1.0, armRRaise: 1.0, armLSpread: 0.45, armRSpread: 0.45, elbowL: 0.9, elbowR: 0.9, wristL: -0.3, wristR: -0.3,
};

export function lanePose(p: Pose, stance: LaneStance, time: number, seed: number): Pose {
  over(p, stance === "rest" ? REST : READY);
  if (stance === "rest") p.torsoX += Math.sin(time * 1.7 + seed) * 0.04;
  else p.hipY += Math.sin(time * 6 + seed) * 0.01;
  return p;
}

/** The fouler's hand goes up at the whistle, owning the foul, head down. */
const FOUL_HAND: PosePatch = { armRRaise: 2.95, armRSpread: 0.12, elbowR: 0.15, wristR: -0.2, armLRaise: 0.15, elbowL: 0.4, neckX: 0.3, torsoX: 0.02 };

export function foulPose(p: Pose, k: number): Pose {
  return blend(p, FOUL_HAND, k, p);
}

/**
 * The free throw: a set shot with no jump. The ball sits in the
 * shooting pocket, the knees dip as it comes up to the set point, the
 * legs drive up onto the toes as it goes, and the follow through is
 * held with the wrist dropped until it drops.
 */
export function setShotPose(t: number, releasedAt: number | null, base: Pose): Pose {
  const p = keyed(
    [
      [0, { hipY: -0.03, kneeL: 0.3, kneeR: 0.3, legLLift: 0.16, legRLift: 0.16, legLSpread: 0.05, legRSpread: 0.05, armLRaise: 0.8, armRRaise: 0.9, elbowL: 1.45, elbowR: 1.6, armLSpread: 0.25, armRSpread: 0.05, torsoX: 0.1, neckX: -0.1 }],
      [TAKEOFF * 0.7, { hipY: -0.1, kneeL: 0.8, kneeR: 0.8, legLLift: 0.42, legRLift: 0.42, torsoX: 0.14, armRRaise: 1.95, elbowR: 2.05, armLRaise: 1.85, elbowL: 1.7, armLSpread: 0.38, neckX: -0.2 }],
      [TAKEOFF + 0.08, { hipY: 0.015, kneeL: 0.04, kneeR: 0.04, legLLift: 0.02, legRLift: 0.02, footL: 0.4, footR: 0.4, torsoX: 0.02, armRRaise: 2.35, elbowR: 1.9, armLRaise: 2.1, elbowL: 1.6 }],
      [TAKEOFF + 0.45, { hipY: -0.01, footL: 0, footR: 0, kneeL: 0.12, kneeR: 0.12, legLLift: 0.06, legRLift: 0.06 }],
    ],
    t,
    base,
  );
  if (releasedAt === null) return p;
  const k = Math.min(1, (t - releasedAt) / 0.09);
  return blend(p, { armRRaise: 2.75, elbowR: 0.06, wristR: 1.2, armLRaise: 2.0, elbowL: 0.8, armLSpread: 0.5, armRSpread: 0.02 }, k, p);
}
