import type { FoulCall } from "../engine/foul-call";
import type { PosePatch } from "./anim/pose";

/**
 * The referee's hand signals, as keyframes from the whistle: the call
 * itself for each kind of foul, and the swing of the arm when a fouled
 * shot still counts.
 */

export type Keys = readonly (readonly [number, PosePatch])[];

/** Whistle in: the right fist shoots straight up, the body tall. */
const FIST_UP: PosePatch = { armRRaise: 3.0, armRSpread: 0.08, elbowR: 0.05, wristR: 0, armLRaise: 0.15, elbowL: 0.3, torsoX: -0.04, neckX: -0.08 };
/** The left arm out in front, palm down, to be struck. */
const WRIST_OUT: PosePatch = { armLRaise: 1.45, armLSpread: -0.25, elbowL: 0.25, wristL: 0 };
const CHOP_UP: PosePatch = { armRRaise: 1.95, armRSpread: -0.15, elbowR: 0.9 };
const CHOP_DOWN: PosePatch = { armRRaise: 1.35, armRSpread: -0.3, elbowR: 0.35 };

/** Illegal use of the hands: fist up, then the right hand chops the left wrist, twice. */
const REACH: Keys = [
  [0, FIST_UP],
  [0.55, FIST_UP],
  [0.8, { ...WRIST_OUT, ...CHOP_UP, torsoX: 0.08 }],
  [0.95, CHOP_DOWN],
  [1.1, CHOP_UP],
  [1.25, CHOP_DOWN],
  [1.6, CHOP_DOWN],
  [1.9, { armLRaise: 0.9, elbowL: 0.6, armRRaise: 1.2, armRSpread: 0.3, elbowR: 0.4, torsoX: 0.02 }],
];

/** On a shot: the wrist chop, then the arm held up for the shots, fingers out. */
const SHOOTING: Keys = [
  ...REACH.slice(0, 6),
  [1.5, { armLRaise: 0.2, elbowL: 0.3, armRRaise: 2.7, armRSpread: 0.35, elbowR: 0.15, wristR: -0.3 }],
  [2.4, { armRRaise: 2.7 }],
];

/** Both hands on the hips, elbows out. */
const HIPS: PosePatch = { armLRaise: -0.3, armLSpread: 0.85, armLTwist: -1.0, elbowL: 1.4, armRRaise: -0.3, armRSpread: 0.85, armRTwist: -0.15, elbowR: 1.4, torsoX: -0.02 };

/** A blocking foul: fist up, both hands on the hips, then the arm held up for the shots. */
const BLOCK: Keys = [
  [0, FIST_UP],
  [0.55, FIST_UP],
  [0.85, HIPS],
  [1.5, HIPS],
  [1.8, { armLRaise: 0.2, armLSpread: 0.12, armLTwist: 0, elbowL: 0.3, armRRaise: 2.7, armRSpread: 0.35, armRTwist: 0, elbowR: 0.15, wristR: -0.3 }],
  [2.4, { armRRaise: 2.7 }],
];

/** The left palm open in front of the chest, the right fist drawn back. */
const PALM: PosePatch = { armLRaise: 1.3, armLSpread: -0.35, elbowL: 1.2, wristL: 0.2, armRRaise: 1.05, armRSpread: 0.35, elbowR: 1.7 };
const PUNCH: PosePatch = { armRRaise: 1.35, armRSpread: -0.2, elbowR: 0.75, torsoX: 0.08 };

/** A charge: fist up, the fist punched into the open palm twice, then the arm out to the other team's way. */
const CHARGE_CALL: Keys = [
  [0, FIST_UP],
  [0.55, FIST_UP],
  [0.8, PALM],
  [0.95, PUNCH],
  [1.1, PALM],
  [1.25, PUNCH],
  [1.5, PUNCH],
  [1.8, { armLRaise: 0.15, armLSpread: 0.12, elbowL: 0.3, wristL: 0, armRRaise: 1.55, armRSpread: 1.3, elbowR: 0.08, torsoX: 0 }],
];

export const SIGNAL: Record<FoulCall["kind"], Keys> = { reach: REACH, shooting: SHOOTING, block: BLOCK, charge: CHARGE_CALL };

/** The basket counts: the right arm swung down across the body, twice, like a scoring call. */
export const COUNTS: Keys = [
  [0, { armRRaise: 2.6, armRSpread: 0.1, elbowR: 0.2 }],
  [0.2, { armRRaise: 0.9, armRSpread: -0.4, elbowR: 0.1, torsoX: 0.12 }],
  [0.45, { armRRaise: 2.6, armRSpread: 0.1, elbowR: 0.2, torsoX: 0 }],
  [0.65, { armRRaise: 0.9, armRSpread: -0.4, elbowR: 0.1, torsoX: 0.12 }],
  [1.2, { armRRaise: 0.6, armRSpread: 0.1, elbowR: 0.3, torsoX: 0.02 }],
];
