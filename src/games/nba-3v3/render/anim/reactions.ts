import { keyed, mirrorPatch, type Pose, type PosePatch } from "./pose";

type Keys = (readonly [number, PosePatch])[];

/**
 * Bodies that lose their balance, on the engine's stumble clock:
 *
 * * Rocked by a dribble move: the weight thrown the way he bit, the
 *   near leg buckling under him and that hand dropping to the floor,
 *   the other arm flung up, then the feet come back under him.
 * * Down on his backside taking a charge, or run over by a bigger man:
 *   snapped back at the hit, sat down with the hands behind to break the
 *   fall, a beat on the floor, and up again.
 * * Lurching on over the man he ran into: the chest pitched forward,
 *   a long catch step and the arms out.
 */
export function stumblePose(t: number, dur: number, base: Pose, fall: "back" | "forward" | undefined, shove: number): Pose {
  if (fall === "back") return keyed(fallBack(dur), t, base);
  if (fall === "forward") return keyed(lurch(dur), t, base);
  const keys = rocked(dur, dur > 0.8);
  // Built for a shove to his left; mirrored for one to his right.
  return keyed(shove >= 0 ? keys : keys.map(([at, p]) => [at, mirrorPatch(p)] as const), t, base);
}

function rocked(dur: number, hard: boolean): Keys {
  const deep = hard ? 1 : 0.6;
  // A side lunge: the left leg folds under the weight with the foot out wide, the right one shoots out straight to brace.
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
