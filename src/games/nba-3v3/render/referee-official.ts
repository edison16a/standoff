import type { Official } from "../engine/free-throw-ref";
import { REF } from "../engine/free-throw-ref";
import { CHEST_HOLD } from "./anim/holding";
import { locomotion, strideLength } from "./anim/locomotion";
import { keyed, over, type Pose, type PosePatch } from "./anim/pose";
import type { Keys } from "./referee-signals";

/** Hip to ankle on the referee's 1.86 metre frame. */
export const REF_LEG = 0.92;

/** The ball held in both hands in front of the chest, arms only, so the legs keep walking. */
const CARRY: PosePatch = {
  armLRaise: CHEST_HOLD.armLRaise, armRRaise: CHEST_HOLD.armRRaise, armLSpread: CHEST_HOLD.armLSpread, armRSpread: CHEST_HOLD.armRSpread,
  elbowL: CHEST_HOLD.elbowL, elbowR: CHEST_HOLD.elbowR, armLTwist: CHEST_HOLD.armLTwist, armRTwist: CHEST_HOLD.armRTwist,
  wristL: CHEST_HOLD.wristL, wristR: CHEST_HOLD.wristR, torsoX: 0.1,
};

/** Bending at the waist and knees, both hands down to the ball, then up with it to the chest. */
const SCOOP: Keys = [
  [0, { torsoX: 0.2, kneeL: 0.3, kneeR: 0.3, legLLift: 0.2, legRLift: 0.2 }],
  [0.12, { torsoX: 0.85, neckX: -0.45, hipY: -0.14, kneeL: 0.95, kneeR: 0.95, legLLift: 0.75, legRLift: 0.75, armLRaise: 0.95, armRRaise: 0.95, armLSpread: 0.12, armRSpread: 0.12, elbowL: 0.3, elbowR: 0.3, armLTwist: -0.4, armRTwist: -0.4 }],
  [REF.scoop, { ...CARRY, neckX: -0.05, hipY: -0.02, kneeL: 0.15, kneeR: 0.15, legLLift: 0.08, legRLift: 0.08 }],
];

/** The bounce pass: the ball drawn in, then both arms pushed out and down at the floor, a step in with the left. */
const PASS: Keys = [
  [0, { ...CARRY }],
  [REF.passAt * 0.6, { armLRaise: 0.55, armRRaise: 0.55, elbowL: 1.7, elbowR: 1.7, torsoX: 0.08, armLSpread: 0.2, armRSpread: 0.2 }],
  [REF.passAt + 0.05, { armLRaise: 0.9, armRRaise: 0.9, elbowL: 0.1, elbowR: 0.1, wristL: 0.6, wristR: 0.6, armLSpread: 0.08, armRSpread: 0.08, armLTwist: -0.2, armRTwist: -0.2, torsoX: 0.3, legLLift: 0.4, kneeL: 0.45 }],
  [REF.passEnd, { armLRaise: 0.15, armRRaise: 0.15, elbowL: 0.3, elbowR: 0.3, wristL: 0, wristR: 0, armLSpread: 0.12, armRSpread: 0.12, armLTwist: 0, armRTwist: 0, torsoX: 0.06, legLLift: 0.06, kneeL: 0.12 }],
];

/** How far on the walking legs go this frame. */
export function strideStep(phase: number, speed: number, dt: number): number {
  return (phase + (speed * dt) / strideLength(speed, REF_LEG, false)) % 1;
}

/**
 * The working official between free throws: walking or jogging on the
 * same gait as the players, the ball held at the chest when he has it,
 * the bend to pick it up, and the push of the bounce pass.
 */
export function officialPose(o: Official, phase: number, time: number): Pose {
  const p = locomotion({ speed: o.speed, phase, guarding: false, dribble: null, dribbleSide: 1, pressure: 0, time, seed: 7, leg: REF_LEG });
  if (o.act === "scoop") return keyed(SCOOP, o.actT, p);
  if (o.act === "pass") return keyed(PASS, o.actT, p);
  return o.holding ? over(p, CARRY) : p;
}
