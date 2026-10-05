import { diveTo, planDive } from "./keeper-read";
import { fly } from "./shot-aim";
import { KEEPER } from "./tuning";
import type { Keeper, MatchState } from "./types";
import { WALL } from "./wall";

/**
 * The keeper facing a set piece. Nothing is rolled for the result: he
 * moves, and the flight decides. A free kick he picks up late, as it
 * comes past the wall's bodies, so he reads it worse. A penalty comes
 * too fast to read at all, so he guesses a side as it is struck: going
 * the right way he can reach most of what is not tucked in by a post;
 * going the wrong way only a ball struck at his legs is stopped.
 */
export const READ = {
  /** A penalty: how often he stays up the middle, and how often he picks the right side when he goes. */
  stay: 0.1,
  rightSide: 0.62,
  /** A penalty keeper who guessed right still only has a rough idea of the spot, metres. */
  penaltyMisread: 0.32,
  /** A free kick: seen this much later than a shot in open play, and read this much worse. */
  freeLate: 0.12,
  freeMisread: 0.18,
} as const;

/** The free kick keeper reads the ball once it is coming past the wall. */
export function freeKickKeeper(state: MatchState, keeper: Keeper): void {
  const speed = Math.hypot(state.ball.vel.x, state.ball.vel.z);
  const pastWall = WALL.distance / Math.max(8, speed);
  planDive(state, keeper, { react: pastWall + READ.freeLate, misread: READ.freeMisread });
}

/**
 * The penalty keeper's guess as it is struck, and his dive: the right
 * way, read roughly and early; the wrong way, a full length dive to the
 * side he picked; or standing his ground in the middle.
 */
export function penaltyKeeper(state: MatchState, keeper: Keeper): { guess: -1 | 0 | 1; rightWay: boolean } {
  const rng = state.rng;
  const hit = fly({ ...state.ball.pos }, { vel: { ...state.ball.vel }, spin: { ...state.ball.spin }, time: 0 }, keeper.pos.x);
  const side = !hit || Math.abs(hit.z - keeper.pos.z) < 0.6 ? 0 : Math.sign(hit.z - keeper.pos.z);
  const guess = guessSide(rng.next(), rng.next(), side);
  const rightWay = side === guess && guess !== 0;
  if (guess === 0) return { guess, rightWay: side === 0 };
  if (rightWay) {
    // He goes as it is struck, so he has all the time there is, but only a rough idea of the spot.
    planDive(state, keeper, { react: 0.04, misread: READ.penaltyMisread });
    return { guess, rightWay };
  }
  const gloveZ = keeper.pos.z + guess * rng.range(1.6, 2.4);
  const height = rng.range(0.5, 1.4);
  diveTo(keeper, gloveZ, height, 0.03, KEEPER.diveTime, 0);
  return { guess, rightWay };
}

/** The keeper's pick for a penalty going to `side` (0 is down the middle), from two rolls. */
export function guessSide(stayRoll: number, sideRoll: number, side: number): -1 | 0 | 1 {
  if (stayRoll < READ.stay) return 0;
  const way = side === 0 ? (sideRoll < 0.5 ? 1 : -1) : (Math.sign(side) as 1 | -1);
  return sideRoll < READ.rightSide ? way : (-way as 1 | -1);
}
