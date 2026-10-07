import type { Action } from "../../engine/types";
import { blend, keyed, mirrorPatch, type Pose, type PosePatch } from "./pose";

type Block = Extract<Action, { kind: "block" }>;
type Keys = (readonly [number, PosePatch])[];

/**
 * The block jumps, one hand made clip per way of going up (see
 * `engine/blocks/style.ts`), timed from the engine's own stages: the
 * crouch, the push, full stretch at the top of the arc, and the knees
 * giving on the way down. The hands themselves are put on the ball by
 * the block reach; these set the body and the arms the reach starts
 * from. After the touch the body answers the hit: a spike crunches
 * down over the ball, a pin stretches tall to the glass.
 */
function stand(g: number, air: number): Keys {
  const top = g + air * 0.5;
  return [
    [0, { hipY: -0.06, kneeL: 0.5, kneeR: 0.5, legLLift: 0.25, legRLift: 0.25, armLRaise: 0.9, armRRaise: 0.9, elbowL: 1.1, elbowR: 1.1 }],
    [g, { hipY: -0.18, kneeL: 1.25, kneeR: 1.25, legLLift: 0.62, legRLift: 0.62, torsoX: 0.3, armLRaise: 1.2, armRRaise: 1.2, elbowL: 1.3, elbowR: 1.3 }],
    [g + 0.09, { hipY: 0, kneeL: 0.15, kneeR: 0.25, legLLift: 0.05, legRLift: 0.2, footL: 0.6, footR: 0.5, torsoX: 0.05, armLRaise: 2.6, armRRaise: 2.65, elbowL: 0.4, elbowR: 0.4, neckX: -0.2 }],
    [top, { armLRaise: 3.0, armRRaise: 3.05, armLSpread: 0.14, armRSpread: 0.1, elbowL: 0.04, elbowR: 0.04, wristL: 0.25, wristR: 0.35, neckX: -0.32 }],
    [g + air - 0.1, { kneeL: 0.35, kneeR: 0.4, legLLift: 0.22, legRLift: 0.26, footL: 0.2, footR: 0.2, armLRaise: 2.5, armRRaise: 2.5, elbowL: 0.3, elbowR: 0.3 }],
    [g + air + 0.06, { hipY: -0.13, kneeL: 0.85, kneeR: 0.85, legLLift: 0.45, legRLift: 0.45, footL: 0, footR: 0, torsoX: 0.2, armLRaise: 1.2, armRRaise: 1.2, elbowL: 0.5, elbowR: 0.5 }],
  ];
}

/** On the run: off one foot, the left knee driving up, both hands thrown high, the body carried on. */
function run(g: number, air: number): Keys {
  const k = stand(g, air);
  k[1] = [g, { ...k[1]![1], torsoX: 0.25, legLLift: 0.95, kneeL: 1.35, legRLift: 0.15, kneeR: 0.7 }];
  k[2] = [g + 0.09, { ...k[2]![1], legLLift: 0.85, kneeL: 1.3, legRLift: -0.2, kneeR: 0.3, footR: 0.7 }];
  k[3] = [g + air * 0.5, { ...k[3]![1], torsoX: 0.12, legLLift: 0.7, kneeL: 1.15, legRLift: -0.12, kneeR: 0.55 }];
  return k;
}

/** The chase down: low and leaning in, the right arm cocked, then one long arm out ahead, the legs trailing like a sprinter's leap. */
function chase(g: number, air: number): Keys {
  return [
    [0, { torsoX: 0.45, hipY: -0.08, legLLift: 0.7, kneeL: 1.0, legRLift: -0.2, kneeR: 0.6, armRRaise: 1.4, elbowR: 1.4, armLRaise: 0.4, armLSpread: 0.4 }],
    [g, { torsoX: 0.5, hipY: -0.14, legLLift: 0.95, kneeL: 1.3, legRLift: 0.1, kneeR: 0.9, armRRaise: 2.1, elbowR: 1.6, armRSpread: 0.15 }],
    [g + 0.1, { torsoX: 0.38, hipY: 0, legLLift: 0.85, kneeL: 1.4, legRLift: -0.35, kneeR: 0.8, footR: 0.6, armRRaise: 2.75, elbowR: 0.5, armLRaise: 0.7, armLSpread: 0.9, elbowL: 0.4, neckX: -0.3 }],
    [g + air * 0.5, { torsoX: 0.32, armRRaise: 3.1, elbowR: 0.02, armRSpread: 0.02, wristR: 0.3, armLRaise: 0.5, armLSpread: 1.0, neckX: -0.4 }],
    [g + air - 0.1, { torsoX: 0.25, legLLift: 0.5, kneeL: 0.6, legRLift: 0.2, kneeR: 0.5, footR: 0.2, armRRaise: 2.2, elbowR: 0.4 }],
    [g + air + 0.06, { hipY: -0.13, torsoX: 0.3, legLLift: 0.55, kneeL: 0.9, legRLift: 0.35, kneeR: 0.8, footR: 0, armRRaise: 1.1, armLRaise: 0.6, armLSpread: 0.5 }],
  ];
}

/** Weak side help, written coming over to his left: the body leaning into the play, legs split, both hands up and across. */
function help(g: number, air: number): Keys {
  const k = stand(g, air);
  k[2] = [g + 0.09, { ...k[2]![1], torsoZ: 0.18, legLSpread: 0.3, legRSpread: -0.05, pelvisZ: 0.08 }];
  k[3] = [g + air * 0.5, { ...k[3]![1], torsoZ: 0.3, torsoY: 0.15, legLSpread: 0.38, legRSpread: 0.0, armLSpread: 0.3, armRSpread: -0.15, neckZ: -0.1 }];
  k[4] = [g + air - 0.1, { ...k[4]![1], torsoZ: 0.15, torsoY: 0.05, legLSpread: 0.25 }];
  k[5] = [g + air + 0.06, { ...k[5]![1], torsoZ: 0, torsoY: 0, pelvisZ: 0, neckZ: 0, legLSpread: 0.12, legRSpread: 0.08 }];
  return k;
}

/** The body's answer to the hit, from the touch on. */
const AFTER: Record<string, PosePatch> = {
  spike: { torsoX: 0.45, neckX: 0.1, hipY: -0.02 },
  pin: { torsoX: -0.08, neckX: -0.45 },
  miss: { torsoY: 0.2, neckY: 0.3, neckX: -0.15 },
};

/** `left` is + when a help leap comes across to his left. */
export function blockPose(act: Block, base: Pose, left: number): Pose {
  const { gather: g, air } = act;
  let keys = act.style === "run" ? run(g, air) : act.style === "chase" ? chase(g, air) : act.style === "help" ? help(g, air) : stand(g, air);
  if (act.style === "help" && left < 0) keys = keys.map(([t, p]) => [t, mirrorPatch(p)] as const);
  const p = keyed(keys, act.t, base);
  const plan = act.plan;
  if (!plan || act.t < plan.at) return p;
  const after = AFTER[plan.hit ?? "miss"];
  if (!after) return p;
  // In over a few frames from the touch, and out again as the feet come down.
  const k = Math.min(1, (act.t - plan.at) / 0.1) * Math.max(0, Math.min(1, (g + air - act.t) / 0.15));
  return blend(p, after, k, p);
}
