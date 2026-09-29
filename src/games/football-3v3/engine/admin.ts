import { other, type TeamId } from "../teams";
import { newDrive } from "./downs";
import { yardToX } from "./field";
import type { Match } from "./match";
import { chooseCall, startChoose, startConvert } from "./phases";
import { newPlay } from "./play";
import { endPlay } from "./whistle";

/**
 * Shortcuts for the host's hidden admin panel, to reach a moment in the
 * game without playing up to it. They go through the real rules, so the
 * score, events and what follows are exactly as in a game.
 */

/** `team` scores a touchdown right now: its QB is handed the ball in the end zone. */
export function adminTouchdown(m: Match, team: TeamId): void {
  if (m.phase === "over") return;
  m.drive = newDrive(team, 99);
  m.play = newPlay("throw", m.time);
  m.phase = "live";
  m.phaseT = 0;
  const qb = m.qbOf(team);
  qb.x = yardToX(team, 102);
  qb.z = 0;
  qb.action = { kind: "none" };
  m.ball.state = "held";
  m.ball.holder = qb.id;
  m.ball.flight = null;
  m.ball.pass = null;
  endPlay(m, "touchdown");
}

/** `team` wins the game now, a score clear, and the end of the game and its trophy presentation follow. */
export function adminWin(m: Match, team: TeamId): void {
  if (m.phase === "over") return;
  m.score[team] = Math.max(m.score[team], m.score[other(team)] + 7);
  m.winner = team;
  m.phase = "over";
  m.phaseT = 0;
  m.play = null;
  m.kick = null;
  m.emit({ type: "win", team });
}

/** `team` lines up for a 37 yard field goal and starts the meters. */
export function adminFieldGoal(m: Match, team: TeamId): void {
  if (m.phase === "over") return;
  m.drive = { ...newDrive(team, 80), down: 4 };
  startChoose(m);
  chooseCall(m, m.qbOf(team).id, "kick");
}

/** `team` lines up for a two point try at the two. */
export function adminTwoPoint(m: Match, team: TeamId): void {
  if (m.phase === "over") return;
  m.scorer = m.qbOf(team).id;
  startConvert(m);
  chooseCall(m, m.qbOf(team).id, "two");
}
