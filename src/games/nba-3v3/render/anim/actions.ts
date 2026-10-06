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

export interface DriveTiming {
  takeoff: number;
  finish: number;
  land: number;
  /** Seconds hanging on the rim after the slam, 0 for none. */
  rimHang: number;
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

/**
 * A block jump, timed from the engine's own stages: a crouch to load
 * the legs with the arms cocked, the push up with the arms driving
 * overhead, full stretch at the top, and the knees giving on the way
 * down. Stage 2 polishes the shapes; the timing is the engine's.
 */
export function blockPose(t: number, gather: number, air: number, base: Pose): Pose {
  const top = gather + air * 0.5;
  return keyed(
    [
      [0, { hipY: -0.06, kneeL: 0.5, kneeR: 0.5, legLLift: 0.25, legRLift: 0.25, armLRaise: 0.9, armRRaise: 0.9, elbowL: 1.1, elbowR: 1.1 }],
      [gather, { hipY: -0.18, kneeL: 1.25, kneeR: 1.25, legLLift: 0.62, legRLift: 0.62, torsoX: 0.3, armLRaise: 1.2, armRRaise: 1.2, elbowL: 1.3, elbowR: 1.3 }],
      [gather + 0.09, { hipY: 0, kneeL: 0.15, kneeR: 0.25, legLLift: 0.05, legRLift: 0.2, footL: 0.6, footR: 0.5, torsoX: 0.05, armLRaise: 2.6, armRRaise: 2.65, elbowL: 0.4, elbowR: 0.4, neckX: -0.2 }],
      [top, { armLRaise: 3.0, armRRaise: 3.05, armLSpread: 0.14, armRSpread: 0.1, elbowL: 0.04, elbowR: 0.04, wristL: 0.25, wristR: 0.35, neckX: -0.32 }],
      [gather + air - 0.1, { kneeL: 0.35, kneeR: 0.4, legLLift: 0.22, legRLift: 0.26, footL: 0.2, footR: 0.2, armLRaise: 2.5, armRRaise: 2.5, elbowL: 0.3, elbowR: 0.3 }],
      [gather + air + 0.06, { hipY: -0.13, kneeL: 0.85, kneeR: 0.85, legLLift: 0.45, legRLift: 0.45, footL: 0, footR: 0, torsoX: 0.2, armLRaise: 1.2, armRRaise: 1.2, elbowL: 0.5, elbowR: 0.5 }],
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
