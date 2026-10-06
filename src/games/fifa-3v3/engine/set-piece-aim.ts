import { CHARGE } from "./charge";
import { BALL, PITCH } from "./tuning";
import type { SetPiece } from "./types";
import { clamp, type Vec3 } from "./vec";

/**
 * How a set piece leaves the boot. The same numbers draw the white line
 * the taker lines it up with and fly the real kick, so what the line
 * shows is what the ball does (the wall, the keeper and a wild red zone
 * strike aside).
 */
export const SET_KICK = {
  /** Pace off the boot for an empty power bar and a full one. */
  freeMin: 15,
  freeMax: 30,
  penMin: 17,
  penMax: 30,
  /**
   * Sidespin at full curve from `spinAt` metres, in radians a second: a
   * wide bend round the wall, about 14 turns a second. Closer in it
   * spins harder, up to the 17 or so turns a boot can put on a ball,
   * and further out softer, so full curve bows the path by a similar
   * share from any range.
   */
  spin: 88,
  spinAt: 18,
  spinMax: 110,
  /** At this power a free kick dips in under the bar, at this height. */
  nominal: 0.55,
  crossHeight: 0.74 * PITCH.goalHeight,
  /** Where an empty bar, the top of yellow and a full red bar cross the line, set by the height of the bar. */
  lowHeight: 0.3,
  topYellow: 0.88 * PITCH.goalHeight,
  overHeight: PITCH.goalHeight + 0.65,
  /** How far the aim may turn off the middle of the goal, and a penalty's aim across and up. */
  maxYaw: 0.5,
  /** The aimed spot never lands further than this outside a post, however the aim is turned. */
  aimWide: 2,
  penWide: PITCH.goalHalfWidth + 0.5,
  penHigh: PITCH.goalHeight + 0.6,
} as const;

/** The ball on its spot. */
export function spotBall(sp: SetPiece): Vec3 {
  return { x: sp.spot.x, y: BALL.radius, z: sp.spot.z };
}

/**
 * How high a free kick struck at `power` crosses the goal line. The
 * nominal power dips in under the bar, a softer one stays low into the
 * wall, all of yellow still comes in under the bar, and only the red
 * climbs over it, from any distance.
 */
export function crossHeight(power: number): number {
  const p = clamp(power, 0, 1);
  const { nominal, crossHeight: mid, lowHeight, topYellow, overHeight } = SET_KICK;
  if (p <= nominal) return lowHeight + (mid - lowHeight) * (p / nominal);
  if (p <= CHARGE.red) return mid + (topYellow - mid) * ((p - nominal) / (CHARGE.red - nominal));
  return topYellow + (overHeight - topYellow) * ((p - CHARGE.red) / (1 - CHARGE.red));
}
