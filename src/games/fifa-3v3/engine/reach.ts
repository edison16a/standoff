import { canPlay, footPoint } from "./athlete";
import { ballSpeed } from "./ball";
import { BALL } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist } from "./vec";

/** Below this pace a ball can be read and met without reacting to it. */
export const EASY_BALL = 6;

/**
 * Seconds a player needs to react to a ball just struck or knocked off
 * a body before he can get a foot to it: quicker with sharp reflexes.
 * Nobody takes a pass off the boot the instant it is hit.
 */
export function reactionTime(a: Athlete): number {
  return 0.12 + 0.14 * (1 - a.attrs.reflexes);
}

/**
 * Whether this player is ready to play the ball this step: on his feet,
 * not just shaken off it, and either expecting it, facing a ball slow
 * enough to read, or past his reaction time since it was struck.
 */
export function ready(state: MatchState, a: Athlete): boolean {
  const ball = state.ball;
  if (a.noTouch > 0 || !canPlay(a)) return false;
  return ball.passTo === a.id || ballSpeed(ball) < EASY_BALL || state.time - ball.struckAt >= reactionTime(a);
}

/** The furthest from the boot a touch or a kick reaches the ball. */
export const BOOT_REACH = 0.75;

/** Whether the ball is at the boot, where a touch or a kick can be struck. */
export function atFeet(state: MatchState, a: Athlete): boolean {
  const ball = state.ball;
  return dist(footPoint(a), ball.pos) < BOOT_REACH && ball.pos.y < BALL.radius + 0.4;
}

/**
 * The heights a player plays the ball at in the air: below the chest
 * with his feet (control.ts), then on the chest, then with his head, up
 * to the top of a leap (aerial.ts).
 */
export const AERIAL = {
  chest: 0.95,
  head: 1.55,
  top: 2.45,
  /** How close to his body, across the ground, a ball must come to be chested or headed. */
  reach: 0.55,
  /** A ball faster than this cannot be killed on the chest: it hits him. */
  chestMax: 18,
} as const;

/**
 * Whether a ready player plays a ball at this height himself, rather
 * than standing in its way as a body it bounces off. A hard ball at his
 * chest is too quick to bring down, and one over his leap is not his.
 */
export function handlesInAir(state: MatchState): boolean {
  const y = state.ball.pos.y;
  if (y < AERIAL.chest) return true;
  if (y > AERIAL.top + 0.3) return false;
  return y > AERIAL.head || ballSpeed(state.ball) < AERIAL.chestMax;
}
