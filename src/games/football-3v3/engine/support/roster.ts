import type { Stats } from "../../builds";
import type { Athlete } from "../types";

/**
 * The support players fill each side out to eleven: five computer
 * players on top of the QB, the two runners and the three linemen. They
 * never run routes. On offense they block; on defence they rush the
 * passer or sit back in layers to tackle whoever gets through.
 */
export const SUPPORT = {
  /** Support players a side. */
  perSide: 5,
  /** Their share of a skill player's top speed: big men, but they chase. */
  pace: 0.94,
} as const;

/**
 * Each slot has one job on offense and one on defence. The tackles on
 * the ends of the line take the edge rushers; the wings and the lead
 * back block whoever threatens the ball. On defence the edges rush, the
 * two backers sit about nine yards off and the deep man about twenty.
 */
export type OffenseJob = "tackle" | "wing" | "lead";
export type DefenseJob = "edge" | "backer" | "deep";

const OFFENSE_JOBS: readonly OffenseJob[] = ["tackle", "tackle", "wing", "wing", "lead"];
const DEFENSE_JOBS: readonly DefenseJob[] = ["edge", "edge", "backer", "backer", "deep"];

export const offenseJob = (slot: number): OffenseJob => OFFENSE_JOBS[slot] ?? "wing";
export const defenseJob = (slot: number): DefenseJob => DEFENSE_JOBS[slot] ?? "backer";

/** Which side of the ball a slot lines up on: even slots to the left of it (negative z), odd to the right. */
export const sideOf = (slot: number): 1 | -1 => (slot % 2 === 0 ? -1 : 1);

/** The deeper the job, the quicker the man: the ends are strong, the deep man can run. */
const STATS: readonly Stats[] = [
  { speed: 4, agility: 4, power: 8, hands: 3, arm: 2, cover: 3 },
  { speed: 4, agility: 4, power: 8, hands: 3, arm: 2, cover: 3 },
  { speed: 6, agility: 5, power: 7, hands: 5, arm: 2, cover: 5 },
  { speed: 6, agility: 5, power: 7, hands: 5, arm: 2, cover: 5 },
  { speed: 7, agility: 6, power: 6, hands: 5, arm: 2, cover: 6 },
];

export const supportStats = (slot: number): Stats => STATS[slot] ?? STATS[2]!;

export const isSupport = (a: Pick<Athlete, "role">) => a.role === "support";
