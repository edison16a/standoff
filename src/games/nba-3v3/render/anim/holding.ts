import { blend, mirrorPatch, type Pose, type PosePatch } from "./pose";

/** How hard the hand is riding the ball down: 0 waiting up top, 1 at the bottom of the push just after it leaves. */
function ride(dribble: number): number {
  // The hand meets the ball just before the top, rides it down through the push, then comes back up to wait.
  const u = (dribble + 0.08) % 1;
  return u < 0.4 ? Math.sin((Math.PI * u) / 0.4) : 0;
}

/**
 * The dribbling arm working the ball, for the right hand. Standing
 * still it is a low, hard pound from a crouch. The off arm comes up as
 * a bar, forearm across, when a defender is close.
 */
function dribbleRight(dribble: number, run: number, still: number, pressure: number): PosePatch {
  const push = ride(dribble) * (1 + still * 0.5);
  return {
    armRRaise: 0.55 + run * 0.12 - push * 0.3, armRSpread: 0.24, elbowR: 0.95 - push * 0.4 + still * 0.15, wristR: -0.15 + push * 0.8, armRTwist: 0.25,
    armLRaise: 0.3 + run * 0.15 + pressure * 0.7, armLSpread: 0.3 + pressure * 0.25, elbowL: 0.7 + pressure * 0.75 + run * 0.3, armLTwist: pressure * 0.35, wristL: 0,
  };
}

/**
 * Dribbling with either hand. `side` runs from -1 (left) to 1 (right);
 * in between, during a crossover, the arms pass smoothly from one hand
 * to the other. The shoulders turn the ball side back a little, away
 * from the defence, and standing still the whole body sinks into a
 * crouch over the pound dribble.
 */
export function dribblePose(p: Pose, dribble: number, run: number, side: number, pressure: number): Pose {
  const still = 1 - Math.min(1, run * 4);
  const right = dribbleRight(dribble, run, still, pressure);
  const k = Math.min(1, Math.max(0, (side + 1) / 2));
  const eased = k * k * (3 - 2 * k);
  const out = blend({ ...p }, mirrorPatch(right), 1, { ...p });
  blend(out, right, eased, out);
  const hand = eased * 2 - 1;
  // An athletic dribbler plays low: always a little bend, a real crouch standing still.
  const low = 0.35 + still * 0.65;
  out.torsoX += 0.1 + still * 0.16;
  out.torsoY -= (0.12 + pressure * 0.1) * hand;
  out.neckY += 0.1 * hand;
  out.neckX -= still * 0.15;
  out.hipY -= still * 0.06;
  out.kneeL += low * 0.55;
  out.kneeR += low * 0.55;
  out.legLLift += low * 0.28;
  out.legRLift += low * 0.28;
  out.legLSpread += still * 0.08;
  out.legRSpread += still * 0.08;
  return out;
}

/** Both hands on the ball at the chest, elbows out, as the ball is checked. */
export const CHEST_HOLD: PosePatch = {
  armLRaise: 0.6, armRRaise: 0.6, armLSpread: 0.05, armRSpread: 0.05, elbowL: 1.35, elbowR: 1.35,
  armLTwist: -0.5, armRTwist: -0.5, wristL: 0.15, wristR: 0.15, torsoX: 0.14, neckX: -0.05,
  kneeL: 0.3, kneeR: 0.3, legLLift: 0.15, legRLift: 0.15,
};

/** Hands up and out toward a ball on its way in, fingers spread for the catch. */
export const RECEIVE: PosePatch = {
  armLRaise: 1.3, armRRaise: 1.3, armLSpread: 0.02, armRSpread: 0.02, elbowL: 0.55, elbowR: 0.55, wristL: -0.2, wristR: -0.2, torsoX: 0.12,
};

/** Pulling the ball round through a spin: the ball hand low at the hip, cupping it, the other arm out for balance. */
const PULL_R: PosePatch = {
  armRRaise: 0.3, armRSpread: 0.4, elbowR: 0.65, wristR: 0.35, armRTwist: 0.45,
  armLRaise: 0.95, armLSpread: 0.85, elbowL: 0.7, armLTwist: 0, wristL: 0,
};
export const SPIN_PULL: Record<"L" | "R", PosePatch> = { R: PULL_R, L: mirrorPatch(PULL_R) };
