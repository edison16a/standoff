import type { ShakeReact } from "../../engine/shake";
import { keyed, mirrorPatch, type Pose, type PosePatch } from "./pose";

type Keys = (readonly [number, PosePatch])[];

/**
 * The beaten defender's reactions, one hand made clip per kind of shake
 * (see `engine/shake.ts`), timed on the engine's stumble clock so the
 * body agrees with where the engine sends him. Sideways ones are written
 * for a shove to his left and mirrored for his right.
 */

/** He jumps at the fake: a long lunge in, the near hand stabbing at the ball, then the chest pitched over the front foot. */
function bite(dur: number): Keys {
  return [
    [0, { torsoX: 0.35, hipY: -0.06, legLLift: 0.6, kneeL: 0.8, legRLift: 0.1, kneeR: 0.5 }],
    [dur * 0.22, { torsoX: 0.75, hipY: -0.16, neckX: -0.4, legLLift: 1.15, kneeL: 1.25, legRLift: -0.45, kneeR: 0.3, footR: 0.45, armRRaise: 1.35, armRSpread: -0.1, elbowR: 0.15, armLRaise: 0.25, armLSpread: 0.6, elbowL: 0.4 }],
    [dur * 0.55, { torsoX: 0.6, hipY: -0.14, legLLift: 0.95, kneeL: 1.35, legRLift: -0.2, kneeR: 0.7, armRRaise: 0.6, armRSpread: 0.4, armLRaise: 0.7, armLSpread: 0.8 }],
    [dur, { torsoX: 0.25, hipY: -0.05, neckX: -0.1, legLLift: 0.35, kneeL: 0.5, legRLift: 0.2, kneeR: 0.45, footR: 0, armRRaise: 0.3, armRSpread: 0.25, armLRaise: 0.3, armLSpread: 0.25 }],
  ];
}

/** Stood up flat footed by the hesitation: tall, the arms dropping, then a late, heavy push off. */
function freeze(dur: number): Keys {
  return [
    [0, { torsoX: 0.2, hipY: -0.08, kneeL: 0.7, kneeR: 0.7, legLLift: 0.35, legRLift: 0.35 }],
    [dur * 0.3, { torsoX: -0.06, hipY: 0, neckX: 0.05, kneeL: 0.1, kneeR: 0.1, legLLift: 0.04, legRLift: 0.04, armLRaise: 0.15, armRRaise: 0.15, armLSpread: 0.15, armRSpread: 0.15, elbowL: 0.3, elbowR: 0.3 }],
    [dur * 0.7, { torsoX: 0.05, kneeL: 0.25, kneeR: 0.25, legLLift: 0.12, legRLift: 0.12 }],
    [dur, { torsoX: 0.45, hipY: -0.1, neckX: -0.25, legLLift: 0.8, kneeL: 1.0, legRLift: -0.25, kneeR: 0.5, footR: 0.4, armLRaise: 0.6, armRRaise: 0.5 }],
  ];
}

/** Thrown the wrong way: the near leg folds under the weight, the other shoots out to brace. Hard enough and he goes down. */
function slip(dur: number, deep: number): Keys {
  return [
    [0, { torsoZ: -0.2, torsoX: 0.25, legLSpread: 0.25, kneeL: 0.8, legLLift: 0.45, legRSpread: 0.3, kneeR: 0.3, legRLift: 0.1 }],
    [dur * 0.25, {
      torsoZ: -0.55 * deep, torsoX: 0.45, torsoY: 0.2, neckY: -0.45, neckZ: 0.25, pelvisZ: -0.15 * deep,
      legLSpread: 0.35, legLLift: 0.9 * deep, kneeL: 1.55 * deep, footL: 0.15, legRSpread: 0.65 * deep, legRLift: -0.05, kneeR: 0.1, footR: 0.3,
      armLRaise: 0.35, armLSpread: 0.45, elbowL: 0.1, wristL: -0.5, armRRaise: 2.1, armRSpread: 1.1, elbowR: 0.45,
    }],
    [dur * 0.65, { torsoZ: -0.25 * deep, torsoX: 0.3, torsoY: 0.1, neckY: -0.2, legLSpread: 0.3, legLLift: 0.6, kneeL: 1.0, legRSpread: 0.35, legRLift: 0.25, kneeR: 0.55, armLRaise: 0.6, armRRaise: 1.1, armRSpread: 0.7 }],
    [dur, { torsoZ: 0, torsoX: 0.2, torsoY: 0, neckY: 0, neckZ: 0, pelvisZ: 0, legLSpread: 0.15, legRSpread: 0.12 }],
  ];
}

/** Ankles broken: down on one hip, the left hand flat on the floor, a beat there, then scrambling up. */
function ankles(dur: number): Keys {
  const down: PosePatch = {
    hipY: -0.42, torsoX: 0.15, torsoZ: -0.45, pelvisZ: -0.3, neckY: -0.4, neckZ: 0.2,
    legLLift: 1.2, kneeL: 2.1, legLSpread: 0.45, footL: 0.3, legRLift: 0.55, kneeR: 0.4, legRSpread: 0.55, footR: 0.2,
    armLRaise: -0.2, armLSpread: 0.75, elbowL: 0.05, wristL: -1.0, armRRaise: 1.4, armRSpread: 0.9, elbowR: 0.5,
  };
  return [
    ...slip(dur * 0.45, 1).slice(0, 2),
    [dur * 0.32, down],
    [dur * 0.62, { ...down, torsoZ: -0.35, neckY: -0.2 }],
    [dur * 0.82, { hipY: -0.2, torsoX: 0.45, torsoZ: -0.1, pelvisZ: -0.05, legLLift: 0.9, kneeL: 1.5, legLSpread: 0.25, legRLift: 0.7, kneeR: 1.2, legRSpread: 0.2, armLRaise: 0.4, armLSpread: 0.4, wristL: 0, armRRaise: 0.6 }],
    [dur, { hipY: -0.05, torsoX: 0.2, torsoZ: 0, pelvisZ: 0, neckY: 0, neckZ: 0, legLLift: 0.2, kneeL: 0.35, legRLift: 0.2, kneeR: 0.35, legLSpread: 0.12, legRSpread: 0.12, armLRaise: 0.15, armRRaise: 0.15 }],
  ];
}

/** Turned round by a spin: the hips whip after the handler, the arms fly out, and he winds back to square. */
function turned(dur: number): Keys {
  return [
    [0, { torsoX: 0.3, hipY: -0.08, kneeL: 0.8, kneeR: 0.8, legLLift: 0.4, legRLift: 0.4 }],
    [dur * 0.35, { spin: 1.6, torsoY: 0.45, torsoX: 0.15, neckY: 0.5, legLSpread: 0.35, legRLift: 0.5, kneeR: 1.0, armLRaise: 1.3, armLSpread: 1.2, armRRaise: 0.8, armRSpread: 1.0, elbowL: 0.3, elbowR: 0.4 }],
    [dur * 0.7, { spin: 0.9, torsoY: 0.2, neckY: 0.3, legLSpread: 0.2, legRLift: 0.3, kneeR: 0.7 }],
    [dur, { spin: 0, torsoY: 0, neckY: 0, torsoX: 0.25, legLSpread: 0.12, armLRaise: 0.3, armLSpread: 0.3, armRRaise: 0.3, armRSpread: 0.3 }],
  ];
}

/** `shove` is + for a throw to his left; `turn` the way a spin twists him. */
export function shakePose(react: ShakeReact, t: number, dur: number, base: Pose, shove: number, turn: 1 | -1): Pose {
  let keys: Keys;
  let mirror = shove < 0;
  if (react === "bite") keys = bite(dur);
  else if (react === "freeze") keys = freeze(dur);
  else if (react === "ankles") keys = ankles(dur);
  else if (react === "turned") {
    keys = turned(dur);
    mirror = turn < 0;
  } else keys = slip(dur, 0.6);
  return keyed(mirror ? keys.map(([at, p]) => [at, mirrorPatch(p)] as const) : keys, t, base);
}
