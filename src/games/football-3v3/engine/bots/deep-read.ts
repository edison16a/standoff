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
  width: 11,
  /** What a clean top is worth to a QB with perfect eyes, in metres of room. */
  bonus: 3,
  /** Taken off when the call has no shot for him, or he is capped: a ball up there into coverage is a pick. */
  off: 5,
  /** Taken off while he is still on his way: not a deep shot yet. */
  early: 2,
} as const;

/** The biggest threat in the lane to where a receiver will be `lead` seconds on, 0 to 1. */
export function laneRisk(m: Match, qb: Athlete, r: Athlete, lead: number): number {
  return readLane(m, qb, qb, ahead(r, lead))[0]?.threat ?? 0;
}

/**
 * What the deep threat's look adds to his openness. Most calls have no
 * shot for him in them (the QB's key, bots/plan.ts), and then he is a
 * look of last resort. On one that does he is a poor look until he is
 * past the depth, then open over the top when no defender is level with
 * him or deeper near his line, which a sharper QB sees better. Capped,
 * or with someone in the lane, he is not worth the risk. `depth` is
 * metres past the line of scrimmage.
 */
export function deepRead(m: Match, qb: Athlete, r: Athlete, defenders: readonly Athlete[], depth: number, skill: FootballSkill): number {
  const risk = laneRisk(m, qb, r, DEEP_READ.lead) * 10 * skill.accuracy;
  if (!qb.bot.key) return -risk - DEEP_READ.off;
  if (depth < DEEP_READ.depth * YARD) return -risk - DEEP_READ.early;
  const s = m.sign;
  const capped = defenders.some((d) => (d.x - r.x) * s > -1 && Math.abs(d.z - r.z) < DEEP_READ.width);
  return -risk + (capped ? -DEEP_READ.off : DEEP_READ.bonus * skill.accuracy);
}
