import { clamp } from "../vec";

/** How the ball arrived at a pair of hands, for the odds of holding on. */
export interface CatchTry {
  /** How much of the reach the hands had to use: 0 at the chest, 1 at full stretch. */
  stretch: number;
  /** The ball's speed against the hands, metres a second. */
  speed: number;
  /** 1 coming straight at the face, 0 over the shoulder, -1 from behind. */
  facing: number;
  /** How close another player's hands were to the ball, metres. */
  contest: number;
  diving: boolean;
  /** The hands rating, 1 to 10. */
  hands: number;
}

export const ODDS = {
  /** A ball into the chest of a player facing it, with average hands. */
  base: 0.95,
  perHands: 0.004,
  /** At full stretch the odds drop by this share. */
  stretch: 0.25,
  /** Faster than this the ball starts to bounce off the hands. */
  hot: 21,
  perHot: 0.035,
  /** Over the shoulder is a little harder than in front of the face; straight over the back of the head harder still. */
  shoulder: 0.03,
  blind: 0.05,
  /** A defender's hands within this distance fight for the ball. */
  crowd: 1.1,
  crowded: 0.25,
  dive: 0.85,
} as const;

/**
 * The chance the hands hold on, from where and how the ball arrives: in
 * the chest or at the fingertips, soft or a bullet, seen coming or over
 * the shoulder, with a defender's hands in there or not.
 */
export function catchOdds(c: CatchTry): number {
  const sure = ODDS.base + c.hands * ODDS.perHands;
  const stretch = 1 - ODDS.stretch * clamp(c.stretch, 0, 1) ** 2;
  const speed = c.speed > ODDS.hot ? Math.max(0.55, 1 - (c.speed - ODDS.hot) * ODDS.perHot) : 1;
  const sight = c.facing >= 0 ? 1 - ODDS.shoulder * (1 - c.facing) : 1 - ODDS.shoulder - ODDS.blind * -c.facing;
  const crowd = c.contest < ODDS.crowd ? 1 - ODDS.crowded * (1 - c.contest / ODDS.crowd) : 1;
  return clamp(sure * stretch * speed * sight * crowd * (c.diving ? ODDS.dive : 1), 0.03, 0.995);
}
