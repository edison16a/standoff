import type { DunkFail } from "../../../engine/finish/dunk-odds";
import type { Athlete } from "../../../engine/types";
import type { PosePatch } from "../pose";
import type { Key } from "./gather";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/** Feet just about to touch: legs reaching for the floor. */
const REACH_DOWN: PosePatch = { legLLift: 0.25, legRLift: 0.2, kneeL: 0.35, kneeR: 0.3, footL: 0.25, footR: 0.25, torsoX: 0 };
/** Down hard on both feet, deep in the knees, arms out for balance. */
const HEAVY: PosePatch = {
  hipY: -0.22, legLLift: 0.7, legRLift: 0.6, kneeL: 1.35, kneeR: 1.2, footL: 0, footR: 0, torsoX: 0.42,
  armLRaise: 0.9, armRRaise: 0.8, armLSpread: 0.75, armRSpread: 0.7, elbowL: 1.0, elbowR: 1.0, wristR: 0, neckX: 0.1,
};
/** Getting back up out of it, the head down. */
const AFTER: PosePatch = {
  hipY: -0.06, legLLift: 0.25, legRLift: 0.2, kneeL: 0.5, kneeR: 0.4, torsoX: 0.15, neckX: 0.3,
  armLRaise: 0.35, armRRaise: 0.3, armLSpread: 0.2, armRSpread: 0.2, elbowL: 0.5, elbowR: 0.5,
};

/**
 * A dunk that does not go down, from the slam to back on his feet, for
 * a right hand finish: thrown back by the stuff, jolted off the iron by
 * a clang, or reaching for a ring he never got to. The drive holds on
 * after the landing (`FAIL_SETTLE` in the engine) so the heavy landing
 * and the recovery play.
 */
export function failKeys(act: Drive, fail: DunkFail): Key[] {
  const f = act.finish;
  const land = act.land;
  return [...AIR[fail](f), [land - 0.04, REACH_DOWN], [land + 0.14, HEAVY], [land + 0.34, AFTER]];
}

const AIR: Record<DunkFail, (f: number) => Key[]> = {
  // The ball met and thrown back: arms snapped back over the head, chest arched, legs kicking out under.
  stuff: (f) => [
    [f + 0.06, { torsoX: -0.38, neckX: -0.35, armRRaise: 2.6, elbowR: 0.9, wristR: -0.6, armLRaise: 2.2, elbowL: 0.8, armLSpread: 0.5, legLLift: 0.55, legRLift: 0.45, kneeL: 0.7, kneeR: 0.6 }],
    [f + 0.22, { torsoX: -0.25, armRRaise: 1.6, armRSpread: 0.9, armLRaise: 1.5, armLSpread: 1.0, elbowR: 0.5, elbowL: 0.5, wristR: 0, legLLift: 0.35, legRLift: 0.5, kneeL: 0.4, kneeR: 0.7 }],
  ],
  // The hand slammed on the iron and the ball kicked out: the body jolted back, the legs swinging under.
  clang: (f) => [
    [f + 0.05, { torsoX: -0.2, neckX: -0.25, armLRaise: 1.9, armLSpread: 0.85, elbowL: 0.6, legLLift: 0.6, legRLift: 0.55, kneeL: 0.8, kneeR: 0.75 }],
    [f + 0.2, { torsoX: -0.05, armRRaise: 1.9, elbowR: 0.5, wristR: 0.2, armLRaise: 1.4, legLLift: 0.4, legRLift: 0.4, kneeL: 0.55, kneeR: 0.55 }],
  ],
  // Stretched for a ring he never got over: the arm long and up, the eyes on the iron, coming down still reaching.
  short: (f) => [
    [f, { armRRaise: 2.9, elbowR: 0.15, wristR: 0.6, torsoX: 0.05, neckX: -0.45 }],
    [f + 0.16, { armRRaise: 2.5, elbowR: 0.35, wristR: 0.2, armLRaise: 1.0, armLSpread: 0.5, legLLift: 0.4, legRLift: 0.35, kneeL: 0.6, kneeR: 0.5, neckX: -0.2 }],
  ],
};
