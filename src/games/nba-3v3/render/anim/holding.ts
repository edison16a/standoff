import { blend, type Pose, type PosePatch } from "./pose";

const TAU = Math.PI * 2;

/** The dribbling arm working the ball and the other arm up, shielding it, for the right hand. */
function dribbleRight(p: Pose, dribble: number, run: number): PosePatch {
  // The hand meets the ball at the top of each bounce and pushes it down, riding it a little way.
  const push = Math.max(0, Math.cos(dribble * TAU));
  return {
    armRRaise: 0.42 + run * 0.15 - push * 0.2, armRSpread: 0.22, elbowR: 0.75 + push * 0.45, wristR: 0.2 + push * 0.5, armRTwist: 0.2,
    armLRaise: 0.75 + run * 0.1, armLSpread: 0.45, elbowL: 1.0, armLTwist: 0, wristL: 0,
    torsoX: p.torsoX + 0.08, torsoY: p.torsoY - 0.12, neckY: 0.1,
  };
}

/** The same with the sides swapped, for the left hand. */
function mirror(patch: PosePatch): PosePatch {
  return {
    armLRaise: patch.armRRaise, armLSpread: patch.armRSpread, elbowL: patch.elbowR, wristL: patch.wristR, armLTwist: patch.armRTwist,
    armRRaise: patch.armLRaise, armRSpread: patch.armLSpread, elbowR: patch.elbowL, wristR: patch.wristL, armRTwist: patch.armLTwist,
    torsoX: patch.torsoX, torsoY: -(patch.torsoY ?? 0), neckY: -(patch.neckY ?? 0),
  };
}

/**
 * Dribbling with either hand. `side` runs from -1 (left) to 1 (right);
 * in between, during a crossover, the pose passes smoothly from one
 * hand to the other, both hands low and in front as the ball crosses.
 */
export function dribblePose(p: Pose, dribble: number, run: number, side: number): Pose {
  const right = dribbleRight(p, dribble, run);
  const k = Math.min(1, Math.max(0, (side + 1) / 2));
  const eased = k * k * (3 - 2 * k);
  const left = blend({ ...p }, mirror(right), 1, { ...p });
  return blend(left, right, eased, left);
}

/** Both hands on the ball at the chest, elbows out, as the ball is checked. */
export const CHEST_HOLD: PosePatch = {
  armLRaise: 0.6, armRRaise: 0.6, armLSpread: 0.05, armRSpread: 0.05, elbowL: 1.35, elbowR: 1.35,
  armLTwist: -0.5, armRTwist: -0.5, wristL: 0.15, wristR: 0.15, torsoX: 0.1, neckX: -0.05,
};

/** Hands up and out toward a ball on its way in, fingers spread for the catch. */
export const RECEIVE: PosePatch = {
  armLRaise: 1.3, armRRaise: 1.3, armLSpread: 0.02, armRSpread: 0.02, elbowL: 0.55, elbowR: 0.55, wristL: -0.2, wristR: -0.2, torsoX: 0.12,
};
