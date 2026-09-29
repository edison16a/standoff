import { setAction } from "./athlete";
import { MATCH } from "./tuning";
import type { MatchState, ScoreKind } from "./types";
import type { TeamId } from "../teams";

export const POINTS: Record<ScoreKind, number> = { touchdown: 6, fieldgoal: 3, pat: 1, twopoint: 2, safety: 2 };

/**
 * Puts points on the board and starts the celebration. The first side to
 * the target wins on the spot, and in overtime any score wins.
 */
export function addScore(state: MatchState, team: TeamId, kind: ScoreKind, by: number | null, thrower: number | null = null): void {
  const points = POINTS[kind];
  state.score[team] += points;
  state.lastScore = { team, kind, by, thrower };
  state.events.push({ type: "score", team, kind, points, by });
  if (state.overtime || state.score[team] >= state.options.pointsToWin) state.winner = team;
  state.phase = "score";
  state.phaseT = 0;
  for (const a of state.athletes) {
    if (a.action === "down") continue;
    if (a.team === team) setAction(a, "celebrate", MATCH.scoreWait);
    else if (kind === "touchdown") setAction(a, "dejected", MATCH.scoreWait);
  }
  for (const l of state.linemen) if (l.team === team) l.action = "celebrate";
}

/** How long the celebration of a score lasts: a touchdown gets the full party. */
export function scoreWait(kind: ScoreKind): number {
  return kind === "touchdown" ? MATCH.scoreWait : MATCH.deadWait * 1.4;
}
