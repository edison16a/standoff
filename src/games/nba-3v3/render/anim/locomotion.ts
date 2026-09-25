import { strideLength, strideSwing } from "../../engine/dribble-ball";
import { dribblePose } from "./holding";
import { over, STAND, type Pose } from "./pose";

export interface MoveContext {
  /** Ground speed in metres per second. */
  speed: number;
  /** Where the legs are in their stride, 0 to 1. */
  phase: number;
  /** Down in a guarding stance, arms wide. */
  guarding: boolean;
  /** The dribble, 0 to 1 with the ball at the hand at 0, or null without the ball. */
  dribble: number | null;
  /** Which hand dribbles, -1 left to 1 right, in between during a crossover. */
  dribbleSide: number;
  /** 0 to 1 as a defender closes in on the ball handler, raising the off arm to shield the ball. */
  pressure: number;
  time: number;
  /** A per player offset so idle players do not breathe in step. */
  seed: number;
}

const TAU = Math.PI * 2;

export { strideLength };

/**
 * Feet and arms on the move: an idle sway with the weight drifting from
 * foot to foot, a run that grows with speed (bigger strides, more lean,
 * arms pumping against the legs), a low sliding stance on defence, and
 * the dribbling arm working the ball.
 */
export function locomotion(c: MoveContext): Pose {
  const p = { ...STAND };
  const run = Math.min(1, c.speed / 6.5);
  const th = c.phase * TAU;
  const breathe = Math.sin(c.time * 2.1 + c.seed) * 0.02;
  p.torsoX = 0.05 + breathe + run * 0.22;
  p.neckX = -run * 0.12;
  const still = 1 - Math.min(1, c.speed / 0.8);
  const shift = Math.sin(c.time * 0.9 + c.seed * 2) * still;
  p.pelvisZ = shift * 0.04;
  p.torsoZ = -shift * 0.03;

  if (c.guarding) {
    const slide = Math.min(1, c.speed / 4);
    over(p, {
      hipY: -0.16, torsoX: 0.32, neckX: -0.25,
      armLRaise: 0.55, armRRaise: 0.55, armLSpread: 0.95, armRSpread: 0.95, elbowL: 0.55, elbowR: 0.55,
      legLLift: 0.55, legRLift: 0.55, kneeL: 1.0, kneeR: 1.0, legLSpread: 0.2, legRSpread: 0.2,
    });
    // Shuffle: the feet open and close, never crossing.
    const shuffle = Math.sin(th) * slide * 0.22;
    p.legLSpread += shuffle;
    p.legRSpread -= shuffle;
    p.hipY += Math.abs(Math.sin(th)) * slide * 0.02;
    p.armLRaise += Math.sin(c.time * 5 + c.seed) * 0.08;
    p.armRRaise += Math.cos(c.time * 5 + c.seed) * 0.08;
  } else {
    const stride = strideSwing(c.speed);
    p.legLLift = 0.08 + Math.sin(th) * stride;
    p.legRLift = 0.08 - Math.sin(th) * stride;
    p.kneeL = 0.15 + run * (0.2 + 1.25 * Math.max(0, Math.cos(th)));
    p.kneeR = 0.15 + run * (0.2 + 1.25 * Math.max(0, -Math.cos(th)));
    p.footL = run * 0.25 * Math.max(0, -Math.sin(th));
    p.footR = run * 0.25 * Math.max(0, Math.sin(th));
    // The body bobs twice a stride, lowest as each foot takes the weight.
    p.hipY = -0.02 - run * (0.03 + 0.035 * Math.abs(Math.cos(th)));
    p.pelvisY = Math.sin(th) * run * 0.12;
    p.torsoY = -Math.sin(th) * run * 0.16;
    const pump = 0.1 + run * 0.75;
    p.armLRaise = 0.1 - Math.sin(th) * pump;
    p.armRRaise = 0.1 + Math.sin(th) * pump;
    p.elbowL = 0.35 + run * 1.05;
    p.elbowR = 0.35 + run * 1.05;
    p.armLSpread = 0.14;
    p.armRSpread = 0.14;
  }
  return c.dribble === null ? p : dribblePose(p, c.dribble, run, c.dribbleSide, c.pressure);
}
