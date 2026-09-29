import { keeperReach } from "./set-piece-save";
import { KEEPER, PITCH } from "./tuning";
import { clamp01 } from "./vec";

/**
 * How much of the goal mouth a keeper set in the middle cannot get to,
 * 0 to 1: the part wider than his full dive and higher than his stretch.
 * The goal is bigger than the keeper, so this is the room a shot has.
 * With the old 5.8 by 2.3 metre goal it was almost nothing, which is why
 * he played like a brick wall.
 */
export function openMouth(halfWidth: number = PITCH.goalHalfWidth, height: number = PITCH.goalHeight): number {
  const across = Math.min(1, keeperReach(Infinity, 0) / halfWidth);
  const up = Math.min(1, KEEPER.reach / height);
  return clamp01(1 - across * up);
}

/** The open mouth of this match's goal, worked out once. */
export const OPEN_MOUTH = openMouth();
