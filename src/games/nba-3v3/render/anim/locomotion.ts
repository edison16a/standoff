import { strideLength } from "../../engine/dribble-ball";
import { gait } from "./gait";
import { dribblePose } from "./holding";
import { blend, mirrorPatch, over, STAND, type Pose, type PosePatch } from "./pose";

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
  /** Guarding: which side of him the ball is, + his left, - his right. */
  ballSide?: number;
  /** 0 to 1 attacking the rim with the ball: down low over a tight dribble. */
  drive?: number;
  time: number;
  /** A per player offset so idle players do not breathe in step. */
  seed: number;
  /** The way of travel in the player's own frame, radians: 0 ahead, π/2 to his left. */
  heading?: number;
  /** Hip to ankle, metres. */
  leg?: number;
}

/** What the legs leave for the placement: how high both feet are off the floor in a running stride. */
export interface Stride {
  air: number;
}

const TAU = Math.PI * 2;

/** The guarding arms with the ball on his left: that hand low and wide, the right one up by the head. */
const GUARD_HANDS: PosePatch = {
  armLRaise: 0.4, armLSpread: 0.8, elbowL: 0.35, wristL: -0.15, armLTwist: 0.2,
  armRRaise: 1.6, armRSpread: 0.5, elbowR: 0.85, wristR: 0.1, armRTwist: 0,
};

export { strideLength };

/**
 * Feet and arms on the move: an idle sway with the weight drifting from
 * foot to foot, the gait (walk to sprint, see `gait.ts`) blended in
 * with speed, a low sliding stance on defence, and the dribbling arm
 * working the ball. `out.air` is set to the running stride's flight.
 */
export function locomotion(c: MoveContext, out?: Stride): Pose {
  const p = { ...STAND };
  const run = Math.min(1, c.speed / 6.5);
  const th = c.phase * TAU;
  const breathe = Math.sin(c.time * 2.1 + c.seed) * 0.02;
  p.torsoX = 0.05 + breathe;
  const still = 1 - Math.min(1, c.speed / 0.8);
  const shift = Math.sin(c.time * 0.9 + c.seed * 2) * still;
  p.pelvisZ = shift * 0.04;
  p.torsoZ = -shift * 0.03;
  if (out) out.air = 0;

  if (c.guarding) {
    const slide = Math.min(1, c.speed / 4);
    over(p, {
      hipY: -0.16, torsoX: 0.28, neckX: -0.22,
      legLLift: 0.55, legRLift: 0.55, kneeL: 1.0, kneeR: 1.0, legLSpread: 0.2, legRSpread: 0.2,
    });
    // Active hands: the one on the ball's side low and out to swipe at it, the other up in the passing lane.
    const k = Math.max(0, Math.min(1, ((c.ballSide ?? 0) + 1) / 2));
    blend(p, mirrorPatch(GUARD_HANDS), 1, p);
    blend(p, GUARD_HANDS, k * k * (3 - 2 * k), p);
    // Shuffle: the feet open and close, never crossing.
    const shuffle = Math.sin(th) * slide * 0.22;
    p.legLSpread += shuffle;
    p.legRSpread -= shuffle;
    p.hipY += Math.abs(Math.sin(th)) * slide * 0.02;
    p.armLRaise += Math.sin(c.time * 5 + c.seed) * 0.08;
    p.armRRaise += Math.cos(c.time * 5 + c.seed) * 0.08;
  } else {
    const leg = c.leg ?? 0.95;
    // The gait's left heel strikes a quarter cycle in, where the old stride had the left foot furthest forward.
    const g = gait({ phase: c.phase - 0.25, speed: c.speed, stride: strideLength(c.speed, leg, false), leg, heading: c.heading ?? 0 });
    const moving = Math.min(1, c.speed / 0.6);
    blend(p, g.pose, moving * moving * (3 - 2 * moving), p);
    p.torsoX += breathe;
    if (out) out.air = g.air;
  }
  return c.dribble === null ? p : dribblePose(p, c.dribble, run, c.dribbleSide, c.pressure, c.drive ?? 0);
}
