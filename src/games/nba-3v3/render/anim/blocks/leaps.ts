import type { BlockJump } from "../../../engine/blocks/style";
import type { PosePatch } from "../pose";

export type Keys = (readonly [number, PosePatch])[];

/**
 * The leap of each block jump, the whole body from the plant to the
 * touchdown, timed on the engine's own stages: `g` is the takeoff (the
 * end of the crouch) and `air` the time off the floor. The arms here
 * only carry up with the jump; the strike of the preset (`strikes.ts`)
 * and the hand on the ball (`block-reach.ts`) play over them.
 *
 * Coming down, the arms come in half open and tucked, bent at the
 * elbow, so they do not sweep across the shooter who is usually close.
 *
 * On the run the plant foot is set down ahead and the body passes over
 * it during the crouch, so the leg sweeps back by as much ground as the
 * run covers: the foot stays put on the floor instead of sliding.
 */

/** How far back the plant leg sweeps over the crouch at a full run, radians of thigh. */
const SWEEP = 0.7;
const RUN = 5;

/** Square in front, two feet: a dip with the arms swinging back, then straight up with both hands. */
function stand(g: number, air: number): Keys {
  const top = g + air * 0.5;
  return [
    [0, { hipY: -0.06, kneeL: 0.5, kneeR: 0.5, legLLift: 0.25, legRLift: 0.25, armLRaise: 0.6, armRRaise: 0.6, elbowL: 1.1, elbowR: 1.1, torsoX: 0.15 }],
    [g, { hipY: -0.2, kneeL: 1.3, kneeR: 1.3, legLLift: 0.66, legRLift: 0.66, torsoX: 0.34, armLRaise: -0.35, armRRaise: -0.35, elbowL: 0.5, elbowR: 0.5 }],
    [g + 0.09, { hipY: 0, kneeL: 0.15, kneeR: 0.25, legLLift: 0.05, legRLift: 0.2, footL: 0.6, footR: 0.5, torsoX: 0.05, armLRaise: 2.4, armRRaise: 2.45, elbowL: 0.5, elbowR: 0.5, neckX: -0.2 }],
    [top, { armLRaise: 2.95, armRRaise: 3.0, armLSpread: 0.14, armRSpread: 0.1, elbowL: 0.08, elbowR: 0.08, wristL: 0.25, wristR: 0.35, neckX: -0.32, kneeL: 0.3, kneeR: 0.4 }],
    [g + air - 0.1, { kneeL: 0.4, kneeR: 0.45, legLLift: 0.25, legRLift: 0.28, footL: 0.25, footR: 0.25, armLRaise: 2.1, armRRaise: 2.1, armLSpread: 0.55, armRSpread: 0.55, elbowL: 0.4, elbowR: 0.4 }],
    [g + air + 0.05, { hipY: -0.14, kneeL: 0.9, kneeR: 0.9, legLLift: 0.48, legRLift: 0.48, footL: 0, footR: 0, torsoX: 0.22, armLRaise: 0.45, armRRaise: 0.45, armLSpread: 0.3, armRSpread: 0.3, elbowL: 0.85, elbowR: 0.85 }],
  ];
}

/** On the run: the left foot planted ahead, off it with the right knee driving, both hands thrown high, the body carried on. */
function run(g: number, air: number, sweep: number): Keys {
  const k = stand(g, air);
  k[0] = [0, { ...k[0]![1], torsoX: 0.2, legLLift: 0.35 + sweep * 0.5, kneeL: 0.5, legRLift: -0.25, kneeR: 1.0 }];
  k[1] = [g, { ...k[1]![1], torsoX: 0.25, legLLift: 0.35 - sweep * 0.5, kneeL: 1.2, legRLift: 0.3, kneeR: 1.25 }];
  k[2] = [g + 0.09, { ...k[2]![1], legLLift: -0.2, kneeL: 0.35, footL: 0.7, legRLift: 0.95, kneeR: 1.35 }];
  k[3] = [g + air * 0.5, { ...k[3]![1], torsoX: 0.12, legLLift: -0.1, kneeL: 0.6, legRLift: 0.75, kneeR: 1.15 }];
  return k;
}

/** The chase down: low and leaning in off a long last stride, one arm cocked, the legs trailing like a sprinter's leap. */
function chase(g: number, air: number, sweep: number): Keys {
  return [
    [0, { torsoX: 0.45, hipY: -0.08, legLLift: 0.45 + sweep * 0.5, kneeL: 0.7, legRLift: -0.3, kneeR: 1.1, armRRaise: 0.9, elbowR: 1.4, armLRaise: -0.2, armLSpread: 0.3 }],
    [g, { torsoX: 0.5, hipY: -0.16, legLLift: 0.45 - sweep * 0.5, kneeL: 1.25, legRLift: 0.25, kneeR: 1.2, armRRaise: 1.9, elbowR: 1.5, armRSpread: 0.15, armLRaise: 0.3 }],
    [g + 0.1, { torsoX: 0.38, hipY: 0, legLLift: -0.35, kneeL: 0.8, footL: 0.6, legRLift: 0.85, kneeR: 1.4, armRRaise: 2.5, elbowR: 0.7, armLRaise: 0.7, armLSpread: 0.9, elbowL: 0.4, neckX: -0.3 }],
    [g + air * 0.5, { torsoX: 0.3, legLLift: -0.15, kneeL: 0.9, legRLift: 0.7, kneeR: 1.2, armRRaise: 2.8, elbowR: 0.2, armLRaise: 0.5, armLSpread: 1.0, neckX: -0.4 }],
    [g + air - 0.1, { torsoX: 0.25, legLLift: 0.2, kneeL: 0.5, legRLift: 0.5, kneeR: 0.6, footL: 0.2, armRRaise: 2.0, armRSpread: 0.55, elbowR: 0.4 }],
    [g + air + 0.05, { hipY: -0.13, torsoX: 0.32, legLLift: 0.35, kneeL: 0.8, legRLift: 0.55, kneeR: 0.9, footL: 0, armRRaise: 0.6, armRSpread: 0.4, elbowR: 0.6, armLRaise: 0.5, armLSpread: 0.5 }],
  ];
}

/** Weak side help, written coming over to his left: a crossover step, then the body leaning into the play, legs split, both hands up. */
function help(g: number, air: number, sweep: number): Keys {
  const k = stand(g, air);
  k[0] = [0, { ...k[0]![1], torsoZ: 0.1, legRLift: 0.3 + sweep * 0.3, legRSpread: -0.25, kneeR: 0.6, legLSpread: 0.15 }];
  k[1] = [g, { ...k[1]![1], torsoZ: 0.16, legRLift: 0.5 - sweep * 0.3, legRSpread: -0.1, legLSpread: 0.25 }];
  k[2] = [g + 0.09, { ...k[2]![1], torsoZ: 0.2, legLSpread: 0.32, legRSpread: -0.05, pelvisZ: 0.08 }];
  k[3] = [g + air * 0.5, { ...k[3]![1], torsoZ: 0.3, torsoY: 0.15, legLSpread: 0.38, legRSpread: 0.0, armLSpread: 0.3, armRSpread: -0.15, neckZ: -0.1 }];
  k[4] = [g + air - 0.1, { ...k[4]![1], torsoZ: 0.15, torsoY: 0.05, legLSpread: 0.25 }];
  k[5] = [g + air + 0.05, { ...k[5]![1], torsoZ: 0, torsoY: 0, pelvisZ: 0, neckZ: 0, legLSpread: 0.12, legRSpread: 0.08 }];
  return k;
}

/**
 * The closeout: chopped short steps at the shooter, a plant on the left
 * foot, and a leap that carries on past him, the legs split wide and
 * the body leaning back so it does not crash into him, the right hand
 * high and the left low and back for balance.
 */
function closeout(g: number, air: number, sweep: number): Keys {
  return [
    [0, { torsoX: 0.12, hipY: -0.08, legLLift: 0.3 + sweep * 0.4, kneeL: 0.6, legRLift: -0.1, kneeR: 0.8, armRRaise: 1.3, elbowR: 0.9, armLRaise: 0.5, elbowL: 0.8 }],
    [g, { torsoX: 0.1, hipY: -0.17, legLLift: 0.3 - sweep * 0.4, kneeL: 1.2, legRLift: 0.35, kneeR: 1.2, armRRaise: 2.0, elbowR: 0.8, armLRaise: 0.2, armLSpread: 0.4 }],
    [g + 0.09, { torsoX: -0.05, hipY: 0, legLLift: -0.3, kneeL: 0.6, footL: 0.7, legRLift: 0.8, kneeR: 1.0, armRRaise: 2.7, elbowR: 0.3, armLRaise: -0.2, armLSpread: 0.7, neckX: -0.25 }],
    [g + air * 0.5, { torsoX: -0.12, legLLift: -0.45, kneeL: 0.7, legRLift: 0.9, kneeR: 0.7, footR: 0.4, armRRaise: 3.0, elbowR: 0.05, armRSpread: 0.05, armLRaise: -0.35, armLSpread: 0.85, elbowL: 0.3, neckX: -0.35 }],
    [g + air - 0.1, { torsoX: 0.02, legLLift: -0.1, kneeL: 0.5, legRLift: 0.55, kneeR: 0.5, footL: 0.25, armRRaise: 2.0, armRSpread: 0.55, elbowR: 0.3, armLRaise: 0.2, armLSpread: 0.6 }],
    [g + air + 0.05, { hipY: -0.12, torsoX: 0.2, legLLift: 0.2, kneeL: 0.8, legRLift: 0.5, kneeR: 0.9, footL: 0, footR: 0, armRRaise: 0.5, armRSpread: 0.45, elbowR: 0.6, armLRaise: 0.4, armLSpread: 0.45 }],
  ];
}

/** The leap for a jump style, with the plant sweep scaled to the speed he takes off at. */
export function leapKeys(style: BlockJump, g: number, air: number, speed: number): Keys {
  const sweep = SWEEP * Math.min(1, speed / RUN);
  switch (style) {
    case "stand":
      return stand(g, air);
    case "run":
      return run(g, air, sweep);
    case "chase":
      return chase(g, air, sweep);
    case "help":
      return help(g, air, sweep);
    case "closeout":
      return closeout(g, air, sweep);
  }
}
