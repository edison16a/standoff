import { JUMPER } from "../../engine/shooting";
import { STEPBACK } from "../../engine/stepback";
import { blend, keyed, type Pose, type PosePatch } from "./pose";

const TAKEOFF = JUMPER.takeoff;
const LAND = JUMPER.takeoff + JUMPER.air;

/**
 * The jump shot: dip, gather the ball to the set point above the
 * forehead, rise, and at the release the shooting arm snaps straight
 * with the wrist flicked through, held until the feet are down.
 */
export function shootPose(t: number, releasedAt: number | null, base: Pose, stepback = false): Pose {
  const p = rawShootPose(t, releasedAt, base);
  return stepback ? hop(t, p) : p;
}

/**
 * The stepback's hop, timed to the engine's: pushed off the front foot,
 * the body leaning back from the defender, both knees tucked and the
 * trailing leg reaching back, then both feet plant wide together and
 * the dip loads the jumper.
 */
const HOP: PosePatch = { torsoX: -0.14, legLLift: 0.8, kneeL: 0.95, legRLift: -0.2, kneeR: 0.75, footR: 0.35, footL: 0.2, hipY: -0.04, neckX: -0.12, armLSpread: 0.3 };

function hop(t: number, p: Pose): Pose {
  const end = STEPBACK.air;
  if (t >= end) return p;
  const k = Math.sin(Math.PI * Math.min(1, t / end));
  return blend(p, HOP, Math.max(0, k), { ...p });
}

function rawShootPose(t: number, releasedAt: number | null, base: Pose): Pose {
  const p = keyed(
    [
      [0, { hipY: -0.05, kneeL: 0.35, kneeR: 0.35, legLLift: 0.18, legRLift: 0.18, armLRaise: 0.95, armRRaise: 1.0, elbowL: 1.5, elbowR: 1.6, armLSpread: 0.25, armRSpread: 0.05, torsoX: 0.12, legLSpread: 0.08, legRSpread: 0.08 }],
      [TAKEOFF * 0.72, { hipY: -0.17, kneeL: 1.1, kneeR: 1.1, legLLift: 0.6, legRLift: 0.6, torsoX: 0.2, armLRaise: 1.4, armRRaise: 1.5, elbowL: 1.9, elbowR: 2.1 }],
      [TAKEOFF + 0.1, { hipY: 0, kneeL: 0.12, kneeR: 0.08, legLLift: 0.06, legRLift: 0.02, footL: 0.6, footR: 0.6, torsoX: 0.0, armRRaise: 2.35, elbowR: 2.05, armLRaise: 2.15, elbowL: 1.75, armLSpread: 0.38, neckX: -0.12 }],
      [LAND - 0.06, { kneeL: 0.3, kneeR: 0.3, legLLift: 0.22, legRLift: 0.18, footL: 0.25, footR: 0.25 }],
      [LAND + 0.08, { hipY: -0.1, kneeL: 0.75, kneeR: 0.75, legLLift: 0.42, legRLift: 0.42, footL: 0, footR: 0 }],
      [LAND + 0.3, { hipY: -0.03, kneeL: 0.2, kneeR: 0.2, legLLift: 0.1, legRLift: 0.1 }],
    ],
    t,
    base,
  );
  if (releasedAt === null) return p;
  // The follow through: arm straight, wrist dropped in a goose neck.
  const k = Math.min(1, (t - releasedAt) / 0.09);
  return blend(p, { armRRaise: 2.8, elbowR: 0.06, wristR: 1.15, armLRaise: 2.05, elbowL: 0.85, armLSpread: 0.55, armRSpread: 0.02 }, k, p);
}

/** A two hand chest pass, snapped out from the chest. */
export function passPose(t: number, base: Pose): Pose {
  return keyed(
    [
      [0, { armLRaise: 1.15, armRRaise: 1.15, elbowL: 1.9, elbowR: 1.9, armLSpread: 0.35, armRSpread: 0.35, torsoX: 0.12 }],
      [0.1, { armLRaise: 1.55, armRRaise: 1.55, elbowL: 0.08, elbowR: 0.08, wristL: 0.5, wristR: 0.5, armLSpread: 0.15, armRSpread: 0.15, torsoX: 0.22, legLLift: 0.45, kneeL: 0.5 }],
      [0.3, { armLRaise: 0.9, armRRaise: 0.9, elbowL: 0.4, elbowR: 0.4, wristL: 0, wristR: 0, legLLift: 0.1, kneeL: 0.2 }],
    ],
    t,
    base,
  );
}

/** A lunge with a quick swipe of the hand across the ball. */
export function stealPose(t: number, base: Pose): Pose {
  return keyed(
    [
      [0, { torsoX: 0.5, hipY: -0.14, legLLift: 0.8, kneeL: 1.0, legRLift: -0.2, kneeR: 0.5, armRRaise: 1.0, armRSpread: -0.35, elbowR: 0.3, armLRaise: 0.2, armLSpread: 0.5, elbowL: 0.6 }],
      [0.13, { armRRaise: 0.8, armRSpread: 0.9, elbowR: 0.2, torsoY: 0.3 }],
      [0.36, { torsoX: 0.25, torsoY: 0, armRRaise: 0.5, armRSpread: 0.4, legLLift: 0.4, kneeL: 0.6 }],
    ],
    t,
    base,
  );
}

/** The knees give on a hard landing. */
export function landPose(since: number, hard: boolean, base: Pose): Pose {
  const depth = hard ? 1 : 0.55;
  const k = Math.max(0, 1 - since / (hard ? 0.35 : 0.25));
  return blend(base, { hipY: -0.16 * depth, kneeL: 1.1 * depth, kneeR: 1.1 * depth, legLLift: 0.55 * depth, legRLift: 0.55 * depth, torsoX: 0.3 * depth }, k, { ...base });
}
