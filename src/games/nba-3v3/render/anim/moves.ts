import type { Action } from "../../engine/types";
import { blend, keyed, type Pose, type PosePatch } from "./pose";

type Move = Extract<Action, { kind: "move" }>;
type Key = readonly [number, PosePatch];

/**
 * First pass shapes for the dribble moves, timed on the engine's own
 * move clock (`act.t` over `act.dur`) so the body agrees with where the
 * engine carries the player and when the ball changes hands. The engine
 * turns the whole body for the spin; these only add the lean, the legs
 * and the arms. Stage 2 polishes them.
 */
const LOW: PosePatch = { hipY: -0.12, torsoX: 0.35, kneeL: 0.9, kneeR: 0.9, legLLift: 0.5, legRLift: 0.5 };

function keys(act: Move): Key[] {
  const d = act.dur;
  const s = act.side;
  // Positive torso twist and lean point toward the player's right.
  switch (act.move) {
    case "stepback":
      return [
        [0, { ...LOW, legLLift: 0.7, kneeL: 1.0 }],
        [d * 0.25, { hipY: -0.04, torsoX: -0.1, legLLift: -0.2, kneeL: 0.3, legRLift: 0.5, kneeR: 0.9, footL: 0.4 }],
        [d * 0.65, { ...LOW, torsoX: 0.12, legLLift: 0.35, legRLift: 0.35 }],
        [d, { hipY: -0.08, torsoX: 0.15, kneeL: 0.6, kneeR: 0.6 }],
      ];
    case "crossover":
      return [
        [0, { ...LOW, torsoZ: 0.12 * s, pelvisZ: -0.06 * s }],
        [d * 0.4, { ...LOW, torsoZ: -0.28 * s, torsoY: -0.2 * s, legLSpread: 0.3, legRSpread: 0.3 }],
        [d, { hipY: -0.08, torsoX: 0.3, torsoZ: -0.1 * s, torsoY: 0 }],
      ];
    case "spin":
      return [
        [0, { ...LOW, torsoX: 0.4 }],
        [d * 0.5, { ...LOW, torsoX: 0.25, armLRaise: 0.9, armLSpread: 0.9, armRSpread: 0.9, legLLift: 0.9, kneeL: 1.3 }],
        [d, { hipY: -0.08, torsoX: 0.35 }],
      ];
    case "hesitation":
      return [
        [0, { hipY: -0.02, torsoX: -0.05, neckX: -0.15, kneeL: 0.3, kneeR: 0.3 }],
        [d * 0.5, { hipY: -0.01, torsoX: -0.08, neckX: -0.2 }],
        [d * 0.6, { ...LOW, torsoX: 0.5 }],
        [d, { hipY: -0.1, torsoX: 0.4 }],
      ];
    case "behindBack":
      return [
        [0, { ...LOW }],
        [d * 0.45, { ...LOW, torsoY: 0.25 * s, armRRaise: -0.6, armLRaise: -0.6, elbowR: 0.5, elbowL: 0.5 }],
        [d, { hipY: -0.08, torsoX: 0.3, torsoY: 0 }],
      ];
  }
}

export function movePose(act: Move, base: Pose): Pose {
  const p = keyed(keys(act), act.t, base);
  // Ease out of the move into whatever the legs are doing next.
  const out = Math.min(1, Math.max(0, (act.dur - act.t) / 0.08));
  return blend(base, p, out, { ...base });
}
