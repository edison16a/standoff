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
