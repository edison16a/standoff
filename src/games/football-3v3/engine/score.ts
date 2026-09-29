import type { TeamId } from "../teams";
import type { Match } from "./match";

/**
 * Puts points on the board. Reaching the target wins, and in overtime
 * any score wins; either way the match ends once the play's whistle or
 * celebration has run.
 */
export function addScore(m: Match, team: TeamId, points: number): void {
  m.score[team] += points;
  m.emit({ type: "score", team, points, total: [m.score[0], m.score[1]] });
  if (m.score[team] >= m.target || m.overtime) m.winner = team;
}

/** The clock ran out on the last quarter: the higher score wins, a tie goes to overtime. */
export function endOfRegulation(m: Match): "over" | "overtime" {
  if (m.score[0] !== m.score[1]) {
    m.winner = m.score[0] > m.score[1] ? 0 : 1;
    return "over";
  }
  return "overtime";
}
