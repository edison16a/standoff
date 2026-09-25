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
  time: number;
  /** A per player offset so idle players do not breathe in step. */
  seed: number;
}

const TAU = Math.PI * 2;

/**
 * Feet and arms on the move: an idle sway, a run that grows with speed
 * (bigger strides, more lean, arms pumping against the legs), a low
 * sliding stance on defence, and the dribbling arm working the ball.
 */
export function locomotion(c: MoveContext): Pose {
  const p = { ...STAND };
  const run = Math.min(1, c.speed / 6.5);
  const th = c.phase * TAU;
  const breathe = Math.sin(c.time * 2.1 + c.seed) * 0.02;
  p.torsoX = 0.05 + breathe + run * 0.22;
  p.neckX = -run * 0.12;

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
    const stride = 0.12 + run * 0.72;
    p.legLLift = 0.08 + Math.sin(th) * stride;
    p.legRLift = 0.08 - Math.sin(th) * stride;
    p.kneeL = 0.15 + run * (0.2 + 1.25 * Math.max(0, Math.cos(th)));
    p.kneeR = 0.15 + run * (0.2 + 1.25 * Math.max(0, -Math.cos(th)));
    p.footL = run * 0.25 * Math.max(0, -Math.sin(th));
    p.footR = run * 0.25 * Math.max(0, Math.sin(th));
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
    p.torsoZ = -c.lateral * run * 0.12;
  }

  if (c.dribble !== null) {
    // The dribbling hand meets the ball at the top of each bounce and pushes it down.
    const push = Math.max(0, Math.cos(c.dribble * TAU));
    p.armRRaise = 0.42 + run * 0.15 - push * 0.2;
    p.armRSpread = 0.22;
    p.elbowR = 0.75 + push * 0.45;
    p.wristR = 0.2 + push * 0.5;
    p.armRTwist = 0.2;
    // The off arm stays up, guarding the ball.
    p.armLRaise = 0.75 + run * 0.1;
    p.armLSpread = 0.45;
    p.elbowL = 1.0;
    p.torsoX += 0.08;
    p.torsoY -= 0.12;
    p.neckY = 0.1;
  }
  return p;
}
