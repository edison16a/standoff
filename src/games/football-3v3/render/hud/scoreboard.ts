import { ordinal } from "../../engine/downs";
import type { MatchView } from "../../engine/view";
import { TEAMS, TEAM_IDS, type TeamId } from "../../teams";

export interface BoardTeam {
  team: TeamId;
  code: string;
  color: string;
  score: number;
  /** This side has the ball. */
  ball: boolean;
}

/** Everything the broadcast scoreboard shows, as text. */
export interface Board {
  teams: [BoardTeam, BoardTeam];
  period: string;
  clock: string;
  /** Down and distance, or what is happening instead: a kick, a touchdown, the try. */
  situation: string;
  /** Where the ball is, "BLZ 35" style, or empty between plays that do not need it. */
  spot: string;
  target: string;
  /** Whole seconds left to pick a play or to hike, when that is running. */
  countdown: number | null;
}

export function clockText(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The yard line as a broadcast says it: the side of the field it is on, then the yards from that goal. */
export function spotText(view: MatchView): string {
  const yl = Math.round(view.drive.yardline);
  if (yl === 50) return "50";
  const own = view.drive.offense;
  const side: TeamId = yl < 50 ? own : own === 0 ? 1 : 0;
  return `${TEAMS[side].code} ${yl < 50 ? yl : 100 - yl}`;
}

function situation(view: MatchView): string {
  switch (view.phase) {
    case "touchdown":
      return "Touchdown";
    case "convert":
      return "Kick or go for 2";
    case "over":
      return view.winner === null ? "Final" : `${TEAMS[view.winner].name} win`;
    case "kick":
      return view.kick?.fieldGoal ? (view.drive.conversion ? "Extra point" : "Field goal") : "Punt";
    default:
      return view.drive.conversion ? "Two point try" : view.drive.text;
  }
}

export function scoreboard(view: MatchView): Board {
  const teams = TEAM_IDS.map((team) => ({
    team, code: TEAMS[team].code, color: TEAMS[team].color, score: view.score[team],
    ball: view.phase !== "over" && view.drive.offense === team,
  })) as [BoardTeam, BoardTeam];
  const period = view.overtime ? "OT" : view.phase === "over" ? "Final" : ordinal(view.quarter);
  const kicking = view.phase === "kick" || view.phase === "touchdown" || view.phase === "over";
  return {
    teams, period, clock: clockText(view.clock), situation: situation(view),
    spot: kicking || view.drive.conversion ? "" : spotText(view),
    target: `First to ${view.target}`,
    countdown: view.countdown === null ? null : Math.ceil(view.countdown),
  };
}
