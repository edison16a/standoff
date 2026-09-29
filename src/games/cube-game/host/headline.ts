import type { ResultRow } from "./store";

/** The big words over the finish: a small line, the names, and what they did. */
export interface Headline {
  eyebrow: string;
  /** Seats whose names go big, in order. */
  slots: number[];
  subtitle: string;
}

const tries = (n: number) => `${n} ${n === 1 ? "attempt" : "attempts"}`;

/**
 * What the results say across the top. Alone it is the level complete
 * with the attempts it took. In a race it is the winner, both players on
 * a dead heat, or, when it was ended before anyone finished, whoever got
 * furthest.
 */
export function headline(rows: readonly ResultRow[], winner: number | null, level: string): Headline {
  if (rows.length === 1) {
    const me = rows[0]!;
    return me.finished
      ? { eyebrow: "Level complete", slots: [me.slot], subtitle: `${level} in ${tries(me.attempts)}` }
      : { eyebrow: "Round over", slots: [me.slot], subtitle: `${level}, best ${me.best}%` };
  }
  if (winner !== null) {
    const row = rows.find((r) => r.slot === winner);
    return { eyebrow: "1v1 winner", slots: [winner], subtitle: `First to the end of ${level}${row ? `, ${tries(row.attempts)}` : ""}` };
  }
  const leaders = rows.filter((r) => r.place === 1).map((r) => r.slot);
  if (rows.filter((r) => r.finished).length > 1) return { eyebrow: "Dead heat", slots: leaders, subtitle: `Both reached the end of ${level} together` };
  const best = rows.find((r) => r.place === 1)?.best ?? 0;
  return { eyebrow: "Round over", slots: leaders, subtitle: leaders.length > 1 ? `Level at ${best}% on ${level}` : `Got furthest on ${level}, ${best}%` };
}
