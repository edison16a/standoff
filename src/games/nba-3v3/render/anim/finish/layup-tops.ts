import type { LayupKind } from "../../../engine/types";
import type { PosePatch } from "../pose";

/** A key in the air: `s` from takeoff (0) to the release (1), and the pose there. */
export type AirKey = readonly [number, PosePatch];

/** Off the left foot, the right knee high, the left leg trailing long: the shape of a layup in the air. */
const RISE: PosePatch = { legLLift: -0.15, kneeL: 0.25, footL: 0.6, legRLift: 1.45, kneeR: 1.8, hipY: 0, torsoX: 0.05 };
/** The off arm up and out, a bar between the ball and the hands coming at it. */
const GUARD_ARM: PosePatch = { armLRaise: 1.45, elbowL: 1.15, armLSpread: 0.65 };

/**
 * Each layup in the air, for a right hand finish. The finishing arm is
 * on the real ball (see `finish-hands.ts`); these shape the legs, the
 * body, the head and the off arm.
 */
export const LAYUP_TOPS: Record<LayupKind, AirKey[]> = {
  // Tall and soft: the eyes on the front of the rim, the arm long, the wrist about to roll it off the fingertips.
  finger: [[0.25, { ...RISE, ...GUARD_ARM }], [1, { neckX: -0.32, torsoX: -0.02, armLRaise: 1.25 }]],
  // Under the rim, back to it: the head turned up over the shoulder to find the far side of the glass.
  reverse: [
    [0.25, { ...RISE, legRLift: 1.3, kneeR: 1.7, torsoX: -0.1, ...GUARD_ARM, armLRaise: 1.7, neckY: 0.5, neckX: -0.3 }],
    [1, { torsoX: -0.3, neckX: -0.55, neckY: 0.75, armLRaise: 1.1, legLLift: -0.25 }],
  ],
  // Off the long step across: the body still leaning off the man, the off arm wide.
  euro: [[0.25, { ...RISE, ...GUARD_ARM, torsoZ: 0.2, armLSpread: 0.9 }], [1, { torsoZ: 0.08, neckX: -0.3, neckZ: -0.1 }]],
  // Low and under the arms: shoulders forward, the off arm up over the head like a roof, released short.
  upUnder: [
    [0.25, { ...RISE, legRLift: 1.15, kneeR: 1.6, torsoX: 0.32, armLRaise: 2.4, elbowL: 0.9, armLSpread: 0.3, neckX: -0.1 }],
    [1, { torsoX: 0.18, neckX: -0.35, armLRaise: 2.6 }],
  ],
  // The body leant away and the ball swung up from low on the far side, the eyes on the rim.
  scoop: [
    [0.25, { ...RISE, legRLift: 1.2, torsoZ: 0.32, torsoX: 0.15, armLRaise: 1.2, armLSpread: 0.95, elbowL: 0.8, neckZ: -0.2 }],
    [1, { torsoZ: 0.2, torsoX: 0, neckX: -0.4, neckZ: -0.1 }],
  ],
  // Up and away early: high on the right knee, the off arm out in front to fend the big man.
  teardrop: [
    [0.3, { ...RISE, legRLift: 1.2, kneeR: 1.55, armLRaise: 1.8, elbowL: 0.9, armLSpread: 0.4 }],
    [1, { neckX: -0.35, torsoX: -0.05, armLRaise: 1.9 }],
  ],
  // Tall to the glass: the eyes on the spot on the board, not the ring.
  glass: [[0.25, { ...RISE, ...GUARD_ARM }], [1, { neckX: -0.45, neckY: 0.18, torsoX: -0.05 }]],
  // Off the right foot: the left knee drives up instead, a beat early.
  wrongFoot: [
    [0.25, { legRLift: -0.15, kneeR: 0.25, footR: 0.6, legLLift: 1.4, kneeL: 1.75, hipY: 0, torsoX: 0.08, ...GUARD_ARM }],
    [1, { neckX: -0.3, torsoX: 0, armLRaise: 1.3 }],
  ],
  // Coming out of the spin: still unwinding through the hips, eyes snapping back to the rim.
  spin: [[0.2, { ...RISE, ...GUARD_ARM, torsoY: 0.35, neckY: -0.2 }], [1, { torsoY: 0, neckY: 0, neckX: -0.3 }]],
  // The shoulder leant into the man, the off arm braced against him, the ball up the far side.
  shield: [
    [0.25, { ...RISE, legRLift: 1.2, kneeR: 1.6, torsoX: 0.22, torsoZ: -0.34, armLRaise: 1.05, armLSpread: 1.0, elbowL: 1.3 }],
    [0.55, { torsoZ: -0.44, torsoY: 0.18, armLSpread: 1.15, neckZ: 0.22 }],
    [1, { torsoZ: -0.3, torsoY: 0.1, neckX: -0.3 }],
  ],
  // Up off both feet, square and strong, knees tucked together.
  power: [
    [0.25, { legLLift: 0.55, kneeL: 1.1, legRLift: 0.65, kneeR: 1.2, footL: 0.5, footR: 0.5, hipY: 0, torsoX: 0.05, armLRaise: 2.2, elbowL: 1.0 }],
    [1, { neckX: -0.3, legLLift: 0.35, legRLift: 0.45, kneeL: 0.8, kneeR: 0.9 }],
  ],
};
