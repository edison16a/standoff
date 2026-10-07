import type { PassInfo } from "../ball";
import { isDown } from "../body";
import { JARRED } from "../catch-preset";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { dist2 } from "../vec";

/**
 * The dice for a clean ball, before anyone has knocked it about. The
 * receiver it was thrown to always holds an open one; a defender gets
 * only what his lane threat (pass-lane.ts) gives him.
 */
export const LANE_PLAY = {
  /** Of a defender's threat, the share that is a pick when he can catch it; the rest is a hand to it. */
  pickShare: 0.55,
  /** Of the threat of a defender right on the receiver, the share that jars the ball loose. */
  jar: 0.5,
} as const;

/** What a defender in the lane does with the ball reaching his hands. */
export type LaneCall = "pick" | "knock" | "past";

/** `roll` is a uniform draw from 0 to 1; `canPick` is false for a computer defender who only knocks passes down. */
export function laneCall(threat: number, roll: number, canPick: boolean): LaneCall {
  if (canPick && roll < threat * LANE_PLAY.pickShare) return "pick";
  return roll < threat ? "knock" : "past";
}

/** A defender's threat on this pass, 0 when he was not in the lane. */
export const threatOf = (pass: PassInfo, a: Athlete): number => pass.lane[a.id] ?? 0;

/**
 * The odds the receiver it was thrown to holds a clean ball: certain
 * when open, a little less with a lane defender right on him to hit it
 * loose as it arrives.
 */
export function holdOdds(m: Match, a: Athlete, pass: PassInfo): number {
  let on = 0;
  for (const [id, threat] of Object.entries(pass.lane)) {
    const d = m.athlete(Number(id));
    if (d && !isDown(d) && dist2(d, a) < JARRED) on = Math.max(on, threat);
  }
  return 1 - on * LANE_PLAY.jar;
}
