import type { Seat } from "@/platform/protocol";

/** One player's round so far. */
export interface Tally {
  seat: Seat;
  score: number;
  shots: number;
  hits: number;
  /** Bullseyes and golden ducks, for the results. */
  specials: number;
}

export interface Standing extends Tally {
  /** Hits over shots, from 0 to 1. Zero when nothing was fired. */
  accuracy: number;
  /** 1 for first. Players on the same score share a place. */
  place: number;
}

export function emptyTally(seat: Seat): Tally {
  return { seat, score: 0, shots: 0, hits: 0, specials: 0 };
}

export function accuracy(tally: Tally): number {
  return tally.shots === 0 ? 0 : tally.hits / tally.shots;
}

/**
 * Best score first. Equal scores go to the steadier shot, then to more
 * hits, so the table always has an order, but the place number only
 * separates players whose scores differ.
 */
export function rank(tallies: readonly Tally[]): Standing[] {
  const sorted = [...tallies]
    .map((tally) => ({ ...tally, accuracy: accuracy(tally), place: 0 }))
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || b.hits - a.hits || a.seat - b.seat);
  sorted.forEach((standing, i) => {
    const previous = sorted[i - 1];
    standing.place = previous && previous.score === standing.score ? previous.place : i + 1;
  });
  return sorted;
}

/** Everyone in first place, as long as they scored at all. */
export function winners(standings: readonly Standing[]): Seat[] {
  return standings.filter((s) => s.place === 1 && s.score > 0).map((s) => s.seat);
}
