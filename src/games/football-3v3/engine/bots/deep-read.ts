import { YARD } from "../field";
import type { Match } from "../match";
import { readLane } from "../pass-lane";
import type { Athlete } from "../types";
import { ahead } from "./goal";
import type { FootballSkill } from "./skill";

/** How a computer QB reads the deep threat for the long ball. */
export const DEEP_READ = {
  /** Yards past the line before he counts as gone deep. */
  depth: 12,
  /** Seconds ahead his lane is read: a deep ball is led well in front of him. */
  lead: 1.1,
  /** Metres across inside which a defender level with him or deeper caps him. */
  width: 7,
  /** What a clean top is worth to a QB with perfect eyes, in metres of room. */
  bonus: 3,
  /** Taken off a capped deep threat: a ball up there into coverage is a pick. */
  capped: 1,
  /** Taken off while he is still on his way: not a deep shot yet. */
  early: 2,
} as const;

/** The biggest threat in the lane to where a receiver will be `lead` seconds on, 0 to 1. */
export function laneRisk(m: Match, qb: Athlete, r: Athlete, lead: number): number {
  return readLane(m, qb, qb, ahead(r, lead))[0]?.threat ?? 0;
}

/**
 * What the deep threat's look adds to his openness. Short of the depth
 * he is a poor look. Past it he is open over the top when no defender
 * is level with him or deeper near his line, and a sharper QB sees that
 * better. A man with someone over the top, or in the lane, is not worth
 * the risk. `depth` is metres past the line of scrimmage.
 */
export function deepRead(m: Match, qb: Athlete, r: Athlete, defenders: readonly Athlete[], depth: number, skill: FootballSkill): number {
  const risk = laneRisk(m, qb, r, DEEP_READ.lead) * 10 * skill.accuracy;
  if (depth < DEEP_READ.depth * YARD) return -risk - DEEP_READ.early;
  const s = m.sign;
  const capped = defenders.some((d) => (d.x - r.x) * s > -1 && Math.abs(d.z - r.z) < DEEP_READ.width);
  return -risk + (capped ? -DEEP_READ.capped : DEEP_READ.bonus * skill.accuracy);
}
