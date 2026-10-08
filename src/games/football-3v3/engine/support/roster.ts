import type { Stats } from "../../builds";
import type { Athlete } from "../types";

/**
 * The support players fill each side out to eleven: five computer
 * players on top of the QB, the two runners and the three linemen. On
 * offense four block and one, the deep threat, goes long; on defence
 * they rush the passer or sit back in layers to tackle whoever gets
 * through.
 */
export const SUPPORT = {
  /** Support players a side. */
  perSide: 5,
  /** Their share of a skill player's top speed: big men, but they chase. */
  pace: 0.94,
  /** The slot that plays the deep threat on offense and the deep man on defence. */
  deepSlot: 4,
} as const;

/**
 * Each slot has one job on offense and one on defence. The tackles on
 * the ends of the line take the edge rushers; the wings block whoever
 * threatens the ball. The last slot is the deep threat, who runs a go
 * route (or, in a match without him, the lead back who blocks). On
 * defence the edges rush, the two backers sit about nine yards off and
 * the deep man about twenty.
 */
export type OffenseJob = "tackle" | "wing" | "lead" | "deep";
export type DefenseJob = "edge" | "backer" | "deep";

const OFFENSE_JOBS: readonly OffenseJob[] = ["tackle", "tackle", "wing", "wing", "lead"];
const DEFENSE_JOBS: readonly DefenseJob[] = ["edge", "edge", "backer", "backer", "deep"];

export const offenseJob = (slot: number): OffenseJob => OFFENSE_JOBS[slot] ?? "wing";

/** A support player's job on offense: the deep threat's, or his slot's. */
export const jobOf = (a: Pick<Athlete, "slot" | "deep">): OffenseJob => (a.deep ? "deep" : offenseJob(a.slot));
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

/** The deep threat runs and catches like a receiver, and as the deep man he can turn and run with one. */
const DEEP_STATS: Stats = { speed: 9, agility: 7, power: 5, hands: 7, arm: 2, cover: 7 };

export const supportStats = (slot: number, deep = false): Stats => (deep ? DEEP_STATS : (STATS[slot] ?? STATS[2]!));

export const isSupport = (a: Pick<Athlete, "role">) => a.role === "support";

/** Who runs routes and catches like a receiver: the runners, and the deep threat. */
export const isReceiver = (a: Pick<Athlete, "role" | "deep">) => a.role === "runner" || a.deep;
