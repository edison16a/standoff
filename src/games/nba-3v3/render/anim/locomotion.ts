import { dribblePose } from "./holding";
import { over, STAND, type Pose } from "./pose";

export interface MoveContext {
  /** Ground speed in metres per second. */
  speed: number;
  /** Where the legs are in their stride, 0 to 1. */
  phase: number;
  /** How much of the motion is sideways to the way they face, -1 left to 1 right. */
  lateral: number;
  /** Down in a guarding stance, arms wide. */
  guarding: boolean;
  /** The dribble, 0 to 1 with the ball at the hand at 0, or null without the ball. */
  dribble: number | null;
  /** Which hand dribbles, -1 left to 1 right, in between during a crossover. */
  dribbleSide: number;
  time: number;
  /** A per player offset so idle players do not breathe in step. */
  seed: number;
}

const TAU = Math.PI * 2;

/** How far each hip swings through a stride, in radians, growing with speed. */
export const strideSwing = (speed: number) => 0.12 + Math.min(1, speed / 6.5) * 0.72;

/**
 * The ground covered by one full stride cycle (a step with each foot)
 * for legs of length `leg`. The stride phase advances by the distance
 * run over this, so a planted foot moves back exactly as fast as the
 * body goes forward and the feet do not skate.
 */
export function strideLength(speed: number, leg: number, guarding: boolean): number {
  // Feet split 2 leg sin(swing) apart at full stride; the bent knee shortens that a little.
  const swing = guarding ? 0.3 : strideSwing(speed);
  return Math.max(0.35, 4 * leg * Math.sin(swing) * 0.88);
}

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
    // Running sideways leans the body into the turn.
    p.torsoZ += -c.lateral * run * 0.12;
  }
  return c.dribble === null ? p : dribblePose(p, c.dribble, run, c.dribbleSide);
}
