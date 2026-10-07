import type { Action } from "../../engine/types";
import { keyed, type Pose, type PosePatch } from "./pose";
import { shakePose } from "./shake-poses";

type Keys = (readonly [number, PosePatch])[];
type Stumble = Extract<Action, { kind: "stumble" }>;

/**
 * Bodies that lose their balance, on the engine's stumble clock:
 *
 * * Beaten by a dribble move: the reaction made for it (bite, freeze,
 *   slip, ankles or turned, see `shake-poses.ts`).
 * * Down on his backside taking a charge, or run over by a bigger man:
 *   snapped back at the hit, sat down with the hands behind to break the
 *   fall, a beat on the floor, and up again.
 * * Lurching on over the man he ran into: the chest pitched forward,
 *   a long catch step and the arms out.
 */
export function stumblePose(act: Stumble, base: Pose, shove: number): Pose {
  if (act.fall === "back") return keyed(fallBack(act.dur), act.t, base);
  if (act.fall === "forward") return keyed(lurch(act.dur), act.t, base);
  return shakePose(act.react ?? "slip", act.t, act.dur, base, shove, act.turn ?? 1);
}

/** Sitting on the floor: legs out in front, so the placement drops the hips to the court, the hands planted behind. */
const SAT: PosePatch = {
  hipY: -0.35, torsoX: -0.45, neckX: 0.35, legLLift: 1.4, legRLift: 1.25, kneeL: 0.25, kneeR: 0.55, footL: -0.3, footR: -0.2,
  legLSpread: 0.15, legRSpread: 0.2, armLRaise: -0.75, armRRaise: -0.75, armLSpread: 0.35, armRSpread: 0.35, elbowL: 0.15, elbowR: 0.15, wristL: -0.9, wristR: -0.9,
};

function fallBack(dur: number): Keys {
  return [
    [0, { torsoX: -0.55, neckX: 0.45, hipY: -0.1, kneeL: 0.6, kneeR: 0.6, legLLift: 0.3, legRLift: 0.3, armLRaise: 1.3, armRRaise: 1.3, armLSpread: 0.5, armRSpread: 0.5, elbowL: 0.4, elbowR: 0.4 }],
    [0.12, { torsoX: -0.7, hipY: -0.25, kneeL: 1.2, kneeR: 1.2, legLLift: 0.9, legRLift: 0.9, armLRaise: 0.2, armRRaise: 0.2 }],
    [0.3, SAT],
    [dur - 0.45, { ...SAT, torsoX: -0.3, neckX: 0.1 }],
    // Up again: knees tucked under, a push off the floor, and standing.
    [dur - 0.2, { hipY: -0.22, torsoX: 0.5, neckX: -0.1, legLLift: 1.1, legRLift: 1.0, kneeL: 1.9, kneeR: 1.9, footL: 0, footR: 0, armLRaise: 0.6, armRRaise: 0.6, armLSpread: 0.2, armRSpread: 0.2, wristL: 0, wristR: 0 }],
    [dur, { hipY: -0.04, torsoX: 0.15, legLLift: 0.15, legRLift: 0.15, kneeL: 0.3, kneeR: 0.3, armLRaise: 0.1, armRRaise: 0.1, elbowL: 0.3, elbowR: 0.3 }],
  ];
}

function lurch(dur: number): Keys {
  return [
    [0, { torsoX: 0.55, neckX: -0.3, hipY: -0.08, armLRaise: 1.2, armRRaise: 1.0, armLSpread: 0.6, armRSpread: 0.7, elbowL: 0.3, elbowR: 0.4 }],
    [dur * 0.45, { torsoX: 0.7, hipY: -0.16, legLLift: 1.0, kneeL: 1.2, legRLift: -0.35, kneeR: 0.4, footR: 0.4, armLRaise: 1.5, armRRaise: 1.3 }],
    [dur, { torsoX: 0.2, hipY: -0.04, legLLift: 0.2, kneeL: 0.3, legRLift: 0.1, kneeR: 0.3, footR: 0, armLRaise: 0.2, armRRaise: 0.2, armLSpread: 0.15, armRSpread: 0.15 }],
  ];
}
