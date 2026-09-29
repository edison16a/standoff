import type { Match } from "../engine/match";
import { CHARACTERS } from "../roster";
import type { ResultRow } from "./host-store";

/** Total yards gained with the ball: thrown, run and caught. */
export const yardsOf = (r: ResultRow) => r.passYards + r.rushYards + r.recYards;

/**
 * Every skill player's line at the final whistle: the winners first,
 * then the most touchdowns, the most yards and the most tackles, so the
 * player of the game is on top. Linemen are the computer's and have no line.
 */
export function resultRows(m: Match, names: ReadonlyMap<number, string>): ResultRow[] {
  const rows: ResultRow[] = [];
  for (const a of m.athletes) {
    if (a.role === "lineman" || !a.character) continue;
    const s = a.stats;
    rows.push({
      id: a.id,
      team: a.team,
      name: a.seat !== null ? (names.get(a.seat) ?? CHARACTERS[a.character].short) : CHARACTERS[a.character].name,
      character: a.character,
      seat: a.seat,
      role: a.role === "qb" ? "qb" : "runner",
      passYards: s.passYards,
      rushYards: s.rushYards,
      recYards: s.recYards,
      touchdowns: s.touchdowns,
      tackles: s.tackles,
      interceptions: s.interceptions,
    });
  }
  const winner = m.winner;
  return rows.sort(
    (x, y) =>
      Number(y.team === winner) - Number(x.team === winner) ||
      y.touchdowns - x.touchdowns ||
      yardsOf(y) - yardsOf(x) ||
      y.tackles + y.interceptions * 3 - (x.tackles + x.interceptions * 3) ||
      x.id - y.id,
  );
}

/** The best line of the game, whichever side it is on, or null when nobody did anything. */
export function playerOfTheGame(rows: readonly ResultRow[]): ResultRow | null {
  let best: ResultRow | null = null;
  let top = 0;
  for (const r of rows) {
    const score = r.touchdowns * 60 + yardsOf(r) + r.tackles * 8 + r.interceptions * 30;
    if (score > top) {
      top = score;
      best = r;
    }
  }
  return best;
}
