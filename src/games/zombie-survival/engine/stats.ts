import type { Seat } from "@/platform/protocol";

/** One player's record over the whole run. Retries keep adding to it. */
export interface PlayerStats {
  shots: number;
  /** Shots where at least one bullet or pellet struck a zombie. */
  hits: number;
  kills: number;
  headshots: number;
  weakHits: number;
  bossKills: number;
  damage: number;
  /** Shots in a row that struck something. */
  streak: number;
  bestStreak: number;
}

export const emptyStats = (): PlayerStats => ({
  shots: 0,
  hits: 0,
  kills: 0,
  headshots: 0,
  weakHits: 0,
  bossKills: 0,
  damage: 0,
  streak: 0,
  bestStreak: 0,
});

/** Share of shots that struck a zombie, from 0 to 1. None fired reads as 0. */
export function accuracy(stats: PlayerStats): number {
  return stats.shots === 0 ? 0 : stats.hits / stats.shots;
}

export function recordShot(stats: PlayerStats, struck: boolean): void {
  stats.shots += 1;
  if (struck) {
    stats.hits += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.streak = 0;
  }
}

export type Category = "kills" | "accuracy" | "weakHits" | "damage";

/** A score for the summary, with the numbers every screen shows the same way. */
export interface StatLine {
  seat: Seat;
  kills: number;
  accuracy: number;
  headshots: number;
  weakHits: number;
  damage: number;
  shots: number;
  bestStreak: number;
}

export function statLine(seat: Seat, stats: PlayerStats): StatLine {
  return {
    seat,
    kills: stats.kills,
    accuracy: accuracy(stats),
    headshots: stats.headshots,
    weakHits: stats.weakHits,
    damage: Math.round(stats.damage * 10) / 10,
    shots: stats.shots,
    bestStreak: stats.bestStreak,
  };
}

/**
 * Who leads each category. Ties go to nobody, and accuracy only counts
 * for players who fired enough to mean something.
 */
export function leaders(lines: readonly StatLine[]): Partial<Record<Category, Seat>> {
  const out: Partial<Record<Category, Seat>> = {};
  const categories: Category[] = ["kills", "accuracy", "weakHits", "damage"];
  for (const category of categories) {
    const pool = category === "accuracy" ? lines.filter((l) => l.shots >= 5) : lines;
    const sorted = [...pool].sort((a, b) => b[category] - a[category]);
    const [first, second] = sorted;
    if (first && first[category] > 0 && (!second || first[category] > second[category])) out[category] = first.seat;
  }
  return out;
}

/**
 * The team's most valuable player: kills and weak points count, damage
 * and accuracy break ties. Null until someone has done something.
 */
export function mvp(lines: readonly StatLine[]): Seat | null {
  const score = (l: StatLine) => l.kills * 10 + l.weakHits * 3 + l.headshots * 2 + l.damage + l.accuracy * 5;
  const best = [...lines].sort((a, b) => score(b) - score(a))[0];
  return best && score(best) > 0 ? best.seat : null;
}
