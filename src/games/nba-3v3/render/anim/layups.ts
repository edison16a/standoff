import type { LayupKind } from "../../engine/types";
import type { DriveTiming } from "./actions";
import { keyed, type Pose, type PosePatch } from "./pose";

type Key = readonly [number, PosePatch];

/**
 * The layups, all on the same two step gather: the right foot plants
 * with the ball brought to the hip, the left plants long with the knee
 * loaded, and the right knee drives up as the player leaves the floor
 * off the left. Then each finish has its own top:
 *
 * * Off the fingers: the ball rolled up at full stretch in front of the rim.
 * * Reverse: carried under the rim, back to the basket, the head turned
 *   up over the shoulder and the ball flipped up the far side of the glass.
 * * Contact: shoulder dipped into the defender, the off arm braced
 *   against him, the ball held high and away and laid up through it.
 */
export function layupPose(kind: LayupKind, t: number, d: DriveTiming, base: Pose): Pose {
  const keys: Key[] = [...gather(d), ...TOPS[kind](d)];
  keys.push([d.land - 0.08, { legLLift: 0.3, kneeL: 0.4, legRLift: 0.45, kneeR: 0.6, footL: 0.2, armRRaise: 2.2, elbowR: 0.5, torsoZ: 0, torsoY: 0 }]);
  keys.push([d.land + 0.1, { hipY: -0.12, kneeL: 0.8, kneeR: 0.8, legLLift: 0.45, legRLift: 0.45, footL: 0, armRRaise: 0.4, elbowR: 0.5, armLRaise: 0.4, armLSpread: 0.25, neckX: 0, neckY: 0 }]);
  return keyed(keys, t, base);
}

/** The last two steps: right, then a long left with the knee loaded, the ball to the hip and up. */
function gather(d: DriveTiming): Key[] {
  const g = d.takeoff;
  return [
    [0, { legRLift: 0.75, kneeR: 0.55, legLLift: -0.35, kneeL: 0.8, hipY: -0.06, torsoX: 0.28, armLRaise: 0.8, armRRaise: 0.85, elbowL: 1.6, elbowR: 1.7, armLSpread: 0.2, armRSpread: 0.1 }],
    [g * 0.45, { legRLift: 0.05, kneeR: 0.5, legLLift: 0.8, kneeL: 0.5, hipY: -0.09, torsoX: 0.3, armLRaise: 1.0, armRRaise: 1.05, elbowL: 1.7, elbowR: 1.8 }],
    [g, { legLLift: 0.15, kneeL: 0.75, legRLift: 0.55, kneeR: 1.35, hipY: -0.15, torsoX: 0.22, armLRaise: 1.35, armRRaise: 1.45, elbowL: 1.6, elbowR: 1.7 }],
  ];
}

const TOPS: Record<LayupKind, (d: DriveTiming) => Key[]> = {
  finger: (d) => [
    [d.takeoff + 0.1, { legLLift: -0.15, kneeL: 0.25, footL: 0.6, legRLift: 1.45, kneeR: 1.8, hipY: 0, torsoX: 0.05, armRRaise: 2.0, elbowR: 1.3, armLRaise: 1.5, elbowL: 1.2, armLSpread: 0.6 }],
    [d.finish, { armRRaise: 2.75, elbowR: 0.15, wristR: 0.7, armLRaise: 1.3, neckX: -0.3 }],
  ],
  reverse: (d) => [
    [d.takeoff + 0.1, { legLLift: -0.2, kneeL: 0.3, footL: 0.6, legRLift: 1.3, kneeR: 1.7, hipY: 0, torsoX: -0.1, armRRaise: 2.2, elbowR: 1.2, armLRaise: 1.7, elbowL: 1.1, armLSpread: 0.5, neckY: 0.5, neckX: -0.3 }],
    // The ball goes up behind the head, the wrist flipping it back toward the glass.
    [d.finish, { armRRaise: 3.2, elbowR: 0.35, wristR: -0.6, armRSpread: -0.15, armLRaise: 1.1, torsoX: -0.3, neckX: -0.55, neckY: 0.7 }],
  ],
  contact: (d) => [
    [d.takeoff + 0.1, { legLLift: -0.1, kneeL: 0.3, footL: 0.5, legRLift: 1.2, kneeR: 1.6, hipY: 0, torsoX: 0.25, torsoZ: -0.3, armLRaise: 1.1, armLSpread: 0.9, elbowL: 1.4, armRRaise: 2.1, elbowR: 1.2 }],
    // Absorbing the bump: the torso gives, the ball stays up high and away from the hands.
    [d.takeoff + (d.finish - d.takeoff) * 0.5, { torsoZ: -0.42, torsoY: 0.2, torsoX: 0.1, armLSpread: 1.1, neckZ: 0.2 }],
    [d.finish, { armRRaise: 2.7, elbowR: 0.25, wristR: 0.7, armRSpread: 0.25, neckX: -0.3, torsoZ: -0.25 }],
  ],
};
