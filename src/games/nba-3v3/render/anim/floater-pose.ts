import { FLOATER } from "../../engine/floater";
import { hangTime } from "../../engine/body/jump";
import { blend, keyed, type Pose } from "./pose";

const UP = FLOATER.takeoff;
const LAND = FLOATER.takeoff + hangTime(FLOATER.peak);

/**
 * The floater: off the left foot almost at once on the run, the right
 * knee driving up, the ball carried up in front with the left arm out
 * to fend off the big man, and let go early at full stretch with a
 * soft flick of the wrist, held through the fall to a landing.
 */
export function floaterPose(t: number, releasedAt: number | null, base: Pose): Pose {
  const p = keyed(
    [
      [0, { torsoX: 0.25, hipY: -0.06, legLLift: 0.35, kneeL: 0.75, legRLift: 0.55, kneeR: 1.0, armLRaise: 1.0, armRRaise: 1.1, elbowL: 1.5, elbowR: 1.6, armLSpread: 0.15, armRSpread: 0.1 }],
      [UP, { torsoX: 0.1, hipY: 0, legLLift: -0.05, kneeL: 0.2, footL: 0.6, legRLift: 1.2, kneeR: 1.55, armRRaise: 2.0, elbowR: 1.35, armLRaise: 1.75, elbowL: 1.15, armLSpread: 0.35 }],
      [FLOATER.release - 0.02, { torsoX: 0.02, neckX: -0.25, armRRaise: 2.75, elbowR: 0.45, wristR: -0.3, armLRaise: 1.85, armLSpread: 0.6, elbowL: 0.85, legRLift: 1.0, kneeR: 1.35 }],
      [LAND - 0.08, { legLLift: 0.3, kneeL: 0.45, footL: 0.25, legRLift: 0.45, kneeR: 0.65, footR: 0.2, armRRaise: 2.4, elbowR: 0.25, armLRaise: 1.3, elbowL: 0.6 }],
      [LAND + 0.06, { hipY: -0.09, legLLift: 0.45, kneeL: 0.8, legRLift: 0.45, kneeR: 0.8, footL: 0, footR: 0, torsoX: 0.25, armRRaise: 1.0, elbowR: 0.5, armLRaise: 0.8, armLSpread: 0.25 }],
      [LAND + 0.3, { hipY: -0.03, kneeL: 0.3, kneeR: 0.3, legLLift: 0.15, legRLift: 0.15, torsoX: 0.12 }],
    ],
    t,
    base,
  );
  if (releasedAt === null) return p;
  // The follow through: the arm straight up and out, the wrist dropped soft.
  const k = Math.min(1, (t - releasedAt) / 0.08) * Math.max(0, 1 - (t - LAND) / 0.3);
  return blend(p, { armRRaise: 2.95, elbowR: 0.05, wristR: 1.05 }, k, p);
}
