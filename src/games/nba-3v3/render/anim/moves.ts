import type { Action } from "../../engine/types";
import { blend, keyed, mirrorPatch, type Pose, type PosePatch } from "./pose";

type Move = Extract<Action, { kind: "move" }>;
type Key = readonly [number, PosePatch];

/**
 * The dribble moves, timed on the engine's own move clock (`act.t` over
 * `act.dur`) so the body agrees with where the engine carries the
 * player and when the ball changes hands. The legs and the trunk come
 * from here; the dribbling arm mostly stays with the dribble underneath,
 * which follows the ball from hand to hand, so the palm is always there
 * to meet it. Each move is written going to the right (side 1) and
 * mirrored for the left. The engine turns the whole body for the spin.
 */
const LOW: PosePatch = { torsoX: 0.4, kneeL: 0.95, kneeR: 0.95, legLLift: 0.48, legRLift: 0.48, legLSpread: 0.08, legRSpread: 0.08, torsoZ: 0, neckX: -0.25 };

/** Low and loaded on the left leg, the ball in the left hand pushed hard across and low; the right foot steps out wide and the body follows the ball. */
const CROSSOVER = (d: number): Key[] => [
  [0, { ...LOW, torsoZ: -0.16, legLLift: 0.6, kneeL: 1.1, legRLift: 0.38, kneeR: 0.8, pelvisZ: 0.05 }],
  [d * 0.35, { torsoX: 0.45, torsoZ: 0.24, pelvisZ: -0.06, legRSpread: 0.46, legRLift: 0.3, kneeR: 0.75, legLLift: -0.06, kneeL: 0.45, footL: 0.45, legLSpread: 0.04, neckY: -0.15 }],
  [d * 0.7, { torsoZ: 0.12, legRSpread: 0.28, kneeR: 0.95, legRLift: 0.48, legLLift: 0.35, kneeL: 0.9, footL: 0, legLSpread: 0.08, neckY: 0 }],
  [d, { ...LOW, pelvisZ: 0 }],
];

/** Plant the front foot, hop back off it, and land wide, square and low, ready to rise. */
const STEPBACK = (d: number): Key[] => [
  [0, { torsoX: 0.38, legLLift: 0.78, kneeL: 1.05, legRLift: 0.12, kneeR: 0.7, neckX: -0.3 }],
  [d * 0.22, { torsoX: 0.05, legLLift: 0.25, kneeL: 0.45, footL: 0.5, legRLift: -0.25, kneeR: 0.4, neckX: -0.2 }],
  [d * 0.55, { torsoX: 0.32, legLLift: 0.52, kneeL: 1.05, legRLift: 0.5, kneeR: 1.05, footL: 0, legLSpread: 0.16, legRSpread: 0.16, neckX: -0.35 }],
  [d, { torsoX: 0.22, legLLift: 0.35, kneeL: 0.7, legRLift: 0.35, kneeR: 0.7, legLSpread: 0.1, legRSpread: 0.1 }],
];

/** Plant the inside foot and pivot on it, the other leg swinging wide round, low, head leading the turn. */
const SPIN = (d: number): Key[] => [
  [0, { ...LOW, torsoX: 0.45, legLLift: 0.62, kneeL: 1.15, legRLift: 0.3, kneeR: 0.8 }],
  [d * 0.3, { torsoX: 0.38, legRSpread: 0.6, legRLift: 0.5, kneeR: 1.2, legLLift: 0.5, kneeL: 1.05, neckY: 0.35, torsoZ: -0.1 }],
  [d * 0.6, { legRSpread: 0.3, legRLift: 0.25, kneeR: 0.7, legLLift: 0.6, kneeL: 1.1, neckY: 0.15, torsoZ: 0.05 }],
  [d * 0.85, { ...LOW, neckY: 0 }],
  [d, { ...LOW, torsoX: 0.3 }],
];

/** Stand up tall and look at the rim, the dribble slowing, then explode past on the first step. */
const HESITATION = (d: number): Key[] => [
  [0, { torsoX: 0.0, neckX: -0.3, kneeL: 0.3, kneeR: 0.3, legLLift: 0.15, legRLift: 0.15 }],
  [d * 0.5, { torsoX: -0.04, neckX: -0.35, legLLift: 0.25, kneeL: 0.35 }],
  [d * 0.6, { torsoX: 0.6, neckX: -0.2, legLLift: 0.85, kneeL: 1.05, legRLift: -0.3, kneeR: 0.5, footR: 0.5 }],
  [d, { torsoX: 0.45, legLLift: 0.45, kneeL: 0.8, legRLift: 0.3, kneeR: 0.7, footR: 0 }],
];

/** The left hand wraps the ball round behind the hips to the right hand, the right foot stepping out to take it on. */
const BEHIND_BACK = (d: number): Key[] => [
  [0, { ...LOW }],
  [d * 0.22, { armLRaise: -0.55, armLSpread: -0.2, armLTwist: 0.6, elbowL: 1.15, wristL: 0.5, torsoY: 0.18, legRSpread: 0.3, legRLift: 0.35, kneeR: 0.85 }],
  [d * 0.5, { armLRaise: -0.3, elbowL: 1.35, torsoY: 0.1, torsoZ: 0.15 }],
  [d * 0.75, { armLRaise: 0.4, armLSpread: 0.3, armLTwist: 0, elbowL: 0.8, wristL: 0, torsoY: 0, torsoZ: 0.05 }],
  [d, { ...LOW }],
];

const KEYS: Record<Move["move"], (d: number) => Key[]> = {
  crossover: CROSSOVER, stepback: STEPBACK, spin: SPIN, hesitation: HESITATION, behindBack: BEHIND_BACK,
};

export function movePose(act: Move, base: Pose): Pose {
  let keys = KEYS[act.move](act.dur);
  if (act.side < 0) keys = keys.map(([t, patch]) => [t, mirrorPatch(patch)] as const);
  const p = keyed(keys, act.t, base);
  // Ease out of the move into whatever the legs are doing next.
  const out = Math.min(1, Math.max(0, (act.dur - act.t) / 0.08));
  return blend(base, p, out, { ...base });
}
