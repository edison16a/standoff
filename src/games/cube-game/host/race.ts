/**
 * The rules of a two player race, kept free of the round and of React so
 * they can be tested on their own. Players race the same level in their
 * own panes. The first over the line wins, and the others keep going for
 * their place until the grace time runs out.
 */

/** How long the others get to finish once someone has won, in seconds. */
export const RACE_GRACE = 30;

/** Finishes closer than this, in seconds, share a place. That is under one physics step. */
const TIE = 1e-6;

const SUFFIXES = ["th", "st", "nd", "rd"];

/** 1st, 2nd, 3rd, 4th, and 11th to 13th. */
export function ordinal(place: number): string {
  const whole = Math.max(1, Math.round(place));
  const teen = whole % 100 >= 11 && whole % 100 <= 13;
  return `${whole}${teen ? "th" : (SUFFIXES[whole % 10] ?? "th")}`;
}

/** "Player 1 got 1st place!", the same words the kit's split screen finish card uses. */
export function finishText(name: string, place: number): string {
  return `${name} got ${ordinal(place)} place!`;
}

/**
 * Places from each player's finish, as song time, or null while still
 * racing. A player's place is one more than the number who finished
 * strictly before them, so a dead heat gives both 1st.
 */
export function places(finishes: readonly (number | null)[]): (number | null)[] {
  return finishes.map((at) => {
    if (at === null) return null;
    return 1 + finishes.filter((other) => other !== null && other < at - TIE).length;
  });
}

/** Seconds left for the others once someone has won, or null before that. Never below zero. */
export function graceLeft(finishes: readonly (number | null)[], now: number): number | null {
  const first = Math.min(...finishes.map((at) => at ?? Infinity));
  if (!Number.isFinite(first)) return null;
  return Math.max(0, first + RACE_GRACE - now);
}

/** How a finished race reads on the results: who won, a dead heat, or nobody. */
export function verdict(finalPlaces: readonly (number | null)[]): { kind: "win"; slot: number } | { kind: "tie" } | { kind: "none" } {
  const winners = finalPlaces.flatMap((place, i) => (place === 1 ? [i + 1] : []));
  if (winners.length === 1) return { kind: "win", slot: winners[0]! };
  return winners.length > 1 ? { kind: "tie" } : { kind: "none" };
}
